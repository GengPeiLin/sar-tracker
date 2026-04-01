#!/usr/bin/env python3
"""
Fetch Sentinel-1 and NISAR SAR inventory for the Taiwan dashboard.

Output:
  data/sar_status.json
  data/asf_taiwan.meta4
  data/copernicus_taiwan.meta4
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

__version__ = "0.6.1"


DAYS_BACK = int(os.environ.get("DAYS_BACK", "7"))
MAX_RESULTS = int(os.environ.get("MAX_RESULTS", "1000"))
TAIWAN_WKT = "POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))"
NISAR_LAUNCH = datetime(2024, 3, 1, tzinfo=timezone.utc)

OUTPUT_DIR = Path(__file__).parent / "data"
JSON_FILE = OUTPUT_DIR / "sar_status.json"
ASF_META4 = OUTPUT_DIR / "asf_taiwan.meta4"
COP_META4 = OUTPUT_DIR / "copernicus_taiwan.meta4"


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def http_json(url: str, timeout: int = 60) -> dict | None:
    request = urllib.request.Request(url, headers={"User-Agent": "sar-tracker/3.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        log(f"HTTP {exc.code}: {url[:120]}")
    except Exception as exc:
        log(f"Request failed: {exc}")
    return None


def fmt_asf(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SUTC")


def fmt_odata(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def normalize_direction(value: str) -> str:
    text = str(value or "").upper()
    if text.startswith("A"):
        return "ASCENDING"
    if text.startswith("D"):
        return "DESCENDING"
    return "UNKNOWN"


def safe_int(value) -> int | None:
    try:
        return int(str(value).strip())
    except Exception:
        return None


def infer_product_type(*values: str) -> str:
    known = [
        "L1_RSLC",
        "L1_GSLC",
        "L2_GCOV",
        "L2_GUNW",
        "GSLC",
        "RSLC",
        "SLC",
        "GRD_HD",
        "GRD_MS",
        "GRD_HS",
        "GRD_FD",
        "GRD",
        "GCOV",
        "GUNW",
        "RAW",
        "SSC",
    ]
    for raw in values:
        text = str(raw or "").upper().replace(".SAFE", "")
        for item in known:
            if item in text:
                return item
    return "UNKNOWN"


def track_label(satellite_id: str, direction: str, path_number: int | None) -> str:
    sat = str(satellite_id or "").upper()
    if "NISAR" in sat:
        return "NISAR"
    if direction == "ASCENDING" and path_number == 69:
        return "A69"
    if direction == "DESCENDING" and path_number == 105:
        return "D105"
    return "OTHER_S1"


def wkt_to_geojson(wkt: str):
    text = str(wkt or "")
    if not text.startswith("POLYGON(("):
        return wkt
    try:
        points = []
        for pair in text.replace("POLYGON((", "").replace("))", "").split(","):
            lon, lat = pair.strip().split()
            points.append([float(lon), float(lat)])
        return {"type": "Polygon", "coordinates": [points]}
    except Exception:
        return wkt


def asf_search(dataset: str, start: datetime, end: datetime, processing_levels: str) -> list[dict]:
    params = {
        "intersectsWith": TAIWAN_WKT,
        "dataset": dataset,
        "start": fmt_asf(start),
        "end": fmt_asf(end),
        "processingLevel": processing_levels,
        "output": "geojson",
        "maxresults": MAX_RESULTS,
    }
    url = "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode(params)
    payload = http_json(url)
    return payload.get("features", []) if payload and "features" in payload else []


def process_asf_feature(feature: dict) -> dict:
    props = feature.get("properties", {})
    platform = props.get("platform", "")
    direction = normalize_direction(props.get("flightDirection", ""))
    path_number = safe_int(props.get("pathNumber"))
    return {
        "source": "ASF",
        "granule": props.get("sceneName", ""),
        "platform": platform,
        "sensor": props.get("sensor", ""),
        "date": props.get("startTime", ""),
        "stop_time": props.get("stopTime", ""),
        "mode": props.get("beamModeType") or props.get("beamMode", ""),
        "polarization": props.get("polarization", ""),
        "orbit": props.get("orbit", ""),
        "path_number": props.get("pathNumber", ""),
        "frame_number": props.get("frameNumber", ""),
        "direction": direction,
        "product_type": infer_product_type(props.get("processingLevel"), props.get("sceneName", "")),
        "processing_level": props.get("processingLevel", ""),
        "footprint": feature.get("geometry"),
        "asf_url": props.get("url", ""),
        "download_url": "",
        "copernicus_url": "",
        "browse_url": (props.get("browse") or [None])[0] if isinstance(props.get("browse"), list) else props.get("browse", ""),
        "file_size_mb": round(float(props.get("sizeMB") or 0), 1),
        "satellite_id": platform,
        "track_label": track_label(platform, direction, path_number),
    }


def fetch_asf_frames(start: datetime, end: datetime) -> list[dict]:
    log("Fetching ASF Sentinel-1 inventory")
    sentinel = asf_search("SENTINEL-1", start, end, "SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,GRD")
    log(f"ASF Sentinel-1 features: {len(sentinel)}")

    log(f"Fetching ASF NISAR inventory since {NISAR_LAUNCH.date()}")
    nisar = asf_search("NISAR", NISAR_LAUNCH, end, "RSLC,GSLC,GCOV,GUNW,L1_RSLC,L1_GSLC,L2_GCOV,L2_GUNW")
    log(f"ASF NISAR features: {len(nisar)}")

    return [process_asf_feature(feature) for feature in [*sentinel, *nisar]]


def fetch_copernicus_frames(start: datetime, end: datetime) -> list[dict]:
    log("Fetching Copernicus Sentinel-1 inventory")
    query = (
        f"OData.CSC.Intersects(area=geography'SRID=4326;{TAIWAN_WKT}')"
        f" and Collection/Name eq 'SENTINEL-1'"
        f" and ContentDate/Start gt {fmt_odata(start)}"
        f" and ContentDate/Start lt {fmt_odata(end)}"
    )
    params = {
        "$filter": query,
        "$orderby": "ContentDate/Start desc",
        "$top": min(MAX_RESULTS, 1000),
        "$expand": "Attributes",
    }
    url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?" + urllib.parse.urlencode(params)
    payload = http_json(url, timeout=90)
    if not payload or "value" not in payload:
        return []

    frames: list[dict] = []
    for item in payload["value"]:
        attrs = {attr["Name"]: attr.get("Value", "") for attr in item.get("Attributes", [])}
        platform = str(item.get("Name", "")).split("_")[0]
        direction = normalize_direction(attrs.get("orbitDirection", ""))
        path_number = safe_int(attrs.get("relativeOrbitNumber"))
        product_id = item.get("Id", "")
        frames.append(
            {
                "source": "Copernicus",
                "granule": str(item.get("Name", "")).replace(".SAFE", ""),
                "platform": platform,
                "sensor": "C-SAR",
                "date": item.get("ContentDate", {}).get("Start", ""),
                "stop_time": item.get("ContentDate", {}).get("End", ""),
                "mode": str(item.get("Name", "")).split("_")[1] if "_" in str(item.get("Name", "")) else "",
                "polarization": attrs.get("polarisationChannels", ""),
                "orbit": attrs.get("relativeOrbitNumber", ""),
                "path_number": attrs.get("relativeOrbitNumber", ""),
                "frame_number": attrs.get("frameNumber", ""),
                "direction": direction,
                "product_type": infer_product_type(item.get("Name", "")),
                "processing_level": infer_product_type(item.get("Name", "")),
                "footprint": wkt_to_geojson(item.get("GeoFootprint") or item.get("Footprint")),
                "asf_url": "",
                "download_url": f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value" if product_id else "",
                "copernicus_url": f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value" if product_id else "",
                "browse_url": "",
                "file_size_mb": round((item.get("ContentLength") or 0) / 1_000_000, 1),
                "satellite_id": platform,
                "track_label": track_label(platform, direction, path_number),
            }
        )
    log(f"Copernicus Sentinel-1 products: {len(frames)}")
    return frames


def scene_key(frame: dict) -> str:
    granule = str(frame.get("granule", "")).replace(".SAFE", "").strip().upper()
    if granule:
        return granule
    return "|".join(
        [
            frame.get("platform", ""),
            frame.get("date", ""),
            frame.get("direction", ""),
            str(frame.get("path_number", "")),
            str(frame.get("frame_number", "")),
            frame.get("product_type", ""),
        ]
    )


def merge_frames(frames: list[dict]) -> list[dict]:
    def source_rank(item: dict) -> int:
        return 0 if item.get("source") == "ASF" else 1

    merged: dict[str, dict] = {}
    for frame in sorted(frames, key=source_rank):
        key = scene_key(frame)
        current = merged.get(key)
        if not current:
            merged[key] = dict(frame)
            continue

        if current.get("source") != "ASF" and frame.get("source") == "ASF":
            preferred = dict(frame)
            preferred["download_url"] = preferred.get("download_url") or current.get("download_url")
            preferred["copernicus_url"] = preferred.get("copernicus_url") or current.get("copernicus_url")
            preferred["browse_url"] = preferred.get("browse_url") or current.get("browse_url")
            preferred["file_size_mb"] = preferred.get("file_size_mb") or current.get("file_size_mb")
            merged[key] = preferred
            current = merged[key]

        current["asf_url"] = current.get("asf_url") or frame.get("asf_url")
        current["download_url"] = current.get("download_url") or frame.get("download_url")
        current["copernicus_url"] = current.get("copernicus_url") or frame.get("copernicus_url")
        current["browse_url"] = current.get("browse_url") or frame.get("browse_url")
        current["file_size_mb"] = current.get("file_size_mb") or frame.get("file_size_mb")
        current["frame_number"] = current.get("frame_number") or frame.get("frame_number")
        current["path_number"] = current.get("path_number") or frame.get("path_number")
        current["direction"] = current.get("direction") or frame.get("direction")
    return sorted(merged.values(), key=lambda item: item.get("date", ""), reverse=True)


def write_meta4(frames: list[dict], target: Path, source: str) -> None:
    selected = [frame for frame in frames if (frame.get("asf_url") if source == "ASF" else frame.get("download_url"))]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
        f'  <!-- generated {datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")} -->',
        f'  <!-- {len(selected)} scenes -->',
    ]
    for frame in selected:
        url = frame.get("asf_url") if source == "ASF" else frame.get("download_url")
        name = f'{frame.get("granule", "scene")}{".SAFE.zip" if source == "Copernicus" else ""}'
        size = int(float(frame.get("file_size_mb") or 0) * 1_000_000)
        lines.append(f'  <file name="{name}">')
        if size:
            lines.append(f"    <size>{size}</size>")
        lines.append(f"    <url priority=\"1\">{url}</url>")
        lines.append("  </file>")
    lines.append("</metalink>")
    target.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=DAYS_BACK)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    log("Starting SAR inventory update")
    asf_frames = fetch_asf_frames(start, now)
    cop_frames = fetch_copernicus_frames(start, now)
    all_frames = merge_frames([*asf_frames, *cop_frames])

    track_summary: dict[str, int] = {}
    satellite_summary: dict[str, int] = {}
    for frame in all_frames:
        track_summary[frame["track_label"]] = track_summary.get(frame["track_label"], 0) + 1
        satellite_summary[frame["platform"]] = satellite_summary.get(frame["platform"], 0) + 1

    payload = {
        "version": __version__,
        "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "query_start": start.isoformat(),
        "query_end": now.isoformat(),
        "days_back": DAYS_BACK,
        "total_frames": len(all_frames),
        "asf_count": len([frame for frame in all_frames if frame.get("asf_url")]),
        "copernicus_count": len([frame for frame in all_frames if frame.get("download_url")]),
        "focus_tracks": ["A69", "D105", "NISAR", "OTHER_S1"],
        "track_summary": track_summary,
        "satellite_summary": satellite_summary,
        "taiwan_frames": all_frames,
    }

    JSON_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_meta4(all_frames, ASF_META4, "ASF")
    write_meta4(all_frames, COP_META4, "Copernicus")
    log(f"Wrote {JSON_FILE.name} with {len(all_frames)} scenes")
    return 0


if __name__ == "__main__":
    sys.exit(main())

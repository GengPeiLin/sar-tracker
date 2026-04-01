#!/usr/bin/env python3
"""
Generate SAR Tracker data products for GitHub Pages.

Current scope:
- Sentinel-1 over Taiwan, restricted to:
  - ascending track 69
  - descending track 105
- NISAR over Taiwan from launch to now
- ASF metadata and download URLs
- Copernicus CDSE download URLs for Sentinel-1 scenes
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


DAYS_BACK = int(__import__("os").environ.get("DAYS_BACK", 7))
MAX_RESULTS = 1000
TAIWAN_WKT = "POLYGON((121.6005 25.6251,121.0751 25.5135,120.3437 25.1689,119.087 23.7334,119.5505 21.8234,121.4975 21.3346,122.5585 24.8793,121.6005 25.6251))"
S1_TRACKS = {
    ("ASCENDING", 69): "A69",
    ("DESCENDING", 105): "D105",
}
NISAR_LAUNCH = datetime(2024, 3, 1, tzinfo=timezone.utc)

ASF_SENTINEL_PLATFORMS = "SA,SC,SD"
ASF_NISAR_PLATFORM = "NISAR"
ASF_LEVELS = "SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,GRD,RSLC,GSLC,L1_RSLC,L1_GSLC,L2_GCOV,L2_GUNW"

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


def date_fmt_asf(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SUTC")


def date_fmt_odata(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def normalize_direction(value: str) -> str:
    text = str(value or "").upper()
    if text.startswith("A"):
        return "ASCENDING"
    if text.startswith("D"):
        return "DESCENDING"
    return "UNKNOWN"


def normalize_product_type(*values: str) -> str:
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
        if not text:
            continue
        for item in known:
            if item in text:
                return item
        for token in text.replace("-", "_").split("_"):
            if token in known:
                return token
    return "UNKNOWN"


def geojson_from_wkt(wkt: str) -> dict:
    try:
        inner = wkt.removeprefix("POLYGON((").removesuffix("))")
        points = [[float(v) for v in part.split()] for part in inner.split(",")]
        return {"type": "Polygon", "coordinates": [points]}
    except Exception:
        return {}


def safe_int(value) -> int | None:
    try:
        return int(str(value).strip())
    except Exception:
        return None


def track_label(direction: str, path_number: int | None, satellite_id: str) -> str:
    if satellite_id == "NISAR":
        return "NISAR"
    return S1_TRACKS.get((direction, path_number), "OTHER")


def scene_key(frame: dict) -> str:
    granule = frame.get("granule")
    if granule:
        return granule
    parts = [
        frame.get("satellite_id", ""),
        frame.get("date", ""),
        str(frame.get("path_number", "")),
        str(frame.get("frame_number", "")),
        frame.get("product_type", ""),
    ]
    return "|".join(parts)


def asf_search(platforms: str, start: datetime, end: datetime) -> list[dict]:
    params = {
        "intersectsWith": TAIWAN_WKT,
        "platform": platforms,
        "processingLevel": ASF_LEVELS,
        "start": date_fmt_asf(start),
        "end": date_fmt_asf(end),
        "output": "geojson",
        "maxresults": MAX_RESULTS,
    }
    url = "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode(params)
    data = http_json(url)
    if not data or "features" not in data:
        return []
    return data["features"]


def process_asf_feature(feature: dict) -> dict | None:
    properties = feature.get("properties", {})
    platform = str(properties.get("platform", "")).upper()
    direction = normalize_direction(properties.get("flightDirection", ""))
    path_number = safe_int(properties.get("pathNumber"))

    satellite_id = "NISAR" if platform.startswith("NISAR") else platform

    if satellite_id in {"SA", "SC", "SD"}:
        satellite_id = {"SA": "S1A", "SC": "S1C", "SD": "S1D"}[satellite_id]
        if (direction, path_number) not in S1_TRACKS:
            return None

    if satellite_id == "NISAR":
        path_number = path_number

    product_type = normalize_product_type(properties.get("processingLevel"), properties.get("sceneName"))
    frame_number = safe_int(properties.get("frameNumber"))
    track = track_label(direction, path_number, satellite_id)

    return {
        "scene_key": "",
        "source": "ASF",
        "source_priority": 1,
        "satellite_id": satellite_id,
        "satellite_name": satellite_id,
        "satellite_band": "L" if satellite_id == "NISAR" else "C",
        "sat_status": "op",
        "track_label": track,
        "granule": properties.get("sceneName", ""),
        "product_type": product_type,
        "product_type_norm": product_type,
        "date": properties.get("startTime", ""),
        "stop_time": properties.get("stopTime", ""),
        "direction": properties.get("flightDirection", ""),
        "direction_norm": direction,
        "path_number": path_number,
        "orbit": properties.get("orbit", ""),
        "frame_number": frame_number,
        "frame_number_norm": frame_number,
        "mode": properties.get("beamModeType") or properties.get("beamMode", ""),
        "polarization": properties.get("polarization", ""),
        "footprint": feature.get("geometry"),
        "file_size_mb": round(float(properties.get("sizeMB") or 0), 1),
        "asf_url": properties.get("url", ""),
        "download_url": "",
        "copernicus_url": "",
    }


def fetch_asf_frames(start: datetime, end: datetime) -> list[dict]:
    log("Querying ASF Sentinel-1 recent tracks")
    sentinel_features = asf_search(ASF_SENTINEL_PLATFORMS, start, end)
    log(f"ASF Sentinel-1 features: {len(sentinel_features)}")

    log("Querying ASF NISAR since launch")
    nisar_features = asf_search(ASF_NISAR_PLATFORM, NISAR_LAUNCH, end)
    log(f"ASF NISAR features: {len(nisar_features)}")

    frames: list[dict] = []
    for feature in sentinel_features + nisar_features:
        frame = process_asf_feature(feature)
        if frame:
            frames.append(frame)
    log(f"ASF frames kept after filtering: {len(frames)}")
    return frames


def fetch_copernicus_frames(start: datetime, end: datetime) -> list[dict]:
    log("Querying Copernicus CDSE Sentinel-1")
    filt = (
        f"OData.CSC.Intersects(area=geography'SRID=4326;{TAIWAN_WKT}')"
        f" and Collection/Name eq 'SENTINEL-1'"
        f" and ContentDate/Start gt {date_fmt_odata(start)}"
        f" and ContentDate/Start lt {date_fmt_odata(end)}"
    )
    params = {
        "$filter": filt,
        "$orderby": "ContentDate/Start desc",
        "$top": min(MAX_RESULTS, 1000),
        "$expand": "Attributes",
    }
    url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?" + urllib.parse.urlencode(params)
    data = http_json(url, timeout=90)
    if not data or "value" not in data:
        return []

    frames: list[dict] = []
    for item in data["value"]:
        attrs = {entry["Name"]: entry.get("Value", "") for entry in item.get("Attributes", [])}
        direction = normalize_direction(attrs.get("orbitDirection", ""))
        path_number = safe_int(attrs.get("relativeOrbitNumber"))
        if (direction, path_number) not in S1_TRACKS:
            continue

        name = str(item.get("Name", "")).replace(".SAFE", "")
        granule_parts = name.split("_")
        product_type = normalize_product_type(granule_parts[2] if len(granule_parts) > 2 else "", name)
        frame_number = safe_int(attrs.get("frameNumber"))
        footprint = item.get("GeoFootprint") or item.get("Footprint")
        if isinstance(footprint, str) and footprint.startswith("POLYGON"):
            footprint = geojson_from_wkt(footprint)

        platform_raw = granule_parts[0] if granule_parts else "S1"
        satellite_id = platform_raw.replace("SENTINEL-", "S").replace("-", "")
        if satellite_id == "S1":
            satellite_id = "S1A"

        frames.append({
            "scene_key": "",
            "source": "Copernicus",
            "source_priority": 2,
            "satellite_id": satellite_id,
            "satellite_name": satellite_id,
            "satellite_band": "C",
            "sat_status": "op",
            "track_label": track_label(direction, path_number, satellite_id),
            "granule": name,
            "product_type": product_type,
            "product_type_norm": product_type,
            "date": item.get("ContentDate", {}).get("Start", ""),
            "stop_time": item.get("ContentDate", {}).get("End", ""),
            "direction": direction,
            "direction_norm": direction,
            "path_number": path_number,
            "orbit": attrs.get("relativeOrbitNumber", ""),
            "frame_number": frame_number,
            "frame_number_norm": frame_number,
            "mode": granule_parts[1] if len(granule_parts) > 1 else "",
            "polarization": attrs.get("polarisationChannels", ""),
            "footprint": footprint,
            "file_size_mb": round((item.get("ContentLength") or 0) / 1_000_000, 1),
            "asf_url": "",
            "download_url": f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({item.get('Id')})/$value" if item.get("Id") else "",
            "copernicus_url": f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({item.get('Id')})/$value" if item.get("Id") else "",
        })

    log(f"Copernicus frames kept after filtering: {len(frames)}")
    return frames


def merge_frames(frames: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for frame in frames:
        key = scene_key(frame)
        frame["scene_key"] = key
        if key not in merged:
            merged[key] = frame
            continue

        current = merged[key]
        if not current.get("footprint") and frame.get("footprint"):
            current["footprint"] = frame["footprint"]
        if not current.get("asf_url") and frame.get("asf_url"):
            current["asf_url"] = frame["asf_url"]
        if not current.get("download_url") and frame.get("download_url"):
            current["download_url"] = frame["download_url"]
        if not current.get("copernicus_url") and frame.get("copernicus_url"):
            current["copernicus_url"] = frame["copernicus_url"]
        if frame.get("source_priority", 99) < current.get("source_priority", 99):
            keep_urls = {
                "asf_url": current.get("asf_url") or frame.get("asf_url"),
                "download_url": current.get("download_url") or frame.get("download_url"),
                "copernicus_url": current.get("copernicus_url") or frame.get("copernicus_url"),
            }
            merged[key] = {**frame, **keep_urls}

    output = sorted(
        merged.values(),
        key=lambda item: (item.get("date", ""), item.get("satellite_id", ""), item.get("path_number") or 0),
        reverse=True,
    )
    return output


def write_meta4(frames: list[dict], output_path: Path, *, source: str) -> None:
    selected = [
        frame for frame in frames
        if (frame.get("asf_url") if source == "ASF" else frame.get("download_url"))
    ]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
        f'  <!-- generated {datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")} -->',
        f'  <!-- {len(selected)} scenes -->',
    ]
    for frame in selected[:500]:
        url = frame.get("asf_url") if source == "ASF" else frame.get("download_url")
        if not url:
            continue
        name = frame["granule"] if source == "ASF" else f'{frame["granule"]}.SAFE.zip'
        lines.append(f'  <file name="{name}">')
        if frame.get("file_size_mb"):
            lines.append(f'    <size>{int(float(frame["file_size_mb"]) * 1_000_000)}</size>')
        lines.append(f'    <url priority="1">{url}</url>')
        lines.append('  </file>')
    lines.append('</metalink>')
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=DAYS_BACK)

    log("=" * 56)
    log("SAR Tracker data refresh")
    log(f"Window start: {date_fmt_asf(start)}")
    log(f"Window end  : {date_fmt_asf(now)}")
    log("=" * 56)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    asf_frames = fetch_asf_frames(start, now)
    copernicus_frames = fetch_copernicus_frames(start, now)
    all_frames = merge_frames(asf_frames + copernicus_frames)

    if not all_frames:
        log("No frames found.")
        return 1

    write_meta4(all_frames, ASF_META4, source="ASF")
    write_meta4(all_frames, COP_META4, source="Copernicus")

    satellite_summary: dict[str, int] = {}
    track_summary: dict[str, int] = {}
    for frame in all_frames:
        satellite_summary[frame["satellite_id"]] = satellite_summary.get(frame["satellite_id"], 0) + 1
        track_summary[frame["track_label"]] = track_summary.get(frame["track_label"], 0) + 1

    payload = {
        "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "query_start": start.isoformat(),
        "query_end": now.isoformat(),
        "days_back": DAYS_BACK,
        "focus_tracks": ["A69", "D105", "NISAR"],
        "total_frames": len(all_frames),
        "asf_count": len([frame for frame in all_frames if frame.get("asf_url")]),
        "copernicus_count": len([frame for frame in all_frames if frame.get("download_url")]),
        "satellite_summary": satellite_summary,
        "track_summary": track_summary,
        "taiwan_frames": all_frames,
    }
    JSON_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    log(f"Wrote {JSON_FILE.name}")
    log(f"ASF meta4 scenes: {payload['asf_count']}")
    log(f"CDSE meta4 scenes: {payload['copernicus_count']}")
    log(f"Tracks: {track_summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Fetch Sentinel-1 and NISAR SAR inventory for the Taiwan dashboard.

Storage model:
  1. Keep one metadata catalog per mission under data/catalog/
  2. Export the merged catalogs to data/sar_status.json
  3. After bootstrap, only fetch data newer than each mission's watermark

Sentinel-1 and NISAR have separate settings and separate fetch workflows
(see MISSIONS); they are queried, filtered and stored independently.

Set REBUILD_SCOPE=nisar or REBUILD_SCOPE=sentinel1 to refresh a single
mission; the other mission's stored catalog is reused untouched.

Output:
  data/catalog/sentinel1.json
  data/catalog/nisar.json
  data/sar_status.json
  data/asf_taiwan.meta4          (all missions, by source)
  data/copernicus_taiwan.meta4
  data/meta4/<source>_<mission>.meta4
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

__version__ = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")


DAYS_BACK = int(os.environ.get("DAYS_BACK", "7"))
MAX_RESULTS = int(os.environ.get("MAX_RESULTS", "1000"))
TAIWAN_WKT = "POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))"

OUTPUT_DIR = Path(__file__).parent / "data"
CATALOG_DIR = OUTPUT_DIR / "catalog"
LEGACY_CATALOG_FILE = OUTPUT_DIR / "catalog_db.json"
JSON_FILE   = OUTPUT_DIR / "sar_status.json"
RECENT_FILE = OUTPUT_DIR / "sar_recent.json"
JS_FILE     = OUTPUT_DIR / "sar_status.js"
META4_DIR = OUTPUT_DIR / "meta4"
ASF_META4 = OUTPUT_DIR / "asf_taiwan.meta4"
COP_META4 = OUTPUT_DIR / "copernicus_taiwan.meta4"
INCREMENTAL_OVERLAP_DAYS = int(os.environ.get("INCREMENTAL_OVERLAP_DAYS", "2"))
FORCE_FULL_REBUILD = os.environ.get("FORCE_FULL_REBUILD", "").lower() in {"1", "true", "yes"}
REBUILD_SCOPE = os.environ.get("REBUILD_SCOPE", "all").strip().lower()
# Re-query from an explicit date without discarding the stored catalog. Use to
# repair gaps: the incremental watermark only moves forward, so a period that
# was missed once is never revisited by a normal run.
BACKFILL_FROM = os.environ.get("BACKFILL_FROM", "").strip()

# ── Mission settings ──────────────────────────────────────────────────────
# Sentinel-1 and NISAR are queried in completely different ways, so each
# mission owns its own settings and its own catalog file. Nothing about one
# mission's query shape should leak into the other's.
#
#                        Sentinel-1                  NISAR
#   ASF geography        relativeOrbit + frame       relativeOrbit + frame
#   Copernicus geography intersectsWith WKT          n/a (no Copernicus NISAR)
#   processingLevel      server-side                 client-side (504s server-side)
#   window               ~2y per track               whole period, 1 req per track
#   extra filtering      footprint centroid          explicit track/frame allowlist
#   sources              ASF + Copernicus            ASF only
#
# Copernicus keeps the bbox query: its records carry relativeOrbitNumber but
# no frame number at all, so a frame-based filter cannot be applied there.
S1_EARLIEST = datetime(2014, 4, 3, tzinfo=timezone.utc)
NISAR_LAUNCH = datetime(2025, 7, 30, tzinfo=timezone.utc)

# Per-track NISAR queries are fast regardless of window length, so fetch the
# whole period in one request per track. asf_search_windowed still splits the
# window automatically if a request fails or fills maxresults.
ASF_NISAR_CHUNK_DAYS = int(os.environ.get("ASF_NISAR_CHUNK_DAYS", "3650"))

# Taiwan Sentinel-1 tracks. For Sentinel-1 the frame number tracks LATITUDE
# and the relative orbit tracks LONGITUDE, so frames 67-83 select the Taiwan
# latitude band on *any* orbit -- listing an orbit whose ground track is
# elsewhere pulls in far-away scenes (relativeOrbit 42 frames 67-83 land over
# Pakistan at lon ~67, relativeOrbit 98 over the Ryukyus at lon ~125).
# Only orbits whose ground track actually crosses Taiwan belong here; the
# verified set is the four documented tracks:
#   A69  lon ~120.6-121.4   A142 lon ~118.4-118.8
#   A171 lon ~122.9-123.0   D105 lon ~120.7-121.3
# Rarer tracks that merely clip the bbox (T3/T32/T42/T98/T134) still arrive
# through the Copernicus query, which stays geographic.
S1_ASC_FRAMES = range(67, 84)
S1_DESC_FRAMES = range(503, 521)
TAIWAN_S1_FRAME_SPECS = (
    ("ASCENDING", 69, S1_ASC_FRAMES),
    ("ASCENDING", 142, S1_ASC_FRAMES),
    ("ASCENDING", 171, S1_ASC_FRAMES),
    ("DESCENDING", 105, S1_DESC_FRAMES),
)
# A69 returns ~770 scenes for a 4-year window, so keep chunks under the
# maxresults cap; asf_search_windowed splits further if a chunk still fills up.
ASF_S1_CHUNK_DAYS = int(os.environ.get("ASF_S1_CHUNK_DAYS", "730"))

TAIWAN_NISAR_FRAME_SPECS = (
    ("ASCENDING", 39, range(13, 15)),
    ("ASCENDING", 111, range(13, 15)),
    ("DESCENDING", 61, range(76, 78)),
    ("DESCENDING", 133, range(76, 79)),
)
NISAR_PROCESSING_LEVELS = frozenset(
    {
        "RSLC", "GSLC", "GCOV", "GUNW", "SME2",
        "L1_RSLC", "L1_GSLC", "L2_GCOV", "L2_GUNW", "L3_SME2",
    }
)
S1_PROCESSING_LEVELS = "SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,GRD"

# Sentinel-1 centroid bounds. The search WKT uses intersects, so frames that
# merely clip the bbox edges (e.g. T69 F84 at ~27.2N, T105 F524 at ~20.3N) are
# returned by the API but don't actually cover Taiwan territory.
# These bounds are calibrated to Sentinel-1 frame geometry and must not be
# applied to NISAR, whose frames span ~2.7 deg of latitude.
S1_CENTROID_LAT_MIN = 21.5   # south of Taiwan's southernmost tip (Eluanbi 21.9N)
S1_CENTROID_LAT_MAX = 26.85  # keeps F82/T69 (Matsu + northern Taiwan, centroid ~26.6N);
                             # drops F83/F84 (centred north of Matsu, centroid >= 27.0N)
# Longitude bounds matter now that the ASF query is track-based rather than
# geographic: without them a mis-specified orbit would admit scenes at the same
# latitude anywhere on Earth. Wide enough for the neighbouring tracks whose
# swaths reach Taiwan (A142 centroid ~118.5, A171 ~123.0).
S1_CENTROID_LON_MIN = 117.5
S1_CENTROID_LON_MAX = 124.0

MISSIONS: dict[str, dict] = {
    "sentinel1": {
        "label": "Sentinel-1",
        "catalog": CATALOG_DIR / "sentinel1.json",
        "earliest": S1_EARLIEST,
        "sources": ("ASF", "Copernicus"),
    },
    "nisar": {
        "label": "NISAR",
        "catalog": CATALOG_DIR / "nisar.json",
        "earliest": NISAR_LAUNCH,
        "sources": ("ASF",),
    },
}


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def http_json(url: str, timeout: int = 60, retries: int = 4, backoff_factor: float = 2.0) -> dict | None:
    request = urllib.request.Request(url, headers={"User-Agent": "sar-tracker/3.0"})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            if isinstance(exc, urllib.error.HTTPError):
                log(f"HTTP Error {exc.code} on attempt {attempt}/{retries}: {exc.reason or ''} for {url[:120]}")
            else:
                log(f"Request failed on attempt {attempt}/{retries}: {exc}")
            
            if attempt == retries:
                raise exc
            
            sleep_time = backoff_factor ** attempt
            log(f"Waiting {sleep_time}s before retrying...")
            time.sleep(sleep_time)
    return None


def chunk_range(start: datetime, end: datetime, days: int) -> list[tuple[datetime, datetime]]:
    chunks: list[tuple[datetime, datetime]] = []
    cursor = start
    while cursor < end:
        chunk_end = min(cursor + timedelta(days=days), end)
        chunks.append((cursor, chunk_end))
        cursor = chunk_end
    return chunks


def _empty_catalog() -> dict:
    return {
        "version": __version__,
        "updated_at": "",
        "last_successful_fetch": "",
        "bootstrap_completed": False,
        "frames": [],
    }


def mission_of(frame: dict) -> str:
    """Which mission a catalog record belongs to."""
    return "nisar" if is_nisar_frame(frame) else "sentinel1"


def refresh_derived_fields(frames: list[dict]) -> list[dict]:
    """Recompute fields derived from stored metadata.

    Lets fixes to infer_product_type/track_label reach records that are already
    in a catalog, without refetching them from the API.
    """
    for frame in frames:
        if frame.get("product_type") in (None, "", "UNKNOWN"):
            frame["product_type"] = infer_product_type(
                frame.get("processing_level"), frame.get("granule")
            )
        frame["footprint"] = normalize_footprint(frame.get("footprint"))
        frame["track_label"] = track_label(
            frame.get("satellite_id") or frame.get("platform"),
            normalize_direction(frame.get("direction", "")),
            safe_int(frame.get("path_number")),
        )
    return frames


def load_mission_catalog(mission: str, force_empty: bool = False) -> dict:
    """Load one mission's catalog, migrating from the legacy combined file."""
    if force_empty:
        return _empty_catalog()
    path = MISSIONS[mission]["catalog"]
    if path.exists():
        try:
            stored = json.loads(path.read_text(encoding="utf-8"))
            refresh_derived_fields(stored.get("frames", []))
            return stored
        except Exception:
            return _empty_catalog()
    # One-time migration: split the old single-file catalog by mission.
    if LEGACY_CATALOG_FILE.exists():
        try:
            legacy = json.loads(LEGACY_CATALOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return _empty_catalog()
        frames = [f for f in legacy.get("frames", []) if mission_of(f) == mission]
        log(f"Migrating {len(frames)} {MISSIONS[mission]['label']} frames from {LEGACY_CATALOG_FILE.name}")
        migrated = {**legacy, "mission": mission, "frames": refresh_derived_fields(frames)}
        # Persist immediately so the legacy file is only parsed once.
        save_mission_catalog(mission, migrated)
        return migrated
    return _empty_catalog()


def save_mission_catalog(mission: str, payload: dict) -> None:
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    MISSIONS[mission]["catalog"].write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


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
        "L3_SME2",
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
        "SME2",
        "RAW",
        "SSC",
        # Sentinel-1 ocean wind/wave (OCN) and extended timing annotation
        # (ETAD, named *_ETA_* in granules) are real products; without these
        # they fall through to UNKNOWN.
        "OCN",
        "ETAD",
        "ETA",
        # Copernicus interferometric coherence (CARD-COH12).
        "CARD-COH12",
    ]
    # Granule tokens that differ from the product name we want to expose.
    aliases = {"ETA": "ETAD", "L3_SME2": "SME2", "CARD-COH12": "COH12"}
    for raw in values:
        text = str(raw or "").upper().replace(".SAFE", "")
        for item in known:
            if item in text:
                return aliases.get(item, item)
    return "UNKNOWN"


def asf_metadata_url(granule: str) -> str:
    name = str(granule or "").replace(".SAFE", "").strip()
    if not name:
        return ""
    return "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode(
        {
            "granule_list": name,
            "output": "geojson",
        }
    )


def track_label(satellite_id: str, direction: str, path_number: int | None) -> str:
    sat = str(satellite_id or "").upper()
    if "NISAR" in sat:
        return "NISAR"
    if direction == "ASCENDING" and path_number == 69:
        return "A69"
    if direction == "DESCENDING" and path_number == 105:
        return "D105"
    return "OTHER_S1"


def is_nisar_frame(frame: dict) -> bool:
    values = [
        frame.get("satellite_id", ""),
        frame.get("platform", ""),
        frame.get("granule", ""),
    ]
    return any("NISAR" in str(value).upper() for value in values)


def is_taiwan_nisar_frame(frame: dict) -> bool:
    if not is_nisar_frame(frame):
        return False
    direction = normalize_direction(frame.get("direction", ""))
    path_number = safe_int(frame.get("path_number"))
    frame_number = safe_int(frame.get("frame_number"))
    if path_number is None or frame_number is None:
        return False
    return any(
        direction == allowed_direction
        and path_number == allowed_path
        and frame_number in allowed_frames
        for allowed_direction, allowed_path, allowed_frames in TAIWAN_NISAR_FRAME_SPECS
    )


def normalize_footprint(geometry):
    """Reduce a footprint to a single GeoJSON Polygon.

    Copernicus returns some scenes as a one-part MultiPolygon. Downstream code
    (the centroid filter, the slim export, and the map renderer) only handles
    Polygon, so an un-normalised MultiPolygon silently skips the Taiwan bbox
    check AND never draws on the map. Keep the largest ring for the rare
    multi-part case.
    """
    if not isinstance(geometry, dict) or geometry.get("type") != "MultiPolygon":
        return geometry
    parts = [part for part in (geometry.get("coordinates") or []) if part and part[0]]
    if not parts:
        return geometry
    largest = max(parts, key=lambda part: len(part[0]))
    return {"type": "Polygon", "coordinates": largest}


def footprint_centroid(frame: dict) -> tuple[float, float] | None:
    """(lat, lon) centroid of a frame's footprint, or None if unavailable."""
    footprint = normalize_footprint(frame.get("footprint"))
    if not isinstance(footprint, dict) or footprint.get("type") != "Polygon":
        return None
    rings = footprint.get("coordinates") or []
    if not rings:
        return None
    ring = rings[0]
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring = ring[:-1]
    if not ring:
        return None
    return (
        sum(point[1] for point in ring) / len(ring),
        sum(point[0] for point in ring) / len(ring),
    )


def is_taiwan_s1_frame(frame: dict) -> bool:
    """Whether a Sentinel-1 footprint is centred on the Taiwan area.

    Frames with no footprint are kept: Copernicus records sometimes lack one,
    and dropping them would lose real scenes.
    """
    centroid = footprint_centroid(frame)
    if centroid is None:
        return True
    lat, lon = centroid
    return (
        S1_CENTROID_LAT_MIN <= lat <= S1_CENTROID_LAT_MAX
        and S1_CENTROID_LON_MIN <= lon <= S1_CENTROID_LON_MAX
    )


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


def asf_search(
    dataset: str,
    start: datetime,
    end: datetime,
    processing_levels: str,
    extra_params: dict[str, str] | None = None,
    spatial: bool = True,
    retries: int = 4,
) -> list[dict]:
    params = {
        "dataset": dataset,
        "start": fmt_asf(start),
        "end": fmt_asf(end),
        "output": "geojson",
        "maxresults": MAX_RESULTS,
    }
    # intersectsWith and processingLevel are both slow server-side; over a long
    # window they make ASF return 504. Callers that can narrow the query another
    # way (NISAR pins geography via relativeOrbit+frame) omit them and filter
    # locally instead.
    if spatial:
        params["intersectsWith"] = TAIWAN_WKT
    if processing_levels:
        params["processingLevel"] = processing_levels
    if extra_params:
        params.update(extra_params)
    url = "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode(params)
    payload = http_json(url, timeout=120, retries=retries)
    return payload.get("features", []) if payload and "features" in payload else []


def asf_search_windowed(
    dataset: str,
    start: datetime,
    end: datetime,
    processing_levels: str,
    chunk_days: int,
    extra_params: dict[str, str] | None = None,
    spatial: bool = True,
) -> list[dict]:
    features: list[dict] = []
    for chunk_start, chunk_end in chunk_range(start, end, chunk_days):
        log(f"ASF {dataset}: {chunk_start.date()} -> {chunk_end.date()}")
        splittable = (chunk_end - chunk_start) > timedelta(days=1)
        half = max(1, (chunk_end - chunk_start).days // 2)
        reason = ""
        try:
            # When the window can still be split, fail fast so we spend the time
            # on a narrower query instead of on backoff sleeps.
            chunk = asf_search(
                dataset, chunk_start, chunk_end, processing_levels, extra_params, spatial,
                retries=2 if splittable else 4,
            )
            # A chunk that fills maxresults may have been truncated server-side.
            if len(chunk) >= MAX_RESULTS and splittable:
                reason = f"hit {MAX_RESULTS} result cap"
        except Exception as exc:
            # ASF returns 504 when a window is too expensive to serve; a shorter
            # window usually succeeds.
            if not splittable:
                raise
            reason = f"request failed ({exc})"
        if reason:
            log(f"ASF {dataset}: {reason}, splitting to {half}-day windows")
            chunk = asf_search_windowed(
                dataset, chunk_start, chunk_end, processing_levels, half, extra_params, spatial
            )
        features.extend(chunk)
    return features


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
        "footprint": normalize_footprint(feature.get("geometry")),
        "asf_url": props.get("url", ""),
        "asf_meta_url": props.get("url", "") or asf_metadata_url(props.get("sceneName", "")),
        "download_url": "",
        "copernicus_url": "",
        "browse_url": (props.get("browse") or [None])[0] if isinstance(props.get("browse"), list) else props.get("browse", ""),
        "file_size_mb": round(float(props.get("sizeMB") or 0), 1),
        "satellite_id": platform,
        "track_label": track_label(platform, direction, path_number),
    }


def _joined(value) -> str:
    """ASF returns some NISAR attributes as lists (polarizations, bandwidth)."""
    if isinstance(value, (list, tuple)):
        return ",".join(str(item) for item in value if item not in (None, ""))
    return "" if value is None else str(value)


def _nisar_size_mb(props: dict) -> float:
    """Size of the NISAR science file.

    NISAR has no sizeMB; it reports a `bytes` dict of every delivered file
    (HDF5 plus browse imagery). Use the HDF5 product, not the PNG previews.
    """
    entries = props.get("bytes")
    if not isinstance(entries, dict):
        return 0.0
    best = 0
    for name, info in entries.items():
        if not isinstance(info, dict):
            continue
        size = info.get("bytes") or 0
        is_h5 = str(info.get("format", "")).upper() == "HDF5" or str(name).lower().endswith(".h5")
        if is_h5:
            best = max(best, int(size))
    return round(best / 1_000_000, 1)


def process_nisar_feature(feature: dict) -> dict:
    """NISAR record built from NISAR's own metadata scheme.

    NISAR does not populate the Sentinel-1 fields (`polarization`,
    `beamModeType` and `sizeMB` all come back null); it exposes main/side band
    polarizations, range bandwidth, frame coverage and a CRID instead. Reusing
    the Sentinel-1 mapping here is what produced empty pol/mode/size values.
    """
    props = feature.get("properties", {})
    platform = props.get("platform", "") or "NISAR"
    direction = normalize_direction(props.get("flightDirection", ""))
    path_number = safe_int(props.get("pathNumber"))
    main_pol = _joined(props.get("mainBandPolarization"))
    side_pol = _joined(props.get("sideBandPolarization"))
    return {
        "source": "ASF",
        "granule": props.get("sceneName", ""),
        "platform": platform,
        "sensor": props.get("sensor", ""),
        "date": props.get("startTime", ""),
        "stop_time": props.get("stopTime", ""),
        "orbit": props.get("orbit", ""),
        "path_number": props.get("pathNumber", ""),
        "frame_number": props.get("frameNumber", ""),
        "direction": direction,
        "product_type": infer_product_type(props.get("processingLevel"), props.get("sceneName", "")),
        "processing_level": props.get("processingLevel", ""),
        "footprint": normalize_footprint(feature.get("geometry")),
        "asf_url": props.get("url", ""),
        "asf_meta_url": props.get("url", "") or asf_metadata_url(props.get("sceneName", "")),
        "download_url": "",
        "copernicus_url": "",
        "browse_url": (props.get("browse") or [None])[0] if isinstance(props.get("browse"), list) else props.get("browse", ""),
        "file_size_mb": _nisar_size_mb(props),
        "satellite_id": platform,
        "track_label": track_label(platform, direction, path_number),
        # ── NISAR-specific metadata ──────────────────────────────────────
        "frame_coverage": props.get("frameCoverage", ""),
        "main_polarization": main_pol,
        "side_polarization": side_pol,
        "range_bandwidth": _joined(props.get("rangeBandwidth")),
        "crid": props.get("crid", ""),
        "joint_observation": bool(props.get("jointObservation")),
        "orbit_type": props.get("orbitType", ""),
        "pge_version": props.get("pgeVersion", ""),
        "collection": props.get("collectionName", ""),
        "processing_date": props.get("processingDate", ""),
        # Kept so shared code (exports, CSV) still finds a polarization.
        "polarization": main_pol,
        "mode": props.get("beamModeType") or "",
    }


def fetch_asf_sentinel_frames(start: datetime, end: datetime, bootstrap: bool) -> list[dict]:
    """ASF Sentinel-1, queried one track at a time by relativeOrbit + frame.

    Same method as NISAR: pinning the track and frame range is both more precise
    than an intersects-bbox (which returns scenes that only clip the corners)
    and lets each request cover years instead of weeks.
    """
    log("Fetching ASF Sentinel-1 inventory")
    frames: list[dict] = []
    for direction, path_number, frame_numbers in TAIWAN_S1_FRAME_SPECS:
        frame_values = list(frame_numbers)
        frame_query = f"{frame_values[0]}-{frame_values[-1]}"
        log(f"ASF S1 Taiwan {direction} T{path_number} F{frame_query}")
        features = asf_search_windowed(
            "SENTINEL-1",
            start,
            end,
            S1_PROCESSING_LEVELS,
            ASF_S1_CHUNK_DAYS if bootstrap else max(ASF_S1_CHUNK_DAYS, 14),
            {
                "flightDirection": direction,
                "relativeOrbit": str(path_number),
                "frame": frame_query,
            },
            # relativeOrbit + frame already pins the geography.
            spatial=False,
        )
        frames.extend(process_asf_feature(feature) for feature in features)
    log(f"ASF Sentinel-1 features: {len(frames)}")
    return frames


def fetch_sentinel1_frames(start: datetime, end: datetime, bootstrap: bool) -> list[dict]:
    """Full Sentinel-1 workflow: ASF + Copernicus, geography-scoped."""
    return [
        *fetch_asf_sentinel_frames(start, end, bootstrap),
        *fetch_copernicus_frames(start, end, bootstrap),
    ]


def fetch_nisar_frames(start: datetime, end: datetime) -> list[dict]:
    """Full NISAR workflow: ASF only, track/frame-scoped."""
    return fetch_asf_nisar_frames(start, end)


def fetch_asf_nisar_frames(start: datetime, end: datetime) -> list[dict]:
    log(f"Fetching ASF NISAR inventory since {start.date()}")
    # One request per track for the whole period. Keep the tracks in separate
    # queries: a comma-separated relativeOrbit list makes ASF build a much more
    # expensive OR query (~30s, right at its gateway timeout) while a single
    # track answers in well under 10s. Time window size barely affects latency,
    # so there is nothing to gain by chunking further.
    frames: list[dict] = []
    for direction, path_number, frame_numbers in TAIWAN_NISAR_FRAME_SPECS:
        frame_values = list(frame_numbers)
        frame_query = f"{frame_values[0]}-{frame_values[-1]}"
        log(f"ASF NISAR Taiwan {direction} T{path_number} F{frame_query}")
        features = asf_search_windowed(
            "NISAR",
            start,
            end,
            # processingLevel and intersectsWith are both slow enough server-side
            # to trigger 504s here; relativeOrbit+frame already pins the
            # geography, so filter on both locally instead.
            "",
            ASF_NISAR_CHUNK_DAYS,
            {
                "flightDirection": direction,
                "relativeOrbit": str(path_number),
                "frame": frame_query,
            },
            spatial=False,
        )
        frames.extend(
            frame
            for feature in features
            if str(feature.get("properties", {}).get("processingLevel", "")).upper()
            in NISAR_PROCESSING_LEVELS
            and is_taiwan_nisar_frame(frame := process_nisar_feature(feature))
        )
    log(f"ASF NISAR Taiwan features: {len(frames)}")
    return frames


def _process_copernicus_item(item: dict) -> dict:
    attrs = {attr["Name"]: attr.get("Value", "") for attr in item.get("Attributes", [])}
    name = str(item.get("Name", ""))
    platform = name.split("_")[0]
    direction = normalize_direction(attrs.get("orbitDirection", ""))
    path_number = safe_int(attrs.get("relativeOrbitNumber"))
    product_id = item.get("Id", "")
    download_url = f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value" if product_id else ""
    product_type = infer_product_type(name)
    return {
        "source": "Copernicus",
        "granule": name.replace(".SAFE", ""),
        "platform": platform,
        "sensor": "C-SAR",
        "date": item.get("ContentDate", {}).get("Start", ""),
        "stop_time": item.get("ContentDate", {}).get("End", ""),
        "mode": name.split("_")[1] if "_" in name else "",
        "polarization": attrs.get("polarisationChannels", ""),
        "orbit": attrs.get("relativeOrbitNumber", ""),
        "path_number": attrs.get("relativeOrbitNumber", ""),
        "frame_number": attrs.get("frameNumber", ""),
        "direction": direction,
        "product_type": product_type,
        "processing_level": product_type,
        "footprint": normalize_footprint(wkt_to_geojson(item.get("GeoFootprint") or item.get("Footprint"))),
        "asf_url": "",
        "asf_meta_url": asf_metadata_url(name),
        "download_url": download_url,
        "copernicus_url": download_url,
        "browse_url": "",
        "file_size_mb": round((item.get("ContentLength") or 0) / 1_000_000, 1),
        "satellite_id": platform,
        "track_label": track_label(platform, direction, path_number),
    }


def fetch_copernicus_frames(start: datetime, end: datetime, bootstrap: bool) -> list[dict]:
    log("Fetching Copernicus Sentinel-1 inventory")
    frames: list[dict] = []
    for chunk_start, chunk_end in chunk_range(start, end, 30 if bootstrap else 14):
        query = (
            f"OData.CSC.Intersects(area=geography'SRID=4326;{TAIWAN_WKT}')"
            f" and Collection/Name eq 'SENTINEL-1'"
            f" and ContentDate/Start gt {fmt_odata(chunk_start)}"
            f" and ContentDate/Start lt {fmt_odata(chunk_end)}"
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
            continue

        next_url: str | None = None
        for item in payload["value"]:
            frames.append(_process_copernicus_item(item))
        next_url = payload.get("@odata.nextLink")
        while next_url:
            payload = http_json(next_url, timeout=90)
            if not payload or "value" not in payload:
                break
            for item in payload["value"]:
                frames.append(_process_copernicus_item(item))
            next_url = payload.get("@odata.nextLink")
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


def slot_template_key(frame: dict) -> str:
    return "|".join(
        [
            str(frame.get("satellite_id") or frame.get("platform") or ""),
            str(frame.get("direction") or ""),
            str(frame.get("path_number") or ""),
            str(frame.get("product_type") or ""),
            str(frame.get("mode") or ""),
        ]
    )


def pass_instance_key(frame: dict) -> str:
    date = str(frame.get("date") or "")[:10]
    return f"{slot_template_key(frame)}|{date}"


def backfill_from_asf_metadata(frames: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    templates: dict[str, dict[int, int]] = {}

    for frame in frames:
        grouped.setdefault(pass_instance_key(frame), []).append(frame)

    for items in grouped.values():
        ordered = sorted(items, key=lambda item: item.get("date", ""))
        template_key = slot_template_key(ordered[0]) if ordered else ""
        if not template_key:
            continue
        slot_votes = templates.setdefault(template_key, {})
        for index, item in enumerate(ordered):
            if item.get("source") != "ASF":
                continue
            frame_number = safe_int(item.get("frame_number"))
            if frame_number is None:
                continue
            slot_votes.setdefault(index, frame_number)

    for items in grouped.values():
        ordered = sorted(items, key=lambda item: item.get("date", ""))
        template_key = slot_template_key(ordered[0]) if ordered else ""
        slot_map = templates.get(template_key, {})
        for index, item in enumerate(ordered):
            if not item.get("frame_number") and index in slot_map:
                item["frame_number"] = slot_map[index]
            if not item.get("asf_meta_url"):
                item["asf_meta_url"] = asf_metadata_url(item.get("granule", ""))

    return frames


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
        current["asf_meta_url"] = current.get("asf_meta_url") or frame.get("asf_meta_url")
        current["download_url"] = current.get("download_url") or frame.get("download_url")
        current["copernicus_url"] = current.get("copernicus_url") or frame.get("copernicus_url")
        current["browse_url"] = current.get("browse_url") or frame.get("browse_url")
        current["file_size_mb"] = current.get("file_size_mb") or frame.get("file_size_mb")
        current["frame_number"] = current.get("frame_number") or frame.get("frame_number")
        current["path_number"] = current.get("path_number") or frame.get("path_number")
        current["direction"] = current.get("direction") or frame.get("direction")
        current["asf_meta_url"] = current.get("asf_meta_url") or asf_metadata_url(current.get("granule", ""))
    merged_frames = sorted(merged.values(), key=lambda item: item.get("date", ""), reverse=True)
    return sorted(backfill_from_asf_metadata(merged_frames), key=lambda item: item.get("date", ""), reverse=True)


def write_meta4(frames: list[dict], target: Path, source: str) -> None:
    selected = [frame for frame in frames if (frame.get("asf_url") if source == "ASF" else frame.get("download_url"))]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
        f'  <!-- generated {datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")} -->',
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


def mission_window(mission: str, catalog: dict, bootstrap: bool, now: datetime) -> datetime:
    """Start of the fetch window for one mission."""
    earliest = MISSIONS[mission]["earliest"]
    if bootstrap:
        return earliest
    if BACKFILL_FROM:
        try:
            requested = datetime.fromisoformat(BACKFILL_FROM)
            if requested.tzinfo is None:
                requested = requested.replace(tzinfo=timezone.utc)
            return max(requested, earliest)
        except ValueError:
            raise ValueError(f"BACKFILL_FROM must be an ISO date, got {BACKFILL_FROM!r}")
    try:
        watermark = datetime.fromisoformat(catalog.get("last_successful_fetch"))
    except Exception:
        watermark = now - timedelta(days=DAYS_BACK)
    return max(watermark - timedelta(days=INCREMENTAL_OVERLAP_DAYS), earliest)


def run_mission(mission: str, now: datetime) -> list[dict]:
    """Fetch, merge and persist a single mission's catalog. Returns its frames."""
    config = MISSIONS[mission]
    catalog = load_mission_catalog(mission, force_empty=FORCE_FULL_REBUILD)
    bootstrap = FORCE_FULL_REBUILD or not catalog.get("bootstrap_completed")
    start = mission_window(mission, catalog, bootstrap, now)
    mode = "bootstrap" if bootstrap else "incremental update"
    log(f"[{config['label']}] {mode} from {start.date()}")

    if mission == "nisar":
        fetched = fetch_nisar_frames(start, now)
    else:
        fetched = fetch_sentinel1_frames(start, now, bootstrap)

    frames = merge_frames([*catalog.get("frames", []), *fetched])
    # Keep each catalog strictly to its own mission and to Taiwan.
    frames = [f for f in frames if mission_of(f) == mission]
    before = len(frames)
    if mission == "nisar":
        frames = [f for f in frames if is_taiwan_nisar_frame(f)]
    else:
        frames = [f for f in frames if is_taiwan_s1_frame(f)]
    if before != len(frames):
        log(f"[{config['label']}] dropped {before - len(frames)} frames outside Taiwan")

    save_mission_catalog(
        mission,
        {
            "version": __version__,
            "mission": mission,
            "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
            "last_successful_fetch": now.isoformat(),
            "bootstrap_completed": True,
            "bootstrap_started_at": catalog.get("bootstrap_started_at")
            or (start.isoformat() if bootstrap else None),
            "incremental_overlap_days": INCREMENTAL_OVERLAP_DAYS,
            "frames": frames,
        },
    )
    log(f"[{config['label']}] catalog now holds {len(frames)} frames")
    return frames


def main() -> int:
    now = datetime.now(timezone.utc)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scope = REBUILD_SCOPE
    valid_scopes = {"all", *MISSIONS}
    if scope not in valid_scopes:
        raise ValueError(f"REBUILD_SCOPE must be one of: {', '.join(sorted(valid_scopes))}")

    # Each mission is fetched independently; a scoped run refreshes one mission
    # and reuses the other's stored catalog untouched.
    selected = list(MISSIONS) if scope == "all" else [scope]
    if scope != "all":
        log(f"Scoped rebuild: {MISSIONS[scope]['label']} only")

    all_frames: list[dict] = []
    for mission in MISSIONS:
        if mission in selected:
            all_frames.extend(run_mission(mission, now))
        else:
            stored = load_mission_catalog(mission).get("frames", [])
            log(f"[{MISSIONS[mission]['label']}] reusing {len(stored)} stored frames")
            all_frames.extend(stored)

    all_frames.sort(key=lambda item: item.get("date", ""), reverse=True)
    query_start = min(
        (MISSIONS[m]["earliest"] for m in MISSIONS), default=S1_EARLIEST
    )

    track_summary: dict[str, int] = {}
    satellite_summary: dict[str, int] = {}
    for frame in all_frames:
        track_summary[frame["track_label"]] = track_summary.get(frame["track_label"], 0) + 1
        satellite_summary[frame["platform"]] = satellite_summary.get(frame["platform"], 0) + 1

    # Strip fields unused by the frontend and round footprint coordinates
    # to reduce JSON payload size (~30% smaller).
    _STRIP = {"browse_url", "asf_meta_url", "copernicus_url"}

    def _slim_frame(f: dict) -> dict | None:
        out = {k: v for k, v in f.items() if k not in _STRIP}
        fp = out.get("footprint")
        if fp and fp.get("type") == "Polygon" and len(fp.get("coordinates", [])) > 0:
            ring = fp["coordinates"][0]
            if len(ring) > 1 and ring[0] == ring[-1]:
                ring = ring[:-1]
            # The centroid bounds are calibrated to Sentinel-1 frame geometry.
            # NISAR frames span ~2.7 deg of latitude, so a centroid outside the
            # range can still cover Taiwan (T133 F78 is centred at ~20.8N but
            # reaches 22.15N over the Hengchun peninsula). NISAR is already
            # restricted to TAIWAN_NISAR_FRAME_SPECS, so skip the heuristic.
            if mission_of(out) == "sentinel1" and not is_taiwan_s1_frame(out):
                return None
            out["fp"] = [round(val, 3) for pt in ring for val in pt]
            if "footprint" in out:
                del out["footprint"]
        return out

    slim_frames = [s for f in all_frames if (s := _slim_frame(f)) is not None]

    # Report the window the exported data actually spans. A scoped rebuild
    # (REBUILD_SCOPE=nisar) queries only a slice of time but still exports the
    # retained Sentinel-1 history, so query_start must come from the frames.
    frame_dates = [str(f.get("date") or "") for f in slim_frames]
    earliest = min((d for d in frame_dates if d), default="")
    if earliest:
        try:
            query_start = datetime.fromisoformat(earliest.replace("Z", "+00:00"))
        except ValueError:
            pass

    payload = {
        "version": __version__,
        "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "query_start": query_start.isoformat(),
        "query_end": now.isoformat(),
        "days_back": DAYS_BACK,
        "bootstrap_completed": True,
        "last_successful_fetch": now.isoformat(),
        "total_frames": len(slim_frames),
        "asf_count": len([frame for frame in slim_frames if frame.get("asf_url")]),
        "copernicus_count": len([frame for frame in slim_frames if frame.get("download_url")]),
        "focus_tracks": ["A69", "D105", "NISAR", "OTHER_S1"],
        "track_summary": track_summary,
        "satellite_summary": satellite_summary,
        "mission_summary": {
            MISSIONS[m]["label"]: len([f for f in slim_frames if mission_of(f) == m])
            for m in MISSIONS
        },
        "taiwan_frames": slim_frames,
    }

    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    JSON_FILE.write_text(json_text, encoding="utf-8")
    compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    JS_FILE.write_text(f"window.__SAR_DATA={compact};\n", encoding="utf-8")

    # Recent file: last 14 days only — loaded first for fast initial display
    recent_cutoff = (now - timedelta(days=14)).strftime("%Y-%m-%d")
    recent_frames = [f for f in slim_frames if (f.get("date") or "")[:10] >= recent_cutoff]
    recent_payload = {**payload, "taiwan_frames": recent_frames, "total_frames": len(recent_frames)}
    RECENT_FILE.write_text(
        json.dumps(recent_payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # Download lists are split two ways: by source (which website serves the
    # file) and by mission, so a NISAR-only or Sentinel-1-only bulk download
    # does not require filtering a combined list.
    write_meta4(all_frames, ASF_META4, "ASF")
    write_meta4(all_frames, COP_META4, "Copernicus")
    META4_DIR.mkdir(parents=True, exist_ok=True)
    for mission in MISSIONS:
        subset = [f for f in all_frames if mission_of(f) == mission]
        for source in MISSIONS[mission]["sources"]:
            target = META4_DIR / f"{source.lower()}_{mission}.meta4"
            write_meta4(subset, target, source)
            log(f"Wrote {target.relative_to(OUTPUT_DIR)} "
                f"({len([f for f in subset if (f.get('asf_url') if source == 'ASF' else f.get('download_url'))])} scenes)")

    log(f"Wrote {JSON_FILE.name} ({len(slim_frames)} frames), "
        f"{RECENT_FILE.name} ({len(recent_frames)} recent), {JS_FILE.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

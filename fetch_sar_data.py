#!/usr/bin/env python3
"""
SAR Monitor — Data Fetcher
===========================
每週由 GitHub Actions 執行，查詢台灣區域 SAR 衛星取像，
輸出 data/sar_status.json、data/asf_taiwan.meta4、data/copernicus_taiwan.meta4。

資料來源：
  · ASF DAAC  https://api.daac.asf.alaska.edu/services/search/param
  · Copernicus CDSE OData  https://catalogue.dataspace.copernicus.eu/odata/v1/Products

查詢 metadata 完全免費、免帳號；下載影像才需要帳號。
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── 設定 ──────────────────────────────────────────────────────────────────────
DAYS_BACK   = int(os.environ.get("DAYS_BACK", 7))
MAX_RESULTS = 500

# 台灣涵蓋範圍（含離島）
TAIWAN_WKT  = "POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))"

# ASF 平台代碼
#   SA=Sentinel-1A  SC=Sentinel-1C  SD=Sentinel-1D
#   A3=ALOS-2       A4=ALOS-4
#   R2=RADARSAT-2   RCM=RADARSAT Constellation
#   NISAR=NISAR
ASF_PLATFORMS = "SA,SC,SD,A3,A4,R2,RCM,NISAR"

# ASF 處理等級（SLC 和 GRD 都抓）
ASF_LEVELS = "SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,GRD"

OUTPUT_DIR  = Path(__file__).parent / "data"
JSON_FILE   = OUTPUT_DIR / "sar_status.json"
ASF_META4   = OUTPUT_DIR / "asf_taiwan.meta4"
COP_META4   = OUTPUT_DIR / "copernicus_taiwan.meta4"

# ── 工具函式 ──────────────────────────────────────────────────────────────────
def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def http_get(url: str, timeout: int = 40) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": "SAR-Monitor-GHActions/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        log(f"  HTTP {e.code} → {url[:90]}...")
    except Exception as e:
        log(f"  Error: {e}")
    return None

def date_fmt_asf(d: datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%SUTC")

def date_fmt_odata(d: datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def infer_product_type(*values: str) -> str:
    known = [
        "GSLC", "RSLC", "SLC",
        "GRD_HD", "GRD_MS", "GRD_HS", "GRD_FD", "GRD",
        "RAW", "SSC",
    ]
    for raw in values:
        if not raw:
            continue
        text = str(raw).upper().replace(".SAFE", "")
        for item in known:
            if item in text:
                return item
        for token in text.replace("-", "_").split("_"):
            if token in known:
                return token
    return ""

# ── ASF DAAC ──────────────────────────────────────────────────────────────────
def fetch_asf(start: datetime, end: datetime) -> list[dict]:
    log("▶ ASF DAAC SearchAPI …")
    params = {
        "intersectsWith": TAIWAN_WKT,
        "platform":       ASF_PLATFORMS,
        "processingLevel": ASF_LEVELS,
        "start":          date_fmt_asf(start),
        "end":            date_fmt_asf(end),
        "output":         "geojson",
        "maxresults":     MAX_RESULTS,
    }
    url  = "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode(params)
    data = http_get(url)
    if not data or "features" not in data:
        log("  ASF：無資料")
        return []

    features = data["features"]
    log(f"  ASF：{len(features)} 筆")

    out = []
    for f in features:
        p    = f.get("properties", {})
        geom = f.get("geometry")
        out.append({
            "source":          "ASF",
            "granule":         p.get("sceneName", ""),
            "platform":        p.get("platform", ""),
            "sensor":          p.get("sensor", ""),
            "date":            p.get("startTime", ""),
            "stop_time":       p.get("stopTime", ""),
            "mode":            p.get("beamModeType") or p.get("beamMode", ""),
            "polarization":    p.get("polarization", ""),
            "orbit":           p.get("orbit", ""),
            "path_number":     p.get("pathNumber", ""),
            "frame_number":    p.get("frameNumber", ""),
            "direction":       p.get("flightDirection", ""),
            "product_type":    infer_product_type(p.get("processingLevel"), p.get("sceneName", "")),
            "processing_level": p.get("processingLevel", ""),
            "look_direction":  p.get("lookDirection", ""),
            "footprint":       geom,
            "asf_url":         p.get("url", ""),
            "browse_url":      (p.get("browse") or [None])[0] if isinstance(p.get("browse"), list) else p.get("browse", ""),
            "file_size_mb":    round(float(p.get("sizeMB") or 0), 1),
            "processing_date": p.get("processingDate", ""),
        })
    return out

# ── Copernicus CDSE ────────────────────────────────────────────────────────────
def fetch_copernicus(start: datetime, end: datetime) -> list[dict]:
    log("▶ Copernicus CDSE OData API …")
    # CDSE 接受 INTERSECTS Geography
    wkt = "POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))"
    filt = (
        f"OData.CSC.Intersects(area=geography'SRID=4326;{wkt}')"
        f" and Collection/Name eq 'SENTINEL-1'"
        f" and ContentDate/Start gt {date_fmt_odata(start)}"
        f" and ContentDate/Start lt {date_fmt_odata(end)}"
    )
    params = {
        "$filter":  filt,
        "$orderby": "ContentDate/Start desc",
        "$top":     min(MAX_RESULTS, 1000),
        "$expand":  "Attributes",
    }
    url  = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?" + urllib.parse.urlencode(params)
    data = http_get(url, timeout=60)
    if not data or "value" not in data:
        log("  Copernicus：無資料")
        return []

    items = data["value"]
    log(f"  Copernicus：{len(items)} 筆")

    out = []
    for item in items:
        name  = item.get("Name", "")
        parts = name.replace(".SAFE", "").split("_")

        attrs = {a["Name"]: a.get("Value", "") for a in item.get("Attributes", [])}
        geom  = item.get("GeoFootprint") or item.get("Footprint")

        # 轉換 GeoJSON（CDSE 有時給 WKT）
        if isinstance(geom, str) and geom.startswith("POLYGON"):
            geom = wkt_to_geojson(geom)

        pid = item.get("Id", "")
        out.append({
            "source":         "Copernicus",
            "granule":        name.replace(".SAFE", ""),
            "product_id":     pid,
            "platform":       parts[0] if parts else "",
            "mode":           parts[1] if len(parts) > 1 else "",
            "product_type":   infer_product_type(parts[2] if len(parts) > 2 else "", name),
            "date":           item.get("ContentDate", {}).get("Start", ""),
            "stop_time":      item.get("ContentDate", {}).get("End", ""),
            "polarization":   attrs.get("polarisationChannels", ""),
            "orbit":          attrs.get("relativeOrbitNumber", ""),
            "direction":      attrs.get("orbitDirection", ""),
            "frame_number":   attrs.get("frameNumber", ""),
            "footprint":      geom,
            "download_url":   f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({pid})/$value" if pid else "",
            "s3_path":        item.get("S3Path", ""),
            "file_size_mb":   round((item.get("ContentLength") or 0) / 1e6, 1),
        })
    return out

def wkt_to_geojson(wkt: str) -> dict:
    """把 POLYGON((lon lat,...)) 轉成 GeoJSON Polygon"""
    try:
        inner = wkt.replace("POLYGON((", "").replace("))", "")
        coords = [[float(v) for v in pair.split()] for pair in inner.split(",")]
        return {"type": "Polygon", "coordinates": [coords]}
    except Exception:
        return {}

# ── 合併去重 ──────────────────────────────────────────────────────────────────
def deduplicate(frames: list[dict]) -> list[dict]:
    """以 granule 名稱去重（ASF 與 Copernicus 的 Sentinel-1 名稱相同）"""
    seen, out = set(), []
    for f in frames:
        key = f.get("granule") or f.get("product_id") or ""
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    return out

# ── 生成 ASF .meta4 ────────────────────────────────────────────────────────────
def write_asf_meta4(frames: list[dict], path: Path):
    """
    標準 Metalink 4 (RFC 5854) 格式，可直接用 aria2c 搭配 Earthdata cookie 下載。
    """
    asf_frames = [f for f in frames if f.get("source") == "ASF" and f.get("granule")]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
        f'  <!-- 生成時間: {datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")} -->',
        f'  <!-- 共 {len(asf_frames)} 個場景 -->',
    ]
    for f in asf_frames[:200]:
        g   = f["granule"]
        url = f.get("asf_url", "")
        sz  = int(f.get("file_size_mb", 0) * 1_000_000)
        lines.append(f'  <file name="{g}">')
        if sz:
            lines.append(f'    <size>{sz}</size>')
        if url:
            lines.append(f'    <url priority="1">{url}</url>')
        lines.append(f'  </file>')
    lines.append('</metalink>')
    path.write_text("\n".join(lines), encoding="utf-8")
    log(f"  ASF meta4 → {path.name}（{len(asf_frames)} 個場景）")

# ── 生成 Copernicus .meta4 ────────────────────────────────────────────────────
def write_copernicus_meta4(frames: list[dict], path: Path):
    """
    Copernicus CDSE 下載 Metalink，搭配 Bearer Token 使用。
    """
    cop_frames = [f for f in frames if f.get("source") == "Copernicus" and f.get("download_url")]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
        f'  <!-- 生成時間: {datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")} -->',
        f'  <!-- 共 {len(cop_frames)} 個場景 -->',
        '  <!-- 下載前請先取得 Bearer Token：',
        '       TOKEN=$(curl -s -X POST https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token \\',
        '         -d "client_id=cdse-public&username=EMAIL&password=PASS&grant_type=password" \\',
        '         | python3 -c "import sys,json;print(json.load(sys.stdin)[\'access_token\'])") -->',
        '  <!-- aria2c --header="Authorization: Bearer $TOKEN" copernicus_taiwan.meta4 -->',
    ]
    for f in cop_frames[:200]:
        g   = f["granule"]
        url = f["download_url"]
        sz  = int(f.get("file_size_mb", 0) * 1_000_000)
        lines.append(f'  <file name="{g}.SAFE.zip">')
        if sz:
            lines.append(f'    <size>{sz}</size>')
        lines.append(f'    <url priority="1">{url}</url>')
        lines.append(f'  </file>')
    lines.append('</metalink>')
    path.write_text("\n".join(lines), encoding="utf-8")
    log(f"  Copernicus meta4 → {path.name}（{len(cop_frames)} 個場景）")

# ── 主程式 ────────────────────────────────────────────────────────────────────
def main() -> int:
    now      = datetime.now(timezone.utc)
    start    = now - timedelta(days=DAYS_BACK)

    log("=" * 56)
    log(f"SAR Monitor  資料更新  v2.0")
    log(f"查詢時段：{date_fmt_asf(start)}  →  {date_fmt_asf(now)}")
    log(f"查詢區域：台灣涵蓋框  119–123°E  21–26.5°N")
    log("=" * 56)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. 查詢兩個來源
    asf_frames = []
    try:
        asf_frames = fetch_asf(start, now)
    except Exception as e:
        log(f"ASF 查詢例外：{e}")

    time.sleep(1)  # 避免過快連續請求

    cop_frames = []
    try:
        cop_frames = fetch_copernicus(start, now)
    except Exception as e:
        log(f"Copernicus 查詢例外：{e}")

    # 2. 合併去重
    all_frames = deduplicate(asf_frames + cop_frames)
    log(f"\n合計（去重後）：{len(all_frames)} 幀")

    # 3. 衛星統計
    sat_summary: dict[str, int] = {}
    for f in all_frames:
        k = f.get("platform", "unknown")
        sat_summary[k] = sat_summary.get(k, 0) + 1

    # 4. 輸出 meta4
    write_asf_meta4(all_frames, ASF_META4)
    write_copernicus_meta4(all_frames, COP_META4)

    # 5. 輸出 JSON（footprint 保留，前端地圖用）
    payload = {
        "updated_at":         now.strftime("%Y-%m-%d %H:%M UTC"),
        "query_start":        start.isoformat(),
        "query_end":          now.isoformat(),
        "days_back":          DAYS_BACK,
        "total_frames":       len(all_frames),
        "asf_count":          len([f for f in all_frames if f.get("source") == "ASF"]),
        "copernicus_count":   len([f for f in all_frames if f.get("source") == "Copernicus"]),
        "satellite_summary":  sat_summary,
        "taiwan_frames":      all_frames,
    }
    JSON_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"  sar_status.json → {JSON_FILE.name}")

    log("\n✓ 完成！")
    log(f"  · JSON  {len(all_frames)} 幀")
    log(f"  · ASF meta4  {len([f for f in all_frames if f.get('source')=='ASF'])} 筆")
    log(f"  · Copernicus meta4  {len([f for f in all_frames if f.get('source')=='Copernicus'])} 筆")
    return 0

if __name__ == "__main__":
    sys.exit(main())

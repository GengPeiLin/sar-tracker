#!/usr/bin/env python3
"""Forward validation of the FUTURAMA acquisition forecast.

Run daily from .github/workflows/update.yml, AFTER fetch_sar_data.py, so the
catalog it scores against is already up to date. Each run does two things:

  1. PREDICT (once per UTC day) — propagate a fresh Celestrak TLE and record
     every Taiwan overpass it expects, into data/forecast_log.json.
  2. SCORE — take predictions the archive has caught up past and look for the
     real acquisition that answers them, then rewrite docs/forecast-accuracy.md.

A prediction is kept twice: `first` is the estimate made at the longest lead
time, `last` the most recent one. Scoring both is the point — re-predicting a
pass the day before it happens and reporting only that would flatter the
result, because the whole question is how far ahead the forecast is useful.

The unit is one PASS — one (satellite, track) on one day — not one frame.
Frame numbers are not stable for Sentinel-1: they come from where a datatake
was cut, so the same ground is numbered differently on different passes (S1D
track 69 ran frames 68/74/79 through June and July, then 71/76, then 72/78).
Scoring per frame therefore counts a perfectly good forecast as a miss —
measured 8% against 56% for the same predictions over the same 90 days. How
many frame numbers did line up is still recorded, as `frames_matched`,
because the renumbering is worth watching in its own right.

A HIT is an actual acquisition of the same (satellite, track) on the same day;
the error is the signed difference between the median predicted instant and
the median actual one. A MISS is a predicted pass with no such acquisition —
the satellite flew over and did not image, which is exactly the half SGP4
cannot answer and the half this log exists to quantify. Retrodiction over the
90 days to 2026-08-26 put that at 56%.

IMPORTANT: the prediction rule here mirrors the FUTURAMA section of app.js
(search for "FUTURAMA"). The two are separate implementations of one method,
so a change to either must be made to both — otherwise this file measures a
forecast the site does not actually show. The constants below are the contract
between them.
"""

import io
import json
import math
import os
import re
import statistics
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

try:
    from sgp4.api import Satrec, jday
except ImportError:  # pragma: no cover
    print("[forecast] sgp4 is not installed; skipping validation", flush=True)
    sys.exit(0)

ROOT = os.path.dirname(os.path.abspath(__file__))
CATALOG = os.path.join(ROOT, "data", "sar_status.js")
LOG_PATH = os.path.join(ROOT, "data", "forecast_log.json")
REPORT_PATH = os.path.join(ROOT, "docs", "forecast-accuracy.md")
JS_PREFIX = "window.__SAR_DATA = "

# ── contract with app.js (keep in sync) ──────────────────────────────────────
FUTURE_MODE_SATS = {
    "S1C":   {"norad": 62261, "drift_s_per_day": 3.05, "base_err_s": 22},
    "S1D":   {"norad": 66315, "drift_s_per_day": 0.07, "base_err_s": 8},
    "NISAR": {"norad": 65053, "drift_s_per_day": 0.76, "base_err_s": 29},
}
CANONICAL_PRODUCT = {"S1A": "SLC", "S1C": "SLC", "S1D": "SLC", "NISAR": "RSLC"}
# The catalog files the same spacecraft under two names — 'S1D' from ASF and
# 'Sentinel-1D' from Copernicus — and app.js folds them together through the
# asf_prefix aliases before anything else looks at a frame. Reading the raw file
# without doing the same silently drops whichever half a provider supplied,
# which here was every recent SLC.
SAT_ALIASES = {
    "SENTINEL-1A": "S1A", "SENTINEL-1B": "S1B",
    "SENTINEL-1C": "S1C", "SENTINEL-1D": "S1D",
}
# Order matters and mirrors KNOWN_PRODUCT_TYPES in app.js: RSLC is tested
# before SLC, or every NISAR RSLC granule would normalise to SLC.
KNOWN_PRODUCT_TYPES = [
    "L1_RSLC", "L1_GSLC", "L2_GCOV", "L2_GUNW", "L3_SME2", "GSLC", "RSLC",
    "SLC", "GRD_HD", "GRD_MS", "GRD_HS", "GRD_FD", "GRD", "GCOV", "GUNW",
    "SME2", "RAW", "SSC", "OCN", "ETAD", "COH12",
]
TEMPLATE_MAX_AGE_DAYS = 60
COARSE_S = 300
FINE_STEPS = 16
LAT_BAND = (19.0, 28.0)
REF_LON = 121.0
LON_PREFILTER_DEG = 15.0
LON_TOL_DEG = 1.5

# ── validation policy ────────────────────────────────────────────────────────
HORIZON_DAYS = 90          # how far ahead each run records
MATCH_WINDOW_H = 12        # an actual this close counts as answering a prediction
# A prediction is only scored once the archive demonstrably covers its instant:
# that satellite must already have published an acquisition LATER than it. A
# fixed wait cannot do this job — products appear days after acquisition and the
# lag differs per mission — and scoring too early turns "not published yet" into
# a permanent miss. Measured 2026-08-26: the newest acquisition was 2.4 d old for
# S1C but 5.8 d for S1D, so a 36 h wait was marking live predictions as failed.
SETTLE_MARGIN_H = 2        # the later acquisition must clear the prediction by this
PRUNE_AFTER_DAYS = 400     # keep the log bounded

RE_EARTH = 6378.137
E2 = (1 / 298.257223563) * (2 - 1 / 298.257223563)


# ── catalog ──────────────────────────────────────────────────────────────────

def load_frames():
    raw = io.open(CATALOG, encoding="utf-8").read()
    raw = raw[raw.index("{"):].rstrip().rstrip(";")
    return json.loads(raw)["taiwan_frames"]


def parse_iso(value):
    text = str(value or "").replace("Z", "+00:00")
    text = re.sub(r"(\.\d{6})\d+", r"\1", text)
    try:
        return datetime.fromisoformat(text).astimezone(timezone.utc)
    except ValueError:
        return None


def frame_sat(frame):
    raw = str(frame.get("satellite_id") or frame.get("platform") or "").upper()
    return SAT_ALIASES.get(raw, raw)


def product_type(frame):
    for raw in (frame.get("product_type"), frame.get("processing_level"),
                frame.get("granule")):
        text = str(raw or "").upper().replace(".SAFE", "")
        if not text:
            continue
        for item in KNOWN_PRODUCT_TYPES:
            if item in text:
                return item
    return "OCN"


def is_canonical(frame):
    wanted = CANONICAL_PRODUCT.get(frame_sat(frame))
    return not wanted or product_type(frame) == wanted


def series_key(frame):
    return "|".join([
        frame_sat(frame),
        str(frame.get("direction") or ""),
        str(frame.get("path_number") if frame.get("path_number") is not None else ""),
        str(frame.get("frame_number") or ""),
    ])


# ── TLE ──────────────────────────────────────────────────────────────────────

def fetch_tles():
    out = {}
    for sat_id, cfg in FUTURE_MODE_SATS.items():
        url = ("https://celestrak.org/NORAD/elements/gp.php"
               f"?CATNR={cfg['norad']}&FORMAT=TLE")
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                text = resp.read().decode("utf-8", "replace")
        except Exception as exc:                      # noqa: BLE001
            print(f"[forecast] TLE fetch failed for {sat_id}: {exc}", flush=True)
            continue
        lines = [ln.strip() for ln in text.strip().split("\n")]
        l1 = next((ln for ln in lines if ln.startswith("1 ")), None)
        l2 = next((ln for ln in lines if ln.startswith("2 ")), None)
        if l1 and l2:
            out[sat_id] = {"line1": l1, "line2": l2, "epoch": tle_epoch(l1)}
    return out


def tle_epoch(line1):
    yy = int(line1[18:20])
    doy = float(line1[20:32])
    return datetime(2000 + yy, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy - 1)


# ── propagation ──────────────────────────────────────────────────────────────

def gmst(jd, fr):
    t = (jd - 2451545.0 + fr) / 36525.0
    g = (67310.54841 + (876600.0 * 3600 + 8640184.812866) * t
         + 0.093104 * t * t - 6.2e-6 * t ** 3)
    return math.radians((g % 86400.0) / 240.0) % (2 * math.pi)


def subpoint(satrec, when):
    jd, fr = jday(when.year, when.month, when.day, when.hour, when.minute,
                  when.second + when.microsecond * 1e-6)
    err, r, _v = satrec.sgp4(jd, fr)
    if err != 0:
        return None
    th = gmst(jd, fr)
    x = r[0] * math.cos(th) + r[1] * math.sin(th)
    y = -r[0] * math.sin(th) + r[1] * math.cos(th)
    z = r[2]
    p = math.hypot(x, y)
    lat = math.atan2(z, p)
    for _ in range(6):
        n = RE_EARTH / math.sqrt(1 - E2 * math.sin(lat) ** 2)
        lat = math.atan2(z + n * E2 * math.sin(lat), p)
    return math.degrees(lat), math.degrees(math.atan2(y, x))


def wrap180(deg):
    while deg > 180:
        deg -= 360
    while deg < -180:
        deg += 360
    return deg


# ── templates: geometry from the archive, timing from SGP4 ───────────────────

def build_templates(frames, satrecs, now):
    cutoff = now - timedelta(days=TEMPLATE_MAX_AGE_DAYS)
    geom, calib = {}, {}

    for frame in frames:
        sat = frame_sat(frame)
        if sat not in FUTURE_MODE_SATS or not is_canonical(frame):
            continue
        when = parse_iso(frame.get("date"))
        if when is None or when < cutoff:
            continue
        fp = frame.get("fp")
        if not fp or len(fp) < 6:
            continue
        # Copernicus records carry no frame number, so they cannot name one
        # frame of a pass — the unit both the forecast and the scoring key on.
        if frame.get("path_number") is None or not str(frame.get("frame_number") or ""):
            continue

        key = series_key(frame)
        if key not in calib or when > calib[key][1]:
            calib[key] = (frame, when)
        # NISAR ships Full and Partial versions of one frame; a Partial
        # footprint is a clipped slice, so it must never define the geometry.
        coverage = frame.get("frame_coverage")
        if coverage and coverage != "Full":
            continue
        if key not in geom or when > geom[key][1]:
            geom[key] = (frame, when)

    templates = []
    for key, (frame, when) in geom.items():
        fp = frame["fp"]
        lats = fp[1::2]
        if not lats:
            continue
        sat = frame_sat(frame)
        satrec = satrecs.get(sat)
        if satrec is None:
            continue
        ref_at = calib.get(key, (frame, when))[1]
        ref = subpoint(satrec, ref_at)
        if ref is None:
            continue
        templates.append({
            "sat": sat,
            "track": frame.get("path_number"),
            "frame": frame.get("frame_number"),
            "direction": frame.get("direction") or "",
            "centroid_lat": sum(lats) / len(lats),
            "ref_lon": ref[1],
            "ascending": str(frame.get("direction") or "").upper().startswith("ASC"),
            "from_granule": frame.get("granule") or "",
        })
    return templates


def uncertainty_s(sat, target, tle):
    cfg = FUTURE_MODE_SATS[sat]
    epoch = tle.get("epoch")
    days = abs((target - epoch).total_seconds()) / 86400.0 if epoch else 0.0
    return round(cfg["base_err_s"] + cfg["drift_s_per_day"] * days)


def predict(templates, satrecs, tles, start, end):
    by_sat = {}
    for tpl in templates:
        by_sat.setdefault(tpl["sat"], []).append(tpl)

    out = []
    for sat, sat_templates in by_sat.items():
        satrec = satrecs[sat]
        series = []
        t = start
        while t <= end:
            sp = subpoint(satrec, t)
            if sp:
                series.append((t, sp[0], sp[1]))
            t += timedelta(seconds=COARSE_S)
        if len(series) < 3:
            continue

        for i in range(1, len(series)):
            (ta, lat_a, lon_a), (tb, lat_b, lon_b) = series[i - 1], series[i]
            lo, hi = min(lat_a, lat_b), max(lat_a, lat_b)
            if hi < LAT_BAND[0] or lo > LAT_BAND[1]:
                continue
            if abs(wrap180(lon_a - REF_LON)) > LON_PREFILTER_DEG and \
               abs(wrap180(lon_b - REF_LON)) > LON_PREFILTER_DEG:
                continue

            samples = []
            span = (tb - ta).total_seconds()
            for k in range(FINE_STEPS + 1):
                ts = ta + timedelta(seconds=span * k / FINE_STEPS)
                sp = subpoint(satrec, ts)
                if sp:
                    samples.append((ts, sp[0], sp[1]))
            if len(samples) < 2:
                continue

            for tpl in sat_templates:
                hit = crossing(samples, tpl["centroid_lat"], tpl["ascending"])
                if hit is None:
                    continue
                when, lon = hit
                if abs(wrap180(lon - tpl["ref_lon"])) > LON_TOL_DEG:
                    continue
                out.append({
                    "satellite": tpl["sat"],
                    "track": tpl["track"],
                    "frame": tpl["frame"],
                    "direction": tpl["direction"],
                    "predicted": when.isoformat().replace("+00:00", "Z"),
                    "uncertainty_s": uncertainty_s(tpl["sat"], when, tles[tpl["sat"]]),
                    "from_granule": tpl["from_granule"],
                })
    out.sort(key=lambda p: p["predicted"])
    return out


def crossing(samples, target_lat, ascending):
    for i in range(1, len(samples)):
        (ta, lat_a, lon_a), (tb, lat_b, lon_b) = samples[i - 1], samples[i]
        if lat_a == lat_b or (lat_b > lat_a) != ascending:
            continue
        if (lat_a - target_lat) * (lat_b - target_lat) > 0:
            continue
        f = (target_lat - lat_a) / (lat_b - lat_a)
        return (ta + (tb - ta) * f, lon_a + wrap180(lon_b - lon_a) * f)
    return None


# ── log ──────────────────────────────────────────────────────────────────────

def pass_key(satellite, track, when_iso):
    """One overpass. A track passes at most once a day, so the date pins it
    without ever merging two real overpasses."""
    return "|".join([str(satellite), str(track), str(when_iso)[:10]])


def median_instant(times):
    ordered = sorted(times)
    return ordered[len(ordered) // 2]


def load_log():
    if not os.path.exists(LOG_PATH):
        return {"schema": 2, "passes": {}}
    try:
        return json.load(io.open(LOG_PATH, encoding="utf-8"))
    except Exception:                                  # noqa: BLE001
        return {"schema": 2, "passes": {}}


def record(log, predictions, now):
    """Collapse the frame-level predictions into one row per overpass."""
    grouped = {}
    for p in predictions:
        key = pass_key(p["satellite"], p["track"], p["predicted"])
        grouped.setdefault(key, []).append(p)

    added = updated = 0
    for key, group in grouped.items():
        instant = median_instant([parse_iso(g["predicted"]) for g in group])
        iso = instant.isoformat().replace("+00:00", "Z")
        frames = sorted({str(g["frame"]) for g in group})
        row = log["passes"].get(key)
        if row is None:
            log["passes"][key] = {
                "satellite": group[0]["satellite"],
                "track": group[0]["track"],
                "direction": group[0]["direction"],
                "frames": frames,
                "predicted": iso,
                "uncertainty_s": max(g["uncertainty_s"] for g in group),
                "from_granule": group[0]["from_granule"],
                "first_predicted": iso,
                "first_seen": now.isoformat().replace("+00:00", "Z"),
                "first_lead_days": round((instant - now).total_seconds() / 86400.0, 2),
                "status": "pending",
            }
            added += 1
        elif row.get("status") == "pending":
            # keep the longest-lead estimate AND the freshest one
            row["predicted"] = iso
            row["frames"] = frames
            row["uncertainty_s"] = max(g["uncertainty_s"] for g in group)
            row["last_seen"] = now.isoformat().replace("+00:00", "Z")
            updated += 1
    return added, updated


def acquisition_midpoint(frame):
    """The instant a prediction actually targets.

    A prediction is the moment the ground track crosses the footprint's CENTROID
    latitude, so the acquisition's mid-time is what answers it. Scoring against
    frame['date'] — the START of the acquisition — biases every hit early by half
    a frame: 13.5 s for Sentinel-1, 16 s for NISAR. Measured as a -10.2 s mean
    bias across 28 hits before this was fixed, which is not a forecast error at
    all, only the wrong instant to compare against."""
    start = parse_iso(frame.get("date"))
    stop = parse_iso(frame.get("stop_time"))
    if start is None:
        return None
    if stop is None or stop <= start:
        return start
    return start + (stop - start) / 2


def score(log, frames, now):
    actuals = {}
    newest_per_sat = {}
    for frame in frames:
        sat = frame_sat(frame)
        if sat not in FUTURE_MODE_SATS or not is_canonical(frame):
            continue
        when = acquisition_midpoint(frame)
        if when is None:
            continue
        if sat not in newest_per_sat or when > newest_per_sat[sat]:
            newest_per_sat[sat] = when
        key = pass_key(sat, frame.get("path_number"), when.isoformat())
        actuals.setdefault(key, []).append(
            (when, frame.get("granule") or "", str(frame.get("frame_number") or "")))

    scored = 0
    for row in log["passes"].values():
        if row.get("status") != "pending":
            continue
        predicted = parse_iso(row["predicted"])
        if predicted is None:
            continue
        # Only judge a prediction the archive has caught up past.
        newest = newest_per_sat.get(row["satellite"])
        if newest is None or predicted > newest - timedelta(hours=SETTLE_MARGIN_H):
            continue

        found = actuals.get(pass_key(row["satellite"], row["track"], row["predicted"]))
        if not found:
            row["status"] = "miss"
        else:
            actual = median_instant([f[0] for f in found])
            dt = (actual - predicted).total_seconds()
            if abs(dt) > MATCH_WINDOW_H * 3600:
                row["status"] = "miss"
            else:
                row["status"] = "hit"
                row["actual"] = actual.isoformat().replace("+00:00", "Z")
                row["dt_s"] = round(dt, 2)
                actual_frames = sorted({f[2] for f in found if f[2]})
                row["actual_frames"] = actual_frames
                # Sentinel-1 renumbers frames between passes; how often the
                # predicted numbers still line up is worth watching separately.
                row["frames_matched"] = len(
                    set(row.get("frames") or []) & set(actual_frames))
                first = parse_iso(row.get("first_predicted") or row["predicted"])
                if first:
                    row["first_dt_s"] = round((actual - first).total_seconds(), 2)
        scored += 1
    return scored


def prune(log, now):
    cutoff = now - timedelta(days=PRUNE_AFTER_DAYS)
    for key in [k for k, r in log["passes"].items()
                if (parse_iso(r["predicted"]) or now) < cutoff]:
        del log["passes"][key]


# ── report ───────────────────────────────────────────────────────────────────

def pctile(values, q):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, int(q * len(ordered)) - 1))]


def fmt(value, unit="s"):
    return "--" if value is None else f"{value:.1f} {unit}"


def write_report(log, now, tles):
    rows = list(log["passes"].values())
    done = [r for r in rows if r.get("status") in ("hit", "miss")]
    hits = [r for r in done if r["status"] == "hit"]
    pending = [r for r in rows if r.get("status") == "pending"]

    lines = [
        "# Forecast accuracy",
        "",
        "Generated by `forecast_validation.py` on every data update. Each row of",
        "`data/forecast_log.json` is one predicted overpass of one frame; this is",
        "the scoreboard.",
        "",
        f"- Updated: `{now.strftime('%Y-%m-%d %H:%M')} UTC`",
        f"- Scored: **{len(done)}** predicted passes ({len(hits)} imaged, "
        f"{len(done) - len(hits)} not)",
        f"- Still pending: {len(pending)}",
        "",
        "A **hit** means a real acquisition of the same satellite, track and frame",
        f"arrived within {MATCH_WINDOW_H} h of the predicted instant. A **miss** means the pass",
        "was predicted and nothing was acquired — the satellite flew over and did",
        "not image. Timing accuracy and imaging likelihood are different questions,",
        "and only the first is something SGP4 can answer.",
        "",
    ]

    if not done:
        lines += ["No predictions have come due yet.", ""]
    else:
        rate = 100.0 * len(hits) / len(done)
        errs = [abs(r["dt_s"]) for r in hits if "dt_s" in r]
        first_errs = [abs(r["first_dt_s"]) for r in hits if "first_dt_s" in r]
        lines += [
            "## Timing, when the pass happened",
            "",
            "| | median | p90 | max | n |",
            "|---|---|---|---|---|",
            f"| latest estimate | {fmt(statistics.median(errs) if errs else None)} | "
            f"{fmt(pctile(errs, 0.9))} | {fmt(max(errs) if errs else None)} | {len(errs)} |",
            f"| first estimate (longest lead) | "
            f"{fmt(statistics.median(first_errs) if first_errs else None)} | "
            f"{fmt(pctile(first_errs, 0.9))} | "
            f"{fmt(max(first_errs) if first_errs else None)} | {len(first_errs)} |",
            "",
            f"## Imaged or not — {rate:.0f}% of predicted passes produced an acquisition",
            "",
            "| satellite | track | predicted | imaged | rate | median &Delta;t |",
            "|---|---|---|---|---|---|",
        ]
        groups = {}
        for r in done:
            g = (r["satellite"], f"{'A' if str(r['direction']).upper().startswith('ASC') else 'D'}{r['track']}")
            groups.setdefault(g, []).append(r)
        for (sat, track), items in sorted(groups.items()):
            got = [r for r in items if r["status"] == "hit"]
            ge = [abs(r["dt_s"]) for r in got if "dt_s" in r]
            lines.append(
                f"| {sat} | {track} | {len(items)} | {len(got)} | "
                f"{100.0 * len(got) / len(items):.0f}% | "
                f"{fmt(statistics.median(ge) if ge else None)} |")
        lines.append("")

        buckets = [(0, 3), (3, 7), (7, 14), (14, 30), (30, 90)]
        lines += ["## Timing error against how far ahead it was first predicted", "",
                  "| lead | n | median | p90 | max |", "|---|---|---|---|---|"]
        for lo, hi in buckets:
            sel = [abs(r["first_dt_s"]) for r in hits
                   if "first_dt_s" in r and lo <= (r.get("first_lead_days") or 0) < hi]
            if sel:
                lines.append(
                    f"| {lo}-{hi} d | {len(sel)} | "
                    f"{fmt(statistics.median(sel))} | {fmt(pctile(sel, 0.9))} | "
                    f"{fmt(max(sel))} |")
        lines.append("")

    if tles:
        lines += ["## Orbit data in this run", "",
                  "| satellite | TLE epoch |", "|---|---|"]
        for sat in sorted(tles):
            lines.append(f"| {sat} | {tles[sat]['epoch'].strftime('%Y-%m-%d %H:%M')} UTC |")
        lines.append("")

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    io.open(REPORT_PATH, "w", encoding="utf-8", newline="\n").write("\n".join(lines))


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    now = datetime.now(timezone.utc)
    frames = load_frames()
    log = load_log()

    # Predict once per UTC day: the workflow runs five times a day and a fresh
    # forecast on each would only churn the log.
    today = now.strftime("%Y-%m-%d")
    tles = {}
    if log.get("last_prediction_day") != today or "--force" in sys.argv:
        tles = fetch_tles()
        if tles:
            satrecs = {s: Satrec.twoline2rv(t["line1"], t["line2"])
                       for s, t in tles.items()}
            templates = build_templates(frames, satrecs, now)
            preds = predict(templates, satrecs, tles, now,
                            now + timedelta(days=HORIZON_DAYS))
            added, updated = record(log, preds, now)
            log["last_prediction_day"] = today
            print(f"[forecast] {len(templates)} templates, {len(preds)} passes "
                  f"({added} new, {updated} refreshed)", flush=True)
        else:
            # No orbit data is not a build failure; scoring still runs.
            print("[forecast] no TLE this run, scoring only", flush=True)
    else:
        print("[forecast] already predicted today, scoring only", flush=True)

    scored = score(log, frames, now)
    prune(log, now)
    log["updated_at"] = now.isoformat().replace("+00:00", "Z")

    io.open(LOG_PATH, "w", encoding="utf-8", newline="\n").write(
        json.dumps(log, ensure_ascii=False, indent=1, sort_keys=True))
    write_report(log, now, tles)
    print(f"[forecast] scored {scored}; {len(log['passes'])} passes in log", flush=True)


if __name__ == "__main__":
    main()

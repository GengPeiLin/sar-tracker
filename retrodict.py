#!/usr/bin/env python3
"""Retrodiction: run the forecast over a window that has already happened and
score it against what was actually acquired.

    python retrodict.py [days_back]        # default 90

This answers today what the forward log in data/forecast_log.json will answer
in 90 days, and it is the tool to re-validate with after any change to the
prediction rule. It is NOT a replacement for the forward log, for one reason:

    Celestrak serves only the CURRENT TLE. A forecast made 90 days ago would
    have used the orbit as known then; this uses today's orbit propagated
    backwards. Retrodiction error grows with distance from the TLE epoch, so
    the far end of a long window is measuring two things at once. The report
    breaks error down by how far back the pass was, which makes that visible
    rather than hidden.

Templates come only from acquisitions BEFORE the window opens. Without that the
answer is circular: a template whose own acquisition lies inside the window
already knows what it is being asked to predict.

Two ways of scoring are reported side by side, because they disagree and the
disagreement is itself a finding:

  FRAME level — a hit needs the same (satellite, track, frame). This is the
      obvious rule and it is wrong for Sentinel-1: frame numbers come from where
      a datatake was cut, and the same ground is numbered differently on
      different passes (S1D track 69: frames 68/74/79 in June and July, then
      71/76, then 72/78). NISAR's frames are stable, so it is unaffected.

  PASS level — a hit needs the same (satellite, track) on the same day, and
      compares the median predicted instant against the median actual instant.
      Frame numbering drops out; what is left is the timing question the
      forecast actually answers.
"""

import statistics
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sgp4.api import Satrec

import forecast_validation as F

DAYS_BACK = int(sys.argv[1]) if len(sys.argv) > 1 else 90
# Rolling mode is the honest test. One long window forces every template to
# predate it, so a 90-day run is templated on 90-day-old data and measures
# something the feature never does — it uses templates at most 60 days old and
# a horizon of days to weeks. Walking a cutoff through the period instead, each
# with the templates that were actually available at that moment, aggregates
# many realistic short forecasts over the same 90 days.
ROLL = "--roll" in sys.argv
STEP_DAYS = 6      # how often a fresh forecast is made
HORIZON_DAYS = 14  # how far each one looks ahead


def pctile(values, q):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, int(q * len(ordered)) - 1))]


def show(label, values):
    if not values:
        print(f"  {label:<22} --")
        return
    a = sorted(abs(v) for v in values)
    print(f"  {label:<22} n={len(a):<4d} median {statistics.median(a):7.1f}s "
          f" p90 {pctile(a, 0.9):7.1f}s  max {max(a):8.1f}s "
          f" bias {statistics.mean(values):+7.1f}s")


def roll():
    """Walk a cutoff through the period, forecasting HORIZON_DAYS from each."""
    now = datetime.now(timezone.utc)
    frames = F.load_frames()
    tles = F.fetch_tles()
    if not tles:
        sys.exit("no TLE available")
    satrecs = {s: Satrec.twoline2rv(t["line1"], t["line2"]) for s, t in tles.items()}

    newest = {}
    for f in frames:
        sat = F.frame_sat(f)
        if sat not in F.FUTURE_MODE_SATS or not F.is_canonical(f):
            continue
        when = F.acquisition_midpoint(f)
        if when and (sat not in newest or when > newest[sat]):
            newest[sat] = when

    rows, seen = [], set()
    cutoff = now - timedelta(days=DAYS_BACK)
    n_cut = 0
    while cutoff < now - timedelta(days=1):
        end = min(now, cutoff + timedelta(days=HORIZON_DAYS))
        before = [f for f in frames if (F.parse_iso(f.get("date")) or now) < cutoff]
        templates = F.build_templates(before, satrecs, cutoff)
        if templates:
            n_cut += 1
            preds = F.predict(templates, satrecs, tles, cutoff, end)
            pred_pass = defaultdict(list)
            for p in preds:
                t = F.parse_iso(p["predicted"])
                cap = newest.get(p["satellite"])
                if cap is None or t > cap - timedelta(hours=F.SETTLE_MARGIN_H):
                    continue
                pred_pass[(p["satellite"], str(p["track"]),
                           t.strftime("%Y-%m-%d"))].append(t)
            for key, times in pred_pass.items():
                # one forecast per pass: keep the earliest cutoff that saw it,
                # so lead time is honest rather than the shortest available
                if key in seen:
                    continue
                seen.add(key)
                pt = sorted(times)[len(times) // 2]
                rows.append((key, pt, (pt - cutoff).total_seconds() / 86400.0))
        cutoff += timedelta(days=STEP_DAYS)

    by_pass = defaultdict(list)
    for f in frames:
        sat = F.frame_sat(f)
        if sat not in F.FUTURE_MODE_SATS or not F.is_canonical(f):
            continue
        when = F.acquisition_midpoint(f)
        if when is None or when < now - timedelta(days=DAYS_BACK):
            continue
        by_pass[(sat, str(f.get("path_number")),
                 when.strftime("%Y-%m-%d"))].append(when)

    hits, misses = [], []
    for key, pt, lead in rows:
        actual = by_pass.get(key)
        if not actual:
            misses.append((key, pt, lead))
        else:
            at = sorted(actual)[len(actual) // 2]
            hits.append((key, pt, lead, (at - pt).total_seconds()))
    unpredicted = [k for k in by_pass if k not in seen]

    print(f"rolling retrodiction   {now - timedelta(days=DAYS_BACK):%Y-%m-%d} -> {now:%Y-%m-%d}")
    print(f"  a fresh forecast every {STEP_DAYS} d, each looking {HORIZON_DAYS} d ahead")
    print(f"  {n_cut} cutoffs produced templates")
    print()
    print(f"predicted passes {len(rows)}   actual passes {len(by_pass)}")
    print(f"  hit {len(hits)}   miss {len(misses)}   "
          f"rate {100.0*len(hits)/max(1,len(rows)):.0f}%")
    print(f"  never predicted {len(unpredicted)}")
    print()
    dts = [h[3] for h in hits]
    show("timing (pass level)", dts)
    print()
    per, per_miss = defaultdict(list), defaultdict(int)
    for key, pt, lead, dt in hits:
        per[key[0]].append(dt)
    for key, pt, lead in misses:
        per_miss[key[0]] += 1
    print("by satellite")
    for sat in sorted(set(list(per) + list(per_miss))):
        h = per.get(sat, [])
        tot = len(h) + per_miss[sat]
        med = statistics.median([abs(x) for x in h]) if h else float("nan")
        print(f"  {sat:6s} hit {len(h):3d}  miss {per_miss[sat]:3d}  "
              f"rate {100.0*len(h)/max(1,tot):3.0f}%   median {med:6.1f}s")
    print()
    print("timing by lead time")
    print(f"  {'lead':>10}  {'n':>4}  {'median':>9}  {'p90':>9}  {'max':>9}")
    for lo, hi in ((0, 3), (3, 7), (7, 14)):
        sel = [dt for (_, _, lead, dt) in hits if lo <= lead < hi]
        if sel:
            a = [abs(x) for x in sel]
            print(f"  {lo:2d}-{hi:<2d} d     {len(a):4d}  {statistics.median(a):8.1f}s"
                  f"  {pctile(a,0.9):8.1f}s  {max(a):8.1f}s")
    if misses:
        print()
        mt = defaultdict(int)
        for key, pt, lead in misses:
            mt[f"{key[0]} T{key[1]}"] += 1
        print("predicted but never acquired")
        for k in sorted(mt):
            print(f"  {k:14s} {mt[k]}")
    if unpredicted:
        print()
        ut = defaultdict(int)
        for key in unpredicted:
            ut[f"{key[0]} T{key[1]}"] += 1
        print("acquired but never predicted")
        for k in sorted(ut):
            print(f"  {k:14s} {ut[k]}")


def main():
    if ROLL:
        return roll()
    now = datetime.now(timezone.utc)
    opens = now - timedelta(days=DAYS_BACK)

    frames = F.load_frames()
    tles = F.fetch_tles()
    if not tles:
        sys.exit("no TLE available")
    satrecs = {s: Satrec.twoline2rv(t["line1"], t["line2"]) for s, t in tles.items()}

    before = [f for f in frames if (F.parse_iso(f.get("date")) or now) < opens]
    templates = F.build_templates(before, satrecs, opens)
    preds = F.predict(templates, satrecs, tles, opens, now)

    # ── actuals inside the window ────────────────────────────────────────────
    by_frame = defaultdict(list)
    by_pass = defaultdict(list)
    newest = {}
    for f in frames:
        sat = F.frame_sat(f)
        if sat not in F.FUTURE_MODE_SATS or not F.is_canonical(f):
            continue
        when = F.acquisition_midpoint(f)
        if when is None:
            continue
        if sat not in newest or when > newest[sat]:
            newest[sat] = when
        if not (opens <= when <= now):
            continue
        by_frame[(sat, str(f.get("path_number")), str(f.get("frame_number")))].append(when)
        by_pass[(sat, str(f.get("path_number")), when.strftime("%Y-%m-%d"))].append(when)

    # ── frame-level ──────────────────────────────────────────────────────────
    frame_dt, frame_miss, skipped = [], 0, 0
    for p in preds:
        predicted = F.parse_iso(p["predicted"])
        cap = newest.get(p["satellite"])
        if cap is None or predicted > cap - timedelta(hours=F.SETTLE_MARGIN_H):
            skipped += 1
            continue
        key = (p["satellite"], str(p["track"]), str(p["frame"]))
        best = None
        for when in by_frame.get(key, []):
            dt = (when - predicted).total_seconds()
            if abs(dt) <= F.MATCH_WINDOW_H * 3600 and (best is None or abs(dt) < abs(best)):
                best = dt
        if best is None:
            frame_miss += 1
        else:
            frame_dt.append(best)

    # ── pass level: collapse both sides to one instant per (sat, track, day) ──
    pred_pass = defaultdict(list)
    for p in preds:
        predicted = F.parse_iso(p["predicted"])
        cap = newest.get(p["satellite"])
        if cap is None or predicted > cap - timedelta(hours=F.SETTLE_MARGIN_H):
            continue
        pred_pass[(p["satellite"], str(p["track"]),
                   predicted.strftime("%Y-%m-%d"))].append(predicted)

    pass_dt, pass_miss, pass_rows = [], 0, []
    for key, times in sorted(pred_pass.items()):
        pt = sorted(times)[len(times) // 2]
        actual = by_pass.get(key)
        if not actual:
            pass_miss += 1
            pass_rows.append((key, pt, None, None))
            continue
        at = sorted(actual)[len(actual) // 2]
        dt = (at - pt).total_seconds()
        pass_dt.append(dt)
        pass_rows.append((key, pt, at, dt))

    unpredicted = sum(1 for k in by_pass if k not in pred_pass)

    # ── report ───────────────────────────────────────────────────────────────
    print(f"window         {opens:%Y-%m-%d} -> {now:%Y-%m-%d}   ({DAYS_BACK} d)")
    print(f"templates      {len(templates)}  (only from acquisitions before the window)")
    print(f"predictions    {len(preds)} frames, {len(pred_pass)} passes"
          f"   [{skipped} frames not yet covered by the archive]")
    print(f"actual passes  {len(by_pass)}   ({unpredicted} of them never predicted)")
    print()
    print("FRAME level — same (satellite, track, frame)")
    print(f"  hit {len(frame_dt)}   miss {frame_miss}"
          f"   rate {100.0*len(frame_dt)/max(1, len(frame_dt)+frame_miss):.0f}%")
    show("timing", frame_dt)
    print()
    print("PASS level — same (satellite, track) on the same day")
    print(f"  hit {len(pass_dt)}   miss {pass_miss}"
          f"   rate {100.0*len(pass_dt)/max(1, len(pass_dt)+pass_miss):.0f}%")
    show("timing", pass_dt)
    print()

    print("PASS level by satellite")
    per = defaultdict(list)
    per_miss = defaultdict(int)
    for (sat, trk, day), pt, at, dt in pass_rows:
        if dt is None:
            per_miss[sat] += 1
        else:
            per[sat].append(dt)
    for sat in sorted(set(list(per) + list(per_miss))):
        hits = per.get(sat, [])
        total = len(hits) + per_miss[sat]
        print(f"  {sat:6s} hit {len(hits):3d}  miss {per_miss[sat]:3d} "
              f" rate {100.0*len(hits)/max(1,total):3.0f}%", end="")
        show("", hits) if False else print(
            f"  median {statistics.median([abs(x) for x in hits]):6.1f}s"
            if hits else "  median      --")
    print()

    print("PASS timing vs how far back it is (TLE is from today, so this is")
    print("also the retrodiction-error curve)")
    print(f"  {'days back':>12}  {'n':>4}  {'median':>9}  {'p90':>9}  {'max':>9}")
    for lo, hi in ((0, 15), (15, 30), (30, 45), (45, 60), (60, 75), (75, 120)):
        sel = [dt for (key, pt, at, dt) in pass_rows
               if dt is not None and lo <= (now - pt).days < hi]
        if sel:
            a = [abs(x) for x in sel]
            print(f"  {lo:4d}-{hi:<4d}    {len(a):4d}  {statistics.median(a):8.1f}s "
                  f" {pctile(a,0.9):8.1f}s  {max(a):8.1f}s")
    print()

    miss_by_track = defaultdict(int)
    for (sat, trk, day), pt, at, dt in pass_rows:
        if dt is None:
            miss_by_track[f"{sat} T{trk}"] += 1
    if miss_by_track:
        print("passes predicted but never acquired")
        for k in sorted(miss_by_track):
            print(f"  {k:14s} {miss_by_track[k]}")


if __name__ == "__main__":
    main()

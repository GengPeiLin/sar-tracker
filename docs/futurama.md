# FUTURAMA

Predicts upcoming Taiwan overpasses and draws them on the existing map, legend,
drawer and acquisition-frequency chart. Off by default; entered by
double-clicking the header logo, and always announced by the badge in the
centre of the header.

Everything below is measured against this repository's own catalog, not
assumed. The measurement scripts are throwaway; the numbers they produced are
reproduced here because `FUTURE_MODE_SATS` in `app.js` carries them as
constants and a reader needs to know where they came from.

## How a prediction is built

**Time comes from SGP4. Geometry comes from the archive.**

1. A daily-refreshed TLE is fetched per satellite from Celestrak
   (`Access-Control-Allow-Origin: *`, so the browser can fetch it directly)
   and propagated with `satellite.js`, loaded from unpkg alongside Leaflet.
2. For every `(satellite, track, direction, frame)` with a real acquisition in
   the last 60 days, the **most recent observed footprint** becomes the
   template. Its centroid latitude is the target; propagating to its
   acquisition instant gives the track's reference ground-track longitude.
   Templates are restricted to the canonical product per mission
   (`statsIsCanonicalProduct()` — SLC for Sentinel-1, RSLC for NISAR).
3. Future crossings of that latitude, in the same direction, within 1.5° of
   that reference longitude, become predicted passes.

**NISAR templates must be FULL coverage.** One overpass ships Full and Partial
versions of the same frame, and a Partial footprint is a clipped slice of the
real one — templating on it would draw the pass as smaller than it will be.
With the Full-only gate each track predicts its complete run: D133 three frames
(76/77/78), A39, A111 and D61 two each. Sentinel-1 carries no coverage field
and is unaffected.

That gate would otherwise cost timing accuracy, because a frame's newest *Full*
observation can be much older than its newest observation (A111 frame 13: 53
days vs 28). So the two jobs are split — **`geom` is the newest Full frame,
`calib` is the newest frame at that same latitude whatever its coverage**. The
reference longitude therefore stays both recent and latitude-matched, and every
prediction still lands on an exact whole multiple of the 12-day repeat (worst
residual 0.00 min across all ten track groups).

Reusing the observed polygon rather than reconstructing one from swath
geometry is what keeps look side, swath width and frame numbering correct
without hardcoding any of them. It also makes the repeat cycle implicit: a
track only yields a pass when the elapsed time is a near-multiple of its
repeat, which is checked in the browser and holds exactly —

```
days after that track's last real acquisition
  S1C A69   24.00  36.00
  S1C A171  12.00  24.00  36.00
  S1C D105  24.00  36.00
  S1D A69   12.00  24.00  36.00  48.00
  S1D A142  24.00  36.00
  NISAR A111  36.00  48.00
  NISAR D133  24.00  36.00
```

SGP4 is told nothing about repeat cycles and rediscovers the exact 12-day
repeat from orbital mechanics alone.

## Measured accuracy

Predicted pass time vs. real acquisition mid-time, 194 acquisitions over 200
days, from a TLE of 2026-08-25.

| Satellite | Drift | +1 d | +7 d | +14 d |
|---|---|---|---|---|
| Sentinel-1D | +0.07 s/day | 8 s | 8 s | 9 s |
| NISAR | +0.76 s/day | 30 s | 34 s | 40 s |
| Sentinel-1C | −3.05 s/day | 25 s | 43 s | 65 s |

These are the `baseErrS` / `driftSPerDay` values in `FUTURE_MODE_SATS`, shown
in the UI as the `±s` beside every predicted time.

**Sentinel-1A is excluded.** Its mission has ended, so it is no longer
manoeuvred and has drifted off the reference orbit — its TLE mean motion
(14.5975 rev/day) already differs from the operational pair (14.5920), and
retrodiction against the catalog drifts **31.8 s/day**, smoothly, wrapping at
half an orbital period. Commercial and on-demand missions are excluded for a
different reason: an overpass says nothing about whether they image.

## Look side, measured

Offset of the footprint centre from the ground track, over well-predicted
passes:

| | Offset | σ | n |
|---|---|---|---|
| Sentinel-1C | +490.0 km (right) | 10.3 km | 19 |
| Sentinel-1D | +490.1 km (right) | 9.2 km | 42 |
| NISAR | −580.0 km (**left**) | 4.8 km | 27 |

NISAR is left-looking, unlike Sentinel-1. Nothing in the code depends on this
— the template carries the geometry — but `getFrameLookDirection()`, which
`CLAUDE.md` describes and `app.js` does not yet implement, must set NISAR to
left and Sentinel-1 to right when it is written.

## Why not repeat-cycle extrapolation

Measured on the same acquisitions, "last pass + N × repeat" had a comparable
median (13–44 s) but a tail reaching **6 days**: one missed acquisition shifts
the whole chain by a cycle. It also needs a fixed period the data contradicts
— NISAR's Taiwan revisit is 6 days across tracks while each individual track
repeats every 12, and track A111 once went 48 days without an acquisition.
SGP4 needs neither assumption.

## Guardrails

Predicted frames live in `futureState.frames` and their own Leaflet layer.
They are deliberately never merged into `state.filteredFrames`, which is the
single source for the frame counts, the download bar, meta4, CSV export and
the Track Statistics table. Keeping them out of that array is what guarantees
a prediction can never be counted as, or downloaded as, an acquisition —
verified in the browser as `0` predicted frames present in `filteredFrames`
while 35 were on the map.

Without the canonical-product gate, NISAR templated off L3 `SME2` products
whose footprint geometry is nothing like RSLC, and each overpass was emitted
once per product type. The gate interacts with the template age limit: a
track's newest *canonical* frame can be much older than its newest frame
overall, so a 30-day limit silently dropped whole tracks — NISAR A39, A111 and
D61, and Sentinel-1D D105, all vanished from the forecast. The limit is 60
days because retrodiction stays accurate to a median 14-20 s that far out for
these three satellites, which moves the ground track well under a tenth of a
degree — far inside the 1.5° gate.

If the TLE fetch fails, the mode does not engage and says so, rather than
falling back to a guess. Past 3 days the TLE is treated as stale and every
predicted time degrades to a date.

## What the mode changes while it is on

- **The date window moves onto the forecast** — start today, end today plus the
  horizon — and moves again whenever the horizon changes. Without this the
  window still ended today and the map mixed predicted passes with whatever the
  archive happened to hold, which read as a live record. The window in force
  when the mode was entered is restored on the way out.
- **The chart extends past today**, its forecast bars hollow and dashed in the
  series hue, with a divider at now.
- **The window stops auto-snapping.** `snapDateWindowToSatellite()` exists to
  rescue an empty map when a satellite has no frames in the current window. In
  FUTURAMA the window points at a span that has not happened yet, so it holds
  no observed frames for *any* satellite by construction — that is the intended
  state, not the problem the snap solves. Left unguarded, picking L-Band (which
  auto-selects NISAR) dragged the window back onto the archive, putting stale
  acquisitions on the map and discarding the chosen horizon. The guard is inside
  the function, so all three call sites are covered; with the mode off, a retired
  mission still opens its full archive exactly as before.
- **Exit is the same gesture as entry**: double-click the logo. The badge
  carries no close control, so the mode has one switch rather than two.
- **The horizon chips are `.fm-chip`, not `.chip`.** `setFilter()` clears `.on`
  from every `.chip` on the page when the band changes, which deselected the
  horizon while the mode kept using it internally.
- **The DATE END field sets how far ahead the forecast runs.** The horizon
  chips are shortcuts that write the window; typing a date by hand is just as
  valid, and both the map and the chart follow it. A chip lights only while the
  window still matches exactly what it writes. Propagation cost is linear in the
  span, so the forecast stops at `FUTURE_MAX_HORIZON_DAYS` (180) and says so
  rather than truncating silently — 180 days is ~400 passes in ~0.7 s.
- **Predicted frames obey the same filters as observed ones**, including the
  "other Taiwan Sentinel-1 tracks" exclusion. A forecast that showed tracks the
  map hides in normal mode would contradict it.
- **Clicking a predicted footprint opens the drawer**, exactly like a real
  frame — hover to preview, click to select, click again to close. The card is
  deliberately lighter: a prediction has no granule, no file list and no source
  history, so it shows only when the pass is, how sure that is, which track and
  frame it belongs to, and which observed granule its footprint came from.
  Selection styling for predicted polygons is a separate pass in
  `updateMapSelectionState()`, because the observed loop resets `dashArray` —
  the one thing that marks a frame as a prediction.
- **Line and colour are both user choices** (`sar_future_dash`,
  `sar_future_color`), because a dash reads very differently on a 300 px
  footprint than on a legend swatch, and because what makes a screen full of
  overlapping forecasts readable depends on what the reader is looking for.
  Five dash patterns, defaulting to `16 10`. Four colour styles: **Track**
  (default — each track's own hue, so a prediction sits in the same colour
  language as the observed frames beneath it), **Band** (the sidebar's own
  band-chip colours, so the two agree), **Direction**, and **Neutral** (one
  grey, letting observed data dominate). `futureFrameStyle()` returns the label
  and the colour together, so the legend can never disagree with the map — it
  regroups with the style (`C-Band 42 / L-Band 22`, `Ascending 37 / Descending
  27`, `Predicted 64`).

  The dash reaches the chart's forecast bars as the `--fm-dash` CSS variable
  rather than a second copy in the SVG builder. The **colour deliberately does
  not**: those bars are a per-satellite series with their own already-tunable
  palette (`sar_sat_colors`), and recolouring them by band or direction would
  contradict the chart's own legend. Verified identical across all four styles.
- **The stats panel gains a forecast CSV export** — `Date / Time, Satellite,
  Track`, one row per predicted **pass** rather than per predicted frame: an
  overpass is templated from several frames along one track that differ only in
  latitude and so land seconds apart. Rows are grouped on a 10-minute key,
  which never merges two real overpasses of the same track.

## Not implemented

The **"Scheduled" tier** from the design — ESA's published Sentinel-1
acquisition plan, which is the only source that answers *will it record* as
opposed to *will it fly over* — is not built. Two blockers:

- `sentinels.copernicus.eu` sends no `Access-Control-Allow-Origin`, so the
  browser cannot fetch the KML.
- The acquisition-plans page injects its current KML links with JavaScript;
  the served HTML carries only one stale 2022 Sentinel-1B link, so scraping it
  server-side is fragile.

Adding it means fetching in `fetch_sar_data.py` on the daily job and committing
a plan file. The visual system already reserves the distinction: scheduled
passes would be a dense dash, predicted ones the sparse dash used today.

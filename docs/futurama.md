# FUTURAMA

An opt-in mode that predicts when each Taiwan track will next be imaged, and
draws those predictions on the existing map, legend, drawer and
acquisition-frequency chart.

Everything measured below was measured against this repository's own catalog,
not assumed. The measurement scripts were throwaway; the numbers they produced
are reproduced here because `FUTURE_MODE_SATS` in `app.js` carries several of
them as constants, and a reader needs to know where those came from and what
would invalidate them.

**Contents** — [Using it](#using-it) · [How a prediction is
built](#how-a-prediction-is-built) · [Why this method](#why-this-method) ·
[Measured accuracy](#measured-accuracy) · [Which satellites](#which-satellites)
· [Guardrails](#guardrails) · [What the mode
changes](#what-the-mode-changes-while-it-is-on) · [Appearance](#appearance) ·
[Traps found on the way](#traps-found-on-the-way) · [90-day
validation](#the-90-day-validation) · [Not implemented](#not-implemented) ·
[Keeping it honest](#keeping-it-honest)

---

## Using it

**Double-click the logo** to enter, and again to leave. The badge in the centre
of the header says `● FUTURAMA` whenever the mode is on; that badge and a
hairline of accent on the header's bottom border are the only things the mode
adds to the page's chrome.

Off is the shipped default and leaves no trace: nothing is fetched, nothing is
drawn, no TLE is loaded, and every count, filter and export behaves exactly as
it does today.

The double-click is a shortcut, not the only door — the logo is also focusable
and responds to Enter/Space, because a double-click cannot be produced by
keyboard or by most assistive input. A visible entry point in the header
controls is still worth adding; see [Not implemented](#not-implemented).

While the mode is on, the sidebar grows a **FUTURAMA** panel holding the
horizon chips, the colour and line pickers, and a one-line statement of where
the orbit data came from.

---

## How a prediction is built

**Time comes from SGP4. Geometry comes from the archive.**

1. A TLE per satellite is fetched from Celestrak (which sends
   `Access-Control-Allow-Origin: *`, so the browser can fetch it directly) and
   propagated with `satellite.js`, loaded from unpkg alongside Leaflet. It is
   cached in `localStorage` for 12 hours.
2. For every `(satellite, track, direction, frame)` with a real acquisition in
   the last 60 days, the **most recent observed footprint** becomes the
   template. Its centroid latitude is the target; propagating to a recent
   acquisition of that same frame gives the track's reference ground-track
   longitude.
3. Future crossings of that latitude, in the same direction, within 1.5° of
   that reference longitude, become predicted passes.

Reusing the observed polygon rather than reconstructing one from swath geometry
is what keeps look side, swath width and frame numbering correct without
hardcoding any of them. It also makes the repeat cycle **implicit**: a track
only yields a pass when the elapsed time is a near-multiple of its repeat.
Checked in the browser, that holds exactly — every prediction lands on a whole
multiple of 12 days after that track's last real acquisition, worst residual
0.00 minutes across all ten track groups:

```
days after that track+frame's last real acquisition
  S1C A69    24.00  36.00              S1D A69    12.00  24.00  36.00  48.00  60.00
  S1C A171   12.00  24.00  36.00       S1D A142   24.00  36.00
  S1C D105   24.00  36.00              S1D D105   36.00  48.00  60.00  72.00
  NISAR A39  36.00  48.00  60.00       NISAR A111 36.00  48.00
  NISAR D61  36.00  48.00  60.00       NISAR D133 24.00  36.00
```

SGP4 is told nothing about repeat cycles and rediscovers them from orbital
mechanics alone. That agreement is the strongest evidence the method works.

### Templates are restricted to one product per mission

`statsIsCanonicalProduct()` — SLC for Sentinel-1, RSLC for NISAR — the same
rule the stats panel already counts by. Without it, NISAR templated off L3
`SME2` products whose footprint geometry is nothing like RSLC, and each
overpass was emitted once per product type.

### NISAR templates must be FULL coverage

One NISAR overpass ships Full and Partial versions of the same frame, and a
Partial footprint is a clipped slice of the real one — templating on it would
draw the pass as smaller than it will be. With the Full-only gate each track
predicts its complete run: D133 three frames (76/77/78), A39, A111 and D61 two
each. Sentinel-1 carries no coverage field and is unaffected.

That gate would otherwise cost timing accuracy, because a frame's newest *Full*
observation can be much older than its newest observation at all (A111 frame
13: 53 days versus 28). So the two jobs are split:

| | picks | why |
|---|---|---|
| `geom` | newest **Full** frame | the polygon to draw |
| `calib` | newest frame at that latitude, any coverage | calibrates the reference longitude |

The reference longitude therefore stays both recent and latitude-matched, and
the exact-multiple check above still passes.

### Performance

The first implementation propagated the orbit once per template per crossing
and took **21 s** for a 7-day horizon. It now propagates once per satellite on
a 300 s coarse scan, fine-samples only brackets that cross the Taiwan latitude
band near Taiwan's longitude, and interpolates every template's crossing out of
those same samples: **122 ms for 30 days**, 724 ms for 180.

---

## Why this method

Two alternatives were measured on the same acquisitions before this one was
chosen.

**Repeat-cycle extrapolation** ("last pass + N × repeat") had a comparable
median — 13–44 s — but a tail reaching **6 days**: one missed acquisition
shifts the whole chain by a cycle. It also needs a fixed period the data
contradicts. NISAR's Taiwan revisit is 6 days *across* tracks while each
individual track repeats every 12, and track A111 once went 48 days without an
acquisition. SGP4 needs neither assumption.

**Reconstructing footprints from swath geometry** was the original design. The
offset of a footprint's centre from the ground track turns out to be very
stable, which is what made the idea look reasonable:

| | offset | σ | n |
|---|---|---|---|
| Sentinel-1C | +490.0 km (right) | 10.3 km | 19 |
| Sentinel-1D | +490.1 km (right) | 9.2 km | 42 |
| NISAR | −580.0 km (**left**) | 4.8 km | 27 |

But the archive already states that geometry exactly, for free, and reusing it
also carries frame numbering and swath width. The table survives as a
measurement rather than a recipe — and as independent confirmation that **NISAR
is left-looking, unlike Sentinel-1**. Nothing in the code depends on that today
(the template carries the geometry), but `getFrameLookDirection()`, which
`CLAUDE.md` describes and `app.js` does not yet implement, must set NISAR left
and Sentinel-1 right when it is written.

---

## Measured accuracy

Predicted pass time versus real acquisition mid-time, 194 acquisitions over 200
days, from a TLE of 2026-08-25.

| Satellite | Drift | +1 d | +7 d | +14 d |
|---|---|---|---|---|
| Sentinel-1D | +0.07 s/day | 8 s | 8 s | 9 s |
| NISAR | +0.76 s/day | 30 s | 34 s | 40 s |
| Sentinel-1C | −3.05 s/day | 25 s | 43 s | 65 s |

These are the `baseErrS` and `driftSPerDay` values in `FUTURE_MODE_SATS`, shown
in the UI as the `±s` beside every predicted time.

Retrodiction stays accurate to a median 14–20 s out to 60 days for these three
satellites, which is why the template window is 60 days: a timing error that
size moves the ground track well under a tenth of a degree, far inside the 1.5°
gate.

---

## Which satellites

| | forecast | why |
|---|---|---|
| Sentinel-1C, Sentinel-1D, NISAR | yes | operational, orbit maintained, open data |
| Sentinel-1A | **no** | mission ended |
| everything else | **no** | commercial or on-demand tasking |

**Sentinel-1A is excluded because its mission has ended.** It is no longer
manoeuvred and has drifted off the reference orbit: its TLE mean motion
(14.5975 rev/day) already differs from the operational pair (14.5920), and
retrodiction against this catalog drifts **31.8 s/day** — smoothly, wrapping at
half an orbital period — against 0.07–3.05 s/day for the satellites above. A
forecast for it would be confidently wrong.

Commercial and on-demand missions are excluded for a different reason
entirely: an overpass tells you nothing about whether they will image.

---

## Guardrails

Predicted frames live in `futureState.frames` and their own Leaflet layer.
They are **never** merged into `state.filteredFrames`, which is the single
source for the frame counts, the download bar, meta4, CSV export and the Track
Statistics table. Keeping them out of that array is what guarantees a
prediction can never be counted as, or downloaded as, an acquisition — verified
in the browser as `0` predicted frames present in `filteredFrames` while 35 sat
on the map.

Beyond that:

- If the TLE fetch fails, the mode **does not engage** and says why, rather
  than falling back to a guess.
- Past 3 days the TLE is treated as stale and every predicted time degrades to
  a date, with the age shown.
- Propagation cost is linear in the span, so the forecast stops at
  `FUTURE_MAX_HORIZON_DAYS` (180) and says so rather than truncating silently.
- Leaving the mode restores the previous state byte for byte.

---

## What the mode changes while it is on

- **The date window moves onto the forecast** — start today, end today plus the
  horizon — and moves again whenever the horizon changes. Without this the
  window still ended today and the map mixed predicted passes with whatever the
  archive happened to hold, which read as a live record. The window in force
  when the mode was entered is restored on the way out.
- **The DATE END field sets how far ahead the forecast runs.** The horizon
  chips are shortcuts that write the window; typing a date by hand is just as
  valid, and both the map and the chart follow it. A chip lights only while the
  window still matches exactly what it writes.
- **The window stops auto-snapping** — see [Traps](#traps-found-on-the-way).
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
- **The chart extends past today**, its forecast bars hollow and dashed in the
  series hue, with a divider at now. Buckets learn which side of now they fall
  on, which is what lets the renderer style predictions without a parallel set
  of counts.
- **The stats panel gains a forecast CSV export** — `Date / Time, Satellite,
  Track`, one row per predicted **pass** rather than per predicted frame: an
  overpass is templated from several frames along one track that differ only in
  latitude and so land seconds apart. Rows are grouped on a 10-minute key,
  which never merges two real overpasses of the same track.

---

## Appearance

Line and colour are both user choices (`sar_future_dash`, `sar_future_color`),
because a dash reads very differently on a 300 px footprint than on a legend
swatch, and because what makes a screen full of overlapping forecasts readable
depends on what the reader is looking for.

Five dash patterns, defaulting to `16 10`. Four colour styles:

| style | colours | legend groups as |
|---|---|---|
| **Track** (default) | each track's own hue | `S1 A69`, `NISAR D133`, … |
| **Band** | the sidebar's band-chip colours | `C-Band`, `L-Band` |
| **Direction** | two | `Ascending`, `Descending` |
| **Neutral** | one grey | `Predicted` |

Track is the default because a prediction then sits in the same colour language
as the observed frames beneath it. `futureFrameStyle()` returns the label and
the colour together, so the legend can never disagree with the map.

The dash reaches the chart's forecast bars as the `--fm-dash` CSS variable
rather than a second copy in the SVG builder. The **colour deliberately does
not**: those bars are a per-satellite series with their own already-tunable
palette (`sar_sat_colors`), and recolouring them by band or direction would
contradict the chart's own legend.

---

## Traps found on the way

Each of these is existing behaviour that is entirely reasonable, meeting a
state it was never written for. They are recorded because they are easy to walk
into again.

**`snapDateWindowToSatellite()` dragged the window back to the archive.** It
exists to rescue an empty map when a satellite has no frames in the current
window. In FUTURAMA the window points at a span that has not happened yet, so
it holds no observed frames for *any* satellite by construction — that is the
intended state, not the problem the snap solves. Left unguarded, picking L-Band
(which auto-selects NISAR) put stale acquisitions back on the map and discarded
the chosen horizon. The guard is inside the function, so all three call sites
are covered.

**`setFilter()` clears `.on` from every `.chip` on the page.** The horizon
chips were `.chip`, so changing band silently deselected the horizon while the
mode kept using it internally. They are `.fm-chip` now.

**`applyI18n()` rebuilds every other piece of dynamic UI.** FUTURAMA's was
missing from that list, so the badge, sidebar panel and map tooltips kept the
old language after a switch.

**`JSON.stringify(id)` inside a double-quoted `onclick` attribute.** The raw
double quotes close the attribute early and the handler never binds — the
colour and dash pickers looked fine and did nothing. `escapeInlineJsArg()` is
the project's helper for exactly this. Only pickers passing strings broke; the
horizon chips pass a number and were unaffected. **This class of bug is
invisible to testing that calls the function directly** — it only shows up when
something actually clicks the DOM.

**A `<details>` element did not collapse here**, keeping its content laid out
at 80 px while closed. Not diagnosed; replaced with a class toggle, which is
deterministic.

---

## The 90-day validation

`forecast_validation.py`, run daily by `.github/workflows/forecast-validation.yml`.

Each run records every overpass the forecast expects into
`data/forecast_log.json`, then takes predictions whose time has passed and
looks for the real acquisition that answers them, rewriting
`docs/forecast-accuracy.md`.

- **hit** — a real acquisition of the same `(satellite, track, frame)` arrived
  within 12 h of the predicted instant; the error is the signed difference
- **miss** — the pass was predicted and nothing was acquired: the satellite
  flew over and did not image

Those are different questions, and only the first is one SGP4 can answer. The
second is why this is a 90-day record rather than a one-off check.

Each pass keeps **both** its first estimate and its latest. Re-predicting a
pass the day before it happens and reporting only that would flatter the
result, when the question is how far ahead the forecast stays useful.

### Why the workflow lives on `main`

GitHub fires `schedule:` triggers only for workflows on the default branch, so
a cron on a feature branch never runs. The workflow file is therefore the one
thing that had to be merged ([PR #39](https://github.com/GengPeiLin/sar-tracker/pull/39));
it checks out `feature/futurama`, borrows the freshest `data/sar_status.js`
from `main` to score against, and commits its two output files back to the
feature branch. It publishes nothing and touches no site file.

---

## Not implemented

**The "Scheduled" tier.** ESA's published Sentinel-1 acquisition plan is the
only source that answers *will it record* as opposed to *will it fly over*.
Two blockers:

- `sentinels.copernicus.eu` sends no `Access-Control-Allow-Origin`, so the
  browser cannot fetch the KML.
- The acquisition-plans page injects its current KML links with JavaScript; the
  served HTML carries only one stale 2022 Sentinel-1B link, so scraping it
  server-side is fragile.

Adding it means fetching in `fetch_sar_data.py` on the daily job and committing
a plan file. The visual system already reserves the distinction: scheduled
passes would be a dense dash, predicted ones the sparse dash used today.

**A visible way in.** The logo double-click has a keyboard fallback but no
discoverable control. A `FUTURAMA` item in the header controls at ≥980 px would
give the gesture a twin without changing what it does.

**A false positive at long lead.** At ~86 days out, track drift can let the
1.5° longitude gate admit a neighbouring track's pass: one case in 205 over a
90-day window (`NISAR A111 frame 13` landing 1.7 s after `NISAR A39 frame 13`).
Tightening the gate would also start rejecting real passes; the validation log
is the right instrument to decide with.

---

## Keeping it honest

`forecast_validation.py` is a **second implementation** of the prediction rule.
If the two drift apart, the log measures a forecast the site does not show.

They were cross-checked over the same 90-day window: **204 of 205 predictions
match, median difference 3.4 ms, worst 4.8 s** (the extra one is the false
positive above). That is close enough to treat the log as representative — but
it is a property that has to be maintained, not one that holds by itself.

Porting the rule to Python surfaced a normalisation `enhanceFrame()` does that
the raw catalog needs: **the same spacecraft is filed as both `S1D` and
`Sentinel-1D`**, and reading `data/sar_status.js` without folding the aliases
dropped every recent SLC — 10 templates instead of 27, with no error.

A change to either implementation must be made to both. Both files say so at
the top; this section is the third place, because that is the failure that
would quietly invalidate everything above.

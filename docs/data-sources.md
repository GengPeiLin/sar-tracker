# Data Sources — every field in the UI

This document traces every label, chip, and value displayed in SAR Tracker
back to its origin: which API supplied the raw value, how it was stored, and
how the JS reads it.

---

## Where the raw data comes from

| Provider | What it supplies | Written by |
|---|---|---|
| **ASF** (Alaska Satellite Facility) | Sentinel-1 granules (with frame numbers); all NISAR granules | `fetch_sar_data.py` → ASF SearchAPI |
| **Copernicus CDSE** | Sentinel-1 granules (geographic query; no frame numbers) | `fetch_sar_data.py` → Copernicus OData |
| **Bhoonidhi** | NISAR S-band granules — **written but disabled** | `fetch_bhoonidhi_nisar_frames()` (no-op unless `BHOONIDHI_ENABLED` is set) |
| **`SATS` array** in `app.js` | Everything that is a fixed property of the satellite design (band, agency, status, descriptions) | Hard-coded; never fetched |
| **Granule filename** | Most of the per-file metadata shown in the granule table | Parsed in `parseGranuleMetadata()` |

Data is committed to `data/sar_status.js` and `data/sar_recent.json` daily;
the browser never talks to ASF or Copernicus directly.

---

## Map overlays (`.map-stats` and `.map-legend`)

### Filtered Frames

`state.filteredFrames.length`. `filteredFrames` is the result of applying
every active UI filter (date window, satellite, band, direction, product type,
track/frame, coverage, bandwidth) to `state.rawFrames`.

### Active Satellites

`new Set(filteredFrames.map(f => f.satellite_id)).size`. Counts distinct
satellite IDs within the current filtered set, not within the whole catalog.

### Query Window

`state.filters.dateStart` and `state.filters.dateEnd`. These are display-zone
calendar dates (UTC+8 by default). They are set by the date controls in the
sidebar and by `snapDateWindowToSatellite()` when switching satellites.

### Latest Visible Tracks

Computed from `filteredFrames`. Frames are grouped by track key; for each
group the most recent `frame.date` (UTC ISO string from the provider) is
selected and rendered with `displayDateKey()` in the active display timezone.
The colored dot uses the same color as the map polygon for that track.

### Visible Data (legend)

Groups `filteredFrames` by `getFrameVisualInfo(frame).label` (which produces
strings like `"S1 A69"` or `"NISAR D133"`). The color per row comes from
`PLATFORM_COLORS` (Sentinel-1) or `NISAR_TRACK_COLORS` (NISAR). Count is the
number of frames in that group.

---

## Drawer — header bar

```
Track 69 · Frame 114
Sentinel-1A · A69 · ASF + Copernicus
```

| Text | Source |
|---|---|
| **Track N** | `getFramePathNumber(frame)` → `normalizeFrameNumber(frame.path_number)`. ASF supplies `pathNumber`; Copernicus supplies `relativeOrbitNumber`. |
| **Frame M** | `lookupAsfFrameNumber(frame)` first (spatial tile lookup against the hardcoded ASF frame-centroid table `ASF_FRAME_CENTROIDS`); falls back to `frame.frame_number_norm` (ASF `frameNumber`). Copernicus records carry no frame number and show "No ASF metadata". |
| **Satellite name** | `frame.satellite_name` ← `sat.name` from the matching `SATS` entry ← matched by `satMatchesFrame()` against `frame.platform` / `frame.granule`. |
| **Track label** | `frame.track_label` ← `getTrackLabelForFrame()`: returns `A69`, `D105`, `NISAR`, `OTHER_S1`, etc. based on direction + path number. |
| **Source string** | Derived from which URLs are populated: `frame.asf_url` → "ASF", `frame.copernicus_url` / `frame.download_url` → "Copernicus". Combinations produce "ASF + Copernicus", "Copernicus only", "ASF only". |

---

## Drawer — summary grid (top card)

| Label | Value source |
|---|---|
| **Track** | Same as header: `getFramePathNumber(primary)` |
| **Frame** | Same as header: spatial lookup then `frame.frame_number_norm` |
| **Direction** | `primary.direction_norm` ← `normalizeDirection(frame.direction)` ← ASF `flightDirection` or Copernicus `Attributes.OData.flightDirection`. Normalised to `ASCENDING` / `DESCENDING`. |
| **Mode** (Sentinel-1) | `frame.mode` ← ASF `beamModeType` (e.g. `IW`, `EW`, `SM`) or Copernicus product name token. |
| **Mode / Bandwidth** (NISAR) | `frame.range_bandwidth` ← ASF `rangeBandwidth` (e.g. `"20,5"` MHz). Falls back to the `MODE` token in the granule name (`4005` → `40+5 MHz`). Formatted by `formatNisarBandwidth()`. |
| **Coverage** (NISAR) | `frame.frame_coverage` ← ASF `frameCoverage` (`F` / `P`). Rendered as "Full" / "Partial". |
| **Polarization** (Sentinel-1) | `frame.polarization` ← ASF `polarization` or Copernicus `polarisationChannels`. |
| **Polarization** (NISAR) | `frame.main_polarization` + `frame.side_polarization` ← ASF `mainBandPolarization` / `sideBandPolarization`. Formatted as `HH+HV / HH+HV`. |
| **Joint L+S** (NISAR) | `frame.joint_observation` ← ASF `jointObservation` (boolean). `true` → "Yes"; `false` → "L-band only". Indicates whether both L-SAR and S-SAR were active in this pass. |
| **Acquisitions** | Count of distinct acquisition dates in `historyFrames` (all catalog frames sharing the same track/frame). Not the same as file count. |
| **Files** | Number of merged granule entries shown in the drawer for the selected date. Multiple sources (ASF + Copernicus) for the same granule are merged into one entry. |
| **Source** | Same logic as the header source string, applied to the primary entry. |
| **Selected Date** | `getFrameAcquisitionInfo(primary).label` → `formatDisplayTime(frame.date)` converted to the active display timezone (UTC+8 by default). Raw value is the UTC ISO string from the provider (`startTime`). |

---

## Drawer — per-granule card

### Card title

`frame.granule` — the scene / product name exactly as the provider returned
it (`sceneName` from ASF; product filename minus `.SAFE` from Copernicus).

### Release badge (NISAR only)

`getNisarRelease(frame)` reads `frame.collection` (ASF `collectionName`, e.g.
`NISAR_L1_RSLC_BETA_V1`) and `frame.granule` for the keywords `BETA`,
`PROVISIONAL`, `URGENT`. Displayed as a coloured sticker next to the granule
name. Beta = uncalibrated; Provisional = calibrated release.

### Product / Coverage / Bandwidth / Size line

| Part | Source |
|---|---|
| Product type | `frame.product_type_norm` ← `normalizeProductType(frame)` ← ASF `processingLevel` or inferred from the granule name token (`SLC`, `GRD`, `OCN`, `RSLC`, `GCOV`, …). |
| Coverage (NISAR) | `getNisarCoverage(frame)` → `frame.frame_coverage` (ASF `frameCoverage`). |
| Bandwidth (NISAR) | `getNisarBandwidth(frame)` → parsed from `frame.range_bandwidth` or granule name. |
| File size | `frame.file_size_mb` ← for Sentinel-1: ASF `sizeMB`; for NISAR: largest HDF5 entry in ASF's `bytes` dict (ASF returns `sizeMB = null` for NISAR). Copernicus records carry no size. |

### Timestamp (top-right of card)

`formatDisplayTime(frame.date)` in the active display timezone. `frame.date`
is the UTC start time string from the provider (`startTime` from ASF;
`ContentDate.Start` from Copernicus).

### Submeta line

`Source / path N / frame M` — same source string, same path and frame values
as described above.

### Granule name table (expandable rows)

All rows here are **decoded from the granule filename itself**, not from API
metadata fields. `parseGranuleMetadata(frame.granule)` splits the name on `_`
and maps each token against fixed lookup tables.

**Sentinel-1** (`S1A_IW_SLC__...`):

| Row | Token position | Example |
|---|---|---|
| Mission | parts[0] | `S1A` |
| Beam | parts[1] | `IW` |
| Product | parts[2] | `SLC` |
| Level/Class/Pol | parts[3] | `1SDV` |
| Start | parts[4] | `20260801T054321` |
| Stop | parts[5] | `20260801T054348` |
| Absolute Orbit | parts[6] | `060234` |
| Data-take | parts[7] | `0ABC12` |
| Unique ID | parts[8] | `3F9A` |

Note: Absolute Orbit here comes from the granule name (position 6), not from
`frame.orbit`. ASF returns absolute orbit in `frame.orbit`, but Copernicus
returns relative orbit in the same field — the granule name is unambiguous.

**NISAR** (`NISAR_IL_PT_PROD_CYL_REL_P_FRM_...`):

| Row | Token | Notes |
|---|---|---|
| Mission | parts[0] | `NISAR` |
| Beam Mode | parts[1][0] → `NISAR_INSTRUMENT` | `L` → `L-SAR`, `S` → `S-SAR` |
| Level | parts[1][1:] | `1` = Level 1 |
| Processing Type | parts[2] → `NISAR_PROCESSING_TYPE` | `PR` → Production |
| Product | parts[3] | `RSLC`, `GCOV`, `GUNW`, … |
| Cycle | parts[4] | Global cycle number |
| Track | parts[5] | Relative orbit (= path number) |
| Direction | parts[6] → `NISAR_DIRECTION` | `A` → Ascending |
| Frame | parts[7] | |
| Range Bandwidth | parts[8] → `formatNisarBandwidth()` | `2005` → `20+5 MHz` |
| Polarization | parts[9] → `formatNisarPolarization()` | `DHDH` → `HH,HV / HH,HV` |
| Start / Stop | parts[10]/[11] (standard) or ref/sec pairs (GUNW) | UTC datetime |
| CRID | next token | Composite Release ID |
| Accuracy | `NISAR_ACCURACY` | `P` → Precise |
| Coverage | `NISAR_COVERAGE` | `F` → Full, `P` → Partial |
| Location | `NISAR_LOCATION` | geographic area code |
| Counter | last token | disambiguation counter |

GUNW interferograms carry 20 fields (vs 18 for standard products). The parser
detects `parts.length >= 20` and inserts a Secondary Cycle row and a second
date pair (Ref Start/Stop, Sec Start/Stop).

---

## Band chips (header: C / L / S / X)

`state.band` is set to `'C'`, `'L'`, `'S'`, `'X'`, or `'ALL'`.

Each frame's `frame.satellite_band` is set by `enhanceFrame()` from
`sat.band` in the matching `SATS` entry. For NISAR all current frames are
`'L'` (L-SAR from ASF). The `'S'` tab would show S-SAR frames once
Bhoonidhi is enabled and `frame.sensor === 'S-SAR'` frames are ingested; the
infrastructure is ready but the catalog has no S-band data yet.

---

## Satellite chips (sidebar)

Built from `getSatelliteCatalogIndex()`, which scans `state.rawFrames` (the
entire loaded catalog, not just the current date window). Each option shows:
- in-window count when the satellite has frames in the current date window
- coverage years otherwise (e.g. "Oct 2016 – Dec 2021" for S1B)

Selecting a satellite calls `snapDateWindowToSatellite()`, which slides the
date window onto the satellite's data if the current window is empty for it:
retired satellites open their full operational span; active ones keep the
window length and shift it to the newest acquisition.

---

## Direction, Product type, Track, Frame, Coverage, Bandwidth chips (sidebar)

All are post-fetch filters applied to `state.rawFrames` in
`frameMatchesAdvancedFilters()`. Values are read directly from enriched frame
fields (`frame.direction_norm`, `frame.product_type_norm`,
`frame.path_number_norm`, `frame.frame_number_norm`, `frame.frame_coverage`,
`getNisarBandwidth(frame)`).

Sentinel-1 and NISAR product types are kept in separate Sets
(`filters.formats` vs `filters.nisarFormats`) because they share no product
type names and a single combined set would cross-filter missions.

---

## Dataset stamp (header)

`data.version` from `sar_status.js` — a compact UTC timestamp written by
`fetch_sar_data.py` at the end of each daily run. `parseDatasetVersion()`
turns it back into a `Date`; `renderDatasetStamp()` prints it in the active
display timezone (`database: 2026-08-05 06:14 UTC+8`).

The mobile freshness badge ("Today" / "Yesterday" / date) compares the stamp's
calendar day in the display timezone to the current day in the same timezone.

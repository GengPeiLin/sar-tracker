# SAR Tracker

A static GitHub Pages dashboard for monitoring Sentinel-1, NISAR, and other SAR satellite acquisitions over Taiwan. Data is fetched from ASF DAAC and Copernicus CDSE, refreshed several times a day by a GitHub Actions workflow, and served as a Leaflet map with filtering and download support.

## Repository Structure

```
sar-tracker/
├── .github/
│   └── workflows/
│       ├── update.yml        # scheduled data refresh (5×/day) + Pages deploy
│       └── deploy-pages.yml  # manual-only Pages deploy
├── data/
│   ├── sar_status.js         # full-history frame catalog (JS wrapper, see below)
│   └── sar_recent.json       # last 14 days, loaded first for a fast start
├── app.js                    # all frontend JavaScript
├── styles.css                # all frontend CSS
├── index.html                # HTML structure only
├── config.js                 # editable defaults (map, theme, filters, colours)
├── fetch_sar_data.py         # data pipeline script
└── README.md
```

`data/catalog/` (per-mission internal cache) is gitignored, and cached between workflow runs so updates stay incremental. The `.meta4` download manifests are generated on every run but are **not** committed — `app.js` builds them in the browser from the frames already loaded, so the download buttons need no server-side file.

## How It Works

### Frontend

The frontend is split across three files:

- `index.html` — HTML structure and external resource links
- `styles.css` — all CSS including four switchable themes
- `app.js` — satellite database, state, filters, map, drawer, export logic

It loads `data/sar_status.js` on startup and renders an interactive Leaflet map with a satellite list sidebar, filter panel, detail drawer, and export bar.

### Data Pipeline

`fetch_sar_data.py` runs on GitHub Actions and writes:

- `data/sar_status.js` — merged frame metadata from both sources (JSON in a `window.__SAR_DATA` wrapper, so one file serves both `file://` and the web)
- `data/sar_recent.json` — the last 14 days, fetched first so the map draws before the full history arrives
- `data/meta4/<source>_<mission>.meta4` — metalink manifests, written locally but not committed

It queries the ASF Search API and Copernicus OData API for Sentinel-1 and NISAR frames intersecting Taiwan, merges and deduplicates results, then applies a centroid latitude filter `[21.5°N, 26.85°N]` to drop frames that merely clip the search bounding box edges (e.g. frames centered north of Matsu or south of Taiwan's southern tip). Incremental updates use a configurable overlap window to avoid missing frames near the last-fetch boundary.

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `DAYS_BACK` | 3 | Days to query from today |
| `INCREMENTAL_OVERLAP_DAYS` | 2 | Days to recheck around last fetch |
| `FORCE_FULL_REBUILD` | false | Rebuild complete catalog from scratch |
| `MAX_RESULTS` | 1000 | Max results per API query |

### Deployment

`update.yml` runs five times a day — 00:00, 02:00, 04:00, 09:00 and 15:00 UTC, i.e. 08:00, 10:00, 12:00, 17:00 and 23:00 Taiwan time (UTC+8, no DST) — updates the data files, commits them to `main`, and deploys to GitHub Pages. A manual trigger is also available via `workflow_dispatch`.

`deploy-pages.yml` is manual-only and can be used to redeploy without a data update.

## Local Usage

Run the data pipeline:

```bash
python fetch_sar_data.py
```

With options:

```bash
DAYS_BACK=14 python fetch_sar_data.py
FORCE_FULL_REBUILD=true python fetch_sar_data.py
```

For frontend changes, edit `app.js` or `styles.css` and open `index.html` in a browser. No build step required. To deploy, commit and push to `main` — the next scheduled run will redeploy, or trigger `deploy-pages.yml` manually.

## Versioning

The frontend carries no version of its own — it is served straight from `main`, so the deployed commit *is* the version. Only the data is stamped:

- `data.version` in `sar_status.js` / `sar_recent.json` is the pipeline run timestamp, `YYYYMMDDTHHmmss` in UTC (`__version__` in `fetch_sar_data.py`, set at process start)
- `parseDatasetVersion()` turns it back into an instant and `renderDatasetStamp()` prints it in the selected display zone — `database: 2026-07-27 13:41 UTC+8` — while `updateMobDbBadge()` judges the mobile freshness badge (fresh / recent / stale) on that zone's calendar day
- Nothing to bump by hand for a frontend change — just commit and push

An earlier `APP_VERSION` constant used to show a frontend build timestamp in the header; it was removed in `be063d3` when the logo was given over to title-font cycling, and has no replacement.

## Satellite Coverage

The sidebar shows SAR satellites grouped by status:

- **Featured open missions** — active satellites with open data: Sentinel-1A, Sentinel-1C, Sentinel-1D, NISAR
- **Other SAR missions** — commercial, restricted-access, and retired satellites (collapsed by default)

Retired satellites (including Sentinel-1B, retired 2022-08-23) appear in "Other SAR missions" when historical data is in view, never in the featured group.

The **Satellite** dropdown is built from the whole catalog rather than the current date window, so a retired mission is always selectable. Selecting one whose data lies outside the window moves the window onto that mission's own data — its full operational span for a retired satellite, or the same-length window ending on its newest acquisition for an active one. The date shortcut buttons anchor there too, so "This Week" / "1 Year" mean the last week / year of the selected mission's life.

## Frame Number Display

The detail drawer shows ASF Vertex frame numbers for all Sentinel-1 frames over the four Taiwan priority tracks (T69, T105, T142, T171), including Copernicus-only frames that carry no `frame_number` in their metadata. For those frames, `app.js` derives the frame number by computing the footprint centroid latitude and looking it up against `S1_FRAME_BOUNDS` — a per-track table of centroid-latitude midpoints derived empirically from 7,458 S1D frames that have real ASF frame numbers.

## Known Limitations

- Some frames are Copernicus-only with no matched ASF record. The merge logic is conservative — it will not link an ASF record from a different acquisition date to fill a missing field.
- Frame numbers for non-priority tracks (other than T69/T105/T142/T171) fall back to the placeholder if ASF metadata is absent.
- No automated browser tests. UI changes should be validated manually against the QA checklist below.

## QA Checklist

Before shipping a UI change:

- [ ] Left filter panel fits on common desktop widths without unnecessary scroll
- [ ] Map auto-focuses correctly when filters change
- [ ] Legend reflects the current visible dataset
- [ ] Detail drawer wraps long titles and stays readable
- [ ] Detail drawer shows a real ASF frame number (not a placeholder) for Copernicus S1 frames on T69/T105/T142/T171
- [ ] A known Copernicus-only frame does not falsely show an ASF link
- [ ] Export panel opens, closes, and disables correctly
- [ ] Sentinel-1B does not appear in "Featured open missions"
- [ ] Acquisition Frequency Chart updates after full dataset loads (Phase 2)

## Citing This Work

If this dashboard supported a paper, report, or presentation, please cite both the tool and the data it merely re-presents. **SAR Tracker holds no imagery of its own** — it indexes and links what ASF DAAC and Copernicus CDSE publish, so the mission and archive citations below are the ones that carry scientific weight.

### The tool

> GengPeiLin (2026). *SAR Tracker: a dashboard of Taiwan SAR satellite acquisitions.* https://github.com/GengPeiLin/sar-tracker

```bibtex
@software{sar_tracker,
  author = {GengPeiLin},
  title  = {SAR Tracker: a dashboard of Taiwan SAR satellite acquisitions},
  year   = {2026},
  url    = {https://github.com/GengPeiLin/sar-tracker},
  note   = {Dataset stamp: YYYYMMDDTHHmmss; accessed YYYY-MM-DD}
}
```

**Record the dataset stamp, not a version number.** The frontend has no version of its own (see [Versioning](#versioning)), and the catalog is rewritten five times a day, so "SAR Tracker, accessed March 2026" does not identify what you actually saw. The header shows `database: 2026-07-27 13:41 UTC+8` — that timestamp is `data.version`, and it pins the exact catalog. A commit SHA from `main` works equally well and is the more precise choice if you also relied on the filtering or statistics behaviour.

### The data

Frames indexed here come from two archives, each with its own attribution requirement:

| Source | Attribution |
|---|---|
| **Sentinel-1** (ESA / Copernicus) | "Contains modified Copernicus Sentinel data [years]." Cite the year range you used — this catalog spans 2014 to present. |
| **NISAR** (NASA / ISRO) | Cite the NASA-ISRO SAR mission and the granules' release tier. Distributed by ASF DAAC. |
| **ASF DAAC** (distributor for both) | Cite the Alaska Satellite Facility DAAC as the distributor of the granules you downloaded. |

Individual granules carry their own DOIs, issued by the archive rather than by this project. Take the DOI from ASF Vertex or the Copernicus Data Space entry for the specific product — the detail drawer links to both — rather than citing a DOI for the dashboard, which has none.

**A caution specific to NISAR.** Products are published in release tiers, shown in the drawer as a badge beside the granule name. **Beta products are uncalibrated** and were released for familiarisation rather than for science; provisional products supersede them. If your work rests on beta granules, say so explicitly and state the tier — the distinction is not recoverable from the granule name alone, and conclusions drawn from uncalibrated radiometry may not survive reprocessing.

### Scope, so nobody over-claims

This catalog is filtered to Taiwan and is not a complete record of either mission. Sentinel-1 coverage comes from four priority tracks plus whatever a geographic Copernicus query returns; frames are additionally centroid-filtered to `[21.5°N, 26.85°N]`. Absence of a frame here is **not** evidence that no acquisition took place — check the archives directly before making that claim. The [Known Limitations](#known-limitations) section lists where the merge is deliberately conservative.

## License

MIT — the code only. The satellite data carries the terms of its originating archive; see the attribution table above.

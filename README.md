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
│   ├── sar_status.js         # merged frame catalog (frontend reads this)
│   ├── asf_taiwan.meta4      # metalink download manifest (ASF)
│   └── copernicus_taiwan.meta4  # metalink download manifest (Copernicus)
├── app.js                    # all frontend JavaScript
├── styles.css                # all frontend CSS
├── index.html                # HTML structure only (~192 lines)
├── fetch_sar_data.py         # data pipeline script
└── README.md
```

`data/catalog/` (per-mission internal cache) is gitignored, and cached between workflow runs so updates stay incremental.

## How It Works

### Frontend

The frontend is split across three files:

- `index.html` — HTML structure and external resource links
- `styles.css` — all CSS including four switchable themes
- `app.js` — satellite database, state, filters, map, drawer, export logic

It loads `data/sar_status.js` on startup and renders an interactive Leaflet map with a satellite list sidebar, filter panel, detail drawer, and export bar.

### Data Pipeline

`fetch_sar_data.py` (v0.7.1) runs on GitHub Actions and writes:

- `data/sar_status.js` — merged frame metadata from both sources (JSON in a `window.__SAR_DATA` wrapper, so one file serves both `file://` and the web)
- `data/asf_taiwan.meta4` — ASF metalink manifest
- `data/copernicus_taiwan.meta4` — Copernicus metalink manifest

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

- `APP_VERSION` in `app.js` is the frontend version, shown in the page header
- `data.version` in `sar_status.js` is the data pipeline version
- They are independent — bump `APP_VERSION` for any user-visible frontend change

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

## License

MIT

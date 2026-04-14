# SAR Tracker

A static GitHub Pages dashboard for monitoring Sentinel-1, NISAR, and other SAR satellite acquisitions over Taiwan. Data is fetched from ASF DAAC and Copernicus CDSE, updated daily by a GitHub Actions workflow, and served as a Leaflet map with filtering and download support.

## Repository Structure

```
sar-tracker/
├── .github/
│   └── workflows/
│       ├── update.yml        # daily data refresh + Pages deploy
│       └── deploy-pages.yml  # manual-only Pages deploy
├── data/
│   ├── sar_status.json       # merged frame catalog (frontend reads this)
│   ├── asf_taiwan.meta4      # metalink download manifest (ASF)
│   └── copernicus_taiwan.meta4  # metalink download manifest (Copernicus)
├── app.js                    # all frontend JavaScript
├── styles.css                # all frontend CSS
├── index.html                # HTML structure only (~192 lines)
├── fetch_sar_data.py         # data pipeline script
└── README.md
```

`data/catalog_db.json` (internal cache) is gitignored.

## How It Works

### Frontend

The frontend is split across three files:

- `index.html` — HTML structure and external resource links
- `styles.css` — all CSS including four switchable themes
- `app.js` — satellite database, state, filters, map, drawer, export logic

It loads `data/sar_status.json` on startup and renders an interactive Leaflet map with a satellite list sidebar, filter panel, detail drawer, and export bar.

### Data Pipeline

`fetch_sar_data.py` (v0.7.1) runs on GitHub Actions and writes:

- `data/sar_status.json` — merged frame metadata from both sources
- `data/asf_taiwan.meta4` — ASF metalink manifest
- `data/copernicus_taiwan.meta4` — Copernicus metalink manifest

It queries the ASF Search API and Copernicus OData API for Sentinel-1 and NISAR frames intersecting Taiwan, then merges and deduplicates results. Incremental updates use a configurable overlap window to avoid missing frames near the last-fetch boundary.

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `DAYS_BACK` | 3 | Days to query from today |
| `INCREMENTAL_OVERLAP_DAYS` | 2 | Days to recheck around last fetch |
| `FORCE_FULL_REBUILD` | false | Rebuild complete catalog from scratch |
| `MAX_RESULTS` | 1000 | Max results per API query |

### Deployment

`update.yml` runs daily at 02:00 UTC (10:00 Taiwan time), updates the data files, commits them to `main`, and deploys to GitHub Pages. A manual trigger is also available via `workflow_dispatch`.

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
- `data.version` in `sar_status.json` is the data pipeline version
- They are independent — bump `APP_VERSION` for any user-visible frontend change

## Satellite Coverage

The sidebar shows SAR satellites grouped by status:

- **Featured open missions** — active satellites with open data: Sentinel-1A, Sentinel-1C, Sentinel-1D, NISAR
- **Other SAR missions** — commercial, restricted-access, and retired satellites (collapsed by default)

Retired satellites (including Sentinel-1B, retired 2022-08-23) appear in "Other SAR missions" when historical data is in view, never in the featured group.

## Known Limitations

- Some frames are Copernicus-only with no matched ASF record. The merge logic is conservative — it will not link an ASF record from a different acquisition date to fill a missing field.
- No automated browser tests. UI changes should be validated manually against the QA checklist below.

## QA Checklist

Before shipping a UI change:

- [ ] Left filter panel fits on common desktop widths without unnecessary scroll
- [ ] Map auto-focuses correctly when filters change
- [ ] Legend reflects the current visible dataset
- [ ] Detail drawer wraps long titles and stays readable
- [ ] A known Copernicus-only frame does not falsely show an ASF link
- [ ] Export panel opens, closes, and disables correctly
- [ ] Sentinel-1B does not appear in "Featured open missions"

## License

MIT

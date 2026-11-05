# NISAR S-band (ISRO)

NISAR carries two radars. Everything the dashboard has shown so far is **L-SAR**
(NASA/JPL). **S-SAR** (ISRO) is a separate instrument with its own products,
track/frame numbering and bandwidths.

ISRO released S-band products on **24 July 2026**
([announcement](https://www.isro.gov.in/NISARS_Band_SAR_Data_Products_Release.html)):
all products acquired from Cycle 25 (started 8 Jul 2026), baseline v1.4.0,
CRID `P00500`. Standard (RSLC / GSLC / GCOV), interferometric (RIFG / RUNW /
GUNW) and pixel-offset (ROFF / GOFF) products.

## Why no S-band data is in the catalog yet

| | L-SAR | S-SAR |
|---|---|---|
| Distributor | ASF DAAC | Bhoonidhi (NRSC) |
| Access | open, no account | Bearer token, registered account |
| Reachable from Taiwan | yes | **no** — connections time out |

ASF serves L-band only. Probing ASF for the Taiwan tracks (A39 F13-14,
D133 F76-78) over Jun–Aug 2026 returns 97 granules, every one `sensor: L-SAR`.
`bhoonidhi-api.nrsc.gov.in` does not answer from Taiwan at all, and publishes no
anonymous search endpoint regardless.

So the pipeline stays L-band until a token exists. Nothing about the L-band path
changed.

## Status: disabled

The Bhoonidhi source is written and unit-tested but **switched off**
(`BHOONIDHI_ENABLED` unset), because the API is not ready to integrate
against — unreachable from Taiwan, with unverified collection ids and property
names. A disabled run logs `Bhoonidhi: disabled` and writes exactly the files
it wrote before the S-band work: Bhoonidhi is dropped from the NISAR mission's
`sources`, so no empty `bhoonidhi_nisar.meta4` appears. The switch is checked
before the token, so a stray token cannot activate it.

Everything else in this document is already live: band detection, the Band chip
row, the band-split Taiwan gate and the new product types all work on the
L-band catalog today.

## Turning S-band on

1. Register at <https://bhoonidhi.nrsc.gov.in> and request API access
   (`bhoonidhi@nrsc.gov.in`).
2. Obtain an `access_token` — `POST /auth/token` with `userId` / `password` /
   `grant_type=password`. Do this yourself; the fetch script never sees a
   credential, only a token.
3. Store it as the repository secret **`BHOONIDHI_TOKEN`**. Both
   `.github/workflows/update.yml` and the probe workflow read it.
4. Set the repository variable **`BHOONIDHI_ENABLED`** to `1`. This is the
   activation switch; no code change is needed. Locally:
   `BHOONIDHI_ENABLED=1 BHOONIDHI_TOKEN=… python fetch_sar_data.py`.
5. Confirm the collection ids. `BHOONIDHI_COLLECTIONS` defaults to
   `nisar_s_rslc,nisar_s_gslc,nisar_s_gcov,nisar_s_gunw`; the real ids are
   listed by `GET /data/collections`, which could not be checked from here.
   `BHOONIDHI_API` overrides the base URL.

Enabled but without the secret, the source logs `no BHOONIDHI_TOKEN set,
skipping NISAR S-band` and the run continues on ASF alone.

**Token expiry is unhandled.** `/auth/token` returns an `expires_in`; this
integration takes a static token and has no refresh flow, so a scheduled run
will start logging failures once the token lapses. Failures are non-fatal — the
S-band source is wrapped so it can never cost the L-band update.

## Checking access from outside Taiwan

`.github/workflows/nisar-sband-probe.yml` (manual, `workflow_dispatch`) runs
`scripts/probe_nisar_sband.py` on a GitHub runner and prints:

- whether ASF has started serving any `S-SAR` granules;
- whether Bhoonidhi's `/data/collections` and `POST /data/search` answer,
  anonymously and (if the secret is set) authenticated.

It is read-only: no downloads, no commits.

## How S-band flows through the code

- **Band detection** — `nisar_band()` (Python) / `getNisarBandCode()` (JS) read
  `sensor` (`L-SAR` / `S-SAR`), falling back to the granule's instrument field
  (`NISAR_S2_...` → `S`).
- **Taiwan gate** — `is_taiwan_nisar_frame()` keeps the `TAIWAN_NISAR_FRAME_SPECS`
  allowlist for L-band, but S-band numbers its frames differently (ISRO's sample
  granule is track 026 / frame 125), so S-band is gated on a footprint-centroid
  box instead.
- **Band as a frame property** — NISAR's SATS entry declares `bands: ['L','S']`
  and `enhanceFrame` sets `satellite_band` per frame, so the header's S-Band
  chip finds NISAR's S-SAR frames while L-SAR stays under L-Band.
- **Filtering** — a Band chip row in the NISAR sidebar section, which hides
  itself while only one band is present.
- **Products** — `RIFG` / `RUNW` / `ROFF` / `GOFF` were added to the known
  product types. Product-type chips stay an explicit default (RSLC only), so
  the new types render unselected; Band, Coverage and Bandwidth seed to
  everything, and values appearing for the first time are auto-selected so
  newly published data is never hidden by a group nobody touched.

## Known gap

Stats acquisition counts use one canonical product per mission
(`STATS_CANONICAL_PRODUCT`, `RSLC` for NISAR). Once S-band lands, one overpass
yields an L-band *and* an S-band RSLC, so a NISAR pass will be counted twice
unless the band chips or the header band filter narrow it. Worth revisiting when
real S-band data exists to test against.

// ═══════════════════════════════════════════════════════════════════════════
// SAR TRACKER — USER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Edit the values below, save, then hard-refresh the browser (Ctrl+Shift+R).
// No build step, no install — the page reads this file directly.
//
// SAFE TO EDIT. Every setting is optional: delete a line (or the whole file)
// and the app falls back to its built-in default. A bad value is ignored with
// a warning in the browser console (F12) rather than breaking the page, so you
// cannot lock yourself out by mistyping something here.
//
// This is a .js file rather than .json on purpose: the dashboard is designed to
// work when opened directly from disk (file://), where the browser blocks
// fetching local .json files. Same reason data/sar_status.js is a .js file.
//
// Syntax rules, if you have not edited JavaScript before:
//   - text values go in 'single quotes'      - numbers do not
//   - every line ends with a comma           - // starts a comment
//   - true / false are written bare, no quotes
//
// SETTINGS THIS FILE DOES NOT COVER:
//   - Data fetching (which tracks/frames/dates are downloaded) lives in
//     fetch_sar_data.py and is set with environment variables. See SETTINGS.txt.
//   - Responsive layout breakpoints live in styles.css. See SETTINGS.txt.
//
// ═══════════════════════════════════════════════════════════════════════════

window.SAR_CONFIG = {

  // ── MAP ──────────────────────────────────────────────────────────────────
  map: {
    center: [23.5, 121],   // opening view [latitude, longitude]
    zoom: 6,               // opening zoom level (higher = closer in)
    basemapMaxZoom: 19,    // how far the background map can be zoomed in

    // Used when the map auto-frames the currently filtered frames.
    frameFocusMaxZoom: 8,  // never zoom in closer than this when auto-framing
    frameFocusPadding: 0.2 // breathing room around the framed area
  },

  // ── APPEARANCE ───────────────────────────────────────────────────────────
  ui: {
    // choices: 'soft-slate' | 'night-ops' | 'paper-radar' | 'field-survey'
    theme: 'soft-slate',

    // choices: '2' | '4' | '6' | '8'   (interface text size step)
    fontSize: '4',

    // choices: 'en' | 'zh-TW'
    // Only the starting language. Once a visitor uses the language switch,
    // their choice is remembered in the browser and wins over this.
    language: 'en',

    // How a selected frame is marked on the map.
    // choices: 'ring' | 'dash' | 'color' | 'gold'
    highlightStyle: 'ring'
  },

  // ── TIME ZONE ────────────────────────────────────────────────────────────
  // Acquisition times are always STORED in UTC. This only controls how they
  // are displayed. A visitor's own choice from the header selector wins.
  timezone: {
    default: 'Asia/Taipei',

    // The options offered in the Time Zone dropdown, in order.
    // '__local__' means "whatever zone this visitor's computer is set to".
    // Any IANA zone name works, e.g. 'Australia/Sydney'.
    choices: [
      'Asia/Taipei',
      'UTC',
      '__local__',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Asia/Kolkata',
      'Europe/London',
      'Europe/Berlin',
      'America/New_York',
      'America/Los_Angeles'
    ]
  },

  // ── STARTING FILTERS ─────────────────────────────────────────────────────
  filters: {
    satellite: 'ALL',   // 'ALL', or a specific id such as 'S1A' / 'NISAR'
    direction: 'ALL',   // choices: 'ALL' | 'ASCENDING' | 'DESCENDING'

    // How many days the date range covers when the page opens.
    // (The This Week / Month / 6 Months / 1 Year buttons are separate and
    // keep their own fixed meanings.)
    dateWindowDays: 7,

    // Which product-type chips start ticked, per satellite. A satellite not
    // listed here uses 'default'. Every satellite needs at least one entry
    // it can match, or its frames start hidden.
    productTypes: {
      default: ['SLC', 'RSLC'],
      ALL:     ['SLC', 'RSLC'],
      NISAR:   ['GSLC', 'RSLC'],
      S1A:     ['SLC'],
      S1B:     ['SLC'],
      S1C:     ['SLC'],
      S1D:     ['SLC']
    }
  },

  // ── COLOURS ──────────────────────────────────────────────────────────────
  colors: {
    // Map footprints, sidebar chips and legend, per platform.
    // '_default' covers any platform not listed.
    platforms: {
      'S1A': '#00e5ff',
      'S1C': '#ce93d8',
      'S1D': '#4db6ac',
      'ALOS-2': '#ff80ab',
      'ALOS-4': '#ab68c4',
      'RADARSAT-2': '#ffc107',
      'RCM-1': '#ffb300',
      'RCM-2': '#ffa000',
      'RCM-3': '#ff8f00',
      '_default': '#ff7043'
    },

    // NISAR's four Taiwan tracks, so ascending and descending stay distinct.
    nisarTracks: {
      'A39':  '#00e676',
      'A111': '#ffd740',
      'D61':  '#f06292',
      'D133': '#b388ff'
    },

    // Bar colours in the statistics chart. Visitors can also recolour these
    // live from the gear menu in the chart header; their choice wins.
    statsSeries: {
      S1A:   '#29b6f6',
      S1C:   '#ce93d8',
      S1D:   '#4db6ac',
      NISAR: '#ffb74d'
    }
  },

  // ── STATISTICS PANEL ─────────────────────────────────────────────────────
  stats: {
    // choices: '1mo' | '6mo' | '1yr'
    chartPreset: '6mo',

    // Width of one chart bar, in hours. Must be one of:
    // 1, 3, 6, 12, 24, 48, 72, 120, 168, 336, 720   (24 = one day)
    cellSizeHours: 12,

    // choices: 'ALL' | 'ASCENDING' | 'DESCENDING'
    pass: 'ALL',

    // choices: 'lastDate' | 'count' | 'interval' | 'name'
    sortBy: 'lastDate',

    // choices: 'stack' | 'split' | 'chart'
    layout: 'stack',

    // Which satellites the chart can show, and which start switched on.
    // activeSatellites must be a subset of chartSatellites.
    chartSatellites:  ['S1A', 'S1C', 'S1D', 'NISAR'],
    activeSatellites: ['S1A', 'S1C', 'S1D', 'NISAR'],

    // Sentinel-1 track chips. Only the two priority Taiwan tracks are charted
    // by default; T142/T171 clip the area and were left out of the controls.
    s1Tracks:       [69, 105],
    activeS1Tracks: [69, 105],

    // NISAR track chips. 'dir' must be 'ASCENDING' or 'DESCENDING', and the
    // key is conventionally A/D followed by the path number.
    nisarTracks: [
      { key: 'A39',  path: 39,  dir: 'ASCENDING'  },
      { key: 'A111', path: 111, dir: 'ASCENDING'  },
      { key: 'D61',  path: 61,  dir: 'DESCENDING' },
      { key: 'D133', path: 133, dir: 'DESCENDING' }
    ],
    activeNisarTracks: ['A39', 'A111', 'D61', 'D133'],

    // One overpass is delivered as several products (NISAR ships RSLC + GSLC
    // + GCOV + SME2, Sentinel-1 ships SLC + GRD + RAW + OCN). Counting all of
    // them would multiply every pass, so acquisition counts use exactly one
    // product per mission. Change only if a mission's product mix changes.
    canonicalProduct: {
      S1A:   'SLC',
      S1C:   'SLC',
      S1D:   'SLC',
      NISAR: 'RSLC'
    }
  },

  // ── CHART APPEARANCE ─────────────────────────────────────────────────────
  // Starting values only — all of these can be adjusted live from the gear
  // icon in the chart header, and a visitor's adjustment is remembered.
  // Out-of-range values are clamped to the limits shown.
  chartStyle: {
    chartWidth:  100,  // % of available width   (100–800; over 100 scrolls sideways)
    chartHeight: 100,  // % of the layout height (40–400)
    barWidth:    100,  // % of the space per bar (10–400; over 100 overlaps bars)
    barOpacity:   88,  // %  (10–100)
    bandOpacity:   9,  // %  (0–60)   day/month shading behind the bars
    gridOpacity:  85,  // %  (0–100)
    gridWidth:     1,  // px (0.25–6)
    labelSize:     0,  // px size offset for axis labels (-3–12)
    barMinWidth:   1,  // px floor so single acquisitions stay visible (1–24)
    exportScale:   2,  // sharpness multiplier for Copy / PNG export (1–6)
    axisTitles:    1,  // 1 = show axis titles, 0 = hide them

    // Leave a colour empty ('') to follow the current theme automatically.
    // The background also accepts 'transparent'.
    colors: {
      background: '',
      text: '',
      grid: '',
      band: ''
    }
  }

};

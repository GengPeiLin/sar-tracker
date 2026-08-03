// ═══════════════════════════════════════════════════════════════════════════
// USER CONFIG
// ═══════════════════════════════════════════════════════════════════════════
// config.js assigns window.SAR_CONFIG and is loaded by a plain (non-deferred)
// <script> ahead of this file, so it has always run by the time these read it.
// It is a .js assignment rather than .json for the same reason
// data/sar_status.js is: the dashboard must work from file://, where fetching
// a local .json is blocked.
//
// Every value below is read through one of these accessors, each of which
// validates and falls back to the built-in default baked into the call site.
// That means a missing config.js, a missing key, or a mistyped value degrades
// to stock behaviour instead of breaking the page — the config is hand-edited
// by users with no build step or linter to catch them, so a bad edit must
// never leave a blank dashboard. Rejected values warn to the console with the
// key name and what was expected, since that is the only debugging channel a
// static page has.
const SAR_CFG = (typeof window !== 'undefined' && window.SAR_CONFIG) || {};

// Warn once per key: some of these accessors are called from render loops, and
// a repeated warning would bury the other messages a user needs to see.
const _cfgWarned = new Set();
function cfgWarn(path, expected, got) {
  if (_cfgWarned.has(path)) return;
  _cfgWarned.add(path);
  console.warn(`[config.js] ${path}: expected ${expected}, got ${JSON.stringify(got)} — using default.`);
}

// Raw lookup by dotted path. Returns undefined when any link is missing, which
// the typed helpers below treat as "not configured" rather than as an error.
function cfgRaw(path) {
  let node = SAR_CFG;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

function cfgNum(path, fallback, { min = -Infinity, max = Infinity } = {}) {
  const value = cfgRaw(path);
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    cfgWarn(path, 'a number', value);
    return fallback;
  }
  // Clamp rather than reject: a slider value slightly out of range is a clear
  // intent to go to the extreme, not a typo worth discarding.
  return Math.min(max, Math.max(min, value));
}

// `allowed` is optional; when given, anything outside it falls back.
function cfgStr(path, fallback, allowed = null) {
  const value = cfgRaw(path);
  if (value === undefined) return fallback;
  if (typeof value !== 'string') {
    cfgWarn(path, 'a quoted string', value);
    return fallback;
  }
  if (allowed && !allowed.includes(value)) {
    cfgWarn(path, `one of ${allowed.map(v => `'${v}'`).join(' | ')}`, value);
    return fallback;
  }
  return value;
}

// Empty arrays fall back too: every list in config.js drives a control that
// would render blank (or filter everything out) if emptied.
function cfgList(path, fallback, itemCheck = null) {
  const value = cfgRaw(path);
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || !value.length) {
    cfgWarn(path, 'a non-empty [list]', value);
    return fallback;
  }
  if (itemCheck && !value.every(itemCheck)) {
    cfgWarn(path, 'a list of valid entries', value);
    return fallback;
  }
  return value;
}

// Merged over the fallback, so naming one key in config.js does not silently
// drop the others (e.g. recolouring S1A must not erase every other platform).
function cfgMap(path, fallback) {
  const value = cfgRaw(path);
  if (value === undefined) return fallback;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    cfgWarn(path, 'a { key: value } block', value);
    return fallback;
  }
  return { ...fallback, ...value };
}

// ═══════════════════════════════════════════════════════════════════════════
// SAR SATELLITE DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const SATS = [
  // ── ESA Sentinel-1 (C) ──────────────────────────────────────────────────
  { id:'S1A', name:'Sentinel-1A',       agency:'ESA',           band:'C', freq:'5.405 GHz', res:'5–20 m',   swath:'80–400 km', launched:'2014-04-03', status:'op',
    asf_prefix:['S1A','SENTINEL-1A'],
    desc:'ESA flagship C-band SAR. IW mode 250 km swath, global data freely available. Forms a two-satellite constellation with Sentinel-1C; 6-day revisit over Taiwan.',
    desc_zh:'ESA 旗艦 C 波段 SAR。IW 模式 250 km 掃幅，全球資料免費開放。與 Sentinel-1C 組成雙星座，台灣每 6 天重訪一次。' },
  { id:'S1C', name:'Sentinel-1C',       agency:'ESA',           band:'C', freq:'5.405 GHz', res:'5–20 m',   swath:'80–400 km', launched:'2024-12-05', status:'op',
    asf_prefix:['S1C','SENTINEL-1C'],
    desc:'Launched December 2024 as successor to Sentinel-1B. Restores the 6-day revisit cycle with Sentinel-1A; data freely provided via Copernicus CDSE.',
    desc_zh:'2024 年 12 月接替 Sentinel-1B 發射。與 Sentinel-1A 恢復 6 天重訪週期，資料由 Copernicus CDSE 免費提供。' },
  { id:'S1D', name:'Sentinel-1D',       agency:'ESA',           band:'C', freq:'5.405 GHz', res:'5–20 m',   swath:'80–400 km', launched:'2025-11-04', status:'op',
    asf_prefix:['S1D','SENTINEL-1D'],
    desc:'Joined the constellation in November 2025, further reducing revisit time to approximately 3 days for global coverage.',
    desc_zh:'2025 年 11 月加入星座，進一步縮短重訪週期，可達 3 天一次全球覆蓋。' },

  // ── JAXA (L) ────────────────────────────────────────────────────────────
  { id:'ALOS2',  name:'ALOS-2 (PALSAR-2)',  agency:'JAXA',        band:'L', freq:'1.236 GHz', res:'1–100 m',  swath:'25–490 km', launched:'2014-05-24', status:'op',
    asf_prefix:['ALOS2','ALOS-2'],
    desc:'Strong L-band penetration, ideal for forest biomass, surface deformation (InSAR), and disaster response. 14-day revisit; Taiwan typically covered every ~7 days from ascending and descending passes.',
    desc_zh:'L 波段穿透力強，適合森林碳匯、地表形變（InSAR）及災害應變。14 天重訪週期，台灣通常由升/降軌各約 7 天一次。' },
  { id:'ALOS4',  name:'ALOS-4',              agency:'JAXA',        band:'L', freq:'1.258 GHz', res:'3–100 m',  swath:'50–2000 km', launched:'2024-07-01', status:'op',
    asf_prefix:['ALOS4','ALOS-4'],
    desc:'Ultra-wide ScanSAR mode up to 2000 km swath, greatly increasing global coverage frequency. Can cover Taiwan multiple times within a 14-day cycle.',
    desc_zh:'超寬刈幅模式達 2000 km，全球覆蓋頻率大幅提升。ScanSAR 模式 14 天可覆蓋台灣多次。' },

  // ── NASA/ISRO NISAR (L+S) ────────────────────────────────────────────────
  // `band` is the primary radar (badges show one letter); `bands` lists every
  // band the satellite carries, so the S-Band chip finds NISAR's S-SAR frames.
  { id:'NISAR',  name:'NISAR',               agency:'NASA/ISRO',   band:'L', bands:['L','S'], freq:'1.257 GHz', res:'3–25 m',   swath:'240 km',    launched:'2024-03-01', status:'op',
    asf_prefix:['NISAR'],
    desc:'Joint NASA/ISRO mission carrying both L-band (JPL) and S-band (ISRO) SAR. 12-day global coverage; all data fully open access.',
    desc_zh:'NASA 與 ISRO 聯合任務，同時搭載 L 波段（JPL）與 S 波段（ISRO）SAR。12 天全球覆蓋，所有資料完全開放。' },

  // ── DLR/Airbus (X) ──────────────────────────────────────────────────────
  { id:'TSX',  name:'TerraSAR-X',            agency:'DLR/Airbus',  band:'X', freq:'9.65 GHz',  res:'0.25–18 m', swath:'5–150 km',  launched:'2007-06-15', status:'op',
    asf_prefix:['TSX','TERRASAR'],
    desc:'Commercial high-resolution X-band SAR. Spotlight mode at 0.25 m, suited for urban, bridge, and harbour monitoring. Data requires purchase or research license.',
    desc_zh:'商業高解析度 X 波段 SAR。聚焦模式 0.25 m，適合城市、橋樑、海港精細監測。資料需購買或申請研究授權。' },
  { id:'TDX',  name:'TanDEM-X',              agency:'DLR/Airbus',  band:'X', freq:'9.65 GHz',  res:'0.25–18 m', swath:'5–150 km',  launched:'2010-06-21', status:'op',
    asf_prefix:['TDX','TANDEM'],
    desc:'Flies in tandem formation with TerraSAR-X to generate the global TanDEM-X 12 m/90 m DEM; also capable of independent high-resolution imaging.',
    desc_zh:'與 TerraSAR-X 雙星編隊飛行，用於生成全球 TanDEM-X 12 m/90 m DEM，也可獨立執行高解析任務。' },

  // ── ASI COSMO-SkyMed Second Generation (X) ──────────────────────────────
  { id:'CSG1', name:'COSMO-SkyMed SG-1',     agency:'ASI',         band:'X', freq:'9.6 GHz',   res:'0.35–100 m', swath:'10–200 km', launched:'2019-12-18', status:'op',
    asf_prefix:['CSG1','COSMO'],
    desc:'Italian second-generation COSMO-SkyMed (Second Generation), dual civil/military use. Spotlight mode at 0.35 m; can revisit Taiwan within a few hours.',
    desc_zh:'義大利第二代 COSMO-SkyMed（Second Generation），軍民兩用。Spotlight 模式 0.35 m，可在數小時內重新對台灣取像。' },
  { id:'CSG2', name:'COSMO-SkyMed SG-2',     agency:'ASI',         band:'X', freq:'9.6 GHz',   res:'0.35–100 m', swath:'10–200 km', launched:'2022-03-31', status:'op',
    asf_prefix:['CSG2'],
    desc:'Second satellite of the COSMO-SkyMed Second Generation; completes a 4-satellite coordinated constellation (including legacy units) with revisit intervals in the hours range.',
    desc_zh:'COSMO-SkyMed 第二代第二顆，完成 4 星（含舊版）協調運作，重訪週期縮短至數小時級別。' },

  // ── CSA RADARSAT Constellation (C) ──────────────────────────────────────
  { id:'RCM1', name:'RADARSAT-C 1 (RCM-1)',  agency:'CSA',         band:'C', freq:'5.405 GHz', res:'1–100 m',  swath:'20–500 km', launched:'2019-06-12', status:'op',
    asf_prefix:['RCM1','RCM-1'],
    desc:'First satellite of the Canadian RADARSAT Constellation Mission. Three equally spaced satellites provide global coverage every 4 days, supporting maritime monitoring and disaster response.',
    desc_zh:'加拿大 RADARSAT 星座任務第一顆。3 顆等間距分布，每 4 天可覆蓋全球一次，支援海事監控與災害應變。' },
  { id:'RCM2', name:'RADARSAT-C 2 (RCM-2)',  agency:'CSA',         band:'C', freq:'5.405 GHz', res:'1–100 m',  swath:'20–500 km', launched:'2019-06-12', status:'op',
    asf_prefix:['RCM2','RCM-2'],
    desc:'Second RCM satellite, spaced 120° from RCM-1 and RCM-3. Supports full polarimetry (HH+HV+VH+VV) and compact polarimetry modes.',
    desc_zh:'RCM 星座第二顆，與 RCM-1/3 間距各 120°。提供全極化（HH+HV+VH+VV）及緊湊極化模式。' },
  { id:'RCM3', name:'RADARSAT-C 3 (RCM-3)',  agency:'CSA',         band:'C', freq:'5.405 GHz', res:'1–100 m',  swath:'20–500 km', launched:'2019-06-12', status:'op',
    asf_prefix:['RCM3','RCM-3'],
    desc:'Third RCM satellite, completing the three-satellite layout. Government priority applications include Arctic ice monitoring and marine oil-spill detection.',
    desc_zh:'RCM 星座第三顆，完成三星佈局。政府優先任務包括加拿大北部冰況監測、海洋排放溢油偵測等。' },
  { id:'RS2',  name:'RADARSAT-2',             agency:'CSA/MDA',     band:'C', freq:'5.405 GHz', res:'1–100 m',  swath:'20–500 km', launched:'2007-12-14', status:'op',
    asf_prefix:['RS2','RADARSAT-2','R2'],
    desc:'Commercial C-band SAR with full polarimetry; Ultra-Fine mode at 1 m resolution. Data must be purchased from MDA, though emergency access is available for disaster response.',
    desc_zh:'商業 C 波段 SAR，全極化能力，超精細模式 1 m。資料需向 MDA 商購，但部分災害情況提供免費存取。' },

  // ── CONAE SAOCOM (L) ────────────────────────────────────────────────────
  { id:'SAO1A', name:'SAOCOM-1A',             agency:'CONAE',       band:'L', freq:'1.275 GHz', res:'10–100 m', swath:'30–400 km', launched:'2018-10-08', status:'op',
    asf_prefix:['SAOCOM1A','SAOCOM-1A','UAM'],
    desc:'Argentine L-band SAR, primarily used for soil moisture monitoring and flood mapping. Full-polarimetry data available upon research request.',
    desc_zh:'阿根廷 L 波段 SAR，主力應用為土壤溼度監測與洪水繪圖。全極化資料可申請研究用途。' },
  { id:'SAO1B', name:'SAOCOM-1B',             agency:'CONAE',       band:'L', freq:'1.275 GHz', res:'10–100 m', swath:'30–400 km', launched:'2020-08-30', status:'op',
    asf_prefix:['SAOCOM1B','SAOCOM-1B','UAM'],
    desc:'Twin of SAOCOM-1A; coordinated operations reduce revisit time over Taiwan. Also participates in data exchange with COSMO-SkyMed under the SIASGE agreement.',
    desc_zh:'SAOCOM-1A 雙星，兩星協調使台灣重訪週期縮短。也與意大利 COSMO-SkyMed 交換資料（SIASGE 協議）。' },

  // ── ISRO (X) ────────────────────────────────────────────────────────────
  { id:'RISAT2B', name:'RISAT-2BR1',          agency:'ISRO',        band:'X', freq:'9.35 GHz',  res:'0.5–50 m', swath:'5–300 km', launched:'2019-12-11', status:'op',
    asf_prefix:['RISAT2BR1','RISAT'],
    desc:'Indian X-band SAR smallsat using the Israeli ELTA ELM-2022S radar. Spotlight mode at 0.5 m; used for agricultural surveys and security monitoring.',
    desc_zh:'印度 X 波段 SAR 小衛星，以色列 ELTA ELM-2022S 雷達。Spotlight 模式 0.5 m，用於農業普查與安全監測。' },

  // ── NovaSAR (S) ─────────────────────────────────────────────────────────
  { id:'NOVASAR', name:'NovaSAR-1',           agency:'SSTL/UKSA',   band:'S', freq:'3.2 GHz',   res:'6–30 m',   swath:'20–150 km', launched:'2018-09-16', status:'op',
    asf_prefix:['NOVASAR'],
    desc:'S-band compact SAR developed by UK SSTL. S-band properties fall between C and L, offering better vegetation penetration than C-band. Data available upon request from SSTL.',
    desc_zh:'英國 SSTL 開發的 S 波段小型 SAR。S 波段特性介於 C 與 L 之間，對植被穿透力較 C 強。資料可向 SSTL 申請。' },

  // ── Commercial Constellations ────────────────────────────────────────────
  { id:'ICEYE',   name:'ICEYE Constellation (20+ sats)',  name_zh:'ICEYE 星座（20+ 顆）', agency:'ICEYE',     band:'X', freq:'9.65 GHz',  res:'0.25–15 m', swath:'5–200 km', launched:'2018~', status:'op',
    asf_prefix:['ICEYE'],
    desc:'Finnish commercial SAR smallsat constellation with 20+ satellites in orbit. Spot Fine mode at 25 cm; can revisit Taiwan within 3 hours. Supports on-demand tasking.',
    desc_zh:'芬蘭商業 SAR 小衛星星座，已超過 20 顆在軌。Spot Fine 模式達 25 cm，可在 3 小時內重訪台灣。支援 on-demand 任務。' },
  { id:'CAPELLA', name:'Capella Constellation (7+ sats)', name_zh:'Capella 星座（7+ 顆）', agency:'Capella Space', band:'X', freq:'9.65 GHz', res:'0.35–5 m', swath:'5–50 km', launched:'2020~', status:'op',
    asf_prefix:['CAPELLA'],
    desc:'US commercial SAR with up to 0.35 m Spotlight imagery. Offers an Open Data Program — free tasking requests available for select areas.',
    desc_zh:'美國商業 SAR，最高 0.35 m Spotlight 影像。提供 Open Data Program，部分地區可免費申請取像。' },
  { id:'UMBRA',   name:'Umbra Constellation (5+ sats)',   name_zh:'Umbra 星座（5+ 顆）', agency:'Umbra',      band:'X', freq:'9.65 GHz',  res:'0.16–5 m', swath:'5–35 km', launched:'2021~', status:'op',
    asf_prefix:['UMBRA'],
    desc:'Currently the highest-resolution commercial SAR (16 cm). Open Data Program provides free image downloads including historical Taiwan coverage.',
    desc_zh:'目前民用最高解析度 SAR（16 cm）。Open Data Program 提供部分影像免費下載，包含台灣歷史存檔。' },
  { id:'SYNSPECTIVE', name:'Synspective Constellation',   name_zh:'Synspective 星座', agency:'Synspective', band:'X', freq:'9.65 GHz',  res:'1–3 m',   swath:'30 km',  launched:'2020~', status:'op',
    asf_prefix:['SYNSPECTIVE'],
    desc:'Japanese commercial SAR smallsat focused on the Asian market. Has cooperation agreements with Taiwanese research institutions for rapid disaster response imagery.',
    desc_zh:'日本商業 SAR 小衛星，專注亞洲市場。與台灣科研機構有合作協議，可提供快速災害應變影像。' },

  // ── Retired ─────────────────────────────────────────────────────────────
  { id:'S1B',  name:'Sentinel-1B',             agency:'ESA',         band:'C', freq:'5.405 GHz', res:'5–20 m',  swath:'80–400 km', launched:'2016-04-25', status:'ret', retired:'2022-08-23',
    asf_prefix:['S1B','SENTINEL-1B'],
    desc:'Power system anomaly in December 2021 caused SAR instrument failure; officially retired August 2022. Its orbit slot was taken over by Sentinel-1C.',
    desc_zh:'2021 年 12 月電力系統異常，SAR 傳感器失效；2022 年 8 月正式退役。由 Sentinel-1C 接替其軌道。' },
  { id:'ALOS1', name:'ALOS (PALSAR)',           agency:'JAXA',        band:'L', freq:'1.27 GHz',  res:'7–100 m', swath:'40–350 km', launched:'2006-01-24', status:'ret', retired:'2011-04-22',
    asf_prefix:['ALOS','ALOS1'],
    desc:'Predecessor to ALOS-2 and the first mission to provide free global L-band data. Archive data still freely available via ASF.',
    desc_zh:'ALOS-2 的前身，第一個提供免費全球 L 波段資料的任務。存檔資料仍可透過 ASF 免費下載。' },
  { id:'ERS1', name:'ERS-1',                    agency:'ESA',         band:'C', freq:'5.3 GHz',   res:'25 m',    swath:'100 km',    launched:'1991-07-17', status:'ret', retired:'2000-03-10',
    asf_prefix:['ERS1','ERS-1'],
    desc:"ESA's first-generation SAR satellite that established the foundations of InSAR applications. Extensive archive data remains scientifically valuable and accessible via ASF.",
    desc_zh:'ESA 第一代 SAR 衛星，奠定 InSAR 應用基礎。大量存檔資料仍有科研價值，可由 ASF 存取。' },
  { id:'ERS2', name:'ERS-2',                    agency:'ESA',         band:'C', freq:'5.3 GHz',   res:'25 m',    swath:'100 km',    launched:'1995-04-21', status:'ret', retired:'2011-09-05',
    asf_prefix:['ERS2','ERS-2'],
    desc:'Follow-on to ERS-1; together they formed the ERS Tandem mission. Re-entered the atmosphere in February 2024; complete archive available on ASF.',
    desc_zh:'ERS-1 接替星，與其組成 Tandem 任務。2024 年 2 月完成大氣再入，ASF 存有完整存檔。' },
];

// ═══════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  en: {
    'loading':'Connecting to data sources…','loading-inventory':'Loading latest frame inventory…',
    'updated':'Updated:','repo-link':'View source on GitHub','db-stamp':'database: {stamp}','tz-label':'Time Zone','tz-taiwan':'Taiwan','tz-utc':'UTC','tz-local':'Local','tz-tokyo':'Tokyo','tz-singapore':'Singapore','tz-kolkata':'Kolkata','tz-london':'London','tz-berlin':'Berlin','tz-newyork':'New York','tz-losangeles':'Los Angeles','tab-all':'All Satellites','tab-op':'Active','tab-tw':'This Week',
    'sat-fleet':'SAR Satellite Fleet','loading-ellipsis':'Loading…',
    'waiting-inventory':'Waiting for inventory…','n-satellites':'{n} satellites listed',
    'featured-missions':'Featured open missions','other-missions':'Other SAR missions',
    'other-missions-note':'Commercial and access-restricted missions stay collapsed by default so the sidebar stays centered on Sentinel-1 and NISAR.',
    'all-satellites':'All satellites','satellite-label':'Satellite','orbit-direction':'Orbit Direction',
    'dir-all':'All','dir-asc':'Ascending','dir-desc':'Descending',
    'date-start':'Date Start','date-end':'Date End',
    'track-min':'Track Min','track-max':'Track Max','frame-min':'Frame Min','frame-max':'Frame Max',
    'product-types':'Product Types','loading-types':'Loading...','no-product-types':'No product types in current inventory.',
    'chip-solo-hint':'Click to toggle · double-click to select only this (double-click again to select all)',
    's1-options':'Sentinel-1 Options','nisar-options':'NISAR Options',
    'frame-coverage':'Frame Coverage','range-bandwidth':'Range Bandwidth','nisar-band':'Band',
    'release-beta':'Beta release (Feb 2026) — uncalibrated, not for quantitative use',
    'release-provisional':'Provisional release (20 Jul 2026) — calibration still being refined',
    'release-urgent':'Urgent response product',
    'n-nisar-frames':'{n} NISAR frames',
    'reset-filters':'Reset Filters','show-same-track':'Show same track in drawer',
    'show-other-tracks':'Show other Taiwan Sentinel-1 tracks',
    'slc-default':'SLC / GSLC / RSLC are selected by default.',
    'this-week':'This Week','this-month':'This Month','6-months':'6 Months','1-year':'1 Year','any':'Any',
    'filtered-frames':'Filtered Frames','active-satellites':'Active Satellites','query-window':'Query Window',
    'latest-tracks':'Latest Tracks','latest-a69-d105':'Latest A69 / D105',
    'latest-visible':'Latest Visible Tracks','need-history':'Need history',
    'visible-data':'Visible Data','no-visible-data':'No visible data matches the current filters.',
    'selected-files':'Selected Files','mission-details':'Mission Details',
    'frames-this-week':'Frames available this week',
    'status':'Status','band':'Band','frequency':'Frequency','resolution':'Resolution',
    'swath':'Swath','launch':'Launch','retired-label':'Retired',
    'status-op':'Operational','status-ret':'Retired','status-up':'Upcoming',
    'track':'Track','frame':'Frame','direction':'Direction','mode':'Mode',
    'frame-coverage':'Coverage','polarization':'Polarization','bandwidth-mhz':'{bw} MHz',
    'joint-obs':'Joint L+S','joint-yes':'Yes','joint-no':'L-band only',
    'cov-Full':'Full','cov-Partial':'Partial',
    'acquisitions':'Acquisitions','files-label':'Files','source':'Source','selected-date':'Selected Date',
    'n-acquisition-dates':'{n} acquisition dates','n-files-in-drawer':'{n} file{s} in drawer',
    'acquisition-files-section':'Acquisition Files Under Track {track} / Frame {frame}',
    'no-download-url':'No download URL available.','no-file-match':'No file matches this track.',
    'source-asf-cop':'ASF + Copernicus','source-cop-only':'Copernicus only',
    'source-asf-only':'ASF only','source-none':'No download source',
    'frame-meta-unavailable':'Frame metadata unavailable in source record',
    'no-asf-metadata':'No matched ASF frame metadata in local dataset',
    'filtered-downloads':'Filtered Downloads','export':'Export',
    'current-selection':'Current Selection','copy-all-links':'Copy All Links','csv-export':'CSV Export',
    'this-week-badge':'Frames available this week',
    'n-files-count':'{n} files · ASF {asf} · CDSE {cop}',
    'copied-n-links':'📋 Copied {n} Links!',
    'no-urls-alert':'No URLs available for the current filters.',
    'no-scenes-alert':'No {source} scenes match the current filters.',
    'no-frames-alert':'No frames match the current filters.',
    'update-tracker':'Update Tracker','no-imagery':'No visible imagery matches the current time window and filters.',
    'open-date-range':'Open date range','unknown-date':'Unknown date',
    'n-unique-files':'{n} unique file(s) in current view',
    'n-files-day':'{n} file{s}',
    'note-default':'Default focus is Sentinel-1 Track 69, Track 105, and NISAR.',
    'note-with-other':'Showing Sentinel-1 Track 69 / 105 plus other Taiwan Sentinel-1 tracks and NISAR.',
    'note-formats':'Formats for {sat}: {formats} | frame range {min}-{max} | {extra}',
    'priority-only':'priority tracks only','with-other-tracks':'with other Sentinel-1 Taiwan tracks visible',
    'unknown-granule':'Unknown Granule','unknown-acquisition':'Unknown acquisition time',
    'lang-label':'Lang','theme-label':'Theme','text-size-label':'Text Size','stats-tab':'Stats',
    'map-tab':'Map','list-tab':'List','filters-tab':'Filters',
    'highlight-solid':'Solid','highlight-dash':'Dash','highlight-color':'Color','highlight-gold':'Gold',
    'statistics-title':'Statistics','layout-stacked':'Stacked','layout-side-by-side':'Side by side','layout-chart-focus':'Chart focus',
    'chart-label':'Chart','table-label':'Table',
    'stats-acq-frequency-chart':'Acquisition Frequency Chart','stats-all-acquisitions':'all acquisitions',
    'stats-period':'Period','stats-preset-1mo':'1 mo','stats-preset-6mo':'6 mo','stats-preset-1yr':'1 yr','stats-preset-custom':'Custom',
    'stats-cell-size':'Cell size','stats-day-suffix':'d','stats-hour-suffix':'h','stats-satellites':'Satellites','stats-s1-tracks':'S1 tracks','stats-nisar-tracks':'NISAR tracks','stats-appearance':'Appearance','stats-tune':'Tune','stats-reset-style':'Reset chart appearance','stats-series-colors':'Series Colors','stats-reset':'Reset','copy-png':'Copy','copy-label':'Copy','copied':'Copied','saved':'Saved','copy-failed':'Failed','copy-png-title':'Copy chart to clipboard as PNG','copy-tsv-title':'Copy table to clipboard (paste into a spreadsheet)','stats-chart-colors':'Chart Colors','stats-axis-titles':'Axis Titles','axis-x':'X title','axis-y':'Y title','axis-show':'Show','axis-title-x':'Date','axis-title-y':'Acquisitions','color-background':'Background','color-text':'Labels','color-grid':'Grid','color-band':'Day shading','color-auto':'Auto','color-transparent':'None','style-exportScale':'Export scale','style-chartWidth':'Chart width','style-chartHeight':'Chart height','style-size':'Size','style-ratio':'Ratio','style-barWidth':'Bar width','style-barOpacity':'Bar opacity','style-bandOpacity':'Day shading','style-gridOpacity':'Grid opacity','style-gridWidth':'Grid width','style-labelSize':'Label size','style-barMinWidth':'Min bar',
    'stats-pass':'Pass','stats-pass-all':'All','stats-pass-asc':'ASC','stats-pass-desc':'DESC',
    'stats-computing':'Computing…','stats-track-statistics':'Track Statistics','stats-sort-by':'Sort by',
    'stats-sort-last-acq':'Last Acq','stats-sort-frames':'Frames','stats-sort-interval':'Interval','stats-sort-name':'Name',
    'stats-no-data':'No data available','stats-no-window-data':'No data in this window for the selected satellites',
    'stats-edit-color':'Edit color','stats-reset-colors':'Reset all to defaults',
    'stats-frame-unit':'fr','stats-frames-word':'frames','stats-frame-word':'frame','stats-last':'last','stats-no-track-data':'No track data','stats-view-on-map':'View on map',
    'this-week-map':'THIS WEEK',
  },
  'zh-TW': {
    'loading':'連線資料來源中…','loading-inventory':'載入最新取像清單…',
    'updated':'更新：','repo-link':'在 GitHub 檢視原始碼','db-stamp':'資料庫：{stamp}','tz-label':'時區','tz-taiwan':'台灣','tz-utc':'UTC','tz-local':'本地','tz-tokyo':'東京','tz-singapore':'新加坡','tz-kolkata':'加爾各答','tz-london':'倫敦','tz-berlin':'柏林','tz-newyork':'紐約','tz-losangeles':'洛杉磯','tab-all':'全部衛星','tab-op':'運作中','tab-tw':'本週取像',
    'sat-fleet':'SAR 衛星艦隊','loading-ellipsis':'載入中…',
    'waiting-inventory':'等待資料清單…','n-satellites':'{n} 顆衛星',
    'featured-missions':'精選開放任務','other-missions':'其他 SAR 任務',
    'other-missions-note':'商業及限制存取任務預設收折，讓側邊欄聚焦於 Sentinel-1 與 NISAR。',
    'all-satellites':'全部衛星','satellite-label':'衛星','orbit-direction':'軌道方向',
    'dir-all':'全部','dir-asc':'升軌','dir-desc':'降軌',
    'date-start':'開始日期','date-end':'結束日期',
    'track-min':'軌道最小值','track-max':'軌道最大值','frame-min':'幀號最小值','frame-max':'幀號最大值',
    'product-types':'產品類型','loading-types':'載入中...','no-product-types':'目前清單無產品類型。',
    'chip-solo-hint':'點擊切換 · 雙擊只選此項（再次雙擊選取全部）',
    's1-options':'Sentinel-1 選項','nisar-options':'NISAR 選項',
    'frame-coverage':'幀涵蓋範圍','range-bandwidth':'距離向頻寬','nisar-band':'波段',
    'release-beta':'Beta 版本（2026 年 2 月）— 未校正，不適用於定量分析',
    'release-provisional':'Provisional 版本（2026 年 7 月 20 日）— 校正仍在調整中',
    'release-urgent':'緊急應變產品',
    'n-nisar-frames':'{n} 個 NISAR 幀',
    'reset-filters':'重設篩選','show-same-track':'抽屜顯示同軌跡',
    'show-other-tracks':'顯示其他台灣 Sentinel-1 軌跡',
    'slc-default':'預設選取 SLC / GSLC / RSLC。',
    'this-week':'本週','this-month':'本月','6-months':'6 個月','1-year':'1 年','any':'任意',
    'filtered-frames':'篩選後幀數','active-satellites':'活躍衛星數','query-window':'查詢時段',
    'latest-tracks':'最新軌跡','latest-a69-d105':'最新 A69 / D105',
    'latest-visible':'最新可見軌跡','need-history':'無歷史資料',
    'visible-data':'可見資料','no-visible-data':'目前篩選條件無符合資料。',
    'selected-files':'選取檔案','mission-details':'任務說明',
    'frames-this-week':'本週有取像資料',
    'status':'狀態','band':'波段','frequency':'頻率','resolution':'解析度',
    'swath':'刈幅','launch':'發射','retired-label':'退役',
    'status-op':'運作中','status-ret':'已退役','status-up':'即將發射',
    'track':'軌道','frame':'幀號','direction':'方向','mode':'模式',
    'frame-coverage':'涵蓋','polarization':'極化','bandwidth-mhz':'{bw} MHz',
    'joint-obs':'L+S 聯合','joint-yes':'是','joint-no':'僅 L 波段',
    'cov-Full':'完整','cov-Partial':'部分',
    'acquisitions':'取像次數','files-label':'檔案','source':'來源','selected-date':'選取日期',
    'n-acquisition-dates':'{n} 個取像日期','n-files-in-drawer':'抽屜 {n} 個檔案',
    'acquisition-files-section':'軌道 {track} / 幀號 {frame} 取像檔案',
    'no-download-url':'無下載連結。','no-file-match':'此軌跡無符合檔案。',
    'source-asf-cop':'ASF + Copernicus','source-cop-only':'僅 Copernicus',
    'source-asf-only':'僅 ASF','source-none':'無下載來源',
    'frame-meta-unavailable':'來源記錄中無幀元資料',
    'no-asf-metadata':'本地資料集無匹配之 ASF 幀元資料',
    'filtered-downloads':'篩選後下載','export':'匯出',
    'current-selection':'目前選取','copy-all-links':'複製所有連結','csv-export':'CSV 匯出',
    'this-week-badge':'本週有取像',
    'n-files-count':'{n} 個檔案 · ASF {asf} · CDSE {cop}',
    'copied-n-links':'📋 已複製 {n} 個連結！',
    'no-urls-alert':'目前篩選條件無可用連結。',
    'no-scenes-alert':'{source} 無符合目前篩選條件的場景。',
    'no-frames-alert':'目前篩選條件無符合幀次。',
    'update-tracker':'更新追蹤器','no-imagery':'目前時段及篩選條件無符合影像。',
    'open-date-range':'開放日期範圍','unknown-date':'未知日期',
    'n-unique-files':'目前顯示 {n} 個獨立檔案',
    'n-files-day':'{n} 個檔案',
    'note-default':'預設聚焦於 Sentinel-1 軌道 69、105 及 NISAR。',
    'note-with-other':'顯示 Sentinel-1 軌道 69 / 105 及其他台灣 Sentinel-1 軌跡與 NISAR。',
    'note-formats':'{sat} 格式：{formats} | 幀號範圍 {min}-{max} | {extra}',
    'priority-only':'僅優先軌跡','with-other-tracks':'含其他 Sentinel-1 台灣軌跡可見',
    'unknown-granule':'未知取像','unknown-acquisition':'未知取像時間',
    'lang-label':'語言','theme-label':'主題','text-size-label':'文字大小','stats-tab':'統計',
    'map-tab':'地圖','list-tab':'清單','filters-tab':'篩選',
    'highlight-solid':'實線','highlight-dash':'虛線','highlight-color':'顏色','highlight-gold':'金色',
    'statistics-title':'統計','layout-stacked':'上下排列','layout-side-by-side':'左右並排','layout-chart-focus':'圖表聚焦',
    'chart-label':'圖表','table-label':'表格',
    'stats-acq-frequency-chart':'取像頻率圖','stats-all-acquisitions':'全部取像',
    'stats-period':'時段','stats-preset-1mo':'1 個月','stats-preset-6mo':'6 個月','stats-preset-1yr':'1 年','stats-preset-custom':'自訂',
    'stats-cell-size':'格距','stats-day-suffix':'天','stats-hour-suffix':'小時','stats-satellites':'衛星','stats-s1-tracks':'S1 軌道','stats-nisar-tracks':'NISAR 軌道','stats-appearance':'外觀','stats-tune':'調整','stats-reset-style':'重設圖表外觀','stats-series-colors':'系列顏色','stats-reset':'重設','copy-png':'複製','copy-label':'複製','copied':'已複製','saved':'已儲存','copy-failed':'失敗','copy-png-title':'以 PNG 複製圖表到剪貼簿','copy-tsv-title':'複製表格到剪貼簿（可貼進試算表）','stats-chart-colors':'圖表顏色','stats-axis-titles':'座標軸標題','axis-x':'X 標題','axis-y':'Y 標題','axis-show':'顯示','axis-title-x':'日期','axis-title-y':'取像次數','color-background':'背景','color-text':'標籤','color-grid':'格線','color-band':'日期底色','color-auto':'自動','color-transparent':'無','style-exportScale':'匯出倍率','style-chartWidth':'圖表寬度','style-chartHeight':'圖表高度','style-size':'尺寸','style-ratio':'比例','style-barWidth':'長條寬度','style-barOpacity':'長條透明度','style-bandOpacity':'日期底色','style-gridOpacity':'格線透明度','style-gridWidth':'格線粗細','style-labelSize':'標籤大小','style-barMinWidth':'最小寬度',
    'stats-pass':'軌向','stats-pass-all':'全部','stats-pass-asc':'升軌','stats-pass-desc':'降軌',
    'stats-computing':'計算中…','stats-track-statistics':'軌道統計','stats-sort-by':'排序依據',
    'stats-sort-last-acq':'最新取像','stats-sort-frames':'幀數','stats-sort-interval':'間隔','stats-sort-name':'名稱',
    'stats-no-data':'無可用資料','stats-no-window-data':'此時段內所選衛星無資料',
    'stats-edit-color':'編輯顏色','stats-reset-colors':'重設為預設顏色',
    'stats-frame-unit':'幀','stats-frames-word':'幀','stats-frame-word':'幀','stats-last':'最近','stats-no-track-data':'無軌道資料','stats-view-on-map':'在地圖上顯示',
    'this-week-map':'本週',
  },
};

function t(key, vars = {}) {
  const lang = state?.lang || 'en';
  const str = (TRANSLATIONS[lang] || TRANSLATIONS.en)[key] ?? TRANSLATIONS.en[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => k in vars ? vars[k] : `{${k}}`);
}

function getSatName(sat) {
  return (state?.lang === 'zh-TW' && sat.name_zh) ? sat.name_zh : sat.name;
}

function getSatDesc(sat) {
  return (state?.lang === 'zh-TW' && sat.desc_zh) ? sat.desc_zh : sat.desc;
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  applyI18n();
}

function toggleLang() {
  setLang(state.lang === 'en' ? 'zh-TW' : 'en');
}

const TITLE_FONTS = [
  { family: 'IBM Plex Mono', weight: 600, spacing: '3px',   transform: 'none' },
  { family: 'Orbitron',      weight: 700, spacing: '1px',   transform: 'uppercase' },
  { family: 'Space Grotesk', weight: 700, spacing: '0.5px', transform: 'none' },
  { family: 'Chakra Petch',  weight: 600, spacing: '2px',   transform: 'none' },
  { family: 'Bebas Neue',    weight: 400, spacing: '2px',   transform: 'uppercase' },
  { family: 'Rajdhani',      weight: 700, spacing: '2px',   transform: 'none' },
];
function applyTitleFont() {
  const logo = document.querySelector('.hdr-logo');
  if (!logo) return;
  const idx = Number(localStorage.getItem('titleFont') || 0) % TITLE_FONTS.length;
  const f = TITLE_FONTS[idx];
  logo.style.fontFamily = `'${f.family}', sans-serif`;
  logo.style.fontWeight = f.weight;
  logo.style.letterSpacing = f.spacing;
  logo.style.textTransform = f.transform;
}
function cycleTitleFont() {
  const idx = (Number(localStorage.getItem('titleFont') || 0) + 1) % TITLE_FONTS.length;
  localStorage.setItem('titleFont', idx);
  applyTitleFont();
}

// The dataset version is a compact UTC timestamp (YYYYMMDDThhmmss) written by
// fetch_sar_data.py. Parsed back to a real instant so the header stamp and the
// mobile badge can be shown in the selected display zone like every other time
// in the app — a raw UTC stamp beside UTC+8 acquisition times reads as a
// different (and apparently staler) day for most of the Taiwan evening.
function parseDatasetVersion(version) {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T?(\d{2})(\d{2})(\d{2})?)?$/.exec(String(version || '').trim());
  if (!match) return null;
  const [, y, mo, d, hh = '00', mi = '00', ss = '00'] = match;
  const ts = Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss);
  return Number.isNaN(ts) ? null : new Date(ts);
}

// Header "database: …" stamp plus the mobile freshness badge. Re-run whenever
// the display zone changes, not just when new data lands.
function renderDatasetStamp(data = state.baseStats || {}) {
  const el = document.getElementById('hdr-time');
  const at = parseDatasetVersion(data.version);
  let stamp = data.version || '--';
  if (at) {
    const local = toDisplayDate(at);
    const pad = n => String(n).padStart(2, '0');
    stamp = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`
          + ` ${pad(local.getHours())}:${pad(local.getMinutes())} ${displayTZLabel(at)}`;
  }
  if (el) el.textContent = t('db-stamp', { stamp });
  updateMobDbBadge(data.version);
}

function updateMobDbBadge(version) {
  const badge = document.getElementById('mob-db-ts');
  const at = parseDatasetVersion(version);
  if (!badge || !at) return;
  // Freshness is judged on the display zone's calendar, the same basis as
  // every other day grouping in the app.
  const label = displayDateKey(at);
  const today = displayDateKey(new Date());
  const yesterday = displayDateKey(new Date(Date.now() - 86400000));
  badge.textContent = label;
  badge.className = 'mob-db-ts ' +
    (label === today ? 'fresh' : label === yesterday ? 'recent' : 'stale');
}

function setMobTab(tab, btn) {
  document.body.dataset.mobTab = tab;
  document.querySelectorAll('.mob-tab').forEach(b =>
    b.classList.toggle('active', b === btn || b.dataset.tab === tab)
  );
  if (tab === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 50);
}

function applyI18n() {
  const sw = document.getElementById('lang-switch');
  if (sw) sw.classList.toggle('zh', state.lang === 'zh-TW');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    // Icon-only controls carry the same text as their accessible name; leaving
    // it in English would strand screen readers on the untranslated string.
    if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.title);
  });
  // Zone names are translated, so the option list is rebuilt with the language.
  renderTZSelect();
  document.querySelectorAll('input[placeholder="Any"], input[data-i18n-placeholder="any"]').forEach(el => {
    el.dataset.i18nPlaceholder = 'any';
    el.placeholder = t('any');
  });
  // re-render all dynamic UI
  setupReadableUI();
  // setupReadableUI rebuilds .hdr-status by carrying the previous text across,
  // so the stamp keeps the old language until it is rebuilt here.
  if (state.baseStats?.version) renderDatasetStamp();
  rebuildDownloadBar();
  renderSatelliteSelect();
  renderSatList();
  renderFormatOptions();
  updateStats(state.baseStats || {});
  updateFilterHints();
  updateNextExpected();
  renderMobileFeed();
  if (document.getElementById('stats-panel')?.classList.contains('open')) renderStatsPanel();
}

// ── Color mapping ─────────────────────────────────────────────────────────
const FEATURED_SATELLITES = new Set(['S1A', 'S1C', 'S1D', 'NISAR']);
const OPEN_DATA_SATELLITES = new Set(['S1A', 'S1B', 'S1C', 'S1D', 'NISAR']);
const SENTINEL_SATELLITES = new Set(['S1A', 'S1B', 'S1C', 'S1D']);
const THEME_OPTIONS = new Set(['soft-slate', 'night-ops', 'paper-radar', 'field-survey']);
const FONT_SIZE_STEPS   = [2, 4, 6, 8];
const FONT_SIZE_OPTIONS = new Set(FONT_SIZE_STEPS.map(String));

const PLATFORM_COLORS = (() => {
  const base = {
    'S1A':'#00e5ff','S1C':'#ce93d8','S1D':'#4db6ac',
    'ALOS-2':'#ff80ab','ALOS-4':'#ab68c4',
    'RADARSAT-2':'#ffc107','RCM-1':'#ffb300','RCM-2':'#ffa000','RCM-3':'#ff8f00',
    '_default':'#ff7043',
  };
  const colors = cfgMap('colors.platforms', base);
  // The catalogues name the same platform several ways, so each alias is
  // derived from its canonical entry rather than listed in config.js —
  // recolouring 'S1A' there must also recolour scenes that arrive as
  // 'SENTINEL-1A', which a user editing one hex value would never think to do.
  const ALIASES = {
    'SENTINEL-1A': 'S1A', 'SENTINEL-1C': 'S1C', 'SENTINEL-1D': 'S1D',
    'ALOS2': 'ALOS-2', 'ALOS4': 'ALOS-4',
    'R2': 'RADARSAT-2', 'RCM': 'RCM-1',
  };
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (colors[canonical]) colors[alias] = colors[canonical];
  }
  return colors;
})();

// ── Display timezone ────────────────────────────────────────────────────────
// This dashboard is about Taiwan, so every time is PRESENTED in UTC+8 no
// matter where the viewer sits. Stored data is never touched: frames keep the
// exact ISO UTC strings the providers deliver, and nothing here writes back to
// a frame. These helpers are display-only.
//
// Two shapes are needed:
//   formatDisplayTime() — for text, via Intl with an explicit timeZone.
//   toDisplayDate()     — a Date whose *local* getters (getHours, getDate, …)
//                         read the UTC+8 wall clock, for the chart geometry
//                         that already calls those getters.
// Selectable display timezone. Defaults to UTC+8 (the subject of this
// dashboard) but the viewer can pick any zone to reason about acquisition
// times in their own local clock. Stored data is never touched: frames keep
// the exact ISO UTC strings the providers deliver.
const DISPLAY_TZ_DEFAULT = cfgStr('timezone.default', 'Asia/Taipei');
// config.js lists zones as plain IANA strings; the label key is derived, so a
// zone we ship a translation for stays translated and any other zone the user
// adds falls back to showing its own name (renderTZSelect handles a missing
// key). Requiring users to invent an i18n key would make the list un-editable.
// 'Asia/Taipei' is the IANA identifier and cannot change — only the label the
// dropdown shows, which reads "Taiwan" because that is the area the zone covers
// and the subject of this dashboard.
const DISPLAY_TZ_LABEL_KEYS = {
  'Asia/Taipei': 'tz-taiwan',   'UTC': 'tz-utc',
  '__local__': 'tz-local',      'Asia/Tokyo': 'tz-tokyo',
  'Asia/Singapore': 'tz-singapore', 'Asia/Kolkata': 'tz-kolkata',
  'Europe/London': 'tz-london', 'Europe/Berlin': 'tz-berlin',
  'America/New_York': 'tz-newyork', 'America/Los_Angeles': 'tz-losangeles',
};
const DISPLAY_TZ_CHOICES = cfgList(
  'timezone.choices',
  ['Asia/Taipei', 'UTC', '__local__', 'Asia/Tokyo', 'Asia/Singapore',
   'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York',
   'America/Los_Angeles'],
  id => typeof id === 'string' && id.length > 0,
).map(id => ({ id, key: DISPLAY_TZ_LABEL_KEYS[id] || '' }));

function getDisplayTZ() {
  try {
    const saved = localStorage.getItem('sar_display_tz');
    if (saved === '__local__') return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    if (saved) return saved;
  } catch {}
  return DISPLAY_TZ_DEFAULT;
}
function getDisplayTZChoice() {
  try { return localStorage.getItem('sar_display_tz') || DISPLAY_TZ_DEFAULT; }
  catch { return DISPLAY_TZ_DEFAULT; }
}
function setDisplayTZ(value) {
  try { localStorage.setItem('sar_display_tz', value); } catch {}
  applyDisplayTZ();
}

// Offset of a zone at a given instant, in minutes east of UTC. Computed from
// Intl rather than hardcoded, so zones with DST stay correct year-round.
function tzOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
                         +parts.hour % 24, +parts.minute, +parts.second);
  // Round to whole minutes: formatToParts resolves only to seconds, so the
  // sub-second remainder of getTime() would otherwise show up as e.g.
  // "UTC+7:59.994" instead of "UTC+8".
  return Math.round((asUTC - date.getTime()) / 60000);
}

// Human label for the current zone, e.g. "UTC+8" / "UTC-4".
function displayTZLabel(at = new Date()) {
  const offset = tzOffsetMinutes(at, getDisplayTZ());
  if (!offset) return 'UTC';
  const sign = offset > 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60), m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

// A Date whose *local* getters (getHours, getDate, …) read the selected
// zone's wall clock — for the chart geometry that already calls those getters.
function toDisplayDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return date;
  const offset = tzOffsetMinutes(date, getDisplayTZ());
  const asUTC = date.getTime() + offset * 60000;
  return new Date(asUTC + date.getTimezoneOffset() * 60000);
}

// Inverse: the real instant for wall-clock fields in the selected zone.
function fromDisplayParts(year, month, day, hour = 0, minute = 0) {
  const guess = Date.UTC(year, month, day, hour, minute);
  const tz = getDisplayTZ();
  let offset = tzOffsetMinutes(new Date(guess), tz);
  let ts = guess - offset * 60000;
  // One refinement pass covers DST transitions, where the offset at the guess
  // differs from the offset at the resolved instant.
  const settled = tzOffsetMinutes(new Date(ts), tz);
  if (settled !== offset) ts = guess - settled * 60000;
  return new Date(ts);
}

function formatDisplayTime(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString(state.lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
    timeZone: getDisplayTZ(), ...options,
  });
}

// YYYY-MM-DD in the selected zone. Used wherever frames are grouped by day:
// a descending Taiwan pass at 21:52 UTC is 05:52 the NEXT day in UTC+8, so
// grouping on the raw UTC date would split a night's acquisitions.
function displayDateKey(value) {
  const date = toDisplayDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Re-render everything that shows a time after the zone changes.
function renderTZSelect() {
  const select = document.getElementById('tz-select');
  if (!select) return;
  const current = getDisplayTZChoice();
  select.innerHTML = DISPLAY_TZ_CHOICES.map(choice => {
    const zone = choice.id === '__local__'
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
      : choice.id;
    let suffix = '';
    try {
      const offset = tzOffsetMinutes(new Date(), zone);
      const sign = offset >= 0 ? '+' : '-';
      const abs = Math.abs(offset);
      suffix = offset === 0 ? ' (UTC)' : ` (UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? ':' + String(abs % 60).padStart(2, '0') : ''})`;
    } catch {}
    // Zones added in config.js carry no translation key; show the IANA name's
    // city part ('Australia/Sydney' → 'Sydney') so the option is still readable.
    const label = choice.key
      ? t(choice.key)
      : choice.id.split('/').pop().replace(/_/g, ' ');
    return `<option value="${choice.id}">${label}${suffix}</option>`;
  }).join('');
  select.value = current;
}

function applyDisplayTZ() {
  renderTZSelect();
  const badge = document.getElementById('tz-label');
  if (badge) badge.textContent = displayTZLabel();
  // The database stamp is a time like any other: it moves with the zone, and
  // its freshness badge is judged on the new zone's calendar day.
  if (state.baseStats?.version) renderDatasetStamp();
  if (state.rawFrames?.length) applyAdvancedFilters();
  // applyAdvancedFilters() re-renders the map/list but never the open drawer's
  // own text (its "Selected Date" and per-day group headings) — rebuild it in
  // place for the new zone, same fix as the stats bucket popup below.
  if (document.getElementById('drawer')?.classList.contains('open') && state.selectedFrameKey) {
    const selectedFrame = state.filteredFrames.find(frame => getFrameKey(frame) === state.selectedFrameKey);
    if (selectedFrame) openFrameDrawer(selectedFrame);
  }
  if (document.getElementById('stats-panel')?.classList.contains('open')) {
    renderStatsPanel();
    // The open bar popup lives outside the panel body, so renderStatsPanel
    // leaves it untouched — relabel its times for the new zone in place.
    refreshStatsBucketPopup();
  }
}

// Keyed 'DIRECTION|path' internally, but config.js uses the short track names
// ('A39') the chips and the rest of the UI show, so one name means one thing
// everywhere a user looks.
const NISAR_TRACK_COLORS = (() => {
  const byTrackKey = cfgMap('colors.nisarTracks', {
    'A39':  '#00e676',  // vivid green
    'A111': '#ffd740',  // amber — clearly distinct from green
    'D61':  '#f06292',  // rose/pink
    'D133': '#b388ff',  // lavender — distinct from pink and green
  });
  const out = {};
  for (const [key, color] of Object.entries(byTrackKey)) {
    const match = /^([AD])(\d+)$/.exec(key);
    if (!match) { cfgWarn(`colors.nisarTracks.${key}`, "a track name like 'A39'", key); continue; }
    out[`${match[1] === 'A' ? 'ASCENDING' : 'DESCENDING'}|${match[2]}`] = color;
  }
  return out;
})();

// NISAR granule-name code tables — https://nisar-docs.asf.alaska.edu/naming-conventions/
// NISAR_IL_PT_PROD_CYL_REL_P_FRM_MODE_POLE_S_Start_End_CRID_A_C_LOC_CTR.EXT
const NISAR_INSTRUMENT = { L: 'L-SAR', S: 'S-SAR' };
const NISAR_PROCESSING_TYPE = { PR: 'Production', UR: 'Urgent Response', OD: 'Science On-Demand' };
const NISAR_DIRECTION = { A: 'Ascending', D: 'Descending' };
const NISAR_SOURCE = { A: 'Acquired, single mode', M: 'Mixed source/mode' };
const NISAR_ACCURACY = { P: 'Precise', M: 'Medium', N: 'Near Real-Time', F: 'Forecast' };
const NISAR_COVERAGE = { F: 'Full', P: 'Partial' };
// Processing location. L-SAR products are produced at JPL; the S-SAR products
// ISRO released on 24 Jul 2026 are produced at NRSC and carry 'I'.
const NISAR_LOCATION = { J: 'JPL', I: 'ISRO' };
// POLE: two 2-char codes, one per band (primary then secondary).
const NISAR_POL = {
  SH: 'HH', SV: 'VV',
  DH: 'HH,HV', DV: 'VV,VH',
  CL: 'LH,LV', CR: 'RH,RV',
  QP: 'HH,HV,VV,VH',
  NA: '--',
};

// MODE: two 2-char bandwidth codes in MHz, one per band. '00' means the band
// is absent, so '2005' is a 20 MHz primary plus a 5 MHz secondary -> '20+5'.
function formatNisarBandwidth(raw) {
  const text = String(raw || '');
  if (!/^\d{4}$/.test(text)) return text || '--';
  const bands = [text.slice(0, 2), text.slice(2)]
    .map(code => parseInt(code, 10))
    .filter(mhz => Number.isFinite(mhz) && mhz > 0);
  // Rendered the way ASF reports rangeBandwidth, e.g. '20+5'.
  return bands.length ? bands.join('+') : '--';
}

function isNisarFrame(frame) {
  return String(frame?.satellite_id || frame?.platform || '').toUpperCase().includes('NISAR')
    || /^NISAR_/.test(String(frame?.granule || ''));
}

// NISAR flies two independent radars: L-SAR (NASA/JPL, distributed by ASF) and
// S-SAR (ISRO, released 24 Jul 2026 via Bhoonidhi). They share an overpass but
// are separate instruments with their own products, frame numbering and
// bandwidths, so band is a dimension of the *frame*, not of the satellite —
// hence a per-frame satellite_band rather than SATS' single `band`.
// Both catalogues report it as `sensor` ('L-SAR' / 'S-SAR'); the granule's
// second field is instrument+level ('L1', 'S2'), used when sensor is missing.
function getNisarBandCode(frame) {
  const sensor = String(frame?.sensor || '').toUpperCase();
  if (/^L[- ]?SAR/.test(sensor)) return 'L';
  if (/^S[- ]?SAR/.test(sensor)) return 'S';
  const code = (String(frame?.granule || '').split('_')[1] || '').slice(0, 1).toUpperCase();
  return NISAR_INSTRUMENT[code] ? code : '';
}

function getNisarBandLabel(frame) {
  return NISAR_INSTRUMENT[getNisarBandCode(frame)] || '';
}

// Radar band for any frame, in the instrument form the granule tables use:
// 'C-SAR' for Sentinel-1, 'L-SAR' / 'S-SAR' for NISAR's two radars. Providers
// already report this as `sensor`; `satellite_band` is the fallback for records
// that predate it (it carries the letter alone, e.g. 'C').
function getFrameBandLabel(frame) {
  if (isNisarFrame(frame)) return getNisarBandLabel(frame);
  const sensor = String(frame?.sensor || '').toUpperCase().match(/^([CLSXP])[-\s]?SAR/);
  if (sensor) return `${sensor[1]}-SAR`;
  const band = String(frame?.satellite_band || '').toUpperCase();
  return band ? `${band}-SAR` : '';
}

// Frame coverage and bandwidth come from ASF when available, otherwise from
// the granule name. Both are NISAR-only concepts.
function getNisarCoverage(frame) {
  if (frame?.frame_coverage) return frame.frame_coverage;
  const parts = String(frame?.granule || '').split('_');
  return parts.length >= 18 ? (NISAR_COVERAGE[parts[parts.length - 3]] || '') : '';
}

function getNisarBandwidth(frame) {
  if (frame?.range_bandwidth) return frame.range_bandwidth;
  const parts = String(frame?.granule || '').split('_');
  if (parts.length < 18) return '';
  return formatNisarBandwidth(parts[parts.length >= 20 ? 9 : 8]);
}

// NISAR data is published in staged releases, encoded in ASF's collection
// name (e.g. NISAR_L1_RSLC_BETA_V1 / ..._PROVISIONAL_V1):
//   BETA        — Feb 2026 release, uncalibrated
//   PROVISIONAL — 20 Jul 2026 release
// Read from the data rather than hardcoding dates, so later tiers (e.g. a
// validated release) surface automatically.
const NISAR_RELEASES = {
  BETA: { label: 'BETA', cls: 'beta', key: 'release-beta' },
  PROVISIONAL: { label: 'PROVISIONAL', cls: 'provisional', key: 'release-provisional' },
  URGENT: { label: 'URGENT', cls: 'urgent', key: 'release-urgent' },
};

function getNisarRelease(frame) {
  const source = `${frame?.collection || ''} ${frame?.granule || ''}`.toUpperCase();
  for (const code of Object.keys(NISAR_RELEASES)) {
    if (source.includes(code)) return { code, ...NISAR_RELEASES[code] };
  }
  return null;
}

// Granule names carry times as YYYYMMDDTHHMMSS (UTC).
function parseNisarCompactTime(text) {
  const match = String(text || '').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

// ASF frame number boundaries for Taiwan Sentinel-1 tracks.
// Derived from 7,458 S1D frames with real ASF frame numbers in sar_status.json.
// Each entry: [frameNumber, centroidLatMin, centroidLatMax].
// Boundaries are midpoints between consecutive observed centroid latitudes.
const S1_FRAME_BOUNDS = {
  // Derived from 7,458 S1D frames with real ASF frame numbers.
  // Entries outside the data pipeline's centroid filter [21.5°N, 26.85°N] are excluded.
  69:  [[67,-90,22.2996],[68,22.2996,22.5913],[69,22.5913,22.8486],[70,22.8486,23.3083],
        [72,23.3083,23.7279],[73,23.7279,24.0092],[74,24.0092,24.4004],[75,24.4004,24.6586],
        [76,24.6586,24.8885],[77,24.8885,25.1634],[78,25.1634,25.4491],[79,25.4491,25.9079],
        [80,25.9079,26.1423],[81,26.1423,26.3785],[82,26.3785,26.8096],[83,26.8096,90]],
  105: [[519,-90,21.8741],[520,21.8741,22.1642],[518,22.1642,22.4710],[517,22.4710,22.6341],
        [516,22.6341,22.7911],[515,22.7911,23.1575],[514,23.1575,23.7068],[512,23.7068,24.2813],
        [510,24.2813,24.7382],[509,24.7382,25.1248],[508,25.1248,25.4216],[507,25.4216,25.5620],
        [506,25.5620,26.2088],[503,26.2088,90]],
  142: [[67,-90,22.7372],[70,22.7372,23.5984],[73,23.5984,24.0831],[74,24.0831,24.4701],
        [75,24.4701,24.7944],[76,24.7944,25.1725],[78,25.1725,25.5995],[79,25.5995,25.7771],
        [80,25.7771,26.0988],[81,26.0988,90]],
  171: [[75,-90,24.4291],[74,24.4291,24.9538],[78,24.9538,25.8055],[80,25.8055,26.1989],
        [81,26.1989,90]],
};

function platColor(platform) {
  const p = (platform||'').toUpperCase();
  for (const k of Object.keys(PLATFORM_COLORS)) {
    if (p.startsWith(k.toUpperCase())) return PLATFORM_COLORS[k];
  }
  return PLATFORM_COLORS._default;
}

function isOpenDataSatelliteId(id) {
  return OPEN_DATA_SATELLITES.has(String(id || '').toUpperCase());
}

function isSentinelSatelliteId(id) {
  return SENTINEL_SATELLITES.has(String(id || '').toUpperCase());
}

function getFramePathNumber(frame) {
  return normalizeFrameNumber(frame.path_number) ?? normalizeFrameNumber(frame.orbit);
}

function getTrackLabelForFrame(frame) {
  const satId = String(frame.satellite_id || frame.platform || '').toUpperCase();
  const direction = normalizeDirection(frame.direction_norm || frame.direction);
  const pathNumber = getFramePathNumber(frame);

  if (satId.includes('NISAR')) return 'NISAR';
  if (isSentinelSatelliteId(satId)) {
    if (direction === 'ASCENDING' && pathNumber === 69) return 'A69';
    if (direction === 'DESCENDING' && pathNumber === 105) return 'D105';
    return 'OTHER_S1';
  }
  return 'OTHER';
}

function getFrameVisualInfo(frame) {
  const satelliteId = String(frame?.satellite_id || frame?.platform || '').toUpperCase();
  const direction = normalizeDirection(frame?.direction_norm || frame?.direction);
  const pathNumber = getFramePathNumber(frame);

  if (satelliteId.includes('NISAR')) {
    const key = `${direction}|${pathNumber ?? ''}`;
    const shortDir = direction === 'ASCENDING' ? 'A' : direction === 'DESCENDING' ? 'D' : 'N';
    return {
      label: `NISAR ${shortDir}${pathNumber ?? '--'}`,
      color: NISAR_TRACK_COLORS[key] || '#00e676',
    };
  }

  const rawLabel = frame?.track_label || frame?.satellite_name || frame?.platform || frame?.satellite_id || 'Other';
  // Name the mission the way the NISAR entries do, so the legend reads
  // "S1 A69" / "NISAR D133" rather than a bare track code.
  const label = rawLabel === 'OTHER_S1'
    ? 'Other Sentinel-1 tracks'
    : (rawLabel === 'A69' || rawLabel === 'D105') ? `S1 ${rawLabel}` : rawLabel;
  const color = rawLabel === 'A69'
    ? '#00e5ff'
    : rawLabel === 'D105'
      ? '#ff7043'
      : rawLabel === 'NISAR'
        ? '#00e676'
        : platColor(frame?.platform || frame?.satellite_name);

  return { label, color };
}

// ── Taiwan outline (simplified) ───────────────────────────────────────────
const TW_OUTLINE = [
  [25.30,121.50],[25.08,121.88],[24.60,121.78],[23.98,121.60],
  [23.42,121.49],[22.80,121.18],[22.00,120.87],[21.90,120.73],
  [22.31,120.25],[22.76,120.19],[23.48,119.57],[23.70,119.65],
  [24.00,120.05],[24.80,121.00],[25.30,121.50]
];

// ── APP STATE ─────────────────────────────────────────────────────────────
let state = {
  frames: [],
  tab:    'all',
  band:   'ALL',
  lang:   localStorage.getItem('lang') || cfgStr('ui.language', 'en', ['en', 'zh-TW']),
  map:    null,
  frameLayer: null,
  selectedSat: null,
  selectedFrameKey: null,
  framePolygons: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// MAP INIT
// ═══════════════════════════════════════════════════════════════════════════
function initMap() {
  const center = cfgList('map.center', [23.5, 121],
    n => typeof n === 'number' && Number.isFinite(n));
  state.map = L.map('map', {
    center: center.length === 2 ? center : [23.5, 121],
    zoom: cfgNum('map.zoom', 6, { min: 1, max: 19 }),
    zoomControl:true, attributionControl:false,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: cfgNum('map.basemapMaxZoom', 19, { min: 1, max: 22 }),
  }).addTo(state.map);

  // Taiwan outline
  L.polygon(TW_OUTLINE, { color:'#00e5ff', weight:1, fillColor:'#00e5ff', fillOpacity:.04, dashArray:'4 3' }).addTo(state.map);

  state.frameLayer = L.layerGroup().addTo(state.map);

  // Deselect when clicking map background
  state.map.on('click', () => {
    if (state.selectedFrameKey) {
      state.selectedFrameKey = null;
      if (typeof updateMapSelectionState === 'function') updateMapSelectionState();
      closeDrawer();
    }
  });
}

function getFrameLatLngBounds(frame) {
  const geom = frame?.footprint;
  if (!geom || geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) return null;
  const points = [];
  for (const ring of geom.coordinates) {
    for (const coord of ring || []) {
      if (Array.isArray(coord) && coord.length >= 2) points.push([coord[1], coord[0]]);
    }
  }
  return points.length ? L.latLngBounds(points) : null;
}

function focusMapOnFrames(frames, options = {}) {
  if (!state.map || !Array.isArray(frames) || !frames.length) return;
  const boundsList = frames.map(getFrameLatLngBounds).filter(Boolean);
  if (!boundsList.length) return;

  const combined = boundsList[0];
  for (let i = 1; i < boundsList.length; i++) combined.extend(boundsList[i]);

  state.map.fitBounds(combined.pad(options.pad ?? 0.18), {
    maxZoom: options.maxZoom ?? 9,
    animate: options.animate ?? true,
    paddingTopLeft: options.paddingTopLeft ?? [16, 16],
    paddingBottomRight: options.paddingBottomRight ?? [options.withDrawer ? 420 : 16, 110],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════
function ldmsg(msg) {
  const el = document.getElementById('ld-msg');
  if (el) el.textContent = msg;
}


// ═══════════════════════════════════════════════════════════════════════════
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  state.selectedSat = null;
  state.selectedFrameKey = null;
  if (typeof updateMapSelectionState === 'function') updateMapSelectionState();
  document.querySelectorAll('.sat-row').forEach(r => r.classList.remove('active'));
  updateLegend();
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERS / TABS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════
const _PRODUCT_TYPE_CFG = cfgMap('filters.productTypes', {
  default: ['SLC', 'RSLC'],
  ALL: ['SLC', 'RSLC'],
  NISAR: ['GSLC', 'RSLC'],
  S1A: ['SLC'],
  S1B: ['SLC'],
  S1C: ['SLC'],
  S1D: ['SLC'],
});
const DEFAULT_PRODUCT_TYPES = cfgList('filters.productTypes.default', ['SLC','RSLC'],
  v => typeof v === 'string');
const DEFAULT_PRODUCT_TYPES_BY_SATELLITE = Object.fromEntries(
  Object.entries(_PRODUCT_TYPE_CFG)
    .filter(([satId, types]) => {
      if (satId === 'default') return false;   // read separately, above
      if (Array.isArray(types) && types.length && types.every(v => typeof v === 'string')) return true;
      cfgWarn(`filters.productTypes.${satId}`, 'a non-empty list of type names', types);
      return false;
    })
);
// RIFG / RUNW / ROFF / GOFF are the interferometric and pixel-offset products
// ISRO ships for NISAR's S-band; ASF's L-band catalogue publishes none of them.
const KNOWN_PRODUCT_TYPES = ['L1_RSLC', 'L1_GSLC', 'L1_RIFG', 'L1_RUNW', 'L1_ROFF', 'L2_GCOV', 'L2_GUNW', 'L2_GOFF', 'L3_SME2', 'GSLC', 'RSLC', 'SLC', 'GRD_HD', 'GRD_MS', 'GRD_HS', 'GRD_FD', 'GRD', 'GCOV', 'GUNW', 'GOFF', 'RIFG', 'RUNW', 'ROFF', 'SME2', 'RAW', 'SSC', 'OCN', 'ETAD', 'COH12'];

function ensureAdvancedState() {
  state.rawFrames ||= [];
  state.filteredFrames ||= [];
  state.baseStats ||= null;
  state.framePolygons ||= [];
  state.selectedFrameKey ||= null;
  state.cache ||= {
    satelliteCounts: new Map(),
    satellitesWithFrames: new Set(),
  };
  state.ui ||= {
    theme: cfgStr('ui.theme', 'soft-slate', [...THEME_OPTIONS]),
    fontSize: cfgStr('ui.fontSize', '4', [...FONT_SIZE_OPTIONS]),
  };
  state.filters ||= {
    satellite: cfgStr('filters.satellite', 'ALL'),
    direction: cfgStr('filters.direction', 'ALL', ['ALL', 'ASCENDING', 'DESCENDING']),
    showSameTrackInDrawer: false,
    showOtherSentinelTracks: false,
    pathMin: '',
    pathMax: '',
    frameMin: '',
    frameMax: '',
    dateStart: '',
    dateEnd: '',
    // Product types are tracked per mission: the two catalogues share no
    // product types, so one combined Set would let a Sentinel-1 selection
    // filter out every NISAR frame (and vice versa).
    formats: new Set(),
    nisarFormats: new Set(),
    nisarCoverage: new Set(),
    nisarBandwidth: new Set(),
    nisarBand: new Set(),
    // Which chip groups have had their defaults applied. Defaults are seeded
    // exactly once so that deselecting every chip in a group stays deselected
    // instead of snapping back on.
    seeded: new Set(),
  };
  if (!(state.filters.seeded instanceof Set)) state.filters.seeded = new Set();
  for (const key of ['formats', 'nisarFormats', 'nisarCoverage', 'nisarBandwidth', 'nisarBand']) {
    if (!(state.filters[key] instanceof Set)) {
      state.filters[key] = new Set(state.filters[key] || []);
    }
  }
}

// Per-satellite extent of the WHOLE catalog, independent of the date window.
//
// The satellite dropdown used to be built from the *filtered* frames, so with
// the default 7-day window a retired mission had zero rows, never appeared as
// an option, and none of its archive could be queried at all — S1B carries
// ~2 600 Taiwan frames from 2016–2021 that were simply unreachable. The
// dropdown is now built from this index instead, and picking a satellite whose
// data sits outside the window moves the window onto it (see
// snapDateWindowToSatellite).
//
// Timestamps are kept sorted per satellite so "does this satellite have data in
// the current window?" is a binary search rather than a displayDateKey() call
// per frame — S1A alone carries >12 000, and each key costs an Intl format.
//
// Cached against the rawFrames array identity: rawFrames is replaced wholesale
// when a dataset lands, and never mutated in place. Timestamps are zone-free,
// so this cache survives a display-timezone change.
function getSatelliteCatalogIndex() {
  const frames = state.rawFrames || [];
  const cached = getSatelliteCatalogIndex.cache;
  if (cached && cached.source === frames) return cached.index;

  const byId = new Map();
  for (const frame of frames) {
    const id = frame.satellite_id;
    if (!id || !frame.date) continue;
    const ts = Date.parse(frame.date);
    if (Number.isNaN(ts)) continue;
    let times = byId.get(id);
    if (!times) byId.set(id, times = []);
    times.push(ts);
  }

  const index = new Map();
  for (const [id, times] of byId) {
    times.sort((a, b) => a - b);
    index.set(id, {
      count: times.length,
      times,
      first: times[0],
      last: times[times.length - 1],
    });
  }
  getSatelliteCatalogIndex.cache = { source: frames, index };
  return index;
}

// The current date window as a half-open instant range [from, to). Derived from
// the same display-zone day boundaries frameMatchesAdvancedFilters compares
// against, but resolved once so frame timestamps can be tested numerically.
function getDateWindowRange() {
  ensureAdvancedState();
  const parseKey = key => {
    const parts = String(key || '').split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
  };
  const startParts = parseKey(state.filters.dateStart);
  const endParts = parseKey(state.filters.dateEnd);
  return {
    from: startParts
      ? fromDisplayParts(startParts[0], startParts[1] - 1, startParts[2]).getTime()
      : -Infinity,
    // Exclusive: the window's last day runs up to the next display midnight.
    to: endParts
      ? fromDisplayParts(endParts[0], endParts[1] - 1, endParts[2] + 1).getTime()
      : Infinity,
  };
}

function satelliteHasFramesInWindow(satelliteId) {
  const entry = getSatelliteCatalogIndex().get(satelliteId);
  if (!entry) return false;
  const { from, to } = getDateWindowRange();
  // Sorted, so the earliest timestamp at or after `from` settles it.
  let lo = 0, hi = entry.times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (entry.times[mid] < from) lo = mid + 1;
    else hi = mid;
  }
  return lo < entry.times.length && entry.times[lo] < to;
}

// How many display-zone days the current window spans.
function getDateWindowDays() {
  const start = parseDateInputValue(state.filters.dateStart);
  const end = parseDateInputValue(state.filters.dateEnd);
  if (!start || !end) return cfgNum('filters.dateWindowDays', 7, { min: 1, max: 3650 });
  return Math.max(1, Math.round((end - start) / 864e5) + 1);
}

// Write a date window to both state and the two inputs. All window changes go
// through here so the preset buttons' active state is never left stale.
function setDateWindow(startKey, endKey) {
  ensureAdvancedState();
  state.filters.dateStart = startKey;
  state.filters.dateEnd = endKey;
  const startInput = document.getElementById('filter-date-start');
  const endInput = document.getElementById('filter-date-end');
  if (startInput) startInput.value = startKey;
  if (endInput) endInput.value = endKey;
  updateDateShortcutState();
}

// Move the date window onto a satellite's own data when the current window
// holds none of it. Returns true when the window was moved. Without this,
// selecting a retired mission just empties the map with no explanation.
function snapDateWindowToSatellite(satelliteId) {
  if (!satelliteId || satelliteId === 'ALL') return false;
  const entry = getSatelliteCatalogIndex().get(satelliteId);
  if (!entry || satelliteHasFramesInWindow(satelliteId)) return false;

  // A retired mission has one meaningful window — its whole life — and no
  // "recent" data to slide onto, so open the full archive. S1B flew Oct 2016 to
  // Dec 2021 and its ~2 600 Taiwan frames are only reachable this way.
  if (SATS.find(sat => sat.id === satelliteId)?.status === 'ret') {
    setDateWindow(displayDateKey(entry.first), displayDateKey(entry.last));
    return true;
  }

  // An active satellite that simply has not passed inside this window: keep the
  // window's length and slide it onto the newest acquisition, so the user's
  // chosen zoom level survives.
  const end = toDisplayDate(entry.last);
  const start = new Date(end);
  start.setDate(start.getDate() - (getDateWindowDays() - 1));
  setDateWindow(formatDateInputValue(start), formatDateInputValue(end));
  return true;
}

// The newest data the current satellite selection actually has. The date
// presets anchor here rather than on the dataset end, so "This Week" / "1 Year"
// mean the last week / year of a retired mission's life instead of a window
// relative to today that is empty forever.
function getWindowAnchorDate() {
  ensureAdvancedState();
  const datasetEnd = getQueryEndDate();
  const id = state.filters.satellite;
  if (!id || id === 'ALL') return datasetEnd;
  const entry = getSatelliteCatalogIndex().get(id);
  if (!entry) return datasetEnd;
  const last = new Date(entry.last);
  if (Number.isNaN(last.getTime())) return datasetEnd;
  return last < datasetEnd ? last : datasetEnd;
}

function rebuildFrameCaches() {
  ensureAdvancedState();
  const satelliteCounts = new Map();
  const satellitesWithFrames = new Set();

  for (const frame of state.filteredFrames) {
    const id = frame.satellite_id || '';
    if (!id) continue;
    satelliteCounts.set(id, (satelliteCounts.get(id) || 0) + 1);
    satellitesWithFrames.add(id);
  }

  state.cache.satelliteCounts = satelliteCounts;
  state.cache.satellitesWithFrames = satellitesWithFrames;
}

function isFeaturedSatellite(sat) {
  return FEATURED_SATELLITES.has(sat.id) && isOpenDataSatelliteId(sat.id);
}

function getThemeValue(raw) {
  return THEME_OPTIONS.has(raw) ? raw : 'soft-slate';
}

function getFontSizeValue(raw) {
  return FONT_SIZE_OPTIONS.has(String(raw)) ? String(raw) : '4';
}

function applyAppearanceSettings() {
  ensureAdvancedState();
  state.ui.theme = getThemeValue(state.ui.theme);
  state.ui.fontSize = getFontSizeValue(state.ui.fontSize);
  document.documentElement.dataset.theme = state.ui.theme;
  document.documentElement.style.setProperty('--font-bump', `${state.ui.fontSize}px`);
}

function syncAppearanceControls() {
  renderTZSelect();
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = getThemeValue(state.ui.theme);
  const sizeVal = document.getElementById('size-val');
  if (sizeVal) sizeVal.textContent = getFontSizeValue(state.ui.fontSize);
  const idx = FONT_SIZE_STEPS.indexOf(Number(state.ui.fontSize));
  const dec = document.getElementById('size-dec');
  const inc = document.getElementById('size-inc');
  if (dec) dec.disabled = idx <= 0;
  if (inc) inc.disabled = idx >= FONT_SIZE_STEPS.length - 1;
}

function stepFontSize(dir) {
  const idx = FONT_SIZE_STEPS.indexOf(Number(state.ui.fontSize));
  const next = FONT_SIZE_STEPS[Math.max(0, Math.min(FONT_SIZE_STEPS.length - 1, idx + dir))];
  state.ui.fontSize = String(next);
  applyAppearanceSettings();
  syncAppearanceControls();
}

function bindAppearanceControls() {
  document.getElementById('theme-select')?.addEventListener('change', event => {
    state.ui.theme = getThemeValue(event.target.value);
    applyAppearanceSettings();
    renderFrames();
  });

  // size-dec / size-inc use onclick in HTML
}

function setupReadableUI() {
  document.title = 'SAR Tracker';
  const logo = document.querySelector('.hdr-logo');
  if (logo) {
    logo.textContent = 'SAR Tracker';
    logo.title = 'Cycle title font';
    logo.onclick = cycleTitleFont;
    applyTitleFont();
  }

  const hdrStatus = document.querySelector('.hdr-status');
  if (hdrStatus) {
    const prevTime = document.getElementById('hdr-time')?.textContent || 'database: --';
    hdrStatus.innerHTML = `<b id="hdr-time">${prevTime}</b>&nbsp;·&nbsp;ASF DAAC &amp; Copernicus CDSE`;
  }

  syncViewModeControl();

  const sbHead = document.querySelector('.sb-head h2');
  if (sbHead) sbHead.textContent = t('sat-fleet');
  const sbCount = document.getElementById('sb-count');
  if (sbCount && !state.rawFrames.length) sbCount.textContent = t('waiting-inventory');

  const loadingText = document.querySelector('.ld-txt');
  if (loadingText) loadingText.textContent = 'SAR TRACKER';
  const loadingSub = document.getElementById('ld-msg');
  if (loadingSub && !loadingSub.textContent.trim()) loadingSub.textContent = t('loading-inventory');

  const statLabels = document.querySelectorAll('.map-stats .lbl');
  if (statLabels[0]) statLabels[0].textContent = t('filtered-frames');
  if (statLabels[1]) statLabels[1].textContent = t('active-satellites');
  if (statLabels[2]) statLabels[2].textContent = t('query-window');

  const statsWrap = document.querySelector('.map-stats');
  if (statsWrap && !document.getElementById('st-next')) {
    const card = document.createElement('div');
    card.className = 'stat-card stat-card--next';
    card.innerHTML = `<div class="lbl" id="st-next-label">${t('latest-tracks')}</div><div class="val" id="st-next">${t('need-history')}</div>`;
    statsWrap.appendChild(card);
  } else {
    const nextLabel = document.getElementById('st-next-label');
    if (nextLabel && nextLabel.dataset.latestKey) nextLabel.textContent = t(nextLabel.dataset.latestKey);
  }

  const legend = document.querySelector('.map-legend');
  if (legend) legend.innerHTML = `<div class="legend-title">${t('visible-data')}</div><div id="legend-items"></div>`;

  const section = document.querySelector('.d-section');
  if (section) section.textContent = t('selected-files');
}

function rebuildDownloadBar() {
  const dlBar = document.querySelector('.dl-bar');
  if (!dlBar) return;
  dlBar.innerHTML = `
    <div class="dl-main">
      <span class="dl-label">${t('filtered-downloads')}</span>
      <span class="dl-count" id="dl-info">0 files</span>
    </div>
    <button class="dl-btn csv export-toggle" id="btn-export-toggle" type="button" onclick="toggleExportPanel()">${t('export')}</button>
    <div class="export-panel" id="export-panel">
      <div class="export-card wide">
        <div class="k">${t('current-selection')}</div>
        <div class="export-actions">
          <button class="dl-btn asf" id="btn-copy-urls" type="button" onclick="copyFilteredUrls()">${t('copy-all-links')}</button>
          <button class="dl-btn csv" id="btn-csv" type="button" onclick="exportCSV()">${t('csv-export')}</button>
        </div>
      </div>
      <div class="export-card">
        <div class="k">ASF</div>
        <div class="export-actions">
          <button class="dl-btn asf" id="btn-asf" type="button" onclick="downloadMeta4('ASF')">ASF .meta4</button>
        </div>
      </div>
      <div class="export-card">
        <div class="k">Copernicus</div>
        <div class="export-actions">
          <button class="dl-btn cop" id="btn-cop" type="button" onclick="downloadMeta4('Copernicus')">CDSE .meta4</button>
        </div>
      </div>
    </div>
  `;
}

function toggleExportPanel(force) {
  const panel = document.getElementById('export-panel');
  if (!panel) return;
  const next = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  panel.classList.toggle('open', next);
}

function normalizeDirection(value) {
  const text = String(value || '').toUpperCase();
  if (text.startsWith('A')) return 'ASCENDING';
  if (text.startsWith('D')) return 'DESCENDING';
  return 'UNKNOWN';
}

function normalizeFrameNumber(value) {
  const num = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(num) ? num : null;
}

function normalizeProductType(frame) {
  const candidates = [frame.product_type, frame.processing_level, frame.processingLevel, frame.granule];
  for (const raw of candidates) {
    const text = String(raw || '').toUpperCase().replace('.SAFE', '');
    if (!text) continue;
    for (const item of KNOWN_PRODUCT_TYPES) {
      if (text.includes(item)) return item;
    }
  }
  return 'OCN';
}

// Every band a satellite carries. Only NISAR declares more than one.
function satBands(sat) {
  return Array.isArray(sat?.bands) && sat.bands.length ? sat.bands : [sat?.band].filter(Boolean);
}

function satMatchesFrame(sat, frame) {
  const haystack = [frame.platform, frame.granule, frame.satellite_name, frame.satellite_id].join(' ').toUpperCase();
  const names = [sat.id, sat.name, ...(sat.asf_prefix || [])].map(v => String(v || '').toUpperCase());
  return names.some(name => name && haystack.includes(name));
}

function getSatForFrame(frame) {
  return SATS.find(sat => satMatchesFrame(sat, frame)) || null;
}

// Copernicus occasionally reports a footprint as a one-part MultiPolygon.
// Only Polygon is rendered, so normalise rather than silently dropping the
// frame from the map while it still counts in filters and stats.
// NISAR has no sizeMB; it reports a `bytes` map of every delivered file.
// Use the HDF5 science product, not the browse PNGs.
function nisarSizeMB(bytes) {
  if (!bytes || typeof bytes !== 'object') return 0;
  let best = 0;
  for (const [name, info] of Object.entries(bytes)) {
    if (!info || typeof info !== 'object') continue;
    const isH5 = String(info.format || '').toUpperCase() === 'HDF5' || /\.h5$/i.test(name);
    if (isH5) best = Math.max(best, Number(info.bytes) || 0);
  }
  return +(best / 1e6).toFixed(1);
}

function normalizeFootprint(geometry) {
  if (!geometry || geometry.type !== 'MultiPolygon' || !Array.isArray(geometry.coordinates)) return geometry;
  const parts = geometry.coordinates.filter(part => Array.isArray(part) && part[0]);
  if (!parts.length) return geometry;
  const largest = parts.reduce((a, b) => (b[0].length > a[0].length ? b : a));
  return { type: 'Polygon', coordinates: largest };
}

function enhanceFrame(frame) {
  const sat = getSatForFrame(frame) || {};
  const satelliteId = sat.id || frame.platform || 'UNKNOWN';
  const directionNorm = normalizeDirection(frame.direction);
  const pathNumberNorm = getFramePathNumber(frame);
  const frameNumberNorm = normalizeFrameNumber(frame.frame_number);

  // Reconstruct footprint from fp flat array
  let footprint = normalizeFootprint(frame.footprint);
  if (frame.fp && Array.isArray(frame.fp)) {
    const ring = [];
    for (let i = 0; i < frame.fp.length; i += 2) {
      ring.push([frame.fp[i], frame.fp[i+1]]);
    }
    if (ring.length > 0) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    footprint = {
      type: 'Polygon',
      coordinates: [ring]
    };
  }

  const enriched = {
    ...frame,
    satellite_id: satelliteId,
    satellite_name: sat.name || frame.platform || 'Unknown',
    // NISAR's two radars are filed under one satellite, so the band has to come
    // from the frame; every other mission carries a single band.
    satellite_band: (isNisarFrame(frame) ? getNisarBandCode(frame) : '') || sat.band || '',
    sat_status: sat.status || '',
    direction_norm: directionNorm,
    path_number_norm: pathNumberNorm,
    frame_number_norm: frameNumberNorm,
    product_type_norm: normalizeProductType(frame),
    footprint: footprint,
    copernicus_url: frame.copernicus_url || frame.download_url || '',
    download_url: frame.download_url || frame.copernicus_url || '',
  };
  const trackLabel = getTrackLabelForFrame(enriched);
  return {
    ...enriched,
    track_label: trackLabel,
    is_open_data: isOpenDataSatelliteId(satelliteId),
    is_priority_track: trackLabel === 'A69' || trackLabel === 'D105' || trackLabel === 'NISAR',
  };
}

function getFrameTimestamp(frame) {
  const timestamp = new Date(frame?.date || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function findNearestFrameWithValue(frames, sourceFrame, predicate, maxDiffMs = 120000) {
  const sourceTime = getFrameTimestamp(sourceFrame);
  let best = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const frame of frames) {
    if (frame === sourceFrame || !predicate(frame)) continue;

    const frameTime = getFrameTimestamp(frame);
    const diff = sourceTime === null || frameTime === null ? 0 : Math.abs(frameTime - sourceTime);
    if (diff > maxDiffMs) continue;
    if (diff < bestDiff) {
      best = frame;
      bestDiff = diff;
    }
  }

  return best;
}

function reconcileFrameMetadata(frames) {
  const pathGroups = new Map();
  const productGroups = new Map();

  for (const frame of frames) {
    const pathKey = [
      frame.satellite_id || '',
      frame.direction_norm || '',
      getFramePathNumber(frame) ?? '',
      frame.mode || '',
    ].join('|');
    if (!pathGroups.has(pathKey)) pathGroups.set(pathKey, []);
    pathGroups.get(pathKey).push(frame);

    const productKey = `${pathKey}|${frame.product_type_norm || ''}`;
    if (!productGroups.has(productKey)) productGroups.set(productKey, []);
    productGroups.get(productKey).push(frame);
  }

  for (const frame of frames) {
    const pathKey = [
      frame.satellite_id || '',
      frame.direction_norm || '',
      getFramePathNumber(frame) ?? '',
      frame.mode || '',
    ].join('|');
    const productKey = `${pathKey}|${frame.product_type_norm || ''}`;
    const samePathFrames = pathGroups.get(pathKey) || [];
    const sameProductFrames = productGroups.get(productKey) || [];

    if (!frame.asf_url) {
      const asfMatch = findNearestFrameWithValue(
        sameProductFrames,
        frame,
        candidate => !!candidate.asf_url
      );
      if (asfMatch?.asf_url) frame.asf_url = asfMatch.asf_url;
    }

    if (frame.frame_number_norm === null) {
      const exactMatch = findNearestFrameWithValue(
        sameProductFrames,
        frame,
        candidate => candidate.frame_number_norm !== null
      );
      const fallbackMatch = exactMatch || findNearestFrameWithValue(
        samePathFrames,
        frame,
        candidate => candidate.frame_number_norm !== null
      );
      if (fallbackMatch && fallbackMatch.frame_number_norm !== null) {
        frame.frame_number_norm = fallbackMatch.frame_number_norm;
      }
    }
  }

  return frames;
}

function getDatasetFreshness(data = {}) {
  const candidates = [data.query_end, data.last_successful_fetch, data.updated_at];
  for (const value of candidates) {
    const ts = Date.parse(value);
    if (!Number.isNaN(ts)) return ts;
  }
  const versionMatch = String(data.version || '').match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (versionMatch) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = versionMatch;
    return Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss);
  }
  return 0;
}

function getDatasetFrameCount(data = {}) {
  return Number.isFinite(data.total_frames)
    ? data.total_frames
    : (Array.isArray(data.taiwan_frames) ? data.taiwan_frames.length : 0);
}

function shouldApplyFullDataset(data) {
  if (!Array.isArray(data?.taiwan_frames) || !data.taiwan_frames.length) return false;
  const current = state.baseStats || {};
  if (!current.version) return true;

  const incomingFreshness = getDatasetFreshness(data);
  const currentFreshness = getDatasetFreshness(current);
  if (incomingFreshness && currentFreshness && incomingFreshness < currentFreshness) {
    console.warn('[Data] Ignoring older full dataset cache:', data.version, '<', current.version);
    return false;
  }

  return getDatasetFrameCount(data) >= getDatasetFrameCount(current) ||
         data.taiwan_frames.length > (current.taiwan_frames?.length || 0);
}

function applyFrameData(data, options = {}) {
  if (!Array.isArray(data.taiwan_frames)) return;
  state.baseStats = data;
  renderDatasetStamp(data);
  state.rawFrames = reconcileFrameMetadata(
    data.taiwan_frames.map(enhanceFrame).filter(frame => frame.is_open_data)
  );
  applyTabDateWindow();
  bindAdvancedControls();
  renderSatelliteSelect();
  if (options.preserveFilters) renderFormatOptions();
  else resetAdvancedFilters(false);
  applyAdvancedFilters();
}

// data/sar_status.js is a JS assignment (`window.__SAR_DATA={...};`) rather
// than plain JSON so that ONE file can serve both entry points: a page opened
// from disk cannot fetch() a local .json — Chrome gives every file:// its own
// opaque origin — but it can always load a <script>. The web path therefore
// fetches this same file and peels the wrapper off, which keeps the streaming
// progress bar that a <script> tag could never provide.
// Keep the prefix in sync with the writer in fetch_sar_data.py.
const SAR_DATA_PREFIX = 'window.__SAR_DATA=';

function unwrapSarData(text) {
  let body = text.trimStart();
  if (!body.startsWith(SAR_DATA_PREFIX)) {
    // Not the expected wrapper — most likely a plain-JSON build, so try it as
    // JSON rather than failing outright.
    return JSON.parse(body);
  }
  body = body.slice(SAR_DATA_PREFIX.length).trimEnd();
  if (body.endsWith(';')) body = body.slice(0, -1);
  return JSON.parse(body);
}

async function loadData() {
  ensureAdvancedState();

  // ── file:// local clone — load the full JS bundle synchronously ──────────
  if (location.protocol === 'file:') {
    if (!window.__SAR_DATA) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = './data/sar_status.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('sar_status.js load failed'));
        document.head.appendChild(s);
      });
    }
    document.getElementById('loading')?.classList.add('gone');
    applyFrameData(window.__SAR_DATA || {});
    return;
  }

  // ── Web: Phase 1 — load recent frames first for instant display ──────────
  // sar_recent.json is only the last 14 days (~50–200 KB), loads in < 1 s.
  let phase1ok = false;
  try {
    const res = await fetch('./data/sar_recent.json', { cache: 'no-cache' });
    if (res.ok) {
      document.getElementById('loading')?.classList.add('gone');
      const data = await res.json();
      if (Array.isArray(data.taiwan_frames) && data.taiwan_frames.length) {
        applyFrameData(data);
        phase1ok = true;
      }
    }
  } catch (_) { /* fall through to full load */ }

  if (!phase1ok) document.getElementById('loading')?.classList.add('gone');

  // ── Phase 2 — upgrade to full historical dataset in background ───────────
  // Runs without await so the user can interact immediately.
  (async () => {
    const bgEl = document.getElementById('bg-load-bar');
    const showBar = pct => { if (bgEl) { bgEl.hidden = false; bgEl.style.width = Math.min(100, pct) + '%'; } };
    const hideBar = ()  => { if (bgEl) { bgEl.style.width = '100%'; bgEl.classList.add('done'); setTimeout(() => { bgEl.hidden = true; bgEl.style.width = '0%'; bgEl.classList.remove('done'); }, 400); } };
    try {
      const loadedVersion = state.baseStats?.version;
      const fullUrl = loadedVersion
        ? `./data/sar_status.js?v=${encodeURIComponent(loadedVersion)}`
        : './data/sar_status.js';
      const res = await fetch(fullUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let data;
      if (total > 0 && res.body) {
        let loaded = 0;
        const chunks = [];
        const reader = res.body.getReader();
        showBar(0);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          showBar(Math.round(100 * loaded / total));
        }
        const full = new Uint8Array(loaded);
        let off = 0;
        for (const c of chunks) { full.set(c, off); off += c.length; }
        data = unwrapSarData(new TextDecoder().decode(full));
      } else {
        // No content-length (or no streaming body) — read it in one go. Still
        // the wrapped file, so it cannot go through res.json().
        data = unwrapSarData(await res.text());
      }
      hideBar();
      // Replace the recent bootstrap only with a full dataset that is at least
      // as fresh as the data already on screen. This avoids cached historical
      // JSON downgrading Stats after sar_recent.json has updated.
      if (shouldApplyFullDataset(data)) {
        applyFrameData(data, { preserveFilters: phase1ok });
      }
    } catch (error) {
      hideBar();
      console.warn('Full dataset unavailable:', error);
      if (!state.rawFrames?.length) await liveFetchASF();
    }
  })();
}


function matchesSidebarFilters(sat) {
  ensureAdvancedState();
  if (!isOpenDataSatelliteId(sat.id)) return false;
  // Multi-band satellites (NISAR: L-SAR + S-SAR) must stay listed under either
  // band chip, so match against every band the satellite carries.
  if (state.band !== 'ALL' && !satBands(sat).includes(state.band)) return false;
  if (state.tab === 'op' && sat.status === 'ret') return false;
  if (state.tab === 'tw') return state.filteredFrames.some(frame => satMatchesFrame(sat, frame));
  return true;
}

function bindAdvancedControls() {
  if (bindAdvancedControls.done) return;
  bindAdvancedControls.done = true;

  document.getElementById('filter-satellite')?.addEventListener('change', event => {
    state.filters.satellite = event.target.value;
    state.selectedSat = SATS.find(s => s.id === state.filters.satellite) || null;
    // A retired mission's data sits outside any recent window; move the window
    // onto it rather than showing an empty map.
    snapDateWindowToSatellite(state.filters.satellite);
    renderFormatOptions();
    applyAdvancedFilters();
  });

  document.getElementById('filter-direction')?.addEventListener('change', event => {
    state.filters.direction = event.target.value;
    applyAdvancedFilters();
  });

  document.getElementById('filter-show-other-tracks')?.addEventListener('change', event => {
    state.filters.showOtherSentinelTracks = !!event.target.checked;
    applyAdvancedFilters();
  });

  document.getElementById('filter-show-same-track')?.addEventListener('change', event => {
    state.filters.showSameTrackInDrawer = !!event.target.checked;
    if (state.selectedFrameKey) {
      const selectedFrame = state.filteredFrames.find(frame => getFrameKey(frame) === state.selectedFrameKey);
      if (selectedFrame) openFrameDrawer(selectedFrame);
    }
  });

  for (const id of ['filter-frame-min', 'filter-frame-max', 'filter-path-min', 'filter-path-max', 'filter-date-start', 'filter-date-end']) {
    document.getElementById(id)?.addEventListener('input', event => {
      let key = '';
      if (id === 'filter-frame-min') key = 'frameMin';
      if (id === 'filter-frame-max') key = 'frameMax';
      if (id === 'filter-path-min') key = 'pathMin';
      if (id === 'filter-path-max') key = 'pathMax';
      if (id === 'filter-date-start') key = 'dateStart';
      if (id === 'filter-date-end') key = 'dateEnd';
      if (key) {
        state.filters[key] = event.target.value.trim();
        if (key === 'dateStart' || key === 'dateEnd') updateDateShortcutState();
        applyAdvancedFilters();
      }
    });
  }

  for (const id of ['btn-asf', 'btn-cop']) {
    const el = document.getElementById(id);
    if (el && el.tagName === 'A') el.removeAttribute('href');
  }
}

function renderSatelliteSelect() {
  ensureAdvancedState();
  const select = document.getElementById('filter-satellite');
  if (!select) return;
  const counts = state.cache?.satelliteCounts || new Map();
  const catalog = getSatelliteCatalogIndex();

  // Offered from the CATALOG, not from the current window: a satellite whose
  // data lies outside the window must stay selectable, or it can never be
  // queried at all (this is what hid retired S1B behind the 7-day default).
  const visibleSats = SATS.filter(matchesSidebarFilters).filter(sat => catalog.has(sat.id));
  const orderedSats = [
    ...visibleSats.filter(isFeaturedSatellite),
    ...visibleSats.filter(sat => !isFeaturedSatellite(sat)),
  ];

  const options = [`<option value="ALL">${t('all-satellites')}</option>`];
  for (const sat of orderedSats) {
    const count = counts.get(sat.id) || 0;
    const entry = catalog.get(sat.id);
    // Out-of-window satellites show the years they cover rather than a bare
    // "(0)", so the archive span is visible before selecting.
    const firstYear = toDisplayDate(entry.first).getFullYear();
    const lastYear = toDisplayDate(entry.last).getFullYear();
    const suffix = count
      ? ` (${count})`
      : ` (${firstYear}${lastYear === firstYear ? '' : `–${lastYear}`})`;
    options.push(`<option value="${sat.id}">${getSatName(sat)}${suffix}</option>`);
  }
  select.innerHTML = options.join('');
  if (![...select.options].some(opt => opt.value === state.filters.satellite)) {
    state.filters.satellite = 'ALL';
  }
  select.value = state.filters.satellite;
}

// Frames the product-type chips are drawn from. Honours the band/tab/satellite
// selection (but not the product-type selection itself, which would make the
// chips disappear as soon as they were used) so a mission's options section is
// shown only when that mission can actually appear on the map.
function getFormatPoolFrames() {
  ensureAdvancedState();
  return state.rawFrames.filter(frame => {
    if (!frame.is_open_data) return false;
    if (state.band !== 'ALL' && frame.satellite_band !== state.band) return false;
    if (state.tab === 'op' && frame.sat_status === 'ret') return false;
    if (state.filters.satellite !== 'ALL' && frame.satellite_id !== state.filters.satellite) return false;
    return true;
  });
}

function getDefaultFormatsForSatellite(types) {
  const satKey = state.filters.satellite === 'ALL' ? 'ALL' : state.filters.satellite;
  const preferred = DEFAULT_PRODUCT_TYPES_BY_SATELLITE[satKey] || DEFAULT_PRODUCT_TYPES;
  const defaults = types.filter(type => preferred.includes(type));
  return defaults.length ? defaults : types;
}

// Multi-select filter chips support a "solo" gesture: double-click a chip to
// make it the only selected value in its group, and double-click a soloed chip
// again to restore the whole group. Every chip routes its click through chipTap.
//
// The double-click is detected from the two clicks' own event.timeStamps, NOT
// from a wall-clock diff taken at handler entry, and NOT from the browser's
// native `dblclick`. Both of those fail here: a single click re-renders the
// panel (up to ~1 s for the stats panel) which replaces the chip's DOM node, so
// the browser never synthesises a `dblclick` (the two clicks have different
// targets), and the render time sits between the two handlers so any entry-time
// diff overshoots. event.timeStamp is set from the *physical* click time and is
// unaffected by the render in between, so the diff between the two is the true
// inter-click interval.
//
// The first click of the pair has already toggled the chip by the time the
// second arrives, so the "restore the whole group" decision uses wasSolo — the
// selection state snapshotted on that first click, before it mutated the set.
// Each group's universe (every value currently rendered) is recorded by its
// render function into chipUniverse; the static stats groups declare theirs
// inline. Sentinel-1 product types live in renderFormatOptions below; NISAR's
// live in renderNisarOptions so a selection in one mission never hides the other.
const CHIP_SOLO_MS = 400;
const chipUniverse = {};
const CHIP_SOLO_GROUPS = {
  formats:          { set: () => state.filters.formats,        rerender: () => { renderFormatOptions(); applyAdvancedFilters(); } },
  nisarFormats:     { set: () => state.filters.nisarFormats,   rerender: () => { renderNisarOptions(); applyAdvancedFilters(); } },
  nisarCoverage:    { set: () => state.filters.nisarCoverage,  rerender: () => { renderNisarOptions(); applyAdvancedFilters(); } },
  nisarBandwidth:   { set: () => state.filters.nisarBandwidth, rerender: () => { renderNisarOptions(); applyAdvancedFilters(); } },
  nisarBand:        { set: () => state.filters.nisarBand,      rerender: () => { renderNisarOptions(); applyAdvancedFilters(); } },
  statsSats:        { set: () => statsState.activeSats,        rerender: () => renderStatsPanel(), universe: () => STATS_CHART_SATS },
  statsTracks:      { set: () => statsState.activeTracks,      rerender: () => renderStatsPanel(), universe: () => STATS_S1_TRACKS, cast: Number },
  statsNisarTracks: { set: () => statsState.activeNisarTracks, rerender: () => renderStatsPanel(), universe: () => STATS_NISAR_TRACKS.map(track => track.key) },
};
let _lastChipTap = { id: null, at: -Infinity, wasSolo: false };

function chipTap(groupId, rawValue, evt) {
  const cfg = CHIP_SOLO_GROUPS[groupId];
  if (!cfg) return;
  const set = cfg.set();
  const value = cfg.cast ? cfg.cast(rawValue) : rawValue;
  const id = groupId + '#' + String(rawValue);
  const ts = evt ? evt.timeStamp : performance.now();
  const isDouble = _lastChipTap.id === id && (ts - _lastChipTap.at) < CHIP_SOLO_MS;
  if (isDouble) {
    const wasSolo = _lastChipTap.wasSolo;
    _lastChipTap = { id: null, at: -Infinity, wasSolo: false };
    const universe = cfg.universe ? cfg.universe() : (chipUniverse[groupId] || []);
    set.clear();
    if (wasSolo) for (const v of universe) set.add(v);  // restore the whole group
    else set.add(value);                                // isolate this one
  } else {
    _lastChipTap = { id, at: ts, wasSolo: set.size === 1 && set.has(value) };
    if (set.has(value)) set.delete(value);
    else set.add(value);
  }
  cfg.rerender();
}

function renderFormatOptions() {
  ensureAdvancedState();
  const wrap = document.getElementById('format-options');
  const summary = document.getElementById('product-summary');
  const section = document.getElementById('product-section');
  if (!wrap) return;

  const pool = getFormatPoolFrames().filter(frame => !isNisarFrame(frame));
  const types = [...new Set(pool.map(frame => frame.product_type_norm).filter(Boolean))].sort();
  if (section) section.hidden = !types.length;
  if (!types.length) {
    wrap.innerHTML = '<span class="filter-note">No product types in current inventory.</span>';
    state.filters.formats = new Set();
    // Re-seed when Sentinel-1 returns to the pool; see renderNisarOptions.
    state.filters.seeded.delete('formats');
    if (summary) summary.textContent = '0 visible';
    renderNisarOptions();
    return;
  }

  // Seed the defaults once. Re-seeding whenever the set is empty would snap
  // the chips back on as soon as the user deselected the last one.
  if (!state.filters.seeded.has('formats')) {
    state.filters.seeded.add('formats');
    state.filters.formats = new Set(getDefaultFormatsForSatellite(types));
  } else {
    const stillValid = [...state.filters.formats].filter(type => types.includes(type));
    if (stillValid.length !== state.filters.formats.size) {
      state.filters.formats = new Set(stillValid);
    }
  }

  chipUniverse.formats = types;
  wrap.innerHTML = '';
  for (const type of types) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'format-chip' + (state.filters.formats.has(type) ? ' on' : '');
    button.textContent = type;
    button.title = t('chip-solo-hint');
    button.onclick = evt => chipTap('formats', type, evt);
    wrap.appendChild(button);
  }
  if (summary) summary.textContent = `${state.filters.formats.size} selected · ${types.length} visible`;
  renderNisarOptions();
}

// NISAR delivers several products for one overpass that differ only in frame
// coverage (Full / Partial) and bandwidth mode. Sentinel-1 has no equivalent,
// so this section is rendered only when NISAR frames are in the pool.
function renderNisarOptions() {
  ensureAdvancedState();
  const section = document.getElementById('nisar-section');
  if (!section) return;

  const pool = getFormatPoolFrames().filter(isNisarFrame);
  if (!pool.length) {
    section.hidden = true;
    // Drop stale selections so hidden chips cannot filter the map, and clear
    // the seed markers too: otherwise, when NISAR returns to the pool (e.g. the
    // user switches from C-Band back to L-Band), the groups stay empty and an
    // empty set means "match nothing" — so every NISAR frame is hidden.
    state.filters.nisarFormats.clear();
    state.filters.nisarCoverage.clear();
    state.filters.nisarBandwidth.clear();
    state.filters.nisarBand.clear();
    state.filters.seeded.delete('nisarFormats');
    state.filters.seeded.delete('nisarCoverage');
    state.filters.seeded.delete('nisarBandwidth');
    state.filters.seeded.delete('nisarBand');
    return;
  }
  section.hidden = false;

  renderNisarFormatChips(pool);

  // Coverage and bandwidth are explicit selections seeded to "everything", so
  // each chip can be switched off independently — including the last one.
  const groups = [
    // Band is only worth a chip row once both radars are in the pool; with
    // L-SAR alone the single chip would just be a label. Its wrapper hides
    // itself so the sub-heading does not float above an empty row.
    { id: 'nisar-band-options', key: 'nisarBand', get: getNisarBandLabel, minValues: 2 },
    { id: 'nisar-coverage-options', key: 'nisarCoverage', get: getNisarCoverage },
    { id: 'nisar-bandwidth-options', key: 'nisarBandwidth', get: getNisarBandwidth },
  ];
  for (const group of groups) {
    const wrap = document.getElementById(group.id);
    if (!wrap) continue;
    const values = [...new Set(pool.map(group.get).filter(Boolean))].sort();
    const selected = state.filters[group.key];
    const previous = chipUniverse[group.key];
    if (!state.filters.seeded.has(group.key)) {
      state.filters.seeded.add(group.key);
      for (const value of values) selected.add(value);
    } else if (Array.isArray(previous)) {
      // These groups seed to "everything" and the user unticks from there, so a
      // value the user has never seen must arrive selected — otherwise data
      // that only starts appearing later (a new bandwidth mode, or S-SAR once
      // ISRO's band reaches the catalog) would be filtered out by a group
      // nobody touched. Values already in the universe are left alone, so a
      // deselected chip stays deselected.
      for (const value of values) if (!previous.includes(value)) selected.add(value);
    }
    // Drop selections that no longer exist in the pool.
    for (const value of [...selected]) if (!values.includes(value)) selected.delete(value);
    chipUniverse[group.key] = values;
    // Hidden groups stay seeded: an empty Set means "match nothing", so a
    // group that renders no chips must still hold every value in the pool.
    const row = document.getElementById(`${group.id}-row`);
    if (row) row.hidden = values.length < (group.minValues || 1);
    wrap.innerHTML = '';
    for (const value of values) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'format-chip' + (selected.has(value) ? ' on' : '');
      button.textContent = value;
      button.title = t('chip-solo-hint');
      button.onclick = evt => chipTap(group.key, value, evt);
      wrap.appendChild(button);
    }
  }
  const summary = document.getElementById('nisar-summary');
  if (summary) summary.textContent = t('n-nisar-frames', { n: pool.length });
}

function renderNisarFormatChips(pool) {
  const wrap = document.getElementById('nisar-format-options');
  if (!wrap) return;
  const types = [...new Set(pool.map(frame => frame.product_type_norm).filter(Boolean))].sort();
  // Seeded once; see renderFormatOptions.
  if (!state.filters.seeded.has('nisarFormats')) {
    state.filters.seeded.add('nisarFormats');
    state.filters.nisarFormats = new Set(getDefaultFormatsForSatellite(types));
  } else {
    const stillValid = [...state.filters.nisarFormats].filter(type => types.includes(type));
    if (stillValid.length !== state.filters.nisarFormats.size) {
      state.filters.nisarFormats = new Set(stillValid);
    }
  }
  chipUniverse.nisarFormats = types;
  wrap.innerHTML = '';
  for (const type of types) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'format-chip' + (state.filters.nisarFormats.has(type) ? ' on' : '');
    button.textContent = type;
    button.title = t('chip-solo-hint');
    button.onclick = evt => chipTap('nisarFormats', type, evt);
    wrap.appendChild(button);
  }
}

function resetAdvancedFilters(apply = true) {
  ensureAdvancedState();
  const allTypes = [...new Set(state.rawFrames.map(frame => frame.product_type_norm).filter(Boolean))];
  // Satellite first: the default window now anchors on the selected
  // satellite's newest data, so it has to be read after the reset to ALL.
  state.filters.satellite = 'ALL';
  const window = getDefaultWeekWindow();
  state.filters.direction = 'ALL';
  state.filters.showSameTrackInDrawer = false;
  state.filters.showOtherSentinelTracks = false;
  state.filters.pathMin = '';
  state.filters.pathMax = '';
  state.filters.frameMin = '';
  state.filters.frameMax = '';
  state.filters.dateStart = window.start;
  state.filters.dateEnd = window.end;
  // Clear the seed markers so every chip group re-applies its defaults.
  state.filters.seeded.clear();
  state.filters.formats.clear();
  state.filters.nisarFormats.clear();
  state.filters.nisarCoverage.clear();
  state.filters.nisarBandwidth.clear();
  state.filters.nisarBand.clear();
  state.selectedSat = null;

  const satSel = document.getElementById('filter-satellite');
  const dirSel = document.getElementById('filter-direction');
  const pathMin = document.getElementById('filter-path-min');
  const pathMax = document.getElementById('filter-path-max');
  const frameMin = document.getElementById('filter-frame-min');
  const frameMax = document.getElementById('filter-frame-max');
  const dateStart = document.getElementById('filter-date-start');
  const dateEnd = document.getElementById('filter-date-end');
  const showSameTrack = document.getElementById('filter-show-same-track');
  const showOtherTracks = document.getElementById('filter-show-other-tracks');
  if (satSel) satSel.value = 'ALL';
  if (dirSel) dirSel.value = 'ALL';
  if (showSameTrack) showSameTrack.checked = false;
  if (showOtherTracks) showOtherTracks.checked = false;
  if (pathMin) pathMin.value = '';
  if (pathMax) pathMax.value = '';
  if (frameMin) frameMin.value = '';
  if (frameMax) frameMax.value = '';
  if (dateStart) dateStart.value = window.start;
  if (dateEnd) dateEnd.value = window.end;
  updateDateShortcutState();
  syncViewModeControl();
  renderFormatOptions();
  if (apply) applyAdvancedFilters();
}

function frameMatchesAdvancedFilters(frame) {
  if (!frame.is_open_data) return false;
  if (frame.track_label === 'OTHER_S1' && !state.filters.showOtherSentinelTracks) return false;
  if (state.band !== 'ALL' && frame.satellite_band !== state.band) return false;
  if (state.tab === 'op' && frame.sat_status === 'ret') return false;
  if (state.filters.satellite !== 'ALL' && frame.satellite_id !== state.filters.satellite) return false;
  if (state.filters.direction !== 'ALL' && frame.direction_norm !== state.filters.direction) return false;
  // Each mission carries its own product-type selection; NISAR additionally
  // publishes several products per overpass that differ only by frame coverage
  // and bandwidth mode. None of those fields exist for Sentinel-1, and a shared
  // product-type Set would let one mission's selection hide the other entirely.
  // Every chip group is an explicit selection: deselecting all of them filters
  // everything out, rather than silently meaning "no restriction".
  if (isNisarFrame(frame)) {
    const { nisarFormats, nisarCoverage, nisarBandwidth, nisarBand } = state.filters;
    if (!nisarFormats.has(frame.product_type_norm)) return false;
    // A frame is never excluded on a field it does not carry (SME2 has no
    // range bandwidth, for instance).
    const coverage = getNisarCoverage(frame);
    const bandwidth = getNisarBandwidth(frame);
    const band = getNisarBandLabel(frame);
    if (coverage && !nisarCoverage.has(coverage)) return false;
    if (bandwidth && !nisarBandwidth.has(bandwidth)) return false;
    if (band && !nisarBand.has(band)) return false;
  } else if (!state.filters.formats.has(frame.product_type_norm)) {
    return false;
  }

  const pathMinVal = normalizeFrameNumber(state.filters.pathMin);
  const pathMaxVal = normalizeFrameNumber(state.filters.pathMax);
  const pathVal = normalizeFrameNumber(frame.path_number) ?? normalizeFrameNumber(frame.orbit);
  if (pathMinVal !== null && (pathVal === null || pathVal < pathMinVal)) return false;
  if (pathMaxVal !== null && (pathVal === null || pathVal > pathMaxVal)) return false;

  const min = normalizeFrameNumber(state.filters.frameMin);
  const max = normalizeFrameNumber(state.filters.frameMax);
  if (min !== null && (frame.frame_number_norm === null || frame.frame_number_norm < min)) return false;
  if (max !== null && (frame.frame_number_norm === null || frame.frame_number_norm > max)) return false;

  // Compare on the display-timezone day, not the raw UTC day. The date pickers
  // are UTC+8 calendar dates and the stats buckets are UTC+8-aligned, so a raw
  // UTC comparison mismatched by a day for any pass whose UTC and UTC+8 dates
  // differ — which is why "view on map" from a single-frame bar showed nothing.
  if (state.filters.dateStart || state.filters.dateEnd) {
    const day = frame.date ? displayDateKey(frame.date) : '';
    if (state.filters.dateStart && day && day < state.filters.dateStart) return false;
    if (state.filters.dateEnd && day && day > state.filters.dateEnd) return false;
  }

  return true;
}

function getFrameBoundsPreview() {
  return state.rawFrames.filter(frame => {
    if (state.band !== 'ALL' && frame.satellite_band !== state.band) return false;
    if (state.tab === 'op' && frame.sat_status === 'ret') return false;
    if (state.filters.satellite !== 'ALL' && frame.satellite_id !== state.filters.satellite) return false;
    if (state.filters.direction !== 'ALL' && frame.direction_norm !== state.filters.direction) return false;
    // Per-mission product-type selection, matching frameMatchesAdvancedFilters.
    const formats = isNisarFrame(frame) ? state.filters.nisarFormats : state.filters.formats;
    if (!formats.has(frame.product_type_norm)) return false;
    return frame.frame_number_norm !== null;
  }).map(frame => frame.frame_number_norm);
}

function applyAdvancedFilters() {
  ensureAdvancedState();
  renderFormatOptions();
  state.filteredFrames = state.rawFrames.filter(frameMatchesAdvancedFilters);
  if (state.selectedFrameKey && !state.filteredFrames.some(frame => getFrameKey(frame) === state.selectedFrameKey)) {
    state.selectedFrameKey = null;
  }
  state.frames = state.filteredFrames;
  rebuildFrameCaches();
  renderSatelliteSelect();
  renderSatList();
  renderFrames();
  renderMobileFeed();
  updateStats();
  updateFilterHints();
  updateDownloadButtons();
  if (document.getElementById('stats-panel')?.classList.contains('open')) {
    renderStatsPanel();
  }
}

function selectSatellite(sat, row) {
  ensureAdvancedState();
  state.selectedSat = sat;
  state.filters.satellite = sat.id;
  const select = document.getElementById('filter-satellite');
  if (select) select.value = sat.id;
  snapDateWindowToSatellite(sat.id);
  openDrawer(sat, row, state.rawFrames.some(frame => satMatchesFrame(sat, frame)));
  applyAdvancedFilters();
}

function updateStats(data = state.baseStats || {}) {
  ensureAdvancedState();
  document.getElementById('st-frames').textContent = state.filteredFrames.length;
  document.getElementById('st-sats').textContent = new Set(state.filteredFrames.map(frame => frame.satellite_id)).size;

  // The window the user is actually looking at — the active date filter —
  // not the span of the whole database. Falls back to the data range when no
  // date filter is set. Sits next to the other two filter-driven counters.
  const filterStart = parseDateInputValue(state.filters.dateStart);
  const filterEnd = parseDateInputValue(state.filters.dateEnd);
  const start = filterStart || new Date(data.query_start || Date.now() - 7 * 864e5);
  const end = filterEnd || new Date(data.query_end || Date.now());
  // A bare M/D is ambiguous once the range crosses a year boundary.
  const withYear = start.getFullYear() !== end.getFullYear();
  const fmt = value => (withYear ? `${value.getFullYear()}/` : '') + `${value.getMonth()+1}/${value.getDate()}`;
  document.getElementById('st-period').textContent = `${fmt(start)} - ${fmt(end)}`;

  const asf = state.filteredFrames.filter(frame => frame.asf_url).length;
  const cop = state.filteredFrames.filter(frame => frame.copernicus_url || frame.download_url).length;
  const dlInfo = document.getElementById('dl-info');
  if (dlInfo) dlInfo.textContent = t('n-files-count', { n: state.filteredFrames.length, asf, cop });
  updateNextExpected();
  updateLegend();
  updateDateShortcutState();
}

function summarizeSelectedFrames() {
  const selectedFrame = state.selectedFrameKey
    ? state.filteredFrames.find(frame => getFrameKey(frame) === state.selectedFrameKey)
    : null;
  if (selectedFrame) return [selectedFrame];
  if (state.filters.satellite !== 'ALL') return state.filteredFrames.filter(frame => frame.satellite_id === state.filters.satellite);
  return state.filteredFrames;
}

function updateLegend() {
  const wrap = document.getElementById('legend-items');
  if (!wrap) return;

  const hlId = getHighlightStyleId();
  const hlLabels = {
    ring: t('highlight-solid'),
    dash: t('highlight-dash'),
    color: t('highlight-color'),
    gold: t('highlight-gold'),
  };
  const hlRow = `<div class="legend-hl-row">${
    Object.keys(HIGHLIGHT_STYLES).map(id =>
      `<button class="legend-hl-btn${hlId === id ? ' on' : ''}" onclick="setHighlightStyle('${id}')">${hlLabels[id]}</button>`
    ).join('')
  }</div>`;

  const frames = summarizeSelectedFrames();
  if (!frames.length) {
    wrap.innerHTML = hlRow + `<div class="legend-empty">${t('no-visible-data')}</div>`;
    return;
  }

  const groups = new Map();
  for (const frame of frames) {
    const { label, color } = getFrameVisualInfo(frame);
    const current = groups.get(label) || { label, color, count: 0 };
    current.count += 1;
    groups.set(label, current);
  }

  const items = [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .map(item => `
      <div class="legend-item">
        <div class="legend-main">
          <div class="legend-swatch" style="background:${item.color}"></div>
          <span>${item.label}</span>
        </div>
        <div class="legend-value">${item.count}</div>
      </div>
    `);
  wrap.innerHTML = hlRow + items.join('');
}

function renderMobileFeed() {
  const wrap = document.getElementById('mobile-feed');
  if (!wrap) return;

  const frames = [...(state.filteredFrames || [])].sort((a, b) => (getFrameTimestamp(b) ?? 0) - (getFrameTimestamp(a) ?? 0));
  if (!frames.length) {
    wrap.innerHTML = `
      <div class="mobile-feed-summary">
        <div class="mobile-feed-title">${t('update-tracker')}</div>
        <div class="mobile-feed-meta">${t('no-imagery')}</div>
      </div>
    `;
    return;
  }

  const uniqueGranules = new Set(frames.map(frame => normalizeGranuleKey(frame.granule) || getFrameKey(frame))).size;
  const grouped = new Map();
  for (const frame of frames) {
    const dayKey = (frame.date || '').slice(0, 10) || 'Unknown date';
    const list = grouped.get(dayKey) || [];
    list.push(frame);
    grouped.set(dayKey, list);
  }

  const dateSummary = state.filters.dateStart && state.filters.dateEnd
    ? `${state.filters.dateStart} → ${state.filters.dateEnd}`
    : t('open-date-range');

  const feedLocale = state.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
  const body = [...grouped.entries()].map(([day, dayFrames]) => {
    const unknownDay = t('unknown-date');
    const dayLabel = day === 'Unknown date' ? unknownDay : new Date(`${day}T00:00:00`).toLocaleDateString(feedLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });

    const cards = dayFrames.slice(0, 24).map(frame => {
      const timeLabel = frame.date ? new Date(frame.date).toLocaleTimeString(feedLocale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }) : '--';
      const sourceLabel = frame.asf_url && (frame.copernicus_url || frame.download_url)
        ? 'ASF + Copernicus'
        : (frame.copernicus_url || frame.download_url)
          ? 'Copernicus only'
          : frame.asf_url
            ? 'ASF only'
            : 'No source';
      return `
        <div class="mobile-feed-card">
          <div class="mobile-feed-card-title">${frame.granule || 'Unknown Granule'}</div>
          <div class="mobile-feed-card-meta">${timeLabel} · ${frame.satellite_name || frame.platform || '--'} · ${frame.product_type_norm || '--'}</div>
          <div class="mobile-feed-card-sub">track ${getFramePathNumber(frame) ?? '--'} · frame ${frame.frame_number_norm ?? '--'} · ${frame.direction_norm || '--'} · ${sourceLabel}</div>
        </div>
      `;
    }).join('');

    return `
      <section class="mobile-feed-group">
        <div class="mobile-feed-date">${dayLabel} · ${t('n-files-day', { n: dayFrames.length, s: dayFrames.length === 1 ? '' : 's' })}</div>
        ${cards}
      </section>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="mobile-feed-summary">
      <div class="mobile-feed-title">${t('update-tracker')}</div>
      <div class="mobile-feed-meta">${t('n-unique-files', { n: uniqueGranules })}</div>
      <div class="mobile-feed-meta">${dateSummary}</div>
    </div>
    ${body}
  `;
}

function updateFilterHints() {
  ensureAdvancedState();
  const values = getFrameBoundsPreview();
  const note = document.getElementById('filter-note');
  const frameMin = document.getElementById('filter-frame-min');
  const frameMax = document.getElementById('filter-frame-max');
  if (!note || !frameMin || !frameMax) return;

  if (!values.length) {
    frameMin.placeholder = t('any');
    frameMax.placeholder = t('any');
    note.textContent = state.filters.showOtherSentinelTracks
      ? t('note-with-other')
      : t('note-default');
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  frameMin.placeholder = String(min);
  frameMax.placeholder = String(max);
  const extra = t(state.filters.showOtherSentinelTracks ? 'with-other-tracks' : 'priority-only');
  const satLabel = state.filters.satellite === 'ALL' ? 'Sentinel-1 + NISAR' : state.filters.satellite;
  // Both missions' selections, since product types are now tracked separately.
  const selectedFormats = [...state.filters.formats, ...state.filters.nisarFormats];
  note.textContent = t('note-formats', { sat: satLabel, formats: selectedFormats.join(', ') || 'none', min, max, extra });
}

function openDrawer(sat, row, thisWeek) {
  document.querySelectorAll('.sat-row').forEach(item => item.classList.remove('active'));
  if (row) row.classList.add('active');

  state.selectedFrameKey = null;
  if (typeof updateMapSelectionState === 'function') updateMapSelectionState();

  document.getElementById('d-name').textContent = sat.name;
  document.getElementById('d-agency').textContent = sat.agency;
  document.getElementById('d-week-wrap').innerHTML = thisWeek ? `<div class="d-week-badge">${t('frames-this-week')}</div>` : '';

  const statusLabel = t(`status-${sat.status}`) || sat.status;
  document.getElementById('d-grid').innerHTML = `
    <div class="d-item"><div class="k">${t('status')}</div><div class="v">${statusLabel}</div></div>
    <div class="d-item"><div class="k">${t('band')}</div><div class="v"><span class="badge b${sat.band}">${sat.band}-band</span></div></div>
    <div class="d-item"><div class="k">${t('frequency')}</div><div class="v"><small>${sat.freq}</small></div></div>
    <div class="d-item"><div class="k">${t('resolution')}</div><div class="v"><small>${sat.res}</small></div></div>
    <div class="d-item"><div class="k">${t('swath')}</div><div class="v"><small>${sat.swath}</small></div></div>
    <div class="d-item"><div class="k">${t('launch')}</div><div class="v"><small>${sat.launched}</small></div></div>
    ${sat.retired ? `<div class="d-item"><div class="k">${t('retired-label')}</div><div class="v"><small>${sat.retired}</small></div></div>` : ''}
  `;
  document.getElementById('d-desc').textContent = getSatDesc(sat);
  document.getElementById('drawer').classList.add('open');
}

function setFilter(band, el) {
  state.band = band;
  document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('on'));
  el.classList.add('on');
  renderSatelliteSelect();
  applyAdvancedFilters();
}

function setTab(tab, el) {
  state.tab = tab;
  syncViewModeControl();
  if (el) {
    document.querySelectorAll('.tab').forEach(button => button.classList.remove('on'));
    el.classList.add('on');
  }
  applyTabDateWindow();
  renderSatelliteSelect();
  applyAdvancedFilters();
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createMeta4(frames, source) {
  const selected = frames.filter(frame => {
    return source === 'ASF'
      ? !!frame.asf_url
      : !!(frame.copernicus_url || frame.download_url);
  });

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<metalink xmlns="urn:ietf:params:xml:ns:metalink">',
    `  <!-- generated ${new Date().toISOString()} -->`,
    `  <!-- ${selected.length} filtered items -->`,
  ];

  for (const frame of selected) {
    const url = source === 'ASF' ? frame.asf_url : (frame.copernicus_url || frame.download_url);
    const name = source === 'Copernicus' ? `${frame.granule}.SAFE.zip` : frame.granule;
    lines.push(`  <file name="${escapeXml(name)}">`);
    if (frame.file_size_mb) lines.push(`    <size>${Math.round(Number(frame.file_size_mb) * 1000000)}</size>`);
    lines.push(`    <url priority="1">${escapeXml(url)}</url>`);
    lines.push('  </file>');
  }
  lines.push('</metalink>');
  return { text: lines.join('\n'), count: selected.length };
}

function triggerDownload(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildDownloadName(prefix, ext) {
  ensureAdvancedState();
  const sat = state.filters.satellite === 'ALL' ? 'all' : state.filters.satellite.toLowerCase();
  const dir = state.filters.direction === 'ALL' ? 'all' : state.filters.direction.toLowerCase();
  return `${prefix}_${sat}_${dir}_${new Date().toISOString().slice(0,10)}.${ext}`;
}

function updateDownloadButtons() {
  ensureAdvancedState();
  const asfMeta4 = createMeta4(state.filteredFrames, 'ASF');
  const copMeta4 = createMeta4(state.filteredFrames, 'Copernicus');
  const copyBtn = document.getElementById('btn-copy-urls');
  const asfBtn = document.getElementById('btn-asf');
  const copBtn = document.getElementById('btn-cop');
  const csvBtn = document.getElementById('btn-csv');
  if (!asfBtn || !copBtn) return;
  asfBtn.textContent = `ASF .meta4 (${asfMeta4.count})`;
  copBtn.textContent = `Copernicus .meta4 (${copMeta4.count})`;
  asfBtn.style.pointerEvents = asfMeta4.count ? 'auto' : 'none';
  copBtn.style.pointerEvents = copMeta4.count ? 'auto' : 'none';
  asfBtn.style.opacity = asfMeta4.count ? '1' : '.35';
  copBtn.style.opacity = copMeta4.count ? '1' : '.35';
  if (copyBtn) {
    const totalUrls = state.filteredFrames.filter(f => f.asf_url || f.copernicus_url || f.download_url).length;
    copyBtn.style.pointerEvents = totalUrls ? 'auto' : 'none';
    copyBtn.style.opacity = totalUrls ? '1' : '.35';
  }
  if (csvBtn) {
    csvBtn.style.pointerEvents = state.filteredFrames.length ? 'auto' : 'none';
    csvBtn.style.opacity = state.filteredFrames.length ? '1' : '.35';
  }
  const fileCount = new Set(state.filteredFrames.map(frame => normalizeGranuleKey(frame.granule))).size;
  const dlInfo = document.getElementById('dl-info');
  if (dlInfo) {
    dlInfo.textContent = t('n-files-count', { n: fileCount, asf: asfMeta4.count, cop: copMeta4.count });
  }
}

window.copyFilteredUrls = function() {
  ensureAdvancedState();
  const urls = state.filteredFrames.map(f => f.asf_url || f.copernicus_url || (f.source === 'Copernicus' ? f.download_url : null)).filter(Boolean);
  if (!urls.length) {
    alert(t('no-urls-alert'));
    return;
  }
  navigator.clipboard.writeText(urls.join('\n')).then(() => {
    const btn = document.getElementById('btn-copy-urls');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = t('copied-n-links', { n: urls.length });
      btn.style.background = 'var(--green)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--green)';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    }
  });
}

function downloadMeta4(source) {
  ensureAdvancedState();
  const meta4 = createMeta4(state.filteredFrames, source);
  if (!meta4.count) {
    alert(t('no-scenes-alert', { source }));
    return;
  }
  triggerDownload(buildDownloadName(source.toLowerCase(), 'meta4'), meta4.text, 'application/metalink4+xml;charset=utf-8');
}

function exportCSV() {
  ensureAdvancedState();
  if (!state.filteredFrames.length) {
    alert(t('no-frames-alert'));
    return;
  }

  const columns = ['source', 'granule', 'satellite_name', 'product_type_norm', 'direction_norm', 'frame_number_norm', 'path_number', 'orbit', 'date', 'stop_time', 'mode', 'polarization', 'file_size_mb', 'asf_url', 'download_url'];
  const csv = [
    columns.join(','),
    ...state.filteredFrames.map(frame => columns.map(column => {
      const value = String(frame[column] ?? '');
      return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    }).join(',')),
  ].join('\n');

  triggerDownload(buildDownloadName('taiwan_sar', 'csv'), '\uFEFF' + csv, 'text/csv;charset=utf-8');
}

function renderSatList() {
  ensureAdvancedState();
  const list = document.getElementById('sat-list');
  if (!list) return;
  list.innerHTML = '';

  const filteredSats = SATS.filter(matchesSidebarFilters);
  const featured = filteredSats.filter(isFeaturedSatellite);
  const folded = filteredSats.filter(sat => !isFeaturedSatellite(sat));

  let total = 0;
  if (featured.length) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = t('featured-missions');
    list.appendChild(label);
    const featuredGroup = document.createElement('div');
    featuredGroup.className = 'featured-group';
    for (const sat of featured) total += appendSatelliteRow(featuredGroup, sat);
    list.appendChild(featuredGroup);
  }

  if (folded.length) {
    const details = document.createElement('details');
    details.className = 'sat-fold';
    details.open = folded.some(sat => state.filters.satellite === sat.id);
    details.innerHTML = `
      <summary>${t('other-missions')} <span>${folded.length}</span></summary>
      <div class="sat-fold-note">${t('other-missions-note')}</div>`;
    for (const sat of folded) total += appendSatelliteRow(details, sat);
    list.appendChild(details);
  }

  document.getElementById('sb-count').textContent = t('n-satellites', { n: total });
}

function appendSatelliteRow(container, sat) {
  const counts = state.cache?.satelliteCounts || new Map();
  const satellitesWithFrames = state.cache?.satellitesWithFrames || new Set();
  const count = counts.get(sat.id) || 0;
  if (!count) return 0;
  const row = document.createElement('div');
  row.className = 'sat-row' + (state.filters.satellite === sat.id ? ' active' : '');
  row.dataset.satId = sat.id;
  row.onclick = () => selectSatellite(sat, row);
  row.innerHTML = `
    <div class="dot ${sat.status}"></div>
    <div class="sat-info">
      <div class="sat-name">${getSatName(sat)}</div>
      <div class="sat-meta">${sat.agency} · ${sat.launched.slice(0,4)}${sat.retired ? ` - ${sat.retired.slice(0,4)}` : ''} · ${count} ${t('filtered-frames').toLowerCase()}</div>
    </div>
    <div class="badges">
      ${satellitesWithFrames.has(sat.id) ? `<span class="this-week">${t('this-week-map')}</span>` : ''}
      <span class="badge b${sat.band}">${sat.band}</span>
    </div>`;
  container.appendChild(row);
  return 1;
}

// A visitor's own pick (stored per-browser) wins over the configured default.
function getHighlightStyleId() {
  return localStorage.getItem('sar_hl_style')
    || cfgStr('ui.highlightStyle', 'ring', ['ring', 'dash', 'color', 'gold']);
}

const HIGHLIGHT_STYLES = {
  ring:  { color: '#ffffff', weight: 3.5, dashArray: null,  fill: 0.36 },
  dash:  { color: '#ffffff', weight: 3.2, dashArray: '7 5', fill: 0.40 },
  color: { color: null,      weight: 4.5, dashArray: null,  fill: 0.55 }, // null → own frame color
  gold:  { color: '#ffd740', weight: 3.5, dashArray: null,  fill: 0.38 },
};

function setHighlightStyle(id) {
  localStorage.setItem('sar_hl_style', id);
  // updateLegend() rebuilds the overlay's button row, which is what carries
  // the active state now that the sidebar's duplicate row is gone.
  updateLegend();
  updateMapSelectionState();
}

function updateMapSelectionState() {
  const hasSelection = !!state.selectedFrameKey;
  const hlId = getHighlightStyleId();
  const hl   = HIGHLIGHT_STYLES[hlId] || HIGHLIGHT_STYLES.ring;
  for (const item of state.framePolygons) {
    const color = item.polygon.options.baseColor;
    if (item.key === state.selectedFrameKey) {
      item.polygon.setStyle({ color: hl.color ?? color, weight: hl.weight,
        fillColor: color, fillOpacity: hl.fill, opacity: 1, dashArray: hl.dashArray });
      item.polygon.bringToFront();
    } else if (hasSelection) {
      item.polygon.setStyle({ color, weight: 1, fillColor: color, fillOpacity: 0.03, opacity: 0.2, dashArray: null });
    } else {
      item.polygon.setStyle({ color, weight: 1.6, fillColor: color, fillOpacity: 0.1, opacity: 0.82, dashArray: null });
    }
  }
  updateLegend();
}

window.copyDrawerLink = function(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = '📋 Copied!';
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1500);
  });
};

// Display frame details in right-side drawer
async function liveFetchASF() {
  ensureAdvancedState();
  const now = new Date();
  const start = new Date(now - 7 * 24 * 3600 * 1000);
  const fmt = value => value.toISOString().replace(/\.\d+Z$/, 'UTC');
  const url = 'https://api.daac.asf.alaska.edu/services/search/param?' + new URLSearchParams({
    intersectsWith: 'POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))',
    platform: 'S1A,S1B,S1C,S1D,NISAR',
    processingLevel: 'SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,RSLC,GSLC,L1_RSLC,L1_GSLC,L2_GCOV,L2_GUNW',
    start: fmt(start),
    end: fmt(now),
    output: 'geojson',
    maxresults: 1000,
  });

  try {
    const response = await fetch(url);
    const payload = await response.json();
    state.rawFrames = (payload.features || []).map(feature => {
      const p = feature.properties || {};
      const list = value => (Array.isArray(value) ? value.filter(Boolean).join(',') : (value || ''));
      // NISAR leaves polarization/beamModeType/sizeMB null and publishes its
      // own fields instead — mirror process_nisar_feature() in fetch_sar_data.py.
      const isNisar = String(p.platform || p.sceneName || '').toUpperCase().includes('NISAR');
      const mainPol = list(p.mainBandPolarization);
      return enhanceFrame({
        source: 'ASF',
        granule: p.sceneName || '',
        platform: p.platform || '',
        sensor: p.sensor || '',
        date: p.startTime || '',
        stop_time: p.stopTime || '',
        mode: p.beamModeType || p.beamMode || '',
        polarization: isNisar ? mainPol : (p.polarization || ''),
        orbit: p.orbit || '',
        path_number: p.pathNumber || '',
        frame_number: p.frameNumber || '',
        direction: p.flightDirection || '',
        product_type: p.processingLevel || '',
        processing_level: p.processingLevel || '',
        footprint: feature.geometry,
        asf_url: p.url || '',
        file_size_mb: isNisar ? nisarSizeMB(p.bytes) : +(p.sizeMB || 0).toFixed(1),
        ...(isNisar ? {
          frame_coverage: p.frameCoverage || '',
          main_polarization: mainPol,
          side_polarization: list(p.sideBandPolarization),
          range_bandwidth: list(p.rangeBandwidth),
          crid: p.crid || '',
          collection: p.collectionName || '',
        } : {}),
      });
    }).filter(frame => frame.is_open_data);
    rebuildFrameCaches();

    state.baseStats = {
      total_frames: state.rawFrames.length,
      query_start: start.toISOString(),
      query_end: now.toISOString(),
      asf_count: state.rawFrames.length,
      copernicus_count: 0,
    };
    document.getElementById('hdr-time').textContent = 'Live ASF ' + formatDisplayTime(new Date());
    applyTabDateWindow();
    renderSatelliteSelect();
    renderFormatOptions();
    resetAdvancedFilters(false);
    applyAdvancedFilters();
  } catch (error) {
    document.getElementById('hdr-time').textContent = 'Load failed';
    console.error('ASF API failed', error);
  }
}

function getFrameSeriesKey(frame) {
  return [
    frame.satellite_id || '',
    frame.direction_norm || '',
    getFramePathNumber(frame) ?? '',
    frame.frame_number_norm ?? '',
  ].join('|');
}

function getFrameKey(frame) {
  return normalizeGranuleKey(frame.granule) || [
    getFrameSeriesKey(frame),
    (frame.date || '').slice(0, 19),
  ].join('|');
}

function normalizeGranuleKey(granule) {
  return String(granule || '')
    .replace(/\.SAFE$/i, '')
    .trim()
    .toUpperCase();
}

function parseGranuleAcquisitionWindow(granule) {
  const matches = String(granule || '').match(/\d{8}T\d{6}/g) || [];
  const parseUtc = value => {
    if (!value) return null;
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
    const timestamp = Date.parse(iso);
    return Number.isFinite(timestamp) ? timestamp : null;
  };

  return {
    startMs: parseUtc(matches[0]),
    stopMs: parseUtc(matches[1]),
  };
}

function getFrameAcquisitionInfo(frame) {
  const granuleWindow = parseGranuleAcquisitionWindow(frame?.granule);
  const startMs = granuleWindow.startMs ?? getFrameTimestamp(frame);
  const stopMs = granuleWindow.stopMs ?? startMs;
  // Identity key: a precise UTC instant, independent of the display zone —
  // used only to match "the same acquisition", never shown to the user.
  const key = startMs !== null
    ? new Date(startMs).toISOString().slice(0, 19)
    : `${getFrameSeriesKey(frame)}|${normalizeGranuleKey(frame?.granule) || 'unknown'}`;
  // Grouping key: the display zone's calendar day, same rule as
  // buildChartBuckets / buildFrequencyStats — a late-evening Taiwan pass is
  // early-morning UTC the next day, so grouping on the raw UTC date would
  // split one night's acquisitions across two headings.
  const dayKey = startMs !== null ? displayDateKey(startMs) : null;

  const label = startMs !== null
    ? `${formatDisplayTime(startMs, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      })} ${displayTZLabel(new Date(startMs))}`
    : t('unknown-acquisition');

  return { key, dayKey, startMs, stopMs, label };
}

// Pull NISAR's own fields out of a granule name. Used as a fallback for
// catalog records stored before the NISAR-specific metadata was captured.
// The five trailing fields (CRID, accuracy, coverage, location, counter) are
// anchored to the end, which is layout-independent — GUNW pair products carry
// an extra cycle and an extra date pair in the middle.
function parseNisarGranuleFields(granule) {
  const parts = String(granule || '').trim().split('_');
  if (parts[0] !== 'NISAR' || parts.length < 18) return {};
  const isPair = parts.length >= 20;
  const modeIndex = isPair ? 9 : 8;
  const pole = String(parts[modeIndex + 1] || '');
  const tail = parts.length;
  return {
    track: parts[5],
    frame: parts[7],
    direction: (NISAR_DIRECTION[parts[6]] || parts[6] || '').toUpperCase(),
    range_bandwidth: formatNisarBandwidth(parts[modeIndex]),
    main_polarization: NISAR_POL[pole.slice(0, 2)] || pole.slice(0, 2),
    side_polarization: NISAR_POL[pole.slice(2)] || pole.slice(2),
    start: parts[11],
    stop: isPair ? parts[14] : parts[12],
    crid: parts[tail - 5],
    frame_coverage: NISAR_COVERAGE[parts[tail - 3]] || parts[tail - 3],
    // Fields carried only by the granule name — nothing in ASF's metadata
    // reports them. The trailing ones are anchored to the end of the array,
    // which is layout-independent (pair products are longer in the middle).
    cycle: parts[4],
    processing_type: NISAR_PROCESSING_TYPE[parts[2]] || parts[2],
    // SOURCE sits two fields after MODE; pair products describe two
    // acquisitions and carry no single source code.
    source: isPair ? '' : (NISAR_SOURCE[parts[10]] || parts[10] || ''),
    accuracy: NISAR_ACCURACY[parts[tail - 4]] || parts[tail - 4],
    location: NISAR_LOCATION[parts[tail - 2]] || parts[tail - 2],
  };
}

// First non-empty value, or '--'. Every meta row goes through it, so a missing
// field never renders as blank.
function metaPick(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '') ?? '--';
}

// Acquisition times, in the display timezone. Accepts both an ISO string and
// the compact YYYYMMDDTHHMMSS form NISAR granule names carry.
function metaTime(value) {
  if (!value) return '--';
  const date = parseNisarCompactTime(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDisplayTime(date, {
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' ' + displayTZLabel(date);
}

// Sentinel-1's own fields, from the frame and from the granule name:
//   S1C_IW_GRDH_1SDV_<start>_<stop>_<absOrbit>_<dataTake>_<uniqueId>
// Everything a NISAR granule also carries is left to the common rows.
function buildS1MetaRows(frame) {
  const parts = String(frame?.granule || '').replace(/\.SAFE$/i, '').trim().split('_').filter(Boolean);
  if (!/^S1[ABCD]$/.test(parts[0] || '')) return [];
  const v = index => parts[index] || '';
  return [
    { label: 'Beam Mode', value: metaPick(frame.mode, v(1)) },
    { label: 'Level/Class/Pol', value: metaPick(v(3)) },
    // The granule name is the authority here, not frame.orbit: ASF puts the
    // absolute orbit in that field but Copernicus puts the *relative* orbit
    // there, so preferring it printed the track number as the absolute orbit
    // for every CDSE record. Leading zeros are dropped to match ASF's form.
    { label: 'Absolute Orbit', value: metaPick(v(6).replace(/^0+(?=\d)/, ''), frame.orbit) },
    { label: 'Data-take', value: metaPick(v(7)) },
    { label: 'Unique ID', value: metaPick(v(8)) },
  ];
}

// NISAR's own scheme: frame coverage, a per-band polarization pair, range
// bandwidth and a CRID. ASF leaves several of these null on some product
// levels, so each falls back to the granule name.
function buildNisarMetaRows(frame, named) {
  return [
    { label: 'Frame Coverage', value: metaPick(frame.frame_coverage, named.frame_coverage) },
    { label: 'Side Polarization', value: metaPick(frame.side_polarization, named.side_polarization) },
    { label: 'Range Bandwidth', value: metaPick(frame.range_bandwidth, named.range_bandwidth) },
    { label: 'Cycle', value: metaPick(named.cycle) },
    { label: 'Processing Type', value: metaPick(named.processing_type) },
    { label: 'Source', value: metaPick(named.source) },
    { label: 'Orbit Accuracy', value: metaPick(named.accuracy) },
    { label: 'Produced By', value: metaPick(named.location) },
    { label: 'CRID', value: metaPick(frame.crid, named.crid) },
  ];
}

// One granule table for every mission. Sentinel-1 and NISAR name their fields
// differently but describe the same acquisition, so the fields both carry come
// first, in the same order and under the same labels — two cards from different
// missions line up row for row — and each mission's own fields follow under a
// divider. Band leads because it is the one property that distinguishes NISAR's
// two radars from each other and from Sentinel-1's C-SAR.
function buildFrameMetaRows(frame) {
  const nisar = isNisarFrame(frame);
  const named = nisar ? parseNisarGranuleFields(frame?.granule) : {};
  const common = [
    { label: 'Band', value: metaPick(getFrameBandLabel(frame)) },
    // satellite_name first: ASF reports 'Sentinel-1C' and Copernicus 'S1C' for
    // the same spacecraft, and the point of a shared template is that two
    // cards read alike.
    { label: 'Platform', value: metaPick(frame.satellite_name, frame.platform, frame.satellite_id) },
    { label: 'Start Time', value: metaTime(metaPick(frame.date, named.start)) },
    { label: 'Stop Time', value: metaTime(metaPick(frame.stop_time, named.stop)) },
    { label: 'Track', value: metaPick(getFramePathNumber(frame), named.track) },
    { label: 'Frame', value: metaPick(frame.frame_number_norm, frame.frame_number, named.frame) },
    { label: 'Flight Direction', value: metaPick(frame.direction_norm, frame.direction, named.direction) },
    { label: 'Product', value: metaPick(frame.product_type_norm, frame.product_type) },
    // NISAR splits polarization across two bands; the main band is the
    // counterpart of Sentinel-1's single value, so it belongs here and only
    // the side band stays mission-specific.
    { label: 'Polarization', value: nisar
        ? metaPick(frame.main_polarization, named.main_polarization, frame.polarization)
        : metaPick(frame.polarization) },
  ];
  const unique = nisar ? buildNisarMetaRows(frame, named) : buildS1MetaRows(frame);
  if (!unique.length) return common;
  return [...common, { section: nisar ? 'NISAR Detail' : 'Sentinel-1 Detail' }, ...unique];
}

// The drawer's summary grid carried a Sentinel-1 shaped Mode cell, fed from
// ASF's beamModeType. NISAR leaves that field null, so the cell rendered blank
// for every L-SAR granule. NISAR does have a MODE field — in the granule name
// it is a pair of range-bandwidth codes, '4005' meaning a 40 MHz primary band
// plus a 5 MHz secondary — so show that, followed by the acquisition fields
// that only NISAR has. Same principle as buildFrameMetaRows(): present NISAR's
// own scheme rather than forcing it into Sentinel-1's.
function buildDrawerModeCells(frame) {
  const cell = (key, value) =>
    `<div class="d-item"><div class="k">${escapeHtml(t(key))}</div><div class="v"><small>${escapeHtml(value)}</small></div></div>`;

  if (!isNisarFrame(frame)) return cell('mode', frame.mode || '--');

  // ASF omits rangeBandwidth on the L3 soil-moisture products, but the granule
  // name still carries the MODE field, so parse it as a fallback.
  const named = parseNisarGranuleFields(frame.granule);
  const pick = (...values) =>
    values.find(value => value !== undefined && value !== null && value !== '' && value !== '--') || '--';

  const bandwidth = pick(frame.range_bandwidth, named.range_bandwidth);
  const main = pick(frame.main_polarization, named.main_polarization, frame.polarization);
  const side = pick(frame.side_polarization, named.side_polarization);

  // The per-granule rows keep ASF's own English wording; this grid is
  // translated, so the coverage value is translated with it.
  const coverage = pick(frame.frame_coverage, named.frame_coverage);
  const coverageLabel = coverage === '--' ? '--' : t(`cov-${coverage}`);

  return cell('mode', bandwidth === '--' ? '--' : t('bandwidth-mhz', { bw: bandwidth }))
    + cell('frame-coverage', coverageLabel)
    + cell('polarization', side !== '--' && side !== main ? `${main} / ${side}` : main)
    + cell('joint-obs', frame.joint_observation === undefined || frame.joint_observation === null
        ? '--'
        : t(frame.joint_observation ? 'joint-yes' : 'joint-no'));
}

function getQueryEndDate() {
  const raw = state.baseStats?.query_end || state.baseStats?.last_successful_fetch;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Inverse of formatDateInputValue. Built from parts rather than new Date(str)
// because 'YYYY-MM-DD' parses as UTC midnight and can shift a day west of UTC.
function parseDateInputValue(text) {
  const parts = String(text || '').split('-').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isFinite(date.getTime()) ? date : null;
}

// The window the app opens with. Named "week" for the 7-day default, but the
// length is configurable; the This Week / Month / … buttons are separate and
// keep their fixed meanings, since their labels state them.
function getDefaultWeekWindow() {
  const end = toDisplayDate(getWindowAnchorDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (cfgNum('filters.dateWindowDays', 7, { min: 1, max: 3650 }) - 1));
  return {
    start: formatDateInputValue(start),
    end: formatDateInputValue(end),
  };
}

function getPresetWindow(days) {
  // Window edges are display-timezone calendar dates, matching how the map's
  // date filter now compares frames (by display day). The end is the newest
  // data the current satellite selection has, not always "now" — see
  // getWindowAnchorDate.
  const end = toDisplayDate(getWindowAnchorDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    start: formatDateInputValue(start),
    end: formatDateInputValue(end),
  };
}

function syncViewModeControl() {
  // View mode select was removed; tabs remain the canonical state.
}

function updateDateShortcutState() {
  const weekBtn = document.getElementById('preset-week');
  const monthBtn = document.getElementById('preset-month');
  const sixMonthBtn = document.getElementById('preset-6months');
  const yearBtn = document.getElementById('preset-year');
  if (!weekBtn || !monthBtn || !sixMonthBtn || !yearBtn) return;

  const week = getPresetWindow(7);
  const month = getPresetWindow(30);
  const sixMonths = getPresetWindow(183);
  const year = getPresetWindow(365);
  const currentStart = state.filters?.dateStart || '';
  const currentEnd = state.filters?.dateEnd || '';

  weekBtn.classList.toggle('on', currentStart === week.start && currentEnd === week.end);
  monthBtn.classList.toggle('on', currentStart === month.start && currentEnd === month.end);
  sixMonthBtn.classList.toggle('on', currentStart === sixMonths.start && currentEnd === sixMonths.end);
  yearBtn.classList.toggle('on', currentStart === year.start && currentEnd === year.end);
}

function applyPresetDateWindow(days) {
  ensureAdvancedState();
  const window = getPresetWindow(days);
  setDateWindow(window.start, window.end);
  applyAdvancedFilters();
}

function applyTabDateWindow() {
  const dateStart = document.getElementById('filter-date-start');
  const dateEnd = document.getElementById('filter-date-end');
  if (!dateStart || !dateEnd) return;

  if (state.tab === 'tw' || !state.filters.dateStart || !state.filters.dateEnd) {
    const window = getDefaultWeekWindow();
    setDateWindow(window.start, window.end);
    return;
  }
  updateDateShortcutState();
}

function computeNextExpected() {
  const latestFrames = [...(state.filteredFrames || [])].filter(frame => frame?.date);
  const groups = new Map();
  for (const frame of latestFrames) {
    const visual = getFrameVisualInfo(frame);
    const current = groups.get(visual.label);
    if (!current || String(frame.date || '') > String(current.date || ''))
      groups.set(visual.label, frame);
  }
  // Must match the labels from getFrameVisualInfo.
  const preferredOrder = ['S1 A69', 'S1 D105', 'NISAR A39', 'NISAR A111', 'NISAR D61', 'NISAR D133'];
  const items = [...groups.entries()]
    .sort((a, b) => {
      const ai = preferredOrder.indexOf(a[0]);
      const bi = preferredOrder.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([label, frame]) => {
      const d = new Date(frame.date);
      return { label, date: `${d.getMonth() + 1}/${d.getDate()}`, color: getFrameVisualInfo(frame).color };
    });
  const key = items.some(item => item.label.startsWith('NISAR')) ? 'latest-visible' : 'latest-a69-d105';
  return {
    key, label: t(key), items,
    // Plain-text form, still used by the Stats panel KPI.
    value: items.length ? items.map(i => `${i.label} ${i.date}`).join(' | ') : t('need-history'),
  };
}

function updateNextExpected() {
  const el = document.getElementById('st-next');
  const labelEl = document.getElementById('st-next-label');
  if (!el) return;
  const result = computeNextExpected();
  if (labelEl) { labelEl.dataset.latestKey = result.key; labelEl.textContent = result.label; }
  // Rendered as a compact wrapping grid rather than one long line — joined
  // with ' | ' it stretched the card across the map and hid the frames.
  el.innerHTML = result.items.length
    ? result.items.map(item => `
        <span class="nx-item">
          <i class="nx-dot" style="background:${item.color}"></i>
          <span class="nx-trk">${escapeHtml(item.label)}</span>
          <span class="nx-date">${escapeHtml(item.date)}</span>
        </span>`).join('')
    : `<span class="nx-empty">${escapeHtml(t('need-history'))}</span>`;
}

function renderFrames() {
  ensureAdvancedState();
  state.frameLayer.clearLayers();
  state.framePolygons = [];

  const seenKeys = new Set();

  for (const frame of state.filteredFrames) {
    const geom = normalizeFootprint(frame.footprint);
    if (!geom || geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) continue;

    const key = getFrameKey(frame);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const rings = geom.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]]));
    const color = getFrameVisualInfo(frame).color;

    const polygon = L.polygon(rings, {
      color,
      baseColor: color,
      weight: 1.8,
      fillColor: color,
      fillOpacity: 0.1,
      opacity: 0.85,
    });

    polygon.on('mouseover', function() {
      if (state.selectedFrameKey === key) return;
      this.setStyle({ weight: 3.2, fillOpacity: 0.28, opacity: 1 });
    });
    polygon.on('mouseout', function() {
      if (state.selectedFrameKey === key) return;
      const hasSelection = !!state.selectedFrameKey;
      this.setStyle({ weight: hasSelection ? 1 : 1.8, fillOpacity: hasSelection ? 0.03 : 0.1, opacity: hasSelection ? 0.2 : 0.85 });
    });
    polygon.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (state.selectedFrameKey === key) {
        state.selectedFrameKey = null;
        closeDrawer();
      } else {
        state.selectedFrameKey = key;
        openFrameDrawer(frame);
      }
      updateMapSelectionState();
    });

    state.frameLayer.addLayer(polygon);
    state.framePolygons.push({ key, polygon });
  }

  updateMapSelectionState();
  if (!state.selectedFrameKey) {
    focusMapOnFrames(state.filteredFrames, { withDrawer: false, maxZoom: cfgNum('map.frameFocusMaxZoom', 8, { min: 1, max: 19 }), pad: cfgNum('map.frameFocusPadding', 0.2, { min: 0, max: 2 }) });
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeInlineJsArg(value) {
  return escapeHtml(JSON.stringify(String(value ?? '')));
}

function createDrawerCopyButton(label, url, variant) {
  return `<button type="button" class="d-copy-btn ${escapeHtml(variant)}" onclick="copyDrawerLink(this, ${escapeInlineJsArg(url)})">${escapeHtml(label)}</button>`;
}

// Final override: group drawer content by the clicked acquisition date, not by the whole track history.
function openFrameDrawer(clickedFrame) {
  document.querySelectorAll('.sat-row').forEach(r => r.classList.remove('active'));
  const satRow = document.querySelector(`.sat-row[data-sat-id="${clickedFrame.satellite_id}"]`);
  if (satRow) satRow.classList.add('active');
  state.selectedSat = null;

  const showSameTrackInDrawer = !!state.filters?.showSameTrackInDrawer;
  const clickedPath = getFramePathNumber(clickedFrame);
  const clickedAcquisition = getFrameAcquisitionInfo(clickedFrame);
  const historyFrames = state.filteredFrames
    .filter(frame => {
      if ((frame.satellite_id || '') !== (clickedFrame.satellite_id || '')) return false;
      if ((frame.direction_norm || '') !== (clickedFrame.direction_norm || '')) return false;
      if (showSameTrackInDrawer) {
        return getFramePathNumber(frame) === clickedPath;
      }
      return getFrameSeriesKey(frame) === getFrameSeriesKey(clickedFrame);
    })
    .sort((a, b) => (getFrameTimestamp(b) ?? 0) - (getFrameTimestamp(a) ?? 0));

  const selectedFrames = historyFrames.filter(frame => getFrameAcquisitionInfo(frame).key === clickedAcquisition.key);

  const mergeFramesForDrawer = frames => {
    const mergedEntries = new Map();
    for (const frame of frames) {
      const key = [
        frame.product_type_norm || '',
        frame.mode || '',
        normalizeGranuleKey(frame.granule) || '',
      ].join('|');
      const current = mergedEntries.get(key);
      if (!current) {
        mergedEntries.set(key, { ...frame });
        continue;
      }
      current.asf_url ||= frame.asf_url;
      current.copernicus_url ||= frame.copernicus_url;
      current.download_url ||= frame.download_url;
      current.file_size_mb ||= frame.file_size_mb;
      current.frame_number_norm ??= frame.frame_number_norm;
      current.granule ||= frame.granule;
    }
    return [...mergedEntries.values()].sort((a, b) => {
      const aScore = (a.asf_url ? 4 : 0) + (a.frame_number_norm !== null ? 2 : 0) + (a.copernicus_url || a.download_url ? 1 : 0);
      const bScore = (b.asf_url ? 4 : 0) + (b.frame_number_norm !== null ? 2 : 0) + (b.copernicus_url || b.download_url ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return (getFrameTimestamp(b) ?? 0) - (getFrameTimestamp(a) ?? 0);
    });
  };

  const entries = mergeFramesForDrawer(selectedFrames.length ? selectedFrames : [clickedFrame]);
  const primary = entries[0] || clickedFrame;
  const acquisition = getFrameAcquisitionInfo(primary);
  const acquisitionCount = new Set(historyFrames.map(frame => getFrameAcquisitionInfo(frame).key)).size;
  const getSourceState = frame => {
    const hasAsf = !!frame.asf_url;
    const hasCdse = !!(frame.copernicus_url || frame.download_url);
    if (hasAsf && hasCdse) return t('source-asf-cop');
    if (hasCdse) return t('source-cop-only');
    if (hasAsf) return t('source-asf-only');
    return t('source-none');
  };
  const getFrameStatus = frame => {
    // Spatial lookup takes priority — fn_norm may be wrong due to reconcileFrameMetadata
    // propagating a neighbor's frame number within the 120 s match window.
    const spatial = lookupAsfFrameNumber(frame);
    if (spatial !== null) return String(spatial);
    if (frame.frame_number_norm !== null && frame.frame_number_norm !== undefined && frame.frame_number_norm !== '') {
      return String(frame.frame_number_norm);
    }
    return frame.asf_url ? t('frame-meta-unavailable') : t('no-asf-metadata');
  };
  const frameCenterLabel = getFrameStatus(primary);

  document.getElementById('d-name').textContent = `Track ${getFramePathNumber(primary) ?? '--'} · Frame ${frameCenterLabel}`;
  document.getElementById('d-agency').textContent = `${primary.satellite_name || primary.platform || '--'} · ${primary.track_label || '--'} · ${getSourceState(primary)}`;
  document.getElementById('d-week-wrap').innerHTML = '';
  document.getElementById('d-grid').innerHTML = `
    <div class="d-item"><div class="k">${escapeHtml(t('track'))}</div><div class="v">${escapeHtml(getFramePathNumber(primary) ?? '--')}</div></div>
    <div class="d-item"><div class="k">${escapeHtml(t('frame'))}</div><div class="v">${escapeHtml(frameCenterLabel)}</div></div>
    <div class="d-item"><div class="k">${escapeHtml(t('direction'))}</div><div class="v"><small>${escapeHtml(primary.direction_norm || '--')}</small></div></div>
    ${buildDrawerModeCells(primary)}
    <div class="d-item"><div class="k">${escapeHtml(t('acquisitions'))}</div><div class="v"><small>${escapeHtml(t('n-acquisition-dates', { n: acquisitionCount }))}</small></div></div>
    <div class="d-item"><div class="k">${escapeHtml(t('files-label'))}</div><div class="v"><small>${escapeHtml(t('n-files-in-drawer', { n: entries.length, s: entries.length === 1 ? '' : 's' }))}</small></div></div>
    <div class="d-item span-2"><div class="k">${escapeHtml(t('source'))}</div><div class="v"><small>${escapeHtml(getSourceState(primary))}</small></div></div>
    <div class="d-item span-2"><div class="k">${escapeHtml(t('selected-date'))}</div><div class="v"><small>${escapeHtml(acquisition.label)}</small></div></div>
  `;

  const section = document.querySelector('.d-section');
  if (section) section.textContent = t('acquisition-files-section', { track: getFramePathNumber(primary) ?? '--', frame: frameCenterLabel });

  const groups = new Map();
  for (const frame of historyFrames) {
    const info = getFrameAcquisitionInfo(frame);
    const dateKey = info.dayKey || info.key.slice(0, 10);
    const list = groups.get(dateKey) || [];
    list.push(frame);
    groups.set(dateKey, list);
  }

  const cards = [...groups.entries()].map(([groupKey, groupFrames]) => {
    const acqLocale = state?.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
    // groupKey is already the display zone's calendar day (see dayKey above);
    // build a UTC midnight from those same y/m/d numbers purely so Intl can
    // render the locale's month/weekday names — timeZone:'UTC' here just
    // pins the formatter to the values we already picked, it does not
    // re-interpret the date across zones.
    const [gy, gm, gd] = groupKey.split('-').map(Number);
    const heading = Number.isFinite(gy)
      ? new Date(Date.UTC(gy, gm - 1, gd)).toLocaleDateString(acqLocale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
      : groupKey;
    const groupEntries = mergeFramesForDrawer(groupFrames);
    const body = groupEntries.map(frame => {
      const asfUrl = frame.asf_url || '';
      const cdseUrl = frame.copernicus_url || frame.download_url || '';
      const size = frame.file_size_mb ? `${frame.file_size_mb} MB` : '--';
      // A row carrying `section` instead of a label/value pair is the divider
      // between the fields every mission shares and that mission's own.
      const granuleMeta = buildFrameMetaRows(frame)
        .map(item => (item.section
          ? `<div class="d-link-meta-sec">${escapeHtml(item.section)}</div>`
          : `<div class="d-link-meta-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`))
        .join('');
      const actions = [
        asfUrl ? createDrawerCopyButton('Copy ASF', asfUrl, 'asf') : '',
        cdseUrl ? createDrawerCopyButton('Copy CDSE', cdseUrl, 'cdse') : '',
      ].filter(Boolean).join('');

      return `
        <div class="d-link-card">
          <div class="d-link-title">
            ${escapeHtml(frame.granule || 'Unknown Granule')}${(() => {
              // Release-tier sticker; NISAR only.
              const release = getNisarRelease(frame);
              return release
                ? `<span class="rel-badge rel-${release.cls}" title="${escapeHtml(t(release.key))}">${escapeHtml(release.label)}</span>`
                : '';
            })()}
          </div>
          <div class="d-link-top">
            <span>${escapeHtml(
              // NISAR ships several products per overpass differing only in
              // coverage and bandwidth; without them the cards look identical.
              isNisarFrame(frame)
                ? [getNisarBandLabel(frame), frame.product_type_norm, getNisarCoverage(frame), getNisarBandwidth(frame), size]
                    .filter(Boolean).join(' / ')
                : `${frame.product_type_norm || 'OCN'} / ${size}`
            )}</span>
            <span>${escapeHtml(frame.date ? formatDisplayTime(frame.date) : '--')}</span>
          </div>
          <div class="d-link-submeta">
            ${escapeHtml(getSourceState(frame))} / path ${escapeHtml(getFramePathNumber(frame) ?? '--')} / frame ${escapeHtml(getFrameStatus(frame))}
          </div>
          <div class="d-link-meta">
            ${granuleMeta}
          </div>
          <div class="d-link-actions">
            ${actions || `<span class="d-link-empty">${t('no-download-url')}</span>`}
          </div>
        </div>
      `;
    }).join('');

    return `
      <details class="d-group-fold"${groupKey === (clickedAcquisition.dayKey || clickedAcquisition.key.slice(0, 10)) ? ' open' : ''}>
        <summary class="d-group-summary">
          <span class="d-group-head">${escapeHtml(heading)}</span>
          <span class="d-group-meta">${groupEntries.length} file${groupEntries.length === 1 ? '' : 's'}</span>
        </summary>
        <div class="d-group-body">
          ${body}
        </div>
      </details>
    `;
  }).join('');
  document.getElementById('d-desc').innerHTML = cards || `<span style="color: var(--muted)">${t('no-file-match')}</span>`;
  document.getElementById('drawer').classList.add('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS PANEL
// ═══════════════════════════════════════════════════════════════════════════

// Cell sizes in HOURS, so the chart can resolve individual passes (Sentinel-1
// and NISAR cross Taiwan at fixed times of day) as well as long-term cadence.
const STATS_CELL_STEPS = [1, 3, 6, 12, 24, 48, 72, 120, 168, 336, 720];
// config.js names the size in hours rather than as an index into the array
// above, since an index is meaningless to a reader and silently shifts if the
// steps ever change. An hour value not on the list falls back to 1 day.
const STATS_CELL_DEFAULT_IDX = (() => {
  const hours = cfgNum('stats.cellSizeHours', 24);
  const idx = STATS_CELL_STEPS.indexOf(hours);
  if (idx === -1) {
    cfgWarn('stats.cellSizeHours', `one of ${STATS_CELL_STEPS.join(', ')}`, hours);
    return STATS_CELL_STEPS.indexOf(24);
  }
  return idx;
})();

function statsCellHours() {
  return STATS_CELL_STEPS[statsState.cellIdx] ?? 24;
}
// Filename-safe cell size, e.g. '6h' / '1d'.
function statsCellTag() {
  const hours = statsCellHours();
  return hours < 24 ? `${hours}h` : `${hours / 24}d`;
}
function formatCellSize(hours) {
  return hours < 24 ? `${hours}${t('stats-hour-suffix')}` : `${hours / 24}${t('stats-day-suffix')}`;
}
const STATS_CHART_SATS = cfgList('stats.chartSatellites', ['S1A', 'S1C', 'S1D', 'NISAR'],
  v => typeof v === 'string');
const STATS_S1_IDS     = new Set(['S1A', 'S1C', 'S1D']);
// Only the two priority Taiwan tracks are charted by default; T142/T171 clip
// the area and were dropped from the stats controls.
const STATS_S1_TRACKS  = cfgList('stats.s1Tracks', [69, 105],
  v => Number.isInteger(v));
// NISAR flies its own Taiwan tracks and gets its own chips, keyed by
// direction+path so ascending and descending stay distinct.
const STATS_NISAR_TRACKS = cfgList('stats.nisarTracks', [
  { key: 'A39',  path: 39,  dir: 'ASCENDING'  },
  { key: 'A111', path: 111, dir: 'ASCENDING'  },
  { key: 'D61',  path: 61,  dir: 'DESCENDING' },
  { key: 'D133', path: 133, dir: 'DESCENDING' },
], v => v && typeof v.key === 'string' && Number.isInteger(v.path)
     && (v.dir === 'ASCENDING' || v.dir === 'DESCENDING'));

function nisarTrackKey(frame) {
  const dir = frame?.direction_norm || frame?.direction || '';
  const prefix = dir === 'ASCENDING' ? 'A' : dir === 'DESCENDING' ? 'D' : '?';
  return `${prefix}${frame?.path_number_norm ?? ''}`;
}
const STATS_SAT_DEFAULT_COLORS = cfgMap('colors.statsSeries', {
  S1A: '#29b6f6', S1C: '#ce93d8', S1D: '#4db6ac', NISAR: '#ffb74d',
});

// Acquisition counts use ONE canonical product per mission. A single overpass
// is delivered as several products -- NISAR ships RSLC + GSLC + GCOV + SME2
// (+ GUNW pairs), Sentinel-1 ships SLC + GRD + RAW + OCN + ETAD -- so counting
// every product type would multiply each pass.
// Verified against the current catalog: RSLC covers all 35 NISAR acquisitions,
// SLC covers 1082 of 1088 Sentinel-1 ones.
const STATS_CANONICAL_PRODUCT = cfgMap('stats.canonicalProduct',
  { S1A: 'SLC', S1C: 'SLC', S1D: 'SLC', NISAR: 'RSLC' });

function statsIsCanonicalProduct(frame) {
  const wanted = STATS_CANONICAL_PRODUCT[frame.satellite_id];
  return !wanted || frame.product_type_norm === wanted;
}

// Track chips only govern Sentinel-1; NISAR flies its own Taiwan tracks
// (39/111 ascending, 61/133 descending) and is never filtered by them.
function statsTrackAllowed(frame) {
  const satId = String(frame.satellite_id || '');
  if (satId === 'NISAR') return statsState.activeNisarTracks.has(nisarTrackKey(frame));
  // Every Sentinel-1 platform, not just the charted ones — retired S1B also
  // appears in the track table and must honour the same track selection.
  if (/^S1/.test(satId)) return statsState.activeTracks.has(frame.path_number_norm);
  return true;
}

function getSatColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_sat_colors') || '{}');
    return { ...STATS_SAT_DEFAULT_COLORS, ...saved };
  } catch { return { ...STATS_SAT_DEFAULT_COLORS }; }
}
function statsSetSatColor(id, color) {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_sat_colors') || '{}');
    saved[id] = color;
    localStorage.setItem('sar_sat_colors', JSON.stringify(saved));
  } catch {}
  applySatColorChange();
}
function statsResetAllColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_sat_colors') || '{}');
    for (const id of STATS_CHART_SATS) delete saved[id];
    localStorage.setItem('sar_sat_colors', JSON.stringify(saved));
  } catch {}
  applySatColorChange();
}

// Series colours appear in the chart, the satellite chips and the legend.
// Refresh the chip colours in place so the panel body (and its scroll) stays.
function applySatColorChange() {
  const colors = getSatColors();
  for (const id of STATS_CHART_SATS) {
    for (const el of document.querySelectorAll(`[data-sat-color="${id}"]`)) {
      el.style.background = colors[id];
    }
    for (const el of document.querySelectorAll(`[data-sat-chip="${id}"]`)) {
      el.style.setProperty('--sc', colors[id]);
    }
  }
  renderStatsChart();
  renderStatsStylePanel();
}

// ── Chart appearance ────────────────────────────────────────────────────────
// User-tunable drawing parameters, persisted separately from the data filters.
// Everything here is presentation only; nothing changes what is counted.
const CHART_STYLE_BUILTIN = {
  chartWidth:  100,  // % of the available width; >100% scrolls horizontally
  chartHeight: 100,  // % of the height the current layout mode implies
  barWidth:    100,  // % of the space each bucket gets
  barOpacity:   88,  // %
  bandOpacity:   9,  // % — day/month banding behind the bars
  gridOpacity:  85,  // %
  gridWidth:     1,  // px
  labelSize:     0,  // px offset applied to axis labels
  barMinWidth:   1,  // px floor so sparse bars stay visible
  exportScale:   2,  // rasterisation factor for Copy / PNG
  axisTitles:    1,  // 0/1 — show x/y axis titles
};
const CHART_STYLE_RANGES = {
  // Above 100% the chart overflows its container and scrolls, which is the
  // only way to give dense ranges (a year at 1 h cells) usable bar spacing.
  chartWidth:  { min: 100, max: 800, step: 10, unit: '%' },
  // Scales the layout-derived height rather than replacing it, so the
  // stacked / split / chart-focus modes keep their relative proportions.
  chartHeight: { min: 40,  max: 400, step: 10, unit: '%' },
  // Bar width may exceed 100%: on a sparse chart the bucket is far wider than
  // the data needs, and overlapping bars are a legitimate way to make isolated
  // acquisitions visible. Bars are centred on their bucket so growing the
  // width stays symmetric.
  barWidth:    { min: 10, max: 400, step: 5,  unit: '%' },
  barOpacity:  { min: 10, max: 100, step: 5,  unit: '%' },
  bandOpacity: { min: 0,  max: 60,  step: 1,  unit: '%' },
  gridOpacity: { min: 0,  max: 100, step: 5,  unit: '%' },
  gridWidth:   { min: 0.25, max: 6, step: .25, unit: 'px' },
  labelSize:   { min: -3, max: 12,  step: 1,  unit: 'px' },
  barMinWidth: { min: 1,  max: 24,  step: 1,  unit: 'px' },
  exportScale: { min: 1,  max: 6,   step: 1,  unit: 'x' },
  axisTitles:  { min: 0,  max: 1,   step: 1,  unit: '' },
};

// Config overrides, each clamped to the slider's own range so a configured
// value can never sit outside what the appearance panel can represent (which
// would make the slider jump on first drag).
const CHART_STYLE_DEFAULTS = Object.fromEntries(
  Object.entries(CHART_STYLE_BUILTIN).map(([key, builtin]) => {
    const range = CHART_STYLE_RANGES[key] || {};
    return [key, cfgNum(`chartStyle.${key}`, builtin,
      { min: range.min ?? -Infinity, max: range.max ?? Infinity })];
  })
);

// Chart colours, kept apart from the numeric style settings because each may
// be "auto" (follow the theme) rather than an explicit value. An empty string
// means auto; 'transparent' is only meaningful for the background.
const CHART_COLOR_KEYS = ['background', 'text', 'grid', 'band'];
const CHART_COLOR_DEFAULTS = Object.fromEntries(CHART_COLOR_KEYS.map(
  k => [k, cfgStr(`chartStyle.colors.${k}`, '')]));

function getChartColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_colors') || '{}');
    return Object.fromEntries(CHART_COLOR_KEYS.map(
      k => [k, saved[k] || CHART_COLOR_DEFAULTS[k] || '']));
  } catch { return { ...CHART_COLOR_DEFAULTS }; }
}

// Resolve "auto" against the current theme so callers always get a real value.
function resolveChartColors() {
  const chosen = getChartColors();
  const root = getComputedStyle(document.documentElement);
  const panel = document.querySelector('.stats-panel');
  const themeBg = panel ? getComputedStyle(panel).backgroundColor : '';
  return {
    background: chosen.background || (themeBg && themeBg !== 'rgba(0, 0, 0, 0)' ? themeBg : '#ffffff'),
    text: chosen.text || root.getPropertyValue('--muted').trim() || '#666',
    grid: chosen.grid || root.getPropertyValue('--border').trim() || '#999',
    band: chosen.band || root.getPropertyValue('--text').trim() || '#888',
    isAuto: chosen,
  };
}

// <input type="color"> only accepts #rrggbb, but themes resolve to rgb().
function rgbToHex(value) {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  const m = text.match(/rgba?\(([^)]+)\)/i);
  if (!m) return '#888888';
  const [r, g, b] = m[1].split(',').map(n => Math.max(0, Math.min(255, Math.round(parseFloat(n)))));
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
}

// Axis titles: editable, falling back to a sensible default per language.
function statsAxisTitle(axis) {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_titles') || '{}');
    if (saved[axis]) return saved[axis];
  } catch {}
  if (axis === 'x') return `${t('axis-title-x')} (${displayTZLabel()})`;
  return t('axis-title-y');
}
function statsSetAxisTitle(axis, value) {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_titles') || '{}');
    const text = String(value || '').trim();
    if (text) saved[axis] = text; else delete saved[axis];
    localStorage.setItem('sar_chart_titles', JSON.stringify(saved));
  } catch {}
  renderStatsChart();
}

function statsSetChartColor(key, value) {
  if (!CHART_COLOR_KEYS.includes(key)) return;
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_colors') || '{}');
    if (value) saved[key] = value; else delete saved[key];
    localStorage.setItem('sar_chart_colors', JSON.stringify(saved));
  } catch {}
  renderStatsChart();
  renderStatsStylePanel();
}
function statsResetChartColors() {
  try { localStorage.removeItem('sar_chart_colors'); } catch {}
  renderStatsChart();
  renderStatsStylePanel();
}

function getChartStyle() {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_style') || '{}');
    return { ...CHART_STYLE_DEFAULTS, ...saved };
  } catch { return { ...CHART_STYLE_DEFAULTS }; }
}
function statsSetChartStyle(key, value) {
  if (!(key in CHART_STYLE_DEFAULTS)) return;
  try {
    const saved = JSON.parse(localStorage.getItem('sar_chart_style') || '{}');
    saved[key] = Number(value);
    localStorage.setItem('sar_chart_style', JSON.stringify(saved));
  } catch {}
  // Redraw the chart only. Rebuilding the whole panel would reset its scroll
  // position and tear down the popover mid-adjustment.
  renderStatsChart();
  renderStatsStylePanel();
}
function statsResetChartStyle() {
  try { localStorage.removeItem('sar_chart_style'); } catch {}
  renderStatsChart();
  renderStatsStylePanel();
}
function statsToggleStylePanel(event) {
  event?.stopPropagation();
  statsState.styleOpen = !statsState.styleOpen;
  renderStatsStylePanel();
}

// Appearance popover. Rendered on demand rather than with the panel body so
// that adjusting a slider does not rebuild (and scroll-reset) the whole panel.
function renderStatsStylePanel() {
  const pop = document.getElementById('stats-style-pop');
  const gear = document.getElementById('stats-gear');
  if (!pop) return;
  gear?.classList.toggle('on', statsState.styleOpen);
  if (!statsState.styleOpen) { pop.hidden = true; pop.innerHTML = ''; return; }

  const style = getChartStyle();
  const satColors = getSatColors();
  const styleIsCustom = Object.keys(CHART_STYLE_DEFAULTS)
    .some(key => style[key] !== CHART_STYLE_DEFAULTS[key]);
  const colorIsCustom = STATS_CHART_SATS.some(id => {
    try { return !!JSON.parse(localStorage.getItem('sar_sat_colors') || '{}')[id]; } catch { return false; }
  });

  // Live size readout: the sliders are relative, so show what they resolve to.
  const liveSvg = document.querySelector('#stats-chart-wrap svg');
  const sizeW = liveSvg ? Math.round(+liveSvg.getAttribute('width')) : 0;
  const sizeH = liveSvg ? Math.round(+liveSvg.getAttribute('height')) : 0;
  const ratio = sizeH ? (sizeW / sizeH) : 0;
  const ratioHTML = sizeW ? `
    <div class="sty-ratio">
      <span>${t('style-size')} <b>${sizeW}&times;${sizeH}</b></span>
      <span>${t('style-ratio')} <b>${ratio.toFixed(2)}:1</b></span>
    </div>` : '';

  const sliders = Object.entries(CHART_STYLE_RANGES).filter(([key]) => key !== 'axisTitles').map(([key, range]) => `
    <div class="sty-row">
      <span class="sty-lbl">${t('style-' + key)}</span>
      <input type="range" min="${range.min}" max="${range.max}" step="${range.step}"
             value="${style[key]}"
             oninput="this.nextElementSibling.textContent=this.value+'${range.unit}'"
             onchange="statsSetChartStyle('${key}', this.value)">
      <span class="sty-val">${style[key]}${range.unit}</span>
    </div>
    ${key === 'chartHeight' ? ratioHTML : ''}`).join('');

  const swatches = STATS_CHART_SATS.map(id => `
    <label class="sty-color" title="${escapeHtml(id)}">
      <span class="sty-color-dot" style="background:${satColors[id]}"></span>
      <span class="sty-color-id">${escapeHtml(id)}</span>
      <input type="color" value="${satColors[id]}" onchange="statsSetSatColor('${id}', this.value)">
    </label>`).join('');

  // Chart colours: each may be "auto" (follow the theme). Background also
  // supports transparent, which a colour input cannot express.
  const chartColors = resolveChartColors();
  const chosen = chartColors.isAuto;
  const chartColorsCustom = CHART_COLOR_KEYS.some(k => chosen[k]);
  const colorRows = CHART_COLOR_KEYS.map(key => {
    const isTransparent = chosen[key] === 'transparent';
    const shown = isTransparent ? '#ffffff' : chartColors[key];
    return `
    <div class="sty-crow">
      <span class="sty-lbl">${t('color-' + key)}</span>
      <span class="sty-swatch${isTransparent ? ' is-transparent' : ''}" style="background:${isTransparent ? '' : shown}">
        <input type="color" value="${rgbToHex(shown)}" onchange="statsSetChartColor('${key}', this.value)">
      </span>
      ${key === 'background'
        ? `<button class="sty-cbtn${isTransparent ? ' on' : ''}" onclick="statsSetChartColor('background', ${isTransparent ? "''" : "'transparent'"})">${t('color-transparent')}</button>`
        : ''}
      ${chosen[key]
        ? `<button class="sty-cbtn" onclick="statsSetChartColor('${key}','')">${t('color-auto')}</button>`
        : `<span class="sty-cauto">${t('color-auto')}</span>`}
    </div>`;
  }).join('');

  pop.innerHTML = `
    <div class="sty-sec">
      <div class="sty-sec-hd">
        <span>${t('stats-series-colors')}</span>
        ${colorIsCustom ? `<button class="sty-reset" onclick="statsResetAllColors()">${t('stats-reset')}</button>` : ''}
      </div>
      <div class="sty-colors">${swatches}</div>
    </div>
    <div class="sty-sec">
      <div class="sty-sec-hd">
        <span>${t('stats-chart-colors')}</span>
        ${chartColorsCustom ? `<button class="sty-reset" onclick="statsResetChartColors()">${t('stats-reset')}</button>` : ''}
      </div>
      ${colorRows}
    </div>
    <div class="sty-sec">
      <div class="sty-sec-hd"><span>${t('stats-axis-titles')}</span></div>
      <div class="sty-crow">
        <span class="sty-lbl">${t('axis-x')}</span>
        <input class="sty-text" type="text" value="${escapeHtml(statsAxisTitle('x'))}"
               onchange="statsSetAxisTitle('x', this.value)">
      </div>
      <div class="sty-crow">
        <span class="sty-lbl">${t('axis-y')}</span>
        <input class="sty-text" type="text" value="${escapeHtml(statsAxisTitle('y'))}"
               onchange="statsSetAxisTitle('y', this.value)">
      </div>
      <div class="sty-crow">
        <span class="sty-lbl">${t('axis-show')}</span>
        <button class="sty-cbtn${style.axisTitles ? ' on' : ''}"
                onclick="statsSetChartStyle('axisTitles', ${style.axisTitles ? 0 : 1})">${style.axisTitles ? t('color-auto') : t('color-transparent')}</button>
      </div>
    </div>
    <div class="sty-sec">
      <div class="sty-sec-hd">
        <span>${t('stats-appearance')}</span>
        ${styleIsCustom ? `<button class="sty-reset" onclick="statsResetChartStyle()">${t('stats-reset')}</button>` : ''}
      </div>
      ${sliders}
    </div>`;
  pop.hidden = false;
  positionStylePopover(pop, gear);
}

// The gear now sits inside the scrolling panel body, so the popover is placed
// from the gear's live position each time rather than pinned to a corner.
function positionStylePopover(pop, gear) {
  const panel = document.querySelector('.stats-panel');
  if (!panel || !gear) return;
  const panelRect = panel.getBoundingClientRect();
  const gearRect = gear.getBoundingClientRect();
  const width = pop.offsetWidth || 340;
  const height = pop.offsetHeight || 400;
  let left = gearRect.left - panelRect.left;
  let top  = gearRect.bottom - panelRect.top + 6;
  // Keep it inside the panel on small viewports.
  left = Math.max(8, Math.min(left, panelRect.width - width - 8));
  if (top + height > panelRect.height - 8) {
    top = Math.max(8, gearRect.top - panelRect.top - height - 6);
  }
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top  = `${Math.round(top)}px`;
  pop.style.right = 'auto';
}

const statsState = {
  styleOpen:    false,
  // 'custom' is deliberately not offered in config.js: it is only meaningful
  // alongside a start/end date the user picks in the panel.
  chartPreset:  cfgStr('stats.chartPreset', '6mo', ['1mo', '6mo', '1yr']),
  chartStart:   '',     // YYYY-MM-DD, only used when preset === 'custom'
  chartEnd:     '',     // YYYY-MM-DD, only used when preset === 'custom'
  cellIdx:    STATS_CELL_DEFAULT_IDX,
  // The "active" sets are intersected with what is actually chartable, so a
  // stale name left in config.js cannot switch on a series that has no chips.
  activeSats:   new Set(cfgList('stats.activeSatellites', STATS_CHART_SATS,
                  v => typeof v === 'string').filter(id => STATS_CHART_SATS.includes(id))),
  activeTracks: new Set(cfgList('stats.activeS1Tracks', STATS_S1_TRACKS,
                  Number.isInteger).filter(t => STATS_S1_TRACKS.includes(t))),
  activeNisarTracks: new Set(cfgList('stats.activeNisarTracks',
                  STATS_NISAR_TRACKS.map(track => track.key), v => typeof v === 'string')
                  .filter(k => STATS_NISAR_TRACKS.some(track => track.key === k))),
  pass:         cfgStr('stats.pass', 'ALL', ['ALL', 'ASCENDING', 'DESCENDING']),
  sortBy:       cfgStr('stats.sortBy', 'lastDate', ['lastDate', 'count', 'interval', 'name']),
  expanded:     new Set(STATS_CHART_SATS),  // featured sats open by default
  showInactive: false,
  activeFilter: null,  // { satId, track, dir } — track row the user last clicked
  openBucket:   null,  // { startMs, endMs, satId } — bar popup window, for TZ relabel
  layout:       localStorage.getItem('sar_stats_layout')
                  || cfgStr('stats.layout', 'stack', ['stack', 'split', 'chart']),
};

// Range boundaries sit on UTC+8 midnight, so buckets line up with the days
// the axis labels show regardless of the viewer's own timezone.
function getChartDateRange() {
  const today = toDisplayDate(new Date());
  const end = fromDisplayParts(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (statsState.chartPreset === 'custom' && statsState.chartStart && statsState.chartEnd) {
    const [sy, sm, sd] = statsState.chartStart.split('-').map(Number);
    const [ey, em, ed] = statsState.chartEnd.split('-').map(Number);
    if ([sy, sm, sd, ey, em, ed].every(Number.isFinite)) {
      const s = fromDisplayParts(sy, sm - 1, sd);
      const e = fromDisplayParts(ey, em - 1, ed + 1);
      if (s < e) return { start: s, end: e };
    }
  }
  const months = statsState.chartPreset === '1mo' ? 1 : statsState.chartPreset === '1yr' ? 12 : 6;
  const start = fromDisplayParts(today.getFullYear(), today.getMonth() - months, today.getDate() + 1);
  return { start, end };
}

function openStatsPanel() {
  const panel = document.getElementById('stats-panel');
  panel?.classList.add('open');
  syncLayoutButtons();
  try {
    renderStatsPanel();
  } catch (err) {
    console.error('[Stats] renderStatsPanel failed:', err);
    const body = document.getElementById('stats-panel-body');
    if (body) body.innerHTML = `<div style="padding:24px;color:var(--orange);font-family:var(--mono);font-size:13px">Stats render error: ${err.message}</div>`;
  }
  // mark stats mob-tab active
  document.querySelectorAll('.mob-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'stats')
  );
}
function closeStatsPanel() {
  statsState.styleOpen = false;
  renderStatsStylePanel();
  document.getElementById('stats-panel')?.classList.remove('open');
  if (_statsChartRO) { _statsChartRO.disconnect(); _statsChartRO = null; }
  // restore active state to the current body tab (or map)
  const cur = document.body.dataset.mobTab || 'map';
  document.querySelectorAll('.mob-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === cur)
  );
}

function syncLayoutButtons() {
  ['stack', 'split', 'chart'].forEach(id => {
    document.getElementById('sl-' + id)?.classList.toggle('on', id === statsState.layout);
  });
}

function statsSetLayout(l) {
  statsState.layout = l;
  localStorage.setItem('sar_stats_layout', l);
  syncLayoutButtons();
  renderStatsPanel();
}

// ── Data ────────────────────────────────────────────────────────────────────

// Parses the first YYYYMMDDTHHMMSS timestamp out of a Sentinel granule name.
function getGranuleStartMs(granule) {
  const m = String(granule || '').match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

// Builds a Map<frame, tileKey> for frames that lack frame_number_norm.
// Frames are grouped by (sat, date, path, dir), sorted by granule start time,
// and split into tiles whenever the gap between consecutive start times exceeds
// gapMs (default 20 s). Inter-tile gaps for S1 IW are ≥22 s; intra-tile product
// spread is ≤3 s, so 20 s cleanly separates tiles without bucket-boundary issues.
function buildTileKeyMap(frames, gapMs = 20000) {
  const groups = new Map();
  for (const f of frames) {
    if (f.frame_number_norm !== null && f.frame_number_norm !== undefined && f.frame_number_norm !== '') continue;
    const gk = `${f.satellite_id}|${(f.date || '').slice(0, 10)}|${f.path_number_norm ?? ''}|${f.direction_norm || ''}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push({ ms: getGranuleStartMs(f.granule) ?? 0, f });
  }
  const tileKeyMap = new Map();
  for (const items of groups.values()) {
    items.sort((a, b) => a.ms - b.ms);
    let tileId = 0, prevMs = -Infinity;
    for (const { ms, f } of items) {
      if (ms - prevMs > gapMs) { tileId++; prevMs = ms; }
      tileKeyMap.set(f, `t${tileId}`);
    }
  }
  return tileKeyMap;
}

function getAcqFramePosKey(frame, tileKeyMap) {
  // Use spatial lookup for priority tracks: reconcileFrameMetadata can propagate fn_norm
  // from a neighboring tile within 120 s, causing two spatial tiles to share the same
  // posKey and collapse into one count. The centroid-lat lookup is always spatially correct.
  const spatialKey = lookupAsfFrameNumber(frame);
  if (spatialKey !== null) return String(spatialKey);
  if (frame.frame_number_norm !== null && frame.frame_number_norm !== undefined && frame.frame_number_norm !== '') {
    return String(frame.frame_number_norm);
  }
  return tileKeyMap?.get(frame) ?? '';
}

function getFpCentroidLat(fp) {
  if (!Array.isArray(fp) || fp.length < 8) return null;
  let sum = 0, n = 0;
  for (let i = 1; i < fp.length; i += 2) { sum += fp[i]; n++; }
  return sum / n;
}

function lookupAsfFrameNumber(frame) {
  const path = frame.path_number_norm ?? frame.path_number;
  const bounds = S1_FRAME_BOUNDS[path];
  if (!bounds) return null;
  const lat = getFpCentroidLat(frame.fp);
  if (lat === null) return null;
  for (const [frameNum, lo, hi] of bounds) {
    if (lat >= lo && lat < hi) return frameNum;
  }
  return null;
}

function buildFrequencyStats() {
  const frames = state.rawFrames || [];
  const groups = new Map();
  for (const f of frames) {
    // Same track selection as the chart, so the two panels agree.
    if (!statsTrackAllowed(f)) continue;
    const satId = f.satellite_id || 'UNKNOWN';
    const track = f.path_number_norm ?? null;
    const dir   = f.direction_norm  || 'UNKNOWN';
    const key   = `${satId}||${track}||${dir}`;
    if (!groups.has(key)) groups.set(key, { satId, track, dir, dates: new Set() });
    // Distinct UTC+8 days: a 21:52 UTC descending pass belongs to the next
    // local day, and splitting it would distort the revisit interval.
    if (f.date) groups.get(key).dates.add(displayDateKey(f.date));
  }
  const trackStats = [];
  for (const g of groups.values()) {
    const sorted = [...g.dates].sort();
    const gaps   = [];
    for (let i = 1; i < sorted.length; i++)
      gaps.push((new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    const stdGap = (gaps.length > 1 && avgGap)
      ? Math.sqrt(gaps.reduce((s, x) => s + (x - avgGap) ** 2, 0) / gaps.length) : 0;
    const consistency = (avgGap && avgGap > 0)
      ? Math.max(0, Math.min(5, 5 - Math.round(5 * stdGap / avgGap))) : 0;
    const now = new Date();
    const sparkline = Array.from({ length: 24 }, (_, i) => {
      const d  = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1);
      const px = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return sorted.filter(dt => dt.startsWith(px)).length;
    });
    trackStats.push({
      satId: g.satId, track: g.track, dir: g.dir,
      count: sorted.length,
      lastDate:  sorted.at(-1) || null,
      firstDate: sorted[0]    || null,
      avgGap, consistency, sparkline,
    });
  }
  const satMap = new Map();
  for (const ts of trackStats) {
    if (!satMap.has(ts.satId)) {
      const sat = SATS.find(s => s.id === ts.satId);
      satMap.set(ts.satId, {
        satId: ts.satId, band: sat?.band || '?', name: sat?.name || ts.satId,
        tracks: [], totalCount: 0, lastDate: null, avgGap: null,
      });
    }
    const s = satMap.get(ts.satId);
    s.tracks.push(ts);
    s.totalCount += ts.count;
    if (!s.lastDate || (ts.lastDate && ts.lastDate > s.lastDate)) s.lastDate = ts.lastDate;
  }
  for (const s of satMap.values()) {
    const wg = s.tracks.filter(t => t.avgGap);
    if (wg.length) {
      const tw = wg.reduce((a, t) => a + t.count, 0);
      s.avgGap = wg.reduce((a, t) => a + t.avgGap * t.count, 0) / tw;
    }
    s.tracks.sort((a, b) => {
      const da = a.dir === 'ASCENDING' ? 0 : 1;
      const db = b.dir === 'ASCENDING' ? 0 : 1;
      return da !== db ? da - db : (a.track ?? 9999) - (b.track ?? 9999);
    });
  }
  return Array.from(satMap.values());
}

function buildChartBuckets() {
  const frames     = state.rawFrames || [];
  const cellMs     = statsCellHours() * 3600e3;
  const activeSats = statsState.activeSats;
  const pass = statsState.pass;
  const { start, end } = getChartDateRange();
  const startMs = start.getTime();
  const endMs   = end.getTime();
  const relevant = frames.filter(f => {
    if (!f.date || !activeSats.has(f.satellite_id)) return false;
    const t = Date.parse(f.date);
    if (!Number.isFinite(t) || t < startMs || t >= endMs) return false;
    if (pass !== 'ALL' && f.direction_norm !== pass) return false;
    if (!statsTrackAllowed(f)) return false;
    if (!statsIsCanonicalProduct(f)) return false;
    return true;
  });
  const tileKeyMap = buildTileKeyMap(relevant);

  const count = Math.max(1, Math.ceil((endMs - startMs) / cellMs));
  const buckets = Array.from({ length: count }, (_, i) => {
    const bStart = new Date(startMs + i * cellMs);
    const counts = {};
    for (const id of activeSats) counts[id] = 0;
    return {
      label: displayDateKey(bStart),
      start: bStart,
      end: new Date(Math.min(startMs + (i + 1) * cellMs, endMs)),
      counts, total: 0,
      firstMs: {},  // satId -> earliest actual acquisition instant in this bucket
    };
  });

  // Assign each frame to its bucket in one pass. Bucketing every frame against
  // every bucket is far too slow once cells are hour-sized (a year at 1 h is
  // ~8 800 buckets).
  const seen = new Set();
  for (const f of relevant) {
    const index = Math.floor((Date.parse(f.date) - startMs) / cellMs);
    if (index < 0 || index >= count) continue;
    // Deduplicate: the same physical acquisition appears from multiple sources
    // (ASF + Copernicus) and multiple product types. Count each scene once.
    // Keyed by day, so sub-day cells still collapse one pass into one count.
    const acqKey = `${index}|${f.satellite_id}|${displayDateKey(f.date)}|${f.path_number_norm ?? ''}|${f.direction_norm || ''}|${getAcqFramePosKey(f, tileKeyMap)}`;
    if (seen.has(acqKey)) continue;
    seen.add(acqKey);
    const bucket = buckets[index];
    bucket.counts[f.satellite_id] = (bucket.counts[f.satellite_id] || 0) + 1;
    bucket.total += 1;
    // Track the real pass time. Cells are boundary-aligned to the stride
    // (every 00:00/12:00/…), but Taiwan overpasses cluster near ~05h and ~18h
    // local, so the boundary itself is essentially never an actual pass time —
    // any UI that shows a time for a cell must show this, not bucket.start.
    const tms = Date.parse(f.date);
    const prevMs = bucket.firstMs[f.satellite_id];
    if (prevMs === undefined || tms < prevMs) bucket.firstMs[f.satellite_id] = tms;
  }
  return buckets;
}

// ── Render ──────────────────────────────────────────────────────────────────

let _statsChartRO = null;

function renderStatsPanel() {
  const body = document.getElementById('stats-panel-body');
  if (!body) return;
  const savedScroll = body.scrollTop;
  body.innerHTML = buildStatsPanelHTML();
  body.scrollTop = savedScroll;
  // The gear lives inside the body, so a rebuild replaces the element. Restore
  // its active state now rather than in the rAF below: rAF is throttled in
  // background tabs, which would leave the button out of sync with the popover.
  document.getElementById('stats-gear')?.classList.toggle('on', statsState.styleOpen);

  if (_statsChartRO) { _statsChartRO.disconnect(); _statsChartRO = null; }

  requestAnimationFrame(() => {
    renderStatsChart();
    // Re-anchor once the chart has its final size.
    if (statsState.styleOpen) {
      positionStylePopover(document.getElementById('stats-style-pop'), document.getElementById('stats-gear'));
    }
    const scrollEl = document.querySelector('.stats-chart-scroll');
    if (scrollEl && window.ResizeObserver) {
      let t;
      _statsChartRO = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(renderStatsChart, 40); });
      _statsChartRO.observe(scrollEl);
    }
  });
}

function fmtMonDay(dateStr) {
  if (!dateStr) return '—';
  const p = dateStr.slice(0, 10).split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  const locale = state.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
  return isNaN(d) ? dateStr.slice(5, 10) : d.toLocaleString(locale, { month: 'short', day: 'numeric' });
}

function formatStatsDirectionShort(dir) {
  if (dir === 'ASCENDING') return state.lang === 'zh-TW' ? '升' : 'ASC';
  if (dir === 'DESCENDING') return state.lang === 'zh-TW' ? '降' : 'DESC';
  return (dir || '').slice(0, 4);
}

function buildStatsPanelHTML() {
  const cellHours = statsCellHours();

  const presetHTML = [['1mo','stats-preset-1mo'],['6mo','stats-preset-6mo'],['1yr','stats-preset-1yr'],['custom','stats-preset-custom']].map(([k,labelKey]) =>
    `<button class="stats-chip${statsState.chartPreset === k ? ' on' : ''}" onclick="statsSetPreset('${k}')">${t(labelKey)}</button>`
  ).join('');

  const customRowHTML = statsState.chartPreset === 'custom' ? `
    <div class="stats-ctrl-row stats-custom-range">
      <span class="stats-ctrl-lbl"></span>
      <input class="stats-date-input" type="date" value="${statsState.chartStart}" onchange="statsSetChartDate('start',this.value)">
      <span class="stats-range-sep">→</span>
      <input class="stats-date-input" type="date" value="${statsState.chartEnd}" onchange="statsSetChartDate('end',this.value)">
    </div>` : '';

  const satColors = getSatColors();
  const hasCustomColors = STATS_CHART_SATS.some(id => {
    try { return !!JSON.parse(localStorage.getItem('sar_sat_colors') || '{}')[id]; } catch { return false; }
  });
  const chipHTML = STATS_CHART_SATS.map(id => {
    const on  = statsState.activeSats.has(id);
    const clr = satColors[id] || '#29b6f6';
    return `<div class="stats-chip-ctr"><label class="stats-color-dot" data-sat-color="${id}" style="background:${clr}" title="${t('stats-edit-color')}"><input type="color" value="${clr}" onchange="statsSetSatColor('${id}',this.value)"></label><button class="stats-chip${on ? ' on' : ''}" data-sat-chip="${id}" style="--sc:${clr}" title="${t('chip-solo-hint')}" onclick="statsToggleSat('${id}', event)">${id}</button></div>`;
  }).join('') + (hasCustomColors ? `<button class="stats-chip stats-chip-reset" onclick="statsResetAllColors()" title="${t('stats-reset-colors')}">↺</button>` : '');

  const sortHTML = [['lastDate','stats-sort-last-acq'],['count','stats-sort-frames'],['interval','stats-sort-interval'],['name','stats-sort-name']].map(([v, labelKey]) =>
    `<button class="stats-chip${statsState.sortBy === v ? ' on' : ''}" onclick="statsSetSort('${v}')">${t(labelKey)}</button>`
  ).join('');

  const passHTML = [
    ['ALL', 'stats-pass-all'],
    ['ASCENDING', 'stats-pass-asc'],
    ['DESCENDING', 'stats-pass-desc'],
  ].map(([v, labelKey]) =>
    `<button class="stats-chip${statsState.pass === v ? ' on' : ''}" onclick="statsSetPass('${v}')">${t(labelKey)}</button>`
  ).join('');

  const af = statsState.activeFilter;
  const activeFilterBadge = af ? `<span class="trk-filter-badge">${af.satId ? af.satId + ' ' : ''}T${af.track} ${formatStatsDirectionShort(af.dir)}<button class="trk-filter-clear" onclick="clearStatsFilter()">×</button></span>` : '';

  const soloHint = t('chip-solo-hint');
  const trackChipHTML = STATS_S1_TRACKS.map(track =>
    `<button class="stats-chip${statsState.activeTracks.has(track) ? ' on' : ''}" title="${soloHint}" onclick="statsToggleTrack(${track}, event)">T${track}</button>`
  ).join('');
  const nisarTrackChipHTML = STATS_NISAR_TRACKS.map(track =>
    `<button class="stats-chip${statsState.activeNisarTracks.has(track.key) ? ' on' : ''}" title="${soloHint}" onclick="statsToggleNisarTrack('${track.key}', event)">${track.key}</button>`
  ).join('');

  const legendHTML = STATS_CHART_SATS
    .filter(id => statsState.activeSats.has(id))
    .map(id => `<span class="stats-legend-item"><span class="stats-legend-sw" style="background:${satColors[id]}"></span>${id}</span>`)
    .join('');

  return `
  <div class="stats-dash layout-${statsState.layout}">

    <div class="stats-section stats-sec-chart">
      <div class="stats-section-hd">
        <span class="sec-lead">
          <button class="stats-gear" id="stats-gear" onclick="statsToggleStylePanel(event)" title="${t('stats-appearance')}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
              <circle cx="8" cy="8" r="2.4"/>
              <path d="M8 1.2v1.9M8 12.9v1.9M14.8 8h-1.9M3.1 8H1.2M12.8 3.2l-1.35 1.35M4.55 11.45L3.2 12.8M12.8 12.8l-1.35-1.35M4.55 4.55L3.2 3.2" stroke-linecap="round"/>
            </svg>
          </button>
          <span>${t('stats-acq-frequency-chart')} <span class="sts-hd-hint">· ${t('stats-all-acquisitions')}</span></span>
        </span>
        <span class="sec-tools">
          <button class="sec-tool" onclick="statsCopyChartPNG(this)" title="${t('copy-png-title')}">${t('copy-png')}</button>
          <button class="sec-tool" onclick="statsExportChartPNG(this)">PNG</button>
          <button class="sec-tool" onclick="statsExportChartSVG(this)">SVG</button>
          <button class="sec-tool" onclick="statsExportChartCSV(this)">CSV</button>
        </span>
      </div>
      <div class="stats-ctrls">
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-period')}</span>
          <div class="stats-chips">${presetHTML}</div>
        </div>
        ${customRowHTML}
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-cell-size')}</span>
          <div class="stats-stepper">
            <button class="sts-btn" onclick="statsSetCellIdx(${statsState.cellIdx - 1})">−</button>
            <span class="sts-val">${formatCellSize(cellHours)}</span>
            <button class="sts-btn" onclick="statsSetCellIdx(${statsState.cellIdx + 1})">+</button>
          </div>
        </div>
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-satellites')}</span>
          <div class="stats-chips">${chipHTML}</div>
        </div>
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-pass')}</span>
          <div class="stats-chips">${passHTML}</div>
        </div>
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-s1-tracks')}</span>
          <div class="stats-chips">${trackChipHTML}</div>
        </div>
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-nisar-tracks')}</span>
          <div class="stats-chips">${nisarTrackChipHTML}</div>
        </div>
      </div>
      <div class="stats-chart-scroll">
        <div class="stats-chart-wrap" id="stats-chart-wrap">
          <span class="stats-muted-msg">${t('stats-computing')}</span>
        </div>
      </div>
      <div class="stats-legend">${legendHTML}</div>
    </div>

    <div class="stats-section stats-sec-table">
      <div class="stats-section-hd">
        <span>${t('stats-track-statistics')}${activeFilterBadge}</span>
        <span class="sec-tools">
          <button class="sec-tool" onclick="statsCopyTableTSV(this)" title="${t('copy-tsv-title')}">${t('copy-label')}</button>
          <button class="sec-tool" onclick="statsExportTableCSV(this)">CSV</button>
        </span>
      </div>
      <div class="stats-ctrls">
        <div class="stats-ctrl-row">
          <span class="stats-ctrl-lbl">${t('stats-sort-by')}</span>
          <div class="stats-chips">${sortHTML}</div>
        </div>
      </div>
      <div class="stats-cards-wrap">${buildStatsCardsHTML()}</div>
    </div>

  </div>`;
}

function buildTrackOrientedStats() {
  const satStats  = buildFrequencyStats();
  const satColors = getSatColors();
  const trackMap  = new Map();

  for (const s of satStats) {
    for (const t of s.tracks) {
      const key = `${t.track}||${t.dir}`;
      if (!trackMap.has(key)) {
        trackMap.set(key, {
          track: t.track, dir: t.dir,
          sats: [], totalCount: 0, lastDate: null,
          sparkline: Array(24).fill(0),
          _gapW: 0, _gapN: 0,
        });
      }
      const row = trackMap.get(key);
      row.sats.push({
        satId: s.satId,
        color: satColors[s.satId] || platColor(s.satId),
        count: t.count, lastDate: t.lastDate, avgGap: t.avgGap,
      });
      row.totalCount += t.count;
      if (!row.lastDate || (t.lastDate && t.lastDate > row.lastDate)) row.lastDate = t.lastDate;
      for (let i = 0; i < 24; i++) row.sparkline[i] += (t.sparkline[i] || 0);
      if (t.avgGap) { row._gapW += t.avgGap * t.count; row._gapN += t.count; }
    }
  }

  const rows = [...trackMap.values()].map(row => {
    row.avgGap = row._gapN > 0 ? row._gapW / row._gapN : null;
    delete row._gapW; delete row._gapN;
    return row;
  });

  rows.sort((a, b) => {
    switch (statsState.sortBy) {
      case 'count':    return b.totalCount - a.totalCount;
      case 'interval': return (a.avgGap || 9999) - (b.avgGap || 9999);
      case 'lastDate': return (b.lastDate || '').localeCompare(a.lastDate || '');
      default: {
        const da = a.dir === 'ASCENDING' ? 0 : 1, db = b.dir === 'ASCENDING' ? 0 : 1;
        return da !== db ? da - db : (a.track ?? 9999) - (b.track ?? 9999);
      }
    }
  });
  return rows;
}

function buildStatsCardsHTML() {
  const rows = buildTrackOrientedStats();

  if (!rows.length)
    return `<div class="stats-muted-msg" style="padding:16px">${t('stats-no-data')}</div>`;

  const af = statsState.activeFilter;

  const html = rows.map(row => {
    const tNum    = row.track !== null ? `T${String(row.track).padStart(3, '0')}` : 'T—';
    const dirSh   = formatStatsDirectionShort(row.dir);
    const dirCls  = row.dir === 'ASCENDING' ? 'asc' : 'desc';
    const tVal    = row.track !== null ? row.track : '';
    const isActive = af && String(af.track) === String(tVal) && af.dir === row.dir;

    const satPills = row.sats.map(s =>
      `<span class="trk-sat-pill" style="--pc:${s.color}" title="${s.satId}: ${s.count.toLocaleString()} ${t('stats-frame-unit')} · ${s.avgGap ? `~${s.avgGap.toFixed(1)}${t('stats-day-suffix')}` : '—'} · ${t('stats-last')} ${fmtMonDay(s.lastDate)}">${s.satId}</span>`
    ).join('');

    const spark   = buildSparklineSvg(row.sparkline);
    const gapStr  = row.avgGap ? `~${row.avgGap.toFixed(1)}${t('stats-day-suffix')}` : '—';
    const lastStr = fmtMonDay(row.lastDate);

    return `<div class="trk-row${isActive ? ' active' : ''}" onclick="statsTrackInfoClick(event,'${tVal}','${row.dir}')" title="${t('stats-track-statistics')}">
      <span class="sts-tdir ${dirCls}">${dirSh}</span>
      <span class="trk-num">${tNum}</span>
      <div class="trk-pills">${satPills}</div>
      <div class="trk-spark">${spark}</div>
      <span class="trk-frames">${row.totalCount.toLocaleString()} ${t('stats-frame-unit')}</span>
      <span class="trk-intv">${gapStr}</span>
      <span class="trk-last">${lastStr}</span>
      <span class="trk-filter-icon" aria-hidden="true">↗</span>
    </div>`;
  }).join('');

  return `<div class="trk-flat-list">${buildTrackStatsAxisHTML()}${html}</div>`;
}

function buildTrackStatsAxisHTML() {
  const locale = state.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
  const monthLabelForIndex = index => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (23 - index));
    const mon = d.toLocaleString(locale, { month: 'short' });
    return `${mon}'${String(d.getFullYear()).slice(2)}`;
  };
  const labels = [0, 5, 11, 17, 23].map(monthLabelForIndex);
  return `<div class="trk-axis-row">
    <span class="sts-tdir trk-axis-blank"></span>
    <span class="trk-num trk-axis-blank"></span>
    <div class="trk-pills trk-axis-blank"></div>
    <div class="trk-axis-spark" title="Shared x-axis for the 24-month row trends">
      ${labels.map(label => `<span>${label}</span>`).join('')}
    </div>
    <span class="trk-frames trk-axis-metric">${t('stats-sort-frames')}</span>
    <span class="trk-intv trk-axis-metric">${t('stats-sort-interval')}</span>
    <span class="trk-last trk-axis-metric">${t('stats-last')}</span>
    <span class="trk-filter-icon trk-axis-blank"></span>
  </div>`;
}

function buildSparklineSvg(data) {
  const max  = Math.max(...data, 1);
  const H    = 18;
  const bw   = 3;
  const gap  = 1;
  const W = data.length * (bw + gap);
  const grid = [0, 5, 11, 17, 23].map(i => {
    const x = i * (bw + gap) + bw / 2;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="spark-grid"/>`;
  }).join('');
  const bars = data.map((v, i) => {
    const h = v > 0 ? Math.max(2, Math.round((v / max) * H)) : 0;
    return `<rect x="${i * (bw + gap)}" y="${H - h}" width="${bw}" height="${h}" class="spark-bar"/>`;
  }).join('');
  return `<div class="spark-wrap" title="24-month trend; scaled within this row, max ${max}">
    <svg class="spark-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
      ${grid}
      <line x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" class="spark-axis"/>
      ${bars}
    </svg>
  </div>`;
}

// Tooltip label for a bucket — includes the hour once cells are sub-day.
// Formats a real acquisition instant, e.g. "2026-07-19 05:52" in the display
// zone. Deliberately takes an instant (a frame's actual date), never a
// bucket's start/end: those are arbitrary stride boundaries (00:00, 12:00, …)
// and essentially never coincide with a real overpass, which for Taiwan
// clusters near ~05h and ~18h local — labelling the boundary itself would
// claim a pass happened at a time nothing actually flew over.
function statsInstantLabel(ms) {
  const dateStr = displayDateKey(ms);
  const timeStr = formatDisplayTime(ms, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} ${timeStr}`;
}

function renderStatsChart() {
  const wrap = document.getElementById('stats-chart-wrap');
  if (!wrap) return;
  const buckets = buildChartBuckets();
  if (!buckets.length || buckets.every(b => b.total === 0)) {
    wrap.innerHTML = `<span class="stats-muted-msg">${t('stats-no-window-data')}</span>`;
    return;
  }
  const activeSats = [...statsState.activeSats];
  const style      = getChartStyle();
  const maxTotal   = Math.max(...buckets.map(b => b.total), 1);
  // Sub-day cells use a two-row axis (hour above, date below) and need more
  // vertical room for it.
  const plotH = Math.round((statsState.layout === 'chart' ? 200 : 120) * (style.chartHeight / 100));

  // Compute nice integer Y-axis ticks so bar tops land on labelled gridlines.
  // For small maxTotal (≤5) show every integer; for larger use round steps.
  const yTicks = (() => {
    if (maxTotal <= 5) return Array.from({ length: maxTotal }, (_, i) => i + 1);
    const rough = maxTotal / 4;
    const step = [1, 2, 5, 10, 20, 25, 50, 100].find(c => c >= rough) ?? 100;
    const nMax = Math.ceil(maxTotal / step) * step;
    const out = [];
    for (let v = step; v <= nMax; v += step) out.push(v);
    return out;
  })();
  const niceMax = yTicks[yTicks.length - 1];

  // Always fit all bars within the container — no horizontal scroll.
  // Use a fractional stride so the bars span the full width: an integer stride
  // truncates up to one pixel per bar, which left a visible empty strip on the
  // right for dense ranges (a year at 1-day cells lost ~20% of the width).
  const rangeStartMs = buckets[0].start.getTime();
  const rangeEndMs   = buckets[buckets.length - 1].end.getTime();
  // Axis labels are centre-anchored, so the first and last overhang the chart
  // box by roughly half their width. Grow the container's side padding with
  // the label size, otherwise the end labels are clipped on screen.
  const sidePad = 14 + Math.max(0, Math.round(style.labelSize * 1.3));
  const scrollEl = wrap.parentElement;
  if (scrollEl) {
    scrollEl.style.paddingLeft = `${sidePad}px`;
    scrollEl.style.paddingRight = `${sidePad}px`;
  }
  // clientWidth includes padding, so subtract it to get the drawable width.
  const availableW = Math.max(200, (scrollEl?.clientWidth || 600) - sidePad * 2);
  const svgW = Math.max(200, availableW * (style.chartWidth / 100));
  const n    = buckets.length;

  const cellHours  = statsCellHours();
  const labelPx    = 9 + style.labelSize;
  const labelChars = cellHours >= 672 ? 6 : 5;
  // Estimate the drawn width from the actual font size — a fixed 30px slot
  // made labels collide as soon as the user raised the label size.
  const labelW     = Math.ceil(labelPx * 0.62 * labelChars) + 8;
  const totalDays  = Math.max(1, (rangeEndMs - rangeStartMs) / 864e5);

  // Sub-day cells get a two-row axis: hours on top, dates underneath. That is
  // only worth doing when a day is wide enough to read — at six months of 6 h
  // cells a day is ~7 px, where an hour scale says nothing and the date row is
  // what matters, so fall back to a single row of dates. Estimated against the
  // full width first, since the margins depend on the answer.
  const twoRowAxis = cellHours < 24
    && (svgW - 60) / totalDays >= 40 + style.labelSize * 3;

  // Journal-style margin box: tick labels and axis titles sit OUTSIDE the plot
  // area, so nothing is drawn over the gridlines.
  const titleGap = style.axisTitles ? labelPx + 10 : 0;
  const M = {
    top:    Math.max(6, Math.round(labelPx * 0.7)),
    right:  Math.ceil(labelW / 2) + 4,
    left:   Math.ceil(String(niceMax).length * labelPx * 0.62) + 12 + titleGap,
    bottom: Math.round(labelPx * 1.45) * (twoRowAxis ? 2 : 1) + 8 + titleGap,
  };
  const plotW = Math.max(40, svgW - M.left - M.right);
  const barH  = plotH;
  const cH    = plotH + M.top + M.bottom;

  const stride = plotW / n;
  const GAP    = stride > 4 ? 2 : 0;
  // Bar width is user-tunable as a share of the space each bucket gets.
  const BAR_W  = Math.max(style.barMinWidth, (stride - GAP) * (style.barWidth / 100));
  const dayWidthPx = plotW / totalDays;
  const labelEvery = Math.max(1, Math.ceil(labelW / stride));
  // Hour row: snap to a clean hour step (a multiple of the cell size) instead
  // of labelling every Nth bucket, which produced arbitrary hours like
  // 00, 13, 02, 15.
  const pxPerHour = stride / cellHours;
  const hourW     = Math.ceil(labelPx * 0.62 * 2) + 6;
  const hourStep  = [1, 2, 3, 4, 6, 8, 12]
    .filter(h => h % cellHours === 0)
    .find(h => h * pxPerHour >= hourW) ?? 12;

  // Low-key calendar banding behind the bars. With sub-day cells several bars
  // belong to one day and there is otherwise nothing separating them; at day+
  // cells the useful unit becomes the month.
  const bandUnit = cellHours < 24 ? 'day' : 'month';
  const cellMsForChart = cellHours * 3600e3;
  const xOfTime = ms => ((ms - rangeStartMs) / cellMsForChart) * stride;

  // Calendar segments drive both the banding and the date row of the axis.
  const calendarSegments = [];
  {
    // Walk UTC+8 calendar boundaries so bands and date labels agree.
    const cursor = toDisplayDate(rangeStartMs);
    cursor.setHours(0, 0, 0, 0);
    if (bandUnit === 'month') cursor.setDate(1);
    const toReal = d => fromDisplayParts(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
    // Guard against a pathological range producing a runaway loop.
    for (let guard = 0; cursor.getTime() < rangeEndMs && guard < 2000; guard++) {
      const next = new Date(cursor);
      if (bandUnit === 'day') next.setDate(next.getDate() + 1);
      else next.setMonth(next.getMonth() + 1);
      calendarSegments.push({
        start: toReal(cursor).getTime(),
        end: Math.min(toReal(next).getTime(), rangeEndMs),
      });
      cursor.setTime(next.getTime());
    }
  }
  let bandsSVG = '';
  calendarSegments.forEach((seg, index) => {
    if (index % 2 !== 1) return;
    const x0 = Math.max(0, xOfTime(seg.start));
    const x1 = Math.min(svgW, xOfTime(seg.end));
    if (x1 - x0 > 0.05) {
      bandsSVG += `<rect x="${x0.toFixed(2)}" y="0" width="${(x1 - x0).toFixed(2)}" height="${barH}" class="schart-band"/>`;
    }
  });

  // Axis frame: baseline plus the y scale. Tick labels are right-aligned in the
  // left gutter and vertically centred on their gridline, so they never sit on
  // top of it — the previous layout drew them inside the plot area.
  let gridSVG = `<line x1="0" y1="${barH}" x2="${plotW}" y2="${barH}" class="schart-axis"/>`
              + `<line x1="0" y1="0" x2="0" y2="${barH}" class="schart-axis"/>`;
  for (const tick of yTicks) {
    const y = barH - (tick / niceMax) * barH;
    gridSVG += `<line x1="0" y1="${y.toFixed(1)}" x2="${plotW}" y2="${y.toFixed(1)}" class="schart-grid"/>`;
    gridSVG += `<line x1="-4" y1="${y.toFixed(1)}" x2="0" y2="${y.toFixed(1)}" class="schart-axis"/>`;
    gridSVG += `<text x="-7" y="${y.toFixed(1)}" class="schart-glabel" text-anchor="end" dominant-baseline="central">${tick}</text>`;
  }

  const barSatColors = getSatColors();
  let barsSVG = '', labelsSVG = '';
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    const x = i * stride;
    let stackY = barH;
    for (const satId of [...activeSats].reverse()) {
      const cnt = b.counts[satId] || 0;
      if (!cnt) continue;
      const h = Math.max(1, Math.round((cnt / niceMax) * barH));
      stackY -= h;
      const clr = barSatColors[satId] || '#29b6f6';
      // Centre the bar in its bucket, then clamp to the viewBox so neither an
      // over-wide bar nor the minimum width spills past the edges.
      const bx = Math.max(0, Math.min(svgW - 0.5, x + (stride - GAP - BAR_W) / 2));
      const w  = Math.min(BAR_W, svgW - bx);
      const barTimeLabel = (cellHours <= 24 && b.firstMs[satId] !== undefined)
        ? statsInstantLabel(b.firstMs[satId])
        : b.label;
      barsSVG += `<rect x="${bx.toFixed(2)}" y="${stackY}" width="${w.toFixed(2)}" height="${h}" fill="${clr}" class="schart-bar" onclick="statsBarClick(event,${i},'${satId}')"><title>${barTimeLabel} · ${satId}: ${cnt}</title></rect>`;
    }
    if (twoRowAxis) {
      // Top row: hour only; the date is carried by the row beneath.
      const bStart = toDisplayDate(b.start);
      if (bStart.getHours() % hourStep === 0) {
        labelsSVG += `<text x="${(x + (stride - GAP) / 2).toFixed(2)}" y="${barH + labelPx * 1.35}" class="schart-label" text-anchor="middle">${String(bStart.getHours()).padStart(2, '0')}</text>`;
      }
    } else if (i % labelEvery === 0) {
      const d = toDisplayDate(b.start);
      const locale = state.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
      const cx = (x + (stride - GAP) / 2).toFixed(2);
      const lbl = cellHours >= 672
        ? `${d.toLocaleString(locale, { month: 'short' })}'${String(d.getFullYear()).slice(2)}`
        : `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
      labelsSVG += `<text x="${cx}" y="${barH + labelPx * 1.35}" class="schart-label" text-anchor="middle">${lbl}</text>`;
    }
  }

  // Second axis row: one date centred under each calendar segment, drawn only
  // where the segment is wide enough to hold it.
  if (twoRowAxis) {
    const segEvery = Math.max(1, Math.ceil((labelW + 4) / Math.max(1, dayWidthPx)));
    for (let si = 0; si < calendarSegments.length; si += segEvery) {
      const seg = calendarSegments[si];
      const x0 = Math.max(0, xOfTime(seg.start));
      const x1 = Math.min(svgW, xOfTime(seg.end));
      const d = toDisplayDate(seg.start);
      const lbl = `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
      labelsSVG += `<text x="${((x0 + x1) / 2).toFixed(2)}" y="${barH + labelPx * 2.8}" class="schart-daylabel" text-anchor="middle">${lbl}</text>`;
      labelsSVG += `<line x1="${x0.toFixed(2)}" y1="${barH}" x2="${x0.toFixed(2)}" y2="${barH + 4}" class="schart-daytick"/>`;
    }
  }

  const colors = resolveChartColors();
  const styleVars = [
    `--sc-bar-op:${style.barOpacity / 100}`,
    `--sc-band-op:${style.bandOpacity / 100}`,
    `--sc-grid-op:${style.gridOpacity / 100}`,
    `--sc-grid-w:${style.gridWidth}`,
    `--sc-lbl-bump:${style.labelSize}px`,
    `--sc-text:${colors.text}`,
    `--sc-grid-c:${colors.grid}`,
    `--sc-band-c:${colors.band}`,
  ].join(';');
  // Draw the background into the chart itself so the on-screen view and the
  // export are the same image — previously the panel supplied the backdrop and
  // only the exporter added one.
  const bgSVG = colors.background === 'transparent'
    ? ''
    : `<rect x="0" y="0" width="${svgW}" height="${cH}" fill="${colors.background}"/>`;

  let titlesSVG = '';
  if (style.axisTitles) {
    const xMid = M.left + plotW / 2;
    titlesSVG += `<text x="${xMid.toFixed(1)}" y="${cH - 4}" class="schart-axis-title" text-anchor="middle">${escapeHtml(statsAxisTitle('x'))}</text>`;
    const yMid = M.top + barH / 2;
    titlesSVG += `<text x="${(labelPx + 2).toFixed(1)}" y="${yMid.toFixed(1)}" class="schart-axis-title" text-anchor="middle" transform="rotate(-90 ${(labelPx + 2).toFixed(1)} ${yMid.toFixed(1)})">${escapeHtml(statsAxisTitle('y'))}</text>`;
  }

  wrap.innerHTML = `<svg class="schart-svg" style="${styleVars}" width="${svgW}" height="${cH}" viewBox="0 0 ${svgW} ${cH}">
    ${bgSVG}${titlesSVG}
    <g transform="translate(${M.left},${M.top})">${bandsSVG}${gridSVG}${barsSVG}${labelsSVG}</g>
  </svg>`;
}

// ── Controls ────────────────────────────────────────────────────────────────

function statsSetPreset(p) {
  statsState.chartPreset = p;
  if (p === 'custom' && !statsState.chartStart) {
    const now = new Date();
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const s = new Date(e);
    s.setMonth(s.getMonth() - 3);
    statsState.chartEnd   = e.toISOString().slice(0, 10);
    statsState.chartStart = s.toISOString().slice(0, 10);
  }
  renderStatsPanel();
}
function statsSetChartDate(field, val) {
  if (field === 'start') statsState.chartStart = val;
  else statsState.chartEnd = val;
  renderStatsPanel();
}
function statsSetCellIdx(idx) {
  statsState.cellIdx = Math.max(0, Math.min(STATS_CELL_STEPS.length - 1, idx));
  renderStatsPanel();
}
// Every chip may be switched off, including the last one — an empty selection
// legitimately means "show nothing".
function statsToggleSat(id, evt)        { chipTap('statsSats', id, evt); }
function statsToggleTrack(t, evt)       { chipTap('statsTracks', t, evt); }
function statsToggleNisarTrack(key, evt) { chipTap('statsNisarTracks', key, evt); }
function statsSetPass(pass) {
  statsState.pass = ['ALL', 'ASCENDING', 'DESCENDING'].includes(pass) ? pass : 'ALL';
  renderStatsPanel();
}
function statsSetSort(v)         { statsState.sortBy = v; renderStatsPanel(); }
function statsToggleShowInactive() { statsState.showInactive = !statsState.showInactive; renderStatsPanel(); }
function statsToggleExpand(satId) {
  statsState.expanded.has(satId) ? statsState.expanded.delete(satId) : statsState.expanded.add(satId);
  renderStatsPanel();
}

function positionStatsPopup(event, popup) {
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = event.clientX + 14;
  let top  = event.clientY - 8;
  if (left + 230 > vw) left = event.clientX - 244;
  if (top + 220 > vh) top  = vh - 228;
  popup.style.left = left + 'px';
  popup.style.top  = Math.max(8, top) + 'px';
}

function statsTrackInfoClick(event, trackNum, dir) {
  event?.stopPropagation?.();
  const rows = buildTrackOrientedStats();
  const row = rows.find(item =>
    String(item.track ?? '') === String(trackNum ?? '') &&
    item.dir === dir
  );
  if (!row) return;

  const popup = document.getElementById('schart-popup');
  if (!popup) return;

  const dirSh = formatStatsDirectionShort(row.dir);
  const dirCls = row.dir === 'ASCENDING' ? 'asc' : 'desc';
  const title = row.track !== null ? `T${String(row.track).padStart(3, '0')}` : 'T?';
  const avgGap = row.avgGap ? `~${row.avgGap.toFixed(1)}${t('stats-day-suffix')}` : '--';
  const satHTML = row.sats.map(s =>
    `<div class="scp-track-row">
      <span class="scp-tnum" style="color:${s.color}">${s.satId}</span>
      <span class="scp-tcnt">${s.count.toLocaleString()} ${t('stats-frame-unit')}</span>
    </div>`
  ).join('');

  popup.innerHTML = `
    <div class="scp-hdr">
      <span class="sts-tdir ${dirCls}">${dirSh}</span>
      <span class="scp-sat">${title}</span>
      <button class="scp-close" onclick="closeStatsBucketPopup()">x</button>
    </div>
    <div class="scp-period">${t('stats-last')} ${fmtMonDay(row.lastDate)}</div>
    <div class="scp-total">${row.totalCount.toLocaleString()} ${t('stats-frame-unit')} / ${t('stats-sort-interval')} ${avgGap}</div>
    ${satHTML || `<div class="scp-empty">${t('stats-no-track-data')}</div>`}
  `;
  popup.hidden = false;
  // This popup shares #schart-popup with the bar popup; drop any stored bar
  // window so a timezone change doesn't rebuild it as a bar card underneath.
  statsState.openBucket = null;
  positionStatsPopup(event, popup);
}

function statsBarClick(event, bucketIdx, satId) {
  const b = buildChartBuckets()[bucketIdx];
  if (!b) return;
  if (buildStatsBucketPopup(b.start.getTime(), b.end.getTime(), satId)) {
    positionStatsPopup(event, document.getElementById('schart-popup'));
  }
}

// Build (or rebuild) the bar popup for the acquisition window [startMs, endMs)
// and show it, WITHOUT repositioning. Split out from statsBarClick so a
// timezone change can relabel the times in place: the window is an absolute
// instant range stored in statsState.openBucket, so changing the zone only
// changes the displayed local time (and TZ badge), never the contents. The
// bucket *index* can't be reused across a zone change — getChartDateRange
// pins its bounds to display-zone midnights, so the indexing shifts.
function buildStatsBucketPopup(startMs, endMs, satId) {
  const popup = document.getElementById('schart-popup');
  if (!popup) return false;
  const b = { start: new Date(startMs), end: new Date(endMs), label: displayDateKey(new Date(startMs)) };

  const frames = state.rawFrames || [];
  // Day keys in the display timezone, so they line up with the map's date
  // filter (which now also compares display days).
  const bsDate = displayDateKey(b.start);
  const beDate = displayDateKey(b.end);
  // Membership itself is by timestamp: a sub-day cell starts and ends on the
  // same calendar day, so a string range would match nothing.
  const bsMs = startMs;
  const beMs = endMs;
  const inBucket = frames.filter(f =>
    f.satellite_id === satId && f.date &&
    Date.parse(f.date) >= bsMs && Date.parse(f.date) < beMs &&
    (statsState.pass === 'ALL' || f.direction_norm === statsState.pass) &&
    statsTrackAllowed(f) && statsIsCanonicalProduct(f)
  );

  // Deduplicate same as buildChartBuckets: unique frame scene per date/path/dir
  const barTileKeyMap = buildTileKeyMap(inBucket);
  const seenAcq = new Set();
  const trackMap = new Map();
  const realTimesMs = [];
  let uniqueCount = 0;
  for (const f of inBucket) {
    const d = displayDateKey(f.date);
    const acqKey = `${d}|${f.path_number_norm ?? ''}|${f.direction_norm || ''}|${getAcqFramePosKey(f, barTileKeyMap)}`;
    if (seenAcq.has(acqKey)) continue;
    seenAcq.add(acqKey);
    uniqueCount++;
    realTimesMs.push(Date.parse(f.date));
    const k = `${f.path_number_norm ?? ''}|${f.direction_norm || ''}`;
    if (!trackMap.has(k)) trackMap.set(k, { track: f.path_number_norm, dir: f.direction_norm, count: 0 });
    trackMap.get(k).count++;
  }
  realTimesMs.sort((a, c) => a - c);
  const tracks = [...trackMap.values()].sort((a, c) => c.count - a.count);

  const clr = getSatColors()[satId] || '#29b6f6';
  const cellHours = statsCellHours();
  // Sub-day cells show the *actual* pass time(s) — never the bucket's
  // boundary, which is only a stride mark (e.g. every 00:00/12:00) and
  // essentially never a real overpass instant. Day+ cells genuinely span a
  // range, so a date range is the right summary there.
  let periodLabel;
  if (cellHours <= 24 && realTimesMs.length) {
    const dateStr = displayDateKey(realTimesMs[0]);
    const timesStr = [...new Set(realTimesMs.map(ms =>
      formatDisplayTime(ms, { hour: '2-digit', minute: '2-digit', hour12: false })
    ))].join(', ');
    periodLabel = `${dateStr} ${timesStr}`;
  } else if (cellHours <= 24) {
    // No acquisitions counted — shouldn't happen from a bar click (only
    // non-empty bars are clickable), but keep a sane fallback.
    periodLabel = bsDate;
  } else {
    const endLabel = displayDateKey(b.end.getTime() - 86400000);
    periodLabel = `${b.label} – ${endLabel}`;
  }
  periodLabel += ` · ${displayTZLabel(new Date(realTimesMs[0] ?? b.start))}`;

  const trackHTML = tracks.map(trackInfo => {
    const dirSh    = formatStatsDirectionShort(trackInfo.dir || '?');
    const dirCls   = trackInfo.dir === 'ASCENDING' ? 'asc' : 'desc';
    const trackArg = trackInfo.track !== null && trackInfo.track !== undefined ? trackInfo.track : 'null';
    const dirArg   = trackInfo.dir ? `'${trackInfo.dir}'` : 'null';
    return `<div class="scp-track-row scp-track-link" onclick="applyStatsBucketFilter('${satId}','${bsDate}','${beDate}',${trackArg},${dirArg})">
      <span class="sts-tdir ${dirCls}">${dirSh}</span>
      <span class="scp-tnum">T${trackInfo.track ?? '?'}</span>
      <span class="scp-tcnt">${trackInfo.count} ${t('stats-frame-unit')}</span>
    </div>`;
  }).join('');

  popup.style.setProperty('--scp-accent', clr);
  popup.innerHTML = `
    <div class="scp-hdr">
      <span class="scp-sat" style="color:${clr}">${satId}</span>
      <button class="scp-close" onclick="closeStatsBucketPopup()">✕</button>
    </div>
    <div class="scp-period">${periodLabel}</div>
    <div class="scp-total">${uniqueCount} ${t(uniqueCount === 1 ? 'stats-frame-word' : 'stats-frames-word')}</div>
    ${trackHTML ? `<div class="scp-tracks">${trackHTML}</div>` : `<div class="scp-empty">${t('stats-no-track-data')}</div>`}
    <div class="scp-view-all-row" onclick="applyStatsBucketFilter('${satId}','${bsDate}','${beDate}',null,null)">${t('stats-view-on-map')}</div>
  `;
  popup.hidden = false;
  statsState.openBucket = { startMs, endMs, satId };
  return true;
}

// Relabel the open bar popup after a timezone change, in place. The stored
// window is an absolute instant range, so the contents are unchanged — only the
// displayed local time and TZ badge move.
function refreshStatsBucketPopup() {
  const popup = document.getElementById('schart-popup');
  const open = statsState.openBucket;
  if (!popup || popup.hidden || !open) return;
  buildStatsBucketPopup(open.startMs, open.endMs, open.satId);
}

function closeStatsBucketPopup() {
  const popup = document.getElementById('schart-popup');
  if (popup) popup.hidden = true;
  statsState.openBucket = null;
}

function applyStatsBucketFilter(satId, bsDate, beDateExclusive, trackNum, dir) {
  ensureAdvancedState();

  // bsDate / beDateExclusive are already display-timezone day keys from the
  // bucket. The end is exclusive; step back one day for the inclusive filter,
  // but never past the start (a sub-day cell spans a single day).
  const [ey, em, ed] = String(beDateExclusive).split('-').map(Number);
  const incEnd = Number.isFinite(ey)
    ? new Date(ey, em - 1, ed - 1)
    : null;
  const incEndKey = incEnd
    ? `${incEnd.getFullYear()}-${String(incEnd.getMonth() + 1).padStart(2, '0')}-${String(incEnd.getDate()).padStart(2, '0')}`
    : bsDate;
  const dateEnd = incEndKey < bsDate ? bsDate : incEndKey;

  // Satellite
  const effectiveSat = satId || 'ALL';
  state.filters.satellite = effectiveSat;
  state.selectedSat = satId ? (SATS.find(s => s.id === satId) || null) : null;
  state.selectedFrameKey = null;
  document.getElementById('drawer')?.classList.remove('open');
  const satSel = document.getElementById('filter-satellite');
  if (satSel) satSel.value = effectiveSat;

  // Date — pin to exact acquisition date (or range for multi-day bucket)
  state.filters.dateStart = bsDate;
  state.filters.dateEnd   = dateEnd;
  const dStart = document.getElementById('filter-date-start');
  const dEnd   = document.getElementById('filter-date-end');
  if (dStart) dStart.value = bsDate;
  if (dEnd)   dEnd.value   = dateEnd;
  updateDateShortcutState();

  // Direction
  state.filters.direction = (dir && dir !== 'UNKNOWN') ? dir : 'ALL';
  const dirSel = document.getElementById('filter-direction');
  if (dirSel) dirSel.value = state.filters.direction;

  // Track (only when a specific track row was clicked)
  state.filters.pathMin = '';
  state.filters.pathMax = '';
  const pMin = document.getElementById('filter-path-min');
  const pMax = document.getElementById('filter-path-max');
  if (pMin) pMin.value = '';
  if (pMax) pMax.value = '';
  const tn = trackNum !== null && trackNum !== undefined ? String(trackNum) : '';
  if (tn && tn !== 'null') {
    state.filters.pathMin = tn;
    state.filters.pathMax = tn;
    if (pMin) pMin.value = tn;
    if (pMax) pMax.value = tn;
  }

  // Guarantee the frame the chart counted is actually shown. Any of the
  // product-type / coverage / bandwidth sets can be empty (an empty set means
  // "match nothing"), which would hide the very acquisition we jumped to.
  const canonical = STATS_CANONICAL_PRODUCT[satId];
  if (canonical) {
    const targetSet = satId === 'NISAR' ? 'nisarFormats' : 'formats';
    state.filters[targetSet].add(canonical);
    state.filters.seeded.add(targetSet);   // treat as an explicit choice
  }
  if (satId === 'NISAR') {
    // Drop the NISAR sub-filters back to "no restriction"; clearing the seed
    // markers lets renderNisarOptions repopulate them to every value, so
    // coverage / bandwidth can't hide the jumped frame.
    state.filters.nisarCoverage.clear();
    state.filters.nisarBandwidth.clear();
    state.filters.nisarBand.clear();
    state.filters.seeded.delete('nisarCoverage');
    state.filters.seeded.delete('nisarBandwidth');
    state.filters.seeded.delete('nisarBand');
  }

  statsState.activeFilter = { satId, track: trackNum ?? null, dir: dir || null };
  closeStatsBucketPopup();
  setMobTab('map');
  applyAdvancedFilters();
  closeStatsPanel();
}

function applyStatsTrackFilter(satId, trackNum, dir) {
  ensureAdvancedState();
  const effectiveSat = satId || 'ALL';
  state.filters.satellite = effectiveSat;
  state.selectedSat = satId ? (SATS.find(s => s.id === satId) || null) : null;
  state.selectedFrameKey = null;
  document.getElementById('drawer')?.classList.remove('open');
  const satSel = document.getElementById('filter-satellite');
  if (satSel) satSel.value = effectiveSat;

  if (dir && dir !== 'UNKNOWN') {
    state.filters.direction = dir;
    const dirSel = document.getElementById('filter-direction');
    if (dirSel) dirSel.value = dir;
  }

  state.filters.pathMin = '';
  state.filters.pathMax = '';
  const pMin = document.getElementById('filter-path-min');
  const pMax = document.getElementById('filter-path-max');
  if (pMin) pMin.value = '';
  if (pMax) pMax.value = '';
  const tn = String(trackNum);
  if (tn && tn !== 'null' && tn !== '') {
    state.filters.pathMin = tn;
    state.filters.pathMax = tn;
    if (pMin) pMin.value = tn;
    if (pMax) pMax.value = tn;
  }

  statsState.activeFilter = { satId, track: trackNum, dir };
  setMobTab('map');
  applyAdvancedFilters();
  closeStatsPanel();
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
    focusMapOnFrames(state.filteredFrames, { withDrawer: false, maxZoom: cfgNum('map.frameFocusMaxZoom', 8, { min: 1, max: 19 }), pad: cfgNum('map.frameFocusPadding', 0.2, { min: 0, max: 2 }) });
  }, 80);
}

function clearStatsFilter() {
  statsState.activeFilter = null;
  ensureAdvancedState();
  state.filters.satellite = 'ALL';
  state.filters.direction = 'ALL';
  state.filters.pathMin   = '';
  state.filters.pathMax   = '';
  ['filter-satellite', 'filter-direction'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'ALL'; });
  ['filter-path-min',  'filter-path-max' ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  applyAdvancedFilters();
  renderStatsPanel();
}

// ── Stats exports ────────────────────────────────────────────────────────────

// ── WYSIWYG chart export ────────────────────────────────────────────────────
// Serialise a live SVG into a standalone copy that renders identically outside
// the page. Rather than re-declaring a stylesheet (which drifted from the real
// styles and silently dropped the day banding and every appearance setting),
// copy the *computed* value of the properties that affect drawing onto each
// element. That stays correct no matter how the CSS evolves.
const SVG_EXPORT_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin', 'opacity',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'letter-spacing', 'text-anchor', 'dominant-baseline',
];

function serializeChartSVG(svgEl, { background = true, padding = 10 } = {}) {
  const width  = Number(svgEl.getAttribute('width'))  || svgEl.getBoundingClientRect().width;
  const height = Number(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const source = [svgEl, ...svgEl.querySelectorAll('*')];
  const target = [clone, ...clone.querySelectorAll('*')];
  source.forEach((el, index) => {
    const out = target[index];
    if (!out || out.nodeType !== 1) return;
    const computed = getComputedStyle(el);
    let inline = '';
    for (const prop of SVG_EXPORT_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) inline += `${prop}:${value};`;
    }
    out.setAttribute('style', inline);
    // Classes and handlers are meaningless outside the page.
    out.removeAttribute('class');
    out.removeAttribute('onclick');
  });

  // Size the canvas from the real ink bounds, not the nominal width/height.
  // Axis labels are centre-anchored, so the first and last overhang the chart
  // box by half their width — with a fixed padding they were clipped ("/26"
  // instead of "10/26"). getBBox() reports the union including that overhang.
  let bounds = null;
  try { bounds = svgEl.getBBox(); } catch { /* not rendered yet */ }
  const minX = bounds ? Math.min(0, bounds.x) : 0;
  const minY = bounds ? Math.min(0, bounds.y) : 0;
  const maxX = bounds ? Math.max(width,  bounds.x + bounds.width)  : width;
  const maxY = bounds ? Math.max(height, bounds.y + bounds.height) : height;
  const outerW = (maxX - minX) + padding * 2;
  const outerH = (maxY - minY) + padding * 2;

  const outer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  outer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  outer.setAttribute('width', outerW);
  outer.setAttribute('height', outerH);
  outer.setAttribute('viewBox', `0 0 ${outerW} ${outerH}`);
  const chartColors = resolveChartColors();
  if (background && chartColors.background !== 'transparent') {
    // Fills the padding margin too, so the exported image has no halo.
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', chartColors.background);
    outer.appendChild(rect);
  }
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${padding - minX},${padding - minY})`);
  group.appendChild(clone);
  outer.appendChild(group);
  return { text: new XMLSerializer().serializeToString(outer), width: outerW, height: outerH };
}

async function chartToPngBlob(svgEl, scale = getChartStyle().exportScale) {
  const { text, width, height } = serializeChartSVG(svgEl);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('SVG could not be rasterised'));
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function statsChartFileTag() {
  const rangeTag = statsState.chartPreset === 'custom'
    ? `${statsState.chartStart}_${statsState.chartEnd}` : statsState.chartPreset;
  return `${rangeTag}_${statsCellTag()}`;
}

// Brief inline confirmation on the button that was pressed.
function flashButton(button, messageKey) {
  if (!button) return;
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.textContent = t(messageKey);
  button.classList.add('ok');
  clearTimeout(button._flashTimer);
  button._flashTimer = setTimeout(() => {
    button.textContent = button.dataset.label;
    button.classList.remove('ok');
  }, 1400);
}

async function statsCopyChartPNG(button) {
  const svgEl = document.querySelector('#stats-chart-wrap svg');
  if (!svgEl) return;
  try {
    const blob = await chartToPngBlob(svgEl);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    flashButton(button, 'copied');
  } catch (error) {
    console.warn('Copy failed, falling back to download:', error);
    // Clipboard images need a secure context and permission; fall back so the
    // action still produces something.
    statsExportChartPNG(button);
  }
}

async function statsExportChartPNG(button) {
  const svgEl = document.querySelector('#stats-chart-wrap svg');
  if (!svgEl) return;
  const blob = await chartToPngBlob(svgEl);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sar_chart_${statsChartFileTag()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flashButton(button, 'saved');
}

// Track Statistics is a table, so "copy" yields TSV — paste-ready for a
// spreadsheet, which is what a table is actually wanted for.
function statsCopyTableTSV(button) {
  const rows = [['satellite_id', 'band', 'track', 'direction', 'frames',
                 'avg_interval_days', 'consistency_0_5', 'first_date', 'last_date']];
  for (const sat of buildFrequencyStats()) {
    for (const track of sat.tracks) {
      rows.push([sat.satId, sat.band, track.track ?? '', track.dir, track.count,
                 track.avgGap ? track.avgGap.toFixed(2) : '', track.consistency,
                 track.firstDate || '', track.lastDate || '']);
    }
  }
  const tsv = rows.map(r => r.join(String.fromCharCode(9))).join(String.fromCharCode(10));
  navigator.clipboard.writeText(tsv)
    .then(() => flashButton(button, 'copied'))
    .catch(error => {
      // Clipboard writes need a focused document and a secure context; fall
      // back to a file so the action still produces something usable.
      console.warn('Copy failed, falling back to download:', error);
      statsExportTableCSV(button);
    });
}

function statsExportChartSVG(button) {
  const svgEl = document.querySelector('#stats-chart-wrap svg');
  if (!svgEl) return;
  triggerDownload(
    `sar_chart_${statsChartFileTag()}.svg`,
    serializeChartSVG(svgEl).text,
    'image/svg+xml'
  );
  flashButton(button, 'saved');
}

function statsExportChartCSV(button) {
  const buckets = buildChartBuckets();
  if (!buckets.length) return;
  const sats    = [...statsState.activeSats].sort();
  const headers = ['period_start', 'period_end', ...sats, 'total'];
  const rows    = buckets.map(b => [
    b.label,
    displayDateKey(b.end),
    ...sats.map(id => b.counts[id] || 0),
    b.total,
  ]);
  const cellTag = statsCellTag();
  const rangeTag2 = statsState.chartPreset === 'custom'
    ? `${statsState.chartStart}_${statsState.chartEnd}` : statsState.chartPreset;
  triggerDownload(
    `sar_chart_${rangeTag2}_${cellTag}.csv`,
    '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n'),
    'text/csv;charset=utf-8'
  );
}

function statsExportTableCSV(button) {
  const satStats = buildFrequencyStats();
  const headers  = ['satellite_id', 'band', 'track', 'direction', 'frames',
                    'avg_interval_days', 'consistency_0_5', 'first_date', 'last_date'];
  const rows = [];
  for (const s of satStats) {
    for (const t of s.tracks) {
      rows.push([
        s.satId, s.band,
        t.track !== null ? t.track : '',
        t.dir,
        t.count,
        t.avgGap   ? t.avgGap.toFixed(2)  : '',
        t.consistency,
        t.firstDate || '',
        t.lastDate  || '',
      ]);
    }
  }
  triggerDownload(
    'sar_track_stats.csv',
    '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n'),
    'text/csv;charset=utf-8'
  );
}

window.addEventListener('DOMContentLoaded', async () => {
  ensureAdvancedState();
  document.documentElement.lang = state.lang;
  const langSw = document.getElementById('lang-switch');
  if (langSw) langSw.classList.toggle('zh', state.lang === 'zh-TW');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  applyAppearanceSettings();
  syncAppearanceControls();
  setupReadableUI();
  rebuildDownloadBar();
  bindAppearanceControls();
  bindAdvancedControls();
  initMap();
  await loadData();

  document.addEventListener('click', event => {
    const panel = document.getElementById('export-panel');
    const toggle = document.getElementById('btn-export-toggle');
    if (!panel || !panel.classList.contains('open')) return;
    if (panel.contains(event.target) || toggle?.contains(event.target)) return;
    toggleExportPanel(false);
  });

  document.addEventListener('click', event => {
    // Close the appearance popover when clicking elsewhere inside the panel.
    if (statsState.styleOpen) {
      const path = event.composedPath();
      const pop = document.getElementById('stats-style-pop');
      const gear = document.getElementById('stats-gear');
      if (pop && !path.includes(pop) && !(gear && path.includes(gear))) {
        statsState.styleOpen = false;
        renderStatsStylePanel();
      }
    }
    const statsPanel = document.getElementById('stats-panel');
    if (!statsPanel || !statsPanel.classList.contains('open')) return;
    // Use composedPath() instead of contains(): if a chip's onclick calls renderStatsPanel()
    // the clicked node is detached before this handler fires, so contains() returns false.
    if (event.composedPath().includes(statsPanel)) return;
    if (event.target.closest?.('.mob-tab[data-tab="stats"]')) return;
    if (event.target.closest?.('.tab-stats')) return;
    closeStatsPanel();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeStatsPanel();
      closeStatsBucketPopup();
    }
  });

  document.addEventListener('click', e => {
    const popup = document.getElementById('schart-popup');
    if (popup && !popup.hidden && !popup.contains(e.target) && !e.target.closest('.schart-bar')) {
      closeStatsBucketPopup();
    }
  });

  // Safety net: ensure loading overlay is gone even if loadData resolved early
  document.getElementById('loading')?.classList.add('gone');
});

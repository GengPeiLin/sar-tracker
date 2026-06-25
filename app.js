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
  { id:'NISAR',  name:'NISAR',               agency:'NASA/ISRO',   band:'L', freq:'1.257 GHz', res:'3–25 m',   swath:'240 km',    launched:'2024-03-01', status:'op',
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
    'updated':'Updated:','tab-all':'All Satellites','tab-op':'Active','tab-tw':'This Week',
    'sat-fleet':'SAR Satellite Fleet','loading-ellipsis':'Loading…',
    'waiting-inventory':'Waiting for inventory…','n-satellites':'{n} satellites listed',
    'featured-missions':'Featured open missions','other-missions':'Other SAR missions',
    'other-missions-note':'Commercial and access-restricted missions stay collapsed by default so the sidebar stays centered on Sentinel-1 and NISAR.',
    'all-satellites':'All satellites','satellite-label':'Satellite','orbit-direction':'Orbit Direction',
    'dir-all':'All','dir-asc':'Ascending','dir-desc':'Descending',
    'date-start':'Date Start','date-end':'Date End',
    'track-min':'Track Min','track-max':'Track Max','frame-min':'Frame Min','frame-max':'Frame Max',
    'product-types':'Product Types','loading-types':'Loading...','no-product-types':'No product types in current inventory.',
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
    'highlight-label':'Highlight','highlight-solid':'Solid','highlight-dash':'Dash','highlight-color':'Color','highlight-gold':'Gold',
    'statistics-title':'Statistics','layout-stacked':'Stacked','layout-side-by-side':'Side by side','layout-chart-focus':'Chart focus',
    'chart-label':'Chart','table-label':'Table',
    'stats-acq-frequency-chart':'Acquisition Frequency Chart','stats-all-acquisitions':'all acquisitions',
    'stats-period':'Period','stats-preset-1mo':'1 mo','stats-preset-6mo':'6 mo','stats-preset-1yr':'1 yr','stats-preset-custom':'Custom',
    'stats-cell-size':'Cell size','stats-day-suffix':'d','stats-satellites':'Satellites','stats-s1-tracks':'S1 tracks',
    'stats-pass':'Pass','stats-pass-all':'All','stats-pass-asc':'ASC','stats-pass-desc':'DESC',
    'stats-computing':'Computing…','stats-track-statistics':'Track Statistics','stats-sort-by':'Sort by',
    'stats-sort-last-acq':'Last Acq','stats-sort-frames':'Frames','stats-sort-interval':'Interval','stats-sort-name':'Name',
    'stats-no-data':'No data available','stats-no-window-data':'No data in this window for the selected satellites',
    'stats-edit-color':'Edit color','stats-reset-colors':'Reset all to defaults',
    'stats-frame-unit':'fr','stats-frames-word':'frames','stats-frame-word':'frame','stats-last':'last','stats-no-track-data':'No track data',
    'this-week-map':'THIS WEEK',
  },
  'zh-TW': {
    'loading':'連線資料來源中…','loading-inventory':'載入最新取像清單…',
    'updated':'更新：','tab-all':'全部衛星','tab-op':'運作中','tab-tw':'本週取像',
    'sat-fleet':'SAR 衛星艦隊','loading-ellipsis':'載入中…',
    'waiting-inventory':'等待資料清單…','n-satellites':'{n} 顆衛星',
    'featured-missions':'精選開放任務','other-missions':'其他 SAR 任務',
    'other-missions-note':'商業及限制存取任務預設收折，讓側邊欄聚焦於 Sentinel-1 與 NISAR。',
    'all-satellites':'全部衛星','satellite-label':'衛星','orbit-direction':'軌道方向',
    'dir-all':'全部','dir-asc':'升軌','dir-desc':'降軌',
    'date-start':'開始日期','date-end':'結束日期',
    'track-min':'軌道最小值','track-max':'軌道最大值','frame-min':'幀號最小值','frame-max':'幀號最大值',
    'product-types':'產品類型','loading-types':'載入中...','no-product-types':'目前清單無產品類型。',
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
    'highlight-label':'醒目標示','highlight-solid':'實線','highlight-dash':'虛線','highlight-color':'顏色','highlight-gold':'金色',
    'statistics-title':'統計','layout-stacked':'上下排列','layout-side-by-side':'左右並排','layout-chart-focus':'圖表聚焦',
    'chart-label':'圖表','table-label':'表格',
    'stats-acq-frequency-chart':'取像頻率圖','stats-all-acquisitions':'全部取像',
    'stats-period':'時段','stats-preset-1mo':'1 個月','stats-preset-6mo':'6 個月','stats-preset-1yr':'1 年','stats-preset-custom':'自訂',
    'stats-cell-size':'格距','stats-day-suffix':'天','stats-satellites':'衛星','stats-s1-tracks':'S1 軌道',
    'stats-pass':'軌向','stats-pass-all':'全部','stats-pass-asc':'升軌','stats-pass-desc':'降軌',
    'stats-computing':'計算中…','stats-track-statistics':'軌道統計','stats-sort-by':'排序依據',
    'stats-sort-last-acq':'最新取像','stats-sort-frames':'幀數','stats-sort-interval':'間隔','stats-sort-name':'名稱',
    'stats-no-data':'無可用資料','stats-no-window-data':'此時段內所選衛星無資料',
    'stats-edit-color':'編輯顏色','stats-reset-colors':'重設為預設顏色',
    'stats-frame-unit':'幀','stats-frames-word':'幀','stats-frame-word':'幀','stats-last':'最近','stats-no-track-data':'無軌道資料',
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

function updateMobDbBadge(version) {
  const badge = document.getElementById('mob-db-ts');
  if (!badge || !version || !/^\d{8}T/.test(version)) return;
  const dbDate  = version.slice(0, 8); // "20260414"
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const today = fmt(new Date());
  const yesterday = fmt(new Date(Date.now() - 86400000));
  const label = `${dbDate.slice(0,4)}-${dbDate.slice(4,6)}-${dbDate.slice(6,8)}`;
  badge.textContent = label;
  badge.className = 'mob-db-ts ' +
    (dbDate === today ? 'fresh' : dbDate === yesterday ? 'recent' : 'stale');
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
  });
  document.querySelectorAll('input[placeholder="Any"], input[data-i18n-placeholder="any"]').forEach(el => {
    el.dataset.i18nPlaceholder = 'any';
    el.placeholder = t('any');
  });
  // re-render all dynamic UI
  setupReadableUI();
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

const PLATFORM_COLORS = {
  'S1A':'#00e5ff','S1C':'#ce93d8','S1D':'#4db6ac',
  'SENTINEL-1A':'#00e5ff','SENTINEL-1C':'#ce93d8','SENTINEL-1D':'#4db6ac',
  'ALOS-2':'#ff80ab','ALOS-4':'#ab68c4','ALOS2':'#ff80ab','ALOS4':'#ab68c4',
  'RADARSAT-2':'#ffc107','RCM-1':'#ffb300','RCM-2':'#ffa000','RCM-3':'#ff8f00',
  'R2':'#ffc107','RCM':'#ffb300',
  '_default':'#ff7043',
};

const NISAR_TRACK_COLORS = {
  'ASCENDING|39':   '#00e676',  // vivid green
  'ASCENDING|111':  '#ffd740',  // amber — clearly distinct from green
  'DESCENDING|61':  '#f06292',  // rose/pink
  'DESCENDING|133': '#b388ff',  // lavender — distinct from pink and green
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
  const label = rawLabel === 'OTHER_S1' ? 'Other Sentinel-1 tracks' : rawLabel;
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
  lang:   localStorage.getItem('lang') || 'en',
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
  state.map = L.map('map', { center:[23.5,121], zoom:6, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(state.map);

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
const DEFAULT_PRODUCT_TYPES = ['SLC', 'GSLC'];
const DEFAULT_PRODUCT_TYPES_BY_SATELLITE = {
  ALL: ['SLC', 'GSLC'],
  NISAR: ['GSLC'],
  S1A: ['SLC'],
  S1B: ['SLC'],
  S1C: ['SLC'],
  S1D: ['SLC'],
};
const KNOWN_PRODUCT_TYPES = ['L1_RSLC', 'L1_GSLC', 'L2_GCOV', 'L2_GUNW', 'GSLC', 'RSLC', 'SLC', 'GRD_HD', 'GRD_MS', 'GRD_HS', 'GRD_FD', 'GRD', 'GCOV', 'GUNW', 'RAW', 'SSC', 'OCN'];

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
    theme: 'soft-slate',
    fontSize: '4',
  };
  state.filters ||= {
    satellite: 'ALL',
    direction: 'ALL',
    showSameTrackInDrawer: false,
    showOtherSentinelTracks: false,
    pathMin: '',
    pathMax: '',
    frameMin: '',
    frameMax: '',
    dateStart: '',
    dateEnd: '',
    formats: new Set(),
  };
  if (!(state.filters.formats instanceof Set)) {
    state.filters.formats = new Set(state.filters.formats || []);
  }
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
    card.className = 'stat-card';
    card.innerHTML = `<div class="lbl" id="st-next-label">${t('latest-tracks')}</div><div class="val small" id="st-next">${t('need-history')}</div>`;
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

function satMatchesFrame(sat, frame) {
  const haystack = [frame.platform, frame.granule, frame.satellite_name, frame.satellite_id].join(' ').toUpperCase();
  const names = [sat.id, sat.name, ...(sat.asf_prefix || [])].map(v => String(v || '').toUpperCase());
  return names.some(name => name && haystack.includes(name));
}

function getSatForFrame(frame) {
  return SATS.find(sat => satMatchesFrame(sat, frame)) || null;
}

function enhanceFrame(frame) {
  const sat = getSatForFrame(frame) || {};
  const satelliteId = sat.id || frame.platform || 'UNKNOWN';
  const directionNorm = normalizeDirection(frame.direction);
  const pathNumberNorm = getFramePathNumber(frame);
  const frameNumberNorm = normalizeFrameNumber(frame.frame_number);

  // Reconstruct footprint from fp flat array
  let footprint = frame.footprint;
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
    satellite_band: sat.band || '',
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
  document.getElementById('hdr-time').textContent = `database: ${data.version || '--'}`;
  updateMobDbBadge(data.version);
  state.baseStats = data;
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
        ? `./data/sar_status.json?v=${encodeURIComponent(loadedVersion)}`
        : './data/sar_status.json';
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
        data = JSON.parse(new TextDecoder().decode(full));
      } else {
        data = await res.json();
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

async function liveFetchASF() {
  ensureAdvancedState();
  const now  = new Date();
  const wa   = new Date(now - 7 * 24 * 3600 * 1000);
  const fmt  = d => d.toISOString().replace(/\.\d+Z$/, 'UTC');
  const WKT  = 'POLYGON((121.5902 25.467,121.209 25.3739,120.8073 25.0382,119.9008 23.7334,119.9935 22.7865,120.5601 21.8426,120.9412 21.7277,122.167 25.0289,121.5902 25.467))';

  const url = 'https://api.daac.asf.alaska.edu/services/search/param?' + new URLSearchParams({
    intersectsWith: WKT,
    platform: 'S1A,S1C,S1D,A3,A4,R2,RCM,NISAR',
    processingLevel: 'SLC,GRD_HD,GRD_MS,GRD_HS,GRD_FD,RSLC,GSLC,L1_RSLC,L1_GSLC,L2_GCOV,L2_GUNW',
    start: fmt(wa),
    end: fmt(now),
    output: 'geojson',
    maxresults: 1000,
  });

  try {
    const response = await fetch(url);
    const gj = await response.json();

    const s1Platforms = ['S1A', 'S1C', 'S1D']; // Sentinel-1 platform codes

    const filteredFeatures = (gj.features || []).filter(feature => {
      const p = feature.properties || {};
      const platform = (p.platform || '').toUpperCase();
      if (s1Platforms.includes(platform)) {
        const pathNumber = String(p.pathNumber);
        const direction = (p.flightDirection || '').toUpperCase();
        // Filter Sentinel-1 tracks per requirements (105 = descending, 69 = ascending)
        return (pathNumber === '105' && direction === 'DESCENDING') ||
               (pathNumber === '69' && direction === 'ASCENDING');
      }
      return true; // Keep non-S1 satellites
    });

    state.rawFrames = reconcileFrameMetadata(
      filteredFeatures.map(feature => {
        const p = feature.properties || {};
        return enhanceFrame({
          source: 'ASF',
          granule: p.sceneName || '',
          platform: p.platform || '',
          sensor: p.sensor || '',
          date: p.startTime || '',
          stop_time: p.stopTime || '',
          mode: p.beamModeType || p.beamMode || '',
          polarization: p.polarization || '',
          orbit: p.orbit || '',
          path_number: p.pathNumber || '',
          frame_number: p.frameNumber || '',
          direction: p.flightDirection || '',
          product_type: p.processingLevel || '',
          processing_level: p.processingLevel || '',
          footprint: feature.geometry,
          asf_url: p.url || '',
          file_size_mb: +(p.sizeMB || 0).toFixed(1),
        });
      }).filter(frame => frame.is_open_data)
    );

    state.baseStats = {
      total_frames: state.rawFrames.length,
      query_start: wa.toISOString(),
      query_end: now.toISOString(),
      asf_count: state.rawFrames.length,
      copernicus_count: 0,
    };
    document.getElementById('hdr-time').textContent = 'Live ASF ' + new Date().toLocaleString(state.lang === 'zh-TW' ? 'zh-TW' : 'en-US');
    bindAdvancedControls();
    renderSatelliteSelect();
    renderFormatOptions();
    resetAdvancedFilters(false);
    applyAdvancedFilters();
  } catch (error) {
    document.getElementById('hdr-time').textContent = 'Load failed';
    console.error('ASF API failed', error);
  }
}

function matchesSidebarFilters(sat) {
  ensureAdvancedState();
  if (!isOpenDataSatelliteId(sat.id)) return false;
  if (state.band !== 'ALL' && sat.band !== state.band) return false;
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

  const visibleSats = SATS.filter(matchesSidebarFilters).filter(sat => (counts.get(sat.id) || 0) > 0);
  const orderedSats = [
    ...visibleSats.filter(isFeaturedSatellite),
    ...visibleSats.filter(sat => !isFeaturedSatellite(sat)),
  ];

  const options = [`<option value="ALL">${t('all-satellites')}</option>`];
  for (const sat of orderedSats) {
    const count = counts.get(sat.id) || 0;
    options.push(`<option value="${sat.id}">${sat.name}${count ? ` (${count})` : ''}</option>`);
  }
  select.innerHTML = options.join('');
  if (![...select.options].some(opt => opt.value === state.filters.satellite)) {
    state.filters.satellite = 'ALL';
  }
  select.value = state.filters.satellite;
}

function getFormatPoolFrames() {
  ensureAdvancedState();
  if (state.filters.satellite === 'ALL') return state.rawFrames;
  return state.rawFrames.filter(frame => frame.satellite_id === state.filters.satellite);
}

function getDefaultFormatsForSatellite(types) {
  const satKey = state.filters.satellite === 'ALL' ? 'ALL' : state.filters.satellite;
  const preferred = DEFAULT_PRODUCT_TYPES_BY_SATELLITE[satKey] || DEFAULT_PRODUCT_TYPES;
  const defaults = types.filter(type => preferred.includes(type));
  return defaults.length ? defaults : types;
}

function renderFormatOptions() {
  ensureAdvancedState();
  const wrap = document.getElementById('format-options');
  const summary = document.getElementById('product-summary');
  if (!wrap) return;

  const types = [...new Set(getFormatPoolFrames().map(frame => frame.product_type_norm).filter(Boolean))].sort();
  if (!types.length) {
    wrap.innerHTML = '<span class="filter-note">No product types in current inventory.</span>';
    state.filters.formats = new Set();
    if (summary) summary.textContent = '0 visible';
    return;
  }

  const stillValid = [...state.filters.formats].filter(type => types.includes(type));
  if (!stillValid.length) {
    state.filters.formats = new Set(getDefaultFormatsForSatellite(types));
  } else if (stillValid.length !== state.filters.formats.size) {
    state.filters.formats = new Set(stillValid);
  }

  wrap.innerHTML = '';
  for (const type of types) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'format-chip' + (state.filters.formats.has(type) ? ' on' : '');
    button.textContent = type;
    button.onclick = () => {
      if (state.filters.formats.has(type)) state.filters.formats.delete(type);
      else state.filters.formats.add(type);
      renderFormatOptions();
      applyAdvancedFilters();
    };
    wrap.appendChild(button);
  }
  if (summary) summary.textContent = `${state.filters.formats.size} selected · ${types.length} visible`;
}

function resetAdvancedFilters(apply = true) {
  ensureAdvancedState();
  const allTypes = [...new Set(state.rawFrames.map(frame => frame.product_type_norm).filter(Boolean))];
  const window = getDefaultWeekWindow();
  state.filters.satellite = 'ALL';
  state.filters.direction = 'ALL';
  state.filters.showSameTrackInDrawer = false;
  state.filters.showOtherSentinelTracks = false;
  state.filters.pathMin = '';
  state.filters.pathMax = '';
  state.filters.frameMin = '';
  state.filters.frameMax = '';
  state.filters.dateStart = window.start;
  state.filters.dateEnd = window.end;
  state.filters.formats = new Set(getDefaultFormatsForSatellite(allTypes));
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
  if (state.filters.formats.size && !state.filters.formats.has(frame.product_type_norm)) return false;

  const pathMinVal = normalizeFrameNumber(state.filters.pathMin);
  const pathMaxVal = normalizeFrameNumber(state.filters.pathMax);
  const pathVal = normalizeFrameNumber(frame.path_number) ?? normalizeFrameNumber(frame.orbit);
  if (pathMinVal !== null && (pathVal === null || pathVal < pathMinVal)) return false;
  if (pathMaxVal !== null && (pathVal === null || pathVal > pathMaxVal)) return false;

  const min = normalizeFrameNumber(state.filters.frameMin);
  const max = normalizeFrameNumber(state.filters.frameMax);
  if (min !== null && (frame.frame_number_norm === null || frame.frame_number_norm < min)) return false;
  if (max !== null && (frame.frame_number_norm === null || frame.frame_number_norm > max)) return false;

  if (state.filters.dateStart && frame.date && frame.date.slice(0, 10) < state.filters.dateStart) return false;
  if (state.filters.dateEnd && frame.date && frame.date.slice(0, 10) > state.filters.dateEnd) return false;

  return true;
}

function getFrameBoundsPreview() {
  return state.rawFrames.filter(frame => {
    if (state.band !== 'ALL' && frame.satellite_band !== state.band) return false;
    if (state.tab === 'op' && frame.sat_status === 'ret') return false;
    if (state.filters.satellite !== 'ALL' && frame.satellite_id !== state.filters.satellite) return false;
    if (state.filters.direction !== 'ALL' && frame.direction_norm !== state.filters.direction) return false;
    if (state.filters.formats.size && !state.filters.formats.has(frame.product_type_norm)) return false;
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
  openDrawer(sat, row, state.rawFrames.some(frame => satMatchesFrame(sat, frame)));
  applyAdvancedFilters();
}

function updateStats(data = state.baseStats || {}) {
  ensureAdvancedState();
  document.getElementById('st-frames').textContent = state.filteredFrames.length;
  document.getElementById('st-sats').textContent = new Set(state.filteredFrames.map(frame => frame.satellite_id)).size;

  const start = new Date(data.query_start || Date.now() - 7 * 864e5);
  const end = new Date(data.query_end || Date.now());
  const fmt = value => `${value.getMonth()+1}/${value.getDate()}`;
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

  const hlId = localStorage.getItem('sar_hl_style') || 'ring';
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
  note.textContent = t('note-formats', { sat: satLabel, formats: [...state.filters.formats].join(', ') || 'none', min, max, extra });
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

const HIGHLIGHT_STYLES = {
  ring:  { color: '#ffffff', weight: 3.5, dashArray: null,  fill: 0.36 },
  dash:  { color: '#ffffff', weight: 3.2, dashArray: '7 5', fill: 0.40 },
  color: { color: null,      weight: 4.5, dashArray: null,  fill: 0.55 }, // null → own frame color
  gold:  { color: '#ffd740', weight: 3.5, dashArray: null,  fill: 0.38 },
};

function setHighlightStyle(id) {
  localStorage.setItem('sar_hl_style', id);
  syncHighlightButtons();
  updateMapSelectionState();
}

function syncHighlightButtons() {
  const hlId = localStorage.getItem('sar_hl_style') || 'ring';
  document.querySelectorAll('#hl-btns .legend-hl-btn').forEach(btn => {
    btn.classList.toggle('on', btn.id === 'hl-' + hlId);
  });
}

function updateMapSelectionState() {
  const hasSelection = !!state.selectedFrameKey;
  const hlId = localStorage.getItem('sar_hl_style') || 'ring';
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
      return enhanceFrame({
        source: 'ASF',
        granule: p.sceneName || '',
        platform: p.platform || '',
        sensor: p.sensor || '',
        date: p.startTime || '',
        stop_time: p.stopTime || '',
        mode: p.beamModeType || p.beamMode || '',
        polarization: p.polarization || '',
        orbit: p.orbit || '',
        path_number: p.pathNumber || '',
        frame_number: p.frameNumber || '',
        direction: p.flightDirection || '',
        product_type: p.processingLevel || '',
        processing_level: p.processingLevel || '',
        footprint: feature.geometry,
        asf_url: p.url || '',
        file_size_mb: +(p.sizeMB || 0).toFixed(1),
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
    document.getElementById('hdr-time').textContent = 'Live ASF ' + new Date().toLocaleString(state.lang === 'zh-TW' ? 'zh-TW' : 'en-US');
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
  const key = startMs !== null
    ? new Date(startMs).toISOString().slice(0, 19)
    : `${getFrameSeriesKey(frame)}|${normalizeGranuleKey(frame?.granule) || 'unknown'}`;

  const acqLocale = state?.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
  const label = startMs !== null
    ? new Date(startMs).toLocaleString(acqLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }) + ' UTC'
    : t('unknown-acquisition');

  return { key, startMs, stopMs, label };
}

function parseGranuleMetadata(granule) {
  const text = String(granule || '').replace(/\.SAFE$/i, '').trim();
  if (!text) return [];

  if (/^S1[ABCD]_/.test(text)) {
    const parts = text.split('_').filter(Boolean);
    const start = parts[4] || '';
    const stop = parts[5] || '';
    return [
      { label: 'Mission', value: parts[0] || '--' },
      { label: 'Beam', value: parts[1] || '--' },
      { label: 'Product', value: parts[2] || '--' },
      { label: 'Level/Class/Pol', value: parts[3] || '--' },
      { label: 'Start', value: start || '--' },
      { label: 'Stop', value: stop || '--' },
      { label: 'Absolute Orbit', value: parts[6] || '--' },
      { label: 'Data-take', value: parts[7] || '--' },
      { label: 'Unique ID', value: parts[8] || '--' },
    ];
  }

  if (/^NISAR_/.test(text)) {
    const parts = text.split('_');
    const start = parts[10] || '';
    const stop = parts[11] || '';
    return [
      { label: 'Mission', value: parts[0] || '--' },
      { label: 'Level', value: parts[1] || '--' },
      { label: 'Instrument', value: parts[2] || '--' },
      { label: 'Product', value: parts[3] || '--' },
      { label: 'Release', value: parts[4] || '--' },
      { label: 'Orbit', value: parts[5] || '--' },
      { label: 'Direction', value: parts[6] || '--' },
      { label: 'Track', value: parts[7] || '--' },
      { label: 'Frame Group', value: parts[8] || '--' },
      { label: 'Pol', value: parts[9] || '--' },
      { label: 'Start', value: start || '--' },
      { label: 'Stop', value: stop || '--' },
      { label: 'Build', value: parts[12] || '--' },
      { label: 'Mode', value: parts[13] || '--' },
      { label: 'Provider', value: parts[14] || '--' },
      { label: 'Version', value: parts[15] || '--' },
    ];
  }

  return [{ label: 'Granule', value: text }];
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

function getDefaultWeekWindow() {
  const end = getQueryEndDate();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    start: formatDateInputValue(start),
    end: formatDateInputValue(end),
  };
}

function getPresetWindow(days) {
  const end = getQueryEndDate();
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
  state.filters.dateStart = window.start;
  state.filters.dateEnd = window.end;
  const dateStart = document.getElementById('filter-date-start');
  const dateEnd = document.getElementById('filter-date-end');
  if (dateStart) dateStart.value = window.start;
  if (dateEnd) dateEnd.value = window.end;
  updateDateShortcutState();
  applyAdvancedFilters();
}

function applyTabDateWindow() {
  const dateStart = document.getElementById('filter-date-start');
  const dateEnd = document.getElementById('filter-date-end');
  if (!dateStart || !dateEnd) return;

  if (state.tab === 'tw') {
    const window = getDefaultWeekWindow();
    state.filters.dateStart = window.start;
    state.filters.dateEnd = window.end;
    dateStart.value = window.start;
    dateEnd.value = window.end;
    updateDateShortcutState();
    return;
  }

  if (!state.filters.dateStart || !state.filters.dateEnd) {
    const window = getDefaultWeekWindow();
    state.filters.dateStart = window.start;
    state.filters.dateEnd = window.end;
    dateStart.value = window.start;
    dateEnd.value = window.end;
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
  const preferredOrder = ['A69', 'D105', 'NISAR A39', 'NISAR A111', 'NISAR D61', 'NISAR D133'];
  const lines = [...groups.entries()]
    .sort((a, b) => {
      const ai = preferredOrder.indexOf(a[0]);
      const bi = preferredOrder.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([label, frame]) => { const d = new Date(frame.date); return `${label} ${d.getMonth()+1}/${d.getDate()}`; });
  const key = lines.some(l => l.startsWith('NISAR')) ? 'latest-visible' : 'latest-a69-d105';
  return { key, label: t(key), value: lines.length ? lines.join(' | ') : t('need-history') };
}

function updateNextExpected() {
  const el = document.getElementById('st-next');
  const labelEl = document.getElementById('st-next-label');
  if (!el) return;
  const result = computeNextExpected();
  if (labelEl) { labelEl.dataset.latestKey = result.key; labelEl.textContent = result.label; }
  el.textContent = result.value;
}

function renderFrames() {
  ensureAdvancedState();
  state.frameLayer.clearLayers();
  state.framePolygons = [];

  const seenKeys = new Set();

  for (const frame of state.filteredFrames) {
    const geom = frame.footprint;
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
    focusMapOnFrames(state.filteredFrames, { withDrawer: false, maxZoom: 8, pad: 0.2 });
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

function createDrawerCopyButton(label, url, variant) {
  return `<button type="button" class="d-copy-btn ${variant}" onclick="copyDrawerLink(this, '${escapeHtml(url)}')">${label}</button>`;
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
    <div class="d-item"><div class="k">${t('track')}</div><div class="v">${getFramePathNumber(primary) ?? '--'}</div></div>
    <div class="d-item"><div class="k">${t('frame')}</div><div class="v">${frameCenterLabel}</div></div>
    <div class="d-item"><div class="k">${t('direction')}</div><div class="v"><small>${primary.direction_norm || '--'}</small></div></div>
    <div class="d-item"><div class="k">${t('mode')}</div><div class="v"><small>${primary.mode || '--'}</small></div></div>
    <div class="d-item"><div class="k">${t('acquisitions')}</div><div class="v"><small>${t('n-acquisition-dates', { n: acquisitionCount })}</small></div></div>
    <div class="d-item"><div class="k">${t('files-label')}</div><div class="v"><small>${t('n-files-in-drawer', { n: entries.length, s: entries.length === 1 ? '' : 's' })}</small></div></div>
    <div class="d-item span-2"><div class="k">${t('source')}</div><div class="v"><small>${getSourceState(primary)}</small></div></div>
    <div class="d-item span-2"><div class="k">${t('selected-date')}</div><div class="v"><small>${acquisition.label}</small></div></div>
  `;

  const section = document.querySelector('.d-section');
  if (section) section.textContent = t('acquisition-files-section', { track: getFramePathNumber(primary) ?? '--', frame: frameCenterLabel });

  const groups = new Map();
  for (const frame of historyFrames) {
    const info = getFrameAcquisitionInfo(frame);
    const list = groups.get(info.key) || [];
    list.push(frame);
    groups.set(info.key, list);
  }

  const cards = [...groups.entries()].map(([groupKey, groupFrames]) => {
    const heading = getFrameAcquisitionInfo(groupFrames[0]).label;
    const groupEntries = mergeFramesForDrawer(groupFrames);
    const body = groupEntries.map(frame => {
      const asfUrl = frame.asf_url || '';
      const cdseUrl = frame.copernicus_url || frame.download_url || '';
      const size = frame.file_size_mb ? `${frame.file_size_mb} MB` : '--';
      const granuleMeta = parseGranuleMetadata(frame.granule)
        .map(item => `<div class="d-link-meta-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
        .join('');
      const actions = [
        asfUrl ? createDrawerCopyButton('Copy ASF', asfUrl, 'asf') : '',
        cdseUrl ? createDrawerCopyButton('Copy CDSE', cdseUrl, 'cdse') : '',
      ].filter(Boolean).join('');

      return `
        <div class="d-link-card">
          <div class="d-link-title">
            ${escapeHtml(frame.granule || 'Unknown Granule')}
          </div>
          <div class="d-link-top">
            <span>${escapeHtml(frame.product_type_norm || 'OCN')} / ${escapeHtml(size)}</span>
            <span>${escapeHtml(frame.date ? new Date(frame.date).toLocaleString(state.lang === 'zh-TW' ? 'zh-TW' : 'en-US') : '--')}</span>
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
      <details class="d-group-fold"${groupKey === clickedAcquisition.key ? ' open' : ''}>
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

const STATS_CELL_STEPS = [1, 2, 3, 5, 7, 14, 30];
const STATS_CHART_SATS = ['S1A', 'S1C', 'S1D', 'NISAR'];
const STATS_S1_IDS     = new Set(['S1A', 'S1C', 'S1D']);
const STATS_S1_TRACKS  = [69, 105, 142, 171];
const STATS_SAT_DEFAULT_COLORS = {
  S1A: '#29b6f6', S1C: '#ce93d8', S1D: '#4db6ac', NISAR: '#ffb74d',
};

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
  renderStatsPanel();
}
function statsResetAllColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('sar_sat_colors') || '{}');
    for (const id of STATS_CHART_SATS) delete saved[id];
    localStorage.setItem('sar_sat_colors', JSON.stringify(saved));
  } catch {}
  renderStatsPanel();
}

const statsState = {
  chartPreset:  '6mo',  // '1mo' | '6mo' | '1yr' | 'custom'
  chartStart:   '',     // YYYY-MM-DD, only used when preset === 'custom'
  chartEnd:     '',     // YYYY-MM-DD, only used when preset === 'custom'
  cellIdx:    0,
  activeSats:   new Set(['S1A', 'S1C', 'S1D', 'NISAR']),
  activeTracks: new Set([69, 105]),  // T142 & T171 excluded by default
  pass:         'ALL',
  sortBy:       'lastDate',
  expanded:     new Set(STATS_CHART_SATS),  // featured sats open by default
  showInactive: false,
  activeFilter: null,  // { satId, track, dir } — track row the user last clicked
  layout:       localStorage.getItem('sar_stats_layout') || 'stack',
};

function getChartDateRange() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (statsState.chartPreset === 'custom' && statsState.chartStart && statsState.chartEnd) {
    const s = new Date(statsState.chartStart);
    const e = new Date(statsState.chartEnd);
    if (!isNaN(s) && !isNaN(e) && s < e) {
      e.setDate(e.getDate() + 1);
      return { start: s, end: e };
    }
  }
  const start = new Date(end);
  const months = statsState.chartPreset === '1mo' ? 1 : statsState.chartPreset === '1yr' ? 12 : 6;
  start.setMonth(start.getMonth() - months);
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

// Returns a stable key that identifies the spatial frame tile for deduplication.
// When frame_number is present it's used directly; when absent (Copernicus data),
// the granule acquisition start time bucketed to 10 s groups product types for the
// same tile while keeping distinct tiles (which are ≥25 s apart) separate.
function getAcqFramePosKey(frame) {
  if (frame.frame_number_norm !== null && frame.frame_number_norm !== undefined && frame.frame_number_norm !== '') {
    return String(frame.frame_number_norm);
  }
  const m = String(frame.granule || '').match(/\d{8}T(\d{4})(\d{2})/);
  if (m) {
    const sBucket = Math.floor(parseInt(m[2]) / 10) * 10;
    return `g${m[1]}${String(sBucket).padStart(2, '0')}`;
  }
  return '';
}

function buildFrequencyStats() {
  const frames = state.rawFrames || [];
  const groups = new Map();
  for (const f of frames) {
    const satId = f.satellite_id || 'UNKNOWN';
    const track = f.path_number_norm ?? null;
    const dir   = f.direction_norm  || 'UNKNOWN';
    const key   = `${satId}||${track}||${dir}`;
    if (!groups.has(key)) groups.set(key, { satId, track, dir, dates: new Set() });
    if (f.date) groups.get(key).dates.add(f.date.slice(0, 10));
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
  const frames    = state.rawFrames || [];
  const cellDays  = STATS_CELL_STEPS[statsState.cellIdx];
  const activeSats = statsState.activeSats;
  const pass = statsState.pass;
  const { start, end } = getChartDateRange();
  const startStr = start.toISOString().slice(0, 10);
  const endStr   = end.toISOString().slice(0, 10);
  const relevant = frames.filter(f => {
    if (!f.date || !activeSats.has(f.satellite_id)) return false;
    if (f.date.slice(0, 10) < startStr || f.date.slice(0, 10) >= endStr) return false;
    if (pass !== 'ALL' && f.direction_norm !== pass) return false;
    if (STATS_S1_IDS.has(f.satellite_id) && !statsState.activeTracks.has(f.path_number_norm)) return false;
    return true;
  });
  const buckets = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const bEnd = new Date(cursor);
    bEnd.setDate(bEnd.getDate() + cellDays);
    if (bEnd > end) bEnd.setTime(end.getTime());
    const bs = cursor.toISOString().slice(0, 10);
    const be = bEnd.toISOString().slice(0, 10);
    const counts = {};
    for (const id of activeSats) counts[id] = 0;
    const seen = new Set();
    for (const f of relevant) {
      const d = f.date.slice(0, 10);
      if (d >= bs && d < be) {
        // Deduplicate: same physical acquisition can appear from multiple sources (ASF + Copernicus)
        // and multiple product types. Count each unique frame scene only once.
        const acqKey = `${f.satellite_id}|${d}|${f.path_number_norm ?? ''}|${f.direction_norm || ''}|${getAcqFramePosKey(f)}`;
        if (!seen.has(acqKey)) {
          seen.add(acqKey);
          counts[f.satellite_id] = (counts[f.satellite_id] || 0) + 1;
        }
      }
    }
    buckets.push({
      label: bs, start: new Date(cursor), end: new Date(bEnd),
      counts, total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
    cursor = new Date(bEnd);
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

  if (_statsChartRO) { _statsChartRO.disconnect(); _statsChartRO = null; }

  requestAnimationFrame(() => {
    renderStatsChart();
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
  const cellDays = STATS_CELL_STEPS[statsState.cellIdx];

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
    return `<div class="stats-chip-ctr"><label class="stats-color-dot" style="background:${clr}" title="${t('stats-edit-color')}"><input type="color" value="${clr}" onchange="statsSetSatColor('${id}',this.value)"></label><button class="stats-chip${on ? ' on' : ''}" style="--sc:${clr}" onclick="statsToggleSat('${id}')">${id}</button></div>`;
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

  const trackChipHTML = STATS_S1_TRACKS.map(t =>
    `<button class="stats-chip${statsState.activeTracks.has(t) ? ' on' : ''}" onclick="statsToggleTrack(${t})">T${t}</button>`
  ).join('');

  const legendHTML = STATS_CHART_SATS
    .filter(id => statsState.activeSats.has(id))
    .map(id => `<span class="stats-legend-item"><span class="stats-legend-sw" style="background:${satColors[id]}"></span>${id}</span>`)
    .join('');

  // KPI values — computed fresh each render from current state
  const data    = state.baseStats || {};
  const frames  = state.filteredFrames || [];
  const fmtD    = v => `${v.getMonth()+1}/${v.getDate()}`;
  const qStart  = new Date(data.query_start || Date.now() - 7*864e5);
  const qEnd    = new Date(data.query_end   || Date.now());
  const next    = computeNextExpected();
  const kpiHTML = `
    <div class="stats-kpi-card">
      <div class="stats-kpi-lbl">${t('filtered-frames')}</div>
      <div class="stats-kpi-val">${frames.length}</div>
    </div>
    <div class="stats-kpi-card">
      <div class="stats-kpi-lbl">${t('active-satellites')}</div>
      <div class="stats-kpi-val orange">${new Set(frames.map(f => f.satellite_id)).size}</div>
    </div>
    <div class="stats-kpi-card">
      <div class="stats-kpi-lbl">${t('query-window')}</div>
      <div class="stats-kpi-val small">${fmtD(qStart)} – ${fmtD(qEnd)}</div>
    </div>
    <div class="stats-kpi-card stats-kpi-card--wide">
      <div class="stats-kpi-lbl">${next.label}</div>
      <div class="stats-kpi-val small">${next.value}</div>
    </div>`;

  return `
  <div class="stats-dash layout-${statsState.layout}">

    <div class="stats-kpi-row">
      ${kpiHTML}
    </div>

    <div class="stats-section stats-sec-chart">
      <div class="stats-section-hd">${t('stats-acq-frequency-chart')} <span class="sts-hd-hint">· ${t('stats-all-acquisitions')}</span></div>
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
            <span class="sts-val">${cellDays}${t('stats-day-suffix')}</span>
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
      </div>
      <div class="stats-chart-scroll">
        <div class="stats-chart-wrap" id="stats-chart-wrap">
          <span class="stats-muted-msg">${t('stats-computing')}</span>
        </div>
      </div>
      <div class="stats-legend">${legendHTML}</div>
    </div>

    <div class="stats-section stats-sec-table">
      <div class="stats-section-hd">${t('stats-track-statistics')}${activeFilterBadge}</div>
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

function renderStatsChart() {
  const wrap = document.getElementById('stats-chart-wrap');
  if (!wrap) return;
  const buckets = buildChartBuckets();
  if (!buckets.length || buckets.every(b => b.total === 0)) {
    wrap.innerHTML = `<span class="stats-muted-msg">${t('stats-no-window-data')}</span>`;
    return;
  }
  const activeSats = [...statsState.activeSats];
  const maxTotal   = Math.max(...buckets.map(b => b.total), 1);
  const cH = statsState.layout === 'chart' ? 200 : 120, labH = 22, barH = cH - labH;

  // Always fit all bars within the container — no horizontal scroll.
  // Drop inter-bar gaps when bars are dense so every bar stays ≥ 1 px wide.
  const containerW = Math.max(200, (wrap.parentElement?.clientWidth || 600) - 28);
  const n   = buckets.length;
  const GAP = (containerW / n) > 4 ? 2 : 0;
  const BAR_W = Math.max(1, Math.floor((containerW - GAP * (n - 1)) / n));
  const stride = BAR_W + GAP;
  const svgW   = n * stride - GAP;  // no trailing gap

  // Show a label every N bars so adjacent labels don't overlap.
  // Label width ~30px for "M/DD", ~36px for "Mon'YY".
  const cellDays    = STATS_CELL_STEPS[statsState.cellIdx];
  const labelW      = cellDays >= 28 ? 36 : 30;
  const labelEvery  = Math.max(1, Math.ceil(labelW / stride));

  let gridSVG = '';
  for (const frac of [0.25, 0.5, 0.75, 1.0]) {
    const y   = (barH - frac * barH).toFixed(1);
    const cnt = Math.round(frac * maxTotal);
    gridSVG += `<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" class="schart-grid"/>`;
    gridSVG += `<text x="2" y="${(Number(y) - 2).toFixed(1)}" class="schart-glabel">${cnt}</text>`;
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
      const h = Math.max(1, Math.round((cnt / maxTotal) * barH));
      stackY -= h;
      const clr = barSatColors[satId] || '#29b6f6';
      barsSVG += `<rect x="${x}" y="${stackY}" width="${BAR_W}" height="${h}" fill="${clr}" class="schart-bar" onclick="statsBarClick(event,${i},'${satId}')"><title>${b.label} · ${satId}: ${cnt}</title></rect>`;
    }
    if (i % labelEvery === 0) {
      const d   = b.start;
      const locale = state.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
      const lbl = cellDays >= 28
        ? `${d.toLocaleString(locale, { month: 'short' })}'${String(d.getFullYear()).slice(2)}`
        : `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
      labelsSVG += `<text x="${x + BAR_W / 2}" y="${cH - 4}" class="schart-label" text-anchor="middle">${lbl}</text>`;
    }
  }

  wrap.innerHTML = `<svg class="schart-svg" width="${svgW}" height="${cH}" viewBox="0 0 ${svgW} ${cH}">
    ${gridSVG}${barsSVG}${labelsSVG}
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
function statsToggleSat(id) {
  if (statsState.activeSats.has(id)) {
    if (statsState.activeSats.size > 1) statsState.activeSats.delete(id);
  } else {
    statsState.activeSats.add(id);
  }
  renderStatsPanel();
}
function statsToggleTrack(t) {
  if (statsState.activeTracks.has(t)) {
    if (statsState.activeTracks.size > 1) statsState.activeTracks.delete(t);
  } else {
    statsState.activeTracks.add(t);
  }
  renderStatsPanel();
}
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
      <span class="scp-period">${t('stats-last')} ${fmtMonDay(row.lastDate)}</span>
      <button class="scp-close" onclick="document.getElementById('schart-popup').hidden=true">x</button>
    </div>
    <div class="scp-total">${row.totalCount.toLocaleString()} ${t('stats-frame-unit')} / ${t('stats-sort-interval')} ${avgGap}</div>
    ${satHTML || `<div class="scp-empty">${t('stats-no-track-data')}</div>`}
  `;
  popup.hidden = false;
  positionStatsPopup(event, popup);
}

function statsBarClick(event, bucketIdx, satId) {
  const buckets = buildChartBuckets();
  const b = buckets[bucketIdx];
  if (!b) return;

  const frames = state.rawFrames || [];
  const bsDate = b.start.toISOString().slice(0, 10);
  const beDate = b.end.toISOString().slice(0, 10);
  const inBucket = frames.filter(f =>
    f.satellite_id === satId && f.date &&
    f.date.slice(0, 10) >= bsDate && f.date.slice(0, 10) < beDate &&
    (statsState.pass === 'ALL' || f.direction_norm === statsState.pass) &&
    (!STATS_S1_IDS.has(f.satellite_id) || statsState.activeTracks.has(f.path_number_norm))
  );

  // Deduplicate same as buildChartBuckets: unique frame scene per date/path/dir
  const seenAcq = new Set();
  const trackMap = new Map();
  let uniqueCount = 0;
  for (const f of inBucket) {
    const d = f.date.slice(0, 10);
    const acqKey = `${d}|${f.path_number_norm ?? ''}|${f.direction_norm || ''}|${getAcqFramePosKey(f)}`;
    if (seenAcq.has(acqKey)) continue;
    seenAcq.add(acqKey);
    uniqueCount++;
    const k = `${f.path_number_norm ?? ''}|${f.direction_norm || ''}`;
    if (!trackMap.has(k)) trackMap.set(k, { track: f.path_number_norm, dir: f.direction_norm, count: 0 });
    trackMap.get(k).count++;
  }
  const tracks = [...trackMap.values()].sort((a, c) => c.count - a.count);

  const clr = getSatColors()[satId] || '#29b6f6';
  const cellDays = STATS_CELL_STEPS[statsState.cellIdx];
  const endLabel = new Date(b.end.getTime() - 86400000).toISOString().slice(0, 10);
  const periodLabel = cellDays === 1 ? b.label : `${b.label} – ${endLabel}`;

  const trackHTML = tracks.map(trackInfo => {
    const dirSh  = formatStatsDirectionShort(trackInfo.dir || '?');
    const dirCls = trackInfo.dir === 'ASCENDING' ? 'asc' : 'desc';
    return `<div class="scp-track-row">
      <span class="sts-tdir ${dirCls}">${dirSh}</span>
      <span class="scp-tnum">T${trackInfo.track ?? '?'}</span>
      <span class="scp-tcnt">${trackInfo.count} ${t('stats-frame-unit')}</span>
    </div>`;
  }).join('');

  const popup = document.getElementById('schart-popup');
  if (!popup) return;
  popup.innerHTML = `
    <div class="scp-hdr" style="border-left:3px solid ${clr}">
      <span class="scp-sat" style="color:${clr}">${satId}</span>
      <span class="scp-period">${periodLabel}</span>
      <button class="scp-close" onclick="document.getElementById('schart-popup').hidden=true">✕</button>
    </div>
    <div class="scp-total">${uniqueCount} ${t(uniqueCount === 1 ? 'stats-frame-word' : 'stats-frames-word')}</div>
    ${trackHTML || `<div class="scp-empty">${t('stats-no-track-data')}</div>`}
  `;
  popup.hidden = false;
  positionStatsPopup(event, popup);
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
    focusMapOnFrames(state.filteredFrames, { withDrawer: false, maxZoom: 8, pad: 0.2 });
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

function statsExportChartSVG() {
  const svgEl = document.querySelector('#stats-chart-wrap svg');
  if (!svgEl) return;

  // Resolve CSS custom properties so the exported file is self-contained
  const cs  = getComputedStyle(document.documentElement);
  const val = name => cs.getPropertyValue(name).trim();

  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Replace fill="var(--xxx)" with the computed colour
  clone.querySelectorAll('[fill]').forEach(el => {
    const fill = el.getAttribute('fill');
    const m    = fill && fill.match(/var\(--([\w-]+)\)/);
    if (m) el.setAttribute('fill', val('--' + m[1]) || fill);
  });

  // Embed resolved styles for text and grid lines
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = [
    `text { font-family: 'IBM Plex Mono', monospace; font-size: 9px; }`,
    `.schart-label, .schart-glabel { fill: ${val('--muted')}; }`,
    `.schart-grid { stroke: ${val('--border')}; stroke-width: 1; stroke-dasharray: 3 3; }`,
  ].join(' ');
  clone.insertBefore(styleEl, clone.firstChild);

  const cellDays = STATS_CELL_STEPS[statsState.cellIdx];
  const rangeTag = statsState.chartPreset === 'custom'
    ? `${statsState.chartStart}_${statsState.chartEnd}` : statsState.chartPreset;
  triggerDownload(
    `sar_chart_${rangeTag}_${cellDays}d.svg`,
    new XMLSerializer().serializeToString(clone),
    'image/svg+xml'
  );
}

function statsExportChartCSV() {
  const buckets = buildChartBuckets();
  if (!buckets.length) return;
  const sats    = [...statsState.activeSats].sort();
  const headers = ['period_start', 'period_end', ...sats, 'total'];
  const rows    = buckets.map(b => [
    b.label,
    b.end.toISOString().slice(0, 10),
    ...sats.map(id => b.counts[id] || 0),
    b.total,
  ]);
  const cellDays = STATS_CELL_STEPS[statsState.cellIdx];
  const rangeTag2 = statsState.chartPreset === 'custom'
    ? `${statsState.chartStart}_${statsState.chartEnd}` : statsState.chartPreset;
  triggerDownload(
    `sar_chart_${rangeTag2}_${cellDays}d.csv`,
    '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n'),
    'text/csv;charset=utf-8'
  );
}

function statsExportTableCSV() {
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
      const popup = document.getElementById('schart-popup');
      if (popup) popup.hidden = true;
    }
  });

  document.addEventListener('click', e => {
    const popup = document.getElementById('schart-popup');
    if (popup && !popup.hidden && !popup.contains(e.target) && !e.target.closest('.schart-bar')) {
      popup.hidden = true;
    }
  });

  // Safety net: ensure loading overlay is gone even if loadData resolved early
  document.getElementById('loading')?.classList.add('gone');
});

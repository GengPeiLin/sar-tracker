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
}

// ── Color mapping ─────────────────────────────────────────────────────────
const FEATURED_SATELLITES = new Set(['S1A', 'S1C', 'S1D', 'NISAR']);
const OPEN_DATA_SATELLITES = new Set(['S1A', 'S1B', 'S1C', 'S1D', 'NISAR']);
const SENTINEL_SATELLITES = new Set(['S1A', 'S1B', 'S1C', 'S1D']);
const THEME_OPTIONS = new Set(['soft-slate', 'night-ops', 'paper-radar', 'field-survey']);
const FONT_SIZE_STEPS   = [2, 4, 6, 8];
const FONT_SIZE_OPTIONS = new Set(FONT_SIZE_STEPS.map(String));
const APP_VERSION = '20260414T000000';

const PLATFORM_COLORS = {
  'S1A':'#00e5ff','S1C':'#00b8d4','S1D':'#0097b2',
  'SENTINEL-1A':'#00e5ff','SENTINEL-1C':'#00b8d4','SENTINEL-1D':'#0097b2',
  'ALOS-2':'#ce93d8','ALOS-4':'#ab68c4','ALOS2':'#ce93d8','ALOS4':'#ab68c4',
  'RADARSAT-2':'#ffc107','RCM-1':'#ffb300','RCM-2':'#ffa000','RCM-3':'#ff8f00',
  'R2':'#ffc107','RCM':'#ffb300',
  '_default':'#ff7043',
};

const NISAR_TRACK_COLORS = {
  'ASCENDING|39': '#00e676',
  'ASCENDING|111': '#67f7b2',
  'DESCENDING|61': '#00c2d1',
  'DESCENDING|133': '#58d8e3',
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
  if (logo) logo.innerHTML = `SAR <em>·</em> Tracker <span class="hdr-version">${APP_VERSION}</span>`;

  const hdrStatus = document.querySelector('.hdr-status');
  if (hdrStatus) {
    hdrStatus.innerHTML = `<b id="hdr-time">database: --</b>&nbsp;·&nbsp;ASF DAAC &amp; Copernicus CDSE`;
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

async function loadData() {
  ensureAdvancedState();
  ldmsg('Loading cached frame inventory...');
  try {
    const response = await fetch('./data/sar_status.json', { cache: 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.taiwan_frames)) throw new Error('Invalid payload');

    document.getElementById('hdr-time').textContent = `database: ${data.version || '--'}`;
    state.baseStats = data;
    state.rawFrames = reconcileFrameMetadata(
      data.taiwan_frames.map(enhanceFrame).filter(frame => frame.is_open_data)
    );
    applyTabDateWindow();
    bindAdvancedControls();
    renderSatelliteSelect();
    renderFormatOptions();
    resetAdvancedFilters(false);
    applyAdvancedFilters();
    return;
  } catch (error) {
    console.warn('Cached JSON unavailable, fallback to live ASF query.', error);
  }

  ldmsg('Loading live ASF frames...');
  await liveFetchASF();
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
  document.getElementById('dl-info').textContent = `${state.filteredFrames.length} frames | ASF ${asf} | Copernicus ${cop}`;
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

  const frames = summarizeSelectedFrames();
  if (!frames.length) {
    wrap.innerHTML = `<div class="legend-empty">${t('no-visible-data')}</div>`;
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
    .slice(0, 5)
    .map(item => `
      <div class="legend-item">
        <div class="legend-main">
          <div class="legend-swatch" style="background:${item.color}"></div>
          <span>${item.label}</span>
        </div>
        <div class="legend-value">${item.count}</div>
      </div>
    `);
  wrap.innerHTML = items.join('');
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

function updateMapSelectionState() {
  const hasSelection = !!state.selectedFrameKey;
  for (const item of state.framePolygons) {
    const color = item.polygon.options.baseColor;
    if (item.key === state.selectedFrameKey) {
      item.polygon.setStyle({ color: '#ffffff', weight: 3.5, fillColor: color, fillOpacity: 0.4, opacity: 1, dashArray: '8 5' });
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

function updateNextExpected() {
  const el = document.getElementById('st-next');
  const labelEl = document.getElementById('st-next-label');
  if (!el) return;
  const latestFrames = [...(state.filteredFrames || [])].filter(frame => frame?.date);
  const groups = new Map();

  for (const frame of latestFrames) {
    const visual = getFrameVisualInfo(frame);
    const current = groups.get(visual.label);
    if (!current || String(frame.date || '') > String(current.date || '')) {
      groups.set(visual.label, frame);
    }
  }

  const preferredOrder = [
    'A69',
    'D105',
    'NISAR A39',
    'NISAR A111',
    'NISAR D61',
    'NISAR D133',
  ];

  const lines = [...groups.entries()]
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a[0]);
      const bIndex = preferredOrder.indexOf(b[0]);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([label, frame]) => {
      const date = new Date(frame.date);
      return `${label} ${date.getMonth() + 1}/${date.getDate()}`;
    });

  if (labelEl) {
    const key = lines.some(line => line.startsWith('NISAR')) ? 'latest-visible' : 'latest-a69-d105';
    labelEl.dataset.latestKey = key;
    labelEl.textContent = t(key);
  }
  el.textContent = lines.length ? lines.join(' | ') : t('need-history');
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

  setTimeout(() => {
    document.getElementById('loading').classList.add('gone');
  }, 700);
});

# SAR Tracker

## English

### Overview

SAR Tracker is a GitHub Pages site for monitoring SAR acquisitions over Taiwan. It combines:

- A static frontend in `index.html`
- A Python data-generation script in `fetch_sar_data.py`
- A GitHub Actions workflow in `.github/workflows/update.yml`
- Generated data products under `data/`

The site is intended to answer three practical questions:

1. Which SAR missions recently covered Taiwan
2. Which frames match the current filter set
3. How to export filtered download lists as CSV or Metalink

### Current Project Status

The project is functional, but it is also in a transitional state:

- The website is already deployable on GitHub Pages
- The data pipeline is able to write `sar_status.json`, `asf_taiwan.meta4`, and `copernicus_taiwan.meta4`
- The frontend has accumulated duplicated logic and multiple generations of UI code inside the same `index.html`
- The previous README had severe encoding and maintainability problems

This README reflects the current implementation as it exists now, not an idealized target architecture.

### Repository Structure

```text
sar-tracker/
├─ .github/
│  └─ workflows/
│     └─ update.yml
├─ data/
│  ├─ sar_status.json
│  ├─ asf_taiwan.meta4
│  ├─ copernicus_taiwan.meta4
│  └─ tw*.metalink
├─ fetch_sar_data.py
├─ index.html
└─ README.md
```

### How It Works

#### Frontend

`index.html` is a self-contained static application using Leaflet. It renders:

- Taiwan SAR frame footprints
- Satellite and mission filters
- CSV and Metalink export buttons
- Theme and font-size controls
- A focused satellite list that prioritizes Sentinel-1 and NISAR

#### Data Pipeline

`fetch_sar_data.py` currently does the following:

1. Reads local `data/tw*.metalink` files if present
2. Extracts granule names from those Metalink files
3. Queries ASF metadata for those granules
4. Normalizes and deduplicates frames
5. Writes:
   - `data/sar_status.json`
   - `data/asf_taiwan.meta4`
   - `data/copernicus_taiwan.meta4`

The script uses only Python standard-library modules in the current implementation.

#### Deployment

`.github/workflows/update.yml` has two jobs:

1. `update-data`
   - runs `fetch_sar_data.py`
   - commits updated files under `data/`
2. `deploy-pages`
   - uploads the repository as the Pages artifact
   - deploys the static site to GitHub Pages

### Requirements

#### For GitHub Actions

- GitHub Pages enabled with source set to `GitHub Actions`
- Write access for workflow commits

#### For Local Script Execution

- Python 3.11 recommended
- Network access to ASF and Copernicus services when metadata refresh is needed

### Local Usage

Run the data script:

```bash
python fetch_sar_data.py
```

Override the default search window:

```bash
DAYS_BACK=14 python fetch_sar_data.py
```

### GitHub Pages Update Flow

If you edit `index.html` or another static file on GitHub:

1. Commit the change to `main`
2. Wait for the Pages deployment workflow to run
3. Hard-refresh the site in the browser if the old version is cached

If you edit the site locally:

1. Commit and push to `main`
2. Confirm `.github/workflows/update.yml` finishes successfully
3. Verify the Pages URL after deployment

### Known Problems

The current codebase would benefit from cleanup in the following areas:

1. `index.html` contains duplicated functions and repeated logic blocks
2. UI text language is mixed between English and Chinese
3. Data-source assumptions are not obvious unless you read the Python script
4. Frontend state management is concentrated in one large file
5. Workflow and data-generation behavior are under-documented without reading source

### Recommended Cleanup Plan

#### Phase 1: Stabilize

1. Remove duplicated function definitions in `index.html`
2. Keep only one active implementation for data loading, rendering, and filtering
3. Standardize visible UI text in either bilingual mode or one chosen default language
4. Keep README aligned with actual code paths

#### Phase 2: Separate Concerns

1. Split frontend code into HTML, CSS, and JS files
2. Move satellite metadata into a dedicated JSON or JS module
3. Extract shared helpers for filtering, styling, and downloads
4. Define one canonical frame schema used by both script and frontend

#### Phase 3: Improve Data Pipeline

1. Clarify whether `tw*.metalink` files are required inputs or optional accelerators
2. Document the exact ASF and Copernicus query strategy
3. Add validation for generated JSON and Metalink outputs
4. Add a small sample dataset for offline frontend testing

#### Phase 4: Improve Maintainability

1. Add a local preview workflow for the static site
2. Add lightweight regression checks for the generated data format
3. Add release notes or deployment notes for content-only changes
4. Consider a small frontend framework only if the page continues to grow

### License

MIT

---

## 中文

### 專案簡介

SAR Tracker 是一個部署在 GitHub Pages 上的台灣 SAR 取像監看網站，由以下幾部分組成：

- `index.html`：靜態前端頁面
- `fetch_sar_data.py`：資料整理與輸出腳本
- `.github/workflows/update.yml`：GitHub Actions 更新與部署流程
- `data/`：輸出的 JSON 與 Metalink 檔案

這個網站主要解決三件事：

1. 近期有哪些 SAR 任務覆蓋台灣
2. 哪些 frame 符合目前篩選條件
3. 如何把篩選後的結果匯出成 CSV 或 Metalink

### 目前狀態

目前專案可以運作，但也處在持續整理中的狀態：

- GitHub Pages 已可正常部署
- 資料流程可產生 `sar_status.json`、`asf_taiwan.meta4`、`copernicus_taiwan.meta4`
- `index.html` 內部累積了多版本邏輯與重複函式
- 舊版 README 存在編碼與可維護性問題

本 README 以目前實際程式狀態為準，而不是以理想架構為前提。

### 專案結構

```text
sar-tracker/
├─ .github/
│  └─ workflows/
│     └─ update.yml
├─ data/
│  ├─ sar_status.json
│  ├─ asf_taiwan.meta4
│  ├─ copernicus_taiwan.meta4
│  └─ tw*.metalink
├─ fetch_sar_data.py
├─ index.html
└─ README.md
```

### 運作方式

#### 前端

`index.html` 是一個以 Leaflet 為核心的單頁靜態應用，負責顯示：

- 台灣 SAR frame footprint
- 衛星與任務篩選
- CSV 與 Metalink 匯出
- 主題與字級切換
- 以 Sentinel-1 和 NISAR 為優先的衛星清單

#### 資料流程

`fetch_sar_data.py` 目前的流程如下：

1. 讀取本地 `data/tw*.metalink`
2. 從 Metalink 擷取 granule 名稱
3. 向 ASF 查詢這些 granule 的 metadata
4. 做欄位正規化與去重
5. 輸出：
   - `data/sar_status.json`
   - `data/asf_taiwan.meta4`
   - `data/copernicus_taiwan.meta4`

目前腳本只依賴 Python 標準函式庫。

#### 部署流程

`.github/workflows/update.yml` 目前分成兩個 job：

1. `update-data`
   - 執行 `fetch_sar_data.py`
   - 將 `data/` 內更新後的檔案 commit 回 repo
2. `deploy-pages`
   - 上傳 repo 內容作為 Pages artifact
   - 部署到 GitHub Pages

### 執行需求

#### GitHub Actions

- GitHub Pages 來源設為 `GitHub Actions`
- Workflow 需具備可寫入 repo 的權限

#### 本地執行腳本

- 建議 Python 3.11
- 若需要更新 metadata，必須可連到 ASF 與 Copernicus 相關服務

### 本地使用方式

執行資料腳本：

```bash
python fetch_sar_data.py
```

指定不同的搜尋天數：

```bash
DAYS_BACK=14 python fetch_sar_data.py
```

### GitHub Pages 更新方式

如果你是在 GitHub Web 上修改 `index.html` 或其他靜態檔：

1. 直接 commit 到 `main`
2. 等待 Pages workflow 完成
3. 若瀏覽器仍看到舊版，請做強制重新整理

如果你是在本地修改：

1. commit 並 push 到 `main`
2. 確認 `.github/workflows/update.yml` 執行成功
3. 再檢查 Pages 網址是否已更新

### 目前已知問題

這個專案目前最需要整理的地方有：

1. `index.html` 內有重複函式與重疊邏輯
2. 前端顯示文字混用中英文
3. 不看 Python 腳本很難理解資料來源假設
4. 前端狀態管理過度集中在單一檔案
5. workflow 與資料生成策略的文件仍不足

### 建議改善規劃

#### 第一階段：先穩定

1. 刪除 `index.html` 內重複的函式定義
2. 保留單一版本的資料載入、渲染與篩選流程
3. 決定 UI 文字要採雙語還是固定語言
4. 確保 README 與實際程式流程一致

#### 第二階段：拆分責任

1. 將前端拆成 HTML、CSS、JS
2. 將衛星資料表抽到獨立 JSON 或 JS 模組
3. 抽出篩選、樣式、下載等共用 helper
4. 定義前後端共用的 frame 欄位格式

#### 第三階段：整理資料流程

1. 說清楚 `tw*.metalink` 是必要輸入還是選擇性加速來源
2. 文件化 ASF 與 Copernicus 的查詢策略
3. 為輸出的 JSON 與 Metalink 加上驗證
4. 提供一份小型樣本資料，方便離線測試前端

#### 第四階段：提升維護性

1. 增加本地預覽流程
2. 為資料格式加上輕量檢查
3. 為純內容更新建立部署說明
4. 若頁面繼續擴張，再評估是否導入小型前端框架

### 授權

MIT

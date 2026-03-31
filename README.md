# 🛰 SAR Monitor · 台灣 SAR 衛星動態監測儀表板

每週自動更新全球 SAR 衛星艦隊動態，互動式地圖顯示過去一週對台灣的取像範圍，
並提供 ASF 與 Copernicus 兩種格式的 `.meta4` 批次下載清單。

---

## 功能一覽

| 功能 | 說明 |
|------|------|
| 🛰 衛星艦隊總覽 | 25+ 顆現役/退役 SAR 衛星完整資訊（Sentinel-1A/C/D、ALOS-2/4、NISAR、TSX/TDX、COSMO-SkyMed、RCM 1/2/3、RADARSAT-2、SAOCOM、ICEYE、Capella、Umbra 等） |
| 🗺 互動取像地圖 | 過去 7 天台灣區域所有 SAR 取像 footprint（polygon），點擊查看場景詳情 |
| ⬇ ASF .meta4 | 靜態 Metalink 檔案，搭配 aria2c + Earthdata 帳號批次下載 |
| ⬇ Copernicus .meta4 | 靜態 Metalink 檔案，搭配 aria2c + Bearer Token 批次下載 |
| 📋 CSV 匯出 | 一鍵下載取像 metadata 清單（在瀏覽器端生成）|
| 🔄 自動更新 | GitHub Actions 每週一 10:00 台灣時間自動執行，無需人工介入 |
| 🎛 篩選器 | 依頻段（C/L/X/S）、衛星狀態、本週是否取像篩選 |

---

## 快速部署（5 分鐘）

### 1. 建立 Repository 並上傳檔案

```bash
git clone https://github.com/你的帳號/sar-tracker.git  # 或直接建新 repo
cd sar-tracker
# 把本專案所有檔案複製進去
git add .
git commit -m "init: SAR Monitor"
git push -u origin main
```

### 2. 啟用 GitHub Pages（透過 Actions 自動部署）

進入 repo → **Settings** → **Pages** → Source 選 **GitHub Actions**

### 3. 手動觸發第一次資料更新

進入 **Actions** → 「每週更新 SAR 取像資料」→ 點 **Run workflow**

約 2~3 分鐘後，`data/sar_status.json`、`data/asf_taiwan.meta4`、`data/copernicus_taiwan.meta4` 
將自動 commit 並重新部署到 Pages。

### 之後完全自動

每週一 UTC 02:00（台灣時間 10:00）自動執行，無需任何人工操作。

---

## 檔案結構

```
sar-tracker/
├── index.html                      ← 單頁儀表板（無後端、無框架）
├── fetch_sar_data.py               ← GitHub Actions 執行的 Python 腳本
├── data/
│   ├── sar_status.json             ← 每週自動更新的取像資料（JSON）
│   ├── asf_taiwan.meta4            ← ASF Metalink 4 下載清單
│   └── copernicus_taiwan.meta4     ← Copernicus Metalink 4 下載清單
├── .github/
│   └── workflows/
│       └── update.yml              ← 排程 + Pages 部署 workflow
└── README.md
```

---

## 使用 .meta4 批次下載影像

### ASF DAAC（Sentinel-1、ALOS-2、NISAR 等）

下載影像需要免費的 [NASA Earthdata 帳號](https://urs.earthdata.nasa.gov/)。

```bash
# 安裝 aria2c
sudo apt install aria2     # Ubuntu/Debian
brew install aria2         # macOS

# 方法 A：互動式輸入帳號密碼
aria2c --http-auth-challenge=true \
       --http-user=你的Earthdata帳號 \
       --http-passwd='你的密碼' \
       data/asf_taiwan.meta4

# 方法 B：透過 .netrc 檔案（推薦，可免重複輸入）
echo "machine urs.earthdata.nasa.gov login 帳號 password 密碼" >> ~/.netrc
chmod 600 ~/.netrc
aria2c --netrc-path=~/.netrc data/asf_taiwan.meta4
```

### Copernicus CDSE（Sentinel-1）

下載影像需要免費的 [Copernicus Data Space 帳號](https://dataspace.copernicus.eu/)。

```bash
# 步驟 1：取得 Bearer Token（有效期約 10 分鐘）
TOKEN=$(curl -s -X POST \
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=cdse-public&username=你的帳號&password=你的密碼&grant_type=password" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 步驟 2：批次下載
aria2c --header="Authorization: Bearer $TOKEN" \
       --max-connection-per-server=4 \
       data/copernicus_taiwan.meta4
```

> **提示**：Copernicus Token 10 分鐘過期，下載大量檔案時需要每隔 9 分鐘刷新。
> 可用 `--on-download-complete` 搭配自動刷新腳本。

---

## 資料來源說明

### ASF DAAC（Alaska Satellite Facility）
- 查詢端點：`https://api.daac.asf.alaska.edu/services/search/param`
- 支援平台：Sentinel-1A/C/D、ALOS-2、ALOS-4、RADARSAT-2、RCM 1/2/3、NISAR
- **查詢 metadata 免費無需帳號**；下載需 Earthdata

### Copernicus Data Space Ecosystem (CDSE)
- 查詢端點：`https://catalogue.dataspace.copernicus.eu/odata/v1/Products`
- 支援平台：Sentinel-1A/C/D（未來也包含 Sentinel-2/3/6）
- **查詢 metadata 免費無需帳號**；下載需 Copernicus 帳號

---

## 本機測試

```bash
# 僅需 Python 3.8+ 標準函式庫，無需安裝任何套件
python fetch_sar_data.py

# 查詢過去 14 天
DAYS_BACK=14 python fetch_sar_data.py
```

---

## 自訂設定

### 修改查詢範圍
編輯 `fetch_sar_data.py`：
```python
TAIWAN_WKT = "POLYGON((119 21,123 21,123 26.5,119 26.5,119 21))"
```

### 修改更新頻率
編輯 `.github/workflows/update.yml`：
```yaml
schedule:
  - cron: '0 2 * * 1'   # 每週一
  # - cron: '0 2 * * *'  # 每天
```

### 加入更多衛星平台
在 `fetch_sar_data.py` 的 `ASF_PLATFORMS` 加入代碼，
在 `index.html` 的 `SATS` 陣列加入衛星資訊。

---

## 技術架構

```
GitHub Actions (Python)          GitHub Pages (靜態 HTML)
┌─────────────────────┐          ┌──────────────────────┐
│ fetch_sar_data.py   │  commit  │ index.html           │
│  ├─ ASF API query   │ ──────→  │  ├─ Leaflet.js 地圖  │
│  ├─ Copernicus API  │          │  ├─ 衛星資料庫       │
│  ├─ 生成 JSON       │          │  └─ 下載按鈕         │
│  ├─ 生成 ASF meta4  │          │                      │
│  └─ 生成 COP meta4  │          │ data/*.json / *.meta4│
└─────────────────────┘          └──────────────────────┘
     每週一自動執行                    瀏覽器直接讀取
```

- **零後端**：所有運算在 GitHub Actions（資料）與瀏覽器（展示）完成
- **零成本**：GitHub Actions 免費額度遠超每週一次的需求
- **零 API 金鑰**：metadata 查詢均為公開 API
- **CORS fallback**：本地 JSON 失效時，瀏覽器直接向 ASF 即時查詢

---

## License

MIT © 2025

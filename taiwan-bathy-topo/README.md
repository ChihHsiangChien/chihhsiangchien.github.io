# 台灣與周邊海域 3D 立體地形視覺化工具 (Taiwan 3D Topography & Bathymetry)

> 結合 **NOAA ETOPO 2022**（海底地形）與 **AWS Terrain Tiles / SRTM**（陸地高程）合併之數值高程模型，呈現台灣本島、周邊島嶼與「海水抽乾」及「海平面上升」之地形變化、等高／等深線與動態水位模擬。

專案採**零建置步驟（Zero-Build）**純靜態網頁架構，無需安裝 Node.js、npm 或任何打包編譯工具，下載即可本機預覽，亦可直接推送至 GitHub Repository 並啟用 GitHub Pages 立即上線。

---

## 🌟 核心特色功能 (Key Features)

### 1. 數值高程與海底水深精確融合 (DEM Data Integration)
- **陸地高程**：採用 AWS Terrain Tiles（SRTM 30m / USGS 3DEP 高解析數值高程），完整呈現玉山主峰（3,952m）、雪山主峰（3,886m）、中央山脈、海岸山脈、雪山山脈、台北盆地、新竹平原與西部沿海。
- **海底地貌與沙質分色**：整合 NOAA ETOPO 2022 / GEBCO 海床地形，**海底全面改採沙地與沉積土岩色系**（淺海陸棚為溫暖金色沙地、大陸斜坡為赭褐泥沙、深海溝為玄武岩深暗沈積），使海底與半透明湛藍海水形成強烈對比；海浪採平整靜態水體設計，去除波光碎影晃動，清楚呈現水平面升降與乾涸出露。
- **海底水深結構**：完整涵蓋琉球海溝（Ryukyu Trench，深達 -6,800+ 公尺）、沖繩海槽（Okinawa Trough，水深 -1,000 ~ -2,000 公尺）、馬尼拉海溝（Manila Trench，水深 -3,000 公尺）以及平均水深僅 60 公尺的台灣海峽淺海陸棚。
- **離島全覆蓋**：包括澎湖群島、綠島、蘭嶼、金門、馬祖、龜山島、彭佳嶼等。

### 2. 水位抽乾與海平面上升動態模擬 (Dynamic Water Level Simulation)
- **非線性對齊滑桿與數字精確輸入**：
  - 支援從 **-7,000 公尺（完全抽乾）** 到 **+100 公尺（極端上升）** 的調控。
  - 採用**分段非線性對稱對齊滑桿**，將現代基準海平 **0m 定位於滑桿 75% 處（精準對齊 0m 刻度）**，解決傳統線性滑桿因海底極深（-7000m）導致 0m 被擠壓至最右端 98.6% 的問題，大幅提升海平面微幅上升（+1m ~ +5m）的手動調節細膩度。
  - 支援**直接輸入數字**精確控制水位（例如直接輸入 `5`、`66`、`-120` 或 `-7000`），並具備 `+` / `−` 步進微調按鈕。
- **經典地質與氣候歷史情境**：
  - **海水抽乾 (-7,000m)**：抽乾所有海水，使板塊隱沒帶海溝與深邃海槽裸露，展現震撼的地球真實起伏。
  - **深海退潮 (-2,000m)**：沖繩海槽完全出露成為峽谷，僅保留東南深淵。
  - **末次冰盛期 (-120m)**：距今約 2 萬年前第四紀冰期，全球海平面下降約 120 公尺。**台灣海峽完全乾涸變成陸地平原**，台灣與歐亞大陸緊密相連，澎湖水道化為峽谷，古生物與人類可徒步遷徙。
  - **大陸棚出露 (-50m)**：台灣海峽大部淺灘浮出水面，澎湖群島幾近與本島相連。
  - **現代基準海平面 (0m)**：當前海陸分界。
  - **世紀末暖化預估 (+1m)**：IPCC 氣候推估在本世紀末海平面上升 1 公尺，西南沿海低窪濕地沒入海中。
  - **極端融冰風暴潮 (+5m)**：海水倒灌淡水河口，**台北盆地重現歷史「台北湖」**，西部沿海平原多處淹沒。
  - **全球冰川完全融解 (+66m)**：南北極與格陵蘭冰原全融，海平面上升 66 公尺。台北盆地徹底成為深內海，嘉南平原、屏東平原大部消失，台灣縮減為中央高山島弧。
- **動態展示與自動演變動畫**：
  - 提供「全景循環」、「海水抽乾過程」、「末次冰期陸橋」、「氣候暖化上升」等多種動畫展示模式。
  - 具備播放／暫停切換與 0.5x、1.0x、2.0x、4.0x 多段速度調控。
  - 即時計算出露陸地面積百分比、台灣海峽通斷狀態與台北盆地淹沒情境。

### 3. 即時等高線與等深線 (GPU Procedural Contours & Isobaths)
- 透過自訂 WebGL 片段著色器（Fragment Shader）以螢幕空間微積分 `fwidth()` 進行即時等值線渲染。
- 支援等高線（陸地）與等深線（海底），無論遠近視角均保持向量級清晰、反鋸齒邊緣。
- 支援間距快速切換（100m、200m、500m、1,000m）並自動繪製加粗計曲線（Index Contour）。

### 4. 高度數倍放大機制 (Vertical Exaggeration)
- 地球表面起伏相對於水平地表極微小（台灣南北約 400 公里，玉山不到 4 公里，僅約千分之一）。
- 提供 **1x（真實比例）** 至 **30x（超高立體）** 連續滑桿，並預設 **10x** 最具科學教學與視覺震撼之推薦視角。

### 5. 任兩點拉線即時剖面圖面板 (Interactive 2D Cross-Section Elevation Profile)
- **3D 互動選點**：點擊「拉線剖面分析」後，可於 3D 地形任意點選「起點 A」與「終點 B」，畫面上即時繪製 3D 貼地發光軌跡與圖釘。
- **獨立 2D 畫布視角縮放與平移**：
  - 展開下方剖面面板後，其 2D 畫布維護**完全獨立於 3D 主畫面之縮放（Zoom）與平移（Pan）狀態**。
  - 支援滑鼠滾輪／觸控雙指縮放，滑鼠拖曳／單指滑動平移。
  - 內建「放大 (+)」、「縮小 (-)」、「重置視角（全覽）」快捷工具列。
- **剖面圖資訊**：
  - 橫軸為實際大圓距離（km），縱軸為真實高程（m）。
  - 彩色漸層地質充填、當前動態水位虛線與水下淹沒半透明藍色水體層。
  - 標示起點、終點、最高點與最深海床之精準高程。
- **3D 與 2D 聯動游標**：
  - 在 2D 剖面圖移動游標或手指拖動時，3D 地圖上的黃色光點探針會**即時同步沿 3D 軌跡移動**，並浮動顯示精確坐標、高程與水深資訊。

### 6. 觸控螢幕友善設計 (Touch-Screen Friendly)
- 完整適配手機、平板與桌上型觸控螢幕（iOS Safari / Android Chrome）。
- 符合人體工學之觸控標靶（>44px），手勢防誤觸機制。
- 3D 畫布支援單指旋轉視角、雙指平移與雙指捏合縮放（Pinch to Zoom）。
- 浮動式相機視角列（3D斜角、正俯視地圖、東西地質向、南北島弧向、一鍵重置視角、正北指北針與全螢幕模式）。

---

## 🚀 部署與上線指南 (Zero-Build Deployment)

### 快速本機預覽
本專案為零建置靜態網站，只需以任何靜態網頁伺服器開啟目錄：

```bash
# 使用 Python 內建伺服器（推薦）
python3 -m http.server 8000

# 或使用 Node.js http-server
npx http-server -p 8000
```
在瀏覽器中開啟 `http://localhost:8000` 即可使用。

### 部署至 GitHub Pages
1. 將本專案推送至 GitHub Repository：
   ```bash
   git init
   git add .
   git commit -m "feat: Taiwan 3D Topography & Bathymetry Visualizer"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git push -u origin main
   ```
2. 進入該 GitHub 專案的 **Settings** -> **Pages**。
3. 在 **Build and deployment** 下的 **Source** 選擇 `Deploy from a branch`。
4. **Branch** 選擇 `main` 分支並設定目錄為 `/ (root)`，點擊 **Save**。
5. 數十秒後，GitHub Pages 即自動完成發布，透過分配的網址即可供全世界訪問！

---

## 📂 檔案架構說明 (File Structure)

```text
3d_land_ocean/
├── index.html              # 應用程式首頁 (結構、CDN 引入、UI 元件)
├── css/
│   └── style.css           # 高對比現代深色面板樣式、觸控最佳化與毛玻璃效果
├── js/
│   ├── app.js              # 主控制器、Three.js 場景生命週期與 UI 事件綁定
│   ├── terrain.js          # DEM 二進制資料解析、3D 幾何網格與自訂著色器
│   ├── water.js            # 動態水面網格、微波反光著色器與環境統計計算
│   ├── profile.js          # 2D 剖面圖引擎 (獨立 Pan/Zoom、3D 拾取與聯動探針)
│   └── landmarks.js        # 3D 地標圖釘投影、相機平滑平飛 (Fly-to) 導覽
├── data/
│   ├── meta.json           # 經緯度邊界、極值高程、地標點與水感情境中繼資料
│   └── taiwan_dem.bin      # NOAA ETOPO 與 AWS SRTM 融合之 Int16 二進制高程庫 (~960KB)
├── scripts/
│   └── build_dem.py        # 可重現之高程原始圖資抓取、融合與抽樣腳本
└── README.md               # 專案說明文件
```

---

## 🔬 資料來源與致謝 (Data Citations)

1. **NOAA ETOPO 2022**  
   National Oceanic and Atmospheric Administration (NOAA) National Centers for Environmental Information (NCEI).  
   *ETOPO 2022 15 Arc-Second Global Relief Model.*  
   用於沖繩海槽、琉球海溝、馬尼拉海溝及台灣海峽之精準海底水深資料。

2. **AWS Terrain Tiles / SRTM (Shuttle Radar Topography Mission)**  
   NASA / USGS / Mapzen Open Data hosted on AWS.  
   用於台灣本島（玉山、雪山、中央山脈）及各離島群島之細部陸地數值高程。

3. **Three.js**  
   WebGL 3D 渲染庫（由 mrdoob 與開源社群維護）。

---

## 📄 開源授權 (License)

本專案採 [MIT License](LICENSE) 授權發布，歡迎各級學校、地理科研教學及地質氣候科普教育自由使用與改進。

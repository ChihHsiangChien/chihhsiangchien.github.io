# 新竹歷史時間軸地圖 (hsinchuHistory) - 維護說明

這是一個基於 Leaflet.js 的互動式地圖專案，用於視覺化呈現新竹地區的歷史事件。專案包含兩個主要階段：一個是拖放配對的「遊戲模式」，另一個是完成遊戲後解鎖的「時間軸播放模式」。

## 專案概要

使用者首先會進入遊戲模式，需要將右側的歷史事件卡片拖曳到地圖上對應的正確地點。當所有卡片都放置正確後，系統會進入時間軸模式，讓使用者可以依照時間順序播放、瀏覽這些歷史事件。

### 主要功能
- **遊戲化學習**：透過拖放卡牌到地圖的互動方式，增加趣味性與記憶點。
- **時間軸視覺化**：以滑桿和播放動畫的形式，呈現歷史事件的時序關係。
- **多圖層地圖**：支援街道圖、衛星圖、地形圖切換。
- **響應式樣式**：使用 Tailwind CSS 建立 UI 介面。
- **自動播放**：支援 `?mode=autoplay` 網址參數，用於演示。

## 技術棧

- **前端**:
  - **JavaScript (ES6+)**: 核心邏輯。
  - **Leaflet.js**: 地圖渲染引擎。
  - **Tailwind CSS**: UI 樣式框架。
- **資料處理**:
  - **Python 3**: 用於從 Google Sheet 轉換資料。
  - **Pandas**: Python 資料處理函式庫。

## 專案結構

```
hsinchuHistory/
├── index.html            # 主頁面 HTML 結構
├── style.css             # 主要 CSS 樣式 (卡片、地圖標記、時間軸等)
├── main.js               # 核心應用程式邏輯 (地圖初始化、遊戲流程、DOM 互動)
├── timeline.js           # 時間軸 UI 與播放控制邏輯
├── config.js             # 地區顏色與樣式設定檔
├── data.json             # 核心資料檔案 (地點與事件)
├── importData.py         # 從 Google Sheet 匯入並轉換資料的 Python 腳本
├── GEMINI.md             # 原始的系統規格文件
└── README.md             # (本文件)
```

## 資料管理流程

本專案的核心資料（地點與事件）是透過一個 Python 腳本從 Google Sheet 維護的，這使得非開發人員也能輕鬆更新內容。

### 步驟 1：在 Google Sheet 中編輯資料

所有事件與地點資料都集中在以下的 Google Sheet：

- **資料來源**: Google Sheet

**重要欄位說明**:
- `地點`: 事件發生的地點名稱，會用來生成 `locations` 資料。
- `經緯度`: 地點的座標，格式為 `緯度,經度` (e.g., `24.7352,121.0880`)。
- `事件`: 事件的標題。
- `年代`: 事件發生的年份 (e.g., `1898`)。
- `說明`: 事件的詳細描述。
- `區域`: 地點所屬的行政區或分類 (e.g., `竹東`, `新竹`)，會對應到 `config.js` 中的顏色設定。
- `連結1`, `連結2`, `連結3`: 相關的參考網址。
- **`要放`**: **此欄為關鍵篩選欄位**。只有當此欄位的值為全形 `Ｖ` 時，該筆資料才會被匯入 `data.json`。

### 步驟 2：執行 Python 腳本以更新 `data.json`

當你在 Google Sheet 中完成編輯後，需要執行 Python 腳本來將變更同步到專案中。

1.  **安裝依賴**:
    確保你的 Python 環境已安裝 `pandas`。
    ```bash
    pip install pandas
    ```

2.  **執行腳本**:
    在專案根目錄下執行：
    ```bash
    python importData.py
    ```

3.  **完成**:
    此腳本會自動從 Google Sheet 下載最新的 CSV 資料，處理後覆寫 `data.json` 檔案。之後重新整理網頁即可看到更新後的內容。

## 核心功能與設定

### 遊戲模式 (Game Mode)

- **拖放邏輯**: 實作於 `main.js`，使用 `pointerdown`, `pointermove`, `pointerup` 事件處理，以支援滑鼠與觸控。
- **吸附機制**: 拖曳時會顯示指向最近地點的輔助線。放開時，若在任一地點的 `radius` 範圍內，卡片會自動吸附到該地點。
- **答案檢查**: `checkAnswers()` 函式會比對卡片 (`event.location_id`) 與吸附點 (`location.location_id`) 是否一致。全部正確後，遊戲完成。

### 時間軸模式 (Timeline Mode)

- **啟用時機**: 遊戲完成後自動啟用。
- **控制邏輯**: 由 `timeline.js` 負責，包含播放/暫停、進度條拖拉、時間刻度切換等。
- **視覺效果**: 當前播放到的事件，其地圖標記 (Marker) 和地點標籤 (Tooltip) 會被高亮，其餘則會淡化。此效果由 `main.js` 中的 `highlightStep()` 函式與 `style.css` 中的 `...--highlight` / `...--dimmed` class 共同實現。

### 自動播放模式 (Autoplay Mode)

在網址後方加上 `?mode=autoplay` 參數，即可觸發自動演示。

- **範例**: `https://your-github-page/hsinchuHistory/?mode=autoplay`
- **行為**: 頁面載入後，會自動將所有卡片放置到正確位置，並開始播放時間軸動畫。

### 樣式設定

- **`config.js`**: 定義了各地區的代表色。`main.js` 會讀取此設定，並應用於事件卡片和地圖地點標籤的背景色與邊框色。若要新增或修改區域顏色，請編輯此檔案。
- **`style.css`**: 定義了更細節的樣式，例如：
  - `.placed-event-marker`: 放置在地圖上的事件標記樣式。
  - `.placed-event-marker--correct`: 答對時的樣式。
  - `.placed-event-marker--highlight`: 時間軸高亮時的樣式。
  - `.location-tooltip`: 地點標籤的樣式。

---

## 地圖功能 API 說明

以下為 `map.js` 主要函式及其用途簡介：

- `setupMap(mapContainerId = 'map', defaultLayer = 'satellite')`  
  初始化地圖，設定底圖圖層與圖層切換控制。

- `findClosestLocation(map, latLng, locations)`  
  尋找最近地點，僅依賴 map 物件與傳入參數。

- `findCircleByLocationId(map, locationId)`  
  根據地點 ID 找出地圖上的圖層（circle/polygon）。

- `repositionMarkersAtLocation(map, locationId, placedEvents, gameData, locationsData)`  
  重新排列同一地點的 marker 位置，依賴 map、locationsData、placedEvents。

- `moveGhost(ghostCard, dragOffset, e)`  
  移動拖曳時的 ghostCard（虛擬卡片）。

- `updateGuideLine({ map, guideLineRef, event, locationsData })`  
  更新拖曳時的指引線與 tooltip 樣式。

- `updateGuideAndLastEvent({ map, guideLine, event, locationsData, setGuideLine, setLastDragEvent })`  
  更新拖曳時的指引線與最後拖曳事件資訊。

- `renderLocationsOnMap(map, regionColorConfig)`  
  在地圖上渲染所有地點（circle/polygon），並設定 tooltip。

- `fitMapToLocations(map)`  
  讓地圖自動縮放至所有地點的範圍。

- `setupMarkerDragEvents(marker, map)`  
  註冊 marker 拖曳相關事件（dragstart, drag, dragend）。

- `handleZoom(map)`  
  地圖縮放時，重新排列所有已放置 marker 的位置。

---

> 詳細實作請參見 `historicalmap/map.js` 檔案。

## 維護注意事項

- **動畫系統**: 目前的動畫主要是透過增刪 CSS class 實現。`GEMINI.md` 規格文件曾規劃了更複雜的動畫（如閃爍、淡入淡出），對應的 `animations.js` 檔案還保留在專案中，但目前未被 `main.js` 主邏輯使用。未來若要擴充動畫功能，可參考該檔案的設計。
- **地點形狀**: `data.json` 中的地點除了支援 `center` 和 `radius` 定義的圓形區域外，也支援 `shape: "polygon"` 和 `points` 陣列定義的多邊形區域。`main.js` 已處理這兩種情況的繪製與互動。
- **程式碼解耦**:
  - `main.js` 負責主流程。
  - `timeline.js` 負責時間軸元件的內部邏輯，透過回呼函式 (callback) 與 `main.js` 溝通，耦合度較低。
  - `config.js` 將顏色設定分離，方便調整主題。

---
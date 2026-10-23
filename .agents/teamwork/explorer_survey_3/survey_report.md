# 全方位專案深度調研報告 (Explorer Survey 3)

**調研人員**：Explorer 3 (`teamwork_preview_explorer`)  
**調研日期**：2026-10-23  
**調研範圍**：`lens-optical/` (R4), `greatFossil/` (R5), `blood-stream/` (R6), `rt/` (R7) 及全專案控制台錯誤分析  
**專案根目錄**：`/home/pancala/Documents/chihhsiangchien.github.io`

---

## 執行摘要 (Executive Summary)

本報告針對生物教學平台中四個關鍵模組（`lens-optical/`、`greatFossil/`、`blood-stream/`、`rt/`）進行深入靜態代碼剖析、DOM/資產完整性驗證與執行時期行為檢測。
核心發現如下：
1. **`lens-optical/` (R4)**：光學引擎（基於 DIN 160mm 機械筒長與薄透鏡成像公式）架構嚴謹，光路實時重繪邏輯完整。但缺乏教學引導，國高中生難以直觀理解。需增設「倒立放大實像（物鏡）」、「目鏡二次放大（虛像）」與「光圈縮小景深加深/視野變暗」三大情境預設按鈕，並於介面下方展示教學導引卡片，引入光圈參數調控景深與亮度。
2. **`greatFossil/` (R5)**：存在嚴重資產與樣式斷鏈：
   - HTML 第 6 行 `<link rel="stylesheet" href="../css/style.css" />` 誤連至首頁全域樣式表，遺失卡片遊戲核心樣式；
   - 第 7 行存在孤立未配對的 `</style>` 閉合標籤；
   - 第 10 行 `<title>` 錯置於 `<body>` 內；
   - `js/globalVariables.js` 第 62-63 行引用無效音效路徑 `../sound/correct.mp3`（實際位於 `cardGame/sound/`，造成 404 報錯）；
   - `js/utils.js` 第 8 與 508 行 `drawAnswerBox()` 被註解，導致分類欄位全黑/全白不可見；
   - 容器與畫布在行動端寬度（<400px）無自適應佈局，卡片寬度超過格子寬度且按鈕缺乏間距。
3. **`blood-stream/` (R6)**：基於 Three.js r128 + Cannon.js 0.6.2 建構。目前血球固定為 200 顆（16×16 球體細分），在行動裝置或無獨立顯卡之電腦有卡頓風險。瓣膜物理判定採用單向阻擋邏輯，但視覺上缺少隨血流順向開闔的動態偏轉角。需增設效能分級（低 80 顆 / 中 200 顆 / 高 400 顆）切換，並修復 `style.css` 中無效的 `@apply` 語法。
4. **`rt/` (R7)**：實驗設計採用現代 ES 模組，計時精度達微秒級（`performance.now()` + Web Audio API）。試次狀態機完備，已有 CSV 匯出功能，但缺少學生探究學習單最關鍵的「複製結果文字 (Copy Result Text)」按鈕與彈窗回饋。

---

## 1. 顯微鏡光學工程模擬 (`lens-optical/`) 深度調研 (R4)

### 1.1 現有代碼架構與光學引擎分析
- **檔案位置**：`lens-optical/index.html`（單一獨立 HTML，約 414 行）
- **核心庫依賴**：Tailwind CSS (CDN `https://cdn.tailwindcss.com`)、Google Fonts (`Inter`, `JetBrains Mono`)
- **畫布設計**：
  1. 主光路畫布 `#opticsCanvas`：展示載物台標本、物鏡、鏡筒、中間實像平面（IIP）、目鏡、人眼及光線追跡。
  2. 視野尋像鏡 `#viewfinderCanvas`（右上角直徑 180px 圓形目鏡視野）：將畫面旋轉 180 度（`vfCtx.rotate(Math.PI)`，模擬倒立像），並根據離焦誤差計算模糊濾鏡（`vfCtx.filter = blur(...)`）。

### 1.2 光學參數與物理模型
- 系統內部機械標準（DIN 標準光學顯微鏡規格）：
  - 鏡筒長度（Mechanical Tube Length）：$L = 160\text{ mm}$
  - 物鏡焦距公式：$f_{\text{obj}} = 160 / m_{\text{Obj\_spec}}$
    - 4x 物鏡：$f_{\text{obj}} = 40.0\text{ mm}$
    - 10x 物鏡：$f_{\text{obj}} = 16.0\text{ mm}$
  - 目鏡焦距：$f_{\text{eye}} = 25\text{ mm}$，明視距離 $D_v = 250\text{ mm}$，目鏡放大倍率 $m_2 = D_v / f_{\text{eye}} = 10\times$
  - 理想物距計算：$u_{\text{ideal}} = \frac{1}{\frac{1}{f_{\text{obj}}} - \frac{1}{160}}$
    - 10x 時：$u_{\text{ideal}} \approx 17.78\text{ mm}$
    - 4x 時：$u_{\text{ideal}} \approx 53.33\text{ mm}$
  - 實際成像計算：
    - 實際物距：$u = \frac{\text{objMainX} - \text{specX}}{\text{scale}}$
    - 實際像距：$v = \frac{1}{\frac{1}{f_{\text{obj}}} - \frac{1}{u}}$
    - 物鏡放大率：$m_1 = |v / u|$
    - 總放大率：$M_{\text{total}} = m_1 \times m_2$
    - 中間實像位置：$\text{actual\_iipX} = \text{objMainX} + v \cdot \text{scale}$
    - 中間實像高度：$h_1 = -h_{\text{obj}} \cdot m_1$（負號代表倒立）
    - 最終虛像位置：$\text{finalImgX} = \text{eyeX} - D_v \cdot \text{scale}$

### 1.3 參數變更如何即時驅動光路重繪
當使用者切換物鏡（4x/10x）或滑動「載物台位置（對焦微調）」滑桿時：
1. 觸發 `render()` 函數。
2. 重算格線、物鏡主平面與實際像平面位置。
3. 繪製三主光線：
   - **紅色平行光**：自標本頂端平行射向物鏡主平面，經物鏡折射通過後方焦點，匯聚於中間實像頂端 $(actual\_iipX, cy - h_1)$。
   - **藍色中心光**：自標本頂端直線通過物鏡光心，直行匯聚於 $(actual\_iipX, cy - h_1)$。
   - **目鏡二次折射**：自中間實像頂端射向目鏡，折射出平行或發散光束。
   - **黃色虛像反向追跡虛線**：向左延伸至明視距離處，繪製倒立放大之最終虛像。
4. 繪製尋像鏡：以 $M_{\text{total}}$ 放大標本圓球，依據 $|actual\_iipX - iipTargetX|$ 施加模糊濾鏡。

### 1.4 教學情境預設按鈕與導引文字實施方案
為解決「專業參數難以直接理解」之痛點，規劃於左側側邊欄增設教學情境專區：

| 預設情境名稱 | 觸發參數狀態 | 界面展示效果 | 教學引導提示文字 (Hint) |
| :--- | :--- | :--- | :--- |
| **情境 1：倒立放大實像（物鏡）** | `mObj_spec = 10`, `stage_x_offset = 0` (自動對焦最佳點) | 突顯物鏡與鏡筒內紅色虛線處的「中間實像」，光束以高對比顯示。 | **【物鏡第一階段成像】**<br>標本位於物鏡的 1 到 2 倍焦距之間（$f < u < 2f$），經凸透鏡折射後，在鏡筒內的中間像平面（IIP）形成「倒立、放大的實像」。這是顯微鏡放大的第一階段！ |
| **情境 2：目鏡二次放大（虛像）** | 保持對焦，相機視角與游標導向目鏡區與黃色反向追溯光路。 | 突顯目鏡及向後延伸的黃色虛線，顯示人眼所見的巨大虛像。 | **【目鏡第二階段放大】**<br>目鏡如同「放大鏡」，中間實像恰好落在目鏡的一倍焦距內（$u < f_{\text{eye}}$）。光線經目鏡二次折射後向人眼發散，大腦逆向追溯光線，看到「倒立、放大的最終虛像」！ |
| **情境 3：光圈縮小景深加深 / 視野變暗** | 新增 `state.aperture = 0.35`（原本為 1.0），並微調載物台離焦（如 `+1.2mm`）。 | 尋像鏡亮度變暗（暗化遮罩），但原本模糊的標本邊緣變得清晰（景深加深）。 | **【光圈與景深物理】**<br>縮小光圈會阻擋周邊大角度雜散光線，進入光量減少使「視野變暗」；但光束孔徑角縮小使容許彌散圓變小，縱向清晰範圍顯著擴大（「景深變深」），立體標本更易看清各層構造！ |

- **代碼擴充點**：
  - `state` 中新增 `aperture: 1.0`（光圈比例 0.2 ~ 1.0）。
  - `renderViewfinder` 中計算模糊：`const blur = focusErr * 0.8 * state.aperture;`，並疊加暗度 `vfCtx.fillStyle = "rgba(0,0,0," + (1 - state.aperture)*0.6 + ")"`。
  - 在側邊欄加入情境按鈕群組及動態說明文字容器 `#presetExplanation`。

---

## 2. 化石大發現 (`greatFossil/`) 深度調研 (R5)

### 2.1 檔案結構與組件職責
- `greatFossil/index.html`：主頁面骨架（28 行）
- `greatFossil/js/data.js`：卡片題庫（21 種寒武紀化石，7 大門分類：刺絲胞、扁形、軟體、環節、節肢、棘皮、脊索）
- `greatFossil/js/globalVariables.js`：畫布設定、卡片座標、音效與分數計時器
- `greatFossil/js/settings.js`：初始化尺寸與 `gameType = "classify"`
- `greatFossil/js/utils.js`：洗牌、拖曳、碰撞檢測與計時（766 行）
- `greatFossil/images/`：21 張化石透明去背 PNG 圖片（`1.png` ~ `21.png`，確認全部存在）

### 2.2 現存缺陷詳細定位 (Defect Catalog)

#### 1. CSS 引入路徑錯誤與樣式完全失效
- **位置**：`greatFossil/index.html` 第 6 行：
  ```html
  <link rel="stylesheet" href="../css/style.css" />
  ```
- **問題分析**：`greatFossil` 位於專案一級目錄，`../css/style.css` 向上跳至根目錄的 `/css/style.css`。該全域樣式表僅包含 `h1`, `h2`, `link-container` 等首頁排版，根本沒有 `.large-button`, `#canvas`, `#score`, `#timer`, `.container` 之定義！
- **後果**：卡片遊戲按鈕變成原生醜陋樣式，計分板與計時器失去背景色，畫布失去置中與 `touch-action: none` 屬性。

#### 2. HTML 語法錯誤（重複未閉合標籤與位置錯亂）
- **位置**：`greatFossil/index.html` 第 6-10 行：
  ```html
  6:   <link rel="stylesheet" href="../css/style.css" />    
  7:   </style>
  8: </head>
  9: <body>
  10:   <title>化石大發現</title>
  ```
- **問題分析**：
  - 第 7 行存在孤立的 `</style>` 閉合標籤，前面沒有對應的 `<style>` 起始標籤。
  - 第 10 行 `<title>` 標籤被放置在 `<body>` 內部，違反 HTML5 語法規範。

#### 3. 音效資源 404 死連結
- **位置**：`greatFossil/js/globalVariables.js` 第 62-63 行：
  ```javascript
  var correctSound = new Audio("../sound/correct.mp3");
  var wrongSound = new Audio("../sound/wrong.mp3");
  ```
- **問題分析**：根目錄不存在 `/sound/` 目錄。音效檔案實際位於 `/cardGame/sound/correct.mp3` 與 `/cardGame/sound/wrong.mp3`。
- **後果**：玩家答對或答錯時，瀏覽器請求失敗產生 404 控制台未捕獲錯誤。

#### 4. 分類欄未繪製重大邏輯錯誤
- **位置**：`greatFossil/js/utils.js` 第 8 行與第 508 行：
  ```javascript
  8:   //drawAnswerBox();
  508: //drawAnswerBox();
  ```
- **問題分析**：原作者不知何故將 `drawAnswerBox()` 註解。
- **後果**：畫布頂端完全不顯示「刺絲胞」、「扁形」、「軟體」、「環節」等分類矩形框，學生進入遊戲只看到一堆散落化石，完全無法得知該拖曳至何處！

#### 5. 響應式佈局 (RWD) 缺陷與按鈕重疊破版
- **問題分析**：
  - `.container` 在原設計中為 `display: flex; align-items: center;`，未設置 `flex-wrap: wrap` 與 `gap`。
  - 在手機端（螢幕寬度 360px ~ 414px）：
    - 頂部包含「檢查」、「洗牌」、Score 板、Timer 板 4 個元素，總寬度超過螢幕寬度，造成元素被擠壓換行時邊界重疊；
    - `cardWidth = 130`、`cardHeight = 130`，而 4 欄的欄寬僅約 75~85px，化石卡片尺寸大幅超越答案框，造成卡片在欄位中互相嚴重遮擋；
    - 視窗旋轉時沒有 `resize` 事件監聽器，畫布維持初始絕對像素大小，造成橫向溢出捲動條。

### 2.3 修復方案
1. 修正 `index.html`：
   - 移除孤立 `</style>`；
   - 將 `<title>` 移至 `<head>`；
   - 建立獨立的 `greatFossil/style.css`（或規範性地引用專用樣式），補齊卡牌主題 CSS。
2. 修正音效路徑為 `../cardGame/sound/correct.mp3` 與 `../cardGame/sound/wrong.mp3`。
3. 在 `utils.js` 中解除 `drawAnswerBox()` 註解，並於 `redrawCanvas()` 內確保「先畫底層分類框，再畫上層卡片」。
4. 導入現代 RWD 彈性排版：
   - `.container` 加入 `flex-wrap: wrap; gap: 8px; justify-content: center;`；
   - 按鈕與計分板設定觸控適配的 `min-height: 44px; padding: 8px 16px; border-radius: 8px;`；
   - 新增動態響應式的卡片尺寸計算邏輯（例如在窄螢幕將 cardWidth 自動按比例縮小至 80px）。

---

## 3. 3D 動態瓣膜血流模擬 (`blood-stream/`) 深度調研 (R6)

### 3.1 3D 與物理引擎技術架構
- **檔案清單**：
  - `blood-stream/index.html`（引入 Three.js r128, Cannon.js 0.6.2, Tailwind CDN）
  - `blood-stream/main.js`（502 行，整合渲染與物理世界）
  - `blood-stream/style.css`
- **場景構造**：
  - 血管管身：由 3 節圓柱組成（前端透明管身、中段藍色壓縮區、後端透明管身），半徑 $R = 4$，總長度 200。
  - 粒子系統（血球）：
    - 數量：硬編碼 `const particleCount = 200;`
    - 網格：`THREE.SphereGeometry(0.5, 16, 16)` + `THREE.MeshLambertMaterial({ color: 0xe74c3c })`
    - 物理剛體：`CANNON.Body`（球體半徑 0.5，質量 1，線性阻尼 0.95）
  - 瓣膜構造：
    - 前瓣膜位於 $Z = -16$；後瓣膜位於 $Z = +16$。
    - 網格：紅色薄長方體 `THREE.BoxGeometry(6, 5.6, 0.2)`
    - 剛體：固定位置質量 0 的 Box 剛體。

### 3.2 物理計算與單向開闔保證
- 血液流向約定：
  - $Z$ 軸負方向（$-Z$）為「**順流**」；
  - $Z$ 軸正方向（$+Z$）為「**逆流**」。
- 管壁約束力：
  - 當粒子偏離中心半徑 $r = \sqrt{x^2 + y^2} > \text{tubeRadius}$ 時，施加向心的強回復力：$F = -1500 \cdot \hat{r}$，防止血球穿透血管壁。
- 瓣膜單向開闔物理阻擋機制（`updateValves()`）：
  - 雙瓣膜模式：當粒子處於兩瓣膜間（$-16 < z < 16$），若其速度方向為逆流（$v_z > 0$），系統強制將其 $v_z$ 歸零，並把位置鎖定在後瓣膜位置 $z = 16$（阻止血液逆流回心臟或遠端）。
  - 當血液因壓縮區擠壓向順流方向（$v_z < 0$）湧出時，前瓣膜不予阻擋，血流順暢通過。
  - **開闔動畫表現缺陷**：目前物理阻擋有效，但瓣膜網格在畫面中始終呈垂直死板狀態。
  - **優化設計**：當順流血液通過瓣膜時，使瓣膜葉片繞其基部旋轉 $25^\circ \sim 35^\circ$（呈張開狀）；當逆流來襲或流速歸零時，平滑復位至 $0^\circ$（緊閉合攏），極具生物擬真感。

### 3.3 粒子數量 / 畫質模式（效能優化切換）實施方案
目前 200 顆物理粒子在低階設備上每幀進行 10 次求解運算與 200 次 Three.js 座標同調，容易引發發熱與掉幀。
設計三段式粒子數量切換系統：

| 模式等級 | 粒子數量 (Particle Count) | 球體網格細分 (Geometry Segments) | 適用設備場景 |
| :--- | :--- | :--- | :--- |
| **低 (Low / 效能優先)** | 80 顆 | $8 \times 8$ | 平板、低階手機、整合顯卡文書機 |
| **中 (Medium / 平衡預設)** | 200 顆 | $16 \times 16$ | 一般筆電、桌面電腦 |
| **高 (High / 高畫質展示)** | 400 顆 | $24 \times 24$ | 高效能電腦、大螢幕投影展示 |

- **動態切換機制**：
  提供 `setParticleQuality(newCount, segments)` 函數：
  1. 遍歷舊粒子，從 Three.js 場景移除 Mesh，釋放 Geometry 與 Material 內存；
  2. 從 Cannon.js 世界移除 Body；
  3. 清空 `particles` 陣列；
  4. 依新參數重新生成粒子；
  5. 於 UI 新增品質切換按鈕群組或滑桿。

### 3.4 樣式缺陷修復 (`blood-stream/style.css`)
- `style.css` 中第 30, 34-37, 39, 42, 45 行大量使用 `@apply`（例如 `@apply bg-blue-500 hover:bg-blue-600;`）。
- 由於專案是直接引用 CDN 版 Tailwind，瀏覽器載入獨立 CSS 檔時無法解析 `@apply`，會直接忽略這些規則。
- **解法**：改用標準原生 CSS 屬性，或直接在 HTML 標籤 class 中套用 Tailwind 工具類。

---

## 4. 反應時間探究 (`rt/`) 深度調研 (R7)

### 4.1 核心架構與試次狀態機
- **模組結構**：
  - `rt/index.html`（現代簡潔儀表板 + 實驗舞台 + 結果面板）
  - `rt/app.js`（610 行，標準 ES 模組）
  - `rt/styles.css`
  - `rt/config/ControlA.json`（對照組：固定中心、固定 1000ms 前置時間）
  - `rt/config/ExpB.json`（實驗組：3×3 網格隨機位置、500~1500ms 均勻隨機前置時間、提示音）
- **高精度時間架構**：
  - 視覺目標出現：使用 `performance.now()`，並在 `requestAnimationFrame` 回調中切換 `t.hidden = false`，精確記錄 `actualOnset`；
  - 聲音提示：使用 Web Audio API `AudioContext`，排程 `ctx.currentTime` 精確發聲；
  - 試次狀態循環（`Runner` 類別）：
    1. **前置期 (`foreperiod`)**：此期間若使用者點擊舞台，判定為「提早反應 / 虛報 (False Alarm, FA)」；
    2. **目標呈現期 (`target`)**：目標顯示，啟動逾時定時器（預設 2000ms）。使用者點擊後計算 $RT = \text{clickTime} - \text{actualOnset}$；
    3. **試次結束與分析**：
       - 若 $RT < \text{anticipatoryMs}$ (預設 150ms)，標記為「過早反應」；
       - 若點擊座標在目標圓半徑內，`hit = true`；否則為 Miss 或 Other；
    4. **試次間隔 (`iti`)**：冷卻 600ms，進入下一試次。

### 4.2 數據記錄格式
每個試次生成豐富的 27 個欄位物件，包含：
`sessionId`, `participantId`, `deviceInfo`, `viewportW`, `viewportH`, `dateTime`, `conditionId`, `trialIndex`, `blockIndex`, `targetColor`, `targetSizePx`, `targetShape`, `positionX`, `positionY`, `gridCell`, `foreperiod`, `hasAudio`, `audioLeadMs`, `scheduledOnset`, `actualOnset`, `responseTime`, `rtMs`, `clickX`, `clickY`, `hit`, `anticipatory`, `timeout`, `errorType`。

### 4.3 數據匯出與文字複製功能實作設計 (R7)
現狀：已具備 CSV 下載功能（`exportCSV()`），但**完全缺少「複製結果文字」按鈕**。在教學實務上，多數學生使用 Chromebook 或 iPad 填寫 Google 學習單，直接複製摘要文字比下載 CSV 更具便利性。

#### 設計方案：
1. **HTML 擴充**：
   在 `rt/index.html` 第 91 行 `#btn-export-2` 旁新增「複製結果文字」按鈕：
   ```html
   <div class="buttons">
     <button id="btn-export-2" class="primary">匯出 CSV</button>
     <button id="btn-copy-summary" class="secondary" title="複製易讀報告至剪貼簿">複製結果文字</button>
   </div>
   ```
2. **文字格式化生成器 (`generateSummaryText()`)**：
   ```text
   ==============================
   📋 反應時間探究測驗報告
   ==============================
   受試者代號：S01
   測驗時間：2026-10-23 16:45:12
   設備：Mozilla/5.0 (X11; Linux x86_64) ...

   【條件：ControlA（對照組）】
   • 總試次：40 試
   • 命中數 (Hits)：39 (97.5%)
   • 平均反應時間 (Mean RT)：248.5 ms
   • 中位數反應時間 (Median RT)：242.0 ms
   • 標準差 (SD)：31.2 ms
   • 提早誤按 (FA)：1 次
   • 漏失未按 (Miss)：0 次

   【條件：ExpB（實驗組）】
   • 總試次：40 試
   • 命中數 (Hits)：37 (92.5%)
   • 平均反應時間 (Mean RT)：295.1 ms
   • 中位數反應時間 (Median RT)：288.0 ms
   • 標準差 (SD)：45.6 ms
   • 提早誤按 (FA)：2 次
   • 漏失未按 (Miss)：1 次
   ==============================
   ```
3. **剪貼簿寫入與降級相容**：
   - 優先使用 `navigator.clipboard.writeText(text)`；
   - 降級使用 `document.execCommand('copy')`；
   - 觸發畫面右上角短暫 Toast 提示：「✅ 測驗結果已成功複製到剪貼簿！」。

---

## 5. 全專案控制台錯誤檢視 (Console Errors Analysis)

本調查對目標專案進行語法檢查、靜態資源解析比對與執行時相依性檢驗，匯總如下：

| 專案目錄 | 潛在 / 確定之控制台錯誤 | 錯誤類型 | 觸發時機與影響 | 修復處置建議 |
| :--- | :--- | :--- | :--- | :--- |
| `greatFossil/` | `GET .../sound/correct.mp3 404 (Not Found)`<br>`GET .../sound/wrong.mp3 404 (Not Found)` | 網路 404 資源載入失敗 | 頁面載入並初始化 `new Audio()` 時立即報錯。 | 將路徑修正為 `../cardGame/sound/correct.mp3` 與 `../cardGame/sound/wrong.mp3`。 |
| `greatFossil/` | `Uncaught SyntaxError / Tag Parsing Error` | HTML 解析瑕疵 | 第 7 行孤立 `</style>` 導致 DOM 結構解析不正常。 | 刪除第 7 行 `</style>`，將第 10 行 `<title>` 移至 `<head>`。 |
| `greatFossil/` | 畫面全白、無法互動 | 邏輯渲染錯誤 | 第 8、508 行 `drawAnswerBox()` 被註解，分類框不可見。 | 解除註解，恢復分類框繪製。 |
| `blood-stream/` | `Invalid CSS property / Drop rule warning` | CSS 解析警告 | `style.css` 內使用 `@apply` 且未經過預編譯處理。 | 改寫為原生標準 CSS 樣式或在 HTML 套用 Tailwind class。 |
| `rt/` | `CORS policy: Cross origin requests are only supported for protocol schemes: http, https...` | 瀏覽器安全策略 | 若學生直接雙擊 `file://.../index.html` 開啟，`fetch('./config/...')` 會被阻擋。 | 在教學說明中註記或內建預設 fallback 配置物件，避免本機離線開啟中斷。 |
| `lens-optical/` | 無錯誤 | 正常 | 無未捕獲例外，Tailwind CDN 正常運行。 | 保持良好架構，增設教學導引與光圈控制即可。 |

---

## 6. 後續實施具體規劃與建議

1. **`lens-optical/`**：
   - 在左側面板新增「教學預設情境」按鈕組（3 個按鈕）。
   - 在主畫面下方新增教學導引說明卡片，動態更新物理原理。
   - 擴充光圈參數，連動尋像鏡明暗度與景深清晰範圍。
2. **`greatFossil/`**：
   - 建立獨立 `greatFossil/style.css`，修復按鈕、分數板、計時器外觀。
   - 修正音效路徑至 `../cardGame/sound/`。
   - 移除 HTML 孤立標籤，規範 `<title>` 位置。
   - 解除 `drawAnswerBox()` 註解，並增加手機端寬度自適應機制。
3. **`blood-stream/`**：
   - 在介面頂部增設「粒子品質：低 (80) / 中 (200) / 高 (400)」切換控制項。
   - 實作粒子清空與重建邏輯。
   - 微調瓣膜於血流通過時之傾斜旋轉角動畫，提升生物擬真感。
   - 清理 `style.css` 中的 `@apply` 語法。
4. **`rt/`**：
   - 在結果面板增設「複製結果文字」按鈕與 Toast 視覺反饋。
   - 實作結構化純文字報告產生器。
5. **首頁整合 (`index.html`)**：
   - 配合調研將 4 個專案正確掛載於指定學科章節（顯微鏡、演化、循環、神經與感覺）。

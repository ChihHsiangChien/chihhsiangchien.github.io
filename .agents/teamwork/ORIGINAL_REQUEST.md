# Original User Request

## Initial Request — 2026-10-23T08:35:52Z

精進本專案（`chihhsiangchien.github.io`）中 7 個高完整度的生物教學互動網頁專案，補齊行動端適配、增添互動回饋機制與修復排版瑕疵，並將所有專案正確掛載至首頁 `index.html` 的對應學科章節。

Working directory: /home/pancala/Documents/chihhsiangchien.github.io
Integrity mode: development

## Requirements

### R1. 首頁掛載與連結語法修復
1. 在 `index.html` 中將以下 7 個專案依照教學主題掛載至正確段落（標題需符合既有風格，如 `<a href="...">`）：
   - `fiddler-crab/index.html` → 掛載於「動物的行為」或「生態」
   - `pepperedMoth/index.html` → 掛載於「演化」
   - `lens-optical/index.html` → 掛載於「顯微鏡」
   - `greatFossil/index.html` → 掛載於「演化」
   - `blood-stream/index.html` → 掛載於「循環」
   - `rt/index.html` → 掛載於「神經與感覺」
   - `cardGame/消化_消化管_順序/index.html` → 掛載於「消化」
2. 修復 `index.html` 第 215 行前置空格問題（將 `href=" cardGame/...` 修正為 `href="cardGame/...`）。

### R2. 招潮蟹模擬遊戲 (`fiddler-crab/`) 行動化與遊玩回饋
1. 增加行動裝置適配：加入螢幕上的虛擬方向按鈕（上、下、左、右）或觸控滑動支援，讓平板與手機也能順暢操作。
2. 增加遊戲結束結算畫面（顯示生存時間、採集食物數量與重新開始按鈕）。

### R3. 胡椒蛾生存之戰 (`pepperedMoth/`) 捕食互動
1. 在既有的族群數量模擬基礎上，增加「天敵捕食者模式（互動小遊戲）」：玩家扮演天敵鳥類，在限時內點擊畫面中保護色不同（深色/淺色）的蛾，直觀體會天擇的淘汰過程。
2. 維持並連動既有的 Chart.js 族群數量折線圖更新。

### R4. 顯微鏡光學工程模擬 (`lens-optical/`) 教學導引
1. 保留原本細緻的光學參數調校功能，但在介面上增加快速「預設情境模式」按鈕（例如：「倒立放大實像（物鏡）」、「目鏡二次放大」、「光圈縮小景深加深/視野變暗」）。
2. 提供清晰的情境說明提示文字，使國高中學生能一鍵理解核心光學原理。

### R5. 化石大發現 (`greatFossil/`) 樣式與排版修復
1. 修復 HTML 中 CSS 引入路徑與重複未閉合標籤問題，確保在手機與桌面瀏覽器皆正常載入樣式。
2. 確保卡片佈局具備響應式（RWD），在不同螢幕寬度下皆不會發生破版或按鈕重疊。

### R6. 3D 動態瓣膜血流模擬 (`blood-stream/`) 效能優化
1. 增加「粒子數量 / 畫質模式」切換滑桿或切換開關（低 / 中 / 高），讓在低階行動裝置或無獨立顯卡之電腦上能順暢運行。
2. 保持瓣膜隨血流物理開闔之動畫正確性。

### R7. 反應時間探究 (`rt/`) 數據匯出
1. 在測試完成後增加「匯出數據 (CSV)」或「複製結果文字」按鈕，方便學生將測驗數據儲存於探究學習單。

### R8. 消化器官順序卡牌 (`cardGame/消化_消化管_順序/`) 運行確認
1. 驗證所有卡牌圖文資源、音效與 JavaScript 邏輯，確保從首頁點入後能無障礙遊玩與結算。

## Acceptance Criteria

### 1. 靜態檢驗與首頁完整性
- [ ] 執行 `python3 check_unlinked_projects.py` 時，上述 7 個目錄均不再列入未連結清單。
- [ ] 腳本報告中無任何格式瑕疵（如前置空格）且無 404 死連結。

### 2. 功能與互動驗證
- [ ] `fiddler-crab`：在觸控模擬模式下點擊虛擬鍵可移動螃蟹，且具備遊戲結算彈窗。
- [ ] `pepperedMoth`：天敵點擊捕食功能正常，點擊蛾隻能正確增加捕食計數並影響統計圖。
- [ ] `lens-optical`：點擊情境按鈕能自動帶入對應參數並更新光路繪製。
- [ ] `greatFossil`：頁面載入無 CSS/樣式失效錯誤，按鈕與卡片排版整齊無重疊。
- [ ] `blood-stream`：調整粒子數量滑桿時粒子總數即時改變，畫面維持 3D 旋轉與流動。
- [ ] `rt`：完成測試後點擊匯出按鈕能正確下載包含時間數據的 CSV 檔案。
- [ ] `cardGame/消化_消化管_順序/`：點擊卡牌能依照消化道順序正常判定得分與結束計時。

### 3. 控制台與跨瀏覽器相容
- [ ] 開啟 7 個專案的各個頁面，Console 不出現未捕獲的例外報錯（Uncaught Error）。


## Follow-up — 2026-10-23T09:35:29Z

精進與整併生物教學互動專案第二梯次：
1. 建立全新資料夾 `cell-3d/` 作為統一入口，完整整合 `insideTheCell/`、`3Dcell/` 與 `threeJsModel/` 中的所有 3D 胞器與細胞模型（含動物細胞全景、粒線體雙層膜剖面、葉綠體基質與葉綠餅剖面、雙凹紅血球與細胞膜模型），具備現代化選單切換與行動觸控旋轉。
2. 以 `foodChain/` 為主要目錄，將 `foodWeb/` 的食物網交互關係與多樣性平衡折線圖整合進來，提供「食物鏈生態互動」與「複雜食物網平衡」雙模式切換。
3. 精進 `energyPyramid/` 與 `OmNomNom/`：為 `energyPyramid` 補齊擺放規則回饋與「能量 10% 傳遞法則」動態數值計算；為 `OmNomNom` 新增規則說明彈窗（Modal）與操作指引。
4. 將以上項目正式掛載至首頁 `index.html` 的對應學科章節（細胞、生態）。

Working directory: /home/pancala/Documents/chihhsiangchien.github.io
Integrity mode: development

## Requirements

### R1. 建立全新「3D 細胞」統一專案 (`cell-3d/`)
1. 建立全新資料夾 `cell-3d/` 及其 `index.html`、`style.css`、`main.js`（或模組化結構）。
2. 整併並收納以下 3D 模型與視覺化內容：
   - 動物細胞全景與主要胞器（可參照 `threeJsModel/animalCell.html`、`animalCell_cutaway.html`）
   - 粒線體 3D 構造與內摺剖面（整合 `3Dcell/` 與 `insideTheCell/` 的成果）
   - 葉綠體 3D 構造與基粒/葉綠餅剖面（整合 `insideTheCell/`）
   - 紅血球雙凹圓盤 3D 模型（整合 `threeJsModel/rbc.html`）
   - 細胞膜雙層磷脂質與蛋白質流體鑲嵌模型（整合 `threeJsModel/membrane copy.html`）
3. 具備優雅的側邊或頂部導覽切換器、構造介紹浮動卡片、視角重設按鈕，支援滑鼠旋轉縮放及行動觸控手勢。
4. 在舊目錄中可保留相容性或加入導向連結至 `cell-3d/`。

### R2. 食物網與食物鏈整併 (`foodChain/`)
1. 以 `foodChain/` 為主入口，保留原有的狼、羊、草座標消耗與掠食動態模擬。
2. 整合 `foodWeb/` 的物種相生相剋關係網與多物種族群平衡折線圖（Chart / Canvas）。
3. 設計清晰的頂部切換按鈕，讓教師或學生能自由切換：
   - **單元一：簡易食物鏈消長模擬**（狼-羊-草動態消耗）
   - **單元二：多物種食物網生態平衡**（生物多樣性、複雜網狀捕食關係與族群平衡圖表）
4. 支援響應式佈局（RWD），在手機與平板上皆能順暢顯示畫布與操作按鈕。

### R3. 能量塔與 10% 傳遞法則動態計算 (`energyPyramid/`)
1. 補齊能量塔階層放置的即時判定（生產者、初級消費者、次級消費者、高級消費者）與正誤回饋音效/動畫。
2. 實作「能量 10% 傳遞法則」互動計算器：
   - 允許學生輸入或拉動滑桿調整基底能量（如 10,000 J）。
   - 自動即時計算推導出各營養階層的同化能量（如 10,000 → 1,000 → 100 → 10 J）與散失至環境的熱能（90%）。
   - 圖形化展示隨階層遞減的幾何塔身或色塊柱狀圖。

### R4. 食物鏈棋盤遊戲規則完善 (`OmNomNom/`)
1. 新增「遊戲規則說明」按鈕與彈窗視窗（Modal）：
   - 詳細說明棋盤每格代表的生態角色、骰子前進機制、捕食與被捕食規則、勝利條件。
2. 優化 Canvas 棋盤圖示、角色棋子標示與擲骰結果之文字/語音提示，使玩家能直覺上手。

### R5. 首頁 `index.html` 掛載更新
1. 在 `index.html` 的「細胞」區塊掛載 `<a href="cell-3d/index.html">3D細胞與胞器模型</a>`。
2. 在 `index.html` 的「生態」區塊掛載：
   - `<a href="foodChain/index.html">食物鏈與食物網動態模擬</a>`
   - `<a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>`
   - `<a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>`
3. 執行靜態比對確認 `index.html` 無死連結，且格式符合站點規範。

## Acceptance Criteria

### 1. 3D 細胞 (`cell-3d/`)
- [ ] 存取 `cell-3d/index.html` 能順暢載入 Three.js 場景，Console 無 WebGL 報錯。
- [ ] 透過選單能依序切換動物細胞、粒線體剖面、葉綠體剖面、紅血球與細胞膜，且各模型均能 360 度旋轉縮放。
- [ ] 具備胞器名稱與功能中文註釋說明。

### 2. 食物鏈與食物網整合 (`foodChain/`)
- [ ] `foodChain/index.html` 能在「簡易食物鏈」與「多物種食物網」雙模式間流暢切換。
- [ ] 食物網模式下物種平衡折線圖正常繪製運算，無缺失函式庫報錯。
- [ ] 在行動觸控模式下操作按鈕與畫面適應良好。

### 3. 能量塔 (`energyPyramid/`) 與 OmNomNom
- [ ] `energyPyramid` 支援調整生產者能量數值，並精準動態呈現 10% 能量傳遞數值與熱能散失視覺化。
- [ ] `OmNomNom` 點擊規則按鈕能正常彈出與關閉說明視窗，擲骰與行走邏輯清晰無阻滯。

### 4. 首頁與代碼健壯度
- [ ] `index.html` 成功包含上述所有入口連結，無 404 死連結。
- [ ] 執行 `python3 check_unlinked_projects.py` 時，已掛載的項目正確被識別為已連結。
- [ ] 現代瀏覽器測試時各頁面 Console 均無 Uncaught JavaScript Error。

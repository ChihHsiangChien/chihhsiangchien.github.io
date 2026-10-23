# 全面調研報告：首頁掛載、連結檢查機制與消化管順序卡牌 (R1 & R8 Survey Report)

調研人員：Explorer 1 (`teamwork_preview_explorer`)  
調研日期：2026-10-23  
相關需求：R1（首頁掛載與連結語法修復）、R8（消化器官順序卡牌運行確認）、Acceptance Criteria 1 & 3

---

## 1. 摘要與核心發現 (Executive Summary)

本調研深入分析了本專案（`chihhsiangchien.github.io`）的首頁導航架構、未連結檢測腳本 `check_unlinked_projects.py` 以及 R8 目標專案 `cardGame/消化_消化管_順序/` 的全套運行機制。

### 核心發現速覽：
1. **`index.html` 結構與樣式**：
   - 採用簡潔的扁平化章節標題 `<h1>` 與條目 `<a href="...">` 結構，搭配 `css/style.css`。
   - `a` 標籤全域設定為 `display: block; color: #007bff; text-decoration: none; margin-bottom: 10px;`，故所有項目皆以單行連結呈現。
   - 確實在 **第 215 行** 存在前置空白瑕疵：`<a href=" cardGame/分類_動物圖卡的分類_分類/index.html">分類動物圖卡</a>`，被檢查腳本精確抓出。全檔案未發現其他多餘空格。
   - 7 個目標專案在 `index.html` 中皆有精確的對應章節位置可供直接掛載。
2. **`check_unlinked_projects.py` 檢測機制**：
   - 使用 BeautifulSoup 解析 `index.html` 中所有 `<a>` 的 `href` 屬性。
   - 透過 `raw_href != raw_href.strip()` 檢查前置與後置空格瑕疵。
   - 透過 `linked_set`（包含路徑本身及其所有父目錄）對比專案一級目錄與全部 HTML 檔案。
   - 現況執行結果：有效內部連結 172 個、未連結一級目錄 30 個（包含 `blood-stream`, `fiddler-crab`, `greatFossil`, `lens-optical`, `pepperedMoth`, `rt`）、未連結 HTML 104 個、格式瑕疵 1 筆（第 215 行）、404 死連結 0 筆。
   - 經 Node/Python 模擬驗證：修復第 215 行前置空格並掛載 7 個專案後，格式瑕疵歸零（0）、死連結維持為零（0），且 7 個目錄均不再列入未連結清單。
3. **`cardGame/消化_消化管_順序/` (R8) 運行分析**：
   - 資源完整度：`sound/correct.mp3` 與 `sound/wrong.mp3` 音效皆存在且為標準 MP3 格式；卡牌為純文字渲染，無需額外圖片資源。
   - **發現重大邏輯缺陷 1（點擊空白崩潰）**：在 `cardGame/js/utils.js` 中的 `clickIfOrder()` 未防範點擊畫布空白處，當 `selected === null` 時觸發 `TypeError: Cannot read properties of undefined (reading 'category')` 控制台未捕獲報錯。
   - **發現重大邏輯缺陷 2（計時未結束與無法結算）**：`handleOrderingCards()` 完全未實作通關結算邏輯，即使點選完全部 8 張正確消化器官卡牌，計時器仍無限計時，且不會顯示勝利畫面。
   - **發現重大邏輯缺陷 3（起始順序未限制）**：首張卡片若點選非「口腔」的其他正確卡片（如小腸），亦會被判定正確並進入死胡同。
   - **HTML 語法瑕疵**：`cardGame/消化_消化管_順序/index.html` 第 7 行存在孤立未閉合的 `</style>` 標籤，且 `<title>` 標籤誤置於 `<body>` 內。

---

## 2. 首頁 `index.html` 架構與 7 個專案掛載策略 (Scope 1)

### 2.1 現有結構與樣式特性
`index.html` 總共 318 行，採用直觀的流式版面：
- 主容器：`<div class="container">`
- 主題標題：`<h1>...</h1>`，樣式為藍底白字方塊（`background-color: #007bff; color: #fff;`）
- 子標題：`<h2>...</h2>`（主要用於分類章節，如原核原生真菌、植物界、動物界）
- 連結形式：多數為頂層 `<a href="path/to/index.html">顯示文字</a>`，少數外包 `<p>` 或 `<span>`。
- CSS 樣式定義（`css/style.css`）：
  ```css
  a {
    display: block;
    color: #007bff;
    text-decoration: none;
    margin-bottom: 10px;
  }
  a:hover {
    text-decoration: underline;
  }
  ```
- 保持一致性準則：所有新增連結應直接寫入為 `<a href="相對路徑">顯示標題</a>`，無須額外包裹複雜外層 class。

### 2.2 第 215 行前置空白瑕疵檢驗
- **第 215 行現況**：
  ```html
  214:     <h2>動物界</h2>
  215:     <a href=" cardGame/分類_動物圖卡的分類_分類/index.html">分類動物圖卡</a>
  216:     <a href="cardGame/分類_脊椎動物_記憶配對/index.html">記憶無脊椎動物分類卡片(刺絲胞-棘皮)</a>
  ```
- **問題分析**：`href=" ` 後方多了一個半形空格。
- **修復方式**：修正為 `<a href="cardGame/分類_動物圖卡的分類_分類/index.html">分類動物圖卡</a>`。
- **其他行檢驗**：經全檔案正則檢索 `href=["']\s+` 與 `\s+["']>`，全檔案僅第 215 行有此瑕疵，修復此處即可使腳本的 `typo_links` 歸零。

### 2.3 7 個專案的掛載建議位置對照表

| 目標專案路徑 | 專案原標題 (`<title>`) | 建議掛載章節 | index.html 建議插入位置 | 建議連結標題與 HTML 代碼 |
|---|---|---|---|---|
| `fiddler-crab/index.html` | 招潮蟹模擬遊戲 | 生態系（或新增「動物的行為」子標題） | 約第 245 行（`<h1>生態系</h1>` 區塊結尾處，大魚吃小魚之後） | `<a href="fiddler-crab/index.html">招潮蟹模擬遊戲</a>` |
| `pepperedMoth/index.html` | 胡椒蛾的生存之戰 | 演化 | 第 199 行（`<h1>演化</h1>` 區塊，化石拼圖之後） | `<a href="pepperedMoth/index.html">胡椒蛾的生存之戰</a>` |
| `lens-optical/index.html` | 顯微鏡光學工程模擬器 | 顯微鏡 | 第 34 行（`<h1>顯微鏡</h1>` 區塊，光圈和載物臺模擬之後） | `<a href="lens-optical/index.html">顯微鏡光學工程模擬器</a>` |
| `greatFossil/index.html` | 化石大發現 | 演化 | 第 199 行（`<h1>演化</h1>` 區塊，緊接化石拼圖） | `<a href="greatFossil/index.html">化石大發現</a>` |
| `blood-stream/index.html` | 3D動態瓣膜血流模擬 | 循環 | 第 106 行（`<h1>循環</h1>` 區塊，靜脈瓣膜/淋巴之後） | `<a href="blood-stream/index.html">3D動態瓣膜血流模擬</a>` |
| `rt/index.html` | 反應時間探究 Reaction Time Explorer | 神經（現有標題 `<h1>神經</h1>`） | 第 125 行（既有 Scratch 版反應時間旁）或文末 | `<a href="rt/index.html">反應時間探究</a>` |
| `cardGame/消化_消化管_順序/index.html` | 按順序點卡片 | 動物獲得養分（消化章節） | 第 88 行（`<h1>動物獲得養分</h1>` 區塊，消化遊戲之後） | `<a href="cardGame/消化_消化管_順序/index.html">消化管順序</a>` |

> **說明**：
> 1. `index.html` 現有章節以國中生物課綱編排：第 79 行為 `<h1>動物獲得養分</h1>`（內含消化管排序、消化過程、VR消化、消化遊戲），故 `cardGame/消化_消化管_順序/index.html` 掛載於此處最符合全站架構，亦可在該處加註或保持連結名為 `消化管順序`。
> 2. 第 109 行現為 `<h1>神經</h1>`，涵蓋神經傳導與反應時間（第 124 行已有 Scratch 版反應時間），可考慮將 `<h1>神經</h1>` 擴充為 `<h1>神經與感覺</h1>` 或維持原標題並於內部加入 `<a href="rt/index.html">反應時間探究</a>`。
> 3. 第 221 行為 `<h1>生態系</h1>`，`fiddler-crab` 可直接掛於該段落，或在該段落中建立 `<h2>動物的行為</h2>`。

---

## 3. `check_unlinked_projects.py` 機制與執行基線分析 (Scope 2)

### 3.1 程式邏輯深度解構
`check_unlinked_projects.py` 的檢查流程如下：
1. **HTML 連結解析 (`parse_index_links`)**：
   - 利用 `BeautifulSoup` 提取所有 `<a>` 標籤。
   - **格式瑕疵檢查**：`if raw_href != raw_href.strip(): typo_links.append(...)`。此邏輯會檢出任何首尾有空白字元的 `href`。
   - **URL 清理**：過濾 `http://`、`https://`、`mailto:`，截斷 `?` query 與 `#` hash，去除尾端 `/`，並以 `urllib.parse.unquote()` 處理中文編碼路徑。
   - **404 死連結檢查**：以 `Path(clean_path).exists() or (Path(clean_path)/"index.html").exists()` 判定目標檔案是否存在，若不存在則記錄進 `broken_links`。
2. **目錄與檔案比對 (`inspect_repository`)**：
   - 建立 `linked_set`：將清理後的路徑及其所有上層目錄（`p.parents`）全部加入集合。
   - **一級目錄檢查**：讀取根目錄下一級目錄（排除以 `.` 開頭者），若目錄名不在 `linked_set` 中，即列入 `unlinked_top_dirs`。
   - **HTML 檔案覆蓋檢查**：使用 `rglob("*.html")` 掃描所有 HTML 檔案，只要該 HTML 檔案相對路徑或其所屬目錄未包含於 `linked_set`，即列入 `unlinked_html_files`。

### 3.2 當前執行輸出基準線 (Baseline Execution)
執行指令：`python3 check_unlinked_projects.py`
```
🔍 正在檢視專案目錄: /home/pancala/Documents/chihhsiangchien.github.io
📄 讀取首頁: /home/pancala/Documents/chihhsiangchien.github.io/index.html

============================================================
📊 統計總覽
============================================================
• index.html 有效內部連結數: 172
• 一級目錄總數: 158
  ├── 已連結之一級目錄: 128
  └── 未被連結之一級目錄: 30
• 全專案未被連結之 HTML 檔案數: 104

⚠️ 發現可能有格式瑕疵的連結（如前後包含多餘空格）：
   - href=' cardGame/分類_動物圖卡的分類_分類/index.html' (標題: 分類動物圖卡)

============================================================
📁 未被 index.html 連結之一級目錄清單 (30 個)
============================================================
• blood-stream              | 🟢 具 index.html | 共 3 檔案 [首頁標題: 3D動態瓣膜血流模擬]
• fiddler-crab              | 🟢 具 index.html | 共 3 檔案 [首頁標題: 招潮蟹模擬遊戲]
• greatFossil               | 🟢 具 index.html | 共 3 檔案 [首頁標題: 化石大發現]
• lens-optical              | 🟢 具 index.html | 共 1 檔案 [首頁標題: 顯微鏡光學工程模擬器]
• pepperedMoth              | 🟢 具 index.html | 共 1 檔案 [首頁標題: 胡椒蛾的生存之戰]
• rt                        | 🟢 具 index.html | 共 4 檔案 [首頁標題: 反應時間探究 Reaction Time Explorer]
...
```

### 3.3 驗收準則達成驗證（模擬結果）
經模擬掛載 7 個專案並移除第 215 行空白後：
- `typo_links` 數量：由 1 降為 **0**。
- `broken_links` 數量：維持 **0**。
- 未連結一級目錄清單：`blood-stream`, `fiddler-crab`, `greatFossil`, `lens-optical`, `pepperedMoth`, `rt` 六個一級目錄**全部成功自未連結清單移除**。
- `cardGame/消化_消化管_順序/index.html`：**成功自未連結 HTML 清單移除**。

---

## 4. `cardGame/消化_消化管_順序/` (R8) 深度運行診斷 (Scope 3)

### 4.1 檔案與目錄結構
- `cardGame/消化_消化管_順序/`
  - `index.html` (25 行)：主要進入點，引入共用 CSS 與 JS
  - `data.js` (20 行)：題庫資料
  - `settings.js` (11 行)：版面配置與遊戲類型設定
- 共用資源目錄：
  - `cardGame/css/style.css`：畫布與計分計時器樣式
  - `cardGame/js/globalVariables.js`：共用全域變數
  - `cardGame/js/utils.js` (894 行)：遊戲核心引擎
  - `cardGame/sound/correct.mp3` (5.4 KB, 正確音效, 有效 MPEG-1 Layer 3)
  - `cardGame/sound/wrong.mp3` (5.6 KB, 錯誤音效, 有效 MPEG-1 Layer 3)

### 4.2 遊戲流程與題庫定義
在 `data.js` 中定義了 16 張卡片：
- 正確消化道（共 8 張，有嚴格的順序性）：
  `0: 口腔 -> 1: 食道 -> 2: 賁門 -> 3: 胃 -> 4: 幽門 -> 5: 小腸 -> 6: 大腸 -> 7: 肛門`
- 干擾項（共 8 張，分類為「錯誤」）：
  `肝臟, 胰臟, 腎臟, 唾腺, 胃腺, 腸腺, 腸腺, 胃腺`
- `settings.js` 設定：
  ```javascript
  cardsArrangementType = "grid";
  cardsX = 5; cardsY = 5;
  cardFillColor = "#1e4f6e";
  hSpace = 5; vSpace = 5;
  gameType = "order";
  readCardData();
  ```
- 卡牌渲染：排成 4x4 的網格（`Math.sqrt(16) = 4`），隨機洗牌座標（`shufflePos`），以深藍色（`#1e4f6e`）方塊顯示器官名稱文字。

### 4.3 發現的缺陷與控制台報錯分析

#### 缺陷 1：點擊畫布空白處引發 Uncaught TypeError（嚴重等級：高）
- **發生位置**：`cardGame/js/utils.js:329` 中的 `clickIfOrder(event)`
  ```javascript
  function clickIfOrder(event) {
    event.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var { mouseX, mouseY } = getMouseCoordinates(event, rect);
    var selected = checkClickedCard(mouseX, mouseY); // 當點到卡片間隙或邊緣時，selected 為 null
    addToSelectedCards(selected, selectedCards);      // 內部判斷 selected 不為 null，因此未加入
    preCardIdx = nowCardIdx;
    nowCardIdx = getCardIdx(selected) % cards.length; // selected 為 null，getCardIdx 回傳 undefined -> NaN
    handleOrderingCards();                            // 內部直接存取 selectedCards 最後一個元素的 .category
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCards(cards);
  }
  ```
- **崩潰原因**：若玩家一開始點擊到卡片外圍空白，`selectedCards` 為空陣列，`handleOrderingCards` 執行：
  `if (selectedCards[selectedCards.length - 1].category != correctCategory)`
  此時 `selectedCards[-1]` 為 `undefined`，立即拋出：
  `TypeError: Cannot read properties of undefined (reading 'category')`
- **對比**：在同一檔案中的配對遊戲 `clickIfMatch`（第 309 行）已寫有保護：
  ```javascript
  if (selected) { ... } else { return; }
  ```
  但 `clickIfOrder` 漏寫了此防護！

#### 缺陷 2：無遊戲結算判定，計時器永久運作無法停止（嚴重等級：高）
- **觀察**：在 `utils.js` 的 `handleOrderingCards()` 中：
  ```javascript
  if (preCardIdx == null || nowCardIdx == (preCardIdx + 1) % cards.length) {
    correctSound.play();
    score += correctScore;
    scoreElement.innerText = "score: " + score;
  }
  ```
  完全沒有任何檢查 `selectedCards.length === correctCount` 的代碼，亦從未呼叫 `stopTimer()` 或 `youWin()`！
- **後果**：當玩家依序點完第 8 張卡片（肛門）後，分數停留在 800 分，計時器依然持續在每秒遞增，畫面上無任何「YOU WIN」或結算回饋；若玩家此時點擊任何剩餘卡片，皆會被判為答錯扣分。這直接違反驗收標準 `點擊卡牌能依照消化道順序正常判定得分與結束計時`。

#### 缺陷 3：起始卡牌未限制為「口腔」（嚴重等級：中）
- **原因**：初始狀態 `preCardIdx` 為 `undefined`，在 JavaScript 中 `undefined == null` 為 `true`。
- **後果**：玩家首張卡片若點選「小腸」或「大腸」，條件 `preCardIdx == null` 依然判定為成立，導致可以從任意位置開始，但由於消化管並非循環系統（不同於心血管封閉循環），起點錯誤會導致後續無法順利接續。針對消化管順序，應強制首張卡牌必須為索引 0 的「口腔」。

#### 缺陷 4：重複點擊已選取卡牌造成狀態混亂（嚴重等級：低）
- **原因**：若玩家重複點擊已在 `selectedCards` 中的卡片，`clickIfOrder` 仍會觸發 `handleOrderingCards()`，造成索引位移與重複加扣分。

#### 缺陷 5：HTML 標籤結構瑕疵（嚴重等級：低）
- 在 `cardGame/消化_消化管_順序/index.html` 中：
  - 第 7 行：有多餘的未閉合 `</style>` 標籤。
  - 第 10 行：`<title>` 被置於 `<body>` 內，應移至 `<head>` 中。

---

## 5. 具體修復方案建議（供後續實作階段參考）

### 5.1 `cardGame/js/utils.js` 之修復建議

#### 1. 修復 `clickIfOrder` 空點報錯與重複點擊：
```javascript
// 在順序遊戲點卡片
function clickIfOrder(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var selected = checkClickedCard(mouseX, mouseY); // 找出點到的卡片

  // 防護：若未點擊到任何卡片，或該卡片已在已選取清單中，直接返回
  if (!selected || selectedCards.includes(selected)) {
    return;
  }

  addToSelectedCards(selected, selectedCards); // 把點到的卡片放進 selectedCards
  preCardIdx = nowCardIdx;
  nowCardIdx = getCardIdx(selected) % cards.length;
  handleOrderingCards();
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 檢查順序
  drawCards(cards);
}
```

#### 2. 修復 `handleOrderingCards` 結算與起始判定：
```javascript
// 檢查新加入的selectedCards是否按照順序
function handleOrderingCards() {
  if (selectedCards.length === 0) return;
  var currentCard = selectedCards[selectedCards.length - 1];

  // 1. 若點選到干擾項（錯誤分類）
  if (currentCard.category != correctCategory) {
    wrongSound.play();
    score -= wrongScore;
    scoreElement.innerText = "score: " + score;
    setTimeout(function () {
      selectedCards.pop();
      nowCardIdx = preCardIdx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCards(cards);
    }, 200);
    return;
  }

  // 統計所有正確卡牌數量
  var correctCount = cards.filter(function(c) { return c.category === correctCategory; }).length;

  // 2. 判斷順序：
  // 若是第一張卡片：若有干擾項則強制必須從第一張（口腔，index 0）開始
  var isCorrectOrder = false;
  if (preCardIdx == null) {
    isCorrectOrder = (cards.length > correctCount) ? (nowCardIdx === 0) : true;
  } else {
    isCorrectOrder = (nowCardIdx === (preCardIdx + 1) % cards.length);
  }

  if (isCorrectOrder) {
    correctSound.play();
    score += correctScore;
    scoreElement.innerText = "score: " + score;

    // 通關結算：當選滿所有正確卡牌時，停止計時並顯示勝利畫面
    if (selectedCards.length === correctCount) {
      stopTimer();
      youWin();
    }
  } else {
    wrongSound.play();
    score -= wrongScore;
    scoreElement.innerText = "score: " + score;
    setTimeout(function () {
      selectedCards.pop();
      nowCardIdx = preCardIdx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCards(cards);
    }, 200);
  }
}
```

### 5.2 `cardGame/消化_消化管_順序/index.html` 結構清理
將開頭第 1~12 行清理為規範的 HTML5 結構：
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta charset="UTF-8">
  <title>消化器官順序卡牌</title>
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body>
  <div class="container">
    <div id="score">Score: 0</div>		
    <div id="timer">Timer</div>
  </div>
...
```

---

## 6. 調研結論 (Conclusions)
1. 首頁 `index.html` 掛載路徑已全面梳理完成，包含第 215 行空白瑕疵在內的修復點已全數定位。
2. `check_unlinked_projects.py` 的檢查機制嚴密且透明，7 個專案掛載完成並修復空白後，可順利達成 Acceptance Criteria 1（0 格式瑕疵、0 死連結、7 個目錄全數解鎖）。
3. `cardGame/消化_消化管_順序/` 的音效與卡牌資料完整，但存在控制台報錯與結算計時無法停止的 Bug，修復方案已通過 Node 模擬驗證，為後續 Milestone 的實作者提供了清晰無疑的修復路徑。

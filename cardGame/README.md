# 卡牌遊戲框架 - README (zh-TW)

這是一個基於 HTML5 Canvas 和 JavaScript 的卡牌遊戲框架，可用於創建不同類型的卡牌互動遊戲，例如分類配對、記憶翻牌或順序點擊遊戲。此說明文件將解釋程式碼結構以及如何使用和自訂遊戲。

## 支援的遊戲類型

此框架目前支援以下幾種遊戲模式（透過 `settings.js` 或 `globalVariables.js` 中的 `gameType` 變數設定）：

1.  **`classify` (分類拖曳)**：玩家需要將代表不同項目的卡牌拖曳到對應的分類區域（答案框）中。
2.  **`match` (配對點擊)**：玩家需要點擊兩張內容相同或屬於同一分類的卡牌進行配對消除。
3.  **`order` (順序點擊)**：玩家需要按照預定的順序點擊卡牌。

*(範例：在 `cardGame` 資料夾中的實作是一個 **生物分類配對遊戲**，可能使用 `match` 或 `classify` 模式，讓玩家將生物名稱卡牌與其正確的生物界分類（原核、原生、真菌）進行配對或分類。)*

## 遊戲玩法 (以 `match` 模式為例)

1.  **開啟遊戲**：使用網頁瀏覽器開啟 `index.html` 檔案。
2.  **遊戲介面**：
    *   畫面上方可能會顯示計時器 (`timer`) 和分數 (`score`)。
    *   下方是使用 Canvas 繪製的遊戲區域。
    *   卡牌會依照設定排列（網格或單行）。在 `match` 模式下，卡牌初始可能覆蓋（取決於 `cardsFacing` 設定）。
3.  **翻開卡牌**：點擊任意一張覆蓋的卡牌，卡牌會翻開顯示其內容（文字或圖片）。
4.  **進行配對**：接著，點擊另一張卡牌。
5.  **判斷結果**：
    *   **配對成功**：如果兩張卡牌屬於同一分類 (`category`)，它們會被標示（例如短暫變色）然後從畫面移除或標示為已完成。分數增加，並播放成功音效。
    *   **配對失敗**：如果兩張卡牌不屬於同一分類，它們會短暫顯示提示（例如顯示正確分類文字），然後恢復原狀（可能再次覆蓋）。分數減少，並播放失敗音效。
6.  **遊戲目標**：重複步驟 3 至 5，直到所有卡牌都成功配對完成。遊戲結束時會顯示 "YOU WIN" 訊息並停止計時。

*(**`classify` 模式玩法**：點擊並按住卡牌，將其拖曳到畫面上方的目標分類框內，放開滑鼠。可點擊按鈕檢查所有卡牌位置是否正確。錯誤的卡牌會被移回起始區域。)*
*(**`order` 模式玩法**：依照特定順序點擊卡牌。點擊錯誤順序的卡牌會導致扣分並重置點擊。)*

## 檔案結構與說明

這個遊戲主要由以下幾個檔案組成：

1.  **`index.html`**:
    *   遊戲的主要網頁結構檔案。
    *   包含 `<canvas>` 元素用於繪製遊戲。
    *   包含顯示分數 (`id="score"`) 和計時器 (`id="timer"`) 的元素。
    *   負責載入 CSS 樣式表和所有 JavaScript 檔案。

2.  **`style.css` (或類似名稱)**:
    *   (檔案未提供，但通常存在)
    *   包含所有 CSS 規則，用於定義非 Canvas 元素的遊戲外觀，如頁面背景、標題、分數/計時器樣式等。

3.  **`js/globalVariables.js`**:
    *   **核心設定檔**。定義遊戲運作所需的各種全域變數。
    *   **Canvas 設定**：獲取 Canvas 元素、設定寬高、取得 2D 繪圖環境 (`ctx`)。
    *   **答案框 (Answer Box) 設定** (`classify` 模式用)：定義分類目標區域的數量、大小、顏色、邊框、文字樣式。讀取 `categoryNames` (來自 `data.js`) 來決定行列數。
    *   **卡牌 (Card) 設定**：定義卡牌的預設寬高 (`cardWidth`, `cardHeight`)、排列方式 (`cardsArrangementType`: "grid" 或 "row")、初始位置 (`cardsX`, `cardsY`)、行列數 (`numRows`, `numCols`)、顏色（正常、點擊後、背面）、邊框、字體顏色/大小比例 (`fontRatio`, `fontHeightRatio`, `maxLength`)、間距 (`hSpace`, `vSpace`)。
    *   **遊戲狀態變數**：`cards` (儲存所有卡牌物件的陣列)、`selectedCards` (儲存當前選中卡牌的陣列，用於 `match` 和 `order` 模式)、`selectedcard` (儲存當前拖曳卡牌，用於 `classify` 模式)、`offsetX/Y` (拖曳偏移量)。
    *   **計時與計分**：計時器 (`timerInterval`, `timerSeconds`)、分數 (`scoreElement`, `score`, `correctScore`, `wrongScore`)。
    *   **音效**：載入成功 (`correctSound`) 和失敗 (`wrongSound`) 的音效檔。
    *   **遊戲模式特定變數**：`preCardIdx`, `nowCardIdx`, `correctCategory` (用於 `order` 模式)。
    *   **卡牌面向**：`cardsFacing` (布林值，控制卡牌初始是否面朝上)。
    *   **遊戲類型**：`gameType` (字串，如 "classify", "match", "order"，決定遊戲邏輯)。
    *   **點擊處理旗標**：`isProcessingClick` (防止 `match` 模式中快速連點導致的錯誤)。

4.  **`js/utils.js`**:
    *   **核心邏輯檔**。包含遊戲的主要功能函數。
    *   `start()`: 遊戲初始化函數，根據 `gameType` 執行不同的設定（洗牌、設定位置、繪製、綁定事件監聽器）。
    *   `readCardData()`: 從 `data.js` 中的 `cardData` 讀取資料，創建卡牌物件（包含名稱、分類、圖片等），並將其存入 `cards` 陣列。處理圖片載入。
    *   **繪圖函數**：
        *   `drawAnswerBox()`: 繪製 `classify` 模式的目標分類框。
        *   `drawCards()`: 繪製所有卡牌，處理卡牌是否被選中 (`selectedCards`)、是否面朝上 (`cardsFacing`)、文字/圖片顯示、顏色變化等。
        *   `redrawCanvas()`: 清除並重新繪製整個 Canvas，特別用於 `classify` 模式拖曳時，會根據 `zIndex` 排序卡牌以處理重疊。
    *   **事件處理**：
        *   `enableDragging()`, `enableTouchEvents()`: 綁定滑鼠和觸控的拖曳事件。
        *   `startDrag()`, `drag()`, `endDrag()`: 處理 `classify` 模式的卡牌拖放邏輯。
        *   `clickIfMatch()`: 處理 `match` 模式的點擊事件，管理 `selectedCards`，呼叫 `handleMatchingCards`。
        *   `clickIfOrder()`: 處理 `order` 模式的點擊事件，管理 `selectedCards`，呼叫 `handleOrderingCards`。
    *   **遊戲邏輯判斷**：
        *   `checkCardsPlacement()`: (`classify` 模式) 檢查卡牌是否被放置在正確的答案框內，更新分數，移動錯誤卡牌。
        *   `handleMatchingCards()`: (`match` 模式) 判斷兩張選中的卡牌是否匹配，處理成功（移除卡牌、加分）或失敗（恢復卡牌、扣分）的邏輯，包含音效和視覺回饋，使用 `setTimeout` 避免畫面更新過快。
        *   `handleOrderingCards()`: (`order` 模式) 判斷點擊的卡牌是否符合順序，更新分數和狀態。
    *   **輔助函數**：`getArrayIdx`, `getCardIdx`, `getMouseCoordinates`, `checkClickedCard`, `shufflePos`, `setCardsPos`, `startTimer`, `stopTimer`, `updateTimerDisplay`, `getRandomInt`, `shuffle`, `animateSlide`, `slideWrongcards`, `easeOutQuad`, `youWin` 等。

5.  **`data.js`**:
    *   儲存遊戲內容資料。在各遊戲資料夾中
    *   `categoryNames`: 一個二維陣列，定義目標分類名稱（例如 `[["原核", "原生", "真菌"]]`）。用於 `classify` 的答案框和 `match` 的配對邏輯。
    *   `cardData`: 一個包含多個物件的陣列。每個物件代表一張卡牌，至少包含：
        *   `name`: 卡牌上顯示的文字。
        *   `category`: 該卡牌所屬的分類（需對應 `categoryNames` 中的一個）。
        *   `img` (可選): 卡牌圖片的路徑。

6.  **`settings.js`**:    
    *   儲存遊戲的特定配置，在各遊戲資料夾中
    *   **主要功能是設定 `gameType`**。
    *   包含對 `globalVariables.js` 中某些變數的覆蓋設定（例如 `cardsX`, `cardsY`, `cardFillColor` 等）。
    *   **非常重要**：此檔案通常會在最後呼叫 `readCardData()` (定義在 `utils.js`)，以確保在所有設定完成後才開始讀取卡牌資料並啟動遊戲。

## 如何修改或自訂遊戲

*   **修改遊戲內容 (卡牌文字、圖片、分類)**:
    *   編輯 `js/data.js` 檔案。
    *   修改 `categoryNames` 來改變分類。
    *   修改 `cardData` 陣列來新增/刪除/修改卡牌。確保 `category` 值與 `categoryNames` 中的某個名稱對應。可加入或修改 `img` 屬性來使用圖片。

*   **調整遊戲設定 (類型、佈局、外觀)**:
    *   編輯 `js/settings.js` 來改變 `gameType`。
    *   編輯 `js/globalVariables.js` 來調整：
        *   卡牌和答案框的大小、顏色、間距 (`cardWidth`, `answerBoxFillColor`, `hSpace` 等)。
        *   卡牌排列方式 (`cardsArrangementType`, `numCols`, `numRows`)。
        *   字體大小和位置 (`fontRatio`, `fontHeightRatio`)。
        *   計分規則 (`correctScore`, `wrongScore`)。
        *   卡牌初始是否覆蓋 (`cardsFacing`)。

*   **修改遊戲邏輯或增加新功能**:
    *   需要編輯 `js/utils.js` 檔案。這需要具備 JavaScript 和 Canvas API 的知識。可以修改配對/分類/排序規則、增加新的互動、改變動畫效果等。

*   **修改非 Canvas 介面**:
    *   編輯 `index.html` 來調整頁面結構。
    *   編輯 `style.css` 來修改整體頁面、標題、分數/計時器等的樣式。

## 技術棧

*   HTML5
*   CSS3
*   JavaScript (ES5/ES6)
*   HTML5 Canvas API

---

希望這份 README 對您理解和使用這個卡牌遊戲框架有所幫助！

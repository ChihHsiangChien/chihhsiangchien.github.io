# Comprehensive Survey Report — Explorer Survey 3 (Round 2)

**Agent**: Survey Explorer 3  
**Working Directory**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_3/`  
**Investigation Focus**:
1. `OmNomNom/` Board Game & Rules Modal (R4)
2. `index.html` Mounting & Curriculum Structure (R5)
3. Verification Tools (`check_unlinked_projects.py`) & E2E Testing Harness (`tests/`)

---

## Executive Summary

1. **`OmNomNom/` Current State**:
   - The directory contains an abandoned prototype: `index.html` (22 lines), `style.css` (24 lines), `script.js` (106 lines), and `data/cards.json` (7 lines, invalid JSON due to trailing comment).
   - In `script.js`, the 3x3 board renders 9 Taiwan wetland organisms, but **the dice button listener is completely empty** (`diceBtn.addEventListener('click', () => { // });`), there are no pawns, no movement progression, no predation logic, no audio cues, and **no rules modal dialog**.
   - The 3x3 grid actually represents three distinct 3-tier food chains spanning Taiwan freshwater/wetland ecology:
     - **Col 0 (陸生昆蟲鏈)**: 蝶蛾 (初級) → 胡蜂 (次級) → 蜘蛛 (高級)
     - **Col 1 (濕地飛蟲鏈)**: 蚊蠅 (初級) → 赤蛙 (次級) → 秧雞 (高級)
     - **Col 2 (池塘水生鏈)**: 蝌蚪 (初級) → 水蠆 (次級) → 斑龜 (高級)
   - A complete architectural blueprint is provided below for a responsive, interactive board game featuring dice rolling, pawn path traversal, trophic predation events, Web Audio sound synthesis, and a rich, accessible educational rules modal.

2. **`index.html` Mounting (R5)**:
   - Root `index.html` (324 lines) structures curriculum topics with `<h1>` headers and styled block `<a>` links (`css/style.css`).
   - Placement targets for R5:
     - **Section `<h1>細胞</h1>`** (lines 36–41): Mount `<a href="cell-3d/index.html">3D細胞與胞器模型</a>`.
     - **Section `<h1>生態系</h1>`** (lines 226–250): Mount `<a href="foodChain/index.html">食物鏈與食物網動態模擬</a>`, `<a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>`, and `<a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>`.
   - **Critical Gap Discovered from Round 1**: `greatFossil/index.html` was specified in Round 1 R1 to be mounted under `<h1>演化</h1>`, but was never mounted in `index.html`! This causes 7 test failures in `tests/test_e2e_suite.py` and keeps `greatFossil` in `check_unlinked_projects.py` unlinked list.

3. **Verification Tools & Test Harness**:
   - `check_unlinked_projects.py` performs static parsing via BeautifulSoup:
     - Checks internal links, trims whitespace, verifies target existence (detects 404s).
     - Compares linked paths against all top-level directories and HTML files.
     - Once `cell-3d/index.html` exists and is mounted along with `foodChain`, `energyPyramid`, and `OmNomNom`, all four will cleanly disappear from `unlinked_top_dirs`.
   - The test infrastructure in `tests/` features:
     - `test_e2e_suite.py` (91 tests, unittest + ephemeral HTTP server + Node.js subprocesses).
     - `test_adversarial_challenger2.py` and `test_adversarial_stress.py` (automated CDP over WebSockets driving headless `/usr/bin/chromium` at 320px/375px/1920px viewports with zero console error / exception assertions).
   - A full Round 2 E2E test plan (Tiers 1–4) is detailed in Section III.

---

## Part I: In-Depth Investigation of `OmNomNom/` (Requirement R4)

### 1. Existing Codebase Analysis

#### `OmNomNom/index.html`
```html
<!DOCTYPE html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>食物鏈遊戲</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <div id="game-board">
        <canvas id="canvas"></canvas>
    </div>
    <div id="buttonContainer">
        <button id="diceBtn">骰子</button>

    </div>

    <script src="script.js"></script>
</body>

</html>
```
- **Deficiencies**:
  - Missing rules button (`#rulesBtn`).
  - Missing modal structure (`#rulesModal`).
  - Missing action log / status banner (`#gameLog`, `#statusBanner`).
  - Missing scoreboard (player energy, round count, prey captured).
  - Missing restart button (`#resetBtn`).
  - Missing HTML5 `<html lang="zh-TW">` tag.

#### `OmNomNom/style.css`
- Lines 1–24:
  - Fixed `height: 100vh;` on body causes clipping on mobile devices with browser address bars.
  - No responsive canvas rules (`canvas` overflows viewports narrower than 700px).
  - No modal backdrop or popup dialog styling.
  - No visual styling for dice faces, scoreboard badges, or buttons.

#### `OmNomNom/data/cards.json`
- Lines 1–7:
  ```json
  [
      { "type": "mouse", "value": 1 },
      { "type": "cat", "value": 2 },
      { "type": "dog", "value": 3 },
      { "type": "cheese", "value": 1 }
      // Add more cards as needed
  ]
  ```
  - Trailing comment `// Add more cards as needed` causes `JSON.parse()` to throw a `SyntaxError`.
  - Not referenced by `script.js` anyway. Can either be corrected to valid JSON or kept as legacy data.

#### `OmNomNom/script.js`
- Lines 1–5:
  ```javascript
  const grid = [
    ["蜘蛛", "胡蜂", "蝶蛾"],
    ["秧雞", "赤蛙", "蚊蠅"],
    ["斑龜", "水蠆", "蝌蚪"],
  ];
  ```
- Lines 7–22: Hardcoded canvas dimensions:
  - `canvas.width = 700; canvas.height = 600;`
  - `handsWidth = 100;` (intended for player hand/stats on the left).
  - Column spacing: `cellWidth = (700 - 100 - 60) / 3 = 180px`.
  - Row spacing: `cellHeight = (600 - 12) / 3 = 196px`.
- Lines 93–98:
  ```javascript
  const diceBtn = document.getElementById('diceBtn');
  diceBtn.addEventListener('click', () => {
      // 
  });
  ```
  - **The button event handler is completely empty.**
  - There are zero player pawns, zero dice state updates, zero movement logic, zero win conditions.

---

### 2. Ecological Food Web Architecture & Board Path Mapping

The 9 species in `grid` represent a stratified Taiwan wetland/freshwater food web:

```
[頂級掠食者 / Tertiary]   (0,0) 蜘蛛 ─── (1,0) 秧雞 ─── (2,0) 斑龜
                               │              │              │
[次級消費者 / Secondary]  (0,1) 胡蜂 ─── (1,1) 赤蛙 ─── (2,1) 水蠆
                               │              │              │
[初級消費者 / Primary]    (0,2) 蝶蛾 ─── (1,2) 蚊蠅 ─── (2,2) 蝌蚪
                          [陸生昆蟲鏈]   [濕地飛蟲鏈]   [池塘水生鏈]
```

#### Biological Roles & Cross-Predation Matrix:
| Species | Coordinates (col, row) | Trophic Level | Ecological Niche | Prey / Food Source | Predator (天敵) |
|---|---|---|---|---|---|
| **蝶蛾** (Butterfly/Moth) | (0, 2) | 初級消費者 (Herbivore) | 植物花蜜/葉片 | 植物葉片、花蜜 | 胡蜂、蜘蛛、赤蛙 |
| **蚊蠅** (Fly/Mosquito) | (1, 2) | 初級消費者 (Detritivore) | 濕地腐殖/水草 | 有機碎屑、植物汁液 | 赤蛙、水蠆、蜘蛛 |
| **蝌蚪** (Tadpole) | (2, 2) | 初級消費者 (Aquatic) | 水中藻類/碎屑 | 綠藻、有機碎屑 | 水蠆、赤蛙、斑龜 |
| **胡蜂** (Wasp) | (0, 1) | 次級消費者 (Predator) | 空中狩獵蜂 | 蝶蛾、幼蟲 | 蜘蛛、鳥類 |
| **赤蛙** (Frog) | (1, 1) | 次級消費者 (Amphibian) | 兩棲捕食者 | 蚊蠅、蝶蛾、小蟲 | 秧雞、斑龜 |
| **水蠆** (Dragonfly nymph) | (2, 1) | 次級消費者 (Aquatic) | 水中伏擊掠食者 | 蝌蚪、蚊幼蟲(孑孓) | 斑龜、赤蛙、秧雞 |
| **蜘蛛** (Spider) | (0, 0) | 高級消費者 (Apex) | 網狀陷阱掠食者 | 胡蜂、蝶蛾、蚊蠅 | 秧雞、鳥類 |
| **秧雞** (Waterhen/Rail) | (1, 0) | 高級消費者 (Wetland Apex) | 涉禽/雜食掠食者 | 赤蛙、水蠆、昆蟲 | 猛禽、大型爬蟲 |
| **斑龜** (Turtle) | (2, 0) | 高級消費者 (Aquatic Apex) | 水棲爬蟲掠食者 | 水蠆、蝌蚪、赤蛙 | 頂級掠食者 |

#### Board Traversal Path (Ascending Trophic Circuit):
We define a 9-tile loop ordered by trophic progression:
1. `Step 0`: (col 0, row 2) **蝶蛾** (陸生初級)
2. `Step 1`: (col 1, row 2) **蚊蠅** (濕地初級)
3. `Step 2`: (col 2, row 2) **蝌蚪** (水生初級)
4. `Step 3`: (col 2, row 1) **水蠆** (水生次級)
5. `Step 4`: (col 1, row 1) **赤蛙** (濕地次級)
6. `Step 5`: (col 0, row 1) **胡蜂** (陸生次級)
7. `Step 6`: (col 0, row 0) **蜘蛛** (陸生高級)
8. `Step 7`: (col 1, row 0) **秧雞** (濕地高級)
9. `Step 8`: (col 2, row 0) **斑龜** (水生高級)

When moving past tile 8, the pawn loops back to tile 0 (`(current_pos + roll) % 9`), completing an "生態循環圈" (Ecological Migration Cycle) which grants +15 bonus survival energy!

---

### 3. Game Mechanics & Technical Blueprint

#### A. Turn Flow & Dice Rolling Engine:
1. **Dice Roll**:
   - Player clicks `#diceBtn` or presses Spacebar.
   - Guard against duplicate clicks (`if (isRolling || isMoving) return;`).
   - Visual animation: 6 frames of random dice faces (⚀ ⚁ ⚂ ⚃ ⚄ ⚅ or numbers 1–6) across 350ms, accompanied by Web Audio rattling sound.
   - Settles on final value $D \in [1, 6]$.
   - Displays result in text banner: `🎲 擲出 ${D} 點！`.

2. **Pawn Movement Animation**:
   - Pawn moves step-by-step forward $D$ times with 150ms intervals.
   - Each hop plays a pitch-rising blip (`260Hz -> 330Hz -> 440Hz`) and triggers a canvas pawn bounce animation.
   - Updates `playerPos = (playerPos + 1) % 9`.

3. **Tile Landing & Predation Event ("Om Nom Nom!")**:
   - Landing on a tile triggers biological interaction based on the organism:
     - **初級消費者格 (蝶蛾、蚊蠅、蝌蚪)**:
       * "採集生產者能量！獲得 +15 能量！"
     - **次級消費者格 (胡蜂、赤蛙、水蠆)**:
       * "中階捕食者大快朵頤（Om Nom Nom）！捕獲初級獵物，獲得 +25 能量！"
     - **高級消費者格 (蜘蛛、秧雞、斑龜)**:
       * "頂級掠食者降臨！同化高階食物鏈能量，獲得 +35 能量！"
     - **天敵與競爭隨機事件 (20% 機率)**:
       * "遭遇天敵鳥類巡邏警戒！機敏躲避，消耗 5 點耐力防禦能量。"
   - Sound effect: Cheerful bite/arpeggio chime (`AudioContext`: C5-E5-G5).
   - Canvas effect: Visual pulse ring / floating text `+25⚡` on the landing cell.

4. **Victory Condition & Game Over**:
   - **Win Target**: Reach **100 點生態能量 (Energy Points)** or complete **5 圈生態大循環**.
   - Displays Victory Modal / Settlement Banner with:
     * 總消耗回合數 (Total Turns)
     * 捕食次數與生態能量總值
     * 生態地位評價 (例如：「🏆 濕地食物網頂級霸主」)
     * `[🔄 再玩一局]` 按鈕重設遊戲狀態。

5. **Audio Synthesizer (Web Audio API)**:
   - Zero external audio file dependencies — 100% resilient offline and across browsers:
     ```javascript
     const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
     function playSound(type) {
       if (!audioEnabled || audioCtx.state === 'suspended') return;
       const now = audioCtx.currentTime;
       const osc = audioCtx.createOscillator();
       const gain = audioCtx.createGain();
       osc.connect(gain);
       gain.connect(audioCtx.destination);
       if (type === 'dice') {
         osc.type = 'triangle';
         osc.frequency.setValueAtTime(220, now);
         osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
         gain.gain.setValueAtTime(0.2, now);
         gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
         osc.start(now); osc.stop(now + 0.08);
       } else if (type === 'eat') {
         osc.type = 'sine';
         osc.frequency.setValueAtTime(523.25, now); // C5
         osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
         osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
         gain.gain.setValueAtTime(0.25, now);
         gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
         osc.start(now); osc.stop(now + 0.25);
       }
     }
     ```

---

### 4. Canvas Board Visual Redesign

1. **Cell Aesthetics**:
   - Replace black-and-white grid with color-coded trophic cards:
     - Row 0 (高級掠食者): Soft amber/gold border & background (`#FFF8E1`, stroke `#FFA000`)
     - Row 1 (次級消費者): Soft sky blue border & background (`#E1F5FE`, stroke `#0288D1`)
     - Row 2 (初級消費者): Soft mint green border & background (`#E8F5E9`, stroke `#388E3C`)
   - Add biological icons/emojis:
     - 蜘蛛: 🕷️ | 秧雞: 🦤 | 斑龜: 🐢
     - 胡蜂: 🐝 | 赤蛙: 🐸 | 水蠆: 🪲
     - 蝶蛾: 🦋 | 蚊蠅: 🪰 | 蝌蚪: 🫧
   - Trophic badge in corner: `[初級]`, `[次級]`, `[頂級]`.

2. **Pawn Marker**:
   - Glowing circular pawn token with pulsating outer ring (`ctx.arc()`).
   - Color: Vibrant emerald green (`#00E676`) with drop shadow and "探險者" label.
   - Smooth interpolation between tiles during movement.

3. **Left Dashboard ("Hands" Area)**:
   - Convert `handsWidth` area from an empty box into an **Ecological Energy Gauge**:
     - ⚡ 當前能量 (Energy: 0 / 100)
     - 🔄 循環圈數 (Lap: 1)
     - 🍽️ 捕食紀錄 (Predation Events)
     - 🎯 目標指引

4. **Responsive Canvas Support**:
   - Set CSS `max-width: 100%; height: auto; aspect-ratio: 700 / 600;`.
   - On window resize or mobile viewport, scale drawing context appropriately to maintain crisp retina rendering without layout clipping.

---

### 5. Rules Modal Specification (Requirement R4.1)

#### HTML Structure:
```html
<!-- Rules Button in Header Bar -->
<div class="top-bar">
    <h1>食物鏈棋盤遊戲 (OmNomNom)</h1>
    <div class="controls-group">
        <button id="rulesBtn" class="btn btn-info" aria-haspopup="dialog">📖 遊戲規則說明</button>
        <button id="soundBtn" class="btn btn-secondary">🔊 音效: 開</button>
        <button id="resetBtn" class="btn btn-outline">🔄 重新開始</button>
    </div>
</div>

<!-- Rules Modal Overlay & Dialog -->
<div id="rulesModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" style="display: none;">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="modalTitle">🌿 食物鏈棋盤遊戲 (OmNomNom) — 遊戲規則與教學指引</h2>
            <button id="closeRulesBtn" class="modal-close" aria-label="關閉說明">&times;</button>
        </div>
        <div class="modal-body">
            <section>
                <h3>1. 遊戲背景與生態系介紹</h3>
                <p>本遊戲模擬台灣池塘與濕地生態系。棋盤由 9 種關鍵物種構成，分為三大營養階層與三條平行食物鏈：</p>
                <ul>
                    <li><strong>池塘水生鏈</strong>：蝌蚪（初級消費者）➔ 水蠆（次級消費者）➔ 斑龜（高級消費者）</li>
                    <li><strong>濕地飛蟲鏈</strong>：蚊蠅（初級消費者）➔ 赤蛙（次級消費者）➔ 秧雞（高級消費者）</li>
                    <li><strong>陸生昆蟲鏈</strong>：蝶蛾（初級消費者）➔ 胡蜂（次級消費者）➔ 蜘蛛（高級消費者）</li>
                </ul>
            </section>
            <section>
                <h3>2. 擲骰與前進機制</h3>
                <p>點擊「🎲 擲骰子」按鈕或按下空白鍵，骰子將隨機擲出 1 到 6 點。棋子將沿著生態食物鏈階層前進對應步數。每完成一圈生態循環，可獲得額外遷徙能量！</p>
            </section>
            <section>
                <h3>3. 捕食與能量同化規則 (Om Nom Nom)</h3>
                <ul>
                    <li><strong>停留在初級消費者格</strong>：採集基礎養分，獲得 <strong>+15 點能量</strong>。</li>
                    <li><strong>停留在次級消費者格</strong>：中階捕食者進食，獲得 <strong>+25 點能量</strong>。</li>
                    <li><strong>停留在高級掠食者格</strong>：頂級掠食者同化高階食物鏈能量，獲得 <strong>+35 點能量</strong>！</li>
                    <li><strong>生態隨機事件</strong>：有機會觸發天敵防禦考驗或互利共生獎勵。</li>
                </ul>
            </section>
            <section>
                <h3>4. 勝利條件</h3>
                <p>累積達到 <strong>100 點生態能量</strong> 即可獲勝，登上台灣濕地食物網霸主寶座！</p>
            </section>
        </div>
        <div class="modal-footer">
            <button id="modalUnderstandBtn" class="btn btn-primary">我明白了，開始遊戲！</button>
        </div>
    </div>
</div>
```

#### Event Handling Requirements:
- Open: Click `#rulesBtn` removes `display: none;` and adds `.modal-active` class.
- Close triggers:
  1. Click `#closeRulesBtn`.
  2. Click `#modalUnderstandBtn`.
  3. Click outside dialog on `.modal-overlay` backdrop.
  4. Press `Escape` key on keyboard.
- Touch friendly: All buttons minimum 48px height with touch feedback.

---

## Part II: Deep Investigation of `index.html` Mounting & Placement (Requirement R5)

### 1. Document Architecture & Style Guide
- Document Root: `/home/pancala/Documents/chihhsiangchien.github.io/index.html`
- Stylesheet: `css/style.css`
  - All `<a>` tags inside `.container` have `display: block; margin-bottom: 10px; color: #007bff; text-decoration: none;`.
  - Section headers use `<h1>` with blue background (`#007bff`) and white text.
  - Sub-sections use `<h2>` with `#f8f9fa` background.
  - Version footer: `const version = 'v1.1.0';` at line 313 (update to `v1.2.0` for Round 2).

### 2. Precise Mounting Positions

#### A. Cell Section ("細胞") — Mounting `cell-3d/index.html`
- **Location in `index.html`**: Lines 36–41
- **Existing Content**:
  ```html
  36:     <h1>細胞</h1>    
  37:     <a href="cell-structure/index.html">細胞構造3D</a>
  38:     <a href="matching/index.html?data=cells.json">配對細胞構造功能</a>
  39:     <a href="matching/index.html?data=cell-shape.json">配對細胞形狀</a>
  40:     <a href="matching/index.html?data=cell-function.json">配對細胞功能</a>
  ```
- **Target Replacement**:
  ```html
      <h1>細胞</h1>    
      <a href="cell-3d/index.html">3D細胞與胞器模型</a>
      <a href="cell-structure/index.html">細胞構造3D</a>
      <a href="matching/index.html?data=cells.json">配對細胞構造功能</a>
      <a href="matching/index.html?data=cell-shape.json">配對細胞形狀</a>
      <a href="matching/index.html?data=cell-function.json">配對細胞功能</a>
  ```

#### B. Ecology Section ("生態系") — Mounting `foodChain/`, `energyPyramid/`, `OmNomNom/`
- **Location in `index.html`**: Lines 240–251
- **Existing Content**:
  ```html
  248:     <p>
  249:       <a href="https://makecode.com/_cAaidV0fe9Xh">大魚吃小魚的arcade game</a>
  250:     <a href="fiddler-crab/index.html">招潮蟹生存模擬</a>
  251:     <h1>環境</h1>
  ```
- **Target Replacement**:
  ```html
      <p>
        <a href="https://makecode.com/_cAaidV0fe9Xh">大魚吃小魚的arcade game</a>
      <a href="fiddler-crab/index.html">招潮蟹生存模擬</a>
      <a href="foodChain/index.html">食物鏈與食物網動態模擬</a>
      <a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>
      <a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>
      <h1>環境</h1>
  ```

#### C. Critical Gap Identified: Round 1 `greatFossil/index.html`
- **Discovery**: In `ORIGINAL_REQUEST.md` §R1 (line 17), `greatFossil/index.html` was required to be mounted under "演化".
- **Current `index.html`** lines 201–204:
  ```html
  201:     <h1>演化</h1>
  202:     <a href="fossils/index.html">化石拼圖</a>
  203:     <a href="pepperedMoth/index.html">胡椒蛾天擇模擬之戰</a>
  ```
  `greatFossil/index.html` is missing here!
- **Action**: Mounting `<a href="greatFossil/index.html">化石大發現</a>` under `<h1>演化</h1>` will resolve the 7 failing tests in `tests/test_e2e_suite.py` and clear `greatFossil` from `check_unlinked_projects.py`.

---

## Part III: Verification Tools & Testing Infrastructure

### 1. Analysis of `check_unlinked_projects.py`

#### Internal Discovery & Verification Pipeline:
1. `parse_index_links(index_path)`:
   - Reads `index.html` with BeautifulSoup.
   - Iterates through all `<a>` tags.
   - Strips whitespace; detects typos if `raw_href != raw_href.strip()` (flags any leading/trailing space error).
   - Skips `http://`, `https://`, `mailto:`.
   - Cleans query strings (`?`) and hashes (`#`).
   - Unquotes URL path.
   - **404 Check**: Verifies `target.exists() or (target / "index.html").exists()`. If false, appends to `broken_links`.
2. `inspect_repository(root_path, linked_paths)`:
   - Builds `linked_set` containing all linked paths and their recursive parent directory names.
   - Scans all top-level non-hidden directories (`root_path.iterdir()`).
   - If `d.name not in linked_set`, marks directory as unlinked.
   - Scans all `.html` files in repository (`root_path.rglob("*.html")`). If not in `linked_set`, marks as unlinked HTML.

#### Current Baseline Output:
- Valid internal links: 178
- Unlinked top-level directories: 27
- Included in unlinked directories: `OmNomNom`, `energyPyramid`, `foodChain`, `greatFossil`.
- **Target Outcome after Round 2**:
  - `cell-3d`, `foodChain`, `energyPyramid`, `OmNomNom` (and `greatFossil`) removed from unlinked directories list.
  - 0 broken links (0 404s).
  - 0 typo links (0 whitespace bugs).

---

### 2. Analysis of Existing Test Suites in `tests/`

| Test File | Size | Mechanism | Purpose |
|---|---|---|---|
| `tests/test_e2e_suite.py` | 60.8 KB | `unittest` + ephemeral HTTP server + Node.js subprocess | Tiers 1–4 functional validation of R1–R8. |
| `tests/test_adversarial_challenger2.py` | 21.5 KB | `asyncio` + CDP over WebSockets + Headless Chromium | Responsive checks (320px, 375px), 0 console errors, 0 uncaught exceptions. |
| `tests/test_adversarial_stress.py` | 40.6 KB | `asyncio` + CDP over WebSockets + Headless Chromium | Stress bursts, event spam, rapid toggles, boundary values. |

#### Why `test_e2e_suite.py` Currently Has 7 Failures:
All 7 failures stem from `greatFossil`:
1. `test_r1_3_seven_targets_removed_from_unlinked_list`: `greatFossil` directory is unlinked.
2. `test_r5_1_stylesheet_link_valid`: `greatFossil/style.css` returned 404.
3. `test_r5_2_html_structure_clean`: `<title>` missing inside `<head>`.
4. `test_r5_3_audio_assets_resolved`: audio path was `../sound/correct.mp3` instead of `../cardGame/sound/correct.mp3`.
5. `test_r5_5_responsive_flexbox_styling`: 404 on `greatFossil/style.css`.
6. `test_t3_6_cross_project_asset_and_sound_integrity_matrix`: 404 on `greatFossil/style.css`.
7. `test_t4_1_curriculum_hub_navigation`: navigation failure on `greatFossil`.

---

### 3. Round 2 Comprehensive E2E Verification Plan

To verify all Round 2 deliverables (R1 through R5), we formulate a dedicated 4-Tier test matrix:

#### Tier 1: Feature Coverage (R1 to R5)
- **T1.1 (`cell-3d`)**:
  - [ ] HTTP 200 on `cell-3d/index.html`.
  - [ ] Three.js and OrbitControls load without 404.
  - [ ] 5 model switch buttons exist: Animal Cell, Mitochondria Cutaway, Chloroplast Cutaway, RBC, Cell Membrane.
  - [ ] Organelle annotation cards exist with Chinese titles and descriptions.
  - [ ] Camera reset button exists.
- **T1.2 (`foodChain`)**:
  - [ ] HTTP 200 on `foodChain/index.html`.
  - [ ] Top mode switcher exists for "簡易食物鏈" vs "多物種食物網".
  - [ ] Mode 1 activates wolf-sheep-grass canvas.
  - [ ] Mode 2 activates multi-species network and balance line chart.
  - [ ] Chart rendering engine loads without library errors.
- **T1.3 (`energyPyramid`)**:
  - [ ] HTTP 200 on `energyPyramid/index.html`.
  - [ ] 4 trophic tiers exist: 生產者, 初級消費者, 次級消費者, 高級消費者.
  - [ ] Dynamic 10% rule calculator with energy input/slider (default 10,000 J).
  - [ ] Trophic levels compute correctly (10,000 → 1,000 → 100 → 10 J) with 90% heat dissipation display.
  - [ ] Placement feedback animations and audio cues exist.
- **T1.4 (`OmNomNom`)**:
  - [ ] HTTP 200 on `OmNomNom/index.html`.
  - [ ] Rules button `#rulesBtn` opens `#rulesModal`.
  - [ ] Rules modal contains 4 required sections (roles, dice, predation, win condition).
  - [ ] Close button `#closeRulesBtn`, click-outside, and ESC close `#rulesModal`.
  - [ ] `#diceBtn` rolls 1–6 and updates action banner.
  - [ ] Canvas renders pawn and 9 ecological species.
  - [ ] Web Audio cues trigger on dice roll, pawn move, and predation.
- **T1.5 (`index.html` Mounting)**:
  - [ ] `<a href="cell-3d/index.html">3D細胞與胞器模型</a>` present in `<h1>細胞</h1>`.
  - [ ] `<a href="foodChain/index.html">食物鏈與食物網動態模擬</a>` present in `<h1>生態系</h1>`.
  - [ ] `<a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>` present in `<h1>生態系</h1>`.
  - [ ] `<a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>` present in `<h1>生態系</h1>`.
  - [ ] `check_unlinked_projects.py` passes with exit code 0, 0 broken links, 0 typos.

#### Tier 2: Boundary & Corner Cases
- **T2.1 (`OmNomNom` Dice Spam)**: Rapid consecutive clicks on `#diceBtn` while rolling/moving are locked out and do not cause race conditions.
- **T2.2 (`OmNomNom` Board Wrap)**: Pawn moving from tile 8 wraps around to tile 0 without array out-of-bounds error.
- **T2.3 (`energyPyramid` Boundary Energy)**: Inputting 0, negative values, or non-numeric strings to the 10% calculator falls back safely to default or clamps to zero without NaN.
- **T2.4 (`cell-3d` Model Thrashing)**: Rapidly cycling through all 5 3D models disposes previous geometries and textures without WebGL context loss.
- **T2.5 (`foodChain` Mode Toggling)**: Switching repeatedly between Food Chain and Food Web cancels animation frames cleanly without runaway CPU usage.

#### Tier 3: Cross-Feature & Responsive Viewports
- **T3.1 (CDP Headless Browser Zero Error Audit)**: Launch Headless Chromium via CDP across all 4 Round 2 pages; assert 0 `Runtime.exceptionThrown` and 0 `console.error`.
- **T3.2 (Multi-Device Responsiveness)**: Test at 320px (narrow mobile), 375px (iPhone SE), 768px (iPad portrait), 1024px (tablet landscape), and 1920px (desktop). Assert 0 horizontal body overflow and no button collisions.
- **T3.3 (Curriculum Navigation Pipeline)**: HTTP GET navigation flow from `index.html` into `cell-3d`, `foodChain`, `energyPyramid`, and `OmNomNom`.

#### Tier 4: Real-World Biology Classroom Scenarios
- **Scenario A**: High school cytology lesson exploring 3D organelles in `cell-3d/`.
- **Scenario B**: Middle school ecology lesson comparing linear food chain vs complex food web in `foodChain/`.
- **Scenario C**: Energy flow thermodynamics inquiry calculating 10% trophic transfer in `energyPyramid/`.
- **Scenario D**: Gamified classroom ecology review playing `OmNomNom/` board game with rules modal and dice progression.

---

## Part IV: Recommended Action Plan for Orchestrator

1. **Worker Assignment Recommendation**:
   - **Worker 1 (`cell-3d/`)**: Create unified 3D cell viewer integrating `insideTheCell/`, `3Dcell/`, and `threeJsModel/` models with side navigation and touch controls.
   - **Worker 2 (`foodChain/` & `energyPyramid/`)**: Consolidate `foodWeb/` into `foodChain/` with dual-mode switch; implement 10% energy transfer calculator and placement feedback in `energyPyramid/`.
   - **Worker 3 (`OmNomNom/`)**: Implement full board game engine, rules modal, Web Audio sound synthesis, pawn progression, and responsive canvas redesign in `OmNomNom/`.
   - **Worker 4 (`index.html` & Test Harness)**: Mount links in `index.html` under 細胞 and 生態 (and mount `greatFossil` under 演化); create `tests/test_round2_suite.py` and run verification.

2. **Verification Sequence**:
   - Ensure `cell-3d/index.html` is created before updating `index.html` so `check_unlinked_projects.py` does not flag 404.
   - Run `python3 check_unlinked_projects.py` to confirm 0 typos and 0 broken links.
   - Run `python3 tests/test_round2_suite.py` to achieve 100% test pass rate across Tiers 1–4.

# Handoff Report — Survey Explorer 2 (Round 2)

**Agent**: Survey Explorer 2  
**Role**: Investigation & Architectural Synthesis (R2: `foodChain/` & `foodWeb/`, R3: `energyPyramid/`)  
**Working Directory**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_2/`  
**Handoff Type**: Hard (Investigation & Technical Survey Complete)  

---

## 1. Observation

1. **`ORIGINAL_REQUEST.md` Follow-up Specifications**:
   - Lines 92-98 (`R2. 食物網與食物鏈整併 (foodChain/)`):
     - 以 `foodChain/` 為主入口，保留原有的狼、羊、草座標消耗與掠食動態模擬。
     - 整合 `foodWeb/` 的物種相生相剋關係網與多物種族群平衡折線圖（Chart / Canvas）。
     - 設計清晰的頂部切換按鈕：「單元一：簡易食物鏈消長模擬（狼-羊-草動態消耗）」與「單元二：多物種食物網生態平衡（生物多樣性、複雜網狀捕食關係與族群平衡圖表）」。
     - 支援響應式佈局（RWD），在手機與平板上皆能順暢顯示畫布與操作按鈕。
   - Lines 100-106 (`R3. 能量塔與 10% 傳遞法則動態計算 (energyPyramid/)`):
     - 補齊能量塔階層放置的即時判定（生產者、初級消費者、次級消費者、高級消費者）與正誤回饋音效/動畫。
     - 實作「能量 10% 傳遞法則」互動計算器：輸入或滑桿調整基底能量（如 10,000 J），即時推導各營養階層同化能量（10,000 → 1,000 → 100 → 10 J）與散失至環境的熱能（90%），圖形化展示幾何塔身或色塊柱狀圖。

2. **`foodChain/` Existing Codebase**:
   - `foodChain/index.html` (lines 11-15):
     ```html
     <body>
       <canvas id="canvas" width="100" height="100"></canvas>
       <script src="data.js"></script>
       <script src="script.js"></script>
     </body>
     ```
   - `foodChain/script.js` (lines 104-114, `eat()`):
     ```javascript
     if (grids["grass"][this.yGridIdx][this.xGridIdx] === null) {
       return;
     }
     if (grids["grass"][this.yGridIdx][this.xGridIdx].length !== 0) {
       this.energy += 10;
       this.lifespan += 10;
       var food = grids["grass"][this.yGridIdx][this.xGridIdx].pop();
       food.dead();
     }
     ```
   - `foodChain/script.js` (lines 295-298):
     ```javascript
     createGrid("sheep");
     generateOrganisms("sheep", 3);
     createGrid("grass");
     generateOrganisms("grass", 30);
     ```
     `wolf.png` (126,423 bytes) exists in the directory, but wolves are never instantiated, and predation on sheep is not coded.
   - Canvas resolution (lines 280-281):
     `canvas.width = window.innerWidth * 0.9; canvas.height = window.innerHeight * 0.9;`
     There is no `resize` handler, no responsive UI wrapper, and no controls.

3. **`foodWeb/` Mathematical Collapse Bug**:
   - In `foodWeb/Species.js` (lines 38-48):
     ```javascript
     if (this.preysOn.length > 0 && predatorPopulationSum >= 0) {
       preyChange =
         this.growthRate * this.prePopulation -
         this.deathRate * this.prePopulation * predatorPopulationSum;
     }
     if (this.isPreyOf.length > 0 && preyPopulationSum >= 0) {
       predatorChange =
         this.growthRate * this.prePopulation * preyPopulationSum -
         this.deathRate * this.prePopulation;
     }
     ```
   - Running simulation via Node (`vm.runInThisContext`):
     - 梅花鹿 (`preysOn: [草]`, `isPreyOf: [石虎]`) calculated `predatorChange = 0.02 * N * 50,000 = 1,000 * N`.
     - After 100 iterations, 梅花鹿 exploded to `4.89e+280` while 野兔, 巢鼠, 環頸雉, and 松鼠 collapsed to 0.
   - In `foodWeb/script.js` (lines 64-85), all chart creation and animation calls (`new LineChart(chartData); lineChart.draw();`) were commented out.
   - In `foodWeb/LineChart.js` (line 26), `Math.log(values[0])` generates `-Infinity` when a species population hits 0, causing rendering corruption.

4. **`energyPyramid/` Existing Codebase**:
   - `energyPyramid/index.html` (lines 13-17):
     ```html
     <div id="energyTower">
         <div id="producers" class="level" style="background-color: lightgreen;">生產者: <span id="producersCount">0</span></div>
         <div id="primaryConsumers" class="level" style="background-color: lightblue;">初級消費者: <span id="primaryConsumersCount">0</span></div>
         <div id="secondaryConsumers" class="level" style="background-color: lightcoral;">高級消費者: <span id="secondaryConsumersCount">0</span></div>
     </div>
     ```
     Only 3 tiers are defined. Tertiary / Apex consumers are missing.
   - `energyPyramid/script.js`:
     - Lines 14-18 use blocking `alert('能量塔穩定')` / `alert('能量塔不穩定')`.
     - No drag-and-drop or card placement mechanics exist.
     - No Web Audio or visual feedback exists.
     - No 10% energy transfer calculator or heat loss (90%) visualization exists.
     - `energyPyramid/data/cards.json` (179 bytes) is not loaded or used.

5. **`check_unlinked_projects.py` Execution**:
   - Running `python3 check_unlinked_projects.py` reported 25 unlinked top-level directories, specifically including:
     - `foodChain` (🟢 具 index.html | 共 10 檔案)
     - `foodWeb` (🟢 具 index.html | 共 6 檔案)
     - `energyPyramid` (🟢 具 index.html | 共 4 檔案)
     - `OmNomNom` (🟢 具 index.html | 共 4 檔案)

---

## 2. Logic Chain

1. **R2 Integration Strategy**:
   - *Premise*: `foodChain/` and `foodWeb/` represent the same ecological curriculum topic ("生態系與食物網/食物鏈"), and the user explicitly requested `foodChain/` to serve as the unified main directory with dual-mode tabs.
   - *Inference*: Keeping them separate creates code duplication and disjointed user experience. Integrating them under `foodChain/index.html` with a clean tab switcher (`單元一：簡易食物鏈消長模擬` vs `單元二：多物種食物網生態平衡`) fulfills requirement R2 directly.
   - *Technical Resolution for Mode 1*:
     - Fix `eat()` to support multi-trophic consumption: Sheep eat Grass, Wolves hunt and eat Sheep.
     - Add UI controls: Start, Pause, Reset, Speed Slider, and "+Wolf", "+Sheep", "+Grass" spawn buttons.
     - Implement responsive canvas resizing via `ResizeObserver` / window resize with `devicePixelRatio` scaling.
   - *Technical Resolution for Mode 2*:
     - Replace the broken differential formula in `Species.js` with a mathematically stable Lotka-Volterra model with carrying capacity $K$ and saturating predation.
     - Integrate Chart.js for real-time multi-species population time-series tracking.
     - Render an interactive food web topological graph showing directed predation links between all 10 native species from `物種關係.txt`.

2. **R3 Enhancement Strategy**:
   - *Premise*: `energyPyramid/` needs to demonstrate both trophic placement rules (Producers, Primary, Secondary, Tertiary Consumers) and Lindeman's 10% law of energy dissipation.
   - *Inference*: The current 3-tier raw numeric inputs fail to provide pedagogical value or satisfy R3 criteria.
   - *Technical Resolution for Placement Game*:
     - Expand structure to standard 4 tiers (生產者, 初級消費者, 次級消費者, 三級/頂級消費者).
     - Provide a rich deck of organism cards supporting both Drag-and-Drop and Tap-to-Place (mobile-first).
     - Synthesize instant sound effects using Web Audio API oscillators (high ascending chime for correct, low buzz for incorrect), ensuring zero asset 404s and strict compliance with browser autoplay gesture policies.
   - *Technical Resolution for 10% Energy Transfer Calculator*:
     - Implement dynamic input/slider for baseline producer energy ($E_0$, e.g. 10,000 J).
     - Compute exact trophic assimilation ($E_0 \rightarrow 0.1 E_0 \rightarrow 0.01 E_0 \rightarrow 0.001 E_0$) and 90% metabolic heat loss to the environment ($0.9 E_0, 0.09 E_0, 0.009 E_0$).
     - Graphically display stacked geometric pyramid tiers and rightward thermal dissipation arrows.

---

## 3. Caveats

1. **`foodWeb/` Original Folder Retention**:
   - While `foodChain/` will house the unified dual-mode application, `foodWeb/index.html` can either remain as a standalone legacy redirect or standalone view to prevent breaking external bookmarks.
2. **Chart.js CDN Dependency**:
   - `ecoSimulation2` successfully uses `https://cdn.jsdelivr.net/npm/chart.js`. Using the same CDN in `foodChain/` provides feature parity and high visual polish without adding large bundle files to the repository. A fallback canvas line renderer should be included or defensive checks applied.
3. **No Caveats on Audio**:
   - Web Audio API oscillators do not require audio file downloads, removing all CORS, 404, or mobile format compatibility issues.

---

## 4. Conclusion

The technical investigation for R2 and R3 is complete. The existing code contains severe functional gaps (unspawned wolves, hardcoded grass-only predation, inverted ecosystem differential equations causing population explosion to $10^{280}$, missing 4th trophic level, missing 10% calculator, and lack of audio/visual feedback).

The detailed architectural designs in `survey_report.md` provide complete specifications for subsequent implementation:
- **`foodChain/`**: Dual-mode interactive interface combining full Wolf-Sheep-Grass dynamic spatial simulation (Mode 1) with 10-species stable food web and Chart.js analytics (Mode 2), fully responsive for mobile and desktop.
- **`energyPyramid/`**: 4-tier interactive card placement game with Web Audio sound synthesis and instant visual feedback, combined with an interactive 10% energy transfer calculator and heat dissipation visualization.
- **`index.html`**: Section "生態" will mount both projects cleanly, passing static checks.

---

## 5. Verification Method

1. **Static Linkage Inspection**:
   Run the project's official verification script:
   ```bash
   python3 check_unlinked_projects.py
   ```
   *Expected outcome*: `foodChain` and `energyPyramid` are tracked and confirmed linked once added to `index.html`.

2. **Simulation Model Verification**:
   Inspect mathematical stability of the new food web formula by running iterations:
   ```bash
   node -e '/* test script for foodWeb population stability */'
   ```
   *Expected outcome*: Populations remain within $[0, K]$, no division by zero, no `-Infinity` in chart inputs.

3. **Console & Browser Inspection**:
   Open `foodChain/index.html` and `energyPyramid/index.html` in browser.
   - Switch tabs in `foodChain/` and verify that canvas and Chart.js draw smoothly with 0 uncaught errors in Console.
   - Drag or tap cards in `energyPyramid/` and verify sound plays upon user interaction and calculator updates accurately ($10,000 \rightarrow 1,000 \rightarrow 100 \rightarrow 10$).

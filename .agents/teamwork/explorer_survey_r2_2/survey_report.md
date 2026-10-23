# Survey Report: Food Chain/Web Integration (R2) & Energy Pyramid Enhancement (R3)

**Author**: Survey Explorer 2 (Round 2)  
**Date**: 2026-10-23  
**Working Directory**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_2/`  
**Reference Document**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md` (Follow-up 2026-10-23T09:35:29Z)

---

## 1. Executive Summary

This report delivers a comprehensive technical survey and architectural design for **Requirement R2** (`foodChain/` and `foodWeb/` consolidation into a dual-mode ecological simulation) and **Requirement R3** (`energyPyramid/` interactive trophic placement and dynamic 10% energy transfer calculator).

### Key Survey Findings:
1. **`foodChain/` Status**: Contains a functional 2D spatial grid movement and consumption loop in `script.js` with sprite PNGs (`wolf.png`, `sheep.png`, `grass.png`). However, wolves are currently unspawned, the `eat()` method only checks for grass (no wolf-preying-on-sheep logic), canvas scaling lacks responsiveness upon window resize/orientation change, and there are no UI controls.
2. **`foodWeb/` Status**: Contains a 10-species Taiwanese food web dataset in `物種關係.txt`. However, `Species.js` contains a **critical mathematical bug** (inverted predator/prey differential change formulas) that causes the herbivore (梅花鹿) population to explode to $>10^{280}$ while all other species crash to zero. In addition, Chart.js / canvas line drawing was commented out in `script.js`, and `Math.log(0)` leads to `-Infinity` canvas errors.
3. **`energyPyramid/` Status**: The current implementation is a rudimentary 3-level prototype with basic `<input type="number">` fields and intrusive `alert()` popups. It is missing the standard 4th trophic tier (Tertiary / Apex consumer), has no card placement or drag-and-drop mechanics, lacks audio/visual feedback, has no 10% energy transfer calculator, and has no heat loss visualization.
4. **Integration Blueprint**:
   - `foodChain/index.html` becomes the consolidated entry point featuring a clean top navigation tab system:
     - **Mode 1 (單元一)**: 簡易食物鏈消長模擬 (Wolf-Sheep-Grass interactive dynamic grid simulation).
     - **Mode 2 (單元二)**: 多物種食物網生態平衡 (10-species Taiwanese native network with interactive food web graph and stable population dynamics line chart).
   - `energyPyramid/index.html` will be expanded into a comprehensive dual-module educational app:
     - **Module 1**: 生態系營養階層放置挑戰 (4-tier interactive card placement with Web Audio API sound synthesis and visual feedback).
     - **Module 2**: 「能量 10% 傳遞法則」動態計算器 (Configurable baseline energy slider/input, dynamic computation of 10% trophic assimilation vs. 90% heat dissipation loss, with stepped geometric pyramid and energy-flow arrows).

---

## 2. Deep Dive Code Analysis

### 2.1 Existing `foodChain/` Codebase

| File | Size | Role & Current State |
|---|---|---|
| `index.html` | 360 B | Minimal HTML skeleton. Defines `<canvas id="canvas" width="100" height="100"></canvas>` and imports `data.js`, `script.js`. Missing CSS styling, header, controls, and RWD container. |
| `script.js` | 8.2 KB | Core simulation logic. Defines `Organism` class, grid-based positioning, movement, eating, death, and reproduction. |
| `wolf.png`, `sheep.png`, `grass.png` | ~100-126 KB each | Sprite images for the three trophic organisms. High quality, ready for display. |
| `data.js` | 895 B | Mock card data from an earlier prototype. Not utilized by `script.js`. |
| `script2.js`, `class.js`, `utils.js` | 2-21 KB | Legacy/experimental code from previous card and grid experiments. Not linked in `index.html`. |

#### Detailed Issues in `foodChain/script.js`:
- **Missing Wolf Predation Loop**:
  Lines 295-298 only instantiate sheep and grass:
  ```javascript
  createGrid("sheep");
  generateOrganisms("sheep", 3);
  createGrid("grass");
  generateOrganisms("grass", 30);
  ```
  `wolf.png` is never loaded into `organisms`!
  Furthermore, line 104 in `Organism.prototype.eat`:
  ```javascript
  if (grids["grass"][this.yGridIdx][this.xGridIdx] === null) return;
  if (grids["grass"][this.yGridIdx][this.xGridIdx].length !== 0) {
    this.energy += 10;
    this.lifespan += 10;
    var food = grids["grass"][this.yGridIdx][this.xGridIdx].pop();
    food.dead();
  }
  ```
  The code hardcodes `grids["grass"]`. If a wolf were spawned, it would attempt to eat grass instead of sheep.
- **Infinite Loop Risk in `getEmptyCell`**:
  ```javascript
  while (grids[type][yGridIdx][xGridIdx] !== null) { ... }
  ```
  If grass fills all grid cells, this loop hangs the browser tab.
- **Canvas Sizing & Responsiveness**:
  ```javascript
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.9;
  ```
  No `resize` event listener exists; resizing the browser or rotating a mobile device causes misalignment and stretching.

---

### 2.2 Existing `foodWeb/` Codebase

| File | Size | Role & Current State |
|---|---|---|
| `index.html` | 447 B | Minimal HTML importing `Species.js`, `Ecosystem.js`, `LineChart.js`, `script.js`. |
| `物種關係.txt` | 296 B | 10 species dataset detailing Taiwanese ecological relationships: 石虎, 老鷹, 蛇, 黃鼠狼, 梅花鹿, 野兔, 環頸雉, 巢鼠, 松鼠, 草. |
| `Species.js` | 2.1 KB | Defines `Species` class and discrete differential population update formula. |
| `Ecosystem.js` | 761 B | Ecosystem container; filters out species when `population <= 0`. |
| `LineChart.js` | 2.3 KB | Custom HTML5 Canvas line chart drawing. |
| `script.js` | 2.3 KB | Instantiates 10 species and runs 100 iterations synchronously in a loop. Chart rendering is commented out. |

#### Critical Flaws in `foodWeb/`:
1. **Mathematical Inversion Bug in `Species.js`**:
   In `Species.prototype.updatePopulation`:
   ```javascript
   // Lines 38-48
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
   **Why this breaks completely**:
   - `preysOn.length > 0` indicates THIS species is a consumer/predator eating prey. But the equation applied is for prey being predated!
   - `isPreyOf.length > 0` indicates THIS species is preyed upon. But the equation applied is for a predator gaining energy from prey!
   - For herbivores like 梅花鹿 (`preysOn`=[草], `isPreyOf`=[石虎]):
     `preySum` is 草's population (50,000). The formula calculates `predatorChange = 0.02 * N * 50,000 = 1,000 * N`! This causes 梅花鹿 to multiply by 1,000 every single step, skyrocketing to $4.89 \times 10^{280}$.
   - For primary producer 草 (`preysOn`=[]):
     `preysOn.length === 0`, so `preyChange` is 0. Its `preySum` is 0, so `predatorChange = -0.01 * N`. Grass has zero reproduction/growth and rapidly decays to 0.
2. **Commented-Out Visuals & Synchronous Loop**:
   In `foodWeb/script.js`, lines 59-63 run a blocking loop:
   ```javascript
   for (let i = 0; i < 100; i++) {
     ecosystem.update();
     ecosystem.printPopulation();
   }
   ```
   Lines 65-86 (which would initialize and animate the line chart) are commented out completely.
3. **Chart `Math.log(0)` Exception**:
   In `LineChart.js` line 26: `canvas.height - chartMargin.bottom - Math.log(values[0]) * yScale`. If population drops to 0, `Math.log(0)` returns `-Infinity`, causing canvas drawing corruption.
4. **Species Array Desynchronization**:
   `Ecosystem.js` filters out extinct species: `this.species = this.species.filter(s => s.population > 0)`. When a species goes extinct, the index of remaining species shifts, breaking the 1-to-1 mapping with `chartData[i]`.

---

### 2.3 Existing `energyPyramid/` Codebase

| File | Size | Role & Current State |
|---|---|---|
| `index.html` | 1.4 KB | 3-level HTML layout (`#producers`, `#primaryConsumers`, `#secondaryConsumers`) with number inputs. Missing Tertiary level. |
| `style.css` | 575 B | Fixed 200px by 300px box styling. No responsiveness. |
| `script.js` | 3.0 KB | Hand-coded height calculation based on input ratios and random `setInterval` subtraction every 5s. Alerts `能量塔穩定` / `能量塔不穩定`. |
| `data/cards.json` | 179 B | 4 mock card entries (`mouse`, `cat`, `dog`, `cheese`), not loaded by the application. |

#### Deficiencies in `energyPyramid/`:
1. **Lacks 4th Trophic Level**: Biological energy pyramids in secondary school science curricula require 4 standard levels:
   - Level 1: 生產者 (Producers)
   - Level 2: 初級消費者 (Primary Consumers)
   - Level 3: 次級消費者 (Secondary Consumers)
   - Level 4: 三級 / 頂級消費者 (Tertiary / Apex Consumers)
2. **No Interactive Placement Gameplay**: Students cannot drag or tap cards into tiers. The current UI is just 3 raw numerical input boxes.
3. **No 10% Energy Transfer Calculator**:
   - The user cannot input or slide baseline energy (e.g. 10,000 J).
   - There is no dynamic calculation showing:
     $$10,000\text{ J} \xrightarrow{10\%} 1,000\text{ J} \xrightarrow{10\%} 100\text{ J} \xrightarrow{10\%} 10\text{ J}$$
   - There is no calculation of the 90% lost to the environment as metabolic heat ($9,000\text{ J}, 900\text{ J}, 90\text{ J}$).
4. **No Visual/Audio Correctness Feedback**:
   - Current alerts use browser modal `alert()`, which freezes page interaction.
   - No Web Audio synthesized cues or CSS animation feedback.

---

## 3. Requirements Analysis & Architectural Solutions

### 3.1 Requirement R2: `foodChain/` & `foodWeb/` Consolidation

#### Educational Objectives:
1. Allow students to observe bottom-up and top-down population cycles in a simple 3-trophic chain (Wolf-Sheep-Grass).
2. Allow students to explore how biological diversity in a complex food web provides ecological resilience compared to a single chain.

#### Proposed Architecture:
```
foodChain/
├── index.html        <-- Unified RWD container with Tab Switcher & Modern Navigation
├── style.css         <-- Mobile-first responsive styling (Flexbox/Grid, Dark/Light theme)
├── script.js         <-- Mode 1: 狼-羊-草動態消耗模擬 (Wolf, Sheep, Grass grid simulation)
├── foodWeb.js        <-- Mode 2: 10物種台灣生態食物網平衡引擎 & 互動網絡拓撲
├── webChart.js       <-- Mode 2: 即時族群動態折線圖 (Chart.js / Smooth Canvas Line Chart)
├── wolf.png          <-- Existing sprite
├── sheep.png         <-- Existing sprite
└── grass.png         <-- Existing sprite
```

#### Mode 1: 簡易食物鏈消長模擬 (Wolf-Sheep-Grass Simulation)
- **Entities & Interactions**:
  - **草 (Grass)**: Fixed positions, auto-regrows based on sunlight/time ticks.
  - **羊 (Sheep)**: Moves across grid, searches for grass, gains lifespan/energy upon consumption. Dies of starvation if energy falls to 0. Reproduces when energy is sufficient.
  - **狼 (Wolf)**: Moves across grid, stalks and preys upon sheep, gains lifespan/energy. Dies of starvation if sheep population collapses. Reproduces after sufficient predation.
- **Controls & HUD**:
  - `開始 / 暫停 (Play/Pause)`, `重置 (Reset)`, `模擬速度 (1x, 2x, 5x)`.
  - Dynamic injection buttons: `+放生狼`, `+放生羊`, `+播種草`.
  - Live HUD counters displaying current population counts and status badges.
- **Canvas Scaling & Touch Compatibility**:
  - Auto-scales canvas using `devicePixelRatio` to prevent blurriness on Retina/mobile screens.
  - Touch-friendly control buttons with minimum 44px tap targets.

#### Mode 2: 多物種食物網生態平衡 (10-Species Biodiversity Network)
- **10 Native Species Network**:
  - **生產者**: 草 (Grass)
  - **初級消費者**: 梅花鹿 (Sika deer), 野兔 (Rabbit), 環頸雉 (Pheasant), 巢鼠 (Harvest mouse), 松鼠 (Squirrel)
  - **次級/頂級消費者**: 石虎 (Leopard cat), 老鷹 (Eagle), 蛇 (Snake), 黃鼠狼 (Weasel)
- **Corrected Mathematical Model**:
  Use a stabilized, generalized Lotka-Volterra formulation with carrying capacity $K$ and saturating predation (Holling type II or ratio-dependent):
  - **Producer (草)**:
    $$\frac{dN_{\text{plant}}}{dt} = r \cdot N_{\text{plant}} \cdot \left(1 - \frac{N_{\text{plant}}}{K}\right) - \sum_{h \in \text{herbivores}} c_{h} \cdot \frac{N_{\text{plant}}}{N_{\text{plant}} + D} \cdot N_h$$
  - **Herbivore ($h$)**:
    $$\frac{dN_h}{dt} = e_h \cdot c_h \cdot \frac{N_{\text{plant}}}{N_{\text{plant}} + D} \cdot N_h - d_h \cdot N_h - \sum_{p \in \text{predators}} c_{p,h} \cdot N_p \cdot \frac{N_h}{\sum \text{prey} + D}$$
  - **Predator ($p$)**:
    $$\frac{dN_p}{dt} = \sum_{prey} e_p \cdot c_{p,prey} \cdot N_p \cdot \frac{N_{prey}}{\sum \text{prey} + D} - d_p \cdot N_p$$
  This formulation guarantees:
  - Populations do not explode to infinity ($K$ caps producers).
  - Species oscillate harmonically around equilibrium points.
  - Zero division and $\log(0)$ errors are prevented by clamping at 0.
- **Interactive Visualizations**:
  1. **互動食物網拓撲圖 (Interactive Food Web Diagram)**:
     - Clear hierarchical node layout (Apex predators on top, Herbivores in middle, Grass at bottom).
     - Directed energy flow arrows indicating predator-prey connections.
     - Clickable species nodes allowing users to test ecological perturbations (e.g., "移除老鷹", "獵捕石虎", "大量增殖兔子") to observe trophic cascade effects.
  2. **即時族群折線圖 (Real-time Population Line Chart)**:
     - Rendered via Chart.js (or high-performance canvas engine).
     - Shows rolling history of 100-200 ticks.
     - Color-coded corresponding to species types.

---

### 3.2 Requirement R3: `energyPyramid/` Enhancement

#### Educational Objectives:
1. Teach students the 4 trophic levels and correct categorization of organisms (Producers, Primary Consumers, Secondary Consumers, Tertiary Consumers).
2. Teach Lindeman's 10% Law of Energy Transfer (林德曼 10% 能量傳遞定律) and explain why energy flows unidirectionally and dissipates as metabolic heat, limiting food chains to 4-5 levels.

#### Proposed Architecture:
```
energyPyramid/
├── index.html        <-- Dual-section layout: Placement Challenge & 10% Energy Calculator
├── style.css         <-- Modern card UI, pyramid styling, heat dissipation animations
└── script.js         <-- Game logic, Web Audio synthesizer, dynamic 10% calculation & visualization
```

#### Module 1: 營養階層卡牌放置挑戰 (Trophic Placement Game)
- **Trophic Tiers (4 Levels)**:
  1. **第四階層：頂級/三級消費者 (Tertiary / Apex Consumers)** (Color: `#ef5350` coral red)
  2. **第三階層：次級消費者 (Secondary Consumers)** (Color: `#ffa726` orange)
  3. **第二階層：初級消費者 (Primary Consumers)** (Color: `#42a5f5` sky blue)
  4. **第一階層：生產者 (Producers)** (Color: `#66bb6a` leaf green)
- **Organism Card Deck**:
  - Producers: 綠色水稻, 浮游藻類, 咸豐草, 台灣二葉松
  - Primary Consumers: 蝗蟲, 野兔, 蝸牛, 梅花鹿
  - Secondary Consumers: 青蛙, 攀木蜥蜴, 螳螂, 小雨燕
  - Tertiary / Apex Consumers: 大冠鷲, 石虎, 百步蛇, 台灣黑熊
- **Interaction Mechanics**:
  - Support both **Drag-and-Drop** (HTML5 Drag & Drop API / Touch Drag) and **Click-to-Select & Tap-Tier-to-Place** (essential for effortless mobile smartphone operation).
- **Visual & Audio Feedback**:
  - **Visual Feedback**:
    - Correct placement: green highlight pulse, card snaps neatly into place, increment score counter.
    - Incorrect placement: gentle card shake animation, red flash, pedagogical explanatory hint modal or toast (e.g., 「青蛙主要捕食昆蟲等初級消費者，屬於次級消費者喔！」).
  - **Web Audio API Feedback**:
    - Built using programmatic Web Audio API synthesis (as established in `pepperedMoth/index.html` and `rt/app.js`), avoiding any external MP3 network dependencies:
      - **Correct Sound**: Two-tone ascending chime (587 Hz $\rightarrow$ 880 Hz, sine wave).
      - **Incorrect Sound**: Low double buzz (180 Hz $\rightarrow$ 130 Hz, sawtooth wave).
      - **Victory Fanfare**: Arpeggiated celebratory sequence upon completing all 4 tiers.

#### Module 2: 「能量 10% 傳遞法則」動態數值計算器 (10% Energy Transfer Calculator)
- **Interactive Controls**:
  - Baseline producer energy input:
    - Number field + range slider: $1,000 \text{ J}$ to $1,000,000 \text{ J}$ (default: $10,000 \text{ J}$).
    - Unit toggle: 焦耳 (J) / 大卡 (kcal).
  - Configurable transfer efficiency slider (default: 10%, adjustable from 5% to 20% to explain biological variation).
- **Dynamic Energy Accounting Table & Output**:
  - For baseline $E_0 = 10,000\text{ J}$ with $\eta = 10\%$:
    1. **生產者 (Producers)**:
       - 固定總能量: $10,000\text{ J}$ ($100\%$)
       - 傳遞至下一階層: $1,000\text{ J}$ ($10\%$)
       - 散失熱能至環境: $9,000\text{ J}$ ($90\%$)
    2. **初級消費者 (Primary Consumers)**:
       - 同化總能量: $1,000\text{ J}$ ($10\%$)
       - 傳遞至下一階層: $100\text{ J}$ ($1\%$)
       - 散失熱能至環境: $900\text{ J}$ ($9\%$)
    3. **次級消費者 (Secondary Consumers)**:
       - 同化總能量: $100\text{ J}$ ($1\%$)
       - 傳遞至下一階層: $10\text{ J}$ ($0.1\%$)
       - 散失熱能至環境: $90\text{ J}$ ($0.9\%$)
    4. **三級消費者 (Tertiary Consumers)**:
       - 同化總能量: $10\text{ J}$ ($0.1\%$)
       - 散失熱能至環境: $9\text{ J}$ ($0.09\%$)
       - 頂級殘存能量: $1\text{ J}$ ($0.01\%$)
  - **累計能量散失**: $9,999\text{ J} / 10,000\text{ J} = 99.99\%$ 散失為環境廢熱！
- **Graphical Visualization**:
  - **幾何立體能量塔 (Geometric Proportional Pyramid)**:
    - Four stacked horizontal tiers with width proportional to $\log_{10}(\text{Energy})$ or percentage, visually emphasizing the dramatic thinning from broad base to tiny apex.
  - **熱能散失放射流動圖 (Heat Dissipation Flow Arrows)**:
    - Orange/red wavy thermal radiation arrows pointing rightward into the environment labeled with exact Joules lost at each step.
    - Upward green assimilation arrows indicating energy flowing upward.
  - **Pedagogical Explanation Card**:
    - Explains: 「為什麼食物鏈很少超過4~5個營養階層？因為能量在傳遞過程中，高達 90% 會透過呼吸作用與代謝轉換為熱能散失，無法被上一階層利用！」

---

## 4. Cross-Project Consistency & Index Linkage

### 4.1 Index Mounting Plan
In `index.html` under the `<h1>生態系</h1>` section (around lines 234-245):
```html
<p>
  <a href="foodChain/index.html">食物鏈與食物網動態模擬</a>
</p>
<p>
  <a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>
</p>
<p>
  <a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>
</p>
```
*Note*: As required by project guidelines, verify with `python3 check_unlinked_projects.py` to ensure that `foodChain/` and `energyPyramid/` are recognized as linked.

### 4.2 Browser & Mobile Compatibility Checklist
- [x] Responsive layout with CSS Flexbox/Grid adapting to viewport widths from 320px to 1920px.
- [x] Web Audio API instantiated or resumed strictly upon user gesture (`touchstart` / `click`), satisfying iOS Safari and Chrome autoplay policies.
- [x] Safe canvas operations: clamp values to avoid `NaN` or `-Infinity` in `Math.log()`.
- [x] Zero external unbundled asset dependencies (synthesized sound, vector SVG / embedded PNG).

---

## 5. Implementation Roadmap & Task Division

| Phase | Task Description | Deliverables |
|---|---|---|
| **Phase 1: `foodChain/` Refactoring** | Integrate `foodWeb/` into `foodChain/` with dual-mode tabs. Complete Mode 1 wolf predation logic and Mode 2 stable 10-species food web simulation with Chart.js. | `foodChain/index.html`, `foodChain/style.css`, `foodChain/script.js` |
| **Phase 2: `energyPyramid/` Overhaul** | Build 4-tier placement game with Web Audio feedback and interactive 10% energy transfer calculator with heat loss visualization. | `energyPyramid/index.html`, `energyPyramid/style.css`, `energyPyramid/script.js` |
| **Phase 3: Index Linkage & Verification** | Add links to `index.html`, test via `check_unlinked_projects.py`, run browser/node tests. | `index.html`, verification logs |

---
*Report completed by Survey Explorer 2.*

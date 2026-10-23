# Handoff Report: Survey of fiddler-crab (R2) & pepperedMoth (R3)

**Author**: Explorer 2 (`teamwork_preview_explorer`)  
**Target Recipient**: Orchestrator parent agent (`663e1b82-691c-40bd-84b9-2c609f9e72ae`) / Implementer agents  
**Report Type**: Hard Handoff (Investigation & Survey Complete)  
**Associated Detailed Report**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_2/survey_report.md`

---

## 1. Observation

### A. `fiddler-crab/` (R2)
1. **File Inventory**:
   - `fiddler-crab/index.html` (95 lines, 4,266 bytes)
   - `fiddler-crab/style.css` (301 lines, 5,626 bytes)
   - `fiddler-crab/fiddler-crab.js` (717 lines, 26,151 bytes)
   - Command: `node -c fiddler-crab/fiddler-crab.js` returned code `0` (clean syntax).
2. **Current Keyboard Controls (`fiddler-crab/fiddler-crab.js:492-498, 525-528`)**:
   ```javascript
   window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
   window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
   ...
   this.player.x += this.keys['arrowleft'] ? -this.player.speed : 0;
   this.player.x += this.keys['arrowright'] ? this.player.speed : 0;
   this.player.z += this.keys['arrowup'] ? -this.player.speed : 0;
   this.player.z += this.keys['arrowdown'] ? this.player.speed : 0;
   ```
   *Direct observation*: Only `'arrowleft'`, `'arrowright'`, `'arrowup'`, `'arrowdown'` are handled. WASD (`'w'`, `'a'`, `'s'`, `'d'`) are completely unhandled.
3. **Current Virtual Directional Buttons (`fiddler-crab/fiddler-crab.js:501-514`)**:
   ```javascript
   document.querySelectorAll('.btn-arrow').forEach(btn => {
       const handlePress = (isPressed) => {
           const direction = btn.dataset.direction;
           if (direction === 'left') this.player.vx = isPressed ? -this.player.speed : 0;
           if (direction === 'right') this.player.vx = isPressed ? this.player.speed : 0;
           if (direction === 'turn-up') this.player.vz = isPressed ? -this.player.speed : 0;
           if (direction === 'turn-down') this.player.vz = isPressed ? this.player.speed : 0;
       };
       btn.addEventListener('mousedown', () => handlePress(true));
       btn.addEventListener('mouseup', () => handlePress(false));
       btn.addEventListener('touchstart', (e) => { handlePress(true); e.preventDefault(); });
       btn.addEventListener('touchend', (e) => { handlePress(false); e.preventDefault(); });
   });
   ```
   *Direct observation*: `mouseup` and `touchend` are only attached to the button element itself. If the user moves mouse or finger outside the button and releases, `isPressed(false)` is never called, leaving `this.player.vx` or `this.player.vz` stuck indefinitely. No touch listeners exist on `#canvas-container`.
4. **Current Game Over Modal Structure & Styles (`fiddler-crab/index.html:78-86`, `style.css:220-231`)**:
   - In `index.html`, `#game-over` is nested inside `.control-panel` (the right-side toolbar on desktop).
   - In `style.css`, `.game-over` has `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 100;`, but has **no backdrop overlay**.
   - Search for `.final-stats` and `.btn-restart` across `fiddler-crab/style.css` returned 0 matches. Neither `.final-stats` nor `#restart-btn` has any CSS rules, rendering as unstyled plain text and default grey browser buttons.
   - In `fiddler-crab.js:671-676`, `endGame()` sets `document.getElementById('game-over-message').textContent = '你被天敵吃掉了！';` indiscriminately, even when triggered by starvation at line 632 (`if (this.player.health <= 0)`).
5. **Assets & External Dependencies**:
   - `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`.
   - All 3D meshes (crab, egret, food, ground, burrows) and ground textures are procedurally generated via Three.js primitives and canvas 2D noise. Zero external texture or model files required.

---

### B. `pepperedMoth/` (R3)
1. **File Inventory**:
   - `pepperedMoth/index.html` (735 lines, 32,816 bytes)
   - Command: `node -c` on extracted script returned code `0` (clean syntax).
2. **Current Simulation Loop (`pepperedMoth/index.html:339-380, 503-554`)**:
   - `startSimulation()`: Reads initial sliders, clears moths, creates DOM moths, records `generationData[0]`, reveals `phase2Controls`, calls `updateChart()`.
   - Moth movement (`index.html:455-465`): `setInterval` every 1-3 seconds randomly shifts `left` and `top` by +/- 20px.
   - Moth predation (`index.html:443-445, 478-501`): `click` event listener calls `captureMoth(moth, color)` which shrinks and removes moth, incrementing `capturedBlackMoths` or `capturedWhiteMoths`.
   - Generation transition (`index.html:503-522`): `createNextGeneration()` multiplies surviving moths by 2 (`reproductionRate = 2`). When `currentGeneration > 5`, calls `moveToAnalysisPhase()`.
3. **Time Limit & Predator Mode Gap**:
   - *Direct observation*: There is **no timer or countdown function** in `pepperedMoth/index.html`. Users can take indefinitely long to hunt every single moth regardless of camouflage.
   - There is no mode selector between "Predator Challenge" and "Auto Simulation".
4. **Chart.js Implementation (`pepperedMoth/index.html:595-615`)**:
   ```javascript
   chart = new Chart(ctx, {
       type: 'bar',
       data: {
           labels: labels,
           datasets: [
               { label: '黑蛾數量', data: blackData, backgroundColor: 'rgba(45, 45, 45, 0.8)', ... },
               { label: '白蛾數量', data: whiteData, backgroundColor: 'rgba(240, 240, 240, 0.8)', ... }
           ]
       }, ...
   });
   ```
   *Direct observation*: Current chart is `type: 'bar'`, whereas R3 calls for maintaining and linking the population trend line chart (折線圖).
5. **Assets & Dependencies**:
   - Tailwind CSS CDN (`cdn.tailwindcss.com`) and Chart.js CDN (`cdn.jsdelivr.net/npm/chart.js`).
   - Moths are SVG Data URIs (`url("data:image/svg+xml,...")`). Background textures are CSS colors or SVG Data URIs. Zero external images or asset files required.

---

## 2. Logic Chain

1. **`fiddler-crab` Input Control Defect & Remedy**:
   - *Observation*: Mouse/touch listeners on directional buttons mutate velocity directly without pointer capture, resulting in stuck velocity when pointer leaves element. Keyboard only binds arrow keys. Canvas has no touch handlers.
   - *Reasoning*: By introducing unified pointer events with `pointerdown` / `pointerup` / `pointercancel` / `pointerleave` on directional buttons, binding WASD alongside arrow keys, and attaching a touch drag/swipe listener to `#canvas-container` that computes normalized `(dx, dy)` movement vectors, we achieve fluid cross-platform control on phones, tablets, and desktops without any control regression.
2. **`fiddler-crab` Game Over Modal Defect & Remedy**:
   - *Observation*: `#game-over` is nested in sidebar `.control-panel`, has no full-screen backdrop, `.final-stats` and `#restart-btn` lack CSS styling, and death reason is hardcoded to predator attack.
   - *Reasoning*: Moving `#game-over` to root container with fixed full-screen modal backdrop (`position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000;`), adding CSS for stats cards and restart button, and passing reason (`'predator'` vs `'hunger'`) to `endGame()` creates an intuitive, informative settlement screen showing survival time, food count, and survival grade.
3. **`pepperedMoth` Evolutionary Simulation & Predator Mode**:
   - *Observation*: Without a timer, students can hunt all moths with 100% efficiency, negating the evolutionary purpose of camouflage. Furthermore, Chart.js is currently rendered as a bar chart rather than a trend line chart.
   - *Reasoning*: Adding a 15-second countdown timer per generation in "Predator Mode" forces rapid visual search, causing uncamouflaged moths to be spotted and clicked first while camouflaged moths survive. When the timer hits 0, a round settlement banner locks interaction and displays survival/reproduction counts. Upgrading the chart to `type: 'line'` visually graphs the population divergence across generations 1 through 5, fulfilling R3.

---

## 3. Caveats

- **No Caveats**.
- All assets in both projects are self-contained (procedural 3D in Three.js and vector SVG Data URIs in HTML). No 404 or missing asset risks exist.
- Both projects use standard, reliable CDNs (Three.js r128, Tailwind CSS, Chart.js) that are supported across modern mobile and desktop browsers.

---

## 4. Conclusion

- **`fiddler-crab/` (R2)**:
  - Ready for implementation of unified controls (WASD + Arrows + Pointer-captured virtual buttons + Canvas touch swipe).
  - Ready for modal refactoring: fixed backdrop settlement modal showing survival time, food gathered, survival grade, and accurate cause of death.
- **`pepperedMoth/` (R3)**:
  - Ready for integration of "Predator Mode (天敵捕食者模式)": 15-second generation timer, bird crosshair cursor, click peck visual effect, Web Audio synthesized peck sound, round-by-round predation settlement, and dual-dataset evolutionary line chart.
- Both projects can be completed and verified without any external assets or architectural risks.

---

## 5. Verification Method

1. **Syntax & Static Integrity**:
   - Run `node -c fiddler-crab/fiddler-crab.js` → must exit 0.
   - Run syntax check on `pepperedMoth/index.html` inline script → must exit 0.
2. **Local HTTP Server & Headless Loading**:
   - Run `python3 -m http.server 8000` and fetch `http://localhost:8000/fiddler-crab/index.html` and `http://localhost:8000/pepperedMoth/index.html` → HTTP 200 with zero 404 resource errors.
3. **Interactive Verification Checklist**:
   - `fiddler-crab/`:
     - Test pressing WASD and Arrow keys → crab moves accordingly.
     - Test virtual buttons: press and drag out → crab stops moving cleanly when released outside.
     - Test touch swipe / drag on canvas → crab moves in swipe direction.
     - Test death by predator vs starvation → settlement modal appears centered with dim backdrop, accurate death reason, survival time, food collected, and functioning restart button.
   - `pepperedMoth/`:
     - Toggle Predator Mode → 15-second countdown starts.
     - Hover over tree container → crosshair cursor displays.
     - Click moth → peck ripple animation, audio cue, and moth vanishes.
     - When timer reaches 0 → round settlement summary displays surviving counts.
     - Advance generations → Chart.js renders evolutionary line chart showing generational shifts.

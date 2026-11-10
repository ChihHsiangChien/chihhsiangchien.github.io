# Handoff Report: MicroDefend Codebase & Architecture Investigation

**Agent**: Explorer 1 (Codebase & Architecture Explorer)  
**State Folder**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\`  
**Date**: 2026-11-10  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **File Inventory & Assets**:
   - `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend` contains exactly three source files:
     - `index.html` (29,862 bytes, 442 lines)
     - `script.js` (261,161 bytes, 5,432 lines)
     - `style.css` (14,109 bytes, 671 lines)
   - Verified via PowerShell `Get-ChildItem -Path "c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend" -Force`. No local image (`.png`, `.jpg`), audio, or font files exist. All biological structures, cells, and instruments are rendered procedurally via SVG vector paths and CSS.

2. **SVG ViewBox & Dimensions**:
   - Observed in `index.html:179`:
     ```html
     <svg id="inflammation-viz" viewBox="0 -65 1000 565" xmlns="http://www.w3.org/2000/svg">
     ```
   - Coordinate space: horizontal $x \in [0, 1000]$ (width = 1000), vertical $y \in [-65, 500]$ (height = 565).
   - Pan and zoom are applied to `<g id="viewport-group" transform="matrix(scale 0 0 scale panX panY)">` (`script.js:430`).

3. **Page 1 Initial Lymphatic Capillary (微淋巴管) Geometry**:
   - Observed in `index.html:356-367`:
     ```html
     <g id="lymphatic-vessel-group">
         <path id="lymph-capillary-lumen" d="M 1000 248 C 940 248, 900 256, 868 268 C 900 280, 940 288, 1000 288 Z"
             fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" stroke-width="1.8" stroke-dasharray="6,3" />
         <path d="M 910 252 C 915 258, 920 262, 925 264" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
         <path d="M 950 250 C 955 256, 960 260, 965 263" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
         <path d="M 910 284 C 915 278, 920 274, 925 272" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
         <path d="M 950 286 C 955 280, 960 276, 965 273" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
         <g id="lymph-flow-indicators" opacity="0.75">
             <polygon points="940,268 930,263 930,273" fill="#34d399" opacity="0.7" />
             <polygon points="975,268 965,263 965,273" fill="#34d399" opacity="0.7" />
         </g>
     </g>
     ```
   - Blind-end apex is at $(x = 868, y = 268)$.
   - Right exit aperture at $x = 1000$ spans vertically from $y = 248$ to $y = 288$ (height = $40\text{px}$, centerline $y = 268$).
   - Flow indicators point rightward: polygon points `(930, 263)` to `(940, 268)` to `(930, 273)`.

4. **Lymphatic Entity Flow Dynamics**:
   - `script.js:162-163`: `const LYMPH_VESSEL_X = 885; const LYMPH_VESSEL_Y = 268;`
   - `script.js:276-278`: Migrating APC target is `cell.targetLymphX = 876 + Math.random() * 28; cell.targetLymphY = 268 + (Math.random() - 0.5) * 22;`
   - `script.js:4817-4826`: Inside lymphatic lumen, APCs move rightward:
     `w.x += (w.flowSpeed || 2.0) * simSpeed;`
     `w.y += (LYMPH_VESSEL_Y - w.y) * 0.05 * simSpeed;`
     Fades out and triggers lymph node activation when `w.x >= 995`.
   - `script.js:3636-3652`: Bacteria in initial lymphatic lumen move rightward with velocity $(1.9 + \text{rand} \times 0.4) \times \text{simSpeed}$ centered at $y = 268$, activating lymph node when reaching $x \ge 995$.
   - `script.js:3860-3875`: Viruses follow the same rule ($v_x \approx 2.1 \times \text{simSpeed}, y \to 268, x \ge 995$).
   - `script.js:2899-2910`: Interstitial fluid droplets inside lumen flow with $v_x = (1.9 + 0.5 \cdot \text{isEdema}) \times \text{simSpeed}$, centered at $y = 268$, disappearing at $x \ge 1002$.

5. **Animation Loop & Object Pooling Engine**:
   - `script.js:5039-5052`: Loop is implemented strictly with `requestAnimationFrame(animate)`.
   - Speed accumulator: `speedAccum += simSpeed; while (speedAccum >= 1.0 && steps < 2) { speedAccum -= 1.0; stepSimulation(); steps++; }`
   - Zero-allocation SVG pools (`script.js:2174-2220`): 11 distinct pools (`dropletPool`, `bleedPool`, `debrisPool`, `bacPool`, `virPool`, `parPool`, `chemDotPool`, `abPool`, `wbcSpherePool`, `wbcAmoebaPool`, `labelPool`).
   - Each frame calls `resetAllSvgPools()`, re-uses or allocates pool elements, mutates attributes directly, and calls `finalizeAllSvgPools()` to set `style.display = 'none'` on unused elements.

---

## 2. Logic Chain

1. **Spatial Continuity (Page 1 $\to$ Page 2)**:
   - *From Observation 3 & 4*: Page 1's initial lymphatic capillary exits the canvas at the right boundary $x = 1000$, with its lumen between $y = 248$ and $y = 288$ (centerline $y = 268$). All lymph fluid, bacteria, viruses, and APCs flow from left to right ($+X$ direction) toward this exit.
   - *Therefore*: Page 2's primary afferent lymphatic vessel (輸入淋巴管) must have its entry port at the left boundary $x = 0$, with its upper wall starting at $(0, 248)$, lower wall starting at $(0, 288)$, and centerline at $y = 268$.
   - *Therefore*: Pathogens, fluid droplets, and APCs enqueued as they exit Page 1 ($x \ge 995, y \approx 268$) can immediately spawn on Page 2 at $(x = 0, y = 268)$ with identical dimensions and flow vector, creating complete anatomical and visual continuity.

2. **Rendering Engine Scalability**:
   - *From Observation 5*: `microDefend` maintains $60\text{ FPS}$ by using zero-allocation SVG object pooling, mutating existing DOM nodes rather than executing DOM `createElement`/`remove` cycles.
   - *Therefore*: For Pages 2, 3, and 4, this exact pooling architecture must be preserved. Each page should have its own container `<g id="page-N-scene">` toggled via `style.display = 'none'/'block'`, and entity pools should be either scoped per page or managed by a unified scene pool manager to prevent cross-scene DOM node pollution.

3. **Animation Performance & Cleanup**:
   - *From Observation 5*: Currently, `animate()` runs continuously without `cancelAnimationFrame`, and there is no pause state (`simSpeed = 0`).
   - *Therefore*: In multi-page architecture, a page switcher dispatcher should be introduced where the master `stepSimulation()` only updates and renders the active page, thereby preventing hidden pages from consuming GPU/CPU cycles.

---

## 3. Caveats

1. **Shared vs Independent Viewport Matrix**: Currently, user pan and zoom are stored in global variables `panX`, `panY`, and `scale`. When switching pages, whether pan/zoom resets to default or is preserved per page should be an explicit design decision (recommending resetting to default 1.0x view on scene switch so the entire anatomical organ is immediately visible).
2. **Offline Local Simulation**: The codebase is strictly client-side vanilla JavaScript without build systems (no Webpack, Vite, or Babel). All additions must remain 100% vanilla JavaScript, HTML, and CSS without external dependencies.
3. **Primary vs Secondary Response Default**: In Page 1, `vaccineState` toggles default to `false` for teaching clarity. Page 2 should similarly default to primary response upon first entry, allowing manual toggle or automated progression through germinal center clonal selection.

---

## 4. Conclusion

1. **Coordinate & Spatial Blueprint**: Page 1's micro-lymphatic capillary ends at $(1000, 248 \sim 288)$, centerline $y = 268$, flowing rightward. Page 2's primary afferent lymphatic vessel must enter at $(0, 248 \sim 288)$, centerline $y = 268$, flowing rightward into the lymph node subcapsular sinus.
2. **Animation Loop**: 100% `requestAnimationFrame` with zero-allocation SVG pooling. Multi-scene expansion must maintain this pooling pattern and use scene-level DOM visibility toggling (`display: 'none'`) to guarantee high performance and avoid memory leaks.
3. **Full Analysis Delivery**: Comprehensive architectural details, coordinates, entity state tables, and recommendations are documented in `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\report.md`.

---

## 5. Verification Method

1. **Verify Files and Line Numbers**:
   - Inspect SVG geometry in `microDefend/index.html` lines 356–367 to verify path `d="M 1000 248 C 940 248, 900 256, 868 268 C 900 280, 940 288, 1000 288 Z"`.
   - Inspect lymphatic variables in `microDefend/script.js` lines 162–163 to verify `LYMPH_VESSEL_X = 885; LYMPH_VESSEL_Y = 268;`.
   - Inspect the animation loop in `microDefend/script.js` lines 5039–5052 to verify `requestAnimationFrame(animate)` and accumulator pattern.
2. **Verify SVG Pool Execution**:
   - Inspect `resetAllSvgPools()` and `finalizeAllSvgPools()` in `microDefend/script.js` lines 2186–2220 to confirm zero-allocation pooling.
3. **Invalidation Conditions**:
   - If `viewBox` is modified from `0 -65 1000 565`, coordinate mapping must be recalculated.
   - If `lymph-capillary-lumen` path is altered, Page 2 afferent vessel entry coordinates must be adjusted to match.

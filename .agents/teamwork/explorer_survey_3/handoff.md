# Handoff Report — Explorer Survey 3

**Agent**: Explorer 3 (`teamwork_preview_explorer`)  
**Scope**: Codebase survey for `lens-optical/` (R4), `greatFossil/` (R5), `blood-stream/` (R6), `rt/` (R7), and console error analysis.  
**Destination**: Orchestrator / Implementers  
**Working Directory**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_3`  
**Detailed Survey File**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_3/survey_report.md`

---

## 1. Observation

1. **`lens-optical/index.html`**:
   - Lines 181-193: Optical parameters in `state` include `mObj_spec` (4 or 10), `fEye_mm` (25), `distVision_mm` (250), `objH_mm` (10), `stage_x_offset` (0), `scale` (1.35), `iip_fixed_x` (205 mm, DIN 160 mm tube length standard).
   - Lines 257-279: Real-time calculation computes $f_{\text{obj}} = 160 / m_{\text{Obj\_spec}}$, $u_{\text{ideal}} = 1 / (1 / f_{\text{obj}} - 1 / 160)$, actual $u$, actual $v$, $m_1$, and total magnification $M_{\text{total}} = m_1 \times m_2$.
   - Lines 314-362: Ray tracing renders red parallel ray through focus, blue center ray through lens optical center, eyepiece refraction, and yellow dashed virtual image backtrace.
   - Lines 366-383: Viewfinder `#viewfinderCanvas` renders inverted image (`vfCtx.rotate(Math.PI)`) with blur filter based on focus error.
   - Observation: No aperture (光圈) parameter currently exists in `state`; no preset buttons or explanatory hints for students exist.

2. **`greatFossil/`**:
   - `greatFossil/index.html` line 6: `<link rel="stylesheet" href="../css/style.css" />` resolves to `/css/style.css` (root homepage CSS), which has zero rules for `.large-button`, `#canvas`, `#score`, `#timer`, `.container`.
   - `greatFossil/index.html` line 7: `</style>` is an orphaned closing tag with no preceding `<style>`.
   - `greatFossil/index.html` line 10: `<title>化石大發現</title>` is nested inside `<body>`.
   - `greatFossil/js/globalVariables.js` lines 62-63:
     ```javascript
     var correctSound = new Audio("../sound/correct.mp3");
     var wrongSound = new Audio("../sound/wrong.mp3");
     ```
     `/sound/` does not exist in root directory. Verified via `find_by_name`: target files reside at `cardGame/sound/correct.mp3` and `cardGame/sound/wrong.mp3`.
   - `greatFossil/js/utils.js` lines 8 and 508: `//drawAnswerBox();` is commented out, leaving the canvas categories completely blank.
   - `greatFossil/js/globalVariables.js` lines 2-3: `canvas.width = window.innerWidth * 0.9; canvas.height = window.innerHeight * 0.75;` with no resize listener.
   - Verified 21 images (`images/1.png` to `images/21.png`) exist in `greatFossil/images/`.

3. **`blood-stream/`**:
   - `blood-stream/index.html` loads Three.js r128 and Cannon.js 0.6.2.
   - `blood-stream/main.js` line 6: `const particleCount = 200;` is hardcoded.
   - `blood-stream/main.js` lines 247-276: Particles created with `SphereGeometry(0.5, 16, 16)` and `CANNON.Sphere(0.5)`.
   - `blood-stream/main.js` lines 409-457: `updateValves()` applies radial restorative force ($-1500 \cdot \hat{r}$) if $r > \text{tubeRadius}$, and stops particles moving in $+Z$ direction (backflow) at valve boundaries.
   - `blood-stream/main.js` lines 278-308: Valve meshes are static single-box geometries (`BoxGeometry(6, 5.6, 0.2)`).
   - `blood-stream/style.css` lines 30, 34-37, 39, 42, 45: `@apply` is used inside a raw CSS file loaded via `<link>`, which native browsers drop as invalid syntax.

4. **`rt/`**:
   - `rt/app.js` lines 288-344: `runOneTrial()` handles foreperiod, target onset with `requestAnimationFrame`, timeout timer, and Web Audio API `beeper.beepAt()`.
   - `rt/app.js` lines 346-413: `handlePointer()` records false alarms during foreperiod, and reaction time $RT = \text{nowMs}() - \text{actualOnset}$ on target phase.
   - `rt/app.js` lines 470-486: `exportCSV()` is implemented and bound to `#btn-export` and `#btn-export-2`.
   - `rt/index.html` lines 87-94: `#resultsPanel` contains `#summary`, `#btn-export-2`, and `#rawData`. There is NO "複製結果文字" (Copy Result Text) button.

5. **Console & System Checks**:
   - `check_unlinked_projects.py` run result:
     - 30 unlinked top directories (including `blood-stream`, `greatFossil`, `lens-optical`, `rt`).
     - Typo detected at `index.html` line 215 (`href=" cardGame/分類_動物圖卡的分類_分類/index.html"`).
   - `node --check` passed for all JS files in `greatFossil`, `blood-stream`, `rt`.
   - Python DOM ID cross-check confirmed all IDs in JS exist in HTML.

---

## 2. Logic Chain

1. **`lens-optical/`**:
   - Because the simulation engine already computes DIN 160 mm optics and ray paths dynamically upon calling `render()`, adding preset scenario buttons requires only setting specific state parameters (`mObj_spec`, `stage_x_offset`, new `aperture`) and triggering `render()`.
   - Because the requirement asks to demonstrate "倒立放大實像（物鏡）" and "目鏡二次放大", highlighting the intermediate image plane and virtual image ray paths directly fulfills the educational objective.
   - Because stopping down an aperture physically narrows the ray bundle, reduces blur for out-of-focus rays, and lowers luminance, introducing an `aperture` factor (e.g. 0.2 to 1.0) into `renderViewfinder()` (blur scaling and brightness reduction) provides a scientifically accurate simulation of aperture and depth of field.

2. **`greatFossil/`**:
   - Because `../css/style.css` resolves to root `/css/style.css` without card game classes, the game appears unstyled. Linking to a scoped `style.css` containing `#canvas`, `#score`, `#timer`, `.large-button`, and `.container` restores the visual styling.
   - Because `../sound/correct.mp3` resolves to a non-existent root folder, audio playback fails with 404 network errors. Updating to `../cardGame/sound/correct.mp3` resolves the 404 errors.
   - Because `drawAnswerBox()` is commented out, students cannot see the target categories. Uncommenting `drawAnswerBox()` in `redrawCanvas()` and `start()` renders the category grid.
   - Because `.container` lacked `flex-wrap: wrap` and `gap`, buttons overlapped on mobile screens (<400px). Adding flex wrapping and mobile padding prevents layout collapse.

3. **`blood-stream/`**:
   - Because particle count (200) and geometry detail ($16 \times 16$) are fixed, low-end mobile devices experience frame drops. Creating a `setParticleQuality(count, segments)` function that tears down old bodies/meshes and spawns new ones allows instant toggling between Low (80), Medium (200), and High (400) without breaking simulation state.
   - Because valve physics already stops backflow in $Z > 0$, adding a subtle flap rotation ($25^\circ \sim 35^\circ$) when fluid flows forward in $-Z$ provides anatomically accurate open/close visuals without modifying collision logic.

4. **`rt/`**:
   - Because `app.js` already aggregates results in `computeSummaryByCondition(rows)` and displays them in `#summary`, formatting this structured data into a plain text report and writing to `navigator.clipboard.writeText()` directly provides the requested "複製結果文字" feature for student worksheets.

---

## 3. Caveats

1. **HTTP Server Requirement for `rt/`**:
   - `rt/app.js` uses `fetch('./config/ControlA.json')`. Browsers enforce CORS policies on `file://` URLs. The application runs as expected when served via an HTTP server (e.g. `python3 -m http.server` or GitHub Pages).
2. **Web Audio User Gesture**:
   - Browsers require user interaction before playing audio in Web Audio API. `rt/app.js` already unlocks `beeper.ensureCtx()` on `#btn-start` click, so this is well accommodated.
3. **No Code Modification Performed**:
   - This task is strictly read-only investigation. No source code was modified. All recommendations are prepared for the implementation phase.

---

## 4. Conclusion

All four target projects (`lens-optical/`, `greatFossil/`, `blood-stream/`, `rt/`) have sound foundational logic but exhibit specific, clearly addressable gaps:
1. `lens-optical/`: Add 3 preset buttons ("倒立放大實像（物鏡）", "目鏡二次放大", "光圈縮小景深加深/視野變暗"), an explanatory text card, and aperture state integration.
2. `greatFossil/`: Fix HTML syntax (orphaned `</style>`, `<title>` location), fix broken CSS link, fix audio 404 paths, uncomment `drawAnswerBox()`, and apply RWD container styling.
3. `blood-stream/`: Add particle quality switcher (Low 80 / Med 200 / High 400), remove invalid CSS `@apply`, and add valve opening/closing flap tilt animation.
4. `rt/`: Add `#btn-copy-summary` ("複製結果文字") button and clipboard copy handler alongside the existing CSV export.
5. All 4 projects can then be linked into `index.html` under their respective curricular chapters ("顯微鏡", "演化", "循環", "神經與感覺").

---

## 5. Verification Method

To independently reproduce and verify the findings:
1. **Unlinked directories check**:
   ```bash
   python3 check_unlinked_projects.py
   ```
   Confirms `blood-stream`, `greatFossil`, `lens-optical`, and `rt` are currently unlinked.
2. **Audio and CSS link verification for `greatFossil`**:
   ```bash
   python3 -c '
   from pathlib import Path
   assert not Path("sound/correct.mp3").exists(), "sound/correct.mp3 does not exist in root"
   assert Path("cardGame/sound/correct.mp3").exists(), "cardGame/sound/correct.mp3 exists"
   '
   ```
3. **HTML tag validation**:
   Inspect line 7 of `greatFossil/index.html` to confirm orphaned `</style>`.
4. **Detailed survey documentation**:
   Inspect `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_3/survey_report.md`.

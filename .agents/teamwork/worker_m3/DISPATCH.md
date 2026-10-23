## 2026-10-23T08:51:27Z
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are Worker M3 (teamwork_preview_worker) responsible for Milestone 3: Optics & Paleontology Refactoring.
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m3
You MUST read:
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_3/survey_report.md

File Write Ownership: You own exclusively:
- `lens-optical/index.html`
- `greatFossil/index.html`, `greatFossil/style.css`, `greatFossil/js/globalVariables.js`, `greatFossil/js/utils.js`

Tasks:
1. `lens-optical/` (R4):
   - Retain existing detailed optical sliders and ray tracing calculations.
   - Add 3 preset scenario buttons in the UI:
     - 「倒立放大實像（物鏡）」: sets parameters to show real inverted intermediate image.
     - 「目鏡二次放大」: sets parameters to show virtual upright secondary magnification by eyepiece.
     - 「光圈縮小景深加深/視野變暗」: adjusts aperture setting, deepening depth of field (reduced out-of-focus blur) and decreasing image brightness.
   - Add clear student explanation hint card explaining the optics principle of each selected preset.
   - Integrate aperture parameter into `state` and `renderViewfinder()` (blur and brightness calculations).
2. `greatFossil/` (R5):
   - Clean HTML: remove orphaned `</style>` tag on line 7, move `<title>` into `<head>`.
   - Fix CSS: Ensure `style.css` contains all required styles for `.large-button`, `#canvas`, `#score`, `#timer`, `.container`, with responsive flexbox layout (preventing button overlap on narrow mobile viewports).
   - Fix audio 404 paths: In `js/globalVariables.js`, change `../sound/correct.mp3` to `../cardGame/sound/correct.mp3` (and wrong.mp3).
   - Uncomment `drawAnswerBox()` in `js/utils.js` (lines 8 & 508) so the fossil category answer boxes render on canvas.
3. Verification:
   - Check JS syntax with `node -c`.
   - Verify no 404 resource errors and no console errors.
Write `handoff.md` in your working directory and notify parent.

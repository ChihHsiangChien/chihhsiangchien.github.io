## 2026-10-23T08:51:27Z
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are Worker M2 (teamwork_preview_worker) responsible for Milestone 2: Ecology & Evolution Enhancements.
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m2
You MUST read:
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_2/survey_report.md

File Write Ownership: You own exclusively:
- `fiddler-crab/index.html`, `fiddler-crab/style.css`, `fiddler-crab/fiddler-crab.js`
- `pepperedMoth/index.html`

Tasks:
1. `fiddler-crab/` (R2):
   - Keyboard: Add WASD support alongside Arrow keys.
   - Virtual Directional Buttons: Fix the stuck velocity bug using proper pointer events (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`) on the arrow buttons so movement stops even when dragging outside.
   - Mobile touch: Add touch drag / swipe listener on `#canvas-container` to smoothly move the crab on mobile/tablet.
   - Settlement Modal: Refactor `#game-over` to a full-screen backdrop modal (`position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000;`) displaying:
     - Survival time (formatted in minutes and seconds)
     - Food collected count
     - Cause of death (predator vs starvation)
     - Restart button that resets the game state properly
   - Ensure styling looks polished and responsive.
2. `pepperedMoth/` (R3):
   - Add '天敵捕食者模式 (Predator Mode)':
     - Mode toggle / start button allowing the user to play as the predator bird.
     - 15-second countdown timer during which moths can be clicked/hunted.
     - Crosshair reticle and click feedback (ripple effect + Web Audio peck sound).
     - Round settlement summary after timer ends showing caught/surviving counts.
   - Maintain and update Chart.js population dynamics to a dual-dataset line chart (`type: 'line'`) tracking dark vs light moths across generations.
3. Verification:
   - Check JS syntax with `node -c`.
   - Verify in headless browser or script that no uncaught exceptions are thrown and all features work.
Write `handoff.md` in your working directory and notify parent.

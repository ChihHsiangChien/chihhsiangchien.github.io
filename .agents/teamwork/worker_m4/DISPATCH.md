## 2026-10-23T08:51:27Z
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are Worker M4 (teamwork_preview_worker) responsible for Milestone 4: Hemodynamics & Neuro-Inquiry.
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m4
You MUST read:
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_3/survey_report.md

File Write Ownership: You own exclusively:
- `blood-stream/index.html`, `blood-stream/style.css`, `blood-stream/main.js`
- `rt/index.html`, `rt/app.js`, `rt/style.css`

Tasks:
1. `blood-stream/` (R6):
   - In `style.css`, remove invalid `@apply` Tailwind directives that native browsers reject in raw CSS.
   - Add particle quality / count switcher (slider or Low 80 / Medium 200 / High 400 buttons) in the UI controls.
   - In `main.js`, implement dynamic particle count recreation: disposing old geometries/materials and spawning the chosen count of particles so low-end mobile devices run smoothly.
   - Add anatomical valve flap animation: dynamically tilt valve flaps open during forward flow (-Z direction) and close firmly when stopping backflow, preserving physical collision and visual accuracy.
2. `rt/` (R7):
   - In `rt/index.html`, add a "複製結果文字" (Copy Result Text) button (`#btn-copy-summary`) alongside the existing CSV export button in `#resultsPanel`.
   - In `rt/app.js`, implement the copy function using `navigator.clipboard.writeText()` (with fallback) to copy formatted test summary statistics (mean RT, false alarm rate, condition breakdown) for students' inquiry worksheets.
3. Verification:
   - Run `node -c` on modified JS files.
   - Verify UI elements exist and no uncaught exceptions are thrown.
Write `handoff.md` in your working directory and notify parent.

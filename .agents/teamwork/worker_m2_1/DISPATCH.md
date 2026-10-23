## 2026-10-23T09:50:24Z

You are Worker M2.1 for Round 2 Milestone 2.1: Cell-3D Unified Suite (Requirement R1).
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m2_1/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the authoritative user request at:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
Pay special attention to '## Follow-up — 2026-10-23T09:35:29Z' and requirement R1 ('cell-3d/').
Also read PROJECT.md at:
/home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
And review Survey Explorer 1's detailed findings:
- Report: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_1/survey_report.md
- Handoff: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_1/handoff.md

Files you own exclusively:
- `cell-3d/index.html`
- `cell-3d/style.css`
- `cell-3d/main.js` (and any modular model JS files in `cell-3d/`)
- Optional upgrade redirect links in `threeJsModel/index.html`, `3Dcell/index.html`, `insideTheCell/index.html`

Your implementation tasks for `cell-3d/`:
1. Build `cell-3d/index.html`, `cell-3d/style.css`, and procedural 3D models using Three.js r160 via `<script type="importmap">`:
   - Tab 1: 動物細胞全景 (Animal Cell Panorama) with toggleable 1/4 wedge cutaway (clipping planes) showing Nucleus, Mitochondria capsules, ER tori, Golgi cylinder stacks, Lysosomes, and Centrioles.
   - Tab 2: 粒線體雙層膜剖面 (Mitochondria 3D) with outer & inner membranes, procedural CatmullRomCurve3 cristae folds, matrix, and circular mtDNA.
   - Tab 3: 葉綠體構造與葉綠餅剖面 (Chloroplast 3D) with outer & inner envelopes, grana thylakoid disc stacks, stroma lamellae, and stroma.
   - Tab 4: 雙凹紅血球 (RBC 3D) with mathematical biconcave disk BufferGeometry and glossy MeshPhysicalMaterial.
   - Tab 5: 細胞膜流體鑲嵌模型 (Cell Membrane 3D) with dual-tail phospholipid bilayer, transmembrane protein channels, peripheral proteins, glycoproteins, and cholesterol.
2. Interface & Controls:
   - Modern tab switcher (5 tabs).
   - Glassmorphic floating explanation cards in Traditional Chinese with organelle names, biological functions, and curriculum facts.
   - Camera reset button, auto-rotate toggle, and wedge cutaway toggle for cell panorama.
   - Smooth OrbitControls with mouse drag and mobile touch gesture support (touch-action: none on canvas).
3. Verification:
   - Verify that there are 0 external asset 404s (100% procedural models).
   - Test in headless chromium or node to ensure 0 syntax errors and 0 uncaught exceptions.
   - Write your implementation report to `handoff.md` in your working directory.
4. Send a completion message back to the orchestrator.

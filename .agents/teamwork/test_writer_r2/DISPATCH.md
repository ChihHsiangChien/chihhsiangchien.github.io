## 2026-10-23T09:50:29Z
You are Test Writer for Round 2 E2E Testing Track (Requirement Milestone 2.5).
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/test_writer_r2/

You MUST read the authoritative user request at:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
Pay special attention to '## Follow-up — 2026-10-23T09:35:29Z' and all Acceptance Criteria for Round 2.
Also read PROJECT.md at:
/home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
And review existing test suite at `tests/test_e2e_suite.py` and `TEST_INFRA.md`.

Files you own exclusively:
- `tests/test_round2_suite.py`
- `TEST_INFRA.md` (append Round 2 test architecture)
- `TEST_READY.md` (update coverage for Round 2)

Your task:
1. Design and implement a comprehensive, automated 4-tier E2E test suite in `tests/test_round2_suite.py`:
   - **Tier 1: Feature Coverage (>=5 tests per feature)**:
     * F1-F7 (cell-3d): index exists, Three.js loads, 5 tabs exist, cutaway toggle, camera reset, Traditional Chinese cards, WebGL render container.
     * F8-F11 (foodChain & foodWeb): dual-mode tabs exist, Mode 1 canvas & controls exist, wolf/sheep/grass entities spawn, Mode 2 Chart.js container exists, Lotka-Volterra formula stability.
     * F12-F14 (energyPyramid): 4 tiers exist, card deck exists, Web Audio oscillator functions exist, 10% calculation accurately scales (10000 -> 1000 -> 100 -> 10 J), heat dissipation (90%) displayed.
     * F15-F16 (OmNomNom): rules button & modal exist, dice button & roll listener exist, 9-tile board exists, pawn movement state exists.
     * F17-F19 (index.html & links): cell-3d mounted under 細胞, foodChain/energyPyramid/OmNomNom mounted under 生態系, zero broken links in check_unlinked_projects.py.
   - **Tier 2: Boundary & Corner Cases (>=5 tests per feature)**:
     * Zero or negative energy input handling in energyPyramid.
     * Large scale energy input handling (e.g. 1,000,000 J).
     * Rapid tab switching in cell-3d and foodChain without animation loop leaks.
     * Rapid dice clicking in OmNomNom without state corruption.
     * Extreme population conditions in foodWeb without NaN or -Infinity.
   - **Tier 3: Cross-Feature Combinations**:
     * Navigation flow from index.html -> each module -> back to index.html.
     * Shared asset integrity (zero 404s, audio synthesizers, CDN libraries).
   - **Tier 4: Real-World Student Inquiry Scenarios**:
     * Full student learning session simulation for cell-3d (exploring organelles).
     * Full student simulation for energyPyramid (calculating Lindeman 10% energy flow).
     * Full gameplay session for OmNomNom (opening rules, rolling dice, landing on food chain tiles).
2. Execute the test runner (or simulate testing against current disk files) and update `TEST_READY.md` once complete.
3. Write your implementation report to `handoff.md` in your working directory.
4. Send a completion message back to the orchestrator.

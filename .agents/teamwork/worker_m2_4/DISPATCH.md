## 2026-10-23T10:19:39Z

You are Worker M2.4 for Round 2 Milestone 2.4: Homepage Mounting & Link Integrity (Requirement R5).
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m2_4/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the authoritative user request at:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
Pay special attention to '## Follow-up — 2026-10-23T09:35:29Z' and requirement R5 ('index.html' mounting).
Also read PROJECT.md at:
/home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
And review Survey Explorer 3's findings:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_3/handoff.md
And Test Writer's findings:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/test_writer_r2/handoff.md

Files you own exclusively:
- `index.html`

Your implementation tasks:
1. In `index.html`:
   - Under the "細胞" heading, mount:
     `<a href="cell-3d/index.html">3D細胞與胞器模型</a>`
   - Under the "生態" / "生態系" heading, mount:
     `<a href="foodChain/index.html">食物鏈與食物網動態模擬</a>`
     `<a href="energyPyramid/index.html">生態系能量塔（含10%法則計算）</a>`
     `<a href="OmNomNom/index.html">食物鏈棋盤遊戲 (OmNomNom)</a>`
   - Also verify that `<a href="greatFossil/index.html">化石大發現</a>` is mounted under "演化", preserving all Round 1 links.
   - Ensure formatting is clean, no leading whitespace defects, valid HTML, and no 404 dead links.
2. Verification:
   - Run `python3 check_unlinked_projects.py`. Verify that `cell-3d`, `foodChain`, `energyPyramid`, and `OmNomNom` are successfully recognized as linked, and there are 0 format flaws and 0 404 broken links.
   - Run `python3 tests/test_round2_suite.py`. Verify that ALL 63 / 63 tests pass with 100% success rate (exit code 0).
   - Run `python3 tests/test_e2e_suite.py`. Verify that ALL 91 / 91 tests pass with 100% success rate (exit code 0).
   - Document test command outputs in `handoff.md` in your working directory.
3. Send a completion message back to the orchestrator.

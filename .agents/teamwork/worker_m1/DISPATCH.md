## 2026-10-23T08:51:27Z
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are Worker M1 (teamwork_preview_worker) responsible for Milestone 1: Homepage Mounting & Syntax Fix.
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m1
You MUST read:
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
- /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_1/survey_report.md

File Write Ownership: You own `/home/pancala/Documents/chihhsiangchien.github.io/index.html` exclusively. Do NOT edit any other file.

Tasks:
1. Fix line 215 in `index.html`: remove the leading space so `href=" cardGame/分類_動物圖卡的分類_分類/index.html"` becomes `href="cardGame/分類_動物圖卡的分類_分類/index.html"`. Verify no other whitespace defects exist in href attributes.
2. Mount the 7 target projects to their designated chapters in `index.html` using the existing `<a href="...">Title</a>` style:
   - `fiddler-crab/index.html` -> under 「生態系」or「動物的行為」 (e.g. `<a href="fiddler-crab/index.html">招潮蟹生存模擬</a>`)
   - `pepperedMoth/index.html` -> under 「演化」 (e.g. `<a href="pepperedMoth/index.html">胡椒蛾天擇模擬之戰</a>`)
   - `lens-optical/index.html` -> under 「顯微鏡」 (e.g. `<a href="lens-optical/index.html">顯微鏡光學工程模擬</a>`)
   - `greatFossil/index.html` -> under 「演化」 (e.g. `<a href="greatFossil/index.html">化石大發現</a>`)
   - `blood-stream/index.html` -> under 「循環」 (e.g. `<a href="blood-stream/index.html">3D 動態瓣膜血流模擬</a>`)
   - `rt/index.html` -> under 「神經」 (e.g. `<a href="rt/index.html">反應時間探究</a>`)
   - `cardGame/消化_消化管_順序/index.html` -> under 「動物獲得養分」/「消化」 (e.g. `<a href="cardGame/消化_消化管_順序/index.html">消化器官順序卡牌</a>`)
3. Verification:
   - Run `python3 check_unlinked_projects.py`.
   - Verify that all 7 target directories are no longer in the unlinked list.
   - Verify that ⚠️ formatting defects is completely gone.
   - Verify that ❌ broken links is 0.
Write `handoff.md` in your working directory and notify parent.

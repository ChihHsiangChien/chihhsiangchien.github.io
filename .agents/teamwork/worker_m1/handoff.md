# Milestone 1: Homepage Mounting & Syntax Fix — Handoff Report

## 1. Observation
- Baseline verification before changes:
  Running `python3 check_unlinked_projects.py` produced:
  ```
  • index.html 有效內部連結數: 172
  • 一級目錄總數: 159
    ├── 已連結之一級目錄: 128
    └── 未被連結之一級目錄: 31
  • 全專案未被連結之 HTML 檔案數: 104

  ⚠️ 發現可能有格式瑕疵的連結（如前後包含多餘空格）：
     - href=' cardGame/分類_動物圖卡的分類_分類/index.html' (標題: 分類動物圖卡)
  ```
  with `blood-stream`, `fiddler-crab`, `greatFossil`, `lens-optical`, `pepperedMoth`, and `rt` in the unlinked top directories list, and `cardGame/消化_消化管_順序/index.html` in the unlinked HTML list.
- In `index.html`:
  - Line 215 had `<a href=" cardGame/分類_動物圖卡的分類_分類/index.html">分類動物圖卡</a>` with a leading space inside the `href` attribute.
  - No other `<a>` tag had leading/trailing whitespace in its `href` attribute.
  - The 7 target projects existed on disk at:
    - `fiddler-crab/index.html`
    - `pepperedMoth/index.html`
    - `lens-optical/index.html`
    - `greatFossil/index.html`
    - `blood-stream/index.html`
    - `rt/index.html`
    - `cardGame/消化_消化管_順序/index.html`
- Modifications made exclusively to `/home/pancala/Documents/chihhsiangchien.github.io/index.html`:
  - Fixed line 215: removed leading space in `href="cardGame/分類_動物圖卡的分類_分類/index.html"`.
  - Added `<a href="lens-optical/index.html">顯微鏡光學工程模擬</a>` under `<h1>顯微鏡</h1>` after `aperture-sim/index.html`.
  - Added `<a href="cardGame/消化_消化管_順序/index.html">消化器官順序卡牌</a>` under `<h1>動物獲得養分</h1>` after `digest-game/`.
  - Added `<a href="blood-stream/index.html">3D 動態瓣膜血流模擬</a>` under `<h1>循環</h1>` after `lymphatic-system/index.html`.
  - Added `<a href="rt/index.html">反應時間探究</a>` under `<h1>神經</h1>` after `反應時間 (scratch)`.
  - Added `<a href="greatFossil/index.html">化石大發現</a>` and `<a href="pepperedMoth/index.html">胡椒蛾天擇模擬之戰</a>` under `<h1>演化</h1>` after `fossils/index.html`.
  - Added `<a href="fiddler-crab/index.html">招潮蟹生存模擬</a>` under `<h1>生態系</h1>` after `大魚吃小魚的arcade game`.

## 2. Logic Chain
1. Removing the single leading space in `cardGame/分類_動物圖卡的分類_分類/index.html` resolved the only `typo_links` entry flagged by `check_unlinked_projects.py`.
2. Mounting the 6 top-level directory entries (`lens-optical`, `blood-stream`, `rt`, `greatFossil`, `pepperedMoth`, `fiddler-crab`) directly linked their directories and entry HTML files into `index.html`, which adds their paths and parent directories to `linked_set`.
3. Mounting `cardGame/消化_消化管_順序/index.html` directly linked that specific cardGame submodule HTML file into `index.html`.
4. As a result, the internal link count increased by 7 (from 172 to 179), linked top-level directories increased by 6 (from 128 to 134), unlinked top directories decreased by 6 (from 31 to 25), unlinked HTML files decreased by 7 (from 104 to 97), typo links dropped to 0, and broken links remained 0.

## 3. Caveats
- No other files outside `index.html` were modified by Worker M1. Notice that `fiddler-crab/index.html` was concurrently modified by another worker according to repository status; Worker M1 did not alter or revert that file.

## 4. Conclusion
Milestone 1 is completely satisfied:
- Line 215 leading whitespace defect in `index.html` is fixed.
- All 7 target standalone projects are cleanly mounted under their respective curriculum sections in `index.html`.
- Verification confirms 0 formatting defects, 0 broken links, and none of the 7 target projects remain in the unlinked list.

## 5. Verification Method
Run the project link checker:
```bash
python3 check_unlinked_projects.py
```
Expected output:
- `• index.html 有效內部連結數: 179`
- `• 未被連結之一級目錄: 25` (none of `blood-stream`, `fiddler-crab`, `greatFossil`, `lens-optical`, `pepperedMoth`, `rt` appear in the list)
- `全專案未被連結之 HTML 檔案數: 97` (no `cardGame/消化_消化管_順序/index.html`)
- No `⚠️ 發現可能有格式瑕疵的連結` section
- No `❌ 發現可能的死連結` section

Programmatic check:
```bash
python3 -c '
from pathlib import Path
import check_unlinked_projects as cup

raw_links, broken_links, typo_links = cup.parse_index_links(Path("index.html"))
assert len(typo_links) == 0, f"Found typo links: {typo_links}"
assert len(broken_links) == 0, f"Found broken links: {broken_links}"
targets = [
    "fiddler-crab/index.html",
    "pepperedMoth/index.html",
    "lens-optical/index.html",
    "greatFossil/index.html",
    "blood-stream/index.html",
    "rt/index.html",
    "cardGame/消化_消化管_順序/index.html"
]
for t in targets:
    assert str(Path(t)) in raw_links, f"Target not linked: {t}"
print("All verification assertions passed.")
'
```

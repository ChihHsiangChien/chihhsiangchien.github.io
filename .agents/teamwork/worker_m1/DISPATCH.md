## 2026-11-10T01:04:04Z
You are Worker 1 (teamwork_worker) implementing Milestone 1: Multi-Tab Navigation Framework & Page 2 (Lymph Node Scene).

Original User Request: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md (Follow-up — 2026-11-10T00:42:23Z)
Master Project Plan: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\PROJECT.md
Working Directory: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend
Your State Folder: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
- Explorer 1 Architecture & Geometry Report: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\report.md
- Explorer 2 Anatomical & Visual Style Report: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_2\report.md
- Test Spec: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\TEST_READY.md and c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\TEST_INFRA.md

Your Scope for Milestone 1:
1. Multi-Tab Navigation Framework in `microDefend/index.html` & `style.css`:
   - Add `<nav class="tabs-nav">` with 4 tab buttons:
     * Tab 1: 第一道與第二道防線（組織微循環與發炎反應） (id: `tab-btn-1` or `data-tab="tab-1"`)
     * Tab 2: 淋巴結專一性免疫反應（輸入/輸出淋巴管、抗原呈現與細胞活化） (id: `tab-btn-2` or `data-tab="tab-2"`)
     * Tab 3: 淋巴總管與靜脈匯流（淋巴注入血液循環、靜脈瓣防逆流） (id: `tab-btn-3` or `data-tab="tab-3"`)
     * Tab 4: 骨髓造血與免疫記憶（長壽漿細胞工廠、造血幹細胞分化、中性球儲存庫） (id: `tab-btn-4` or `data-tab="tab-4"`)
   - Style tabs in `style.css` with active highlights, badges, and responsive wrapping matching dark aesthetic (`#0f172a`, `#1e293b`).
   - Tab 1 SVG container can remain `#viz-tab-1` (or `#inflammation-viz` wrapped or aliased to `#viz-tab-1`).
   - Create container for `#viz-tab-2` (SVG with viewBox `0 -65 1000 565` or `0 0 1000 600`).
2. Tab 2 SVG Scene & Anatomical Architecture:
   - Primary afferent vessel (輸入淋巴管):
     * MUST enter at the left boundary `x = 0, y = 248..288` (center `y = 268`, width 40), fill `rgba(16, 185, 129, 0.18)`, stroke `#10b981`, stroke-width `1.8`, stroke-dasharray `6,3`, with rightward flow arrows (`vx > 0, vy = 0`), creating seamless visual continuity from Page 1's bottom right capillary exit.
     * Add 1-2 additional afferent lymphatic vessels penetrating the outer capsule.
   - Lymph node anatomy:
     * Capsule (纖維包膜, `#059669`/`#10b981`)
     * Subcapsular sinus (包膜下竇) through which lymph flows
     * Trabeculae (小樑) extending inward
     * Cortex (皮質) containing lymphoid follicles (淋巴濾泡) and germinal centers (生發中心)
     * Paracortex (副皮質 / T細胞區) containing high endothelial venules (HEVs)
     * Medulla (髓質) with medullary cords (髓索) and medullary sinuses (髓竇)
     * Efferent lymphatic vessel (輸出淋巴管) exiting at the hilum (門部) at the right or lower-right.
3. Tab 2 Dynamic Specific Immune Response in `microDefend/script.js`:
   - Pathogens (bacteria `#27ae60`, virus `#8e44ad`) and lymph droplets flow from afferent vessels into subcapsular sinus.
   - Migrating APCs (macrophages/dendritic cells with green MHC-II halo `#34d399`) crawl into paracortex and present antigens to Helper T cells (`#34d399`).
   - Helper T cells activate B cells (`#fb923c`).
   - B cells proliferate in germinal centers, differentiate into plasma cells, and vigorously secrete Y-shaped antibodies (`#f97316` / `#fbbf24`).
   - Filtered lymph fluid and released antibodies enter medullary sinuses and exit via the efferent lymphatic vessel.
4. Tab Switching Logic:
   - Implement smooth switching between Tab 1 and Tab 2, toggling `style.display = 'none'` and `'block'`.
   - Ensure Page 1 simulation continues to run without regressions or JS errors when switching back and forth.
5. Verification:
   - Run the Python milestone 1 test:
     `& "C:\Users\user\miniconda3\python.exe" tests/test_microdefend_e2e.py --milestone 1`
   - Run the CDP milestone 1 test:
     `& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js --milestone 1`
   - Verify all Milestone 1 tests pass with zero console errors and zero uncaught exceptions.
6. Write `handoff.md` in your state folder and notify orchestrator via send_message.

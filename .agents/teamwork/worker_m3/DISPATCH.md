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


## 2026-11-10T01:39:44Z
You are Worker 3 (teamwork_worker) implementing Milestone 3: Page 4 (Bone Marrow Hematopoiesis & Immune Memory Scene).

Original User Request: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md (Follow-up — 2026-11-10T00:42:23Z)
Master Project Plan: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\PROJECT.md
Working Directory: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend
Your State Folder: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m3\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
- Explorer 1 Architecture Report: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\report.md
- Explorer 2 Visual & Anatomical Report: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_2\report.md
- Worker 1 & Worker 2 Handoff Reports: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m1\handoff.md & c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m2\handoff.md
- Test Spec: c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\TEST_READY.md and c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\TEST_INFRA.md

Your Scope for Milestone 3:
1. Complete Page 4 SVG Scene (`#viz-tab-4`) in `microDefend/index.html` & `style.css`:
   - Trabecular bone ivory matrix framework (`#trabecular-bone`, `#bm-trabeculae`), bone endosteum and marrow cavities.
   - Sinusoidal capillaries (`#bm-sinusoids`, `#sinusoid-capillary`) with fenestrated endothelial walls (`#f87171`/`#991b1b` matching Page 1) through which mature blood cells intravasate.
   - Niches: Endosteal niche (quiescent stem cell zone) and perivascular niche (active hematopoiesis and plasma cell survival).
   - Long-lived plasma cell sanctuary & factory (`#llpc-factory-zone`, `#llpc-sanctuary`).
   - Neutrophil storage pool reservoir (`#neutrophil-pool-zone`, `#neutrophil-storage-pool`).
   - B cell development pipeline (`#bcell-lineage-zone`).
   - Hematopoietic stem cell station (`#hsc-zone`).
2. Implement Page 4 Simulation in `microDefend/script.js` (`stepPage4Simulation()`):
   - Hematopoietic Stem Cells (HSCs): self-renewal and multipotent differentiation into myeloid and lymphoid lines.
   - B cell development pipeline: Pro-B -> Pre-B -> Immature B -> Mature naive B cells (`#fb923c`), migrating across sinusoidal endothelium into the blood.
   - Long-lived Plasma Cells (LLPCs): homing in the bone marrow sanctuary, receiving stromal survival signals, and continuously manufacturing basal IgG antibodies (`#fbbf24`), which feed into circulation and explain Page 1's arterial antibody influx!
   - Neutrophil maturation stages: Myeloblast -> Band neutrophil -> Mature segmented neutrophil (tri-lobed nucleus `#0369a1` on cytoplasm `#38bdf8`), accumulating in a massive storage pool ready for acute infection mobilization.
   - Intravasation dynamics: mature cells squeezing through sinusoidal transcellular migration pores into marrow venous outflow.
   - Zero-allocation SVG object pooling (`p4HscPool`, `p4BcellPool`, `p4NeutroPool`, `p4LlpcPool`, `p4AbPool`, etc.) for smooth 60 FPS performance.
3. Interactive Controls in `#controls-tab-4`:
   - Connect all stepper and action buttons:
     * Stepper: 1. HSC自我更新與分化, 2. B細胞誕生發育出髓, 3. 嗜中性球成熟產線與儲存庫動員, 4. 長壽漿細胞避難所與抗體工廠
     * Action triggers:
       - Mobilize neutrophil storage pool ("🚨 動員骨髓嗜中性球儲存庫 (Mobilize Storage Pool)")
       - Trigger HSC differentiation burst ("🌱 啟動造血幹細胞分化產線 (HSC Division)")
       - LLPC antibody factory boost ("🏭 活化長壽漿細胞抗體工廠 (LLPC Boost)")
       - Sinusoidal transcellular migration toggle
4. Verification:
   - Run Python Milestone 3 and full suite:
     `& "C:\Users\user\miniconda3\python.exe" tests/test_microdefend_e2e.py`
   - Run Headless Chrome CDP runner:
     `& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js`
   - Confirm 0 console errors and 0 uncaught exceptions.
5. Write `handoff.md` in your state folder and notify orchestrator via send_message.

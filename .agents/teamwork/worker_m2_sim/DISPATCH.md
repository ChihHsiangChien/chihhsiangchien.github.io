# Dispatch: Milestone 2 - Five Receptors Simulator SPA

## Agent Role: Worker (`teamwork_worker`) — Model: pro
You are responsible for implementing the complete, self-contained `neuro_physiology/receptors.html` SPA with high anatomical fidelity.

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Inputs:
- ORIGINAL_REQUEST.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\PROJECT.md`
- Explorer 1 Report: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\handoff.md`
- Explorer 2 (Pro) Report: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_2\handoff.md` (Detailed anatomical structures, conduction pathways & visual layout)
- Explorer 3 Report: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_3\handoff.md` (Timeline state machine, playback controller, UI layout)

## Write Ownership:
You exclusively own:
- `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology\receptors.html`

You must NOT modify `index.html` or `tests/` in this milestone.

## Requirements:
1. Implement `neuro_physiology/receptors.html` as a standalone SPA matching the dark slate theme of `neuro_physiology/index.html` (Tailwind CDN, Inter/JetBrains Mono fonts, high-DPI Canvas 2D engine).
2. Pure Vanilla JS (ES6+), zero external runtime dependencies.
3. Conduction Timeline State Machine ($T \in [0.0, 1.0]$):
   - Phase 0 ($0.00 \le T < 0.25$): 刺激傳入 (Stimulus arrival)
   - Phase 1 ($0.25 \le T < 0.50$): 受器轉導 (Receptor transduction & micro callout)
   - Phase 2 ($0.50 \le T < 0.80$): 神經傳導 (Action potential propagation & relay)
   - Phase 3 ($0.80 \le T \le 1.00$): 大腦皮質感知 (Cortical network perception & cognitive summary)
4. Playback & Speed Controls:
   - Play/Pause toggle button (`#playPauseBtn`) with Space key shortcut
   - Speed buttons (`0.5x`, `1x`, `1.5x`, `2x`) and continuous speed slider
   - Timeline progress scrubber (`#progressSlider`, min=0, max=100)
   - Step forward / step backward buttons (`#stepNextBtn`, `#stepPrevBtn`)
   - Reset button (`#resetBtn`) and Loop toggle
5. Five Sensory Receptor Tabs:
   - `#tabBtn_vision`, `#tabBtn_hearing`, `#tabBtn_smell`, `#tabBtn_taste`, `#tabBtn_skin`
   - Faithfully represent the anatomical pathways:
     * 視覺: 光線 ➔ 視網膜 (視紫質褪色/感光細胞超極化) ➔ 視神經 (CN II) / 視交叉 / LGN ➔ 枕葉初級視覺皮質 (V1)
     * 聽覺: 聲波 ➔ 鼓膜/聽小骨 ➔ 耳蝸基底膜行波 / 柯蒂氏器毛細胞 K+ 內流 ➔ 聽神經 (CN VIII) / 上橄欖核 / 下丘 / MGN ➔ 顳葉初級聽覺皮質 (A1)
     * 嗅覺: 氣味分子 ➔ 嗅上皮 (Golf / cAMP / Cl- 外流) ➔ 嗅神經 (CN I) 穿篩板 ➔ 嗅球 ➔ 梨狀嗅皮質與邊緣系統 (強調不經視丘直接抵達皮質)
     * 味覺: 呈味物 ➔ 舌乳頭味蕾微絨毛 (GPCR / 離子通道) ➔ 腦神經 (CN VII/IX/X) ➔ 孤立束核 ➔ 視丘 VPMpc ➔ 前島葉初級味覺皮質
     * 皮膚: 機械壓力/溫度刺激 ➔ 梅斯納/巴齊尼/莫克爾/魯菲尼/自由末梢 ➔ 脊神經節 DRG ➔ 雙軌傳導 (後索 DCML vs 脊髓丘腦束 STT) ➔ 視丘 VPL ➔ 頂葉初級體感皮質 (S1)
6. Microscopic Callout Inset during Phase 1 displaying molecular transduction.
7. Telemetry & Educational Panel updating dynamically with physiological explanations and Traditional Chinese terminology.
8. Header navigation:
   - `<a href="index.html">` (返回神經生理學主實驗室)
   - `<a href="../index.html">` (返回首頁)
   - `<a href="../neural_pathway/index.html">`
   - `<a href="../action_potential/index.html">`
9. Test and verify locally: Run Node syntax checks, ensure no console errors.
10. Deliver complete handoff report to `.agents/teamwork/worker_m2_sim/handoff.md`.

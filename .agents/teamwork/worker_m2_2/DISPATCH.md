## 2026-10-23T09:50:26Z
[Message] timestamp=2026-10-23T09:50:26Z sender=d5805c73-559a-4390-a663-36bfc7de1641 priority=MESSAGE_PRIORITY_HIGH content=You are Worker M2.2 for Round 2 Milestone 2.2: FoodChain & FoodWeb Consolidation (Requirement R2).
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m2_2/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the authoritative user request at:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
Pay special attention to '## Follow-up — 2026-10-23T09:35:29Z' and requirement R2 ('foodChain/').
Also read PROJECT.md at:
/home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
And review Survey Explorer 2's detailed findings:
- Report: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_2/survey_report.md
- Handoff: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_2/handoff.md

Files you own exclusively:
- `foodChain/index.html`
- `foodChain/style.css`
- `foodChain/script.js`
- `foodChain/data.js` (and any new helper files inside `foodChain/`)

Your implementation tasks for `foodChain/`:
1. Design a clean, responsive layout with dual-mode top tabs:
   - **單元一：簡易食物鏈消長模擬**
   - **單元二：多物種食物網生態平衡**
2. In Mode 1 (簡易食物鏈):
   - Fix the spatial simulation: Wolf, Sheep, Grass.
   - Ensure wolves are instantiated and actively hunt sheep; sheep consume grass; grass regrows.
   - Fix `eat()` to handle multi-trophic predation correctly without crashes.
   - Add UI controls: Start/Pause, Reset, Speed Slider, Spawn Wolf (+狼), Spawn Sheep (+羊), Spawn Grass (+草).
   - Support responsive canvas sizing with window resize / ResizeObserver and devicePixelRatio scaling.
3. In Mode 2 (多物種食物網):
   - Consolidate the 10 Taiwan native species from `foodWeb/` (物種關係.txt: 臺灣黑熊, 石虎, 赤腹松鼠, 梅花鹿, 臺灣野兔, 巢鼠, 環頸雉, 芒草, 臺灣冷杉, 殼斗科植物).
   - Fix the broken differential equation in `Species.js` with a mathematically stable Lotka-Volterra carrying-capacity model (bound within [0, K], no division by zero, no Math.log(0) / -Infinity).
   - Integrate Chart.js time-series population line chart showing dynamic equilibrium.
   - Render interactive food web directed network graph showing predator-prey connections.
4. RWD & Mobile Adaptation:
   - Ensure full touch support and responsive layout on mobile, tablet, and desktop without horizontal scroll or broken buttons.
5. Verification:
   - Test mathematical model stability using Node.js script.
   - Verify 0 console errors and proper tab switching.
   - Write your implementation report to `handoff.md` in your working directory.
6. Send a completion message back to the orchestrator.

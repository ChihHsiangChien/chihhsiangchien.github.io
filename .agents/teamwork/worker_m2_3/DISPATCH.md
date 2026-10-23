## 2026-10-23T09:50:27Z
You are Worker M2.3 for Round 2 Milestone 2.3: EnergyPyramid & OmNomNom Suite (Requirements R3 & R4).
Your working directory is: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/worker_m2_3/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the authoritative user request at:
/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/ORIGINAL_REQUEST.md
Pay special attention to '## Follow-up — 2026-10-23T09:35:29Z' and requirements R3 ('energyPyramid/') and R4 ('OmNomNom/').
Also read PROJECT.md at:
/home/pancala/Documents/chihhsiangchien.github.io/PROJECT.md
And review Survey Explorers 2 & 3's detailed findings:
- Report 2: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_2/survey_report.md
- Report 3: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_3/survey_report.md
- Handoff 3: /home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_3/handoff.md

Files you own exclusively:
- `energyPyramid/index.html`
- `energyPyramid/style.css`
- `energyPyramid/script.js`
- `energyPyramid/data/cards.json`
- `OmNomNom/index.html`
- `OmNomNom/style.css`
- `OmNomNom/script.js`
- `OmNomNom/data/cards.json`

Your implementation tasks:
1. `energyPyramid/`:
   - Complete 4 trophic tiers: 生產者 (Producers), 初級消費者 (Primary Consumers), 次級消費者 (Secondary Consumers), 三級/頂級消費者 (Tertiary/Apex Consumers).
   - Implement card placement game with rich organism cards supporting both Drag-and-Drop and Tap-to-Place (mobile-friendly).
   - Add instant audio feedback via Web Audio API oscillators (ascending chime for correct, low buzz for incorrect) and visual highlights (green border / shake animation) — NO disruptive alert()!
   - Implement dynamic "能量 10% 傳遞法則" (10% Energy Transfer Law) calculator:
     * Slider / numeric input for base producer energy (e.g. 10,000 J).
     * Real-time calculation of energy assimilated per level (10,000 -> 1,000 -> 100 -> 10 J) and 90% heat energy dissipated to environment.
     * Graphical visualization showing stacked geometric pyramid tiers and thermal dissipation arrows.
2. `OmNomNom/`:
   - Add "遊戲規則說明" button (`#rulesBtn`) and accessible, responsive modal dialog (`#rulesModal` with close button `#closeModalBtn`). Modal explains the 9 Taiwan wetland species across 3 food chains, trophic roles, dice progression, predation rules, and victory conditions.
   - Implement animated dice rolling engine (1-6) with roll-state locking to prevent button spamming.
   - Implement player pawn token with glow moving along the 9-tile board circuit `(pos + roll) % 9`.
   - Implement predation / energy events upon landing (prey consumed, predator confrontation, lap energy bonus).
   - Add Web Audio API synthesized sound effects (dice rattle, pawn hop, nom-nom bite, victory chime).
   - Ensure responsive canvas scaling (aspect-ratio: 700/600, max-width: 100%) and responsive UI controls.
3. Verification:
   - Verify that both projects run cleanly without console errors or alert() popups.
   - Test Web Audio synthesized tones work cleanly on user interaction.
   - Write your implementation report to `handoff.md` in your working directory.
4. Send a completion message back to the orchestrator.

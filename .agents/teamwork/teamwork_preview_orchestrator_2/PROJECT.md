# Project: Biology Educational Interactive Web Enhancements (chihhsiangchien.github.io)

## Architecture
- Static web applications hosted on GitHub Pages / HTTP static server.
- Entry point: `index.html` linking to thematic modules categorized by biological topics.
- Round 1 Modules (Verified & Complete):
  1. `fiddler-crab/`: Three.js procedural 3D simulation of crab behavior, survival, and predation.
  2. `pepperedMoth/`: Tailwind CSS + Chart.js natural selection and industrial melanism simulation.
  3. `lens-optical/`: Optical ray-tracing and compound microscope optics workbench.
  4. `greatFossil/`: Canvas-based fossil era matching educational game.
  5. `blood-stream/`: Three.js + Cannon.js 3D vascular blood flow and valve dynamics.
  6. `rt/`: Web Audio + high-resolution timer reaction time experimental testing tool.
  7. `cardGame/消化_消化管_順序/`: Canvas sequence card game driven by `cardGame/js/utils.js`.
- Round 2 Modules (Active Scope):
  8. `cell-3d/`: Unified Three.js r160 3D cell and organelle suite (Animal Cell cutaway, Mitochondria cristae, Chloroplast grana, RBC biconcave, Fluid Mosaic membrane).
  9. `foodChain/`: Consolidated ecological simulation with dual-mode tabs (Simple Wolf-Sheep-Grass food chain vs. 10-species stable food web + Chart.js).
  10. `energyPyramid/`: 4-tier interactive card placement game with Web Audio feedback and dynamic 10% Lindeman energy transfer law + heat dissipation calculator.
  11. `OmNomNom/`: 9-tile Taiwan wetland food chain board game with interactive rules modal dialog, animated dice rolling, pawn progression, and Web Audio synthesis.
  12. `index.html`: Curriculum hub mounting of all new projects under "細胞" and "生態系".

## Code Layout
- `index.html`: Main hub / curriculum chapter index
- `check_unlinked_projects.py`: Python verification script for link integrity and formatting
- `cell-3d/`: `index.html`, `style.css`, `main.js`, procedural 3D model modules
- `foodChain/`: `index.html`, `style.css`, `script.js`, `data.js`
- `energyPyramid/`: `index.html`, `style.css`, `script.js`, `data/cards.json`
- `OmNomNom/`: `index.html`, `style.css`, `script.js`, `data/cards.json`
- `tests/`: Automated E2E verification test harness (`test_e2e_suite.py` for R1, `test_round2_suite.py` for R2)

## Feature Inventory (Round 2)
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1.1 Cell-3D Unified Architecture | Unified project structure (index.html, style.css, main.js) with Three.js r160, OrbitControls, touch gestures | M2.1 | ORIGINAL_REQUEST R1 |
| 2 | R1.2 Animal Cell Cutaway Model | Procedural animal cell panorama with toggleable 1/4 wedge clipping planes and major organelles | M2.1 | ORIGINAL_REQUEST R1 |
| 3 | R1.3 Mitochondria 3D Model | Double membrane capsule with CatmullRomCurve3 cristae folds, matrix, and circular mtDNA | M2.1 | ORIGINAL_REQUEST R1 |
| 4 | R1.4 Chloroplast 3D Model | Outer/inner envelope with grana thylakoid disc stacks, stroma lamellae, and stroma | M2.1 | ORIGINAL_REQUEST R1 |
| 5 | R1.5 RBC Biconcave Disc Model | High-precision biconcave disk BufferGeometry with MeshPhysicalMaterial and gas exchange annotations | M2.1 | ORIGINAL_REQUEST R1 |
| 6 | R1.6 Fluid Mosaic Membrane Model | Phospholipid bilayer with dual tails, transmembrane ion channels, peripheral proteins, glycoproteins, cholesterol | M2.1 | ORIGINAL_REQUEST R1 |
| 7 | R1.7 Cell-3D UI & Annotations | Modern tab navigation, glassmorphic floating cards in Traditional Chinese, camera reset, touch orbit controls | M2.1 | ORIGINAL_REQUEST R1 |
| 8 | R2.1 FoodChain Wolf Predation & Controls | Spawn wolves, multi-trophic predation in eat(), responsive canvas resizing, UI controls (play/pause/reset/speed/spawn) | M2.2 | ORIGINAL_REQUEST R2 |
| 9 | R2.2 FoodChain Dual-Mode Switcher | Top tab switcher between "單元一：簡易食物鏈消長模擬" and "單元二：多物種食物網生態平衡" | M2.2 | ORIGINAL_REQUEST R2 |
| 10 | R2.3 Stable FoodWeb Mathematical Model | Fix inverted differential equations in Species.js with stable carrying-capacity Lotka-Volterra dynamics | M2.2 | ORIGINAL_REQUEST R2 |
| 11 | R2.4 FoodWeb Chart.js & Topology Canvas | Real-time multi-species population time-series Chart.js graph and interactive 10-species food web network | M2.2 | ORIGINAL_REQUEST R2 |
| 12 | R3.1 EnergyPyramid 4-Tier Card Placement | 4 trophic tiers (Producers, Primary, Secondary, Tertiary/Apex) with drag-and-drop & tap-to-place cards | M2.3 | ORIGINAL_REQUEST R3 |
| 13 | R3.2 EnergyPyramid Web Audio Feedback | Instant ascending chime for correct, buzz for incorrect, score tracking, without disruptive alert() | M2.3 | ORIGINAL_REQUEST R3 |
| 14 | R3.3 Dynamic 10% Energy Law Calculator | Slider/input for baseline energy (e.g. 10,000 J -> 1,000 -> 100 -> 10 J) with 90% heat dissipation visualization | M2.3 | ORIGINAL_REQUEST R3 |
| 15 | R4.1 OmNomNom Rules Modal Dialog | Trigger button and responsive modal dialog explaining wetland food chains, trophic roles, dice mechanics, win conditions | M2.3 | ORIGINAL_REQUEST R4 |
| 16 | R4.2 OmNomNom 9-Tile Board Engine | Animated dice rolling, state lock, glowing pawn token along 9-tile loop, predation events, Web Audio sound synthesis | M2.3 | ORIGINAL_REQUEST R4 |
| 17 | R5.1 Mount cell-3d in index.html | Insert `<a href="cell-3d/index.html">3D細胞與胞器模型</a>` under "細胞" section | M2.4 | ORIGINAL_REQUEST R5 |
| 18 | R5.2 Mount ecology projects in index.html | Insert foodChain, energyPyramid, OmNomNom under "生態系" (and restore greatFossil under "演化") | M2.4 | ORIGINAL_REQUEST R5 |
| 19 | R5.3 Link Integrity Verification | Pass check_unlinked_projects.py with zero unlinked target directories and zero 404 dead links | M2.4 | ORIGINAL_REQUEST R5 |
| 20 | Round 2 E2E Test Suite | Automated comprehensive test suite (test_round2_suite.py) covering Tiers 1-4 with 100% pass rate | M2.5 | Acceptance Criteria |

## Milestones (Round 2)
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M2.1 | Cell-3D Unified Suite | R1: cell-3d/ 5 procedural 3D models, tab switcher, Chinese cards, camera reset | none | PLANNED |
| M2.2 | FoodChain & FoodWeb Consolidation | R2: foodChain/ dual-mode tabs, wolf predation, stable Lotka-Volterra food web, Chart.js | none | PLANNED |
| M2.3 | EnergyPyramid & OmNomNom Suite | R3: energyPyramid 4 tiers, 10% calculator, heat loss; R4: OmNomNom modal, dice engine, pawn circuit | none | PLANNED |
| M2.4 | Homepage Mounting & Link Integrity | R5: Mount cell-3d, foodChain, energyPyramid, OmNomNom, greatFossil into index.html; verify check_unlinked_projects.py | M2.1, M2.2, M2.3 | PLANNED |
| M2.5 | Round 2 E2E Test Suite | Automated 4-tier test suite in tests/test_round2_suite.py and TEST_READY.md update | M2.1, M2.2, M2.3 | PLANNED |
| M2.6 | Multi-Agent Gate Verification | Full E2E test pass, 2 Reviewers, 2 Challengers, 1 Forensic Auditor | M2.4, M2.5 | PLANNED |

## Interface Contracts
### Homepage ↔ Modules
- Standard relative URLs `<a href="<dir>/index.html">...</a>`
- Relative paths must resolve directly from root directory without 404s
### cell-3d/ Navigation Contract
- Standalone ES module loading Three.js r160 via `<script type="importmap">`
- Tab buttons: `data-model="animalCell"`, `data-model="mitochondria"`, `data-model="chloroplast"`, `data-model="rbc"`, `data-model="membrane"`
- Floating card element: `#info-card` containing title, subtitle, biological structure, and curriculum facts in Traditional Chinese
### foodChain/ Dual-Mode Contract
- Main tabs: `#tab-simple` ("單元一：簡易食物鏈消長模擬") and `#tab-complex` ("單元二：多物種食物網生態平衡")
- Mode 1 canvas: `#chainCanvas`
- Mode 2 container: `#webNetworkCanvas` and `#populationChart` (Chart.js)
### energyPyramid/ Interaction Contract
- 4 tiers with DOM IDs: `#tier-producers`, `#tier-primary`, `#tier-secondary`, `#tier-tertiary`
- Calculator input/slider: `#baseEnergyInput` with instant calculation updating `#val-producers`, `#val-primary`, `#val-secondary`, `#val-tertiary` and heat loss `#loss-primary`, `#loss-secondary`, `#loss-tertiary`
### OmNomNom/ Rules Modal Contract
- Trigger button: `#rulesBtn`
- Modal dialog: `#rulesModal` with close button `#closeModalBtn`
- Dice button: `#diceBtn` with rolling lock and result text `#diceResult`

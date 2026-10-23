# Project: Biology Educational Interactive Web Enhancements (chihhsiangchien.github.io)

## Architecture
- Static web applications hosted on GitHub Pages / HTTP static server.
- Entry point: `index.html` linking to thematic modules categorized by biological topics.
- Modules:
  1. `fiddler-crab/`: Three.js procedural 3D simulation of crab behavior, survival, and predation.
  2. `pepperedMoth/`: Tailwind CSS + Chart.js natural selection and industrial melanism simulation.
  3. `lens-optical/`: Optical ray-tracing and compound microscope optics workbench.
  4. `greatFossil/`: Canvas-based fossil era matching educational game.
  5. `blood-stream/`: Three.js + Cannon.js 3D vascular blood flow and valve dynamics.
  6. `rt/`: Web Audio + high-resolution timer reaction time experimental testing tool.
  7. `cardGame/消化_消化管_順序/`: Canvas sequence card game driven by `cardGame/js/utils.js`.

## Code Layout
- `index.html`: Main hub / curriculum chapter index
- `check_unlinked_projects.py`: Python verification script for link integrity and formatting
- `fiddler-crab/`: `index.html`, `style.css`, `fiddler-crab.js`
- `pepperedMoth/`: `index.html`
- `lens-optical/`: `index.html`
- `greatFossil/`: `index.html`, `style.css`, `js/globalVariables.js`, `js/utils.js`
- `blood-stream/`: `index.html`, `style.css`, `main.js`
- `rt/`: `index.html`, `app.js`, `style.css`, `config/`
- `cardGame/`: `消化_消化管_順序/index.html`, `js/utils.js`, `sound/`
- `tests/`: Automated E2E verification test harness and test scripts

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1.1 Index Project Mounting | Mount all 7 projects to corresponding curriculum chapters in index.html | M1 | Survey / ORIGINAL_REQUEST |
| 2 | R1.2 Index Whitespace Fix | Fix leading space defect on line 215 in index.html | M1 | Survey / ORIGINAL_REQUEST |
| 3 | R2.1 Fiddler Crab Mobile Controls | Add virtual directional buttons & touch swipe without velocity stuck bug | M2 | Survey / ORIGINAL_REQUEST |
| 4 | R2.2 Fiddler Crab Settlement Modal | Full-screen modal with survival time, food count, restart button & cause | M2 | Survey / ORIGINAL_REQUEST |
| 5 | R3.1 Peppered Moth Predator Mode | Interactive minigame with timer, bird click predation, sound & settlement | M2 | Survey / ORIGINAL_REQUEST |
| 6 | R3.2 Peppered Moth Line Chart | Update Chart.js to dual-dataset line chart tracking generational shifts | M2 | Survey / ORIGINAL_REQUEST |
| 7 | R4.1 Lens Optical Presets | 3 preset scenario buttons (物鏡倒立放大, 目鏡二次放大, 光圈縮小景深) | M3 | Survey / ORIGINAL_REQUEST |
| 8 | R4.2 Lens Optical Explanations & Aperture | Explanatory hint card and aperture state integration | M3 | Survey / ORIGINAL_REQUEST |
| 9 | R5.1 Great Fossil HTML/CSS Fix | Remove orphaned tags, fix CSS path & styling, fix audio 404 paths | M3 | Survey / ORIGINAL_REQUEST |
| 10 | R5.2 Great Fossil Canvas & RWD | Uncomment drawAnswerBox, add responsive layout without button overlap | M3 | Survey / ORIGINAL_REQUEST |
| 11 | R6.1 Blood Stream Quality Switch | Particle count / quality switch (Low / Med / High) and remove @apply CSS | M4 | Survey / ORIGINAL_REQUEST |
| 12 | R6.2 Blood Stream Valve Animation | Realistic dynamic valve flap tilt physics animation during blood flow | M4 | Survey / ORIGINAL_REQUEST |
| 13 | R7.1 Reaction Time Data Export | Add "Export CSV" and "Copy Result Text" buttons for student inquiry | M4 | Survey / ORIGINAL_REQUEST |
| 14 | R8.1 Digestion Card Game Engine Fix | Fix empty click TypeError, enforce mouth start, win condition in utils.js | M5 | Survey / ORIGINAL_REQUEST |
| 15 | R8.2 Digestion Card Game Verification | Verify cardGame/消化_消化管_順序/ assets, flow and no console errors | M5 | Survey / ORIGINAL_REQUEST |
| 16 | E2E & Acceptance Verification | Pass check_unlinked_projects.py, zero 404s, zero console uncaught errors | M6 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Homepage Linking & Syntax Fix | R1: index.html mounting of 7 projects, line 215 whitespace fix | none | DONE |
| M2 | Ecology & Evolution Enhancements | R2 (fiddler-crab) & R3 (pepperedMoth) | none | DONE |
| M3 | Optics & Paleontology Refactoring | R4 (lens-optical) & R5 (greatFossil) | none | DONE |
| M4 | Hemodynamics & Neuro-Inquiry | R6 (blood-stream) & R7 (rt) | none | DONE |
| M5 | Digestion Card Game Engine | R8: cardGame/消化_消化管_順序/ & cardGame/js/utils.js | none | DONE |
| M6 | Final Acceptance & E2E Validation | Full E2E test suite pass (Tiers 1-4) & Forensic Audit | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts
### Homepage ↔ Modules
- Standard relative URLs `<a href="<dir>/index.html">...</a>`
- Relative paths must resolve directly from root directory without 404s
### Card Game Engine ↔ Digestion Game
- `cardGame/js/utils.js` shared API:
  - `clickIfOrder()`: handles card selection; must safely ignore null/empty canvas clicks without throwing TypeError.
  - `handleOrderingCards()`: validates consecutive card order, terminates timer and shows win modal when `selectedCards.length === correctCount`.

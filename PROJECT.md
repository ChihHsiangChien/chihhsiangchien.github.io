# Project: MicroDefend Multi-Tab Lymphatic & Hematopoietic Expansion

## Architecture
- Target system: Pure client-side vanilla JavaScript + SVG vector graphics + CSS3 responsive layout.
- Host directory: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend`
- Core files:
  * `index.html`: Multi-tab semantic navigation (`.tabs-nav`), 4 dedicated SVG scene viewports (`#viz-tab-1` to `#viz-tab-4`), and modular control panels (`#controls-tab-1` to `#controls-tab-4`).
  * `style.css`: Unified aesthetic system matching Page 1 dark theme (`#0f172a`, `#1e293b`), glassmorphism panels, tab button indicators, and responsive layout.
  * `script.js`: Master active-tab gated animation loop (`masterAnimationLoop`), zero-allocation SVG object pooling, state management, and biological entity physics for Tabs 1–4.
  * `tests/`: Automated 4-tier E2E test harness (`tests/test_microdefend_e2e.py` and Node.js CDP runner `tests/test_cdp_e2e.js`).

## Code Layout
- `microDefend/index.html`: DOM structure for all 4 tabs and control panels.
- `microDefend/style.css`: Styles for tabs, control panels, SVG elements, tooltips, and badges.
- `microDefend/script.js`: Simulation logic, event listeners, SVG rendering pools, and biological models for all 4 pages.
- `tests/test_microdefend_e2e.py`: Python standard library test runner for DOM structure, spatial geometry, and static constraints.
- `tests/test_cdp_e2e.js`: Node.js v24 headless Chrome CDP test runner for dynamic SVG rendering, tab switching, and console error interception.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Tab Nav Framework | Top tab bar (`.tabs-nav`) switching Tabs 1–4 with active-tab gating | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Tab 2 Lymph Node Canvas & Vessels | SVG scene with afferent vessels, capsule, subcapsular sinus, trabeculae, efferent vessel | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Page 1 ↔ Page 2 Spatial Continuity | Primary afferent inlet at `x=0, y=248..288` (center 268) seamlessly matching Page 1 exit | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Tab 2 Specific Immune Cascade | APC presentation to Th cells, B/T cell activation, germinal centers, plasma cells & antibody output | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Tab 3 Lymphatic Duct Confluence | Efferent lymphatics merging into thoracic duct entering left venous angle | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Tab 3 Venous Valves & Wall Anatomy | Bicuspid terminal valves preventing backflow, endothelial cells with nuclei (`#f87171`/`#991b1b`) | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Tab 3 Hemodynamics & Cell Consistency | Rapid laminar venous blood flow, slow lymph inflow, RBC/WBC visual fidelity matching Page 1 | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Tab 4 Bone Marrow Architecture | Trabecular bone framework, sinusoidal capillaries, endosteal and perivascular niches | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Tab 4 HSC Hematopoietic Cascade | HSC self-renewal & multipotent differentiation lines (myeloid & lymphoid) | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Tab 4 B Cell Maturation | B cell development from progenitors to naive B cells and sinusoidal intravasation | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Tab 4 LLPC Antibody Factory | Long-lived plasma cells homing to bone marrow niches with continuous basal antibody production | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Tab 4 Neutrophil Maturation & Pool | Myeloblast to segmented neutrophil maturation series & massive storage pool for acute mobilization | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Interactive Control Panels (Tabs 2-4) | Dedicated controls for pathogen injection, cellular triggers, labels, and speed (0.5x, 1x, 2x) | M4 | ORIGINAL_REQUEST §R4 |
| 14 | Cross-Tab State & Lifecycle Hygiene | Zero-allocation SVG pool cleanup, active-tab simulation gating, zero memory leaks, zero console errors | M4 | ORIGINAL_REQUEST §R4 |
| 15 | E2E Automated Test Infrastructure | Dual-mode test harness (Python unittest + Node.js CDP runner) verifying all requirements | M0 | Acceptance Criteria |
| 16 | 100% E2E Pass, Hardening & Audit | 100% pass of Tiers 1-4, Tier 5 adversarial stress testing, and clean forensic integrity audit | M5 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Track | Test suite design, Python & Node.js CDP test runners, publish `TEST_READY.md` | none | DONE |
| M1 | Multi-Tab Nav & Lymph Node Scene | Tab navigation, Tab 2 SVG, afferent/efferent vessels, spatial continuity from P1, immune cascade | M0 | DONE |
| M2 | Lymphatic Ducts & Venous Confluence | Tab 3 SVG, thoracic duct, venous valves, endothelial walls, laminar hemodynamics, cell fidelity | M1 | DONE |
| M3 | Bone Marrow Hematopoiesis & Memory | Tab 4 SVG, trabeculae/sinusoids, HSC differentiation, B cell development, LLPC factory, neutrophil pool | M2 | DONE |
| M4 | Interactive Controls & State Lifecycle | Modular control panels for Tabs 2–4, pathogen injection, cellular reaction triggers, speed/pause, pool hygiene | M3 | DONE |
| M5 | Final E2E Verification & Forensic Audit | Pass 100% of Tiers 1-4 tests, Tier 5 adversarial coverage hardening, clean forensic integrity audit | M0, M1, M2, M3, M4 | DONE |

## Interface Contracts
### Tab Navigation ↔ SVG Viewports
- Tab switching changes `currentTab = 'tab-1' | 'tab-2' | 'tab-3' | 'tab-4'`.
- Inactive SVG viewports set `style.display = 'none'`, active viewport sets `style.display = 'block'`.
- Controls panels toggle visibility matching `currentTab`.
### Page 1 ↔ Page 2 Spatial Alignment
- Page 1 capillary exit: `x = 1000, y = 248..288` (center `y = 268`), vector `vx > 0, vy = 0`.
- Page 2 afferent inlet: `x = 0, y = 248..288` (center `y = 268`), vector `vx > 0, vy = 0`.
- Vessel styling: fill `rgba(16, 185, 129, 0.18)`, stroke `#10b981`, stroke-width `1.8`, stroke-dasharray `6,3`.
### Page 2 ↔ Page 3 Lymphatic Continuity
- Page 2 efferent vessel exiting hilum drains filtered lymph and newly generated antibodies.
- Page 3 receives efferent vessels merging into thoracic duct with terminal bicuspid valve entering vein.
### Page 4 ↔ Page 1 Immunological Memory Loop
- Page 4 LLPCs in bone marrow continuously produce basal IgG antibodies (`#fbbf24`).
- Explains Page 1's arterial antibody influx when memory is active, closing the physiological loop.

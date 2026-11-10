# MicroDefend Multi-Tab Expansion — Test Infrastructure (TEST_INFRA.md)

## Overview
This document specifies the automated end-to-end (E2E) testing infrastructure for the **MicroDefend (微觀人體防線)** multi-tab biological simulation platform. The testing harness is designed for zero external dependency execution across Windows, Linux, and macOS environments, utilizing only the Python standard library and native Node.js v24 features.

---

## 1. Test Harness Architecture

The test infrastructure operates as a dual-engine opaque-box verification suite:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MicroDefend Test Harness                               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ Tier A: Fast Static & DOM Runner          │ Tier B: Live Headless Chrome CDP Runner    │
│ (`tests/test_microdefend_e2e.py`)         │ (`tests/test_cdp_e2e.js`)                  │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Python 3.13 standard library only       │ • Node.js v24 native WebSocket + fetch     │
│ • Ephemeral local HTTP server (port 0)    │ • Headless Google Chrome automation via    │
│ • Custom DOM & SVG tree parser with       │   Chrome DevTools Protocol (CDP)           │
│   CSS selector engine and path tokenizer  │ • Intercepts Runtime.exceptionThrown and   │
│ • Spatial geometry vector calculations    │   Runtime.consoleAPICalled in real time    │
│ • Sub-second test execution (<1.0s)       │ • Simulates user tab clicks, speed shifts, │
│ • Granular Milestone gating (--milestone) │   pathogen deployment, and stress cycles   │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Environment & Binary Matrix

| Component | Path / Command | Role | External Dependencies |
|---|---|---|---|
| **Python** | `C:\Users\user\miniconda3\python.exe` | Executes static DOM, geometry, and curriculum term test suites (`unittest`) | **None** (Python stdlib: `unittest`, `http.server`, `urllib`, `re`, `html.parser`) |
| **Node.js** | `C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe` | Orchestrates headless Chrome via native WebSocket CDP | **None** (Node stdlib: `child_process`, `http`, `fs`, `path`, `net`, native `WebSocket`, `fetch`) |
| **Google Chrome** | `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` | Live headless browser rendering engine (`--headless=new`) | Pre-installed system browser |

---

## 3. Test Suites & Tiered Coverage

### Tier 1: Feature Coverage
- **T1.1 Multi-Tab Navigation**: Validates existence of semantic `.tabs-nav` containing 4 tabs (`tab-1`, `tab-2`, `tab-3`, `tab-4`) with accessibility attributes (`role="tab"`, `aria-selected`, `aria-controls`).
- **T1.2 Page 1 Initial Lymphatic Vessel**: Validates `#lymph-capillary-lumen` geometry (`x=868..1000, y=248..288`, center `y=268`), stroke `#10b981`, and `stroke-dasharray="6,3"`.
- **T1.3 Page 2 Lymph Node Structure**: Validates afferent inlet alignment at `x=0, y=248..288` (center 268) and presence of capsule, subcapsular sinus, trabeculae, germinal centers, and efferent lymphatic duct.
- **T1.4 Page 3 Venous Confluence**: Validates `#viz-tab-3`, thoracic duct, venous valve leaflets, and endothelial wall styling (`#f87171` / `#991b1b`).
- **T1.5 Page 4 Bone Marrow Niches**: Validates `#viz-tab-4`, bone trabeculae, sinusoidal capillaries, hematopoietic stem cell (HSC) niche, B cell lineage, long-lived plasma cell (LLPC) factory, and neutrophil storage pool.
- **T1.6 Interactive Control Panels**: Validates presence of dedicated modular control panels (`#controls-tab-1` through `#controls-tab-4`) and action buttons.

### Tier 2: Boundary & Corner Cases
- **T2.1 Spatial Coordinate Continuity**: Mathematically computes Page 1 exit vector and Page 2 entrance vector, asserting center Y deviation `|Δy| <= 1.0px`.
- **T2.2 Speed Multipliers**: Asserts presence of `0.5x`, `1.0x`, and `2.0x` multipliers with positive numeric bounds (`0.1 <= speed <= 5.0`).
- **T2.3 Viewport & RWD**: Validates `<meta name="viewport" content="width=device-width, initial-scale=1.0">` and primary responsive containers.

### Tier 3: Cross-Feature State Lifecycle
- **T3.1 Cross-Tab Isolation & Viewport Gating**: Verifies only active tab SVG and active controls panel are displayed (`display != 'none'`), while inactive scenes are hidden (`display: none`).
- **T3.2 Animation Loop Gating**: Analyzes `script.js` to ensure the animation loop (`masterAnimationLoop` / `currentTab`) gates physics calculations and SVG DOM updates strictly to the active tab.
- **T3.3 Object Pool Hygiene**: Asserts zero-allocation object pooling patterns to eliminate garbage collection stutter and DOM leaks.

### Tier 4: Real-World Pedagogical Scenarios
- **T4.1 Curriculum Biological Terminology**: Asserts presence of all 11 required Taiwanese high school biology curriculum terms:
  1. `抗原呈現` (Antigen Presentation)
  2. `輔助T細胞` (Helper T Cell)
  3. `B細胞` (B Cell)
  4. `漿細胞` (Plasma Cell)
  5. `抗體` (Antibody)
  6. `淋巴總管` (Thoracic Duct / Lymphatic Trunk)
  7. `靜脈瓣` (Venous Valve)
  8. `骨髓` (Bone Marrow)
  9. `造血幹細胞` (Hematopoietic Stem Cell)
  10. `長壽漿細胞` (Long-Lived Plasma Cell)
  11. `嗜中性球儲存庫` (Neutrophil Storage Pool)
- **T4.2 Educational Narratives**: Asserts presence of dynamic mechanism feedback cards (`#mechanism-desc`).

---

## 4. Execution Commands

### Python Test Suite
```powershell
# Run full suite (all tiers):
& "C:\Users\user\miniconda3\python.exe" tests/test_microdefend_e2e.py

# Run via standard unittest module:
& "C:\Users\user\miniconda3\python.exe" -m unittest tests/test_microdefend_e2e.py

# Run progressive milestone slice (e.g. Milestone 0 baseline):
& "C:\Users\user\miniconda3\python.exe" tests/test_microdefend_e2e.py --milestone 0

# Run with Milestone 1 scope:
& "C:\Users\user\miniconda3\python.exe" tests/test_microdefend_e2e.py --milestone 1
```

### Node.js Headless Chrome CDP Runner
```powershell
# Run full CDP live browser test suite:
& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js

# Run progressive milestone slice (e.g. Milestone 0 baseline):
& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js --milestone 0

# Baseline non-zero exit override:
& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js --baseline
```

---

## 5. Continuous Integration (CI) Invariant Guarantees
1. **0 Uncaught Exceptions**: Both test harnesses continuously monitor page runtime. Any unhandled JavaScript error or console error fails the test run.
2. **Deterministic Port Binding**: Local test servers bind to port 0 (ephemeral OS-allocated port) to prevent address collisions in parallel test environments.
3. **Clean Teardown**: Try/finally blocks guarantee termination of spawned Chrome instances, WebSocket connections, and socket servers upon test exit.

# E2E Test Infra: chihhsiangchien.github.io Enhancements

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory (Round 1)
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | R1: Homepage mounting & line 215 whitespace | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | R2: Fiddler crab mobile controls & settlement | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 3 | R3: Peppered moth predator mode & line chart | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 4 | R4: Lens optical presets & aperture | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 5 | R5: Great fossil CSS, HTML tags & RWD | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| 6 | R6: Blood stream quality switch & valve physics | ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| 7 | R7: Reaction time CSV & copy text export | ORIGINAL_REQUEST §R7 | 5 | 5 | ✓ | ✓ |
| 8 | R8: Digestion card sequence game flow & utils | ORIGINAL_REQUEST §R8 | 5 | 5 | ✓ | ✓ |

## Feature Inventory (Round 2)
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 9 | F1-F7: 3D Cell Suite (`cell-3d/`) | ORIGINAL_REQUEST Follow-up §R1 | 7 | 5 | ✓ | ✓ |
| 10 | F8-F11: Food Chain & Food Web (`foodChain/`) | ORIGINAL_REQUEST Follow-up §R2 | 5 | 5 | ✓ | ✓ |
| 11 | F12-F14: Energy Pyramid (`energyPyramid/`) | ORIGINAL_REQUEST Follow-up §R3 | 5 | 5 | ✓ | ✓ |
| 12 | F15-F16: OmNomNom Board Game (`OmNomNom/`) | ORIGINAL_REQUEST Follow-up §R4 | 5 | 5 | ✓ | ✓ |
| 13 | F17-F19: Homepage Mounting & Links (`index.html`) | ORIGINAL_REQUEST Follow-up §R5 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Round 1 Test Harness**: `python3 tests/test_e2e_suite.py` (91 tests) & `python3 check_unlinked_projects.py`
- **Round 2 Test Harness**: `python3 tests/test_round2_suite.py` (63 tests) & `python3 check_unlinked_projects.py`
- Test framework: Ephemeral Python HTTP server + BeautifulSoup DOM parser + Node.js VM mathematical verification engine + Static Code & Resource Integrity Matrix
- Pass/Fail semantics: Exit code 0 on all assertions passing; exit code 1 on any failure.

## Real-World Application Scenarios (Tier 4)

### Round 1 Scenarios
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Biology Curriculum Hub Navigation | R1, R8, R5 | Medium |
| 2 | Animal Ecology & Natural Selection Session | R2, R3 | High |
| 3 | Microscope Optics Hands-on Lab | R4 | Medium |
| 4 | Human Circulatory & Nervous System Inquiry | R6, R7 | High |
| 5 | Digestion Order Mastery Challenge | R8 | Medium |

### Round 2 Scenarios
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | 3D Cell & Organelle Multi-Model Exploration | F1-F7 (cell-3d) | High |
| 2 | Predator-Prey Dynamics & Biodiversity Stability | F8-F11 (foodChain) | High |
| 3 | Lindeman 10% Energy Transfer Law & Heat Dissipation | F12-F14 (energyPyramid) | Medium |
| 4 | Taiwan Wetland Food Chain Board Adventure | F15-F16 (OmNomNom) | High |
| 5 | Integrated Biology Curriculum Continuum | F1-F19 (Cross-module) | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature group (R1: 40 tests, R2: 27 tests)
- Tier 2: ≥5 boundary/corner cases per feature group (R1: 40 tests, R2: 25 tests)
- Tier 3: Pairwise coverage across navigation, state changes, asset matrix, and Web Audio APIs (R1: 6 tests, R2: 6 tests)
- Tier 4: ≥5 realistic curriculum classroom inquiry scenarios per round (R1: 5 tests, R2: 5 tests)

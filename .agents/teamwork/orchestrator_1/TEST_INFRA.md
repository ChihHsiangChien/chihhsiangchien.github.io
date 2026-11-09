# E2E Test Infra: Five Sensory Receptors Dynamic Conduction Simulator

## Test Philosophy
- Opaque-box, requirement-driven testing. No reliance on internal variable names, but verifying standard DOM interfaces and runtime behaviors.
- 4-Tier test architecture:
  - Tier 1: Feature Coverage (5 receptors, 4 conduction phases, playback play/pause, speed controls, bidirectional links)
  - Tier 2: Boundary & Corner Cases (slider extremes 0.0 and 1.0, rapid state toggling, viewport RWD meta tags)
  - Tier 3: Cross-Feature Interactions & Node.js VM Runtime Integrity (zero syntax errors, zero uncaught runtime exceptions)
  - Tier 4: Real-world pedagogical inquiry scenarios & curriculum anatomical terminology checks
  - Tier 5 (Phase 2): Adversarial coverage hardening and fuzzing

## Feature Inventory Mapping
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------|:------:|:------:|:------:|:------:|
| 1 | 視覺受器傳導模擬 | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 2 | 聽覺受器傳導模擬 | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 3 | 嗅覺受器傳導模擬 | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 4 | 味覺受器傳導模擬 | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 5 | 皮膚受器傳導模擬 | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 6 | 播放與暫停控制 | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| 7 | 進程倍速調整 | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| 8 | 尋軌與單步導引 | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| 9 | 雙向導覽整合 | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ | ✓ |

## Test Runner & Execution
- Harness: Python `unittest` with ephemeral static HTTP server + BeautifulSoup + Node.js VM runtime checker.
- Target file: `tests/test_receptors_conduction.py`
- Invocation command: `python -m unittest tests/test_receptors_conduction.py`

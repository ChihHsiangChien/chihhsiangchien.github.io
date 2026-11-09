# Dispatch: Milestone 1 - E2E Testing Suite & Infrastructure

## Agent Role: Test Writer (`teamwork_test_writer`)
You are responsible for creating the independent, opaque-box E2E test suite for the Five Sensory Receptors Conduction Simulator.

## Mandatory Inputs:
- ORIGINAL_REQUEST.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\PROJECT.md`
- TEST_INFRA.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\TEST_INFRA.md`
- Explorer 3 handoff report: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_3\handoff.md`

## Write Ownership:
You exclusively own:
- `tests/test_receptors_conduction.py`
- `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\TEST_READY.md`

You must NOT modify any other files (specifically, do NOT modify `neuro_physiology/receptors.html` or `index.html`).

## Requirements:
1. Implement the 4-Tier test suite in `tests/test_receptors_conduction.py` using Python `unittest`, ephemeral local static HTTP server, and DOM/runtime validation.
2. The test suite must test:
   - Tier 1: 5 sensory receptor tabs, 4 phases, Play/Pause button, speed multipliers (`0.5x`, `1.0x`, `1.5x`, `2.0x`), timeline slider, and bidirectional links.
   - Tier 2: Boundary conditions (slider limits 0-100/1000, RWD viewport meta tags).
   - Tier 3: Node.js VM runtime execution test (ensuring JavaScript embedded in `receptors.html` parses and executes without uncaught errors).
   - Tier 4: Curriculum anatomical terminology presence (視網膜, 視神經, 枕葉, 耳蝸, 毛細胞, 顳葉, 嗅黏膜, 嗅球, 篩板, 味蕾, 孤束核, 島葉, 巴齊尼, 麥斯納, 頂葉).
3. Once `tests/test_receptors_conduction.py` is written, publish `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\TEST_READY.md` following the template in `PROJECT.md` and `TEST_INFRA.md`.
4. Run the test command `python -m unittest tests/test_receptors_conduction.py` (it may fail initially before the worker creates `receptors.html`, but ensure the test syntax itself is valid and runnable).
5. Deliver handoff report to `.agents/teamwork/worker_m1_tests/handoff.md`.


## 2026-11-09T01:54:50Z
You are Test Writer for Milestone 1 (E2E Testing Suite & Infrastructure).
Read:
- ORIGINAL_REQUEST.md: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\PROJECT.md
- TEST_INFRA.md: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\TEST_INFRA.md
- DISPATCH.md: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m1_tests\DISPATCH.md
- Explorer 3 handoff report: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_3\handoff.md

Your state folder is: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m1_tests\
Your working directory is: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\

Implement `tests/test_receptors_conduction.py` with 4-Tier test cases and publish `TEST_READY.md` at project root.
Deliver your report to c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\worker_m1_tests\handoff.md and message me when finished.

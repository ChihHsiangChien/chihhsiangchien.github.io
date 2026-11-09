# Dispatch: Milestone 3 - Bidirectional Navigation Integration

## Agent Role: Worker (`teamwork_worker`)
You are responsible for integrating bidirectional navigation links between the new sensory receptors simulator and the existing projects.

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Inputs:
- ORIGINAL_REQUEST.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\orchestrator_1\PROJECT.md`
- TEST_READY.md: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\TEST_READY.md`

## Write Ownership:
You exclusively own:
- `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology\index.html`
- `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\index.html`

You must NOT modify `receptors.html` or `tests/`.

## Requirements:
1. In `neuro_physiology/index.html`:
   - In the top header navigation alongside `../neural_pathway/index.html` and `../action_potential/index.html` (around lines 70-80), add a matching navigation pill:
     `<a href="receptors.html" class="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-200 text-xs font-bold transition flex items-center space-x-1.5 shadow" title="切換至五大感覺受器動態傳導模擬（視覺、聽覺、嗅覺、味覺、皮膚）"><span>👁️👂 五大感覺受器</span></a>`
2. In root `index.html`:
   - Locate the `<h1>神經與感覺</h1>` section (around line 161).
   - Add the link:
     `<a href="neuro_physiology/receptors.html">五大感覺受器動態傳導模擬 (視覺、聽覺、嗅覺、味覺、皮膚之刺激、受器、神經至大腦)</a>`
3. Verification:
   - Run `python -m unittest tests/test_receptors_conduction.py`
   - Confirm that ALL 30 tests now pass with 0 failures! (100% test pass rate!)
4. Deliver your complete handoff report to:
   `.agents/teamwork/worker_m3_nav/handoff.md`
   and notify me.


## 2026-11-09T02:09:25Z
You are Worker for Milestone 3 (Bidirectional Navigation Integration).
MANDATORY INTEGRITY WARNING: DO NOT CHEAT.
Owner files:
- c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology\index.html
- c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\index.html
Mount navigation links and verify 30/30 tests pass.

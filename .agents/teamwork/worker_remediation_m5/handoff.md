# Remediation Report: Neutrophil & B-Cell Transendothelial Pore Transit State Machine

**Date**: 2026-11-10T02:18:45Z  
**Agent**: Remediation Worker (`teamwork_worker`)  
**Milestone**: Milestone 5 Phase 2 Adversarial Hardening  
**Target Files**: `microDefend/script.js`, `tests/test_challenger2_invariants.py`  

---

## 1. Observation

1. **Defect Reported by Challenger 2**:
   - In `microDefend/script.js`, mobilized neutrophils and migrating B cells approaching endothelial pores entered a distance trap once `sn.squeezing` / `bc.squeezing` became true.
   - Specifically, for neutrophils, once `dist <= 8` was reached, `sn.squeezing` was set to `true`, advancing `sn.y += 0.8 * simSpeed`. However, as soon as `sn.y` exceeded `targetPoreY + 8`, the distance formula `dist = Math.hypot(dx, dy)` exceeded 8.
   - Because the state check `if (dist > 8)` was executed without checking `sn.squeezing`, the code re-entered the approach branch on the next frame, where `dy = targetPoreY - sn.y < 0` decremented `sn.y`, pulling the cell backward into the pore.
   - As a consequence, 0 out of 24 mobilized neutrophils ever completed intravasation into the sinusoid, and B cells similarly oscillated without reaching `y >= 242`.

2. **Remediation Implementation in `microDefend/script.js`**:
   - **B-Cell Transit State Machine** (lines 7994–8026):
     Prioritized `else if (bc.squeezing)` before the un-squeezed distance approach `else` block:
     ```javascript
     } else if (bc.squeezing) {
         // Squeezing through Pore 1 into marrow blood stream
         bc.x += 0.35 * simSpeed;
         bc.y += 0.45 * simSpeed;
         if (bc.y >= 242) {
             bc.squeezing = false;
             bc.inSinusoid = true;
             spawnP4Label(bc.x, bc.y - 14, "成熟B細胞跨內皮出髓 ➔ 巡邏全身！", "#fb923c");
         }
     } else {
         // Non-intravasated B cells migrating along pipeline toward Pore 1 (x: 358, y: 225)
         const targetX = 358;
         const targetY = 225;
         const dx = targetX - bc.x;
         const dy = targetY - bc.y;
         const dist = Math.hypot(dx, dy);

         if (dist > 6) {
             bc.x += (dx / dist) * 0.42 * simSpeed;
             bc.y += (dy / dist) * 0.42 * simSpeed;
         } else {
             // Squeezing through Pore 1 into marrow blood stream
             bc.squeezing = true;
             bc.angle = Math.atan2(dy, dx);
             bc.x += 0.35 * simSpeed;
             bc.y += 0.45 * simSpeed;
             if (bc.y >= 242) {
                 bc.squeezing = false;
                 bc.inSinusoid = true;
                 spawnP4Label(bc.x, bc.y - 14, "成熟B細胞跨內皮出髓 ➔ 巡邏全身！", "#fb923c");
             }
         }
     }
     ```
   - **Neutrophil Transit State Machine** (lines 8072–8104):
     Prioritized `if (sn.squeezing)` inside `else if (sn.mobilized)`:
     ```javascript
     } else if (sn.mobilized) {
         if (sn.squeezing) {
             const targetPoreY = (sn.origX < 730) ? 272 : 275;
             sn.x += 0.4 * simSpeed;
             sn.y += 0.8 * simSpeed;
             if (sn.y >= targetPoreY + 12) {
                 sn.squeezing = false;
                 sn.inSinusoid = true;
             }
         } else {
             // Moving toward transcellular pores: Pore 2 (x: 642, y: 272) or Pore 4 (x: 798, y: 275)
             const targetPoreX = (sn.origX < 730) ? 642 : 798;
             const targetPoreY = (sn.origX < 730) ? 272 : 275;
             const dx = targetPoreX - sn.x;
             const dy = targetPoreY - sn.y;
             const dist = Math.hypot(dx, dy);

             if (dist > 8) {
                 sn.x += (dx / dist) * 1.6 * simSpeed;
                 sn.y += (dy / dist) * 1.6 * simSpeed;
             } else {
                 // Squeezing through pore with hourglass waist
                 sn.squeezing = true;
                 sn.angle = Math.atan2(dy, dx);
                 sn.x += 0.4 * simSpeed;
                 sn.y += 0.8 * simSpeed;
                 if (sn.y >= targetPoreY + 12) {
                     sn.squeezing = false;
                     sn.inSinusoid = true;
                 }
             }
         }
     }
     ```

3. **Test Suite Verification in `tests/test_challenger2_invariants.py`**:
   - Updated `test_identify_pore_intravasation_oscillation_flaw` to verify:
     - AST and code content verification ensuring `if (sn.squeezing)` and `else if (bc.squeezing)` are present in `microDefend/script.js`.
     - Simulation of the fixed state machine over 500 frames, verifying `intravasated_count == 24` (and `> 15`).

---

## 2. Logic Chain

1. **Hypothesis**: The root cause of zero neutrophil intravasation was the re-evaluation of entry distance while cells were in the active squeezing state.
2. **Mechanism**:
   - By separating the transit logic into distinct mutually exclusive phases:
     - Phase A (Approach): Cells approach pore coordinates while `!squeezing`.
     - Phase B (Transit): Once `squeezing == true`, the cell advances unidirectionally along the transmigration vector until clearing the basement membrane (`y >= targetPoreY + 12` for neutrophils, `y >= 242` for B cells).
     - Phase C (Circulation): Once `inSinusoid == true`, cells enter sinusoidal bloodstream laminar flow.
3. **Execution**:
   - In both B cells and neutrophils, checking `squeezing` first guarantees that distance calculations to the pore mouth never interrupt active transendothelial transit.
   - When 24 neutrophils are mobilized, all 24 reach the pore, squeeze through with hourglass deformation, enter the sinusoid, and drain into circulation.
   - In live headless Chrome CDP execution (`tests/test_challenger2_cdp.js`), mobilized cells actively transmigrate and drain out, reducing storage pool count from 24 to 15 within 3 seconds, confirming physiological dynamic clearing.

---

## 3. Caveats

- **Visual Deformation**: The cell hourglass scaling `scale(0.65, 1.45)` during `squeezing` is preserved as originally designed; cells smoothly return to spherical morphology upon switching to `inSinusoid = true`.
- **Replenishment Rate**: As storage neutrophils drain out, the storage pool drops below 50, triggering the physiological replenishment mechanism at line 8114 (`tab4State.cycleTick % 30 === 0`) to maintain marrow homeostasis.

---

## 4. Conclusion

The pore transit state machine defect is completely resolved. Both neutrophil and B-cell intravasations proceed reliably without harmonic traps or infinite oscillations. All 4 automated test suites (Python invariant verification, Python unit test suite, Node CDP E2E suite, and Challenger 2 live browser CDP suite) pass with 100% success.

---

## 5. Verification Method

To independently reproduce and verify this remediation:

1. **Python Invariant Suite**:
   ```powershell
   & 'C:\Users\user\miniconda3\python.exe' tests/test_challenger2_invariants.py
   ```
   *Expected*: `Ran 12 tests in 0.128s - OK`

2. **Python Unit Test Suite**:
   ```powershell
   & 'C:\Users\user\miniconda3\python.exe' -m unittest tests/test_microdefend_e2e.py
   ```
   *Expected*: `Ran 15 tests in 1.078s - OK`

3. **Node CDP E2E Automation Suite**:
   ```powershell
   & 'C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe' tests/test_cdp_e2e.js
   ```
   *Expected*: `Total Checks Executed : 18, Passed Checks : 18 (100%), Failed Checks : 0`

4. **Node CDP Challenger 2 Live Browser Suite**:
   ```powershell
   & 'C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe' tests/test_challenger2_cdp.js
   ```
   *Expected*: `Total Checks : 5, Passed : 5, Failed : 0`
   *Live Observation*: `Mobilized neutrophils in transit` actively clearing and decreasing from 24.

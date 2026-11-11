# Handoff Report — Anatomical & Visual Style Explorer Survey

**Agent**: Explorer 2 (Anatomical & Visual Style Explorer)  
**State folder**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_2\`  
**Date**: 2026-11-10  
**Target Milestone**: Phase 0 (Exploration & Visual Survey)  

---

## 1. Observation

Direct code observations from `microDefend` codebase:

1. **Initial Lymphatic Capillary Geometry and Coordinates in Page 1**:
   - `index.html:355-367`:
     ```html
     <!-- Dermal Initial Lymphatics (微淋巴管盲端與淋巴引流通道) -->
     <g id="lymphatic-vessel-group">
         <path id="lymph-capillary-lumen" d="M 1000 248 C 940 248, 900 256, 868 268 C 900 280, 940 288, 1000 288 Z"
             fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" stroke-width="1.8" stroke-dasharray="6,3" />
         ...
         <g id="lymph-flow-indicators" opacity="0.75">
             <polygon points="940,268 930,263 930,273" fill="#34d399" opacity="0.7" />
             <polygon points="975,268 965,263 965,273" fill="#34d399" opacity="0.7" />
         </g>
     </g>
     ```
   - In `script.js:162-163`:
     ```javascript
     const LYMPH_VESSEL_X = 885;
     const LYMPH_VESSEL_Y = 268;
     ```
   - In `script.js:4816-4826`:
     ```javascript
     } else if (w.state === 'lymph_draining') {
         w.x += (w.flowSpeed || 2.0) * simSpeed;
         w.y += (LYMPH_VESSEL_Y - w.y) * 0.05 * simSpeed;
         w.alpha = (w.alpha !== undefined ? w.alpha : 1) - 0.018 * simSpeed;
         w.r = Math.max(3.5, w.r * 0.985);
         if (w.alpha <= 0.05 || w.x >= 995) {
             activeTissueWBCs.splice(i, 1);
             continue;
         }
     }
     ```
   - The lymphatic vessel starts with a blind end at `(868, 268)`, top wall reaches `(1000, 248)` and bottom wall reaches `(1000, 288)`. Central exit axis is `y = 268`, with rightward velocity `vx > 0, vy ≈ 0`.

2. **Red Blood Cell Specs**:
   - Intravascular: `script.js:1763-1766`: `<circle r="4.8" fill="#ef4444" opacity="0.9">`.
   - Extravasated/bleeding: `script.js:2253-2263`: Outer `<ellipse rx="4.8" ry="3.26" fill="#dc2626" stroke="#7f1d1d" stroke-width="1">`, inner concave dimple `<ellipse rx="2.16" ry="1.44" fill="#991b1b" opacity="0.75">`.
   - Platelet plug trapped: `script.js:2123-2127`: `<ellipse cx="-2" cy="-1" rx="5" ry="3.2" fill="#dc2626">`.

3. **White Blood Cell Subtypes, Radii, Colors and Nuclei**:
   - `script.js:5055-5067`:
     - neutrophil: `#38bdf8`, monocyte: `#c084fc`, macrophage: `#a855f7`, eosinophil: `#fb7185`, basophil: `#475569`, bcell: `#fb923c`, tcell: `#34d399`, nk: `#22d3ee`.
   - `script.js:5095-5119`:
     - neutrophil nucleus: 3 lobes `<circle r="2.2" fill="#0369a1">` at `(-2.5, -2)`, `(2.5, -2)`, `(0, 2.5)`.
     - eosinophil nucleus: 2 lobes `<circle r="2.5" fill="#881337">` at `(-3, 0)`, `(3, 0)`.
     - macrophage/monocyte nucleus: offset `<circle cx="-1" cy="0" r="r*0.45" fill="#581c87">`.
     - lymphocyte/bcell/tcell/nk nucleus: `<circle cx="0" cy="0" r="r*0.55" fill="rgba(0,0,0,0.4)">` or `#c2410c` / `#047857`.
   - Radii: neutrophil `7.5`, monocyte `8.5`, macrophage `11.5`, eosinophil `7.8`, basophil `7.8`, bcell `8.0`, tcell `7.8`, nk `7.8`.
   - Amoeboid rendering: `script.js:1137-1194`, `2486-2525`: 12-point spline with pseudopod extension, diapedesis waist narrowing (`squeezeWaist = 0.42`), white stroke `#ffffff` width `1.4`.
   - APC marker: `script.js:4903-4908`: halo radius `w.r + 4.5`, dashed stroke `#34d399` (`apc_migrating`) or `#10b981` (`lymph_draining`).

4. **Pathogens and Debris**:
   - Bacteria: `script.js:2301-2327`: `<rect x="-9" y="-4.5" width="18" height="9" rx="4.5" fill="#27ae60" stroke="#1e824c" stroke-width="1.5">`, with `BAC_AB_PATHS` for 1-6 attached Y antibodies.
   - Virus: `script.js:2335-2368`: `<circle r="5.5" fill="#8e44ad" stroke="#6c3483">`, 6 spikes extending `2.5px` (`VIR_SPIKES_PATH`), with `VIR_AB_PATHS` for 1-4 neutralizing antibodies.
   - Parasite: `script.js:2376-2396`: body `<path stroke-width="12" stroke="#b7950b">`, core `<path stroke-width="3" stroke="#7d6608">`.
   - Debris: `script.js:2281-2285`: `<polygon fill="#64748b" stroke="#94a3b8" stroke-width="1">` with 5-7 random vertices (`r=5~8`).

5. **Endothelial Cells & Vascular Structure**:
   - `script.js:1725-1745`: `<rect height="8" rx="3.5" fill="#f87171" stroke="#991b1b" stroke-width="1">`, nucleus `<ellipse rx="4.5" ry="2.2" fill="#7f1d1d">`.
   - Smooth muscle: `script.js:1642-1665`: `<rect width="18" rx="4.5" fill="#d9480f" stroke="#ff922b" stroke-width="1.1">`.
   - Sphincters: `script.js:1686-1701`: `<rect width="14" rx="3.5" fill="#c92a2a" stroke="#ff8787">`.

6. **Fluids, Droplets and Antibodies**:
   - Interstitial / filtering droplets: `script.js:2824, 2888, 2913`: `r=2.7`, fill `#38bdf8` (filtering/draining) or `#bae6fd` (bathing `r=2.7~3.6`).
   - Histamine: `script.js:4155`: `r=2.5`, fill `#38bdf8`.
   - Eosinophil granules: `script.js:4162`: `r=2.8`, fill `#f43f5e`.
   - Antibodies: `script.js:2423-2439`: Y-shaped path `M 0 4.5 L 0 0 L -3.5 -3.5 M 0 0 L 3.5 -3.5`, primary orange `#f97316` width `1.5`, secondary gold `#fbbf24` width `2.2`.

---

## 2. Logic Chain

1. **Premise 1 (Spatial Continuity)**: Page 1 drains lymph and APCs out of the view at `x=1000, y=268` via a翠綠色 initial lymphatic vessel. To make the educational experience seamless, Page 2's primary afferent lymphatic vessel must enter at `x=0, y=268`, with identical width (`40px`) and green dashed border (`#10b981`), leading directly into the subcapsular sinus (Obs 1).
2. **Premise 2 (Immunological Cascade Continuity)**: In Page 1, when bacteria or viruses are phagocytosed by macrophages, they transition to `apc_migrating`, acquire a green MHC-II halo, enter the lymph capillary, and flow towards the lymph node (Obs 1 & 3). In Page 2, these exact APCs must emerge from the afferent lymphatic into the subcapsular sinus, crawl into the paracortex, present to Helper T cells, and activate the Germinal Center (Obs 3).
3. **Premise 3 (Hemodynamic & Visual Fidelity)**: Page 3 and Page 4 involve large veins and bone marrow sinusoids. The endothelial cell style (`#f87171` fill, `#991b1b` stroke, `#7f1d1d` nucleus), RBC style (`#ef4444` / biconcave `#dc2626`), and WBC styles must be preserved verbatim to ensure cross-page unity (Obs 2, 3, 5).
4. **Premise 4 (Memory Loop Closure)**: Page 1 features a toggle for bacterial and viral immune memory (`toggle-memory-bacteria`, `toggle-memory-virus`) that releases secondary golden antibodies (`#fbbf24`) from the left arteriole. In biological reality, these basal serum antibodies are produced by long-lived plasma cells (LLPCs) homing in bone marrow niches. Documenting Page 4's LLPC "sanctuary & factory" directly explains the biological origin of Page 1's arterial antibody influx, closing the physiological loop (Obs 6).

---

## 3. Caveats

1. **Canvas ViewBox Assumptions**: Page 1 uses viewBox `0 -65 1000 565`. For Pages 2, 3, and 4, viewBox `0 0 1000 600` is recommended for clean layout; if so, coordinate y=268 aligns near the upper-middle vertical axis, which fits a kidney-shaped lymph node comfortably.
2. **Performance Scaling**: In Page 3 and Page 4, cell densities (e.g. hundreds of RBCs in venous laminar flow, thousands of mature neutrophils in the marrow storage pool) require zero-allocation rendering pools (similar to Page 1's `bleedPool`, `wbcSpherePool`) or grouped SVG instancing to maintain 60 FPS.
3. **No Code Implementation**: In accordance with the Explorer role constraints, no source code files in `microDefend/` have been modified during this turn. All findings and directives are documented in `report.md`.

---

## 4. Conclusion

1. The visual styling and anatomical asset inventory of Page 1 is fully cataloged with exact hex color codes, SVG parameters, and dynamic morphology rules.
2. The anatomical layouts and physiological mechanisms for Page 2 (Lymph node), Page 3 (Lymphatic ducts & vein confluence), and Page 4 (Bone marrow hematopoiesis & immune memory) are rigorously detailed in `report.md`.
3. Spatial alignment conditions between Page 1 and Page 2 are mathematically locked at `(x=1000, y=268) ➔ (x=0, y=268)` with rightward flow vector.
4. The visual report `report.md` serves as the authoritative anatomical and visual blueprint for the implementation track.

---

## 5. Verification Method

To independently verify the observations and data in this report:

1. **Verify Initial Lymphatic Coordinates in Page 1**:
   Run:
   ```powershell
   Select-String -Path "microDefend\index.html" -Pattern "lymph-capillary-lumen" -Context 2,4
   Select-String -Path "microDefend\script.js" -Pattern "LYMPH_VESSEL_" -Context 1,2
   ```
   Check that `x=868, y=268` and `1000 248 ... 1000 288` match Section 1.1.

2. **Verify WBC Colors and Nuclei in Page 1**:
   Run:
   ```powershell
   Select-String -Path "microDefend\script.js" -Pattern "getWbcColor" -Context 1,12
   Select-String -Path "microDefend\script.js" -Pattern "drawWbcNucleus" -Context 1,24
   ```
   Check that all 8 WBC subtypes match Section 1.3.

3. **Verify Endothelial and RBC Specifications**:
   Run:
   ```powershell
   Select-String -Path "microDefend\script.js" -Pattern "createBranchEndoCell" -Context 1,18
   Select-String -Path "microDefend\script.js" -Pattern "renderPooledBleedRbc" -Context 1,20
   ```
   Check that `#f87171`, `#991b1b`, `#7f1d1d`, and `#dc2626` match Section 1.2 and 1.5.

4. **Invalidation Condition**:
   If any of the quoted line numbers or hex colors in `report.md` do not match `microDefend/index.html` or `microDefend/script.js`, this survey's inventory table must be corrected accordingly.

# Handoff Report — 3D Cell & Organelle Survey (R1 `cell-3d/`)

**Agent ID**: `explorer_survey_r2_1`  
**Working Directory**: `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_1/`  
**Handoff Type**: Hard Handoff (Investigation & Survey Complete)  
**Target Milestone**: Round 2 Requirement R1 (`cell-3d/`) Implementation  

---

## 1. Observation

1. **`threeJsModel/` files**:
   - `threeJsModel/animalCell.html` (522 lines): Uses Three.js r158 ES module via unpkg importmap (`https://unpkg.com/three@0.158.0/build/three.module.js`). Geometries for membrane, nucleus, 6 mitochondria capsules, ER tori, Golgi cylinder stacks, and lysosomes are procedurally generated. Features Raycaster on `mousemove` with tooltip projection.
   - `threeJsModel/animalCell_cutaway.html` (558 lines): Uses Three.js r158 ES module. Defines local clipping planes:
     ```javascript
     renderer.localClippingEnabled = true;
     const clippingPlanes = [
         new THREE.Plane( new THREE.Vector3( -1, 0, 0 ), 0 ),
         new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), 0 )
     ];
     ```
     Creates 1/4 wedge cutaway with blue outline tubes (`TubeGeometry`) along the cut edges and a `BackSide` cytoplasm inner shell (`SphereGeometry(CELL_RADIUS * 0.99)`).
   - `threeJsModel/mitochondria.html` (258 lines): Lines 1-6 contain syntax errors:
     ```html
     1: <!DOCTYPE html>
     2: <html lang="zh-TW">
     3: <head>
     4:     <meta charset="UTF-8">
     5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     6:         // --- 產生隨機loop管狀路徑 ---
     ```
     Lacks `<script>` wrapper and Three.js imports, making it unrunnable.
   - `threeJsModel/membrane copy.html` (118 lines): Uses Three.js r128 UMD script. Creates 10x10 upper and 10x10 lower phospholipid bilayer. Each phospholipid has 1 sphere head and only 1 cylinder tail with `MeshBasicMaterial`. Lacks membrane proteins, glycoproteins, and cholesterol.
   - `threeJsModel/rbc.html` and `rbc.js` (21+91 lines): Custom `BufferGeometry` using the formula:
     ```javascript
     const z = Math.sin(r * Math.PI / radius) * thickness * Math.exp(-r * r / (radius * radius));
     ```
     Renders a biconcave disk with `MeshPhongMaterial({ color: 0xff0000, shininess: 50 })`. Lacks mouse/touch `OrbitControls`.

2. **`3Dcell/` files**:
   - `3Dcell/main.js` (290 lines): Implements mitochondria cristae using Three.js `MarchingCubes` addon with resolution 80x80x80 (512,000 voxels). Computes metaballs on CPU across 40 point centers ($O(80^3 \times 40) \approx 20.48 \text{ million operations}$) on slider input, causing severe CPU lag and frame drops.
   - `3Dcell/rbc.js` (215 lines): Despite the filename, it is an earlier resolution-40 Marching Cubes mitochondria implementation.
   - `3Dcell/webgl_marchingcubes.html` (339 lines): Experimental demo testing sine-wave blob generation for Marching Cubes.

3. **`insideTheCell/` files**:
   - `insideTheCell/script.js` (588 lines): Clean ES module (Three.js r160). Procedurally generates:
     - Mitochondria: Outer capsule, inner capsule, 18 `CatmullRomCurve3` + `TubeGeometry` cristae folds, internal matrix, and 12 granule spheres.
     - Chloroplast: Flattened sphere outer/inner envelopes, 4 stacks of grana with 7-9 thylakoid disc cylinders each (`CylinderGeometry(0.5, 0.5, 0.1, 16)`).
     - Cross-section clipping plane toggle: `globalPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5)` with `renderer.localClippingEnabled`.
   - `insideTheCell/tempcode.js` (10 lines): Torus knot circular DNA snippet (`TorusKnotGeometry(1, 0.1, 64, 8, 2, 3)`).

4. **Zero external asset dependencies**:
   Searching for `.gltf`, `.glb`, `.obj`, `.json`, `.png`, `.jpg` across `threeJsModel/`, `3Dcell/`, and `insideTheCell/` returned 0 files. All existing models are 100% procedurally generated via Three.js code.

5. **`ORIGINAL_REQUEST.md` Follow-up 2026-10-23T09:35:29Z R1 requirement**:
   - Target directory: `cell-3d/` with `index.html`, `style.css`, `main.js`.
   - 5 models to integrate:
     1. Animal cell panorama & major organelles
     2. Mitochondria 3D structure & cristae cross-section
     3. Chloroplast 3D structure & stroma/grana/thylakoid cross-section
     4. Red blood cell biconcave disk 3D model
     5. Cell membrane phospholipid bilayer & fluid mosaic model
   - UI: Modern tab/menu switcher, organelle info floating cards with Chinese annotations, camera reset button, orbit controls with mouse & touch.
   - Old directory compatibility / redirect links.

---

## 2. Logic Chain

1. **Geometry Strategy Selection**:
   - Observation: `3Dcell/main.js` Marching Cubes incurs ~20M calculations per update, causing CPU freezes on mobile. In contrast, `insideTheCell/script.js` curve tubes and `threeJsModel/animalCell_cutaway.html` clipping planes render consistently at 60 FPS with minimal memory footprint.
   - Deduction: For `cell-3d/`, Marching Cubes should **not** be used for runtime geometry. Instead, use spline curves (`CatmullRomCurve3` + `TubeGeometry`) and procedural buffers for cristae, grana discs, and RBC biconcave disks to ensure cross-device 60 FPS performance.

2. **Model Reusability & Enhancement**:
   - Observation: `threeJsModel/animalCell_cutaway.html` has an effective 1/4 wedge cutaway using two orthogonal clipping planes ($X>0$, $Z>0$) and blue tube outlines.
   - Deduction: This exact 1/4 cutaway mechanism can be ported to `cell-3d/` animal cell model with a toggle button between "完整外觀 (Full)" and "1/4 剖面 (Wedge Cut)".
   - Observation: `threeJsModel/membrane copy.html` is an incomplete single-tail bilayer with no proteins.
   - Deduction: The fluid mosaic model in `cell-3d/` must be expanded to include two fatty acid chains per phospholipid head, transmembrane protein channels, peripheral proteins, glycoproteins, and cholesterol molecules, with gentle undulating wave animation.
   - Observation: `threeJsModel/rbc.js` has a clean sine-exponential profile but lacks OrbitControls and has a sharp rim normal.
   - Deduction: The RBC model in `cell-3d/` can enhance this formula into a smooth biconcave manifold `BufferGeometry` paired with glossy red `MeshPhysicalMaterial` and interactive OrbitControls.

3. **UI / UX Architecture**:
   - Observation: Existing pages either lack Chinese annotations (`insideTheCell/`, `threeJsModel/`) or have no model switching UI (`rbc.html`, `membrane copy.html`).
   - Deduction: `cell-3d/` requires a unified top tab switcher (5 tabs), a glassmorphic floating scientific explanation card with Chinese biological descriptions, a 3D label toggle, an auto-rotation toggle, and a camera reset button.

4. **Zero-Build & Zero-Asset Architecture**:
   - Observation: The site is hosted statically on GitHub Pages (`chihhsiangchien.github.io`). Zero asset files in the source directories means no 404 risks for model files.
   - Deduction: Building `cell-3d/` with procedural Three.js r160 ES modules via standard `<script type="importmap">` ensures maximum maintainability, instant loading, and zero build tool prerequisites.

---

## 3. Caveats

1. **Old directories**: Existing folders (`threeJsModel/`, `3Dcell/`, `insideTheCell/`) should be preserved rather than deleted to prevent breaking any existing user bookmarks; each should receive a redirection or upgrade banner pointing to `../cell-3d/index.html`.
2. **Plant Cell in Animal Cell Panorama**: Follow-up R1 specifically requests "動物細胞全景與主要胞器" (Animal cell panorama) as Model 1, plus standalone organelle/membrane models (Mitochondria, Chloroplast, RBC, Fluid Mosaic Membrane). If desired, a plant cell mode can optionally be toggled in Model 1, but the primary focus must strictly fulfill the 5 required models.
3. **No caveats** regarding dependency availability or browser WebGL compatibility.

---

## 4. Conclusion

The existing 3D models across the three directories provide all necessary mathematical formulas and procedural patterns for `cell-3d/`, but they are currently fragmented, unlocalized, or technically deficient in isolation.

**Architectural Plan for `cell-3d/`**:
- **Entry**: `cell-3d/index.html` loading `main.js` via `<script type="importmap">` (Three.js r160).
- **Core Models (5 Switchable Tabs)**:
  1. `animalCell.js`: Panorama animal cell with toggleable 1/4 wedge cutaway and major organelles (Nucleus, Mitochondria, ER, Golgi, Lysosomes, Centrioles).
  2. `mitochondria.js`: Dual-membrane capsule with `CatmullRomCurve3` cristae folds, matrix, and `TorusKnot` mtDNA.
  3. `chloroplast.js`: Flattened envelope with multiple grana stacks (stacked thylakoids), bridging stroma lamellae, and stroma.
  4. `rbc.js`: High-precision biconcave disc with `MeshPhysicalMaterial` and gas exchange surface-area-to-volume ratio annotations.
  5. `membrane.js`: Fluid mosaic model with dual-tail phospholipid bilayer, transmembrane ion channels, peripheral proteins, glycoproteins, and cholesterol.
- **UI/UX**: Responsive HUD with top tab switcher, glassmorphic floating explanation cards in Traditional Chinese, reset camera, cutaway toggle, and full touch-action orbit controls.
- **Detailed report**: Complete file paths, formulas, and structural blueprints are documented in `survey_report.md`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - Verify that `/home/pancala/Documents/chihhsiangchien.github.io/.agents/teamwork/explorer_survey_r2_1/survey_report.md` exists and contains complete technical analysis of all files.
2. **Inspect Existing Files**:
   - View `threeJsModel/animalCell_cutaway.html` to confirm local clipping plane implementation.
   - View `insideTheCell/script.js` to confirm procedural cristae and grana stack implementation.
   - View `threeJsModel/rbc.js` to confirm the biconcave mathematical formula.
3. **Validate Downstream Acceptance Criteria**:
   - Once implemented in `cell-3d/`, verify by opening `cell-3d/index.html` in a web browser:
     - All 5 models switch cleanly without WebGL or console errors.
     - Mouse and touch controls rotate and zoom smoothly at 60 FPS.
     - Chinese annotations and cards display accurate biological data.

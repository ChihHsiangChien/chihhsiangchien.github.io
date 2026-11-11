# MicroDefend Codebase & Architecture Investigation Report

**Author**: Explorer 1 (Codebase & Architecture Explorer)  
**Date**: 2026-11-10  
**Target Codebase**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend`  
**State Folder**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_1\`

---

## Executive Summary

`MicroDefend` (微觀人體防線) is a pure vanilla JavaScript, CSS3, and SVG-based interactive biological simulation of the human microcirculation, tissue barrier, inflammation, coagulation, and immune response. 
The existing implementation is contained within three tightly coordinated files (`index.html`, `script.js`, `style.css`) with zero external asset dependencies (images, audio, or frameworks). It utilizes a high-performance **zero-allocation SVG element pooling architecture** driven by a single `requestAnimationFrame` simulation loop.

A crucial anatomical feature already present on Page 1 is the **dermal initial lymphatic capillary (微淋巴管盲端與引流管道)** at the bottom-right corner ($x = 868 \sim 1000$, $y = 248 \sim 288$). This structure features functional overlapping flap valves and dynamically drains interstitial fluid, bacteria, viruses, and MHC-II antigen-presenting cells (APCs). This report provides exact coordinates, path equations, entity lifecycle rules, and an architectural blueprint for seamless visual and physiological continuity with Page 2 (Lymph Node), Page 3 (Lymphatic Trunk & Venous Confluence), and Page 4 (Bone Marrow).

---

## 1. File Inventory & Assets

| File Path | Size (Bytes) | Line Count | Purpose & Technical Scope |
|---|---|---|---|
| `microDefend/index.html` | 29,862 | 442 lines | Main HTML5 shell, SVG `#inflammation-viz` canvas (`viewBox="0 -65 1000 565"`), header control bars, stats board, and responsive side control panel. |
| `microDefend/script.js` | 261,161 | 5,432 lines | Monolithic simulation engine: pan/zoom math, SVG pooling, coagulation finite state machine, dynamic vessel geometry, leukocyte chemotaxis/phagocytosis, pathogen division/infection, initial lymphatic drainage, and animation loop. |
| `microDefend/style.css` | 14,109 | 671 lines | Dark-mode physiological UI (`Outfit`, `Noto Sans TC`), responsive grid layout (`370px 1fr` transitioning to `1fr` below 1200px), glassmorphism cards, custom toggle switches, and SVG layer styling. |
| External Assets | None (Local) | N/A | No local `.png`, `.jpg`, `.svg`, or `.mp3` files. All cells, pathogens, vessels, nerves, and instruments are procedurally generated SVG vectors. Google Fonts CDN is used for typography. |

---

## 2. Rendering Engine, DOM Structure & Layer Hierarchy

### 2.1 Coordinate Systems & Canvas Dimensions

- **Root SVG Element**: `<svg id="inflammation-viz" viewBox="0 -65 1000 565" xmlns="http://www.w3.org/2000/svg">`
- **ViewBox Bounds**:
  - Horizontal ($X$): $0$ to $1000$ (Span: $1000$ units).
  - Vertical ($Y$): $-65$ to $500$ (Span: $565$ units).
- **Z-Plane Partitioning (World Y Coordinate System)**:
  1. $y \in [-65, 0]$: **External Environment / Atmosphere**. Displays background sky gradient (`#skyGrad`), external bacterial/viral landing zone, mucus fluid wave, and cilia protrusion.
  2. $y \in [0, 55]$: **Epithelial Barrier Zone**.
     - Left ($x \in [0, 500]$): Keratinized stratified squamous epidermis (Stratum corneum, spinosum, basale). Surface line at $y \approx 2$ (elevated by edema: `getSkinSurfaceY(x, swelling)`).
     - Right ($x \in [500, 1000]$): Ciliated columnar epithelium with mucus gel blanket and Goblet cells.
     - Divider ($x = 500$): Mucocutaneous junction dashed vertical line (`x1="500" y1="-28" x2="500" y2="55"`).
     - Basement Membrane: Dashed horizontal boundary at $y = 55$.
  3. $y \in [55, 300]$: **Dermis (Interstitial Connective Tissue Space)**.
     - Background: `#tissue-bg` (`M 0 55 L 1000 55 L 1000 300 L 0 300 Z`).
     - Contains: Collagen fibers, 12 tissue sites ($2 \times 6$ grid), unencapsulated nociceptor nerve plexus ($y \approx 76 \sim 245$), interstitial fluid bath layer, migrating leukocytes, and the initial lymphatic capillary ($x \in [868, 1000], y \in [248, 288]$).
  4. $y \in [300, 450]$: **Microcirculation Bed** (`#vessel-group` with `transform="translate(0, 300)"`).
     - Local $y \in [0, 150]$ corresponds to World $y \in [300, 450]$.
     - Feeding arteriole ($x \in [0, 140]$, local $y \approx 0 \sim 100$), precapillary sphincters ($x \in [168, 178]$), and three capillary branches (`top` local $y=20$, `mid` local $y=65$, `bot` local $y=110$).

### 2.2 Pan & Zoom Coordinate Transformation

- The SVG contains a master viewport group: `<g id="viewport-group" transform="matrix(scale 0 0 scale panX panY)">`.
- Mouse and touch coordinate transformation formula (`script.js:436-440`):
  $$\text{svgX} = \frac{e.\text{clientX} - \text{rect.left}}{\text{rect.width}} \times 1000$$
  $$\text{svgY} = -65 + \frac{e.\text{clientY} - \text{rect.top}}{\text{rect.height}} \times 565$$
  $$\text{worldX} = \frac{\text{svgX} - \text{panX}}{\text{scale}},\quad \text{worldY} = \frac{\text{svgY} - \text{panY}}{\text{scale}}$$
- This decouples screen pixel coordinates from SVG biological simulation coordinates.

### 2.3 DOM Layer Stacking Order (Back to Front)

Inside `#viewport-group`, layers are strictly ordered in the DOM to guarantee correct biological visual occlusion:

```
#viewport-group
 ├── rect (Sky / Atmosphere: y = -65..55)
 ├── #tissue-bg (Dermis base gradient: y = 55..300)
 ├── #collagen-fibers-group (Dermis wave striations)
 ├── #swelling-overlay (Orange edema tint, opacity 0..0.4)
 ├── #fluid-tank-bg-layer (Translucent blue interstitial water tank)
 ├── #epidermis-group (Epidermis layers, Mucosa cells, Cilia, Mucus layer)
 ├── #wound-cavity (Incision cut cavity from surface down to capillary)
 ├── #exposed-collagen-layer (Exposed collagen fibrils at wound edge)
 ├── #tissue-sites-layer (12 dermis somatic cells: nucleus, membrane, vacuoles)
 ├── #cell-debris-layer (Polygonal apoptotic cell fragments)
 ├── #pathogens-tissue-layer (Bacteria, viruses, parasites in dermis)
 ├── #nerve-network (Schwann cells, axon trunk, 6 free nerve branches & terminals)
 ├── #lymphatic-vessel-group (Initial lymphatic capillary lumen & flap valves)
 ├── #vessel-group (Arteriole wall, smooth muscle, sphincters, capillaries, blood cells)
 ├── #chemicals-layer (Histamines, eosinophil MBP granules, circulating antibodies)
 ├── #bleeding-layer (Extravasated RBCs during trauma)
 ├── #platelet-plug-layer (Adhering platelets & pseudopodia)
 ├── #fibrin-mesh-layer (Polymerized fibrin strands across wound)
 ├── #scab-layer (Crusty dried necrotic coagulum)
 ├── #scalpel-blade-layer (Animated surgical blade incision)
 ├── #fluid-arrows-layer (Endothelial cleft plasma filtration arrows)
 ├── #extravasated-layer (Interstitial fluid droplets)
 ├── #active-wbc-layer (Active roaming leukocytes in tissue)
 ├── #floating-labels-layer (Dynamic SVG text tag overlays)
 └── #anatomy-annotations (Anatomy explanatory callouts)
```

---

## 3. Page 1 Micro-Lymphatic Capillary (微淋巴管) & Page 2 Spatial Continuity

### 3.1 Exact Geometric & Visual Location on Page 1

In `index.html` (lines 356–367) and `script.js` (lines 161–163, 276–278, 3635–3680, 4802–4826):

```html
<g id="lymphatic-vessel-group">
    <!-- Capillary Lumen: Blind-ended bulb tapering to the right exit -->
    <path id="lymph-capillary-lumen" 
          d="M 1000 248 C 940 248, 900 256, 868 268 C 900 280, 940 288, 1000 288 Z"
          fill="rgba(16, 185, 129, 0.18)" 
          stroke="#10b981" 
          stroke-width="1.8" 
          stroke-dasharray="6,3" />
    <!-- Overlapping Endothelial Flap Valves (Minivalves) -->
    <path d="M 910 252 C 915 258, 920 262, 925 264" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
    <path d="M 950 250 C 955 256, 960 260, 965 263" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
    <path d="M 910 284 C 915 278, 920 274, 925 272" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
    <path d="M 950 286 C 955 280, 960 276, 965 273" stroke="#34d399" stroke-width="1.6" fill="none" opacity="0.85" />
    <!-- Rightward Flow Arrowheads -->
    <g id="lymph-flow-indicators" opacity="0.75">
        <polygon points="940,268 930,263 930,273" fill="#34d399" opacity="0.7" />
        <polygon points="975,268 965,263 965,273" fill="#34d399" opacity="0.7" />
    </g>
</g>
```

#### Key Geometric Parameters:
- **Blind Apex (Cul-de-sac Tip)**: Coordinate $(x = 868, y = 268)$.
- **Lumen Centerline**: Horizontal axis at $y = 268$.
- **Lumen Vertical Aperture at Canvas Edge ($x = 1000$)**:
  - Upper border: $(1000, 248)$
  - Lower border: $(1000, 288)$
  - Vessel diameter: $40\text{px}$ (from $y=248$ to $y=288$).
- **Endothelial Flap Valves**: Located along $x \in [910, 965]$, $y \in [250, 286]$. Represent primary lymphatic flap valves anchored by collagen anchoring filaments.
- **Visual Styling**: Translucent emerald green fill (`rgba(16, 185, 129, 0.18)`), `#10b981` border with `stroke-dasharray="6,3"` reflecting discontinuous basement membrane and high endothelial permeability.

### 3.2 Flow Dynamics & Entity Lifecycles Entering Lymphatics

1. **Interstitial Fluid Droplets (`fluidDroplets`)**:
   - Droplets bathe tissue sites ($x \in [65, 850]$).
   - Once entering the drain zone ($x > 850, y > 205$), droplets transition to `state = 'lymph_draining'`.
   - Outside lumen ($x < 868$): Drawn toward $(872, \text{targetValveY})$.
   - Inside lumen ($x \ge 868$): Velocity $v_x = (1.9 + 0.5 \cdot \text{isEdema}) \times \text{simSpeed}$, centered by $v_y = (268 - y) \times 0.06 \times \text{simSpeed}$.
   - At $x > 965$, alpha fades out; droplet is spliced out at $x \ge 1002$.

2. **Antigen-Presenting Cells (APCs - Macrophages / Dendritic Cells)**:
   - Upon phagocytosing bacteria or viruses during primary infection, macrophage switches to `state = 'apc_migrating'`.
   - Chemotactically crawls toward the valve target:
     $$x_{\text{target}} \in [876, 904],\quad y_{\text{target}} \in [257, 279]$$
   - When within $14\text{px}$ or $x \ge x_{\text{target}}$, transitions to `state = 'lymph_draining'`.
   - In lumen: flows rightward with $v_x = 2.0 \times \text{simSpeed}$, centered on $y = 268$.
   - Triggers `lymphNodeState.active = true` (initiating germinal center clonal expansion timer, $200$ frames).
   - APC scales down ($r \times 0.985$), fades out, and disappears at $x \ge 995$.

3. **Free Bacteria & Viruses**:
   - Bacteria entering $x \ge 875, y \in [250, 286]$ or viruses entering $x \ge 868, y \in [248, 288]$ transition to `state = 'lymph_draining'`.
   - They travel down the lumen ($v_x \approx 2.1 \times \text{simSpeed}, y \to 268$) and trigger lymph node activation upon reaching $x \ge 995$.

4. **Antibodies**:
   - Excess circulating antibodies reaching $x \ge 868, y \in [248, 288]$ drain into the lymphatics and are spliced out.

### 3.3 Spatial Continuity Blueprint for Page 2 (Lymph Node)

To achieve 100% spatial, geometrical, and physiological continuity between Page 1 and Page 2:

```
[PAGE 1: Dermis & Microcirculation]               [PAGE 2: Draining Lymph Node Scene]
SVG: viewBox="0 -65 1000 565"                     SVG: viewBox="0 -65 1000 565" (or matching)
                                               
           Initial Lymphatic Capillary                          Primary Afferent Lymphatic Vessel
           (Exit at Right Edge)                                 (Entry at Left Edge)
           ┌────────────────────────────┐       ───►       ┌────────────────────────────┐
y = 248 ───┤ Top wall: (1000, 248)      │    Continuity    │ Top wall starts: (0, 248)  ├───► Subcapsular Sinus
y = 268 ───┼ Centerline: y = 268        │   Seamless Flow  │ Centerline: y = 268        ├───► (被膜下竇)
y = 288 ───┤ Bottom wall: (1000, 288)   │   (Left to Right)│ Bottom wall starts: (0, 288)───► Cortex / Follicle
           └────────────────────────────┘                  └────────────────────────────┘
```

1. **Geometric Alignment**:
   - **Page 2 Afferent Vessel Entry**: Positioned exactly at $x = 0$, with upper wall at $(0, 248)$ and lower wall at $(0, 288)$ (height $= 40\text{px}$, centerline $y = 268$).
   - **Path Styling**: Matches Page 1 initial lymphatic styling (`rgba(16, 185, 129, 0.20)` fill, `#10b981` stroke), but transitions from dashed lines to solid lines with periodic bicuspid valves (二瓣型淋巴瓣膜), reflecting larger collecting lymphatic anatomy.
   - **Anatomical Extension**: Additional secondary afferent lymphatic vessels (e.g., entering from $(0, 100)$ or $(200, -65)$) can converge into the convex capsule of the lymph node, accurately depicting anatomical multi-inflow convergence.
2. **Direction of Flow**:
   - Flow vector remains consistently **left-to-right ($+X$)**.
   - Pathogens, fluid droplets, and APCs that exit Page 1 at $x=1000, y=268$ enter Page 2 at $x=0, y=268$ with the same velocity and appearance.
3. **Internal Lymph Node Architecture**:
   - **Subcapsular Sinus (被膜下竇)**: Encircles the convex margin, lined with subcapsular sinus macrophages capturing lymph-borne antigens.
   - **Cortex & B Cell Follicles (皮質濾泡與生發中心)**: Clonal selection, somatic hypermutation, B cell proliferation, differentiation into plasma cells.
   - **Paracortex (副皮質區 / T Cell Zone)**: High endothelial venules (HEVs), dendritic cell MHC-II antigen presentation to CD4+ Helper T cells and CD8+ Cytotoxic T cells.
   - **Medulla & Medullary Cords (髓質索與髓竇)**: Plasma cells releasing IgM/IgG antibodies, lymph filtration.
   - **Hilum & Efferent Lymphatic Vessel (淋巴門與輸出淋巴管)**: Single exit at the concave hilum on the right ($x \to 1000$), exiting towards Page 3.

---

## 4. Simulation & Animation Loop Mechanics

### 4.1 Loop Mechanism: `requestAnimationFrame` with Speed Accumulator

- The simulation uses pure `requestAnimationFrame` (`script.js:5039-5052`):
  ```javascript
  function animate() {
      animationId = requestAnimationFrame(animate);

      speedAccum += simSpeed;
      if (speedAccum < 1.0) return;

      let steps = 0;
      while (speedAccum >= 1.0 && steps < 2) {
          speedAccum -= 1.0;
          stepSimulation();
          steps++;
      }
      if (speedAccum > 2.0) speedAccum = 0;
  }
  ```
- **Execution Rate**:
  - `simSpeed = 0.5`: Advances 1 simulation step every 2 animation frames ($30\text{ Hz}$ on a $60\text{ Hz}$ display).
  - `simSpeed = 1.0`: Advances 1 simulation step per frame ($60\text{ Hz}$).
  - `simSpeed = 2.0`: Advances 2 simulation steps per frame ($120\text{ Hz}$).
- **Spiral-of-Death Protection**: Clamped to max 2 steps per rAF tick (`steps < 2`), and `speedAccum` resets to 0 if lagging beyond $2.0$.
- **No SVG SMIL**: SMIL is completely avoided due to severe browser memory leaks and lack of dynamic programmatic control.

### 4.2 Entity Update & Rendering Pipeline

The simulation follows a decoupled **State-Update $\to$ Zero-Allocation Pooling $\to$ Batch Render** architecture:

```
[requestAnimationFrame Tick]
      │
      ▼
stepSimulation()
      ├─► 1. resetAllSvgPools() (reset pool indices to 0)
      ├─► 2. Smooth physical parameters (arterioleWidth, sphincterTone, gapSize)
      ├─► 3. Advance lymphNodeState clonal expansion timer
      ├─► 4. Entity Behavioral Updates:
      │       ├─ 0. Interstitial fluid droplets (filtration, bathing, draining)
      │       ├─ A. Scalpel blade trajectory & wound cavity geometry
      │       ├─ B. Bleeding RBCs & platelet plug adhesion
      │       ├─ C-E. Fibrin polymerization & scab formation/detachment
      │       ├─ F. Dermis tissue cell mitosis, infection, cytolysis
      │       ├─ G. Cell debris degradation
      │       ├─ H. Pathogens: bacterial fission, viral cellular infection/budding, parasite crawling
      │       ├─ I. Chemical mediators: histamines, eosinophil granules, antibody navigation
      │       ├─ J. Leukocyte diapedesis through endothelial clefts
      │       ├─ K. Active tissue leukocytes: chemotaxis, phagocytosis, APC migration
      │       ├─ L. Intravascular blood flow & RBC circulation
      │       └─ M. Nociceptor pain pulse propagation
      ├─► 5. finalizeAllSvgPools() (hide unused DOM elements via display: 'none')
      └─► 6. updateStats() (throttled to 120ms intervals)
```

### 4.3 Zero-Allocation SVG Object Pools

Instead of creating and removing SVG DOM nodes dynamically:
- Eleven dedicated pools exist:
  - `dropletPool` (fluid droplets)
  - `bleedPool` (extravasated RBCs)
  - `debrisPool` (cellular debris)
  - `bacPool` (bacteria)
  - `virPool` (viruses)
  - `parPool` (parasite segments)
  - `chemDotPool` (chemical granules)
  - `abPool` (antibodies)
  - `wbcSpherePool` (spherical leukocytes)
  - `wbcAmoebaPool` (diapedesis amoeboid leukocytes)
  - `labelPool` (floating cell status tags)
- **Pool Lifecycle**:
  1. `resetAllSvgPools()` sets all `*PoolCount = 0`.
  2. Entity loops call `renderPooled*(...)`. If `count < pool.length`, existing elements are re-used; otherwise, elements are constructed and appended to the SVG layer.
  3. Attributes (`cx`, `cy`, `transform`, `opacity`, `fill`) are mutated directly on existing SVG nodes.
  4. `finalizeAllSvgPools()` iterates from `count` to `pool.length` and sets `style.display = 'none'`.
- **Result**: Zero garbage collection pauses, steady $60\text{ FPS}$ even with hundreds of simulated entities.

### 4.4 Performance, Cleanup & Memory Management for Multi-Page Architecture

#### Current Limitations in Page 1:
- The animation loop (`animate()`) never terminates once started (`cancelAnimationFrame` is not implemented).
- `simSpeed` has no `0` (pause) state.
- All DOM nodes belong to a single global `#viewport-group`.

#### Requirements & Design for Pages 1, 2, 3, 4 Multi-Page Architecture:

1. **Scene Scoping & DOM Container Separation**:
   - Rather than destroying and rebuilding SVG nodes on each page change, each page should have its own dedicated container group:
     - `<g id="page-1-scene" class="page-scene">`
     - `<g id="page-2-scene" class="page-scene" style="display: none;">`
     - `<g id="page-3-scene" class="page-scene" style="display: none;">`
     - `<g id="page-4-scene" class="page-scene" style="display: none;">`
   - Switching pages sets `display: ''` for the active scene and `display: 'none'` for inactive scenes. The browser's composite engine immediately bypasses rendering calculations for hidden groups.
2. **Dedicated or Scoped Animation Dispatcher**:
   - The master animation loop should check `activePage`:
     ```javascript
     function stepSimulation() {
         switch (activePage) {
             case 1: stepPage1(); break;
             case 2: stepPage2(); break;
             case 3: stepPage3(); break;
             case 4: stepPage4(); break;
         }
         // Optional: Low-frequency background updates for inter-page state
     }
     ```
   - Support a clean `pause()` toggle (`simPaused = true`), stopping simulation advancement while keeping pan/zoom interactive.
3. **Cross-Page State & Event Bus**:
   - **Page 1 $\to$ Page 2 Pipeline**: When Page 1 drains an APC or pathogen into the initial lymphatic capillary ($x \ge 995$), enqueue the event into `sharedImmuneState.afferentLymphQueue`. When Page 2 is displayed, these entities spawn directly at $x = 0, y = 268$ flowing into the lymph node.
   - **Page 2 $\to$ Page 3 Pipeline**: Filtered lymph, memory B cells, and antibodies exiting the efferent lymphatic vessel enqueue into `sharedImmuneState.efferentLymphQueue`.
   - **Page 3 $\to$ Page 1 Pipeline**: Antibodies injected into the subclavian vein in Page 3 become available to circulate through the arteriole in Page 1.
   - **Page 4 $\to$ Systemic Circulation**: Hematopoietic stem cells produce naive B cells and mature neutrophils in the bone marrow, replenishing the systemic vascular reserve pool.

---

## 5. Architectural Recommendations for Phase 2 Implementation

1. **Page Navigation UI**:
   - Place a modern segmented tab bar in the header:
     - `[ 1. 創傷發炎與微循環 ]`
     - `[ 2. 淋巴結與專一性免疫 ]`
     - `[ 3. 淋巴總管與靜脈匯流 ]`
     - `[ 4. 骨髓造血與免疫記憶 ]`
2. **Maintain SVG ViewBox Consistency**:
   - Keep the standard viewBox `viewBox="0 -65 1000 565"` across all 4 pages to allow seamless shared coordinate transformations, pan/zoom math, and asset proportions.
3. **Preserve Zero-Allocation SVG Pooling**:
   - Adopt the existing `*Pool` design pattern for newly introduced entities in Pages 2, 3, and 4 (e.g., T follicular helper cells, dendritic cells, hematopoietic stem cells, reticular fibers, sinus endothelial cells).
4. **Visual Style Guardrails**:
   - **Cells**: Maintain strict color, nucleus morphology, and halo aesthetics matching Page 1 (e.g. Neutrophils: trilobed `#0369a1` nucleus, `#38bdf8` body; B cells: `#fb923c`; Macrophages: `#a855f7`; Antibodies: bifurcated Y-shape with Fab/Fc regions).
   - **Vessels**: Maintain consistent endothelial cell junctions, basement membranes, and blood flow velocity ratios.

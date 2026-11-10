# Survey Report 3: UI Interaction Controls, Multi-Tab Architecture & Test Infrastructure

**Explorer**: Explorer 3 (UI Controls & Test Infra Explorer)  
**Date**: 2026-11-10  
**Project**: `microDefend` (微觀人體防線) Multi-Tab Expansion  
**Working Directory**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\microDefend`  
**State Folder**: `c:\Users\user\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_3\`

---

## Executive Summary

This investigation explores the interactive control panels, reactive UI mechanisms, and animation pipelines in `microDefend`, designs an extensible Multi-Tab Navigation & Lifecycle Architecture across 4 physiological stages (Tabs 1–4), and designs an automated end-to-end (E2E) testing framework leveraging headless Chrome via native Chrome DevTools Protocol (CDP) in Node.js v24 and Python 3.13.

### Key Architectural Highlights
1. **Current Control Architecture**: Page 1 currently exposes 25 interactive buttons, 4 header toggles, 3 speed buttons, 2 vaccine memory switches, and dynamic pan/zoom/click canvas interactions. State mutations drive physical parameters (`arterioleWidth`, `capillaryWidth`, `sphincterTone`, `flowSpeed`, `gapSize`) smoothly via asymptotic interpolation (`lerp`), and entity rendering is handled by a zero-allocation SVG object pooling system (`resetAllSvgPools()` / `finalizeAllSvgPools()`).
2. **Multi-Tab Design (Tabs 1–4)**: A unified `<nav class="tabs-nav">` with 4 semantic tabs orchestrates modular tab-specific control sidebars (`controls-tab-1` through `controls-tab-4`) and 4 isolated SVG viewports (`viz-tab-1` through `viz-tab-4`). Inactive tabs are hidden with zero GPU/layout recalculation overhead, while a single active-tab-gated `requestAnimationFrame` loop ensures zero memory leaks, zero SVG corruption, and 60fps responsiveness.
3. **Spatial & Biological Continuity**: Tab 1's bottom-right lymphatic capillary outlet (`x=1000, y=248..288`, center `y=268`) seamlessly aligns with Tab 2's primary afferent lymphatic vessel inlet (`x=0, y=248..288`, center `y=268`). Tab 2's efferent lymphatic vessel connects into Tab 3's thoracic duct confluence at the subclavian/jugular venous angle, and Tab 3's systemic circulation delivers cells into Tab 4's bone marrow sinusoids.
4. **Verified Test Infrastructure**: We verified that Node.js v24.11.1 (`C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe`) with native `WebSocket` and `fetch` connects seamlessly to Headless Google Chrome (`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`) over CDP. This provides an automated testing harness for live DOM structure, tab switching, dynamic SVG generation, speed modulation, and real-time console error detection (0 uncaught exceptions) with zero external npm or pip dependencies.

---

## Section 1: Current Page 1 Control Panel Inspection

### 1.1 Complete Interactive Elements Inventory

| # | Element ID / Selector | Type | Biological & Operational Role |
|---|------------------------|------|-------------------------------|
| 1 | `#toggle-labels` | Checkbox | Toggles display of `#anatomy-annotations` layer (epidermis, dermis, vessels, nerves, lymphatics). |
| 2 | `#toggle-auto-wbc` | Checkbox | Automatically triggers leukocyte diapedesis when pathogens are detected. |
| 3 | `#toggle-dim-nerve` | Checkbox | Dims `#nerve-network` to reduce visual clutter during deep tissue observation. |
| 4 | `#toggle-fluid-circulation` | Checkbox | Activates interstitial fluid tank model (`fluidDroplets`), endothelial gaps, and initial lymphatic capillary drainage. |
| 5 | `.speed-btn[data-speed]` | Button Group | Simulation speed multipliers: `0.5x`, `1.0x` (default), `2.0x`. Updates `simSpeed`. |
| 6 | `#btn-cut-skin` | Button | Coagulation Stage 1: Scalpel incision animation, cut cavity, extravasation starts. |
| 7 | `#btn-platelet-plug` | Button | Coagulation Stage 2: Collagen exposure, platelet adhesion & primary hemostatic plug. |
| 8 | `#btn-fibrin-mesh` | Button | Coagulation Stage 3: Thrombin converts fibrinogen into insoluble fibrin polymer meshwork. |
| 9 | `#btn-scab-heal` | Button | Coagulation Stage 4: Scab drying, fibroblast proliferation, epidermal re-epithelialization. |
| 10 | `#btn-scab-fall` | Button | Coagulation Stage 5: Scab detachment, complete tissue restoration. |
| 11 | `.stage-btn.toggle-btn[red]` | Button (Toggle) | Cardinal Sign: Rubor (紅 - Arteriole vasodilation, rapid hyperemia). |
| 12 | `.stage-btn.toggle-btn[heat]` | Button (Toggle) | Cardinal Sign: Calor (熱 - Increased metabolic perfusion and local temperature). |
| 13 | `.stage-btn.toggle-btn[swelling]` | Button (Toggle) | Cardinal Sign: Tumor (腫 - Endothelial cleft opening, plasma exudation/edema). |
| 14 | `.stage-btn.toggle-btn[pain]` | Button (Toggle) | Cardinal Sign: Dolor (痛 - Tissue tension & bradykinin firing nociceptive nerve pulses). |
| 15 | `#btn-spawn-bacteria` | Button (Radio) | Introduces rod-shaped bacteria with binary fission capability; sets active pathogen. |
| 16 | `#btn-spawn-virus` | Button (Radio) | Introduces spherical enveloped virions capable of cell infection; sets active pathogen. |
| 17 | `#btn-spawn-parasite` | Button (Radio) | Introduces large extracellular helminth; sets active pathogen. |
| 18 | `#toggle-memory-bacteria` | Switch Checkbox | Secondary immune response toggle: Releases circulating anti-bacterial antibodies from arteriole. |
| 19 | `#toggle-memory-virus` | Switch Checkbox | Secondary immune response toggle: Releases neutralizing anti-viral antibodies from arteriole. |
| 20 | `#btn-spawn-neutro` | Button | Deploys neutrophils (polymorphonuclear, phagocytosis, NETosis). |
| 21 | `#btn-spawn-mono` | Button | Deploys monocytes ➔ macrophages (bean-shaped nucleus, phagocytosis, APC lymphatic migration). |
| 22 | `#btn-spawn-eosino` | Button | Deploys eosinophils (major basic protein granules combating parasites). |
| 23 | `#btn-spawn-baso` | Button | Deploys basophils (histamine granules triggering immediate vasodilation). |
| 24 | `#btn-spawn-bcell` | Button | Deploys B lymphocytes (humoral immunity, antibody release). |
| 25 | `#btn-spawn-tcell` | Button | Deploys cytotoxic T / NK lymphocytes (perforin/granzyme target lysis). |
| 26 | `#reset-btn` | Button | Resets all states, clears entity arrays, resets SVG pools, restores initial tissue state. |
| 27 | `#zoom-in`, `#zoom-out`, `#zoom-reset` | Button Overlay | Scales and centers SVG viewport transform (`matrix(scale, 0, 0, scale, panX, panY)`). |
| 28 | `#viz-container` | Canvas Event | Mouse drag / touch move for viewport panning; click (<10px drag) spawns `selectedPathogen`. |

### 1.2 User Input Handling & State Flow Mechanism

```
[ User Input (Click/Change/Wheel) ]
                 │
                 ▼
     [ Event Handler Listener ]
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
[ Discrete Trigger ]   [ State Mutation ]
- spawnBacteria()      - activeEffects.add('swelling')
- setCoagStage(2)      - vaccineState.bacteria = true
- resetSimulation()    - simSpeed = 2.0
       │                   │
       └─────────┬─────────┘
                 ▼
       [ Reactive UI Synchronizer ]
       - updateVisualization(): Sets lerp targets (targetCapillaryWidth, targetGapSize)
       - updateStats(): Updates top status pills (#stat-healthy, #stat-bacteria, etc.)
       - updateVaccineUI(): Syncs card subtitles and switch visual indicators
       - updateLog(): Displays clinical/biological mechanism text in #mechanism-desc
                 │
                 ▼
    [ Animation Loop stepSimulation() ]
       - Interpolates physical properties (0.05 lerp step)
       - Updates physics/behaviors for all active entities
       - Zero-allocation SVG pool reuse & render
```

---

## Section 2: Multi-Tab Navigation Architecture (R1 & R4)

### 2.1 Tab Bar Header Design
The multi-tab navigation is structured as a dedicated semantic tab bar `<nav class="tabs-nav">` placed immediately below the top header or integrated into the application shell.

#### HTML Architecture
```html
<nav class="tabs-nav" role="tablist" aria-label="MicroDefend Navigation Tabs">
    <button class="tab-btn active" id="tab-btn-1" data-tab="tab-1" role="tab" aria-selected="true" aria-controls="scene-tab-1">
        <span class="tab-icon">🛡️</span>
        <div class="tab-label-group">
            <span class="tab-title">第一道與第二道防線</span>
            <span class="tab-subtitle">組織微循環與發炎反應</span>
        </div>
    </button>
    <button class="tab-btn" id="tab-btn-2" data-tab="tab-2" role="tab" aria-selected="false" aria-controls="scene-tab-2">
        <span class="tab-icon">🧪</span>
        <div class="tab-label-group">
            <span class="tab-title">淋巴結專一性免疫</span>
            <span class="tab-subtitle">輸入/輸出管・抗原呈現與活化</span>
        </div>
        <span class="tab-badge" id="tab2-badge" style="display:none;">!</span>
    </button>
    <button class="tab-btn" id="tab-btn-3" data-tab="tab-3" role="tab" aria-selected="false" aria-controls="scene-tab-3">
        <span class="tab-icon">🌊</span>
        <div class="tab-label-group">
            <span class="tab-title">淋巴總管與靜脈匯流</span>
            <span class="tab-subtitle">瓣膜防逆流・血液循環動力</span>
        </div>
    </button>
    <button class="tab-btn" id="tab-btn-4" data-tab="tab-4" role="tab" aria-selected="false" aria-controls="scene-tab-4">
        <span class="tab-icon">🦴</span>
        <div class="tab-label-group">
            <span class="tab-title">骨髓造血與免疫記憶</span>
            <span class="tab-subtitle">長壽漿細胞・幹細胞分化產線</span>
        </div>
    </button>
</nav>
```

#### Visual Styling Specifications
- **Theme**: Dark glassmorphism (`background: rgba(22, 24, 38, 0.95)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.08)`).
- **Tab Accents**:
  - Tab 1: Warm Amber/Crimson (`linear-gradient(135deg, #ef4444, #f97316)`)
  - Tab 2: Emerald Green (`linear-gradient(135deg, #10b981, #059669)`)
  - Tab 3: Cyan/Sky Blue (`linear-gradient(135deg, #0ea5e9, #2563eb)`)
  - Tab 4: Royal Purple/Gold (`linear-gradient(135deg, #8b5cf6, #d97706)`)
- **Active State**: Elevated card with glowing bottom accent border (`box-shadow: 0 4px 16px rgba(0,0,0,0.4)`).
- **Responsive Handling**: Flexbox with `flex: 1 1 220px`; wraps cleanly onto a 2x2 grid on mobile viewports (<768px).

### 2.2 Spatial & Vector Flow Continuity Across Tabs

```
  [ Page 1: 組織與微循環 ]
  +------------------------------------+
  | 毛細血管網 -> 組織液漫流          |
  |                                    |
  |             微淋巴管盲端           |
  |             [x=868, y=268]         |
  |                   │                |
  |                   ▼                |
  |             淋巴引流出口 (右側邊界)|
  +-------------[x=1000, y=268]--------+
                      │
   ═══════════════════╪═══════════════════ (空間與流向無縫對接)
                      │
  [ Page 2: 淋巴結專一性免疫反應 ]     ▼
  +-------------[x=0, y=268]-----------+
  | 主要輸入淋巴管 (Afferent Inlet)    |
  |                   │                |
  |                   ▼                |
  | 進入被膜下竇 (Subcapsular Sinus)   |
  |                   │                |
  | 皮質濾泡 (B區) ──┼── 副皮質區 (T區)|
  |                   │                |
  |                   ▼                |
  | 髓質索/髓質竇 (Plasma/Ab Secretion)|
  |                   │                |
  |                   ▼                |
  | 輸出淋巴管出口 (Efferent Outlet)   |
  +-------------[x=1000, y=420]--------+
                      │
   ═══════════════════╪═══════════════════
                      │
  [ Page 3: 淋巴總管與靜脈匯流 ]       ▼
  +-------------[x=60, y=480]----------+
  | 胸導管/右淋巴管向上匯集            |
  |                   │                |
  |                   ▼                |
  | 半月形防逆流瓣膜 (Venous Valves)   |
  |                   │                |
  |                   ▼                |
  | 靜脈角 (Venous Angle: 內頸/鎖骨下) |
  |                   │                |
  | 混入高速靜脈血液大循環 ──► [心臟]  |
  +------------------------------------+
                      │
   ═══════════════════╪═══════════════════ (全身動脈血流運送)
                      │
  [ Page 4: 骨髓造血與免疫記憶 ]       ▼
  +------------------------------------+
  | 骨髓血竇毛細血管 (Sinusoids)       |
  |  ├─► 長壽漿細胞 (LLPC) 歸巢微環境  |
  |  ├─► 造血幹細胞 (HSC) 分化產線     |
  |  └─► 嗜中性球成熟儲存庫 (Storage)  |
  |                                    |
  | G-CSF 應急動員 ──► 湧入血竇馳援 P1 |
  +------------------------------------+
```

### 2.3 Modularized Viewport & Sidebar Layout
To guarantee performance and isolation:
1. **Central Visualization**:
   - The `#viz-container` holds 4 distinct `<svg>` elements:
     - `<svg id="viz-tab-1" class="tab-svg-scene active" viewBox="0 -65 1000 565">...</svg>`
     - `<svg id="viz-tab-2" class="tab-svg-scene" viewBox="0 0 1000 565" style="display:none;">...</svg>`
     - `<svg id="viz-tab-3" class="tab-svg-scene" viewBox="0 0 1000 565" style="display:none;">...</svg>`
     - `<svg id="viz-tab-4" class="tab-svg-scene" viewBox="0 0 1000 565" style="display:none;">...</svg>`
   - Independent pan/zoom coordinates (`panX`, `panY`, `scale`) are preserved per tab so returning to a tab retains user viewpoint.
2. **Left Controls Sidebar**:
   - Organized into 4 tab-specific wrapper containers:
     - `<div class="tab-controls-view active" id="controls-tab-1">...</div>`
     - `<div class="tab-controls-view" id="controls-tab-2" style="display:none;">...</div>`
     - `<div class="tab-controls-view" id="controls-tab-3" style="display:none;">...</div>`
     - `<div class="tab-controls-view" id="controls-tab-4" style="display:none;">...</div>`
   - Common controls (Simulation Speed, Global Reset, Dynamic Mechanism Box) remain persistent and accessible across all tabs.

### 2.4 Lifecycle & State Management Strategy

#### The "Active-Tab Gated" Animation Loop
To prevent memory leaks and SVG corruption, we utilize an Active-Tab Gated loop:

```javascript
let currentTab = 'tab-1'; // 'tab-1' | 'tab-2' | 'tab-3' | 'tab-4'
let animFrameId = null;

function masterAnimationLoop() {
    animFrameId = requestAnimationFrame(masterAnimationLoop);

    speedAccum += simSpeed;
    if (speedAccum < 1.0) return;

    let steps = 0;
    while (speedAccum >= 1.0 && steps < 2) {
        speedAccum -= 1.0;
        
        // 1. Tick light global state timers (cross-tab immunology)
        tickGlobalImmunology();

        // 2. ONLY step physics and render SVG DOM for the currently visible tab!
        switch (currentTab) {
            case 'tab-1':
                stepSimulationTab1();
                break;
            case 'tab-2':
                stepSimulationTab2();
                break;
            case 'tab-3':
                stepSimulationTab3();
                break;
            case 'tab-4':
                stepSimulationTab4();
                break;
        }
        steps++;
    }
    if (speedAccum > 2.0) speedAccum = 0;
}
```

#### Shared Global State vs Tab-Isolated State
```javascript
// Shared across all tabs (Synchronized)
const GlobalImmuneState = {
    simSpeed: 1.0,                              // Synced playback speed (0.5x, 1x, 2x)
    vaccineState: { bacteria: false, virus: false }, // Memory established in Tab 2/4 reflects in Tab 1
    lymphNodeClonalExpansion: {
        active: false,
        antigen: null,                          // 'bacteria' | 'virus'
        progress: 0,                            // 0% to 100%
        apcCount: 0
    },
    boneMarrowReserve: {
        neutrophilsAvailable: 500,              // Max 500
        mobilizationActive: false
    },
    circulatingAntibodyTiter: {
        bacteria: 0,
        virus: 0
    }
};

// Isolated per Tab (Encapsulated)
const TabLocalState = {
    'tab-1': { panX: 0, panY: 0, scale: 1.0, activeEffects: new Set(), coagStage: 0, entities: [...] },
    'tab-2': { panX: 0, panY: 0, scale: 1.0, germinalCenterPhase: 0, apcQueue: [...], bCellFollicles: [...] },
    'tab-3': { panX: 0, panY: 0, scale: 1.0, venousPressure: 1.0, valveState: 'normal', lymphInflowRate: 1.0 },
    'tab-4': { panX: 0, panY: 0, scale: 1.0, hscDivisions: 0, llpcNicheOccupancy: 8, myeloidStage: 0 }
};
```

#### Memory Leak & Event Listener Hygiene
1. **Zero Dynamic Listener Registration**: All event listeners for buttons, tabs, sliders, and checkboxes are registered **strictly once** on page initialization (`DOMContentLoaded`). Switching tabs NEVER calls `addEventListener`.
2. **Zero Inactive Repaint**: Switching tabs sets inactive SVGs to `display: none`. Browsers skip layout, paint, and compositor phases for non-displayed SVGs.
3. **Dedicated Object Pools**: Each tab maintains its own pre-allocated zero-allocation object pools (`Tab1Pools`, `Tab2Pools`, etc.), completely eliminating DOM allocation stutter and cross-scene element contamination.

---

## Section 3: Interactive Panels Specification for Pages 2, 3, and 4

### 3.1 Tab 2: 淋巴結專一性免疫反應 (Lymph Node Specific Immunity)

```
┌────────────────────────────────────────────────────────┐
│ 🧪 淋巴結專一性免疫反應控制面板 (Tab 2)                │
├────────────────────────────────────────────────────────┤
│ 1. 輸入淋巴管抗原灌流 (Afferent Inflow)               │
│   [ 💧 啟動淋巴液持續流入 ] [ ➕ 導入游離細菌/病毒 ]   │
│   [ 🧪 導入抗原呈現細胞 (APC / 樹突細胞) ]             │
├────────────────────────────────────────────────────────┤
│ 2. 專一性免疫反應流程 (Specific Cascade Stepper)       │
│   [ 1. 抗原呈現 (APC ➔ 輔助 T 細胞 CD4+) ]             │
│   [ 2. B 細胞活化與株落選殖 (Clonal Expansion) ]       │
│   [ 3. 漿細胞分化與抗體大量分泌 (Antibody Factory) ]   │
│   [ 4. 毒殺 T 細胞 (CD8+) 活化增殖 ]                   │
├────────────────────────────────────────────────────────┤
│ 3. 視圖與解剖標籤 (Anatomical Toggles)                 │
│   [x] 🏷️ 顯示淋巴結解剖分區標籤                        │
│       (被膜下竇、小樑、皮質濾泡、生發中心、副皮質T區、髓質索) │
│   [x] ⚡ 自動免疫連鎖演繹模式                          │
├────────────────────────────────────────────────────────┤
│ 4. 輸出淋巴管匯出監控 (Efferent Outflow Status)        │
│   過濾淋巴液: 澄清 | 抗體輸出: 1,200 個/秒 | 活化T細胞: 8 │
├────────────────────────────────────────────────────────┤
│ [ 🔄 重設淋巴結場景 (Reset Tab 2) ]                   │
└────────────────────────────────────────────────────────┘
```

### 3.2 Tab 3: 淋巴總管與靜脈匯流 (Lymphatic Ducts & Venous Confluence)

```
┌────────────────────────────────────────────────────────┐
│ 🌊 淋巴總管與靜脈匯流控制面板 (Tab 3)                  │
├────────────────────────────────────────────────────────┤
│ 1. 血液動力與血流調節 (Hemodynamics)                   │
│   [ 🚀 高速靜脈血液衝流 (12 mm/s) ]                    │
│   [ 💓 呼吸胸腔負壓抽取 (吸氣負壓虹吸效應) ]           │
├────────────────────────────────────────────────────────┤
│ 2. 瓣膜機制與防逆流展示 (Valve Mechanics)              │
│   [ 🛡️ 正常單向半月瓣 (防止高壓靜脈血倒灌) ]            │
│   [ ⚠️ 瓣膜閉鎖不全模擬 (血液逆流與淋巴水腫示警) ]      │
├────────────────────────────────────────────────────────┤
│ 3. 淋巴液與免疫產物匯入 (Systemic Inflow)              │
│   [ 💧 胸導管注入澄清淋巴液 ]                          │
│   [ ✨ 匯入新生成抗體 (觀察混入紅血球血液並迅速稀釋分佈)] │
│   [ ⚪ 匯入活化效應淋巴球 (進入全身循環) ]              │
├────────────────────────────────────────────────────────┤
│ 4. 結構標籤與生理剖析 (Anatomical Toggles)             │
│   [x] 🏷️ 顯示血管與瓣膜解剖標籤                        │
│       (胸導管、鎖骨下靜脈、內頸靜脈、靜脈角、半月瓣、內皮) │
├────────────────────────────────────────────────────────┤
│ [ 🔄 重設匯流場景 (Reset Tab 3) ]                     │
└────────────────────────────────────────────────────────┘
```

### 3.3 Tab 4: 骨髓造血與免疫記憶 (Bone Marrow Hematopoiesis & Immune Memory)

```
┌────────────────────────────────────────────────────────┐
│ 🦴 骨髓造血與免疫記憶控制面板 (Tab 4)                  │
├────────────────────────────────────────────────────────┤
│ 1. 幹細胞分化產線 (Hematopoietic Lineage Cascade)      │
│   [ 🌱 造血幹細胞 (HSC) 自我更新分裂 ]                 │
│   [ ⚪ 骨髓系產線：嗜中性球分化 (原➔幼➔桿狀➔分葉核) ]  │
│   [ 🟠 淋巴系產線：B 細胞生成 (受體重排與中樞耐受) ]   │
├────────────────────────────────────────────────────────┤
│ 2. 嗜中性球成熟儲存庫 (Neutrophil Storage Pool)        │
│   儲存庫儲備量: [████████████░░] 820 / 1000 顆         │
│   [ 🚨 G-CSF 應急動員！(釋放大量成熟嗜中性球入血馳援P1)] │
├────────────────────────────────────────────────────────┤
│ 3. 長壽漿細胞微環境工廠 (LLPC Sanctuary & Factory)     │
│   [ 🏰 漿細胞歸巢入駐微環境 (CXCL12 基質細胞壁龕) ]    │
│   [ ✨ 恆定分泌基礎保護性抗體 (維持長期體液免疫記憶) ] │
├────────────────────────────────────────────────────────┤
│ 4. 解剖標籤與微環境 (Niche Toggles)                    │
│   [x] 🏷️ 顯示骨髓微環境標籤                            │
│       (骨小樑、內皮血竇毛細管、基質網狀細胞、幹細胞微環境) │
├────────────────────────────────────────────────────────┤
│ [ 🔄 重設骨髓場景 (Reset Tab 4) ]                     │
└────────────────────────────────────────────────────────┘
```

---

## Section 4: Test Infrastructure Assessment & Automated Verification Plan

### 4.1 System Environment Matrix

| Component | Path / Location | Version | Status & Capability |
|-----------|-----------------|---------|----------------------|
| **Python** | `C:\Users\user\miniconda3\python.exe` | 3.13.5 | Available. Supports standard `unittest`, `http.server`, `urllib`, `xml`, `subprocess`. Note: `bs4` and `websockets` are absent. |
| **Node.js** | `C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe` | 24.11.1 | Available. Supports native `WebSocket`, `fetch`, `vm`, `child_process`. Zero npm dependencies needed! |
| **Google Chrome** | `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` | 156.0.x | Available. Supports `--headless=new`, `--remote-debugging-port`, full CDP browser automation. |
| **Microsoft Edge** | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | 130.0.x | Available. Supports `--headless`, `--dump-dom`, CDP. |

### 4.2 Empirically Verified CDP Automation Capability
We empirically verified that Node.js v24 can spawn Headless Google Chrome, establish a native WebSocket connection to `http://127.0.0.1:PORT/json/list`, execute Chrome DevTools Protocol commands (`Page.enable`, `Runtime.enable`, `Page.navigate`, `Runtime.evaluate`), click DOM elements, and read evaluated state without installing any external packages!

### 4.3 Proposed Dual-Tier Automated Testing Framework

#### Tier A: Python Fast Unit & DOM Structure Harness (`tests/test_microdefend_structure.py`)
- **Execution**: `& "C:\Users\user\miniconda3\python.exe" -m unittest tests/test_microdefend_structure.py`
- **Features Verified**:
  - Ephemeral HTTP server serves `microDefend/` root without 404s.
  - HTML parser checks existence of 4 tab buttons with correct `data-tab` and `role="tab"` attributes.
  - Checks existence of 4 distinct SVG scenes (`#viz-tab-1` through `#viz-tab-4`).
  - Spatial continuity verification: Tab 1 lymphatic exit coordinate matches Tab 2 afferent inlet coordinate.
  - Verifies presence of all interactive button IDs and toggle switches.
  - Validates CSS stylesheet syntax and zero broken asset paths.

#### Tier B: Node.js + Headless Chrome CDP Live E2E Harness (`tests/test_microdefend_cdp_e2e.js`)
- **Execution**: `& "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_microdefend_cdp_e2e.js`
- **Features Verified**:
  1. **Zero Console Errors**: Listens to `Console.messageAdded` and `Runtime.exceptionThrown`. Asserts 0 uncaught exceptions.
  2. **Tab Switching & Display Toggling**: Clicks Tab 1 ➔ Tab 2 ➔ Tab 3 ➔ Tab 4 ➔ Tab 1. Confirms only the active SVG and active controls panel are visible (`display: block` / `display: inline`, others `display: none`).
  3. **SVG Node Generation**:
     - Clicks Tab 2 APC button: verifies SVG nodes for dendritic cell and T-cell TCR contact are rendered.
     - Clicks Tab 3 valve button: verifies bicuspid valve leaflets and fluid particles move across venous junction.
     - Clicks Tab 4 G-CSF mobilization button: verifies neutrophil count in blood sinusoid increases rapidly.
  4. **Simulation Speed Control**: Clicks `0.5x`, `1.0x`, `2.0x` speed buttons; evaluates `window.__sharedImmuneState.simSpeed`.
  5. **Stress & Memory Leak Test**: Executes 20 rapid tab toggles within 2 seconds. Asserts animation frame loop remains healthy with zero unbounded DOM accumulation.

---

## Section 5: Implementation Roadmap Recommendations

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Multi-Tab Scaffold & Shell Layout                            │
│ - Insert <nav class="tabs-nav"> in index.html with Tabs 1-4 buttons   │
│ - Modularize .controls-panel into 4 tab-specific views                 │
│ - Structure 4 SVG viewports in #viz-container with preserveAspectRatio │
│ - Add styling in style.css for tabs, glassmorphic cards, active state  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Core Animation Engine & Tab Lifecycle                         │
│ - Introduce masterAnimationLoop() with currentTab gating               │
│ - Refactor script.js to initialize Tab 1, 2, 3, 4 pools cleanly        │
│ - Add global shared state (simSpeed, vaccineState, clonalExpansion)    │
│ - Ensure tab clicks cleanly hide inactive SVGs and toggle panels       │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Tab 2, 3, 4 Interactive Controls & SVG Generation             │
│ - Implement Tab 2 specific immune cascade (APC, B/T, Plasma cell Ab)   │
│ - Implement Tab 3 hemodynamics, venous valves, and systemic inflow     │
│ - Implement Tab 4 hematopoiesis line, neutrophil reserve, and LLPC     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Automated E2E Verification & Audit                            │
│ - Run Python structure unittest                                        │
│ - Run Node.js CDP Chrome live automation test                          │
│ - Confirm 0 console errors and 100% acceptance criteria compliance     │
└────────────────────────────────────────────────────────────────────────┘
```

This report provides the full architectural blueprint for implementing the multi-tab navigation, interactive control panels, and automated testing framework.

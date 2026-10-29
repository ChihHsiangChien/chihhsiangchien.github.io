document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('inflammation-viz');
    const viewportGroup = document.getElementById('viewport-group');
    const vizContainer = document.getElementById('viz-container');

    // Microcirculation DOM groups
    const vesselGroup = document.getElementById('vessel-group');
    const vesselLumensGroup = document.getElementById('vessel-lumens-group');
    const smoothMuscleLayer = document.getElementById('smooth-muscle-layer');
    const precapillarySphincters = document.getElementById('precapillary-sphincters');
    const endotheliumLayer = document.getElementById('endothelium-layer');
    const arterioleWallTop = document.getElementById('arteriole-wall-top');
    const arterioleWallBottom = document.getElementById('arteriole-wall-bottom');
    const bloodCellsGroup = document.getElementById('blood-cells');

    // Dermis, Collagen & Coagulation Layers
    const collagenFibersGroup = document.getElementById('collagen-fibers-group');
    const woundCavity = document.getElementById('wound-cavity');
    const exposedCollagenLayer = document.getElementById('exposed-collagen-layer');
    const bleedingLayer = document.getElementById('bleeding-layer');
    const plateletPlugLayer = document.getElementById('platelet-plug-layer');
    const fibrinMeshLayer = document.getElementById('fibrin-mesh-layer');
    const scabLayer = document.getElementById('scab-layer');
    const scalpelBladeLayer = document.getElementById('scalpel-blade-layer');

    // Tissue & Pathology layers
    const tissueSitesLayer = document.getElementById('tissue-sites-layer');
    const cellDebrisLayer = document.getElementById('cell-debris-layer');
    const pathogensTissueLayer = document.getElementById('pathogens-tissue-layer');
    const chemicalsLayer = document.getElementById('chemicals-layer');
    const activeWbcLayer = document.getElementById('active-wbc-layer');
    const extravasatedLayer = document.getElementById('extravasated-layer');
    const floatingLabelsLayer = document.getElementById('floating-labels-layer');

    const swellingOverlay = document.getElementById('swelling-overlay');
    const skinSurface = document.getElementById('skin-surface');
    const basementMembrane = document.getElementById('basement-membrane');
    const tissueBg = document.getElementById('tissue-bg');

    // Multilayer Epithelial Barrier & Mucosa Groups
    const mucosaColumnarCells = document.getElementById('mucosa-columnar-cells');
    const mucosaGobletCells = document.getElementById('mucosa-goblet-cells');
    const mucosaCiliaLayer = document.getElementById('mucosa-cilia-layer');
    const mucusLayer = document.getElementById('mucus-layer');
    const mucosaChemicalsLayer = document.getElementById('mucosa-chemicals-layer');

    // Stratified Epidermis Groups (Skin Side)
    const stratumCorneum = document.getElementById('stratum-corneum');
    const stratumSpinosum = document.getElementById('stratum-spinosum');
    const stratumBasale = document.getElementById('stratum-basale');

    // Nerve Elements
    const nerveTrunk = document.getElementById('nerve-trunk');
    const myelinSheaths = document.getElementById('myelin-sheaths');
    const nerveBranches = document.querySelectorAll('.nerve-branch');
    const nerveTerminals = document.querySelectorAll('.nerve-terminal');
    const pulses = [
        document.getElementById('pulse-1'),
        document.getElementById('pulse-2'),
        document.getElementById('pulse-3'),
        document.getElementById('pulse-4')
    ];

    // Info & Controls
    const stageTitle = document.getElementById('stage-title');
    const stageDesc = document.getElementById('stage-desc');
    const mechanismDesc = document.getElementById('mechanism-desc');
    const toggleButtons = document.querySelectorAll('.stage-btn.toggle-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toggleLabelsCheckbox = document.getElementById('toggle-labels');
    const toggleDimNerveCheckbox = document.getElementById('toggle-dim-nerve');
    const nerveNetworkGroup = document.getElementById('nerve-network');

    let simSpeed = 1.0;
    let speedAccum = 0;
    let selectedPathogen = 'bacteria';

    function spawnActivePathogen(x, y) {
        const skinY = getSkinSurfaceY(x, swellingLevel);
        const isDeep = y > (skinY + 10);
        if (selectedPathogen === 'virus') {
            spawnFreeVirus(x, y, isDeep ? 1 : 2);
        } else if (selectedPathogen === 'parasite') {
            spawnParasite(x, y);
        } else {
            spawnBacteria(x, y);
        }
        updateStats();
    }

    // Coagulation Stepper Buttons
    const btnCutSkin = document.getElementById('btn-cut-skin');
    const btnPlateletPlug = document.getElementById('btn-platelet-plug');
    const btnFibrinMesh = document.getElementById('btn-fibrin-mesh');
    const btnScabHeal = document.getElementById('btn-scab-heal');
    const btnScabFall = document.getElementById('btn-scab-fall');
    const coagButtons = [btnCutSkin, btnPlateletPlug, btnFibrinMesh, btnScabHeal, btnScabFall];

    // Stats Elements
    const statHealthy = document.getElementById('stat-healthy');
    const statMucusCleared = document.getElementById('stat-mucus-cleared');
    const statBleeding = document.getElementById('stat-bleeding');
    const statClot = document.getElementById('stat-clot');
    const statBacteria = document.getElementById('stat-bacteria');
    const statVirus = document.getElementById('stat-virus');
    const statDebris = document.getElementById('stat-debris');
    const statWbc = document.getElementById('stat-wbc');

    let mucusClearedCount = 0;
    let ciliaList = [];
    let lysozymes = [];
    let sIgAList = [];

    function getSkinSurfaceY(x, swelling) {
        const t = Math.max(0, Math.min(1, x / 1000));
        const factor = 4 * t * (1 - t);
        const maxB = (swelling || 0) * 38;
        return 2 - maxB * factor;
    }

    function getDermisTopY(x, swelling) {
        const t = Math.max(0, Math.min(1, x / 1000));
        const factor = 4 * t * (1 - t);
        const maxB = (swelling || 0) * 38;
        const skinY = 2 - maxB * factor;
        const basementY = 55 - maxB * factor;

        // If at the open wound cavity, tissue is breached all the way to the surface!
        const isAtWound = coagState.woundOpen > 0.05 && coagState.scabProgress < 0.75 && Math.abs(x - WOUND_X) < (WOUND_HALF_W * coagState.woundOpen + 14);
        if (isAtWound) {
            return skinY + 4;
        }
        return basementY + 4;
    }

    function lerpAngle(curr, target, factor) {
        let diff = (target - curr) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return curr + diff * factor;
    }

    function updateStats() {
        if (!statHealthy) return;
        statHealthy.textContent = tissueSites.filter(c => c.state === 'healthy' || c.state === 'dividing').length;
        if (statMucusCleared) statMucusCleared.textContent = mucusClearedCount;
        statBleeding.textContent = `${Math.round(coagState.bleedIntensity * 100)}%`;
        statClot.textContent = coagState.fibrinMesh > 0.5 ? "100% (纖維網)" : (coagState.plateletPlug > 0.5 ? "60% (血小板栓)" : (coagStage === 5 ? "0% (已完全溶解脫落)" : "0%"));

        const inTissueBac = bacteria.filter(b => b.inTissue).length;
        const outBac = bacteria.length - inTissueBac;
        statBacteria.textContent = inTissueBac > 0 ? `${inTissueBac} (外界 ${outBac})` : (bacteria.length > 0 ? `0 (外界 ${bacteria.length})` : "0");

        const inTissueVir = freeViruses.filter(v => v.inTissue).length;
        const outVir = freeViruses.length - inTissueVir;
        statVirus.textContent = inTissueVir > 0 ? `${inTissueVir} (外界 ${outVir})` : (freeViruses.length > 0 ? `0 (外界 ${freeViruses.length})` : "0");

        statDebris.textContent = cellDebris.length;
        statWbc.textContent = activeTissueWBCs.length;
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    // ==========================================
    // 1. Pan, Zoom & Touch Swipe Cutting Gesture
    // ==========================================
    let panX = 0;
    let panY = 0;
    let scale = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let clickStartX = 0;
    let clickStartY = 0;
    let clickWorldX = 0;
    let clickWorldY = 0;
    let swipeStartY = 0;
    let swipeStartX = 0;

    function updateTransform() {
        viewportGroup.setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${panX} ${panY})`);
    }

    vizContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.zoom-controls') || e.target.closest('.controls-panel')) return;
        const rect = svg.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * 1000;
        const svgY = -65 + ((e.clientY - rect.top) / rect.height) * 565;
        const worldX = (svgX - panX) / scale;
        const worldY = (svgY - panY) / scale;

        clickStartX = e.clientX;
        clickStartY = e.clientY;
        clickWorldX = worldX;
        clickWorldY = worldY;

        swipeStartX = worldX;
        swipeStartY = worldY;

        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);

        const rect = svg.getBoundingClientRect();
        const svgY = -65 + ((e.clientY - rect.top) / rect.height) * 565;
        const endWorldY = (svgY - panY) / scale;

        // 1. Check if user swiped downwards across skin surface (from y < 25 to y > 65)
        if (swipeStartY < 25 && endWorldY > 65) {
            triggerCutWound();
            return;
        }

        // 2. Pure click without dragging: spawn the active pathogen at clicked coordinates
        if (dist < 6) {
            spawnActivePathogen(clickWorldX, clickWorldY);
        }
    });

    // Touch support for mobile / tablets
    let touchStartDist = 0;
    let touchStartScale = 1;

    vizContainer.addEventListener('touchstart', (e) => {
        if (e.target.closest('.zoom-controls') || e.target.closest('.controls-panel')) return;
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const rect = svg.getBoundingClientRect();
            const svgX = ((t.clientX - rect.left) / rect.width) * 1000;
            const svgY = -65 + ((t.clientY - rect.top) / rect.height) * 565;
            const worldX = (svgX - panX) / scale;
            const worldY = (svgY - panY) / scale;

            clickStartX = t.clientX;
            clickStartY = t.clientY;
            clickWorldX = worldX;
            clickWorldY = worldY;

            swipeStartX = worldX;
            swipeStartY = worldY;

            isDragging = true;
            startX = t.clientX - panX;
            startY = t.clientY - panY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.hypot(dx, dy);
            touchStartScale = scale;
        }
    }, { passive: false });

    vizContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            updateTransform();
            e.preventDefault();
        } else if (e.touches.length === 2 && touchStartDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            scale = Math.min(Math.max(0.65, touchStartScale * (dist / touchStartDist)), 4.5);
            updateTransform();
            e.preventDefault();
        }
    }, { passive: false });

    vizContainer.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            const dist = Math.hypot(t.clientX - clickStartX, t.clientY - clickStartY);
            const rect = svg.getBoundingClientRect();
            const svgY = -65 + ((t.clientY - rect.top) / rect.height) * 565;
            const endWorldY = (svgY - panY) / scale;

            if (swipeStartY < 25 && endWorldY > 65) {
                triggerCutWound();
                return;
            }

            if (dist < 10) {
                spawnActivePathogen(clickWorldX, clickWorldY);
            }
        }
    });

    vizContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.12;
        const rect = svg.getBoundingClientRect();
        const mouseSvgX = ((e.clientX - rect.left) / rect.width) * 1000;
        const mouseSvgY = -65 + ((e.clientY - rect.top) / rect.height) * 565;

        let newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
        newScale = Math.min(Math.max(0.65, newScale), 4.5);

        panX = mouseSvgX - (mouseSvgX - panX) * (newScale / scale);
        panY = mouseSvgY - (mouseSvgY - panY) * (newScale / scale);
        scale = newScale;
        updateTransform();
    }, { passive: false });

    zoomInBtn.addEventListener('click', () => { scale = Math.min(4.5, scale * 1.25); updateTransform(); });
    zoomOutBtn.addEventListener('click', () => { scale = Math.max(0.65, scale / 1.25); updateTransform(); });
    zoomResetBtn.addEventListener('click', () => { scale = 1; panX = 0; panY = 0; updateTransform(); });

    // ==========================================
    // 2. Microcirculation & Coagulation Architecture
    // ==========================================
    const BRANCHES = [
        { id: 'top', targetY: 20, isNearInjury: true },
        { id: 'mid', targetY: 65, isNearInjury: false },
        { id: 'bot', targetY: 110, isNearInjury: false }
    ];

    const WOUND_X = 260;
    const WOUND_HALF_W = 60;
    const VESSEL_BREACH_HALF_W = 42;

    let coagStage = 0; // 0: Normal, 1: Vascular Injury/Bleed, 2: Platelet Plug, 3: Fibrin Mesh, 4: Scab & Healed, 5: Detachment & Restoration
    let coagState = {
        woundOpen: 0,
        bleedIntensity: 0,
        plateletPlug: 0,
        fibrinMesh: 0,
        scabProgress: 0,
        healProgress: 0,
        bladeAnim: 0,
        scabDetachAnim: 0
    };

    let arterioleWidth = 56;
    let targetArterioleWidth = 56;
    let capillaryWidth = 16;
    let targetCapillaryWidth = 16;
    let sphincterTone = 1.0;
    let targetSphincterTone = 1.0;
    let flowSpeed = 2.2;
    let targetFlowSpeed = 2.2;
    let gapSize = 0.5;
    let targetGapSize = 0.5;
    let swellingLevel = 0;
    const activeEffects = new Set();
    let pulseProgress = [0, 0.25, 0.5, 0.75];

    // Cellular & Coagulation Entities
    let tissueSites = [];
    let cellDebris = [];
    let bacteria = [];
    let freeViruses = [];
    let parasites = [];
    let histamines = [];
    let eosinophilGranules = [];
    let antibodies = [];

    let bleedingRBCs = [];
    let plugPlatelets = [];
    let fibrinStrands = [];

    let bloodWBCs = [];
    let activeTissueWBCs = [];
    let bloodParticles = [];
    let autoWbcRecruitTimer = 0;

    let smoothMuscles = [];
    let sphincterElements = [];
    let branchEndoCells = [];
    let branchLumenPaths = [];
    let arterioleLumenPath = null;
    let animationId;

    // Helper: Dynamic Floating Label inside SVG
    function createSvgLabel(text, x, y, bg = 'rgba(20,24,36,0.85)', color = '#fff') {
        if (!toggleLabelsCheckbox.checked) return null;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const approxW = text.length * 11 + 10;
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x - approxW / 2);
        rect.setAttribute("y", y - 8);
        rect.setAttribute("width", approxW);
        rect.setAttribute("height", 16);
        rect.setAttribute("rx", 4);
        rect.setAttribute("fill", bg);
        rect.setAttribute("stroke", "rgba(255,255,255,0.2)");
        rect.setAttribute("stroke-width", "0.8");

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", x);
        txt.setAttribute("y", y + 3.5);
        txt.setAttribute("fill", color);
        txt.setAttribute("font-size", "10");
        txt.setAttribute("font-weight", "600");
        txt.setAttribute("text-anchor", "middle");
        txt.textContent = text;

        g.appendChild(rect);
        g.appendChild(txt);
        floatingLabelsLayer.appendChild(g);
        return g;
    }

    function updateLog(msg) {
        mechanismDesc.innerHTML = msg;
    }

    // ==========================================
    // 3. Build Collagen Fibers Striations in Dermis
    // (Coagulation wavy collagen matrix)
    // ==========================================
    function buildCollagenFibers() {
        collagenFibersGroup.innerHTML = '';
        // 6 wavy collagen fiber bands running across the dermis
        for (let y = 80; y <= 270; y += 32) {
            let d = '';
            for (let x = 0; x <= 1000; x += 30) {
                const waveY = y + Math.sin(x * 0.025 + y * 0.1) * 6;
                d += (x === 0 ? 'M ' : 'L ') + x + ' ' + waveY.toFixed(1) + ' ';
            }
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", d.trim());
            path.setAttribute("stroke", "rgba(254, 226, 226, 0.4)");
            path.setAttribute("stroke-width", "2");
            path.setAttribute("fill", "none");
            collagenFibersGroup.appendChild(path);
        }
    }

    // ==========================================
    // 4. Initialize Clot Topology (Platelet Plug & Fibrin Strands)
    // ==========================================
    function buildClotTopology() {
        plugPlatelets = [];
        fibrinStrands = [];

        // Plug nodes positioned right at upper capillary breach (WOUND_X = 260, global y ~ 320)
        const rows = 4;
        for (let r = 0; r < rows; r++) {
            const y = 318 - r * 11;
            const count = 7 - r;
            const span = VESSEL_BREACH_HALF_W * (1 - r * 0.15);
            for (let i = 0; i < count; i++) {
                const xRatio = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
                const px = WOUND_X + xRatio * span + (Math.random() - 0.5) * 8;
                const py = y + (Math.random() - 0.5) * 6;
                plugPlatelets.push({
                    x: px, y: py,
                    angle: Math.random() * Math.PI * 2,
                    order: Math.abs(xRatio) * 0.4 + (rows - r) * 0.2
                });
            }
        }

        // Fibrin mesh connecting between plug nodes
        for (let i = 0; i < plugPlatelets.length; i++) {
            for (let j = i + 1; j < plugPlatelets.length; j++) {
                const dist = Math.hypot(plugPlatelets[i].x - plugPlatelets[j].x, plugPlatelets[i].y - plugPlatelets[j].y);
                if (dist > 10 && dist < 32) {
                    fibrinStrands.push({
                        ax: plugPlatelets[i].x, ay: plugPlatelets[i].y,
                        bx: plugPlatelets[j].x, by: plugPlatelets[j].y,
                        threshold: Math.min(0.9, (i + j) / (plugPlatelets.length * 1.5))
                    });
                }
            }
        }
    }

    // ==========================================
    // 5. Coagulation Actions & Scalpel Cut
    // ==========================================
    function triggerCutWound() {
        setCoagStage(1);
    }

    function setCoagStage(stage) {
        coagStage = stage;
        coagButtons.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === stage - 1);
        });

        if (stage === 1) {
            // Cut skin: Scalpel blade descends and opens wound
            coagState.bladeAnim = 0.01;
            coagState.woundOpen = 1;
            coagState.bleedIntensity = 1;
            coagState.plateletPlug = 0;
            coagState.fibrinMesh = 0;
            coagState.scabProgress = 0;
            coagState.healProgress = 0;
            coagState.scabDetachAnim = 0;

            // Trigger pain and swelling automatically upon injury!
            activeEffects.add('pain');
            activeEffects.add('swelling');
            document.querySelectorAll('.stage-btn.toggle-btn').forEach(btn => {
                if (btn.dataset.effect === 'pain' || btn.dataset.effect === 'swelling') btn.classList.add('active');
            });
            updateVisualization();

            // Spawn bleeding RBCs escaping from vessel breach and welling upwards
            bleedingRBCs = [];
            for (let i = 0; i < 22; i++) {
                const prog = i / 22;
                const y = 312 - prog * 260;
                const frac = prog;
                const halfW = 4 + frac * 28;
                bleedingRBCs.push({
                    x: WOUND_X + (Math.random() - 0.5) * halfW * 2,
                    y: y,
                    vy: -(0.4 + Math.random() * 0.4), // gentle upward welling
                    vx: (Math.random() - 0.5) * 0.2,
                    r: 4.8,
                    atSurface: prog > 0.92,
                    surfaceLife: 260 + Math.random() * 120,
                    surfaceDrift: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.35),
                    alpha: 1
                });
            }
            updateLog("🔪 <strong>皮膚劃傷與血管破裂！</strong>血液持續自破口湧出並於皮膚表層淤積；在纖維蛋白網封堵前將持續出血！");
        } else if (stage === 2) {
            // Platelet Plug aggregation - still actively oozing until fibrin mesh seals
            coagState.plateletPlug = 1;
            coagState.bleedIntensity = 0.55;
            // Reflex vasoconstriction
            targetArterioleWidth = 48;
            targetCapillaryWidth = 14;
            updateLog("⚡ <strong>暴露的膠原蛋白活化血小板！</strong>形成「初級血小板栓」；纖維蛋白網尚未形成前血液仍會持續湧出！");
        } else if (stage === 3) {
            // Fibrin mesh network formation - stops bleeding completely!
            coagState.plateletPlug = 1;
            coagState.fibrinMesh = 1;
            coagState.bleedIntensity = 0;
            updateLog("🕸️ <strong>凝血酶將纖維蛋白原轉為纖維蛋白網 (Fibrin Mesh)！</strong>交織纏繞紅血球形成穩固血栓，出血完全停止！");
        } else if (stage === 4) {
            // Scab and tissue healing
            coagState.plateletPlug = 1;
            coagState.fibrinMesh = 1;
            coagState.scabProgress = 1;
            coagState.healProgress = 1;
            coagState.bleedIntensity = 0;
            coagState.scabDetachAnim = 0;
            spawnMonocyte();
            spawnMonocyte();
            updateLog("🩹 <strong>血塊乾燥形成痂皮 (Scab)！</strong>巨噬細胞清創，內皮細胞與基底細胞啟動修復再生。");
        } else if (stage === 5) {
            // Scab detachment and full restoration
            coagState.scabDetachAnim = 0.01;
            coagState.healProgress = 1;
            coagState.bleedIntensity = 0;

            // Clear pain and swelling
            activeEffects.delete('pain');
            activeEffects.delete('swelling');
            document.querySelectorAll('.stage-btn.toggle-btn').forEach(btn => {
                if (btn.dataset.effect === 'pain' || btn.dataset.effect === 'swelling') btn.classList.remove('active');
            });
            updateVisualization();
            updateLog("✨ <strong>纖溶酶（Plasmin）溶解纖維蛋白網，痂皮自然脫落消失！</strong>新生表皮覆蓋完好，血管與組織全面康復！");

            stageTitle.textContent = "全面康復與組織重塑 (Full Recovery & Homeostasis)";
            stageDesc.textContent = "纖維蛋白網被纖溶酶（Plasmin）完全分解，保護性痂皮乾燥脫落。基底細胞完成上皮重新角化（Re-epithelialization），微血管內皮修復完整，微循環恢復正常恆定。";
            mechanismDesc.textContent = "組織清創完畢，發炎四主徵完全消退，傷口無痕閉合，紅血球恢復平穩單行通過。";
        }
        updateStats();
    }

    btnCutSkin.addEventListener('click', () => setCoagStage(1));
    btnPlateletPlug.addEventListener('click', () => setCoagStage(2));
    btnFibrinMesh.addEventListener('click', () => setCoagStage(3));
    btnScabHeal.addEventListener('click', () => setCoagStage(4));
    btnScabFall.addEventListener('click', () => setCoagStage(5));

    // ==========================================
    // 6. Initialize Tissue Sites (2x6 Grid of Dermis Cells)
    // ==========================================
    function initTissueSites() {
        tissueSites = [];
        const rows = 2;
        const cols = 6;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sx = 100 + c * 145 + (Math.random() * 14 - 7);
                const sy = 120 + r * 78 + (Math.random() * 10 - 5);
                tissueSites.push({
                    id: r * cols + c,
                    row: r, col: c,
                    x: sx, y: sy,
                    origX: sx, origY: sy,
                    r: 22,
                    state: 'healthy',
                    infectionProgress: 0,
                    mitosisProgress: 0,
                    targetSite: null
                });
            }
        }
    }

    function createCellDebris(x, y, siteId, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.4 - 0.2);
            const dist = 6 + Math.random() * 14;
            const vertices = [];
            const numPts = 5 + Math.floor(Math.random() * 3);
            const baseR = 5 + Math.random() * 3;
            for (let p = 0; p < numPts; p++) {
                const a = (Math.PI * 2 / numPts) * p;
                const r = baseR * (0.6 + Math.random() * 0.6);
                vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            const isMucosaDebris = (x >= 500 || siteId === -1);
            cellDebris.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                r: baseR,
                siteId: siteId,
                vertices: vertices,
                rotation: Math.random() * Math.PI * 2,
                life: isMucosaDebris ? (260 + Math.random() * 120) : (1200 + Math.random() * 400),
                alpha: 1.0
            });
        }
    }

    // ==========================================
    // 7. Pathogens & Leukocytes Spawners
    // ==========================================
    function spawnBacteria(x, y) {
        let bx;
        if (x !== undefined) {
            bx = x;
        } else {
            // When wound is open, bias towards skin wound so user can observe wound migration & invasion
            bx = (coagState.woundOpen > 0.05 && Math.random() < 0.75) 
                ? (WOUND_X + (Math.random() - 0.5) * 160) 
                : (120 + Math.random() * 760);
        }
        const by = y !== undefined ? y : (-50 + Math.random() * 25);
        const skinY = getSkinSurfaceY(bx, swellingLevel);
        const inTissue = y !== undefined ? (by > skinY + 10) : false;
        bacteria.push({
            x: bx, y: by,
            vx: (Math.random() - 0.5) * 1.0,
            vy: (Math.random() - 0.5) * 0.8,
            r: 7.5,
            inTissue: inTissue,
            trappedInMucus: false,
            angle: Math.random() * Math.PI * 2,
            opsonized: false,
            abCount: 0,
            divideTimer: 0
        });
        if (inTissue) {
            updateLog("⚠️ <strong>已直接於皮下組織引入細菌！</strong>（模擬深層感染）細菌將在真皮層進行二分裂繁殖，並刺激巨噬細胞釋放趨化因子。");
        } else if (bx >= 500) {
            updateLog("💧 <strong>外界細菌生成於黏膜表面外界！</strong>即將受黏液捕捉、動態纖毛向右推動與溶菌酶攻擊！");
        } else {
            if (coagState.woundOpen > 0.05) {
                updateLog("⚠️ <strong>外界細菌生成於皮膚表層！</strong>感應到創口滲出液，正游移移行鑽入創口。");
            } else {
                updateLog("🛡️ <strong>外界細菌生成於皮膚表層！</strong>無創口時完整角質層嚴密阻隔，病原體無法穿透進入皮下。");
            }
        }
        updateStats();
    }

    function spawnFreeVirus(x, y, count = 3) {
        let spawnedInTissue = false;
        for (let i = 0; i < count; i++) {
            let vx;
            if (x !== undefined) {
                vx = x + (count > 1 ? (Math.random() * 24 - 12) : 0);
            } else {
                vx = (coagState.woundOpen > 0.05 && Math.random() < 0.75)
                    ? (WOUND_X + (Math.random() - 0.5) * 160)
                    : (160 + Math.random() * 680) + (Math.random() * 24 - 12);
            }
            const vy = (y !== undefined ? y : (-48 + Math.random() * 22)) + (count > 1 ? (Math.random() * 16 - 8) : 0);
            const skinY = getSkinSurfaceY(vx, swellingLevel);
            const inTissue = y !== undefined ? (vy > skinY + 10) : false;
            if (inTissue) spawnedInTissue = true;
            freeViruses.push({
                x: vx, y: vy,
                vx: (Math.random() - 0.5) * 1.3,
                vy: (Math.random() - 0.5) * 1.1,
                r: 5.5,
                inTissue: inTissue,
                trappedInMucus: false,
                opsonized: false,
                abCount: 0,
                penetratingTimer: 0
            });
        }
        if (spawnedInTissue) {
            updateLog("👾 <strong>已直接於皮下組織引入游離病毒！</strong>（模擬深層感染）病毒將嘗試侵入鄰近健康組織細胞並引發感染。");
        } else if (x !== undefined && x >= 500) {
            updateLog("👾 <strong>游離病毒生成於黏膜表面外界！</strong>分泌型 IgA (sIgA) 與纖毛黏液手扶梯正進行攔截中和。");
        } else {
            if (coagState.woundOpen > 0.05) {
                updateLog("👾 <strong>外界病毒生成於皮膚表層！</strong>正尋找創口擴散侵入。");
            } else {
                updateLog("🛡️ <strong>外界病毒生成於皮膚表層！</strong>無創口時死角質層形成物理屏障，病毒無法穿透進入皮下。");
            }
        }
        updateStats();
    }

    function spawnParasite(x, y) {
        let px;
        if (x !== undefined) {
            px = x;
        } else {
            px = (coagState.woundOpen > 0.05 && Math.random() < 0.8)
                ? (WOUND_X + (Math.random() - 0.5) * 120)
                : (160 + Math.random() * 680);
        }
        const py = y !== undefined ? y : (-42 + Math.random() * 18);
        const skinY = getSkinSurfaceY(px, swellingLevel);
        const inTissue = y !== undefined ? (py > skinY + 10) : false;
        parasites.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.2,
            inTissue: inTissue,
            trappedInMucus: false,
            hp: 100, maxHp: 100,
            phase: Math.random() * Math.PI * 2,
            angle: inTissue ? ((Math.random() - 0.5) * 0.6) : 0
        });
        if (inTissue) {
            updateLog("🪱 <strong>已直接於皮下組織引入大型線蟲！</strong>（模擬皮下感染）嗜酸性球將前來聚集並釋放毒性顆粒！");
        } else if (px >= 500) {
            updateLog("🪱 <strong>大型線蟲生成於黏膜表面外界！</strong>黏液毯與纖毛屏障阻絕寄生蟲，並向右推動排障。");
        } else {
            if (coagState.woundOpen > 0.05) {
                updateLog("🪱 <strong>大型線蟲生成於皮膚表層！</strong>正蜿蜒爬向創口鑽入。");
            } else {
                updateLog("🛡️ <strong>大型線蟲生成於皮膚表層！</strong>無創口時受限於完整角質層，無法穿透進入皮下。");
            }
        }
        updateStats();
    }

    const ENDO_GAPS = [230, 280, 340, 410, 470, 590, 650, 720, 780, 850];

    function assignWbcExitStrategy(wbc) {
        if (coagState.woundOpen > 0.08 && coagState.scabProgress < 0.7 && (wbc.branchId === 'top' || Math.random() < 0.45)) {
            wbc.exitRoute = 'wound';
            wbc.targetGapX = WOUND_X + (Math.random() - 0.5) * 16;
        } else {
            wbc.exitRoute = 'endothelial_gap';
            const candidateGaps = ENDO_GAPS.filter(gx => gx > (wbc.x || 0) + 35);
            if (candidateGaps.length > 0) {
                wbc.targetGapX = candidateGaps[Math.floor(Math.random() * candidateGaps.length)];
            } else {
                wbc.targetGapX = ENDO_GAPS[Math.floor(Math.random() * ENDO_GAPS.length)];
            }
        }
    }

    function getWbcName(subtype) {
        switch (subtype) {
            case 'neutrophil': return '嗜中性球';
            case 'monocyte': case 'macrophage': return '單核球';
            case 'eosinophil': return '嗜酸性球';
            case 'basophil': return '嗜鹼性球';
            case 'bcell': return 'B 淋巴球';
            case 'tcell': return '毒殺型 T 細胞';
            case 'nk': return '自然殺手 (NK) 細胞';
            default: return '白血球';
        }
    }

    function getWbcNucleusColor(subtype) {
        switch (subtype) {
            case 'neutrophil': return '#0369a1';
            case 'monocyte': case 'macrophage': return '#7e22ce';
            case 'eosinophil': return '#be185d';
            case 'basophil': return '#1e293b';
            case 'bcell': return '#c2410c';
            case 'tcell': case 'nk': return '#047857';
            default: return '#334155';
        }
    }

    function drawAmoeboidWbc(g, cx, cy, r, progress, subtype, state) {
        const color = getWbcColor(subtype);
        const numPts = 12;
        const pts = [];

        for (let i = 0; i < numPts; i++) {
            const a = (i * 2 * Math.PI) / numPts;
            const align = -Math.sin(a); // +1 when pointing upwards (toward tissue)
            const perp = Math.abs(Math.cos(a)); // horizontal width

            let rad = r;
            if (state === 'diapedesis') {
                if (progress < 0.35) {
                    // Extending leading pseudopod upward into gap
                    rad = r * (align > 0 ? (1 + 0.65 * align) : (0.75 - 0.25 * perp));
                } else if (progress < 0.75) {
                    // Hourglass / dumbbell shape squeezed tightly between endothelial cells
                    const squeezeWaist = Math.max(0.42, 1 - 0.58 * perp);
                    rad = r * squeezeWaist * (1 + 0.15 * Math.sin(a * 3 + Date.now() / 130));
                } else {
                    // Expanding into dermis space, trailing uropod retracting
                    rad = r * (align > 0 ? 1.15 : 0.72) * (1 + 0.12 * Math.sin(a * 2 + Date.now() / 150));
                }
            } else {
                // wound_exit or crawling in tissue
                rad = r * (1 + 0.3 * align + 0.16 * Math.sin(a * 3 + Date.now() / 160));
            }

            const px = cx + Math.cos(a) * rad;
            const py = cy + Math.sin(a) * rad;
            pts.push({ x: px, y: py });
        }

        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];
            const midX = (curr.x + next.x) / 2;
            const midY = (curr.y + next.y) / 2;
            d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
        }
        d += ' Z';

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", color);
        path.setAttribute("stroke", "#ffffff");
        path.setAttribute("stroke-width", "1.4");
        g.appendChild(path);

        const n = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        n.setAttribute("cx", cx);
        n.setAttribute("cy", cy + (state === 'diapedesis' && progress < 0.5 ? 2.5 : -2.5));
        n.setAttribute("rx", r * 0.36);
        n.setAttribute("ry", r * (state === 'diapedesis' ? 0.62 : 0.42));
        n.setAttribute("fill", getWbcNucleusColor(subtype));
        g.appendChild(n);
    }

    function chooseWbcBranch(subtype) {
        const hasInjury = coagStage >= 1 || bacteria.some(b => b.inTissue) || cellDebris.length > 0 || tissueSites.some(c => c.state === 'infected');
        if (subtype === 'neutrophil' || subtype === 'monocyte') {
            return hasInjury && Math.random() < 0.75 ? 'top' : ['top', 'mid', 'bot'][Math.floor(Math.random() * 3)];
        }
        if (subtype === 'eosinophil') {
            const hasParasite = parasites.some(p => p.inTissue) || parasites.length > 0;
            return hasParasite && Math.random() < 0.8 ? 'top' : ['top', 'mid', 'bot'][Math.floor(Math.random() * 3)];
        }
        return ['top', 'mid', 'bot'][Math.floor(Math.random() * 3)];
    }

    function spawnNeutrophil() {
        const wbc = {
            subtype: 'neutrophil',
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch('neutrophil'),
            r: 7.5, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            eatenCount: 0, maxEat: 3,
            tissueLife: 700, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        updateLog("⚪ <strong>嗜中性球出動！</strong>進入小動脈向微血管巡航，準備變形蟲遊出吞噬細菌。");
        updateStats();
    }

    function spawnMonocyte() {
        const wbc = {
            subtype: 'monocyte',
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch('monocyte'),
            r: 8.5, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            eatenCount: 0, maxEat: 16,
            tissueLife: 2000, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        updateLog("🟣 <strong>單核球出動！</strong>經變形蟲運動穿出後分化為巨大「巨噬細胞」，清創殘骸。");
        updateStats();
    }

    function spawnEosinophil() {
        const wbc = {
            subtype: 'eosinophil',
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch('eosinophil'),
            r: 7.8, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            ammo: 80, tissueLife: 950, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        updateLog("🔴 <strong>嗜酸性球出動！</strong>釋放橘紅色毒性顆粒溶解大型線蟲寄生蟲！");
        updateStats();
    }

    function spawnBasophil() {
        const wbc = {
            subtype: 'basophil',
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch('basophil'),
            r: 7.8, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            degranulating: 100,
            tissueLife: 600, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        activeEffects.add('swelling');
        activeEffects.add('red');
        document.querySelectorAll('.stage-btn.toggle-btn').forEach(btn => {
            if (btn.dataset.effect === 'swelling' || btn.dataset.effect === 'red') btn.classList.add('active');
        });
        updateVisualization();
        updateLog("🔵 <strong>嗜鹼性球釋放組織胺 (Histamine)！</strong>小動脈舒張、微血管內皮間隙大幅拉寬！");
        updateStats();
    }

    function spawnBCell() {
        const wbc = {
            subtype: 'bcell',
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch('bcell'),
            r: 8.0, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            producing: 120,
            tissueLife: 900, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        updateLog("🟠 <strong>B 淋巴球分泌抗體！</strong>中和標記真皮中的細菌與病毒。");
        updateStats();
    }

    function spawnKillerCell() {
        const type = Math.random() < 0.5 ? 'tcell' : 'nk';
        const wbc = {
            subtype: type,
            x: -15 + Math.random() * 25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch(type),
            r: 7.8, state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            tissueLife: 1000, alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        const name = type === 'nk' ? "自然殺手 (NK) 細胞" : "毒殺型 T 細胞";
        updateLog(`🟢 <strong>${name}出動！</strong>辨識並摧毀受病毒感染的細胞，誘導凋亡裂解！`);
        updateStats();
    }

    function recruitCirculatingWbc(subtype = 'neutrophil') {
        const wbc = {
            subtype: subtype,
            x: -25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch(subtype),
            r: subtype === 'monocyte' ? 8.5 : 7.5,
            state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            eatenCount: 0,
            maxEat: subtype === 'monocyte' ? 16 : 3,
            tissueLife: subtype === 'monocyte' ? 2000 : 700,
            alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        updateStats();
    }

    // ==========================================
    // 8. Epithelial Barrier (Mucosa & Skin) & Myelin Setup
    // ==========================================
    const epidermisCells = [];
    function buildEpidermis() {
        if (mucosaColumnarCells) mucosaColumnarCells.innerHTML = '';
        if (mucosaGobletCells) mucosaGobletCells.innerHTML = '';
        if (mucosaCiliaLayer) mucosaCiliaLayer.innerHTML = '';
        stratumCorneum.innerHTML = '';
        stratumSpinosum.innerHTML = '';
        stratumBasale.innerHTML = '';
        epidermisCells.length = 0;
        ciliaList.length = 0;

        // 1. Left Half (x < 500): Skin (Stratified Squamous Keratinized Epidermis)
        // Stratum Corneum (角質層 - 多層乾燥死角質扁平鱗片)
        for (let x = 8; x < 485; x += 36) {
            for (let row = 0; row < 2; row++) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                const yBase = row * 7 + 4;
                rect.setAttribute("x", x + (row % 2) * 16);
                rect.setAttribute("y", yBase);
                rect.setAttribute("width", 34);
                rect.setAttribute("height", 5.5);
                rect.setAttribute("rx", 2);
                rect.setAttribute("fill", "#cf8a4f");
                rect.setAttribute("opacity", "0.75");
                stratumCorneum.appendChild(rect);
                epidermisCells.push({ el: rect, origY: yBase, type: 'rect', posX: x + (row % 2) * 16 + 17 });
            }
        }

        // Stratum Spinosum (棘狀層)
        for (let x = 8; x < 485; x += 22) {
            for (let row = 0; row < 2; row++) {
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                const yBase = 18 + row * 9;
                const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                body.setAttribute("x", x + (row % 2) * 10 - 9);
                body.setAttribute("y", yBase);
                body.setAttribute("width", 19);
                body.setAttribute("height", 8);
                body.setAttribute("rx", 3.5);
                body.setAttribute("fill", "#e69966");
                body.setAttribute("opacity", "0.85");

                const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                nucleus.setAttribute("cx", x + (row % 2) * 10);
                nucleus.setAttribute("cy", yBase + 4);
                nucleus.setAttribute("r", 2);
                nucleus.setAttribute("fill", "#994d33");

                g.appendChild(body);
                g.appendChild(nucleus);
                stratumSpinosum.appendChild(g);
                epidermisCells.push({ el: g, origY: yBase, type: 'group', posX: x + (row % 2) * 10 });
            }
        }

        // Stratum Basale (基底層)
        for (let x = 8; x < 486; x += 16) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const yBase = 38;
            const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            body.setAttribute("x", x - 7);
            body.setAttribute("y", yBase);
            body.setAttribute("width", 14);
            body.setAttribute("height", 17);
            body.setAttribute("rx", 4);
            body.setAttribute("fill", "#c97349");
            body.setAttribute("opacity", "0.9");

            const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            nucleus.setAttribute("cx", x);
            nucleus.setAttribute("cy", yBase + 8.5);
            nucleus.setAttribute("rx", 3);
            nucleus.setAttribute("ry", 4.5);
            nucleus.setAttribute("fill", "#702c17");

            g.appendChild(body);
            g.appendChild(nucleus);
            stratumBasale.appendChild(g);
            epidermisCells.push({ el: g, origY: yBase, type: 'group', posX: x });
        }

        // 2. Right Half (x >= 500): Mucosa (Pseudostratified Ciliated Columnar Epithelium & Goblet Cells)
        let colIdx = 0;
        for (let x = 512; x < 990; x += 18) {
            colIdx++;
            const isGoblet = (colIdx % 4 === 2);
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const yBase = 3;

            if (isGoblet) {
                // Goblet Cell (杯狀細胞): Distinct cup shape + apical mucus secretion droplet bubble (NO CILIA!)
                const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
                body.setAttribute("d", `M ${x - 7} ${yBase} L ${x + 7} ${yBase} L ${x + 4.5} ${yBase + 51} L ${x - 4.5} ${yBase + 51} Z`);
                body.setAttribute("fill", "url(#gobletGrad)");
                body.setAttribute("stroke", "#38bdf8");
                body.setAttribute("stroke-width", "1.2");
                g.appendChild(body);

                // Apical mucus secretion bubble
                const bubble = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                bubble.setAttribute("cx", x);
                bubble.setAttribute("cy", yBase);
                bubble.setAttribute("r", "4.5");
                bubble.setAttribute("fill", "#e0f2fe");
                bubble.setAttribute("stroke", "#0284c7");
                bubble.setAttribute("stroke-width", "0.8");
                bubble.setAttribute("opacity", "0.95");
                g.appendChild(bubble);

                // Basal nucleus
                const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                nucleus.setAttribute("cx", x);
                nucleus.setAttribute("cy", yBase + 42);
                nucleus.setAttribute("rx", "3");
                nucleus.setAttribute("ry", "4.5");
                nucleus.setAttribute("fill", "#7f1d1d");
                g.appendChild(nucleus);

                if (mucosaGobletCells) mucosaGobletCells.appendChild(g);
            } else {
                // Columnar Epithelial Cell (柱狀上皮細胞): Tall prismatic cell
                const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                body.setAttribute("x", x - 7.5);
                body.setAttribute("y", yBase);
                body.setAttribute("width", 15);
                body.setAttribute("height", 51);
                body.setAttribute("rx", 3);
                body.setAttribute("fill", "url(#mucosaGrad)");
                body.setAttribute("stroke", "#db2777");
                body.setAttribute("stroke-width", "1.2");
                body.setAttribute("opacity", "0.92");
                g.appendChild(body);

                // Oval nucleus situated in basal half
                const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                nucleus.setAttribute("cx", x);
                nucleus.setAttribute("cy", yBase + 36);
                nucleus.setAttribute("rx", "3.2");
                nucleus.setAttribute("ry", "6.5");
                nucleus.setAttribute("fill", "#9d174d");
                g.appendChild(nucleus);

                if (mucosaColumnarCells) mucosaColumnarCells.appendChild(g);

                // Apical Beating Cilia directly attached ONLY to Columnar Cells (4 cilia per cell)
                const cOffsets = [-5, -1.8, 1.8, 5];
                cOffsets.forEach(off => {
                    const cx = x + off;
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("stroke", "#ec4899");
                    path.setAttribute("stroke-width", "1.4");
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("fill", "none");
                    path.setAttribute("opacity", "0.9");
                    if (mucosaCiliaLayer) mucosaCiliaLayer.appendChild(path);
                    ciliaList.push({ el: path, baseX: cx, cellX: x });
                });
            }

            epidermisCells.push({ el: g, origY: yBase, type: 'group', posX: x });
        }
    }

    function initMucosaChemicals() {
        lysozymes = [];
        for (let i = 0; i < 7; i++) {
            lysozymes.push({
                x: 535 + i * 62 + (Math.random() * 20 - 10),
                y: -8 + (Math.random() * 8 - 4),
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.2,
                sparkle: Math.random() * Math.PI * 2
            });
        }

        sIgAList = [];
        for (let i = 0; i < 5; i++) {
            sIgAList.push({
                x: 545 + i * 85 + (Math.random() * 20 - 10),
                y: -6 + (Math.random() * 6 - 3),
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function buildMyelin() {
        if (!myelinSheaths || !nerveTrunk) return;
        myelinSheaths.innerHTML = '';
        const totalLen = nerveTrunk.getTotalLength();
        const segmentCount = 5;
        const sheathLen = totalLen * 0.13;
        const gapLen = totalLen * 0.045;
        const startOffset = totalLen * 0.05;

        for (let i = 0; i < segmentCount; i++) {
            const segStart = startOffset + i * (sheathLen + gapLen);
            const segEnd = segStart + sheathLen;
            if (segEnd > totalLen * 0.95) break;

            const samples = 12;
            let d = '';
            for (let s = 0; s <= samples; s++) {
                const dist = segStart + (segEnd - segStart) * (s / samples);
                const pt = nerveTrunk.getPointAtLength(dist);
                d += (s === 0 ? 'M ' : 'L ') + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2) + ' ';
            }

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", d.trim());
            path.setAttribute("stroke", "#ffe066");
            path.setAttribute("stroke-width", "8.5");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("fill", "none");
            path.setAttribute("opacity", "0.55");

            const midPt = nerveTrunk.getPointAtLength((segStart + segEnd) / 2);
            const nuc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            nuc.setAttribute("cx", midPt.x.toFixed(2));
            nuc.setAttribute("cy", midPt.y.toFixed(2));
            nuc.setAttribute("r", "2.2");
            nuc.setAttribute("fill", "#d97706");
            nuc.setAttribute("opacity", "0.85");

            myelinSheaths.appendChild(path);
            myelinSheaths.appendChild(nuc);
        }
    }

    function buildSmoothMuscle() {
        smoothMuscleLayer.innerHTML = '';
        smoothMuscles = [];
        for (let x = 20; x <= 130; x += 22) {
            const topMuscle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            topMuscle.setAttribute("x", x - 9);
            topMuscle.setAttribute("width", 18);
            topMuscle.setAttribute("rx", 4.5);
            topMuscle.setAttribute("fill", "#d9480f");
            topMuscle.setAttribute("stroke", "#ff922b");
            topMuscle.setAttribute("stroke-width", "1.1");

            const botMuscle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            botMuscle.setAttribute("x", x - 9);
            botMuscle.setAttribute("width", 18);
            botMuscle.setAttribute("rx", 4.5);
            botMuscle.setAttribute("fill", "#d9480f");
            botMuscle.setAttribute("stroke", "#ff922b");
            botMuscle.setAttribute("stroke-width", "1.1");

            smoothMuscleLayer.appendChild(topMuscle);
            smoothMuscleLayer.appendChild(botMuscle);
            smoothMuscles.push({ top: topMuscle, bot: botMuscle, x: x });
        }
    }

    function buildBranchingVessels() {
        vesselLumensGroup.innerHTML = '';
        precapillarySphincters.innerHTML = '';
        endotheliumLayer.innerHTML = '';
        branchEndoCells = [];
        sphincterElements = [];
        branchLumenPaths = [];

        arterioleLumenPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arterioleLumenPath.setAttribute("fill", "url(#lumenGrad)");
        vesselLumensGroup.appendChild(arterioleLumenPath);

        BRANCHES.forEach(branch => {
            const bPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bPath.setAttribute("fill", "url(#lumenGrad)");
            vesselLumensGroup.appendChild(bPath);
            branchLumenPaths.push({ branch: branch, pathEl: bPath });

            const sphTop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            sphTop.setAttribute("x", 152);
            sphTop.setAttribute("width", 12);
            sphTop.setAttribute("rx", 4);
            sphTop.setAttribute("fill", "#c92a2a");
            sphTop.setAttribute("stroke", "#ff8787");
            sphTop.setAttribute("stroke-width", "1");

            const sphBot = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            sphBot.setAttribute("x", 152);
            sphBot.setAttribute("width", 12);
            sphBot.setAttribute("rx", 4);
            sphBot.setAttribute("fill", "#c92a2a");
            sphBot.setAttribute("stroke", "#ff8787");
            sphBot.setAttribute("stroke-width", "1");

            precapillarySphincters.appendChild(sphTop);
            precapillarySphincters.appendChild(sphBot);
            sphincterElements.push({ branch: branch, top: sphTop, bot: sphBot });

            const cellCount = 23;
            const span = 820 / cellCount;
            const topCells = [];
            const botCells = [];

            for (let i = 0; i < cellCount; i++) {
                const baseX = 180 + i * span;
                const topG = createBranchEndoCell(i, 'top', baseX, span);
                const botG = createBranchEndoCell(i, 'bottom', baseX, span);
                endotheliumLayer.appendChild(topG.el);
                endotheliumLayer.appendChild(botG.el);
                topCells.push(topG);
                botCells.push(botG);
            }

            branchEndoCells.push({ branch: branch, topCells: topCells, botCells: botCells });
        });
    }

    function createBranchEndoCell(index, side, baseX, span) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const cell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        cell.setAttribute("height", 8);
        cell.setAttribute("rx", 3.5);
        // Coagulation endothelial cells: Coral pink fill with deep crimson border
        cell.setAttribute("fill", "#f87171");
        cell.setAttribute("stroke", "#991b1b");
        cell.setAttribute("stroke-width", "1");
        cell.setAttribute("opacity", "0.95");

        const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        nucleus.setAttribute("rx", 4.5);
        nucleus.setAttribute("ry", 2.2);
        nucleus.setAttribute("fill", "#7f1d1d");

        g.appendChild(cell);
        g.appendChild(nucleus);

        return { el: g, cellEl: cell, nucleusEl: nucleus, index: index, side: side, baseX: baseX, span: span };
    }

    function initBloodParticles() {
        bloodCellsGroup.innerHTML = '';
        bloodParticles = [];
        const branchIds = ['top', 'mid', 'bot'];
        const totalRBC = 45;
        for (let i = 0; i < totalRBC; i++) {
            createBloodCell('rbc', (i / totalRBC) * 1020, branchIds[i % 3]);
        }
        for (let i = 0; i < 28; i++) {
            createBloodCell('plasma', Math.random() * 1000, branchIds[i % 3]);
        }
    }

    function createBloodCell(type, initialX, branchId) {
        const cell = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let r, fill, opacity;
        if (type === 'rbc') {
            r = 4.8;
            fill = "#ef4444";
            opacity = 0.9;
        } else {
            r = 2.0;
            fill = "#ffd43b";
            opacity = 0.7;
        }
        cell.setAttribute("r", r);
        cell.setAttribute("fill", fill);
        cell.setAttribute("opacity", opacity);
        bloodCellsGroup.appendChild(cell);

        bloodParticles.push({
            el: cell, type: type, x: initialX, y: 65, r: r,
            branchId: branchId, laneOffset: (Math.random() - 0.5)
        });
    }

    // ==========================================
    // 9. Geometry Updates for Arteriole & 3 Capillaries
    // ==========================================
    function updateLumenGeometry() {
        const halfArt = arterioleWidth / 2;
        const artCenterY = 65;
        const artTopY = artCenterY - halfArt;
        const artBotY = artCenterY + halfArt;

        arterioleLumenPath.setAttribute("d", `M 0 ${artTopY} L 140 ${artTopY} L 140 ${artBotY} L 0 ${artBotY} Z`);
        arterioleWallTop.setAttribute("y", artTopY - 7);
        arterioleWallBottom.setAttribute("y", artBotY);

        const muscleThickness = 6 + sphincterTone * 7;
        smoothMuscles.forEach(m => {
            m.top.setAttribute("y", artTopY - 7 - muscleThickness);
            m.top.setAttribute("height", muscleThickness);
            m.bot.setAttribute("y", artBotY + 7);
            m.bot.setAttribute("height", muscleThickness);
            const muscleColor = sphincterTone > 0.6 ? "#e03131" : "#ff8787";
            m.top.setAttribute("fill", muscleColor);
            m.bot.setAttribute("fill", muscleColor);
        });

        const halfCap = capillaryWidth / 2;
        const sphincterThickness = 6 + sphincterTone * 8;

        branchLumenPaths.forEach((item, idx) => {
            const b = item.branch;
            const bTopY = b.targetY - halfCap;
            const bBotY = b.targetY + halfCap;

            let pathData;
            if (b.targetY < 65) {
                // Top capillary branch: curves smoothly leftward from arteriole (x=138) into capillary height by x=148
                pathData = `
                    M 138 ${artTopY}
                    C 142 ${artTopY}, 145 ${bTopY}, 148 ${bTopY}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L 148 ${bBotY}
                    C 145 ${bBotY}, 142 ${artCenterY - 4}, 138 ${artCenterY - 8}
                    Z
                `;
            } else if (b.targetY > 65) {
                // Bottom capillary branch: curves smoothly leftward from arteriole (x=138) into capillary height by x=148
                pathData = `
                    M 138 ${artCenterY + 8}
                    C 142 ${artCenterY + 4}, 145 ${bTopY}, 148 ${bTopY}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L 148 ${bBotY}
                    C 145 ${bBotY}, 142 ${artBotY}, 138 ${artBotY}
                    Z
                `;
            } else {
                // Middle capillary branch (straight through)
                pathData = `
                    M 138 ${artCenterY - halfCap}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L 138 ${artCenterY + halfCap}
                    Z
                `;
            }
            item.pathEl.setAttribute("d", pathData.replace(/\s+/g, ' ').trim());

            const sph = sphincterElements[idx];
            sph.top.setAttribute("y", bTopY - sphincterThickness - 1);
            sph.top.setAttribute("height", sphincterThickness);
            sph.bot.setAttribute("y", bBotY + 1);
            sph.bot.setAttribute("height", sphincterThickness);
            const sphColor = sphincterTone > 0.6 ? "#c92a2a" : "#f06595";
            sph.top.setAttribute("fill", sphColor);
            sph.bot.setAttribute("fill", sphColor);

            const endo = branchEndoCells[idx];
            const cellWidth = Math.max(22, 33 - gapSize);

            endo.topCells.forEach(c => {
                const distFromInjury = Math.abs(c.baseX - WOUND_X);
                const isBreached = b.isNearInjury && distFromInjury < (VESSEL_BREACH_HALF_W * coagState.woundOpen * (1 - coagState.healProgress * 0.9));
                if (isBreached) {
                    c.el.setAttribute("opacity", "0");
                } else {
                    c.el.setAttribute("opacity", "0.95");
                }

                const isLocalInflamed = b.isNearInjury && distFromInjury < 240;
                const localGap = isLocalInflamed ? gapSize : Math.max(0.5, gapSize * 0.2);
                const x = c.baseX + (c.baseX < WOUND_X ? -localGap * 1.3 : localGap * 1.3);

                c.cellEl.setAttribute("x", x);
                c.cellEl.setAttribute("y", bTopY - 8);
                c.cellEl.setAttribute("width", cellWidth);
                c.nucleusEl.setAttribute("cx", x + cellWidth / 2);
                c.nucleusEl.setAttribute("cy", bTopY - 4);
            });

            endo.botCells.forEach(c => {
                const x = c.baseX;
                c.cellEl.setAttribute("x", x);
                c.cellEl.setAttribute("y", bBotY);
                c.cellEl.setAttribute("width", 33);
                c.nucleusEl.setAttribute("cx", x + 16.5);
                c.nucleusEl.setAttribute("cy", bBotY + 4);
            });
        });
    }

    // ==========================================
    // 10. Main Animation Step & Loop
    // ==========================================
    function stepSimulation() {
        // Clear dynamic SVG render layers
        tissueSitesLayer.innerHTML = '';
        cellDebrisLayer.innerHTML = '';
        pathogensTissueLayer.innerHTML = '';
        chemicalsLayer.innerHTML = '';
        activeWbcLayer.innerHTML = '';
        floatingLabelsLayer.innerHTML = '';
        exposedCollagenLayer.innerHTML = '';
        bleedingLayer.innerHTML = '';
        plateletPlugLayer.innerHTML = '';
        fibrinMeshLayer.innerHTML = '';
        scabLayer.innerHTML = '';

        // Smooth physical params
        arterioleWidth += (targetArterioleWidth - arterioleWidth) * 0.05;
        capillaryWidth += (targetCapillaryWidth - capillaryWidth) * 0.05;
        sphincterTone += (targetSphincterTone - sphincterTone) * 0.05;
        flowSpeed += (targetFlowSpeed - flowSpeed) * 0.05;
        gapSize += (targetGapSize - gapSize) * 0.05;

        const targetSwelling = activeEffects.has('swelling') ? 1 : 0;
        swellingLevel += (targetSwelling - swellingLevel) * 0.05;

        updateLumenGeometry();

        // Epidermis and Surface Bulge
        const maxBulge = swellingLevel * 38;
        const junctionBulgeY = 55 - maxBulge;
        const topBulgeY = 2 - maxBulge;

        epidermisCells.forEach(cell => {
            const t = Math.max(0, Math.min(1, cell.posX / 1000));
            const factor = 4 * t * (1 - t);
            const yOffset = -maxBulge * factor;
            if (cell.type === 'rect') cell.el.setAttribute('y', cell.origY + yOffset);
            else cell.el.setAttribute('transform', `translate(0, ${yOffset})`);
        });

        // Dynamically compute exact surface and basement membrane curves
        let skinD = `M 0 ${getSkinSurfaceY(0, swellingLevel).toFixed(1)}`;
        let juncD = `M 0 ${(55 + getSkinSurfaceY(0, swellingLevel) - 2).toFixed(1)}`;
        for (let px = 25; px <= 1000; px += 25) {
            const sy = getSkinSurfaceY(px, swellingLevel);
            skinD += ` L ${px} ${sy.toFixed(1)}`;
            juncD += ` L ${px} ${(55 + sy - 2).toFixed(1)}`;
        }
        skinSurface.setAttribute("d", skinD);
        if (basementMembrane) basementMembrane.setAttribute("d", juncD);
        tissueBg.setAttribute("d", `${juncD} L 1000 300 L 0 300 Z`);
        swellingOverlay.setAttribute("d", `${juncD} L 1000 300 L 0 300 Z`);
        swellingOverlay.setAttribute("opacity", swellingLevel * 0.42);

        // Dynamically align Epidermis Tint (Left: 0~500) and Mucosa Tint (Right: 500~1000)
        const epiBgEl = document.getElementById('epidermis-bg');
        if (epiBgEl) {
            let epiD = `M 0 ${getSkinSurfaceY(0, swellingLevel).toFixed(1)}`;
            for (let px = 25; px <= 500; px += 25) epiD += ` L ${px} ${getSkinSurfaceY(px, swellingLevel).toFixed(1)}`;
            for (let px = 500; px >= 0; px -= 25) epiD += ` L ${px} ${(55 + getSkinSurfaceY(px, swellingLevel) - 2).toFixed(1)}`;
            epiD += ' Z';
            epiBgEl.setAttribute('d', epiD);
        }
        const mucBgEl = document.getElementById('mucosa-bg');
        if (mucBgEl) {
            let mucD = `M 500 ${getSkinSurfaceY(500, swellingLevel).toFixed(1)}`;
            for (let px = 525; px <= 1000; px += 25) mucD += ` L ${px} ${getSkinSurfaceY(px, swellingLevel).toFixed(1)}`;
            for (let px = 1000; px >= 500; px -= 25) mucD += ` L ${px} ${(55 + getSkinSurfaceY(px, swellingLevel) - 2).toFixed(1)}`;
            mucD += ' Z';
            mucBgEl.setAttribute('d', mucD);
        }
        const mucCutLine = document.getElementById('mucocutaneous-junction');
        if (mucCutLine) {
            const midSkinY = getSkinSurfaceY(500, swellingLevel);
            mucCutLine.setAttribute('y1', midSkinY - 28);
            mucCutLine.setAttribute('y2', 55 + midSkinY - 2);
        }

        // ----------------------------------------------------
        // Dynamic Mucosa Layer (Fluid Mucus Blanket, Cilia Beating, Lysozyme & sIgA)
        // ----------------------------------------------------
        if (mucusLayer) {
            let mD = `M 500 ${getSkinSurfaceY(500, swellingLevel) + 3} L 1000 ${getSkinSurfaceY(1000, swellingLevel) + 3} `;
            for (let mx = 1000; mx >= 500; mx -= 20) {
                const sY = getSkinSurfaceY(mx, swellingLevel);
                const wave = Math.sin(Date.now() * 0.003 - mx * 0.04) * 2;
                mD += `L ${mx} ${(sY - 14 + wave).toFixed(1)} `;
            }
            mD += 'Z';
            mucusLayer.setAttribute('d', mD);
        }

        ciliaList.forEach(c => {
            const sY = getSkinSurfaceY(c.baseX, swellingLevel);
            const beatPhase = Date.now() * 0.008 - c.baseX * 0.055;
            const tipDx = Math.sin(beatPhase) * 5 + 3.5; // rightward sweeping wave
            const tipDy = -10 + Math.cos(beatPhase) * 2;
            c.el.setAttribute('d', `M ${c.baseX} ${sY} Q ${c.baseX + tipDx * 0.4} ${sY + tipDy * 0.5} ${c.baseX + tipDx} ${sY + tipDy}`);
        });

        if (mucosaChemicalsLayer) {
            mucosaChemicalsLayer.innerHTML = '';
            lysozymes.forEach(ly => {
                ly.sparkle += 0.12;
                ly.x += ly.vx; ly.y += ly.vy;
                if (ly.x < 515 || ly.x > 985) ly.vx *= -1;
                const sY = getSkinSurfaceY(ly.x, swellingLevel);
                if (ly.y < sY - 16 || ly.y > sY + 2) ly.vy *= -1;

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${ly.x}, ${ly.y})`);
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("r", (2.2 + Math.sin(ly.sparkle) * 0.8).toFixed(1));
                circle.setAttribute("fill", "#fde047");
                circle.setAttribute("stroke", "#ca8a04");
                circle.setAttribute("stroke-width", "0.8");
                g.appendChild(circle);
                mucosaChemicalsLayer.appendChild(g);
            });

            sIgAList.forEach(ab => {
                ab.x += ab.vx; ab.y += ab.vy;
                if (ab.x < 515 || ab.x > 985) ab.vx *= -1;
                const sY = getSkinSurfaceY(ab.x, swellingLevel);
                if (ab.y < sY - 16 || ab.y > sY + 2) ab.vy *= -1;

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${ab.x}, ${ab.y}) scale(0.85)`);
                const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                p.setAttribute("d", "M -4 -3 L 0 0 L 4 -3 M 0 0 L 0 4 M -4 7 L 0 4 L 4 7");
                p.setAttribute("stroke", "#38bdf8");
                p.setAttribute("stroke-width", "1.4");
                p.setAttribute("fill", "none");
                g.appendChild(p);
                mucosaChemicalsLayer.appendChild(g);
            });
        }

        // ----------------------------------------------------
        // A. Scalpel Cutting Animation & Wound Cavity
        // ----------------------------------------------------
        if (coagState.bladeAnim > 0 && coagState.bladeAnim < 1.0) {
            coagState.bladeAnim += 0.035;
            const bladeProgress = Math.sin(coagState.bladeAnim * Math.PI);
            const bladeY = 2 + bladeProgress * 290;
            scalpelBladeLayer.setAttribute("opacity", "0.95");
            scalpelBladeLayer.setAttribute("transform", `translate(${WOUND_X}, ${bladeY})`);
        } else {
            scalpelBladeLayer.setAttribute("opacity", "0");
        }

        // Wound Cavity V-shape cut from skin down to capillary
        if (coagState.woundOpen > 0.02) {
            const healFactor = 1 - coagState.healProgress * 0.95;
            const topW = WOUND_HALF_W * coagState.woundOpen * healFactor;
            const botW = VESSEL_BREACH_HALF_W * coagState.woundOpen * healFactor;
            const botY = 312 - coagState.healProgress * 150;

            const cavityD = `M ${WOUND_X - topW} ${topBulgeY} L ${WOUND_X - botW} ${botY} L ${WOUND_X + botW} ${botY} L ${WOUND_X + topW} ${topBulgeY} Z`;
            woundCavity.setAttribute("d", cavityD);
            woundCavity.setAttribute("opacity", Math.max(0, healFactor).toFixed(2));

            // Exposed collagen fibers along wound edge
            if (coagStage >= 1 && coagStage <= 3) {
                for (let side of [-1, 1]) {
                    const edgeX = WOUND_X + side * botW;
                    for (let k = 0; k < 5; k++) {
                        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        const startY = botY - 5 - k * 8;
                        const wiggle = Math.sin(Date.now() / 200 + k) * 4;
                        line.setAttribute("d", `M ${edgeX} ${startY} Q ${edgeX + side * (12 + wiggle)} ${startY + 4} ${edgeX + side * 18} ${startY - 2}`);
                        line.setAttribute("stroke", "#fde047");
                        line.setAttribute("stroke-width", "2");
                        line.setAttribute("fill", "none");
                        exposedCollagenLayer.appendChild(line);
                    }
                }
                createSvgLabel("⚡ 暴露膠原蛋白 (活化血小板)", WOUND_X + botW + 15, botY - 20, 'rgba(202, 138, 4, 0.9)');
            }
        } else {
            woundCavity.setAttribute("opacity", "0");
        }

        // ----------------------------------------------------
        // B. Bleeding RBCs Welling up onto Skin Surface
        // ----------------------------------------------------
        // ----------------------------------------------------
        // B. Bleeding RBCs (Escaping upward through wound cavity)
        // Continuous bleeding until fibrinMesh appears!
        // ----------------------------------------------------
        const isBleedingActive = coagState.bleedIntensity > 0.02 && coagState.fibrinMesh < 0.5;
        if (isBleedingActive) {
            // Continuously spawn fresh welling RBCs from capillary breach at y=312
            if (Math.random() < 0.32 * coagState.bleedIntensity) {
                bleedingRBCs.push({
                    x: WOUND_X + (Math.random() - 0.5) * 14,
                    y: 312,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: -(0.45 + Math.random() * 0.45), // gentle upward ooze
                    r: 4.8,
                    atSurface: false,
                    surfaceLife: 220 + Math.random() * 120,
                    surfaceDrift: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.32),
                    alpha: 1
                });
            }
        }

        if (bleedingRBCs.length > 0) {
            for (let i = bleedingRBCs.length - 1; i >= 0; i--) {
                const r = bleedingRBCs[i];
                if (!r.atSurface) {
                    // Welling up inside the V-cavity channel
                    r.y += r.vy;
                    r.x += r.vx;
                    const cavityFrac = Math.max(0, Math.min(1, (312 - r.y) / Math.max(1, 312 - topBulgeY)));
                    const maxW = VESSEL_BREACH_HALF_W + cavityFrac * (WOUND_HALF_W - VESSEL_BREACH_HALF_W);
                    r.x = Math.max(WOUND_X - maxW + 2, Math.min(WOUND_X + maxW - 2, r.x));

                    if (r.y <= topBulgeY + 3) {
                        r.atSurface = true;
                        r.y = topBulgeY + (Math.random() * 2 - 1);
                        r.vy = 0;
                    }
                } else {
                    // Reached skin surface
                    if (coagState.fibrinMesh > 0.5) {
                        // Thrombus locked in fibrin mesh - stationary, embedded in clot
                        r.vy = 0;
                        r.vx = 0;
                    } else {
                        // Slowly pool and spread laterally along the surface
                        if (Math.abs(r.x - WOUND_X) < 42) {
                            r.x += r.surfaceDrift;
                        }
                        r.y = topBulgeY + Math.sin(r.x * 0.08) * 1.5;

                        r.surfaceLife--;
                        if (r.surfaceLife < 80 || Math.abs(r.x - WOUND_X) >= 42) {
                            r.alpha -= 0.012; // slow drip / fade away so new blood continuously wells up
                        }
                        if (r.alpha <= 0) {
                            bleedingRBCs.splice(i, 1);
                            continue;
                        }
                    }
                }

                const rG = document.createElementNS("http://www.w3.org/2000/svg", "g");
                rG.setAttribute("transform", `translate(${r.x}, ${r.y})`);

                const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                el.setAttribute("rx", r.r);
                el.setAttribute("ry", r.r * 0.68);
                el.setAttribute("fill", "#dc2626");
                el.setAttribute("stroke", "#7f1d1d");
                el.setAttribute("stroke-width", "1");
                el.setAttribute("opacity", (r.alpha * (coagState.fibrinMesh > 0.5 ? 0.95 : Math.max(0.4, coagState.bleedIntensity))).toFixed(2));

                const dip = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                dip.setAttribute("rx", r.r * 0.45);
                dip.setAttribute("ry", r.r * 0.3);
                dip.setAttribute("fill", "#991b1b");
                dip.setAttribute("opacity", "0.75");

                rG.appendChild(el);
                rG.appendChild(dip);
                bleedingLayer.appendChild(rG);
            }

            if (isBleedingActive) {
                const bleedMsg = coagState.plateletPlug > 0.5 ? "血小板栓形成但仍持續微量滲血 (待纖維網凝固)" : "血液持續湧出並於表層淤積";
                createSvgLabel(bleedMsg, WOUND_X, topBulgeY - 14, 'rgba(185, 28, 28, 0.9)');
            }
        }

        // ----------------------------------------------------
        // C. Platelet Plug (Star-shaped Activated Platelets)
        // ----------------------------------------------------
        if (coagState.plateletPlug > 0.05) {
            plugPlatelets.forEach((p, idx) => {
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${p.x}, ${p.y}) rotate(${p.angle * 180 / Math.PI})`);

                // 7-spiked activated platelet star
                const spikes = 7;
                const outerR = 9;
                const innerR = 4;
                let pts = '';
                for (let k = 0; k < spikes * 2; k++) {
                    const radius = k % 2 === 0 ? outerR : innerR;
                    const a = (k * Math.PI) / spikes;
                    pts += (Math.cos(a) * radius).toFixed(1) + ',' + (Math.sin(a) * radius).toFixed(1) + ' ';
                }

                const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                poly.setAttribute("points", pts.trim());
                poly.setAttribute("fill", "#fde047");
                poly.setAttribute("stroke", "#d97706");
                poly.setAttribute("stroke-width", "1.2");
                g.appendChild(poly);

                // Trapped red blood cell within plug
                if (idx % 2 === 0) {
                    const rbc = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                    rbc.setAttribute("cx", -2); rbc.setAttribute("cy", -1);
                    rbc.setAttribute("rx", "5"); rbc.setAttribute("ry", "3.2");
                    rbc.setAttribute("fill", "#dc2626");
                    g.appendChild(rbc);
                }
                plateletPlugLayer.appendChild(g);
            });
            createSvgLabel("初級血小板栓塞 (Platelet Plug)", WOUND_X, 290, 'rgba(217, 119, 6, 0.9)');
        }

        // ----------------------------------------------------
        // D. Fibrin Mesh (Gold/Amber Interlaced Strands)
        // ----------------------------------------------------
        if (coagState.fibrinMesh > 0.05) {
            fibrinStrands.forEach(strand => {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", strand.ax); line.setAttribute("y1", strand.ay);
                line.setAttribute("x2", strand.bx); line.setAttribute("y2", strand.by);
                line.setAttribute("stroke", "#f59e0b");
                line.setAttribute("stroke-width", "2.2");
                line.setAttribute("stroke-linecap", "round");
                line.setAttribute("opacity", (0.9 * coagState.fibrinMesh).toFixed(2));
                fibrinMeshLayer.appendChild(line);
            });

            // Arched reinforcement strands
            for (let k = 0; k < 5; k++) {
                const arch = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const yOff = 315 - k * 9;
                arch.setAttribute("d", `M ${WOUND_X - 35} ${yOff} Q ${WOUND_X} ${yOff + (k % 2 === 0 ? 6 : -6)} ${WOUND_X + 35} ${yOff}`);
                arch.setAttribute("stroke", "#fbbf24");
                arch.setAttribute("stroke-width", "2");
                arch.setAttribute("fill", "none");
                arch.setAttribute("opacity", (0.9 * coagState.fibrinMesh).toFixed(2));
                fibrinMeshLayer.appendChild(arch);
            }
            createSvgLabel("纖維蛋白網 (Fibrin Clot)", WOUND_X, 275, 'rgba(245, 158, 11, 0.9)');
        }

        // ----------------------------------------------------
        // E. Scab & Dried Surface Crust / Detachment & Recovery
        // ----------------------------------------------------
        if (coagState.scabDetachAnim > 0) {
            coagState.scabDetachAnim += 0.016;
            const progress = Math.min(1, coagState.scabDetachAnim);

            // Dissolve clot and close wound
            coagState.fibrinMesh = Math.max(0, 1 - progress);
            coagState.plateletPlug = Math.max(0, 1 - progress);
            coagState.woundOpen = Math.max(0, 1 - progress);

            // Scab lifts upward and dissolves
            const detachY = -progress * 26;
            const detachOpacity = Math.max(0, 1 - progress);

            const scab = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const scabD = `M ${WOUND_X - 45} ${topBulgeY} Q ${WOUND_X} ${topBulgeY - 10} ${WOUND_X + 45} ${topBulgeY} L ${WOUND_X + 38} ${topBulgeY + 12} Q ${WOUND_X} ${topBulgeY + 18} ${WOUND_X - 38} ${topBulgeY + 12} Z`;
            scab.setAttribute("d", scabD);
            scab.setAttribute("fill", "#450a0a");
            scab.setAttribute("stroke", "#7f1d1d");
            scab.setAttribute("stroke-width", "2");
            scab.setAttribute("transform", `translate(0, ${detachY})`);
            scab.setAttribute("opacity", (0.95 * detachOpacity).toFixed(2));
            scabLayer.appendChild(scab);

            createSvgLabel("痂皮脫落與纖溶重塑 (Fibrinolysis & Detachment)", WOUND_X, topBulgeY + detachY - 14, 'rgba(127, 29, 29, 0.9)');

            if (coagState.scabDetachAnim >= 1) {
                coagState.scabDetachAnim = 0;
                coagState.scabProgress = 0;
                coagState.woundOpen = 0;
                coagState.fibrinMesh = 0;
                coagState.plateletPlug = 0;
                woundCavity.setAttribute("opacity", "0");
                scabLayer.innerHTML = '';
                fibrinMeshLayer.innerHTML = '';
                plateletPlugLayer.innerHTML = '';
                exposedCollagenLayer.innerHTML = '';
                bleedingLayer.innerHTML = '';
                updateStats();
            }
        } else if (coagState.scabProgress > 0.05) {
            const scab = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const scabD = `M ${WOUND_X - 45} ${topBulgeY} Q ${WOUND_X} ${topBulgeY - 10} ${WOUND_X + 45} ${topBulgeY} L ${WOUND_X + 38} ${topBulgeY + 12} Q ${WOUND_X} ${topBulgeY + 18} ${WOUND_X - 38} ${topBulgeY + 12} Z`;
            scab.setAttribute("d", scabD);
            scab.setAttribute("fill", "#450a0a");
            scab.setAttribute("stroke", "#7f1d1d");
            scab.setAttribute("stroke-width", "2");
            scab.setAttribute("opacity", "0.95");
            scabLayer.appendChild(scab);
            createSvgLabel("乾燥保護性痂皮 (Scab)", WOUND_X, topBulgeY - 14, 'rgba(69, 10, 10, 0.9)');
        }

        // ----------------------------------------------------
        // F. Tissue Sites & Mitosis Update
        // ----------------------------------------------------
        tissueSites.forEach(site => {
            const t = Math.max(0, Math.min(1, site.origX / 1000));
            const yOffset = -maxBulge * 4 * t * (1 - t) * 0.4;
            site.y = site.origY + yOffset;

            if (site.state === 'empty') {
                const emptyCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                emptyCircle.setAttribute("cx", site.x); emptyCircle.setAttribute("cy", site.y);
                emptyCircle.setAttribute("r", site.r);
                emptyCircle.setAttribute("fill", "none");
                emptyCircle.setAttribute("stroke", "#64748b");
                emptyCircle.setAttribute("stroke-dasharray", "4,4");
                emptyCircle.setAttribute("stroke-width", "1.5");
                tissueSitesLayer.appendChild(emptyCircle);

                const hasDebris = cellDebris.some(d => d.siteId === site.id);
                if (hasDebris) {
                    site.emptyTimer = 0;
                    createSvgLabel("死亡空缺(待清殘骸)", site.x, site.y, 'rgba(71, 85, 105, 0.85)');
                } else {
                    site.emptyTimer = (site.emptyTimer || 0) + 1;
                    createSvgLabel("空缺(待細胞增生填補)", site.x, site.y, 'rgba(71, 85, 105, 0.85)');
                    const healthyNeighbors = tissueSites.filter(other =>
                        other.state === 'healthy' && (Math.abs(other.row - site.row) + Math.abs(other.col - site.col) === 1)
                    );
                    if (healthyNeighbors.length > 0 && Math.random() < 0.02) {
                        const donor = healthyNeighbors[0];
                        donor.state = 'dividing';
                        donor.mitosisProgress = 0;
                        donor.targetSite = site;
                        site.state = 'incoming';
                        updateLog("🧬 <strong>細胞殘骸已清空！</strong>鄰近健康細胞啟動「有絲分裂 (Mitosis)」，一分為二填補空缺！");
                    } else if (healthyNeighbors.length === 0 || site.emptyTimer > 150) {
                        // Peripheral migration: stem cells/fibroblasts proliferate and migrate in from outside the frame
                        if (Math.random() < 0.025) {
                            site.state = 'migrating_in';
                            const fromLeft = site.col <= 2;
                            const startX = fromLeft ? -40 : 1040;
                            const startY = site.origY + (Math.random() - 0.5) * 20;
                            site.migratingCell = {
                                x: startX,
                                y: startY,
                                startX: startX,
                                startY: startY,
                                progress: 0
                            };
                            updateLog("🌱 <strong>畫面外健康細胞／幹細胞增生遷徙進駐！</strong>從周邊體表移入填補空缺，組織重新啟動再生！");
                        }
                    }
                }
                return;
            }

            if (site.state === 'incoming') {
                const waitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                waitCircle.setAttribute("cx", site.x); waitCircle.setAttribute("cy", site.y); waitCircle.setAttribute("r", site.r);
                waitCircle.setAttribute("fill", "none"); waitCircle.setAttribute("stroke", "#f59e0b"); waitCircle.setAttribute("stroke-dasharray", "3,3");
                tissueSitesLayer.appendChild(waitCircle);
                return;
            }

            if (site.state === 'migrating_in') {
                const mig = site.migratingCell;
                if (!mig) { site.state = 'empty'; return; }

                mig.progress += 0.013;
                const t = Math.min(1, mig.progress);
                const ease = t * t * (3 - 2 * t);
                mig.x = mig.startX + (site.x - mig.startX) * ease;
                mig.y = mig.startY + (site.y - mig.startY) * ease;

                const waitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                waitCircle.setAttribute("cx", site.x); waitCircle.setAttribute("cy", site.y); waitCircle.setAttribute("r", site.r);
                waitCircle.setAttribute("fill", "none"); waitCircle.setAttribute("stroke", "#10b981"); waitCircle.setAttribute("stroke-dasharray", "3,3");
                waitCircle.setAttribute("stroke-width", "1.5");
                tissueSitesLayer.appendChild(waitCircle);

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${mig.x}, ${mig.y})`);

                const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                body.setAttribute("r", site.r);
                body.setAttribute("fill", "#ecfdf5");
                body.setAttribute("stroke", "#10b981");
                body.setAttribute("stroke-width", "2");
                body.setAttribute("opacity", "0.95");

                const nuc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                nuc.setAttribute("r", "6");
                nuc.setAttribute("fill", "#047857");

                g.appendChild(body);
                g.appendChild(nuc);
                tissueSitesLayer.appendChild(g);

                createSvgLabel("畫面外細胞增生遷徙填補", mig.x, mig.y - site.r - 8, 'rgba(4, 120, 87, 0.9)');

                if (mig.progress >= 1) {
                    site.state = 'healthy';
                    site.infectionProgress = 0;
                    site.migratingCell = null;
                    site.emptyTimer = 0;
                    updateStats();
                    updateLog("✨ <strong>畫面外幹細胞成功就位分化為新健康細胞！</strong>空缺已填滿，組織屏障維持恆定！");
                }
                return;
            }

            if (site.state === 'dividing') {
                site.mitosisProgress += 0.8;
                const p = site.mitosisProgress / 100;
                const target = site.targetSite;
                if (!target) { site.state = 'healthy'; return; }

                if (p < 0.5) {
                    const stretch = 1 + p * 0.6;
                    const angle = Math.atan2(target.y - site.y, target.x - site.x) * 180 / Math.PI;
                    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    g.setAttribute("transform", `translate(${site.x}, ${site.y}) rotate(${angle})`);

                    const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                    el.setAttribute("rx", site.r * stretch); el.setAttribute("ry", site.r * (1 / stretch));
                    el.setAttribute("fill", "#fef3c7"); el.setAttribute("stroke", "#f59e0b"); el.setAttribute("stroke-width", "2");

                    const n1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    n1.setAttribute("cx", -p * 22); n1.setAttribute("cy", 0); n1.setAttribute("r", 5.5); n1.setAttribute("fill", "#b45309");
                    const n2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    n2.setAttribute("cx", p * 22); n2.setAttribute("cy", 0); n2.setAttribute("r", 5.5); n2.setAttribute("fill", "#b45309");

                    g.appendChild(el); g.appendChild(n1); g.appendChild(n2);
                    tissueSitesLayer.appendChild(g);
                    createSvgLabel("有絲分裂中(DNA複製)", site.x, site.y - site.r - 8, 'rgba(217, 119, 6, 0.9)');
                } else {
                    const ratio = (p - 0.5) * 2;
                    const childX = site.x + (target.x - site.x) * ratio;
                    const childY = site.y + (target.y - site.y) * ratio;

                    const mG = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    mG.setAttribute("cx", site.x); mG.setAttribute("cy", site.y); mG.setAttribute("r", site.r);
                    mG.setAttribute("fill", "#fef3c7"); mG.setAttribute("stroke", "#f59e0b"); mG.setAttribute("stroke-width", "2");
                    const mN = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    mN.setAttribute("cx", site.x); mN.setAttribute("cy", site.y); mN.setAttribute("r", 5.5); mN.setAttribute("fill", "#b45309");

                    const cG = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    cG.setAttribute("cx", childX); cG.setAttribute("cy", childY); cG.setAttribute("r", site.r * (0.7 + 0.3 * ratio));
                    cG.setAttribute("fill", "#fef3c7"); cG.setAttribute("stroke", "#d97706"); cG.setAttribute("stroke-width", "2");
                    const cN = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    cN.setAttribute("cx", childX); cN.setAttribute("cy", childY); cN.setAttribute("r", 5); cN.setAttribute("fill", "#b45309");

                    tissueSitesLayer.appendChild(mG); tissueSitesLayer.appendChild(mN);
                    tissueSitesLayer.appendChild(cG); tissueSitesLayer.appendChild(cN);
                    createSvgLabel("新分裂子細胞", childX, childY - site.r - 8, 'rgba(217, 119, 6, 0.9)');
                }

                if (site.mitosisProgress >= 100) {
                    site.state = 'healthy'; site.mitosisProgress = 0;
                    target.state = 'healthy'; target.infectionProgress = 0;
                    site.targetSite = null;
                }
                return;
            }

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            body.setAttribute("cx", site.x); body.setAttribute("cy", site.y); body.setAttribute("r", site.r);

            if (site.state === 'infected') {
                site.infectionProgress += 0.15;
                body.setAttribute("fill", "#f3e8ff");
                body.setAttribute("stroke", "#9333ea");
                body.setAttribute("stroke-width", "2.5");
                g.appendChild(body);

                const vCount = Math.floor(site.infectionProgress / 20) + 1;
                for (let k = 0; k < vCount; k++) {
                    const a = (site.infectionProgress * 0.05) + (k * Math.PI * 2 / vCount);
                    const vDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    vDot.setAttribute("cx", site.x + Math.cos(a) * 11);
                    vDot.setAttribute("cy", site.y + Math.sin(a) * 11);
                    vDot.setAttribute("r", "3");
                    vDot.setAttribute("fill", "#9333ea");
                    g.appendChild(vDot);
                }
                createSvgLabel(`受病毒感染(${Math.floor(site.infectionProgress)}%)`, site.x, site.y - site.r - 8, 'rgba(147, 51, 234, 0.9)');

                if (site.infectionProgress >= 100) {
                    site.state = 'empty';
                    site.infectionProgress = 0;
                    createCellDebris(site.x, site.y, site.id, 5);
                    spawnFreeVirus(site.x, site.y, 4);
                    updateLog("💥 <strong>受感染細胞裂解死亡！</strong>病毒撐破宿主細胞，散出游離病毒並留下不規則細胞殘骸。");
                }
            } else {
                body.setAttribute("fill", "#fdebd0");
                body.setAttribute("stroke", "#f8c471");
                body.setAttribute("stroke-width", "2");
                body.setAttribute("opacity", "0.9");
                g.appendChild(body);

                const nuc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                nuc.setAttribute("cx", site.x); nuc.setAttribute("cy", site.y); nuc.setAttribute("r", "6");
                nuc.setAttribute("fill", "#eb984e");
                g.appendChild(nuc);
            }
            tissueSitesLayer.appendChild(g);
        });

        // ----------------------------------------------------
        // G. Cell Debris Layer (Mucosa clearance & Tissue Autolysis)
        // ----------------------------------------------------
        for (let idx = cellDebris.length - 1; idx >= 0; idx--) {
            const d = cellDebris[idx];
            d.life = (d.life || 450) - 1;

            if (d.x >= 500 || d.siteId === -1) {
                // Mucosal debris: carried rightward by mucus & cilia wave, pushed off-screen to the right!
                d.x += 1.3;
                const skinY = getSkinSurfaceY(d.x, swellingLevel);
                d.y = skinY - 6 + Math.sin(Date.now() * 0.003 - d.x * 0.04) * 2;

                if (d.x >= 1025) {
                    cellDebris.splice(idx, 1);
                    mucusClearedCount++;
                    updateStats();
                    updateLog("🌊 <strong>黏膜纖毛手扶梯成功將殘渣推送到畫面外排出！</strong>");
                    continue;
                }

                if (d.life < 100) {
                    d.alpha = Math.max(0, d.life / 100);
                }
                if (d.life <= 0 || d.alpha <= 0) {
                    cellDebris.splice(idx, 1);
                    continue;
                }
            } else {
                // Interstitial tissue debris: slow natural autolysis if not engulfed by macrophages
                if (d.life < 150) {
                    d.alpha = Math.max(0, d.life / 150);
                }
                if (d.life <= 0) {
                    cellDebris.splice(idx, 1);
                    continue;
                }
            }

            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pts = d.vertices.map(v => `${(d.x + v.x).toFixed(1)},${(d.y + v.y).toFixed(1)}`).join(" ");
            poly.setAttribute("points", pts);
            poly.setAttribute("fill", "#64748b");
            poly.setAttribute("stroke", "#94a3b8");
            poly.setAttribute("stroke-width", "1");
            poly.setAttribute("opacity", (0.85 * (d.alpha !== undefined ? d.alpha : 1)).toFixed(2));
            cellDebrisLayer.appendChild(poly);
            if (idx % 4 === 0) createSvgLabel("細胞殘骸", d.x, d.y - 10, 'rgba(100, 116, 139, 0.85)');
        }

        // ----------------------------------------------------
        // H. Pathogens (Bacteria, Free Viruses, Nematode Parasites)
        // ----------------------------------------------------
        for (let i = bacteria.length - 1; i >= 0; i--) {
            const b = bacteria[i];
            const skinY = getSkinSurfaceY(b.x, swellingLevel);
            const isWoundOpen = coagState.woundOpen > 0.05 && coagState.scabProgress < 0.75;
            const woundWidth = WOUND_HALF_W * coagState.woundOpen;
            const isAtWound = isWoundOpen && Math.abs(b.x - WOUND_X) < (woundWidth + 8);

            if (!b.inTissue) {
                if (b.x >= 500) {
                    // Mucosa Zone (Right: 500~1000)
                    const mucusTopY = skinY - 14;
                    if (b.y >= mucusTopY) {
                        b.trappedInMucus = true;
                        b.x += 1.4; // Continuous rightward propulsion by mucociliary escalator & fluid mucus!
                        b.y = skinY - 7 + Math.sin(Date.now() * 0.003 - b.x * 0.04) * 2;
                        b.angle += 0.04;

                        // Lysozyme bactericidal lysis
                        let lysed = false;
                        for (let ly of lysozymes) {
                            if (Math.hypot(b.x - ly.x, b.y - ly.y) < 18) {
                                ly.sparkle += 1.8;
                                createCellDebris(b.x, b.y, -1, 4);
                                bacteria.splice(i, 1);
                                mucusClearedCount++;
                                updateStats();
                                updateLog("💧 <strong>溶菌酶 (Lysozyme) 水解破壞細菌細胞壁！</strong>細菌裂解消滅，殘骸由黏液包覆向右排出。");
                                lysed = true;
                                break;
                            }
                        }
                        if (lysed) continue;

                        // Pushed completely off the right edge of the screen!
                        if (b.x >= 1025) {
                            bacteria.splice(i, 1);
                            mucusClearedCount++;
                            updateStats();
                            updateLog("🌊 <strong>纖毛黏液手扶梯（Mucociliary Escalator）成功將細菌推送到畫面外排出！</strong>");
                            continue;
                        }
                    } else {
                        // In air above mucosa: settle gently towards mucus blanket
                        b.x += b.vx;
                        b.y += b.vy;
                        b.vy += 0.04;
                        if (isWoundOpen && b.x < 650) b.vx -= 0.06; // Opportunistic drift towards wound on left
                    }
                } else {
                    // Stratified Epidermis (Skin) Zone (Left: 0~500)
                    b.trappedInMucus = false;
                    if (isWoundOpen) {
                        // Senses moisture & serum oozing from open wound: migrates towards wound opening
                        if (b.targetOffset === undefined) {
                            b.targetOffset = (Math.random() - 0.5) * woundWidth * 1.2;
                        }
                        const targetX = WOUND_X + b.targetOffset;
                        const targetY = getSkinSurfaceY(targetX, swellingLevel);
                        const dx = targetX - b.x;
                        const dy = targetY - b.y;
                        const dist = Math.hypot(dx, dy);

                        // Randomized wandering path (Brownian motion + gentle chemotactic attraction)
                        const steerForce = Math.min(0.65, 12.0 / (dist + 15));
                        const steerX = (dx / (dist + 0.001)) * steerForce;
                        const steerY = (dy / (dist + 0.001)) * steerForce;
                        const brownianX = (Math.random() - 0.5) * 0.45;
                        const brownianY = (Math.random() - 0.5) * 0.35;

                        b.vx = b.vx * 0.82 + (steerX + brownianX) * 0.18;
                        b.vy = b.vy * 0.82 + (steerY + brownianY) * 0.18;

                        if (b.y < targetY - 12) b.vy += 0.06; // Settle downwards

                        const spd = Math.hypot(b.vx, b.vy);
                        if (spd > 1.8) { b.vx = (b.vx / spd) * 1.8; b.vy = (b.vy / spd) * 1.8; }

                        b.x += b.vx;
                        b.y += b.vy;
                        b.angle += 0.03;

                        // Contact with skin surface or wound opening
                        if (b.y >= skinY - 3) {
                            if (isAtWound) {
                                // Enters dermis through the open cut!
                                b.inTissue = true;
                                b.y = skinY + 10;
                                b.vy = 0.5 + Math.random() * 0.4;
                                b.vx = (Math.random() - 0.5) * 0.6;
                                updateLog("⚠️ <strong>外界細菌感應到創口滲出液，循隨機路徑游移鑽入真皮層！</strong>");
                            } else {
                                // Intact skin surface: NO bouncing! Crawls along keratin towards wound!
                                b.y = skinY - 3;
                                b.vy = 0;
                                const crawlDir = b.x < WOUND_X ? 0.95 : -0.95;
                                b.vx = b.vx * 0.75 + crawlDir * 0.25 + (Math.random() - 0.5) * 0.2;
                            }
                        }
                    } else {
                        // Wound is closed: gentle Brownian drift in air, settles on corneum without bouncing!
                        b.vx = b.vx * 0.92 + (Math.random() - 0.5) * 0.14;
                        b.vy = b.vy * 0.92 + (Math.random() - 0.5) * 0.12;
                        if (b.y < skinY - 15) b.vy += 0.04;

                        b.x += b.vx;
                        b.y += b.vy;
                        b.angle += 0.02;

                        if (b.y >= skinY - 3) {
                            b.y = skinY - 3;
                            b.vy = 0;
                            b.vx = b.vx * 0.85 + (Math.random() - 0.5) * 0.12;
                        }
                    }
                }

                if (b.x < 20 || b.x > 970) b.vx *= -1;
                if (b.y < -55) { b.y = -55; b.vy = Math.abs(b.vy); }

            } else {
                // Inside dermal tissue
                if (!b.opsonized) {
                    b.x += b.vx; b.y += b.vy; b.angle += 0.03;
                    if (b.x < 30 || b.x > 970) b.vx *= -1;

                    // Support swollen upper dermis and wound cavity!
                    const dermisTop = getDermisTopY(b.x, swellingLevel);
                    if (b.y < dermisTop) {
                        b.y = dermisTop;
                        b.vy = Math.abs(b.vy);
                    } else if (b.y > 275) {
                        b.y = 275;
                        b.vy = -Math.abs(b.vy);
                    }

                    b.divideTimer++;
                    if (b.divideTimer > 450 && bacteria.length < 24) {
                        b.divideTimer = 0;
                        bacteria.push({
                            x: b.x + 8, y: b.y + 8,
                            vx: (Math.random() - 0.5) * 1.0, vy: (Math.random() - 0.5) * 1.0,
                            r: 7.5, inTissue: true, angle: Math.random() * Math.PI * 2,
                            opsonized: false, abCount: 0, divideTimer: 0
                        });
                    }
                }
            }

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${b.x}, ${b.y}) rotate(${b.angle * 180 / Math.PI})`);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", -9); rect.setAttribute("y", -4.5);
            rect.setAttribute("width", 18); rect.setAttribute("height", 9);
            rect.setAttribute("rx", 4.5);
            rect.setAttribute("fill", b.inTissue ? (b.opsonized ? "#15803d" : "#22c55e") : (b.trappedInMucus ? "#10b981" : "#86efac"));
            rect.setAttribute("stroke", b.inTissue ? "#14532d" : (b.trappedInMucus ? "#047857" : "#16a34a"));
            rect.setAttribute("stroke-width", "1.5");
            g.appendChild(rect);

            pathogensTissueLayer.appendChild(g);

            const bText = b.inTissue 
                ? (b.opsonized ? "細菌(抗體標記)" : "細菌(真皮感染)") 
                : (b.trappedInMucus 
                    ? "細菌(黏液捕捉・向右推送中)" 
                    : (isWoundOpen 
                        ? "細菌(感知創口・移行入侵中)" 
                        : (b.x >= 500 ? "外界細菌(黏膜上空)" : "外界細菌(角質阻隔・定植表皮)")));
            const bBg = b.inTissue 
                ? (b.opsonized ? 'rgba(21, 128, 61, 0.9)' : 'rgba(34, 197, 94, 0.85)') 
                : (b.trappedInMucus 
                    ? 'rgba(13, 148, 136, 0.9)' 
                    : (isWoundOpen 
                        ? 'rgba(217, 119, 6, 0.9)' 
                        : (b.x >= 500 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(22, 163, 74, 0.75)')));
            createSvgLabel(bText, b.x, b.y - 12, bBg);
        }

        // Free Viruses
        for (let i = freeViruses.length - 1; i >= 0; i--) {
            const v = freeViruses[i];
            const skinY = getSkinSurfaceY(v.x, swellingLevel);
            const isWoundOpen = coagState.woundOpen > 0.05 && coagState.scabProgress < 0.75;
            const woundWidth = WOUND_HALF_W * coagState.woundOpen;
            const isAtWound = isWoundOpen && Math.abs(v.x - WOUND_X) < (woundWidth + 8);

            if (!v.inTissue) {
                if (v.x >= 500) {
                    // Mucosa Zone (Right: 500~1000)
                    const mucusTopY = skinY - 14;
                    if (v.y >= mucusTopY) {
                        v.trappedInMucus = true;
                        v.x += 1.4; // Continuous rightward propulsion by mucus & cilia
                        v.y = skinY - 7 + Math.sin(Date.now() * 0.003 - v.x * 0.04) * 2;

                        // Secretory IgA Neutralization
                        for (let ab of sIgAList) {
                            if (Math.hypot(v.x - ab.x, v.y - ab.y) < 18) {
                                if (!v.opsonized) {
                                    v.opsonized = true;
                                    updateLog("🛡️ <strong>分泌型 IgA (sIgA) 專一性結合中和病毒！</strong>阻斷病毒吸附上皮細胞受體。");
                                }
                                break;
                            }
                        }

                        // Pushed completely off the right edge of the screen!
                        if (v.x >= 1025) {
                            freeViruses.splice(i, 1);
                            mucusClearedCount++;
                            updateStats();
                            updateLog("🌊 <strong>中和病毒已被黏液與纖毛推送到畫面外徹底排除！</strong>");
                            continue;
                        }
                    } else {
                        // In air above mucosa: settle gently towards mucus
                        v.x += v.vx;
                        v.y += v.vy;
                        v.vy += 0.04;
                        if (isWoundOpen && v.x < 650) v.vx -= 0.08;
                    }
                } else {
                    // Skin Zone (Left: 0~500)
                    v.trappedInMucus = false;
                    if (isWoundOpen) {
                        // Diffusion & chemotaxis towards wound
                        if (v.targetOffset === undefined) {
                            v.targetOffset = (Math.random() - 0.5) * woundWidth * 1.2;
                        }
                        const targetX = WOUND_X + v.targetOffset;
                        const targetY = getSkinSurfaceY(targetX, swellingLevel);
                        const dx = targetX - v.x;
                        const dy = targetY - v.y;
                        const dist = Math.hypot(dx, dy);

                        const steer = Math.min(0.65, 12.0 / (dist + 15));
                        v.vx = v.vx * 0.84 + ((dx / (dist + 0.001)) * steer + (Math.random() - 0.5) * 0.5) * 0.16;
                        v.vy = v.vy * 0.84 + ((dy / (dist + 0.001)) * steer + (Math.random() - 0.5) * 0.4) * 0.16;
                        if (v.y < targetY - 10) v.vy += 0.06;

                        const spd = Math.hypot(v.vx, v.vy);
                        if (spd > 1.8) { v.vx = (v.vx / spd) * 1.8; v.vy = (v.vy / spd) * 1.8; }

                        v.x += v.vx; v.y += v.vy;

                        if (v.y >= skinY - 3) {
                            if (isAtWound) {
                                v.inTissue = true;
                                v.y = skinY + 8;
                                v.vy = Math.abs(v.vy) * 0.6 + 0.3;
                                updateLog("👾 <strong>外界病毒經創口侵入真皮層！</strong>開始尋找健康細胞感染。");
                            } else {
                                v.y = skinY - 3;
                                v.vy = 0;
                                const crawlDir = v.x < WOUND_X ? 0.9 : -0.9;
                                v.vx = v.vx * 0.75 + crawlDir * 0.25 + (Math.random() - 0.5) * 0.2;
                            }
                        }
                    } else {
                        // Wound closed: gentle Brownian diffusion in air or adhering to stratum corneum
                        v.vx = v.vx * 0.92 + (Math.random() - 0.5) * 0.16;
                        v.vy = v.vy * 0.92 + (Math.random() - 0.5) * 0.14;
                        if (v.y < skinY - 15) v.vy += 0.04;

                        v.x += v.vx; v.y += v.vy;
                        if (v.y >= skinY - 3) {
                            v.y = skinY - 3;
                            v.vy = 0;
                            v.vx = v.vx * 0.85 + (Math.random() - 0.5) * 0.1;
                        }
                    }
                }

                if (v.x < 20 || v.x > 970) v.vx *= -1;
                if (v.y < -55) { v.y = -55; v.vy = Math.abs(v.vy); }

            } else {
                // Inside dermal tissue
                if (!v.opsonized) {
                    const healthyCells = tissueSites.filter(c => c.state === 'healthy');
                    if (healthyCells.length > 0) {
                        const nearest = healthyCells.reduce((prev, curr) =>
                            Math.hypot(curr.x - v.x, curr.y - v.y) < Math.hypot(prev.x - v.x, prev.y - v.y) ? curr : prev
                        );
                        const dx = nearest.x - v.x, dy = nearest.y - v.y, dist = Math.hypot(dx, dy);
                        if (dist > nearest.r) {
                            v.x += (dx / dist) * 1.0; v.y += (dy / dist) * 1.0;
                        } else {
                            v.penetratingTimer++;
                            v.x += (dx / dist) * 0.3; v.y += (dy / dist) * 0.3;
                            if (v.penetratingTimer > 40) {
                                nearest.state = 'infected'; nearest.infectionProgress = 10;
                                freeViruses.splice(i, 1);
                                continue;
                            }
                        }
                    } else {
                        v.x += v.vx; v.y += v.vy;
                        if (v.x < 30 || v.x > 970) v.vx *= -1;
                        const dermisTop = getDermisTopY(v.x, swellingLevel);
                        if (v.y < dermisTop) { v.y = dermisTop; v.vy = Math.abs(v.vy); }
                        else if (v.y > 275) { v.y = 275; v.vy = -Math.abs(v.vy); }
                    }
                }
            }

            const vG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            vG.setAttribute("transform", `translate(${v.x}, ${v.y})`);
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", v.r);
            circle.setAttribute("fill", v.inTissue ? (v.opsonized ? "#c084fc" : "#a855f7") : (v.trappedInMucus ? (v.opsonized ? "#67e8f9" : "#38bdf8") : "#d8b4fe"));
            circle.setAttribute("stroke", v.inTissue ? "#581c87" : (v.trappedInMucus ? "#0284c7" : "#7e22ce"));
            circle.setAttribute("stroke-width", "1.2");
            vG.appendChild(circle);

            for (let s = 0; s < 6; s++) {
                const a = (Math.PI * 2 / 6) * s;
                const spike = document.createElementNS("http://www.w3.org/2000/svg", "line");
                spike.setAttribute("x1", Math.cos(a) * v.r);
                spike.setAttribute("y1", Math.sin(a) * v.r);
                spike.setAttribute("x2", Math.cos(a) * (v.r + 2.5));
                spike.setAttribute("y2", Math.sin(a) * (v.r + 2.5));
                spike.setAttribute("stroke", v.inTissue ? "#581c87" : (v.trappedInMucus ? "#0284c7" : "#7e22ce"));
                spike.setAttribute("stroke-width", "1.2");
                vG.appendChild(spike);
            }
            pathogensTissueLayer.appendChild(vG);

            const vText = v.inTissue 
                ? (v.opsonized ? "病毒(已中和)" : "游離病毒(真皮感染)") 
                : (v.trappedInMucus 
                    ? (v.opsonized ? "病毒(sIgA中和・向右排障中)" : "病毒(黏液捕捉・向右推送中)") 
                    : (isWoundOpen 
                        ? "病毒(向創口擴散移行中)" 
                        : (v.x >= 500 ? "外界病毒(黏膜上空)" : "外界病毒(角質阻隔・定植表皮)")));
            const vBg = v.inTissue 
                ? (v.opsonized ? 'rgba(192, 132, 252, 0.9)' : 'rgba(168, 85, 247, 0.85)') 
                : (v.trappedInMucus 
                    ? 'rgba(14, 116, 144, 0.9)' 
                    : (isWoundOpen 
                        ? 'rgba(217, 119, 6, 0.9)' 
                        : (v.x >= 500 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(126, 34, 206, 0.75)')));
            createSvgLabel(vText, v.x, v.y - 12, vBg);
        }

        // Nematode Parasites
        for (let i = parasites.length - 1; i >= 0; i--) {
            const p = parasites[i];
            const skinY = getSkinSurfaceY(p.x, swellingLevel);
            const isWoundOpen = coagState.woundOpen > 0.05 && coagState.scabProgress < 0.75;
            const woundWidth = WOUND_HALF_W * coagState.woundOpen;
            const isAtWound = isWoundOpen && Math.abs(p.x - WOUND_X) < (woundWidth + 14);

            p.phase += 0.12;

            if (!p.inTissue) {
                if (p.x >= 500) {
                    // Mucosa Zone (Right: 500~1000)
                    const contactY = skinY - 14;
                    if (p.y >= contactY - 2) {
                        p.trappedInMucus = true;
                        p.x += 1.1; // Trapped and propelled rightward by mucus blanket & cilia
                        p.y = skinY - 8 + Math.sin(Date.now() * 0.003 - p.x * 0.04) * 2;
                        p.angle = lerpAngle(p.angle, Math.sin(p.phase) * 0.08, 0.1);
                        updateLog("🛡️ <strong>黏膜緻密黏液毯與纖毛屏障阻絕寄生蟲，並向右推動排障！</strong>");

                        // Pushed completely off the right edge of the screen!
                        if (p.x >= 1045) {
                            parasites.splice(i, 1);
                            mucusClearedCount++;
                            updateStats();
                            updateLog("🌊 <strong>黏膜纖毛擺動與黏液毯成功將大型寄生蟲推送到畫面外排出！</strong>");
                            continue;
                        }
                    } else {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.03;
                        if (isWoundOpen && p.x < 650) p.vx -= 0.08; // Creeps towards skin side on left
                        if (Math.hypot(p.vx, p.vy) > 0.3) {
                            p.angle = lerpAngle(p.angle, Math.atan2(p.vy, p.vx), 0.1);
                        }
                    }
                } else {
                    // Skin Zone (Left: 0~500)
                    const skinSlope = (getSkinSurfaceY(p.x + 10, swellingLevel) - getSkinSurfaceY(p.x - 10, swellingLevel)) / 20;
                    const skinTangent = Math.atan2(skinSlope, 1);
                    const surfaceWiggle = skinTangent + Math.sin(p.phase) * 0.1;

                    if (isWoundOpen) {
                        // Senses serum & tissue warmth from wound: crawls towards cut!
                        const targetY = getSkinSurfaceY(WOUND_X, swellingLevel);
                        const dx = WOUND_X - p.x;
                        const dy = targetY - p.y;
                        const dist = Math.hypot(dx, dy);

                        const steer = Math.min(0.65, 12.0 / (dist + 15));
                        const steerX = (dx / (dist + 0.001)) * steer;
                        const steerY = (dy / (dist + 0.001)) * steer;

                        // Perpendicular serpentine wiggling wave
                        const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        const undulation = Math.sin(p.phase * 2) * 0.35;
                        const undX = Math.cos(perpAngle) * undulation;
                        const undY = Math.sin(perpAngle) * undulation;

                        // Brownian crawl jitter
                        const randX = (Math.random() - 0.5) * 0.22;
                        const randY = (Math.random() - 0.5) * 0.16;

                        p.vx = p.vx * 0.85 + (steerX + undX + randX) * 0.15;
                        p.vy = p.vy * 0.85 + (steerY + undY + randY) * 0.15;

                        if (p.y < targetY - 14) p.vy += 0.06;

                        const spd = Math.hypot(p.vx, p.vy);
                        if (spd > 1.6) { p.vx = (p.vx / spd) * 1.6; p.vy = (p.vy / spd) * 1.6; }

                        p.x += p.vx;
                        p.y += p.vy;

                        // Contact with skin surface or open wound
                        if (p.y >= skinY - 5) {
                            if (isAtWound) {
                                // Worm slithers through the open cut into dermis!
                                p.inTissue = true;
                                p.y = skinY + 16;
                                p.vy = 0.5;
                                p.vx = (Math.random() - 0.5) * 0.3;
                                p.angle = Math.PI / 2;
                                updateLog("🪱 <strong>大型線蟲受創口組織吸引，蜿蜒爬行鑽入真皮組織！</strong>嗜酸性球準備釋放毒性顆粒！");
                            } else {
                                // Slithers along skin surface towards wound gap, NO bouncing!
                                p.y = skinY - 5;
                                p.vy = 0;
                                const crawlDir = p.x < WOUND_X ? 0.9 : -0.9;
                                p.vx = p.vx * 0.75 + crawlDir * 0.25 + (Math.random() - 0.5) * 0.15;
                                p.angle = lerpAngle(p.angle, surfaceWiggle, 0.15);
                            }
                        } else {
                            if (spd > 0.35) {
                                p.angle = lerpAngle(p.angle, Math.atan2(p.vy, p.vx), 0.1);
                            }
                        }
                    } else {
                        // Wound closed: wriggles / crawls peacefully on stratum corneum, cannot enter, NO bouncing!
                        p.vx = p.vx * 0.92 + (Math.random() - 0.5) * 0.12;
                        p.vy = p.vy * 0.92 + (Math.random() - 0.5) * 0.08;
                        if (p.y < skinY - 15) p.vy += 0.04;

                        p.x += p.vx;
                        p.y += p.vy;

                        if (p.y >= skinY - 5) {
                            p.y = skinY - 5;
                            p.vy = 0;
                            p.vx = p.vx * 0.85 + (Math.random() - 0.5) * 0.2;
                            p.angle = lerpAngle(p.angle, surfaceWiggle, 0.15);
                        } else {
                            if (Math.hypot(p.vx, p.vy) > 0.35) {
                                p.angle = lerpAngle(p.angle, Math.atan2(p.vy, p.vx), 0.1);
                            }
                        }
                    }
                }

                if (p.x < 30 || p.x > 970) p.vx *= -1;
                if (p.y < -50) { p.y = -50; p.vy = Math.abs(p.vy); }

            } else {
                // Inside dermis
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 40 || p.x > 960) p.vx *= -1;

                const dermisTop = getDermisTopY(p.x, swellingLevel) + 6;
                if (p.y < dermisTop) {
                    p.y = dermisTop;
                    p.vy = Math.abs(p.vy);
                } else if (p.y > 260) {
                    p.y = 260;
                    p.vy = -Math.abs(p.vy);
                }

                const inTissueSpd = Math.hypot(p.vx, p.vy);
                if (inTissueSpd > 0.25) {
                    p.angle = lerpAngle(p.angle, Math.atan2(p.vy, p.vx) + Math.sin(p.phase) * 0.15, 0.08);
                }

                if (p.hp <= 0) {
                    createCellDebris(p.x - 12, p.y, -1, 4);
                    createCellDebris(p.x + 12, p.y, -1, 4);
                    parasites.splice(i, 1);
                    updateLog("🎉 <strong>寄生蟲已被徹底溶解消滅！</strong>嗜酸性球的毒性顆粒成功將蟲體瓦解。");
                    continue;
                }
            }

            const pG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            pG.setAttribute("transform", `translate(${p.x}, ${p.y}) rotate(${p.angle * 180 / Math.PI})`);

            const numPts = 12;
            const length = 75;
            let dPath = '';
            for (let k = 0; k < numPts; k++) {
                const t = k / (numPts - 1);
                const px = (t - 0.5) * length;
                const py = Math.sin(p.phase + t * Math.PI * 2.5) * 8;
                dPath += (k === 0 ? 'M ' : 'L ') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
            }

            const pBody = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pBody.setAttribute("d", dPath);
            pBody.setAttribute("stroke", p.inTissue ? "#f59e0b" : "#fde68a");
            pBody.setAttribute("stroke-width", "12");
            pBody.setAttribute("stroke-linecap", "round");
            pBody.setAttribute("fill", "none");

            const pCore = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pCore.setAttribute("d", dPath);
            pCore.setAttribute("stroke", p.inTissue ? "#d97706" : "#f59e0b");
            pCore.setAttribute("stroke-width", "3");
            pCore.setAttribute("fill", "none");

            pG.appendChild(pBody);
            pG.appendChild(pCore);
            pathogensTissueLayer.appendChild(pG);

            const pText = p.inTissue 
                ? `大型線蟲(真皮內, ${Math.ceil(p.hp)}%)` 
                : (isWoundOpen 
                    ? "外界線蟲(感知創口・爬行移行中)" 
                    : (p.x >= 500 && p.y >= skinY - 18 ? "大型線蟲(黏膜受阻・向右排障)" : (p.x >= 500 ? "外界線蟲(黏膜上空)" : "外界線蟲(角質阻隔・定植表皮)")));
            const pBg = p.inTissue 
                ? 'rgba(180, 83, 9, 0.9)' 
                : (isWoundOpen ? 'rgba(234, 88, 12, 0.9)' : 'rgba(217, 119, 6, 0.75)');
            createSvgLabel(pText, p.x, p.y - 18, pBg);
        }

        // ----------------------------------------------------
        // I. Tissue Chemicals (Histamines, Granules, Antibodies)
        // ----------------------------------------------------
        for (let i = histamines.length - 1; i >= 0; i--) {
            const h = histamines[i];
            h.x += h.vx; h.y += h.vy; h.life--;
            if (h.life <= 0) { histamines.splice(i, 1); continue; }
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", h.x); dot.setAttribute("cy", h.y);
            dot.setAttribute("r", "2.5");
            dot.setAttribute("fill", "#38bdf8");
            dot.setAttribute("opacity", (h.life / 100).toFixed(2));
            chemicalsLayer.appendChild(dot);
        }

        for (let i = eosinophilGranules.length - 1; i >= 0; i--) {
            const g = eosinophilGranules[i];
            g.x += g.vx; g.y += g.vy; g.life--;
            if (g.life <= 0) { eosinophilGranules.splice(i, 1); continue; }
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", g.x); dot.setAttribute("cy", g.y);
            dot.setAttribute("r", "2.8");
            dot.setAttribute("fill", "#f43f5e");
            chemicalsLayer.appendChild(dot);
        }

        for (let i = antibodies.length - 1; i >= 0; i--) {
            const ab = antibodies[i];
            ab.life--;
            if (ab.life <= 0) { antibodies.splice(i, 1); continue; }
            const targets = [...bacteria.filter(b => b.inTissue && b.abCount < 3), ...freeViruses.filter(v => v.inTissue && v.abCount < 2)];
            if (targets.length > 0) {
                const target = targets[0];
                const dx = target.x - ab.x, dy = target.y - ab.y, dist = Math.hypot(dx, dy);
                ab.x += (dx / dist) * 2.8; ab.y += (dy / dist) * 2.8;
                if (dist < target.r + 5) {
                    target.abCount++;
                    if (!target.opsonized && target.abCount >= 2) target.opsonized = true;
                    antibodies.splice(i, 1); continue;
                }
            } else {
                ab.x += ab.vx; ab.y += ab.vy;
                if (ab.x < 40 || ab.x > 960) ab.vx *= -1;
                const abTop = getDermisTopY(ab.x, swellingLevel);
                if (ab.y < abTop || ab.y > 275) ab.vy *= -1;
            }

            const yG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            yG.setAttribute("transform", `translate(${ab.x}, ${ab.y})`);
            const yLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
            yLine.setAttribute("d", "M 0 4 L 0 0 L -3 -3 M 0 0 L 3 -3");
            yLine.setAttribute("stroke", "#f97316");
            yLine.setAttribute("stroke-width", "1.5");
            yLine.setAttribute("fill", "none");
            yG.appendChild(yLine);
            chemicalsLayer.appendChild(yG);
        }

        // ----------------------------------------------------
        // J. Intravascular & Extravasating (Amoeboid / Wound) WBCs
        // ----------------------------------------------------
        const isSwollen = activeEffects.has('swelling') || gapSize > 3.5 || swellingLevel > 0.2;
        const squeezeSpeed = isSwollen ? 1.8 : 0.8;

        // Auto physiological recruitment of leukocytes when tissue is swollen or infected
        const hasTargets = bacteria.some(b => b.inTissue) || freeViruses.some(v => v.inTissue) || parasites.some(p => p.inTissue) || cellDebris.length > 0 || tissueSites.some(c => c.state === 'infected') || coagStage >= 1 || isSwollen;

        if (isSwollen || hasTargets) {
            autoWbcRecruitTimer++;
            const recruitInterval = isSwollen ? 220 : 380;
            if (autoWbcRecruitTimer > recruitInterval && (bloodWBCs.length + activeTissueWBCs.length) < 8) {
                autoWbcRecruitTimer = 0;
                const pool = isSwollen ? ['neutrophil', 'neutrophil', 'monocyte'] : ['neutrophil', 'monocyte'];
                recruitCirculatingWbc(pool[Math.floor(Math.random() * pool.length)]);
            }
        } else {
            autoWbcRecruitTimer = 0;
        }

        for (let i = bloodWBCs.length - 1; i >= 0; i--) {
            const wbc = bloodWBCs[i];

            if (wbc.state === 'patrol') {
                if (!wbc.targetGapX) {
                    assignWbcExitStrategy(wbc);
                }

                wbc.x += flowSpeed * 0.9;
                if (wbc.x > 1020) {
                    wbc.x = -20;
                    wbc.laneOffset = (Math.random() - 0.5) * 0.75;
                    wbc.branchId = chooseWbcBranch(wbc.subtype);
                    assignWbcExitStrategy(wbc);
                }

                // If targets are present (or tissue is swollen) and wbc approaches an endothelial gap
                const nearTargetGap = wbc.targetGapX && Math.abs(wbc.x - wbc.targetGapX) < (isSwollen ? 24 : 14);
                const nearAnyGap = isSwollen && ENDO_GAPS.some(gx => Math.abs(wbc.x - gx) < 18);

                if (hasTargets && (nearTargetGap || nearAnyGap)) {
                    if (nearAnyGap && !nearTargetGap) {
                        wbc.targetGapX = ENDO_GAPS.find(gx => Math.abs(wbc.x - gx) < 18);
                    }
                    wbc.x = wbc.targetGapX;
                    wbc.amoebaProgress = 0;
                    if (wbc.exitRoute === 'wound' && coagState.woundOpen > 0.08 && coagState.scabProgress < 0.7) {
                        wbc.state = 'wound_exit';
                        updateLog(`🛡️ <strong>${getWbcName(wbc.subtype)}從傷口破口直接移出！</strong>進入創傷中心消滅病原。`);
                    } else {
                        wbc.state = 'diapedesis';
                        updateLog(`🔬 <strong>${getWbcName(wbc.subtype)}於內皮間隙展現變形蟲運動遊出 (Diapedesis)！</strong>${isSwollen ? '（組織水腫使內皮間隙顯著擴大，白血球極易滲出至組織間質）' : ''}`);
                    }
                }

                // Dynamic Y position: strictly inside arteriole, smoothly curving leftward into capillary
                const branchObj = BRANCHES.find(b => b.id === wbc.branchId) || BRANCHES[0];
                const halfArt = arterioleWidth / 2;
                const halfCap = capillaryWidth / 2;
                const laneOff = wbc.laneOffset !== undefined ? wbc.laneOffset : 0;

                // Safe spread inside arteriole: strictly contained within arteriole walls
                const maxSpread = Math.max(2, halfArt - wbc.r - 2);
                const branchBias = wbc.branchId === 'top' ? -0.35 : (wbc.branchId === 'bot' ? 0.35 : 0);
                const startY = 65 + branchBias * maxSpread + laneOff * (maxSpread * 0.45);

                const endY = branchObj.targetY + laneOff * Math.max(0, halfCap - wbc.r - 1);

                let localY;
                const xTransStart = 95;
                const xTransEnd = 148;
                if (wbc.x < xTransStart) {
                    localY = startY;
                } else if (wbc.x >= xTransStart && wbc.x < xTransEnd) {
                    const t = (wbc.x - xTransStart) / (xTransEnd - xTransStart);
                    const s = t * t * (3 - 2 * t);
                    localY = startY + (endY - startY) * s;
                } else {
                    localY = endY;
                }
                wbc.y = localY;
                const wbcGlobalY = 300 + localY;

                // Render patrolling spherical WBC in vessel
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${wbc.x}, ${wbcGlobalY})`);

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("r", wbc.r);
                circle.setAttribute("fill", getWbcColor(wbc.subtype));
                circle.setAttribute("stroke", "#fff");
                circle.setAttribute("stroke-width", "1.2");
                g.appendChild(circle);

                drawWbcNucleus(g, wbc.subtype, wbc.r);
                activeWbcLayer.appendChild(g);

            } else if (wbc.state === 'diapedesis') {
                // Amoeboid squeezing through vascular endothelial gap
                wbc.amoebaProgress += 0.013 * squeezeSpeed;
                const branchObj = BRANCHES.find(b => b.id === wbc.branchId) || BRANCHES[0];
                const lumenY = 300 + branchObj.targetY;
                const tissueTargetY = 260;
                const currentY = lumenY - (lumenY - tissueTargetY) * wbc.amoebaProgress;

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                drawAmoeboidWbc(g, wbc.x, currentY, wbc.r, wbc.amoebaProgress, wbc.subtype, 'diapedesis');
                activeWbcLayer.appendChild(g);

                createSvgLabel("變形蟲偽足遊出 (Diapedesis)", wbc.x, currentY - wbc.r - 10, 'rgba(30, 41, 59, 0.9)');

                if (wbc.amoebaProgress >= 1) {
                    wbc.state = 'hunting';
                    wbc.y = tissueTargetY;
                    if (wbc.subtype === 'monocyte') {
                        wbc.subtype = 'macrophage';
                        wbc.r = 11.5;
                        updateLog("🟣 <strong>單核球穿出分化為「巨噬細胞」！</strong>以變形蟲運動巡邏並吞噬病原殘骸。");
                    }
                    activeTissueWBCs.push(wbc);
                    bloodWBCs.splice(i, 1);
                }

            } else if (wbc.state === 'wound_exit') {
                // Amoeboid crawling directly out through torn wound opening
                wbc.amoebaProgress += 0.015 * squeezeSpeed;
                const breachY = 312;
                const tissueTargetY = 245;
                const currentY = breachY - (breachY - tissueTargetY) * wbc.amoebaProgress;
                const wiggleX = wbc.targetGapX + Math.sin(wbc.amoebaProgress * Math.PI * 2) * 8;

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                drawAmoeboidWbc(g, wiggleX, currentY, wbc.r, wbc.amoebaProgress, wbc.subtype, 'wound_exit');
                activeWbcLayer.appendChild(g);

                createSvgLabel("從創口破口移出 (Wound Emigration)", wiggleX, currentY - wbc.r - 10, 'rgba(185, 28, 28, 0.9)');

                if (wbc.amoebaProgress >= 1) {
                    wbc.state = 'hunting';
                    wbc.x = wiggleX;
                    wbc.y = tissueTargetY;
                    if (wbc.subtype === 'monocyte') {
                        wbc.subtype = 'macrophage';
                        wbc.r = 11.5;
                        updateLog("🟣 <strong>單核球從創口移出分化為「巨噬細胞」！</strong>進駐創傷核心進行清創。");
                    }
                    activeTissueWBCs.push(wbc);
                    bloodWBCs.splice(i, 1);
                }
            }
        }

        // ----------------------------------------------------
        // K. Active Roaming Leukocytes
        // ----------------------------------------------------
        for (let i = activeTissueWBCs.length - 1; i >= 0; i--) {
            const w = activeTissueWBCs[i];
            w.tissueLife--;

            if (w.subtype === 'basophil') {
                if (w.degranulating > 0) {
                    w.degranulating--;
                    if (w.degranulating % 4 === 0) {
                        histamines.push({
                            x: w.x, y: w.y,
                            vx: (Math.random() - 0.5) * 2.2, vy: (Math.random() - 0.5) * 2.2, life: 100
                        });
                    }
                }
            } else if (w.subtype === 'bcell') {
                if (w.producing > 0) {
                    w.producing--;
                    if (w.producing % 5 === 0) {
                        antibodies.push({
                            x: w.x, y: w.y,
                            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 400
                        });
                    }
                }
            } else if (w.subtype === 'eosinophil') {
                const tissueParasites = parasites.filter(p => p.inTissue);
                if (tissueParasites.length > 0) {
                    const target = tissueParasites[0];
                    const dx = target.x - w.x, dy = target.y - w.y, dist = Math.hypot(dx, dy);
                    if (dist > 45) {
                        w.x += (dx / dist) * 1.6; w.y += (dy / dist) * 1.6;
                    } else {
                        if (Math.random() < 0.35 && w.ammo > 0) {
                            w.ammo--;
                            target.hp -= 0.5;
                            eosinophilGranules.push({
                                x: w.x, y: w.y,
                                vx: (dx / dist) * 2.8 + (Math.random() - 0.5),
                                vy: (dy / dist) * 2.8 + (Math.random() - 0.5),
                                life: 16
                            });
                        }
                    }
                } else {
                    w.x += (Math.random() - 0.5) * 0.8; w.y += (Math.random() - 0.5) * 0.8;
                }
            } else if (w.subtype === 'tcell' || w.subtype === 'nk') {
                const infectedCells = tissueSites.filter(c => c.state === 'infected');
                if (infectedCells.length > 0) {
                    const target = infectedCells[0];
                    const dx = target.x - w.x, dy = target.y - w.y, dist = Math.hypot(dx, dy);
                    w.x += (dx / dist) * 2.0; w.y += (dy / dist) * 2.0;
                    if (dist < target.r + w.r) {
                        target.state = 'empty';
                        target.infectionProgress = 0;
                        createCellDebris(target.x, target.y, target.id, 5);
                        const kName = w.subtype === 'nk' ? '自然殺手 (NK) 細胞' : '毒殺型 T 細胞';
                        updateLog(`⚔️ <strong>${kName}摧毀了受感染宿主細胞！</strong>阻止病毒繼續繁殖。`);
                    }
                } else {
                    w.x += (Math.random() - 0.5) * 0.8; w.y += (Math.random() - 0.5) * 0.8;
                }
            } else if (w.subtype === 'neutrophil' || w.subtype === 'macrophage') {
                const targets = [
                    ...bacteria.filter(b => b.inTissue).map(item => ({ type: 'bacteria', item, priority: 1 })),
                    ...freeViruses.filter(v => v.inTissue).map(item => ({ type: 'virus', item, priority: 1.4 })),
                    ...cellDebris.map(item => ({ type: 'debris', item, priority: w.subtype === 'macrophage' ? 0.8 : 2.5 }))
                ];

                if (targets.length > 0) {
                    const best = targets.reduce((prev, curr) => {
                        const dP = Math.hypot(prev.item.x - w.x, prev.item.y - w.y) * prev.priority;
                        const dC = Math.hypot(curr.item.x - w.x, curr.item.y - w.y) * curr.priority;
                        return dC < dP ? curr : prev;
                    });
                    const dx = best.item.x - w.x, dy = best.item.y - w.y, dist = Math.hypot(dx, dy);
                    const speed = w.subtype === 'neutrophil' ? 1.8 : 1.4;
                    w.x += (dx / dist) * speed; w.y += (dy / dist) * speed;

                    if (dist < w.r + (best.item.r || 5)) {
                        if (best.type === 'bacteria') {
                            const bIdx = bacteria.indexOf(best.item);
                            if (bIdx !== -1) bacteria.splice(bIdx, 1);
                        } else if (best.type === 'virus') {
                            const vIdx = freeViruses.indexOf(best.item);
                            if (vIdx !== -1) freeViruses.splice(vIdx, 1);
                        } else if (best.type === 'debris') {
                            const dIdx = cellDebris.indexOf(best.item);
                            if (dIdx !== -1) cellDebris.splice(dIdx, 1);
                        }
                        w.eatenCount++;
                    }
                } else {
                    w.x += (Math.random() - 0.5) * 0.6; w.y += (Math.random() - 0.5) * 0.6;
                }

                if (w.subtype === 'neutrophil' && w.eatenCount >= w.maxEat) {
                    w.alpha -= 0.02;
                    if (w.alpha <= 0) { activeTissueWBCs.splice(i, 1); continue; }
                }
            }

            const dermisTop = getDermisTopY(w.x, swellingLevel);
            w.x = Math.max(40, Math.min(960, w.x));
            w.y = Math.max(dermisTop, Math.min(275, w.y));

            if (w.tissueLife <= 0) {
                w.alpha -= 0.02;
                if (w.alpha <= 0) { activeTissueWBCs.splice(i, 1); continue; }
            }

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${w.x}, ${w.y})`);
            g.setAttribute("opacity", (w.alpha || 1).toFixed(2));

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", w.r);
            circle.setAttribute("fill", getWbcColor(w.subtype));
            circle.setAttribute("stroke", "#fff");
            circle.setAttribute("stroke-width", "1.5");
            g.appendChild(circle);

            drawWbcNucleus(g, w.subtype, w.r);
            activeWbcLayer.appendChild(g);

            createSvgLabel(getWbcLabelText(w), w.x, w.y - w.r - 8, getWbcLabelBg(w.subtype));
        }

        // ----------------------------------------------------
        // L. Intravascular RBCs & Platelet/Plasma Stream
        // ----------------------------------------------------
        const halfCap = capillaryWidth / 2;
        const halfArt = arterioleWidth / 2;
        const xTransStart = 95;
        const xTransEnd = 148;

        bloodParticles.forEach(p => {
            let sectionSpeed = flowSpeed;
            if (p.x < xTransEnd) sectionSpeed = flowSpeed * (22 / arterioleWidth);
            p.x += sectionSpeed;
            if (p.x > 1020) {
                p.x = -20;
                const bIds = ['top', 'mid', 'bot'];
                p.branchId = bIds[Math.floor(Math.random() * bIds.length)];
                p.laneOffset = (Math.random() - 0.5);
            }

            const targetBranchObj = BRANCHES.find(b => b.id === p.branchId) || BRANCHES[1];
            const branchY = targetBranchObj.targetY;

            // Shift transition leftward (x: 95 -> 148) so RBCs & platelets curve smoothly into capillary
            // and pass cleanly through precapillary sphincters (x=152..164) without overshooting outside
            const maxSpread = Math.max(1, halfArt - p.r - 2);
            const branchBias = p.branchId === 'top' ? -0.4 : (p.branchId === 'bot' ? 0.4 : 0);
            const startY = 65 + branchBias * maxSpread + p.laneOffset * (maxSpread * 0.45);
            const endY = branchY + (capillaryWidth > 20 ? p.laneOffset * (halfCap - p.r) : p.laneOffset * Math.max(0, halfCap - p.r - 1.2));

            if (p.x < xTransStart) {
                p.y = startY;
            } else if (p.x >= xTransStart && p.x < xTransEnd) {
                const t = (p.x - xTransStart) / (xTransEnd - xTransStart);
                const s = t * t * (3 - 2 * t);
                p.y = startY + (endY - startY) * s;
            } else {
                p.y = endY;
            }

            p.el.setAttribute("cx", p.x);
            p.el.setAttribute("cy", p.y);
        });

        // ----------------------------------------------------
        // M. Nerve Pain Pulses (Distributed Dermal Plexus)
        // ----------------------------------------------------
        function evalCubicBezier(p0, p1, p2, p3, t) {
            const mt = 1 - t;
            const mt2 = mt * mt;
            const t2 = t * t;
            return {
                x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
                y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y
            };
        }

        function getNervePulseCoord(idx, prog) {
            if (prog >= 0.45) {
                const t = (prog - 0.45) / 0.55;
                return evalCubicBezier(
                    { x: 360, y: 200 },
                    { x: 230, y: 220 },
                    { x: 100, y: 245 },
                    { x: -10, y: 240 },
                    t
                );
            }

            const t = prog / 0.45;
            if (idx === 0) {
                // Path 0: From Terminal 1 (240, 125) via Branch 1 to (360, 200)
                return evalCubicBezier(
                    { x: 240, y: 125 },
                    { x: 270, y: 155 },
                    { x: 320, y: 170 },
                    { x: 360, y: 200 },
                    t
                );
            } else if (idx === 1) {
                // Path 1: From Terminal 2 (395, 75) via Branch 2 to (360, 200)
                return evalCubicBezier(
                    { x: 395, y: 75 },
                    { x: 370, y: 110 },
                    { x: 385, y: 160 },
                    { x: 360, y: 200 },
                    t
                );
            } else if (idx === 2) {
                // Path 2: From Terminal 4 (535, 85) near wound -> (525, 155) -> (360, 200)
                if (t < 0.4) {
                    const subT = t / 0.4;
                    return evalCubicBezier(
                        { x: 535, y: 85 },
                        { x: 530, y: 110 },
                        { x: 522, y: 135 },
                        { x: 525, y: 155 },
                        subT
                    );
                } else {
                    const subT = (t - 0.4) / 0.6;
                    return evalCubicBezier(
                        { x: 525, y: 155 },
                        { x: 475, y: 185 },
                        { x: 420, y: 205 },
                        { x: 360, y: 200 },
                        subT
                    );
                }
            } else {
                // Path 3: From Terminal 6 (780, 75) -> (680, 130) -> (525, 155) -> (360, 200)
                if (t < 0.3) {
                    const subT = t / 0.3;
                    return evalCubicBezier(
                        { x: 780, y: 75 },
                        { x: 750, y: 90 },
                        { x: 720, y: 110 },
                        { x: 680, y: 130 },
                        subT
                    );
                } else if (t < 0.6) {
                    const subT = (t - 0.3) / 0.3;
                    return evalCubicBezier(
                        { x: 680, y: 130 },
                        { x: 630, y: 155 },
                        { x: 580, y: 145 },
                        { x: 525, y: 155 },
                        subT
                    );
                } else {
                    const subT = (t - 0.6) / 0.4;
                    return evalCubicBezier(
                        { x: 525, y: 155 },
                        { x: 475, y: 185 },
                        { x: 420, y: 205 },
                        { x: 360, y: 200 },
                        subT
                    );
                }
            }
        }

        if (activeEffects.has('pain')) {
            const isFlicker = Math.floor(Date.now() / 150) % 2 === 0;
            const nerveColor = isFlicker ? "#ff4d4f" : "#ffd43b";
            nerveTrunk.setAttribute("stroke", nerveColor);
            nerveBranches.forEach(b => b.setAttribute("stroke", nerveColor));
            nerveTerminals.forEach(t => {
                t.setAttribute("fill", "#ff4d4f");
                t.setAttribute("r", (5.5 + Math.sin(Date.now() / 80) * 1.5).toFixed(1));
            });

            pulses.forEach((p, idx) => {
                pulseProgress[idx] = (pulseProgress[idx] + 0.018) % 1;
                const prog = pulseProgress[idx];
                p.setAttribute("opacity", "0.95");
                const pt = getNervePulseCoord(idx, prog);
                p.setAttribute("cx", pt.x.toFixed(1));
                p.setAttribute("cy", pt.y.toFixed(1));
            });
        } else {
            nerveTrunk.setAttribute("stroke", "#ffd43b");
            nerveBranches.forEach(b => b.setAttribute("stroke", "#ffd43b"));
            nerveTerminals.forEach(t => {
                t.setAttribute("fill", "#ffd43b");
                t.setAttribute("r", "4");
            });
            pulses.forEach(p => p.setAttribute("opacity", "0"));
        }

        // ----------------------------------------------------
        // N. Real-time Status Board
        // ----------------------------------------------------
        updateStats();
    }

    function animate() {
        animationId = requestAnimationFrame(animate);

        speedAccum += simSpeed;
        if (speedAccum < 1.0) return;

        while (speedAccum >= 1.0) {
            speedAccum -= 1.0;
            stepSimulation();
        }
    }

    // Helper functions for WBC rendering
    function getWbcColor(subtype) {
        switch (subtype) {
            case 'neutrophil': return '#38bdf8';
            case 'monocyte': return '#c084fc';
            case 'macrophage': return '#a855f7';
            case 'eosinophil': return '#fb7185';
            case 'basophil': return '#475569';
            case 'bcell': return '#fb923c';
            case 'tcell': return '#34d399';
            case 'nk': return '#22d3ee';
            default: return '#f8fafc';
        }
    }

    function getWbcLabelBg(subtype) {
        switch (subtype) {
            case 'neutrophil': return 'rgba(3, 105, 161, 0.9)';
            case 'macrophage': return 'rgba(126, 34, 206, 0.9)';
            case 'eosinophil': return 'rgba(225, 29, 72, 0.9)';
            case 'basophil': return 'rgba(30, 41, 59, 0.9)';
            case 'bcell': return 'rgba(194, 65, 12, 0.9)';
            case 'tcell': return 'rgba(5, 150, 105, 0.9)';
            case 'nk': return 'rgba(14, 116, 144, 0.9)';
            default: return 'rgba(30, 41, 59, 0.9)';
        }
    }

    function getWbcLabelText(w) {
        switch (w.subtype) {
            case 'neutrophil': return w.eatenCount >= w.maxEat ? "嗜中性球(凋亡化膿)" : `嗜中性球(${w.eatenCount}/${w.maxEat})`;
            case 'macrophage': return `巨噬細胞(${w.eatenCount}/${w.maxEat})`;
            case 'eosinophil': return `嗜酸性球(彈藥${w.ammo})`;
            case 'basophil': return "嗜鹼性球(釋組織胺)";
            case 'bcell': return "B淋巴球(分泌抗體)";
            case 'tcell': return "毒殺T細胞(專一殺毒)";
            case 'nk': return "自然殺手NK細胞";
            default: return "白血球";
        }
    }

    function drawWbcNucleus(g, subtype, r) {
        if (subtype === 'neutrophil') {
            const n1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n1.setAttribute("cx", -2.5); n1.setAttribute("cy", -2); n1.setAttribute("r", 2.2); n1.setAttribute("fill", "#0369a1");
            const n2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n2.setAttribute("cx", 2.5); n2.setAttribute("cy", -2); n2.setAttribute("r", 2.2); n2.setAttribute("fill", "#0369a1");
            const n3 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n3.setAttribute("cx", 0); n3.setAttribute("cy", 2.5); n3.setAttribute("r", 2.2); n3.setAttribute("fill", "#0369a1");
            g.appendChild(n1); g.appendChild(n2); g.appendChild(n3);
        } else if (subtype === 'eosinophil') {
            const n1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n1.setAttribute("cx", -3); n1.setAttribute("cy", 0); n1.setAttribute("r", 2.5); n1.setAttribute("fill", "#881337");
            const n2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n2.setAttribute("cx", 3); n2.setAttribute("cy", 0); n2.setAttribute("r", 2.5); n2.setAttribute("fill", "#881337");
            g.appendChild(n1); g.appendChild(n2);
        } else if (subtype === 'macrophage' || subtype === 'monocyte') {
            const n = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n.setAttribute("cx", -1); n.setAttribute("cy", 0); n.setAttribute("r", r * 0.45); n.setAttribute("fill", "#581c87");
            g.appendChild(n);
        } else {
            const n = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            n.setAttribute("cx", 0); n.setAttribute("cy", 0); n.setAttribute("r", r * 0.55); n.setAttribute("fill", "rgba(0,0,0,0.4)");
            g.appendChild(n);
        }
    }

    // ==========================================
    // 11. Physiological Cardinal Signs Updates
    // ==========================================
    function updateVisualization() {
        let newTargetArtWidth = 56;
        let newTargetCapWidth = 16;
        let newSphincterTone = 1.0;
        let newFlowSpeed = 2.2;
        let newTargetGap = 0.5;

        if (activeEffects.has('red')) {
            newTargetArtWidth = 78;
            newTargetCapWidth = 26;
            newSphincterTone = 0.15;
        }
        if (activeEffects.has('heat')) {
            newFlowSpeed = 5.2;
            newSphincterTone = Math.min(newSphincterTone, 0.3);
            newTargetArtWidth = Math.max(newTargetArtWidth, 72);
        }
        if (activeEffects.has('swelling')) {
            newTargetGap = 10;
            newTargetCapWidth = Math.max(newTargetCapWidth, 26);
            newSphincterTone = Math.min(newSphincterTone, 0.25);
        }
        if (activeEffects.has('pain')) {
            if (!activeEffects.has('swelling')) newTargetGap = Math.max(newTargetGap, 5);
        }

        targetArterioleWidth = newTargetArtWidth;
        targetCapillaryWidth = newTargetCapWidth;
        targetSphincterTone = newSphincterTone;
        targetFlowSpeed = newFlowSpeed;
        targetGapSize = newTargetGap;

        updateStageCard();
    }

    function updateStageCard() {
        if (activeEffects.size === 0) {
            stageTitle.textContent = "正常恆定狀態 (Homeostasis)";
            stageDesc.textContent = "前毛細小動脈平滑肌維持正常張力，微血管腔狹窄，紅血球單行通過，組織液處於動態平衡。";
            return;
        }

        const titles = [];
        const descs = [];

        if (activeEffects.has('red')) {
            titles.push("紅 (Rubor)");
            descs.push("小動脈平滑肌與括約肌舒張，微血管網充血開放。");
        }
        if (activeEffects.has('heat')) {
            titles.push("熱 (Calor)");
            descs.push("高速灌流帶來深層體溫，局部代謝加速。");
        }
        if (activeEffects.has('swelling')) {
            titles.push("腫 (Tumor)");
            descs.push("內皮細胞間隙擴大，血漿外滲成組織水腫，白血球遊出。");
        }
        if (activeEffects.has('pain')) {
            titles.push("痛 (Dolor)");
            descs.push("水腫組織張力壓迫神經末梢，傳遞痛覺動作電位。");
        }

        stageTitle.textContent = titles.join(" + ");
        stageDesc.textContent = descs.join(" ");
    }

    // ==========================================
    // 12. Event Listeners & Spawner Buttons
    // ==========================================
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const effect = btn.dataset.effect;
            if (activeEffects.has(effect)) {
                activeEffects.delete(effect);
                btn.classList.remove('active');
            } else {
                activeEffects.add(effect);
                btn.classList.add('active');
            }
            updateVisualization();
        });
    });

    const btnSpawnBacteria = document.getElementById('btn-spawn-bacteria');
    const btnSpawnVirus = document.getElementById('btn-spawn-virus');
    const btnSpawnParasite = document.getElementById('btn-spawn-parasite');

    function selectPathogen(type) {
        selectedPathogen = type;
        if (btnSpawnBacteria) btnSpawnBacteria.classList.toggle('active', type === 'bacteria');
        if (btnSpawnVirus) btnSpawnVirus.classList.toggle('active', type === 'virus');
        if (btnSpawnParasite) btnSpawnParasite.classList.toggle('active', type === 'parasite');
    }

    if (btnSpawnBacteria) {
        btnSpawnBacteria.addEventListener('click', () => {
            selectPathogen('bacteria');
            spawnBacteria();
        });
    }
    if (btnSpawnVirus) {
        btnSpawnVirus.addEventListener('click', () => {
            selectPathogen('virus');
            spawnFreeVirus();
        });
    }
    if (btnSpawnParasite) {
        btnSpawnParasite.addEventListener('click', () => {
            selectPathogen('parasite');
            spawnParasite();
        });
    }

    document.getElementById('btn-spawn-neutro').addEventListener('click', () => spawnNeutrophil());
    document.getElementById('btn-spawn-mono').addEventListener('click', () => spawnMonocyte());
    document.getElementById('btn-spawn-eosino').addEventListener('click', () => spawnEosinophil());
    document.getElementById('btn-spawn-baso').addEventListener('click', () => spawnBasophil());
    document.getElementById('btn-spawn-bcell').addEventListener('click', () => spawnBCell());
    document.getElementById('btn-spawn-tcell').addEventListener('click', () => spawnKillerCell());

    if (toggleDimNerveCheckbox && nerveNetworkGroup) {
        toggleDimNerveCheckbox.addEventListener('change', () => {
            nerveNetworkGroup.classList.toggle('dimmed', toggleDimNerveCheckbox.checked);
        });
    }

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            simSpeed = parseFloat(btn.dataset.speed) || 1.0;
        });
    });

    resetBtn.addEventListener('click', () => {
        activeEffects.clear();
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        coagButtons.forEach(btn => btn.classList.remove('active'));
        coagStage = 0;
        coagState = { woundOpen: 0, bleedIntensity: 0, plateletPlug: 0, fibrinMesh: 0, scabProgress: 0, healProgress: 0, bladeAnim: 0, scabDetachAnim: 0 };
        bacteria = [];
        freeViruses = [];
        parasites = [];
        cellDebris = [];
        histamines = [];
        eosinophilGranules = [];
        antibodies = [];
        bleedingRBCs = [];
        bloodWBCs = [];
        activeTissueWBCs = [];
        mucusClearedCount = 0;
        selectPathogen('bacteria');
        initMucosaChemicals();
        initTissueSites();
        updateVisualization();
        updateStats();
        updateLog("🔄 <strong>模擬器已全面重置！</strong>創傷完全癒合，組織與血管恢復正常狀態。");
    });

    // Start everything
    buildEpidermis();
    initMucosaChemicals();
    buildMyelin();
    buildCollagenFibers();
    buildClotTopology();
    buildSmoothMuscle();
    buildBranchingVessels();
    initBloodParticles();
    initTissueSites();
    updateVisualization();
    updateStats();
    animate();

    window.__simState = {
        spawnBacteria: spawnBacteria,
        spawnFreeVirus: spawnFreeVirus,
        spawnParasite: spawnParasite,
        getBacteria: () => bacteria,
        getViruses: () => freeViruses,
        getParasites: () => parasites,
        getActiveWBCs: () => activeTissueWBCs,
        getCellDebris: () => cellDebris,
        getSwellingLevel: () => swellingLevel,
        getDermisTopY: getDermisTopY
    };
});

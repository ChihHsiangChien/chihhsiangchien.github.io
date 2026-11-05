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
    const epiBgEl = document.getElementById('epidermis-bg');
    const mucBgEl = document.getElementById('mucosa-bg');
    const mucCutLine = document.getElementById('mucocutaneous-junction');
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
    const stageStatusContainer = document.getElementById('stage-status-container');
    const stageDesc = document.getElementById('stage-desc');
    const mechanismDesc = document.getElementById('mechanism-desc');
    const toggleButtons = document.querySelectorAll('.stage-btn.toggle-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toggleLabelsCheckbox = document.getElementById('toggle-labels');
    const toggleAutoWbcCheckbox = document.getElementById('toggle-auto-wbc');
    const toggleDimNerveCheckbox = document.getElementById('toggle-dim-nerve');
    const toggleFluidCheckbox = document.getElementById('toggle-fluid-circulation');
    const labelToggleFluid = document.getElementById('label-toggle-fluid');
    const fluidTankBgLayer = document.getElementById('fluid-tank-bg-layer');
    const fluidArrowsLayer = document.getElementById('fluid-arrows-layer');
    const nerveNetworkGroup = document.getElementById('nerve-network');

    function updateNerveDimming() {
        if (!nerveNetworkGroup) return;
        const shouldDim = (toggleDimNerveCheckbox && toggleDimNerveCheckbox.checked) || (toggleFluidCheckbox && toggleFluidCheckbox.checked);
        nerveNetworkGroup.classList.toggle('dimmed', shouldDim);
    }

    let simSpeed = 1.0;
    let speedAccum = 0;
    let selectedPathogen = 'bacteria';
    let fluidCirculationEnabled = false;
    let fluidDroplets = [];
    let fluidSpawnTimer = 0;

    function initFluidTankDroplets() {
        fluidDroplets = [];
        // 1. Pre-fill the covered water tank (dermis interstitial space) with evenly distributed bathing droplets
        // so the tissue immediately looks like a full water tank rather than a directional stream!
        const cols = 9;
        const rows = 4;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const bx = 65 + c * 88 + (Math.random() - 0.5) * 36;
                const by = 78 + r * 48 + (Math.random() - 0.5) * 20;
                fluidDroplets.push({
                    state: 'tank_bathing',
                    x: bx,
                    y: by,
                    r: 2.7 + Math.random() * 0.9,
                    wanderAngle: Math.random() * Math.PI * 2,
                    phase: Math.random() * Math.PI * 2,
                    life: 140 + Math.floor(Math.random() * 240),
                    maxLife: 380,
                    alpha: 0.55 + Math.random() * 0.3
                });
            }
        }
        // 2. Seed a few upward-filtering plasma droplets precisely at capillary endothelial intercellular gaps (Inlet pipe)
        const sampleGaps = [214.1, 285.4, 356.7, 428.0, 499.3, 570.6, 641.9, 713.2, 784.5];
        sampleGaps.forEach(gx => {
            const targetY = 85 + Math.random() * 150;
            fluidDroplets.push({
                state: 'inlet_filtering',
                gapX: gx,
                x: gx,
                y: 310 - Math.random() * 20,
                startY: 320,
                baseR: 2.7,
                targetTankY: targetY,
                vx: (Math.random() - 0.5) * 0.28, // strictly symmetric, zero rightward bias!
                vy: -(0.85 + Math.random() * 0.35),
                r: 2.8,
                wanderAngle: Math.random() * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
                life: 320,
                maxLife: 320,
                alpha: 0.9
            });
        });
        // 3. Seed a few overflow droplets at the right-hand lymphatic blind-end outlet (Outlet pipe)
        for (let k = 0; k < 5; k++) {
            fluidDroplets.push({
                state: 'lymph_draining',
                x: 825 + k * 28 + (Math.random() - 0.5) * 10,
                y: 256 + (Math.random() - 0.5) * 20,
                targetValveY: 268 + (Math.random() - 0.5) * 14,
                r: 2.8,
                alpha: 0.85
            });
        }
    }

    let vaccineState = {
        bacteria: false,
        virus: false
    };
    let bacterialEncounterOccurred = false;
    let viralEncounterOccurred = false;

    // Dermal initial lymphatic drainage coordinates
    const LYMPH_VESSEL_X = 885;
    const LYMPH_VESSEL_Y = 268;

    let lymphNodeState = {
        active: false,
        antigenType: null,
        timer: 0,
        duration: 200 // ~3.3s at 60fps
    };

    let lastVacBacState = null;
    let lastVacVirState = null;
    let cachedVacUiElements = null;

    function getVacUiElements() {
        if (!cachedVacUiElements) {
            cachedVacUiElements = {
                toggleMemoryBacteria: document.getElementById('toggle-memory-bacteria'),
                toggleMemoryVirus: document.getElementById('toggle-memory-virus'),
                cardMemoryBacteria: document.getElementById('card-memory-bacteria'),
                cardMemoryVirus: document.getElementById('card-memory-virus'),
                statusVacBac: document.getElementById('status-vac-bacteria'),
                statusVacVir: document.getElementById('status-vac-virus'),
                statMemory: document.getElementById('stat-memory')
            };
        }
        return cachedVacUiElements;
    }

    function updateVaccineUI(force = false) {
        if (!force && vaccineState.bacteria === lastVacBacState && vaccineState.virus === lastVacVirState) {
            return;
        }
        lastVacBacState = !!vaccineState.bacteria;
        lastVacVirState = !!vaccineState.virus;

        const ui = getVacUiElements();

        if (ui.toggleMemoryBacteria) ui.toggleMemoryBacteria.checked = !!vaccineState.bacteria;
        if (ui.toggleMemoryVirus) ui.toggleMemoryVirus.checked = !!vaccineState.virus;

        if (ui.cardMemoryBacteria) ui.cardMemoryBacteria.classList.toggle('active', !!vaccineState.bacteria);
        if (ui.cardMemoryVirus) ui.cardMemoryVirus.classList.toggle('active', !!vaccineState.virus);

        if (ui.statusVacBac) {
            ui.statusVacBac.innerHTML = vaccineState.bacteria
                ? '<span style="color:#34d399;font-weight:600;">已啟用 (二次應答・血管抗體就緒)</span>'
                : '關閉 (初次應答・無血管抗體)';
        }
        if (ui.statusVacVir) {
            ui.statusVacVir.innerHTML = vaccineState.virus
                ? '<span style="color:#a78bfa;font-weight:600;">已啟用 (二次應答・血管抗體就緒)</span>'
                : '關閉 (初次應答・無血管抗體)';
        }

        if (ui.statMemory) {
            if (vaccineState.bacteria && vaccineState.virus) {
                ui.statMemory.textContent = "雙重記憶 (全免疫)";
                ui.statMemory.style.color = "#34d399";
            } else if (vaccineState.bacteria) {
                ui.statMemory.textContent = "細菌記憶 (二次應答)";
                ui.statMemory.style.color = "#10b981";
            } else if (vaccineState.virus) {
                ui.statMemory.textContent = "病毒記憶 (二次應答)";
                ui.statMemory.style.color = "#a78bfa";
            } else {
                ui.statMemory.textContent = "無 (初次應答)";
                ui.statMemory.style.color = "inherit";
            }
        }
    }

    function triggerSecondaryResponse(type, x, y, target) {
        const count = type === 'bacteria' ? 14 : 10;
        // Antibodies originate from systemic circulation via the left arteriole (x <= 0, y ≈ 365)
        // They stream rapidly with arterial blood, branch into capillaries, and extravasate near the infection site
        for (let k = 0; k < count; k++) {
            const entryX = -10 - k * 18 - Math.random() * 8; // Staggered stream in arterial inflow
            const targetX = Math.max(180, Math.min(880, x + (Math.random() - 0.5) * 50));
            antibodies.push({
                x: entryX,
                y: 365 + (Math.random() - 0.5) * 14,
                laneOffset: (Math.random() - 0.5),
                speed: 4.2 + Math.random() * 1.5,
                targetExtravasateX: targetX,
                stage: 'circulation', // 'circulation' -> 'tissue'
                vx: 3.8,
                vy: 0,
                life: 520,
                isSecondary: true,
                targetType: type
            });
        }
        if (target) {
            if (type === 'bacteria') target.divideTimer = -999999; // Inhibit immediate division while antibodies home in
            if (type === 'virus') target.penetratingTimer = 0;
        }
        if (toggleAutoWbcCheckbox && toggleAutoWbcCheckbox.checked) {
            if (type === 'bacteria') {
                if (activeTissueWBCs.length === 0 || !activeTissueWBCs.some(w => w.subtype === 'macrophage' || w.subtype === 'neutrophil')) {
                    recruitCirculatingWbc('neutrophil');
                }
            } else if (type === 'virus') {
                if (!activeTissueWBCs.some(w => w.subtype === 'tcell' || w.subtype === 'nk')) {
                    recruitCirculatingWbc('tcell');
                }
            }
        }
    }

    function initApcCell(cell, antigenType) {
        cell.state = 'apc_migrating';
        cell.antigenType = antigenType;
        cell.tissueLife = Math.max(cell.tissueLife || 0, 1800);
        // Staggered entry target along the initial lymphatic capillary valve flaps (y: 257..279, x: 876..904)
        cell.targetLymphX = 876 + Math.random() * 28;
        cell.targetLymphY = 268 + (Math.random() - 0.5) * 22;
        // Individualized crawling speed, crawl phase, and drainage speed to produce natural variation
        cell.crawlSpeed = 1.7 + Math.random() * 0.9;
        cell.crawlPhase = Math.random() * Math.PI * 2;
        cell.flowSpeed = 1.8 + Math.random() * 0.8;
    }

    function triggerApcMigration(antigenType, sourceX, sourceY) {
        if (!antigenType || vaccineState[antigenType]) return;

        // 1. If an active macrophage is already present in tissue, convert it to migrating APC
        const existingMac = activeTissueWBCs.find(w => w.subtype === 'macrophage' && w.state !== 'apc_migrating' && w.state !== 'lymph_draining');
        if (existingMac) {
            initApcCell(existingMac, antigenType);
            const agName = antigenType === 'bacteria' ? '細菌' : '病毒';
            updateLog(`🧬 <strong>【抗原呈現細胞 APC 活化】</strong>巨噬細胞吞噬 ${agName}，組裝 MHC-II 複合體並以隨機瓣膜路徑前往微淋巴管！`);
            return;
        }

        // 2. If no macrophage is active in tissue (e.g. only neutrophils ate the pathogen),
        // recruit a sentinel tissue dendritic cell / macrophage directly at the site!
        const apcX = Math.max(50, Math.min(840, sourceX || 400));
        const apcY = Math.max(100, Math.min(260, sourceY || 200));
        const newApc = {
            x: apcX + (Math.random() - 0.5) * 16,
            y: apcY + (Math.random() - 0.5) * 16,
            r: 11.5,
            subtype: 'macrophage',
            alpha: 1,
            eatenCount: 1,
            isSentinelAPC: true
        };
        initApcCell(newApc, antigenType);
        activeTissueWBCs.push(newApc);
        const agName = antigenType === 'bacteria' ? '細菌' : '病毒';
        updateLog(`🧬 <strong>【前哨樹突 / 巨噬細胞 (APC) 攝取抗原】</strong>組織駐留抗原呈現細胞於感染點攝取 ${agName} 殘骸，活化 MHC-II 複合體，開始游向微淋巴管！`);
    }

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
    const statLymphPill = document.getElementById('stat-lymph-pill');
    const statLymphText = document.getElementById('stat-lymph-text');
    const lymphProgressFill = document.getElementById('lymph-progress-fill');

    let mucusClearedCount = 0;
    let ciliaList = [];
    let ciliaCombinedPath = null;
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

    let lastStatsUpdateTime = 0;
    function updateStats(force = false) {
        if (!statHealthy) return;
        const now = performance.now();
        if (!force && now - lastStatsUpdateTime < 120) return;
        lastStatsUpdateTime = now;

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
        updateVaccineUI();
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

        // Click without dragging: spawn the active pathogen at clicked coordinates
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
    const BRANCH_MAP = {
        top: BRANCHES[0],
        mid: BRANCHES[1],
        bot: BRANCHES[2]
    };

    // Microvascular bifurcation & sphincter boundary landmarks
    const BRANCH_START_X = 140; // Arteriole ends at x=140, microvascular bifurcation starts
    const BRANCH_END_X = 168;   // Transition curves finish, branches become horizontal
    const SPHINCTER_X = 168;    // Precapillary sphincters at capillary entrances
    const SPHINCTER_W = 10;     // Precapillary sphincter width (x: 168..178)

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
    let immuneSurveillanceTimer = 0;

    let smoothMuscles = [];
    let sphincterElements = [];
    let branchEndoCells = [];
    let branchLumenPaths = [];
    let arterioleLumenPath = null;
    let animationId;

    // Helper: Dynamic Floating Label Pool inside SVG (Zero-allocation pooling)
    const labelPool = [];
    let labelPoolCount = 0;

    function resetLabelPool() {
        labelPoolCount = 0;
    }

    function finalizeLabelPool() {
        for (let i = labelPoolCount; i < labelPool.length; i++) {
            if (!labelPool[i].hidden) {
                labelPool[i].g.style.display = 'none';
                labelPool[i].hidden = true;
            }
        }
    }

    function createSvgLabel(text, x, y, bg = 'rgba(20,24,36,0.85)', color = '#fff') {
        if (!toggleLabelsCheckbox || !toggleLabelsCheckbox.checked) return null;
        const approxW = text.length * 11 + 10;
        const rx = x - approxW / 2;
        const ry = y - 8;
        const tx = x;
        const ty = y + 3.5;

        let item;
        if (labelPoolCount < labelPool.length) {
            item = labelPool[labelPoolCount++];
            if (item.hidden) {
                item.g.style.display = '';
                item.hidden = false;
            }
            if (item.rx !== rx || item.ry !== ry || item.w !== approxW || item.bg !== bg) {
                item.rect.setAttribute("x", rx);
                item.rect.setAttribute("y", ry);
                item.rect.setAttribute("width", approxW);
                item.rect.setAttribute("fill", bg);
                item.rx = rx; item.ry = ry; item.w = approxW; item.bg = bg;
            }
            if (item.tx !== tx || item.ty !== ty || item.color !== color || item.text !== text) {
                item.txt.setAttribute("x", tx);
                item.txt.setAttribute("y", ty);
                item.txt.setAttribute("fill", color);
                item.txt.textContent = text;
                item.tx = tx; item.ty = ty; item.color = color; item.text = text;
            }
            return item.g;
        }

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", rx);
        rect.setAttribute("y", ry);
        rect.setAttribute("width", approxW);
        rect.setAttribute("height", 16);
        rect.setAttribute("rx", 4);
        rect.setAttribute("fill", bg);
        rect.setAttribute("stroke", "rgba(255,255,255,0.2)");
        rect.setAttribute("stroke-width", "0.8");

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", tx);
        txt.setAttribute("y", ty);
        txt.setAttribute("fill", color);
        txt.setAttribute("font-size", "10");
        txt.setAttribute("font-weight", "600");
        txt.setAttribute("text-anchor", "middle");
        txt.textContent = text;

        g.appendChild(rect);
        g.appendChild(txt);
        floatingLabelsLayer.appendChild(g);

        item = { g, rect, txt, rx, ry, w: approxW, bg, tx, ty, color, text, hidden: false };
        labelPool.push(item);
        labelPoolCount++;
        return g;
    }

    function updateLog(msg) {
        mechanismDesc.innerHTML = msg;
    }

    // ==========================================
    // 3. Build Collagen Fibers Striations in Dermis
    // (Coagulation wavy collagen matrix - Single combined path)
    // ==========================================
    function buildCollagenFibers() {
        collagenFibersGroup.innerHTML = '';
        let d = '';
        // 6 wavy collagen fiber bands running across the dermis combined into 1 SVG path
        for (let y = 80; y <= 270; y += 32) {
            for (let x = 0; x <= 1000; x += 30) {
                const waveY = y + Math.sin(x * 0.025 + y * 0.1) * 6;
                d += (x === 0 ? 'M ' : 'L ') + x + ' ' + waveY.toFixed(1) + ' ';
            }
        }
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d.trim());
        path.setAttribute("stroke", "rgba(254, 226, 226, 0.4)");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        collagenFibersGroup.appendChild(path);
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
    function initTissueSitesDOM() {
        if (!tissueSitesLayer) return;
        tissueSitesLayer.innerHTML = '';
        tissueSites.forEach(site => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            body.setAttribute("cx", site.x);
            body.setAttribute("cy", site.origY);
            body.setAttribute("r", site.r);
            body.setAttribute("fill", "#fdebd0");
            body.setAttribute("stroke", "#f8c471");
            body.setAttribute("stroke-width", "2");
            body.setAttribute("opacity", "0.9");

            const nuc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            nuc.setAttribute("cx", site.x);
            nuc.setAttribute("cy", site.origY);
            nuc.setAttribute("r", "6");
            nuc.setAttribute("fill", "#eb984e");

            g.appendChild(body);
            g.appendChild(nuc);
            tissueSitesLayer.appendChild(g);

            site.domGroup = g;
            site.domBody = body;
            site.domNuc = nuc;
            site.renderedState = 'healthy';
        });
    }

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
        initTissueSitesDOM();
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
            const localPts = vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");
            cellDebris.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                r: baseR,
                siteId: siteId,
                vertices: vertices,
                localPts: localPts,
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
            // Center spawn on cutaneous skin/wound zone (X: 180~420), preventing accidental drift into respiratory mucosa (X >= 500)
            bx = (coagState.woundOpen > 0.05) 
                ? (WOUND_X + (Math.random() - 0.5) * 70) 
                : (180 + Math.random() * 240);
        }
        const by = y !== undefined ? y : (-38 + Math.random() * 20);
        const skinY = getSkinSurfaceY(bx, swellingLevel);
        const inTissue = y !== undefined ? (by > skinY + 10) : false;
        bacteria.push({
            x: bx, y: by,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.6,
            r: 7.5,
            inTissue: inTissue,
            trappedInMucus: false,
            angle: Math.random() * Math.PI * 2,
            opsonized: false,
            abCount: 0,
            divideTimer: 0
        });
        if (inTissue) {
            bacterialEncounterOccurred = true;
            if (vaccineState.bacteria) {
                const newB = bacteria[bacteria.length - 1];
                triggerSecondaryResponse('bacteria', bx, by, newB);
                updateLog("⚡ <strong>【二次免疫循環動員】血液特異性抗體隨小動脈湧入微血管，並經內皮間隙滲出（Extravasation）！</strong>全面調理標記細菌（Opsonization），吞噬細胞高速撲殺！");
            } else {
                updateLog("⚠️ <strong>【初次感染空窗期】體內尚無專一性抗體！</strong>細菌將於真皮層二分裂增殖，需由先天免疫部隊逐步定位清創。");
            }
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
                vx = (coagState.woundOpen > 0.05)
                    ? (WOUND_X + (Math.random() - 0.5) * 70)
                    : (180 + Math.random() * 240);
            }
            const vy = (y !== undefined ? y : (-38 + Math.random() * 18)) + (count > 1 ? (Math.random() * 16 - 8) : 0);
            const skinY = getSkinSurfaceY(vx, swellingLevel);
            const inTissue = y !== undefined ? (vy > skinY + 10) : false;
            if (inTissue) spawnedInTissue = true;
            freeViruses.push({
                x: vx, y: vy,
                vx: (Math.random() - 0.5) * 0.9,
                vy: (Math.random() - 0.5) * 0.7,
                r: 5.5,
                inTissue: inTissue,
                trappedInMucus: false,
                opsonized: false,
                abCount: 0,
                penetratingTimer: 0
            });
        }
        if (spawnedInTissue) {
            viralEncounterOccurred = true;
            if (vaccineState.virus) {
                freeViruses.filter(v => v.inTissue).forEach(v => triggerSecondaryResponse('virus', v.x, v.y, v));
                updateLog("⚡ <strong>【二次免疫循環動員】血液特異性中和抗體隨小動脈湧入微血管並滲出！</strong>病毒剛進入皮下即遭抗體包覆中和，無法附著感染宿主細胞！");
            } else {
                updateLog("👾 <strong>【初次感染空窗期】缺乏中和抗體阻斷！</strong>游離病毒長驅直入感染健康細胞，誘導細胞病變。");
            }
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
        const hasInjury = coagStage >= 1 || bacteria.some(b => b.inTissue) || cellDebris.length > 0 || tissueSites.some(c => c.state === 'infected') || freeViruses.some(v => v.inTissue);
        if (subtype === 'neutrophil' || subtype === 'monocyte' || subtype === 'bcell' || subtype === 'tcell' || subtype === 'nk') {
            return hasInjury && Math.random() < 0.8 ? 'top' : ['top', 'mid', 'bot'][Math.floor(Math.random() * 3)];
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

    function recruitCirculatingWbc(subtype = 'neutrophil', logMessage = null) {
        let r = 7.5;
        let tissueLife = 700;
        let eatenCount = 0;
        let maxEat = 3;
        let ammo = 0;
        let producing = 0;

        if (subtype === 'monocyte') {
            r = 8.5; tissueLife = 2000; maxEat = 16;
        } else if (subtype === 'eosinophil') {
            r = 7.8; tissueLife = 950; ammo = 80;
        } else if (subtype === 'nk' || subtype === 'tcell') {
            r = 7.8; tissueLife = 1000;
        } else if (subtype === 'bcell') {
            r = 8.0; tissueLife = 900; producing = 120;
        }

        const wbc = {
            subtype: subtype,
            x: -25,
            y: 65,
            laneOffset: (Math.random() - 0.5) * 0.75,
            branchId: chooseWbcBranch(subtype),
            r: r,
            state: 'patrol',
            exitRoute: null,
            targetGapX: null,
            amoebaProgress: 0,
            eatenCount: eatenCount,
            maxEat: maxEat,
            ammo: ammo,
            producing: producing,
            tissueLife: tissueLife,
            alpha: 1
        };
        assignWbcExitStrategy(wbc);
        bloodWBCs.push(wbc);
        if (logMessage) {
            updateLog(logMessage);
        }
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
                    ciliaList.push({ baseX: cx, cellX: x, sY: getSkinSurfaceY(cx, swellingLevel) });
                });
            }

            epidermisCells.push({ el: g, origY: yBase, type: 'group', posX: x });
        }

        if (mucosaCiliaLayer) {
            ciliaCombinedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            ciliaCombinedPath.setAttribute("stroke", "#ec4899");
            ciliaCombinedPath.setAttribute("stroke-width", "1.4");
            ciliaCombinedPath.setAttribute("stroke-linecap", "round");
            ciliaCombinedPath.setAttribute("fill", "none");
            ciliaCombinedPath.setAttribute("opacity", "0.9");
            mucosaCiliaLayer.appendChild(ciliaCombinedPath);
        }
    }

    function initMucosaChemicals() {
        lysozymes = [];
        if (mucosaChemicalsLayer) mucosaChemicalsLayer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            let g = null, circle = null;
            if (mucosaChemicalsLayer) {
                g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("r", "2.2");
                circle.setAttribute("fill", "#fde047");
                circle.setAttribute("stroke", "#ca8a04");
                circle.setAttribute("stroke-width", "0.8");
                g.appendChild(circle);
                mucosaChemicalsLayer.appendChild(g);
            }

            lysozymes.push({
                x: 535 + i * 62 + (Math.random() * 20 - 10),
                y: -8 + (Math.random() * 8 - 4),
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.2,
                sparkle: Math.random() * Math.PI * 2,
                el: g,
                circle: circle
            });
        }

        sIgAList = [];
        for (let i = 0; i < 5; i++) {
            let g = null;
            if (mucosaChemicalsLayer) {
                g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                p.setAttribute("d", "M -4 -3 L 0 0 L 4 -3 M 0 0 L 0 4 M -4 7 L 0 4 L 4 7");
                p.setAttribute("stroke", "#38bdf8");
                p.setAttribute("stroke-width", "1.4");
                p.setAttribute("fill", "none");
                g.appendChild(p);
                mucosaChemicalsLayer.appendChild(g);
            }

            sIgAList.push({
                x: 545 + i * 85 + (Math.random() * 20 - 10),
                y: -6 + (Math.random() * 6 - 3),
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                el: g
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
            sphTop.setAttribute("x", SPHINCTER_X);
            sphTop.setAttribute("width", SPHINCTER_W);
            sphTop.setAttribute("rx", 3.5);
            sphTop.setAttribute("fill", "#c92a2a");
            sphTop.setAttribute("stroke", "#ff8787");
            sphTop.setAttribute("stroke-width", "1");

            const sphBot = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            sphBot.setAttribute("x", SPHINCTER_X);
            sphBot.setAttribute("width", SPHINCTER_W);
            sphBot.setAttribute("rx", 3.5);
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

        arterioleLumenPath.setAttribute("d", `M 0 ${artTopY} L ${BRANCH_START_X} ${artTopY} L ${BRANCH_START_X} ${artBotY} L 0 ${artBotY} Z`);
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

        const x0 = BRANCH_START_X;
        const x1 = BRANCH_END_X;
        const dx = x1 - x0;
        const cp1X = x0 + dx * 0.45;
        const cp2X = x0 + dx * 0.55;

        branchLumenPaths.forEach((item, idx) => {
            const b = item.branch;
            const bTopY = b.targetY - halfCap;
            const bBotY = b.targetY + halfCap;

            let pathData;
            if (b.targetY < 65) {
                // Top capillary branch: curves smoothly from arteriole upper boundary into capillary
                pathData = `
                    M ${x0} ${artTopY}
                    C ${cp1X} ${artTopY}, ${cp2X} ${bTopY}, ${x1} ${bTopY}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L ${x1} ${bBotY}
                    C ${cp2X} ${bBotY}, ${cp1X} ${artCenterY - 4}, ${x0} ${artCenterY - 4}
                    Z
                `;
            } else if (b.targetY > 65) {
                // Bottom capillary branch: curves smoothly from arteriole lower boundary into capillary
                pathData = `
                    M ${x0} ${artCenterY + 4}
                    C ${cp1X} ${artCenterY + 4}, ${cp2X} ${bTopY}, ${x1} ${bTopY}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L ${x1} ${bBotY}
                    C ${cp2X} ${bBotY}, ${cp1X} ${artBotY}, ${x0} ${artBotY}
                    Z
                `;
            } else {
                // Middle capillary branch (straight through arteriole center into capillary)
                pathData = `
                    M ${x0} ${artCenterY - 4}
                    C ${cp1X} ${artCenterY - 4}, ${cp2X} ${bTopY}, ${x1} ${bTopY}
                    L 1000 ${bTopY}
                    L 1000 ${bBotY}
                    L ${x1} ${bBotY}
                    C ${cp2X} ${bBotY}, ${cp1X} ${artCenterY + 4}, ${x0} ${artCenterY + 4}
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

    // Precomputed Platelet Star Points (Zero-trig per frame)
    const STAR_PTS_STRING = (() => {
        const spikes = 7;
        const outerR = 9;
        const innerR = 4;
        let pts = '';
        for (let k = 0; k < spikes * 2; k++) {
            const radius = k % 2 === 0 ? outerR : innerR;
            const a = (k * Math.PI) / spikes;
            pts += (Math.cos(a) * radius).toFixed(1) + ',' + (Math.sin(a) * radius).toFixed(1) + ' ';
        }
        return pts.trim();
    })();

    // Persistent Fluid Arrows & Tank Pool
    let gapArrowElements = [];
    function initGapArrows() {
        if (!fluidArrowsLayer || gapArrowElements.length > 0) return;
        const indicatorGaps = [214.1, 285.4, 356.7, 428.0, 499.3, 570.6, 641.9, 713.2, 784.5];
        indicatorGaps.forEach(gx => {
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
            arrow.setAttribute("stroke", "#38bdf8");
            arrow.setAttribute("stroke-width", "1.5");
            arrow.setAttribute("stroke-linecap", "round");
            arrow.setAttribute("fill", "none");
            arrow.setAttribute("opacity", "0.78");
            fluidArrowsLayer.appendChild(arrow);
            gapArrowElements.push({ gx, el: arrow });
        });
    }

    let tankPoolEl = null;
    function getTankPoolEl() {
        if (!tankPoolEl && fluidTankBgLayer) {
            tankPoolEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            tankPoolEl.setAttribute("fill", "url(#interstitialTankGrad)");
            fluidTankBgLayer.appendChild(tankPoolEl);
        }
        return tankPoolEl;
    }

    // Module-level Nerve Path Bezier Functions (compiled once)
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
                { x: 318, y: 160 },
                { x: 260, y: 200 },
                { x: 100, y: 245 },
                { x: -10, y: 240 },
                t
            );
        }

        const t = prog / 0.45;
        if (idx === 0) {
            return evalCubicBezier(
                { x: 175, y: 78 },
                { x: 175, y: 130 },
                { x: 260, y: 160 },
                { x: 318, y: 160 },
                t
            );
        } else if (idx === 1) {
            return evalCubicBezier(
                { x: 318, y: 76 },
                { x: 318, y: 105 },
                { x: 318, y: 135 },
                { x: 318, y: 160 },
                t
            );
        } else if (idx === 2) {
            if (t < 0.5) {
                return evalCubicBezier(
                    { x: 462, y: 78 },
                    { x: 460, y: 105 },
                    { x: 462, y: 135 },
                    { x: 462, y: 160 },
                    t / 0.5
                );
            } else {
                return evalCubicBezier(
                    { x: 462, y: 160 },
                    { x: 415, y: 160 },
                    { x: 365, y: 160 },
                    { x: 318, y: 160 },
                    (t - 0.5) / 0.5
                );
            }
        } else {
            if (t < 0.35) {
                return evalCubicBezier(
                    { x: 608, y: 78 },
                    { x: 606, y: 95 },
                    { x: 612, y: 120 },
                    { x: 608, y: 140 },
                    t / 0.35
                );
            } else if (t < 0.7) {
                return evalCubicBezier(
                    { x: 608, y: 140 },
                    { x: 580, y: 160 },
                    { x: 535, y: 160 },
                    { x: 462, y: 160 },
                    (t - 0.35) / 0.35
                );
            } else {
                return evalCubicBezier(
                    { x: 462, y: 160 },
                    { x: 415, y: 160 },
                    { x: 365, y: 160 },
                    { x: 318, y: 160 },
                    (t - 0.7) / 0.3
                );
            }
        }
    }

    let lastSwellingLevel = -999;
    let lastArtW = -1, lastCapW = -1, lastSphTone = -1, lastGap = -1, lastWoundOpen = -1, lastHealProg = -1;
    let nervePainActiveLast = true;
    let lastCoagActive = false;

    // ==========================================
    // Precomputed Pathogen Geometry & Zero-Allocation SVG Element Pools
    // ==========================================
    const BAC_AB_PATHS = (() => {
        const paths = [''];
        const localPts = [[0, 3.5], [0, 0], [-2, -2], [0, 0], [2, -2]];
        for (let cnt = 1; cnt <= 6; cnt++) {
            let d = '';
            for (let a = 0; a < cnt; a++) {
                const ang = (Math.PI * 2 / cnt) * a;
                const bx = Math.cos(ang) * 11;
                const by = Math.sin(ang) * 6.5;
                const cosT = -Math.sin(ang);
                const sinT = Math.cos(ang);
                const tp = localPts.map(([lx, ly]) => [
                    (bx + lx * cosT - ly * sinT).toFixed(1),
                    (by + lx * sinT + ly * cosT).toFixed(1)
                ]);
                d += `M ${tp[0][0]} ${tp[0][1]} L ${tp[1][0]} ${tp[1][1]} L ${tp[2][0]} ${tp[2][1]} M ${tp[3][0]} ${tp[3][1]} L ${tp[4][0]} ${tp[4][1]} `;
            }
            paths.push(d.trim());
        }
        return paths;
    })();

    const VIR_SPIKES_PATH = (() => {
        const r = 5.5;
        let d = '';
        for (let s = 0; s < 6; s++) {
            const a = (Math.PI * 2 / 6) * s;
            const c = Math.cos(a), sn = Math.sin(a);
            d += `M ${(c * r).toFixed(1)} ${(sn * r).toFixed(1)} L ${(c * (r + 2.5)).toFixed(1)} ${(sn * (r + 2.5)).toFixed(1)} `;
        }
        return d.trim();
    })();

    const VIR_AB_PATHS = (() => {
        const paths = [''];
        const r = 5.5;
        const localPts = [[0, 3], [0, 0], [-1.8, -1.8], [0, 0], [1.8, -1.8]];
        for (let cnt = 1; cnt <= 4; cnt++) {
            let d = '';
            for (let a = 0; a < cnt; a++) {
                const ang = (Math.PI * 2 / cnt) * a + Math.PI / 4;
                const bx = Math.cos(ang) * (r + 3.5);
                const by = Math.sin(ang) * (r + 3.5);
                const cosT = -Math.sin(ang);
                const sinT = Math.cos(ang);
                const tp = localPts.map(([lx, ly]) => [
                    (bx + lx * cosT - ly * sinT).toFixed(1),
                    (by + lx * sinT + ly * cosT).toFixed(1)
                ]);
                d += `M ${tp[0][0]} ${tp[0][1]} L ${tp[1][0]} ${tp[1][1]} L ${tp[2][0]} ${tp[2][1]} M ${tp[3][0]} ${tp[3][1]} L ${tp[4][0]} ${tp[4][1]} `;
            }
            paths.push(d.trim());
        }
        return paths;
    })();

    // Persistent Coagulation Elements (Built once, updated via attributes/display)
    let exposedCollagenPathEl = null;
    let plateletPlugBuilt = false;
    let fibrinMeshBuilt = false;
    let scabPathEl = null;

    function getExposedCollagenPath() {
        if (!exposedCollagenPathEl && exposedCollagenLayer) {
            exposedCollagenPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            exposedCollagenPathEl.setAttribute("stroke", "#fde047");
            exposedCollagenPathEl.setAttribute("stroke-width", "2");
            exposedCollagenPathEl.setAttribute("fill", "none");
            exposedCollagenLayer.appendChild(exposedCollagenPathEl);
        }
        return exposedCollagenPathEl;
    }

    function ensurePlateletPlugDOM() {
        if (plateletPlugBuilt || !plateletPlugLayer) return;
        plateletPlugLayer.innerHTML = '';
        plugPlatelets.forEach((p, idx) => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(p.angle * 180 / Math.PI).toFixed(1)})`);
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", STAR_PTS_STRING);
            poly.setAttribute("fill", "#fde047");
            poly.setAttribute("stroke", "#d97706");
            poly.setAttribute("stroke-width", "1.2");
            g.appendChild(poly);
            if (idx % 2 === 0) {
                const rbc = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                rbc.setAttribute("cx", "-2"); rbc.setAttribute("cy", "-1");
                rbc.setAttribute("rx", "5"); rbc.setAttribute("ry", "3.2");
                rbc.setAttribute("fill", "#dc2626");
                g.appendChild(rbc);
            }
            plateletPlugLayer.appendChild(g);
        });
        plateletPlugBuilt = true;
    }

    function ensureFibrinMeshDOM() {
        if (fibrinMeshBuilt || !fibrinMeshLayer) return;
        fibrinMeshLayer.innerHTML = '';
        let strandD = '';
        fibrinStrands.forEach(strand => {
            strandD += `M ${strand.ax.toFixed(1)} ${strand.ay.toFixed(1)} L ${strand.bx.toFixed(1)} ${strand.by.toFixed(1)} `;
        });
        const strandPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        strandPath.setAttribute("d", strandD.trim());
        strandPath.setAttribute("stroke", "#f59e0b");
        strandPath.setAttribute("stroke-width", "2.2");
        strandPath.setAttribute("stroke-linecap", "round");
        strandPath.setAttribute("fill", "none");
        fibrinMeshLayer.appendChild(strandPath);

        let archD = '';
        for (let k = 0; k < 5; k++) {
            const yOff = 315 - k * 9;
            archD += `M ${WOUND_X - 35} ${yOff} Q ${WOUND_X} ${yOff + (k % 2 === 0 ? 6 : -6)} ${WOUND_X + 35} ${yOff} `;
        }
        const archPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        archPath.setAttribute("d", archD.trim());
        archPath.setAttribute("stroke", "#fbbf24");
        archPath.setAttribute("stroke-width", "2");
        archPath.setAttribute("fill", "none");
        fibrinMeshLayer.appendChild(archPath);
        fibrinMeshBuilt = true;
    }

    function getScabPathEl() {
        if (!scabPathEl && scabLayer) {
            scabPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            scabPathEl.setAttribute("fill", "#450a0a");
            scabPathEl.setAttribute("stroke", "#7f1d1d");
            scabPathEl.setAttribute("stroke-width", "2");
            scabLayer.appendChild(scabPathEl);
        }
        return scabPathEl;
    }

    // Dynamic Particle & Entity Object Pools
    const dropletPool = []; let dropletPoolCount = 0;
    const bleedPool = []; let bleedPoolCount = 0;
    const debrisPool = []; let debrisPoolCount = 0;
    const bacPool = []; let bacPoolCount = 0;
    const virPool = []; let virPoolCount = 0;
    const parPool = []; let parPoolCount = 0;
    const chemDotPool = []; let chemDotPoolCount = 0;
    const abPool = []; let abPoolCount = 0;
    const wbcSpherePool = []; let wbcSpherePoolCount = 0;
    const wbcAmoebaPool = []; let wbcAmoebaPoolCount = 0;

    function resetAllSvgPools() {
        resetLabelPool();
        dropletPoolCount = 0;
        bleedPoolCount = 0;
        debrisPoolCount = 0;
        bacPoolCount = 0;
        virPoolCount = 0;
        parPoolCount = 0;
        chemDotPoolCount = 0;
        abPoolCount = 0;
        wbcSpherePoolCount = 0;
        wbcAmoebaPoolCount = 0;
    }

    function hideUnusedPoolItems(pool, usedCount) {
        for (let i = usedCount; i < pool.length; i++) {
            const item = pool[i];
            if (!item.hidden) {
                item.el.style.display = 'none';
                item.hidden = true;
            }
        }
    }

    function finalizeAllSvgPools() {
        finalizeLabelPool();
        hideUnusedPoolItems(dropletPool, dropletPoolCount);
        hideUnusedPoolItems(bleedPool, bleedPoolCount);
        hideUnusedPoolItems(debrisPool, debrisPoolCount);
        hideUnusedPoolItems(bacPool, bacPoolCount);
        hideUnusedPoolItems(virPool, virPoolCount);
        hideUnusedPoolItems(parPool, parPoolCount);
        hideUnusedPoolItems(chemDotPool, chemDotPoolCount);
        hideUnusedPoolItems(abPool, abPoolCount);
        hideUnusedPoolItems(wbcSpherePool, wbcSpherePoolCount);
        hideUnusedPoolItems(wbcAmoebaPool, wbcAmoebaPoolCount);
    }

    function renderPooledDroplet(cx, cy, rx, ry, stroke, sw, op) {
        let item;
        if (dropletPoolCount < dropletPool.length) {
            item = dropletPool[dropletPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            el.setAttribute("fill", "#7dd3fc");
            extravasatedLayer.appendChild(el);
            item = { el, rx: '', ry: '', stroke: '', sw: '', op: '', hidden: false };
            dropletPool.push(item);
            dropletPoolCount++;
        }
        item.el.setAttribute("cx", cx);
        item.el.setAttribute("cy", cy);
        if (item.rx !== rx) { item.el.setAttribute("rx", rx); item.rx = rx; }
        if (item.ry !== ry) { item.el.setAttribute("ry", ry); item.ry = ry; }
        if (item.stroke !== stroke) { item.el.setAttribute("stroke", stroke); item.stroke = stroke; }
        if (item.sw !== sw) { item.el.setAttribute("stroke-width", sw); item.sw = sw; }
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
    }

    function renderPooledBleedRbc(x, y, op) {
        let item;
        if (bleedPoolCount < bleedPool.length) {
            item = bleedPool[bleedPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const outer = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            outer.setAttribute("rx", "4.8");
            outer.setAttribute("ry", "3.26");
            outer.setAttribute("fill", "#dc2626");
            outer.setAttribute("stroke", "#7f1d1d");
            outer.setAttribute("stroke-width", "1");
            const dip = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            dip.setAttribute("rx", "2.16");
            dip.setAttribute("ry", "1.44");
            dip.setAttribute("fill", "#991b1b");
            dip.setAttribute("opacity", "0.75");
            g.appendChild(outer);
            g.appendChild(dip);
            bleedingLayer.appendChild(g);
            item = { el: g, outer, op: '', hidden: false };
            bleedPool.push(item);
            bleedPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
        if (item.op !== op) { item.outer.setAttribute("opacity", op); item.op = op; }
    }

    function renderPooledDebris(x, y, localPts, op) {
        let item;
        if (debrisPoolCount < debrisPool.length) {
            item = debrisPool[debrisPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("fill", "#64748b");
            poly.setAttribute("stroke", "#94a3b8");
            poly.setAttribute("stroke-width", "1");
            cellDebrisLayer.appendChild(poly);
            item = { el: poly, pts: '', op: '', hidden: false };
            debrisPool.push(item);
            debrisPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
        if (item.pts !== localPts) { item.el.setAttribute("points", localPts); item.pts = localPts; }
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
    }

    function renderPooledBacterium(x, y, deg, op, fill, stroke, abShowCount) {
        let item;
        if (bacPoolCount < bacPool.length) {
            item = bacPool[bacPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "-9"); rect.setAttribute("y", "-4.5");
            rect.setAttribute("width", "18"); rect.setAttribute("height", "9");
            rect.setAttribute("rx", "4.5");
            rect.setAttribute("stroke-width", "1.5");
            const abPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            abPath.setAttribute("stroke", "#fbbf24");
            abPath.setAttribute("stroke-width", "1.5");
            abPath.setAttribute("stroke-linecap", "round");
            abPath.setAttribute("fill", "none");
            g.appendChild(rect);
            g.appendChild(abPath);
            pathogensTissueLayer.appendChild(g);
            item = { el: g, rect, abPath, op: '', fill: '', stroke: '', abCnt: -1, hidden: false };
            bacPool.push(item);
            bacPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
        if (item.fill !== fill) { item.rect.setAttribute("fill", fill); item.fill = fill; }
        if (item.stroke !== stroke) { item.rect.setAttribute("stroke", stroke); item.stroke = stroke; }
        if (item.abCnt !== abShowCount) {
            item.abPath.setAttribute("d", BAC_AB_PATHS[abShowCount] || '');
            item.abCnt = abShowCount;
        }
    }

    function renderPooledVirus(x, y, op, fill, stroke, abShowCount) {
        let item;
        if (virPoolCount < virPool.length) {
            item = virPool[virPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", "5.5");
            circle.setAttribute("stroke-width", "1.2");
            const spikes = document.createElementNS("http://www.w3.org/2000/svg", "path");
            spikes.setAttribute("d", VIR_SPIKES_PATH);
            spikes.setAttribute("stroke-width", "1.2");
            spikes.setAttribute("fill", "none");
            const abPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            abPath.setAttribute("stroke", "#fbbf24");
            abPath.setAttribute("stroke-width", "1.4");
            abPath.setAttribute("stroke-linecap", "round");
            abPath.setAttribute("fill", "none");
            g.appendChild(circle);
            g.appendChild(spikes);
            g.appendChild(abPath);
            pathogensTissueLayer.appendChild(g);
            item = { el: g, circle, spikes, abPath, op: '', fill: '', stroke: '', abCnt: -1, hidden: false };
            virPool.push(item);
            virPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
        if (item.fill !== fill) { item.circle.setAttribute("fill", fill); item.fill = fill; }
        if (item.stroke !== stroke) {
            item.circle.setAttribute("stroke", stroke);
            item.spikes.setAttribute("stroke", stroke);
            item.stroke = stroke;
        }
        if (item.abCnt !== abShowCount) {
            item.abPath.setAttribute("d", VIR_AB_PATHS[abShowCount] || '');
            item.abCnt = abShowCount;
        }
    }

    function renderPooledParasite(x, y, deg, dPath, bodyStroke, coreStroke) {
        let item;
        if (parPoolCount < parPool.length) {
            item = parPool[parPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const pBody = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pBody.setAttribute("stroke-width", "12");
            pBody.setAttribute("stroke-linecap", "round");
            pBody.setAttribute("fill", "none");
            const pCore = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pCore.setAttribute("stroke-width", "3");
            pCore.setAttribute("fill", "none");
            g.appendChild(pBody);
            g.appendChild(pCore);
            pathogensTissueLayer.appendChild(g);
            item = { el: g, pBody, pCore, bStroke: '', cStroke: '', hidden: false };
            parPool.push(item);
            parPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
        item.pBody.setAttribute("d", dPath);
        item.pCore.setAttribute("d", dPath);
        if (item.bStroke !== bodyStroke) { item.pBody.setAttribute("stroke", bodyStroke); item.bStroke = bodyStroke; }
        if (item.cStroke !== coreStroke) { item.pCore.setAttribute("stroke", coreStroke); item.cStroke = coreStroke; }
    }

    function renderPooledChemDot(cx, cy, r, fill, op) {
        let item;
        if (chemDotPoolCount < chemDotPool.length) {
            item = chemDotPool[chemDotPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            chemicalsLayer.appendChild(dot);
            item = { el: dot, r: '', fill: '', op: '', hidden: false };
            chemDotPool.push(item);
            chemDotPoolCount++;
        }
        item.el.setAttribute("cx", cx.toFixed(1));
        item.el.setAttribute("cy", cy.toFixed(1));
        if (item.r !== r) { item.el.setAttribute("r", r); item.r = r; }
        if (item.fill !== fill) { item.el.setAttribute("fill", fill); item.fill = fill; }
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
    }

    function renderPooledAntibody(x, y, rot, isSec) {
        let item;
        if (abPoolCount < abPool.length) {
            item = abPool[abPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const yLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
            yLine.setAttribute("d", "M 0 4.5 L 0 0 L -3.5 -3.5 M 0 0 L 3.5 -3.5");
            yLine.setAttribute("stroke-linecap", "round");
            yLine.setAttribute("fill", "none");
            g.appendChild(yLine);
            chemicalsLayer.appendChild(g);
            item = { el: g, yLine, isSec: null, hidden: false };
            abPool.push(item);
            abPoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
        if (item.isSec !== isSec) {
            item.yLine.setAttribute("stroke", isSec ? "#fbbf24" : "#f97316");
            item.yLine.setAttribute("stroke-width", isSec ? "2.2" : "1.5");
            item.isSec = isSec;
        }
    }

    function renderPooledWbcSphere(x, y, r, subtype, op, strokeColor, strokeWidth, haloR, haloStroke) {
        let item;
        if (wbcSpherePoolCount < wbcSpherePool.length) {
            item = wbcSpherePool[wbcSpherePoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            halo.setAttribute("fill", "none");
            halo.setAttribute("stroke-width", "1.6");
            halo.setAttribute("stroke-dasharray", "3,2");
            halo.style.display = 'none';
            const nucGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.appendChild(circle);
            g.appendChild(halo);
            g.appendChild(nucGroup);
            activeWbcLayer.appendChild(g);
            item = { el: g, circle, halo, nucGroup, subtype: '', r: -1, op: '', stroke: '', sw: '', haloShown: false, hidden: false };
            wbcSpherePool.push(item);
            wbcSpherePoolCount++;
        }
        item.el.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
        if (item.op !== op) { item.el.setAttribute("opacity", op); item.op = op; }
        if (item.subtype !== subtype || item.r !== r) {
            item.circle.setAttribute("r", r);
            item.circle.setAttribute("fill", getWbcColor(subtype));
            item.nucGroup.innerHTML = '';
            drawWbcNucleus(item.nucGroup, subtype, r);
            item.subtype = subtype;
            item.r = r;
        }
        if (item.stroke !== strokeColor) { item.circle.setAttribute("stroke", strokeColor); item.stroke = strokeColor; }
        if (item.sw !== strokeWidth) { item.circle.setAttribute("stroke-width", strokeWidth); item.sw = strokeWidth; }
        if (haloR > 0) {
            if (!item.haloShown) { item.halo.style.display = ''; item.haloShown = true; }
            item.halo.setAttribute("r", haloR.toFixed(1));
            item.halo.setAttribute("stroke", haloStroke);
        } else if (item.haloShown) {
            item.halo.style.display = 'none';
            item.haloShown = false;
        }
    }

    function renderPooledWbcAmoeba(cx, cy, r, progress, subtype, state) {
        let item;
        if (wbcAmoebaPoolCount < wbcAmoebaPool.length) {
            item = wbcAmoebaPool[wbcAmoebaPoolCount++];
            if (item.hidden) { item.el.style.display = ''; item.hidden = false; }
        } else {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("stroke", "#ffffff");
            path.setAttribute("stroke-width", "1.4");
            const nuc = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            g.appendChild(path);
            g.appendChild(nuc);
            activeWbcLayer.appendChild(g);
            item = { el: g, path, nuc, hidden: false };
            wbcAmoebaPool.push(item);
            wbcAmoebaPoolCount++;
        }

        const color = getWbcColor(subtype);
        const numPts = 12;
        const pts = [];
        const nowMs = Date.now();

        for (let i = 0; i < numPts; i++) {
            const a = (i * 2 * Math.PI) / numPts;
            const align = -Math.sin(a);
            const perp = Math.abs(Math.cos(a));

            let rad = r;
            if (state === 'diapedesis') {
                if (progress < 0.35) {
                    rad = r * (align > 0 ? (1 + 0.65 * align) : (0.75 - 0.25 * perp));
                } else if (progress < 0.75) {
                    const squeezeWaist = Math.max(0.42, 1 - 0.58 * perp);
                    rad = r * squeezeWaist * (1 + 0.15 * Math.sin(a * 3 + nowMs / 130));
                } else {
                    rad = r * (align > 0 ? 1.15 : 0.72) * (1 + 0.12 * Math.sin(a * 2 + nowMs / 150));
                }
            } else {
                rad = r * (1 + 0.3 * align + 0.16 * Math.sin(a * 3 + nowMs / 160));
            }
            pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
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

        item.path.setAttribute("d", d);
        item.path.setAttribute("fill", color);
        item.nuc.setAttribute("cx", cx.toFixed(1));
        item.nuc.setAttribute("cy", (cy + (state === 'diapedesis' && progress < 0.5 ? 2.5 : -2.5)).toFixed(1));
        item.nuc.setAttribute("rx", (r * 0.36).toFixed(1));
        item.nuc.setAttribute("ry", (r * (state === 'diapedesis' ? 0.62 : 0.42)).toFixed(1));
        item.nuc.setAttribute("fill", getWbcNucleusColor(subtype));
    }

    // ==========================================
    // 10. Main Animation Step & Loop
    // ==========================================
    function stepSimulation() {
        const simNowMs = Date.now();

        // Reset zero-allocation SVG pools for this frame
        resetAllSvgPools();

        // Smooth physical params
        arterioleWidth += (targetArterioleWidth - arterioleWidth) * 0.05;
        capillaryWidth += (targetCapillaryWidth - capillaryWidth) * 0.05;
        sphincterTone += (targetSphincterTone - sphincterTone) * 0.05;
        flowSpeed += (targetFlowSpeed - flowSpeed) * 0.05;
        gapSize += (targetGapSize - gapSize) * 0.05;

        // Draining Lymph Node Adaptive Immunity Clonal Expansion Progress
        if (lymphNodeState.active) {
            lymphNodeState.timer++;
            const prog = Math.min(100, Math.round((lymphNodeState.timer / lymphNodeState.duration) * 100));
            if (statLymphPill) statLymphPill.style.display = 'inline-flex';
            if (statLymphText) {
                const agName = lymphNodeState.antigenType === 'bacteria' ? '細菌' : '病毒';
                statLymphText.textContent = `${agName}抗原・株落選殖 (${prog}%)`;
            }
            if (lymphProgressFill) lymphProgressFill.style.width = `${prog}%`;

            if (lymphNodeState.timer >= lymphNodeState.duration) {
                const agType = lymphNodeState.antigenType;
                lymphNodeState.active = false;
                if (statLymphPill) statLymphPill.style.display = 'none';

                const agName = agType === 'bacteria' ? '細菌' : '病毒';

                // If presenter has manually activated memory toggle, surge effector antibodies
                if (vaccineState[agType]) {
                    updateLog(`🫁 <strong>【淋巴結致敏選殖完成！】</strong>生發中心完成 ${agName} 抗原株落選殖！專一性抗體經胸導管注入靜脈血，正從小動脈奔赴微血管！`);
                    for (let k = 0; k < 14; k++) {
                        antibodies.push({
                            x: -15 - k * 16,
                            y: 365 + (Math.random() - 0.5) * 14,
                            laneOffset: (Math.random() - 0.5),
                            speed: 4.2 + Math.random() * 1.4,
                            targetExtravasateX: 220 + Math.random() * 560,
                            stage: 'circulation',
                            life: 520,
                            isSecondary: true,
                            targetType: agType
                        });
                    }
                } else {
                    // Teaching protection: Keep toggle switch OFF by default, do not disrupt primary defense explanation
                    updateLog(`🫁 <strong>【淋巴結致敏選殖完成】</strong>生發中心已建立 ${agName} 抗原專一性細胞株！為維護初次應答教學流程，開關維持關閉；若欲展示二次應答與血管抗體湧入，請手動開啟【${agName}免疫記憶】Toggle開關！`);
                }

                // If auto WBC is enabled, recruit effector leukocytes from circulation
                if (toggleAutoWbcCheckbox && toggleAutoWbcCheckbox.checked) {
                    if (agType === 'bacteria') {
                        recruitCirculatingWbc('neutrophil');
                        recruitCirculatingWbc('monocyte');
                    } else if (agType === 'virus') {
                        recruitCirculatingWbc('tcell');
                        recruitCirculatingWbc('bcell');
                    }
                }
            }
        }

        const targetSwelling = activeEffects.has('swelling') ? 1 : 0;
        swellingLevel += (targetSwelling - swellingLevel) * 0.05;

        // Geometry update only when physical parameters change
        const artWDiff = Math.abs(arterioleWidth - lastArtW);
        const capWDiff = Math.abs(capillaryWidth - lastCapW);
        const sphDiff = Math.abs(sphincterTone - lastSphTone);
        const gapDiff = Math.abs(gapSize - lastGap);
        const woundDiff = coagState.woundOpen !== lastWoundOpen || coagState.healProgress !== lastHealProg;

        if (artWDiff > 0.01 || capWDiff > 0.01 || sphDiff > 0.005 || gapDiff > 0.01 || woundDiff) {
            lastArtW = arterioleWidth;
            lastCapW = capillaryWidth;
            lastSphTone = sphincterTone;
            lastGap = gapSize;
            lastWoundOpen = coagState.woundOpen;
            lastHealProg = coagState.healProgress;
            updateLumenGeometry();
        }

        // Epidermis and Surface Bulge
        const maxBulge = swellingLevel * 38;
        const junctionBulgeY = 55 - maxBulge;
        const topBulgeY = 2 - maxBulge;

        const swellingChanged = Math.abs(swellingLevel - lastSwellingLevel) > 0.0008;
        let juncD = '';
        if (swellingChanged || !skinSurface.getAttribute("d")) {
            lastSwellingLevel = swellingLevel;
            epidermisCells.forEach(cell => {
                const t = Math.max(0, Math.min(1, cell.posX / 1000));
                const factor = 4 * t * (1 - t);
                const yOffset = -maxBulge * factor;
                if (cell.type === 'rect') cell.el.setAttribute('y', cell.origY + yOffset);
                else cell.el.setAttribute('transform', `translate(0, ${yOffset})`);
            });

            ciliaList.forEach(c => {
                c.sY = getSkinSurfaceY(c.baseX, swellingLevel);
            });

            // Dynamically compute exact surface and basement membrane curves
            let skinD = `M 0 ${getSkinSurfaceY(0, swellingLevel).toFixed(1)}`;
            juncD = `M 0 ${(55 + getSkinSurfaceY(0, swellingLevel) - 2).toFixed(1)}`;
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

            if (epiBgEl) {
                let epiD = `M 0 ${getSkinSurfaceY(0, swellingLevel).toFixed(1)}`;
                for (let px = 25; px <= 500; px += 25) epiD += ` L ${px} ${getSkinSurfaceY(px, swellingLevel).toFixed(1)}`;
                for (let px = 500; px >= 0; px -= 25) epiD += ` L ${px} ${(55 + getSkinSurfaceY(px, swellingLevel) - 2).toFixed(1)}`;
                epiD += ' Z';
                epiBgEl.setAttribute('d', epiD);
            }
            if (mucBgEl) {
                let mucD = `M 500 ${getSkinSurfaceY(500, swellingLevel).toFixed(1)}`;
                for (let px = 525; px <= 1000; px += 25) mucD += ` L ${px} ${getSkinSurfaceY(px, swellingLevel).toFixed(1)}`;
                for (let px = 1000; px >= 500; px -= 25) mucD += ` L ${px} ${(55 + getSkinSurfaceY(px, swellingLevel) - 2).toFixed(1)}`;
                mucD += ' Z';
                mucBgEl.setAttribute('d', mucD);
            }
            if (mucCutLine) {
                const midSkinY = getSkinSurfaceY(500, swellingLevel);
                mucCutLine.setAttribute('y1', midSkinY - 28);
                mucCutLine.setAttribute('y2', 55 + midSkinY - 2);
            }
        }

        // ----------------------------------------------------
        // 0. Interstitial Fluid & Lymphatic Circulation (Covered Water Tank Model)
        // ----------------------------------------------------
        if (fluidCirculationEnabled && fluidTankBgLayer && extravasatedLayer) {
            fluidTankBgLayer.setAttribute("opacity", "1");
            const isEdema = activeEffects.has('swelling') || swellingLevel > 0.15;

            // A) Covered Water Tank Background Fill
            const tPool = getTankPoolEl();
            if (tPool) {
                if (swellingChanged || !tPool.getAttribute("d")) {
                    if (!juncD) {
                        juncD = `M 0 ${(55 + getSkinSurfaceY(0, swellingLevel) - 2).toFixed(1)}`;
                        for (let px = 25; px <= 1000; px += 25) {
                            juncD += ` L ${px} ${(55 + getSkinSurfaceY(px, swellingLevel) - 2).toFixed(1)}`;
                        }
                    }
                    tPool.setAttribute("d", `${juncD} L 1000 300 L 0 300 Z`);
                }
                tPool.setAttribute("opacity", (0.85 + swellingLevel * 0.15).toFixed(2));
                tPool.style.display = '';
            }

            // E) Cell-Bathing Ripples around Living Tissue Cells (Zero-DOM creation)
            tissueSites.forEach((site, sIdx) => {
                if (!site.bathRing && fluidTankBgLayer) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#7dd3fc");
                    ring.setAttribute("stroke-width", "1.3");
                    ring.setAttribute("stroke-dasharray", "5,4");
                    ring.setAttribute("opacity", "0.45");
                    fluidTankBgLayer.appendChild(ring);
                    site.bathRing = ring;
                }
                if (site.bathRing) {
                    if (site.state === 'healthy' || site.state === 'infected' || site.state === 'dividing') {
                        const t = Math.max(0, Math.min(1, site.origX / 1000));
                        const sy = site.origY - maxBulge * 4 * t * (1 - t) * 0.4;
                        const pulseR = site.r + 5 + Math.sin(simNowMs * 0.0035 + sIdx * 0.9) * 2.5;
                        site.bathRing.setAttribute("cx", site.x);
                        site.bathRing.setAttribute("cy", sy);
                        site.bathRing.setAttribute("r", pulseR.toFixed(1));
                        site.bathRing.style.display = '';
                    } else {
                        site.bathRing.style.display = 'none';
                    }
                }
            });

            // F) Spawn & Update 3-Phase Fluid Droplets
            fluidSpawnTimer++;
            const spawnInterval = isEdema ? 7 : 13;

            if (fluidSpawnTimer >= spawnInterval) {
                fluidSpawnTimer = 0;

                let bathingCount = 0;
                let drainingCount = 0;
                for (let k = 0; k < fluidDroplets.length; k++) {
                    const st = fluidDroplets[k].state;
                    if (st === 'tank_bathing' || st === 'inlet_filtering') bathingCount++;
                    else if (st === 'lymph_draining') drainingCount++;
                }

                const maxTankDroplets = isEdema ? 74 : 52;
                if (bathingCount < maxTankDroplets) {
                    const endoIntercellularGaps = [214.1, 249.7, 285.4, 321.0, 356.7, 392.3, 428.0, 463.6, 499.3, 534.9, 570.6, 606.2, 641.9, 677.6, 713.2, 748.9, 784.5, 820.2];
                    const gx = endoIntercellularGaps[Math.floor(Math.random() * endoIntercellularGaps.length)];
                    const lidAtGx = 55 + getSkinSurfaceY(gx, swellingLevel) + 12;
                    const targetY = lidAtGx + Math.random() * (245 - lidAtGx);
                    const dropletRadius = 2.7 + Math.random() * 0.6;
                    fluidDroplets.push({
                        state: 'inlet_filtering',
                        gapX: gx,
                        x: gx,
                        y: 320,
                        startY: 320,
                        targetTankY: targetY,
                        vx: (Math.random() - 0.5) * 0.30,
                        vy: -(0.9 + Math.random() * 0.45) * (isEdema ? 1.25 : 1.0),
                        r: dropletRadius,
                        baseR: dropletRadius,
                        wanderAngle: Math.random() * Math.PI * 2,
                        phase: Math.random() * Math.PI * 2,
                        life: 260 + Math.floor(Math.random() * 140),
                        maxLife: 380,
                        alpha: 0.92
                    });
                }

                if (drainingCount < (isEdema ? 14 : 9)) {
                    fluidDroplets.push({
                        state: 'lymph_draining',
                        x: 795 + Math.random() * 55,
                        y: 222 + Math.random() * 58,
                        targetValveY: 268 + (Math.random() - 0.5) * 16,
                        r: 2.7 + Math.random() * 0.6,
                        alpha: 0.85
                    });
                }
            }

            // Render upward filtration arrows directly emerging through endothelial intercellular gaps (Persistent arrows)
            initGapArrows();
            if (fluidArrowsLayer && gapArrowElements.length > 0) {
                fluidArrowsLayer.style.display = '';
                gapArrowElements.forEach((item, idx) => {
                    const bob = Math.sin(simNowMs * 0.005 + idx) * 2.2;
                    const ay = 306 + bob;
                    item.el.setAttribute("d", `M ${item.gx} ${ay + 6} L ${item.gx} ${ay - 3} M ${item.gx - 3} ${ay} L ${item.gx} ${ay - 3.5} L ${item.gx + 3} ${ay}`);
                });
            }

            // Update & Render each fluid droplet via zero-allocation dropletPool
            for (let i = fluidDroplets.length - 1; i >= 0; i--) {
                const d = fluidDroplets[i];

                if (d.state === 'inlet_filtering') {
                    d.y += d.vy * simSpeed;
                    if (d.y >= 310) {
                        d.x = d.gapX || d.x;
                    } else {
                        d.x += d.vx * simSpeed;
                    }

                    const isPassingCleft = d.y >= 309 && d.y <= 321;
                    const rX = isPassingCleft ? Math.max(1.3, (d.baseR || 2.7) * 0.65) : (d.baseR || 2.7);
                    const rY = isPassingCleft ? ((d.baseR || 2.7) * 1.45) : (d.baseR || 2.7);

                    renderPooledDroplet(d.x.toFixed(1), d.y.toFixed(1), rX.toFixed(1), rY.toFixed(1), "#38bdf8", "0.8", d.alpha.toFixed(2));

                    if (d.y <= d.targetTankY) {
                        d.state = 'tank_bathing';
                        d.wanderAngle = Math.random() * Math.PI * 2;
                        d.r = d.baseR || 2.7;
                    }
                } else if (d.state === 'tank_bathing') {
                    d.life -= simSpeed;
                    d.wanderAngle += (Math.random() - 0.5) * 0.26 * simSpeed;
                    let vx = Math.cos(d.wanderAngle) * 0.32;
                    let vy = Math.sin(d.wanderAngle) * 0.28;

                    for (let sIdx = 0; sIdx < tissueSites.length; sIdx++) {
                        const site = tissueSites[sIdx];
                        if (site.state !== 'empty') {
                            const dx = d.x - site.x;
                            const dy = d.y - site.y;
                            const distSq = dx * dx + dy * dy;
                            const minR = site.r + 5;
                            const maxCheck = minR + 12;
                            if (distSq < maxCheck * maxCheck && distSq > 0.01) {
                                const dist = Math.sqrt(distSq);
                                const nx = dx / dist;
                                const ny = dy / dist;
                                vx = -ny * 0.38 + (dist < minR ? nx * 0.5 : 0);
                                vy = nx * 0.38 + (dist < minR ? ny * 0.5 : 0);
                                d.wanderAngle = Math.atan2(vy, vx);
                                break;
                            }
                        }
                    }

                    d.x += vx * simSpeed;
                    d.y += vy * simSpeed;

                    const lidY = 55 + getSkinSurfaceY(d.x, swellingLevel) + 8;
                    if (d.y < lidY) {
                        d.y = lidY;
                        d.wanderAngle = Math.abs(d.wanderAngle);
                    } else if (d.y > 276) {
                        d.y = 276;
                        d.wanderAngle = -Math.abs(d.wanderAngle);
                    }
                    if (d.x < 35) {
                        d.x = 35;
                        d.wanderAngle = Math.PI - d.wanderAngle;
                    } else if (d.x > 850) {
                        if (d.y > 205) {
                            d.state = 'lymph_draining';
                            d.targetValveY = 268 + (Math.random() - 0.5) * 14;
                        } else {
                            d.x = 850;
                            d.wanderAngle = Math.PI - d.wanderAngle;
                        }
                    }

                    if (d.life <= 0) {
                        fluidDroplets.splice(i, 1);
                        continue;
                    }

                    const fadeAlpha = d.life < 50 ? (d.life / 50) * 0.75 : 0.72;
                    const rStr = d.r.toFixed(1);
                    renderPooledDroplet(d.x.toFixed(1), d.y.toFixed(1), rStr, rStr, "#bae6fd", "0.7", fadeAlpha.toFixed(2));

                } else if (d.state === 'lymph_draining') {
                    const inLumen = d.x >= 868;
                    if (!inLumen) {
                        const dx = 872 - d.x;
                        const dy = (d.targetValveY || 268) - d.y;
                        const dist = Math.max(1, Math.hypot(dx, dy));
                        const spd = (1.15 + (isEdema ? 0.45 : 0)) * simSpeed;
                        d.x += (dx / dist) * spd;
                        d.y += (dy / dist) * spd;
                    } else {
                        d.x += (1.9 + (isEdema ? 0.5 : 0)) * simSpeed;
                        d.y += (268 - d.y) * 0.06 * simSpeed;
                        if (d.x > 965) {
                            d.alpha -= 0.04 * simSpeed;
                        }
                    }

                    if (d.x >= 1002 || d.alpha <= 0.05) {
                        fluidDroplets.splice(i, 1);
                        continue;
                    }

                    const rStr = d.r.toFixed(1);
                    renderPooledDroplet(d.x.toFixed(1), d.y.toFixed(1), rStr, rStr, "#38bdf8", "0.85", d.alpha.toFixed(2));
                }
            }
        } else if (fluidTankBgLayer) {
            fluidTankBgLayer.setAttribute("opacity", "0");
            if (tankPoolEl) tankPoolEl.style.display = 'none';
            tissueSites.forEach(site => { if (site.bathRing) site.bathRing.style.display = 'none'; });
            if (fluidArrowsLayer) fluidArrowsLayer.style.display = 'none';
        }

        // ----------------------------------------------------
        // Dynamic Mucosa Layer (Fluid Mucus Blanket, Cilia Beating, Lysozyme & sIgA)
        // ----------------------------------------------------
        if (mucusLayer) {
            let mD = `M 500 ${getSkinSurfaceY(500, swellingLevel) + 3} L 1000 ${getSkinSurfaceY(1000, swellingLevel) + 3} `;
            for (let mx = 1000; mx >= 500; mx -= 20) {
                const sY = getSkinSurfaceY(mx, swellingLevel);
                const wave = Math.sin(simNowMs * 0.003 - mx * 0.04) * 2;
                mD += `L ${mx} ${(sY - 14 + wave).toFixed(1)} `;
            }
            mD += 'Z';
            mucusLayer.setAttribute('d', mD);
        }

        if (ciliaCombinedPath && ciliaList.length > 0) {
            let ciliaD = '';
            const timePhase = simNowMs * 0.008;
            for (let i = 0; i < ciliaList.length; i++) {
                const c = ciliaList[i];
                const sY = c.sY;
                const beatPhase = timePhase - c.baseX * 0.055;
                const tipDx = Math.sin(beatPhase) * 5 + 3.5;
                const tipDy = -10 + Math.cos(beatPhase) * 2;
                ciliaD += `M ${c.baseX} ${sY.toFixed(1)} Q ${(c.baseX + tipDx * 0.4).toFixed(1)} ${(sY + tipDy * 0.5).toFixed(1)} ${(c.baseX + tipDx).toFixed(1)} ${(sY + tipDy).toFixed(1)} `;
            }
            ciliaCombinedPath.setAttribute('d', ciliaD);
        }

        if (mucosaChemicalsLayer) {
            lysozymes.forEach(ly => {
                ly.sparkle += 0.12;
                ly.x += ly.vx; ly.y += ly.vy;
                if (ly.x < 515 || ly.x > 985) ly.vx *= -1;
                const sY = getSkinSurfaceY(ly.x, swellingLevel);
                if (ly.y < sY - 16 || ly.y > sY + 2) ly.vy *= -1;

                if (ly.el) {
                    ly.el.setAttribute("transform", `translate(${ly.x.toFixed(1)}, ${ly.y.toFixed(1)})`);
                    if (ly.circle) ly.circle.setAttribute("r", (2.2 + Math.sin(ly.sparkle) * 0.8).toFixed(1));
                }
            });

            sIgAList.forEach(ab => {
                ab.x += ab.vx; ab.y += ab.vy;
                if (ab.x < 515 || ab.x > 985) ab.vx *= -1;
                const sY = getSkinSurfaceY(ab.x, swellingLevel);
                if (ab.y < sY - 16 || ab.y > sY + 2) ab.vy *= -1;

                if (ab.el) {
                    ab.el.setAttribute("transform", `translate(${ab.x.toFixed(1)}, ${ab.y.toFixed(1)}) scale(0.85)`);
                }
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
            scalpelBladeLayer.setAttribute("transform", `translate(${WOUND_X}, ${bladeY.toFixed(1)})`);
        } else {
            scalpelBladeLayer.setAttribute("opacity", "0");
        }

        // Wound Cavity V-shape cut from skin down to capillary
        const expColEl = getExposedCollagenPath();
        if (coagState.woundOpen > 0.02) {
            const healFactor = 1 - coagState.healProgress * 0.95;
            const topW = WOUND_HALF_W * coagState.woundOpen * healFactor;
            const botW = VESSEL_BREACH_HALF_W * coagState.woundOpen * healFactor;
            const botY = 312 - coagState.healProgress * 150;

            const cavityD = `M ${WOUND_X - topW} ${topBulgeY} L ${WOUND_X - botW} ${botY} L ${WOUND_X + botW} ${botY} L ${WOUND_X + topW} ${topBulgeY} Z`;
            woundCavity.setAttribute("d", cavityD);
            woundCavity.setAttribute("opacity", Math.max(0, healFactor).toFixed(2));

            // Exposed collagen fibers along wound edge (Combined single path)
            if (coagStage >= 1 && coagStage <= 3 && expColEl) {
                let colD = '';
                const timeDiv = simNowMs / 200;
                for (let side of [-1, 1]) {
                    const edgeX = WOUND_X + side * botW;
                    for (let k = 0; k < 5; k++) {
                        const startY = botY - 5 - k * 8;
                        const wiggle = Math.sin(timeDiv + k) * 4;
                        colD += `M ${edgeX.toFixed(1)} ${startY.toFixed(1)} Q ${(edgeX + side * (12 + wiggle)).toFixed(1)} ${(startY + 4).toFixed(1)} ${(edgeX + side * 18).toFixed(1)} ${(startY - 2).toFixed(1)} `;
                    }
                }
                expColEl.setAttribute("d", colD);
                expColEl.style.display = '';
                createSvgLabel("⚡ 暴露膠原蛋白 (活化血小板)", WOUND_X + botW + 15, botY - 20, 'rgba(202, 138, 4, 0.9)');
            } else if (expColEl) {
                expColEl.style.display = 'none';
            }
        } else {
            woundCavity.setAttribute("opacity", "0");
            if (expColEl) expColEl.style.display = 'none';
        }

        // ----------------------------------------------------
        // B. Bleeding RBCs (Escaping upward through wound cavity)
        // ----------------------------------------------------
        const isBleedingActive = coagState.bleedIntensity > 0.02 && coagState.fibrinMesh < 0.5;
        if (isBleedingActive) {
            if (Math.random() < 0.32 * coagState.bleedIntensity) {
                bleedingRBCs.push({
                    x: WOUND_X + (Math.random() - 0.5) * 14,
                    y: 312,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: -(0.45 + Math.random() * 0.45),
                    r: 4.8,
                    atSurface: false,
                    surfaceLife: 220 + Math.random() * 120,
                    surfaceDrift: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.32),
                    alpha: 1
                });
            }
        }

        if (bleedingRBCs.length > 0) {
            const baseBleedOp = coagState.fibrinMesh > 0.5 ? 0.95 : Math.max(0.4, coagState.bleedIntensity);
            for (let i = bleedingRBCs.length - 1; i >= 0; i--) {
                const r = bleedingRBCs[i];
                if (!r.atSurface) {
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
                    if (coagState.fibrinMesh > 0.5) {
                        r.vy = 0;
                        r.vx = 0;
                    } else {
                        if (Math.abs(r.x - WOUND_X) < 42) {
                            r.x += r.surfaceDrift;
                        }
                        r.y = topBulgeY + Math.sin(r.x * 0.08) * 1.5;

                        r.surfaceLife--;
                        if (r.surfaceLife < 80 || Math.abs(r.x - WOUND_X) >= 42) {
                            r.alpha -= 0.012;
                        }
                        if (r.alpha <= 0) {
                            bleedingRBCs.splice(i, 1);
                            continue;
                        }
                    }
                }

                renderPooledBleedRbc(r.x, r.y, (r.alpha * baseBleedOp).toFixed(2));
            }

            if (isBleedingActive) {
                const bleedMsg = coagState.plateletPlug > 0.5 ? "血小板栓形成但仍持續微量滲血 (待纖維網凝固)" : "血液持續湧出並於表層淤積";
                createSvgLabel(bleedMsg, WOUND_X, topBulgeY - 14, 'rgba(185, 28, 28, 0.9)');
            }
        }

        // ----------------------------------------------------
        // C. Platelet Plug (Persistent DOM)
        // ----------------------------------------------------
        if (coagState.plateletPlug > 0.05) {
            ensurePlateletPlugDOM();
            plateletPlugLayer.style.display = '';
            createSvgLabel("初級血小板栓塞 (Platelet Plug)", WOUND_X, 290, 'rgba(217, 119, 6, 0.9)');
        } else if (plateletPlugBuilt) {
            plateletPlugLayer.style.display = 'none';
        }

        // ----------------------------------------------------
        // D. Fibrin Mesh (Persistent Combined Paths)
        // ----------------------------------------------------
        if (coagState.fibrinMesh > 0.05) {
            ensureFibrinMeshDOM();
            fibrinMeshLayer.style.display = '';
            fibrinMeshLayer.setAttribute("opacity", (0.9 * coagState.fibrinMesh).toFixed(2));
            createSvgLabel("纖維蛋白網 (Fibrin Clot)", WOUND_X, 275, 'rgba(245, 158, 11, 0.9)');
        } else if (fibrinMeshBuilt) {
            fibrinMeshLayer.style.display = 'none';
        }

        // ----------------------------------------------------
        // E. Scab & Dried Surface Crust / Detachment & Recovery
        // ----------------------------------------------------
        const scabEl = getScabPathEl();
        if (coagState.scabDetachAnim > 0) {
            coagState.scabDetachAnim += 0.016;
            const progress = Math.min(1, coagState.scabDetachAnim);

            coagState.fibrinMesh = Math.max(0, 1 - progress);
            coagState.plateletPlug = Math.max(0, 1 - progress);
            coagState.woundOpen = Math.max(0, 1 - progress);

            const detachY = -progress * 26;
            const detachOpacity = Math.max(0, 1 - progress);

            if (scabEl) {
                const scabD = `M ${WOUND_X - 45} ${topBulgeY} Q ${WOUND_X} ${topBulgeY - 10} ${WOUND_X + 45} ${topBulgeY} L ${WOUND_X + 38} ${topBulgeY + 12} Q ${WOUND_X} ${topBulgeY + 18} ${WOUND_X - 38} ${topBulgeY + 12} Z`;
                scabEl.setAttribute("d", scabD);
                scabEl.setAttribute("transform", `translate(0, ${detachY.toFixed(1)})`);
                scabEl.setAttribute("opacity", (0.95 * detachOpacity).toFixed(2));
                scabEl.style.display = '';
            }

            createSvgLabel("痂皮脫落與纖溶重塑 (Fibrinolysis & Detachment)", WOUND_X, topBulgeY + detachY - 14, 'rgba(127, 29, 29, 0.9)');

            if (coagState.scabDetachAnim >= 1) {
                coagState.scabDetachAnim = 0;
                coagState.scabProgress = 0;
                coagState.woundOpen = 0;
                coagState.fibrinMesh = 0;
                coagState.plateletPlug = 0;
                woundCavity.setAttribute("opacity", "0");
                if (scabEl) scabEl.style.display = 'none';
                if (fibrinMeshBuilt) fibrinMeshLayer.style.display = 'none';
                if (plateletPlugBuilt) plateletPlugLayer.style.display = 'none';
                if (expColEl) expColEl.style.display = 'none';
                bleedingRBCs = [];
                updateStats();
            }
        } else if (coagState.scabProgress > 0.05) {
            if (scabEl) {
                const scabD = `M ${WOUND_X - 45} ${topBulgeY} Q ${WOUND_X} ${topBulgeY - 10} ${WOUND_X + 45} ${topBulgeY} L ${WOUND_X + 38} ${topBulgeY + 12} Q ${WOUND_X} ${topBulgeY + 18} ${WOUND_X - 38} ${topBulgeY + 12} Z`;
                scabEl.setAttribute("d", scabD);
                scabEl.removeAttribute("transform");
                scabEl.setAttribute("opacity", "0.95");
                scabEl.style.display = '';
            }
            createSvgLabel("乾燥保護性痂皮 (Scab)", WOUND_X, topBulgeY - 14, 'rgba(69, 10, 10, 0.9)');
        } else if (scabEl) {
            scabEl.style.display = 'none';
        }

        // ----------------------------------------------------
        // F. Tissue Sites & Mitosis Update
        // ----------------------------------------------------
        tissueSites.forEach(site => {
            const t = Math.max(0, Math.min(1, site.origX / 1000));
            const yOffset = -maxBulge * 4 * t * (1 - t) * 0.4;
            site.y = site.origY + yOffset;

            if (!site.domGroup) return;

            if (site.state === 'healthy') {
                if (site.renderedState !== 'healthy') {
                    site.domGroup.innerHTML = '';
                    site.domBody.setAttribute("cx", site.x);
                    site.domBody.setAttribute("r", site.r);
                    site.domBody.setAttribute("fill", "#fdebd0");
                    site.domBody.setAttribute("stroke", "#f8c471");
                    site.domBody.setAttribute("stroke-width", "2");
                    site.domBody.removeAttribute("stroke-dasharray");
                    site.domBody.setAttribute("opacity", "0.9");
                    site.domBody.style.display = '';

                    site.domNuc.setAttribute("cx", site.x);
                    site.domNuc.setAttribute("r", "6");
                    site.domNuc.setAttribute("fill", "#eb984e");
                    site.domNuc.style.display = '';

                    site.domGroup.appendChild(site.domBody);
                    site.domGroup.appendChild(site.domNuc);
                    site.renderedState = 'healthy';
                    site.lastY = -999;
                }
                if (Math.abs(site.y - (site.lastY || -999)) > 0.05) {
                    const yStr = site.y.toFixed(1);
                    site.domBody.setAttribute("cy", yStr);
                    site.domNuc.setAttribute("cy", yStr);
                    site.lastY = site.y;
                }
                return;
            }

            if (site.state === 'empty') {
                if (site.renderedState !== 'empty') {
                    site.domGroup.innerHTML = '';
                    site.domBody.setAttribute("cx", site.x);
                    site.domBody.setAttribute("r", site.r);
                    site.domBody.setAttribute("fill", "none");
                    site.domBody.setAttribute("stroke", "#64748b");
                    site.domBody.setAttribute("stroke-dasharray", "4,4");
                    site.domBody.setAttribute("stroke-width", "1.5");
                    site.domBody.setAttribute("opacity", "1");
                    site.domBody.style.display = '';
                    site.domGroup.appendChild(site.domBody);
                    site.renderedState = 'empty';
                    site.lastY = -999;
                }
                if (Math.abs(site.y - (site.lastY || -999)) > 0.05) {
                    site.domBody.setAttribute("cy", site.y.toFixed(1));
                    site.lastY = site.y;
                }

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
                if (site.renderedState !== 'incoming') {
                    site.domGroup.innerHTML = '';
                    site.domBody.setAttribute("cx", site.x);
                    site.domBody.setAttribute("r", site.r);
                    site.domBody.setAttribute("fill", "none");
                    site.domBody.setAttribute("stroke", "#f59e0b");
                    site.domBody.setAttribute("stroke-dasharray", "3,3");
                    site.domBody.setAttribute("stroke-width", "1.5");
                    site.domBody.style.display = '';
                    site.domGroup.appendChild(site.domBody);
                    site.renderedState = 'incoming';
                    site.lastY = -999;
                }
                if (Math.abs(site.y - (site.lastY || -999)) > 0.05) {
                    site.domBody.setAttribute("cy", site.y.toFixed(1));
                    site.lastY = site.y;
                }
                return;
            }

            if (site.state === 'infected') {
                site.infectionProgress += 0.15;
                if (site.renderedState !== 'infected') {
                    site.domGroup.innerHTML = '';
                    site.domBody.setAttribute("cx", site.x);
                    site.domBody.setAttribute("r", site.r);
                    site.domBody.setAttribute("fill", "#f3e8ff");
                    site.domBody.setAttribute("stroke", "#9333ea");
                    site.domBody.setAttribute("stroke-width", "2.5");
                    site.domBody.removeAttribute("stroke-dasharray");
                    site.domBody.setAttribute("opacity", "1");
                    site.domBody.style.display = '';
                    site.domGroup.appendChild(site.domBody);

                    if (!site.domVirDots) {
                        site.domVirDots = [];
                        for (let k = 0; k < 6; k++) {
                            const vDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                            vDot.setAttribute("r", "3");
                            vDot.setAttribute("fill", "#9333ea");
                            site.domVirDots.push(vDot);
                        }
                    }
                    for (let k = 0; k < 6; k++) {
                        site.domGroup.appendChild(site.domVirDots[k]);
                    }
                    site.renderedState = 'infected';
                    site.lastY = -999;
                }
                if (Math.abs(site.y - (site.lastY || -999)) > 0.05) {
                    site.domBody.setAttribute("cy", site.y.toFixed(1));
                    site.lastY = site.y;
                }

                const vCount = Math.min(6, Math.floor(site.infectionProgress / 20) + 1);
                for (let k = 0; k < 6; k++) {
                    const vDot = site.domVirDots[k];
                    if (k < vCount) {
                        const a = (site.infectionProgress * 0.05) + (k * Math.PI * 2 / vCount);
                        vDot.setAttribute("cx", (site.x + Math.cos(a) * 11).toFixed(1));
                        vDot.setAttribute("cy", (site.y + Math.sin(a) * 11).toFixed(1));
                        vDot.style.display = '';
                    } else {
                        vDot.style.display = 'none';
                    }
                }
                createSvgLabel(`受病毒感染(${Math.floor(site.infectionProgress)}%)`, site.x, site.y - site.r - 8, 'rgba(147, 51, 234, 0.9)');

                if (site.infectionProgress >= 100) {
                    site.state = 'empty';
                    site.infectionProgress = 0;
                    createCellDebris(site.x, site.y, site.id, 5);
                    spawnFreeVirus(site.x, site.y, 4);
                    updateLog("💥 <strong>受感染細胞裂解死亡！</strong>病毒撐破宿主細胞，散出游離病毒並留下不規則細胞殘骸。");
                }
                return;
            }

            // For transient mitosis / migration states, render into site.domGroup
            site.renderedState = site.state;
            site.domGroup.innerHTML = '';

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
                site.domGroup.appendChild(waitCircle);

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
                site.domGroup.appendChild(g);

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
                    site.domGroup.appendChild(g);
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

                    site.domGroup.appendChild(mG); site.domGroup.appendChild(mN);
                    site.domGroup.appendChild(cG); site.domGroup.appendChild(cN);
                    createSvgLabel("新分裂子細胞", childX, childY - site.r - 8, 'rgba(217, 119, 6, 0.9)');
                }

                if (site.mitosisProgress >= 100) {
                    site.state = 'healthy'; site.mitosisProgress = 0;
                    target.state = 'healthy'; target.infectionProgress = 0;
                    site.targetSite = null;
                }
                return;
            }
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
                // Interstitial tissue debris: slow natural autolysis or cleared by lymphatic drainage
                if (d.x >= 870 && d.y >= 248 && d.y <= 288) {
                    // Draining through initial lymphatic capillary
                    d.x += 1.6 * simSpeed;
                    d.y += (LYMPH_VESSEL_Y - d.y) * 0.05 * simSpeed;
                    d.alpha = (d.alpha !== undefined ? d.alpha : 1) - 0.018 * simSpeed;
                    if (d.alpha <= 0.05 || d.x >= 995) {
                        cellDebris.splice(idx, 1);
                        continue;
                    }
                } else {
                    if (d.life < 150) {
                        d.alpha = Math.max(0, d.life / 150);
                    }
                    if (d.life <= 0) {
                        cellDebris.splice(idx, 1);
                        continue;
                    }
                }
            }

            const opStr = (0.85 * (d.alpha !== undefined ? d.alpha : 1)).toFixed(2);
            renderPooledDebris(d.x, d.y, d.localPts, opStr);
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
                                bacterialEncounterOccurred = true;
                                if (vaccineState.bacteria) {
                                    triggerSecondaryResponse('bacteria', b.x, b.y, b);
                                    updateLog("⚡ <strong>【二次免疫循環動員】外界細菌侵入創口，血液抗體隨小動脈湧至微血管並滲出，全面標記中和細菌！</strong>");
                                } else {
                                    updateLog("⚠️ <strong>【初次感染】外界細菌感應到創口滲出液鑽入真皮層！尚無專一性抗體，細菌開始增殖。</strong>");
                                }
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
                if (b.state === 'lymph_draining') {
                    // Bacteria flowing inside initial lymphatic capillary lumen towards lymph node
                    b.x += (1.9 + Math.random() * 0.4) * simSpeed;
                    b.y += (LYMPH_VESSEL_Y - b.y) * 0.05 * simSpeed;
                    b.angle += 0.04;
                    b.alpha = (b.alpha !== undefined ? b.alpha : 1) - 0.016 * simSpeed;

                    if (b.alpha <= 0.05 || b.x >= 995) {
                        // Bacteria enters lymph node!
                        if (!lymphNodeState.active && !vaccineState.bacteria) {
                            lymphNodeState.active = true;
                            lymphNodeState.antigenType = 'bacteria';
                            lymphNodeState.timer = 0;
                            if (statLymphPill) statLymphPill.style.display = 'inline-flex';
                            updateLog("🧪 <strong>【細菌隨淋巴液引流至局部淋巴結】</strong>游離細菌沖入引流淋巴結！被膜下竇巨噬細胞展開抗原過濾，啟動淋巴結免疫應答！");
                        }
                        bacteria.splice(i, 1);
                        continue;
                    }
                } else {
                    // Check entry into initial lymphatic capillary valve (x >= 875, y: 250..286)
                    if (b.x >= 875 && b.y >= 250 && b.y <= 286) {
                        b.state = 'lymph_draining';
                        b.alpha = 1;
                        updateLog("🧪 <strong>【細菌進入微淋巴管】</strong>部分真皮組織液中的細菌穿過微淋巴管瓦狀單向瓣膜，順著淋巴液回流前往引流淋巴結！");
                    } else if (!b.opsonized) {
                        // In ECM collagen meshwork: viscous damping + localized motility (NO artificial rightward fluid push!)
                        b.vx *= 0.85;
                        b.vy *= 0.85;
                        b.vx += (Math.random() - 0.5) * 0.35 * simSpeed;
                        b.vy += (Math.random() - 0.5) * 0.35 * simSpeed;

                        b.x += b.vx; b.y += b.vy; b.angle += 0.03;
                        if (b.x < 120) { b.x = 120; b.vx = Math.abs(b.vx); }
                        if (b.x > 865 && (b.y < 250 || b.y > 286)) { b.x = 865; b.vx = -Math.abs(b.vx); }

                        // Support swollen upper dermis and wound cavity!
                        const dermisTop = getDermisTopY(b.x, swellingLevel) + 4;
                        if (b.y < dermisTop) {
                            b.y = dermisTop;
                            b.vy = Math.abs(b.vy);
                        } else if (b.y > 275 && b.x < 868) {
                            b.y = 275;
                            b.vy = -Math.abs(b.vy);
                        }

                        // In primary infection (unopsonized), bacteria releases toxins damaging adjacent healthy cells
                        for (let c of tissueSites) {
                            if (c.state === 'healthy' && Math.hypot(c.x - b.x, c.y - b.y) < 28) {
                                c.toxinTimer = (c.toxinTimer || 0) + 1;
                                if (c.toxinTimer > 280) {
                                    c.state = 'empty';
                                    c.toxinTimer = 0;
                                    createCellDebris(c.x, c.y, c.id, 5);
                                    updateLog("⚠️ <strong>【初次感染傷害】未標記細菌釋放毒素破壞宿主細胞！</strong>產生壞死細胞殘骸。");
                                    break;
                                }
                            }
                        }

                        b.divideTimer++;
                        if (b.divideTimer > 450 && bacteria.length < 24) {
                            b.divideTimer = 0;
                            bacteria.push({
                                x: b.x + (Math.random() - 0.5) * 14,
                                y: b.y + (Math.random() - 0.5) * 14,
                                vx: (Math.random() - 0.5) * 0.5,
                                vy: (Math.random() - 0.5) * 0.5,
                                r: 7.5, inTissue: true, angle: Math.random() * Math.PI * 2,
                                opsonized: false, abCount: 0, divideTimer: 0
                            });
                        }
                    } else {
                        // Opsonized bacterium: motility paralyzed by antibody cross-linking, stays localized!
                        b.vx *= 0.70;
                        b.vy *= 0.70;
                        b.x += b.vx; b.y += b.vy;
                        if (b.x < 120) { b.x = 120; b.vx = Math.abs(b.vx); }
                        if (b.x > 865 && (b.y < 250 || b.y > 286)) { b.x = 865; b.vx = -Math.abs(b.vx); }
                        const dermisTop = getDermisTopY(b.x, swellingLevel) + 4;
                        if (b.y < dermisTop) { b.y = dermisTop; b.vy = Math.abs(b.vy); }
                        else if (b.y > 275 && b.x < 868) { b.y = 275; b.vy = -Math.abs(b.vy); }
                    }
                }
            }

            const bFill = b.inTissue ? (b.opsonized ? "#15803d" : "#22c55e") : (b.trappedInMucus ? "#10b981" : "#86efac");
            const bStroke = b.inTissue ? "#14532d" : (b.trappedInMucus ? "#047857" : "#16a34a");
            const bAbShow = (b.abCount > 0 && b.inTissue) ? Math.min(b.abCount, 6) : 0;
            renderPooledBacterium(
                b.x,
                b.y,
                b.angle * 180 / Math.PI,
                (b.alpha !== undefined ? b.alpha : 1).toFixed(2),
                bFill,
                bStroke,
                bAbShow
            );

            const bText = b.inTissue 
                ? (b.state === 'lymph_draining' 
                    ? "🌊 細菌隨淋巴引流 ➔ 淋巴結" 
                    : (b.opsonized ? "細菌(抗體標記)" : "細菌(真皮感染)")) 
                : (b.trappedInMucus 
                    ? "細菌(黏液捕捉・向右推送中)" 
                    : (isWoundOpen 
                        ? "細菌(感知創口・移行入侵中)" 
                        : (b.x >= 500 ? "外界細菌(黏膜上空)" : "外界細菌(角質阻隔・定植表皮)")));
            const bBg = b.inTissue 
                ? (b.state === 'lymph_draining' ? 'rgba(6, 78, 59, 0.95)' : (b.opsonized ? 'rgba(21, 128, 61, 0.9)' : 'rgba(34, 197, 94, 0.85)')) 
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
                                viralEncounterOccurred = true;
                                if (vaccineState.virus) {
                                    triggerSecondaryResponse('virus', v.x, v.y, v);
                                    updateLog("⚡ <strong>【二次免疫循環動員】外界病毒經創口侵入，血液中和抗體隨小動脈湧至微血管滲出，立即封鎖病毒！</strong>");
                                } else {
                                    updateLog("👾 <strong>【初次感染】外界病毒經創口侵入真皮層！缺乏中和抗體阻斷，開始尋找細胞感染。</strong>");
                                }
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
                if (v.state === 'lymph_draining') {
                    // Free virus particles flowing inside initial lymphatic capillary towards lymph node
                    v.x += (2.1 + Math.random() * 0.4) * simSpeed;
                    v.y += (LYMPH_VESSEL_Y - v.y) * 0.05 * simSpeed;
                    v.alpha = (v.alpha !== undefined ? v.alpha : 1) - 0.016 * simSpeed;

                    if (v.alpha <= 0.05 || v.x >= 995) {
                        // Reaches lymph node
                        if (!lymphNodeState.active && !vaccineState.virus) {
                            lymphNodeState.active = true;
                            lymphNodeState.antigenType = 'virus';
                            lymphNodeState.timer = 0;
                            if (statLymphPill) statLymphPill.style.display = 'inline-flex';
                            updateLog("🧪 <strong>【病毒隨淋巴液引流至局部淋巴結】</strong>游離病毒微粒流入引流淋巴結！啟動淋巴結免疫應答！");
                        }
                        freeViruses.splice(i, 1);
                        continue;
                    }
                } else {
                    // Check entry into initial lymphatic vessel valve (x >= 868, y: 248..288)
                    if (v.x >= 868 && v.y >= 248 && v.y <= 288) {
                        v.state = 'lymph_draining';
                        v.alpha = 1;
                        updateLog("🧪 <strong>【游離病毒進入微淋巴管】</strong>微小病毒顆粒隨組織液引流入微淋巴管瓦狀單向瓣膜，奔向局部引流淋巴結！");
                    } else if (!v.opsonized) {
                        let nearest = null;
                        let bestD2 = Infinity;
                        for (let cIdx = 0; cIdx < tissueSites.length; cIdx++) {
                            const c = tissueSites[cIdx];
                            if (c.state === 'healthy') {
                                const dx = c.x - v.x, dy = c.y - v.y;
                                const d2 = dx * dx + dy * dy;
                                if (d2 < bestD2) { bestD2 = d2; nearest = c; }
                            }
                        }
                        if (nearest) {
                            const dx = nearest.x - v.x, dy = nearest.y - v.y, dist = Math.sqrt(bestD2);
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
                            // In tissue without adjacent cells: localized Brownian motion with damping (NO rightward push!)
                            v.vx *= 0.88;
                            v.vy *= 0.88;
                            v.vx += (Math.random() - 0.5) * 0.35 * simSpeed;
                            v.vy += (Math.random() - 0.5) * 0.35 * simSpeed;
                            v.x += v.vx; v.y += v.vy;
                            if (v.x < 120) { v.x = 120; v.vx = Math.abs(v.vx); }
                            if (v.x > 865 && (v.y < 250 || v.y > 286)) { v.x = 865; v.vx = -Math.abs(v.vx); }
                            const dermisTop = getDermisTopY(v.x, swellingLevel) + 4;
                            if (v.y < dermisTop) { v.y = dermisTop; v.vy = Math.abs(v.vy); }
                            else if (v.y > 275 && v.x < 868) { v.y = 275; v.vy = -Math.abs(v.vy); }
                        }
                    } else {
                        // Opsonized / neutralized virus: paralyzed, stays in place
                        v.vx *= 0.75;
                        v.vy *= 0.75;
                        v.x += v.vx; v.y += v.vy;
                        if (v.x < 120) { v.x = 120; v.vx = Math.abs(v.vx); }
                        if (v.x > 865 && (v.y < 250 || v.y > 286)) { v.x = 865; v.vx = -Math.abs(v.vx); }
                        const dermisTop = getDermisTopY(v.x, swellingLevel) + 4;
                        if (v.y < dermisTop) { v.y = dermisTop; v.vy = Math.abs(v.vy); }
                        else if (v.y > 275 && v.x < 868) { v.y = 275; v.vy = -Math.abs(v.vy); }
                    }
                }
            }

            const vFill = v.inTissue ? (v.opsonized ? "#c084fc" : "#a855f7") : (v.trappedInMucus ? (v.opsonized ? "#67e8f9" : "#38bdf8") : "#d8b4fe");
            const vStroke = v.inTissue ? "#581c87" : (v.trappedInMucus ? "#0284c7" : "#7e22ce");
            const vAbShow = (v.abCount > 0 && v.inTissue) ? Math.min(v.abCount, 4) : 0;
            renderPooledVirus(
                v.x,
                v.y,
                (v.alpha !== undefined ? v.alpha : 1).toFixed(2),
                vFill,
                vStroke,
                vAbShow
            );

            const vText = v.inTissue 
                ? (v.state === 'lymph_draining' 
                    ? "🌊 病毒隨淋巴引流 ➔ 淋巴結" 
                    : (v.opsonized ? "病毒(已中和)" : "游離病毒(真皮感染)")) 
                : (v.trappedInMucus 
                    ? (v.opsonized ? "病毒(sIgA中和・向右排障中)" : "病毒(黏液捕捉・向右推送中)") 
                    : (isWoundOpen 
                        ? "病毒(向創口擴散移行中)" 
                        : (v.x >= 500 ? "外界病毒(黏膜上空)" : "外界病毒(角質阻隔・定植表皮)")));
            const vBg = v.inTissue 
                ? (v.state === 'lymph_draining' ? 'rgba(6, 78, 59, 0.95)' : (v.opsonized ? 'rgba(192, 132, 252, 0.9)' : 'rgba(168, 85, 247, 0.85)')) 
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

            const numPts = 12;
            const length = 75;
            let dPath = '';
            for (let k = 0; k < numPts; k++) {
                const t = k / (numPts - 1);
                const px = (t - 0.5) * length;
                const py = Math.sin(p.phase + t * Math.PI * 2.5) * 8;
                dPath += (k === 0 ? 'M ' : 'L ') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
            }

            renderPooledParasite(
                p.x,
                p.y,
                p.angle * 180 / Math.PI,
                dPath,
                p.inTissue ? "#f59e0b" : "#fde68a",
                p.inTissue ? "#d97706" : "#f59e0b"
            );

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
            renderPooledChemDot(h.x, h.y, "2.5", "#38bdf8", (h.life / 100).toFixed(2));
        }

        for (let i = eosinophilGranules.length - 1; i >= 0; i--) {
            const g = eosinophilGranules[i];
            g.x += g.vx; g.y += g.vy; g.life--;
            if (g.life <= 0) { eosinophilGranules.splice(i, 1); continue; }
            renderPooledChemDot(g.x, g.y, "2.8", "#f43f5e", "1");
        }

        // Continuous Humoral Immune Surveillance & Memory Inflow (Automatic Sustained Protection)
        if (vaccineState.bacteria || vaccineState.virus) {
            immuneSurveillanceTimer++;

            // 1. Bacteria Humoral Memory Active
            if (vaccineState.bacteria) {
                const tissueBac = bacteria.filter(b => (b.inTissue || b.y >= getSkinSurfaceY(b.x, swellingLevel) - 8) && b.state !== 'lymph_draining');
                const unopsonizedBac = tissueBac.filter(b => (b.abCount || 0) < 4);
                const circBacAb = antibodies.filter(a => a.stage === 'circulation' && a.targetType === 'bacteria');

                if (unopsonizedBac.length > 0) {
                    // Ongoing bacterial challenge: Continuous effector antibody surge from systemic circulation!
                    if (immuneSurveillanceTimer % 14 === 0 && circBacAb.length < 12) {
                        const targetB = unopsonizedBac[Math.floor(Math.random() * unopsonizedBac.length)];
                        antibodies.push({
                            x: -15 - Math.random() * 10,
                            y: 365 + (Math.random() - 0.5) * 14,
                            laneOffset: (Math.random() - 0.5),
                            speed: 4.2 + Math.random() * 1.4,
                            targetExtravasateX: Math.max(180, Math.min(880, targetB.x + (Math.random() - 0.5) * 45)),
                            stage: 'circulation',
                            vx: 3.8, vy: 0,
                            life: 580,
                            isSecondary: true,
                            targetType: 'bacteria'
                        });
                    }
                } else {
                    // Basal serum antibody titer: Continuous arterial patrol in bloodstream
                    if (immuneSurveillanceTimer % 40 === 0 && circBacAb.length < 5) {
                        antibodies.push({
                            x: -15 - Math.random() * 10,
                            y: 365 + (Math.random() - 0.5) * 14,
                            laneOffset: (Math.random() - 0.5),
                            speed: 3.8 + Math.random() * 1.0,
                            targetExtravasateX: null,
                            stage: 'circulation',
                            vx: 3.8, vy: 0,
                            life: 600,
                            isSecondary: true,
                            targetType: 'bacteria'
                        });
                    }
                }
            }

            // 2. Virus Humoral Memory Active
            if (vaccineState.virus) {
                const tissueVir = freeViruses.filter(v => (v.inTissue || v.y >= getSkinSurfaceY(v.x, swellingLevel) - 8) && v.state !== 'lymph_draining');
                const unneutralizedVir = tissueVir.filter(v => (v.abCount || 0) < 3);
                const circVirAb = antibodies.filter(a => a.stage === 'circulation' && a.targetType === 'virus');

                if (unneutralizedVir.length > 0) {
                    // Ongoing viral challenge: Continuous neutralizing antibody surge!
                    if (immuneSurveillanceTimer % 14 === 0 && circVirAb.length < 12) {
                        const targetV = unneutralizedVir[Math.floor(Math.random() * unneutralizedVir.length)];
                        antibodies.push({
                            x: -15 - Math.random() * 10,
                            y: 365 + (Math.random() - 0.5) * 14,
                            laneOffset: (Math.random() - 0.5),
                            speed: 4.2 + Math.random() * 1.4,
                            targetExtravasateX: Math.max(180, Math.min(880, targetV.x + (Math.random() - 0.5) * 45)),
                            stage: 'circulation',
                            vx: 3.8, vy: 0,
                            life: 580,
                            isSecondary: true,
                            targetType: 'virus'
                        });
                    }
                } else {
                    // Basal serum antibody titer
                    if (immuneSurveillanceTimer % 40 === 0 && circVirAb.length < 5) {
                        antibodies.push({
                            x: -15 - Math.random() * 10,
                            y: 365 + (Math.random() - 0.5) * 14,
                            laneOffset: (Math.random() - 0.5),
                            speed: 3.8 + Math.random() * 1.0,
                            targetExtravasateX: null,
                            stage: 'circulation',
                            vx: 3.8, vy: 0,
                            life: 600,
                            isSecondary: true,
                            targetType: 'virus'
                        });
                    }
                }
            }
        }

        // Pre-filter target lists once per frame for all antibodies (O(1) allocation)
        const activeBacTargets = bacteria.filter(b => (b.inTissue || b.y >= getSkinSurfaceY(b.x, swellingLevel) - 8) && b.state !== 'lymph_draining');
        const activeVirTargets = freeViruses.filter(v => (v.inTissue || v.y >= getSkinSurfaceY(v.x, swellingLevel) - 8) && v.state !== 'lymph_draining');
        const unopBacTargets = activeBacTargets.filter(b => (b.abCount || 0) < 3);
        const unopVirTargets = activeVirTargets.filter(v => (v.abCount || 0) < 3);

        for (let i = antibodies.length - 1; i >= 0; i--) {
            const ab = antibodies[i];
            ab.life--;
            if (ab.life <= 0) { antibodies.splice(i, 1); continue; }

            const matchType = ab.targetType || 'bacteria';
            const activeTargets = matchType === 'virus' ? activeVirTargets : activeBacTargets;

            // Stage 1: Circulating inside vascular system (Arteriole -> Precapillary Sphincters -> Capillary Bed)
            if (ab.stage === 'circulation') {
                const spd = (ab.speed || 4.2) * simSpeed;
                ab.x += spd;

                if (ab.x < 140) {
                    // Inside Arteriole lumen (global Y: 365 +- laneOffset * 10)
                    ab.y = 365 + (ab.laneOffset || 0) * 12;
                    ab.rot = 90; // Oriented horizontally with arterial stream
                } else if (ab.x >= 140 && ab.x < 168) {
                    // Bifurcation into upper capillary lumen (global Y: 365 -> 320)
                    const t = (ab.x - 140) / 28;
                    const s = t * t * (3 - 2 * t);
                    ab.y = 365 + (320 - 365) * s + (ab.laneOffset || 0) * 4;
                    ab.rot = 90 - s * 25; // Smooth curve tilt
                } else {
                    // Inside upper capillary bed (global Y: 320 +- laneOffset * 3)
                    ab.y = 320 + (ab.laneOffset || 0) * 4;
                    ab.rot = 90;

                    // Extravasation Conditions:
                    // A) Explicit destination X reached (near an infection site)
                    // B) OR dynamic opportunistic extravasation: passing capillary zone adjacent to active in-tissue pathogen
                    let shouldExtravasate = false;
                    let matchedPathogen = null;

                    if (ab.targetExtravasateX && ab.x >= ab.targetExtravasateX) {
                        shouldExtravasate = true;
                    } else if (ab.x >= 180 && ab.x <= 880 && activeTargets.length > 0) {
                        for (let tIdx = 0; tIdx < activeTargets.length; tIdx++) {
                            const tgt = activeTargets[tIdx];
                            if (Math.abs(tgt.x - ab.x) < 70) {
                                shouldExtravasate = true;
                                matchedPathogen = tgt;
                                break;
                            }
                        }
                    }

                    if (shouldExtravasate) {
                        ab.stage = 'tissue';
                        ab.y = 304; // Enters dermis just above endothelial junction

                        if (!matchedPathogen && activeTargets.length > 0) {
                            let bestD2 = Infinity;
                            for (let tIdx = 0; tIdx < activeTargets.length; tIdx++) {
                                const tgt = activeTargets[tIdx];
                                const dx = tgt.x - ab.x;
                                const dy = tgt.y - 304;
                                const d2 = dx * dx + dy * dy;
                                if (d2 < bestD2) { bestD2 = d2; matchedPathogen = tgt; }
                            }
                        }

                        if (matchedPathogen) {
                            const aimAngle = Math.atan2(matchedPathogen.y - 304, matchedPathogen.x - ab.x);
                            // Spread in a natural cone towards the lesion (+- 20 deg)
                            const spread = aimAngle + (Math.random() - 0.5) * 0.7;
                            const initSpd = 1.9 + Math.random() * 0.7;
                            ab.vx = Math.cos(spread) * initSpd;
                            ab.vy = Math.sin(spread) * initSpd;
                        } else {
                            // Upward-radial fan dispersion into dermis (-36 to -144 deg)
                            const fanAngle = -Math.PI * (0.2 + Math.random() * 0.6);
                            const initSpd = 1.6 + Math.random() * 0.6;
                            ab.vx = Math.cos(fanAngle) * initSpd;
                            ab.vy = Math.sin(fanAngle) * initSpd;
                        }
                        ab.rot = Math.atan2(ab.vy, ab.vx) * (180 / Math.PI) + 90;
                        ab.life = 600;
                    }
                }

                if (ab.x > 1020) {
                    antibodies.splice(i, 1);
                    continue;
                }
            } else {
                // Stage 2: Moving through dermal interstitial fluid via convection, diffusion & antigen affinity
                // 1. ECM hydraulic damping (slows down initial diapedesis jet into interstitial percolation)
                ab.vx *= 0.94;
                ab.vy *= 0.94;

                // 2. Microenvironmental Brownian percolation
                ab.vx += (Math.random() - 0.5) * 0.28 * simSpeed;
                ab.vy += (Math.random() - 0.5) * 0.24 * simSpeed;

                // 3. Gentle bulk interstitial drainage drift towards lymphatics (rightward)
                ab.vx += 0.03 * simSpeed;

                // 4. Local Antigen Affinity & Chemotactic Sink:
                const unopsonized = matchType === 'virus' ? unopVirTargets : unopBacTargets;
                const searchList = unopsonized.length > 0 ? unopsonized : activeTargets;

                let nearest = null;
                let minDistSq = 240 * 240; // max radius 240px
                for (let tIdx = 0; tIdx < searchList.length; tIdx++) {
                    const t = searchList[tIdx];
                    const dx = t.x - ab.x;
                    const dy = t.y - ab.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < minDistSq) {
                        minDistSq = d2;
                        nearest = t;
                    }
                }
                const minDist = nearest ? Math.sqrt(minDistSq) : 9999;

                if (nearest && minDist < 240) {
                    // Within 240px of pathogen: Fab epitope affinity field steers the antibody towards the target
                    const affinityPull = Math.min(1.4, (1 - minDist / 240) * 1.1 + 0.3) * simSpeed;
                    const dx = nearest.x - ab.x;
                    const dy = nearest.y - ab.y;
                    ab.vx += (dx / minDist) * affinityPull;
                    ab.vy += (dy / minDist) * affinityPull;
                }

                ab.x += ab.vx * simSpeed;
                ab.y += ab.vy * simSpeed;
                ab.rot = Math.atan2(ab.vy, ab.vx) * (180 / Math.PI) + 90;

                // 5. Stochastic Collision & High-Affinity Epitope Binding (Opsonization)
                let collided = false;
                if (nearest && minDist < ((nearest.r || 6.5) + 16.0)) {
                    nearest.abCount = (nearest.abCount || 0) + 1;
                    nearest.opsonized = true;
                    nearest.divideTimer = -999999;
                    if (nearest.r <= 6) {
                        nearest.neutralized = true;
                        nearest.penetratingTimer = 0;
                    }
                    collided = true;
                }

                if (collided) {
                    // Studded onto pathogen surface as opsonin marker
                    antibodies.splice(i, 1);
                    continue;
                }

                // 6. Dermal & Epidermal Boundaries: Allow chasing pathogens into upper epidermis/wound!
                const skinY = getSkinSurfaceY(ab.x, swellingLevel);
                const isNearSuperficialTarget = nearest && minDist < 150 && nearest.y <= (getDermisTopY(ab.x, swellingLevel) + 12);
                const abTopLimit = isNearSuperficialTarget ? (skinY - 5) : (getDermisTopY(ab.x, swellingLevel) - 4);

                if (ab.y < abTopLimit) {
                    ab.y = abTopLimit;
                    ab.vy = Math.abs(ab.vy) * 0.5; // Reflect off surface
                }
                if (ab.y > 320) {
                    ab.y = 320;
                    ab.vy = -Math.abs(ab.vy) * 0.5;
                }

                // 7. Lymphatic Drainage & Expiration
                if (ab.x >= 868 && ab.y >= 248 && ab.y <= 288) {
                    // Enters initial lymphatic vessel and drains to lymph node
                    antibodies.splice(i, 1);
                    continue;
                }

                if (ab.x < 20 || ab.x > 980) {
                    antibodies.splice(i, 1);
                    continue;
                }
            }

            const rot = ab.rot !== undefined ? ab.rot : (ab.stage === 'circulation' ? 90 : 0);
            renderPooledAntibody(ab.x, ab.y, rot, !!ab.isSecondary);
        }

        // ----------------------------------------------------
        // J. Intravascular & Extravasating (Amoeboid / Wound) WBCs
        // ----------------------------------------------------
        const isSwollen = activeEffects.has('swelling') || gapSize > 3.5 || swellingLevel > 0.2;
        const squeezeSpeed = isSwollen ? 1.8 : 0.8;

        // Auto physiological recruitment of leukocytes (controlled by toggle switch, default OFF)
        const hasTargets = bacteria.some(b => b.inTissue) || freeViruses.some(v => v.inTissue) || parasites.some(p => p.inTissue) || cellDebris.length > 0 || tissueSites.some(c => c.state === 'infected') || coagStage >= 1 || isSwollen;
        const isAutoWbcEnabled = toggleAutoWbcCheckbox && toggleAutoWbcCheckbox.checked;

        if (isAutoWbcEnabled) {
            const hasParasiteInTissue = parasites.some(p => p.inTissue);
            const hasInfectedCells = tissueSites.some(c => c.state === 'infected');
            const hasBacteriaInTissue = bacteria.some(b => b.inTissue);
            const hasDebris = cellDebris.length > 0;
            const hasFreeVirusesInTissue = freeViruses.some(v => v.inTissue);

            if (hasParasiteInTissue || hasInfectedCells || hasBacteriaInTissue || hasDebris || hasFreeVirusesInTissue || isSwollen) {
                autoWbcRecruitTimer++;
                const recruitInterval = (hasParasiteInTissue || hasInfectedCells) ? 140 : (isSwollen ? 200 : 300);

                if (autoWbcRecruitTimer > recruitInterval && (bloodWBCs.length + activeTissueWBCs.length) < 9) {
                    autoWbcRecruitTimer = 0;

                    // 1. Virus-infected cells demand NK / Cytotoxic T cells
                    const activeKillers = [...bloodWBCs, ...activeTissueWBCs].filter(w => w.subtype === 'nk' || w.subtype === 'tcell');
                    if (hasInfectedCells && activeKillers.length < 2) {
                        const killerSubtype = Math.random() < 0.6 ? 'nk' : 'tcell';
                        const killerName = killerSubtype === 'nk' ? '自然殺手 (NK) 細胞' : '毒殺型 T 細胞';
                        recruitCirculatingWbc(killerSubtype, `🟢 <strong>【自動免疫召募】偵測到細胞受病毒感染！</strong>自動派遣${killerName}趕往清除受感染宿主細胞！`);
                    }
                    // 2. Nematode parasites in tissue demand Eosinophils
                    else if (hasParasiteInTissue && [...bloodWBCs, ...activeTissueWBCs].filter(w => w.subtype === 'eosinophil').length < 3) {
                        recruitCirculatingWbc('eosinophil', "🔴 <strong>【自動免疫召募】偵測到大型線蟲侵入真皮層！</strong>自動召募嗜酸性球前往釋放毒性顆粒！");
                    }
                    // 3. Bacteria in tissue demand Phagocytes + Humoral B-cells
                    else if (hasBacteriaInTissue && [...bloodWBCs, ...activeTissueWBCs].filter(w => w.subtype === 'bcell').length < 2 && Math.random() < 0.35) {
                        recruitCirculatingWbc('bcell', "🟠 <strong>【自動免疫召募】偵測到真皮細菌感染！</strong>自動派遣 B 淋巴球分化為漿細胞，分泌專一性抗體調理標記！");
                    }
                    else if ((hasBacteriaInTissue || hasDebris) && [...bloodWBCs, ...activeTissueWBCs].filter(w => w.subtype === 'neutrophil' || w.subtype === 'monocyte' || w.subtype === 'macrophage').length < 4) {
                        const phagoSubtype = Math.random() < 0.65 ? 'neutrophil' : 'monocyte';
                        recruitCirculatingWbc(phagoSubtype, `⚪ <strong>【自動免疫召募】偵測到細菌與細胞殘骸！</strong>自動召募${phagoSubtype === 'neutrophil' ? '嗜中性球' : '單核巨噬細胞'}前往吞噬清創！`);
                    }
                    // 4. Free viruses in tissue demand B-cells for antibody neutralization
                    else if (hasFreeVirusesInTissue && [...bloodWBCs, ...activeTissueWBCs].filter(w => w.subtype === 'bcell').length < 2) {
                        recruitCirculatingWbc('bcell', "🟠 <strong>【自動免疫召募】偵測到游離病毒！</strong>自動派遣 B 淋巴球分泌抗體進行中和！");
                    }
                    // 5. General swelling surveillance
                    else if (isSwollen && (bloodWBCs.length + activeTissueWBCs.length) < 4) {
                        const pool = ['neutrophil', 'monocyte'];
                        recruitCirculatingWbc(pool[Math.floor(Math.random() * pool.length)]);
                    }
                }
            } else {
                autoWbcRecruitTimer = 0;
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

                // Dynamic Y position: strictly inside arteriole, branching smoothly at BRANCH_START_X into capillary
                const branchObj = BRANCH_MAP[wbc.branchId] || BRANCHES[0];
                const halfArt = arterioleWidth / 2;
                const halfCap = capillaryWidth / 2;
                const laneOff = wbc.laneOffset !== undefined ? wbc.laneOffset : 0;

                // Safe spread inside arteriole: strictly contained within arteriole walls
                const maxSpread = Math.max(2, halfArt - wbc.r - 2);
                const branchBias = wbc.branchId === 'top' ? -0.35 : (wbc.branchId === 'bot' ? 0.35 : 0);
                const startY = 65 + branchBias * maxSpread + laneOff * (maxSpread * 0.4);

                const endY = branchObj.targetY + laneOff * Math.max(0, halfCap - wbc.r - 1);

                let localY;
                if (wbc.x < BRANCH_START_X) {
                    localY = startY;
                } else if (wbc.x >= BRANCH_START_X && wbc.x < BRANCH_END_X) {
                    const t = (wbc.x - BRANCH_START_X) / (BRANCH_END_X - BRANCH_START_X);
                    const s = t * t * (3 - 2 * t);
                    localY = startY + (endY - startY) * s;
                } else {
                    localY = endY;
                }
                wbc.y = localY;
                const wbcGlobalY = 300 + localY;

                // Render patrolling spherical WBC in vessel
                renderPooledWbcSphere(wbc.x, wbcGlobalY, wbc.r, wbc.subtype, "1", "#fff", "1.2", 0, "");

            } else if (wbc.state === 'diapedesis') {
                // Amoeboid squeezing through vascular endothelial gap
                wbc.amoebaProgress += 0.013 * squeezeSpeed;
                const branchObj = BRANCH_MAP[wbc.branchId] || BRANCHES[0];
                const lumenY = 300 + branchObj.targetY;
                const tissueTargetY = 260;
                const currentY = lumenY - (lumenY - tissueTargetY) * wbc.amoebaProgress;

                renderPooledWbcAmoeba(wbc.x, currentY, wbc.r, wbc.amoebaProgress, wbc.subtype, 'diapedesis');

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

                renderPooledWbcAmoeba(wiggleX, currentY, wbc.r, wbc.amoebaProgress, wbc.subtype, 'wound_exit');

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
        const inTissueBacWbc = bacteria.filter(b => b.inTissue);
        const inTissueVirWbc = freeViruses.filter(v => v.inTissue);

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
                // Activated B cell / Plasma Cell (效應漿細胞持續分泌工廠)
                const inTissueBacteria = bacteria.filter(b => b.inTissue && b.state !== 'lymph_draining');
                const inTissueViruses = freeViruses.filter(v => v.inTissue && v.state !== 'lymph_draining');
                const pathogens = [...inTissueBacteria, ...inTissueViruses];

                // 1. Amoeboid Chemotaxis & Standoff Positioning
                if (pathogens.length > 0) {
                    let closestP = null;
                    let closestD = 9999;
                    for (let p of pathogens) {
                        const d = Math.hypot(p.x - w.x, p.y - w.y);
                        if (d < closestD) {
                            closestD = d;
                            closestP = p;
                        }
                    }

                    if (closestP) {
                        const dx = closestP.x - w.x;
                        const dy = closestP.y - w.y;
                        const idealDist = 65; // Optimal firing distance to spray antibodies into lesion

                        if (closestD > idealDist + 15) {
                            // Crawl towards the infection site
                            w.x += (dx / closestD) * 1.3 * simSpeed;
                            w.y += (dy / closestD) * 1.3 * simSpeed;
                        } else if (closestD < idealDist - 15) {
                            // Back up to maintain optimal standoff distance
                            w.x -= (dx / closestD) * 0.8 * simSpeed;
                            w.y -= (dy / closestD) * 0.8 * simSpeed;
                        } else {
                            // Gentle lateral orbit / micro-maneuver
                            w.x += (Math.random() - 0.5) * 0.6 * simSpeed;
                            w.y += (Math.random() - 0.5) * 0.6 * simSpeed;
                        }
                    }

                    // 2. Continuous Sustained Antibody Secretion (Plasma Cell Factory)
                    w.isPlasmaActive = true;
                    w.secreteCooldown = (w.secreteCooldown || 0) + 1;

                    // Continuous secretion: emits antibody every 16 frames as long as pathogens remain
                    if (w.secreteCooldown >= 16) {
                        w.secreteCooldown = 0;

                        // Target an un-opsonized pathogen if possible, aiming towards it with fan spread
                        const unopTargets = pathogens.filter(p => (p.abCount || 0) < 3);
                        const targetP = unopTargets.length > 0
                            ? unopTargets[Math.floor(Math.random() * unopTargets.length)]
                            : closestP;

                        const aimAngle = Math.atan2(targetP.y - w.y, targetP.x - w.x) + (Math.random() - 0.5) * 0.8;
                        const spd = 2.1 + Math.random() * 0.7;
                        const targetType = inTissueBacteria.includes(targetP) ? 'bacteria' : 'virus';

                        antibodies.push({
                            x: w.x,
                            y: w.y,
                            vx: Math.cos(aimAngle) * spd,
                            vy: Math.sin(aimAngle) * spd,
                            stage: 'tissue',
                            life: 520,
                            isSecondary: false,
                            targetType: targetType
                        });
                    }
                } else {
                    // No pathogens: resting memory surveillance patrol
                    w.isPlasmaActive = false;
                    w.x += (Math.random() - 0.5) * 0.7 * simSpeed;
                    w.y += (Math.random() - 0.5) * 0.6 * simSpeed;
                }

                // Volume repulsion between multiple B cells so they don't overlap
                for (let j = 0; j < activeTissueWBCs.length; j++) {
                    if (i !== j && activeTissueWBCs[j].subtype === 'bcell') {
                        const otherB = activeTissueWBCs[j];
                        const sepDx = w.x - otherB.x;
                        const sepDy = w.y - otherB.y;
                        const sepD = Math.hypot(sepDx, sepDy);
                        if (sepD < 32 && sepD > 0.01) {
                            w.x += (sepDx / sepD) * 0.7 * simSpeed;
                            w.y += (sepDy / sepD) * 0.7 * simSpeed;
                        }
                    }
                }

                // Dermis bounds confinement
                const dermisTop = getDermisTopY(w.x, swellingLevel) + 10;
                if (w.y < dermisTop) { w.y = dermisTop; }
                if (w.y > 275) { w.y = 275; }
                if (w.x < 130) { w.x = 130; }
                if (w.x > 840) { w.x = 840; }
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
            } else if (w.state === 'apc_migrating') {
                // APC Chemotaxis: Amoeboid crawling towards the dermal initial lymphatic capillary valve
                const targetX = w.targetLymphX || LYMPH_VESSEL_X;
                const targetY = w.targetLymphY || LYMPH_VESSEL_Y;
                const dx = targetX - w.x;
                const dy = targetY - w.y;
                const dist = Math.hypot(dx, dy);
                const baseSpeed = w.crawlSpeed || 2.1;
                const speed = baseSpeed * simSpeed;

                w.crawlPhase = (w.crawlPhase || 0) + 0.05 * simSpeed;
                const lateralWander = Math.sin(w.crawlPhase) * 0.4;

                if (dist > 3) {
                    w.x += (dx / dist) * speed;
                    w.y += (dy / dist) * speed + lateralWander * simSpeed;
                }

                // Volume repulsion: avoid overlapping with other migrating/draining APCs
                for (let j = 0; j < activeTissueWBCs.length; j++) {
                    if (i !== j) {
                        const other = activeTissueWBCs[j];
                        if (other.state === 'apc_migrating' || other.state === 'lymph_draining') {
                            const sepDx = w.x - other.x;
                            const sepDy = w.y - other.y;
                            const sepDist = Math.hypot(sepDx, sepDy);
                            const minDist = (w.r || 11.5) + (other.r || 11.5) + 4;
                            if (sepDist < minDist && sepDist > 0.01) {
                                const push = ((minDist - sepDist) / minDist) * 0.85 * simSpeed;
                                w.x += (sepDx / sepDist) * push;
                                w.y += (sepDy / sepDist) * push;
                            }
                        }
                    }
                }

                // Enter through the flap valve into lymphatic stream
                if (dist < 14 || w.x >= targetX) {
                    w.state = 'lymph_draining';
                    const agName = w.antigenType === 'bacteria' ? '細菌' : '病毒';
                    updateLog(`🧪 <strong>【抗原呈現細胞進入微淋巴管】</strong>APC 穿過微淋巴管瓣膜進入淋巴流，前往局部引流淋巴結！`);

                    // Trigger lymph node clonal expansion if not already running
                    if (!lymphNodeState.active) {
                        lymphNodeState.active = true;
                        lymphNodeState.antigenType = w.antigenType;
                        lymphNodeState.timer = 0;
                        if (statLymphPill) statLymphPill.style.display = 'inline-flex';
                    }
                }
            } else if (w.state === 'lymph_draining') {
                // Flowing inside initial lymphatic vessel towards downstream lymph node
                w.x += (w.flowSpeed || 2.0) * simSpeed;
                w.y += (LYMPH_VESSEL_Y - w.y) * 0.05 * simSpeed; // Center in lymphatic lumen
                w.alpha = (w.alpha !== undefined ? w.alpha : 1) - 0.018 * simSpeed;
                w.r = Math.max(3.5, w.r * 0.985); // Natural fluid entry scaling

                if (w.alpha <= 0.05 || w.x >= 995) {
                    activeTissueWBCs.splice(i, 1);
                    continue;
                }
            } else if (w.subtype === 'neutrophil' || w.subtype === 'macrophage') {
                let bestItem = null;
                let bestType = null;
                let bestWeightedDist = Infinity;

                for (let j = 0; j < inTissueBacWbc.length; j++) {
                    const b = inTissueBacWbc[j];
                    const dx = b.x - w.x, dy = b.y - w.y;
                    const d = Math.hypot(dx, dy) * 1.0;
                    if (d < bestWeightedDist) { bestWeightedDist = d; bestItem = b; bestType = 'bacteria'; }
                }
                for (let j = 0; j < inTissueVirWbc.length; j++) {
                    const v = inTissueVirWbc[j];
                    const dx = v.x - w.x, dy = v.y - w.y;
                    const d = Math.hypot(dx, dy) * 1.4;
                    if (d < bestWeightedDist) { bestWeightedDist = d; bestItem = v; bestType = 'virus'; }
                }
                const debrisPriority = w.subtype === 'macrophage' ? 0.8 : 2.5;
                for (let j = 0; j < cellDebris.length; j++) {
                    const dItem = cellDebris[j];
                    const dx = dItem.x - w.x, dy = dItem.y - w.y;
                    const d = Math.hypot(dx, dy) * debrisPriority;
                    if (d < bestWeightedDist) { bestWeightedDist = d; bestItem = dItem; bestType = 'debris'; }
                }

                if (bestItem) {
                    const dx = bestItem.x - w.x, dy = bestItem.y - w.y, dist = Math.hypot(dx, dy);
                    const speed = w.subtype === 'neutrophil' ? 1.8 : 1.4;
                    w.x += (dx / dist) * speed; w.y += (dy / dist) * speed;

                    if (dist < w.r + (bestItem.r || 5)) {
                        let eatenAntigen = null;
                        if (bestType === 'bacteria') {
                            const bIdx = bacteria.indexOf(bestItem);
                            if (bIdx !== -1) { bacteria.splice(bIdx, 1); eatenAntigen = 'bacteria'; }
                        } else if (bestType === 'virus') {
                            const vIdx = freeViruses.indexOf(bestItem);
                            if (vIdx !== -1) { freeViruses.splice(vIdx, 1); eatenAntigen = 'virus'; }
                        } else if (bestType === 'debris') {
                            const dIdx = cellDebris.indexOf(bestItem);
                            if (dIdx !== -1) {
                                cellDebris.splice(dIdx, 1);
                                eatenAntigen = viralEncounterOccurred ? 'virus' : (bacterialEncounterOccurred ? 'bacteria' : null);
                            }
                        }
                        w.eatenCount++;

                        // APC Activation: If primary infection (not vaccinated), load antigen and migrate to lymphatic capillary!
                        if (eatenAntigen && !vaccineState[eatenAntigen] && !lymphNodeState.active) {
                            triggerApcMigration(eatenAntigen, w.x, w.y);
                        }
                    }
                } else {
                    w.x += (Math.random() - 0.5) * 0.6; w.y += (Math.random() - 0.5) * 0.6;
                }

                if (w.subtype === 'neutrophil' && w.eatenCount >= w.maxEat) {
                    w.alpha -= 0.02;
                    if (w.alpha <= 0) { activeTissueWBCs.splice(i, 1); continue; }
                }
            }

            if (w.state === 'lymph_draining') {
                w.x = Math.max(860, Math.min(1005, w.x));
                w.y = Math.max(248, Math.min(288, w.y));
            } else {
                const dermisTop = getDermisTopY(w.x, swellingLevel);
                w.x = Math.max(40, Math.min(960, w.x));
                w.y = Math.max(dermisTop, Math.min(278, w.y));
            }

            if (w.tissueLife <= 0 && w.state !== 'lymph_draining') {
                w.alpha -= 0.02;
                if (w.alpha <= 0) { activeTissueWBCs.splice(i, 1); continue; }
            }

            const isLymph = w.state === 'apc_migrating' || w.state === 'lymph_draining';
            const strokeColor = w.state === 'lymph_draining' ? "#10b981" : (w.state === 'apc_migrating' ? "#34d399" : "#fff");
            let haloR = 0, haloStroke = "";
            if (isLymph) {
                haloR = w.r + 4.5;
                haloStroke = w.state === 'lymph_draining' ? "#10b981" : "#34d399";
            } else if (w.subtype === 'bcell' && w.isPlasmaActive) {
                haloR = w.r + 3.8 + Math.sin(simNowMs * 0.008 + w.x) * 1.8;
                haloStroke = "#fb923c";
            }

            renderPooledWbcSphere(w.x, w.y, w.r, w.subtype, (w.alpha || 1).toFixed(2), strokeColor, isLymph ? "2.2" : "1.5", haloR, haloStroke);

            let labelText;
            if (w.state === 'lymph_draining') {
                labelText = `🌊 淋巴回流 ➔ 淋巴結`;
            } else if (w.state === 'apc_migrating') {
                labelText = `🏷️ 呈現抗原 (MHC-II) ➔ 淋巴管`;
            } else {
                labelText = getWbcLabelText(w);
            }
            const labelBg = isLymph ? 'rgba(6, 78, 59, 0.95)' : getWbcLabelBg(w.subtype);
            const labelColor = isLymph ? '#a7f3d0' : '#fff';
            createSvgLabel(labelText, w.x, w.y - w.r - 8, labelBg, labelColor);
        }

        // ----------------------------------------------------
        // L. Intravascular RBCs & Platelet/Plasma Stream
        // ----------------------------------------------------
        const halfCap = capillaryWidth / 2;
        const halfArt = arterioleWidth / 2;

        bloodParticles.forEach(p => {
            let sectionSpeed = flowSpeed;
            if (p.x < BRANCH_START_X) {
                sectionSpeed = flowSpeed * (22 / arterioleWidth);
            } else if (p.x < BRANCH_END_X) {
                const t = (p.x - BRANCH_START_X) / (BRANCH_END_X - BRANCH_START_X);
                const artSp = flowSpeed * (22 / arterioleWidth);
                sectionSpeed = artSp + (flowSpeed - artSp) * t;
            }
            p.x += sectionSpeed;

            if (p.x > 1020) {
                p.x = -20;
                const bIds = ['top', 'mid', 'bot'];
                p.branchId = bIds[Math.floor(Math.random() * bIds.length)];
                p.laneOffset = (Math.random() - 0.5);
            }

            const targetBranchObj = BRANCH_MAP[p.branchId] || BRANCHES[1];
            const branchY = targetBranchObj.targetY;

            // Safe spread inside arteriole: strictly contained within arteriole boundaries (x < BRANCH_START_X)
            const maxSpread = Math.max(1, halfArt - p.r - 2);
            const branchBias = p.branchId === 'top' ? -0.38 : (p.branchId === 'bot' ? 0.38 : 0);
            const startY = 65 + branchBias * maxSpread + p.laneOffset * (maxSpread * 0.4);

            // Capillary target lane (x >= BRANCH_END_X)
            const endY = branchY + (capillaryWidth > 20 ? p.laneOffset * (halfCap - p.r) : p.laneOffset * Math.max(0, halfCap - p.r - 1.2));

            if (p.x < BRANCH_START_X) {
                p.y = startY;
            } else if (p.x >= BRANCH_START_X && p.x < BRANCH_END_X) {
                const t = (p.x - BRANCH_START_X) / (BRANCH_END_X - BRANCH_START_X);
                const s = t * t * (3 - 2 * t);
                p.y = startY + (endY - startY) * s;
            } else {
                p.y = endY;
            }

            p.el.setAttribute("cx", p.x.toFixed(1));
            if (Math.abs(p.y - (p.lastY || -999)) > 0.05) {
                p.el.setAttribute("cy", p.y.toFixed(1));
                p.lastY = p.y;
            }
        });

        // ----------------------------------------------------
        // M. Nerve Pain Pulses (Distributed Dermal Plexus)
        // ----------------------------------------------------
        if (activeEffects.has('pain')) {
            nervePainActiveLast = true;
            const isFlicker = Math.floor(simNowMs / 150) % 2 === 0;
            const nerveColor = isFlicker ? "#ff4d4f" : "#ffd43b";
            nerveTrunk.setAttribute("stroke", nerveColor);
            nerveBranches.forEach(b => b.setAttribute("stroke", nerveColor));
            nerveTerminals.forEach(t => {
                t.setAttribute("fill", "#ff4d4f");
                t.setAttribute("r", (5.5 + Math.sin(simNowMs / 80) * 1.5).toFixed(1));
            });

            pulses.forEach((p, idx) => {
                pulseProgress[idx] = (pulseProgress[idx] + 0.018) % 1;
                const prog = pulseProgress[idx];
                p.setAttribute("opacity", "0.95");
                const pt = getNervePulseCoord(idx, prog);
                p.setAttribute("cx", pt.x.toFixed(1));
                p.setAttribute("cy", pt.y.toFixed(1));
            });
        } else if (nervePainActiveLast) {
            nervePainActiveLast = false;
            nerveTrunk.setAttribute("stroke", "#ffd43b");
            nerveBranches.forEach(b => b.setAttribute("stroke", "#ffd43b"));
            nerveTerminals.forEach(t => {
                t.setAttribute("fill", "#ffd43b");
                t.setAttribute("r", "4");
            });
            pulses.forEach(p => p.setAttribute("opacity", "0"));
        }

        // Primary Infection Clearance Notification (Preserving presenter's toggle state)
        if (bacterialEncounterOccurred && !vaccineState.bacteria) {
            const activeTissueBac = bacteria.filter(b => b.inTissue).length;
            if (activeTissueBac === 0) {
                bacterialEncounterOccurred = false;
                updateLog("ℹ️ <strong>【初次細菌感染已被白血球吞噬清除！】</strong>創面平息。若欲向學生示範二次免疫應答，請手動開啟【細菌免疫記憶】Toggle開關！");
            }
        }

        if (viralEncounterOccurred && !vaccineState.virus) {
            const activeTissueVir = freeViruses.filter(v => v.inTissue).length;
            const infectedCells = tissueSites.filter(c => c.state === 'infected').length;
            if (activeTissueVir === 0 && infectedCells === 0) {
                viralEncounterOccurred = false;
                updateLog("ℹ️ <strong>【初次病毒感染已完全平息！】</strong>若欲向學生示範二次免疫應答，請手動開啟【病毒免疫記憶】Toggle開關！");
            }
        }

        // ----------------------------------------------------
        // N. Real-time Status Board & Pool Finalization
        // ----------------------------------------------------
        finalizeAllSvgPools();
        updateStats();
    }

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
            case 'bcell': return w.isPlasmaActive ? "漿細胞(分泌抗體中)" : "記憶B細胞(巡邏)";
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
        if (!stageStatusContainer) return;
        if (activeEffects.size === 0) {
            stageStatusContainer.style.display = "none";
            stageTitle.textContent = "";
            stageDesc.textContent = "";
            return;
        }

        stageStatusContainer.style.display = "block";
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

    const toggleMemoryBacteria = document.getElementById('toggle-memory-bacteria');
    const toggleMemoryVirus = document.getElementById('toggle-memory-virus');

    if (toggleMemoryBacteria) {
        toggleMemoryBacteria.addEventListener('change', (e) => {
            vaccineState.bacteria = e.target.checked;
            updateVaccineUI();
            if (vaccineState.bacteria) {
                updateLog("💉 <strong>【已開啟細菌免疫記憶 (二次應答)】</strong>專一性抗體巡邏啟動！抗體由小動脈注入微血管網，遇細菌將迅速調理結合！");
                for (let k = 0; k < 10; k++) {
                    antibodies.push({
                        x: -10 - k * 18,
                        y: 365 + (Math.random() - 0.5) * 14,
                        laneOffset: (Math.random() - 0.5),
                        speed: 4.0 + Math.random() * 1.2,
                        targetExtravasateX: 240 + Math.random() * 500,
                        stage: 'circulation',
                        life: 500,
                        isSecondary: true
                    });
                }
            } else {
                updateLog("⚪ <strong>【已關閉細菌免疫記憶】維持初次應答狀態。</strong>血管中不再自動釋放抗體，便於課堂講解初次先天性防線。");
                // Remove circulating secondary antibodies so they do not disturb lecturing
                antibodies = antibodies.filter(a => a.stage === 'bound' || !a.isSecondary);
            }
            updateStats();
        });
    }

    if (toggleMemoryVirus) {
        toggleMemoryVirus.addEventListener('change', (e) => {
            vaccineState.virus = e.target.checked;
            updateVaccineUI();
            if (vaccineState.virus) {
                updateLog("💉 <strong>【已開啟病毒免疫記憶 (二次應答)】</strong>專一性中和抗體就緒！正從小動脈注入微血管隨時防截游離病毒！");
                for (let k = 0; k < 10; k++) {
                    antibodies.push({
                        x: -10 - k * 18,
                        y: 365 + (Math.random() - 0.5) * 14,
                        laneOffset: (Math.random() - 0.5),
                        speed: 4.0 + Math.random() * 1.2,
                        targetExtravasateX: 240 + Math.random() * 500,
                        stage: 'circulation',
                        life: 500,
                        isSecondary: true
                    });
                }
            } else {
                updateLog("⚪ <strong>【已關閉病毒免疫記憶】維持初次應答狀態。</strong>血管中不再自動釋放中和抗體。");
                antibodies = antibodies.filter(a => a.stage === 'bound' || !a.isSecondary);
            }
            updateStats();
        });
    }

    document.getElementById('btn-spawn-neutro').addEventListener('click', () => spawnNeutrophil());
    document.getElementById('btn-spawn-mono').addEventListener('click', () => spawnMonocyte());
    document.getElementById('btn-spawn-eosino').addEventListener('click', () => spawnEosinophil());
    document.getElementById('btn-spawn-baso').addEventListener('click', () => spawnBasophil());
    document.getElementById('btn-spawn-bcell').addEventListener('click', () => spawnBCell());
    document.getElementById('btn-spawn-tcell').addEventListener('click', () => spawnKillerCell());

    if (toggleAutoWbcCheckbox) {
        toggleAutoWbcCheckbox.addEventListener('change', () => {
            if (toggleAutoWbcCheckbox.checked) {
                updateLog("🛡️ <strong>【已開啟自動召募白血球】</strong>免疫監控系統啟動，將依據病原體威脅自動派遣專一性白血球（病毒➔NK/T細胞、寄生蟲➔嗜酸性球、細菌➔嗜中性/巨噬細胞）！");
            } else {
                updateLog("⏸️ <strong>【已關閉自動召募白血球】</strong>恢復手動控制，白血球僅在點擊按鈕時出動。");
            }
        });
    }

    if (toggleDimNerveCheckbox && nerveNetworkGroup) {
        toggleDimNerveCheckbox.addEventListener('change', () => {
            updateNerveDimming();
        });
    }

    if (toggleLabelsCheckbox) {
        toggleLabelsCheckbox.addEventListener('change', () => {
            const anatomyGroup = document.getElementById('anatomy-annotations');
            if (anatomyGroup) anatomyGroup.style.display = toggleLabelsCheckbox.checked ? '' : 'none';
        });
    }

    if (toggleFluidCheckbox) {
        toggleFluidCheckbox.addEventListener('change', () => {
            fluidCirculationEnabled = toggleFluidCheckbox.checked;
            if (labelToggleFluid) labelToggleFluid.classList.toggle('active', fluidCirculationEnabled);
            if (fluidCirculationEnabled) {
                initFluidTankDroplets();
                tissueBg.classList.add('fluid-active');
                if (collagenFibersGroup) collagenFibersGroup.classList.add('fluid-active');
                updateNerveDimming();
                updateLog("💧 <strong>【已開啟組織液與淋巴循環】</strong>血漿經微血管<strong>內皮細胞間隙（Intercellular Clefts）</strong>濾出為組織液，漫流浸潤並滋養周圍細胞，多餘組織液經微淋巴管盲端單向瓣膜溢流回收為淋巴液！");
            } else {
                fluidDroplets = [];
                tissueBg.classList.remove('fluid-active');
                if (collagenFibersGroup) collagenFibersGroup.classList.remove('fluid-active');
                updateNerveDimming();
                updateLog("⏸️ <strong>【已關閉組織液與淋巴循環視圖】</strong>隱藏組織液與微粒，方便專注觀察發炎與免疫細胞反應。");
            }
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
        if (toggleAutoWbcCheckbox) toggleAutoWbcCheckbox.checked = false;
        if (toggleLabelsCheckbox) toggleLabelsCheckbox.checked = false;
        if (toggleFluidCheckbox) toggleFluidCheckbox.checked = false;
        if (labelToggleFluid) labelToggleFluid.classList.remove('active');
        fluidCirculationEnabled = false;
        tissueBg.classList.remove('fluid-active');
        if (collagenFibersGroup) collagenFibersGroup.classList.remove('fluid-active');
        updateNerveDimming();
        const anatomyGroup = document.getElementById('anatomy-annotations');
        if (anatomyGroup) anatomyGroup.style.display = 'none';
        fluidDroplets = [];
        vaccineState = { bacteria: false, virus: false };
        immuneSurveillanceTimer = 0;
        lymphNodeState = { active: false, antigenType: null, timer: 0, duration: 200 };
        if (statLymphPill) statLymphPill.style.display = 'none';
        bacterialEncounterOccurred = false;
        viralEncounterOccurred = false;
        if (scabPathEl) scabPathEl.style.display = 'none';
        if (fibrinMeshBuilt) fibrinMeshLayer.style.display = 'none';
        if (plateletPlugBuilt) plateletPlugLayer.style.display = 'none';
        if (exposedCollagenPathEl) exposedCollagenPathEl.style.display = 'none';
        resetAllSvgPools();
        finalizeAllSvgPools();
        updateVaccineUI();
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
    updateVaccineUI();
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
        getDermisTopY: getDermisTopY,
        getVaccineState: () => vaccineState,
        getFluidCirculationState: () => ({ enabled: fluidCirculationEnabled, droplets: fluidDroplets })
    };
});

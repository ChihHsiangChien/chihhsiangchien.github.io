document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('inflammation-viz');
    const viewportGroup = document.getElementById('viewport-group');
    const vizContainer = document.getElementById('viz-container');

    const vesselGroup = document.getElementById('vessel-group');
    const vesselLumensGroup = document.getElementById('vessel-lumens-group');
    const smoothMuscleLayer = document.getElementById('smooth-muscle-layer');
    const precapillarySphincters = document.getElementById('precapillary-sphincters');
    const endotheliumLayer = document.getElementById('endothelium-layer');
    const arterioleWallTop = document.getElementById('arteriole-wall-top');
    const arterioleWallBottom = document.getElementById('arteriole-wall-bottom');

    const bloodCellsGroup = document.getElementById('blood-cells');
    const extravasatedLayer = document.getElementById('extravasated-layer');
    const injurySite = document.getElementById('injury-site');
    const swellingOverlay = document.getElementById('swelling-overlay');
    const skinSurface = document.getElementById('skin-surface');
    const basementMembrane = document.getElementById('basement-membrane');
    const tissueBg = document.getElementById('tissue-bg');

    // Multilayer Epidermis Groups
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
        document.getElementById('pulse-3')
    ];

    const stageTitle = document.getElementById('stage-title');
    const stageDesc = document.getElementById('stage-desc');
    const mechanismDesc = document.getElementById('mechanism-desc');
    const buttons = document.querySelectorAll('.toggle-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    // ==========================================
    // 1. Pan & Zoom Controller
    // ==========================================
    let panX = 0;
    let panY = 0;
    let scale = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
        viewportGroup.setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${panX} ${panY})`);
    }

    vizContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.zoom-controls') || e.target.closest('.stage-btn')) return;
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        vizContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            vizContainer.style.cursor = 'grab';
        }
    });

    vizContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.12;
        const rect = svg.getBoundingClientRect();
        const mouseSvgX = ((e.clientX - rect.left) / rect.width) * 1000;
        const mouseSvgY = ((e.clientY - rect.top) / rect.height) * 500;

        let newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
        newScale = Math.min(Math.max(0.65, newScale), 4.5);

        panX = mouseSvgX - (mouseSvgX - panX) * (newScale / scale);
        panY = mouseSvgY - (mouseSvgY - panY) * (newScale / scale);
        scale = newScale;
        updateTransform();
    }, { passive: false });

    // Touch Support
    let initialTouchDist = 0;
    let initialTouchScale = 1;
    vizContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            initialTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialTouchScale = scale;
        }
    });

    vizContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            updateTransform();
        } else if (e.touches.length === 2) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            scale = Math.min(Math.max(0.65, initialTouchScale * (currentDist / initialTouchDist)), 4.5);
            updateTransform();
        }
    });

    vizContainer.addEventListener('touchend', () => { isDragging = false; });

    zoomInBtn.addEventListener('click', () => {
        scale = Math.min(4.5, scale * 1.25);
        updateTransform();
    });

    zoomOutBtn.addEventListener('click', () => {
        scale = Math.max(0.65, scale / 1.25);
        updateTransform();
    });

    zoomResetBtn.addEventListener('click', () => {
        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
    });

    // ==========================================
    // 2. Microcirculation Architecture
    // 3 Capillaries: Top (y=20, near injury), Mid (y=65), Bot (y=110)
    // ==========================================
    const BRANCHES = [
        { id: 'top', targetY: 20, isNearInjury: true },
        { id: 'mid', targetY: 65, isNearInjury: false },
        { id: 'bot', targetY: 110, isNearInjury: false }
    ];

    let arterioleWidth = 56;
    let targetArterioleWidth = 56;
    let capillaryWidth = 16;       // Tight capillary (single file: 16px)
    let targetCapillaryWidth = 16; // Dilated capillary (26px)
    let sphincterTone = 1.0;       // 1.0 (high tone) -> 0.15 (relaxed)
    let targetSphincterTone = 1.0;
    let flowSpeed = 2.2;
    let targetFlowSpeed = 2.2;
    let gapSize = 0.5;
    let targetGapSize = 0.5;
    let swellingLevel = 0;

    let bloodParticles = [];
    let extravasatedParticles = [];
    let smoothMuscles = [];
    let sphincterElements = [];
    let branchEndoCells = [];
    let branchLumenPaths = [];
    let arterioleLumenPath = null;
    let animationId;

    const activeEffects = new Set();
    let pulseProgress = [0, 0.33, 0.66];

    // ==========================================
    // 3. Build Anatomical Myelin Sheaths
    // ==========================================
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

    // ==========================================
    // 4. Build Multilayer Epidermis
    // ==========================================
    const epidermisCells = [];
    function buildEpidermis() {
        stratumCorneum.innerHTML = '';
        stratumSpinosum.innerHTML = '';
        stratumBasale.innerHTML = '';
        epidermisCells.length = 0;

        for (let x = 0; x < 1000; x += 36) {
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

        for (let x = 8; x < 1000; x += 22) {
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

        for (let x = 6; x < 1000; x += 16) {
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
    }

    // ==========================================
    // 5. Build Upstream Arteriole Smooth Muscle (VSMC)
    // ==========================================
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

    // ==========================================
    // 6. Build Branching Capillary Beds (3 Parallel Capillaries)
    // ==========================================
    function buildBranchingVessels() {
        vesselLumensGroup.innerHTML = '';
        precapillarySphincters.innerHTML = '';
        endotheliumLayer.innerHTML = '';
        branchEndoCells = [];
        sphincterElements = [];
        branchLumenPaths = [];

        // 1. Upstream Arteriole Lumen Path
        arterioleLumenPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arterioleLumenPath.setAttribute("fill", "#3a0404");
        vesselLumensGroup.appendChild(arterioleLumenPath);

        // 2. Build Each Capillary Branch (Lumen, Sphincter Ring, Endothelial Walls)
        BRANCHES.forEach(branch => {
            // Branch Lumen Path
            const bPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bPath.setAttribute("fill", "#3a0404");
            vesselLumensGroup.appendChild(bPath);
            branchLumenPaths.push({ branch: branch, pathEl: bPath });

            // Precapillary Sphincter Ring (x ~ 160)
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

            // Endothelial Cells along this branch (x: 180 to 1000)
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

            branchEndoCells.push({
                branch: branch,
                topCells: topCells,
                botCells: botCells
            });
        });
    }

    function createBranchEndoCell(index, side, baseX, span) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const cell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        cell.setAttribute("height", 8);
        cell.setAttribute("rx", 3.5);
        cell.setAttribute("fill", "#e05260");
        cell.setAttribute("stroke", "#ff8787");
        cell.setAttribute("stroke-width", "0.8");
        cell.setAttribute("opacity", "0.95");

        const nucleus = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        nucleus.setAttribute("rx", 4.2);
        nucleus.setAttribute("ry", 2.2);
        nucleus.setAttribute("fill", "#8a0c1b");

        g.appendChild(cell);
        g.appendChild(nucleus);

        return {
            el: g,
            cellEl: cell,
            nucleusEl: nucleus,
            index: index,
            side: side,
            baseX: baseX,
            span: span
        };
    }

    // ==========================================
    // 7. Blood Cells Stream Initialization
    // Multi-branch circulation: Cells flow in arteriole, divide into 3 capillary branches
    // ==========================================
    function initBloodParticles() {
        bloodCellsGroup.innerHTML = '';
        bloodParticles = [];

        // Distribute cells across the 3 capillary branches
        const branchIds = ['top', 'mid', 'bot'];

        // RBCs (單行通過微血管)
        const totalRBC = 45;
        for (let i = 0; i < totalRBC; i++) {
            const assignedBranch = branchIds[i % 3];
            createBloodCell('rbc', (i / totalRBC) * 1020, assignedBranch);
        }

        // WBCs (滾動與遊出)
        for (let i = 0; i < 9; i++) {
            const assignedBranch = branchIds[i % 3];
            createBloodCell('wbc', (i / 9) * 1000 + 30, assignedBranch);
        }

        // Plasma droplets
        for (let i = 0; i < 30; i++) {
            const assignedBranch = branchIds[i % 3];
            createBloodCell('plasma', Math.random() * 1000, assignedBranch);
        }
    }

    function createBloodCell(type, initialX, branchId) {
        const cell = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let r, fill, opacity;

        if (type === 'rbc') {
            r = 4.8; // Realistic size relative to 16px capillary lumen (single file)
            fill = "#ff6b6b";
            opacity = 0.9;
        } else if (type === 'wbc') {
            r = 6.2;
            fill = "#f8f9fa";
            opacity = 0.95;
            cell.setAttribute("stroke", "#ced4da");
            cell.setAttribute("stroke-width", "1.1");
        } else if (type === 'plasma') {
            r = 2.0;
            fill = "#ffd43b";
            opacity = 0.7;
        }

        cell.setAttribute("r", r);
        cell.setAttribute("fill", fill);
        cell.setAttribute("opacity", opacity);

        bloodCellsGroup.appendChild(cell);

        bloodParticles.push({
            el: cell,
            type: type,
            x: initialX,
            y: 65,
            r: r,
            branchId: branchId,
            laneOffset: (Math.random() - 0.5)
        });
    }

    function spawnExtravasated(type, startX, startY) {
        if (extravasatedParticles.length > 150) {
            const old = extravasatedParticles.shift();
            if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
        }

        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let r, fill, opacity;
        if (type === 'plasma') {
            r = 1.8 + Math.random() * 1.4;
            fill = "#ffd43b";
            opacity = 0.8;
        } else {
            r = 6.5;
            fill = "#f8f9fa";
            opacity = 0.95;
            el.setAttribute("stroke", "#ff8787");
            el.setAttribute("stroke-width", "1.4");
        }

        el.setAttribute("r", r);
        el.setAttribute("fill", fill);
        el.setAttribute("opacity", opacity);
        el.setAttribute("cx", startX);
        el.setAttribute("cy", startY);

        extravasatedLayer.appendChild(el);

        extravasatedParticles.push({
            el: el,
            type: type,
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 1.1,
            vy: -(0.6 + Math.random() * 1.3),
            life: 0,
            maxLife: type === 'plasma' ? 340 : 650
        });
    }

    // ==========================================
    // 8. Dynamic Geometry Updates (Arteriole + 3 Capillaries)
    // ==========================================
    function updateLumenGeometry() {
        const halfArt = arterioleWidth / 2;
        const artCenterY = 65; // Arteriole main axis aligns with mid branch
        const artTopY = artCenterY - halfArt;
        const artBotY = artCenterY + halfArt;

        // 1. Upstream Arteriole Path (0 to 140)
        arterioleLumenPath.setAttribute("d", `M 0 ${artTopY} L 140 ${artTopY} L 140 ${artBotY} L 0 ${artBotY} Z`);
        arterioleWallTop.setAttribute("y", artTopY - 7);
        arterioleWallBottom.setAttribute("y", artBotY);

        // Smooth Muscle Wrapping
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

        // 2. Update Branch Lumens, Sphincter Rings & Endothelial Cells
        const halfCap = capillaryWidth / 2;
        const sphincterThickness = 6 + sphincterTone * 8;

        branchLumenPaths.forEach((item, idx) => {
            const b = item.branch;
            const bTopY = b.targetY - halfCap;
            const bBotY = b.targetY + halfCap;

            // Transition funnel from arteriole (x=140) to branch (x=175) -> capillary run (to x=1000)
            const pathData = `
                M 140 ${b.targetY < 65 ? artTopY : (b.targetY === 65 ? artCenterY - 10 : artCenterY + 10)}
                C 155 ${b.targetY < 65 ? artTopY : artCenterY}, 160 ${bTopY}, 175 ${bTopY}
                L 1000 ${bTopY}
                L 1000 ${bBotY}
                L 175 ${bBotY}
                C 160 ${bBotY}, 155 ${b.targetY > 65 ? artBotY : artCenterY}, 140 ${b.targetY > 65 ? artBotY : (b.targetY === 65 ? artCenterY + 10 : artCenterY - 10)}
                Z
            `;
            item.pathEl.setAttribute("d", pathData);

            // Sphincter rings at entry
            const sph = sphincterElements[idx];
            sph.top.setAttribute("y", bTopY - sphincterThickness - 1);
            sph.top.setAttribute("height", sphincterThickness);
            sph.bot.setAttribute("y", bBotY + 1);
            sph.bot.setAttribute("height", sphincterThickness);
            const sphColor = sphincterTone > 0.6 ? "#c92a2a" : "#f06595";
            sph.top.setAttribute("fill", sphColor);
            sph.bot.setAttribute("fill", sphColor);

            // Endothelial Cells
            const endo = branchEndoCells[idx];
            const cellWidth = Math.max(22, 33 - gapSize);

            endo.topCells.forEach(c => {
                const distFromInjury = Math.abs(c.baseX - 540);
                // Top capillary is right under the injury -> gap expansion is most prominent
                const isLocalInflamed = b.isNearInjury && distFromInjury < 240;
                const localGap = isLocalInflamed ? gapSize : Math.max(0.5, gapSize * 0.2);
                const x = c.baseX + (c.baseX < 540 ? -localGap * 1.3 : localGap * 1.3);

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
    // 9. Main Animation Loop
    // ==========================================
    function animate() {
        arterioleWidth += (targetArterioleWidth - arterioleWidth) * 0.05;
        capillaryWidth += (targetCapillaryWidth - capillaryWidth) * 0.05;
        sphincterTone += (targetSphincterTone - sphincterTone) * 0.05;
        flowSpeed += (targetFlowSpeed - flowSpeed) * 0.05;
        gapSize += (targetGapSize - gapSize) * 0.05;

        const targetSwelling = activeEffects.has('swelling') ? 1 : 0;
        swellingLevel += (targetSwelling - swellingLevel) * 0.05;

        updateLumenGeometry();

        // Epidermis and Surface Bulge (Quadratic Bezier Q 540 junctionBulgeY)
        const maxBulge = swellingLevel * 38;
        const junctionBulgeY = 55 - maxBulge;
        const topBulgeY = 2 - maxBulge;

        epidermisCells.forEach(cell => {
            const t = Math.max(0, Math.min(1, cell.posX / 1000));
            const factor = 4 * t * (1 - t);
            const yOffset = -maxBulge * factor;

            if (cell.type === 'rect') {
                cell.el.setAttribute('y', cell.origY + yOffset);
            } else {
                cell.el.setAttribute('transform', `translate(0, ${yOffset})`);
            }
        });

        skinSurface.setAttribute("d", `M 0 2 Q 540 ${topBulgeY} 1000 2`);

        const junctionCurve = `M 0 55 Q 540 ${junctionBulgeY} 1000 55`;
        if (basementMembrane) {
            basementMembrane.setAttribute("d", junctionCurve);
        }

        tissueBg.setAttribute("d", `${junctionCurve} L 1000 300 L 0 300 Z`);
        swellingOverlay.setAttribute("d", `${junctionCurve} L 1000 300 L 0 300 Z`);
        swellingOverlay.setAttribute("opacity", swellingLevel * 0.42);

        // Blood Cells Flow through Branching Network
        const halfCap = capillaryWidth / 2;
        const halfArt = arterioleWidth / 2;

        bloodParticles.forEach(p => {
            let sectionSpeed = flowSpeed;
            if (p.x < 140) {
                // Slower in wide arteriole
                sectionSpeed = flowSpeed * (22 / arterioleWidth);
            } else {
                sectionSpeed = flowSpeed * (p.type === 'wbc' ? 0.65 : 1.0);
            }

            p.x += sectionSpeed;
            if (p.x > 1020) {
                p.x = -20;
                // Switch branch randomly upon cycle for dynamic distribution
                const bIds = ['top', 'mid', 'bot'];
                p.branchId = bIds[Math.floor(Math.random() * bIds.length)];
                p.laneOffset = (Math.random() - 0.5);
            }

            const targetBranchObj = BRANCHES.find(b => b.id === p.branchId) || BRANCHES[1];
            const branchY = targetBranchObj.targetY;

            if (p.x < 140) {
                // In main arteriole stem (y center: 65)
                const maxSpread = halfArt - p.r - 2;
                p.y = 65 + p.laneOffset * (maxSpread * 1.6);
            } else if (p.x >= 140 && p.x < 180) {
                // Transition funnel into target branch
                const t = (p.x - 140) / 40;
                const startY = 65 + p.laneOffset * (halfArt - p.r - 2);
                const endY = branchY + (capillaryWidth > 20 ? p.laneOffset * (halfCap - p.r) : 0);
                p.y = startY + (endY - startY) * t;
            } else {
                // In Capillary: SINGLE FILE in narrow capillary (width <= 20)
                if (capillaryWidth <= 20) {
                    p.y = branchY; // Exact single file
                } else {
                    p.y = branchY + (halfCap - p.r - 1.2) * p.laneOffset;
                }
            }

            p.el.setAttribute("cx", p.x);
            p.el.setAttribute("cy", p.y);
        });

        // Extravasation & Diapedesis (Mainly from top capillary branch closest to injury)
        if (activeEffects.has('swelling')) {
            if (Math.random() < 0.45) {
                const leakX = 400 + Math.random() * 260;
                // Top capillary branch is at y=20 (translated y=300 -> global y ~ 320 - halfCap)
                const leakStartY = 300 + (20 - halfCap) - 2;
                spawnExtravasated('plasma', leakX, leakStartY);
            }

            if (Math.random() < 0.035) {
                const leakX = 520 + (Math.random() * 50 - 25);
                const leakStartY = 300 + (20 - halfCap) - 2;
                spawnExtravasated('wbc', leakX, leakStartY);
            }
        }

        // Interstitial fluid updates
        for (let i = extravasatedParticles.length - 1; i >= 0; i--) {
            const p = extravasatedParticles[i];
            p.life++;

            if (p.type === 'plasma') {
                p.x += p.vx + (Math.random() - 0.5) * 0.8;
                p.y += p.vy;

                if (p.y < junctionBulgeY + 15) {
                    p.vy = 0;
                    p.vx = (Math.random() - 0.5) * 1.5;
                }

                const remaining = (p.maxLife - p.life) / p.maxLife;
                p.el.setAttribute("opacity", Math.max(0.12, remaining * 0.75));
            } else if (p.type === 'wbc') {
                const dx = 540 - p.x;
                const dy = 95 - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 15) {
                    p.x += (dx / dist) * 1.1;
                    p.y += (dy / dist) * 1.1;
                } else {
                    p.x += (Math.random() - 0.5) * 1.2;
                    p.y += (Math.random() - 0.5) * 1.2;
                }
            }

            p.el.setAttribute("cx", p.x);
            p.el.setAttribute("cy", p.y);

            if (p.life > p.maxLife) {
                if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
                extravasatedParticles.splice(i, 1);
            }
        }

        // Nerve
        if (activeEffects.has('pain')) {
            const isFlicker = Math.floor(Date.now() / 150) % 2 === 0;
            const nerveColor = isFlicker ? "#ff4d4f" : "#ffd43b";

            nerveTrunk.setAttribute("stroke", nerveColor);
            nerveBranches.forEach(b => b.setAttribute("stroke", nerveColor));
            nerveTerminals.forEach(t => {
                t.setAttribute("fill", "#ff4d4f");
                t.setAttribute("r", 5.5 + Math.sin(Date.now() / 80) * 1.5);
            });

            pulses.forEach((p, idx) => {
                pulseProgress[idx] = (pulseProgress[idx] + 0.02) % 1;
                const prog = pulseProgress[idx];
                p.setAttribute("opacity", "0.95");

                let px, py;
                if (prog < 0.35) {
                    const t = prog / 0.35;
                    px = 530 + (410 - 530) * t;
                    py = 110 + (190 - 110) * t;
                } else {
                    const t = (prog - 0.35) / 0.65;
                    px = 410 + (-10 - 410) * t;
                    py = 190 + (220 - 190) * t;
                }
                p.setAttribute("cx", px);
                p.setAttribute("cy", py);
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

        animationId = requestAnimationFrame(animate);
    }

    // ==========================================
    // 10. Update Physiological State on Toggles
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
            if (!activeEffects.has('swelling')) {
                newTargetGap = Math.max(newTargetGap, 5);
            }
        }

        targetArterioleWidth = newTargetArtWidth;
        targetCapillaryWidth = newTargetCapWidth;
        targetSphincterTone = newSphincterTone;
        targetFlowSpeed = newFlowSpeed;
        targetGapSize = newTargetGap;

        injurySite.style.transition = "opacity 0.6s ease";
        injurySite.setAttribute("opacity", activeEffects.size > 0 ? 1 : 0);

        const lumenColor = (activeEffects.has('red') || activeEffects.has('heat')) ? "#660000" : "#3a0404";
        if (arterioleLumenPath) {
            arterioleLumenPath.style.transition = "fill 0.5s ease";
            arterioleLumenPath.setAttribute("fill", lumenColor);
        }
        branchLumenPaths.forEach(item => {
            item.pathEl.style.transition = "fill 0.5s ease";
            item.pathEl.setAttribute("fill", lumenColor);
        });

        updateText();
    }

    function updateText() {
        if (activeEffects.size === 0) {
            stageTitle.textContent = "正常恆定狀態 (Homeostasis)";
            stageDesc.textContent = "前毛細小動脈平滑肌維持正常張力，前毛細括約肌收縮調節，分支微血管腔狹窄，紅血球排成單行依序通過，組織液動態平衡。";
            mechanismDesc.innerHTML = "<p><strong>微循環生理網：</strong>小動脈分支出多條微血管網，各微血管分支入口具備前毛細括約肌 (Precapillary Sphincter)，微血管管徑僅約 7–8 µm，血球呈單行通過。</p>";
            return;
        }

        const titles = [];
        const descs = [];
        const mechs = [];

        if (activeEffects.has('red')) {
            titles.push("紅 (Rubor)");
            descs.push("小動脈平滑肌與多條微血管括約肌全面舒張，微血管網充血開放。");
            mechs.push("<strong>微血管網全面開放與充血：</strong>組織胺與 NO 促使小動脈平滑肌及各分支前毛細括約肌 (Precapillary Sphincters) 舒張，平時關閉的微血管分支全面開放，血流灌注量成倍增加。");
        }
        if (activeEffects.has('heat')) {
            titles.push("熱 (Calor)");
            descs.push("多條微血管動脈血高速灌流，帶來深層體溫。");
            mechs.push("<strong>多分支高速微循環灌流：</strong>大量高溫的動脈血同時湧入多條微血管床，加快局部物質與熱量交換，局部體表溫度明顯上升。");
        }
        if (activeEffects.has('swelling')) {
            titles.push("腫 (Tumor)");
            descs.push("微血管內皮細胞間隙拉開，大量血漿外滲成組織水腫。");
            mechs.push("<strong>血管通透性增加 (Permeability)：</strong>內皮細胞受發炎化學介質刺激收縮，內皮細胞間隙擴大，血漿大量從微血管外滲至真皮間質，造成組織腫脹，並伴隨白血球遊出 (Diapedesis)。");
        }
        if (activeEffects.has('pain')) {
            titles.push("痛 (Dolor)");
            descs.push("水腫組織張力壓迫神經末梢，痛覺電位回傳。");
            mechs.push("<strong>痛覺感受器 (Nociceptor) 活化：</strong>組織水腫產生的機械壓力壓迫游離神經末梢，配合緩激肽 (Bradykinin) 及前列腺素 (PGE2) 化學刺激，引發動作電位沿軸突回傳至中樞神經。");
        }

        stageTitle.textContent = titles.join(" + ");
        stageDesc.textContent = descs.join(" ");
        mechanismDesc.innerHTML = `<ul style="padding-left: 20px; line-height: 1.6;">${mechs.map(m => `<li>${m}</li>`).join("")}</ul>`;
    }

    // ==========================================
    // 11. Bind UI Controls
    // ==========================================
    buttons.forEach(btn => {
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

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            activeEffects.clear();
            buttons.forEach(btn => btn.classList.remove('active'));
            extravasatedLayer.innerHTML = '';
            extravasatedParticles = [];
            updateVisualization();
        });
    }

    buildEpidermis();
    buildMyelin();
    buildSmoothMuscle();
    buildBranchingVessels();
    initBloodParticles();
    updateVisualization();
    animate();
});

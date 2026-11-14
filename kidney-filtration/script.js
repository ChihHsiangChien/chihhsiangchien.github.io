document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('nephron-svg');
    const viewportGroup = document.getElementById('viewport-group');
    const zoneLayer = document.getElementById('zone-layer');
    const structureLayer = document.getElementById('structure-layer');
    const fxLayer = document.getElementById('fx-layer');
    const particleLayer = document.getElementById('particle-layer');
    const trackerLayer = document.getElementById('tracker-layer');
    const labelLayer = document.getElementById('label-layer');

    // UI Controls
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');
    const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
    const toggleFxBtn = document.getElementById('toggleFxBtn');
    const toggleAllMoleculesBtn = document.getElementById('toggleAllMoleculesBtn');
    const acidosisBtn = document.getElementById('acidosisBtn');
    const hyperglycemiaBtn = document.getElementById('hyperglycemiaBtn');
    const proteinuriaBtn = document.getElementById('proteinuriaBtn');
    const adhBtn = document.getElementById('adhBtn');
    const infoText = document.getElementById('info-text');

    // Single Molecule Tracking UI
    const trackBtns = document.querySelectorAll('.track-btn');
    const clearTrackBtn = document.getElementById('clearTrackBtn');
    const trackStatusBadge = document.getElementById('track-status-badge');
    const trackedMolName = document.getElementById('trackedMolName');
    const trackedMolState = document.getElementById('trackedMolState');

    const visualizationBox = document.getElementById('visualization-box');

    // Macro Kidney Panel Toggle
    const toggleMacroBtn = document.getElementById('toggleMacroBtn');
    const macroBody = document.getElementById('macroBody');

    // Molecule Filter Buttons
    const filterButtons = document.querySelectorAll('.legend-item-btn');

    // State
    let isRunning = false;
    let particles = [];
    let activeEffects = [];
    let animationId;
    let spawnTimer = 0;
    let speedMultiplier = 1.0;
    let showParticleLabels = false;
    let enableTransitionFx = true;

    // Active tracked particle
    let trackedParticle = null;
    let targetTrackType = null;

    // 預設只顯示水分子 (Default: only water is visible)
    const visibleMolecules = {
        water: true,
        glucose: false,
        salt: false,
        urea: false,
        toxin: false,
        protein: false
    };

    const pathology = {
        acidosis: false,
        hyperglycemia: false,
        proteinuria: false,
        adh: false
    };

    function updateStatusInfo() {
        const active = [];
        if (pathology.acidosis) active.push('【酸中毒】微血管向近曲與遠曲小管主動加速分泌 H⁺、NH₄⁺ 促排酸保鹼');
        if (pathology.hyperglycemia) active.push('【高血糖】近曲小管葡萄糖載體飽和，過量葡萄糖隨尿液排出');
        if (pathology.proteinuria) active.push('【蛋白尿】腎小球過濾障壁受損，大分子蛋白質漏入鮑氏囊與集尿管');
        if (pathology.adh) active.push('【抗利尿激素 ADH+】遠曲小管與集尿管水通道蛋白增加，大量水分重吸收回靜脈');
        if (active.length > 0) {
            infoText.textContent = active.join(' ｜ ');
        } else if (isRunning) {
            infoText.textContent = '模擬進行中：過濾（腎絲球）、再吸收（回收水與養分）與主動分泌（微血管排出H⁺/K⁺/藥物至小管）協同運作。';
        } else {
            infoText.textContent = '點擊「開始模擬」觀察血液過濾、管周微血管再吸收/分泌與尿液濃縮排出。';
        }
    }

    // =====================================================
    // ZOOM & PAN SYSTEM (Native Mouse Drag & Wheel)
    // =====================================================
    let panX = 0;
    let panY = 0;
    let zoomLevel = 1.0;
    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;

    function applyTransform() {
        viewportGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoomLevel})`);
    }

    function zoom(factor, centerX = 500, centerY = 430) {
        const prevZoom = zoomLevel;
        zoomLevel = Math.max(0.55, Math.min(3.5, zoomLevel * factor));
        panX = centerX - (centerX - panX) * (zoomLevel / prevZoom);
        panY = centerY - (centerY - panY) * (zoomLevel / prevZoom);
        applyTransform();
    }

    visualizationBox.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isDragging = true;
            startPointerX = e.clientX - panX;
            startPointerY = e.clientY - panY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startPointerX;
        panY = e.clientY - startPointerY;
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    visualizationBox.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (1000 / rect.width);
        const mouseY = (e.clientY - rect.top) * (860 / rect.height);
        const factor = e.deltaY < 0 ? 1.14 : 0.87;
        zoom(factor, mouseX, mouseY);
    }, { passive: false });

    // =====================================================
    // UI FILTER & CONTROL LISTENERS
    // =====================================================
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            visibleMolecules[type] = !visibleMolecules[type];
            btn.classList.toggle('active', visibleMolecules[type]);
            btn.classList.toggle('inactive', !visibleMolecules[type]);
            particles.forEach(p => p.updateVisibility());
        });
    });

    toggleAllMoleculesBtn.addEventListener('click', () => {
        const allActive = Object.values(visibleMolecules).every(v => v);
        const nextState = !allActive;
        Object.keys(visibleMolecules).forEach(k => visibleMolecules[k] = nextState);
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', nextState);
            btn.classList.toggle('inactive', !nextState);
        });
        toggleAllMoleculesBtn.textContent = nextState ? '全不選' : '全選';
        particles.forEach(p => p.updateVisibility());
    });

    speedRange.addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
        speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
    });

    toggleMacroBtn.addEventListener('click', () => {
        macroBody.classList.toggle('collapsed');
        toggleMacroBtn.textContent = macroBody.classList.contains('collapsed') ? '展開' : '收合';
    });

    toggleFxBtn.addEventListener('click', () => {
        enableTransitionFx = !enableTransitionFx;
        toggleFxBtn.classList.toggle('active', enableTransitionFx);
        if (!enableTransitionFx) {
            activeEffects.forEach(fx => fx.remove());
            activeEffects = [];
        }
    });

    // =====================================================
    // PATH TRANSITION VISUAL EFFECTS
    // =====================================================
    class TransitionEffect {
        constructor(x, y, color, badgeText, isHeroEffect = false) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.progress = 0;
            this.maxRadius = isHeroEffect ? 26 : 16;
            this.speed = isHeroEffect ? 0.035 : 0.05;

            this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.group.setAttribute("pointer-events", "none");

            this.ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this.ring.setAttribute("cx", x);
            this.ring.setAttribute("cy", y);
            this.ring.setAttribute("r", "3");
            this.ring.setAttribute("fill", "none");
            this.ring.setAttribute("stroke", color);
            this.ring.setAttribute("stroke-width", isHeroEffect ? "3.2" : "2.2");
            this.group.appendChild(this.ring);

            this.flash = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this.flash.setAttribute("cx", x);
            this.flash.setAttribute("cy", y);
            this.flash.setAttribute("r", isHeroEffect ? "6" : "4");
            this.flash.setAttribute("fill", "#ffffff");
            this.flash.setAttribute("stroke", color);
            this.flash.setAttribute("stroke-width", "1.5");
            this.group.appendChild(this.flash);

            if (badgeText && (isHeroEffect || showParticleLabels || Math.random() < 0.45)) {
                this.textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                this.textEl.setAttribute("x", x);
                this.textEl.setAttribute("y", y - 8);
                this.textEl.setAttribute("text-anchor", "middle");
                this.textEl.setAttribute("font-size", isHeroEffect ? "12" : "10");
                this.textEl.setAttribute("font-weight", "800");
                this.textEl.setAttribute("fill", color);
                this.textEl.setAttribute("class", "particle-label");
                this.textEl.textContent = badgeText;
                this.group.appendChild(this.textEl);
            }

            fxLayer.appendChild(this.group);
        }

        update() {
            this.progress += this.speed * speedMultiplier;
            if (this.progress >= 1) {
                this.remove();
                return false;
            }
            const easeOut = 1 - Math.pow(1 - this.progress, 2);
            const curR = 3 + (this.maxRadius - 3) * easeOut;
            const alpha = Math.max(0, 1 - this.progress);

            this.ring.setAttribute("r", curR);
            this.ring.setAttribute("stroke-opacity", alpha);
            this.flash.setAttribute("opacity", Math.max(0, 1 - this.progress * 2));

            if (this.textEl) {
                this.textEl.setAttribute("y", this.y - 8 - easeOut * 14);
                this.textEl.setAttribute("opacity", alpha);
            }
            return true;
        }

        remove() {
            if (this.group.parentNode) {
                this.group.parentNode.removeChild(this.group);
            }
        }
    }

    function spawnTransitionFx(x, y, molType, color, badgeText, isHero = false) {
        if (!enableTransitionFx) return;
        if (!visibleMolecules[molType]) return;
        activeEffects.push(new TransitionEffect(x, y, color, badgeText, isHero));
    }

    // =====================================================
    // SINGLE MOLECULE TRACKING ENGINE (PERFECTLY ALIGNED)
    // =====================================================
    const moleculeDisplayNames = {
        water: '水分子 (H₂O)',
        glucose: '葡萄糖 (Glucose)',
        salt: '鹽類 (Na⁺)',
        urea: '尿素 (Urea)',
        toxin: '分泌物 (H⁺/K⁺/藥物)',
        protein: '大分子蛋白質'
    };

    function startTrackingParticle(p) {
        if (trackedParticle && trackedParticle !== p) {
            trackedParticle.isHero = false;
            trackedParticle.element.setAttribute("r", trackedParticle.radius);
            trackedParticle.element.setAttribute("stroke-width", "1.2");
        }
        trackedParticle = p;
        p.isHero = true;
        p.element.setAttribute("r", p.radius + 3);
        p.element.setAttribute("stroke-width", "2.5");
        trackStatusBadge.classList.remove('hidden');
        trackedMolName.textContent = moleculeDisplayNames[p.type] || p.type;
        trackedMolState.textContent = '（已鎖定追蹤）';

        trackBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-track') === p.type);
        });
    }

    function clearTracking() {
        if (trackedParticle) {
            trackedParticle.isHero = false;
            trackedParticle.element.setAttribute("r", trackedParticle.radius);
            trackedParticle.element.setAttribute("stroke-width", "1.2");
            trackedParticle = null;
        }
        targetTrackType = null;
        trackStatusBadge.classList.add('hidden');
        trackBtns.forEach(b => b.classList.remove('active'));
        clearTrackerVisual();
    }

    clearTrackBtn.addEventListener('click', clearTracking);

    trackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-track');
            targetTrackType = type;
            trackBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (!visibleMolecules[type]) {
                visibleMolecules[type] = true;
                const legendBtn = document.querySelector(`.legend-item-btn[data-type="${type}"]`);
                if (legendBtn) {
                    legendBtn.classList.remove('inactive');
                    legendBtn.classList.add('active');
                }
                particles.forEach(p => p.updateVisibility());
            }

            const candidates = particles.filter(p => p.type === type && p.path === 'blood' && p.progress < 0.25);
            if (candidates.length > 0) {
                startTrackingParticle(candidates[0]);
            } else {
                trackStatusBadge.classList.remove('hidden');
                trackedMolName.textContent = moleculeDisplayNames[type];
                trackedMolState.textContent = '（即將自小葉間動脈進入...）';
            }
        });
    });

    const trackerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    trackerGroup.setAttribute("pointer-events", "none");
    trackerGroup.setAttribute("display", "none");

    const trackerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    trackerRing.setAttribute("r", "16");
    trackerRing.setAttribute("class", "tracker-ring");
    trackerRing.setAttribute("filter", "url(#glow-track)");
    trackerGroup.appendChild(trackerRing);

    const trackerCrossH = document.createElementNS("http://www.w3.org/2000/svg", "line");
    trackerCrossH.setAttribute("class", "tracker-crosshair");
    trackerGroup.appendChild(trackerCrossH);

    const trackerCrossV = document.createElementNS("http://www.w3.org/2000/svg", "line");
    trackerCrossV.setAttribute("class", "tracker-crosshair");
    trackerGroup.appendChild(trackerCrossV);

    trackerLayer.appendChild(trackerGroup);

    function updateTrackerVisual(x, y, stateText) {
        trackerRing.setAttribute("cx", x);
        trackerRing.setAttribute("cy", y);

        trackerCrossH.setAttribute("x1", x - 22);
        trackerCrossH.setAttribute("y1", y);
        trackerCrossH.setAttribute("x2", x + 22);
        trackerCrossH.setAttribute("y2", y);

        trackerCrossV.setAttribute("x1", x);
        trackerCrossV.setAttribute("y1", y - 22);
        trackerCrossV.setAttribute("x2", x);
        trackerCrossV.setAttribute("y2", y + 22);

        trackerGroup.setAttribute("display", "block");

        if (stateText) trackedMolState.textContent = `（${stateText}）`;
    }

    function clearTrackerVisual() {
        trackerGroup.setAttribute("display", "none");
    }

    // =====================================================
    // ANATOMICAL PATHS
    // =====================================================
    const interlobularArteryData = `
        M 145 55
        L 145 845
    `;
    const arcuateArteryBranchData = `
        M 95 70 L 145 90
    `;

    const interlobularVeinData = `
        M 220 845
        L 220 55
    `;
    const arcuateVeinBranchData = `
        M 220 90 L 270 70
    `;

    const afferentArterioleData = `
        M 145 225
        L 290 225
    `;

    const glomerulusLoopsData = `
        M 290 225
        C 315 190, 380 190, 390 220
        C 400 250, 325 250, 325 215
        C 325 180, 395 180, 400 230
        C 390 265, 320 265, 315 235
        C 310 205, 380 205, 385 235
        C 390 265, 345 265, 320 225
    `;

    const nephronParticlePathData = `
        M 375 225
        L 425 225
        C 460 225, 455 115, 495 115
        C 535 115, 505 195, 540 195
        C 575 195, 555 115, 590 120
        C 620 125, 575 180, 575 250
        L 575 730
        C 575 785, 665 785, 665 730
        L 665 280
        C 665 220, 705 195, 735 235
        C 765 275, 775 195, 810 225
        C 830 240, 845 240, 860 240
        L 860 845
    `;

    const nephronTubuleVisualData = `
        M 415 225
        L 425 225
        C 460 225, 455 115, 495 115
        C 535 115, 505 195, 540 195
        C 575 195, 555 115, 590 120
        C 620 125, 575 180, 575 250
        L 575 730
        C 575 785, 665 785, 665 730
        L 665 280
        C 665 220, 705 195, 735 235
        C 765 275, 775 195, 810 225
        C 830 240, 845 240, 860 240
    `;

    const collectingDuctTrunkData = `M 860 55 L 860 845`;
    const collectingDuctStubs = [
        `M 860 140 L 892 120`,
        `M 860 330 L 828 308`,
        `M 860 440 L 892 418`,
        `M 860 540 L 828 520`,
        `M 860 650 L 892 632`
    ];

    const efferentArterioleData = `
        M 320 225
        C 305 180, 320 140, 375 135
        C 425 130, 465 140, 490 165
        C 520 195, 545 250, 545 340
        L 545 725
        C 545 760, 580 768, 620 768
    `;

    const peritubularRedWeb = [
        `M 455 142 C 505 110, 560 110, 610 135`,
        `M 490 165 C 535 150, 575 155, 610 175`,
        `M 520 205 C 555 195, 585 205, 610 220`,
        `M 545 430 Q 582 442 620 436`,
        `M 545 505 Q 582 517 620 511`,
        `M 545 580 Q 582 592 620 586`,
        `M 545 655 Q 582 667 620 661`,
        `M 545 715 Q 582 725 620 720`
    ];

    const peritubularBlueWeb = [
        `M 610 135 C 655 155, 690 185, 700 235`,
        `M 610 175 C 650 195, 680 220, 700 265`,
        `M 610 220 C 645 235, 675 265, 700 305`,
        `M 620 768 C 665 768, 700 760, 700 725 L 700 235`,
        `M 620 436 Q 660 430 700 418`,
        `M 620 511 Q 660 505 700 493`,
        `M 620 586 Q 660 580 700 568`,
        `M 620 661 Q 660 655 700 643`,
        `M 620 720 Q 660 715 700 705`,
        `M 700 355 C 550 375, 370 375, 220 355`
    ];

    const bloodParticlePathData = `
        M 145 55
        L 145 225
        L 290 225
        C 325 185, 385 195, 385 225
        C 385 255, 330 255, 320 225
        C 305 180, 320 140, 375 135
        C 425 130, 465 140, 490 165
        C 520 195, 545 250, 545 340
        L 545 725
        C 545 760, 580 768, 620 768
        C 665 768, 700 760, 700 725
        L 700 355
        C 550 375, 370 375, 220 355
        L 220 55
    `;

    // =====================================================
    // SVG DRAWING HELPERS
    // =====================================================
    function drawTube(parent, d, borderClass, lumenClass, highlightClass, outerWidth, innerWidth) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const border = document.createElementNS("http://www.w3.org/2000/svg", "path");
        border.setAttribute("d", d);
        border.setAttribute("class", borderClass);
        border.setAttribute("stroke-width", outerWidth);
        g.appendChild(border);

        const lumen = document.createElementNS("http://www.w3.org/2000/svg", "path");
        lumen.setAttribute("d", d);
        lumen.setAttribute("class", lumenClass);
        lumen.setAttribute("stroke-width", innerWidth);
        g.appendChild(lumen);

        if (highlightClass) {
            const hl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            hl.setAttribute("d", d);
            hl.setAttribute("class", highlightClass);
            hl.setAttribute("stroke-width", Math.max(2, innerWidth * 0.28));
            g.appendChild(hl);
        }

        parent.appendChild(g);
        return g;
    }

    function drawZones() {
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", "-500");
        bg.setAttribute("y", "-500");
        bg.setAttribute("width", "2000");
        bg.setAttribute("height", "2000");
        bg.setAttribute("fill", "url(#bg-cortex-medulla)");
        zoneLayer.appendChild(bg);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "40");
        line.setAttribute("y1", "390");
        line.setAttribute("x2", "960");
        line.setAttribute("y2", "390");
        line.setAttribute("class", "zone-boundary");
        zoneLayer.appendChild(line);

        const cortexText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        cortexText.setAttribute("x", "820");
        cortexText.setAttribute("y", "378");
        cortexText.setAttribute("text-anchor", "end");
        cortexText.setAttribute("class", "zone-title");
        cortexText.textContent = "▲ 腎皮質";
        zoneLayer.appendChild(cortexText);

        const medullaText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        medullaText.setAttribute("x", "820");
        medullaText.setAttribute("y", "415");
        medullaText.setAttribute("text-anchor", "end");
        medullaText.setAttribute("class", "zone-title");
        medullaText.textContent = "▼ 腎髓質";
        zoneLayer.appendChild(medullaText);
    }

    function drawAnatomy() {
        collectingDuctStubs.forEach(stubD => {
            const b = document.createElementNS("http://www.w3.org/2000/svg", "path");
            b.setAttribute("d", stubD);
            b.setAttribute("class", "tubule-border");
            b.setAttribute("stroke-width", "18");
            structureLayer.appendChild(b);
        });

        const cdBorder = document.createElementNS("http://www.w3.org/2000/svg", "path");
        cdBorder.setAttribute("d", collectingDuctTrunkData);
        cdBorder.setAttribute("class", "tubule-border");
        cdBorder.setAttribute("stroke-width", "34");
        structureLayer.appendChild(cdBorder);

        const nephronBorder = document.createElementNS("http://www.w3.org/2000/svg", "path");
        nephronBorder.setAttribute("d", nephronTubuleVisualData);
        nephronBorder.setAttribute("class", "tubule-border");
        nephronBorder.setAttribute("stroke-width", "24");
        structureLayer.appendChild(nephronBorder);

        collectingDuctStubs.forEach(stubD => {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "path");
            l.setAttribute("d", stubD);
            l.setAttribute("class", "tubule-lumen");
            l.setAttribute("stroke-width", "13");
            structureLayer.appendChild(l);
        });

        const cdLumen = document.createElementNS("http://www.w3.org/2000/svg", "path");
        cdLumen.setAttribute("d", collectingDuctTrunkData);
        cdLumen.setAttribute("class", "tubule-lumen");
        cdLumen.setAttribute("stroke-width", "27");
        structureLayer.appendChild(cdLumen);

        const nephronLumen = document.createElementNS("http://www.w3.org/2000/svg", "path");
        nephronLumen.setAttribute("d", nephronTubuleVisualData);
        nephronLumen.setAttribute("class", "tubule-lumen");
        nephronLumen.setAttribute("stroke-width", "18");
        structureLayer.appendChild(nephronLumen);

        const cdHl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        cdHl.setAttribute("d", collectingDuctTrunkData);
        cdHl.setAttribute("class", "tubule-highlight");
        cdHl.setAttribute("stroke-width", "7");
        structureLayer.appendChild(cdHl);

        const nephronHl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        nephronHl.setAttribute("d", nephronTubuleVisualData);
        nephronHl.setAttribute("class", "tubule-highlight");
        nephronHl.setAttribute("stroke-width", "5");
        structureLayer.appendChild(nephronHl);

        const topRim = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        topRim.setAttribute("cx", "860");
        topRim.setAttribute("cy", "55");
        topRim.setAttribute("rx", "16");
        topRim.setAttribute("ry", "5");
        topRim.setAttribute("fill", "#e5c07b");
        topRim.setAttribute("stroke", "#b88e44");
        topRim.setAttribute("stroke-width", "2");
        structureLayer.appendChild(topRim);

        const corpuscleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        corpuscleGroup.setAttribute("filter", "url(#tube-shadow)");

        const outerCapsule = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        outerCapsule.setAttribute("cx", "355");
        outerCapsule.setAttribute("cy", "225");
        outerCapsule.setAttribute("rx", "72");
        outerCapsule.setAttribute("ry", "64");
        outerCapsule.setAttribute("fill", "url(#bowman-sphere-grad)");
        outerCapsule.setAttribute("stroke", "#c49228");
        outerCapsule.setAttribute("stroke-width", "3.2");
        corpuscleGroup.appendChild(outerCapsule);

        const innerCavity = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        innerCavity.setAttribute("cx", "350");
        innerCavity.setAttribute("cy", "225");
        innerCavity.setAttribute("rx", "55");
        innerCavity.setAttribute("ry", "47");
        innerCavity.setAttribute("fill", "url(#bowman-inner-grad)");
        innerCavity.setAttribute("stroke", "#d49a45");
        innerCavity.setAttribute("stroke-width", "2.2");
        corpuscleGroup.appendChild(innerCavity);

        structureLayer.appendChild(corpuscleGroup);

        drawTube(structureLayer, glomerulusLoopsData, "artery-border", "artery-lumen", "artery-highlight", 13, 9);

        drawTube(structureLayer, interlobularVeinData, "vein-border", "vein-lumen", "vein-highlight", 20, 14);
        drawTube(structureLayer, arcuateVeinBranchData, "vein-border", "vein-lumen", "vein-highlight", 16, 11);

        peritubularBlueWeb.forEach(d => {
            drawTube(structureLayer, d, "vein-border", "vein-lumen", "vein-highlight", 9.5, 6);
        });

        drawTube(structureLayer, interlobularArteryData, "artery-border", "artery-lumen", "artery-highlight", 20, 14);
        drawTube(structureLayer, arcuateArteryBranchData, "artery-border", "artery-lumen", "artery-highlight", 16, 11);
        drawTube(structureLayer, afferentArterioleData, "artery-border", "artery-lumen", "artery-highlight", 15, 10);
        drawTube(structureLayer, efferentArterioleData, "artery-border", "artery-lumen", "artery-highlight", 10.5, 7);

        peritubularRedWeb.forEach(d => {
            drawTube(structureLayer, d, "artery-border", "artery-lumen", "artery-highlight", 9.5, 6);
        });

        const mainHeading = document.createElementNS("http://www.w3.org/2000/svg", "text");
        mainHeading.setAttribute("x", "615");
        mainHeading.setAttribute("y", "115");
        mainHeading.setAttribute("font-size", "32");
        mainHeading.setAttribute("font-weight", "800");
        mainHeading.setAttribute("fill", "#1e293b");
        mainHeading.textContent = "腎小管";
        labelLayer.appendChild(mainHeading);

        addPointerLabel(370, 272, 425, 325, "腎小球", "（腎絲球＋鮑氏囊）", "middle");
        addPointerLabel(375, 135, 375, 78, "出球小動脈", "延伸為管周微血管網", "middle");
        addPointerLabel(240, 225, 280, 305, "入球小動脈", "分支自小葉間動脈", "middle");
        addPointerLabel(535, 120, 540, 68, "近曲小管", "（再吸收＋藥物/H⁺分泌）", "middle");
        addPointerLabel(735, 218, 745, 145, "遠曲小管", "（主動分泌 K⁺/H⁺）", "middle");
        addPointerLabel(615, 776, 480, 770, "亨利氏管", "（U型高滲透壓濃縮）", "end");
        addPointerLabel(860, 600, 935, 600, "集尿管", "（濃縮終尿排往腎盂）", "start");

        addFlowDirectionArrow(118, 120, 118, 195, "#c0392b", "arrow-red");
        addFlowTag(140, 38, "▼ 小葉間動脈（向下流入）", "#922b21", "end");

        addFlowDirectionArrow(246, 195, 246, 120, "#1565c0", "arrow-blue");
        addFlowTag(225, 38, "▲ 小葉間靜脈（向上回流）", "#154360", "start");

        addFlowDirectionArrow(895, 710, 895, 790, "#d35400", "arrow-urine");
        addFlowTag(875, 832, "▼【終尿】往腎盂・輸尿管", "#9c640c", "start");
    }

    function addPointerLabel(dotX, dotY, textX, textY, title, subtitle, anchor = "middle") {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", dotX);
        line.setAttribute("y1", dotY);
        line.setAttribute("x2", textX);
        line.setAttribute("y2", textY > dotY ? textY - 20 : (textY < dotY ? textY + 24 : textY));
        line.setAttribute("class", "anatomy-leader-line");
        g.appendChild(line);

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", dotX);
        dot.setAttribute("cy", dotY);
        dot.setAttribute("r", "4");
        dot.setAttribute("class", "anatomy-leader-dot");
        g.appendChild(dot);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", textX);
        text.setAttribute("y", textY);
        text.setAttribute("text-anchor", anchor);
        text.setAttribute("class", "anatomy-label");
        text.textContent = title;
        g.appendChild(text);

        if (subtitle) {
            const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sub.setAttribute("x", textX);
            sub.setAttribute("y", textY + 17);
            sub.setAttribute("text-anchor", anchor);
            sub.setAttribute("class", "anatomy-sublabel");
            sub.textContent = subtitle;
            g.appendChild(sub);
        }

        labelLayer.appendChild(g);
    }

    function addFlowDirectionArrow(x1, y1, x2, y2, color, markerId) {
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
        arrow.setAttribute("x1", x1);
        arrow.setAttribute("y1", y1);
        arrow.setAttribute("x2", x2);
        arrow.setAttribute("y2", y2);
        arrow.setAttribute("stroke", color);
        arrow.setAttribute("stroke-width", "3");
        arrow.setAttribute("stroke-dasharray", "5,3");
        arrow.setAttribute("marker-end", `url(#${markerId})`);
        labelLayer.appendChild(arrow);
    }

    function addFlowTag(x, y, text, color, anchor = "start") {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("text-anchor", anchor);
        el.setAttribute("fill", color);
        el.setAttribute("class", "flow-tag");
        el.textContent = text;
        labelLayer.appendChild(el);
    }

    // =====================================================
    // PARTICLE ENGINE (Continuous Filtration, Reabsorption, Secretion & Tracking)
    // =====================================================
    const sharedBloodPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    sharedBloodPathEl.setAttribute("d", bloodParticlePathData);
    const sharedNephronPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    sharedNephronPathEl.setAttribute("d", nephronParticlePathData);

    const totalBloodLength = sharedBloodPathEl.getTotalLength();
    const totalNephronLength = sharedNephronPathEl.getTotalLength();

    const particleTypesBase = [
        { type: 'water',   color: '#29b6f6', stroke: '#0288d1', radius: 4.5, label: 'H₂O' },
        { type: 'glucose', color: '#66bb6a', stroke: '#2e7d32', radius: 5.5, label: '葡萄糖' },
        { type: 'salt',    color: '#ef5350', stroke: '#c62828', radius: 4.5, label: 'Na⁺' },
        { type: 'urea',    color: '#ffee58', stroke: '#f9a825', radius: 4.8, label: '尿素' },
        { type: 'toxin',   color: '#00bcd4', stroke: '#00838f', radius: 5.0, label: 'H⁺/藥物' },
        { type: 'protein', color: '#ab47bc', stroke: '#6a1b9a', radius: 7.0, label: '蛋白質' }
    ];

    function chooseParticleType() {
        if (targetTrackType && !trackedParticle) {
            const matched = particleTypesBase.find(t => t.type === targetTrackType);
            if (matched) return matched;
        }

        const activeTypes = particleTypesBase.filter(t => visibleMolecules[t.type]);
        if (activeTypes.length === 1) {
            return activeTypes[0];
        }

        const weighted = [];
        particleTypesBase.forEach(t => {
            let weight = 2;
            if (t.type === 'water') weight = 4;
            if (t.type === 'toxin') weight = pathology.acidosis ? 6 : 2;
            if (t.type === 'glucose' && pathology.hyperglycemia) weight = 7;
            for (let i = 0; i < weight; i++) weighted.push(t);
        });
        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    class Particle {
        constructor() {
            const typeData = chooseParticleType();
            this.type = typeData.type;
            this.color = typeData.color;
            this.radius = typeData.radius;
            this.label = typeData.label;

            this.jitterX = 0;
            this.jitterY = 0;

            this.element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this.element.setAttribute("r", this.radius);
            this.element.setAttribute("fill", this.color);
            this.element.setAttribute("stroke", typeData.stroke);
            this.element.setAttribute("stroke-width", "1.2");
            this.element.setAttribute("class", "particle");
            particleLayer.appendChild(this.element);

            this.labelElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this.labelElement.setAttribute("class", "particle-label");
            this.labelElement.setAttribute("fill", "#0f172a");
            this.labelElement.setAttribute("font-size", "10.5");
            this.labelElement.setAttribute("font-weight", "bold");
            this.labelElement.textContent = this.label;
            particleLayer.appendChild(this.labelElement);

            this.path = 'blood';
            this.progress = 0;
            this.baseSpeed = 0.0015 + Math.random() * 0.0004;

            // Filtration transition state
            this.isFiltering = false;
            this.filterProgress = 0;
            this.filterStartPt = { x: 0, y: 0 };
            this.filterEndPt = { x: 0, y: 0 };

            // Reabsorption transition state (Tubule -> Capillary)
            this.isReabsorbing = false;
            this.reabsorbTargetProgress = 0;

            // Secretion transition state (Capillary -> Tubule)
            this.isSecreting = false;
            this.secreteTargetProgress = 0;

            this.currentX = 0;
            this.currentY = 0;

            // Milestone flags
            this.filtered = false;
            this.checkedPCT = false;
            this.checkedLoopWater = false;
            this.checkedLoopSalt = false;
            this.checkedDCT = false;
            this.checkedADH = false;
            this.checkedSecretion = false;

            this.isHero = false;

            this.element.addEventListener('click', (e) => {
                e.stopPropagation();
                startTrackingParticle(this);
            });

            this.updateVisibility();

            if (targetTrackType === this.type && !trackedParticle) {
                startTrackingParticle(this);
            }
        }

        updateVisibility() {
            const isVis = visibleMolecules[this.type];
            this.element.style.display = isVis ? 'block' : 'none';
            this.labelElement.style.display = (isVis && showParticleLabels) ? 'block' : 'none';
        }

        update() {
            const currentSpeed = this.baseSpeed * speedMultiplier;

            // 1. Smooth Filtration Animation (Glomerulus -> Bowman's Capsule)
            if (this.isFiltering) {
                this.filterProgress += 0.045 * speedMultiplier;
                if (this.filterProgress >= 1) {
                    this.isFiltering = false;
                    this.path = 'nephron';
                    this.progress = 0.002;
                    spawnTransitionFx(this.currentX, this.currentY, this.type, '#f59e0b', '濾入鮑氏囊', this.isHero);
                } else {
                    const t = this.filterProgress;
                    const ease = t * t * (3 - 2 * t);
                    this.currentX = this.filterStartPt.x + (this.filterEndPt.x - this.filterStartPt.x) * ease;
                    this.currentY = this.filterStartPt.y + (this.filterEndPt.y - this.filterStartPt.y) * ease;
                    this.renderPosition();
                    if (this.isHero) updateTrackerVisual(this.currentX, this.currentY, '過濾作用：穿過絲球體障壁進入鮑氏囊');
                    return true;
                }
            }

            // 2. Smooth Reabsorption Animation (Tubule -> Capillary)
            if (this.isReabsorbing) {
                const targetPt = sharedBloodPathEl.getPointAtLength(this.reabsorbTargetProgress * totalBloodLength);
                const dx = targetPt.x - this.currentX;
                const dy = targetPt.y - this.currentY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 6) {
                    this.isReabsorbing = false;
                    this.path = 'blood';
                    this.progress = this.reabsorbTargetProgress;
                    spawnTransitionFx(targetPt.x, targetPt.y, this.type, '#2563eb', '回收至微血管', this.isHero);
                } else {
                    const stepFactor = 0.09 * speedMultiplier;
                    this.currentX += dx * stepFactor;
                    this.currentY += dy * stepFactor;
                    this.renderPosition();
                    if (this.isHero) updateTrackerVisual(this.currentX, this.currentY, '再吸收中：由腎小管穿壁回到微血管');
                    return true;
                }
            }

            // 3. Smooth Secretion Animation (Capillary -> Tubule)
            if (this.isSecreting) {
                const targetPt = sharedNephronPathEl.getPointAtLength(this.secreteTargetProgress * totalNephronLength);
                const dx = targetPt.x - this.currentX;
                const dy = targetPt.y - this.currentY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 6) {
                    this.isSecreting = false;
                    this.path = 'nephron';
                    this.progress = this.secreteTargetProgress;
                    spawnTransitionFx(targetPt.x, targetPt.y, this.type, '#00bcd4', '分泌進入小管', this.isHero);
                } else {
                    const stepFactor = 0.09 * speedMultiplier;
                    this.currentX += dx * stepFactor;
                    this.currentY += dy * stepFactor;
                    this.renderPosition();
                    if (this.isHero) updateTrackerVisual(this.currentX, this.currentY, '主動分泌中：由微血管排入腎小管');
                    return true;
                }
            }

            this.progress += currentSpeed;

            // 4. Glomerular Filtration Decision (~progress 0.14 - 0.19)
            if (this.path === 'blood' && this.progress >= 0.14 && this.progress <= 0.19 && !this.filtered) {
                this.filtered = true;
                let shouldFilter = false;
                if (this.type === 'protein') {
                    shouldFilter = pathology.proteinuria && Math.random() < 0.55;
                } else if (this.type === 'toxin') {
                    // Toxins/H+ partly filter (~25%), but mostly stay in blood to demonstrate Tubular Secretion!
                    shouldFilter = Math.random() < 0.25;
                } else {
                    shouldFilter = Math.random() < 0.85;
                }

                if (shouldFilter) {
                    this.isFiltering = true;
                    this.filterProgress = 0;
                    this.filterStartPt = { x: this.currentX, y: this.currentY };
                    const nephronStart = sharedNephronPathEl.getPointAtLength(0);
                    this.filterEndPt = { x: nephronStart.x, y: nephronStart.y };
                    return true;
                } else if (this.isHero) {
                    spawnTransitionFx(this.currentX, this.currentY, this.type, '#9333ea', '保留於出球小動脈', true);
                }
            }

            // 5. Secretion Trigger (Capillary -> Tubule)
            // While traveling in peritubular capillaries (progress ~0.35 - 0.72)
            if (this.path === 'blood' && !this.isSecreting && !this.checkedSecretion) {
                // Secretion at PCT (progress 0.32 - 0.40) or DCT (progress 0.65 - 0.75)
                if (this.type === 'toxin') {
                    if (this.progress >= 0.33 && this.progress < 0.40) {
                        this.checkedSecretion = true;
                        // Secretion into PCT (target ~0.10)
                        const chance = pathology.acidosis ? 0.90 : 0.60;
                        if (Math.random() < chance) {
                            this.startSecretion(0.10 + Math.random() * 0.05);
                        }
                    } else if (this.progress >= 0.65 && this.progress < 0.75) {
                        this.checkedSecretion = true;
                        // Secretion into DCT (target ~0.72)
                        const chance = pathology.acidosis ? 0.95 : 0.70;
                        if (Math.random() < chance) {
                            this.startSecretion(0.70 + Math.random() * 0.04);
                        }
                    }
                }
            }

            // 6. Tubular Reabsorption Milestones (Tubule -> Capillary)
            if (this.path === 'nephron' && !this.isReabsorbing && !this.isSecreting) {
                // PCT (progress 0.05 - 0.18)
                if (this.progress >= 0.05 && this.progress < 0.18 && !this.checkedPCT) {
                    this.checkedPCT = true;
                    if (this.type === 'glucose') {
                        if (!pathology.hyperglycemia || Math.random() < 0.45) {
                            this.startReabsorption(0.32 + Math.random() * 0.05);
                        }
                    } else if (this.type === 'water' || this.type === 'salt') {
                        if (Math.random() < 0.65) {
                            this.startReabsorption(0.33 + Math.random() * 0.06);
                        }
                    }
                }
                // Descending Loop of Henle (progress 0.22 - 0.42): Water reabsorption
                else if (this.progress >= 0.22 && this.progress < 0.42 && !this.checkedLoopWater) {
                    if (this.type === 'water') {
                        this.checkedLoopWater = true;
                        if (Math.random() < 0.48) {
                            this.startReabsorption(0.42 + Math.random() * 0.08);
                        }
                    }
                }
                // Ascending Loop of Henle (progress 0.46 - 0.64): Salt active reabsorption
                else if (this.progress >= 0.46 && this.progress < 0.64 && !this.checkedLoopSalt) {
                    if (this.type === 'salt') {
                        this.checkedLoopSalt = true;
                        if (Math.random() < 0.58) {
                            this.startReabsorption(0.58 + Math.random() * 0.07);
                        }
                    }
                }
                // DCT (progress 0.66 - 0.76): Fine tuning
                else if (this.progress >= 0.66 && this.progress < 0.76 && !this.checkedDCT) {
                    this.checkedDCT = true;
                    if (this.type === 'salt' || this.type === 'water') {
                        const prob = (this.type === 'water' && pathology.adh) ? 0.70 : 0.30;
                        if (Math.random() < prob) {
                            this.startReabsorption(0.68 + Math.random() * 0.05);
                        }
                    }
                }
                // Collecting Duct (progress 0.80 - 0.94): ADH-dependent water reabsorption
                else if (this.progress >= 0.80 && this.progress < 0.94 && !this.checkedADH) {
                    if (this.type === 'water') {
                        this.checkedADH = true;
                        const adhProb = pathology.adh ? 0.85 : 0.25;
                        if (Math.random() < adhProb) {
                            this.startReabsorption(0.62 + Math.random() * 0.06);
                        }
                    }
                }
            }

            // Compute exact coordinates along active path
            let pt;
            if (this.path === 'blood') {
                if (this.progress >= 1) {
                    this.remove();
                    return false;
                }
                pt = sharedBloodPathEl.getPointAtLength(this.progress * totalBloodLength);
            } else {
                if (this.progress >= 1) {
                    this.remove();
                    return false;
                }
                pt = sharedNephronPathEl.getPointAtLength(this.progress * totalNephronLength);
            }

            this.currentX = pt.x + this.jitterX;
            this.currentY = pt.y + this.jitterY;
            this.renderPosition();

            // Update Track Status & Ring (100% exact alignment)
            if (this.isHero) {
                let locationMsg = '小葉間動脈（向下流入）';
                if (this.path === 'blood') {
                    if (this.progress < 0.07) locationMsg = '小葉間動脈（向下流入）';
                    else if (this.progress < 0.13) locationMsg = '入球小動脈';
                    else if (this.progress < 0.21) locationMsg = '腎絲球微血管球';
                    else if (this.progress < 0.52) locationMsg = '出球小動脈 / 管周微血管網';
                    else if (this.progress < 0.75) locationMsg = '靜脈端微血管（準備分泌或回流）';
                    else locationMsg = '小葉間靜脈（向上回流至腎靜脈）';
                } else {
                    if (this.progress < 0.20) locationMsg = '近曲小管（再吸收與主動分泌）';
                    else if (this.progress < 0.45) locationMsg = '亨利氏管下降支（水分再吸收）';
                    else if (this.progress < 0.65) locationMsg = '亨利氏管上升支（鹽類再吸收）';
                    else if (this.progress < 0.78) locationMsg = '遠曲小管（分泌 H⁺/K⁺ 調節酸鹼）';
                    else locationMsg = '集尿管（隨終尿排出體外）';
                }
                updateTrackerVisual(this.currentX, this.currentY, locationMsg);
            }

            return true;
        }

        renderPosition() {
            this.element.setAttribute("cx", this.currentX);
            this.element.setAttribute("cy", this.currentY);
            this.labelElement.setAttribute("x", this.currentX + this.radius + 3);
            this.labelElement.setAttribute("y", this.currentY + 4);
        }

        startReabsorption(targetProgress) {
            this.isReabsorbing = true;
            this.reabsorbTargetProgress = targetProgress;
            spawnTransitionFx(this.currentX, this.currentY, this.type, '#10b981', '穿出小管(再吸收)', this.isHero);
        }

        startSecretion(targetNephronProgress) {
            this.isSecreting = true;
            this.secreteTargetProgress = targetNephronProgress;
            spawnTransitionFx(this.currentX, this.currentY, this.type, '#00bcd4', '微血管主動分泌', this.isHero);
        }

        remove() {
            if (this.isHero) {
                clearTrackerVisual();
                trackedMolState.textContent = '（已流出畫面，即將自動鎖定下一個）';
                trackedParticle = null;
            }
            if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
            if (this.labelElement.parentNode) this.labelElement.parentNode.removeChild(this.labelElement);
        }
    }

    function animate() {
        if (!isRunning) return;

        spawnTimer += speedMultiplier;
        if (spawnTimer >= 12) {
            particles.push(new Particle());
            spawnTimer = 0;
        }

        particles = particles.filter(p => p.update());
        activeEffects = activeEffects.filter(fx => fx.update());
        animationId = requestAnimationFrame(animate);
    }

    // =====================================================
    // BUTTON EVENT HANDLERS
    // =====================================================
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            startBtn.textContent = "⏸ 暫停模擬";
            startBtn.classList.add('running');
            updateStatusInfo();
            animate();
        } else {
            isRunning = false;
            startBtn.textContent = "▶ 繼續模擬";
            startBtn.classList.remove('running');
            cancelAnimationFrame(animationId);
        }
    });

    resetBtn.addEventListener('click', () => {
        isRunning = false;
        startBtn.textContent = "▶ 開始模擬";
        startBtn.classList.remove('running');
        cancelAnimationFrame(animationId);
        particles.forEach(p => p.remove());
        particles = [];
        activeEffects.forEach(fx => fx.remove());
        activeEffects = [];
        clearTracking();
        updateStatusInfo();
    });

    toggleLabelsBtn.addEventListener('click', () => {
        showParticleLabels = !showParticleLabels;
        toggleLabelsBtn.classList.toggle('active', showParticleLabels);
        toggleLabelsBtn.textContent = showParticleLabels ? '隱藏分子標籤' : '顯示分子標籤';
        particles.forEach(p => p.updateVisibility());
    });

    acidosisBtn.addEventListener('click', () => {
        pathology.acidosis = !pathology.acidosis;
        acidosisBtn.classList.toggle('active', pathology.acidosis);
        updateStatusInfo();
    });

    hyperglycemiaBtn.addEventListener('click', () => {
        pathology.hyperglycemia = !pathology.hyperglycemia;
        hyperglycemiaBtn.classList.toggle('active', pathology.hyperglycemia);
        updateStatusInfo();
    });

    proteinuriaBtn.addEventListener('click', () => {
        pathology.proteinuria = !pathology.proteinuria;
        proteinuriaBtn.classList.toggle('active', pathology.proteinuria);
        updateStatusInfo();
    });

    adhBtn.addEventListener('click', () => {
        pathology.adh = !pathology.adh;
        adhBtn.classList.toggle('active', pathology.adh);
        updateStatusInfo();
    });

    // Initialize Scene
    drawZones();
    drawAnatomy();
});

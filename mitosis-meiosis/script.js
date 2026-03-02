const CHROMOSOME_PAIRS_DATA = [
    { name: 'A/a', size: 'long', colors: ['#1e40af', '#991b1b'], linked: ['E/e'] },
    { name: 'B/b', size: 'short', colors: ['#2563eb', '#dc2626'], linked: ['F/f'] },
    { name: 'C/c', size: 'long', colors: ['#0369a1', '#be123c'] },
    { name: 'D/d', size: 'short', colors: ['#0284c7', '#dc2626'] }
];

class CellDivisionSimulator {
    constructor(elementId, mode, numPairs) {
        this.container = document.getElementById(elementId);
        this.svg = this.container.querySelector('svg');
        this.chrGroup = this.container.querySelector('.chromosome-group');
        this.mode = mode;
        this.numPairs = numPairs;
        this.currentState = 0;
        this.numPoints = 80;
        this.playTimeout = null;

        // UI Cache
        this.instructionBox = this.container.querySelector('.instruction-box');
        this.membrane = this.container.querySelector('.cell-membrane');
        this.nucleus = this.container.querySelector('.nucleus');
        this.btnPrev = this.container.querySelector('.btn-prev');
        this.btnNext = this.container.querySelector('.btn-next');
        this.btnReset = this.container.querySelector('.btn-reset');
        this.btnPlay = this.container.querySelector('.btn-play');

        // Mode specific nuclei
        this.mitosisNuclei = [
            this.container.querySelector('.nucleus-left'),
            this.container.querySelector('.nucleus-right')
        ].filter(el => el);
        
        this.meiosisNuclei = [
            this.container.querySelector('.nuc-tl'),
            this.container.querySelector('.nuc-bl'),
            this.container.querySelector('.nuc-tr'),
            this.container.querySelector('.nuc-br')
        ].filter(el => el);

        this.initChromosomes();
        this.initEventListeners();
        this.render();
    }

    static focusModeActive = false;
    static selectedPairs = new Set(); // Set of pair indices focused globally

    initChromosomes() {
        this.chrGroup.innerHTML = '';
        this.chromosomes = [];
        
        // Calculate safe area: Nucleus Radius (220 * 0.85) - Longest Chromosome Half-Length (160/2 * 0.8)
        // 187 - 64 = 123. We use 115 for a small comfortable margin.
        const NUCLEUS_R = 220 * 0.85;
        const CHR_HALF_LEN = 64; 
        const SAFE_R = NUCLEUS_R - CHR_HALF_LEN - 5; // 5px extra safety margin

        const getRandomPos = () => {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * SAFE_R; // Square root for uniform distribution in circle
            return { x: 400 + r * Math.cos(angle), y: 300 + r * Math.sin(angle), rot: Math.random() * 360 };
        };

        // For Meiosis, pre-decide random assortment for State 3 (Anaphase I)
        const meiosisSides = Array(this.numPairs).fill(0).map(() => Math.random() > 0.5);
        // Randomize linkage phase (e.g., A-E or A-e)
        const linkageSwaps = Array(this.numPairs).fill(0).map(() => Math.random() > 0.5);

        for (let i = 0; i < this.numPairs; i++) {
            const pairData = CHROMOSOME_PAIRS_DATA[i];
            const labels = pairData.name.split('/');
            
            // Generate two homologous chromosomes (one maternal, one paternal)
            for (let j = 0; j < 2; j++) {
                const chrId = `p${i}-c${j}`;
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", `chromosome pair-${i} chr-${j}`);
                g.id = `${this.mode}-${chrId}`;

                const templateId = pairData.size === 'long' ? '#chromatid-long' : '#chromatid-short';
                
                // Containers
                const sisLeft = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisLeft.setAttribute("class", "sister-left");
                const sisRightSide = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisRightSide.setAttribute("class", "sister-right");

                const useLeft = document.createElementNS("http://www.w3.org/2000/svg", "use");
                useLeft.setAttribute("href", templateId);
                useLeft.style.color = pairData.colors[j];
                sisLeft.appendChild(useLeft);

                const useRight = document.createElementNS("http://www.w3.org/2000/svg", "use");
                useRight.setAttribute("href", templateId);
                useRight.style.color = pairData.colors[j];
                sisRightSide.appendChild(useRight);
                
                // Primary Locus Marker
                const locusPrimary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                locusPrimary.setAttribute("class", "locus-marker locus-primary");
                if (pairData.size === 'long') {
                    locusPrimary.setAttribute("x", "-12"); locusPrimary.setAttribute("y", "-53");
                    locusPrimary.setAttribute("width", "24"); locusPrimary.setAttribute("height", "18");
                } else {
                    locusPrimary.setAttribute("x", "-10"); locusPrimary.setAttribute("y", "10");
                    locusPrimary.setAttribute("width", "20"); locusPrimary.setAttribute("height", "14");
                }
                locusPrimary.setAttribute("fill", "rgba(255, 255, 255, 0.6)");
                locusPrimary.setAttribute("stroke", "rgba(255, 255, 255, 0.8)");
                locusPrimary.setAttribute("stroke-width", "1");
                locusPrimary.style.pointerEvents = 'none';

                sisLeft.appendChild(locusPrimary.cloneNode(true));
                sisRightSide.appendChild(locusPrimary.cloneNode(true));

                const textLeft = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textLeft.setAttribute("class", "gene-text");
                textLeft.setAttribute("x", "0");
                textLeft.setAttribute("y", pairData.size === 'long' ? "-44" : "17");
                textLeft.textContent = labels[j];
                sisLeft.appendChild(textLeft);

                const textRight = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textRight.setAttribute("class", "gene-text");
                textRight.setAttribute("x", "0");
                textRight.setAttribute("y", pairData.size === 'long' ? "-44" : "17");
                textRight.textContent = labels[j];
                sisRightSide.appendChild(textRight);

                // Linked alleles (Advanced Mode)
                if (CellDivisionSimulator.linkageModeActive && pairData.linked) {
                    const linkedLabels = pairData.linked[0].split('/');
                    const linkedTag = linkedLabels[linkageSwaps[i] ? (1 - j) : j];
                    
                    // Secondary Locus Marker
                    const locusSec = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    locusSec.setAttribute("class", "locus-marker locus-secondary");
                    if (pairData.size === 'long') {
                        locusSec.setAttribute("x", "-12"); locusSec.setAttribute("y", "27");
                        locusSec.setAttribute("width", "24"); locusSec.setAttribute("height", "18");
                    } else {
                        locusSec.setAttribute("x", "-10"); locusSec.setAttribute("y", "28");
                        locusSec.setAttribute("width", "20"); locusSec.setAttribute("height", "14");
                    }
                    locusSec.setAttribute("fill", "rgba(255, 255, 255, 0.6)");
                    locusSec.setAttribute("stroke", "rgba(255, 255, 255, 0.8)");
                    locusSec.setAttribute("stroke-width", "1");
                    locusSec.style.pointerEvents = 'none';
                    
                    const linkedL = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    linkedL.setAttribute("class", "gene-text");
                    linkedL.setAttribute("x", "0");
                    linkedL.setAttribute("y", pairData.size === 'long' ? "36" : "35");
                    linkedL.textContent = linkedTag;
                    
                    const linkedR = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    linkedR.setAttribute("class", "gene-text");
                    linkedR.setAttribute("x", "0");
                    linkedR.setAttribute("y", pairData.size === 'long' ? "36" : "35");
                    linkedR.textContent = linkedTag;

                    sisLeft.appendChild(locusSec.cloneNode(true));
                    sisLeft.appendChild(linkedL);
                    sisRightSide.appendChild(locusSec.cloneNode(true));
                    sisRightSide.appendChild(linkedR);
                }

                g.appendChild(sisLeft);
                g.appendChild(sisRightSide);
                
                this.chrGroup.appendChild(g);

                const chrObj = {
                    el: g, sisLeft, sisRight: sisRightSide,
                    pairIndex: i, chrIndex: j,
                    meiosisSide: j === 0 ? meiosisSides[i] : !meiosisSides[i],
                    initialPos: getRandomPos(),
                    isDragging: false, 
                    manualPos: null,
                    manualLeft: null,
                    manualRight: null
                };
                
                // Click with drag-detection
                let dragMoveTotal = 0;
                g.addEventListener('pointerdown', (e) => { 
                    dragMoveTotal = 0; 
                });
                g.addEventListener('pointermove', () => { if (chrObj.isDragging) dragMoveTotal++; });
                g.onclick = () => {
                    if (dragMoveTotal > 10) return;
                    if (CellDivisionSimulator.selectedPairs.has(i)) CellDivisionSimulator.selectedPairs.delete(i);
                    else CellDivisionSimulator.selectedPairs.add(i);
                    window.dispatchEvent(new CustomEvent('chromosome-global-update'));
                };

                this.setupDraggable(chrObj);
                this.chromosomes.push(chrObj);
            }
        }
    }

    stopPlayback() {
        if (this.playTimeout) {
            clearTimeout(this.playTimeout);
            this.playTimeout = null;
        }
    }

    initEventListeners() {
        this.btnPrev.onclick = () => { 
            this.stopPlayback();
            if (this.currentState > 0) { 
                this.chromosomes.forEach(c => {
                    c.manualPos = null;
                    c.manualLeft = null;
                    c.manualRight = null;
                });
                this.currentState--; 
                this.render(); 
            } 
        };
        this.btnNext.onclick = () => { 
            this.stopPlayback();
            const max = this.mode === 'mitosis' ? 5 : 6;
            if (this.currentState < max) { 
                if (this.mode === 'meiosis' && this.currentState === 1) {
                    this.randomizeMeiosisSides();
                }
                this.chromosomes.forEach(c => {
                    c.manualPos = null;
                    c.manualLeft = null;
                    c.manualRight = null;
                });
                this.currentState++; 
                this.render(); 
            } 
        };
        this.btnReset.onclick = () => { 
            this.stopPlayback();
            this.currentState = 0; 
            CellDivisionSimulator.selectedPairs.clear();
            this.initChromosomes();
            this.render(true); 
        };

        // Listen for global settings
        document.getElementById('select-pairs').addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            CellDivisionSimulator.instances.forEach(sim => {
                sim.stopPlayback();
                sim.numPairs = val;
                sim.currentState = 0;
                sim.initChromosomes();
                sim.render(true);
            });
            CellDivisionSimulator.selectedPairs.clear();
        });

        document.getElementById('toggle-highlight').addEventListener('change', (e) => {
            CellDivisionSimulator.focusModeActive = e.target.checked;
            window.dispatchEvent(new CustomEvent('chromosome-global-update'));
        });

        document.getElementById('toggle-alleles').addEventListener('change', (e) => {
            document.body.classList.toggle('hide-alleles', !e.target.checked);
        });

        document.getElementById('toggle-linkage').addEventListener('change', (e) => {
            CellDivisionSimulator.linkageModeActive = e.target.checked;
            CellDivisionSimulator.instances.forEach(sim => {
                sim.stopPlayback();
                sim.initChromosomes();
                sim.render(true);
            });
        });

        document.getElementById('toggle-drag').addEventListener('change', (e) => {
            CellDivisionSimulator.dragModeActive = e.target.checked;
        });

        this.btnPlay.onclick = () => {
            this.stopPlayback();
            const animate = () => {
                const max = this.mode === 'mitosis' ? 5 : 6;
                if (this.currentState < max) {
                    this.btnNext.onclick();
                    this.playTimeout = setTimeout(animate, 2000); 
                } else {
                    this.playTimeout = null;
                }
            };
            animate();
        };

        window.addEventListener('chromosome-global-update', () => {
            this.updateSelectionClasses();
        });
    }

    static focusModeActive = false;
    static linkageModeActive = false;
    static dragModeActive = true;
    static selectedPairs = new Set();
    static instances = [];

    randomizeMeiosisSides() {
        const sides = Array(this.numPairs).fill(0).map(() => Math.random() > 0.5);
        this.chromosomes.forEach(c => {
            if (c.chrIndex === 0) {
                c.meiosisSide = sides[c.pairIndex];
            } else {
                c.meiosisSide = !sides[c.pairIndex];
            }
        });
    }

    updateSelectionClasses() {
        if (CellDivisionSimulator.focusModeActive) {
            this.container.classList.add('focus-active');
        } else {
            this.container.classList.remove('focus-active');
        }

        this.chromosomes.forEach(c => {
            if (CellDivisionSimulator.selectedPairs.has(c.pairIndex)) {
                c.el.classList.add('selected');
            } else {
                c.el.classList.remove('selected');
            }
        });
    }

    setHighlight(active) {
        // Obsolete, handled by updateSelectionClasses
    }

    getMembranePath(state) {
        const NP = this.numPoints;
        if (this.mode === 'mitosis') {
            if (state === 5) {
                let p1 = [], p2 = [];
                for (let i = 0; i < NP; i++) {
                    let a = (i / NP) * Math.PI * 2;
                    p1.push(`${(200 + 190 * Math.cos(a)).toFixed(1)},${(300 + 190 * Math.sin(a)).toFixed(1)}`);
                    p2.push(`${(600 + 190 * Math.cos(a)).toFixed(1)},${(300 + 190 * Math.sin(a)).toFixed(1)}`);
                }
                return `M ${p1.join(" L ")} Z M ${p2.join(" L ")} Z`;
            }
            let pts = [];
            for (let i = 0; i < NP; i++) {
                let a = (i / NP) * Math.PI * 2;
                let x, y;
                if (state <= 1) { x = 400 + 270 * Math.cos(a); y = 300 + 270 * Math.sin(a); }
                else if (state === 2) { x = 400 + 290 * Math.cos(a); y = 300 + 270 * Math.sin(a); }
                else if (state === 3 || state === 4) { x = 400 + 360 * Math.cos(a); y = 300 + 260 * Math.sin(a); }
                pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            }
            return `M ${pts.join(" L ")} Z`;
        } else {
            if (state === 4) {
                let p1 = [], p2 = [];
                for (let i = 0; i < NP; i++) {
                    let a = (i / NP) * Math.PI * 2;
                    p1.push(`${(200 + 180 * Math.cos(a)).toFixed(1)},${(300 + 180 * Math.sin(a)).toFixed(1)}`);
                    p2.push(`${(600 + 180 * Math.cos(a)).toFixed(1)},${(300 + 180 * Math.sin(a)).toFixed(1)}`);
                }
                return `M ${p1.join(" L ")} Z M ${p2.join(" L ")} Z`;
            } else if (state === 5) {
                let p1 = [], p2 = [];
                for (let i = 0; i < NP; i++) {
                    let a = (i / NP) * Math.PI * 2;
                    let r = 180 - 45 * Math.pow(Math.cos(a), 2);
                    p1.push(`${(200 + r * Math.cos(a)).toFixed(1)},${(300 + (r + 95) * Math.sin(a)).toFixed(1)}`);
                    p2.push(`${(600 + r * Math.cos(a)).toFixed(1)},${(300 + (r + 95) * Math.sin(a)).toFixed(1)}`);
                }
                return `M ${p1.join(" L ")} Z M ${p2.join(" L ")} Z`;
            } else if (state === 6) {
                let p1 = [], p2 = [], p3 = [], p4 = [];
                for (let i = 0; i < NP; i++) {
                    let a = (i / NP) * Math.PI * 2;
                    p1.push(`${(200 + 135 * Math.cos(a)).toFixed(1)},${(160 + 135 * Math.sin(a)).toFixed(1)}`);
                    p2.push(`${(200 + 135 * Math.cos(a)).toFixed(1)},${(440 + 135 * Math.sin(a)).toFixed(1)}`);
                    p3.push(`${(600 + 135 * Math.cos(a)).toFixed(1)},${(160 + 135 * Math.sin(a)).toFixed(1)}`);
                    p4.push(`${(600 + 135 * Math.cos(a)).toFixed(1)},${(440 + 135 * Math.sin(a)).toFixed(1)}`);
                }
                return `M ${p1.join(" L ")} Z M ${p2.join(" L ")} Z M ${p3.join(" L ")} Z M ${p4.join(" L ")} Z`;
            } else {
                let pts = [];
                for (let i = 0; i < NP; i++) {
                    let a = (i / NP) * Math.PI * 2;
                    let x, y;
                    if (state <= 1) { x = 400 + 270 * Math.cos(a); y = 300 + 270 * Math.sin(a); }
                    else if (state === 2) { x = 400 + 290 * Math.cos(a); y = 300 + 270 * Math.sin(a); }
                    else if (state === 3) { x = 400 + 370 * Math.cos(a); y = 300 + 250 * Math.sin(a); }
                    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                }
                return `M ${pts.join(" L ")} Z`;
            }
        }
    }

    render(forceInstant = false) {
        if (forceInstant) {
            this.svg.classList.add('no-transition');
            // Trigger reflow
            void this.svg.offsetHeight;
        }

        const state = this.currentState;
        this.renderText(state);
        this.membrane.setAttribute('d', this.getMembranePath(state));
        this.renderNucleus(state);
        this.renderChromosomes(state);

        this.btnPrev.disabled = (state === 0);
        const max = this.mode === 'mitosis' ? 5 : 6;
        this.btnNext.disabled = (state === max);

        if (forceInstant) {
            setTimeout(() => this.svg.classList.remove('no-transition'), 50);
        }
    }

    renderText(state) {
        const mitosisTexts = [
            "State 0: 準備期 (基因型 AaBb...)",
            "State 1: 染色體複製 (DNA 加倍，形成 X 型)",
            "State 2: 中期 - 所有染色體排列於中央",
            "State 3: 後期 - 著絲點分離，姊妹染色分體移向兩極",
            "State 4: 末期 - 新核膜形成",
            "State 5: 完成！產生 2 個雙套 (2n) 子細胞"
        ];
        const meiosisTexts = [
            "State 0: 準備期 (基因型 AaBb...)",
            "State 1: 染色體複製 (DNA 加倍)",
            "State 2: 減 I 中期 - 同源染色體配對排列 (四分體)",
            "State 3: 減 I 後期 - 同源分離，隨機分配至兩極",
            "State 4: 減 II 中期 - 染色體在子細胞中央排列",
            "State 5: 減 II 後期 - 姊妹染色分體分離移向兩極",
            "State 6: 完成！產生 4 個單套 (n) 配子"
        ];
        this.instructionBox.innerText = (this.mode === 'mitosis' ? mitosisTexts : meiosisTexts)[state];
    }

    renderNucleus(state) {
        if (state === 0) {
            this.nucleus.style.opacity = "1";
            this.nucleus.style.transform = "scale(0.85)";
            this.nucleus.style.strokeDasharray = "none";
        } else if (state === 1) {
            this.nucleus.style.opacity = "1";
            this.nucleus.style.transform = "scale(1)";
            this.nucleus.style.strokeDasharray = "10 10";
        } else {
            this.nucleus.style.opacity = "0";
            this.nucleus.style.transform = "scale(1.1)";
        }

        // Mode specific nuclei
        const mitHide = () => this.mitosisNuclei.forEach(n => { n.style.opacity = "0"; });
        const meiHide = () => this.meiosisNuclei.forEach(n => { n.style.opacity = "0"; });

        mitHide();
        meiHide();

        if (this.mode === 'mitosis') {
            if (state === 4) { this.mitosisNuclei.forEach(n => { n.style.opacity = "1"; n.style.strokeDasharray = "8 8"; }); }
            else if (state === 5) { this.mitosisNuclei.forEach(n => { n.style.opacity = "1"; n.style.strokeDasharray = "none"; }); }
        } else {
            if (state === 5) { this.meiosisNuclei.forEach(n => { n.style.opacity = "1"; n.style.strokeDasharray = "8 8"; }); }
            else if (state === 6) { this.meiosisNuclei.forEach(n => { n.style.opacity = "1"; n.style.strokeDasharray = "none"; }); }
        }
    }

    getAutoPos(state, c, idx) {
        let x, y, rot = 0, spread = 0, splitDist = 0, scale = 0.8;
        const isMitosis = (this.mode === 'mitosis');

        if (state === 0) {
            x = c.initialPos.x; y = c.initialPos.y; rot = c.initialPos.rot; scale = 0.8;
        } else if (state === 1) {
            x = c.initialPos.x; y = c.initialPos.y; rot = c.initialPos.rot; spread = 15; scale = 0.8;
        } else if (isMitosis) {
            const totalChr = this.numPairs * 2;
            const offset = (totalChr - 1) / 2;
            const gap = Math.min(40, 240 / (totalChr + 1));
            const stackY = 300 + (idx - offset) * gap;
            if (state === 2) { x = 400; y = stackY; rot = 0; spread = 15; }
            else if (state === 3) { x = 400; y = stackY; rot = 0; splitDist = 180; }
            else if (state >= 4) {
                const totalChr = this.numPairs * 2;
                const offset = (totalChr - 1) / 2;
                const gap = Math.min(45, 260 / (totalChr + 1));
                x = 400 + (idx - offset) * gap;
                y = 300; rot = 0; splitDist = 250; 
            }
        } else {
            const pairOffset = (this.numPairs - 1) / 2;
            const stackY = 300 + (c.pairIndex - pairOffset) * 55;
            if (state === 2) {
                // Closer, tilted pairing for "Tetrad" look
                x = c.meiosisSide ? 394 : 406; 
                y = stackY; 
                rot = c.meiosisSide ? -5 : 5; 
                spread = 15;
            } else if (state === 3) {
                x = c.meiosisSide ? 200 : 600; y = stackY; rot = 0; spread = 15;
            } else if (state === 4) {
                x = c.meiosisSide ? 200 : 600;
                const hOffset = (c.pairIndex - pairOffset) * 45;
                x += hOffset; y = 300; rot = 0; spread = 15;
            } else if (state >= 5) {
                x = c.meiosisSide ? 200 : 600;
                const hOffset = (c.pairIndex - pairOffset) * 40;
                x += hOffset; y = 300; rot = 0; splitDist = 175; 
            }
        }
        return { x, y, rot, spread, splitDist, scale };
    }

    renderChromosomes(state) {
        this.chromosomes.forEach((c, idx) => {
            if (c.isDragging) return;
            const auto = this.getAutoPos(state, c, idx);
            this.applyChrTransform(c, auto.x, auto.y, auto.rot, auto.spread, auto.splitDist, auto.scale, state);
        });
    }

    applyChrTransform(c, x, y, rot, spread, splitDist, scale, state) {
        // Apply manual group override to parent if exists
        let targetX = x, targetY = y;
        if (c.manualPos) {
            targetX = c.manualPos.x;
            targetY = c.manualPos.y;
        }

        c.el.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rot}deg) scale(${scale})`;
        c.sisRight.style.opacity = (state === 0) ? "0" : "1";

        // Sister Left
        if (c.manualLeft) {
            const dx = (c.manualLeft.x - targetX) / scale;
            const dy = (c.manualLeft.y - targetY) / scale;
            c.sisLeft.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg)`;
        } else if (splitDist > 0) {
            let sx = 0, sy = 0;
            if (this.mode === 'meiosis' && state >= 5) sy = -splitDist;
            else sx = -splitDist;
            c.sisLeft.style.transform = `translate(${sx}px, ${sy}px) rotate(0deg)`;
        } else {
            c.sisLeft.style.transform = `rotate(-${spread}deg)`;
        }

        // Sister Right
        if (c.manualRight) {
            const dx = (c.manualRight.x - targetX) / scale;
            const dy = (c.manualRight.y - targetY) / scale;
            c.sisRight.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg)`;
        } else if (splitDist > 0) {
            let sx = 0, sy = 0;
            if (this.mode === 'meiosis' && state >= 5) sy = splitDist;
            else sx = splitDist;
            c.sisRight.style.transform = `translate(${sx}px, ${sy}px) rotate(0deg)`;
        } else {
            c.sisRight.style.transform = `rotate(${spread}deg)`;
        }
    }

    // Add Drag & Drop Logic
    setupDraggable(chrObj) {
        const el = chrObj.el;
        el.style.cursor = 'grab';
        let grabOffset = { x: 0, y: 0 };
        let activeKey = 'manualPos'; 

        const onMove = (e) => {
            if (!chrObj.isDragging) return;
            const pt = this.getSVGPoint(e);
            chrObj[activeKey] = { x: pt.x - grabOffset.x, y: pt.y - grabOffset.y };
            
            const auto = this.getAutoPos(this.currentState, chrObj, this.chromosomes.indexOf(chrObj));
            this.applyChrTransform(chrObj, auto.x, auto.y, auto.rot, auto.spread, auto.splitDist, auto.scale, this.currentState);
        };

        const onUp = () => {
            if (!chrObj.isDragging) return;
            chrObj.isDragging = false;
            el.classList.remove('dragging');
            el.style.cursor = 'grab';
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            
            if (!this.isValidDrop(chrObj[activeKey])) {
                chrObj[activeKey] = null;
                this.render();
            } else {
                if (this.mode === 'meiosis' && this.currentState === 2) {
                    chrObj.meiosisSide = (chrObj.manualPos.x < 400);
                }
            }
        };

        el.addEventListener('pointerdown', (e) => {
            if (!CellDivisionSimulator.dragModeActive) return;
            if (e.button !== 0) return;
            
            const sis = e.target.closest('.sister-left, .sister-right');
            const auto = this.getAutoPos(this.currentState, chrObj, this.chromosomes.indexOf(chrObj));
            
            // Deciding drag level
            if (auto.splitDist > 0 && sis) {
                activeKey = sis.classList.contains('sister-left') ? 'manualLeft' : 'manualRight';
            } else {
                activeKey = 'manualPos';
            }

            e.stopPropagation();
            chrObj.isDragging = true;
            el.classList.add('dragging');
            el.style.cursor = 'grabbing';
            
            const pt = this.getSVGPoint(e);
            let curPos = chrObj[activeKey];
            
            if (!curPos) {
                // If no manual pos yet, start from auto visual pos
                if (activeKey === 'manualPos') {
                    curPos = { x: auto.x, y: auto.y };
                } else if (activeKey === 'manualLeft') {
                    curPos = { x: auto.x - (this.mode === 'meiosis' && this.currentState >= 5 ? 0 : auto.splitDist), 
                               y: auto.y - (this.mode === 'meiosis' && this.currentState >= 5 ? auto.splitDist : 0) };
                } else {
                    curPos = { x: auto.x + (this.mode === 'meiosis' && this.currentState >= 5 ? 0 : auto.splitDist), 
                               y: auto.y + (this.mode === 'meiosis' && this.currentState >= 5 ? auto.splitDist : 0) };
                }
            }
            grabOffset = { x: pt.x - curPos.x, y: pt.y - curPos.y };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    }

    getSVGPoint(e) {
        const p = this.svg.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        return p.matrixTransform(this.svg.getScreenCTM().inverse());
    }

    isValidDrop(pos) {
        // Distance check from nearest nucleus or center
        const targets = this.mode === 'mitosis' 
            ? [{ x: 400, y: 300, r: 270 }, { x: 200, y: 300, r: 190 }, { x: 600, y: 300, r: 190 }]
            : [{ x: 400, y: 300, r: 270 }, { x: 200, y: 160, r: 140 }, { x: 200, y: 440, r: 140 }, { x: 600, y: 160, r: 140 }, { x: 600, y: 440, r: 140 }];
        
        return targets.some(t => {
            const dx = pos.x - t.x;
            const dy = pos.y - t.y;
            return Math.sqrt(dx*dx + dy*dy) < t.r;
        });
    }
}

// Global initialization
let simMitosis, simMeiosis;
function initSimulators() {
    const numPairs = parseInt(document.getElementById('select-pairs').value);
    simMitosis = new CellDivisionSimulator('mitosis-section', 'mitosis', numPairs);
    simMeiosis = new CellDivisionSimulator('meiosis-section', 'meiosis', numPairs);
    
    CellDivisionSimulator.instances = [simMitosis, simMeiosis];

    // Apply default visual states
    const toggleAlleles = document.getElementById('toggle-alleles');
    document.body.classList.toggle('hide-alleles', !toggleAlleles.checked);
    
    CellDivisionSimulator.dragModeActive = document.getElementById('toggle-drag').checked;
}

document.addEventListener('DOMContentLoaded', initSimulators);

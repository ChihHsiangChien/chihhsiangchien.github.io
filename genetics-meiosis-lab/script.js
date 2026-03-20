/**
 * Genetics Lab - Integrated Macro/Micro Logic
 */

// CHROMO_COLORS[pairIndex].father / .mother
// Add more pairs here when adding more chromosome pairs
const CHROMO_COLORS = [
    { father: '#3b82f6', mother: '#ef4444' },  // Pair 0: blue/red
    { father: '#93c5fd', mother: '#fca5a5' },  // Pair 1: light blue/light red
    { father: '#8b5cf6', mother: '#ec4899' },  // Pair 2: purple/pink
];

// Helper: get alleles array from a genotype string and locus
function genotypeToAlleles(geno) {
    if (!geno || geno.length !== 2) return ['A', 'a'];
    return [geno[0], geno[1]]; // 直接將傳入的字串 (如 'Bb') 拆分為 ['B', 'b']
}

class IntegratedLab {
    constructor() {
        this.state = {
            // genes: array of loci — extend this for multi-chromosome support
            genes: [
                { locus: 'A', fatherGeno: 'Aa', motherGeno: 'Aa' },
                { locus: 'B', fatherGeno: 'Bb', motherGeno: 'Bb' },
            ],
            // Legacy convenience props (derived from genes[0]) — kept for backward compat
            father: 'Aa',
            mother: 'Aa',
            phase: 'setup',
            meiosisStep: 0,
            selectedSperm: null,  // will be { A: 'A' } after gamete selection
            selectedEgg:   null,  // will be { A: 'a' } after gamete selection
            devStep: 0,
        };

        this.cacheDOM();
        this.bindEvents();
        this.init();
    }

    cacheDOM() {
        this.btnStart = document.getElementById('btn-start-meiosis');
        this.btnReset = document.getElementById('btn-reset');
        this.stepTools = document.querySelector('.meiosis-step-tools');
        this.stepLabel = document.getElementById('meiosis-step-label');
        this.btnNext = document.getElementById('btn-meiosis-next');
        this.btnPrev = document.getElementById('btn-meiosis-prev');
        this.phaseText = document.getElementById('current-stage-text');
        this.btnFertilize = document.getElementById('btn-fertilize');
        // Dev Nav Buttons
        this.btnDevPrev = document.getElementById('btn-dev-prev');
        this.btnDevNext = document.getElementById('btn-dev-next');
    }

    bindEvents() {
        // Genotype Selectors
        document.querySelectorAll('.genotype-selector button').forEach(btn => {
            btn.onclick = () => {
                if (this.state.phase !== 'setup') return;
                const parent = btn.dataset.parent; // 'father' | 'mother'
                const geno   = btn.dataset.genotype;
                const locus  = btn.dataset.locus || 'A'; // default to first locus

                // UI Toggle
                btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update legacy state prop
                this.state[parent] = geno;
                // Update genes array
                const gene = this.state.genes.find(g => g.locus === locus);
                if (gene) gene[parent === 'father' ? 'fatherGeno' : 'motherGeno'] = geno;

                this.updateMacro(parent);
                this.updateMicro(parent);
            };
        });

        this.btnStart.onclick = () => this.startMeiosis();
        this.btnNext.onclick = () => this.stepMeiosis(1);
        this.btnPrev.onclick = () => this.stepMeiosis(-1);
        this.btnReset.onclick = () => window.location.reload();
        this.btnFertilize.onclick = () => this.handleFertilization();
        
        this.btnDevPrev.onclick = () => {
            if (this.state.devStep > 0) {
                this.state.devStep--;
                this.renderDevStep();
            }
        };
        this.btnDevNext.onclick = () => {
            if (this.state.devStep < 8) {
                this.state.devStep++;
                this.renderDevStep();
            }
        };
    }

    init() {
        this.updateMacro('father');
        this.updateMacro('mother');
        this.updateMicro('father');
        this.updateMicro('mother');
        
        // Reset offspring macro view to empty state
        const offCol = document.getElementById('offspring-macro');
        if (offCol) {
            offCol.classList.add('empty-state');
            const display = document.getElementById('macro-child');
            display.innerHTML = '<span class="placeholder-text">子代外觀預覽</span>';
            offCol.querySelector('.geno-tag').textContent = '';
            offCol.querySelector('.pheno-tag').textContent = '';
        }

        // Reset zygote membrane and clear group
        const zygoteSVG = document.getElementById('svg-zygote');
        const zygoteMembrane = zygoteSVG.querySelector('.cell-membrane');
        const zygoteGroup = zygoteSVG.querySelector('.chromosome-group');
        zygoteGroup.innerHTML = '';
        zygoteGroup.style.opacity = "1";
        zygoteGroup.style.transition = "none";
        
        zygoteMembrane.setAttribute('d', "M 100,100 m -80,0 a 80,80 0 1,0 160,0 a 80,80 0 1,0 -160,0");
        zygoteMembrane.style.transition = "none";

        this.zygoteChromos = []; // Store references for animation
        this.updateTimeline();
    }

    updateMacro(parent) {
        const display = document.getElementById(`macro-${parent}`);
        display.innerHTML = '';
        const geno = this.state[parent];
        const blob = this.createBlob(geno);
        display.appendChild(blob);
    }

    updateMicro(parent) {
        if (!this.sims) this.sims = {};
        // Pass genes array to MeiosisAnimator for multi-locus support
        this.sims[parent] = new MeiosisAnimator(
            `svg-meiosis-${parent}`, parent, this.state.genes
        );
        this.sims[parent].render(0);
    }

    createBlob(genotype) {
        const temp = document.getElementById('blob-template');
        const clone = temp.content.cloneNode(true);
        const sprite = clone.querySelector('.blob-sprite');
        if (genotype === 'aa') sprite.classList.add('phenotype-aa');
        clone.querySelector('.gene-label').textContent = genotype;
        return clone;
    }

    startMeiosis() {
        this.state.phase = 'dividing';
        this.btnStart.classList.add('hidden');
        this.stepTools.classList.remove('hidden');
        this.state.meiosisStep = 1;
        this.updatePhaseText();
        this.stepMeiosis(0); // Trigger first step render
    }

    stepMeiosis(dir) {
        if (dir === 1 && this.state.meiosisStep === 6) {
            // If already at stage 6, check if gametes selected
            if (this.state.selectedSperm && this.state.selectedEgg) {
                this.handleFertilization();
            } else {
                this.phaseText.textContent = "請先從兩側細胞中各選一個配子，再點選確認受精！";
                this.phaseText.style.color = "#f43f5e"; // Focus red
                setTimeout(() => this.phaseText.style.color = "", 1500);
            }
            return;
        }
        if (dir === -1 && this.state.meiosisStep === 0) {
            return; // Stay at 0
        }

        this.state.meiosisStep += dir;
        
        // 當前進到「階段 2 (同源染色體配對)」時，重新為父母雙方擲骰子
        if (dir === 1 && this.state.meiosisStep === 2) {
            this.sims.father.randomizeAssortment();
            this.sims.mother.randomizeAssortment();
        }

        this.stepLabel.textContent = `階段 ${this.state.meiosisStep}`;
        
        this.sims.father.render(this.state.meiosisStep);
        this.sims.mother.render(this.state.meiosisStep);

        this.updatePhaseText();
        this.updateTimeline();

        if (this.state.meiosisStep === 6) {
            this.showGameteWells();
        } else {
            this.hideGameteWells();
        }
    }

    updateTimeline() {
        const isDevActive = (this.state.phase === 'fertilizing' || this.state.phase === 'developing' || this.state.phase === 'born');
        
        // Meiosis Group
        const meiosisGroup = document.getElementById('timeline-meiosis');
        const meiosisItems = document.querySelectorAll('#timeline-meiosis .timeline-item');
        
        // Collapse Meiosis if Development is active
        meiosisGroup.classList.toggle('collapsed', isDevActive);

        meiosisItems.forEach(item => {
            const step = parseInt(item.dataset.step);
            const isActive = (this.state.phase === 'setup' && step === 0) || 
                           ((this.state.phase === 'dividing' || this.state.phase === 'results') && step === this.state.meiosisStep);
            item.classList.toggle('active', isActive);
            
            // Dim future steps
            const isFuture = (this.state.phase === 'setup' && step > 0) || 
                             (this.state.phase === 'dividing' && step > this.state.meiosisStep);
            item.classList.toggle('dimmed-item', isFuture);
        });

        // Development Group
        const devGroup = document.getElementById('timeline-development');
        const devItems = document.querySelectorAll('#timeline-development .timeline-item');
        
        // Expand Development ONLY if it is active
        devGroup.classList.toggle('collapsed', !isDevActive);
        devGroup.classList.toggle('dimmed', !isDevActive);

        devItems.forEach(item => {
            const step = parseInt(item.dataset.devstep);
            const isActive = isDevActive && step === this.state.devStep;
            item.classList.toggle('active', isActive);

            const isFuture = isDevActive && step > this.state.devStep;
            item.classList.toggle('dimmed-item', isFuture);
        });
    }

    updatePhaseText() {
        const texts = [
            "設定親代：請在兩側選擇基因型",
            "減數分裂：DNA 複製 (DNA 加倍)",
            "減 I 中期：同源染色體配對 (四分體)",
            "減 I 後期：同源染色體分離至兩極",
            "減 II 中期：染色體在中央排列",
            "減 II 後期：姊妹染色分體分離至兩極",
            "完成！產生 4 個單套 (n) 配子"
        ];
        
        if (this.state.phase === 'dividing' || this.state.phase === 'setup') {
            this.phaseText.textContent = texts[this.state.meiosisStep] || texts[0];
        } else if (this.state.phase === 'results') {
            this.phaseText.textContent = "請在兩側細胞中各選一個配子 (點選細胞區域)";
        } else if (this.state.phase === 'fertilizing') {
            this.phaseText.textContent = "受精與發育階段";
        } else if (this.state.phase === 'developing') {
            this.phaseText.textContent = "胚胎卵裂發育階段";
        } else if (this.state.phase === 'born') {
            this.phaseText.textContent = "子代個體發育完成！";
        }
    }

    showGameteWells() {
        this.state.phase = 'results';
        this.phaseText.textContent = "請直接點選下方細胞中的配子 (各選一個)";
        
        // Remove old grid logic, interaction happens inside sim
        this.sims.father.enableInteraction((alleleMap) => {
            // alleleMap: { A: 'A' }  (or { A:'A', B:'b' } for multi-locus)
            this.state.selectedSperm = alleleMap;
            this.checkFertilizationReady();
        });
        this.sims.mother.enableInteraction((alleleMap) => {
            this.state.selectedEgg = alleleMap;
            this.checkFertilizationReady();
        });
    }

    hideGameteWells() {
        // Reset interaction
        if (this.sims) {
            this.sims.father.disableInteraction();
            this.sims.mother.disableInteraction();
        }
    }

    generateGametes(parent) {
        const grid = document.getElementById(parent === 'father' ? 'sperm-grid' : 'egg-grid');
        grid.innerHTML = '';
        const alleles = this.sims[parent].alleles;
        
        // Simplified gamete pool: 4 gametes based on the two chromatids of each chromosome
        const pool = [alleles[0], alleles[0], alleles[1], alleles[1]];
        
        pool.forEach((a, i) => {
            const item = document.createElement('div');
            item.className = 'gamete-item';
            const blob = this.createBlob(a === 'A' ? 'A' : 'aa');
            blob.querySelector('.gene-label').textContent = a;
            item.appendChild(blob);
            
            item.onclick = () => {
                grid.querySelectorAll('.gamete-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                if (parent === 'father') this.state.selectedSperm = a;
                else this.state.selectedEgg = a;
                
                this.checkFertilizationReady();
            };
            grid.appendChild(item);
        });
    }

    checkFertilizationReady() {
        if (this.state.selectedSperm && this.state.selectedEgg) {
            this.btnFertilize.textContent = "確定受精";
            this.btnFertilize.classList.remove('hidden');
            this.btnFertilize.classList.add('pulse');
            
            if (this.state.phase === 'born' || this.state.phase === 'fertilizing' || this.state.phase === 'developing') {
                this.resetZygoteView();
                this.state.phase = 'results';
            }
        }
    }

    handleFertilization() {
        this.state.phase = 'fertilizing';
        this.state.devStep = 0;
        this.btnFertilize.classList.add('hidden');
        this.stepTools.classList.add('hidden');
        
        const devTools = document.getElementById('dev-step-tools');
        devTools.classList.remove('hidden');
        
        this.renderDevStep();
        this.updateTimeline();
    }

    renderDevStep() {
        const step = this.state.devStep;
        const zygoteSVG = document.getElementById('svg-zygote');
        const membrane = zygoteSVG.querySelector('.cell-membrane');
        const group = zygoteSVG.querySelector('.chromosome-group');
        let embryoGroup = document.getElementById('embryo-cells-layer');
        if (!embryoGroup) {
            embryoGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            embryoGroup.id = "embryo-cells-layer";
            // Append AFTER chromosome-group → cells render ON TOP → chromosomes appear inside cells
            zygoteSVG.appendChild(embryoGroup);
        }

        // Extract alleles from alleleMap objects { A: 'A', B: 'b' }
        const spermMap = this.state.selectedSperm || {};
        const eggMap   = this.state.selectedEgg   || {};
        // Primary locus for backward-compat display (first gene locus)
        const primaryLocus = this.state.genes[0]?.locus || 'A';
        const f = spermMap[primaryLocus] || 'A';
        const m = eggMap[primaryLocus]   || 'a';
        // Compute child genotype per locus
        const childGenoMap = Object.fromEntries(
            this.state.genes.map(g => {
                const s = spermMap[g.locus] || g.alleles?.[0] || 'A';
                const e = eggMap[g.locus]   || g.alleles?.[0] || 'a';
                return [g.locus, [s, e].sort().join('')];
            })
        );
        const childGeno = childGenoMap[primaryLocus] || 'Aa'; // primary locus for blob display

        // Textual Description mapping
        const stepDescriptions = [
            "階段 0: 配子結合 (受精卵形成)",
            "階段 1: 有絲分裂 - 中期 (染色體複製排列)",
            "階段 2: 有絲分裂 - 後期 (染色體分離至兩極)",
            "階段 3: 分裂完成 (兩個子細胞期)",
            "階段 4: 胚胎發育 - 4 細胞期",
            "階段 5: 胚胎發育 - 12 細胞期",
            "階段 6: 胚胎發育 - 桑葚胚 (20+ 實心球體)",
            "階段 7: 發育完成 (子代個體)"
        ];

        document.getElementById('dev-step-label').textContent = `階段 ${step}`;
        this.btnDevPrev.disabled = (step === 0);
        this.btnDevNext.disabled = (step === 8);
        this.updatePhaseText();
        this.updateTimeline();

        // Standard Reset
        membrane.style.transition = "all 0.6s ease";
        
        // Logical visibility and clearing
        if (step <= 4) {
            // Mitosis + 2-cell stages (0-4): Show chromosomes
            membrane.style.display = (step < 4) ? "block" : "none";
            group.style.display = "block"; // Always show chromosomes in steps 0-4
            embryoGroup.innerHTML = ''; 
            embryoGroup.style.display = (step === 4) ? "block" : "none";
        } else if (step >= 5 && step <= 7) {
             // Cleavage stages (5-7): Show cells, hide original chromosomes
             membrane.style.display = "none";
             group.style.display = "none";
             embryoGroup.innerHTML = ''; // ALWAYS clear previous stage cells
             embryoGroup.style.display = "block";
        } else {
             // Born stage (8)
             group.style.display = "none";
             embryoGroup.style.display = "none";
             membrane.style.display = "none";
        }

        // Ensure embryo gradient is defined in the SVG defs
        let zygSVG = document.getElementById('svg-zygote');
        if (!zygSVG.querySelector('#cellGrad3D')) {
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            defs.innerHTML = `
                <radialGradient id="cellGrad3D" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#fff5c0" stop-opacity="0.95"/>
                    <stop offset="40%" stop-color="#f0a820" stop-opacity="0.82"/>
                    <stop offset="100%" stop-color="#8b5e00" stop-opacity="0.70"/>
                </radialGradient>`;
            zygSVG.insertBefore(defs, zygSVG.firstChild);
        }

        const createCell = (x, y, r, showChromos = false) => {
            // Outer cell body with 3D gradient
            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r);
            c.setAttribute("fill", "url(#cellGrad3D)");
            c.setAttribute("stroke", "rgba(180,130,0,0.7)");
            c.setAttribute("stroke-width", "1.5");
            c.style.transition = "all 0.5s ease";
            embryoGroup.appendChild(c);
            // Inner highlight (specular glint)
            const hi = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hi.setAttribute("cx", x - r * 0.28); hi.setAttribute("cy", y - r * 0.28);
            hi.setAttribute("r", r * 0.22);
            hi.setAttribute("fill", "rgba(255,255,220,0.55)");
            hi.setAttribute("pointer-events", "none");
            embryoGroup.appendChild(hi);
            // Optional mini chromosome indicators
            if (showChromos) {
                const rFactor = r * 0.18;
                const pairOffset = (this.state.genes.length - 1) / 2;
                this.state.genes.forEach((g, pairIdx) => {
                    const sz = Math.max(rFactor * (pairIdx === 1 ? 0.7 : 1), 5); // 第二對縮小 0.7 倍
                    const w = sz * 0.45;
                    const colors = [CHROMO_COLORS[pairIdx].father, CHROMO_COLORS[pairIdx].mother];
                    const alleles = [spermMap[g.locus] || g.locus, eggMap[g.locus] || g.locus.toLowerCase()];
                    const dy = (pairIdx - pairOffset) * (sz * 2.2); // 垂直排開多對染色體

                    [-1, 1].forEach((dir, i) => {
                        const cy = y + dy;
                        const finalCx = x + dir * (r * 0.22);

                        [-1, 1].forEach(arm => {
                            const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                            pill.setAttribute("x", finalCx - w / 2);
                            pill.setAttribute("y", cy + arm * (sz * 0.15));
                            pill.setAttribute("width", w);
                            pill.setAttribute("height", sz * 0.7);
                            pill.setAttribute("rx", w / 2);
                            pill.setAttribute("fill", colors[i]);
                            pill.setAttribute("opacity", "0.88");
                            embryoGroup.appendChild(pill);
                        });
                        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        dot.setAttribute("cx", finalCx); dot.setAttribute("cy", cy);
                        dot.setAttribute("r", w * 0.55);
                        dot.setAttribute("fill", "#fff"); dot.setAttribute("opacity", "0.85");
                        embryoGroup.appendChild(dot);
                        
                        if (r > 30) {
                            const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            lbl.setAttribute("x", finalCx); lbl.setAttribute("y", cy - sz * 0.85);
                            lbl.setAttribute("text-anchor", "middle");
                            lbl.setAttribute("font-size", sz * 0.85);
                            lbl.setAttribute("font-weight", "bold");
                            lbl.setAttribute("fill", "white");
                            lbl.setAttribute("opacity", "0.9");
                            lbl.textContent = alleles[i];
                            embryoGroup.appendChild(lbl);
                        }
                    });
                });
            }
        };

        switch(step) {
            case 0: // Fertilization — single large cell
                this.renderZygoteLayers(spermMap, eggMap, 'start');
                // Disable transition so the membrane appears instantly (avoids sliding-in from top-left)
                membrane.style.transition = "none";
                membrane.setAttribute('d', "M 200,150 m -135,0 a 135,135 0 1,0 270,0 a 135,135 0 1,0 -270,0");
                membrane.style.fill = "rgba(74,144,226,0.1)";
                // Re-enable transition after browser has painted this frame
                requestAnimationFrame(() => { membrane.style.transition = "all 0.6s ease"; });
                break;
            case 1: // DNA Replication
                this.renderZygoteLayers(spermMap, eggMap, 'replication');
                break;
            case 2: // Metaphase
                this.renderZygoteLayers(spermMap, eggMap, 'metaphase');
                break;
            case 3: // Anaphase
                this.renderZygoteLayers(spermMap, eggMap, 'anaphase');
                break;
            case 4: // 2-Cell期 — left and right daughter cells (peanut shape)
                this.renderZygoteLayers(spermMap, eggMap, 'telophase');
                // Centers at x=100/300 (distance=200), r=108 → overlap by 16px → peanut shape
                [100, 300].forEach(x => createCell(x, 150, 108));
                break;
            case 5: { // 4-Cell期 — overlapping 2×2, no center gap
                const r4 = 78;
                // To cover center: h < r/√2 ≈ 0.707r. Use 0.62r so cells overlap visibly.
                const h4 = Math.round(r4 * 0.62); // ≈ 48
                [[200-h4, 150-h4],[200+h4, 150-h4],
                 [200-h4, 150+h4],[200+h4, 150+h4]]
                    .forEach(p => createCell(p[0], p[1], r4, true));
                break;
            }
            case 6: { // 12-Cell期 — tight hexagonal-ish cluster
                const r12 = 42;
                // 3 rows: top(3), middle(4), bottom(3), inner(2)
                const cx12 = [
                    // Outer ring ~8 cells
                    [200,      150-r12*1.9],
                    [200-r12*1.73, 150-r12*0.95],
                    [200+r12*1.73, 150-r12*0.95],
                    [200-r12*1.73, 150+r12*0.95],
                    [200+r12*1.73, 150+r12*0.95],
                    [200,      150+r12*1.9],
                    [200-r12*0.9,  150-r12*0.95],
                    [200+r12*0.9,  150-r12*0.95],
                    [200-r12*0.9,  150+r12*0.95],
                    [200+r12*0.9,  150+r12*0.95],
                    [200,      150],
                    [200, 150-r12*0.1], // extra
                ];
                cx12.slice(0,12).forEach(p => createCell(p[0], p[1], r12, true));
                break;
            }
            case 7: { // Morula — tight spherical cluster, 13 cells max
                const rm = 38;
                const dx = rm * 1.82, dy = rm * 1.58;
                const morulaPos = [
                    // Center
                    [200, 150],
                    // Inner ring (6 cells, snugly touching center)
                    [200 + dx,     150],
                    [200 - dx,     150],
                    [200 + dx*0.5, 150 - dy],
                    [200 - dx*0.5, 150 - dy],
                    [200 + dx*0.5, 150 + dy],
                    [200 - dx*0.5, 150 + dy],
                    // Outer ring (6 cells)
                    [200 + dx,     150 - dy],
                    [200 - dx,     150 - dy],
                    [200 + dx,     150 + dy],
                    [200 - dx,     150 + dy],
                    [200,          150 - dy*1.85],
                    [200,          150 + dy*1.85],
                ];
                morulaPos.forEach(p => createCell(p[0], p[1], rm, true));
                break;
            }
            case 8: // Born
                this.state.phase = 'born';
                const off = document.getElementById('offspring-macro');
                off.classList.remove('empty-state');
                const display = document.getElementById('macro-child');
                display.innerHTML = '';
                display.appendChild(this.createBlob(childGeno));
                off.querySelector('.geno-tag').textContent = `基因型: ${childGeno}`;
                off.querySelector('.pheno-tag').textContent = childGeno.includes('A') ? "顯性表現型" : "隱性表現型";
                document.getElementById('dev-step-tools').classList.add('hidden');
                document.getElementById('btn-reset').classList.remove('hidden');
                break;
        }
    }

    renderZygoteLayers(spermMap, eggMap, stage = 'start') {
        const svg = document.getElementById('svg-zygote');
        const group = svg.querySelector('.chromosome-group');
        
        // Build persistent structure once (mirrors MeiosisAnimator pattern exactly)
        if (!this.zygoteChromos || this.zygoteChromos.length === 0) {
            group.innerHTML = '';
            this.zygoteChromos = [];
            this.state.genes.forEach((gene, pairIndex) => {
                const alleles = [spermMap[gene.locus] || gene.locus, eggMap[gene.locus] || gene.locus.toLowerCase()];
                alleles.forEach((a, side) => {
                    const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    el.setAttribute("class", "zygote-chromo");
                    
                    const sisL = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    sisL.setAttribute("class", "sister-chromatid");
                    const sisR = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    sisR.setAttribute("class", "sister-chromatid");

                    [sisL, sisR].forEach((sis, j) => {
                        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                        use.setAttribute("href", "#chromatid-template");
                        use.style.color = (side === 0 ? CHROMO_COLORS[pairIndex].father : CHROMO_COLORS[pairIndex].mother);
                        sis.appendChild(use);
                        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        text.setAttribute("x", "0"); text.setAttribute("y", "-18");
                        text.setAttribute("class", "gene-text"); text.setAttribute("text-anchor", "middle");
                        text.textContent = a;
                        if (j === 1) text.setAttribute("transform", "scale(-1, 1)");
                        sis.appendChild(text);
                    });

                    el.appendChild(sisL); el.appendChild(sisR);
                    group.appendChild(el);
                    this.zygoteChromos.push({ el, sisL, sisR, allele: a, side, pairIndex });
                });
            });
        }

        const ease = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
        const replicationEase = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";

        const totalChromos = this.zygoteChromos.length;
        const pairOffset = (this.state.genes.length - 1) / 2;

        this.zygoteChromos.forEach((c, i) => {
            let x, y, splitL = 0, splitR = 0;
            let sisROpacity = 1;
            
            // 第二對染色體等比例縮小為 0.55
            const baseScale = c.pairIndex === 1 ? 0.55 : 0.8;
            const scale = baseScale;

            const stackY = 150 + (c.pairIndex - pairOffset) * 45; // 受精與複製時上下排列
            const metaY = 150 + (i - (totalChromos - 1) / 2) * 35; // 中期所有染色體排成一直線
            const startY = 150 + (c.pairIndex - pairOffset) * 15; // 階段 0 時較為接近
            const startXBase = 200 + (c.pairIndex - pairOffset) * 80; // 階段 0 依對數水平分散

            if (stage === 'start') {
                x = c.side === 0 ? startXBase - 18 : startXBase + 18; y = startY;
                sisROpacity = 0;
            } else if (stage === 'replication') {
                x = c.side === 0 ? 180 : 220; y = stackY;
                sisROpacity = 1;
            } else if (stage === 'metaphase') {
                x = 200; y = metaY;
                splitL = -5; splitR = 5;
                sisROpacity = 1;
            } else if (stage === 'anaphase') {
                x = 200; y = metaY;
                sisROpacity = 1;
            } else if (stage === 'telophase') {
                // 子細胞成形，再度將兩對染色體緊密堆疊在中心 (x=100/300 由 split 達成)
                const tightY = 150 + (i - (totalChromos - 1) / 2) * 20; 
                x = 200; y = tightY;
                splitL = 0; splitR = 0;
                sisROpacity = 1;
            }

            const splitX = (stage === 'anaphase') ? 85 : (stage === 'telophase') ? 100 : 0;

            // Use the horizontal splitX to override splitL/splitR for anaphase and telophase
            const finalSplitL = (stage === 'anaphase' || stage === 'telophase') ? -splitX : splitL;
            const finalSplitR = (stage === 'anaphase' || stage === 'telophase') ?  splitX : splitR;

            // CSS transform (px = SVG user-space units)
            c.el.style.transition = ease;
            c.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

            const rotL = (stage === 'replication') ? -10 : 0;
            const rotR = (stage === 'replication') ?  10 : 0;

            c.sisL.style.transition = stage === 'replication' ? replicationEase : ease;
            c.sisL.style.transform = `translate(${finalSplitL}px, 0) rotate(${rotL}deg)`;

            c.sisR.style.transition = stage === 'replication' ? replicationEase : ease;
            c.sisR.style.transform = `translate(${finalSplitR}px, 0) scaleX(-1) rotate(${-rotR}deg)`;
            c.sisR.style.opacity = sisROpacity;


        });
    }

    resetZygoteView() {
        const zygoteSVG = document.getElementById('svg-zygote');
        const membrane = zygoteSVG.querySelector('.cell-membrane');
        const group = zygoteSVG.querySelector('.chromosome-group');
        const embryoGroup = document.getElementById('embryo-cells-layer');
        if (embryoGroup) embryoGroup.innerHTML = '';
        document.getElementById('dev-step-tools').classList.add('hidden');
        this.btnFertilize.classList.add('hidden');

        group.innerHTML = '';
        this.zygoteChromos = null; // Force rebuild next time renderZygoteLayers is called
        group.style.opacity = "1";
        group.style.display = "block";
        membrane.setAttribute('d', "M 200,150 m -135,0 a 135,135 0 1,0 270,0 a 135,135 0 1,0 -270,0");
        membrane.style.fill = "none";
        membrane.style.display = "block";
    }
}


class MeiosisAnimator {
    constructor(svgId, type, genes) {
        this.svg = document.getElementById(svgId);
        this.chrGroup = this.svg.querySelector('.chromosome-group');
        this.membrane = this.svg.querySelector('.cell-membrane');
        this.nucleus = this.svg.querySelector('.nucleus');
        this.type = type;  // 'father' | 'mother'

        // Support both legacy (string) and new (genes array) constructor signature
        if (typeof genes === 'string') {
            // Legacy: single genotype string e.g. 'Aa'
            this.genes = [{ locus: 'A', alleles: genotypeToAlleles(genes) }];
        } else {
            // New: genes array [{ locus:'A', fatherGeno:'Aa', motherGeno:'Aa' }, ...]
            this.genes = genes.map(g => ({
                locus: g.locus,
                alleles: genotypeToAlleles(type === 'father' ? g.fatherGeno : g.motherGeno)
            }));
        }

        this.init();
    }

    // 新增：重新擲骰子決定獨立分配方向
    randomizeAssortment() {
        this.assortmentFlips = this.genes.map(() => Math.random() < 0.5);
    }

    init() {
        // Clear previous state elements
        this.chrGroup.innerHTML = '';
        this.svg.querySelectorAll('.gamete-cell-interactive').forEach(el => el.remove());
        
        // Reset membrane
        this.membrane.setAttribute('d', this.getPath(0));
        this.nucleus.style.opacity = "1";
        this.nucleus.style.transform = "scale(0.85)";

        // 隨機決定每對同源染色體的分離方向 (為未來的獨立分配定律做準備)
        this.assortmentFlips = this.genes.map(() => Math.random() < 0.5);

        this.chromos = [];
        // Dynamic positions: n pairs side-by-side
        const getFixedPos = (index, total) => {
            const spacing = Math.min(45, 160 / Math.max(total, 2));
            return { x: 200 + (index - (total - 1) / 2) * spacing, y: 150 };
        };

        // Build chromos: for each gene locus, create 2 chromatid groups (one per allele)
        // alleles[0] = first chromosome, alleles[1] = homolog
        const totalChromos = this.genes.length * 2;
        this.genes.forEach((gene, pairIdx) => {
            gene.alleles.forEach((a, chromoInPair) => {
                const globalIdx = pairIdx * 2 + chromoInPair;
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "chromosome-interactive");
                const sisL = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisL.setAttribute("class", "sister-chromatid");
                const sisR = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisR.setAttribute("class", "sister-chromatid");

                [sisL, sisR].forEach((sis, j) => {
                    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                    use.setAttribute("href", "#chromatid-template");
                    // Use pairIdx for color selection
                    const colorPair = CHROMO_COLORS[pairIdx] || CHROMO_COLORS[0];
                    use.style.color = colorPair[this.type];
                    sis.appendChild(use);
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", "0"); text.setAttribute("y", "-18");
                    text.setAttribute("class", "gene-text"); text.setAttribute("text-anchor", "middle");
                    text.textContent = a;
                    if (j === 1) text.setAttribute("transform", "scale(-1, 1)");
                    sis.appendChild(text);
                    sis.dataset.allele = a;
                    sis.dataset.locus  = gene.locus;
                });

                g.appendChild(sisL); g.appendChild(sisR);
                this.chrGroup.appendChild(g);

                const pos = getFixedPos(globalIdx, totalChromos);
                this.chromos.push({
                    el: g, sisL, sisR, pos,
                    side: (chromoInPair === 0),   // which homolog: true=first, false=second
                    pairIndex: pairIdx,
                    locus: gene.locus,
                    allele: a
                });
            });
        });
    }

    enableInteraction(onSelect) {
        // 4 gamete cells based on Path definition
        const cells = [
            { x: 100, y: 75 },
            { x: 100, y: 225 },
            { x: 300, y: 75 },
            { x: 300, y: 225 }
        ];
        // Map each cell to its alleleMap {locus: allele} based on which sisL/sisR it gets
        // Cell top-left and top-right get sisL of chromos[0] and chromos[1]
        // Cell bottom-left and bottom-right get sisR of chromos[0] and chromos[1]
        // For simplicity with 1 pair: [0]=chromos[0].sisL, [1]=chromos[0].sisR, [2]=chromos[1].sisL, [3]=chromos[1].sisR
        // Actually matching the existing 4-cell positions:
        // x=100,y=75  → chromos[0].sisL (left-top)
        // x=100,y=225 → chromos[0].sisR (left-bottom)
        // x=300,y=75  → chromos[1].sisL (right-top)
        // x=300,y=225 → chromos[1].sisR (right-bottom)
        // For multi-pair: build alleleMap per gamete cell (each receives one allele per locus)
        // With 1 pair: 4 gametes as before
        // With 2 pairs: gamete alleleMap = { A: sisX.allele, B: sisY.allele }
        const gameteAlleles = [
            // top-left: 分配到左側細胞的染色體的第一條姊妹染色分體
            Object.fromEntries(this.genes.map((g, pi) => {
                const leftChromo = this.assortmentFlips[pi] ? this.chromos[pi*2+1] : this.chromos[pi*2];
                return [g.locus, leftChromo.sisL.dataset.allele];
            })),
            // bottom-left: 分配到左側細胞的染色體的第二條姊妹染色分體
            Object.fromEntries(this.genes.map((g, pi) => {
                const leftChromo = this.assortmentFlips[pi] ? this.chromos[pi*2+1] : this.chromos[pi*2];
                return [g.locus, leftChromo.sisR.dataset.allele];
            })),
            // top-right: 分配到右側細胞的染色體的第一條姊妹染色分體
            Object.fromEntries(this.genes.map((g, pi) => {
                const rightChromo = this.assortmentFlips[pi] ? this.chromos[pi*2] : this.chromos[pi*2+1];
                return [g.locus, rightChromo.sisL.dataset.allele];
            })),
            // bottom-right: 分配到右側細胞的染色體的第二條姊妹染色分體
            Object.fromEntries(this.genes.map((g, pi) => {
                const rightChromo = this.assortmentFlips[pi] ? this.chromos[pi*2] : this.chromos[pi*2+1];
                return [g.locus, rightChromo.sisR.dataset.allele];
            }))
        ];

        this.hitAreas = [];
        cells.forEach((c, idx) => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", c.x); circle.setAttribute("cy", c.y);
            circle.setAttribute("r", "70");
            circle.setAttribute("class", "gamete-cell-interactive");
            circle.setAttribute("fill", "rgba(255,255,255,0.01)");
            circle.setAttribute("stroke", "rgba(255,255,255,0.1)");

            circle.onclick = () => {
                this.hitAreas.forEach(h => h.classList.remove('gamete-cell-selected'));
                circle.classList.add('gamete-cell-selected');
                onSelect(gameteAlleles[idx]);  // pass alleleMap object
            };
            this.svg.appendChild(circle);
            this.hitAreas.push(circle);
        });
    }

    disableInteraction() {
        if (this.hitAreas) {
            this.hitAreas.forEach(h => h.remove());
            this.hitAreas = [];
        }
    }

    render(state) {
        // Nucleus appearance
        if (state === 0) {
            this.nucleus.style.opacity = "1";
            this.nucleus.style.transform = "scale(0.75)"; // Inside membrane
            this.nucleus.style.strokeDasharray = "none";
        } else if (state === 1) {
            this.nucleus.style.opacity = "1";
            this.nucleus.style.transform = "scale(0.9)"; // Near membrane
            this.nucleus.style.strokeDasharray = "5,5";
        } else {
            this.nucleus.style.opacity = "0";
            this.nucleus.style.transform = "scale(1.1)";
        }

        this.membrane.setAttribute('d', this.getPath(state));

        const totalPairs = this.genes.length;

        this.chromos.forEach((c, idx) => {
            let x = 200, y = 150, rot = 0, split = 0;
            let scale = c.pairIndex === 1 ? 0.55 : 0.8; // 給予第二對染色體較小的比例
            let sisROpacity = 1;
            let sisRScale = 1;
            let localRot = (state >= 6) ? -90 : 0; // Rotate back to vertical at the end

            // 決定此染色體是否往左極移動 (根據獨立分配隨機翻轉)
            const flip = this.assortmentFlips[c.pairIndex];
            const goesLeft = flip ? !c.side : c.side;

            const pairOffset = (totalPairs - 1) / 2;
            const stackY = 150 + (c.pairIndex - pairOffset) * 45;
            const stackX = (c.pairIndex - pairOffset) * 35; // 階段4~6 轉向90度時的水平防重疊位移
            const startY = 150 + (c.pairIndex - pairOffset) * 15; // 階段 0 時較為接近
            const startXBase = 200 + (c.pairIndex - pairOffset) * 80; // 階段 0 依對數水平分散

            if (state === 0) {
                x = c.side ? startXBase - 18 : startXBase + 18; y = startY; rot = 0;
                sisROpacity = 0; sisRScale = 0;
            } else if (state === 1) {
                x = c.side ? 180 : 220; y = stackY; rot = 0;
                sisROpacity = 1; sisRScale = 1;
            } else if (state === 2) {
                // Tilted Pairing (Tetrad look) - 此時表現出隨機排列
                x = goesLeft ? 194 : 206; 
                y = stackY; 
                rot = goesLeft ? -7 : 7; 
                sisROpacity = 1;
            } else if (state === 3) {
                // Separation to sides
                x = goesLeft ? 100 : 300; 
                y = stackY; 
                rot = 0;
            } else if (state === 4) {
                // Metaphase II
                x = (goesLeft ? 100 : 300) + stackX; 
                y = 150; 
                rot = 90;
            } else if (state === 5) {
                // Anaphase II
                x = (goesLeft ? 100 : 300) + stackX; 
                y = 150; 
                rot = 90; 
                split = 65;
            } else if (state >= 6) {
                // Finished
                x = (goesLeft ? 100 : 300) + stackX; 
                y = 150; 
                rot = 90; 
                split = 85; 
            }

            c.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale * 1.2})`;
            c.sisL.style.transform = `translate(${-split * 1.1}px, 0) rotate(${localRot}deg)`;
            c.sisR.style.transform = `translate(${split * 1.1}px, 0) scale(${sisRScale}, 1) scaleX(-1) rotate(${-localRot}deg)`;
            c.sisR.style.opacity = sisROpacity;
            c.sisR.style.transition = state === 1 ? "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" : "all 0.6s ease";
        });
    }

    getPath(state) {
        if (state < 3) return "M 200,150 m -135,0 a 135,135 0 1,0 270,0 a 135,135 0 1,0 -270,0";
        if (state >= 3 && state < 5) {
            // Two cells elongated or separated
            return "M 100,150 m -95,0 a 95,95 0 1,0 190,0 a 95,95 0 1,0 -190,0 M 300,150 m -95,0 a 95,95 0 1,0 190,0 a 95,95 0 1,0 -190,0";
        }
        // Result: 4 cells (Starts from State 5)
        return "M 100,75 m -70,0 a 70,70 0 1,0 140,0 a 70,70 0 1,0 -140,0 M 100,225 m -70,0 a 70,70 0 1,0 140,0 a 70,70 0 1,0 -140,0 M 300,75 m -70,0 a 70,70 0 1,0 140,0 a 70,70 0 1,0 -140,0 M 300,225 m -70,0 a 70,70 0 1,0 140,0 a 70,70 0 1,0 -140,0";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.lab = new IntegratedLab();
});

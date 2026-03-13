/**
 * Genetics Lab - Integrated Macro/Micro Logic
 */

// CHROMO_COLORS[pairIndex].father / .mother
// Add more pairs here when adding more chromosome pairs
const CHROMO_COLORS = [
    { father: '#3b82f6', mother: '#ef4444' },  // Pair 0: blue/red
    { father: '#10b981', mother: '#f59e0b' },  // Pair 1: green/amber
    { father: '#8b5cf6', mother: '#ec4899' },  // Pair 2: purple/pink
];

// Helper: get alleles array from a genotype string and locus
function genotypeToAlleles(geno) {
    if (geno === 'AA') return ['A', 'A'];
    if (geno === 'aa') return ['a', 'a'];
    return ['A', 'a']; // 'Aa'
}

class IntegratedLab {
    constructor() {
        this.state = {
            // genes: array of loci — extend this for multi-chromosome support
            genes: [
                { locus: 'A', fatherGeno: 'Aa', motherGeno: 'Aa' },
                // { locus: 'B', fatherGeno: 'Bb', motherGeno: 'Bb' },  ← add pairs here
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
                const sz = Math.max(r * 0.18, 7); // chromosome pill height
                const w = sz * 0.45;               // pill width
                const colors = [CHROMO_COLORS[0].father, CHROMO_COLORS[0].mother];
                const alleles = [f, m];
                [-1, 1].forEach((dir, i) => {
                    const cx = x + dir * sz * 0.65;
                    // Chromosome pill (two arms)
                    [-1, 1].forEach(arm => {
                        const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        pill.setAttribute("x", cx - w / 2);
                        pill.setAttribute("y", y + arm * (sz * 0.15));
                        pill.setAttribute("width", w);
                        pill.setAttribute("height", sz * 0.7);
                        pill.setAttribute("rx", w / 2);
                        pill.setAttribute("fill", colors[i]);
                        pill.setAttribute("opacity", "0.88");
                        embryoGroup.appendChild(pill);
                    });
                    // Centromere dot
                    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    dot.setAttribute("cx", cx); dot.setAttribute("cy", y);
                    dot.setAttribute("r", w * 0.55);
                    dot.setAttribute("fill", "#fff"); dot.setAttribute("opacity", "0.85");
                    embryoGroup.appendChild(dot);
                    // Allele label
                    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    lbl.setAttribute("x", cx); lbl.setAttribute("y", y - sz * 0.85);
                    lbl.setAttribute("text-anchor", "middle");
                    lbl.setAttribute("font-size", sz * 0.85);
                    lbl.setAttribute("font-weight", "bold");
                    lbl.setAttribute("fill", "white");
                    lbl.setAttribute("opacity", "0.9");
                    lbl.textContent = alleles[i];
                    embryoGroup.appendChild(lbl);
                });
            }
        };

        switch(step) {
            case 0: // Fertilization — single large cell
                this.renderZygoteLayers(f, m, 'start');
                // Disable transition so the membrane appears instantly (avoids sliding-in from top-left)
                membrane.style.transition = "none";
                membrane.setAttribute('d', "M 200,150 m -135,0 a 135,135 0 1,0 270,0 a 135,135 0 1,0 -270,0");
                membrane.style.fill = "rgba(74,144,226,0.1)";
                // Re-enable transition after browser has painted this frame
                requestAnimationFrame(() => { membrane.style.transition = "all 0.6s ease"; });
                break;
            case 1: // DNA Replication
                this.renderZygoteLayers(f, m, 'replication');
                break;
            case 2: // Metaphase
                this.renderZygoteLayers(f, m, 'metaphase');
                break;
            case 3: // Anaphase
                this.renderZygoteLayers(f, m, 'anaphase');
                break;
            case 4: // 2-Cell期 — left and right daughter cells (peanut shape)
                this.renderZygoteLayers(f, m, 'telophase');
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

    renderZygoteLayers(f, m, stage = 'start') {
        const svg = document.getElementById('svg-zygote');
        const group = svg.querySelector('.chromosome-group');
        const alleles = [f, m];
        
        // Build persistent structure once (mirrors MeiosisAnimator pattern exactly)
        if (!this.zygoteChromos || this.zygoteChromos.length === 0) {
            group.innerHTML = '';
            this.zygoteChromos = alleles.map((a, i) => {
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "zygote-chromo");
                
                const sisL = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisL.setAttribute("class", "sister-chromatid");
                const sisR = document.createElementNS("http://www.w3.org/2000/svg", "g");
                sisR.setAttribute("class", "sister-chromatid");

                [sisL, sisR].forEach((sis, j) => {
                    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                    use.setAttribute("href", "#chromatid-template");
                    use.style.color = (i === 0 ? CHROMO_COLORS[0].father : CHROMO_COLORS[0].mother);
                    sis.appendChild(use);
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", "0"); text.setAttribute("y", "-16");
                    text.setAttribute("class", "gene-text"); text.setAttribute("text-anchor", "middle");
                    text.textContent = a;
                    if (j === 1) text.setAttribute("transform", "scale(-1, 1)");
                    sis.appendChild(text);
                });

                g.appendChild(sisL); g.appendChild(sisR);
                group.appendChild(g);
                return { el: g, sisL, sisR, allele: a, side: i };
            });
        }

        // Now viewBox matches meiosis SVG (400×300), center = (200,150)
        // Same scale as MeiosisAnimator: 0.8 * 1.2 = 0.96
        const scale = 0.8;
        const ease = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
        const replicationEase = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";

        this.zygoteChromos.forEach((c) => {
            let x, y, splitL = 0, splitR = 0;
            let sisROpacity = 1;

            if (stage === 'start') {
                // Fertilization: father left (180), mother right (220), matching meiosis getFixedPos
                x = c.side === 0 ? 180 : 220; y = 150;
                sisROpacity = 0;
            } else if (stage === 'replication') {
                // DNA Replication: centromeres overlap, arms splay ±10°
                x = c.side === 0 ? 180 : 220; y = 150;
                sisROpacity = 1;
            } else if (stage === 'metaphase') {
                // Metaphase: both at center x=200, one above (y=110) one below (y=190)
                x = 200; y = c.side === 0 ? 110 : 190;
                splitL = -5; splitR = 5;
                sisROpacity = 1;
            } else if (stage === 'anaphase') {
                // Anaphase: el STAYS at metaphase y, sisL/sisR separate HORIZONTALLY
                // Father (y=110) and Mother (y=190) both split their sisters left ← and right →
                // Left pole: Father's sisL + Mother's sisL
                // Right pole: Father's sisR + Mother's sisR → each daughter gets Aa ✓
                x = 200; y = c.side === 0 ? 110 : 190;
                sisROpacity = 1;
            } else if (stage === 'telophase') {
                // Telophase: offset el.x by ±15 so father/mother land at different X in each cell
                // Father (side=0): el.x=185 → sisL at 185-100=85, sisR at 185+100=285
                // Mother (side=1): el.x=215 → sisL at 215-100=115, sisR at 215+100=315
                // (SVG x = el.x ± splitX × scale = el.x ± 125×0.8 = el.x ± 100)
                x = c.side === 0 ? 185 : 215; y = 150;
                splitL = 0; splitR = 0;
                sisROpacity = 1;
            }

            // Horizontal split: sisL → LEFT pole, sisR → RIGHT pole
            // Anaphase = mid-travel, Telophase = fully at daughter cell centers (±125 from x=200)
            const splitX = (stage === 'anaphase') ? 85 : (stage === 'telophase') ? 125 : 0;

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

    init() {
        // Clear previous state elements
        this.chrGroup.innerHTML = '';
        this.svg.querySelectorAll('.gamete-cell-interactive').forEach(el => el.remove());
        
        // Reset membrane
        this.membrane.setAttribute('d', this.getPath(0));
        this.nucleus.style.opacity = "1";
        this.nucleus.style.transform = "scale(0.85)";

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
                    text.setAttribute("x", "0"); text.setAttribute("y", "-16");
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
            // top-left gamete: first allele from each pair
            Object.fromEntries(this.genes.map((g, pi) => [g.locus, this.chromos[pi*2].sisL.dataset.allele])),
            // bottom-left: second allele from each pair (sisR of pair 0, sisL-equivalent of pairs)
            Object.fromEntries(this.genes.map((g, pi) => [g.locus, this.chromos[pi*2].sisR.dataset.allele])),
            // top-right: homolog first allele
            Object.fromEntries(this.genes.map((g, pi) => [g.locus, this.chromos[pi*2+1].sisL.dataset.allele])),
            // bottom-right: homolog second allele
            Object.fromEntries(this.genes.map((g, pi) => [g.locus, this.chromos[pi*2+1].sisR.dataset.allele])),
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
            let x = 200, y = 150, rot = 0, split = 0, scale = 0.8;
            let sisROpacity = 1;
            let sisRScale = 1;
            let localRot = (state >= 6) ? -90 : 0; // Rotate back to vertical at the end

            const pairOffset = (totalPairs - 1) / 2;
            const stackY = 150 + (0 - pairOffset) * 45; // idx is handled by loop, but for 1 pair it's centered

            if (state === 0) {
                x = c.side ? 180 : 220; y = stackY; rot = 0;
                sisROpacity = 0; sisRScale = 0;
            } else if (state === 1) {
                x = c.side ? 180 : 220; y = stackY; rot = 0;
                sisROpacity = 1; sisRScale = 1;
            } else if (state === 2) {
                // Tilted Pairing (Tetrad look)
                x = c.side ? 194 : 206; 
                y = stackY; 
                rot = c.side ? -7 : 7; 
                sisROpacity = 1;
            } else if (state === 3) {
                // Separation to sides
                x = c.side ? 100 : 300; 
                y = stackY; 
                rot = 0;
            } else if (state === 4) {
                // Metaphase II
                x = c.side ? 100 : 300; 
                y = 150; 
                rot = 90;
            } else if (state === 5) {
                // Anaphase II
                x = c.side ? 100 : 300; 
                y = 150; 
                rot = 90; 
                split = 65;
            } else if (state >= 6) {
                // Finished
                x = c.side ? 100 : 300; 
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

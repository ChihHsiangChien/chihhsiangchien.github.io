/**
 * Genetics Lab - Integrated Macro/Micro Logic
 */

const CHROMO_COLORS = {
    father: ['#3b82f6', '#60a5fa'],
    mother: ['#ef4444', '#f87171']
};

class IntegratedLab {
    constructor() {
        this.state = {
            father: 'Aa',
            mother: 'Aa',
            phase: 'setup', // setup, dividing, results, fertilized
            meiosisStep: 0,
            selectedSperm: null,
            selectedEgg: null
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
    }

    bindEvents() {
        // Genotype Selectors
        document.querySelectorAll('.genotype-selector button').forEach(btn => {
            btn.onclick = () => {
                if (this.state.phase !== 'setup') return;
                const parent = btn.dataset.parent;
                const geno = btn.dataset.genotype;
                
                // UI Toggle
                btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.state[parent] = geno;
                this.updateMacro(parent);
                this.updateMicro(parent);
            };
        });

        this.btnStart.onclick = () => this.startMeiosis();
        this.btnNext.onclick = () => this.stepMeiosis(1);
        this.btnPrev.onclick = () => this.stepMeiosis(-1);
        this.btnReset.onclick = () => window.location.reload();
        this.btnFertilize.onclick = () => this.handleFertilization();
    }

    init() {
        this.updateMacro('father');
        this.updateMacro('mother');
        this.updateMicro('father');
        this.updateMicro('mother');
        
        // Clear Zygote nuclear view
        const zygoteGroup = document.getElementById('svg-zygote').querySelector('.chromosome-group');
        zygoteGroup.innerHTML = '';

        // Reset offspring macro view to empty state
        const offCol = document.getElementById('offspring-macro');
        if (offCol) {
            offCol.classList.add('empty-state');
            const display = document.getElementById('macro-child');
            display.innerHTML = '<span class="placeholder-text">等待受精...</span>';
            offCol.querySelector('.geno-tag').textContent = '';
            offCol.querySelector('.pheno-tag').textContent = '';
        }
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
        this.sims[parent] = new MeiosisAnimator(`svg-meiosis-${parent}`, parent, this.state[parent]);
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
        this.updatePhaseText();
        this.stepMeiosis(1);
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

        if (this.state.meiosisStep === 6) {
            this.showGameteWells();
        } else {
            this.hideGameteWells();
        }
    }

    updatePhaseText() {
        const texts = [
            "設定親代：請在兩側選擇基因型",
            "減數分裂：DNA 複製與同源配對",
            "減數分裂：同源染色體準備分離",
            "減 I 分裂：同源染色體分離 (分離律)",
            "減 II 分裂：準備進行姊妹分體分離",
            "減 II 分裂：姊妹染色分體分離",
            "分裂完成：請直接點選下方細胞中的配子 (各選一個)"
        ];
        
        if (this.state.phase === 'dividing' || this.state.phase === 'setup') {
            this.phaseText.textContent = texts[this.state.meiosisStep] || texts[0];
        } else if (this.state.phase === 'results') {
            this.phaseText.textContent = "請在兩側細胞中各選一個配子 (點選細胞區域)";
        } else if (this.state.phase === 'fertilized') {
            this.phaseText.textContent = "受精完成與有絲分裂發育中...";
        }
    }

    showGameteWells() {
        this.state.phase = 'results';
        this.phaseText.textContent = "請直接點選下方細胞中的配子 (各選一個)";
        
        // Remove old grid logic, interaction happens inside sim
        this.sims.father.enableInteraction((allele) => {
            this.state.selectedSperm = allele;
            this.checkFertilizationReady();
        });
        this.sims.mother.enableInteraction((allele) => {
            this.state.selectedEgg = allele;
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
            this.btnFertilize.classList.remove('hidden');
        }
    }

    handleFertilization() {
        this.state.phase = 'fertilized';
        this.btnFertilize.classList.add('hidden');
        this.stepTools.classList.add('hidden');
        this.phaseText.textContent = "受精完成與有絲分裂發育中...";

        const f = this.state.selectedSperm;
        const m = this.state.selectedEgg;
        const childGeno = (f === 'A' && m === 'A') ? 'AA' : ((f === 'a' && m === 'a') ? 'aa' : 'Aa');

        // 1. Render Zygote & Fusion Animation
        this.renderZygote(f, m);

        // 2. Perform Mitosis Animation
        setTimeout(() => {
            this.animateMitosis();
        }, 1200);

        // 3. Offspring maturation
        setTimeout(() => {
            const off = document.getElementById('offspring-macro');
            off.classList.remove('empty-state');
            const display = document.getElementById('macro-child');
            display.innerHTML = '';
            display.appendChild(this.createBlob(childGeno));
            
            off.querySelector('.geno-tag').textContent = `基因型: ${childGeno}`;
            off.querySelector('.pheno-tag').textContent = childGeno.includes('A') ? "顯性表現型" : "隱性表現型";
            this.phaseText.textContent = "子代發育完成！";
        }, 2500);
    }

    animateMitosis() {
        const zygoteSVG = document.getElementById('svg-zygote');
        const membrane = zygoteSVG.querySelector('.cell-membrane');
        
        // Visual "Cleavage" effect
        membrane.style.transition = "all 0.8s ease-in-out";
        membrane.setAttribute('d', "M 50,100 m -40,0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0 M 150,100 m -40,0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0");
        
        // Move chromosomes to separate cells, avoiding overlap
        const group = zygoteSVG.querySelector('.chromosome-group');
        const chromos = group.querySelectorAll('.zygote-chromo');
        chromos.forEach((c, i) => {
            const side = i % 2 === 0 ? 0 : 1; // Split by side
            const offsetX = side === 0 ? -40 : 40;
            const currentTransform = c.getAttribute('transform');
            // Extract current translation and adjust
            const match = currentTransform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
            if (match) {
                const newX = parseFloat(match[1]) + offsetX;
                c.setAttribute("transform", `translate(${newX}, ${match[2]}) scale(0.6)`);
            }
        });

        // Duplicate visual for second cell
        const clones = group.cloneNode(true);
        clones.setAttribute('transform', 'translate(100, 0)');
        group.appendChild(clones);

        // Final transition to offspring macro happens in handleFertilization
    }

    renderZygote(f, m) {
        const svg = document.getElementById('svg-zygote');
        const group = svg.querySelector('.chromosome-group');
        group.innerHTML = '';
        
        const alleles = [f, m];
        alleles.forEach((a, i) => {
            const chr = document.createElementNS("http://www.w3.org/2000/svg", "g");
            chr.setAttribute("class", "zygote-chromo");
            // Start from sides (simulating flying in)
            chr.setAttribute("transform", `translate(${i === 0 ? -100 : 300}, 100) scale(0)`);
            
            const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttribute("href", "#chromatid-template");
            use.style.color = (i === 0 ? CHROMO_COLORS.father[0] : CHROMO_COLORS.mother[0]);
            chr.appendChild(use);
            
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", "0"); text.setAttribute("y", "-16");
            text.setAttribute("class", "gene-text"); text.setAttribute("text-anchor", "middle");
            text.textContent = a;
            chr.appendChild(text);
            group.appendChild(chr);

            // Animate in
            setTimeout(() => {
                chr.style.transition = "all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                chr.setAttribute("transform", `translate(${i === 0 ? 85 : 115}, 100) scale(0.7)`);
            }, 50 + i * 200);
        });

        // Fusion Pulse
        setTimeout(() => {
            svg.parentElement.style.transition = "all 0.5s ease";
            svg.parentElement.style.transform = "scale(1.2)";
            svg.parentElement.style.backgroundColor = "rgba(74, 144, 226, 0.3)";
            setTimeout(() => {
                svg.parentElement.style.transform = "scale(1)";
            }, 500);
        }, 1200);
    }
}

class MeiosisAnimator {
    constructor(svgId, type, genotype) {
        this.svg = document.getElementById(svgId);
        this.chrGroup = this.svg.querySelector('.chromosome-group');
        this.membrane = this.svg.querySelector('.cell-membrane');
        this.nucleus = this.svg.querySelector('.nucleus');
        this.type = type;
        this.alleles = (genotype === 'AA' ? ['A', 'A'] : (genotype === 'Aa' ? ['A', 'a'] : ['a', 'a']));
        
        this.init();
    }

    init() {
        this.chrGroup.innerHTML = '';
        this.chromos = [];
        // Fixed positions: Pairs in the center
        const getFixedPos = (index) => {
            const spacing = 40;
            return {
                x: 200 + (index === 0 ? -spacing : spacing) * 0.5,
                y: 150,
                rot: 0
            };
        }

        this.alleles.forEach((a, i) => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "chromosome-interactive");
            const sisL = document.createElementNS("http://www.w3.org/2000/svg", "g");
            sisL.setAttribute("class", "sister-chromatid");
            const sisR = document.createElementNS("http://www.w3.org/2000/svg", "g");
            sisR.setAttribute("class", "sister-chromatid");
            
            [sisL, sisR].forEach((sis, j) => {
                const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                use.setAttribute("href", "#chromatid-template");
                use.style.color = CHROMO_COLORS[this.type][i];
                sis.appendChild(use);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", "0"); text.setAttribute("y", "-16");
                text.setAttribute("class", "gene-text"); text.setAttribute("text-anchor", "middle");
                text.textContent = a;
                if (j === 1) text.setAttribute("transform", "scale(-1, 1)");
                sis.appendChild(text);

                // Add data for selection
                sis.dataset.allele = a;
            });

            g.appendChild(sisL); g.appendChild(sisR);
            this.chrGroup.appendChild(g);

            const pos = getFixedPos(i);
            this.chromos.push({ el: g, sisL, sisR, pos, side: (i === 0) });
        });
    }

    enableInteraction(onSelect) {
        // Find or create hit areas for the 4 gamete cells (based on Path definition)
        // For simplicity, we create 4 invisible circles in the SVG group
        const cells = [
            { x: 100, y: 75, allele: this.chromos[0].sisL.dataset.allele },
            { x: 100, y: 225, allele: this.chromos[0].sisR.dataset.allele },
            { x: 300, y: 75, allele: this.chromos[1].sisL.dataset.allele },
            { x: 300, y: 225, allele: this.chromos[1].sisR.dataset.allele }
        ];

        this.hitAreas = [];
        cells.forEach(c => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", c.x); circle.setAttribute("cy", c.y);
            circle.setAttribute("r", "50");
            circle.setAttribute("class", "gamete-cell-interactive");
            circle.setAttribute("fill", "rgba(255,255,255,0.01)");
            circle.setAttribute("stroke", "rgba(255,255,255,0.1)");
            
            circle.onclick = () => {
                // Remove others
                this.hitAreas.forEach(h => h.classList.remove('gamete-cell-selected'));
                circle.classList.add('gamete-cell-selected');
                onSelect(c.allele);
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
        this.nucleus.style.opacity = state < 2 ? "1" : "0";
        this.membrane.setAttribute('d', this.getPath(state));

        this.chromos.forEach((c, idx) => {
            let x = 200, y = 150, rot = 0, split = 0, scale = 0.8;
            let sisROpacity = 1;
            let sisRScale = 1;

            if (state === 0) {
                x = c.pos.x; y = c.pos.y; rot = c.pos.rot;
                sisROpacity = 0; sisRScale = 0;
            } else if (state === 1) {
                // DNA Replication visual pop
                x = c.pos.x; y = c.pos.y; rot = c.pos.rot;
                sisROpacity = 1; sisRScale = 1;
            } else if (state === 2) {
                x = c.side ? 185 : 215; y = 150 + (idx - 0.5) * 40; rot = 0;
            } else if (state === 3) {
                x = c.side ? 100 : 300; y = 150; rot = 0;
            } else if (state === 4) {
                x = c.side ? 100 : 300; y = 150; rot = 90;
            } else if (state === 5) {
                x = c.side ? 100 : 300; y = 150; rot = 90; split = 60;
            } else if (state === 6) {
                x = c.side ? 100 : 300; y = 150; rot = 90; split = 90;
            }

            c.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
            c.sisL.style.transform = `translate(${-split}px, 0)`;
            c.sisR.style.transform = `translate(${split}px, 0) scale(${sisRScale}, 1) scaleX(-1)`;
            c.sisR.style.opacity = sisROpacity;
            c.sisR.style.transition = state === 1 ? "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" : "all 0.4s ease";
        });
    }

    getPath(state) {
        if (state < 3) return "M 200,150 m -120,0 a 120,120 0 1,0 240,0 a 120,120 0 1,0 -240,0";
        if (state >= 3 && state < 6) return "M 100,150 m -80,0 a 80,80 0 1,0 160,0 a 80,80 0 1,0 -160,0 M 300,150 m -80,0 a 80,80 0 1,0 160,0 a 80,80 0 1,0 -160,0";
        return "M 100,75 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0 M 100,225 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0 M 300,75 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0 M 300,225 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.lab = new IntegratedLab();
});

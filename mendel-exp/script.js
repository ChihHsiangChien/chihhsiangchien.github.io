/**
 * Mendel's Law Interactive Laboratory
 * Sandbox Version - Randomized Traits & Tablet Friendly
 */

class MendelGame {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.idCounter = 0;
        this.errorsLeft = 2;
        
        // Drag state
        this.activeDragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isMoving = false;
        this.startPos = { x: 0, y: 0 };
        this.isLevelCompleting = false;
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.showHints = urlParams.get('hint') === '1';
        this.isFixed = urlParams.get('fixed') === '1';
        this.mode = urlParams.get('mode') || 'blob'; // 'blob' or 'pea'
        this.isComplex = urlParams.get('complex') === '1';
        
        // Potential traits pool
        const simpleTraits = [
            {
                label: "身體顏色",
                dominant: { name: "黃色", vars: { '--blob-main-color': '#f0e199' } },
                recessive: { name: "藍色", vars: { '--blob-main-color': '#a0d8ef' } }
            },
            {
                label: "耳朵形狀",
                dominant: { name: "尖耳朵", vars: { '--ear-d': 'M2 12 Q-4 -4 8 4' } },
                recessive: { name: "圓耳朵", vars: { '--ear-d': 'M2 12 Q-6 6 2 -2' } }
            },
            {
                label: "瞳孔顏色",
                dominant: { name: "黑色眼睛", vars: { '--pupil-fill': 'black' } },
                recessive: { name: "紅色眼睛", vars: { '--pupil-fill': '#d00000' } }
            },
            {
                label: "嘴巴寬度",
                dominant: { name: "大寬嘴", vars: { '--mouth-d': 'M12 26 Q20 32 28 26' } },
                recessive: { name: "窄窄嘴", vars: { '--mouth-d': 'M18 28 Q20 30 22 28' } }
            },
            {
                label: "腮紅",
                dominant: { name: "有粉紅腮紅", vars: { '--blush-fill': '#ff4141ff', '--show-blush': '1' } },
                recessive: { name: "無腮紅", vars: { '--blush-fill': 'transparent', '--show-blush': '0' } }
            }
        ];

        const complexTraits = [
            {
                label: "觸角型式",
                dominant: { name: "捲曲觸角", vars: { '--show-antennas': '1', '--ant-l-d': 'M12 4 Q-5 -15 2 -4', '--ant-r-d': 'M28 4 Q45 -15 38 -4' } },
                recessive: { name: "直長觸角", vars: { '--show-antennas': '1', '--ant-l-d': 'M12 4 L0 -10', '--ant-r-d': 'M28 4 L40 -10' } }
            },
            {
                label: "觸角末端形狀",
                dominant: { name: "圓球型", vars: { '--show-antennas': '1', '--ant-l-d': 'M12 4 L0 -10', '--ant-r-d': 'M28 4 L40 -10', '--ant-tip': 'round' } },
                recessive: { name: "鑽石型", vars: { '--show-antennas': '1', '--ant-l-d': 'M12 4 L0 -10', '--ant-r-d': 'M28 4 L40 -10', '--ant-tip': 'diamond' } }
            },
            {
                label: "身體花紋",
                dominant: { name: "點狀花紋", vars: { '--show-spots': '1', '--show-stripes': '0', '--pattern-fill': 'rgba(0,0,0,0.15)', '--pattern-stroke': 'transparent' } },
                recessive: { name: "條狀花紋", vars: { '--show-spots': '0', '--show-stripes': '1', '--pattern-fill': 'transparent', '--pattern-stroke': 'rgba(0,0,0,0.2)' } }
            },
            {
                label: "翅膀樣式",
                dominant: { name: "精靈翅膀", vars: { '--wing-type': 'fairy' } },
                recessive: { name: "蝙蝠翅膀", vars: { '--wing-type': 'bat' } }
            },
            {
                label: "尾巴型態",
                dominant: { name: "捲尾巴", vars: { '--show-tail': '1', '--tail-d': 'M 6 32 C -8 32 -10 46 2 46 C 7 46 10 40 5 36' } },
                recessive: { name: "直尾巴", vars: { '--show-tail': '1', '--tail-d': 'M 6 32 Q -5 40 -8 46' } }
            }
        ];

        this.traitPool = this.isComplex ? [...simpleTraits, ...complexTraits] : simpleTraits;

        this.neutralBaseTraits = {
            '--blob-main-color': '#f0e199', // Default body color
            '--ear-d': 'M2 12 Q-6 6 2 -2',  // Default round ear
            '--pupil-fill': 'black',        // Default black eyes
            '--mouth-d': 'M18 28 Q20 30 22 28', // Default narrow mouth
            '--show-blush': '0',
            '--show-antennas': '0',
            '--show-spots': '0',
            '--show-stripes': '0',
            '--wing-type': 'none',
            '--ant-tip': 'none',
            '--show-tail': '0'
        };

        if (this.mode === 'pea') {
            this.activeTrait = {
                label: "株高",
                dominant: { name: "高莖 (Tall)", vars: { isPea: true, tall: true } },
                recessive: { name: "矮莖 (Short)", vars: { isPea: true, tall: false } }
            };
            this.initialGenes = [['T', 'T'], ['T', 'T'], ['T', 'T'], ['t', 't'], ['t', 't'], ['t', 't']];
        } else {
            // Randomly pick an active trait
            const rawTrait = this.traitPool[Math.floor(Math.random() * this.traitPool.length)];
            this.activeTrait = JSON.parse(JSON.stringify(rawTrait));
            
            // Assign neutral backgrounds, then conditionally randomize if complex mode
            this.baseTraits = Object.assign({}, this.neutralBaseTraits);
            
            if (this.isComplex) {
                this.traitPool.forEach(trait => {
                    if (trait.label !== this.activeTrait.label) {
                        const vars = Math.random() > 0.5 ? trait.dominant.vars : trait.recessive.vars;
                        Object.assign(this.baseTraits, vars);
                    }
                });
            }

            if (this.mode === 'sandbox') {
                this.initialGenes = this.randomizeParentGenes(4, 'A', 'a', true);
            } else if (this.mode === 'breed') {
                this.initialGenes = this.randomizeParentGenes(8, 'A', 'B');
                this.targetGenotype = this.generatePossibleTarget(this.initialGenes);
            } else {
                this.initialGenes = this.randomizeParentGenes(6, 'A', 'B');
            }
        }
        
        // Sound effects
        this.popSound = new Audio('assets/audio/pop.wav');
        
        this.init();
    }

    generatePossibleTarget(parentsGenes) {
        let p1 = parentsGenes[Math.floor(Math.random() * parentsGenes.length)];
        let p2 = parentsGenes[Math.floor(Math.random() * parentsGenes.length)];
        
        let a1 = p1[Math.floor(Math.random() * 2)];
        let a2 = p2[Math.floor(Math.random() * 2)];
        return [a1, a2].sort().join('');
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateErrorDisplay();
        this.setupInitialPopulation();
        this.displayActiveTrait();
    }

    displayActiveTrait() {
        if (this.traitLabel) {
            const levelStr = this.mode !== 'pea' ? ` [第 ${this.level} 關]` : '';
            this.traitLabel.textContent = `觀察：${this.activeTrait.label}${levelStr}`;
        }
    }

    randomizeParentGenes(count, domLabel = 'A', recLabel = 'B', isSandbox = false) {
        const genes = [];
        const types = [[domLabel, domLabel], [domLabel, recLabel], [recLabel, recLabel]];
        
        if (isSandbox) {
            // Generate `count` parents: 
            // 2 x "All Dominant" (Adam)
            // 2 x "All Recessive" (Eve)
            for (let i = 0; i < count; i++) {
                const parentGenotype = [];
                for (let j = 0; j < 10; j++) {
                    if (i < 2) {
                        parentGenotype.push([domLabel, domLabel]); // Adam
                    } else {
                        parentGenotype.push([recLabel, recLabel]); // Eve
                    }
                }
                genes.push(parentGenotype);
            }
            return genes;
        }

        for (let i = 0; i < count - 1; i++) {
            genes.push(types[Math.floor(Math.random() * types.length)]);
        }
        
        if (!genes.some(g => g.includes(recLabel))) {
            const possibleRecessive = [[domLabel, recLabel], [recLabel, recLabel]];
            genes.push(possibleRecessive[Math.floor(Math.random() * possibleRecessive.length)]);
        } else {
            genes.push(types[Math.floor(Math.random() * types.length)]);
        }
        
        return genes;
    }

    cacheDOM() {
        this.containers = {
            parent: document.getElementById('parent-container'),
            offspring: document.getElementById('offspring-container'),
            repro: document.getElementById('reproduction-dropzone')
        };
        this.allZones = document.querySelectorAll('.dropzone-target');
        this.reproBtn = document.getElementById('repro-btn');
        this.checkBtn = document.getElementById('check-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.scoreDisplay = document.getElementById('score');
        this.blobTemplate = document.getElementById('blob-template');
        this.peaTemplate = document.getElementById('pea-template');
        this.alleleTemplate = document.getElementById('allele-template');
        this.successOverlay = document.getElementById('success-overlay');
        this.resetBtn = document.getElementById('reset-btn');
        this.traitLabel = document.getElementById('current-trait-label');
        this.errorAllowanceDisplay = document.getElementById('error-allowance-display');
    }

    updateErrorDisplay() {
        if (this.errorAllowanceDisplay) {
            if (this.mode === 'sandbox' || this.mode === 'breed') {
                this.errorAllowanceDisplay.style.display = 'none';
            } else {
                this.errorAllowanceDisplay.style.display = 'inline';
                this.errorAllowanceDisplay.textContent = `(剩餘機會: ${this.errorsLeft}次)`;
                if (this.errorsLeft <= 1) {
                    this.errorAllowanceDisplay.style.color = '#ff0000';
                    this.errorAllowanceDisplay.style.fontWeight = 'bold';
                } else {
                    this.errorAllowanceDisplay.style.color = '#ff4d4d';
                    this.errorAllowanceDisplay.style.fontWeight = 'normal';
                }
            }
        }
    }

    updateLegendUI() {
        // Legend removed from DOM
    }

    bindEvents() {
        this.resetBtn.addEventListener('click', () => {
            this.restartLevel();
        });

        document.getElementById('restart-game-btn').addEventListener('click', () => {
            window.location.reload();
        });
        const bindFastClick = (btn, action) => {
            if (!btn) return;
            // Handle touch explicitly to bypass iOS Safari's 300ms delay & zoom
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Kills double-tap zoom entirely
                action();
            }, { passive: false });
            // Handle mouse down for desktop snappiness
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                action();
            });
        };

        bindFastClick(this.reproBtn, () => this.reproduce());
        bindFastClick(this.clearBtn, () => this.clearWorkspace());
        bindFastClick(this.checkBtn, () => this.checkAnswers());

        // Global pointer move/up for dragging
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    }

    setupInitialPopulation() {
        const shuffledGenes = [...this.initialGenes].sort(() => Math.random() - 0.5);
        const parentContainer = this.containers.parent;
        
        let cols = 2;
        let cellWidth = 85;
        let cellHeight = 100;
        let offsetX = 5;
        let offsetY = 15;

        // Adjust for 8 parents
        if (this.mode === 'breed') {
            cellHeight = 90; 
            offsetY = 10;
        } else if (this.mode === 'pea') {
            cellHeight = 125;
            offsetY = 10;
        }

        shuffledGenes.forEach((genes, index) => {
            const blob = this.createBlob(`p-${++this.idCounter}`, genes);
            blob.dataset.isParent = "true";
            
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            blob.style.left = (offsetX + col * cellWidth) + 'px';
            blob.style.top = (offsetY + row * cellHeight) + 'px';
            blob.dataset.homeX = blob.style.left;
            blob.dataset.homeY = blob.style.top;
            
            parentContainer.appendChild(blob);
        });

        const buckets = document.getElementById('genotype-buckets');
        const targetSection = document.getElementById('target-container');
        const scannerSection = document.getElementById('scanner-container');

        if (this.mode === 'sandbox') {
            buckets.classList.add('hidden');
            targetSection.classList.add('hidden');
            scannerSection.classList.remove('hidden');
            document.getElementById('check-btn').classList.add('hidden');
            
            document.getElementById('scanner-traits-list').innerHTML = '<div class="text-center text-gray-400 mt-10">請點擊左側精靈以進行掃描</div>';
        } else if (this.mode === 'breed') {
            buckets.classList.add('hidden');
            targetSection.classList.remove('hidden');
            scannerSection.classList.add('hidden');
            document.getElementById('check-btn').classList.add('hidden'); // No manual check needed
            
            const targetDisplay = document.getElementById('target-blob-display');
            targetDisplay.innerHTML = '';
            
            const targetBlob = this.createBlob('target-blob', this.targetGenotype.split(''));
            targetBlob.style.position = 'absolute';
            targetBlob.style.left = '50%';
            targetBlob.style.top = '50%';
            targetBlob.style.transform = 'translate(-50%, -50%) scale(1.5)';
            targetBlob.setAttribute('draggable', 'false');
            targetBlob.classList.remove('cursor-grab', 'active:cursor-grabbing');
            
            const clone = targetBlob.cloneNode(true);
            clone.querySelector('.gene-label').classList.remove('hidden');
            targetDisplay.appendChild(clone);
        } else {
            buckets.classList.remove('hidden');
            targetSection.classList.add('hidden');
            scannerSection.classList.add('hidden');
            document.getElementById('check-btn').classList.remove('hidden');
            
            // Restore answer buckets (instead of recreating them, which breaks drag-drop bounds)
            if (document.querySelector('#slot-AA .slot-header')) {
                if (this.mode === 'pea') {
                    document.querySelector('#slot-AA .slot-header').textContent = "同型顯性 (TT)";
                    document.querySelector('#slot-AB .slot-header').textContent = "異型 (Tt)";
                    document.querySelector('#slot-BB .slot-header').textContent = "同型隱性 (tt)";
                } else {
                    document.querySelector('#slot-AA .slot-header').textContent = "同型顯性 (AA)";
                    document.querySelector('#slot-AB .slot-header').textContent = "異型 (Aa)";
                    document.querySelector('#slot-BB .slot-header').textContent = "同型隱性 (aa)";
                }
            }
        }
    }

    updateScannerPanel(sprite) {
        if (this.mode !== 'sandbox') return;
        
        const display = document.getElementById('scanner-blob-display');
        const list = document.getElementById('scanner-traits-list');
        
        // Update Portrait
        display.innerHTML = '';
        const clone = sprite.cloneNode(true);
        clone.style.left = '50%';
        clone.style.top = '50%';
        clone.style.transform = 'translate(-50%, -50%)';
        clone.style.position = 'absolute';
        clone.classList.remove('dragging');
        clone.setAttribute('draggable', 'false');
        display.appendChild(clone);
        
        // Update Traits List
        list.innerHTML = '';
        const genes = JSON.parse(sprite.dataset.genes);
        
        this.traitPool.forEach((trait, i) => {
            const genePair = genes[i];
            const isDom = genePair.includes('A');
            const phenoName = isDom ? trait.dominant.name : trait.recessive.name;
            const domChar = String.fromCharCode(65 + i); // A, B, C...
            const recChar = String.fromCharCode(97 + i); // a, b, c...
            const internalGeneStr = genePair.join('');
            const genoStr = internalGeneStr === 'AA' ? domChar + domChar : (internalGeneStr === 'aa' ? recChar + recChar : domChar + recChar);
            
            const row = document.createElement('div');
            row.className = 'trait-row';
            row.innerHTML = `
                <div class="trait-name">${trait.label}</div>
                <div class="trait-pheno">${phenoName}</div>
                <div class="trait-geno">${genoStr}</div>
            `;
            list.appendChild(row);
        });
    }

    createBlob(id, genes) {
        const isPeaMode = this.mode === 'pea';
        const template = isPeaMode ? this.peaTemplate : this.blobTemplate;
        const clone = template.content.cloneNode(true);
        const sprite = clone.querySelector('.blob-sprite');
        const geneLabel = clone.querySelector('.gene-label');
        
        sprite.dataset.id = id;
        sprite.dataset.genes = JSON.stringify(genes);

        const isDominant = genes.includes('A') || genes.includes('T');
        const geneStr = genes.join('');
        
        if (isPeaMode) {
            const tallImg = sprite.querySelector('.tall');
            const shortImg = sprite.querySelector('.short');
            if (isDominant) {
                tallImg.classList.remove('hidden');
                shortImg.classList.add('hidden');
            } else {
                tallImg.classList.add('hidden');
                shortImg.classList.remove('hidden');
            }
        } else {
            let combinedStyles = {};
            let bodyRadius = 18.5; // default
            
            if (this.mode === 'sandbox') {
                // genes is an array of 10 gene pairs like [['A','A'], ['b','b'], ...]
                combinedStyles = Object.assign({}, this.neutralBaseTraits);
                
                this.traitPool.forEach((trait, i) => {
                    const genePair = genes[i];
                    const isDom = genePair.includes('A');
                    const activeStyles = isDom ? trait.dominant.vars : trait.recessive.vars;
                    Object.assign(combinedStyles, activeStyles);
                    
                    if (trait.label === "身體顏色") {
                        if (!isDom) sprite.classList.add('phenotype-recessive');
                    }
                });
            } else {
                const isDominant = genes.includes('A') || genes.includes('T');
                const geneStr = genes.join('');
                const activeStyles = isDominant ? this.activeTrait.dominant.vars : this.activeTrait.recessive.vars;
                combinedStyles = Object.assign({}, this.baseTraits, activeStyles);
                
                if (geneStr === "AA") bodyRadius = 19;
                else if (geneStr === "AB") bodyRadius = 20;
                else if (geneStr === "BB") bodyRadius = 19;
                
                if (!isDominant) sprite.classList.add('phenotype-recessive');
            }
            
            sprite.querySelector('.blob-body').setAttribute('r', bodyRadius);

            for (const [prop, value] of Object.entries(combinedStyles)) {
                if(prop === '--eye-y') {
                     sprite.querySelectorAll('.eye-outer, .eye-pupil').forEach(eye => eye.setAttribute('cy', value));
                } else if(prop === '--eye-radius') {
                     sprite.querySelectorAll('.eye-outer').forEach(eye => eye.setAttribute('r', value));
                } else if(prop === '--eye-pupil-radius') {
                     sprite.querySelectorAll('.eye-pupil').forEach(eye => eye.setAttribute('r', value));
                } else if(prop === '--ear-fill') {
                     sprite.querySelectorAll('.ear').forEach(ear => ear.style.fill = value);
                } else if(prop === '--ear-stroke') {
                     sprite.querySelectorAll('.ear').forEach(ear => ear.style.stroke = value);
                } else if(prop === '--blush-fill') {
                     sprite.querySelectorAll('.blush').forEach(b => b.setAttribute('fill', value));
                } else if(prop === '--show-blush') {
                     sprite.querySelectorAll('.blush').forEach(b => b.setAttribute('opacity', value === '1' ? '0.6' : '0'));
                } else if(prop === '--pupil-fill') {
                     sprite.querySelectorAll('.eye-pupil').forEach(p => p.setAttribute('fill', value));
                } else if(prop === '--ear-d') {
                     sprite.querySelectorAll('.ear').forEach((ear, i) => {
                         let d = value;
                         if (i === 1) { // Right ear mirroring
                            if (d.includes('M2 12 Q-4 -4 8 4')) d = 'M38 12 Q44 -4 32 4';
                            else if (d.includes('M2 12 Q-6 6 2 -2')) d = 'M38 12 Q46 6 38 -2';
                         }
                         ear.setAttribute('d', d);
                     });
                } else if(prop === '--show-antennas') {
                     sprite.querySelector('.antennas').style.display = (value === '1' ? 'block' : 'none');
                } else if(prop === '--ant-l-d') {
                     if (value) sprite.querySelector('.left-ant').setAttribute('d', value);
                } else if(prop === '--ant-r-d') {
                     if (value) sprite.querySelector('.right-ant').setAttribute('d', value);
                } else if(prop === '--mouth-d') {
                     sprite.querySelector('.mouth').setAttribute('d', value);
                } else if(prop === '--show-spots') {
                     sprite.querySelector('.spots-group').style.display = (value === '1' ? 'block' : 'none');
                } else if(prop === '--show-stripes') {
                     sprite.querySelector('.stripes-group').style.display = (value === '1' ? 'block' : 'none');
                } else if(prop === '--pattern-fill') {
                     sprite.querySelectorAll('.pattern-item').forEach(p => p.setAttribute('fill', value));
                } else if(prop === '--pattern-stroke') {
                     sprite.querySelectorAll('.pattern-item').forEach(p => p.setAttribute('stroke', value));
                } else if(prop === '--wing-type') {
                     sprite.querySelectorAll('.wing').forEach(w => w.style.display = 'none');
                     if (value !== 'none') sprite.querySelectorAll(`.${value}-wing`).forEach(w => w.style.display = 'block');
                } else if(prop === '--ant-tip') {
                     sprite.querySelectorAll('.round-end').forEach(e => e.style.display = (value === 'round' ? 'block' : 'none'));
                     sprite.querySelectorAll('.diamond-end').forEach(e => e.style.display = (value === 'diamond' ? 'block' : 'none'));
                } else if(prop === '--show-tail') {
                     sprite.querySelector('.tail-group').style.display = (value === '1' ? 'block' : 'none');
                } else if(prop === '--tail-d') {
                     if (value) sprite.querySelector('.tail').setAttribute('d', value);
                } else {
                     sprite.style.setProperty(prop, value);
                }
            }
        }

        // Map internal labels to display labels
        let displayLabel = "";
        
        if (this.mode === 'sandbox') {
            displayLabel = "?";
        } else if (isPeaMode) {
            const geneStr = genes.join('');
            if (geneStr === "TT") displayLabel = "TT";
            else if (geneStr === "Tt") displayLabel = "Tt";
            else if (geneStr === "tt") displayLabel = "tt";
        } else {
            const geneStr = genes.join('');
            if (geneStr === "AA") displayLabel = "AA";
            else if (geneStr === "AB") displayLabel = "Aa";
            else if (geneStr === "BB") displayLabel = "aa";
        }
        
        geneLabel.textContent = displayLabel;
        if (this.mode === 'sandbox') {
            geneLabel.classList.add('hidden'); // Hide simple gene label in sandbox mode
        }
        
        sprite.addEventListener('pointerdown', (e) => this.onPointerDown(e, sprite));
        return sprite;
    }

    extractAlleles(parentSprite, genes, visible) {
        if (this.mode === 'sandbox') return;
        
        // Find existing alleles for this parent
        const existingAlleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${parentSprite.dataset.id}"]`);
        
        if (!visible) {
            // Remove if label is becoming hidden
            existingAlleles.forEach(a => a.remove());
            return;
        }
        
        // If already visible, don't duplicate
        if (existingAlleles.length > 0) return;

        const rect = parentSprite.getBoundingClientRect();
        const appRect = document.getElementById('app').getBoundingClientRect();
        
        genes.forEach((gene, index) => {
            const allele = this.createAllele(gene);
            allele.dataset.parentId = parentSprite.dataset.id;
            allele.dataset.isSource = "true"; // Mark as the source displayed under plant
            const offset = (index === 0 ? -22 : 22);
            allele.style.left = (rect.left - appRect.left + rect.width/2 + offset - 20) + 'px';
            
            // For pea plants, place at bottom; for blobs, place at top
            const isPea = this.mode === 'pea';
            const topOffset = isPea ? (rect.height - 70) : -20;
            allele.style.top = (rect.top - appRect.top + topOffset) + 'px';
            
            document.getElementById('app').appendChild(allele);
        });

        this.popSound.currentTime = 0;
        this.popSound.play();
    }

    createAllele(gene) {
        const clone = this.alleleTemplate.content.cloneNode(true);
        const sprite = clone.querySelector('.allele-sprite');
        const domImg = sprite.querySelector('.dominant');
        const recImg = sprite.querySelector('.recessive');
        
        sprite.dataset.gene = gene;
        if (gene === 'A' || gene === 'T') {
            domImg.classList.remove('hidden');
            recImg.classList.add('hidden');
        } else {
            domImg.classList.add('hidden');
            recImg.classList.remove('hidden');
        }

        sprite.addEventListener('pointerdown', (e) => this.onPointerDown(e, sprite));
        return sprite;
    }

    onPointerDown(e, sprite) {
        e.preventDefault();
        
        if (this.mode === 'sandbox') {
            this.updateScannerPanel(sprite);
        }
        
        this.activeDragElement = sprite;
        this.originalParent = sprite.parentElement; 
        this.isMoving = false;
        this.startPos = { x: e.clientX, y: e.clientY };

        const rect = sprite.getBoundingClientRect();
        const appRect = document.getElementById('app').getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store pre-drag position relative to parent or #app
        this.originalPos = {
            left: sprite.style.left,
            top: sprite.style.top
        };
        
        // We also need the absolute position for cloning if it's a source
        this.originalRect = rect;

        // Defer moving to #app until dragging actually starts to avoid shift on click
        sprite.setPointerCapture(e.pointerId);
    }

    onPointerMove(e) {
        if (!this.activeDragElement) return;
        // Prevent default touch actions (like scrolling) during drag
        if (e.pointerType === 'touch') e.preventDefault();

        // Check if user has moved enough to consider it a drag
        if (Math.abs(e.clientX - this.startPos.x) > 5 || Math.abs(e.clientY - this.startPos.y) > 5) {
            if (!this.isMoving) {
                this.isMoving = true;
                
                if (this.activeDragElement.classList.contains('allele-sprite') && this.activeDragElement.dataset.isSource === "true") {
                    // Regular Mode gamete logic
                    const gene = this.activeDragElement.dataset.gene;
                    const parentId = this.activeDragElement.dataset.parentId;
                    
                    const replacement = this.createAllele(gene);
                    replacement.dataset.parentId = parentId;
                    replacement.dataset.isSource = "true";
                    
                    // Match position
                    replacement.style.left = this.originalPos.left;
                    replacement.style.top = this.originalPos.top;
                    this.originalParent.appendChild(replacement);
                    
                    // The one being dragged is now a gamete
                    delete this.activeDragElement.dataset.isSource;
                    this.activeDragElement.dataset.isGamete = "true";
                }

                this.activeDragElement.classList.add('dragging');
                
                // Clear grid index when a sprite is dragged so its slot can be reused
                delete this.activeDragElement.dataset.gridIndex;
                
                const appRect = document.getElementById('app').getBoundingClientRect();
                
                // Track associated alleles initial positions if this is a pea plant
                if (this.activeDragElement.classList.contains('pea-sprite') && this.activeDragElement.dataset.id) {
                    const alleleNodes = document.querySelectorAll(`.allele-sprite[data-parent-id="${this.activeDragElement.dataset.id}"]`);
                    alleleNodes.forEach(node => {
                        const r = node.getBoundingClientRect();
                        node.dataset.dragStartX = r.left - appRect.left;
                        node.dataset.dragStartY = r.top - appRect.top;
                        document.getElementById('app').appendChild(node);
                    });
                }

                // Move parent to #app level to avoid clipping, but only once
                const pRect = this.activeDragElement.getBoundingClientRect();
                this.dragOriginX = pRect.left - appRect.left;
                this.dragOriginY = pRect.top - appRect.top;
                
                // Position correctly before/during move to #app
                this.activeDragElement.style.left = this.dragOriginX + 'px';
                this.activeDragElement.style.top = this.dragOriginY + 'px';
                document.getElementById('app').appendChild(this.activeDragElement);
            }
        }

        if (!this.isMoving) return;

        // Highlight potential target zones
        this.allZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                zone.classList.add('highlight');
            } else {
                zone.classList.remove('highlight');
            }
        });
        
        const appRect = document.getElementById('app').getBoundingClientRect();
        const currentPX = e.clientX - appRect.left - this.dragOffset.x;
        const currentPY = e.clientY - appRect.top - this.dragOffset.y;
        
        const dx = currentPX - this.dragOriginX;
        const dy = currentPY - this.dragOriginY;

        this.activeDragElement.style.left = currentPX + 'px';
        this.activeDragElement.style.top = currentPY + 'px';

        // Move associated alleles
        if (this.activeDragElement.dataset.id) {
            const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${this.activeDragElement.dataset.id}"]`);
            alleles.forEach(a => {
                a.style.left = (parseFloat(a.dataset.dragStartX) + dx) + 'px';
                a.style.top = (parseFloat(a.dataset.dragStartY) + dy) + 'px';
            });
        }
    }

    onPointerUp(e) {
        if (!this.activeDragElement) return;

        const sprite = this.activeDragElement;
        
        // Clean up capture strictly (very helpful for mobile Safari/Chrome pointer stability)
        if (e.pointerId) {
            sprite.releasePointerCapture(e.pointerId);
        }
        
        sprite.classList.remove('dragging');
        
        // Click logic (Extraction)
        if (!this.isMoving && this.mode === 'pea' && sprite.classList.contains('pea-sprite')) {
            const genes = JSON.parse(sprite.dataset.genes);
            const isVisible = sprite.dataset.allelesVisible === 'true';
            const nextVisible = !isVisible;
            sprite.dataset.allelesVisible = nextVisible.toString();
            
            this.extractAlleles(sprite, genes, nextVisible);
            this.activeDragElement = null;
            return;
        }

        // If it was just a click and no drag occurred, don't execute drop logic.
        if (!this.isMoving) {
            this.activeDragElement = null;
            return;
        }

        // Find which zone was dropped into
        let targetZone = null;
        this.allZones.forEach(zone => {
            zone.classList.remove('highlight');
            const rect = zone.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                targetZone = zone;
            }
        });

        if (this.activeDragElement.classList.contains('allele-sprite') && !targetZone) {
            this.activeDragElement.remove();
            this.activeDragElement = null;
            this.updateReproState();
            return;
        }

        if (targetZone) {
            if (targetZone.id === 'trash-zone') {
                if (this.activeDragElement.dataset.isParent === "true") {
                    this.returnBlob();
                    return;
                }
                
                // Discard logic for offspring or stray alleles
                if (this.activeDragElement.dataset.id) {
                    document.querySelectorAll(`.allele-sprite[data-parent-id="${this.activeDragElement.dataset.id}"]`).forEach(a => a.remove());
                }
                this.activeDragElement.remove();
                this.activeDragElement = null;
                this.updateReproState();
                
                this.popSound.currentTime = 0;
                this.popSound.play();
                return;
            }

            if (targetZone.id === 'reproduction-dropzone') {
                if (this.activeDragElement.classList.contains('blob-sprite')) {
                    const inZoneBlobs = targetZone.querySelectorAll('.blob-sprite');
                    if (inZoneBlobs.length >= 2) {
                        this.returnBlob();
                        return;
                    }
                } else if (this.activeDragElement.classList.contains('allele-sprite')) {
                    const inZoneAlleles = targetZone.querySelectorAll('.allele-sprite');
                    if (inZoneAlleles.length >= 2) {
                        this.returnAllele();
                        return;
                    }
                }
            }

            const appRect = document.getElementById('app').getBoundingClientRect();
            const zoneRect = targetZone.getBoundingClientRect();
            
            // Add scroll offsets because the dropzone (e.g. offspring) might be scrolled!
            const localX = e.clientX - zoneRect.left + targetZone.scrollLeft;
            const localY = e.clientY - zoneRect.top + targetZone.scrollTop;
            
            this.activeDragElement.style.left = (localX - this.dragOffset.x) + 'px';
            this.activeDragElement.style.top = (localY - this.dragOffset.y) + 'px';
            
            targetZone.appendChild(this.activeDragElement);
            this.activeDragElement.classList.remove('dragging');

            // Move alleles to same zone
            if (sprite.dataset.id) {
                const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${sprite.dataset.id}"]`);
                alleles.forEach(a => {
                    const aRect = a.getBoundingClientRect();
                    a.style.left = (aRect.left - zoneRect.left) + 'px';
                    a.style.top = (aRect.top - zoneRect.top) + 'px';
                    targetZone.appendChild(a);
                });
            }
        } else {
            this.returnBlob();
        }

        this.activeDragElement = null;
        this.updateReproState();
        
        if (targetZone && targetZone.id !== 'trash-zone') {
            this.popSound.currentTime = 0;
            this.popSound.play();
        }
    }

    returnAllele() {
        if (this.activeDragElement) {
            this.activeDragElement.remove();
            this.activeDragElement = null;
        }
    }

    returnBlob() {
        const sprite = this.activeDragElement;
        this.originalParent.appendChild(sprite);
        sprite.style.left = this.originalPos.left;
        sprite.style.top = this.originalPos.top;
        sprite.classList.remove('dragging');

        // Return alleles to the same parent container cleanly
        if (sprite.dataset.id) {
            const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${sprite.dataset.id}"]`);
            alleles.forEach((a, idx) => {
                this.originalParent.appendChild(a);
                a.style.left = (parseFloat(sprite.style.top) === parseFloat(sprite.style.top) ? parseFloat(sprite.style.left) + (idx * 30) : 0) + 'px';
                a.style.top = (parseFloat(sprite.style.top) === parseFloat(sprite.style.top) ? parseFloat(sprite.style.top) + 70 : 0) + 'px';
            });
        }

        this.activeDragElement = null;
    }
    
    updateReproState() {
        const reproZone = this.containers.repro;
        let totalUnits = 0;

        if (this.mode === 'sandbox') {
            const blobs = reproZone.querySelectorAll('.blob-sprite');
            totalUnits = blobs.length;
            this.reproBtn.disabled = totalUnits !== 2;
        } else {
            const children = Array.from(reproZone.children);
            const blobs = children.filter(el => el.classList.contains('blob-sprite'));
            const alleles = children.filter(el => el.classList.contains('allele-sprite'));
            
            // Independent alleles are those whose parent plant is not currently in the reproduction zone
            const independentAlleles = alleles.filter(a => !blobs.some(b => b.dataset.id === a.dataset.parentId));
            totalUnits = blobs.length + independentAlleles.length;
            this.reproBtn.disabled = totalUnits !== 2;
        }

        const hint = reproZone.querySelector('.drop-hint');
        if (this.mode === 'sandbox') {
            hint.textContent = "請拖入兩隻精靈進行繁殖";
        } else {
            hint.textContent = "請拖曳生殖單位 (配子/個體) 至此";
        }
        
        const totalElements = reproZone.querySelectorAll('.blob-sprite').length + reproZone.querySelectorAll('.allele-sprite').length;
        if (totalElements > 0) hint.classList.add('hidden');
        else hint.classList.remove('hidden');
    }

    crossComplexGenotypes(genes1, genes2) {
        const offspringGenes = [];
        for (let i = 0; i < 10; i++) {
            const p1Allele = genes1[i][Math.floor(Math.random() * 2)];
            const p2Allele = genes2[i][Math.floor(Math.random() * 2)];
            offspringGenes.push([p1Allele, p2Allele].sort());
        }
        return offspringGenes;
    }

    reproduce() {
        const allBlobs = document.querySelectorAll('.blob-sprite');
        if (allBlobs.length >= 100) {
            alert('實驗室空間不足！請先清除部分子代再進行繁育（上限 100 隻）。');
            return;
        }

        const targetZone = this.containers.repro;

        if (this.mode === 'sandbox') {
            const parents = targetZone.querySelectorAll('.blob-sprite');
            if (parents.length === 2) {
                const genes1 = JSON.parse(parents[0].dataset.genes);
                const genes2 = JSON.parse(parents[1].dataset.genes);
                const offspringGenes = this.crossComplexGenotypes(genes1, genes2);
                
                const newId = `f-${++this.idCounter}`;
                const blob = this.createBlob(newId, offspringGenes);
                this.spawnOffspring(this.containers.offspring, blob);
            }
            return;
        }

        const children = Array.from(this.containers.repro.children);
        const blobsInZone = children.filter(el => el.classList.contains('blob-sprite'));
        const allelesInZone = children.filter(el => el.classList.contains('allele-sprite'));
        
        // Identify alleles that are being used as independent breeding units
        const independentAlleles = allelesInZone.filter(a => !blobsInZone.some(b => b.dataset.id === a.dataset.parentId));
        
        const breedingUnits = [...blobsInZone, ...independentAlleles];
        if (breedingUnits.length !== 2) return;

        let offspringGenes = [];
        breedingUnits.forEach(unit => {
            if (unit.classList.contains('blob-sprite')) {
                // Parents provide one random gene
                const genes = JSON.parse(unit.dataset.genes);
                offspringGenes.push(genes[Math.floor(Math.random() * 2)]);
            } else {
                // Independent alleles provide their specific gene
                offspringGenes.push(unit.dataset.gene);
            }
        });

        // Clear used independent alleles
        independentAlleles.forEach(a => a.remove());

        offspringGenes.sort();
        const newId = `f-${++this.idCounter}`;
        const blob = this.createBlob(newId, offspringGenes);

        const container = this.containers.offspring;
        this.spawnOffspring(container, blob);
    }

    getZPatternLayout(container, index) {
        const rect = container.getBoundingClientRect();
        const cellWidth = 70;
        const cellHeight = 90;
        
        // Use rect.width for a stable calculation independent of vertical scrollbar presence
        // Subtract 30 to safely account for standard scrollbar width without triggering jitter
        const cols = Math.max(1, Math.floor((rect.width - 30) / cellWidth));
        
        // Z-pattern grid calculation based on current count
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        return {
            left: 10 + (col * cellWidth),
            top: 10 + (row * cellHeight)
        };
    }

    getNextAvailableGridIndex(container) {
        const blobs = container.querySelectorAll('.blob-sprite');
        const occupiedIndexes = new Set();
        blobs.forEach(b => {
            if (b.dataset.gridIndex !== undefined) {
                occupiedIndexes.add(parseInt(b.dataset.gridIndex, 10));
            }
        });
        
        let i = 0;
        while (occupiedIndexes.has(i)) {
            i++;
        }
        return i;
    }

    normalizeGenotype(geneArray) {
        return geneArray.map(g => {
            if (g === 'T' || g === 'A') return 'A';
            if (g === 't' || g === 'B') return 'B';
            return g;
        }).sort().join('');
    }

    spawnOffspring(container, blob) {
        const gridIndex = this.getNextAvailableGridIndex(container);
        blob.dataset.gridIndex = gridIndex;
        const pos = this.getZPatternLayout(container, gridIndex);

        blob.style.left = pos.left + 'px';
        blob.style.top = pos.top + 'px';
        
        blob.classList.add('anim-pop');
        container.appendChild(blob);
        setTimeout(() => blob.classList.remove('anim-pop'), 400);

        // Growth animation for Pea mode
        if (this.mode === 'pea') {
            const seedImg = blob.querySelector('.seed');
            const tallImg = blob.querySelector('.tall');
            const shortImg = blob.querySelector('.short');
            const genes = JSON.parse(blob.dataset.genes);
            const isDominant = genes.includes('A') || genes.includes('T');

            // Start as seed
            seedImg.classList.remove('hidden');
            tallImg.classList.add('hidden');
            shortImg.classList.add('hidden');

            setTimeout(() => {
                seedImg.classList.add('hidden');
                if (isDominant) tallImg.classList.remove('hidden');
                else shortImg.classList.remove('hidden');
            }, 200);
        }
        
        this.popSound.currentTime = 0;
        this.popSound.play();
        this.updateStats();

        if (this.mode === 'breed') {
            const geneArr = JSON.parse(blob.dataset.genes);
            const normalizedActual = this.normalizeGenotype(geneArr);

            if (normalizedActual === this.targetGenotype && !this.isLevelCompleting) {
                this.isLevelCompleting = true;
                this.score += 10;
                blob.classList.add('correct');
                blob.querySelector('.gene-label').classList.remove('hidden');
                
                const toast = document.createElement('div');
                toast.className = 'level-up-toast breed-success-toast';
                toast.innerHTML = `<span style="font-size: 1.5em; display:block; margin-bottom: 5px;">🧬</span>培育成功！`;
                document.getElementById('app').appendChild(toast);
                
                setTimeout(() => {
                    toast.remove();
                    this.level++;
                    this.nextLevel();
                }, 1300);
            }
        }
    }

    clearWorkspace() {
        // Clear offspring ONLY from the offspring container
        const blobsInOffspring = this.containers.offspring.querySelectorAll('.blob-sprite');
        blobsInOffspring.forEach(blob => {
            if (blob.dataset.isParent !== "true") {
                if (blob.dataset.id) {
                    document.querySelectorAll(`.allele-sprite[data-parent-id="${blob.dataset.id}"]`).forEach(a => a.remove());
                }
                blob.remove();
            }
        });

        // Clear ALL gametes/alleles that are currently within the offspring container
        const allelesInOffspring = this.containers.offspring.querySelectorAll('.allele-sprite');
        allelesInOffspring.forEach(allele => allele.remove());

        this.updateReproState();
    }

    checkAnswers() {
        if (this.mode === 'breed') return; // Handled in spawnOffspring

        let hasNewErrors = false;
        const slots = document.querySelectorAll('.slot');
        let unverifiedBlobs = [];

        slots.forEach(slot => {
            const expected = slot.dataset.genotype;
            const blobs = slot.querySelectorAll('.blob-sprite');
            
            blobs.forEach(blob => {
                if (blob.dataset.isParent !== "true") {
                    // Non-parent blobs bounced back to child container
                    blob.classList.add('anim-shake');
                    setTimeout(() => {
                        blob.classList.remove('anim-shake');
                        const container = this.containers.offspring;
                        const gridIndex = this.getNextAvailableGridIndex(container);
                        blob.dataset.gridIndex = gridIndex;
                        const pos = this.getZPatternLayout(container, gridIndex);
                        
                        blob.style.left = pos.left + 'px';
                        blob.style.top = pos.top + 'px';
                        
                        container.appendChild(blob);
                        
                        if (blob.dataset.id) {
                            const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${blob.dataset.id}"]`);
                            alleles.forEach(a => {
                                a.style.left = blob.style.left;
                                a.style.top = (parseFloat(blob.style.top) - 20) + 'px';
                                container.appendChild(a);
                            });
                        }
                    }, 600);
                    return;
                }

                if (blob.dataset.verified === "true") return; // Skip already scored

                const geneArr = JSON.parse(blob.dataset.genes);
                const normalizedActual = this.normalizeGenotype(geneArr);

                unverifiedBlobs.push(blob);

                if (normalizedActual !== expected) {
                    hasNewErrors = true;
                }
            });
        });

        if (unverifiedBlobs.length === 0) return; // Nothing new to check

        if (hasNewErrors) {
            this.errorsLeft--;
            this.updateErrorDisplay();
            
            unverifiedBlobs.forEach(blob => {
                blob.classList.add('anim-shake');
                setTimeout(() => {
                    blob.classList.remove('anim-shake');
                    if (this.errorsLeft > 0) {
                        this.containers.parent.appendChild(blob);
                        blob.style.left = blob.dataset.homeX;
                        blob.style.top = blob.dataset.homeY;

                        if (blob.dataset.id) {
                            const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${blob.dataset.id}"]`);
                            alleles.forEach((a, idx) => {
                                this.containers.parent.appendChild(a);
                                a.style.left = (parseFloat(blob.style.left) + (idx * 30)) + 'px';
                                a.style.top = (parseFloat(blob.style.top) + 70) + 'px';
                            });
                        }
                    }
                }, 600);
            });

            if (this.errorsLeft <= 0) {
                setTimeout(() => {
                    const toast = document.createElement('div');
                    toast.className = 'level-up-toast';
                    toast.style.background = '#e74c3c';
                    toast.innerHTML = `驗證錯誤次數過多，基因重新洗牌！`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2500);

                    this.score -= 10;
                    if (this.score < 0) this.score = 0;
                    this.scoreDisplay.textContent = this.score;
                    this.scoreDisplay.classList.add('anim-pop');

                    this.restartLevel();
                }, 600);
            } else {
                this.score -= 2; // minor penalty for a wrong guess attempt
                if (this.score < 0) this.score = 0;
                this.scoreDisplay.textContent = this.score;
            }
        } else {
            // All newly submitted unverified blobs in this batch are CORRECT! Lock them in.
            unverifiedBlobs.forEach(blob => {
                blob.dataset.verified = "true";
                blob.classList.add('correct');
                if (this.mode !== 'pea') {
                    blob.querySelector('.gene-label').classList.remove('hidden');
                }
            });
            
            this.score += (unverifiedBlobs.length * 2);
            this.scoreDisplay.textContent = this.score;
            this.scoreDisplay.classList.add('anim-pop');
            setTimeout(() => this.scoreDisplay.classList.remove('anim-pop'), 400);

            // Win condition: All 6 parents are correctly verified
            const verifiedParents = document.querySelectorAll('.blob-sprite[data-is-parent="true"][data-verified="true"]');
            if (verifiedParents.length === this.initialGenes.length) {
                if (this.mode === 'pea') {
                    document.getElementById('display-final-score').textContent = this.score;
                    this.successOverlay.classList.remove('hidden');
                } else {
                    this.level++;
                    this.nextLevel();
                }
            }
        }

        this.updateStats();
    }

    restartLevel() {
        this.isLevelCompleting = false;
        this.errorsLeft = 2;
        this.updateErrorDisplay();
        
        if (this.mode === 'sandbox') {
            this.initialGenes = this.randomizeParentGenes(4, 'A', 'a', true);
        } else if (this.mode === 'breed') {
            this.initialGenes = this.randomizeParentGenes(8, 'A', 'B');
            this.targetGenotype = this.generatePossibleTarget(this.initialGenes);
        } else if (this.mode !== 'pea') {
            this.initialGenes = this.randomizeParentGenes(6, 'A', 'B');
        } else {
            this.initialGenes = [['T', 'T'], ['T', 'T'], ['T', 'T'], ['t', 't'], ['t', 't'], ['t', 't']];
        }

        const parentContainer = this.containers.parent;
        const offspringContainer = this.containers.offspring;
        const reproContainer = this.containers.repro;
        const slots = document.querySelectorAll('.slot-body');

        parentContainer.innerHTML = '';
        offspringContainer.innerHTML = '';
        reproContainer.innerHTML = '';
        slots.forEach(s => s.innerHTML = '');

        this.setupInitialPopulation();
        this.displayActiveTrait();
        this.updateReproState();
    }

    nextLevel() {
        this.isLevelCompleting = false;
        this.errorsLeft = 2;
        this.updateErrorDisplay();
        // Pick a new random trait
        const rawTrait = this.traitPool[Math.floor(Math.random() * this.traitPool.length)];
        this.activeTrait = JSON.parse(JSON.stringify(rawTrait));

        this.baseTraits = Object.assign({}, this.neutralBaseTraits);
        if (this.isComplex) {
            this.traitPool.forEach(trait => {
                if (trait.label !== this.activeTrait.label) {
                    const vars = Math.random() > 0.5 ? trait.dominant.vars : trait.recessive.vars;
                    Object.assign(this.baseTraits, vars);
                }
            });
        }

        if (this.mode === 'sandbox') {
            this.initialGenes = this.randomizeParentGenes(4, 'A', 'a', true);
        } else if (this.mode === 'breed') {
            this.initialGenes = this.randomizeParentGenes(8, 'A', 'B');
            this.targetGenotype = this.generatePossibleTarget(this.initialGenes);
        } else if (this.mode !== 'pea') {
            this.initialGenes = this.randomizeParentGenes(6, 'A', 'B');
        }

        // Reset the board but keep score and level
        const parentContainer = this.containers.parent;
        const offspringContainer = this.containers.offspring;
        const reproContainer = this.containers.repro;
        const slots = document.querySelectorAll('.slot-body');

        parentContainer.innerHTML = '';
        offspringContainer.innerHTML = '';
        if (this.mode === 'sandbox') reproContainer.innerHTML = '<span class="drop-hint">請拖入兩隻精靈進行繁殖</span>';
        else reproContainer.innerHTML = '<span class="drop-hint">請拖曳兩條染色體至此</span>';
        
        slots.forEach(s => s.innerHTML = '');

        // New population
        this.setupInitialPopulation();
        this.displayActiveTrait();
        this.updateReproState();
        
        // Success animation or message
        const hint = document.createElement('div');
        hint.className = 'level-up-toast';
        hint.textContent = `太棒了！進入第 ${this.level} 關`;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 2000);
    }

    updateStats() {
        // Stats removed with legend
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new MendelGame();
});

// Prevent double-tap zoom on tablets/mobile devices (Aggressive method for iOS Safari)
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    // If the time between two touches is less than 300ms, it's a double tap
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
        // Force the click to still register on buttons even though we prevented the zoom
        if (event.target.tagName === 'BUTTON') {
            event.target.click();
        }
    }
    lastTouchEnd = now;
}, { passive: false });

// Prevent multi-touch zoom
document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

// Prevent pinch-zoom on iOS
document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
});

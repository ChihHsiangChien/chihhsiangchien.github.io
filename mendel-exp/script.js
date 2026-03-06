/**
 * Mendel's Law Interactive Laboratory
 * Sandbox Version - Randomized Traits & Tablet Friendly
 */

class MendelGame {
    constructor() {
        this.score = 0;
        this.idCounter = 0;
        
        // Drag state
        this.activeDragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isMoving = false;
        this.startPos = { x: 0, y: 0 };
        
        // Potential traits pool
        this.traitPool = [
            {
                label: "體色 (Body Color)",
                dominant: { name: "黃色", vars: { '--blob-main-color': '#f0e199' } },
                recessive: { name: "藍色", vars: { '--blob-main-color': '#a0d8ef' } }
            },
            {
                label: "眼睛大小 (Eye Size)",
                dominant: { name: "大眼睛", vars: { '--eye-radius': '4.5', '--eye-pupil-radius': '2' } },
                recessive: { name: "小眼睛", vars: { '--eye-radius': '1.5', '--eye-pupil-radius': '0.8' } }
            },
            {
                label: "耳朵顏色 (Ear Color)",
                dominant: { name: "與體色相同", vars: { '--ear-fill': 'inherit', '--ear-stroke': 'rgba(0,0,0,0.1)' } },
                recessive: { name: "紅色耳朵", vars: { '--ear-fill': '#ff6b6b', '--ear-stroke': '#c92a2a' } }
            },
            {
                label: "眼睛位置 (Eye Position)",
                dominant: { name: "正常位置", vars: { '--eye-y': '16' } },
                recessive: { name: "高位眼", vars: { '--eye-y': '10' } }
            }
        ];

        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.showHints = urlParams.get('hint') === '1';
        this.isFixed = urlParams.get('fixed') === '1';
        this.mode = urlParams.get('mode') || 'blob'; // 'blob' or 'pea'

        if (this.mode === 'pea') {
            this.activeTrait = {
                label: "株高 (Plant Height)",
                dominant: { name: "高莖 (Tall)", vars: { isPea: true, tall: true } },
                recessive: { name: "矮莖 (Short)", vars: { isPea: true, tall: false } }
            };
            this.initialGenes = this.randomizeParentGenes(6, 'T', 't');
        } else {
            // Randomly pick a trait for this session
            const rawTrait = this.traitPool[Math.floor(Math.random() * this.traitPool.length)];
            this.activeTrait = JSON.parse(JSON.stringify(rawTrait));

            if (!this.isFixed && Math.random() > 0.5) {
                const temp = this.activeTrait.dominant;
                this.activeTrait.dominant = this.activeTrait.recessive;
                this.activeTrait.recessive = temp;
            }
            this.initialGenes = this.randomizeParentGenes(6, 'A', 'B');
        }
        
        // Sound effects
        this.popSound = new Audio('assets/audio/pop.wav');
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setupInitialPopulation();
        this.displayActiveTrait();
    }

    displayActiveTrait() {
        if (this.traitLabel) {
            this.traitLabel.textContent = `當前觀察：${this.activeTrait.label}`;
        }
    }

    randomizeParentGenes(count, domLabel = 'A', recLabel = 'B') {
        const genes = [];
        const types = [[domLabel, domLabel], [domLabel, recLabel], [recLabel, recLabel]];
        
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
    }

    updateLegendUI() {
        // Legend removed from DOM
    }

    bindEvents() {
        this.resetBtn.addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('restart-game-btn').addEventListener('click', () => {
            window.location.reload();
        });

        this.reproBtn.addEventListener('click', () => this.reproduce());
        this.clearBtn.addEventListener('click', () => this.clearWorkspace());
        this.checkBtn.addEventListener('click', () => this.checkAnswers());

        // Global pointer move/up for dragging
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    }

    setupInitialPopulation() {
        const shuffledGenes = [...this.initialGenes].sort(() => Math.random() - 0.5);
        const parentContainer = this.containers.parent;
        
        // Grid setup: 2 columns, 3 rows
        const cols = 2;
        const rows = 3;
        const cellWidth = 100;
        const cellHeight = 85;
        const offsetX = 30; // Center in the zone
        const offsetY = 20;

        shuffledGenes.forEach((genes, index) => {
            const blob = this.createBlob(`p-${++this.idCounter}`, genes);
            blob.dataset.isParent = "true";
            
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            blob.style.left = (offsetX + col * cellWidth) + 'px';
            blob.style.top = (offsetY + row * (this.mode === 'pea' ? 100 : cellHeight)) + 'px';
            
            parentContainer.appendChild(blob);
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
            const activeStyles = isDominant ? this.activeTrait.dominant.vars : this.activeTrait.recessive.vars;
            let bodyRadius = 18.5;
            if (geneStr === "AA") bodyRadius = 19;
            else if (geneStr === "AB") bodyRadius = 20;
            else if (geneStr === "BB") bodyRadius = 19;
            
            sprite.querySelector('.blob-body').setAttribute('r', bodyRadius);

            for (const [prop, value] of Object.entries(activeStyles)) {
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
                } else {
                     sprite.style.setProperty(prop, value);
                }
            }
            if (!isDominant) sprite.classList.add('phenotype-recessive');
        }

        // Map internal labels to display labels
        let displayLabel = "";
        if (isPeaMode) {
            if (geneStr === "TT") displayLabel = "TT";
            else if (geneStr === "Tt") displayLabel = "Tt";
            else if (geneStr === "tt") displayLabel = "tt";
        } else {
            if (geneStr === "AA") displayLabel = "AA";
            else if (geneStr === "AB") displayLabel = "Aa";
            else if (geneStr === "BB") displayLabel = "aa";
        }
        geneLabel.textContent = displayLabel;
        
        sprite.addEventListener('pointerdown', (e) => this.onPointerDown(e, sprite));
        return sprite;
    }

    extractAlleles(parentSprite, genes, visible) {
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
            const offset = (index === 0 ? -15 : 15);
            allele.style.left = (rect.left - appRect.left + rect.width/2 + offset - 15) + 'px';
            allele.style.top = (rect.top - appRect.top - 20) + 'px';
            document.getElementById('app').appendChild(allele);
        });
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
        
        this.activeDragElement = sprite;
        this.originalParent = sprite.parentElement; 
        this.originalPos = { left: sprite.style.left, top: sprite.style.top };
        this.isMoving = false;
        this.startPos = { x: e.clientX, y: e.clientY };

        const rect = sprite.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store pre-drag position in case we need to return
        this.originalPos = {
            left: sprite.style.left,
            top: sprite.style.top
        };

        // Move to #app level
        sprite.style.left = (rect.left - document.getElementById('app').getBoundingClientRect().left) + 'px';
        sprite.style.top = (rect.top - document.getElementById('app').getBoundingClientRect().top) + 'px';
        document.getElementById('app').appendChild(sprite);
        
        sprite.setPointerCapture(e.pointerId);
    }

    onPointerMove(e) {
        if (!this.activeDragElement) return;

        // Check if user has moved enough to consider it a drag
        if (Math.abs(e.clientX - this.startPos.x) > 5 || Math.abs(e.clientY - this.startPos.y) > 5) {
            if (!this.isMoving) {
                this.isMoving = true;
                this.activeDragElement.classList.add('dragging');
                
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
        sprite.classList.remove('dragging');
        
        // Click logic (Extraction)
        if (!this.isMoving && this.mode === 'pea' && sprite.classList.contains('pea-sprite')) {
            const geneLabel = sprite.querySelector('.gene-label');
            const genes = JSON.parse(sprite.dataset.genes);
            geneLabel.classList.toggle('hidden');
            this.extractAlleles(sprite, genes, !geneLabel.classList.contains('hidden'));
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
            if (targetZone.id === 'reproduction-dropzone' && this.activeDragElement.classList.contains('allele-sprite')) {
                const inZoneAlleles = targetZone.querySelectorAll('.allele-sprite');
                if (inZoneAlleles.length >= 2) {
                    this.returnAllele();
                    return;
                }
            }

            if (targetZone.classList.contains('slot-body')) {
                if (this.activeDragElement.dataset.isParent !== "true") {
                    this.returnBlob();
                    return;
                }
            }

            const appRect = document.getElementById('app').getBoundingClientRect();
            const zoneRect = targetZone.getBoundingClientRect();
            
            const localX = e.clientX - zoneRect.left;
            const localY = e.clientY - zoneRect.top;
            
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
    }

    returnAllele() {
        if (this.activeDragElement) {
            this.activeDragElement.remove();
            this.activeDragElement = null;
        }
    }

    returnBlob() {
        this.originalParent.appendChild(this.activeDragElement);
        this.activeDragElement.style.left = this.originalPos.left;
        this.activeDragElement.style.top = this.originalPos.top;
        this.activeDragElement.classList.remove('dragging');

        // Return alleles to the same parent container
        if (this.activeDragElement.dataset.id) {
            const alleles = document.querySelectorAll(`.allele-sprite[data-parent-id="${this.activeDragElement.dataset.id}"]`);
            const parentRect = this.originalParent.getBoundingClientRect();
            alleles.forEach(a => {
                const aRect = a.getBoundingClientRect();
                a.style.left = (aRect.left - parentRect.left) + 'px';
                a.style.top = (aRect.top - parentRect.top) + 'px';
                this.originalParent.appendChild(a);
            });
        }
    }
    
    updateReproState() {
        const children = Array.from(this.containers.repro.children);
        const blobs = children.filter(el => el.classList.contains('blob-sprite'));
        const alleles = children.filter(el => el.classList.contains('allele-sprite'));
        
        // Independent alleles are those whose parent plant is not currently in the reproduction zone
        const independentAlleles = alleles.filter(a => !blobs.some(b => b.dataset.id === a.dataset.parentId));
        
        // Total breeding units must be exactly 2 (either 2 plants, 2 alleles, or 1 plant + 1 allele)
        const totalUnits = blobs.length + independentAlleles.length;
        
        this.reproBtn.disabled = totalUnits !== 2;
        const hint = this.containers.repro.querySelector('.drop-hint');
        if (totalUnits > 0) hint.classList.add('hidden');
        else hint.classList.remove('hidden');
    }

    reproduce() {
        const allBlobs = document.querySelectorAll('.blob-sprite');
        if (allBlobs.length >= 100) {
            alert('實驗室空間不足！請先清除部分子代再進行繁育（上限 100 隻）。');
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

    spawnOffspring(container, blob) {
        const rect = container.getBoundingClientRect();
        blob.style.left = Math.random() * (rect.width - 50) + 'px';
        blob.style.top = Math.random() * (rect.height - 50) + 'px';
        
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
    }

    clearWorkspace() {
        const allBlobs = document.querySelectorAll('.blob-sprite');
        let count = 0;
        allBlobs.forEach(blob => {
            if (blob.dataset.isParent !== "true") {
                blob.remove();
                count++;
            }
        });
        this.updateReproState();
    }

    checkAnswers() {
        let correct = 0;
        let incorrect = 0;
        const slots = document.querySelectorAll('.slot');

        slots.forEach(slot => {
            const expected = slot.dataset.genotype;
            const blobs = slot.querySelectorAll('.blob-sprite');
            
            blobs.forEach(blob => {
                if (blob.dataset.verified === "true") return; // Skip already scored

                // Robust normalization for comparing with AA/AB/BB slots
                const geneArr = JSON.parse(blob.dataset.genes);
                const normalizedActual = geneArr.map(g => {
                    const l = g.toUpperCase();
                    if (l === 'T' || l === 'A') return 'A';
                    if (l === 'B' || g === 't') return 'B'; // 't' is recessive, 'B' is our internal recessive label
                    return g;
                }).sort().join('');

                if (normalizedActual === expected) {
                    correct++;
                    blob.dataset.verified = "true"; // Mark as verified
                    blob.classList.add('correct');
                    blob.querySelector('.gene-label').classList.remove('hidden');
                } else {
                    incorrect++;
                    blob.classList.add('anim-shake');
                    setTimeout(() => blob.remove(), 600);
                }
            });
        });

        this.score += (correct * 2) - (incorrect * 2);
        if (this.score < 0) this.score = 0;
        this.scoreDisplay.textContent = this.score;
        this.scoreDisplay.classList.add('anim-pop');
        setTimeout(() => this.scoreDisplay.classList.remove('anim-pop'), 400);

        // Win condition: All 6 parents are correctly verified
        const verifiedParents = document.querySelectorAll('.blob-sprite[data-is-parent="true"][data-verified="true"]');
        if (verifiedParents.length === this.initialGenes.length) {
            document.getElementById('display-final-score').textContent = this.score;
            this.successOverlay.classList.remove('hidden');
        }
        this.updateStats();
    }

    updateStats() {
        // Stats removed with legend
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new MendelGame();
});

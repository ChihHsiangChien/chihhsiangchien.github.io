document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('nephron-svg');
    const structureLayer = document.getElementById('structure-layer');
    const particleLayer = document.getElementById('particle-layer');
    const labelLayer = document.getElementById('label-layer');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
    const hyperglycemiaBtn = document.getElementById('hyperglycemiaBtn');
    const proteinuriaBtn = document.getElementById('proteinuriaBtn');
    const toggleTooltipsBtn = document.getElementById('toggleTooltipsBtn');
    const infoText = document.getElementById('info-text');

    let isRunning = false;
    let particles = [];
    let animationId;
    let spawnTimer = 0;
    let showParticleLabels = false;
    let alwaysShowTooltips = false;
    // Pathology states
    let pathology = {
        hyperglycemia: false,
        proteinuria: false
    };

    function updatePathologyInfo() {
        const active = [];
        if (pathology.hyperglycemia) active.push('高血糖：近曲小管葡萄糖載體飽和，部分葡萄糖出現於尿液');
        if (pathology.proteinuria) active.push('蛋白尿：過濾障壁受損，蛋白質進入濾液');
        if (active.length === 0) return; // keep existing message unless pathology active
        infoText.textContent = active.join('；');
    }

    // Define paths
    // 1. Nephron Path (Filtrate)
    // Starts from the urinary pole of Bowman's capsule (Right side)
    const nephronPathData = `
        M 190 150 
        C 220 150, 250 100, 280 150 
        S 230 250, 280 300 
        L 280 450 
        C 280 500, 380 500, 380 450 
        L 380 300 
        C 410 250, 450 250, 480 300 
        S 530 250, 580 300 
        L 580 550
    `;

    // 2. Blood Path (Capillaries)
    // Starts at afferent arteriole (Left), goes to glomerulus (Center), then efferent (Left/Down), then wraps around tubules
    const bloodPathData2 = `
        M 50 140 
        L 110 140 
        C 120 120, 150 120, 160 140 
        C 170 160, 130 170, 130 140 
        C 130 120, 160 120, 160 150
        C 160 170, 120 170, 110 160
        L 85 160
        C 85 200, 180 220, 180 320 
        C 200 600, 440 550, 440 400 
        C 400 300, 500 300, 600 300 
        L 750 300
    `;
    const bloodPathData = `
        m 50,140
        h 60
        c 10,-20 36.41243,-20.55193 46.41243,-0.55193 10,20 -38.279,40.48673 -38.279,10.48673 0,-20 35.39871,-22.59502 30.27597,6.96437 -3.03564,17.5163 -30.61713,11.99696 -38.68537,-4.35027
        L 83.896133,152.27293
        C 65.958293,152.80968 57.74672,180.81272 180,320 200,600 440,550 440,400 400,300 500,300 600,300
        h 150`;

    // Glomerulus Visual Path (The knot structure inside the capsule)
    const glomerulusPathData = `
        M 115 140 
        C 115 110, 155 110, 155 140 
        C 155 170, 115 170, 115 140 
        C 115 120, 175 120, 175 150 
        C 175 180, 135 180, 135 150
        C 135 130, 165 130, 165 140
    `;

    // Bowman's Capsule Path (C-shape wrapping around)
    // Opens to the left (vascular pole), closed on right (urinary pole)
    const bowmanPathData = `
        M 110 120
        A 45 45 0 1 1 110 180
    `;

    // Interactive regions data
    const interactiveRegions = [
        {
            id: 'glomerulus-region',
            shape: 'circle',
            cx: 145,
            cy: 150,
            r: 50,
            title: '腎絲球',
            description: '血液在此進行過濾作用。小分子（水、葡萄糖、鹽類、尿素）可通過，大分子（蛋白質）被阻擋。'
        },
        {
            id: 'pct-region',
            shape: 'rect',
            x: 220,
            y: 120,
            width: 100,
            height: 200,
            title: '近曲小管',
            description: '主要的再吸收區域。葡萄糖被完全再吸收，大部分的水和鹽類也在此回收。'
        },
        {
            id: 'loop-region',
            shape: 'rect',
            x: 250,
            y: 400,
            width: 150,
            height: 150,
            title: '亨利氏套',
            description: '下降支：水分再吸收。上升支：鹽類再吸收。此處建立滲透壓梯度，幫助尿液濃縮。'
        },
        {
            id: 'dct-region',
            shape: 'rect',
            x: 430,
            y: 220,
            width: 150,
            height: 120,
            title: '遠曲小管',
            description: '精細調節水分和鹽類平衡，受荷爾蒙（如醛固酮、抗利尿激素）調控。'
        }
    ];

    // Draw structures
    function drawStructures() {
        // Nephron Tubule (Thick outline)
        const nephron = document.createElementNS("http://www.w3.org/2000/svg", "path");
        nephron.setAttribute("d", nephronPathData);
        nephron.setAttribute("class", "tubule");
        structureLayer.appendChild(nephron);

        // Bowman's Capsule
        const bowman = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bowman.setAttribute("d", bowmanPathData);
        bowman.setAttribute("class", "bowman-capsule");
        // Add a fill to show the cup shape more clearly?
        // bowman.setAttribute("fill", "rgba(230, 126, 34, 0.1)"); 
        // User wants it to look like the tubule, so maybe no fill or same fill logic.
        // If tubule has no fill, this should probably have no fill to look like a continuous tube.
        // But a capsule usually implies a volume. 
        // Let's remove the fill to match the "tubule" look which is just a thick stroke.
        structureLayer.appendChild(bowman);

        // Glomerulus (Capillary knot)
        const glomerulus = document.createElementNS("http://www.w3.org/2000/svg", "path");
        glomerulus.setAttribute("d", glomerulusPathData);
        glomerulus.setAttribute("class", "glomerulus");
        glomerulus.setAttribute("fill", "none");
        glomerulus.setAttribute("stroke", "#c0392b");
        glomerulus.setAttribute("stroke-width", "8");
        structureLayer.appendChild(glomerulus);

        // Peritubular Capillaries (Background flow)
        const capillary = document.createElementNS("http://www.w3.org/2000/svg", "path");
        capillary.setAttribute("d", bloodPathData);
        capillary.setAttribute("class", "capillary");
        structureLayer.appendChild(capillary);

        // Interactive regions (drawn first, behind everything)
        interactiveRegions.forEach(region => {
            let element;
            if (region.shape === 'circle') {
                element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                element.setAttribute("cx", region.cx);
                element.setAttribute("cy", region.cy);
                element.setAttribute("r", region.r);
            } else if (region.shape === 'rect') {
                element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                element.setAttribute("x", region.x);
                element.setAttribute("y", region.y);
                element.setAttribute("width", region.width);
                element.setAttribute("height", region.height);
                element.setAttribute("rx", 10);
            }
            element.setAttribute("class", "interactive-region");
            element.setAttribute("id", region.id);
            element.style.cursor = 'pointer';
            
            // Create individual tooltip for this region
            const tooltip = document.createElement('div');
            tooltip.className = 'floating-tooltip region-tooltip';
            tooltip.innerHTML = `<div class="tooltip-content"><strong>${region.title}</strong>${region.description}</div>`;
            document.body.appendChild(tooltip);
            
            // Function to show tooltip for a region
            const showTooltipForRegion = () => {
                // Use requestAnimationFrame to ensure layout is stable
                requestAnimationFrame(() => {
                    let tooltipX, tooltipY;
                    
                    if (region.shape === 'circle') {
                        // Position to the right of the circle
                        tooltipX = region.cx + region.r /2 ;
                        tooltipY = region.cy - region.r*3 ;
                    } else {
                        // Position to the right of the rectangle
                        tooltipX = region.x + region.width + 10;
                        tooltipY = region.y + region.height / 2;
                    }
                    
                    // Convert SVG coordinates to page coordinates
                    const svgPoint = svg.createSVGPoint();
                    svgPoint.x = tooltipX;
                    svgPoint.y = tooltipY;
                    const screenPoint = svgPoint.matrixTransform(svg.getScreenCTM());
                    
                    // Position and show tooltip
                    tooltip.style.left = screenPoint.x + 'px';
                    tooltip.style.top = screenPoint.y + 'px';
                    tooltip.style.display = 'block';
                    
                    // Trigger reflow before adding visible class for smooth transition
                    tooltip.offsetHeight;
                    tooltip.classList.add('visible');
                    
                    element.classList.add('region-hover');
                });
            };
            
            const hideTooltipForRegion = () => {
                tooltip.classList.remove('visible');
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 300);
                element.classList.remove('region-hover');
            };
            
            // Store the show/hide functions and tooltip element for later use
            element._showTooltip = showTooltipForRegion;
            element._hideTooltip = hideTooltipForRegion;
            element._tooltip = tooltip;
            element._regionData = region;
            
            // Add hover events
            element.addEventListener('mouseenter', (e) => {
                if (!alwaysShowTooltips) {
                    showTooltipForRegion();
                }
            });
            
            element.addEventListener('mouseleave', () => {
                if (!alwaysShowTooltips) {
                    hideTooltipForRegion();
                }
            });
            
            structureLayer.appendChild(element);
        });

        // Labels
        addLabel(100, 80, "鮑氏囊");
        addLabel(100, 200, "腎絲球");
        addLabel(280, 200, "近曲小管");
        addLabel(330, 520, "亨利氏套");
        addLabel(530, 250, "遠曲小管");
        addLabel(610, 500, "集尿管");
        addLabel(30, 130, "入球小動脈");
        addLabel(700, 280, "腎靜脈");
    }

    function addLabel(x, y, text) {
        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("x", x);
        textEl.setAttribute("y", y);
        textEl.setAttribute("class", "label-text");
        textEl.textContent = text;
        labelLayer.appendChild(textEl);
    }

    // Particle System
    const particleTypesBase = [
        { type: 'water', color: '#3498db', radius: 4, label: '水' },
        { type: 'salt', color: '#e74c3c', radius: 4, label: '鹽' },
        { type: 'urea', color: '#f1c40f', radius: 4, label: '尿素' },
        { type: 'protein', color: '#9b59b6', radius: 6, label: '蛋白質' },
        { type: 'glucose', color: '#2ecc71', radius: 5, label: '葡萄糖' }
    ];

    function chooseParticleType() {
        // Adjust spawn probabilities under hyperglycemia (more glucose fraction)
        if (!pathology.hyperglycemia) {
            return particleTypesBase[Math.floor(Math.random() * particleTypesBase.length)];
        }
        // Weighted: increase glucose probability
        const weighted = [];
        particleTypesBase.forEach(t => {
            if (t.type === 'glucose') {
                for (let i = 0; i < 5; i++) weighted.push(t); // higher weight
            } else {
                weighted.push(t);
            }
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
            this.element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this.element.setAttribute("r", this.radius);
            this.element.setAttribute("fill", this.color);
            this.element.setAttribute("class", "particle");
            particleLayer.appendChild(this.element);

            // Create label element
            this.labelElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this.labelElement.setAttribute("class", "particle-label");
            this.labelElement.setAttribute("fill", "#2c3e50");
            this.labelElement.setAttribute("font-size", "10");
            this.labelElement.setAttribute("font-weight", "bold");
            this.labelElement.textContent = this.label;
            this.labelElement.style.display = showParticleLabels ? 'block' : 'none';
            particleLayer.appendChild(this.labelElement);

            this.path = 'blood'; // Start in blood
            this.progress = 0;
            this.speed = 0.002 + Math.random() * 0.001;
            
            this.isReabsorbing = false;
            this.reabsorbTargetProgress = 0;
            this.currentX = 0;
            this.currentY = 0;
            
            // Get path elements for calculation
            this.bloodPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this.bloodPathEl.setAttribute("d", bloodPathData);
            this.nephronPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this.nephronPathEl.setAttribute("d", nephronPathData);
            
            this.bloodLength = this.bloodPathEl.getTotalLength();
            this.nephronLength = this.nephronPathEl.getTotalLength();

            // Ensure not all water/salt are reabsorbed: one-time checks per segment
            this.checkedPCT = false;
            this.checkedLoopWater = false;
            this.checkedLoopSalt = false;
            this.checkedDCT = false;
        }

        update() {
            // Handle Reabsorption Animation
            if (this.isReabsorbing) {
                const targetPoint = this.bloodPathEl.getPointAtLength(this.reabsorbTargetProgress * this.bloodLength);
                
                // Move towards target
                const dx = targetPoint.x - this.currentX;
                const dy = targetPoint.y - this.currentY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 5) {
                    // Arrived
                    this.isReabsorbing = false;
                    this.path = 'blood';
                    this.progress = this.reabsorbTargetProgress;
                } else {
                    // Lerp
                    this.currentX += dx * 0.1;
                    this.currentY += dy * 0.1;
                    this.element.setAttribute("cx", this.currentX);
                    this.element.setAttribute("cy", this.currentY);
                    return true;
                }
            }

            this.progress += this.speed;

            // Filtration Logic (at Glomerulus)
            // The glomerulus part is roughly 0.15 to 0.25 of blood path
            if (this.path === 'blood' && this.progress > 0.15 && this.progress < 0.25 && !this.filtered) {
                this.filtered = true;
                if (this.type !== 'protein') {
                    this.path = 'nephron';
                    this.progress = 0;
                } else {
                    // Protein normally retained; if proteinuria allow leak (probability)
                    if (pathology.proteinuria && Math.random() < 0.5) {
                        this.path = 'nephron';
                        this.progress = 0;
                    }
                }
            }

            // Reabsorption Logic (probabilistic, single-check per segment)
            if (this.path === 'nephron' && !this.isReabsorbing) {
                // PCT (approx 0.1 - 0.3 of nephron path)
                if (this.progress >= 0.12 && this.progress < 0.3 && !this.checkedPCT) {
                    this.checkedPCT = true;
                    if (this.type === 'glucose') {
                        // Saturable transport: under hyperglycemia some glucose escapes
                        if (!pathology.hyperglycemia || Math.random() < 0.9) {
                            this.startReabsorption(0.35);
                        }
                    } else if (this.type === 'water' || this.type === 'salt') {
                        // Majority reabsorbed here, but allow some to pass on
                        if (Math.random() < 0.6) {
                            this.startReabsorption(0.35 + Math.random() * 0.1);
                        }
                    }
                }
                // Loop of Henle (0.3 - 0.6)
                else if (this.progress >= 0.3 && this.progress < 0.6) {
                    // Descending limb: water
                    if (this.type === 'water' && this.progress < 0.45 && !this.checkedLoopWater) {
                        this.checkedLoopWater = true;
                        if (Math.random() < 0.3) {
                            this.startReabsorption(0.5);
                        }
                    }
                    // Ascending limb: salt
                    if (this.type === 'salt' && this.progress >= 0.48 && !this.checkedLoopSalt) {
                        this.checkedLoopSalt = true;
                        if (Math.random() < 0.3) {
                            this.startReabsorption(0.55);
                        }
                    }
                }
                // DCT (0.6 - 0.8)
                else if (this.progress >= 0.6 && this.progress < 0.8 && !this.checkedDCT) {
                    this.checkedDCT = true;
                    if (this.type === 'water' || this.type === 'salt') {
                        // Fine-tuning; small additional chance
                        if (Math.random() < 0.2) {
                            this.startReabsorption(0.7);
                        }
                    }
                }
            }

            // Calculate position
            let point;
            if (this.path === 'blood') {
                if (this.progress >= 1) {
                    this.remove();
                    return false;
                }
                point = this.bloodPathEl.getPointAtLength(this.progress * this.bloodLength);
            } else {
                if (this.progress >= 1) {
                    this.remove(); // To Urine
                    return false;
                }
                point = this.nephronPathEl.getPointAtLength(this.progress * this.nephronLength);
            }

            this.currentX = point.x;
            this.currentY = point.y;
            this.element.setAttribute("cx", this.currentX);
            this.element.setAttribute("cy", this.currentY);
            
            // Update label position (offset to the right)
            this.labelElement.setAttribute("x", this.currentX + this.radius + 3);
            this.labelElement.setAttribute("y", this.currentY + 4);
            
            return true;
        }

        startReabsorption(targetProgress) {
            this.isReabsorbing = true;
            this.reabsorbTargetProgress = targetProgress;
        }

        updateLabelVisibility() {
            this.labelElement.style.display = showParticleLabels ? 'block' : 'none';
        }

        remove() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            if (this.labelElement.parentNode) {
                this.labelElement.parentNode.removeChild(this.labelElement);
            }
        }
    }

    function animate() {
        if (!isRunning) return;

        // Spawn particles
        spawnTimer++;
        if (spawnTimer > 20) {
            particles.push(new Particle());
            spawnTimer = 0;
        }

        // Update particles
        particles = particles.filter(p => p.update());

        animationId = requestAnimationFrame(animate);
    }

    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            startBtn.textContent = "暫停";
            infoText.textContent = pathology.hyperglycemia || pathology.proteinuria ? infoText.textContent : '過濾與再吸收進行中';
            animate();
        } else {
            isRunning = false;
            startBtn.textContent = "繼續";
            cancelAnimationFrame(animationId);
        }
    });

    toggleLabelsBtn.addEventListener('click', () => {
        showParticleLabels = !showParticleLabels;
        toggleLabelsBtn.textContent = showParticleLabels ? '隱藏分子標籤' : '顯示分子標籤';
        particles.forEach(p => p.updateLabelVisibility());
    });

    resetBtn.addEventListener('click', () => {
        isRunning = false;
        startBtn.textContent = "開始模擬";
        cancelAnimationFrame(animationId);
        particles.forEach(p => p.remove());
        particles = [];
        infoText.textContent = "點擊「開始」以啟動模擬。";
    });

    hyperglycemiaBtn.addEventListener('click', () => {
        pathology.hyperglycemia = !pathology.hyperglycemia;
        hyperglycemiaBtn.classList.toggle('active', pathology.hyperglycemia);
        updatePathologyInfo();
    });

    proteinuriaBtn.addEventListener('click', () => {
        pathology.proteinuria = !pathology.proteinuria;
        proteinuriaBtn.classList.toggle('active', pathology.proteinuria);
        updatePathologyInfo();
    });

    toggleTooltipsBtn.addEventListener('click', () => {
        alwaysShowTooltips = !alwaysShowTooltips;
        toggleTooltipsBtn.textContent = alwaysShowTooltips ? '滑鼠顯示說明' : '總是顯示說明';
        
        const allRegions = document.querySelectorAll('.interactive-region');
        
        if (alwaysShowTooltips) {
            // Show all tooltips for all regions
            allRegions.forEach(el => {
                if (el._showTooltip && el._tooltip) {
                    el._showTooltip();
                    el._tooltip.classList.add('always-show');
                }
            });
        } else {
            // Return to hover mode - hide all tooltips
            allRegions.forEach(el => {
                if (el._hideTooltip && el._tooltip) {
                    el._tooltip.classList.remove('always-show', 'visible');
                    el._tooltip.style.display = 'none';
                    el.classList.remove('region-hover');
                }
            });
        }
    });

    drawStructures();
});

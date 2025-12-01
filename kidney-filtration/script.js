document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('nephron-svg');
    const structureLayer = document.getElementById('structure-layer');
    const particleLayer = document.getElementById('particle-layer');
    const labelLayer = document.getElementById('label-layer');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
    const infoText = document.getElementById('info-text');

    let isRunning = false;
    let particles = [];
    let animationId;
    let spawnTimer = 0;
    let showParticleLabels = false;

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
    const bloodPathData = `
        M 50 140 
        L 110 140 
        C 120 120, 150 120, 160 140 
        C 170 160, 130 170, 130 140 
        C 130 120, 160 120, 160 150
        C 160 170, 120 170, 110 160
        L 110 160
        C 110 200, 200 200, 200 300 
        C 200 550, 400 550, 400 400 
        C 400 300, 500 300, 600 300 
        L 750 300
    `;

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
            title: '腎絲球 (Glomerulus)',
            description: '血液在此進行過濾作用。小分子（水、葡萄糖、鹽類、尿素）可通過，大分子（蛋白質）被阻擋。'
        },
        {
            id: 'pct-region',
            shape: 'rect',
            x: 220,
            y: 120,
            width: 100,
            height: 200,
            title: '近曲小管 (PCT)',
            description: '主要的再吸收區域。葡萄糖被完全再吸收，大部分的水和鹽類也在此回收。'
        },
        {
            id: 'loop-region',
            shape: 'rect',
            x: 250,
            y: 400,
            width: 150,
            height: 150,
            title: '亨利氏套 (Loop of Henle)',
            description: '下降支：水分再吸收。上升支：鹽類再吸收。此處建立滲透壓梯度，幫助尿液濃縮。'
        },
        {
            id: 'dct-region',
            shape: 'rect',
            x: 430,
            y: 220,
            width: 150,
            height: 120,
            title: '遠曲小管 (DCT)',
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
        const floatingTooltip = document.getElementById('floating-tooltip');
        const tooltipContent = floatingTooltip.querySelector('.tooltip-content');
        
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
            
            // Add hover events
            element.addEventListener('mouseenter', (e) => {
                // Calculate position next to the region
                const svgRect = svg.getBoundingClientRect();
                const containerRect = document.querySelector('.container').getBoundingClientRect();
                
                let tooltipX, tooltipY;
                
                if (region.shape === 'circle') {
                    // Position to the right of the circle
                    tooltipX = region.cx + region.r + 20;
                    tooltipY = region.cy;
                } else {
                    // Position to the right of the rectangle
                    tooltipX = region.x + region.width + 20;
                    tooltipY = region.y + region.height / 2;
                }
                
                // Convert SVG coordinates to page coordinates
                const svgPoint = svg.createSVGPoint();
                svgPoint.x = tooltipX;
                svgPoint.y = tooltipY;
                const screenPoint = svgPoint.matrixTransform(svg.getScreenCTM());
                
                // Set tooltip content
                tooltipContent.innerHTML = `<strong>${region.title}</strong>${region.description}`;
                
                // Position and show tooltip
                floatingTooltip.style.left = screenPoint.x + 'px';
                floatingTooltip.style.top = screenPoint.y + 'px';
                floatingTooltip.style.display = 'block';
                
                // Trigger reflow before adding visible class for smooth transition
                floatingTooltip.offsetHeight;
                floatingTooltip.classList.add('visible');
                
                element.classList.add('region-hover');
            });
            
            element.addEventListener('mouseleave', () => {
                floatingTooltip.classList.remove('visible');
                setTimeout(() => {
                    floatingTooltip.style.display = 'none';
                }, 300);
                element.classList.remove('region-hover');
            });
            
            structureLayer.appendChild(element);
        });

        // Labels
        addLabel(100, 80, "鮑氏囊 (Bowman's Capsule)");
        addLabel(100, 200, "腎絲球 (Glomerulus)");
        addLabel(280, 200, "近曲小管 (PCT)");
        addLabel(330, 520, "亨利氏套 (Loop of Henle)");
        addLabel(530, 250, "遠曲小管 (DCT)");
        addLabel(610, 500, "集尿管 (Collecting Duct)");
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
    const particleTypes = [
        { type: 'water', color: '#3498db', radius: 4, label: '水' },
        { type: 'salt', color: '#e74c3c', radius: 4, label: '鹽' },
        { type: 'urea', color: '#f1c40f', radius: 4, label: '尿素' },
        { type: 'protein', color: '#9b59b6', radius: 6, label: '蛋白質' },
        { type: 'glucose', color: '#2ecc71', radius: 5, label: '葡萄糖' }
    ];

    class Particle {
        constructor() {
            const typeData = particleTypes[Math.floor(Math.random() * particleTypes.length)];
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
                    // Filtration: Move to nephron path
                    this.path = 'nephron';
                    this.progress = 0; // Reset progress for new path
                    infoText.textContent = "過濾作用：小分子（水、鹽、葡萄糖、尿素）進入鮑氏囊。";
                } else {
                    infoText.textContent = "過濾作用：蛋白質太大，留在血管中。";
                }
            }

            // Reabsorption Logic
            if (this.path === 'nephron' && !this.isReabsorbing) {
                // PCT (approx 0.1 - 0.3 of nephron path)
                if (this.progress > 0.1 && this.progress < 0.3) {
                    if (this.type === 'glucose') {
                        this.startReabsorption(0.35); // Reabsorb to early capillary
                        infoText.textContent = "再吸收：葡萄糖在近曲小管被完全再吸收回血液。";
                    } else if ((this.type === 'water' || this.type === 'salt') && Math.random() < 0.02) {
                        this.startReabsorption(0.35 + Math.random() * 0.1);
                    }
                }
                // Loop of Henle (0.3 - 0.6)
                else if (this.progress > 0.3 && this.progress < 0.6) {
                    if (this.type === 'water' && this.progress < 0.45 && Math.random() < 0.02) {
                         this.startReabsorption(0.5); // Descending limb water
                    } else if (this.type === 'salt' && this.progress > 0.45 && Math.random() < 0.02) {
                         this.startReabsorption(0.55); // Ascending limb salt
                    }
                }
                // DCT (0.6 - 0.8)
                else if (this.progress > 0.6 && this.progress < 0.8) {
                    if ((this.type === 'water' || this.type === 'salt') && Math.random() < 0.02) {
                        this.startReabsorption(0.7);
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
        infoText.textContent = "點擊「開始模擬」以觀察腎臟運作過程。";
    });

    drawStructures();
});

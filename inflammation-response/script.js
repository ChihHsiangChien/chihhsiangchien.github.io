document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('inflammation-viz');
    const vesselGroup = document.getElementById('vessel-group');
    const vesselLumen = document.getElementById('vessel-lumen');
    const bloodCellsGroup = document.getElementById('blood-cells');
    const injurySite = document.getElementById('injury-site');
    const swellingOverlay = document.getElementById('swelling-overlay');
    const nerve = document.getElementById('nerve');
    const nerveEnding = document.getElementById('nerve-ending');
    
    const stageTitle = document.getElementById('stage-title');
    const stageDesc = document.getElementById('stage-desc');
    const mechanismDesc = document.getElementById('mechanism-desc');
    const buttons = document.querySelectorAll('.toggle-btn');
    const resetBtn = document.getElementById('reset-btn');

    // State
    let particles = [];
    let animationId;
    let flowSpeed = 2;
    let vesselWidth = 80; // Current width
    let targetWidth = 80; // Target width
    let isVasodilation = false;
    let isLeaking = false;
    const activeEffects = new Set();

    // Initialize Particles
    function initParticles() {
        // Create RBCs
        for (let i = 0; i < 40; i++) {
            createParticle('rbc');
        }
        // Create WBCs
        for (let i = 0; i < 10; i++) {
            createParticle('wbc');
        }
        // Create Plasma particles
        for (let i = 0; i < 20; i++) {
            createParticle('plasma');
        }
    }

    function createParticle(type) {
        const cell = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let r, fill, opacity;

        if (type === 'rbc') {
            r = 4 + Math.random() * 2;
            fill = "#ff8787"; // Red
            opacity = 0.8;
        } else if (type === 'wbc') {
            r = 6 + Math.random() * 2;
            fill = "#f8f9fa"; // White/Light Grey
            opacity = 0.9;
            cell.setAttribute("stroke", "#dee2e6");
            cell.setAttribute("stroke-width", "1");
        } else if (type === 'plasma') {
            r = 2 + Math.random() * 1;
            fill = "#ffd43b"; // Yellowish
            opacity = 0.6;
        }

        cell.setAttribute("r", r);
        cell.setAttribute("fill", fill);
        cell.setAttribute("opacity", opacity);
        
        // Random initial position
        const x = Math.random() * 800;
        const y = 10 + Math.random() * (vesselWidth - 20); // Keep inside lumen
        
        cell.setAttribute("cx", x);
        cell.setAttribute("cy", y);
        
        bloodCellsGroup.appendChild(cell);
        
        particles.push({
            el: cell,
            type: type,
            x: x,
            y: y,
            r: r,
            speedOffset: Math.random() * 0.5 + 0.8, // Individual speed variation
            leaked: false
        });
    }

    // DOM Elements
    const skinSurface = document.getElementById('skin-surface');
    const skinLayerFill = document.getElementById('skin-layer-fill');
    const tissueBg = document.getElementById('tissue-bg');
    // swellingOverlay already defined
    
    let swellingLevel = 0; // 0 to 1

    // Animation Loop
    function animate() {
        // Update Vessel Width (Smooth transition)
        const widthDiff = targetWidth - vesselWidth;
        if (Math.abs(widthDiff) > 0.5) {
            vesselWidth += widthDiff * 0.05;
        }
        
        // Update Swelling Level
        const targetSwelling = activeEffects.has('swelling') ? 1 : 0;
        const swellingDiff = targetSwelling - swellingLevel;
        if (Math.abs(swellingDiff) > 0.01) {
            swellingLevel += swellingDiff * 0.05;
        }

        // Animate Skin Surface (Bulge Up)
        // Normal: M 0 50 L 800 50
        // Swelling: M 0 50 Q 400 0 800 50 (Bulge up to y=0)
        const bulgeY = 50 - (swellingLevel * 50);
        const skinPath = `M 0 50 Q 400 ${bulgeY} 800 50`;
        skinSurface.setAttribute("d", skinPath);

        // Animate Skin Layer Fill (Follow bulge)
        // Top is flat at 0, Bottom follows bulgeY
        const skinFillPath = `M 0 0 L 800 0 L 800 50 Q 400 ${bulgeY} 0 50 Z`;
        skinLayerFill.setAttribute("d", skinFillPath);

        // Animate Tissue Background (Follow bulge)
        // Top follows bulgeY, Bottom flat at 300
        const tissuePath = `M 0 50 Q 400 ${bulgeY} 800 50 L 800 300 L 0 300 Z`;
        tissueBg.setAttribute("d", tissuePath);

        // Animate Swelling Overlay (Match Bulge)
        // Shape: M 0 50 Q 400 bulgeY 800 50 L 800 300 L 0 300 Z
        const overlayPath = `M 0 50 Q 400 ${bulgeY} 800 50 L 800 300 L 0 300 Z`;
        swellingOverlay.setAttribute("d", overlayPath);
        swellingOverlay.setAttribute("opacity", swellingLevel * 0.3); // Max opacity 0.3

        // Calculate centering
        // Fixed center at y=50 (relative to group)
        // Lumen Y starts at 50 - width/2
        const lumenY = 50 - (vesselWidth / 2);
        vesselLumen.setAttribute("height", vesselWidth);
        vesselLumen.setAttribute("y", lumenY);
        
        // Update Walls
        const vesselWallTop = document.getElementById('vessel-wall-top');
        const vesselWallBottom = document.getElementById('vessel-wall-bottom');
        
        // Top Wall
        vesselWallTop.setAttribute("y", lumenY - 10);
        vesselWallTop.setAttribute("height", 10);
        
        // Bottom Wall
        vesselWallBottom.setAttribute("y", lumenY + vesselWidth);
        vesselWallBottom.setAttribute("height", 10);

        // Update Particles
        particles.forEach(p => {
            if (p.leaked) {
                // Leaked cells logic
                if (p.type === 'wbc') {
                    // Chemotaxis: Move towards injury site (400, -250 relative to vessel group)
                    // Note: Injury site visual is at y=80 (in root SVG), vessel group at y=300.
                    // So relative y = 80 - 300 = -220.
                    const targetX = 400;
                    const targetY = -220;
                    const dx = targetX - p.x;
                    const dy = targetY - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist > 10) {
                        p.x += (dx / dist) * 1.0;
                        p.y += (dy / dist) * 1.0;
                    } else {
                        // Arrived, jitter
                        p.x += (Math.random() - 0.5);
                        p.y += (Math.random() - 0.5);
                    }
                } else {
                    // Plasma: Drift up and spread
                    p.y -= 0.5;
                    p.x += (Math.random() - 0.5) * 2;
                    // Stop at skin surface (approx -250 relative to vessel group)
                    // Skin is at y=50, vessel group at y=300 -> relative y = -250
                    if (p.y < -250) p.y = -250; 
                }
            } else {
                // Normal flow
                p.x += flowSpeed * p.speedOffset;
                
                // Wrap around
                if (p.x > 800) {
                    p.x = -20;
                    // Reset y to be within new lumen bounds
                    p.y = lumenY + Math.random() * vesselWidth;
                }

                // Keep existing particles within bounds if they are drifting out due to contraction
                // Or just let them be, but for expansion they are fine.
                // If vessel contracts, particles might be outside.
                // Simple constraint:
                if (p.y < lumenY) p.y = lumenY + 1;
                if (p.y > lumenY + vesselWidth) p.y = lumenY + vesselWidth - 1;

                // Leakage Logic (Only in swelling/pain stage)
                // Only WBC and Plasma leak
                if (isLeaking && !p.leaked && (p.type === 'wbc' || p.type === 'plasma')) {
                    // Higher chance for plasma, lower for WBC
                    const chance = p.type === 'plasma' ? 0.01 : 0.005;
                    
                    if (Math.random() < chance && p.x > 300 && p.x < 500) {
                        p.leaked = true;
                        // No need to call animateLeakage, handled in main loop now
                    }
                }
            }

            // Update DOM
            p.el.setAttribute("cx", p.x);
            p.el.setAttribute("cy", p.y);
        });

        // Nerve Animation (Pain stage)
        if (activeEffects.has('pain')) {
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                nerve.setAttribute("stroke", "#ff6b6b");
                nerveEnding.setAttribute("fill", "#ff6b6b");
            } else {
                nerve.setAttribute("stroke", "#ffd43b");
                nerveEnding.setAttribute("fill", "#ffd43b");
            }
        } else {
            nerve.setAttribute("stroke", "#ffd43b");
            nerveEnding.setAttribute("fill", "#ffd43b");
        }

        animationId = requestAnimationFrame(animate);
    }

    function updateVisualization() {
        // Defaults
        let newTargetWidth = 80;
        let newFlowSpeed = 2;
        isLeaking = false;
        let isPain = false;
        let injuryOpacity = 0;
        let swellingOpacity = 0;

        // Apply Effects
        if (activeEffects.has('red')) {
            newTargetWidth = 120; // Vasodilation
            injuryOpacity = 1;
        }
        if (activeEffects.has('heat')) {
            newFlowSpeed = 5; // Increased speed
        }
        if (activeEffects.has('swelling')) {
            isLeaking = true;
            swellingOpacity = 1;
        }
        if (activeEffects.has('pain')) {
            isPain = true;
        }

        // Update Logic Params
        targetWidth = newTargetWidth;
        flowSpeed = newFlowSpeed;
        
        // Visual Updates
        injurySite.style.transition = "opacity 1s";
        injurySite.setAttribute("opacity", activeEffects.size > 0 ? 1 : 0); // Show injury if any inflammation

        swellingOverlay.style.transition = "opacity 1s";
        swellingOverlay.setAttribute("opacity", swellingOpacity);

        // Vessel Color Change
        const stop1 = document.getElementById('vessel-stop-1');
        const stop2 = document.getElementById('vessel-stop-2');
        
        if (activeEffects.size > 0) {
            // Inflamed color
            stop1.style.stopColor = "#ff0000";
            stop2.style.stopColor = "#cc0000";
        } else {
            // Normal color
            stop1.style.stopColor = "#ff8787";
            stop2.style.stopColor = "#ff8787";
        }

        // Nerve Animation State handled in animate()
        const nerve = document.getElementById('nerve');
        const nerveEnding = document.getElementById('nerve-ending');
        if (isPain) {
            nerve.style.animation = "nervePulse 0.5s infinite alternate";
            nerveEnding.style.fill = "#ff0000";
        } else {
            nerve.style.animation = "none";
            nerveEnding.style.fill = "#ffd43b";
        }

        // Update Text
        updateText();
    }

    function updateText() {
        if (activeEffects.size === 0) {
            stageTitle.textContent = "正常狀態";
            stageDesc.textContent = "組織與血管處於恆定狀態，血流速度正常，無發炎反應。";
            mechanismDesc.textContent = "--";
            return;
        }

        const titles = [];
        const descs = [];
        const mechs = [];

        if (activeEffects.has('red')) {
            titles.push("紅 (Redness)");
            descs.push("血管擴張，血流增加。");
            mechs.push("組織胺促使血管平滑肌舒張，管徑變大，血流量增加，導致局部發紅。");
        }
        if (activeEffects.has('heat')) {
            titles.push("熱 (Heat)");
            descs.push("血流速度加快，代謝活躍。");
            mechs.push("充血與代謝率增加，將深層體溫帶至體表，導致局部發熱。");
        }
        if (activeEffects.has('swelling')) {
            titles.push("腫 (Swelling)");
            descs.push("組織液與白血球滲出。");
            mechs.push("血管通透性增加，血漿與白血球滲入組織間隙，造成局部腫脹。");
        }
        if (activeEffects.has('pain')) {
            titles.push("痛 (Pain)");
            descs.push("神經受壓迫與刺激。");
            mechs.push("腫脹壓迫神經末梢，加上發炎介質（如前列腺素）刺激，產生疼痛感。");
        }

        stageTitle.textContent = titles.join(" + ");
        stageDesc.textContent = descs.join(" ");
        mechanismDesc.innerHTML = mechs.map(m => `<li>${m}</li>`).join("");
    }

    // Event Listeners
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
            updateVisualization();
        });
    }

    // Initial Update
    updateVisualization();

    // Start
    initParticles();
    animate();
});

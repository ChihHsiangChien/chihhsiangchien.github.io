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
    const buttons = document.querySelectorAll('.stage-btn');

    // State
    let currentStage = 'normal';
    let particles = [];
    let animationId;
    let flowSpeed = 2;
    let vesselWidth = 80; // Initial height of lumen
    let isVasodilation = false;
    let isLeaking = false;

    // Configuration
    const config = {
        normal: {
            speed: 2,
            width: 80,
            vasodilation: false,
            leaking: false,
            injuryOpacity: 0,
            swellingOpacity: 0,
            nerveActive: false,
            title: "正常狀態 (Normal)",
            desc: "組織與血管處於恆定狀態，血流速度正常，無發炎反應。",
            mech: "生理平衡：血管壁完整，血流穩定，無免疫細胞聚集。"
        },
        red: {
            speed: 3,
            width: 120, // Vasodilation
            vasodilation: true,
            leaking: false,
            injuryOpacity: 1,
            swellingOpacity: 0,
            nerveActive: false,
            title: "紅 (Redness / Rubor)",
            desc: "受傷後，組織釋放組織胺(Histamine)等化學物質，導致微血管擴張，血流量增加，使患部發紅。",
            mech: "微血管擴張 (Vasodilation)：增加局部血流量，帶來更多免疫細胞。"
        },
        heat: {
            speed: 5, // Faster flow
            width: 120,
            vasodilation: true,
            leaking: false,
            injuryOpacity: 1,
            swellingOpacity: 0,
            nerveActive: false,
            title: "熱 (Heat / Calor)",
            desc: "大量的血液流向患部，血液帶有體熱，導致局部溫度升高，有助於抑制細菌生長並加速代謝。",
            mech: "充血 (Hyperemia)：血流速度與流量增加，將核心體溫帶至周邊組織。"
        },
        swelling: {
            speed: 2, // Slows down due to leakage/stasis
            width: 120,
            vasodilation: true,
            leaking: true,
            injuryOpacity: 1,
            swellingOpacity: 0.4,
            nerveActive: false,
            title: "腫 (Swelling / Tumor)",
            desc: "血管通透性增加，白血球與富含蛋白質的血漿從血管滲入組織間隙，造成局部水腫。",
            mech: "血管通透性增加 (Increased Permeability)：內皮細胞收縮，讓血漿與白血球滲出至組織。"
        },
        pain: {
            speed: 2,
            width: 120,
            vasodilation: true,
            leaking: true,
            injuryOpacity: 1,
            swellingOpacity: 0.4,
            nerveActive: true,
            title: "痛 (Pain / Dolor)",
            desc: "腫脹壓迫神經末梢，加上發炎介質(如前列腺素、巴緩激肽)直接刺激痛覺受器，產生疼痛感。",
            mech: "神經壓迫與化學刺激：組織腫脹壓迫神經，化學物質(PGE2, Bradykinin)降低痛覺閾值。"
        }
    };

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

    // Animation Loop
    function animate() {
        // Update Vessel Width (Smooth transition)
        const targetWidth = config[currentStage].width;
        const widthDiff = targetWidth - vesselWidth;
        if (Math.abs(widthDiff) > 0.5) {
            vesselWidth += widthDiff * 0.05;
        }
        
        // Calculate centering
        // Fixed center at y=50 (relative to group)
        // Lumen Y starts at 50 - width/2
        const lumenY = 50 - (vesselWidth / 2);
        vesselLumen.setAttribute("height", vesselWidth);
        vesselLumen.setAttribute("y", lumenY);
        
        // Update Walls
        const vesselWallTop = document.getElementById('vessel-wall-top');
        const vesselWallBottom = document.getElementById('vessel-wall-bottom');
        
        // Top Wall: Ends at lumenY. Height fixed at 10 or dynamic? Let's keep it fixed thickness 10 for now, or stretch?
        // User said "expand up and down". If wall is the boundary, it should move.
        // Let's say wall thickness is 10.
        vesselWallTop.setAttribute("y", lumenY - 10);
        vesselWallTop.setAttribute("height", 10);
        
        // Bottom Wall: Starts at lumenY + width
        vesselWallBottom.setAttribute("y", lumenY + vesselWidth);
        vesselWallBottom.setAttribute("height", 10);

        // Update Particles
        particles.forEach(p => {
            if (p.leaked) {
                // Leaked cells logic
                if (p.type === 'wbc') {
                    // Chemotaxis: Move towards injury site (400, -250 relative to vessel group)
                    const targetX = 400;
                    const targetY = -250;
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
                    if (p.y < -280) p.y = -280; // Stop at top
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
        if (config[currentStage].nerveActive) {
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

    function animateLeakage(p) {
        // Move cell from vessel (y > 0) to tissue (y < 0)
        let currentY = p.y;
        let currentX = p.x;
        
        // Target for WBCs: Injury Site (approx 400, 50)
        // Note: Tissue Y is 0-300 in SVG coords, but vessel group is translated by (0, 300).
        // So injury site (y=50) is at y = 50 - 300 = -250 relative to vessel group?
        // No, injury site is in root SVG at y=50. Vessel group is at y=300.
        // So relative to vessel group, injury site is at y = 50 - 300 = -250.
        // Current p.y is relative to vessel group (e.g., 10 to 90).
        
        const targetY = -250 + Math.random() * 40; // Near injury site
        const targetX = 400 + (Math.random() - 0.5) * 60;

        function step() {
            if (p.type === 'wbc') {
                // Chemotaxis: Move towards injury
                const dx = targetX - currentX;
                const dy = targetY - currentY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    currentX += (dx / dist) * 1.5; // Speed
                    currentY += (dy / dist) * 1.5;
                }
            } else {
                // Plasma: Just drift up and spread
                if (currentY > -280) {
                    currentY -= 1;
                    currentX += (Math.random() - 0.5) * 2;
                }
            }
            
            p.el.setAttribute("cx", currentX);
            p.el.setAttribute("cy", currentY);
            
            // Update stored pos for next frame if needed, but this loop runs independently?
            // Actually, animate() loop also updates p.x/p.y. We should probably handle this in animate() 
            // or disable animate() update for leaked particles.
            // Currently animate() handles leaked particles:
            // if (p.leaked) { p.x += 0.1; ... }
            // So we should NOT use a separate loop here, but update the logic in animate().
        }
        // step(); // Don't run separate loop. Update animate() instead.
    }

    // Stage Switching Logic
    function setStage(stage) {
        currentStage = stage;
        const data = config[stage];
        
        // Update UI
        stageTitle.textContent = data.title;
        stageDesc.textContent = data.desc;
        mechanismDesc.textContent = data.mech;
        
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.stage === stage) btn.classList.add('active');
        });

        // Update Logic Params
        flowSpeed = data.speed;
        isVasodilation = data.vasodilation;
        isLeaking = data.leaking;

        // Visual Updates
        injurySite.style.transition = "opacity 1s";
        injurySite.setAttribute("opacity", data.injuryOpacity);

        swellingOverlay.style.transition = "opacity 1s";
        swellingOverlay.setAttribute("opacity", data.swellingOpacity);

        // Vessel Color Change
        const stop1 = document.getElementById('vessel-stop-1');
        const stop2 = document.getElementById('vessel-stop-2');
        
        if (stage !== 'normal') {
            // Inflamed color (Brighter/Darker Red)
            stop1.style.stopColor = "#ff0000";
            stop2.style.stopColor = "#cc0000";
        } else {
            // Normal color
            stop1.style.stopColor = "#ff8787";
            stop2.style.stopColor = "#ff8787";
        }

        // Reset leaked cells if going back to normal
        if (stage === 'normal') {
            particles.forEach(p => {
                p.leaked = false;
                p.y = 10 + Math.random() * (80 - 20);
                p.el.setAttribute("cy", p.y);
            });
        }
    }

    // Event Listeners
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            setStage(btn.dataset.stage);
        });
    });

    // Start
    initParticles();
    animate();
});

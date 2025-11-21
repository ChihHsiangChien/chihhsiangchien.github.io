const state = {
    currentStep: 1,
    isAnimating: true,
    cells: [],
    woundOpen: false
};

const elements = {
    svg: document.getElementById('main-svg'),
    bloodFlowLayer: document.getElementById('blood-flow-layer'),
    woundLayer: document.getElementById('wound-layer'),
    clotLayer: document.getElementById('clot-layer'),
    fibrinLayer: document.getElementById('fibrin-layer'),
    stepButtons: document.querySelectorAll('.step-btn'),
    stepTitle: document.getElementById('step-title'),
    stepDesc: document.getElementById('step-desc'),
    progressFill: document.getElementById('progress-fill'),
    tissueLayer: document.getElementById('tissue-layer')
};

const stepInfo = {
    1: {
        title: "1. 正常血管 (Normal Vessel)",
        desc: "血液在血管中順暢流動。紅血球(紅色)負責輸送氧氣，白血球(白色)負責免疫，血小板(黃色)則準備隨時修補漏洞。"
    },
    2: {
        title: "2. 受傷出血 (Injury)",
        desc: "血管壁破裂！血液開始流出血管外。這時身體必須立刻做出反應。"
    },
    3: {
        title: "3. 血小板栓塞 (Platelet Plug)",
        desc: "血小板接觸到受傷部位的膠原蛋白後被活化，變得有黏性，聚集在傷口處形成暫時的塞子。"
    },
    4: {
        title: "4. 凝血因子與纖維 (Coagulation)",
        desc: "血液中的凝血因子啟動，將纖維蛋白原轉化為纖維蛋白(Fibrin)。這些纖維像網子一樣覆蓋在傷口上。"
    },
    5: {
        title: "5. 血塊與癒合 (Clot & Healing)",
        desc: "紅血球被纖維網攔截，形成堅固的血塊(痂)。白血球清除入侵的細菌。傷口開始癒合。"
    }
};

// Cell Types
const CELL_TYPES = {
    RBC: 'rbc',
    WBC: 'wbc',
    PLATELET: 'platelet'
};

function init() {
    // Create initial cells (Increased RBC count for better flow visual)
    for (let i = 0; i < 50; i++) {
        createCell(CELL_TYPES.RBC, Math.random() * 800);
    }
    for (let i = 0; i < 3; i++) {
        createCell(CELL_TYPES.WBC, Math.random() * 800);
    }
    for (let i = 0; i < 15; i++) {
        createCell(CELL_TYPES.PLATELET, Math.random() * 800);
    }

    // Event Listeners
    elements.stepButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt(btn.dataset.step);
            setStep(step);
        });
    });

    // Start Animation Loop
    animate();
}

function createCell(type, x) {
    const cell = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    // Narrower vessel: Y between 120 and 180
    let y = 120 + Math.random() * 60; 
    let r = 0;
    let fill = '';
    let speed = 2 + Math.random() * 2;

    if (type === CELL_TYPES.RBC) {
        r = 12;
        fill = "url(#rbcGradient)";
    } else if (type === CELL_TYPES.WBC) {
        r = 15;
        fill = "url(#wbcGradient)";
        speed *= 0.8; // WBCs are slower
    } else if (type === CELL_TYPES.PLATELET) {
        r = 5;
        fill = "url(#plateletGradient)";
        speed *= 1.2; // Platelets are faster/smaller
    }

    cell.setAttribute("cx", x);
    cell.setAttribute("cy", y);
    cell.setAttribute("r", r);
    cell.setAttribute("fill", fill);
    
    // Store data for animation
    cell.dataset.speed = speed;
    cell.dataset.type = type;
    cell.dataset.x = x;
    cell.dataset.y = y;

    elements.bloodFlowLayer.appendChild(cell);
    state.cells.push(cell);
}

function setStep(step) {
    state.currentStep = step;
    
    // Update UI
    elements.stepButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.step) === step);
    });
    elements.stepTitle.textContent = stepInfo[step].title;
    elements.stepDesc.textContent = stepInfo[step].desc;
    elements.progressFill.style.width = `${step * 20}%`;

    // Reset/Update Visualization State
    updateVisualizationState(step);
}

function updateVisualizationState(step) {
    // 1. Handle Wound Layer (Step 2+)
    if (step < 2) {
        elements.woundLayer.innerHTML = '';
        state.woundOpen = false;
    } else {
        state.woundOpen = true;
        // Only create if not already present (Persist state)
        if (!elements.woundLayer.hasChildNodes()) {
            // Jagged cut
            const topWall = document.getElementById('vessel-wall-top');
            const skinTop = document.getElementById('skin-top');
            topWall.setAttribute("d", "M-100,100 L350,100 L350,110 L-100,110 Z M450,100 L900,100 L900,110 L450,110 Z");
            skinTop.setAttribute("d", "M-100,0 L350,0 L350,50 L-100,50 Z M450,0 L900,0 L900,50 L450,50 Z");

            // Add some "blood" background in the wound gap
            const bleed = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bleed.setAttribute("x", 350);
            bleed.setAttribute("y", 0);
            bleed.setAttribute("width", 100);
            bleed.setAttribute("height", 110);
            bleed.setAttribute("fill", "#e74c3c"); // Darker red for blood
            bleed.setAttribute("opacity", "0.6"); // More opaque
            elements.woundLayer.appendChild(bleed);

            // Add Bacteria (Green dots)
            createBacteria(true);
        }
    }

    // 2. Handle Platelet Plug (Step 3+)
    // Only reset stuck platelets if we go BACK before step 3
    if (step < 3) {
        state.cells.forEach(cell => {
            if (cell.dataset.type === CELL_TYPES.PLATELET && cell.dataset.stuck === "true") {
                cell.dataset.stuck = "false";
                cell.removeAttribute("transform");
            }
        });
    }

    // 3. Handle Fibrin Net (Step 4+)
    if (step < 4) {
        elements.fibrinLayer.innerHTML = '';
    } else {
        // Persist: Only create if empty
        if (!elements.fibrinLayer.hasChildNodes()) {
            createFibrinNet(true);
        }
    }

    // 4. Handle Clot/Scab & RBC Trapping (Step 5+)
    if (step < 5) {
        elements.clotLayer.innerHTML = '';
        // Release stuck RBCs if going back
        state.cells.forEach(cell => {
            if (cell.dataset.type === CELL_TYPES.RBC && cell.dataset.stuck === "true") {
                cell.dataset.stuck = "false";
                cell.removeAttribute("transform");
            }
        });
    } else {
        if (!elements.clotLayer.hasChildNodes()) {
            createClot(true);
            activateWBCDefense();
        }
    }

    // General Cell Reset for Step 1 (Normal)
    if (step === 1) {
        const topWall = document.getElementById('vessel-wall-top');
        const skinTop = document.getElementById('skin-top');
        topWall.setAttribute("d", "M-100,100 L900,100 L900,110 L-100,110 Z");
        skinTop.setAttribute("d", "M-100,0 L900,0 L900,50 L-100,50 Z");

        state.cells.forEach(cell => {
            cell.dataset.stuck = "false";
            cell.dataset.leaking = "false";
            cell.removeAttribute("transform");
        });
    }
}

function createBacteria(animate) {
    const count = 8;
    for (let i = 0; i < count; i++) {
        const b = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const x = 360 + Math.random() * 80;
        const y = 10 + Math.random() * 80; // In the wound area
        
        b.setAttribute("r", 3);
        b.setAttribute("fill", "#2ecc71"); // Green
        b.classList.add("bacteria"); // Mark for WBC target
        
        if (animate) {
            b.setAttribute("opacity", 0);
            b.animate([
                { opacity: 0, transform: 'translateY(-20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], {
                duration: 800,
                delay: Math.random() * 500,
                fill: 'forwards'
            });
        }
        
        elements.woundLayer.appendChild(b);
    }
}

function activateWBCDefense() {
    // Find existing bacteria
    const bacteria = document.querySelectorAll('.bacteria');
    if (bacteria.length === 0) return;

    // Find some WBCs from the blood flow to recruit
    const wbcs = state.cells.filter(c => c.dataset.type === CELL_TYPES.WBC);
    
    // Recruit up to 3 WBCs
    const recruited = wbcs.slice(0, 3);
    
    recruited.forEach((wbc, index) => {
        // Better: Create new "Active WBCs" in the wound layer
        const defenseWBC = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        defenseWBC.setAttribute("r", 15);
        defenseWBC.setAttribute("fill", "url(#wbcGradient)");
        defenseWBC.setAttribute("cx", wbc.getAttribute("cx"));
        defenseWBC.setAttribute("cy", wbc.getAttribute("cy"));
        elements.clotLayer.appendChild(defenseWBC);
        
        // Target a bacterium
        if (index < bacteria.length) {
            const target = bacteria[index];
            const tx = parseFloat(target.getAttribute("cx") || 400);
            const ty = parseFloat(target.getAttribute("cy") || 50);
            
            const anim = defenseWBC.animate([
                { cx: defenseWBC.getAttribute("cx"), cy: defenseWBC.getAttribute("cy") },
                { cx: tx, cy: ty }
            ], {
                duration: 1500,
                easing: 'ease-in-out',
                fill: 'forwards'
            });
            
            anim.onfinish = () => {
                // "Eat" the bacteria
                target.animate([
                    { transform: 'scale(1)', opacity: 1 },
                    { transform: 'scale(0)', opacity: 0 }
                ], { duration: 300, fill: 'forwards' });
                
                // Pulse WBC
                defenseWBC.animate([
                    { r: 15 }, { r: 18 }, { r: 15 }
                ], { duration: 500 });
            };
        }
    });
}

function createFibrinNet(animate) {
    const count = 30;
    for (let i = 0; i < count; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const x1 = 350 + Math.random() * 100;
        const y1 = 80 + Math.random() * 50;
        const x2 = 350 + Math.random() * 100;
        const y2 = 80 + Math.random() * 50;
        
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#fff");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("opacity", "0.6");
        
        if (animate) {
            const length = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            line.setAttribute("stroke-dasharray", length);
            line.setAttribute("stroke-dashoffset", length);
            
            line.animate([
                { strokeDashoffset: length },
                { strokeDashoffset: 0 }
            ], {
                duration: 500 + Math.random() * 1000,
                easing: 'ease-in-out',
                fill: 'forwards'
            });
        }
        
        elements.fibrinLayer.appendChild(line);
    }
}

function createClot(animate) {
    // Scab overlay (appears after some time)
    const scab = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M350,100 Q400,80 450,100 Q450,110 400,115 Q350,110 350,100 Z`;
    scab.setAttribute("d", d);
    scab.setAttribute("fill", "#5a2a2a");
    scab.setAttribute("opacity", "0.6");
    
    // Initially hidden, fades in later to represent the dried clot
    if (animate) {
        scab.setAttribute("opacity", 0);
        scab.animate([
            { opacity: 0 },
            { opacity: 0.8 }
        ], {
            duration: 2000,
            delay: 3000, // Wait for cells to get trapped first
            fill: 'forwards'
        });
    }
}

function animate() {
    // Count stuck platelets for Positive Feedback (Chemical Attraction)
    let stuckPlatelets = 0;
    if (state.currentStep >= 3) {
        stuckPlatelets = state.cells.filter(c => c.dataset.type === CELL_TYPES.PLATELET && c.dataset.stuck === "true").length;
    }

    state.cells.forEach(cell => {
        // If cell is stuck, don't move it
        if (cell.dataset.stuck === "true") return;

        let x = parseFloat(cell.dataset.x);
        let y = parseFloat(cell.dataset.y);
        let speed = parseFloat(cell.dataset.speed);
        const type = cell.dataset.type;

        // Normal Movement
        x += speed;

        // --- PLATELET PLUG LOGIC (Step 3+) ---
        // Biologically accurate: 
        // 1. Exposed collagen (wound area) activates platelets.
        // 2. Activated platelets release chemicals (ADP/TXA2) attracting more platelets (Positive Feedback).
        if (state.currentStep >= 3 && type === CELL_TYPES.PLATELET) {
            // Wound Gap X range: 350 to 450
            if (x > 340 && x < 460) {
                // A. Collagen Activation: If touching the wound edges/gap
                // The vessel wall ends at y=110. The gap is open.
                // If platelet is close to the gap (y < 125), it might touch collagen
                
                // B. Chemical Attraction (Positive Feedback)
                // The more stuck platelets, the stronger the pull
                const attractionStrength = 0.5 + (stuckPlatelets * 0.05); 
                
                // Pull towards the wound (y = 100-110)
                if (y > 110) {
                    y -= attractionStrength; 
                }

                // C. Sticking (Adhesion)
                // If it hits the "collagen" (wound boundary)
                if (y <= 115) {
                    // Check if it's actually in the gap (x 350-450)
                    if (x > 350 && x < 450) {
                        cell.dataset.stuck = "true";
                        
                        // Clamp position to the "plug" area (at the breach)
                        // Don't let them go too far out (keep them in the vessel wall gap)
                        if (y < 100) y = 100; 
                        
                        cell.dataset.x = x;
                        cell.dataset.y = y;
                        cell.setAttribute("cx", x);
                        cell.setAttribute("cy", y);
                        
                        // Visual Activation (Shape change/Rotation)
                        cell.setAttribute("transform", `rotate(${Math.random() * 360}, ${x}, ${y}) scale(1.2)`);
                        return;
                    }
                }
            }
        }

        // --- LEAK LOGIC (Step 2+) ---
        // If wound is open, cells near the gap have a chance to be pushed out
        if (state.woundOpen) {
            // Wound Gap X range: 350 to 450
            // We check a slightly wider range to catch approaching cells
            if (x > 320 && x < 480) {
                
                // Calculate distance to the "center" of the wound gap (x=400, y=100)
                const distToGap = Math.abs(x - 400);
                
                // Probability to leak increases if they are close to the top wall (y < 150)
                // RBCs (red) leak more easily visually
                let leakProb = 0.05; 
                if (type === CELL_TYPES.RBC) leakProb = 0.15;
                
                // In Step 3 (Platelet Plug), Platelets should leak more to form the plug
                // They are attracted instead (handled above), so reduce leak prob to 0 for them
                if (state.currentStep >= 3 && type === CELL_TYPES.PLATELET) {
                    leakProb = 0.0; 
                }

                // If cell is in the "danger zone"
                if (y < 160 && Math.random() < leakProb) {
                    // Start leaking!
                    cell.dataset.leaking = "true";
                }
            }
        }

        // If cell is leaking, modify its trajectory
        if (cell.dataset.leaking === "true") {
            // Move UP (negative Y) and slightly OUT (away from center x=400)
            y -= 1.5; // Upward speed
            
            // Horizontal spread
            if (x < 400) x -= 0.5;
            else x += 0.5;

            // Constrain X to wound gap (350-450) with padding
            if (x < 360) x = 360;
            if (x > 440) x = 440;

            // --- CLOTTING LOGIC (Step 5) ---
            // If Step 5 (Clot), leaking cells get trapped in the net
            if (state.currentStep >= 5) {
                // Trap zone: roughly the wound area
                if (y < 110 && y > 50 && x > 350 && x < 450) {
                    // High chance to get stuck
                    if (Math.random() < 0.2) {
                        cell.dataset.stuck = "true";
                        
                        // Update final position before stopping
                        cell.dataset.x = x;
                        cell.dataset.y = y;
                        cell.setAttribute("cx", x);
                        cell.setAttribute("cy", y);

                        // Visual effect for stuck cell
                        // Use SVG transform to rotate around the cell's center (x, y)
                        cell.setAttribute("transform", `rotate(${Math.random() * 360}, ${x}, ${y})`);
                        
                        return; // Stop processing this cell
                    }
                }
            }
        }

        // Reset if out of bounds (only if NOT stuck)
        // If it leaked out of the screen (top) or flowed past the right edge
        if (x > 850 || y < -50) {
            // Recycle cell
            cell.dataset.leaking = "false";
            cell.dataset.stuck = "false";
            cell.removeAttribute("transform"); // Clear rotation
            
            x = -50;
            // Narrower vessel reset
            y = 120 + Math.random() * 60; 
            cell.dataset.y = y;
            cell.setAttribute("cy", y);
        }

        // Update DOM
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.setAttribute("cx", x);
        cell.setAttribute("cy", y);
    });

    requestAnimationFrame(animate);
}

// Run init
init();

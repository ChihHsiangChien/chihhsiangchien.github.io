document.addEventListener('DOMContentLoaded', () => {
    const tissueContainer = document.getElementById('tissue-svg-container');
    const lungContainer = document.getElementById('lung-svg-container');

    // Initialize SVGs
    const tissueSystem = initTissueView(tissueContainer);
    const lungSystem = initLungView(lungContainer);

    // Global simulation state
    const simulation = {
        speed: 1,
        paused: false,
        speed: 1,
        paused: false,
        showGases: true,
        showLabels: false,
        tissue: tissueSystem,
        lung: lungSystem,
        lastTime: 0,
        spawnTimer: 0
    };

    // Event Listeners
    document.getElementById('toggle-animation').addEventListener('click', () => {
        simulation.paused = !simulation.paused;
    });

    document.getElementById('toggle-gases').addEventListener('change', (e) => {
        simulation.showGases = e.target.checked;
        // Toggle visibility of existing particles
        const display = simulation.showGases ? 'block' : 'none';
        [...simulation.tissue.particles, ...simulation.lung.particles].forEach(p => {
            p.element.style.display = display;
            // Also toggle labels if gases are hidden
            if (!simulation.showGases) {
                p.labelElement.style.display = 'none';
            } else if (simulation.showLabels) {
                p.labelElement.style.display = 'block';
            }
        });
    });

    document.getElementById('toggle-labels').addEventListener('change', (e) => {
        simulation.showLabels = e.target.checked;
        const display = simulation.showLabels && simulation.showGases ? 'block' : 'none';
        [...simulation.tissue.particles, ...simulation.lung.particles].forEach(p => {
            p.labelElement.style.display = display;
        });
    });

    document.getElementById('speed-control').addEventListener('input', (e) => {
        simulation.speed = parseFloat(e.target.value);
    });

    // Start Animation Loop
    requestAnimationFrame((timestamp) => animate(timestamp, simulation));
});

// --- Classes ---

class RBC {
    constructor(path, offset, type) {
        this.path = path; // SVG Path element
        this.totalLength = path.getTotalLength();
        this.offset = offset; // 0 to 1
        this.type = type; // 'tissue' or 'lung'
        this.oxygenated = type === 'tissue'; // Starts oxygenated in tissue view (entering)
        this.element = this.createSVG();
        this.o2Particles = [];
    }

    createSVG() {
        const ns = "http://www.w3.org/2000/svg";
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("r", 8);
        circle.setAttribute("class", "rbc");
        return circle;
    }

    update(dt, speed) {
        this.offset += (speed * dt * 0.05) / 1000; // Adjust speed scaling
        if (this.offset > 1) {
            this.offset -= 1;
            // Reset state when looping (conceptual loop)
            if (this.type === 'tissue') this.oxygenated = true; 
            if (this.type === 'lung') {
                this.oxygenated = false;
                // Clear attached particles so it enters deoxygenated
                this.o2Particles.forEach(p => {
                    p.element.remove();
                    p.labelElement.remove();
                });
                this.o2Particles = [];
            }
        }

        const point = this.path.getPointAtLength(this.offset * this.totalLength);
        this.element.setAttribute("cx", point.x);
        this.element.setAttribute("cy", point.y);

        // Color update based on oxygenation
        if (this.oxygenated) {
            this.element.style.fill = "var(--o2-color)"; // Bright red
        } else {
            this.element.style.fill = "#8b0000"; // Dark red
        }
        
        // Update attached particles
        this.o2Particles.forEach((p, i) => {
            // Simple offset for particles on RBC
            p.element.setAttribute("cx", point.x + (i%2===0?3:-3));
            p.element.setAttribute("cy", point.y + (i<2?3:-3));
        });
    }
}

class Particle {
    constructor(x, y, type, container) {
        this.x = x;
        this.y = y;
        this.type = type; // 'o2' or 'co2'
        this.element = this.createSVG();
        this.labelElement = this.createLabel();
        container.appendChild(this.element);
        container.appendChild(this.labelElement); // Append label after circle
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.state = 'free'; // 'free', 'bound', 'diffusing'
    }

    createSVG() {
        const ns = "http://www.w3.org/2000/svg";
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("r", 3);
        circle.setAttribute("class", `dot ${this.type}`); // Ensure CSS targets this
        circle.setAttribute("cx", this.x);
        circle.setAttribute("cy", this.y);
        return circle;
    }

    createLabel() {
        const ns = "http://www.w3.org/2000/svg";
        const text = document.createElementNS(ns, "text");
        text.textContent = this.type === 'o2' ? "氧氣" : "二氧化碳";
        text.setAttribute("class", "particle-label");
        text.setAttribute("x", this.x);
        text.setAttribute("y", this.y - 5);
        return text;
    }

    update(dt, speed = 1) {
        if (this.state === 'free') {
            this.x += this.vx * dt * speed * 0.1;
            this.y += this.vy * dt * speed * 0.1;
            this.element.setAttribute("cx", this.x);
            this.element.setAttribute("cy", this.y);
            this.labelElement.setAttribute("x", this.x);
            this.labelElement.setAttribute("y", this.y - 5);
        } else if (this.state === 'bound') {
            // Position is updated by the parent RBC
        }
    }
}

// --- View Initialization ---

function initTissueView(container) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 400 300");
    
    // 1. Draw Tissue Cells (Left side)
    const cellsGroup = document.createElementNS(ns, "g");
    for(let i=0; i<3; i++) {
        for(let j=0; j<4; j++) {
            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("x", 10 + i*60);
            rect.setAttribute("y", 10 + j*70);
            rect.setAttribute("width", 50);
            rect.setAttribute("height", 60);
            rect.setAttribute("rx", 10);
            rect.setAttribute("class", "tissue-cell");
            cellsGroup.appendChild(rect);

            // Nucleus
            const nucleus = document.createElementNS(ns, "circle");
            nucleus.setAttribute("cx", 10 + i*60 + 25);
            nucleus.setAttribute("cy", 10 + j*70 + 30);
            nucleus.setAttribute("r", 10);
            nucleus.setAttribute("class", "cell-nucleus");
            cellsGroup.appendChild(nucleus);
        }
    }
    svg.appendChild(cellsGroup);

    // 2. Draw Capillary (Right side, vertical flow for simplicity or curving)
    // Let's make it flow top to bottom on the right
    const capillaryPath = document.createElementNS(ns, "path");
    // Path: enters top right, curves near cells, exits bottom right
    const pathData = "M 250 0 Q 220 150 250 300"; 
    capillaryPath.setAttribute("d", pathData);
    capillaryPath.setAttribute("class", "vessel-wall");
    // Draw double line for vessel
    const vesselGroup = document.createElementNS(ns, "g");
    const path1 = capillaryPath.cloneNode();
    path1.setAttribute("transform", "translate(-15,0)");
    const path2 = capillaryPath.cloneNode();
    path2.setAttribute("transform", "translate(15,0)");
    vesselGroup.appendChild(path1);
    vesselGroup.appendChild(path2);
    svg.appendChild(vesselGroup);

    // Center path for RBCs
    const rbcPath = document.createElementNS(ns, "path");
    rbcPath.setAttribute("d", pathData);
    rbcPath.setAttribute("fill", "none");
    rbcPath.setAttribute("stroke", "none"); // Invisible path for RBCs to follow
    svg.appendChild(rbcPath);

    container.appendChild(svg);

    // Init RBCs
    const rbcs = [];
    for(let i=0; i<5; i++) {
        const rbc = new RBC(rbcPath, i/5, 'tissue');
        svg.appendChild(rbc.element);
        rbcs.push(rbc);
    }

    return { svg, rbcs, particles: [] };
}

function initLungView(container) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 400 300");

    // 1. Draw Alveolus (Sac with Trachea)
    // Center approx x=180. Right edge x=280.
    const alveolus = document.createElementNS(ns, "path");
    const alveolusPath = `
        M 160 0 
        L 160 60 
        Q 80 60 80 160 
        Q 80 260 180 260 
        Q 280 260 280 160 
        Q 280 60 200 60 
        L 200 0 
        Z`;
    alveolus.setAttribute("d", alveolusPath);
    alveolus.setAttribute("class", "alveolus");
    svg.appendChild(alveolus);

    // 2. Draw Capillary (Wrapping around alveolus)
    // Hugs the right side. Alveolus edge is x=280.
    // Capillary should curve RIGHT to cup it.
    // Starts x=300, Curves to x=320, Ends x=300.
    const pathData = "M 300 0 L 300 50 Q 340 160 300 270 L 300 300";
    const capillaryPath = document.createElementNS(ns, "path");
    capillaryPath.setAttribute("d", pathData);
    capillaryPath.setAttribute("class", "vessel-wall");
    
    const vesselGroup = document.createElementNS(ns, "g");
    const path1 = capillaryPath.cloneNode();
    path1.setAttribute("transform", "translate(-15,0)");
    const path2 = capillaryPath.cloneNode();
    path2.setAttribute("transform", "translate(15,0)");
    vesselGroup.appendChild(path1);
    vesselGroup.appendChild(path2);
    svg.appendChild(vesselGroup);

    // Center path for RBCs
    const rbcPath = document.createElementNS(ns, "path");
    rbcPath.setAttribute("d", pathData);
    rbcPath.setAttribute("fill", "none");
    rbcPath.setAttribute("stroke", "none");
    svg.appendChild(rbcPath);

    container.appendChild(svg);

    // Init RBCs
    const rbcs = [];
    for(let i=0; i<5; i++) {
        const rbc = new RBC(rbcPath, i/5, 'lung');
        svg.appendChild(rbc.element);
        rbcs.push(rbc);
    }

    return { svg, rbcs, particles: [] };
}

function animate(timestamp, sim) {
    if (!sim.paused) {
        const dt = timestamp - sim.lastTime;
        sim.lastTime = timestamp;

        // Update Tissue View
        sim.tissue.rbcs.forEach(rbc => rbc.update(dt, sim.speed));
        updateParticles(sim.tissue, dt, 'tissue', sim);
        
        // Update Lung View
        sim.lung.rbcs.forEach(rbc => rbc.update(dt, sim.speed));
        updateParticles(sim.lung, dt, 'lung', sim);

        // Spawning Logic
        sim.spawnTimer += dt * sim.speed;
        if (sim.spawnTimer > 500) { // Spawn every 500ms (scaled by speed)
            spawnParticles(sim);
            sim.spawnTimer = 0;
        }
    }
    requestAnimationFrame((t) => animate(t, sim));
}

function spawnParticles(sim) {
    if (!sim.showGases) return; 
    
    // Lung View: Spawn O2 in Alveolus
    const lungO2 = new Particle(150 + (Math.random()-0.5)*50, 150 + (Math.random()-0.5)*50, 'o2', sim.lung.svg);
    lungO2.vx = (Math.random() - 0.5) * 0.2 + 0.5; // Drift towards capillary (right)
    lungO2.vy = (Math.random() - 0.5) * 0.2;
    if (!sim.showGases) lungO2.element.style.display = 'none';
    if (!sim.showGases) lungO2.element.style.display = 'none';
    if (sim.showLabels) lungO2.labelElement.style.display = 'block';
    else lungO2.labelElement.style.display = 'none';
    sim.lung.particles.push(lungO2);

    // Lung View: Spawn CO2 in Plasma (Capillary Inlet)
    // Start at top right (vessel entrance), flow down and diffuse left
    // Vessel center at top is 300. Width ~30. So 285-315.
    // Reduce quantity by half
    if (Math.random() < 0.5) {
        const lungCO2 = new Particle(300 + (Math.random()-0.5)*20, 0, 'co2', sim.lung.svg);
        lungCO2.vx = 0; // Start with no horizontal velocity, just flow down
        lungCO2.vy = 0.18;  // Flow down with blood (matched to RBC speed)
        
        // Assign random target in alveolus (Center 180, 160, Radius ~80)
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 60; // Keep it slightly inner
        lungCO2.targetX = 180 + r * Math.cos(angle);
        lungCO2.targetY = 160 + r * Math.sin(angle);

        if (!sim.showGases) lungCO2.element.style.display = 'none';
        if (sim.showLabels) lungCO2.labelElement.style.display = 'block';
        else lungCO2.labelElement.style.display = 'none';
        sim.lung.particles.push(lungCO2);
    }

    // Tissue View: Spawn CO2 in Cells
    // Pick a random cell (3 cols x 4 rows)
    const col = Math.floor(Math.random() * 3);
    const row = Math.floor(Math.random() * 4);
    // Cell center: x = 10 + i*60 + 25, y = 10 + j*70 + 30
    const cellX = 10 + col * 60 + 25;
    const cellY = 10 + row * 70 + 30;
    
    const tissueCO2 = new Particle(cellX, cellY, 'co2', sim.tissue.svg);
    tissueCO2.vx = 0.5; // Drift towards capillary (right)
    tissueCO2.vy = (Math.random() - 0.5) * 0.2;
    if (!sim.showGases) tissueCO2.element.style.display = 'none';
    if (!sim.showGases) tissueCO2.element.style.display = 'none';
    if (sim.showLabels) tissueCO2.labelElement.style.display = 'block';
    else tissueCO2.labelElement.style.display = 'none';
    sim.tissue.particles.push(tissueCO2);
}

function updateParticles(system, dt, type, sim) {
    for (let i = system.particles.length - 1; i >= 0; i--) {
        const p = system.particles[i];
        p.update(dt, sim.speed);

        // --- LUNG VIEW LOGIC ---
        if (type === 'lung') {
            // O2 Logic: Alveolus -> RBC
            if (p.type === 'o2' && p.state === 'free') {
                // Constrain to Alveolus/Capillary area
                // Vessel path: M 300 0 ... Q 340 160 300 270 ...
                // Center X approx: 300 + 20 * sin(ny * PI)
                // Outer wall (Right side) approx: CenterX + 15
                
                let maxX = 315; // Base outer wall at top/bottom (300 + 15)
                if (p.y > 50 && p.y < 270) {
                    // Normalized Y in curve section
                    const ny = (p.y - 50) / 220; 
                    // Bulge OUTWARD (Right)
                    const bulge = Math.sin(ny * Math.PI) * 20; 
                    maxX = 315 + bulge;
                }
                
                if (p.x > maxX || p.y < 0 || p.y > 300) {
                     // Fade out
                     p.element.style.opacity = (parseFloat(p.element.style.opacity || 1) - 0.1);
                     p.labelElement.style.opacity = p.element.style.opacity;
                     if (p.element.style.opacity <= 0) {
                        p.element.remove();
                        p.labelElement.remove();
                        system.particles.splice(i, 1);
                     }
                     continue;
                }

                // Check distance to RBCs
                for (let rbc of system.rbcs) {
                    // Allow binding if not full (max 4), regardless of current oxygenation state
                    // This ensures they pick up particles and turn red
                    if (rbc.o2Particles.length < 4) { 
                        const dx = p.x - parseFloat(rbc.element.getAttribute("cx"));
                        const dy = p.y - parseFloat(rbc.element.getAttribute("cy"));
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        // Increased binding distance to make it easier to catch O2
                        if (dist < 30) {
                            // Bind
                            p.state = 'bound';
                            rbc.o2Particles.push(p);
                            system.particles.splice(i, 1); // Remove from free particles list
                            break; 
                        }
                    }
                }
            }

            // CO2 Logic: Capillary -> Alveolus (Exhaled)
            // CO2 Logic: Capillary -> Alveolus (Exhaled)
            if (p.type === 'co2' && p.state === 'free') {
                // Move towards assigned target (or default 180,160 if missing)
                const tx = p.targetX || 180;
                const ty = p.targetY || 160;
                const dx = tx - p.x;
                const dy = ty - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // If still in vessel (x > 260), flow down more
                if (p.x > 260) {
                    // Only start diffusing left if we are in the middle section (y > 100)
                    if (p.y > 100) {
                        p.vx = -0.3; // Diffuse left
                        p.vy = 0.18;  // Flow down
                    } else {
                        p.vx = (Math.random() - 0.5) * 0.1; // Just flow down with slight wobble
                        p.vy = 0.18;
                    }
                } else {
                    // Diffuse into alveolus
                    p.vx = (dx / dist) * 0.5;
                    p.vy = (dy / dist) * 0.5;
                }

                // If inside alveolus, maybe fade out or just stay there
                if (dist < 50) {
                    // Exhaled
                    p.element.style.opacity = (parseFloat(p.element.style.opacity || 1) - 0.01);
                    p.labelElement.style.opacity = p.element.style.opacity;
                    if (p.element.style.opacity <= 0) {
                        p.element.remove();
                        p.labelElement.remove();
                        system.particles.splice(i, 1);
                    }
                }
            }
        }

        // --- TISSUE VIEW LOGIC ---
        if (type === 'tissue') {
            // CO2 Logic: Cell -> Capillary
            if (p.type === 'co2' && p.state === 'free') {
                 // Calculate vessel center at this Y
                 // Bezier: P0=250, P1=220, P2=250
                 const t = p.y / 300;
                 const centerX = 250 * (1-t)**2 + 2 * 220 * (1-t) * t + 250 * t**2;
                 
                 // If entered vessel (crossed left boundary approx centerX - 15)
                 if (p.x > centerX - 10) {
                     // Follow the flow!
                     // Calculate slope of the Bezier curve at this t
                     // x(t) = 60t^2 - 60t + 250
                     // dx/dt = 120t - 60
                     // dy/dt = 300
                     // dx/dy = (120t - 60) / 300
                     const slope = (120 * t - 60) / 300;
                     
                     p.vy = 0.18; // Move down with blood flow
                     p.vx = p.vy * slope * 10; // Scale up slightly to match coordinate space/dt quirks if needed, but theoretically 1:1
                     // Actually, p.update uses vx directly. 
                     // Let's just use the slope. 
                     // If vy is 0.18, vx should be 0.18 * slope.
                     // But wait, the update function multiplies by 0.1.
                     // So ratio is preserved.
                     p.vx = p.vy * slope * 10; // *10 because slope is small? 
                     // Let's re-evaluate. 
                     // dx = vx * dt. dy = vy * dt.
                     // dx/dy = vx/vy.
                     // vx = vy * (dx/dy).
                     // dx/dy is roughly -0.2 to 0.2.
                     // So vx should be ~ 0.036.
                     // If I multiply by 10, it becomes 0.36. That's too fast?
                     // Let's try without *10 first, or maybe *5 if it lags.
                     // Actually, let's just use a simple proportional correction to center
                     // combined with the slope.
                     
                     p.vx = p.vy * slope * 10; // The derivative logic seems sound but let's add a centering force too
                     
                     // Centering force: push towards centerX
                     const distToCenter = centerX - p.x;
                     p.vx += distToCenter * 0.05; 
                 }
                 if (p.y > 350) {
                     p.element.remove();
                     p.labelElement.remove();
                     system.particles.splice(i, 1);
                 }
            }
            
            // O2 Logic: RBC -> Cell
            if (p.type === 'o2' && p.state === 'free') {
                // Check if it reached a cell (simple check: x < 200)
                // Or check if it hit the target cell? 
                // Since we target random cells, let's just say if it's "deep" enough in tissue
                if (p.x < 190) {
                    // Fade out / Absorb
                    p.element.style.opacity = (parseFloat(p.element.style.opacity || 1) - 0.05);
                    p.labelElement.style.opacity = p.element.style.opacity;
                    if (p.element.style.opacity <= 0) {
                        p.element.remove();
                        p.labelElement.remove();
                        system.particles.splice(i, 1);
                    }
                }
            }
        }
    }

    // Logic for RBCs releasing/binding
    system.rbcs.forEach(rbc => {
        // Lung: RBCs become oxygenated, Release CO2
        if (type === 'lung') {
            if (rbc.o2Particles.length > 0) {
                rbc.oxygenated = true;
            }
            
            
            // Randomly release CO2 from plasma (simulated by spawning near RBC)
            // REMOVED: CO2 now spawns from plasma inlet in spawnParticles

        }

        // Tissue: RBCs release O2
        if (type === 'tissue') {
             // Only release if oxygenated AND in the middle section (offset > 0.35)
             if (rbc.oxygenated && rbc.offset > 0.35 && Math.random() < 0.05) { 
                 if (rbc.o2Particles.length > 0) {
                     // In a real sim, we'd pop a particle from RBC. 
                     // Here we just spawn a new one and pretend.
                 }
                 rbc.oxygenated = false; 
                 
                 const cx = parseFloat(rbc.element.getAttribute("cx"));
                 const cy = parseFloat(rbc.element.getAttribute("cy"));
                 const p = new Particle(cx, cy, 'o2', system.svg);
                 
                 // Target a random cell
                 const col = Math.floor(Math.random() * 3);
                 const row = Math.floor(Math.random() * 4);
                 const targetX = 10 + col * 60 + 25;
                 const targetY = 10 + row * 70 + 30;
                 
                 const dx = targetX - cx;
                 const dy = targetY - cy;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 p.vx = (dx / dist) * 0.5; 
                 p.vy = (dy / dist) * 0.5;
                 
                 if (!sim.showGases) p.element.style.display = 'none';
                 if (!sim.showGases) p.element.style.display = 'none';
                 if (sim.showLabels) p.labelElement.style.display = 'block';
                 else p.labelElement.style.display = 'none';
                 system.particles.push(p);
             }
        }
        
        // Update attached particles positions (and labels)
        rbc.o2Particles.forEach((p, i) => {
            const cx = parseFloat(rbc.element.getAttribute("cx"));
            const cy = parseFloat(rbc.element.getAttribute("cy"));
            const px = cx + (i%2===0?3:-3);
            const py = cy + (i<2?3:-3);
            p.element.setAttribute("cx", px);
            p.element.setAttribute("cy", py);
            p.labelElement.setAttribute("x", px);
            p.labelElement.setAttribute("y", py - 5);
            
            // Ensure visibility matches parent RBC logic (or global setting)
            // If we hid them when binding, we need to handle that. 
            // Current logic: they are removed from system.particles, so updateParticles doesn't touch them.
            // But we need to update their label visibility if toggled.
            if (!sim.showGases) {
                 p.element.style.display = 'none';
                 p.labelElement.style.display = 'none';
            } else {
                 p.element.style.display = 'block';
                 if (sim.showLabels) p.labelElement.style.display = 'block';
                 else p.labelElement.style.display = 'none';
            }
        });
    });
}

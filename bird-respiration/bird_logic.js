const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const toggleBtn = document.getElementById('toggleBtn');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');

// Step Cards Mapping
const cardMap = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-3'), 
    3: document.getElementById('step-2'), 
    4: document.getElementById('step-4')
};

// Configuration
canvas.width = 800; 
canvas.height = 500;

const CONFIG = {
    breathDuration: 3000,
    speed: 1,
    particleCount: 80,
    colors: {
        bodyFill: '#e67e22',   // Orange Body
        bodyOutline: '#000000', // Black Outline
        organFill: '#ffffff',   // White
        organOutline: '#34495e',
        fresh: '#2980b9',       // Blue
        used: '#8e44ad'         // Purple
    }
};

// Simulation State
let state = {
    phase: 'INHALE', 
    elapsed: 0,
    isPlaying: true
};

// Anatomy Coordinates (Updated to match new Detailed Bird Draw)
const ANATOMY = {
    tracheaStart: { x: 780, y: 130 }, // Beak tip
    tracheaSplit: { x: 500, y: 240 },
    posteriorSac: { x: 300, y: 360, r: 45 }, 
    anteriorSac: { x: 570, y: 300, r: 35 },  
    lung: { x: 400, y: 320, w: 100, h: 80 }
};

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.stage = 0; 
        this.progress = 0;
        this.color = CONFIG.colors.fresh;
        // Random vertical offset for lung travel (0.1 to 0.9 of lung height)
        this.laneOffset = 0.1 + Math.random() * 0.8; 
    }
}

let particles = [];
for(let i=0; i<CONFIG.particleCount; i++) particles.push(new Particle());

// Path Logic
function getTargetPosition(stage, t, laneOffset = 0.5) {
    // Stage 0: Beak -> Split -> Posterior
    if (stage === 0) {
        if (t < 0.5) {
            // Segment 1: Throat -> Split (0 to 0.5 maps to 0 to 1)
            let localT = t * 2;
            let p0 = ANATOMY.tracheaStart;
            let p1 = {x: 650, y: 180}; // Throat Control
            let p2 = ANATOMY.tracheaSplit;
            return quadraticBezier(p0, p1, p2, localT);
        } else {
            // Segment 2: Split -> Post (0.5 to 1.0 maps to 0 to 1)
            let localT = (t - 0.5) * 2;
            let p0 = ANATOMY.tracheaSplit;
            let p1 = {x: 350, y: 300}; // Control curve down/back
            let p2 = ANATOMY.posteriorSac;
            return quadraticBezier(p0, p1, p2, localT);
        }
    }
    // Stage 0.5: Inside Posterior Sac (Brownian Motion)
    else if (stage === 0.5) {
        // Return center of sac + random noise handled in update loop?
        // Or specific target? 
        // Let's just return center, and add jitter in drawing or update.
        // Actually, let's return a random point within radius based on t (time as seed?)
        // Better: Keep static center here, add jitter in particle update.
        return ANATOMY.posteriorSac; 
    }
    // Stage 1: Posterior -> Lung Entry (Linear)
    else if (stage === 1) {
        let p0 = ANATOMY.posteriorSac;
        // Enter at particle's specific lane height
        let laneY = ANATOMY.lung.y + (ANATOMY.lung.h * laneOffset);
        let p1 = {x: ANATOMY.lung.x + 10, y: laneY}; 
        
        return {
            x: p0.x + (p1.x - p0.x) * t,
            y: p0.y + (p1.y - p0.y) * t
        };
    }
    // Stage 2: Through Lung (Horizontal) -> Exit
    else if (stage === 2) {
        // Move horizontally across lung width at lane height
        let startX = ANATOMY.lung.x + 10;
        let endX = ANATOMY.lung.x + ANATOMY.lung.w - 10;
        let laneY = ANATOMY.lung.y + (ANATOMY.lung.h * laneOffset);

        // If t < 0.8, move across. 
        if (t < 0.8) {
            let localT = t / 0.8;
            return {
                x: startX + (endX - startX) * localT,
                y: laneY
            };
        } else {
            // Short segment from Lung Right -> Anterior Sac
            let localT = (t - 0.8) / 0.2;
            let p0 = {x: endX, y: laneY}; 
            let p1 = ANATOMY.anteriorSac;
            return {
                x: p0.x + (p1.x - p0.x) * localT,
                y: p0.y + (p1.y - p0.y) * localT
            };
        }
    }
    // Stage 2.5: Inside Anterior Sac (Brownian Motion)
    else if (stage === 2.5) {
         return ANATOMY.anteriorSac;
    }
    // Stage 3: Anterior -> Split -> Out
    else if (stage === 3) {
        if (t < 0.5) {
            // Ant -> Split
            let localT = t * 2;
            let p0 = ANATOMY.anteriorSac;
            // Smoother arc upwards to the split
            let p1 = {x: 550, y: 260}; 
            let p2 = ANATOMY.tracheaSplit;
            return quadraticBezier(p0, p1, p2, localT);
        } else {
             // Split -> Throat -> Beak
            let localT = (t - 0.5) * 2;
            let p0 = ANATOMY.tracheaSplit;
            let p1 = {x: 650, y: 180}; // Reuse control
            let p2 = ANATOMY.tracheaStart;
            return quadraticBezier(p0, p1, p2, localT);
        }
    }
    return {x:0, y:0};
}

function quadraticBezier(p0, p1, p2, t) {
    let u = 1 - t;
    return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
}

// ... (Anatomy constants remain same)

let lastTimestamp = 0;

function update(timestamp) {
    if (!state.isPlaying) {
        lastTimestamp = timestamp;
        requestAnimationFrame(update);
        return;
    }

    const dt = (timestamp - lastTimestamp) * CONFIG.speed;
    lastTimestamp = timestamp;

    state.elapsed += dt;
    
    // Cycle Logic
    let cycleTime = state.elapsed % (CONFIG.breathDuration * 2);
    let newPhase = cycleTime < CONFIG.breathDuration ? 'INHALE' : 'EXHALE';
    
    if (newPhase !== state.phase) {
        state.phase = newPhase;
        updateUI();
    }
    
    let phaseProgress = (state.elapsed % CONFIG.breathDuration) / CONFIG.breathDuration;

    // Spawning Strategy: Continuous Flow
    let spawnChance = 0.4 * CONFIG.speed;
    
    if (phaseProgress < 0.6 && Math.random() < spawnChance) {
        if (state.phase === 'INHALE') {
            let p1 = particles.find(p => !p.active);
            if(p1) {
                p1.reset(); // Assigns random lane
                p1.active = true;
                p1.stage = 0;
            }
            let p2 = particles.find(p => !p.active && p !== p1);
            if(p2) {
                p2.reset();
                p2.active = true;
                p2.stage = 2;
                p2.color = CONFIG.colors.fresh;
            }
        } 
        else if (state.phase === 'EXHALE') {
            let p3 = particles.find(p => !p.active);
            if(p3) {
                p3.reset();
                p3.active = true;
                p3.stage = 1;
                p3.color = CONFIG.colors.fresh; 
            }
            let p4 = particles.find(p => !p.active && p !== p3);
            if(p4) {
                p4.reset();
                p4.active = true;
                p4.stage = 3;
                p4.color = CONFIG.colors.used;
            }
        }
    }

    // Update Particles
    for (let p of particles) {
        if (!p.active) continue;

        let shouldMove = false;
        // INHALE: Stage 0 (Into Post), Stage 2 (Into Ant)
        if (state.phase === 'INHALE' && (p.stage === 0 || p.stage === 2)) shouldMove = true;
        // EXHALE: Stage 1 (Post->Lung), Stage 3 (Ant->Out)
        if (state.phase === 'EXHALE' && (p.stage === 1 || p.stage === 3)) shouldMove = true;
        
        // Brownian Motion Stages: Always active if in that stage
        if (p.stage === 0.5 || p.stage === 2.5) shouldMove = true;

        if (shouldMove) {
            // Normal Travel
            if (Number.isInteger(p.stage)) {
                p.progress += (dt / (CONFIG.breathDuration * 0.4));
                
                // Color Change Middle Lung
                if (p.stage === 2) {
                     p.color = p.progress > 0.3 ? CONFIG.colors.used : CONFIG.colors.fresh;
                }

                if (p.progress >= 1) {
                    p.progress = 0;
                    // Transition Logic
                    if (p.stage === 0) {
                        p.stage = 0.5; // Enter Posterior Sac -> Wait
                    } else if (p.stage === 2) {
                        p.stage = 2.5; // Enter Anterior Sac -> Wait
                    } else {
                        p.active = false; // End of line (1->End or 3->End)
                    }
                }
            } 
            // Brownian Motion Logic
            else {
                // Check if phase changed to release them
                // Post Sac (0.5) -> Release on EXHALE
                if (p.stage === 0.5 && state.phase === 'EXHALE') {
                    p.stage = 1; // Go to lung
                    p.progress = 0;
                }
                // Ant Sac (2.5) -> Release on EXHALE
                else if (p.stage === 2.5 && state.phase === 'EXHALE') {
                    p.stage = 3; // Go out
                    p.progress = 0;
                }
                else {
                    // Just stay alive and jitter in draw()
                    // Or update x/y here with jitter
                    let center = p.stage === 0.5 ? ANATOMY.posteriorSac : ANATOMY.anteriorSac;
                    let r = (p.stage === 0.5 ? ANATOMY.posteriorSac.r : ANATOMY.anteriorSac.r) * 0.7;
                    // Simple random walk or random position?
                    // Let's do random position each frame for high energy gas
                    let angle = Math.random() * Math.PI * 2;
                    let dist = Math.random() * r;
                    p.x = center.x + Math.cos(angle) * dist;
                    p.y = center.y + Math.sin(angle) * dist;
                    
                    // Don't call getTargetPosition for these stages
                    continue; 
                }
            }
        }
        
        if (p.active) {
            let pos = getTargetPosition(p.stage, p.progress, p.laneOffset);
            p.x = pos.x;
            p.y = pos.y;
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Orange Bird Body
    ctx.lineWidth = 4;
    ctx.strokeStyle = CONFIG.colors.bodyOutline;
    ctx.fillStyle = CONFIG.colors.bodyFill;
    
    ctx.beginPath();
    // Beak Tip
    ctx.moveTo(780, 130); 
    
    // Upper Beak / Forehead / Head Top
    ctx.lineTo(720, 120);
    ctx.quadraticCurveTo(680, 50, 600, 50); 
    
    // Back of Head / Neck Dip
    ctx.quadraticCurveTo(550, 60, 520, 120); 

    // Back
    ctx.quadraticCurveTo(400, 200, 100, 350); 
    
    // Tail
    ctx.lineTo(50, 400); 
    ctx.lineTo(150, 450); 
    
    // Belly
    ctx.quadraticCurveTo(350, 500, 500, 420); 
    
    // Breast / Throat / Lower Beak
    ctx.quadraticCurveTo(650, 300, 720, 150); 
    ctx.lineTo(780, 130);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. White Trachea & Bronchi Visuals matching Particle Paths
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    
    // Path 1: Trachea Main (Beak -> Split)
    // Matches Stage 0 part 1 and Stage 3 part 2
    ctx.beginPath();
    ctx.moveTo(700, 150); // Throat
    ctx.quadraticCurveTo(620, 200, 500, 250); // Split point
    ctx.stroke();

    // Path 2: Bronchus to Posterior (Split -> Post)
    // Matches Stage 0 part 2
    ctx.beginPath();
    ctx.moveTo(500, 250);
    ctx.quadraticCurveTo(400, 320, ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y);
    ctx.stroke();

    // Path 3: Bronchus to Anterior (Split -> Ant) 
    // Matches Stage 3 part 1 (Reverse)
    ctx.beginPath();
    ctx.moveTo(500, 250);
    // Use the same control point as particle logic (550, 260)
    ctx.quadraticCurveTo(550, 260, ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y);
    ctx.stroke();
    
    // Path 4: Mesobronchus (Posterior -> Lung)
    // Matches Stage 1
    ctx.beginPath();
    ctx.moveTo(ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y);
    // Connect to Lung Left-Middle
    ctx.lineTo(ANATOMY.lung.x + 10, ANATOMY.lung.y + 40); 
    ctx.stroke();

    // Path 5: Connection Lung -> Anterior
    // Matches Stage 2 Exit
    ctx.beginPath();
    // Connect from Lung Right-Middle
    ctx.moveTo(ANATOMY.lung.x + ANATOMY.lung.w - 10, ANATOMY.lung.y + 40); 
    ctx.lineTo(ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y);
    ctx.stroke();

    // Expansion
    let expansion = state.phase === 'INHALE' ? 
        Math.sin((state.elapsed % CONFIG.breathDuration)/CONFIG.breathDuration * Math.PI/2) : 
        Math.cos((state.elapsed % CONFIG.breathDuration)/CONFIG.breathDuration * Math.PI/2);
    
    // 3. White Air Sacs
    ctx.fillStyle = CONFIG.colors.organFill;
    
    // Posterior Sac
    let r1 = ANATOMY.posteriorSac.r * (0.8 + 0.3 * expansion);
    ctx.beginPath();
    ctx.arc(ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y, r1, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    
    // Anterior Sac
    let r2 = ANATOMY.anteriorSac.r * (0.8 + 0.3 * expansion);
    ctx.beginPath();
    ctx.arc(ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y, r2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // 4. White Lung (Ladder)
    ctx.fillStyle = CONFIG.colors.organFill;
    ctx.beginPath();
    ctx.roundRect(ANATOMY.lung.x, ANATOMY.lung.y, ANATOMY.lung.w, ANATOMY.lung.h, 15);
    ctx.fill();
    ctx.stroke(); // Outline

    // Ladder Rungs (Visualizing Parabronchi) - Horizontal
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    // Iterate over height instead of width
    for(let i=15; i<ANATOMY.lung.h-10; i+=15) {
        ctx.beginPath();
        ctx.moveTo(ANATOMY.lung.x + 10, ANATOMY.lung.y + i);
        ctx.lineTo(ANATOMY.lung.x + ANATOMY.lung.w - 10, ANATOMY.lung.y + i);
        ctx.stroke();
    }
    
    // Labels
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Noto Sans TC';
    ctx.textAlign = 'center';
    ctx.fillText('後氣囊', ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y + 5);
    ctx.fillText('前氣囊', ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y + 5);
    ctx.fillText('肺部', ANATOMY.lung.x + 50, ANATOMY.lung.y + 45);

    // 5. Particles
    for (let p of particles) {
         if (!p.active) continue;
         ctx.beginPath();
         // Check if particle is roughly on path to decide color or size?
         // No, just draw
         ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); 
         ctx.fillStyle = p.color;
         ctx.fill();
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 1;
         ctx.stroke();
    }
}

function updateUI() {
    Object.values(cardMap).forEach(c => c.classList.remove('active'));
    if (state.phase === 'INHALE') {
        cardMap[1].classList.add('active'); 
        cardMap[3].classList.add('active'); 
    } else {
        cardMap[2].classList.add('active'); 
        cardMap[4].classList.add('active'); 
    }
}

toggleBtn.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    toggleBtn.innerText = state.isPlaying ? '暫停演示' : '繼續演示';
    if(state.isPlaying) {
        lastTimestamp = Date.now();
        update(lastTimestamp);
    }
});

speedRange.addEventListener('input', (e) => {
    CONFIG.speed = parseFloat(e.target.value);
    speedValue.innerText = `${CONFIG.speed}x`;
});

// Start
update(Date.now());

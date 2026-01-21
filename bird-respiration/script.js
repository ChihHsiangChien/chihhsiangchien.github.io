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
    anteriorSac: { x: 530, y: 220, r: 35 },  
    lung: { x: 420, y: 280, w: 100, h: 80 }
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
    }
}

let particles = [];
for(let i=0; i<CONFIG.particleCount; i++) particles.push(new Particle());

// Path Logic
function getTargetPosition(stage, t) {
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
    // Stage 1: Posterior -> Lung Entry (Linear)
    else if (stage === 1) {
        let p0 = ANATOMY.posteriorSac;
        let p1 = {x: ANATOMY.lung.x + 20, y: ANATOMY.lung.y + 70}; // Lung Back-Bottom
        return {
            x: p0.x + (p1.x - p0.x) * t,
            y: p0.y + (p1.y - p0.y) * t
        };
    }
    // Stage 2: Through Lung -> Exit -> Anterior
    else if (stage === 2) {
        if (t < 0.6) {
            // Inside Lung (Ladder climb/cross)
            let localT = t / 0.6;
            let p0 = {x: ANATOMY.lung.x + 20, y: ANATOMY.lung.y + 70};
            let p1 = {x: ANATOMY.lung.x + 50, y: ANATOMY.lung.y + 40}; // Mid Lung
            let p2 = {x: ANATOMY.lung.x + 80, y: ANATOMY.lung.y + 10}; // Exit Top
            return quadraticBezier(p0, p1, p2, localT);
        } else {
            // Lung Exit -> Anterior
            let localT = (t - 0.6) / 0.4;
            let p0 = {x: ANATOMY.lung.x + 80, y: ANATOMY.lung.y + 10};
            let p1 = ANATOMY.anteriorSac;
             return {
                x: p0.x + (p1.x - p0.x) * localT,
                y: p0.y + (p1.y - p0.y) * localT
            };
        }
    }
    // Stage 3: Anterior -> Split -> Out
    else if (stage === 3) {
        if (t < 0.5) {
            // Ant -> Split
            let localT = t * 2;
            let p0 = ANATOMY.anteriorSac;
            let p1 = {x: 520, y: 220};
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

    // Spawning
    if (state.phase === 'INHALE' && Math.random() < 0.1 * CONFIG.speed) {
        let p = particles.find(p => !p.active);
        if(!p) { p = new Particle(); particles.push(p); }
        p.active = true;
        p.stage = 0;
        p.progress = 0;
        p.color = CONFIG.colors.fresh;
    }

    // Update Particles
    for (let p of particles) {
        if (!p.active) continue;

        let shouldMove = false;
        if (state.phase === 'INHALE' && (p.stage === 0 || p.stage === 2)) shouldMove = true;
        if (state.phase === 'EXHALE' && (p.stage === 1 || p.stage === 3)) shouldMove = true;

        if (shouldMove) {
            p.progress += (dt / CONFIG.breathDuration);
            if (p.progress >= 1) {
                p.progress = 0;
                p.stage++;
                if (p.stage === 2) p.color = '#5dade2'; 
                if (p.stage === 3) p.color = CONFIG.colors.used; 
                if (p.stage > 3) p.active = false;
            }
        }
        
        if (p.active) {
            let pos = getTargetPosition(p.stage, p.progress);
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
    // Start at Beak Tip
    ctx.moveTo(750, 120); 
    // Top Head
    ctx.quadraticCurveTo(650, 50, 550, 50); 
    // Back
    ctx.quadraticCurveTo(200, 100, 100, 350); 
    // Tail
    ctx.lineTo(50, 450); 
    ctx.lineTo(150, 450); 
    // Belly
    ctx.quadraticCurveTo(350, 480, 550, 400); 
    // Chest to Neck to Beak Bottom
    ctx.quadraticCurveTo(650, 350, 680, 200); 
    ctx.lineTo(750, 120);
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
    // Matches Stage 3 part 1
    ctx.beginPath();
    ctx.moveTo(500, 250);
    ctx.quadraticCurveTo(520, 220, ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y);
    ctx.stroke();
    
    // Path 4: Mesobronchus (Posterior -> Lung)
    // Matches Stage 1
    ctx.beginPath();
    ctx.moveTo(ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y);
    ctx.lineTo(ANATOMY.lung.x + 20, ANATOMY.lung.y + 70); // Enter lung back-bottom
    ctx.stroke();

    // Path 5: Connection Lung -> Anterior
    // Matches Stage 2
    ctx.beginPath();
    ctx.moveTo(ANATOMY.lung.x + 80, ANATOMY.lung.y + 10); // Exit lung front-top
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

    // Ladder Rungs (Visualizing Parabronchi)
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    for(let i=15; i<ANATOMY.lung.w-10; i+=15) {
        ctx.beginPath();
        ctx.moveTo(ANATOMY.lung.x + i, ANATOMY.lung.y + 10);
        ctx.lineTo(ANATOMY.lung.x + i, ANATOMY.lung.y + ANATOMY.lung.h - 10);
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

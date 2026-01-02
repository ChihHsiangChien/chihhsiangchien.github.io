const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const toggleBtn = document.getElementById('toggleBtn');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const stepCards = [
    document.getElementById('step-1'),
    document.getElementById('step-3'), // HTML order was 1, 3, 2, 4 visually for grid? Let's fix mapping
    document.getElementById('step-2'),
    document.getElementById('step-4')
];
// Mapping IDs to Logical Steps
// Step 1: Inhale (Trachea -> Posterior)
// Step 2: Exhale (Posterior -> Lung)
// Step 3: Inhale (Lung -> Anterior)
// Step 4: Exhale (Anterior -> Out)

const cardMap = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-3'), // Exhale 1 is Step 2 logics
    3: document.getElementById('step-2'), // Inhale 2 is Step 3 logics
    4: document.getElementById('step-4')
};


// Configuration
canvas.width = 800; // Wider for silhouette
canvas.height = 500;

const CONFIG = {
    breathDuration: 3000,
    speed: 1,
    particleCount: 80,
    colors: {
        lung: '#0077b6',     // Deep Blue
        sac: '#90e0ef',      // Light Blue
        fresh: '#48cae4',    // Cyan
        used: '#03045e',     // Dark Blue
        silhouette: '#e2e8f0',
        outline: '#94a3b8'
    }
};

// Simulation State
let state = {
    phase: 'INHALE', // 'INHALE' or 'EXHALE'
    elapsed: 0,
    isPlaying: true
};

// Anatomy Coordinates (Scaled and Positioned for Profile)
const OFFSET = { x: 50, y: 50 };
const ANATOMY = {
    tracheaStart: { x: 650, y: 120 }, // Beak area
    tracheaSplit: { x: 500, y: 250 },
    posteriorSac: { x: 250, y: 350, r: 50 }, // Tail side
    anteriorSac: { x: 450, y: 200, r: 40 },  // Chest side
    lung: { x: 350, y: 250, w: 140, h: 80 }
};

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.stage = 0; // 0: Start->Post, 1: Post->Lung, 2: Lung->Ant, 3: Ant->Out
        this.progress = 0;
        this.color = CONFIG.colors.fresh;
    }
}

let particles = [];
for(let i=0; i<CONFIG.particleCount; i++) particles.push(new Particle());

// Path Logic (Cubic Bezier for smoothness)
// We need control points for organic flow
function getTargetPosition(stage, t) {
    // t is 0 to 1
    
    // Stage 0: Trachea (650,120) -> Posterior (250,350)
    // Deep curve down
    if (stage === 0) {
        let p0 = ANATOMY.tracheaStart;
        let p1 = {x: 550, y: 350}; // Control 1
        let p2 = {x: 400, y: 380}; // Control 2
        let p3 = ANATOMY.posteriorSac;
        return cubicBezier(p0, p1, p2, p3, t);
    }
    // Stage 1: Posterior (250,350) -> Lung Back (350, 290)
    else if (stage === 1) {
        let p0 = ANATOMY.posteriorSac;
        let p1 = {x: 280, y: 250};
        let p2 = {x: 300, y: 280};
        let p3 = {x: ANATOMY.lung.x + 20, y: ANATOMY.lung.y + 60}; // Entry at back-bottom
        return cubicBezier(p0, p1, p2, p3, t);
    }
    // Stage 2: Lung (Back-Bottom) -> Lung (Front-Top) -> Anterior (450, 200)
    else if (stage === 2) {
        // Through Lung
        let p0 = {x: ANATOMY.lung.x + 20, y: ANATOMY.lung.y + 60};
        let p1 = {x: ANATOMY.lung.x + 80, y: ANATOMY.lung.y + 20};
        let p2 = {x: ANATOMY.lung.x + 120, y: ANATOMY.lung.y + 40};
        let p3 = ANATOMY.anteriorSac;
        return cubicBezier(p0, p1, p2, p3, t);
    }
    // Stage 3: Anterior (450, 200) -> Trachea Out (650, 120)
    else if (stage === 3) {
        let p0 = ANATOMY.anteriorSac;
        let p1 = {x: 500, y: 150};
        let p2 = {x: 550, y: 100};
        let p3 = ANATOMY.tracheaStart; // Exit same way
        return cubicBezier(p0, p1, p2, p3, t);
    }
    return {x:0, y:0};
}

function cubicBezier(p0, p1, p2, p3, t) {
    let u = 1 - t;
    let tt = t * t;
    let uu = u * u;
    let uuu = uu * u;
    let ttt = tt * t;

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
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
    
    // Cycle Management
    let cycleTime = state.elapsed % (CONFIG.breathDuration * 2);
    let newPhase = cycleTime < CONFIG.breathDuration ? 'INHALE' : 'EXHALE';
    
    if (newPhase !== state.phase) {
        state.phase = newPhase;
        updateUI();
    }
    
    // Phase Progress 0->1
    let phaseProgress = (state.elapsed % CONFIG.breathDuration) / CONFIG.breathDuration;

    // Spawning (Only Inhale)
    if (state.phase === 'INHALE' && Math.random() < 0.08 * CONFIG.speed) {
        // Find inactive particle
        let p = particles.find(p => !p.active);
        if(!p) {
             p = new Particle();
             particles.push(p);
        }
        p.active = true;
        p.stage = 0;
        p.progress = 0;
        p.color = CONFIG.colors.fresh;
    }

    // Update Particles
    for (let p of particles) {
        if (!p.active) continue;

        let shouldMove = false;
        // Stages 0 & 2 move during INHALE
        // Stages 1 & 3 move during EXHALE
        if (state.phase === 'INHALE' && (p.stage === 0 || p.stage === 2)) shouldMove = true;
        if (state.phase === 'EXHALE' && (p.stage === 1 || p.stage === 3)) shouldMove = true;

        if (shouldMove) {
            p.progress += (dt / CONFIG.breathDuration);
            // Slight jitter for realism
            p.progress += (Math.random() - 0.5) * 0.005;

            if (p.progress >= 1) {
                p.progress = 0;
                p.stage++;
                
                // Color Transition
                if (p.stage === 2) p.color = '#2563eb'; // Transitioning to used
                if (p.stage === 3) p.color = CONFIG.colors.used; // Fully used

                // Loop end
                if (p.stage > 3) {
                    p.active = false;
                }
            }
        }
        
        // Calculate Position
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

    // 1. Draw Bird Silhouette
    ctx.strokeStyle = CONFIG.colors.outline;
    ctx.lineWidth = 3;
    ctx.fillStyle = '#f8fafc'; // Very light gray fill
    ctx.beginPath();
    // Simple Bird Shape approximation
    ctx.moveTo(650, 110); // Beak top
    ctx.quadraticCurveTo(600, 50, 500, 50); // Head top to back
    ctx.quadraticCurveTo(200, 100, 100, 350); // Back to tail
    ctx.lineTo(150, 400); // Tail bottom
    ctx.quadraticCurveTo(300, 450, 450, 400); // Belly
    ctx.quadraticCurveTo(600, 350, 650, 130); // Chest to beak
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Anatomical Structures (Blue Style)
    
    // Trachea
    ctx.beginPath();
    ctx.moveTo(ANATOMY.tracheaStart.x, ANATOMY.tracheaStart.y);
    ctx.quadraticCurveTo(550, 350, 400, 380); // Path to Posterior
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#e0f2fe'; // Very light blue tube
    ctx.lineCap = 'round';
    ctx.stroke();

    // Expansion Breathing
    let expansion = state.phase === 'INHALE' ? 
        Math.sin((state.elapsed % CONFIG.breathDuration)/CONFIG.breathDuration * Math.PI/2) : 
        Math.cos((state.elapsed % CONFIG.breathDuration)/CONFIG.breathDuration * Math.PI/2);
    
    // Posterior Sac (Left/Tail side) - Yellow/Orange in old plan, now BLUE
    let r1 = ANATOMY.posteriorSac.r * (0.8 + 0.3 * expansion);
    ctx.fillStyle = CONFIG.colors.sac;
    ctx.beginPath();
    ctx.ellipse(ANATOMY.posteriorSac.x, ANATOMY.posteriorSac.y, r1*1.2, r1, Math.PI/4, 0, Math.PI*2);
    ctx.fill();
    
    // Anterior Sac (Right/Chest side) - BLUE
    let r2 = ANATOMY.anteriorSac.r * (0.8 + 0.3 * expansion);
    ctx.fillStyle = CONFIG.colors.sac;
    ctx.beginPath();
    ctx.ellipse(ANATOMY.anteriorSac.x, ANATOMY.anteriorSac.y, r2, r2*0.8, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();

    // Lung (Static, Darker Blue)
    ctx.fillStyle = CONFIG.colors.lung; // solid blue
    ctx.beginPath();
    // Organic lung shape
    ctx.moveTo(ANATOMY.lung.x, ANATOMY.lung.y + 40);
    ctx.quadraticCurveTo(ANATOMY.lung.x + 20, ANATOMY.lung.y, ANATOMY.lung.x + 70, ANATOMY.lung.y + 10);
    ctx.quadraticCurveTo(ANATOMY.lung.x + 120, ANATOMY.lung.y, ANATOMY.lung.x + 140, ANATOMY.lung.y + 40);
    ctx.quadraticCurveTo(ANATOMY.lung.x + 120, ANATOMY.lung.y + 80, ANATOMY.lung.x + 70, ANATOMY.lung.y + 70);
    ctx.quadraticCurveTo(ANATOMY.lung.x + 20, ANATOMY.lung.y + 80, ANATOMY.lung.x, ANATOMY.lung.y + 40);
    ctx.fill();
    
    // Lung Mesh Texture
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for(let i=0; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(ANATOMY.lung.x + 20 + i*10, ANATOMY.lung.y + 10);
        ctx.lineTo(ANATOMY.lung.x + 10 + i*10, ANATOMY.lung.y + 70);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Noto Sans TC';
    ctx.fillText('後氣囊', ANATOMY.posteriorSac.x - 30, ANATOMY.posteriorSac.y);
    ctx.fillText('前氣囊', ANATOMY.anteriorSac.x - 30, ANATOMY.anteriorSac.y);
    ctx.fillStyle = '#fff';
    ctx.fillText('肺部', ANATOMY.lung.x + 50, ANATOMY.lung.y + 45);


    // 3. Draw Particles
    for (let p of particles) {
        if (!p.active) continue;
        ctx.beginPath();
        // Arrow shape? Dot is better for flow density
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
}

function updateUI() {
    // Highlight active steps
    // Inhale: Step 1 (Fresh enters Post) & Step 3 (Lung air enters Ant)
    // Exhale: Step 2 (Post air enters Lung) & Step 4 (Ant air exits)
    
    // Reset all
    Object.values(cardMap).forEach(c => c.classList.remove('active'));
    
    if (state.phase === 'INHALE') {
        cardMap[1].classList.add('active'); // Step 1
        cardMap[3].classList.add('active'); // Step 3
    } else {
        cardMap[2].classList.add('active'); // Step 2
        cardMap[4].classList.add('active'); // Step 4
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

resetBtn.addEventListener('click', () => {
    particles.forEach(p => p.active = false);
    state.elapsed = 0;
    lastTimestamp = Date.now();
    state.phase = 'INHALE';
    updateUI();
});

speedRange.addEventListener('input', (e) => {
    CONFIG.speed = parseFloat(e.target.value);
    speedValue.innerText = `${CONFIG.speed}x`;
});

// Start
update(Date.now());

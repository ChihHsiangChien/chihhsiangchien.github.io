const svg = document.getElementById('vessel-svg');
const bloodCellsGroup = document.getElementById('blood-cells');
const thrombusGroup = document.getElementById('thrombus');
const plaqueTop = document.getElementById('plaque-top');
const plaqueBottom = document.getElementById('plaque-bottom');
const description = document.getElementById('stage-description');

const btnNormal = document.getElementById('btn-normal');
const btnFattyStreak = document.getElementById('btn-fatty-streak');
const btnAthero = document.getElementById('btn-atherosclerosis');
const btnThrombo = document.getElementById('btn-thrombosis');

let stage = 'normal'; // normal, fatty-streak, atherosclerosis, thrombosis
let cells = [];
let animationId;
let clotFormed = false;

// Configuration
const VESSEL_WIDTH = 800;
const VESSEL_HEIGHT = 400;
const WALL_TOP_Y = 50;
const WALL_BOTTOM_Y = 350;
const CENTER_Y = 200;
const CELL_COUNT = 40;
const CELL_SPEED_BASE = 3;

// Plaque dimensions
const PLAQUE_START_X = 200;
const PLAQUE_END_X = 600;
const PLAQUE_MAX_HEIGHT = 130; // Increased size
const FATTY_STREAK_HEIGHT = 30; 

class RBC {
    constructor() {
        this.element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.element.setAttribute("r", 8 + Math.random() * 4);
        this.element.setAttribute("class", "rbc");
        bloodCellsGroup.appendChild(this.element);
        this.reset();
    }

    reset() {
        this.x = Math.random() * VESSEL_WIDTH;
        this.y = WALL_TOP_Y + 10 + Math.random() * (WALL_BOTTOM_Y - WALL_TOP_Y - 20);
        this.speed = CELL_SPEED_BASE + Math.random() * 2;
        this.vx = this.speed;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.stopped = false;
    }

    update() {
        if (this.stopped) return;

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around
        if (this.x > VESSEL_WIDTH + 20) {
            this.x = -20;
            this.y = this.getValidY();
            this.stopped = false;
        }

        // Constrain Y based on stage (Plaque)
        this.handleCollisions();

        // Update SVG
        this.element.setAttribute("cx", this.x);
        this.element.setAttribute("cy", this.y);
    }

    getValidY() {
        let minY = WALL_TOP_Y + 10;
        let maxY = WALL_BOTTOM_Y - 10;
        return minY + Math.random() * (maxY - minY);
    }

    handleCollisions() {
        // Wall collisions
        if (this.y < WALL_TOP_Y + 10) this.vy = Math.abs(this.vy);
        if (this.y > WALL_BOTTOM_Y - 10) this.vy = -Math.abs(this.vy);

        // Plaque collisions
        if (stage !== 'normal') {
            let currentMaxHeight = 0;
            if (stage === 'fatty-streak') currentMaxHeight = FATTY_STREAK_HEIGHT;
            else currentMaxHeight = PLAQUE_MAX_HEIGHT;

            if (this.x > PLAQUE_START_X && this.x < PLAQUE_END_X) {
                let t = (this.x - PLAQUE_START_X) / (PLAQUE_END_X - PLAQUE_START_X);
                let intrusion = 4 * t * (1 - t) * currentMaxHeight;

                let plaqueTopY = WALL_TOP_Y + intrusion;
                let plaqueBottomY = WALL_BOTTOM_Y - intrusion;

                if (this.y < plaqueTopY + 5) {
                    this.y = plaqueTopY + 5;
                    this.vy = Math.abs(this.vy) + 0.1;
                }
                if (this.y > plaqueBottomY - 5) {
                    this.y = plaqueBottomY - 5;
                    this.vy = -Math.abs(this.vy) - 0.1;
                }
            }
        }

        // Thrombus collision (Thrombosis only)
        if (stage === 'thrombosis' && clotFormed) {
            // Clot forms on the slope
            // Let's match the position in createThrombus
            // t = 0.65 (slightly downstream)
            const t = 0.65;
            const clotX = PLAQUE_START_X + t * (PLAQUE_END_X - PLAQUE_START_X);
            const intrusion = 4 * t * (1 - t) * PLAQUE_MAX_HEIGHT;
            const clotY = WALL_TOP_Y + intrusion; 
            
            const clotRadius = 55; 

            let dx = this.x - clotX;
            let dy = this.y - clotY;
            let dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < clotRadius + 5) {
                this.stopped = true;
                this.vx = 0;
                this.vy = 0;
            }
            
            // Pileup logic
            if (this.x > clotX - 120 && this.x < clotX && this.y < clotY + 100) {
                 if (Math.random() < 0.03) {
                     this.vx *= 0.9;
                     if (this.vx < 0.1) this.stopped = true;
                 }
            }
        }
    }
}

function init() {
    for (let i = 0; i < CELL_COUNT; i++) {
        cells.push(new RBC());
    }
    animate();
}

function animate() {
    cells.forEach(cell => cell.update());
    animationId = requestAnimationFrame(animate);
}

function setStage(newStage) {
    stage = newStage;
    
    // Update Buttons
    [btnNormal, btnFattyStreak, btnAthero, btnThrombo].forEach(b => b.classList.remove('active'));
    if (newStage === 'normal') btnNormal.classList.add('active');
    if (newStage === 'fatty-streak') btnFattyStreak.classList.add('active');
    if (newStage === 'atherosclerosis') btnAthero.classList.add('active');
    if (newStage === 'thrombosis') btnThrombo.classList.add('active');

    // Reset Clot
    clotFormed = false;
    thrombusGroup.innerHTML = '';
    thrombusGroup.setAttribute('opacity', '0');
    
    // Reset Cells
    cells.forEach(c => {
        c.stopped = false;
        c.vx = c.speed;
    });

    if (newStage === 'normal') {
        description.textContent = "正常血管：血流順暢，血管壁平滑且富有彈性。";
        animatePlaque(0);
    } else if (newStage === 'fatty-streak') {
        description.textContent = "脂肪條紋：早期動脈硬化，血管壁出現少量脂肪堆積，對血流影響尚不明顯。";
        animatePlaque(FATTY_STREAK_HEIGHT);
    } else if (newStage === 'atherosclerosis') {
        description.textContent = "斑塊堆積：脂肪斑塊顯著堆積，血管變窄，血流受阻。";
        animatePlaque(PLAQUE_MAX_HEIGHT);
    } else if (newStage === 'thrombosis') {
        description.textContent = "血栓形成：斑塊破裂，血小板聚集修補破口，形成血栓並阻塞血管。";
        animatePlaque(PLAQUE_MAX_HEIGHT);
        setTimeout(createThrombus, 800);
    }
}

function animatePlaque(height) {
    plaqueTop.style.transition = "opacity 1s, d 1s";
    plaqueBottom.style.transition = "opacity 1s, d 1s";
    
    if (height > 0) {
        plaqueTop.setAttribute('opacity', '1');
        plaqueBottom.setAttribute('opacity', '1');
        
        // Note: For quadratic bezier Q, the control point height needs to be 2x the desired peak height relative to the base
        // to achieve the parabolic shape height.
        const ctrlHeight = height * 2;

        plaqueTop.setAttribute('d', `M${PLAQUE_START_X},${WALL_TOP_Y+5} Q400,${WALL_TOP_Y+ctrlHeight} ${PLAQUE_END_X},${WALL_TOP_Y+5}`);
        plaqueBottom.setAttribute('d', `M${PLAQUE_START_X},${WALL_BOTTOM_Y-5} Q400,${WALL_BOTTOM_Y-ctrlHeight} ${PLAQUE_END_X},${WALL_BOTTOM_Y-5}`);
    } else {
        plaqueTop.setAttribute('opacity', '0');
        plaqueBottom.setAttribute('opacity', '0');
        
        plaqueTop.setAttribute('d', `M${PLAQUE_START_X},${WALL_TOP_Y+5} Q400,${WALL_TOP_Y+5} ${PLAQUE_END_X},${WALL_TOP_Y+5}`);
        plaqueBottom.setAttribute('d', `M${PLAQUE_START_X},${WALL_BOTTOM_Y-5} Q400,${WALL_BOTTOM_Y-5} ${PLAQUE_END_X},${WALL_BOTTOM_Y-5}`);
    }
}

function createThrombus() {
    clotFormed = true;
    thrombusGroup.setAttribute('opacity', '1');
    
    // Clot forms on the slope (downstream side)
    const t = 0.65;
    const clotX = PLAQUE_START_X + t * (PLAQUE_END_X - PLAQUE_START_X); // 200 + 0.65*400 = 460
    const intrusion = 4 * t * (1 - t) * PLAQUE_MAX_HEIGHT; // Height at t=0.65
    const clotY = WALL_TOP_Y + intrusion;

    // Add platelets/fibrin
    for(let i=0; i<30; i++) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        // Scatter them around the rupture point
        p.setAttribute("cx", clotX + (Math.random()-0.5)*60);
        p.setAttribute("cy", clotY + (Math.random()-0.3)*60); 
        p.setAttribute("r", 4 + Math.random()*3);
        p.setAttribute("class", "platelet");
        thrombusGroup.appendChild(p);
    }
    
    // Add "rupture" look on the plaque slope
    let rupture = document.createElementNS("http://www.w3.org/2000/svg", "path");
    rupture.setAttribute("d", `M${clotX-15},${clotY-10} L${clotX+15},${clotY+10} M${clotX+15},${clotY-10} L${clotX-15},${clotY+10}`);
    rupture.setAttribute("class", "fibrin");
    thrombusGroup.appendChild(rupture);
}

// Event Listeners
btnNormal.addEventListener('click', () => setStage('normal'));
btnFattyStreak.addEventListener('click', () => setStage('fatty-streak'));
btnAthero.addEventListener('click', () => setStage('atherosclerosis'));
btnThrombo.addEventListener('click', () => setStage('thrombosis'));

// Start
init();

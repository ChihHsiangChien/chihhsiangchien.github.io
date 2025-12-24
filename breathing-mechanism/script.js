const slider = document.getElementById('breathSlider');
const playPauseBtn = document.getElementById('playPauseBtn');
const rateSlider = document.getElementById('rateSlider');
const rateValue = document.getElementById('rateValue');
const statusText = document.getElementById('statusText');
const inhaleInfo = document.getElementById('inhaleInfo');
const exhaleInfo = document.getElementById('exhaleInfo');
const chestBreathBtn = document.getElementById('chestBreathBtn');
const abdominalBreathBtn = document.getElementById('abdominalBreathBtn');

// SVG Elements
const diaphragm = document.getElementById('diaphragm');
const lungsGroup = document.getElementById('lungsGroup');
const leftRibsGroup = document.getElementById('leftRibsGroup');
const rightRibsGroup = document.getElementById('rightRibsGroup');
const sternum = document.getElementById('sternum');
const airParticles = document.getElementById('airParticles');
const arrowInhale = document.getElementById('arrowInhale');
const arrowExhale = document.getElementById('arrowExhale');

let isPlaying = false;
let animationId;
let time = -Math.PI / 2; // Start at -1 (Exhale state)
let speed = 0.03; // Breathing speed (radians per frame)

// Breathing Modes Configuration
const modes = {
    chest: {
        ribFactor: 1.0,      // Full rib movement
        diaphragmFactor: 0.2 // Minimal diaphragm movement
    },
    abdominal: {
        ribFactor: 0.2,      // Minimal rib movement
        diaphragmFactor: 1.0 // Full diaphragm movement
    }
};

let currentMode = 'chest'; // Default mode

// Initial State
updateVisualization(0);

// Event Listeners
playPauseBtn.addEventListener('click', togglePlay);
slider.addEventListener('input', () => {
    pause();
    updateVisualization(slider.value / 100);
});

// 呼吸頻率控制 (6~30 次/分)
rateSlider.addEventListener('input', () => {
    const rate = parseInt(rateSlider.value, 10);
    rateValue.textContent = rate;
    // 1 cycle = 2π radians, 60s / rate = 秒/次
    // speed = 2π / (fps * 60 / rate)
    // 以 60fps 計算
    speed = (rate * Math.PI * 2) / (60 * 60); // 每 frame 增加的弧度
});

// Mode Switching Listeners
chestBreathBtn.addEventListener('click', () => setMode('chest'));
abdominalBreathBtn.addEventListener('click', () => setMode('abdominal'));

function setMode(mode) {
    currentMode = mode;
    updateModeButtons();
    // Refresh visualization with new factors
    updateVisualization(slider.value / 100);
}

function updateModeButtons() {
    if (currentMode === 'chest') {
        chestBreathBtn.classList.add('active');
        abdominalBreathBtn.classList.remove('active');
    } else {
        chestBreathBtn.classList.remove('active');
        abdominalBreathBtn.classList.add('active');
    }
}

// Initial UI Update
updateModeButtons();

function togglePlay() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    isPlaying = true;
    playPauseBtn.textContent = "暫停";
    animate();
}

function pause() {
    isPlaying = false;
    playPauseBtn.textContent = "播放";
    cancelAnimationFrame(animationId);
}

function animate() {
    // Use sine wave for natural breathing cycle
    // Map sin(-1 to 1) to (0 to 1)
    time += speed;
    const val = (Math.sin(time) + 1) / 2;
    
    slider.value = val * 100;
    updateVisualization(val);
    
    if (isPlaying) {
        animationId = requestAnimationFrame(animate);
    }
}

function updateVisualization(t) {
    // t is between 0 (Exhale end / Empty) and 1 (Inhale end / Full)
    
    // 1. Update Text Status & Arrows
    if (t > 0.5) {
        statusText.textContent = "吸氣狀態 (Inhalation)";
        statusText.style.color = "#e74c3c";
        inhaleInfo.classList.add('active-phase');
        exhaleInfo.classList.remove('active-phase');
        
        // Show Inhale Arrow
        arrowInhale.setAttribute('opacity', '1');
        arrowExhale.setAttribute('opacity', '0');
    } else {
        statusText.textContent = "呼氣狀態 (Exhalation)";
        statusText.style.color = "#3498db";
        inhaleInfo.classList.remove('active-phase');
        exhaleInfo.classList.add('active-phase');
        
        // Show Exhale Arrow
        arrowInhale.setAttribute('opacity', '0');
        arrowExhale.setAttribute('opacity', '1');
    }

    // 2. Diaphragm Animation
    // Anchors move with ribs: 360 -> 340 (reduced by factor if needed, but mainly controlled by rib move)
    // Actually, anchorY depends on ribs... let's simplify:
    // Base movement * factor
    
    // Get current mode factors
    const factors = modes[currentMode];

    // Diaphragm Control:
    // Standard movement: Control point 260 -> 380 (delta 120)
    // We scale the delta by diaphragmFactor.
    // The anchor points Y also move slightly with ribs normally.
    
    const diaphragmDelta = 120 * factors.diaphragmFactor;
    const controlY = 260 + (t * diaphragmDelta); 
    
    // Anchor movement linked to ribs usually, but let's scale it too or keep it tied to ribFactor?
    // Let's tie anchors to ribFactor generally, but diaphragm shape to diaphragmFactor
    const ribMoveDist = -20 * factors.ribFactor;
    const anchorY = 360 + (t * ribMoveDist);

    diaphragm.setAttribute('d', `M80,${anchorY} Q200,${controlY} 320,${anchorY}`);

    // 3. Lungs Animation (Scale)
    // Lungs expand in both cases, but maybe slightly less overall volume if one is restricted?
    // Let's keep lungs scaling based on t, maybe slightly modulated, but t is "breath volume".
    // 
    /*
    const scale = 1 + (t * 0.15);
    lungsGroup.setAttribute('transform', `translate(200, 280) scale(${scale}) translate(-200, -280)`);
    */

    // 3. Lungs Animation (Scale + Downward Move for abdominal breathing)
    let scale = 1 + (t * 0.15);
    let lungTranslateY = 0;

    // 腹式呼吸時，肺臟往下移動，頂部不超過肋骨
    if (currentMode === 'abdominal') {
        // 只往下移動，不讓頂部超過肋骨
        lungTranslateY = t * 20; // 20 可依實際視覺效果微調
    }

    lungsGroup.setAttribute(
        'transform',
        `translate(200, ${280 + lungTranslateY}) scale(${scale}) translate(-200, -280)`
    );    

    // 4. Ribs Animation (Lift, Expand, Rotate)
    // All scaled by ribFactor
    const ribY = t * -20 * factors.ribFactor;
    const ribScale = 1 + (t * 0.05 * factors.ribFactor);
    const ribRot = t * 5 * factors.ribFactor; // 5 degrees rotation * factor
    
    // Left Ribs: Rotate Clockwise around sternum connection (approx 195, 200)
    leftRibsGroup.setAttribute('transform', 
        `translate(195, 200) rotate(${ribRot}) scale(${ribScale}) translate(-195, -200) translate(0, ${ribY})`);

    // Right Ribs: Rotate Counter-Clockwise around sternum connection (approx 205, 200)
    rightRibsGroup.setAttribute('transform', 
        `translate(205, 200) rotate(${-ribRot}) scale(${ribScale}) translate(-205, -200) translate(0, ${ribY})`);

    // 5. Sternum Animation (Move up)
    // 5. Sternum Animation (Move up)
    // Linked to ribs
    const sternumY = 100 + (t * -20 * factors.ribFactor);
    sternum.setAttribute('y', sternumY);
    /*
    // 6. Air Particles Animation (Flow)
    // t=0 (Empty): Particles up (outside)
    // t=1 (Full): Particles down (inside)
    // Increased range for better flow effect
    const airY = -100 + (t * 150);
    const airOpacity = 0.4 + (t * 0.6); 
    airParticles.setAttribute('transform', `translate(0, ${airY})`);
    airParticles.setAttribute('opacity', airOpacity);
    */
}

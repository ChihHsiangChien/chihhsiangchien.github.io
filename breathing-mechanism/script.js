const slider = document.getElementById('breathSlider');
const playPauseBtn = document.getElementById('playPauseBtn');
const statusText = document.getElementById('statusText');
const inhaleInfo = document.getElementById('inhaleInfo');
const exhaleInfo = document.getElementById('exhaleInfo');

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
const speed = 0.03; // Breathing speed

// Initial State
updateVisualization(0);

// Event Listeners
playPauseBtn.addEventListener('click', togglePlay);
slider.addEventListener('input', () => {
    pause();
    updateVisualization(slider.value / 100);
});

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
    // Anchors move with ribs: 360 -> 340
    const anchorY = 360 + (t * -20);
    // Control point moves down to flatten: 260 -> 380
    const controlY = 260 + (t * 120); 
    diaphragm.setAttribute('d', `M80,${anchorY} Q200,${controlY} 320,${anchorY}`);

    // 3. Lungs Animation (Scale)
    // Scale from center (approx 200, 280)
    // Exhale: 1.0, Inhale: 1.15
    const scale = 1 + (t * 0.15);
    lungsGroup.setAttribute('transform', `translate(200, 280) scale(${scale}) translate(-200, -280)`);

    // 4. Ribs Animation (Lift, Expand, Rotate)
    const ribY = t * -20;
    const ribScale = 1 + (t * 0.05);
    const ribRot = t * 5; // 5 degrees rotation
    
    // Left Ribs: Rotate Clockwise around sternum connection (approx 195, 200)
    leftRibsGroup.setAttribute('transform', 
        `translate(195, 200) rotate(${ribRot}) scale(${ribScale}) translate(-195, -200) translate(0, ${ribY})`);

    // Right Ribs: Rotate Counter-Clockwise around sternum connection (approx 205, 200)
    rightRibsGroup.setAttribute('transform', 
        `translate(205, 200) rotate(${-ribRot}) scale(${ribScale}) translate(-205, -200) translate(0, ${ribY})`);

    // 5. Sternum Animation (Move up)
    const sternumY = 100 + (t * -20);
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

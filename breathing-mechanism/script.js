const slider = document.getElementById('breathSlider');
const playPauseBtn = document.getElementById('playPauseBtn');
const statusText = document.getElementById('statusText');
const inhaleInfo = document.getElementById('inhaleInfo');
const exhaleInfo = document.getElementById('exhaleInfo');

// SVG Elements
const diaphragm = document.getElementById('diaphragm');
const lungsGroup = document.getElementById('lungsGroup');
const ribsGroup = document.getElementById('ribsGroup');
const sternum = document.getElementById('sternum');

let isPlaying = false;
let animationId;
let time = 0;
const speed = 0.02; // Breathing speed

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
    // t is between 0 (Exhale) and 1 (Inhale)
    
    // 1. Update Text Status
    if (t > 0.5) {
        statusText.textContent = "吸氣狀態 (Inhalation)";
        statusText.style.color = "#e74c3c";
        inhaleInfo.classList.add('active-phase');
        exhaleInfo.classList.remove('active-phase');
    } else {
        statusText.textContent = "呼氣狀態 (Exhalation)";
        statusText.style.color = "#3498db";
        inhaleInfo.classList.remove('active-phase');
        exhaleInfo.classList.add('active-phase');
    }

    // 2. Diaphragm Animation
    // Exhale (0): Q200,280 (High Arch)
    // Inhale (1): Q200,400 (Flattened)
    const controlY = 280 + (t * 120); 
    diaphragm.setAttribute('d', `M80,380 Q200,${controlY} 320,380`);

    // 3. Lungs Animation (Scale)
    // Scale from center (approx 200, 250)
    // Exhale: 1.0, Inhale: 1.15
    const scale = 1 + (t * 0.15);
    // Transform origin needs to be center of lungs. 
    // Bounding box approx center is 200, 250.
    lungsGroup.setAttribute('transform', `translate(200, 250) scale(${scale}) translate(-200, -250)`);

    // 4. Ribs Animation (Lift and Expand)
    // Move up and scale out slightly
    // Translate Y: 0 to -20
    // Scale: 1 to 1.05
    const ribY = t * -20;
    const ribScale = 1 + (t * 0.05);
    ribsGroup.setAttribute('transform', `translate(200, 200) scale(${ribScale}) translate(-200, -200) translate(0, ${ribY})`);

    // 5. Sternum Animation (Move up)
    const sternumY = 100 + (t * -20);
    sternum.setAttribute('y', sternumY);
}

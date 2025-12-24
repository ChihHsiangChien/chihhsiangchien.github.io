// Web Audio API Context
let audioCtx;
const NUM_BUTTONS = 20;

// DOM Elements
const keypad = document.getElementById('keypad');
const baseFreqInput = document.getElementById('base-freq');
const freqStepInput = document.getElementById('freq-step');
const durationInput = document.getElementById('duration');
const durationVal = document.getElementById('duration-val');
const waveformSelect = document.getElementById('waveform');

// Initialize Audio Context on first interaction
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate Buttons
function createButtons() {
    keypad.innerHTML = '';
    const baseFreq = parseFloat(baseFreqInput.value) || 500;
    const step = parseFloat(freqStepInput.value) || 500;

    for (let i = 1; i <= NUM_BUTTONS; i++) {
        const btn = document.createElement('button');
        btn.className = 'sound-btn';
        
        // Calculate frequency: simple arithmetic progression for demo
        // Button 1 = Base
        // Button 2 = Base + Step
        const freq = baseFreq + (i - 1) * step;
        
        btn.innerHTML = `
            ${i}
            <span class="btn-freq">${Math.round(freq)}Hz</span>
        `;

        // Store frequency on the element dataset
        btn.dataset.freq = freq;

        btn.addEventListener('mousedown', (e) => {
            initAudio();
            playTone(parseFloat(btn.dataset.freq));
            animateButton(btn);
        });

        // Touch support
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // prevent mouse emulation
            initAudio();
            playTone(parseFloat(btn.dataset.freq));
            animateButton(btn);
        });

        keypad.appendChild(btn);
    }
}

// Play Tone
function playTone(freq) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const duration = parseInt(durationInput.value) || 300;
    const type = waveformSelect.value;
    const now = audioCtx.currentTime;

    // Create Oscillator
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Create Gain Node (for Envelope)
    const gainNode = audioCtx.createGain();
    
    // Connect graph
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Simple ADSR-like Envelope
    // Attack
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
    
    // Decay/Sustain (hold for duration - release)
    // Note: for fixed duration simple beep:
    
    // Release
    const stopTime = now + (duration / 1000);
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime);

    osc.start(now);
    osc.stop(stopTime + 0.1); // stop slightly after release
}

// Visual Feedback
function animateButton(btn) {
    // CSS :active handles most, but we can add extra JS effects if needed
    // For now, let's rely on CSS active state for immediate feedback
}

// Event Listeners for Controls
baseFreqInput.addEventListener('input', createButtons);
freqStepInput.addEventListener('input', createButtons);

durationInput.addEventListener('input', () => {
    durationVal.textContent = `${durationInput.value}ms`;
});

// Initial Setup
createButtons();

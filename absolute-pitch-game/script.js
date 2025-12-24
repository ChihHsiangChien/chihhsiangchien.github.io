const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const startBtn = document.getElementById('start-btn');
const levelSelect = document.getElementById('level-select');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const pianoContainer = document.getElementById('piano-container');
const feedbackOverlay = document.getElementById('feedback-overlay');
const feedbackText = document.getElementById('feedback-text');

let isGameActive = false;
let currentScore = 0;
let currentStreak = 0;
let currentNote = null;
let currentLevel = 'easy';

// Note Data (Frequency Map)
// Base frequencies for octave 4
const baseFreq = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
    'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
    'A#': 466.16, 'B': 493.88
};

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getFrequency(note, octave) {
    const semitonesFromA4 = (octave - 4) * 12 + noteNames.indexOf(note) - 9;
    return 440 * Math.pow(2, semitonesFromA4 / 12);
}

// Level Configurations
const levels = {
    easy: { startOctave: 4, endOctave: 4, includeBlack: false },
    medium: { startOctave: 4, endOctave: 4, includeBlack: true },
    hard: { startOctave: 3, endOctave: 4, includeBlack: true },
    expert: { startOctave: 3, endOctave: 5, includeBlack: true }
};

// Piano Generation
function generatePiano(levelConfig) {
    pianoContainer.innerHTML = '';
    const { startOctave, endOctave, includeBlack } = levelConfig;

    let whiteKeyIndex = 0;

    for (let oct = startOctave; oct <= endOctave; oct++) {
        noteNames.forEach((note) => {
            const isBlack = note.includes('#');
            if (isBlack && !includeBlack) return; // Skip black keys for easy mode visual simplifiction if desired, but usually we just disable them. 
            // Actually for 'easy' mode (C Major), we might want to hide black keys or just make them unclickable.
            // Let's render them but disable interaction or just render all for consistency but only pick white notes.
            // Requirement says "Easy (C Major)". Let's render standard piano but only generate white notes.
            
            // Wait, for visuals, a piano always has black keys. Let's keep them.
            
            const key = document.createElement('div');
            key.dataset.note = note;
            key.dataset.octave = oct;
            key.classList.add('key');
            
            if (isBlack) {
                key.classList.add('black');
                // Calculate position based on previous white key
                // A standard octave has 7 white keys. width is 60px.
                // Black keys are between C-D, D-E, F-G, G-A, A-B
                // We need to calculate left offset manually or use a specific structure.
                // Simple approach: Put black keys inside the white key container? No.
                // Better: Absolute position relative to container.
                const offset = (whiteKeyIndex * 60) - 20; // Center on line
                key.style.left = `${offset}px`;
            } else {
                key.classList.add('white');
                whiteKeyIndex++;
            }

            key.addEventListener('click', () => handleKeyClick(note, oct, key));
            pianoContainer.appendChild(key);
        });
    }
    
    // Adjust container width
    pianoContainer.style.width = `${whiteKeyIndex * 60}px`;
}

// Audio Logic
function playTone(freq, duration = 1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle'; // Softer than sine, easier to hear pitch
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    
    // Envelope
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.stop(audioCtx.currentTime + duration);
}

function playCurrentNote() {
    if (!currentNote) return;
    const freq = getFrequency(currentNote.note, currentNote.octave);
    playTone(freq, 1.5);
}

// Game Logic
function startGame() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    isGameActive = true;
    currentScore = 0;
    currentStreak = 0;
    updateUI();
    isGameActive = true;
    currentScore = 0;
    currentStreak = 0;
    updateUI();
    startBtn.textContent = '重播放音';
    // Removed direct onclick assignment to avoid conflict
    
    // Reset/Generate Piano based on level
    const levelKey = levelSelect.value;
    const config = levels[levelKey];
    generatePiano(config); // Re-render in case range changes
    
    nextRound();
}

function nextRound() {
    const levelKey = levelSelect.value;
    const config = levels[levelKey];
    
    // Generate valid note
    let validNotes = [];
    for (let oct = config.startOctave; oct <= config.endOctave; oct++) {
        noteNames.forEach(note => {
            const isBlack = note.includes('#');
            if (!config.includeBlack && isBlack) return;
            validNotes.push({ note, octave: oct });
        });
    }
    
    const randomIndex = Math.floor(Math.random() * validNotes.length);
    currentNote = validNotes[randomIndex];
    
    // Delay slightly then play
    setTimeout(() => {
        playCurrentNote();
    }, 500);
}

function handleKeyClick(note, octave, keyElement) {
    if (!isGameActive) return;
    
    // Play the note the user clicked so they hear it
    const freq = getFrequency(note, octave);
    playTone(freq, 0.5);
    
    const isCorrect = (note === currentNote.note && octave === currentNote.octave);
    
    if (isCorrect) {
        currentScore += 10 + Math.floor(currentStreak / 3) * 5; // Bonus for streak
        currentStreak++;
        keyElement.classList.add('correct');
        showFeedback('答對了！', true);
    } else {
        currentScore -= 5;
        if (currentScore < 0) currentScore = 0;
        currentStreak = 0;
        keyElement.classList.add('wrong');
        
        // Highlight correct key
        const correctKey = Array.from(document.querySelectorAll('.key')).find(k => 
            k.dataset.note === currentNote.note && parseInt(k.dataset.octave) === currentNote.octave
        );
        if (correctKey) correctKey.classList.add('correct');

        showFeedback(`答錯了！是 ${currentNote.note}${currentNote.octave}`, false);
    }
    
    updateUI();
    
    setTimeout(() => {
        // Reset keys
        document.querySelectorAll('.key').forEach(k => {
            k.classList.remove('correct', 'wrong');
        });
        nextRound();
    }, 1500);
}

function updateUI() {
    scoreDisplay.textContent = currentScore;
    streakDisplay.textContent = currentStreak;
}

function showFeedback(text, success) {
    feedbackText.textContent = text;
    feedbackText.style.color = success ? '#4caf50' : '#cf6679';
    feedbackOverlay.classList.remove('hidden');
    feedbackOverlay.classList.add('show');
    
    setTimeout(() => {
        feedbackOverlay.classList.remove('show');
        setTimeout(() => feedbackOverlay.classList.add('hidden'), 300);
    }, 1000);
}

// Initial Setup
startBtn.addEventListener('click', () => {
    if (!isGameActive) {
        startGame();
    } else {
        playCurrentNote();
    }
});
levelSelect.addEventListener('change', () => {
    if (isGameActive) {
        // Optional: End game or restart?
        // Let's just regenerate piano
        startGame(); 
    } else {
        generatePiano(levels[levelSelect.value]);
    }
});

// Render initial piano
generatePiano(levels.easy);

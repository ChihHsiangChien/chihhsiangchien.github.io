const MAX_NUMBERS = 25;
let currentTarget = 1;
let startTime = 0;
let timerInterval = null;
let isGameActive = false;

// DOM Elements
const gameBoard = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer');
const currentTargetDisplay = document.getElementById('current-target');
const startOverlay = document.getElementById('start-overlay');
const resultOverlay = document.getElementById('result-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalTimeDisplay = document.getElementById('final-time');
const finalRankDisplay = document.getElementById('final-rank');
const resultCommentDisplay = document.getElementById('result-comment');

// Sound Effects System
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'win') {
        const types = ['sine', 'triangle'];
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major chord
        
        freqs.forEach((f, i) => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            
            osc2.type = types[i % 2];
            osc2.frequency.setValueAtTime(f, now);
            
            gain2.gain.setValueAtTime(0.05, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc2.start(now);
            osc2.stop(now + 1.5);
        });
    }
}

function initGame() {
    // Generate numbers 1 to MAX_NUMBERS
    const numbers = Array.from({ length: MAX_NUMBERS }, (_, i) => i + 1);
    
    // Shuffle numbers (Fisher-Yates shuffle)
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Clear board
    gameBoard.innerHTML = '';

    // Render grid
    numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.textContent = num;
        cell.dataset.number = num;
        cell.addEventListener('pointerdown', () => handleCardClick(num, cell)); // Use pointerdown for better mobile response
        gameBoard.appendChild(cell);
    });

    // Reset state
    currentTarget = 1;
    currentTargetDisplay.textContent = currentTarget;
    stopTimer();
    timerDisplay.textContent = '00:00:00';
    isGameActive = false;
}

function startGame() {
    initAudio(); // Initialize audio context on user gesture
    initGame();
    startOverlay.classList.remove('active');
    resultOverlay.classList.remove('active');
    
    startTime = Date.now();
    isGameActive = true;
    timerInterval = setInterval(updateTimer, 10); // Update every 10ms
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    timerDisplay.textContent = formatTime(elapsedTime);
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
}

function handleCardClick(number, cellElement) {
    if (!isGameActive) return;

    if (number === currentTarget) {
        // Correct click
        playSound('correct');
        cellElement.classList.add('completed');
        
        if (currentTarget === MAX_NUMBERS) {
            endGame();
        } else {
            currentTarget++;
            currentTargetDisplay.textContent = currentTarget;
        }
    } else {
        // Wrong click
        playSound('wrong');
        cellElement.classList.add('shake');
        // Remove shake class after animation
        setTimeout(() => {
            cellElement.classList.remove('shake');
        }, 400);
    }
}

function endGame() {
    isGameActive = false;
    stopTimer();
    playSound('win');
    const finalTimeMs = Date.now() - startTime;
    showResult(finalTimeMs);
}

function showResult(ms) {
    const timeStr = formatTime(ms);
    const seconds = ms / 1000;
    
    let rank = 'C';
    let comment = '再接再厲!';
    let rankClass = '';

    if (seconds < 15) {
        rank = 'S';
        comment = '神級專注力！你是機器人嗎？';
        rankClass = 'rank-s';
    } else if (seconds < 25) {
        rank = 'A';
        comment = '超凡的專注力！快如閃電。';
        rankClass = 'rank-a';
    } else if (seconds < 40) {
        rank = 'B';
        comment = '很棒！表現非常穩定。';
        rankClass = 'rank-b';
    } else {
        rank = 'C';
        comment = '不錯！試著挑戰更快的速度。';
        rankClass = 'rank-c';
    }

    finalTimeDisplay.textContent = timeStr;
    finalRankDisplay.textContent = `等級 ${rank}`;
    resultCommentDisplay.textContent = comment;
    
    // Trigger overlay appearance
    resultOverlay.classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initialize board on load (but wait for start)
initGame();

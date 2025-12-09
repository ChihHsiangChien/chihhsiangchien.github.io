const ELEMENTS = {
    gameArea: document.getElementById('game-area'),
    startBtn: document.getElementById('start-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings'),
    displayTimeInput: document.getElementById('display-time'),
    displayTimeVal: document.getElementById('time-val'),
    startLevelInput: document.getElementById('start-level'),
    startLevelVal: document.getElementById('start-level-val'),
    retryModeCheckbox: document.getElementById('retry-mode'),
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    gameOverModal: document.getElementById('game-over-modal'),
    endTitle: document.getElementById('end-title'),
    endMessage: document.getElementById('end-message'),
    restartBtn: document.getElementById('restart-btn')
};

const STATE = {
    currentLevel: 5,
    score: 0,
    cards: [],
    displayTime: 2000,
    isPlaying: false,
    expectedNext: 1,
    timerId: null,
    retryMode: true
};

// --- Audio Context ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    }
}

// --- Game Logic ---

function initGame() {
    STATE.currentLevel = parseInt(ELEMENTS.startLevelInput.value);
    STATE.score = 0;
    updateUI();
    startLevel();
}

function startLevel() {
    if (STATE.timerId) clearTimeout(STATE.timerId);
    
    ELEMENTS.gameArea.innerHTML = '';
    STATE.cards = [];
    STATE.expectedNext = 1;
    STATE.isPlaying = false; // Wait for memorize phase
    updateUI();

    let attempts = 0;
    let success = false;
    let positions = [];
    let currentRadius = 40; // Start with 40px radius

    // Try to generate positions, shrinking radius if needed
    while (!success && attempts < 5) {
        try {
            positions = generatePositions(STATE.currentLevel, currentRadius);
            success = true;
        } catch (e) {
            currentRadius -= 5; // Reduce radius
            attempts++;
        }
    }
    
    if (!success) {
         // Should rarely happen with shrinking
         positions = generatePositions(STATE.currentLevel, 20);
    }

    positions.forEach((pos, index) => {
        const value = index + 1;
        const card = createCard(value, pos.x, pos.y, currentRadius);
        ELEMENTS.gameArea.appendChild(card);
        STATE.cards.push(card);
    });

    // Memorize Phase
    STATE.timerId = setTimeout(() => {
        flipAllCards();
        STATE.isPlaying = true;
    }, STATE.displayTime);
}

function createCard(value, x, y, radius) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.width = `${radius * 2}px`;
    card.style.height = `${radius * 2}px`;
    card.dataset.value = value;

    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front" style="font-size: ${radius}px;">${value}</div>
            <div class="card-back"></div>
        </div>
    `;

    card.addEventListener('mousedown', (e) => handleCardClick(e, value, card));
    return card;
}

function generatePositions(n, radius) {
    const positions = [];
    const padding = 10;
    const maxAttempts = 2000;
    const width = ELEMENTS.gameArea.clientWidth - (radius * 2) - padding;
    const height = ELEMENTS.gameArea.clientHeight - (radius * 2) - padding;

    for (let i = 0; i < n; i++) {
        let attempts = 0;
        let valid = false;
        let x, y;

        while (!valid && attempts < maxAttempts) {
            x = Math.random() * width + padding;
            y = Math.random() * height + padding;
            
            valid = true;
            for (const pos of positions) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < (radius * 2 + padding)) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        }

        if (valid) {
            positions.push({x, y});
        } else {
            throw new Error("Overlap");
        }
    }
    return positions;
}

function flipAllCards() {
    STATE.cards.forEach(card => {
        card.classList.add('is-flipped');
    });
}

function handleCardClick(e, value, card) {
    if (!STATE.isPlaying) return;
    if (!card.classList.contains('is-flipped')) return; // Already clicked/revealed

    if (value === STATE.expectedNext) {
        // Correct
        playSound('click');
        card.classList.remove('is-flipped'); // Reveal
        STATE.expectedNext++;

        if (STATE.expectedNext > STATE.currentLevel) {
            // Level Complete
            playSound('win');
            STATE.score += STATE.currentLevel * 10;
            STATE.currentLevel++;
            STATE.timerId = setTimeout(startLevel, 1000);
        }
    } else {
        // Wrong
        playSound('wrong');
        gameOver(value);
    }
}

function gameOver(clickedValue) {
    STATE.isPlaying = false;
    ELEMENTS.endTitle.textContent = "失敗!";
    ELEMENTS.endMessage.textContent = `你按到了 ${clickedValue}，但順序應該是 ${STATE.expectedNext}`;
    ELEMENTS.gameOverModal.classList.remove('hidden');
}

function updateUI() {
    ELEMENTS.levelDisplay.textContent = `Level: ${STATE.currentLevel}`;
    ELEMENTS.scoreDisplay.textContent = `Score: ${STATE.score}`;
}

// --- Event Listeners ---

ELEMENTS.startBtn.addEventListener('click', () => {
    ELEMENTS.startBtn.parentElement.style.display = 'none'; // Hide start button
    initGame();
});

ELEMENTS.settingsBtn.addEventListener('click', () => {
    ELEMENTS.settingsModal.classList.remove('hidden');
    // Sync checkbox
    ELEMENTS.retryModeCheckbox.checked = STATE.retryMode;
});

ELEMENTS.closeSettingsBtn.addEventListener('click', () => {
    ELEMENTS.settingsModal.classList.add('hidden');
    STATE.displayTime = parseFloat(ELEMENTS.displayTimeInput.value) * 1000;
    STATE.retryMode = ELEMENTS.retryModeCheckbox.checked;
});

ELEMENTS.restartBtn.addEventListener('click', () => {
    ELEMENTS.gameOverModal.classList.add('hidden');
    if (STATE.retryMode) {
        startLevel();
    } else {
        initGame();
    }
});

ELEMENTS.displayTimeInput.addEventListener('input', (e) => {
    ELEMENTS.displayTimeVal.textContent = e.target.value;
});

ELEMENTS.startLevelInput.addEventListener('input', (e) => {
    ELEMENTS.startLevelVal.textContent = e.target.value;
});

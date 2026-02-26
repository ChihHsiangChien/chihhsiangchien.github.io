// Game Configuration
const LEVELS = {
    'lv1': { count: 4, label: "初級 (入門)" },
    'lv2': { count: 8, label: "中級 (進階)" },
    'lv3': { count: 12, label: "高級 (挑戰)" },
    'lv4': { count: 20, label: "專業級 (大師)" }
};

// State
let currentDifficulty = 'lv2';
let targetColors = []; 
let currentColors = []; 
let dragSrcEl = null;
let firstSelectedIdx = null;

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundFX = {
    playTone: (freq, type, duration) => {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    
    playPick: () => {
        SoundFX.playTone(400, 'sine', 0.1);
    },
    
    playDrop: () => {
        SoundFX.playTone(600, 'sine', 0.15);
    },
    
    playWin: () => {
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
            }, i * 100);
        });
    }
};

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameBoard = document.getElementById('game-board');
const successModal = document.getElementById('success-modal');
const levelIndicator = document.getElementById('level-indicator');

// Initialization
function setupDifficulty() {
    const urlParams = new URLSearchParams(window.location.search);
    const diff = urlParams.get('diff');
    if (diff && LEVELS[diff]) {
        currentDifficulty = diff;
        // Auto start
        setTimeout(() => startGame(diff), 500);
    }
}

document.querySelectorAll('.btn-diff').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-diff');
        const diffKey = target.dataset.id || 'lv2';
        if (audioCtx.state === 'suspended') audioCtx.resume();
        startGame(diffKey);
    });
});

document.getElementById('back-btn').addEventListener('click', showMenu);
document.getElementById('modal-menu-btn').addEventListener('click', () => {
    hideModal();
    showMenu();
});
document.getElementById('reset-btn').addEventListener('click', resetLevel);
document.getElementById('check-btn').addEventListener('click', checkWin);
document.getElementById('next-level-btn').addEventListener('click', () => {
    // For specific event, "Next Level" could just re-init current difficulty with different colors
    hideModal();
    startGame(currentDifficulty);
});

function showMenu() {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
}

function startGame(diffKey) {
    currentDifficulty = diffKey;
    const config = LEVELS[diffKey];
    levelIndicator.innerText = `${config.label}`;
    
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    initLevel(config.count);
}

function resetLevel() {
    initLevel(LEVELS[currentDifficulty].count);
}

// ... (initLevel, hsbToHslString, generateGradient, shuffleArray, renderBoard, DnD handlers remain same) ...

setupDifficulty();

function initLevel(count) {
    // 1. Generate Gradient
    targetColors = generateGradient(count);
    
    // 2. Shuffle middle elements
    // Copy the middle elements
    const middle = targetColors.slice(1, count - 1);
    const start = targetColors[0];
    const end = targetColors[count - 1];
    
    // Shuffle middle
    shuffleArray(middle);
    
    // Reassemble
    currentColors = [start, ...middle, end];
    
    // 3. Render
    renderBoard();
}

// HSB to CSS HSL Helper
function hsbToHslString(h, s, b) {
    s /= 100;
    b /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    
    // RGB values 0-1
    const r = 255 * f(5);
    const g = 255 * f(3);
    const b_val = 255 * f(1);
    
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b_val)})`;
}

function generateGradient(count) {
    const startH = Math.floor(Math.random() * 360);
    const dist = 60 + Math.floor(Math.random() * 120); 
    const endH = startH + dist; 
    
    const S = 60 + Math.floor(Math.random() * 40); // 60-100%
    const B = 80 + Math.floor(Math.random() * 20); // 80-100%
    
    const colors = [];
    
    for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1);
        const h = startH + (endH - startH) * ratio;
        const normalizedH = (h % 360 + 360) % 360; 
        
        colors.push({
            h: normalizedH,
            s: S,
            b: B,
            css: hsbToHslString(normalizedH, S, B),
            originalIndex: i 
        });
    }
    return colors;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function renderBoard() {
    gameBoard.innerHTML = '';
    
    currentColors.forEach((colorObj, index) => {
        const div = document.createElement('div');
        div.className = 'color-block';
        div.style.backgroundColor = colorObj.css;
        div.dataset.index = index; 
        
        if (index === 0 || index === currentColors.length - 1) {
            div.classList.add('fixed');
            div.draggable = false;
        } else {
            div.draggable = true;
            addDnDHandlers(div);
            // Also keep click-to-swap for touch/accessibility
            div.addEventListener('click', (e) => handleBlockInteraction(index, div));
        }
        
        gameBoard.appendChild(div);
    });
}

function addDnDHandlers(el) {
    el.addEventListener('dragstart', (e) => {
        dragSrcEl = el;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', el.innerHTML);
        SoundFX.playPick();
    });

    el.addEventListener('dragover', (e) => {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!el.classList.contains('fixed')) {
            el.classList.add('over');
        }
        return false;
    });

    el.addEventListener('dragleave', () => {
        el.classList.remove('over');
    });

    el.addEventListener('drop', (e) => {
        if (e.stopPropagation) e.stopPropagation();
        
        if (dragSrcEl !== el && !el.classList.contains('fixed')) {
            const srcIdx = parseInt(dragSrcEl.dataset.index);
            const targetIdx = parseInt(el.dataset.index);
            
            swapColors(srcIdx, targetIdx);
            SoundFX.playDrop();
        }
        return false;
    });

    el.addEventListener('dragend', () => {
        document.querySelectorAll('.color-block').forEach(block => {
            block.classList.remove('over');
            block.classList.remove('dragging');
        });
    });
}

function swapColors(idx1, idx2) {
    const temp = currentColors[idx1];
    currentColors[idx1] = currentColors[idx2];
    currentColors[idx2] = temp;
    
    firstSelectedIdx = null; // Reset click-to-swap state
    renderBoard();
    checkWinInternal(false);
}

function handleBlockInteraction(index, el) {
    if (firstSelectedIdx === null) {
        // First selection
        firstSelectedIdx = index;
        el.classList.add('selected');
        SoundFX.playPick();
    } else if (firstSelectedIdx === index) {
        // Deselect
        firstSelectedIdx = null;
        el.classList.remove('selected');
    } else {
        // Second selection - SWAP
        swapColors(firstSelectedIdx, index);
        SoundFX.playDrop();
    }
}

function checkWin() {
    checkWinInternal(true);
}

function checkWinInternal(showError) {
    let isCorrect = true;
    for (let i = 0; i < currentColors.length; i++) {
        if (currentColors[i].originalIndex !== i) {
            isCorrect = false;
            break;
        }
    }
    
    if (isCorrect) {
        if (successModal.classList.contains('hidden')) {
            SoundFX.playWin();
            showSuccess();
        }
    } else if (showError) {
        const btn = document.getElementById('check-btn');
        btn.innerText = "不對喔...";
        setTimeout(() => btn.innerText = "檢查答案", 1000);
    }
}

function showSuccess() {
    successModal.classList.remove('hidden');
}

function hideModal() {
    successModal.classList.add('hidden');
}

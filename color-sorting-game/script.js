// Game Configuration
const LEVELS = {
    1: { count: 6, label: "Easy" },
    2: { count: 10, label: "Medium" },
    3: { count: 15, label: "Hard" },
    4: { count: 25, label: "Expert" }
};

// State
let currentLevel = 1;
let targetColors = []; // The correct sorted order
let currentColors = []; // The current shuffled order
let dragSrcEl = null;

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
        // Simple arpeggio
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
document.querySelectorAll('.btn-diff').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Handle click on button or its children
        const target = e.target.closest('.btn-diff');
        const level = parseInt(target.dataset.level);
        // Resume audio context on user gesture
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        startGame(level);
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
    const next = currentLevel + 1;
    if (LEVELS[next]) {
        hideModal();
        startGame(next);
    } else {
        alert("恭喜！你已完成所有關卡！");
        hideModal();
        showMenu();
    }
});

function showMenu() {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
}

function startGame(level) {
    currentLevel = level;
    levelIndicator.innerText = `${LEVELS[level].label} (Level ${level})`;
    
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    initLevel(LEVELS[level].count);
}

function resetLevel() {
    initLevel(LEVELS[currentLevel].count);
}

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
        }
        
        gameBoard.appendChild(div);
    });
}

// Drag and Drop Logic
function addDnDHandlers(el) {
    el.addEventListener('dragstart', handleDragStart, false);
    el.addEventListener('dragenter', handleDragEnter, false);
    el.addEventListener('dragover', handleDragOver, false);
    el.addEventListener('dragleave', handleDragLeave, false);
    el.addEventListener('drop', handleDrop, false);
    el.addEventListener('dragend', handleDragEnd, false);
}

function handleDragStart(e) {
    dragSrcEl = this;
    SoundFX.playPick(); // Sound
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== dragSrcEl && !this.classList.contains('fixed')) {
        this.style.transform = 'scale(1.1)';
        this.style.zIndex = '100';
    }
}

function handleDragLeave(e) {
    if (this !== dragSrcEl) {
        this.style.transform = '';
        this.style.zIndex = '';
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (dragSrcEl !== this && !this.classList.contains('fixed')) {
        SoundFX.playDrop(); // Sound
        
        const srcIdx = parseInt(dragSrcEl.dataset.index);
        const targetIdx = parseInt(this.dataset.index);
        
        const temp = currentColors[srcIdx];
        currentColors[srcIdx] = currentColors[targetIdx];
        currentColors[targetIdx] = temp;
        
        renderBoard();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.color-block').forEach(col => {
        col.style.transform = '';
        col.style.zIndex = '';
    });
    
    checkWinInternal(false);
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
        // Prevent multiple calls
        if (successModal.classList.contains('hidden')) {
            SoundFX.playWin(); // Sound
            showSuccess();
        }
    } else {
        if (showError) {
            const btn = document.getElementById('check-btn');
            btn.innerText = "不對喔...";
            setTimeout(() => btn.innerText = "檢查答案", 1000);
        }
    }
}

function showSuccess() {
    successModal.classList.remove('hidden');
}

function hideModal() {
    successModal.classList.add('hidden');
}

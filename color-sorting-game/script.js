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
    // Re-shuffle the middle blocks, keep endpoints same
    // Or simpler: just restart the level with new colors? 
    // Let's restart with new colors for variety, or keep same?
    // "Reset" usually means "restore initial state". 
    // For this game, it might be better to just re-shuffle the CURRENT colors.
    
    // Actually, let's just re-render the currentColors, which was the shuffled state.
    // To do true reset, we need to store initialShuffled order. 
    // Let's just regenerate for now, simplest behavior.
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
// H: 0-360, S: 0-100, B: 0-100
// CSS HSL: H 0-360, S 0-100%, L 0-100%
// We need to convert HSB to HSL for display, or just use HSL directly?
// The user asked for HSB. Let's work with HSB internally and convert logic.
// Simpler: Just use HSL directly since it's native to CSS and visually similar for this purpose.
// If strictly HSB is required, we can convert. HSB (HSV) allows for "B" brightness which is intuitive.
// Let's use HSB logic for generation but convert to RGB/HSL string for CSS.

function hsbToHslString(h, s, b) {
    // Simple conversion or just use HSL?
    // Let's stick to HSL for simplicity of code unless "HSB" is a strict mathematical requirement.
    // User requested "HSB color setting" (利用HSB的顏色設定).
    // Let's generate in HSB space.
    
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
    // Random start/end HSB
    // To ensure good difficulty, we want start and end Colors to be distinct but related?
    // Or completely random?
    // Let's do random Hues, same Saturation/Brightness for smoothness.
    
    const startH = Math.floor(Math.random() * 360);
    // End hue should be far enough to make a gradient, but maybe not too far 
    // (e.g. 360 range could wrap around).
    // Let's pick an end hue that is +60 to +180 degrees away.
    const dist = 60 + Math.floor(Math.random() * 120); 
    const endH = startH + dist; // Can go > 360, logic handles it? verify.
    
    const S = 60 + Math.floor(Math.random() * 40); // 60-100%
    const B = 80 + Math.floor(Math.random() * 20); // 80-100%
    
    const colors = [];
    
    for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1);
        const h = startH + (endH - startH) * ratio;
        // Normalize H if we want, but CSS/Math handles overflow usually? 
        // For RGB conversion we need proper modular arithmetic if we were implementing it, 
        // but our simple logic might need H mod 360.
        const normalizedH = (h % 360 + 360) % 360; 
        
        // Construct object
        colors.push({
            h: normalizedH,
            s: S,
            b: B,
            css: hsbToHslString(normalizedH, S, B),
            originalIndex: i // Used to check win
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
        div.dataset.index = index; // Current position index
        
        // Fixed ends
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
    
    // Touch support basic (for mobile)? 
    // Native HTML5 DnD is poor on mobile. 
    // For now we assume desktop or use a polyfill if requested.
    // User env is Windows, so likely desktop mouse.
}

function handleDragStart(e) {
    dragSrcEl = this;
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
    // visual cue
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
        // Swap data in currentColors array
        const srcIdx = parseInt(dragSrcEl.dataset.index);
        const targetIdx = parseInt(this.dataset.index);
        
        // Swap
        const temp = currentColors[srcIdx];
        currentColors[srcIdx] = currentColors[targetIdx];
        currentColors[targetIdx] = temp;
        
        // Re-render
        renderBoard();
        
        // Animation?
        // Basic re-render is instant.
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    // Cleanup any styles
    document.querySelectorAll('.color-block').forEach(col => {
        col.style.transform = '';
        col.style.zIndex = '';
    });
    
    // Auto-check? Or wait for button?
    // User request: "利用HSB的顏色設定。固定其中兩個，玩家需要進行另一個的顏色排序"
    // Usually these games auto-check or have a button. I added a button.
    // Let's also auto-check for better UX.
    checkWinInternal(false);
}

function checkWin() {
    checkWinInternal(true);
}

function checkWinInternal(showError) {
    let isCorrect = true;
    
    // Check if current currentColors matches targetColors (by originalIndex)
    // Note: targetColors is strictly 0,1,2,3... sorted by creation
    // But wait, the target state IS the initial generated sorted state.
    // So we just check if currentColors[i].originalIndex == i
    
    for (let i = 0; i < currentColors.length; i++) {
        if (currentColors[i].originalIndex !== i) {
            isCorrect = false;
            break;
        }
    }
    
    if (isCorrect) {
        showSuccess();
    } else {
        if (showError) {
            // Shake animation or error msg
            const btn = document.getElementById('check-btn');
            btn.innerText = "不對喔...";
            setTimeout(() => btn.innerText = "檢查答案", 1000);
        }
    }
}

function showSuccess() {
    successModal.classList.remove('hidden');
    // Maybe confetti later?
}

function hideModal() {
    successModal.classList.add('hidden');
}

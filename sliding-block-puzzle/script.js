const UNIT = 80; // px
const GAP = 2; // px
const GRID_W = 4;
const GRID_H = 5;

// State
let currentLevelIndex = 0;
let blocks = []; // Array of objects: { id, type, x, y, color, w, h }
let historyStack = [];
let futureStack = [];

// DOM Elements
const boardEl = document.getElementById('board');
const levelSelect = document.getElementById('level-select');
const btnReset = document.getElementById('btn-reset');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const modal = document.getElementById('win-modal');
const btnNextLevel = document.getElementById('btn-next-level');
const btnCloseModal = document.getElementById('btn-close-modal');

// Init
function init() {
    // Populate Level Select
    levelSelect.innerHTML = ''; // Clear existing options
    LEVELS.forEach((lvl, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        const difficulty = lvl.mini ? `(最少${lvl.mini}步)` : '';
        option.textContent = `${lvl.name} ${difficulty}`; 
        levelSelect.appendChild(option);
    });

    levelSelect.addEventListener('change', (e) => loadLevel(parseInt(e.target.value)));
    btnReset.addEventListener('click', () => loadLevel(currentLevelIndex));
    btnBack.addEventListener('click', undo);
    btnForward.addEventListener('click', redo);
    btnNextLevel.addEventListener('click', () => {
        closeModal();
        if (currentLevelIndex < LEVELS.length - 1) {
            loadLevel(currentLevelIndex + 1);
        }
    });
    btnCloseModal.addEventListener('click', closeModal);

    // Initial Load
    loadLevel(0);
}

function loadLevel(index) {
    currentLevelIndex = index;
    levelSelect.value = index;
    
    const levelData = LEVELS[index];
    
    if (levelData.board) {
        blocks = parseBoardString(levelData.board);
    } else {
        // Fallback for old format if any (though we replaced all)
        blocks = levelData.blocks.map(b => {
             let w = 1, h = 1;
             if (b.type === '2x2') { w = 2; h = 2; }
             else if (b.type === '1x2') { w = 1; h = 2; }
             else if (b.type === '2x1') { w = 2; h = 1; }
             return { ...b, w, h };
        });
    }

    historyStack = [];
    futureStack = [];
    updateButtons();
    render();
}

function render() {
    boardEl.innerHTML = '';
    blocks.forEach(block => {
        const div = document.createElement('div');
        div.classList.add('block', block.color);
        if (block.h > block.w) div.classList.add('vertical-text');
        
        div.style.width = `calc(${block.w} * var(--unit-size))`;
        div.style.height = `calc(${block.h} * var(--unit-size))`;
        div.style.transform = `translate(${block.x * UNIT}px, ${block.y * UNIT}px)`;
        div.textContent = block.text || '';
        
        // Drag Handling
        div.addEventListener('mousedown', (e) => handleDragStart(e, block));
        div.addEventListener('touchstart', (e) => handleDragStart(e, block), {passive: false});

        boardEl.appendChild(div);
    });
}

// History
function saveState() {
    // Deep copy current blocks
    const state = JSON.stringify(blocks);
    historyStack.push(state);
    futureStack = []; // Clear redo
    updateButtons();
}

function undo() {
    if (historyStack.length === 0) return;
    const currentState = JSON.stringify(blocks);
    futureStack.push(currentState);
    
    const prev = JSON.parse(historyStack.pop());
    blocks = prev;
    render();
    updateButtons();
}

function redo() {
    if (futureStack.length === 0) return;
    const currentState = JSON.stringify(blocks);
    historyStack.push(currentState);
    
    const next = JSON.parse(futureStack.pop());
    blocks = next;
    render();
    updateButtons();
}

function updateButtons() {
    btnBack.disabled = historyStack.length === 0;
    btnForward.disabled = futureStack.length === 0;
}

// Movement Logic
let isDragging = false;
let startX, startY;
let initialBlockX, initialBlockY;
let activeBlock = null;

function handleDragStart(e, block) {
    if (isDragging) return;
    isDragging = true;
    activeBlock = block;
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    startX = clientX;
    startY = clientY;
    initialBlockX = block.x;
    initialBlockY = block.y;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, {passive: false});
    document.addEventListener('touchend', handleDragEnd);
}

function handleDragMove(e) {
    if (!isDragging || !activeBlock) return;
    e.preventDefault(); // Prevent scrolling on touch

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    // Determine primary axis of movement
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (Math.abs(dx) > UNIT / 2) {
            const direction = dx > 0 ? 1 : -1;
            tryMove(activeBlock, direction, 0);
            // Reset drag origin to allow continuous movement
            startX = clientX; 
            startY = clientY;
        }
    } else {
        // Vertical
        if (Math.abs(dy) > UNIT / 2) {
            const direction = dy > 0 ? 1 : -1;
            tryMove(activeBlock, 0, direction);
            startX = clientX;
            startY = clientY;
        }
    }
}

function handleDragEnd() {
    isDragging = false;
    activeBlock = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    
    checkWin();
}

function tryMove(block, dx, dy) {
    const newX = block.x + dx;
    const newY = block.y + dy;
    
    // Boundary Check
    if (newX < 0 || newX + block.w > GRID_W) return;
    if (newY < 0 || newY + block.h > GRID_H) return;
    
    // Collision Check
    // We mask out the 'block' itself from the check
    const collision = blocks.some(other => {
        if (other.id === block.id) return false;
        return rectIntersect(
            {x: newX, y: newY, w: block.w, h: block.h},
            {x: other.x, y: other.y, w: other.w, h: other.h}
        );
    });
    
    if (!collision) {
        saveState(); // Save before move
        block.x = newX;
        block.y = newY;
        render(); // Re-render to update position
    }
}

function rectIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.w || 
             r2.x + r2.w <= r1.x || 
             r2.y >= r1.y + r1.h || 
             r2.y + r2.h <= r1.y);
}

function checkWin() {
    // Standard win: The main (Red 2x2) block is at the bottom-center.
    // In a 4x5 grid (0..3, 0..4), the exit is at x=1, y=3 for a 2x2 block to slide out?
    // Usually the exit is at the bottom edge.
    // For Klotski, the goal is typically to get the 2x2 block to position (1, 3).
    // Because it occupies (1,3) and (2,3) and (1,4) and (2,4).
    
    const main = blocks.find(b => b.id === 'main');
    if (main && main.x === 1 && main.y === 3) {
        setTimeout(() => {
             modal.classList.add('visible');
        }, 200);
    }
}

// End of Script

function closeModal() {
    modal.classList.remove('visible');
}

// Start
init();

function parseBoardString(str) {
    const parsedBlocks = [];
    const visited = new Array(20).fill(false);
    
    // Name Pools
    const vNames = ['張飛', '趙雲', '馬超', '黃忠', '魏延'];
    const hNames = ['關羽', '許褚'];
    let vIndex = 0;
    let hIndex = 0;
    
    // Iterate 4x5 grid
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 4; x++) {
            const i = y * 4 + x;
            if (visited[i]) continue;
            
            const char = str[i];
            if (char === '@') {
                visited[i] = true;
                continue;
            }
            
            // Determine shape
            // Check right
            let hasRight = false;
            if (x < 3) {
                 const iRight = i + 1;
                 if (str[iRight] === char && !visited[iRight]) hasRight = true;
            }
            
            // Check down
            let hasDown = false;
            if (y < 4) {
                const iDown = i + 4;
                if (str[iDown] === char && !visited[iDown]) hasDown = true;
            }
            
            let w = 1, h = 1;
            let type = '';
            let color = '';
            let text = '';
            // id needs to be unique. use char + index
            let id = `block_${char}_${i}`;
            
            if (hasRight && hasDown) {
                // 2x2
                // Verify check diagonal just in case, but usually sufficient
                w = 2; h = 2;
                type = '2x2';
                color = 'red';
                text = '曹操';
                id = 'main';
                
                visited[i] = true;
                visited[i+1] = true;
                visited[i+4] = true;
                visited[i+5] = true;
            } else if (hasRight) {
                // 2x1
                w = 2; h = 1;
                type = '2x1';
                color = 'green';
                text = hNames[hIndex % hNames.length];
                hIndex++;
                
                visited[i] = true;
                visited[i+1] = true;
            } else if (hasDown) {
                // 1x2
                w = 1; h = 2;
                type = '1x2';
                color = 'yellow';
                text = vNames[vIndex % vNames.length];
                vIndex++;
                
                visited[i] = true;
                visited[i+4] = true;
            } else {
                // 1x1
                w = 1; h = 1;
                type = '1x1';
                color = 'blue';
                text = '卒';
                
                visited[i] = true;
            }
            
            parsedBlocks.push({ id, type, x, y, w, h, color, text });
        }
    }
    return parsedBlocks;
}

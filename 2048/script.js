const GRID_SIZE = 4;
const CELL_SIZE = 100;
const CELL_GAP = 15;

const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');

let grid = [];
let score = 0;

const TILE_TYPES = ['細胞', '組織', '器官', '器官系統', '個體', '族群', '群集', '生態系', '生物圈'];

function initializeGame() {
    grid = createGrid();
    addRandomTile();
    addRandomTile();
    renderGrid();
}

function createGrid() {
    return Array.from({ length: GRID_SIZE }, () => 
        Array.from({ length: GRID_SIZE }, () => null)
    );
}

function addRandomTile() {
    const emptyTiles = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j] === null) {
                emptyTiles.push({ x: i, y: j });
            }
        }
    }
    if (emptyTiles.length > 0) {
        const { x, y } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        grid[x][y] = Math.random() < 0.9 ? 0 : 1;  // 90% chance for '細胞', 10% for '組織'
    }
}

function renderGrid() {
    gameBoard.innerHTML = '';
    grid.forEach((row, i) => {
        row.forEach((cell, j) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (cell !== null) {
                tile.textContent = TILE_TYPES[cell];
                tile.classList.add(`tile-${Math.pow(2, cell + 1)}`);
            }
            gameBoard.appendChild(tile);
        });
    });
}

function moveTiles(direction) {
    let moved = false;
    const newGrid = createGrid();

    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
        for (let col = 0; col < GRID_SIZE; col++) {
            let tiles = [];
            for (let row = 0; row < GRID_SIZE; row++) {
                if (grid[row][col] !== null) {
                    tiles.push(grid[row][col]);
                }
            }
            tiles = mergeTiles(tiles, direction === 'ArrowUp');
            let row = direction === 'ArrowUp' ? 0 : GRID_SIZE - 1;
            tiles.forEach(tile => {
                newGrid[row][col] = tile;
                if (direction === 'ArrowUp') row++; else row--;
            });
        }
    } else {
        for (let row = 0; row < GRID_SIZE; row++) {
            let tiles = grid[row].filter(tile => tile !== null);
            tiles = mergeTiles(tiles, direction === 'ArrowLeft');
            let col = direction === 'ArrowLeft' ? 0 : GRID_SIZE - 1;
            tiles.forEach(tile => {
                newGrid[row][col] = tile;
                if (direction === 'ArrowLeft') col++; else col--;
            });
        }
    }

    if (JSON.stringify(grid) !== JSON.stringify(newGrid)) {
        grid = newGrid;
        addRandomTile();
        renderGrid();
        updateScore();
        checkWinCondition();
    }
}

function mergeTiles(tiles, isForward) {
    if (!isForward) tiles.reverse();
    for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i] === tiles[i + 1] && tiles[i] < TILE_TYPES.length - 1) {
            tiles[i]++;
            tiles.splice(i + 1, 1);
            score += Math.pow(2, tiles[i] + 1);
        }
    }
    if (!isForward) tiles.reverse();
    return tiles;
}

function updateScore() {
    scoreElement.textContent = score;
}

function checkWinCondition() {
    if (grid.some(row => row.includes(TILE_TYPES.length - 1))) {
        alert('恭喜你贏了！你已經達到了"生物圈"級別！');
    }
}

// 鍵盤控制
document.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        moveTiles(event.key);
    }
});

// 觸摸控制
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', event => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchend', event => {
    if (!touchStartX || !touchStartY) {
        return;
    }

    let touchEndX = event.changedTouches[0].clientX;
    let touchEndY = event.changedTouches[0].clientY;

    let deltaX = touchEndX - touchStartX;
    let deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑動
        if (deltaX > 0) {
            moveTiles('ArrowRight');
        } else {
            moveTiles('ArrowLeft');
        }
    } else {
        // 垂直滑動
        if (deltaY > 0) {
            moveTiles('ArrowDown');
        } else {
            moveTiles('ArrowUp');
        }
    }

    touchStartX = 0;
    touchStartY = 0;
});

initializeGame();
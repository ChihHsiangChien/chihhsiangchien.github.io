const GRID_SIZE = 5;
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');

document.documentElement.style.setProperty('--grid-size', GRID_SIZE);
gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

let grid = [];
let score = 0;

const TILE_TYPES = ['細胞', '組織', '器官', '器官系統', '個體', '族群', '群集', '生態系', '生物圈'];

//卷軸問題
window.scrollTo(0,0);
window.addEventListener("scroll", (e) => {
    e.preventDefault();
    window.scrollTo(0, 0);
});

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


function renderGrid2(movingTiles = []) {
    gameBoard.innerHTML = ''; // 清空之前的格子
    
    // 獲取 CSS 中的 --tile-size
    const rootStyles = getComputedStyle(document.documentElement);
    const TILE_SIZE = parseFloat(rootStyles.getPropertyValue('--tile-size'));

    // 渲染靜態的 tiles
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            
            if (grid[i][j] !== null) {
                tile.textContent = TILE_TYPES[grid[i][j]];
                tile.classList.add(`tile-${Math.pow(2, grid[i][j] + 1)}`);
            } else {
                tile.classList.add('tile-empty');
            }
            
            // 設置格子的初始位置
            tile.style.top = `${i * TILE_SIZE}px`;
            tile.style.left = `${j * TILE_SIZE}px`;
            
            gameBoard.appendChild(tile);
        }
    }
    /*
    // 渲染滑動的 tiles
    movingTiles.forEach(({ value, fromRow, fromCol, toRow, toCol }) => {
        const tile = document.createElement('div');
        tile.classList.add('tile', `tile-${Math.pow(2, value + 1)}`);
        tile.textContent = TILE_TYPES[value];

        // 設置滑動的初始位置
        tile.style.top = `${fromRow * TILE_SIZE}px`;
        tile.style.left = `${fromCol * TILE_SIZE}px`;
        tile.style.position = 'absolute'; // 必須設定為絕對定位才能實現滑動

        // 添加 tile 並設置動畫效果
        gameBoard.appendChild(tile);

        // 延遲後開始滑動過渡
        setTimeout(() => {
            tile.style.transition = 'top 0.15s ease, left 0.15s ease';
            tile.style.top = `${toRow * TILE_SIZE}px`;
            tile.style.left = `${toCol * TILE_SIZE}px`;
        }, 100);  // 適度的延遲來觸發動畫效果
    });
    */
}



function renderGrid() {
    gameBoard.innerHTML = ''; // 清空之前的格子
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (grid[i][j] !== null) {
                tile.textContent = TILE_TYPES[grid[i][j]];
                tile.classList.add(`tile-${Math.pow(2, grid[i][j] + 1)}`);
                //tile.classList.add('move'); // 添加動畫類
            } else {
                tile.classList.add('tile-empty');
            }
            gameBoard.appendChild(tile);
        }
    }
}

function moveTiles(direction) {
    let moved = false;
    const newGrid = createGrid(); // 建立一個新的網格
    const movingTiles = []; // 儲存正在移動的方塊及其移動資訊
    const isVertical = direction === 'ArrowUp' || direction === 'ArrowDown';
    const isForward = direction === 'ArrowUp' || direction === 'ArrowLeft';

    // 遍歷格子
    for (let i = 0; i < GRID_SIZE; i++) {
        let tiles = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            const row = isVertical ? j : i;
            const col = isVertical ? i : j;
            if (grid[row][col] !== null) {
                tiles.push({
                    value: grid[row][col],
                    originalRow: row,
                    originalCol: col
                });
            }
        }

        tiles = mergeTiles(tiles, isForward); // 合併 tiles，並傳入方向

        let idx = isForward ? 0 : GRID_SIZE - 1;
        tiles.forEach(tile => {
            if (tile !== null) { // 檢查是否為 null
                const row = isVertical ? idx : i;
                const col = isVertical ? i : idx;
                newGrid[row][col] = tile.value;
                movingTiles.push({
                    value: tile.value,
                    fromRow: tile.originalRow,
                    fromCol: tile.originalCol,
                    toRow: row,
                    toCol: col
                });
                idx += isForward ? 1 : -1;
            }
        });
    }

    // 判斷網格是否改變，如果改變則更新
    if (JSON.stringify(grid) !== JSON.stringify(newGrid)) {
        moved = true;
        grid = newGrid;
        renderGrid(movingTiles); // 將正在移動的 tiles 資訊傳遞給 renderGrid 以觸發動畫

        // 等待動畫完成後再添加新 tile
        setTimeout(() => {
            addRandomTile();
            renderGrid();
            updateScore();
            checkWinCondition();
        }, 150); // 與 CSS 動畫持續時間相同
    }

    return moved;
}



function moveTiles2(direction) {
    let moved = false;
    const newGrid = createGrid(); // 建立一個新的網格
    const movingTiles = []; // 儲存正在移動的方塊及其移動資訊

    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
        for (let col = 0; col < GRID_SIZE; col++) {
            let tiles = [];
            for (let row = 0; row < GRID_SIZE; row++) {
                if (grid[row][col] !== null) {
                    tiles.push({ value: grid[row][col], originalRow: row }); // 記錄值和原始行位置
                }
            }
            tiles = mergeTiles(tiles, direction === 'ArrowUp'); // 合併 tiles，並傳入方向            
            // 決定了從哪一行開始放置方塊
            let row = direction === 'ArrowUp' ? 0 : GRID_SIZE - 1;
            tiles.forEach(tile => {
                if (tile !== null) { // 檢查是否為 null
                    newGrid[row][col] = tile.value;
                    movingTiles.push({
                        value: tile.value,
                        fromRow: tile.originalRow,
                        fromCol: col,
                        toRow: row,
                        toCol: col
                    });
                    row += direction === 'ArrowUp' ? 1 : -1;
                }
            });
        }
    } else {
        for (let row = 0; row < GRID_SIZE; row++) {
            let tiles = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col] !== null) {
                    tiles.push({ value: grid[row][col], originalCol: col }); // 記錄值和原始列位置
                }
            }
            tiles = mergeTiles(tiles, direction === 'ArrowLeft'); // 合併 tiles，並傳入方向

            let col = direction === 'ArrowLeft' ? 0 : GRID_SIZE - 1;
            tiles.forEach(tile => {
                if (tile !== null) { // 檢查是否為 null
                    newGrid[row][col] = tile.value;
                    movingTiles.push({
                        value: tile.value,
                        fromRow: row,
                        fromCol: tile.originalCol,
                        toRow: row,
                        toCol: col
                    });
                    col += direction === 'ArrowLeft' ? 1 : -1;
                }
            });
        }
    }

    // 判斷網格是否改變，如果改變則更新
    if (JSON.stringify(grid) !== JSON.stringify(newGrid)) {
        moved = true;
        grid = newGrid;
        renderGrid(movingTiles); // 將正在移動的 tiles 資訊傳遞給 renderGrid 以觸發動畫

        // 等待動畫完成後再添加新 tile
        setTimeout(() => {
            addRandomTile();
            renderGrid();
            updateScore();
            checkWinCondition();
        }, 150); // 與 CSS 動畫持續時間相同
    }

    return moved;
}


function mergeTiles(tiles, isForward) { 
    const originalTiles = [...tiles];
    let workingTiles = [...tiles];

    if (!isForward) workingTiles.reverse();
    
    const mergedTiles = [];
    let i = 0;
    while (i < workingTiles.length) {
        if (i + 1 < workingTiles.length && workingTiles[i].value === workingTiles[i + 1].value) {
            mergedTiles.push({ value: workingTiles[i].value + 1, originalRow: workingTiles[i].originalRow, originalCol: workingTiles[i].originalCol });
            i += 2;
        } else {
            mergedTiles.push(workingTiles[i]);
            i++;
        }
    }

    while (mergedTiles.length < GRID_SIZE) {
        mergedTiles.push(null);
    }

    if (!isForward) mergedTiles.reverse();

    const hasChanged = mergedTiles.some((tile, index) => {
        const originalTile = originalTiles[index];
        return originalTile === null ? tile !== null : tile === null || tile.value !== originalTile.value;
    });

    return hasChanged ? mergedTiles : originalTiles;
}


function mergeTiles1(tiles, isForward) { 
    const originalTiles = [...tiles]; // 複製原始的 tiles 用於比較

    if (!isForward) tiles.reverse(); // 如果是反向（向下或向右移動），則需要先反轉陣列
    
    const mergedTiles = [];
    let i = 0;
    while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
            // 合併相同值的 tiles
            mergedTiles.push({ value: tiles[i].value + 1, originalRow: tiles[i].originalRow, originalCol: tiles[i].originalCol });
            i += 2; // 跳過被合併的下一個 tile
        } else {
            mergedTiles.push(tiles[i]);
            i++;
        }
    }

    // 填充空位
    while (mergedTiles.length < GRID_SIZE) {
        mergedTiles.push(null); // 在結尾處填充 null 代表空格子
    }

    if (!isForward) mergedTiles.reverse(); // 如果是反向，則再次反轉回來

    // 檢查合併後的結果是否與原始 tiles 相同
    const hasChanged = mergedTiles.some((tile, index) => {
        const originalTile = originalTiles[index];
        return originalTile === null ? tile !== null : tile === null || tile.value !== originalTile.value;
    });

    // 如果沒有改變，返回原始的 tiles
    return hasChanged ? mergedTiles : originalTiles;
}


function mergeTiles2(tiles, isForward) {
    if (!isForward) tiles.reverse(); // 如果是反向（向下或向右移動），則需要先反轉陣列
    
    const mergedTiles = [];
    let i = 0;
    while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
            // 合併相同值的 tiles
            mergedTiles.push({ value: tiles[i].value + 1, originalRow: tiles[i].originalRow, originalCol: tiles[i].originalCol });
            i += 2; // 跳過被合併的下一個 tile
        } else {
            mergedTiles.push(tiles[i]);
            i++;
        }
    }

    // 填充空位
    while (mergedTiles.length < GRID_SIZE) {
        mergedTiles.push(null); // 在結尾處填充 null 代表空格子
    }

    if (!isForward) mergedTiles.reverse(); // 如果是反向，則再次反轉回來
    
    return mergedTiles;
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
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            moveTiles('ArrowRight');
        } else {
            moveTiles('ArrowLeft');
        }
    } else {
        if (diffY > 0) {
            moveTiles('ArrowDown');
        } else {
            moveTiles('ArrowUp');
        }
    }
});

// 初始化遊戲
initializeGame();
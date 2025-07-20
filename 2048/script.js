const GRID_SIZE = 4;
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');

document.documentElement.style.setProperty('--grid-size', GRID_SIZE);
gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

let grid = [];
let score = 0;

const TILE_TYPES = ['細胞', '組織', '器官', '器官系統', '個體', 
                    '族群', '群集', '生態系', '生物圈', '地球','太陽系','宇宙','虛空'];

//卷軸問題
window.scrollTo(0,0);
window.addEventListener("scroll", (e) => {
    e.preventDefault();
    window.scrollTo(0, 0);
});

function initializeGame() {
    grid = createGrid();
    addRandomTile();
    //addRandomTile();
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
        //grid[x][y] = Math.random() < 0.9 ? 0 : 1;  // 90% chance for '細胞', 10% for '組織'
        grid[x][y] = 0;  // 100% '細胞'
    }
}


function renderGrid({ movingTiles = [], merged = [] } = {}) {

    // 遍歷 movingTiles，給 tile 添加移動動畫
    if (movingTiles.length === 0){

        gameBoard.innerHTML = ''; // 清空之前的格子

        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
    
                if (grid[i][j] !== null) {
                    // 檢查ij有沒有在merged，有的話需要產生特效
                    merged.forEach(m=>{
                        if(i === m.Row & j === m.Col){
                            // 
                            tile.style.transition = 'transform 0.1s';
                            tile.style.transform = 'scale(1.05)';

                            // 在 0.1 秒后恢复到原来的尺寸
                            setTimeout(() => {
                                tile.style.transform = 'scale(1)';
                            }, 100);  // 100 毫秒后执行
                        };
                    });
                    tile.textContent = TILE_TYPES[grid[i][j]];
                    tile.classList.add(`tile-${Math.pow(2, grid[i][j] + 1)}`);                    
                } else {
                    tile.classList.add('tile-empty');
                }
                gameBoard.appendChild(tile);
            }
        }
    }


    else{
        /*根據movingTiles的內容value, fromCol, toCol, fromRow, toRow
        從gameBoard中找到child，移動child到特定的位置
        */        
        movingTiles.forEach(movingTile => {
            const fromTile = gameBoard.children[movingTile.fromRow * GRID_SIZE + movingTile.fromCol];
            const toTile = gameBoard.children[movingTile.toRow * GRID_SIZE + movingTile.toCol];
    
            const fromTileRect = fromTile.getBoundingClientRect();
            const toTileRect = toTile.getBoundingClientRect();
    
            let translateX = toTileRect.left - fromTileRect.left;
            let translateY = toTileRect.top - fromTileRect.top;
    
            fromTile.style.transform = `translate(${translateX}px, ${translateY}px)`;
            fromTile.style.transition = 'transform 0.2s ease-in-out, opacity 0.2s ease-in-out'; 
        });
    }

}


function moveTiles(direction) {
    const newGrid = createGrid(); // 建立一個新的網格
    const movingTiles = []; // 儲存正在移動的方塊及其移動資訊
    let merged = []; //產生合併的方塊位置

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

        let results = mergeTiles(tiles, isForward); // 合併 tiles，並傳入方向
        tiles  = results[0];

        // 產生合併的位置
        results[1].forEach(m =>{
            merged.push(m);
        });
        
        

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
        grid = newGrid;
        renderGrid({movingTiles: movingTiles}); // 將正在移動的 tiles 資訊傳遞給 renderGrid 以觸發動畫

        // 等待動畫完成後再添加新 tile
        setTimeout(() => {
            addRandomTile();
            renderGrid({merged: merged});
            updateScore();
            checkWinCondition();
        }, 200); // 與 CSS 動畫持續時間相同
    }

}



function mergeTiles(tiles, isForward) {
    if (!isForward) tiles.reverse(); // 如果是反向（向下或向右移動），則需要先反轉陣列
    const merged = []; //紀錄被合併的方塊位置
    const mergedTiles = [];
    let i = 0;
    while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
            // 合併相同值的 tiles
            score += (tiles[i].value + 1) * 100;
            mergedTiles.push({ value: tiles[i].value + 1, originalRow: tiles[i].originalRow, originalCol: tiles[i].originalCol });
            merged.push({ Row: tiles[i].originalRow, Col: tiles[i].originalCol });
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

    //if (!isForward) mergedTiles.reverse(); // 如果是反向，則再次反轉回來
    
    return [mergedTiles, merged];
    
}


function updateScore() {
    scoreElement.textContent = score;
}

function checkWinCondition() {
    if (grid.some(row => row.includes(TILE_TYPES.length - 1))) {
        alert('恭喜你贏了！你已經達到了最頂級！');
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
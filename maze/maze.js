// 迷宮遊戲邏輯

class MazeGame {
    constructor(rows = 39, cols = 39) {
        this.rows = rows;
        this.cols = cols;
        this.maze = [];
        this.visited = [];
        this.playerPos = { x: 1, y: 1 };
        this.foodPos = { x: cols - 2, y: 1 };
        this.timeArray = [];
        this.startTime = 0;
        
        // 視口設置 - 玩家周圍 21x21 的網格
        this.viewportSize = 21;
        
        // 根據視口大小自動計算格子大小，保持總畫面大小約 465px
        const targetSize = 465;
        this.cellSize = Math.floor(targetSize / this.viewportSize);
        
        this.viewportX = 0;
        this.viewportY = 0;
        
        this.initGame();
    }

    initGame() {
        this.maze = this.generateMaze(this.rows, this.cols);
        this.randomizeStartPositions();
        this.render();
    }

    // 初始化迷宮 - 所有格子都是牆 (0)
    initializeMaze(rows, cols) {
        let maze = [];
        for (let i = 0; i < rows; i++) {
            let row = [];
            for (let j = 0; j < cols; j++) {
                row.push(0); // 0 代表牆
            }
            maze.push(row);
        }
        return maze;
    }

    // 創建訪問記錄陣列
    createVisitedArray(rows, cols) {
        let visited = [];
        for (let i = 0; i < rows; i++) {
            let row = [];
            for (let j = 0; j < cols; j++) {
                row.push(0); // 0 代表未訪問
            }
            visited.push(row);
        }
        return visited;
    }

    // 判斷當前格子是否有路可走
    ifHasRoute(x, y, maze, visited, nr, nc) {
        let directions = [];
        
        // 檢查四個方向（間隔2格以形成走廊）
        if (x - 2 > 0 && !visited[y][x - 2]) {
            directions.push([-1, 0]); // 左
        }
        if (x + 2 < nc && !visited[y][x + 2]) {
            directions.push([1, 0]); // 右
        }
        if (y - 2 > 0 && !visited[y - 2][x]) {
            directions.push([0, -1]); // 上
        }
        if (y + 2 < nr && !visited[y + 2][x]) {
            directions.push([0, 1]); // 下
        }

        if (directions.length > 0) {
            // 隨機返回一個可走的方向
            return directions[Math.floor(Math.random() * directions.length)];
        } else {
            return [0, 0]; // 沒有可走的路
        }
    }

    // DFS 生成迷宮
    dfsMaze(maze, visited, nr, nc) {
        let route = [];

        // 隨機選擇起始位置（奇數座標）
        let x = Math.floor(Math.random() * Math.floor((nc - 1) / 2)) * 2 + 1;
        let y = Math.floor(Math.random() * Math.floor((nr - 1) / 2)) * 2 + 1;

        route.push([x, y]);
        visited[y][x] = 1;
        maze[y][x] = 1; // 設置起始點為路徑

        let way = this.ifHasRoute(x, y, maze, visited, nr, nc);

        while (route.length > 0) {
            if (way[0] === 0 && way[1] === 0) {
                // 無路可走則回退
                route.pop();
                if (route.length > 0) {
                    x = route[route.length - 1][0];
                    y = route[route.length - 1][1];
                    way = this.ifHasRoute(x, y, maze, visited, nr, nc);
                }
            } else {
                // 拆除牆並移動
                maze[y + way[1]][x + way[0]] = 1; // 打開牆
                x = x + 2 * way[0];
                y = y + 2 * way[1];

                maze[y][x] = 1; // 新的格子成為路徑
                visited[y][x] = 1;
                route.push([x, y]);
                way = this.ifHasRoute(x, y, maze, visited, nr, nc);
            }
        }
    }

    // 隨機打開牆，形成額外的路徑
    openRandomWall(maze, nr, nc) {
        let x = Math.floor(Math.random() * Math.floor((nc - 1) / 2)) * 2 + 1;
        let y = Math.floor(Math.random() * Math.floor((nr - 1) / 2)) * 2 + 1;

        let possibleDirections = [];
        if (x - 2 > 0 && maze[y][x - 1] === 0) {
            possibleDirections.push([-1, 0]); // 左邊
        }
        if (x + 2 < nc && maze[y][x + 1] === 0) {
            possibleDirections.push([1, 0]); // 右邊
        }
        if (y - 2 > 0 && maze[y - 1][x] === 0) {
            possibleDirections.push([0, -1]); // 上邊
        }
        if (y + 2 < nr && maze[y + 1][x] === 0) {
            possibleDirections.push([0, 1]); // 下邊
        }

        if (possibleDirections.length > 0) {
            let direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
            maze[y + direction[1]][x + direction[0]] = 1; // 打開牆
        }
    }

    // 生成迷宮
    generateMaze(nr, nc) {
        let maze = this.initializeMaze(nr, nc);
        let visited = this.createVisitedArray(nr, nc);

        // 使用DFS生成迷宮
        this.dfsMaze(maze, visited, nr, nc);

        // 打開額外的牆以創建多條路徑
        let additionalPaths = Math.floor((nr / 10) * (nc / 10));
        for (let i = 0; i < additionalPaths; i++) {
            this.openRandomWall(maze, nr, nc);
        }

        return maze;
    }

    // 隨機化起始位置和終點位置
    randomizeStartPositions() {
        // 隨機選擇起始位置（左邊）
        let startY = Math.floor(Math.random() * Math.floor((this.rows - 1) / 2)) * 2 + 1;
        this.playerPos = { x: 1, y: startY };

        // 隨機選擇終點位置（右邊）
        let endY = Math.floor(Math.random() * Math.floor((this.rows - 1) / 2)) * 2 + 1;
        this.foodPos = { x: this.cols - 2, y: endY };
        
        // 更新視口以跟隨玩家
        this.updateViewport();
    }

    // 更新視口位置以跟隨玩家
    updateViewport() {
        const halfViewport = Math.floor(this.viewportSize / 2);
        
        // 計算視口應該以玩家為中心
        this.viewportX = this.playerPos.x - halfViewport;
        this.viewportY = this.playerPos.y - halfViewport;
        
        // 限制視口邊界
        if (this.viewportX < 0) this.viewportX = 0;
        if (this.viewportY < 0) this.viewportY = 0;
        if (this.viewportX + this.viewportSize > this.cols) {
            this.viewportX = this.cols - this.viewportSize;
        }
        if (this.viewportY + this.viewportSize > this.rows) {
            this.viewportY = this.rows - this.viewportSize;
        }
    }

    // 檢查座標是否在視口內
    isInViewport(x, y) {
        return x >= this.viewportX && x < this.viewportX + this.viewportSize &&
               y >= this.viewportY && y < this.viewportY + this.viewportSize;
    }

    // 渲染迷宮
    render() {
        const container = document.getElementById('maze-container');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${this.viewportSize}, ${this.cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${this.viewportSize}, ${this.cellSize}px)`;

        // 只渲染視口內的區域
        for (let viewY = 0; viewY < this.viewportSize; viewY++) {
            for (let viewX = 0; viewX < this.viewportSize; viewX++) {
                const x = this.viewportX + viewX;
                const y = this.viewportY + viewY;

                const cell = document.createElement('div');
                cell.className = 'maze-cell';
                cell.id = `cell-${x}-${y}`;

                // 檢查邊界
                if (x >= this.cols || y >= this.rows) {
                    cell.classList.add('wall');
                } else if (this.maze[y][x] === 0) {
                    cell.classList.add('wall');
                } else {
                    cell.classList.add('path');
                }

                // 添加玩家
                if (x === this.playerPos.x && y === this.playerPos.y) {
                    cell.classList.add('player');
                }

                // 添加食物（目標）
                if (x === this.foodPos.x && y === this.foodPos.y) {
                    cell.classList.add('food');
                }

                container.appendChild(cell);
            }
        }
    }

    // 檢查位置是否可以移動
    canMoveTo(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return false;
        }
        return this.maze[y][x] === 1; // 1 代表可以走的路
    }

    // 移動玩家
    movePlayer(dx, dy) {
        const newX = this.playerPos.x + dx;
        const newY = this.playerPos.y + dy;

        if (this.canMoveTo(newX, newY)) {
            this.playerPos.x = newX;
            this.playerPos.y = newY;

            // 更新視口以跟隨玩家
            this.updateViewport();

            // 檢查是否到達目標
            if (this.playerPos.x === this.foodPos.x && this.playerPos.y === this.foodPos.y) {
                this.onReachFood();
            } else {
                this.render();
            }
        }
    }

    // 到達食物（終點）
    onReachFood() {
        const endTime = Date.now();
        const elapsed = (endTime - this.startTime) / 1000;
        this.timeArray.push(elapsed);

        // 更新統計信息
        this.updateStats();

        // 重新開始
        this.randomizeStartPositions();
        this.startTime = Date.now();
        this.render();
    }

    // 更新統計信息
    updateStats() {
        const recordsDiv = document.getElementById('time-records');
        let html = '';

        for (let i = 0; i < this.timeArray.length; i++) {
            const time = this.timeArray[i].toFixed(2);
            html += `<div class="time-record-item"><span class="number">${i + 1}</span> -> <span class="time">${time}s</span></div>`;
        }

        recordsDiv.innerHTML = html;
    }

    // 重新開始遊戲
    restart() {
        this.maze = [];
        this.visited = [];
        this.timeArray = [];
        this.initGame();
        this.startTime = Date.now();
        this.updateStats();
    }
}

// 全局遊戲實例
let game = null;

// 初始化遊戲
function initGame() {
    game = new MazeGame(39, 39);
    game.startTime = Date.now();
}

// 鍵盤控制
document.addEventListener('keydown', (e) => {
    if (!game) return;

    switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            e.preventDefault();
            game.movePlayer(0, -1);
            break;
        case 'arrowdown':
        case 's':
            e.preventDefault();
            game.movePlayer(0, 1);
            break;
        case 'arrowleft':
        case 'a':
            e.preventDefault();
            game.movePlayer(-1, 0);
            break;
        case 'arrowright':
        case 'd':
            e.preventDefault();
            game.movePlayer(1, 0);
            break;
    }
});

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', () => {
    initGame();

    // 虛擬按鈕控制（触摸设备）
    document.querySelectorAll('.btn-arrow').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!game) return;
            
            const direction = btn.getAttribute('data-direction');
            switch (direction) {
                case 'up':
                    game.movePlayer(0, -1);
                    break;
                case 'down':
                    game.movePlayer(0, 1);
                    break;
                case 'left':
                    game.movePlayer(-1, 0);
                    break;
                case 'right':
                    game.movePlayer(1, 0);
                    break;
            }
        });

        // 觸摸長按支持（持續移動）
        let repeatInterval = null;
        
        btn.addEventListener('touchstart', () => {
            const direction = btn.getAttribute('data-direction');
            if (!game) return;

            // 立即移動一次
            switch (direction) {
                case 'up':
                    game.movePlayer(0, -1);
                    break;
                case 'down':
                    game.movePlayer(0, 1);
                    break;
                case 'left':
                    game.movePlayer(-1, 0);
                    break;
                case 'right':
                    game.movePlayer(1, 0);
                    break;
            }

            // 設置重複移動
            repeatInterval = setInterval(() => {
                if (!game) return;
                switch (direction) {
                    case 'up':
                        game.movePlayer(0, -1);
                        break;
                    case 'down':
                        game.movePlayer(0, 1);
                        break;
                    case 'left':
                        game.movePlayer(-1, 0);
                        break;
                    case 'right':
                        game.movePlayer(1, 0);
                        break;
                }
            }, 150);
        });

        btn.addEventListener('touchend', () => {
            if (repeatInterval) {
                clearInterval(repeatInterval);
                repeatInterval = null;
            }
        });

        btn.addEventListener('mouseleave', () => {
            if (repeatInterval) {
                clearInterval(repeatInterval);
                repeatInterval = null;
            }
        });
    });

    // 新遊戲按鈕
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (game) {
                game.restart();
            }
        });
    }
});

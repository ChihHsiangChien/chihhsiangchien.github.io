// 3D迷宮遊戲邏輯

// 基於種子的隨機數生成器
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
}

class Maze3D {
    constructor(width = 21, height = 21, cellSize = 1, seed = null) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.rng = new SeededRandom(this.seed);
        this.maze = [];
        this.visited = [];
        this.playerPos = { x: 1, y: 0, z: 1 };
        this.foodPos = { x: width - 2, y: 0, z: 1 };
        this.initialPlayerPos = { ...this.playerPos };
        this.initialFoodPos = { ...this.foodPos };
        this.timeArray = [];
        this.startTime = 0;

        // Three.js 相關
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.maze3D = null;
        this.player = null;
        this.food = null;
        this.walls = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 控制相關
        this.keys = {};
        this.moveSpeed = 0.1;
        this.cameraHeight = 0.8; // 降低視角高度
        this.cameraRotation = 0; // 相機旋轉角度（弧度）
        this.targetRotation = 0; // 目標旋轉角度
        this.isMoving = false; // 是否正在移動中
        this.startPos = null; // 起始位置
        this.targetPos = null; // 目標位置
        this.moveProgress = 0; // 移動進度
        this.isPaused = false; // 完成對話框暫停狀態
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragPointerId = null;
        this.elapsedEl = document.getElementById('elapsed-time');

        this.init();
    }

    init() {
        this.createScene();
        this.generateMaze(this.width, this.height);
        this.randomizeStartPositions();
        this.createMaze3D();
        this.createPlayer();
        this.createFood();
        this.setupControls();
        this.isPaused = false;
        this.startTime = Date.now();
        this.updateElapsedTime(0);
        this.animate();
    }

    createScene() {
        // 創建場景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        this.scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);

        // 創建相機
        const canvas = document.getElementById('canvas-container');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.updateCameraPosition();

        // 創建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        canvas.appendChild(this.renderer.domElement);

        // 添加光源 - 增加亮度以便看清迷宫
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(20, 40, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 100;
        this.scene.add(directionalLight);

        // 添加点光源增加亮度
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);

        // 添加地面（带纹理）
        const groundGeometry = new THREE.PlaneGeometry(this.width * this.cellSize, this.height * this.cellSize);
        const groundTexture = this.createGroundTexture();
        const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.01;
        this.scene.add(ground);
    }

    generateMaze(width, height) {
        // 初始化迷宮
        this.maze = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(0); // 0 代表牆
            }
            this.maze.push(row);
        }

        // 初始化訪問陣列
        this.visited = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(0);
            }
            this.visited.push(row);
        }

        // 使用DFS生成迷宮
        this.dfsMaze(width, height);

        // 打開額外的牆
        const additionalPaths = Math.floor((height / 10) * (width / 10));
        for (let i = 0; i < additionalPaths; i++) {
            this.openRandomWall();
        }
    }

    dfsMaze(nr, nc) {
        const route = [];
        let x = Math.floor(this.rng.random() * Math.floor((nc - 1) / 2)) * 2 + 1;
        let y = Math.floor(this.rng.random() * Math.floor((nr - 1) / 2)) * 2 + 1;

        route.push([x, y]);
        this.visited[y][x] = 1;
        this.maze[y][x] = 1;

        while (route.length > 0) {
            const directions = [];

            if (x - 2 > 0 && !this.visited[y][x - 2]) directions.push([-1, 0]);
            if (x + 2 < nc && !this.visited[y][x + 2]) directions.push([1, 0]);
            if (y - 2 > 0 && !this.visited[y - 2][x]) directions.push([0, -1]);
            if (y + 2 < nr && !this.visited[y + 2][x]) directions.push([0, 1]);

            if (directions.length > 0) {
                const direction = directions[Math.floor(this.rng.random() * directions.length)];
                this.maze[y + direction[1]][x + direction[0]] = 1;
                x += 2 * direction[0];
                y += 2 * direction[1];
                this.maze[y][x] = 1;
                this.visited[y][x] = 1;
                route.push([x, y]);
            } else {
                route.pop();
                if (route.length > 0) {
                    const last = route[route.length - 1];
                    x = last[0];
                    y = last[1];
                }
            }
        }
    }

    openRandomWall() {
        const x = Math.floor(this.rng.random() * Math.floor((this.width - 1) / 2)) * 2 + 1;
        const y = Math.floor(this.rng.random() * Math.floor((this.height - 1) / 2)) * 2 + 1;

        const directions = [];
        if (x - 2 > 0) directions.push([-1, 0]);
        if (x + 2 < this.width) directions.push([1, 0]);
        if (y - 2 > 0) directions.push([0, -1]);
        if (y + 2 < this.height) directions.push([0, 1]);

        if (directions.length > 0) {
            const direction = directions[Math.floor(this.rng.random() * directions.length)];
            this.maze[y + direction[1]][x + direction[0]] = 1;
        }
    }

    // 創建地面紋理（石板）
    createGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 石板背景
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 石板網格
        const tileSize = 64;
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 3;
        for (let y = 0; y <= canvas.height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        for (let x = 0; x <= canvas.width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // 石板紋理（雜訊）
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 30;
            data[i] += noise;     // R
            data[i + 1] += noise; // G
            data[i + 2] += noise; // B
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    // 創建木紋牆紋理
    createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 木紋背景
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 木紋線條
        ctx.strokeStyle = '#6b4f0d';
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 4) {
            const offset = Math.sin(y * 0.05) * 20;
            ctx.beginPath();
            ctx.moveTo(0 + offset, y);
            ctx.lineTo(canvas.width + offset, y);
            ctx.stroke();
        }

        // 加入雜點
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.05) {
                data[i] += Math.random() * 40 - 20;     // R
                data[i + 1] += Math.random() * 40 - 20; // G
                data[i + 2] += Math.random() * 40 - 20; // B
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    // 創建石頭牆紋理
    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 石頭背景
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 隨機岩石塊
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 30 + 10;
            ctx.fillStyle = `rgba(100, 100, 100, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 邊界線
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    // 創建磚牆紋理
    createBrickTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 背景顏色
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 磚塊大小
        const brickWidth = 64;
        const brickHeight = 32;

        // 繪製磚牆圖案
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 2;

        for (let y = 0; y < canvas.height; y += brickHeight) {
            const offsetX = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
            for (let x = -brickWidth / 2; x < canvas.width; x += brickWidth) {
                ctx.strokeRect(x + offsetX, y, brickWidth, brickHeight);
            }
        }

        // 添加陰影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < canvas.height; y += brickHeight) {
            const offsetX = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
            for (let x = -brickWidth / 2; x < canvas.width; x += brickWidth) {
                ctx.fillRect(x + offsetX + 2, y + 2, brickWidth - 4, brickHeight - 4);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    createMaze3D() {
        // 移除舊的牆
        this.walls.forEach(wall => this.scene.remove(wall));
        this.walls = [];

        // 創建牆
        const wallGeometry = new THREE.BoxGeometry(this.cellSize, 2, this.cellSize);
        const brickTexture = this.createBrickTexture();
        const woodTexture = this.createWoodTexture();
        const stoneTexture = this.createStoneTexture();

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.maze[z][x] === 0) {
                    // 根據位置選擇不同的紋理
                    let wallTexture;
                    const region = (x + z) % 3; // 分區方式
                    if (region === 0) {
                        wallTexture = brickTexture;
                    } else if (region === 1) {
                        wallTexture = woodTexture;
                    } else {
                        wallTexture = stoneTexture;
                    }
                    
                    // 為每個面使用不同材質或顏色
                    const materials = [
                        new THREE.MeshLambertMaterial({ map: wallTexture.clone() }), // 右面
                        new THREE.MeshLambertMaterial({ map: wallTexture.clone() }), // 左面
                        new THREE.MeshLambertMaterial({ color: 0x5a5a5a }), // 頂面
                        new THREE.MeshLambertMaterial({ color: 0x3a3a3a }), // 底面
                        new THREE.MeshLambertMaterial({ map: wallTexture.clone() }), // 前面
                        new THREE.MeshLambertMaterial({ map: wallTexture.clone() })  // 背面
                    ];
                    
                    const wall = new THREE.Mesh(wallGeometry, materials);
                    wall.position.set(x * this.cellSize - (this.width * this.cellSize) / 2, 1, z * this.cellSize - (this.height * this.cellSize) / 2);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.walls.push(wall);
                }
            }
        }
    }

    createPlayer() {
        if (this.player) {
            this.scene.remove(this.player);
        }

        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0x667eea });
        this.player = new THREE.Mesh(geometry, material);
        this.player.castShadow = true;
        this.player.receiveShadow = true;
        this.updatePlayerPosition();
        this.scene.add(this.player);
    }

    createFood() {
        if (this.food) {
            this.scene.remove(this.food);
        }

        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
        this.food = new THREE.Mesh(geometry, material);
        this.food.castShadow = true;
        this.food.receiveShadow = true;
        this.updateFoodPosition();
        this.scene.add(this.food);
    }

    updatePlayerPosition() {
        if (!this.player) return; // 玩家尚未建立時跳過
        // 如果正在移動，使用插值計算當前位置
        let currentX = this.playerPos.x;
        let currentZ = this.playerPos.z;
        
        if (this.isMoving && this.targetPos && this.startPos) {
            currentX = this.startPos.x + (this.targetPos.x - this.startPos.x) * this.moveProgress;
            currentZ = this.startPos.z + (this.targetPos.z - this.startPos.z) * this.moveProgress;
        }
        
        const x = currentX * this.cellSize - (this.width * this.cellSize) / 2;
        const y = this.cameraHeight;
        const z = currentZ * this.cellSize - (this.height * this.cellSize) / 2;
        this.player.position.set(x, y, z);
    }

    updateFoodPosition() {
        if (!this.food) return; // 食物尚未建立時跳過
        const x = this.foodPos.x * this.cellSize - (this.width * this.cellSize) / 2;
        const y = 0.5;
        const z = this.foodPos.z * this.cellSize - (this.height * this.cellSize) / 2;
        this.food.position.set(x, y, z);
    }

    updateCameraPosition() {
        // 如果正在移動，使用插值計算當前位置
        let currentX = this.playerPos.x;
        let currentZ = this.playerPos.z;
        
        if (this.isMoving && this.targetPos && this.startPos) {
            currentX = this.startPos.x + (this.targetPos.x - this.startPos.x) * this.moveProgress;
            currentZ = this.startPos.z + (this.targetPos.z - this.startPos.z) * this.moveProgress;
        }
        
        const x = currentX * this.cellSize - (this.width * this.cellSize) / 2;
        const y = this.cameraHeight;
        const z = currentZ * this.cellSize - (this.height * this.cellSize) / 2;
        this.camera.position.set(x, y, z);
        
        // 根據玩家方向調整相機朝向
        const lookX = x + Math.sin(this.cameraRotation) * 10;
        const lookZ = z + Math.cos(this.cameraRotation) * 10;
        this.camera.lookAt(lookX, y - 0.2, lookZ);
    }

    canMoveTo(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return false;
        }
        return this.maze[z][x] === 1;
    }

    movePlayer(forward) {
        // 如果正在移動中，不接受新的移動指令
        if (this.isMoving) return;
        
        // 根據角色朝向方向移動
        const angle = this.cameraRotation;
        
        // 計算前進方向
        const dx = Math.sin(angle) * forward;
        const dz = Math.cos(angle) * forward;
        
        // 四舍五入到最近的整数
        const stepX = Math.round(dx);
        const stepZ = Math.round(dz);
        
        const newX = this.playerPos.x + stepX;
        const newZ = this.playerPos.z + stepZ;

        if (this.canMoveTo(newX, newZ)) {
            // 保存起始位置和目標位置
            this.startPos = { x: this.playerPos.x, z: this.playerPos.z };
            this.targetPos = { x: newX, z: newZ };
            this.moveProgress = 0;
            this.isMoving = true;
        }
    }

    rotatePlayer(direction) {
        // 旋轉角色朝向（左轉為負，右轉為正）- 每次15度
        this.targetRotation = this.cameraRotation - direction * (Math.PI / 12);
    }

    onReachFood() {
        const endTime = Date.now();
        const elapsed = (endTime - this.startTime) / 1000;
        this.timeArray.push(elapsed);
        this.updateStats();
        this.isPaused = true;
        this.updateElapsedTime(elapsed);
        this.showCompletionDialog(elapsed);
    }

    showCompletionDialog(elapsed) {
        const dialog = document.getElementById('completion-dialog');
        const timeDisplay = document.getElementById('completion-time');
        timeDisplay.textContent = elapsed.toFixed(2);
        dialog.style.display = 'flex';
    }

    hideCompletionDialog() {
        const dialog = document.getElementById('completion-dialog');
        dialog.style.display = 'none';
    }

    continueGame() {
        this.hideCompletionDialog();
        this.resetToInitialPositions();
        this.isPaused = false;
        this.startTime = Date.now();
        this.updateElapsedTime(0);
    }

    resetToInitialPositions() {
        this.playerPos = { ...this.initialPlayerPos };
        this.foodPos = { ...this.initialFoodPos };
        this.updatePlayerPosition();
        this.updateFoodPosition();
        this.updateCameraPosition();
    }

    randomizeStartPositions() {
        const startZ = Math.floor(this.rng.random() * Math.floor((this.height - 1) / 2)) * 2 + 1;
        this.playerPos = { x: 1, y: 0, z: startZ };

        const endZ = Math.floor(this.rng.random() * Math.floor((this.height - 1) / 2)) * 2 + 1;
        this.foodPos = { x: this.width - 2, y: 0, z: endZ };

        this.initialPlayerPos = { ...this.playerPos };
        this.initialFoodPos = { ...this.foodPos };

        this.updatePlayerPosition();
        this.updateFoodPosition();
        this.updateCameraPosition();
    }

    updateStats() {
        const recordsDiv = document.getElementById('time-records');
        let html = `<div style="color: #999; margin-bottom: 10px;">種子: ${this.seed}</div>`;

        for (let i = 0; i < this.timeArray.length; i++) {
            const time = this.timeArray[i].toFixed(2);
            html += `<div class="time-record-item"><span class="number">${i + 1}</span> -> <span class="time">${time}s</span></div>`;
        }

        recordsDiv.innerHTML = html;
    }

    restart(newSeed = null) {
        this.playerPos = { x: 1, y: 0, z: 1 };
        this.foodPos = { x: this.width - 2, y: 0, z: 1 };
        this.timeArray = [];
        
        // 若未指定種子，為新遊戲生成一個新種子
        this.seed = (newSeed !== null) ? newSeed : Math.floor(Math.random() * 1000000);
        this.rng = new SeededRandom(this.seed);
        const seedInput = document.getElementById('seedInput');
        if (seedInput) seedInput.value = this.seed;
        
        this.hideCompletionDialog();
        this.generateMaze(this.width, this.height);
        this.randomizeStartPositions();
        this.createMaze3D();
        this.isPaused = false;
        this.startTime = Date.now();
        this.updateElapsedTime(0);
        this.updateStats();
    }

    setupControls() {
        // 鍵盤控制
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    this.movePlayer(1); // 前進
                    break;
                case 'arrowdown':
                case 's':
                    e.preventDefault();
                    this.movePlayer(-1); // 後退
                    break;
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    this.rotatePlayer(-1); // 左轉
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    this.rotatePlayer(1); // 右轉
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // 虛擬按鈕控制
        document.querySelectorAll('.btn-arrow').forEach(btn => {
            btn.addEventListener('click', () => {
                const direction = btn.getAttribute('data-direction');
                switch (direction) {
                    case 'up':
                        this.movePlayer(1); // 前進
                        break;
                    case 'down':
                        this.movePlayer(-1); // 後退
                        break;
                    case 'left':
                        this.rotatePlayer(-1); // 左轉
                        break;
                    case 'right':
                        this.rotatePlayer(1); // 右轉
                        break;
                }
            });
        });

        // 新遊戲按鈕
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.restart();
            });
        }

        // 生成迷宮按鈕
        const generateBtn = document.getElementById('generateBtn');
        const seedInput = document.getElementById('seedInput');
        if (generateBtn && seedInput) {
            generateBtn.addEventListener('click', () => {
                const seed = parseInt(seedInput.value);
                if (!isNaN(seed)) {
                    this.restart(seed);
                } else {
                    alert('請輸入有效的數字種子');
                }
            });

            // 按下 Enter 也能生成
            seedInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    generateBtn.click();
                }
            });
        }

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.continueGame();
            });
        }

        // 滑鼠控制視角旋轉（pointer + capture，支援微小拖動）
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            this.dragPointerId = e.pointerId;
            this.renderer.domElement.setPointerCapture(e.pointerId);
            this.dragStart = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('pointermove', (e) => {
            if (this.isDragging && e.pointerId === this.dragPointerId) {
                const deltaX = e.clientX - this.dragStart.x;
                // 提升靈敏度，讓小幅度拖動也能轉動
                const rotationDelta = deltaX * 0.015;
                this.cameraRotation += rotationDelta;
                this.targetRotation = this.cameraRotation; // 同時更新目標，避免回彈
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.updateCameraPosition();
            }
        });

        const endPointerDrag = (e) => {
            if (this.isDragging && e.pointerId === this.dragPointerId) {
                this.renderer.domElement.releasePointerCapture(e.pointerId);
                this.isDragging = false;
                this.dragPointerId = null;
            }
        };

        this.renderer.domElement.addEventListener('pointerup', endPointerDrag);
        this.renderer.domElement.addEventListener('pointercancel', endPointerDrag);

        // 視窗大小變化
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('canvas-container');
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    updateElapsedTime(elapsedSeconds) {
        if (!this.elapsedEl) {
            this.elapsedEl = document.getElementById('elapsed-time');
        }
        if (this.elapsedEl) {
            this.elapsedEl.textContent = elapsedSeconds.toFixed(2);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 連續旋轉（消除鍵盤重複的初始延遲）
        const holdRotationStep = 0.07; // 每幀累積角度
        if (this.keys['arrowleft'] || this.keys['a']) {
            this.targetRotation += holdRotationStep;
        }
        if (this.keys['arrowright'] || this.keys['d']) {
            this.targetRotation -= holdRotationStep;
        }

        // 連續前進/後退（移除鍵盤重複延遲）
        if (!this.isMoving) {
            if (this.keys['arrowup'] || this.keys['w']) {
                this.movePlayer(1);
            } else if (this.keys['arrowdown'] || this.keys['s']) {
                this.movePlayer(-1);
            }
        }

        // 平滑旋轉
        const rotationSpeed = 0.15;
        if (Math.abs(this.cameraRotation - this.targetRotation) > 0.001) {
            const diff = this.targetRotation - this.cameraRotation;
            this.cameraRotation += diff * rotationSpeed;
            this.updateCameraPosition();
        } else if (this.targetRotation !== this.cameraRotation) {
            this.cameraRotation = this.targetRotation;
            this.updateCameraPosition();
        }

        // 更新經過時間顯示
        if (!this.isPaused && this.startTime) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.updateElapsedTime(elapsed);
        }

        // 平滑移動
        if (this.isMoving && this.targetPos) {
            this.moveProgress += 0.15; // 移動速度
            
            if (this.moveProgress >= 1) {
                // 移動完成
                this.playerPos.x = this.targetPos.x;
                this.playerPos.z = this.targetPos.z;
                this.moveProgress = 1;
                this.isMoving = false;
                
                // 檢查是否到達目標
                if (this.playerPos.x === this.foodPos.x && this.playerPos.z === this.foodPos.z) {
                    this.onReachFood();
                }
            }
            
            this.updatePlayerPosition();
            this.updateCameraPosition();
        }

        // 更新渲染
        this.renderer.render(this.scene, this.camera);
    }
}

// 全局遊戲實例
let game3D = null;

// 初始化遊戲
function initGame(seed = null) {
    game3D = new Maze3D(13, 13, 1, seed);
    game3D.updateStats();
}

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

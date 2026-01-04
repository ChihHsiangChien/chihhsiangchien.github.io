// 招潮蟹模擬遊戲 - Three.js 3D版本
// 低視角、廣闊視野、開放泥灘環境

class Crab {
    constructor(x, z, isBurrow = false) {
        this.x = x;
        this.z = z;
        this.y = 0;
        this.vx = 0;
        this.vz = 0;
        this.rotation = 0;
        this.speed = 0.2;
        this.alive = true;
        this.burrowX = x;
        this.burrowZ = z;
        this.health = 100;
        this.food = 0;
        this.state = 'wandering';
        this.targetX = x;
        this.targetZ = z;
        this.detectionRange = 25;
        this.stateTimer = 0;
        this.wanderTimer = 0;
        this.mesh = null;
    }

    update(game) {
        if (!this.alive) return;
        
        this.stateTimer++;
        this.wanderTimer++;
        
        // 檢查天敵
        let nearestPredator = null;
        let minDist = this.detectionRange;
        for (let pred of game.predators) {
            const dist = Math.hypot(this.x - pred.x, this.z - pred.z);
            if (dist < minDist) {
                minDist = dist;
                nearestPredator = pred;
            }
        }
        
        // 狀態轉換邏輯
        if (nearestPredator && minDist < this.detectionRange) {
            this.state = 'fleeing';
            this.stateTimer = 0;
        } else if (this.state === 'fleeing') {
            const distToBurrow = Math.hypot(this.x - this.burrowX, this.z - this.burrowZ);
            if (distToBurrow < 2) {
                this.x = this.burrowX;
                this.z = this.burrowZ;
                this.vx = 0;
                this.vz = 0;
                this.state = 'resting';
                this.stateTimer = 0;
                this.health = Math.min(100, this.health + 20);
            } else {
                const angle = Math.atan2(this.burrowZ - this.z, this.burrowX - this.x);
                this.vx = Math.cos(angle) * this.speed * 2.5;
                this.vz = Math.sin(angle) * this.speed * 2.5;
            }
        } else if (this.state === 'resting') {
            this.vx = 0;
            this.vz = 0;
            if (this.stateTimer > 60) {
                this.state = 'wandering';
                this.wanderTimer = 0;
            }
        } else {
            let foodFound = false;
            
            for (let food of game.foodItems) {
                const foodDist = Math.hypot(this.x - food.x, this.z - food.z);
                if (foodDist < 12) {
                    this.targetX = food.x;
                    this.targetZ = food.z;
                    this.state = 'eating';
                    foodFound = true;
                    break;
                }
            }
            
            if (!foodFound && this.wanderTimer > 80) {
                this.targetX = this.burrowX + (Math.random() - 0.5) * 30;
                this.targetZ = this.burrowZ + (Math.random() - 0.5) * 30;
                this.wanderTimer = 0;
            }
            
            const angle = Math.atan2(this.targetZ - this.z, this.targetX - this.x);
            const dist = Math.hypot(this.targetX - this.x, this.targetZ - this.z);
            
            if (dist > 1) {
                this.vx = Math.cos(angle) * this.speed;
                this.vz = Math.sin(angle) * this.speed;
                this.rotation = angle;
            } else {
                this.vx *= 0.9;
                this.vz *= 0.9;
            }
        }
        
        this.x += this.vx;
        this.z += this.vz;
        
        // 邊界約束
        this.x = Math.max(-50, Math.min(50, this.x));
        this.z = Math.max(-50, Math.min(50, this.z));
        
        this.health -= 0.03;
        if (this.health <= 0) {
            this.alive = false;
        }
        
        // 更新mesh位置
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.z = this.z;
            this.mesh.rotation.y = this.rotation;
        }
    }
}

class FiddlerCrabGame {
    constructor() {
        // Three.js 基本設置
        const container = document.getElementById('canvas-container');
        
        // 确保容器有尺寸
        if (!container) {
            console.error('容器 #canvas-container 未找到');
            return;
        }
        
        // 获取容器的实际尺寸
        let width = container.clientWidth;
        let height = container.clientHeight;
        
        // 如果尺寸为0，使用默认值
        if (width === 0) width = 800;
        if (height === 0) height = 600;
        
        console.log('Canvas 尺寸:', width, 'x', height);
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a3a3f);
        this.scene.fog = new THREE.Fog(0x1a3a3f, 150, 300);
        
        this.camera = new THREE.PerspectiveCamera(100, width / height, 0.1, 1000);
        this.camera.position.set(0, 1.5, 2); // 稍微抬起相機，以便看到招潮蟹
        this.camera.lookAt(0, 0, 0); // 看向原點
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        container.appendChild(this.renderer.domElement);
        
        console.log('Renderer 已創建');
        
        // 光源
        this.setupLighting();
        
        // 建立泥灘地形
        this.createTerrain();
        
        // 遊戲對象
        this.player = new Crab(0, 0, false);
        this.player.speed = 0.3;
        this.createPlayerMesh();
        
        // 其他招潮蟹
        this.otherCrabs = [];
        for (let i = 0; i < 7; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30 + 10;
            const crab = new Crab(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist
            );
            this.otherCrabs.push(crab);
            this.createCrabMesh(crab);
        }
        
        // 食物
        this.foodItems = [];
        this.foodMeshes = [];
        for (let i = 0; i < 15; i++) {
            this.spawnFood();
        }
        
        // 天敵
        this.predators = [];
        this.predatorMeshes = [];
        
        // 巢穴視覺標記
        this.burrows = [
            { x: 0, z: 0, id: 'player' },
            ...this.otherCrabs.map((c, i) => ({ x: c.burrowX, z: c.burrowZ, id: `burrow-${i}` }))
        ];
        this.createBurrowMarkers();
        
        // 遊戲狀態
        this.gameRunning = true;
        this.gameOver = false;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.predatorSpawnCounter = 0;
        
        // 控制
        this.keys = {};
        this.setupControls();
        
        // 窗口調整
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('遊戲已初始化');
        
        // 隱藏加載指示器
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        this.animate();
    }

    setupLighting() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);
        
        // 方向光 - 模擬陽光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 80, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -150;
        directionalLight.shadow.camera.right = 150;
        directionalLight.shadow.camera.top = 150;
        directionalLight.shadow.camera.bottom = -150;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);
    }

    createTerrain() {
        // 泥灘地面 - 使用細分幾何體
        const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
        const material = new THREE.MeshLambertMaterial({ color: 0x4a7a82 });
        
        // 添加高度變化
        const positionAttribute = geometry.getAttribute('position');
        const positions = positionAttribute.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];
            positions[i + 2] = Math.sin(x * 0.1) * 0.3 + Math.sin(z * 0.1) * 0.3;
        }
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        this.scene.add(terrain);
        
        // 添加泥灘紋理 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 繪製泥灘紋理
        ctx.fillStyle = '#4a7a82';
        ctx.fillRect(0, 0, 512, 512);
        
        // 添加噪聲紋理
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 3 + 1;
            const colorVal = Math.floor(Math.random() * 50 + 70);
            ctx.fillStyle = `rgb(${colorVal}, ${colorVal + 20}, ${colorVal})`;
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.repeat.set(4, 4);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        material.map = texture;
        material.needsUpdate = true;
    }

    createPlayerMesh() {
        const group = new THREE.Group();
        
        // 身體 - 使用圓柱體替代CapsuleGeometry
        const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x00dd88 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        body.scale.z = 0.6;
        body.rotation.z = Math.PI / 2; // 橫臥
        group.add(body);
        
        // 眼柄
        this.createEyeStalk(group, -0.15, 0.4, 0x00dd88);
        this.createEyeStalk(group, 0.15, 0.4, 0x00dd88);
        
        // 大螯
        this.createClaw(group, -0.25, -0.2, true);
        this.createClaw(group, 0.25, -0.2, false);
        
        group.position.set(this.player.x, 0, this.player.z);
        this.scene.add(group);
        this.player.mesh = group;
    }

    createCrabMesh(crab) {
        const group = new THREE.Group();
        
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff88 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        body.scale.z = 0.5;
        body.rotation.z = Math.PI / 2; // 橫臥
        group.add(body);
        
        this.createEyeStalk(group, -0.1, 0.3, 0x00ff88);
        this.createEyeStalk(group, 0.1, 0.3, 0x00ff88);
        
        this.createClaw(group, -0.15, -0.15, true);
        this.createClaw(group, 0.15, -0.15, false);
        
        group.position.set(crab.x, 0, crab.z);
        this.scene.add(group);
        crab.mesh = group;
    }

    createEyeStalk(parent, xOffset, yOffset, color) {
        const stalkGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 8);
        const stalkMaterial = new THREE.MeshPhongMaterial({ color });
        const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
        stalk.position.x = xOffset;
        stalk.position.y = yOffset;
        stalk.castShadow = true;
        parent.add(stalk);
        
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.y = 0.35;
        eye.castShadow = true;
        stalk.add(eye);
    }

    createClaw(parent, xOffset, yOffset, isLeft) {
        // 螯節
        const clawGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.1);
        const clawMaterial = new THREE.MeshPhongMaterial({ color: 0x00aa66 });
        const claw = new THREE.Mesh(clawGeometry, clawMaterial);
        claw.position.x = xOffset;
        claw.position.y = yOffset;
        claw.rotation.z = isLeft ? 0.3 : -0.3;
        claw.castShadow = true;
        parent.add(claw);
        
        // 爪子
        const pinchGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.12);
        const pinchMaterial = new THREE.MeshPhongMaterial({ color: 0x008855 });
        const pinch = new THREE.Mesh(pinchGeometry, pinchMaterial);
        pinch.position.y = -0.3;
        pinch.castShadow = true;
        claw.add(pinch);
    }

    spawnFood() {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        const food = { x, z, eaten: false };
        this.foodItems.push(food);
        
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.1, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.foodMeshes.push(mesh);
    }

    createBurrowMarkers() {
        for (let burrow of this.burrows) {
            const isPlayer = burrow.id === 'player';
            const color = isPlayer ? 0x00ffff : 0x00ff88;
            const size = isPlayer ? 1.5 : 1;
            
            // 圓形標記
            const geometry = new THREE.CylinderGeometry(size, size, 0.1, 32);
            const material = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.set(burrow.x, 0.05, burrow.z);
            marker.receiveShadow = true;
            this.scene.add(marker);
        }
    }

    spawnPredator() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 60;
        const x = this.player.x + Math.cos(angle) * distance;
        const z = this.player.z + Math.sin(angle) * distance;
        
        this.predators.push({
            x, z,
            vx: -Math.cos(angle) * 0.25,
            vz: -Math.sin(angle) * 0.25,
            distance: distance
        });
        
        // 創建天敵視覺 - 紅色三角形
        const geometry = new THREE.ConeGeometry(1, 2, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xff3333, emissive: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.5, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.predatorMeshes.push(mesh);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // 虛擬按鈕
        document.querySelectorAll('.btn-arrow').forEach(btn => {
            const handlePress = (isPressed) => {
                const direction = btn.dataset.direction;
                if (direction === 'left') this.player.vx = isPressed ? -this.player.speed : 0;
                if (direction === 'right') this.player.vx = isPressed ? this.player.speed : 0;
                if (direction === 'turn-up') this.player.vz = isPressed ? -this.player.speed : 0;
                if (direction === 'turn-down') this.player.vz = isPressed ? this.player.speed : 0;
            };
            
            btn.addEventListener('mousedown', () => handlePress(true));
            btn.addEventListener('mouseup', () => handlePress(false));
            btn.addEventListener('touchstart', (e) => { handlePress(true); e.preventDefault(); });
            btn.addEventListener('touchend', (e) => { handlePress(false); e.preventDefault(); });
        });
        
        document.getElementById('new-game-btn')?.addEventListener('click', () => location.reload());
        document.getElementById('restart-btn')?.addEventListener('click', () => location.reload());
    }

    update() {
        if (!this.gameRunning) return;
        
        // 更新玩家
        this.player.x += this.keys['arrowleft'] ? -this.player.speed : 0;
        this.player.x += this.keys['arrowright'] ? this.player.speed : 0;
        this.player.z += this.keys['arrowup'] ? -this.player.speed : 0;
        this.player.z += this.keys['arrowdown'] ? this.player.speed : 0;
        
        this.player.x = Math.max(-50, Math.min(50, this.player.x));
        this.player.z = Math.max(-50, Math.min(50, this.player.z));
        
        if (this.player.mesh) {
            this.player.mesh.position.x = this.player.x;
            this.player.mesh.position.z = this.player.z;
        }
        
        // 更新相機跟隨玩家
        this.camera.position.x = this.player.x;
        this.camera.position.z = this.player.z;
        
        // 更新其他招潮蟹
        for (let crab of this.otherCrabs) {
            crab.update(this);
        }
        
        // 更新天敵
        for (let i = this.predators.length - 1; i >= 0; i--) {
            const pred = this.predators[i];
            pred.x += pred.vx;
            pred.z += pred.vz;
            pred.distance = Math.hypot(this.player.x - pred.x, this.player.z - pred.z);
            
            if (pred.distance < 2) {
                this.endGame();
            }
            
            // 移除超出範圍的天敵
            if (pred.distance > 150) {
                this.predators.splice(i, 1);
                this.scene.remove(this.predatorMeshes[i]);
                this.predatorMeshes.splice(i, 1);
            } else {
                this.predatorMeshes[i].position.x = pred.x;
                this.predatorMeshes[i].position.z = pred.z;
            }
        }
        
        // 檢查食物碰撞
        for (let i = this.foodItems.length - 1; i >= 0; i--) {
            const food = this.foodItems[i];
            const dist = Math.hypot(this.player.x - food.x, this.player.z - food.z);
            
            if (dist < 1.5) {
                this.player.food++;
                this.player.health = Math.min(100, this.player.health + 15);
                this.foodItems.splice(i, 1);
                this.scene.remove(this.foodMeshes[i]);
                this.foodMeshes.splice(i, 1);
                this.spawnFood();
            } else {
                // 其他招潮蟹吃食物
                for (let crab of this.otherCrabs) {
                    const crabDist = Math.hypot(crab.x - food.x, crab.z - food.z);
                    if (crabDist < 1.2) {
                        crab.food++;
                        crab.health = Math.min(100, crab.health + 10);
                        this.foodItems.splice(i, 1);
                        this.scene.remove(this.foodMeshes[i]);
                        this.foodMeshes.splice(i, 1);
                        this.spawnFood();
                        break;
                    }
                }
            }
        }
        
        // 補充食物
        if (this.foodItems.length < 12) {
            this.spawnFood();
        }
        
        // 生成天敵
        this.predatorSpawnCounter++;
        if (this.predatorSpawnCounter > 150) {
            this.spawnPredator();
            this.predatorSpawnCounter = 0;
        }
        
        // 檢查是否在巢穴
        const distToBurrow = Math.hypot(this.player.x, this.player.z);
        if (distToBurrow < 2) {
            this.player.health = Math.min(100, this.player.health + 0.8);
        }
        
        this.player.health -= 0.04;
        if (this.player.health <= 0) {
            this.endGame();
        }
        
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.updateUI();
    }

    updateUI() {
        document.getElementById('stat-health').textContent = Math.round(this.player.health);
        document.getElementById('stat-food').textContent = this.player.food;
        document.getElementById('stat-time').textContent = this.elapsedTime + 's';
        document.getElementById('stat-crabs').textContent = this.otherCrabs.filter(c => c.alive).length;
        document.getElementById('food-count').textContent = `食物: ${this.foodItems.length}`;
        
        const dangerIndicator = document.getElementById('danger-indicator');
        const nearestPredator = this.predators.length > 0 ? 
            Math.min(...this.predators.map(p => p.distance)) : Infinity;
        
        if (nearestPredator < 15) {
            dangerIndicator.textContent = '🚨 極度危險！';
            dangerIndicator.classList.add('danger');
        } else if (nearestPredator < 30) {
            dangerIndicator.textContent = '⚠️ 危險！';
            dangerIndicator.classList.add('danger');
        } else if (nearestPredator < 50) {
            dangerIndicator.textContent = '⚠️ 注意！';
            dangerIndicator.classList.remove('danger');
        } else {
            dangerIndicator.textContent = '✓ 安全';
            dangerIndicator.classList.remove('danger');
        }
        
        const healthFill = document.getElementById('health-fill');
        healthFill.style.width = Math.max(0, this.player.health) + '%';
    }

    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        const gameOverDiv = document.getElementById('game-over');
        document.getElementById('game-over-title').textContent = '遊戲結束';
        document.getElementById('game-over-message').textContent = '你被天敵吃掉了！';
        document.getElementById('final-food').textContent = this.player.food;
        document.getElementById('final-time').textContent = this.elapsedTime + 's';
        gameOverDiv.style.display = 'block';
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        
        // 相機跟隨玩家
        const targetX = this.player.x;
        const targetZ = this.player.z + 2;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
        this.camera.lookAt(this.player.x, 0.5, this.player.z);
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
    new FiddlerCrabGame();
});

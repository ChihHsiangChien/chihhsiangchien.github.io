// Vue app will be initialized after libraries load

// Wait for libraries to load with timeout
let initAttempts = 0;
const maxAttempts = 50; // 5 seconds max

function initializeApp() {
    initAttempts++;
    console.log(`檢查庫狀態 (嘗試 ${initAttempts}/${maxAttempts}):`);
    console.log('- Vue:', typeof Vue !== 'undefined' ? '✓' : '✗');
    console.log('- Math.js:', typeof math !== 'undefined' ? '✓' : '✗');
    
    if (initAttempts >= maxAttempts) {
        console.error('庫載入超時，嘗試啟動備用模式...');
        startAppWithoutThreeJS();
        return;
    }
    
    // Check Vue first, then try to proceed even without Three.js for testing
    if (typeof Vue === 'undefined') {
        console.log('Vue未載入，繼續等待...');
        setTimeout(initializeApp, 100);
        return;
    }
    
    // Check math.js
    if (typeof math === 'undefined') {
        console.log('等待Math.js載入...');
        setTimeout(initializeApp, 100);
        return;
    }
    
    console.log('所有庫已載入，開始啟動應用');
    startApp();
}

// Backup app without Three.js for testing Vue
function startAppWithoutThreeJS() {
    console.log('啟動無Three.js的備用模式...');
    
    const { createApp } = Vue;
    
    const app = createApp({
        data() {
            return {
                message: 'Vue正常運作，但Three.js載入失敗',
                currentLevel: {
                    levelId: 'test-level',
                    maxMissiles: 3,
                    maxAdvancedMissiles: 1,
                    availableTerms: ['x', 'y'],
                    allowedOperators: ['>', '<', '>=', '<=']
                },
                missilesUsed: 0,
                advancedMissilesUsed: 0,
                destroyedBuildings: 0,
                totalBuildings: 1,
                currentInequalities: [],
                selectedTerm: '',
                selectedOperator: '',
                constantValue: '',
                levelCompleted: false
            };
        },
        computed: {
            canAddInequality() {
                return this.selectedTerm && this.selectedOperator && this.constantValue !== '';
            }
        },
        methods: {
            addInequality() {
                console.log('添加不等式 (測試模式)');
                const inequality = {
                    term: this.selectedTerm,
                    operator: this.selectedOperator,
                    constant: parseFloat(this.constantValue),
                    display: `${this.selectedTerm} ${this.selectedOperator} ${this.constantValue}`
                };
                this.currentInequalities.push(inequality);
                this.selectedTerm = '';
                this.selectedOperator = '';
                this.constantValue = '';
            },
            removeInequality(index) {
                console.log('移除不等式', index);
                this.currentInequalities.splice(index, 1);
            },
            clearInequalities() {
                console.log('清除不等式');
                this.currentInequalities = [];
            },
            previewRegion() {
                console.log('預覽區域 (測試模式)');
            },
            fireMissile() {
                console.log('發射飛彈 (測試模式)');
                this.missilesUsed++;
                this.destroyedBuildings++;
                if (this.destroyedBuildings >= this.totalBuildings) {
                    this.levelCompleted = true;
                }
            },
            fireAdvancedMissile() {
                console.log('發射高級飛彈 (測試模式)');
                this.advancedMissilesUsed++;
                this.destroyedBuildings++;
                if (this.destroyedBuildings >= this.totalBuildings) {
                    this.levelCompleted = true;
                }
            },
            nextLevel() {
                console.log('下一關 (測試模式)');
                this.levelCompleted = false;
                this.missilesUsed = 0;
                this.advancedMissilesUsed = 0;
                this.destroyedBuildings = 0;
            }
        },
        mounted() {
            console.log('Vue組件已掛載 (測試模式)');
            // Add placeholder for 3D scene
            const container = this.$refs.threeContainer;
            if (container) {
                container.innerHTML = `
                    <div style="
                        width: 800px; 
                        height: 600px; 
                        background: linear-gradient(to bottom, #87CEEB 0%, #98FB98 70%);
                        border: 2px solid #34495e;
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        color: #2c3e50;
                        text-align: center;
                        line-height: 1.5;
                    ">
                        <div>
                            <div style="font-size: 24px; margin-bottom: 10px;">🏗️</div>
                            <div>Three.js 載入中...</div>
                            <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                                Vue 界面正常運作<br>
                                所有按鈕功能可用
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    });
    
    const appElement = document.getElementById('app');
    if (appElement) {
        console.log('#app元素找到，開始掛載...');
        app.mount('#app');
        console.log('Vue應用掛載完成 (測試模式)');
    } else {
        console.error('#app元素未找到！');
    }
}

function startApp() {
    console.log('開始創建Vue應用...');
    
    // Now we can safely destructure Vue
    const { createApp, markRaw } = Vue;

    // Game levels with missile-based mechanics
    const levels = [

    {
        levelId: "level-03-2d-simple",
        maxMissiles: 50,
        maxAdvancedMissiles: 2,
        advancedMissileRadius: 1.5,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "x + y", "x - y"],
        allowedOperators: [">", "<", ">=", "<="],
        targetBuildings: [
            {x: 2, y: 2, z: 0, color: 0xff0000, height: 2},
            {x: -3, y: 1, z: 0, color: 0x00ff00, height: 3},
            {x: 0, y: -2, z: 0, color: 0x0000ff, height: 2}
        ],
        description: "使用二元不等式進行精確打擊"
    },        
    {
        levelId: "level-01-simple-x",
        maxMissiles: 3,
        maxAdvancedMissiles: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 2,
        availableTerms: ["x"],
        allowedOperators: [">", "<", ">=", "<="],
        targetBuildings: [
            {x: 3, y: 0, z: 0, color: 0xff0000, height: 2}
        ],
        description: "使用一元不等式瞄準建築物"
    },
    {
        levelId: "level-02-multiple-x",
        maxMissiles: 4,
        maxAdvancedMissiles: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x"],
        allowedOperators: [">", "<", ">=", "<="],
        targetBuildings: [
            {x: -2, y: 0, z: 0, color: 0xff0000, height: 2},
            {x: 4, y: 0, z: 0, color: 0x00ff00, height: 3}
        ],
        description: "使用多個x不等式同時瞄準多個建築"
    }
];

console.log('創建Vue應用實例...');

const app = createApp({
    data() {
        console.log('Vue data() 函數被調用');
        return {
            levels: levels,
            currentLevelIndex: 0,
            missilesUsed: 0,
            advancedMissilesUsed: 0,
            currentInequalities: [],
            selectedTerm: '',
            selectedOperator: '',
            constantValue: '',
            destroyedBuildings: 0,
            levelCompleted: false,
            
            // Three.js objects
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            buildings3D: [],
            trees3D: [],
            missiles3D: [],
            explosions3D: [],
            particles3D: [],
            gridHelper: null,
            axesHelper: null,
            coordinateLabels: [],
            
            // Animation
            animationId: null,
            animationStopped: false,
            startTime: Date.now(),
            
            // Game state
            currentPreview: null,
            targetRegion: [],
            // Audio elements
            soundLaunch: null,
            soundExplosion: null,
            soundBuildingExplosion: null,            
        };
    },
    computed: {
        currentLevel() {
            return this.levels[this.currentLevelIndex];
        },
        canAddInequality() {
            return this.selectedTerm && this.selectedOperator && this.constantValue !== '' &&
                   this.currentInequalities.length < this.currentLevel.maxInequalitiesPerShot;
        },
        totalBuildings() {
            return this.currentLevel.targetBuildings.length;
        }
    },
    mounted() {
        console.log('Vue組件已掛載，等待Three.js載入...');
        this.waitForThreeJS();
        
        // 獲取音效元素
        this.soundLaunch = document.getElementById('sound-launch');
        this.soundExplosion = document.getElementById('sound-explosion');
        this.soundBuildingExplosion = document.getElementById('sound-buildingExplosion');        

    },
    beforeUnmount() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },
    methods: {
        playSound(soundElement) {
            if (soundElement) {
                // 將音效播放時間重置為開頭，以便可以快速重複播放
                soundElement.currentTime = 0;
                // 播放音效，並捕捉可能因瀏覽器自動播放政策而發生的錯誤
                soundElement.play().catch(error => {
                    console.warn(`音效播放失敗: ${error}. 使用者可能需要先與頁面進行互動。`);
                });
            }
        },        
        selectTerm(term) {
            // 如果再次點擊同一個按鈕，則取消選擇，否則就選擇新的項目
            if (this.selectedTerm === term) {
                this.selectedTerm = '';
            } else {
                this.selectedTerm = term;
            }
        },
        selectOperator(op) {
            // 如果再次點擊同一個按鈕，則取消選擇，否則就選擇新的運算子
            if (this.selectedOperator === op) {
                this.selectedOperator = '';
            } else {
                this.selectedOperator = op;
            }
        },        
        addInequality() {
            if (!this.canAddInequality) return;
            
            const inequality = {
                term: this.selectedTerm,
                operator: this.selectedOperator,
                constant: parseFloat(this.constantValue),
                display: `${this.selectedTerm} ${this.selectedOperator} ${this.constantValue}`
            };
            
            this.currentInequalities.push(inequality);
            this.selectedTerm = '';
            this.selectedOperator = '';
            this.constantValue = '';
            
            this.updateTargetRegion();
        },
        
        removeInequality(index) {
            this.currentInequalities.splice(index, 1);
            this.updateTargetRegion();
        },
        
        clearInequalities() {
            this.currentInequalities = [];
            this.clearTargetRegion();
        },
        
        updateTargetRegion() {
            this.clearTargetRegion();
            if (this.currentInequalities.length === 0) return;
            
            this.targetRegion = this.calculateTargetRegion(this.currentInequalities);
            this.showTargetPreview();
        },
        
        calculateTargetRegion(inequalities) {
            const region = [];
            for (let x = -10; x <= 10; x++) {
                for (let y = -10; y <= 10; y++) {
                    if (this.pointSatisfiesInequalities(x, y, inequalities)) {
                        region.push({ x, y });
                    }
                }
            }
            return region;
        },
        
        pointSatisfiesInequalities(x, y, inequalities) {
            return inequalities.every(ineq => {
                const leftValue = this.evaluateExpression(ineq.term, x, y);
                const rightValue = ineq.constant;
                const epsilon = 1e-9;
                
                switch (ineq.operator) {
                    case '>': return leftValue > rightValue + epsilon;
                    case '<': return leftValue < rightValue - epsilon;
                    case '>=': return leftValue >= rightValue - epsilon;
                    case '<=': return leftValue <= rightValue + epsilon;
                    default: return false;
                }
            });
        },
        
        evaluateExpression(term, x, y) {
            try {
                const scope = { x, y };
                return math.evaluate(term, scope);
            } catch (e) {
                console.error('表達式計算錯誤:', e);
                return this.evaluateManually(term, x, y);
            }
        },
        
        evaluateManually(term, x, y) {
            try {
                let expression = term.replace(/\bx\b/g, x).replace(/\by\b/g, y);
                expression = expression.replace(/(\d+)x/g, '$1*' + x);
                expression = expression.replace(/(\d+)y/g, '$1*' + y);
                return Function('"use strict"; return (' + expression + ')')();
            } catch (e) {
                console.error('手動計算錯誤:', e);
                if (term.includes('x') && term.includes('y')) return x + y;
                if (term.includes('x')) return x;
                if (term.includes('y')) return y;
                return 0;
            }
        },
        
        showTargetPreview() {
            // 在3D場景中顯示目標區域預覽
            this.clearTargetPreview3D();
            
            if (this.targetRegion.length > 0) {
                this.drawTargetPreview3D();
            }
        },
        
        clearTargetPreview3D() {
            // 清除舊的預覽物件
            if (this.targetPreviewGroup) {
                this.scene.remove(this.targetPreviewGroup);
            }
        },
        
        drawTargetPreview3D() {
            // 創建目標預覽群組
            this.targetPreviewGroup = markRaw(new THREE.Group());
            
            this.targetRegion.forEach(point => {
                const geometry = new THREE.PlaneGeometry(0.8, 0.8);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide
                });
                const plane = new THREE.Mesh(geometry, material);
                
                // 不再需要旋轉
                plane.position.copy(new THREE.Vector3(point.x, point.y, 0.02));
                 
                this.targetPreviewGroup.add(plane);
            });
            
            this.scene.add(this.targetPreviewGroup);
        },
        
        clearTargetRegion() {
            // 清除目標區域數組和3D預覽
            this.targetRegion = [];
            this.clearTargetPreview3D();
        },
        
        previewRegion() {
            this.updateTargetRegion();
            console.log('預覽目標區域 (3D模式):', this.targetRegion.length, '個點');
        },
        
        waitForThreeJS() {
            let attempts = 0;
            const maxAttempts = 100; // 10秒最大等待時間
            
            const checkThreeJS = () => {
                attempts++;
                const threeReady = typeof THREE !== 'undefined';
                // OrbitControls is attached to the THREE object, so we must check for THREE first.
                const controlsReady = threeReady && typeof THREE.OrbitControls !== 'undefined';

                console.log(`等待函式庫載入 (嘗試 ${attempts}/${maxAttempts}): Three.js ${threeReady ? '✓' : '✗'}, OrbitControls ${controlsReady ? '✓' : '✗'}`);
                
                if (threeReady && controlsReady) {
                    console.log('Three.js 和 OrbitControls 都已載入，開始初始化3D場景...');

                    this.initThreeJS();
                    this.animate3D();
                } else if (attempts >= maxAttempts) {
                    console.error('Three.js 或 OrbitControls 載入超時!');
                    // Fallback: Try to initialize even if controls are missing, but Three.js is present.
                    if (threeReady) {
                        console.warn('將在沒有 OrbitControls 的情況下繼續初始化...');
                        this.initThreeJS();
                        this.animate3D();
                    } else {
                        this.initFallbackMode();
                    }
                } else {
                    setTimeout(checkThreeJS, 100);
                }
            };
            
            checkThreeJS();
        },
        
        initFallbackMode() {
            console.log('Three.js載入失敗，啟動備用模式...');
            const container = this.$refs.threeContainer;
            container.innerHTML = `
                <div style="
                    width: 800px; 
                    height: 600px; 
                    background: linear-gradient(to bottom, #87CEEB 0%, #98FB98 70%);
                    border: 2px solid #34495e;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    color: #2c3e50;
                    text-align: center;
                    line-height: 1.5;
                ">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                        <div style="font-size: 24px; margin-bottom: 10px;">Three.js載入失敗</div>
                        <div style="font-size: 16px; margin-bottom: 10px;">
                            無法啟動3D模式<br>
                            請檢查網路連線或瀏覽器相容性
                        </div>
                        <div style="font-size: 14px; opacity: 0.7;">
                            Vue介面仍可正常使用<br>
                            但無法顯示3D場景
                        </div>
                    </div>
                </div>
            `;
        },
        
        initThreeJS() {
            console.log('初始化Three.js 3D場景...');
            const container = this.$refs.threeContainer;
            
            // 創建場景
            this.scene = markRaw(new THREE.Scene());
            this.scene.background = new THREE.Color(0x87CEEB); // 天空藍
            
            // 創建攝影機 - 從高空俯視角度
            this.camera = markRaw(new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000));
            this.camera.position.copy(new THREE.Vector3(0, -20, 20)); // 初始位置稍微傾斜，更有3D感
            this.camera.up.set(0, 0, 1); // 將Z軸定義為「上」方向
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));
            
            // 創建渲染器
            this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: true }));
            this.renderer.setSize(800, 600);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            container.appendChild(this.renderer.domElement);
            
            // 創建軌道控制器
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = markRaw(new THREE.OrbitControls(this.camera, this.renderer.domElement));
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.1;
                this.controls.enableZoom = true;
                this.controls.minDistance = 5;
                this.controls.maxDistance = 100;
                // 限制垂直旋轉角度，防止攝影機翻到地平線下
                this.controls.minPolarAngle = 0.1; // 稍微限制，避免完全垂直向下
                this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // 限制在水平視角之上

                console.log('OrbitControls初始化成功');
            } else {
                console.warn('OrbitControls未找到，使用基本控制');
                this.setupBasicControls();
            }
            
            // 創建光照
            this.setupLighting();
            
            // 創建地形和網格
            this.createTerrain();
            this.createGrid();
            this.createLaunchPad();
            this.createCoordinateLabels();
            
            // 初始化場景物件
            this.buildings3D = [];
            this.missiles3D = [];
            this.explosions3D = [];
            this.trees3D = [];
            this.particles3D = [];
            
            this.create3DScene();
            console.log('Three.js初始化完成');
        },
        
        setupLighting() {
            // 環境光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            // 平行光（太陽光）
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.copy(new THREE.Vector3(50, 50, 50));
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 500;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
            this.scene.add(directionalLight);
        },
        
        createTerrain() {
            // 創建地面
            const planeGeometry = new THREE.PlaneGeometry(24, 24);
            const planeMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x228B22,
                transparent: true,
                opacity: 0.8
            });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.position.z = -0.01; // 稍微後移以避免Z-fighting
            plane.receiveShadow = true;
            this.scene.add(plane);
        },
        
        createGrid() {
            // 創建網格輔助線
            this.gridHelper = markRaw(new THREE.GridHelper(20, 20, 0x444444, 0x888888));
            this.gridHelper.rotation.x = Math.PI / 2; // 旋轉到X-Y平面
            this.gridHelper.position.z = 0.01; // 稍微抬高避免z-fighting

            this.scene.add(this.gridHelper);
        },

        createLaunchPad() {
            // 創建一個灰色的圓柱體作為發射台基座
            const padGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
            const padMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
            const launchPad = markRaw(new THREE.Mesh(padGeometry, padMaterial));
            launchPad.position.set(-10, 10, 0.1); // 放置在 (-10, 10)
            launchPad.rotation.x = Math.PI / 2; // 旋轉圓柱體使其平躺

            launchPad.receiveShadow = true;
            this.scene.add(launchPad);

            // 在基座上創建一個黃色的環形標記
            const ringGeometry = new THREE.RingGeometry(0.8, 1, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
            const ring = markRaw(new THREE.Mesh(ringGeometry, ringMaterial));
            ring.position.set(-10, 10, 0.21); // 稍微高於基座
            this.scene.add(ring);
        },
                
        createCoordinateLabels() {
            // 清除舊的標籤
            this.coordinateLabels.forEach(label => {
                this.scene.remove(label);
            });
            this.coordinateLabels = [];
            
            const labelColor = 'rgba(0, 0, 0, 0.7)';
            const axisColorX = 'rgba(200, 0, 0, 0.8)'; // X軸使用紅色
            const axisColorY = 'rgba(0, 0, 180, 0.8)'; // Y軸改為深藍色，更清晰

            // X軸標示
            this.createAxisLabel('X', new THREE.Vector3(11, 0.1, 0.1), axisColorX, { fontSize: 64, scale: 3 });

            // Y軸標示
            this.createAxisLabel('Y', new THREE.Vector3(0.1, 11, 0.1), axisColorY, { fontSize: 64, scale: 3 });


            // 數字標籤
            for (let i = -10; i <= 10; i += 2) {
                if (i !== 0) {
                    // X軸數字
                    this.createAxisLabel(i.toString(), new THREE.Vector3(i, 0.5, 0.1), labelColor, { fontSize: 48, scale: 1.5 });
                    // Y軸數字
                    this.createAxisLabel(i.toString(), new THREE.Vector3(0.5, i, 0.1), labelColor, { fontSize: 48, scale: 1.5 });
                }
            }
            
            // 原點標籤
            this.createAxisLabel('0', new THREE.Vector3(-0.3, -0.3, 0.1), labelColor, { fontSize: 48, scale: 1.5 });
        },
        
        createAxisLabel(text, position, color, { fontSize = 48, scale = 2 } = {}) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const font = `Bold ${fontSize}px Arial`;
            context.font = font;
            const metrics = context.measureText(text);
            canvas.width = metrics.width;
            canvas.height = fontSize;
            context.font = font;
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
            const sprite = markRaw(new THREE.Sprite(material));
            sprite.position.copy(position);
            const spriteScale = scale * (fontSize / 100);
            sprite.scale.set(spriteScale * (canvas.width / canvas.height), spriteScale, 1.0);
            this.scene.add(sprite);
            this.coordinateLabels.push(sprite);
        },
        setupBasicControls() {
            // 基本滑鼠控制（如果OrbitControls不可用）
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };
            
            this.renderer.domElement.addEventListener('mousedown', (e) => {
                isDragging = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            });
            
            this.renderer.domElement.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const deltaMove = {
                        x: e.clientX - previousMousePosition.x,
                        y: e.clientY - previousMousePosition.y
                    };
                    
                    const deltaRotationQuaternion = new THREE.Quaternion()
                        .setFromEuler(new THREE.Euler(
                            deltaMove.y * 0.01,
                            deltaMove.x * 0.01,
                            0,
                            'XYZ'
                        ));
                    
                    this.camera.quaternion.multiplyQuaternions(deltaRotationQuaternion, this.camera.quaternion);
                    
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                }
            });
            
            this.renderer.domElement.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            // 滾輪縮放
            this.renderer.domElement.addEventListener('wheel', (e) => {
                e.preventDefault();
                const scale = e.deltaY > 0 ? 1.1 : 0.9;
                this.camera.position.multiplyScalar(scale);
            });
        },
        
        create3DScene() {
            console.log('創建3D場景...');
            
            // 清除舊的物件
            this.buildings3D.forEach(building => {
                this.scene.remove(building.mesh);
            });
            this.trees3D.forEach(tree => {
                this.scene.remove(tree.mesh);
            });
            
            this.buildings3D = [];
            this.trees3D = [];
            
            // 創建建築物
            this.currentLevel.targetBuildings.forEach((building, index) => {
                const geometry = new THREE.BoxGeometry(1, 1, building.height); // 寬度1, 高度1, 深度為building.height
                const material = new THREE.MeshLambertMaterial({ color: building.color });
                const mesh = markRaw(new THREE.Mesh(geometry, material));
                
                mesh.position.copy(new THREE.Vector3(building.x, building.y, building.height / 2)); // 放置在X-Y平面上，Z軸為深度
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                this.scene.add(mesh);
                
                this.buildings3D.push({
                    mesh: mesh,
                    x: building.x,
                    y: building.y,
                    height: building.height,
                    color: building.color,
                    isDestroyed: false
                });
            });
            
            // 創建樹木
            for (let i = 0; i < 20; i++) {
                const x = (Math.random() - 0.5) * 18;
                const z = (Math.random() - 0.5) * 18;
                
                // 避免樹木太靠近建築物
                let tooClose = false;
                for (let building of this.currentLevel.targetBuildings) {
                    const distance = Math.sqrt((x - building.x) ** 2 + (z - building.y) ** 2);
                    if (distance < 2) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    this.createTree(x, z);
                }
            }
            
            console.log('3D場景創建完成');
        },
        
        createTree(x, z) {
            // 樹幹
            const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = markRaw(new THREE.Mesh(trunkGeometry, trunkMaterial));
            trunk.position.copy(new THREE.Vector3(x, z, 0.5)); // z是Y座標，樹幹高度為1，中心在Z=0.5
            trunk.rotation.x = Math.PI / 2; // 將樹幹旋轉使其垂直於X-Y平面
            trunk.castShadow = true;
            
            // 樹葉
            const leavesGeometry = new THREE.SphereGeometry(0.8, 8, 6);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const leaves = markRaw(new THREE.Mesh(leavesGeometry, leavesMaterial));
            leaves.position.copy(new THREE.Vector3(x, z, 1.5)); // 樹葉在樹幹上方
            leaves.castShadow = true;
            
            // 創建樹群組
            const treeGroup = markRaw(new THREE.Group());
            treeGroup.add(trunk);
            treeGroup.add(leaves);
            
            this.scene.add(treeGroup);
            this.trees3D.push({
                mesh: treeGroup,
                x: x,
                z: z
            });
        },
        
        animate3D() {
            this.animationId = requestAnimationFrame(() => this.animate3D());
            
            // 更新控制器
            if (this.controls) {
                this.controls.update();
            }
            
            // 更新3D物件
            this.updateMissiles3D();
            this.updateExplosions3D();
            this.updateParticles3D();
            
            // 渲染場景
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        },
        
        render2D() {
            const ctx = this.ctx;
            const canvas = this.canvas;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Sky gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#98FB98');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid
            this.draw2DGrid();
            
            // Draw terrain
            this.draw2DTerrain();
            
            // Draw trees
            this.draw2DTrees();
            
            // Draw buildings
            this.draw2DBuildings();
            
            // Draw launch pad
            this.draw2DLaunchPad();
            
            // Draw missiles
            this.draw2DMissiles();
            
            // Draw explosions
            this.draw2DExplosions();
            
            // Draw particles
            this.draw2DParticles();
            
            // Draw target preview
            if (this.targetRegion.length > 0) {
                this.draw2DTargetPreview();
            }
            
            // Draw debug info
            this.drawDebugInfo();
        },
        
        draw2DGrid() {
            const ctx = this.ctx;
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            
            // Draw grid lines using 3D projection
            for (let i = -10; i <= 10; i++) {
                // Vertical lines (along y-axis)
                const start = this.project3D(i, -10, 0);
                const end = this.project3D(i, 10, 0);
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                
                // Horizontal lines (along x-axis)
                const start2 = this.project3D(-10, i, 0);
                const end2 = this.project3D(10, i, 0);
                ctx.beginPath();
                ctx.moveTo(start2.x, start2.y);
                ctx.lineTo(end2.x, end2.y);
                ctx.stroke();
            }
        },
        
        draw2DTerrain() {
            const ctx = this.ctx;
            ctx.fillStyle = '#228B22';
            
            // Draw terrain as a projected plane
            const corners = [
                this.project3D(-10, -10, 0),
                this.project3D(10, -10, 0),
                this.project3D(10, 10, 0),
                this.project3D(-10, 10, 0)
            ];
            
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.fill();
        },
        
        draw2DTrees() {
            const ctx = this.ctx;
            
            this.trees2D.forEach(tree => {
                const base = this.project3D(tree.x, tree.y, 0);
                const top = this.project3D(tree.x, tree.y, 1);
                const crown = this.project3D(tree.x, tree.y, 1.5);
                
                // Draw tree trunk
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 3 * base.scale;
                ctx.beginPath();
                ctx.moveTo(base.x, base.y);
                ctx.lineTo(top.x, top.y);
                ctx.stroke();
                
                // Draw tree leaves
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(crown.x, crown.y, 8 * crown.scale, 0, Math.PI * 2);
                ctx.fill();
            });
        },
        
        draw2DBuildings() {
            const ctx = this.ctx;
            
            this.buildings2D.forEach(building => {
                if (building.isDestroyed) return; // Skip destroyed buildings
                
                const base = this.project3D(building.x, building.y, 0);
                const top = this.project3D(building.x, building.y, building.height);
                const size = 16 * base.scale;
                
                // Draw building shadow
                const shadowBase = this.project3D(building.x + 0.5, building.y - 0.5, 0);
                const shadowTop = this.project3D(building.x + 0.5, building.y - 0.5, building.height);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(shadowBase.x - size/2, shadowTop.y, size, shadowBase.y - shadowTop.y);
                
                // Draw building
                ctx.fillStyle = building.color;
                ctx.fillRect(base.x - size/2, top.y, size, base.y - top.y);
                
                // Draw building outline
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2 * base.scale;
                ctx.strokeRect(base.x - size/2, top.y, size, base.y - top.y);
            });
        },
        
        draw2DLaunchPad() {
            const ctx = this.ctx;
            const padPos = this.project3D(-12, 0, 0);
            const radius = 12 * padPos.scale;
            
            ctx.fillStyle = '#666666';
            ctx.beginPath();
            ctx.arc(padPos.x, padPos.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2 * padPos.scale;
            ctx.stroke();
        },
        
        draw2DMissiles() {
            const ctx = this.ctx;
            
            this.missiles2D.forEach(missile => {
                const pos = this.project3D(missile.x, missile.y, missile.z);
                
                // Draw missile
                ctx.fillStyle = missile.isAdvanced ? '#00ff00' : '#ff4444';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6 * pos.scale, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw missile glow
                ctx.fillStyle = missile.isAdvanced ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 68, 68, 0.3)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 12 * pos.scale, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw missile trail
                ctx.strokeStyle = missile.isAdvanced ? '#00ff00' : '#ff6666';
                ctx.lineWidth = 4 * pos.scale;
                ctx.lineCap = 'round';
                if (missile.trail.length > 1) {
                    ctx.beginPath();
                    for (let i = 0; i < missile.trail.length; i++) {
                        const trailPos = this.project3D(missile.trail[i].x, missile.trail[i].y, missile.trail[i].z);
                        const opacity = i / missile.trail.length; // Fade trail
                        ctx.globalAlpha = opacity;
                        if (i === 0) {
                            ctx.moveTo(trailPos.x, trailPos.y);
                        } else {
                            ctx.lineTo(trailPos.x, trailPos.y);
                        }
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1.0; // Reset opacity
                }
            });
        },
        
        draw2DExplosions() {
            const ctx = this.ctx;
            
            this.explosions2D.forEach(explosion => {
                const pos = this.project3D(explosion.x, explosion.y, explosion.z);
                const radius = explosion.radius * explosion.scale * pos.scale * 15;
                
                // Draw explosion flash
                const opacity = Math.max(0, explosion.life / explosion.maxLife);
                
                // Inner bright flash
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                // Main explosion
                ctx.fillStyle = `rgba(255, 165, 0, ${opacity * 0.7})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 0.7, 0, Math.PI * 2);
                ctx.fill();
                
                // Outer glow
                ctx.fillStyle = `rgba(255, 69, 0, ${opacity * 0.4})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw explosion ring
                ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.6})`;
                ctx.lineWidth = 4 * pos.scale;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 1.2, 0, Math.PI * 2);
                ctx.stroke();
            });
        },
        
        draw2DParticles() {
            const ctx = this.ctx;
            
            this.particles.forEach(particle => {
                const pos = this.project3D(particle.x, particle.y, particle.z);
                const opacity = Math.max(0, particle.life / particle.maxLife);
                
                ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${opacity})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, particle.size * pos.scale, 0, Math.PI * 2);
                ctx.fill();
            });
        },
        
        draw2DTargetPreview() {
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            
            this.targetRegion.forEach(point => {
                const corners = [
                    this.project3D(point.x - 0.4, point.y - 0.4, 0),
                    this.project3D(point.x + 0.4, point.y - 0.4, 0),
                    this.project3D(point.x + 0.4, point.y + 0.4, 0),
                    this.project3D(point.x - 0.4, point.y + 0.4, 0)
                ];
                
                ctx.beginPath();
                ctx.moveTo(corners[0].x, corners[0].y);
                for (let i = 1; i < corners.length; i++) {
                    ctx.lineTo(corners[i].x, corners[i].y);
                }
                ctx.closePath();
                ctx.fill();
            });
        },
        
        drawDebugInfo() {
            const ctx = this.ctx;
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText(`飛彈數量: ${this.missiles2D.length}`, 10, 25);
            ctx.fillText(`爆炸數量: ${this.explosions2D.length}`, 10, 45);
            ctx.fillText(`粒子數量: ${this.particles.length}`, 10, 65);
            ctx.fillText(`目標區域: ${this.targetRegion.length} 點`, 10, 85);
            ctx.fillText(`攝影機角度: ${this.cameraAngle.toFixed(2)}`, 10, 105);
            ctx.fillText(`攝影機高度: ${this.cameraElevation.toFixed(1)}`, 10, 125);
            ctx.fillText(`攝影機距離: ${this.cameraDistance.toFixed(1)}`, 10, 145);
        },
        
        fireMissile() {
            if (this.currentInequalities.length === 0 || this.missilesUsed >= this.currentLevel.maxMissiles) return;
            
            console.log('發射飛彈 (3D模式)');
            this.launchMultipleTargetMissiles(false);
            this.clearInequalities();
        },
        
        fireAdvancedMissile() {
            if (this.currentInequalities.length === 0 || this.advancedMissilesUsed >= this.currentLevel.maxAdvancedMissiles) return;
            
            console.log('發射高級飛彈 (3D模式)');
            this.launchMultipleTargetMissiles(true);
            this.clearInequalities();
        },
        
        launchMultipleTargetMissiles(isAdvanced) {
            if (this.targetRegion.length === 0) return;
            
            // 計算可用飛彈數量
            const availableMissiles = isAdvanced ? 
                (this.currentLevel.maxAdvancedMissiles - this.advancedMissilesUsed) :
                (this.currentLevel.maxMissiles - this.missilesUsed);
            
            if (availableMissiles <= 0) return;
            
            // 選擇目標點
            let targetPoints = [...this.targetRegion];
            
            // 如果目標點超過可用飛彈數，隨機選擇
            if (targetPoints.length > availableMissiles) {
                console.log(`目標點 ${targetPoints.length} 個，可用飛彈 ${availableMissiles} 枚，隨機選擇目標`);
                targetPoints = this.shuffleArray(targetPoints).slice(0, availableMissiles);
            }
            
            // 發射飛彈到每個目標點
            targetPoints.forEach((target, index) => {
                setTimeout(() => {
                    this.launchAnimatedMissile3D(target.x, target.y, isAdvanced);
                    
                    if (isAdvanced) {
                        this.advancedMissilesUsed++;
                    } else {
                        this.missilesUsed++;
                    }
                }, index * 200); // 每200ms發射一枚飛彈
            });
        },
        
        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },
        
        launchAnimatedMissile3D(targetX, targetZ, isAdvanced) {
            // 播放發射音效
            this.playSound(this.soundLaunch);

            // 創建3D飛彈物件
            const geometry = new THREE.SphereGeometry(0.2, 8, 6);
            const material = new THREE.MeshLambertMaterial({ 
                color: isAdvanced ? 0x00ff00 : 0xff4444,
                emissive: isAdvanced ? 0x002200 : 0x220000
            });
            const mesh = markRaw(new THREE.Mesh(geometry, material));
            
            // 發射位置（地圖邊緣）
            mesh.position.copy(new THREE.Vector3(-10, 10, 0.5)); // 從發射台 (-10, 10) 發射
            this.scene.add(mesh);
            
            // 創建飛彈軌跡 (相容舊版Three.js)
            const trail = [];
            const trailGeometry = new THREE.BufferGeometry();
            const maxTrailPoints = 30; // 與軌跡長度上限一致
            const trailPositions = new Float32Array(maxTrailPoints * 3); // 3個座標 (x,y,z)
            trailGeometry.addAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
                        
            const trailMaterial = new THREE.LineBasicMaterial({ 
                color: isAdvanced ? 0x00ff00 : 0xff4444,
                transparent: true,
                opacity: 0.6
            });
            const trailLine = markRaw(new THREE.Line(trailGeometry, trailMaterial));
            trailLine.geometry.setDrawRange(0, 0); // 初始不繪製任何點

            this.scene.add(trailLine);
            
            // 飛彈數據
            const missile = {
                mesh: mesh,
                trailLine: trailLine,
                trail: trail,
                startX: -10,      // 發射點X
                startY: 10,        // 發射點Y
                startZ: 0.5,      // 發射點Z (高度)
                targetX: targetX, // 目標點X
                targetY: targetZ, // 目標點Y (傳入的targetZ是Y座標)
                targetZ: 0.5,     // 目標點Z (高度)
                isAdvanced: isAdvanced,
                startTime: Date.now(),
                flightTime: 3000,
                explosionRadius: isAdvanced ? this.currentLevel.advancedMissileRadius : 1
            };
            
            this.missiles3D.push(missile);
        },
        
        updateMissiles3D() {
            const currentTime = Date.now();
            
            for (let i = this.missiles3D.length - 1; i >= 0; i--) {
                const missile = this.missiles3D[i];
                const elapsed = currentTime - missile.startTime;
                const progress = Math.min(1, elapsed / missile.flightTime);
                
                if (progress >= 1) {
                    // 飛彈命中目標
                    this.explodeMissile3D(missile);
                    
                    // 移除飛彈和軌跡
                    this.scene.remove(missile.mesh);
                    this.scene.remove(missile.trailLine);
                    this.missiles3D.splice(i, 1);
                } else {
                    // 更新飛彈位置（拋物線軌跡）
                    const height = 8 * Math.sin(Math.PI * progress); // 拋物線弧度，現在作用於Z軸
                    const x = missile.startX + (missile.targetX - missile.startX) * progress;
                    const y = missile.startY + (missile.targetY - missile.startY) * progress;
                    const z = missile.startZ + height;
                    
                    missile.mesh.position.copy(new THREE.Vector3(x, y, z));
                    
                    // 更新軌跡
                    missile.trail.push(new THREE.Vector3(x, y, z));
                    if (missile.trail.length > 30) {
                        missile.trail.shift(); // 保持軌跡長度
                    }
                    
                    // 更新軌跡線條 (相容舊版Three.js)
                    const positions = missile.trailLine.geometry.attributes.position.array;
                    let index = 0;
                    for (const point of missile.trail) {
                        positions[index++] = point.x;
                        positions[index++] = point.y;
                        positions[index++] = point.z;
                    }
                    // 告訴Three.js位置數據已更新
                    missile.trailLine.geometry.attributes.position.needsUpdate = true;
                    // 更新要繪製的點的數量
                    missile.trailLine.geometry.setDrawRange(0, missile.trail.length);
                       
                    // 創建煙霧粒子
                    if (Math.random() < 0.3) {
                        this.createSmokeParticle3D(x, y, z);
                    }
                }
            }
        },
        
        explodeMissile3D(missile) {


            // 創建3D爆炸效果
            this.createExplosion3D(missile.targetX, missile.targetY, missile.targetZ, missile.explosionRadius);

            let buildingWasHit = false; // 標記是否有建築物被擊中
            
            // 檢查建築物摧毀
            this.buildings3D.forEach(building => {
                if (!building.isDestroyed) {
                    const distance = Math.sqrt(
                        Math.pow(building.x - missile.targetX, 2) + 
                        Math.pow(building.y - missile.targetY, 2) // 檢查X-Y平面上的距離
                    );
                    if (distance <= missile.explosionRadius) {
                        building.isDestroyed = true;
                        this.destroyedBuildings++;

                        buildingWasHit = true; // 標記為擊中

                        // 建築物摧毀動畫
                        this.animateBuildingDestruction(building);
                    }
                }
            });

            // 根據是否擊中建築物來播放不同音效
            if (buildingWasHit) {
                this.playSound(this.soundBuildingExplosion);
            } else {
                this.playSound(this.soundExplosion);
            }

            
            this.checkLevelCompletion();
        },
        
        createExplosion3D(x, y, z, radius) {
            // 爆炸球體
            const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 12);
            const explosionMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff4400,
                transparent: true,
                opacity: 0.8
            });
            const explosionMesh = markRaw(new THREE.Mesh(explosionGeometry, explosionMaterial));
            explosionMesh.position.copy(new THREE.Vector3(x, y, z));
            this.scene.add(explosionMesh);
            
            const explosion = {
                mesh: explosionMesh, // 這裡的 mesh 已經是 markRaw 的了
                x: x,
                y: y,
                z: z,
                radius: radius,
                scale: 1,
                life: 60,
                maxLife: 60,
                material: explosionMaterial
            };
            
            this.explosions3D.push(explosion);
            
            // 創建爆炸粒子
            for (let i = 0; i < 50; i++) {
                this.createExplosionParticle3D(x, y, z, radius);
            }
        },
        
        createExplosionParticle3D(x, y, z, radius) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5),
                transparent: true,
                opacity: 1
            });
            const particleMesh = markRaw(new THREE.Mesh(particleGeometry, particleMaterial));
            
            particleMesh.position.copy(new THREE.Vector3(
                x + (Math.random() - 0.5) * radius,
                y + Math.random() * radius,
                z + (Math.random() - 0.5) * radius
            ));
            
            this.scene.add(particleMesh);
            
            const particle = {
                mesh: particleMesh,
                material: particleMaterial,
                vx: (Math.random() - 0.5) * 0.2, // X軸速度
                vy: (Math.random() - 0.5) * 0.2, // Y軸速度
                vz: Math.random() * 0.1,         // Z軸速度 (向上)
                life: 90,
                maxLife: 90
            };
            
            this.particles3D.push(particle);
        },
        
        createSmokeParticle3D(x, y, z) {
            const particleGeometry = new THREE.SphereGeometry(0.03, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xcccccc,
                transparent: true,
                opacity: 0.6
            });
            const particleMesh = markRaw(new THREE.Mesh(particleGeometry, particleMaterial));
            
            particleMesh.position.copy(new THREE.Vector3(
                x + (Math.random() - 0.5) * 0.2,
                y + (Math.random() - 0.5) * 0.2,
                z + (Math.random() - 0.5) * 0.2
            ));
            
            this.scene.add(particleMesh);
            
            const particle = {
                mesh: particleMesh,
                material: particleMaterial,
                vx: (Math.random() - 0.5) * 0.02, // X軸速度
                vy: (Math.random() - 0.5) * 0.02, // Y軸速度
                vz: Math.random() * 0.01,         // Z軸速度 (向上)
                life: 60,
                maxLife: 60
            };            
            this.particles3D.push(particle);
        },
        
        animateBuildingDestruction(building) {
            // 建築物摧毀動畫 - 改變顏色並縮小
            building.mesh.material.color.r = 0.4;
            building.mesh.material.color.g = 0.4;
            building.mesh.material.color.b = 0.4;
            
            const animate = () => {
                const currentScale = building.mesh.scale.x * 0.98;
                building.mesh.scale.copy(new THREE.Vector3(currentScale, currentScale, currentScale));
                building.mesh.rotation.y += 0.1;
                
                if (building.mesh.scale.x > 0.1) {
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(building.mesh);
                }
            };
            animate();
        },
        
        updateExplosions3D() {
            for (let i = this.explosions3D.length - 1; i >= 0; i--) {
                const explosion = this.explosions3D[i];
                explosion.life--;
                explosion.scale = 1 + (1 - explosion.life / explosion.maxLife) * 10;
                
                // 更新爆炸大小和透明度
                explosion.mesh.scale.copy(new THREE.Vector3(explosion.scale, explosion.scale, explosion.scale));
                explosion.material.opacity = Math.max(0, explosion.life / explosion.maxLife);
                
                if (explosion.life <= 0) {
                    this.scene.remove(explosion.mesh);
                    this.explosions3D.splice(i, 1);
                }
            }
        },
        
        updateParticles3D() {
            for (let i = this.particles3D.length - 1; i >= 0; i--) {
                const particle = this.particles3D[i];
                
                // 更新位置
                particle.mesh.position.x += particle.vx;
                particle.mesh.position.y += particle.vy;
                particle.mesh.position.z += particle.vz;
                
                // 重力
                particle.vz-= 0.002;
                
                // 更新生命週期
                particle.life--;
                particle.material.opacity = Math.max(0, particle.life / particle.maxLife);
                
                if (particle.life <= 0 || particle.mesh.position.z < 0) { // 檢查是否接觸Z=0的地面
                    this.scene.remove(particle.mesh);
                    this.particles3D.splice(i, 1);
                }
            }
        },
        
        explodeMissile2D(missile) {
            // Create explosion
            this.explosions2D.push({
                x: missile.targetX,
                y: missile.targetY,
                z: 0,
                radius: missile.explosionRadius,
                scale: 1,
                life: 60,
                maxLife: 60
            });
            
            // Create explosion particles
            for (let i = 0; i < 50; i++) {
                this.particles.push({
                    x: missile.targetX + (Math.random() - 0.5) * missile.explosionRadius * 0.5,
                    y: missile.targetY + (Math.random() - 0.5) * missile.explosionRadius * 0.5,
                    z: Math.random() * missile.explosionRadius * 0.5,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    vz: Math.random() * 0.08,
                    color: { 
                        r: 255, 
                        g: Math.random() * 100 + 155, 
                        b: Math.random() * 50 
                    },
                    size: Math.random() * 4 + 3,
                    life: 120,
                    maxLife: 120
                });
            }
            
            // Check for building destruction
            this.buildings2D.forEach(building => {
                if (!building.isDestroyed) {
                    const distance = Math.sqrt(
                        Math.pow(building.x - missile.targetX, 2) + 
                        Math.pow(building.y - missile.targetY, 2)
                    );
                    if (distance <= missile.explosionRadius) {
                        building.isDestroyed = true;
                        this.destroyedBuildings++;
                    }
                }
            });
            
            this.checkLevelCompletion();
        },
        
        updateExplosions2D() {
            for (let i = this.explosions2D.length - 1; i >= 0; i--) {
                const explosion = this.explosions2D[i];
                explosion.life--;
                explosion.scale = 1 + (1 - explosion.life / explosion.maxLife) * 2;
                
                if (explosion.life <= 0) {
                    this.explosions2D.splice(i, 1);
                }
            }
        },
        
        updateParticles() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.z += particle.vz;
                particle.vz -= 0.001; // Gravity
                particle.life--;
                
                if (particle.life <= 0 || particle.z < 0) {
                    this.particles.splice(i, 1);
                }
            }
        },
        
        checkLevelCompletion() {
            this.levelCompleted = (this.destroyedBuildings >= this.totalBuildings);
        },
        
        nextLevel() {
            if (this.currentLevelIndex < this.levels.length - 1) {
                this.currentLevelIndex++;
                this.resetLevel();
            }
        },
        
        resetLevel() {
            this.missilesUsed = 0;
            this.advancedMissilesUsed = 0;
            this.destroyedBuildings = 0;
            this.currentInequalities = [];
            this.levelCompleted = false;
            this.clearTargetRegion();
            
            // 清除3D物件
            this.missiles3D.forEach(missile => {
                this.scene.remove(missile.mesh);
                this.scene.remove(missile.trailLine);
            });
            this.explosions3D.forEach(explosion => {
                this.scene.remove(explosion.mesh);
            });
            this.particles3D.forEach(particle => {
                this.scene.remove(particle.mesh);
            });
            
            this.missiles3D = [];
            this.explosions3D = [];
            this.particles3D = [];
            
            // 重新創建3D場景
            if (this.scene) {
                this.create3DScene();
            }
        },
        
        // Camera control methods
        onMouseDown(event) {
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.canvas.style.cursor = 'grabbing';
        },
        
        onMouseMove(event) {
            if (!this.isDragging) return;
            
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            
            this.cameraAngle += deltaX * 0.01;
            this.cameraElevation += deltaY * 0.5;
            this.cameraElevation = Math.max(-30, Math.min(60, this.cameraElevation));
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        },
        
        onMouseUp() {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        },
        
        onTouchStart(event) {
            event.preventDefault();
            if (event.touches.length === 1) {
                this.isDragging = true;
                this.lastMouseX = event.touches[0].clientX;
                this.lastMouseY = event.touches[0].clientY;
            }
        },
        
        onTouchMove(event) {
            event.preventDefault();
            if (!this.isDragging || event.touches.length !== 1) return;
            
            const deltaX = event.touches[0].clientX - this.lastMouseX;
            const deltaY = event.touches[0].clientY - this.lastMouseY;
            
            this.cameraAngle += deltaX * 0.01;
            this.cameraElevation += deltaY * 0.5;
            this.cameraElevation = Math.max(-30, Math.min(60, this.cameraElevation));
            
            this.lastMouseX = event.touches[0].clientX;
            this.lastMouseY = event.touches[0].clientY;
        },
        
        onTouchEnd(event) {
            this.isDragging = false;
        },
        
        onWheel(event) {
            event.preventDefault();
            this.cameraDistance += event.deltaY * 0.01;
            this.cameraDistance = Math.max(10, Math.min(50, this.cameraDistance));
        },
        
        // Get 3D projection coordinates
        project3D(x, y, z) {
            const centerX = 400;
            const centerY = 300;
            
            // Apply camera rotation
            const cosAngle = Math.cos(this.cameraAngle);
            const sinAngle = Math.sin(this.cameraAngle);
            
            const rotatedX = x * cosAngle - y * sinAngle;
            const rotatedY = x * sinAngle + y * cosAngle;
            
            // Apply perspective projection
            const scale = 15 * (20 / (this.cameraDistance + rotatedY));
            const elevationOffset = this.cameraElevation * 2;
            
            return {
                x: centerX + rotatedX * scale,
                y: centerY - z * scale + elevationOffset,
                scale: scale / 15
            };
        }
    }
});

console.log('掛載Vue應用到#app...');
const appElement = document.getElementById('app');
if (appElement) {
    console.log('#app元素找到，開始掛載...');
    app.mount('#app');
    console.log('Vue應用掛載完成');
} else {
    console.error('#app元素未找到！');
}

}

// Start the initialization process when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM已準備就緒，開始初始化...');
        initializeApp();
    });
} else {
    console.log('DOM已存在，立即初始化...');
    initializeApp();
}
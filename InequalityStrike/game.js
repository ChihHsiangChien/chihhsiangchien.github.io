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

console.log('創建Vue應用實例...');

const app = createApp({
    data() {
        console.log('Vue data() 函數被調用');
        return {
            levels: window.gameLevels || [], // 從全域變數讀取關卡資料，如果失敗則使用空陣列
            currentLevelIndex: 0,
            missilesUsed: 0,
            advancedMissilesUsed: 0,
            currentInequalities: [],
            selectedTerm: '',
            selectedOperator: '',
            constantValue: '',
            destroyedBuildings: 0,
            levelCompleted: false,
            score: 0,
            totalScore: 0,
            fireButtonPresses: 0,
            showLevelCompleteModal: false,
            pendingExplosionCallbacks: 0, // 新增：追蹤待處理的爆炸回呼數量
            selectedLevelIndex: 0, // 新增：用於關卡選擇下拉選單
            showOutOfMissilesModal: false, // 新增：控制飛彈用盡彈出視窗
            // Graphics and Game Logic State
            isFullscreen: false, // 新增：追蹤全螢幕狀態
            showGameMessage: false, // 新增：控制遊戲內訊息提示
            gameMessage: '', // 新增：遊戲內訊息內容
            gameMessageTimeout: null, // 新增：用於清除訊息的計時器
            graphicsEngine: null,
            logicalBuildings: [], // { id, x, y, ..., isDestroyed }
            logicalTrees: [], // { id, x, y, isDestroyed }
            
            // Game state
            currentPreview: null,
            targetRegion: [],
            // Audio elements
            soundLaunch: null,
            soundExplosion: null,
            soundBuildingExplosion: null,            
        };
    },
    watch: {
        // 監聽 isFullscreen 狀態的變化，並更新按鈕的文字
        isFullscreen(isFull) {
            const button = document.getElementById('fullscreen-btn');
            if (button) {
                button.innerHTML = isFull ? '&#x26F6; 退出' : '&#x26F6; 全螢幕'; // 使用圖示和文字
            }
        },
        showGameMessage(isVisible) {
            const messageBox = document.getElementById('game-message-box');
            if (messageBox) {
                if (isVisible) {
                    messageBox.textContent = this.gameMessage;
                    messageBox.style.visibility = 'visible';
                    messageBox.style.opacity = '1';
                    messageBox.style.top = '70px';
                } else {
                    messageBox.style.opacity = '0';
                    messageBox.style.top = '50px'; // 消失時稍微向上移動
                    // 確保動畫播放完畢後再隱藏元素，避免閃爍
                    setTimeout(() => {
                        if (!this.showGameMessage) messageBox.style.visibility = 'hidden';
                    }, 300); // 需與CSS transition時間匹配
                }
            }
        },
        // 當下拉選單的值改變時，立即觸發關卡切換
        selectedLevelIndex(newIndex, oldIndex) {
            // 避免在初始化或程式化更新時觸發
            if (newIndex !== oldIndex) {
                this.goToSelectedLevel();
            }
        }
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

        this.selectedLevelIndex = this.currentLevelIndex; // 初始化選單為當前關卡
        this.setupUIExtensions(); // 設定額外的UI元素，如全螢幕按鈕

    },
    methods: {
        goToSelectedLevel() {
            // 如果有彈出視窗，先關閉
            if (this.showLevelCompleteModal || this.showOutOfMissilesModal) {
                this.showLevelCompleteModal = false;
                this.showOutOfMissilesModal = false;
            }
            // 確保 currentLevelIndex 與下拉選單同步
            this.currentLevelIndex = this.selectedLevelIndex;
            this.resetLevel();
        },
        showTemporaryMessage(message, duration = 3000) {
            this.gameMessage = message;
            this.showGameMessage = true;

            // 如果已有計時器，先清除，避免訊息被過早關閉
            if (this.gameMessageTimeout) {
                clearTimeout(this.gameMessageTimeout);
            }

            this.gameMessageTimeout = setTimeout(() => {
                this.showGameMessage = false;
            }, duration);
        },

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
            
            if (this.graphicsEngine) {
                this.graphicsEngine.showTargetPreview(this.calculateTargetRegion(this.currentInequalities));
            }
        },
        
        removeInequality(index) {
            this.currentInequalities.splice(index, 1);
            if (this.graphicsEngine) {
                this.graphicsEngine.showTargetPreview(this.calculateTargetRegion(this.currentInequalities));
            }
        },
        
        clearInequalities() {
            this.currentInequalities = [];
            if (this.graphicsEngine) {
                this.graphicsEngine.clearTargetPreview();
            }
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
                    case '>=':
                    case '≥':
                        return leftValue >= rightValue - epsilon;
                    case '<=':
                    case '≤':
                        return leftValue <= rightValue + epsilon;
                    case '=': return Math.abs(leftValue - rightValue) < epsilon;
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

                    this.graphicsEngine = markRaw(new GraphicsEngine(this.$refs.threeContainer, this.handleMissileExplosion.bind(this), markRaw));
                    this.graphicsEngine.init();
                    this.resetLevel(); // This will now draw the scene via the engine
                } else if (attempts >= maxAttempts) {
                    console.error('Three.js 或 OrbitControls 載入超時!');
                    this.initFallbackMode();
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
        
        fireMissile() {
            if (this.currentInequalities.length === 0 || this.missilesUsed >= this.currentLevel.maxMissiles || this.levelCompleted) return;

            const targetPoints = this.calculateTargetRegion(this.currentInequalities);
            if (targetPoints.length === 0) {
                this.showTemporaryMessage('目標區域無效！不等式沒有交集。');
                return; // 不發射，也不清除不等式
            }

            this.fireButtonPresses++;
            console.log('發射飛彈 (3D模式)');
            this.launchMultipleTargetMissiles(false, targetPoints);
            this.clearInequalities(); // This will also clear the preview via the graphics engine
        },
        
        fireAdvancedMissile() {
            if (this.currentInequalities.length === 0 || this.advancedMissilesUsed >= this.currentLevel.maxAdvancedMissiles || this.levelCompleted) return;

            const targetPoints = this.calculateTargetRegion(this.currentInequalities);
            if (targetPoints.length === 0) {
                this.showTemporaryMessage('目標區域無效！不等式沒有交集。');
                return; // 不發射，也不清除不等式
            }

            this.fireButtonPresses++;
            console.log('發射高級飛彈 (3D模式)');
            this.launchMultipleTargetMissiles(true, targetPoints);
            this.clearInequalities(); // This will also clear the preview via the graphics engine
        },

        checkMissileExhaustion() {
            const regularMissilesExhausted = this.missilesUsed >= this.currentLevel.maxMissiles;
            const advancedMissilesExhausted = this.advancedMissilesUsed >= this.currentLevel.maxAdvancedMissiles;

            // 如果兩種飛彈都用盡，且關卡尚未完成
            if (regularMissilesExhausted && advancedMissilesExhausted && !this.levelCompleted) {
                this.showOutOfMissilesModal = true;
            }
        },

        calculateScore() {
            const buildingScore = this.destroyedBuildings * 1000;
            const missilePenalty = this.missilesUsed * 100;
            const advancedMissilePenalty = this.advancedMissilesUsed * 200;
            const firePressPenalty = this.fireButtonPresses * 50;
            const levelScore = buildingScore - missilePenalty - advancedMissilePenalty - firePressPenalty;
            this.score = Math.max(0, levelScore); // 分數不能是負數
            this.totalScore += this.score;
        },
        
        launchMultipleTargetMissiles(isAdvanced, targetPoints) {
            
            // 計算可用飛彈數量
            const availableMissiles = isAdvanced ? 
                (this.currentLevel.maxAdvancedMissiles - this.advancedMissilesUsed) :
                (this.currentLevel.maxMissiles - this.missilesUsed);
            
            if (availableMissiles <= 0) return;
            
            // 選擇目標點
            let finalTargets = [...targetPoints];
            
            // 如果目標點超過可用飛彈數，隨機選擇
            if (finalTargets.length > availableMissiles) {
                console.log(`目標點 ${finalTargets.length} 個，可用飛彈 ${availableMissiles} 枚，隨機選擇目標`);
                finalTargets = this.shuffleArray(finalTargets).slice(0, availableMissiles);
            }
            
            // 追蹤這一批次發射的所有飛彈
            this.pendingExplosionCallbacks += finalTargets.length;

            // 發射飛彈到每個目標點
            finalTargets.forEach((target, index) => {
                setTimeout(() => {
                    this.playSound(this.soundLaunch);
                    if (this.graphicsEngine) {
                        const explosionRadius = isAdvanced ? this.currentLevel.advancedMissileRadius : this.currentLevel.missileRadius;
                        this.graphicsEngine.launchAnimatedMissile(target.x, target.y, isAdvanced, explosionRadius);
                    }

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
        
        handleMissileExplosion(explosionData) {
            let buildingWasHit = false;
            
            // 檢查建築物摧毀情況
            this.logicalBuildings.forEach(building => {
                if (!building.isDestroyed) {
                    const distance = Math.sqrt(
                        Math.pow(building.x - explosionData.x, 2) + 
                        Math.pow(building.y - explosionData.y, 2)
                    );
                    if (distance <= explosionData.radius) {
                        building.isDestroyed = true;
                        this.destroyedBuildings++;
                        buildingWasHit = true;

                        // 觸發視覺銷毀
                        if (this.graphicsEngine) {
                            this.graphicsEngine.destroyBuilding(building.id);
                        }
                    }
                }
            });

            // 檢查樹木摧毀情況
            this.logicalTrees.forEach(tree => {
                if (!tree.isDestroyed) {
                    const distance = Math.sqrt(
                        Math.pow(tree.x - explosionData.x, 2) +
                        Math.pow(tree.y - explosionData.y, 2)
                    );
                    // 樹木的爆炸半徑可以小一點
                    if (distance <= explosionData.radius * 0.8) {
                        tree.isDestroyed = true;
                        if (this.graphicsEngine) {
                            this.graphicsEngine.destroyTree(tree.id);
                        }
                    }
                }
            });

            // 根據是否擊中建築物來播放不同音效
            if (buildingWasHit) {
                this.playSound(this.soundBuildingExplosion);
            } else {
                this.playSound(this.soundExplosion);
            }

            // 每次爆炸後，減少待處理的爆炸計數
            if (this.pendingExplosionCallbacks > 0) {
                this.pendingExplosionCallbacks--;
            }

            // 當所有飛行中的飛彈都爆炸後，才檢查遊戲狀態
            if (this.pendingExplosionCallbacks === 0) {
                this.$nextTick(() => {
                    // 優先檢查關卡是否完成
                    this.checkLevelCompletion();
                    // 如果關卡未完成，再檢查飛彈是否用盡
                    if (!this.levelCompleted) {
                        this.checkMissileExhaustion();
                    }
                });
            }
        },
        
        checkLevelCompletion() {
            // 檢查是否所有建築都被摧毀，且關卡尚未標記為完成
            if (!this.levelCompleted && this.destroyedBuildings >= this.totalBuildings) {
                this.levelCompleted = true; // 立即標記，防止重複觸發
                this.calculateScore();
                this.showLevelCompleteModal = true;
            }
        },
        
        nextLevel() {
            this.showLevelCompleteModal = false;
            setTimeout(() => {
                if (this.currentLevelIndex < this.levels.length - 1) {
                    // 直接更新 selectedLevelIndex，讓 watcher 自動觸發關卡切換
                    this.selectedLevelIndex++;
                } else {
                    alert(`恭喜！您已完成所有關卡！\n最終總分: ${this.totalScore}`);
                }
            }, 100);
        },

        restartCurrentLevel() {
            this.showOutOfMissilesModal = false; // 關閉彈出視窗
            this.resetLevel(); // 重設當前關卡
        },
        
        resetLevel() {
            // 確保下拉選單與當前關卡同步
            this.selectedLevelIndex = this.currentLevelIndex;

            this.missilesUsed = 0;
            this.advancedMissilesUsed = 0;
            this.destroyedBuildings = 0;
            this.currentInequalities = [];
            this.levelCompleted = false;
            this.score = 0;
            this.fireButtonPresses = 0;

            // 創建邏輯上的建築物和樹木狀態
            this.logicalBuildings = this.currentLevel.targetBuildings.map((b, i) => ({
                ...b,
                id: `building-${i}`,
                isDestroyed: false
            }));

            this.logicalTrees = [];
            for (let i = 0; i < 20; i++) {
                const x = (Math.random() - 0.5) * 18;
                const y = (Math.random() - 0.5) * 18;
                // 確保樹木不會生成在建築物上
                let tooClose = this.logicalBuildings.some(b => Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2) < 2);
                if (!tooClose) {
                    this.logicalTrees.push({
                        id: `tree-${i}`, x, y, isDestroyed: false
                    });
                }
            }
            
            // 告訴圖形引擎重設場景
            if (this.graphicsEngine) {
                this.graphicsEngine.resetScene(this.logicalBuildings, this.logicalTrees);
            }
        },

        setupUIExtensions() {
            // 創建全螢幕按鈕
            const button = document.createElement('button');
            button.id = 'fullscreen-btn';
            
            // 設定初始文字，避免載入時為空
            button.innerHTML = '&#x26F6; 全螢幕';
            
            // 設定樣式
            Object.assign(button.style, {
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: '1000',
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: 'rgba(44, 62, 80, 0.8)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '5px',
                backdropFilter: 'blur(2px)' // 提供一個漂亮的毛玻璃效果
            });

            // 將按鈕附加到 Vue 應用的根元素上
            this.$el.appendChild(button);

            // 綁定點擊事件和全螢幕狀態變更事件
            button.addEventListener('click', this.toggleFullscreen);
            document.addEventListener('fullscreenchange', this.handleFullscreenChange);

            // 初始化按鈕狀態
            this.handleFullscreenChange();

            // 創建遊戲訊息提示框
            const messageBox = document.createElement('div');
            messageBox.id = 'game-message-box';
            Object.assign(messageBox.style, {
                position: 'absolute',
                top: '50px', // 初始位置（動畫前）
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(220, 53, 69, 0.9)', // 紅色警告背景
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                zIndex: '1001',
                fontSize: '16px',
                fontWeight: 'bold',
                pointerEvents: 'none', // 讓滑鼠可以穿透
                transition: 'opacity 0.3s ease, top 0.3s ease',
                opacity: '0',
                visibility: 'hidden'
            });
            this.$el.appendChild(messageBox);
        },

        toggleFullscreen() {
            if (!document.fullscreenElement) {
                // 進入全螢幕模式
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`無法進入全螢幕模式: ${err.message} (${err.name})`);
                    alert(`您的瀏覽器不支援或拒絕了全螢幕請求。`);
                });
            } else if (document.exitFullscreen) {
                // 退出全螢幕模式
                document.exitFullscreen();
            }
        },

        handleFullscreenChange() {
            this.isFullscreen = !!document.fullscreenElement;
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
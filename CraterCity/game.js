const { createApp } = Vue;

// Wait for libraries to load
function initializeApp() {
    // Check if math.js is available
    if (typeof math === 'undefined' && typeof window.math === 'undefined') {
        console.log('等待 math.js 載入...');
        setTimeout(initializeApp, 100);
        return;
    }
    
    console.log('Math.js 已載入:', typeof math !== 'undefined' ? 'math' : 'window.math');
    startApp();
}

function startApp() {

// 示例關卡資料
const levels = [
    {
        levelId: "level-01-simple",
        maxFills: 2,
        maxInequalitiesPerFill: 4,
        availableTerms: ["x", "y", "2x", "-x"],
        allowedOperators: [">", "<", ">=", "<="],
        targetPoints: [
            //{"x":4, "y":5}, {"x":5, "y":5}, {"x":6, "y":5},
            {"x":4, "y":6}, {"x":6, "y":6},
            //{"x":4, "y":7}, {"x":5, "y":7}, {"x":6, "y":7}
        ]
    },
    {
        levelId: "level-02-Lshape",
        maxFills: 3,
        maxInequalitiesPerFill: 4,
        availableTerms: ["x", "y", "2x", "-x", "0.5x", "x + y", "-x + y", "x - y"],
        allowedOperators: [">", "<", ">=", "<="],
        targetPoints: [
            {"x":2,"y":2}, {"x":3,"y":2}, {"x":4,"y":2},
            {"x":2,"y":3},
            {"x":2,"y":4},
            {"x":2,"y":5}, {"x":3,"y":5}, {"x":4,"y":5}
        ]
    }
];

createApp({
    data() {
        return {
            levels: levels,
            currentLevelIndex: 0,
            fillCount: 0,
            score: 0,
            currentInequalities: [],
            selectedTerm: '',
            selectedOperator: '',
            constantValue: '',
            filledRegions: [],
            coveredTargetPoints: new Set(), // 新增：追蹤哪些目標點已被覆蓋
            currentPreview: null, 
            canvas: null,
            ctx: null,
            gridSize: 20,
            canvasOffset: { x: 50, y: 50 },
            levelCompleted: false
        };
    },
    computed: {
        currentLevel() {
            return this.levels[this.currentLevelIndex];
        },
        canAddInequality() {
            return this.selectedTerm && this.selectedOperator && this.constantValue !== '' &&
                   this.currentInequalities.length < this.currentLevel.maxInequalitiesPerFill;
        }
    },
    mounted() {
        this.canvas = this.$refs.gameCanvas;
        this.ctx = this.canvas.getContext('2d');
        this.drawCanvas();
    },
    methods: {
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
        },
        
        removeInequality(index) {
            this.currentInequalities.splice(index, 1);
            this.currentPreview = null;
            this.drawCanvas();
        },
        
        clearInequalities() {
            this.currentInequalities = [];
            this.currentPreview = null;
            this.drawCanvas();
        },
        
        previewRegion() {
            if (this.currentInequalities.length === 0) return;
            
            const region = this.calculateRegionFromInequalities(this.currentInequalities);
            this.currentPreview = region;
            this.drawCanvas();
        },
        
        fillRegion() {
            if (this.currentInequalities.length === 0 || this.fillCount >= this.currentLevel.maxFills) return;
            
            const region = this.calculateRegionFromInequalities(this.currentInequalities);
            this.filledRegions.push(region);
            this.fillCount++;
            
            this.updateCoveredTargetPoints(); // 更新已覆蓋的目標點
            this.calculateScore();
            this.checkLevelCompletion();
            
            this.currentInequalities = [];
            this.currentPreview = null;
            this.drawCanvas();
        },
        
        calculateRegionFromInequalities(inequalities) {
            const points = [];
            const gridSize = 25; // 網格解析度
            
            // 使用網格方法計算不等式交集區域
            for (let x = 0; x < 12; x++) {
                for (let y = 0; y < 12; y++) {
                    // 檢查每個網格的整數座標點(x, y)，來決定該網格是否填滿
                    // 修正：直接使用 y，讓不等式邏輯與網格座標直接對應
                    if (this.pointSatisfiesInequalities(x, y, inequalities)) {
                        points.push({ x, y });
                    }
                }
            }
            
            return points;
        },
        
        // 新增方法：更新哪些目標點已被填土覆蓋
        updateCoveredTargetPoints() {
            this.coveredTargetPoints.clear(); // 清空之前的狀態
            const targetPoints = this.getTargetPointsSet(); // 所有坑洞點
            const allFilledPoints = new Set(this.filledRegions.flat().map(p => `${p.x},${p.y}`)); // 所有已填土的點

            targetPoints.forEach(targetKey => {
                if (allFilledPoints.has(targetKey)) {
                    this.coveredTargetPoints.add(targetKey);
                }
            });
        },

        pointSatisfiesInequalities(x, y, inequalities) {
            return inequalities.every(ineq => {
                const leftValue = this.evaluateExpression(ineq.term, x, y);
                const rightValue = ineq.constant;
                const epsilon = 1e-9; // 用於處理浮點數精度問題的小數容錯值
                
                switch (ineq.operator) {
                    case '>': return leftValue > rightValue + epsilon; // 確保嚴格大於，排除微小誤差導致的邊界值
                    case '<': return leftValue < rightValue - epsilon; // 確保嚴格小於，排除微小誤差導致的邊界值
                    // 對於非嚴格不等式，允許微小誤差，使其包含邊界值
                    case '>=': return leftValue >= rightValue - epsilon;
                    case '<=': return leftValue <= rightValue + epsilon;
                    default: return false;
                }
            });
        },
        
        evaluateExpression(term, x, y) {
            try {
                const scope = { x, y };
                // Try different ways to access math.js
                const mathLib = (typeof math !== 'undefined' ? math : null) || 
                               (typeof window.math !== 'undefined' ? window.math : null);
                
                if (mathLib && mathLib.evaluate) {
                    return mathLib.evaluate(term, scope);
                } else {
                    // Fallback: manual expression evaluation
                    return this.evaluateManually(term, x, y);
                }
            } catch (e) {
                console.error('表達式計算錯誤:', e);
                return this.evaluateManually(term, x, y);
            }
        },

        evaluateManually(term, x, y) {
            // Manual evaluation for basic expressions
            try {
                // Replace variables with values
                let expression = term.replace(/\bx\b/g, x).replace(/\by\b/g, y);
                
                // Handle common mathematical expressions
                expression = expression.replace(/(\d+)x/g, '$1*' + x);
                expression = expression.replace(/(\d+)y/g, '$1*' + y);
                expression = expression.replace(/x(\d+)/g, x + '*$1');
                expression = expression.replace(/y(\d+)/g, y + '*$1');
                
                // Use Function constructor for safe evaluation
                return Function('"use strict"; return (' + expression + ')')();
            } catch (e) {
                console.error('手動計算錯誤:', e);
                // Return a safe default based on the term
                if (term.includes('x') && term.includes('y')) return x + y;
                if (term.includes('x')) return x;
                if (term.includes('y')) return y;
                return 0;
            }
        },
        
        calculateScore() {
            let totalScore = 0;
            const targetPoints = this.getTargetPointsSet();
            const filledPoints = new Set(this.filledRegions.flat().map(p => `${p.x},${p.y}`));
            
            // 計算填中的分數
            let correctFills = 0;
            let overFills = 0;
            
            // 檢查每個網格點
            for (let x = 0; x < 12; x++) {
                for (let y = 0; y < 12; y++) {
                    const pointKey = `${x},${y}`;
                    const isTarget = targetPoints.has(pointKey);
                    const isFilled = filledPoints.has(pointKey);
                    
                    if (isTarget && isFilled) {
                        correctFills++;
                    } else if (!isTarget && isFilled) {
                        overFills++;
                    }
                }
            }
            
            this.score = correctFills * 10 - overFills * 5;
        },
        
        getTargetPointsSet() {
            const points = new Set();
            
            this.currentLevel.targetPoints.forEach(point => {
                points.add(`${point.x},${point.y}`);
            });
            
            return points;
        },
        
        pointInPolygon(x, y, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                if (((polygon[i].y > y) !== (polygon[j].y > y)) &&
                    (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                    inside = !inside;
                }
            }
            return inside;
        },
        
        checkLevelCompletion() {
            const targetPoints = this.getTargetPointsSet();
            const filledPoints = new Set(this.filledRegions.flat().map(p => `${p.x},${p.y}`));
            
            let correctFills = 0;
            let overFills = 0;
            
            for (let x = 0; x < 12; x++) {
                for (let y = 0; y < 12; y++) {
                    const pointKey = `${x},${y}`;
                    const isTarget = targetPoints.has(pointKey);
                    const isFilled = filledPoints.has(pointKey);
                    
                    if (isTarget && isFilled) {
                        correctFills++;
                    } else if (!isTarget && isFilled) {
                        overFills++;
                    }
                }
            }
            
            // 如果完全填滿且沒有多填，關卡完成
            this.levelCompleted = (correctFills === targetPoints.size && overFills === 0);
        },
        
        nextLevel() {
            if (this.currentLevelIndex < this.levels.length - 1) {
                this.currentLevelIndex++;
                this.resetLevel();
            }
        },
        
        resetLevel() {
            this.fillCount = 0;
            this.score = 0;
            this.currentInequalities = [];
            this.filledRegions = [];
            this.coveredTargetPoints.clear(); // 重置已覆蓋的目標點
            this.currentPreview = null;
            this.levelCompleted = false;
            this.drawCanvas();
        },
        
        drawCanvas() {
            const ctx = this.ctx;
            const canvas = this.canvas;
            
            // 清除畫布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 繪製網格
            this.drawGrid();
            
            // 繪製目標區域（坑洞）
            this.drawTargetPoints();
            
            // 繪製已填土區域
            this.drawFilledRegions();
            
            // 繪製預覽區域
            if (this.currentPreview) {
                this.drawPreviewRegion();
            }
        },
        
        drawGrid() {
            const ctx = this.ctx;
            const gridSize = this.gridSize;
            const offset = this.canvasOffset;
            
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            
            // 繪製垂直線
            for (let x = 0; x <= 12; x++) {
                const canvasX = offset.x + x * gridSize;
                ctx.beginPath();
                ctx.moveTo(canvasX, offset.y);
                ctx.lineTo(canvasX, offset.y + 12 * gridSize);
                ctx.stroke();
            }
            
            // 繪製水平線
            for (let y = 0; y <= 12; y++) {
                const canvasY = offset.y + y * gridSize;
                ctx.beginPath();
                ctx.moveTo(offset.x, canvasY);
                ctx.lineTo(offset.x + 12 * gridSize, canvasY);
                ctx.stroke();
            }
            
            // 繪製座標軸標籤
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            for (let i = 0; i <= 12; i++) {
                ctx.fillText(i.toString(), offset.x + i * gridSize - 5, offset.y + 12 * gridSize + 10);
                ctx.fillText(i.toString(), offset.x - 20, offset.y + (12 - i) * gridSize + 5);
            }
        },
        
        drawTargetPoints() {
            const ctx = this.ctx;
            const gridSize = this.gridSize;
            const offset = this.canvasOffset;
            
            // 使用深棕色代表需要填補的點
            ctx.fillStyle = 'rgba(31, 13, 0, 0.9)'; // 坑洞顏色
            
            this.currentLevel.targetPoints.forEach(point => {
                if (this.coveredTargetPoints.has(`${point.x},${point.y}`)) return; // 如果該目標點已被覆蓋，則不繪製
                const canvasX = offset.x + point.x * gridSize;
                const canvasY = offset.y + (11 - point.y) * gridSize;
                
                // 將坑洞繪製為完整的方塊，與填土和預覽邏輯保持一致
                ctx.fillRect(canvasX, canvasY, gridSize, gridSize);
            });
        },
        
        drawFilledRegions() {
            const ctx = this.ctx;
            const gridSize = this.gridSize;
            const offset = this.canvasOffset;
            // 土的顏色
            ctx.fillStyle = 'rgba(76, 78, 0, 0.5)';
            
            this.filledRegions.forEach(region => {
                region.forEach(point => {
                    const canvasX = offset.x + point.x * gridSize;
                    const canvasY = offset.y + (11 - point.y) * gridSize;
                    
                    if (this.coveredTargetPoints.has(`${point.x},${point.y}`)) return; // 如果是已覆蓋的目標點，則不繪製填土
                    ctx.fillRect(canvasX, canvasY, gridSize, gridSize);
                });
            });
        },
        
        drawPreviewRegion() {
            const ctx = this.ctx;
            const gridSize = this.gridSize;
            const offset = this.canvasOffset;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            
            this.currentPreview.forEach(point => {
                const canvasX = offset.x + point.x * gridSize;
                const canvasY = offset.y + (11 - point.y) * gridSize;
                
                ctx.fillRect(canvasX, canvasY, gridSize, gridSize);
            });
        },
        
        onMouseMove(event) {
            // 可以在這裡實現滑鼠互動功能
        }
    }
}).mount('#app');

}

// Start the initialization process
initializeApp();
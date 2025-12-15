// Scoring 類別
class Scoring {
    constructor() {
        this.score = 0;
        this.shots = 0;
        this.highScore = parseInt(localStorage.getItem('basketballHighScore')) || 0;
    }

    updateScore(success) {
        this.shots++;
        if (success) {
            this.score++;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('basketballHighScore', this.highScore);
            }
        }
    }

    getAccuracy() {
        return this.shots === 0 ? 0 : Math.round((this.score / this.shots) * 100);
    }

    reset() {
        this.score = 0;
        this.shots = 0;
    }
}

// 遊戲常數
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.5;
const BALL_RADIUS = 15;

// 難度設定
const DIFFICULTY_SETTINGS = {
    easy: {
        basketSize: 150,
        windEffect: 0,
        scoringZone: 100,
        powerMultiplier: 1.1
    },
    medium: {
        basketSize: 70,
        windEffect: 0.02,
        scoringZone: 80,
        powerMultiplier: 1.0
    },
    hard: {
        basketSize: 60,
        windEffect: 0.05,
        scoringZone: 60,
        powerMultiplier: 0.9
    }
};

// (已移除球員類別)

// Ball 類別
class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = BALL_RADIUS;
        this.isFlying = false;
        this.isStopped = false;
        this.trail = [];
    }

    set x(v) {
        this._x = v;
    }
    get x() {
        return this._x;
    }
    set y(v) {
        this._y = v;
    }
    get y() {
        return this._y;
    }

    update(windEffect, bucket = null) {
        if (this.isFlying) {
            this.vy += GRAVITY;
            this.vx += windEffect;

            let oldX = this.x;
            let oldY = this.y;
            this.x += this.vx;
            this.y += this.vy;

            // 優先處理左右外壁碰撞，確保球不會進入 bucket
            if (bucket) {
                const left = bucket.x;
                const right = bucket.x + bucket.width;
                const top = bucket.y;
                const bottom = bucket.y + bucket.height;
                const thick = bucket.wallThickness;
                const innerLeft = left + thick;
                const innerRight = right - thick;
                
                // DEBUG: 追蹤球的位置相對於 bucket
                const ballLeftEdge = this.x - this.radius;
                const ballRightEdge = this.x + this.radius;
                const ballTopEdge = this.y - this.radius;
                const ballBottomEdge = this.y + this.radius;
                
                // DEBUG: 檢查是否在 bucket 範圍內
                const isInBucketX = ballLeftEdge > left && ballRightEdge < right;
                const isInBucketY = ballTopEdge > top && ballBottomEdge < bottom;
                
                if (isInBucketX && isInBucketY) {
                    console.warn('⚠️ 球穿越進入 bucket 內部！', {
                        ballX: this.x,
                        ballY: this.y,
                        ballLeftEdge,
                        ballRightEdge,
                        bucketLeft: left,
                        bucketRight: right,
                        bucketTop: top,
                        bucketBottom: bottom,
                        vx: this.vx,
                        vy: this.vy,
                        oldX,
                        oldY
                    });
                }
                
                // 左右牆碰撞檢測：只要穿越牆面就立即在外側反彈
                const oldBallLeftEdge = oldX - this.radius;
                const oldBallRightEdge = oldX + this.radius;
                const overlapsWallHeight = ballBottomEdge > top && ballTopEdge < bottom;
                const insideInteriorZone = overlapsWallHeight && ballRightEdge > innerLeft && ballLeftEdge < innerRight;
                const crossedLeftWall = overlapsWallHeight && oldBallRightEdge <= left && ballRightEdge >= left && this.vx > 0;
                const crossedRightWall = overlapsWallHeight && oldBallLeftEdge >= right && ballLeftEdge <= right && this.vx < 0;

                if (crossedLeftWall) {
                    console.log('🔴 Left wall collision detected', {
                        oldX,
                        newX: this.x,
                        oldRightEdge: oldBallRightEdge,
                        newRightEdge: ballRightEdge,
                        wallLeft: left,
                        vx: this.vx,
                        reason: 'crossing from outside'
                    });
                    this.x = left - this.radius - 2; // 直接放在外側
                    this.vx = -Math.abs(this.vx) * 0.8;
                    this.vy *= 0.95;
                    console.log('   → Corrected to:', { x: this.x, vx: this.vx });
                } else if (crossedRightWall) {
                    console.log('🔵 Right wall collision detected', {
                        oldX,
                        newX: this.x,
                        oldLeftEdge: oldBallLeftEdge,
                        newLeftEdge: ballLeftEdge,
                        wallRight: right,
                        vx: this.vx,
                        reason: 'crossing from outside'
                    });
                    this.x = right + this.radius + 2;
                    this.vx = Math.abs(this.vx) * 0.8;
                    this.vy *= 0.95;
                    console.log('   → Corrected to:', { x: this.x, vx: this.vx });
                } else if (insideInteriorZone) {
                    if (ballLeftEdge < innerLeft) {
                        this.x = innerLeft + this.radius;
                        this.vx = Math.abs(this.vx) * 0.7;
                        this.vy *= 0.98;
                        console.log('↩️ Bounce inside left wall');
                    } else if (ballRightEdge > innerRight) {
                        this.x = innerRight - this.radius;
                        this.vx = -Math.abs(this.vx) * 0.7;
                        this.vy *= 0.98;
                        console.log('↪️ Bounce inside right wall');
                    }
                }
                
                // DEBUG: 每幀顯示球相對於牆的位置
                if (Math.abs(this.x - left) < 50 || Math.abs(this.x - right) < 50) {
                    console.log('📍 Ball near wall:', {
                        ballX: this.x,
                        distToLeftWall: ballLeftEdge - left,
                        distToRightWall: right - ballRightEdge,
                        vx: this.vx
                    });
                }
                
                // 其他 bucket 碰撞（頂部、底部等）
                this.checkBucketCollision(bucket);
            }

            // 記錄軌跡
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 20) {
                this.trail.shift();
            }
        }
    }

    // 檢查與地板碰撞
    checkFloorCollision(canvasHeight) {
        const floorY = canvasHeight - 50;
        if (this.y + this.radius >= floorY) {
            this.y = floorY - this.radius;
            this.vy *= -0.7; // 彈跳係數
            this.vx *= 0.95; // 摩擦力
            
            // 如果球幾乎停止移動，標記為停止
            if (Math.abs(this.vy) < 1 && Math.abs(this.vx) < 0.5) {
                this.isStopped = true;
            }
        }
    }

    // 檢查球是否已停止
    hasStopped() {
        return this.isStopped || (this.y >= 350 && Math.abs(this.vy) < 2 && Math.abs(this.vx) < 0.5);
    }

    // 檢查與桶壁碰撞（內部反彈與底部接觸）
    checkBucketCollision(basket) {
        const innerLeft = basket.x + basket.wallThickness;
        const innerRight = basket.x + basket.width - basket.wallThickness;
        const top = basket.y;
        const bottom = basket.y + basket.height - basket.wallThickness;
        const insideHorizontally = this.x + this.radius > innerLeft && this.x - this.radius < innerRight;
        const insideVertically = this.y - this.radius < bottom && this.y + this.radius > top;

        if (!insideHorizontally || !insideVertically) {
            return;
        }

        // 內壁反彈
        if (this.x - this.radius < innerLeft) {
            this.x = innerLeft + this.radius;
            this.vx = Math.abs(this.vx) * 0.6;
        } else if (this.x + this.radius > innerRight) {
            this.x = innerRight - this.radius;
            this.vx = -Math.abs(this.vx) * 0.6;
        }

        // 桶底碰撞
        if (this.y + this.radius > bottom) {
            this.y = bottom - this.radius;
            this.vy = -Math.abs(this.vy) * 0.7;
            this.vx *= 0.9;
            if (Math.abs(this.vy) < 0.6) {
                this.vy = 0;
            }
            if (Math.abs(this.vx) < 0.2) {
                this.vx = 0;
            }

            if (Math.abs(this.vy) === 0 && Math.abs(this.vx) === 0) {
                this.isStopped = true;
                this.isFlying = false;
            }
        }
    }

    draw(ctx) {
        // 繪製軌跡
        if (this.trail.length > 1) {
            ctx.strokeStyle = 'rgba(255, 140, 0, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // 繪製籃球
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FF8C00';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 籃球紋路
        ctx.beginPath();
        ctx.moveTo(this.x - this.radius, this.y);
        ctx.lineTo(this.x + this.radius, this.y);
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x, this.y + this.radius);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isFlying = false;
        this.isStopped = false;
        this.trail = [];
        console.log('Ball reset:', x, y);
    }

    shoot(power, angle) {
        this.vx = power * Math.cos(angle);
        this.vy = power * Math.sin(angle);
        this.isFlying = true;
        this.isStopped = false;
    }
}

// Bucket 類別（地上高桶）
class Basket {
    constructor(difficulty) {
        this.settings = DIFFICULTY_SETTINGS[difficulty];
        this.width = this.settings.basketSize;
        this.height = 140;
        this.wallThickness = 6;
        this.x = CANVAS_WIDTH - this.width - 40; // 靠右側
        this.y = CANVAS_HEIGHT - 50 - this.height; // 底部在地板上方
    }

    updateDifficulty(difficulty) {
        this.settings = DIFFICULTY_SETTINGS[difficulty];
        this.width = this.settings.basketSize;
        this.x = CANVAS_WIDTH - this.width - 40; // 重新貼齊右側
    }

    draw(ctx) {
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        ctx.strokeStyle = '#FF5A36';
        ctx.lineWidth = this.wallThickness;
        ctx.beginPath();
        // 左壁
        ctx.moveTo(left, top);
        ctx.lineTo(left, bottom);
        // 底部
        ctx.lineTo(right, bottom);
        // 右壁
        ctx.lineTo(right, top);
        ctx.stroke();
    }

    checkScore(ball) {
        const left = this.x + this.wallThickness / 2;
        const right = this.x + this.width - this.wallThickness / 2;
        const top = this.y;
        const bottom = this.y + this.height - this.wallThickness / 2;

        const withinX = ball.x > left + ball.radius && ball.x < right - ball.radius;
        const withinY = ball.y > top && ball.y < bottom - ball.radius;
        const enteringFromTop = ball.vy >= 0 && ball.y - ball.radius <= top + 4;

        return withinX && withinY && enteringFromTop;
    }

    settlePosition(ball) {
        // 放在桶內底部中央
        ball.x = this.x + this.width / 2;
        ball.y = this.y + this.height - this.wallThickness - ball.radius;
    }
    reset() {
        this.score = 0;
        this.shots = 0;
    }
}

// Game 類別
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isRunning = false;
        this.difficulty = 'medium';

        // 球的起點設在左下角地面上
        this.ballStartX = 50;
        this.ballStartY = CANVAS_HEIGHT - 50 - BALL_RADIUS;
        this.ball = new Ball(this.ballStartX, this.ballStartY);
        this.basket = new Basket(this.difficulty);
        this.scoring = new Scoring();
        this.scoredBalls = [];

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragEndX = 0;
        this.dragEndY = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // 滑鼠事件
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // 觸控事件
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                // 模擬滑鼠按下
                this.handleMouseDown({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault()
                });
            }
        });
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                // 模擬滑鼠移動
                this.handleMouseMove({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault()
                });
            }
        });
        this.canvas.addEventListener('touchend', (e) => {
            // 模擬滑鼠放開
            this.handleMouseUp({ preventDefault: () => e.preventDefault() });
        });
    }

    handleMouseDown(e) {
        console.log('mousedown at', this.ball.x, this.ball.y, this.isRunning, this.ball.isFlying);
        if (!this.isRunning || this.ball.isFlying) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.isDragging = true;
        // 將起點固定在籃球中心，方便力量/角度線對齊球
        this.dragStartX = this.ball.x;
        this.dragStartY = this.ball.y;
        this.dragEndX = e.clientX - rect.left;
        this.dragEndY = e.clientY - rect.top;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.dragEndX = e.clientX - rect.left;
        this.dragEndY = e.clientY - rect.top;
    }

    handleMouseUp(e) {
        if (!this.isDragging || !this.isRunning) return;

        this.isDragging = false;

        const dx = this.dragEndX - this.dragStartX;
        const dy = this.dragEndY - this.dragStartY;
        const rawPower = Math.sqrt(dx * dx + dy * dy) * 0.12;
        const power = Math.min(rawPower, 900); // 上限避免拖到畫面外
        const angle = Math.atan2(dy, dx);

        console.log('handleMouseUp:', {dx, dy, rawPower, power, angle, dragStartX: this.dragStartX, dragStartY: this.dragStartY, dragEndX: this.dragEndX, dragEndY: this.dragEndY});

        const settings = DIFFICULTY_SETTINGS[this.difficulty];
        this.ball.shoot(power * settings.powerMultiplier, angle);
    }

    start() {
        this.isRunning = true;
        this.gameLoop();
    }

    reset() {
        this.scoring.reset();
        // 球重設到左下角地面上
        this.ball.reset(this.ballStartX, this.ballStartY);
        this.scoredBalls = [];
        this.updateUI();
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.basket.updateDifficulty(difficulty);
    }

    update() {
        if (!this.isRunning) return;

        const settings = DIFFICULTY_SETTINGS[this.difficulty];
        this.ball.update(settings.windEffect, this.basket);
        this.updateScoredBalls();

        // 檢查得分
        if (this.ball.isFlying && this.basket.checkScore(this.ball)) {
            this.scoredBalls.push({
                x: this.ball.x,
                y: this.ball.y,
                vx: this.ball.vx,
                vy: this.ball.vy,
                radius: this.ball.radius,
                isSettled: false
            });
            this.scoring.updateScore(true);
            this.updateUI();
            this.ball.reset(this.ballStartX, this.ballStartY);
            return;
        }

        // 物理碰撞檢測
        this.ball.checkFloorCollision(CANVAS_HEIGHT);
        this.ball.checkBucketCollision(this.basket);

        // 檢查球是否停止或出界
        if (this.ball.hasStopped() || 
            this.ball.y > CANVAS_HEIGHT + 100 || 
            this.ball.x < -100 || 
            this.ball.x > CANVAS_WIDTH + 100) {
            if (this.ball.isFlying) {
                this.scoring.updateScore(false);
                this.updateUI();
                this.ball.reset(this.ballStartX, this.ballStartY);
            }
        }
    }

    updateScoredBalls() {
        if (this.scoredBalls.length === 0) {
            return;
        }

        const innerLeft = this.basket.x + this.basket.wallThickness;
        const innerRight = this.basket.x + this.basket.width - this.basket.wallThickness;
        const top = this.basket.y;
        const bottom = this.basket.y + this.basket.height - this.basket.wallThickness;

        this.scoredBalls.forEach((ball) => {
            if (ball.isSettled) {
                return;
            }

            ball.vy += GRAVITY;
            ball.x += ball.vx;
            ball.y += ball.vy;

            if (ball.x - ball.radius < innerLeft) {
                ball.x = innerLeft + ball.radius;
                ball.vx = Math.abs(ball.vx) * 0.6;
            } else if (ball.x + ball.radius > innerRight) {
                ball.x = innerRight - ball.radius;
                ball.vx = -Math.abs(ball.vx) * 0.6;
            }

            if (ball.y + ball.radius > bottom) {
                ball.y = bottom - ball.radius;
                ball.vy = -Math.abs(ball.vy) * 0.65;
                ball.vx *= 0.9;

                if (Math.abs(ball.vy) < 0.4) {
                    ball.vy = 0;
                }
                if (Math.abs(ball.vx) < 0.2) {
                    ball.vx = 0;
                }

                if (ball.vx === 0 && ball.vy === 0) {
                    ball.isSettled = true;
                }
            }
        });
    }

    draw() {

        // 清空畫布
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 繪製地板
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);

        // 繪製草地效果
        this.ctx.fillStyle = '#2E7D32';
        for (let i = 0; i < 20; i++) {
            this.ctx.fillRect(i * 40, CANVAS_HEIGHT - 50, 30, 5);
        }

        // 繪製遊戲元素
        this.basket.draw(this.ctx);
        // 已得分的球保留在桶內
        this.scoredBalls.forEach((b) => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#FF8C00';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // 球面紋路，維持與主球一致
            this.ctx.beginPath();
            this.ctx.moveTo(b.x - b.radius, b.y);
            this.ctx.lineTo(b.x + b.radius, b.y);
            this.ctx.moveTo(b.x, b.y - b.radius);
            this.ctx.lineTo(b.x, b.y + b.radius);
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
        this.ball.draw(this.ctx);

        // 繪製瞄準線
        if (this.isDragging) { // 修正語法錯誤，加入括號
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.dragStartX, this.dragStartY);
            this.ctx.lineTo(this.dragEndX, this.dragEndY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // 顯示力量與角度指示
            const dx = this.dragEndX - this.dragStartX;
            const dy = this.dragEndY - this.dragStartY;
            const power = Math.sqrt(dx * dx + dy * dy);
            const angleDeg = Math.abs(Math.round((Math.atan2(dy, dx) * 180) / Math.PI));
            this.ctx.fillStyle = '#000';
            this.ctx.font = '15px Arial';
            this.ctx.fillText(`力量: ${Math.round(power)}`, this.dragStartX, this.dragStartY - 12);
            this.ctx.fillText(`角度: ${angleDeg}°`, this.dragStartX, this.dragStartY + 6);
        }
    }

    updateUI() {
        document.getElementById('score').textContent = `得分: ${this.scoring.score}`;
        document.getElementById('shotsInfo').textContent = this.scoring.shots;
        document.getElementById('accuracyInfo').textContent = `${this.scoring.getAccuracy()}%`;
        document.getElementById('highScoreInfo').textContent = this.scoring.highScore;
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 初始化遊戲
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// 事件監聽器
document.getElementById('startGame').addEventListener('click', () => {
    game.start();
    document.getElementById('startGame').textContent = '遊戲進行中...';
    document.getElementById('startGame').disabled = true;
});

document.getElementById('resetGame').addEventListener('click', () => {
    game.reset();
    document.getElementById('startGame').textContent = '開始遊戲';
    document.getElementById('startGame').disabled = false;
    game.isRunning = false;
});

document.getElementById('difficultySelect').addEventListener('change', (e) => {
    game.setDifficulty(e.target.value);
});

// 初始化 UI
game.updateUI();

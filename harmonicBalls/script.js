class Ball {
    constructor(element, circleContainer, circleRadius, initialAngle, offsetAngle) {
        this.element = element;
        this.circleContainer = circleContainer;
        this.circleRadius = circleRadius;
        this.angle = offsetAngle;
        this.speed = 0.05;
        this.amplitude = circleRadius - 10;
        this.initialAngle = initialAngle;

        this.pathElement = document.createElement('div');
        this.pathElement.classList.add('path');
        this.circleContainer.appendChild(this.pathElement);
    }

    update() {
        // 計算小球位置（相對於圓形容器）
        const x = this.circleRadius + Math.cos(this.angle) * this.amplitude * Math.cos(this.initialAngle);
        const y = this.circleRadius + Math.cos(this.angle) * this.amplitude * Math.sin(this.initialAngle);

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;

        this.angle = (this.angle + this.speed) % (2 * Math.PI);
        this.drawPath();
    }

    drawPath() {
        const centerX = this.circleRadius;
        const centerY = this.circleRadius;
        
        // 計算路徑的起點和終點
        const startX = centerX + this.amplitude * Math.cos(this.initialAngle);
        const startY = centerY + this.amplitude * Math.sin(this.initialAngle);
        const endX = centerX - this.amplitude * Math.cos(this.initialAngle);
        const endY = centerY - this.amplitude * Math.sin(this.initialAngle);

        // 計算路徑長度
        const distance = 2 * this.amplitude;
        
        // 計算路徑角度
        const angle = this.initialAngle * (180 / Math.PI);

        // 設置路徑樣式
        this.pathElement.style.position = 'absolute';
        this.pathElement.style.width = `${distance}px`;
        this.pathElement.style.height = '2px';
        //this.pathElement.style.backgroundColor = '#Fcc';
        
        // 設置路徑位置（相對於圓形容器）
        this.pathElement.style.left = `${endX}px`;
        this.pathElement.style.top = `${endY}px`;
        
        this.pathElement.style.transform = `rotate(${angle}deg)`;
        this.pathElement.style.transformOrigin = '0 50%';
    }
    // 清理方法
    cleanup() {
        this.element.remove();
        this.pathElement.remove();
    }    
}

// 控制小球的主要功能
class BallController {
    constructor() {
        this.circleRadius = 150;
        this.circleElement = document.getElementById('circle');
        this.balls = [];
        this.numberOfBalls = 6; // 預設數量
        this.animationId = null;
    }

    createBalls() {
        // 清理現有的小球
        this.cleanup();
        
        const angleIncrement = Math.PI / this.numberOfBalls;
        
        for (let i = 0; i < this.numberOfBalls; i++) {
            const ballElement = document.createElement('div');
            ballElement.classList.add('ball');
            this.circleElement.appendChild(ballElement);

            const initialAngle = i * angleIncrement;
            const offsetAngle = i * Math.PI / this.numberOfBalls;
            
            const ball = new Ball(
                ballElement,
                this.circleElement,
                this.circleRadius,
                initialAngle,
                offsetAngle
            );
            this.balls.push(ball);
        }
    }

    cleanup() {
        // 停止動畫
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        // 清理所有小球
        this.balls.forEach(ball => ball.cleanup());
        this.balls = [];
    }

    animate() {
        this.balls.forEach(ball => ball.update());
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    increaseBalls() {
        if (this.numberOfBalls < 20) {
            this.numberOfBalls++;
            this.createBalls();
            this.animate();
            this.updateBallCount();
        }
    }

    decreaseBalls() {
        if (this.numberOfBalls > 1) {
            this.numberOfBalls--;
            this.createBalls();
            this.animate();
            this.updateBallCount();
        }
    }

    updateBallCount() {
        const countDisplay = document.getElementById('ballCount');
        if (countDisplay) {
            countDisplay.textContent = this.numberOfBalls;
        }
    }
}

// 初始化
function init() {
    //createControls();
    
    const controller = new BallController();
    controller.createBalls();
    controller.animate();

    // 添加按鈕事件監聽
    document.getElementById('increaseBtn').addEventListener('click', () => {
        controller.increaseBalls();
    });

    document.getElementById('decreaseBtn').addEventListener('click', () => {
        controller.decreaseBalls();
    });
}

// 啟動應用
init();
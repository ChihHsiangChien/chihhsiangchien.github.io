const canvas = document.getElementById('galtonBoard');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startSimulation');
const ballCountInput = document.getElementById('ballCount');

const distributionContainer = document.getElementById('distribution');

let width = 700;
let height = 600;
canvas.width = width; // 設定初始寬度
canvas.height = height;

const ballCount = 500;
ballCountInput.value = ballCount;


// 摩擦係數 (小於 1)
const friction = 0.95; // 可以根據需要調整這個值
const gravity = 0.3;

// Global variables for pin spacing
let pinXSpacing = 18;  // Horizontal distance between pins
let pinYSpacing = 20;  // Vertical distance between pin rows
const pinsRows = 20;
const pinsColumns = 40;
const pinRadius = 3;
const ballRadius = 5;
const binCount = pinsColumns + 1;
const bins = new Array(binCount).fill(0);



class Pin {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    // 簡單的碰撞檢測方法
    checkCollision(ball) {
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < ball.radius + this.radius;
    }
}

class Ball {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.settled = false;
    }

    update() {
        if (this.settled) return;

        this.x += this.vx;
        this.y += this.vy;
        
        this.vy += gravity; // 重力
        // 摩擦力
        this.vx *= friction;

        
    }

    checkBounds() {
        if (this.x < this.radius || this.x > width - this.radius) {
            this.vx *= -0.6;
        }

        if (this.y > height - this.radius) {
            const binWidth = width / binCount;
            const binIndex = Math.floor(this.x / binWidth);

            // Calculate the hexagonal close-packing offset for the current bin
            const isEvenRow = bins[binIndex] % 2 === 0; // Alternate rows for offset
            const horizontalOffset = isEvenRow ? 0 : this.radius; // Offset every other row

            //if (bins[binIndex] < 10000) { 

                // Hexagonal packing: place the ball offset horizontally if necessary
                this.x = binIndex * binWidth + binWidth / 2 + horizontalOffset;
                this.y = height - this.radius - bins[binIndex] * this.radius * 1.732; // 1.732 is the height ratio for hexagonal packing
                
                this.vy = 0;
                this.vx = 0;
                this.settled = true;
                bins[binIndex]++;
                updateDistribution();               
            //} else {
            //    this.vy *= -0.5;
            //    this.y = height - this.radius;
            //}
        }
    }
}

const pins = [];
const balls = [];

// 初始化釘子
// Initialize pins
function createPins() {
    for (let i = 0; i < pinsRows; i++) {
        // Calculate number of columns per row: alternate rows have fewer pins
        const columns = i % 2 === 0 ? pinsColumns : pinsColumns - 1;
        
        // Offset for alternate rows
        const offset = i % 2 === 0 ? 0 : pinXSpacing / 2; 
        
        // Create pins in each row
        for (let j = 0; j < columns; j++) {
            const x = offset + j * pinXSpacing;
            const y = (i + 1) * pinYSpacing;
            
            pins.push(new Pin(x, y, pinRadius));
        }
    }
}
function getPinsInRange(x, y) {
    const range = ballRadius * 2;  // 檢查範圍
    return pins.filter(pin => Math.abs(pin.x - x) < range && Math.abs(pin.y - y) < range);
}

function updateBall(ball) {
    ball.update();

    // 只檢查靠近的小釘子
    const nearbyPins = getPinsInRange(ball.x, ball.y);
    for (const pin of nearbyPins) {
        if (pin.checkCollision(ball)) {
            const angle = Math.atan2(ball.y - pin.y, ball.x - pin.x);
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = Math.cos(angle) * speed * friction;
            ball.vy = Math.sin(angle) * speed * friction;

            ball.vy *= 0.6;
        }
    }

    ball.checkBounds();

    // 確保小球不會完全停止
    if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && !ball.settled) {
        const angle = Math.random() * Math.PI;
        const speed = 0.5 + Math.random() * 0.5;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = -Math.abs(Math.sin(angle) * speed);
    }
}

function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
}

const yOffset = 0;  // 设置 Y 轴偏移量, 增加偏移量

function drawBoard() {
    ctx.clearRect(0, 0, width, height);
    
    // 畫釘子
    pins.forEach(pin => {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y + yOffset, pin.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
    });
    
}


function updateDistribution() {
    distributionContainer.innerHTML = '';
    const maxBinHeight = Math.max(...bins);

    // 計算畫布內容寬度
    const leftMostPinX = pins[0].x;
    const rightMostPinX = pins[pins.length - 1].x; // 假設pins按x座標排序
    const contentWidth = rightMostPinX - leftMostPinX;

    distributionContainer.style.width = `${contentWidth}px`; // 設定統計圖寬度
    distributionContainer.style.marginLeft = `${leftMostPinX}px`;
    bins.forEach((count, index) => {
        const bin = document.createElement('div');
        bin.className = 'bin';
        bin.style.height = `${(count / maxBinHeight) * 100}%`;
        distributionContainer.appendChild(bin);
    });
}

/*
function animate() {
    ctx.clearRect(0, 0, width, height);
    drawBoard();
    
    balls.forEach(ball => {
        updateBall(ball);
        drawBall(ball);
    });
    
    requestAnimationFrame(animate);
}

*/



function animate() {
    ctx.clearRect(0, 0, width, height);
    drawBoard();
    
    balls.forEach(ball => {
        updateBall(ball);  // Update the ball's position and velocity
        drawBall(ball);    // Draw the ball on the canvas
    });

    if (balls.some(ball => !ball.settled)) {  // Continue animation if any ball is still moving
        requestAnimationFrame(animate);
    } else {
        animationRunning = false;  // Reset the flag when all balls have settled
    }
}
/*
startButton.addEventListener('click', () => {
    const ballCount = parseInt(ballCountInput.value);
    balls.length = 0;  // 清除舊的球
    for (let i = 0; i < ballCount; i++) {
        balls.push(new Ball(1/2*width, Math.random() * (-100), ballRadius));
    }
    bins.fill(0);
    updateDistribution();
    animate();
});

*/

let animationRunning = false;  // Flag to track if animation is running

startButton.addEventListener('click', () => {
    const ballCount = parseInt(ballCountInput.value);
    if (ballCount > 10000) {  // Check if ball count exceeds the limit
        alert("太多啦");
        return;  // Exit early if the limit is exceeded
    }    
    balls.length = 0;  // Clear old balls
    for (let i = 0; i < ballCount; i++) {
        balls.push(new Ball(width / 2 + (Math.random() - 0.5) * 50, Math.random() * (-100), ballRadius));
    }
    bins.fill(0);
    updateDistribution();

    if (!animationRunning) {
        animationRunning = true;  // Set flag to prevent multiple animations
        animate();  // Start animation
    }
});

createPins();
drawBoard();

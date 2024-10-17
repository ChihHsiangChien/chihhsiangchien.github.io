const canvas = document.getElementById('galtonBoard');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startSimulation');
const ballCountInput = document.getElementById('ballCount');
const distributionContainer = document.getElementById('distribution');

const width = 600;
const height = 850;
canvas.width = width;
canvas.height = height;

// 摩擦係數 (小於 1)
const friction = 0.95; // 可以根據需要調整這個值
const gravity = 0.1;
const pinsRows = 10;
const pinsColumns = 20;
const pinRadius = 3;
const ballRadius = 5;
const binCount = pinsColumns + 1;
const bins = new Array(binCount).fill(0);

let balls = [];

function drawBoard() {
    ctx.clearRect(0, 0, width, height);
    
    
    // 畫釘子
    for (let i = 0; i < pinsRows; i++) {
        const columns = i % 2 === 0 ? pinsColumns : pinsColumns - 1;
        const offset = i % 2 === 0 ? 0 : width / (pinsColumns * 2);
        
        for (let j = 0; j < columns; j++) {
            const x = 10 + offset + j * (width / pinsColumns);
            const y = (i + 1) * (height*.75 / (pinsRows + 5));
            ctx.beginPath();
            ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
        }
    }
}

function createBall() {
    return {
        x: 1/2*width,
        y: 0,
        vx: 0,
        vy: 0,
        settled: false
    };
}

function updateBall(ball) {
    if (ball.settled) return;

    ball.x += ball.vx;
    ball.y += ball.vy;
    
    ball.vy += gravity; // 重力
    
    // 摩擦力
    ball.vx *= friction;
    ball.vy *= friction;

    // 碰撞檢測和反彈
    for (let i = 0; i < pinsRows; i++) {
        const columns = i % 2 === 0 ? pinsColumns : pinsColumns - 1;
        const offset = i % 2 === 0 ? 0 : width / (pinsColumns * 2);
        for (let j = 0; j < columns; j++) {

            const pinX = 10 + offset + j * (width / pinsColumns);
            const pinY = (i + 1) * (height*.75 / (pinsRows + 5));
            
            const dx = ball.x - pinX;
            const dy = ball.y - pinY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < ballRadius + pinRadius) {
                const angle = Math.atan2(dy, dx);
                
                // 原來的速度方向
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                

                
                // 更新速度方向並將速度大小乘以摩擦係數
                ball.vx = Math.cos(angle) * speed * friction;
                ball.vy = Math.sin(angle) * speed * friction;
            
                // 如果速度過小，增加隨機性
                if (Math.abs(ball.vx) < 0.01 && Math.abs(dy) < 0.01) {
                    ball.vx = (Math.random() - 0.5) * 2;
                }
            }
        }
    }
    
    // 邊界檢查
    if (ball.x < ballRadius || ball.x > width - ballRadius) {
        ball.vx *= -0.6;
    }

    // 檢查是否進入底部收集區
    if (ball.y > height - ballRadius) {
        const binWidth = width / binCount;
        const binIndex = Math.floor(ball.x / binWidth);
        if (bins[binIndex] < 1000) { // 限制每個槽最多10個球
            ball.y = height - ballRadius - bins[binIndex] * ballRadius * 2;
            ball.vy = 0;
            ball.vx = 0;
            ball.settled = true;
            bins[binIndex]++;
            updateDistribution();
        } else {
            ball.vy *= -0.5;
            ball.y = height - ballRadius;
        }
    }

    // 確保小球不會完全停止
    if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && !ball.settled) {
        const angle = Math.random() * Math.PI;
        //const angle = 0.5*Math.PI;

        const speed = 0.5 + Math.random() * 0.5;
        //const speed = 2;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = -Math.abs(Math.sin(angle) * speed);
    }
}

function drawBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}


function updateDistribution() {
    distributionContainer.innerHTML = '';
    const maxBinHeight = Math.max(...bins);
    bins.forEach((count, index) => {
        const bin = document.createElement('div');
        bin.className = 'bin';
        bin.style.height = `${(count / maxBinHeight) * 100}%`;
        distributionContainer.appendChild(bin);
    });
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    drawBoard();
    
    balls.forEach(ball => {
        updateBall(ball);
        drawBall(ball);
    });
    
    requestAnimationFrame(animate);
}

startButton.addEventListener('click', () => {
    const ballCount = parseInt(ballCountInput.value);
    balls = Array(ballCount).fill().map(createBall);
    bins.fill(0);
    updateDistribution();
    animate();
});

drawBoard();
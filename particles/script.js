// 設定畫布和粒子參數
const canvas = document.getElementById('brownianCanvas');
const ctx = canvas.getContext('2d');
const particlesCount = 1000; // 粒子的數量
const particleRadius = 5;
const particleSpeed = 2; // 每次移動的像素範圍
let particles = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 初始化粒子，所有粒子隨機分布在畫布中
function initializeParticles() {
    for (let i = 0; i < particlesCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() * 2 - 1) * particleSpeed,
            vy: (Math.random() * 2 - 1) * particleSpeed,
            radius: particleRadius,
            mass: 1,  // 假設每個粒子的質量相同
            color: 'white' // 初始顏色
        });
    }
}

// 更新粒子位置，並處理邊界碰撞
function updateParticles() {
    particles.forEach(particle => {
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 檢查是否碰到邊界，若碰到則反彈
        if (particle.x - particle.radius < 0 || particle.x + particle.radius > canvas.width) {
            particle.vx = -particle.vx;
        }
        if (particle.y - particle.radius < 0 || particle.y + particle.radius > canvas.height) {
            particle.vy = -particle.vy;
        }
    });

    // 處理粒子之間的碰撞
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            let p1 = particles[i];
            let p2 = particles[j];

            // 計算兩個粒子之間的距離
            let dx = p1.x - p2.x;
            let dy = p1.y - p2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // 如果距離小於兩個粒子的半徑之和，則發生碰撞
            if (distance < p1.radius + p2.radius) {
                resolveCollision(p1, p2);
            }
        }
    }
}

// 解決粒子之間的碰撞
function resolveCollision(p1, p2) {
    const xVelocityDiff = p1.vx - p2.vx;
    const yVelocityDiff = p1.vy - p2.vy;

    const xDist = p2.x - p1.x;
    const yDist = p2.y - p1.y;

    // 防止重疊
    if (xVelocityDiff * xDist + yVelocityDiff * yDist >= 0) {
        // 計算角度
        const angle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);

        // 初始速度
        const u1 = rotate(p1.vx, p1.vy, angle);
        const u2 = rotate(p2.vx, p2.vy, angle);

        // 碰撞後的速度（假設質量相同）
        const v1 = { x: u2.x, y: u1.y };
        const v2 = { x: u1.x, y: u2.y };

        // 旋轉回去
        const finalV1 = rotate(v1.x, v1.y, -angle);
        const finalV2 = rotate(v2.x, v2.y, -angle);

        // 更新粒子的速度
        p1.vx = finalV1.x;
        p1.vy = finalV1.y;
        p2.vx = finalV2.x;
        p2.vy = finalV2.y;
    }
}

// 旋轉粒子的速度
function rotate(vx, vy, angle) {
    return {
        x: vx * Math.cos(angle) - vy * Math.sin(angle),
        y: vx * Math.sin(angle) + vy * Math.cos(angle)
    };
}

// 繪製粒子
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除畫布

    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        ctx.closePath();
    });
}

// 滑鼠點擊事件，改變距離滑鼠最近的粒子顏色
canvas.addEventListener('click', function(event) {
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    let closestParticle = null;
    let minDistance = Infinity;

    // 找到距離滑鼠最近的粒子
    particles.forEach(particle => {
        // 計算滑鼠點擊和粒子之間的距離
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 檢查是否是最近的粒子
        if (distance < minDistance) {
            minDistance = distance;
            closestParticle = particle;
        }
    });

    // 如果找到最近的粒子，改變它的顏色
    if (closestParticle) {
        closestParticle.color = getRandomColor();
    }
});

// 隨機產生顏色
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 動畫循環
function animate() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animate); // 呼叫下一幀
}

// 初始化並開始動畫
initializeParticles();
animate();

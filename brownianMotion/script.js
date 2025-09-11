// 設定畫布和粒子參數
const canvas = document.getElementById('brownianCanvas');
const ctx = canvas.getContext('2d');
const particlesCount = 1000; // 粒子的數量
const particleRadius = 3;
const particleSpeed = 2; // 每次移動的像素範圍
let particles = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 初始化粒子，所有粒子起始於畫布的中心
function initializeParticles() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particlesCount; i++) {
        particles.push({
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0
        });
    }
}

// 隨機方向移動
function updateParticles() {
    particles.forEach(particle => {
        // 隨機選擇x和y方向的速度
        particle.vx = (Math.random() * 2 - 1) * particleSpeed;
        particle.vy = (Math.random() * 2 - 1) * particleSpeed;

        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 保持粒子在畫布邊界內
        if (particle.x < particleRadius) particle.x = particleRadius;
        if (particle.x > canvas.width - particleRadius) particle.x = canvas.width - particleRadius;
        if (particle.y < particleRadius) particle.y = particleRadius;
        if (particle.y > canvas.height - particleRadius) particle.y = canvas.height - particleRadius;
    });
}

// 繪製粒子
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除畫布

    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,0,0,0.8)'; // 紅色帶透明度
        ctx.fill();
        ctx.closePath();
    });
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

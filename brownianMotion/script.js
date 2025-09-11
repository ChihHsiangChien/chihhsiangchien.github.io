// 設定畫布和粒子參數
const canvas = document.getElementById('brownianCanvas');
const ctx = canvas.getContext('2d');
const particlesPerClick = 100; // 每次點擊產生的粒子數量
const particleRadius = 3;
const particleSpeed = 2; // 每次移動的像素範圍
let particles = [];
let currentColor = 'rgba(255,0,0,0.8)';

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// 將hex顏色轉rgba字串
function hexToRgba(hex, alpha=0.8) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// 在指定位置新增一批粒子，帶顏色
function addParticlesAt(x, y) {
    for (let i = 0; i < particlesPerClick; i++) {
        particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            color: currentColor
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
        ctx.fillStyle = particle.color || 'rgba(255,0,0,0.8)';
        ctx.fill();
        ctx.closePath();
    });
}
// 顏色選擇器事件
const colorPicker = document.getElementById('colorPicker');
if (colorPicker) {
    colorPicker.addEventListener('input', function(e) {
        currentColor = hexToRgba(e.target.value, 0.8);
    });
}


// 動畫循環
function animate() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animate); // 呼叫下一幀
}

// 監聽滑鼠點擊事件
canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addParticlesAt(x, y);
});

// 監聽觸控事件
canvas.addEventListener('touchstart', function(e) {
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
        const x = e.touches[i].clientX - rect.left;
        const y = e.touches[i].clientY - rect.top;
        addParticlesAt(x, y);
    }
});

// 開始動畫循環
animate();

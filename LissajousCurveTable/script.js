const canvas = document.getElementById('lissajousCanvas');
const ctx = canvas.getContext('2d');
let speed = 1;
let time = 0;

// 設定畫布大小
canvas.width = 500;
canvas.height = 500;

// 定義曲線參數
const size = 8; 
const ratio = 3 ;
const cellSize = canvas.width / size;

function drawTrackingDot(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawCurve(x0, y0, freqX, freqY, col, row) {
    ctx.beginPath();
    
    // 使用固定數量的點來繪製完整曲線
    const points = 100;
    for (let i = 0; i <= points; i++) {
        // 將 t 限制在 0 到 2π 之間
        const t = (i / points) * Math.PI * 2 + time;
        let x, y;
        
        if (row === 0 && col > 0) {
            x = x0 + (cellSize/ratio) * Math.cos(freqX * t);
            y = y0 + (cellSize/ratio) * Math.sin(freqX * t);
        }
        else if (col === 0 && row > 0) {
            x = x0 + (cellSize/ratio) * Math.cos(freqY * t);
            y = y0 + (cellSize/ratio) * Math.sin(freqY * t);
        }
        else if (row > 0 && col > 0) {
            x = x0 + (cellSize/ratio) * Math.cos(freqX * t);
            y = y0 + (cellSize/ratio) * Math.sin(freqY * t);
        }
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.strokeStyle = `hsl(${(freqX + freqY) * 30}, 80%, 50%)`;
    ctx.stroke();
    
    // 繪製跟蹤點
    if (!((row === 0 && col === 0) || (row > 0 && col > 0))) {
        const t = time;
        let currentX, currentY;
        
        if (row === 0 && col > 0) {
            currentX = x0 + (cellSize/ratio) * Math.cos(freqX * t);
            currentY = y0 + (cellSize/ratio) * Math.sin(freqX * t);
        } else if (col === 0 && row > 0) {
            currentX = x0 + (cellSize/ratio) * Math.cos(freqY * t);
            currentY = y0 + (cellSize/ratio) * Math.sin(freqY * t);
        }
        
        drawTrackingDot(currentX, currentY, ctx.strokeStyle);
    }
    
    if (row > 0 && col > 0) {
        const t = time;
        const currentX = x0 + (cellSize/ratio) * Math.cos(freqX * t);
        const currentY = y0 + (cellSize/ratio) * Math.sin(freqY * t);
        drawTrackingDot(currentX, currentY, ctx.strokeStyle);
    }
}

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const centerX = (col + 0.5) * cellSize;
            const centerY = (row + 0.5) * cellSize;
            
            if (!(row === 0 && col === 0)) {
                drawCurve(centerX, centerY, col, row, col, row);
            }
        }
    }
    
    // 讓時間在 0 到 2π 之間循環
    time = (time + 0.02 * speed) % (Math.PI * 2);
    requestAnimationFrame(draw);
}

// 速度控制
document.getElementById('speedUp').addEventListener('click', () => {
    speed = Math.min(speed + 0.5, 5);
    updateSpeedDisplay();
});

document.getElementById('speedDown').addEventListener('click', () => {
    speed = Math.max(speed - 0.5, 0.5);
    updateSpeedDisplay();
});

function updateSpeedDisplay() {
    document.getElementById('speedDisplay').textContent = `Speed: ${speed}x`;
}

// 開始動畫
draw();
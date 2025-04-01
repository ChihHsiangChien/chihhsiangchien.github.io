const canvas = document.getElementById('unitCircleCanvas');
const ctx = canvas.getContext('2d');

// 取得顯示數值的元素
const angleDisplay = document.getElementById('angleDisplay');
const radianDisplay = document.getElementById('radianDisplay');
const sinDisplay = document.getElementById('sinDisplay');
const cosDisplay = document.getElementById('cosDisplay');
const tanDisplay = document.getElementById('tanDisplay');

// 顏色 (從 CSS Variables 取得或直接定義)
const colors = {
    primary: getComputedStyle(document.documentElement).getPropertyValue('--primary-accent').trim() || '#4a90e2',
    sin: getComputedStyle(document.documentElement).getPropertyValue('--sin-color').trim() || '#FF6B6B',
    cos: getComputedStyle(document.documentElement).getPropertyValue('--cos-color').trim() || '#4ECDC4',
    tan: getComputedStyle(document.documentElement).getPropertyValue('--tan-color').trim() || '#FFA94D',
    point: getComputedStyle(document.documentElement).getPropertyValue('--point-color').trim() || '#5a67d8',
    arc: getComputedStyle(document.documentElement).getPropertyValue('--arc-color').trim() || 'rgba(74, 144, 226, 0.5)',
    grid: '#e0e0e0', // 網格線顏色
    textLabel: '#555' // 標籤文字顏色
};

let canvasSize, radius, centerX, centerY;
let currentAngle = Math.PI / 4; // 初始角度 (45度)
let isDragging = false;

// 設定 Canvas 尺寸並計算相關變數
function setupCanvas() {
    const containerWidth = canvas.parentElement.clientWidth * 0.9; // 基於容器寬度
    const maxCanvasSize = 500; // 最大尺寸限制
    canvasSize = Math.min(containerWidth, maxCanvasSize);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    radius = canvasSize * 0.35; // 單位圓半徑
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    drawAll(); // 重新繪製
}

// 繪製所有元素
function drawAll() {
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製坐標軸
    drawAxes();

    // 繪製單位圓
    drawUnitCircle();

    // 計算點的座標
    const pointX = centerX + radius * Math.cos(currentAngle);
    const pointY = centerY - radius * Math.sin(currentAngle); // Y軸向下為正，所以用減號

    // 繪製角度弧線
    drawAngleArc(currentAngle);


    // 繪製半徑線
    drawRadiusLine(pointX, pointY);

    // 繪製 Sin, Cos, Tan 線段
    drawTrigLines(pointX, pointY, currentAngle);



    // 繪製可拖曳的點
    drawDraggablePoint(pointX, pointY);

    // 繪製文字標籤 (sin, cos, tan)
    drawLabels(pointX, pointY, currentAngle);

    // 更新顯示的數值
    updateInfoPanel(currentAngle);
}

// 繪製坐標軸
function drawAxes() {
    ctx.beginPath();
    ctx.strokeStyle = colors.grid; // 較淡的軸線顏色
    ctx.lineWidth = 1;

    // X軸
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);

    // Y軸
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    // 軸標籤 (X, Y)
    ctx.fillStyle = colors.textLabel;
    ctx.font = '14px sans-serif';
    ctx.fillText('X', canvas.width - 15, centerY - 5);
    ctx.fillText('Y', centerX + 5, 15);
    // 刻度標記 (1, -1)
    ctx.fillText('1', centerX + radius + 5, centerY + 15);
    ctx.fillText('-1', centerX - radius - 15, centerY + 15);
    ctx.fillText('1', centerX + 5, centerY - radius - 5);
    ctx.fillText('-1', centerX + 5, centerY + radius + 15);
}

// 繪製單位圓
function drawUnitCircle() {
    ctx.beginPath();
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// 繪製半徑線
function drawRadiusLine(x, y) {
    ctx.beginPath();
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

// 繪製可拖曳的點
function drawDraggablePoint(x, y) {
    ctx.beginPath();
    ctx.fillStyle = colors.point;
    ctx.arc(x, y, 8, 0, Math.PI * 2); // 點的大小
    ctx.fill();
}

// 繪製角度弧線
function drawAngleArc(angle) {
    ctx.beginPath();
    ctx.strokeStyle = colors.arc;
    ctx.lineWidth = 4; // 弧線加粗
    // arc(x, y, radius, startAngle, endAngle, anticlockwise)
    // Canvas 的角度是從 X 軸正方向順時針計算的，所以 sin 的角度需要反轉
    // 畫出來的弧線是從 X 軸正方向開始，然後逆時針畫到當前角度，可以超過180度
    ctx.arc(centerX, centerY, radius*0.3, 0, -angle, angle > 0); // 根據角度方向繪製
    ctx.stroke();
    

    //


    //ctx.arc(centerX, centerY, radius * 0.3, 0, -angle, angle > 0); // 根據角度方向繪製
    //ctx.stroke();

    // 繪製角度文字 (θ)
    const angleTextRadius = radius * 0.4;
    const textAngle = -angle / 2; // 文字放在弧線中間
    const textX = centerX + angleTextRadius * Math.cos(textAngle);
    const textY = centerY + angleTextRadius * Math.sin(textAngle);
    ctx.fillStyle = colors.primary;
    ctx.font = 'italic 16px serif';
    ctx.fillText('θ', textX, textY);
}

// 繪製 Sin, Cos, Tan 線段
function drawTrigLines(pointX, pointY, angle) {
    const cosValue = Math.cos(angle);
    const sinValue = Math.sin(angle);

    // Cosine 線段 (X軸投影) - 從圓心到點的X座標投影處
    ctx.beginPath();
    ctx.strokeStyle = colors.cos;
    ctx.lineWidth = 3;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointX, centerY); // 水平線段
    ctx.stroke();

    // Sine 線段 (Y軸投影) - 從點垂直連線到X軸
    ctx.beginPath();
    ctx.strokeStyle = colors.sin;
    ctx.lineWidth = 3;
    ctx.moveTo(pointX, centerY);
    ctx.lineTo(pointX, pointY); // 垂直線段
    ctx.stroke();

    // Tangent 線段 (在 x=1 處的切線)
    if (Math.abs(cosValue) > 0.001) { // 避免 cos(angle) 接近 0 時無限大
        const tanValue = sinValue / cosValue;
        const tanLineY = centerY - radius * tanValue; // Y軸向下為正
        const tanLineStartX = centerX + radius;

        // 只在合理範圍內繪製 Tan 線
        const maxTanDrawLength = canvasSize * 1.0; // 限制 Tan 線的最大繪製長度
        const tanDrawY = Math.max(centerY - maxTanDrawLength, Math.min(centerY + maxTanDrawLength, tanLineY));


        ctx.strokeStyle = colors.tan;      


        // 切線本體 (從點連到 x=1 的切點)
        ctx.beginPath();        
        ctx.strokeStyle = colors.primary;                
        ctx.lineWidth = 2;        
        ctx.moveTo(pointX, pointY);
        ctx.lineTo(tanLineStartX, tanLineY); // 可能超出畫布
        ctx.stroke();

        
        // 視覺化 Tan 值 (從 (1,0) 點沿切線到截點)
        ctx.beginPath();        
        ctx.strokeStyle = colors.tan;
        ctx.lineWidth = 3;        
        ctx.moveTo(tanLineStartX, centerY);
        ctx.lineTo(tanLineStartX, tanDrawY); // 限制繪製長度
        ctx.stroke();
        

        // 繪製 x=1 的輔助切線（灰色）
        /*
        ctx.beginPath();
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([7, 7]); // 虛線
        ctx.moveTo(tanLineStartX, 0);
        ctx.lineTo(tanLineStartX, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]); // 取消虛線
        */
        
    }
}
// 繪製 sin, cos, tan 標籤
function drawLabels(pointX, pointY, angle) {
    ctx.fillStyle = colors.textLabel;
    ctx.font = '12px sans-serif';
    const offset = 10; // 標籤偏移量
    const verticalOffsetCos = 15; // Cosine 標籤的垂直偏移量

    // Cosine 標籤 (放在 Cos 線段中間上方/下方)
    const cosLabelX = centerX + (pointX - centerX) / 2; // 水平中點
    let cosLabelY;
    // 判斷點在X軸上方或下方，決定標籤位置
    if (pointY < centerY - 5) { // 在上方 (留點緩衝)
        cosLabelY = centerY - verticalOffsetCos;
    } else { // 在下方或接近X軸
        cosLabelY = centerY + verticalOffsetCos + 5; // 往下多一點避免跟軸重疊
    }
    ctx.textAlign = 'center'; // 水平置中對齊
    ctx.fillText('cos(θ)', cosLabelX, cosLabelY);


    // Sine 標籤 (放在 Sin 線段中間靠右/左)
    const sinLabelX = pointX + (pointX > centerX ? offset : -offset); // 左右偏移
    const sinLabelY = centerY + (pointY - centerY) / 2; // 垂直中點
    // 根據點在左右哪邊決定文字對齊方式
    ctx.textAlign = pointX > centerX + 5 ? 'left' : 'right'; // 左右對齊 (留點緩衝)
    ctx.fillText('sin(θ)', sinLabelX, sinLabelY + 4); // 垂直微調


    // Tangent 標籤 (放在 Tan 線段末端附近)
    if (Math.abs(Math.cos(angle)) > 0.01) {
        const tanValue = Math.tan(angle);
        const tanLineY = centerY - radius * tanValue;
        const tanLabelX = centerX + radius + offset; // 在 x=1 線右側
        let tanLabelY = tanLineY;

        // 限制標籤在畫布內顯示
        tanLabelY = Math.max(15, Math.min(canvas.height - 10, tanLabelY));
        // 如果tan為負，稍微調整標籤Y位置避免重疊
        if(tanValue < 0 && tanLineY < centerY + 20) tanLabelY += 15;
        else if (tanValue > 0 && tanLineY > centerY - 20 ) tanLabelY -= 5;


        ctx.textAlign = 'left'; // Tan 標籤固定左對齊
        ctx.fillText('tan(θ)', tanLabelX, tanLabelY);
    }

    // 重置文字對齊方式為預設，避免影響其他繪圖
    ctx.textAlign = 'start';
}


// 更新資訊面板的數值
function updateInfoPanel(angle) {
    const degrees = (angle * 180 / Math.PI) % 360;
    // 將角度標準化到 0-360 度之間顯示
    const displayDegrees = degrees < 0 ? degrees + 360 : degrees;

    const sinValue = Math.sin(angle);
    const cosValue = Math.cos(angle);
    let tanValue = Math.tan(angle);

    // 處理 Tan 的特殊情況 (接近無限大)
    let tanText;
    if (Math.abs(cosValue) < 0.0001) {
        tanText = "未定義";
    } else {
        tanText = tanValue.toFixed(3);
    }

    angleDisplay.textContent = `${displayDegrees.toFixed(1)}°`;
    radianDisplay.textContent = `${angle.toFixed(3)}`;
    sinDisplay.textContent = sinValue.toFixed(3);
    cosDisplay.textContent = cosValue.toFixed(3);
    tanDisplay.textContent = tanText;

    // 根據正負改變數值顏色 (可選)
    sinDisplay.style.color = sinValue >= 0 ? colors.sin : '#c0392b'; // 負數用深紅
    cosDisplay.style.color = cosValue >= 0 ? colors.cos : '#16a085'; // 負數用深綠
    tanDisplay.style.color = tanValue >= 0 || tanText === "未定義" ? colors.tan : '#d35400'; // 負數用深橘
}

// 將事件座標轉換為 Canvas 座標
function getEventCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (event.touches) { // 觸控事件
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
    } else { // 滑鼠事件
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }
    return { x, y };
}

// 計算給定座標對應的角度
function calculateAngle(x, y) {
    const dx = x - centerX;
    const dy = y - centerY;
    // 使用 atan2 計算角度，注意 Y 軸反轉
    let angle = Math.atan2(-dy, dx);
    // 將角度標準化到 0 到 2*PI
    if (angle < 0) {
         angle += 2 * Math.PI;
    }
    return angle;
}

// 事件處理：開始拖曳 (滑鼠按下或觸控開始)
function handleStart(event) {
    event.preventDefault(); // 阻止預設行為 (如文字選取、頁面滾動)
    isDragging = true;
    canvas.style.cursor = 'grabbing'; // 改變滑鼠指標
    const { x, y } = getEventCoordinates(event);
    currentAngle = calculateAngle(x, y);
    drawAll();
}

// 事件處理：拖曳中 (滑鼠移動或觸控移動)
function handleMove(event) {
    if (!isDragging) return;
    event.preventDefault();
    const { x, y } = getEventCoordinates(event);
    currentAngle = calculateAngle(x, y);
    drawAll();
}

// 事件處理：結束拖曳 (滑鼠放開或觸控結束)
function handleEnd(event) {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab'; // 恢復滑鼠指標
    }
}

// 註冊事件監聽器
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd); // 如果滑鼠移出 Canvas 也停止拖曳

canvas.addEventListener('touchstart', handleStart, { passive: false }); // passive: false 允許 preventDefault
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);
canvas.addEventListener('touchcancel', handleEnd);

// 初始設定與響應式調整
window.addEventListener('resize', setupCanvas); // 視窗大小改變時重新設定
setupCanvas(); // 頁面載入時首次設定
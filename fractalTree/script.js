// Get canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight/2;

// 樹的起始位置和長度
const startX = canvas.width / 2;
const startY = canvas.height;
const trunkLength = canvas.height / 3;

// Tree settings
let nextLengthRatio = parseFloat(document.getElementById('nextLengthRatio').value);
let trunkWidth = parseFloat(document.getElementById('trunkWidth').value);
let startHue = parseFloat(document.getElementById('startHue').value);
let endHue = parseFloat(document.getElementById('endHue').value);
let leafLength = parseFloat(document.getElementById('leafLength').value);
let leafWidth = parseFloat(document.getElementById('leafWidth').value);
let leafEnable = document.getElementById('leafEnable').checked;
let leftAngle = parseFloat(document.getElementById('leftAngle').value);
let rightAngle = parseFloat(document.getElementById('rightAngle').value);
let leftRatio = parseFloat(document.getElementById('leftRatio').value);
let rightRatio = parseFloat(document.getElementById('rightRatio').value);
let totalDepth = parseInt(document.getElementById('totalDepth').value);



// Update variables based on input values
function updateVariables() {
    nextLengthRatio = parseFloat(document.getElementById('nextLengthRatio').value);
    trunkWidth = parseFloat(document.getElementById('trunkWidth').value);
    startHue = parseFloat(document.getElementById('startHue').value);
    endHue = parseFloat(document.getElementById('endHue').value);
    leafLength = parseFloat(document.getElementById('leafLength').value);
    leafWidth = parseFloat(document.getElementById('leafWidth').value);
    leafEnable = document.getElementById('leafEnable').checked;
    leftAngle = parseFloat(document.getElementById('leftAngle').value);
    rightAngle = parseFloat(document.getElementById('rightAngle').value);
    leftRatio = parseFloat(document.getElementById('leftRatio').value);
    rightRatio = parseFloat(document.getElementById('rightRatio').value);
    totalDepth = parseInt(document.getElementById('totalDepth').value);

    // Clear canvas and redraw tree
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTree(startX, startY, trunkLength, 0, totalDepth, totalDepth);
}

// Add event listeners to inputs
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', updateVariables);
});


// 畫樹的函數
function drawTree(x, y, length, angle, depth, totalDepth) {
    if (depth === 0) {
        if (leafEnable) {
            // 在最後一個depth畫完時，添加代表葉子的橢圓形
            const leafX = x + leafLength * Math.sin(angle); // 計算最後一個分支的末端X座標
            const leafY = y - leafLength * Math.cos(angle); // 計算最後一個分支的末端Y座標

            // 計算橢圓形的方向（垂直於分支）
            const perpendicularAngle = angle + Math.PI / 2;

            ctx.beginPath();
            ctx.fillStyle = "green";
            // 繪製橢圓形，使其方向垂直於分支
            ctx.ellipse(leafX, leafY, leafLength, leafWidth, perpendicularAngle, 0, Math.PI * 2);
            ctx.fill();
            return;
        } else {
            return;
        }


    }
    // 設置筆劃寬度（根據深度）
    ctx.lineWidth = trunkWidth * (depth / totalDepth);

    // 計算分支的終點位置
    const endX = x + length * Math.sin(angle);
    const endY = y - length * Math.cos(angle);

    // 計算顏色（根據深度）
    const hue = ((totalDepth - depth) / totalDepth) * (endHue - startHue) + startHue; // 控制色相在startHue 到 endHue之間
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`; // 使用HSL色彩模式，100%飽和度，50%亮度

    // 繪製分支
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 畫下一個分支
    const nextLength = length * nextLengthRatio; // 每次減少70%的長度
    const nextDepth = depth - 1;

    // 左分支
    drawTree(x + (endX - x) * leftRatio, y + (endY - y) * leftRatio, nextLength, angle - leftAngle * (Math.PI / 180), nextDepth, totalDepth); // 左分支
    // 右分支
    drawTree(x + (endX - x) * rightRatio, y + (endY - y) * rightRatio, nextLength, angle + rightAngle * (Math.PI / 180), nextDepth, totalDepth); // 右分支

    // 原分支
    drawTree(endX, endY, nextLength, angle, nextDepth, totalDepth); // 右分支
}

// 開始畫樹
drawTree(startX, startY, trunkLength, 0, totalDepth, totalDepth); // 起始角度是0度，深度為10


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const initNum = 10;
const initStartAngle = 0;
const initAngle = 137.5;
const size = 10;
const startAngle = 1;
const initConnectValue = 0;

document.getElementById("showNumbersCheckbox");


class Dots {
  constructor(num, startAngle, angle) {
    this.num = num;
    this.startAngle = startAngle;
    this.angle = angle;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.distanceTocenter = 20;
    this.size = size;
    this.distanceScaleFactor = 0.9;
    this.radiusScaleFactor = 0.1;
    this.connectValue = initConnectValue;
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製紅色小圓
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 15, 0, 2 * Math.PI); 
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.closePath();

    // 記錄所有點的位置，以便連線
    const positions = [];

    for (var i = 0; i < this.num; i++) {
        var dotAngle = this.startAngle + this.angle * i;
        var radians = (dotAngle / 180) * Math.PI;

        // 每個點距離中心的距離，每圈加一個distanceScaleFactor
        var distance =
            this.distanceTocenter +
            this.distanceTocenter *
            Math.floor((this.startAngle + this.angle * (this.num - i)) / 360) *
            this.distanceScaleFactor;
        var posx = this.centerX + distance * Math.cos(radians);
        var posy = this.centerY + distance * Math.sin(radians);

        // 儲存位置，供後續連線使用
        positions.push({ x: posx, y: posy });

        ctx.beginPath();
        ctx.ellipse(
          posx,                        // x 軸中心
          posy,                        // y 軸中心
          this.size * (2 * this.radiusScaleFactor * (this.num - i)),  // 橫向半徑
          this.size * (1 *  this.radiusScaleFactor * (this.num - i)), // 縱向半徑
          radians,                 // 旋轉角度，調整角度讓葉子傾斜
          0,                           // 開始角度
          2 * Math.PI                  // 結束角度，完整繪製橢圓
        );
        ctx.fillStyle = "rgba(115, 184, 57, 1)";  // 填充顏色
        ctx.fill();                                // 填充圖形
        
        ctx.strokeStyle = "rgba(0, 0, 0, 1)";      // 邊線顏色，這裡設為黑色
        ctx.lineWidth = 2;                         // 邊線寬度
        ctx.stroke();                              // 繪製邊線
        
        ctx.closePath();

        // 判斷是否顯示編號
        if (showNumbersCheckbox.checked) {
            ctx.fillStyle = "black";  // 編號文字的顏色
            ctx.font = "14px Arial";  // 字體大小與類型
            ctx.fillText(i + 1, posx - 5, posy - 5);  // 編號位置
        }
    }

    // 呼叫連線功能
    if (this.connectValue > 0){
      this.connect(positions)
    }
}


  // Connect dots based on connectValue
  connect(positions) {
    for (let i = 0; i < positions.length; i++) {
        
        let nextIndex = i + this.connectValue;  // 根據 connectValue 計算下一個點的索引
        if (nextIndex >= positions.length){
          continue; // continue
        }
        // 取出點的座標
        let pos1 = positions[i];
        let pos2 = positions[nextIndex];

        // 畫線連接兩個點
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.strokeStyle = "blue";  // 線條顏色
        ctx.stroke();
        ctx.closePath();
    }
  }
}

function drawCenter() {
  // 清空canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 計算canvas的中心
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // 繪製紅色小圓
  ctx.beginPath();
  ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI); // 10 是圓的半徑
  ctx.fillStyle = 'red';
  ctx.fill();
  ctx.closePath();
}

const dots = new Dots(initNum, initStartAngle, initAngle);
dots.draw();

// Number of dots controls
const numSlider = document.getElementById("numSlider");
const numValue = document.getElementById("numValue");
const numInput = document.getElementById("numInput");

numSlider.value = initNum;
numValue.textContent = initNum;
numInput.value = initNum;

numSlider.addEventListener("input", function (event) {
  dots.num = parseInt(event.target.value);
  numValue.textContent = event.target.value;
  numInput.value = event.target.value;
  dots.draw();
});

// Update dots, slider, and value display when numInput is changed
numInput.addEventListener("input", function (event) {
  const value = parseInt(event.target.value);
  dots.num = value;
  numSlider.value = value;
  numValue.textContent = value;
  dots.draw();
});

// Start angle controls
const startAngleSlider = document.getElementById("startAngleSlider");
const startAngleValue = document.getElementById("startAngleValue");
const startAngleInput = document.getElementById("startAngleInput");

startAngleSlider.value = initStartAngle;
startAngleValue.textContent = initStartAngle;
startAngleInput.value = initStartAngle;

// Update dots, slider, and value display when startAngleSlider is changed
startAngleSlider.addEventListener("input", function (event) {
  const value = parseFloat(event.target.value);
  dots.startAngle = value;
  startAngleValue.textContent = value;
  startAngleInput.value = value;
  dots.draw();
});

// Update dots, slider, and value display when startAngleInput is changed
startAngleInput.addEventListener("input", function (event) {
  const value = parseFloat(event.target.value);
  if (!isNaN(value)) {
    dots.startAngle = value;
    startAngleSlider.value = value;
    startAngleValue.textContent = value;
    dots.draw();
  }
});

// Angle controls
const angleSlider = document.getElementById("angleSlider");
const angleValue = document.getElementById("angleValue");
const angleInput = document.getElementById("angleInput");
const angleInputNumerator = document.getElementById("angleInputNumerator");
const angleInputDenominator = document.getElementById("angleInputDenominator");

angleSlider.value = initAngle;
angleValue.textContent = initAngle;
angleInput.value = (initAngle || 0).toFixed(2);

// Update dots, slider, and value display when angleSlider is changed
angleSlider.addEventListener("input", function (event) {
  const value = parseFloat(event.target.value);
  dots.angle = value;
  angleValue.textContent = value.toFixed(2);
  angleInput.value = value.toFixed(2);
  updateAngleFraction(value);
  dots.draw();
});

// Update dots, slider, and value display when angleInput is changed
angleInput.addEventListener("input", function (event) {
  const value = parseFloat(event.target.value);
  if (!isNaN(value)) {
    dots.angle = value;
    angleSlider.value = value;
    angleValue.textContent = value.toFixed(2);
    updateAngleFraction(value);
    dots.draw();
  }
});


// Update the angle when the numerator or denominator is changed
function updateAngleFromFraction() {
  const numerator = parseInt(angleInputNumerator.value);
  const denominator = parseInt(angleInputDenominator.value);
  if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
    const angle = (360 * numerator) / denominator;
    dots.angle = angle;
    angleSlider.value = angle;
    angleValue.textContent = angle.toFixed(2);
    angleInput.value = angle.toFixed(2);
    dots.draw();
  }
}


// Event listeners for numerator and denominator inputs
angleInputNumerator.addEventListener("input", updateAngleFromFraction);
angleInputDenominator.addEventListener("input", updateAngleFromFraction);

// Function to update numerator and denominator based on angle
function updateAngleFraction(angle) {
  const fraction = angle / 360;
  const denominator = 5; // Example denominator
  const numerator = fraction * denominator;
  angleInputNumerator.value = Math.round(numerator);
  angleInputDenominator.value = denominator;
}

// Size controls
const sizeSlider = document.getElementById("sizeSlider");
const sizeValue = document.getElementById("sizeValue");
sizeValue.textContent = size;


sizeSlider.addEventListener("input", function (event) {
  dots.size = parseFloat(event.target.value);
  sizeValue.textContent = event.target.value;
  dots.draw();
});

 // connect control

// 获取 HTML 元素
const connectSlider = document.getElementById("connectSlider");
const connectValue = document.getElementById("connectValue");
const connectInput = document.getElementById("connectInput");

// 初始化值
let connectValueNum = initConnectValue;
connectSlider.value = initConnectValue;
connectValue.textContent = initConnectValue;
connectInput.value = initConnectValue;



// 更新 connectSlider 和 connectInput 的值同步
connectSlider.addEventListener("input", function (event) {
    dots.connectValue = parseInt(event.target.value);
    connectValue.textContent = event.target.value;
    connectInput.value = event.target.value;
    dots.draw();    
});

connectInput.addEventListener("input", function (event) {
    const value = parseInt(event.target.value);
    dots.connectValue = value;
    connectSlider.value = value;
    connectValue.textContent = value;
    dots.draw();
});

/////////////////////////////////////
// Update the angle input display
function updateAngleInput() {
  const angle = angleSlider.value;
  const numerator = angle / 360;
  angleInputNumerator.value = Math.round(numerator * 5); // Adjust for scaling
  angleInputDenominator.value = 5; // Keep a constant denominator
}

// 监听复选框状态变化，重新绘制图形
showNumbersCheckbox.addEventListener("change", function () {
  dots.draw();
});
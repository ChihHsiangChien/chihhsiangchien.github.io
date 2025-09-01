class Microscope {
  constructor(imageUrl, canvasId, zoomCanvasId) {

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.zoomCanvas = document.getElementById(zoomCanvasId);
    this.zoomCtx = this.zoomCanvas.getContext("2d");
    /*
    this.canvas.width = 400;
    this.canvas.height = 300;

    this.zoomCanvas.width = this.canvas.width;
    this.zoomCanvas.height = this.canvas.height;

    this.zoomCanvas.width = this.canvas.width;
    */

    this.zoomFactor = 5; // 要跟html裡的第一個button的參數相同

    this.offsetX = 0;
    this.offsetY = 0;

    // 載物台圓孔位置 (稍後在 resize 中更新)
    this.observationX = 0;
    this.observationY = 0;
    this.ObservationCircleRadius = 20;
    this.ObservationCircleColor = "rgba(247, 256, 210, 1)";

    // 儲存滑鼠/觸摸點擊位置的相對座標
    this.startX = 0;
    this.startY = 0;

    // 綁定滑鼠/觸摸事件
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("touchstart", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("touchmove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", () => this.onMouseUp());
    this.canvas.addEventListener("touchend", () => this.onMouseUp());

    // 載玻片一開始偏離中心多遠
    this.distanceToMiddle = 10;

    // 載玻片設定
    this.slideBorderColor = "darkgray";
    this.slideColor = "rgba(186, 217, 230, 0.1)";
    this.slideWidth = 150;
    this.slideHeight = 50;
    //this.slideX = (this.canvas.width - this.slideWidth) / 2 - this.distanceToMiddle;
    //this.slideY = (this.canvas.height - this.slideHeight) / 2 - this.distanceToMiddle;
    this.slideX = 0; // 將在 resize 時設定
    this.slideY = 0; // 將在 resize 時設定

    // 載玻片上的標本設定
    this.specimenWidth = 30;
    this.specimenHeight = 30;
    //this.specimenX = this.slideX + (this.slideWidth - this.specimenWidth) / 2;
    //this.specimenY = this.slideY + (this.slideHeight - this.specimenHeight) / 2;
    this.specimenX = 0; // 將在 resize 時設定
    this.specimenY = 0; // 將在 resize 時設定


    // 載物台設定
    this.stageWidth = 180;
    this.stageHeight = 120;
    //this.stageX = this.canvas.width / 2 - this.stageWidth / 2;
    //this.stageY = this.canvas.height / 2 - this.stageHeight / 2;
    this.stageX = 0; // 將在 resize 時設定
    this.stageY = 0; // 將在 resize 時設定    
    this.stageColor = "rgba(66, 72, 74,1)";

    // 模糊程度
    this.blurHeight = -8; // 0最清楚，越高或越低就不清楚
    this.blurFactor = Math.abs(this.blurHeight);

    // 亮度
    this.brightnessFactor = 10;

    this.apertureSize = 5; // 預設光圈大小，1~10

    // bugs
    this.bugs = [];

    this.image = new Image();
    // 確保圖片載入後執行第一次 resize 和繪圖
    this.image.onload = () => {
      // this.drawInitialImage(); // 不再由 onload 直接觸發繪圖
      resizeCanvases(); // 圖片載入後，執行第一次 resize (會包含繪圖)
    };
    this.image.src = imageUrl;    
  }

  onMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const { mouseX, mouseY } = getMouseCoordinates(event, rect);
    this.startX = mouseX;
    this.startY = mouseY;
  }

  onMouseUp() {
    this.startX = 0;
    this.startY = 0;
  }
  setZoomFactor(zoomFactor) {
    this.zoomFactor = zoomFactor;
  }
}

Microscope.prototype.onMouseMove = function (event) {
  event.preventDefault(); // Prevent default touch events

  if (event.buttons === 1 || event.type === "touchmove") {
    const rect = this.canvas.getBoundingClientRect();
    const { mouseX, mouseY } = getMouseCoordinatesMoving(event, rect);

    const deltaX = mouseX - this.startX;
    const deltaY = mouseY - this.startY;

    // 使用較小的觸控閾值以提升 iOS 響應速度
    const threshold = (event.type === "touchmove") ? 1 : 4;
    if ((deltaX * deltaX + deltaY * deltaY) > threshold * threshold) {
      this.offsetX += deltaX;
      this.offsetY += deltaY;

      this.slideX += deltaX;
      this.slideY += deltaY;
      this.specimenX += deltaX;
      this.specimenY += deltaY;

      this.startX = mouseX;
      this.startY = mouseY;

      this.bugs.forEach(function (bug) {
        bug.x += deltaX;
        bug.y += deltaY;
      });

      this.drawInitialImage();
      this.drawZoomImage(this.zoomCanvas);
    }
  }
};

// 畫出載物台圓孔
Microscope.prototype.drawObservationCircle = function (x, y, radius) {
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.arc(x, y, radius, 0, Math.PI * 2);
  this.ctx.lineWidth = 2;
  this.ctx.strokeStyle = "red";
  this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
  this.ctx.fill();
  this.ctx.stroke();
  this.ctx.restore();
};

// 畫出載物台
Microscope.prototype.drawStage = function () {
  // 畫出黑色平台
  this.ctx.fillStyle = this.stageColor;
  this.ctx.fillRect(
    this.stageX,
    this.stageY,
    this.stageWidth,
    this.stageHeight
  );

  // 畫出光圈圓孔
  // 增加濾鏡改變光圈亮度
  this.ctx.filter = ` brightness(${this.brightnessFactor}%)`;

  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.arc(
    this.observationX,
    this.observationY,
    this.ObservationCircleRadius / 2,
    0,
    Math.PI * 2
  );
  //this.ctx.lineWidth = 2;
  //this.ctx.strokeStyle = "yellow";
  this.ctx.fillStyle = this.ObservationCircleColor;
  this.ctx.fill();
  this.ctx.stroke();
  this.ctx.restore();
  //applyBrightness(this.ctx, this.brightnessFactor);

  // 濾鏡關閉
  this.ctx.filter = "none";
};

//畫canvas上的初始影像(左圖)
Microscope.prototype. drawInitialImage = function () {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // 繪製外框
  this.ctx.strokeStyle = "black";
  this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

  // ====繪製載物台====
  this.drawStage();

  // ====繪製載玻片====
  // 載玻片填色
  this.ctx.fillStyle = this.slideColor;
  this.ctx.fillRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );

  // 載玻片畫外框
  this.ctx.strokeStyle = this.slideBorderColor;
  this.ctx.strokeRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );


  // 若有勾選顯示DF，則在載玻片上繪製 "DF"

  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (mode === "bugs") {
    // 繪製水樣
    this.ctx.fillStyle = "rgba(193, 222, 250, 0.5)";
    this.ctx.fillRect(
      this.specimenX,
      this.specimenY,
      this.specimenWidth,
      this.specimenHeight
    );
  } else if (mode === "df") {
    // 繪製 DF 字母
    this.ctx.save();
    this.ctx.font = "bold 28px Arial";
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "DF",
      this.slideX + this.slideWidth / 2,
      this.slideY + this.slideHeight / 2
    );
    this.ctx.restore();
  } else {
    // 標本模式
    this.ctx.drawImage(
      this.image,
      0,
      0,
      this.image.width,
      this.image.height,
      this.specimenX,
      this.specimenY,
      this.specimenWidth,
      this.specimenHeight
    );
  }
  // 畫蟲蟲（只在蟲蟲模式）
  if (mode === "bugs") {
    this.bugs.forEach(function (bug) {
      bug.drawOnCanvas();
    });
  }


  // 在原canvas畫放大的框
  /*
  this.ctx.strokeStyle = "grey";
  this.ctx.strokeRect(
    (this.canvas.width * (1 - 1 / this.zoomFactor)) / 2,
    (this.canvas.height * (1 - 1 / this.zoomFactor)) / 2,
    this.canvas.width / this.zoomFactor,
    this.canvas.height / this.zoomFactor
  );
  */

  // 執行初始的放大影像繪製
  this.drawZoomImage(this.zoomCanvas);
};

// 在特定canvas上畫放大圖
Microscope.prototype.drawZoomImage = function (newCanvas) {
  newCtx = newCanvas.getContext("2d");
  newCtx.clearRect(0, 0, newCanvas.width, newCanvas.height);

  // 繪製黑色與背景
  this.zoomCtx.fillStyle = "black";
  this.zoomCtx.fillRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 繪製黑色外框
  newCtx.strokeStyle = "black";
  newCtx.strokeRect(0, 0, newCanvas.width, newCanvas.height);

  // 裁切出一個圓形當作視野
  const circleRadius = Math.min(newCanvas.width, newCanvas.height) / 2;
  newCtx.beginPath();
  newCtx.arc(
    newCanvas.width / 2,
    newCanvas.height / 2,
    circleRadius,
    0,
    2 * Math.PI
  );
  newCtx.closePath();
  newCtx.clip();

  // 在圓形視野中填色
  // Apply brightness filter 改變亮度
  newCtx.filter = ` brightness(${this.brightnessFactor}%)`;

  // 填上光圈顏色
  newCtx.fillStyle = this.ObservationCircleColor;
  newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

  const zoomedImageX =
    (this.specimenX - (this.canvas.width * (1 - 1 / this.zoomFactor)) / 2) *
    this.zoomFactor;
  const zoomedImageY =
    (this.specimenY - (this.canvas.height * (1 - 1 / this.zoomFactor)) / 2) *
    this.zoomFactor;
  const zoomedSlideX =
    (this.slideX - (this.canvas.width * (1 - 1 / this.zoomFactor)) / 2) *
    this.zoomFactor;
  const zoomedSlideY =
    (this.slideY - (this.canvas.height * (1 - 1 / this.zoomFactor)) / 2) *
    this.zoomFactor;

  // 調整濾鏡模糊程度
  newCtx.filter = `blur(${this.blurFactor}px)`;

  // 繪製載玻片填色
  newCtx.fillStyle = this.slideColor;
  newCtx.fillRect(
    zoomedSlideX,
    zoomedSlideY,
    this.slideWidth * this.zoomFactor,
    this.slideHeight * this.zoomFactor
  );
  // 繪製載玻片外框
  newCtx.strokeStyle = this.slideBorderColor;
  newCtx.strokeRect(
    zoomedSlideX,
    zoomedSlideY,
    this.slideWidth * this.zoomFactor,
    this.slideHeight * this.zoomFactor
  );

  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (mode === "bugs") {
    // 繪製水樣
    newCtx.fillStyle = "rgba(193, 222, 250, 0.5)";
    newCtx.fillRect(
      zoomedImageX,
      zoomedImageY,
      this.specimenWidth * this.zoomFactor,
      this.specimenHeight * this.zoomFactor
    );
  } else if (mode === "df") {
    // 繪製 DF 字母，字體大小隨 zoomFactor 放大
    newCtx.save();
    const fontSize = 48 * this.zoomFactor / 5; // 5是預設倍率，48是基準字體
    newCtx.font = `bold ${fontSize}px Arial`;
    newCtx.fillStyle = "rgba(0,0,0,0.7)";
    newCtx.textBaseline = "middle";
    newCtx.textAlign = "center";
    newCtx.fillText(
      "DF",
      zoomedSlideX + (this.slideWidth * this.zoomFactor) / 2,
      zoomedSlideY + (this.slideHeight * this.zoomFactor) / 2
    );
    newCtx.restore();
  } else {
    // 標本模式
    newCtx.drawImage(
      this.image,
      0,
      0,
      this.image.width,
      this.image.height,
      zoomedImageX,
      zoomedImageY,
      this.specimenWidth * this.zoomFactor,
      this.specimenHeight * this.zoomFactor
    );
  }

  // 畫蟲蟲（只在蟲蟲模式）
  if (mode === "bugs") {
    this.bugs.forEach(function (bug) {
      bug.drawOnZoomCanvas();
    });
  }


  // Reset the filter
  newCtx.filter = "none";

  //applyBrightness(newCtx, this.brightnessFactor);

  // 將影像上下顛倒左右相反
  if (document.getElementById("compound").checked) {
    newCtx.save();
    newCtx.translate(newCanvas.width, newCanvas.height);
    newCtx.scale(-1, -1);
    newCtx.drawImage(newCanvas, 0, 0);
    newCtx.restore();
  }


  // 繪製十字準星（只在蟲蟲模式且 40X）
  if (mode === "bugs" && this.zoomFactor == 40) {
    newCtx.strokeStyle = "red";
    newCtx.beginPath();
    newCtx.moveTo(newCanvas.width / 2 - 10, newCanvas.height / 2);
    newCtx.lineTo(newCanvas.width / 2 + 10, newCanvas.height / 2);
    newCtx.stroke();
    newCtx.beginPath();
    newCtx.moveTo(newCanvas.width / 2, newCanvas.height / 2 - 10);
    newCtx.lineTo(newCanvas.width / 2, newCanvas.height / 2 + 10);
    newCtx.stroke();
  }  

};

// 調整載物台改變模糊程度
Microscope.prototype.moveStage = function (delta) {
  this.blurHeight += delta;
  this.blurFactor = Math.abs(this.blurHeight);
};

// 產生蟲蟲
Microscope.prototype.generateBugs = function (num) {
  for (var i = 0; i < num; i++) {
    const bug = new Bug(this);
    this.bugs.push(bug);
  }
};

// 獲取滑鼠/觸摸點擊位置的相對座標
function getMouseCoordinates(event, rect) {
  var mouseX, mouseY;

  if (event.type === "mousedown") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchstart") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }
  return { mouseX, mouseY };
}

// 獲取滑鼠/觸摸點擊位置的相對座標
function getMouseCoordinatesMoving(event, rect) {
  var mouseX, mouseY;

  if (event.type === "mousemove") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchmove") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }

  return { mouseX, mouseY };
}

// 接收按鈕指令決定放大倍率
function zoom(zoomFactor, sender) {
  // 調高倍時，blurHeight略增，強迫使用者微調載物台高度
  if (zoomFactor > microscope.zoomFactor) {
    microscope.blurHeight += 1;
    microscope.blurFactor = Math.abs(Microscope.blurHeight);
  } else if (zoomFactor < microscope.zoomFactor) {
    microscope.blurHeight -= 1;
    microscope.blurFactor = Math.abs(Microscope.blurHeight);
  }

  microscope.setZoomFactor(zoomFactor);
  microscope.drawInitialImage();

  // 改變按鈕顏色
  sender.style.backgroundColor = "lightblue";

  // Get the parent container
  var container = sender.parentNode;

  // Get all sibling buttons
  var buttons = container.getElementsByClassName("large-button");

  // 重設其他按鈕顏色
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i] !== sender) {
      buttons[i].style.backgroundColor = ""; // Set the default color here
    }
  }
  // 更新 iOS 過濾效果
  updateFilters();
}

// 接收按鈕指令改變載物台高度，改變模糊程度
function moveStage(delta) {
  //event.preventDefault(); // Prevent default touch events

  microscope.moveStage(delta);
  microscope.drawInitialImage();
  // 更新 iOS 過濾效果
  updateFilters();
}


// iOS無法用CSS的Blur濾鏡，需另外實作
function applyBlur(ctx, image, blurFactor) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Calculate the scaled dimensions
  const scaledWidth = image.width * blurFactor;
  const scaledHeight = image.height * blurFactor;

  // Draw the scaled image on the canvas
  ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);

  // Apply the blur effect by scaling down and up
  ctx.drawImage(
    ctx.canvas,
    0,
    0,
    scaledWidth,
    scaledHeight,
    0,
    0,
    image.width,
    image.height
  );

  // Reset the image smoothing settings
  ctx.imageSmoothingEnabled = false;
  ctx.imageSmoothingQuality = "default";
}
function applyBrightness(ctx, brightnessFactor) { }
// 在 Microscope class 上新增移動載玻片的方法


// 接收按鈕指令改變亮度，模擬光圈調整大小
function setBrightness(delta) {
  microscope.brightnessFactor += delta;
  microscope.drawInitialImage();
  // 更新 iOS 過濾效果
  updateFilters();
}

// 調整光圈的函式
function setAperture(delta) {
  microscope.apertureSize = Math.max(1, Math.min(10, microscope.apertureSize + delta));
  // 景深與光圈反比，光圈大則模糊多
  // 光圈越大，亮度越高，景深越淺（模糊越大）
  microscope.brightnessFactor = 50 + microscope.apertureSize * 10; // 你可調整這個公式  
  microscope.blurFactor = microscope.apertureSize * 2; // 你可調整這個倍率
  microscope.drawInitialImage();
  updateFilters();
}

Microscope.prototype.moveSlide = function(dxUnit, dyUnit) {
  // 根據 zoomFactor 調整移動步長
  const step = Math.max(1, Math.round(100 / this.zoomFactor));
  const dx = dxUnit * step;
  const dy = dyUnit * step;
  this.slideX += dx;
  this.slideY += dy;
  this.specimenX += dx;
  this.specimenY += dy;
  this.bugs.forEach(function(bug) { bug.x += dx; bug.y += dy; });
  this.drawInitialImage();
  this.drawZoomImage(this.zoomCanvas);
};
// 檢測是否為 iOS 裝置
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
// 更新 CSS 過濾效果 (iOS 使用 CSS filter 作為 fallback)
function updateFilters() {
  if (isIOS()) {
    microscope.canvas.style.filter = `brightness(${microscope.brightnessFactor}%)`;
    microscope.zoomCanvas.style.filter = `blur(${microscope.blurFactor}px) brightness(${microscope.brightnessFactor}%)`;
  }
}
// <<<--- 新增 resize 函數和事件監聽器 --- START --->>>
function resizeCanvases() {
  // 獲取一個 canvas 的容器 (canvas-container) 的尺寸，或者直接獲取 canvas 的 offsetWidth/Height
  // 使用 offsetWidth/Height 比較直接，它反映了 CSS 佈局後的實際像素尺寸
  const displayWidth = microscope.canvas.offsetWidth;
  const displayHeight = microscope.canvas.offsetHeight;

  // 檢查尺寸是否真的改變了，避免不必要的重設和重繪
  if (microscope.canvas.width !== displayWidth || microscope.canvas.height !== displayHeight) {

    console.log(`Resizing canvases to: ${displayWidth} x ${displayHeight}`);

    // --- 儲存舊的標本位置 (在重新計算之前) ---
    const oldSpecimenX = microscope.specimenX;
    const oldSpecimenY = microscope.specimenY;

    // --- 更新 Canvas 繪圖表面尺寸 ---
    microscope.canvas.width = displayWidth;
    microscope.canvas.height = displayHeight;
    microscope.zoomCanvas.width = displayWidth; // 兩個 canvas 尺寸相同
    microscope.zoomCanvas.height = displayHeight;

    // --- 重新計算依賴畫布尺寸的屬性 ---
    // 重新計算觀察孔中心
    microscope.observationX = microscope.canvas.width / 2;
    microscope.observationY = microscope.canvas.height / 2;

    // 重新計算載物台初始中心位置
    microscope.stageX = microscope.canvas.width / 2 - microscope.stageWidth / 2;
    microscope.stageY = microscope.canvas.height / 2 - microscope.stageHeight / 2;

    // 重新計算載玻片和標本的初始中心位置 (相對於畫布中心)
    microscope.slideX = (microscope.canvas.width - microscope.slideWidth) / 2 - microscope.distanceToMiddle;
    microscope.slideY = (microscope.canvas.height - microscope.slideHeight) / 2 - microscope.distanceToMiddle;
    // *** 重新計算新的標本位置 ***
    microscope.specimenX = microscope.slideX + (microscope.slideWidth - microscope.specimenWidth) / 2;
    microscope.specimenY = microscope.slideY + (microscope.slideHeight - microscope.specimenHeight) / 2;

    // --- 計算標本位置的變化量 ---
    const deltaX = microscope.specimenX - oldSpecimenX;
    const deltaY = microscope.specimenY - oldSpecimenY;

    // --- 更新所有 bug 的位置 ---
    // 將標本區域移動的距離應用到每個 bug 上
    microscope.bugs.forEach(bug => {
      bug.x += deltaX;
      bug.y += deltaY;
    });
    // --- Bug 位置更新結束 ---

    // --- 重新繪製 ---
    // 確保 microscope 物件和圖片已準備好
    if (microscope && microscope.image.complete) {
       microscope.drawInitialImage();
       // drawInitialImage 內部會呼叫 drawZoomImage，所以理論上不需要下面這行
       // 但明確呼叫更保險，以防未來 drawInitialImage 邏輯變更
       microscope.drawZoomImage(microscope.zoomCanvas);
       // 更新 iOS 的 CSS filter (如果需要)
       updateFilters();
    }
  }
}

// 頁面載入完成後執行一次 resize
// 使用 'load' 確保所有資源 (包括圖片) 都載入完成，且 CSS 樣式已應用
window.addEventListener('load', resizeCanvases);

// 視窗大小改變時執行 resize
window.addEventListener('resize', resizeCanvases);

// <<<--- 新增 resize 函數和事件監聽器 --- END --->>>s


// 建 Microscope instance
const microscope = new Microscope("cell.jpg", "canvas", "zoomCanvas");

// 產生蟲蟲
microscope.generateBugs(10);

setInterval(() => {
  microscope.bugs.forEach((bug) => {
    bug.move();

    //檢查是否zoomfactor = 40且在準星位置，可造成傷害
    if (microscope.zoomFactor == 40) {
      const zoomedBugX =
        (bug.x -
          (microscope.canvas.width * (1 - 1 / microscope.zoomFactor)) / 2) *
        microscope.zoomFactor;

      const zoomedBugY =
        (bug.y -
          (microscope.canvas.height * (1 - 1 / microscope.zoomFactor)) / 2) *
        microscope.zoomFactor;

      if (
        zoomedBugX >=
        microscope.zoomCanvas.width / 2 - bug.width * microscope.zoomFactor &&
        zoomedBugX <=
        microscope.zoomCanvas.width / 2 + bug.width * microscope.zoomFactor &&
        zoomedBugY >=
        microscope.zoomCanvas.height / 2 -
        bug.height * microscope.zoomFactor &&
        zoomedBugY <=
        microscope.zoomCanvas.height / 2 + bug.height * microscope.zoomFactor
      ) {
        bug.getHurt(2);
      }
    }

    //如果沒生命
    if (bug.life <= 0) {
      const index = microscope.bugs.indexOf(bug);
      if (index !== -1) {
        microscope.bugs.splice(index, 1);
      }
    }

  });
  // 重新繪製一次畫面
  microscope.drawInitialImage();
  // 更新 iOS 過濾效果
  updateFilters();
}, 250);
// 全域移動載玻片函式 (按鈕使用)
function moveSlide(dxUnit, dyUnit) {
  microscope.moveSlide(dxUnit, dyUnit);
}
// 監聽鍵盤方向鍵移動載玻片
window.addEventListener("keydown", function (e) {
  let handled = true;
  switch (e.key) {
    case "ArrowLeft":
      moveSlide(-1, 0);
      break;
    case "ArrowRight":
      moveSlide(1, 0);
      break;
    case "ArrowUp":
      moveSlide(0, -1);
      break;
    case "ArrowDown":
      moveSlide(0, 1);
      break;
    default:
      handled = false;
  }
  if (handled) {
    e.preventDefault();
  }
});
// 初始更新過濾效果（若為 iOS）
updateFilters();
// Prevent pinch and double-tap zoom on touch devices
(function() {
  var lastTouchEnd = 0;
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  document.addEventListener('touchend', function(e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
})();


// Prevent default double-click/double-tap zoom on canvas
['canvas', 'zoomCanvas'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('dblclick', function(e) { e.preventDefault(); });
});
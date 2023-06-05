class Microscope {
  constructor(imageUrl, canvasId, zoomCanvasId, zoomFactor) {
    this.image = new Image();

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.zoomCanvas = document.getElementById(zoomCanvasId);
    this.zoomCtx = this.zoomCanvas.getContext("2d");

    this.headlessCanvas = document.getElementById("headlessCanvas");
    this.headlessCtx = this.headlessCanvas.getContext("2d");

    this.canvas.width = 400;
    this.canvas.height = 300;

    this.zoomCanvas.width = this.canvas.width;
    this.zoomCanvas.height = this.canvas.height;



    this.zoomCanvas.width = this.canvas.width;

    this.zoomFactor = zoomFactor;
    this.offsetX = 0;
    this.offsetY = 0;



    // 載物台圓孔位置
    this.observationX = this.canvas.width / 2;
    this.observationY = this.canvas.height / 2;
    this.ObservationCircleRadius = 20;

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

    this.image.onload = this.drawInitialImage.bind(this);
    this.image.src = imageUrl;


    // 載玻片設定
    this.borderColor = "darkgray";
    this.slideColor = "lightgray";
    this.slideWidth = 200;
    this.slideHeight = 100;
    this.slideX = (this.canvas.width - this.slideWidth) / 2;
    this.slideY = (this.canvas.height - this.slideHeight) / 2;

    this.specimenWidth = 50;
    this.specimenHeight = 50;
    this.specimenX = this.slideX + (this.slideWidth - this.specimenWidth) / 2;
    this.specimenY = this.slideY + (this.slideHeight - this.specimenHeight) / 2;

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
}

Microscope.prototype.onMouseMove = function (event) {
  if (event.buttons === 1 || event.type === "touchmove") {
    const rect = this.canvas.getBoundingClientRect();
    const { mouseX, mouseY } = getMouseCoordinatesMoving(event, rect);

    const deltaX = mouseX - this.startX;
    const deltaY = mouseY - this.startY;

    this.offsetX += deltaX;
    this.offsetY += deltaY;

    this.slideX += deltaX;
    this.slideY += deltaY;
    this.specimenX += deltaX;
    this.specimenY += deltaY;

    this.startX = mouseX;
    this.startY = mouseY;

    this.drawInitialImage();
    this.drawZoomImage();
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

Microscope.prototype.drawInitialImage = function () {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  // 繪製ctx外框
  this.ctx.strokeStyle = "black";
  this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

  // 繪製載玻片
  this.ctx.fillStyle = this.slideColor;
  this.ctx.fillRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );
  this.ctx.strokeStyle = this.borderColor;
  this.ctx.strokeRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );

  // 計算圖像縮放後的尺寸
  //const imageSize = Math.min(this.slideWidth, this.slideHeight) * 0.6;

  // 計算圖像在載玻片中心的位置
  //const imageX = this.slideX + (this.slideWidth - imageSize) / 2;
  //const imageY = this.slideY + (this.slideHeight - imageSize) / 2;

  // 繪製圖像
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

  // 繪製圓孔
  this.drawObservationCircle(
    this.observationX,
    this.observationY,
    this.ObservationCircleRadius
  );

  // 執行初始的放大影像繪製
  this.drawZoomImage();
};
Microscope.prototype.drawNewCanvas = function (newCanvas) {

  newCtx = newCanvas.getContext("2d");
  // 黑色外框與背景

  newCtx.strokeStyle = "black";
  newCtx.strokeRect(0, 0, newCanvas.width, newCanvas.height);
  // newCtx.fillStyle = "white";
  // newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

  const zoomedImageX = (this.specimenX - this.canvas.width * (1 - 1 / this.zoomFactor) / 2) * this.zoomFactor;
  const zoomedImageY = (this.specimenY - this.canvas.height * (1 - 1 / this.zoomFactor) / 2) * this.zoomFactor;
  

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

  



  // 在原canvas畫放大的框
  this.ctx.strokeStyle = "grey";
  this.ctx.strokeRect(
    this.canvas.width * (1 - 1 / this.zoomFactor) / 2,
    this.canvas.height * (1 - 1 / this.zoomFactor) / 2,
    this.canvas.width / this.zoomFactor,
    this.canvas.height / this.zoomFactor);
}


Microscope.prototype.drawHeadlessCanvas = function () {

  this.headlessCanvas.width = this.canvas.width * this.zoomFactor;
  this.headlessCanvas.height = this.canvas.height * this.zoomFactor;

  // 黑色外框與背景

  this.headlessCtx.fillStyle = "white";
  this.headlessCtx.fillRect(0, 0, this.headlessCanvas.width, this.headlessCanvas.height);

  this.headlessCtx.strokeStyle = "black";
  this.headlessCtx.strokeRect(0, 0, this.headlessCanvas.width, this.headlessCanvas.height);


  // 繪製載玻片
  this.headlessCtx.fillStyle = this.slideColor;
  this.headlessCtx.fillRect(
    this.slideX * this.zoomFactor,
    this.slideY * this.zoomFactor,
    this.slideWidth * this.zoomFactor,
    this.slideHeight * this.zoomFactor
  );
}

Microscope.prototype.drawZoomImage = function () {
  this.zoomCtx.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 繪製黑色外框與背景
  this.zoomCtx.fillStyle = "black";
  this.zoomCtx.fillRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 創建 headless canvas
  //const headlessCanvas = document.createElement("canvas");
  //const headlessCtx = headlessCanvas.getContext("2d");

  //this.drawHeadlessCanvas();
  this.drawNewCanvas(this.zoomCanvas);

  const radius = this.observationCircleRadius * this.zoomFactor;
  /*
  // 裁切成圓形並貼在 zoomCtx 上
  //this.headlessCtx.save();
  this.headlessCtx.beginPath();
  this.headlessCtx.arc(
    this.headlessCanvas.width / 2,
    this.headlessCanvas.height / 2,
    radius,
    0,
    2 * Math.PI
  );
  this.headlessCtx.clip();

  this.zoomCtx.drawImage(
    this.headlessCanvas,
    0,
    0,
    2 * radius,
    2 * radius
    //(this.zoomCanvas.width - 2 * radius) / 2,
    //(this.zoomCanvas.height - 2 * radius) / 2,
    //2 * radius,
    //2 * radius
  );
  //this.zoomCtx.restore();
  */
};

Microscope.prototype.drawZoomImage2 = function () {
  const zoomImageSize = Math.min(
    this.zoomCanvas.width / this.zoomFactor,
    this.zoomCanvas.height / this.zoomFactor
  );

  const zoomImageX = this.zoomCanvas.width / 2 - zoomImageSize / 2;
  const zoomImageY = this.zoomCanvas.height / 2 - zoomImageSize / 2;

  const offsetX = this.mouse - this.canvas.width / 4;
  const offsetY = this.observationY - this.canvas.height / 4;

  //建立headless canvas
  const bigCanvas = document.createElement("canvas");
  bigCanvas.width = this.image.width * this.zoomFactor;
  bigCanvas.height = this.image.height * this.zoomFactor;
  const bigCtx = bigCanvas.getContext("2d");

  bigCtx.translate(bigCanvas.width / 2, bigCanvas.height / 2);
  bigCtx.scale(-1, -1);
  bigCtx.drawImage(
    this.image,
    0,
    0,
    this.image.width,
    this.image.height,
    -bigCanvas.width / 2,
    -bigCanvas.height / 2,
    bigCanvas.width,
    bigCanvas.height
  );

  this.zoomCtx.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
  this.zoomCtx.drawImage(
    bigCanvas,
    0,
    0,
    zoomImageSize,
    zoomImageSize,
    zoomImageX,
    zoomImageY,
    zoomImageSize,
    zoomImageSize
  );
};

Microscope.prototype.drawZoomImage3 = function () {
  this.zoomCtx.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 繪製外框
  this.zoomCtx.strokeStyle = "black";
  this.zoomCtx.strokeRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 繪製黑色視野背景
  this.zoomCtx.fillStyle = "black";
  this.zoomCtx.fillRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  const zoomSize = Math.min(this.zoomCanvas.width, this.zoomCanvas.height);

  // 計算觀察圓孔在縮放影像中的位置
  const observationX = this.observationX - this.slideX - this.offsetX;
  const observationY = this.observationY - this.slideY - this.offsetY;

  // 計算觀察圓孔在原始影像中的位置
  const observationXInImage =
    (observationX / this.slideWidth) * this.image.width;
  const observationYInImage =
    (observationY / this.slideHeight) * this.image.height;

  // 計算縮放比例
  const scale = zoomSize / (this.zoomFactor * this.slideWidth);
  /*
  // 繪製觀察圓孔內的玻片
  this.zoomCtx.fillStyle = this.slideColor;
  this.zoomCtx.fillRect(0, 0, zoomSize, zoomSize);
  this.zoomCtx.drawImage(
    this.image,
    this.slideX + this.offsetX,
    this.slideY + this.offsetY,
    this.slideWidth,
    this.slideHeight,
    0,
    0,
    zoomSize,
    zoomSize
  );
  */

  // 裁切成圓形
  this.zoomCtx.beginPath();
  this.zoomCtx.arc(zoomSize / 2, zoomSize / 2, zoomSize / 2, 0, 2 * Math.PI);
  this.zoomCtx.closePath();
  this.zoomCtx.clip();
  this.zoomCtx.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 繪製翻轉的影像
  this.zoomCtx.save();
  //this.zoomCtx.translate(zoomSize / 2, zoomSize / 2);
  this.zoomCtx.scale(-1, -1); // 垂直和水平方向都進行翻轉
  this.zoomCtx.drawImage(
    this.image,
    observationXInImage - zoomSize / (2 * scale),
    observationYInImage - zoomSize / (2 * scale),
    zoomSize / scale,
    zoomSize / scale,
    -zoomSize / 2,
    -zoomSize / 2,
    zoomSize,
    zoomSize
  );
  this.zoomCtx.restore();
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

// 创建 Microscope 实例
const microscope = new Microscope("cell.jpg", "canvas", "zoomCanvas", 10);

/*

*/

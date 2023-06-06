class Microscope {
  constructor(imageUrl, canvasId, zoomCanvasId, zoomFactor) {
    this.image = new Image();
    this.image.onload = this.drawInitialImage.bind(this);
    this.image.src = imageUrl;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.zoomCanvas = document.getElementById(zoomCanvasId);
    this.zoomCtx = this.zoomCanvas.getContext("2d");

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
    this.distanceToMiddle = 50;
    // 載玻片設定
    this.slideBorderColor = "darkgray";
    this.slideColor = "rgba(186, 217, 230, 0.1)";
    this.slideWidth = 150;
    this.slideHeight = 50;
    this.slideX =
      (this.canvas.width - this.slideWidth) / 2 - this.distanceToMiddle;
    this.slideY =
      (this.canvas.height - this.slideHeight) / 2 - this.distanceToMiddle;

    // 載玻片上的標本設定
    this.specimenWidth = 35;
    this.specimenHeight = 35;
    this.specimenX = this.slideX + (this.slideWidth - this.specimenWidth) / 2;
    this.specimenY = this.slideY + (this.slideHeight - this.specimenHeight) / 2;

    // 載物台設定
    this.stageWidth = 180;
    this.stageHeight = 120;
    this.stageX = this.canvas.width / 2 - this.stageWidth / 2;
    this.stageY = this.canvas.height / 2 - this.stageHeight / 2;
    this.stageColor = "rgba(66, 72, 74,1)";
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

    this.offsetX += deltaX;
    this.offsetY += deltaY;

    this.slideX += deltaX;
    this.slideY += deltaY;
    this.specimenX += deltaX;
    this.specimenY += deltaY;

    this.startX = mouseX;
    this.startY = mouseY;

    this.drawInitialImage();
    this.drawZoomImage(this.zoomCanvas);
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
  //黑色平台
  this.ctx.fillStyle = this.stageColor;
  this.ctx.fillRect(
    this.stageX,
    this.stageY,
    this.stageWidth,
    this.stageHeight
  );

  //黃色圓孔
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
};

//畫canvas上的初始影像
Microscope.prototype.drawInitialImage = function () {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  // 繪製外框
  this.ctx.strokeStyle = "black";
  this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

  // 繪製載物台
  this.drawStage();

  // 繪製載玻片
  //this.ctx.save();
  this.ctx.fillStyle = this.slideColor;
  this.ctx.fillRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );
  //this.ctx.restore;

  this.ctx.strokeStyle = this.slideBorderColor;
  this.ctx.strokeRect(
    this.slideX,
    this.slideY,
    this.slideWidth,
    this.slideHeight
  );

  // 繪製標本小圖
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

  // 繪製黑色外框與背景
  this.zoomCtx.fillStyle = "black";
  this.zoomCtx.fillRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);

  // 黑色外框與背景
  newCtx.strokeStyle = "black";
  newCtx.strokeRect(0, 0, newCanvas.width, newCanvas.height);

  // 裁切出視野的圓形
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

  // 繪製載玻片
  newCtx.fillStyle = this.slideColor;
  newCtx.fillRect(
    zoomedSlideX,
    zoomedSlideY,
    this.slideWidth * this.zoomFactor,
    this.slideHeight * this.zoomFactor
  );
  newCtx.strokeStyle = this.slideBorderColor;
  newCtx.strokeRect(
    zoomedSlideX,
    zoomedSlideY,
    this.slideWidth * this.zoomFactor,
    this.slideHeight * this.zoomFactor
  );

  // 繪製放大影像
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

  // 上下顛倒左右相反
  newCtx.save();
  newCtx.translate(newCanvas.width, newCanvas.height);
  newCtx.scale(-1, -1);
  newCtx.drawImage(newCanvas, 0, 0);
  newCtx.restore();
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

// 檢查點擊位置是否在卡片上
function checkClickedSlide(mouseX, mouseY) {
  var selected = null;

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    if (
      mouseX > card.x &&
      mouseX < card.x + cardWidth &&
      mouseY > card.y &&
      mouseY < card.y + cardHeight
    ) {
      selected = card;
      break;
    }
  }
  return selected;
}

function zoom(zoomFactor, sender) {
  microscope.setZoomFactor(zoomFactor);
  microscope.drawInitialImage();
  console.log(sender);
  sender.style.backgroundColor = "lightblue";

  // Get the parent container
  var container = sender.parentNode;

  // Get all sibling buttons
  var buttons = container.getElementsByClassName("large-button");

  // Reset background color for sibling buttons
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i] !== sender) {
      buttons[i].style.backgroundColor = ""; // Set the default color here
    }
  }
}

// 建 Microscope instance
const microscope = new Microscope("cell.jpg", "canvas", "zoomCanvas", 20);

/*

*/

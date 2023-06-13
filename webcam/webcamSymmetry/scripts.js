const width = 320;
var height = 0;
var streaming = false;

const videoSelect = document.querySelector("select#videoSource");
videoSelect.onchange = getStream;
const video = document.querySelector(".player");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const tempCanvas = document.getElementById("tempCanvas");
const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

const photoCanvas = document.getElementById("photo");
const photoCtx = photoCanvas.getContext("2d", { willReadFrequently: true });

const mirrorAxisX = width / 2; // 新對稱軸的 X 座標
const leftCanvas = document.getElementById("leftCanvas");
const leftCtx = leftCanvas.getContext("2d", { willReadFrequently: true });

const rightCanvas = document.getElementById("rightCanvas");
const rightCtx = rightCanvas.getContext("2d", { willReadFrequently: true });

var photoData;
var originalPixels;
var animationArray = [];
var snapshotButton = document.getElementById("snapshot");
var hideCameraButton = document.getElementById("hideCamera");
var resetButton = document.getElementById("reset");

var timerInterval = null;
var animationInterval = null;
var animationSpeed = 100; // Default animation speed (in milliseconds)

var dots = [
  { x: width / 2, y: 10 },
  { x: width / 2, y: 50 },
];

var centerX = (dots[0].x + dots[1].x) / 2;
var centerY = (dots[0].y + dots[1].y) / 2;

var dotIndex = -1;

// Drag and drop functions
let isDragging = false; // Add a flag to track if dragging is in progress

var offsetX, offsetY;

// 取得裝置
getStream().then(getDevices).then(gotDevices);

window.addEventListener("load", startup, false);

function getDevices() {
  // AFAICT in Safari this only gets default devices until gUM is called :/
  return navigator.mediaDevices.enumerateDevices();
}
function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos; // make available to console
  console.log("Available input and output devices:", deviceInfos);
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
    videoSelect.appendChild(option);
  }
}

async function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const videoSource = videoSelect.value;
  const constraints = {
    audio: false,
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return gotStream(stream);
  } catch (error) {
    return handleError(error);
  }
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    (option) => option.text === stream.getVideoTracks()[0].label
  );

  video.srcObject = stream;
  video.play();
}

function handleError(error) {
  console.error("Error: ", error);
}

function startup() {
  video.addEventListener(
    "canplay",
    (ev) => {
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth / width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4 / 3);
        }

        video.setAttribute("width", width);
        video.setAttribute("height", height);

        tempCanvas.width = width;
        tempCanvas.height = height;

        canvas.width = width;
        canvas.height = height;

        photoCanvas.width = width;
        photoCanvas.height = height;

        leftCanvas.width = width;
        leftCanvas.height = height;
        rightCanvas.width = width;
        rightCanvas.height = height;
        //canvas.setAttribute("width", width);
        //canvas.setAttribute("height", height);
        streaming = true;
        paintToCanvas();
      }
    },
    false
  );

  photoCanvas.addEventListener("mousedown", startDrag);
  photoCanvas.addEventListener("mousemove", drag);
  photoCanvas.addEventListener("mouseup", endDrag);
  photoCanvas.addEventListener("mouseleave", endDrag);

  snapshotButton.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      takePicture();
    },
    false
  );

  hideCameraButton.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      if (
        window.getComputedStyle(canvas).getPropertyValue("display") === "none"
      ) {
        canvas.style.display = "inline";
        hideCameraButton.textContent = "隱藏相機";
      } else {
        canvas.style.display = "none";
        hideCameraButton.textContent = "顯示相機";
      }
    },
    false
  );
  resetButton.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      reset();
    },
    false
  );
}

function paintToCanvas() {
  timerInterval = setInterval(() => {
    tempCtx.drawImage(video, 0, 0, width, height);
    originalPixels = tempCtx.getImageData(0, 0, width, height);
    ctx.putImageData(originalPixels, 0, 0);
  }, 16);
}

function stopTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function clearAnimation() {
  clearInterval(animationInterval);
  animationInterval = null;
}

function takePicture() {
  photoData = tempCtx.getImageData(0, 0, width, height);
  drawPhotoCanvas();
  drawMirrorPhoto();
}

function drawPhotoCanvas() {
  //let picture = tempCtx.getImageData(0, 0, width, height);
  photoCtx.putImageData(photoData, 0, 0);

  photoCtx.fillStyle = "red";
  photoCtx.strokeStyle = "red";
  photoCtx.lineWidth = 1;

  // Draw the first red dot
  photoCtx.beginPath();
  photoCtx.arc(dots[0].x, dots[0].y, 3, 0, Math.PI * 2);
  photoCtx.fill();

  // Draw the second red dot
  photoCtx.beginPath();
  photoCtx.arc(dots[1].x, dots[1].y, 3, 0, Math.PI * 2);
  photoCtx.fill();

  // Draw the line connecting the two dots
  photoCtx.beginPath();
  photoCtx.moveTo(dots[0].x, dots[0].y);
  photoCtx.lineTo(dots[1].x, dots[1].y);
  photoCtx.lineWidth = 1; // Set the line width if needed
  photoCtx.stroke();
}




function playAnimation() {
  if (animationArray.length === 0) {
    console.log("No images in the animationArray.");
    return;
  }
  let currentIndex = 0;

  animationInterval = setInterval(() => {
    //animationCtx.clearRect(0, 0, width, height);
    animationCtx.putImageData(animationArray[currentIndex], 0, 0);

    currentIndex++;
    if (currentIndex >= animationArray.length) {
      currentIndex = 0;
    }
  }, animationSpeed);
}

function reset() {
  clearAnimation();
  animationArray = [];
}

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

function startDrag(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = photoCanvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  dotIndex = findTheDotIndex(mouseX, mouseY); // Find the dot being clicked on
  if (dotIndex !== -1) {
    isDragging = true; // Set the flag to indicate dragging is in progress
  }
}

function drag(event) {
  event.preventDefault(); // Prevent default touch events
  if (!isDragging) return; // Exit if dragging is not in progress

  var rect = photoCanvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinatesMoving(event, rect);
  if (dotIndex !== -1) {
    // Update the position of the dragged dot
    dots[dotIndex].x = mouseX;
    dots[dotIndex].y = mouseY;

    centerX = (dots[0].x + dots[1].x) / 2;
    centerY = (dots[0].y + dots[1].y) / 2;
    // Redraw the canvas with the updated dot positions
    //stopTimerInterval();
    //paintToCanvas();
    drawPhotoCanvas();
    drawMirrorPhoto();
  }
}

function endDrag() {
  isDragging = false; // Reset the flag to indicate dragging has ended
  /*
  canvas.removeEventListener("mousemove", drag);
  canvas.removeEventListener("mouseup", endDrag);
  canvas.removeEventListener("touchmove", drag);
  canvas.removeEventListener("touchend", endDrag);
  */
}

function findTheDotIndex(mouseX, mouseY) {
  // Assuming you have an array of dot coordinates called `dots`
  let nearestDot = null;
  let shortestDistance = Infinity;

  for (const dot of dots) {
    const distance = Math.sqrt((dot.x - mouseX) ** 2 + (dot.y - mouseY) ** 2);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestDot = dot;
    }
  }
  var dotIndex = dots.findIndex((d) => d === nearestDot);

  return dotIndex;
}

function redrawCanvas() {
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(originalPixels, 0, 0);

  // Iterate over all dots and draw them
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iterate over pairs of dots and draw lines
  for (let i = 0; i < dots.length - 1; i++) {
    const dot1 = dots[i];
    const dot2 = dots[i + 1];

    ctx.beginPath();
    ctx.moveTo(dot1.x, dot1.y);
    ctx.lineTo(dot2.x, dot2.y);
    ctx.stroke();
  }
}

function drawMirrorPhoto() {
  // 計算新的對稱軸點座標
  const newAxisX = width / 2;
  const newAxisY1 = 0;
  const newAxisY2 = height / 2;

  // 繪製左方圖形到 leftCtx
  leftCtx.putImageData(photoData, 0, 0);

  // 取得左方圖形的像素數據
  const imageData = leftCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;


  // 對於原始畫布上的每個點進行轉換
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < mirrorAxisX; x++) {
      // 對稱軸的轉換
      const newX = 2 * newAxisX - x;
      const newY = 2 * newAxisY2 - y;

      // 獲取原始畫布上的像素索引
      const index = (y * width + x) * 4;

      // 將像素值放置到新的畫布上
      const newIndex = (newY * width + newX) * 4;
      pixels[newIndex] = pixels[index]; // 紅色通道
      pixels[newIndex + 1] = pixels[index + 1]; // 綠色通道
      pixels[newIndex + 2] = pixels[index + 2]; // 藍色通道
      pixels[newIndex + 3] = pixels[index + 3]; // 透明度通道
    }
  }

  // 將鏡射並旋轉後的圖形放回 leftCtx
  leftCtx.putImageData(imageData, 0, 0);
}

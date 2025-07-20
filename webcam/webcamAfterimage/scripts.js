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

var originalPixels;

var snapshotButton = document.getElementById("snapshot");
var showGreyButton = document.getElementById("showGrey");

var ifCapture = true;
var mode = "negative";

var timerInterval = null;

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
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        streaming = true;
        paintToCanvas();
      }
    },
    false
  );

  //clearphoto();
  snapshotButton.addEventListener(
    "click",
    (ev) => {
      if (ifCapture) {
        stopTimerInterval();
        ifCapture = false;
        snapshotButton.textContent = "重置";
      } else{
        paintToCanvas();
        ifCapture = true;
        snapshotButton.textContent = "拍照";
      }
      ev.preventDefault();

    },
    false
  );

  showGreyButton.addEventListener(
    "click",
    (ev) => {
      showGrey();
      ev.preventDefault();
    },
    false
  );
}

function paintToCanvas() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  canvas.width = width;
  canvas.height = height;
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  timerInterval = setInterval(() => {
    tempCtx.drawImage(video, 0, 0, width, height); // 每 16 毫秒將攝影機畫面「印」至 canvas
    // 取得圖像資訊，imgData.data 會是一類陣列，imgData.data[0] => red, imgData.data[1] => green, imgData.data[2] => blue, imgData.data[3] => alpha 以此四個一組類推
    originalPixels = tempCtx.getImageData(0, 0, width, height);
    // 加上濾鏡
    let pixels = applyNegativeEffect(originalPixels);
    // 輸出至 canvas
    ctx.putImageData(pixels, 0, 0);
  }, 16);
}

function showGrey() {
  if (timerInterval) {
    stopTimerInterval();
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  canvas.width = width;
  canvas.height = height;

  if (mode === "negative") {
    originalPixels = tempCtx.getImageData(0, 0, width, height);
    let pixels = applyGrayscaleEffect(originalPixels);
    // 輸出至 canvas
    ctx.putImageData(pixels, 0, 0);
    mode = "grey";
    showGreyButton.textContent = "負片";
  } else if (mode === "grey") {
    originalPixels = tempCtx.getImageData(0, 0, width, height);
    let pixels = applyNegativeEffect(originalPixels);
    // 輸出至 canvas
    ctx.putImageData(pixels, 0, 0);
    mode = "negative";
    showGreyButton.textContent = "灰階";
  }
}

function stopTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// 負片效果
function applyNegativeEffect(pixels) {
  for (let i = 0; i < pixels.data.length; i += 4) {
    // 获取红、绿、蓝、透明度值
    let red = pixels.data[i];
    let green = pixels.data[i + 1];
    let blue = pixels.data[i + 2];

    // 将颜色值取反
    red = 255 - red;
    green = 255 - green;
    blue = 255 - blue;

    // 更新像素值
    pixels.data[i] = red;
    pixels.data[i + 1] = green;
    pixels.data[i + 2] = blue;
  }

  return pixels;
}

// 灰階效果
function applyGrayscaleEffect(pixels) {
  for (let i = 0; i < pixels.data.length; i += 4) {
    // 获取红、绿、蓝通道值
    let red = pixels.data[i];
    let green = pixels.data[i + 1];
    let blue = pixels.data[i + 2];

    // 计算灰度值
    let grayscale = (red + green + blue) / 3;

    // 更新像素值为灰度值
    pixels.data[i] = grayscale;
    pixels.data[i + 1] = grayscale;
    pixels.data[i + 2] = grayscale;
  }

  return pixels;
}

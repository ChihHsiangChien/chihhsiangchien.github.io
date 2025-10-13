var videoWidth = 100;
var videoHeight = 0;
const canvasWidth = 600;
const canvasHeight = 300;

var streaming = false;

var sensorValuesQueue = [];
var maxValue = 0;
var minValue = 255;
var numQueue = 300;// queue裡的數目

const videoSelect = document.querySelector("select#videoSource");
videoSelect.onchange = getStream;
const video = document.querySelector(".player");
const canvas = document.getElementById("canvas");
//const canvas = document.querySelector('cvd');
const ctx = canvas.getContext("2d", { willReadFrequently: true });

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
        videoHeight = video.videoHeight / (video.videoWidth / videoWidth);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(videoHeight)) {
          videoHeight = videoWidth / (4 / 3);
        }

        video.setAttribute("width", videoWidth);
        video.setAttribute("height", videoHeight);
        canvas.setAttribute("width", canvasWidth);
        canvas.setAttribute("height", canvasHeight);
        streaming = true;
        paintToCanvas();
      }
    },
    false
  );

  //clearphoto();
}

function paintToCanvas() {

  return setInterval(() => {
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight); // 每 16 毫秒將攝影機畫面「印」至 canvas
    // 取得圖像資訊，imgData.data 會是一類陣列，imgData.data[0] => red, imgData.data[1] => green, imgData.data[2] => blue, imgData.data[3] => alpha 以此四個一組類推
    let pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    var redValue = extractRedChannel(pixels);
    //maxValue = Math.max(maxValue, redValue);
    //minValue = Math.min(minValue, redValue);
    addToSensorValuesQueue(redValue);

    // 輸出至 graphCanvas
    drawLineChart(sensorValuesQueue, minValue, maxValue);
    }, 10);
}
function extractRedChannel(pixels) {
  var data = pixels.data;
  var redValues = [];

  // 计算画面中央1/3的起始和结束位置
  var startY = Math.floor(pixels.height / 3);
  var endY = Math.floor((pixels.height / 3) * 2);
  var startX = Math.floor(pixels.width / 3);
  var endX = Math.floor((pixels.width / 3) * 2);

  var width = pixels.width;

  // 提取中央1/3部分的红色通道值
  for (var y = startY; y < endY; y++) {
    for (var x = startX; x < endX; x++) {
      var index = (y * width + x) * 4;
      var red = data[index];
      redValues.push(red);
    }
  }

  // 計算紅光平均值
  var sum = redValues.reduce(function (a, b) {
    return a + b;
  }, 0);
  var average = sum / redValues.length;

  return average;
}

function addToSensorValuesQueue(value) {
  sensorValuesQueue.push(value);

  if (sensorValuesQueue.length > numQueue) {
    sensorValuesQueue.shift();
  }

}
function drawLineChart(queue) {
  var minValue = Math.min(...queue);
  var maxValue = Math.max(...queue);

  var valueRange = maxValue - minValue;


  // 計算縱軸的最大最小值
  var yAxisMin = minValue - valueRange * 0.1;
  var yAxisMax = maxValue + valueRange * 0.1;

  // 清空畫布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 繪製座標軸
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight);
  ctx.lineTo(0, canvasHeight);
  ctx.lineTo(canvasWidth, canvasHeight);
  ctx.strokeStyle = "#000";
  ctx.stroke();

  // 繪製折線
  ctx.beginPath();
  ctx.strokeStyle = "#f00";
  ctx.lineWidth = 2;

  var xStep = canvas.width / (queue.length - 1);

  for (var i = 0; i < queue.length; i++) {
    var x = i * xStep;
    var y = ((queue[i] - yAxisMin) / (yAxisMax - yAxisMin)) * canvasHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

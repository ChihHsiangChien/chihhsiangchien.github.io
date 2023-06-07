const width = 320;
var height = 0;
var streaming = false;

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
}

function paintToCanvas() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  canvas.width = width;
  canvas.height = height;

  return setInterval(() => {
    ctx.drawImage(video, 0, 0, width, height); // 每 16 毫秒將攝影機畫面「印」至 canvas
    // 取得圖像資訊，imgData.data 會是一類陣列，imgData.data[0] => red, imgData.data[1] => green, imgData.data[2] => blue, imgData.data[3] => alpha 以此四個一組類推
    let pixels = ctx.getImageData(0, 0, width, height);
    // 加上濾鏡
    var redValues = extractRedChannel(pixels);
    // 輸出至 graphCanvas

    drawLineChart(redValues);
  }, 16);
}
function drawLineChart(redValues) {
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 设置绘制参数
  var lineWidth = 2;
  var graphHeight = canvas.height - 20;
  var graphWidth = canvas.width;

  redValues = redValues.filter(value => typeof value === 'number');

  if (redValues.length > 0) {
    var startIndex = Math.floor(redValues.length / 3);
    var endIndex = Math.floor((2 * redValues.length) / 3);
    var valuesInRange = redValues.slice(startIndex, endIndex);
    var averageValue = valuesInRange.reduce((a, b) => a + b, 0) / valuesInRange.length;

    // 绘制折线图
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "red";

    for (var i = 0; i < valuesInRange.length; i++) {
      var x = (i / valuesInRange.length) * graphWidth;
      var y = graphHeight - (valuesInRange[i] / averageValue) * graphHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }
}

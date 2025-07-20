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
    pixels = simulateColorBlindness(pixels, "protanopia");

    // 輸出至 canvas
    ctx.putImageData(pixels, 0, 0);
  }, 16);
}

function simulateColorBlindness(pixels, type) {
  const data = pixels.data;
  const length = data.length;

  for (let i = 0; i < length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    let newRed, newGreen, newBlue;

    // Simulate protanopia (red-green color blindness)
    if (type === "protanopia") {
      newRed = 0.567 * red + 0.433 * green + 0 * blue;
      newGreen = 0.558 * red + 0.442 * green + 0 * blue;
      newBlue = 0 * red + 0.242 * green + 0.758 * blue;
    }
    // Add more conditions to simulate other types of color blindness

    data[i] = newRed;
    data[i + 1] = newGreen;
    data[i + 2] = newBlue;
  }

  return pixels;
}

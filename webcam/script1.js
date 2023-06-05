"use strict";

const width = 320; // We will scale the photo width to this
let height = 0; // This will be computed based on the input stream
let streaming = false;

//const videoElement = document.querySelector('video');
const videoElement = document.getElementById("video");

const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");
const canvas = document.getElementById("canvas");
const photo = document.getElementById("photo");
const strip = document.querySelector(".strip");

var snapshotButton = document.getElementById("snapshot");
var pauseOrPlayButton = document.getElementById("pauseOrPlay");

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;
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
    if (deviceInfo.kind === "audioinput") {
      option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

async function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const audioSource = audioSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
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
  audioSelect.selectedIndex = [...audioSelect.options].findIndex(
    (option) => option.text === stream.getAudioTracks()[0].label
  );
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    (option) => option.text === stream.getVideoTracks()[0].label
  );
  videoElement.srcObject = stream;
  videoElement.play();
}

function handleError(error) {
  console.error("Error: ", error);
}

function startup() {
  if (showViewLiveResultButton()) {
    return;
  }

  videoElement.addEventListener(
    "canplay",
    (ev) => {
      if (!streaming) {
        height = videoElement.videoHeight / (videoElement.videoWidth / width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4 / 3);
        }

        videoElement.setAttribute("width", width);
        videoElement.setAttribute("height", height);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        streaming = true;
      }
    },
    false
  );

  snapshotButton.addEventListener(
    "click",
    (ev) => {
      takepicture();
      ev.preventDefault();
    },
    false
  );

  pauseOrPlayButton.addEventListener(
    "click",
    (ev) => {
      if (streaming) {
        videoElement.pause();
        pauseOrPlayButton.textContent = "開始影像";
      } else {
        videoElement.play();
        pauseOrPlayButton.textContent = "停止影像";
      }
      streaming = !streaming;
    },
    false
  );


  clearphoto();
}

function showViewLiveResultButton() {
  if (window.self !== window.top) {
    // Ensure that if our document is in a frame, we get the user
    // to first open it in its own tab or window. Otherwise, it
    // won't be able to request permission for camera access.
    document.querySelector(".contentarea").remove();
    const button = document.createElement("button");
    button.textContent = "查看以上示例代码的实时演示";
    document.body.append(button);
    button.addEventListener("click", () => window.open(location.href));
    return true;
  }
  return false;
}

// Fill the photo with an indication that none has been
// captured.

function clearphoto() {
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  context.fillStyle = "#AAA";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const data = canvas.toDataURL("image/png");
  photo.setAttribute("src", data);
}

// Capture a photo by fetching the current contents of the video
// and drawing it into a canvas, then converting that to a PNG
// format data URL. By drawing it on an offscreen canvas and then
// drawing that to the screen, we can change its size and/or apply
// other changes before drawing it.

function takepicture() {
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (width && height) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    let pixels = context.getImageData(0, 0, width, height);
    pixels = rgbSplit(pixels);
    context.putImageData(pixels, 0, 0);

    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);

    // 在 strip增加照片與下載連結
    const link = document.createElement("a");
    link.href = data;
    link.setAttribute("download", "Handsome.png"); // 下載時的檔名
    link.innerHTML = `<img src="${link}" alt="handsome guy/girl"/>`; // 在 a 當中新增 img
    strip.insertBefore(link, strip.firstChild); // 最新的照片會在最前面，使用 appendChild 會放在最後面
  } else {
    clearphoto();
  }
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
    pixels = rgbSplit(pixels);
    // 輸出至 canvas
    ctx.putImageData(pixels, 0, 0);
  }, 16);
}

function redEffect(pixels) {
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i + 0] = pixels.data[i + 0] + 200; // RED
    pixels.data[i + 1] = pixels.data[i + 1] - 50; // GREEN
    pixels.data[i + 2] = pixels.data[i + 2] * 0.5; // Blue
  }
  return pixels;
}

function invertEffect(pixels) {
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i] = 255 - pixels.data[i]; // RED
    pixels.data[i + 1] = 255 - pixels.data[i + 1]; // GREEN
    pixels.data[i + 2] = 255 - pixels.data[i + 2]; // BLUE
    pixels.data[i + 3] = 255;
  }
  return pixels;
}

function rgbSplit(pixels) {
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i - 150] = pixels.data[i]; // RED
    pixels.data[i + 500] = pixels.data[i + 1]; // GREEN
    pixels.data[i - 550] = pixels.data[i + 2]; // BLUE
  }
  return pixels;
}

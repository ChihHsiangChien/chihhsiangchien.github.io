const width = 320;
var height = 0;
var streaming = false;

const videoSelect = document.querySelector("select#videoSource");
videoSelect.onchange = getStream;
const video = document.querySelector(".player");


const tempCanvas = document.getElementById("tempCanvas");
const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

const leftCanvas = document.getElementById("leftCanvas");
const leftCtx = leftCanvas.getContext("2d", { willReadFrequently: true });

const rightCanvas = document.getElementById("rightCanvas");
const rightCtx = rightCanvas.getContext("2d", { willReadFrequently: true });

var photoData;
var originalPixels;
var snapshotButton = document.getElementById("snapshot");
var resetButton = document.getElementById("reset");

var timerInterval = null;
var animationInterval = null;
var animationSpeed = 100; // Default animation speed (in milliseconds)


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

  snapshotButton.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      takePicture();
    },
    false
  );

  resetButton.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      paintToCanvas();
    },
    false
  );
}

function paintToCanvas() {
  timerInterval = setInterval(() => {
    tempCtx.drawImage(video, 0, 0, width, height);
    //originalPixels = tempCtx.getImageData(0, 0, width, height);
    //ctx.putImageData(originalPixels, 0, 0);
    drawMirrorPhoto();
  }, 16);
}

function stopTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = null;
}


function takePicture() {
  stopTimerInterval();
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

function drawMirrorPhoto() {
  
  // Clear the leftCtx before drawing the flipped image
  leftCtx.clearRect(0, 0, width, height);
  leftCtx.strokeStyle = "black";
  leftCtx.lineWidth = 1;
  leftCtx.strokeRect(0, 0, width, height);

  // Draw the original image on the left side of the leftCtx
  leftCtx.drawImage(tempCanvas, 0, 0, width / 2, height, 0, 0, width / 2, height);
  
  // Draw the mirrored image on the right side of the leftCtx
  leftCtx.save();
  leftCtx.scale(-1, 1); // Flip horizontally
  leftCtx.drawImage(tempCanvas, 0, 0, width / 2, height, -width, 0, width / 2, height);  
  leftCtx.restore();

  // Clear the leftCtx before drawing the flipped image
  rightCtx.clearRect(0, 0, width, height);
  rightCtx.strokeStyle = "black";
  rightCtx.lineWidth = 1;
  rightCtx.strokeRect(0, 0, width, height);

  // Draw the original image on the left side of the leftCtx
  rightCtx.drawImage(tempCanvas, width/2, 0, width / 2, height, width/2, 0, width / 2, height);
  
  // Draw the mirrored image on the right side of the leftCtx
  rightCtx.save();
  rightCtx.scale(-1, 1); // Flip horizontally
  rightCtx.drawImage(tempCanvas, width/2, 0, width / 2, height, -width/2, 0, width / 2, height);  
  rightCtx.restore();
  
}

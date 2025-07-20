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

const animationCanvas = document.getElementById("animationCanvas");
const animationCtx = animationCanvas.getContext("2d", {
  willReadFrequently: true,
});

var originalPixels;
var animationArray = [];
var snapshotButton = document.getElementById("snapshot");
var hideCameraButton = document.getElementById("hideCamera");
var resetButton = document.getElementById("reset");

var speedUpButton = document.getElementById("speedUp");
var speedDownButton = document.getElementById("speedDown");

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

        animationCanvas.width = width;
        animationCanvas.height = height;          
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
      takepicture();
      ev.preventDefault();
    },
    false
  );

  hideCameraButton.addEventListener(
    "click",
    (ev) => {
      if (
        window.getComputedStyle(canvas).getPropertyValue("display") === "none"
      ) {
        canvas.style.display = "inline";
        hideCameraButton.textContent = "隱藏相機";
      } else {
        canvas.style.display = "none";
        hideCameraButton.textContent = "顯示相機";
      }
      ev.preventDefault();
    },
    false
  );
  resetButton.addEventListener("click", (ev) => {
    ev.preventDefault();
    reset();
  },false);
  
  speedUpButton.addEventListener("click", (ev) => {
    ev.preventDefault();
    changeAnimationSpeed(-20);
  },false);  

  speedDownButton.addEventListener("click", (ev) => {
    ev.preventDefault();
    changeAnimationSpeed(20);
  },false);  
}

function paintToCanvas() {
  timerInterval = setInterval(() => {
    tempCtx.drawImage(video, 0, 0, width, height);
    originalPixels = tempCtx.getImageData(0, 0, width, height);
    let pixels = blendImages(originalPixels, animationArray[animationArray.length-1]);
    ctx.putImageData(pixels, 0, 0);
  }, 16);
}

function stopTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function clearAnimation(){
  clearInterval(animationInterval);
  animationInterval = null;
}
function takepicture() {
  let picture = tempCtx.getImageData(0, 0, width, height);
  animationArray.push(picture);
  clearAnimation();
  playAnimation();
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

function blendImages(originalPixels, animationImage) {

  if (animationImage === undefined) {
    return originalPixels;
  }
  let blendedPixels = ctx.createImageData(width, height);

  for (let i = 0; i < originalPixels.data.length; i += 4) {
    // Calculate the alpha value for blending
    let alpha = (originalPixels.data[i + 3] + animationImage.data[i + 3]) / 2;

    // Calculate the blended pixel values
    blendedPixels.data[i] = (originalPixels.data[i] + animationImage.data[i]) / 2;
    blendedPixels.data[i + 1] = (originalPixels.data[i + 1] + animationImage.data[i + 1]) / 2;
    blendedPixels.data[i + 2] = (originalPixels.data[i + 2] + animationImage.data[i + 2]) / 2;
    blendedPixels.data[i + 3] = alpha;
  }

  return blendedPixels;
}

function reset(){
  clearAnimation();
  animationArray =[];
}


function changeAnimationSpeed(speedChange) {
  clearInterval(animationInterval); // Clear the existing animation interval
  animationSpeed += speedChange; // Update the animation speed by adding the speedChange

  // Ensure that the animation speed is not negative
  if (animationSpeed < 50) {
    animationSpeed = 50;
  }

  if (animationSpeed > 1000) {
    animationSpeed = 1000;
  }

  playAnimation();
}

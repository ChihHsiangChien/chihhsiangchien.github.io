class Dots {
  constructor(num, centerX, centerY) {
    this.num = num;
    this.startAngle = Math.random() * 360;
    this.angle = 137.5;
    //this.centerX = canvas.width / 2;
    //this.centerY = canvas.height / 2;
    this.centerX = centerX;
    this.centerY = centerY;
    this.distanceTocenter = 10;
    this.size = 10;
    this.distanceScaleFactor = 0.5;
    this.radiusScaleFactor = 0;
    this.startI = 12;
  }

  draw() {
    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = this.startI; i < this.num + this.startI; i++) {
      var dotAngle = this.startAngle + this.angle * i;
      var radians = (dotAngle / 180) * Math.PI;

      // 每個點距離中心的距離，每圈加一個distanceScaleFactor
      var distance =
        this.distanceTocenter +
        this.distanceTocenter *
          Math.floor((this.startAngle + this.angle * i) / 360) *
          this.distanceScaleFactor;
      var posx = this.centerX + distance * Math.cos(radians);
      var posy = this.centerY + distance * Math.sin(radians);
      ctx.beginPath();
      ctx.arc(
        posx,
        posy,
        this.size * (1 + this.radiusScaleFactor * i),
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "rgba(100, 100, 100, 0.5)";

      ctx.fill();
    }
  }
}

async function startGame() {
  await setNumbers();
  console.log(numbers);

  initNumberStats();
  drawNextQuestion();
  canvas.addEventListener("mousedown", handleAnswerClick);
  canvas.addEventListener("touchstart", handleAnswerClick);
}

async function setNumbers() {
  return new Promise((resolve, reject) => {
    numbers = [];
    console.log(numbersStart, numbersEnd, diff, numbersAnswerTimes, showTime);

    for (let i = numbersStart; i <= numbersEnd; i++) {
      for (let j = 0; j < numbersAnswerTimes; j++) {
        numbers.push(i);
      }
    }

    // Fisher-Yates shuffle algorithm
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    resolve(); // Resolve the promise to indicate completion
  });
}

function initNumberStats() {
  for (let i = numbersStart; i <= numbersEnd; i++) {
    numberStats[i] = {
      correct: 0,
      wrong: 0,
    };
  }
}

function handleAnswerClick(event) {
  if (!clickenabled) return;

  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var side = checkClickedSide(mouseX, mouseY); // Find out which side was clicked

  if (side === correctSide) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
  numbers.shift(); // Remove the first element

  drawNextQuestion();

  clickenabled = false;
}

function handleCorrectAnswer() {
  var currentNumber = numbers[0];
  numberStats[currentNumber].correct++;
}

function handleWrongAnswer() {
  var currentNumber = numbers[0];
  numberStats[currentNumber].wrong++; // Increment the wrong count for the current number
}

function drawBoxes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let hSpace = 20;
  let vSpace = canvas.height / 6;
  const boxWidth = (canvas.width - 4 * hSpace) / 2; // Divide canvas width minus gaps by 2
  const boxHeight = canvas.height - 2 * vSpace; // Subtract twice the gap from canvas height

  // Draw the left box
  ctx.fillStyle = "grey";
  ctx.fillRect(hSpace, vSpace, boxWidth, boxHeight);

  // Draw the right box
  ctx.fillRect(2 * hSpace + boxWidth, vSpace, boxWidth, boxHeight);
}

function checkClickedSide(mouseX, mouseY) {
  if (mouseX > 0 && mouseX <= canvas.width / 2) return "left";
  else if (mouseX > canvas.width / 2 && mouseX < canvas.width) return "right";
}

function endClick() {
  selectedcard = null;
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

function drawNextQuestion() {
  if (numbers.length === 0) {
    endGame();
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  correctSide = Math.random() < 0.5 ? "left" : "right";
  dotsLeft.num = correctSide === "left" ? numbers[0] : numbers[0] - diff;
  dotsRight.num = correctSide === "left" ? numbers[0] - diff : numbers[0];

  dotsLeft.startAngle = Math.random() * 360;
  dotsRight.startAngle = Math.random() * 360;

  dotsLeft.draw();
  dotsRight.draw();

  setTimeout(function () {
    drawBoxes();
    clickenabled = true;
  }, showTime);
}

function endGame() {
  console.log(numberStats);

  canvas.removeEventListener("mousedown", handleAnswerClick);
  canvas.removeEventListener("touchstart", handleAnswerClick);

  drawLinePlot();
}

function drawLinePlot() {
  const plotWidth = canvas.width * 0.6;
  const plotHeight = canvas.height * 0.6;
  const plotX = (canvas.width - plotWidth) / 2;
  const plotY = (canvas.height - plotHeight) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawAxes(plotX, plotY, plotWidth, plotHeight);
  drawTicks(plotX, plotY, plotWidth, plotHeight);
  drawDataPoints(plotX, plotY, plotWidth, plotHeight);
}

function drawAxes(x, y, width, height) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  // Draw x-axis
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.stroke();

  // Draw y-axis
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.stroke();
}

function drawTicks(x, y, width, height) {
  // Draw tick marks on x-axis
  const tickCountX = numberCount;
  const tickSizeX = 20;

  for (let i = 0; i <= tickCountX; i++) {
    const tickX = x + (i * width) / tickCountX;
    const tickY = y + height;

    ctx.beginPath();
    ctx.moveTo(tickX, tickY);
    ctx.lineTo(tickX, tickY + tickSizeX);
    ctx.stroke();

    // Write number on tick mark
    ctx.fillStyle = "#000";
    ctx.font = "25px Arial";
    ctx.textAlign = "center";
    ctx.fillText(i + numbersStart, tickX, tickY + tickSizeX + 15);
  }

  // Draw tick marks on y-axis
  const tickCountY = 5;
  const tickSizeY = 20;

  for (let i = 0; i <= tickCountY; i++) {
    const tickX = x;
    const tickY = y + height - (i * height) / tickCountY;

    ctx.beginPath();
    ctx.moveTo(tickX, tickY);
    ctx.lineTo(tickX - tickSizeY, tickY);
    ctx.stroke();

    // Write number on tick mark
    ctx.fillStyle = "#000";
    ctx.font = "25px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(i * 20, tickX - tickSizeY - 5, tickY);
  }
}

function drawDataPoints(x, y, width, height) {
  const stepX = width / numberCount;
  const stepY = height / 100;

  ctx.fillStyle = "#f00";

  for (let i = 0; i < numberCount; i++) {
    const number = i + numbersStart;
    const correctRate = calculateCorrectRate(number);
    const dataX = x + i * stepX;
    const dataY = y + height - correctRate * stepY;

    ctx.beginPath();
    ctx.arc(dataX, dataY, 10, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function calculateCorrectRate(number) {
  const stats = numberStats[number];
  const totalAttempts = stats.correct + stats.wrong;

  if (totalAttempts === 0) {
    return 0;
  }

  return (stats.correct / totalAttempts) * 100;
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var numStartInput = document.getElementById("numStart");
var numEndInput = document.getElementById("numEnd");
var numDiffInput = document.getElementById("numDiff");
var numAnswerTimesInput = document.getElementById("numAnswerTimes");
var numShowTimeInput = document.getElementById("numShowTime");

var numButton = document.getElementById("numButton");

canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

// 產生題目
var numbersStart = 7;
var numbersEnd = 13;
var diff = 1;
var numbersAnswerTimes = 5;
var showTime = 500;

numStartInput.value = numbersStart;
numEndInput.value = numbersEnd;
numDiffInput.value = diff;
numAnswerTimesInput.value = numbersAnswerTimes;
numShowTimeInput.value = showTime;

var numbers = [];
var numberStats = {};
const numberCount = numbersEnd - numbersStart + 1;
var clickenabled = false;

var correctSide = Math.random() < 0.5 ? "left" : "right";
var dotsLeft, dotsRight;

numButton.addEventListener("click", function (event) {
  numbersStart = numStartInput.value;
  numbersEnd = numEndInput.value;
  diff = numDiffInput.value;
  numbersAnswerTimes = numAnswerTimesInput.value;
  showTime = numShowTimeInput.value;
  startGame();
});

dotsLeft = new Dots(
  //correctSide === "left" ? numbers[0] : numbers[0] - diff,
  1,
  canvas.width / 4,
  canvas.height / 2
);

dotsRight = new Dots(
  //correctSide === "left" ? numbers[0] - diff : numbers[0],
  1,
  (canvas.width * 3) / 4,
  canvas.height / 2
);

//startGame();

class Dots {
  constructor(num, startAngle, angle) {
    this.num = num;
    this.startAngle = startAngle;
    this.angle = angle;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.distanceTocenter = 10;
    this.size = 5;
    this.distanceScaleFactor = 0.5;
    this.radiusScaleFactor = 0.013;
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < this.num; i++) {
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

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var initNum = 200;
var initStartAngle = 0;
var initAngle = 137.5;
var dots = new Dots(initNum, initStartAngle, initAngle);
dots.draw();

var numSlider = document.getElementById("numSlider");
var numValue = document.getElementById("numValue");
var numInput = document.getElementById("numInput");
var numButton = document.getElementById("numButton");

numSlider.value = initNum;
numValue.textContent = initNum;
numInput.value = initNum;

numSlider.addEventListener("input", function (event) {
  dots.num = parseInt(event.target.value);
  numValue.textContent = event.target.value;
  numInput.value = event.target.value;
  dots.draw();
});


numButton.addEventListener("click", function (event) {
  var value = parseInt(numInput.value);
  if (!isNaN(value)) {
    dots.num = value;
    numSlider.value = value;
    numValue.textContent = value;
    dots.draw();
  }
});

////////////////////////////////


var startAngleSlider = document.getElementById("startAngleSlider");
var startAngleValue = document.getElementById("startAngleValue");
var startAngleInput = document.getElementById("startAngleInput");
var startAngleButton = document.getElementById("startAngleButton");

startAngleSlider.value = initStartAngle;
startAngleValue.textContent = initStartAngle;
startAngleInput.value = initStartAngle;



startAngleSlider.addEventListener("input", function (event) {
  dots.startAngle = parseFloat(event.target.value);
  startAngleValue.textContent = event.target.value;
  startAngleInput.value = event.target.value;
  dots.draw();
});


startAngleButton.addEventListener("click", function (event) {
  var value = parseFloat(startAngleInput.value);
  if (!isNaN(value)) {
    dots.startAngle = value;
    startAngleSlider.value = value;
    startAngleValue.textContent = value;
    dots.draw();
  }
});

////////////////////////////////

var angleSlider = document.getElementById("angleSlider");
var angleValue = document.getElementById("angleValue");
var angleInput = document.getElementById("angleInput");
var angleButton = document.getElementById("angleButton");

angleSlider.value = initAngle;
angleValue.textContent = initAngle;
angleInput.value = initAngle;

angleSlider.addEventListener("input", function (event) {
  dots.angle = parseFloat(event.target.value);
  angleValue.textContent = event.target.value;
  angleInput.value = event.target.value;
  dots.draw();
});


angleButton.addEventListener("click", function (event) {
  var value = parseFloat(angleInput.value);
  if (!isNaN(value)) {
    dots.angle = value;
    angleSlider.value = value;
    angleValue.textContent = value;
    dots.draw();
  }
});



var sizeSlider = document.getElementById("sizeSlider");
var sizeValue = document.getElementById("sizeValue");


sizeSlider.addEventListener("input", function (event) {
  dots.size = parseFloat(event.target.value);
  sizeValue.textContent = event.target.value;
  dots.draw();
});

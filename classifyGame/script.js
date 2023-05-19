// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var imagesLoaded = 0;
var imagesToLoad = 10;
var images = [];
var selectedImage = null;
var offsetX = 0;
var offsetY = 0;

// Load images
for (var i = 1; i <= imagesToLoad; i++) {
  var image = new Image();
  image.addEventListener("load", imageLoaded); // Add load event listener
  image.src = "images/" + i + ".jpg";
  images.push({
    element: image,
    x: 0,
    y: 0
  });
}

// Image load callback
function imageLoaded() {
  imagesLoaded++;
  if (imagesLoaded === imagesToLoad) {
    start();
  }
}

// Start function
function start() {
  // Resize canvas to fit window
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight *4/5;

  // Calculate box dimensions
  var boxWidth = canvas.width / 4;
  var boxHeight = canvas.height / 3;

  // Place images randomly
  images.forEach(function (image) {
    image.x = getRandomInt(0, canvas.width - image.element.width);
    image.y = getRandomInt(canvas.height/3, canvas.height*2/3 - image.element.height);
    ctx.drawImage(image.element, image.x, image.y);
  });


  // Enable dragging
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", drag);
  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("mouseleave", endDrag);
  
  // Draw Box
  drawAnswerBox();
}

// Helper function to get random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Drag and drop functions
function startDrag(event) {
  var rect = canvas.getBoundingClientRect();
  var mouseX = event.clientX - rect.left;
  var mouseY = event.clientY - rect.top;
  
  var highestZIndex = -1; // Variable to track the highest z-index
  var selected = null; // Variable to store the selected image
  
  for (var i = 0; i < images.length; i++) {
    var image = images[i];

    if (
      mouseX > image.x &&
      mouseX < image.x + image.element.width &&
      mouseY > image.y &&
      mouseY < image.y + image.element.height
    ) {
      var zIndex = parseInt(image.element.style.zIndex || 0); // Get the z-index of the image

      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
        selected = image;
      }
    }
  }
  
  if (selected) {
    selectedImage = selected;
    offsetX = mouseX - selected.x;
    offsetY = mouseY - selected.y;
    selectedImage.element.style.zIndex = highestZIndex + 1; // Set the z-index of the selected image higher than the highest z-index
  }
}


function drag(event) {
  if (selectedImage) {
    var rect = canvas.getBoundingClientRect();
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    var newImageX = mouseX - offsetX;
    var newImageY = mouseY - offsetY;

    // Adjust the position if the image exceeds the canvas boundaries
    if (newImageX < 0) {
      newImageX = 0;
    } else if (newImageX + selectedImage.element.width > canvas.width) {
      newImageX = canvas.width - selectedImage.element.width;
    }

    if (newImageY < 0) {
      newImageY = 0;
    } else if (newImageY + selectedImage.element.height > canvas.height) {
      newImageY = canvas.height - selectedImage.element.height;
    }

    selectedImage.x = newImageX;
    selectedImage.y = newImageY;

    redrawCanvas();
  }
}
function endDrag() {
  selectedImage = null;
}

function redrawCanvas() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawAnswerBox();
  for (var i = 0; i < images.length; i++) {
    var image = images[i];
    ctx.drawImage(image.element, image.x, image.y);
  }

}


function drawAnswerBox(){
  var kindomNames = ["刺絲胞", "扁形", "軟體", "環節", "節肢", "棘皮", "脊索"];
  boxWidth = canvas.width / 4;
  boxHeight = canvas.height / 3;
  for(var i = 0; i < 4; i++){
    ctx.beginPath();
    ctx.rect(0 + i*boxWidth , 0, boxWidth, boxHeight);
    ctx.stroke();
    
    ctx.font = "24px Arial";
    ctx.fillText(kindomNames[i], 0 + i*boxWidth + 10 , 30);    
  }

  for(var i = 0; i < 3; i++){
    ctx.beginPath();
    ctx.rect(0 + i * boxWidth , canvas.height *2/3 , boxWidth, boxHeight);
    ctx.stroke();
    ctx.font = "24px Arial";
    ctx.fillText(kindomNames[i+4], 0 + i*boxWidth + 10 , canvas.height *2/3 + 30);      
  }
}
function checkPlacement() {
  var correctPlacements = [
    [1, 2, 3, 4],   // Box 0 刺絲胞
    [5, 6, 7],      // Box 1 扁形
    [8, 9, 10]      // Box 2 軟體
                    // Box 3 環節
                    // Box 4 節肢
                    // Box 6 棘皮
                    // Box 7 脊索
  ];

  var score = 0;
  var wrongImages = [];

  // Check each image placement
  for (var boxIndex = 0; boxIndex < correctPlacements.length; boxIndex++) {
    var imageIndices = correctPlacements[boxIndex];

    for (var j = 0; j < imageIndices.length; j++) {
      var imageIndex = imageIndices[j] - 1;
      var image = images[imageIndex];
      var boxX = boxIndex * boxWidth;
      var boxY = boxIndex >= 3 ? canvas.height * 2 / 3 : 0;

      // Calculate the allowed tolerance for placement
      var tolerance = boxWidth / 10;

      // Check if the image is within the correct box area
      if (
        image.x + tolerance >= boxX &&
        image.x + image.element.width - tolerance <= boxX + boxWidth &&
        image.y + tolerance >= boxY &&
        image.y + image.element.height - tolerance <= boxY + boxHeight
      ) {
        score++;
      } else {
        wrongImages.push(image);
      }
    }
  }

  // Show the score above the canvas
  var scoreElement = document.getElementById("score");
  scoreElement.innerText = "Score: " + score;

  // If there are wrong images, slide them to the middle and allow the user to place them again
  if (wrongImages.length > 0) {
    slideWrongImages(wrongImages);
  }
}


function slideWrongImages(wrongImages) {
  var middleX = canvas.width / 2;
  var middleY = canvas.height / 2;

  // Animate the wrong images sliding to the middle
  for (var i = 0; i < wrongImages.length; i++) {
    var image = wrongImages[i];
    var targetX = getRandomInt(0, canvas.width - image.element.width);
    var targetY = getRandomInt(canvas.height/3, canvas.height*2/3 - image.element.height);


    // Use requestAnimationFrame for smoother animation
    animateSlide(image, targetX, targetY);
  }
}

function animateSlide(image, targetX, targetY) {
  var startX = image.x;
  var startY = image.y;
  var animationDuration = 500; // milliseconds
  var startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = timestamp - startTime;

    // Calculate the new position using easing function (e.g., easeOutQuad)
    var newX = easeOutQuad(progress, startX, targetX - startX, animationDuration);
    var newY = easeOutQuad(progress, startY, targetY - startY, animationDuration);

    image.x = newX;
    image.y = newY;
    redrawCanvas();

    if (progress < animationDuration) {
      requestAnimationFrame(step);
    }
  }

  // Start the animation
  requestAnimationFrame(step);
}

function easeOutQuad(t, b, c, d) {
  t /= d;
  return -c * t * (t - 2) + b;
}



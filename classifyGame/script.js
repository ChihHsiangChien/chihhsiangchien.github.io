// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var imagesLoaded = 0;
var imagesToLoad = 50;
var images = [];
var selectedImage = null;
var offsetX = 0;
var offsetY = 0;
var imgWidth = 80;

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
  canvas.width = window.innerWidth * 4/5;
  canvas.height = window.innerHeight *4/5;

  // Calculate box dimensions
  var boxWidth = canvas.width / 4;
  var boxHeight = canvas.height / 3;

  // Place images randomly
  images.forEach(function (image) {
    image.x = getRandomInt(0, canvas.width - image.element.width);
    image.y = getRandomInt(canvas.height/3, canvas.height*2/3 - imgWidth * image.element.height / image.element.width);
    // ctx.drawImage(image.element, image.x, image.y);
	ctx.drawImage(image.element, image.x, image.y, imgWidth, imgWidth * image.element.height / image.element.width);
  });


  // Enable dragging
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", drag);
  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("mouseleave", endDrag);


  // Touch event listeners
  canvas.addEventListener("touchstart", startDrag);
  canvas.addEventListener("touchmove", drag);
  canvas.addEventListener("touchend", endDrag);
  
  // Draw Box
  drawAnswerBox();
}

// Helper function to get random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Drag and drop functions
function startDrag(event) {  event.preventDefault(); // Prevent default touch events

  var rect = canvas.getBoundingClientRect();
  var mouseX, mouseY;

  if (event.type === "mousedown") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchstart") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }

  var highestZIndex = -1; // Variable to track the highest z-index
  var selected = null; // Variable to store the selected image

  for (var i = 0; i < images.length; i++) {
    var image = images[i];

    if (
		/* 
      mouseX > image.x &&
      mouseX < image.x + image.element.width &&
      mouseY > image.y &&
      mouseY < image.y + image.element.height
	  */
      mouseX > image.x &&
      mouseX < image.x + imgWidth &&
      mouseY > image.y &&
      mouseY < image.y + imgWidth * image.element.height / image.element.width
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
  event.preventDefault(); // Prevent default touch events

  if (selectedImage) {
    var rect = canvas.getBoundingClientRect();
    var mouseX, mouseY;

    if (event.type === "mousemove") {
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    } else if (event.type === "touchmove") {
      mouseX = event.touches[0].clientX - rect.left;
      mouseY = event.touches[0].clientY - rect.top;
    }

    var newImageX = mouseX - offsetX;
    var newImageY = mouseY - offsetY;

    // Adjust the position if the image exceeds the canvas boundaries
    if (newImageX < 0) {
      newImageX = 0;
    } else if (newImageX + selectedImage.element.width > canvas.width) {
      // newImageX = canvas.width - selectedImage.element.width;
	  newImageX = canvas.width - imgWidth;
	  
    }

    if (newImageY < 0) {
      newImageY = 0;
    } else if (newImageY + imgWidth * selectedImage.element.height / selectedImage.element.width > canvas.height) {
      newImageY = canvas.height - imgWidth * selectedImage.element.height / selectedImage.element.width;
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
    ctx.drawImage(image.element, image.x, image.y, imgWidth, imgWidth * image.element.height / image.element.width);
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
    [1, 2, 3, 4],                // Box 0 刺絲胞
    [5, 6, 7],                   // Box 1 扁形
    [8, 9, 10, 11, 12, 13],      // Box 2 軟體
    [14, 15, 16, 17, 18, 19],                // Box 3 環節
    [20, 21, 22, 23, 24, 25, 26],            // Box 4 節肢
    [27, 28, 29, 30, 31, 32],                // Box 6 棘皮
    [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]                // Box 7 脊索
  ];

  var score = 0;
  var wrongImages = [];

  // Check each image placement
  for (var boxIndex = 0; boxIndex < correctPlacements.length; boxIndex++) {
    var imageIndices = correctPlacements[boxIndex];

    for (var j = 0; j < imageIndices.length; j++) {
      var imageIndex = imageIndices[j] - 1;
      var image = images[imageIndex];
	  // var boxX = boxIndex * boxWidth;

	  var boxX = boxIndex > 3 ? (boxIndex - 4) * boxWidth : boxIndex * boxWidth ;
      var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

      // Calculate the allowed tolerance for placement
      var tolerance = boxWidth / 10;
	  console.log(image.x);	  
		
      // Check if the image is within the correct box area
      if (
		/*
        image.x + tolerance >= boxX &&
        image.x + image.element.width - tolerance <= boxX + boxWidth &&
        image.y + tolerance >= boxY &&
        image.y + image.element.height - tolerance <= boxY + boxHeight
		*/
        image.x + tolerance >= boxX &&
        image.x + imgWidth - tolerance <= boxX + boxWidth &&
        image.y + tolerance >= boxY &&
        image.y + imgWidth * image.element.height / image.element.width - tolerance <= boxY + boxHeight	
		
		
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
    // var targetX = getRandomInt(0, canvas.width - image.element.width);
    // var targetY = getRandomInt(canvas.height/3, canvas.height*2/3 - image.element.height);
	var targetX = getRandomInt(0, canvas.width - imgWidth);
	var targetY = getRandomInt(canvas.height/3, canvas.height*2/3 - imgWidth * image.element.height / image.element.width);


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
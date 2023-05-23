var kindomNames = ["刺絲胞", "扁形", "軟體", "環節", "節肢", "棘皮", "脊索"];
var imageData = {
"1.jpg": 1,
"2.jpg": 1,
"3.jpg": 1,
"4.jpg": 1,
"5.jpg": 2,
"6.jpg": 2,
"7.jpg": 2,
"8.jpg": 3,
"9.jpg": 3,
"10.jpg": 3,
"11.jpg": 3,
"12.jpg": 3,
"13.jpg": 4,
"14.jpg": 4,
"15.jpg": 4,
"16.jpg": 4,
"17.jpg": 5,
"18.jpg": 5,
"19.jpg": 5,
"20.jpg": 5,
"21.jpg": 5,
"22.jpg": 5,
"23.jpg": 6,
"24.jpg": 6,
"25.jpg": 6,
"26.jpg": 6,
"27.jpg": 6,
"28.jpg": 7,
"29.jpg": 7,
"30.jpg": 7,
"31.jpg": 7,
"32.jpg": 7,
"33.jpg": 7,
"34.jpg": 7,
"35.jpg": 7,
"36.jpg": 7,

}


// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var imagesLoaded = 0;
var imagesToLoad = 0;
var images = [];
var selectedImage = null;
var offsetX = 0;
var offsetY = 0;
var imgWidth = 80;
var imgHeight = 80;

var timerInterval = null;
var timerSeconds = 0;

// Calculate the number of rows and columns in the grid
var numRows = 2;
// var numCols = Math.ceil(imagesToLoad / numRows);
var numCols = 10;


/*
// Load images
for (var i = 1; i <= imagesToLoad; i++) {
  var image = new Image();
  image.addEventListener("load", imageLoaded); // Add load event listener
  image.src = "images/" + i + ".jpg";
  images.push({
    element: image,
    x: 0,
    y: 0,
    no:,

  });
}
*/

// Iterate over the image data
Object.keys(imageData).forEach((filename) => {
  var image = new Image();
  image.addEventListener("load", imageLoaded); // Add load event listener
  image.src = "images/" + filename;

  // Get the corresponding "no" value from the image data
  var no = imageData[filename];

  images.push({
    element: image,
    x: 0,
    y: 0,
    no: no,
  });
});


// Image load callback
function imageLoaded() {
  imagesLoaded++;
  if (imagesLoaded === Object.keys(imageData).length) {
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
  
  // Shuffle the images array
  shuffle(images);
  shuffle(images);
  
  /*
  images.forEach(function (image) {
    
    // image.y = getRandomInt(canvas.height/3, canvas.height*2/3 - imgWidth * image.element.height / image.element.width);
    image.x = getRandomInt(0, canvas.width - imgWidth);
    image.y = getRandomInt(canvas.height/3, canvas.height*2/3 - imgHeight);
    // image.x = imageSpace;
    // image.y = canvas.height/3 + imgHeight;
    
      // ctx.drawImage(image.element, image.x, image.y);
    ctx.drawImage(image.element, image.x, image.y, imgWidth, imgHeight);
  });
  */

  placeImages(images);


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
  
  // Start the timer
  startTimer();  
}

// Function to place image in the grid form
function placeImages(images){

  // Calculate the width and height of each grid cell
  var cellWidth = canvas.width / numCols;
  var cellHeight = (canvas.height * 2 / 3 - canvas.height / 3) / numRows;

  // Iterate over the images and draw them in a grid
  images.forEach(function (image, index) {
    // Calculate the row and column of the current image
    var row = Math.floor(index / numCols)  % numRows ;
    var col = index % numCols;

    // Calculate the position of the image within the grid cell
    image.x = col * imgWidth;
    image.y = canvas.height / 3 + row * imgHeight;

    // Draw the image
    ctx.drawImage(image.element, image.x, image.y, imgWidth, imgHeight);
  });  
}


// Function to start the timer
function startTimer() {
  timerInterval = setInterval(function () {
    timerSeconds++;
    /*
    if (timerSeconds >= 50) {
      stopTimer();
    }
    */
    updateTimerDisplay();
  }, 1000);
}

// Function to stop the timer
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// Function to update the timer display
function updateTimerDisplay() {
  var timerElement = document.getElementById("timer");
  timerElement.innerText = timerSeconds;
}



// Function to shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


// Helper function to get random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Drag and drop functions
function startDrag(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var mouseX, mouseY;

  if (event.type === "mousedown") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchstart") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }

  var highestZIndex = -1;
  var selected = null;

  // Iterate over the images in reverse order to check the top-level image first
  for (var i = images.length - 1; i >= 0; i--) {
    var image = images[i];

    if (
      mouseX > image.x &&
      mouseX < image.x + imgWidth &&
      mouseY > image.y &&
      mouseY < image.y + imgHeight
    ) {
      var zIndex = parseInt(image.element.style.zIndex || 0);

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
    selectedImage.element.style.zIndex = highestZIndex + 1;
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
    } else if (newImageX + imgWidth > canvas.width) {
      newImageX = canvas.width - imgWidth;
    }

    if (newImageY < 0) {
      newImageY = 0;
    } else if (newImageY + imgHeight > canvas.height) {
      newImageY = canvas.height - imgHeight;
    }

    selectedImage.x = newImageX;
    selectedImage.y = newImageY;

    // Bring the selected image to the top level
    var highestZIndex = -1;
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var zIndex = parseInt(image.element.style.zIndex || 0);
      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
      }
    }
    selectedImage.element.style.zIndex = highestZIndex + 1;

    redrawCanvas();
  }
}


function endDrag() {
  selectedImage = null;
}



function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sort the images based on their z-index
  var sortedImages = images.slice().sort(function(a, b) {
    var zIndexA = parseInt(a.element.style.zIndex || 0);
    var zIndexB = parseInt(b.element.style.zIndex || 0);
    return zIndexA - zIndexB;
  });

  drawAnswerBox();

  // Draw the images in the sorted order
  for (var i = 0; i < sortedImages.length; i++) {
    var image = sortedImages[i];
    ctx.drawImage(image.element, image.x, image.y, imgWidth, imgHeight);
  }
}



function drawAnswerBox(){
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


function checkPlacement2() {
  var correctPlacements = [
    [1, 2, 3, 4],                // Box 0 刺絲胞
    [5, 6, 7],                   // Box 1 扁形
    [8, 9, 10, 11, 12, 13],      // Box 2 軟體
    [14, 15, 16, 17, 18, 19],                // Box 3 環節
    [20, 21, 22, 23, 24, 25, 26],            // Box 4 節肢
    [27, 28, 29, 30, 31, 32],                // Box 5 棘皮
    [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]                // Box 7 脊索 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]
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
        image.y + imgHeight - tolerance <= boxY + boxHeight			
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

function checkPlacement() {
  var score = 0;
  var wrongImages = [];

  // Check each image placement
  for (var i = 0; i < images.length; i++) {
    var image = images[i];
    var imageNo = image.no;
    var boxIndex = imageNo - 1;

    var boxX = boxIndex > 3 ? (boxIndex - 4) * boxWidth : boxIndex * boxWidth;
    var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

    // Calculate the allowed tolerance for placement
    var tolerance = boxWidth / 10;

    // Check if the image is within the correct box area
    if (
      image.x + tolerance >= boxX &&
      image.x + imgWidth - tolerance <= boxX + boxWidth &&
      image.y + tolerance >= boxY &&
      image.y + imgHeight - tolerance <= boxY + boxHeight
    ) {
      score++;
    } else {
      if (
        image.x + tolerance >= 0 &&
        image.x + imgWidth - tolerance <= canvas.width &&
        image.y + tolerance >= canvas.height/3 &&
        image.y + imgHeight - tolerance <= canvas.height*2/3
      ){
        //pass;
      }
      else{
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
  
  // If the score reaches 50, stop the timer
  if (score === Object.keys(imageData).length) {
    stopTimer();
  }
}




function slideWrongImages(wrongImages) {
  var middleX = canvas.width / 2;
  var middleY = canvas.height / 2;

  // Animate the wrong images sliding to the middle
  for (var i = 0; i < wrongImages.length; i++) {
    var image = wrongImages[i];
    var targetX = getRandomInt(canvas.width *3/4, canvas.width  - image.element.width);
    var targetY = getRandomInt(canvas.height*2/3, canvas.height - image.element.height);
	  //var targetX = getRandomInt(0, canvas.width - imgWidth);
	  //var targetY = getRandomInt(canvas.height/3, canvas.height*2/3 - imgHeight);


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

function shake(){
  shuffle(images);
  var wrongImages = [];

  // Check each image placement
  for (var i = 0; i < images.length; i++) {
    var image = images[i];
    var imageNo = image.no;
    var boxIndex = imageNo - 1;

    var boxX = (boxIndex % 4 ) * boxWidth;
    var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

    // Calculate the allowed tolerance for placement
    var tolerance = boxWidth / 10;

    // Check if the image is within the correct box area
    if (
      image.x + tolerance >= boxX &&
      image.x + imgWidth - tolerance <= boxX + boxWidth &&
      image.y + tolerance >= boxY &&
      image.y + imgHeight - tolerance <= boxY + boxHeight
    ) {
      //pass;
    } else {
        wrongImages.push(image);
    }
  }


  // If there are wrong images, slide them to the middle and allow the user to place them again
  if (wrongImages.length > 0) {
    // slideWrongImages(wrongImages);
    placeImages(wrongImages);
  }
  redrawCanvas();

}
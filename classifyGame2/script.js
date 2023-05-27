// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
canvas.width = window.innerWidth   * 0.9;
canvas.height = window.innerHeight * 0.85;

var cardsLoaded = 0;
var cardsToLoad = 0;
var cards = [];
var selectedcard = null;
var offsetX = 0;
var offsetY = 0;
var cardWidth = 80;
var cardHeight = 80;


// 計時
var timerInterval = null;
var timerSeconds = 0;

// Calculate the number of rows and columns in the grid
var numRows = 2;
// var numCols = Math.ceil(cardsToLoad / numRows);
var numCols = 10;


/*
// Load cards
for (var i = 1; i <= cardsToLoad; i++) {
  var card = new card();
  card.addEventListener("load", cardLoaded); // Add load event listener
  card.src = "cards/" + i + ".jpg";
  cards.push({
    element: card,
    x: 0,
    y: 0,
    no:,
  });
}
*/
//
// Iterate over the card data
Object.keys(cardData).forEach((filename) => {
  var image = new Image();
  image.addEventListener("load", cardLoaded); // Add load event listener
  image.src = "images/" + filename;
  // Get the corresponding "no" value from the card data
  var no = cardData[filename];

  cards.push({
    element: image,
    x: 0,
    y: 0,
    no: no,
  });
});


// card load callback
function cardLoaded() {
  cardsLoaded++;
  if (cardsLoaded === Object.keys(cardData).length) {
    start();
  }
}


// Start function
function start() {
  // Calculate box dimensions
  var boxWidth = canvas.width / 4;
  var boxHeight = canvas.height / 3;

  // Place cards randomly
  
  // Shuffle the cards array
  shuffle(cards);
  shuffle(cards);
  
  /*
  cards.forEach(function (card) {
    
    // card.y = getRandomInt(canvas.height/3, canvas.height*2/3 - cardWidth * card.element.height / card.element.width);
    card.x = getRandomInt(0, canvas.width - cardWidth);
    card.y = getRandomInt(canvas.height/3, canvas.height*2/3 - cardHeight);
    // card.x = cardSpace;
    // card.y = canvas.height/3 + cardHeight;
    
      // ctx.drawcard(card.element, card.x, card.y);
    ctx.drawcard(card.element, card.x, card.y, cardWidth, cardHeight);
  });
  */

  placecards(cards);


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

// Function to place card in the grid form
function placecards(cards){

  // Iterate over the cards and draw them in a grid
  cards.forEach(function (card, index) {
    // Calculate the row and column of the current card
    var row = Math.floor(index / numCols)  % numRows ;
    var col = index % numCols;

    // Calculate the position of the card within the grid cell
    card.x = col * cardWidth;
    card.y = canvas.height *2/3 + row * cardHeight;

    // Draw the card
    ctx.drawImage(card.element, card.x, card.y, cardWidth, cardHeight);
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

  // Iterate over the cards in reverse order to check the top-level card first
  for (var i = cards.length - 1; i >= 0; i--) {
    var card = cards[i];

    if (
      mouseX > card.x &&
      mouseX < card.x + cardWidth &&
      mouseY > card.y &&
      mouseY < card.y + cardHeight
    ) {
      var zIndex = parseInt(card.element.style.zIndex || 0);

      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
        selected = card;
      }
    }
  }

  if (selected) {
    selectedcard = selected;
    offsetX = mouseX - selected.x;
    offsetY = mouseY - selected.y;
    selectedcard.element.style.zIndex = highestZIndex + 1;
  }
}



function drag(event) {
  event.preventDefault(); // Prevent default touch events

  if (selectedcard) {
    var rect = canvas.getBoundingClientRect();
    var mouseX, mouseY;

    if (event.type === "mousemove") {
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    } else if (event.type === "touchmove") {
      mouseX = event.touches[0].clientX - rect.left;
      mouseY = event.touches[0].clientY - rect.top;
    }

    var newcardX = mouseX - offsetX;
    var newcardY = mouseY - offsetY;

    // Adjust the position if the card exceeds the canvas boundaries
    if (newcardX < 0) {
      newcardX = 0;
    } else if (newcardX + cardWidth > canvas.width) {
      newcardX = canvas.width - cardWidth;
    }

    if (newcardY < 0) {
      newcardY = 0;
    } else if (newcardY + cardHeight > canvas.height) {
      newcardY = canvas.height - cardHeight;
    }

    selectedcard.x = newcardX;
    selectedcard.y = newcardY;

    // Bring the selected card to the top level
    var highestZIndex = -1;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var zIndex = parseInt(card.element.style.zIndex || 0);
      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
      }
    }
    selectedcard.element.style.zIndex = highestZIndex + 1;

    redrawCanvas();
  }
}


function endDrag() {
  selectedcard = null;
}



function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sort the cards based on their z-index
  var sortedcards = cards.slice().sort(function(a, b) {
    var zIndexA = parseInt(a.element.style.zIndex || 0);
    var zIndexB = parseInt(b.element.style.zIndex || 0);
    return zIndexA - zIndexB;
  });

  drawAnswerBox();

  // Draw the cards in the sorted order
  for (var i = 0; i < sortedcards.length; i++) {
    var card = sortedcards[i];
    ctx.drawImage(card.element, card.x, card.y, cardWidth, cardHeight);
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
    ctx.fillText(categoryNames[i], 0 + i*boxWidth + 10 , 30);    
  }

  for(var i = 0; i < 3; i++){
    ctx.beginPath();
    ctx.rect(0 + i * boxWidth , canvas.height *2/3 , boxWidth, boxHeight);
    ctx.stroke();
    ctx.font = "24px Arial";
    ctx.fillText(categoryNames[i+4], 0 + i*boxWidth + 10 , canvas.height *2/3 + 30);      
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
  var wrongcards = [];

  // Check each card placement
  for (var boxIndex = 0; boxIndex < correctPlacements.length; boxIndex++) {
    var cardIndices = correctPlacements[boxIndex];

    for (var j = 0; j < cardIndices.length; j++) {
      var cardIndex = cardIndices[j] - 1;
      var card = cards[cardIndex];
	  // var boxX = boxIndex * boxWidth;

	  var boxX = boxIndex > 3 ? (boxIndex - 4) * boxWidth : boxIndex * boxWidth ;
      var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

      // Calculate the allowed tolerance for placement
      var tolerance = boxWidth / 10;
	  console.log(card.x);	  
		
      // Check if the card is within the correct box area
      if (
		/*
        card.x + tolerance >= boxX &&
        card.x + card.element.width - tolerance <= boxX + boxWidth &&
        card.y + tolerance >= boxY &&
        card.y + card.element.height - tolerance <= boxY + boxHeight
		*/
        card.x + tolerance >= boxX &&
        card.x + cardWidth - tolerance <= boxX + boxWidth &&
        card.y + tolerance >= boxY &&
        card.y + cardHeight - tolerance <= boxY + boxHeight			
      ) {
        score++;
      } else {
        wrongcards.push(card);
      }
    }
  }

  // Show the score above the canvas
  var scoreElement = document.getElementById("score");
  scoreElement.innerText = "Score: " + score;

  // If there are wrong cards, slide them to the middle and allow the user to place them again
  if (wrongcards.length > 0) {
    slideWrongcards(wrongcards);
  }
}

function checkPlacement() {
  var score = 0;
  var wrongcards = [];

  // Check each card placement
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardNo = card.no;
    var boxIndex = cardNo - 1;

    var boxX = boxIndex > 3 ? (boxIndex - 4) * boxWidth : boxIndex * boxWidth;
    var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

    // Calculate the allowed tolerance for placement
    var tolerance = boxWidth / 10;

    // Check if the card is within the correct box area
    if (
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + boxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + boxHeight
    ) {
      score++;
    } else {
      if (
        card.x + tolerance >= 0 &&
        card.x + cardWidth - tolerance <= canvas.width &&
        card.y + tolerance >= canvas.height/3 &&
        card.y + cardHeight - tolerance <= canvas.height*2/3
      ){
        //pass;
      }
      else{
        wrongcards.push(card);
      }
    }
  }

  // Show the score above the canvas
  var scoreElement = document.getElementById("scores");
  scoreElement.innerText = "Score: " + score;

  // If there are wrong cards, slide them to the middle and allow the user to place them again
  if (wrongcards.length > 0) {
    slideWrongcards(wrongcards);
  }
  
  // If the score reaches 50, stop the timer
  if (score === Object.keys(cardData).length) {
    stopTimer();
  }
}




function slideWrongcards(wrongcards) {
  var middleX = canvas.width / 2;
  var middleY = canvas.height / 2;

  // Animate the wrong cards sliding to the middle
  for (var i = 0; i < wrongcards.length; i++) {
    var card = wrongcards[i];
    var targetX = getRandomInt(canvas.width *3/4, canvas.width  - card.element.width);
    var targetY = getRandomInt(canvas.height*2/3, canvas.height - card.element.height);
	  //var targetX = getRandomInt(0, canvas.width - cardWidth);
	  //var targetY = getRandomInt(canvas.height/3, canvas.height*2/3 - cardHeight);


    // Use requestAnimationFrame for smoother animation
    animateSlide(card, targetX, targetY);

	
  }
}

function animateSlide(card, targetX, targetY) {
  var startX = card.x;
  var startY = card.y;
  var animationDuration = 500; // milliseconds
  var startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = timestamp - startTime;

    // Calculate the new position using easing function (e.g., easeOutQuad)
    var newX = easeOutQuad(progress, startX, targetX - startX, animationDuration);
    var newY = easeOutQuad(progress, startY, targetY - startY, animationDuration);

    card.x = newX;
    card.y = newY;
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
  shuffle(cards);
  var wrongcards = [];

  // Check each card placement
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardNo = card.no;
    var boxIndex = cardNo - 1;

    var boxX = (boxIndex % 4 ) * boxWidth;
    var boxY = boxIndex > 3 ? canvas.height * 2 / 3 : 0;

    // Calculate the allowed tolerance for placement
    var tolerance = boxWidth / 10;

    // Check if the card is within the correct box area
    if (
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + boxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + boxHeight
    ) {
      //pass;
    } else {
        wrongcards.push(card);
    }
  }


  // If there are wrong cards, slide them to the middle and allow the user to place them again
  if (wrongcards.length > 0) {
    // slideWrongcards(wrongcards);
    placecards(wrongcards);
  }
  redrawCanvas();

}
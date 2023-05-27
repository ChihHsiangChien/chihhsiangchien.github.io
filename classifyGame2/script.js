// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
canvas.width = window.innerWidth   * 0.95;
canvas.height = window.innerHeight * 0.85;

//答案框
var boxRowsNum = categoryNames.length;
var boxColsNum = categoryNames[0].length;  // 用第一列的數量
var boxWidth = canvas.width / boxColsNum;
var boxHeight = canvas.height * 1/3 / boxRowsNum; // 

// 卡片大小、欄數、列數、高度
var cardWidth = 180;
var cardHeight = 180;
var numRows = 2;
var numCols = 6;
var cardsX = 10; //卡片群的最左側
var cardsY = 20 + boxHeight*boxRowsNum; // 待答卡片的最高高度，需要與boxHeight 配
var cardOffsetX = 2;
var cardOffsetY = 2;

var cardsLoaded = 0;
var cardsToLoad = 0;
var cards = [];
var selectedcard = null;
var offsetX = 0;
var offsetY = 0;


// 計時
var timerInterval = null;
var timerSeconds = 0;

readCardData();

// 放置卡片
function readCardData(){
  Object.keys(cardData).forEach((filename) => {
    var image = new Image();
    image.addEventListener("load", cardLoaded); // Add load event listener
    image.src = "images/" + filename;
    var no = cardData[filename];
    cards.push({
      element: image,
      x: 0,
      y: 0,
      no: no,
    });
  });
}

// card load callback
function cardLoaded() {
  cardsLoaded++;
  if (cardsLoaded === Object.keys(cardData).length) {
    start();
  }
}


// Start function
function start() {
 
  // Shuffle the cards array
  shuffle(cards);
  shuffle(cards);
  

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
    card.x = cardsX + col * (cardWidth + cardOffsetX);
    card.y = cardsY + row * (cardHeight + cardOffsetY);

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
  for(var i = 0; i < boxRowsNum; i++){
    for(var j = 0; j < categoryNames[i].length; j++){
      ctx.beginPath();
      ctx.rect(j * boxWidth , i * boxHeight, boxWidth, boxHeight);
      ctx.stroke();
      
      ctx.font = "24px Arial";
      ctx.fillText(categoryNames[i][j], 10 + j*boxWidth , 30 + i*boxHeight); 
    }
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

    var boxX = (boxIndex % boxColsNum) * boxWidth;
    var boxY = parseInt(boxIndex / boxColsNum) * boxHeight;

    // Calculate the allowed tolerance for placement
    var tolerance = boxWidth / 10;

    // Check if the card is within the correct box area
    if (

        // 在正確答案的框框裡
        card.x + tolerance >= boxX &&
        card.x + cardWidth - tolerance <= boxX + boxWidth &&
        card.y + tolerance >= boxY &&
        card.y + cardHeight - tolerance <= boxY + boxHeight
    ) {
      score++;
    } else {
      if (
        // 在待答區
        card.x + tolerance >= cardsX &&
        card.x + cardWidth - tolerance <= canvas.width &&
        card.y + tolerance >= cardsY &&
        card.y + cardHeight - tolerance <= canvas.height
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
  
  // If the score reaches , stop the timer
  if (score === Object.keys(cardData).length) {
    stopTimer();
  }
}




function slideWrongcards(wrongcards) {
  // Animate the wrong cards sliding to the middle
  for (var i = 0; i < wrongcards.length; i++) {
    var card = wrongcards[i];

    // 答錯的卡片滑到最後一個位置
    // var targetX = getRandomInt(canvas.width *0.8, canvas.width  - card.element.width);
    //var targetY = getRandomInt(canvas.height*0.8, canvas.height - card.element.height);
    var targetX = cardsX + (numCols-1) * (cardWidth + cardOffsetX);
    var targetY = cardsY + (numRows-1) * (cardHeight + cardOffsetY);

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

    var boxX = (boxIndex % boxColsNum) * boxWidth;
    var boxY = parseInt(boxIndex / boxColsNum) * boxHeight;    

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
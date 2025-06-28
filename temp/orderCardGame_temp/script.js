// Golbal variables
// Resize canvas to fit window
var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth   * 0.95;
canvas.height = window.innerHeight * 0.80;
var ctx = canvas.getContext("2d");

//
var cardData;     //從另一個js檔案讀入cardData
var cards = [];
var selectedCards = [];




// 牌卡之間的間隔
var hSpace = 10;
var vSpace = 10;

// 牌卡的字型比例
var fontRatio = 0.25;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置

// 牌卡底色
normalColor = "#345E4F";
clickedColor = "red";

// 牌卡字色
fontColor = "white";

// 計時
var timerSeconds = 0;

// 計分
var scoresElement = document.getElementById("scores");
var scores = 0;
var correctScores = 100;   //答對加分
var wrongScores   = 50;    //答錯扣分

// audio
var correctSound = new Audio('correct.mp3');
var wrongSound   = new Audio('wrong.mp3');


// 執行順序：先讀取卡片、初始化設定
readCardData();


var numCards, numCols, numRows;
var cardWidth, cardHeight;
setup();


start();

function readCardData() {
  // Define the circular linked list
  var head = null;
  var tail = null;
  var count = 0; // Initialize a count variable

  // Helper function to create a new node
  function createNode(cardIdx) {
    return {
      name: cardData[cardIdx],
      //category: cardData[cardName],
      faceUp: false, // Add a new property to track the card's face-up state
      x: 0,
      y: 0,
      next: null,
    };
  }

  // Helper function to append a node to the circular linked list
  function appendNode(node) {
    if (!head) {
      head = node;
      tail = node;
      node.next = node; // Make the node circular by pointing to itself
    } else {
      tail.next = node;
      node.next = head;
      tail = node;
    }
    count++; // Increment the count variable
  }

  // Read and create the circular linked list
  Object.keys(cardData).forEach((cardIdx) => {
    var card = createNode(cardIdx);
    appendNode(card);
  });

  // Assign the circular linked list to the 'cards' variable
  cards = head;

  // Calculate the number of cards (numCards)
  numCards = count;
}







function setup(){
    // 用numCards根號計算每欄列擺幾張牌
    numCols = parseInt(Math.sqrt(numCards));
    numRows = Math.ceil(numCards/numCols);

    cardWidth  = (canvas.width  - (numCols+1) * hSpace) / numCols;
    cardHeight = (canvas.height - (numRows+1) * vSpace) / numRows;
}


// 發牌依照numCols 和 numRows給予cards座標
function setCardsPos() {
  var currentNode = cards;
  var index = 0;

  if (currentNode) {
    do {
      // Calculate the row and column of the current image
      var row = Math.floor(index / numCols);
      var col = index % numCols;

      // Calculate the position of the image within the grid cell
      currentNode.x = col * cardWidth + hSpace * (col + 1);
      currentNode.y = row * cardHeight + vSpace * (row + 1);

      currentNode = currentNode.next;
      index++;
    } while (currentNode !== cards);
  }
}



// Start function
async function start() {
  try {
    // Shuffle the cards array
    await shuffle();
    console.log(cards);

    // Call the drawCards function to draw the cards on the canvas
    setCardsPos();
    drawCards();

    canvas.addEventListener("mousedown", click);
    // canvas.addEventListener("mousemove", drag);
    // canvas.addEventListener("mouseup", endClick);
    // canvas.addEventListener("mouseleave", endClick);

    // Touch event listeners
    canvas.addEventListener("touchstart", click);
    // canvas.addEventListener("touchmove", drag);
    // canvas.addEventListener("touchend", click);

    startTimer();
  } catch (error) {
    console.error("Error occurred during shuffle:", error);
  }
}



// Drawing function
function drawCards() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Initialize the current node with the head of the circular linked list
  var currentNode = cards;

  if (currentNode) {
    var index = 0;

    do {
      // Check if the card is in the selectedCards array
      var isSelected = selectedCards.includes(currentNode);

      // Set the color based on whether the card is selected or not
      if (isSelected) {
        ctx.fillStyle = clickedColor; // 被點擊的顏色
      } else {
        ctx.fillStyle = normalColor; // 平常的顏色
      }

      ctx.fillRect(
        currentNode.x,
        currentNode.y,
        cardWidth,
        cardHeight
      );

      // Draw the text inside the box
      ctx.fillStyle = fontColor;

      var fontSize = fontRatio * cardWidth;
      ctx.font = fontSize + "px Arial";

      ctx.fillText(
        currentNode.name,
        currentNode.x + cardWidth * 0.10,
        currentNode.y + cardHeight * fontRatio * fontHeightRatio
      );

      currentNode = currentNode.next;
      index++;
    } while (currentNode !== cards);
  }
}




//====================時間函數設定======================
// Function to start the timer
function startTimer() {
  timerInterval = setInterval(function () {
    timerSeconds++;
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
//====================時間函數設定結束===================



// Function to shuffle an array
async function shuffle() {
  // Create an array to hold the positions of each card
  var positions = [];

  // Create an array of promises to update positions asynchronously
  var updatePromises = [];

  // Iterate over the circular linked list and store the promises
  var currentNode = cards;
  if (currentNode) {
    do {
      updatePromises.push(updatePositionAsync(currentNode)); // Assuming an asynchronous operation to update position
      currentNode = currentNode.next;
    } while (currentNode !== cards);
  }

  // Wait for all promises to resolve
  await Promise.all(updatePromises);

  // Store the positions once all promises are resolved
  currentNode = cards;
  if (currentNode) {
    do {
      // Check if the position is valid before pushing it into the array
      if (currentNode.x !== undefined && currentNode.y !== undefined) {
        positions.push({ x: currentNode.x, y: currentNode.y });
      }
      currentNode = currentNode.next;
    } while (currentNode !== cards);
  }

  // Shuffle the positions array
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Update the positions of each card in the circular linked list
  currentNode = cards;
  var index = 0;
  if (currentNode) {
    do {
      currentNode.x = positions[index].x;
      currentNode.y = positions[index].y;
      currentNode = currentNode.next;
      index++;
    } while (currentNode !== cards);
  }
}



// Example asynchronous function to update position
function updatePositionAsync(card) {
  return new Promise((resolve, reject) => {
    // Perform asynchronous operation to update the position of the card
    // Once the operation is completed, resolve the promise
    // You can modify this function to match your specific asynchronous update logic
    // For demonstration purposes, let's assume we're using a setTimeout here
    setTimeout(() => {
      // Assuming the updated position is stored in card.x and card.y properties
      resolve();
    }, 1000); // Delay of 1 second for demonstration
  });
}


// Helper function to get random integer
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}




// 點卡片的動作
function click(event) {
    event.preventDefault(); // Prevent default touch events
    var rect = canvas.getBoundingClientRect();
    var mouseX, mouseY;
    
    
    var { mouseX, mouseY } = getMouseCoordinates(event, rect);
    var selected = checkClickedCard(mouseX, mouseY);  // 找出點到的卡片
    addToSelectedCards(selected, selectedCards);      // 把點到的卡片放進 selectedCards
    handleMatchingCards();                            // 檢查是否同一個分類
    drawCards();
    if (cards.length == 0){
      stopTimer();
    }
}

function endClick() {
  selectedCard = null;
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

// 檢查點擊位置是否在卡片上
function checkClickedCard(mouseX, mouseY) {
    var selected = null;

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        if (
            mouseX > card.x &&
            mouseX < card.x + cardWidth &&
            mouseY > card.y &&
            mouseY < card.y + cardHeight
        ) {
            selected = card;
            break;
        }
    }
    return selected;
}


// 將點擊到的卡片添加到已選擇的卡片陣列
function addToSelectedCards(selected, selectedCards) {
    if (selected && selectedCards.length < 2 && !selectedCards.includes(selected)) {
        selectedCards.push(selected);
    }
}

// 處理兩張已選擇的卡片是否匹配
function handleMatchingCards() {
    if (selectedCards.length === 2) {
        var card1 = selectedCards[0];
        var card2 = selectedCards[1];

        if (card1.category === card2.category) {
            correctSound.play();
            
            scores += correctScores
            scoresElement.innerText = "scores: " + scores;

            setTimeout(function () {
                
                // Matched: Remove the cards from the array
                var index1 = cards.indexOf(card1);
                cards.splice(index1, 1);
                var index2 = cards.indexOf(card2);
                cards.splice(index2, 1);
                // Reset the selected cards array
                selectedCards = [];

                // Redraw the cards
                drawCards();
            }, 200);
            
        } else {
            // Not matched: Face down the cards
            wrongSound.play();
            scores -= wrongScores;
            scoresElement.innerText = "scores: " + scores;
            setTimeout(function () {
                selectedCards = [];
                drawCards();
            }, 200);
      } 
    } 
}

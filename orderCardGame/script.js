// Golbal variables
// Resize canvas to fit window
var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth   * 0.95;
canvas.height = window.innerHeight * 0.80;
var ctx = canvas.getContext("2d");

//
var cardData;     // 從另一個js檔案讀入cardData
var cards = [];
var selectedCards = [];
var preCardIdx;
var nowCardIdx;       // 現在選擇的cardIdx

// 牌卡之間的間隔
var hSpace = 10;
var vSpace = 10;

// 牌卡的字型比例
var fontRatio = 0.25;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置
var maxLength = 3;         // 最大允許的字元長度

// 牌卡底色
normalColor = "#345E4F";
clickedColor = "#7b968d";

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

var numCards = cards.length;
var numCols  = parseInt(Math.sqrt(numCards));
var numRows  = Math.ceil(numCards/numCols);

var cardWidth  = (canvas.width  - (numCols+1) * hSpace) / numCols;
var cardHeight = (canvas.height - (numRows+1) * vSpace) / numRows;

start();


function readCardData(){
	// 讀入CardData
	Object.keys(cardData).forEach((cardIdx) => {
		var card = {
			name: cardData[cardIdx],
			// category: cardData[cardName],
			faceUp: false, // Add a new property to track the card's face-up state
			x: 0,
			y: 0,
		};
		cards.push(card);
	});
}



function setup(){
    // 用numCards根號計算每欄列擺幾張牌

}


// 發牌依照numCols 和 numRows給予cards座標
function setCardsPos(){
    cards.forEach(function (card, index) {
        // Calculate the row and column of the current image
        var row = Math.floor(index / numCols) ;
        var col = index % numCols;        
        // Calculate the position of the image within the grid cell
        card.x = col * cardWidth  +  hSpace * (col + 1);
        card.y = row * cardHeight +  vSpace * (row + 1);
    });
}


// Start function
function start() {
	// Shuffle the cards array
	// Call the drawCards function to draw the cards on the canvas
    setCardsPos();
    shufflePos();
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
}


// Drawing function
function drawCards() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Iterate over the card data and draw the text in a box  
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];        

        // Check if the card is in the selectedCards array
        var isSelected = selectedCards.includes(card);
        
        // Set the color based on whether the card is selected or not
        if (isSelected) {
            ctx.fillStyle = clickedColor; // 被點擊的顏色
        } else {
            ctx.fillStyle = normalColor;  // 平常的顏色
        }
        
        ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
        // Draw the text inside the box
        ctx.fillStyle = fontColor;
        var fontSize = fontRatio * cardWidth;

        if (card.name.length > maxLength) {
            var ratio = maxLength / card.name.length; // 計算縮小比例
            fontSize *= ratio; // 乘上比例以縮小字體大小
        }

        ctx.font = fontSize + "px Arial";
        // ctx.font = "30px Arial";
        ctx.fillText(card.name,   card.x + cardWidth*0.10, card.y + cardHeight * fontRatio * fontHeightRatio);
            
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
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function shufflePos(){
    // 取得位置Array
    var positions = [];
    for(var i = 0; i < cards.length; i++){
        positions.push({x: cards[i].x, y: cards[i].y});
    }
    
    shuffle(positions);

    for(var i = 0; i < cards.length; i++){
        cards[i].x = positions[i].x;
        cards[i].y = positions[i].y;
    }    

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
    preCardIdx = nowCardIdx;
    nowCardIdx = getCardIdx(selected) % numCards;
    handleOrderingCards();                            // 檢查順序
    drawCards();
    if (cards.length == 0){
      stopTimer();
    }
}

function endClick() {
  selected = null;
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

// 找到現在點選的卡片是在cards的位置
function getCardIdx(card){
    for (var i = 0; i < cards.length; i++) {
        if(card == cards[i]){
            return i;
        }
    }
}

// 將點擊到的卡片添加到已選擇的卡片陣列
function addToSelectedCards(selected, selectedCards) {
    if (selected && !selectedCards.includes(selected)) {
        selectedCards.push(selected);
    }
}

//檢查新加入的selectedCards是否按照順序
function handleOrderingCards(){
    if (preCardIdx== null || nowCardIdx == (preCardIdx + 1) % numCards){
        correctSound.play();
        scores += correctScores
        scoresElement.innerText = "scores: " + scores;
    } else{
        wrongSound.play();
        scores -= wrongScores;
        scoresElement.innerText = "scores: " + scores;       
        setTimeout(function () {
            selectedCards.pop();
            nowCardIdx = preCardIdx;
            drawCards();
        }, 200);
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

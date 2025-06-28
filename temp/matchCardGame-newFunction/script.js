/**
 * 由外部的 .js 載入設檔值, 並執行 callback 的指令
 * @param {string}  要載入的 .js
 * @param {function} 載入完畢要執行的 function
 */
var loadSettingFromExternalScript = function(scriptSrc, callback)  {
  var nocacheVal = '?nocache=' + new Date().getTime();  //為了避免 cache 的問題,在檔名後加亂數
  var scriptToAdd = document.createElement('script');   //建立一個 scriptElement
  
  scriptToAdd.setAttribute('type','text/javascript');
  scriptToAdd.setAttribute('charset','utf-8');
  scriptToAdd.setAttribute('src', scriptSrc + nocacheVal);  //避免 cache 時用的
  //載入成功時
  scriptToAdd.onload = scriptToAdd.onreadystatechange = function() {
    if (!scriptToAdd.readyState || scriptToAdd.readyState === "loaded" || scriptToAdd.readyState === "complete") {
      scriptToAdd.onload = scriptToAdd.onreadystatechange = null;
      document.getElementsByTagName('head')[0].removeChild(scriptToAdd);  //將變數載入後移除 script
      if(typeof(callback)=='function') {
        callback();  //執行指定的函數
      }
    };
  };
  //無法載入時, 將設定用預設值
  scriptToAdd.onerror = function() {
    scriptToAdd.onerror = null;  //將事件移除
    document.getElementsByTagName('head')[0].removeChild(scriptToAdd);  //移除 script
    if( typeof callback == 'function' ) {
      callback();  //執行指定的函數
    }
  }  
  //在 head 的最前頭加上前述的 scriptElement
  var docHead = document.getElementsByTagName("head")[0];
  docHead.insertBefore(scriptToAdd, docHead.firstChild);
};


function readCardData(){
	// 讀入CardData
	Object.keys(cardData).forEach((cardName) => {
		var card = {
			name: cardName,
			category: cardData[cardName],
			faceUp: false, // Add a new property to track the card's face-up state
			x: 0,
			y: 0,
		};
		cards.push(card);
	});

  setup();  
  start();
}



function setup(){
    // 用numCards根號計算每欄列擺幾張牌
    numCards = cards.length;
    numCols = parseInt(Math.sqrt(numCards));
    numRows = Math.ceil(numCards/numCols);

    cardWidth  = (canvas.width  - (numCols+1) * hSpace) / numCols;
    cardHeight = (canvas.height - (numRows+1) * vSpace) / numRows;
    // 执行回调函数
    //if (typeof callback === 'function') {
    //  callback();
    //}
}


// 發牌依照numCols 和 numRows給予cards座標
function setCardsPos(){
    cards.forEach(function (card, index) {
        // Calculate the row and column of the current image
        var row = Math.floor(index / numCols) ;
        var col = index % numCols;
        
        // Calculate the position of the image within the grid cell
        card.x = col * cardWidth  +  hSpace* (col + 1);
        card.y = row * cardHeight + vSpace * (row + 1);
    });
}


// Start function
function start() {
	// Shuffle the cards array
    shuffle(cards);

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
}


// Drawing function
function drawCards() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Iterate over the card data and draw the text in a box  
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var index = i;

        // Check if the card is in the selectedCards array
        var isSelected = selectedCards.includes(card);
        
        // Set the color based on whether the card is selected or not
        if (isSelected) {
            ctx.fillStyle = "red"; // 被點擊的變紅色
        } else {
            ctx.fillStyle = "green";
        }
        
        ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
        // Draw the text inside the box
        ctx.fillStyle = "white";

        var fontSize = fontRatio * cardWidth;
        ctx.font = fontSize + "px Arial";
        // ctx.font = "30px Arial";
        ctx.fillText(card.name,   card.x + cardWidth*0.10, card.y + cardHeight *0.80);
            
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
            }, 300);
            
        } else {
            // Not matched: Face down the cards
            wrongSound.play();
            scores -= wrongScores;
            scoresElement.innerText = "scores: " + scores;
            setTimeout(function () {
                selectedCards = [];
                drawCards();
            }, 700);
      } 
    } 
}

// Golbal variables
// Resize canvas to fit window
var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth * 0.95;
canvas.height = window.innerHeight* 0.80;
var ctx = canvas.getContext("2d");


//
var cardData;     //從外部讀入cardData.js
var cards = [];
var selectedCards = [];


var numCards, numCols, numRows;
var cardWidth, cardHeight;

// 牌卡之間的間隔
var hSpace = 10;
var vSpace = 10;

// 讀cardData.js之後，用readCardData讀入cards、計算牌卡位置並放牌
loadSettingFromExternalScript('cardData.json', readCardData);


var fontRatio = 0.25;   // 牌卡字的尺寸fontSize = fontRatio*cardWidth

// 計時
var timerSeconds = 0;

// 計分
var scoresElement = document.getElementById("scores");
var scores = 0;
var correctScores = 100; //答對加100
var wrongScores = 50;    //答錯扣50

// audio
var correctSound = new Audio('correct.mp3');
var wrongSound = new Audio('wrong.mp3');


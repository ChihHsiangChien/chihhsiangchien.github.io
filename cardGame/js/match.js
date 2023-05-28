var cardsLoaded = 0;
var totalCardsWithImages = 0;
var allCardsHaveNoImages = true;

var cards = [];
var selectedCards = []; // 點擊型卡片遊戲
var selectedcard = null;
var offsetX = 0;        // 滑鼠點擊位置和卡片位置差距
var offsetY = 0;


// 計時
var timerInterval = null;
var timerSeconds = 0;

// 計分
var scoreElement = document.getElementById("score");
var score = 0;
var correctScore = 100;   //答對加分
var wrongScore   = 50;    //答錯扣分

// audio
var correctSound = new Audio('sound/correct.mp3');
var wrongSound   = new Audio('sound/wrong.mp3');

// 執行順序：先讀取卡片、初始化設定
readCardData();

// Start function
function start() {
    // 用numCards根號計算每欄列擺幾張牌
    numCols= parseInt(Math.sqrt(cards.length));
    numRows= Math.ceil(cards.length/numCols);
    cardWidth = (canvas.width  - (numCols+1) * hSpace) / numCols;
    cardHeight= (canvas.height - (numRows+1) * vSpace) / numRows;

    shuffle(cards);	
    setCardsPos(cards);
    drawCards(cards);    
    canvas.addEventListener("mousedown", clickIfMatch);    
    canvas.addEventListener("touchstart", clickIfMatch);
    startTimer();  
}






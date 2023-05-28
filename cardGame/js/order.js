var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth   * 0.95;
canvas.height = window.innerHeight * 0.80;
var ctx = canvas.getContext("2d");


// 卡片大小、欄數、列數、高度
var numRows;
var numCols;
var cardWidth;
var cardHeight;
var cardsX = 10;        // 卡片群位置的最左側位置
var cardsY = 20;
var cardsArrangementType = "grid";  // 使用"row"表示卡片重疊排列成一個row，或使用"grid"表示不重疊排列成為grid。

var correctCategory = "正確";

var cardFillColor = "#345E4F";
var cardClickedFillColor = "red";
var cardFontColor = "white";
var cardBorderColor = "white";
var cardBorderWidth = 2;


// 牌卡之間的間隔
var hSpace = 10;
var vSpace = 10;

// 牌卡的字型比例
var fontRatio = 0.25;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置
var maxLength = 3;         // 最大允許的字元長度


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

////////////////////////////////
var cardsLoaded = 0;
var totalCardsWithImages = 0;
var allCardsHaveNoImages = true;

var cards = [];
var selectedCards = []; // 點擊型卡片遊戲
var selectedcard = null;
var offsetX = 0;        // 滑鼠點擊位置和卡片位置差距
var offsetY = 0;

var preCardIdx;
var nowCardIdx;       // 現在選擇的cardIdx

// 執行順序：先讀取卡片、初始化設定
readCardData();

// Start function
function start() {
    // 根號計算每欄列擺幾張牌
    numCols= parseInt(Math.sqrt(cards.length));
    numRows= Math.ceil(cards.length/numCols);
    cardWidth = (canvas.width  - (numCols+1) * hSpace) / numCols;
    cardHeight= (canvas.height - (numRows+1) * vSpace) / numRows;
    
    setCardsPos(cards);
    shufflePos(cards);
    drawCards(cards);

    canvas.addEventListener("mousedown", clickIfOrder);
    canvas.addEventListener("touchstart", clickIfOrder);
    startTimer();  
}



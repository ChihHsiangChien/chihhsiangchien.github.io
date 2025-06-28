var cardsLoaded = 0;
var totalCardsWithImages = 0;
var allCardsHaveNoImages = true;

var cards = [];
var selectedCards = []; // 點擊型卡片遊戲
var selectedcard = null;
var offsetX = 0; // 滑鼠點擊位置和卡片位置差距
var offsetY = 0;

// 計時
var timerInterval = null;
var timerSeconds = 0;

// 計分
var scoreElement = document.getElementById("score");
var score = 0;
var correctScore = 100; //答對加分
var wrongScore = 50; //答錯扣分

// audio
var correctSound = new Audio("sound/correct.mp3");
var wrongSound = new Audio("sound/wrong.mp3");

// 執行順序：先讀取卡片、初始化設定
readCardData();

// Start function
function start() {
  shuffle(cards);
  setCardsPos(cards);
  drawCards(cards);
  enableDragging();
  enableTouchEvents();
  drawAnswerBox();
  startTimer();
}

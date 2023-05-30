var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.75;
var ctx = canvas.getContext("2d");

//答案框
var answerBoxNumRows = categoryNames.length;
var answerBoxNumCols = categoryNames[0].length; // 用第一列的數量
var answerBoxWidth = canvas.width / answerBoxNumCols;
var answerBoxHeight = (canvas.height * 0.65) / answerBoxNumRows;
var answerBoxFillColor = "lightblue"; //答案框的填色
var answerBoxBorderColor = "grey"; //答案框的框色
var answerBoxBorderWidth = 2; //答案框的框線寬度
var answerBoxTextColor = "black"; //答案框的文字顏色

// 卡片大小、欄數、列數、高度
var cardWidth = 150;
var cardHeight = 150;
var numRows = 1;
var numCols = 6;
var cardsX = 10; // 卡片群位置的最左側
var cardsY = 20 + answerBoxHeight * answerBoxNumRows; // 待答卡片的最高高度，需要與answerBoxHeight 配
var cardsArrangementType = "row"; // 使用"row"表示卡片重疊排列成一個row，或使用"grid"表示不重疊排列成為grid。

var cardFillColor = "#345E4F";
var cardClickedFillColor = "red";
var cardBorderColor = "white";
var cardFontColor = "white";
var cardBorderWidth = 5;

// 牌卡之間的間隔
var hSpace = 2; // 卡片的x間隔
var vSpace = 2; // 卡片的y間隔

// 牌卡的字型比例
var fontRatio = 0.25; // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3; // 控制字在牌卡的高度位置
var maxLength = 3; // 最大允許的字元長度

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
var correctSound = new Audio("../sound/correct.mp3");
var wrongSound = new Audio("../sound/wrong.mp3");

// 按順序點卡片
var preCardIdx;
var nowCardIdx; // 現在選擇的cardIdx
var correctCategory = "正確";

// gameType
var gameType;

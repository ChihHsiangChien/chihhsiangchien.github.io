var canvas = document.getElementById("canvas");
canvas.width = Math.min(window.innerWidth * 0.92, 1200);
canvas.height = Math.max(window.innerHeight * 0.72, 500);
var ctx = canvas.getContext("2d");

// 答案框 (分類模式) - 酷炫科技風 HUD
var answerBoxNumRows = typeof categoryNames !== 'undefined' ? categoryNames.length : 1;
var answerBoxNumCols = typeof categoryNames !== 'undefined' && categoryNames[0] ? categoryNames[0].length : 1;
var answerBoxWidth = canvas.width / (answerBoxNumCols || 1);
var answerBoxHeight = (canvas.height * 0.65) / (answerBoxNumRows || 1);
var answerBoxFillColor = "rgba(15, 25, 45, 0.75)";
var answerBoxBorderColor = "rgba(0, 242, 254, 0.5)";
var answerBoxBorderWidth = 2;
var answerBoxTextColor = "#00f2fe";

// 卡片大小與排列預設
var cardWidth = 150;
var cardHeight = 150;
var numRows = 1;
var numCols = 6;
var cardsX = 10;
var cardsY = 20 + answerBoxHeight * answerBoxNumRows;
var cardsArrangementType = "row";

// 科技風配色
var cardFillColor = "#0f1c30";            // 正面科技藍黑
var cardClickedFillColor = "#ff2a6d";     // 點選/啟動時霓虹粉紅
var cardBorderColor = "#00f2fe";          // 霓虹青藍邊框
var cardFontColor = "#ffffff";
var cardBorderWidth = 2.5;
var cardBackFillColor = "#080d18";        // 背面暗黑晶片

// 牌卡間隔
var hSpace = 8;
var vSpace = 8;

// 字型比例
var fontRatio = 0.22;
var fontHeightRatio = 3;
var maxLength = 4;

var cardsLoaded = 0;
var totalCardsWithImages = 0;
var allCardsHaveNoImages = true;

var cards = [];
var selectedCards = [];
var selectedcard = null;
var offsetX = 0;
var offsetY = 0;

// 動態與特效系統
var particles = [];
var floatingTexts = [];
var hoveredCard = null;
var isGameWon = false;
var winAnimationTimer = 0;
var animationFrameId = null;

// 計時與計分
var timerInterval = null;
var timerSeconds = 0;
var scoreElement = document.getElementById("score");
var score = 0;
var correctScore = 100;
var wrongScore = 50;

// 音效 (容錯防崩潰)
var correctSound = new Audio("../sound/correct.mp3");
var wrongSound = new Audio("../sound/wrong.mp3");

// 按順序點卡片
var preCardIdx;
var nowCardIdx;
var correctCategory = "正確";

// 記憶模式以外，所有卡片預設面朝上
var cardsFacing = true;

// 遊戲類型
var gameType = "match";
var isProcessingClick = false;

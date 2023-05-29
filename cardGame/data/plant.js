var categoryNames = [];
var cardData = [
{"name":"地錢","category":"蘚苔"},
{"name":"土馬騌","category":"蘚苔"},
{"name":"水苔","category":"蘚苔"},
{"name":"地錢","category":"蘚苔"},
{"name":"鐵線蕨","category":"蕨類"},
{"name":"鳥巢蕨","category":"蕨類"},
{"name":"臺灣水韭","category":"蕨類"},
{"name":"腎蕨","category":"蕨類"},
{"name":"矮松","category":"裸子植物"},
{"name":"臺灣二葉松","category":"裸子植物"},
{"name":"歐洲赤松","category":"裸子植物"},
{"name":"剛葉松","category":"裸子植物"},
{"name":"銀杏","category":"裸子植物"},
{"name":"蘇鐵","category":"裸子植物"},
{"name":"紅檜","category":"裸子植物"},
{"name":"松樹","category":"裸子植物"},
{"name":"花生","category":"被子植物"},
{"name":"綠豆","category":"被子植物"},
{"name":"向日葵","category":"被子植物"},
{"name":"菩提","category":"被子植物"},
{"name":"油菜","category":"被子植物"},
{"name":"油桐","category":"被子植物"},
{"name":"櫻花","category":"被子植物"},
{"name":"臺灣百合","category":"被子植物"},
{"name":"竹子","category":"被子植物"},
{"name":"玉米","category":"被子植物"},
{"name":"蔥","category":"被子植物"},
{"name":"紫錦草","category":"被子植物"},
{"name":"稻","category":"被子植物"},
{"name":"蘭花","category":"被子植物"},
{"name":"橘子","category":"被子植物"},
{"name":"榕樹","category":"被子植物"}, 
];

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

var cardFillColor = "#345E4F";
var cardClickedFillColor = "red";
var cardFontColor = "white";
var cardBorderColor = "white";
var cardBorderWidth = 2;


// 牌卡之間的間隔
var hSpace = 10;
var vSpace = 10;

// 牌卡的字型比例
var fontRatio = 0.22;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置
var maxLength = 3;         // 最大允許的字元長度


// 計時
var timerInterval = null;
var timerSeconds = 0;

// 計分
var scoresElement = document.getElementById("scores");
var scores = 0;
var correctScores = 100;   //答對加分
var wrongScores   = 50;    //答錯扣分
var categoryNames = [  
];

var cardData = [
  {"name":"DNA","category":"正確"},
  {"name":"細胞核","category":"正確"},
  {"name":"細胞","category":"正確"},
  {"name":"組織","category":"正確"},
  {"name":"器官","category":"正確"},
  {"name":"器官系統","category":"正確"},
  {"name":"個體","category":"正確"},
  {"name":"族群","category":"正確"},
  {"name":"群集","category":"正確"},
  {"name":"生態系","category":"正確"},
  {"name":"生物圈","category":"正確"},
  {"name":"地球","category":"正確"},
     
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

var correctCategory = "正確";

var cardFillColor = "#3a4e61";
var cardClickedFillColor = "#7b968d";
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
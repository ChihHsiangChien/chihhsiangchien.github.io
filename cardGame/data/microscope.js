// 可使用多列答案框
var categoryNames = [
  ["解剖顯微鏡", "複式顯微鏡"]
];

var cardData = [
  {"name":"孢子","category":"複式顯微鏡"},
  {"name":"孢子囊的紋路","category":"複式顯微鏡"},
  {"name":"紅血球","category":"複式顯微鏡"},
  {"name":"草履蟲","category":"複式顯微鏡"},
  {"name":"單胞藻","category":"複式顯微鏡"},
  {"name":"昆布","category":"複式顯微鏡"},
  {"name":"花粉","category":"複式顯微鏡"},
  {"name":"柱頭","category":"解剖顯微鏡"},
  {"name":"子房","category":"解剖顯微鏡"},
]

//================Setting===============
var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth   * 0.90;
canvas.height = window.innerHeight * 0.75;
var ctx = canvas.getContext("2d");


//答案框
var answerBoxNumRows = categoryNames.length;
var answerBoxNumCols = categoryNames[0].length;  // 用第一列的數量
var answerBoxWidth = canvas.width / answerBoxNumCols;
var answerBoxHeight = canvas.height * 0.5 / answerBoxNumRows; 
var answerBoxFillColor = "lightyellow";
var answerBoxBorderColor = "grey";
var answerBoxBorderWidth = 2;
var answerBoxTextColor   = "black";
var answerBoxFontColor   = "black";

// 卡片大小、欄數、列數、高度
var cardWidth  = 200;
var cardHeight = 100;
var numRows = 1;
var numCols = 4;
var cardsX = 10;        // 卡片群位置的最左側位置
var cardsY = 20 + answerBoxHeight*answerBoxNumRows; // 待答卡片的最高高度，需要與answerBoxHeight 配
var cardsArrangementType = "row";  // 使用"row"表示卡片重疊排列成一個row，或使用"grid"表示不重疊排列成為grid。

var cardFillColor = "#345E4F";
var cardClickedFillColor = "red";
var cardFontColor = "white";
var cardBorderColor = "white";
var cardBorderWidth = 2;

// 牌卡之間的間隔
var hSpace = 2;     // 卡片的x間隔
var vSpace = 2;     // 卡片的y間隔

// 牌卡的字型比例
var fontRatio = 0.25;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置
var maxLength = 3;         // 最大允許的字元長度










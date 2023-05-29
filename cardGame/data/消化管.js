var categoryNames = [  
];

var cardData = [
	{"name":"口腔","category":"正確"},
	{"name":"食道","category":"正確"},
	{"name":"賁門","category":"正確"},
	{"name":"胃","category":"正確"},
	{"name":"幽門","category":"正確"},
	{"name":"小腸","category":"正確"},
	{"name":"大腸","category":"正確"},
	{"name":"肛門","category":"正確"},
	{"name":"肝臟","category":"錯誤"},
	{"name":"胰臟","category":"錯誤"},
	{"name":"腎臟","category":"錯誤"},
	{"name":"唾腺","category":"錯誤"},
	{"name":"胃腺","category":"錯誤"},
	{"name":"腸腺","category":"錯誤"},
	{"name":"腸腺","category":"錯誤"},
	{"name":"胃腺","category":"錯誤"},

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

var cardFillColor = "#345E4F";
var cardClickedFillColor = "#7b968d";
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
var categoryNames = [];
var cardData = [
	{"name":"水母","category":"刺絲胞動物"},
	{"name":"水螅","category":"刺絲胞動物"},
	{"name":"珊瑚","category":"刺絲胞動物"},
	{"name":"海葵","category":"刺絲胞動物"},
	{"name":"絛蟲","category":"扁形動物"},
	{"name":"吸蟲","category":"扁形動物"},
	{"name":"肝吸蟲","category":"扁形動物"},
	{"name":"渦蟲","category":"扁形動物"},
	{"name":"蝸牛","category":"軟體動物"},
	{"name":"文蛤","category":"軟體動物"},
	{"name":"章魚","category":"軟體動物"},
	{"name":"烏賊","category":"軟體動物"},
	{"name":"蚯蚓","category":"環節動物"},
	{"name":"水蛭","category":"環節動物"},
	{"name":"蛭","category":"環節動物"},
	{"name":"沙蠶","category":"環節動物"},
	{"name":"昆蟲","category":"節肢動物"},
	{"name":"蜘蛛","category":"節肢動物"},
	{"name":"蝦","category":"節肢動物"},
	{"name":"蟹","category":"節肢動物"},
	{"name":"蟬","category":"節肢動物"},
	{"name":"衣魚","category":"節肢動物"},
	{"name":"頭蝨","category":"節肢動物"},
	{"name":"螞蟻","category":"節肢動物"},
	{"name":"海星","category":"棘皮動物"},
	{"name":"海膽","category":"棘皮動物"},
	{"name":"海參","category":"棘皮動物"},
	{"name":"海膽","category":"棘皮動物"},  	
	{"name":"魟魚","category":"魚類"},
	{"name":"鯊魚","category":"魚類"},
	{"name":"小丑魚","category":"魚類"},
	{"name":"海馬","category":"魚類"},
	{"name":"吳郭魚","category":"魚類"},
	{"name":"鯉魚","category":"魚類"},
	{"name":"蟾蜍","category":"兩生類"},
	{"name":"山椒魚","category":"兩生類"},
	{"name":"蠑螈","category":"兩生類"},
	{"name":"娃娃魚","category":"兩生類"},
	{"name":"赤蛙","category":"爬蟲類"},
	{"name":"南蛇","category":"爬蟲類"},
	{"name":"攀蜥","category":"爬蟲類"},
	{"name":"短吻鱷","category":"爬蟲類"},
	{"name":"斑龜","category":"爬蟲類"},
	{"name":"蜥蜴","category":"爬蟲類"},
	{"name":"小白鷺","category":"鳥類"},
	{"name":"臺灣藍鵲","category":"鳥類"},
	{"name":"五色鳥","category":"鳥類"},
	{"name":"企鵝","category":"鳥類"},
	{"name":"象","category":"哺乳類"},
	{"name":"蝙蝠","category":"哺乳類"},
	{"name":"鴨嘴獸","category":"哺乳類"},
	{"name":"針鼴","category":"哺乳類"},
	{"name":"袋鼠","category":"哺乳類"},
	{"name":"無尾熊","category":"哺乳類"},
	{"name":"虎鯨","category":"哺乳類"},
	{"name":"人","category":"哺乳類"},
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

var cardFillColor = "#63691c";
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
var scoresElement = document.getElementById("scores");
var scores = 0;
var correctScores = 100;   //答對加分
var wrongScores   = 50;    //答錯扣分
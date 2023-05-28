// 可使用多列答案框
var categoryNames = [
  ["刺絲胞", "扁形", "軟體", "環節"],
  ["節肢","棘皮", "脊索"]
];
var cardData = [
  {"name":"水母","img":"images_Animals/1.jpg","category":"刺絲胞"},
  {"name":"珊瑚","img":"images_Animals/2.jpg","category":"刺絲胞"},
  {"name":"水螅","img":"images_Animals/3.jpg","category":"刺絲胞"},
  {"name":"海葵","img":"images_Animals/4.jpg","category":"刺絲胞"},
  {"name":"絛蟲","img":"images_Animals/5.jpg","category":"扁形"},
  {"name":"渦蟲","img":"images_Animals/6.jpg","category":"扁形"},
  {"name":"絛蟲","img":"images_Animals/7.jpg","category":"扁形"},
  {"name":"蝸牛","img":"images_Animals/8.jpg","category":"軟體"},
  {"name":"蛞蝓","img":"images_Animals/9.jpg","category":"軟體"},
  {"name":"文蛤","img":"images_Animals/10.jpg","category":"軟體"},
  {"name":"章魚","img":"images_Animals/11.jpg","category":"軟體"},
  {"name":"烏賊","img":"images_Animals/12.jpg","category":"軟體"},
  {"name":"蚯蚓","img":"images_Animals/13.jpg","category":"環節"},
  {"name":"水蛭","img":"images_Animals/14.jpg","category":"環節"},
  {"name":"沙蠶","img":"images_Animals/15.jpg","category":"環節"},
  {"name":"水蛭","img":"images_Animals/16.jpg","category":"環節"},
  {"name":"蜈蚣","img":"images_Animals/17.jpg","category":"節肢"},
  {"name":"蝴蝶","img":"images_Animals/18.jpg","category":"節肢"},
  {"name":"螃蟹","img":"images_Animals/19.jpg","category":"節肢"},
  {"name":"蜘蛛","img":"images_Animals/20.jpg","category":"節肢"},
  {"name":"蝦","img":"images_Animals/21.jpg","category":"節肢"},
  {"name":"蒼蠅","img":"images_Animals/22.jpg","category":"節肢"},
  {"name":"海星","img":"images_Animals/23.jpg","category":"棘皮"},
  {"name":"海蛇尾","img":"images_Animals/24.jpg","category":"棘皮"},
  {"name":"海膽","img":"images_Animals/25.jpg","category":"棘皮"},
  {"name":"海參","img":"images_Animals/26.jpg","category":"棘皮"},
  {"name":"海參","img":"images_Animals/27.jpg","category":"棘皮"},
  {"name":"鯊魚","img":"images_Animals/28.jpg","category":"脊索"},
  {"name":"魚","img":"images_Animals/29.jpg","category":"脊索"},
  {"name":"青蛙","img":"images_Animals/30.jpg","category":"脊索"},
  {"name":"蠑螈","img":"images_Animals/31.jpg","category":"脊索"},
  {"name":"蜥蜴","img":"images_Animals/32.jpg","category":"脊索"},
  {"name":"蛇","img":"images_Animals/33.jpg","category":"脊索"},
  {"name":"龜","img":"images_Animals/34.jpg","category":"脊索"},
  {"name":"企鵝","img":"images_Animals/35.jpg","category":"脊索"},
  {"name":"穿山甲","img":"images_Animals/36.jpg","category":"脊索"},
  {"name":"人","img":"","category":"脊索"},  
]

//================Setting===============var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth   * 0.90;
canvas.height = window.innerHeight * 0.75;
var ctx = canvas.getContext("2d");


//答案框
var answerBoxNumRows = categoryNames.length;
var answerBoxNumCols = categoryNames[0].length;  // 用第一列的數量
var answerBoxWidth = canvas.width / answerBoxNumCols;
var answerBoxHeight = canvas.height * 0.65 / answerBoxNumRows; 
var answerBoxFillColor = "lightblue";
var answerBoxBorderColor = "grey";
var answerBoxBorderWidth = 2;
var answerBoxTextColor   = "black";
var answerBoxFontColor = "black";


// 卡片大小、欄數、列數、高度
var cardWidth  = 150;
var cardHeight = 150;
var numRows = 1;
var numCols = 6;
var cardsX = 10;        // 卡片群位置的最左側
var cardsY = 20 + answerBoxHeight*answerBoxNumRows; // 待答卡片的最高高度，需要與answerBoxHeight 配
var cardsArrangementType = "row";  // 使用"row"表示卡片重疊排列成一個row，或使用"grid"表示不重疊排列成為grid。

var cardFillColor = "#345E4F";
var cardClickedFillColor = "red";
var cardBorderColor = "white";
var cardFontColor = "white";
var cardBorderWidth = 5;


// 牌卡之間的間隔
var hSpace = 2;     // 卡片的x間隔
var vSpace = 2;     // 卡片的y間隔

// 牌卡的字型比例
var fontRatio = 0.25;      // 牌卡字的尺寸fontSize = fontRatio*cardWidth
var fontHeightRatio = 3;   // 控制字在牌卡的高度位置
var maxLength = 3;         // 最大允許的字元長度







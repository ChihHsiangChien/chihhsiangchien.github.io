var cards = {
"水母": "刺絲胞動物",
"水螅": "刺絲胞動物",
"珊瑚蟲": "刺絲胞動物",
"海葵": "刺絲胞動物",
"絛蟲": "扁形動物",
"吸蟲": "扁形動物",
"渦蟲": "扁形動物",
"蝸牛": "軟體動物",
"文蛤": "軟體動物",
"章魚": "軟體動物",
"烏賊": "軟體動物",
"蚯蚓": "環節動物",
"水蛭": "環節動物",
"沙蠶": "環節動物",
"昆蟲": "節肢動物",
"蜘蛛": "節肢動物",
"蝦": "節肢動物",
"蟹": "節肢動物",
"蟬": "節肢動物",
"衣魚": "節肢動物",
"頭蝨": "節肢動物",
"螞蟻": "節肢動物",
"海星": "棘皮動物",
"海膽": "棘皮動物",
"海參": "棘皮動物",
"海膽": "棘皮動物",
};

var cardData = [];


// Variables
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var numCols = 5;
var numRows = 10;
var cardWidth  = 80;
var cardHeight = 50

// Iterate over the card data
Object.keys(cards).forEach((cardName) => {
  var card = {
    name: cardName,
    kindom: cards[cardName],
    x: 0,
    y: 0,
  };

  cardData.push(card);
});

// Drawing function
function drawCards() {
  // Calculate the width and height of each grid cell
  var cellWidth = canvas.width / numCols;
  var cellHeight = (canvas.height * 2 / 3 - canvas.height / 3) / numRows;
	
  // Iterate over the card data and draw the text in a box  
  cardData.forEach(function (card, index) {
    // Calculate the row and column of the current image
	
    var row = Math.floor(index / numCols) ;
    var col = index % numCols;
	console.log(row, col);
    // Calculate the position of the image within the grid cell
    card.x = col * cardWidth + 10 * col ;
    card.y = canvas.height / 3 + row * cardHeight + 10 * row;

    // Draw the card
	ctx.fillStyle = "green";
	ctx.fillRect(card.x, card.y, cardWidth, cardHeight);

	ctx.lineWidth = 2;
	ctx.strokeStyle = "black";
	ctx.rect(card.x, card.y, cardWidth, cardHeight);
	ctx.stroke();

    // Draw the text inside the box
	ctx.fillStyle = "white";
	ctx.font = "20px Arial";
    ctx.fillText(card.name,   card.x + 5, card.y + 20);
	ctx.font = "12px Arial";
	ctx.fillText(card.kindom, card.x + 5, card.y + 40);
  });
}

// Call the drawCards function to draw the cards on the canvas
drawCards();
var cardData = {
"水母": "刺絲胞動物",
"水螅": "刺絲胞動物",
"珊瑚": "刺絲胞動物",
"海葵": "刺絲胞動物",
"絛蟲": "扁形動物",
"吸蟲": "扁形動物",
"肝吸蟲": "扁形動物",
"渦蟲": "扁形動物",
"蝸牛": "軟體動物",
"文蛤": "軟體動物",
"章魚": "軟體動物",
"烏賊": "軟體動物",
"蚯蚓": "環節動物",
"水蛭": "環節動物",
"螞蝗": "環節動物",
"沙蠶": "環節動物",
"昆蟲": "節肢動物",
"蜘蛛": "節肢動物",
"蝦": "節肢動物",
"蟹": "節肢動物",
"蟬": "節肢動物",
"衣魚": "節肢動物",
"頭蝨": "節肢動物",
"螞蟻": "節肢動物",
"蝴蝶": "節肢動物",
"蟑螂": "節肢動物",
"海星": "棘皮動物",
"海膽": "棘皮動物",
"海參": "棘皮動物",
"派大星": "棘皮動物",
};

// Variables
var cards = [];
var selectedCards = [];

var canvas = document.getElementById("canvas");
// Resize canvas to fit window
canvas.width = window.innerWidth * 4/5;
canvas.height = window.innerHeight* 4/5;

var ctx = canvas.getContext("2d");

var numCols = 6;
var numRows = 6;

var hSpace = 10;
var vSpace = 10;
var cardWidth  = (canvas.width  - (numCols+1) * hSpace) / numCols;
var cardHeight = (canvas.height - (numRows+1) * vSpace) / numRows;

var numClick = 0;
var numCards;


// Iterate over the card data
Object.keys(cardData).forEach((cardName) => {
    var card = {
        name: cardName,
        kindom: cardData[cardName],
        faceUp: false, // Add a new property to track the card's face-up state
        x: 0,
        y: 0,
    };
    cards.push(card);
});

numCards = cards.length;

// 一開始發牌，依照numCols 和 numRows給予cards座標
function setCardsPos(){
    cards.forEach(function (card, index) {
        // Calculate the row and column of the current image
        var row = Math.floor(index / numCols) ;
        var col = index % numCols;
        
        // Calculate the position of the image within the grid cell
        card.x = col * cardWidth  +  hSpace* (col + 1);
        card.y = row * cardHeight + vSpace * (row + 1);
    });
}

// Drawing function
function drawCards() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Iterate over the card data and draw the text in a box  
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var index = i;

        // Check if the card is in the selectedCards array
        var isSelected = selectedCards.includes(card);
        
        // Set the color based on whether the card is selected or not
        if (isSelected) {
            ctx.fillStyle = "red"; // Change to the desired color for clicked cards
        } else {
            ctx.fillStyle = "green";
        }
        
        ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
        // Draw the text inside the box
        ctx.fillStyle = "white";

        var fontSize = 5 * (cardWidth /18);
        ctx.font = fontSize + "px Arial";
        // ctx.fillText(card.name,   card.x + 5, card.y + 20);
        // ctx.font = "30px Arial";
        ctx.fillText(card.name,   card.x + cardWidth*0.10, card.y + cardHeight *0.80);
            
        }
}


// Start function
function start() {
 
	// Shuffle the images array
    shuffle(cards);

	// Call the drawCards function to draw the cards on the canvas
    setCardsPos();
	drawCards();
    
    // Enable dragging
    canvas.addEventListener("mousedown", click);
    // canvas.addEventListener("mousemove", drag);
    // canvas.addEventListener("mouseup", endClick);
    // canvas.addEventListener("mouseleave", endClick);


    // Touch event listeners
    canvas.addEventListener("touchstart", click);
    // canvas.addEventListener("touchmove", drag);
    // canvas.addEventListener("touchend", click);

    // Draw Box
    // drawAnswerBox();
    
    // Start the timer
    // startTimer();  
}

// Function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


// Helper function to get random integer
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


//開始放卡片
start();


// click
function click(event) {
    event.preventDefault(); // Prevent default touch events
    var rect = canvas.getBoundingClientRect();
    var mouseX, mouseY;
    
    numClick ++;    
    var clickElement = document.getElementById("click");
    clickElement.innerText = "click: " + numClick;    
    
    // 檢查點擊位置
    if (event.type === "mousedown") {
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    } else if (event.type === "touchstart") {
        mouseX = event.touches[0].clientX - rect.left;
        mouseY = event.touches[0].clientY - rect.top;
    }

    var selected = null;

    // Iterate over the cards
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        if (
            mouseX > card.x &&
            mouseX < card.x + cardWidth &&
            mouseY > card.y &&
            mouseY < card.y + cardHeight
        ) {
            selected = card;
            break;
          }
    }

    // 點到的放進selectedCards[]
    if (selected && selectedCards.length < 2 && !selectedCards.includes(selected) ) {
        selectedCards.push(selected);
    }
    
    
    if (selectedCards.length === 2) {
        var card1 = selectedCards[0];
        var card2 = selectedCards[1];

        if (card1.kindom === card2.kindom) {
            setTimeout(function () {
                // Matched: Remove the cards from the array
                var index1 = cards.indexOf(card1);
                cards.splice(index1, 1);
                var index2 = cards.indexOf(card2);
                cards.splice(index2, 1);
                // Reset the selected cards array
                selectedCards = [];

                // Redraw the cards
                drawCards();
            }, 300);
           

            
        } else {
            // Not matched: Face down the cards
            setTimeout(function () {
                selectedCards = [];
                drawCards();
            }, 700);
      } 
    } 
    
    drawCards();
}

function endClick() {
  selectedCard = null;
}


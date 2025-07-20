const grid = [
  ["蜘蛛", "胡蜂", "蝶蛾"],
  ["秧雞", "赤蛙", "蚊蠅"],
  ["斑龜", "水蠆", "蝌蚪"],
];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 700;
canvas.height = 600;
const gridSize = 3;
const cellVspace = 3; // 框框的垂直間距
const cellHspace = 15; // 框框的水平間距
const handsVspace = 10;
const handsHspace = 10;
const handsWidth = 100;
const handsHeight= canvas.height - 2 * handsVspace;
const cellWidth =
  (canvas.width - handsWidth - (gridSize + 1) * cellHspace) / gridSize;
const cellHeight = (canvas.height - (gridSize + 1) * cellVspace) / gridSize;

let playerHand = [];
let computerHand = [];
let centralPile = [];

// Initialize game
function initGame() {
  drawHands();
  drawGrid();
  drawText();
}

function drawHands() {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(handsHspace, handsVspace);
    ctx.lineTo(handsHspace + handsWidth, handsVspace);
    ctx.lineTo(handsHspace + handsWidth, handsVspace + handsHeight);
    ctx.lineTo(handsHspace, handsVspace + handsHeight);
    ctx.closePath(); // 連接起始點與終點
    ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;

  for (let col = 0; col < grid.length; col++) {
    for (let row = 0; row < grid[col].length; row++) {
      ctx.beginPath();
      ctx.moveTo(
        handsHspace + handsWidth + col * cellWidth + (col + 1) * cellHspace,
        row * cellHeight + (row + 1) * cellVspace
      );
      ctx.lineTo(
        handsHspace + handsWidth + (col + 1) * cellWidth + (col + 1) * cellHspace,
        row * cellHeight + (row + 1) * cellVspace
      );
      ctx.lineTo(
        handsHspace + handsWidth + (col + 1) * cellWidth + (col + 1) * cellHspace,
        (row + 1) * cellHeight + (row + 1) * cellVspace
      );
      ctx.lineTo(
        handsHspace + handsWidth + col * cellWidth + (col + 1) * cellHspace,
        (row + 1) * cellHeight + (row + 1) * cellVspace
      );
      ctx.closePath(); // 連接起始點與終點

      ctx.stroke();
    }
  }
}

function drawText() {
  ctx.font = "20px Arial";
  ctx.textAlign = "start";
  ctx.textBaseline = "top";

  for (let col = 0; col < grid.length; col++) {
    for (let row = 0; row < grid[col].length; row++) {
      const text = grid[col][row];
      const x = handsHspace + handsWidth + col * cellWidth + (col + 1) * cellHspace;
      const y = row * cellHeight + (row + 1) * cellVspace;
      ctx.fillText(text, x, y+4);
    }
  }
}


// 骰子按鈕 事件
const diceBtn = document.getElementById('diceBtn');
diceBtn.addEventListener('click', () => {
    // 

});





// Start the game
initGame();

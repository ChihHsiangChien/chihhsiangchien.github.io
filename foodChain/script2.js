var canvas = document.getElementById("canvas");
canvas.width = 500;
canvas.height = 500;
var ctx = canvas.getContext("2d");

var cardWidth = 100;
var cardHeight = 50;
var cardSpacing = 20;
// 清除Canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 繪製卡片
function drawCard(x, y, card) {
  ctx.fillStyle = "lightgray";
  ctx.fillRect(x, y, cardWidth, cardHeight);

  ctx.fillStyle = "black";
  ctx.fillText(card.name, x + 10, y + 20);
  /*
  ctx.fillText("Population: " + card.population, x + 10, y + 40);
  ctx.fillText("Reproduction: " + card.reproductionRate, x + 10, y + 60);
  ctx.fillText("Feeding Interval: " + card.feedingInterval, x + 10, y + 80);
  */

  // 在卡片上繪製其他屬性...
}

// 繪製棲地
function drawHabitat() {
  ctx.fillStyle = "green";
  ctx.fillRect(10, 10, canvas.width - 10, canvas.height * 0.5);
}

// 初始化遊戲
function initGame() {
  clearCanvas();

  // 繪製卡片

  var startX =
    (canvas.width -
      (cardWidth * cardData.length + cardSpacing * (cardData.length - 1))) /
    2;
  var startY = canvas.height - cardHeight - 10;

  for (var i = 0; i < cardData.length; i++) {
    drawCard(startX + (cardWidth + cardSpacing) * i, startY, cardData[i]);
  }

  // 繪製棲地
  drawHabitat();
}

initGame();

/*
class Card {
  constructor(
    name,
    canMove,
    population,
    reproductionRate,
    requiredFood,
    feedingInterval
  ) {
    this.name = name;
    this.canMove = canMove;
    this.population = population;
    this.reproductionRate = reproductionRate;
    this.requiredFood = requiredFood;
    this.feedingInterval = feedingInterval;
  }
}

// 轉換cardData為物件
function convertCardDataToObject(cardData) {
  const cardObjects = [];
  for (let i = 0; i < cardData.length; i++) {
    const {
      name,
      canMove,
      population,
      reproductionRate,
      requiredFood,
      feedingInterval,
    } = cardData[i];
    const card = new Card(
      name,
      canMove,
      population,
      reproductionRate,
      requiredFood,
      feedingInterval
    );
    cardObjects.push(card);
  }
  return cardObjects;
}

// 測試
const cardObjects = convertCardDataToObject(cardData);
console.log(cardObjects);

*/

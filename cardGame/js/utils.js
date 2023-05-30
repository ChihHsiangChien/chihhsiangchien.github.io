// Start function
function start() {
  switch (gameType) {
    case "classify":
      {
        shufflePos(cards);
        setCardsPos(cards);
        drawCards(cards);
        enableDragging();
        enableTouchEvents();
        drawAnswerBox();
        startTimer();
      }
      break;
    case "match":
      {
        // 用numCards根號計算每欄列擺幾張牌
        numCols = parseInt(Math.sqrt(cards.length));
        numRows = Math.ceil(cards.length / numCols);
        cardWidth = (canvas.width - (numCols + 1) * hSpace) / numCols;
        cardHeight = (canvas.height - (numRows + 1) * vSpace) / numRows;

        setCardsPos(cards);
        shufflePos(cards);
        drawCards(cards);
        canvas.addEventListener("mousedown", clickIfMatch);
        canvas.addEventListener("touchstart", clickIfMatch);
        startTimer();
      }
      break;
    case "order":
      {
        // 根號計算每欄列擺幾張牌
        numCols = parseInt(Math.sqrt(cards.length));
        numRows = Math.ceil(cards.length / numCols);
        cardWidth = (canvas.width - (numCols + 1) * hSpace) / numCols;
        cardHeight = (canvas.height - (numRows + 1) * vSpace) / numRows;

        setCardsPos(cards);
        shufflePos(cards);
        drawCards(cards);

        canvas.addEventListener("mousedown", clickIfOrder);
        canvas.addEventListener("touchstart", clickIfOrder);
        startTimer();
      }
      break;
    default: {
    }
  }
}

// card load callback
function cardLoaded() {
  cardsLoaded++;

  if (
    cardsLoaded === totalCardsWithImages ||
    (allCardsHaveNoImages && cardsLoaded === 0)
  ) {
    start();
  }
}

// 讀取卡片資料
function readCardData() {
  for (var i = 0; i < cardData.length; i++) {
    var image = null;

    // Check if image path is provided
    if (cardData[i]["img"]) {
      image = new Image();
      image.addEventListener("load", cardLoaded); // Add load event listener
      image.src = cardData[i]["img"];
      totalCardsWithImages++; // Increment the count for cards with images
    } else {
      cardLoaded(); // Increment the count for cards without images
    }

    cards.push({
      name: cardData[i]["name"],
      element: image,
      category: cardData[i]["category"],
      targetBoxNo: getArrayIdx(cardData[i]["category"], categoryNames),
      faceUp: true,
      x: 0,
      y: 0,
      zIndex: 0, // Add the zIndex property for each card
    });
  }
  // Check if all cards have no images and call start() directly
  if (allCardsHaveNoImages) {
    start();
  }
}

/*
 * 取得輸入字串位於array的位置
 * @param {str}   要搜尋的字串
 * @param {array} 在array中尋找
 */
function getArrayIdx(str, array) {
  var idx = 1;
  for (var i = 0; i < array.length; i++) {
    for (var j = 0; j < array[i].length; j++) {
      if (str == array[i][j]) {
        return idx;
      }
      idx++;
    }
  }
}

// 找到現在點選的卡片是在cards的位置
function getCardIdx(card) {
  for (var i = 0; i < cards.length; i++) {
    if (card == cards[i]) {
      return i;
    }
  }
}

function enableDragging() {
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", drag);
  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("mouseleave", endDrag);
}

function enableTouchEvents() {
  canvas.addEventListener("touchstart", startDrag);
  canvas.addEventListener("touchmove", drag);
  canvas.addEventListener("touchend", endDrag);
}

// ======= 計時函數=======
// Function to start the timer
function startTimer() {
  timerInterval = setInterval(function () {
    timerSeconds++;
    /*
    if (timerSeconds >= 50) {
      stopTimer();
    }
    */
    updateTimerDisplay();
  }, 1000);
}

// Function to stop the timer
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// Function to update the timer display
function updateTimerDisplay() {
  var timerElement = document.getElementById("timer");
  timerElement.innerText = timerSeconds;
}
// ======= 計時函數結束=======

// 從min到max取亂數整數
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function shufflePos() {
  // 取得位置Array
  var positions = [];
  for (var i = 0; i < cards.length; i++) {
    positions.push({ x: cards[i].x, y: cards[i].y });
  }

  shuffle(positions);

  for (var i = 0; i < cards.length; i++) {
    cards[i].x = positions[i].x;
    cards[i].y = positions[i].y;
  }
}

// 發牌依照numCols 和 numRows給予cards座標
function setCardsPos(cards) {
  cards.forEach(function (card, index) {
    // Calculate the row and column of the current image
    var col = index % numCols;
    var row;
    if (cardsArrangementType == "row") {
      row = 0;
    } else if (cardsArrangementType == "grid") {
      row = Math.floor(index / numCols);
    }

    // Calculate the position of the image within the grid cell
    card.x = cardsX + col * (cardWidth + hSpace);
    card.y = cardsY + row * (cardHeight + vSpace);
    //card.y  = 300;
  });
}

// 獲取滑鼠/觸摸點擊位置的相對座標
function getMouseCoordinates(event, rect) {
  var mouseX, mouseY;

  if (event.type === "mousedown") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchstart") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }

  return { mouseX, mouseY };
}

// 獲取滑鼠/觸摸點擊位置的相對座標
function getMouseCoordinatesMoving(event, rect) {
  var mouseX, mouseY;

  if (event.type === "mousemove") {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  } else if (event.type === "touchmove") {
    mouseX = event.touches[0].clientX - rect.left;
    mouseY = event.touches[0].clientY - rect.top;
  }

  return { mouseX, mouseY };
}

// 檢查點擊位置是否在卡片上
function checkClickedCard(mouseX, mouseY) {
  var selected = null;

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
  return selected;
}

// 將點擊到的卡片添加到已選擇的卡片陣列
function addToSelectedCards(selected, selectedCards) {
  if (selected && !selectedCards.includes(selected)) {
    selectedCards.push(selected);
  }
}

/*
 * 選出有重疊的卡片最上面那一個
 */
function checkClickedOverlapedCard(mouseX, mouseY) {
  var highestZIndex = -1;
  var selected = null;

  for (var i = cards.length - 1; i >= 0; i--) {
    var card = cards[i];

    if (
      mouseX > card.x &&
      mouseX < card.x + cardWidth &&
      mouseY > card.y &&
      mouseY < card.y + cardHeight
    ) {
      //var zIndex = parseInt(card.element.style.zIndex || 0);
      var zIndex = card.zIndex || 0;

      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
        selected = card;
      }
    }
  }
  return { selected, highestZIndex };
}

// 在配對遊戲點卡片
function clickIfMatch(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var selected = checkClickedCard(mouseX, mouseY); // 找出點到的卡片
  if (selectedCards.length < 2) {
    addToSelectedCards(selected, selectedCards); // 把點到的卡片放進 selectedCards
  }
  handleMatchingCards(); // 檢查是否同一個分類
  drawCards(cards);
}

// 在順序遊戲點卡片
function clickIfOrder(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var selected = checkClickedCard(mouseX, mouseY); // 找出點到的卡片
  addToSelectedCards(selected, selectedCards); // 把點到的卡片放進 selectedCards
  preCardIdx = nowCardIdx;
  nowCardIdx = getCardIdx(selected) % cards.length;
  handleOrderingCards();
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 檢查順序
  drawCards(cards);
}

// Drag and drop functions
function startDrag(event) {
  event.preventDefault(); // Prevent default touch events
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var { selected, highestZIndex } = checkClickedOverlapedCard(mouseX, mouseY); // 找出點到的卡片

  if (selected) {
    selectedcard = selected;
    offsetX = mouseX - selected.x;
    offsetY = mouseY - selected.y;
    //selectedcard.element.style.zIndex = highestZIndex + 1;
    selectedcard.zIndex = highestZIndex + 1;
  }
}

/*
 * 拖曳卡片發生的動作
 * 調整卡片順序，只拖曳第一張
 * 重新繪製canvas
 */
function drag(event) {
  event.preventDefault(); // Prevent default touch events

  if (selectedcard) {
    var rect = canvas.getBoundingClientRect();
    var { mouseX, mouseY } = getMouseCoordinatesMoving(event, rect);

    var newcardX = mouseX - offsetX;
    var newcardY = mouseY - offsetY;

    adjustCardPosition(newcardX, newcardY);
    bringSelectedCardToTopLevel();
    redrawCanvas();
  }
}

function endDrag() {
  selectedcard = null;
}

function endClick() {
  selectedCard = null;
}

function adjustCardPosition(newcardX, newcardY) {
  // Adjust the position if the card exceeds the canvas boundaries
  if (newcardX < 0) {
    newcardX = 0;
  } else if (newcardX + cardWidth > canvas.width) {
    newcardX = canvas.width - cardWidth;
  }

  if (newcardY < 0) {
    newcardY = 0;
  } else if (newcardY + cardHeight > canvas.height) {
    newcardY = canvas.height - cardHeight;
  }

  selectedcard.x = newcardX;
  selectedcard.y = newcardY;
}

function bringSelectedCardToTopLevel() {
  var highestZIndex = -1;
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    // var zIndex = parseInt(card.element.style.zIndex || 0);
    var zIndex = card.zIndex || 0;
    if (zIndex > highestZIndex) {
      highestZIndex = zIndex;
    }
  }
  // selectedcard.element.style.zIndex = highestZIndex + 1;
  selectedcard.zIndex = highestZIndex + 1;
}

/*
畫出答案格子並寫上格子名稱
*/
function drawAnswerBox() {
  for (var i = 0; i < answerBoxNumRows; i++) {
    for (var j = 0; j < categoryNames[i].length; j++) {
      // Fill the card with color
      ctx.fillStyle = answerBoxFillColor;
      ctx.fillRect(
        j * answerBoxWidth,
        i * answerBoxHeight,
        answerBoxWidth,
        answerBoxHeight
      );

      ctx.strokeStyle = answerBoxBorderColor;
      ctx.lineWidth = answerBoxBorderWidth;
      ctx.strokeRect(
        j * answerBoxWidth,
        i * answerBoxHeight,
        answerBoxWidth,
        answerBoxHeight
      );

      ctx.fillStyle = answerBoxTextColor;
      ctx.font = "24px Arial";
      ctx.fillText(
        categoryNames[i][j],
        10 + j * answerBoxWidth,
        30 + i * answerBoxHeight
      );
    }
  }
}

function drawCards(cards) {
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Iterate over the card data and draw the text in a box
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];

    // 被點擊的用不同底色
    // Check if the card is in the selectedCards array
    var isSelected = selectedCards.includes(card);

    // Set the color based on whether the card is selected or not
    if (isSelected) {
      ctx.fillStyle = cardClickedFillColor; // 被點擊的顏色
    } else {
      ctx.fillStyle = cardFillColor; // 平常的顏色
    }
    ctx.fillRect(card.x, card.y, cardWidth, cardHeight);

    // Draw the border
    ctx.strokeStyle = cardBorderColor;
    ctx.lineWidth = cardBorderWidth;
    ctx.strokeRect(card.x, card.y, cardWidth, cardHeight);

    // 加上圖片和文字
    if (cardsFacing || isSelected) {
      // 加上圖片
      if (card.element) {
        ctx.drawImage(card.element, card.x, card.y, cardWidth, cardHeight);
      }

      // 加上文字
      ctx.fillStyle = cardFontColor;
      var fontSize = fontRatio * cardWidth;

      if (card.name.length > maxLength) {
        var ratio = maxLength / card.name.length; // 計算縮小比例
        fontSize *= ratio; // 乘上比例以縮小字體大小
      }

      ctx.font = fontSize + "px Arial";
      ctx.fillText(
        card.name,
        card.x + cardWidth * 0.1,
        card.y + cardHeight * fontRatio * fontHeightRatio
      );
    } else {
      // 只繪製背面顏色
      ctx.fillStyle = cardBackFillColor;
      ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
    }
  }
}

// Drawing function
function drawCards2(cards) {
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Iterate over the card data and draw the text in a box
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];

    // 被點擊的用不同底色
    // Check if the card is in the selectedCards array
    var isSelected = selectedCards.includes(card);

    // Set the color based on whether the card is selected or not
    if (isSelected) {
      ctx.fillStyle = cardClickedFillColor; // 被點擊的顏色
    } else {
      ctx.fillStyle = cardFillColor; // 平常的顏色
    }
    ctx.fillRect(card.x, card.y, cardWidth, cardHeight);

    // Draw the border
    ctx.strokeStyle = cardBorderColor;
    ctx.lineWidth = cardBorderWidth;
    ctx.strokeRect(card.x, card.y, cardWidth, cardHeight);

    // 加上圖片
    if (card.element) {
      ctx.drawImage(card.element, card.x, card.y, cardWidth, cardHeight);
    }

    // 加上文字
    ctx.fillStyle = cardFontColor;
    var fontSize = fontRatio * cardWidth;

    if (card.name.length > maxLength) {
      var ratio = maxLength / card.name.length; // 計算縮小比例
      fontSize *= ratio; // 乘上比例以縮小字體大小
    }
    ctx.font = fontSize + "px Arial";
    // ctx.font = "30px Arial";
    ctx.fillText(
      card.name,
      card.x + cardWidth * 0.1,
      card.y + cardHeight * fontRatio * fontHeightRatio
    );
  }
}

/*
 * 計算各卡的zIndex重新繪製順序
 * 用在會移動卡片的遊戲
 */
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sort the cards based on their z-index
  var sortedcards = cards.slice().sort(function (a, b) {
    // var zIndexA = parseInt(a.element.style.zIndex || 0);
    // var zIndexB = parseInt(b.element.style.zIndex || 0);
    var zIndexA = parseInt(a.zIndex || 0);
    var zIndexB = parseInt(b.zIndex || 0);
    return zIndexA - zIndexB;
  });

  drawAnswerBox();
  drawCards(sortedcards);

  /*
  // Draw the cards in the sorted order
  for (var i = 0; i < sortedcards.length; i++) {
    var card = sortedcards[i];
    ctx.drawImage(card.element, card.x, card.y, cardWidth, cardHeight);
    ctx.font = "30px Arial";
    ctx.fillText(card.name, card.x + cardWidth*0.10, card.y + cardHeight * fontRatio * fontHeightRatio);    
  }
  */
}

/*
按下按鈕檢查卡片是否在正確位置
*/
function checkCardsPlacement() {
  var score = 0;
  var wrongcards = [];

  // Check each card placement
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var boxIndex = card.targetBoxNo - 1;
    // var boxIndex = cardNo - 1;

    var boxX = (boxIndex % answerBoxNumCols) * answerBoxWidth;
    var boxY = parseInt(boxIndex / answerBoxNumCols) * answerBoxHeight;

    // Calculate the allowed tolerance for placement
    var tolerance = answerBoxWidth / 10;

    // Check if the card is within the correct box area
    if (
      // 在正確答案的框框裡
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + answerBoxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + answerBoxHeight
    ) {
      score++;
    } else {
      if (
        // 在待答區
        card.x + tolerance >= cardsX &&
        card.x + cardWidth - tolerance <= canvas.width &&
        card.y + tolerance >= cardsY &&
        card.y + cardHeight - tolerance <= canvas.height
      ) {
        //pass;
      } else {
        wrongcards.push(card);
      }
    }
  }

  // Show the score above the canvas
  var scoreElement = document.getElementById("score");
  scoreElement.innerText = "Score: " + score;

  // If there are wrong cards, slide them to the middle and allow the user to place them again
  if (wrongcards.length > 0) {
    wrongSound.play();
    slideWrongcards(wrongcards);
  } else if (score != 0) {
    correctSound.play();
  }

  // If the score reaches , stop the timer
  if (score === cards.length) {
    correctSound.play();
    stopTimer();
  }
}

// 處理兩張已選擇的卡片是否匹配
function handleMatchingCards() {
  if (selectedCards.length === 2) {
    var card1 = selectedCards[0];
    var card2 = selectedCards[1];

    if (card1.category === card2.category) {
      correctSound.play();

      score += correctScore;
      scoreElement.innerText = "score: " + score;

      setTimeout(function () {
        // Matched: Remove the cards from the array
        var index1 = cards.indexOf(card1);
        cards.splice(index1, 1);
        var index2 = cards.indexOf(card2);
        cards.splice(index2, 1);
        // Reset the selected cards array
        selectedCards = [];

        // Redraw the cards
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCards(cards);

        if (cards.length == 0) {
          youWin();
        }
      }, 200);
    } else {
      // Not matched
      wrongSound.play();
      score -= wrongScore;
      scoreElement.innerText = "score: " + score;
      setTimeout(function () {
        selectedCards = [];
        drawCards(cards);
      }, 200);
    }
  }
}

//檢查新加入的selectedCards是否按照順序
function handleOrderingCards() {
  if (selectedCards[selectedCards.length - 1].category != correctCategory) {
    wrongSound.play();
    score -= wrongScore;
    scoreElement.innerText = "score: " + score;
    setTimeout(function () {
      selectedCards.pop();
      nowCardIdx = preCardIdx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCards(cards);
    }, 200);
    return;
  }

  if (preCardIdx == null || nowCardIdx == (preCardIdx + 1) % cards.length) {
    correctSound.play();
    score += correctScore;
    scoreElement.innerText = "score: " + score;
  } else {
    wrongSound.play();
    score -= wrongScore;
    scoreElement.innerText = "score: " + score;
    setTimeout(function () {
      selectedCards.pop();
      nowCardIdx = preCardIdx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCards(cards);
    }, 200);
  }
}

/* 
滑動卡片動畫
*/
function animateSlide(card, targetX, targetY) {
  var startX = card.x;
  var startY = card.y;
  var animationDuration = 500; // milliseconds
  var startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = timestamp - startTime;

    // Calculate the new position using easing function (e.g., easeOutQuad)
    var newX = easeOutQuad(
      progress,
      startX,
      targetX - startX,
      animationDuration
    );
    var newY = easeOutQuad(
      progress,
      startY,
      targetY - startY,
      animationDuration
    );

    card.x = newX;
    card.y = newY;
    redrawCanvas();

    if (progress < animationDuration) {
      requestAnimationFrame(step);
    }
  }

  // Start the animation
  requestAnimationFrame(step);
}

function slideWrongcards(wrongcards) {
  // Animate the wrong cards sliding to the middle
  for (var i = 0; i < wrongcards.length; i++) {
    var card = wrongcards[i];

    // 答錯的卡片滑到最後一個位置
    // var targetX = getRandomInt(canvas.width *0.8, canvas.width  - card.element.width);
    // var targetY = getRandomInt(canvas.height*0.8, canvas.height - card.element.height);
    var targetX = cardsX + (numCols - 1) * (cardWidth + hSpace);
    var targetY = cardsY + (numRows - 1) * (cardHeight + vSpace);

    // Use requestAnimationFrame for smoother animation
    animateSlide(card, targetX, targetY);
  }
}

function easeOutQuad(t, b, c, d) {
  t /= d;
  return -c * t * (t - 2) + b;
}

function shake() {
  shuffle(cards);
  var wrongcards = [];

  // Check each card placement
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var boxIndex = card.targetBoxNo - 1;

    var boxX = (boxIndex % answerBoxNumCols) * answerBoxWidth;
    var boxY = parseInt(boxIndex / answerBoxNumCols) * answerBoxHeight;

    // Calculate the allowed tolerance for placement
    var tolerance = answerBoxWidth / 10;

    // Check if the card is within the correct box area
    if (
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + answerBoxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + answerBoxHeight
    ) {
      //pass;
    } else {
      wrongcards.push(card);
    }
  }

  // If there are wrong cards, slide them to the middle and allow the user to place them again
  if (wrongcards.length > 0) {
    // slideWrongcards(wrongcards);
    setCardsPos(wrongcards);
    drawCards(wrongcards);
    //placeCards(wrongcards);
  }
  redrawCanvas();
}

function youWin() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  stopTimer();

  ctx.fillStyle = "black";
  ctx.font = "100px Arial";
  ctx.fillText("YOU WIN", 30, canvas.height * 0.5);
}

cardWidth = 170;
cardHeight = 60;
answerBoxHeight = (canvas.height * 0.8) / answerBoxNumRows;
cardsY = 20 + answerBoxHeight * answerBoxNumRows; // 待答卡片的最高高度，需要與answerBoxHeight 配
gameType = "classify";

readCardData();

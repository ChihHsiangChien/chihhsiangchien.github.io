// ==========================================
// 酷炫科技風 (Cyberpunk / Sci-Fi HUD) 卡牌框架引擎
// ==========================================

// 音效播放保護
function playSound(audio) {
  if (!audio) return;
  try {
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function (e) {});
    }
  } catch (e) {}
}

// 輔助顏色轉換為 rgba
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return "rgba(0, 242, 254, " + alpha + ")";
  if (hex.startsWith("rgba")) return hex;
  var c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  var num = parseInt(c, 16);
  if (isNaN(num)) return "rgba(0, 242, 254, " + alpha + ")";
  var r = (num >> 16) & 255;
  var g = (num >> 8) & 255;
  var b = num & 255;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

// 判定是否為封閉循環路徑 (如循環系統)
function isCycleGame() {
  if (typeof isCycle !== 'undefined') return isCycle;
  try {
    if (typeof window !== 'undefined' && decodeURIComponent(window.location.href).includes("循環")) {
      return true;
    }
  } catch (e) {}
  return false;
}

// 正確序列目標清單與環形起點
var correctSequence = [];
var cycleStartIdx = -1;

// 啟動主入口
function start() {
  resizeCanvas();

  switch (gameType) {
    case "classify": {
      shufflePos(cards);
      setCardsPos(cards);
      enableDragging();
      enableTouchEvents();
      startTimer();
      break;
    }
    case "match": {
      numCols = Math.max(1, parseInt(Math.sqrt(cards.length)));
      numRows = Math.ceil(cards.length / numCols);
      cardWidth = (canvas.width - (numCols + 1) * hSpace) / numCols;
      cardHeight = (canvas.height - (numRows + 1) * vSpace) / numRows;

      setCardsPos(cards);
      shufflePos(cards);

      canvas.addEventListener("mousedown", clickIfMatch);
      canvas.addEventListener("touchstart", clickIfMatch, { passive: false });
      startTimer();
      break;
    }
    case "order": {
      numCols = Math.max(1, parseInt(Math.sqrt(cards.length)));
      numRows = Math.ceil(cards.length / numCols);
      cardWidth = (canvas.width - (numCols + 1) * hSpace) / numCols;
      cardHeight = (canvas.height - (numRows + 1) * vSpace) / numRows;

      setCardsPos(cards);
      shufflePos(cards);

      canvas.addEventListener("mousedown", clickIfOrder);
      canvas.addEventListener("touchstart", clickIfOrder, { passive: false });
      startTimer();
      break;
    }
  }

  // 啟用 Hover 懸停監聽
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  // 啟動 60FPS 科技風動畫主循環
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.92, 1200);
  canvas.height = Math.max(window.innerHeight * 0.72, 500);

  if (typeof categoryNames !== 'undefined' && categoryNames.length > 0) {
    answerBoxNumRows = categoryNames.length;
    answerBoxNumCols = categoryNames[0].length;
    answerBoxWidth = canvas.width / answerBoxNumCols;
    answerBoxHeight = (canvas.height * 0.65) / answerBoxNumRows;
  }
}

// 讀取卡片載入計數
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
  cards = [];
  selectedCards = [];
  correctSequence = [];
  cycleStartIdx = -1;
  cardsLoaded = 0;
  totalCardsWithImages = 0;
  allCardsHaveNoImages = true;

  if (typeof cardData === "undefined" || !cardData) return;

  for (var i = 0; i < cardData.length; i++) {
    var image = null;

    if (cardData[i]["img"]) {
      image = new Image();
      image.addEventListener("load", cardLoaded);
      image.src = cardData[i]["img"];
      totalCardsWithImages++;
      allCardsHaveNoImages = false;
    } else {
      cardLoaded();
    }

    var targetBox = 1;
    if (typeof categoryNames !== 'undefined') {
      targetBox = getArrayIdx(cardData[i]["category"], categoryNames);
    }

    // 建立具備 3D 翻轉與動態渲染特性的卡牌物件
    var cardObj = {
      id: i,
      name: cardData[i]["name"],
      element: image,
      category: cardData[i]["category"],
      targetBoxNo: targetBox,
      faceUp: cardsFacing,
      // 3D 翻牌物理屬性 (0: 正面, Math.PI: 背面)
      flipAngle: cardsFacing ? 0 : Math.PI,
      targetFlipAngle: cardsFacing ? 0 : Math.PI,
      // 消失與動效屬性
      scale: 1,
      targetScale: 1,
      alpha: 1,
      shakeTimer: 0,
      shakeIntensity: 0,
      scanProgress: 0,
      isDisappearing: false,
      glowColor: null,
      tempHint: null,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zIndex: 0
    };

    cards.push(cardObj);

    // 收集正確順序清單 (按 data.js 定義先後順序)
    if (cardData[i]["category"] === correctCategory) {
      correctSequence.push(cardObj);
    }
  }

  if (totalCardsWithImages === 0) {
    start();
  }
}

// ==========================================
// 60FPS 動畫主迴圈 (Game Loop)
// ==========================================
var lastTime = 0;
function gameLoop(timestamp) {
  var dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0.016;
  lastTime = timestamp;

  updatePhysics(dt);
  renderScene();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// 更新物理動態與特效
function updatePhysics(dt) {
  // 1. 更新卡牌 (3D 旋轉、縮放、震顫、掃描線)
  for (var i = cards.length - 1; i >= 0; i--) {
    var card = cards[i];

    // 3D 翻牌平滑插值
    var flipDiff = card.targetFlipAngle - card.flipAngle;
    if (Math.abs(flipDiff) > 0.01) {
      card.flipAngle += flipDiff * 0.18;
    } else {
      card.flipAngle = card.targetFlipAngle;
    }

    // 消失動畫 (Scale & Fade)
    if (card.isDisappearing) {
      card.scale += (0 - card.scale) * 0.15;
      card.alpha += (0 - card.alpha) * 0.15;
      if (card.scale < 0.05) {
        cards.splice(i, 1);
        continue;
      }
    } else {
      // 普通縮放平滑復原
      card.scale += (card.targetScale - card.scale) * 0.2;
    }

    // 抖動計時
    if (card.shakeTimer > 0) {
      card.shakeTimer -= dt * 60;
      if (card.shakeTimer <= 0) {
        card.shakeTimer = 0;
        card.shakeIntensity = 0;
        card.glowColor = null;
        card.tempHint = null;
      }
    }

    // 全息掃描線進度
    if (card.scanProgress > 0) {
      card.scanProgress += dt * 2.2;
      if (card.scanProgress > 1.2) {
        card.scanProgress = 0;
      }
    }
  }

  // 2. 更新粒子系統
  for (var p = particles.length - 1; p >= 0; p--) {
    var pt = particles[p];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += pt.gravity;
    pt.rotation += pt.vRot;
    pt.life -= dt;
    pt.alpha = Math.max(0, pt.life / pt.maxLife);

    if (pt.life <= 0) {
      particles.splice(p, 1);
    }
  }

  // 3. 更新浮動文字
  for (var t = floatingTexts.length - 1; t >= 0; t--) {
    var ft = floatingTexts[t];
    ft.y -= ft.speedY;
    ft.life -= dt;
    ft.alpha = Math.max(0, ft.life / ft.maxLife);

    if (ft.life <= 0) {
      floatingTexts.splice(t, 1);
    }
  }

  // 4. 勝利煙火/彩帶微粒持續噴發
  if (isGameWon) {
    winAnimationTimer += dt;
    if (particles.length < 120 && Math.random() < 0.35) {
      spawnVictoryParticle();
    }
  }
}

// 粒子產生：配對成功數位消散
function spawnDisintegrateParticles(card) {
  var count = 36;
  var cx = card.x + cardWidth / 2;
  var cy = card.y + cardHeight / 2;
  var colors = ["#00f2fe", "#4facfe", "#00ffaa", "#ffffff", "#ff2a6d"];

  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = Math.random() * 7 + 2;
    var size = Math.random() * 6 + 3;
    var life = Math.random() * 0.6 + 0.4;
    particles.push({
      x: cx + (Math.random() - 0.5) * cardWidth * 0.7,
      y: cy + (Math.random() - 0.5) * cardHeight * 0.7,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      size: size,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      life: life,
      maxLife: life,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.3,
      gravity: 0.12,
      shape: Math.random() > 0.4 ? "rect" : "circle"
    });
  }
}

// 浮動文字產生 (+100 PTS / MISMATCH)
function addFloatingText(text, x, y, color) {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    speedY: 1.6,
    color: color || "#00f2fe",
    alpha: 1,
    life: 0.9,
    maxLife: 0.9
  });
}

// 勝利煙花微粒
function spawnVictoryParticle() {
  var x = Math.random() * canvas.width;
  var y = Math.random() * (canvas.height * 0.4);
  var colors = ["#00f2fe", "#00ffaa", "#ff007f", "#ffe600", "#ffffff"];
  var color = colors[Math.floor(Math.random() * colors.length)];

  for (var i = 0; i < 20; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = Math.random() * 5 + 1;
    var life = Math.random() * 0.9 + 0.6;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      size: Math.random() * 5 + 2,
      color: color,
      alpha: 1,
      life: life,
      maxLife: life,
      rotation: 0,
      vRot: (Math.random() - 0.5) * 0.2,
      gravity: 0.08,
      shape: "rect"
    });
  }
}

// ==========================================
// 渲染主場景
// ==========================================
function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. 繪製科技背景微網格 (Cyber Grid)
  drawCyberGrid();

  // 2. 答案框 (分類模式)
  if (gameType === "classify") {
    drawAnswerBox();
  }

  // 3. 繪製順序遊戲的動態能量流動線 (Order Energy Stream)
  if (gameType === "order") {
    drawOrderEnergyPath();
  }

  // 4. 排序卡牌並繪製 (處理拖曳重疊)
  var sortedCards = cards.slice().sort(function (a, b) {
    return (a.zIndex || 0) - (b.zIndex || 0);
  });

  for (var i = 0; i < sortedCards.length; i++) {
    drawCardSciFi(sortedCards[i]);
  }

  // 5. 繪製順序遊戲的頂部路徑狀態 HUD
  if (gameType === "order") {
    drawOrderProgressHUD();
  }

  // 6. 繪製所有粒子
  drawParticles();

  // 7. 繪製浮動文字
  drawFloatingTexts();

  // 8. 繪製勝利 HUD
  if (isGameWon) {
    drawVictoryHUD();
  }
}

// 科技風背景網格
function drawCyberGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(0, 242, 254, 0.04)";
  ctx.lineWidth = 1;
  var gridSize = 40;

  for (var x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (var y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ==========================================
// 順序遊戲特有：流光能量引導線與狀態 HUD
// ==========================================
function drawOrderEnergyPath() {
  if (selectedCards.length < 2) return;

  ctx.save();
  var animOffset = -Date.now() * 0.035;

  for (var i = 0; i < selectedCards.length - 1; i++) {
    var from = selectedCards[i];
    var to = selectedCards[i + 1];

    var fx = from.x + cardWidth / 2;
    var fy = from.y + cardHeight / 2;
    var tx = to.x + cardWidth / 2;
    var ty = to.y + cardHeight / 2;

    // 底層青藍霓虹能量光柱
    ctx.strokeStyle = "rgba(0, 242, 254, 0.3)";
    ctx.lineWidth = 8;
    ctx.shadowColor = "#00f2fe";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // 核心亮白流動脈衝虛線 (Animated Pulse Stream)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 0;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = animOffset;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // 箭頭指示
    drawArrow(ctx, fx, fy, tx, ty);
  }

  // 若通關且為循環系統，閉合回路
  if (isGameWon && isCycleGame() && selectedCards.length === correctSequence.length) {
    var last = selectedCards[selectedCards.length - 1];
    var first = selectedCards[0];
    var fx = last.x + cardWidth / 2;
    var fy = last.y + cardHeight / 2;
    var tx = first.x + cardWidth / 2;
    var ty = first.y + cardHeight / 2;

    ctx.strokeStyle = "rgba(0, 255, 170, 0.4)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#00ffaa";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    drawArrow(ctx, fx, fy, tx, ty);
  }

  ctx.restore();
}

// 輔助繪製箭頭
function drawArrow(c, fromX, fromY, toX, toY) {
  var midX = (fromX + toX) / 2;
  var midY = (fromY + toY) / 2;
  var angle = Math.atan2(toY - fromY, toX - fromX);
  var arrowLen = 10;

  c.save();
  c.translate(midX, midY);
  c.rotate(angle);
  c.fillStyle = "#00f2fe";
  c.shadowColor = "#00f2fe";
  c.shadowBlur = 8;
  c.beginPath();
  c.moveTo(arrowLen, 0);
  c.lineTo(-arrowLen, -arrowLen * 0.7);
  c.lineTo(-arrowLen * 0.4, 0);
  c.lineTo(-arrowLen, arrowLen * 0.7);
  c.closePath();
  c.fill();
  c.restore();
}

// 順序遊戲進度 HUD 狀態條
function drawOrderProgressHUD() {
  if (correctSequence.length === 0) return;

  ctx.save();
  var total = correctSequence.length;
  var current = selectedCards.length;

  // 頂部小標籤
  ctx.fillStyle = "rgba(10, 20, 38, 0.85)";
  ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
  ctx.lineWidth = 1;
  ctx.fillRect(10, 10, 280, 36);
  ctx.strokeRect(10, 10, 280, 36);

  ctx.fillStyle = "#00f2fe";
  ctx.font = "bold 14px 'Orbitron', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SEQUENCE: " + current + " / " + total, 22, 33);

  // 進度小光條
  var barWidth = 90;
  var progressRatio = total > 0 ? (current / total) : 0;
  ctx.fillStyle = "rgba(0, 242, 254, 0.2)";
  ctx.fillRect(190, 22, barWidth, 12);
  ctx.fillStyle = "#00ffaa";
  ctx.shadowColor = "#00ffaa";
  ctx.shadowBlur = 6;
  ctx.fillRect(190, 22, barWidth * progressRatio, 12);

  ctx.restore();
}

// 酷炫科技風卡牌繪製 (支援 3D 翻牌、HUD 切角、序號徽章)
function drawCardSciFi(card) {
  var isSelected = selectedCards.includes(card);
  var isHovered = (hoveredCard === card && !card.isDisappearing);

  ctx.save();

  // 計算 3D 翻牌透視縮放: cos(flipAngle)
  var cosA = Math.cos(card.flipAngle);
  var isFace = cosA >= 0;

  // 計算中心與震顫偏移
  var shakeX = 0;
  if (card.shakeTimer > 0) {
    shakeX = Math.sin(card.shakeTimer * 1.5) * card.shakeIntensity;
  }

  var cx = card.x + cardWidth / 2 + shakeX;
  var cy = card.y + cardHeight / 2 - (isHovered ? 4 : 0);

  ctx.translate(cx, cy);
  var scaleX = Math.max(0.02, Math.abs(cosA)) * card.scale;
  var scaleY = (isHovered ? 1.03 : 1.0) * card.scale;
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = Math.max(0, Math.min(1, card.alpha));

  var w = cardWidth;
  var h = cardHeight;
  var x0 = -w / 2;
  var y0 = -h / 2;
  var bevel = 10;

  // 決定邊框與發光色
  var neonColor = cardBorderColor || "#00f2fe";
  if (card.glowColor) {
    neonColor = card.glowColor;
  } else if (isSelected) {
    // 順序模式下被依序點中的卡牌呈現翠綠激活能量
    neonColor = (gameType === "order") ? "#00ffaa" : "#ff007f";
  } else if (isHovered) {
    neonColor = "#00ffcc";
  }

  ctx.shadowColor = neonColor;
  ctx.shadowBlur = isSelected ? 18 : (isHovered ? 14 : 7);

  // 1. 卡片底色
  var bgGrad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  if (isFace) {
    if (isSelected) {
      if (gameType === "order") {
        bgGrad.addColorStop(0, "rgba(8, 45, 35, 0.95)");
        bgGrad.addColorStop(1, "rgba(4, 25, 20, 0.95)");
      } else {
        bgGrad.addColorStop(0, "rgba(50, 10, 30, 0.95)");
        bgGrad.addColorStop(1, "rgba(25, 5, 18, 0.95)");
      }
    } else {
      bgGrad.addColorStop(0, cardFillColor || "#0f1c30");
      bgGrad.addColorStop(1, "#070e1c");
    }
  } else {
    bgGrad.addColorStop(0, cardBackFillColor || "#0a101d");
    bgGrad.addColorStop(1, "#04070e");
  }

  ctx.fillStyle = bgGrad;
  drawBeveledRect(ctx, x0, y0, w, h, bevel);
  ctx.fill();

  // 2. 邊框
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = isSelected ? 3.5 : (isHovered ? 2.5 : cardBorderWidth);
  drawBeveledRect(ctx, x0, y0, w, h, bevel);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // 3. 繪製正面或背面內容
  if (isFace) {
    if (card.element && card.element.complete) {
      ctx.drawImage(card.element, x0 + 6, y0 + 6, w - 12, h - 12);
      ctx.fillStyle = "rgba(4, 8, 16, 0.8)";
      ctx.fillRect(x0 + 6, y0 + h * 0.68, w - 12, h * 0.28);
    }

    ctx.fillStyle = cardFontColor || "#ffffff";
    var fontSize = Math.max(14, fontRatio * w);
    if (card.name && card.name.length > maxLength) {
      fontSize *= (maxLength / card.name.length);
    }
    ctx.font = "bold " + fontSize + "px 'Orbitron', 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 8;
    var textY = card.element ? (y0 + h * 0.82) : 0;
    ctx.fillText(card.name, 0, textY);
    ctx.shadowBlur = 0;

    // 答錯時顯示分類提示
    if (card.tempHint) {
      ctx.fillStyle = "#ff2a6d";
      ctx.font = "bold 13px 'Orbitron', 'Noto Sans TC', sans-serif";
      ctx.fillText("[" + card.tempHint + "]", 0, textY - fontSize - 2);
    }

    // 全息雷射掃描線
    if (card.scanProgress > 0 && card.scanProgress <= 1.0) {
      var scanY = y0 + h * card.scanProgress;
      var scanGrad = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 4);
      scanGrad.addColorStop(0, "rgba(0, 242, 254, 0)");
      scanGrad.addColorStop(0.7, "rgba(0, 242, 254, 0.6)");
      scanGrad.addColorStop(1, "rgba(255, 255, 255, 0.9)");

      ctx.fillStyle = scanGrad;
      ctx.fillRect(x0 + 4, scanY - 10, w - 8, 12);
    }

    // ==========================================
    // 順序模式：繪製發光的序號徽章 (#01, #02, #03...)
    // ==========================================
    if (gameType === "order" && isSelected) {
      var stepNum = selectedCards.indexOf(card) + 1;
      drawSequenceBadge(ctx, x0 + w - 18, y0 + 18, stepNum);
    }
  } else {
    drawChipCircuitBack(ctx, x0, y0, w, h, neonColor);
  }

  // 4. 四角 HUD 科技角標
  drawHUDCorners(ctx, x0, y0, w, h, neonColor);

  ctx.restore();
}

// 繪製順序徽章
function drawSequenceBadge(c, bx, by, step) {
  c.save();
  c.fillStyle = "#00ffaa";
  c.shadowColor = "#00ffaa";
  c.shadowBlur = 10;
  c.beginPath();
  c.arc(bx, by, 14, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = "#05111b";
  c.font = "bold 12px 'Orbitron', monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.shadowBlur = 0;
  var stepStr = step < 10 ? "0" + step : "" + step;
  c.fillText(stepStr, bx, by + 1);
  c.restore();
}

// 繪製科技切角矩形
function drawBeveledRect(c, x, y, w, h, b) {
  c.beginPath();
  c.moveTo(x + b, y);
  c.lineTo(x + w - b, y);
  c.lineTo(x + w, y + b);
  c.lineTo(x + w, y + h - b);
  c.lineTo(x + w - b, y + h);
  c.lineTo(x + b, y + h);
  c.lineTo(x, y + h - b);
  c.lineTo(x, y + b);
  c.closePath();
}

// 背面電路板紋理
function drawChipCircuitBack(c, x, y, w, h, accentColor) {
  c.save();
  c.strokeStyle = hexToRgba(accentColor, 0.35);
  c.lineWidth = 1.5;

  var coreSize = Math.min(w, h) * 0.22;
  c.strokeRect(-coreSize / 2, -coreSize / 2, coreSize, coreSize);

  c.beginPath();
  c.moveTo(-coreSize / 2, 0); c.lineTo(x + 15, 0);
  c.moveTo(coreSize / 2, 0);  c.lineTo(x + w - 15, 0);
  c.moveTo(0, -coreSize / 2); c.lineTo(0, y + 15);
  c.moveTo(0, coreSize / 2);  c.lineTo(0, y + h - 15);
  c.stroke();

  c.fillStyle = hexToRgba(accentColor, 0.6);
  c.font = "bold 11px 'Orbitron', monospace";
  c.textAlign = "center";
  c.fillText("SYSTEM", 0, 4);

  c.restore();
}

// 四角 HUD 括號
function drawHUDCorners(c, x, y, w, h, color) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 2.5;
  var len = Math.min(w, h) * 0.15;

  c.beginPath();
  c.moveTo(x, y + len); c.lineTo(x, y); c.lineTo(x + len, y);
  c.stroke();

  c.beginPath();
  c.moveTo(x + w - len, y); c.lineTo(x + w, y); c.lineTo(x + w, y + len);
  c.stroke();

  c.beginPath();
  c.moveTo(x, y + h - len); c.lineTo(x, y + h); c.lineTo(x + len, y + h);
  c.stroke();

  c.beginPath();
  c.moveTo(x + w - len, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y + h - len);
  c.stroke();

  c.restore();
}

// 答案框繪製 (分類模式)
function drawAnswerBox() {
  if (typeof categoryNames === 'undefined' || !categoryNames.length) return;

  for (var i = 0; i < answerBoxNumRows; i++) {
    for (var j = 0; j < categoryNames[i].length; j++) {
      var bx = j * answerBoxWidth;
      var by = i * answerBoxHeight;

      ctx.save();
      ctx.fillStyle = "rgba(14, 25, 46, 0.65)";
      ctx.fillRect(bx + 4, by + 4, answerBoxWidth - 8, answerBoxHeight - 8);

      ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 4, by + 4, answerBoxWidth - 8, answerBoxHeight - 8);

      ctx.fillStyle = "#00f2fe";
      ctx.font = "bold 20px 'Orbitron', 'Noto Sans TC', sans-serif";
      ctx.shadowColor = "#00f2fe";
      ctx.shadowBlur = 6;
      ctx.fillText(categoryNames[i][j], bx + 16, by + 34);
      ctx.restore();
    }
  }
}

// 繪製粒子
function drawParticles() {
  ctx.save();
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// 繪製浮動文字
function drawFloatingTexts() {
  ctx.save();
  for (var i = 0; i < floatingTexts.length; i++) {
    var ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 10;
    ctx.font = "bold 24px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
  ctx.restore();
}

// 勝利 HUD 繪製
function drawVictoryHUD() {
  ctx.save();
  ctx.fillStyle = "rgba(4, 8, 16, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "900 60px 'Orbitron', sans-serif";
  ctx.fillStyle = "#00f2fe";
  ctx.shadowColor = "#00f2fe";
  ctx.shadowBlur = 25;
  ctx.fillText("MISSION COMPLETE", canvas.width / 2, canvas.height * 0.42);

  ctx.font = "bold 28px 'Orbitron', 'Noto Sans TC', sans-serif";
  ctx.fillStyle = "#00ffaa";
  ctx.shadowColor = "#00ffaa";
  ctx.shadowBlur = 12;
  ctx.fillText("路徑全線貫通 · 任務成功", canvas.width / 2, canvas.height * 0.54);

  ctx.font = "20px 'Orbitron', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.fillText("FINAL SCORE: " + score + "   |   TIME: " + timerSeconds + "s", canvas.width / 2, canvas.height * 0.63);

  ctx.restore();
}

// ==========================================
// 點擊與遊戲邏輯
// ==========================================

// 滑鼠移動 Hover 判定
function onMouseMove(event) {
  var rect = canvas.getBoundingClientRect();
  var mouseX = event.clientX - rect.left;
  var mouseY = event.clientY - rect.top;

  var found = checkClickedCard(mouseX, mouseY);
  if (found !== hoveredCard) {
    hoveredCard = found;
  }
}

function onMouseLeave() {
  hoveredCard = null;
}

// 配對點擊
function clickIfMatch(event) {
  if (isProcessingClick) return;

  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var selected = checkClickedCard(mouseX, mouseY);

  if (!selected) return;

  // 點擊彈跳回饋 (Pulse) 與雷射掃描
  selected.targetScale = 1.06;
  setTimeout(function() { if (selected) selected.targetScale = 1.0; }, 140);
  selected.scanProgress = 0.05;

  // 翻轉卡片 (若是背面，執行 3D 翻牌)
  if (selected.targetFlipAngle !== 0) {
    selected.targetFlipAngle = 0;
  }

  // 判斷是否已被選取
  if (!selectedCards.includes(selected) && selectedCards.length < 2) {
    addToSelectedCards(selected, selectedCards);
  } else {
    return;
  }

  // 選中兩張牌開始驗證
  if (selectedCards.length === 2) {
    handleMatchingCards();
  }
}

// 處理卡牌配對
function handleMatchingCards() {
  if (selectedCards.length !== 2) return;
  isProcessingClick = true;

  var card1 = selectedCards[0];
  var card2 = selectedCards[1];

  if (card1.category === card2.category) {
    playSound(correctSound);
    score += correctScore;
    if (scoreElement) scoreElement.innerText = "SCORE: " + score;

    spawnDisintegrateParticles(card1);
    spawnDisintegrateParticles(card2);

    addFloatingText("+100 PTS", (card1.x + cardWidth / 2), card1.y, "#00ffaa");
    addFloatingText("MATCH!", (card2.x + cardWidth / 2), card2.y, "#00f2fe");

    card1.isDisappearing = true;
    card2.isDisappearing = true;

    selectedCards = [];

    setTimeout(function () {
      isProcessingClick = false;
      var remaining = cards.filter(c => !c.isDisappearing);
      if (remaining.length === 0) {
        youWin();
      }
    }, 450);
  } else {
    playSound(wrongSound);
    score = Math.max(0, score - wrongScore);
    if (scoreElement) scoreElement.innerText = "SCORE: " + score;

    card1.glowColor = "#ff2a6d";
    card2.glowColor = "#ff2a6d";
    card1.shakeTimer = 22;
    card1.shakeIntensity = 8;
    card2.shakeTimer = 22;
    card2.shakeIntensity = 8;
    card1.tempHint = card1.category;
    card2.tempHint = card2.category;

    addFloatingText("MISMATCH", (card1.x + cardWidth / 2), card1.y, "#ff2a6d");

    setTimeout(function () {
      if (!cardsFacing) {
        card1.targetFlipAngle = Math.PI;
        card2.targetFlipAngle = Math.PI;
      }
      card1.glowColor = null;
      card2.glowColor = null;
      card1.tempHint = null;
      card2.tempHint = null;
      selectedCards = [];
      isProcessingClick = false;
    }, 700);
  }
}

// ==========================================
// 順序點擊 (Order / Sorting) 升級實作
// ==========================================
function clickIfOrder(event) {
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var selected = checkClickedCard(mouseX, mouseY);
  if (!selected) return;

  // 1. 撤銷功能 (Undo)：如果點擊已選序列中的「最後一張」，則取消上一步
  if (selectedCards.length > 0 && selectedCards[selectedCards.length - 1] === selected) {
    selectedCards.pop();
    selected.glowColor = null;
    addFloatingText("STEP UNDONE", selected.x + cardWidth / 2, selected.y, "#f59e0b");
    if (selectedCards.length === 0) {
      cycleStartIdx = -1;
    }
    return;
  }

  // 已經在序列中且不是最後一張，忽略
  if (selectedCards.includes(selected)) {
    return;
  }

  // 2. 驗證新點擊的卡片是否為正確的下一張
  handleOrderingCardClick(selected);
}

function handleOrderingCardClick(selected) {
  var isCyclic = isCycleGame();
  var targetCount = correctSequence.length;

  // 檢查是否已完成
  if (selectedCards.length === targetCount) return;

  // 檢查該卡牌是否在正確順序項目中
  var seqIndex = correctSequence.findIndex(function (c) {
    return c.name === selected.name && c.category === correctCategory;
  });

  // 如果根本不是正確分類 (干擾項，如肝臟、唾腺)
  if (seqIndex === -1) {
    triggerOrderError(selected, "NOT IN PATH");
    return;
  }

  // 判定是否為正確的下一張
  var isNextCorrect = false;

  if (selectedCards.length === 0) {
    // 點第一張：
    if (isCyclic) {
      // 循環系統：可從任意節點起跑！
      cycleStartIdx = seqIndex;
      isNextCorrect = true;
    } else {
      // 線性系統：必須從第 0 張起點開始
      if (seqIndex === 0) {
        isNextCorrect = true;
      } else {
        triggerOrderError(selected, "START WITH " + correctSequence[0].name);
        return;
      }
    }
  } else {
    // 點後續卡片：
    var expectedSeqIdx;
    if (isCyclic) {
      expectedSeqIdx = (cycleStartIdx + selectedCards.length) % targetCount;
    } else {
      expectedSeqIdx = selectedCards.length;
    }

    if (seqIndex === expectedSeqIdx) {
      isNextCorrect = true;
    }
  }

  if (isNextCorrect) {
    // === 點對了 ===
    playSound(correctSound);
    score += correctScore;
    if (scoreElement) scoreElement.innerText = "SCORE: " + score;

    selectedCards.push(selected);
    selected.scanProgress = 0.05;
    selected.targetScale = 1.08;
    setTimeout(function () { selected.targetScale = 1.0; }, 150);

    var stepNum = selectedCards.length;
    addFloatingText("#" + (stepNum < 10 ? "0" + stepNum : stepNum) + " CONNECTED", selected.x + cardWidth / 2, selected.y, "#00ffaa");

    // 檢查是否全部完成
    if (selectedCards.length === targetCount) {
      stopTimer();
      setTimeout(function () {
        youWin();
      }, 500);
    }
  } else {
    // === 點錯了順序 ===
    triggerOrderError(selected, "WRONG SEQUENCE");
  }
}

// 順序錯誤視覺回饋 (不破壞已完成序列)
function triggerOrderError(card, reasonText) {
  playSound(wrongSound);
  score = Math.max(0, score - wrongScore);
  if (scoreElement) scoreElement.innerText = "SCORE: " + score;

  card.glowColor = "#ff2a6d";
  card.shakeTimer = 22;
  card.shakeIntensity = 8;
  addFloatingText(reasonText, card.x + cardWidth / 2, card.y, "#ff2a6d");

  setTimeout(function () {
    card.glowColor = null;
  }, 450);
}

// 相容舊函式
function handleOrderingCards() {}

// 拖曳模式 (Classify)
function startDrag(event) {
  var rect = canvas.getBoundingClientRect();
  var { mouseX, mouseY } = getMouseCoordinates(event, rect);
  var { selected, highestZIndex } = checkClickedOverlapedCard(mouseX, mouseY);

  if (selected) {
    selectedcard = selected;
    offsetX = mouseX - selected.x;
    offsetY = mouseY - selected.y;
    selectedcard.zIndex = highestZIndex + 1;
    selectedcard.targetScale = 1.06;
    selectedcard.glowColor = "#00f2fe";
  }
}

function drag(event) {
  if (selectedcard) {
    var rect = canvas.getBoundingClientRect();
    var { mouseX, mouseY } = getMouseCoordinatesMoving(event, rect);
    adjustCardPosition(mouseX - offsetX, mouseY - offsetY);
    bringSelectedCardToTopLevel();
  }
}

function endDrag() {
  if (selectedcard) {
    selectedcard.targetScale = 1.0;
    selectedcard.glowColor = null;
    selectedcard = null;
  }
}

function adjustCardPosition(newcardX, newcardY) {
  if (newcardX < 0) newcardX = 0;
  else if (newcardX + cardWidth > canvas.width) newcardX = canvas.width - cardWidth;

  if (newcardY < 0) newcardY = 0;
  else if (newcardY + cardHeight > canvas.height) newcardY = canvas.height - cardHeight;

  selectedcard.x = newcardX;
  selectedcard.y = newcardY;
}

function bringSelectedCardToTopLevel() {
  var highestZIndex = -1;
  for (var i = 0; i < cards.length; i++) {
    var zIndex = cards[i].zIndex || 0;
    if (zIndex > highestZIndex) highestZIndex = zIndex;
  }
  selectedcard.zIndex = highestZIndex + 1;
}

function enableDragging() {
  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", drag);
  canvas.addEventListener("mouseup", endDrag);
}

function enableTouchEvents() {
  canvas.addEventListener("touchstart", startDrag, { passive: false });
  canvas.addEventListener("touchmove", drag, { passive: false });
  canvas.addEventListener("touchend", endDrag, { passive: false });
}

// 分類檢查
function checkCardsPlacement() {
  var checkScore = 0;
  var wrongcards = [];

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var boxIndex = card.targetBoxNo - 1;
    var boxX = (boxIndex % answerBoxNumCols) * answerBoxWidth;
    var boxY = parseInt(boxIndex / answerBoxNumCols) * answerBoxHeight;
    var tolerance = answerBoxWidth / 10;

    if (
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + answerBoxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + answerBoxHeight
    ) {
      checkScore++;
      card.glowColor = "#00ffaa";
      setTimeout(function(c){ c.glowColor = null; }, 1000, card);
    } else {
      wrongcards.push(card);
    }
  }

  score = checkScore * correctScore;
  if (scoreElement) scoreElement.innerText = "SCORE: " + score;

  if (wrongcards.length > 0) {
    playSound(wrongSound);
    for (var w = 0; w < wrongcards.length; w++) {
      wrongcards[w].glowColor = "#ff2a6d";
      wrongcards[w].shakeTimer = 20;
      wrongcards[w].shakeIntensity = 8;
    }
    slideWrongcards(wrongcards);
  } else if (checkScore === cards.length && cards.length > 0) {
    playSound(correctSound);
    stopTimer();
    youWin();
  } else if (checkScore > 0) {
    playSound(correctSound);
  }
}

// 分類模式洗牌函式
function shake() {
  shuffle(cards);
  var wrongcards = [];

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var boxIndex = card.targetBoxNo - 1;
    var boxX = (boxIndex % answerBoxNumCols) * answerBoxWidth;
    var boxY = parseInt(boxIndex / answerBoxNumCols) * answerBoxHeight;
    var tolerance = answerBoxWidth / 10;

    if (
      card.x + tolerance >= boxX &&
      card.x + cardWidth - tolerance <= boxX + answerBoxWidth &&
      card.y + tolerance >= boxY &&
      card.y + cardHeight - tolerance <= boxY + answerBoxHeight
    ) {
      // 在正確答案框內保留
    } else {
      wrongcards.push(card);
    }
  }

  if (wrongcards.length > 0) {
    setCardsPos(wrongcards);
  }
}

// 通用輔助函式
function getMouseCoordinates(event, rect) {
  var mouseX, mouseY;
  if (event.type && event.type.startsWith("touch")) {
    var touch = event.touches[0] || (event.changedTouches && event.changedTouches[0]);
    mouseX = (touch ? touch.clientX : 0) - rect.left;
    mouseY = (touch ? touch.clientY : 0) - rect.top;
  } else {
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }
  return { mouseX: mouseX, mouseY: mouseY };
}

function getMouseCoordinatesMoving(event, rect) {
  return getMouseCoordinates(event, rect);
}

function checkClickedCard(mouseX, mouseY) {
  for (var i = cards.length - 1; i >= 0; i--) {
    var card = cards[i];
    if (
      !card.isDisappearing &&
      mouseX >= card.x &&
      mouseX <= card.x + cardWidth &&
      mouseY >= card.y &&
      mouseY <= card.y + cardHeight
    ) {
      return card;
    }
  }
  return null;
}

function checkClickedOverlapedCard(mouseX, mouseY) {
  var highestZIndex = -1;
  var selected = null;
  for (var i = cards.length - 1; i >= 0; i--) {
    var card = cards[i];
    if (
      !card.isDisappearing &&
      mouseX >= card.x &&
      mouseX <= card.x + cardWidth &&
      mouseY >= card.y &&
      mouseY <= card.y + cardHeight
    ) {
      var zIndex = card.zIndex || 0;
      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
        selected = card;
      }
    }
  }
  return { selected: selected, highestZIndex: highestZIndex };
}

function addToSelectedCards(selected, selectedList) {
  if (selected && !selectedList.includes(selected)) {
    selectedList.push(selected);
  }
}

function getArrayIdx(val, arr) {
  for (var i = 0; i < arr.length; i++) {
    for (var j = 0; j < arr[i].length; j++) {
      if (arr[i][j] === val) return i * arr[i].length + j + 1;
    }
  }
  return 1;
}

function getCardIdx(card) {
  return cards.indexOf(card);
}

function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function shufflePos(cardsArr) {
  var positions = [];
  for (var i = 0; i < cardsArr.length; i++) {
    positions.push({ x: cardsArr[i].x, y: cardsArr[i].y });
  }
  shuffle(positions);
  for (var j = 0; j < cardsArr.length; j++) {
    cardsArr[j].x = positions[j].x;
    cardsArr[j].y = positions[j].y;
  }
}

function setCardsPos(cardsArr) {
  cardsArr.forEach(function (card, index) {
    var col = index % numCols;
    var row = (cardsArrangementType === "row") ? 0 : Math.floor(index / numCols);
    card.x = cardsX + col * (cardWidth + hSpace);
    card.y = cardsY + row * (cardHeight + vSpace);
  });
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerSeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(function () {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  var timerElement = document.getElementById("timer");
  if (timerElement) {
    var min = Math.floor(timerSeconds / 60);
    var sec = timerSeconds % 60;
    timerElement.innerText = "TIME: " + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
  }
}

// 錯誤卡片滑動動畫
function animateSlide(card, targetX, targetY) {
  var startX = card.x;
  var startY = card.y;
  var duration = 400;
  var startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var ease = 1 - Math.pow(1 - progress, 3);

    card.x = startX + (targetX - startX) * ease;
    card.y = startY + (targetY - startY) * ease;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function slideWrongcards(wrongcards) {
  for (var i = 0; i < wrongcards.length; i++) {
    var card = wrongcards[i];
    var targetX = cardsX + (numCols - 1) * (cardWidth + hSpace);
    var targetY = cardsY + (numRows - 1) * (cardHeight + vSpace);
    animateSlide(card, targetX, targetY);
  }
}

// 相容舊函式
function drawCards(c) {}
function redrawCanvas() {}

// 通關勝利
function youWin() {
  stopTimer();
  isGameWon = true;
  winAnimationTimer = 0;
}

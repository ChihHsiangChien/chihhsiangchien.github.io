(() => {
  'use strict';

  const canvas = document.getElementById('galtonBoard');
  const ctx = canvas.getContext('2d');

  const ballCountSlider = document.getElementById('ballCount');
  const rowsSlider = document.getElementById('rowsSlider');
  const biasSlider = document.getElementById('biasSlider');
  const lblBalls = document.getElementById('lbl-balls');
  const lblRows = document.getElementById('lbl-rows');
  const lblBias = document.getElementById('lbl-bias');

  const valSettled = document.getElementById('val-settled');
  const valMean = document.getElementById('val-mean');
  const valStd = document.getElementById('val-std');

  const btnStart = document.getElementById('startSimulation');
  const btnSpeed = document.getElementById('btn-speed');
  const btnReset = document.getElementById('btn-reset');
  const btnCurve = document.getElementById('btn-curve');

  // --- State ---
  let width = 800;
  let height = 560;
  let rows = 12;
  let targetBalls = 300;
  let rightBias = 0.5;
  let showCurve = true;
  let speedMult = 1;
  const SPEED_STEPS = [1, 2, 4];
  let speedIdx = 0;

  let pins = [];
  let pinsByRow = [];
  let balls = [];
  let bins = [];
  let spawnQueue = 0;
  let totalSettled = 0;
  let rafId = null;
  let lastTs = 0;

  // Layout metrics computed from canvas size & rows
  let boardLayout = {
    funnelY: 36,
    pegStartY: 70,
    pegEndY: 330,
    floorY: 540,
    pegSpacingX: 28,
    pegSpacingY: 22,
    pegRadius: 3.5,
    ballRadius: 4.5,
    leftEdge: 100,
    binWidth: 28,
    binCount: 13
  };

  function computeLayout() {
    const binCount = rows + 1;
    const maxW = Math.min(width - 40, 760);
    const pegAreaH = height * 0.48;
    const pegSpacingX = Math.min(36, maxW / (binCount + 1));
    const pegSpacingY = Math.min(30, pegAreaH / Math.max(1, rows));
    const totalW = binCount * pegSpacingX;
    const leftEdge = (width - totalW) / 2;

    boardLayout = {
      funnelY: Math.max(18, Math.max(52, height * 0.12) - pegSpacingY * 0.75),
      pegStartY: Math.max(52, height * 0.12),
      pegEndY: Math.max(52, height * 0.12) + rows * pegSpacingY,
      floorY: height - 18,
      pegSpacingX,
      pegSpacingY,
      pegRadius: Math.max(2.5, Math.min(4.5, pegSpacingX * 0.13)),
      ballRadius: Math.max(3, Math.min(5.2, pegSpacingX * 0.15)),
      leftEdge,
      binWidth: pegSpacingX,
      binCount
    };

    // Left & right angled side baffles strictly parallel to the peg triangle (1.0 * pegSpacingX clearance)
    const baffleTopY = boardLayout.pegStartY - pegSpacingY * 0.5;
    const baffleMidY = boardLayout.pegStartY + (rows - 1) * pegSpacingY + pegSpacingY * 0.5;
    const baffleBotY = boardLayout.pegEndY + 14;
    const topOffset = pegSpacingX * 0.85;
    const midOffset = ((rows - 1) / 2 + 1.1) * pegSpacingX;
    boardLayout.leftBaffles = [
      { x1: width / 2 - topOffset, y1: baffleTopY, x2: width / 2 - midOffset, y2: baffleMidY },
      { x1: width / 2 - midOffset, y1: baffleMidY, x2: leftEdge, y2: baffleBotY }
    ];
    boardLayout.rightBaffles = [
      { x1: width / 2 + topOffset, y1: baffleTopY, x2: width / 2 + midOffset, y2: baffleMidY },
      { x1: width / 2 + midOffset, y1: baffleMidY, x2: leftEdge + binCount * pegSpacingX, y2: baffleBotY }
    ];

    pins = [];
    pinsByRow = [];
    for (let r = 0; r < rows; r++) {
      const colsInRow = r + 1;
      const rowWidth = (colsInRow - 1) * pegSpacingX;
      const startX = width / 2 - rowWidth / 2;
      const y = boardLayout.pegStartY + r * pegSpacingY;
      const rowArr = [];
      for (let c = 0; c < colsInRow; c++) {
        const pin = { x: startX + c * pegSpacingX, y, row: r };
        pins.push(pin);
        rowArr.push(pin);
      }
      pinsByRow.push(rowArr);
    }
  }

  function resetBoard() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    balls = [];
    spawnQueue = 0;
    totalSettled = 0;
    computeLayout();
    bins = new Array(boardLayout.binCount).fill(0);
    updateStats();
    draw();
  }

  function spawnOneBall(x = width / 2 + (Math.random() - 0.5) * 3, y = boardLayout.funnelY) {
    balls.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: 12,
      settled: false
    });
  }

  function updateStats() {
    const total = totalSettled + balls.filter((b) => !b.settled).length + spawnQueue;
    valSettled.textContent = `${totalSettled} / ${total}`;

    if (totalSettled === 0) {
      valMean.textContent = '—';
      valStd.textContent = '—';
      return;
    }

    let sum = 0;
    for (let i = 0; i < bins.length; i++) sum += i * bins[i];
    const mean = sum / totalSettled;

    let sqDiff = 0;
    for (let i = 0; i < bins.length; i++) sqDiff += bins[i] * Math.pow(i - mean, 2);
    const std = Math.sqrt(sqDiff / totalSettled);

    valMean.textContent = mean.toFixed(2);
    valStd.textContent = std.toFixed(2);
  }

  function stepSimulation(dt) {
    // Emit queued balls smoothly
    if (spawnQueue > 0) {
      const batch = Math.min(spawnQueue, Math.max(1, Math.round(speedMult * 2)));
      for (let i = 0; i < batch; i++) {
        spawnOneBall();
        spawnQueue--;
      }
    }

    const subSteps = 3;
    const subDt = dt / subSteps;
    const gravityY = 580;
    const gravityX = (rightBias - 0.5) * 240; // Real lateral tilt when p != 0.5
    const restitution = 0.32;
    const { pegStartY, pegSpacingY, pegRadius, leftEdge, binWidth, binCount, floorY, ballRadius, leftBaffles, rightBaffles } = boardLayout;
    const binTopY = boardLayout.pegEndY + 14;
    const hitDist = ballRadius + pegRadius;
    const hitDistSq = hitDist * hitDist;

    const collideSegment = (b, seg) => {
      const sdx = seg.x2 - seg.x1;
      const sdy = seg.y2 - seg.y1;
      const lenSq = sdx * sdx + sdy * sdy || 1;
      const t = Math.max(0, Math.min(1, ((b.x - seg.x1) * sdx + (b.y - seg.y1) * sdy) / lenSq));
      const cx = seg.x1 + t * sdx;
      const cy = seg.y1 + t * sdy;
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dSq = dx * dx + dy * dy;
      if (dSq < ballRadius * ballRadius) {
        const dist = Math.sqrt(dSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;
        b.x += nx * (ballRadius - dist);
        b.y += ny * (ballRadius - dist);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= (1 + restitution) * vn * nx;
          b.vy -= (1 + restitution) * vn * ny;
        }
      }
    };

    for (let step = 0; step < subSteps; step++) {
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (b.settled) continue;

        b.vx += gravityX * subDt;
        b.vy += gravityY * subDt;
        b.vx *= 0.992;
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // Real 2D circle-to-peg collision (only check nearby peg rows for O(1) speed)
        const approxRow = Math.round((b.y - pegStartY) / pegSpacingY);
        const rStart = Math.max(0, approxRow - 1);
        const rEnd = Math.min(rows - 1, approxRow + 1);

        for (let r = rStart; r <= rEnd; r++) {
          const rowPins = pinsByRow[r];
          if (!rowPins) continue;
          for (let p = 0; p < rowPins.length; p++) {
            const pin = rowPins[p];
            const dx = b.x - pin.x;
            const dy = b.y - pin.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < hitDistSq) {
              const dist = Math.sqrt(dSq) || 0.001;
              let nx = dx / dist;
              let ny = dy / dist;

              // Separate ball out of peg
              const overlap = hitDist - dist;
              b.x += nx * overlap;
              b.y += ny * overlap;

              // Tiny natural micro-jitter if hitting dead-center apex
              if (Math.abs(nx) < 0.08 && ny < 0) {
                nx += (Math.random() < rightBias ? 1 : -1) * (0.08 + Math.random() * 0.08);
                const len = Math.hypot(nx, ny);
                nx /= len;
                ny /= len;
              }

              // Reflect velocity along collision normal
              const vn = b.vx * nx + b.vy * ny;
              if (vn < 0) {
                b.vx -= (1 + restitution) * vn * nx;
                b.vy -= (1 + restitution) * vn * ny;
              }
            }
          }
        }

        // Collide with left & right angled side baffles
        for (const seg of leftBaffles) collideSegment(b, seg);
        for (const seg of rightBaffles) collideSegment(b, seg);

        // Anti-stall guard so a ball never wedges between a peg and a baffle
        if (Math.hypot(b.vx, b.vy) < 14) {
          b.vy += 45;
          b.vx += (b.x < width / 2 ? 16 : -16);
        }

        // Keep balls inside bin dividers once below peg area
        if (b.y > binTopY) {
          const binIdx = Math.max(0, Math.min(binCount - 1, Math.floor((b.x - leftEdge) / binWidth)));
          const binLeft = leftEdge + binIdx * binWidth + ballRadius;
          const binRight = leftEdge + (binIdx + 1) * binWidth - ballRadius;
          if (b.x < binLeft) { b.x = binLeft; b.vx = Math.abs(b.vx) * 0.35; }
          if (b.x > binRight) { b.x = binRight; b.vx = -Math.abs(b.vx) * 0.35; }
        }

        // Clamp inside outer board walls
        const minX = leftEdge + ballRadius;
        const maxX = leftEdge + binCount * binWidth - ballRadius;
        if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * 0.4; }
        if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * 0.4; }

        // Settle into bin stack
        if (b.y >= floorY - ballRadius) {
          const binIdx = Math.max(0, Math.min(binCount - 1, Math.floor((b.x - leftEdge) / binWidth)));
          bins[binIdx]++;
          totalSettled++;
          b.settled = true;
          balls.splice(i, 1);
          updateStats();
        }
      }
    }
  }

  // Binomial probability P(X = k) = C(n, k) * p^k * (1-p)^(n-k)
  function binomialProb(n, k, p) {
    let coeff = 1;
    for (let i = 1; i <= k; i++) {
      coeff = (coeff * (n - i + 1)) / i;
    }
    return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const { leftEdge, binWidth, binCount, floorY, pegEndY, pegRadius, ballRadius, funnelY, leftBaffles, rightBaffles } = boardLayout;
    const binAreaTop = pegEndY + 14;
    const binMaxH = Math.max(40, floorY - binAreaTop - 8);

    // Funnel guide & left/right angled side baffles
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 22, funnelY - 12);
    ctx.lineTo(width / 2 - 6, funnelY + 4);
    ctx.moveTo(width / 2 + 22, funnelY - 12);
    ctx.lineTo(width / 2 + 6, funnelY + 4);
    for (const seg of leftBaffles) {
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
    }
    for (const seg of rightBaffles) {
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
    }
    ctx.stroke();
    ctx.restore();

    // Bin dividers
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= binCount; i++) {
      const x = leftEdge + i * binWidth;
      ctx.beginPath();
      ctx.moveTo(x, binAreaTop);
      ctx.lineTo(x, floorY);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(leftEdge, floorY);
    ctx.lineTo(leftEdge + binCount * binWidth, floorY);
    ctx.stroke();
    ctx.restore();

    // Stacked settled balls + translucent histogram bars in bins
    const maxCount = Math.max(1, ...bins);
    const expectedPeak = Math.max(1, totalSettled * binomialProb(rows, Math.round(rows * rightBias), rightBias));
    const scaleCount = Math.max(maxCount, expectedPeak);

    for (let i = 0; i < binCount; i++) {
      const cnt = bins[i];
      if (cnt <= 0) continue;
      const barH = (cnt / scaleCount) * binMaxH;
      const bx = leftEdge + i * binWidth;

      // Subtle translucent column backdrop
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(bx + 2, floorY - barH, Math.max(2, binWidth - 4), barH);

      // Draw actual stacked balls piled inside the bin
      const colsInBin = Math.max(1, Math.floor((binWidth - 4) / (ballRadius * 2)));
      const drawCount = Math.min(cnt, colsInBin * Math.floor(binMaxH / (ballRadius * 1.6)));
      const stepY = drawCount > 0 ? Math.min(ballRadius * 1.65, barH / Math.ceil(drawCount / colsInBin)) : ballRadius * 1.65;

      ctx.fillStyle = '#38bdf8';
      for (let k = 0; k < drawCount; k++) {
        const rowInBin = Math.floor(k / colsInBin);
        const colInBin = k % colsInBin;
        const stagger = (rowInBin % 2) * (ballRadius * 0.45);
        const sx = bx + (binWidth / (colsInBin + 1)) * (colInBin + 1) + stagger - ballRadius * 0.2;
        const sy = floorY - ballRadius - rowInBin * stepY;
        ctx.beginPath();
        ctx.arc(Math.min(bx + binWidth - ballRadius, Math.max(bx + ballRadius, sx)), sy, ballRadius * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Theoretical Binomial / Bell Curve Overlay
    if (showCurve && totalSettled > 0) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < binCount; i++) {
        const expected = totalSettled * binomialProb(rows, i, rightBias);
        const cx = leftEdge + (i + 0.5) * binWidth;
        const cy = floorY - (expected / scaleCount) * binMaxH;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Pegs
    ctx.fillStyle = '#e2e8f0';
    for (const p of pins) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, pegRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active falling balls
    ctx.fillStyle = '#f43f5e';
    for (const b of balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(ts = 0) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.04, (ts - lastTs) / 1000) * speedMult;
    lastTs = ts;

    stepSimulation(dt);
    draw();

    if (balls.length > 0 || spawnQueue > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
      lastTs = 0;
    }
  }

  function ensureRunning() {
    if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(260, rect.width);
    height = Math.max(260, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeLayout();
    if (!bins.length || bins.length !== boardLayout.binCount) {
      bins = new Array(boardLayout.binCount).fill(0);
    }
    draw();
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resizeCanvas);

  ballCountSlider.addEventListener('input', (e) => {
    targetBalls = Number(e.target.value);
    lblBalls.textContent = String(targetBalls);
  });

  rowsSlider.addEventListener('input', (e) => {
    rows = Number(e.target.value);
    lblRows.textContent = String(rows);
    resetBoard();
  });

  biasSlider.addEventListener('input', (e) => {
    rightBias = Number(e.target.value);
    lblBias.textContent = rightBias.toFixed(2);
    draw();
  });

  btnStart.addEventListener('click', () => {
    spawnQueue += targetBalls;
    updateStats();
    ensureRunning();
  });

  // Tap canvas to drop a burst of 10 balls
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    spawnQueue += 10;
    updateStats();
    ensureRunning();
  });

  btnSpeed.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % SPEED_STEPS.length;
    speedMult = SPEED_STEPS[speedIdx];
    btnSpeed.textContent = `⚡ ${speedMult}x`;
  });

  btnReset.addEventListener('click', resetBoard);

  btnCurve.addEventListener('click', () => {
    showCurve = !showCurve;
    btnCurve.classList.toggle('active', showCurve);
    draw();
  });

  resizeCanvas();
})();

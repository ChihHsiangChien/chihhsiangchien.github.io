(() => {
  'use strict';

  const canvas = document.getElementById('lissajousCanvas');
  const ctx = canvas.getContext('2d');

  const sizeSlider = document.getElementById('sizeSlider');
  const phaseSlider = document.getElementById('phaseSlider');
  const speedSlider = document.getElementById('speedSlider');
  const lblSize = document.getElementById('lbl-size');
  const lblPhase = document.getElementById('lbl-phase');
  const speedDisplay = document.getElementById('speedDisplay');
  const cellInfoEl = document.getElementById('cell-info');

  const btnPause = document.getElementById('btn-pause');
  const btnGuides = document.getElementById('btn-guides');
  const btnLines = document.getElementById('toggleLines');

  let boxSize = 560;
  let gridSize = 8; // 8x8 -> 1..7 frequencies
  let speed = 1.0;
  let phaseDeg = 0;
  let time = 0;
  let showLines = true;
  let showGuides = true;
  let isPaused = false;
  let selectedCell = null; // { row, col }
  let lastTs = 0;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    boxSize = Math.max(240, Math.floor(rect.width));
    canvas.width = Math.floor(boxSize * dpr);
    canvas.height = Math.floor(boxSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, boxSize, boxSize);

    const cell = boxSize / gridSize;
    const radius = cell * 0.36;
    const phaseRad = (phaseDeg * Math.PI) / 180;

    // Highlight selected cell
    if (selectedCell && selectedCell.row > 0 && selectedCell.col > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
      ctx.fillRect(selectedCell.col * cell, selectedCell.row * cell, cell, cell);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(selectedCell.col * cell + 1, selectedCell.row * cell + 1, cell - 2, cell - 2);
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < gridSize; i++) {
      const p = i * cell;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, boxSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(boxSize, p); ctx.stroke();
    }

    // Projection guide lines from header circles
    if (showGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let col = 1; col < gridSize; col++) {
        const cx = (col + 0.5) * cell;
        const px = cx + radius * Math.cos(col * time + phaseRad);
        ctx.beginPath();
        ctx.moveTo(px, cell * 0.5);
        ctx.lineTo(px, boxSize);
        ctx.stroke();
      }

      for (let row = 1; row < gridSize; row++) {
        const cy = (row + 0.5) * cell;
        const py = cy + radius * Math.sin(row * time);
        ctx.beginPath();
        ctx.moveTo(cell * 0.5, py);
        ctx.lineTo(boxSize, py);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Top row circles (X-frequencies)
    for (let col = 1; col < gridSize; col++) {
      const cx = (col + 0.5) * cell;
      const cy = 0.5 * cell;
      const color = `hsl(${col * 36}, 85%, 60%)`;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const dx = cx + radius * Math.cos(col * time + phaseRad);
      const dy = cy + radius * Math.sin(col * time + phaseRad);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left column circles (Y-frequencies)
    for (let row = 1; row < gridSize; row++) {
      const cx = 0.5 * cell;
      const cy = (row + 0.5) * cell;
      const color = `hsl(${row * 36}, 85%, 60%)`;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const dx = cx + radius * Math.cos(row * time);
      const dy = cy + radius * Math.sin(row * time);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lissajous curves in interior cells
    const points = 240;
    for (let row = 1; row < gridSize; row++) {
      for (let col = 1; col < gridSize; col++) {
        const cx = (col + 0.5) * cell;
        const cy = (row + 0.5) * cell;
        const color = `hsl(${(col + row) * 26}, 82%, 60%)`;

        if (showLines) {
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const t = (i / points) * Math.PI * 2;
            const px = cx + radius * Math.cos(col * t + phaseRad);
            const py = cy + radius * Math.sin(row * t);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const dotX = cx + radius * Math.cos(col * time + phaseRad);
        const dotY = cy + radius * Math.sin(row * time);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function loop(ts = 0) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (!isPaused) {
      time = (time + dt * 1.15 * speed) % (Math.PI * 2);
    }
    draw();
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cell = rect.width / gridSize;
    const col = Math.floor((e.clientX - rect.left) / cell);
    const row = Math.floor((e.clientY - rect.top) / cell);
    if (row > 0 && col > 0 && row < gridSize && col < gridSize) {
      selectedCell = { row, col };
      cellInfoEl.textContent = `x = cos(${col}t + ${phaseDeg}°), y = sin(${row}t) · 頻率比 ${col}:${row}`;
    }
  });

  sizeSlider.addEventListener('input', (e) => {
    gridSize = Number(e.target.value);
    lblSize.textContent = `${gridSize}×${gridSize}`;
    selectedCell = null;
    cellInfoEl.textContent = '點擊任一格查看頻率比';
  });

  phaseSlider.addEventListener('input', (e) => {
    phaseDeg = Number(e.target.value);
    lblPhase.textContent = `${phaseDeg}°`;
    if (selectedCell) {
      cellInfoEl.textContent = `x = cos(${selectedCell.col}t + ${phaseDeg}°), y = sin(${selectedCell.row}t) · 頻率比 ${selectedCell.col}:${selectedCell.row}`;
    }
  });

  speedSlider.addEventListener('input', (e) => {
    speed = parseFloat(e.target.value);
    speedDisplay.textContent = `${speed.toFixed(1)}x`;
  });

  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶ 繼續' : '⏸ 暫停';
  });

  btnGuides.addEventListener('click', () => {
    showGuides = !showGuides;
    btnGuides.classList.toggle('active', showGuides);
  });

  btnLines.addEventListener('click', () => {
    showLines = !showLines;
    btnLines.classList.toggle('active', showLines);
  });

  resizeCanvas();
  requestAnimationFrame(loop);
})();

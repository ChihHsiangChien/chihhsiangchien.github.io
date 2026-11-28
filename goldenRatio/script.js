(() => {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  // --- Controls ---
  const numSlider = document.getElementById('numSlider');
  const numInput = document.getElementById('numInput');
  const angleSlider = document.getElementById('angleSlider');
  const angleInput = document.getElementById('angleInput');
  const angleNumInput = document.getElementById('angleInputNumerator');
  const angleDenInput = document.getElementById('angleInputDenominator');
  const btnApplyFrac = document.getElementById('btn-apply-frac');
  const startAngleSlider = document.getElementById('startAngleSlider');
  const startAngleInput = document.getElementById('startAngleInput');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValue = document.getElementById('sizeValue');
  const connectSlider = document.getElementById('connectSlider');
  const connectInput = document.getElementById('connectInput');
  const showNumbersCheckbox = document.getElementById('showNumbersCheckbox');
  const btnAnimate = document.getElementById('btn-animate');
  const btnReset = document.getElementById('btn-reset');

  // --- State ---
  const state = {
    mode: 'leaf', // 'leaf' | 'seed'
    num: 36,
    angle: 137.508,
    startAngle: 0,
    size: 8,
    connect: 0,
    showNumbers: false
  };

  let width = 600;
  let height = 500;
  let animTimer = null;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(240, rect.width);
    height = Math.max(240, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.44;
    const positions = [];

    // Subtle radial guide rings
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();

    // Center stem/meristem
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Compute positions using Vogel's Phyllotaxis model for clean, non-overlapping spacing
    const n = Math.max(1, state.num);
    for (let i = 0; i < n; i++) {
      const deg = state.startAngle + state.angle * i;
      const rad = (deg * Math.PI) / 180;
      const t = (i + 1) / n;
      const dist = state.mode === 'leaf'
        ? maxR * (0.12 + 0.85 * Math.sqrt(t))
        : maxR * 0.94 * Math.sqrt(t);

      const x = cx + dist * Math.cos(rad);
      const y = cy + dist * Math.sin(rad);
      positions.push({ x, y, rad, index: i, t });
    }

    // Draw spiral connections first (behind leaves/seeds)
    if (state.connect > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < positions.length; i++) {
        const nextIdx = i + state.connect;
        if (nextIdx >= positions.length) break;
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[nextIdx].x, positions[nextIdx].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw leaves or seeds (outermost first for leaf mode so inner young leaves sit on top)
    const drawOrder = state.mode === 'leaf' ? positions.slice().reverse() : positions;

    for (const pt of drawOrder) {
      if (state.mode === 'leaf') {
        const rx = state.size * (1.2 + pt.t * 2.1);
        const ry = state.size * (0.58 + pt.t * 0.95);
        const hue = 132 - pt.t * 26;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry, pt.rad, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 62%, ${42 + pt.t * 14}%, 0.92)`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(6, 78, 59, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else {
        const r = Math.max(2.5, state.size * (0.45 + pt.t * 0.55));
        const hue = 36 + pt.t * 18;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 88%, ${55 - pt.t * 12}%)`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (state.showNumbers) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(pt.index + 1), pt.x, pt.y);
      }
    }
  }

  function syncUI() {
    numSlider.value = String(state.num);
    numInput.value = String(state.num);
    angleSlider.value = String(state.angle);
    angleInput.value = state.angle.toFixed(2);
    startAngleSlider.value = String(state.startAngle);
    startAngleInput.value = String(state.startAngle);
    sizeSlider.value = String(state.size);
    sizeValue.textContent = String(state.size);
    connectSlider.value = String(state.connect);
    connectInput.value = String(state.connect);
    showNumbersCheckbox.checked = state.showNumbers;
  }

  function stopAnim() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
      btnAnimate.textContent = '▶ 生長演示';
    }
  }

  // --- Event Listeners ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resizeCanvas);

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      if (state.mode === 'seed' && state.num < 120) {
        state.num = 220;
        syncUI();
      } else if (state.mode === 'leaf' && state.num > 120) {
        state.num = 48;
        syncUI();
      }
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      draw();
    });
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.angle = parseFloat(btn.dataset.angle);
      angleNumInput.value = btn.dataset.num;
      angleDenInput.value = btn.dataset.den;
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      syncUI();
      draw();
    });
  });

  numSlider.addEventListener('input', (e) => {
    stopAnim();
    state.num = parseInt(e.target.value, 10);
    numInput.value = String(state.num);
    draw();
  });

  numInput.addEventListener('input', (e) => {
    stopAnim();
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1 && v <= 400) {
      state.num = v;
      numSlider.value = String(v);
      draw();
    }
  });

  angleSlider.addEventListener('input', (e) => {
    state.angle = parseFloat(e.target.value);
    angleInput.value = state.angle.toFixed(2);
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    draw();
  });

  angleInput.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      state.angle = Math.max(0, Math.min(360, v));
      angleSlider.value = String(state.angle);
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      draw();
    }
  });

  btnApplyFrac.addEventListener('click', () => {
    const n = parseInt(angleNumInput.value, 10);
    const d = parseInt(angleDenInput.value, 10);
    if (!isNaN(n) && !isNaN(d) && d > 0) {
      state.angle = ((360 * n) / d) % 360;
      syncUI();
      draw();
    }
  });

  startAngleSlider.addEventListener('input', (e) => {
    state.startAngle = parseFloat(e.target.value);
    startAngleInput.value = String(state.startAngle);
    draw();
  });

  startAngleInput.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      state.startAngle = Math.max(0, Math.min(360, v));
      startAngleSlider.value = String(state.startAngle);
      draw();
    }
  });

  sizeSlider.addEventListener('input', (e) => {
    state.size = parseFloat(e.target.value);
    sizeValue.textContent = String(state.size);
    draw();
  });

  connectSlider.addEventListener('input', (e) => {
    state.connect = parseInt(e.target.value, 10);
    connectInput.value = String(state.connect);
    draw();
  });

  connectInput.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 55) {
      state.connect = v;
      connectSlider.value = String(v);
      draw();
    }
  });

  document.querySelectorAll('.fib-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.connect = parseInt(btn.dataset.k, 10);
      syncUI();
      draw();
    });
  });

  showNumbersCheckbox.addEventListener('change', (e) => {
    state.showNumbers = e.target.checked;
    draw();
  });

  btnAnimate.addEventListener('click', () => {
    if (animTimer) {
      stopAnim();
      return;
    }
    const target = Math.max(12, state.num);
    state.num = 1;
    syncUI();
    draw();
    btnAnimate.textContent = '⏸ 暫停';
    animTimer = setInterval(() => {
      if (state.num >= target) {
        stopAnim();
        return;
      }
      state.num++;
      syncUI();
      draw();
    }, 65);
  });

  btnReset.addEventListener('click', () => {
    stopAnim();
    state.mode = 'leaf';
    state.num = 36;
    state.angle = 137.508;
    state.startAngle = 0;
    state.size = 8;
    state.connect = 0;
    state.showNumbers = false;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === 'leaf'));
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.angle === '137.508'));
    syncUI();
    draw();
  });

  // --- Boot ---
  syncUI();
  resizeCanvas();
})();

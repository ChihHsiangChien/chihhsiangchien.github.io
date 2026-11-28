(() => {
  'use strict';

  const canvas = document.getElementById('animationCanvas');
  const ctx = canvas.getContext('2d');

  const lengthsInput = document.getElementById('lengthsInput');
  const speedsInput = document.getElementById('speedsInput');
  const lenMultSlider = document.getElementById('lengthMultiplierInput');
  const spdMultSlider = document.getElementById('speedMultiplierInput');
  const lblLenMult = document.getElementById('lbl-len-mult');
  const lblSpdMult = document.getElementById('lbl-spd-mult');

  const btnApply = document.getElementById('applyButton');
  const btnPause = document.getElementById('btn-pause');
  const btnArms = document.getElementById('btn-arms');
  const btnRainbow = document.getElementById('btn-rainbow');
  const btnClear = document.getElementById('btn-clear');
  const btnRandom = document.getElementById('btn-random');

  let width = 700;
  let height = 520;

  let lengths = [19, 30, 23];
  let speeds = [41, 53, -41];
  let lengthMultiplier = 1.0;
  let speedMultiplier = 3.0;
  let angles = [0, 0, 0];

  let isPaused = false;
  let showArms = true;
  let rainbowMode = true;
  let hueOffset = 0;

  // Bounded trajectory ring buffer so FPS stays 60 even after minutes
  const MAX_TRAIL = 3200;
  let trajectory = [];
  let lastTime = 0;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(240, rect.width);
    height = Math.max(240, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function parseList(str, fallback) {
    const arr = str.split(',').map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n));
    return arr.length > 0 ? arr : fallback.slice();
  }

  function resetPattern(newLengths, newSpeeds) {
    lengths = newLengths;
    speeds = newSpeeds;
    // Ensure equal array length without crashing
    while (speeds.length < lengths.length) speeds.push(0);
    if (speeds.length > lengths.length) speeds = speeds.slice(0, lengths.length);

    angles = new Array(lengths.length).fill(0);
    trajectory = [];
    hueOffset = 0;
  }

  function computeAutoScale() {
    const totalLen = lengths.reduce((acc, v) => acc + Math.abs(v), 0) || 1;
    const targetRadius = Math.min(width, height) * 0.41;
    return (targetRadius / totalLen) * lengthMultiplier;
  }

  function stepPhysics(dt) {
    const subSteps = 6;
    const subDt = dt / subSteps;
    const scale = computeAutoScale();
    const cx = width / 2;
    const cy = height / 2;

    for (let s = 0; s < subSteps; s++) {
      let x = cx;
      let y = cy;
      for (let i = 0; i < lengths.length; i++) {
        angles[i] += speeds[i] * speedMultiplier * subDt;
        const rad = (angles[i] * Math.PI) / 180;
        x += lengths[i] * scale * Math.cos(rad);
        y += lengths[i] * scale * Math.sin(rad);
      }
      hueOffset = (hueOffset + subDt * 32) % 360;
      trajectory.push({ x, y, hue: hueOffset });
      if (trajectory.length > MAX_TRAIL) trajectory.shift();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scale = computeAutoScale();
    const cx = width / 2;
    const cy = height / 2;

    // Draw trajectory
    if (trajectory.length > 1) {
      if (!rainbowMode) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        for (let i = 1; i < trajectory.length; i++) {
          ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.lineWidth = 2;
        const chunk = 16;
        for (let i = 0; i < trajectory.length - 1; i += chunk) {
          const end = Math.min(trajectory.length - 1, i + chunk);
          ctx.beginPath();
          ctx.strokeStyle = `hsl(${trajectory[i].hue}, 90%, 62%)`;
          ctx.moveTo(trajectory[i].x, trajectory[i].y);
          for (let j = i + 1; j <= end; j++) {
            ctx.lineTo(trajectory[j].x, trajectory[j].y);
          }
          ctx.stroke();
        }
      }
    }

    // Draw rotating vector arms
    if (showArms) {
      let x = cx;
      let y = cy;
      ctx.save();
      for (let i = 0; i < lengths.length; i++) {
        const rad = (angles[i] * Math.PI) / 180;
        const nx = x + lengths[i] * scale * Math.cos(rad);
        const ny = y + lengths[i] * scale * Math.sin(rad);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        x = nx;
        y = ny;
      }

      // Tip pen dot
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(ts = 0) {
    requestAnimationFrame(loop);
    if (!lastTime) lastTime = ts;
    const dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    if (!isPaused) {
      stepPhysics(dt);
    }
    draw();
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', () => {
    resizeCanvas();
    trajectory = [];
  });

  btnApply.addEventListener('click', () => {
    const newL = parseList(lengthsInput.value, [19, 30, 23]);
    const newS = parseList(speedsInput.value, [41, 53, -41]);
    lengthsInput.value = newL.join(', ');
    speedsInput.value = newS.slice(0, newL.length).join(', ');
    resetPattern(newL, newS);
  });

  lenMultSlider.addEventListener('input', (e) => {
    lengthMultiplier = parseFloat(e.target.value);
    lblLenMult.textContent = `${lengthMultiplier.toFixed(1)}x`;
    trajectory = [];
  });

  spdMultSlider.addEventListener('input', (e) => {
    speedMultiplier = parseFloat(e.target.value);
    lblSpdMult.textContent = `${speedMultiplier.toFixed(1)}x`;
  });

  document.querySelectorAll('.preset-btn[data-l]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn[data-l]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      lengthsInput.value = btn.dataset.l;
      speedsInput.value = btn.dataset.s;
      resetPattern(parseList(btn.dataset.l, lengths), parseList(btn.dataset.s, speeds));
    });
  });

  btnRandom.addEventListener('click', () => {
    const count = 2 + Math.floor(Math.random() * 3);
    const l = Array.from({ length: count }, () => 10 + Math.floor(Math.random() * 28));
    const s = Array.from({ length: count }, () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      return dir * (10 + Math.floor(Math.random() * 75));
    });
    lengthsInput.value = l.join(', ');
    speedsInput.value = s.join(', ');
    document.querySelectorAll('.preset-btn[data-l]').forEach((b) => b.classList.remove('active'));
    resetPattern(l, s);
  });

  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶ 繼續' : '⏸ 暫停';
  });

  btnArms.addEventListener('click', () => {
    showArms = !showArms;
    btnArms.classList.toggle('active', showArms);
  });

  btnRainbow.addEventListener('click', () => {
    rainbowMode = !rainbowMode;
    btnRainbow.classList.toggle('active', rainbowMode);
  });

  btnClear.addEventListener('click', () => {
    trajectory = [];
  });

  resizeCanvas();
  requestAnimationFrame(loop);
})();

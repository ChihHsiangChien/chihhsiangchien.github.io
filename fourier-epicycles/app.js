(() => {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const dropZone = document.getElementById('drop-zone');

  const fileInput = document.getElementById('fileInput');
  const termsSlider = document.getElementById('termsSlider');
  const speedSlider = document.getElementById('speedSlider');
  const threshSlider = document.getElementById('threshSlider');
  const invertCheck = document.getElementById('invertCheck');
  const refCheck = document.getElementById('refCheck');

  const lblTerms = document.getElementById('lbl-terms');
  const lblSpeed = document.getElementById('lbl-speed');
  const lblThresh = document.getElementById('lbl-thresh');
  const termStatus = document.getElementById('term-status');

  const btnAuto = document.getElementById('btn-auto');
  const btnPause = document.getElementById('btn-pause');
  const btnCircles = document.getElementById('btn-circles');
  const btnRestart = document.getElementById('btn-restart');

  let width = 700;
  let height = 520;

  let fourier = [];       // Sorted DFT terms: { re, im, freq, amp, phase }
  let rawPath = [];       // Normalized target points [{x, y}]
  let drawnPath = [];     // Current traced points
  let activeTerms = 3;
  let maxTerms = 240;
  let autoEvolve = true;
  let showCircles = true;
  let showRef = true;
  let isPaused = false;
  let speedMult = 1.0;
  let time = 0;           // 0 .. 2*PI
  let lastTs = 0;
  let uploadedImage = null;

  const PROGRESSIVE_STEPS = [3, 6, 12, 24, 48, 96, 160, 240];

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(240, rect.width);
    height = Math.max(240, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Taiwan Main Island Coastline (Resampled Uniformly by Arc Length) ---
  function generateTaiwanPath(targetCount = 240) {
    // Accurate clockwise polygon of Taiwan main island (screen coords: +x east, +y south)
    const poly = [
      [121.54, -25.30], // 富貴角
      [121.69, -25.21], // 野柳
      [121.77, -25.14], // 基隆
      [121.92, -25.12], // 鼻頭角
      [122.00, -25.01], // 三貂角
      [121.86, -24.84], // 頭城
      [121.84, -24.68], // 蘭陽溪口
      [121.88, -24.59], // 蘇澳
      [121.83, -24.36], // 南澳
      [121.75, -24.16], // 和平
      [121.66, -24.02], // 太魯閣/新城
      [121.62, -23.97], // 花蓮
      [121.56, -23.72], // 豐濱
      [121.51, -23.48], // 石梯坪
      [121.43, -23.22], // 長濱
      [121.41, -23.10], // 三仙台
      [121.37, -23.02], // 成功
      [121.24, -22.84], // 東河
      [121.16, -22.75], // 台東
      [121.02, -22.62], // 知本
      [120.96, -22.46], // 太麻里
      [120.90, -22.30], // 大武
      [120.89, -22.14], // 達仁
      [120.89, -22.01], // 旭海
      [120.85, -21.90], // 鵝鑾鼻
      [120.74, -21.94], // 貓鼻頭
      [120.69, -22.06], // 車城
      [120.65, -22.25], // 枋山
      [120.59, -22.37], // 枋寮
      [120.44, -22.46], // 東港
      [120.34, -22.52], // 林園
      [120.26, -22.62], // 高雄旗津
      [120.23, -22.78], // 梓官
      [120.19, -22.92], // 茄萣
      [120.15, -23.00], // 安平
      [120.04, -23.10], // 七股極西
      [120.09, -23.25], // 北門
      [120.14, -23.38], // 布袋
      [120.14, -23.51], // 東石
      [120.15, -23.68], // 口湖
      [120.18, -23.81], // 台西/麥寮
      [120.28, -23.95], // 大城
      [120.35, -24.08], // 鹿港
      [120.48, -24.26], // 台中港
      [120.58, -24.42], // 大甲
      [120.66, -24.54], // 通霄
      [120.74, -24.67], // 後龍
      [120.91, -24.84], // 新竹南寮
      [121.02, -24.98], // 永安
      [121.18, -25.09], // 觀音/大園
      [121.30, -25.13], // 林口
      [121.41, -25.17], // 淡水
      [121.48, -25.25]  // 三芝
    ];

    // Apply cos(23.5°) horizontal aspect correction for Taiwan latitude
    const cosLat = Math.cos((23.5 * Math.PI) / 180);
    const scaled = poly.map(([lon, lat]) => ({ x: lon * cosLat, y: lat }));

    // Compute cumulative arc length
    const cumLen = [0];
    let totalLen = 0;
    for (let i = 0; i < scaled.length; i++) {
      const a = scaled[i];
      const b = scaled[(i + 1) % scaled.length];
      totalLen += Math.hypot(b.x - a.x, b.y - a.y);
      cumLen.push(totalLen);
    }

    // Resample uniformly
    const pts = [];
    let segIdx = 0;
    for (let k = 0; k < targetCount; k++) {
      const targetD = (k / targetCount) * totalLen;
      while (segIdx < scaled.length - 1 && cumLen[segIdx + 1] < targetD) {
        segIdx++;
      }
      const a = scaled[segIdx];
      const b = scaled[(segIdx + 1) % scaled.length];
      const segLen = cumLen[segIdx + 1] - cumLen[segIdx] || 1;
      const f = (targetD - cumLen[segIdx]) / segLen;
      pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }
    return normalizePath(pts);
  }

  // --- Built-in Vector Sample Paths ---
  function generateSamplePath(kind) {
    if (kind === 'taiwan') return generateTaiwanPath(240);
    const pts = [];
    const N = 220;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      let x = 0;
      let y = 0;
      if (kind === 'heart') {
        x = 16 * Math.pow(Math.sin(t), 3);
        y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      } else if (kind === 'star') {
        const spikes = 5;
        const idx = (i / N) * spikes * 2;
        const seg = Math.floor(idx);
        const f = idx - seg;
        const a0 = (seg * Math.PI) / spikes - Math.PI / 2;
        const a1 = ((seg + 1) * Math.PI) / spikes - Math.PI / 2;
        const r0 = seg % 2 === 0 ? 15 : 6.5;
        const r1 = (seg + 1) % 2 === 0 ? 15 : 6.5;
        x = (1 - f) * r0 * Math.cos(a0) + f * r1 * Math.cos(a1);
        y = (1 - f) * r0 * Math.sin(a0) + f * r1 * Math.sin(a1);
      } else if (kind === 'butterfly') {
        const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin(t / 12), 5);
        x = Math.sin(t) * r * 5;
        y = -Math.cos(t) * r * 5;
      } else {
        // Music note silhouette
        x = 6 * Math.cos(t) + 3 * Math.cos(2 * t) - 2 * Math.sin(3 * t);
        y = 10 * Math.sin(t) - 4 * Math.sin(2 * t) + 2 * Math.cos(4 * t);
      }
      pts.push({ x, y });
    }
    return normalizePath(pts);
  }

  // --- Image Contour Extraction ---
  function extractPathFromImage(img) {
    const S = 128;
    const off = document.createElement('canvas');
    off.width = S;
    off.height = S;
    const octx = off.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, S, S);

    const scale = Math.min((S - 16) / img.width, (S - 16) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    octx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);

    const data = octx.getImageData(0, 0, S, S).data;
    const thresh = Number(threshSlider.value);
    const invert = invertCheck.checked;

    const isFg = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      isFg[i] = invert ? (lum > thresh ? 1 : 0) : (lum < thresh ? 1 : 0);
    }

    // Extract boundary pixels
    const edgePts = [];
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        const idx = y * S + x;
        if (!isFg[idx]) continue;
        if (!isFg[idx - 1] || !isFg[idx + 1] || !isFg[idx - S] || !isFg[idx + S]) {
          edgePts.push({ x, y });
        }
      }
    }

    if (edgePts.length < 12) {
      return generateSamplePath('heart');
    }

    // Nearest-neighbor ordering to trace a continuous contour
    const used = new Uint8Array(edgePts.length);
    const ordered = [];
    let curIdx = 0;
    used[0] = 1;
    ordered.push(edgePts[0]);

    for (let step = 1; step < edgePts.length; step++) {
      const cur = edgePts[curIdx];
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < edgePts.length; j++) {
        if (used[j]) continue;
        const dx = edgePts[j].x - cur.x;
        const dy = edgePts[j].y - cur.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = j;
        }
      }
      if (bestIdx === -1) break;
      used[bestIdx] = 1;
      ordered.push(edgePts[bestIdx]);
      curIdx = bestIdx;
    }

    // Subsample to ~240 points + 1 pass smoothing
    const targetN = Math.min(240, ordered.length);
    const sampled = [];
    for (let i = 0; i < targetN; i++) {
      const srcIdx = Math.floor((i / targetN) * ordered.length);
      sampled.push(ordered[srcIdx]);
    }

    const smoothed = sampled.map((p, i) => {
      const prev = sampled[(i - 1 + sampled.length) % sampled.length];
      const next = sampled[(i + 1) % sampled.length];
      return {
        x: (prev.x + p.x * 2 + next.x) / 4,
        y: (prev.y + p.y * 2 + next.y) / 4
      };
    });

    return normalizePath(smoothed);
  }

  function normalizePath(pts) {
    let sumX = 0, sumY = 0;
    for (const p of pts) { sumX += p.x; sumY += p.y; }
    const mx = sumX / pts.length;
    const my = sumY / pts.length;

    let maxR = 1;
    const centered = pts.map((p) => {
      const x = p.x - mx;
      const y = p.y - my;
      maxR = Math.max(maxR, Math.hypot(x, y));
      return { x, y };
    });

    return centered.map((p) => ({ x: p.x / maxR, y: p.y / maxR }));
  }

  // --- Discrete Fourier Transform (DFT) ---
  function computeDFT(pts) {
    const N = pts.length;
    const X = [];
    for (let k = 0; k < N; k++) {
      const freq = k <= N / 2 ? k : k - N;
      let re = 0;
      let im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (Math.PI * 2 * freq * n) / N;
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);
        re += pts[n].x * cosP + pts[n].y * sinP;
        im += pts[n].y * cosP - pts[n].x * sinP;
      }
      re /= N;
      im /= N;
      X.push({
        re,
        im,
        freq,
        amp: Math.hypot(re, im),
        phase: Math.atan2(im, re)
      });
    }
    X.sort((a, b) => b.amp - a.amp);
    return X;
  }

  function loadPath(pts, startSimple = true) {
    rawPath = pts;
    fourier = computeDFT(pts);
    maxTerms = fourier.length;
    termsSlider.max = String(maxTerms);

    if (startSimple) {
      activeTerms = Math.min(3, maxTerms);
    } else {
      activeTerms = Math.min(activeTerms, maxTerms);
    }
    syncTermsUI();
    time = 0;
    drawnPath = [];
  }

  function syncTermsUI() {
    termsSlider.value = String(activeTerms);
    lblTerms.textContent = String(activeTerms);
    termStatus.textContent = `級數項數：${activeTerms} / ${maxTerms}`;
  }

  function advanceComplexity() {
    if (activeTerms >= maxTerms) return;
    const nextStep = PROGRESSIVE_STEPS.find((s) => s > activeTerms);
    activeTerms = nextStep ? Math.min(nextStep, maxTerms) : maxTerms;
    syncTermsUI();
  }

  // --- Rendering ---
  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    if (fourier.length === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.4;

    // Optional faint reference contour
    if (showRef && rawPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + rawPath[0].x * scale, cy + rawPath[0].y * scale);
      for (let i = 1; i < rawPath.length; i++) {
        ctx.lineTo(cx + rawPath[i].x * scale, cy + rawPath[i].y * scale);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Sum top K Fourier epicycles
    let x = cx;
    let y = cy;
    const kLimit = Math.min(activeTerms, fourier.length);

    for (let i = 0; i < kLimit; i++) {
      const term = fourier[i];
      const prevX = x;
      const prevY = y;
      const r = term.amp * scale;
      const angle = term.freq * time + term.phase;
      x += r * Math.cos(angle);
      y += r * Math.sin(angle);

      if (showCircles && r > 1.2) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(prevX, prevY, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    if (!isPaused) {
      drawnPath.push({ x: (x - cx) / scale, y: (y - cy) / scale });
    }

    // Draw traced curve
    if (drawnPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + drawnPath[0].x * scale, cy + drawnPath[0].y * scale);
      for (let i = 1; i < drawnPath.length; i++) {
        ctx.lineTo(cx + drawnPath[i].x * scale, cy + drawnPath[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Pen tip dot
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(ts = 0) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (!isPaused && fourier.length > 0) {
      const cycleDuration = 5.5 / speedMult;
      time += ((Math.PI * 2) / cycleDuration) * dt;
      if (time >= Math.PI * 2) {
        time = 0;
        drawnPath = [];
        if (autoEvolve) advanceComplexity();
      }
    }
    drawFrame();
  }

  // --- Image Upload & Drag-Drop ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
        loadPath(extractPathFromImage(img), true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleImageFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
  });

  // --- Controls ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resizeCanvas);

  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      uploadedImage = null;
      document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadPath(generateSamplePath(btn.dataset.sample), true);
    });
  });

  termsSlider.addEventListener('input', (e) => {
    activeTerms = Number(e.target.value);
    autoEvolve = false;
    btnAuto.classList.remove('active');
    time = 0;
    drawnPath = [];
    syncTermsUI();
  });

  speedSlider.addEventListener('input', (e) => {
    speedMult = parseFloat(e.target.value);
    lblSpeed.textContent = `${speedMult.toFixed(1)}x`;
  });

  threshSlider.addEventListener('input', (e) => {
    lblThresh.textContent = e.target.value;
    if (uploadedImage) loadPath(extractPathFromImage(uploadedImage), false);
  });

  invertCheck.addEventListener('change', () => {
    if (uploadedImage) loadPath(extractPathFromImage(uploadedImage), false);
  });

  refCheck.addEventListener('change', (e) => {
    showRef = e.target.checked;
  });

  btnAuto.addEventListener('click', () => {
    autoEvolve = !autoEvolve;
    btnAuto.classList.toggle('active', autoEvolve);
  });

  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶ 繼續' : '⏸ 暫停';
  });

  btnCircles.addEventListener('click', () => {
    showCircles = !showCircles;
    btnCircles.classList.toggle('active', showCircles);
  });

  btnRestart.addEventListener('click', () => {
    autoEvolve = true;
    btnAuto.classList.add('active');
    activeTerms = Math.min(3, maxTerms);
    time = 0;
    drawnPath = [];
    syncTermsUI();
  });

  // --- Boot ---
  resizeCanvas();
  loadPath(generateSamplePath('heart'), true);
  requestAnimationFrame(loop);
})();

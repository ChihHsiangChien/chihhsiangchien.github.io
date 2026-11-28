(() => {
  const VIDEO_W = 320;
  const VIDEO_H = 240;
  const GRAPH_W = 600;
  const GRAPH_H = 220;

  const TARGET_FS = 30; // Resample to uniform 30 Hz
  const WINDOW_SEC = 10; // Rolling 10-second analysis window
  const MIN_SEC_TO_COMPUTE = 4.0;
  const MIN_BPM = 45;
  const MAX_BPM = 190;

  const videoSelect = document.getElementById("videoSource");
  const algoModeSelect = document.getElementById("algoMode");
  const torchBtn = document.getElementById("torchBtn");
  const beepBtn = document.getElementById("beepBtn");
  const demoBtn = document.getElementById("demoBtn");
  const resetBtn = document.getElementById("resetBtn");

  const video = document.querySelector(".player");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const graphCanvas = document.getElementById("graphCanvas");
  const graphCtx = graphCanvas.getContext("2d");

  const statusBadge = document.getElementById("statusBadge");
  const lightChip = document.getElementById("lightChip");
  const bufferChip = document.getElementById("bufferChip");
  const bpmValueEl = document.getElementById("bpmValue");
  const heartIcon = document.getElementById("heartIcon");
  const sqiText = document.getElementById("sqiText");
  const sqiFill = document.getElementById("sqiFill");
  const algoNote = document.getElementById("algoNote");

  let stream = null;
  let videoTrack = null;
  let hasCamera = false;
  let torchOn = false;
  let beepOn = false;
  let demoMode = false;
  let rafId = null;

  // Raw timestamped RGB samples: { t (ms), r, g, b }
  const samples = [];
  const bpmHistory = [];
  let smoothedBpm = null;
  let lastValidTime = 0;
  let lastFilteredSignal = [];
  let lastPeakIndices = [];
  let lastBeatTime = 0;
  let demoStartTime = 0;

  let audioCtx = null;

  function unlockAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function playHeartBeep() {
    if (!beepOn || !audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function setStatus(text, isWarn = false) {
    statusBadge.textContent = text;
    statusBadge.classList.toggle("warn", isWarn);
  }

  function resetBuffers() {
    samples.length = 0;
    bpmHistory.length = 0;
    smoothedBpm = null;
    lastFilteredSignal = [];
    lastPeakIndices = [];
    bpmValueEl.textContent = "--";
    sqiText.textContent = "0%";
    sqiFill.style.width = "0%";
    algoNote.textContent = "等待累積 4 秒訊號...";
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const prev = videoSelect.value;
      videoSelect.innerHTML = "";
      let idx = 0;
      for (const d of devices) {
        if (d.kind === "videoinput") {
          idx += 1;
          const opt = document.createElement("option");
          opt.value = d.deviceId;
          opt.textContent = d.label || `攝影機 ${idx}`;
          videoSelect.appendChild(opt);
        }
      }
      if (prev && [...videoSelect.options].some((o) => o.value === prev)) {
        videoSelect.value = prev;
      }
    } catch (err) {
      console.warn("enumerateDevices failed:", err);
    }
  }

  async function startCamera(deviceId) {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      videoTrack = null;
    }
    torchOn = false;
    torchBtn.hidden = true;
    torchBtn.classList.remove("active");
    torchBtn.textContent = "🔦 補光燈：關";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hasCamera = false;
      enableDemoMode(true);
      setStatus("無相機支援（已切換模擬測試）", true);
      return;
    }

    const constraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }
        : { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      videoTrack = stream.getVideoTracks()[0];
      await refreshDevices();
      if (videoTrack && videoTrack.label) {
        const match = [...videoSelect.options].find((o) => o.textContent === videoTrack.label);
        if (match) videoSelect.value = match.value;
      }

      if (videoTrack && typeof videoTrack.getCapabilities === "function") {
        const caps = videoTrack.getCapabilities();
        if (caps && caps.torch) {
          torchBtn.hidden = false;
        }
      }

      hasCamera = true;
      demoMode = false;
      demoBtn.classList.remove("active");
      setStatus("相機已連線");
      resetBuffers();
    } catch (err) {
      console.warn("Camera error:", err);
      hasCamera = false;
      enableDemoMode(true);
      setStatus("無相機權限（已切換模擬測試）", true);
    }
  }

  function enableDemoMode(forceOn) {
    demoMode = typeof forceOn === "boolean" ? forceOn : !demoMode;
    demoBtn.classList.toggle("active", demoMode);
    demoStartTime = performance.now();
    resetBuffers();
    if (demoMode) {
      setStatus("模擬不穩光源測試中（目標 ~72 BPM）");
    } else if (hasCamera) {
      setStatus("相機已連線");
    }
  }

  function extractROIRgb() {
    ctx.drawImage(video, 0, 0, VIDEO_W, VIDEO_H);
    const startX = Math.floor(VIDEO_W * 0.3);
    const startY = Math.floor(VIDEO_H * 0.25);
    const roiW = Math.floor(VIDEO_W * 0.4);
    const roiH = Math.floor(VIDEO_H * 0.5);

    const imgData = ctx.getImageData(startX, startY, roiW, roiH).data;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    const count = roiW * roiH;

    for (let i = 0; i < imgData.length; i += 4) {
      sumR += imgData[i];
      sumG += imgData[i + 1];
      sumB += imgData[i + 2];
    }

    // Draw ROI overlay box
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, roiW, roiH);

    return {
      r: sumR / count,
      g: sumG / count,
      b: sumB / count,
    };
  }

  function generateDemoSample(now) {
    const tSec = (now - demoStartTime) / 1000;
    // True 72 BPM (1.2 Hz) subtle blood pulse + severe slow lighting drift + 50Hz-like jitter + random bump
    const trueHrHz = 1.2;
    const pulse = Math.sin(2 * Math.PI * trueHrHz * tSec) + 0.35 * Math.sin(4 * Math.PI * trueHrHz * tSec + 0.5);
    const globalLightingDrift = 1 + 0.25 * Math.sin(2 * Math.PI * 0.14 * tSec) + 0.12 * Math.cos(2 * Math.PI * 0.31 * tSec);
    const highFreqNoise = (Math.random() - 0.5) * 1.4;

    // Green & Blue carry stronger hemoglobin absorption than Red in rPPG, while global lighting multiplies all 3 channels equally
    const r = 165 * globalLightingDrift + 0.35 * pulse + highFreqNoise;
    const g = 128 * globalLightingDrift + 1.15 * pulse + highFreqNoise;
    const b = 112 * globalLightingDrift + 0.45 * pulse + highFreqNoise;

    // Draw visual feedback on camera canvas
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
    const boxColor = `rgb(${Math.round(Math.min(255, Math.max(0, r)))}, ${Math.round(Math.min(255, Math.max(0, g)))}, ${Math.round(Math.min(255, Math.max(0, b)))})`;
    ctx.fillStyle = boxColor;
    ctx.fillRect(70, 45, 180, 150);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 45, 180, 150);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "12px sans-serif";
    ctx.fillText("模擬不穩光源 + 72 BPM 脈搏", 74, 34);

    return { r, g, b };
  }

  function resampleUniform(rawSamples, fs) {
    const tStart = rawSamples[0].t;
    const tEnd = rawSamples[rawSamples.length - 1].t;
    const durationSec = (tEnd - tStart) / 1000;
    const n = Math.floor(durationSec * fs);
    if (n < 30) return null;

    const r = new Float64Array(n);
    const g = new Float64Array(n);
    const b = new Float64Array(n);

    let j = 0;
    for (let i = 0; i < n; i++) {
      const targetT = tStart + (i * 1000) / fs;
      while (j < rawSamples.length - 2 && rawSamples[j + 1].t < targetT) {
        j++;
      }
      const s0 = rawSamples[j];
      const s1 = rawSamples[j + 1];
      const span = s1.t - s0.t;
      const alpha = span > 0 ? Math.min(1, Math.max(0, (targetT - s0.t) / span)) : 0;
      r[i] = s0.r + (s1.r - s0.r) * alpha;
      g[i] = s0.g + (s1.g - s0.g) * alpha;
      b[i] = s0.b + (s1.b - s0.b) * alpha;
    }
    return { r, g, b, n, durationSec };
  }

  function meanAndStd(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    const mean = sum / arr.length;
    let sq = 0;
    for (let i = 0; i < arr.length; i++) {
      const d = arr[i] - mean;
      sq += d * d;
    }
    return { mean, std: Math.sqrt(sq / arr.length) || 1e-6 };
  }

  function movingAverage(arr, winSize) {
    const n = arr.length;
    const out = new Float64Array(n);
    const half = Math.floor(winSize / 2);
    let sum = 0;
    let count = 0;

    for (let i = 0; i <= Math.min(half, n - 1); i++) {
      sum += arr[i];
      count++;
    }
    for (let i = 0; i < n; i++) {
      if (i > half) {
        sum -= arr[i - half - 1];
        count--;
      }
      if (i + half + 1 < n && i > 0) {
        // handled below
      }
      out[i] = sum / count;
      const nextRight = i + half + 1;
      if (nextRight < n) {
        sum += arr[nextRight];
        count++;
      }
    }
    return out;
  }

  function medianClamp(arr, k = 3.5) {
    const sorted = Array.from(arr).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const devs = sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
    const mad = (devs[Math.floor(devs.length / 2)] || 1e-6) * 1.4826;
    const limit = k * mad;
    const out = new Float64Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      const diff = arr[i] - med;
      if (diff > limit) out[i] = med + limit;
      else if (diff < -limit) out[i] = med - limit;
      else out[i] = arr[i];
    }
    return out;
  }

  function computePOS(r, g, b) {
    const n = r.length;
    const { mean: mr } = meanAndStd(r);
    const { mean: mg } = meanAndStd(g);
    const { mean: mb } = meanAndStd(b);

    const s1 = new Float64Array(n);
    const s2 = new Float64Array(n);
    const safeMr = mr || 1;
    const safeMg = mg || 1;
    const safeMb = mb || 1;

    for (let i = 0; i < n; i++) {
      const rn = r[i] / safeMr;
      const gn = g[i] / safeMg;
      const bn = b[i] / safeMb;
      s1[i] = gn - bn;
      s2[i] = gn + bn - 2 * rn;
    }

    const { std: std1 } = meanAndStd(s1);
    const { std: std2 } = meanAndStd(s2);
    const alpha = std1 / (std2 || 1e-6);

    const h = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      h[i] = s1[i] + alpha * s2[i];
    }
    return h;
  }

  function computeFingerNormalized(r, g) {
    const n = r.length;
    // Prefer green if not dark, otherwise red AC/DC
    const { mean: mg } = meanAndStd(g);
    const { mean: mr } = meanAndStd(r);
    const channel = mg > 25 ? g : r;
    const meanVal = (mg > 25 ? mg : mr) || 1;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = (channel[i] - meanVal) / meanVal;
    }
    return out;
  }

  function estimateBpmFFT(signal, fs) {
    const fftSize = 512;
    const n = signal.length;
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);

    // Apply Hann window to reduce spectral leakage
    for (let i = 0; i < Math.min(n, fftSize); i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      re[i] = signal[i] * w;
    }

    // In-place radix-2 Cooley-Tukey FFT
    for (let i = 1, j = 0; i < fftSize; i++) {
      let bit = fftSize >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= fftSize; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wlenRe = Math.cos(ang);
      const wlenIm = Math.sin(ang);
      for (let i = 0; i < fftSize; i += len) {
        let wRe = 1;
        let wIm = 0;
        for (let j = 0; j < len / 2; j++) {
          const uRe = re[i + j];
          const uIm = im[i + j];
          const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
          const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
          re[i + j] = uRe + vRe;
          im[i + j] = uIm + vIm;
          re[i + j + len / 2] = uRe - vRe;
          im[i + j + len / 2] = uIm - vIm;
          const nextWRe = wRe * wlenRe - wIm * wlenIm;
          wIm = wRe * wlenIm + wIm * wlenRe;
          wRe = nextWRe;
        }
      }
    }

    const minBin = Math.max(1, Math.floor((MIN_BPM / 60) * (fftSize / fs)));
    const maxBin = Math.min(fftSize / 2 - 2, Math.ceil((MAX_BPM / 60) * (fftSize / fs)));

    const power = new Float64Array(maxBin + 1);
    let totalPower = 0;
    let peakBin = minBin;
    let peakPower = -1;

    for (let k = minBin; k <= maxBin; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      power[k] = p;
      totalPower += p;
      if (p > peakPower) {
        peakPower = p;
        peakBin = k;
      }
    }

    // Parabolic interpolation around peakBin
    let delta = 0;
    if (peakBin > minBin && peakBin < maxBin) {
      const alpha = power[peakBin - 1];
      const beta = power[peakBin];
      const gamma = power[peakBin + 1];
      const denom = alpha - 2 * beta + gamma;
      if (Math.abs(denom) > 1e-12) {
        delta = 0.5 * (alpha - gamma) / denom;
      }
    }

    const peakFreq = ((peakBin + delta) * fs) / fftSize;
    const bpm = peakFreq * 60;

    // SNR / SQI: energy within +-2 bins around peak / total bandpass energy
    let signalPower = 0;
    for (let k = Math.max(minBin, peakBin - 2); k <= Math.min(maxBin, peakBin + 2); k++) {
      signalPower += power[k];
    }
    const sqi = totalPower > 0 ? Math.min(100, Math.round((signalPower / totalPower) * 160)) : 0;

    return { bpm, sqi };
  }

  function findPeaks(signal, fs) {
    const peaks = [];
    const minDist = Math.floor(fs * 0.32); // max ~187 BPM
    const { std } = meanAndStd(signal);
    const thresh = std * 0.35;

    for (let i = 2; i < signal.length - 2; i++) {
      if (
        signal[i] > thresh &&
        signal[i] > signal[i - 1] &&
        signal[i] >= signal[i + 1] &&
        signal[i] > signal[i - 2] &&
        signal[i] >= signal[i + 2]
      ) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) {
          peaks.push(i);
        } else if (signal[i] > signal[peaks[peaks.length - 1]]) {
          peaks[peaks.length - 1] = i;
        }
      }
    }
    return peaks;
  }

  function processPulseSignal(now) {
    if (samples.length < 30) return;
    const resampled = resampleUniform(samples, TARGET_FS);
    if (!resampled) return;

    bufferChip.textContent = `樣本 ${resampled.durationSec.toFixed(1)} s`;

    const { r, g, b } = resampled;
    const { mean: mr } = meanAndStd(r);
    const { mean: mg } = meanAndStd(g);

    const mode = algoModeSelect.value;
    let rawPulse;
    if (mode === "finger" || (mode === "auto" && mr > 80 && mg < 22)) {
      rawPulse = computeFingerNormalized(r, g);
    } else {
      rawPulse = computePOS(r, g, b);
    }

    // 1. Clamp extreme motion/flash spikes
    const clamped = medianClamp(rawPulse, 3.2);
    // 2. Detrend (subtract 0.8s moving average -> removes slow lighting drift)
    const trend = movingAverage(clamped, Math.round(TARGET_FS * 0.8));
    const detrended = new Float64Array(clamped.length);
    for (let i = 0; i < clamped.length; i++) detrended[i] = clamped[i] - trend[i];
    // 3. Smooth (0.16s moving average -> removes high-freq flicker/noise)
    const filtered = movingAverage(detrended, Math.max(3, Math.round(TARGET_FS * 0.16)));

    lastFilteredSignal = filtered;
    lastPeakIndices = findPeaks(filtered, TARGET_FS);

    if (resampled.durationSec < MIN_SEC_TO_COMPUTE) {
      algoNote.textContent = `累積訊號中 (${resampled.durationSec.toFixed(1)} / ${MIN_SEC_TO_COMPUTE.toFixed(0)} 秒)...`;
      return;
    }

    const { bpm, sqi } = estimateBpmFFT(filtered, TARGET_FS);
    sqiText.textContent = `${sqi}%`;
    sqiFill.style.width = `${sqi}%`;
    sqiFill.style.background = sqi >= 55 ? "#10b981" : sqi >= 35 ? "#f59e0b" : "#ef4444";

    if (sqi >= 35 && bpm >= MIN_BPM && bpm <= MAX_BPM) {
      bpmHistory.push(bpm);
      if (bpmHistory.length > 7) bpmHistory.shift();
      const sorted = [...bpmHistory].sort((a, b) => a - b);
      const medBpm = sorted[Math.floor(sorted.length / 2)];
      smoothedBpm = smoothedBpm == null ? medBpm : smoothedBpm * 0.72 + medBpm * 0.28;
      lastValidTime = now;

      bpmValueEl.textContent = String(Math.round(smoothedBpm));
      algoNote.textContent = sqi >= 55 ? "訊號穩定（已抑制光源漂移）" : "光源略有波動，持續追蹤中";

      // Heartbeat visual + optional beep
      const beatIntervalMs = 60000 / smoothedBpm;
      if (now - lastBeatTime >= beatIntervalMs) {
        lastBeatTime = now;
        heartIcon.classList.add("beat");
        setTimeout(() => heartIcon.classList.remove("beat"), 140);
        playHeartBeep();
      }
    } else if (smoothedBpm != null && now - lastValidTime < 6000) {
      algoNote.textContent = "光源短暫干擾，維持前次穩定讀數...";
    } else {
      algoNote.textContent = "訊號雜訊較高，請保持穩定姿勢與光線";
    }
  }

  function drawGraph() {
    graphCtx.clearRect(0, 0, GRAPH_W, GRAPH_H);

    // Subtle grid lines
    graphCtx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    graphCtx.lineWidth = 1;
    for (let y = 44; y < GRAPH_H; y += 44) {
      graphCtx.beginPath();
      graphCtx.moveTo(0, y);
      graphCtx.lineTo(GRAPH_W, y);
      graphCtx.stroke();
    }

    const sig = lastFilteredSignal;
    if (!sig || sig.length < 2) return;

    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] < minV) minV = sig[i];
      if (sig[i] > maxV) maxV = sig[i];
    }
    const range = maxV - minV || 1e-6;
    const pad = range * 0.18;
    const yMin = minV - pad;
    const yMax = maxV + pad;

    graphCtx.beginPath();
    graphCtx.strokeStyle = "#f43f5e";
    graphCtx.lineWidth = 2.4;

    const xStep = GRAPH_W / (sig.length - 1);
    for (let i = 0; i < sig.length; i++) {
      const x = i * xStep;
      const y = GRAPH_H - ((sig[i] - yMin) / (yMax - yMin)) * GRAPH_H;
      if (i === 0) graphCtx.moveTo(x, y);
      else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();

    // Mark detected peaks
    graphCtx.fillStyle = "#10b981";
    for (const idx of lastPeakIndices) {
      const x = idx * xStep;
      const y = GRAPH_H - ((sig[idx] - yMin) / (yMax - yMin)) * GRAPH_H;
      graphCtx.beginPath();
      graphCtx.arc(x, y, 4, 0, Math.PI * 2);
      graphCtx.fill();
    }
  }

  function mainLoop(now) {
    let rgb = null;
    if (demoMode) {
      rgb = generateDemoSample(now);
    } else if (hasCamera && video.readyState >= 2) {
      rgb = extractROIRgb();
    }

    if (rgb) {
      const luma = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
      const lightWarn = luma < 25 ? "偏暗" : luma > 240 ? "過曝" : "適中";
      lightChip.textContent = `亮度 ${luma} (${lightWarn})`;

      samples.push({ t: now, r: rgb.r, g: rgb.g, b: rgb.b });
      const cutoff = now - WINDOW_SEC * 1000;
      while (samples.length > 0 && samples[0].t < cutoff) {
        samples.shift();
      }

      processPulseSignal(now);
      drawGraph();
    }

    rafId = requestAnimationFrame(mainLoop);
  }

  // Event listeners
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  videoSelect.addEventListener("change", () => startCamera(videoSelect.value));
  algoModeSelect.addEventListener("change", resetBuffers);
  resetBtn.addEventListener("click", resetBuffers);

  beepBtn.addEventListener("click", () => {
    beepOn = !beepOn;
    beepBtn.classList.toggle("active", beepOn);
    beepBtn.textContent = beepOn ? "🔊 心跳音：開" : "🔇 心跳音：關";
  });

  demoBtn.addEventListener("click", () => enableDemoMode());

  torchBtn.addEventListener("click", async () => {
    if (!videoTrack) return;
    try {
      torchOn = !torchOn;
      await videoTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
      torchBtn.classList.toggle("active", torchOn);
      torchBtn.textContent = torchOn ? "🔦 補光燈：開" : "🔦 補光燈：關";
    } catch (err) {
      console.warn("Torch toggle failed:", err);
      torchOn = false;
    }
  });

  window.addEventListener("beforeunload", () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
  });

  // Init
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  graphCanvas.width = GRAPH_W;
  graphCanvas.height = GRAPH_H;

  rafId = requestAnimationFrame(mainLoop);
  startCamera();
})();

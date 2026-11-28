(() => {
  const DEFAULT_W = 640;
  const DEFAULT_H = 480;

  const videoSelect = document.getElementById("videoSource");
  const video = document.querySelector(".player");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const statusBadge = document.getElementById("statusBadge");
  const modeTitle = document.getElementById("modeTitle");
  const frameStats = document.getElementById("frameStats");
  const countdownOverlay = document.getElementById("countdownOverlay");

  const mirrorBtn = document.getElementById("mirrorBtn");
  const videoFileInput = document.getElementById("videoFileInput");
  const startBtn = document.getElementById("startBtn");
  const countdownToggle = document.getElementById("countdownToggle");
  const soundToggle = document.getElementById("soundToggle");
  const clearBtn = document.getElementById("clearBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const intervalRange = document.getElementById("intervalRange");
  const intervalValue = document.getElementById("intervalValue");
  const presetBtns = document.querySelectorAll(".btn-chip");
  const blendModeSelect = document.getElementById("blendMode");
  const modeDesc = document.getElementById("modeDesc");
  const thresholdGroup = document.getElementById("thresholdGroup");
  const thresholdRange = document.getElementById("thresholdRange");
  const thresholdValue = document.getElementById("thresholdValue");
  const maxFramesRange = document.getElementById("maxFramesRange");
  const maxFramesValue = document.getElementById("maxFramesValue");
  const windowToggle = document.getElementById("windowToggle");

  const MODE_DESCRIPTIONS = {
    motion: "以起始畫面為背景，僅將移動中的物體（如落球）疊加到畫面上，靜止背景完全不會過曝光。",
    darken: "逐像素保留較暗的顏色，適合「深色或彩色球＋淺色牆面」，靜止背景不會過曝光。",
    lighten: "逐像素保留較亮的顏色（非直接相加），適合「亮色球或光點＋深色背景」，不會爆白。",
    average: "將所有取樣影格做等權重平均，產生長曝光殘影效果，整體亮度維持不變。",
  };

  let W = DEFAULT_W;
  let H = DEFAULT_H;
  let stream = null;
  let uploadedVideoUrl = null;
  let isUploadedVideo = false;
  let hasSource = false;

  let mirrorEnabled = true;
  let countdownEnabled = true;
  let soundEnabled = true;

  let intervalMs = 100;
  let motionThreshold = 32;
  let maxFrames = 30;
  let slidingWindow = false;
  let blendMode = "motion";

  // State: "live" | "countdown" | "recording" | "result"
  let state = "live";
  let rafId = null;
  let strobeTimer = null;
  let countdownTimer = null;

  let stackedCount = 0;
  let bgImageData = null;
  let compositeImageData = null;
  let accumBuffer = null; // Float32Array for "average" mode
  let pixelFrameId = null; // Uint32Array for O(W*H) sliding window in "motion" mode
  let windowFrames = []; // Array of Uint8ClampedArray for sliding window in "darken"/"lighten"/"average"

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

  function playBeep(freq = 880, duration = 0.045, volume = 0.1) {
    if (!soundEnabled || !audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  function setCanvasSize(w, h) {
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    sampleCanvas.width = W;
    sampleCanvas.height = H;
  }

  function setStatus(text, kind = "normal") {
    statusBadge.textContent = text;
    statusBadge.classList.remove("warn", "recording");
    if (kind === "warn") statusBadge.classList.add("warn");
    if (kind === "recording") statusBadge.classList.add("recording");
  }

  function updateStats() {
    const activeCount = slidingWindow ? Math.min(stackedCount, maxFrames) : stackedCount;
    frameStats.textContent = slidingWindow
      ? `影格窗 ${activeCount} / ${maxFrames} 格（累計 ${stackedCount}）｜間隔 ${intervalMs} ms`
      : `已疊加 ${stackedCount} 格 ｜ 間隔 ${intervalMs} ms`;
    const hz = (1000 / intervalMs).toFixed(1);
    intervalValue.textContent = `${intervalMs} ms (${hz} Hz)`;
    thresholdValue.textContent = String(motionThreshold);
    maxFramesValue.textContent = `${maxFrames} 格`;
  }

  function updateUI() {
    startBtn.disabled = !hasSource;
    downloadBtn.disabled = stackedCount === 0;
    if (state === "recording") {
      startBtn.textContent = "⏹️ 停止疊加";
      startBtn.classList.add("stop");
      modeTitle.textContent = "頻閃疊加進行中";
    } else if (state === "countdown") {
      startBtn.textContent = "✖️ 取消倒數";
      startBtn.classList.add("stop");
      modeTitle.textContent = "準備倒數中";
    } else if (state === "result") {
      startBtn.textContent = "▶️ 重新頻閃疊加";
      startBtn.classList.remove("stop");
      modeTitle.textContent = "軌跡疊加結果";
    } else {
      startBtn.textContent = "▶️ 開始頻閃疊加";
      startBtn.classList.remove("stop");
      modeTitle.textContent = "即時取景預覽";
    }
    updateStats();
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
      console.warn("enumerateDevices error:", err);
    }
  }

  function stopMedia() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      uploadedVideoUrl = null;
    }
  }

  async function startCamera(deviceId) {
    stopTimers();
    stopMedia();
    isUploadedVideo = false;
    video.loop = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hasSource = false;
      setStatus("無相機支援（可匯入影片）", "warn");
      updateUI();
      return;
    }

    const constraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      await refreshDevices();
      if (track && track.label) {
        const match = [...videoSelect.options].find((o) => o.textContent === track.label);
        if (match) videoSelect.value = match.value;
      }

      const vw = video.videoWidth || DEFAULT_W;
      const vh = video.videoHeight || DEFAULT_H;
      setCanvasSize(DEFAULT_W, Math.round((DEFAULT_W * vh) / vw) || DEFAULT_H);

      hasSource = true;
      state = "live";
      setStatus("相機已連線");
      updateUI();
    } catch (err) {
      console.warn("Camera error:", err);
      hasSource = false;
      setStatus("無相機權限（可匯入影片）", "warn");
      updateUI();
    }
  }

  function drawVideoToContext(targetCtx) {
    targetCtx.save();
    if (mirrorEnabled && !isUploadedVideo) {
      targetCtx.translate(W, 0);
      targetCtx.scale(-1, 1);
    }
    targetCtx.drawImage(video, 0, 0, W, H);
    targetCtx.restore();
  }

  function livePreviewLoop() {
    if (state === "live" || state === "countdown") {
      if (hasSource && video.readyState >= 2) {
        drawVideoToContext(ctx);
      } else if (!hasSource) {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, W, H);
      }
    }
    rafId = requestAnimationFrame(livePreviewLoop);
  }

  function stopTimers() {
    if (strobeTimer) {
      clearInterval(strobeTimer);
      strobeTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdownOverlay.hidden = true;
  }

  function captureSampleFrame() {
    if (!hasSource || video.readyState < 2) return null;
    drawVideoToContext(sampleCtx);
    return sampleCtx.getImageData(0, 0, W, H);
  }

  function stepStrobe() {
    const cur = captureSampleFrame();
    if (!cur) return;

    if (stackedCount === 0) {
      bgImageData = new ImageData(new Uint8ClampedArray(cur.data), W, H);
      compositeImageData = new ImageData(new Uint8ClampedArray(cur.data), W, H);
      pixelFrameId = new Uint32Array(W * H);
      windowFrames = [];
      if (blendMode === "average") {
        accumBuffer = new Float32Array(cur.data.length);
        for (let i = 0; i < cur.data.length; i++) {
          accumBuffer[i] = cur.data[i];
        }
      }
      if (slidingWindow && blendMode !== "motion") {
        windowFrames.push(new Uint8ClampedArray(cur.data));
      }
      stackedCount = 1;
      ctx.putImageData(compositeImageData, 0, 0);
      playBeep(980, 0.04, 0.1);
      updateUI();
      return;
    }

    const nextCount = stackedCount + 1;
    const src = cur.data;
    const dst = compositeImageData.data;
    const bg = bgImageData.data;
    const len = src.length;

    if (blendMode === "motion") {
      const threshSum = motionThreshold * 3;
      const oldestValidId = slidingWindow && nextCount > maxFrames ? nextCount - maxFrames + 1 : 0;
      for (let i = 0, p = 0; i < len; i += 4, p++) {
        const diff =
          Math.abs(src[i] - bg[i]) +
          Math.abs(src[i + 1] - bg[i + 1]) +
          Math.abs(src[i + 2] - bg[i + 2]);
        if (diff > threshSum) {
          dst[i] = src[i];
          dst[i + 1] = src[i + 1];
          dst[i + 2] = src[i + 2];
          dst[i + 3] = 255;
          pixelFrameId[p] = nextCount;
        } else if (oldestValidId > 0 && pixelFrameId[p] > 0 && pixelFrameId[p] < oldestValidId) {
          dst[i] = bg[i];
          dst[i + 1] = bg[i + 1];
          dst[i + 2] = bg[i + 2];
          dst[i + 3] = 255;
          pixelFrameId[p] = 0;
        }
      }
    } else if (blendMode === "darken" || blendMode === "lighten") {
      const pickDarker = blendMode === "darken";
      if (slidingWindow) {
        windowFrames.push(new Uint8ClampedArray(src));
        while (windowFrames.length > maxFrames) {
          windowFrames.shift();
        }
        const first = windowFrames[0];
        dst.set(first);
        for (let f = 1; f < windowFrames.length; f++) {
          const fData = windowFrames[f];
          for (let i = 0; i < len; i += 4) {
            const lumSrc = fData[i] * 0.299 + fData[i + 1] * 0.587 + fData[i + 2] * 0.114;
            const lumDst = dst[i] * 0.299 + dst[i + 1] * 0.587 + dst[i + 2] * 0.114;
            if (pickDarker ? lumSrc < lumDst : lumSrc > lumDst) {
              dst[i] = fData[i];
              dst[i + 1] = fData[i + 1];
              dst[i + 2] = fData[i + 2];
            }
          }
        }
      } else {
        for (let i = 0; i < len; i += 4) {
          const lumSrc = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
          const lumDst = dst[i] * 0.299 + dst[i + 1] * 0.587 + dst[i + 2] * 0.114;
          if (pickDarker ? lumSrc < lumDst : lumSrc > lumDst) {
            dst[i] = src[i];
            dst[i + 1] = src[i + 1];
            dst[i + 2] = src[i + 2];
          }
        }
      }
    } else if (blendMode === "average") {
      if (slidingWindow) {
        windowFrames.push(new Uint8ClampedArray(src));
        for (let i = 0; i < len; i += 4) {
          accumBuffer[i] += src[i];
          accumBuffer[i + 1] += src[i + 1];
          accumBuffer[i + 2] += src[i + 2];
        }
        while (windowFrames.length > maxFrames) {
          const removed = windowFrames.shift();
          for (let i = 0; i < len; i += 4) {
            accumBuffer[i] -= removed[i];
            accumBuffer[i + 1] -= removed[i + 1];
            accumBuffer[i + 2] -= removed[i + 2];
          }
        }
        const denom = windowFrames.length;
        for (let i = 0; i < len; i += 4) {
          dst[i] = accumBuffer[i] / denom;
          dst[i + 1] = accumBuffer[i + 1] / denom;
          dst[i + 2] = accumBuffer[i + 2] / denom;
        }
      } else {
        for (let i = 0; i < len; i += 4) {
          accumBuffer[i] += src[i];
          accumBuffer[i + 1] += src[i + 1];
          accumBuffer[i + 2] += src[i + 2];
          dst[i] = accumBuffer[i] / nextCount;
          dst[i + 1] = accumBuffer[i + 1] / nextCount;
          dst[i + 2] = accumBuffer[i + 2] / nextCount;
        }
      }
    }

    stackedCount = nextCount;
    ctx.putImageData(compositeImageData, 0, 0);
    playBeep(760, 0.035, 0.08);
    updateUI();

    if (!slidingWindow && stackedCount >= maxFrames) {
      finishRecording();
    }
  }

  function beginRecording() {
    stopTimers();
    stackedCount = 0;
    bgImageData = null;
    compositeImageData = null;
    accumBuffer = null;
    pixelFrameId = null;
    windowFrames = [];
    state = "recording";
    setStatus("頻閃取樣中...", "recording");

    if (isUploadedVideo) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }

    stepStrobe();
    strobeTimer = setInterval(stepStrobe, intervalMs);
    updateUI();
  }

  function finishRecording() {
    stopTimers();
    state = stackedCount > 0 ? "result" : "live";
    if (isUploadedVideo) {
      video.pause();
    }
    setStatus(stackedCount > 0 ? `完成（共 ${stackedCount} 格）` : "相機已連線");
    updateUI();
  }

  function startFlow() {
    if (!hasSource) return;
    if (state === "recording") {
      finishRecording();
      return;
    }
    if (state === "countdown") {
      stopTimers();
      state = "live";
      setStatus("已取消倒數");
      updateUI();
      return;
    }

    if (countdownEnabled && !isUploadedVideo) {
      state = "countdown";
      let sec = 3;
      countdownOverlay.textContent = String(sec);
      countdownOverlay.hidden = false;
      playBeep(520, 0.08, 0.12);
      setStatus("倒數準備中...", "warn");
      updateUI();

      countdownTimer = setInterval(() => {
        sec -= 1;
        if (sec > 0) {
          countdownOverlay.textContent = String(sec);
          playBeep(520, 0.08, 0.12);
        } else {
          countdownOverlay.hidden = true;
          clearInterval(countdownTimer);
          countdownTimer = null;
          beginRecording();
        }
      }, 1000);
    } else {
      beginRecording();
    }
  }

  function clearResult() {
    stopTimers();
    stackedCount = 0;
    bgImageData = null;
    compositeImageData = null;
    accumBuffer = null;
    pixelFrameId = null;
    windowFrames = [];
    state = "live";
    setStatus(isUploadedVideo ? "已載入影片" : hasSource ? "相機已連線" : "無相機支援", hasSource ? "normal" : "warn");
    updateUI();
  }

  function downloadResult() {
    if (stackedCount === 0) return;
    const link = document.createElement("a");
    link.download = `strobe-trail-${intervalMs}ms-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Event listeners
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  videoSelect.addEventListener("change", () => {
    startCamera(videoSelect.value);
  });

  mirrorBtn.addEventListener("click", () => {
    mirrorEnabled = !mirrorEnabled;
    mirrorBtn.classList.toggle("active", mirrorEnabled);
    mirrorBtn.textContent = mirrorEnabled ? "🪞 鏡像：開" : "🪞 鏡像：關";
  });

  countdownToggle.addEventListener("click", () => {
    countdownEnabled = !countdownEnabled;
    countdownToggle.classList.toggle("active", countdownEnabled);
    countdownToggle.textContent = countdownEnabled ? "⏱️ 3秒倒數：開" : "⏱️ 3秒倒數：關";
  });

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.classList.toggle("active", soundEnabled);
    soundToggle.textContent = soundEnabled ? "🔊 節拍音：開" : "🔇 節拍音：關";
  });

  startBtn.addEventListener("click", startFlow);
  clearBtn.addEventListener("click", clearResult);
  downloadBtn.addEventListener("click", downloadResult);

  intervalRange.addEventListener("input", () => {
    intervalMs = Number(intervalRange.value);
    presetBtns.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.ms) === intervalMs);
    });
    if (state === "recording") {
      clearInterval(strobeTimer);
      strobeTimer = setInterval(stepStrobe, intervalMs);
    }
    updateStats();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      intervalMs = Number(btn.dataset.ms);
      intervalRange.value = String(intervalMs);
      presetBtns.forEach((b) => b.classList.toggle("active", b === btn));
      if (state === "recording") {
        clearInterval(strobeTimer);
        strobeTimer = setInterval(stepStrobe, intervalMs);
      }
      updateStats();
    });
  });

  blendModeSelect.addEventListener("change", () => {
    blendMode = blendModeSelect.value;
    modeDesc.textContent = MODE_DESCRIPTIONS[blendMode] || "";
    thresholdGroup.style.display = blendMode === "motion" ? "flex" : "none";
  });

  thresholdRange.addEventListener("input", () => {
    motionThreshold = Number(thresholdRange.value);
    updateStats();
  });

  maxFramesRange.addEventListener("input", () => {
    maxFrames = Number(maxFramesRange.value);
    updateStats();
  });

  windowToggle.addEventListener("click", () => {
    slidingWindow = !slidingWindow;
    windowToggle.classList.toggle("active", slidingWindow);
    windowToggle.textContent = slidingWindow
      ? "🪟 滑動影格窗：開（只留最新 N 格）"
      : "🪟 滑動影格窗：關（滿格即停）";
    updateStats();
  });

  videoFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    stopTimers();
    stopMedia();

    isUploadedVideo = true;
    uploadedVideoUrl = URL.createObjectURL(file);
    video.srcObject = null;
    video.src = uploadedVideoUrl;
    video.loop = false;

    video.onloadedmetadata = () => {
      const vw = video.videoWidth || DEFAULT_W;
      const vh = video.videoHeight || DEFAULT_H;
      setCanvasSize(DEFAULT_W, Math.round((DEFAULT_W * vh) / vw) || DEFAULT_H);
      hasSource = true;
      state = "live";
      stackedCount = 0;
      setStatus("已載入影片（點開始疊加）");
      video.currentTime = 0;
      video.play().catch(() => {});
      updateUI();
    };

    video.onended = () => {
      if (state === "recording") {
        finishRecording();
      }
    };

    videoFileInput.value = "";
  });

  window.addEventListener("beforeunload", () => {
    stopTimers();
    if (rafId) cancelAnimationFrame(rafId);
    stopMedia();
  });

  // Init
  setCanvasSize(DEFAULT_W, DEFAULT_H);
  updateUI();
  livePreviewLoop();
  startCamera();
})();

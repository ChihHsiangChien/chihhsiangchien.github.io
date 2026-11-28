(() => {
  const DEFAULT_W = 640;
  const DEFAULT_H = 480;

  const videoSelect = document.getElementById("videoSource");
  const video = document.querySelector(".player");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const animationCanvas = document.getElementById("animationCanvas");
  const animationCtx = animationCanvas.getContext("2d");

  const statusBadge = document.getElementById("statusBadge");
  const onionLabel = document.getElementById("onionLabel");
  const animStats = document.getElementById("animStats");
  const frameCountText = document.getElementById("frameCountText");
  const shutterFlash = document.getElementById("shutterFlash");
  const cameraHiddenMsg = document.getElementById("cameraHiddenMsg");
  const emptyAnimMsg = document.getElementById("emptyAnimMsg");
  const filmstrip = document.getElementById("filmstrip");

  const mirrorBtn = document.getElementById("mirrorBtn");
  const fileInput = document.getElementById("fileInput");
  const snapshotBtn = document.getElementById("snapshot");
  const undoBtn = document.getElementById("undoFrame");
  const toggleOnionBtn = document.getElementById("toggleOnion");
  const hideCameraBtn = document.getElementById("hideCamera");
  const playPauseBtn = document.getElementById("playPause");
  const speedUpBtn = document.getElementById("speedUp");
  const speedDownBtn = document.getElementById("speedDown");
  const exportBtn = document.getElementById("exportBtn");
  const resetBtn = document.getElementById("reset");

  let W = DEFAULT_W;
  let H = DEFAULT_H;
  let stream = null;
  let hasCamera = false;
  let cameraVisible = true;
  let mirrorEnabled = true;
  let onionEnabled = true;

  const frames = []; // Array of offscreen HTMLCanvasElement
  let animationTimer = null;
  let isPlaying = true;
  let currentIndex = 0;
  let animationSpeed = 100; // ms per frame (50..1000)
  let previewRafId = null;

  let audioCtx = null;

  function unlockAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function playShutterSound() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  function setCanvasSize(w, h) {
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    animationCanvas.width = W;
    animationCanvas.height = H;
  }

  function setStatus(text, isWarn = false) {
    statusBadge.textContent = text;
    statusBadge.classList.toggle("warn", isWarn);
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const prevVal = videoSelect.value;
      videoSelect.innerHTML = "";
      let count = 0;
      for (const info of deviceInfos) {
        if (info.kind === "videoinput") {
          count += 1;
          const option = document.createElement("option");
          option.value = info.deviceId;
          option.textContent = info.label || `攝影機 ${count}`;
          videoSelect.appendChild(option);
        }
      }
      if (prevVal && [...videoSelect.options].some((o) => o.value === prevVal)) {
        videoSelect.value = prevVal;
      }
    } catch (err) {
      console.warn("enumerateDevices failed:", err);
    }
  }

  async function startCamera(deviceId) {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hasCamera = false;
      setStatus("無相機支援（可匯入圖片）", true);
      updateControls();
      return;
    }

    const constraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      await refreshDevices();
      if (track && track.label) {
        const idx = [...videoSelect.options].findIndex((o) => o.textContent === track.label);
        if (idx >= 0) videoSelect.selectedIndex = idx;
      }

      const vw = video.videoWidth || DEFAULT_W;
      const vh = video.videoHeight || DEFAULT_H;
      const targetH = Math.round((DEFAULT_W * vh) / vw) || DEFAULT_H;
      setCanvasSize(DEFAULT_W, targetH);

      hasCamera = true;
      setStatus("相機已連線");
      updateControls();
    } catch (err) {
      console.warn("Camera error:", err);
      hasCamera = false;
      setStatus("無相機權限（可匯入圖片）", true);
      updateControls();
    }
  }

  function renderPreviewLoop() {
    ctx.clearRect(0, 0, W, H);
    if (hasCamera && cameraVisible && video.readyState >= 2) {
      ctx.save();
      if (mirrorEnabled) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, W, H);
    }

    if (onionEnabled && cameraVisible && frames.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(frames[frames.length - 1], 0, 0, W, H);
      ctx.restore();
    }

    previewRafId = requestAnimationFrame(renderPreviewLoop);
  }

  function triggerShutterEffect() {
    shutterFlash.classList.add("flash");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        shutterFlash.classList.remove("flash");
      });
    });
    playShutterSound();
  }

  function createFrameFromCamera() {
    if (!hasCamera || video.readyState < 2) return;
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = W;
    frameCanvas.height = H;
    const fCtx = frameCanvas.getContext("2d");
    if (mirrorEnabled) {
      fCtx.translate(W, 0);
      fCtx.scale(-1, 1);
    }
    fCtx.drawImage(video, 0, 0, W, H);
    frames.push(frameCanvas);
    triggerShutterEffect();
    onFramesChanged(true);
  }

  function addFrameFromImage(img) {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = W;
    frameCanvas.height = H;
    const fCtx = frameCanvas.getContext("2d");
    fCtx.fillStyle = "#020617";
    fCtx.fillRect(0, 0, W, H);

    // Contain-fit imported image inside W x H
    const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    fCtx.drawImage(img, dx, dy, dw, dh);
    frames.push(frameCanvas);
  }

  function drawAnimationFrame(index) {
    animationCtx.clearRect(0, 0, W, H);
    if (frames.length === 0) return;
    const safeIdx = ((index % frames.length) + frames.length) % frames.length;
    animationCtx.drawImage(frames[safeIdx], 0, 0, W, H);
    highlightFilmstrip(safeIdx);
  }

  function highlightFilmstrip(activeIdx) {
    const items = filmstrip.querySelectorAll(".thumb-item");
    items.forEach((item, idx) => {
      item.classList.toggle("current", idx === activeIdx);
    });
  }

  function stopAnimationLoop() {
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
  }

  function startAnimationLoop() {
    stopAnimationLoop();
    if (frames.length === 0) {
      animationCtx.clearRect(0, 0, W, H);
      return;
    }
    if (currentIndex >= frames.length) currentIndex = 0;
    drawAnimationFrame(currentIndex);

    if (!isPlaying) return;
    animationTimer = setInterval(() => {
      if (frames.length === 0) return;
      currentIndex = (currentIndex + 1) % frames.length;
      drawAnimationFrame(currentIndex);
    }, animationSpeed);
  }

  function renderFilmstrip() {
    filmstrip.innerHTML = "";
    frames.forEach((frameCanvas, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thumb-item";
      if (idx === currentIndex) btn.classList.add("current");
      btn.title = `刪除第 ${idx + 1} 格`;

      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 92;
      thumbCanvas.height = 69;
      thumbCanvas.getContext("2d").drawImage(frameCanvas, 0, 0, 92, 69);

      const badge = document.createElement("span");
      badge.className = "thumb-index";
      badge.textContent = String(idx + 1);

      const del = document.createElement("span");
      del.className = "thumb-del";
      del.textContent = "×";

      btn.appendChild(thumbCanvas);
      btn.appendChild(badge);
      btn.appendChild(del);
      btn.addEventListener("click", () => {
        frames.splice(idx, 1);
        if (currentIndex >= frames.length) {
          currentIndex = Math.max(0, frames.length - 1);
        }
        onFramesChanged(false);
      });

      filmstrip.appendChild(btn);
    });
    filmstrip.scrollLeft = filmstrip.scrollWidth;
  }

  function updateStats() {
    const fps = (1000 / animationSpeed).toFixed(1);
    animStats.textContent = `${frames.length} 格 ｜ ${fps} FPS`;
    frameCountText.textContent = `共 ${frames.length} 格`;
  }

  function updateControls() {
    const hasFrames = frames.length > 0;
    snapshotBtn.disabled = !hasCamera;
    undoBtn.disabled = !hasFrames;
    playPauseBtn.disabled = !hasFrames;
    resetBtn.disabled = !hasFrames;
    exportBtn.disabled = !hasFrames || typeof MediaRecorder === "undefined" || !animationCanvas.captureStream;
    emptyAnimMsg.hidden = hasFrames;
    playPauseBtn.textContent = isPlaying ? "⏸️ 暫停" : "▶️ 播放";
    updateStats();
  }

  function onFramesChanged(jumpToLatest) {
    if (jumpToLatest && frames.length > 0) {
      currentIndex = frames.length - 1;
    }
    renderFilmstrip();
    updateControls();
    startAnimationLoop();
  }

  function changeSpeed(deltaMs) {
    animationSpeed = Math.min(1000, Math.max(50, animationSpeed + deltaMs));
    updateStats();
    startAnimationLoop();
  }

  function exportVideo() {
    if (frames.length === 0 || typeof MediaRecorder === "undefined" || !animationCanvas.captureStream) {
      return;
    }
    exportBtn.disabled = true;
    exportBtn.textContent = "⏳ 錄製中...";

    const streamOut = animationCanvas.captureStream(Math.max(2, Math.round(1000 / animationSpeed)));
    const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const recorder = mimeType ? new MediaRecorder(streamOut, { mimeType }) : new MediaRecorder(streamOut);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stop-motion-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      exportBtn.textContent = "💾 匯出影片";
      updateControls();
    };

    // Play at least 2 full loops or minimum 1.5s
    const durationMs = Math.max(1500, frames.length * animationSpeed * 2);
    const wasPlaying = isPlaying;
    isPlaying = true;
    currentIndex = 0;
    startAnimationLoop();
    recorder.start();

    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
      if (!wasPlaying) {
        isPlaying = false;
        startAnimationLoop();
      }
      updateControls();
    }, durationMs);
  }

  // Event bindings
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

  toggleOnionBtn.addEventListener("click", () => {
    onionEnabled = !onionEnabled;
    toggleOnionBtn.classList.toggle("active", onionEnabled);
    onionLabel.textContent = onionEnabled ? "🧅 洋蔥皮：開" : "🧅 洋蔥皮：關";
  });

  hideCameraBtn.addEventListener("click", () => {
    cameraVisible = !cameraVisible;
    cameraHiddenMsg.hidden = cameraVisible;
    hideCameraBtn.textContent = cameraVisible ? "👁️ 隱藏相機" : "👁️ 顯示相機";
  });

  snapshotBtn.addEventListener("click", createFrameFromCamera);

  undoBtn.addEventListener("click", () => {
    if (frames.length === 0) return;
    frames.pop();
    if (currentIndex >= frames.length) {
      currentIndex = Math.max(0, frames.length - 1);
    }
    onFramesChanged(false);
  });

  playPauseBtn.addEventListener("click", () => {
    if (frames.length === 0) return;
    isPlaying = !isPlaying;
    updateControls();
    startAnimationLoop();
  });

  speedUpBtn.addEventListener("click", () => changeSpeed(-20));
  speedDownBtn.addEventListener("click", () => changeSpeed(20));

  resetBtn.addEventListener("click", () => {
    frames.length = 0;
    currentIndex = 0;
    isPlaying = true;
    stopAnimationLoop();
    animationCtx.clearRect(0, 0, W, H);
    onFramesChanged(false);
  });

  exportBtn.addEventListener("click", exportVideo);

  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      await new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          addFrameFromImage(img);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    }
    fileInput.value = "";
    onFramesChanged(true);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.code === "Space" && hasCamera) {
      e.preventDefault();
      createFrameFromCamera();
    } else if ((e.code === "Backspace" || e.key.toLowerCase() === "z") && frames.length > 0) {
      e.preventDefault();
      undoBtn.click();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopAnimationLoop();
    if (previewRafId) cancelAnimationFrame(previewRafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
  });

  // Initialize
  setCanvasSize(DEFAULT_W, DEFAULT_H);
  updateControls();
  renderPreviewLoop();
  startCamera();
})();

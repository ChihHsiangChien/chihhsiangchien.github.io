(() => {
  const DEFAULT_W = 640;
  const DEFAULT_H = 480;

  const CVD_TYPES = {
    protanopia: {
      name: "紅色盲",
      label: "Protanopia",
      desc: "紅色盲（Protanopia）：缺乏 L 型（長波長／紅光）視錐細胞，紅色會顯得偏暗或接近黃褐色，難以分辨紅與綠。",
      matrix: [
        0.567, 0.433, 0.0,
        0.558, 0.442, 0.0,
        0.0, 0.242, 0.758,
      ],
    },
    protanomaly: {
      name: "紅色弱",
      label: "Protanomaly",
      desc: "紅色弱（Protanomaly）：L 型視錐細胞對紅光敏感度降低，紅色顯得較暗且飽和度較低。",
      matrix: [
        0.817, 0.183, 0.0,
        0.333, 0.667, 0.0,
        0.0, 0.125, 0.875,
      ],
    },
    deuteranopia: {
      name: "綠色盲",
      label: "Deuteranopia",
      desc: "綠色盲（Deuteranopia）：缺乏 M 型（中波長／綠光）視錐細胞，紅與綠容易混淆成相近的黃褐色調。",
      matrix: [
        0.625, 0.375, 0.0,
        0.7, 0.3, 0.0,
        0.0, 0.3, 0.7,
      ],
    },
    deuteranomaly: {
      name: "綠色弱",
      label: "Deuteranomaly",
      desc: "綠色弱（Deuteranomaly）：最常見的先天色覺差異，M 型視錐細胞光譜偏移，對綠與紅的區辨力下降。",
      matrix: [
        0.8, 0.2, 0.0,
        0.258, 0.742, 0.0,
        0.0, 0.142, 0.858,
      ],
    },
    tritanopia: {
      name: "藍色盲",
      label: "Tritanopia",
      desc: "藍色盲（Tritanopia）：缺乏 S 型（短波長／藍光）視錐細胞，難以分辨藍色與綠色、黃色與粉紫色。",
      matrix: [
        0.95, 0.05, 0.0,
        0.0, 0.433, 0.567,
        0.0, 0.475, 0.525,
      ],
    },
    tritanomaly: {
      name: "藍色弱",
      label: "Tritanomaly",
      desc: "藍色弱（Tritanomaly）：S 型視錐細胞功能較弱，藍黃色系的區分變得較模糊。",
      matrix: [
        0.967, 0.033, 0.0,
        0.0, 0.733, 0.267,
        0.0, 0.183, 0.817,
      ],
    },
    achromatopsia: {
      name: "全色盲",
      label: "Achromatopsia",
      desc: "全色盲（Achromatopsia）：幾乎完全無法分辨色相，世界呈現不同明暗層次的灰階。",
      matrix: [
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114,
      ],
    },
    normal: {
      name: "正常視覺",
      label: "Normal",
      desc: "正常三色視覺（Normal）：具備完整的紅（L）、綠（M）、藍（S）三種視錐細胞。",
      matrix: [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ],
    },
  };

  const videoSelect = document.getElementById("videoSource");
  const video = document.querySelector(".player");
  const origCanvas = document.getElementById("origCanvas");
  const origCtx = origCanvas.getContext("2d", { willReadFrequently: true });
  const simCanvas = document.getElementById("simCanvas");
  const simCtx = simCanvas.getContext("2d", { willReadFrequently: true });

  const statusBadge = document.getElementById("statusBadge");
  const stageContainer = document.getElementById("stageContainer");
  const simTitle = document.getElementById("simTitle");
  const simBadge = document.getElementById("simBadge");
  const simBox = document.getElementById("simBox");
  const splitLine = document.getElementById("splitLine");
  const cvdDesc = document.getElementById("cvdDesc");
  const presetBtns = document.querySelectorAll(".chip-btn");

  const mirrorBtn = document.getElementById("mirrorBtn");
  const fileInput = document.getElementById("fileInput");
  const sampleBtn = document.getElementById("sampleBtn");
  const layoutBtn = document.getElementById("layoutBtn");
  const freezeBtn = document.getElementById("freezeBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  let W = DEFAULT_W;
  let H = DEFAULT_H;
  let stream = null;
  let hasCamera = false;
  let sourceMode = "camera"; // "camera" | "image"
  let staticCanvas = document.createElement("canvas");
  let staticCtx = staticCanvas.getContext("2d");

  let currentType = "protanopia";
  let mirrorEnabled = true;
  let splitMode = false;
  let splitRatio = 0.5;
  let frozen = false;
  let activePointerId = null;
  let rafId = null;

  function setCanvasSize(w, h) {
    W = w;
    H = h;
    origCanvas.width = W;
    origCanvas.height = H;
    simCanvas.width = W;
    simCanvas.height = H;
    staticCanvas.width = W;
    staticCanvas.height = H;
  }

  function setStatus(text, isWarn = false) {
    statusBadge.textContent = text;
    statusBadge.classList.toggle("warn", isWarn);
  }

  function buildSamplePattern() {
    sourceMode = "image";
    frozen = false;
    freezeBtn.textContent = "📸 暫停定格";
    setCanvasSize(DEFAULT_W, DEFAULT_H);

    staticCtx.fillStyle = "#111827";
    staticCtx.fillRect(0, 0, W, H);

    // Color spectrum blocks (red, orange, yellow, green, cyan, blue, purple)
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
    const barW = W / colors.length;
    colors.forEach((col, i) => {
      staticCtx.fillStyle = col;
      staticCtx.fillRect(i * barW, 24, barW - 4, 120);
    });

    // Traffic light & red/green contrast test circles
    staticCtx.fillStyle = "#1f2937";
    staticCtx.fillRect(48, 175, 220, 270);
    [
      { y: 225, color: "#ef4444", label: "紅" },
      { y: 310, color: "#eab308", label: "黃" },
      { y: 395, color: "#22c55e", label: "綠" },
    ].forEach((item) => {
      staticCtx.beginPath();
      staticCtx.arc(158, item.y, 34, 0, Math.PI * 2);
      staticCtx.fillStyle = item.color;
      staticCtx.fill();
    });

    // Ishihara-inspired dot cluster (red-orange number "8" on green dots)
    const cx = 460;
    const cy = 310;
    const radius = 130;
    staticCtx.beginPath();
    staticCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    staticCtx.fillStyle = "#0f172a";
    staticCtx.fill();

    // Deterministic pseudo-random dots
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const isInsideEight = (x, y) => {
      const dx = x - cx;
      const dyTop = y - (cy - 38);
      const dyBot = y - (cy + 38);
      const rTop = Math.hypot(dx, dyTop);
      const rBot = Math.hypot(dx, dyBot);
      return (rTop < 42 && rTop > 18) || (rBot < 46 && rBot > 20);
    };

    for (let i = 0; i < 420; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * (radius - 10);
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const r = 4 + rand() * 5;
      const inNum = isInsideEight(x, y);
      const greenPalette = ["#22c55e", "#4ade80", "#16a34a", "#84cc16"];
      const redPalette = ["#ef4444", "#f97316", "#dc2626", "#fb7185"];
      const pal = inNum ? redPalette : greenPalette;
      staticCtx.beginPath();
      staticCtx.arc(x, y, r, 0, Math.PI * 2);
      staticCtx.fillStyle = pal[Math.floor(rand() * pal.length)];
      staticCtx.fill();
    }

    setStatus("內建色覺測試圖");
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const prev = videoSelect.value;
      videoSelect.innerHTML = "";
      let count = 0;
      for (const d of devices) {
        if (d.kind === "videoinput") {
          count += 1;
          const opt = document.createElement("option");
          opt.value = d.deviceId;
          opt.textContent = d.label || `攝影機 ${count}`;
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
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hasCamera = false;
      buildSamplePattern();
      setStatus("無相機支援（已載入測試圖）", true);
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
        const opt = [...videoSelect.options].find((o) => o.textContent === track.label);
        if (opt) videoSelect.value = opt.value;
      }

      const vw = video.videoWidth || DEFAULT_W;
      const vh = video.videoHeight || DEFAULT_H;
      setCanvasSize(DEFAULT_W, Math.round((DEFAULT_W * vh) / vw) || DEFAULT_H);

      hasCamera = true;
      sourceMode = "camera";
      frozen = false;
      freezeBtn.textContent = "📸 暫停定格";
      setStatus("相機已連線");
    } catch (err) {
      console.warn("Camera error:", err);
      hasCamera = false;
      buildSamplePattern();
      setStatus("無相機權限（已載入測試圖）", true);
    }
  }

  function applyCVDFilter() {
    const srcData = origCtx.getImageData(0, 0, W, H);
    const dstData = simCtx.createImageData(W, H);
    const src = srcData.data;
    const dst = dstData.data;

    const m = CVD_TYPES[currentType].matrix;
    const m0 = m[0], m1 = m[1], m2 = m[2];
    const m3 = m[3], m4 = m[4], m5 = m[5];
    const m6 = m[6], m7 = m[7], m8 = m[8];

    const splitX = splitMode ? Math.round(W * splitRatio) : -1;

    for (let y = 0; y < H; y++) {
      const rowOffset = y * W * 4;
      for (let x = 0; x < W; x++) {
        const i = rowOffset + x * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];

        if (splitMode && x < splitX) {
          dst[i] = r;
          dst[i + 1] = g;
          dst[i + 2] = b;
          dst[i + 3] = 255;
        } else {
          dst[i] = r * m0 + g * m1 + b * m2;
          dst[i + 1] = r * m3 + g * m4 + b * m5;
          dst[i + 2] = r * m6 + g * m7 + b * m8;
          dst[i + 3] = 255;
        }
      }
    }

    simCtx.putImageData(dstData, 0, 0);
  }

  function renderLoop() {
    if (!frozen) {
      if (sourceMode === "camera" && hasCamera && video.readyState >= 2) {
        origCtx.save();
        if (mirrorEnabled) {
          origCtx.translate(W, 0);
          origCtx.scale(-1, 1);
        }
        origCtx.drawImage(video, 0, 0, W, H);
        origCtx.restore();
      } else if (sourceMode === "image") {
        origCtx.drawImage(staticCanvas, 0, 0, W, H);
      }
    }

    applyCVDFilter();
    rafId = requestAnimationFrame(renderLoop);
  }

  function updateCVDSelection(type) {
    currentType = type;
    const info = CVD_TYPES[type];
    presetBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
    simTitle.textContent = splitMode
      ? `分割對比：正常 vs ${info.name}`
      : `色覺模擬：${info.name}`;
    simBadge.textContent = info.label;
    cvdDesc.textContent = info.desc;
  }

  function updateSplitFromPointer(clientX) {
    const rect = simBox.getBoundingClientRect();
    if (!rect.width) return;
    splitRatio = Math.min(0.95, Math.max(0.05, (clientX - rect.left) / rect.width));
    splitLine.style.left = `${(splitRatio * 100).toFixed(2)}%`;
  }

  // Event Listeners
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  videoSelect.addEventListener("change", () => {
    startCamera(videoSelect.value);
  });

  mirrorBtn.addEventListener("click", () => {
    mirrorEnabled = !mirrorEnabled;
    mirrorBtn.classList.toggle("active", mirrorEnabled);
    mirrorBtn.textContent = mirrorEnabled ? "🪞 鏡像：開" : "🪞 鏡像：關";
  });

  sampleBtn.addEventListener("click", buildSamplePattern);

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      sourceMode = "image";
      frozen = false;
      freezeBtn.textContent = "📸 暫停定格";
      const targetH = Math.round((DEFAULT_W * img.naturalHeight) / img.naturalWidth) || DEFAULT_H;
      setCanvasSize(DEFAULT_W, targetH);
      staticCtx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      setStatus("已載入圖片");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    fileInput.value = "";
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => updateCVDSelection(btn.dataset.type));
  });

  layoutBtn.addEventListener("click", () => {
    splitMode = !splitMode;
    stageContainer.classList.toggle("split-mode", splitMode);
    splitLine.hidden = !splitMode;
    layoutBtn.textContent = splitMode ? "🔀 切換為雙欄並排" : "▥ 切換為分割滑桿";
    updateCVDSelection(currentType);
  });

  freezeBtn.addEventListener("click", () => {
    frozen = !frozen;
    freezeBtn.textContent = frozen ? "▶️ 恢復即時" : "📸 暫停定格";
  });

  downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = `cvd-${currentType}-${Date.now()}.png`;
    link.href = simCanvas.toDataURL("image/png");
    link.click();
  });

  simBox.addEventListener("pointerdown", (e) => {
    if (!splitMode) return;
    activePointerId = e.pointerId;
    simBox.setPointerCapture(e.pointerId);
    updateSplitFromPointer(e.clientX);
  });

  simBox.addEventListener("pointermove", (e) => {
    if (!splitMode || activePointerId !== e.pointerId) return;
    updateSplitFromPointer(e.clientX);
  });

  function clearPointer(e) {
    if (activePointerId === e.pointerId) activePointerId = null;
  }
  simBox.addEventListener("pointerup", clearPointer);
  simBox.addEventListener("pointercancel", clearPointer);

  window.addEventListener("beforeunload", () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
  });

  // Init
  setCanvasSize(DEFAULT_W, DEFAULT_H);
  updateCVDSelection("protanopia");
  renderLoop();
  startCamera();
})();

(() => {
  'use strict';

  const video = document.querySelector('.player');
  const videoSelect = document.getElementById('videoSource');
  const fileInput = document.getElementById('fileInput');
  const camErrorEl = document.getElementById('cam-error');

  const sourceCanvas = document.getElementById('sourceCanvas');
  const sourceCtx = sourceCanvas.getContext('2d');
  const leftCanvas = document.getElementById('leftCanvas');
  const leftCtx = leftCanvas.getContext('2d');
  const rightCanvas = document.getElementById('rightCanvas');
  const rightCtx = rightCanvas.getContext('2d');

  // Offscreen buffer holding the clean (un-annotated) captured/live frame
  const bufferCanvas = document.createElement('canvas');
  const bufferCtx = bufferCanvas.getContext('2d');

  const btnSnapshot = document.getElementById('snapshot');
  const btnReset = document.getElementById('reset');
  const btnCenterLine = document.getElementById('btn-center-line');
  const btnDownload = document.getElementById('btn-download');
  const tiltSlider = document.getElementById('tiltSlider');
  const lblTilt = document.getElementById('lbl-tilt');
  const lineStatusEl = document.getElementById('line-status');
  const mirrorPreviewCheck = document.getElementById('mirrorPreviewCheck');

  let W = 640;
  let H = 480;
  let isLive = true;
  let hasImage = false;
  let mirrorPreview = true;
  let rafId = null;

  // Draggable symmetry line state: passes through (lineX * W, H/2) at tilt angle `lineAngleDeg`
  let lineNormX = 0.5;
  let lineAngleDeg = 0;

  function setCanvasDimensions(w, h) {
    W = w;
    H = h;
    [sourceCanvas, leftCanvas, rightCanvas, bufferCanvas].forEach((c) => {
      c.width = W;
      c.height = H;
    });
  }
  setCanvasDimensions(640, 480);

  // --- Camera Enumeration & Stream ---
  async function getStream() {
    if (window.stream) {
      window.stream.getTracks().forEach((t) => t.stop());
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camErrorEl.classList.remove('hidden');
      return;
    }

    const deviceId = videoSelect.value;
    const constraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      window.stream = stream;
      camErrorEl.classList.add('hidden');
      video.srcObject = stream;
      await video.play();
      await refreshDeviceList(stream);
      isLive = true;
      hasImage = true;
      updateButtons();
      startLoop();
    } catch (err) {
      console.error('Camera error:', err);
      camErrorEl.classList.remove('hidden');
    }
  }

  async function refreshDeviceList(stream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const currentId = stream.getVideoTracks()[0]?.getSettings()?.deviceId;
    videoSelect.innerHTML = '';
    let idx = 1;
    for (const d of devices) {
      if (d.kind === 'videoinput') {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.text = d.label || `攝影機 ${idx++}`;
        if (d.deviceId === currentId) opt.selected = true;
        videoSelect.appendChild(opt);
      }
    }
  }

  // --- Symmetry Reflection Rendering ---
  function renderSymmetryComposites() {
    if (!hasImage) return;

    const cx = lineNormX * W;
    const cy = H / 2;
    const rad = (lineAngleDeg * Math.PI) / 180;
    const big = Math.max(W, H) * 2;

    // 1. Draw clean image + interactive symmetry line on sourceCanvas
    sourceCtx.clearRect(0, 0, W, H);
    sourceCtx.drawImage(bufferCanvas, 0, 0, W, H);

    sourceCtx.save();
    sourceCtx.translate(cx, cy);
    sourceCtx.rotate(rad);

    // Symmetry line
    sourceCtx.strokeStyle = '#fb923c';
    sourceCtx.lineWidth = 3;
    sourceCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    sourceCtx.shadowBlur = 4;
    sourceCtx.beginPath();
    sourceCtx.moveTo(0, -big);
    sourceCtx.lineTo(0, big);
    sourceCtx.stroke();

    // Center grab handle
    sourceCtx.fillStyle = '#fb923c';
    sourceCtx.strokeStyle = '#ffffff';
    sourceCtx.lineWidth = 2.5;
    sourceCtx.beginPath();
    sourceCtx.arc(0, 0, 12, 0, Math.PI * 2);
    sourceCtx.fill();
    sourceCtx.stroke();
    sourceCtx.restore();

    // 2. Left-Face Composite (Left half-plane mirrored across the symmetry line)
    drawHalfMirror(leftCtx, cx, cy, rad, big, 'left');

    // 3. Right-Face Composite (Right half-plane mirrored across the symmetry line)
    drawHalfMirror(rightCtx, cx, cy, rad, big, 'right');

    lineStatusEl.textContent = `位置 ${Math.round(lineNormX * 100)}% · ${lineAngleDeg.toFixed(1)}°`;
  }

  function drawHalfMirror(targetCtx, cx, cy, rad, big, side) {
    targetCtx.clearRect(0, 0, W, H);
    const clipX = side === 'left' ? -big : 0;

    // Original half
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate(rad);
    targetCtx.beginPath();
    targetCtx.rect(clipX, -big, big, big * 2);
    targetCtx.clip();
    targetCtx.rotate(-rad);
    targetCtx.translate(-cx, -cy);
    targetCtx.drawImage(bufferCanvas, 0, 0, W, H);
    targetCtx.restore();

    // Mirrored half reflected across the line
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate(rad);
    targetCtx.scale(-1, 1);
    targetCtx.beginPath();
    targetCtx.rect(clipX, -big, big, big * 2);
    targetCtx.clip();
    targetCtx.rotate(-rad);
    targetCtx.translate(-cx, -cy);
    targetCtx.drawImage(bufferCanvas, 0, 0, W, H);
    targetCtx.restore();

    // Subtle seam indicator
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate(rad);
    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    targetCtx.lineWidth = 1;
    targetCtx.setLineDash([4, 4]);
    targetCtx.beginPath();
    targetCtx.moveTo(0, -big);
    targetCtx.lineTo(0, big);
    targetCtx.stroke();
    targetCtx.restore();
  }

  function loop() {
    if (isLive && video.readyState >= 2) {
      if (video.videoWidth && video.videoHeight && (video.videoWidth !== W || video.videoHeight !== H)) {
        setCanvasDimensions(video.videoWidth, video.videoHeight);
      }
      bufferCtx.save();
      if (mirrorPreview) {
        bufferCtx.translate(W, 0);
        bufferCtx.scale(-1, 1);
      }
      bufferCtx.drawImage(video, 0, 0, W, H);
      bufferCtx.restore();
      renderSymmetryComposites();
    }
    if (isLive) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  function startLoop() {
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function updateButtons() {
    btnSnapshot.disabled = !isLive;
    btnSnapshot.style.opacity = isLive ? '1' : '0.45';
  }

  // --- Pointer Dragging for Symmetry Line ---
  let dragPointerId = null;

  function updateLineFromPointer(e) {
    const rect = sourceCanvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    lineNormX = Math.max(0.1, Math.min(0.9, normX));
    renderSymmetryComposites();
  }

  sourceCanvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragPointerId = e.pointerId;
    sourceCanvas.setPointerCapture(e.pointerId);
    updateLineFromPointer(e);
  });

  sourceCanvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragPointerId) return;
    updateLineFromPointer(e);
  });

  const endDrag = (e) => {
    if (e.pointerId === dragPointerId) dragPointerId = null;
  };
  sourceCanvas.addEventListener('pointerup', endDrag);
  sourceCanvas.addEventListener('pointercancel', endDrag);

  // --- Controls ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  videoSelect.addEventListener('change', getStream);

  btnSnapshot.addEventListener('click', () => {
    if (!hasImage) return;
    isLive = false;
    updateButtons();
    renderSymmetryComposites();
  });

  btnReset.addEventListener('click', () => {
    if (window.stream) {
      isLive = true;
      updateButtons();
      startLoop();
    } else {
      getStream();
    }
  });

  btnCenterLine.addEventListener('click', () => {
    lineNormX = 0.5;
    lineAngleDeg = 0;
    tiltSlider.value = '0';
    lblTilt.textContent = '0°';
    renderSymmetryComposites();
  });

  tiltSlider.addEventListener('input', (e) => {
    lineAngleDeg = parseFloat(e.target.value);
    lblTilt.textContent = `${lineAngleDeg.toFixed(1)}°`;
    renderSymmetryComposites();
  });

  mirrorPreviewCheck.addEventListener('change', (e) => {
    mirrorPreview = e.target.checked;
  });

  // Upload static photo fallback / testing
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        isLive = false;
        hasImage = true;
        camErrorEl.classList.add('hidden');
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        setCanvasDimensions(Math.round(img.width * scale), Math.round(img.height * scale));
        bufferCtx.drawImage(img, 0, 0, W, H);
        updateButtons();
        renderSymmetryComposites();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Download 3-panel comparison PNG
  btnDownload.addEventListener('click', () => {
    if (!hasImage) return;
    const out = document.createElement('canvas');
    out.width = W * 3;
    out.height = H;
    const octx = out.getContext('2d');
    octx.drawImage(sourceCanvas, 0, 0);
    octx.drawImage(leftCanvas, W, 0);
    octx.drawImage(rightCanvas, W * 2, 0);
    const link = document.createElement('a');
    link.download = 'symmetry-face.png';
    link.href = out.toDataURL('image/png');
    link.click();
  });

  getStream();
})();

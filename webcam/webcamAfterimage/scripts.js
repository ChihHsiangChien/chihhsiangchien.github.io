(() => {
  'use strict';

  const videoSelect = document.getElementById('videoSource');
  const fileInput = document.getElementById('fileInput');
  const video = document.querySelector('.player');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  const snapshotBtn = document.getElementById('snapshot');
  const autoGazeBtn = document.getElementById('btn-auto-gaze');
  const showGreyBtn = document.getElementById('showGrey');
  const guideText = document.getElementById('guide-text');
  const countdownBadge = document.getElementById('countdown-badge');
  const camErrorEl = document.getElementById('cam-error');

  let W = 640;
  let H = 480;
  let isLive = false;
  let hasImage = false;
  let mode = 'negative'; // 'negative' | 'grey'
  let rafId = null;
  let gazeTimer = null;

  function setCanvasSize(w, h) {
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    tempCanvas.width = W;
    tempCanvas.height = H;
  }
  setCanvasSize(640, 480);

  // --- Sound Chime for Auto Switch ---
  let audioCtx = null;
  function playSwitchChime() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    } catch (_) {}
  }

  function applyFilter(targetMode) {
    if (!hasImage) return;
    const imgData = tempCtx.getImageData(0, 0, W, H);
    const d = imgData.data;

    if (targetMode === 'negative') {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    } else {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function loop() {
    if (isLive && video.readyState >= 2) {
      if (video.videoWidth && video.videoHeight && (video.videoWidth !== W || video.videoHeight !== H)) {
        setCanvasSize(video.videoWidth, video.videoHeight);
      }
      // Mirror live webcam horizontally for natural self-view
      tempCtx.save();
      tempCtx.translate(W, 0);
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(video, 0, 0, W, H);
      tempCtx.restore();
      applyFilter(mode);
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

  function stopGazeTimer() {
    if (gazeTimer) {
      clearInterval(gazeTimer);
      gazeTimer = null;
    }
    countdownBadge.classList.add('hidden');
  }

  function updateUI() {
    snapshotBtn.textContent = isLive ? '📸 拍照定格' : '🔄 重新拍照';
    autoGazeBtn.disabled = isLive || !hasImage;
    showGreyBtn.textContent = mode === 'negative' ? '🌗 切換為：灰階' : '🌗 切換為：負片';
  }

  async function getStream() {
    if (window.stream) {
      window.stream.getTracks().forEach((t) => t.stop());
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camErrorEl.classList.remove('hidden');
      return;
    }

    const deviceId = videoSelect.value;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }
      });
      window.stream = stream;
      camErrorEl.classList.add('hidden');
      video.srcObject = stream;
      await video.play();
      await refreshDevices(stream);
      isLive = true;
      hasImage = true;
      mode = 'negative';
      stopGazeTimer();
      updateUI();
      startLoop();
    } catch (err) {
      console.error(err);
      camErrorEl.classList.remove('hidden');
    }
  }

  async function refreshDevices(stream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const curId = stream.getVideoTracks()[0]?.getSettings()?.deviceId;
    videoSelect.innerHTML = '';
    let idx = 1;
    for (const d of devices) {
      if (d.kind === 'videoinput') {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.text = d.label || `攝影機 ${idx++}`;
        if (d.deviceId === curId) opt.selected = true;
        videoSelect.appendChild(opt);
      }
    }
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  videoSelect.addEventListener('change', getStream);

  snapshotBtn.addEventListener('click', () => {
    stopGazeTimer();
    if (isLive) {
      isLive = false;
      mode = 'negative';
      applyFilter('negative');
      guideText.innerHTML = '步驟 2：請盯著中央 <strong>紅點</strong>，點選「⏱️ 15秒凝視自動切灰階」或手動切換！';
    } else if (window.stream) {
      isLive = true;
      mode = 'negative';
      guideText.innerHTML = '步驟 1：按下 <strong>📸 拍照定格</strong>（或上傳照片），接著盯著畫面中央的 <strong>紅點</strong> 看 15 秒！';
      startLoop();
    } else {
      getStream();
    }
    updateUI();
  });

  showGreyBtn.addEventListener('click', () => {
    if (!hasImage) return;
    stopGazeTimer();
    isLive = false;
    mode = mode === 'negative' ? 'grey' : 'negative';
    applyFilter(mode);
    updateUI();
  });

  autoGazeBtn.addEventListener('click', () => {
    if (!hasImage || isLive) return;
    stopGazeTimer();
    mode = 'negative';
    applyFilter('negative');
    updateUI();

    let sec = 15;
    countdownBadge.textContent = String(sec);
    countdownBadge.classList.remove('hidden');
    guideText.innerHTML = '👀 <strong>請專心盯著中央紅點，不要轉移視線！</strong>';

    gazeTimer = setInterval(() => {
      sec--;
      if (sec <= 0) {
        stopGazeTimer();
        mode = 'grey';
        applyFilter('grey');
        updateUI();
        playSwitchChime();
        guideText.innerHTML = '✨ <strong>現在看到彩色了嗎？</strong> 其實這張是純灰階照片！';
      } else {
        countdownBadge.textContent = String(sec);
      }
    }, 1000);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        stopGazeTimer();
        isLive = false;
        hasImage = true;
        camErrorEl.classList.add('hidden');
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        setCanvasSize(Math.round(img.width * scale), Math.round(img.height * scale));
        tempCtx.drawImage(img, 0, 0, W, H);
        mode = 'negative';
        applyFilter('negative');
        guideText.innerHTML = '步驟 2：請盯著中央 <strong>紅點</strong>，點選「⏱️ 15秒凝視自動切灰階」或手動切換！';
        updateUI();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  getStream();
})();

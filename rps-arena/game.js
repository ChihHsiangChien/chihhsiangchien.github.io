(() => {
  'use strict';

  // --- Faction Configuration ---
  const FACTIONS = {
    rock: {
      name: '石頭',
      emoji: '✊',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.2)',
      glow: 'rgba(249, 115, 22, 0.55)',
      beats: 'scissors'
    },
    scissors: {
      name: '剪刀',
      emoji: '✌️',
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.2)',
      glow: 'rgba(6, 182, 212, 0.55)',
      beats: 'paper'
    },
    paper: {
      name: '布',
      emoji: '🖐️',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.2)',
      glow: 'rgba(16, 185, 129, 0.55)',
      beats: 'rock'
    }
  };

  const FACTION_KEYS = ['rock', 'scissors', 'paper'];

  // --- Web Audio Synthesizer ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.lastBounceAt = 0;
      this.lastConvertAt = 0;
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playBounce(intensity = 0.5) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastBounceAt < 0.045) return;
      this.lastBounceAt = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 220 + Math.random() * 80;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.06);

      const vol = Math.min(0.08, 0.03 + intensity * 0.05);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }

    playConvert(winnerType) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastConvertAt < 0.035) return;
      this.lastConvertAt = now;

      if (winnerType === 'rock') {
        // Punchy low thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (winnerType === 'scissors') {
        // Crisp double snip
        [0, 0.04].forEach((offset) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(980, now + offset);
          osc.frequency.exponentialRampToValueAtTime(340, now + offset + 0.05);
          gain.gain.setValueAtTime(0.11, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.055);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.06);
        });
      } else {
        // Paper wrap: warm rising chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    }

    playShockwave() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    playSpawn() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }

    playVictory() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.1;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.44);
      });
    }
  }

  // --- DOM Elements ---
  const canvas = document.getElementById('arena-canvas');
  const ctx = canvas.getContext('2d');

  const countEls = {
    rock: document.getElementById('count-rock'),
    scissors: document.getElementById('count-scissors'),
    paper: document.getElementById('count-paper')
  };
  const barEls = {
    rock: document.getElementById('bar-rock'),
    scissors: document.getElementById('bar-scissors'),
    paper: document.getElementById('bar-paper')
  };

  const timerEl = document.getElementById('timer-val');
  const streakEl = document.getElementById('streak-val');
  const soundBtn = document.getElementById('btn-sound');
  const soundIcon = document.getElementById('sound-icon');

  const startOverlay = document.getElementById('start-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');
  const winnerEmojiEl = document.getElementById('winner-emoji');
  const winnerTitleEl = document.getElementById('winner-title');
  const predictionResultEl = document.getElementById('prediction-result');
  const vTimeEl = document.getElementById('v-time');
  const vConversionsEl = document.getElementById('v-conversions');
  const vTotalEl = document.getElementById('v-total');

  const btnStart = document.getElementById('btn-start');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnPause = document.getElementById('btn-pause');
  const btnRestart = document.getElementById('btn-restart');
  const btnSpeed = document.getElementById('btn-speed');
  const countSlider = document.getElementById('count-slider');
  const sliderVal = document.getElementById('slider-val');

  // --- Game State ---
  const sound = new SoundEngine();
  let width = 800;
  let height = 600;
  let dpr = 1;

  let entities = [];
  let particles = [];
  let shockwaves = [];

  let countPerFaction = 12;
  let speedMultiplier = 1;
  const SPEED_STEPS = [1, 1.5, 2];
  let speedIdx = 0;

  let isRunning = false;
  let isPaused = false;
  let isGameOver = false;
  let elapsedSec = 0;
  let conversionCount = 0;
  let predictedWinner = 'rock';
  let winStreak = 0;
  let activeTool = 'shockwave';
  let lastFrameTime = 0;
  let victoryTimers = [];

  function clearVictoryTimers() {
    for (const id of victoryTimers) clearTimeout(id);
    victoryTimers = [];
  }

  function syncControlState() {
    btnPause.disabled = !isRunning || isGameOver;
    btnPause.textContent = isPaused ? '▶ 繼續' : '⏸ 暫停';
  }

  // --- Resize Handling ---
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(300, rect.width);
    height = Math.max(260, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Keep entities inside new bounds
    for (const e of entities) {
      e.x = Math.min(Math.max(e.r, e.x), width - e.r);
      e.y = Math.min(Math.max(e.r, e.y), height - e.r);
    }
  }

  window.addEventListener('resize', resizeCanvas);

  // --- Entity Spawning from Corners Toward Center ---
  function createEntity(type, x, y, vx, vy) {
    const radius = Math.max(18, Math.min(26, Math.min(width, height) * 0.036));
    return {
      type,
      x,
      y,
      vx,
      vy,
      r: radius,
      pop: 1,
      flash: 0
    };
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let cornerBadges = [];

  function spawnArena() {
    clearVictoryTimers();
    entities = [];
    particles = [];
    shockwaves = [];
    cornerBadges = [];
    elapsedSec = 0;
    conversionCount = 0;
    isGameOver = false;
    isPaused = false;
    syncControlState();

    const cx = width / 2;
    const cy = height / 2;
    const padX = Math.min(115, width * 0.16);
    const padY = Math.min(105, height * 0.16);

    // 4 equidistant corners from center; randomly pick 3 and shuffle faction assignment
    const allCorners = [
      { x: padX, y: padY },
      { x: width - padX, y: padY },
      { x: width - padX, y: height - padY },
      { x: padX, y: height - padY }
    ];
    const pickedCorners = shuffleArray(allCorners).slice(0, 3);
    const shuffledFactions = shuffleArray(FACTION_KEYS);

    const baseSpeed = Math.max(135, Math.min(210, Math.min(width, height) * 0.28));
    const spreadRadius = Math.min(68, Math.min(width, height) * 0.11);

    shuffledFactions.forEach((type, idx) => {
      const anchor = pickedCorners[idx];
      cornerBadges.push({
        type,
        x: anchor.x,
        y: anchor.y < cy ? Math.max(22, anchor.y - 48) : Math.min(height - 22, anchor.y + 48)
      });

      for (let i = 0; i < countPerFaction; i++) {
        const angleOffset = (Math.PI * 2 * i) / countPerFaction + Math.random() * 0.45;
        const dist = Math.sqrt(Math.random()) * spreadRadius;
        const x = Math.min(Math.max(24, anchor.x + Math.cos(angleOffset) * dist), width - 24);
        const y = Math.min(Math.max(24, anchor.y + Math.sin(angleOffset) * dist), height - 24);

        // Aim toward center of the arena with slight angular variation
        const toCenterAngle = Math.atan2(cy - y, cx - x) + (Math.random() - 0.5) * 0.45;
        const spd = baseSpeed * (0.88 + Math.random() * 0.28);

        entities.push(
          createEntity(
            type,
            x,
            y,
            Math.cos(toCenterAngle) * spd,
            Math.sin(toCenterAngle) * spd
          )
        );
      }
    });

    updateHUD();
  }

  // --- Visual FX Helpers ---
  function emitBurst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 170;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2.5 + Math.random() * 3.5,
        color
      });
    }
  }

  function addShockwave(x, y, color, maxR = 90) {
    shockwaves.push({
      x,
      y,
      r: 8,
      maxR,
      life: 0.35,
      maxLife: 0.35,
      color
    });
  }

  // --- Physics & RPS Rules ---
  function updateSimulation(dt) {
    if (!isRunning || isPaused || isGameOver) return;

    const simDt = dt * speedMultiplier;
    elapsedSec += simDt;

    const minSpeed = 105;
    const maxSpeed = 300;

    // 1. Move entities & bounce off walls
    for (const e of entities) {
      e.x += e.vx * simDt;
      e.y += e.vy * simDt;

      if (e.pop > 1) {
        e.pop = Math.max(1, e.pop - simDt * 3.2);
      }
      if (e.flash > 0) {
        e.flash = Math.max(0, e.flash - simDt * 3.5);
      }

      let hitWall = false;
      if (e.x - e.r < 0) {
        e.x = e.r;
        e.vx = Math.abs(e.vx);
        hitWall = true;
      } else if (e.x + e.r > width) {
        e.x = width - e.r;
        e.vx = -Math.abs(e.vx);
        hitWall = true;
      }

      if (e.y - e.r < 0) {
        e.y = e.r;
        e.vy = Math.abs(e.vy);
        hitWall = true;
      } else if (e.y + e.r > height) {
        e.y = height - e.r;
        e.vy = -Math.abs(e.vy);
        hitWall = true;
      }

      if (hitWall) {
        // Tiny angular jitter on wall bounce to keep paths unpredictable
        const jitter = (Math.random() - 0.5) * 0.12;
        const cosJ = Math.cos(jitter);
        const sinJ = Math.sin(jitter);
        const nvx = e.vx * cosJ - e.vy * sinJ;
        const nvy = e.vx * sinJ + e.vy * cosJ;
        e.vx = nvx;
        e.vy = nvy;
        sound.playBounce(0.3);
      }

      // Clamp velocity magnitude so units never stall or explode
      const spd = Math.hypot(e.vx, e.vy);
      if (spd < minSpeed) {
        const scale = minSpeed / (spd || 1);
        e.vx *= scale;
        e.vy *= scale;
      } else if (spd > maxSpeed) {
        const scale = maxSpeed / spd;
        e.vx *= scale;
        e.vy *= scale;
      }
    }

    // 2. Pairwise collisions: elastic bounce + RPS conversion
    for (let i = 0; i < entities.length; i++) {
      const a = entities[i];
      for (let j = i + 1; j < entities.length; j++) {
        const b = entities[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.r + b.r;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const ny = dy / dist;

          // Separate overlapping circles
          const overlap = (minDist - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Elastic velocity exchange along collision normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const relNormal = dvx * nx + dvy * ny;

          if (relNormal > 0) {
            a.vx -= relNormal * nx;
            a.vy -= relNormal * ny;
            b.vx += relNormal * nx;
            b.vy += relNormal * ny;
          }

          // RPS battle resolution
          if (a.type !== b.type) {
            let winner = null;
            let loser = null;
            if (FACTIONS[a.type].beats === b.type) {
              winner = a;
              loser = b;
            } else if (FACTIONS[b.type].beats === a.type) {
              winner = b;
              loser = a;
            }

            if (winner && loser) {
              loser.type = winner.type;
              loser.pop = 1.45;
              loser.flash = 1;
              winner.pop = 1.2;
              conversionCount++;

              const colX = (a.x + b.x) * 0.5;
              const colY = (a.y + b.y) * 0.5;
              const winColor = FACTIONS[winner.type].color;

              emitBurst(colX, colY, winColor, 10);
              addShockwave(colX, colY, winColor, 46);
              sound.playConvert(winner.type);
            }
          } else {
            sound.playBounce(0.2);
          }
        }
      }
    }

    // 3. Update particles & shockwaves
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * simDt;
      p.y += p.vy * simDt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= simDt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.life -= simDt;
      if (s.life <= 0) {
        shockwaves.splice(i, 1);
      } else {
        const progress = 1 - s.life / s.maxLife;
        s.r = 8 + (s.maxR - 8) * progress;
      }
    }

    updateHUD();
    checkVictory();
  }

  // --- HUD & Victory ---
  function formatTime(sec) {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  function getCounts() {
    const counts = { rock: 0, scissors: 0, paper: 0 };
    for (const e of entities) counts[e.type]++;
    return counts;
  }

  function updateHUD() {
    const counts = getCounts();
    const total = entities.length || 1;

    FACTION_KEYS.forEach((k) => {
      countEls[k].textContent = counts[k];
      barEls[k].style.width = `${(counts[k] / total) * 100}%`;
    });

    timerEl.textContent = formatTime(elapsedSec);
    streakEl.textContent = String(winStreak);
  }

  function checkVictory() {
    if (entities.length === 0) return;
    const counts = getCounts();
    const alive = FACTION_KEYS.filter((k) => counts[k] > 0);

    if (alive.length === 1) {
      const winnerKey = alive[0];
      isGameOver = true;
      syncControlState();
      sound.playVictory();

      // Victory confetti burst
      for (let i = 0; i < 5; i++) {
        const tid = setTimeout(() => {
          emitBurst(
            width * (0.2 + Math.random() * 0.6),
            height * (0.2 + Math.random() * 0.6),
            FACTIONS[winnerKey].color,
            24
          );
        }, i * 110);
        victoryTimers.push(tid);
      }

      const info = FACTIONS[winnerKey];
      winnerEmojiEl.textContent = info.emoji;
      winnerTitleEl.textContent = `${info.name} 稱霸全場！`;

      if (predictedWinner === winnerKey) {
        winStreak++;
        predictionResultEl.textContent = `🎯 預測神準！你押對了 ${info.name}（連勝 ${winStreak}）`;
        predictionResultEl.className = 'predict-result win';
      } else {
        winStreak = 0;
        predictionResultEl.textContent = `😅 預測失利！你原本預測 ${FACTIONS[predictedWinner].name}`;
        predictionResultEl.className = 'predict-result lose';
      }

      streakEl.textContent = String(winStreak);
      vTimeEl.textContent = formatTime(elapsedSec);
      vConversionsEl.textContent = String(conversionCount);
      vTotalEl.textContent = String(entities.length);

      victoryOverlay.classList.add('visible');
    }
  }

  function drawRoundRectPath(x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // --- Custom Colored Vector Character Icons ---
  function drawCharacterIcon(type, r, isFlashing) {
    const s = r * 0.92;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (type === 'rock') {
      // Chunky faceted rock/fist in vibrant orange-red
      ctx.fillStyle = isFlashing ? '#ffffff' : '#fb923c';
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, -s * 0.35);
      ctx.lineTo(-s * 0.2, -s * 0.85);
      ctx.lineTo(s * 0.45, -s * 0.72);
      ctx.lineTo(s * 0.88, -s * 0.15);
      ctx.lineTo(s * 0.72, s * 0.62);
      ctx.lineTo(s * 0.05, s * 0.86);
      ctx.lineTo(-s * 0.68, s * 0.58);
      ctx.lineTo(-s * 0.88, s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner facet highlight
      ctx.strokeStyle = 'rgba(255, 237, 213, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.25);
      ctx.lineTo(-s * 0.12, -s * 0.56);
      ctx.lineTo(s * 0.36, -s * 0.44);
      ctx.stroke();
    } else if (type === 'scissors') {
      // Crossed scissor blades + finger loops in electric cyan
      const bladeColor = isFlashing ? '#ffffff' : '#22d3ee';
      const darkEdge = '#083344';

      // Blades
      ctx.strokeStyle = darkEdge;
      ctx.lineWidth = Math.max(5, s * 0.34);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.4);
      ctx.lineTo(s * 0.72, -s * 0.72);
      ctx.moveTo(s * 0.4, s * 0.4);
      ctx.lineTo(-s * 0.72, -s * 0.72);
      ctx.stroke();

      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = Math.max(3, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.4);
      ctx.lineTo(s * 0.72, -s * 0.72);
      ctx.moveTo(s * 0.4, s * 0.4);
      ctx.lineTo(-s * 0.72, -s * 0.72);
      ctx.stroke();

      // Finger loops
      [-s * 0.44, s * 0.44].forEach((lx) => {
        ctx.fillStyle = '#0e7490';
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(lx, s * 0.54, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Center pivot pin
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Open 5-finger hand / sheet in vibrant emerald green
      ctx.fillStyle = isFlashing ? '#ffffff' : '#34d399';
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2.2;

      // Palm base
      drawRoundRectPath(-s * 0.46, -s * 0.15, s * 0.92, s * 0.85, s * 0.32);
      ctx.fill();
      ctx.stroke();

      // 4 upright fingers + 1 thumb
      const fingers = [
        { x: -s * 0.36, y: -s * 0.68, w: s * 0.18, h: s * 0.62 },
        { x: -s * 0.14, y: -s * 0.86, w: s * 0.18, h: s * 0.78 },
        { x: s * 0.08, y: -s * 0.82, w: s * 0.18, h: s * 0.74 },
        { x: s * 0.3, y: -s * 0.62, w: s * 0.17, h: s * 0.56 }
      ];
      fingers.forEach((fg) => {
        drawRoundRectPath(fg.x, fg.y, fg.w, fg.h, fg.w * 0.5);
        ctx.fill();
        ctx.stroke();
      });

      // Thumb
      ctx.save();
      ctx.translate(-s * 0.48, s * 0.25);
      ctx.rotate(-0.65);
      drawRoundRectPath(-s * 0.1, -s * 0.42, s * 0.2, s * 0.5, s * 0.1);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Rendering ---
  function drawArena() {
    ctx.clearRect(0, 0, width, height);

    // Subtle center target rings
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    [70, 150, 240].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshair lines to center
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx, cy + 24);
    ctx.stroke();
    ctx.restore();

    // Dynamic fading corner spawn badges (visible for first 3 seconds)
    if (elapsedSec < 3.2) {
      const badgeAlpha = elapsedSec < 2 ? 0.55 : Math.max(0, 0.55 * (1 - (elapsedSec - 2) / 1.2));
      ctx.save();
      ctx.globalAlpha = badgeAlpha;
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of cornerBadges) {
        const f = FACTIONS[b.type];
        ctx.fillStyle = f.color;
        ctx.fillText(`${f.name}陣營`, b.x, b.y);
      }
      ctx.restore();
    }

    // Shockwaves
    for (const s of shockwaves) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = alpha * 0.75;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Entities
    for (const e of entities) {
      const f = FACTIONS[e.type];
      const drawR = e.r * e.pop;

      ctx.save();
      ctx.translate(e.x, e.y);

      // Faction-colored glow behind the character (no outer ring)
      ctx.shadowColor = e.flash > 0.2 ? '#ffffff' : f.glow;
      ctx.shadowBlur = e.flash > 0.2 ? 22 : 12;

      drawCharacterIcon(e.type, drawR, e.flash > 0.2);

      ctx.restore();
    }
  }

  function loop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    updateSimulation(dt);
    drawArena();
    requestAnimationFrame(loop);
  }

  // --- Interactive Canvas Actions ---
  canvas.addEventListener('pointerdown', (ev) => {
    sound.unlock();
    if (!isRunning || isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    if (activeTool === 'shockwave') {
      addShockwave(x, y, '#38bdf8', 130);
      sound.playShockwave();
      for (const e of entities) {
        const dx = e.x - x;
        const dy = e.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 0.1) {
          const force = ((150 - dist) / 150) * 320;
          e.vx += (dx / dist) * force;
          e.vy += (dy / dist) * force;
        }
      }
    } else {
      // Drop a new unit aimed toward center
      const ang = Math.atan2(height / 2 - y, width / 2 - x) + (Math.random() - 0.5) * 0.5;
      const spd = 175;
      const unit = createEntity(activeTool, x, y, Math.cos(ang) * spd, Math.sin(ang) * spd);
      unit.pop = 1.4;
      entities.push(unit);
      addShockwave(x, y, FACTIONS[activeTool].color, 55);
      sound.playSpawn();
      updateHUD();
    }
  });

  // --- UI Controls ---
  function setPrediction(type) {
    predictedWinner = type;
    document.querySelectorAll('.faction-pill').forEach((el) => {
      el.classList.toggle('active-predict', el.dataset.predict === type);
    });
    document.querySelectorAll('.predict-btn').forEach((el) => {
      el.classList.toggle('selected', el.dataset.type === type);
    });
  }

  document.querySelectorAll('.faction-pill').forEach((btn) => {
    btn.addEventListener('click', () => setPrediction(btn.dataset.predict));
  });

  document.querySelectorAll('.predict-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPrediction(btn.dataset.type));
  });

  // Prevent accidental double-tap/double-click zoom without locking pinch-zoom
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  // Unlock Web Audio on any first user interaction
  const unlockOnce = () => sound.unlock();
  document.addEventListener('pointerdown', unlockOnce, { passive: true });
  document.addEventListener('touchstart', unlockOnce, { passive: true });
  document.addEventListener('keydown', unlockOnce, { passive: true });

  btnStart.addEventListener('click', () => {
    sound.unlock();
    startOverlay.classList.remove('visible');
    isRunning = true;
    spawnArena();
  });

  btnPlayAgain.addEventListener('click', () => {
    sound.unlock();
    victoryOverlay.classList.remove('visible');
    isRunning = true;
    spawnArena();
  });

  btnRestart.addEventListener('click', () => {
    sound.unlock();
    startOverlay.classList.remove('visible');
    victoryOverlay.classList.remove('visible');
    isRunning = true;
    spawnArena();
  });

  btnPause.addEventListener('click', () => {
    if (!isRunning || isGameOver) return;
    isPaused = !isPaused;
    syncControlState();
  });

  btnSpeed.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % SPEED_STEPS.length;
    speedMultiplier = SPEED_STEPS[speedIdx];
    btnSpeed.textContent = `⚡ ${speedMultiplier}x`;
  });

  soundBtn.addEventListener('click', () => {
    sound.unlock();
    const on = sound.toggle();
    soundIcon.textContent = on ? '🔊' : '🔇';
  });

  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  countSlider.addEventListener('input', (e) => {
    countPerFaction = Number(e.target.value);
    sliderVal.textContent = String(countPerFaction);
  });

  countSlider.addEventListener('change', () => {
    if (isRunning) {
      victoryOverlay.classList.remove('visible');
      spawnArena();
    }
  });

  // --- Boot ---
  resizeCanvas();
  spawnArena();
  requestAnimationFrame(loop);
})();

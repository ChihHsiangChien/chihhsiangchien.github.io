(() => {
  'use strict';

  const SIZE = 8;

  const THEMES = {
    organs: [
      { id: 0, icon: '🧠', name: '大腦', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.24)', border: 'rgba(168, 85, 247, 0.5)' },
      { id: 1, icon: '🫀', name: '心臟', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.24)', border: 'rgba(239, 68, 68, 0.5)' },
      { id: 2, icon: '🫁', name: '肺臟', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.24)', border: 'rgba(56, 189, 248, 0.5)' },
      { id: 3, icon: '🧬', name: 'DNA',  color: '#10b981', bg: 'rgba(16, 185, 129, 0.24)', border: 'rgba(16, 185, 129, 0.5)' },
      { id: 4, icon: '🦴', name: '骨骼', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.24)', border: 'rgba(245, 158, 11, 0.5)' },
      { id: 5, icon: '🦠', name: '細胞', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.24)', border: 'rgba(132, 204, 22, 0.5)' }
    ],
    nature: [
      { id: 0, icon: '🦋', name: '蝴蝶', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.24)', border: 'rgba(56, 189, 248, 0.5)' },
      { id: 1, icon: '🍄', name: '蘑菇', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.24)', border: 'rgba(239, 68, 68, 0.5)' },
      { id: 2, icon: '🐸', name: '青蛙', color: '#10b981', bg: 'rgba(16, 185, 129, 0.24)', border: 'rgba(16, 185, 129, 0.5)' },
      { id: 3, icon: '🌻', name: '向日葵', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.24)', border: 'rgba(245, 158, 11, 0.5)' },
      { id: 4, icon: '🐢', name: '烏龜', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.24)', border: 'rgba(20, 184, 166, 0.5)' },
      { id: 5, icon: '🐝', name: '蜜蜂', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.24)', border: 'rgba(168, 85, 247, 0.5)' }
    ]
  };

  // --- Sound Engine ---
  const sound = {
    ctx: null,
    enabled: true,
    unlock() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f1, f2, dur = 0.09, type = 'triangle', vol = 0.14) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    },
    swap() { this.tone(330, 440, 0.06, 'sine', 0.1); },
    invalid() { this.tone(200, 140, 0.1, 'sawtooth', 0.08); },
    match(combo = 1) {
      const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      const f = notes[Math.min(combo - 1, notes.length - 1)];
      this.tone(f, f * 1.15, 0.12, 'triangle', 0.16);
    },
    special() { this.tone(440, 1120, 0.22, 'triangle', 0.18); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.18, 'triangle', 0.16), i * 90)); },
    lose() { this.tone(240, 90, 0.35, 'sawtooth', 0.14); }
  };

  // --- Procedural Multi-Track Background Music ---
  const BGM_TRACKS = [
    {
      name: '森林',
      stepMs: 250,
      leadType: 'triangle',
      bassType: 'sine',
      leadVol: 0.045,
      bassVol: 0.04,
      melody: [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 523.25, 440, 0],
      bass:   [130.81, 0, 196.00, 0, 146.83, 0, 196.00, 0, 164.81, 0, 196.00, 0, 130.81, 0, 196.00, 0]
    },
    {
      name: '實驗室',
      stepMs: 210,
      leadType: 'sine',
      bassType: 'triangle',
      leadVol: 0.05,
      bassVol: 0.035,
      melody: [587.33, 0, 698.46, 880, 783.99, 698.46, 659.25, 587.33, 523.25, 587.33, 698.46, 0, 880, 783.99, 698.46, 659.25],
      bass:   [146.83, 146.83, 0, 220, 174.61, 0, 196.00, 0, 130.81, 130.81, 0, 196.00, 146.83, 0, 220, 0]
    },
    {
      name: '星空',
      stepMs: 320,
      leadType: 'sine',
      bassType: 'sine',
      leadVol: 0.045,
      bassVol: 0.045,
      melody: [440, 523.25, 659.25, 0, 783.99, 659.25, 587.33, 523.25, 440, 0, 523.25, 659.25, 880, 783.99, 659.25, 0],
      bass:   [110.00, 0, 0, 164.81, 130.81, 0, 0, 196.00, 110.00, 0, 0, 164.81, 146.83, 0, 0, 164.81]
    }
  ];

  const bgm = {
    enabled: true,
    trackIdx: 0,
    step: 0,
    timerId: null,

    playNote(freq, dur, type, vol) {
      if (!sound.ctx || sound.ctx.state !== 'running' || !freq) return;
      const now = sound.ctx.currentTime;
      const osc = sound.ctx.createOscillator();
      const gain = sound.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(sound.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    },

    start() {
      if (!this.enabled || this.timerId || document.hidden) return;
      if (!sound.ctx || sound.ctx.state !== 'running') return;
      const track = BGM_TRACKS[this.trackIdx];
      this.timerId = setInterval(() => {
        if (!this.enabled || document.hidden || !sound.ctx || sound.ctx.state !== 'running') return;
        const t = BGM_TRACKS[this.trackIdx];
        const idx = this.step % t.melody.length;
        const mFreq = t.melody[idx];
        const bFreq = t.bass[idx];
        const dur = (t.stepMs / 1000) * 0.9;
        if (mFreq) this.playNote(mFreq, dur, t.leadType, t.leadVol);
        if (bFreq) this.playNote(bFreq, dur * 1.4, t.bassType, t.bassVol);
        this.step++;
      }, track.stepMs);
    },

    stop() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    },

    restartIfEnabled() {
      this.stop();
      if (this.enabled) this.start();
    },

    nextTrack() {
      this.trackIdx = (this.trackIdx + 1) % BGM_TRACKS.length;
      this.step = 0;
      this.restartIfEnabled();
      return BGM_TRACKS[this.trackIdx].name;
    },

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) this.start();
      else this.stop();
      return this.enabled;
    }
  };

  // --- DOM ---
  const boardEl = document.getElementById('board');
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas.getContext('2d');
  const levelEl = document.getElementById('val-level');
  const movesEl = document.getElementById('val-moves');
  const scoreEl = document.getElementById('val-score');
  const targetEl = document.getElementById('val-target');
  const progressFillEl = document.getElementById('progress-fill');
  const comboBadgeEl = document.getElementById('combo-badge');
  const toastEl = document.getElementById('toast');
  const overlayEl = document.getElementById('overlay');
  const modalEmojiEl = document.getElementById('modal-emoji');
  const modalTitleEl = document.getElementById('modal-title');
  const modalDescEl = document.getElementById('modal-desc');
  const modalBtnEl = document.getElementById('btn-modal-action');

  const btnHint = document.getElementById('btn-hint');
  const btnTrack = document.getElementById('btn-track');
  const btnBgm = document.getElementById('btn-bgm');
  const btnSound = document.getElementById('btn-sound');
  const btnRestart = document.getElementById('btn-restart');

  // --- State ---
  let currentTheme = 'organs';
  let grid = []; // grid[r][c] = { type: 0..5, special: null | 'row' | 'col' | 'bomb', fresh: bool }
  let level = 1;
  let score = 0;
  let targetScore = 1500;
  let movesLeft = 22;
  let selected = null; // { r, c }
  let hintPair = [];   // [{r,c}, {r,c}]
  let isBusy = false;
  let isLevelDone = false;

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // --- Visual FX Engine (Particles, Beams, Arcs, Floating Scores) ---
  let fxParticles = [];
  let fxRings = [];
  let fxBeams = [];
  let fxTexts = [];
  let fxSize = 400;

  function resizeFxCanvas() {
    const rect = boardEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fxSize = Math.max(200, rect.width);
    fxCanvas.width = Math.floor(fxSize * dpr);
    fxCanvas.height = Math.floor(fxSize * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeFxCanvas);

  function cellCenter(r, c) {
    const step = fxSize / SIZE;
    return { x: (c + 0.5) * step, y: (r + 0.5) * step };
  }

  function emitTileBurst(r, c, color) {
    const { x, y } = cellCenter(r, c);
    fxRings.push({ x, y, r: 4, maxR: (fxSize / SIZE) * 0.72, life: 0.28, maxLife: 0.28, color });
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 150;
      fxParticles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.5 + Math.random() * 3.5,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        color
      });
    }
  }

  function emitBeam(r, c, dir, color) {
    const { x, y } = cellCenter(r, c);
    if (dir === 'row') {
      fxBeams.push({ x1: 0, y1: y, x2: fxSize, y2: y, life: 0.3, maxLife: 0.3, color });
    } else {
      fxBeams.push({ x1: x, y1: 0, x2: x, y2: fxSize, life: 0.3, maxLife: 0.3, color });
    }
  }

  function emitBombArcs(fromR, fromC, keys, color) {
    const origin = cellCenter(fromR, fromC);
    for (const key of keys) {
      const [rr, cc] = key.split(',').map(Number);
      const dst = cellCenter(rr, cc);
      fxBeams.push({ x1: origin.x, y1: origin.y, x2: dst.x, y2: dst.y, life: 0.34, maxLife: 0.34, color });
    }
  }

  function emitFloatText(r, c, text, color = '#fde68a') {
    const { x, y } = cellCenter(r, c);
    fxTexts.push({ x, y, text, color, life: 0.75, maxLife: 0.75 });
  }

  function triggerBoardShake() {
    boardEl.classList.remove('shake');
    void boardEl.offsetWidth;
    boardEl.classList.add('shake');
  }

  let lastFxTime = 0;
  function fxLoop(ts = 0) {
    requestAnimationFrame(fxLoop);
    if (!lastFxTime) lastFxTime = ts;
    const dt = Math.min(0.05, (ts - lastFxTime) / 1000);
    lastFxTime = ts;

    fxCtx.clearRect(0, 0, fxSize, fxSize);

    for (let i = fxRings.length - 1; i >= 0; i--) {
      const ring = fxRings[i];
      ring.life -= dt;
      if (ring.life <= 0) { fxRings.splice(i, 1); continue; }
      const p = 1 - ring.life / ring.maxLife;
      fxCtx.save();
      fxCtx.globalAlpha = 1 - p;
      fxCtx.strokeStyle = ring.color;
      fxCtx.lineWidth = 3;
      fxCtx.beginPath();
      fxCtx.arc(ring.x, ring.y, 4 + ring.maxR * p, 0, Math.PI * 2);
      fxCtx.stroke();
      fxCtx.restore();
    }

    for (let i = fxBeams.length - 1; i >= 0; i--) {
      const b = fxBeams[i];
      b.life -= dt;
      if (b.life <= 0) { fxBeams.splice(i, 1); continue; }
      const alpha = b.life / b.maxLife;
      fxCtx.save();
      fxCtx.globalAlpha = alpha;
      fxCtx.shadowColor = b.color;
      fxCtx.shadowBlur = 14;
      fxCtx.strokeStyle = '#ffffff';
      fxCtx.lineWidth = 6 * alpha;
      fxCtx.beginPath();
      fxCtx.moveTo(b.x1, b.y1);
      fxCtx.lineTo(b.x2, b.y2);
      fxCtx.stroke();
      fxCtx.restore();
    }

    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const pt = fxParticles[i];
      pt.life -= dt;
      if (pt.life <= 0) { fxParticles.splice(i, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.93;
      pt.vy *= 0.93;
      fxCtx.save();
      fxCtx.globalAlpha = pt.life / pt.maxLife;
      fxCtx.fillStyle = pt.color;
      fxCtx.beginPath();
      fxCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.restore();
    }

    for (let i = fxTexts.length - 1; i >= 0; i--) {
      const t = fxTexts[i];
      t.life -= dt;
      if (t.life <= 0) { fxTexts.splice(i, 1); continue; }
      t.y -= 36 * dt;
      fxCtx.save();
      fxCtx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.4);
      fxCtx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif';
      fxCtx.textAlign = 'center';
      fxCtx.fillStyle = '#000000';
      fxCtx.fillText(t.text, t.x + 1, t.y + 1);
      fxCtx.fillStyle = t.color;
      fxCtx.fillText(t.text, t.x, t.y);
      fxCtx.restore();
    }
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(() => toastEl.classList.add('hidden'), 1800);
  }

  function randomTile(fresh = false) {
    return {
      type: Math.floor(Math.random() * THEMES[currentTheme].length),
      special: null,
      fresh
    };
  }

  function createInitialGrid() {
    grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => randomTile(false)));
    // Remove initial accidental matches
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        while (
          (c >= 2 && grid[r][c].type === grid[r][c - 1].type && grid[r][c].type === grid[r][c - 2].type) ||
          (r >= 2 && grid[r][c].type === grid[r - 1][c].type && grid[r][c].type === grid[r - 2][c].type)
        ) {
          grid[r][c] = randomTile(false);
        }
      }
    }
    ensurePlayable();
  }

  function findMatches() {
    const matchedSet = new Set();
    const groups = [];

    // Horizontal runs
    for (let r = 0; r < SIZE; r++) {
      let c = 0;
      while (c < SIZE) {
        const t = grid[r][c];
        if (!t) { c++; continue; }
        let end = c + 1;
        while (end < SIZE && grid[r][end] && grid[r][end].type === t.type) end++;
        if (end - c >= 3) {
          const cells = [];
          for (let k = c; k < end; k++) {
            matchedSet.add(`${r},${k}`);
            cells.push({ r, c: k });
          }
          groups.push({ dir: 'h', cells });
        }
        c = end;
      }
    }

    // Vertical runs
    for (let c = 0; c < SIZE; c++) {
      let r = 0;
      while (r < SIZE) {
        const t = grid[r][c];
        if (!t) { r++; continue; }
        let end = r + 1;
        while (end < SIZE && grid[end][c] && grid[end][c].type === t.type) end++;
        if (end - r >= 3) {
          const cells = [];
          for (let k = r; k < end; k++) {
            matchedSet.add(`${k},${c}`);
            cells.push({ r: k, c });
          }
          groups.push({ dir: 'v', cells });
        }
        r = end;
      }
    }

    return { matchedSet, groups };
  }

  function findValidMove() {
    const trySwap = (r1, c1, r2, c2) => {
      if (r2 >= SIZE || c2 >= SIZE) return false;
      if (grid[r1][c1].special === 'bomb' || grid[r2][c2].special === 'bomb') return true;
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      const has = findMatches().matchedSet.size > 0;
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      return has;
    };

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (trySwap(r, c, r, c + 1)) return [{ r, c }, { r, c: c + 1 }];
        if (trySwap(r, c, r + 1, c)) return [{ r, c }, { r: r + 1, c }];
      }
    }
    return null;
  }

  function ensurePlayable() {
    let attempts = 0;
    while (!findValidMove() && attempts < 20) {
      attempts++;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          grid[r][c].type = Math.floor(Math.random() * THEMES[currentTheme].length);
        }
      }
      // Clear accidental matches from shuffle
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          while (
            (c >= 2 && grid[r][c].type === grid[r][c - 1].type && grid[r][c].type === grid[r][c - 2].type) ||
            (r >= 2 && grid[r][c].type === grid[r - 1][c].type && grid[r][c].type === grid[r - 2][c].type)
          ) {
            grid[r][c].type = (grid[r][c].type + 1) % THEMES[currentTheme].length;
          }
        }
      }
    }
    if (attempts > 0) showToast('🔄 無可消除組合，自動洗牌！');
  }

  function renderBoard(matchedKeys = new Set()) {
    const palette = THEMES[currentTheme];
    boardEl.innerHTML = '';

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = grid[r][c];
        const div = document.createElement('div');
        div.className = 'tile';
        div.dataset.r = r;
        div.dataset.c = c;

        if (cell) {
          const item = palette[cell.type];
          div.style.background = item.bg;
          div.style.borderColor = item.border;

          if (cell.special === 'bomb') {
            div.classList.add('bomb');
            div.textContent = '🧬';
          } else {
            div.textContent = item.icon;
            if (cell.special === 'row' || cell.special === 'col') {
              const badge = document.createElement('span');
              badge.className = 'tile-badge';
              badge.textContent = cell.special === 'row' ? '↔️' : '↕️';
              div.appendChild(badge);
            }
          }

          if (cell.fresh) {
            div.classList.add('drop-in');
            cell.fresh = false;
          }
        }

        if (selected && selected.r === r && selected.c === c) {
          div.classList.add('selected');
        }
        if (hintPair.some((h) => h.r === r && h.c === c)) {
          div.classList.add('hint');
        }
        if (matchedKeys.has(`${r},${c}`)) {
          div.classList.add('matched');
        }

        boardEl.appendChild(div);
      }
    }
  }

  function updateHUD(combo = 0) {
    levelEl.textContent = String(level);
    movesEl.textContent = String(movesLeft);
    scoreEl.textContent = String(score);
    targetEl.textContent = String(targetScore);

    const pct = Math.min(100, Math.round((score / targetScore) * 100));
    progressFillEl.style.width = `${pct}%`;

    if (combo >= 2) {
      comboBadgeEl.textContent = `COMBO ×${combo}`;
      comboBadgeEl.classList.remove('hidden');
    } else {
      comboBadgeEl.classList.add('hidden');
    }
  }

  function expandSpecials(matchedSet) {
    const queue = Array.from(matchedSet).map((k) => {
      const [r, c] = k.split(',').map(Number);
      return { r, c };
    });
    const visited = new Set(matchedSet);

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const tile = grid[r][c];
      if (!tile || !tile.special) continue;

      if (tile.special === 'row') {
        for (let cc = 0; cc < SIZE; cc++) {
          const key = `${r},${cc}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ r, c: cc });
          }
        }
      } else if (tile.special === 'col') {
        for (let rr = 0; rr < SIZE; rr++) {
          const key = `${rr},${c}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ r: rr, c });
          }
        }
      }
    }
    return visited;
  }

  async function processCascades(swapOrigin = null) {
    let combo = 0;
    while (true) {
      const { matchedSet, groups } = findMatches();
      if (matchedSet.size === 0) break;

      combo++;
      // Spawn special tile for 4 or 5 matches
      let spawnSpecial = null;
      for (const g of groups) {
        if (g.cells.length >= 5) {
          const anchor = swapOrigin && g.cells.some((x) => x.r === swapOrigin.r && x.c === swapOrigin.c)
            ? swapOrigin
            : g.cells[Math.floor(g.cells.length / 2)];
          spawnSpecial = { ...anchor, special: 'bomb', type: grid[anchor.r][anchor.c].type };
        } else if (g.cells.length === 4 && !spawnSpecial) {
          const anchor = swapOrigin && g.cells.some((x) => x.r === swapOrigin.r && x.c === swapOrigin.c)
            ? swapOrigin
            : g.cells[1];
          spawnSpecial = { ...anchor, special: g.dir === 'h' ? 'col' : 'row', type: grid[anchor.r][anchor.c].type };
        }
      }
      swapOrigin = null;

      const finalClear = expandSpecials(matchedSet);
      const gained = finalClear.size * 25 * combo;
      score += gained;
      sound.match(combo);
      updateHUD(combo);

      // Emit particle bursts, special beams, and floating score
      const palette = THEMES[currentTheme];
      let sumR = 0, sumC = 0;
      for (const key of finalClear) {
        const [rr, cc] = key.split(',').map(Number);
        sumR += rr;
        sumC += cc;
        const cell = grid[rr][cc];
        const col = cell ? palette[cell.type].color : '#38bdf8';
        emitTileBurst(rr, cc, col);
        if (cell && (cell.special === 'row' || cell.special === 'col')) {
          emitBeam(rr, cc, cell.special, col);
        }
      }
      const avgR = sumR / finalClear.size;
      const avgC = sumC / finalClear.size;
      emitFloatText(avgR, avgC, combo >= 2 ? `+${gained} ×${combo}!` : `+${gained}`);
      if (combo >= 2 || finalClear.size >= 5) triggerBoardShake();

      renderBoard(finalClear);
      await sleep(200);

      for (const key of finalClear) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = null;
      }

      if (spawnSpecial) {
        grid[spawnSpecial.r][spawnSpecial.c] = {
          type: spawnSpecial.type,
          special: spawnSpecial.special,
          fresh: true
        };
        sound.special();
      }

      // Gravity collapse
      for (let c = 0; c < SIZE; c++) {
        let writeR = SIZE - 1;
        for (let r = SIZE - 1; r >= 0; r--) {
          if (grid[r][c] !== null) {
            if (writeR !== r) {
              grid[writeR][c] = grid[r][c];
              grid[r][c] = null;
            }
            writeR--;
          }
        }
        for (let r = writeR; r >= 0; r--) {
          grid[r][c] = randomTile(true);
        }
      }

      renderBoard();
      await sleep(220);
    }

    updateHUD(0);
    ensurePlayable();
    renderBoard();
  }

  async function attemptSwap(r1, c1, r2, c2) {
    if (isBusy || isLevelDone) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    isBusy = true;
    selected = null;
    hintPair = [];

    const a = grid[r1][c1];
    const b = grid[r2][c2];

    // Special: Color Bomb swapped with any tile clears all of that type
    if (a.special === 'bomb' || b.special === 'bomb') {
      const targetType = a.special === 'bomb' ? b.type : a.type;
      movesLeft--;
      const clearSet = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] && grid[r][c].type === targetType) clearSet.add(`${r},${c}`);
        }
      }
      const expanded = expandSpecials(clearSet);
      const gained = expanded.size * 35;
      score += gained;
      sound.special();
      updateHUD(2);

      const palette = THEMES[currentTheme];
      const bombR = a.special === 'bomb' ? r1 : r2;
      const bombC = a.special === 'bomb' ? c1 : c2;
      emitBombArcs(bombR, bombC, expanded, '#a5b4fc');
      for (const key of expanded) {
        const [rr, cc] = key.split(',').map(Number);
        const cell = grid[rr][cc];
        emitTileBurst(rr, cc, cell ? palette[cell.type].color : '#a5b4fc');
      }
      emitFloatText(bombR, bombC, `+${gained} 基因爆發!`, '#a5b4fc');
      triggerBoardShake();

      renderBoard(expanded);
      await sleep(220);

      for (const key of expanded) {
        const [rr, cc] = key.split(',').map(Number);
        grid[rr][cc] = null;
      }
      for (let c = 0; c < SIZE; c++) {
        let writeR = SIZE - 1;
        for (let r = SIZE - 1; r >= 0; r--) {
          if (grid[r][c] !== null) {
            if (writeR !== r) { grid[writeR][c] = grid[r][c]; grid[r][c] = null; }
            writeR--;
          }
        }
        for (let r = writeR; r >= 0; r--) grid[r][c] = randomTile(true);
      }
      renderBoard();
      await sleep(220);
      await processCascades();
      checkEndState();
      isBusy = false;
      return;
    }

    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    sound.swap();
    renderBoard();
    await sleep(130);

    if (findMatches().matchedSet.size === 0) {
      // Revert invalid swap
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      sound.invalid();
      renderBoard();
      isBusy = false;
      return;
    }

    movesLeft--;
    await processCascades({ r: r2, c: c2 });
    checkEndState();
    isBusy = false;
  }

  function checkEndState() {
    if (score >= targetScore) {
      isLevelDone = true;
      sound.win();
      modalEmojiEl.textContent = '🏆';
      modalTitleEl.textContent = `第 ${level} 關過關！`;
      modalDescEl.textContent = `你達成了 ${score} 分！準備挑戰下一關更豐富的生物組合。`;
      modalBtnEl.textContent = '進入下一關';
      overlayEl.classList.remove('hidden');
    } else if (movesLeft <= 0) {
      isLevelDone = true;
      sound.lose();
      modalEmojiEl.textContent = '🧪';
      modalTitleEl.textContent = '步數用盡！';
      modalDescEl.textContent = `本關得分 ${score} / 目標 ${targetScore}。再試一次吧！`;
      modalBtnEl.textContent = '重新挑戰本關';
      overlayEl.classList.remove('hidden');
    }
  }

  function startLevel(lvl) {
    level = lvl;
    score = 0;
    targetScore = 1500 + (lvl - 1) * 900;
    movesLeft = 22 + Math.min(8, lvl - 1);
    selected = null;
    hintPair = [];
    dragStart = null;
    isBusy = false;
    isLevelDone = false;
    fxParticles = [];
    fxRings = [];
    fxBeams = [];
    fxTexts = [];
    overlayEl.classList.add('hidden');
    createInitialGrid();
    updateHUD(0);
    renderBoard();
  }

  // --- Pointer Events (Tap-Tap + Swipe Drag) ---
  let dragStart = null; // { r, c, x, y, pointerId }

  boardEl.addEventListener('pointerdown', (e) => {
    sound.unlock();
    if (isBusy || isLevelDone) return;
    const tileEl = e.target.closest('.tile');
    if (!tileEl) return;

    const r = Number(tileEl.dataset.r);
    const c = Number(tileEl.dataset.c);
    dragStart = { r, c, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    boardEl.setPointerCapture(e.pointerId);
  });

  boardEl.addEventListener('pointermove', (e) => {
    if (!dragStart || e.pointerId !== dragStart.pointerId || isBusy) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const threshold = 22;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      const { r, c } = dragStart;
      dragStart = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        attemptSwap(r, c, r, c + (dx > 0 ? 1 : -1));
      } else {
        attemptSwap(r, c, r + (dy > 0 ? 1 : -1), c);
      }
    }
  });

  boardEl.addEventListener('pointerup', (e) => {
    if (!dragStart || e.pointerId !== dragStart.pointerId) return;
    const { r, c } = dragStart;
    dragStart = null;

    if (isBusy || isLevelDone) return;
    if (!selected) {
      selected = { r, c };
      renderBoard();
    } else if (selected.r === r && selected.c === c) {
      selected = null;
      renderBoard();
    } else if (Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1) {
      attemptSwap(selected.r, selected.c, r, c);
    } else {
      selected = { r, c };
      renderBoard();
    }
  });

  boardEl.addEventListener('pointercancel', () => { dragStart = null; });

  // --- Controls ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  const unlockOnce = () => {
    sound.unlock();
    if (bgm.enabled && !bgm.timerId) {
      setTimeout(() => bgm.start(), 60);
    }
  };
  document.addEventListener('pointerdown', unlockOnce, { passive: true });
  document.addEventListener('touchstart', unlockOnce, { passive: true });
  document.addEventListener('keydown', unlockOnce, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) bgm.stop();
    else bgm.restartIfEnabled();
  });

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isBusy) return;
      currentTheme = btn.dataset.theme;
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderBoard();
    });
  });

  btnHint.addEventListener('click', () => {
    sound.unlock();
    if (isBusy || isLevelDone) return;
    const pair = findValidMove();
    if (pair) {
      hintPair = pair;
      renderBoard();
    }
  });

  btnTrack.addEventListener('click', () => {
    sound.unlock();
    const name = bgm.nextTrack();
    btnTrack.textContent = `🎶 ${name}`;
    showToast(`🎵 切換背景音樂：${name}`);
  });

  btnBgm.addEventListener('click', () => {
    sound.unlock();
    const on = bgm.toggle();
    btnBgm.textContent = on ? '🎵' : '🔇';
    btnBgm.style.opacity = on ? '1' : '0.55';
  });

  btnSound.addEventListener('click', () => {
    sound.unlock();
    sound.enabled = !sound.enabled;
    btnSound.textContent = sound.enabled ? '🔊' : '🔇';
  });

  btnRestart.addEventListener('click', () => {
    sound.unlock();
    startLevel(1);
  });

  modalBtnEl.addEventListener('click', () => {
    sound.unlock();
    if (score >= targetScore) startLevel(level + 1);
    else startLevel(level);
  });

  // --- Boot ---
  resizeFxCanvas();
  requestAnimationFrame(fxLoop);
  startLevel(1);
})();

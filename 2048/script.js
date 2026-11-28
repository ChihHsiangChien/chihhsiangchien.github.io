(() => {
  'use strict';

  const GRID_SIZE = 4;
  const TILE_TYPES = [
    '細胞', '組織', '器官', '器官系統', '個體',
    '族群', '群集', '生態系', '生物圈', '地球', '太陽系', '宇宙', '虛空'
  ];

  const gameBoard = document.getElementById('game-board');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best-score');
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlay-title');
  const overlayDescEl = document.getElementById('overlay-desc');
  const btnOverlayAction = document.getElementById('btn-overlay-action');
  const btnRestart = document.getElementById('btn-restart');
  const btnSound = document.getElementById('btn-sound');

  document.documentElement.style.setProperty('--grid-size', GRID_SIZE);

  // --- Sound ---
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
    tone(f1, f2, dur = 0.08, vol = 0.12) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    },
    move() { this.tone(240, 280, 0.04, 0.07); },
    merge() { this.tone(420, 620, 0.09, 0.13); },
    over() { this.tone(220, 90, 0.3, 0.14); }
  };

  // --- State ---
  let grid = [];
  let score = 0;
  let bestScore = Number(localStorage.getItem('bio2048_best') || 0);
  let isAnimating = false;
  let isGameOver = false;
  let hasWon = false;
  let animTimer = null;

  function createGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
  }

  function addRandomTile() {
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) empty.push({ r, c });
      }
    }
    if (empty.length > 0) {
      const { r, c } = empty[Math.floor(Math.random() * empty.length)];
      grid[r][c] = Math.random() < 0.9 ? 0 : 1;
    }
  }

  function updateScore() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('bio2048_best', String(bestScore));
    }
    scoreEl.textContent = String(score);
    bestEl.textContent = String(bestScore);
  }

  function canMove() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) return true;
        if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true;
        if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true;
      }
    }
    return false;
  }

  function renderGrid(mergedSet = new Set()) {
    gameBoard.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        const tile = document.createElement('div');
        tile.className = 'tile';

        if (val !== null) {
          const label = TILE_TYPES[val] || TILE_TYPES[TILE_TYPES.length - 1];
          tile.textContent = label;
          const pow = Math.min(8192, Math.pow(2, val + 1));
          tile.classList.add(`tile-${pow}`);
          if (label.length >= 4) tile.classList.add('tile-long');

          if (mergedSet.has(`${r},${c}`)) {
            tile.style.transform = 'scale(1.1)';
            requestAnimationFrame(() => {
              setTimeout(() => { tile.style.transform = 'scale(1)'; }, 90);
            });
          }
        } else {
          tile.classList.add('tile-empty');
        }
        gameBoard.appendChild(tile);
      }
    }
  }

  function showOverlay(title, desc, btnText, isWin = false) {
    overlayTitleEl.textContent = title;
    overlayDescEl.textContent = desc;
    btnOverlayAction.textContent = btnText;
    btnOverlayAction.dataset.mode = isWin ? 'continue' : 'restart';
    overlayEl.classList.remove('hidden');
  }

  function initializeGame() {
    if (animTimer) clearTimeout(animTimer);
    animTimer = null;
    isAnimating = false;
    isGameOver = false;
    hasWon = false;
    score = 0;
    grid = createGrid();
    addRandomTile();
    addRandomTile();
    overlayEl.classList.add('hidden');
    updateScore();
    renderGrid();
  }

  function moveTiles(direction) {
    if (isAnimating || isGameOver) return;
    sound.unlock();

    const newGrid = createGrid();
    const mergedSet = new Set();
    let changed = false;
    let didMerge = false;

    const isVertical = direction === 'ArrowUp' || direction === 'ArrowDown';
    const isForward = direction === 'ArrowUp' || direction === 'ArrowLeft';

    for (let i = 0; i < GRID_SIZE; i++) {
      const line = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        const r = isVertical ? j : i;
        const c = isVertical ? i : j;
        if (grid[r][c] !== null) line.push(grid[r][c]);
      }
      if (!isForward) line.reverse();

      const out = [];
      let k = 0;
      while (k < line.length) {
        if (k + 1 < line.length && line[k] === line[k + 1]) {
          const nextVal = Math.min(TILE_TYPES.length - 1, line[k] + 1);
          score += (nextVal + 1) * 100;
          out.push({ val: nextVal, merged: true });
          didMerge = true;
          k += 2;
        } else {
          out.push({ val: line[k], merged: false });
          k++;
        }
      }

      for (let j = 0; j < out.length; j++) {
        const destIdx = isForward ? j : GRID_SIZE - 1 - j;
        const r = isVertical ? destIdx : i;
        const c = isVertical ? i : destIdx;
        newGrid[r][c] = out[j].val;
        if (out[j].merged) mergedSet.add(`${r},${c}`);
      }
    }

    for (let r = 0; r < GRID_SIZE && !changed; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] !== newGrid[r][c]) { changed = true; break; }
      }
    }

    if (!changed) return;

    isAnimating = true;
    grid = newGrid;
    if (didMerge) sound.merge();
    else sound.move();

    animTimer = setTimeout(() => {
      addRandomTile();
      renderGrid(mergedSet);
      updateScore();
      isAnimating = false;

      if (!hasWon && grid.some((row) => row.includes(TILE_TYPES.length - 1))) {
        hasWon = true;
        showOverlay('恭喜達成宇宙終極！', `目前分數：${score} 分`, '繼續挑戰', true);
      } else if (!canMove()) {
        isGameOver = true;
        sound.over();
        showOverlay('無法再移動了！', `最終分數：${score}（最高：${bestScore}）`, '再玩一局', false);
      }
    }, 90);
  }

  // --- Controls (Keyboard + Pointer Swipe + Anti-Zoom) ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  const unlockOnce = () => sound.unlock();
  document.addEventListener('pointerdown', unlockOnce, { passive: true });
  document.addEventListener('touchstart', unlockOnce, { passive: true });
  document.addEventListener('keydown', unlockOnce, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      moveTiles(e.key);
    }
  });

  let pointerStart = null;
  gameBoard.addEventListener('pointerdown', (e) => {
    pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    gameBoard.setPointerCapture(e.pointerId);
  });

  gameBoard.addEventListener('pointerup', (e) => {
    if (!pointerStart || e.pointerId !== pointerStart.id) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      moveTiles(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      moveTiles(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    }
  });

  gameBoard.addEventListener('pointercancel', () => { pointerStart = null; });

  btnRestart.addEventListener('click', () => {
    sound.unlock();
    initializeGame();
  });

  btnSound.addEventListener('click', () => {
    sound.unlock();
    sound.enabled = !sound.enabled;
    btnSound.textContent = sound.enabled ? '🔊' : '🔇';
  });

  btnOverlayAction.addEventListener('click', () => {
    sound.unlock();
    if (btnOverlayAction.dataset.mode === 'continue') {
      overlayEl.classList.add('hidden');
    } else {
      initializeGame();
    }
  });

  initializeGame();
})();

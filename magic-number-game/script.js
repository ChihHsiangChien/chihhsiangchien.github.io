(() => {
  'use strict';

  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const resultScreen = document.getElementById('result-screen');

  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const soundBtn = document.getElementById('sound-btn');
  const keys = document.querySelectorAll('.key');

  const currentLevelSpan = document.getElementById('current-level');
  const digitCountSpan = document.getElementById('digit-count');
  const bestLevelSpan = document.getElementById('best-level');
  const numberDisplay = document.getElementById('number-display');
  const memBarFill = document.getElementById('mem-bar-fill');
  const messageDisplay = document.getElementById('message-display');
  const inputDisplay = document.getElementById('input-display');

  const resultTitle = document.getElementById('result-title');
  const resultIcon = document.getElementById('result-icon');
  const finalScore = document.getElementById('final-score');
  const resultMessage = document.getElementById('result-message');

  const START_LEVEL = 5;
  let level = START_LEVEL;
  let bestLevel = Number(localStorage.getItem('magic_num_best') || START_LEVEL);
  let sequence = [];
  let userSequence = [];
  let isAcceptingInput = false;
  let timers = [];

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
    tone(f1, f2, dur = 0.07, type = 'triangle', vol = 0.12) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
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
    tap() { this.tone(440, 520, 0.04, 'sine', 0.08); },
    win() { this.tone(523, 784, 0.14, 'triangle', 0.14); },
    fail() { this.tone(200, 95, 0.25, 'sawtooth', 0.11); }
  };

  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers = [];
  }

  function showScreen(target) {
    [startScreen, gameScreen, resultScreen].forEach((s) => {
      s.classList.toggle('active', s === target);
    });
  }

  function updateBestUI() {
    bestLevelSpan.textContent = String(bestLevel);
  }

  function startGame() {
    clearTimers();
    sound.unlock();
    level = START_LEVEL;
    showScreen(gameScreen);
    startLevel();
  }

  function startLevel() {
    clearTimers();
    sequence = Array.from({ length: level }, () => Math.floor(Math.random() * 10));
    userSequence = [];
    isAcceptingInput = false;

    currentLevelSpan.textContent = String(level);
    digitCountSpan.textContent = String(level);
    numberDisplay.textContent = '...';
    numberDisplay.classList.remove('hidden');
    inputDisplay.textContent = '';
    inputDisplay.style.color = '';
    messageDisplay.classList.add('hidden');
    memBarFill.style.transition = 'none';
    memBarFill.style.width = '100%';

    timers.push(setTimeout(showSequence, 350));
  }

  function showSequence() {
    const displayTime = Math.max(1800, level * 650);
    numberDisplay.textContent = sequence.join(' ');

    // Animate memorization countdown bar
    requestAnimationFrame(() => {
      memBarFill.style.transition = `width ${displayTime}ms linear`;
      memBarFill.style.width = '0%';
    });

    timers.push(setTimeout(() => {
      numberDisplay.textContent = '';
      numberDisplay.classList.add('hidden');
      messageDisplay.classList.remove('hidden');
      isAcceptingInput = true;
    }, displayTime));
  }

  function handleInput(num) {
    if (!isAcceptingInput) return;
    sound.tap();
    userSequence.push(num);
    inputDisplay.textContent = userSequence.join(' ');

    if (userSequence.length === sequence.length) {
      isAcceptingInput = false;
      checkResult();
    }
  }

  function backspace() {
    if (!isAcceptingInput || userSequence.length === 0) return;
    userSequence.pop();
    inputDisplay.textContent = userSequence.join(' ');
  }

  function clearInput() {
    if (!isAcceptingInput) return;
    userSequence = [];
    inputDisplay.textContent = '';
  }

  function checkResult() {
    const correct = userSequence.join('') === sequence.join('');
    if (correct) {
      sound.win();
      inputDisplay.style.color = 'var(--success)';
      if (level > bestLevel) {
        bestLevel = level;
        localStorage.setItem('magic_num_best', String(bestLevel));
        updateBestUI();
      }
      timers.push(setTimeout(() => {
        inputDisplay.style.color = '';
        level++;
        startLevel();
      }, 750));
    } else {
      sound.fail();
      inputDisplay.classList.add('shake');
      timers.push(setTimeout(() => {
        inputDisplay.classList.remove('shake');
        endGame();
      }, 750));
    }
  }

  function endGame() {
    clearTimers();
    const completed = Math.max(0, level - 1);
    finalScore.textContent = String(completed);

    if (completed >= 9) {
      resultIcon.textContent = '🤯';
      resultTitle.textContent = '大師等級！';
      resultMessage.textContent = '你的記憶力超越了常人！(Magic Number 7 ± 2)';
    } else if (completed >= 7) {
      resultIcon.textContent = '🎉';
      resultTitle.textContent = '太強了！';
      resultMessage.textContent = '你達到了人類短期記憶的標準範圍。';
    } else if (completed >= 5) {
      resultIcon.textContent = '👍';
      resultTitle.textContent = '不錯喔！';
      resultMessage.textContent = '再接再厲，挑戰更高位數！';
    } else {
      resultIcon.textContent = '😅';
      resultTitle.textContent = '再試一次';
      resultMessage.textContent = '集中注意力，你可以的。';
    }

    showScreen(resultScreen);
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  const unlockOnce = () => sound.unlock();
  document.addEventListener('pointerdown', unlockOnce, { passive: true });
  document.addEventListener('touchstart', unlockOnce, { passive: true });
  document.addEventListener('keydown', unlockOnce, { passive: true });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.enabled = !sound.enabled;
    soundBtn.textContent = sound.enabled ? '🔊' : '🔇';
  });

  keys.forEach((key) => {
    key.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sound.unlock();
      const num = key.dataset.num;
      if (num !== undefined) handleInput(num);
      else if (key.id === 'clear-btn') clearInput();
      else if (key.id === 'backspace-btn') backspace();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!isAcceptingInput) return;
    if (e.key >= '0' && e.key <= '9') {
      handleInput(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
      clearInput();
    }
  });

  updateBestUI();
})();

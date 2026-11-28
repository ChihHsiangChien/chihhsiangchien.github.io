(() => {
  'use strict';

  class NumberSenseGame {
    constructor() {
      this.numAInput = document.getElementById('numA');
      this.numBInput = document.getElementById('numB');
      this.roundsInput = document.getElementById('rounds');
      this.showTimeInput = document.getElementById('showTime');
      this.feedbackToggle = document.getElementById('feedbackToggle');
      this.setupError = document.getElementById('setup-error');

      this.startBtn = document.getElementById('startBtn');
      this.restartBtn = document.getElementById('restartBtn');
      this.quitBtn = document.getElementById('quitBtn');
      this.soundBtn = document.getElementById('soundBtn');

      this.uiPanel = document.getElementById('ui-panel');
      this.playArea = document.getElementById('play-area');
      this.resultOverlay = document.getElementById('result-overlay');
      this.areaLeft = document.getElementById('areaLeft');
      this.areaRight = document.getElementById('areaRight');

      this.roundProgressEl = document.getElementById('round-progress');
      this.promptPillEl = document.getElementById('prompt-pill');
      this.accuracyText = document.getElementById('accuracy-text');
      this.scoreText = document.getElementById('score-text');
      this.rtText = document.getElementById('rt-text');
      this.resultEmoji = document.getElementById('result-emoji');

      this.currentRound = 0;
      this.totalRounds = 10;
      this.correctCount = 0;
      this.reactionTimes = [];
      this.promptShownAt = 0;
      this.numA = 9;
      this.numB = 10;
      this.displayTime = 1000;
      this.showFeedback = true;
      this.soundEnabled = true;
      this.isPlaying = false;
      this.canClick = false;
      this.correctSide = 'left';

      this.audioCtx = null;
      this.timers = [];

      this.bindEvents();
    }

    unlockAudio() {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.audioCtx = new Ctx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    clearTimers() {
      for (const id of this.timers) clearTimeout(id);
      this.timers = [];
    }

    playTone(freq, type, duration, vol = 0.12) {
      if (!this.soundEnabled || !this.audioCtx || this.audioCtx.state !== 'running') return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playCorrectSound() {
      this.playTone(587.33, 'triangle', 0.1, 0.14);
      this.timers.push(setTimeout(() => this.playTone(880, 'triangle', 0.16, 0.14), 80));
    }

    playWrongSound() {
      this.playTone(160, 'sawtooth', 0.24, 0.1);
    }

    bindEvents() {
      document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
      const unlockOnce = () => this.unlockAudio();
      document.addEventListener('pointerdown', unlockOnce, { passive: true });
      document.addEventListener('touchstart', unlockOnce, { passive: true });
      document.addEventListener('keydown', unlockOnce, { passive: true });

      document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.numAInput.value = btn.dataset.a;
          this.numBInput.value = btn.dataset.b;
          this.showTimeInput.value = btn.dataset.t;
          this.setupError.classList.add('hidden');
        });
      });

      this.startBtn.addEventListener('click', () => {
        this.unlockAudio();
        this.startGame();
      });

      this.restartBtn.addEventListener('click', () => this.resetGame());
      this.quitBtn.addEventListener('click', () => this.resetGame());

      this.soundBtn.addEventListener('click', () => {
        this.unlockAudio();
        this.soundEnabled = !this.soundEnabled;
        this.soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
      });

      this.areaLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.unlockAudio();
        this.handleInput('left');
      });

      this.areaRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.unlockAudio();
        this.handleInput('right');
      });

      document.addEventListener('keydown', (e) => {
        if (!this.isPlaying || !this.canClick) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          this.handleInput('left');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          this.handleInput('right');
        }
      });
    }

    startGame() {
      this.numA = Math.max(1, Math.min(50, parseInt(this.numAInput.value, 10) || 9));
      this.numB = Math.max(1, Math.min(50, parseInt(this.numBInput.value, 10) || 10));
      this.totalRounds = Math.max(1, Math.min(50, parseInt(this.roundsInput.value, 10) || 10));
      this.displayTime = Math.max(150, Math.min(5000, parseInt(this.showTimeInput.value, 10) || 1000));
      this.showFeedback = this.feedbackToggle.checked;

      if (this.numA === this.numB) {
        this.setupError.textContent = '請選擇兩個不同的數字！';
        this.setupError.classList.remove('hidden');
        return;
      }

      this.setupError.classList.add('hidden');
      this.clearTimers();
      this.currentRound = 0;
      this.correctCount = 0;
      this.reactionTimes = [];
      this.isPlaying = true;

      this.uiPanel.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.playArea.classList.remove('hidden');

      this.nextRound();
    }

    resetGame() {
      this.clearTimers();
      this.isPlaying = false;
      this.canClick = false;
      this.clearFeedback();
      this.playArea.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.uiPanel.classList.remove('hidden');
    }

    clearFeedback() {
      this.areaLeft.className = 'split-screen left';
      this.areaRight.className = 'split-screen right';
      this.areaLeft.innerHTML = '';
      this.areaRight.innerHTML = '';
    }

    nextRound() {
      if (!this.isPlaying) return;
      if (this.currentRound >= this.totalRounds) {
        this.endGame();
        return;
      }

      this.currentRound++;
      this.canClick = false;
      this.clearFeedback();

      this.roundProgressEl.textContent = `第 ${this.currentRound} / ${this.totalRounds} 題`;
      this.promptPillEl.textContent = '👀 請記住兩側數量…';
      this.promptPillEl.classList.remove('ready');

      const isALeft = Math.random() < 0.5;
      const countLeft = isALeft ? this.numA : this.numB;
      const countRight = isALeft ? this.numB : this.numA;
      this.correctSide = countLeft > countRight ? 'left' : 'right';

      this.generateSquares(this.areaLeft, countLeft);
      this.generateSquares(this.areaRight, countRight);

      const tid = setTimeout(() => {
        if (!this.isPlaying) return;
        this.hideSquares();
        this.canClick = true;
        this.promptShownAt = performance.now();
        this.promptPillEl.textContent = '👆 請點擊較多的一側！';
        this.promptPillEl.classList.add('ready');
        this.areaLeft.classList.add('selectable');
        this.areaRight.classList.add('selectable');
      }, this.displayTime);
      this.timers.push(tid);
    }

    generateSquares(container, count) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const size = Math.max(16, Math.min(28, Math.floor(Math.min(w, h) * 0.065)));
      const pad = Math.max(16, Math.floor(size * 0.9));
      const effW = Math.max(size, w - size - pad * 2);
      const effH = Math.max(size, h - size - pad * 2);
      const squares = [];

      for (let i = 0; i < count; i++) {
        let x = 0;
        let y = 0;
        let overlap = false;
        let attempts = 0;

        do {
          overlap = false;
          x = pad + Math.random() * effW;
          y = pad + Math.random() * effH;
          for (const s of squares) {
            if (x < s.x + size + 4 && x + size + 4 > s.x && y < s.y + size + 4 && y + size + 4 > s.y) {
              overlap = true;
              break;
            }
          }
          attempts++;
        } while (overlap && attempts < 400);

        squares.push({ x, y });
        const el = document.createElement('div');
        el.className = 'square';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        container.appendChild(el);
      }
    }

    hideSquares() {
      this.areaLeft.querySelectorAll('.square').forEach((s) => { s.style.display = 'none'; });
      this.areaRight.querySelectorAll('.square').forEach((s) => { s.style.display = 'none'; });
    }

    handleInput(side) {
      if (!this.isPlaying || !this.canClick) return;
      this.canClick = false;
      this.areaLeft.classList.remove('selectable');
      this.areaRight.classList.remove('selectable');

      if (this.promptShownAt > 0) {
        this.reactionTimes.push(performance.now() - this.promptShownAt);
      }

      const isCorrect = side === this.correctSide;
      if (isCorrect) this.correctCount++;

      if (this.showFeedback) {
        this.showRoundFeedback(isCorrect, side);
      } else {
        this.nextRound();
      }
    }

    showRoundFeedback(isCorrect, side) {
      if (isCorrect) this.playCorrectSound();
      else this.playWrongSound();

      const selectedArea = side === 'left' ? this.areaLeft : this.areaRight;
      selectedArea.classList.add(isCorrect ? 'correct-feedback' : 'wrong-feedback');

      const icon = document.createElement('div');
      icon.textContent = isCorrect ? '⭕' : '❌';
      selectedArea.appendChild(icon);

      const tid = setTimeout(() => {
        if (this.isPlaying) this.nextRound();
      }, 750);
      this.timers.push(tid);
    }

    endGame() {
      this.clearTimers();
      this.isPlaying = false;
      this.playArea.classList.add('hidden');
      this.resultOverlay.classList.remove('hidden');

      const accuracy = Math.round((this.correctCount / this.totalRounds) * 100);
      const avgRt = this.reactionTimes.length > 0
        ? `${Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length)} ms`
        : '—';

      this.resultEmoji.textContent = accuracy >= 80 ? '🏆' : accuracy >= 50 ? '👍' : '💪';
      this.accuracyText.textContent = `${accuracy}%`;
      this.scoreText.textContent = `${this.correctCount} / ${this.totalRounds}`;
      this.rtText.textContent = avgRt;
    }
  }

  window.addEventListener('load', () => {
    new NumberSenseGame();
  });
})();

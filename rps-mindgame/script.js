(() => {
  'use strict';

  const CHOICES = {
    scissors: { name: '剪刀', emoji: '✌️', win: 20, lose: 10, beats: 'paper' },
    rock:     { name: '石頭', emoji: '✊', win: 10, lose: 50, beats: 'scissors' },
    paper:    { name: '布',   emoji: '🖐️', win: 50, lose: 20, beats: 'rock' }
  };
  const CHOICE_KEYS = ['scissors', 'rock', 'paper'];
  const INITIAL_MONEY = 100;
  const GOAL_MONEY = 500;
  const AI_LEARN_LENGTH = 10;
  const MAX_HISTORY = 10;

  // --- DOM ---
  const rockBtn = document.getElementById('rock');
  const paperBtn = document.getElementById('paper');
  const scissorsBtn = document.getElementById('scissors');
  const choiceBtns = [scissorsBtn, rockBtn, paperBtn];

  const moneyEl = document.getElementById('money');
  const bestEl = document.getElementById('best-val');
  const roundLabelEl = document.getElementById('round-label');
  const streakBadgeEl = document.getElementById('streak-badge');
  const playerHandEl = document.getElementById('player-hand');
  const aiHandEl = document.getElementById('ai-hand');
  const resultEl = document.getElementById('result');
  const historyListEl = document.getElementById('historyList');
  const aiStatusEl = document.getElementById('ai-status-text');

  const probBars = {
    scissors: document.getElementById('prob-scissors'),
    rock: document.getElementById('prob-rock'),
    paper: document.getElementById('prob-paper')
  };
  const pctLabels = {
    scissors: document.getElementById('pct-scissors'),
    rock: document.getElementById('pct-rock'),
    paper: document.getElementById('pct-paper')
  };

  const soundBtn = document.getElementById('btn-sound');
  const restartBtn = document.getElementById('btn-restart');
  const endOverlay = document.getElementById('end-overlay');
  const modalEmoji = document.getElementById('modal-emoji');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const btnContinue = document.getElementById('btn-continue');
  const btnModalRestart = document.getElementById('btn-modal-restart');
  const chartCanvas = document.getElementById('moneyChart');

  // --- Sound Engine ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }
    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    playTone(freq, endFreq, dur = 0.14, type = 'triangle', vol = 0.16) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }
    win() {
      this.playTone(480, 760, 0.14, 'triangle', 0.18);
    }
    lose() {
      this.playTone(220, 110, 0.18, 'sawtooth', 0.12);
    }
    tie() {
      this.playTone(360, 360, 0.09, 'sine', 0.1);
    }
    goal() {
      if (!this.enabled || !this.ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, f * 1.02, 0.22, 'triangle', 0.18), idx * 90);
      });
    }
  }

  const sound = new SoundFX();

  // --- State ---
  let money = INITIAL_MONEY;
  let bestMoney = Number(localStorage.getItem('rps_mindgame_best') || INITIAL_MONEY);
  let gameCount = 1;
  let winStreak = 0;
  let goalReached = false;
  let isGameOver = false;
  let history = [];
  let playerHistory = [];
  let moneyChart = null;

  // --- Chart Initialization (with offline fallback) ---
  function initChart() {
    if (typeof Chart === 'undefined') return;
    try {
      moneyChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: ['初始'],
          datasets: [{
            label: '資金 (元)',
            data: [INITIAL_MONEY],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', maxTicksLimit: 8 },
              grid: { color: 'rgba(255,255,255,0.06)' }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8' },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
    } catch (_) {
      moneyChart = null;
    }
  }

  // --- AI Probability & Choice ---
  function getAIProbabilities() {
    if (playerHistory.length < AI_LEARN_LENGTH) {
      return { probs: { rock: 0.33, paper: 0.33, scissors: 0.34 }, label: `觀察中 (${playerHistory.length}/${AI_LEARN_LENGTH})` };
    }

    const counts = { rock: 0, paper: 0, scissors: 0 };
    for (const c of playerHistory) counts[c]++;

    if (counts.rock > counts.paper && counts.rock > counts.scissors) {
      return { probs: { rock: 0.05, paper: 0.75, scissors: 0.20 }, label: '鎖定你偏愛「石頭」→ 狂出布' };
    }
    if (counts.paper > counts.rock && counts.paper > counts.scissors) {
      return { probs: { rock: 0.20, paper: 0.05, scissors: 0.75 }, label: '鎖定你偏愛「布」→ 狂出剪刀' };
    }
    if (counts.scissors > counts.rock && counts.scissors > counts.paper) {
      return { probs: { rock: 0.75, paper: 0.20, scissors: 0.05 }, label: '鎖定你偏愛「剪刀」→ 狂出石頭' };
    }
    return { probs: { rock: 0.33, paper: 0.33, scissors: 0.34 }, label: '出拳均衡 → 隨機應對' };
  }

  function updateAIRadar() {
    const { probs, label } = getAIProbabilities();
    aiStatusEl.textContent = label;
    CHOICE_KEYS.forEach((k) => {
      const pct = Math.round(probs[k] * 100);
      probBars[k].style.width = `${pct}%`;
      pctLabels[k].textContent = `${pct}%`;
    });
  }

  function aiChoose() {
    const { probs } = getAIProbabilities();
    const r = Math.random();
    if (r < probs.rock) return 'rock';
    if (r < probs.rock + probs.paper) return 'paper';
    return 'scissors';
  }

  // --- UI Sync ---
  function setButtonsDisabled(disabled) {
    choiceBtns.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function updateWalletUI() {
    moneyEl.textContent = `${money} 元`;
    if (money > bestMoney) {
      bestMoney = money;
      localStorage.setItem('rps_mindgame_best', String(bestMoney));
    }
    bestEl.textContent = `${bestMoney} 元`;
    roundLabelEl.textContent = `第 ${gameCount} 局`;

    if (winStreak >= 2) {
      streakBadgeEl.textContent = `🔥 ${winStreak} 連勝`;
      streakBadgeEl.classList.remove('hidden');
    } else {
      streakBadgeEl.classList.add('hidden');
    }
  }

  function renderHistory() {
    historyListEl.innerHTML = '';
    if (history.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-history';
      li.textContent = '尚無對戰紀錄，快出拳吧！';
      historyListEl.appendChild(li);
      return;
    }

    for (const item of history) {
      const li = document.createElement('li');
      const left = document.createElement('span');
      left.textContent = `第 ${item.round} 局 · 你 ${CHOICES[item.player].emoji} vs ${CHOICES[item.ai].emoji} AI`;

      const right = document.createElement('span');
      right.className = `h-badge ${item.outcome}`;
      right.textContent = item.label;

      li.appendChild(left);
      li.appendChild(right);
      historyListEl.appendChild(li);
    }
  }

  function showEndModal(type) {
    if (type === 'bankrupt') {
      isGameOver = true;
      setButtonsDisabled(true);
      modalEmoji.textContent = '💸';
      modalTitle.textContent = '破產出局！';
      modalDesc.textContent = `你在第 ${gameCount} 局資金歸零，本局最高紀錄 ${bestMoney} 元。調整心理戰術再來一局吧！`;
      btnContinue.classList.add('hidden');
    } else {
      sound.goal();
      modalEmoji.textContent = '🏆';
      modalTitle.textContent = `突破 ${GOAL_MONEY} 元大關！`;
      modalDesc.textContent = `只用了 ${gameCount} 局就看穿 AI 的心理防線！你可以選擇繼續無盡挑戰或重新開局。`;
      btnContinue.classList.remove('hidden');
    }
    endOverlay.classList.add('visible');
    endOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideEndModal() {
    endOverlay.classList.remove('visible');
    endOverlay.setAttribute('aria-hidden', 'true');
  }

  // --- Round Resolution ---
  function playRound(playerChoice) {
    if (isGameOver) return;
    sound.unlock();

    const aiChoiceMade = aiChoose();
    playerHandEl.textContent = CHOICES[playerChoice].emoji;
    aiHandEl.textContent = CHOICES[aiChoiceMade].emoji;

    playerHandEl.classList.remove('pop', 'win-glow', 'lose-glow');
    aiHandEl.classList.remove('pop', 'win-glow', 'lose-glow');
    void playerHandEl.offsetWidth; // trigger reflow for pop animation
    playerHandEl.classList.add('pop');
    aiHandEl.classList.add('pop');

    let outcome = 'tie';
    let label = '平手 (±0)';

    if (playerChoice === aiChoiceMade) {
      winStreak = 0;
      sound.tie();
    } else if (CHOICES[playerChoice].beats === aiChoiceMade) {
      const gain = CHOICES[playerChoice].win;
      money += gain;
      winStreak++;
      outcome = 'win';
      label = `+${gain} 元`;
      playerHandEl.classList.add('win-glow');
      aiHandEl.classList.add('lose-glow');
      sound.win();
    } else {
      const loss = CHOICES[playerChoice].lose;
      money -= loss;
      winStreak = 0;
      outcome = 'lose';
      label = `-${loss} 元`;
      playerHandEl.classList.add('lose-glow');
      aiHandEl.classList.add('win-glow');
      sound.lose();
    }

    resultEl.textContent = outcome === 'tie' ? '平手！' : outcome === 'win' ? `你贏了！${label}` : `你輸了！${label}`;
    resultEl.className = `result-pill ${outcome}`;

    history.unshift({ round: gameCount, player: playerChoice, ai: aiChoiceMade, outcome, label });
    if (history.length > MAX_HISTORY) history.pop();
    renderHistory();

    playerHistory.push(playerChoice);
    if (playerHistory.length > AI_LEARN_LENGTH) playerHistory.shift();
    updateAIRadar();

    if (moneyChart) {
      moneyChart.data.labels.push(`第 ${gameCount} 局`);
      moneyChart.data.datasets[0].data.push(money);
      moneyChart.update();
    }

    if (money <= 0) {
      money = 0;
      updateWalletUI();
      showEndModal('bankrupt');
      return;
    }

    gameCount++;
    updateWalletUI();

    if (!goalReached && money >= GOAL_MONEY) {
      goalReached = true;
      showEndModal('goal');
    }
  }

  function resetGame() {
    hideEndModal();
    money = INITIAL_MONEY;
    gameCount = 1;
    winStreak = 0;
    goalReached = false;
    isGameOver = false;
    history = [];
    playerHistory = [];

    playerHandEl.textContent = '❔';
    aiHandEl.textContent = '🤖';
    playerHandEl.className = 'hand-box';
    aiHandEl.className = 'hand-box';
    resultEl.textContent = '請選擇出拳';
    resultEl.className = 'result-pill';

    setButtonsDisabled(false);
    updateWalletUI();
    updateAIRadar();
    renderHistory();

    if (moneyChart) {
      moneyChart.data.labels = ['初始'];
      moneyChart.data.datasets[0].data = [INITIAL_MONEY];
      moneyChart.update();
    }
  }

  // --- Events & Tablet Compatibility ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  const unlockOnce = () => sound.unlock();
  document.addEventListener('pointerdown', unlockOnce, { passive: true });
  document.addEventListener('touchstart', unlockOnce, { passive: true });
  document.addEventListener('keydown', unlockOnce, { passive: true });

  rockBtn.addEventListener('click', () => playRound('rock'));
  paperBtn.addEventListener('click', () => playRound('paper'));
  scissorsBtn.addEventListener('click', () => playRound('scissors'));

  restartBtn.addEventListener('click', resetGame);
  btnModalRestart.addEventListener('click', resetGame);
  btnContinue.addEventListener('click', hideEndModal);

  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.enabled = !sound.enabled;
    soundBtn.textContent = sound.enabled ? '🔊' : '🔇';
  });

  // Keyboard shortcuts for desktop testing
  document.addEventListener('keydown', (e) => {
    if (isGameOver || endOverlay.classList.contains('visible')) return;
    if (e.key === '1') playRound('scissors');
    else if (e.key === '2') playRound('rock');
    else if (e.key === '3') playRound('paper');
  });

  // --- Boot ---
  initChart();
  updateWalletUI();
  updateAIRadar();
  renderHistory();
})();

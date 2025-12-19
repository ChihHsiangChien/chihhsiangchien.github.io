class Game {
  constructor() {
    this.numAInput = document.getElementById('numA');
    this.numBInput = document.getElementById('numB');
    this.roundsInput = document.getElementById('rounds');
    this.showTimeInput = document.getElementById('showTime');
    this.feedbackToggle = document.getElementById('feedbackToggle');
    this.startBtn = document.getElementById('startBtn');
    this.restartBtn = document.getElementById('restartBtn');
    
    this.uiPanel = document.getElementById('ui-panel');
    this.playArea = document.getElementById('play-area');
    this.resultOverlay = document.getElementById('result-overlay');
    this.areaLeft = document.getElementById('areaLeft');
    this.areaRight = document.getElementById('areaRight');
    this.accuracyText = document.getElementById('accuracy-text');

    this.currentRound = 0;
    this.totalRounds = 10;
    this.correctCount = 0;
    this.numA = 0;
    this.numB = 0;
    this.displayTime = 1000;
    this.showFeedback = true;
    this.isPlaying = false;
    this.canClick = false;
    
    // Audio Context
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    this.startBtn.addEventListener('click', () => {
        this.resumeAudio(); // Browser requirement to resume context on user gesture
        this.startGame();
    });
    this.restartBtn.addEventListener('click', () => this.resetGame());
    
    this.areaLeft.addEventListener('mousedown', () => this.handleInput('left'));
    this.areaRight.addEventListener('mousedown', () => this.handleInput('right'));
    
    // Support touch
    this.areaLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput('left'); });
    this.areaRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput('right'); });
  }

  resumeAudio() {
      if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
      }
  }

  playTone(freq, type, duration) {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
  }

  playCorrectSound() {
      // High pitch major arpeggio
      this.playTone(600, 'sine', 0.1);
      setTimeout(() => this.playTone(900, 'sine', 0.2), 100);
  }

  playWrongSound() {
      // Low pitch buzz
      this.playTone(150, 'sawtooth', 0.3);
  }

  startGame() {
    this.numA = parseInt(this.numAInput.value);
    this.numB = parseInt(this.numBInput.value);
    this.totalRounds = parseInt(this.roundsInput.value);
    this.displayTime = parseInt(this.showTimeInput.value);
    this.showFeedback = this.feedbackToggle.checked;

    if (this.numA === this.numB) {
      alert("請選擇兩個不同的數字!");
      return;
    }

    this.currentRound = 0;
    this.correctCount = 0;
    this.isPlaying = true;

    this.uiPanel.style.display = 'none';
    this.resultOverlay.style.display = 'none';
    this.playArea.style.display = 'flex';

    this.nextRound();
  }

  resetGame() {
    this.uiPanel.style.display = 'block';
    this.playArea.style.display = 'none';
    this.resultOverlay.style.display = 'none';
    // Clean up
    this.clearFeedback();
  }

  clearFeedback() {
    this.areaLeft.className = 'split-screen left';
    this.areaRight.className = 'split-screen right';
    this.areaLeft.innerHTML = '';
    this.areaRight.innerHTML = '';
  }

  nextRound() {
    if (this.currentRound >= this.totalRounds) {
      this.endGame();
      return;
    }

    this.currentRound++;
    this.canClick = false;
    this.clearFeedback();

    // Decide which side has which number
    const isALeft = Math.random() < 0.5;
    const countLeft = isALeft ? this.numA : this.numB;
    const countRight = isALeft ? this.numB : this.numA;

    this.correctSide = countLeft > countRight ? 'left' : 'right';

    // Generate squares
    this.generateSquares(this.areaLeft, countLeft);
    this.generateSquares(this.areaRight, countRight);

    // Hide after timeout
    setTimeout(() => {
        if (!this.isPlaying) return;
        this.hideSquares();
        this.canClick = true;
    }, this.displayTime);
  }

  generateSquares(container, count) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const size = 30; // square size
    const squares = [];
    
    // Add visual container logic if needed, but absolute pos is fine.
    
    for (let i = 0; i < count; i++) {
      let x, y, overlap;
      let attempts = 0;
      const maxAttempts = 500;

      do {
        overlap = false;
        x = Math.random() * (containerWidth - size);
        y = Math.random() * (containerHeight - size);

        for (const s of squares) {
            if (x < s.x + size &&
                x + size > s.x &&
                y < s.y + size &&
                y + size > s.y) {
                overlap = true;
                break;
            }
        }
        attempts++;
      } while (overlap && attempts < maxAttempts);

      squares.push({x, y});
      
      const el = document.createElement('div');
      el.classList.add('square');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      container.appendChild(el);
    }
  }

  hideSquares() {
     const squares = document.querySelectorAll('.square');
     squares.forEach(s => s.style.display = 'none');
  }

  handleInput(side) {
    if (!this.isPlaying || !this.canClick) return;
    this.canClick = false; // Prevent double click

    const isCorrect = side === this.correctSide;
    if (isCorrect) {
      this.correctCount++;
    }

    if (this.showFeedback) {
        this.showRoundFeedback(isCorrect, side);
    } else {
        this.nextRound(); // Instant next if feedback disabled
    }
  }

  showRoundFeedback(isCorrect, side) {
      // Audio
      if (isCorrect) this.playCorrectSound();
      else this.playWrongSound();

      // Visual
      const selectedArea = side === 'left' ? this.areaLeft : this.areaRight;
      selectedArea.classList.add(isCorrect ? 'correct-feedback' : 'wrong-feedback');
      
      // Add Icon
      const icon = document.createElement('div');
      icon.textContent = isCorrect ? 'O' : 'X';
      selectedArea.appendChild(icon);

      // Wait then next
      setTimeout(() => {
          this.nextRound();
      }, 1000); // 1 second feedback
  }

  endGame() {
    this.isPlaying = false;
    this.playArea.style.display = 'none';
    this.resultOverlay.style.display = 'flex';
    
    const accuracy = Math.round((this.correctCount / this.totalRounds) * 100);
    this.accuracyText.textContent = `正確率: ${accuracy}% (${this.correctCount}/${this.totalRounds})`;
  }
}

window.addEventListener('load', () => {
    new Game();
});

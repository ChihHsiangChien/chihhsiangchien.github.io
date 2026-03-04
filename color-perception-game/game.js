class ColorPerceptionGame {
    constructor() {
        this.baseDifficulty = 'lv2';
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 10;
        this.isPlaying = false;
        this.timer = null;
        this.differentIndex = -1;
        this.targetLevel = 10; // WIN condition level
        this.gameBoard = document.getElementById('gameBoard');
        
        // DOM elements
        this.levelElement = document.getElementById('level');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.timeElement = document.getElementById('time');
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.hintButton = document.getElementById('hintButton');
        this.slowButton = document.getElementById('slowButton');

        // Bind event listeners
        this.startButton.addEventListener('click', () => this.startGame());
        this.pauseButton.addEventListener('click', () => this.togglePause());
        this.hintButton.addEventListener('click', () => this.showHint());
        this.slowButton.addEventListener('click', () => this.slowTime());

        this.initDifficulty();
    }

    initDifficulty() {
        const urlParams = new URLSearchParams(window.location.search);
        const diff = urlParams.get('diff');
        if (diff) {
            this.baseDifficulty = diff;
            // Auto start if parameter present
            setTimeout(() => this.startGame(), 500);
        }
    }

    getLevelConfig() {
        // Base starting point depends on Scouting Level
        let startGridSize = 2;
        let diffStep = 10;
        let time = 15;

        if (this.baseDifficulty === 'lv1') { startGridSize = 2; diffStep = 15; time = 20; }
        else if (this.baseDifficulty === 'lv2') { startGridSize = 4; diffStep = 10; time = 15; }
        else if (this.baseDifficulty === 'lv3') { startGridSize = 6; diffStep = 6; time = 12; }
        else if (this.baseDifficulty === 'lv4') { startGridSize = 8; diffStep = 4; time = 10; }

        // Increase complexity with game level (how many correct answers)
        const currentGridSize = Math.min(15, startGridSize + Math.floor((this.level - 1) / 3));
        const currentDiff = Math.max(1, diffStep - Math.floor(this.level / 2));
        const currentTime = Math.max(3, time - Math.floor(this.level / 5));

        return { 
            gridSize: currentGridSize, 
            timeLimit: currentTime, 
            colorDiff: currentDiff, 
            brightnessDiff: currentDiff 
        };
    }

    // ... (getPerceptualColorDiff, generateColors, createBoard remain same) ...

    getPerceptualColorDiff(baseHue, baseDiff) {
        const hueRanges = [
            { min: 30, max: 90, multiplier: 0.6 },
            { min: 90, max: 150, multiplier: 0.8 },
            { min: 150, max: 210, multiplier: 1.0 },
            { min: 210, max: 270, multiplier: 1.2 },
            { min: 270, max: 330, multiplier: 1.1 },
            { min: 330, max: 360, multiplier: 0.7 },
            { min: 0, max: 30, multiplier: 0.7 }
        ];
        const range = hueRanges.find(r => baseHue >= r.min && baseHue < r.max);
        const multiplier = range ? range.multiplier : 1.0;
        return baseDiff * multiplier;
    }

    generateColors() {
        const config = this.getLevelConfig();
        const baseHue = Math.random() * 360;
        const baseSaturation = 70 + Math.random() * 20;
        const baseBrightness = 70 + Math.random() * 20;
        const totalSquares = config.gridSize * config.gridSize;
        const colors = [];
        const baseColor = `hsl(${baseHue}, ${baseSaturation}%, ${baseBrightness}%)`;
        for (let i = 0; i < totalSquares; i++) { colors.push(baseColor); }
        const differentIndex = Math.floor(Math.random() * totalSquares);
        const adjustedColorDiff = this.getPerceptualColorDiff(baseHue, config.colorDiff);
        const hueDirection = Math.random() < 0.5 ? 1 : -1;
        const differentHue = (baseHue + adjustedColorDiff * hueDirection + 360) % 360;
        const brightnessDirection = Math.random() < 0.5 ? 1 : -1;
        const differentBrightness = Math.max(0, Math.min(100, baseBrightness + config.brightnessDiff * brightnessDirection));
        colors[differentIndex] = `hsl(${differentHue}, ${baseSaturation}%, ${differentBrightness}%)`;
        return { colors, differentIndex };
    }

    createBoard() {
        const config = this.getLevelConfig();
        this.gameBoard.style.gridTemplateColumns = `repeat(${config.gridSize}, 1fr)`;
        this.gameBoard.innerHTML = '';
        const { colors, differentIndex } = this.generateColors();
        this.differentIndex = differentIndex;
        colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => this.handleClick(index));
            this.gameBoard.appendChild(swatch);
        });
    }

    startGame() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.timeLeft = this.getLevelConfig().timeLimit;
        this.updateUI();
        this.createBoard();
        this.startTimer();
        this.startButton.disabled = true;
        this.pauseButton.disabled = false;
        this.hintButton.disabled = false;
        this.slowButton.disabled = false;
    }

    startTimer() {
        this.timer = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.updateUI();
            } else {
                this.handleTimeUp();
            }
        }, 1000);
    }

    togglePause() {
        if (this.isPlaying) {
            clearInterval(this.timer);
            this.pauseButton.textContent = '繼續';
            this.setBoardColorState(true);
        } else {
            this.startTimer();
            this.pauseButton.textContent = '暫停';
            this.setBoardColorState(false);
        }
        this.isPlaying = !this.isPlaying;
    }

    setBoardColorState(isGrayscale) {
        const swatches = this.gameBoard.children;
        for (let i = 0; i < swatches.length; i++) {
            swatches[i].style.filter = isGrayscale ? 'grayscale(100%) brightness(70%)' : 'none';
        }
    }

    handleClick(index) {
        if (!this.isPlaying) return;
        if (index === this.differentIndex) {
            this.score += Math.max(1, this.timeLeft * 2);
            this.level++;
            if (this.level > this.targetLevel) {
                this.gameWin();
                return;
            }
            this.updateUI();
            this.createBoard();
            this.resetTimer();
        } else {
            this.lives--;
            const swatches = this.gameBoard.children;
            swatches[index].style.border = '3px solid red';
            swatches[this.differentIndex].style.border = '3px solid green';
            setTimeout(() => {
                swatches[index].style.border = 'none';
                swatches[this.differentIndex].style.border = 'none';
            }, 1000);
            if (this.lives <= 0) {
                this.gameOver();
            }
            this.updateUI();
        }
    }

    handleTimeUp() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.createBoard();
            this.resetTimer();
        }
    }

    showHint() {
        const swatches = this.gameBoard.children;
        swatches[this.differentIndex].classList.add('different');
        setTimeout(() => {
            swatches[this.differentIndex].classList.remove('different');
        }, 1000);
        this.hintButton.disabled = true;
        setTimeout(() => { this.hintButton.disabled = false; }, 5000);
    }

    slowTime() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.updateUI();
            } else {
                this.handleTimeUp();
            }
        }, 2000);
        this.slowButton.disabled = true;
        setTimeout(() => {
            clearInterval(this.timer);
            this.startTimer();
            this.slowButton.disabled = false;
        }, 5000);
    }

    resetTimer() {
        clearInterval(this.timer);
        this.timeLeft = this.getLevelConfig().timeLimit;
        this.startTimer();
    }

    updateUI() {
        this.levelElement.textContent = this.level;
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.timeElement.textContent = this.timeLeft;
    }

    gameOver() {
        clearInterval(this.timer);
        this.isPlaying = false;
        this.startButton.disabled = false;
        this.pauseButton.disabled = true;
        this.hintButton.disabled = true;
        this.slowButton.disabled = true;
        this.pauseButton.textContent = '暫停';
        alert(`遊戲結束！您的得分: ${this.score}`);
        this.updateUI();
    }

    gameWin() {
        clearInterval(this.timer);
        this.isPlaying = false;
        this.startButton.disabled = false;
        this.pauseButton.disabled = true;
        this.hintButton.disabled = true;
        this.slowButton.disabled = true;
        alert(`恭喜！你成功完成了 ${this.targetLevel} 關挑戰！得分: ${this.score}`);
        this.updateUI();
    }
}

const game = new ColorPerceptionGame(); 

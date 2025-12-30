class ColorPerceptionGame {
    constructor() {
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 10;
        this.isPlaying = false;
        this.timer = null;
        this.differentIndex = -1;
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
    }

    getLevelConfig() {
        const configs = {
            1: { gridSize: 8, timeLimit: 10, colorDiff: 6, brightnessDiff: 4 },
            2: { gridSize: 8, timeLimit: 10, colorDiff: 6, brightnessDiff: 4 },
            3: { gridSize: 8, timeLimit: 8, colorDiff: 6, brightnessDiff: 4 },
            4: { gridSize: 8, timeLimit: 8, colorDiff: 4, brightnessDiff: 4 },
            5: { gridSize: 8, timeLimit: 8, colorDiff: 2, brightnessDiff: 2 },
            6: { gridSize: 8, timeLimit: 6, colorDiff: 2, brightnessDiff: 2 },
            7: { gridSize: 9, timeLimit: 6, colorDiff: 2, brightnessDiff: 2 },
            8: { gridSize: 10, timeLimit: 6, colorDiff: 1, brightnessDiff: 1 },
            9: { gridSize: 11, timeLimit: 6, colorDiff: 1, brightnessDiff: 1 },
            10: { gridSize: 12, timeLimit: 6, colorDiff: 1, brightnessDiff: 1 }
        };
        return configs[this.level] || { gridSize: 8, timeLimit: 4, colorDiff: 3, brightnessDiff: 2 };
    }

    getPerceptualColorDiff(baseHue, baseDiff) {
        // 不同色相区域的感知敏感度系数
        // 黄色/橙色区域 (30-90度) 最敏感，需要更小的差异
        // 蓝色/紫色区域 (210-330度) 较不敏感，可以有更大的差异
        
        const hueRanges = [
            { min: 30, max: 90, multiplier: 0.6 },   // 黄-橙色 (更敏感)
            { min: 90, max: 150, multiplier: 0.8 },  // 黄绿-绿色
            { min: 150, max: 210, multiplier: 1.0 }, // 青色-蓝色
            { min: 210, max: 270, multiplier: 1.2 }, // 蓝-紫色 (较不敏感)
            { min: 270, max: 330, multiplier: 1.1 }, // 紫-品红
            { min: 330, max: 360, multiplier: 0.7 }, // 品红-红色
            { min: 0, max: 30, multiplier: 0.7 }     // 红-橙色
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

        // Generate base color
        const baseColor = `hsl(${baseHue}, ${baseSaturation}%, ${baseBrightness}%)`;
        
        // Generate similar colors
        for (let i = 0; i < totalSquares; i++) {
            colors.push(baseColor);
        }

        // Generate one different color
        const differentIndex = Math.floor(Math.random() * totalSquares);
        
        // 根据色相区域调整差异值
        const adjustedColorDiff = this.getPerceptualColorDiff(baseHue, config.colorDiff);
        
        // 随机决定增加或减少色相
        const hueDirection = Math.random() < 0.5 ? 1 : -1;
        const differentHue = (baseHue + adjustedColorDiff * hueDirection + 360) % 360;
        
        // 随机决定增加或减少亮度
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
        this.isPlaying = true;
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
        // Toggle grayscale to visually indicate paused state
        const swatches = this.gameBoard.children;
        for (let i = 0; i < swatches.length; i++) {
            swatches[i].style.filter = isGrayscale ? 'grayscale(100%) brightness(70%)' : 'none';
        }
    }

    handleClick(index) {
        if (!this.isPlaying) return;

        const swatches = this.gameBoard.children;
        if (index === this.differentIndex) {
            // Correct choice
            this.score += Math.max(1, this.timeLeft * 2);
            this.level++;
            this.updateUI();
            this.createBoard();
            this.resetTimer();
        } else {
            // Wrong choice
            this.lives--;
            swatches[index].style.border = '3px solid red';
            swatches[this.differentIndex].style.border = '3px solid green';
            swatches[this.differentIndex].style.boxShadow = '0 0 10px green';
            
            setTimeout(() => {
                swatches[index].style.border = 'none';
                swatches[this.differentIndex].style.border = 'none';
                swatches[this.differentIndex].style.boxShadow = 'none';
            }, 1500);
            
            if (this.lives <= 0) {
                setTimeout(() => {
                    this.gameOver();
                }, 1500);
            }
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
        setTimeout(() => {
            this.hintButton.disabled = false;
        }, 5000);
    }

    slowTime() {
        const originalInterval = 1000;
        const slowInterval = 2000;
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.updateUI();
            } else {
                this.handleTimeUp();
            }
        }, slowInterval);
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
        alert(`Game Over! Your score: ${this.score}`);
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.updateUI();
    }
}

// Initialize the game
const game = new ColorPerceptionGame(); 
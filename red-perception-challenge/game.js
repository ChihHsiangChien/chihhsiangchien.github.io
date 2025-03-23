// Game state
let currentMode = null;
let score = 0;
let level = 1;
let xp = 0;
let rps = 0;
let timer = null;
let achievements = {
    'red-master': false,
    'lightning-eyes': false,
    'perception-prodigy': false
};

// Add to game state
let boundaryData = {
    tests: [],
    totalTests: 20,
    currentTest: 0
};

// Color generation utilities
function generateRedShade() {
    const hue = 0; // Red hue
    const saturation = Math.random() * 30 + 70; // 70-100%
    const lightness = Math.random() * 30 + 35; // 35-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function generateSimilarRed(baseColor) {
    const [h, s, l] = baseColor.match(/\d+/g).map(Number);
    // Make the difference smaller for higher difficulty
    const difficulty = Math.min(level / 5, 1); // Difficulty increases with level
    const maxDiff = 10 * (1 - difficulty); // Maximum difference decreases with difficulty
    const newS = s + (Math.random() * maxDiff - maxDiff/2);
    const newL = l + (Math.random() * maxDiff - maxDiff/2);
    return `hsl(${h}, ${newS}%, ${newL}%)`;
}

function generateNonRed() {
    const hue = Math.random() * 30 + 330; // Purple to Orange
    const saturation = Math.random() * 30 + 70;
    const lightness = Math.random() * 30 + 35;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function generateBoundaryColor() {
    // Generate colors in a wider range around red
    const hue = Math.random() * 60 - 30; // -30 to 30 (around red)
    const saturation = Math.random() * 30 + 70; // 70-100%
    const lightness = Math.random() * 30 + 35; // 35-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function clearTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function startTimer(duration, onTick, onEnd) {
    clearTimer();
    let timeLeft = duration;
    onTick(timeLeft);
    
    timer = setInterval(() => {
        timeLeft--;
        onTick(timeLeft);
        if (timeLeft <= 0) {
            clearTimer();
            onEnd();
        }
    }, 1000);
}

function backToHome() {
    clearTimer();
    document.getElementById('gameArea').classList.add('hidden');
    document.getElementById('gameMenu').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

// Game modes
const gameModes = {
    match: {
        init() {
            const gameArea = document.getElementById('gameArea');
            gameArea.innerHTML = `
                <button class="back-btn" onclick="backToHome()">← Back to Home</button>
                <div class="timer">Time: <span id="timeLeft">5</span>s</div>
                <div class="color-pair">
                    <div class="color-box" id="color1"></div>
                    <div class="color-box" id="color2"></div>
                </div>
                <div class="color-options">
                    <button class="mode-btn" id="sameBtn">Same</button>
                    <button class="mode-btn" id="differentBtn">Different</button>
                </div>
            `;
            this.startRound();
        },

        startRound() {
            const color1 = generateRedShade();
            const isSame = Math.random() > 0.5;
            const color2 = isSame ? generateSimilarRed(color1) : generateRedShade();

            document.getElementById('color1').style.backgroundColor = color1;
            document.getElementById('color2').style.backgroundColor = color2;

            startTimer(5, 
                (timeLeft) => document.getElementById('timeLeft').textContent = timeLeft,
                () => this.endRound(false)
            );

            document.getElementById('sameBtn').onclick = () => this.endRound(isSame);
            document.getElementById('differentBtn').onclick = () => this.endRound(!isSame);
        },

        endRound(correct) {
            clearTimer();
            if (correct) {
                score += 10;
                xp += 5;
                updateStats();
            }
            this.startRound();
        }
    },

    sort: {
        init() {
            const gameArea = document.getElementById('gameArea');
            gameArea.innerHTML = `
                <button class="back-btn" onclick="backToHome()">← Back to Home</button>
                <div class="timer">Time: <span id="timeLeft">10</span>s</div>
                <div class="color-options" id="sortColors"></div>
            `;
            this.startRound();
        },

        startRound() {
            const colors = Array(5).fill().map(() => generateRedShade());
            const sortedColors = [...colors].sort((a, b) => {
                const [h1, s1, l1] = a.match(/\d+/g).map(Number);
                const [h2, s2, l2] = b.match(/\d+/g).map(Number);
                return (s2 + l2) - (s1 + l1);
            });

            const sortColors = document.getElementById('sortColors');
            sortColors.innerHTML = colors.map((color, index) => `
                <div class="color-box" style="background-color: ${color}" data-index="${index}"></div>
            `).join('');

            startTimer(10,
                (timeLeft) => document.getElementById('timeLeft').textContent = timeLeft,
                () => this.endRound(false)
            );

            this.setupDragAndDrop();
        },

        setupDragAndDrop() {
            const boxes = document.querySelectorAll('.color-box');
            boxes.forEach(box => {
                box.draggable = true;
                box.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', e.target.dataset.index);
                });
                box.addEventListener('dragover', e => {
                    e.preventDefault();
                    const dragging = document.querySelector('.dragging');
                    if (dragging) dragging.classList.remove('dragging');
                    e.target.classList.add('dragging');
                });
                box.addEventListener('drop', e => {
                    e.preventDefault();
                    const fromIndex = e.dataTransfer.getData('text/plain');
                    const toIndex = e.target.dataset.index;
                    this.swapColors(fromIndex, toIndex);
                });
            });
        },

        swapColors(fromIndex, toIndex) {
            const boxes = document.querySelectorAll('.color-box');
            const temp = boxes[fromIndex].style.backgroundColor;
            boxes[fromIndex].style.backgroundColor = boxes[toIndex].style.backgroundColor;
            boxes[toIndex].style.backgroundColor = temp;
        },

        endRound(correct) {
            clearTimer();
            if (correct) {
                score += 20;
                xp += 10;
                updateStats();
            }
            this.startRound();
        }
    },

    spot: {
        init() {
            const gameArea = document.getElementById('gameArea');
            gameArea.innerHTML = `
                <button class="back-btn" onclick="backToHome()">← Back to Home</button>
                <div class="timer">Time: <span id="timeLeft">3</span>s</div>
                <div class="color-options" id="spotColors"></div>
            `;
            this.startRound();
        },

        startRound() {
            const colors = Array(4).fill().map(() => generateRedShade());
            const intruderIndex = Math.floor(Math.random() * 4);
            colors[intruderIndex] = generateNonRed();

            const spotColors = document.getElementById('spotColors');
            spotColors.innerHTML = colors.map((color, index) => `
                <div class="color-box" style="background-color: ${color}" data-index="${index}"></div>
            `).join('');

            startTimer(3,
                (timeLeft) => document.getElementById('timeLeft').textContent = timeLeft,
                () => this.endRound(false)
            );

            document.querySelectorAll('.color-box').forEach(box => {
                box.onclick = () => this.endRound(parseInt(box.dataset.index) === intruderIndex);
            });
        },

        endRound(correct) {
            clearTimer();
            if (correct) {
                score += 15;
                xp += 8;
                updateStats();
            }
            this.startRound();
        }
    },

    boundary: {
        init() {
            const gameArea = document.getElementById('gameArea');
            gameArea.innerHTML = `
                <button class="back-btn" onclick="backToHome()">← Back to Home</button>
                <div class="boundary-test">
                    <h2>Is this color "red"?</h2>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(boundaryData.currentTest / boundaryData.totalTests) * 100}%"></div>
                    </div>
                    <div class="color-swatch" id="boundaryColor"></div>
                    <div class="boundary-controls">
                        <button class="boundary-btn" id="yesBtn">Yes, it's red</button>
                        <button class="boundary-btn" id="noBtn">No, it's not red</button>
                    </div>
                </div>
            `;
            this.startTest();
        },

        startTest() {
            const color = generateBoundaryColor();
            document.getElementById('boundaryColor').style.backgroundColor = color;

            document.getElementById('yesBtn').onclick = () => this.endTest(color, true);
            document.getElementById('noBtn').onclick = () => this.endTest(color, false);
        },

        endTest(color, isRed) {
            boundaryData.tests.push({ color, isRed });
            boundaryData.currentTest++;

            if (boundaryData.currentTest < boundaryData.totalTests) {
                this.startTest();
            } else {
                this.showResults();
            }
        },

        showResults() {
            const gameArea = document.getElementById('gameArea');
            gameArea.innerHTML = `
                <button class="back-btn" onclick="backToHome()">← Back to Home</button>
                <div class="boundary-test">
                    <h2>Your Red Boundary Results</h2>
                    <div id="boundaryMap" class="boundary-map"></div>
                    <button class="boundary-btn" onclick="gameModes.boundary.reset()">Try Again</button>
                </div>
            `;
            this.generateBoundaryMap();
        },

        generateBoundaryMap() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const map = document.getElementById('boundaryMap');
            
            // Set canvas size
            canvas.width = map.clientWidth;
            canvas.height = map.clientHeight;
            map.appendChild(canvas);

            // Create a grid of colors
            const gridSize = 50;
            const hueStep = 60 / gridSize; // -30 to 30
            const satStep = 30 / gridSize; // 70 to 100
            const lightStep = 30 / gridSize; // 35 to 65

            // Draw the grid
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const hue = (i * hueStep) - 30;
                    const sat = 70 + (j * satStep);
                    const light = 35 + (j * lightStep);
                    const color = `hsl(${hue}, ${sat}%, ${light}%)`;

                    // Calculate if this color would be considered red based on test data
                    const isRed = this.predictRed(hue, sat, light);
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        (i * canvas.width) / gridSize,
                        (j * canvas.height) / gridSize,
                        canvas.width / gridSize,
                        canvas.height / gridSize
                    );

                    // Add a border for red colors
                    if (isRed) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.strokeRect(
                            (i * canvas.width) / gridSize,
                            (j * canvas.height) / gridSize,
                            canvas.width / gridSize,
                            canvas.height / gridSize
                        );
                    }
                }
            }
        },

        predictRed(hue, sat, light) {
            // Simple prediction based on test data
            let redVotes = 0;
            let totalVotes = 0;

            boundaryData.tests.forEach(test => {
                const [testHue, testSat, testLight] = test.color.match(/\d+/g).map(Number);
                
                // Calculate color distance
                const hueDiff = Math.abs(hue - testHue);
                const satDiff = Math.abs(sat - testSat);
                const lightDiff = Math.abs(light - testLight);
                
                // Weight closer colors more heavily
                const weight = 1 / (hueDiff + satDiff + lightDiff);
                
                if (test.isRed) redVotes += weight;
                totalVotes += weight;
            });

            return redVotes / totalVotes > 0.5;
        },

        reset() {
            boundaryData = {
                tests: [],
                totalTests: 20,
                currentTest: 0
            };
            this.init();
        }
    }
};

// UI updates
function updateStats() {
    document.getElementById('playerLevel').textContent = level;
    document.getElementById('playerXP').textContent = xp;
    document.getElementById('playerRPS').textContent = Math.round(score / 10);
    
    // Level up check
    if (xp >= level * 100) {
        level++;
        xp = 0;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modeButtons = document.querySelectorAll('.mode-btn[data-mode]');
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            currentMode = gameModes[mode];
            document.getElementById('gameMenu').classList.add('hidden');
            document.getElementById('gameArea').classList.remove('hidden');
            currentMode.init();
        });
    });

    // Play again button
    document.querySelector('.play-again-btn').addEventListener('click', () => {
        document.getElementById('results').classList.add('hidden');
        document.getElementById('gameMenu').classList.remove('hidden');
    });
}); 
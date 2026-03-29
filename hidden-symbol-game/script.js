document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const currentQuestionEl = document.getElementById('current-question');
    const totalQuestionsEl = document.getElementById('total-questions');
    const totalQuestionsEndEl = document.getElementById('total-questions-end');
    const num1El = document.getElementById('num1');
    const num2El = document.getElementById('num2');
    const resultEl = document.getElementById('result');
    const opButtons = document.querySelectorAll('.op-btn');
    
    const finalScoreEl = document.getElementById('final-score');
    const timerBarEl = document.getElementById('timer-bar');
    const elapsedTimeEl = document.getElementById('elapsed-time');
    const completionMessageEl = document.getElementById('completion-message');
    const menuBtn = document.getElementById('menu-btn');

    // Difficulty Settings
    const DIFFICULTIES = {
        'lv1': { name: '初級', ops: ['+', '-'], maxNum: 50, count: 15, time: 45 },
        'lv2': { name: '中級', ops: ['+', '-', '*', '/'], maxNum: 100, count: 15, time: 40 },
        'lv3': { name: '高級', ops: ['+', '-', '*', '/'], maxNum: 200, count: 15, time: 40 },
        'lv4': { name: '專業級', ops: ['+', '-', '*', '/'], maxNum: 500, count: 15, time: 30 }
    };

    // Game Variables
    let currentDifficulty = 'lv2';
    let currentQuestionCount = 0;
    let totalQuestions = 30;
    let score = 0;
    let currentCorrectOp = '';
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = 0;

    // ... (rest of logic) ...

    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const diff = urlParams.get('diff');
        if (diff && DIFFICULTIES[diff]) {
            currentDifficulty = diff;
            const config = DIFFICULTIES[currentDifficulty];
            totalQuestions = config.count;
            setTimeout(startGame, 500);
        } else {
            // Setup difficulty buttons
            const diffButtons = document.querySelectorAll('.diff-btn');
            diffButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const diff = btn.getAttribute('data-diff');
                    currentDifficulty = diff;
                    startGame();
                });
            });
        }
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
        startGame(); // Just start again with same difficulty
    });
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('diff')) {
                // If it was launched with a param, we can't really go "back" to selection 
                // unless we clear the param, so let's just reload to base URL
                window.location.href = window.location.pathname;
            } else {
                showScreen(startScreen);
            }
        });
    }
    
    opButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedOp = e.currentTarget.getAttribute('data-op');
            checkAnswer(selectedOp);
        });
    });

    function startGame() {
        const config = DIFFICULTIES[currentDifficulty];
        score = 0;
        currentQuestionCount = 0;
        totalQuestions = config.count;
        
        // Update title if needed
        const h1 = startScreen.querySelector('h1').textContent;
        const gameH1 = gameScreen.querySelector('h1') || document.createElement('h1');
        if (!gameScreen.querySelector('h1')) {
            gameScreen.prepend(gameH1);
        }
        gameH1.textContent = `${h1} (${config.name})`;
        gameH1.style.fontSize = '18px';
        gameH1.style.marginBottom = '10px';

        if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
        if (totalQuestionsEndEl) totalQuestionsEndEl.textContent = totalQuestions;
        startTime = Date.now();
        showScreen(gameScreen);
        startTimer(config.time);
        nextQuestion();
    }

    function showScreen(screen) {
        [startScreen, gameScreen, endScreen].forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    function nextQuestion() {
        currentQuestionCount++;
        if (currentQuestionCount > totalQuestions) {
            endGame();
            return;
        }
        currentQuestionEl.textContent = currentQuestionCount;
        generateQuestion();
    }

    function generateQuestion() {
        const config = DIFFICULTIES[currentDifficulty];
        let equationHTML = '';
        let result;

        if (currentDifficulty === 'lv1' || currentDifficulty === 'lv2') {
            // Simple logic: A [OP] B = result
            const ops = config.ops;
            const op = ops[Math.floor(Math.random() * ops.length)];
            currentCorrectOp = op;

            let a, b;
            const max = config.maxNum;

            if (op === '+') {
                a = getRandomInt(1, max);
                b = getRandomInt(1, max);
                result = a + b;
            } else if (op === '-') {
                a = getRandomInt(1, max);
                b = getRandomInt(1, a);
                result = a - b;
            } else if (op === '*') {
                a = getRandomInt(2, 12);
                b = getRandomInt(2, 12);
                result = a * b;
            } else if (op === '/') {
                b = getRandomInt(2, 12);
                result = getRandomInt(2, 12);
                a = b * result;
            }

            equationHTML = `
                <span class="number">${a}</span>
                <div class="question-box">?</div>
                <span class="number">${b}</span>
                <span class="equals">=</span>
                <span class="number">${result}</span>
            `;
        } else if (currentDifficulty === 'lv3') {
            // LV3: (A [OP] B) [FIXED_OP] C = result  OR  A [FIXED_OP] (B [OP] C) = result
            const ops = config.ops;
            const targetOp = ops[Math.floor(Math.random() * ops.length)];
            currentCorrectOp = targetOp;

            // Generate a valid 3-part equation
            // Pattern: (A ? B) + C = Result
            const extraOps = ['+', '-']; 
            const fixedOp = extraOps[Math.floor(Math.random() * extraOps.length)];
            
            let a, b, c, part1;
            
            // To keep it simple but meaningful:
            a = getRandomInt(5, 20);
            b = getRandomInt(5, 20);
            if (targetOp === '+') part1 = a + b;
            else if (targetOp === '-') { b = getRandomInt(1, a); part1 = a - b; }
            else if (targetOp === '*') part1 = a * b;
            else if (targetOp === '/') { b = getRandomInt(2, 10); a = b * getRandomInt(2, 10); part1 = a / b; }

            c = getRandomInt(5, 30);
            result = (fixedOp === '+') ? part1 + c : part1 - c;

            equationHTML = `
                <span class="symbol">(</span>
                <span class="number">${a}</span>
                <div class="question-box">?</div>
                <span class="number">${b}</span>
                <span class="symbol">)</span>
                <span class="symbol">${fixedOp === '+' ? '+' : '-'}</span>
                <span class="number">${c}</span>
                <span class="equals">=</span>
                <span class="number">${result}</span>
            `;
        } else if (currentDifficulty === 'lv4') {
            // LV4: More complex, potentially negative numbers or mixed priority
            // Pattern: Result = A * (B ? C) + D
            const ops = config.ops;
            const targetOp = ops[Math.floor(Math.random() * ops.length)];
            currentCorrectOp = targetOp;

            let a = getRandomInt(2, 10);
            let b = getRandomInt(10, 50);
            let c = getRandomInt(1, 10);
            let d = getRandomInt(-20, 50);
            let subPart;

            if (targetOp === '+') subPart = b + c;
            else if (targetOp === '-') subPart = b - c;
            else if (targetOp === '*') subPart = b * c;
            else if (targetOp === '/') { c = getRandomInt(2, 10); b = c * getRandomInt(2, 10); subPart = b / c; }

            result = a * subPart + d;

            equationHTML = `
                <span class="number">${a}</span>
                <span class="symbol">×</span>
                <span class="symbol">(</span>
                <span class="number">${b}</span>
                <div class="question-box">?</div>
                <span class="number">${c}</span>
                <span class="symbol">)</span>
                <span class="symbol">${d >= 0 ? '+' : '-'}</span>
                <span class="number">${Math.abs(d)}</span>
                <span class="equals">=</span>
                <span class="number">${result}</span>
            `;
        }

        const container = document.querySelector('.equation-container');
        if (container) container.innerHTML = equationHTML;
    }

    function checkAnswer(selectedOp) {
        if (selectedOp === currentCorrectOp) {
            score++;
        }
        nextQuestion();
    }

    function startTimer(totalSeconds) {
        stopTimer();
        timeLeft = totalSeconds * 100;
        timerBarEl.style.width = '100%';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const percentage = (timeLeft / (totalSeconds * 100)) * 100;
            timerBarEl.style.width = percentage + '%';
            
            if (timeLeft <= 0) {
                stopTimer();
                endGame(true);
            }
        }, 10);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function endGame(timeUp = false) {
        stopTimer();
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        finalScoreEl.textContent = score;
        elapsedTimeEl.textContent = elapsedSeconds;
        completionMessageEl.textContent = timeUp ? '時間到！' : '全部答完！';
        showScreen(endScreen);
        
        if (timeUp) {
            window.parent.postMessage({ type: 'scout-game', status: 'lose' }, '*');
        } else {
            window.parent.postMessage({ type: 'scout-game', status: 'win' }, '*');
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    init();
});

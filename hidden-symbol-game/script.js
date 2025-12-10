document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const currentQuestionEl = document.getElementById('current-question');
    const num1El = document.getElementById('num1');
    const num2El = document.getElementById('num2');
    const resultEl = document.getElementById('result');
    const opButtons = document.querySelectorAll('.op-btn');
    
    const finalScoreEl = document.getElementById('final-score');
    const timerBarEl = document.getElementById('timer-bar');
    const elapsedTimeEl = document.getElementById('elapsed-time');
    const completionMessageEl = document.getElementById('completion-message');

    // Game Variables
    let currentQuestionCount = 0;
    const totalQuestions = 30;
    let score = 0;
    let currentCorrectOp = '';
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = 0;

    // Constants
    const OPERATORS = ['+', '-', '*', '/'];
    const TOTAL_TIME = 30; // 30 seconds total for all questions

    // Event Listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    
    opButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedOp = e.target.getAttribute('data-op');
            checkAnswer(selectedOp);
        });
    });

    function startGame() {
        score = 0;
        currentQuestionCount = 0;
        startTime = Date.now();
        showScreen(gameScreen);
        startTimer();
        nextQuestion();
    }

    function showScreen(screen) {
        // Hide all screens
        [startScreen, gameScreen, endScreen].forEach(s => s.classList.remove('active'));
        // Show target screen
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
        // Randomly select operator
        const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
        currentCorrectOp = op;

        let a, b, result;

        switch (op) {
            case '+':
                a = getRandomInt(1, 20);
                b = getRandomInt(1, 20);
                result = a + b;
                break;
            case '-':
                a = getRandomInt(2, 20);
                b = getRandomInt(1, a - 1); // Ensure positive result (though negatives are fine, keeping it simple)
                result = a - b;
                break;
            case '*':
                a = getRandomInt(2, 12);
                b = getRandomInt(2, 12); // Keep numbers manageable for mental math
                result = a * b;
                break;
            case '/':
                b = getRandomInt(2, 10);
                result = getRandomInt(2, 12); // Result is integer
                a = b * result; // a is multiple of b
                break;
        }

        // Update UI
        num1El.textContent = a;
        num2El.textContent = b;
        resultEl.textContent = result;
    }

    function checkAnswer(selectedOp) {
        if (selectedOp === currentCorrectOp) {
            score++;
        }
        // Whether correct or wrong, move to next question immediately
        nextQuestion();
    }

    function startTimer() {
        stopTimer(); // Clear any existing timer
        timeLeft = TOTAL_TIME * 100; // Use centiseconds for smoother animation
        timerBarEl.style.width = '100%';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const percentage = (timeLeft / (TOTAL_TIME * 100)) * 100;
            timerBarEl.style.width = percentage + '%';
            
            if (timeLeft <= 0) {
                stopTimer();
                // Time's up, end game
                endGame(true);
            }
        }, 10); // Update every 10ms for smooth animation
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
        
        if (timeUp) {
            completionMessageEl.textContent = '時間到！';
        } else {
            completionMessageEl.textContent = '全部答完！';
        }
        
        showScreen(endScreen);
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
});

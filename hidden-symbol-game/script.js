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

    // Game Variables
    let currentQuestionCount = 0;
    const totalQuestions = 30;
    let score = 0;
    let currentCorrectOp = '';

    // Constants
    const OPERATORS = ['+', '-', '*', '/'];

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
        showScreen(gameScreen);
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
        // Optional: Add visual feedback here (green/red flash) logic if requested later
        nextQuestion();
    }

    function endGame() {
        finalScoreEl.textContent = score;
        showScreen(endScreen);
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
});

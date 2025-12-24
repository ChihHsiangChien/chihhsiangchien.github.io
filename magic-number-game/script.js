document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const keys = document.querySelectorAll('.key');

    const currentLevelSpan = document.getElementById('current-level');
    const digitCountSpan = document.getElementById('digit-count');
    const numberDisplay = document.getElementById('number-display');
    const messageDisplay = document.getElementById('message-display');
    const inputDisplay = document.getElementById('input-display');
    
    const resultTitle = document.getElementById('result-title');
    const resultIcon = document.getElementById('result-icon');
    const finalScore = document.getElementById('final-score');
    const resultMessage = document.getElementById('result-message');

    // --- State ---
    let level = 5;
    let sequence = [];
    let userSequence = [];
    let isAcceptingInput = false;

    // --- Constants ---
    const START_LEVEL = 5;
    const SHOW_TIME_PER_DIGIT = 1000; // 1 second total, but we show all at once? No, specific time.
    // Miller's Magic Number: 7 +/- 2.
    // Display strategy: Show distinct numbers for a duration based on length.
    // Formula: Max(2000ms, length * 600ms)
    
    // --- Event Listeners ---
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    keys.forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent double tap zoom issues
            const num = key.dataset.num;
            if (num !== undefined) {
                handleInput(num);
            } else if (key.id === 'clear-btn') {
                clearInput();
            } else if (key.id === 'backspace-btn') {
                backspace();
            }
        });
    });

    // Keyboard Support
    document.addEventListener('keydown', (e) => {
        if (!isAcceptingInput) return;
        
        if (e.key >= '0' && e.key <= '9') {
            handleInput(e.key);
        } else if (e.key === 'Backspace') {
            backspace();
        } else if (e.key === 'Escape' || e.key === 'Delete') {
            clearInput();
        }
    });

    // --- Core Logic ---

    function startGame() {
        level = START_LEVEL;
        switchScreen(startScreen, gameScreen);
        startLevel();
    }

    function startLevel() {
        sequence = generateSequence(level);
        userSequence = [];
        isAcceptingInput = false;
        
        // Update UI
        currentLevelSpan.textContent = level;
        digitCountSpan.textContent = level;
        numberDisplay.textContent = '...';
        inputDisplay.textContent = '';
        messageDisplay.classList.add('hidden');
        numberDisplay.classList.remove('hidden');

        // Delay slightly before showing numbers
        setTimeout(() => {
            showSequence();
        }, 500);
    }

    function generateSequence(length) {
        const arr = [];
        for (let i = 0; i < length; i++) {
            arr.push(Math.floor(Math.random() * 10));
        }
        return arr;
    }

    function showSequence() {
        const displayTime = Math.max(2000, level * 800); // Dynamic time
        
        // Show numbers
        numberDisplay.textContent = sequence.join(' ');
        
        // Hide after timer
        setTimeout(() => {
            numberDisplay.textContent = '';
            numberDisplay.classList.add('hidden'); // Hide the container to avoid faint visuals if any
            messageDisplay.classList.remove('hidden');
            isAcceptingInput = true;
        }, displayTime);
    }

    function handleInput(num) {
        if (!isAcceptingInput) return;

        // Visual feedback
        userSequence.push(num);
        updateInputDisplay();

        // Check completion
        if (userSequence.length === sequence.length) {
            isAcceptingInput = false;
            checkResult();
        }
    }

    function updateInputDisplay() {
        inputDisplay.textContent = userSequence.join(' ');
    }

    function backspace() {
        if (!isAcceptingInput || userSequence.length === 0) return;
        userSequence.pop();
        updateInputDisplay();
    }

    function clearInput() {
        if (!isAcceptingInput) return;
        userSequence = [];
        updateInputDisplay();
    }

    function checkResult() {
        const correct = userSequence.join('') === sequence.join('');
        
        if (correct) {
            // Success
            inputDisplay.style.color = 'var(--success)';
            setTimeout(() => {
                inputDisplay.style.color = '';
                level++;
                startLevel();
            }, 1000);
        } else {
            // Failure
            inputDisplay.classList.add('shake');
            setTimeout(() => {
                inputDisplay.classList.remove('shake');
                endGame();
            }, 1000);
        }
    }

    function endGame() {
        // Show Result Screen
        finalScore.textContent = level - 1; // Completed level
        
        // Message customization
        if (level - 1 >= 9) {
            resultIcon.textContent = '🤯';
            resultTitle.textContent = '大師等級！';
            resultMessage.textContent = '你的記憶力超越了常人！(Magic Number 7+2)';
        } else if (level - 1 >= 7) {
            resultIcon.textContent = '🎉';
            resultTitle.textContent = '太強了！';
            resultMessage.textContent = '你達到了人類短期記憶的平均上限。';
        } else if (level - 1 >= 5) {
            resultIcon.textContent = '👍';
            resultTitle.textContent = '不錯喔！';
            resultMessage.textContent = '再接再厲，挑戰極限！';
        } else {
            resultIcon.textContent = '😅';
            resultTitle.textContent = '再試一次';
            resultMessage.textContent = '集中注意力，你可以的。';
        }

        switchScreen(gameScreen, resultScreen);
    }

    function switchScreen(from, to) {
        from.classList.remove('active');
        setTimeout(() => {
            to.classList.add('active');
        }, 300); // Match CSS transition
    }
});

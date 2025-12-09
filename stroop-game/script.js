const colors = [
    { name: '紅', color: '#ff0000' },
    { name: '藍', color: '#0000ff' },
    { name: '綠', color: '#008000' },
    { name: '黃', color: '#ffff00' },
    { name: '黑', color: '#000000' },
    { name: '白', color: '#ffffff' }
];

let state = {
    score: 0,
    currentQuestion: 0,
    totalQuestions: 10,
    timer: null,
    timeLeft: 0,
    maxTime: 5000, // 5 seconds in ms
    isGameActive: false,
    correctAnswers: 0,
    correctAnswerName: ''
};

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const questionCountInput = document.getElementById('question-count');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const stemWord = document.getElementById('stem-word');
const optionsContainer = document.getElementById('options-container');
const scoreEl = document.getElementById('score');
const currentQEl = document.getElementById('current-question');
const totalQEl = document.getElementById('total-questions');
const timerBar = document.getElementById('timer-bar');
const feedbackEl = document.getElementById('feedback');
const finalScoreEl = document.getElementById('final-score');
const accuracyEl = document.getElementById('accuracy');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    endScreen.classList.remove('active');
    startScreen.classList.add('active');
});

function startGame() {
    state.totalQuestions = parseInt(questionCountInput.value) || 10;
    state.currentQuestion = 0;
    state.score = 0;
    state.correctAnswers = 0;
    state.isGameActive = true;

    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    endScreen.classList.remove('active');

    scoreEl.textContent = '0';
    totalQEl.textContent = state.totalQuestions;

    nextQuestion();
}

function nextQuestion() {
    if (state.currentQuestion >= state.totalQuestions) {
        endGame();
        return;
    }

    state.currentQuestion++;
    currentQEl.textContent = state.currentQuestion;
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';

    generateQuestion();
    startTimer();
}

function generateQuestion() {
    // 1. Decide the Target Options
    // 6 options total. all colors.
    
    // Target (Correct Answer Answer)
    const targetIndex = Math.floor(Math.random() * colors.length);
    const targetColor = colors[targetIndex];
    state.correctAnswerName = targetColor.name; 

    // 2. Decide Stem (The Big Word)
    // The "Ink Color" of the Stem MUST be the Target Meaning.
    
    let stemMeaningIndex;
    do {
        stemMeaningIndex = Math.floor(Math.random() * colors.length);
    } while (stemMeaningIndex === targetIndex); 
    const stemMeaning = colors[stemMeaningIndex];

    stemWord.textContent = stemMeaning.name;
    stemWord.style.color = targetColor.color;
    
    // Special bg for Stem visibility if text is yellow or white
    // Note: User only asked for "options" background? "黃色和白色的背景要用黑色"
    // Usually stems are large enough, but let's apply for consistency if needed.
    // Actually, strictly following "Yellow and White background must be black". I will apply to options.
    // For Stem, strict adherence might mean standard background. But White on White is invisible.
    // I will add a background to stem-container if the ink color is white.
    if (targetColor.name === '白' || targetColor.name === '黃') {
         document.getElementById('stem-container').style.backgroundColor = '#000';
         document.getElementById('stem-container').style.borderRadius = '10px';
    } else {
         document.getElementById('stem-container').style.backgroundColor = 'transparent';
    }

    // 3. Generate Options
    // We have exactly 6 colors. Use all of them as options.
    let options = [...colors];
    // Shuffle options positions (Text Meanings)
    options.sort(() => Math.random() - 0.5);

    // Generate Ink Colors: Must be a derangement of options (unique and no match)
    // We want a permutation of colors such that for every i, inks[i] !== options[i]
    let inks = [...colors];
    let isValidDerangement = false;
    
    // Simple rejection sampling for derangement (effective for N=6)
    while (!isValidDerangement) {
        inks.sort(() => Math.random() - 0.5);
        isValidDerangement = true;
        for (let i = 0; i < options.length; i++) {
            if (inks[i].name === options[i].name) {
                isValidDerangement = false;
                break;
            }
        }
    }

    optionsContainer.innerHTML = '';
    options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.classList.add('option-btn');
        btn.textContent = opt.name;
        
        // Use the deranged ink color
        const inkColor = inks[index];
        btn.style.color = inkColor.color;
        
        // "Yellow and White background must be black" logic
        if (inkColor.name === '黃' || inkColor.name === '白') {
            btn.style.backgroundColor = 'black';
            btn.style.borderColor = '#444';
        } else {
            btn.style.backgroundColor = 'white';
            btn.style.borderColor = '#ddd';
        }
        
        btn.onclick = () => handleAnswer(opt.name);
        optionsContainer.appendChild(btn);
    });
}

function startTimer() {
    if (state.timer) clearInterval(state.timer);
    
    state.timeLeft = state.maxTime;
    updateTimerBar();

    const interval = 50; // Update every 50ms
    state.timer = setInterval(() => {
        state.timeLeft -= interval;
        updateTimerBar();

        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            handleAnswer(null); // Time out
        }
    }, interval);
}

function updateTimerBar() {
    const percentage = (state.timeLeft / state.maxTime) * 100;
    timerBar.style.width = `${percentage}%`;
    
    // Change color based on urgency
    if (percentage < 30) {
        timerBar.style.backgroundColor = '#e74c3c'; // Red
    } else if (percentage < 60) {
        timerBar.style.backgroundColor = '#f1c40f'; // Yellow
    } else {
        timerBar.style.backgroundColor = '#27ae60'; // Green
    }
}

function handleAnswer(selectedName) {
    clearInterval(state.timer);
    
    if (!state.isGameActive) return;

    let points = 0;
    if (selectedName === state.correctAnswerName) {
        // Correct
        state.correctAnswers++;
        const timeBonus = Math.ceil(state.timeLeft / 100) * 10; // Max 500 bonus
        points = 100 + timeBonus;
        state.score += points;
        scoreEl.textContent = state.score;
        feedbackEl.textContent = `答對了! +${points}`;
        feedbackEl.classList.add('correct');
    } else {
        // Wrong or Timeout
        feedbackEl.textContent = selectedName ? '答錯了!' : '時間到!';
        feedbackEl.classList.add('wrong');
    }

    // Short delay before next question
    setTimeout(() => {
        nextQuestion();
    }, 1000); // 1 second delay to see feedback
}

function endGame() {
    state.isGameActive = false;
    gameScreen.classList.remove('active');
    endScreen.classList.add('active');
    
    finalScoreEl.textContent = state.score;
    
    const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
    accuracyEl.textContent = `${accuracy}%`;
}

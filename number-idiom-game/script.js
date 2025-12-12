
document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const NUMBER_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '萬', '億', '兩'];
    
    // Difficulty Settings
    const DIFFICULTIES = {
        'easy': { questions: 10, timePerQuestion: 0, scoreMult: 1, label: '入門' },
        'normal': { questions: 15, timePerQuestion: 20, scoreMult: 1.5, label: '標準' },
        'hard': { questions: 20, timePerQuestion: 10, scoreMult: 2, label: '困難' },
        'expert': { questions: 25, timePerQuestion: 5, scoreMult: 3, label: '大師' }
    };

    // --- Sound Manager ---
    const soundManager = {
        ctx: null,
        init: function() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        },
        play: function(type) {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;
            
            if (type === 'correct') {
                // High pitched ding
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
            } else if (type === 'wrong') {
                // Low pitched buzz
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.3);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        }
    };

    // --- State ---
    let state = {
        idioms: [],
        currentDifficulty: 'normal',
        currentQuestions: [],
        currentIndex: 0,
        score: 0,
        timer: null,
        timeLeft: 0,
        gameActive: false,
        startTime: 0,
        endTime: 0
    };

    // --- Elements ---
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        end: document.getElementById('end-screen')
    };

    const ui = {
        diffBtns: document.querySelectorAll('.diff-btn'),
        diffDesc: document.getElementById('difficulty-description'),
        startBtn: document.getElementById('start-btn'),
        restartBtn: document.getElementById('restart-btn'),
        score: document.getElementById('score-display'),
        timer: document.getElementById('timer-display'),
        progress: document.getElementById('progress-display'),
        idiomText: document.getElementById('idiom-text'),
        optionsGrid: document.getElementById('options-grid'),
        feedback: document.getElementById('feedback-message'),
        finalScore: document.getElementById('final-score'),
        endMessage: document.getElementById('end-message'),
        correctCount: document.getElementById('correct-count'),
        totalTime: document.getElementById('total-time')
    };

    // --- Initialization ---
    init();

    async function init() {
        // Load data
        try {
            const response = await fetch('data.json');
            const data = await response.json();
            state.idioms = data.idioms;
            console.log('Loaded ' + state.idioms.length + ' idioms');
        } catch (error) {
            console.error('Failed to load idioms:', error);
            alert('無法載入成語資料，請檢查 data.json');
        }

        // Event Listeners
        ui.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => setDifficulty(btn));
        });

        ui.startBtn.addEventListener('click', () => {
            // Init audio context on user interaction
            if (!soundManager.ctx) soundManager.init();
            startGame();
        });
        ui.restartBtn.addEventListener('click', () => showScreen('start'));
    }

    // --- Game Logic ---

    function setDifficulty(btn) {
        ui.diffBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.currentDifficulty = btn.dataset.diff;
        ui.diffDesc.textContent = btn.dataset.info;
    }

    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function startGame() {
        if (state.idioms.length === 0) return;

        const config = DIFFICULTIES[state.currentDifficulty];
        
        // Prepare questions
        const shuffled = [...state.idioms].sort(() => 0.5 - Math.random());
        // Filter idioms that actually contain at least one number from our list
        const validIdioms = shuffled.filter(idiom => {
             for (let char of idiom) {
                 if (NUMBER_CHARS.includes(char)) return true;
             }
             return false;
        });

        state.currentQuestions = validIdioms.slice(0, config.questions).map(prepareQuestion);
        state.currentIndex = 0;
        state.score = 0;
        state.gameActive = true;
        state.startTime = Date.now();
        state.correctAnswers = 0;

        updateStatUI();
        showScreen('game');
        loadQuestion();
    }

    function prepareQuestion(idiom) {
        // Find all indices of numbers
        const indices = [];
        for (let i = 0; i < idiom.length; i++) {
            if (NUMBER_CHARS.includes(idiom[i])) {
                indices.push(i);
            }
        }
        
        // Randomly pick one index to mask
        const maskIndex = indices[Math.floor(Math.random() * indices.length)];
        const answer = idiom[maskIndex];
        
        // No need to generate distractors anymore, we use the full keypad
        return {
            full: idiom,
            maskIndex: maskIndex,
            answer: answer
        };
    }

    function loadQuestion() {
        if (state.currentIndex >= state.currentQuestions.length) {
            endGame();
            return;
        }

        const q = state.currentQuestions[state.currentIndex];
        const config = DIFFICULTIES[state.currentDifficulty];

        // Reset Timer
        if (state.timer) clearInterval(state.timer);
        
        if (config.timePerQuestion > 0) {
            state.timeLeft = config.timePerQuestion;
            ui.timer.textContent = state.timeLeft;
            state.timer = setInterval(tickTimer, 1000);
        } else {
            ui.timer.textContent = '∞';
        }

        updateStatUI();
        renderIdiom(q);
        renderOptions(q); // checks global NUMBER_CHARS or just renders all
        ui.feedback.classList.add('hidden');
    }

    function tickTimer() {
        state.timeLeft--;
        ui.timer.textContent = state.timeLeft;
        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            handleAnswer(null, true); // Time out
        }
    }

    function renderIdiom(q) {
        ui.idiomText.innerHTML = '';
        for (let i = 0; i < q.full.length; i++) {
            const span = document.createElement('span');
            if (i === q.maskIndex) {
                span.textContent = '?';
                span.className = 'blank';
                span.id = 'target-blank';
            } else {
                span.textContent = q.full[i];
            }
            ui.idiomText.appendChild(span);
        }
    }

    function renderOptions(q) {
        ui.optionsGrid.innerHTML = '';
        // Render strict order: 1-10, then 100, 1000, 10000, 100M, Pair(Two)
        // User asked for: 一到九，還有百 千 萬 億. plus I added 十 and 兩 for completeness.
        // Let's sort them or keep the definition order.
        // Definition: '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '萬', '億', '兩'
        NUMBER_CHARS.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleAnswer(opt, false, btn));
            ui.optionsGrid.appendChild(btn);
        });
    }

    function handleAnswer(selected, isTimeout, btnElement) {
        if (!state.gameActive) return;
        
        clearInterval(state.timer);
        
        const q = state.currentQuestions[state.currentIndex];
        const isCorrect = selected === q.answer;
        const config = DIFFICULTIES[state.currentDifficulty];

        // UI Feedback
        const blank = document.getElementById('target-blank');
        blank.textContent = q.answer;
        blank.classList.remove('blank');
        
        // Disable all options
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => {
            b.style.pointerEvents = 'none';
            if (b.textContent === q.answer) {
                 b.classList.add('correct');
            } else if (b === btnElement && !isCorrect) {
                 b.classList.add('wrong');
            }
        });

        if (isCorrect) {
            soundManager.play('correct');
            blank.classList.add('filled');
            // Score calculation
            // Base score 100. Bonus for speed? 
            // Simple: 100 * multiplier
            const points = 100 * config.scoreMult;
            state.score += points;
            state.correctAnswers++;
            showFeedback('正確!', 'correct');
            animateScore(points);
        } else {
            soundManager.play('wrong');
            blank.style.color = 'var(--error-color)';
            showFeedback(isTimeout ? '時間到!' : '錯誤!', 'wrong');
        }

        // Next Question Delay
        setTimeout(() => {
            state.currentIndex++;
            loadQuestion();
        }, 1200);
    }

    function showFeedback(text, type) {
        ui.feedback.textContent = text;
        ui.feedback.className = `feedback-message ${type}`; // remove hidden
    }

    function animateScore(points) {
        // Visual effect for score increase could go here
    }

    function updateStatUI() {
        const total = state.currentQuestions.length;
        ui.progress.textContent = `${state.currentIndex + 1} / ${total}`;
        ui.score.textContent = Math.round(state.score);
    }

    function endGame() {
        state.gameActive = false;
        state.endTime = Date.now();
        const duration = Math.floor((state.endTime - state.startTime) / 1000);
        
        // Update End Screen
        ui.finalScore.textContent = Math.round(state.score);
        ui.correctCount.textContent = state.correctAnswers + ' / ' + state.currentQuestions.length;
        ui.totalTime.textContent = duration + 's';

        // Message
        const percentage = state.correctAnswers / state.currentQuestions.length;
        if (percentage === 1) ui.endMessage.textContent = '太神了！成語大師！';
        else if (percentage >= 0.8) ui.endMessage.textContent = '表現優異！';
        else if (percentage >= 0.6) ui.endMessage.textContent = '再接再厲！';
        else ui.endMessage.textContent = '加油，多讀書喔！';

        showScreen('end');
    }
});

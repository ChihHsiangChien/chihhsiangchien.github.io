// Web Audio API Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'tick') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    }
}

const game = {
    score: 0,
    time: 60,
    timerInterval: null,
    isPlaying: false,
    currentLevel: 1,
    currentQuestion: null,
    pool: [],
    correctlyAnswered: new Set(), // Track correctly answered countries
    
    // Config
    questionsPerRound: Infinity, // or time based? User asked for "Timed competitive", so time based limit is good.
    
    start: function(level) {
        this.currentLevel = level;
        this.score = 0;
        this.time = 60; // 60 seconds
        this.isPlaying = true;
        this.correctlyAnswered.clear(); // Reset tracking
        
        // Filter countries by difficulty
        // For higher levels, include lower levels to make pool bigger but prioritize level
        // Actually user spec said "Kindergarten degree", etc. strict filtering might be better to match the name.
        // Let's implement Strict Filtering for pure experience of that level.
        // But if pool is small (Kindy ~14), we might see repeats. Repeats are okay in speed run.
        this.pool = countries.filter(c => c.difficulty === level);
        
        // Fallback for empty levels if any
        if (this.pool.length < 4) {
             this.pool = countries.filter(c => c.difficulty <= level);
        }

        // GUI updates
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('score').innerText = this.score;
        document.getElementById('time').innerText = this.time;
        
        this.nextQuestion();
        this.startTimer();
    },

    startTimer: function() {
        this.timerInterval = setInterval(() => {
            this.time--;
            document.getElementById('time').innerText = this.time;
            
            if (this.time <= 10) {
                 document.getElementById('time').style.color = '#f56565';
                 if (this.time > 0) playTone('tick');
            }

            if (this.time <= 0) {
                this.endGame();
            }
        }, 1000);
    },
    nextQuestion: function() {
        if (!this.isPlaying) return;

        // Check if all countries have been answered correctly
        if (this.correctlyAnswered.size === this.pool.length) {
            // All questions completed! Add time bonus
            const timeBonus = this.time * 5; // 5 points per remaining second
            this.score += timeBonus;
            this.endGame(true); // Pass true to indicate completion
            return;
        }

        // Force mode Name -> Flag Options
        const mode = 'nameToFlag';
        
        // Pick correct answer - prioritize unanswered countries
        const unanswered = this.pool.filter(c => !this.correctlyAnswered.has(c.name));
        let correct;
        
        if (unanswered.length > 0) {
            // Pick from unanswered countries
            correct = unanswered[Math.floor(Math.random() * unanswered.length)];
        } else {
            // All answered, pick any
            correct = this.pool[Math.floor(Math.random() * this.pool.length)];
        }
        
        // Pick 3 distractors
        const distractors = [];
        while (distractors.length < 3) {
            const randomC = this.pool[Math.floor(Math.random() * this.pool.length)];
            if (randomC.name !== correct.name && !distractors.includes(randomC)) {
                distractors.push(randomC);
            }
        }
        
        // Combine and shuffle
        const options = [...distractors, correct].sort(() => Math.random() - 0.5);
        
        this.currentQuestion = { correct, options, mode };
        this.renderQuestion();
    },

    renderQuestion: function() {
        const qArea = document.getElementById('question-area');
        const oGrid = document.getElementById('options-grid');
        qArea.innerHTML = '';
        oGrid.innerHTML = '';

        const { correct, options } = this.currentQuestion;

        // Display Name, Choose Flag
        qArea.innerHTML = `<div class="name-display fade-in">${correct.name}</div>`;
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            // Create img element for flag
            const img = document.createElement('img');
            img.src = `https://flagcdn.com/h120/${opt.flag.toLowerCase()}.png`;
            img.alt = opt.name;
            img.style.width = '100px';
            img.style.height = 'auto';
            img.style.borderRadius = '4px';
            
            btn.appendChild(img);
            btn.onclick = () => this.handleAnswer(opt, btn);
            oGrid.appendChild(btn);
        });
    },

    handleAnswer: function(selected, btnElement) {
        if (!this.isPlaying) return;

        const isCorrect = selected.name === this.currentQuestion.correct.name;

        if (isCorrect) {
            // Mark this country as correctly answered
            this.correctlyAnswered.add(this.currentQuestion.correct.name);
            
            this.score += 10 + (this.currentLevel * 2); // Bonus for difficulty
            document.getElementById('score').innerText = this.score;
            btnElement.classList.add('correct');
            playTone('correct');
            
            setTimeout(() => {
                this.nextQuestion();
            }, 400); // Quick transition
        } else {
            // Wrong answer - remove from correctly answered if it was there
            this.correctlyAnswered.delete(this.currentQuestion.correct.name);
            
            // Penalty?
            this.score = Math.max(0, this.score - 5);
            document.getElementById('score').innerText = this.score;
            btnElement.classList.add('wrong');
            playTone('wrong');
            
            setTimeout(() => {
                this.nextQuestion();
            }, 600);
        }
    },

    endGame: function(completedAll = false) {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('end-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
        
        // Custom message
        const msg = document.getElementById('result-message');
        if (completedAll) {
            msg.innerText = "完美通關！全部答對！🎉🏆";
        } else if (this.score > 200) {
            msg.innerText = "地理天才！ 🌍";
        } else if (this.score > 100) {
            msg.innerText = "做得好！ 👍";
        } else {
            msg.innerText = "再接再厲！ 💪";
        }
    }
};

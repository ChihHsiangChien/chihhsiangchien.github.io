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

// ... (playTone remains same) ...

const game = {
    score: 0,
    time: 60,
    timerInterval: null,
    isPlaying: false,
    currentLevel: 1,
    currentQuestion: null,
    pool: [],
    correctlyAnswered: new Set(),
    
    start: function(level) {
        this.currentLevel = parseInt(level) || 1;
        this.score = 0;
        this.time = 60; 
        this.isPlaying = true;
        this.correctlyAnswered.clear();
        
        // 根據難度過濾國家
        if (this.currentLevel === 1) {
            this.pool = countries.filter(c => c.difficulty === 1);
        } else if (this.currentLevel === 2) {
            this.pool = countries.filter(c => c.difficulty <= 2);
        } else if (this.currentLevel === 3) {
            this.pool = countries.filter(c => c.difficulty <= 3);
        } else {
            this.pool = countries;
        }
        
        if (this.pool.length < 4) {
             this.pool = countries; // Fallback
        }

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
            if (this.time <= 5) playTone('tick');
            if (this.time <= 0) this.endGame();
        }, 1000);
    },

    nextQuestion: function() {
        // Pick a country from pool that hasn't been answered correctly yet
        const remaining = this.pool.filter(c => !this.correctlyAnswered.has(c.flag));
        const poolToUse = remaining.length > 0 ? remaining : this.pool;
        
        this.currentQuestion = poolToUse[Math.floor(Math.random() * poolToUse.length)];
        this.renderQuestion();
    },

    renderQuestion: function() {
        const flagImg = document.getElementById('flag-img');
        flagImg.src = `https://flagcdn.com/w320/${this.currentQuestion.flag.toLowerCase()}.png`;
        
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        
        // Generate options (correct + 3 random)
        const others = countries.filter(c => c.name !== this.currentQuestion.name);
        const distractors = [];
        while (distractors.length < 3) {
            const r = others[Math.floor(Math.random() * others.length)];
            if (!distractors.includes(r)) distractors.push(r);
        }
        
        const options = [this.currentQuestion, ...distractors].sort(() => Math.random() - 0.5);
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt.name;
            btn.onclick = () => this.handleAnswer(opt.name, btn);
            optionsContainer.appendChild(btn);
        });
    },

    handleAnswer: function(name, btn) {
        if (!this.isPlaying) return;
        
        if (name === this.currentQuestion.name) {
            playTone('correct');
            btn.classList.add('correct');
            this.score += 10;
            this.correctlyAnswered.add(this.currentQuestion.flag);
            document.getElementById('score').innerText = this.score;
            
            // Disable all buttons after choice
            document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
            
            setTimeout(() => this.nextQuestion(), 1000);
        } else {
            playTone('wrong');
            btn.classList.add('wrong');
            this.time = Math.max(0, this.time - 5);
            document.getElementById('time').innerText = this.time;
            
            // Temporary disable to prevent double clicking during animation
            btn.disabled = true;
            setTimeout(() => {
                btn.disabled = false;
                btn.classList.remove('wrong');
            }, 500);
        }
    },

    endGame: function() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('end-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
    }
};

// 頁面載入時自動處理難度
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const diff = urlParams.get('diff'); // lv1, lv2, lv3, lv4
    if (diff) {
        const levelNum = diff.replace('lv', '');
        setTimeout(() => game.start(levelNum), 500); // 延遲一下確保音訊環境準備
    }
});

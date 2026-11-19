/**
 * 科學概念排序挑戰 - 純淨一頁式版 (無 Emoji)
 */

// 音效系統 (Web Audio API)
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('sorting_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('sorting_muted', this.muted);
        return this.muted;
    }

    play(freq, type = 'sine', duration = 0.08, gainVal = 0.12) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // 忽略音效異常
        }
    }

    click() {
        this.play(520, 'triangle', 0.05, 0.08);
    }

    swap() {
        this.play(440, 'sine', 0.07, 0.1);
    }

    correct() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
            setTimeout(() => this.play(freq, 'sine', 0.12, 0.1), idx * 70);
        });
    }

    wrong() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        [320, 260].forEach((freq, idx) => {
            setTimeout(() => this.play(freq, 'triangle', 0.15, 0.1), idx * 90);
        });
    }

    victory() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.play(freq, 'triangle', 0.2, 0.15), idx * 100);
        });
    }
}

// 彩帶慶祝粒子特效 (無 emoji)
class ConfettiEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.particles = [];
        this.animId = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    fire(count = 100) {
        if (!this.canvas || !this.ctx) return;
        this.resize();
        const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                y: window.innerHeight / 2 - 50,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 1.1) * 12,
                size: Math.random() * 7 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 8,
                gravity: 0.3,
                drag: 0.96,
                opacity: 1
            });
        }
        if (this.animId) cancelAnimationFrame(this.animId);
        this.render();
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach((p) => {
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.opacity -= 0.008;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = Math.max(0, p.opacity);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            this.ctx.restore();
        });

        this.particles = this.particles.filter(p => p.opacity > 0 && p.y < this.canvas.height);
        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.render());
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.animId = null;
        }
    }
}

// 主應用物件
const App = {
    sound: new SoundEffects(),
    confetti: new ConfettiEffect('confetti-canvas'),

    currentActivityKey: '',
    activityData: null,
    correctOrder: [],
    isCyclic: false,

    timerInterval: null,
    secondsElapsed: 0,
    movesCount: 0,
    selectedCard: null,

    el: {
        list: document.getElementById('sortable-list'),
        title: document.getElementById('activity-title'),
        badge: document.getElementById('activity-badge'),
        desc: document.getElementById('activity-desc'),
        timerDisplay: document.getElementById('timer-display'),
        movesDisplay: document.getElementById('moves-display'),
        bestDisplay: document.getElementById('best-display'),
        soundBtn: document.getElementById('sound-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        checkBtn: document.getElementById('check-btn'),
        hintBtn: document.getElementById('hint-btn'),
        resultBox: document.getElementById('result-box'),
        resultTag: document.getElementById('result-status-tag'),
        resultMsg: document.getElementById('result-msg'),
        victoryModal: document.getElementById('victory-modal'),
        modalTime: document.getElementById('modal-time'),
        modalMoves: document.getElementById('modal-moves'),
        modalRetryBtn: document.getElementById('modal-retry-btn'),
        modalNextBtn: document.getElementById('modal-next-btn'),
        tocBtns: document.querySelectorAll('.toc-btn')
    },

    activityFiles: {
        'science': 'data_scientific.json',
        'animal': 'data_animal.json',
        'plant': 'data_plant.json',
        'digestiveTube': 'data_digestiveTube.json',
        'heart': 'data_heart.json'
    },

    activityOrder: ['science', 'animal', 'plant', 'digestiveTube', 'heart'],

    init() {
        this.bindEvents();
        this.updateSoundBtn();
        this.loadCurrentRoute();
    },

    getActivityFromUrl() {
        const params = new URLSearchParams(window.location.search);
        let act = params.get('activity') || '';
        if (act === '' || act === 'data_scientific') act = 'science';
        if (!this.activityFiles[act]) act = 'science';
        return act;
    },

    bindEvents() {
        // 左側 TOC 切換
        this.el.tocBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.dataset.activity || 'science';
                if (act !== this.currentActivityKey) {
                    this.switchActivity(act, true);
                }
            });
        });

        // 瀏覽器上一頁/下一頁
        window.addEventListener('popstate', () => {
            this.loadCurrentRoute();
        });

        // 音效開關
        this.el.soundBtn.addEventListener('click', () => {
            const muted = this.sound.toggleMute();
            this.updateSoundBtn();
            if (!muted) this.sound.click();
        });

        // 打亂按鈕
        this.el.shuffleBtn.addEventListener('click', () => {
            this.sound.click();
            this.resetGame(true);
        });

        // 檢核按鈕
        this.el.checkBtn.addEventListener('click', () => {
            this.checkAnswer();
        });

        // 提示按鈕
        this.el.hintBtn.addEventListener('click', () => {
            this.showHint();
        });

        // 彈窗按鈕
        this.el.modalRetryBtn.addEventListener('click', () => {
            this.el.victoryModal.classList.add('hidden');
            this.resetGame(true);
        });

        this.el.modalNextBtn.addEventListener('click', () => {
            this.el.victoryModal.classList.add('hidden');
            const currentIndex = this.activityOrder.indexOf(this.currentActivityKey);
            const nextKey = this.activityOrder[(currentIndex + 1) % this.activityOrder.length];
            this.switchActivity(nextKey, true);
        });

        this.el.victoryModal.addEventListener('click', (e) => {
            if (e.target === this.el.victoryModal) {
                this.el.victoryModal.classList.add('hidden');
            }
        });
    },

    updateSoundBtn() {
        this.el.soundBtn.textContent = this.sound.muted ? '音效: 關' : '音效: 開';
    },

    loadCurrentRoute() {
        const act = this.getActivityFromUrl();
        this.switchActivity(act, false);
    },

    switchActivity(actKey, pushHistory = true) {
        this.currentActivityKey = actKey;

        this.el.tocBtns.forEach(btn => {
            const btnAct = btn.dataset.activity || 'science';
            if (btnAct === actKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (pushHistory) {
            const newUrl = actKey === 'science' ? window.location.pathname : `?activity=${actKey}`;
            window.history.pushState({ activity: actKey }, '', newUrl);
        }

        const fileName = this.activityFiles[actKey] || 'data_scientific.json';
        fetch(fileName)
            .then(res => {
                if (!res.ok) throw new Error('讀取失敗');
                return res.json();
            })
            .then(data => {
                this.activityData = data;
                this.correctOrder = data.cards.map(c => c.title);
                this.isCyclic = !!data.isCyclic;

                this.renderHeader();
                this.resetGame(true);
            })
            .catch(err => {
                console.error(err);
                this.el.title.textContent = '載入失敗，請重新整理';
            });
    },

    renderHeader() {
        const data = this.activityData;
        this.el.title.textContent = data.title || '排序挑戰';
        
        if (this.isCyclic) {
            this.el.badge.textContent = '循環模式';
            this.el.badge.className = 'badge cyclic';
            this.el.desc.textContent = '提示：此為首尾相連之閉合循環路徑，從任一項目開始皆可，維持循環順序即可。';
        } else {
            this.el.badge.textContent = '線性排序';
            this.el.badge.className = 'badge';
            this.el.desc.textContent = '請依正確層次或邏輯先後順序，由上而下排列下列項目。';
        }

        this.updateBestDisplay();
    },

    updateBestDisplay() {
        const bestTime = localStorage.getItem(`sorting_best_${this.currentActivityKey}`);
        if (bestTime) {
            this.el.bestDisplay.textContent = this.formatTime(parseInt(bestTime, 10));
        } else {
            this.el.bestDisplay.textContent = '--:--';
        }
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    resetGame(shuffle = true) {
        this.clearSelection();

        this.movesCount = 0;
        this.el.movesDisplay.textContent = '0次';
        this.secondsElapsed = 0;
        this.el.timerDisplay.textContent = '00:00';
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            this.el.timerDisplay.textContent = this.formatTime(this.secondsElapsed);
        }, 1000);

        this.hideResult();

        let cards = [...this.activityData.cards];
        if (shuffle) {
            cards = this.getShuffledCards(cards);
        }
        this.renderCards(cards);
    },

    getShuffledCards(cards) {
        if (cards.length <= 1) return cards;
        let shuffled;
        let attempts = 0;
        do {
            shuffled = [...cards].sort(() => Math.random() - 0.5);
            attempts++;
        } while (this.isAlreadyCorrect(shuffled) && attempts < 10);
        return shuffled;
    },

    isAlreadyCorrect(cards) {
        const titles = cards.map(c => c.title);
        if (this.isCyclic) {
            const n = titles.length;
            for (let offset = 0; offset < n; offset++) {
                let match = true;
                for (let i = 0; i < n; i++) {
                    if (titles[i] !== this.correctOrder[(i + offset) % n]) {
                        match = false;
                        break;
                    }
                }
                if (match) return true;
            }
            return false;
        } else {
            return titles.every((t, i) => t === this.correctOrder[i]);
        }
    },

    renderCards(cards) {
        this.el.list.innerHTML = '';

        // 卡片數量超過 7 張（如 12 張循環）時採用雙欄佈局，確保同一頁面不須滾動
        if (cards.length > 7) {
            this.el.list.classList.add('multi-col');
        } else {
            this.el.list.classList.remove('multi-col');
        }

        cards.forEach((card, index) => {
            const li = document.createElement('li');
            li.className = 'card';
            li.draggable = true;
            li.dataset.title = card.title;

            // 左側握把與序號
            const leftDiv = document.createElement('div');
            leftDiv.className = 'card-left';

            const handle = document.createElement('span');
            handle.className = 'card-handle';
            handle.innerHTML = '&#8942;&#8942;';
            handle.title = '拖曳調整';

            const idxSpan = document.createElement('span');
            idxSpan.className = 'card-index';
            idxSpan.textContent = index + 1;

            leftDiv.appendChild(handle);
            leftDiv.appendChild(idxSpan);

            // 中間標題與簡要說明
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'card-body';

            const titleLine = document.createElement('div');
            titleLine.className = 'card-title-line';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'card-title';
            titleSpan.textContent = card.title;
            titleLine.appendChild(titleSpan);

            bodyDiv.appendChild(titleLine);

            if (card.content) {
                const descP = document.createElement('p');
                descP.className = 'card-desc';
                descP.textContent = card.content;
                descP.title = card.content;
                bodyDiv.appendChild(descP);
            }

            // 右側微調按鈕
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions';

            const stepBtnGroup = document.createElement('div');
            stepBtnGroup.className = 'step-btn-group';

            const upBtn = document.createElement('button');
            upBtn.className = 'step-btn up-btn';
            upBtn.innerHTML = '&#9650;';
            upBtn.title = '上移';
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveCard(li, -1);
            });

            const downBtn = document.createElement('button');
            downBtn.className = 'step-btn down-btn';
            downBtn.innerHTML = '&#9660;';
            downBtn.title = '下移';
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveCard(li, 1);
            });

            stepBtnGroup.appendChild(upBtn);
            stepBtnGroup.appendChild(downBtn);
            actionsDiv.appendChild(stepBtnGroup);

            li.appendChild(leftDiv);
            li.appendChild(bodyDiv);
            li.appendChild(actionsDiv);

            // 點選互換
            li.addEventListener('click', (e) => {
                if (e.target.closest('.step-btn')) return;
                this.handleCardClick(li);
            });

            this.el.list.appendChild(li);
        });

        this.updateStepButtons();
        this.enableDragAndDrop();
    },

    updateIndexes() {
        const cards = Array.from(this.el.list.children);
        cards.forEach((card, idx) => {
            const idxEl = card.querySelector('.card-index');
            if (idxEl) idxEl.textContent = idx + 1;
        });
        this.updateStepButtons();
    },

    updateStepButtons() {
        const cards = Array.from(this.el.list.children);
        const n = cards.length;
        cards.forEach((card, idx) => {
            const upBtn = card.querySelector('.up-btn');
            const downBtn = card.querySelector('.down-btn');
            if (upBtn) upBtn.disabled = idx === 0;
            if (downBtn) downBtn.disabled = idx === n - 1;
        });
    },

    handleCardClick(card) {
        if (!this.selectedCard) {
            this.selectedCard = card;
            card.classList.add('selected');
            this.sound.click();
        } else if (this.selectedCard === card) {
            this.clearSelection();
            this.sound.click();
        } else {
            const first = this.selectedCard;
            const second = card;

            const nextFirst = first.nextSibling;
            const nextSecond = second.nextSibling;

            if (nextFirst === second) {
                this.el.list.insertBefore(second, first);
            } else if (nextSecond === first) {
                this.el.list.insertBefore(first, second);
            } else {
                this.el.list.insertBefore(first, nextSecond);
                this.el.list.insertBefore(second, nextFirst);
            }

            this.clearSelection();
            this.onCardsReordered();
            this.sound.swap();
        }
    },

    clearSelection() {
        if (this.selectedCard) {
            this.selectedCard.classList.remove('selected');
            this.selectedCard = null;
        }
    },

    moveCard(card, direction) {
        const cards = Array.from(this.el.list.children);
        const index = cards.indexOf(card);
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < cards.length) {
            if (direction > 0) {
                this.el.list.insertBefore(card, cards[targetIndex].nextSibling);
            } else {
                this.el.list.insertBefore(card, cards[targetIndex]);
            }
            this.onCardsReordered();
            this.sound.swap();
        }
    },

    onCardsReordered() {
        this.clearSelection();
        this.updateIndexes();
        this.clearStatusBadges();
        this.hideResult();
        this.movesCount++;
        this.el.movesDisplay.textContent = `${this.movesCount}次`;
    },

    clearStatusBadges() {
        this.el.list.querySelectorAll('.status-badge').forEach(badge => badge.remove());
    },

    enableDragAndDrop() {
        let draggedItem = null;

        this.el.list.querySelectorAll('.card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedItem = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });

            card.addEventListener('dragend', () => {
                if (draggedItem) {
                    draggedItem.classList.remove('dragging');
                    draggedItem = null;
                }
                this.el.list.querySelectorAll('.card').forEach(c => {
                    c.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!draggedItem || draggedItem === card) return;

                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    card.classList.add('drag-over-top');
                    card.classList.remove('drag-over-bottom');
                } else {
                    card.classList.add('drag-over-bottom');
                    card.classList.remove('drag-over-top');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedItem || draggedItem === card) return;

                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    this.el.list.insertBefore(draggedItem, card);
                } else {
                    this.el.list.insertBefore(draggedItem, card.nextSibling);
                }

                card.classList.remove('drag-over-top', 'drag-over-bottom');
                this.onCardsReordered();
                this.sound.swap();
            });
        });

        // 觸控手柄拖曳
        this.el.list.querySelectorAll('.card-handle').forEach(handle => {
            let touchItem = null;

            handle.addEventListener('touchstart', () => {
                touchItem = handle.closest('.card');
                touchItem.classList.add('dragging');
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                if (!touchItem) return;
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!target) return;

                const overCard = target.closest('.card');
                if (overCard && overCard !== touchItem && overCard.parentNode === this.el.list) {
                    const rect = overCard.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    if (touch.clientY < mid) {
                        this.el.list.insertBefore(touchItem, overCard);
                    } else {
                        this.el.list.insertBefore(touchItem, overCard.nextSibling);
                    }
                }
            }, { passive: false });

            const endTouch = () => {
                if (touchItem) {
                    touchItem.classList.remove('dragging');
                    touchItem = null;
                    this.onCardsReordered();
                    this.sound.swap();
                }
            };

            handle.addEventListener('touchend', endTouch, { passive: true });
            handle.addEventListener('touchcancel', endTouch, { passive: true });
        });
    },

    checkAnswer() {
        this.clearStatusBadges();
        const cards = Array.from(this.el.list.children);
        const userOrder = cards.map(card => card.dataset.title);
        const total = this.correctOrder.length;

        let correctMatches = 0;
        let isAllCorrect = false;
        let bestOffset = 0;

        if (this.isCyclic) {
            let maxMatches = -1;
            for (let offset = 0; offset < total; offset++) {
                let matches = 0;
                for (let i = 0; i < total; i++) {
                    if (userOrder[i] === this.correctOrder[(i + offset) % total]) {
                        matches++;
                    }
                }
                if (matches > maxMatches) {
                    maxMatches = matches;
                    bestOffset = offset;
                }
            }

            correctMatches = maxMatches;
            isAllCorrect = (maxMatches === total);

            cards.forEach((card, i) => {
                const isCorrect = (userOrder[i] === this.correctOrder[(i + bestOffset) % total]);
                this.appendStatusBadge(card, isCorrect);
            });
        } else {
            cards.forEach((card, i) => {
                const isCorrect = (userOrder[i] === this.correctOrder[i]);
                if (isCorrect) correctMatches++;
                this.appendStatusBadge(card, isCorrect);
            });
            isAllCorrect = (correctMatches === total);
        }

        this.showResult(isAllCorrect, correctMatches, total);

        if (isAllCorrect) {
            clearInterval(this.timerInterval);
            this.sound.victory();
            this.confetti.fire(120);

            const prevBest = localStorage.getItem(`sorting_best_${this.currentActivityKey}`);
            let isNewBest = false;
            if (!prevBest || this.secondsElapsed < parseInt(prevBest, 10)) {
                localStorage.setItem(`sorting_best_${this.currentActivityKey}`, this.secondsElapsed);
                isNewBest = true;
                this.updateBestDisplay();
            }

            setTimeout(() => {
                this.el.modalTime.textContent = this.formatTime(this.secondsElapsed);
                this.el.modalMoves.textContent = `${this.movesCount}次`;
                const summary = document.getElementById('victory-summary');
                if (isNewBest) {
                    summary.innerHTML = `刷新本主題最佳紀錄！共花費 ${this.formatTime(this.secondsElapsed)}。`;
                } else {
                    summary.textContent = `已完全掌握「${this.activityData.title}」的正確順序！`;
                }
                this.el.victoryModal.classList.remove('hidden');
            }, 500);
        } else if (correctMatches >= Math.ceil(total / 2)) {
            this.sound.correct();
        } else {
            this.sound.wrong();
        }
    },

    appendStatusBadge(card, isCorrect) {
        const badge = document.createElement('span');
        badge.className = `status-badge ${isCorrect ? 'correct' : 'incorrect'}`;
        badge.textContent = isCorrect ? 'O' : 'X';
        badge.title = isCorrect ? '正確' : '錯誤';
        const actions = card.querySelector('.card-actions');
        if (actions) {
            actions.insertBefore(badge, actions.firstChild);
        } else {
            card.appendChild(badge);
        }
    },

    showResult(isAllCorrect, correct, total) {
        this.el.resultBox.classList.remove('hidden', 'success', 'partial', 'error');

        if (isAllCorrect) {
            this.el.resultBox.classList.add('success');
            this.el.resultTag.textContent = '全部正確';
            this.el.resultMsg.textContent = `已正確排列所有 ${total} 個項目。`;
        } else if (correct >= Math.ceil(total / 2)) {
            this.el.resultBox.classList.add('partial');
            this.el.resultTag.textContent = `完成 ${correct}/${total}`;
            this.el.resultMsg.textContent = 'O 表示位置正確，請調整標示 X 的項目。';
        } else {
            this.el.resultBox.classList.add('error');
            this.el.resultTag.textContent = `目前 ${correct}/${total}`;
            this.el.resultMsg.textContent = '尚未完全正確，可嘗試交換位置後再次檢核。';
        }
    },

    hideResult() {
        this.el.resultBox.classList.add('hidden');
    },

    showHint() {
        this.sound.click();
        const cards = Array.from(this.el.list.children);
        const userOrder = cards.map(c => c.dataset.title);

        if (this.isCyclic) {
            alert(`循環系統提示：\n血液流動順序為「心室 -> 動脈 -> 微血管 -> 靜脈 -> 心房」。\n例如左心室收縮進入主動脈，肺靜脈則回流至左心房。`);
        } else {
            for (let i = 0; i < this.correctOrder.length; i++) {
                if (userOrder[i] !== this.correctOrder[i]) {
                    alert(`排序提示：\n第 ${i + 1} 個正確項目應為「${this.correctOrder[i]}」。`);
                    return;
                }
            }
            alert(`提示：目前順序已全部正確，請點擊「檢核答案」。`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

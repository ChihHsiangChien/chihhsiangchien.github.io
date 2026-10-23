/**
 * OmNomNom — 台灣濕地食物鏈桌遊（改編自桌遊 Om Nom Nom）
 *
 * 規則摘要：
 *  1. 擲 8 顆骰子，每顆隨機出現 3 種初級消費者或 3 種次級消費者，放到棋盤上。
 *  2. 每位玩家同時暗出 1 張掠食者卡（次級或高級消費者）。
 *  3. 每條食物鏈由上往下結算：高級消費者先吃次級（卡牌優先、再吃骰子），
 *     存活的次級消費者再吃初級骰子；同種掠食者平分，除不盡者剩下。
 *  4. 每吃 1 隻得 1 分；另以 10% 法則計算同化的能量（kJ）。
 *  5. 3 季 × 3 回合，每季初手牌補滿 6 張。
 *
 * 結構：
 *  - 第 1 部分：純邏輯引擎（resolveTurn / aiChooseCard），可在 Node 中測試。
 *  - 第 2 部分：瀏覽器介面（僅在有 document 時執行）。
 */

(function (root) {
    'use strict';

    // =========================================================================
    // 1. 遊戲資料與純邏輯引擎
    // =========================================================================
    const SVG_TADPOLE = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="22" cy="32" rx="14" ry="11" fill="#3e2723"/><path d="M34 32 C44 22,50 42,62 30" stroke="#3e2723" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="16" cy="28" r="3" fill="#fff"/></svg>';
    const SVG_NYMPH = '<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#5d4037" stroke-width="3" stroke-linecap="round"><path d="M26 22 L12 15 M26 26 L9 30 M27 30 L14 42 M38 22 L52 15 M38 26 L55 30 M37 30 L50 42"/></g><g fill="#6d4c41"><ellipse cx="32" cy="12" rx="9" ry="7"/><ellipse cx="32" cy="24" rx="7" ry="7"/><ellipse cx="32" cy="45" rx="9" ry="16"/></g><circle cx="27" cy="10" r="2.5" fill="#cddc39"/><circle cx="37" cy="10" r="2.5" fill="#cddc39"/></svg>';

    const SPECIES = {
        butterfly: { id: 'butterfly', name: '蝶蛾', icon: '🦋', tier: 1, chain: 0, diet: '植物葉片、花蜜' },
        mosquito:  { id: 'mosquito',  name: '蚊蠅', icon: '🦟', tier: 1, chain: 1, diet: '植物汁液、有機碎屑' },
        tadpole:   { id: 'tadpole',   name: '蝌蚪', svg: SVG_TADPOLE, tier: 1, chain: 2, diet: '水中藻類' },
        wasp:      { id: 'wasp',      name: '胡蜂', icon: '🐝', tier: 2, chain: 0, diet: '蝶蛾幼蟲（毛蟲）' },
        frog:      { id: 'frog',      name: '赤蛙', icon: '🐸', tier: 2, chain: 1, diet: '蚊蠅等小型昆蟲' },
        nymph:     { id: 'nymph',     name: '水蠆', svg: SVG_NYMPH, tier: 2, chain: 2, diet: '蝌蚪、孑孓' },
        spider:    { id: 'spider',    name: '蜘蛛', icon: '🕷️', tier: 3, chain: 0, diet: '胡蜂等昆蟲' },
        rail:      { id: 'rail',      name: '秧雞', icon: '🐦', tier: 3, chain: 1, diet: '赤蛙、昆蟲' },
        turtle:    { id: 'turtle',    name: '斑龜', icon: '🐢', tier: 3, chain: 2, diet: '水蠆、小魚' }
    };

    const CHAINS = [
        { name: '陸生昆蟲鏈', emoji: '🌾', bottom: 'butterfly', mid: 'wasp', top: 'spider' },
        { name: '濕地飛蟲鏈', emoji: '💧', bottom: 'mosquito', mid: 'frog', top: 'rail' },
        { name: '池塘水生鏈', emoji: '🫧', bottom: 'tadpole', mid: 'nymph', top: 'turtle' }
    ];

    const TIER_NAME = { 1: '初級消費者', 2: '次級消費者', 3: '高級消費者' };
    const DICE_FACES = ['butterfly', 'mosquito', 'tadpole', 'wasp', 'frog', 'nymph'];
    const CARD_TYPES = ['wasp', 'frog', 'nymph', 'spider', 'rail', 'turtle'];
    const DICE_COUNT = 8;
    const SEASONS = 3;
    const TURNS_PER_SEASON = 3;

    // 10% 法則模型：獵物體內所含能量（kJ），以及傳遞效率
    const PREY_ENERGY = { 1: 100, 2: 10 };
    const TRANSFER_RATE = 0.1;

    function shuffle(arr, rng) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function rollDiceSet(rng, count) {
        const dice = {};
        DICE_FACES.forEach(f => { dice[f] = 0; });
        for (let i = 0; i < (count || DICE_COUNT); i++) {
            dice[DICE_FACES[Math.floor(rng() * DICE_FACES.length)]]++;
        }
        return dice;
    }

    /**
     * 結算一回合。
     * @param {Object} dice  {speciesId: 數量}
     * @param {Array}  plays [{player: 玩家索引, card: speciesId}]
     * @param {Function} rng 亂數（決定平分不盡時哪幾張卡被吃）
     * @returns {{gains, energy, events, eatenPlays, remaining}}
     */
    function resolveTurn(dice, plays, rng) {
        rng = rng || Math.random;
        const gains = {};
        const energy = {};
        const events = [];
        const eatenPlays = new Set();
        const remaining = Object.assign({}, dice);

        plays.forEach(p => { gains[p.player] = 0; energy[p.player] = 0; });
        const indexed = plays.map((p, i) => ({ player: p.player, card: p.card, i }));

        CHAINS.forEach((ch, c) => {
            const tops = indexed.filter(p => p.card === ch.top);
            const mids = shuffle(indexed.filter(p => p.card === ch.mid), rng);

            // (a) 高級消費者先吃次級消費者（卡牌優先，再吃骰子）
            if (tops.length > 0) {
                const midDice = remaining[ch.mid] || 0;
                const preyTotal = mids.length + midDice;
                const share = Math.floor(preyTotal / tops.length);
                const totalEaten = share * tops.length;
                const cardsEaten = Math.min(mids.length, totalEaten);
                const diceEaten = totalEaten - cardsEaten;
                const victims = mids.slice(0, cardsEaten);

                victims.forEach(v => eatenPlays.add(v.i));
                remaining[ch.mid] = midDice - diceEaten;
                tops.forEach(t => {
                    gains[t.player] += share;
                    energy[t.player] += share * PREY_ENERGY[2] * TRANSFER_RATE;
                });
                events.push({
                    type: 'top', chain: c, predator: ch.top, prey: ch.mid,
                    eaters: tops.map(t => t.player), share,
                    cardsEaten, diceEaten,
                    victims: victims.map(v => v.player),
                    leftover: preyTotal - totalEaten
                });
            }

            // (b) 存活的次級消費者吃初級消費者骰子
            const survivors = mids.filter(m => !eatenPlays.has(m.i));
            if (survivors.length > 0) {
                const bottomDice = remaining[ch.bottom] || 0;
                const share = Math.floor(bottomDice / survivors.length);
                remaining[ch.bottom] = bottomDice - share * survivors.length;
                survivors.forEach(s => {
                    gains[s.player] += share;
                    energy[s.player] += share * PREY_ENERGY[1] * TRANSFER_RATE;
                });
                events.push({
                    type: 'mid', chain: c, predator: ch.mid, prey: ch.bottom,
                    eaters: survivors.map(s => s.player), share,
                    cardsEaten: 0, diceEaten: share * survivors.length,
                    victims: [],
                    leftover: bottomDice - share * survivors.length
                });
            }
        });

        return { gains, energy, events, eatenPlays: Array.from(eatenPlays), remaining };
    }

    /**
     * 電腦選牌：蒙地卡羅模擬（對手從其手牌中隨機出牌），選期望得分最高的卡。
     * hands: 每位玩家的手牌陣列。
     */
    function aiChooseCard(playerIdx, hands, dice, rng, samples) {
        rng = rng || Math.random;
        samples = samples || 150;
        const myHand = hands[playerIdx];
        let best = myHand[0];
        let bestValue = -Infinity;

        myHand.forEach(card => {
            let total = 0;
            for (let s = 0; s < samples; s++) {
                const plays = hands.map((h, i) => ({
                    player: i,
                    card: i === playerIdx ? card : h[Math.floor(rng() * h.length)]
                }));
                total += resolveTurn(dice, plays, rng).gains[playerIdx];
            }
            const value = total / samples + rng() * 0.25; // 少許隨機，避免太好預測
            if (value > bestValue) {
                bestValue = value;
                best = card;
            }
        });
        return best;
    }

    const Engine = {
        SPECIES, CHAINS, TIER_NAME, DICE_FACES, CARD_TYPES, DICE_COUNT,
        SEASONS, TURNS_PER_SEASON, PREY_ENERGY, TRANSFER_RATE,
        rollDiceSet, resolveTurn, aiChooseCard, shuffle
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    }
    root.OmNomNomEngine = Engine;

    if (typeof document === 'undefined') return;

    // =========================================================================
    // 2. 音效（Web Audio API 合成，無需音檔）
    // =========================================================================
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime + delay;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(gainLevel, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }

    function playDiceRattle() {
        for (let i = 0; i < 5; i++) playTone(200 + Math.random() * 250, 'triangle', 0.06, i * 0.07, 0.12);
    }
    function playCardFlip() { playTone(520, 'sine', 0.08, 0, 0.15); playTone(780, 'sine', 0.08, 0.06, 0.12); }
    function playEatChime() {
        playTone(523.25, 'sine', 0.15, 0, 0.22);
        playTone(659.25, 'sine', 0.18, 0.08, 0.25);
        playTone(783.99, 'sine', 0.25, 0.16, 0.28);
    }
    function playEatenSound() { playTone(190, 'sawtooth', 0.12, 0, 0.2); playTone(140, 'sawtooth', 0.22, 0.1, 0.22); }
    function playSeasonFanfare() {
        [392.0, 523.25, 659.25, 783.99].forEach((f, i) => playTone(f, 'triangle', 0.15, i * 0.08, 0.22));
    }
    function playVictoryChime() {
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => playTone(f, 'triangle', 0.3, i * 0.12, 0.25));
    }

    // =========================================================================
    // 3. 遊戲狀態
    // =========================================================================
    const PLAYER_COLORS = ['#1e88e5', '#e53935', '#8e24aa', '#ef6c00'];
    const PLAYER_NAMES = ['你', '電腦 A', '電腦 B', '電腦 C'];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    let players = [];
    let season = 1;
    let turn = 1;
    let dice = null;
    let plays = [];          // 本回合揭曉的出牌
    let eatenSet = new Set();
    let selectedCard = null;
    let phase = 'setup';     // setup | roll | choose | resolve | over
    let isRolling = false;
    let opponentCount = 2;

    // DOM
    const $ = id => document.getElementById(id);
    const setupPanel = $('setupPanel');
    const gamePanel = $('gamePanel');
    const startBtn = $('startBtn');
    const boardEl = $('board');
    const handEl = $('hand');
    const diceBtn = $('diceBtn');
    const revealBtn = $('revealBtn');
    const diceFace = $('diceFace');
    const diceResult = $('diceResult');
    const roundDisplay = $('roundDisplay');
    const playerScoresEl = $('playerScores');
    const energyPanel = $('energyPanel');
    const statusBanner = $('statusBanner');
    const eventLog = $('eventLog');
    const rulesBtn = $('rulesBtn');
    const rulesModal = $('rulesModal');
    const closeModalBtn = $('closeModalBtn');
    const modalUnderstoodBtn = $('modalUnderstoodBtn');
    const victoryModal = $('victoryModal');
    const playAgainBtn = $('playAgainBtn');
    const resetBtn = $('resetBtn');
    const soundBtn = $('soundBtn');

    function iconHTML(sp, cls) {
        return `<span class="sp-icon ${cls || ''}">${sp.svg || sp.icon}</span>`;
    }
    function playerTag(idx) {
        const p = players[idx];
        return `<span class="ptag" style="--pc:${p.color}">${p.name}</span>`;
    }
    function names(idxs) { return idxs.map(playerTag).join('、'); }

    // =========================================================================
    // 4. 畫面繪製
    // =========================================================================
    function buildBoard() {
        boardEl.innerHTML = '';
        // 欄標題
        CHAINS.forEach(ch => {
            const h = document.createElement('div');
            h.className = 'chain-header';
            h.textContent = `${ch.emoji} ${ch.name}`;
            boardEl.appendChild(h);
        });
        // 由上到下：高級、次級、初級
        ['top', 'mid', 'bottom'].forEach(level => {
            CHAINS.forEach((ch, c) => {
                const sp = SPECIES[ch[level]];
                const cell = document.createElement('div');
                cell.className = `cell tier-${sp.tier}`;
                cell.id = `cell-${sp.id}`;
                cell.innerHTML = `
                    <div class="cell-head">
                        ${iconHTML(sp)}
                        <div class="cell-title">
                            <strong>${sp.name}</strong>
                            <small>${TIER_NAME[sp.tier]}・吃${sp.diet}</small>
                        </div>
                    </div>
                    <div class="cell-dice" id="dice-${sp.id}"></div>
                    <div class="cell-cards" id="cards-${sp.id}"></div>
                    <div class="cell-badge" id="badge-${sp.id}"></div>`;
                boardEl.appendChild(cell);
            });
            if (level !== 'bottom') {
                CHAINS.forEach(() => {
                    const arrow = document.createElement('div');
                    arrow.className = 'flow-arrow';
                    arrow.setAttribute('aria-hidden', 'true');
                    arrow.innerHTML = '▲ <small>能量 10%</small>';
                    boardEl.appendChild(arrow);
                });
            }
        });
    }

    function renderDice() {
        DICE_FACES.forEach(id => {
            const el = $(`dice-${id}`);
            if (!el) return;
            el.innerHTML = '';
            const n = dice ? dice[id] : 0;
            for (let i = 0; i < n; i++) {
                const d = document.createElement('span');
                d.className = 'die';
                d.innerHTML = SPECIES[id].svg || SPECIES[id].icon;
                el.appendChild(d);
            }
        });
    }

    function renderPlayedCards() {
        CARD_TYPES.forEach(id => { const el = $(`cards-${id}`); if (el) el.innerHTML = ''; });
        plays.forEach((p, i) => {
            const el = $(`cards-${p.card}`);
            if (!el) return;
            const card = document.createElement('span');
            card.className = 'mini-card' + (eatenSet.has(i) ? ' eaten' : '');
            card.style.setProperty('--pc', players[p.player].color);
            card.textContent = players[p.player].name;
            card.title = eatenSet.has(i) ? '這張卡被吃掉了' : '';
            el.appendChild(card);
        });
    }

    function clearBadges() {
        document.querySelectorAll('.cell-badge').forEach(b => { b.textContent = ''; b.className = 'cell-badge'; });
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('flash-eat', 'flash-eaten'));
    }

    function renderHand() {
        handEl.innerHTML = '';
        const me = players[0];
        CARD_TYPES.forEach(id => {
            const sp = SPECIES[id];
            const owned = me.hand.includes(id);
            const btn = document.createElement('button');
            btn.className = `hand-card tier-${sp.tier}` + (selectedCard === id ? ' selected' : '') + (owned ? '' : ' used');
            btn.disabled = !owned || phase !== 'choose';
            btn.setAttribute('aria-pressed', selectedCard === id ? 'true' : 'false');
            btn.innerHTML = `
                ${iconHTML(sp, 'big')}
                <strong>${sp.name}</strong>
                <small>${TIER_NAME[sp.tier]}</small>
                <small class="eats">吃：${SPECIES[sp.tier === 3 ? CHAINS[sp.chain].mid : CHAINS[sp.chain].bottom].name}</small>
                ${owned ? '' : '<span class="used-label">已出</span>'}`;
            btn.addEventListener('click', () => selectCard(id));
            handEl.appendChild(btn);
        });
    }

    function renderScores() {
        playerScoresEl.innerHTML = players.map((p, i) => `
            <div class="score-card player-card" style="--pc:${p.color}">
                <span class="score-label">${p.isHuman ? '🙋' : '🤖'} ${p.name}</span>
                <span class="score-value"><strong id="score-${i}">${p.score}</strong> 分</span>
                <span class="score-sub">同化 ${fmt(p.energy)} kJ ・手牌 ${p.hand.length}</span>
            </div>`).join('');
        roundDisplay.textContent = `第 ${season} / ${SEASONS} 季・第 ${turn} / ${TURNS_PER_SEASON} 回合`;
    }

    function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

    function logEvent(html, type) {
        statusBanner.innerHTML = html;
        const item = document.createElement('div');
        item.className = `log-item log-${type || 'info'}`;
        item.innerHTML = `<strong>[${season}-${turn}]</strong> ${html}`;
        eventLog.insertBefore(item, eventLog.firstChild);
        while (eventLog.children.length > 40) eventLog.removeChild(eventLog.lastChild);
    }

    function updateButtons() {
        diceBtn.disabled = isRolling || phase !== 'roll';
        revealBtn.disabled = phase !== 'choose' || !selectedCard;
    }

    // =========================================================================
    // 5. 遊戲流程
    // =========================================================================
    function startGame(n) {
        initAudio();
        opponentCount = n;
        players = [];
        for (let i = 0; i <= n; i++) {
            players.push({
                name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], isHuman: i === 0,
                hand: CARD_TYPES.slice(), score: 0, energy: 0,
                ateBottom: 0, ateMid: 0, lostCards: 0
            });
        }
        season = 1; turn = 1; dice = null; plays = []; eatenSet = new Set();
        selectedCard = null; phase = 'roll'; isRolling = false;

        setupPanel.hidden = true;
        gamePanel.hidden = false;
        victoryModal.style.display = 'none';
        eventLog.innerHTML = '';
        energyPanel.innerHTML = '<p class="muted">揭曉後，這裡會計算每次「吃」實際同化了多少能量。</p>';
        diceFace.textContent = '🎲';
        diceResult.textContent = '按「擲骰」產生本回合的獵物。';

        buildBoard();
        renderDice();
        renderHand();
        renderScores();
        updateButtons();
        logEvent(`遊戲開始！你和 ${n} 位電腦對手在濕地中搶食。`, 'season');
    }

    async function rollDice() {
        if (isRolling || phase !== 'roll') return;
        isRolling = true;
        diceBtn.disabled = true;
        initAudio();

        plays = []; eatenSet = new Set(); selectedCard = null;
        clearBadges();
        renderPlayedCards();
        playDiceRattle();
        diceFace.classList.add('dice-rolling');
        diceResult.textContent = '🎲 擲骰中...';

        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        for (let k = 0; k < 6; k++) {
            diceFace.textContent = faces[Math.floor(Math.random() * 6)];
            dice = rollDiceSet(Math.random);
            renderDice();
            await sleep(70);
        }
        diceFace.classList.remove('dice-rolling');
        diceFace.textContent = '🎲';

        const summary = DICE_FACES.filter(f => dice[f] > 0).map(f => `${SPECIES[f].name}×${dice[f]}`).join('、');
        diceResult.textContent = `擲出：${summary}。請從手牌選 1 張掠食者卡。`;
        logEvent(`擲骰結果：${summary}`, 'info');

        isRolling = false;
        phase = 'choose';
        renderHand();
        updateButtons();
    }

    function selectCard(id) {
        if (phase !== 'choose' || !players[0].hand.includes(id)) return;
        selectedCard = selectedCard === id ? null : id;
        playTone(selectedCard ? 660 : 330, 'sine', 0.06, 0, 0.12);
        if (selectedCard) diceResult.textContent = `你選了「${SPECIES[id].name}」，按「出牌揭曉」。`;
        renderHand();
        updateButtons();
    }

    async function reveal() {
        if (phase !== 'choose' || !selectedCard) return;
        phase = 'resolve';
        updateButtons();

        // 電腦根據「出牌前」的手牌同時決定
        const handsBefore = players.map(p => p.hand.slice());
        plays = players.map((p, i) => ({
            player: i,
            card: i === 0 ? selectedCard : aiChooseCard(i, handsBefore, dice, Math.random)
        }));
        plays.forEach(p => {
            const h = players[p.player].hand;
            h.splice(h.indexOf(p.card), 1);
        });

        playCardFlip();
        renderPlayedCards();
        renderHand();
        logEvent('揭曉：' + plays.map(p => `${playerTag(p.player)} 出 ${SPECIES[p.card].name}`).join('，'), 'info');
        await sleep(700);

        const result = resolveTurn(dice, plays, Math.random);
        energyPanel.innerHTML = '';

        if (result.events.length === 0) {
            energyPanel.innerHTML = '<p class="muted">這回合沒有任何掠食發生。</p>';
        }

        for (const ev of result.events) {
            await showEvent(ev, result);
            await sleep(750);
        }

        // 套用分數與統計
        players.forEach((p, i) => {
            p.score += result.gains[i] || 0;
            p.energy += result.energy[i] || 0;
        });
        result.events.forEach(ev => {
            ev.eaters.forEach(i => {
                if (ev.type === 'top') players[i].ateMid += ev.share; else players[i].ateBottom += ev.share;
            });
            ev.victims.forEach(i => { players[i].lostCards++; });
        });
        // 出牌但沒吃到東西的提示
        plays.forEach((p, i) => {
            if (!result.events.some(ev => ev.eaters.includes(p.player) && ev.predator === p.card) && !eatenSet.has(i)) {
                logEvent(`${playerTag(p.player)} 的 ${SPECIES[p.card].name} 沒有吃到獵物。`, 'miss');
            }
        });

        dice = result.remaining;
        renderDice();
        renderScores();
        nextTurn();
    }

    async function showEvent(ev, result) {
        const pred = SPECIES[ev.predator];
        const prey = SPECIES[ev.prey];
        const cell = $(`cell-${ev.predator}`);
        const badge = $(`badge-${ev.predator}`);

        if (ev.type === 'top' && ev.cardsEaten > 0) {
            result.eatenPlays.forEach(i => {
                if (plays[i].card === ev.prey) eatenSet.add(i);
            });
            renderPlayedCards();
            const preyCell = $(`cell-${ev.prey}`);
            if (preyCell) preyCell.classList.add('flash-eaten');
            playEatenSound();
        }

        if (ev.share > 0) {
            cell.classList.add('flash-eat');
            badge.textContent = `每位 +${ev.share}`;
            badge.className = 'cell-badge show';
            playEatChime();
        } else {
            badge.textContent = '沒吃到';
            badge.className = 'cell-badge show miss';
        }

        // 日誌
        let msg = `${names(ev.eaters)} 的 ${pred.name}`;
        if (ev.share > 0) {
            const parts = [];
            if (ev.cardsEaten) parts.push(`${ev.cardsEaten} 張${prey.name}卡（${names(ev.victims)}）`);
            if (ev.diceEaten) parts.push(`${ev.diceEaten} 顆${prey.name}骰`);
            msg += ` 吃掉 ${parts.join(' 和 ')}`;
            if (ev.eaters.length > 1) msg += `，${ev.eaters.length} 位平分，每位 ${ev.share} 隻`;
            if (ev.leftover) msg += `，剩 ${ev.leftover} 隻分不完`;
            msg += '。';
        } else {
            msg += ev.leftover
                ? ` 想吃${prey.name}，但數量不夠平分（${ev.leftover} 隻 ÷ ${ev.eaters.length} 位），全部落空。`
                : ` 沒有${prey.name}可以吃，餓肚子了。`;
        }
        logEvent(msg, ev.cardsEaten ? 'hazard' : 'predation');

        // 能量計算
        if (ev.share > 0) {
            const intake = ev.share * PREY_ENERGY[prey.tier];
            const gain = intake * TRANSFER_RATE;
            const row = document.createElement('div');
            row.className = `energy-row tier-${pred.tier}`;
            row.innerHTML = `
                <div class="er-title">${iconHTML(pred)} ${pred.name}（${names(ev.eaters)}）每位吃 ${ev.share} 隻${prey.name}</div>
                <div class="er-calc">攝入 ${ev.share} × ${PREY_ENERGY[prey.tier]} = <b>${intake} kJ</b>
                → 同化 ≈ <b class="gain">${fmt(gain)} kJ</b>（10%）
                ，約 ${fmt(intake - gain)} kJ 以熱散失或未被利用</div>`;
            energyPanel.appendChild(row);
        }
    }

    function nextTurn() {
        turn++;
        if (turn > TURNS_PER_SEASON) {
            turn = 1;
            season++;
            if (season > SEASONS) {
                season = SEASONS; turn = TURNS_PER_SEASON;
                phase = 'over';
                updateButtons();
                setTimeout(showResults, 900);
                return;
            }
            players.forEach(p => { p.hand = CARD_TYPES.slice(); });
            playSeasonFanfare();
            logEvent(`🍂 進入第 ${season} 季，所有人的手牌補滿 6 張！`, 'season');
        }
        phase = 'roll';
        selectedCard = null;
        diceResult.textContent = `第 ${season} 季第 ${turn} 回合：按「擲骰」繼續。`;
        renderHand();
        renderScores();
        updateButtons();
    }

    function showResults() {
        playVictoryChime();
        const ranking = players.map((p, i) => ({ p, i }))
            .sort((a, b) => b.p.score - a.p.score || b.p.energy - a.p.energy);
        const topScore = ranking[0].p.score;
        const winners = ranking.filter(r => r.p.score === topScore);
        const humanWon = winners.some(r => r.i === 0);

        $('victoryTitle').textContent = humanWon ? '🏆 你是濕地頂級掠食者！' : '🌿 遊戲結束';
        $('victoryMessage').innerHTML = humanWon
            ? (winners.length > 1 ? '你與對手同分並列第一！' : '恭喜！你吃到最多獵物，贏得這局。')
            : `${names(winners.map(w => w.i))} 獲勝，再接再厲！`;

        $('resultTable').innerHTML = `
            <thead><tr><th>名次</th><th>玩家</th><th>得分<br><small>（吃到隻數）</small></th>
            <th>吃初級</th><th>吃次級</th><th>卡被吃</th><th>同化能量</th></tr></thead>
            <tbody>${ranking.map((r, k) => `
                <tr><td>${k + 1}</td><td>${playerTag(r.i)}</td><td><b>${r.p.score}</b></td>
                <td>${r.p.ateBottom}</td><td>${r.p.ateMid}</td><td>${r.p.lostCards}</td>
                <td>${fmt(r.p.energy)} kJ</td></tr>`).join('')}
            </tbody>`;

        const me = players[0];
        const intakeBottom = me.ateBottom * PREY_ENERGY[1];
        const intakeMid = me.ateMid * PREY_ENERGY[2];
        $('energySummary').innerHTML = `
            <h3>⚡ 你的能量帳本</h3>
            <p>當次級消費者吃了 <b>${me.ateBottom}</b> 隻初級消費者：攝入 ${intakeBottom} kJ → 同化 ${fmt(intakeBottom * TRANSFER_RATE)} kJ</p>
            <p>當高級消費者吃了 <b>${me.ateMid}</b> 隻次級消費者：攝入 ${intakeMid} kJ → 同化 ${fmt(intakeMid * TRANSFER_RATE)} kJ</p>
            <p class="insight">💡 吃 1 隻獵物都算 1 分，但同化的能量差了 10 倍：每往上一個營養階層，大約只剩 10% 的能量能傳下去。所以高級消費者需要吃大量獵物，數量也最少。</p>`;

        victoryModal.style.display = 'flex';
    }

    function backToSetup() {
        phase = 'setup';
        victoryModal.style.display = 'none';
        gamePanel.hidden = true;
        setupPanel.hidden = false;
    }

    // =========================================================================
    // 6. 事件綁定
    // =========================================================================
    document.querySelectorAll('.btn-choice').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.btn-choice').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            opponentCount = Number(b.dataset.n);
        });
    });
    startBtn.addEventListener('click', () => startGame(opponentCount));
    diceBtn.addEventListener('click', rollDice);
    revealBtn.addEventListener('click', reveal);
    playAgainBtn.addEventListener('click', () => startGame(opponentCount));
    resetBtn.addEventListener('click', backToSetup);

    function openRules() {
        rulesModal.style.display = 'flex';
        rulesBtn.setAttribute('aria-expanded', 'true');
        closeModalBtn.focus();
    }
    function closeRules() {
        rulesModal.style.display = 'none';
        rulesBtn.setAttribute('aria-expanded', 'false');
    }
    rulesBtn.addEventListener('click', openRules);
    closeModalBtn.addEventListener('click', closeRules);
    modalUnderstoodBtn.addEventListener('click', closeRules);
    rulesModal.addEventListener('click', e => { if (e.target === rulesModal) closeRules(); });

    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
        if (soundEnabled) playTone(440, 'sine', 0.1);
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeRules(); return; }
        if (rulesModal.style.display === 'flex' || victoryModal.style.display === 'flex') return;
        const tag = document.activeElement && document.activeElement.tagName;
        if (e.code === 'Space' && !e.repeat && tag !== 'INPUT' && tag !== 'TEXTAREA') {
            if (phase === 'roll') { e.preventDefault(); rollDice(); }
        } else if (e.key === 'Enter' && phase === 'choose' && selectedCard) {
            e.preventDefault();
            reveal();
        } else if (phase === 'choose' && /^[1-6]$/.test(e.key)) {
            selectCard(CARD_TYPES[Number(e.key) - 1]);
        }
    });
})(typeof window !== 'undefined' ? window : globalThis);

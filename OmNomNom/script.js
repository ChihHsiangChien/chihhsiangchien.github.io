/**
 * OmNomNom — Taiwan Wetland Food Chain Board Game
 * Features:
 * - 9 Taiwan wetland organisms across 3 trophic tiers and 3 parallel food chains.
 * - Accessible rules modal dialog (#rulesBtn, #rulesModal, #closeModalBtn).
 * - Animated dice rolling engine with roll-state locking (#diceBtn, #diceResult).
 * - Glowing pawn token moving step-by-step along 9-tile loop (pos + roll) % 9.
 * - Predation and energy events ("Om Nom Nom!"), lap migration bonuses.
 * - Web Audio API synthesized sound effects.
 * - Responsive canvas scaling and scoreboard.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Web Audio API Sound Synthesizer
    // -------------------------------------------------------------------------
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
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
        // Multi-frequency rattle sound for dice rolling
        for (let i = 0; i < 4; i++) {
            const f = 200 + Math.random() * 250;
            playTone(f, 'triangle', 0.06, i * 0.07, 0.12);
        }
    }

    function playHop(stepIndex = 0) {
        // Rising pitch blip as pawn hops across tiles
        const baseFreq = 300 + (stepIndex % 6) * 40;
        playTone(baseFreq, 'sine', 0.12, 0, 0.2);
    }

    function playEatChime() {
        // Cheerful C5-E5-G5 bite/arpeggio chime
        playTone(523.25, 'sine', 0.15, 0, 0.22);    // C5
        playTone(659.25, 'sine', 0.18, 0.08, 0.25); // E5
        playTone(783.99, 'sine', 0.25, 0.16, 0.28); // G5
    }

    function playLapFanfare() {
        // Migration lap completion arpeggio
        playTone(392.00, 'triangle', 0.12, 0, 0.2);    // G4
        playTone(523.25, 'triangle', 0.12, 0.08, 0.22); // C5
        playTone(659.25, 'triangle', 0.15, 0.16, 0.25); // E5
        playTone(783.99, 'triangle', 0.3, 0.24, 0.3);   // G5
    }

    function playHazardSound() {
        // Warning buzz for predator encounter
        playTone(190, 'sawtooth', 0.12, 0, 0.2);
        playTone(140, 'sawtooth', 0.22, 0.1, 0.22);
    }

    function playVictoryChime() {
        // Triumphant victory fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            playTone(freq, 'triangle', 0.3, idx * 0.12, 0.25);
        });
    }

    // -------------------------------------------------------------------------
    // 2. 9-Tile Ecological Board Path Mapping
    // -------------------------------------------------------------------------
    // Coordinates match the 3x3 grid:
    // col 0: 陸生昆蟲鏈, col 1: 濕地飛蟲鏈, col 2: 池塘水生鏈
    // row 0: 高級掠食者, row 1: 次級消費者, row 2: 初級消費者
    const boardPath = [
        { col: 0, row: 2, name: "蝶蛾", icon: "🦋", trophic: "初級消費者", tier: 1, energy: 15, chain: "陸生昆蟲鏈", desc: "採集花蜜嫩葉" },
        { col: 1, row: 2, name: "蚊蠅", icon: "🪰", trophic: "初級消費者", tier: 1, energy: 15, chain: "濕地飛蟲鏈", desc: "攝食腐殖有機質" },
        { col: 2, row: 2, name: "蝌蚪", icon: "🫧", trophic: "初級消費者", tier: 1, energy: 15, chain: "池塘水生鏈", desc: "水中啃食綠藻" },
        { col: 2, row: 1, name: "水蠆", icon: "🪲", trophic: "次級消費者", tier: 2, energy: 25, chain: "池塘水生鏈", desc: "伏擊捕食蝌蚪" },
        { col: 1, row: 1, name: "赤蛙", icon: "🐸", trophic: "次級消費者", tier: 2, energy: 25, chain: "濕地飛蟲鏈", desc: "彈舌捕食飛蟲" },
        { col: 0, row: 1, name: "胡蜂", icon: "🐝", trophic: "次級消費者", tier: 2, energy: 25, chain: "陸生昆蟲鏈", desc: "狩獵毛蟲與幼蟲" },
        { col: 0, row: 0, name: "蜘蛛", icon: "🕷️", trophic: "高級消費者", tier: 3, energy: 35, chain: "陸生昆蟲鏈", desc: "結網伏擊昆蟲" },
        { col: 1, row: 0, name: "秧雞", icon: "🦤", trophic: "高級消費者", tier: 3, energy: 35, chain: "濕地飛蟲鏈", desc: "涉水獵食赤蛙" },
        { col: 2, row: 0, name: "斑龜", icon: "🐢", trophic: "高級消費者", tier: 3, energy: 35, chain: "池塘水生鏈", desc: "水棲頂級掠食" }
    ];

    // Grid definition for backward compatibility and rendering
    window.grid = [
        ["蜘蛛", "胡蜂", "蝶蛾"],
        ["秧雞", "赤蛙", "蚊蠅"],
        ["斑龜", "水蠆", "蝌蚪"]
    ];

    // -------------------------------------------------------------------------
    // 3. Canvas & Game State
    // -------------------------------------------------------------------------
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 700;
    canvas.height = 600;

    const gridSize = 3;
    const cellVspace = 14;
    const cellHspace = 14;
    const handsHspace = 14;
    const handsVspace = 14;
    const handsWidth = 140;
    const handsHeight = canvas.height - 2 * handsVspace;

    const cellWidth = (canvas.width - handsWidth - (gridSize + 1) * cellHspace) / gridSize;
    const cellHeight = (canvas.height - (gridSize + 1) * cellVspace) / gridSize;

    // Game Variables
    let playerPos = 0;       // 0 to 8 on boardPath
    let playerEnergy = 10;   // starts with 10 energy points
    const maxEnergy = 100;
    let lapCount = 1;        // starts at Lap 1
    const maxLaps = 5;
    let turnCount = 0;
    let isRolling = false;
    let isMoving = false;
    let isGameOver = false;

    // Floating text particle effects on canvas
    let particles = [];

    // DOM Elements
    const diceBtn = document.getElementById('diceBtn');
    const diceResult = document.getElementById('diceResult');
    const diceFace = document.getElementById('diceFace');
    const energyDisplay = document.getElementById('energyDisplay');
    const energyMeterBar = document.getElementById('energyMeterBar');
    const lapDisplay = document.getElementById('lapDisplay');
    const turnDisplay = document.getElementById('turnDisplay');
    const currentTileDisplay = document.getElementById('currentTileDisplay');
    const statusBanner = document.getElementById('statusBanner');
    const eventLog = document.getElementById('eventLog');
    const eventCountBadge = document.getElementById('eventCountBadge');

    // Rules Modal Elements
    const rulesBtn = document.getElementById('rulesBtn');
    const rulesModal = document.getElementById('rulesModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalUnderstoodBtn = document.getElementById('modalUnderstoodBtn');

    // Victory Modal Elements
    const victoryModal = document.getElementById('victoryModal');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const resetBtn = document.getElementById('resetBtn');
    const soundBtn = document.getElementById('soundBtn');

    // -------------------------------------------------------------------------
    // 4. Scoreboard & Event Log Updates
    // -------------------------------------------------------------------------
    function updateScoreboard() {
        if (energyDisplay) {
            energyDisplay.innerHTML = `<strong>${playerEnergy}</strong> / ${maxEnergy} 點`;
        }
        if (energyMeterBar) {
            const percent = Math.min(100, Math.max(0, (playerEnergy / maxEnergy) * 100));
            energyMeterBar.style.width = `${percent}%`;
            if (percent >= 80) {
                energyMeterBar.style.background = 'linear-gradient(90deg, #ffb300, #00e676)';
            } else if (percent <= 20) {
                energyMeterBar.style.background = 'linear-gradient(90deg, #e53935, #ffb300)';
            } else {
                energyMeterBar.style.background = 'linear-gradient(90deg, #43a047, #00e676)';
            }
        }
        if (lapDisplay) {
            lapDisplay.innerHTML = `第 <strong>${lapCount}</strong> / ${maxLaps} 圈`;
        }
        if (turnDisplay) {
            turnDisplay.innerHTML = `第 <strong>${turnCount}</strong> 回合`;
        }
        if (currentTileDisplay) {
            const tile = boardPath[playerPos];
            currentTileDisplay.textContent = `${tile.icon} ${tile.name} (${tile.trophic.slice(0, 2)})`;
        }
    }

    function logEvent(message, type = 'predation') {
        if (statusBanner) {
            statusBanner.textContent = message;
        }
        if (!eventLog) return;

        const item = document.createElement('div');
        item.className = `log-item log-${type}`;
        item.innerHTML = `<strong>[第 ${turnCount} 回合]</strong> ${message}`;
        eventLog.insertBefore(item, eventLog.firstChild);

        // Limit log entries
        while (eventLog.children.length > 20) {
            eventLog.removeChild(eventLog.lastChild);
        }
    }

    function addParticle(x, y, text, color = '#2e7d32') {
        particles.push({
            x: x,
            y: y,
            text: text,
            color: color,
            alpha: 1.0,
            vy: -1.2,
            life: 45
        });
    }

    // -------------------------------------------------------------------------
    // 5. Board Rendering Engine (Canvas)
    // -------------------------------------------------------------------------
    function getTileCenter(col, row) {
        const x = handsHspace + handsWidth + col * cellWidth + (col + 1) * cellHspace;
        const y = row * cellHeight + (row + 1) * cellVspace;
        return {
            x: x + cellWidth / 2,
            y: y + cellHeight / 2,
            left: x,
            top: y
        };
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Left Hand / Dashboard Column
        drawHands();

        // 2. Draw Column Zone Backgrounds & Food Web Arrows
        drawEcologicalZones();

        // 3. Draw 9 Species Cell Cards
        drawGridCells();

        // 4. Draw Traversal Route Arrows
        drawRoutePath();

        // 5. Draw Glowing Player Pawn Token
        drawPlayerPawn();

        // 6. Draw Animated Particles
        drawParticles();
    }

    function drawHands() {
        ctx.save();
        // Left Column Panel Container
        const x = handsHspace;
        const y = handsVspace;
        const w = handsWidth;
        const h = handsHeight;

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = "#80cbc4";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Header Title
        ctx.fillStyle = "#004d40";
        ctx.font = "bold 15px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("🌿 濕地生態導覽", x + w / 2, y + 14);

        // Trophic Level Color Badges
        const badges = [
            { label: "高級掠食者", color: "#c62828", bg: "#ffebee", y: y + 50 },
            { label: "次級消費者", color: "#7b1fa2", bg: "#f3e5f5", y: y + 215 },
            { label: "初級消費者", color: "#2e7d32", bg: "#e8f5e9", y: y + 380 }
        ];

        badges.forEach(b => {
            ctx.fillStyle = b.bg;
            roundRect(ctx, x + 12, b.y, w - 24, 28, 6);
            ctx.fill();
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = b.color;
            ctx.font = "bold 12px -apple-system, sans-serif";
            ctx.fillText(b.label, x + w / 2, b.y + 7);
        });

        // Instructions
        ctx.fillStyle = "#546e7a";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.fillText("擲骰走訪9大物種", x + w / 2, y + 510);
        ctx.fillText("累積100點能量獲勝", x + w / 2, y + 528);

        ctx.restore();
    }

    function drawEcologicalZones() {
        ctx.save();
        const colNames = ["陸生昆蟲鏈 🌾", "濕地飛蟲鏈 💧", "池塘水生鏈 🫧"];
        const colBgColors = ["rgba(255, 248, 225, 0.6)", "rgba(224, 247, 250, 0.6)", "rgba(227, 242, 253, 0.6)"];

        for (let col = 0; col < 3; col++) {
            const x = handsHspace + handsWidth + col * cellWidth + (col + 1) * cellHspace;
            const w = cellWidth;
            const y = cellVspace;
            const h = canvas.height - 2 * cellVspace;

            ctx.fillStyle = colBgColors[col];
            roundRect(ctx, x, y, w, h, 10);
            ctx.fill();

            // Column Header Banner at Top
            ctx.fillStyle = "rgba(0, 77, 64, 0.75)";
            ctx.font = "bold 12px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(colNames[col], x + w / 2, y + 2);
        }
        ctx.restore();
    }

    function drawGridCells() {
        ctx.save();
        for (let idx = 0; idx < boardPath.length; idx++) {
            const tile = boardPath[idx];
            const coord = getTileCenter(tile.col, tile.row);
            const x = coord.left;
            const y = coord.top;
            const w = cellWidth;
            const h = cellHeight;

            // Card background based on trophic tier
            let cardBg = "#ffffff";
            let borderColor = "#cfd8dc";
            let trophicBadgeColor = "#2e7d32";
            let trophicBadgeBg = "#e8f5e9";

            if (tile.tier === 3) {
                cardBg = "#fff8f8";
                borderColor = "#ef9a9a";
                trophicBadgeColor = "#c62828";
                trophicBadgeBg = "#ffebee";
            } else if (tile.tier === 2) {
                cardBg = "#fbf7fd";
                borderColor = "#ce93d8";
                trophicBadgeColor = "#7b1fa2";
                trophicBadgeBg = "#f3e5f5";
            } else {
                cardBg = "#f7fbf7";
                borderColor = "#a5d6a7";
                trophicBadgeColor = "#2e7d32";
                trophicBadgeBg = "#e8f5e9";
            }

            // Draw Card Container
            ctx.fillStyle = cardBg;
            ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
            ctx.shadowBlur = 6;
            ctx.beginPath();
            roundRect(ctx, x, y, w, h, 10);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Tile Path Index Badge in Top Left
            ctx.fillStyle = "#78909c";
            ctx.font = "bold 11px -apple-system, sans-serif";
            ctx.textAlign = "start";
            ctx.textBaseline = "top";
            ctx.fillText(`格位 ${idx}`, x + 8, y + 8);

            // Trophic Badge in Top Right
            ctx.fillStyle = trophicBadgeBg;
            roundRect(ctx, x + w - 58, y + 6, 50, 18, 4);
            ctx.fill();
            ctx.fillStyle = trophicBadgeColor;
            ctx.font = "bold 10px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(tile.trophic.slice(0, 2), x + w - 33, y + 8);

            // Large Organism Icon / Emoji
            ctx.font = "38px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tile.icon, x + w / 2, y + h / 2 - 12);

            // Organism Name
            ctx.fillStyle = "#263238";
            ctx.font = "bold 16px -apple-system, sans-serif";
            ctx.fillText(tile.name, x + w / 2, y + h / 2 + 22);

            // Description / Energy value
            ctx.fillStyle = "#607d8b";
            ctx.font = "11px -apple-system, sans-serif";
            ctx.fillText(`+${tile.energy}⚡ ${tile.desc}`, x + w / 2, y + h - 18);
        }
        ctx.restore();
    }

    function drawRoutePath() {
        // Draw dotted path lines between successive tiles along the 9-tile loop
        ctx.save();
        ctx.strokeStyle = "rgba(0, 150, 136, 0.35)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        for (let i = 0; i < boardPath.length; i++) {
            const from = getTileCenter(boardPath[i].col, boardPath[i].row);
            const nextIdx = (i + 1) % boardPath.length;
            const to = getTileCenter(boardPath[nextIdx].col, boardPath[nextIdx].row);

            if (i === 0) ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawPlayerPawn() {
        ctx.save();
        const currentTile = boardPath[playerPos];
        const coord = getTileCenter(currentTile.col, currentTile.row);
        const px = coord.x;
        const py = coord.y - 14;

        // Pulsating glowing outer aura
        const time = Date.now() / 250;
        const glowRadius = 32 + Math.sin(time) * 4;

        const grad = ctx.createRadialGradient(px, py, 10, px, py, glowRadius);
        grad.addColorStop(0, "rgba(0, 230, 118, 0.75)");
        grad.addColorStop(0.6, "rgba(0, 230, 118, 0.3)");
        grad.addColorStop(1, "rgba(0, 230, 118, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid token
        ctx.fillStyle = "#00c853";
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // White border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Token Icon / Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("探險", px, py);

        ctx.restore();
    }

    function drawParticles() {
        ctx.save();
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.y += p.vy;
            p.life--;
            p.alpha = Math.max(0, p.life / 45);

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.font = "bold 18px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
            ctx.shadowBlur = 4;
            ctx.fillText(p.text, p.x, p.y);

            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
        ctx.restore();
    }

    function roundRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    // Animation loop for continuous smooth pawn glow and floating text
    function animLoop() {
        drawBoard();
        requestAnimationFrame(animLoop);
    }

    // -------------------------------------------------------------------------
    // 6. Dice Rolling & Turn Engine
    // -------------------------------------------------------------------------
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    async function rollDice() {
        if (isRolling || isMoving || isGameOver) return;
        initAudio();

        isRolling = true;
        diceBtn.disabled = true;
        turnCount++;
        updateScoreboard();

        if (diceFace) diceFace.classList.add('dice-rolling');
        if (diceResult) diceResult.textContent = '🎲 骰子旋轉中...';

        playDiceRattle();

        // Animate dice faces over 350ms
        let finalRoll = 1;
        const rollDuration = 350;
        const startTime = Date.now();

        await new Promise(resolve => {
            const interval = setInterval(() => {
                const randomFaceIndex = Math.floor(Math.random() * 6);
                finalRoll = randomFaceIndex + 1;
                if (diceFace) diceFace.textContent = diceFaces[randomFaceIndex];

                if (Date.now() - startTime >= rollDuration) {
                    clearInterval(interval);
                    resolve();
                }
            }, 60);
        });

        if (diceFace) {
            diceFace.classList.remove('dice-rolling');
            diceFace.textContent = diceFaces[finalRoll - 1];
        }

        if (diceResult) {
            diceResult.textContent = `🎲 擲出 ${finalRoll} 點！探險者前進！`;
        }

        isRolling = false;
        isMoving = true;

        // Move player forward finalRoll steps
        await movePlayer(finalRoll);
    }

    async function movePlayer(steps) {
        for (let s = 1; s <= steps; s++) {
            await new Promise(r => setTimeout(r, 220));

            const prevPos = playerPos;
            playerPos = (playerPos + 1) % boardPath.length;

            playHop(s);
            updateScoreboard();

            // Check Ecological Migration Lap Wrap (from 8 to 0)
            if (prevPos === 8 && playerPos === 0) {
                lapCount++;
                const bonus = 15;
                playerEnergy += bonus;
                playLapFanfare();
                updateScoreboard();

                const coord = getTileCenter(boardPath[playerPos].col, boardPath[playerPos].row);
                addParticle(coord.x, coord.y - 20, `+${bonus}⚡ 循環獎勵!`, '#ff8f00');
                logEvent(`🔄 完成第 ${lapCount - 1} 圈濕地生態大循環！獲得 +${bonus} 點遷徙生存能量！`, 'lap');
            }
        }

        // Settled on tile: trigger predation / ecological interaction
        await handleTileLanding();
    }

    async function handleTileLanding() {
        const tile = boardPath[playerPos];
        const coord = getTileCenter(tile.col, tile.row);

        // 20% probability for hazard encounter
        const isHazard = Math.random() < 0.20;

        if (isHazard) {
            const penalty = 5;
            playerEnergy = Math.max(0, playerEnergy - penalty);
            playHazardSound();
            addParticle(coord.x, coord.y - 20, `-${penalty}⚠️ 天敵警戒`, '#c62828');
            logEvent(`⚠️ 在【${tile.name}】格遭遇天敵巡邏防禦！機敏躲避，消耗 ${penalty} 點耐力。`, 'hazard');
        } else {
            const gain = tile.energy;
            playerEnergy += gain;
            playEatChime();
            addParticle(coord.x, coord.y - 20, `+${gain}⚡ OmNomNom!`, '#2e7d32');

            if (tile.tier === 1) {
                logEvent(`🌱 停留在初級消費者【${tile.name}】：同化植物與有機碎屑能量，獲得 +${gain} 點能量！`, 'predation');
            } else if (tile.tier === 2) {
                logEvent(`🍽️ 停留在次級掠食者【${tile.name}】：大快朵頤（Om Nom Nom!）捕食初級獵物，獲得 +${gain} 點能量！`, 'predation');
            } else {
                logEvent(`🦅 停留在頂級掠食者【${tile.name}】：同化高階食物鏈能量，獲得 +${gain} 點能量！`, 'predation');
            }
        }

        updateScoreboard();

        // Check Victory Condition
        if (playerEnergy >= maxEnergy || lapCount >= maxLaps) {
            isGameOver = true;
            setTimeout(() => {
                showVictoryModal();
            }, 600);
        } else {
            isMoving = false;
            diceBtn.disabled = false;
        }
    }

    function showVictoryModal() {
        playVictoryChime();
        if (!victoryModal) return;

        const finalEnergy = document.getElementById('finalEnergy');
        const finalTurns = document.getElementById('finalTurns');
        const finalLaps = document.getElementById('finalLaps');
        const finalTitle = document.getElementById('finalTitle');

        if (finalEnergy) finalEnergy.textContent = `${playerEnergy} 點`;
        if (finalTurns) finalTurns.textContent = `${turnCount} 回合`;
        if (finalLaps) finalLaps.textContent = `${lapCount} 圈`;

        let title = '濕地頂級掠食霸主';
        if (turnCount <= 8) title = '⚡ 神速生態征服者';
        else if (playerEnergy >= 120) title = '🏆 超級食物網食力王';
        else if (lapCount >= 3) title = '🌊 濕地生態守護神';

        if (finalTitle) finalTitle.textContent = title;
        victoryModal.style.display = 'flex';
    }

    function resetGame() {
        initAudio();
        playerPos = 0;
        playerEnergy = 10;
        lapCount = 1;
        turnCount = 0;
        isRolling = false;
        isMoving = false;
        isGameOver = false;
        particles = [];

        if (diceBtn) diceBtn.disabled = false;
        if (diceFace) diceFace.textContent = '🎲';
        if (diceResult) diceResult.textContent = '點擊下方按鈕擲骰出發！';
        if (victoryModal) victoryModal.style.display = 'none';

        if (eventLog) eventLog.innerHTML = '';
        logEvent('探險者已重返【蝶蛾】格位，台灣濕地生態循環重新啟動！', 'lap');
        updateScoreboard();
    }

    // -------------------------------------------------------------------------
    // 7. Modal Dialogs & Event Listeners
    // -------------------------------------------------------------------------
    // Rules Modal Open
    if (rulesBtn) {
        rulesBtn.addEventListener('click', () => {
            initAudio();
            if (rulesModal) {
                rulesModal.style.display = 'flex';
                rulesBtn.setAttribute('aria-expanded', 'true');
            }
        });
    }

    // Rules Modal Close Handlers
    function closeRules() {
        if (rulesModal) {
            rulesModal.style.display = 'none';
            if (rulesBtn) rulesBtn.setAttribute('aria-expanded', 'false');
        }
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeRules);
    if (modalUnderstoodBtn) modalUnderstoodBtn.addEventListener('click', closeRules);

    if (rulesModal) {
        rulesModal.addEventListener('click', (e) => {
            if (e.target === rulesModal) closeRules();
        });
    }

    // Victory Modal Handlers
    if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
    if (resetBtn) resetBtn.addEventListener('click', resetGame);

    // Keyboard Spacebar to Roll Dice / Escape to close modal
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            if (activeTag !== 'input' && activeTag !== 'textarea') {
                e.preventDefault();
                if (!isRolling && !isMoving && !isGameOver) {
                    rollDice();
                }
            }
        } else if (e.key === 'Escape') {
            closeRules();
            if (victoryModal) victoryModal.style.display = 'none';
        }
    });

    // Sound toggle
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundBtn.textContent = soundEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
            soundBtn.style.opacity = soundEnabled ? '1' : '0.6';
            if (soundEnabled) {
                initAudio();
                playTone(440, 'sine', 0.1);
            }
        });
    }

    if (diceBtn) {
        diceBtn.addEventListener('click', rollDice);
    }

    // Backward compatibility helper methods
    window.initGame = function () {
        resetGame();
    };
    window.drawHands = drawHands;
    window.drawGrid = drawGridCells;
    window.drawText = () => {};

    // First user gesture listener to unlock Web Audio API
    document.addEventListener('click', function unlockAudio() {
        initAudio();
        document.removeEventListener('click', unlockAudio);
    }, { once: true });

    // Bootstrapping
    updateScoreboard();
    animLoop();

})();

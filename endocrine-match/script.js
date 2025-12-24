document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-grid');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const resetBtn = document.getElementById('reset-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const modal = document.getElementById('game-over-modal');
    const finalScoreDisplay = document.getElementById('final-score');
    const finalTimeDisplay = document.getElementById('final-time');

    let cards = []; // Grid state: null (empty) or card object
    let selectedCards = [];
    let score = 0;
    let startTime;
    let timerInterval;
    let isGameActive = false;
    let width = 0; // Grid width
    let height = 0; // Grid height
    
    // Audio Context for sound effects
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Normalization Map
    const NORMALIZE_MAP = {
        "血糖濃度上升": "提高血糖濃度"
    };

    function playSound(type) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'select') {
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'match') {
            osc.frequency.setValueAtTime(660, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
            osc.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'error') {
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'win') {
            // Simple arpeggio
            const now = audioCtx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.value = freq;
                g.gain.value = 0.1;
                g.gain.linearRampToValueAtTime(0, now + 0.1 + i * 0.1 + 0.3);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.4);
            });
        }
    }

    // Load Data from global variable (loaded via script tag)
    if (typeof GAME_DATA !== 'undefined') {
        initGame(GAME_DATA);
    } else {
        console.error('GAME_DATA not found. Make sure data.js is loaded.');
    }

    function normalizeText(text) {
        return NORMALIZE_MAP[text] || text;
    }

    function initGame(rawData) {
        console.log("Raw Data Loaded:", rawData);
        const deck = [];
        const itemToHormones = new Map();

        // 1. Build Inverted Map (Item -> [Hormones])
        rawData.forEach(entry => {
            const hormone = entry.hormone; // Keep original hormone name
            
            entry.relate.forEach(rawItem => {
                const item = rawItem;
                
                if (!itemToHormones.has(item)) {
                    itemToHormones.set(item, new Set());
                }
                itemToHormones.get(item).add(hormone);
            });
        });

        // 2. Generate Deck from Map
        // For each relationship (Item <-> Hormone), create a pair:
        // One Item Match Card + One Hormone Card
        itemToHormones.forEach((hormones, itemText) => {
            // hormones is a Set of hormone names (e.g. Set{"腎上腺素", "升糖素"})
            hormones.forEach(hormoneName => {
                // Create Item Card
                deck.push({
                    type: 'item',
                    text: itemText,
                    matchTargets: Array.from(hormones) // This item can match ANY of these hormones
                });
                
                // Create Hormone Card
                deck.push({
                    type: 'hormone',
                    text: hormoneName,
                    matchTargets: [itemText] // Hormone matches this item (and others? simplified here to satisfy pair existence)
                    // Note: Actually, strictly speaking, a Hormone Card generated here 
                    // is functionally identical to any other Hormone Card of same name.
                    // We don't strictly need to limit it to just 'itemText', 
                    // but for checking logic 'Item checks Hormone' is sufficient.
                });
            });
        });

        startNewGame(deck);
        
        resetBtn.addEventListener('click', () => startNewGame(deck));
        shuffleBtn.addEventListener('click', shuffleCurrentBoard);
        playAgainBtn.addEventListener('click', () => {
             modal.classList.add('hidden');
             startNewGame(deck);
        });
    }

    function shuffleCurrentBoard() {
        if (!isGameActive) return;
        playSound('select'); // Reuse sound

        // 1. Collect all active cards and their positions
        const activeCardsData = [];
        const slots = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const card = cards[y][x];
                if (card) {
                    activeCardsData.push({
                        type: card.type,
                        text: card.text,
                        matchTargets: card.matchTargets
                    });
                    slots.push({x, y});
                    
                    // Remove old element
                    card.element.remove();
                    cards[y][x] = null;
                }
            }
        }

        // 2. Shuffle Data
        activeCardsData.sort(() => Math.random() - 0.5);

        // 3. Place back
        slots.forEach((slot, i) => {
            const cardData = activeCardsData[i];
            const x = slot.x;
            const y = slot.y;
            
            const cardObj = {
                ...cardData,
                x: x,
                y: y,
                element: createCardElement(cardData, x, y)
            };
            
            cards[y][x] = cardObj;
            grid.appendChild(cardObj.element);
        });

        // Clear selection
        selectedCards = [];
    }

    function startNewGame(deck) {
        // Reset State
        score = 0;
        selectedCards = [];
        isGameActive = true;
        scoreDisplay.textContent = score;
        timeDisplay.textContent = '00:00';
        startTime = Date.now();
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTime, 1000);
        modal.classList.add('hidden');

        // Shuffle Deck
        const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);

        // 在 startNewGame(deck) 裡
        const totalCards = shuffledDeck.length;
        let cols = Math.ceil(Math.sqrt(totalCards));
        let rows = Math.ceil(totalCards / cols);

        
        // Ensure even number of columns/rows usually looks better, but flexible is fine
        // Grid padding REMOVED as per user request (no external path needed)
        width = cols;
        height = rows;
        
        // Init Grid Array (2D)
        cards = new Array(height).fill(null).map(() => new Array(width).fill(null));

        // Render HTML
        // Make grid responsive using fr
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.innerHTML = '';

        let cardIndex = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (cardIndex < totalCards) {
                    const cardData = shuffledDeck[cardIndex++];
                    const cardObj = {
                        ...cardData,
                        x: x,
                        y: y,
                        element: createCardElement(cardData, x, y)
                    };
                    cards[y][x] = cardObj;
                    grid.appendChild(cardObj.element);
                }
            }
        }
    }

    function createCardElement(cardData, x, y) {
        const el = document.createElement('div');
        el.classList.add('card', cardData.type);
        el.textContent = cardData.text;
        el.dataset.x = x;
        el.dataset.y = y;
        
        // Critical: Lock position to prevent shifting when others are removed
        // Note: x, y are 1-based indices in our logic (1..cols), which matches CSS Grid perfectly
        // 修正：gridColumn/gridRow 要 +1
        el.style.gridColumn = x + 1;
        el.style.gridRow = y + 1;

        el.addEventListener('click', () => handleCardClick(x, y));
        return el;
    }

    function handleCardClick(x, y) {
        if (!isGameActive) return;
        const clickedCard = cards[y][x];
        if (!clickedCard) return; // Empty slot

        playSound('select');

        // Toggle selection
        const index = selectedCards.indexOf(clickedCard);
        if (index > -1) {
            // Deselect
            clickedCard.element.classList.remove('selected');
            selectedCards.splice(index, 1);
        } else {
            // Select
            if (selectedCards.length < 2) {
                clickedCard.element.classList.add('selected');
                selectedCards.push(clickedCard);
            }
        }

        if (selectedCards.length === 2) {
            checkMatch();
        }
    }

    function checkMatch() {
        const [c1, c2] = selectedCards;
        console.log("Checking match between:", c1, c2);
        
        // 1. Check Logical Match
        let isLogicalMatch = false;
        
        // Normalize checking direction: Item checks Hormone
        let itemCard, hormoneCard;
        
        if (c1.type === 'item' && c2.type === 'hormone') {
            itemCard = c1;
            hormoneCard = c2;
        } else if (c1.type === 'hormone' && c2.type === 'item') {
            itemCard = c2;
            hormoneCard = c1;
        }
        
        if (itemCard && hormoneCard) {
            console.log("Item Targets:", itemCard.matchTargets, "Hormone:", hormoneCard.text);
            // Check if this hormone is in the item's target list
            if (itemCard.matchTargets.includes(hormoneCard.text)) {
                isLogicalMatch = true;
            }
        }
        
        console.log("Logical Match Result:", isLogicalMatch);

        if (isLogicalMatch) {
            // Sichuan Rule REMOVED as per user request. 
            // Any logical match is valid.
            // We create a direct path for visual effect.
            const path = [{x: c1.x, y: c1.y}, {x: c2.x, y: c2.y}];
            
            // MATCH!
            //handleSuccessMatch(c1, c2, path);
            handleSuccessMatch(c1, c2);

        } else {
            handleFailMatch();
        }
    }

    function getTurnPath(c1, c2) {
        // 如果同一行或同一列，直接回傳直線
        if (c1.x === c2.x || c1.y === c2.y) {
            return [
                {x: c1.x, y: c1.y},
                {x: c2.x, y: c2.y}
            ];
        }
        // 決定先水平再垂直

        return [
            {x: c1.x, y: c1.y},
            {x: c2.x, y: c1.y},
            {x: c2.x, y: c2.y}
        ];

    }
    function clearPathObstacles(path, except) {
        // except: [c1, c2] 不移動
        // 找所有空位
        const emptySlots = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!cards[y][x]) emptySlots.push({x, y});
            }
        }
        // 檢查路徑上的卡片
        path.forEach(pt => {
            const card = cards[pt.y][pt.x];
            if (card && !except.includes(card)) {
                // 找一個空位
                if (emptySlots.length > 0) {
                    const slot = emptySlots.shift();
                    // 修正：gridColumn/gridRow 要 +1
                    card.element.style.gridColumn = slot.x + 1;
                    card.element.style.gridRow = slot.y + 1;
                    cards[slot.y][slot.x] = card;
                    cards[pt.y][pt.x] = null;
                    card.x = slot.x;
                    card.y = slot.y;
                }
            }
        });
    }



    function handleSuccessMatch(c1, c2) {
        playSound('match');
        c1.element.classList.add('matched');
        c2.element.classList.add('matched');

        // 產生90度路徑
        const path = getTurnPath(c1, c2);

        // 清除路徑上的障礙
        //clearPathObstacles(path, [c1, c2]);

        // 畫線
        drawPath(path);


        // 根據距離計算分數（曼哈頓距離）
        const baseScore = 100;
        const distance = Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);
        score += baseScore + distance * 100;
        scoreDisplay.textContent = score;

        setTimeout(() => {
            cards[c1.y][c1.x] = null;
            cards[c2.y][c2.x] = null;
            c1.element.classList.remove('selected');
            c2.element.classList.remove('selected');
            selectedCards = [];
            if (checkWinCondition()) endGame();
        }, 300);
    }

    function handleSuccessMatch2(c1, c2, path) {
        playSound('match');
        
        // Visual effect
        c1.element.classList.add('matched');
        c2.element.classList.add('matched');
        
        // Draw Path
        if (path) drawPath(path);

        // Delay clearing to show path/animation
        setTimeout(() => {
            // Clear from logical grid
            cards[c1.y][c1.x] = null;
            cards[c2.y][c2.x] = null;
            
            // Clear selection (visual)
            c1.element.classList.remove('selected');
            c2.element.classList.remove('selected');
            
            // Keep the 'matched' class which hides the card (opacity: 0)
            // Do NOT remove from DOM, to preserve grid layout stability just in case
            // (Though explicit grid-column/row handles it, keeping DOM is safer for now)

            selectedCards = [];
            score += 100;
            scoreDisplay.textContent = score;

            // Check Win
            if (checkWinCondition()) {
                endGame();
            }
        }, 300);
    }
    // ...existing code...
    function drawPath(path) {
        const canvas = document.getElementById('match-overlay');
        const ctx = canvas.getContext('2d');
        
        // Resize canvas to match grid container
        const gridRect = grid.getBoundingClientRect();
        canvas.width = gridRect.width;
        canvas.height = gridRect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (path.length < 2) return;

        // 動態取得 cell 尺寸
        let sampleCard = null;
        for(let r=0; r<height; r++) {
            for(let c=0; c<width; c++) {
                if(cards[r][c]) {
                    sampleCard = cards[r][c];
                    break;
                }
            }
            if(sampleCard) break;
        }
        let cellW = 100, cellH = 60, gap = 8, padding = 10;
        if (sampleCard) {
            const el = sampleCard.element;
            cellW = el.offsetWidth;
            cellH = el.offsetHeight;
            const style = window.getComputedStyle(grid);
            gap = parseInt(style.gap) || 8;
            padding = parseInt(style.paddingLeft) || 10;
        }

        ctx.beginPath();
        ctx.strokeStyle = '#faad14';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';

        path.forEach((pt, i) => {
            // 不管有沒有卡片，都計算格子中心
            const px = padding + pt.x * (cellW + gap) + cellW / 2;
            const py = padding + pt.y * (cellH + gap) + cellH / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });

        ctx.stroke();

        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 300);
    }

    function drawPath2(path) {
        const canvas = document.getElementById('match-overlay');
        const ctx = canvas.getContext('2d');
        
        // 1. Resize canvas to match grid container exactly
        const gridRect = grid.getBoundingClientRect();
        canvas.width = gridRect.width;
        canvas.height = gridRect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (path.length < 2) return;

        // 2. Calculate Cell Dimensions dynamically from an existing card
        // We find the first non-null card to measure
        let sampleCard = null;
        for(let r=0; r<height; r++) {
            for(let c=0; c<width; c++) {
                if(cards[r][c]) {
                    sampleCard = cards[r][c];
                    break;
                }
            }
            if(sampleCard) break;
        }
        
        // If board is empty (unlikely during match), fallback to standard
        // CSS: gap: 8px; padding: 10px; width: 100px; height: 60px;
        let cellW = 100;
        let cellH = 60;
        let gap = 8;
        let padding = 10;

        if (sampleCard) {
            const el = sampleCard.element;
            cellW = el.offsetWidth;
            cellH = el.offsetHeight;
            // Gap/Padding are harder to measure directly without computed style, 
            // but we can deduce from positions if we have 2 cards.
            // Let's stick to the CSS values which I checked in style.css:
            // .grid { gap: 8px; padding: 10px; }
            gap = 8;
            padding = 10;
        }

        ctx.beginPath();
        ctx.strokeStyle = '#faad14'; // Lightning gold
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        
        path.forEach((pt, i) => {
            // Formula: Padding + (Index * (Size + Gap)) + HalfSize
            // This is relative to the grid container
            const px = padding + pt.x * (cellW + gap) + cellW / 2;
            const py = padding + pt.y * (cellH + gap) + cellH / 2;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        
        ctx.stroke();
        
        // Clear after delay
        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 300);
    }

    function handleFailMatch() {
        playSound('error');
        // Shake animation could go here
        setTimeout(() => {
            selectedCards.forEach(c => c.element.classList.remove('selected'));
            selectedCards = [];
        }, 500);
    }

    function checkWinCondition() {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (cards[y][x] !== null) return false;
            }
        }
        return true;
    }

    function endGame() {
        isGameActive = false;
        clearInterval(timerInterval);
        playSound('win');
        finalScoreDisplay.textContent = score;
        finalTimeDisplay.textContent = timeDisplay.textContent;
        modal.classList.remove('hidden');
    }

    function updateTime() {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${m}:${s}`;
    }

    // --- Pathfinding Algorithm (BFS with max 2 turns) ---
    // Returns truthy if path exists
    // --- Pathfinding Algorithm (BFS with max 2 turns) ---
    // Returns array of points [{x,y}, ...] or null
    function findPath(c1, c2) {
        // BFS with state: [x, y, direction, turns, parent]
        // Directions: 0:None, 1:Up, 2:Down, 3:Left, 4:Right
        
        const queue = [];
        const visited = new Map(); // Key: "x,y,dir" -> turns

        // Initial State
        queue.push({x: c1.x, y: c1.y, dir: null, turns: 0, parent: null});
        
        // Min turns map
        const minTurns = Array(height).fill(null).map(() => Array(width).fill(Infinity));
        minTurns[c1.y][c1.x] = 0;

        const dirs = [
            {dx: 0, dy: -1, code: 'up'},
            {dx: 0, dy: 1, code: 'down'},
            {dx: -1, dy: 0, code: 'left'},
            {dx: 1, dy: 0, code: 'right'}
        ];

        while (queue.length > 0) {
            const curr = queue.shift();

            // Check target
            if (curr.x === c2.x && curr.y === c2.y) {
                // Reconstruct Path
                const path = [];
                let trace = curr;
                while (trace) {
                    path.unshift({x: trace.x, y: trace.y});
                    trace = trace.parent;
                }
                return path;
            }

            for (let d of dirs) {
                const nx = curr.x + d.dx;
                const ny = curr.y + d.dy;

                // Bounds check
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                // Calculate turns
                let newTurns = curr.turns;
                if (curr.dir && curr.dir !== d.code) {
                    // Start of movement fits here too (null -> dir is not a turn, or is 0 turns)
                    if (curr.dir !== null) newTurns++;
                }

                if (newTurns > 2) continue;
                
                // Obstacle Check
                // Empty OR Target (can walk onto target)
                const isTarget = (nx === c2.x && ny === c2.y);
                const isEmpty = (cards[ny][nx] === null);
                
                if (!isEmpty && !isTarget) continue;

                const stateKey = `${nx},${ny},${d.code}`;
                // Allow re-visit if turns are fewer or equal
                if (visited.has(stateKey) && visited.get(stateKey) < newTurns) continue;

                const nextState = {
                    x: nx,
                    y: ny,
                    dir: d.code,
                    turns: newTurns,
                    parent: curr
                };
                
                queue.push(nextState);
                visited.set(stateKey, newTurns);
            }
        }
        
        return null;
    }

    // Debug helper to visualize grid
    window.printGrid = function() {
        let output = "  ";
        for (let x = 0; x < width; x++) output += x.toString().padEnd(3);
        output += "\n";
        
        for (let y = 0; y < height; y++) {
            output += y.toString().padEnd(2);
            for (let x = 0; x < width; x++) {
                const cell = cards[y][x];
                if (!cell) output += " . ";
                else output += " X ";
            }
            output += "\n";
        }
        console.log(output);
        return "Grid printed above (X=Blocked, .=Empty)";
    };
});

class Game {
    constructor() {
        this.player = document.getElementById('player');
        this.gameBoard = document.getElementById('game-board');
        this.questionElement = document.getElementById('question');
        this.optionsElement = document.getElementById('options');
        this.scoreElement = document.getElementById('score');
        this.score = 0;
        this.enemies = [];
        this.currentFeature = null;
        this.currentCategory = null;
        this.playerX = this.gameBoard.offsetWidth / 2;
        this.gameActive = true;
        this.gameData = null;
        this.correctEnemiesRemaining = 0; // 新增：追蹤剩下多少正確敵人
        this.isAdvancingNextRound = false; // Flag to prevent multiple next round triggers
        this.initialEnemyCountForRound = 0; // How many enemies started this round
        this.lastShotTime = 0; // For shoot cooldown
        this.shootCooldownTime = 300; // Milliseconds for shoot cooldown (adjust as needed)
        this.isSpawning = false; // Add new flag to prevent concurrent spawns

        // Read numEnemiesPerRound from URL parameter, default to 3
        const urlParams = new URLSearchParams(window.location.search);
        const enemiesFromUrl = urlParams.get('numEnemies');
        let defaultNumEnemies = 3;
        if (enemiesFromUrl) {
            const parsedNum = parseInt(enemiesFromUrl, 10);
            if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 10) { // Validate: positive and not too large
                defaultNumEnemies = parsedNum;
                console.log(`Number of enemies per round set from URL: ${defaultNumEnemies}`);
            } else {
                console.warn(`Invalid 'numEnemies' URL parameter: ${enemiesFromUrl}. Using default: ${defaultNumEnemies}`);
            }
        }
        this.numEnemiesPerRound = defaultNumEnemies;

        // Initialize the game only after data is loaded
        this.init();
    }

    async init() {
        try {
            await this.loadGameData();
            if (this.gameData) {
                this.setupEventListeners();
                this.gameLoop();
                this.spawnNextFeature();
            } else {
                throw new Error('Game data could not be loaded');
            }
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.questionElement.textContent = '遊戲載入失敗，請重新整理頁面';
        }
    }

    async loadGameData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error('Failed to fetch game data');
            }
            this.gameData = await response.json();
        } catch (error) {
            console.error('Error loading game data:', error);
            throw error;
        }
    }

    updatePlayerPosition(boardX) { // boardX is the raw X coordinate from event, relative to game board's left edge
        const playerWidth = this.player.offsetWidth || 50; // Player's actual width or fallback
        // Assuming boardX is where the user's finger/mouse is, and they intend it to be the player's center.
        let newPlayerLeft = boardX - (playerWidth / 2);

        // Constrain player's left edge within the game board
        this.playerX = Math.max(0, Math.min(this.gameBoard.offsetWidth - playerWidth, newPlayerLeft));
        this.player.style.left = this.playerX + 'px';
    }

    setupEventListeners() {
        // Mouse move to control player
        document.addEventListener('mousemove', (e) => {
            const rect = this.gameBoard.getBoundingClientRect();
            // Update player position if mouse is roughly over the game board area
            if (e.clientX >= rect.left - player.offsetWidth && e.clientX <= rect.right + player.offsetWidth) { // Wider activation for mouse
                this.updatePlayerPosition(e.clientX - rect.left);
            }
        });

        // Touch events for player movement (on the gameBoard)
        this.gameBoard.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                // e.preventDefault(); // Uncomment if tap on board shouldn't also shoot, but might interfere.
                const rect = this.gameBoard.getBoundingClientRect();
                this.updatePlayerPosition(e.touches[0].clientX - rect.left);
            }
        });

        this.gameBoard.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent page scrolling while dragging player
            if (e.touches.length > 0) {
                const rect = this.gameBoard.getBoundingClientRect();
                // Update player position if touch is within game board horizontal bounds
                const clientX = e.touches[0].clientX;
                if (clientX >= rect.left && clientX <= rect.right) {
                    this.updatePlayerPosition(clientX - rect.left);
                }
            }
        }, { passive: false }); // passive: false is required for e.preventDefault() in touchmove
    }

    spawnNextFeature() {
        if (this.isSpawning) return; // Prevent concurrent spawns
        this.isSpawning = true;

        if (!this.gameData || !this.gameData.categorys || !this.gameData.creatures) {
            console.error('Game data not properly loaded');
            this.isSpawning = false;
            return;
        }

        // 清除上一輪可能剩下的敵人 (確保在選新題目之前清除)
        this.clearEnemies();
        this.isAdvancingNextRound = false; // Reset for the new round setup

                
        // --- New Logic: Select a random feature first ---
        const allFeatures = this.gameData.categorys.flatMap(cat => cat.features || []);
        if (!allFeatures.length) {
            console.error('No features found in game data');
            this.isSpawning = false;
            return;
        }
        this.currentFeature = allFeatures[Math.floor(Math.random() * allFeatures.length)];
        this.currentCategory = null; // We no longer rely on a single 'currentCategory' for correctness

        // --- New Logic: Select 4 random creatures ---
        const allCreatures = this.gameData.creatures;
        if (!allCreatures || allCreatures.length < this.numEnemiesPerRound) {
            console.error(`Not enough creatures in game data. Need at least ${this.numEnemiesPerRound}.`);
            this.isSpawning = false;
            return;
        }

        // Shuffle all creatures and pick the first 4
        const selectedOptions = this.shuffleArray([...allCreatures]).slice(0, this.numEnemiesPerRound);

        // Ensure we have valid options before proceeding
        if (selectedOptions.length < this.numEnemiesPerRound || selectedOptions.some(option => !option || !option.name || !option.category)) {
             console.error(`Invalid options selected. Expected ${this.numEnemiesPerRound} valid options.`);
             this.isSpawning = false;
             return;
         }

        // Update display
        this.questionElement.textContent = `特徵: ${this.currentFeature}`;
        this.spawnEnemies(selectedOptions); // Spawn the 4 randomly selected creatures
        this.isSpawning = false;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    spawnEnemies(options) {
        if (!Array.isArray(options) || !options.length || !options.every(option => option && option.name)) {
            console.error('Invalid options provided to spawnEnemies:', options);
            return;
        }
        this.isAdvancingNextRound = false; // Reset advancing flag for the new set of enemies

        // Find the category data for checking features
        this.correctEnemiesRemaining = 0; // 重設正確敵人計數

        // Find the category data for checking features
        const categoryMap = new Map(this.gameData.categorys.map(cat => [cat.category, cat.features || []]));
        this.enemies = [];
        this.initialEnemyCountForRound = options.length; // Store how many enemies are being spawned

        const gameBoardWidth = this.gameBoard.offsetWidth;
        // Estimate enemy width (you might want to get this dynamically or set a fixed value)
        const enemyElementForSizing = document.createElement('div');
        enemyElementForSizing.className = 'enemy';
        enemyElementForSizing.style.visibility = 'hidden'; // Don't show it
        enemyElementForSizing.textContent = "Test"; // Sample text
        this.gameBoard.appendChild(enemyElementForSizing);
        const enemyWidth = enemyElementForSizing.offsetWidth || 80; // Fallback if offsetWidth is 0
        this.gameBoard.removeChild(enemyElementForSizing);

        const totalEnemiesWidth = this.numEnemiesPerRound * enemyWidth;
        const totalSpacing = gameBoardWidth - totalEnemiesWidth;
        const gap = this.numEnemiesPerRound > 1 ? totalSpacing / (this.numEnemiesPerRound + 1) : totalSpacing / 2; // Distribute gaps evenly, or center if 1

        options.forEach((option, index) => {
            if (!option || !option.name) return;
            const enemy = document.createElement('div');
            enemy.className = 'enemy';
            enemy.textContent = option.name;
            enemy.style.left = (gap * (index + 1)) + (enemyWidth * index) + 'px';
            enemy.style.top = '50px';
            this.gameBoard.appendChild(enemy);
            // --- New Logic: Check if the creature's category has the current feature ---
            const creatureCategoryFeatures = categoryMap.get(option.category) || [];
            const isCorrect = creatureCategoryFeatures.includes(this.currentFeature);

            if (isCorrect) {
                this.correctEnemiesRemaining++; // 如果是正確的，計數加一
            }



            this.enemies.push({
                element: enemy,
                isCorrect: isCorrect, // Correctness based on feature presence
                hit: false // Add hit status
            });
        });
        console.log(`本輪正確目標數量: ${this.correctEnemiesRemaining}`); // (除錯用，可選)

    }

    shoot() {
        const now = performance.now();
        if (!this.gameActive || (now - this.lastShotTime < this.shootCooldownTime)) {
            return; // Cooldown active or game not active
        }
        this.lastShotTime = now;

        const bullet = document.createElement('div');
        const playerWidth = this.player.offsetWidth || 50; // Get player width, fallback to 50
        const bulletWidth = 10; // Bullet width from CSS (or define here)
        // playerX is the left edge. Bullet should fire from player's center.
        const bulletLeft = this.playerX + (playerWidth / 2) - (bulletWidth / 2);

        bullet.style.cssText = `
            position: absolute;
            width: ${bulletWidth}px;
            height: 20px;
            background: yellow;
            bottom: 70px;
            left: ${bulletLeft}px;
        `;
        this.gameBoard.appendChild(bullet);

        const bulletInterval = setInterval(() => {
            const bulletTop = bullet.offsetTop;
            if (bulletTop <= 0) {
                clearInterval(bulletInterval);
                if (bullet.parentNode) bullet.remove(); // Remove only if still in DOM
            } else {
                bullet.style.top = (bulletTop - 5) + 'px';
                this.checkCollisions(bullet, bulletInterval); // Pass interval ID

            }
        }, 16);
    }
    checkCollisions(bullet, bulletInterval) {
        const bulletRect = bullet.getBoundingClientRect();
        let collisionDetected = false;

        // Use a standard loop to allow breaking early
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            // Skip if already hit
            if (enemy.hit) continue;

            const enemyElement = enemy.element; // Store reference

            const enemyRect = enemy.element.getBoundingClientRect();

            if (this.isColliding(bulletRect, enemyRect)) {
                collisionDetected = true;
                clearInterval(bulletInterval); // Stop bullet movement
                bullet.remove(); // Remove bullet
                enemy.hit = true; // Mark as hit


                if (enemy.isCorrect) {
                    this.score += 10;
                    this.scoreElement.textContent = this.score;

                    // Change background to green and leave it
                    enemyElement.classList.add('enemy-hit-correct');

                    this.correctEnemiesRemaining--; // 正確敵人計數減一
                    console.log(`打中正確目標! 剩下 ${this.correctEnemiesRemaining} 個`); // (除錯用，可選)

                    // 檢查是否所有正確敵人都打完了
                    if (this.correctEnemiesRemaining <= 0) {
                        console.log("正確目標清除完畢，準備進入下一輪..."); // (除錯用，可選)
                        this.checkRoundCompletion(); // Use checkRoundCompletion instead of direct spawn
                    }                    
                } else {
                    //this.score = Math.max(0, this.score - 10);
                    this.score -= 10; // 直接扣分，允許負分

                    this.scoreElement.textContent = this.score;

                    // Change background to red and leave it
                    enemyElement.classList.add('enemy-hit-incorrect'); 



                }
                this.checkRoundCompletion(); // Check if round should end after any hit
                break; // Exit loop once a collision is handled for this bullet
            }
        }
    }
    clearEnemies() {
        this.enemies.forEach(enemy => enemy.element.remove());
        this.enemies = [];
    }

    applyEffect(className) {
        this.gameBoard.classList.add(className);
        setTimeout(() => {
            this.gameBoard.classList.remove(className);
        }, 300); // Effect duration: 300ms
    }

    isColliding(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }

    gameLoop() {
        if (!this.gameActive) return;
        
        // Move enemies down
        this.enemies.forEach(enemy => {
            // Skip if element is gone OR if it has been hit
            if (!enemy.element || enemy.hit) return;

            const currentTop = parseInt(enemy.element.style.top);
            if (currentTop > this.gameBoard.offsetHeight - 50) {
                // Enemy reached bottom
                if (enemy.isCorrect && !enemy.hit) {
                    // It was a correct enemy that wasn't hit - deduct points
                    this.score -= 10; // 你可以調整扣分的分數
                    this.scoreElement.textContent = this.score;
                    this.correctEnemiesRemaining--; // This correct enemy is now gone
                    console.log("一個正確的目標掉下去了，扣分！剩餘正確目標:", this.correctEnemiesRemaining);
                }
                enemy.element.remove();
                this.enemies = this.enemies.filter(e => e !== enemy); 
                this.checkRoundCompletion(); // Check if round should end after any enemy removal

            } else {
                // --- Consider using the speed variable we discussed earlier ---
                // enemy.element.style.top = (currentTop + this.enemySpeed) + 'px';
                enemy.element.style.top = (currentTop + 1) + 'px';
            }
        });

        requestAnimationFrame(() => this.gameLoop());
    }

    checkRoundCompletion() {
        if (this.isAdvancingNextRound || !this.gameActive) return; // Prevent multiple triggers or if game over

        let advance = false;

        // Condition 1: All designated correct targets hit, or no correct targets existed initially.
        if (this.correctEnemiesRemaining <= 0) {
            console.log("Round Complete: All correct targets resolved or none existed.");
            advance = true;
        } else {
            // Condition 2: All spawned enemies have been hit (interacted with).
            // This means even if some correct ones were missed (and are now red), the round is over.
            if (this.initialEnemyCountForRound > 0 && this.enemies.every(enemy => enemy.hit)) {
                console.log("Round Complete: All spawned enemies have been hit.");
                advance = true;
            } else {
                // Condition 3: All enemies are gone from the board (e.g., fallen off),
                // and there were still correct targets theoretically remaining (player missed them).
                // Also covers the case where initialEnemyCountForRound was > 0 but all fell off.
                if (this.initialEnemyCountForRound > 0 && this.enemies.length === 0) {
                    console.log("Round Complete: All enemies gone from board (likely fallen off).");
                    advance = true;
                }
            }
        }

        if (advance) {
            this.isAdvancingNextRound = true; // Set flag
            console.log("Scheduling next round...");
            this.gameBoard.classList.remove('correct-flash', 'incorrect-flash'); // Clear any board effects
            setTimeout(() => {
                this.spawnNextFeature(); // spawnNextFeature will reset isAdvancingNextRound
            }, 800); // Delay to allow player to see the final state
        }
    }
        
    gameOver() {
        this.gameActive = false;
        alert(`遊戲結束! 最終得分: ${this.score}`);
        if (confirm('再玩一次?')) {
            location.reload();
        }
    }
}

// Add click event listener to shoot
// Using 'touchend' for better responsiveness on touch devices,
// and 'click' as a fallback or for mouse users.
function handleShootInput(event) { // Added event parameter, though not strictly used with current cooldown
    const game = window.game;
    if (game && game.gameActive) {
        game.shoot();
    }
}

document.addEventListener('click', handleShootInput);
document.addEventListener('touchend', handleShootInput);

// Start the game when the page loads
window.addEventListener('load', () => {
    window.game = new Game();
});
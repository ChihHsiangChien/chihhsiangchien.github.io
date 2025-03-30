// Game state
let currentPlayer = null;
let currentRoom = null;
let gameState = null;
let isGameMaster = false;
let boatPosition = 50; // Percentage from left
let isDragging = false;
let fishElements = [];
let lastCatchTime = 0;
const CATCH_COOLDOWN = 500; // 500ms cooldown between catches

// Boat types and their properties
const BOAT_TYPES = {
    SMALL: {
        name: 'Small Boat',
        capacity: 10,
        price: 0,
        value: 0
    },
    MEDIUM: {
        name: 'Medium Boat',
        capacity: 15,
        price: 50,
        value: 50
    },
    LARGE: {
        name: 'Large Boat',
        capacity: 20,
        price: 100,
        value: 100
    }
};

// Initialize Firebase
const firebaseConfig = {
    // Replace with your Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Initialize game
function init() {
    // Check if there's a room number in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomNumber = urlParams.get('room');
    if (roomNumber) {
        document.getElementById('room-code').value = roomNumber;
    }

    // Initialize fish school
    createFishSchool();
}

// Create fish school
function createFishSchool() {
    const fishSchool = document.getElementById('fish-school');
    if (!fishSchool) return;
    
    fishSchool.innerHTML = ''; // Clear existing fish
    
    const numFish = gameState ? gameState.fishPopulation : 50;
    for (let i = 0; i < numFish; i++) {
        const fish = document.createElement('div');
        fish.className = 'fish';
        fish.style.left = `${Math.random() * 100}%`;
        fish.style.top = `${Math.random() * 100}%`;
        fish.style.animationDelay = `${Math.random() * 2}s`;
        fishSchool.appendChild(fish);
    }
}

// Update fish school
function updateFishSchool() {
    if (!gameState) return;
    createFishSchool();
}

// Create a new game room
function createRoom() {
    const playerName = document.getElementById('player-name').value;
    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const gameSettings = {
        maxFish: parseInt(document.getElementById('max-fish').value) || 500,
        initialFish: parseInt(document.getElementById('initial-fish').value) || 50,
        survivalThreshold: parseInt(document.getElementById('survival-threshold').value) || 10,
        startingMoney: parseInt(document.getElementById('starting-money').value) || 100,
        roundTime: parseInt(document.getElementById('round-time').value) || 60,
        isActive: false,
        currentRound: 0,
        fishPopulation: parseInt(document.getElementById('initial-fish').value) || 50,
        createdBy: playerName,
        createdAt: Date.now()
    };

    // Save room data to localStorage
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(gameSettings));
    localStorage.setItem(`players_${roomCode}`, JSON.stringify({}));

    currentPlayer = {
        name: playerName,
        money: gameSettings.startingMoney,
        boatType: 'SMALL',
        fishCaught: 0
    };
    currentRoom = roomCode;
    isGameMaster = true;
    showGameMasterScreen();
    updatePlayerList();
    
    // Display room code to share
    alert(`Room created! Share this code with players: ${roomCode}`);
}

// Join an existing room
function joinRoom() {
    const roomNumber = document.getElementById('room-code').value;
    const playerName = document.getElementById('player-name').value;

    if (!roomNumber || !playerName) {
        alert('Please enter both room number and your name');
        return;
    }

    const roomRef = database.ref(`rooms/${roomNumber}`);
    roomRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const gameSettings = snapshot.val();
            if (!gameSettings.isActive) {
                currentPlayer = {
                    name: playerName,
                    money: gameSettings.startingMoney,
                    boatType: 'SMALL',
                    fishCaught: 0
                };
                currentRoom = roomNumber;
                showPlayerScreen();
                updatePlayerData();
                gameState = gameSettings;
                updateFishSchool();
                updatePlayerStats();
                startRoundTimer();
                setupGameListeners();
            } else {
                alert('Game is already in progress');
            }
        } else {
            alert('Room not found');
        }
    });
}

// Setup Firebase listeners
function setupGameListeners() {
    if (!currentRoom) return;

    const roomRef = database.ref(`rooms/${currentRoom}`);
    roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            gameState = snapshot.val();
            updateFishSchool();
            updatePlayerStats();
        }
    });

    const playersRef = database.ref(`rooms/${currentRoom}/players`);
    playersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            if (currentPlayer && playersData[currentPlayer.name]) {
                currentPlayer = playersData[currentPlayer.name];
                updatePlayerStats();
            }
        }
    });
}

// Start the game
function startGame() {
    if (!isGameMaster) return;

    const roomData = JSON.parse(localStorage.getItem(`room_${currentRoom}`));
    roomData.isActive = true;
    roomData.currentRound = 1;
    roomData.roundStartTime = Date.now();
    
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
    startRoundTimer();
    updateFishSchool();
}

// End the game
function endGame() {
    if (!isGameMaster) return;

    const roomData = JSON.parse(localStorage.getItem(`room_${currentRoom}`));
    roomData.isActive = false;
    roomData.gameEndTime = Date.now();
    
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
}

// Catch fish
function catchFish(event) {
    if (!currentPlayer || !gameState || !gameState.isActive) return;

    const now = Date.now();
    if (now - lastCatchTime < CATCH_COOLDOWN) return;
    lastCatchTime = now;

    // Get click position relative to fishing area
    const fishingArea = document.querySelector('.fishing-area');
    const rect = fishingArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is near any fish
    const fishElements = document.querySelectorAll('.fish');
    let caughtFish = 0;
    const catchRadius = 50; // Radius within which fish can be caught

    fishElements.forEach(fish => {
        const fishRect = fish.getBoundingClientRect();
        const fishX = fishRect.left + fishRect.width / 2 - rect.left;
        const fishY = fishRect.top + fishRect.height / 2 - rect.top;
        
        const distance = Math.sqrt(
            Math.pow(x - fishX, 2) + 
            Math.pow(y - fishY, 2)
        );

        if (distance < catchRadius) {
            caughtFish++;
            fish.style.animation = 'catch 0.5s forwards';
        }
    });

    if (caughtFish > 0) {
        const boatCapacity = BOAT_TYPES[currentPlayer.boatType].capacity;
        const maxCatch = Math.min(boatCapacity, gameState.fishPopulation);
        const actualCatch = Math.min(caughtFish, maxCatch);
        
        if (actualCatch > 0) {
            currentPlayer.fishCaught += actualCatch;
            gameState.fishPopulation -= actualCatch;
            updatePlayerData();
            updateGameState();
            updateFishSchool();
            updatePlayerStats();
            
            // Show catch feedback
            showCatchFeedback(actualCatch);
        }
    }
}

// Show catch feedback
function showCatchFeedback(amount) {
    const feedback = document.createElement('div');
    feedback.className = 'catch-feedback';
    feedback.textContent = `+${amount} fish!`;
    
    const fishingArea = document.querySelector('.fishing-area');
    fishingArea.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

// Sell fish
function sellFish() {
    if (!currentPlayer || !gameState || !gameState.isActive) return;

    const fishPrice = 5; // Price per fish
    const earnings = currentPlayer.fishCaught * fishPrice;
    currentPlayer.money += earnings;
    currentPlayer.fishCaught = 0;
    updatePlayerData();
    updatePlayerStats();
}

// Upgrade boat
function upgradeBoat() {
    if (!currentPlayer || !gameState || !gameState.isActive) return;

    const currentBoat = BOAT_TYPES[currentPlayer.boatType];
    let nextBoat;

    if (currentPlayer.boatType === 'SMALL') {
        nextBoat = BOAT_TYPES.MEDIUM;
    } else if (currentPlayer.boatType === 'MEDIUM') {
        nextBoat = BOAT_TYPES.LARGE;
    } else {
        return; // Already have the largest boat
    }

    if (currentPlayer.money >= nextBoat.price) {
        currentPlayer.money -= nextBoat.price;
        currentPlayer.boatType = nextBoat.name === 'Medium Boat' ? 'MEDIUM' : 'LARGE';
        updatePlayerData();
        updatePlayerStats();
    }
}

// Update player data in localStorage
function updatePlayerData() {
    if (!currentRoom || !currentPlayer) return;

    const playersData = JSON.parse(localStorage.getItem(`players_${currentRoom}`) || '{}');
    playersData[currentPlayer.name] = currentPlayer;
    localStorage.setItem(`players_${currentRoom}`, JSON.stringify(playersData));
}

// Update game state in localStorage
function updateGameState() {
    if (!currentRoom || !gameState) return;
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(gameState));
}

// Update player list display
function updatePlayerList() {
    if (!currentRoom) return;

    const playerList = document.getElementById('player-list');
    const playersData = JSON.parse(localStorage.getItem(`players_${currentRoom}`) || '{}');
    
    playerList.innerHTML = '';
    Object.values(playersData).forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <h4>${player.name}</h4>
            <p>Money: $${player.money}</p>
            <p>Boat: ${player.boatType}</p>
            <p>Fish Caught: ${player.fishCaught}</p>
        `;
        playerList.appendChild(playerElement);
    });
}

// Round timer functionality
let roundTimer = null;

function startRoundTimer() {
    if (roundTimer) clearInterval(roundTimer);
    
    const roundTime = gameState.roundTime;
    let timeLeft = roundTime;
    
    const timerDisplay = document.getElementById('round-timer');
    if (timerDisplay) {
        timerDisplay.textContent = `Round ${gameState.currentRound} - Time Left: ${timeLeft}s`;
    }
    
    roundTimer = setInterval(() => {
        timeLeft--;
        if (timerDisplay) {
            timerDisplay.textContent = `Round ${gameState.currentRound} - Time Left: ${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(roundTimer);
            endRound();
        }
    }, 1000);
}

function endRound() {
    if (!currentRoom) return;
    
    const roomData = JSON.parse(localStorage.getItem(`room_${currentRoom}`));
    
    // Update fish population (reproduction)
    const reproductionRate = 0.2; // 20% reproduction rate
    const newFish = Math.floor(roomData.fishPopulation * reproductionRate);
    roomData.fishPopulation = Math.min(
        roomData.fishPopulation + newFish,
        roomData.maxFish
    );
    
    // Check if game should end
    if (roomData.fishPopulation < roomData.survivalThreshold) {
        roomData.isActive = false;
        localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
        alert('Game Over! Fish population has fallen below the survival threshold.');
        return;
    }
    
    // Start next round
    roomData.currentRound++;
    roomData.roundStartTime = Date.now();
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
    updateFishSchool();
    startRoundTimer();
}

// Show/hide screens
function showGameMasterScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('game-master-screen').classList.remove('hidden');
    document.getElementById('player-screen').classList.add('hidden');
}

function showPlayerScreen() {
    const loginScreen = document.getElementById('login-screen');
    const playerScreen = document.getElementById('player-screen');
    
    if (loginScreen && playerScreen) {
        loginScreen.classList.add('hidden');
        playerScreen.classList.remove('hidden');
    }
}

// Update player stats display
function updatePlayerStats() {
    if (!currentPlayer) return;

    const nameDisplay = document.getElementById('player-name-display');
    const moneyDisplay = document.getElementById('player-money');
    const capacityDisplay = document.getElementById('boat-capacity');
    const caughtDisplay = document.getElementById('fish-caught');

    if (nameDisplay) nameDisplay.textContent = currentPlayer.name;
    if (moneyDisplay) moneyDisplay.textContent = `$${currentPlayer.money}`;
    if (capacityDisplay) capacityDisplay.textContent = 
        `${BOAT_TYPES[currentPlayer.boatType].capacity} fish`;
    if (caughtDisplay) caughtDisplay.textContent = currentPlayer.fishCaught;
}

// Initialize game when page loads
window.onload = init; 
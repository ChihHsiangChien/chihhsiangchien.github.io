// Game state
let currentRoom = null;
let gameState = null;

// Initialize game
function init() {
    // Check if there's a room number in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomNumber = urlParams.get('room');
    if (roomNumber) {
        document.getElementById('room-number').value = roomNumber;
    }
}

// Create a new game room
function createRoom() {
    const roomNumber = document.getElementById('room-number').value;
    if (!roomNumber) {
        alert('Please enter a room number');
        return;
    }

    const gameSettings = {
        maxFish: parseInt(document.getElementById('max-fish').value) || 500,
        initialFish: parseInt(document.getElementById('initial-fish').value) || 50,
        survivalThreshold: parseInt(document.getElementById('survival-threshold').value) || 10,
        startingMoney: parseInt(document.getElementById('starting-money').value) || 100,
        roundTime: parseInt(document.getElementById('round-time').value) || 60,
        isActive: false,
        currentRound: 0,
        fishPopulation: parseInt(document.getElementById('initial-fish').value) || 50,
        createdAt: Date.now()
    };

    // Save room data to localStorage
    localStorage.setItem(`room_${roomNumber}`, JSON.stringify(gameSettings));
    localStorage.setItem(`players_${roomNumber}`, JSON.stringify({}));

    currentRoom = roomNumber;
    gameState = gameSettings;
    updatePlayerList();
    
    alert(`Room ${roomNumber} created! Share this number with players.`);
}

// Start the game
function startGame() {
    if (!currentRoom) {
        alert('Please create a room first');
        return;
    }

    const roomData = JSON.parse(localStorage.getItem(`room_${currentRoom}`));
    if (!roomData) {
        alert('Room not found');
        return;
    }

    roomData.isActive = true;
    roomData.currentRound = 1;
    roomData.roundStartTime = Date.now();
    
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
    startRoundTimer();
    updatePlayerList();
}

// End the game
function endGame() {
    if (!currentRoom) return;

    const roomData = JSON.parse(localStorage.getItem(`room_${currentRoom}`));
    roomData.isActive = false;
    roomData.gameEndTime = Date.now();
    
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
    updatePlayerList();
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
            <p>Boat Capacity: ${player.boatType === 'SMALL' ? '10' : player.boatType === 'MEDIUM' ? '15' : '20'} fish</p>
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
    
    roundTimer = setInterval(() => {
        timeLeft--;
        
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
        endGame();
        alert('Game Over! Fish population has fallen below the survival threshold.');
        return;
    }
    
    // Start next round
    roomData.currentRound++;
    roomData.roundStartTime = Date.now();
    localStorage.setItem(`room_${currentRoom}`, JSON.stringify(roomData));
    gameState = roomData;
    updatePlayerList();
    startRoundTimer();
}

// Initialize game when page loads
window.onload = init; 
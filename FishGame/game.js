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

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBeBOkZC9VcfEZh8wSZwzZAjEjpkoLn6ug",
    authDomain: "fishgame-9a619.firebaseapp.com",    
    projectId: "fishgame-9a619",
    storageBucket: "fishgame-9a619.firebasestorage.app",
    messagingSenderId: "589605726016",
    appId: "1:589605726016:web:8263335bdc950b7277fca5",
    measurementId: "G-3QY9WR0LPK"
};

// Initialize Firebase
let database;
let analytics;

// Wait for Firebase to be ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        analytics = firebase.analytics();
        init();
    } else {
        console.error('Firebase SDK not loaded');
    }
});

// Initialize game
function init() {
    console.log('Initializing game...');
    
    // Check if there's a room number in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomNumber = urlParams.get('room');
    if (roomNumber) {
        console.log('Room number found in URL:', roomNumber);
        document.getElementById('room-code').value = roomNumber;
    }

    // Setup room cleanup
    setupRoomCleanup();
    
    // Clean up inactive rooms
    cleanupInactiveRooms();
    
    // Initialize fish school
    createFishSchool();
    
    // Update room activity periodically
    setInterval(updateRoomActivity, 60000); // Update every minute
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
    console.log('Attempting to create new room...');
    const playerName = document.getElementById('player-name').value;
    if (!playerName) {
        console.error('No player name provided');
        alert('Please enter your name');
        return;
    }

    if (!database) {
        console.error('Firebase database not initialized');
        alert('Error: Database connection not available');
        return;
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Generated room code:', roomCode);
    
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
        createdAt: Date.now(),
        lastActivity: Date.now()
    };

    console.log('Game settings:', gameSettings);

    // Save room data to Firebase
    const roomRef = database.ref(`rooms/${roomCode}`);
    console.log('Saving room data to Firebase...');
    
    roomRef.set(gameSettings)
        .then(() => {
            console.log('Room created successfully in Firebase');
            
            currentPlayer = {
                name: playerName,
                money: gameSettings.startingMoney,
                boatType: 'SMALL',
                fishCaught: 0
            };
            currentRoom = roomCode;
            isGameMaster = true;
            
            // Save initial player data
            const playerRef = database.ref(`rooms/${roomCode}/players/${playerName}`);
            return playerRef.set(currentPlayer);
        })
        .then(() => {
            console.log('Initial player data saved');
            showGameMasterScreen();
            updatePlayerList();
            
            // Display room code to share
            alert(`Room created! Share this code with players: ${roomCode}`);
        })
        .catch((error) => {
            console.error('Error creating room:', error);
            alert('Error creating room. Please try again.');
        });
}

// Setup room cleanup on window close
function setupRoomCleanup() {
    window.addEventListener('beforeunload', function() {
        if (isGameMaster && currentRoom) {
            console.log('Game master leaving, cleaning up room...');
            const roomRef = database.ref(`rooms/${currentRoom}`);
            roomRef.remove()
                .then(() => {
                    console.log('Room cleaned up successfully');
                })
                .catch((error) => {
                    console.error('Error cleaning up room:', error);
                });
        }
    });
}

// Update room activity timestamp
function updateRoomActivity() {
    if (!currentRoom || !database) return;
    
    const roomRef = database.ref(`rooms/${currentRoom}`);
    roomRef.update({
        lastActivity: Date.now()
    }).catch(error => {
        console.error('Error updating room activity:', error);
    });
}

// Clean up inactive rooms
function cleanupInactiveRooms() {
    if (!database) return;
    
    const roomsRef = database.ref('rooms');
    roomsRef.once('value')
        .then((snapshot) => {
            const now = Date.now();
            const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
            
            snapshot.forEach((roomSnapshot) => {
                const roomData = roomSnapshot.val();
                if (now - roomData.lastActivity > inactiveThreshold) {
                    console.log('Cleaning up inactive room:', roomSnapshot.key);
                    roomSnapshot.ref.remove();
                }
            });
        })
        .catch((error) => {
            console.error('Error cleaning up inactive rooms:', error);
        });
}

// Join an existing room
function joinRoom() {
    console.log('Attempting to join room...');
    const roomNumber = document.getElementById('room-code').value;
    const playerName = document.getElementById('player-name').value;

    console.log('Room number:', roomNumber);
    console.log('Player name:', playerName);

    if (!roomNumber || !playerName) {
        console.error('Missing room number or player name');
        alert('Please enter both room number and your name');
        return;
    }

    if (!database) {
        console.error('Firebase database not initialized');
        alert('Error: Database connection not available');
        return;
    }

    console.log('Accessing Firebase database...');
    const roomRef = database.ref(`rooms/${roomNumber}`);
    
    roomRef.once('value')
        .then((snapshot) => {
            console.log('Received room data:', snapshot.val());
            if (snapshot.exists()) {
                const gameSettings = snapshot.val();
                if (!gameSettings.isActive) {
                    console.log('Room found and not active, joining...');
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
                    console.log('Room is already active');
                    alert('Game is already in progress');
                }
            } else {
                console.log('Room not found in database');
                alert('Room not found');
            }
        })
        .catch((error) => {
            console.error('Error accessing room:', error);
            alert('Error joining room. Please try again.');
        });
}

// Setup Firebase listeners
function setupGameListeners() {
    console.log('Setting up game listeners...');
    if (!currentRoom) {
        console.error('No current room set');
        return;
    }

    const roomRef = database.ref(`rooms/${currentRoom}`);
    console.log('Setting up room listener for:', currentRoom);
    
    roomRef.on('value', (snapshot) => {
        console.log('Room data updated:', snapshot.val());
        if (snapshot.exists()) {
            gameState = snapshot.val();
            updateFishSchool();
            updatePlayerStats();
        } else {
            console.error('Room data no longer exists');
        }
    }, (error) => {
        console.error('Error in room listener:', error);
    });

    const playersRef = database.ref(`rooms/${currentRoom}/players`);
    console.log('Setting up players listener for:', currentRoom);
    
    playersRef.on('value', (snapshot) => {
        console.log('Players data updated:', snapshot.val());
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            if (currentPlayer && playersData[currentPlayer.name]) {
                currentPlayer = playersData[currentPlayer.name];
                updatePlayerStats();
            }
        }
    }, (error) => {
        console.error('Error in players listener:', error);
    });
}

// Show/hide screens
function showGameMasterScreen() {
    console.log('Showing game master screen...');
    const loginScreen = document.getElementById('login-screen');
    const gameMasterScreen = document.getElementById('game-master-screen');
    const playerScreen = document.getElementById('player-screen');
    
    if (loginScreen && gameMasterScreen && playerScreen) {
        console.log('Found all required screen elements');
        loginScreen.classList.add('hidden');
        gameMasterScreen.classList.remove('hidden');
        playerScreen.classList.add('hidden');
        console.log('Screen transition complete');
        
        // Initialize game master controls
        const startButton = document.getElementById('start-game');
        const endButton = document.getElementById('end-game');
        
        if (startButton) {
            startButton.onclick = startGame;
            console.log('Start game button initialized');
        }
        
        if (endButton) {
            endButton.onclick = endGame;
            console.log('End game button initialized');
        }
        
        // Update initial player list
        updatePlayerList();
    } else {
        console.error('Missing screen elements:', {
            loginScreen: !!loginScreen,
            gameMasterScreen: !!gameMasterScreen,
            playerScreen: !!playerScreen
        });
    }
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

// Update player data in Firebase
function updatePlayerData() {
    console.log('Updating player data...');
    if (!currentRoom || !currentPlayer) {
        console.error('Missing room or player data');
        return;
    }

    const playerRef = database.ref(`rooms/${currentRoom}/players/${currentPlayer.name}`);
    console.log('Updating player:', currentPlayer.name);
    
    playerRef.set(currentPlayer)
        .then(() => {
            console.log('Player data updated successfully');
        })
        .catch((error) => {
            console.error('Error updating player data:', error);
        });
}

// Update game state in Firebase
function updateGameState() {
    console.log('Updating game state...');
    if (!currentRoom || !gameState) {
        console.error('Missing room or game state');
        return;
    }
    
    const roomRef = database.ref(`rooms/${currentRoom}`);
    console.log('Updating room:', currentRoom);
    
    roomRef.set(gameState)
        .then(() => {
            console.log('Game state updated successfully');
        })
        .catch((error) => {
            console.error('Error updating game state:', error);
        });
}

// Update player list display
function updatePlayerList() {
    console.log('Updating player list...');
    if (!currentRoom) {
        console.error('No current room set');
        return;
    }

    const playerList = document.getElementById('player-list');
    if (!playerList) {
        console.error('Player list element not found');
        return;
    }

    const playersRef = database.ref(`rooms/${currentRoom}/players`);
    console.log('Fetching players from Firebase...');
    
    playersRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const playersData = snapshot.val();
                console.log('Current players data:', playersData);
                
                playerList.innerHTML = '';
                Object.values(playersData).forEach(player => {
                    console.log('Adding player to list:', player);
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
                console.log('Player list updated successfully');
            } else {
                console.log('No players found in room');
                playerList.innerHTML = '<p>No players joined yet</p>';
            }
        })
        .catch((error) => {
            console.error('Error updating player list:', error);
        });
}

// Round timer functionality
let roundTimer = null;

function startRoundTimer() {
    console.log('Starting round timer...');
    if (roundTimer) {
        console.log('Clearing existing timer');
        clearInterval(roundTimer);
    }
    
    if (!gameState) {
        console.error('No game state available');
        return;
    }

    const roundTime = gameState.roundTime;
    let timeLeft = roundTime;
    
    const timerDisplay = document.getElementById('round-timer');
    if (timerDisplay) {
        console.log('Updating timer display');
        timerDisplay.textContent = `Round ${gameState.currentRound} - Time Left: ${timeLeft}s`;
    } else {
        console.error('Timer display element not found');
    }
    
    roundTimer = setInterval(() => {
        timeLeft--;
        if (timerDisplay) {
            timerDisplay.textContent = `Round ${gameState.currentRound} - Time Left: ${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
            console.log('Round time up, ending round');
            clearInterval(roundTimer);
            endRound();
        }
    }, 1000);
}

function endRound() {
    console.log('Ending round...');
    if (!currentRoom) {
        console.error('No current room set');
        return;
    }
    
    const roomRef = database.ref(`rooms/${currentRoom}`);
    roomRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                console.log('Current room data:', roomData);
                
                // Update fish population (reproduction)
                const reproductionRate = 0.2; // 20% reproduction rate
                const newFish = Math.floor(roomData.fishPopulation * reproductionRate);
                roomData.fishPopulation = Math.min(
                    roomData.fishPopulation + newFish,
                    roomData.maxFish
                );
                
                console.log('Updated fish population:', roomData.fishPopulation);
                
                // Check if game should end
                if (roomData.fishPopulation < roomData.survivalThreshold) {
                    console.log('Fish population below threshold, ending game');
                    roomData.isActive = false;
                    return roomRef.set(roomData);
                }
                
                // Start next round
                roomData.currentRound++;
                roomData.roundStartTime = Date.now();
                console.log('Starting next round:', roomData.currentRound);
                return roomRef.set(roomData);
            } else {
                console.error('Room not found in database');
                return Promise.reject('Room not found');
            }
        })
        .then(() => {
            console.log('Round ended successfully');
            gameState = roomData;
            updateFishSchool();
            startRoundTimer();
        })
        .catch((error) => {
            console.error('Error ending round:', error);
            alert('Error ending round. Please try again.');
        });
}

// Catch fish
function catchFish(event) {
    if (!currentPlayer || !gameState || !gameState.isActive) return;

    const now = Date.now();
    if (now - lastCatchTime < CATCH_COOLDOWN) return;
    lastCatchTime = now;

    // Get click position relative to fishing area
    const fishingArea = document.querySelector('.fishing-area');
    if (!fishingArea) return;

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

// Start the game
function startGame() {
    console.log('Attempting to start game...');
    if (!isGameMaster) {
        console.error('Not game master, cannot start game');
        return;
    }

    if (!currentRoom) {
        console.error('No current room set');
        return;
    }

    console.log('Updating game state for room:', currentRoom);
    const roomRef = database.ref(`rooms/${currentRoom}`);
    
    roomRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                console.log('Current room data:', roomData);
                
                roomData.isActive = true;
                roomData.currentRound = 1;
                roomData.roundStartTime = Date.now();
                
                console.log('Updating room with new game state:', roomData);
                return roomRef.set(roomData);
            } else {
                console.error('Room not found in database');
                return Promise.reject('Room not found');
            }
        })
        .then(() => {
            console.log('Game started successfully');
            gameState = roomData;
            startRoundTimer();
            updateFishSchool();
            updatePlayerList();
        })
        .catch((error) => {
            console.error('Error starting game:', error);
            alert('Error starting game. Please try again.');
        });
}

// End the game
function endGame() {
    console.log('Attempting to end game...');
    if (!isGameMaster) {
        console.error('Not game master, cannot end game');
        return;
    }

    if (!currentRoom) {
        console.error('No current room set');
        return;
    }

    console.log('Updating game state for room:', currentRoom);
    const roomRef = database.ref(`rooms/${currentRoom}`);
    
    roomRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                console.log('Current room data:', roomData);
                
                roomData.isActive = false;
                roomData.gameEndTime = Date.now();
                
                console.log('Updating room with end game state:', roomData);
                return roomRef.set(roomData);
            } else {
                console.error('Room not found in database');
                return Promise.reject('Room not found');
            }
        })
        .then(() => {
            console.log('Game ended successfully');
            gameState = roomData;
            alert('Game has ended!');
        })
        .catch((error) => {
            console.error('Error ending game:', error);
            alert('Error ending game. Please try again.');
        });
}

// Initialize game when page loads
window.onload = init; 
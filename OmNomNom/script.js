// Card data
const cards = [
    { type: 'mouse', value: 1 },
    { type: 'cat', value: 2 },
    { type: 'dog', value: 3 },
    { type: 'cheese', value: 1 },
    // Add more cards as needed
];

let playerHand = [];
let computerHand = [];
let centralPile = [];

// Initialize game
function initGame() {
    playerHand = drawCards(5);
    computerHand = drawCards(5);
    centralPile = [];
    renderHands();
}

// Draw cards
function drawCards(num) {
    let hand = [];
    for (let i = 0; i < num; i++) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        hand.push(cards[randomIndex]);
    }
    return hand;
}

// Render hands
function renderHands() {
    const playerHandDiv = document.getElementById('player-hand');
    const computerHandDiv = document.getElementById('computer-hand');

    playerHandDiv.innerHTML = '';
    computerHandDiv.innerHTML = '';

    playerHand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.innerHTML = `${card.type} (${card.value})`;
        playerHandDiv.appendChild(cardDiv);
    });

    computerHand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.innerHTML = `?`;
        computerHandDiv.appendChild(cardDiv);
    });
}

// Play a round
function playRound() {
    const playerCard = playerHand.pop();
    const computerCard = computerHand.pop();

    centralPile.push(playerCard, computerCard);

    // Simple logic: highest value card wins
    if (playerCard.value > computerCard.value) {
        alert('Player wins the round!');
    } else if (playerCard.value < computerCard.value) {
        alert('Computer wins the round!');
    } else {
        alert('It\'s a tie!');
    }

    renderHands();
}

document.getElementById('play-button').addEventListener('click', playRound);

// Start the game
initGame();

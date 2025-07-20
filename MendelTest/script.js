document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let gameState = {
        f1Started: false,
        dominantCount: 0,
        recessiveCount: 0,
        scores: 0,
        birthNumber: 6,
        initialGenePool: ['A', 'A', 'B', 'B', 'B'],
        breedingGenePool: [],
        blobs: [],
        blobId: 0,
        colorChange: Math.floor(Math.random() * 101) - 50,
        blobPositions: {
            x: [-180, -145, -180, -145, -180, -145],
            y: [-25, -25, 10, 10, 45, 45]
        }
    };

    // DOM elements
    const breedingArea = document.getElementById('breedingArea');
    const deleteArea = document.getElementById('deleteArea');
    const homozygousDominant = document.getElementById('homozygousDominant');
    const heterozygous = document.getElementById('heterozygous');
    const homozygousRecessive = document.getElementById('homozygousRecessive');
    const startButton = document.getElementById('startButton');
    const checkButton = document.getElementById('checkButton');
    const deleteButton = document.getElementById('deleteButton');
    const dominantCountElement = document.getElementById('dominantCount');
    const recessiveCountElement = document.getElementById('recessiveCount');
    const scoreElement = document.getElementById('score');
    const successMessage = document.getElementById('successMessage');

    // Initialize game
    function initGame() {
        gameState.f1Started = false;
        gameState.dominantCount = 0;
        gameState.recessiveCount = 0;
        gameState.scores = 0;
        gameState.breedingGenePool = [];
        gameState.blobs = [];
        gameState.blobId = 0;
        gameState.colorChange = Math.floor(Math.random() * 101) - 50;
        updateStats();
        clearAreas();
        hideSuccessMessage();
    }

    // Update statistics display
    function updateStats() {
        dominantCountElement.textContent = gameState.dominantCount;
        recessiveCountElement.textContent = gameState.recessiveCount;
        scoreElement.textContent = gameState.scores;
    }

    // Clear all areas
    function clearAreas() {
        breedingArea.innerHTML = '<div class="area-label">生殖區</div>';
        deleteArea.innerHTML = '<div class="area-label">刪除區</div>';
    }

    // Create a new blob
    function createBlob(genes, position) {
        const blob = document.createElement('div');
        blob.className = `blob ${genes.includes('A') ? 'dominant' : 'recessive'}`;
        blob.dataset.genes = genes.join('');
        blob.dataset.id = gameState.blobId++;
        
        // Create blob image
        const img = document.createElement('img');
        img.src = genes.includes('A') ? 'assets/dominant.svg' : 'assets/recessive.svg';
        blob.appendChild(img);
        
        // Position blob
        blob.style.left = `${position.x}px`;
        blob.style.top = `${position.y}px`;
        
        // Make blob draggable
        blob.draggable = true;
        blob.addEventListener('dragstart', handleDragStart);
        blob.addEventListener('dragend', handleDragEnd);
        
        return blob;
    }

    // Handle drag start
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.genes);
        e.target.classList.add('dragging');
    }

    // Handle drag end
    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    // Handle drop
    function handleDrop(e) {
        e.preventDefault();
        const genes = e.dataTransfer.getData('text/plain');
        const blob = createBlob(genes.split(''), {
            x: Math.random() * (e.target.offsetWidth - 40),
            y: Math.random() * (e.target.offsetHeight - 40)
        });
        
        e.target.appendChild(blob);
    }

    // Handle drag over
    function handleDragOver(e) {
        e.preventDefault();
    }

    // Start breeding
    function startBreeding() {
        if (gameState.f1Started) return;
        
        gameState.f1Started = true;
        gameState.breedingGenePool = [];
        
        // Generate offspring
        for (let i = 0; i < gameState.birthNumber; i++) {
            const genes = [
                gameState.initialGenePool[Math.floor(Math.random() * gameState.initialGenePool.length)],
                gameState.initialGenePool[Math.floor(Math.random() * gameState.initialGenePool.length)]
            ];
            
            const position = {
                x: gameState.blobPositions.x[i],
                y: gameState.blobPositions.y[i]
            };
            
            const blob = createBlob(genes, position);
            breedingArea.appendChild(blob);
            gameState.blobs.push(blob);
        }
    }

    // Check classification
    function checkClassification() {
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach(blob => {
            const genes = blob.dataset.genes.split('');
            const isDominant = genes.includes('A');
            
            if (isDominant) {
                gameState.dominantCount++;
            } else {
                gameState.recessiveCount++;
            }
            
            // Check if blob is in correct classification area
            const parent = blob.parentElement;
            if (parent === homozygousDominant && genes[0] === 'A' && genes[1] === 'A') {
                gameState.scores++;
            } else if (parent === heterozygous && genes[0] !== genes[1]) {
                gameState.scores++;
            } else if (parent === homozygousRecessive && genes[0] === 'B' && genes[1] === 'B') {
                gameState.scores++;
            } else {
                gameState.scores--;
            }
        });
        
        updateStats();
        
        // Check if all blobs are correctly classified
        if (gameState.scores === gameState.birthNumber) {
            showSuccessMessage();
        }
    }

    // Delete blobs
    function deleteBlobs() {
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach(blob => blob.remove());
        gameState.blobs = [];
        gameState.dominantCount = 0;
        gameState.recessiveCount = 0;
        updateStats();
    }

    // Show success message
    function showSuccessMessage() {
        successMessage.style.display = 'block';
        successMessage.addEventListener('click', hideSuccessMessage);
    }

    // Hide success message
    function hideSuccessMessage() {
        successMessage.style.display = 'none';
    }

    // Event listeners
    startButton.addEventListener('click', startBreeding);
    checkButton.addEventListener('click', checkClassification);
    deleteButton.addEventListener('click', deleteBlobs);

    // Add drag and drop listeners to areas
    [breedingArea, deleteArea, homozygousDominant, heterozygous, homozygousRecessive].forEach(area => {
        area.addEventListener('dragover', handleDragOver);
        area.addEventListener('drop', handleDrop);
    });

    // Initialize game
    initGame();
}); 
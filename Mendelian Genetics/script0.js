const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let variables = {    
    i: 6,
    x: -145,
    y: 45,    
    scores: 0,
    birth_number: 6,
    num_顯性: 0,
    num_隱性: 0,
    color_change: 45
};

let lists = {
    基因庫_初始: ["A", "A", "B", "B", "B"],
    基因庫_生殖區: [],
    gene: [],
    blobs_position_x: [-180, -145, -180, -145, -180, -145],
    blobs_position_y: [-25, -25, 10, 10, 45, 45]
};

// Initialize canvas and draw initial blobs
function init() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    createBlobs();
}

// Create blobs on the canvas based on positions
function createBlobs() {
    lists.blobs_position_x.forEach((x, index) => {
        let y = lists.blobs_position_y[index];
        drawBlob(x, y, getColorByGene(lists.基因庫_初始[index])); // Use gene to determine color
    });
}

// Draw a blob at specified position
function drawBlob(x, y, color) {
    ctx.beginPath();
    ctx.arc(x + canvas.width / 2, y + canvas.height / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

// Determine color by gene type
function getColorByGene(gene) {
    if (gene === 'A') {
        return 'red';
    } else {
        return 'blue';
    }
}

// Update gene pool for reproduction area
function updateGenePool() {
    lists.基因庫_生殖區 = lists.基因庫_初始.slice(); // Example logic to copy initial gene pool
}

// Simulate the gene mixing process
function mixGenes() {
    lists.gene = [];
    for (let i = 0; i < variables.birth_number; i++) {
        let geneA = lists.基因庫_生殖區[Math.floor(Math.random() * lists.基因庫_生殖區.length)];
        let geneB = lists.基因庫_生殖區[Math.floor(Math.random() * lists.基因庫_生殖區.length)];
        lists.gene.push(geneA + geneB);
    }
}

// Draw mixed genes as new blobs
function drawMixedGenes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing new blobs
    lists.blobs_position_x.forEach((x, index) => {
        let y = lists.blobs_position_y[index];
        let gene = lists.gene[index];
        let color = gene.includes('A') ? 'red' : 'blue';
        drawBlob(x, y, color);
    });
}

// Main simulation loop
function simulationLoop() {
    setInterval(() => {
        mixGenes();
        drawMixedGenes();
    }, 1000); // Example interval of 1 second for the simulation loop
}

// Event to start the process
document.addEventListener('DOMContentLoaded', (event) => {
    init();
    updateGenePool();
    simulationLoop();
});

// Create the SVG element
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", "600");
svg.setAttribute("height", "400");
svg.setAttribute("viewBox", "0 0 600 400");

// Append the SVG to the container div
document.getElementById("svgContainer").appendChild(svg);

// Gene pool
const genePool = ['A', 'A', 'a', 'a','a'];

// Function to get random allele from genePool
function getRandomAllele() {
    return genePool[Math.floor(Math.random() * genePool.length)];
}

// Function to generate random alleles pair
function getRandomAlleles() {
    return `${getRandomAllele()},${getRandomAllele()}`;
}

// Function to generate random position within SVG bounds
function getRandomPosition(maxWidth, maxHeight) {
    return {
        x: Math.floor(Math.random() * maxWidth),
        y: Math.floor(Math.random() * maxHeight)
    };
}

// Function to generate regular positions arranged in 2 columns
function getRegularPosition(index, total, maxWidth, maxHeight) {
    const columns = 2;
    const rows = Math.ceil(total / columns);
    const spacingX = maxWidth / (columns + 1);
    const spacingY = maxHeight / (rows + 1);
    
    const column = index % columns;
    const row = Math.floor(index / columns);
    
    return {
        x: (column + 1) * spacingX,
        y: (row + 1) * spacingY
    };
}

// Create and add 8 sprites to the SVG with random alleles
const totalSprites = 6;

for (let i = 1; i <= totalSprites; i++) {

    const alleles = getRandomAlleles();
    const position = getRegularPosition(i-1, totalSprites, 200, 200);
    const sprite = new Sprite(`sprite${i}`, position.x, position.y, 25, alleles);
    svg.appendChild(sprite.getGroup());
    sprite.setDraggable(svg);
}

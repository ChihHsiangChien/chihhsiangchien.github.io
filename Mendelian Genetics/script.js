// Create the SVG element
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", "600");
svg.setAttribute("height", "400");
svg.setAttribute("viewBox", "0 0 600 400");

// Append the SVG to the container div
document.getElementById("svgContainer").appendChild(svg);

// Define areas
const defaultArea = { x: 10, y: 10, width: 200, height: 200 };
const breedingArea = { x: 220, y: 10, width: 200, height: 200 };
const offspringArea = { x: 430, y: 10, width: 160, height: 380 };


// Gene pool
const genePool = ['A', 'A', 'a', 'a','a'];


// Draw areas
function drawArea(area, className) {
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", area.x);
    rect.setAttribute("y", area.y);
    rect.setAttribute("width", area.width);
    rect.setAttribute("height", area.height);
    rect.setAttribute("fill", "white");    
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "2");    
    rect.setAttribute("class", className);
    svg.appendChild(rect);
}

drawArea(defaultArea, "default-area");
drawArea(breedingArea, "breeding-area");
drawArea(offspringArea, "offspring-area");


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
    const position = getRegularPosition(i - 1, totalSprites, defaultArea.width, defaultArea.height);
    const sprite = new Sprite(`sprite${i}`, defaultArea.x + position.x, defaultArea.y + position.y, 25, alleles);

    svg.appendChild(sprite.getGroup());
    sprite.setDraggable(svg);
}

// Breeding function
let offspringCount = 0;

document.getElementById("breedButton").addEventListener("click", () => {


    const spritesInBreedingArea = [];
    svg.querySelectorAll(".sprite").forEach(sprite => {
        const transform = sprite.getAttribute("transform");
        const coords = transform.match(/translate\(([^,]+),([^\)]+)\)/).slice(1, 3).map(Number);
        //console.log(coords);

        if (coords[0] > breedingArea.x && coords[0] < breedingArea.x + breedingArea.width &&
            coords[1] > breedingArea.y && coords[1] < breedingArea.y + breedingArea.height) {
            console.log("1");

            spritesInBreedingArea.push(sprite);
        }
    });
    if (spritesInBreedingArea.length >= 2) {
        const parent1Alleles = spritesInBreedingArea[0].querySelector("text").textContent.split(",");
        const parent2Alleles = spritesInBreedingArea[1].querySelector("text").textContent.split(",");

        const offspringAlleles = `${parent1Alleles[Math.floor(Math.random() * 2)]},${parent2Alleles[Math.floor(Math.random() * 2)]}`;
        const position = getRegularPosition(offspringCount, totalSprites, offspringArea.width, offspringArea.height);
        const sprite = new Sprite(`offspring${offspringCount + 1}`, offspringArea.x + position.x, offspringArea.y + position.y, 25, offspringAlleles);
        svg.appendChild(sprite.getGroup());
        sprite.setDraggable(svg);
        offspringCount++;
    }
});
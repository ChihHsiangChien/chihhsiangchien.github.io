// Create the SVG element
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", "600");
svg.setAttribute("height", "400");
svg.setAttribute("viewBox", "0 0 600 400");

// Append the SVG to the container div
document.getElementById("svgContainer").appendChild(svg);

// Define areas
const defaultArea = { x: 10, y: 10, width: 160, height: 180 };
const breedingArea = { x: 180, y: 10, width: 100, height: 100 };
const offspringArea = { x: 290, y: 10, width: 280, height: 380 };

// Gene pool
const genePool = ['A', 'A', 'a', 'a', 'a'];

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

// Function to generate regular positions arranged in 2 columns
function getRegularPosition(index, total, maxWidth, maxHeight, columns) {
    //const columns = 2;
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

// Create and add 6 sprites to the SVG with random alleles
const totalSprites = 6;

for (let i = 1; i <= totalSprites; i++) {
    const alleles = getRandomAlleles();
    const position = getRegularPosition(i - 1, totalSprites, defaultArea.width, defaultArea.height, 2);
    new Sprite(`sprite${i}`, defaultArea.x + position.x, defaultArea.y + position.y, 25, alleles);
}

// Breeding function
let offspringCount = 0;

document.getElementById("breedButton").addEventListener("click", () => {
    const spritesInBreedingArea = [];
    svg.querySelectorAll(".sprite").forEach(sprite => {
        const translateX = parseFloat(sprite.getAttribute('data-translateX'));
        const translateY = parseFloat(sprite.getAttribute('data-translateY'));

        if (!isNaN(translateX) && !isNaN(translateY)) {
            // Check if the sprite is within the breeding area bounds
            if (translateX > breedingArea.x && translateX < breedingArea.x + breedingArea.width &&
                translateY > breedingArea.y && translateY < breedingArea.y + breedingArea.height) {
                spritesInBreedingArea.push(sprite);
            }
        } else {
            console.error('Invalid coordinates for sprite:', sprite);
        }
    });

    if (spritesInBreedingArea.length == 2) {
        const parent1Alleles = spritesInBreedingArea[0].querySelector("text").textContent.split(",");
        const parent2Alleles = spritesInBreedingArea[1].querySelector("text").textContent.split(",");

        const offspringAlleles = `${parent1Alleles[Math.floor(Math.random() * 2)]},${parent2Alleles[Math.floor(Math.random() * 2)]}`;
        const position = getRegularPosition(offspringCount, 30, offspringArea.width, offspringArea.height, 4);
        const sprite = new Sprite(`offspring${offspringCount + 1}`, offspringArea.x + position.x, offspringArea.y + position.y, 25, offspringAlleles);
        offspringCount++;
    }
});

document.getElementById("deleteButton").addEventListener("click", () => {
    const spritesInOffspringArea = [];
    svg.querySelectorAll(".sprite").forEach(sprite => {
        const translateX = parseFloat(sprite.getAttribute('data-translateX'));
        const translateY = parseFloat(sprite.getAttribute('data-translateY'));

        if (!isNaN(translateX) && !isNaN(translateY)) {
            // Check if the sprite is within the offspring area bounds
            if (translateX > offspringArea.x && translateX < offspringArea.x + offspringArea.width &&
                translateY > offspringArea.y && translateY < offspringArea.y + offspringArea.height) {
                spritesInOffspringArea.push(sprite);
            }
        } else {
            console.error('Invalid coordinates for sprite:', sprite);
        }
    });

    // Remove sprites found in the offspring area
    spritesInOffspringArea.forEach(sprite => {
        sprite.remove(); // Remove the sprite from the SVG
        // Optionally, perform any additional cleanup or logic here
    });
    offspringCount = 0;
});
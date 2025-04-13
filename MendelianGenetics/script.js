// Configuration for the simulation
const config = {
    totalSprites: 6,
    spriteSize: 25,
    offspringAreaCountLimit: 32,
    defaultArea: { x: 10, y: 10, width: 160, height: 200 },
    breedingArea: { x: 180, y: 10, width: 100, height: 100 },
    offspringArea: { x: 290, y: 10, width: 280, height: 380 },
    chromosomeCount: 4, // Number of chromosomes per creature
    creatureType: Elf, // Type of creature to use (e.g., Elf, etc.)
};

// 全局變數，追蹤 Alleles 是否應該顯示 ---
let globalAllelesVisible = false;

// 用來儲存所有生物物件的陣列
const creatures = [];


// Function to create a creature with random chromosomes
function createCreature(id, x, y, size, creatureType, chromosomeCount) {
    const spriteChromosomes = [];
    for (let j = 1; j <= chromosomeCount; j++) {
        spriteChromosomes.push(new Chromosome(j, creatureType.getRandomAlleles(j)));
        spriteChromosomes.push(new Chromosome(j, creatureType.getRandomAlleles(j)));
    }
    return new creatureType(
        id,
        x,
        y,
        size,
        spriteChromosomes
    );
}
// Create the SVG element
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("viewBox", "0 0 600 400");
document.getElementById("svgContainer").appendChild(svg);

// Define areas

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

drawArea(config.defaultArea, "default-area");
drawArea(config.breedingArea, "breeding-area");
drawArea(config.offspringArea, "offspring-area");

// Function to generate regular positions
function getRegularPosition(index, total, maxWidth, maxHeight, columns) {
    const rows = Math.ceil(total / columns);
    const spacingX = maxWidth / (columns + 1);
    const spacingY = maxHeight / (rows + 1);
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
        x: (column + 1) * spacingX,
        y: (row + 1) * spacingY,
    };
}

// Create initial elves using an async IIFE
let offspringCount = 0;
(async () => {
    for (let i = 1; i <= config.totalSprites; i++) {
        const position = getRegularPosition(i - 1, config.totalSprites, config.defaultArea.width, config.defaultArea.height, 2);
        const elf = createCreature(
            `sprite${i}`,
            config.defaultArea.x + position.x,
            config.defaultArea.y + position.y,
            config.spriteSize,
            config.creatureType,
            config.chromosomeCount);
        await elf.init(config.defaultArea.x + position.x, config.defaultArea.y + position.y);
        // 將創建的生物物件存入陣列 ---
        creatures.push(elf);        
    }
})();

// Breeding function
document.getElementById("breedButton").addEventListener("click", async () => {
    const spritesInBreedingArea = [];
    svg.querySelectorAll(".sprite").forEach((sprite) => {
        const translateX = parseFloat(sprite.getAttribute("data-translateX"));
        const translateY = parseFloat(sprite.getAttribute("data-translateY"));
        if (!isNaN(translateX) && !isNaN(translateY)) {
            if (
                translateX > config.breedingArea.x &&
                translateX < config.breedingArea.x + config.breedingArea.width &&
                translateY > config.breedingArea.y &&
                translateY < config.breedingArea.y + config.breedingArea.height
            ) {
                spritesInBreedingArea.push(sprite);
            }
        }
    });

    if (spritesInBreedingArea.length === 2) {
        const parent1ChromosomesAttr = spritesInBreedingArea[0].getAttribute("data-chromosomes");
        const parent2ChromosomesAttr = spritesInBreedingArea[1].getAttribute("data-chromosomes");
        
        const parent1Chromosomes = JSON.parse(parent1ChromosomesAttr);
        const parent2Chromosomes = JSON.parse(parent2ChromosomesAttr);
        const offspringChromosomes = [];
        
        const maxChromosomeNumber = Math.max(
            parent1Chromosomes.length,
            parent2Chromosomes.length
        );

        for (let chromosomeNumber = 1; chromosomeNumber <= maxChromosomeNumber; chromosomeNumber++) {
            const parent1MatchingChromosomes = parent1Chromosomes.filter(
                (chromosome) => chromosome.number === chromosomeNumber
            );
            const parent2MatchingChromosomes = parent2Chromosomes.filter(
                (chromosome) => chromosome.number === chromosomeNumber
            );

            if (parent1MatchingChromosomes.length > 0) {
                const randomIndex = Math.floor(Math.random() * parent1MatchingChromosomes.length);
                offspringChromosomes.push(parent1MatchingChromosomes[randomIndex]);
            }
            if (parent2MatchingChromosomes.length > 0) {
                const randomIndex = Math.floor(Math.random() * parent2MatchingChromosomes.length);
                offspringChromosomes.push(parent2MatchingChromosomes[randomIndex]);
            }
        }

        const position = getRegularPosition(
            offspringCount % config.offspringAreaCountLimit,
            config.offspringAreaCountLimit,
            config.offspringArea.width,
            config.offspringArea.height,
            4
        );

        const offspring = createCreature(
            `offspring${offspringCount + 1}`,
            config.offspringArea.x + position.x, config.offspringArea.y + position.y, config.spriteSize, config.creatureType, config.chromosomeCount
        );
        // 在 init 之前設定 offspring 的染色體 (重要！)
        offspring.chromosomes = offspringChromosomes; // 直接賦值繼承的染色體        
        await offspring.init(config.offspringArea.x + position.x, config.offspringArea.y + position.y);
        creatures.push(offspring); // 將後代物件也存起來
        // 根據全局變數設定新生 offspring 的 alleles 可見性 ---
        offspring.setAllelesVisibility(globalAllelesVisible);
        
       
        offspringCount++;
    }
});

// Delete offspring button handler
document.getElementById("deleteButton").addEventListener("click", () => {
    const spritesInOffspringArea = [];
    svg.querySelectorAll(".sprite").forEach((sprite) => {
        const translateX = parseFloat(sprite.getAttribute("data-translateX"));
        const translateY = parseFloat(sprite.getAttribute("data-translateY"));
        if (!isNaN(translateX) && !isNaN(translateY)) {
            if (
                translateX > config.offspringArea.x &&
                translateX < config.offspringArea.x + config.offspringArea.width &&
                translateY > config.offspringArea.y &&
                translateY < config.offspringArea.y + config.offspringArea.height
            ) {
                spritesInOffspringArea.push(sprite);
            }
        }
    });
    // --- 新增：從 creatures 陣列中移除對應的物件 ---
    const idsToRemove = new Set();
    spritesInOffspringArea.forEach((sprite) => {
      idsToRemove.add(sprite.id);
      sprite.remove();
    });

    // 從後往前遍歷以安全地刪除元素
    for (let i = creatures.length - 1; i >= 0; i--) {
      if (idsToRemove.has(creatures[i].id)) {
          creatures.splice(i, 1);
      }
    }    
    offspringCount = 0;
});

// Add toggle alleles button handler
document.getElementById("toggleAllelesButton").addEventListener("click", () => {
  // 1. 切換全局狀態變數
  globalAllelesVisible = !globalAllelesVisible;
  // 2. 更新所有現存生物的顯示狀態以匹配全局狀態

  creatures.forEach(creature => {
    // 使用 BaseCreature 中的方法來設置可見性
    creature.setAllelesVisibility(globalAllelesVisible);
  });


  /*
  creatures.forEach(creature => {
    creature.toggleAllelesText(); // 呼叫物件自身的方法
  });  
  */
  /*
    svg.querySelectorAll(".sprite").forEach((sprite) => {
        const spriteId = sprite.getAttribute("id");
        const group = document.getElementById(spriteId);
        const allelesTextElement = group.querySelector("#alleles-text");
        if (allelesTextElement) {
            const currentDisplay = allelesTextElement.style.display;
            allelesTextElement.style.display = currentDisplay === "none" ? "block" : "none";
        }
    });
    */

});

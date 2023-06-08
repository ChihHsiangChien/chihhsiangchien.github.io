// 創建生態系統類別
class Ecosystem {
    constructor(species) {
      this.species = species; // 生態系統中的物種
    }
  
    // 更新生態系統
    update() {
      for (const species of this.species) {
        const preys = this.species.filter((s) => s !== species && s.preysOn.includes(species));
        species.updatePopulation(preys);
      }
    }
  
    // 輸出目前物種族群數量
    printPopulation() {
      for (const species of this.species) {
        console.log(`${species.name}: ${species.population}`);
      }
      console.log("------------------");
    }
  }
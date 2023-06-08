
// 定義物種類別
class Species {
    constructor(name, population, preyGrowthRate, preyPredationRate, predatorGrowthRate, predatorDeathRate) {
      this.name = name; // 物種名稱
      this.population = population; // 初始族群數量
      this.preyGrowthRate = preyGrowthRate; // 當自己是獵物時，族群成長速率
      this.preyPredationRate = preyPredationRate; // 當自己是獵物時的被捕食速率
      this.predatorGrowthRate = predatorGrowthRate; // 當自己是捕食者時的族群成長速率
      this.predatorDeathRate = predatorDeathRate; // 當自己是捕食者的死亡速率
      this.preysOn = []; // 捕食的物種
    }
  
    // 更新族群數量
    updatePopulation(preys) {
      let preyPopulation = 0;
      let predatorPopulation = 0;
      for (const prey of preys) {
        preyPopulation += prey.population;
        predatorPopulation += prey.preysOn.includes(this) ? prey.population : 0;
      }
  
      const preyGrowth = this.preyGrowthRate * this.population; // 當自己是獵物時的成長量
      const preyPredation = this.preyPredationRate * this.population * predatorPopulation; // 當自己是獵物時的被捕食量
      const predatorGrowth = this.predatorGrowthRate * this.population * preyPopulation; // 當自己是捕食者時的成長量
      const predatorDeath = this.predatorDeathRate * this.population; // 當自己是捕食者時的死亡量
  
      this.population += preyGrowth - preyPredation + predatorGrowth - predatorDeath;
    }
  }
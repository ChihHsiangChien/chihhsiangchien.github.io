// 定義物種類別
class Species {
  constructor(name, population, growthRate, deathRate) {
    this.name = name; // 物種名稱
    this.population = population; // 初始族群數量
    this.prePopulation = population;
    this.growthRate = growthRate; // 族群成長速率
    this.deathRate = deathRate; // 族群死亡速率
    this.preysOn = []; // 捕食的物種
    this.isPreyOf = []; // 被哪些物種捕食
  }

  // 設定自己被哪些物種捕食
  setPreyOf(species) {
    this.isPreyOf.push(species);
  }

  // 更新族群數量
  // 自己是獵物時，下次的族群改變量 = preyGrowthRate *(自己的族群數量)  - preyPredationRate*(自己的族群數量)*(所有會吃自己的物種族群數量)
  // 自己是捕食者時，下次的族群改變量 = predatorGrowthRate *(自己的族群數量)*(所有獵物的族群數量)  - predatorDeathRate*(自己的族群數量)
  updatePopulation() {
    let preyPopulationSum = 0; //獵物族群總數
    let predatorPopulationSum = 0; //天敵族群總數
    let preyChange = 0;
    let predatorChange = 0;

    // 獲取所有獵物的總族群數量
    for (const preySpecies of this.preysOn) {
      preyPopulationSum += preySpecies.prePopulation;
    }

    // 獲取所有天敵的總族群數量
    for (const predatorSpecies of this.isPreyOf) {
      predatorPopulationSum += predatorSpecies.prePopulation;
    }

    // 自己是獵物時的族群改變量
    if (this.preysOn.length > 0 && predatorPopulationSum >= 0) {
      preyChange =
        this.growthRate * this.prePopulation -
        this.deathRate * this.prePopulation * predatorPopulationSum;
    }
    // 自己是捕食者時的族群改變量
    if (this.isPreyOf.length > 0 && preyPopulationSum >= 0) {
      predatorChange =
        this.growthRate * this.prePopulation * preyPopulationSum -
        this.deathRate * this.prePopulation;
    }

    // 更新族群数量
    this.population += preyChange + predatorChange;

    // 確保族群數量不為負數
    if (this.population < 0) {
      this.population = 0;
    }
  }
  updatePrePopulation() {
    this.prePopulation = this.population;
  }
}

import { worldWidth, worldHeight, config, speciesList } from './simulation.js';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class Entity {
  constructor(x, y, energy, key) {
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.key = key;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  move() {
    let angle = Math.random() * 2 * Math.PI;
    let dx = Math.round(Math.cos(angle));
    let dy = Math.round(Math.sin(angle));
    this.x = (this.x + dx + worldWidth) % worldWidth;
    this.y = (this.y + dy + worldHeight) % worldHeight;
  }

  expendEnergy(amount) {
    this.energy -= amount;
  }

  gainEnergy(amount) {
    this.energy += amount;
  }

  isAlive() {
    return this.energy > 0;
  }

  updateBase() {
    this.expendEnergy(config.baseEnergyCost);
  }

  draw(ctx, patchSize, showEnergy) {
    const spec = speciesList.find(s => s.key === this.key);
    const icon = spec.icon;
    const agentFontSize = patchSize * config.agentFontMultiplier;
    const energyFontSize = patchSize * config.energyFontMultiplier;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${agentFontSize}px Arial`;
    ctx.fillText(icon, (this.x + 0.5) * patchSize, (this.y + 0.5) * patchSize);
    if (showEnergy) {
      ctx.fillStyle = spec.energyColor;
      ctx.font = `${energyFontSize}px Arial`;
      ctx.fillText(
        Math.round(this.energy),
        (this.x + 0.5) * patchSize,
        (this.y + config.energyTextOffset) * patchSize
      );
    }
  }
}

export class Herbivore extends Entity {
  constructor(x, y, energy, key) {
    super(x, y, energy, key);
    const spec = speciesList.find(s => s.key === key);
    this.speed = config[`${key}Speed`];
    this.reproduceRate = config[`${key}Reproduce`];
    this.preyKey = spec.prey[0];
  }

  eat(patches) {
    const patch = patches[this.x][this.y];
    if (patch.isPlant()) {
      patch.consume();
      this.gainEnergy(
        config[`${this.key}GainFrom${capitalize(this.preyKey)}`]
      );
    }
  }

  reproduce(currentCount) {
    const spec = speciesList.find(s => s.key === this.key);
    const cap = config[spec.capacityKey];
    if (Math.random() * 100 < this.reproduceRate && currentCount < cap) {
      this.energy /= config.reproductionEnergyCostFactor;
      const offspring = new Herbivore(this.x, this.y, this.energy, this.key);
      offspring.move();
      return offspring;
    }
    return null;
  }

  update(patches, currentCount) {
    this.updateBase();
    for (let i = 0; i < this.speed; i++) this.move();
    this.eat(patches);
    if (!this.isAlive()) return null;
    return this.reproduce(currentCount);
  }
}

export class Predator extends Entity {
  constructor(x, y, energy, key) {
    super(x, y, energy, key);
    const spec = speciesList.find(s => s.key === key);
    this.speed = config[`${key}Speed`];
    this.reproduceRate = config[`${key}Reproduce`];
    this.preyList = spec.prey;
  }

  hunt(animalsMap) {
    for (const preyKey of this.preyList) {
      const list = animalsMap[preyKey] || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const indiv = list[i];
        if (indiv.x === this.x && indiv.y === this.y) {
          this.gainEnergy(config[`${this.key}GainFrom${capitalize(preyKey)}`]);
          list.splice(i, 1);
          return;
        }
      }
    }
  }

  reproduce(currentCount) {
    const spec = speciesList.find(s => s.key === this.key);
    const cap = config[spec.capacityKey];
    if (Math.random() * 100 < this.reproduceRate && currentCount < cap) {
      this.energy /= config.reproductionEnergyCostFactor;
      const offspring = new Predator(this.x, this.y, this.energy, this.key);
      offspring.move();
      return offspring;
    }
    return null;
  }

  update(patches, animalsMap, currentCount) {
    this.updateBase();
    for (let i = 0; i < this.speed; i++) this.move();
    this.hunt(animalsMap);
    if (!this.isAlive()) return null;
    return this.reproduce(currentCount);
  }
}
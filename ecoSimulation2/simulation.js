import { Herbivore, Predator } from './entities.js';

// helper to map species key to config.has<Species> property
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const worldWidth = 25;
export const worldHeight = 25;

export const config = {};
export let initialConfig = {};

export const speciesList = [
  {
    key: 'plant', displayName: '植物', icon: '🌱', energyColor: 'green',
    type: 'producer', prey: [],
    capacityKey: 'plantCarryingCapacity',
    controls: [
      { key: 'energyFromPlant', label: '植物獲能', min: 1, max: 10, step: 1, default: 4 },
      { key: 'initialPlantPercent', label: '初始覆蓋%', min: 0, max: 100, step: 1, default: 50 },
      { key: 'plantRegrowthTime', label: '再生(回合)', min: 1, max: 100, step: 1, default: 30 },
      { key: 'plantCarryingCapacity', label: '負荷量', min: 100, max: 2500, step: 50, default: 2000 }
    ]
  },
  {
    key: 'squirrel', displayName: '松鼠', icon: '🐿️', energyColor: 'brown',
    type: 'herbivore', prey: ['plant'],
    capacityKey: 'maxSquirrels',
    controls: [
      { key: 'initialNumberSquirrel', label: '初始數量', min: 0, max: 500, step: 1, default: 100 },
      { key: 'squirrelReproduce', label: '繁殖率%', min: 0, max: 15, step: 1, default: 6 },
      { key: 'squirrelSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'squirrelGainFromPlant', label: '獲能(植物)', min: 1, max: 20, step: 1, default: 4 },
      { key: 'maxSquirrels', label: '負荷量', min: 0, max: 10000, step: 100, default: 2000 }
    ]
  },
  {
    key: 'mouse', displayName: '老鼠', icon: '🐭', energyColor: 'gray',
    type: 'herbivore', prey: ['plant'],
    capacityKey: 'maxMice',
    controls: [
      { key: 'initialNumberMouse', label: '初始數量', min: 0, max: 500, step: 1, default: 100 },
      { key: 'mouseReproduce', label: '繁殖率%', min: 0, max: 15, step: 1, default: 6 },
      { key: 'mouseSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'mouseGainFromPlant', label: '獲能(植物)', min: 1, max: 20, step: 1, default: 4 },
      { key: 'maxMice', label: '負荷量', min: 0, max: 10000, step: 100, default: 2000 }
    ]
  },
  {
    key: 'rabbit', displayName: '兔子', icon: '🐰', energyColor: 'orange',
    type: 'herbivore', prey: ['plant'],
    capacityKey: 'maxRabbits',
    controls: [
      { key: 'initialNumberRabbit', label: '初始數量', min: 0, max: 500, step: 1, default: 100 },
      { key: 'rabbitReproduce', label: '繁殖率%', min: 0, max: 15, step: 1, default: 6 },
      { key: 'rabbitSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'rabbitGainFromPlant', label: '獲能(植物)', min: 1, max: 20, step: 1, default: 4 },
      { key: 'maxRabbits', label: '負荷量', min: 0, max: 10000, step: 100, default: 2000 }
    ]
  },
  {
    key: 'pheasant', displayName: '雉雞', icon: '🐓', energyColor: 'purple',
    type: 'herbivore', prey: ['plant'],
    capacityKey: 'maxPheasants',
    controls: [
      { key: 'initialNumberPheasant', label: '初始數量', min: 0, max: 500, step: 1, default: 100 },
      { key: 'pheasantReproduce', label: '繁殖率%', min: 0, max: 15, step: 1, default: 6 },
      { key: 'pheasantSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'pheasantGainFromPlant', label: '獲能(植物)', min: 1, max: 20, step: 1, default: 4 },
      { key: 'maxPheasants', label: '負荷量', min: 0, max: 10000, step: 100, default: 2000 }
    ]
  },
  {
    key: 'snake', displayName: '蛇', icon: '🐍', energyColor: 'green',
    type: 'predator', prey: ['squirrel', 'mouse', 'rabbit'],
    capacityKey: 'maxSnakes',
    controls: [
      { key: 'initialNumberSnake', label: '初始數量', min: 0, max: 250, step: 1, default: 50 },
      { key: 'snakeReproduce', label: '繁殖率%', min: 0, max: 10, step: 1, default: 5 },
      { key: 'snakeSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'snakeGainFromSquirrel', label: '獲能(松鼠)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'snakeGainFromMouse', label: '獲能(老鼠)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'snakeGainFromRabbit', label: '獲能(兔子)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'maxSnakes', label: '負荷量', min: 0, max: 1000, step: 10, default: 200 }
    ]
  },
  {
    key: 'weasel', displayName: '黃鼠狼', icon: '🦡', energyColor: 'brown',
    type: 'predator', prey: ['squirrel', 'mouse', 'rabbit', 'pheasant'],
    capacityKey: 'maxWeasels',
    controls: [
      { key: 'initialNumberWeasel', label: '初始數量', min: 0, max: 250, step: 1, default: 50 },
      { key: 'weaselReproduce', label: '繁殖率%', min: 0, max: 10, step: 1, default: 5 },
      { key: 'weaselSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'weaselGainFromSquirrel', label: '獲能(松鼠)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'weaselGainFromMouse', label: '獲能(老鼠)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'weaselGainFromRabbit', label: '獲能(兔子)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'weaselGainFromPheasant', label: '獲能(雉雞)', min: 1, max: 50, step: 1, default: 20 },
      { key: 'maxWeasels', label: '負荷量', min: 0, max: 1000, step: 10, default: 200 }
    ]
  },
  {
    key: 'eagle', displayName: '鷹', icon: '🦅', energyColor: 'red',
    type: 'predator', prey: ['snake', 'pheasant', 'squirrel', 'mouse', 'rabbit'],
    capacityKey: 'maxEagles',
    controls: [
      { key: 'initialNumberEagle', label: '初始數量', min: 0, max: 100, step: 1, default: 30 },
      { key: 'eagleReproduce', label: '繁殖率%', min: 0, max: 10, step: 1, default: 5 },
      { key: 'eagleSpeed', label: '速度', min: 1, max: 5, step: 1, default: 2 },
      { key: 'eagleGainFromSnake', label: '獲能(蛇)', min: 5, max: 50, step: 1, default: 20 },
      { key: 'eagleGainFromPheasant', label: '獲能(雉雞)', min: 5, max: 50, step: 1, default: 20 },
      { key: 'eagleGainFromSquirrel', label: '獲能(松鼠)', min: 5, max: 50, step: 1, default: 20 },
      { key: 'eagleGainFromMouse', label: '獲能(老鼠)', min: 5, max: 50, step: 1, default: 20 },
      { key: 'eagleGainFromRabbit', label: '獲能(兔子)', min: 5, max: 50, step: 1, default: 20 },
      { key: 'maxEagles', label: '負荷量', min: 0, max: 1000, step: 10, default: 100 }
    ]
  }
];

// initialize config from speciesList controls
speciesList.forEach(spec => {
  spec.controls.forEach(ctrl => {
    config[ctrl.key] = ctrl.default;
  });
});
// general settings
config.showEnergy = false;
config.baseEnergyCost = 1;
config.reproductionEnergyCostFactor = 2;
initialConfig = JSON.parse(JSON.stringify(config));

export let patches = [];
export let animals = {};
export let ticks = 0;

// Patch (plant) structure and Regrowth
class Patch {
  constructor() {
    const pct = config.initialPlantPercent;
    if (Math.random() * 100 < pct) {
      this.pcolor = 'green';
      this.countdown = config.plantRegrowthTime;
    } else {
      this.pcolor = 'brown';
      this.countdown = Math.floor(Math.random() * config.plantRegrowthTime);
    }
  }
  isPlant() { return this.pcolor === 'green'; }
  consume() { this.pcolor = 'brown'; this.countdown = config.plantRegrowthTime; }
  regrow(currentPlantCount) {
    if (!this.isPlant()) {
      this.countdown -= 1;
      if (this.countdown <= 0 && currentPlantCount < config.plantCarryingCapacity) {
        this.pcolor = 'green';
      }
    }
  }
}

export function setup() {
  ticks = 0;
  patches = [];
  animals = {};
  // initialize patches
  for (let x = 0; x < worldWidth; x++) {
    patches[x] = [];
    for (let y = 0; y < worldHeight; y++) {
      patches[x][y] = new Patch();
    }
  }
  // initialize animal arrays and populations (honoring enable/disable toggles)
  speciesList.forEach(spec => {
    if (spec.type !== 'producer') {
      animals[spec.key] = [];
      // skip species not enabled via checkbox
      if (!config['has' + capitalize(spec.key)]) return;
      const initKey = spec.controls.find(c => c.key.startsWith('initialNumber')).key;
      const count = config[initKey];
      const gainKey = spec.controls.find(c => c.key.includes('GainFrom')).key;
      const energyMax = config[gainKey] * 2;
      const ctor = spec.type === 'herbivore' ? Herbivore : Predator;
      for (let i = 0; i < count; i++) {
        const indiv = new ctor(
          Math.floor(Math.random() * worldWidth),
          Math.floor(Math.random() * worldHeight),
          Math.random() * energyMax,
          spec.key
        );
        animals[spec.key].push(indiv);
      }
    }
  });
}

export function countPlants() {
  let c = 0;
  for (let x = 0; x < worldWidth; x++) for (let y = 0; y < worldHeight; y++) {
    if (patches[x][y].isPlant()) c++;
  }
  return c;
}

/**
 * Regenerate all patches according to current initialPlantPercent and plant regrowth settings.
 * Does not affect existing animals.
 */
export function regenPatches() {
  for (let x = 0; x < worldWidth; x++) {
    for (let y = 0; y < worldHeight; y++) {
      patches[x][y] = new Patch();
    }
  }
}

export function go() {
  // update herbivores
  speciesList.filter(s => s.type === 'herbivore').forEach(spec => {
    const list = animals[spec.key];
    for (let i = list.length - 1; i >= 0; i--) {
      const off = list[i].update(patches, list.length);
      if (off) list.push(off);
      if (!list[i].isAlive()) list.splice(i, 1);
    }
  });
  // update predators
  speciesList.filter(s => s.type === 'predator').forEach(spec => {
    const list = animals[spec.key];
    for (let i = list.length - 1; i >= 0; i--) {
      const off = list[i].update(patches, animals, list.length);
      if (off) list.push(off);
      if (!list[i].isAlive()) list.splice(i, 1);
    }
  });
  // regrow plants
  const curPlants = countPlants();
  for (let x = 0; x < worldWidth; x++) for (let y = 0; y < worldHeight; y++) {
    patches[x][y].regrow(curPlants);
  }
  ticks++;
}

export const PATCH_COLOR_PRESENT = '#66CDAA';
export const PATCH_COLOR_ABSENT = '#D2B48C';

export function drawWorld(ctx, patchSize) {
  ctx.clearRect(0, 0, patchSize * worldWidth, patchSize * worldHeight);
  for (let x = 0; x < worldWidth; x++) for (let y = 0; y < worldHeight; y++) {
    ctx.fillStyle = patches[x][y].isPlant() ? PATCH_COLOR_PRESENT : PATCH_COLOR_ABSENT;
    ctx.fillRect(x * patchSize, y * patchSize, patchSize, patchSize);
  }
  speciesList.filter(s => s.type !== 'producer').forEach(spec => {
    animals[spec.key].forEach(ind => ind.draw(ctx, patchSize, config.showEnergy));
  });
}

/**
 * Spawn a fresh population of the given species (honoring its initialNumber and energy settings).
 * Clears any existing individuals of that species and adds new ones at random positions.
 * @param {string} key speciesList.key identifying the species to spawn
 */
export function spawnSpecies(key) {
  const spec = speciesList.find(s => s.key === key);
  if (!spec || spec.type === 'producer') return;
  animals[spec.key] = [];
  const initCtrl = spec.controls.find(c => c.key.startsWith('initialNumber'));
  const count = config[initCtrl.key];
  const gainCtrl = spec.controls.find(c => c.key.includes('GainFrom'));
  const energyMax = config[gainCtrl.key] * 2;
  const ctor = spec.type === 'herbivore' ? Herbivore : Predator;
  for (let i = 0; i < count; i++) {
    const indiv = new ctor(
      Math.floor(Math.random() * worldWidth),
      Math.floor(Math.random() * worldHeight),
      Math.random() * energyMax,
      spec.key
    );
    animals[spec.key].push(indiv);
  }
}
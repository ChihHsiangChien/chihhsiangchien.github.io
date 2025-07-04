import {
  speciesList, config, initialConfig,
  setup, go, drawWorld, patches, animals, countPlants, worldWidth, ticks,
  spawnSpecies, regenPatches
} from './simulation.js';
import {
  initPopulationChart, initEnergyPyramidChart,
  updatePopulationChart, updateEnergyChart, initFoodWeb, updateFoodWeb
} from './charts.js';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function updateStats() {
  document.getElementById('ticksDisplay').textContent = `回合: ${ticks}`;
  const container = document.getElementById('speciesStatsContainer');
  container.innerHTML = '';
  speciesList.forEach(spec => {
    const span = document.createElement('span');
    span.className = 'stat-group';
    span.style.backgroundColor = spec.energyColor;
    const count = spec.type === 'producer'
      ? countPlants()
      : animals[spec.key]?.length || 0;
    span.textContent = `${spec.displayName}: ${count}`;
    container.append(span);
  });
}

let simulationInterval = null;
let simulationRunning = false;

const controlsContainer = document.querySelector('.controls');
// Preserve static general controls (from first <hr> onward) to reinsert after dynamic species controls
const _initialControlsHTML = controlsContainer.innerHTML;
// Grab static general controls section (from the first <hr> onward)
const _firstHr = _initialControlsHTML.indexOf('<hr');
const generalControlsHTML = _firstHr >= 0 ? _initialControlsHTML.slice(_firstHr) : '';
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

export function initUI() {
  // Build dynamic species controls, then reinsert static general controls
  controlsContainer.innerHTML = '';
  speciesList.forEach(spec => {
    // enable checkbox
    const cg = document.createElement('div'); cg.className = 'control-group';
    const lbl = document.createElement('label'); lbl.htmlFor = 'select' + capitalize(spec.key);
    lbl.textContent = `啟用${spec.displayName}`;
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = 'select' + capitalize(spec.key);
    // default to checked for producer, or preserve existing config.has<Species>
    const hasKey = 'has' + capitalize(spec.key);
    chk.checked = config[hasKey] !== undefined ? config[hasKey] : (spec.type === 'producer');
    config[hasKey] = chk.checked;
    chk.addEventListener('change', () => {
      config[hasKey] = chk.checked;
    if (chk.checked) {
      spawnSpecies(spec.key);
      const initCtrl = spec.controls.find(c => c.key.startsWith('initialNumber'));
      if (initCtrl) {
        const initKey = initCtrl.key;
        config[initKey] = animals[spec.key].length;
        const initSlider = document.getElementById(initKey);
        initSlider.value = config[initKey];
        document.getElementById(initKey + 'Value').textContent = config[initKey];
      }
    } else {
      animals[spec.key] = [];
    }
      drawWorld(ctx, canvas.width / worldWidth);
      updateStats();
      if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
        updatePopulationChart();
      } else {
        updateEnergyChart();
      }
    });
    cg.append(lbl, chk);
    controlsContainer.append(cg);
    // species sliders
    const box = document.createElement('div');
    box.id = spec.key + 'Controls';
    box.className = 'species-controls-group';
    // 彩色標示：控制面板同種生物使用對應能量顏色背景
    box.style.backgroundColor = spec.energyColor;
    spec.controls.forEach(ctrl => {
      const row = document.createElement('div'); row.className = 'control-group';
      const label = document.createElement('label'); label.htmlFor = ctrl.key; label.textContent = ctrl.label;
      const slider = document.createElement('input'); slider.type = 'range'; slider.id = ctrl.key;
      slider.min = ctrl.min; slider.max = ctrl.max; slider.step = ctrl.step; slider.value = config[ctrl.key];
      const val = document.createElement('span'); val.id = ctrl.key + 'Value'; val.className = 'value-display'; val.textContent = config[ctrl.key];
      slider.addEventListener('input', () => {
        config[ctrl.key] = parseFloat(slider.value);
        val.textContent = slider.value;
        if (ctrl.key.startsWith('initialNumber') && config[hasKey]) {
          spawnSpecies(spec.key);
          drawWorld(ctx, canvas.width / worldWidth);
          updateStats();
          if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
            updatePopulationChart();
          } else if (document.getElementById('showEnergyPyramidButton').classList.contains('active')) {
            updateEnergyChart();
          } else if (document.getElementById('showFoodWebButton').classList.contains('active')) {
            updateFoodWeb();
          }
        } else if (ctrl.key === 'initialPlantPercent') {
          // live-update plant coverage based on new initial percentage
          regenPatches();
          drawWorld(ctx, canvas.width / worldWidth);
          updateStats();
          if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
            updatePopulationChart();
          } else if (document.getElementById('showEnergyPyramidButton').classList.contains('active')) {
            updateEnergyChart();
          } else if (document.getElementById('showFoodWebButton').classList.contains('active')) {
            updateFoodWeb();
          }
        }
      });
      row.append(label, slider, val);
      box.append(row);
    });
    controlsContainer.append(box);
  });
  // Reinsert static general controls markup (preserve dynamic listeners)
  controlsContainer.insertAdjacentHTML('beforeend', generalControlsHTML);
  document.getElementById('goOnceButton').addEventListener('click', stepSimulation);
  document.getElementById('goContinuousButton').addEventListener('click', startContinuous);
  document.getElementById('stopButton').addEventListener('click', stopContinuous);
  document.getElementById('resetDefaultsButton').addEventListener('click', resetAll);
  document.getElementById('showPopulationChartButton').addEventListener('click', () => toggleChart('population'));
  document.getElementById('showEnergyPyramidButton').addEventListener('click', () => toggleChart('energy'));
  document.getElementById('showFoodWebButton').addEventListener('click', () => toggleChart('foodWeb'));
}


function resetAll() {
  clearInterval(simulationInterval);
  Object.assign(config, JSON.parse(JSON.stringify(initialConfig)));
  initUI();
  setup();
  drawWorld(ctx, canvas.width / worldWidth);
  updateStats();
}

function stepSimulation() {
  go();
  drawWorld(ctx, canvas.width / worldWidth);
  updateStats();
  // Sync control-panel "數量" sliders to current simulation counts for enabled species
  speciesList.forEach(spec => {
    const hasKey = 'has' + capitalize(spec.key);
    if (config[hasKey]) {
      const initCtrl = spec.controls.find(c => c.key.startsWith('initialNumber'));
      if (initCtrl) {
        const key = initCtrl.key;
        const cnt = spec.type === 'producer' ? countPlants() : (animals[spec.key]?.length || 0);
        config[key] = cnt;
        const slider = document.getElementById(key);
        if (slider) slider.value = cnt;
        const disp = document.getElementById(key + 'Value');
        if (disp) disp.textContent = cnt;
      }
    }
  });
  if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
    updatePopulationChart();
  } else if (document.getElementById('showEnergyPyramidButton').classList.contains('active')) {
    updateEnergyChart();
  } else if (document.getElementById('showFoodWebButton').classList.contains('active')) {
    updateFoodWeb();
  }
}

function startContinuous() {
  if (simulationRunning) return;
  simulationRunning = true;
  // enable stop button now that continuous simulation is running
  document.getElementById('stopButton').disabled = false;
  simulationInterval = setInterval(() => {
    stepSimulation();
  }, 100);
}

function stopContinuous() {
  simulationRunning = false;
  clearInterval(simulationInterval);
  // disable stop button when simulation is stopped
  document.getElementById('stopButton').disabled = true;
}

function toggleChart(type) {
  const popBtn = document.getElementById('showPopulationChartButton');
  const energyBtn = document.getElementById('showEnergyPyramidButton');
  const foodBtn = document.getElementById('showFoodWebButton');
  const popCanvas = document.getElementById('populationChart');
  const energyCanvas = document.getElementById('energyPyramidChart');
  const foodSvg = document.getElementById('foodWebSvg');
  popBtn.classList.toggle('active', type === 'population');
  energyBtn.classList.toggle('active', type === 'energy');
  foodBtn.classList.toggle('active', type === 'foodWeb');
  popCanvas.style.display     = type === 'population' ? 'block' : 'none';
  energyCanvas.style.display  = type === 'energy' ? 'block' : 'none';
  foodSvg.style.display       = type === 'foodWeb' ? 'block' : 'none';
  // hide/show the food-web edge count only on foodWeb view
  const edgeCountEl = document.getElementById('foodWebEdgeCount');
  if (edgeCountEl) edgeCountEl.style.display = type === 'foodWeb' ? 'block' : 'none';
  if (type === 'population') {
    updatePopulationChart();
  } else if (type === 'energy') {
    updateEnergyChart();
  } else if (type === 'foodWeb') {
    updateFoodWeb();
  }
}
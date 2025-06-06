import {
  speciesList, config, initialConfig,
  setup, go, drawWorld, patches, animals, countPlants, worldWidth
} from './simulation.js';
import {
  initPopulationChart, initEnergyPyramidChart,
  updatePopulationChart, updateEnergyChart
} from './charts.js';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let simulationInterval = null;
let simulationRunning = false;

const controlsContainer = document.querySelector('.controls');
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const statsContainer = document.querySelector('.stats');
const goOnceButton = document.getElementById('goOnceButton');
const goContinuousButton = document.getElementById('goContinuousButton');
const stopButton = document.getElementById('stopButton');
const resetButton = document.getElementById('resetDefaultsButton');
const showPopulationChartButton = document.getElementById('showPopulationChartButton');
const showEnergyPyramidButton = document.getElementById('showEnergyPyramidButton');

export function initUI() {
  // Build dynamic controls
  controlsContainer.innerHTML = '';
  speciesList.forEach(spec => {
    // enable checkbox
    const cg = document.createElement('div'); cg.className = 'control-group';
    const lbl = document.createElement('label'); lbl.htmlFor = 'select' + capitalize(spec.key);
    lbl.textContent = `啟用${spec.displayName}`;
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = 'select' + capitalize(spec.key);
    chk.checked = true;
    chk.addEventListener('change', () => {
      config['has' + capitalize(spec.key)] = chk.checked;
      updateControlVisibility();
    });
    cg.append(lbl, chk);
    controlsContainer.append(cg);
    // species sliders
    const box = document.createElement('div'); box.id = spec.key + 'Controls'; box.className = 'species-controls-group';
    spec.controls.forEach(ctrl => {
      const row = document.createElement('div'); row.className = 'control-group';
      const label = document.createElement('label'); label.htmlFor = ctrl.key; label.textContent = ctrl.label;
      const slider = document.createElement('input'); slider.type = 'range'; slider.id = ctrl.key;
      slider.min = ctrl.min; slider.max = ctrl.max; slider.step = ctrl.step; slider.value = config[ctrl.key];
      const val = document.createElement('span'); val.id = ctrl.key + 'Value'; val.className = 'value-display'; val.textContent = config[ctrl.key];
      slider.addEventListener('input', () => {
        config[ctrl.key] = parseFloat(slider.value);
        val.textContent = slider.value;
      });
      row.append(label, slider, val);
      box.append(row);
    });
    controlsContainer.append(box);
  });
  // general controls listeners
  document.getElementById('showEnergy').addEventListener('change', e => { config.showEnergy = e.target.checked; });
  // buttons
  goOnceButton.addEventListener('click', stepSimulation);
  goContinuousButton.addEventListener('click', startContinuous);
  stopButton.addEventListener('click', stopContinuous);
  resetButton.addEventListener('click', resetAll);
  showPopulationChartButton.addEventListener('click', () => toggleChart('population'));
  showEnergyPyramidButton.addEventListener('click', () => toggleChart('energy'));
  updateControlVisibility();
}

function updateControlVisibility() {
  speciesList.forEach(spec => {
    const box = document.getElementById(spec.key + 'Controls');
    box.style.display = config['has' + capitalize(spec.key)] ? 'block' : 'none';
  });
}

function resetAll() {
  clearInterval(simulationInterval);
  Object.assign(config, JSON.parse(JSON.stringify(initialConfig)));
  initUI();
  setup();
  drawWorld(ctx, canvas.width / worldWidth);
}

function stepSimulation() {
  go();
  drawWorld(ctx, canvas.width / worldWidth);
  if (showPopulationChartButton.classList.contains('active')) {
    updatePopulationChart();
  } else {
    updateEnergyChart();
  }
}

function startContinuous() {
  if (simulationRunning) return;
  simulationRunning = true;
  simulationInterval = setInterval(() => {
    stepSimulation();
  }, 100);
}

function stopContinuous() {
  simulationRunning = false;
  clearInterval(simulationInterval);
}

function toggleChart(type) {
  if (type === 'population') {
    showPopulationChartButton.classList.add('active');
    showEnergyPyramidButton.classList.remove('active');
    document.getElementById('populationChart').style.display = 'block';
    document.getElementById('energyPyramidChart').style.display = 'none';
  } else {
    showPopulationChartButton.classList.remove('active');
    showEnergyPyramidButton.classList.add('active');
    document.getElementById('populationChart').style.display = 'none';
    document.getElementById('energyPyramidChart').style.display = 'block';
  }
}
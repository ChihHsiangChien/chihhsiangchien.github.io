import {
  speciesList, config, initialConfig,
  setup, go, drawWorld, patches, animals, countPlants, worldWidth, ticks,
  spawnSpecies, regenPatches
} from './simulation.js';
import {
  initPopulationChart, initEnergyPyramidChart,
  updatePopulationChart, updateEnergyChart
} from './charts.js';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function updateStats() {
  document.getElementById('ticksDisplay').textContent = `回合: ${ticks}`;
  document.getElementById('rabbitsCountDisplay').textContent = `兔群: ${animals.rabbit?.length || 0}`;
  document.getElementById('sheepCountDisplay').textContent = `羊群: ${animals.sheep?.length || 0}`;
  document.getElementById('wolvesCountDisplay').textContent = `狼群: ${animals.wolf?.length || 0}`;
  const ugEl = document.getElementById('unlimitedGrassStatDisplay');
  const ugLabel = ugEl.textContent.split(':')[0];
  ugEl.textContent = `${ugLabel}: ${countPlants()}`;
  const lgEl = document.getElementById('limitedGrassStatDisplay');
  const lgLabel = lgEl.textContent.split(':')[0];
  const totalPatches = patches.reduce((sum, row) => sum + row.length, 0);
  lgEl.textContent = `${lgLabel}: ${totalPatches - countPlants()}`;
}

let simulationInterval = null;
let simulationRunning = false;

const controlsContainer = document.querySelector('.controls');
// Preserve static general controls (from first <hr> onward) to reinsert after dynamic species controls
const _initialControlsHTML = controlsContainer.innerHTML;
// Find second <hr> to locate start of static general controls section
const _firstHr = _initialControlsHTML.indexOf('<hr');
const _hrIndex = _firstHr >= 0 ? _initialControlsHTML.indexOf('<hr', _firstHr + 1) : -1;
const generalControlsHTML = _hrIndex >= 0 ? _initialControlsHTML.slice(_hrIndex) : '';
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
    // default to unchecked unless config.has<Species> already set
    const hasKey = 'has' + capitalize(spec.key);
    chk.checked = config[hasKey] !== undefined ? config[hasKey] : false;
    config[hasKey] = chk.checked;
    chk.addEventListener('change', () => {
      config[hasKey] = chk.checked;
      updateControlVisibility();
      if (chk.checked) {
        spawnSpecies(spec.key);
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
        if (ctrl.key.startsWith('initialNumber') && config[hasKey]) {
          spawnSpecies(spec.key);
          drawWorld(ctx, canvas.width / worldWidth);
          updateStats();
          if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
            updatePopulationChart();
          } else {
            updateEnergyChart();
          }
        } else if (ctrl.key === 'initialPlantPercent') {
          // live-update plant coverage based on new initial percentage
          regenPatches();
          drawWorld(ctx, canvas.width / worldWidth);
          updateStats();
          if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
            updatePopulationChart();
          } else {
            updateEnergyChart();
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
  document.getElementById('showEnergy').addEventListener('change', e => { config.showEnergy = e.target.checked; });
  document.getElementById('goOnceButton').addEventListener('click', stepSimulation);
  document.getElementById('goContinuousButton').addEventListener('click', startContinuous);
  document.getElementById('stopButton').addEventListener('click', stopContinuous);
  document.getElementById('resetDefaultsButton').addEventListener('click', resetAll);
  document.getElementById('showPopulationChartButton').addEventListener('click', () => toggleChart('population'));
  document.getElementById('showEnergyPyramidButton').addEventListener('click', () => toggleChart('energy'));
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
  updateStats();
}

function stepSimulation() {
  go();
  drawWorld(ctx, canvas.width / worldWidth);
  updateStats();
  if (document.getElementById('showPopulationChartButton').classList.contains('active')) {
    updatePopulationChart();
  } else {
    updateEnergyChart();
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
  if (type === 'population') {
    popBtn.classList.add('active');
    energyBtn.classList.remove('active');
    document.getElementById('populationChart').style.display = 'block';
    document.getElementById('energyPyramidChart').style.display = 'none';
  } else {
    popBtn.classList.remove('active');
    energyBtn.classList.add('active');
    document.getElementById('populationChart').style.display = 'none';
    document.getElementById('energyPyramidChart').style.display = 'block';
  }
}
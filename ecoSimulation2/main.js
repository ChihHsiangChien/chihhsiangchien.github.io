import { setup, drawWorld, worldWidth } from './simulation.js';
import { initPopulationChart, initEnergyPyramidChart, updatePopulationChart, updateEnergyChart } from './charts.js';
import { initUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  initUI();
  setup();
  const canvas = document.getElementById('simulationCanvas');
  const ctx = canvas.getContext('2d');
  const patchSize = canvas.width / worldWidth;
  drawWorld(ctx, patchSize);
  initPopulationChart();
  initEnergyPyramidChart();
});
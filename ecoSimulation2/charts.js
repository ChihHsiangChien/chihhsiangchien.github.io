import { speciesList, config, countPlants, animals, ticks } from './simulation.js';

const MAX_POINTS = 300;
let popChart, energyChart;
const chartLabels = [];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function initPopulationChart() {
  const ctx = document.getElementById('populationChart').getContext('2d');
  const datasets = speciesList.map(spec => ({
    label: spec.displayName,
    data: [],
    borderColor: spec.energyColor,
    backgroundColor: spec.energyColor + '33',
    tension: 0.1,
    hidden: !config['has' + capitalize(spec.key)]
  }));
  popChart = new Chart(ctx, {
    type: 'line',
    data: { labels: chartLabels.slice(), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { title: { display: true, text: '回合' } },
        y: {
          type: 'logarithmic',
          title: { display: true, text: '數量' },
          ticks: { callback: value => Number(value.toString()) }
        }
      }
    }
  });
}

export function updatePopulationChart() {
  chartLabels.push(ticks);
  if (chartLabels.length > MAX_POINTS) chartLabels.shift();
  popChart.data.labels = chartLabels;
  speciesList.forEach((spec, idx) => {
    const val = spec.type === 'producer' ? countPlants() : animals[spec.key].length;
    const arr = popChart.data.datasets[idx].data;
    arr.push(val);
    if (arr.length > MAX_POINTS) arr.shift();
    popChart.data.datasets[idx].hidden = !config['has' + capitalize(spec.key)];
  });
  popChart.update('none');
}

export function initEnergyPyramidChart() {
  const ctx = document.getElementById('energyPyramidChart').getContext('2d');
  energyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['頂級 (' + speciesList.find(s=>s.key==='eagle').displayName + ')',
               '次級 (' + speciesList.filter(s=>s.type==='predator'&&s.key!=='eagle').map(s=>s.displayName).join('+') + ')',
               '初級 (' + speciesList.filter(s=>s.type==='herbivore').map(s=>s.displayName).join('+') + ')',
               '生產者 (' + speciesList.find(s=>s.key==='plant').displayName + ')'],
      datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#d9534f','#f0ad4e','#5cb85c','#5bc0de'] }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
  });
}

export function updateEnergyChart() {
  const producer = countPlants() * config.energyFromPlant;
  const primary = speciesList.filter(s=>s.type==='herbivore')
    .reduce((sum, s) => sum + animals[s.key].reduce((a, v) => a + Math.max(0, v.energy), 0), 0);
  const secondary = speciesList.filter(s=>s.type==='predator' && s.key!=='eagle')
    .reduce((sum, s) => sum + animals[s.key].reduce((a, v) => a + Math.max(0, v.energy), 0), 0);
  const tertiary = animals['eagle'].reduce((a, v) => a + Math.max(0, v.energy), 0);
  energyChart.data.datasets[0].data = [tertiary, secondary, primary, producer];
  energyChart.update('none');
}
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
      elements: { point: { radius: 0 } },
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
  const lastTick = chartLabels[chartLabels.length - 1];
  const isSameTick = lastTick === ticks;
  if (!isSameTick) {
    chartLabels.push(ticks);
    if (chartLabels.length > MAX_POINTS) chartLabels.shift();
  }
  popChart.data.labels = chartLabels;
  speciesList.forEach((spec, idx) => {
    const val = spec.type === 'producer' ? countPlants() : animals[spec.key].length;
    const arr = popChart.data.datasets[idx].data;
    if (!isSameTick) {
      arr.push(val);
      if (arr.length > MAX_POINTS) arr.shift();
    } else {
      arr[arr.length - 1] = val;
    }
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

/**
 * Draw an arrow from (x1,y1) to (x2,y2) with the given color.
 */
// The food web is rendered via SVG to maintain aspect ratio and crisp arrowheads.
/**
 * Initialize the food web SVG container and draw the initial web.
 */
export function initFoodWeb() {
  const svg = document.getElementById('foodWebSvg');
  const width = svg.clientWidth || 600;
  const height = svg.clientHeight || 400;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  updateFoodWeb();
}

/**
 * Update the food web SVG based on current species counts and relationships.
 */
export function updateFoodWeb() {
  const svg = document.getElementById('foodWebSvg');
  if (!svg) return;
  // Clear previous contents
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const [ , , width, height ] = svg.getAttribute('viewBox').split(' ').map(Number);
  // Define arrowhead marker
  const ns = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(ns, 'defs');
  const marker = document.createElementNS(ns, 'marker');
  marker.setAttribute('id', 'arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto');
  const arrowPath = document.createElementNS(ns, 'path');
  arrowPath.setAttribute('d', 'M0,0 L10,5 L0,10 Z');
  arrowPath.setAttribute('fill', '#999');
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);
  // Compute node positions on a circle
  const n = speciesList.length;
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) / 2 - 40;
  const step = (Math.PI * 2) / n;
  const positions = speciesList.map((spec, i) => {
    const ang = -Math.PI / 2 + i * step;
    return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });
  // Draw edges (prey -> predator)
  speciesList.forEach((spec, i) => {
    spec.prey.forEach(preyKey => {
      const j = speciesList.findIndex(s => s.key === preyKey);
      if (j >= 0) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', positions[j].x);
        line.setAttribute('y1', positions[j].y);
        line.setAttribute('x2', positions[i].x);
        line.setAttribute('y2', positions[i].y);
        line.setAttribute('stroke', '#999');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrow)');
        svg.appendChild(line);
      }
    });
  });
  // Draw nodes (rect + text)
  speciesList.forEach((spec, i) => {
    const pos = positions[i];
    const cnt = spec.type === 'producer' ? countPlants() : animals[spec.key].length;
    const bg = cnt > 0 ? spec.energyColor : '#ddd';
    const label = spec.icon + spec.displayName;
    // Create text element first to measure size
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '14px');
    text.textContent = label;
    svg.appendChild(text);
    const bbox = text.getBBox();
    const pad = 6;
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', bbox.x - pad);
    rect.setAttribute('y', bbox.y - pad);
    rect.setAttribute('width', bbox.width + pad * 2);
    rect.setAttribute('height', bbox.height + pad * 2);
    rect.setAttribute('fill', bg);
    rect.setAttribute('stroke', '#555');
    svg.insertBefore(rect, text);
  });
}
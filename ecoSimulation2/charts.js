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
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          type: 'logarithmic',
          title: { display: true, text: '能量' },
          ticks: { callback: value => Number(value.toString()) }
        }
      }
    }
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
  // Define arrowhead markers: default (grey) and active (red)
  const ns = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(ns, 'defs');
  // default arrowhead
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
  // active arrowhead
  const activeMarker = document.createElementNS(ns, 'marker');
  activeMarker.setAttribute('id', 'arrowActive');
  activeMarker.setAttribute('viewBox', '0 0 10 10');
  activeMarker.setAttribute('refX', '10');
  activeMarker.setAttribute('refY', '5');
  activeMarker.setAttribute('markerUnits', 'strokeWidth');
  activeMarker.setAttribute('markerWidth', '8');
  activeMarker.setAttribute('markerHeight', '6');
  activeMarker.setAttribute('orient', 'auto');
  const activePath = document.createElementNS(ns, 'path');
  activePath.setAttribute('d', 'M0,0 L10,5 L0,10 Z');
  activePath.setAttribute('fill', 'red');
  activeMarker.appendChild(activePath);
  defs.appendChild(activeMarker);
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
  // Draw nodes (rect + text), recording bbox center offsets for edge endpoints
  const nodesData = [];
  speciesList.forEach((spec, i) => {
    const pos = positions[i];
    const cnt = spec.type === 'producer' ? countPlants() : animals[spec.key].length;
    const bg = cnt > 0 ? spec.energyColor : '#fff';
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
    const rectW = bbox.width + pad * 2;
    const rectH = bbox.height + pad * 2;
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', bbox.x - pad);
    rect.setAttribute('y', bbox.y - pad);
    rect.setAttribute('width', rectW);
    rect.setAttribute('height', rectH);
    rect.setAttribute('fill', bg);
    rect.setAttribute('stroke', '#555');
    svg.insertBefore(rect, text);
    // record node geometry for edge endpoint offset
    nodesData[i] = {
      cx: pos.x,
      cy: pos.y,
      halfW: rectW / 2,
      halfH: rectH / 2
    };
  });

  // Draw edges (prey -> predator) with shortened segments to reveal arrowheads
  const strokeW = 2;
  const arrowBackUnits = 10; // arrowhead path length in marker viewBox units
  const arrowBackLen = arrowBackUnits * strokeW;
  // count of active feeding relationships (both prey & predator present)
  let activeEdgeCount = 0;
  speciesList.forEach((spec, i) => {
    spec.prey.forEach(preyKey => {
      const j = speciesList.findIndex(s => s.key === preyKey);
      if (j < 0) return;
      const src = nodesData[j];
      const dst = nodesData[i];
      const dx = dst.cx - src.cx;
      const dy = dst.cy - src.cy;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0) return;
      const ux = dx / dist;
      const uy = dy / dist;
      const startOffset = Math.sqrt(
        (src.halfW * Math.abs(ux)) ** 2 + (src.halfH * Math.abs(uy)) ** 2
      );
      const endOffsetRect = Math.sqrt(
        (dst.halfW * Math.abs(ux)) ** 2 + (dst.halfH * Math.abs(uy)) ** 2
      );
      const endOffset = endOffsetRect + arrowBackLen;
      const x1 = src.cx + ux * startOffset;
      const y1 = src.cy + uy * startOffset;
      const x2 = dst.cx - ux * endOffset;
      const y2 = dst.cy - uy * endOffset;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      // edge color red if both prey and predator present
      const cntPrey = preyKey === 'plant'
        ? countPlants()
        : animals[preyKey]?.length || 0;
      const cntPred = spec.type === 'producer'
        ? countPlants()
        : animals[spec.key]?.length || 0;
      const strokeColor = (cntPrey > 0 && cntPred > 0) ? 'red' : '#999';
      line.setAttribute('stroke', strokeColor);
      line.setAttribute('stroke-width', strokeW);
      // count & color active edges and arrowheads
      const isActive = cntPrey > 0 && cntPred > 0;
      if (isActive) activeEdgeCount++;
      const markerId = isActive ? 'arrowActive' : 'arrow';
      line.setAttribute('marker-end', `url(#${markerId})`);
      svg.appendChild(line);
    });
  });
  // display current count of active feeding relationships
  const edgeCountEl = document.getElementById('foodWebEdgeCount');
  if (edgeCountEl) edgeCountEl.textContent = `食性關係: ${activeEdgeCount}條`;
}
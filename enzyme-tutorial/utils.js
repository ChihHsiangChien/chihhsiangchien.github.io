export function randomPosX() {
  return Math.floor(Math.random() * (canvas.clientWidth - 40));
}
export function randomPosY() {
  return Math.floor(Math.random() * (canvas.clientHeight - 40));
}


export function getGridKey(x, y, gridSize = 80) {
  const gx = Math.floor(x / gridSize);
  const gy = Math.floor(y / gridSize);
  return `${gx},${gy}`;
}

export function getNeighborKeys(x, y, gridSize = 80) {
  const gx = Math.floor(x / gridSize);
  const gy = Math.floor(y / gridSize);
  const keys = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      keys.push(`${gx + dx},${gy + dy}`);
    }
  }
  return keys;
}

export function temperatureToSpeed(temp) {
  const minTemp = -10, maxTemp = 50;
  const minSpeed = 0.2, maxSpeed = 2;
  const t = Math.max(minTemp, Math.min(maxTemp, temp));
  return minSpeed + ((maxSpeed - minSpeed) * (t - minTemp)) / (maxTemp - minTemp);
}

export function getCenter(el) {
  if (!el) return { x: 0, y: 0 };
  return {
    x: el.offsetLeft + el.offsetWidth / 2,
    y: el.offsetTop + el.offsetHeight / 2,
  };
}

export function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function getSVGMainColor(svgText, fallback = "#888") {
  let match = svgText.match(/fill="([^"]+)"/i);
  if (match) return match[1];
  match = svgText.match(/style="[^"]*fill:([^;"]+)/i);
  if (match) return match[1];
  match = svgText.match(/stroke="([^"]+)"/i);
  if (match) return match[1];
  match = svgText.match(/style="[^"]*stroke:([^;"]+)/i);
  if (match) return match[1];
  return fallback;
}

export function getSVGMainColorFromUrl(svgUrl, fallback = "#888") {
  return fetch(svgUrl)
    .then(res => res.text())
    .then(svgText => getSVGMainColor(svgText, fallback))
    .catch(() => fallback);
}

export function countTypes(arr) {
  const map = {};
  arr.forEach((t) => {
    map[t] = (map[t] || 0) + 1;
  });
  return map;
}

export function generateUniquePositions(count, minDist = 40) {
  const positions = [];
  let tries = 0;
  while (positions.length < count && tries < count * 30) {
    let x = randomPosX();
    let y = randomPosY();
    let angle = Math.floor(Math.random() * 360);
    if (!positions.some(pos => Math.abs(pos.x - x) < minDist && Math.abs(pos.y - y) < minDist)) {
      positions.push({ x, y, angle });
    }
    tries++;
  }
  return positions;
}
const CSV_PATH = "./vessel-skeleton.csv";
const MAX_PRESSURE = 65535; // 16-bit max

// auto-run on load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("info").textContent = "載入 CSV...";
  loadAndRender().catch((err) => {
    document.getElementById("info").textContent = "錯誤: " + err;
    console.error(err);
  });
});

// show gamma value and re-render when changed
const gammaEl = document.getElementById("gamma");
const gammaValEl = document.getElementById("gammaVal");
let lastRenderPressureBuffer = null; // store pressure buffer for quick re-render
gammaEl.addEventListener("input", () => {
  gammaValEl.textContent = parseFloat(gammaEl.value).toFixed(2);
  // if we have already computed pressure, re-render using new gamma (use window.renderPressure if exposed)
  if (window._lastComputed) {
    // 重新畫有向圖
    const { prev, width, dist } = window._lastComputed;
    const edges = buildDirectedGraphFromPrev(prev, width);
    drawDirectedGraphOnCanvas(edges, width, dist);
  }
});

// ...existing code...

async function loadAndRender() {
  const grid = await fetchAndParseCSV(CSV_PATH);
  const { width, height, skeleton } = gridToSkeleton(grid);
  const startIdx = findStartIdx(skeleton, width, height);
  if (startIdx === -1) {
    document.getElementById("info").textContent = "找不到骨架點";
    return;
  }
  const endIdx = findEndIdx(skeleton, width, height);
  if (endIdx === -1) {
    document.getElementById("info").textContent = "找不到出口骨架點";
    return;
  }
  if (!isConnected(skeleton, width, height, startIdx, endIdx)) {
    document.getElementById("info").textContent = `骨架圖不連通，起點(${
      startIdx % width
    },${Math.floor(startIdx / width)})與終點(${endIdx % width},${Math.floor(
      endIdx / width
    )})無法連通`;
    return;
  } else {
    document.getElementById("info").textContent = `骨架圖已連通，起點(${
      startIdx % width
    },${Math.floor(startIdx / width)})到終點(${endIdx % width},${Math.floor(
      endIdx / width
    )})`;
  }
  console.log("骨架點數量", skeleton.reduce((s, v) => s + v, 0));
  // Dijkstra取代壓力場BFS
  const { dist, prev, visited } = dijkstraOnSkeleton(
    skeleton,
    width,
    height,
    startIdx
  );
  window._lastComputed = {
    dist,
    prev,
    width,
    height,
    startIdx,
    skeleton,
    visited,
  };
  renderDijkstraField(dist, width, height);
  // 建立有向圖（每個v, 若prev[v]=u, 則u->v）
  // const directedEdges = buildDirectedGraphFromPrev(prev, width, height);
  // drawDirectedGraphOnCanvas(directedEdges, width, dist);  // 其餘功能
  // 可視化：畫出所有有向邊
  // console.log("有向邊數量", directedEdges.length);
  // console.log("prev 有效數量", prev.filter(v => v >= 0).length);
  const allFlowEdges = buildAllFlowEdgesByDist(skeleton, dist, width, height);
  drawDirectedGraphOnCanvas(allFlowEdges, width, dist);

  setupParticles(startIdx, width);
  startSimulation();
  updateInfoDijkstra(visited, dist, width, height);
  drawStartMarker(startIdx, width);
  let maxDist = 0, maxIdx = -1;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] !== Infinity && dist[i] > maxDist) {
      maxDist = dist[i];
      maxIdx = i;
    }
  }
  console.log("距離場最大值", maxDist, "位置", maxIdx, "座標", maxIdx % width, Math.floor(maxIdx / width));  
}

async function fetchAndParseCSV(path) {
  const txt = await fetch(path).then((r) => {
    if (!r.ok) throw new Error("無法載入 CSV: " + r.status);
    return r.text();
  });
  const lines = txt
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  return lines.map((l) =>
    l.split(",").map((s) => {
      const v = Number(s);
      return isNaN(v) ? 0 : v;
    })
  );
}

function gridToSkeleton(grid) {
  const height = grid.length;
  const width = grid[0] ? grid[0].length : 0;
  if (width === 0 || height === 0) throw new Error("CSV 無有效大小");
  const skeleton = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    for (let x = 0; x < width; x++) {
      skeleton[y * width + x] = row[x] && row[x] > 0 ? 1 : 0;
    }
  }
  return { width, height, skeleton };
}

function findStartIdx(skeleton, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skeleton[y * width + x]) return y * width + x;
    }
  }
  return -1;
}

function findEndIdx(skeleton, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      if (skeleton[y * width + x]) return y * width + x;
    }
  }
  return -1;
}

function isConnected(skeleton, width, height, startIdx, endIdx) {
  if (startIdx === endIdx) return true;
  const visited = new Uint8Array(width * height);
  const queue = [startIdx];
  visited[startIdx] = 1;
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === endIdx) return true;
    const cx = cur % width,
      cy = Math.floor(cur / width);
    for (let k = 0; k < 8; k++) {
      const nx = cx + dx[k],
        ny = cy + dy[k];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = ny * width + nx;
      if (skeleton[ni] && !visited[ni]) {
        visited[ni] = 1;
        queue.push(ni);
      }
    }
  }
  return false;
}


// Dijkstra演算法，回傳距離陣列dist、前驅陣列prev、visited陣列
function dijkstraOnSkeleton(skeleton, width, height, startIdx) {
  const dist = new Float64Array(width * height); // <-- 修正這行
  dist.fill(Infinity);
  dist[startIdx] = 0;
  const prev = new Int32Array(width * height);
  prev.fill(-1);
  const visited = new Uint8Array(width * height);
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  const pq = [];
  pq.push({ idx: startIdx, d: 0 });
  while (pq.length) {
    // 取最小距離節點
    pq.sort((a, b) => a.d - b.d);
    const { idx: u } = pq.shift();
    if (visited[u]) continue;
    visited[u] = 1;
    const ux = u % width,
      uy = Math.floor(u / width);
    for (let k = 0; k < 8; k++) {
      const vx = ux + dx[k],
        vy = uy + dy[k];
      if (vx < 0 || vx >= width || vy < 0 || vy >= height) continue;
      const v = vy * width + vx;
      if (!skeleton[v]) continue;
      if (dist[v] > dist[u] + 1) {
        dist[v] = dist[u] + 1;
        prev[v] = u;
        pq.push({ idx: v, d: dist[v] });
      }
    }
  }
  return { dist, prev, visited };
}

// 由 prev 陣列建立有向圖（回傳邊陣列: [{from, to}]）
function buildDirectedGraphFromPrev(prev, width, height) {
  const edges = [];
  for (let v = 0; v < prev.length; v++) {
    const u = prev[v];
    if (u >= 0) {
      edges.push({ from: u, to: v });
    }
  }
  return edges;
}

// 畫出所有有向邊
function drawDirectedGraphOnCanvas(edges, width, dist) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.save();
  // 取得 gamma 值
  let gamma = 1;
  const gammaInput = document.getElementById("gamma");
  if (gammaInput) gamma = parseFloat(gammaInput.value) || 1;
  // 計算距離場最大最小值
  let dmin = Infinity, dmax = -Infinity;
  for (const { from } of edges) {
    if (dist[from] !== Infinity) {
      dmin = Math.min(dmin, dist[from]);
      dmax = Math.max(dmax, dist[from]);
    }
  }
  for (const { from, to } of edges) {
    const fx = from % width,
      fy = Math.floor(from / width);
    const tx = to % width,
      ty = Math.floor(to / width);
    // 用 from 點的距離決定顏色
    let t0 = (dist[from] - dmin) / (dmax - dmin || 1);
    t0 = Math.max(0, Math.min(1, t0));
    const t = Math.pow(t0, gamma); // gamma 調整
    // 色環：t=0為藍，t=1為紅
    const [r, g, b] = hsvToRgb((1 - t) * 240, 1, 1);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx + 0.5, fy + 0.5);
    ctx.lineTo(tx + 0.5, ty + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}


function buildAllFlowEdgesByDist(skeleton, dist, width, height) {
  const edges = [];
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!skeleton[i] || dist[i] === Infinity) continue;
      for (let k = 0; k < 8; k++) {
        const nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny * width + nx;
        if (!skeleton[ni] || dist[ni] === Infinity) continue;
        // 只要鄰居距離比自己大，就畫一條有向邊
        if (dist[ni] > dist[i]) {
          edges.push({ from: i, to: ni });
        }
      }
    }
  }
  return edges;
}


function drawDirectedGraphOnCanvas2(edges, width, color = "rgba(0,0,255,0.5)") {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (const { from, to } of edges) {
    const fx = from % width,
      fy = Math.floor(from / width);
    const tx = to % width,
      ty = Math.floor(to / width);
    ctx.beginPath();
    ctx.moveTo(fx + 0.5, fy + 0.5);
    ctx.lineTo(tx + 0.5, ty + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// Dijkstra距離場可視化
function renderDijkstraField(dist, width, height) {
  const canvas = document.getElementById("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = Math.min(800, width * 4) + "px";
  canvas.style.height = Math.min(800, height * 4) + "px";
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  let dmax = 0;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] !== Infinity) dmax = Math.max(dmax, dist[i]);
  }
  // 取得骨架陣列
  const skeleton = window._lastComputed && window._lastComputed.skeleton;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const d = dist[i];
      const off = i * 4;
      if (skeleton && skeleton[i]) {
        // 骨架像素以灰色顯示
        img.data[off] = 180; img.data[off + 1] = 180; img.data[off + 2] = 180; img.data[off + 3] = 255;
        // 疊加距離色彩（半透明）
        if (d !== Infinity) {
          const t = dmax ? d / dmax : 0;
          const [r, g, b] = hsvToRgb((1-t)*240, 1, 1);
          img.data[off] = Math.round(0.5*img.data[off] + 0.5*r);
          img.data[off+1] = Math.round(0.5*img.data[off+1] + 0.5*g);
          img.data[off+2] = Math.round(0.5*img.data[off+2] + 0.5*b);
        }
      } else {
        // 非骨架像素
        img.data[off] = 0; img.data[off + 1] = 0; img.data[off + 2] = 0; img.data[off + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  window._lastImageData = img;
}

// Dijkstra info顯示
function updateInfoDijkstra(visited, dist, width, height) {
  const foundCount = visited.reduce((s, v) => s + v, 0);
  let dmax = 0,
    dmin = Infinity;
  for (let i = 0; i < dist.length; i++) {
    if (visited[i]) {
      dmax = Math.max(dmax, dist[i]);
      dmin = Math.min(dmin, dist[i]);
    }
  }
  document.getElementById(
    "info"
  ).textContent = `Dijkstra: visited ${foundCount}, distance range: ${dmin}..${dmax}`;
}

function renderPressureField(pressure, width, height) {
  const canvas = document.getElementById("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = Math.min(800, width * 4) + "px";
  canvas.style.height = Math.min(800, height * 4) + "px";
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const p = pressure[i];
      const off = i * 4;
      if (p === 0) {
        img.data[off] = 0;
        img.data[off + 1] = 0;
        img.data[off + 2] = 0;
        img.data[off + 3] = 255;
      } else {
        const [r, g, b] = pressureToColor(p);
        img.data[off] = r;
        img.data[off + 1] = g;
        img.data[off + 2] = b;
        img.data[off + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  window._lastImageData = img;
}

function setupParticles(startIdx, width) {
  const numParticlesEl = document.getElementById("numParticles");
  const numParticlesVal = document.getElementById("numParticlesVal");
  function getNumParticles() {
    return Math.max(1, Math.min(200, parseInt(numParticlesEl.value) || 10));
  }
  numParticlesEl.addEventListener("input", () => {
    numParticlesVal.textContent = getNumParticles();
    adjustParticles();
  });
  window._particles = [];
  function adjustParticles() {
    const target = getNumParticles();
    if (!window._lastComputed) return;
    const sy = Math.floor(startIdx / width);
    const sx = startIdx % width;
    while (window._particles.length < target) {
      window._particles.push({ x: sx, y: sy, prevIdx: undefined });
    }
    if (window._particles.length > target) {
      window._particles.length = target;
    }
  }
  numParticlesVal.textContent = getNumParticles();
  if (startIdx >= 0) adjustParticles();
}

function startSimulation() {
  let animId = null;
  const speedEl = document.getElementById("speed");
  const speedVal = document.getElementById("speedVal");
  speedEl.addEventListener("input", () => {
    speedVal.textContent = parseFloat(speedEl.value).toFixed(1);
  });
  function step(t) {
    updateParticles(parseFloat(speedEl.value));
    animId = requestAnimationFrame(step);
  }
  if (!animId) animId = requestAnimationFrame(step);
}

function updateParticles(stepScale) {
  if (!window._particles || !window._lastComputed) return;
  const { width, height, dist, skeleton, startIdx } = window._lastComputed;
  for (const p of window._particles) {
    let steps = Math.max(1, Math.round(stepScale));
    while (steps-- > 0) {
      const cx = Math.round(p.x);
      const cy = Math.round(p.y);
      const ci = cy * width + cx;
      const curDist = dist[ci];
      // 收集所有距離更大的鄰居
      const candidates = [];
      let maxDist = curDist;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = cx + ox, ny = cy + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (skeleton[ni] && dist[ni] > curDist) {
            if (dist[ni] > maxDist) {
              maxDist = dist[ni];
              candidates.length = 0; // 只保留最大距離的鄰居
              candidates.push(ni);
            } else if (dist[ni] === maxDist) {
              candidates.push(ni);
            }
          }
        }
      }
      if (candidates.length > 0) {
        // 隨機選一個最大距離的鄰居
        const nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
        p.x = nextIdx % width;
        p.y = Math.floor(nextIdx / width);
      } else {
        // 已到出口，重生
        p.x = startIdx % width;
        p.y = Math.floor(startIdx / width);
        break; // 重生後本幀不再多步
      }
    }
  }
  const ctx = document.getElementById('canvas').getContext('2d');
  if (window._lastImageData) ctx.putImageData(window._lastImageData, 0, 0);
  // 重新畫全流向有向圖和起點標記
  if (window._lastComputed) {
    const { skeleton, dist, width, height, startIdx } = window._lastComputed;
    const allFlowEdges = buildAllFlowEdgesByDist(skeleton, dist, width, height);
    drawDirectedGraphOnCanvas(allFlowEdges, width, dist);
    drawStartMarker(startIdx, width);
  }
  for (const p of window._particles) drawParticle(ctx, p.x, p.y);
}


function updateInfo(
  visited,
  pressure,
  width,
  height,
  startIdx,
  endIdx,
  isConnected
) {
  const foundCount = visited.reduce((s, v) => s + v, 0);
  let pmax = 0,
    pmin = MAX_PRESSURE;
  for (let i = 0; i < pressure.length; i++) {
    if (visited[i]) {
      pmax = Math.max(pmax, pressure[i]);
      pmin = Math.min(pmin, pressure[i]);
    }
  }
  window._lastComputed.pmin = pmin;
  window._lastComputed.pmax = pmax;
  let msg = `size: ${width}×${height}, visited: ${foundCount}, pressure range: ${pmin}..${pmax}`;
  if (isConnected) {
    msg =
      `骨架圖已連通，起點(${startIdx % width},${Math.floor(
        startIdx / width
      )})到終點(${endIdx % width},${Math.floor(endIdx / width)})，` + msg;
  }
  document.getElementById("info").textContent = msg;
}

function drawStartMarker(startIdx, width) {
  if (typeof startIdx === "number" && startIdx >= 0) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const sy = Math.floor(startIdx / width);
    const sx = startIdx % width;
    const markerSize = 3;
    ctx.fillStyle = "rgba(0,255,0,1)";
    ctx.fillRect(
      Math.max(0, sx - 1),
      Math.max(0, sy - 1),
      markerSize,
      markerSize
    );
  }
}

function drawParticle(ctx, px, py) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,0,0,0.9)";
  ctx.arc(px + 0.5, py + 0.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const hh = (h / 60) % 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (hh >= 1 && hh < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (hh >= 2 && hh < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (hh >= 3 && hh < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (hh >= 4 && hh < 5) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const m = v - c;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function pressureToColor(p) {
  if (!p) return [0, 0, 0];
  let pmin = 0,
    pmax = MAX_PRESSURE;
  if (window._lastComputed && typeof window._lastComputed.pmin === "number") {
    pmin = window._lastComputed.pmin;
    pmax = window._lastComputed.pmax;
  }
  let t0 = 0;
  if (pmax > pmin) {
    t0 = (p - pmin) / (pmax - pmin);
  } else {
    t0 = p / MAX_PRESSURE;
  }
  t0 = Math.max(0, Math.min(1, t0));
  const gammaInput = document.getElementById("gamma");
  let gamma = 1;
  if (gammaInput) gamma = parseFloat(gammaInput.value) || 1;
  const t = Math.pow(t0, gamma);
  const hue = (1 - t) * 240;
  return hsvToRgb(hue, 1, 1);
}

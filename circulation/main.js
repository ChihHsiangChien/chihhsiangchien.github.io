let ctx,
  edges = [],
  nodeMap = {},
  ellipses = [],
  particles = [];

let outEdgesMap = {};  

let currentView = "circulation";
let lastView = "circulation";
let showCirculationSVG = true;


// === 參數集中管理 ===
let PARTICLE_COUNT = 2500;
const PARTICLE_RADIUS = 3;         // 血球半徑（像素）
const PARTICLE_SPEED_MIN = 0.02;   // 血球最小速度
const PARTICLE_SPEED_MAX = 0.14;   // 血球最大速度
const VESSEL_WIDTH_SCALE = 5; // 血管寬度倍率

let HEART_PERIOD = 60;      // 心臟跳動週期（幀數）越大越慢
let heartFrame = 0;         // 心臟動畫計數
const FPS = 60;             // 假設動畫每秒60幀

const DIASTOLE_RATIO = 2 / 3; // 心臟收縮舒張動畫參數

let FIRST_LEFT_VENTRICLE_ID = null;
let FIRST_RIGHT_VENTRICLE_ID = null;

const OXYGEN_PICKUP_PROB = 0.2;   // 肺動脈氧合機率
const OXYGEN_RELEASE_PROB = 0.2;  // 小動脈釋放氧機率
const COLOR_OXYGENATED = "#ff3b3b"; // 鮮紅色
const COLOR_DEOXYGENATED = "#811313ff"; // 暗紅色
const COLOR_NORMAL = "#ff3b3b"; // 原本顏色

const OXYGEN_RADIUS = PARTICLE_RADIUS * 1.5;         // 氧分子小圓半徑（單位：像素，會乘PARTICLE_RADIUS）
const OXYGEN_ANIM_DISTANCE = 20;   // 氧分子動畫進出距離（單位：像素）
const COLOR_OXYGEN = "#4fc3f7"; // 氧分子顏色

let FADE_CELLS = false;
let highlightParticles = []; // 儲存被 highlight 的 particle 索引
const HIGHLIGHT_RADIUS = 30; // 點擊半徑（像素）

// === UI 控制 ===
const cellCountInput = document.getElementById('cellCountInput');
const heartPeriodInput = document.getElementById('heartPeriodInput');
const heartPeriodLabel = document.getElementById('heartPeriodLabel');
const fadeToggleBtn = document.getElementById('fadeToggleBtn');
const toggleCirculationSVGBtn = document.getElementById('toggleCirculationSVGBtn');


const vesselCanvas = document.getElementById("vesselLayer");
const svg = document.getElementById('mainSVG');
const vesselLayer = document.getElementById('vesselLayer');
const vesselCtx = vesselCanvas.getContext("2d");
const canvas = document.getElementById("graph"); // 或 mainCanvas
ctx = canvas.getContext("2d");

function setupUI() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const newView = this.dataset.view;
      if (newView === lastView) return;

      currentView = newView;

      if (currentView === "alveolus") {
        showAlveolusView();
      } else if (currentView === "circulation") {
        showCirculationView();
        drawEdges(vesselCtx, edges, nodeMap);
      } else {
        // 其他 tab
        showCirculationView();
        ctx.clearRect(0, 0, 800, 800);
        vesselCtx.clearRect(0, 0, 800, 800);
      }

      lastView = currentView;
    });
  });
  // 預設啟用第一個 tab
  document.getElementById('tab-circulation').classList.add('active');  

  // 血球淡化按鈕
  fadeToggleBtn.addEventListener('click', function() {
    FADE_CELLS = !FADE_CELLS;
    fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');
  });
  fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');

  toggleCirculationSVGBtn.addEventListener('click', function() {
    showCirculationSVG = !showCirculationSVG;
    toggleCirculationSVGBtn.textContent =  (showCirculationSVG ? '顯示' : '隱藏')+ '心室';
    svg.style.display = (showCirculationSVG && currentView === "circulation") ? "block" : "none";
  });
  toggleCirculationSVGBtn.textContent =  (showCirculationSVG ? '顯示' : '隱藏')+ '心室';


  // 細胞數量調整
  cellCountInput.addEventListener('change', function() {
    window.setCellCount(Number(this.value));
    window.resetParticles();
  });

  // 心搏速率調整
  heartPeriodInput.addEventListener('input', function() {
    heartPeriodLabel.textContent = this.value;
    window.setHeartPeriod(Number(this.value));
  });
  // 初始化顯示
  heartPeriodLabel.textContent = heartPeriodInput.value;

  // 點擊畫面 highlight 附近血球
  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let minDist = Infinity;
    let minIdx = -1;
    for (let i = 0; i < particles.length; i++) {
      const pos = particles[i].getPos(nodeMap);
      const dx = pos.x - mx;
      const dy = pos.y - my;
      const dist = dx * dx + dy * dy;
      if (dist < HIGHLIGHT_RADIUS * HIGHLIGHT_RADIUS && dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }
    // 多選：如果有找到且還沒在 highlightParticles 裡才加入
    if (minIdx >= 0 && !highlightParticles.includes(minIdx)) {
      highlightParticles.push(minIdx);
    }
  });
}


function showAlveolusView() {
  vesselLayer.style.display = "none";
  graph.style.display = "none";
  svg.style.display = "block";
  drawAlveolusSVG();
}

function showCirculationView() {
  vesselLayer.style.display = "block";
  graph.style.display = "block";
  svg.style.display = "block"; // 讓 SVG 疊加顯示
  // drawCirculationSVG();
}

function drawCirculationSVG(phase = 0) {
  svg.innerHTML = "";

  // 收縮時縮小，舒張時放大
  let scale = 1;
  if (phase < DIASTOLE_RATIO) {
    // 收縮期：scale 0.85~1
    scale = 0.85 + 0.15 * (phase / DIASTOLE_RATIO);
  } else {
    // 舒張期：scale 1~1.1
    scale = 1 + 0.1 * ((phase - DIASTOLE_RATIO) / (1 - DIASTOLE_RATIO));
  }

  // 動態調整 rx/ry
  const baseRx = 35, baseRy = 35;
  const rx = baseRx * scale;
  const ry = baseRy * scale;

  const leftVentricle = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  leftVentricle.setAttribute("cx", 380);
  leftVentricle.setAttribute("cy", 465);
  leftVentricle.setAttribute("rx", rx);
  leftVentricle.setAttribute("ry", ry);
  leftVentricle.setAttribute("fill", "#f5f5f5");
  leftVentricle.setAttribute("stroke", "#ffababff");
  leftVentricle.setAttribute("stroke-width", "4");
  svg.appendChild(leftVentricle);

  const rightVentricle = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  rightVentricle.setAttribute("cx", 310);
  rightVentricle.setAttribute("cy", 490);
  rightVentricle.setAttribute("rx", rx);
  rightVentricle.setAttribute("ry", ry);
  rightVentricle.setAttribute("fill", "#f5f5f5");
  rightVentricle.setAttribute("stroke", "#ffababff");
  rightVentricle.setAttribute("stroke-width", "4");
  svg.appendChild(rightVentricle);

}
function drawAlveolusSVG() {
  // 清空 SVG
  svg.innerHTML = "";
  /*
  // 畫一個肺泡
  const alveolus = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  alveolus.setAttribute("cx", 400);
  alveolus.setAttribute("cy", 400);
  alveolus.setAttribute("r", 120);
  alveolus.setAttribute("fill", "#fffbe7");
  alveolus.setAttribute("stroke", "#e0b96a");
  alveolus.setAttribute("stroke-width", "6");
  svg.appendChild(alveolus);

  // 畫微血管網（紅藍交錯的細線環繞肺泡）
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * 2 * Math.PI;
    const x1 = 400 + Math.cos(angle) * 120;
    const y1 = 400 + Math.sin(angle) * 120;
    const x2 = 400 + Math.cos(angle) * 160;
    const y2 = 400 + Math.sin(angle) * 160;
    const capillary = document.createElementNS("http://www.w3.org/2000/svg", "line");
    capillary.setAttribute("x1", x1);
    capillary.setAttribute("y1", y1);
    capillary.setAttribute("x2", x2);
    capillary.setAttribute("y2", y2);
    capillary.setAttribute("stroke", i % 2 === 0 ? "#ff3b3b" : "#1976d2");
    capillary.setAttribute("stroke-width", "4");
    svg.appendChild(capillary);
  }

  */
}



// 取得所有 ellipse 節點
function getEllipses(cells) {
  return cells
    .filter((cell) => cell.getAttribute("style")?.includes("ellipse"))
    .map((cell) => {
      const id = cell.getAttribute("id");
      const geometry = cell.getElementsByTagName("mxGeometry")[0];
      const x = geometry?.getAttribute("x") ?? 0;
      const y = geometry?.getAttribute("y") ?? 0;
      const value = cell.getAttribute("value") || "";
      return { id, x: Number(x), y: Number(y), value };
    });
}

// 取得所有 edge（有向邊）
function getEdges(cells) {
  return cells
    .filter(
      (cell) =>        
        cell.getAttribute("source") &&
        cell.getAttribute("target")
    )
    .map((cell) => {
      // 從 style 解析 strokeWidth
      const style = cell.getAttribute("style") || "";
      const match = style.match(/strokeWidth=(\d+(\.\d+)?)/);
      const strokeWidth = match ? parseFloat(match[1]) : 1;
      return {
        id: cell.getAttribute("id"),
        strokeWidth,
        source: cell.getAttribute("source"),
        target: cell.getAttribute("target"),
      };
    });
}

function findFirstVentricleIds() {
  for (const node of ellipses) {
    if (!FIRST_LEFT_VENTRICLE_ID && node.value.includes("左心室")) {
      FIRST_LEFT_VENTRICLE_ID = node.id;
    }
    if (!FIRST_RIGHT_VENTRICLE_ID && node.value.includes("右心室")) {
      FIRST_RIGHT_VENTRICLE_ID = node.id;
    }
    if (FIRST_LEFT_VENTRICLE_ID && FIRST_RIGHT_VENTRICLE_ID) break;
  }
}

// 畫所有節點
function drawNodes(ctx, nodes, nodeMap) {
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
    ctx.beginPath();
    ctx.arc(node.x + 50, node.y + 50, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.id, node.x + 50, node.y + 50);
  });
}

// 畫所有邊
function drawEdges(ctx, edges, nodeMap) {
  edges.forEach((edge) => {
    const from = nodeMap[edge.source];
    const to = nodeMap[edge.target];
    const strokeWidth = edge.strokeWidth || 1;
    if (!from || !to) return;
    drawBloodVessel(ctx, from.x + 50, from.y + 50, to.x + 50, to.y + 50, strokeWidth);
  });
}

// 畫血管
function drawBloodVessel(ctx, x1, y1, x2, y2, strokeWidth) {
  const headlen = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  // isolate canvas state so styles (like lineWidth) don't leak
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#ffcaca6f";
  ctx.lineWidth = strokeWidth * VESSEL_WIDTH_SCALE || 2;
  ctx.stroke();
  ctx.restore();  
  // drawArrowHead(ctx, x2, y2, angle, headlen, "#1976d2"); // 可選擇是否畫箭頭
  
}


// 畫箭頭
function drawArrowHead(ctx, x2, y2, angle, headlen = 12, color = "#1976d2") {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headlen * Math.cos(angle - Math.PI / 7),
    y2 - headlen * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x2 - headlen * Math.cos(angle + Math.PI / 7),
    y2 - headlen * Math.sin(angle + Math.PI / 7)
  );
  ctx.lineTo(x2, y2);
  ctx.lineTo(
    x2 - headlen * Math.cos(angle - Math.PI / 7),
    y2 - headlen * Math.sin(angle - Math.PI / 7)
  );
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, particles, nodeMap) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.isDone()) continue;
    p.update();
    if (typeof p.draw === "function") {
      p.draw(ctx, nodeMap, i);
    }    
  }
}


function buildOutEdgesMap(edges) {
  outEdgesMap = {};
  edges.forEach(e => {
    if (!outEdgesMap[e.source]) outEdgesMap[e.source] = [];
    outEdgesMap[e.source].push(e);
  });
}


// --- 新增：氧氣狀態與動畫管理類別 ---
class OxygenState {
  constructor() {
    this.action = "none"; // "none" | "can_pickup" | "can_release"
    this.level = "oxygenated"; // "oxygenated" | "deoxygenated"
  }
  update(currentNode) {
    const currNodeValue = nodeMap[currentNode]?.value || "";
    // 狀態切換
    if (currNodeValue.includes("肺動脈")) {
      this.action = "can_pickup";
    } else if (currNodeValue.includes("肺靜脈")) {
      this.action = "none";
    } else if (currNodeValue.includes("小動脈")) {
      this.action = "can_release";
    } else if (currNodeValue.includes("小靜脈")) {
      this.action = "none";
    }
  }
  tryPickup() {
    if (this.action === "can_pickup" && this.level === "deoxygenated" && Math.random() < OXYGEN_PICKUP_PROB) {
      this.level = "oxygenated";
      return true;
    }
    return false;
  }
  tryRelease() {
    if (this.action === "can_release" && this.level === "oxygenated" && Math.random() < OXYGEN_RELEASE_PROB) {
      this.level = "deoxygenated";
      return true;
    }
    return false;
  }
}

class OxygenAnimation {
  constructor() {
    this.anim = null; // {type: "in"|"out", progress: 0~1, angle}
  }
  trigger(type) {
    this.anim = { type, progress: 0, angle: Math.random() * 2 * Math.PI };
  }
  update() {
    if (this.anim) {
      this.anim.progress += 0.08;
      if (this.anim.progress >= 1) {
        this.anim = null;
      }
    }
  }
  get() {
    return this.anim;
  }
}

// --- 粒子基底類別 ---
class Particle {
  constructor(startId) {
    this.currentNode = startId;
    this.nextNode = null;
    this.t = 0;
    this.speed = 0.02;
    this.chooseNext();
    this.offset = 0;
    this.pathWidth = 10;
  }
  chooseNext() {
    let outs = outEdgesMap[this.currentNode] || [];
    if (outs.length === 0) {
      this.nextNode = null;
      return;
    }
    const nextEdge = outs[Math.floor(Math.random() * outs.length)];
    this.nextNode = nextEdge.target;

    // 設定基礎速度
    const minW = 1, maxW = 5;
    const minS = PARTICLE_SPEED_MIN, maxS = PARTICLE_SPEED_MAX;
    const w = Math.max(minW, Math.min(nextEdge.strokeWidth, maxW));
    let baseSpeed = minS + ((w - minW) / (maxW - minW)) * (maxS - minS);

    // 加入亂數微調（±10%）
    const rand = 0.9 + Math.random() * 0.2;
    this.baseSpeed = baseSpeed * rand;
    this.speed = this.baseSpeed;

    this.pathWidth = nextEdge.strokeWidth * VESSEL_WIDTH_SCALE;
  }
  update() {
    // 預設只推進位置
    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
    }
  }
  isDone() {
    return !this.nextNode;
  }
  getPos(nodeMap) {
    const from = nodeMap[this.currentNode];
    const to = nodeMap[this.nextNode];
    if (!from || !to) return { x: 0, y: 0 };
    const fx = from.x + 50;
    const fy = from.y + 50;
    const tx = to.x + 50;
    const ty = to.y + 50;
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const drift = (Math.random() - 0.5) * 1.2;
    this.offset += drift;
    const halfWidth = this.pathWidth / 2;
    if (this.offset > halfWidth) this.offset = halfWidth;
    if (this.offset < -halfWidth) this.offset = -halfWidth;
    const x = fx + dx * this.t + nx * this.offset;
    const y = fy + dy * this.t + ny * this.offset;
    return { x, y };
  }
}


// --- 血球繼承自粒子基底類別 ---
class Cell extends Particle {
  constructor(startId) {
    super(startId);
    this.frameCount = 0;
    this.offsetInterval = 8;
    this.oxygenState = new OxygenState();
    this.oxygenAnim = new OxygenAnimation();
  }
  update() {
    const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;
    const heartBoost = 1 + 0.9 * Math.sin(phase * 2 * Math.PI);
    this.speed = this.baseSpeed * heartBoost;

    // 心室彈回    
    if (phase >= DIASTOLE_RATIO) {
      const currValue = nodeMap[this.currentNode]?.value || "";
      if (currValue.includes("左心室") && this.currentNode !== FIRST_LEFT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_LEFT_VENTRICLE_ID;
          this.t = 0;
        }
      }
      if (currValue.includes("右心室") && this.currentNode !== FIRST_RIGHT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_RIGHT_VENTRICLE_ID;
          this.t = 0;
        }
      }
    }
    this.oxygenAnim.update();

    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
      this.updateOxygenStateAndAnim();
    }
  }
  updateOxygenStateAndAnim() {
    this.oxygenState.update(this.currentNode);
    if (this.oxygenState.tryPickup()) {
      this.oxygenAnim.trigger("in");
    }
    if (this.oxygenState.tryRelease()) {
      this.oxygenAnim.trigger("out");
    }
  }
  draw(ctx, nodeMap, i) {
    const pos = this.getPos(nodeMap);
    ctx.save();

    // --- 血球繪製 ---
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, PARTICLE_RADIUS, 0, 2 * Math.PI);

    // 根據氧氣狀態決定顏色
    let fillColor = COLOR_NORMAL;
    if (this.oxygenState.level === "oxygenated") fillColor = COLOR_OXYGENATED;
    else if (this.oxygenState.level === "deoxygenated") fillColor = COLOR_DEOXYGENATED;

    // 淡化處理
    if (FADE_CELLS && !highlightParticles.includes(i)) {
      ctx.globalAlpha = 0.05;
    } else if (highlightParticles.includes(i)) {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#1976d2";
    }

    ctx.fillStyle = fillColor;
    ctx.fill();
    if (highlightParticles.includes(i)) ctx.stroke();

    // --- 氧分子動畫 ---
    const anim = this.oxygenAnim.get();
    if (anim) {
      ctx.save();
      ctx.globalAlpha = 1 - anim.progress;
      let r = OXYGEN_RADIUS;
      let dx = 0, dy = 0;
      const angle = anim.angle || 0;
      if (anim.type === "in") {
        dx = Math.cos(angle) * (PARTICLE_RADIUS + OXYGEN_ANIM_DISTANCE) * (1 - anim.progress);
        dy = Math.sin(angle) * (PARTICLE_RADIUS + OXYGEN_ANIM_DISTANCE) * (1 - anim.progress);
      } else {
        dx = Math.cos(angle) * (PARTICLE_RADIUS + OXYGEN_ANIM_DISTANCE) * anim.progress;
        dy = Math.sin(angle) * (PARTICLE_RADIUS + OXYGEN_ANIM_DISTANCE) * anim.progress;
      }
      ctx.beginPath();
      ctx.arc(pos.x + dx, pos.y + dy, r, 0, 2 * Math.PI);
      ctx.fillStyle = COLOR_OXYGEN;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}


// 產生粒子
function resetParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const start = randomStartId(ellipses);
    particles.push(new Cell(start));
    // 未來可加 particles.push(new Glucose(start));
  }
}


function randomStartId(ellipses) {
  return ellipses[Math.floor(Math.random() * ellipses.length)].id;
}

// 動畫主迴圈
function animate() {
  ctx.clearRect(0, 0, 800, 800);
  // drawEdges(ctx, edges, nodeMap);
  // drawNodes(ctx, ellipses, nodeMap);
  
  heartFrame = (heartFrame + 1) % HEART_PERIOD;
  const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;


  // 畫血球與心室動畫
  if (currentView === "circulation") {
    if (showCirculationSVG) {
      svg.style.display = "block";
      drawCirculationSVG(phase);
    } else {
      svg.style.display = "none";
    }
    drawParticles(ctx, particles, nodeMap);

  } else {
    svg.style.display = "none";
  }
  requestAnimationFrame(animate);
}

// 初始化
function init() {
  fetch("data.xml")
    .then((response) => response.text())
    .then((xmlString) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const mxCells = Array.from(xmlDoc.getElementsByTagName("mxCell"));

      ellipses = getEllipses(mxCells);
      edges = getEdges(mxCells);

      findFirstVentricleIds();
      /*
      document.getElementById("output").textContent =
        "Ellipses:\n" +
        JSON.stringify(ellipses, null, 2) +
        "\n\nEdges:\n" +
        JSON.stringify(edges, null, 2);
      */
      buildOutEdgesMap(edges);
      const canvas = document.getElementById("graph");
      ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 800, 800);

      nodeMap = {};
      ellipses.forEach(node => {
        nodeMap[node.id] = node;
      });      
      // drawNodes(ctx, ellipses, nodeMap);
      // drawEdges(ctx, edges, nodeMap);
      setupUI();
      // drawCirculationSVG();
      drawEdges(vesselCtx, edges, nodeMap);
      resetParticles();
      animate();

    })
    .catch((err) => {
      document.getElementById("output").textContent =
        "載入 data.xml 失敗：" + err;
    });
}

// 讓 main.js 可存取這兩個全域變數
window.setCellCount = function(val) { 
  PARTICLE_COUNT = val; 
};
window.setHeartPeriod = function(val) { 
  // bpm: 每分鐘幾次
  HEART_PERIOD = Math.round(FPS * 60 / val); // 幀數
};

// 讓 resetParticles 可被外部呼叫
window.resetParticles = resetParticles;


// 啟動
init();


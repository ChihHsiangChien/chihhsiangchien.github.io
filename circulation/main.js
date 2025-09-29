let ctx,
  edges = [],
  nodeMap = {},
  ellipses = [],
  cells = [];

let outEdgesMap = {};  
let CELL_COUNT = 2500;


// === 參數集中管理 ===
const CELL_RADIUS = 3;         // 血球半徑（像素）
const CELL_SPEED_MIN = 0.02;   // 血球最小速度
const CELL_SPEED_MAX = 0.14;   // 血球最大速度
const VESSEL_WIDTH_SCALE = 5; // 血管寬度倍率

let HEART_PERIOD = 60;      // 心臟跳動週期（幀數）越大越慢
let heartFrame = 0;            // 心臟動畫計數
const FPS = 60; // 假設動畫每秒60幀

let FIRST_LEFT_VENTRICLE_ID = null;
let FIRST_RIGHT_VENTRICLE_ID = null;

const OXYGEN_PICKUP_PROB = 0.2;   // 肺動脈氧合機率
const OXYGEN_RELEASE_PROB = 0.2;  // 小動脈釋放氧機率
const COLOR_OXYGENATED = "#ff3b3b"; // 鮮紅色
const COLOR_DEOXYGENATED = "#b71c1c"; // 暗紅色
const COLOR_NORMAL = "#ff3b3b"; // 原本顏色

const OXYGEN_RADIUS = CELL_RADIUS * 1.5;         // 氧分子小圓半徑（單位：像素，會乘CELL_RADIUS）
const OXYGEN_ANIM_DISTANCE = 20;   // 氧分子動畫進出距離（單位：像素）
const COLOR_OXYGEN = "#4fc3f7"; // 氧分子顏色

let FADE_CELLS = false;
let highlightCells = []; // 儲存被 highlight 的 cell 索引
const HIGHLIGHT_RADIUS = 30; // 點擊半徑（像素）

// === UI 控制 ===
const cellCountInput = document.getElementById('cellCountInput');
const heartPeriodInput = document.getElementById('heartPeriodInput');
const heartPeriodLabel = document.getElementById('heartPeriodLabel');
const fadeToggleBtn = document.getElementById('fadeToggleBtn');
const canvas = document.getElementById("graph");
const vesselCanvas = document.getElementById("vesselLayer");
const vesselCtx = vesselCanvas.getContext("2d");

function setupUI() {
  // 血球淡化按鈕
  fadeToggleBtn.addEventListener('click', function() {
    FADE_CELLS = !FADE_CELLS;
    fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');
  });
  fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');

  // 細胞數量調整
  cellCountInput.addEventListener('change', function() {
    window.setCellCount(Number(this.value));
    window.resetCells();
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
    for (let i = 0; i < cells.length; i++) {
      const pos = cells[i].getPos(nodeMap);
      const dx = pos.x - mx;
      const dy = pos.y - my;
      const dist = dx * dx + dy * dy;
      if (dist < HIGHLIGHT_RADIUS * HIGHLIGHT_RADIUS && dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }
    // 多選：如果有找到且還沒在 highlightCells 裡才加入
    if (minIdx >= 0 && !highlightCells.includes(minIdx)) {
      highlightCells.push(minIdx);
    }
  });
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

// 畫血球，根據新結構取得氧氣狀態與動畫
function drawCells(ctx, cells, nodeMap) {
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.isDone()) continue;
    c.update();
    const pos = c.getPos(nodeMap);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, CELL_RADIUS, 0, 2 * Math.PI);

    // 根據氧氣狀態決定顏色
    let fillColor = COLOR_NORMAL;
    if (c.oxygenState.level === "oxygenated") fillColor = COLOR_OXYGENATED;
    else if (c.oxygenState.level === "deoxygenated") fillColor = COLOR_DEOXYGENATED;

    // 淡化處理
    if (FADE_CELLS && !highlightCells.includes(i)) {
      ctx.globalAlpha = 0.05;
    } else if (highlightCells.includes(i)) {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#1976d2";
    }

    ctx.fillStyle = fillColor;
    ctx.fill();
    if (highlightCells.includes(i)) ctx.stroke();

    // --- 氧分子動畫 ---
    const anim = c.oxygenAnim.get();
    if (anim) {
      ctx.save();
      ctx.globalAlpha = 1 - anim.progress;
      let r = OXYGEN_RADIUS;
      let dx = 0, dy = 0;
      const angle = anim.angle || 0;
      if (anim.type === "in") {
        dx = Math.cos(angle) * (CELL_RADIUS + OXYGEN_ANIM_DISTANCE) * (1 - anim.progress);
        dy = Math.sin(angle) * (CELL_RADIUS + OXYGEN_ANIM_DISTANCE) * (1 - anim.progress);
      } else {
        dx = Math.cos(angle) * (CELL_RADIUS + OXYGEN_ANIM_DISTANCE) * anim.progress;
        dy = Math.sin(angle) * (CELL_RADIUS + OXYGEN_ANIM_DISTANCE) * anim.progress;
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


// cell類別（即時隨機選出口）
class Cell {
  constructor(startId) {
    this.currentNode = startId;
    this.nextNode = null;
    this.t = 0;
    //this.speed = 0.02 + Math.random() * 0.02;
    this.speed = 0.02;
    this.chooseNext();
    this.offset = 0; // 橫向偏移
    this.pathWidth = 10; // 路徑寬度
    this.frameCount = 0;      // <--- 加這行
    this.offsetInterval = 8;  // 每幾幀才更新 offset

    // --- 狀態與動畫物件 ---
    this.oxygenState = new OxygenState();
    this.oxygenAnim = new OxygenAnimation();   

  }  
  getCurrentValue() {
    return nodeMap[this.currentNode]?.value || "";
  }


  chooseNext() {
    // 找所有從 currentNode 出發的邊
    //let outs = edges.filter((e) => e.source === this.currentNode);
    let outs = outEdgesMap[this.currentNode] || [];


    if (outs.length === 0) {
      this.nextNode = null;
      return;
    }
    const nextEdge = outs[Math.floor(Math.random() * outs.length)];
    this.nextNode = nextEdge.target;

    // 設定基礎速度
    const minW = 1, maxW = 5;
    const minS = CELL_SPEED_MIN, maxS = CELL_SPEED_MAX;
    const w = Math.max(minW, Math.min(nextEdge.strokeWidth, maxW));
    let baseSpeed = minS + ((w - minW) / (maxW - minW)) * (maxS - minS);

    // 加入亂數微調（±10%）
    const rand = 0.9 + Math.random() * 0.2;
    this.baseSpeed = baseSpeed * rand;
    this.speed = this.baseSpeed;

    // === 根據血管寬度設定 pathWidth ===
    // 你可以調整這個倍率，讓抖動範圍更自然
    this.pathWidth = nextEdge.strokeWidth * VESSEL_WIDTH_SCALE; 
  }
  updateOxygenStateAndAnim() {
    // 狀態切換
    this.oxygenState.update(this.currentNode);

    // 氧化狀態改變與動畫
    if (this.oxygenState.tryPickup()) {
      this.oxygenAnim.trigger("in");
    }
    if (this.oxygenState.tryRelease()) {
      this.oxygenAnim.trigger("out");
    }
  }

  update() {
    const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;
    const heartBoost = 1 + 0.9 * Math.sin(phase * 2 * Math.PI);
    this.speed = this.baseSpeed * heartBoost;

    // --- SYSTOLE時，心室內血球有機率被彈回對應的第一個心室節點 ---
    const DIASTOLE_RATIO = 2/3;
    if (phase >= DIASTOLE_RATIO) {
      const currValue = nodeMap[this.currentNode]?.value || "";
      // 左心室
      if (currValue.includes("左心室") && this.currentNode !== FIRST_LEFT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_LEFT_VENTRICLE_ID;
          this.t = 0;
        }
      }
      // 右心室
      if (currValue.includes("右心室") && this.currentNode !== FIRST_RIGHT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_RIGHT_VENTRICLE_ID;
          this.t = 0;
        }
      }
    }
    // 推進氧分子動畫
    this.oxygenAnim.update();

    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
      this.updateOxygenStateAndAnim(); // 進入新節點時才處理狀態

    }
  }

  isDone() {
    return !this.nextNode;
  }

  getPos(nodeMap) {
    const from = nodeMap[this.currentNode];
    const to = nodeMap[this.nextNode];
    if (!from || !to) return { x: 0, y: 0 };
    // 主路徑方向
    const fx = from.x + 50;
    const fy = from.y + 50;
    const tx = to.x + 50;
    const ty = to.y + 50;
    const dx = tx - fx;
    const dy = ty - fy;
    // 單位法向量（垂直於主路徑）
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // --- 布朗運動式平滑抖動 ---
    // 每幀微調 offset，讓它在 [-pathWidth/2, pathWidth/2] 之間
    const drift = (Math.random() - 0.5) * 1.2; // 調整這個數值可改變抖動幅度
    this.offset += drift;
    // 限制 offset 不超過血管寬度
    const halfWidth = this.pathWidth / 2;
    if (this.offset > halfWidth) this.offset = halfWidth;
    if (this.offset < -halfWidth) this.offset = -halfWidth;
    // 線性插值 + 法向量偏移
    const x = fx + dx * this.t + nx * this.offset;
    const y = fy + dy * this.t + ny * this.offset;
    return { x, y };
  }
}

// 產生粒子
function resetCells() {
  cells = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const start = randomStartId(ellipses);
    cells.push(new Cell(start));
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

  // 畫血球
  drawCells(ctx, cells, nodeMap);
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
      drawEdges(vesselCtx, edges, nodeMap);
      resetCells();
      animate();

    })
    .catch((err) => {
      document.getElementById("output").textContent =
        "載入 data.xml 失敗：" + err;
    });
}

// 讓 main.js 可存取這兩個全域變數
window.setCellCount = function(val) { 
  CELL_COUNT = val; 
};
window.setHeartPeriod = function(val) { 
  // bpm: 每分鐘幾次
  HEART_PERIOD = Math.round(FPS * 60 / val); // 幀數
};

// 讓 resetCells 可被外部呼叫
window.resetCells = resetCells;


// 啟動
init();


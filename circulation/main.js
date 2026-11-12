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
const CONFIG = {
  NODE_OFFSET: 50,           // 節點座標偏移
  PARTICLE_DRIFT: 1.2,       // 血球抖動幅度
  PATH_WIDTH_DEFAULT: 10,    // 預設血管寬度
  CANVAS_SIZE: 800,          // 畫布大小
  NODE_RADIUS: 20,           // 節點圓半徑
  ARROW_HEADLEN: 12,         // 箭頭長度
  FADE_ALPHA: 0.05,          // 血球淡化透明度
  VESSEL_WIDTH_SCALE: 5,     // 血管寬度倍率
  HEART_REBOUND_PROB: 0,   // 心室彈回機率  
};

let PARTICLE_COUNT = 800;
const PARTICLE_RADIUS = 3;         // 血球半徑（像素）
const PARTICLE_SPEED_MIN = 0.02;   // 血球最小速度
const PARTICLE_SPEED_MAX = 0.14;   // 血球最大速度

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

// === 瓣膜 ===
const valves = [
  { type: "mitral", 
    from: "leftAtrium", 
    to: "leftVentricle", isOpen: false, 
    cx: 385, cy: 410 },
  { type: "tricuspid", 
    from: "rightAtrium", 
    to: "rightVentricle", isOpen: false, 
    cx: 290, cy: 460 },
  { type: "aortic", 
    from: "leftVentricle", 
    to: "aorta", isOpen: false, 
    cx: 352, cy: 400 },
  { type: "pulmonary", 
    from: "rightVentricle", 
    to: "pulmonaryArtery", isOpen: false, 
    cx: 315, cy: 400 }
];

// === 心房心室參數集中管理 ===
const ATRIAL_SYSTOLE_END = 0.2; // 心房收縮結束 phase
const BASE_ATRIA_RX = 30;
const BASE_ATRIA_RY = 30;
const BASE_LEFT_ATRIUM_CX = 387;
const BASE_LEFT_ATRIUM_CY = 370;
const BASE_RIGHT_ATRIUM_CX = 270;
const BASE_RIGHT_ATRIUM_CY = 425;

const BASE_LEFT_VENTRICLE_RX = 40;
const BASE_LEFT_VENTRICLE_RY = 40;
const BASE_RIGHT_VENTRICLE_RX = 35;
const BASE_RIGHT_VENTRICLE_RY = 35;
const BASE_LEFT_VENTRICLE_CX = 388;
const BASE_LEFT_VENTRICLE_CY = 470;
const BASE_RIGHT_VENTRICLE_CX = 310;
const BASE_RIGHT_VENTRICLE_CY = 490;


// === UI 控制 ===
const cellCountInput = document.getElementById('cellCountInput');
const heartPeriodInput = document.getElementById('heartPeriodInput');
const heartPeriodLabel = document.getElementById('heartPeriodLabel');
const fadeToggleBtn = document.getElementById('fadeToggleBtn');
const toggleCirculationSVGBtn = document.getElementById('toggleCirculationSVGBtn');
const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
const toggleTrackBtn = document.getElementById('toggleTrackBtn');
const trackStatusIndicator = document.getElementById('trackStatusIndicator');

const viewportContainer = document.getElementById("viewportContainer");
const viewportContent = document.getElementById("viewportContent");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomFitBtn = document.getElementById("zoomFitBtn");

const vesselCanvas = document.getElementById("vesselLayer");
const svg = document.getElementById('mainSVG');
const vesselLayer = document.getElementById('vesselLayer');
const vesselCtx = vesselCanvas.getContext("2d");
const canvas = document.getElementById("graph"); // 或 mainCanvas
ctx = canvas.getContext("2d");

// === 狀態控制 ===
let showLabels = true;
let isTracking = false;
let trackedParticleIdx = null;

// === Zoom & Pan 狀態與邏輯 ===
let zoom = 1;
let panX = 0;
let panY = 0;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 5.0;

function updateTransform() {
  if (!viewportContent) return;
  viewportContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  if (zoomResetBtn) {
    zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
  }
}

function zoomAt(deltaFactor, clientX, clientY) {
  if (!viewportContainer) return;
  const rect = viewportContainer.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;

  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * deltaFactor));
  if (newZoom === zoom) return;

  panX = cx - (cx - panX) * (newZoom / zoom);
  panY = cy - (cy - panY) * (newZoom / zoom);
  zoom = newZoom;
  updateTransform();
}

function resetView() {
  zoom = 1;
  panX = 0;
  panY = 0;
  updateTransform();
}

function fitView() {
  if (!viewportContainer) return;
  const rect = viewportContainer.getBoundingClientRect();
  const scaleX = rect.width / CONFIG.CANVAS_SIZE;
  const scaleY = rect.height / CONFIG.CANVAS_SIZE;
  zoom = Math.min(scaleX, scaleY) * 0.96;
  panX = (rect.width - CONFIG.CANVAS_SIZE * zoom) / 2;
  panY = (rect.height - CONFIG.CANVAS_SIZE * zoom) / 2;
  updateTransform();
}

function handleCellClick(mx, my) {
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
  if (minIdx >= 0) {
    const existingIdx = highlightParticles.indexOf(minIdx);
    if (existingIdx >= 0) {
      highlightParticles.splice(existingIdx, 1);
      if (trackedParticleIdx === minIdx) {
        trackedParticleIdx = highlightParticles.length > 0 ? highlightParticles[highlightParticles.length - 1] : null;
      }
    } else {
      highlightParticles.push(minIdx);
      if (isTracking) {
        trackedParticleIdx = minIdx;
      }
    }
  }
}

// === 鏡頭跟隨 (Camera Tracking) ===
function updateTracking() {
  if (!isTracking || currentView !== "circulation" || particles.length === 0) return;
  if (trackedParticleIdx === null || !particles[trackedParticleIdx] || particles[trackedParticleIdx].isDone()) {
    if (highlightParticles.length > 0) {
      trackedParticleIdx = highlightParticles[highlightParticles.length - 1];
    } else {
      trackedParticleIdx = Math.floor(Math.random() * particles.length);
      highlightParticles = [trackedParticleIdx];
    }
  }

  const p = particles[trackedParticleIdx];
  if (!p) return;
  const pos = p.getPos(nodeMap);
  if (!pos || (pos.x === 0 && pos.y === 0)) return;

  // 追蹤時平滑微幅放大，方便看清細部
  if (zoom < 1.45) {
    zoom += (1.55 - zoom) * 0.05;
  }

  const rect = viewportContainer.getBoundingClientRect();
  const targetPanX = (rect.width / 2) - pos.x * zoom;
  const targetPanY = (rect.height / 2) - pos.y * zoom;

  panX += (targetPanX - panX) * 0.12;
  panY += (targetPanY - panY) * 0.12;
  updateTransform();
}

function drawTrackingReticle(ctx) {
  if (!isTracking || currentView !== "circulation" || trackedParticleIdx === null) return;
  const p = particles[trackedParticleIdx];
  if (!p) return;
  const pos = p.getPos(nodeMap);
  if (!pos || (pos.x === 0 && pos.y === 0)) return;

  ctx.save();
  const t = Date.now() / 250;
  const r = 16 + 3 * Math.sin(t * 2);

  // 鎖定外圈
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
  ctx.strokeStyle = "#ff9800";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();

  // 準心刻度
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pos.x - r - 6, pos.y);
  ctx.lineTo(pos.x - r + 2, pos.y);
  ctx.moveTo(pos.x + r - 2, pos.y);
  ctx.lineTo(pos.x + r + 6, pos.y);
  ctx.moveTo(pos.x, pos.y - r - 6);
  ctx.lineTo(pos.x, pos.y - r + 2);
  ctx.moveTo(pos.x, pos.y + r - 2);
  ctx.lineTo(pos.x, pos.y + r + 6);
  ctx.strokeStyle = "#ff9800";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 狀態提示標籤
  const isOxygenated = p.oxygenState && p.oxygenState.level === "oxygenated";
  const statusText = ` ${isOxygenated ? '充氧血球 鮮紅' : '缺氧血球 暗紅'}`;
  ctx.font = "bold 12px sans-serif";
  const tw = ctx.measureText(statusText).width;
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.beginPath();
  ctx.roundRect(pos.x - tw / 2 - 8, pos.y - r - 26, tw + 16, 20, 4);
  ctx.fill();
  ctx.fillStyle = isOxygenated ? "#ff8a80" : "#80d8ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(statusText, pos.x, pos.y - r - 16);

  ctx.restore();
}

// === 解剖標籤資料與繪製 (Circulation Labels) ===
const CIRCULATION_LABELS = [
  // 肺循環
  { text: "肺部微血管", x: 550, y: 370, targetX: 550, targetY: 370, color: "#2e7d32" },
  { text: "肺動脈", x: 320, y: 380, targetX: 320, targetY: 380, color: "#1976d2" },
  { text: "肺靜脈", x: 510, y: 400, targetX: 510, targetY: 400, color: "#c62828" },
  
  // 心臟
  { text: "左心房", x: 405, y: 370, targetX: 405, targetY: 370, color: "#ad1457" },
  { text: "左心室", x: 400, y: 475, targetX: 400, targetY: 475, color: "#c62828" },
  { text: "右心房", x: 280, y: 415, targetX: 280, targetY: 415, color: "#1565c0" },
  { text: "右心室", x: 325, y: 495, targetX: 325, targetY: 495, color: "#0288d1" },

  // 大血管
  { text: "主動脈", x: 370, y: 405, targetX: 370, targetY: 405, color: "#e53935" },
  { text: "大靜脈", x: 280, y: 365, targetX: 280, targetY: 365, color: "#1565c0" },

  // 周邊微血管
  { text: "頭部與上肢微血管網", x: 460, y: 130, targetX: 430, targetY: 100, color: "#388e3c" },
  { text: "腹腔與消化器官微血管網", x: 460, y: 575, targetX: 400, targetY: 575, color: "#f57c00" },
  { text: "下肢微血管網", x: 460, y: 710, targetX: 400, targetY: 710, color: "#7b1fa2" }
];

function drawCirculationLabels(ctx) {
  if (!showLabels || currentView !== "circulation") return;
  ctx.save();
  CIRCULATION_LABELS.forEach(lbl => {
    // 指示錨點
    ctx.beginPath();
    ctx.arc(lbl.targetX, lbl.targetY, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = lbl.color;
    ctx.fill();

    // 引導線
    ctx.beginPath();
    ctx.moveTo(lbl.targetX, lbl.targetY);
    ctx.lineTo(lbl.x, lbl.y);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 標籤框
    ctx.font = "bold 11px sans-serif";
    const textWidth = ctx.measureText(lbl.text).width;
    const padX = 6;
    const h = 20;
    const w = textWidth + padX * 2;
    const rx = lbl.x - (lbl.x > lbl.targetX ? 0 : w);
    const ry = lbl.y - h / 2;

    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fill();
    ctx.strokeStyle = lbl.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl.text, rx + padX, ry + h / 2);
  });
  ctx.restore();
}

function setupZoomAndPan() {
  if (!viewportContainer) return;

  // 1. 滑鼠滾輪縮放 (以滑鼠所在處為縮放中心)
  viewportContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12);
    zoomAt(factor, e.clientX, e.clientY);
  }, { passive: false });

  // 2. 滑鼠拖曳 (Pan) 與點擊 (Click to highlight)
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let origPanX = 0;
  let origPanY = 0;
  let hasMoved = false;

  viewportContainer.addEventListener("mousedown", (e) => {
    if (e.target.closest(".zoom-controls") || e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    origPanX = panX;
    origPanY = panY;
    viewportContainer.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.hypot(dx, dy) > 4) {
      hasMoved = true;
    }
    panX = origPanX + dx;
    panY = origPanY + dy;
    updateTransform();
  });

  window.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    viewportContainer.classList.remove("is-dragging");

    if (!hasMoved) {
      const rect = viewportContainer.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        !e.target.closest(".zoom-controls")
      ) {
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const mx = (vx - panX) / zoom;
        const my = (vy - panY) / zoom;
        handleCellClick(mx, my);
      }
    }
  });

  // 3. 觸控支援 (Touch events: 支援單指拖曳平移、雙指 Pinch 縮放)
  let initialDistance = 0;
  let initialZoom = 1;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchOrigPanX = 0;
  let touchOrigPanY = 0;
  let touchMoved = false;

  viewportContainer.addEventListener("touchstart", (e) => {
    if (e.target.closest(".zoom-controls")) return;
    if (e.touches.length === 1) {
      isDragging = true;
      touchMoved = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchOrigPanX = panX;
      touchOrigPanY = panY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      touchMoved = true;
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = zoom;
    }
  }, { passive: true });

  viewportContainer.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.hypot(dx, dy) > 5) touchMoved = true;
      panX = touchOrigPanX + dx;
      panY = touchOrigPanY + dy;
      updateTransform();
      e.preventDefault();
    } else if (e.touches.length === 2 && initialDistance > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = viewportContainer.getBoundingClientRect();
      const cx = midX - rect.left;
      const cy = midY - rect.top;

      const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialZoom * (dist / initialDistance)));
      if (targetZoom !== zoom) {
        panX = cx - (cx - panX) * (targetZoom / zoom);
        panY = cy - (cy - panY) * (targetZoom / zoom);
        zoom = targetZoom;
        updateTransform();
      }
      e.preventDefault();
    }
  }, { passive: false });

  viewportContainer.addEventListener("touchend", (e) => {
    if (e.touches.length === 0) {
      if (isDragging && !touchMoved) {
        const rect = viewportContainer.getBoundingClientRect();
        const vx = touchStartX - rect.left;
        const vy = touchStartY - rect.top;
        const mx = (vx - panX) / zoom;
        const my = (vy - panY) / zoom;
        handleCellClick(mx, my);
      }
      isDragging = false;
    }
  });

  // 4. 工具列按鈕
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      const rect = viewportContainer.getBoundingClientRect();
      zoomAt(1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      const rect = viewportContainer.getBoundingClientRect();
      zoomAt(1 / 1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener("click", resetView);
  }
  if (zoomFitBtn) {
    zoomFitBtn.addEventListener("click", fitView);
  }

  // 5. 鍵盤快速鍵支援 (+, -, 0, 方向鍵)
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const rect = viewportContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (e.key === "+" || e.key === "=") {
      zoomAt(1.2, cx, cy);
    } else if (e.key === "-" || e.key === "_") {
      zoomAt(1 / 1.2, cx, cy);
    } else if (e.key === "0") {
      resetView();
    } else if (e.key === "ArrowLeft") {
      panX += 40;
      updateTransform();
    } else if (e.key === "ArrowRight") {
      panX -= 40;
      updateTransform();
    } else if (e.key === "ArrowUp") {
      panY += 40;
      updateTransform();
    } else if (e.key === "ArrowDown") {
      panY -= 40;
      updateTransform();
    }
  });
}

// === 微觀視角狀態與資料結構 ===
const alveolusState = {
  rbcs: [],
  o2Gases: [],
  exchangingParticles: [],
  inited: false,
  init() {
    this.rbcs = [];
    for (let i = 0; i < 14; i++) {
      this.rbcs.push({
        progress: i / 14,
        offset: (Math.random() - 0.5) * 18,
        size: 14 + Math.random() * 2
      });
    }
    this.o2Gases = [];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const dist = Math.random() * 160;
      this.o2Gases.push({
        x: 340 + Math.cos(angle) * dist,
        y: 400 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        baseAngle: angle,
        baseDist: dist
      });
    }
    this.exchangingParticles = [];
    this.inited = true;
  }
};

const tissueState = {
  rbcs: [],
  exchangingParticles: [],
  cells: [],
  inited: false,
  init() {
    this.rbcs = [];
    for (let i = 0; i < 14; i++) {
      this.rbcs.push({
        x: -40 + (i / 14) * 880,
        offsetY: (Math.random() - 0.5) * 18,
        size: 14 + Math.random() * 2
      });
    }
    this.cells = [];
    // 上排 6 個組織細胞
    for (let i = 0; i < 6; i++) {
      this.cells.push({
        x: 80 + i * 125,
        y: 200,
        w: 110,
        h: 90,
        nucleusX: 80 + i * 125 + (Math.random() - 0.5) * 15,
        nucleusY: 200 + (Math.random() - 0.5) * 10,
        pulse: Math.random() * Math.PI
      });
    }
    // 下排 6 個組織細胞
    for (let i = 0; i < 6; i++) {
      this.cells.push({
        x: 80 + i * 125,
        y: 600,
        w: 110,
        h: 90,
        nucleusX: 80 + i * 125 + (Math.random() - 0.5) * 15,
        nucleusY: 600 + (Math.random() - 0.5) * 10,
        pulse: Math.random() * Math.PI
      });
    }
    this.exchangingParticles = [];
    this.inited = true;
  }
};

function setupUI() {
  setupZoomAndPan();
  alveolusState.init();
  tissueState.init();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const newView = this.dataset.view;
      if (newView === lastView) return;

      currentView = newView;

      if (currentView === "alveolus") {
        showAlveolusView();
      } else if (currentView === "tissue") {
        showTissueView();
      } else {
        showCirculationView();
      }

      lastView = currentView;
    });
  });
  // 預設啟用第一個 tab
  document.getElementById('tab-circulation').classList.add('active');  

  // 標籤開關按鈕
  if (toggleLabelsBtn) {
    toggleLabelsBtn.addEventListener('click', function() {
      showLabels = !showLabels;
      this.textContent = '器官/血管標籤：' + (showLabels ? '開' : '關');
      this.classList.toggle('active', showLabels);
    });
    toggleLabelsBtn.classList.toggle('active', showLabels);
    toggleLabelsBtn.textContent = '器官/血管標籤：' + (showLabels ? '開' : '關');
  }

  // 鏡頭追蹤按鈕
  if (toggleTrackBtn) {
    toggleTrackBtn.addEventListener('click', function() {
      if (currentView !== "circulation") return;
      isTracking = !isTracking;
      this.textContent = '鏡頭追蹤：' + (isTracking ? '開' : '關');
      this.classList.toggle('active', isTracking);
      if (trackStatusIndicator) {
        trackStatusIndicator.style.display = isTracking ? 'inline-block' : 'none';
      }
      if (isTracking && highlightParticles.length === 0 && particles.length > 0) {
        trackedParticleIdx = Math.floor(Math.random() * particles.length);
        highlightParticles = [trackedParticleIdx];
      } else if (isTracking && highlightParticles.length > 0) {
        trackedParticleIdx = highlightParticles[highlightParticles.length - 1];
      }
    });
    toggleTrackBtn.classList.toggle('active', isTracking);
    toggleTrackBtn.textContent = '鏡頭追蹤：' + (isTracking ? '開' : '關');
  }

  // 血球淡化按鈕
  fadeToggleBtn.addEventListener('click', function() {
    FADE_CELLS = !FADE_CELLS;
    fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');
  });
  fadeToggleBtn.textContent = '血球淡化：' + (FADE_CELLS ? '開' : '關');

  const clearHighlightBtn = document.getElementById('clearHighlightBtn');
  clearHighlightBtn.addEventListener('click', function() {
    highlightParticles = [];
    if (isTracking) {
      isTracking = false;
      if (toggleTrackBtn) {
        toggleTrackBtn.textContent = '鏡頭追蹤：關';
        toggleTrackBtn.classList.remove('active');
      }
      if (trackStatusIndicator) {
        trackStatusIndicator.style.display = 'none';
      }
    }
  });

  toggleCirculationSVGBtn.addEventListener('click', function() {
    showCirculationSVG = !showCirculationSVG;
    toggleCirculationSVGBtn.textContent = '心房心室：' + (showCirculationSVG ? '開' : '關');
    svg.style.display = (showCirculationSVG && currentView === "circulation") ? "block" : "none";
  });
  toggleCirculationSVGBtn.textContent = '心房心室：' + (showCirculationSVG ? '開' : '關');

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
  heartPeriodLabel.textContent = heartPeriodInput.value;
}

function showCirculationView() {
  vesselLayer.style.display = "block";
  graph.style.display = "block";
  svg.style.display = showCirculationSVG ? "block" : "none";
  toggleCirculationSVGBtn.style.display = "inline-block";
  fadeToggleBtn.style.display = "inline-block";
  cellCountInput.parentElement.style.display = "inline-flex";
  if (toggleTrackBtn) toggleTrackBtn.style.display = "inline-block";
  document.getElementById("hintSelectCell").textContent = "點擊畫面可標註單一血球";
  document.getElementById("clearHighlightBtn").style.display = "inline-block";
  drawEdges(vesselCtx, edges, nodeMap);
}

function showAlveolusView() {
  vesselLayer.style.display = "none";
  svg.style.display = "none";
  graph.style.display = "block";
  toggleCirculationSVGBtn.style.display = "none";
  fadeToggleBtn.style.display = "none";
  cellCountInput.parentElement.style.display = "none";
  if (toggleTrackBtn) {
    toggleTrackBtn.style.display = "none";
    isTracking = false;
    toggleTrackBtn.classList.remove("active");
    toggleTrackBtn.textContent = '鏡頭追蹤：關';
  }
  if (trackStatusIndicator) trackStatusIndicator.style.display = "none";
  document.getElementById("hintSelectCell").textContent = "肺泡微觀視角：觀察氣體擴散與紅血球氧合（可滾輪縮放/拖曳視野）";
  document.getElementById("clearHighlightBtn").style.display = "none";
  resetView();
}

function showTissueView() {
  vesselLayer.style.display = "none";
  svg.style.display = "none";
  graph.style.display = "block";
  toggleCirculationSVGBtn.style.display = "none";
  fadeToggleBtn.style.display = "none";
  cellCountInput.parentElement.style.display = "none";
  if (toggleTrackBtn) {
    toggleTrackBtn.style.display = "none";
    isTracking = false;
    toggleTrackBtn.classList.remove("active");
    toggleTrackBtn.textContent = '鏡頭追蹤：關';
  }
  if (trackStatusIndicator) trackStatusIndicator.style.display = "none";
  document.getElementById("hintSelectCell").textContent = "組織微觀視角：觀察氧氣與養分釋放至組織細胞（可滾輪縮放/拖曳視野）";
  document.getElementById("clearHighlightBtn").style.display = "none";
  resetView();
}

// === 肺泡微觀視角繪製 (Alveolus Microscopic View) ===
function updateAndDrawAlveolusView(ctx, phase) {
  const breathPhase = (Date.now() / 2600) % 1;
  const breathScale = 1 + 0.045 * Math.sin(breathPhase * 2 * Math.PI);
  const cx = 340, cy = 400;
  const R_inner = 210 * breathScale;
  const R_outer = R_inner + 62;
  const flowSpeed = 0.0028 * (60 / HEART_PERIOD);

  // 背景
  ctx.fillStyle = "#f6f8fa";
  ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

  // 1. 微血管底層弧形通道
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, (R_inner + R_outer) / 2, -0.4, 2.5);
  ctx.strokeStyle = "rgba(255, 205, 210, 0.55)";
  ctx.lineWidth = R_outer - R_inner;
  ctx.stroke();

  // 微血管外管壁
  ctx.beginPath();
  ctx.arc(cx, cy, R_outer, -0.4, 2.5);
  ctx.strokeStyle = "#e57373";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 2. 肺泡腔囊體 (Alveolar Sac)
  ctx.beginPath();
  ctx.arc(cx, cy, R_inner, 0, 2 * Math.PI);
  ctx.fillStyle = "#fffde7";
  ctx.fill();
  ctx.strokeStyle = "#fbc02d";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 肺泡上皮細胞核示意點
  for (let a = 0; a < 2 * Math.PI; a += 0.35) {
    const ex = cx + Math.cos(a) * (R_inner - 4);
    const ey = cy + Math.sin(a) * (R_inner - 4);
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6, 3, a, 0, 2 * Math.PI);
    ctx.fillStyle = "#9575cd";
    ctx.fill();
  }

  // 3. 肺泡腔內飄散的 O2 分子
  alveolusState.o2Gases.forEach(g => {
    g.x += g.vx;
    g.y += g.vy;
    const dx = g.x - cx;
    const dy = g.y - cy;
    const d = Math.hypot(dx, dy);
    if (d > R_inner - 12) {
      g.vx *= -1;
      g.vy *= -1;
      g.x = cx + (dx / d) * (R_inner - 14);
      g.y = cy + (dy / d) * (R_inner - 14);
    }
    ctx.beginPath();
    ctx.arc(g.x, g.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#00b0ff";
    ctx.shadowColor = "#80d8ff";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // 4. 紅血球流動與氣體交換
  // 弧度路徑：從左下方 2.45 弧度流向右上 -0.3 弧度
  const startAngle = 2.45;
  const endAngle = -0.3;

  alveolusState.rbcs.forEach((rbc, idx) => {
    rbc.progress = (rbc.progress + flowSpeed) % 1;
    const angle = startAngle + (endAngle - startAngle) * rbc.progress;
    const midR = (R_inner + R_outer) / 2 + rbc.offset;
    const rx = cx + Math.cos(angle) * midR;
    const ry = cy + Math.sin(angle) * midR;

    // 氧合狀態判定
    let color;
    if (rbc.progress < 0.25) {
      color = COLOR_DEOXYGENATED; // 缺氧暗紅
    } else if (rbc.progress > 0.75) {
      color = COLOR_OXYGENATED; // 充氧鮮紅
    } else {
      // 漸變
      const t = (rbc.progress - 0.25) / 0.5;
      const rVal = Math.round(129 + (255 - 129) * t);
      const gVal = Math.round(19 + (59 - 19) * t);
      const bVal = Math.round(19 + (59 - 19) * t);
      color = `rgb(${rVal}, ${gVal}, ${bVal})`;

      // 在氣體交換區隨機生成擴散粒子
      if (Math.random() < 0.25) {
        // O2 分子從肺泡擴散進入微血管
        alveolusState.exchangingParticles.push({
          x: cx + Math.cos(angle) * (R_inner - 6),
          y: cy + Math.sin(angle) * (R_inner - 6),
          targetX: rx,
          targetY: ry,
          type: "o2",
          life: 0
        });
      }
      if (Math.random() < 0.2) {
        // CO2 分子從微血管擴散出至肺泡
        alveolusState.exchangingParticles.push({
          x: rx,
          y: ry,
          targetX: cx + Math.cos(angle) * (R_inner - 35),
          targetY: cy + Math.sin(angle) * (R_inner - 35),
          type: "co2",
          life: 0
        });
      }
    }

    // 畫紅血球 (雙凹圓盤剖面微傾角)
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, rbc.size, rbc.size * 0.65, 0, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // 5. 擴散氣體分子動畫
  for (let i = alveolusState.exchangingParticles.length - 1; i >= 0; i--) {
    const p = alveolusState.exchangingParticles[i];
    p.life += 0.05;
    if (p.life >= 1) {
      alveolusState.exchangingParticles.splice(i, 1);
      continue;
    }
    const px = p.x + (p.targetX - p.x) * p.life;
    const py = p.y + (p.targetY - p.y) * p.life;
    ctx.beginPath();
    ctx.arc(px, py, p.type === "o2" ? 3.5 : 3, 0, 2 * Math.PI);
    ctx.fillStyle = p.type === "o2" ? "#00e5ff" : "#ffeb3b";
    ctx.shadowColor = p.type === "o2" ? "#00b0ff" : "#fbc02d";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // 6. 微觀解剖標籤與圖例
  if (showLabels) {
    drawMicroAlveolusLabels(ctx, cx, cy, R_inner, R_outer);
  }
}

function drawMicroAlveolusLabels(ctx, cx, cy, R_inner, R_outer) {
  ctx.save();
  ctx.font = "bold 13px sans-serif";

  // 肺泡腔中心標題
  ctx.fillStyle = "#d84315";
  ctx.textAlign = "center";
  ctx.fillText("肺泡腔 (Alveolus)", cx, cy - 30);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("吸入富氧空氣 (PO₂ ≈ 104 mmHg)", cx, cy - 10);

  // 標籤卡片清單
  const microLabels = [
    { text: "肺動脈端 (缺氧血流入)", x: 90, y: 550, tx: 180, ty: 520, color: "#1565c0" },
    { text: "呼吸膜氣體交換區 (~0.5 μm)", x: 340, y: 720, tx: 340, ty: R_outer + 380, color: "#2e7d32" },
    { text: "肺靜脈端 (充氧血流出)", x: 620, y: 260, tx: 530, ty: 330, color: "#c62828" }
  ];

  microLabels.forEach(lbl => {
    ctx.beginPath();
    ctx.arc(lbl.tx, lbl.ty, 4, 0, 2 * Math.PI);
    ctx.fillStyle = lbl.color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(lbl.tx, lbl.ty);
    ctx.lineTo(lbl.x, lbl.y);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.45)";
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "bold 12px sans-serif";
    const tw = ctx.measureText(lbl.text).width;
    ctx.beginPath();
    ctx.roundRect(lbl.x - tw / 2 - 8, lbl.y - 12, tw + 16, 24, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();
    ctx.strokeStyle = lbl.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl.text, lbl.x, lbl.y);
  });

  // 右上圖例面板
  const lx = 600, ly = 30;
  ctx.beginPath();
  ctx.roundRect(lx, ly, 185, 115, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#222";
  ctx.textAlign = "left";
  ctx.fillText("圖例說明", lx + 12, ly + 20);

  // O2
  ctx.beginPath();
  ctx.arc(lx + 20, ly + 44, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#00b0ff";
  ctx.fill();
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#333";
  ctx.fillText("O₂ 氧氣分子 (擴散入血)", lx + 34, ly + 46);

  // CO2
  ctx.beginPath();
  ctx.arc(lx + 20, ly + 68, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#fbc02d";
  ctx.fill();
  ctx.fillText("CO₂ 二氧化碳 (擴散出肺泡)", lx + 34, ly + 70);

  // 紅血球
  ctx.beginPath();
  ctx.ellipse(lx + 20, ly + 92, 7, 5, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "#ff3b3b";
  ctx.fill();
  ctx.fillText("紅血球 (暗紅→鮮紅 結合O₂)", lx + 34, ly + 94);

  ctx.restore();
}

// === 組織微觀視角繪製 (Tissue Microscopic View) ===
function updateAndDrawTissueView(ctx, phase) {
  const flowSpeed = 1.8 * (60 / HEART_PERIOD);

  // 背景：淡藍組織液
  ctx.fillStyle = "#f0f4f9";
  ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

  // 1. 繪製上下兩排組織細胞
  tissueState.cells.forEach(cell => {
    ctx.save();
    // 細胞本體
    ctx.beginPath();
    ctx.roundRect(cell.x - cell.w / 2, cell.y - cell.h / 2, cell.w, cell.h, 16);
    ctx.fillStyle = "#ede7f6";
    ctx.fill();
    ctx.strokeStyle = "#b39ddb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 細胞核
    ctx.beginPath();
    ctx.arc(cell.nucleusX, cell.nucleusY, 14, 0, 2 * Math.PI);
    ctx.fillStyle = "#5e35b1";
    ctx.fill();

    // 粒線體/胞器動態代謝光暈
    cell.pulse += 0.05;
    ctx.beginPath();
    ctx.arc(cell.nucleusX + Math.cos(cell.pulse) * 22, cell.nucleusY + Math.sin(cell.pulse) * 16, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#7e57c2";
    ctx.fill();

    ctx.restore();
  });

  // 2. 中央貫穿微血管 (y = 355 ~ 445)
  ctx.save();
  ctx.fillStyle = "rgba(255, 235, 238, 0.75)";
  ctx.fillRect(0, 355, 800, 90);

  // 微血管壁 (上下兩條邊界線)
  ctx.beginPath();
  ctx.moveTo(0, 355);
  ctx.lineTo(800, 355);
  ctx.moveTo(0, 445);
  ctx.lineTo(800, 445);
  ctx.strokeStyle = "#ef5350";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 微血管單層內皮細胞核
  for (let x = 30; x < 800; x += 90) {
    // 上管壁內皮核
    ctx.beginPath();
    ctx.ellipse(x, 355, 12, 4, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#e57373";
    ctx.fill();
    // 下管壁內皮核
    ctx.beginPath();
    ctx.ellipse(x + 45, 445, 12, 4, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#e57373";
    ctx.fill();
  }

  // 3. 紅血球流動與物質交換
  tissueState.rbcs.forEach((rbc) => {
    rbc.x += flowSpeed;
    if (rbc.x > 840) {
      rbc.x = -40;
    }
    const ry = 400 + rbc.offsetY;

    // 顏色判定
    let color;
    if (rbc.x < 240) {
      color = COLOR_OXYGENATED; // 動脈端鮮紅
    } else if (rbc.x > 560) {
      color = COLOR_DEOXYGENATED; // 靜脈端暗紅
    } else {
      // 組織微血管交換區
      const t = (rbc.x - 240) / 320;
      const rVal = Math.round(255 - (255 - 129) * t);
      const gVal = Math.round(59 - (59 - 19) * t);
      const bVal = Math.round(59 - (59 - 19) * t);
      color = `rgb(${rVal}, ${gVal}, ${bVal})`;

      // 產生 O2 釋放粒子 (往上下細胞擴散)
      if (Math.random() < 0.22) {
        const toUp = Math.random() < 0.5;
        tissueState.exchangingParticles.push({
          x: rbc.x,
          y: ry,
          targetX: rbc.x + (Math.random() - 0.5) * 30,
          targetY: toUp ? 240 : 560,
          type: "o2",
          life: 0
        });
      }
      // 產生葡萄糖養分滲出粒子
      if (Math.random() < 0.15) {
        const toUp = Math.random() < 0.5;
        tissueState.exchangingParticles.push({
          x: rbc.x,
          y: ry,
          targetX: rbc.x + (Math.random() - 0.5) * 40,
          targetY: toUp ? 260 : 540,
          type: "glucose",
          life: 0
        });
      }
      // 產生 CO2 擴散入血粒子 (從細胞朝微血管擴散)
      if (Math.random() < 0.2) {
        const fromUp = Math.random() < 0.5;
        tissueState.exchangingParticles.push({
          x: rbc.x + (Math.random() - 0.5) * 40,
          y: fromUp ? 260 : 540,
          targetX: rbc.x,
          targetY: ry,
          type: "co2",
          life: 0
        });
      }
    }

    // 畫紅血球
    ctx.beginPath();
    ctx.ellipse(rbc.x, ry, rbc.size, rbc.size * 0.65, 0, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 4. 交換氣體與養分分子動畫
  for (let i = tissueState.exchangingParticles.length - 1; i >= 0; i--) {
    const p = tissueState.exchangingParticles[i];
    p.life += 0.045;
    if (p.life >= 1) {
      tissueState.exchangingParticles.splice(i, 1);
      continue;
    }
    const px = p.x + (p.targetX - p.x) * p.life;
    const py = p.y + (p.targetY - p.y) * p.life;
    ctx.beginPath();
    ctx.arc(px, py, p.type === "glucose" ? 3.5 : 3, 0, 2 * Math.PI);
    if (p.type === "o2") {
      ctx.fillStyle = "#00e5ff";
      ctx.shadowColor = "#00b0ff";
    } else if (p.type === "glucose") {
      ctx.fillStyle = "#66bb6a";
      ctx.shadowColor = "#43a047";
    } else {
      ctx.fillStyle = "#ffeb3b";
      ctx.shadowColor = "#fbc02d";
    }
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // 5. 微觀解剖標籤與圖例
  if (showLabels) {
    drawMicroTissueLabels(ctx);
  }
}

function drawMicroTissueLabels(ctx) {
  ctx.save();
  ctx.font = "bold 12px sans-serif";

  const labels = [
    { text: "小動脈端 (充氧血流入)", x: 100, y: 320, tx: 60, ty: 375, color: "#c62828" },
    { text: "小靜脈端 (缺氧血流出)", x: 700, y: 320, tx: 740, ty: 425, color: "#1565c0" },
    { text: "體組織細胞 (細胞呼吸利用O₂與養分)", x: 400, y: 110, tx: 400, ty: 155, color: "#4a148c" },
    { text: "微血管壁與組織液 (物質交換區)", x: 400, y: 485, tx: 400, ty: 445, color: "#2e7d32" }
  ];

  labels.forEach(lbl => {
    ctx.beginPath();
    ctx.arc(lbl.tx, lbl.ty, 4, 0, 2 * Math.PI);
    ctx.fillStyle = lbl.color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(lbl.tx, lbl.ty);
    ctx.lineTo(lbl.x, lbl.y);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.45)";
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    const tw = ctx.measureText(lbl.text).width;
    ctx.beginPath();
    ctx.roundRect(lbl.x - tw / 2 - 8, lbl.y - 12, tw + 16, 24, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();
    ctx.strokeStyle = lbl.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl.text, lbl.x, lbl.y);
  });

  // 右上圖例
  const lx = 590, ly = 25;
  ctx.beginPath();
  ctx.roundRect(lx, ly, 195, 125, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#222";
  ctx.textAlign = "left";
  ctx.fillText("組織微觀物質交換", lx + 12, ly + 20);

  // O2
  ctx.beginPath();
  ctx.arc(lx + 20, ly + 44, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#00e5ff";
  ctx.fill();
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#333";
  ctx.fillText("O₂ 氧氣 (由紅血球擴散入細胞)", lx + 34, ly + 46);

  // 養分
  ctx.beginPath();
  ctx.arc(lx + 20, ly + 68, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#43a047";
  ctx.fill();
  ctx.fillText("葡萄糖養分 (經組織液滲入)", lx + 34, ly + 70);

  // CO2
  ctx.beginPath();
  ctx.arc(lx + 20, ly + 92, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#fbc02d";
  ctx.fill();
  ctx.fillText("CO₂ 代謝物 (擴散進入微血管)", lx + 34, ly + 94);

  // 紅血球
  ctx.beginPath();
  ctx.ellipse(lx + 20, ly + 112, 7, 5, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "#8a1a1a";
  ctx.fill();
  ctx.fillText("紅血球 (鮮紅→暗紅 釋放O₂)", lx + 34, ly + 114);

  ctx.restore();
}


function drawCirculationSVG(phase = 0) {
  svg.innerHTML = "";

  // --- 心房動畫 ---
  let atrialScale = 1, atrialColor = "#ffe0e0";
  if (phase < ATRIAL_SYSTOLE_END) {
    // 心房收縮：縮小
    atrialScale = 0.85 + 0.15 * (phase / ATRIAL_SYSTOLE_END);
    atrialColor = "#ffb3b3";
  } else {
    // 心房舒張：放大
    atrialScale = 1 + 0.08 * ((phase - ATRIAL_SYSTOLE_END) / (1 - ATRIAL_SYSTOLE_END));
    atrialColor = "#ffe0e0";
  }

  // --- 心室動畫 ---
  let ventricularScale = 1, ventricularColor = "#f5f5f5";
  if (phase < ATRIAL_SYSTOLE_END) {
    // 心室尚未收縮
    ventricularScale = 1;
    ventricularColor = "#f5f5f5";
  } else if (phase < DIASTOLE_RATIO) {
    // 心室收縮：縮小
    ventricularScale = 0.85 + 0.15 * ((phase - ATRIAL_SYSTOLE_END) / (DIASTOLE_RATIO - ATRIAL_SYSTOLE_END));
    ventricularColor = "#ffb3b3";
  } else {
    // 心室舒張：放大
    ventricularScale = 1 + 0.1 * ((phase - DIASTOLE_RATIO) / (1 - DIASTOLE_RATIO));
    ventricularColor = "#ffe0e0";
  }

  // --- 畫心房（左、右） ---
  const leftAtrium = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  leftAtrium.setAttribute("cx", BASE_LEFT_ATRIUM_CX);
  leftAtrium.setAttribute("cy", BASE_LEFT_ATRIUM_CY);
  leftAtrium.setAttribute("rx", BASE_ATRIA_RX * atrialScale);
  leftAtrium.setAttribute("ry", BASE_ATRIA_RY * atrialScale);
  leftAtrium.setAttribute("fill", atrialColor);
  leftAtrium.setAttribute("stroke", "#ffb3b3");
  leftAtrium.setAttribute("stroke-width", "3");
  svg.appendChild(leftAtrium);

  const rightAtrium = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  rightAtrium.setAttribute("cx", BASE_RIGHT_ATRIUM_CX);
  rightAtrium.setAttribute("cy", BASE_RIGHT_ATRIUM_CY);
  rightAtrium.setAttribute("rx", BASE_ATRIA_RX * atrialScale);
  rightAtrium.setAttribute("ry", BASE_ATRIA_RY * atrialScale);
  rightAtrium.setAttribute("fill", atrialColor);
  rightAtrium.setAttribute("stroke", "#ffb3b3");
  rightAtrium.setAttribute("stroke-width", "3");
  svg.appendChild(rightAtrium);

  // --- 畫心室（左、右） ---
  const leftVentricle = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  leftVentricle.setAttribute("cx", BASE_LEFT_VENTRICLE_CX);
  leftVentricle.setAttribute("cy", BASE_LEFT_VENTRICLE_CY);
  leftVentricle.setAttribute("rx", BASE_LEFT_VENTRICLE_RX * ventricularScale);
  leftVentricle.setAttribute("ry", BASE_LEFT_VENTRICLE_RY * ventricularScale);
  leftVentricle.setAttribute("fill", ventricularColor);
  leftVentricle.setAttribute("stroke", "#ffb3b3");
  leftVentricle.setAttribute("stroke-width", "4");
  svg.appendChild(leftVentricle);

  const rightVentricle = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  rightVentricle.setAttribute("cx", BASE_RIGHT_VENTRICLE_CX);
  rightVentricle.setAttribute("cy", BASE_RIGHT_VENTRICLE_CY);
  rightVentricle.setAttribute("rx", BASE_RIGHT_VENTRICLE_RX * ventricularScale);
  rightVentricle.setAttribute("ry", BASE_RIGHT_VENTRICLE_RY * ventricularScale);
  rightVentricle.setAttribute("fill", ventricularColor);
  rightVentricle.setAttribute("stroke", "#ffb3b3");
  rightVentricle.setAttribute("stroke-width", "4");
  svg.appendChild(rightVentricle);

  // --- 動態設定瓣膜開關狀態 ---
  // 房室瓣（mitral, tricuspid）在心房收縮期開啟，心室收縮期關閉
  // 動脈瓣（aortic, pulmonary）在心室收縮期開啟，其他時期關閉
  valves.forEach(valve => {
    if (valve.type === "mitral" || valve.type === "tricuspid") {
      valve.isOpen = phase < ATRIAL_SYSTOLE_END;
    } else {
      valve.isOpen = (phase >= ATRIAL_SYSTOLE_END && phase < DIASTOLE_RATIO);
    }
  });

  // --- 畫瓣膜 ---
  /*
  valves.forEach(valve => {
    const valveElem = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    valveElem.setAttribute("cx", valve.cx);
    valveElem.setAttribute("cy", valve.cy);
    valveElem.setAttribute("rx", valve.isOpen ? 14 : 6);
    valveElem.setAttribute("ry", 6);
    valveElem.setAttribute("fill", valve.isOpen ? "#a5d6a7" : "#ef5350");
    valveElem.setAttribute("opacity", valve.isOpen ? "0.6" : "1");
    valveElem.setAttribute("stroke", "#333");
    valveElem.setAttribute("stroke-width", "2");
    svg.appendChild(valveElem);
  });  
  */
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
  const nodeMap = {};
  const ellipses = cells
    .filter((cell) => cell.getAttribute("style")?.includes("ellipse"))
    .map((cell) => {
      const id = cell.getAttribute("id");
      const geometry = cell.getElementsByTagName("mxGeometry")[0];
      const x = geometry?.getAttribute("x") ?? 0;
      const y = geometry?.getAttribute("y") ?? 0;
      const value = cell.getAttribute("value") || "";
      const node = { id, x: Number(x), y: Number(y), value };
      nodeMap[id] = node;
      return node;
    });
  return { ellipses, nodeMap };
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
    ctx.arc(node.x + CONFIG.NODE_OFFSET, node.y + CONFIG.NODE_OFFSET, CONFIG.NODE_RADIUS, 0, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.id, node.x + CONFIG.NODE_OFFSET, node.y + CONFIG.NODE_OFFSET);
  });
}

// 畫所有邊
function drawEdges(ctx, edges, nodeMap) {
  edges.forEach((edge) => {
    const from = nodeMap[edge.source];
    const to = nodeMap[edge.target];
    const strokeWidth = edge.strokeWidth || 1;
    if (!from || !to) return;
    drawBloodVessel(ctx, from.x + CONFIG.NODE_OFFSET, from.y + CONFIG.NODE_OFFSET, to.x + CONFIG.NODE_OFFSET, to.y + CONFIG.NODE_OFFSET, strokeWidth);
  });
}

// 畫血管
function drawBloodVessel(ctx, x1, y1, x2, y2, strokeWidth) {
  const headlen = CONFIG.ARROW_HEADLEN;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  // isolate canvas state so styles (like lineWidth) don't leak
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#ffcaca6f";
  ctx.lineWidth = strokeWidth * CONFIG.VESSEL_WIDTH_SCALE || 2; 
  ctx.stroke();
  ctx.restore();  
  // drawArrowHead(ctx, x2, y2, angle, headlen, "#1976d2"); // 可選擇是否畫箭頭
  
}


// 畫箭頭
function drawArrowHead(ctx, x2, y2, angle, headlen = CONFIG.ARROW_HEADLEN, color = "#1976d2") {
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
  // 先全部 update
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.isDone()) p.update();
  }
  // 再全部 draw
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.isDone() && typeof p.draw === "function") {
      p.draw(ctx, nodeMap, i);
    }
  }
}

function buildOutEdgesMap(edges) {
  outEdgesMap = new Map();
  edges.forEach(e => {
    if (!outEdgesMap.has(e.source)) outEdgesMap.set(e.source, []);
    outEdgesMap.get(e.source).push(e);
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
    this.pathWidth = CONFIG.PATH_WIDTH_DEFAULT;
  }
  chooseNext() {
    let outs = outEdgesMap.get(this.currentNode) || [];
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

    this.pathWidth = nextEdge.strokeWidth * CONFIG.VESSEL_WIDTH_SCALE;
;
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
    const fx = from.x + CONFIG.NODE_OFFSET;
    const fy = from.y + CONFIG.NODE_OFFSET;
    const tx = to.x + CONFIG.NODE_OFFSET;
    const ty = to.y + CONFIG.NODE_OFFSET;
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const drift = (Math.random() - 0.5) * CONFIG.PARTICLE_DRIFT;
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
        if (Math.random() < CONFIG.HEART_REBOUND_PROB) {
          this.nextNode = FIRST_LEFT_VENTRICLE_ID;
          this.t = 0;
        }
      }
      if (currValue.includes("右心室") && this.currentNode !== FIRST_RIGHT_VENTRICLE_ID) {
        if (Math.random() < CONFIG.HEART_REBOUND_PROB) {
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
      ctx.globalAlpha = CONFIG.FADE_ALPHA;
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
  ctx.clearRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
  
  heartFrame = (heartFrame + 1) % HEART_PERIOD;
  const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;

  if (currentView === "circulation") {
    // 鏡頭追蹤平滑運鏡
    updateTracking();

    // 畫心室心房動畫
    if (showCirculationSVG) {
      svg.style.display = "block";
      drawCirculationSVG(phase);
    } else {
      svg.style.display = "none";
    }

    // 畫血球粒子
    drawParticles(ctx, particles, nodeMap);

    // 畫追蹤準心光圈
    drawTrackingReticle(ctx);

    // 畫器官/血管標籤
    drawCirculationLabels(ctx);

  } else if (currentView === "alveolus") {
    svg.style.display = "none";
    updateAndDrawAlveolusView(ctx, phase);

  } else if (currentView === "tissue") {
    svg.style.display = "none";
    updateAndDrawTissueView(ctx, phase);

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

      // ellipses = getEllipses(mxCells);
      
      const result = getEllipses(mxCells);
      ellipses = result.ellipses;
      nodeMap = result.nodeMap;
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
      ctx.clearRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

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


const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");

// --- 設定 ---
canvas.width = window.innerWidth > 800 ? 800 : window.innerWidth - 20;
canvas.height = 500;

// 模擬控制參數
let simulationSpeed = 2.0; // 速度倍率
let isPaused = false;

const membraneWidth = 30; // 細胞膜視覺寬度
const spaceBetweenMembrane = 20; // 磷脂分子間距
const membraneX = canvas.width / 2; // 細胞膜 X 座標

// 分子數量設定
const counts = {
  inside: { CO2: 0, H2O: 50, O2: 0 },
  outside: { CO2: 0, H2O: 50, O2: 0 },
};

// 分子計數追蹤
let currentCounts = {
  inside: { CO2: 0, H2O: 0, O2: 0 },
  outside: { CO2: 0, H2O: 0, O2: 0 },
};

const atomRadius = { C: 6, O: 5, H: 3 };
const bondLength = 5; // 稍微誇大的鍵長，方便視覺化
const h2oAngle = 104.5 * (Math.PI / 180); // 轉為弧度

const moleculeRadiusFactor = 1.8; // 碰撞半徑因子 (基於最大原子半徑)
const maxSpeed = 1.5; // 最大初始速度

let molecules = [];

// --- 分子結構定義 ---
const moleculeStructures = {
  CO2: {
    atoms: [
      { element: "C", color: "black", x: 0, y: 0, radius: atomRadius.C },
      {
        element: "O",
        color: "red",
        x: -bondLength * 1.2,
        y: 0,
        radius: atomRadius.O,
      }, // CO2鍵長稍長
      {
        element: "O",
        color: "red",
        x: bondLength * 1.2,
        y: 0,
        radius: atomRadius.O,
      },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ], // 連接 C 到 兩個 O
    baseRadius: atomRadius.C, // 用於計算碰撞半徑
  },
  O2: {
    atoms: [
      {
        element: "O",
        color: "red",
        x: -bondLength,
        y: 0,
        radius: atomRadius.O,
      },
      { element: "O", color: "red", x: bondLength, y: 0, radius: atomRadius.O },
    ],
    bonds: [[0, 1]],
    baseRadius: atomRadius.O,
  },
  H2O: {
    atoms: [
      { element: "O", color: "red", x: 0, y: 0, radius: atomRadius.O },
      {
        element: "H",
        color: "blue",
        x: bondLength * Math.cos(h2oAngle / 2),
        y: bondLength * Math.sin(h2oAngle / 2),
        radius: atomRadius.H,
      },
      {
        element: "H",
        color: "blue",
        x: bondLength * Math.cos(h2oAngle / 2),
        y: -bondLength * Math.sin(h2oAngle / 2),
        radius: atomRadius.H,
      },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
    baseRadius: atomRadius.O,
  },
};

// --- 細胞膜結構 (簡化磷脂) ---
const phospholipid = {
  headRadius: 5,
  tailLength: 12,
  spacing: 15, // 磷脂分子間距
};

// --- 輔助函數 ---
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

// --- 分子類別 (或工廠函數) ---
function createMolecule(type, x, y) {
  const structure = moleculeStructures[type];
  if (!structure) {
    console.error("Unknown molecule type:", type);
    return null;
  }

  // 計算一個大致的碰撞半徑 (基於原子最遠距離)
  let maxDistSq = 0;
  structure.atoms.forEach((atom) => {
    const distSq = atom.x * atom.x + atom.y * atom.y;
    if (distSq > maxDistSq) maxDistSq = distSq;
  });
  const structureRadius = Math.sqrt(maxDistSq) + structure.baseRadius;

  return {
    x: x,
    y: y,
    vx: getRandom(-maxSpeed, maxSpeed),
    vy: getRandom(-maxSpeed, maxSpeed),
    type: type,
    structure: structure,
    radius: structureRadius * 1.1, // 碰撞半徑再放大一點點
    rotation: getRandom(0, Math.PI * 2), // 初始隨機角度
    angularVelocity: getRandom(-0.02, 0.02), // 隨機旋轉速度
  };
}

// --- 繪製函數 ---
function drawMolecule(molecule) {
  ctx.save(); // 保存當前繪圖狀態 (包括變換)
  ctx.translate(molecule.x, molecule.y); // 移動坐標系原點到分子中心
  ctx.rotate(molecule.rotation); // 旋轉坐標系

  const structure = molecule.structure;

  // 繪製化學鍵
  ctx.strokeStyle = "#666"; // 灰色鍵
  ctx.lineWidth = 1;
  structure.bonds.forEach((bondIndices) => {
    const atom1 = structure.atoms[bondIndices[0]];
    const atom2 = structure.atoms[bondIndices[1]];
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  });

  // 繪製原子
  structure.atoms.forEach((atom) => {
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, atom.radius, 0, Math.PI * 2);
    ctx.fillStyle = atom.color;
    ctx.fill();
    // 可選：加上原子邊框
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  ctx.restore(); // 恢復之前的繪圖狀態
}

function drawMembrane() {
  const numPhospholipids = Math.floor(canvas.height / phospholipid.spacing);
  const startY = (canvas.height - numPhospholipids * phospholipid.spacing) / 2;

  // 繪製細胞內側 (背景)
  ctx.fillStyle = "#fffacd"; // 淡黃色代表細胞內
  ctx.fillRect(
    0,
    0,
    membraneX - membraneWidth / 2 - spaceBetweenMembrane / 2,
    canvas.height
  );

  // 繪製膜結構
  for (let i = 0; i < numPhospholipids; i++) {
    const y = startY + i * phospholipid.spacing + phospholipid.spacing / 2;

    // 外層磷脂
    ctx.strokeStyle = "darkgrey"; // 尾巴
    ctx.lineWidth = 1;
    ctx.beginPath();

    // 繪製水平排列尾巴
    ctx.moveTo(
      membraneX + membraneWidth / 4 + spaceBetweenMembrane / 2,
      y - phospholipid.headRadius / 3
    );
    ctx.lineTo(
      membraneX +
        membraneWidth / 4 +
        spaceBetweenMembrane / 2 -
        phospholipid.tailLength,
      y - phospholipid.headRadius / 3
    );
    ctx.moveTo(
      membraneX + membraneWidth / 4 + spaceBetweenMembrane / 2,
      y + phospholipid.headRadius / 3
    );
    ctx.lineTo(
      membraneX +
        membraneWidth / 4 +
        spaceBetweenMembrane / 2 -
        phospholipid.tailLength,
      y + phospholipid.headRadius / 3
    );
    ctx.stroke();

    // 頭部
    ctx.fillStyle = "grey";
    ctx.beginPath();
    ctx.arc(
      membraneX + membraneWidth / 4 + spaceBetweenMembrane / 2,
      y,
      phospholipid.headRadius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // 內層磷脂
    ctx.strokeStyle = "darkgrey"; // 尾巴
    ctx.lineWidth = 1;
    ctx.beginPath();

    // 繪製水平排列尾巴
    ctx.moveTo(
      membraneX - membraneWidth / 4 - spaceBetweenMembrane / 2,
      y - phospholipid.headRadius / 3
    );
    ctx.lineTo(
      membraneX -
        membraneWidth / 4 -
        spaceBetweenMembrane / 2 +
        phospholipid.tailLength,
      y - phospholipid.headRadius / 3
    );
    ctx.moveTo(
      membraneX - membraneWidth / 4 - spaceBetweenMembrane / 2,
      y + phospholipid.headRadius / 3
    );
    ctx.lineTo(
      membraneX -
        membraneWidth / 4 -
        spaceBetweenMembrane / 2 +
        phospholipid.tailLength,
      y + phospholipid.headRadius / 3
    );
    ctx.stroke();

    // 頭部
    ctx.fillStyle = "grey";
    ctx.beginPath();
    ctx.arc(
      membraneX - membraneWidth / 4 - spaceBetweenMembrane / 2,
      y,
      phospholipid.headRadius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
  }
}

// 繪製UI控件
function drawUI() {
  // 繪製分子計數
  ctx.font = "14px Arial";
  ctx.fillStyle = "black";

  // 細胞內部分子計數
  ctx.textAlign = "left";
  ctx.fillText("細胞內:", 10, 20);
  ctx.fillText(`CO₂: ${currentCounts.inside.CO2}`, 10, 40);
  ctx.fillText(`H₂O: ${currentCounts.inside.H2O}`, 10, 60);
  ctx.fillText(`O₂: ${currentCounts.inside.O2}`, 10, 80);

  // 細胞外部分子計數
  ctx.textAlign = "right";
  ctx.fillText("細胞外:", canvas.width - 10, 20);
  ctx.fillText(`CO₂: ${currentCounts.outside.CO2}`, canvas.width - 10, 40);
  ctx.fillText(`H₂O: ${currentCounts.outside.H2O}`, canvas.width - 10, 60);
  ctx.fillText(`O₂: ${currentCounts.outside.O2}`, canvas.width - 10, 80);

  // 模擬速度顯示
  ctx.textAlign = "center";
  ctx.fillText(
    `模擬速度: ${simulationSpeed.toFixed(1)}x`,
    canvas.width / 2,
    20
  );

  // 暫停狀態指示
  if (isPaused) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
    ctx.fillText("已暫停", canvas.width / 2, 40);
  }
}

// --- 計算當前分子數量 ---
function updateMoleculeCounts() {
  // 重置計數
  for (const type in currentCounts.inside) {
    currentCounts.inside[type] = 0;
    currentCounts.outside[type] = 0;
  }

  // 計算每種分子在細胞內外的數量
  molecules.forEach((m) => {
    const location =
      m.x < membraneX - membraneWidth / 2 - spaceBetweenMembrane / 2
        ? "inside"
        : "outside";
    currentCounts[location][m.type]++;
  });
}

// --- 更新與碰撞檢測 ---
function update() {
  if (isPaused) return;

  molecules.forEach((m) => {
    // 更新位置 (考慮模擬速度)
    m.x += m.vx * simulationSpeed;
    m.y += m.vy * simulationSpeed;
    m.rotation += m.angularVelocity * simulationSpeed; // 更新角度

    // 邊界碰撞檢測
    if (m.x - m.radius < 0) {
      m.x = m.radius;
      m.vx *= -1;
    } else if (m.x + m.radius > canvas.width) {
      m.x = canvas.width - m.radius;
      m.vx *= -1;
    }
    if (m.y - m.radius < 0) {
      m.y = m.radius;
      m.vy *= -1;
    } else if (m.y + m.radius > canvas.height) {
      m.y = canvas.height - m.radius;
      m.vy *= -1;
    }

    // 細胞膜碰撞檢測 (將膜視為不可穿透的牆)
    /*
    const membraneLeftEdge = membraneX - membraneWidth / 2;
    const membraneRightEdge = membraneX + membraneWidth / 2;

    // 從左側接近膜
    if (m.x + m.radius > membraneLeftEdge && m.x < membraneX && m.vx > 0) {
      m.x = membraneLeftEdge - m.radius;
      m.vx *= -1;
    }
    // 從右側接近膜
    else if (
      m.x - m.radius < membraneRightEdge &&
      m.x > membraneX &&
      m.vx < 0
    ) {
      m.x = membraneRightEdge + m.radius;
      m.vx *= -1;
    }
      */
  });

  // 分子間碰撞檢測
  for (let i = 0; i < molecules.length; i++) {
    for (let j = i + 1; j < molecules.length; j++) {
      const m1 = molecules[i];
      const m2 = molecules[j];

      const dx = m2.x - m1.x;
      const dy = m2.y - m1.y;
      const distanceSq = dx * dx + dy * dy;
      const combinedRadius = m1.radius + m2.radius;

      if (distanceSq < combinedRadius * combinedRadius) {
        // 碰撞發生
        const distance = Math.sqrt(distanceSq);
        const overlap = combinedRadius - distance;

        // 將分子分開以避免卡住
        const adjustX = (dx / distance) * overlap * 0.5;
        const adjustY = (dy / distance) * overlap * 0.5;
        m1.x -= adjustX;
        m1.y -= adjustY;
        m2.x += adjustX;
        m2.y += adjustY;

        // 簡化的彈性碰撞反應
        const nx = dx / distance;
        const ny = dy / distance;

        // 計算相對速度
        const dvx = m1.vx - m2.vx;
        const dvy = m1.vy - m2.vy;

        // 計算相對速度在法線方向上的投影 (點積)
        const dotProduct = dvx * nx + dvy * ny;

        // 如果分子正在靠近才進行速度交換
        if (dotProduct < 0) {
          const impulse = (2 * dotProduct) / 2; // 假設質量為1
          m1.vx -= impulse * nx;
          m1.vy -= impulse * ny;
          m2.vx += impulse * nx;
          m2.vy += impulse * ny;

          // 碰撞也可能影響旋轉，稍微增加一點隨機性
          //m1.angularVelocity += getRandom(-0.01, 0.01) * simulationSpeed;
          //m2.angularVelocity += getRandom(-0.01, 0.01) * simulationSpeed;
        }
      }
    }
  }

  // 更新分子計數
  updateMoleculeCounts();
}

// --- 創建控制面板 ---
function createControlPanel() {
  const controlPanel = document.createElement("div");
  controlPanel.style.marginTop = "10px";
  controlPanel.style.padding = "10px";
  controlPanel.style.borderTop = "1px solid #ccc";

  // 速度控制
  const speedControl = document.createElement("div");
  speedControl.style.marginBottom = "15px";

  const speedLabel = document.createElement("label");
  speedLabel.textContent = "模擬速度: ";
  speedLabel.style.marginRight = "10px";

  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.min = "0.1";
  speedSlider.max = "3.0";
  speedSlider.step = "0.1";
  speedSlider.value = simulationSpeed;
  speedSlider.style.width = "150px";
  speedSlider.style.verticalAlign = "middle";

  const speedValue = document.createElement("span");
  speedValue.textContent = `${simulationSpeed.toFixed(1)}x`;
  speedValue.style.marginLeft = "10px";

  speedSlider.addEventListener("input", () => {
    simulationSpeed = parseFloat(speedSlider.value);
    speedValue.textContent = `${simulationSpeed.toFixed(1)}x`;
  });

  speedControl.appendChild(speedLabel);
  speedControl.appendChild(speedSlider);
  speedControl.appendChild(speedValue);

  // 暫停/繼續按鈕
  const pauseButton = document.createElement("button");
  pauseButton.textContent = "暫停";
  pauseButton.style.marginRight = "10px";
  pauseButton.style.padding = "5px 15px";

  pauseButton.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "繼續" : "暫停";
  });

  // 重置按鈕
  const resetButton = document.createElement("button");
  resetButton.textContent = "重置";
  resetButton.style.padding = "5px 15px";
  resetButton.style.marginRight = "10px";

  resetButton.addEventListener("click", () => {
    init();
    isPaused = false;
    pauseButton.textContent = "暫停";
  });

  // 分子設定控制
  const moleculeSettingsDiv = document.createElement("div");
  moleculeSettingsDiv.style.marginTop = "15px";
  moleculeSettingsDiv.style.display = "grid";
  moleculeSettingsDiv.style.gridTemplateColumns = "auto auto auto auto";
  moleculeSettingsDiv.style.gap = "5px";
  moleculeSettingsDiv.style.alignItems = "center";

  // 標題列
  const locationHeader = document.createElement("div");
  locationHeader.textContent = "";

  const co2Header = document.createElement("div");
  co2Header.textContent = "CO₂";
  co2Header.style.fontWeight = "bold";

  const h2oHeader = document.createElement("div");
  h2oHeader.textContent = "H₂O";
  h2oHeader.style.fontWeight = "bold";

  const o2Header = document.createElement("div");
  o2Header.textContent = "O₂";
  o2Header.style.fontWeight = "bold";

  moleculeSettingsDiv.appendChild(locationHeader);
  moleculeSettingsDiv.appendChild(co2Header);
  moleculeSettingsDiv.appendChild(h2oHeader);
  moleculeSettingsDiv.appendChild(o2Header);

  // 細胞內設定
  const insideLabel = document.createElement("div");
  insideLabel.textContent = "細胞內:";
  insideLabel.style.fontWeight = "bold";

  const insideCO2Input = document.createElement("input");
  insideCO2Input.type = "number";
  insideCO2Input.min = "0";
  insideCO2Input.max = "20";
  insideCO2Input.value = counts.inside.CO2;
  insideCO2Input.style.width = "50px";

  const insideH2OInput = document.createElement("input");
  insideH2OInput.type = "number";
  insideH2OInput.min = "0";
  insideH2OInput.max = "20";
  insideH2OInput.value = counts.inside.H2O;
  insideH2OInput.style.width = "50px";

  const insideO2Input = document.createElement("input");
  insideO2Input.type = "number";
  insideO2Input.min = "0";
  insideO2Input.max = "20";
  insideO2Input.value = counts.inside.O2;
  insideO2Input.style.width = "50px";

  moleculeSettingsDiv.appendChild(insideLabel);
  moleculeSettingsDiv.appendChild(insideCO2Input);
  moleculeSettingsDiv.appendChild(insideH2OInput);
  moleculeSettingsDiv.appendChild(insideO2Input);

  // 細胞外設定
  const outsideLabel = document.createElement("div");
  outsideLabel.textContent = "細胞外:";
  outsideLabel.style.fontWeight = "bold";

  const outsideCO2Input = document.createElement("input");
  outsideCO2Input.type = "number";
  outsideCO2Input.min = "0";
  outsideCO2Input.max = "20";
  outsideCO2Input.value = counts.outside.CO2;
  outsideCO2Input.style.width = "50px";

  const outsideH2OInput = document.createElement("input");
  outsideH2OInput.type = "number";
  outsideH2OInput.min = "0";
  outsideH2OInput.max = "20";
  outsideH2OInput.value = counts.outside.H2O;
  outsideH2OInput.style.width = "50px";

  const outsideO2Input = document.createElement("input");
  outsideO2Input.type = "number";
  outsideO2Input.min = "0";
  outsideO2Input.max = "20";
  outsideO2Input.value = counts.outside.O2;
  outsideO2Input.style.width = "50px";

  moleculeSettingsDiv.appendChild(outsideLabel);
  moleculeSettingsDiv.appendChild(outsideCO2Input);
  moleculeSettingsDiv.appendChild(outsideH2OInput);
  moleculeSettingsDiv.appendChild(outsideO2Input);

  // 更新分子數量按鈕
  const updateButton = document.createElement("button");
  updateButton.textContent = "更新分子數量";
  updateButton.style.padding = "5px 15px";
  updateButton.style.marginTop = "10px";
  updateButton.style.gridColumn = "1 / span 4";

  updateButton.addEventListener("click", () => {
    counts.inside.CO2 = parseInt(insideCO2Input.value) || 0;
    counts.inside.H2O = parseInt(insideH2OInput.value) || 0;
    counts.inside.O2 = parseInt(insideO2Input.value) || 0;

    counts.outside.CO2 = parseInt(outsideCO2Input.value) || 0;
    counts.outside.H2O = parseInt(outsideH2OInput.value) || 0;
    counts.outside.O2 = parseInt(outsideO2Input.value) || 0;

    init();
  });

  moleculeSettingsDiv.appendChild(updateButton);

  // 添加所有控制項到控制面板
  controlPanel.appendChild(speedControl);
  controlPanel.appendChild(pauseButton);
  controlPanel.appendChild(resetButton);
  controlPanel.appendChild(moleculeSettingsDiv);

  // 將控制面板添加到 canvas 下方
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.maxWidth = `${canvas.width}px`;
  container.style.margin = "0 auto";

  // 取得 canvas 的父元素
  const canvasParent = canvas.parentElement;
  canvasParent.insertBefore(container, canvas);
  container.appendChild(canvas);
  container.appendChild(controlPanel);

  return {
    speedControl: speedSlider,
    pauseButton,
    resetButton,
    insideCO2Input,
    insideH2OInput,
    insideO2Input,
    outsideCO2Input,
    outsideH2OInput,
    outsideO2Input,
    updateButton,
  };
}

// --- 觸控和滑鼠事件處理 ---
function setupInteractions() {
  // 追蹤滑鼠/觸摸位置
  let isDragging = false;
  let draggedMolecule = null;

  // 獲取相對於 canvas 的坐標
  function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    // 處理滑鼠事件
    if (event.clientX) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    // 處理觸控事件
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return null;
  }

  // 找到點擊/觸摸的分子
  function findTouchedMolecule(x, y) {
    for (let i = molecules.length - 1; i >= 0; i--) {
      const m = molecules[i];
      const dx = m.x - x;
      const dy = m.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= m.radius * m.radius) {
        return m;
      }
    }
    return null;
  }

  // 滑鼠事件
  canvas.addEventListener("mousedown", (event) => {
    const coords = getCanvasCoordinates(event);
    if (!coords) return;

    draggedMolecule = findTouchedMolecule(coords.x, coords.y);
    if (draggedMolecule) {
      isDragging = true;
      // 暫停分子移動
      draggedMolecule.oldVx = draggedMolecule.vx;
      draggedMolecule.oldVy = draggedMolecule.vy;
      draggedMolecule.vx = 0;
      draggedMolecule.vy = 0;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!isDragging || !draggedMolecule) return;

    const coords = getCanvasCoordinates(event);
    if (!coords) return;

    // 更新拖曳分子的位置
    draggedMolecule.x = coords.x;
    draggedMolecule.y = coords.y;
  });

  canvas.addEventListener("mouseup", () => {
    if (draggedMolecule) {
      // 恢復分子移動，給予隨機速度
      draggedMolecule.vx = getRandom(-maxSpeed, maxSpeed);
      draggedMolecule.vy = getRandom(-maxSpeed, maxSpeed);
      draggedMolecule = null;
    }
    isDragging = false;
  });

  canvas.addEventListener("mouseleave", () => {
    if (draggedMolecule) {
      // 恢復分子移動
      draggedMolecule.vx = getRandom(-maxSpeed, maxSpeed);
      draggedMolecule.vy = getRandom(-maxSpeed, maxSpeed);
      draggedMolecule = null;
    }
    isDragging = false;
  });

  // 觸控事件
  canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault(); // 防止觸發滑鼠事件
      const coords = getCanvasCoordinates(event);
      if (!coords) return;

      draggedMolecule = findTouchedMolecule(coords.x, coords.y);
      if (draggedMolecule) {
        isDragging = true;
        // 暫停分子移動
        draggedMolecule.oldVx = draggedMolecule.vx;
        draggedMolecule.oldVy = draggedMolecule.vy;
        draggedMolecule.vx = 0;
        draggedMolecule.vy = 0;
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault(); // 防止畫面滾動
      if (!isDragging || !draggedMolecule) return;

      const coords = getCanvasCoordinates(event);
      if (!coords) return;

      // 更新拖曳分子的位置
      // 更新拖曳分子的位置
      draggedMolecule.x = coords.x;
      draggedMolecule.y = coords.y;
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchend",
    (event) => {
      event.preventDefault();
      if (draggedMolecule) {
        // 恢復分子移動，給予隨機速度
        draggedMolecule.vx = getRandom(-maxSpeed, maxSpeed);
        draggedMolecule.vy = getRandom(-maxSpeed, maxSpeed);
        draggedMolecule = null;
      }
      isDragging = false;
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchcancel",
    (event) => {
      event.preventDefault();
      if (draggedMolecule) {
        // 恢復分子移動
        draggedMolecule.vx = getRandom(-maxSpeed, maxSpeed);
        draggedMolecule.vy = getRandom(-maxSpeed, maxSpeed);
        draggedMolecule = null;
      }
      isDragging = false;
    },
    { passive: false }
  );
}

// --- 初始化模擬 ---
function init() {
  molecules = [];

  // 在細胞內創建分子
  for (const type in counts.inside) {
    for (let i = 0; i < counts.inside[type]; i++) {
      // 隨機位置在細胞內側
      const x = getRandom(
        atomRadius.O * 2,
        membraneX -
          membraneWidth / 2 -
          atomRadius.O * 2 -
          spaceBetweenMembrane / 2
      );
      const y = getRandom(atomRadius.O * 2, canvas.height - atomRadius.O * 2);

      const molecule = createMolecule(type, x, y);
      if (molecule) molecules.push(molecule);
    }
  }

  // 在細胞外創建分子
  for (const type in counts.outside) {
    for (let i = 0; i < counts.outside[type]; i++) {
      // 隨機位置在細胞外側
      const x = getRandom(
        membraneX +
          membraneWidth / 2 +
          atomRadius.O * 2 +
          spaceBetweenMembrane / 2,
        canvas.width - atomRadius.O * 2
      );
      const y = getRandom(atomRadius.O * 2, canvas.height - atomRadius.O * 2);

      const molecule = createMolecule(type, x, y);
      if (molecule) molecules.push(molecule);
    }
  }

  // 更新分子計數
  updateMoleculeCounts();
}

// --- 主模擬循環 ---
function simulate() {
  // 清除畫布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 繪製膜
  drawMembrane();

  // 更新分子位置和處理碰撞
  update();

  // 繪製所有分子
  molecules.forEach(drawMolecule);

  // 繪製UI
  drawUI();

  // 繼續模擬
  requestAnimationFrame(simulate);
}

// --- 啟動模擬 ---
init();
createControlPanel();
setupInteractions();
simulate();

// --- 視窗調整大小處理 ---
window.addEventListener("resize", () => {
  // 調整畫布大小
  canvas.width = window.innerWidth > 800 ? 800 : window.innerWidth - 20;
  // 重新計算膜位置
  membraneX = canvas.width / 2;
  // 重新初始化模擬
  init();
});

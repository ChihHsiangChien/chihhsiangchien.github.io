// --- 反應規則外部化 ---
import { reactions } from "./enzyme-reactions.js";

let chart = null;
let chartData = {
  labels: [],
  datasets: []
};
let chartPaused = false;


const canvas = document.getElementById("canvas");
const tempSlider = document.getElementById("temp-slider");
const tempValue = document.getElementById("temp-value");
let brownianSwitch = document.getElementById("brownian-switch");
const toolbox = document.getElementById("toolbox");
let pendingToolboxItem = null;


const ENZYME_BROWNIAN_SPEED_RATIO = 0.03;

// 活化位判斷半徑（像素）
const ACTIVATION_SITE_RADIUS = 35;

// 多活化位支援
let activationSites = [];
let enzymes = [];
let molecules = [];
let dragging = null;
let offsetX = 0,
  offsetY = 0;
let dragType = null; // 'enzyme' or 'substrate'
let dragIndex = -1;



// --- 空間分割法（Grid） ---
const GRID_SIZE = 80; // 每格 80px，可依需求調整
let grid = {};


let autoDetectBatchIndex = 0;
const AUTO_DETECT_BATCH = 4; // 分成4批更新碰撞

let enzymeCount = {};
let moleculeCount = {};

function getGridKey(x, y) {
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  return `${gx},${gy}`;
}

function buildGrid() {
  grid = {};
  molecules.forEach((m, idx) => {
    const key = getGridKey(m.x, m.y);
    if (!grid[key]) grid[key] = { molecules: [], enzymes: [] };
    grid[key].molecules.push(idx);
  });
  enzymes.forEach((e, idx) => {
    const key = getGridKey(e.x, e.y);
    if (!grid[key]) grid[key] = { molecules: [], enzymes: [] };
    grid[key].enzymes.push(idx);
  });
}

function getNeighborKeys(x, y) {
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  const keys = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      keys.push(`${gx + dx},${gy + dy}`);
    }
  }
  return keys;
}

// --- 類別設計 ---
class Enzyme {
  constructor(type, x, y, angle, denatureTemp = 50) {
    this.type = type; // 例如 'synthesisA', 'synthesisB', 'decompositionA' ...
    this.x = x;
    this.y = y;
    this.denatureTemp = denatureTemp;
    this.denatured = false;
    this.angle = angle;
    this.el = document.createElement("img");
    this.el.src = this.getIconSrc();
    this.el.className = "draggable enzyme";
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
    this.el.style.zIndex = 2;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    canvas.appendChild(this.el);
    // 活化位
    this.activation = document.createElement("div");
    this.activation.className = "activation-site";
    /*
		this.activation.style.left = x + 'px';
		this.activation.style.top = y + 'px';
		*/
    canvas.appendChild(this.activation);
    // 暫存已吸附的分子（for 多受質合成）
    this.boundMolecules = [];
    this.updateActivationPosition();
    // 布朗運動參數
    this.vx = 0;
    this.vy = 0;
    this.brownianTimer = null;
    this.brownianActive = true;
    this.randomizeVelocity();
  }
  getIconSrc() {
    // 從 reactions array 取得對應 type 的 active icon
    const rule = reactions.find((r) => r.type === this.type);
    if (rule && rule.enzymeActiveIcon) return rule.enzymeActiveIcon;
    return "enzyme_A_active.svg";
  }
  // 檢查溫度，超過即變性（不可逆）
  /*
  checkDenature(temp) {
    if (!this.denatured && temp >= this.denatureTemp) {
      this.denatured = true;
      this.el.src = this.getDenaturedIconSrc();
      if (this.activation) {
        this.activation.remove();
        this.activation = null;
      }
    }
  }
  */
  checkDenature(temp) {
    if (!this.denatured && temp >= this.denatureTemp) {
      this.denatured = true;
      this.el.src = this.getDenaturedIconSrc();
      // 釋放所有已結合的受質
      if (this.boundMolecules && this.boundMolecules.length > 0) {
        this.boundMolecules.forEach(m => {
          // 讓分子恢復可互動與布朗運動
          if (m.el) {
            m.el.style.pointerEvents = "auto";
            m.el.style.filter = "";         // 解除highlight
            m.startBrownian && m.startBrownian();
          }
        });
        this.boundMolecules = [];
      }
      this.el.style.filter = "";

      if (this.activation) {
        this.activation.remove();
        this.activation = null;
      }
    }
  } 

  getDenaturedIconSrc() {
    // 從 reactions array 取得對應 type 的 denatured icon
    const rule = reactions.find((r) => r.type === this.type);
    if (rule && rule.enzymeDenaturedIcon) return rule.enzymeDenaturedIcon;
    return "enzyme_denatured.svg";
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";

    if (this.activation) {
      this.activation.style.left = x + "px";
      this.activation.style.top = y + "px";
      // 若有 updateActivationPosition 方法則呼叫，否則 fallback
      if (typeof this.updateActivationPosition === "function") {
        this.updateActivationPosition();
      } else {
        this.activation.style.left = x + "px";
        this.activation.style.top = y + "px";
      }
    }
    // 移動已結合的受質分子
    if (this.boundMolecules && this.boundMolecules.length > 0) {
      // 以酵素中心為基準
      const centerX = this.x + (this.el.width || 40) / 2;
      const centerY = this.y + (this.el.height || 40) / 2;
      this.boundMolecules.forEach((m, i) => {
        // 多受質時可稍微錯開
        const offset = 10 * i - (10 * (this.boundMolecules.length - 1)) / 2;
        m.updatePosition(
          centerX + offset - (m.el.width || 40) / 2,
          centerY - (m.el.height || 40) / 2
        );
      });
    }
  }
  updateActivationPosition() {
    if (!this.activation) return;
    // 設定活化位距離酵素中心 r 像素（可調整）
    const r = 1;
    const rad = ((this.angle || 0) * Math.PI) / 180;
    const centerX = this.x + this.el.width / 2;
    const centerY = this.y + this.el.height / 2;
    // 活化位在正上方（-90度），可依需求調整
    const ax =
      centerX +
      r * Math.cos(rad - Math.PI / 2) -
      this.activation.offsetWidth / 2;
    const ay =
      centerY +
      r * Math.sin(rad - Math.PI / 2) -
      this.activation.offsetHeight / 2;
    this.activation.style.left = ax + "px";
    this.activation.style.top = ay + "px";
  }
  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    this.updateActivationPosition();
  }
  remove() {
    this.el.remove();
    if (this.activation) this.activation.remove();
  }

  randomizeVelocity() {
    const temp = parseInt(tempSlider.value, 10);
    const speed = temperatureToSpeed(temp) * ENZYME_BROWNIAN_SPEED_RATIO ;
    const angle = Math.random() * 2 * Math.PI;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  startBrownian() {
    this.brownianActive = true;

  }

  stopBrownian() {
    this.brownianActive = false;
  }
}

class Molecule {
  constructor(type, x, y, angle) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.el = document.createElement("img");
    this.el.src = this.getIconSrc();
    this.el.className = "draggable molecule";
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
    this.el.style.zIndex = 2;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    canvas.appendChild(this.el);
    // 布朗運動參數
    this.vx = 0;
    this.vy = 0;
    this.brownianTimer = null;
    this.brownianActive = true;
    this.randomizeVelocity();
  }

  randomizeVelocity() {
    // 依目前溫度決定速度
    const temp = parseInt(tempSlider.value, 10);
    const speed = temperatureToSpeed(temp);
    const angle = Math.random() * 2 * Math.PI;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  getIconSrc() {
    // 從 reactions array 找到有此 type 的反應，並取對應 icon
    for (const rule of reactions) {
      const idx = rule.substrates.indexOf(this.type);
      if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
        return rule.substrateIcons[idx];
      }
      // 產物也可能有 icon
      const prodIdx = rule.products.indexOf(this.type);
      if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
        return rule.productIcons[prodIdx];
      }
    }
    return this.type + ".svg"; // fallback
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
  }

  startBrownian() {
    this.brownianActive = true;
  }

  stopBrownian() {
    this.brownianActive = false;
  }

  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
  }

  remove() {
    this.el.remove();
  }

  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
  }
  remove() {
    this.el.remove();
  }
}

// 溫度轉速度函數
function temperatureToSpeed(temp) {
  // temp: 攝氏溫度，最低-10度，最高可自訂
  const minTemp = -10,
    maxTemp = 50;
  const minSpeed = 0.2,
    maxSpeed = 3.5;
  const t = Math.max(minTemp, Math.min(maxTemp, temp));
  // 線性對應
  return (
    minSpeed + ((maxSpeed - minSpeed) * (t - minTemp)) / (maxTemp - minTemp)
  );
}

function getCenter(el) {
  if (!el) return { x: 0, y: 0 };
  return {
    x: el.offsetLeft + el.offsetWidth / 2,
    y: el.offsetTop + el.offsetHeight / 2,
  };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isNearActivation(idx, enzymeIdx) {
  // Ensure enzymeIdx is valid and enzyme has activation property
  if (!enzymes[enzymeIdx] || !enzymes[enzymeIdx].activation) {
    console.warn("Invalid enzyme or missing activation property:", {
      enzymeIdx,
      enzyme: enzymes[enzymeIdx],
    });
    return false;
  }
  // 檢查 molecules[idx] 是否存在
  if (!molecules[idx] || !molecules[idx].el) {
    console.warn("Invalid molecule or missing element:", {
      idx,
      molecule: molecules[idx],
    });
    return false;
  }
  const s = getCenter(molecules[idx].el);
  const a = getCenter(enzymes[enzymeIdx].activation);
  return distance(s, a) < ACTIVATION_SITE_RADIUS;
}

function randomPosX() {
  return Math.floor(Math.random() * (canvas.clientWidth - 40));
}
function randomPosY() {
  return Math.floor(Math.random() * (canvas.clientHeight - 40));
}

function globalAnimationLoop() {
  // Brownian 運動
  molecules.forEach(m => {
    if (m.brownianActive && brownianSwitch.checked) {
      // 隨機微調方向
      if (Math.random() < 0.1) m.randomizeVelocity();
      // 依溫度調整速度
      const temp = parseInt(tempSlider.value, 10);
      const speed = temperatureToSpeed(temp);
      const angle = Math.atan2(m.vy, m.vx) + (Math.random() - 0.5) * 0.3;
      m.vx = Math.cos(angle) * speed;
      m.vy = Math.sin(angle) * speed;
      // 隨機微調角度
      if (Math.random() < 0.2) {
        m.setAngle((m.angle + (Math.random() - 0.5) * 20) % 360);
      }
      // 移動
      let nx = m.x + m.vx;
      let ny = m.y + m.vy;
      // 邊界反彈
      if (nx < 0 || nx > canvas.clientWidth - 40) {
        m.vx *= -1;
        nx = Math.max(0, Math.min(canvas.clientWidth - 40, nx));
      }
      if (ny < 0 || ny > canvas.clientHeight - 40) {
        m.vy *= -1;
        ny = Math.max(0, Math.min(canvas.clientHeight - 40, ny));
      }
      m.updatePosition(nx, ny);
    }
  });
  enzymes.forEach(e => {
    if (e.brownianActive && brownianSwitch.checked) {
      if (Math.random() < 0.1) e.randomizeVelocity();
      const temp = parseInt(tempSlider.value, 10);
      const speed = temperatureToSpeed(temp) * ENZYME_BROWNIAN_SPEED_RATIO;
      const angle = Math.atan2(e.vy, e.vx) + (Math.random() - 0.5) * 0.3;
      e.vx = Math.cos(angle) * speed;
      e.vy = Math.sin(angle) * speed;
      let nx = e.x + e.vx;
      let ny = e.y + e.vy;
      if (nx < 0 || nx > canvas.clientWidth - 40) {
        e.vx *= -1;
        nx = Math.max(0, Math.min(canvas.clientWidth - 40, nx));
      }
      if (ny < 0 || ny > canvas.clientHeight - 40) {
        e.vy *= -1;
        ny = Math.max(0, Math.min(canvas.clientHeight - 40, ny));
      }
      e.updatePosition(nx, ny);
    }
  });

  // 吸附偵測
  autoDetectBinding();
  requestAnimationFrame(globalAnimationLoop);
}

// JS 動態載入 SVG，解析 <path> 或 <circle> 的 fill 屬性，取得主色
function getSVGMainColor(svgText, fallback = "#888") {
  // 1. 先找 fill="..."
  let match = svgText.match(/fill="([^"]+)"/i);
  if (match) return match[1];

  // 2. 再找 style="...fill:...;"
  match = svgText.match(/style="[^"]*fill:([^;"]+)/i);
  if (match) return match[1];

  // 3. 再找 stroke="..."
  match = svgText.match(/stroke="([^"]+)"/i);
  if (match) return match[1];

  // 4. 再找 style="...stroke:...;"
  match = svgText.match(/style="[^"]*stroke:([^;"]+)/i);
  if (match) return match[1];

  return fallback;
}

// fetch 版本
function getSVGMainColorFromUrl(svgUrl, fallback = "#888") {
  return fetch(svgUrl)
    .then(res => res.text())
    .then(svgText => getSVGMainColor(svgText, fallback))
    .catch(() => fallback);
}
// 初始化圖表
function initConcentrationChart() {
  const ctx = document.getElementById('concentration-chart').getContext('2d');
  // 取得所有分子/酵素/產物類型
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap(r => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
  // 建立 datasets
  chartData = {
    labels: [],
    datasets: [
      ...enzymeTypes.map(type => ({
        label: `酵素-${type}`,
        data: [],
        borderColor: '#8009ff',
        backgroundColor: ';#8009ff22',
        fill: false,
        tension: 0.2,
        pointRadius: 0
      })),
      ...moleculeTypes.map(type => ({
        label: `分子-${type}`,
        data: [],
        borderColor: '#009688',
        backgroundColor: '#00968822',
        fill: false,
        tension: 0.2,
        pointRadius: 0
      }))
    ]
  };
  chart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: false,
      animation: false,
      scales: {
        x: { title: { display: true, text: '時間 (秒)' } },
        y: { title: { display: true, text: '數量' }, beginAtZero: true }
      }
    }
  });

  // 動態載入分子SVG顏色
  moleculeTypes.forEach(async (type, i) => {
    // 找 icon
    let icon = null;
    for (const rule of reactions) {
      const idx = rule.substrates.indexOf(type);
      if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
        icon = rule.substrateIcons[idx];
        break;
      }
      const prodIdx = rule.products.indexOf(type);
      if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
        icon = rule.productIcons[prodIdx];
        break;
      }
    }
    if (icon) {
      const color = await getSVGMainColorFromUrl(icon, "#009688");
      chartData.datasets[enzymeTypes.length + i].backgroundColor = color;
      chartData.datasets[enzymeTypes.length + i].borderColor = color;      
      chart.update();
    }
  });
  // 酵素同理
  enzymeTypes.forEach(async (type, i) => {
    const rule = reactions.find(r => r.type === type);
    if (rule && rule.enzymeActiveIcon) {
      const color = await getSVGMainColorFromUrl(rule.enzymeActiveIcon, "#8009ff");
      chartData.datasets[i].backgroundColor = color;
      chartData.datasets[i].borderColor = color;
      chart.update();
    }
  });

}

function updateConcentrationChart() {
  if (chartPaused) return;
  if (!chart) return;
  chartTime += 1;
  chartData.labels.push(chartTime);

  // 只統計 canvas 內且有顯示的酵素
  const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
  enzymeTypes.forEach((type, i) => {
    chartData.datasets[i].data.push(enzymeCount[type] || 0);
    /*
    chartData.datasets[i].data.push(
      enzymes.filter(e =>
        e.type === type &&
        e.el &&
        e.el.parentElement === canvas &&
        e.el.style.display !== "none" &&
        e.el.style.opacity !== "0"
      ).length
    );
    */
  });

  // 只統計 canvas 內且有顯示的分子
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap(r => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  moleculeTypes.forEach((type, i) => {
    chartData.datasets[enzymeTypes.length + i].data.push(moleculeCount[type] || 0);
    /*
    chartData.datasets[enzymeTypes.length + i].data.push(
      molecules.filter(m =>
        m.type === type &&
        m.el &&
        m.el.parentElement === canvas &&
        m.el.style.display !== "none" &&
        m.el.style.opacity !== "0"
      ).length
    );
    */
  });

  // 最多顯示 100 筆
  if (chartData.labels.length > 100) {
    chartData.labels.shift();
    chartData.datasets.forEach(ds => ds.data.shift());
  }
  chartData.datasets.forEach(ds => {
    ds.hidden = ds.data.every(v => v === 0);
  });  
  chart.update();
}


function renderAll() {
  updateAllBrownian();
  // 當溫度或開關變動時，更新分子運動
  if (brownianSwitch) {
    brownianSwitch.addEventListener("change", updateAllBrownian);
  }
  if (tempSlider) {
    tempSlider.addEventListener("input", () => {
      molecules.forEach((m) => m.randomizeVelocity());
    });
  }
  updateActivationSites();
  bindDraggable();
}

// --- 物件導向清除 ---
function clearAll() {
  enzymes.forEach((e) => e.remove());
  molecules.forEach((m) => m.remove && m.remove());
  enzymes = [];
  molecules = [];
  enzymeCount = {};
  moleculeCount = {};  
}

// 啟動/停止所有分子的布朗運動（全域）
function updateAllBrownian() {
  molecules.forEach((m) => {
    m.brownianActive = brownianSwitch.checked;
  });
  enzymes.forEach((e) => {
    e.brownianActive = brownianSwitch.checked;
  });
}

function updateActivationSites() {
  for (let i = 0; i < activationSites.length; i++) {
    if (enzymes[i]) {
      activationSites[i].style.left = enzymes[i].offsetLeft + "px";
      activationSites[i].style.top = enzymes[i].offsetTop + "px";
      activationSites[i].style.display = "";
    } else {
      activationSites[i].style.display = "none";
    }
  }
}

function bindDraggable() {
  enzymes.forEach((enzyme, idx) => {
    enzyme.el.onpointerdown = (e) => startDrag(e, "enzyme", idx);
  });
  molecules.forEach((molecule, idx) => {
    molecule.el.onpointerdown = (e) => startDrag(e, "molecule", idx);
  });
}

// 自動偵測分子靠近活化位並吸附（只針對布朗運動，不處理拖曳中的分子）

function autoDetectBinding() {
  if (molecules.length === 0) return;
  buildGrid();
  const batchSize = Math.ceil(molecules.length / AUTO_DETECT_BATCH);
  const start = autoDetectBatchIndex * batchSize;
  const end = Math.min(start + batchSize, molecules.length);

  for (let idx = start; idx < end; idx++) {
    const m = molecules[idx];
    if (!m || !m.el) continue;
    if (m.el.style.pointerEvents !== "none" && dragging !== m) {
      let near = false;
      let enzymeAngle = 0;
      // 只檢查同格與鄰近格的酵素
      const neighborKeys = getNeighborKeys(m.x, m.y);
      for (const key of neighborKeys) {
        const cell = grid[key];
        if (!cell) continue;
        for (const enzymeIdx of cell.enzymes) {
          const enzyme = enzymes[enzymeIdx];
          if (!enzyme) continue;
          const rule = reactions.find(
            (r) => r.type === enzyme.type && r.substrates.includes(m.type)
          );
          if (rule && isNearActivation(idx, enzymeIdx)) {
            near = true;
            enzymeAngle = enzyme.angle || 0;
            break;
          }
        }
        if (near) break;
      }
      if (near) {
        m.el.style.transition = "filter 0.2s, transform 0.4s";
        m.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
        m.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
      } else {
        m.el.style.transition = "filter 0.2s, transform 0.4s";
        m.el.style.filter = "";
        m.el.style.transform = `rotate(${m.angle || 0}deg)`;
      }
      if (!dragging) trySnapToAnyActivation(idx);
    }
  }
  autoDetectBatchIndex = (autoDetectBatchIndex + 1) % AUTO_DETECT_BATCH;
}

function autoDetectBinding2() {
  molecules.forEach((m, idx) => {
    if (!m || !m.el) return;
    // 已被吸附的分子 pointerEvents = 'none'
    // 並且不是正在拖曳的分子
    if (m.el.style.pointerEvents !== "none" && dragging !== m) {
      let near = false;
      let enzymeAngle = 0;
      for (let enzymeIdx = 0; enzymeIdx < enzymes.length; enzymeIdx++) {
        const enzyme = enzymes[enzymeIdx];
        if (!enzyme) continue;
        const rule = reactions.find(
          (r) => r.type === enzyme.type && r.substrates.includes(m.type)
        );
        if (rule && isNearActivation(idx, enzymeIdx)) {
          near = true;
          enzymeAngle = enzyme.angle || 0;
          break;
        }
      }
      if (near) {
        m.el.style.transition = "filter 0.2s, transform 0.4s";
        m.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
        m.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
      } else {
        m.el.style.transition = "filter 0.2s, transform 0.4s";
        m.el.style.filter = "";
        m.el.style.transform = `rotate(${m.angle || 0}deg)`;
      }
      // 只有布朗運動時才自動吸附
      if (!dragging) trySnapToAnyActivation(idx);
    }
  });
  //requestAnimationFrame(autoDetectBinding);
}

// 嘗試讓受質吸附到任一活化位
function trySnapToAnyActivation(idx) {
  const molecule = molecules[idx];
  if (!molecule || !molecule.el) return;
  for (let enzymeIdx = 0; enzymeIdx < enzymes.length; enzymeIdx++) {
    const enzyme = enzymes[enzymeIdx];
    if (!enzyme) continue;

    const molecule = molecules[idx];
    if (!enzyme || !molecule || !molecule.el) continue;

    // Ensure enzyme and molecule are valid before proceeding
    if (!enzyme || !molecule) {
      console.warn("Invalid enzyme or molecule:", {
        enzymeIdx,
        enzyme,
        moleculeIdx: idx,
        molecule,
      });
      continue;
    }

    // Check if either the substrate is near the enzyme or the enzyme is near the substrate
    //if (isNearActivation(idx, enzymeIdx) || isNearActivation(enzymeIdx, idx)) {
    if (isNearActivation(idx, enzymeIdx)) {
      const rule = reactions.find(
        (r) => r.type === enzyme.type && r.substrates.includes(molecule.type)
      );
      if (!rule) continue;

      // 多受質合成：需等所有受質到齊才觸發
      if (!enzyme.boundMolecules) enzyme.boundMolecules = [];
      if (enzyme.boundMolecules.includes(molecule)) continue;

      if (typeof trySnapToAnyActivation.countTypes !== "function") {
        trySnapToAnyActivation.countTypes = function (arr) {
          const map = {};
          arr.forEach((t) => {
            map[t] = (map[t] || 0) + 1;
          });
          return map;
        };
      }

      const requiredTypes_local = rule.substrates;
      const reqCount_local =
        trySnapToAnyActivation.countTypes(requiredTypes_local);
      const curCount_local = trySnapToAnyActivation.countTypes(
        enzyme.boundMolecules.map((m) => m.type)
      );
      const molType = molecule.type;
      if ((curCount_local[molType] || 0) >= (reqCount_local[molType] || 0))
        continue;

      enzyme.boundMolecules.push(molecule);
      molecule.el.style.pointerEvents = "none";
      molecule.stopBrownian && molecule.stopBrownian();
      molecule.updatePosition(enzyme.x, enzyme.y);
      const enzymeAngle = enzyme.angle || 0;
      molecule.el.style.transition = "filter 0.2s, transform 0.4s";
      molecule.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
      molecule.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
      enzyme.el.style.transition = "filter 0.2s, transform 0.2s";
      enzyme.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
      enzyme.el.style.transform = `scale(1.08) rotate(${enzymeAngle}deg)`;

      function countTypes(arr) {
        const map = {};
        arr.forEach((t) => {
          map[t] = (map[t] || 0) + 1;
        });
        return map;
      }

      const requiredTypes = rule.substrates;
      const currentTypes = enzyme.boundMolecules.map((m) => m.type);
      const reqCount = countTypes(requiredTypes);
      const curCount = countTypes(currentTypes);
      let allArrived = true;
      for (const t in reqCount) {
        if (curCount[t] !== reqCount[t]) {
          allArrived = false;
          break;
        }
      }
      for (const t in curCount) {
        if (!(t in reqCount)) {
          allArrived = false;
          break;
        }
      }

      if (allArrived && !enzyme.reacting) {
        enzyme.reacting = true;
        setTimeout(() => {
          molecule.el.style.filter = "";
          molecule.el.style.transform = `rotate(${enzymeAngle}deg)`;
          enzyme.el.style.filter = "";
          enzyme.el.style.transform = `rotate(${enzymeAngle}deg)`;
          const idxs = enzyme.boundMolecules
            .map((m) => molecules.indexOf(m))
            .filter((i) => i !== -1);
          enzyme.boundMolecules = [];
          triggerReaction(idxs, enzymeIdx, rule);
          enzyme.reacting = false;
        }, 800);
        return;
      }
      break;
    }
  }
}

function triggerReaction(idxs, enzymeIdx, rule) {  
  chartPaused = true;  
  // Prevent triggering reaction if idxs is empty
  if (!idxs || idxs.length === 0) {
    console.warn("No substrates provided for reaction. Aborting.");
    return;
  }

  // idxs: 受質分子的索引（可為單一數字或陣列）
  if (!Array.isArray(idxs)) idxs = [idxs];
  console.log("Processed idxs:", idxs); // Log processed idxs

  // 先讓所有分子淡出
  idxs.forEach((idx) => {
    if (molecules[idx]) {
      console.log("Fading out molecule:", molecules[idx]); // Log molecule being faded out
      molecules[idx].el.style.opacity = 0;
      // 恢復 pointer 事件，避免產物也被禁用
      molecules[idx].el.style.pointerEvents = "auto";
    }
  });

  setTimeout(() => {
    // 移除所有受質分子
    // 注意：要從大到小刪除，避免索引錯亂
    idxs
      .sort((a, b) => b - a)
      .forEach((idx) => {
        if (molecules[idx]) {
          const type = molecules[idx].type;
          moleculeCount[type] = Math.max(0, (moleculeCount[type] || 1) - 1);
          console.log("Removing molecule:", molecules[idx]); // Log molecule being removed
          molecules[idx].remove();
          molecules.splice(idx, 1);
        }
      });
    console.log("Molecules after removal:", molecules); // Log molecules array after removal
    chartPaused = false;
    bindDraggable();
  }, 300);

  // 播放反應聲音
  if (rule && rule.sound) {
    const audio = new Audio(rule.sound);
    audio.play();
  }


  // 產生產物
  const center = getCenter(enzymes[enzymeIdx].activation);
  const theta = Math.random() * Math.PI * 2;
  if (rule && rule.products && rule.products.length > 0) {
    console.log("Generating products for rule:", rule); // Log rule for product generation
    for (let i = 0; i < rule.products.length; i++) {
      const prodName = rule.products[i];
      const angle = theta + i * Math.PI;
      console.log("Creating product:", { prodName, center, angle }); // Log product details
      createProduct(prodName, center, angle);
    }
  }
}

function createProduct(src, center, angle) {
  let type = src;
  let x = center.x - 20;
  let y = center.y - 20;
  let molecule = new Molecule(type, x, y, 0);
  molecules.push(molecule);
  moleculeCount[type] = (moleculeCount[type] || 0) + 1;
  molecule.startBrownian && molecule.startBrownian();
  // 隨機速度
  let v = 3 + Math.random() * 2;
  let vx = Math.cos(angle) * v;
  let vy = Math.sin(angle) * v;
  let damping = 0.96;
  let rot = 0;
  let rotSpeed = (Math.random() - 0.5) * 8;
  function animate() {
    let x = parseFloat(molecule.el.style.left);
    let y = parseFloat(molecule.el.style.top);
    x += vx;
    y += vy;
    vx *= damping;
    vy *= damping;
    rot += rotSpeed;
    molecule.el.style.left = x + "px";
    molecule.el.style.top = y + "px";
    molecule.el.style.transform = `rotate(${rot}deg)`;
    if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      requestAnimationFrame(animate);
    }
  }
  animate();
  molecule.startBrownian();
  bindDraggable();
}

function addEnzymeFromToolbox(enzymeType, x, y, angle) {
  const rule = reactions.find((r) => r.type === enzymeType);
  const denatureTemp = rule && rule.denatureTemp ? rule.denatureTemp : 50; // 預設50
  const enzyme = new Enzyme(enzymeType, x, y, angle, denatureTemp);
  const temp = parseInt(tempSlider.value, 10);
  enzyme.checkDenature(temp);
  enzymes.push(enzyme);
  enzymeCount[enzymeType] = (enzymeCount[enzymeType] || 0) + 1;
  if (brownianSwitch.checked && enzyme.startBrownian) {
    enzyme.startBrownian();
  }
  bindDraggable();
}

function addMoleculeFromToolbox(moleculeType, x, y) {
  const angle = Math.floor(Math.random() * 360);
  const molecule = new Molecule(moleculeType, x, y, angle);
  molecules.push(molecule);
  moleculeCount[moleculeType] = (moleculeCount[moleculeType] || 0) + 1;
  // Enable Brownian motion for the new molecule if the switch is checked
  if (brownianSwitch.checked && molecule.startBrownian) {
    molecule.startBrownian();
  } else {
    console.warn("Brownian motion not started for molecule:", molecule);
  }
  bindDraggable();
}

function handleTempSliderInput() {
  const t = parseInt(tempSlider.value, 10);
  tempValue.textContent = t;
  enzymes.forEach((e) => e.checkDenature(t));
}

function startDrag(e, type, idx) {
  if (type === "enzyme") {
    dragging = enzymes[idx];
    dragging.stopBrownian && dragging.stopBrownian();
  } else if (type === "molecule") {
    dragging = molecules[idx];
    dragging.stopBrownian && dragging.stopBrownian();
  }
  dragType = type;
  dragIndex = idx;
  const rect = dragging.el.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  dragging.el.style.filter = "brightness(1.2) drop-shadow(0 0 8px #00bcd4)";
  // 設定自訂 ghost image
  if (e.dataTransfer) {
    e.dataTransfer.setDragImage(dragging.el, 20, 20);
  } else if (typeof e.target.setPointerCapture === "function") {
    try {
      const ghost = dragging.el.cloneNode(true);
      ghost.style.position = "absolute";
      ghost.style.left = "-9999px";
      ghost.style.top = "-9999px";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "1";
      ghost.style.transform = dragging.el.style.transform;
      document.body.appendChild(ghost);
      e.target.setPointerCapture(e.pointerId);
      setTimeout(() => ghost.remove(), 1000);
    } catch {}
  }
  dragging.el.setPointerCapture(e.pointerId);
}

canvas.onpointermove = function (e) {
  if (!dragging) return;
  const canvasRect = canvas.getBoundingClientRect();
  let x = e.clientX - canvasRect.left - offsetX;
  let y = e.clientY - canvasRect.top - offsetY;
  x = Math.max(0, Math.min(canvasRect.width - 40, x));
  y = Math.max(0, Math.min(canvasRect.height - 40, y));
  dragging.updatePosition(x, y);
  // 立即同步 ghost/本體旋轉
  if (dragging.angle !== undefined) {
    dragging.setAngle(dragging.angle);
  }
  if (dragType === "enzyme") updateActivationSites();

  if (dragType === "molecule") {
    let near = false;
    let enzymeAngle = 0;
    for (let enzymeIdx = 0; enzymeIdx < enzymes.length; enzymeIdx++) {
      const enzyme = enzymes[enzymeIdx];
      if (!enzyme) continue;
      const rule = reactions.find(
        (r) => r.type === enzyme.type && r.substrates.includes(dragging.type)
      );
      if (rule && isNearActivation(dragIndex, enzymeIdx)) {
        near = true;
        enzymeAngle = enzyme.angle || 0;
        break;
      }
    }
    if (near) {
      dragging.el.style.transition = "filter 0.2s, transform 0.4s";
      dragging.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
      dragging.el.style.transform = `scale(1.15) rotate(${enzymeAngle})deg`;
    } else {
      dragging.el.style.transition = "filter 0.2s, transform 0.4s";
      dragging.el.style.filter = "";
      dragging.el.style.transform = `rotate(${dragging.angle || 0}deg)`;
    }
  }
};

// pointerup 時才做實際吸附
canvas.onpointerup = function (e) {
  if (dragging) dragging.el.style.filter = "";
  if (dragType === "molecule") {
    trySnapToAnyActivation(dragIndex);
  } else if (dragType === "enzyme") {
    for (let i = 0; i < molecules.length; i++) {
      trySnapToAnyActivation(i);
    }
  }

  // 判斷是否在 toolbox 區
  const toolbox = document.getElementById("toolbox");
  if (toolbox) {
    const rect = toolbox.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      // 在 toolbox 區，執行刪除
      if (dragType === "enzyme") {
        enzymes[dragIndex].remove();
        enzymes.splice(dragIndex, 1);
        bindDraggable();
      } else if (dragType === "molecule") {

        // 同步移除所有酵素的 boundMolecules 參照
        enzymes.forEach(enzyme => {
          if (enzyme.boundMolecules) {
            enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== molecules[dragIndex]);
          }
        });        
        molecules[dragIndex].remove();
        molecules.splice(dragIndex, 1);
        bindDraggable();
      }
      dragging = null;
      dragType = null;
      dragIndex = -1;
      return;
    }
  }

  dragging = null;
  dragType = null;
  dragIndex = -1;
};
canvas.onpointerleave = canvas.onpointerup;

// --- Touch 支援：點擊工具箱圖示，點 canvas 新增 ---
if (toolbox && canvas) {
  toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
    // 滑鼠拖曳已支援，這裡加觸控/點擊
    item.addEventListener("touchstart", (e) => {
      e.preventDefault();
      pendingToolboxItem = item;
      // 可加 highlight 效果
      item.style.boxShadow = "0 0 0 3px #00bcd4";
    });
    item.addEventListener("click", (e) => {
      // 桌機點擊也可用
      pendingToolboxItem = item;
      item.style.boxShadow = "0 0 0 3px #00bcd4";
    });
  });

  // 點 canvas 新增
  canvas.addEventListener("touchstart", (e) => {
    if (pendingToolboxItem) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      let x = touch.clientX - rect.left - 20;
      let y = touch.clientY - rect.top - 20;
      let angle = Math.floor(Math.random() * 360);
      const type = pendingToolboxItem.dataset.type;
      const enzymeType = pendingToolboxItem.dataset.enzymetype;
      const moleculeType = pendingToolboxItem.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        addEnzymeFromToolbox(enzymeType, x, y, angle);
      } else if (type === "molecule" && moleculeType) {
        addMoleculeFromToolbox(moleculeType, x, y);
      }
      pendingToolboxItem.style.boxShadow = "";
      pendingToolboxItem = null;
    }
  });
  canvas.addEventListener("click", (e) => {
    if (pendingToolboxItem) {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - 20;
      let y = e.clientY - rect.top - 20;
      let angle = Math.floor(Math.random() * 360);
      const type = pendingToolboxItem.dataset.type;
      const enzymeType = pendingToolboxItem.dataset.enzymetype;
      const moleculeType = pendingToolboxItem.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        addEnzymeFromToolbox(enzymeType, x, y, angle);
      } else if (type === "molecule" && moleculeType) {
        addMoleculeFromToolbox(moleculeType, x, y);
      }
      pendingToolboxItem.style.boxShadow = "";
      pendingToolboxItem = null;
    }
  });
}

if (toolbox && canvas) {
  // 自動產生 toolbox 內容
  toolbox.innerHTML = "";
  // 酵素
  const enzymeTypes = Array.from(new Set(reactions.map((r) => r.type)));
  enzymeTypes.forEach((type) => {
    const rule = reactions.find((r) => r.type === type);
    const icon =
      rule && rule.enzymeActiveIcon
        ? rule.enzymeActiveIcon
        : "enzyme_A_active.svg";
    const div = document.createElement("div");
    div.draggable = true;
    div.className = "toolbox-item";
    div.dataset.type = "enzyme";
    div.dataset.enzymetype = type;
    div.style.width = "40px";
    div.style.height = "40px";
    div.style.cursor = "grab";
    //div.innerHTML = `<img src="${icon}" alt="酵素${type}" style="width:40px;height:40px;">`;
    div.innerHTML = `
      <img src="${icon}" alt="酵素${type}" style="width:40px;height:40px;">
      <div class="toolbox-btn-group">
        <span class="toolbox-add10" title="一次新增10個" data-type="enzyme" data-enzymetype="${type}" style="margin-left:4px;cursor:pointer;font-size:13px;color:#8009ff;font-weight:bold;">+10</span>
        <span class="toolbox-minus10" title="一次移除10個" data-type="enzyme" data-enzymetype="${type}" style="margin-left:4px;cursor:pointer;font-size:13px;color:#f44336;font-weight:bold;">-10</span>
      </div>    
    `;
    toolbox.appendChild(div);
  });
  // 分子
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap((r) => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  moleculeTypes.forEach((type) => {
    // 找 icon
    let icon = null;
    for (const rule of reactions) {
      const idx = rule.substrates.indexOf(type);
      if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
        icon = rule.substrateIcons[idx];
        break;
      }
      const prodIdx = rule.products.indexOf(type);
      if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
        icon = rule.productIcons[prodIdx];
        break;
      }
    }
    if (!icon) icon = type + ".svg";
    const div = document.createElement("div");
    div.draggable = true;
    div.className = "toolbox-item";
    div.dataset.type = "molecule";
    div.dataset.moleculetype = type;
    div.style.width = "40px";
    div.style.height = "40px";
    div.style.cursor = "grab";
    //div.innerHTML = `<img src="${icon}" alt="分子${type}" style="width:40px;height:40px;">`;
    div.innerHTML = `
      <img src="${icon}" alt="分子${type}" style="width:40px;height:40px;">
      <div class="toolbox-btn-group">
        <span class="toolbox-add10" title="一次新增10個" data-type="molecule" data-moleculetype="${type}" style="margin-left:4px;cursor:pointer;font-size:13px;color:#8009ff;font-weight:bold;">+10</span>
        <span class="toolbox-minus10" title="一次移除10個" data-type="molecule" data-moleculetype="${type}" style="margin-left:4px;cursor:pointer;font-size:13px;color:#f44336;font-weight:bold;">-10</span>
      </div>
    `;
    toolbox.appendChild(div);
  });

  // 允許 canvas 放置
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const enzymeType = e.dataTransfer.getData("enzymetype");
    const moleculeType = e.dataTransfer.getData("moleculetype");
    // 取得滑鼠座標相對於 canvas
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - 20;
    let y = e.clientY - rect.top - 20;
    let angle = Math.floor(Math.random() * 360);
    if (type === "enzyme" && enzymeType) {
      addEnzymeFromToolbox(enzymeType, x, y, angle);
    } else if (type === "molecule" && moleculeType) {
      addMoleculeFromToolbox(moleculeType, x, y);
    }
  });

  // 設定 toolbox-item 拖曳資料
  toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("type", item.dataset.type);
      if (item.dataset.enzymetype)
        e.dataTransfer.setData("enzymetype", item.dataset.enzymetype);
      if (item.dataset.moleculetype)
        e.dataTransfer.setData("moleculetype", item.dataset.moleculetype);
    });
  });

  // 綁定 +10 點擊事件
  toolbox.querySelectorAll(".toolbox-add10").forEach((x10btn) => {
    x10btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = x10btn.dataset.type;
      const enzymeType = x10btn.dataset.enzymetype;
      const moleculeType = x10btn.dataset.moleculetype;
      for (let i = 0; i < 10; i++) {
        let x = randomPosX();
        let y = randomPosY();
        let angle = Math.floor(Math.random() * 360);
        if (type === "enzyme" && enzymeType) {
          addEnzymeFromToolbox(enzymeType, x, y, angle);
        } else if (type === "molecule" && moleculeType) {
          addMoleculeFromToolbox(moleculeType, x, y);
        }
      }
    });
  });  
  toolbox.querySelectorAll(".toolbox-minus10").forEach((minus10btn) => {
    minus10btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = minus10btn.dataset.type;
      const enzymeType = minus10btn.dataset.enzymetype;
      const moleculeType = minus10btn.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        // 找出畫面上所有該類型酵素
        const targets = enzymes.filter(e => e.type === enzymeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = enzymes.findIndex(e => e.type === enzymeType);
          if (idx !== -1) {
            // 釋放已結合的受質
            const enzyme = enzymes[idx];
            if (enzyme.boundMolecules && enzyme.boundMolecules.length > 0) {
              enzyme.boundMolecules.forEach(m => {
                if (m.el) {
                  m.el.style.pointerEvents = "auto";
                  m.el.style.filter = "";
                  m.startBrownian && m.startBrownian();
                }
              });
              enzyme.boundMolecules = [];
            }            
            enzymes[idx].remove();
            enzymes.splice(idx, 1);
            enzymeCount[enzymeType] = Math.max(0, (enzymeCount[enzymeType] || 1) - 1);
          }
        }
        bindDraggable();
      } else if (type === "molecule" && moleculeType) {
        // 找出畫面上所有該類型分子
        const targets = molecules.filter(m => m.type === moleculeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = molecules.findIndex(m => m.type === moleculeType);
          if (idx !== -1) {
            // 同步移除所有酵素的 boundMolecules 參照 ---
            enzymes.forEach(enzyme => {
              if (enzyme.boundMolecules) {
                enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== molecules[idx]);
              }
            });            
            molecules[idx].remove();
            molecules.splice(idx, 1);
            moleculeCount[moleculeType] = Math.max(0, (moleculeCount[moleculeType] || 1) - 1);
          }
        }
        bindDraggable();
      }
    });
  });

}
// --- Touch 拖曳支援（for mobile/tablet）---
let draggingGhost = null;
let draggingType = null;
let draggingEnzymeType = null;
let draggingMoleculeType = null;

toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
  item.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draggingType = item.dataset.type;
    draggingEnzymeType = item.dataset.enzymetype;
    draggingMoleculeType = item.dataset.moleculetype;
    // 建立 ghost image
    draggingGhost = item.cloneNode(true);
    draggingGhost.style.position = "fixed";
    draggingGhost.style.left = touch.clientX - 20 + "px";
    draggingGhost.style.top = touch.clientY - 20 + "px";
    draggingGhost.style.opacity = "0.7";
    draggingGhost.style.pointerEvents = "none";
    draggingGhost.style.zIndex = 9999;
    document.body.appendChild(draggingGhost);
  });
  item.addEventListener("touchmove", (e) => {
    if (!draggingGhost) return;
    const touch = e.touches[0];
    draggingGhost.style.left = touch.clientX - 20 + "px";
    draggingGhost.style.top = touch.clientY - 20 + "px";
  });
  item.addEventListener("touchend", (e) => {
    if (draggingGhost) {
      // 判斷是否在 canvas 上
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        let x = touch.clientX - rect.left - 20;
        let y = touch.clientY - rect.top - 20;
        let angle = Math.floor(Math.random() * 360);
        if (draggingType === "enzyme" && draggingEnzymeType) {
          addEnzymeFromToolbox(draggingEnzymeType, x, y, angle);
        } else if (draggingType === "molecule" && draggingMoleculeType) {
          addMoleculeFromToolbox(draggingMoleculeType, x, y);
        }
      }
      draggingGhost.remove();
      draggingGhost = null;
      draggingType = null;
      draggingEnzymeType = null;
      draggingMoleculeType = null;
    }
  });
});
clearAll();
let chartTime = 0;
setInterval(updateConcentrationChart, 1000); // 每秒更新
globalAnimationLoop();

if (tempSlider && tempValue) {
  tempSlider.addEventListener("input", handleTempSliderInput);
}

document.getElementById('reset-btn').onclick = function() {
  clearAll(); // 清除所有分子/酵素/產物
  if (chart) {
    chartData.labels = [];
    chartData.datasets.forEach(ds => ds.data = []);
    chartTime = 0;
    chart.update();
  }
};

// 主程式啟動
window.addEventListener("DOMContentLoaded", () => {
  renderAll();  
  initConcentrationChart();
});

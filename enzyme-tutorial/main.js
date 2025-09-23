// --- 反應規則外部化 ---
import { reactions } from "./enzyme-reactions.js";
import { Enzyme } from "./enzyme.js";
import { Molecule } from "./molecule.js";
import {
  getGridKey,
  getNeighborKeys,
  temperatureToSpeed,
  getCenter,
  distance,
  getSVGMainColor,
  getSVGMainColorFromUrl
} from "./utils.js";


const state = {
  enzymes: [],
  molecules: [],
  enzymeCount: {},
  moleculeCount: {},
  activationSites: [],
  dragging: null,
  dragType: null,
  dragIndex: -1,
  autoDetectBatchIndex: 0,
  grid: {},
  bindingDetectFrame: 0,
  bindingDetectInterval: 1,
  offsetX: 0,
  offsetY: 0,
  pendingToolboxItem: null,
  chartPaused: false,
  chartTime: 0,
  charts: {concentration: null},
  chartData:{
    concentration: { labels: [], datasets: [] },  
  },
  currentChartType:"concentration",
  draggingGhost: null,
  draggingType: null,
  draggingEnzymeType: null,
  draggingMoleculeType: null,  
};



const substrateToEnzymeTypes = {};
reactions.forEach(r => {
  (r.substrates || []).forEach(s => {
    if (!substrateToEnzymeTypes[s]) substrateToEnzymeTypes[s] = [];
    substrateToEnzymeTypes[s].push(r.type);
  });
});




const canvas = document.getElementById("canvas");
const tempSlider = document.getElementById("temp-slider");
const tempValue = document.getElementById("temp-value");
let brownianSwitch = document.getElementById("brownian-switch");
const toolbox = document.getElementById("toolbox");


const ENZYME_BROWNIAN_SPEED_RATIO = 0.03;
const ACTIVATION_SITE_RADIUS = 35;  // 活化位判斷半徑（像素）


// --- 空間分割法（Grid） ---
const GRID_SIZE = 80; // 每格 80px，可依需求調整
const AUTO_DETECT_BATCH = 4; // 分成4批更新碰撞

function buildGrid() {
  state.grid = {};
  state.molecules.forEach((m, idx) => {
    const key = getGridKey(m.x, m.y);
    if (!state.grid[key]) state.grid[key] = { molecules: [], enzymes: [] };
    state.grid[key].molecules.push(idx);
  });
  state.enzymes.forEach((e, idx) => {
    const key = getGridKey(e.x, e.y);
    if (!state.grid[key]) state.grid[key] = { molecules: [], enzymes: [] };
    state.grid[key].enzymes.push(idx);
  });
}


function isNearActivation(idx, enzymeIdx) {
  // Ensure enzymeIdx is valid and enzyme has activation property
  if (!state.enzymes[enzymeIdx] || !state.enzymes[enzymeIdx].activation) {
    return false;
  }
  // 檢查 state.molecules[idx] 是否存在
  if (!state.molecules[idx] || !state.molecules[idx].el) {
    return false;
  }
  const s = getCenter(state.molecules[idx].el);
  const a = getCenter(state.enzymes[enzymeIdx].activation);
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
  const temp = parseInt(tempSlider.value, 10);
  state.molecules.forEach(m => {
    // 產物彈開動畫：只要有 _productDamping 就執行，不管布朗運動開關
    if (m._productDamping) {
      m.vx *= m._productDamping;
      m.vy *= m._productDamping;
      if (Math.abs(m.vx) < 0.1 && Math.abs(m.vy) < 0.1) {
        delete m._productDamping;
      }
      // 還是要移動
      let nx = m.x + m.vx;
      let ny = m.y + m.vy;
      if (nx < 0 || nx > canvas.clientWidth - 40) {
        m.vx *= -1;
        nx = Math.max(0, Math.min(canvas.clientWidth - 40, nx));
      }
      if (ny < 0 || ny > canvas.clientHeight - 40) {
        m.vy *= -1;
        ny = Math.max(0, Math.min(canvas.clientHeight - 40, ny));
      }
      m.updatePosition(nx, ny);
      // 不 return，讓布朗運動也能同時進行（如果有開）
    }

    // 只有布朗運動開啟時才執行布朗運動
    if (m.brownianActive && brownianSwitch.checked) {
      if (Math.random() < 0.1) m.randomizeVelocity(temp);
      const speed = temperatureToSpeed(temp);
      const angle = Math.atan2(m.vy, m.vx) + (Math.random() - 0.5) * 0.3;
      m.vx = Math.cos(angle) * speed + m.vx * 0.5;
      m.vy = Math.sin(angle) * speed + m.vy * 0.5;

      // 旋轉動畫
      if (m._rotSpeed !== undefined) {
        m._rot = (m._rot || 0) + m._rotSpeed;
        m._rotSpeed *= m._rotDamping || 0.96;
        m.setAngle(m._rot);
        if (Math.abs(m._rotSpeed) < 0.1) {
          delete m._rotSpeed;
          delete m._rotDamping;
        }
      }

      let nx = m.x + m.vx;
      let ny = m.y + m.vy;
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
  state.enzymes.forEach(e => {
    if (e.brownianActive && brownianSwitch.checked) {
      //const temp = parseInt(tempSlider.value, 10);
      if (Math.random() < 0.1) {
        e.randomizeVelocity(temp, ENZYME_BROWNIAN_SPEED_RATIO);
      }
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
  // autoDetectBinding();
    // 吸附偵測降頻（每3幀執行一次）
  state.bindingDetectFrame = (state.bindingDetectFrame + 1) % state.bindingDetectInterval;
  if (state.bindingDetectFrame === 0) {
    autoDetectBinding();
  }

  requestAnimationFrame(globalAnimationLoop);
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
  state.chartData.concentration = {
    labels: [],
    datasets: [
      ...enzymeTypes.map(type => ({
        label: `酵素-${type}`,
        data: [],
        borderColor: '#8009ff',
        backgroundColor: '#8009ff22',
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
  // 建立 chart 實例並存到 state.charts
  state.charts.concentration = new Chart(ctx, {
    type: 'line',
    data: state.chartData.concentration,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 0.8, // 或 2，依你需求    
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
      state.chartData.concentration.datasets[enzymeTypes.length + i].backgroundColor = color;
      state.chartData.concentration.datasets[enzymeTypes.length + i].borderColor = color;      
      state.charts.concentration.update();
    }
  });
  // 酵素同理
  enzymeTypes.forEach(async (type, i) => {
    const rule = reactions.find(r => r.type === type);
    if (rule && rule.enzymeActiveIcon) {
      const color = await getSVGMainColorFromUrl(rule.enzymeActiveIcon, "#8009ff");
      state.chartData.concentration.datasets[i].backgroundColor = color;
      state.chartData.concentration.datasets[i].borderColor = color;
      state.charts.concentration.update();
    }
  });
}

function updateConcentrationChart() {
  if (state.chartPaused) return;
  if (!state.charts.concentration) return;
  state.chartTime += 1;
  state.chartData.concentration.labels.push(state.chartTime);

  // 只統計 canvas 內且有顯示的酵素
  const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
  enzymeTypes.forEach((type, i) => {
    state.chartData.concentration.datasets[i].data.push(state.enzymeCount[type] || 0);
  });

  // 只統計 canvas 內且有顯示的分子
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap(r => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  moleculeTypes.forEach((type, i) => {
    state.chartData.concentration.datasets[enzymeTypes.length + i].data.push(state.moleculeCount[type] || 0);
  });

  // 最多顯示 100 筆
  if (state.chartData.concentration.labels.length > 100) {
    state.chartData.concentration.labels.shift();
    state.chartData.concentration.datasets.forEach(ds => ds.data.shift());
  }
  state.chartData.concentration.datasets.forEach(ds => {
    ds.hidden = ds.data.every(v => v === 0);
  });  
  state.charts.concentration.update();
}


function updateCurrentChart() {
  const type = state.currentChartType;
  if (type === "concentration") {
    updateConcentrationChart();
  }
  // 之後可加其他 chart 的更新
}

document.querySelectorAll("#chart-tabs button").forEach(btn => {
  btn.onclick = function() {
    const type = btn.dataset.type;
    state.currentChartType = type;
    // 顯示對應 chart，隱藏其他
    document.querySelectorAll("#chart-panels canvas").forEach(cvs => {
      cvs.style.display = cvs.id === type + "-chart" ? "" : "none";
    });
    updateCurrentChart();
  };
});

function renderAll() {
  updateAllBrownian();
  // 當溫度或開關變動時，更新分子運動
  if (brownianSwitch) {
    brownianSwitch.addEventListener("change", updateAllBrownian);
  }
  if (tempSlider) {
    tempSlider.addEventListener("input", () => {
      state.molecules.forEach((m) => m.randomizeVelocity(parseInt(tempSlider.value, 10)));
    });
  }
  updateActivationSites();
  bindDraggable();
}

// --- 物件導向清除 ---
function clearAll() {
  state.enzymes.forEach((e) => e.remove());
  state.molecules.forEach((m) => m.remove && m.remove());
  state.enzymes = [];
  state.molecules = [];
  state.enzymeCount = {};
  state.moleculeCount = {};  
}

// 啟動/停止所有分子的布朗運動（全域）
function updateAllBrownian() {
  state.molecules.forEach((m) => {
    m.brownianActive = brownianSwitch.checked;
  });
  state.enzymes.forEach((e) => {
    e.brownianActive = brownianSwitch.checked;
  });
}

function updateActivationSites() {
  for (let i = 0; i < state.activationSites.length; i++) {
    if (state.enzymes[i]) {
      state.activationSites[i].style.left = state.enzymes[i].offsetLeft + "px";
      state.activationSites[i].style.top = state.enzymes[i].offsetTop + "px";
      state.activationSites[i].style.display = "";
    } else {
      state.activationSites[i].style.display = "none";
    }
  }
}

function bindDraggable() {
  state.enzymes.forEach((enzyme, idx) => {
    enzyme.el.onpointerdown = (e) => startDrag(e, "enzyme", idx);
  });
  state.molecules.forEach((molecule, idx) => {
    molecule.el.onpointerdown = (e) => startDrag(e, "molecule", idx);
  });
}

// 自動偵測分子或酵素靠近活化位並吸附（支援酵素作為受質）
function autoDetectBinding() {
  // 將 state.molecules 與 enzymes 都視為「可被當作受質」的物件
  const allSubstrates = [
    ...state.molecules.map((m, idx) => ({ obj: m, idx, type: "molecule" })),
    ...state.enzymes.map((e, idx) => ({ obj: e, idx, type: "enzyme" }))
  ];
  if (allSubstrates.length === 0) return;
  buildGrid();
  const batchSize = Math.ceil(allSubstrates.length / AUTO_DETECT_BATCH);
  const start = state.autoDetectBatchIndex * batchSize;
  const end = Math.min(start + batchSize, allSubstrates.length);

  for (let i = start; i < end; i++) {
    const { obj: substrate, idx, type } = allSubstrates[i];
    if (!substrate || !substrate.el) continue;
    // 只在有對應酵素存在時才進行偵測
    const enzymeTypes = substrateToEnzymeTypes[substrate.type];
    if (!enzymeTypes) continue;
    let hasEnzyme = false;
    for (const et of enzymeTypes) {
      if (state.enzymeCount[et] > 0) {
        hasEnzyme = true;
        break;
      }
    }
    if (!hasEnzyme) continue; // 沒有對應酵素，跳過偵測

    // 拖曳中或 pointerEvents 關閉時不處理
    if (substrate.el.style.pointerEvents !== "none" && state.dragging !== substrate) {
      let near = false;
      let enzymeAngle = 0;
      const neighborKeys = getNeighborKeys(substrate.x, substrate.y);
      for (const key of neighborKeys) {
        const cell = state.grid[key];
        if (!cell) continue;
        for (const enzymeIdx of cell.enzymes) {
          const enzyme = state.enzymes[enzymeIdx];
          if (!enzyme) continue;
          const rule = reactions.find(
            (r) => r.type === enzyme.type && r.substrates.includes(substrate.type)
          );
          // 支援酵素作為受質時，需判斷是否靠近活化位
          // state.molecules 用 isNearActivation，酵素則自訂
          let isNear = false;
          if (type === "molecule") {
            isNear = isNearActivation(idx, enzymeIdx);
          } else if (type === "enzyme") {
            // 酵素作為受質時，判斷兩酵素中心距離
            const sCenter = getCenter(substrate.el);
            const aCenter = getCenter(enzyme.activation);
            isNear = distance(sCenter, aCenter) < ACTIVATION_SITE_RADIUS;
          }
          if (rule && isNear) {
            near = true;
            enzymeAngle = enzyme.angle || 0;
            break;
          }
        }
        if (near) break;
      }
      if (near) {
        substrate.el.style.transition = "filter 0.2s, transform 0.4s";
        substrate.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
        substrate.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
      } else {
        substrate.el.style.transition = "filter 0.2s, transform 0.4s";
        substrate.el.style.filter = "";
        substrate.el.style.transform = `rotate(${substrate.angle || 0}deg)`;
      }
      if (!state.dragging) {
        if (type === "molecule") {
          trySnapToAnyActivation(idx, "molecule");
        } else if (type === "enzyme") {
          trySnapToAnyActivation(idx, "enzyme");
        }
      }
    }
  }
  state.autoDetectBatchIndex = (state.autoDetectBatchIndex + 1) % AUTO_DETECT_BATCH;
}




// 修改：triggerReaction 支援酵素作為受質
function triggerReaction(idxs, enzymeIdx, rule) {
  state.chartPaused = true;
  if (!idxs || idxs.length === 0) {
    state.chartPaused = false;
    return;
  }
  // idxs: [{idx, type}] 陣列
  // 先讓所有受質淡出
  idxs.forEach(({ idx, type }) => {
    if (type === "molecule" && state.molecules[idx]) {
      state.molecules[idx].el.style.opacity = 0;
      state.molecules[idx].el.style.pointerEvents = "auto";
    } else if (type === "enzyme" && state.enzymes[idx]) {
      state.enzymes[idx].el.style.opacity = 0;
      state.enzymes[idx].el.style.pointerEvents = "auto";
    }
  });

  setTimeout(() => {
    // 移除所有受質
    idxs
      .sort((a, b) => b.idx - a.idx)
      .forEach(({ idx, type }) => {
        if (type === "molecule" && state.molecules[idx]) {
          const t = state.molecules[idx].type;
          state.moleculeCount[t] = Math.max(0, (state.moleculeCount[t] || 1) - 1);
          state.molecules[idx].remove();
          state.molecules.splice(idx, 1);
        } else if (type === "enzyme" && state.enzymes[idx]) {
          const t = state.enzymes[idx].type;
          state.enzymeCount[t] = Math.max(0, (state.enzymeCount[t] || 1) - 1);
          state.enzymes[idx].remove();
          state.enzymes.splice(idx, 1);
        }
      });
    state.chartPaused = false;
    bindDraggable();
  }, 300);

  // 播放反應聲音
  if (rule && rule.sound) {
    const audio = new Audio(rule.sound);
    audio.play();
  }

  // 產生產物
  const center = getCenter(state.enzymes[enzymeIdx].activation);
  const theta = Math.random() * Math.PI * 2;
  if (rule && rule.products && rule.products.length > 0) {
    for (let i = 0; i < rule.products.length; i++) {
      const prodName = rule.products[i];
      const angle = theta + i * Math.PI;
      createProduct(prodName, center, angle);
    }
  }
}

// 嘗試讓受質吸附到任一活化位
function trySnapToAnyActivation(idx, type = "molecule") {

  // type: "molecule"（預設）或 "enzyme"
  let substrate, substrateArr;
  if (type === "molecule") {
    substrateArr = state.molecules;
  } else if (type === "enzyme") {
    substrateArr = state.enzymes;
  } else {
    return;
  }
  substrate = substrateArr[idx];

  if (!substrate || !substrate.el) {
    return;
  }

  for (let enzymeIdx = 0; enzymeIdx < state.enzymes.length; enzymeIdx++) {
    const enzyme = state.enzymes[enzymeIdx];
    if (!enzyme || (type === "enzyme" && enzyme === substrate)) continue;

    const rule = reactions.find(
      (r) => r.type === enzyme.type && r.substrates.includes(substrate.type)
    );

    if (!rule) {
      // debug: 沒有對應反應規則
      //console.log(`[debug] 無對應反應: enzyme.type=${enzyme.type}, substrate.type=${substrate.type}`);
      continue;
    }

    // 判斷是否靠近活化位
    let isNear = false;
    if (type === "molecule") {
      isNear = isNearActivation(idx, enzymeIdx);
    } else if (type === "enzyme") {
      const sCenter = getCenter(substrate.el);
      const aCenter = getCenter(enzyme.activation);
      const dist = distance(sCenter, aCenter);
      isNear = dist < ACTIVATION_SITE_RADIUS;
    }
    if (!isNear) continue;

    // 多受質合成：需等所有受質到齊才觸發
    if (!enzyme.boundMolecules) enzyme.boundMolecules = [];
    if (enzyme.boundMolecules.includes(substrate)) {
      continue;
    }

    function countTypes(arr) {
      const map = {};
      arr.forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
      return map;
    }

    const requiredTypes = rule.substrates;
    const reqCount = countTypes(requiredTypes);
    const curCount = countTypes(enzyme.boundMolecules.map((m) => m.type));
    const subType = substrate.type;
    if ((curCount[subType] || 0) >= (reqCount[subType] || 0)) {
      continue;
    }

    enzyme.boundMolecules.push(substrate);
    substrate.el.style.pointerEvents = "none";
    substrate.stopBrownian && substrate.stopBrownian();
    substrate.updatePosition(enzyme.x, enzyme.y);
    const enzymeAngle = enzyme.angle || 0;
    substrate.el.style.transition = "filter 0.2s, transform 0.4s";
    substrate.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
    substrate.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
    enzyme.el.style.transition = "filter 0.2s, transform 0.2s";
    enzyme.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
    enzyme.el.style.transform = `scale(1.08) rotate(${enzymeAngle}deg)`;

    // 判斷是否所有受質到齊
    const currentTypes = enzyme.boundMolecules.map((m) => m.type);
    const curCount2 = countTypes(currentTypes);
    let allArrived = true;
    for (const t in reqCount) {
      if (curCount2[t] !== reqCount[t]) {
        allArrived = false;
        break;
      }
    }
    for (const t in curCount2) {
      if (!(t in reqCount)) {
        allArrived = false;
        break;
      }
    }

    if (allArrived && !enzyme.reacting) {
      enzyme.reacting = true;
      setTimeout(() => {
        substrate.el.style.filter = "";
        substrate.el.style.transform = `rotate(${enzymeAngle}deg)`;
        enzyme.el.style.filter = "";
        enzyme.el.style.transform = `rotate(${enzymeAngle}deg)`;
        // 取得受質索引（molecules 或 enzymes）
        const idxs = enzyme.boundMolecules.map((m) => {
          let idxM = state.molecules.indexOf(m);
          if (idxM !== -1) return { idx: idxM, type: "molecule" };
          let idxE = state.enzymes.indexOf(m);
          if (idxE !== -1) return { idx: idxE, type: "enzyme" };
          return null;
        }).filter(i => i !== null);
        enzyme.boundMolecules = [];
        triggerReaction(idxs, enzymeIdx, rule);
        enzyme.reacting = false;
      }, 300);
      return;
    }
    break;
  }
}


function createProduct(src, center, angle) {
  let type = src;
  let x = center.x - 20;
  let y = center.y - 20;
  let molecule = new Molecule(type, x, y, 0);
  state.molecules.push(molecule);
  state.moleculeCount[type] = (state.moleculeCount[type] || 0) + 1;
  molecule.startBrownian && molecule.startBrownian();

  // 給予初速（噴射）
  let v = 3 + Math.random() * 2;
  molecule.vx = Math.cos(angle) * v;
  molecule.vy = Math.sin(angle) * v;
  molecule._productDamping = 0.96; // 給一個 damping 屬性，動畫過程中用

  // 給予初始旋轉速度
  molecule._rot = 0;
  molecule._rotSpeed = (Math.random() - 0.5) * 8;
  molecule._rotDamping = 0.96;

  bindDraggable();
}

function addEnzymeFromToolbox(enzymeType, x, y, angle) {
  const rule = reactions.find((r) => r.type === enzymeType);
  const denatureTemp = rule && rule.denatureTemp ? rule.denatureTemp : 50; // 預設50
  const enzyme = new Enzyme(enzymeType, x, y, angle, denatureTemp);
  const temp = parseInt(tempSlider.value, 10);
  enzyme.randomizeVelocity(temp, ENZYME_BROWNIAN_SPEED_RATIO);  
  enzyme.checkDenature(temp);
  state.enzymes.push(enzyme);
  state.enzymeCount[enzymeType] = (state.enzymeCount[enzymeType] || 0) + 1;
  if (brownianSwitch.checked && enzyme.startBrownian) {
    enzyme.startBrownian();
  }
  bindDraggable();
}

function addMoleculeFromToolbox(moleculeType, x, y) {
  const angle = Math.floor(Math.random() * 360);
  const temp = parseInt(tempSlider.value, 10);
  const molecule = new Molecule(moleculeType, x, y, angle);
  molecule.randomizeVelocity(temp);
  state.molecules.push(molecule);
  state.moleculeCount[moleculeType] = (state.moleculeCount[moleculeType] || 0) + 1;
  // Enable Brownian motion for the new molecule if the switch is checked
  if (brownianSwitch.checked && molecule.startBrownian) {
    molecule.startBrownian();
  }
  bindDraggable();
}

function handleTempSliderInput() {
  const t = parseInt(tempSlider.value, 10);
  tempValue.textContent = t;
  state.enzymes.forEach((e) => e.checkDenature(t));
}

function startDrag(e, type, idx) {
  if (type === "enzyme") {
    state.dragging = state.enzymes[idx];
    state.dragging.stopBrownian && state.dragging.stopBrownian();
  } else if (type === "molecule") {
    state.dragging = state.molecules[idx];
    state.dragging.stopBrownian && state.dragging.stopBrownian();
  }
  state.dragType = type;
  state.dragIndex = idx;
  const rect = state.dragging.el.getBoundingClientRect();
  state.offsetX = e.clientX - rect.left;
  state.offsetY = e.clientY - rect.top;
  state.dragging.el.style.filter = "brightness(1.2) drop-shadow(0 0 8px #00bcd4)";
  // 設定自訂 ghost image
  if (e.dataTransfer) {
    e.dataTransfer.setDragImage(state.dragging.el, 20, 20);
  } else if (typeof e.target.setPointerCapture === "function") {
    try {
      const ghost = state.dragging.el.cloneNode(true);
      ghost.style.position = "absolute";
      ghost.style.left = "-9999px";
      ghost.style.top = "-9999px";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "1";
      ghost.style.transform = state.dragging.el.style.transform;
      document.body.appendChild(ghost);
      e.target.setPointerCapture(e.pointerId);
      setTimeout(() => ghost.remove(), 1000);
    } catch {}
  }
  state.dragging.el.setPointerCapture(e.pointerId);
}

canvas.onpointermove = function (e) {
  if (!state.dragging) return;
  const canvasRect = canvas.getBoundingClientRect();
  let x = e.clientX - canvasRect.left - state.offsetX;
  let y = e.clientY - canvasRect.top - state.offsetY;
  x = Math.max(0, Math.min(canvasRect.width - 40, x));
  y = Math.max(0, Math.min(canvasRect.height - 40, y));
  state.dragging.updatePosition(x, y);
  // 立即同步 ghost/本體旋轉
  if (state.dragging.angle !== undefined) {
    state.dragging.setAngle(state.dragging.angle);
  }
  if (state.dragType === "enzyme") updateActivationSites();

  if (state.dragType === "molecule") {
    let near = false;
    let enzymeAngle = 0;
    for (let enzymeIdx = 0; enzymeIdx < state.enzymes.length; enzymeIdx++) {
      const enzyme = state.enzymes[enzymeIdx];
      if (!enzyme) continue;
      const rule = reactions.find(
        (r) => r.type === enzyme.type && r.substrates.includes(state.dragging.type)
      );
      if (rule && isNearActivation(state.dragIndex, enzymeIdx)) {
        near = true;
        enzymeAngle = enzyme.angle || 0;
        break;
      }
    }
    if (near) {
      state.dragging.el.style.transition = "filter 0.2s, transform 0.4s";
      state.dragging.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
      state.dragging.el.style.transform = `scale(1.15) rotate(${enzymeAngle})deg`;
    } else {
      state.dragging.el.style.transition = "filter 0.2s, transform 0.4s";
      state.dragging.el.style.filter = "";
      state.dragging.el.style.transform = `rotate(${state.dragging.angle || 0}deg)`;
    }
  }
};

// pointerup 時才做實際吸附
canvas.onpointerup = function (e) {
  if (state.dragging) state.dragging.el.style.filter = "";

  if (state.dragType === "molecule") {
    trySnapToAnyActivation(state.dragIndex,"molecule");
  } else if (state.dragType === "enzyme") {
    trySnapToAnyActivation(state.dragIndex, "enzyme");
  }
  /*
  } else if (state.dragType === "enzyme") {
    for (let i = 0; i < state.molecules.length; i++) {
      trySnapToAnyActivation(i, "enzyme");
    }      
  }
  */

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
      if (state.dragType === "enzyme") {
        state.enzymes[state.dragIndex].remove();
        state.enzymes.splice(state.dragIndex, 1);
        bindDraggable();
      } else if (state.dragType === "molecule") {

        // 同步移除所有酵素的 boundMolecules 參照
        state.enzymes.forEach(enzyme => {
          if (enzyme.boundMolecules) {
            enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[state.dragIndex]);
          }
        });        
        state.molecules[state.dragIndex].remove();
        state.molecules.splice(state.dragIndex, 1);
        bindDraggable();
      }
      state.dragging = null;
      state.dragType = null;
      state.dragIndex = -1;
      return;
    }
  }

  state.dragging = null;
  state.dragType = null;
  state.dragIndex = -1;
};
canvas.onpointerleave = canvas.onpointerup;

// --- Touch 支援：點擊工具箱圖示，點 canvas 新增 ---
if (toolbox && canvas) {
  toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
    // 滑鼠拖曳已支援，這裡加觸控/點擊
    item.addEventListener("touchstart", (e) => {
      e.preventDefault();
      state.pendingToolboxItem = item;
      // 可加 highlight 效果
      item.style.boxShadow = "0 0 0 3px #00bcd4";
    });
    item.addEventListener("click", (e) => {
      // 桌機點擊也可用
      state.pendingToolboxItem = item;
      item.style.boxShadow = "0 0 0 3px #00bcd4";
    });
  });

  // 點 canvas 新增
  canvas.addEventListener("touchstart", (e) => {
    if (state.pendingToolboxItem) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      let x = touch.clientX - rect.left - 20;
      let y = touch.clientY - rect.top - 20;
      let angle = Math.floor(Math.random() * 360);
      const type = state.pendingToolboxItem.dataset.type;
      const enzymeType = state.pendingToolboxItem.dataset.enzymetype;
      const moleculeType = state.pendingToolboxItem.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        addEnzymeFromToolbox(enzymeType, x, y, angle);
      } else if (type === "molecule" && moleculeType) {
        addMoleculeFromToolbox(moleculeType, x, y);
      }
      state.pendingToolboxItem.style.boxShadow = "";
      state.pendingToolboxItem = null;
    }
  });
  canvas.addEventListener("click", (e) => {
    if (state.pendingToolboxItem) {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - 20;
      let y = e.clientY - rect.top - 20;
      let angle = Math.floor(Math.random() * 360);
      const type = state.pendingToolboxItem.dataset.type;
      const enzymeType = state.pendingToolboxItem.dataset.enzymetype;
      const moleculeType = state.pendingToolboxItem.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        addEnzymeFromToolbox(enzymeType, x, y, angle);
      } else if (type === "molecule" && moleculeType) {
        addMoleculeFromToolbox(moleculeType, x, y);
      }
      state.pendingToolboxItem.style.boxShadow = "";
      state.pendingToolboxItem = null;
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
    x10btn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault(); // 防止點兩次
      // ...與 click 內容相同...
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
        const targets = state.enzymes.filter(e => e.type === enzymeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = state.enzymes.findIndex(e => e.type === enzymeType);
          if (idx !== -1) {
            // 釋放已結合的受質
            const enzyme = state.enzymes[idx];
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
            state.enzymes[idx].remove();
            state.enzymes.splice(idx, 1);
            state.enzymeCount[enzymeType] = Math.max(0, (state.enzymeCount[enzymeType] || 1) - 1);
          }
        }
        bindDraggable();
      } else if (type === "molecule" && moleculeType) {
        // 找出畫面上所有該類型分子
        const targets = state.molecules.filter(m => m.type === moleculeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = state.molecules.findIndex(m => m.type === moleculeType);
          if (idx !== -1) {
            // 同步移除所有酵素的 boundMolecules 參照 ---
            state.enzymes.forEach(enzyme => {
              if (enzyme.boundMolecules) {
                enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[idx]);
              }
            });            
            state.molecules[idx].remove();
            state.molecules.splice(idx, 1);
            state.moleculeCount[moleculeType] = Math.max(0, (state.moleculeCount[moleculeType] || 1) - 1);
          }
        }
        bindDraggable();
      }
    });

    minus10btn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault(); // 防止點兩次
      // ...與 click 內容相同...
      const type = minus10btn.dataset.type;
      const enzymeType = minus10btn.dataset.enzymetype;
      const moleculeType = minus10btn.dataset.moleculetype;
      if (type === "enzyme" && enzymeType) {
        // ...原本移除酵素內容...
        const targets = state.enzymes.filter(e => e.type === enzymeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = state.enzymes.findIndex(e => e.type === enzymeType);
          if (idx !== -1) {
            // 釋放已結合的受質
            const enzyme = state.enzymes[idx];
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
            state.enzymes[idx].remove();
            state.enzymes.splice(idx, 1);
            state.enzymeCount[enzymeType] = Math.max(0, (state.enzymeCount[enzymeType] || 1) - 1);
          }
        }
        bindDraggable();
      } else if (type === "molecule" && moleculeType) {
        // ...原本移除分子內容...
        const targets = state.molecules.filter(m => m.type === moleculeType);
        const removeCount = Math.min(10, targets.length);
        for (let i = 0; i < removeCount; i++) {
          const idx = state.molecules.findIndex(m => m.type === moleculeType);
          if (idx !== -1) {
            state.enzymes.forEach(enzyme => {
              if (enzyme.boundMolecules) {
                enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[idx]);
              }
            });
            state.state.molecules[idx].remove();
            state.state.molecules.splice(idx, 1);
            state.moleculeCount[moleculeType] = Math.max(0, (state.moleculeCount[moleculeType] || 1) - 1);
          }
        }
        bindDraggable();
      }
    });    
  });

}
// --- Touch 拖曳支援（for mobile/tablet）---

toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
  item.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    state.draggingType = item.dataset.type;
    state.draggingEnzymeType = item.dataset.enzymetype;
    state.draggingMoleculeType = item.dataset.moleculetype;
    // 建立 ghost image
    state.draggingGhost = item.cloneNode(true);
    state.draggingGhost.style.position = "fixed";
    state.draggingGhost.style.left = touch.clientX - 20 + "px";
    state.draggingGhost.style.top = touch.clientY - 20 + "px";
    state.draggingGhost.style.opacity = "0.7";
    state.draggingGhost.style.pointerEvents = "none";
    state.draggingGhost.style.zIndex = 9999;
    document.body.appendChild(state.draggingGhost);
  });
  item.addEventListener("touchmove", (e) => {
    if (!state.draggingGhost) return;
    const touch = e.touches[0];
    state.draggingGhost.style.left = touch.clientX - 20 + "px";
    state.draggingGhost.style.top = touch.clientY - 20 + "px";
  });
  item.addEventListener("touchend", (e) => {
    if (state.draggingGhost) {
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
        if (state.draggingType === "enzyme" && state.draggingEnzymeType) {
          addEnzymeFromToolbox(state.draggingEnzymeType, x, y, angle);
        } else if (state.draggingType === "molecule" && state.draggingMoleculeType) {
          addMoleculeFromToolbox(state.draggingMoleculeType, x, y);
        }
      }
      state.draggingGhost.remove();
      state.draggingGhost = null;
      state.draggingType = null;
      state.draggingEnzymeType = null;
      state.draggingMoleculeType = null;
    }
  });
});

clearAll();
setInterval(updateConcentrationChart, 1000); // 每秒更新
globalAnimationLoop();

if (tempSlider && tempValue) {
  tempSlider.addEventListener("input", handleTempSliderInput);
}

document.getElementById('reset-btn').onclick = function() {
  clearAll(); // 清除所有分子/酵素/產物
  if (state.charts.concentration) {
    state.chartData.concentration.labels = [];
    state.chartData.concentration.datasets.forEach(ds => ds.data = []);
    state.chartTime = 0;
    state.charts.concentration.update();
  }
};

// 主程式啟動
window.addEventListener("DOMContentLoaded", () => {
  renderAll();  
  initConcentrationChart();
});

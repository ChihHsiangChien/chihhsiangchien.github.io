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
import { state, 
  ACTIVATION_SITE_RADIUS, 
  GRID_SIZE, 
  ENZYME_BROWNIAN_SPEED_RATIO, 
  AUTO_DETECT_BATCH } from "./state.js";
import { bindUIEvents } from "./ui.js";
import { globalAnimationLoop, autoDetectBinding } from "./animation.js";


export const substrateToEnzymeTypes = {};
reactions.forEach(r => {
  (r.substrates || []).forEach(s => {
    if (!substrateToEnzymeTypes[s]) substrateToEnzymeTypes[s] = [];
    substrateToEnzymeTypes[s].push(r.type);
  });
});

const canvas = document.getElementById("canvas");
const tempSlider = document.getElementById("temp-slider");
const tempValue = document.getElementById("temp-value");
const toolbox = document.getElementById("toolbox");
let brownianSwitch = document.getElementById("brownian-switch");


export function buildGrid() {
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


export function isNearActivation(idx, enzymeIdx) {
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

export function randomPosX() {
  return Math.floor(Math.random() * (canvas.clientWidth - 40));
}
export function randomPosY() {
  return Math.floor(Math.random() * (canvas.clientHeight - 40));
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


export function updateCurrentChart() {
  const type = state.currentChartType;
  if (type === "concentration") {
    updateConcentrationChart();
  }
  // 之後可加其他 chart 的更新
}


function renderAll() {
  updateAllBrownian();
  updateActivationSites();
  bindDraggable();
}

// --- 物件導向清除 ---
export function clearAll() {
  state.enzymes.forEach((e) => e.remove());
  state.molecules.forEach((m) => m.remove && m.remove());
  state.enzymes = [];
  state.molecules = [];
  state.enzymeCount = {};
  state.moleculeCount = {};  
}

// 啟動/停止所有分子的布朗運動（全域）
export function updateAllBrownian() {
  state.molecules.forEach((m) => {
    m.brownianActive = brownianSwitch.checked;
  });
  state.enzymes.forEach((e) => {
    e.brownianActive = brownianSwitch.checked;
  });
}

export function updateActivationSites() {
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

export function bindDraggable() {
  state.enzymes.forEach((enzyme, idx) => {
    enzyme.el.onpointerdown = (e) => startDrag(e, "enzyme", idx);
  });
  state.molecules.forEach((molecule, idx) => {
    molecule.el.onpointerdown = (e) => startDrag(e, "molecule", idx);
  });
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
  if (state.enzymes[enzymeIdx] && state.enzymes[enzymeIdx].activation) {
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
}

// 嘗試讓受質吸附到任一活化位
export function trySnapToAnyActivation(idx, type = "molecule") {

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

export function addEnzymeFromToolbox(enzymeType, x, y, angle) {
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

export function addMoleculeFromToolbox(moleculeType, x, y) {
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

export function handleTempSliderInput() {
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

}

clearAll();
setInterval(updateConcentrationChart, 1000); // 每秒更新
globalAnimationLoop();

// 主程式啟動
window.addEventListener("DOMContentLoaded", () => {
  renderAll();  
  bindUIEvents();
  initConcentrationChart();
});

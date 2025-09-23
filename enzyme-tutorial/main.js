// --- 反應規則外部化 ---
import { reactions } from "./enzyme-reactions.js";
import { Enzyme } from "./enzyme.js";
import { Molecule } from "./molecule.js";
import {
  getGridKey,
  getCenter,
  distance,
  countTypes
} from "./utils.js";
import { state, 
  ACTIVATION_SITE_RADIUS, 
  GRID_SIZE, 
  ENZYME_BROWNIAN_SPEED_RATIO, 
  AUTO_DETECT_BATCH } from "./state.js";
import { bindUIEvents } from "./ui.js";
import { renderToolbox } from "./ui.js";

import { globalAnimationLoop, autoDetectBinding } from "./animation.js";
import { initConcentrationChart, updateConcentrationChart, updateCurrentChart } from "./chart.js";
import { triggerReaction, createProduct } from "./reaction.js";

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

/**
 * 通用新增物件到畫布
 * @param {'enzyme'|'molecule'} type
 * @param {string} itemType
 * @param {number} x
 * @param {number} y
 * @param {number} [angle]
 */
export function addItemFromToolbox(type, itemType, x, y, angle) {
  const temp = parseInt(tempSlider.value, 10);
  if (type === "enzyme") {
    const rule = reactions.find((r) => r.type === itemType);
    const denatureTemp = rule && rule.denatureTemp ? rule.denatureTemp : 50;
    const enzyme = new Enzyme(itemType, x, y, angle, denatureTemp);
    enzyme.randomizeVelocity(temp, ENZYME_BROWNIAN_SPEED_RATIO);
    enzyme.checkDenature(temp);
    state.enzymes.push(enzyme);
    state.enzymeCount[itemType] = (state.enzymeCount[itemType] || 0) + 1;
    if (brownianSwitch.checked && enzyme.startBrownian) {
      enzyme.startBrownian();
    }
  } else if (type === "molecule") {
    const finalAngle = angle !== undefined ? angle : Math.floor(Math.random() * 360);
    const molecule = new Molecule(itemType, x, y, finalAngle);
    molecule.randomizeVelocity(temp);
    state.molecules.push(molecule);
    state.moleculeCount[itemType] = (state.moleculeCount[itemType] || 0) + 1;
    if (brownianSwitch.checked && molecule.startBrownian) {
      molecule.startBrownian();
    }
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

clearAll();
setInterval(updateConcentrationChart, 1000); // 每秒更新
globalAnimationLoop();

// 主程式啟動
window.addEventListener("DOMContentLoaded", () => {
  renderToolbox(toolbox);  
  renderAll();  
  bindUIEvents();
  initConcentrationChart();
});

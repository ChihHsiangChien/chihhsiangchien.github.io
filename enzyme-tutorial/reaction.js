import { state } from "./state.js";
import { Molecule } from "./molecule.js";
import { getCenter} from "./utils.js";
import { bindDraggable } from "./ui.js";
import { soundCache } from "./main.js";

// triggerReaction 支援酵素作為受質
export function triggerReaction(idxs, enzymeIdx, rule) {
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
    // 複製一個新的 Audio 物件，確保可同時播放
    const src = rule.sound;
    if (soundCache[src]) {
      const audio = soundCache[src].cloneNode();
      audio.currentTime = 0;
      audio.play();
    } else {
      // 備援：直接 new
      const audio = new Audio(src);
      audio.play();
    }
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

export function createProduct(src, center, angle) {
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
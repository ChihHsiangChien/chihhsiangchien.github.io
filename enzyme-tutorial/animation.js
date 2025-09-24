import { state, 
  ACTIVATION_SITE_RADIUS, 
  GRID_SIZE, 
  ENZYME_BROWNIAN_SPEED_RATIO, 
  AUTO_DETECT_BATCH } from "./state.js";
import {
  getNeighborKeys,
  temperatureToSpeed,
  getCenter,
  distance,
} from "./utils.js";

import{ buildGrid, isNearActivation, trySnapToAnyActivation } from "./main.js";
import { substrateToEnzymeTypes } from "./main.js";
import { reactions } from "./enzyme-reactions.js";

const canvas = document.getElementById("canvas");
const brownianSwitch = document.getElementById("brownian-switch");
const tempSlider = document.getElementById("temp-slider");

export function globalAnimationLoop() {
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

    // 只有布朗運動開啟時才執行布朗運動
    if (m.brownianActive && state.brownianEnabled) {
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
    if (e.brownianActive && state.brownianEnabled) {
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


// 自動偵測分子或酵素靠近活化位並吸附（支援酵素作為受質）
export function autoDetectBinding() {
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


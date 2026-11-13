/**
 * 心臟收縮舒張、瓣膜開闔、心肺延伸循環與「單一血液粒子」同步流動模擬
 * 特色：
 * 1. 100% 保留原本的心臟圖層 (atriaLayer、ventriclesLayer、valvesLayer) 與心房/心室輪流收縮動畫 (0.8s 週期)。
 * 2. 向外延伸肺動脈至左右肺臟 (Right / Left lung)、肺內微血管與肺靜脈回流，並將主動脈弓延伸往下成為下行主動脈直達「送往全身 (To body)」。
 * 3. 單一血液粒子完整 9 站旅程與「連續兩次心動週期 (2 × 0.8s = 1.6s)」完全生理同步：
 *    - 第 1 次心跳 (0.0~0.8s)：① 大靜脈 → ② 右心房收縮(0~0.1s) → ③ 右心室收縮(0.1~0.22s) → ④ 肺動脈(0.22~0.4s) → ⑤ 肺臟氣體交換(0.4~0.62s) → ⑥ 肺靜脈回左心房(0.62~0.8s)
 *    - 第 2 次心跳 (0.8~1.6s)：⑦ 左心房收縮(0.8~0.9s) → ⑧ 左心室強搏(0.9~1.04s) → ⑨ 主動脈弓與延長下行主動脈送往全身(1.04~1.6s)
 * 4. 支援滑鼠滾輪縮放 (Zoom)、按住拖曳平移 (Pan)、一鍵隱藏/顯示肺臟、一鍵聚焦心臟。
 */

const state = {
  isPlaying: true,
  journeyTime: 0.05,      // 0.0 ~ 1.6s (涵蓋 2 個 0.8s 心動週期，完成單一粒子 9 站完整循環)
  cycleTime: 0.05,        // 0.0 ~ 0.8s (當前單一心動週期時間 = journeyTime % 0.8)
  cycleDuration: 0.8,
  journeyDuration: 1.6,
  speed: 0.4,
  particleMode: "both",   // "both" | "single" | "swarm"
  veinPreference: "auto", // "auto" | "ivc" | "svc"
  currentVein: "ivc",     // "ivc" (下大靜脈) | "svc" (上大靜脈)
  lungPreference: "auto", // "auto" | "right" | "left"
  currentLung: "right",   // "right" (畫面左側右肺) | "left" (畫面右側左肺)
  showLungs: true,
  showLabels: true,
  // Pan & Zoom viewBox 狀態 (預設全景視角：涵蓋左右肺與下行主動脈)
  vb: { x: -190, y: -45, w: 980, h: 680 }
};

const FULL_VIEWBOX = { x: -190, y: -45, w: 980, h: 680 };
const HEART_VIEWBOX = { x: 20, y: -35, w: 560, h: 650 };

// ==================== 1. 原本的群體血流軌跡 (延伸覆蓋肺動脈分支與下行主動脈) ====================
const FLOW_PATHS = [
  // 1. 上大靜脈 -> 右心房
  {
    color: "#2563eb",
    activeIn: ["ventricular", "diastole"],
    lungOnly: false,
    points: [[155, 65], [155, 115], [155, 165], [155, 212]]
  },
  // 2. 下大靜脈 (From body) -> 右心房
  {
    color: "#2563eb",
    activeIn: ["ventricular", "diastole"],
    lungOnly: false,
    points: [[128, 585], [123, 495], [126, 405], [138, 340], [152, 285]]
  },
  // 3. 肺靜脈 (上、下兩支) -> 左心房
  {
    color: "#dc2626",
    activeIn: ["ventricular", "diastole"],
    lungOnly: false,
    points: [[540, 163], [495, 180], [455, 192], [418, 205]]
  },
  {
    color: "#dc2626",
    activeIn: ["ventricular", "diastole"],
    lungOnly: false,
    points: [[545, 221], [500, 225], [455, 228], [418, 232]]
  },
  // 4. 右心房 -> 三尖瓣口 -> 右心室
  {
    color: "#2563eb",
    activeIn: ["atrial", "diastole"],
    lungOnly: false,
    points: [[162, 245], [186, 298], [212, 360], [242, 425], [262, 465]]
  },
  // 5. 左心房 -> 二尖瓣口 -> 左心室
  {
    color: "#dc2626",
    activeIn: ["atrial", "diastole"],
    lungOnly: false,
    points: [[406, 235], [382, 278], [364, 345], [346, 415], [334, 465]]
  },
  // 6. 右心室 -> 肺動脈瓣口 (248,248) -> 肺動脈主幹與左右分叉
  {
    color: "#2563eb",
    activeIn: ["ventricular"],
    lungOnly: false,
    points: [[258, 445], [246, 365], [244, 295], [248, 248], [260, 182], [278, 128], [295, 88]]
  },
  {
    color: "#2563eb",
    activeIn: ["ventricular"],
    lungOnly: true,
    points: [[295, 88], [200, 70], [105, 78], [15, 108]]
  },
  {
    color: "#2563eb",
    activeIn: ["ventricular"],
    lungOnly: true,
    points: [[295, 88], [390, 70], [485, 78], [575, 108]]
  },
  // 7. 左心室 -> 主動脈瓣口 (318,248) -> 主動脈弓 -> 向下延伸的下行主動脈 (To body)
  {
    color: "#dc2626",
    activeIn: ["ventricular"],
    lungOnly: false,
    points: [
      [334, 445], [322, 365], [320, 295], [318, 248],
      [314, 175], [318, 105], [338, 52], [392, 14],
      [452, 56], [476, 165], [488, 340], [498, 480], [505, 590]
    ]
  }
];

const swarmParticles = [];
FLOW_PATHS.forEach((pathObj) => {
  const count = pathObj.points.length > 7 ? 6 : 3;
  for (let i = 0; i < count; i++) {
    swarmParticles.push({
      path: pathObj,
      progress: i / count
    });
  }
});

// ==================== 2. 單一血液粒子 9 站完整循環定義 (與 1.6s 雙心跳週期同步) ====================
const SINGLE_PARTICLE_STAGES = [
  {
    index: 0,
    tStart: 0.00,
    tEnd: 0.04,
    name: "① 來自全身 (下大靜脈)",
    shortTag: "① 來自全身 CO₂",
    statusText: "減氧血 (藍色 CO₂↑)",
    type: "deox",
    desc: "全身組織消耗氧氣後的<strong>減氧血（藍色）</strong>由下方「來自全身 (From body)」經下大靜脈回流至右心房入口。"
  },
  {
    index: 1,
    tStart: 0.04,
    tEnd: 0.11,
    name: "② 右心房 (心房收縮擠血)",
    shortTag: "② 右心房收縮",
    statusText: "減氧血 (右心房收縮 → 三尖瓣開)",
    type: "deox",
    desc: "進入<strong>右心房 (Right atrium)</strong>；此時正值 0.0~0.1s <strong>心房收縮期</strong>，三尖瓣開啟，將血液粒子擠入右心室。"
  },
  {
    index: 2,
    tStart: 0.11,
    tEnd: 0.22,
    name: "③ 右心室 (心室收縮搏血)",
    shortTag: "③ 右心室收縮",
    statusText: "減氧血 (右心室收縮 → 肺動脈瓣開)",
    type: "deox",
    desc: "抵達<strong>右心室 (Right ventricle)</strong>；進入 0.1~0.4s <strong>心室收縮期</strong>，三尖瓣關閉防逆流、肺動脈瓣開啟，將減氧血往上射出。"
  },
  {
    index: 3,
    tStart: 0.22,
    tEnd: 0.40,
    name: "④ 肺動脈 (T字分叉往肺臟)",
    shortTag: "④ 肺動脈運送",
    statusText: "減氧血 (肺動脈往肺臟)",
    type: "deox",
    desc: "血液粒子沿<strong>肺動脈 (Pulmonary arteries)</strong> 主幹向上射出，於頂部 T 字分叉延伸進入左、右肺臟微血管。"
  },
  {
    index: 4,
    tStart: 0.40,
    tEnd: 0.62,
    name: "⑤ 肺臟微血管氣體交換 (藍變紅)",
    shortTag: "⑤ O₂↑ 氣體交換",
    statusText: "肺泡氣體交換 (藍 → 紫 → 紅 O₂↑)",
    type: "exchange",
    desc: "於<strong>肺臟 (Right / Left lung)</strong> 微血管網排出二氧化碳並吸收氧氣，單一血液粒子由<strong>藍色減氧血平滑轉變為鮮紅色充氧血</strong>！"
  },
  {
    index: 5,
    tStart: 0.62,
    tEnd: 0.80,
    name: "⑥ 肺靜脈 (充氧血回流左心房)",
    shortTag: "⑥ 肺靜脈 O₂",
    statusText: "充氧血 (紅色 O₂↑ 回流左心房)",
    type: "ox",
    desc: "完成充氧的<strong>鮮紅色血液粒子</strong>匯集至<strong>肺靜脈 (Pulmonary veins)</strong>，於舒張期回流進入左心房。"
  },
  {
    index: 6,
    tStart: 0.80,
    tEnd: 0.90,
    name: "⑦ 左心房 (心房收縮擠血)",
    shortTag: "⑦ 左心房收縮",
    statusText: "充氧血 (左心房收縮 → 二尖瓣開)",
    type: "ox",
    desc: "在<strong>左心房 (Left atrium)</strong> 遇上第二次心跳的 0.0~0.1s <strong>心房收縮期</strong>，二尖瓣開啟，將充氧血粒子推入左心室。"
  },
  {
    index: 7,
    tStart: 0.90,
    tEnd: 1.04,
    name: "⑧ 左心室 (心室強搏射血)",
    shortTag: "⑧ 左心室強搏",
    statusText: "充氧血 (左心室收縮 → 主動脈瓣開)",
    type: "ox",
    desc: "進入厚實的<strong>左心室 (Left ventricle)</strong>；0.1~0.4s <strong>心室強力收縮</strong>，二尖瓣關閉、主動脈瓣開啟，將粒子高速射入主動脈。"
  },
  {
    index: 8,
    tStart: 1.04,
    tEnd: 1.60,
    name: "⑨ 主動脈弓與下行主動脈 (送往全身)",
    shortTag: "⑨ 主動脈送往全身",
    statusText: "充氧血 (沿下行主動脈 To body)",
    type: "ox",
    desc: "充氧血粒子經升主動脈跨越頂部<strong>主動脈弓 (Aorta)</strong>，沿著<strong>延長往下的下行主動脈</strong>一路直達右下角「送往全身 (To body)」！"
  }
];

function getSingleParticleWaypoints(stageIdx, lungSide, showLungs, veinSide = "ivc") {
  const useRightLung = lungSide === "right";
  const useSvc = veinSide === "svc";
  switch (stageIdx) {
    case 0: // ① 來自全身 -> 大靜脈 (下大靜脈或上大靜脈) -> 右心房開口
      if (useSvc) {
        return [
          [155, 55],
          [155, 115],
          [155, 165],
          [155, 216]
        ];
      } else {
        return [
          [128, 590],
          [123, 490],
          [127, 390],
          [152, 285]
        ];
      }
    case 1: // ② 右心房 -> 三尖瓣口
      if (useSvc) {
        return [
          [155, 216],
          [160, 255],
          [188, 298]
        ];
      } else {
        return [
          [152, 285],
          [156, 240],
          [188, 298]
        ];
      }
    case 2: // ③ 右心室腔內 -> 肺動脈瓣口 (248, 248)
      return [
        [188, 298],
        [222, 385],
        [262, 465],
        [252, 355],
        [248, 248]
      ];
    case 3: // ④ 肺動脈主幹 -> T字分叉 -> 進入肺臟
      if (!showLungs) {
        return [[248, 248], [260, 185], [278, 128], [295, 88]];
      }
      if (useRightLung) {
        return [
          [248, 248],
          [260, 185],
          [278, 128],
          [295, 88],
          [195, 70],
          [95, 78],
          [15, 108]
        ];
      } else {
        return [
          [248, 248],
          [260, 185],
          [278, 128],
          [295, 88],
          [395, 70],
          [495, 78],
          [575, 108]
        ];
      }
    case 4: // ⑤ 肺臟微血管氣體交換 (藍 -> 紫 -> 紅)
      if (!showLungs) {
        return [[295, 88], [420, 115], [540, 162]];
      }
      if (useRightLung) {
        return [
          [15, 108],
          [-8, 165],
          [-85, 175],
          [-95, 232],
          [-35, 232],
          [18, 225]
        ];
      } else {
        return [
          [575, 108],
          [598, 165],
          [675, 165],
          [682, 225],
          [615, 222],
          [555, 220]
        ];
      }
    case 5: // ⑥ 肺靜脈 -> 左心房
      if (!showLungs) {
        return [[540, 162], [495, 180], [455, 192], [412, 215]];
      }
      if (useRightLung) {
        return [
          [18, 225],
          [145, 152],
          [295, 152],
          [412, 198]
        ];
      } else {
        return [
          [555, 220],
          [505, 225],
          [458, 228],
          [412, 230]
        ];
      }
    case 6: // ⑦ 左心房 -> 二尖瓣口
      return [
        [412, 215],
        [405, 245],
        [381, 277]
      ];
    case 7: // ⑧ 左心室 -> 主動脈瓣口 (318, 248)
      return [
        [381, 277],
        [362, 365],
        [334, 465],
        [322, 355],
        [318, 248]
      ];
    case 8: // ⑨ 主動脈升部 -> 主動脈弓 -> 延長往下的下行主動脈 -> 送往全身 (To body)
      return [
        [318, 248],
        [314, 175],
        [318, 105],
        [338, 52],
        [365, 18],
        [392, 12],
        [425, 20],
        [452, 56],
        [475, 155],
        [488, 315],
        [498, 465],
        [505, 595]
      ];
    default:
      return useSvc ? [[155, 55], [155, 216]] : [[128, 590], [152, 285]];
  }
}

// 等弧長折線內插
function getPointOnPolyline(pts, t) {
  if (pts.length === 1) return pts[0];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lengths.push(len);
    total += len;
  }
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (acc + lengths[i] >= target || i === lengths.length - 1) {
      const frac = lengths[i] > 0 ? (target - acc) / lengths[i] : 0;
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * frac,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * frac
      ];
    }
    acc += lengths[i];
  }
  return pts[pts.length - 1];
}

function lerpColor(hex1, hex2, t) {
  const c1 = parseInt(hex1.slice(1), 16);
  const c2 = parseInt(hex2.slice(1), 16);
  const r = Math.round(((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t);
  const g = Math.round(((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t);
  const b = Math.round((c1 & 255) + ((c2 & 255) - (c1 & 255)) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function evaluateSingleParticle(journeyTime) {
  const jt = ((journeyTime % state.journeyDuration) + state.journeyDuration) % state.journeyDuration;
  let stage = SINGLE_PARTICLE_STAGES[SINGLE_PARTICLE_STAGES.length - 1];
  for (const st of SINGLE_PARTICLE_STAGES) {
    if (jt >= st.tStart && jt < st.tEnd) {
      stage = st;
      break;
    }
  }

  // 若為第 0 站 (大靜脈)，根據當前靜脈路徑動態更新標籤與名稱
  if (stage.index === 0) {
    const isSvc = state.currentVein === "svc";
    stage = {
      ...stage,
      name: isSvc ? "① 來自全身 (上大靜脈)" : "① 來自全身 (下大靜脈)",
      shortTag: isSvc ? "① 上大靜脈 CO₂" : "① 下大靜脈 CO₂"
    };
  }

  const localT = (jt - stage.tStart) / (stage.tEnd - stage.tStart);
  const waypoints = getSingleParticleWaypoints(stage.index, state.currentLung, state.showLungs, state.currentVein);
  const [x, y] = getPointOnPolyline(waypoints, localT);

  let color = "#2563eb";
  if (stage.type === "deox") {
    color = "#2563eb";
  } else if (stage.type === "ox") {
    color = "#dc2626";
  } else {
    color = localT < 0.5
      ? lerpColor("#2563eb", "#9333ea", localT * 2)
      : lerpColor("#9333ea", "#dc2626", (localT - 0.5) * 2);
  }

  return { stage, localT, x, y, color };
}

// ==================== 3. 原本的心動週期三階段判定、瓣膜開闔與心房心室輪流收縮 ====================
function getPhaseInfo(t) {
  if (t < 0.1) {
    return {
      key: "atrial",
      title: "① 心房收縮 / 心室舒張 (0.0 ~ 0.1s)",
      bg: "#fef3c7",
      color: "#92400e",
      avOpen: true,
      slOpen: false
    };
  } else if (t < 0.4) {
    return {
      key: "ventricular",
      title: "② 心室收縮 / 心房舒張 (0.1 ~ 0.4s)",
      bg: "#fee2e2",
      color: "#991b1b",
      avOpen: false,
      slOpen: true
    };
  } else {
    return {
      key: "diastole",
      title: "③ 全心舒張期 (0.4 ~ 0.8s)",
      bg: "#dbeafe",
      color: "#1e40af",
      avOpen: true,
      slOpen: false
    };
  }
}

// 100% 保留原本四組瓣膜開闔幾何
function updateValveGeometry(avOpen, slOpen) {
  const triLeft = document.getElementById("tri-leaf-left");
  const triRight = document.getElementById("tri-leaf-right");
  const mitralLeft = document.getElementById("mitral-leaf-left");
  const mitralRight = document.getElementById("mitral-leaf-right");

  if (avOpen) {
    triLeft.setAttribute("d", "M 166 308 Q 175 332 178 352");
    triRight.setAttribute("d", "M 214 290 Q 214 316 212 338");

    mitralLeft.setAttribute("d", "M 358 268 Q 358 294 360 316");
    mitralRight.setAttribute("d", "M 404 286 Q 395 312 392 332");
  } else {
    triLeft.setAttribute("d", "M 166 308 Q 178 302 190 299");
    triRight.setAttribute("d", "M 214 290 Q 202 296 190 299");

    mitralLeft.setAttribute("d", "M 358 268 Q 370 274 381 277");
    mitralRight.setAttribute("d", "M 404 286 Q 392 280 381 277");
  }

  const pulmLeft = document.getElementById("pulm-leaf-left");
  const pulmRight = document.getElementById("pulm-leaf-right");
  const aorticLeft = document.getElementById("aortic-leaf-left");
  const aorticRight = document.getElementById("aortic-leaf-right");

  if (slOpen) {
    pulmLeft.setAttribute("d", "M 230 248 Q 235 228 242 212");
    pulmRight.setAttribute("d", "M 266 248 Q 272 228 278 214");

    aorticLeft.setAttribute("d", "M 300 248 Q 294 228 288 212");
    aorticRight.setAttribute("d", "M 336 248 Q 330 228 324 212");
  } else {
    pulmLeft.setAttribute("d", "M 230 248 Q 239 255 248 248");
    pulmRight.setAttribute("d", "M 266 248 Q 257 255 248 248");

    aorticLeft.setAttribute("d", "M 300 248 Q 309 255 318 248");
    aorticRight.setAttribute("d", "M 336 248 Q 327 255 318 248");
  }
}

// 100% 保留原本的心房與心室錯開輪流收縮形變
function updateContractionTransform(t) {
  const rightAtrium = document.getElementById("rightAtriumGroup");
  const leftAtrium = document.getElementById("leftAtriumGroup");
  const ventricles = document.getElementById("ventriclesLayer");

  let atrialScale = 1.0;
  let ventScaleX = 1.0;
  let ventScaleY = 1.0;

  if (t < 0.1) {
    // ① 0.0 ~ 0.1s：心房收縮 (縮小)，此時心室舒張飽滿
    const p = Math.sin((t / 0.1) * Math.PI);
    atrialScale = 1.0 - 0.16 * p;
    ventScaleX = 1.0 + 0.04 * p;
    ventScaleY = 1.0 + 0.03 * p;
  } else if (t < 0.4) {
    // ② 0.1 ~ 0.4s：心室收縮 (向內擠壓縮小)，此時心房舒張接收靜脈血
    const p = Math.sin(((t - 0.1) / 0.3) * Math.PI);
    atrialScale = 1.0 + 0.04 * p;
    ventScaleX = 1.0 - 0.15 * p;
    ventScaleY = 1.0 - 0.10 * p;
  } else {
    // ③ 0.4 ~ 0.8s：全心舒張期
    const p = Math.sin(((t - 0.4) / 0.4) * Math.PI);
    atrialScale = 1.0 + 0.03 * p;
    ventScaleX = 1.0 + 0.03 * p;
    ventScaleY = 1.0 + 0.02 * p;
  }

  rightAtrium.style.transformOrigin = "190px 285px";
  rightAtrium.style.transform = `scale(${atrialScale})`;

  leftAtrium.style.transformOrigin = "380px 265px";
  leftAtrium.style.transform = `scale(${atrialScale})`;

  ventricles.style.transformOrigin = "285px 265px";
  ventricles.style.transform = `scale(${ventScaleX}, ${ventScaleY})`;
}

// ==================== 4. 繪製箭頭、群體粒子與單一高光血液粒子 ====================
function updateArrowsAndParticles(phaseKey, dt, singleState) {
  const arrowRaRv = document.getElementById("arrow-ra-rv");
  const arrowLaLv = document.getElementById("arrow-la-lv");
  const arrowRvPa = document.getElementById("arrow-rv-pa");
  const arrowLvAorta = document.getElementById("arrow-lv-aorta");

  if (phaseKey === "ventricular") {
    arrowRaRv.classList.add("hidden-arrow");
    arrowLaLv.classList.add("hidden-arrow");
    arrowRvPa.classList.remove("hidden-arrow");
    arrowLvAorta.classList.remove("hidden-arrow");
  } else {
    arrowRaRv.classList.remove("hidden-arrow");
    arrowLaLv.classList.remove("hidden-arrow");
    arrowRvPa.classList.add("hidden-arrow");
    arrowLvAorta.classList.add("hidden-arrow");
  }

  const container = document.getElementById("bloodParticlesLayer");
  container.innerHTML = "";

  // A. 繪製群體血流粒子 (當模式為 both 或 swarm 時)
  if (state.particleMode === "both" || state.particleMode === "swarm") {
    const swarmOpacity = state.particleMode === "both" ? "0.45" : "0.9";
    swarmParticles.forEach((p) => {
      if (p.path.lungOnly && !state.showLungs) return;
      if (!p.path.activeIn.includes(phaseKey)) return;

      const speedMultiplier = phaseKey === "atrial" || phaseKey === "ventricular" ? 1.7 : 1.05;
      p.progress = (p.progress + dt * speedMultiplier * state.speed) % 1;

      const [x, y] = getPointOnPolyline(p.path.points, p.progress);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x.toFixed(1));
      circle.setAttribute("cy", y.toFixed(1));
      circle.setAttribute("r", state.particleMode === "both" ? "5.2" : "6");
      circle.setAttribute("fill", p.path.color);
      circle.setAttribute("fill-opacity", swarmOpacity);
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "1.4");
      container.appendChild(circle);
    });
  }

  // B. 繪製單一高光追蹤血液粒子 (當模式為 both 或 single 時)
  if (state.particleMode === "both" || state.particleMode === "single") {
    // 1. 彗星動態尾跡
    const trailCount = 6;
    for (let i = trailCount; i >= 1; i--) {
      const trailTime = Math.max(0, state.journeyTime - i * 0.012);
      const tInfo = evaluateSingleParticle(trailTime);
      const trailDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      trailDot.setAttribute("cx", tInfo.x.toFixed(1));
      trailDot.setAttribute("cy", tInfo.y.toFixed(1));
      trailDot.setAttribute("r", (9.5 - i * 1.1).toFixed(1));
      trailDot.setAttribute("fill", tInfo.color);
      trailDot.setAttribute("fill-opacity", (0.52 - i * 0.07).toFixed(2));
      container.appendChild(trailDot);
    }

    // 2. 外層呼吸光圈
    const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo.setAttribute("cx", singleState.x.toFixed(1));
    halo.setAttribute("cy", singleState.y.toFixed(1));
    halo.setAttribute("r", "16");
    halo.setAttribute("fill", singleState.color);
    halo.setAttribute("fill-opacity", "0.24");
    halo.setAttribute("stroke", singleState.color);
    halo.setAttribute("stroke-width", "2");
    halo.setAttribute("stroke-opacity", "0.75");
    container.appendChild(halo);

    // 3. 單一血液粒子本體
    const mainDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    mainDot.setAttribute("cx", singleState.x.toFixed(1));
    mainDot.setAttribute("cy", singleState.y.toFixed(1));
    mainDot.setAttribute("r", "9.5");
    mainDot.setAttribute("fill", singleState.color);
    mainDot.setAttribute("stroke", "#ffffff");
    mainDot.setAttribute("stroke-width", "3");
    mainDot.setAttribute("filter", "url(#particleGlow)");
    container.appendChild(mainDot);

    // 4. 跟隨粒子的即時膠囊小標籤
    const badgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const offsetY = singleState.y < 55 ? 26 : -24;
    const bx = singleState.x;
    const by = singleState.y + offsetY;

    const badgeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    badgeBg.setAttribute("x", (bx - 54).toFixed(1));
    badgeBg.setAttribute("y", (by - 12).toFixed(1));
    badgeBg.setAttribute("width", "108");
    badgeBg.setAttribute("height", "22");
    badgeBg.setAttribute("rx", "11");
    badgeBg.setAttribute("fill", "#0f172a");
    badgeBg.setAttribute("fill-opacity", "0.88");
    badgeBg.setAttribute("stroke", "#ffffff");
    badgeBg.setAttribute("stroke-width", "1.5");

    const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    badgeTxt.setAttribute("x", bx.toFixed(1));
    badgeTxt.setAttribute("y", (by + 3).toFixed(1));
    badgeTxt.setAttribute("text-anchor", "middle");
    badgeTxt.setAttribute("fill", "#ffffff");
    badgeTxt.setAttribute("font-size", "11");
    badgeTxt.setAttribute("font-weight", "800");
    badgeTxt.textContent = singleState.stage.shortTag;

    badgeGroup.appendChild(badgeBg);
    badgeGroup.appendChild(badgeTxt);
    container.appendChild(badgeGroup);
  }
}

// ==================== 5. 更新底部週期與分頁 UI ====================
function updateUI(phase) {
  const cycleTimeText = document.getElementById("cycleTimeText");
  if (cycleTimeText) cycleTimeText.textContent = state.cycleTime.toFixed(2);

  const cycleSlider = document.getElementById("cycleSlider");
  if (cycleSlider) cycleSlider.value = state.cycleTime;

  document.querySelectorAll(".phase-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.phase === phase.key);
  });
}

// ==================== 6. Pan & Zoom 與肺臟顯示/隱藏控制 ====================
function applyViewBox() {
  const svg = document.getElementById("heartSvg");
  svg.setAttribute(
    "viewBox",
    `${state.vb.x.toFixed(1)} ${state.vb.y.toFixed(1)} ${state.vb.w.toFixed(1)} ${state.vb.h.toFixed(1)}`
  );
}

function zoomByFactor(factor, centerXRatio = 0.5, centerYRatio = 0.5) {
  const newW = Math.max(220, Math.min(2200, state.vb.w * factor));
  const newH = Math.max(150, Math.min(1550, state.vb.h * factor));
  state.vb.x += (state.vb.w - newW) * centerXRatio;
  state.vb.y += (state.vb.h - newH) * centerYRatio;
  state.vb.w = newW;
  state.vb.h = newH;
  applyViewBox();
}

function initPanAndZoom() {
  const canvasBox = document.getElementById("canvasBox");
  let isDragging = false;
  let startClientX = 0;
  let startClientY = 0;
  let startVbX = 0;
  let startVbY = 0;

  canvasBox.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".canvas-toolbar")) return;
    isDragging = true;
    startClientX = e.clientX;
    startClientY = e.clientY;
    startVbX = state.vb.x;
    startVbY = state.vb.y;
    canvasBox.classList.add("grabbing");
    canvasBox.setPointerCapture(e.pointerId);
  });

  canvasBox.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const rect = canvasBox.getBoundingClientRect();
    const dx = ((e.clientX - startClientX) / rect.width) * state.vb.w;
    const dy = ((e.clientY - startClientY) / rect.height) * state.vb.h;
    state.vb.x = startVbX - dx;
    state.vb.y = startVbY - dy;
    applyViewBox();
  });

  const endDrag = () => {
    isDragging = false;
    canvasBox.classList.remove("grabbing");
  };
  canvasBox.addEventListener("pointerup", endDrag);
  canvasBox.addEventListener("pointercancel", endDrag);

  // 滑鼠滾輪縮放 (以游標位置為中心)
  canvasBox.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvasBox.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      const factor = e.deltaY < 0 ? 0.86 : 1.16;
      zoomByFactor(factor, rx, ry);
    },
    { passive: false }
  );

  // 工具列按鈕
  document.getElementById("zoomInBtn").addEventListener("click", () => zoomByFactor(0.82));
  document.getElementById("zoomOutBtn").addEventListener("click", () => zoomByFactor(1.22));
  document.getElementById("resetViewBtn").addEventListener("click", () => {
    state.vb = { ...FULL_VIEWBOX };
    applyViewBox();
  });
  document.getElementById("focusHeartBtn").addEventListener("click", () => {
    state.vb = { ...HEART_VIEWBOX };
    applyViewBox();
  });

  // 隱藏 / 顯示肺臟按鈕
  const toggleLungsBtn = document.getElementById("toggleLungsBtn");
  toggleLungsBtn.addEventListener("click", () => {
    state.showLungs = !state.showLungs;
    const displayVal = state.showLungs ? "block" : "none";
    document.getElementById("lungsGroup").style.display = displayVal;
    document.getElementById("pulmonaryLungBranches").style.display = displayVal;
    document.getElementById("lungLabelsGroup").style.display = displayVal;
    toggleLungsBtn.textContent = state.showLungs ? "隱藏肺臟" : "顯示肺臟";
    toggleLungsBtn.classList.toggle("active-tool", state.showLungs);
  });

  // 隱藏 / 顯示標籤按鈕
  const toggleLabelsBtn = document.getElementById("toggleLabelsBtn");
  toggleLabelsBtn.addEventListener("click", () => {
    state.showLabels = !state.showLabels;
    document.getElementById("labelsLayer").style.display = state.showLabels ? "block" : "none";
    toggleLabelsBtn.classList.toggle("active-tool", state.showLabels);
  });
}

// ==================== 7. 主動畫迴圈與互動綁定 ====================
let lastTimestamp = performance.now();

function animate(now) {
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  if (state.isPlaying) {
    const prevJourney = state.journeyTime;
    state.journeyTime = (state.journeyTime + dt * state.speed * 0.45) % state.journeyDuration;
    state.cycleTime = state.journeyTime % state.cycleDuration;

    // 每完成一次 1.6s 完整循環，若設定為交替模式，切換下一次進入的血管路徑
    if (state.journeyTime < prevJourney) {
      if (state.lungPreference === "auto") {
        state.currentLung = state.currentLung === "right" ? "left" : "right";
      }
      if (state.veinPreference === "auto") {
        state.currentVein = state.currentVein === "ivc" ? "svc" : "ivc";
      }
    }
  }

  const phase = getPhaseInfo(state.cycleTime);
  const singleState = evaluateSingleParticle(state.journeyTime);

  updateValveGeometry(phase.avOpen, phase.slOpen);
  updateContractionTransform(state.cycleTime);
  updateArrowsAndParticles(phase.key, state.isPlaying ? dt : 0, singleState);
  updateUI(phase);

  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", () => {
  initPanAndZoom();

  const playPauseBtn = document.getElementById("playPauseBtn");

  playPauseBtn.addEventListener("click", () => {
    state.isPlaying = !state.isPlaying;
    playPauseBtn.textContent = state.isPlaying ? "暫停" : "播放";
  });

  // 下一心動階段按鈕 (0.0~0.1s -> 0.1~0.4s -> 0.4~0.8s)
  document.getElementById("stepPhaseBtn").addEventListener("click", () => {
    state.isPlaying = false;
    playPauseBtn.textContent = "播放";
    const beatOffset = state.journeyTime >= 0.8 ? 0.8 : 0.0;
    if (state.cycleTime < 0.1) state.cycleTime = 0.22;
    else if (state.cycleTime < 0.4) state.cycleTime = 0.60;
    else state.cycleTime = 0.05;
    state.journeyTime = beatOffset + state.cycleTime;
  });

  // 點擊原本的三階段心動週期分頁
  document.querySelectorAll(".phase-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const beatOffset = state.journeyTime >= 0.8 ? 0.8 : 0.0;
      state.cycleTime = parseFloat(tab.dataset.time);
      state.journeyTime = beatOffset + state.cycleTime;
    });
  });

  // 粒子顯示模式切換
  document.getElementById("particleModeSelect").addEventListener("change", (e) => {
    state.particleMode = e.target.value;
  });

  // 大靜脈路徑選擇 (上下交替 / 下大靜脈 / 上大靜脈)
  const veinSelect = document.getElementById("veinSelect");
  if (veinSelect) {
    veinSelect.addEventListener("change", (e) => {
      state.veinPreference = e.target.value;
      if (state.veinPreference !== "auto") {
        state.currentVein = state.veinPreference;
      }
    });
  }

  // 肺路徑選擇
  document.getElementById("lungSelect").addEventListener("change", (e) => {
    state.lungPreference = e.target.value;
    if (state.lungPreference !== "auto") {
      state.currentLung = state.lungPreference;
    }
  });

  // 速度選擇
  document.getElementById("speedSelect").addEventListener("change", (e) => {
    state.speed = parseFloat(e.target.value);
  });

  // 心動週期滑桿
  document.getElementById("cycleSlider").addEventListener("input", (e) => {
    state.isPlaying = false;
    playPauseBtn.textContent = "播放";
    const beatOffset = state.journeyTime >= 0.8 ? 0.8 : 0.0;
    state.cycleTime = parseFloat(e.target.value);
    state.journeyTime = beatOffset + state.cycleTime;
  });

  requestAnimationFrame(animate);
});

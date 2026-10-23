/**
 * 心臟收縮舒張、瓣膜開闔與心動週期動態模擬 (Pure HTML/JS, No Node.js)
 * 修正重點：
 * 1. 重新繪製乾淨的心臟腔室、管壁與管腔，底圖完全不留靜態瓣膜殘影，所有瓣膜 100% 動態開闔。
 * 2. 所有瓣膜 (Valve) 保持一致的顏色 (#b45309)，不因開關切換紅綠而產生視覺錯亂。
 * 3. 左心室射往主動脈 (Aorta) 為單一清晰管道，血液走在紅色管腔正中央；右心室射往肺動脈走在藍色管腔正中央，絕不流進管壁。
 * 4. 心房與心室嚴格「非同時收縮」：
 *    - 0.0~0.1s 心房收縮、心室舒張（房室瓣開、半月瓣關）
 *    - 0.1~0.4s 心室收縮、心房舒張（房室瓣關、半月瓣開）
 *    - 0.4~0.8s 全心舒張（房室瓣開、半月瓣關）
 */

const state = {
  isPlaying: true,
  cycleTime: 0.05,
  cycleDuration: 0.8,
  speed: 0.4
};

// 定義各階段血流粒子軌跡 (嚴格對齊每條血管與腔室的正中心線)
const FLOW_PATHS = [
  // 1. 上大靜脈 -> 右心房 (心室收縮期與全心舒張期回流)
  {
    color: "#2563eb",
    activeIn: ["ventricular", "diastole"],
    points: [[155, 55], [155, 115], [155, 165], [155, 212]]
  },
  // 2. 下大靜脈 -> 右心房 (心室收縮期與全心舒張期回流)
  {
    color: "#2563eb",
    activeIn: ["ventricular", "diastole"],
    points: [[135, 500], [126, 430], [132, 360], [152, 285]]
  },
  // 3. 肺靜脈 (上、下兩支) -> 左心房
  {
    color: "#dc2626",
    activeIn: ["ventricular", "diastole"],
    points: [[540, 163], [495, 180], [455, 192], [418, 205]]
  },
  {
    color: "#dc2626",
    activeIn: ["ventricular", "diastole"],
    points: [[545, 221], [500, 225], [455, 228], [418, 232]]
  },
  // 4. 右心房 -> 三尖瓣口 -> 右心室 (心房收縮期與全心舒張期開啟房室瓣時流入)
  {
    color: "#2563eb",
    activeIn: ["atrial", "diastole"],
    points: [[162, 245], [186, 298], [212, 360], [242, 425], [262, 465]]
  },
  // 5. 左心房 -> 二尖瓣口 -> 左心室 (心房收縮期與全心舒張期開啟房室瓣時流入)
  {
    color: "#dc2626",
    activeIn: ["atrial", "diastole"],
    points: [[406, 235], [382, 278], [364, 345], [346, 415], [334, 465]]
  },
  // 6. 右心室 -> 肺動脈瓣口 (248,248) -> 肺動脈管腔正中央 (心室收縮期射出)
  {
    color: "#2563eb",
    activeIn: ["ventricular"],
    points: [[258, 445], [246, 365], [244, 295], [248, 248], [268, 185], [315, 112], [378, 48]]
  },
  // 7. 左心室 -> 主動脈瓣口 (318,248) -> 主動脈單一管腔正中央 (心室收縮期射出，不分叉、不偏右)
  {
    color: "#dc2626",
    activeIn: ["ventricular"],
    points: [[334, 445], [322, 365], [320, 295], [318, 248], [302, 185], [274, 115], [238, 42]]
  }
];

const particles = [];
FLOW_PATHS.forEach((pathObj) => {
  const count = 4;
  for (let i = 0; i < count; i++) {
    particles.push({
      path: pathObj,
      progress: i / count
    });
  }
});

function getPointOnPolyline(pts, t) {
  const totalSegs = pts.length - 1;
  const scaled = Math.max(0, Math.min(0.9999, t)) * totalSegs;
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const p0 = pts[idx];
  const p1 = pts[idx + 1];
  return [
    p0[0] + (p1[0] - p0[0]) * frac,
    p0[1] + (p1[1] - p0[1]) * frac
  ];
}

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

// 動態更新四組瓣膜葉片的幾何角度 (顏色保持一致，只改變開闔幾何形狀)
function updateValveGeometry(avOpen, slOpen) {
  const triLeft = document.getElementById("tri-leaf-left");
  const triRight = document.getElementById("tri-leaf-right");
  const mitralLeft = document.getElementById("mitral-leaf-left");
  const mitralRight = document.getElementById("mitral-leaf-right");

  if (avOpen) {
    // 房室瓣開啟：兩片瓣葉順著血流朝心室腔內張開
    triLeft.setAttribute("d", "M 166 308 Q 175 332 178 352");
    triRight.setAttribute("d", "M 214 290 Q 214 316 212 338");

    mitralLeft.setAttribute("d", "M 358 268 Q 358 294 360 316");
    mitralRight.setAttribute("d", "M 404 286 Q 395 312 392 332");
  } else {
    // 房室瓣關閉：兩片瓣葉在房室口中央緊密對合，阻擋心室血液逆流回心房
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
    // 半月瓣開啟：兩片瓣葉順著噴射血流貼向動脈管壁打開
    pulmLeft.setAttribute("d", "M 230 248 Q 235 228 242 212");
    pulmRight.setAttribute("d", "M 266 248 Q 272 228 278 214");

    aorticLeft.setAttribute("d", "M 300 248 Q 294 228 288 212");
    aorticRight.setAttribute("d", "M 336 248 Q 330 228 324 212");
  } else {
    // 半月瓣關閉：在動脈口中央合攏呈弧形袋狀，阻擋動脈血逆流回心室
    pulmLeft.setAttribute("d", "M 230 248 Q 239 255 248 248");
    pulmRight.setAttribute("d", "M 266 248 Q 257 255 248 248");

    aorticLeft.setAttribute("d", "M 300 248 Q 309 255 318 248");
    aorticRight.setAttribute("d", "M 336 248 Q 327 255 318 248");
  }
}

// 嚴格錯開心房與心室的收縮/舒張形變 (絕不同時收縮)
function updateContractionTransform(t) {
  const rightAtrium = document.getElementById("rightAtriumGroup");
  const leftAtrium = document.getElementById("leftAtriumGroup");
  const ventricles = document.getElementById("ventriclesLayer");

  let atrialScale = 1.0;
  let ventScaleX = 1.0;
  let ventScaleY = 1.0;

  if (t < 0.1) {
    // ① 0.0 ~ 0.1s：心房收縮 (縮小)，此時心室正在舒張充血最後階段 (微脹)
    const p = Math.sin((t / 0.1) * Math.PI);
    atrialScale = 1.0 - 0.16 * p; // 心房明顯向內收縮
    ventScaleX = 1.0 + 0.04 * p;  // 心室舒張飽滿
    ventScaleY = 1.0 + 0.03 * p;
  } else if (t < 0.4) {
    // ② 0.1 ~ 0.4s：心室收縮 (明顯向內擠壓縮小)，此時心房已經開始舒張充血 (微擴張)
    const p = Math.sin(((t - 0.1) / 0.3) * Math.PI);
    atrialScale = 1.0 + 0.04 * p; // 心房舒張接收靜脈血
    ventScaleX = 1.0 - 0.15 * p;  // 心室向中軸強力收縮搏血
    ventScaleY = 1.0 - 0.10 * p;
  } else {
    // ③ 0.4 ~ 0.8s：全心舒張期，心房與心室皆處於放鬆舒張充血狀態
    const p = Math.sin(((t - 0.4) / 0.4) * Math.PI);
    atrialScale = 1.0 + 0.03 * p;
    ventScaleX = 1.0 + 0.03 * p;
    ventScaleY = 1.0 + 0.02 * p;
  }

  // 以房室交界口為錨點進行收縮，確保與瓣膜位置無縫銜接
  rightAtrium.style.transformOrigin = "190px 285px";
  rightAtrium.style.transform = `scale(${atrialScale})`;

  leftAtrium.style.transformOrigin = "380px 265px";
  leftAtrium.style.transform = `scale(${atrialScale})`;

  ventricles.style.transformOrigin = "285px 265px";
  ventricles.style.transform = `scale(${ventScaleX}, ${ventScaleY})`;
}

function updateArrowsAndParticles(phaseKey, dt) {
  const arrowRaRv = document.getElementById("arrow-ra-rv");
  const arrowLaLv = document.getElementById("arrow-la-lv");
  const arrowRvPa = document.getElementById("arrow-rv-pa");
  const arrowLvAorta = document.getElementById("arrow-lv-aorta");

  if (phaseKey === "ventricular") {
    // 心室收縮：隱藏心房往心室箭頭，顯示心室往肺動脈與主動脈箭頭
    arrowRaRv.classList.add("hidden-arrow");
    arrowLaLv.classList.add("hidden-arrow");
    arrowRvPa.classList.remove("hidden-arrow");
    arrowLvAorta.classList.remove("hidden-arrow");
  } else {
    // 心房收縮與全心舒張：顯示心房往心室箭頭，隱藏動脈噴射箭頭
    arrowRaRv.classList.remove("hidden-arrow");
    arrowLaLv.classList.remove("hidden-arrow");
    arrowRvPa.classList.add("hidden-arrow");
    arrowLvAorta.classList.add("hidden-arrow");
  }

  const container = document.getElementById("bloodParticlesLayer");
  container.innerHTML = "";

  particles.forEach((p) => {
    if (!p.path.activeIn.includes(phaseKey)) return;

    const speedMultiplier = phaseKey === "atrial" || phaseKey === "ventricular" ? 1.7 : 1.05;
    p.progress = (p.progress + dt * speedMultiplier * state.speed) % 1;

    const [x, y] = getPointOnPolyline(p.path.points, p.progress);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x.toFixed(1));
    circle.setAttribute("cy", y.toFixed(1));
    circle.setAttribute("r", "6");
    circle.setAttribute("fill", p.path.color);
    circle.setAttribute("fill-opacity", "0.9");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.6");
    container.appendChild(circle);
  });
}

function updateTopAndBottomUI(phase) {
  const phaseTitle = document.getElementById("phaseTitle");
  phaseTitle.textContent = phase.title;
  phaseTitle.style.backgroundColor = phase.bg;
  phaseTitle.style.color = phase.color;

  const avPill = document.getElementById("avPill");
  const slPill = document.getElementById("slPill");

  avPill.textContent = phase.avOpen ? "房室瓣：開啟" : "房室瓣：關閉 (防逆流)";
  slPill.textContent = phase.slOpen ? "動脈瓣(半月瓣)：開啟" : "動脈瓣(半月瓣)：關閉 (防逆流)";

  document.getElementById("cycleTimeText").textContent = state.cycleTime.toFixed(2);
  document.getElementById("cycleSlider").value = state.cycleTime;

  document.querySelectorAll(".phase-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.phase === phase.key);
  });
}

let lastTimestamp = performance.now();

function animate(now) {
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  if (state.isPlaying) {
    state.cycleTime = (state.cycleTime + dt * state.speed) % state.cycleDuration;
  }

  const phase = getPhaseInfo(state.cycleTime);
  updateValveGeometry(phase.avOpen, phase.slOpen);
  updateContractionTransform(state.cycleTime);
  updateArrowsAndParticles(phase.key, state.isPlaying ? dt : 0);
  updateTopAndBottomUI(phase);

  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", () => {
  const playPauseBtn = document.getElementById("playPauseBtn");

  playPauseBtn.addEventListener("click", () => {
    state.isPlaying = !state.isPlaying;
    playPauseBtn.textContent = state.isPlaying ? "⏸️ 暫停" : "▶️ 播放";
  });

  document.getElementById("stepPhaseBtn").addEventListener("click", () => {
    state.isPlaying = false;
    playPauseBtn.textContent = "▶️ 播放";
    if (state.cycleTime < 0.1) state.cycleTime = 0.22;
    else if (state.cycleTime < 0.4) state.cycleTime = 0.60;
    else state.cycleTime = 0.05;
  });

  document.querySelectorAll(".phase-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.cycleTime = parseFloat(tab.dataset.time);
    });
  });

  document.getElementById("speedSelect").addEventListener("change", (e) => {
    state.speed = parseFloat(e.target.value);
  });

  document.getElementById("cycleSlider").addEventListener("input", (e) => {
    state.isPlaying = false;
    playPauseBtn.textContent = "▶️ 播放";
    state.cycleTime = parseFloat(e.target.value);
  });

  requestAnimationFrame(animate);
});

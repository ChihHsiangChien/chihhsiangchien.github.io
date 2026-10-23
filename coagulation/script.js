// 血液凝固與傷口癒合互動模擬 (Pure HTML5 Canvas + Vanilla JS)

const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const stageStepperButtons = document.querySelectorAll('.step-item');
const canvasStageBadge = document.getElementById('canvas-stage-badge');
const canvasPrompt = document.getElementById('canvas-prompt');
const stageProgressFill = document.getElementById('stage-progress-fill');

const btnAuto = document.getElementById('btn-auto');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnPrev = document.getElementById('btn-prev');
const btnAction = document.getElementById('btn-action');
const btnAddPlatelets = document.getElementById('btn-add-platelets');
const btnNext = document.getElementById('btn-next');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');

const infoStageTag = document.getElementById('info-stage-tag');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoBullets = document.getElementById('info-bullets');

const metricVesselText = document.getElementById('metric-vessel-text');
const metricBleedText = document.getElementById('metric-bleed-text');
const metricClotText = document.getElementById('metric-clot-text');
const metricHealText = document.getElementById('metric-heal-text');
const barVessel = document.getElementById('bar-vessel');
const barBleed = document.getElementById('bar-bleed');
const barClot = document.getElementById('bar-clot');
const barHeal = document.getElementById('bar-heal');

// 6 個凝血與修復階段定義
const STAGES = [
  {
    id: 0,
    badge: '階段 1：正常生理狀態 (Normal State)',
    tag: 'STAGE 01 · 正常狀態',
    title: '完整皮膚與順暢血液循環',
    desc: '在未受傷時，表皮層與真皮層緊密保護人體。血管內壁由完整的「內皮細胞」覆蓋，能分泌一氧化氮 (NO) 與前列環素，防止血小板無故活化或黏附。',
    bullets: [
      '表皮角質層與真皮組織完整無缺損',
      '紅血球、白血球與圓盤狀血小板在血管內穩定流動',
      '血管內壁平滑，膠原蛋白未暴露於血液中'
    ],
    prompt: '💡 點擊畫面中央皮膚或下方「造成傷口」按鈕，觀察皮膚受損與血管破裂！',
    actionText: '🔪 點擊造成傷口 (進入血管破裂)',
    duration: 999999 // 階段0等待使用者觸發或自動切換
  },
  {
    id: 1,
    badge: '階段 2：皮膚受損與血管破裂 (Vascular Injury)',
    tag: 'STAGE 02 · 血管破裂',
    title: '外力創傷導致血管破裂與出血',
    desc: '尖銳物刺破表皮與真皮，切斷微血管內皮層。血液因血管內壓力差從破口湧出至受損組織與體表；同時血管壁下的「膠原蛋白纖維 (Collagen)」與組織因子暴露。',
    bullets: [
      '皮膚形成開放性創口，血管壁出現破口',
      '紅血球與血漿從破裂處大量外溢（出血現象）',
      '血管壁受損處暴露出膠原蛋白，發出凝血求救訊號'
    ],
    prompt: '⚠️ 血管正在出血！觀察紅血球外溢，或點擊畫布加速進入「初級止血（血小板聚集）」',
    actionText: '🛡️ 啟動血管收縮與血小板聚集',
    duration: 9.0
  },
  {
    id: 2,
    badge: '階段 3：血管痙攣與血小板栓塞 (Primary Hemostasis)',
    tag: 'STAGE 03 · 初級止血',
    title: '血管收縮 & 血小板活化聚集',
    desc: '受傷血管立即發生反射性收縮（血管痙攣）以減緩血流。血小板接觸暴露的膠原蛋白後被活化，形狀由平滑圓盤變為帶偽足的「星芒狀」，並釋放 ADP 與血栓素 A2 吸引更多血小板形成暫時性血小板栓。',
    bullets: [
      '血管平滑肌收縮（管徑變窄），降低破口血流量',
      '血小板黏附於受損膠原蛋白並伸出偽足（棘狀突起）',
      '活化血小板釋放化學訊號（黃色光點），召喚更多血小板聚集堵住破口'
    ],
    prompt: '✨ 點擊畫布傷口處或「召喚更多血小板」按鈕，可手動派遣血小板加速堵住破口！',
    actionText: '🕸️ 啟動凝血級聯與纖維蛋白網',
    duration: 12.0
  },
  {
    id: 3,
    badge: '階段 4：纖維蛋白網與穩定血塊 (Secondary Hemostasis)',
    tag: 'STAGE 04 · 次級止血',
    title: '凝血酶活化與纖維蛋白網交織',
    desc: '暫時性的血小板栓還不夠牢固。透過內在與外在凝血途徑，凝血酶 (Thrombin) 將血液中可溶的「纖維蛋白原」轉化為不溶性的「纖維蛋白絲 (Fibrin)」，交織成堅固的網狀結構，攔截紅血球形成穩定血塊。',
    bullets: [
      '凝血因子級聯反應啟動，生成大量金黃色纖維蛋白絲',
      '纖維蛋白網緊密纏繞血小板與紅血球，形成穩固紅血栓',
      '傷口出血完全停止，防止體液流失與病原體入侵'
    ],
    prompt: '🕸️ 觀察金黃色纖維蛋白絲交織成網，將血小板與紅血球牢牢固定！',
    actionText: '🩹 進入血塊收縮與組織修復',
    duration: 11.0
  },
  {
    id: 4,
    badge: '階段 5：結痂、免疫清理與組織再生 (Tissue Repair)',
    tag: 'STAGE 05 · 組織修復',
    title: '表面血塊乾燥結痂與內皮新生',
    desc: '表面血塊脫水乾燥形成堅硬的「痂皮 (Scab)」保護下方組織。白血球（巨噬細胞）進入傷口吞噬受損細胞碎片；同時成纖維細胞合成新膠原蛋白，血管內皮細胞與表皮基底細胞開始分裂修補缺口。',
    bullets: [
      '表層血塊硬化形成暗紅色保護性痂皮',
      '白血球聚集至傷口區清除壞死組織與外來物',
      '血管內皮細胞逐漸癒合，纖溶酶 (Plasmin) 開始緩慢溶解多餘血栓'
    ],
    prompt: '🩹 痂皮正在保護傷口，下方血管內皮細胞與真皮組織正在再生修復！',
    actionText: '✨ 完成癒合並恢復正常',
    duration: 11.0
  },
  {
    id: 5,
    badge: '階段 6：纖溶作用與恢復正常 (Complete Recovery)',
    tag: 'STAGE 06 · 恢復正常',
    title: '血栓溶解、痂皮脫落與完全康復',
    desc: '當血管壁與表皮層完全長好後，纖溶系統（纖溶酶 Plasmin）將完成任務的纖維蛋白網分解吸收，表層痂皮自然脫落。血管管徑與血流完全恢復正常生理狀態。',
    bullets: [
      '纖維蛋白溶解作用 (Fibrinolysis) 清除血管壁殘留血塊',
      '表皮與血管內皮100%癒合，外層痂皮脫落',
      '血液循環重回順暢穩定狀態'
    ],
    prompt: '🎉 傷口已完全癒合！點擊「重新模擬」或任一階段按鈕可再次觀察各細節。',
    actionText: '🔄 重新開始完整凝血模擬',
    duration: 999999
  }
];

// 幾何常數 (基於 900x520 畫布)
const W = 900;
const H = 520;
const SKIN_TOP = 65;
const EPIDERMIS_BOTTOM = 125;
const DERMIS_TOP = 125;
const VESSEL_TOP_BASE = 275;
const VESSEL_BOTTOM_BASE = 415;
const WOUND_X = 450;
const WOUND_HALF_W = 82; // 傷口在表皮的半寬
const VESSEL_BREACH_HALF_W = 58; // 血管破口半寬

// 模擬狀態變數
let currentStage = 0;
let stageTime = 0;
let autoPlay = true;
let isPaused = false;
let simSpeed = 1.0;

// 動態過渡插值狀態 (0.0 ~ 1.0)
let state = {
  woundOpen: 0,         // 皮膚與血管破口開啟度
  constriction: 0,      // 血管收縮程度 (0 = 正常, 1 = 最大收縮)
  bleedIntensity: 0,    // 出血強度
  plugProgress: 0,      // 血小板聚集程度 (0 ~ 1)
  fibrinProgress: 0,    // 纖維蛋白網形成度 (0 ~ 1)
  scabProgress: 0,      // 結痂程度 (0 ~ 1)
  healProgress: 0,      // 血管內皮與皮膚癒合度 (0 ~ 1)
  bladeAnim: 0          // 切割刀片動畫 (0 ~ 1)
};

// 粒子陣列
let rbcs = [];
let platelets = [];
let wbcs = [];
let signals = [];       // ADP / TXA2 化學活化訊號波與微粒
let plugNodes = [];     // 已經固定在傷口處的血小板節點
let fibrinStrands = []; // 纖維蛋白絲連線
let fibroblasts = [];   // 修復階段的成纖維細胞光點

// 初始化固定在傷口處的目標血小板栓座標與纖維蛋白網拓撲
function buildClotTopology() {
  plugNodes = [];
  fibrinStrands = [];

  // 在血管破口與傷口下半部產生約 38 個交錯錨點
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const yRatio = r / (rows - 1);
    const yBase = VESSEL_TOP_BASE - 8 - yRatio * 68;
    const halfSpan = VESSEL_BREACH_HALF_W * (1.05 - yRatio * 0.18);
    const count = 7 + (r % 2);
    for (let i = 0; i < count; i++) {
      const xRatio = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const x = WOUND_X + xRatio * halfSpan + (Math.random() - 0.5) * 9;
      const y = yBase + (Math.random() - 0.5) * 9;
      plugNodes.push({
        x,
        y,
        filled: false,
        fillTime: 0,
        hasRBC: Math.random() < 0.42, // 部分網眼夾帶紅血球形成紅血栓
        rbcAngle: Math.random() * Math.PI,
        seedOrder: Math.abs(xRatio) * 0.45 + yRatio * 0.55 + Math.random() * 0.15
      });
    }
  }

  // 依據破口邊緣由外往內、由下往上排序，讓聚集更自然
  plugNodes.sort((a, b) => a.seedOrder - b.seedOrder);

  // 建立纖維蛋白網連線 (連接相鄰節點與血管破口邊緣)
  for (let i = 0; i < plugNodes.length; i++) {
    for (let j = i + 1; j < plugNodes.length; j++) {
      const dx = plugNodes[i].x - plugNodes[j].x;
      const dy = plugNodes[i].y - plugNodes[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12 && dist < 36) {
        fibrinStrands.push({
          ax: plugNodes[i].x,
          ay: plugNodes[i].y,
          bx: plugNodes[j].x,
          by: plugNodes[j].y,
          threshold: Math.min(0.95, (i + j) / (plugNodes.length * 1.6))
        });
      }
    }
  }
}

// 取得特定 X 座標處的血管上下壁 Y 座標 (考慮血管痙攣收縮)
function getVesselWalls(x) {
  const distFromWound = Math.abs(x - WOUND_X);
  // 傷口附近血管平滑肌反射性收縮
  const localFactor = Math.exp(-(distFromWound * distFromWound) / (2 * 165 * 165));
  const pinch = state.constriction * 26 * localFactor;
  return {
    top: VESSEL_TOP_BASE + pinch,
    bottom: VESSEL_BOTTOM_BASE - pinch * 0.75
  };
}

// 生成單顆紅血球
function createRBC(x = -30) {
  const walls = getVesselWalls(x);
  const margin = 16;
  const y = walls.top + margin + Math.random() * (walls.bottom - walls.top - margin * 2);
  return {
    x,
    y,
    vx: 115 + Math.random() * 45,
    vy: (Math.random() - 0.5) * 12,
    radius: 10 + Math.random() * 2.5,
    angle: Math.random() * Math.PI * 2,
    vAngle: (Math.random() - 0.5) * 1.8,
    escaped: false,
    trapped: false,
    alpha: 1
  };
}

// 生成單顆血小板
function createPlatelet(x = -20, forcedActive = false) {
  const walls = getVesselWalls(x);
  const y = walls.top + 10 + Math.random() * (walls.bottom - walls.top - 20);
  return {
    x,
    y,
    vx: 125 + Math.random() * 50,
    vy: (Math.random() - 0.5) * 18,
    activated: forcedActive,
    targetNode: null,
    angle: Math.random() * Math.PI * 2,
    alpha: 1
  };
}

// 生成單顆白血球
function createWBC(x = -35) {
  const walls = getVesselWalls(x);
  const y = walls.top + 22 + Math.random() * (walls.bottom - walls.top - 44);
  return {
    x,
    y,
    vx: 75 + Math.random() * 25,
    vy: (Math.random() - 0.5) * 8,
    radius: 15 + Math.random() * 2,
    inTissue: false,
    targetX: WOUND_X + (Math.random() - 0.5) * 110,
    targetY: DERMIS_TOP + 45 + Math.random() * 90,
    wobblePhase: Math.random() * Math.PI * 2
  };
}

// 初始化所有血液粒子
function initParticles() {
  rbcs = [];
  platelets = [];
  wbcs = [];
  signals = [];
  fibroblasts = [];

  for (let i = 0; i < 55; i++) {
    rbcs.push(createRBC(Math.random() * W));
  }
  for (let i = 0; i < 34; i++) {
    platelets.push(createPlatelet(Math.random() * W));
  }
  for (let i = 0; i < 7; i++) {
    wbcs.push(createWBC(Math.random() * W));
  }
  for (let i = 0; i < 16; i++) {
    fibroblasts.push({
      x: WOUND_X + (Math.random() - 0.5) * 180,
      y: DERMIS_TOP + 20 + Math.random() * 120,
      phase: Math.random() * Math.PI * 2
    });
  }
  buildClotTopology();
}

// 切換至指定階段
function setStage(stageIndex) {
  currentStage = Math.max(0, Math.min(STAGES.length - 1, stageIndex));
  stageTime = 0;

  // 若切換到不同階段，設定符合該階段起點的基礎狀態，讓使用者也能直接跳轉觀看
  if (currentStage === 0) {
    state.woundOpen = 0;
    state.constriction = 0;
    state.bleedIntensity = 0;
    state.plugProgress = 0;
    state.fibrinProgress = 0;
    state.scabProgress = 0;
    state.healProgress = 0;
    state.bladeAnim = 0;
    buildClotTopology();
    // 清除外溢粒子
    rbcs.forEach(r => { r.escaped = false; r.trapped = false; });
    wbcs.forEach(w => { w.inTissue = false; });
  } else if (currentStage === 1) {
    state.bladeAnim = 0.01; // 觸發刀片劃過動畫
    state.woundOpen = Math.max(state.woundOpen, 0.2);
    state.constriction = 0.1;
    state.plugProgress = 0;
    state.fibrinProgress = 0;
    state.scabProgress = 0;
    state.healProgress = 0;
    buildClotTopology();
  } else if (currentStage === 2) {
    state.woundOpen = 1;
    state.bladeAnim = 0;
    state.fibrinProgress = 0;
    state.scabProgress = 0;
    state.healProgress = 0;
    if (state.plugProgress > 0.85) {
      state.plugProgress = 0.25;
      updatePlugNodesFromProgress();
    }
  } else if (currentStage === 3) {
    state.woundOpen = 1;
    state.constriction = 0.85;
    state.plugProgress = 1;
    state.scabProgress = 0;
    state.healProgress = 0;
    updatePlugNodesFromProgress();
  } else if (currentStage === 4) {
    state.woundOpen = 1;
    state.constriction = 0.45;
    state.plugProgress = 1;
    state.fibrinProgress = 1;
    state.healProgress = Math.min(state.healProgress, 0.2);
    updatePlugNodesFromProgress();
    // 讓幾顆白血球進入組織清理
    wbcs.forEach((w, idx) => {
      if (idx < 4) w.inTissue = true;
    });
  } else if (currentStage === 5) {
    state.woundOpen = 1;
    state.constriction = 0.1;
    state.plugProgress = 1;
    state.fibrinProgress = 1;
    state.scabProgress = 0.8;
    state.healProgress = Math.max(state.healProgress, 0.75);
  }

  updateUIForStage();
}

function updatePlugNodesFromProgress() {
  const targetFilled = Math.floor(state.plugProgress * plugNodes.length);
  plugNodes.forEach((node, idx) => {
    node.filled = idx < targetFilled;
  });
}

// 更新右側與底部 UI
function updateUIForStage() {
  const st = STAGES[currentStage];

  stageStepperButtons.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === currentStage);
    btn.classList.toggle('completed', idx < currentStage);
  });

  canvasStageBadge.textContent = st.badge;
  canvasPrompt.textContent = st.prompt;

  infoStageTag.textContent = st.tag;
  infoTitle.textContent = st.title;
  infoDesc.textContent = st.desc;

  infoBullets.innerHTML = '';
  st.bullets.forEach(b => {
    const li = document.createElement('li');
    li.textContent = b;
    infoBullets.appendChild(li);
  });

  btnPrev.disabled = currentStage === 0;
  btnNext.disabled = currentStage === STAGES.length - 1;
  btnAction.textContent = st.actionText;

  // 在階段 2 (血小板聚集) 顯示「召喚更多血小板」互動按鈕
  btnAddPlatelets.style.display = currentStage === 2 ? 'inline-flex' : 'none';
}

// 觸發額外血小板支援 (使用者互動)
function spawnReinforcementPlatelets(targetX = WOUND_X, targetY = VESSEL_TOP_BASE) {
  // 釋放一波活化訊號光環
  signals.push({
    x: targetX,
    y: targetY,
    r: 6,
    maxR: 135,
    alpha: 0.95
  });

  // 從左側血管上游湧入 8 顆已活化的血小板直奔破口
  for (let i = 0; i < 8; i++) {
    const p = createPlatelet(WOUND_X - 180 - Math.random() * 90, true);
    p.vx = 210 + Math.random() * 60;
    platelets.push(p);
  }

  // 直接推進一點血小板栓塞進度
  if (currentStage === 2) {
    state.plugProgress = Math.min(1, state.plugProgress + 0.14);
    updatePlugNodesFromProgress();
  }
}

// 更新生理指標儀表板
function updateMetricsUI() {
  // 血管管徑 (100% -> 65% 收縮)
  const vesselPct = Math.round(100 - state.constriction * 35);
  metricVesselText.textContent = state.constriction > 0.15
    ? `${vesselPct}% (反射性血管收縮)`
    : `${vesselPct}% (正常管徑)`;
  barVessel.style.width = `${vesselPct}%`;

  // 出血速率
  const bleedPct = Math.round(state.bleedIntensity * 100);
  if (bleedPct === 0) {
    metricBleedText.textContent = '0% (無出血)';
  } else if (bleedPct > 60) {
    metricBleedText.textContent = `${bleedPct}% (大量出血中!)`;
  } else {
    metricBleedText.textContent = `${bleedPct}% (減緩中)`;
  }
  barBleed.style.width = `${bleedPct}%`;

  // 凝血塊完整度 (血小板栓佔 50%，纖維蛋白網佔 50%)
  const clotRaw = (state.plugProgress * 0.5 + state.fibrinProgress * 0.5) * (1 - (currentStage === 5 ? state.healProgress * 0.9 : 0));
  const clotPct = Math.round(clotRaw * 100);
  if (currentStage === 5 && state.healProgress > 0.85) {
    metricClotText.textContent = `${clotPct}% (纖溶作用已分解血栓)`;
  } else if (state.fibrinProgress > 0.2) {
    metricClotText.textContent = `${clotPct}% (纖維蛋白穩定血塊)`;
  } else if (state.plugProgress > 0.05) {
    metricClotText.textContent = `${clotPct}% (初級血小板栓塞)`;
  } else {
    metricClotText.textContent = '0%';
  }
  barClot.style.width = `${clotPct}%`;

  // 組織與血管修復度
  let healPct = 100;
  if (currentStage === 0) {
    healPct = 100;
  } else {
    healPct = Math.round(state.healProgress * 100);
  }
  metricHealText.textContent = `${healPct}%`;
  barHeal.style.width = `${healPct}%`;
}

// 物理與狀態更新迴圈
function updateSimulation(dt) {
  const scaledDt = dt * simSpeed;
  stageTime += scaledDt;

  const st = STAGES[currentStage];
  if (st.duration < 9000) {
    const progressPct = Math.min(100, (stageTime / st.duration) * 100);
    stageProgressFill.style.width = `${progressPct}%`;
    if (autoPlay && stageTime >= st.duration && currentStage < STAGES.length - 1) {
      setStage(currentStage + 1);
      return;
    }
  } else {
    stageProgressFill.style.width = currentStage === 5 ? '100%' : '0%';
  }

  // 根據當前階段平滑更新各項生理參數
  if (currentStage === 0) {
    state.woundOpen = 0;
    state.constriction = 0;
    state.bleedIntensity = 0;
    state.plugProgress = 0;
    state.fibrinProgress = 0;
    state.scabProgress = 0;
    state.healProgress = 1;
  } else if (currentStage === 1) {
    // 刀片劃過與傷口裂開
    if (state.bladeAnim > 0 && state.bladeAnim < 1) {
      state.bladeAnim = Math.min(1, state.bladeAnim + scaledDt * 1.8);
    }
    state.woundOpen = Math.min(1, state.woundOpen + scaledDt * 1.5);
    state.constriction = Math.min(0.25, state.constriction + scaledDt * 0.08);
    state.bleedIntensity = state.woundOpen * 0.95;
    state.healProgress = 0;
  } else if (currentStage === 2) {
    // 血管收縮 + 血小板聚集
    state.woundOpen = 1;
    state.constriction = Math.min(0.95, state.constriction + scaledDt * 0.35);
    state.plugProgress = Math.min(1, state.plugProgress + scaledDt * 0.085);
    updatePlugNodesFromProgress();
    state.bleedIntensity = Math.max(0.08, (1 - state.plugProgress * 0.9) * 0.75);

    // 定期釋放 ADP / TXA2 化學吸引訊號波
    if (Math.random() < scaledDt * 2.2) {
      signals.push({
        x: WOUND_X + (Math.random() - 0.5) * 50,
        y: VESSEL_TOP_BASE + 12,
        r: 5,
        maxR: 95,
        alpha: 0.85
      });
    }
  } else if (currentStage === 3) {
    // 纖維蛋白網形成，完全止血
    state.plugProgress = 1;
    updatePlugNodesFromProgress();
    state.constriction = Math.max(0.65, state.constriction - scaledDt * 0.05);
    state.fibrinProgress = Math.min(1, state.fibrinProgress + scaledDt * 0.11);
    state.bleedIntensity = Math.max(0, (1 - state.fibrinProgress * 2.5) * 0.1);
  } else if (currentStage === 4) {
    // 結痂與內皮組織修復
    state.plugProgress = 1;
    state.fibrinProgress = 1;
    state.bleedIntensity = 0;
    state.constriction = Math.max(0.2, state.constriction - scaledDt * 0.08);
    state.scabProgress = Math.min(1, state.scabProgress + scaledDt * 0.18);
    state.healProgress = Math.min(0.75, state.healProgress + scaledDt * 0.07);
  } else if (currentStage === 5) {
    // 纖溶作用分解血塊，完全恢復正常
    state.bleedIntensity = 0;
    state.constriction = Math.max(0, state.constriction - scaledDt * 0.15);
    state.healProgress = Math.min(1, state.healProgress + scaledDt * 0.12);
    state.scabProgress = Math.max(0, 1 - (state.healProgress - 0.7) * 3.3);
  }

  // 更新化學訊號波
  for (let i = signals.length - 1; i >= 0; i--) {
    const s = signals[i];
    s.r += scaledDt * 65;
    s.alpha -= scaledDt * 0.65;
    if (s.alpha <= 0 || s.r >= s.maxR) {
      signals.splice(i, 1);
    }
  }

  // 更新紅血球 (RBCs)
  const breachOpen = state.woundOpen > 0.3 && state.bleedIntensity > 0.05;
  for (let i = 0; i < rbcs.length; i++) {
    const r = rbcs[i];

    if (r.trapped) {
      // 在階段 5 隨纖溶作用釋放或淡出
      if (currentStage === 5 && state.healProgress > 0.85) {
        r.trapped = false;
        r.escaped = false;
        r.y = VESSEL_TOP_BASE + 40;
      }
      continue;
    }

    if (r.escaped) {
      // 已流到傷口腔室或皮膚表面的紅血球
      r.x += r.vx * scaledDt * 0.25;
      r.y += r.vy * scaledDt;
      r.angle += r.vAngle * scaledDt * 0.3;

      // 在傷口槽內堆積或慢慢凝結
      if (r.y < SKIN_TOP + 12) {
        r.vy = Math.max(0, r.vy);
      }
      if (currentStage >= 3) {
        r.vx *= 0.92;
        r.vy *= 0.92;
      }
      // 階段 4~5 被巨噬細胞清除與結痂吸收
      if (currentStage >= 4) {
        r.alpha = Math.max(0, r.alpha - scaledDt * 0.25);
        if (r.alpha <= 0) {
          Object.assign(r, createRBC(-30));
        }
      }
      continue;
    }

    // 血管內正常流動
    const walls = getVesselWalls(r.x);
    const speedFactor = 1 + state.constriction * 0.35; // 管徑變窄時流速略快
    r.x += r.vx * speedFactor * scaledDt;
    r.y += r.vy * scaledDt;
    r.angle += r.vAngle * scaledDt;

    // 破口處外溢判定 (Stage 1 & Stage 2 未完全堵住前)
    const inBreachX = Math.abs(r.x - WOUND_X) < VESSEL_BREACH_HALF_W * 0.85;
    if (breachOpen && inBreachX && r.y < walls.top + 38) {
      if (Math.random() < state.bleedIntensity * 0.16) {
        r.escaped = true;
        r.vy = -55 - Math.random() * 55;
        r.vx = (r.x - WOUND_X) * 0.9 + (Math.random() - 0.5) * 30;
        continue;
      }
    }

    // 血管上下壁邊界反彈
    if (r.y - r.radius < walls.top + 4) {
      r.y = walls.top + 4 + r.radius;
      r.vy = Math.abs(r.vy) * 0.6;
    }
    if (r.y + r.radius > walls.bottom - 4) {
      r.y = walls.bottom - 4 - r.radius;
      r.vy = -Math.abs(r.vy) * 0.6;
    }

    if (r.x > W + 40) {
      Object.assign(r, createRBC(-30));
    }
  }

  // 更新血小板 (Platelets)
  for (let i = platelets.length - 1; i >= 0; i--) {
    const p = platelets[i];
    const walls = getVesselWalls(p.x);

    // 階段 2 & 3：靠近傷口時被膠原蛋白與化學訊號活化並吸引至破口節點
    if ((currentStage === 2 || currentStage === 3) && Math.abs(p.x - WOUND_X) < 160) {
      p.activated = true;

      // 尋找尚未填滿的血小板栓節點
      if (!p.targetNode) {
        const emptyNode = plugNodes.find(n => !n.filled);
        if (emptyNode && Math.random() < 0.35) {
          p.targetNode = emptyNode;
        }
      }

      if (p.targetNode) {
        const dx = p.targetNode.x - p.x;
        const dy = p.targetNode.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 12) {
          p.targetNode.filled = true;
          // 補一顆新血小板從左側進入
          platelets[i] = createPlatelet(-20);
          continue;
        } else {
          p.x += (dx / dist) * 210 * scaledDt;
          p.y += (dy / dist) * 210 * scaledDt;
          continue;
        }
      }
    } else if (currentStage === 0 || currentStage === 5) {
      p.activated = false;
      p.targetNode = null;
    }

    p.x += p.vx * scaledDt;
    p.y += p.vy * scaledDt;
    p.angle += scaledDt * 1.5;

    if (p.y < walls.top + 8) {
      p.y = walls.top + 8;
      p.vy = Math.abs(p.vy);
    }
    if (p.y > walls.bottom - 8) {
      p.y = walls.bottom - 8;
      p.vy = -Math.abs(p.vy);
    }

    if (p.x > W + 30) {
      platelets[i] = createPlatelet(-20);
    }
  }

  // 更新白血球 (WBCs)
  for (let i = 0; i < wbcs.length; i++) {
    const w = wbcs[i];
    w.wobblePhase += scaledDt * 3;

    // 階段 3~4 部分白血球穿出血管進入受損真皮層清除碎片
    if ((currentStage === 3 || currentStage === 4) && !w.inTissue && Math.abs(w.x - WOUND_X) < 45 && i < 4) {
      w.inTissue = true;
    }
    if (currentStage === 0 || currentStage === 5) {
      w.inTissue = false;
    }

    if (w.inTissue) {
      const dx = w.targetX - w.x;
      const dy = w.targetY - w.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) {
        w.targetX = WOUND_X + (Math.random() - 0.5) * 120;
        w.targetY = DERMIS_TOP + 35 + Math.random() * 95;
      } else {
        w.x += (dx / dist) * 38 * scaledDt;
        w.y += (dy / dist) * 38 * scaledDt;
      }
    } else {
      const walls = getVesselWalls(w.x);
      w.x += w.vx * scaledDt;
      w.y += w.vy * scaledDt;

      if (w.y - w.radius < walls.top + 8) {
        w.y = walls.top + 8 + w.radius;
        w.vy = Math.abs(w.vy);
      }
      if (w.y + w.radius > walls.bottom - 8) {
        w.y = walls.bottom - 8 - w.radius;
        w.vy = -Math.abs(w.vy);
      }
      if (w.x > W + 40) {
        Object.assign(w, createWBC(-35));
      }
    }
  }

  updateMetricsUI();
}

// ==================== 繪圖函式 ====================

// 1. 繪製背景、表皮層、真皮層與血管外部組織
function drawTissueAndSkin() {
  // 體外空氣背景 (上方)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, SKIN_TOP);
  skyGrad.addColorStop(0, '#090d16');
  skyGrad.addColorStop(1, '#131c2e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, SKIN_TOP);

  // 真皮層與皮下組織底色
  const dermisGrad = ctx.createLinearGradient(0, DERMIS_TOP, 0, H);
  dermisGrad.addColorStop(0, '#fca5a5');
  dermisGrad.addColorStop(0.32, '#f87171');
  dermisGrad.addColorStop(0.55, '#dc2626');
  dermisGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = dermisGrad;
  ctx.fillRect(0, DERMIS_TOP, W, H - DERMIS_TOP);

  // 真皮層膠原蛋白纖維網紋理 (Collagen Fibers)
  ctx.save();
  ctx.strokeStyle = 'rgba(254, 226, 226, 0.22)';
  ctx.lineWidth = 2;
  for (let y = DERMIS_TOP + 18; y < VESSEL_TOP_BASE - 10; y += 22) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 30) {
      const waveY = y + Math.sin(x * 0.03 + y) * 5;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 表皮層 (Epidermis)
  const epiGrad = ctx.createLinearGradient(0, SKIN_TOP, 0, EPIDERMIS_BOTTOM);
  epiGrad.addColorStop(0, '#fdba74');
  epiGrad.addColorStop(0.25, '#fed7aa');
  epiGrad.addColorStop(1, '#fca5a5');
  ctx.fillStyle = epiGrad;
  ctx.fillRect(0, SKIN_TOP, W, EPIDERMIS_BOTTOM - SKIN_TOP);

  // 表皮與真皮交界處的波浪狀基底膜 (Dermal Papillae)
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.moveTo(0, EPIDERMIS_BOTTOM);
  for (let x = 0; x <= W; x += 20) {
    const py = EPIDERMIS_BOTTOM + Math.sin(x * 0.12) * 5;
    ctx.lineTo(x, py);
  }
  ctx.lineTo(W, EPIDERMIS_BOTTOM + 12);
  ctx.lineTo(0, EPIDERMIS_BOTTOM + 12);
  ctx.closePath();
  ctx.fill();

  // 表皮最外層角質線條
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, SKIN_TOP);
  ctx.lineTo(W, SKIN_TOP);
  ctx.stroke();

  // 組織分層標籤 (左側半透明標示)
  ctx.save();
  ctx.font = '600 12px sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fillRect(14, SKIN_TOP + 10, 118, 22);
  ctx.fillRect(14, DERMIS_TOP + 18, 145, 22);
  ctx.fillStyle = '#fff';
  ctx.fillText('表皮層 (Epidermis)', 22, SKIN_TOP + 25);
  ctx.fillText('真皮層與膠原蛋白', 22, DERMIS_TOP + 33);
  ctx.restore();
}

// 2. 繪製微血管通道與內皮細胞牆
function drawBloodVessel() {
  const step = 15;
  // 取得修復後的有效破口寬度
  const effectiveHeal = currentStage >= 4 ? state.healProgress : 0;
  const currentWoundFactor = state.woundOpen * (1 - effectiveHeal);
  const currentBreachHalfW = VESSEL_BREACH_HALF_W * currentWoundFactor;

  // 繪製血管內部深暗紅腔室背景
  ctx.save();
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) {
    const walls = getVesselWalls(x);
    if (x === 0) ctx.moveTo(x, walls.top);
    else ctx.lineTo(x, walls.top);
  }
  for (let x = W; x >= 0; x -= step) {
    const walls = getVesselWalls(x);
    ctx.lineTo(x, walls.bottom);
  }
  ctx.closePath();

  const lumenGrad = ctx.createLinearGradient(0, VESSEL_TOP_BASE, 0, VESSEL_BOTTOM_BASE);
  lumenGrad.addColorStop(0, '#450a0a');
  lumenGrad.addColorStop(0.5, '#7f1d1d');
  lumenGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = lumenGrad;
  ctx.fill();
  ctx.restore();

  // 繪製血管內皮細胞磚塊 (Endothelial Cells)
  const cellLen = 36;
  const cellThick = 11;

  for (let x = 0; x < W; x += cellLen) {
    const centerX = x + cellLen * 0.5;
    const walls = getVesselWalls(centerX);

    // 下壁內皮細胞 (始終完整)
    drawEndothelialCell(centerX, walls.bottom, cellLen - 3, cellThick);

    // 上壁內皮細胞 (若位於血管破口區則斷裂缺損)
    const distFromWound = Math.abs(centerX - WOUND_X);
    if (distFromWound > currentBreachHalfW) {
      drawEndothelialCell(centerX, walls.top, cellLen - 3, cellThick);
    }
  }

  // 若血管有破口，在破口兩側繪製暴露的亮黃色「受損膠原蛋白纖維 (Exposed Collagen)」
  if (currentBreachHalfW > 6 && currentStage >= 1 && currentStage <= 4) {
    const leftEdge = WOUND_X - currentBreachHalfW;
    const rightEdge = WOUND_X + currentBreachHalfW;
    const leftWall = getVesselWalls(leftEdge).top;
    const rightWall = getVesselWalls(rightEdge).top;

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.2;
    for (let side of [-1, 1]) {
      const baseX = side === -1 ? leftEdge : rightEdge;
      const baseY = side === -1 ? leftWall : rightWall;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(baseX - side * 8, baseY - 4 + k * 3);
        ctx.quadraticCurveTo(
          baseX + side * 10,
          baseY + 8 + Math.sin(stageTime * 5 + k) * 4,
          baseX + side * 18,
          baseY + 2 + k * 2
        );
        ctx.stroke();
      }
    }

    // 標示暴露的膠原蛋白 (階段 1 & 2)
    if (currentStage === 1 || currentStage === 2) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('⚡ 暴露膠原蛋白 (活化血小板)', WOUND_X + currentBreachHalfW + 10, rightWall - 10);
    }
    ctx.restore();
  }

  // 血管標籤
  ctx.save();
  ctx.font = '600 12px sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fillRect(14, VESSEL_TOP_BASE + 14, 155, 22);
  ctx.fillStyle = '#fecaca';
  ctx.fillText('微血管腔 (Blood Vessel)', 22, VESSEL_TOP_BASE + 29);
  ctx.restore();
}

function drawEndothelialCell(cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = '#f87171';
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 5);
  ctx.fill();
  ctx.stroke();

  // 內皮細胞核
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 3. 繪製皮膚與真皮層的 V 型受損傷口裂谷
function drawWoundCavity() {
  if (state.woundOpen <= 0.01) return;

  // 隨階段 4~5 組織癒合，傷口深度與寬度由下往上收合
  const heal = currentStage >= 4 ? state.healProgress : 0;
  const openRatio = state.woundOpen * (1 - heal * 0.92);
  if (openRatio <= 0.02) return;

  const topHalfW = WOUND_HALF_W * openRatio;
  const bottomHalfW = VESSEL_BREACH_HALF_W * openRatio;
  const centerWalls = getVesselWalls(WOUND_X);
  const bottomY = centerWalls.top - heal * (centerWalls.top - SKIN_TOP - 10);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(WOUND_X - topHalfW, SKIN_TOP - 2);
  ctx.lineTo(WOUND_X - bottomHalfW, bottomY + 4);
  ctx.lineTo(WOUND_X + bottomHalfW, bottomY + 4);
  ctx.lineTo(WOUND_X + topHalfW, SKIN_TOP - 2);
  ctx.closePath();

  // 傷口內部陰影與出血色澤
  const woundGrad = ctx.createLinearGradient(0, SKIN_TOP, 0, bottomY);
  if (currentStage === 1 || currentStage === 2) {
    woundGrad.addColorStop(0, '#450a0a');
    woundGrad.addColorStop(0.45, '#7f1d1d');
    woundGrad.addColorStop(1, '#991b1b');
  } else {
    woundGrad.addColorStop(0, '#3b0764');
    woundGrad.addColorStop(0.3, '#450a0a');
    woundGrad.addColorStop(1, '#7f1d1d');
  }
  ctx.fillStyle = woundGrad;
  ctx.fill();

  // 傷口兩側受損不規則邊緣線
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // 若在階段 1 刀片剛切下，繪製鋒利刀片動畫
  if (state.bladeAnim > 0 && state.bladeAnim < 0.95) {
    const bladeY = SKIN_TOP - 40 + Math.sin(state.bladeAnim * Math.PI) * 265;
    ctx.save();
    ctx.translate(WOUND_X, bladeY);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-28, -90);
    ctx.lineTo(28, -90);
    ctx.lineTo(6, 25);
    ctx.lineTo(0, 42);
    ctx.lineTo(-6, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// 4. 繪製紅血球、白血球與流動血小板
function drawBloodCells() {
  // 繪製化學活化訊號波 (ADP / 血栓素 A2)
  signals.forEach(s => {
    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${s.alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // 繪製紅血球 (RBCs)
  rbcs.forEach(r => {
    ctx.save();
    ctx.globalAlpha = r.alpha;
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);

    // 雙凹圓盤外圈
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, r.radius, r.radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 雙凹圓盤中央凹陷暗區
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(0, 0, r.radius * 0.48, r.radius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 繪製白血球 (WBCs)
  wbcs.forEach(w => {
    ctx.save();
    ctx.translate(w.x, w.y);
    const wobble = Math.sin(w.wobblePhase) * 1.5;

    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, w.radius + wobble, w.radius - wobble * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 多葉細胞核
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(-4, -2, 4.5, 0, Math.PI * 2);
    ctx.arc(4, -1, 4, 0, Math.PI * 2);
    ctx.arc(0, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 繪製流動中的血小板 (Platelets)
  platelets.forEach(p => {
    drawSinglePlatelet(p.x, p.y, p.angle, p.activated);
  });
}

// 繪製單顆血小板 (未活化為平滑小橢圓，活化後伸出星芒狀偽足)
function drawSinglePlatelet(x, y, angle, activated, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  if (!activated) {
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // 活化血小板：亮黃色星芒狀帶有偽足 (Spiky pseudopods)
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.3;
    const spikes = 7;
    const outerR = 10.5;
    const innerR = 4.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / spikes;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// 5. 繪製傷口處聚集的「血小板栓」與「纖維蛋白網 (Fibrin Mesh)」
function drawClotAndFibrin() {
  if (currentStage === 0) return;

  // 在階段 5 (纖溶作用)，血塊隨修復完成逐漸消退
  const fibrinolysisFade = currentStage === 5
    ? Math.max(0, 1 - (state.healProgress - 0.65) * 3.0)
    : 1;
  if (fibrinolysisFade <= 0.02) return;

  const centerWalls = getVesselWalls(WOUND_X);
  const pinchOffset = centerWalls.top - VESSEL_TOP_BASE;

  ctx.save();
  ctx.globalAlpha = fibrinolysisFade;

  // 先畫被攔截在血塊中的紅血球與活化血小板節點
  plugNodes.forEach((node, idx) => {
    if (!node.filled) return;
    const ny = node.y + pinchOffset * 0.7;

    if (node.hasRBC && (currentStage >= 2)) {
      ctx.save();
      ctx.translate(node.x, ny - 3);
      ctx.rotate(node.rbcAngle);
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9.5, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawSinglePlatelet(node.x, ny, idx * 0.7, true, 1.05);
  });

  // 階段 3~5：繪製金黃色交織的「纖維蛋白網 (Fibrin Mesh)」
  if (state.fibrinProgress > 0.01) {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 4;
    ctx.lineWidth = 2.4;

    fibrinStrands.forEach(strand => {
      if (state.fibrinProgress >= strand.threshold) {
        const localProg = Math.min(1, (state.fibrinProgress - strand.threshold) / 0.25);
        const ay = strand.ay + pinchOffset * 0.7;
        const by = strand.by + pinchOffset * 0.7;
        const curBx = strand.ax + (strand.bx - strand.ax) * localProg;
        const curBy = ay + (by - ay) * localProg;

        ctx.beginPath();
        ctx.moveTo(strand.ax, ay);
        ctx.lineTo(curBx, curBy);
        ctx.stroke();
      }
    });

    // 橫跨血管破口基底的主纖維蛋白加固索
    const spanW = VESSEL_BREACH_HALF_W * 1.1;
    for (let k = 0; k < 6; k++) {
      if (state.fibrinProgress > k * 0.15) {
        const yOff = centerWalls.top - 4 - k * 10;
        ctx.beginPath();
        ctx.moveTo(WOUND_X - spanW, yOff);
        ctx.quadraticCurveTo(WOUND_X, yOff + (k % 2 === 0 ? 8 : -8), WOUND_X + spanW, yOff);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

// 6. 繪製階段 4~5 的表面結痂 (Scab) 與成纖維細胞修復特效
function drawScabAndHealing() {
  // 繪製成纖維細胞與新生組織微光 (Stage 4 & 5)
  if (currentStage === 4 || currentStage === 5) {
    ctx.save();
    fibroblasts.forEach(f => {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(stageTime * 2.5 + f.phase));
      ctx.fillStyle = `rgba(52, 211, 153, ${pulse * (1 - state.healProgress * 0.5)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 繪製皮膚表面的暗紅褐色硬痂 (Scab)
  if (state.scabProgress > 0.02) {
    ctx.save();
    // 在階段 5 尾聲，痂皮向上微浮並淡出脫落
    const liftY = currentStage === 5 && state.healProgress > 0.75
      ? -(state.healProgress - 0.75) * 90
      : 0;
    ctx.globalAlpha = Math.min(1, state.scabProgress);
    ctx.translate(0, liftY);

    const scabW = WOUND_HALF_W * 1.12;
    ctx.fillStyle = '#450a0a';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(WOUND_X - scabW, SKIN_TOP + 2);
    ctx.quadraticCurveTo(WOUND_X, SKIN_TOP - 16, WOUND_X + scabW, SKIN_TOP + 2);
    ctx.lineTo(WOUND_X + scabW * 0.75, SKIN_TOP + 22);
    ctx.quadraticCurveTo(WOUND_X, SKIN_TOP + 30, WOUND_X - scabW * 0.75, SKIN_TOP + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 痂皮標籤
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'center';
    ctx.fillText('保護性痂皮 (Scab)', WOUND_X, SKIN_TOP - 14);
    ctx.restore();
  }
}

// 7. 繪製畫布上的即時生理動態指示標籤 (Annotations)
function drawCanvasAnnotations() {
  ctx.save();
  ctx.textAlign = 'center';

  if (currentStage === 0) {
    // 提示點擊皮膚造成傷口
    const pulse = Math.sin(stageTime * 4) * 4;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('👇 點擊此處皮膚造成創傷 👇', WOUND_X, SKIN_TOP - 16 + pulse);
  } else if (currentStage === 1) {
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🩸 血管內皮破裂，紅血球外溢出血', WOUND_X, SKIN_TOP - 16);
  } else if (currentStage === 2) {
    const centerWalls = getVesselWalls(WOUND_X);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✨ 血小板接觸膠原蛋白活化並聚集 (點擊傷口可加速支援)', WOUND_X, SKIN_TOP - 16);

    // 血管收縮雙箭頭標示
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('⬇ 血管反射性收縮 (Vasospasm) ⬇', WOUND_X - 150, centerWalls.top - 12);
    ctx.fillText('⬆ 平滑肌收縮減緩血流 ⬆', WOUND_X - 150, centerWalls.bottom + 22);
  } else if (currentStage === 3) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🕸️ 凝血酶將纖維蛋白原轉為「纖維蛋白網」，穩固血栓', WOUND_X, SKIN_TOP - 16);
  } else if (currentStage === 4) {
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🩹 白血球清理碎片，血管內皮與真皮組織由下往上再生', WOUND_X, DERMIS_TOP + 22);
  } else if (currentStage === 5 && state.healProgress > 0.85) {
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✅ 纖溶酶分解多餘血栓，皮膚與血管完全恢復健康！', WOUND_X, SKIN_TOP - 16);
  }

  ctx.restore();
}

// 主渲染迴圈
let lastTimestamp = performance.now();
function renderLoop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (!isPaused) {
    updateSimulation(dt);
  }

  ctx.clearRect(0, 0, W, H);
  drawTissueAndSkin();
  drawWoundCavity();
  drawBloodVessel();
  drawBloodCells();
  drawClotAndFibrin();
  drawScabAndHealing();
  drawCanvasAnnotations();

  requestAnimationFrame(renderLoop);
}

// ==================== 事件綁定 ====================

// 階段導覽列點擊切換
stageStepperButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetStage = parseInt(btn.getAttribute('data-stage'), 10);
    setStage(targetStage);
  });
});

// 上一階段 / 下一階段
btnPrev.addEventListener('click', () => {
  if (currentStage > 0) setStage(currentStage - 1);
});

btnNext.addEventListener('click', () => {
  if (currentStage < STAGES.length - 1) setStage(currentStage + 1);
});

// 主動作按鈕
btnAction.addEventListener('click', () => {
  if (currentStage < STAGES.length - 1) {
    setStage(currentStage + 1);
  } else {
    setStage(0);
  }
});

// 階段 2 專屬互動：手動召喚更多血小板支援
btnAddPlatelets.addEventListener('click', () => {
  spawnReinforcementPlatelets(WOUND_X, VESSEL_TOP_BASE);
});

// 點擊畫布互動
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  if (currentStage === 0) {
    setStage(1);
  } else if (currentStage === 2) {
    spawnReinforcementPlatelets(clickX, clickY);
  } else if (currentStage < STAGES.length - 1) {
    setStage(currentStage + 1);
  } else {
    setStage(0);
  }
});

// 自動演示開關
btnAuto.addEventListener('click', () => {
  autoPlay = !autoPlay;
  btnAuto.textContent = autoPlay ? '🔄 自動演示: 開' : '🔄 自動演示: 關';
  btnAuto.classList.toggle('btn-Secondary-active', autoPlay);
});

// 暫停 / 繼續動畫
btnPause.addEventListener('click', () => {
  isPaused = !isPaused;
  btnPause.textContent = isPaused ? '▶️ 繼續動畫' : '⏸️ 暫停動畫';
});

// 重置模擬
btnReset.addEventListener('click', () => {
  isPaused = false;
  btnPause.textContent = '⏸️ 暫停動畫';
  initParticles();
  setStage(0);
});

// 速度滑桿
speedSlider.addEventListener('input', (e) => {
  simSpeed = parseFloat(e.target.value);
  speedVal.textContent = `${simSpeed.toFixed(1)}x`;
});

// 啟動模擬
initParticles();
setStage(0);
requestAnimationFrame(renderLoop);

/**
 * 人體的三道防線與疫苗作用原理 - 動態互動模擬器
 * Pure HTML5 Canvas + Vanilla JS (No Node.js required)
 */

const simCanvas = document.getElementById('sim-canvas');
const ctx = simCanvas.getContext('2d');
const chartCanvas = document.getElementById('chart-canvas');
const chartCtx = chartCanvas.getContext('2d');

const W = simCanvas.width;  // 900
const H = simCanvas.height; // 500

// 版面解剖區域定義
const ZONE = {
  SKIN_TOP: 95,
  SKIN_BOTTOM: 140,
  WOUND_X_MIN: 380,
  WOUND_X_MAX: 520,
  VESSEL_TOP: 355,
  VESSEL_BOTTOM: 410,
  LYMPH_TOP: 410,
  LYMPH_BOTTOM: 500
};

// 病原體株系設定
const STRAINS = {
  A: { name: 'A 型病毒', color: '#f43f5e', light: '#fda4af', shape: 'triangle', symbol: '▲' },
  B: { name: 'B 型細菌', color: '#a855f7', light: '#d8b4fe', shape: 'circle', symbol: '●' },
  C: { name: 'C 型變異株', color: '#eab308', light: '#fde047', shape: 'square', symbol: '■' }
};

// 全域模擬狀態
let state = {
  selectedStrain: 'A',
  hasWound: false,
  mucusWaveTimer: 0,
  inflammationLevel: 0, // 0 ~ 100 (控制微血管擴張、紅腫熱痛視覺與通透性)
  tissueHealth: 100,
  frameCount: 0,

  // 實體陣列
  pathogens: [],       // 外界與組織內的病原體 & 疫苗抗原
  histamines: [],      // 肥大細胞釋放的組織胺訊號分子
  phagocytes: [],      // 吞噬細胞（巨噬細胞 / 嗜中性球）
  antibodies: [],      // Y 型專一性抗體
  cytotoxicTCells: [], // 胞毒 T 細胞（細胞免疫）
  floatingLabels: [],  // 畫布動態文字標籤
  rbcs: [],            // 血管內的紅血球（背景動態）
  epithelialCells: [], // 皮膚表皮細胞與皮下組織細胞

  // 第三道防線：各株系的專一性免疫與記憶狀態
  immuneMemory: {
    A: { progress: 0, memorized: false, activeResponse: 0, bCellCount: 1, plasmaActive: 0 },
    B: { progress: 0, memorized: false, activeResponse: 0, bCellCount: 1, plasmaActive: 0 },
    C: { progress: 0, memorized: false, activeResponse: 0, bCellCount: 1, plasmaActive: 0 }
  },

  // 抗體濃度歷史紀錄（繪製即時圖表）
  chartHistory: []
};

// ==================== 初始化與重設 ====================

function initSimulation() {
  state.hasWound = false;
  state.mucusWaveTimer = 0;
  state.inflammationLevel = 0;
  state.tissueHealth = 100;
  state.frameCount = 0;

  state.pathogens = [];
  state.histamines = [];
  state.antibodies = [];
  state.cytotoxicTCells = [];
  state.floatingLabels = [];
  state.chartHistory = [];

  ['A', 'B', 'C'].forEach(s => {
    state.immuneMemory[s] = {
      progress: 0,
      memorized: false,
      activeResponse: 0,
      bCellCount: 1,
      plasmaActive: 0
    };
  });

  // 建立血管內紅血球
  state.rbcs = [];
  for (let i = 0; i < 18; i++) {
    state.rbcs.push({
      x: Math.random() * W,
      y: ZONE.VESSEL_TOP + 12 + Math.random() * (ZONE.VESSEL_BOTTOM - ZONE.VESSEL_TOP - 24),
      vx: 1.2 + Math.random() * 0.8,
      r: 6 + Math.random() * 2
    });
  }

  // 建立預設吞噬細胞（部分在組織巡邏，部分在微血管內隨血液流動）
  state.phagocytes = [];
  for (let i = 0; i < 3; i++) {
    state.phagocytes.push(createPhagocyte(150 + i * 280, 220 + Math.random() * 80, false));
  }
  for (let i = 0; i < 4; i++) {
    state.phagocytes.push(createPhagocyte(Math.random() * W, ZONE.VESSEL_TOP + 27, true));
  }

  updateWoundButtonUI();
  updateMemoryUI();
  clearLogs();
  addLog('系統就緒：第一道防線「皮膚與黏膜」保持完整，等待實驗操作。', 'line1');
}

function createPhagocyte(x, y, inVessel = false) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    r: 16,
    inVessel,
    diapedesis: false,      // 是否正在變形「穿出」微血管壁 (血管 -> 組織)
    returningVessel: false, // 是否正在變形「返回」微血管/淋巴管 (組織 -> 血管)
    idleTicks: 0,           // 組織內無病原體的閒置時間，過久時多餘白血球會鑽回血管巡邏
    carryingStrain: null,   // 吞噬後準備呈獻給淋巴結 T 細胞的抗原
    presentingTimer: 0,
    engulfCount: 0,
    wobbleSeed: Math.random() * 100
  };
}

// ==================== 病原體、疫苗與特效生成 ====================

function spawnPathogen(x, y, strain, isVaccine = false, forceZone = 'external') {
  const angle = Math.random() * Math.PI * 2;
  const speed = isVaccine ? 0.5 : 0.9;
  state.pathogens.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: forceZone === 'external' ? Math.abs(Math.sin(angle) * speed) + 0.5 : Math.sin(angle) * speed,
    r: isVaccine ? 8 : 9,
    strain,
    isVaccine,
    zone: forceZone, // 'external' 或 'tissue'
    boundAntibodies: 0, // 被幾個專一性抗體結合（中和）
    replicateTimer: 260 + Math.floor(Math.random() * 180),
    hp: 100
  });
}

function addFloatingLabel(x, y, text, color = '#ffffff') {
  state.floatingLabels.push({
    x,
    y,
    text,
    color,
    alpha: 1.0,
    vy: -0.7
  });
}

function addLog(message, type = 'line1') {
  const logContainer = document.getElementById('event-log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const now = new Date();
  const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span>${message}`;
  logContainer.prepend(entry);
  while (logContainer.children.length > 25) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

function clearLogs() {
  document.getElementById('event-log').innerHTML = '';
}

// ==================== 核心操作行為 ====================

// 1. 體表散播病原體（測試第一道防線）
function dropExternalPathogens(strain = state.selectedStrain, count = 10) {
  for (let i = 0; i < count; i++) {
    const x = 120 + Math.random() * (W - 240);
    const y = 15 + Math.random() * 55;
    spawnPathogen(x, y, strain, false, 'external');
  }
  if (state.hasWound) {
    addLog(`⚠️ 體表散播 ${STRAINS[strain].name}：因皮膚有傷口，部分病原體將從破口侵入皮下組織！`, 'line1');
  } else {
    addLog(`🛡️ 體表散播 ${STRAINS[strain].name}：完整皮膚角質層與黏膜成功阻擋病原體於體外！`, 'line1');
  }
}

// 2. 直接入侵皮下組織（穿刺傷口，觸發第二、三道防線）
function injectTissuePathogens(strain = state.selectedStrain, count = 8) {
  state.hasWound = true;
  updateWoundButtonUI();

  for (let i = 0; i < count; i++) {
    const x = (ZONE.WOUND_X_MIN + ZONE.WOUND_X_MAX) / 2 + (Math.random() - 0.5) * 90;
    const y = ZONE.SKIN_BOTTOM + 20 + Math.random() * 70;
    spawnPathogen(x, y, strain, false, 'tissue');
  }

  // 觸發肥大細胞釋放組織胺（發炎反應）
  triggerInflammation((ZONE.WOUND_X_MIN + ZONE.WOUND_X_MAX) / 2, ZONE.SKIN_BOTTOM + 35);

  const mem = state.immuneMemory[strain];
  if (mem.memorized) {
    addLog(`⚡ ${STRAINS[strain].name}入侵！記憶細胞瞬間辨識，立即啟動「二次免疫反應」大量分泌抗體！`, 'line3');
    addFloatingLabel(450, 445, `⚡ 記憶喚醒！${strain}型抗體爆發！`, STRAINS[strain].light);
  } else {
    addLog(`🚨 ${STRAINS[strain].name}突破皮膜入侵組織！肥大細胞釋放組織胺，啟動第二道防線「發炎與吞噬」！`, 'line2');
  }
}

// 3. 接種疫苗（不傷組織、低發炎、誘發專一性記憶與抗體）
function injectVaccine(strain = state.selectedStrain) {
  const count = 9;
  for (let i = 0; i < count; i++) {
    const x = 250 + Math.random() * 400;
    const y = ZONE.SKIN_BOTTOM + 40 + Math.random() * 120;
    spawnPathogen(x, y, strain, true, 'tissue');
  }

  addFloatingLabel(450, 210, `💉 接種 ${STRAINS[strain].name} 疫苗（無致病力抗原）`, '#38bdf8');
  addLog(`💉 注射「${STRAINS[strain].name}疫苗」：含減毒/死抗原，不破壞組織，吞噬細胞開始進行抗原呈獻以訓練記憶細胞！`, 'vaccine');
}

// 4. 觸發黏膜纖毛與溶菌酶沖刷
function triggerMucusSweep() {
  state.mucusWaveTimer = 90;
  addFloatingLabel(450, 55, '💧 黏膜纖毛擺動 + 溶菌酶殺菌沖刷！', '#38bdf8');
  addLog('💧 第一道防線：分泌淚液/唾液溶菌酶與呼吸道黏液，清除體表病原體。', 'line1');
}

// 5. 觸發發炎反應（組織胺釋放）
function triggerInflammation(cx, cy) {
  state.inflammationLevel = Math.min(100, state.inflammationLevel + 55);
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 2;
    state.histamines.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * spd,
      vy: Math.abs(Math.sin(angle)) * spd + 0.8, // 往下方微血管擴散
      life: 110 + Math.random() * 50
    });
  }
  addFloatingLabel(cx, cy - 10, '🔥 肥大細胞釋放「組織胺」→ 微血管擴張', '#fb923c');
}

// ==================== 模擬更新迴圈 (Physics & AI) ====================

function updateSimulation() {
  state.frameCount++;

  const tissuePathogens = state.pathogens.filter(p => p.zone === 'tissue' && !p.isVaccine);
  const tissueVaccines = state.pathogens.filter(p => p.zone === 'tissue' && p.isVaccine);
  const allTissueAntigens = state.pathogens.filter(p => p.zone === 'tissue');

  // 1. 更新黏膜溶菌酶波浪
  if (state.mucusWaveTimer > 0) {
    state.mucusWaveTimer--;
    const sweepX = ((90 - state.mucusWaveTimer) / 90) * (W + 100);
    state.pathogens.forEach(p => {
      if (p.zone === 'external' && p.x < sweepX) {
        p.vx += 3.5;
        p.hp -= 12;
      }
    });
  }

  // 2. 更新發炎程度與組織健康度
  if (tissuePathogens.length > 0) {
    state.inflammationLevel = Math.min(100, state.inflammationLevel + 0.35);
    // 若病原體未被抗體中和，會緩慢消耗組織健康度
    const activeHarmful = tissuePathogens.filter(p => p.boundAntibodies < 2).length;
    state.tissueHealth = Math.max(15, state.tissueHealth - activeHarmful * 0.012);

    // 偶爾補充組織胺粒子視覺
    if (state.frameCount % 55 === 0) {
      const sample = tissuePathogens[Math.floor(Math.random() * tissuePathogens.length)];
      state.histamines.push({
        x: sample.x,
        y: sample.y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.5,
        life: 80
      });
    }
  } else {
    state.inflammationLevel = Math.max(0, state.inflammationLevel - 0.45);
    state.tissueHealth = Math.min(100, state.tissueHealth + 0.08);
  }

  // 發炎時自動從血管補充吞噬細胞（白血球徵召）
  if (state.inflammationLevel > 30 && state.phagocytes.length < 11 && state.frameCount % 95 === 0) {
    state.phagocytes.push(createPhagocyte(20, ZONE.VESSEL_TOP + 28, true));
  }

  // 3. 更新組織胺粒子
  for (let i = state.histamines.length - 1; i >= 0; i--) {
    const h = state.histamines[i];
    h.x += h.vx;
    h.y += h.vy;
    h.life--;
    if (h.life <= 0 || h.y > ZONE.VESSEL_BOTTOM) {
      state.histamines.splice(i, 1);
    }
  }

  // 4. 更新病原體與疫苗粒子
  for (let i = state.pathogens.length - 1; i >= 0; i--) {
    const p = state.pathogens[i];

    // 被抗體結合（中和）後移動變慢且失去複製能力
    const speedFactor = p.boundAntibodies > 0 ? 0.35 : 1.0;
    p.x += p.vx * speedFactor;
    p.y += p.vy * speedFactor;

    // 邊界反彈或清除
    if (p.zone === 'external') {
      if (p.x < 10 || p.x > W - 10) {
        if (state.mucusWaveTimer > 0 && p.x > W - 15) {
          state.pathogens.splice(i, 1);
          continue;
        }
        p.vx *= -1;
      }
      if (p.y < 10) p.vy = Math.abs(p.vy);

      // 檢查是否碰到皮膚表面 (ZONE.SKIN_TOP)
      if (p.y + p.r >= ZONE.SKIN_TOP) {
        const inWoundRange = state.hasWound && p.x > ZONE.WOUND_X_MIN && p.x < ZONE.WOUND_X_MAX;
        if (inWoundRange) {
          // 穿過傷口進入皮下組織！
          p.zone = 'tissue';
          p.y = ZONE.SKIN_BOTTOM + 8;
          p.vy = 1.2 + Math.random();
          triggerInflammation(p.x, p.y + 15);
          addFloatingLabel(p.x, ZONE.SKIN_BOTTOM, '⚠️ 從傷口入侵！', '#fb7185');
        } else {
          // 被完整角質層彈開，且受皮表弱酸/溶菌酶微幅傷害
          p.y = ZONE.SKIN_TOP - p.r;
          p.vy = -Math.abs(p.vy) * 0.85;
          p.vx += (Math.random() - 0.5) * 0.8;
          p.hp -= 15;
          if (p.hp <= 0) {
            addFloatingLabel(p.x, p.y, '皮膜溶菌酶消滅', '#4ade80');
            state.pathogens.splice(i, 1);
            continue;
          }
        }
      }
    } else {
      // 在皮下組織內活動 (ZONE.SKIN_BOTTOM ~ ZONE.VESSEL_TOP)
      if (p.x < 20 || p.x > W - 20) p.vx *= -1;
      if (p.y < ZONE.SKIN_BOTTOM + 12) p.vy = Math.abs(p.vy);
      if (p.y > ZONE.VESSEL_TOP - 14) p.vy = -Math.abs(p.vy);

      // 隨機微調方向
      if (Math.random() < 0.05) {
        p.vx += (Math.random() - 0.5) * 0.5;
        p.vy += (Math.random() - 0.5) * 0.5;
        const mag = Math.hypot(p.vx, p.vy) || 1;
        const maxSpd = p.isVaccine ? 0.6 : 1.1;
        if (mag > maxSpd) {
          p.vx = (p.vx / mag) * maxSpd;
          p.vy = (p.vy / mag) * maxSpd;
        }
      }

      // 真實病原體（非疫苗）且未被抗體中和時，會在組織內增殖複製
      if (!p.isVaccine && p.boundAntibodies === 0) {
        p.replicateTimer--;
        if (p.replicateTimer <= 0 && tissuePathogens.length < 32) {
          p.replicateTimer = 300 + Math.floor(Math.random() * 180);
          spawnPathogen(p.x + (Math.random() - 0.5) * 18, p.y + (Math.random() - 0.5) * 18, p.strain, false, 'tissue');
          addFloatingLabel(p.x, p.y, '🦠 病原體複製', STRAINS[p.strain].light);
        }
      }
    }

    if (p.hp <= 0) {
      state.pathogens.splice(i, 1);
    }
  }

  // 5. 更新紅血球背景流動
  state.rbcs.forEach(rbc => {
    rbc.x += rbc.vx * (1 + state.inflammationLevel * 0.008);
    if (rbc.x > W + 20) rbc.x = -20;
  });

  // 6. 更新吞噬細胞（巨噬細胞 / 白血球）：支援變形「穿出微血管」與「返回微血管/淋巴」
  const tissuePhagocyteCount = state.phagocytes.filter(c => !c.inVessel && !c.returningVessel).length;

  state.phagocytes.forEach((cell, cellIdx) => {
    cell.wobbleSeed += 0.08;

    if (cell.inVessel) {
      // 在微血管中隨血液向右流動
      cell.x += 1.4;
      cell.y = ZONE.VESSEL_TOP + 27 + Math.sin(cell.wobbleSeed) * 3;
      if (cell.x > W + 25) cell.x = -25;

      // 若組織有發炎或抗原入侵，白血球從微血管內皮細胞縫隙「變形穿出」(Diapedesis)
      if ((state.inflammationLevel > 15 || allTissueAntigens.length > 0) && cell.x > 100 && cell.x < W - 100) {
        if (Math.random() < 0.045) {
          cell.inVessel = false;
          cell.diapedesis = true;
          cell.returningVessel = false;
          cell.idleTicks = 0;
          addFloatingLabel(cell.x, ZONE.VESSEL_TOP - 6, '⬆️ 白血球變形鑽出微血管壁！', '#fde047');
        }
      }
    } else if (cell.diapedesis) {
      // 正在從微血管壁縫隙向上擠壓鑽入皮下組織
      cell.y -= 1.1;
      cell.x += Math.sin(cell.wobbleSeed * 2) * 0.4;
      if (cell.y <= ZONE.VESSEL_TOP - 22) {
        cell.diapedesis = false;
      }
    } else if (cell.returningVessel) {
      // 感染平息或攜帶抗原返回微血管/淋巴系統
      if (allTissueAntigens.length > 0) {
        // 若途中又有新病原體入侵，立刻掉頭回組織作戰
        cell.returningVessel = false;
        cell.diapedesis = true;
        return;
      }
      cell.y += 1.05;
      cell.x += Math.sin(cell.wobbleSeed * 2) * 0.4;
      if (cell.y >= ZONE.VESSEL_TOP + 26) {
        cell.returningVessel = false;
        cell.inVessel = true;
        cell.idleTicks = 0;
        addFloatingLabel(cell.x, ZONE.VESSEL_TOP + 12, '⬇️ 白血球穿過血管壁返回血液循環', '#38bdf8');
      }
    } else {
      // 在皮下組織中尋找病原體或疫苗抗原
      let target = null;
      let minDist = Infinity;

      allTissueAntigens.forEach(p => {
        // 被抗體調理（Opsonization）的病原體更容易吸引吞噬細胞！
        const weight = p.boundAntibodies > 0 ? 0.45 : 1.0;
        const d = Math.hypot(p.x - cell.x, p.y - cell.y) * weight;
        if (d < minDist) {
          minDist = d;
          target = p;
        }
      });

      if (target) {
        cell.idleTicks = 0;
        const dx = target.x - cell.x;
        const dy = target.y - cell.y;
        const dist = Math.hypot(dx, dy) || 1;
        const chaseSpeed = target.boundAntibodies > 0 ? 2.1 : 1.45;
        cell.vx = (dx / dist) * chaseSpeed;
        cell.vy = (dy / dist) * chaseSpeed;

        // 接觸並吞噬病原體
        if (dist < cell.r + target.r - 2) {
          const idx = state.pathogens.indexOf(target);
          if (idx !== -1) {
            state.pathogens.splice(idx, 1);
            cell.engulfCount++;
            cell.carryingStrain = target.strain;
            cell.presentingTimer = 130;

            // 推進該株系的抗原呈獻與第三道防線辨識進度！
            advanceImmuneRecognition(target.strain, target.isVaccine ? 26 : 18);

            addFloatingLabel(
              cell.x,
              cell.y - 12,
              target.boundAntibodies > 0 ? '⚪ 迅速吞噬(抗體標記)!' : '⚪ 吞噬並呈獻抗原!',
              '#38bdf8'
            );
          }
        }
      } else {
        // 組織內無病原體時自由巡邏，若增援的白血球閒置一段時間，會變形鑽回微血管/淋巴管！
        cell.idleTicks++;
        if (tissuePhagocyteCount > 2 && cell.idleTicks > 140 && cellIdx >= 2) {
          // 朝下方微血管壁移動並準備穿入血管
          cell.vx *= 0.8;
          cell.vy = 1.25;
          if (cell.y >= ZONE.VESSEL_TOP - 22) {
            cell.returningVessel = true;
            addFloatingLabel(cell.x, ZONE.VESSEL_TOP - 10, '⬇️ 任務完成，變形鑽回微血管/淋巴', '#a5f3fc');
          }
        } else {
          cell.vx += (Math.random() - 0.5) * 0.25;
          cell.vy += (Math.random() - 0.5) * 0.25;
          const mag = Math.hypot(cell.vx, cell.vy) || 1;
          if (mag > 0.9) {
            cell.vx = (cell.vx / mag) * 0.9;
            cell.vy = (cell.vy / mag) * 0.9;
          }
        }
      }

      cell.x += cell.vx;
      cell.y += cell.vy;

      // 組織邊界限制
      if (cell.x < 25) { cell.x = 25; cell.vx *= -1; }
      if (cell.x > W - 25) { cell.x = W - 25; cell.vx *= -1; }
      if (cell.y < ZONE.SKIN_BOTTOM + 20) { cell.y = ZONE.SKIN_BOTTOM + 20; cell.vy *= -1; }
      if (!cell.returningVessel && cell.y > ZONE.VESSEL_TOP - 18) {
        cell.y = ZONE.VESSEL_TOP - 18;
        cell.vy *= -1;
      }

      if (cell.presentingTimer > 0) cell.presentingTimer--;
    }
  });

  // 7. 更新第三道防線（專一性免疫：B 細胞活化、記憶建立、抗體與胞毒 T 細胞釋放）
  ['A', 'B', 'C'].forEach(strain => {
    const mem = state.immuneMemory[strain];
    const matchingAntigens = allTissueAntigens.filter(p => p.strain === strain);

    if (matchingAntigens.length > 0) {
      if (mem.memorized) {
        // 二次免疫反應：已有記憶細胞，跳過漫長辨識期，立即滿載活化！
        mem.progress = 100;
        mem.plasmaActive = Math.min(100, mem.plasmaActive + 8);
      } else {
        // 初次免疫反應：隨時間與吞噬細胞呈獻慢慢累積辨識度
        mem.progress = Math.min(100, mem.progress + 0.28);
        if (mem.progress >= 100) {
          completeMemorization(strain);
        }
      }
    } else {
      // 病原體清除後，漿細胞活性逐漸退場，但記憶永久保留
      mem.plasmaActive = Math.max(0, mem.plasmaActive - 0.8);
    }

    // 若已完全活化，釋放該株系專屬的 Y 型抗體與胞毒 T 細胞
    if (mem.memorized && (matchingAntigens.length > 0 || mem.plasmaActive > 15)) {
      const currentStrainAb = state.antibodies.filter(ab => ab.strain === strain).length;
      // 二次反應產生的抗體上限與速率遠高於初次反應剛完成時
      const spawnInterval = mem.bCellCount > 2 ? 7 : 14;
      const maxAb = mem.bCellCount > 2 ? 55 : 30;

      if (state.frameCount % spawnInterval === 0 && currentStrainAb < maxAb) {
        const lymphX = getLymphNodeX(strain) + (Math.random() - 0.5) * 70;
        state.antibodies.push({
          x: lymphX,
          y: ZONE.LYMPH_TOP + 25,
          vx: (Math.random() - 0.5) * 2,
          vy: -2.2 - Math.random() * 1.5,
          strain,
          life: 420
        });
      }

      // 同步派出專一性胞毒 T 細胞（針對真實病原體）
      const activeReal = matchingAntigens.filter(p => !p.isVaccine);
      const currentTCells = state.cytotoxicTCells.filter(t => t.strain === strain).length;
      if (activeReal.length > 0 && currentTCells < 4 && state.frameCount % 50 === 0) {
        state.cytotoxicTCells.push({
          x: getLymphNodeX(strain),
          y: ZONE.LYMPH_TOP + 20,
          vx: 0,
          vy: -2,
          r: 13,
          strain,
          life: 450
        });
      }
    }
  });

  // 8. 更新專一性抗體 (Y 型抗體只會結合相同株系的抗原！)
  for (let i = state.antibodies.length - 1; i >= 0; i--) {
    const ab = state.antibodies[i];
    ab.life--;
    if (ab.life <= 0) {
      state.antibodies.splice(i, 1);
      continue;
    }

    // 尋找同株系 (專一性!) 的病原體或疫苗抗原
    let target = null;
    let minDist = Infinity;
    allTissueAntigens.forEach(p => {
      if (p.strain === ab.strain && p.boundAntibodies < 3) {
        const d = Math.hypot(p.x - ab.x, p.y - ab.y);
        if (d < minDist) {
          minDist = d;
          target = p;
        }
      }
    });

    if (target) {
      const dx = target.x - ab.x;
      const dy = target.y - ab.y;
      const dist = Math.hypot(dx, dy) || 1;
      ab.vx = (dx / dist) * 3.4;
      ab.vy = (dy / dist) * 3.4;

      if (dist < target.r + 8) {
        target.boundAntibodies++;
        target.hp -= 35; // 抗體中和並加速瓦解
        state.antibodies.splice(i, 1);
        continue;
      }
    } else {
      // 在組織間巡弋
      if (ab.y > ZONE.VESSEL_TOP - 15) {
        ab.vy = -1.8;
      } else {
        ab.vx += (Math.random() - 0.5) * 0.4;
        ab.vy += (Math.random() - 0.5) * 0.4;
        const mag = Math.hypot(ab.vx, ab.vy) || 1;
        if (mag > 2.0) {
          ab.vx = (ab.vx / mag) * 2.0;
          ab.vy = (ab.vy / mag) * 2.0;
        }
      }
      if (ab.x < 15 || ab.x > W - 15) ab.vx *= -1;
      if (ab.y < ZONE.SKIN_BOTTOM + 15) ab.vy = Math.abs(ab.vy);
    }

    ab.x += ab.vx;
    ab.y += ab.vy;
  }

  // 9. 更新胞毒 T 細胞（細胞免疫：精準獵殺同株系病原體/受感染細胞）
  for (let i = state.cytotoxicTCells.length - 1; i >= 0; i--) {
    const tc = state.cytotoxicTCells[i];
    tc.life--;
    if (tc.life <= 0) {
      state.cytotoxicTCells.splice(i, 1);
      continue;
    }

    const targets = allTissueAntigens.filter(p => p.strain === tc.strain);
    if (targets.length > 0) {
      const target = targets[0];
      const dx = target.x - tc.x;
      const dy = target.y - tc.y;
      const dist = Math.hypot(dx, dy) || 1;
      tc.vx = (dx / dist) * 2.5;
      tc.vy = (dy / dist) * 2.5;

      if (dist < tc.r + target.r) {
        const idx = state.pathogens.indexOf(target);
        if (idx !== -1) {
          state.pathogens.splice(idx, 1);
          addFloatingLabel(tc.x, tc.y, `⚔️ 胞毒T細胞消滅(${tc.strain}型)`, STRAINS[tc.strain].light);
        }
      }
    } else {
      tc.vx += (Math.random() - 0.5) * 0.3;
      tc.vy += (Math.random() - 0.5) * 0.3;
      if (tc.y > ZONE.VESSEL_TOP - 20) tc.vy = -1.2;
      if (tc.y < ZONE.SKIN_BOTTOM + 20) tc.vy = 1.2;
    }

    tc.x += tc.vx;
    tc.y += tc.vy;
  }

  // 10. 更新浮動文字
  for (let i = state.floatingLabels.length - 1; i >= 0; i--) {
    const lbl = state.floatingLabels[i];
    lbl.y += lbl.vy;
    lbl.alpha -= 0.016;
    if (lbl.alpha <= 0) {
      state.floatingLabels.splice(i, 1);
    }
  }

  // 11. 定期更新圖表與介面數據
  if (state.frameCount % 6 === 0) {
    recordChartData();
    updateDashboardStats();
    updateMemoryUI();
    updateDefenseStepIndicators();
  }
}

function advanceImmuneRecognition(strain, amount) {
  const mem = state.immuneMemory[strain];
  if (mem.memorized) {
    // 已有記憶：直接拉滿活性並擴增記憶細胞株
    mem.plasmaActive = 100;
    mem.bCellCount = Math.min(5, mem.bCellCount + 1);
    return;
  }
  mem.progress = Math.min(100, mem.progress + amount);
  if (mem.progress >= 100) {
    completeMemorization(strain);
  }
}

function completeMemorization(strain) {
  const mem = state.immuneMemory[strain];
  if (mem.memorized) return;
  mem.memorized = true;
  mem.progress = 100;
  mem.plasmaActive = 90;
  mem.bCellCount = 3;

  addFloatingLabel(
    getLymphNodeX(strain),
    ZONE.LYMPH_TOP + 15,
    `🧬 ${STRAINS[strain].name} 專一性活化！產生抗體與記憶細胞！`,
    STRAINS[strain].light
  );
  addLog(
    `🧬 第三道防線啟動：輔助 T 細胞活化 B 細胞與胞毒 T 細胞，針對「${STRAINS[strain].name}」大量分泌 Y 型抗體，並留下「記憶細胞」！`,
    'line3'
  );
}

function getLymphNodeX(strain) {
  if (strain === 'A') return 220;
  if (strain === 'B') return 460;
  return 700;
}

// ==================== 畫布視覺渲染 ====================

function renderSimulation() {
  ctx.clearRect(0, 0, W, H);

  drawZonesAndAnatomy();
  drawHistamines();
  drawPhagocytes();
  drawCytotoxicTCells();
  drawPathogens();
  drawAntibodies();
  drawFloatingLabels();
}

function drawZonesAndAnatomy() {
  // 1. 體外環境 (0 ~ SKIN_TOP)
  const extGrad = ctx.createLinearGradient(0, 0, 0, ZONE.SKIN_TOP);
  extGrad.addColorStop(0, '#090d16');
  extGrad.addColorStop(1, '#111a2e');
  ctx.fillStyle = extGrad;
  ctx.fillRect(0, 0, W, ZONE.SKIN_TOP);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('【體外環境】空氣 / 體表接觸區（點擊此處可投放病原體）', 14, 22);

  // 若有溶菌酶黏液沖刷動畫
  if (state.mucusWaveTimer > 0) {
    const waveX = ((90 - state.mucusWaveTimer) / 90) * (W + 100);
    const waveGrad = ctx.createLinearGradient(waveX - 120, 0, waveX, 0);
    waveGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    waveGrad.addColorStop(1, 'rgba(56, 189, 248, 0.38)');
    ctx.fillStyle = waveGrad;
    ctx.fillRect(0, 0, waveX, ZONE.SKIN_TOP);
  }

  // 2. 皮下結締組織 (SKIN_BOTTOM ~ VESSEL_TOP)
  // 發炎時組織背景泛紅發熱 (紅、腫、熱、痛)
  const inflamRatio = state.inflammationLevel / 100;
  const r = Math.floor(28 + inflamRatio * 75);
  const g = Math.floor(24 - inflamRatio * 6);
  const b = Math.floor(38 - inflamRatio * 10);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, ZONE.SKIN_BOTTOM, W, ZONE.VESSEL_TOP - ZONE.SKIN_BOTTOM);

  ctx.fillStyle = 'rgba(253, 164, 175, 0.65)';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(
    '【第二道防線：皮下組織】吞噬細胞巡邏、肥大細胞釋放組織胺、發炎反應（紅腫熱痛）',
    14,
    ZONE.SKIN_BOTTOM + 20
  );

  // 繪製肥大細胞 (Mast Cells) 固定在組織上方
  drawMastCell(330, ZONE.SKIN_BOTTOM + 40, inflamRatio > 0.2);
  drawMastCell(570, ZONE.SKIN_BOTTOM + 40, inflamRatio > 0.2);

  // 3. 第一道防線：皮膚角質層與黏膜纖毛 (SKIN_TOP ~ SKIN_BOTTOM)
  for (let x = 0; x < W; x += 26) {
    const isWoundArea = state.hasWound && x >= ZONE.WOUND_X_MIN && x <= ZONE.WOUND_X_MAX - 20;
    if (isWoundArea) continue;

    // 繪製緊密排列的表皮細胞磚塊
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 1, ZONE.SKIN_TOP + 6, 24, ZONE.SKIN_BOTTOM - ZONE.SKIN_TOP - 8, 5);
    ctx.fill();
    ctx.stroke();

    // 細胞核
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(x + 13, (ZONE.SKIN_TOP + ZONE.SKIN_BOTTOM) / 2 + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 表面纖毛與皮脂保護膜
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    const sway = Math.sin(state.frameCount * 0.08 + x * 0.1) * 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, ZONE.SKIN_TOP + 6);
    ctx.lineTo(x + 8 + sway, ZONE.SKIN_TOP - 3);
    ctx.moveTo(x + 18, ZONE.SKIN_TOP + 6);
    ctx.lineTo(x + 18 + sway, ZONE.SKIN_TOP - 3);
    ctx.stroke();
  }

  // 標示傷口位置或完整皮膜提示
  if (state.hasWound) {
    ctx.strokeStyle = '#f43f5e';
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(ZONE.WOUND_X_MIN, ZONE.SKIN_TOP, ZONE.WOUND_X_MAX - ZONE.WOUND_X_MIN, ZONE.SKIN_BOTTOM - ZONE.SKIN_TOP);
    ctx.setLineDash([]);
    ctx.fillStyle = '#fda4af';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('⚠️ 皮膚破損缺口 (點擊癒合)', ZONE.WOUND_X_MIN + 4, ZONE.SKIN_TOP + 26);
  } else {
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('【第一道防線：完整皮膚角質層與黏膜纖毛】（點擊中央可製造傷口）', 14, ZONE.SKIN_TOP + 27);
  }

  // 4. 微血管 (VESSEL_TOP ~ VESSEL_BOTTOM)
  // 發炎時微血管擴張且血管壁間隙變大（通透性增加）
  const dilation = inflamRatio * 10;
  const vTop = ZONE.VESSEL_TOP - dilation;
  const vBot = ZONE.VESSEL_BOTTOM;

  const vesselGrad = ctx.createLinearGradient(0, vTop, 0, vBot);
  vesselGrad.addColorStop(0, '#450a0a');
  vesselGrad.addColorStop(0.5, '#7f1d1d');
  vesselGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = vesselGrad;
  ctx.fillRect(0, vTop, W, vBot - vTop);

  // 微血管內皮細胞壁（發炎時縫隙變寬，讓吞噬細胞容易鑽出）
  const gapSize = 4 + inflamRatio * 14;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  for (let x = 0; x < W; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, vTop);
    ctx.lineTo(x + 38 - gapSize, vTop);
    ctx.stroke();
  }

  // 繪製紅血球
  state.rbcs.forEach(rbc => {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.beginPath();
    ctx.ellipse(rbc.x, rbc.y, rbc.r + 2, rbc.r - 1, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#fecaca';
  ctx.font = 'bold 11.5px sans-serif';
  ctx.fillText(
    inflamRatio > 0.25
      ? '【微血管擴張・通透性增加】血流量增加(紅/熱)、血漿滲出(腫/痛)、白血球變形穿越血管壁！'
      : '【微血管】輸送紅血球與白血球（吞噬細胞）',
    14,
    vBot - 8
  );

  // 5. 第三道防線：淋巴結與專一性免疫基地 (LYMPH_TOP ~ LYMPH_BOTTOM)
  const lymphGrad = ctx.createLinearGradient(0, ZONE.LYMPH_TOP, 0, ZONE.LYMPH_BOTTOM);
  lymphGrad.addColorStop(0, '#0f172a');
  lymphGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = lymphGrad;
  ctx.fillRect(0, ZONE.LYMPH_TOP, W, ZONE.LYMPH_BOTTOM - ZONE.LYMPH_TOP);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ZONE.LYMPH_TOP);
  ctx.lineTo(W, ZONE.LYMPH_TOP);
  ctx.stroke();

  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('【第三道防線：專一性免疫基地（淋巴組織）】輔助 T 細胞、B 細胞（漿細胞分泌抗體）與記憶細胞群', 14, ZONE.LYMPH_TOP + 18);

  // 繪製 A / B / C 三個專一性淋巴細胞株駐地
  ['A', 'B', 'C'].forEach(strain => {
    drawLymphCloneCluster(strain, getLymphNodeX(strain), ZONE.LYMPH_TOP + 54);
  });
}

function drawMastCell(x, y, active) {
  ctx.save();
  ctx.fillStyle = active ? 'rgba(249, 115, 22, 0.35)' : 'rgba(148, 163, 184, 0.2)';
  ctx.strokeStyle = active ? '#fb923c' : '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 顆粒
  ctx.fillStyle = '#fdba74';
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('肥大細胞', x, y + 24);
  ctx.restore();
}

function drawLymphCloneCluster(strain, cx, cy) {
  const mem = state.immuneMemory[strain];
  const info = STRAINS[strain];

  ctx.save();
  // 背景光暈
  if (mem.memorized) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 1.8;
  } else {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
  }

  ctx.beginPath();
  ctx.roundRect(cx - 95, cy - 26, 190, 52, 10);
  ctx.fill();
  ctx.stroke();

  // 繪製 B / T 細胞球體
  const count = mem.memorized ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const bx = cx - 60 + i * 22;
    const by = cy - 2;
    ctx.fillStyle = mem.memorized ? info.color : '#475569';
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i === 0 ? 'B' : '記', bx, by + 3);
  }

  // 右側文字狀態
  ctx.textAlign = 'left';
  ctx.fillStyle = info.light;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${info.symbol} ${info.name}專一株`, cx + 5, cy - 6);

  ctx.fillStyle = mem.memorized ? '#4ade80' : '#94a3b8';
  ctx.font = '10.5px sans-serif';
  const statusText = mem.memorized
    ? '★ 已具免疫記憶 (快速分泌)'
    : mem.progress > 0
      ? `辨識活化中 (${Math.floor(mem.progress)}%)`
      : '休眠未活化';
  ctx.fillText(statusText, cx + 5, cy + 12);

  ctx.restore();
}

function drawHistamines() {
  state.histamines.forEach(h => {
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPhagocytes() {
  state.phagocytes.forEach(cell => {
    ctx.save();
    ctx.translate(cell.x, cell.y);

    const isSqueezing = cell.diapedesis || cell.returningVessel;

    // 若正在穿越微血管壁（鑽出或鑽入），繪製發光孔道特效
    if (isSqueezing) {
      ctx.save();
      ctx.strokeStyle = cell.diapedesis ? '#fde047' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 繪製變形蟲偽足外型（穿越微血管壁縫隙時呈沙漏細長擠壓變形）
    ctx.fillStyle = isSqueezing ? 'rgba(254, 240, 138, 0.92)' : 'rgba(226, 232, 240, 0.88)';
    ctx.strokeStyle = isSqueezing ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const rOffset = Math.sin(cell.wobbleSeed + i * 1.7) * 2.5;
      const baseR = cell.r + rOffset;
      // 穿越血管壁時左右擠壓變窄 (0.55x)、上下拉長 (1.45x)
      const scaleX = isSqueezing ? 0.55 : 1.0;
      const scaleY = isSqueezing ? 1.45 : 1.0;
      const px = Math.cos(angle) * baseR * scaleX;
      const py = Math.sin(angle) * baseR * scaleY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 多葉細胞核
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    if (isSqueezing) {
      ctx.arc(0, -5, 4, 0, Math.PI * 2);
      ctx.arc(0, 5, 3.8, 0, Math.PI * 2);
    } else {
      ctx.arc(-4, -2, 4.5, 0, Math.PI * 2);
      ctx.arc(4, 2, 4, 0, Math.PI * 2);
    }
    ctx.fill();

    // 顯示穿出或鑽回血管的狀態標籤
    if (cell.diapedesis) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⬆️ 變形鑽出血管', 0, -cell.r - 10);
    } else if (cell.returningVessel) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⬇️ 鑽回血管/淋巴', 0, -cell.r - 10);
    } else if (cell.carryingStrain && cell.presentingTimer > 0) {
      // 若剛吞噬完正在呈獻抗原，頭頂舉出該抗原旗幟
      const sInfo = STRAINS[cell.carryingStrain];
      ctx.fillStyle = sInfo.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`呈獻${sInfo.symbol}`, 0, -cell.r - 5);
    }

    ctx.restore();
  });
}

function drawCytotoxicTCells() {
  state.cytotoxicTCells.forEach(tc => {
    const info = STRAINS[tc.strain];
    ctx.save();
    ctx.translate(tc.x, tc.y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, tc.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = info.light;
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`T(${tc.strain})`, 0, 3.5);
    ctx.restore();
  });
}

function drawPathogens() {
  state.pathogens.forEach(p => {
    const info = STRAINS[p.strain];
    ctx.save();
    ctx.translate(p.x, p.y);

    // 疫苗抗原以虛線半透明外框表示「減毒/不活化」
    if (p.isVaccine) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.strokeStyle = info.light;
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = info.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
    }

    // 依據株系繪製不同表面抗原幾何形狀 (A: 三角形, B: 圓形棘突, C: 方形)
    ctx.beginPath();
    if (info.shape === 'triangle') {
      const r = p.r + 3;
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.9, r * 0.75);
      ctx.lineTo(-r * 0.9, r * 0.75);
      ctx.closePath();
    } else if (info.shape === 'circle') {
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    } else {
      const s = p.r * 1.65;
      ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // 標示疫苗字樣或株系代號
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.isVaccine ? `疫${p.strain}` : p.strain, 0, 3);

    // 繪製已結合在病原體上的 Y 型抗體
    for (let k = 0; k < p.boundAntibodies; k++) {
      const ang = (k * Math.PI * 2) / 3;
      drawYShape(Math.cos(ang) * (p.r + 5), Math.sin(ang) * (p.r + 5), ang + Math.PI, info.light, 0.8);
    }

    ctx.restore();
  });
}

function drawAntibodies() {
  state.antibodies.forEach(ab => {
    const info = STRAINS[ab.strain];
    const angle = Math.atan2(ab.vy, ab.vx);
    drawYShape(ab.x, ab.y, angle, info.light, 1.0);
  });
}

function drawYShape(x, y, angle, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle - Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Y 字型抗體結構
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 1);
  ctx.lineTo(-4.5, 6);
  ctx.moveTo(0, 1);
  ctx.lineTo(4.5, 6);
  ctx.stroke();
  ctx.restore();
}

function drawFloatingLabels() {
  state.floatingLabels.forEach(lbl => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, lbl.alpha);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = lbl.color;
    ctx.textAlign = 'center';
    ctx.fillText(lbl.text, lbl.x, lbl.y);
    ctx.restore();
  });
}

// ==================== 即時抗體濃度曲線圖 (Chart) ====================

function recordChartData() {
  const counts = { A: 0, B: 0, C: 0 };
  state.antibodies.forEach(ab => {
    counts[ab.strain]++;
  });

  state.chartHistory.push(counts);
  if (state.chartHistory.length > 90) {
    state.chartHistory.shift();
  }
  drawChart();
}

function drawChart() {
  const cw = chartCanvas.width;
  const ch = chartCanvas.height;
  chartCtx.clearRect(0, 0, cw, ch);

  // 座標格線
  chartCtx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  chartCtx.lineWidth = 1;
  for (let y = 25; y < ch - 20; y += 35) {
    chartCtx.beginPath();
    chartCtx.moveTo(36, y);
    chartCtx.lineTo(cw - 10, y);
    chartCtx.stroke();
  }

  // Y 軸說明
  chartCtx.fillStyle = '#94a3b8';
  chartCtx.font = '10px sans-serif';
  chartCtx.fillText('高(二次)', 2, 28);
  chartCtx.fillText('中(初次)', 2, 72);
  chartCtx.fillText('0', 18, ch - 18);
  chartCtx.fillText('時間 ➔', cw - 48, ch - 5);

  if (state.chartHistory.length < 2) return;

  const maxVal = 55;
  const plotW = cw - 48;
  const plotH = ch - 32;

  ['A', 'B', 'C'].forEach(strain => {
    chartCtx.strokeStyle = STRAINS[strain].color;
    chartCtx.lineWidth = 2.2;
    chartCtx.beginPath();

    state.chartHistory.forEach((pt, idx) => {
      const x = 38 + (idx / 89) * plotW;
      const ratio = Math.min(1, pt[strain] / maxVal);
      const y = ch - 20 - ratio * plotH;
      if (idx === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });

    chartCtx.stroke();
  });
}

// ==================== UI 儀表板與狀態同步 ====================

function updateDashboardStats() {
  const realPathogens = state.pathogens.filter(p => !p.isVaccine && p.zone === 'tissue').length;
  document.getElementById('stat-pathogens').textContent = realPathogens;
  document.getElementById('stat-phagocytes').textContent = state.phagocytes.length;
  document.getElementById('stat-antibodies').textContent = state.antibodies.length;
  document.getElementById('stat-health').textContent = `${Math.round(state.tissueHealth)}%`;

  const alertBadge = document.getElementById('inflammation-alert');
  if (state.inflammationLevel > 30) {
    alertBadge.classList.remove('hidden');
  } else {
    alertBadge.classList.add('hidden');
  }
}

function updateMemoryUI() {
  ['A', 'B', 'C'].forEach(s => {
    const mem = state.immuneMemory[s];
    const card = document.getElementById(`mem-card-${s}`);
    const stateEl = document.getElementById(`mem-state-${s}`);
    const pctEl = document.getElementById(`mem-pct-${s}`);
    const barEl = document.getElementById(`mem-bar-${s}`);
    const detailEl = document.getElementById(`mem-detail-${s}`);

    const pct = Math.floor(mem.progress);
    pctEl.textContent = `${pct}%`;
    barEl.style.width = `${pct}%`;

    if (mem.memorized) {
      card.classList.add('memorized');
      stateEl.textContent = '★ 已具免疫記憶';
      stateEl.className = 'mem-state active-memory';
      detailEl.textContent = '記憶 B/T 細胞待命：再次遇到此抗原將秒速產生大量抗體！';
    } else if (mem.progress > 0) {
      card.classList.remove('memorized');
      stateEl.textContent = '吞噬呈獻與辨識中...';
      stateEl.className = 'mem-state active-learning';
      detailEl.textContent = '初次免疫反應：正在尋找並活化專一性淋巴細胞';
    } else {
      card.classList.remove('memorized');
      stateEl.textContent = '未曾接觸（無記憶）';
      stateEl.className = 'mem-state';
      detailEl.textContent = '初次遇到需耗時辨識（可先接種疫苗建立記憶）';
    }
  });
}

function updateDefenseStepIndicators() {
  const externalCount = state.pathogens.filter(p => p.zone === 'external').length;
  const tissueCount = state.pathogens.filter(p => p.zone === 'tissue').length;
  const abCount = state.antibodies.length;

  const step1 = document.getElementById('step-indicator-1');
  const step2 = document.getElementById('step-indicator-2');
  const step3 = document.getElementById('step-indicator-3');

  step1.className = externalCount > 0 || !state.hasWound ? 'defense-step active' : 'defense-step';
  step2.className = tissueCount > 0 || state.inflammationLevel > 25 ? 'defense-step active-danger' : 'defense-step';
  step3.className = abCount > 0 || ['A', 'B', 'C'].some(s => state.immuneMemory[s].progress > 20)
    ? 'defense-step active'
    : 'defense-step';
}

function updateWoundButtonUI() {
  const btn = document.getElementById('btn-toggle-wound');
  if (state.hasWound) {
    btn.textContent = '⚠️ 皮膚破損 (點擊癒合)';
    btn.className = 'btn-small status-wounded';
  } else {
    btn.textContent = '🛡️ 皮膚完整 (點擊破皮)';
    btn.className = 'btn-small status-intact';
  }
}

// ==================== 事件綁定與實驗劇本（支援觸控平板與滑鼠） ====================

function setActiveStrain(strain) {
  state.selectedStrain = strain;
  document.querySelectorAll('.strain-btn, .quick-strain-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.strain === strain);
  });
}

// 選擇病原體株系 (A / B / C) - 同步左側面板與下方觸控快捷列
document.querySelectorAll('.strain-btn, .quick-strain-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setActiveStrain(btn.dataset.strain);
  });
});

function toggleWoundState() {
  state.hasWound = !state.hasWound;
  updateWoundButtonUI();
  if (state.hasWound) {
    addLog('🩹 皮膚出現破口！若體表有病原體，將直接穿過第一道防線進入皮下組織。', 'line1');
  } else {
    addLog('✨ 皮膚傷口已癒合，第一道防線恢復完整阻擋能力。', 'line1');
  }
}

function triggerWhiteBloodCellDiapedesis(targetX = null) {
  state.inflammationLevel = Math.max(state.inflammationLevel, 65);
  let squeezedOut = 0;
  state.phagocytes.forEach(cell => {
    if (cell.inVessel && squeezedOut < 2) {
      cell.x = targetX ? targetX + (Math.random() - 0.5) * 60 : Math.max(140, Math.min(W - 140, cell.x));
      cell.inVessel = false;
      cell.diapedesis = true;
      cell.returningVessel = false;
      cell.idleTicks = 0;
      squeezedOut++;
    }
  });
  if (squeezedOut === 0) {
    const spawnX = targetX || (320 + Math.random() * 260);
    const newCell = createPhagocyte(spawnX, ZONE.VESSEL_TOP + 22, false);
    newCell.diapedesis = true;
    state.phagocytes.push(newCell);
  }
  addFloatingLabel(targetX || 450, ZONE.VESSEL_TOP - 12, '⬆️ 微血管通透性增加，白血球變形擠出血管壁！', '#fde047');
  addLog('⚪ 白血球進出血管展示：微血管內皮細胞間隙擴大，白血球（吞噬細胞）作變形蟲運動穿出微血管進入組織；待病原體清除後將再次鑽回血管/淋巴！', 'line2');
}

// 左側面板按鈕
document.getElementById('btn-drop-external').addEventListener('click', () => {
  dropExternalPathogens(state.selectedStrain, 10);
});
document.getElementById('btn-inject-tissue').addEventListener('click', () => {
  injectTissuePathogens(state.selectedStrain, 8);
});
document.getElementById('btn-inject-vaccine').addEventListener('click', () => {
  injectVaccine(state.selectedStrain);
});
document.getElementById('btn-toggle-wound').addEventListener('click', toggleWoundState);
document.getElementById('btn-trigger-mucus').addEventListener('click', triggerMucusSweep);
document.getElementById('btn-trigger-diapedesis').addEventListener('click', () => triggerWhiteBloodCellDiapedesis());
document.getElementById('btn-reset').addEventListener('click', initSimulation);

// 畫布下方「平板觸控快捷列」按鈕綁定
document.getElementById('q-drop-ext').addEventListener('click', () => dropExternalPathogens(state.selectedStrain, 10));
document.getElementById('q-inject-tis').addEventListener('click', () => injectTissuePathogens(state.selectedStrain, 8));
document.getElementById('q-vaccine').addEventListener('click', () => injectVaccine(state.selectedStrain));
document.getElementById('q-wound').addEventListener('click', toggleWoundState);
document.getElementById('q-wbc').addEventListener('click', () => triggerWhiteBloodCellDiapedesis());
document.getElementById('q-reset').addEventListener('click', initSimulation);

// 畫布 Pointer Events 觸控與手勢互動（支援平板點擊、單指滑動連續撒播病原體）
let isPointerDown = false;
let lastDragSpawnTime = 0;

function getCanvasCoords(e) {
  const rect = simCanvas.getBoundingClientRect();
  const scaleX = simCanvas.width / rect.width;
  const scaleY = simCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

simCanvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  isPointerDown = true;
  const { x, y } = getCanvasCoords(e);

  if (y < ZONE.SKIN_TOP) {
    // 觸控體表上方：投放病原體
    for (let i = 0; i < 4; i++) {
      spawnPathogen(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 15, state.selectedStrain, false, 'external');
    }
  } else if (y >= ZONE.SKIN_TOP && y <= ZONE.SKIN_BOTTOM) {
    // 觸控皮膚層：切換傷口破皮/癒合
    toggleWoundState();
  } else if (y > ZONE.SKIN_BOTTOM && y < ZONE.VESSEL_TOP) {
    // 觸控皮下組織：直接注入病原體並觸發發炎
    for (let i = 0; i < 4; i++) {
      spawnPathogen(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, state.selectedStrain, false, 'tissue');
    }
    triggerInflammation(x, y);
  } else if (y >= ZONE.VESSEL_TOP && y <= ZONE.VESSEL_BOTTOM) {
    // 觸控微血管區：立即在手指點選位置召喚白血球變形穿出微血管！
    triggerWhiteBloodCellDiapedesis(x);
  } else if (y > ZONE.LYMPH_TOP) {
    // 觸控下方淋巴組織區：切換對應株系 (左 A / 中 B / 右 C) 並接種疫苗
    const clickedStrain = x < 340 ? 'A' : x < 580 ? 'B' : 'C';
    setActiveStrain(clickedStrain);
    injectVaccine(clickedStrain);
  }
});

simCanvas.addEventListener('pointermove', e => {
  if (!isPointerDown) return;
  const now = performance.now();
  if (now - lastDragSpawnTime < 90) return; // 節流：每 90ms 隨手指軌跡生成一次
  lastDragSpawnTime = now;

  const { x, y } = getCanvasCoords(e);
  if (y < ZONE.SKIN_TOP) {
    spawnPathogen(x, y, state.selectedStrain, false, 'external');
  } else if (y > ZONE.SKIN_BOTTOM && y < ZONE.VESSEL_TOP) {
    spawnPathogen(x, y, state.selectedStrain, false, 'tissue');
  }
});

window.addEventListener('pointerup', () => {
  isPointerDown = false;
});
window.addEventListener('pointercancel', () => {
  isPointerDown = false;
});

// 四大教學實驗劇本
document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const scenario = btn.dataset.scenario;
    runScenario(scenario);
  });
});

function runScenario(type) {
  initSimulation();

  if (type === 'line1') {
    addLog('【實驗 1】先在完整皮膚散播病原體（觀察阻擋），2.5 秒後自動劃開傷口比較！', 'line1');
    dropExternalPathogens('A', 12);
    setTimeout(() => {
      state.hasWound = true;
      updateWoundButtonUI();
      dropExternalPathogens('A', 8);
      addFloatingLabel(450, ZONE.SKIN_TOP + 20, '⚠️ 皮膚破損！病原體侵入！', '#f43f5e');
    }, 2500);
  } else if (type === 'line2') {
    addLog('【實驗 2】模擬傷口感染：觀察肥大細胞釋放「組織胺」、微血管擴張充血（紅腫熱痛）與吞噬細胞鑽出血管！', 'line2');
    injectTissuePathogens('A', 10);
  } else if (type === 'primary_vs_secondary') {
    addLog('【實驗 3】初次 vs 二次感染：已為您預先建立 A 型免疫記憶，現在同時入侵 A 型(有記憶)與 B 型(初次感染)，觀察抗體速度差異！', 'line3');
    state.immuneMemory.A.memorized = true;
    state.immuneMemory.A.progress = 100;
    state.immuneMemory.A.bCellCount = 4;
    updateMemoryUI();
    injectTissuePathogens('A', 7);
    injectTissuePathogens('B', 7);
  } else if (type === 'vaccine_test') {
    addLog('【實驗 4】疫苗保護力與專一性：先接種「A 型疫苗」訓練記憶細胞，4 秒後同時遭遇 A 病毒與 B 細菌入侵！', 'vaccine');
    injectVaccine('A');
    setTimeout(() => {
      // 確保疫苗已完成記憶訓練
      completeMemorization('A');
      addLog('🦠 4 秒後：真實「A 型病毒」與「B 型細菌」同時入侵！觀察 A 抗體瞬間爆發，而 B 仍需從頭辨識（印證疫苗專一性）！', 'line3');
      injectTissuePathogens('A', 6);
      injectTissuePathogens('B', 6);
    }, 4200);
  }
}

// 啟動主迴圈
function animate() {
  updateSimulation();
  renderSimulation();
  requestAnimationFrame(animate);
}

initSimulation();
animate();

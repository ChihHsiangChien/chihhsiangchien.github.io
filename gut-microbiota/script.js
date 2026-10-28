/**
 * 大腸皮膜細胞保護機制：膳食纖維、黏液層與腸道菌互動模擬
 * 純 HTML5 Canvas + Vanilla JavaScript (無須 Node.js)
 */

(function () {
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvas-wrapper');
  const tooltip = document.getElementById('structure-tooltip');

  // UI 元件參照
  const statusBadge = document.getElementById('system-status-badge');
  const valMucus = document.getElementById('val-mucus');
  const barMucus = document.getElementById('bar-mucus');
  const valJunction = document.getElementById('val-junction');
  const barJunction = document.getElementById('bar-junction');
  const valScfa = document.getElementById('val-scfa');
  const barScfa = document.getElementById('bar-scfa');
  const valInflam = document.getElementById('val-inflammation');
  const barInflam = document.getElementById('bar-inflammation');

  const flowBannerText = document.getElementById('flow-banner-text');
  const leakyAlert = document.getElementById('leaky-alert');

  const modeHighBtn = document.getElementById('mode-high-fiber');
  const modeNoneBtn = document.getElementById('mode-no-fiber');
  const btnDropFiber = document.getElementById('btn-drop-fiber');
  const btnDropBacteriaAll = document.getElementById('btn-drop-bacteria-all');
  const btnDropProbiotic = document.getElementById('btn-drop-probiotic');
  const btnDropMucin = document.getElementById('btn-drop-mucin');
  const btnDropScfa = document.getElementById('btn-drop-scfa');
  const btnClearLumen = document.getElementById('btn-clear-lumen');
  const brushRadios = document.querySelectorAll('input[name="spawn-brush"]');
  const sliderFiberRate = document.getElementById('fiber-rate');
  const labelFiberRate = document.getElementById('fiber-rate-val');
  const sliderSpeed = document.getElementById('sim-speed');
  const labelSpeed = document.getElementById('speed-val');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');

  const chkLabels = document.getElementById('toggle-labels');
  const chkJunctions = document.getElementById('toggle-junctions');
  const chkCytokines = document.getElementById('toggle-cytokines');

  const mech1 = document.getElementById('mech-1');
  const mech2 = document.getElementById('mech-2');
  const mech3 = document.getElementById('mech-3');
  const mech4 = document.getElementById('mech-4');

  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');

  // 畫布尺寸與版面分層比例
  let W = 960;
  let H = 640;
  let dpr = window.devicePixelRatio || 1;

  // 垂直區域座標 (隨 resize 更新)
  let Y = {
    lumenTop: 0,
    outerMucusTop: 180,
    innerMucusTop: 280,
    epitheliumTop: 365,
    epitheliumBottom: 490,
    vesselTop: 585,
    vesselBottom: 630
  };

  // 全域模擬參數與狀態
  const state = {
    paused: true,          // 預設進入時動畫暫停，方便教學講解
    simSpeed: 1.0,
    fiberRate: 0,          // 預設 0，等待手動投入或開啟高纖模式
    spawnBrush: 'fiber',   // 畫布點擊投放模式：'fiber' | 'probiotic' | 'mucin'
    showLabels: true,
    showJunctions: true,
    showCytokines: true,
    selectedStructure: null,

    // 統計數值 (0 ~ 100)
    avgMucus: 95,
    avgJunction: 98,
    scfaLevel: 75,
    inflammation: 4,
    time: 0
  };

  // 陣列容器
  const NUM_COLS = 18;
  let cells = [];          // 皮膜細胞與杯狀細胞 (18 欄)
  let mucusCols = [];      // 每一欄對應的黏液厚度與MUC2網格點
  let fibers = [];         // 膳食纖維 (多醣鏈)
  let scfas = [];          // 短鏈脂肪酸粒子 (丁酸/丙酸/乙酸)
  let mucinDrops = [];     // 杯狀細胞吐出的黏液蛋白小泡
  let bacteria = [];       // 腸道菌 (益生菌 + 噬黏液菌 + 伺機致病菌)
  let endotoxins = [];     // 穿透進固有層的細菌/內毒素 (LPS)
  let immuneCells = [];    // 固有層免疫細胞 (巨噬細胞、樹突細胞、嗜中性球)
  let cytokines = [];      // 發炎細胞激素粒子
  let rbcs = [];           // 微血管內的紅血球
  let biteEffects = [];    // 啃食黏液或分解纖維的視覺特效

  // 構造百科資料庫
  const STRUCTURE_INFO = {
    lumen: {
      title: '🌊 大腸腔 (Colonic Lumen) 與膳食纖維',
      desc: '食物殘渣進入大腸後，人體無法消化的「膳食纖維」（蔬菜、全穀、水果中的多醣類）在腸腔隨食糜漂流，成為腸道共生菌最重要的營養來源。點擊腸腔空白處可直接投放膳食纖維！'
    },
    outer_mucus: {
      title: '🫧 外黏液層 (Outer Loose Mucus Layer)',
      desc: '結構較疏鬆的黏液網（主要由 MUC2 黏液糖蛋白構成），是腸道共生菌的天然棲息地。當膳食纖維充足時，共生菌在此分解纖維；一旦缺乏纖維，噬黏液菌就會開始啃食這層黏液！'
    },
    inner_mucus: {
      title: '🛡️ 內黏液層 (Inner Dense Mucus Layer)',
      desc: '緊貼在皮膜細胞上方的「緻密無菌防火牆」！孔隙極小且富含抗菌胜肽，能徹底阻隔腸道菌直接接觸大腸皮膜細胞。若因缺纖維被腸道菌啃穿，細菌將直接貼附皮膜引發危機。'
    },
    goblet: {
      title: '🧪 杯狀細胞 (Goblet Cell)',
      desc: '夾雜在皮膜細胞之間的黏液製造工廠。當吸收到腸道菌排泄的「短鏈脂肪酸 (SCFA，特別是丁酸)」時，會旺盛分泌 MUC2 黏液泡來修補並加厚黏液層。'
    },
    colonocyte: {
      title: '🧱 大腸皮膜細胞 (Colonocyte / Epithelial Cell)',
      desc: '單層柱狀上皮細胞，負責吸收水分與電解質並構成物理屏障。大腸皮膜細胞高達 60~70% 的 ATP 能量直接來自腸道菌產生的「丁酸 (SCFA)」。缺乏 SCFA 時細胞會萎縮、能量耗竭。'
    },
    junction: {
      title: '🔗 緊密連接蛋白 (Tight Junctions: ZO-1, Occludin)',
      desc: '像拉鍊一樣把相鄰皮膜細胞緊緊扣住的蛋白質複合體。短鏈脂肪酸 (SCFA) 能強化緊密連接；反之，缺纖維與發炎因子會讓拉鍊鬆開，形成「腸漏症 (Leaky Gut)」。'
    },
    lamina: {
      title: '⚔️ 固有層與免疫細胞 (Lamina Propria & Immune System)',
      desc: '位於皮膜下方的結締組織，駐紮大量巨噬細胞、樹突細胞與 T 細胞。平時受 SCFA 調控維持免疫耐受；當腸漏症發生、細菌與內毒素 (LPS) 闖入時，免疫細胞會全面活化並釋放發炎細胞激素 (IL-6, TNF-α, IL-1β)！'
    },
    vessel: {
      title: '🩸 黏膜下微血管 (Submucosal Capillary)',
      desc: '負責輸送氧氣與養分。若腸漏症嚴重，穿透屏障的細菌內毒素 (LPS) 與發炎細胞激素會滲入微血管，隨著血液循環流向全身，引發慢性全身性發炎、代謝症候群或自體免疫問題。'
    }
  };

  // 初始化畫布尺寸
  function resizeCanvas() {
    const rect = wrapper.getBoundingClientRect();
    W = Math.max(680, rect.width);
    H = Math.max(500, rect.height);
    dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 計算各層高度
    Y.lumenTop = 0;
    Y.outerMucusTop = Math.round(H * 0.27);
    Y.innerMucusTop = Math.round(H * 0.43);
    Y.epitheliumTop = Math.round(H * 0.56);
    Y.epitheliumBottom = Math.round(H * 0.75);
    Y.vesselTop = Math.round(H * 0.91);
    Y.vesselBottom = Math.round(H * 0.985);

    updateCellPositions();
  }

  // 建立 18 欄大腸皮膜細胞與黏液欄位
  function initWorld() {
    cells = [];
    mucusCols = [];
    fibers = [];
    scfas = [];
    mucinDrops = [];
    bacteria = [];
    endotoxins = [];
    immuneCells = [];
    cytokines = [];
    rbcs = [];
    biteEffects = [];

    for (let i = 0; i < NUM_COLS; i++) {
      // 每隔 4 個皮膜細胞配置 1 個杯狀細胞 (Goblet cell)
      const isGoblet = (i % 4 === 2);
      cells.push({
        index: i,
        isGoblet,
        x: 0,
        w: 0,
        energy: 95,           // 細胞能量 (由 SCFA 供給)
        junctionIntegrity: 98,// 與右側細胞的緊密連接完整度 (0~100)
        secretionTimer: Math.random() * 80,
        flashTime: 0          // 吸收 SCFA 時的發光回饋
      });

      mucusCols.push({
        index: i,
        thickness: 95,        // 黏液厚度百分比 (0~100)
        outerDensity: 95,
        innerDensity: 98
      });
    }

    updateCellPositions();

    // 預設進入時：不產生膳食纖維、不產生腸道微生物、不產生游離 SCFA
    // 保持大腸皮膜與黏液層在健康原始狀態，等待使用者投入物質並按繼續開始講解！

    // 初始產生固有層免疫細胞 (巨噬細胞與樹突細胞)
    for (let i = 0; i < 7; i++) {
      immuneCells.push({
        type: i % 2 === 0 ? 'macrophage' : 'dendritic',
        x: (W / 7) * (i + 0.5),
        y: Y.epitheliumBottom + 32 + (i % 2) * 24,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        activated: 0, // 0 ~ 100
        target: null,
        pulse: Math.random() * Math.PI * 2
      });
    }

    // 微血管紅血球
    for (let i = 0; i < 14; i++) {
      rbcs.push({
        x: (W / 14) * i,
        yOffset: (Math.random() - 0.5) * 10,
        speed: 0.9 + Math.random() * 0.35
      });
    }

    // 初始狀態數值校正
    state.avgMucus = 95;
    state.avgJunction = 98;
    state.scfaLevel = 70;
    state.inflammation = 4;
    updateDashboardUI();
  }

  function updateCellPositions() {
    if (!cells.length) return;
    const colW = W / NUM_COLS;
    for (let i = 0; i < NUM_COLS; i++) {
      cells[i].x = i * colW;
      cells[i].w = colW;
    }
  }

  function createBacterium(type, x, y = null) {
    const yMin = Y.lumenTop + 35;
    const yMax = Y.outerMucusTop + 25;
    const actualY = y !== null ? Math.max(30, Math.min(Y.outerMucusTop + 25, y)) : (yMin + Math.random() * (yMax - yMin));
    return {
      type, // 'butyrate_rod' (產丁酸菌), 'bifido' (雙歧益生菌), 'mucin_degrader' (噬黏液菌/伺機菌)
      x: x,
      y: actualY,
      vx: (Math.random() - 0.5) * 1.1,
      vy: (Math.random() - 0.5) * 0.7,
      angle: Math.random() * Math.PI * 2,
      angVel: (Math.random() - 0.5) * 0.03,
      hunger: 15 + Math.random() * 20, // 0(飽足) ~ 100(極度飢餓，開始啃黏液)
      eatingMucus: false,
      eatCooldown: 0,
      wigglePhase: Math.random() * Math.PI * 2
    };
  }

  // 批量投放微生物 (綜合菌群、益生菌、噬黏液菌)
  function spawnBacteriaBatch(groupType, count = 6) {
    for (let i = 0; i < count; i++) {
      let t = 'butyrate_rod';
      if (groupType === 'all') {
        const r = Math.random();
        t = r < 0.45 ? 'butyrate_rod' : (r < 0.75 ? 'bifido' : 'mucin_degrader');
      } else if (groupType === 'probiotic') {
        t = Math.random() < 0.55 ? 'butyrate_rod' : 'bifido';
      } else if (groupType === 'mucin') {
        t = 'mucin_degrader';
      }
      const x = 40 + Math.random() * (W - 80);
      bacteria.push(createBacterium(t, x));
    }
  }

  function spawnFiber(startX = -30, startY = null) {
    const y = startY !== null
      ? startY
      : Y.lumenTop + 32 + Math.random() * (Y.outerMucusTop - Y.lumenTop - 25);

    // 每條膳食纖維由 4~6 個綠色六角糖環組成
    const segments = 4 + Math.floor(Math.random() * 3);
    fibers.push({
      x: startX,
      y: y,
      vx: 0.65 + Math.random() * 0.55,
      vy: (Math.random() - 0.5) * 0.25,
      segments: segments,
      maxSegments: segments,
      angle: (Math.random() - 0.5) * 0.6,
      rotSpeed: (Math.random() - 0.5) * 0.008,
      beingEaten: 0
    });
  }

  function spawnScfaBurst(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      scfas.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.1,
        vy: 0.55 + Math.random() * 0.65,
        r: 4.5 + Math.random() * 1.2,
        alpha: 1
      });
    }
  }

  // 更新模擬物理與生理邏輯
  function updateSimulation() {
    if (state.paused) return;
    const dt = state.simSpeed;
    state.time += 0.04 * dt;

    // 1. 根據膳食纖維頻率自動生成纖維
    if (state.fiberRate > 0) {
      const spawnProb = (state.fiberRate / 100) * 0.065 * dt;
      if (Math.random() < spawnProb && fibers.length < 28) {
        spawnFiber(-25);
      }
    }

    // 2. 更新膳食纖維移動
    for (let i = fibers.length - 1; i >= 0; i--) {
      const f = fibers[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt + Math.sin(state.time + i) * 0.15 * dt;
      f.angle += f.rotSpeed * dt;

      // 限制在腸腔與外黏液層上緣
      const maxFiberY = Y.outerMucusTop + 30;
      if (f.y < 28) { f.y = 28; f.vy = Math.abs(f.vy); }
      if (f.y > maxFiberY) { f.y = maxFiberY; f.vy = -Math.abs(f.vy) * 0.5; }

      if (f.x > W + 50 || f.segments <= 0) {
        fibers.splice(i, 1);
      }
    }

    // 3. 更新腸道菌行為 (吃纖維 vs 飢餓吃黏液 vs 穿透破洞)
    const hasEnoughFiber = fibers.length > 2 || state.fiberRate >= 25;

    for (let i = 0; i < bacteria.length; i++) {
      const b = bacteria[i];
      b.wigglePhase += 0.15 * dt;
      if (b.eatCooldown > 0) b.eatCooldown -= dt;

      // 飢餓度自然上升
      b.hunger = Math.min(100, b.hunger + (hasEnoughFiber ? 0.09 : 0.26) * dt);

      // 尋找附近的膳食纖維
      let nearestFiber = null;
      let minDist = 135;
      for (let j = 0; j < fibers.length; j++) {
        const f = fibers[j];
        const dx = f.x - b.x;
        const dy = f.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          minDist = dist;
          nearestFiber = f;
        }
      }

      if (nearestFiber) {
        // 朝膳食纖維游動
        b.eatingMucus = false;
        const dx = nearestFiber.x - b.x;
        const dy = nearestFiber.y - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        b.vx += (dx / dist) * 0.12 * dt;
        b.vy += (dy / dist) * 0.12 * dt;

        // 接觸並分解膳食纖維 -> 排泄短鏈脂肪酸 (SCFA)
        if (dist < 24 && b.eatCooldown <= 0) {
          nearestFiber.segments -= 1;
          b.hunger = Math.max(0, b.hunger - 42);
          b.eatCooldown = 28;

          // 產生 SCFA 粒子與視覺特效
          spawnScfaBurst(b.x, b.y + 8, b.type === 'butyrate_rod' ? 3 : 2);
          biteEffects.push({
            x: nearestFiber.x,
            y: nearestFiber.y,
            color: '#fbbf24',
            text: '+SCFA',
            r: 4,
            maxR: 22,
            alpha: 1
          });
        }
      } else {
        // 沒有鄰近膳食纖維：若飢餓度高，開始往下潛並啃食黏液層！
        if (b.hunger > 55) {
          b.eatingMucus = true;
          const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((b.x / W) * NUM_COLS)));
          const mCol = mucusCols[colIdx];
          const currentMucusTop = getMucusTopY(colIdx);

          // 往黏液表面游去
          const targetY = Math.min(Y.epitheliumTop - 10, currentMucusTop + 8);
          b.vy += (targetY - b.y) * 0.012 * dt;
          b.vx += (Math.random() - 0.5) * 0.18 * dt;

          // 到達黏液層表面，啃食黏液糖蛋白！
          if (Math.abs(b.y - targetY) < 18 && b.eatCooldown <= 0) {
            if (mCol.thickness > 2) {
              const biteAmount = b.type === 'mucin_degrader' ? 3.2 : 1.6;
              mCol.thickness = Math.max(0, mCol.thickness - biteAmount);
              // 鄰近欄位也稍微變薄
              if (colIdx > 0) mucusCols[colIdx - 1].thickness = Math.max(0, mucusCols[colIdx - 1].thickness - biteAmount * 0.35);
              if (colIdx < NUM_COLS - 1) mucusCols[colIdx + 1].thickness = Math.max(0, mucusCols[colIdx + 1].thickness - biteAmount * 0.35);

              b.eatCooldown = 22;
              biteEffects.push({
                x: b.x,
                y: b.y + 6,
                color: '#f43f5e',
                text: '啃食黏液!',
                r: 3,
                maxR: 18,
                alpha: 0.95
              });
            } else {
              // 黏液已被啃光！細菌直接貼在皮膜細胞與縫隙上，釋放內毒素或穿透細胞間隙 (腸漏症)
              const cell = cells[colIdx];
              cell.energy = Math.max(5, cell.energy - 1.8);
              cell.junctionIntegrity = Math.max(0, cell.junctionIntegrity - 3.2);
              b.eatCooldown = 26;

              if (cell.junctionIntegrity < 52 && endotoxins.length < 22) {
                // 透過裂開的緊密連接縫隙穿透進入固有層！
                const gapX = cell.x + cell.w;
                endotoxins.push({
                  x: gapX + (Math.random() - 0.5) * 6,
                  y: Y.epitheliumTop + 6,
                  vx: (Math.random() - 0.5) * 0.5,
                  vy: 0.65 + Math.random() * 0.4,
                  isWholeBac: Math.random() < 0.35,
                  inVessel: false,
                  hp: 100
                });
              }
            }
          }
        } else {
          b.eatingMucus = false;
          // 正常在腸腔與外黏液層上緣游動
          b.vx += (Math.random() - 0.5) * 0.14 * dt;
          b.vy += (Math.random() - 0.5) * 0.12 * dt;
        }
      }

      // 阻尼與速度上限
      b.vx *= 0.95;
      b.vy *= 0.95;
      const spd = Math.hypot(b.vx, b.vy);
      if (spd > 1.8) {
        b.vx = (b.vx / spd) * 1.8;
        b.vy = (b.vy / spd) * 1.8;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle = Math.atan2(b.vy, b.vx) * 0.3 + Math.sin(b.wigglePhase) * 0.15;

      // 左右邊界循環或反彈
      if (b.x < 18) { b.x = 18; b.vx = Math.abs(b.vx); }
      if (b.x > W - 18) { b.x = W - 18; b.vx = -Math.abs(b.vx); }

      // 垂直邊界：受到內黏液層阻隔 (除非黏液層變薄破洞)
      const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((b.x / W) * NUM_COLS)));
      const barrierY = getInnerBarrierY(colIdx);
      if (b.y < 24) {
        b.y = 24;
        b.vy = Math.abs(b.vy) * 0.5;
      }
      if (b.y > barrierY) {
        b.y = barrierY;
        b.vy = -Math.abs(b.vy) * 0.4;
      }
    }

    // 4. 更新短鏈脂肪酸 (SCFA) 粒子往下擴散並供養皮膜細胞与杯狀細胞
    for (let i = scfas.length - 1; i >= 0; i--) {
      const s = scfas[i];
      s.x += (s.vx + Math.sin(state.time * 2 + i) * 0.2) * dt;
      s.y += s.vy * dt;

      if (s.x < 10) s.x = 10;
      if (s.x > W - 10) s.x = W - 10;

      // 抵達皮膜細胞頂端 (刷狀緣) 被吸收！
      if (s.y >= Y.epitheliumTop + 8) {
        const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((s.x / W) * NUM_COLS)));
        const cell = cells[colIdx];
        cell.energy = Math.min(100, cell.energy + 9);
        cell.junctionIntegrity = Math.min(100, cell.junctionIntegrity + 6.5);
        cell.flashTime = 1.0;

        // 鄰近細胞也獲得滋養與連接修復
        if (colIdx > 0) {
          cells[colIdx - 1].energy = Math.min(100, cells[colIdx - 1].energy + 4);
          cells[colIdx - 1].junctionIntegrity = Math.min(100, cells[colIdx - 1].junctionIntegrity + 4);
        }
        if (colIdx < NUM_COLS - 1) {
          cells[colIdx + 1].energy = Math.min(100, cells[colIdx + 1].energy + 4);
          cells[colIdx + 1].junctionIntegrity = Math.min(100, cells[colIdx + 1].junctionIntegrity + 4);
        }

        // 若是杯狀細胞 (或鄰近杯狀細胞)，立即促進分泌黏液糖蛋白 MUC2
        if (cell.isGoblet) {
          spawnMucinDrop(cell);
        }

        scfas.splice(i, 1);
      }
    }

    // 5. 更新皮膜細胞與杯狀細胞狀態
    let sumMucus = 0;
    let sumJunction = 0;
    let sumEnergy = 0;

    for (let i = 0; i < NUM_COLS; i++) {
      const cell = cells[i];
      const mCol = mucusCols[i];

      if (cell.flashTime > 0) cell.flashTime = Math.max(0, cell.flashTime - 0.04 * dt);

      // 細胞自然消耗能量
      const drainRate = state.fiberRate < 15 ? 0.095 : 0.035;
      cell.energy = Math.max(12, cell.energy - drainRate * dt);

      // 若細胞能量充足，緊密連接維持穩固；若能量低落或發炎，緊密連接鬆脫
      if (cell.energy > 65) {
        cell.junctionIntegrity = Math.min(100, cell.junctionIntegrity + 0.05 * dt);
      } else if (cell.energy < 45) {
        cell.junctionIntegrity = Math.max(8, cell.junctionIntegrity - 0.08 * dt);
      }

      // 杯狀細胞定期分泌黏液小泡 (能量越高分泌越快)
      if (cell.isGoblet && cell.energy > 40) {
        cell.secretionTimer += (cell.energy / 80) * dt;
        if (cell.secretionTimer > 95) {
          cell.secretionTimer = 0;
          spawnMucinDrop(cell);
        }
      }

      // 黏液層橫向均勻化擴散
      if (i > 0) {
        const diff = (mucusCols[i - 1].thickness - mCol.thickness) * 0.03 * dt;
        mCol.thickness += diff;
        mucusCols[i - 1].thickness -= diff;
      }

      sumMucus += mCol.thickness;
      sumJunction += cell.junctionIntegrity;
      sumEnergy += cell.energy;
    }

    // 6. 更新杯狀細胞吐出的 MUC2 黏液泡 (往上融合修補黏液層)
    for (let i = mucinDrops.length - 1; i >= 0; i--) {
      const d = mucinDrops[i];
      d.y -= d.vy * dt;
      d.x += Math.sin(state.time * 3 + i) * 0.25 * dt;
      d.r = Math.min(9, d.r + 0.05 * dt);

      const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((d.x / W) * NUM_COLS)));
      const targetY = getMucusTopY(colIdx) + 18;

      if (d.y <= targetY) {
        // 修補該欄與鄰近欄位的黏液層
        for (let k = -2; k <= 2; k++) {
          const idx = colIdx + k;
          if (idx >= 0 && idx < NUM_COLS) {
            const boost = (3 - Math.abs(k)) * 2.4;
            mucusCols[idx].thickness = Math.min(100, mucusCols[idx].thickness + boost);
          }
        }
        mucinDrops.splice(i, 1);
      }
    }

    // 7. 更新穿透皮膜的內毒素 (LPS) / 細菌 (腸漏症)
    for (let i = endotoxins.length - 1; i >= 0; i--) {
      const e = endotoxins[i];
      if (!e.inVessel) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        // 穿越皮膜間隙期間造成兩側細胞受損與緊密連接惡化
        if (e.y < Y.epitheliumBottom) {
          const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((e.x / W) * NUM_COLS)));
          cells[colIdx].junctionIntegrity = Math.max(0, cells[colIdx].junctionIntegrity - 0.12 * dt);
        }

        // 進入微血管後隨血流向右流走 (全身性發炎)
        if (e.y >= Y.vesselTop + 10) {
          e.inVessel = true;
          e.vy = 0;
          e.vx = 1.6;
        }
      } else {
        e.x += e.vx * dt;
        if (e.x > W + 30) {
          endotoxins.splice(i, 1);
          continue;
        }
      }

      if (e.hp <= 0) {
        endotoxins.splice(i, 1);
      }
    }

    // 8. 更新固有層免疫細胞與發炎細胞激素 (Cytokines)
    for (let i = 0; i < immuneCells.length; i++) {
      const im = immuneCells[i];
      im.pulse += 0.08 * dt;

      // 偵測固有層內的內毒素/入侵菌
      let target = null;
      let minDist = 220;
      for (let j = 0; j < endotoxins.length; j++) {
        const e = endotoxins[j];
        if (e.y > Y.epitheliumTop + 20 && !e.inVessel) {
          const d = Math.hypot(e.x - im.x, e.y - im.y);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
      }

      if (target) {
        im.activated = Math.min(100, im.activated + 1.8 * dt);
        const dx = target.x - im.x;
        const dy = target.y - im.y;
        const dist = Math.hypot(dx, dy) || 1;
        im.vx += (dx / dist) * 0.12 * dt;
        im.vy += (dy / dist) * 0.12 * dt;

        // 吞噬並釋放大量發炎細胞激素 (IL-6, TNF-a)
        if (dist < 22) {
          target.hp -= 3.5 * dt;
          if (Math.random() < 0.22 * dt && cytokines.length < 45) {
            cytokines.push({
              x: im.x + (Math.random() - 0.5) * 16,
              y: im.y + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * 1.4,
              vy: -0.4 + (Math.random() - 0.5) * 1.2,
              life: 1.0
            });
          }
        }
      } else {
        // 當腸道恢復健康且無內毒素時，免疫細胞逐漸平息
        im.activated = Math.max(0, im.activated - 0.45 * dt);
        // 緩慢巡邏回原本高度
        const homeY = Y.epitheliumBottom + 36 + (i % 2) * 22;
        im.vy += (homeY - im.y) * 0.008 * dt;
        im.vx += (Math.random() - 0.5) * 0.08 * dt;
      }

      im.vx *= 0.92;
      im.vy *= 0.92;
      im.x += im.vx * dt;
      im.y += im.vy * dt;

      // 限制免疫細胞在固有層範圍內
      if (im.x < 25) im.x = 25;
      if (im.x > W - 25) im.x = W - 25;
      if (im.y < Y.epitheliumBottom + 16) im.y = Y.epitheliumBottom + 16;
      if (im.y > Y.vesselTop - 16) im.y = Y.vesselTop - 16;
    }

    // 9. 更新發炎細胞激素粒子
    for (let i = cytokines.length - 1; i >= 0; i--) {
      const c = cytokines[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= 0.008 * dt;

      // 若發炎因子撞擊皮膜底部，會進一步削弱緊密連接 (惡性循環)
      if (c.y < Y.epitheliumBottom && c.y > Y.epitheliumTop) {
        const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((c.x / W) * NUM_COLS)));
        cells[colIdx].junctionIntegrity = Math.max(0, cells[colIdx].junctionIntegrity - 0.06 * dt);
      }

      if (c.life <= 0) {
        cytokines.splice(i, 1);
      }
    }

    // 10. 更新紅血球流動與視覺特效
    for (let i = 0; i < rbcs.length; i++) {
      rbcs[i].x += rbcs[i].speed * dt;
      if (rbcs[i].x > W + 25) rbcs[i].x = -25;
    }

    for (let i = biteEffects.length - 1; i >= 0; i--) {
      const ef = biteEffects[i];
      ef.r += (ef.maxR - ef.r) * 0.12 * dt;
      ef.alpha -= 0.028 * dt;
      if (ef.alpha <= 0) biteEffects.splice(i, 1);
    }

    // 11. 計算整體統計數據並更新頂部與右側 UI
    state.avgMucus = Math.round(sumMucus / NUM_COLS);
    state.avgJunction = Math.round(sumJunction / NUM_COLS);
    state.scfaLevel = Math.min(100, Math.round((sumEnergy / NUM_COLS) * 0.7 + scfas.length * 2.2));

    const activeImmuneAvg = immuneCells.reduce((acc, im) => acc + im.activated, 0) / immuneCells.length;
    state.inflammation = Math.min(100, Math.round(
      activeImmuneAvg * 0.65 + endotoxins.length * 4.5 + Math.max(0, (80 - state.avgJunction) * 0.5)
    ));

    updateDashboardUI();
  }

  function spawnMucinDrop(cell) {
    if (mucinDrops.length > 25) return;
    mucinDrops.push({
      x: cell.x + cell.w * 0.5,
      y: Y.epitheliumTop + 12,
      vy: 0.7 + Math.random() * 0.4,
      r: 4
    });
  }

  // 取得某欄位的外黏液層頂端 Y 座標
  function getMucusTopY(colIdx) {
    const t = mucusCols[colIdx].thickness / 100; // 0 ~ 1
    const fullThickness = Y.epitheliumTop - Y.outerMucusTop;
    return Y.epitheliumTop - fullThickness * t;
  }

  // 取得某欄位的內黏液層無菌阻隔線 Y 座標 (細菌不可越過，除非黏液被吃光)
  function getInnerBarrierY(colIdx) {
    const t = mucusCols[colIdx].thickness / 100;
    const innerFull = Y.epitheliumTop - Y.innerMucusTop;
    // 當厚度 > 45% 時，內黏液層完整阻隔在 Y.innerMucusTop 附近
    if (t > 0.45) {
      return Y.epitheliumTop - innerFull * Math.min(1, (t - 0.2) / 0.65) - 6;
    }
    // 當黏液被啃薄至 < 45%，細菌逐漸逼近皮膜頂端
    return Y.epitheliumTop - (t / 0.45) * innerFull * 0.6 - 4;
  }

  // 更新 DOM 儀表板與階段高亮
  function updateDashboardUI() {
    valMucus.textContent = `${state.avgMucus}%`;
    barMucus.style.width = `${state.avgMucus}%`;

    valJunction.textContent = `${state.avgJunction}%`;
    barJunction.style.width = `${state.avgJunction}%`;

    valScfa.textContent = state.scfaLevel > 65 ? `充足 (${state.scfaLevel}%)` : (state.scfaLevel > 30 ? `偏低 (${state.scfaLevel}%)` : `匱乏 (${state.scfaLevel}%)`);
    barScfa.style.width = `${state.scfaLevel}%`;

    valInflam.textContent = `${state.inflammation}%`;
    barInflam.style.width = `${state.inflammation}%`;

    // 系統整體狀態判定
    if (state.avgMucus > 68 && state.avgJunction > 75 && state.inflammation < 25) {
      statusBadge.className = 'status-badge healthy';
      statusBadge.textContent = '🟢 腸道屏障健康（共生平衡）';
      leakyAlert.classList.add('hidden');
      mech1.classList.add('active');
      mech2.classList.add('active');
      mech3.classList.remove('active');
      mech4.classList.remove('active');
    } else if (state.avgJunction > 52 && state.inflammation < 48) {
      statusBadge.className = 'status-badge warning';
      statusBadge.textContent = '🟡 警訊：缺乏膳食纖維，腸道菌正在啃食黏液層！';
      leakyAlert.classList.add('hidden');
      mech1.classList.remove('active');
      mech2.classList.remove('active');
      mech3.classList.add('active');
      mech4.classList.remove('active');
    } else {
      statusBadge.className = 'status-badge danger';
      statusBadge.textContent = '🔴 危險：黏液屏障破損、引發腸漏症與免疫發炎！';
      leakyAlert.classList.remove('hidden');
      mech1.classList.remove('active');
      mech2.classList.remove('active');
      mech3.classList.add('active');
      mech4.classList.add('active');
    }
  }

  // ==================== 繪圖函式 ====================

  function drawScene() {
    ctx.clearRect(0, 0, W, H);

    drawBackgroundLayers();
    drawSubmucosalVessel();
    drawMucusLayers();
    drawEpitheliumAndGobletCells();
    drawMucinDrops();
    drawDietaryFibers();
    drawScfaParticles();
    drawBacteria();
    drawEndotoxinsAndLeakyPathogens();
    drawImmuneCellsAndCytokines();
    drawBiteEffects();

    if (state.showLabels) {
      drawStructureLabels();
    }
  }

  // 1. 繪製背景四層分區 (腸腔、黏液背景、固有層)
  function drawBackgroundLayers() {
    // 腸腔背景 (Lumen)
    const lumenGrad = ctx.createLinearGradient(0, 0, 0, Y.epitheliumTop);
    lumenGrad.addColorStop(0, '#0f172a');
    lumenGrad.addColorStop(0.55, '#162238');
    lumenGrad.addColorStop(1, '#1b2c46');
    ctx.fillStyle = lumenGrad;
    ctx.fillRect(0, 0, W, Y.epitheliumTop);

    // 固有層背景 (Lamina Propria) — 隨發炎程度變紅
    const inflamRatio = Math.min(1, state.inflammation / 85);
    const laminaGrad = ctx.createLinearGradient(0, Y.epitheliumBottom, 0, H);
    const rTop = Math.round(45 + inflamRatio * 75);
    const gTop = Math.round(32 - inflamRatio * 10);
    const bTop = Math.round(48 - inflamRatio * 12);
    laminaGrad.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
    laminaGrad.addColorStop(1, `rgb(${Math.round(30 + inflamRatio * 55)}, 20, 32)`);
    ctx.fillStyle = laminaGrad;
    ctx.fillRect(0, Y.epitheliumBottom, W, H - Y.epitheliumBottom);

    // 固有層結締組織纖維網紋
    ctx.strokeStyle = `rgba(244, 114, 182, ${0.07 + inflamRatio * 0.08})`;
    ctx.lineWidth = 1;
    for (let y = Y.epitheliumBottom + 18; y < Y.vesselTop; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 40) {
        const wy = y + Math.sin(x * 0.03 + y) * 4;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  // 2. 繪製雙層黏液層 (外層疏鬆黏液 + 內層緻密無菌黏液)
  function drawMucusLayers() {
    // A. 外黏液層 (Outer Loose Mucus Layer)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, Y.epitheliumTop);
    for (let i = 0; i < NUM_COLS; i++) {
      const cx = cells[i].x + cells[i].w * 0.5;
      const topY = getMucusTopY(i) + Math.sin(state.time * 1.5 + i * 0.7) * 3;
      if (i === 0) ctx.lineTo(0, topY);
      ctx.lineTo(cx, topY);
      if (i === NUM_COLS - 1) ctx.lineTo(W, topY);
    }
    ctx.lineTo(W, Y.epitheliumTop);
    ctx.closePath();

    const outerGrad = ctx.createLinearGradient(0, Y.outerMucusTop, 0, Y.epitheliumTop);
    outerGrad.addColorStop(0, 'rgba(34, 211, 238, 0.14)');
    outerGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.24)');
    outerGrad.addColorStop(1, 'rgba(20, 184, 166, 0.36)');
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // 外黏液層上緣波浪描邊
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // B. 內黏液層 (Inner Dense Mucus Layer - 緊貼皮膜的緻密無菌防護層)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, Y.epitheliumTop);
    for (let i = 0; i < NUM_COLS; i++) {
      const cx = cells[i].x + cells[i].w * 0.5;
      const innerY = getInnerBarrierY(i) + Math.cos(state.time * 1.2 + i) * 1.5;
      if (i === 0) ctx.lineTo(0, innerY);
      ctx.lineTo(cx, innerY);
      if (i === NUM_COLS - 1) ctx.lineTo(W, innerY);
    }
    ctx.lineTo(W, Y.epitheliumTop);
    ctx.closePath();

    const innerGrad = ctx.createLinearGradient(0, Y.innerMucusTop, 0, Y.epitheliumTop);
    innerGrad.addColorStop(0, 'rgba(45, 212, 191, 0.38)');
    innerGrad.addColorStop(1, 'rgba(13, 148, 136, 0.58)');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(94, 234, 212, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 繪製 MUC2 黏液糖蛋白交聯網格紋理 (在黏液層內)
    ctx.strokeStyle = 'rgba(153, 246, 228, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < NUM_COLS; i++) {
      const m = mucusCols[i];
      if (m.thickness < 15) continue;
      const topY = getMucusTopY(i);
      const cx = cells[i].x + cells[i].w * 0.5;
      for (let y = topY + 14; y < Y.epitheliumTop - 8; y += 20) {
        ctx.beginPath();
        ctx.arc(cx + Math.sin(y + i) * 8, y, 6, 0, Math.PI * 1.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. 繪製大腸皮膜細胞 (Colonocytes)、杯狀細胞 (Goblet Cells) 與緊密連接 (Tight Junctions)
  function drawEpitheliumAndGobletCells() {
    const cellH = Y.epitheliumBottom - Y.epitheliumTop;

    for (let i = 0; i < NUM_COLS; i++) {
      const c = cells[i];
      // 當緊密連接受損時，細胞寬度向內縮，露出細胞間隙 (腸漏縫隙)
      const gapRight = (100 - c.junctionIntegrity) * 0.14;
      const gapLeft = i > 0 ? (100 - cells[i - 1].junctionIntegrity) * 0.14 : 0;
      const drawX = c.x + gapLeft * 0.5 + 1;
      const drawW = Math.max(18, c.w - (gapLeft + gapRight) * 0.5 - 2);
      const drawY = Y.epitheliumTop;

      ctx.save();

      // 若腸漏縫隙大，在縫隙處畫出紅色警示微光
      if (gapRight > 3.5 && i < NUM_COLS - 1) {
        const leakX = c.x + c.w;
        const leakGrad = ctx.createLinearGradient(leakX - 8, drawY, leakX + 8, Y.epitheliumBottom);
        leakGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
        leakGrad.addColorStop(1, 'rgba(244, 63, 94, 0.15)');
        ctx.fillStyle = leakGrad;
        ctx.fillRect(leakX - gapRight * 0.6, drawY, gapRight * 1.2, cellH);
      }

      // 細胞本體色彩：隨能量高低由飽滿粉橘轉為暗淡灰紫
      const energyRatio = Math.max(0, Math.min(1, c.energy / 100));
      if (c.isGoblet) {
        // 杯狀細胞底色
        ctx.fillStyle = energyRatio > 0.5 ? '#fbcfe8' : '#cbd5e1';
      } else {
        // 一般大腸柱狀皮膜細胞底色
        const r = Math.round(185 + energyRatio * 68);
        const g = Math.round(135 + energyRatio * 65);
        const b = Math.round(145 + energyRatio * 45);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      }

      // 繪製圓角柱狀細胞本體
      roundRect(ctx, drawX, drawY + 6, drawW, cellH - 6, 8);
      ctx.fill();

      // 吸收 SCFA 時的金黃色能量光暈回饋
      if (c.flashTime > 0) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${c.flashTime * 0.9})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = c.isGoblet ? '#db2777' : '#be123c';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }

      // 繪製頂端微絨毛刷狀緣 (Microvilli / Brush Border)
      ctx.strokeStyle = c.isGoblet ? '#0d9488' : '#e11d48';
      ctx.lineWidth = 1.6;
      const brushCount = 6;
      const stepX = (drawW - 6) / brushCount;
      ctx.beginPath();
      for (let b = 0; b <= brushCount; b++) {
        const bx = drawX + 3 + b * stepX;
        ctx.moveTo(bx, drawY + 7);
        ctx.lineTo(bx, drawY + 1);
      }
      ctx.stroke();

      if (c.isGoblet) {
        // 杯狀細胞內部的高腳杯狀黏液囊泡群 (Mucin Granules)
        const cupX = drawX + drawW * 0.5;
        const cupTop = drawY + 12;
        const cupBottom = drawY + cellH * 0.65;

        ctx.fillStyle = 'rgba(20, 184, 166, 0.35)';
        ctx.beginPath();
        ctx.moveTo(drawX + 5, cupTop);
        ctx.quadraticCurveTo(cupX, cupBottom + 10, drawX + drawW - 5, cupTop);
        ctx.closePath();
        ctx.fill();

        // 黏液顆粒小圓泡
        ctx.fillStyle = '#2dd4bf';
        const granuleCount = energyRatio > 0.5 ? 6 : 3;
        for (let g = 0; g < granuleCount; g++) {
          const gx = cupX + ((g % 2 === 0 ? -1 : 1) * (4 + (g % 3) * 2.5));
          const gy = cupTop + 8 + Math.floor(g / 2) * 11;
          ctx.beginPath();
          ctx.arc(gx, gy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 繪製細胞核 (位於基底部)
      const nucX = drawX + drawW * 0.5;
      const nucY = drawY + cellH * 0.76;
      ctx.fillStyle = c.isGoblet ? '#831843' : '#881337';
      ctx.beginPath();
      ctx.ellipse(nucX, nucY, Math.min(11, drawW * 0.28), 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // 細胞核仁與光澤
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(nucX - 3, nucY - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 繪製相鄰細胞間的「緊密連接蛋白 (Tight Junctions)」
      if (state.showJunctions && i < NUM_COLS - 1) {
        const jx = c.x + c.w;
        const integrity = c.junctionIntegrity;
        const stitchRows = 3;

        for (let r = 0; r < stitchRows; r++) {
          const jy = drawY + 18 + r * 14;
          if (integrity > 60) {
            // 緊密扣合的青綠色連接鎖扣
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(jx - 6, jy);
            ctx.lineTo(jx + 6, jy);
            ctx.stroke();

            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(jx, jy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 斷裂鬆脫的紅色連接蛋白
            const split = (100 - integrity) * 0.09;
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(jx - 7 - split, jy - 2);
            ctx.lineTo(jx - 2 - split * 0.4, jy + 1);
            ctx.moveTo(jx + 2 + split * 0.4, jy - 1);
            ctx.lineTo(jx + 7 + split, jy + 2);
            ctx.stroke();
          }
        }
      }
    }

    // 基底膜 (Basement Membrane)
    ctx.fillStyle = 'rgba(244, 114, 182, 0.42)';
    ctx.fillRect(0, Y.epitheliumBottom, W, 5);
  }

  // 4. 繪製杯狀細胞分泌的 MUC2 黏液泡
  function drawMucinDrops() {
    ctx.save();
    for (let i = 0; i < mucinDrops.length; i++) {
      const d = mucinDrops[i];
      ctx.fillStyle = 'rgba(45, 212, 191, 0.8)';
      ctx.strokeStyle = '#ccfbf1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. 繪製飄來的膳食纖維 (綠色多醣六角環鏈)
  function drawDietaryFibers() {
    for (let i = 0; i < fibers.length; i++) {
      const f = fibers[i];
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      const segGap = 12;
      const startOffset = -((f.segments - 1) * segGap) * 0.5;

      // 連接糖環的糖苷鍵
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let s = 0; s < f.segments; s++) {
        const sx = startOffset + s * segGap;
        const sy = Math.sin(s * 1.2) * 3;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // 每個六角環單體
      for (let s = 0; s < f.segments; s++) {
        const sx = startOffset + s * segGap;
        const sy = Math.sin(s * 1.2) * 3;
        drawHexagon(ctx, sx, sy, 6.2, '#22c55e', '#dcfce7');
      }

      ctx.restore();
    }
  }

  function drawHexagon(ctx, cx, cy, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(ang);
      const y = cy + r * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // 6. 繪製短鏈脂肪酸 (SCFA: 丁酸/丙酸/乙酸 發光金黃粒子)
  function drawScfaParticles() {
    ctx.save();
    for (let i = 0; i < scfas.length; i++) {
      const s = scfas[i];
      const grad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 2.2);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.45, '#fbbf24');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 7. 繪製可愛化腸道菌群 (產丁酸益生菌、雙歧桿菌、噬黏液菌) — 帶有大眼睛、腮紅與生動表情
  function drawCuteEyesAndMouth(ctx, eyeX, eyeY, eyeSep, isEatingMucus, isHungry, isHappy, timePhase) {
    const leftX = eyeX - eyeSep * 0.5;
    const rightX = eyeX + eyeSep * 0.5;

    // 粉紅腮紅 (吃飽或平時顯示)
    if (!isEatingMucus) {
      ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
      ctx.beginPath();
      ctx.ellipse(leftX - 3.2, eyeY + 3.2, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.ellipse(rightX + 3.2, eyeY + 3.2, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 眼白與黑眼珠
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftX, eyeY, 3.1, 0, Math.PI * 2);
    ctx.arc(rightX, eyeY, 3.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    const lookOffset = isEatingMucus ? 0.9 : 0.4;
    ctx.beginPath();
    ctx.arc(leftX + lookOffset, eyeY + (isEatingMucus ? 0.8 : 0), 1.7, 0, Math.PI * 2);
    ctx.arc(rightX + lookOffset, eyeY + (isEatingMucus ? 0.8 : 0), 1.7, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛閃亮高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftX - 0.5, eyeY - 0.9, 0.8, 0, Math.PI * 2);
    ctx.arc(rightX - 0.5, eyeY - 0.9, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 若飢餓或正在啃黏液，畫出壞壞/飢餓斜眉毛
    if (isEatingMucus || isHungry) {
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(leftX - 2.5, eyeY - 3.8);
      ctx.lineTo(leftX + 2, eyeY - 2.2);
      ctx.moveTo(rightX + 2.5, eyeY - 3.8);
      ctx.lineTo(rightX - 2, eyeY - 2.2);
      ctx.stroke();
    }

    // 嘴巴表情
    const mouthY = eyeY + 3.2;
    if (isEatingMucus) {
      // 張大嘴啃食黏液 (附可愛小尖牙)
      const chomp = Math.abs(Math.sin(timePhase * 4)) * 2.2 + 1.5;
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.ellipse(eyeX, mouthY + 1, 3.8, chomp, 0, 0, Math.PI * 2);
      ctx.fill();

      // 小白牙
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(eyeX - 2, mouthY + 1 - chomp * 0.6);
      ctx.lineTo(eyeX - 1, mouthY + 1);
      ctx.lineTo(eyeX, mouthY + 1 - chomp * 0.6);
      ctx.moveTo(eyeX, mouthY + 1 - chomp * 0.6);
      ctx.lineTo(eyeX + 1, mouthY + 1);
      ctx.lineTo(eyeX + 2, mouthY + 1 - chomp * 0.6);
      ctx.fill();
    } else if (isHappy) {
      // 開心吃纖維微笑弧線
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(eyeX, mouthY - 0.5, 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // 呆萌小嘴
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(eyeX, mouthY + 1.5, 1.8, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  }

  function drawBacteria() {
    for (let i = 0; i < bacteria.length; i++) {
      const b = bacteria[i];
      const isHungry = b.hunger > 55;
      const isHappy = b.hunger < 38;

      ctx.save();
      ctx.translate(b.x, b.y);

      // 輕微Q彈呼吸縮放，讓細菌像活生生的可愛小精靈
      const bounce = 1 + Math.sin(b.wigglePhase * 1.3) * 0.05;
      ctx.scale(bounce, 2 - bounce);

      // 當細菌正在啃食黏液時，外圍顯示紅色飢餓/啃咬警示圈
      if (b.eatingMucus) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 19 + Math.sin(state.time * 6 + i) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (b.type === 'butyrate_rod') {
        // 【產丁酸益生菌】：圓潤天藍小膠囊精靈 + 搖擺小尾巴 + 頭頂小呆毛/光環
        ctx.save();
        ctx.rotate(b.angle * 0.35);

        // 雙鞭毛可愛捲尾巴
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const tailWave = Math.sin(b.wigglePhase * 2) * 5;
        ctx.beginPath();
        ctx.moveTo(-13, -2);
        ctx.quadraticCurveTo(-20, tailWave - 4, -25, -tailWave * 0.6 - 2);
        ctx.moveTo(-13, 2);
        ctx.quadraticCurveTo(-20, tailWave + 4, -25, -tailWave * 0.6 + 2);
        ctx.stroke();

        // 圓滾滾膠囊身體
        roundRect(ctx, -14, -9.5, 28, 19, 9.5);
        const bodyGrad = ctx.createLinearGradient(0, -9.5, 0, 9.5);
        bodyGrad.addColorStop(0, '#38bdf8');
        bodyGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 肚皮亮面高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.ellipse(-2, -4.5, 7, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 可愛大眼睛、腮紅與嘴巴
        drawCuteEyesAndMouth(ctx, 2, -1, 8.5, b.eatingMucus, isHungry, isHappy, b.wigglePhase);
        ctx.restore();

      } else if (b.type === 'bifido') {
        // 【雙歧益生菌】：薄荷綠兔耳/Y型精靈
        ctx.save();
        ctx.rotate(b.angle * 0.3);

        // 繪製圓潤 Y 字兔耳造型身體
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 1.8;

        // 左耳與右耳
        ctx.beginPath();
        ctx.ellipse(-6, -9, 5, 8, -0.35, 0, Math.PI * 2);
        ctx.ellipse(6, -9, 5, 8, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 圓圓主身體
        ctx.beginPath();
        ctx.arc(0, 1, 10.5, 0, Math.PI * 2);
        const bifGrad = ctx.createRadialGradient(-3, -3, 2, 0, 1, 11);
        bifGrad.addColorStop(0, '#34d399');
        bifGrad.addColorStop(1, '#059669');
        ctx.fillStyle = bifGrad;
        ctx.fill();
        ctx.stroke();

        // 兔耳內側粉嫩色
        ctx.fillStyle = 'rgba(167, 243, 208, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-6, -9, 2.2, 4.2, -0.35, 0, Math.PI * 2);
        ctx.ellipse(6, -9, 2.2, 4.2, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // 可愛五官
        drawCuteEyesAndMouth(ctx, 0, 0.5, 8, b.eatingMucus, isHungry, isHappy, b.wigglePhase);
        ctx.restore();

      } else {
        // 【噬黏液菌】：紫色小惡魔角圓滾怪獸 (缺纖維飢餓時變桃紅大嘴怪啃黏液！)
        ctx.save();
        ctx.rotate(b.angle * 0.25);

        // 頭頂兩隻小惡魔角
        ctx.fillStyle = b.eatingMucus ? '#fbbf24' : '#f3e8ff';
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // 左角
        ctx.moveTo(-8, -7);
        ctx.lineTo(-12, -15);
        ctx.lineTo(-3, -10);
        ctx.closePath();
        // 右角
        ctx.moveTo(8, -7);
        ctx.lineTo(12, -15);
        ctx.lineTo(3, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 毛茸茸/波浪小怪獸圓身體
        ctx.beginPath();
        const bumps = 12;
        for (let a = 0; a <= bumps * 2; a++) {
          const ang = (a / (bumps * 2)) * Math.PI * 2;
          const r = (a % 2 === 0 ? 11.5 : 9.8);
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const mucinGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 12);
        if (b.eatingMucus) {
          mucinGrad.addColorStop(0, '#fb7185');
          mucinGrad.addColorStop(1, '#be123c');
        } else {
          mucinGrad.addColorStop(0, '#c084fc');
          mucinGrad.addColorStop(1, '#7e22ce');
        }
        ctx.fillStyle = mucinGrad;
        ctx.fill();
        ctx.strokeStyle = b.eatingMucus ? '#ffe4e6' : '#f3e8ff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 可愛大眼睛與大嘴巴 (啃黏液時露出小尖牙開合)
        drawCuteEyesAndMouth(ctx, 0, -1, 8, b.eatingMucus, isHungry, isHappy, b.wigglePhase);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // 8. 繪製穿透皮膜的細菌與內毒素 (LPS) — 腸漏症視覺效果
  function drawEndotoxinsAndLeakyPathogens() {
    ctx.save();
    for (let i = 0; i < endotoxins.length; i++) {
      const e = endotoxins[i];
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.isWholeBac) {
        // 整隻穿透進來的壞菌小惡魔 (帶小角與壞壞眼神)
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(-6, -5); ctx.lineTo(-9, -11); ctx.lineTo(-2, -7);
        ctx.moveTo(6, -5);  ctx.lineTo(9, -11);  ctx.lineTo(2, -7);
        ctx.fill();

        roundRect(ctx, -9.5, -7, 19, 14, 7);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 壞壞小眼睛
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-3.5, -1, 2.2, 0, Math.PI * 2);
        ctx.arc(3.5, -1, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3.5, -0.5, 1.2, 0, Math.PI * 2);
        ctx.arc(3.5, -0.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 刺狀細菌內毒素 (LPS)
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const spikes = 7;
        for (let s = 0; s < spikes * 2; s++) {
          const r = s % 2 === 0 ? 6.5 : 3;
          const ang = (s * Math.PI) / spikes + state.time * 2;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 9. 繪製固有層免疫細胞 (巨噬細胞、樹突細胞) 與發炎細胞激素
  function drawImmuneCellsAndCytokines() {
    // 發炎細胞激素粒子 (IL-6, TNF-α)
    if (state.showCytokines) {
      ctx.save();
      for (let i = 0; i < cytokines.length; i++) {
        const c = cytokines[i];
        ctx.fillStyle = `rgba(236, 72, 153, ${c.life})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(251, 207, 232, ${c.life * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 免疫細胞本體
    for (let i = 0; i < immuneCells.length; i++) {
      const im = immuneCells[i];
      const isAct = im.activated > 30;
      ctx.save();
      ctx.translate(im.x, im.y);

      // 活化時的紅色發炎警示光圈
      if (isAct) {
        const auraR = 24 + Math.sin(im.pulse * 2) * 4;
        const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, auraR);
        aura.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
        aura.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, auraR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 變形蟲偽足輪廓
      ctx.beginPath();
      const lobes = im.type === 'dendritic' ? 9 : 7;
      for (let a = 0; a <= 36; a++) {
        const ang = (a / 36) * Math.PI * 2;
        const wave = Math.sin(ang * lobes + im.pulse) * (im.type === 'dendritic' ? 5.5 : 3.2);
        const r = 14 + wave + (isAct ? 2.5 : 0);
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = isAct ? 'rgba(249, 115, 22, 0.88)' : 'rgba(251, 146, 60, 0.65)';
      ctx.fill();
      ctx.strokeStyle = isAct ? '#fef08a' : '#fed7aa';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 馬蹄形細胞核
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 10. 繪製底部黏膜下微血管與紅血球
  function drawSubmucosalVessel() {
    const vTop = Y.vesselTop;
    const vBot = Y.vesselBottom;
    const vH = vBot - vTop;

    // 血管壁與管腔
    const vGrad = ctx.createLinearGradient(0, vTop, 0, vBot);
    vGrad.addColorStop(0, '#7f1d1d');
    vGrad.addColorStop(0.5, '#991b1b');
    vGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, vTop, W, vH);

    // 內皮細胞虛線邊界 (發炎時通透性增加)
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 5]);
    ctx.beginPath();
    ctx.moveTo(0, vTop);
    ctx.lineTo(W, vTop);
    ctx.moveTo(0, vBot);
    ctx.lineTo(W, vBot);
    ctx.stroke();
    ctx.setLineDash([]);

    // 紅血球 (RBCs)
    const midY = (vTop + vBot) * 0.5;
    for (let i = 0; i < rbcs.length; i++) {
      const r = rbcs[i];
      ctx.save();
      ctx.translate(r.x, midY + r.yOffset);
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6.2, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 雙凹圓盤中心凹陷
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 11. 繪製啃食或分解特效文字
  function drawBiteEffects() {
    ctx.save();
    ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < biteEffects.length; i++) {
      const ef = biteEffects[i];
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = Math.max(0, ef.alpha);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = ef.color;
      ctx.fillText(ef.text, ef.x, ef.y - ef.r - 3);
    }
    ctx.restore();
  }

  // 12. 繪製組織構造標示牌 (點擊可查看百科)
  function drawStructureLabels() {
    const labels = [
      { key: 'lumen',       x: W - 125, y: Y.lumenTop + 68,       text: '大腸腔 (膳食纖維與共生菌)' },
      { key: 'outer_mucus', x: W - 125, y: Y.outerMucusTop + 36,  text: '外黏液層 (疏鬆・菌群棲息)' },
      { key: 'inner_mucus', x: W - 125, y: Y.innerMucusTop + 40,  text: '內黏液層 (緻密・無菌阻隔)' },
      { key: 'colonocyte',  x: W - 125, y: Y.epitheliumTop + 45,  text: '大腸皮膜細胞 & 杯狀細胞' },
      { key: 'junction',    x: 118,     y: Y.epitheliumTop + 28,  text: '緊密連接蛋白 (防範腸漏)' },
      { key: 'lamina',      x: W - 125, y: Y.epitheliumBottom + 48, text: '固有層 (巨噬/樹突免疫細胞)' },
      { key: 'vessel',      x: 118,     y: Y.vesselTop + 22,      text: '黏膜下微血管 (全身循環)' }
    ];

    ctx.save();
    ctx.font = '600 12px "Noto Sans TC", sans-serif';
    for (let i = 0; i < labels.length; i++) {
      const lb = labels[i];
      const padX = 10;
      const tw = ctx.measureText(lb.text).width;
      const boxW = tw + padX * 2;
      const boxH = 24;
      const bx = lb.x - boxW * 0.5;
      const by = lb.y - boxH * 0.5;

      const isSel = state.selectedStructure === lb.key;
      ctx.fillStyle = isSel ? 'rgba(16, 185, 129, 0.92)' : 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = isSel ? '#a7f3d0' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isSel ? 1.8 : 1;

      roundRect(ctx, bx, by, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSel ? '#064e3b' : '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.text, lb.x, lb.y);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  // ==================== 互動與事件綁定 ====================

  function setDietMode(mode) {
    if (mode === 'high') {
      modeHighBtn.classList.add('active');
      modeNoneBtn.classList.remove('active');
      state.fiberRate = 85;
      sliderFiberRate.value = 85;
      updateFiberRateLabel(85);
      flowBannerText.textContent = '腸腔食糜由左向右漂流：充足膳食纖維供養共生菌產出 SCFA';
      // 立即補充幾條纖維讓視覺立即有感
      for (let i = 0; i < 6; i++) {
        spawnFiber(Math.random() * (W * 0.6));
      }
    } else {
      modeNoneBtn.classList.add('active');
      modeHighBtn.classList.remove('active');
      state.fiberRate = 0;
      sliderFiberRate.value = 0;
      updateFiberRateLabel(0);
      // 清空腸腔現有纖維並提高細菌飢餓感，加速展示「無纖維時細菌攝食黏液」
      fibers.length = 0;
      for (let i = 0; i < bacteria.length; i++) {
        bacteria[i].hunger = Math.max(bacteria[i].hunger, 68);
      }
      flowBannerText.textContent = '⚠️ 缺乏膳食纖維！飢餓的腸道菌開始向下啃食黏液層糖蛋白';
    }
  }

  function updateFiberRateLabel(val) {
    if (val === 0) labelFiberRate.textContent = '0% (等待投放 / 手動控制)';
    else if (val < 35) labelFiberRate.textContent = `${val}% (纖維不足)`;
    else if (val < 70) labelFiberRate.textContent = `${val}% (中等供給)`;
    else labelFiberRate.textContent = `${val}% (高纖充足)`;
  }

  function togglePause(forcedState) {
    state.paused = (typeof forcedState === 'boolean') ? forcedState : !state.paused;
    if (state.paused) {
      btnPause.textContent = '▶ 開始 / 繼續模擬';
      btnPause.classList.add('btn-play-state');
      flowBannerText.textContent = '⏸ 動畫已暫停（講解模式）：請由右側投放膳食纖維與微生物，按「▶ 開始 / 繼續模擬」啟動';
    } else {
      btnPause.textContent = '⏸ 暫停模擬';
      btnPause.classList.remove('btn-play-state');
      if (state.fiberRate > 0) {
        flowBannerText.textContent = '腸腔食糜由左向右漂流：膳食纖維供養共生菌產出 SCFA';
      } else if (bacteria.length > 0 && fibers.length === 0) {
        flowBannerText.textContent = '⚠️ 缺乏膳食纖維！飢餓的腸道菌開始向下啃食黏液層糖蛋白';
      } else if (fibers.length > 0 && bacteria.length > 0) {
        flowBannerText.textContent = '共生菌正在發酵膳食纖維，產生短鏈脂肪酸 (SCFA) 滋養皮膜';
      } else {
        flowBannerText.textContent = '腸腔運作中：可隨時投放膳食纖維或微生物進行觀察';
      }
    }
  }

  modeHighBtn.addEventListener('click', () => setDietMode('high'));
  modeNoneBtn.addEventListener('click', () => setDietMode('none'));

  btnDropFiber.addEventListener('click', () => {
    for (let i = 0; i < 8; i++) {
      spawnFiber(40 + Math.random() * (W - 80), 35 + Math.random() * (Y.outerMucusTop - 40));
    }
  });

  if (btnDropBacteriaAll) {
    btnDropBacteriaAll.addEventListener('click', () => {
      spawnBacteriaBatch('all', 8);
    });
  }

  if (btnDropProbiotic) {
    btnDropProbiotic.addEventListener('click', () => {
      spawnBacteriaBatch('probiotic', 6);
    });
  }

  if (btnDropMucin) {
    btnDropMucin.addEventListener('click', () => {
      spawnBacteriaBatch('mucin', 4);
    });
  }

  btnDropScfa.addEventListener('click', () => {
    for (let i = 0; i < 18; i++) {
      spawnScfaBurst(40 + Math.random() * (W - 80), Y.outerMucusTop + 20 + Math.random() * 60, 1);
    }
  });

  if (btnClearLumen) {
    btnClearLumen.addEventListener('click', () => {
      fibers.length = 0;
      bacteria.length = 0;
      scfas.length = 0;
      biteEffects.length = 0;
    });
  }

  brushRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.spawnBrush = e.target.value;
      }
    });
  });

  sliderFiberRate.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.fiberRate = val;
    updateFiberRateLabel(val);
    if (val === 0) {
      modeNoneBtn.classList.add('active');
      modeHighBtn.classList.remove('active');
    } else if (val >= 50) {
      modeHighBtn.classList.add('active');
      modeNoneBtn.classList.remove('active');
    } else {
      modeHighBtn.classList.remove('active');
      modeNoneBtn.classList.remove('active');
    }
  });

  sliderSpeed.addEventListener('input', (e) => {
    state.simSpeed = Number(e.target.value);
    labelSpeed.textContent = `${state.simSpeed.toFixed(1)}x`;
  });

  btnPause.addEventListener('click', () => togglePause());

  btnReset.addEventListener('click', () => {
    state.fiberRate = 0;
    sliderFiberRate.value = 0;
    updateFiberRateLabel(0);
    modeHighBtn.classList.remove('active');
    modeNoneBtn.classList.remove('active');
    initWorld();
    togglePause(true);
  });

  chkLabels.addEventListener('change', (e) => { state.showLabels = e.target.checked; });
  chkJunctions.addEventListener('change', (e) => { state.showJunctions = e.target.checked; });
  chkCytokines.addEventListener('change', (e) => { state.showCytokines = e.target.checked; });

  // 畫布觸控與滑鼠互動（防雙擊放大、支援多點/連續觸控與拖曳投放）
  function detectZoneAt(x, y) {
    if (y < Y.outerMucusTop) return 'lumen';
    if (y < Y.innerMucusTop) return 'outer_mucus';
    if (y < Y.epitheliumTop) return 'inner_mucus';
    if (y < Y.epitheliumBottom) {
      const colIdx = Math.max(0, Math.min(NUM_COLS - 1, Math.floor((x / W) * NUM_COLS)));
      const cell = cells[colIdx];
      // 若點擊靠近細胞邊界，優先顯示緊密連接說明
      const distToRightEdge = Math.abs(x - (cell.x + cell.w));
      if (distToRightEdge < 12 && colIdx < NUM_COLS - 1) return 'junction';
      return cell.isGoblet ? 'goblet' : 'colonocyte';
    }
    if (y < Y.vesselTop) return 'lamina';
    return 'vessel';
  }

  function showTooltipAt(mx, my) {
    const zone = detectZoneAt(mx, my);
    const info = STRUCTURE_INFO[zone];
    if (info) {
      tooltip.classList.remove('hidden');
      tooltip.innerHTML = `<strong style="color:#38bdf8">${info.title}</strong><br><span style="color:#cbd5e1">${info.desc}</span>`;
      const tx = Math.min(W - 280, Math.max(12, mx + 16));
      const ty = Math.min(H - 130, Math.max(12, my + 16));
      tooltip.style.left = `${tx}px`;
      tooltip.style.top = `${ty}px`;
    }
  }

  function handleCanvasInteract(mx, my) {
    const zone = detectZoneAt(mx, my);
    state.selectedStructure = zone;

    const info = STRUCTURE_INFO[zone];
    if (info) {
      infoTitle.textContent = info.title;
      infoDesc.textContent = info.desc;
    }

    // 若點擊/觸控在腸腔或外黏液層上緣，依據選取的筆刷投放對應物質
    if (my < Y.outerMucusTop + 25) {
      if (state.spawnBrush === 'fiber' && fibers.length < 35) {
        spawnFiber(mx - 10, my);
        spawnFiber(mx + 10, my + 8);
      } else if (state.spawnBrush === 'probiotic' && bacteria.length < 45) {
        const t = Math.random() < 0.55 ? 'butyrate_rod' : 'bifido';
        bacteria.push(createBacterium(t, mx, my));
      } else if (state.spawnBrush === 'mucin' && bacteria.length < 45) {
        bacteria.push(createBacterium('mucin_degrader', mx, my));
      }
    }
  }

  let isPointerDown = false;
  let lastDragSpawnTime = 0;
  let tooltipHideTimer = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // 防止觸控螢幕雙擊放大或觸發捲動
    }
    isPointerDown = true;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    handleCanvasInteract(mx, my);
    showTooltipAt(mx, my);

    if (e.pointerType === 'touch') {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = setTimeout(() => {
        tooltip.classList.add('hidden');
      }, 2800);
    }
  }, { passive: false });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (e.pointerType === 'mouse') {
      showTooltipAt(mx, my);
    } else if (isPointerDown) {
      e.preventDefault();
      showTooltipAt(mx, my);
      // 支援手指在腸腔滑動時連續撒入對應物質
      const now = performance.now();
      if (my < Y.outerMucusTop + 20 && now - lastDragSpawnTime > 120) {
        if (state.spawnBrush === 'fiber' && fibers.length < 35) {
          spawnFiber(mx, my);
          lastDragSpawnTime = now;
        } else if (state.spawnBrush === 'probiotic' && bacteria.length < 45) {
          const t = Math.random() < 0.55 ? 'butyrate_rod' : 'bifido';
          bacteria.push(createBacterium(t, mx, my));
          lastDragSpawnTime = now;
        } else if (state.spawnBrush === 'mucin' && bacteria.length < 45) {
          bacteria.push(createBacterium('mucin_degrader', mx, my));
          lastDragSpawnTime = now;
        }
      }
    }
  }, { passive: false });

  window.addEventListener('pointerup', () => {
    isPointerDown = false;
  });

  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      tooltip.classList.add('hidden');
    }
  });

  // 全域防止快速雙擊 (double-tap / dblclick) 與雙指縮放手勢觸發瀏覽器畫面放大
  document.addEventListener('dblclick', (e) => {
    e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 320) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('resize', resizeCanvas);

  // 啟動主迴圈
  function animate() {
    updateSimulation();
    drawScene();
    requestAnimationFrame(animate);
  }

  resizeCanvas();
  initWorld();
  togglePause(true);
  animate();
})();

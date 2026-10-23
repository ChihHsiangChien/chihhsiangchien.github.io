/**
 * 光合作用與晝夜養分輸導引擎 | Photosynthesis & Day-Night Translocation Engine
 * 特色：
 * 1. 韌皮部長途養分運輸為 24 小時晝夜持續進行。
 * 2. 日間照光：固定碳在細胞質即時合成「蔗糖」，經韌皮部裝載（Phloem loading）立即運往各庫器官（根/花/果/頂芽）。
 * 3. 葉綠體暫存澱粉（蓄洪機制）：日間光合速率大於即時運輸負荷，多餘碳合成不溶性「暫時性澱粉」暫存，避免高滲透壓。
 * 4. 夜間黑暗：氣孔閉合，葉綠體暫存澱粉水解為「蔗糖」，經韌皮部接續轉運，確保庫器官 24 小時晝夜獲得穩定能量。
 * 5. 嚴格遵循木質部（水分上行）與韌皮部（蔗糖分流至庫器官）專屬路徑。
 */

(function () {
  'use strict';

  // 狀態管理
  const state = {
    fate: 'root', // 'root' | 'root_growth' | 'flower' | 'fruit' | 'shoot'
    isPlaying: true,
    runMode: 'parallel', // 'parallel' (真實生理) | 'auto' (自動分步) | 'manual' (手動單步)
    isParallelMode: true, // 真實生理模式：日照時所有步驟動畫同時並行
    isAutoMode: false,
    isStepMode: false,
    currentStep: 0, // 當前單步階段 (1 ~ 8)
    loopCount: 1, // 當前循環輪次
    loopNextTimerId: null, // 接續下一輪的計時器 ID
    activeTimers: [], // 活動計時器快取

    // 光照與氣孔開閉 (黑暗時氣孔自動關閉)
    isDay: true,
    stomaOpen: true,
    stomaAperture: 1.0, // 0.0 ~ 1.0 平滑插值

    // 累積生長/儲存量
    leafStarchCount: 0, // 葉綠體暫時性澱粉儲存量 (日間合成暫存，夜間水解轉運)
    autoLoopTargetStarch: 3, // 自動循環模式下日間累積暫存澱粉目標 (累積至 3 顆後轉入夜間轉運)
    rootStarchCount: 0,
    rootGrowthCount: 0,        // 根系生長累計量 (支持細胞分裂、伸長與吸收能量)
    rootGrowthPulse: 0,        // 根系生長/細胞分裂光波脈衝
    flowerEnergyCount: 0,
    fruitSugarCount: 0,
    shootEnergyCount: 0,
    shootGrowthPulse: 0,       // 頂芽生長/細胞分裂光波脈衝
    rootEmptyAlertPulse: 0,

    // 真實生理模式粒子生成節奏計時器
    lastParallelCO2Spawn: 0,
    lastParallelH2OSpawn: 0,
    lastParallelO2Spawn: 0,
    lastParallelPhloemSpawn: 0,
    lastParallelStarchSpawn: 0,

    // 顯微特寫視窗模式 ('guardCell' | 'chloroplast')
    insetMode: 'guardCell',
    insetUserOverridden: false, // 使用者是否手動切換過顯微視窗

    // 蒸散作用專題模式 (單獨聚焦水分運輸、氣孔蒸散與少部分進入葉肉細胞)
    isTranspirationMode: false,
    lastTranspirationSpawn: 0,

    // 生理步驟即時解說字幕開關 (出現在 geo 畫布位置，可 toggle 顯示或隱藏)
    showSubtitles: false,

    // 微觀放大圖開關
    showMicroscopicInset: false,

    // 粒子系統
    co2Particles: [],
    h2oParticles: [],
    vaporParticles: [],        // 自氣孔逸散之水氣粒子 (H2O 氣體)
    o2Bubbles: [],
    glucoseParticles: [],      // 葉綠體基質生成的六角環葡萄糖分子 (C6H12O6)
    dehydrationParticles: [],  // 葡萄糖脫水縮合為澱粉時釋出的微小水分子 (H2O)
    isPolymerizing: false,     // 正在進行脫水縮合聚合動畫
    polymerizationProgress: 0, // 0.0 ~ 1.0 聚合動畫進度
    synthesisFlash: 0,         // 合成完成瞬間的金色高光脈衝
    transports: [],
    conversions: [],           // 抵達各庫器官時的生化轉化浮動特效標籤

    lastTime: performance.now(),
    chloroplastPulse: 0
  };

  // 韌皮部養分運輸批次追蹤 (確保日照前完全送進庫，且抵達庫後才轉化)
  let batchCounter = 0;
  const activeBatches = new Map();

  // DOM 元素快取
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');

  // 集中控制區按鈕
  const modeParallelBtn = document.getElementById('modeParallelBtn');
  const modeAutoBtn = document.getElementById('modeAutoBtn');
  const modeManualBtn = document.getElementById('modeManualBtn');
  const lightDayBtn = document.getElementById('lightDayBtn');
  const lightNightBtn = document.getElementById('lightNightBtn');
  const subtitleOnBtn = document.getElementById('subtitleOnBtn');
  const subtitleOffBtn = document.getElementById('subtitleOffBtn');
  const insetOnBtn = document.getElementById('insetOnBtn');
  const insetOffBtn = document.getElementById('insetOffBtn');
  const stepBtn = document.getElementById('stepBtn');
  const transpirationBtn = document.getElementById('transpirationBtn');
  const transpirationInfoBox = document.getElementById('transpirationInfoBox');
  const resetBtn = document.getElementById('resetBtn');

  const loopIndicator = document.getElementById('loopIndicator');
  const loopBadgeText = document.getElementById('loopBadgeText');

  const guardCellDetailBox = document.getElementById('guardCellDetailBox');



  const fateRootBtn = document.getElementById('fateRootBtn');
  const fateRootGrowthBtn = document.getElementById('fateRootGrowthBtn');
  const fateFlowerBtn = document.getElementById('fateFlowerBtn');
  const fateFruitBtn = document.getElementById('fateFruitBtn');
  const fateShootBtn = document.getElementById('fateShootBtn');

  const rootToFlowerBtn = document.getElementById('rootToFlowerBtn');
  const rootToFruitBtn = document.getElementById('rootToFruitBtn');
  const rootToShootBtn = document.getElementById('rootToShootBtn');

  const eqCO2 = document.getElementById('eqCO2');
  const eqH2O = document.getElementById('eqH2O');
  const eqLightArrow = document.getElementById('eqLightArrow');
  const eqGlucose = document.getElementById('eqGlucose');
  const eqO2 = document.getElementById('eqO2');
  const eqH2Oproduct = document.getElementById('eqH2Oproduct');
  const eqPolyArrow = document.getElementById('eqPolyArrow');
  const eqStarch = document.getElementById('eqStarch');

  // =========================================================================
  // 解剖座標系統 (Precise Anatomical Layout)
  // =========================================================================
  const geo = {
    w: 1320,
    h: 740,
    soilY: 490,       // 地表土壤分界
    sunX: 1160,
    sunY: 95,

    // 莖部 (Stem)
    stemCenterX: 690,
    stemWidth: 72,
    stemTopY: 140,
    stemBottomY: 540,

    // 專屬輸導管 (Vascular Tracks)
    xylemStemX: 670,   // 木質部 (左側藍管)
    phloemStemX: 710,  // 韌皮部 (右側紫管)

    // 葉片 (Source - 光合作用源)
    leafBaseX: 650,
    leafCenterY: 300,
    leafTipX: 250,
    chloroplastX: 420,
    chloroplastY: 285,
    stomaX: 380,
    stomaY: 345,

    // 庫器官 1：花朵 (Flower - 位於右上部花枝，避開中央導管標籤)
    flowerX: 940,
    flowerY: 95,

    // 庫器官 2：果實 (Fruit - 位於中上部側枝)
    fruitBranchX: 960,
    fruitBranchY: 250,

    // 庫器官 3：根部儲藏塊 (Root Tuber - 位於地下右側)
    rootTuberX: 830,
    rootTuberY: 585,

    // 庫器官 4：頂端新葉芽 (Apical Shoot - 位於頂部)
    shootX: 690,
    shootY: 85,

    // 庫器官 5：根系生長點 (Root Tip Growth - 位於地下主根末梢)
    rootTipX: 690,
    rootTipY: 665,

    // 生理步驟即時解說字幕條錨定座標 (Canvas Subtitle Bar)
    subtitleX: 660,
    subtitleY: 692
  };

  // =========================================================================
  // 計時器排程管理 (安全取消與重複調度)
  // =========================================================================

  function scheduleTimer(fn, delay) {
    const timerId = setTimeout(() => {
      state.activeTimers = state.activeTimers.filter(id => id !== timerId);
      fn();
    }, delay);
    state.activeTimers.push(timerId);
    return timerId;
  }

  function clearAllTimers() {
    state.activeTimers.forEach(id => clearTimeout(id));
    state.activeTimers = [];

    // 強制結算任何因快速點擊或切換模式而被中斷的關鍵狀態
    // 若畫面上有葡萄糖或正在聚合，則直接結算為一顆澱粉
    if (state.isPolymerizing || state.glucoseParticles.length > 0) {
      if (state.leafStarchCount < 5) {
        state.leafStarchCount++;
      }
      state.isPolymerizing = false;
      state.glucoseParticles = [];
      state.dehydrationParticles = [];
      state.synthesisFlash = 1.0;
    }

    // 清除其他可能因為步驟切換而被卡在半空中的過渡粒子
    state.co2Particles = [];
    state.h2oParticles = [];
  }

  function resetEquationHighlights() {
    if (eqCO2) eqCO2.className = 'eq-item';
    if (eqH2O) eqH2O.className = 'eq-item';
    if (eqLightArrow) eqLightArrow.className = 'eq-arrow';
    if (eqGlucose) eqGlucose.className = 'eq-item';
    if (eqO2) eqO2.className = 'eq-item';
    if (eqH2Oproduct) eqH2Oproduct.className = 'eq-item';
    if (eqPolyArrow) eqPolyArrow.className = 'eq-arrow';
    if (eqStarch) eqStarch.className = 'eq-item';
  }

  // 真實生理模式：日間所有參與光合作用之反應物與產物同時高亮發光
  function highlightAllDaytimeEquations() {
    resetEquationHighlights();
    if (eqCO2) eqCO2.classList.add('active-co2');
    if (eqH2O) eqH2O.classList.add('active-h2o');
    if (eqLightArrow) eqLightArrow.classList.add('active-poly');
    if (eqGlucose) eqGlucose.classList.add('active-glucose');
    if (eqO2) eqO2.classList.add('active-o2');
    if (eqH2Oproduct) eqH2Oproduct.classList.add('active-h2o');
    if (eqPolyArrow) eqPolyArrow.classList.add('active-poly');
    if (eqStarch) eqStarch.classList.add('active-starch');
  }

  // 顯微特寫視窗模式 (固定保留氣孔保衛細胞)
  function setInsetMode(mode, userInitiated = false) {
    state.insetMode = 'guardCell';
    if (guardCellDetailBox) {
      guardCellDetailBox.style.display = 'flex';
    }
  }

  const STEP_INFOS = [
    {
      step: 1,
      title: '晨光照耀，保衛細胞吸水膨脹，氣孔完全張開',
      targetName: '氣孔保衛細胞',
      organX: geo.stomaX,
      organY: geo.stomaY
    },
    {
      step: 2,
      title: '大氣 CO₂ 經由張開的氣孔擴散進入葉片氣室',
      targetName: '葉片氣室',
      organX: geo.stomaX,
      organY: geo.stomaY
    },
    {
      step: 3,
      title: '根部吸收 H₂O，經木質部導管逆重力向上輸送至葉脈',
      targetName: '根毛與木質部',
      organX: geo.xylemStemX,
      organY: geo.soilY - 30
    },
    {
      step: 4,
      title: '葉綠體光反應吸收光能裂解水，釋出 O₂ 經氣孔排出',
      targetName: '葉綠體 (光反應)',
      organX: geo.chloroplastX,
      organY: geo.chloroplastY
    },
    {
      step: 5,
      title: '碳反應固定 CO₂ 合成醣類，即時轉化為蔗糖經韌皮部裝載運往庫器官 (日間即時供應)',
      targetName: '韌皮部裝載與即時運輸',
      organX: geo.phloemStemX,
      organY: geo.leafCenterY
    },
    {
      step: 6,
      title: '日間光合速率大於即時運輸負荷，多餘碳聚合為【暫時性澱粉】「蓄洪」暫存',
      targetName: '葉綠體暫存澱粉 (蓄洪)',
      organX: geo.chloroplastX,
      organY: geo.chloroplastY
    },
    {
      step: 7,
      title: '夜幕降臨失去光照，保衛細胞失水萎縮，氣孔完全閉合（光反應停止）',
      targetName: '氣孔 (夜間閉合)',
      organX: geo.stomaX,
      organY: geo.stomaY
    },
    {
      step: 8,
      title: '夜間葉綠體澱粉水解為蔗糖，韌皮部接續運送（確保 24 小時晝夜穩定供能）',
      targetName: '韌皮部夜間接續轉運',
      organX: geo.phloemStemX + 45,
      organY: geo.soilY + 30
    }
  ];

  function updateSubtitleButtons() {
    if (subtitleOnBtn) {
      subtitleOnBtn.classList.toggle('active', state.showSubtitles);
    }
    if (subtitleOffBtn) {
      subtitleOffBtn.classList.toggle('active', !state.showSubtitles);
    }
  }

  function updateInsetButtons() {
    if (insetOnBtn) {
      insetOnBtn.classList.toggle('active', state.showMicroscopicInset);
    }
    if (insetOffBtn) {
      insetOffBtn.classList.toggle('active', !state.showMicroscopicInset);
    }
  }

  function updateModeButtons() {
    if (modeParallelBtn) {
      modeParallelBtn.classList.toggle('active', state.runMode === 'parallel');
    }
    if (modeAutoBtn) {
      modeAutoBtn.classList.toggle('active', state.runMode === 'auto');
    }
    if (modeManualBtn) {
      modeManualBtn.classList.toggle('active', state.runMode === 'manual');
    }
  }

  function updateLightButtons() {
    if (lightDayBtn) {
      lightDayBtn.classList.toggle('active', state.isDay);
    }
    if (lightNightBtn) {
      lightNightBtn.classList.toggle('active', !state.isDay);
    }
  }

  function updateLoopStatusUI(stepNote) {
    if (!loopIndicator || !loopBadgeText) return;

    if (state.isTranspirationMode) {
      loopIndicator.className = 'loop-badge transpiration-active';
      loopBadgeText.textContent = '蒸散作用中';
      return;
    }

    if (state.runMode === 'parallel') {
      loopIndicator.className = 'loop-badge active parallel';
      loopBadgeText.textContent = state.isDay ? '同步進行中' : '夜間接續轉運中';
    } else if (state.runMode === 'auto') {
      loopIndicator.className = 'loop-badge active';
      loopBadgeText.textContent = state.isDay ? '自動分步中 (日間)' : '自動分步中 (夜間)';
    } else {
      loopIndicator.className = 'loop-badge step-mode';
      loopBadgeText.textContent = state.isDay ? '手動單步 (日間)' : '手動單步 (夜間)';
    }
  }

  // 運行模式切換 (真實生理 vs 自動分步 vs 手動單步)
  function setRunMode(mode) {
    if (state.isTranspirationMode) {
      setTranspirationMode(false);
    }
    clearAllTimers();
    state.loopNextTimerId = null;

    state.runMode = mode;
    state.isParallelMode = (mode === 'parallel');
    state.isAutoMode = (mode === 'auto');
    state.isStepMode = (mode === 'manual');

    updateModeButtons();

    if (mode === 'parallel') {
      // 進入真實生理全反應模式：日間所有反應同時並行
      state.isPlaying = true;
      state.currentStep = 0;
      setDayNightMode(true, true);
      state.stomaOpen = true;
      state.stomaAperture = 1.0;
      highlightAllDaytimeEquations();
      updateLoopStatusUI();
    } else if (mode === 'auto') {
      // 進入自動分步循環：由步驟 1 到步驟 8 逐步推進
      state.isPlaying = true;
      resetEquationHighlights();
      setDayNightMode(true, true);
      executeStep(1, true);
    } else {
      // 手動單步：由使用者自主點擊下一步推進
      state.isPlaying = false;
      resetEquationHighlights();
      updateLoopStatusUI();
    }
  }

  // 蒸散作用模式切換 (單獨聚焦水分運輸：從根進入、木質部上升、氣孔蒸散逸散與少部分進入葉肉細胞)
  function toggleTranspirationMode() {
    setTranspirationMode(!state.isTranspirationMode);
  }

  function setTranspirationMode(active) {
    state.isTranspirationMode = active;

    if (active) {
      clearAllTimers();
      state.loopNextTimerId = null;
      state.isPlaying = false;
      state.isAutoMode = false;
      updateModeButtons();

      // 確保日間照光與氣孔完全張開
      setDayNightMode(true, true);
      state.stomaOpen = true;
      state.stomaAperture = 1.0;

      // 清空其它干擾粒子，聚焦呈現水分
      state.co2Particles = [];
      state.o2Bubbles = [];
      state.glucoseParticles = [];
      state.dehydrationParticles = [];
      state.transports = [];
      state.vaporParticles = [];

      // 顯微鏡頭切換至氣孔保衛細胞以觀察水分子散失
      setInsetMode('guardCell', true);

      // 上方化學式高亮 H2O
      resetEquationHighlights();
      if (eqH2O) eqH2O.classList.add('active-h2o');

      if (transpirationBtn) {
        transpirationBtn.classList.add('active');
        transpirationBtn.textContent = '結束蒸散展示 (返回光合循環)';
      }
      if (transpirationInfoBox) {
        transpirationInfoBox.style.display = 'flex';
      }
      updateLoopStatusUI('【蒸散作用展示中】氣孔全開：約 99% 水分自氣孔蒸散產生拉力，約 1% 進入葉肉供光合作用');
    } else {
      if (transpirationBtn) {
        transpirationBtn.classList.remove('active');
        transpirationBtn.textContent = '蒸散作用展示';
      }
      if (transpirationInfoBox) {
        transpirationInfoBox.style.display = 'none';
      }
      resetEquationHighlights();
      state.isAutoMode = true;
      updateModeButtons();
      updateLoopStatusUI();

      scheduleTimer(() => {
        playPhotosynthesisDemo();
      }, 350);
    }
  }

  // =========================================================================
  // 核心動態演示控制 (8 個獨立生理階段單步演示與自動循環)
  // =========================================================================

  function executeStep(stepNum, fromAutoLoop = false) {
    state.currentStep = stepNum;
    state.isPlaying = true;
    if (!fromAutoLoop) {
      state.isStepMode = true;
      state.isAutoMode = false;
      updateModeButtons();
    }

    switch (stepNum) {
      case 1: {
        // 階段 1：晨光照耀，保衛細胞吸水膨脹，氣孔張開
        if (!state.isDay) {
          setDayNightMode(true, true);
        }
        state.stomaOpen = true;
        setInsetMode('guardCell');
        resetEquationHighlights();


        updateLoopStatusUI('晨光照耀，保衛細胞吸水膨脹，氣孔完全張開');

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(2, true);
          }, 1700);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 2: {
        // 階段 2：大氣 CO2 經氣孔擴散進入葉片氣室
        if (!state.isDay) setDayNightMode(true, true);
        state.stomaOpen = true;
        resetEquationHighlights();
        eqCO2.classList.add('active-co2');

        for (let i = 0; i < 12; i++) {
          scheduleTimer(() => {
            state.co2Particles.push({
              x: 270 + Math.random() * 220,
              y: 65 + Math.random() * 120,
              targetX: geo.stomaX + (Math.random() - 0.5) * 15,
              targetY: geo.stomaY + (Math.random() - 0.5) * 10,
              progress: 0,
              speed: 0.016 + Math.random() * 0.008,
              size: 8
            });
          }, i * 60);
        }

        updateLoopStatusUI('大氣 CO₂ 經由張開的氣孔擴散進入葉片氣室');

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(3, true);
          }, 1700);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 3: {
        // 階段 3：根部吸收 H2O 沿木質部導管上升至葉脈
        if (!state.isDay) setDayNightMode(true, true);
        eqH2O.classList.add('active-h2o');

        for (let i = 0; i < 10; i++) {
          scheduleTimer(() => {
            const rootStartX = 500 + Math.random() * 160;
            const rootStartY = geo.soilY + 50 + Math.random() * 120;
            state.h2oParticles.push({
              waypoints: [
                { x: rootStartX, y: rootStartY },
                { x: geo.xylemStemX, y: geo.soilY + 20 },
                { x: geo.xylemStemX, y: geo.leafCenterY },
                { x: geo.chloroplastX, y: geo.chloroplastY }
              ],
              segment: 0,
              segProgress: 0,
              speed: 0.026 + Math.random() * 0.038,
              size: 8
            });
          }, i * 55);
        }

        updateLoopStatusUI('根部吸收 H₂O，經木質部導管逆重力向上輸送至葉脈');

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(4, true);
          }, 1800);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 4: {
        // 階段 4：葉綠體光反應吸收光能裂解水，釋出 O2 經氣孔逸散，生成水產物
        if (!state.isDay) setDayNightMode(true, true);
        if (eqLightArrow) eqLightArrow.classList.add('active-poly');
        eqO2.classList.add('active-o2');
        if (eqH2Oproduct) eqH2Oproduct.classList.add('active-h2o');
        state.chloroplastPulse = 1.0;

        for (let i = 0; i < 12; i++) {
          scheduleTimer(() => {
            state.o2Bubbles.push({
              x: geo.stomaX + (Math.random() - 0.5) * 15,
              y: geo.stomaY + (Math.random() - 0.5) * 10,
              vx: -(1.2 + Math.random() * 1.5),
              vy: -(1.6 + Math.random() * 1.8),
              alpha: 1,
              size: 9 + Math.random() * 4
            });
          }, i * 75);
        }


        updateLoopStatusUI('葉綠體光反應吸收光能裂解水，釋出 O₂ 經氣孔排出');

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(5, true);
          }, 1800);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 5: {
        // 階段 5：碳反應固定 CO2 生成醣類，部分即時轉化為蔗糖經韌皮部裝載 (Phloem loading) 立即外運
        if (!state.isDay) setDayNightMode(true, true);
        eqGlucose.classList.add('active-glucose');
        state.chloroplastPulse = 1.0;

        state.glucoseParticles = [];
        const offsets = [
          { dx: 14, dy: -12 },
          { dx: 32, dy: -20 },
          { dx: 50, dy: -10 },
          { dx: 16, dy: 16 },
          { dx: 50, dy: 16 },
          { dx: 32, dy: 4 }
        ];
        for (let i = 0; i < offsets.length; i++) {
          scheduleTimer(() => {
            const off = offsets[i];
            state.glucoseParticles.push({
              id: i,
              x: geo.chloroplastX + 32 + (off.dx - 32) * 0.25,
              y: geo.chloroplastY + 12 + (off.dy - 12) * 0.25,
              targetX: geo.chloroplastX + off.dx,
              targetY: geo.chloroplastY + off.dy,
              size: 15,
              scale: 0.1,
              alpha: 1.0,
              angle: (i * Math.PI) / 3
            });
          }, i * 140);
        }

        // 白天即時蔗糖運輸 (Phloem Loading)：大量固定的碳即時轉化為蔗糖送往庫器官
        scheduleTimer(() => {
          dispatchDaytimeTranslocation(1, fromAutoLoop);
        }, 400);

        const destName = {
          root: '地下塊根 (即時儲藏)',
          root_growth: '根系 (即時支持根尖生長與吸水)',
          flower: '花朵 (即時提供代謝與開花)',
          fruit: '果實 (即時積累果糖)',
          shoot: '頂芽 (即時支持分裂伸長)'
        }[state.fate] || '庫器官';

        updateLoopStatusUI(`【碳反應與即時運送】固定 CO₂ 合成醣類，部分即時轉化為蔗糖經韌皮部裝載運往${destName}！(韌皮部 24h 持續運送)`);

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(6, true);
          }, 2100);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 6: {
        // 階段 6：光合速率大於即時運輸負荷，多餘碳聚合為【暫時性澱粉】「蓄洪」暫存於葉綠體
        if (!state.isDay) setDayNightMode(true, true);
        if (eqPolyArrow) eqPolyArrow.classList.add('active-poly');
        if (eqStarch) eqStarch.classList.add('active-starch');
        state.chloroplastPulse = 1.0;

        state.isPolymerizing = true;
        state.polymerizationProgress = 0;

        for (let i = 0; i < 8; i++) {
          state.dehydrationParticles.push({
            x: geo.chloroplastX + 32 + (Math.random() - 0.5) * 36,
            y: geo.chloroplastY + 12 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.0 - Math.random() * 1.4,
            alpha: 1.0,
            size: 7
          });
        }

        scheduleTimer(() => {
          if (state.leafStarchCount < 5) {
            state.leafStarchCount++;
          }
          state.isPolymerizing = false;
          state.glucoseParticles = [];
          state.synthesisFlash = 1.0;
        }, 1500);

        const currentCountDisplay = Math.min(5, state.leafStarchCount + 1);
        const willReachAutoTarget = currentCountDisplay >= state.autoLoopTargetStarch;

        if (state.isAutoMode) {
          if (willReachAutoTarget) {
            updateLoopStatusUI(`【暫存澱粉蓄洪充足 (${currentCountDisplay}/${state.autoLoopTargetStarch} 顆)】日間過量碳已充分蓄存，即將進入夜間將養分水解接續供應庫器官！`);
          } else {
            updateLoopStatusUI(`【光合產量超出即時運輸負荷】多餘碳在葉綠體聚合為【暫時性澱粉】蓄洪（已累積：${currentCountDisplay}/${state.autoLoopTargetStarch} 顆，繼續日間光合固碳）`);
          }
        } else {
          if (currentCountDisplay >= 5) {
            updateLoopStatusUI('【暫存澱粉已達蓄洪上限 (5/5)】避免高滲透壓；日間光合產量大於外運負荷，夜間將水解接續供應！');
          } else {
            updateLoopStatusUI(`【光合產量超出即時運輸負荷】多餘碳在葉綠體聚合為【暫時性澱粉】「蓄洪」暫存（目前蓄存：${currentCountDisplay}/5 顆）`);
          }
        }

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) {
              if (state.leafStarchCount < state.autoLoopTargetStarch) {
                // 還沒達到 3 顆目標：日間持續光照，氣孔維持開放，循環回步驟 2 進行下一輪固碳合成！
                state.currentStep = 2;
                executeStep(2, true);
              } else {
                // 已累積達 3 顆：進入夜幕降臨 (步驟 7)
                executeStep(7, true);
              }
            }
          }, 2400);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 7: {
        // 階段 7：夜幕降臨失去光照，保衛細胞失水萎縮，氣孔完全閉合
        setDayNightMode(false, true);
        state.stomaOpen = false;
        setInsetMode('guardCell');
        resetEquationHighlights();

        updateLoopStatusUI('夜幕降臨失去光照，保衛細胞失水萎縮，氣孔完全閉合（光反應停止，即將由暫存澱粉水解接續供能）');

        if (fromAutoLoop && state.isAutoMode) {
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) executeStep(8, true);
          }, 1800);
        } else {
          state.isPlaying = false;
        }
        break;
      }

      case 8: {
        // 階段 8：葉綠體澱粉水解為蔗糖，經韌皮部篩管轉運至器官儲存 (確保 24h 穩定供能)
        if (state.isDay) setDayNightMode(false, true);

        // 如果在自動模式下且計數為 0，預設轉運 1 顆以供演示；手動模式下轉運所有累積的澱粉
        const totalToTransfer = Math.max(fromAutoLoop ? 1 : 0, state.leafStarchCount);
        state.chloroplastPulse = 0.8;

        if (totalToTransfer > 0) {
          const destName = {
            root: '地下塊根 (縮合儲存澱粉)',
            root_growth: '根系 (細胞壁合成與根尖伸長)',
            flower: '花朵 (維持夜間代謝與花蜜)',
            fruit: '果實 (持續積累果糖)',
            shoot: '頂芽 (夜間細胞壁合成伸長)'
          }[state.fate] || '目標器官';

          updateLoopStatusUI(`【夜間接續轉運】葉綠體暫存澱粉 (共 ${totalToTransfer} 顆) 已水解為蔗糖，正由韌皮部接續運送至${destName}，確保庫器官 24 小時晝夜穩定供能！`);

          scheduleTimer(() => {
            dispatchNightTranslocation(totalToTransfer, fromAutoLoop);
          }, 450);
        } else {
          updateLoopStatusUI('【夜間黑暗】葉綠體內無暫存澱粉可轉運，請切換至【日間光照】進行光合作用！');
          if (fromAutoLoop && state.isAutoMode) {
            state.loopNextTimerId = scheduleTimer(() => {
              if (state.isAutoMode) {
                state.loopCount++;
                setDayNightMode(true, true);
                executeStep(1, true);
              }
            }, 1800);
          } else {
            state.isPlaying = false;
          }
        }
        break;
      }
    }
  }

  // 單步演示 (下一步) 點擊事件
  function handleStepNext() {
    if (state.isTranspirationMode) {
      setTranspirationMode(false);
    }
    clearAllTimers();
    state.loopNextTimerId = null;

    // 手動點擊下一步時自動切換至手動單步模式
    if (state.runMode !== 'manual') {
      state.runMode = 'manual';
      state.isParallelMode = false;
      state.isAutoMode = false;
      state.isStepMode = true;
      resetEquationHighlights();
      updateModeButtons();
    }
    state.isStepMode = true;

    if (state.isDay) {
      // 日間模式下：步驟 1 ~ 6
      if (state.currentStep >= 6) {
        // 如果已經完成第 6 步（澱粉聚合）
        if (state.leafStarchCount < 5) {
          // 持續在日間光照時，持續累積澱粉！循環回 Step 2 開始下一輪合成
          state.currentStep = 2;
          executeStep(2, false);
          updateLoopStatusUI(`日間持續光照：進行下一輪固碳合成！目前葉綠體暫存澱粉已累積：${state.leafStarchCount}/5 顆`);
          return;
        } else {
          // 已達飽和上限 (5 顆)！
          state.currentStep = 6;

          updateLoopStatusUI('【暫存澱粉已達飽和上限 (5/5)】基質空間已滿（避免高滲透壓），請點擊【夜間黑暗】將所有養分轉運出葉片！');
          return;
        }
      } else {
        state.currentStep++;
        executeStep(state.currentStep, false);
      }
    } else {
      // 夜間模式下：步驟 7 ~ 8
      if (state.currentStep < 7) {
        state.currentStep = 7;
        executeStep(7, false);
      } else if (state.currentStep === 7) {
        state.currentStep = 8;
        executeStep(8, false);
      } else {
        // 已經在 Step 8 (轉運完成)
        updateLoopStatusUI('【夜間轉運已完成】所有澱粉已送達目標器官，可點擊【日間光照】開始新一天的光合作用！');
      }
    }
  }

  // 日間光合作用合成入口
  function playPhotosynthesisDemo() {
    executeStep(1, state.isAutoMode);
  }

  // 夜間轉運入口
  function playNightTranslocation() {
    executeStep(8, state.isAutoMode);
  }

  // 養分到達目標庫器官時的生化轉化特效 (抵達器官時由「蔗糖」轉化為「澱粉 / 花蜜 / 果糖 / 頂芽纖維素」)
  function triggerOrganConversion(kind, amount = 1, isDaytime = false) {
    const qtyStr = amount > 1 ? ` (+${amount})` : '';
    const prefix = isDaytime ? '日間即時蔗糖' : (kind.startsWith('root_to') ? '根部水解蔗糖' : '夜間水解蔗糖');
    let text = `${prefix} ➔ 澱粉儲藏${qtyStr} ✨`;
    let x = geo.rootTuberX;
    let y = geo.rootTuberY - 24;
    let color = '#fef08a';

    if (kind === 'flower' || kind === 'root_to_flower') {
      text = `${prefix} ➔ 花蜜與開花能量${qtyStr}`;
      x = geo.flowerX;
      y = geo.flowerY - 22;
      color = '#f472b6';
    } else if (kind === 'fruit' || kind === 'root_to_fruit') {
      text = `${prefix} ➔ 果糖積累與膨大${qtyStr}`;
      x = geo.fruitBranchX;
      y = geo.fruitBranchY - 22;
      color = '#f87171';
    } else if (kind === 'shoot' || kind === 'root_to_shoot') {
      text = `${prefix} ➔ 纖維素與頂芽生長${qtyStr}`;
      x = geo.shootX;
      const shootOffset = Math.min(state.shootEnergyCount * 9, 45);
      y = geo.shootY - shootOffset - 22;
      color = '#a3e635';
      state.shootGrowthPulse = 1.0; // 觸發頂芽活躍生長光環
    } else if (kind === 'root_growth' || kind === 'root_to_root_growth') {
      text = `${prefix} ➔ 根系生長與細胞伸長${qtyStr} 🌱`;
      x = geo.stemCenterX;
      const rootOffset = Math.min(state.rootGrowthCount * 5, 25);
      y = geo.rootTipY + rootOffset - 22;
      color = '#4ade80';
      state.rootGrowthPulse = 1.0; // 觸發根系活躍生長光環
    }

    state.conversions.push({
      text,
      x: x + (Math.random() - 0.5) * 24,
      y: y + (Math.random() - 0.5) * 12,
      vy: -0.9 - Math.random() * 0.4,
      alpha: 1.0,
      color
    });
  }

  // 當蔗糖運輸粒子抵達目標庫器官 (如地下塊根、花、果、頂芽) 的瞬間處理
  function handleParticleArrivedAtSink(t) {
    const batch = activeBatches.get(t.batchId);
    if (!batch) return;

    // 1. 第一顆蔗糖實體抵達庫器官瞬間：觸發生化轉化特效並增加器官儲備
    if (!batch.hasTriggeredConversion) {
      batch.hasTriggeredConversion = true;
      triggerOrganConversion(batch.kind, batch.amount, batch.isDaytime);

      if (batch.kind === 'root') {
        state.rootStarchCount += batch.amount;
        updateRemobilizeButtonStates();
      } else if (batch.kind === 'root_growth') {
        state.rootGrowthCount += batch.amount;
        state.rootGrowthPulse = 1.0;
      } else if (batch.kind === 'flower' || batch.kind === 'root_to_flower') {
        state.flowerEnergyCount += batch.amount;
      } else if (batch.kind === 'fruit' || batch.kind === 'root_to_fruit') {
        state.fruitSugarCount += batch.amount;
      } else if (batch.kind === 'shoot' || batch.kind === 'root_to_shoot') {
        state.shootEnergyCount += batch.amount;
      }
    }

    batch.particlesRemaining--;

    // 2. 當該批次所有蔗糖粒子全數完全送進庫器官後
    if (batch.particlesRemaining <= 0) {
      activeBatches.delete(t.batchId);

      // 如果這是日間即時轉運批次
      if (batch.isDaytime) {
        const destName = {
          root: '地下塊根 (即時儲藏)',
          root_growth: '根系 (即時支持根尖生長與吸水)',
          flower: '花朵 (即時提供代謝與開花)',
          fruit: '果實 (即時積累果糖)',
          shoot: '頂芽 (即時支持頂端分裂生長)'
        }[batch.kind] || '庫器官';

        if (!batch.fromAutoLoop || !state.isAutoMode) {
          updateLoopStatusUI(`【日間即時轉運完成】蔗糖已送達${destName}！(韌皮部 24h 晝夜持續運送)`);
        }
      }
      // 如果這是夜間轉運批次 (非根部再動員)
      else if (batch.kind === 'root' || batch.kind === 'root_growth' || batch.kind === 'flower' || batch.kind === 'fruit' || batch.kind === 'shoot') {
        const destName = {
          root: '地下塊根 (縮合儲存澱粉)',
          root_growth: '根系 (細胞壁合成與根尖伸長)',
          flower: '花朵 (轉化花蜜與維持代謝)',
          fruit: '果實 (轉化果糖與果實膨大)',
          shoot: '頂芽 (細胞壁合成促進生長)'
        }[batch.kind] || '庫器官';

        if (state.runMode === 'parallel') {
          updateLoopStatusUI(`【夜間接續轉運完成】暫存澱粉已水解送入${destName}！即將迎接清晨日照，展開新一輪同步生理反應...`);
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.runMode === 'parallel') {
              state.loopCount++;
              setDayNightMode(true, true);
              highlightAllDaytimeEquations();
              updateLoopStatusUI();
            }
          }, 1500);
        } else if (batch.fromAutoLoop && state.isAutoMode) {
          // 蔗糖完全送進庫之後，停留適當觀察時間 (1.4s) 再迎接清晨日照
          updateLoopStatusUI(`【夜間接續轉運完成】暫存澱粉已水解送入${destName}！韌皮部 24 小時晝夜持續運送，即將迎接清晨日照...`);
          state.loopNextTimerId = scheduleTimer(() => {
            if (state.isAutoMode) {
              state.loopCount++;
              setDayNightMode(true, true);
              executeStep(1, true);
            }
          }, 1400);
        } else {
          state.isPlaying = false;
          updateLoopStatusUI(`【夜間接續轉運完成】暫存澱粉已全數送入${destName}！(韌皮部 24h 晝夜持續運送)`);
        }
      } else if (batch.kind === 'root_to_shoot') {
        updateLoopStatusUI(`【根部再動員完成】儲藏澱粉已水解為蔗糖，全數送達頂芽，促進新葉與節間伸長！(頂芽累計: x${state.shootEnergyCount})`);
      } else if (batch.kind === 'root_to_flower') {
        updateLoopStatusUI(`【根部再動員完成】儲藏澱粉已水解為蔗糖，全數送達花朵轉化為花蜜！(花朵累計: x${state.flowerEnergyCount})`);
      } else if (batch.kind === 'root_to_fruit') {
        updateLoopStatusUI(`【根部再動員完成】儲藏澱粉已水解為蔗糖，全數送達果實轉化為果糖並膨大！(果實累計: x${state.fruitSugarCount})`);
      }
    }
  }

  // 確保在日照開始之前，若尚有在途運輸粒子，平滑入庫結算
  function settleAllInflightTransports() {
    activeBatches.forEach(batch => {
      if (!batch.hasTriggeredConversion) {
        batch.hasTriggeredConversion = true;
        triggerOrganConversion(batch.kind, batch.amount, batch.isDaytime);
        if (batch.kind === 'root') {
          state.rootStarchCount += batch.amount;
          updateRemobilizeButtonStates();
        } else if (batch.kind === 'root_growth') {
          state.rootGrowthCount += batch.amount;
          state.rootGrowthPulse = 1.0;
        } else if (batch.kind === 'flower' || batch.kind === 'root_to_flower') {
          state.flowerEnergyCount += batch.amount;
        } else if (batch.kind === 'fruit' || batch.kind === 'root_to_fruit') {
          state.fruitSugarCount += batch.amount;
        } else if (batch.kind === 'shoot' || batch.kind === 'root_to_shoot') {
          state.shootEnergyCount += batch.amount;
        }
      }
    });
    activeBatches.clear();
    state.transports = [];
  }

  // 統一韌皮部長途運輸調度 (支援日間即時轉運與夜間接續轉運)
  function dispatchPhloemTranslocation({ target = state.fate, amount = 1, isDaytime = false, fromAutoLoop = false, decreaseStarch = false }) {
    let targetWaypoints = [];

    const baseWaypoints = [
      { x: geo.chloroplastX + 32, y: geo.chloroplastY + 12 },
      { x: geo.chloroplastX + 70, y: geo.chloroplastY + 14 },
      { x: geo.leafBaseX, y: geo.leafCenterY + 6 },
      { x: geo.phloemStemX, y: geo.leafCenterY }
    ];

    if (target === 'root') {
      targetWaypoints = [
        ...baseWaypoints,
        { x: geo.phloemStemX, y: geo.soilY + 20 },
        { x: geo.rootTuberX, y: geo.rootTuberY }
      ];
    } else if (target === 'root_growth') {
      const rootExtend = Math.min(state.rootGrowthCount * 5, 30);
      const mainApexY = geo.h - 30 + rootExtend;
      targetWaypoints = [
        ...baseWaypoints,
        { x: geo.phloemStemX, y: geo.soilY },
        { x: geo.stemCenterX, y: geo.soilY },
        { x: geo.stemCenterX - 6, y: geo.soilY + 60 },
        { x: geo.stemCenterX + 6, y: geo.soilY + 110 },
        { x: geo.stemCenterX, y: mainApexY }
      ];
    } else if (target === 'flower') {
      targetWaypoints = [
        ...baseWaypoints,
        { x: geo.phloemStemX, y: geo.stemTopY + 25 },
        { x: (geo.phloemStemX + geo.flowerX) / 2 + 15, y: geo.flowerY + 30 },
        { x: geo.flowerX, y: geo.flowerY }
      ];
    } else if (target === 'fruit') {
      targetWaypoints = [
        ...baseWaypoints,
        { x: geo.phloemStemX, y: geo.fruitBranchY },
        { x: geo.fruitBranchX, y: geo.fruitBranchY }
      ];
    } else if (target === 'shoot') {
      const shootApexY = geo.shootY - Math.min(state.shootEnergyCount * 9, 45);
      targetWaypoints = [
        ...baseWaypoints,
        { x: geo.phloemStemX, y: geo.stemTopY + 20 },
        { x: geo.shootX + 4, y: shootApexY + 12 },
        { x: geo.shootX, y: shootApexY }
      ];
    }

    const batchId = ++batchCounter;
    const particleCount = decreaseStarch ? Math.min(6, 2 + amount) : 3;

    // 若需要從暫存澱粉水解扣除 (夜間模式)
    if (decreaseStarch) {
      for (let k = 0; k < amount; k++) {
        scheduleTimer(() => {
          if (state.leafStarchCount > 0) state.leafStarchCount--;
        }, k * 350 + 100); // 隨蔗糖粒子出發節奏逐漸水解減少
      }
    }

    activeBatches.set(batchId, {
      batchId,
      kind: target,
      isDaytime,
      amount,
      fromAutoLoop,
      hasTriggeredConversion: false,
      particlesRemaining: particleCount
    });

    for (let i = 0; i < particleCount; i++) {
      scheduleTimer(() => {
        state.transports.push({
          batchId,
          kind: target,
          isDaytime,
          waypoints: targetWaypoints,
          segment: 0,
          segProgress: 0,
          speed: 0.025 + Math.random() * 0.025,
          reached: false
        });
      }, i * 50);
    }
  }

  // 日間即時轉運：碳反應生成醣類在細胞質轉化為蔗糖，經韌皮部裝載立即外運 (24h 持續運輸)
  function dispatchDaytimeTranslocation(amount = 1, fromAutoLoop = false) {
    dispatchPhloemTranslocation({
      target: state.fate,
      amount,
      isDaytime: true,
      fromAutoLoop,
      decreaseStarch: false
    });
  }

  // 夜間接續轉運：水解葉綠體暫存澱粉為蔗糖，沿韌皮部接續運送 (確保夜間能量穩定供應)
  function dispatchNightTranslocation(amount = 1, fromAutoLoop = false) {
    dispatchPhloemTranslocation({
      target: state.fate,
      amount,
      isDaytime: false,
      fromAutoLoop,
      decreaseStarch: true
    });
  }

  // 根部儲存養分再動員：將澱粉水解為蔗糖，沿韌皮部向上轉運至花、果或頂芽
  function remobilizeRootNutrient(target) {
    // 嚴格檢驗：若根部沒有儲備養分 (rootStarchCount <= 0)，絕對不可向上運送！
    if (state.rootStarchCount <= 0) {
      state.rootEmptyAlertPulse = 1.0;
      updateRemobilizeButtonStates();
      return; // 立即中止，不產生任何運輸粒子
    }

    state.rootStarchCount--;
    updateRemobilizeButtonStates();

    if (target === 'shoot') {
      updateLoopStatusUI(`【根部養分再動員】根部儲備澱粉 (剩餘 x${state.rootStarchCount}) 水解為蔗糖，正沿韌皮部上運至頂芽促進生長...`);
    } else if (target === 'flower') {
      updateLoopStatusUI(`【根部養分再動員】根部儲備澱粉 (剩餘 x${state.rootStarchCount}) 水解為蔗糖，正沿韌皮部上運至花朵轉化為花蜜...`);
    } else if (target === 'fruit') {
      updateLoopStatusUI(`【根部養分再動員】根部儲備澱粉 (剩餘 x${state.rootStarchCount}) 水解為蔗糖，正沿韌皮部上運至果實轉化為果糖...`);
    }

    const batchId = ++batchCounter;
    const particleCount = 3;
    let waypoints = [];

    if (target === 'flower') {
      waypoints = [
        { x: geo.rootTuberX, y: geo.rootTuberY },
        { x: geo.phloemStemX, y: geo.soilY + 20 },
        { x: geo.phloemStemX, y: geo.stemTopY + 25 },
        { x: (geo.phloemStemX + geo.flowerX) / 2 + 15, y: geo.flowerY + 30 },
        { x: geo.flowerX, y: geo.flowerY }
      ];
    } else if (target === 'fruit') {
      waypoints = [
        { x: geo.rootTuberX, y: geo.rootTuberY },
        { x: geo.phloemStemX, y: geo.soilY + 20 },
        { x: geo.phloemStemX, y: geo.fruitBranchY },
        { x: geo.fruitBranchX, y: geo.fruitBranchY }
      ];
    } else if (target === 'shoot') {
      const shootApexY = geo.shootY - Math.min(state.shootEnergyCount * 9, 45);
      waypoints = [
        { x: geo.rootTuberX, y: geo.rootTuberY },
        { x: geo.phloemStemX, y: geo.soilY + 20 },
        { x: geo.phloemStemX, y: geo.stemTopY + 20 },
        { x: geo.shootX + 4, y: shootApexY + 12 },
        { x: geo.shootX, y: shootApexY }
      ];
    }

    const batchKind = target === 'flower' ? 'root_to_flower' : (target === 'fruit' ? 'root_to_fruit' : 'root_to_shoot');

    activeBatches.set(batchId, {
      batchId,
      kind: batchKind,
      amount: 1,
      fromAutoLoop: false,
      hasTriggeredConversion: false,
      particlesRemaining: particleCount
    });

    for (let i = 0; i < particleCount; i++) {
      scheduleTimer(() => {
        state.transports.push({
          batchId,
          kind: batchKind,
          waypoints: waypoints,
          segment: 0,
          segProgress: 0,
          speed: 0.035 + Math.random() * 0.005,
          reached: false
        });
      }, i * 60);
    }
  }

  // 光照與夜間黑暗模式切換 (黑暗時氣孔關閉，手動或自動轉運所有澱粉)
  function setDayNightMode(isDay, fromStep = false) {
    if (!fromStep) {
      clearAllTimers();
      state.loopNextTimerId = null;
      if (state.runMode !== 'parallel') {
        state.isPlaying = false;
      }
    }
    state.isDay = isDay;
    state.stomaOpen = isDay; // 照光氣孔開放；黑暗中氣孔自動閉合
    updateLightButtons();

    if (isDay) {
      // 若有夜間在途蔗糖，平滑結算入庫
      if (activeBatches.size > 0 || state.transports.length > 0) {
        settleAllInflightTransports();
      }

      if (state.runMode === 'parallel') {
        highlightAllDaytimeEquations();
        state.stomaOpen = true;
        state.stomaAperture = 1.0;
        updateLoopStatusUI('【同步進行中】日間光照：氣孔進碳、光解產氧、木質部蒸散流、即時蔗糖外運與澱粉蓄洪同時進行');
      } else if (!fromStep) {
        if (state.isAutoMode) {
          scheduleTimer(() => {
            executeStep(1, true);
          }, 350);
        } else {
          state.currentStep = 1;
          updateLoopStatusUI('日間照光中（氣孔張開，光合作用進行；部分蔗糖即時外運，多餘碳蓄存為暫時性澱粉）');
        }
      }
    } else {
      // 進入夜晚：立刻關閉氣孔並全面停止蒸散作用！
      state.stomaOpen = false;
      state.stomaAperture = 0; // 氣孔立即閉合
      state.vaporParticles = []; // 立即清空蒸散水氣
      state.h2oParticles = []; // 立即清空木質部水分子流
      if (state.isTranspirationMode) {
        setTranspirationMode(false);
      }

      if (state.runMode === 'parallel') {
        resetEquationHighlights();
        // 清理日間浮游粒子
        state.co2Particles = [];
        state.o2Bubbles = [];
        state.glucoseParticles = [];
        state.dehydrationParticles = [];
        // 水解葉片中的暫存澱粉並派送往目標庫器官
        if (state.leafStarchCount > 0) {
          updateLoopStatusUI(`【夜間接續轉運中】氣孔閉合、蒸散停止。葉綠體水解 ${state.leafStarchCount} 顆暫存澱粉為蔗糖，經由韌皮部持續運往庫器官...`);
          dispatchNightTranslocation(state.leafStarchCount, true);
        } else {
          updateLoopStatusUI('【夜間黑暗】氣孔閉合、蒸散停止。目前葉綠體無暫存澱粉，即將迎接清晨日照...');
          scheduleTimer(() => {
            if (state.runMode === 'parallel') {
              setDayNightMode(true, true);
            }
          }, 2000);
        }
      } else if (!fromStep) {
        if (state.isAutoMode) {
          scheduleTimer(() => {
            executeStep(7, true);
          }, 350);
        } else {
          // 手動模式切換至黑暗模式：氣孔閉合，並將目前葉綠體暫存澱粉全數水解接續送出！
          state.currentStep = 7;
          executeStep(7, false);
          if (state.leafStarchCount > 0) {
            scheduleTimer(() => {
              executeStep(8, false);
            }, 1200);
          } else {
            updateLoopStatusUI('【夜間黑暗】氣孔閉合、蒸散停止。目前葉綠體無暫存澱粉，可切換回【日間光照】進行合成！');
          }
        }
      }
    }
    if (!fromStep && state.runMode !== 'parallel') {
      updateLoopStatusUI();
    }
  }

  function toggleDayNight() {
    setDayNightMode(!state.isDay);
  }

  // 重置演示
  function resetDemo() {
    clearAllTimers();
    activeBatches.clear();
    state.loopNextTimerId = null;
    state.isPlaying = false;
    state.isStepMode = false;
    state.currentStep = 0;
    state.isTranspirationMode = false;
    state.co2Particles = [];
    state.h2oParticles = [];
    state.vaporParticles = [];
    state.o2Bubbles = [];
    state.glucoseParticles = [];
    state.dehydrationParticles = [];
    state.isPolymerizing = false;
    state.polymerizationProgress = 0;
    state.synthesisFlash = 0;
    state.transports = [];
    state.chloroplastPulse = 0;
    state.leafStarchCount = 0;
    state.rootStarchCount = 0;
    state.rootGrowthCount = 0;
    state.rootGrowthPulse = 0;
    state.flowerEnergyCount = 0;
    state.fruitSugarCount = 0;
    state.shootEnergyCount = 0;
    state.shootGrowthPulse = 0;
    state.conversions = [];
    state.rootEmptyAlertPulse = 0;
    state.loopCount = 1;

    resetEquationHighlights();

    if (transpirationBtn) {
      transpirationBtn.classList.remove('active');
      transpirationBtn.textContent = '蒸散作用展示';
    }
    if (transpirationInfoBox) {
      transpirationInfoBox.style.display = 'none';
    }

    state.isAutoMode = true;
    updateModeButtons();
    setDayNightMode(true, true);


    updateRemobilizeButtonStates();
    updateLoopStatusUI();

    scheduleTimer(() => {
      executeStep(1, true);
    }, 400);
  }

  // 更新根部養分再動員按鈕的可用狀態
  function updateRemobilizeButtonStates() {
    if (!rootToFlowerBtn || !rootToFruitBtn || !rootToShootBtn) return;
    const hasStarch = state.rootStarchCount > 0;
    rootToFlowerBtn.classList.toggle('disabled', !hasStarch);
    rootToFruitBtn.classList.toggle('disabled', !hasStarch);
    rootToShootBtn.classList.toggle('disabled', !hasStarch);
    
    // 同步原生的 disabled 屬性，確保在無澱粉時無法觸發點擊事件
    rootToFlowerBtn.disabled = !hasStarch;
    rootToFruitBtn.disabled = !hasStarch;
    rootToShootBtn.disabled = !hasStarch;

    const flowerSmall = rootToFlowerBtn.querySelector('small');
    const fruitSmall = rootToFruitBtn.querySelector('small');
    const shootSmall = rootToShootBtn.querySelector('small');

    if (hasStarch) {
      if (flowerSmall) flowerSmall.textContent = `水解為蔗糖上行 (根部儲備: x${state.rootStarchCount})`;
      if (fruitSmall) fruitSmall.textContent = `水解為蔗糖上行 (根部儲備: x${state.rootStarchCount})`;
      if (shootSmall) shootSmall.textContent = `水解為蔗糖上行 (根部儲備: x${state.rootStarchCount})`;
    } else {
      if (flowerSmall) flowerSmall.textContent = `根部無儲備澱粉 (需先經光合作用儲存)`;
      if (fruitSmall) fruitSmall.textContent = `根部無儲備澱粉 (需先經光合作用儲存)`;
      if (shootSmall) shootSmall.textContent = `根部無儲備澱粉 (需先經光合作用儲存)`;
    }
  }

  // =========================================================================
  // Canvas 渲染繪製核心
  // =========================================================================

  function render(now) {
    const dt = (now - state.lastTime) / 1000;
    state.lastTime = now;

    // 平滑插值氣孔開度
    const targetAperture = state.stomaOpen ? 1.0 : 0.0;
    state.stomaAperture += (targetAperture - state.stomaAperture) * 0.12;

    // 葉綠體受光激發脈動自然衰減
    if (state.chloroplastPulse > 0) {
      state.chloroplastPulse = Math.max(0, state.chloroplastPulse - 0.005);
    }

    // 頂芽活躍生長光環脈動衰減
    if (state.shootGrowthPulse > 0) {
      state.shootGrowthPulse = Math.max(0, state.shootGrowthPulse - 0.015);
    }

    // 根系活躍生長光環脈動衰減
    if (state.rootGrowthPulse > 0) {
      state.rootGrowthPulse = Math.max(0, state.rootGrowthPulse - 0.015);
    }

    // 蒸散作用模式下持續由根部生成水分子流 (僅在日間照光時進行；約 92% 蒸散，約 8% 進入葉肉供光合作用)
    if (state.isTranspirationMode && state.isDay) {
      if (now - state.lastTranspirationSpawn > 180) {
        state.lastTranspirationSpawn = now;
        const rootStartX = 500 + Math.random() * 160;
        const rootStartY = geo.soilY + 50 + Math.random() * 120;
        const isMesophyll = Math.random() < 0.08;

        if (isMesophyll) {
          state.h2oParticles.push({
            targetKind: 'mesophyll',
            waypoints: [
              { x: rootStartX, y: rootStartY },
              { x: geo.xylemStemX, y: geo.soilY + 20 },
              { x: geo.xylemStemX, y: geo.leafCenterY },
              { x: geo.leafBaseX, y: geo.leafCenterY - 4 },
              { x: geo.chloroplastX, y: geo.chloroplastY }
            ],
            segment: 0,
            segProgress: 0,
            speed: 0.026 + Math.random() * 0.008,
            size: 8
          });
        } else {
          state.h2oParticles.push({
            targetKind: 'transpiration',
            waypoints: [
              { x: rootStartX, y: rootStartY },
              { x: geo.xylemStemX, y: geo.soilY + 20 },
              { x: geo.xylemStemX, y: geo.leafCenterY },
              { x: geo.leafBaseX, y: geo.leafCenterY - 4 },
              { x: geo.stomaX + 16, y: geo.stomaY - 14 },
              { x: geo.stomaX, y: geo.stomaY }
            ],
            segment: 0,
            segProgress: 0,
            speed: 0.026 + Math.random() * 0.008,
            size: 8
          });
        }
      }
    }

    // 真實生理全反應並行模式 (日間光照時，所有步驟動畫同時進行)
    if (state.isParallelMode && !state.isTranspirationMode) {
      if (state.isDay) {
        // 1. CO2 經氣孔擴散進入 (起點與終點移動路徑與分步驟 Step 2 完全一致：自大氣擴散至氣孔)
        if (now - state.lastParallelCO2Spawn > 480) {
          state.lastParallelCO2Spawn = now;
          state.co2Particles.push({
            x: 270 + Math.random() * 220,
            y: 65 + Math.random() * 120,
            targetX: geo.stomaX + (Math.random() - 0.5) * 15,
            targetY: geo.stomaY + (Math.random() - 0.5) * 10,
            progress: 0,
            speed: 0.016 + Math.random() * 0.008,
            size: 8
          });
        }

        // 2. 根部吸收水分經由木質部上升流 (約 88% 蒸散產生拉力，約 12% 供葉肉光反應)
        if (now - state.lastParallelH2OSpawn > 280) {
          state.lastParallelH2OSpawn = now;
          const rootStartX = 510 + Math.random() * 140;
          const rootStartY = geo.soilY + 50 + Math.random() * 110;
          const isMesophyll = Math.random() < 0.12;

          if (isMesophyll) {
            state.h2oParticles.push({
              targetKind: 'mesophyll',
              waypoints: [
                { x: rootStartX, y: rootStartY },
                { x: geo.xylemStemX, y: geo.soilY + 20 },
                { x: geo.xylemStemX, y: geo.leafCenterY },
                { x: geo.leafBaseX, y: geo.leafCenterY - 4 },
                { x: geo.chloroplastX, y: geo.chloroplastY }
              ],
              segment: 0,
              segProgress: 0,
              speed: 0.024 + Math.random() * 0.008,
              size: 8
            });
          } else {
            state.h2oParticles.push({
              targetKind: 'transpiration',
              waypoints: [
                { x: rootStartX, y: rootStartY },
                { x: geo.xylemStemX, y: geo.soilY + 20 },
                { x: geo.xylemStemX, y: geo.leafCenterY },
                { x: geo.leafBaseX, y: geo.leafCenterY - 4 },
                { x: geo.stomaX + 16, y: geo.stomaY - 14 },
                { x: geo.stomaX, y: geo.stomaY }
              ],
              segment: 0,
              segProgress: 0,
              speed: 0.024 + Math.random() * 0.008,
              size: 8
            });
          }
        }

        // 3. 水光解產生氧氣釋放逸散 (起點與終點移動路徑與分步驟 Step 4 完全一致：自氣孔向外逸散至大氣)
        if (now - state.lastParallelO2Spawn > 550) {
          state.lastParallelO2Spawn = now;
          state.o2Bubbles.push({
            x: geo.stomaX + (Math.random() - 0.5) * 15,
            y: geo.stomaY + (Math.random() - 0.5) * 10,
            vx: -(1.2 + Math.random() * 1.5),
            vy: -(1.6 + Math.random() * 1.8),
            alpha: 1,
            size: 9 + Math.random() * 4
          });
        }

        // 4. 碳反應固定碳在細胞質即時合成蔗糖，經由韌皮部裝載即時外運 (約每 2200ms 一批)
        if (now - state.lastParallelPhloemSpawn > 2200) {
          state.lastParallelPhloemSpawn = now;
          dispatchDaytimeTranslocation(1, true);
        }

        // 5. 超過外運負荷的多餘碳，在葉綠體脫水縮合為暫時性澱粉蓄洪 (每隔約 4.5 秒蓄存一顆，目標 3 顆)
        if (now - state.lastParallelStarchSpawn > 4500) {
          state.lastParallelStarchSpawn = now;
          if (state.leafStarchCount < state.autoLoopTargetStarch) {
            state.leafStarchCount++;
            state.synthesisFlash = 0.8;
            state.chloroplastPulse = 0.8;
            // 脫水縮合釋放水滴
            for (let d = 0; d < 3; d++) {
              state.dehydrationParticles.push({
                x: geo.chloroplastX + (Math.random() - 0.5) * 15,
                y: geo.chloroplastY + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -(0.8 + Math.random() * 1.2),
                alpha: 1.0,
                size: 5 + Math.random() * 3
              });
            }

            if (state.leafStarchCount >= state.autoLoopTargetStarch) {
              updateLoopStatusUI(`【同步進行中】日間暫存澱粉已蓄積達 ${state.leafStarchCount} 顆！即將進入夜間黑暗接續轉運...`);
              scheduleTimer(() => {
                if (state.runMode === 'parallel' && state.isDay) {
                  setDayNightMode(false, true);
                }
              }, 2500);
            }
          }
        }
      }
    }

    ctx.clearRect(0, 0, geo.w, geo.h);

    // 1. 環境背景與太陽/月色
    drawBackground();

    // 2. 持續照射的太陽輻射光能光束 (照光時持續照射，黑暗時無光)
    drawContinuousSunlight(now);

    // 3. 地下土壤與根系
    drawRootsAndTuber();

    // 4. 莖幹與雙管道 (大字體標記木質部與韌皮部)
    drawStemAndPipes();

    // 5. 庫器官：頂端花朵 (Flower)
    drawFlower(geo.flowerX, geo.flowerY);

    // 6. 庫器官：側枝果實 (Fruit)
    drawFruit(geo.fruitBranchX, geo.fruitBranchY);

    // 6.5. 庫器官：頂端新芽 (Shoot)
    drawShoot(geo.shootX, geo.shootY);

    // 7. 光合作用源：葉片、葉脈、葉綠體與氣孔
    drawLeafAndStoma(now);

    // 8. 保衛細胞與葉綠體澱粉合成顯微特寫視窗 (雙模式可切換)
    if (state.showMicroscopicInset) {
      drawMicroscopicInset(now);
    }

    // 9. 所有動態粒子
    drawAllParticles();

    // 10. 生理步驟即時解說字幕 (出現在 geo 畫布位置，可 toggle 顯示或隱藏)
    drawStepSubtitleBar(now);

    requestAnimationFrame(render);
  }

  // 背景繪製 (隨照光/黑暗環境切換)
  function drawBackground() {
    // 天空背景
    const sky = ctx.createLinearGradient(0, 0, 0, geo.soilY);
    if (state.isDay) {
      sky.addColorStop(0, '#03100a');
      sky.addColorStop(0.7, '#071f14');
      sky.addColorStop(1, '#0c281a');
    } else {
      sky.addColorStop(0, '#020617');
      sky.addColorStop(0.7, '#061426');
      sky.addColorStop(1, '#091c1c');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, geo.w, geo.soilY);

    if (state.isDay) {
      // 照光環境：太陽與光芒
      const sunGrad = ctx.createRadialGradient(geo.sunX, geo.sunY, 20, geo.sunX, geo.sunY, 190);
      sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      sunGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.45)');
      sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(geo.sunX, geo.sunY, 190, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(geo.sunX, geo.sunY, 38, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // 黑暗環境：夜空無光
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(geo.sunX, geo.sunY, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#061426';
      ctx.beginPath();
      ctx.arc(geo.sunX + 10, geo.sunY - 5, 24, 0, Math.PI * 2);
      ctx.fill();

      drawBigLabel('黑暗環境', geo.sunX - 65, geo.sunY + 62, '#94a3b8', 18);
    }

    // 土壤
    const soil = ctx.createLinearGradient(0, geo.soilY, 0, geo.h);
    soil.addColorStop(0, '#26140b');
    soil.addColorStop(0.5, '#180d06');
    soil.addColorStop(1, '#0a0502');
    ctx.fillStyle = soil;
    ctx.fillRect(0, geo.soilY, geo.w, geo.h - geo.soilY);

    // 草地邊界線
    ctx.strokeStyle = state.isDay ? '#22c55e' : '#15803d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, geo.soilY);
    ctx.lineTo(geo.w, geo.soilY);
    ctx.stroke();

    drawBigLabel('土壤層', 40, geo.soilY + 36, '#e2e8f0', 18);
    
  }

  // 持續照射的太陽光束 (黑暗中停止光照)
  function drawContinuousSunlight(now) {
    if (!state.isDay) return; // 黑暗環境中停止光束照射

    ctx.save();

    // 太陽核心大日冕脈動
    const pulse = 1.0 + Math.sin(now * 0.0018) * 0.05 + state.chloroplastPulse * 0.12;
    const coronaGrad = ctx.createRadialGradient(geo.sunX, geo.sunY, 30, geo.sunX, geo.sunY, 260 * pulse);
    coronaGrad.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
    coronaGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.2)');
    coronaGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.07)');
    coronaGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(geo.sunX, geo.sunY, 260 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 寬廣覆蓋、持續籠罩葉片與全株的自然太陽光束 (Volumetric Sunlight Beams)
    const beams = [
      { angleOffset: -0.28, widthAngle: 0.10, speed: 0.0012, baseAlpha: 0.14 },
      { angleOffset: -0.15, widthAngle: 0.14, speed: 0.0018, baseAlpha: 0.20 },
      { angleOffset: -0.02, widthAngle: 0.16, speed: 0.0014, baseAlpha: 0.24 },
      { angleOffset: 0.12, widthAngle: 0.13, speed: 0.0022, baseAlpha: 0.18 },
      { angleOffset: 0.26, widthAngle: 0.10, speed: 0.0015, baseAlpha: 0.13 }
    ];

    const targetX = geo.chloroplastX + 40;
    const targetY = geo.leafCenterY;
    const mainAngle = Math.atan2(targetY - geo.sunY, targetX - geo.sunX);
    const beamLength = 1150;

    beams.forEach((b, idx) => {
      const curAngle = mainAngle + b.angleOffset + Math.sin(now * b.speed + idx) * 0.035;
      const alpha = b.baseAlpha + Math.sin(now * b.speed * 1.6 + idx * 2) * 0.04 + state.chloroplastPulse * 0.14;

      const beamGrad = ctx.createLinearGradient(
        geo.sunX, geo.sunY,
        geo.sunX + Math.cos(curAngle) * beamLength,
        geo.sunY + Math.sin(curAngle) * beamLength
      );
      beamGrad.addColorStop(0, `rgba(254, 240, 138, ${Math.min(alpha * 1.8, 0.65)})`);
      beamGrad.addColorStop(0.3, `rgba(253, 224, 71, ${Math.min(alpha * 1.2, 0.45)})`);
      beamGrad.addColorStop(0.7, `rgba(251, 191, 36, ${Math.min(alpha * 0.6, 0.2)})`);
      beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(geo.sunX, geo.sunY);
      const halfA = b.widthAngle / 2;
      ctx.lineTo(geo.sunX + Math.cos(curAngle - halfA) * beamLength, geo.sunY + Math.sin(curAngle - halfA) * beamLength);
      ctx.lineTo(geo.sunX + Math.cos(curAngle + halfA) * beamLength, geo.sunY + Math.sin(curAngle + halfA) * beamLength);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  // 繪製維管束與生理構造專屬大字高對比標籤 (含指示虛線與端點，位置獨立不重疊，由字幕按鈕統一管理)
  function drawVascularLabel(title, sub, badgeCenterX, badgeTopY, targetX, targetY, themeColor, subColor, customW) {
    if (!state.showSubtitles) return;

    ctx.save();
    const w = customW || 126;
    const h = 50;
    const bx = badgeCenterX - w / 2;
    const by = badgeTopY;

    // 半透明高對比底框
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // 指引連線與指示點至導管或根毛
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const startX = badgeCenterX > targetX ? bx : bx + w;
    const startY = by + h / 2;
    ctx.moveTo(startX, startY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 標題大字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeColor;
    ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
    ctx.fillText(title, badgeCenterX, by + 17);

    // 副標說明文字
    ctx.fillStyle = subColor;
    ctx.font = (customW && customW >= 140) ? 'bold 12px "Noto Sans TC", sans-serif' : 'bold 13px "Noto Sans TC", sans-serif';
    ctx.fillText(sub, badgeCenterX, by + 37);

    ctx.restore();
  }

  // 繪製莖幹與雙管道 (大字體標記)
  function drawStemAndPipes() {
    const stemW = geo.stemWidth;
    const topY = geo.stemTopY;
    const btmY = geo.stemBottomY;

    // 莖外表皮
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.roundRect(geo.stemCenterX - stemW / 2, topY, stemW, btmY - topY, 8);
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ----------------------------------------------------
    // 木質部導管 (Xylem Vessel) - 水分向上
    // ----------------------------------------------------
    const xPipeX = geo.xylemStemX;
    const pipeWidth = 18;

    ctx.fillStyle = 'rgba(2, 132, 199, 0.55)';
    ctx.beginPath();
    ctx.roundRect(xPipeX - pipeWidth / 2, topY + 8, pipeWidth, btmY - topY - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 向量繪製木質部向上流動箭頭 (直接繪製向量箭頭，防止 iOS 轉為 Emoji 圖示)
    ctx.save();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let y = topY + 45; y < btmY - 30; y += 46) {
      // 垂直箭桿
      ctx.beginPath();
      ctx.moveTo(xPipeX, y + 6);
      ctx.lineTo(xPipeX, y - 5);
      ctx.stroke();
      // 向上箭頭
      ctx.beginPath();
      ctx.moveTo(xPipeX - 4.5, y - 1.5);
      ctx.lineTo(xPipeX, y - 7.5);
      ctx.lineTo(xPipeX + 4.5, y - 1.5);
      ctx.stroke();
    }
    ctx.restore();

    // ----------------------------------------------------
    // 韌皮部篩管 (Phloem Sieve Tube) - 養分分流向下/向上
    // ----------------------------------------------------
    const pPipeX = geo.phloemStemX;

    ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
    ctx.beginPath();
    ctx.roundRect(pPipeX - pipeWidth / 2, topY + 8, pipeWidth, btmY - topY - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 向量繪製韌皮部雙向流動箭頭 (直接繪製上下雙向向量箭頭，防止 iOS 將 ↕ 轉為 Emoji 圖示)
    ctx.save();
    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let y = topY + 45; y < btmY - 30; y += 46) {
      // 垂直箭桿
      ctx.beginPath();
      ctx.moveTo(pPipeX, y - 5.5);
      ctx.lineTo(pPipeX, y + 5.5);
      ctx.stroke();
      // 上方箭頭
      ctx.beginPath();
      ctx.moveTo(pPipeX - 4.5, y - 2);
      ctx.lineTo(pPipeX, y - 7.5);
      ctx.lineTo(pPipeX + 4.5, y - 2);
      ctx.stroke();
      // 下方箭頭
      ctx.beginPath();
      ctx.moveTo(pPipeX - 4.5, y + 2);
      ctx.lineTo(pPipeX, y + 7.5);
      ctx.lineTo(pPipeX + 4.5, y + 2);
      ctx.stroke();
    }
    ctx.restore();

    // ----------------------------------------------------
    // 木質部與韌皮部專屬大字高對比標籤 (由字幕按鈕管理)
    // ----------------------------------------------------
    if (state.showSubtitles) {
      drawVascularLabel('【木質部】', '水分單向上行 (蒸散流)', 545, topY + 16, xPipeX, topY + 32, '#38bdf8', '#7dd3fc');
      drawVascularLabel('【韌皮部】', '蔗糖雙向輸導 (晝夜24h)', 835, topY + 22, pPipeX, topY + 36, '#c084fc', '#e9d5ff');

      if (state.isTranspirationMode) {
        drawBigLabel('【蒸散拉力】水分由根部逆重力上升', geo.xylemStemX - 180, geo.soilY - 50, '#38bdf8', 14);
      }
    }
  }

  // 繪製庫器官 1：花朵 (Flower - 位於右上側枝，避開木質部韌皮部標籤)
  function drawFlower(fx, fy) {
    ctx.save();

    // 綠色花梗 (從莖幹頂部優雅伸展至花朵)
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(geo.stemCenterX, geo.stemTopY + 25);
    ctx.quadraticCurveTo(geo.stemCenterX + 60, fy + 45, fx - 12, fy + 16);
    ctx.stroke();

    // 綠色花梗細輪廓
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 花柄內的韌皮部管道 (養分輸入通道)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.phloemStemX, geo.stemTopY + 25);
    ctx.quadraticCurveTo(geo.phloemStemX + 55, fy + 45, fx, fy + 10);
    ctx.stroke();

    // 綠色花萼
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 18, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 片粉紅盛開花瓣
    const petalGlow = state.fate === 'flower' && state.flowerEnergyCount > 0;
    ctx.fillStyle = petalGlow ? '#f472b6' : '#ec4899';
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = fx + Math.cos(angle) * 20;
      const py = fy + Math.sin(angle) * 20;
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#be185d';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 金黃色花蕊中心 (雄蕊與雌蕊蜜腺)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(fx, fy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 花朵大字標籤 (20px bold) - 清楚置於花朵上方
    drawBigLabel(`花朵 (x${state.flowerEnergyCount})`, fx - 90, fy - 36, '#f472b6', 20);

    ctx.restore();
  }

  // 繪製庫器官 2：側枝果實 (Fruit)
  function drawFruit(rx, ry) {
    ctx.save();

    // 綠色果枝
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(geo.stemCenterX + 15, ry);
    ctx.lineTo(rx - 25, ry);
    ctx.stroke();

    // 果梗 (韌皮部管道延伸至果實)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(geo.phloemStemX, ry);
    ctx.lineTo(rx - 25, ry);
    ctx.stroke();

    // 綠色果蒂與果萼
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(rx, ry - 22, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 碩大鮮紅果實本體 (隨積糖量動態膨大)
    const extraSize = Math.min(state.fruitSugarCount * 4, 20);
    const fruitR = 26 + extraSize;

    const fruitGrad = ctx.createRadialGradient(rx - 6, ry - 6, 4, rx, ry, fruitR);
    fruitGrad.addColorStop(0, '#fca5a5');
    fruitGrad.addColorStop(0.4, '#ef4444');
    fruitGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = fruitGrad;

    ctx.beginPath();
    ctx.arc(rx, ry, fruitR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 光澤高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(rx - fruitR * 0.35, ry - fruitR * 0.35, fruitR * 0.25, fruitR * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 果實大字標籤 (20px bold)
    drawBigLabel(`果實 (x${state.fruitSugarCount})`, rx - 80, ry + fruitR + 25, '#f87171', 20);

    ctx.restore();
  }

  // 繪製庫器官 4：頂芽與新葉 (Shoot - 頂端分生組織與節間伸長生長)
  function drawShoot(rx, ry) {
    ctx.save();

    const count = state.shootEnergyCount;
    // 隨生長次數節間伸長 (Internode Elongation)
    const elongation = Math.min(count * 9, 45);
    const apexY = ry - elongation;
    const baseStemY = geo.stemTopY + 20;

    // 1. 伸長的主莖頂嫩莖 (從主莖頂部延伸向上，隨生長變得茁壯)
    const stemW = 14 + Math.min(count * 1.5, 8);
    const stemGrad = ctx.createLinearGradient(rx - stemW / 2, 0, rx + stemW / 2, 0);
    stemGrad.addColorStop(0, '#4d7c0f');
    stemGrad.addColorStop(0.5, '#65a30d');
    stemGrad.addColorStop(1, '#3f6212');

    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = stemW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, baseStemY);
    ctx.lineTo(rx, apexY);
    ctx.stroke();

    // 2. 內部微細維管束延伸 (Xylem & Phloem Bundles)
    // 木質部細管道 (左側藍色，提供水分子維持細胞膨壓)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(rx - 4, baseStemY);
    ctx.lineTo(rx - 4, apexY + 8);
    ctx.stroke();

    // 韌皮部細管道 (右側紫色，輸送蔗糖供細胞壁合成與生長能量)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(rx + 4, baseStemY);
    ctx.lineTo(rx + 4, apexY + 8);
    ctx.stroke();

    // 3. 節 (Nodes) 與分層生長葉片 (Tiered Leaves)
    function drawLeaflet(lx, ly, length, width, angle, color1, color2, veinColor) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle);

      // 葉身漸層
      const leafGrad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
      leafGrad.addColorStop(0, color1);
      leafGrad.addColorStop(1, color2);
      ctx.fillStyle = leafGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(length * 0.35, -width * 0.9, length * 0.8, -width * 0.5, length, 0);
      ctx.bezierCurveTo(length * 0.8, width * 0.5, length * 0.35, width * 0.9, 0, 0);
      ctx.fill();
      ctx.strokeStyle = veinColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 主葉脈
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(length * 0.5, 0, length * 0.88, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 微光高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(length * 0.4, -width * 0.2, length * 0.22, width * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 第 1 層 (基部成熟幼葉 - 隨生長逐漸展平茁壯)
    const tier1Y = baseStemY - (baseStemY - apexY) * 0.35;
    const tier1Scale = 1.0 + Math.min(count * 0.18, 0.9);
    drawLeaflet(rx - 5, tier1Y, 32 * tier1Scale, 14 * tier1Scale, -Math.PI * 0.78, '#84cc16', '#4d7c0f', '#365314');
    drawLeaflet(rx + 5, tier1Y, 32 * tier1Scale, 14 * tier1Scale, -Math.PI * 0.22, '#84cc16', '#4d7c0f', '#365314');

    // 第 2 層 (中部伸長新葉 - count >= 1 時顯著展開)
    if (count >= 1) {
      const tier2Y = baseStemY - (baseStemY - apexY) * 0.7;
      const tier2Scale = 0.85 + Math.min((count - 1) * 0.15, 0.7);
      drawLeaflet(rx - 4, tier2Y, 26 * tier2Scale, 12 * tier2Scale, -Math.PI * 0.68, '#a3e635', '#65a30d', '#3f6212');
      drawLeaflet(rx + 4, tier2Y, 26 * tier2Scale, 12 * tier2Scale, -Math.PI * 0.32, '#a3e635', '#65a30d', '#3f6212');
    }

    // 第 3 層 (頂端最幼嫩初生葉 - count >= 2 時長出第三層分生嫩葉)
    if (count >= 2) {
      const tier3Y = apexY + 8;
      const tier3Scale = 0.75 + Math.min((count - 2) * 0.12, 0.5);
      drawLeaflet(rx - 3, tier3Y, 20 * tier3Scale, 9 * tier3Scale, -Math.PI * 0.6, '#bef264', '#84cc16', '#4d7c0f');
      drawLeaflet(rx + 3, tier3Y, 20 * tier3Scale, 9 * tier3Scale, -Math.PI * 0.4, '#bef264', '#84cc16', '#4d7c0f');
    }

    // 4. 頂端分生組織圓頂 (Apical Meristem Dome - 頂芽生長錐)
    const meristemGrad = ctx.createRadialGradient(rx, apexY - 2, 2, rx, apexY, 12);
    meristemGrad.addColorStop(0, '#fef08a');
    meristemGrad.addColorStop(0.4, '#d9f99d');
    meristemGrad.addColorStop(1, '#65a30d');
    ctx.fillStyle = meristemGrad;
    ctx.beginPath();
    ctx.moveTo(rx, apexY - 14);
    ctx.quadraticCurveTo(rx - 9, apexY - 2, rx, apexY + 4);
    ctx.quadraticCurveTo(rx + 9, apexY - 2, rx, apexY - 14);
    ctx.fill();
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. 頂端生長細胞分裂光波脈衝 (當蔗糖注入或活躍生長時發出金綠色光環)
    const activeGlow = (state.shootGrowthPulse || 0) + (state.fate === 'shoot' && !state.isDay ? 0.35 : 0);
    if (activeGlow > 0.05) {
      ctx.save();
      const glowR = 16 + activeGlow * 18;
      ctx.beginPath();
      ctx.arc(rx, apexY - 5, glowR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(163, 230, 53, ${Math.min(activeGlow * 0.35, 0.45)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(190, 242, 100, ${Math.min(activeGlow * 0.8, 0.9)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }

    // 6. 頂芽大字標籤 (高對比居中對齊，避開所有遮擋)
    const labelY = apexY - 24;
    drawBigLabel(`頂芽生長 (x${count})`, rx - 88, labelY, '#a3e635', 20);

    ctx.restore();
  }

  // 繪製地下根系、澱粉儲藏組織與根系生長點 (Root, Tuber & Root Tip Meristem)
  function drawRootsAndTuber() {
    ctx.save();

    // 根系生長延伸量 (主根向下伸長)
    const rootExtend = Math.min(state.rootGrowthCount * 5, 30);
    const mainApexY = geo.h - 30 + rootExtend;

    // 所有根系統一使用自然根系深棕色 (主根、新生側根、吸水側根)
    const rootColor = '#b45309';

    ctx.strokeStyle = rootColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // 主根 (包含生長向下延伸)
    ctx.beginPath();
    ctx.moveTo(geo.stemCenterX, geo.soilY);
    ctx.bezierCurveTo(geo.stemCenterX - 10, geo.soilY + 60, geo.stemCenterX + 10, geo.soilY + 110, geo.stemCenterX, mainApexY);
    ctx.stroke();

    // 側根分支群 (隨 rootGrowthCount 增加，根系不僅延長，更持續萌生新側根與二級分支，顯著增加根數量)
    const lateralRootBranches = [
      // tier 1: 第一批初生側根 (左右各一)
      { tier: 1, sx: geo.stemCenterX - 4, sy: geo.soilY + 95, cx: geo.stemCenterX - 24, cy: geo.soilY + 115, ex: geo.stemCenterX - 48, ey: geo.soilY + 132, w: 3.5 },
      { tier: 1, sx: geo.stemCenterX + 6, sy: geo.soilY + 110, cx: geo.stemCenterX + 25, cy: geo.soilY + 130, ex: geo.stemCenterX + 45, ey: geo.soilY + 148, w: 3.5 },
      // tier 2: 第二批側根 (深層展開及中高層展開，增加根系數量)
      { tier: 2, sx: geo.stemCenterX - 5, sy: geo.soilY + 138, cx: geo.stemCenterX - 30, cy: geo.soilY + 160, ex: geo.stemCenterX - 58, ey: geo.soilY + 178, w: 3.2 },
      { tier: 2, sx: geo.stemCenterX + 4, sy: geo.soilY + 75, cx: geo.stemCenterX + 22, cy: geo.soilY + 92, ex: geo.stemCenterX + 38, ey: geo.soilY + 106, w: 3.0 },
      // tier 3: 第三批側根與二級分枝 (側根進一步分叉，增進吸收表面積)
      { tier: 3, sx: geo.stemCenterX - 28, sy: geo.soilY + 115, cx: geo.stemCenterX - 38, cy: geo.soilY + 135, ex: geo.stemCenterX - 52, ey: geo.soilY + 152, w: 2.3 },
      { tier: 3, sx: geo.stemCenterX + 6, sy: geo.soilY + 155, cx: geo.stemCenterX + 30, cy: geo.soilY + 175, ex: geo.stemCenterX + 54, ey: geo.soilY + 192, w: 3.0 },
      // tier 4: 第四批側根 (深層側根與更多分枝)
      { tier: 4, sx: geo.stemCenterX - 35, sy: geo.soilY + 158, cx: geo.stemCenterX - 48, cy: geo.soilY + 175, ex: geo.stemCenterX - 66, ey: geo.soilY + 188, w: 2.2 },
      { tier: 4, sx: geo.stemCenterX - 3, sy: geo.soilY + 175, cx: geo.stemCenterX - 22, cy: geo.soilY + 195, ex: geo.stemCenterX - 42, ey: geo.soilY + 212, w: 2.6 },
      // tier 5+: 第五批側根 (茂盛鬚根與深層幼嫩側根)
      { tier: 5, sx: geo.stemCenterX + 28, sy: geo.soilY + 130, cx: geo.stemCenterX + 42, cy: geo.soilY + 148, ex: geo.stemCenterX + 58, ey: geo.soilY + 164, w: 2.0 },
      { tier: 5, sx: geo.stemCenterX + 4, sy: geo.soilY + 192, cx: geo.stemCenterX + 22, cy: geo.soilY + 210, ex: geo.stemCenterX + 38, ey: geo.soilY + 224, w: 2.4 }
    ];

    for (const b of lateralRootBranches) {
      if (state.rootGrowthCount >= b.tier) {
        // 生長進度 (0.0 ~ 1.0)
        const prog = Math.min((state.rootGrowthCount - b.tier + 1) * 0.45, 1.0);
        const curEx = b.sx + (b.ex - b.sx) * prog;
        const curEy = b.sy + (b.ey - b.sy) * prog;
        const curCx = b.sx + (b.cx - b.sx) * prog;
        const curCy = b.sy + (b.cy - b.sy) * prog;

        ctx.strokeStyle = rootColor;
        ctx.lineWidth = b.w;
        ctx.beginPath();
        ctx.moveTo(b.sx, b.sy);
        ctx.quadraticCurveTo(curCx, curCy, curEx, curEy);
        ctx.stroke();

        // 側根端點幼嫩生長點 (生長脈衝活躍時微光)
        if (state.rootGrowthPulse > 0 && prog < 1.0) {
          ctx.save();
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(curEx, curEy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // 吸水側根 (連通木質部) - 所有根系均使用相同的根系顏色
    ctx.strokeStyle = rootColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.xylemStemX, geo.soilY + 20);
    ctx.quadraticCurveTo(geo.xylemStemX - 60, geo.soilY + 60, geo.xylemStemX - 160, geo.soilY + 120);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(geo.xylemStemX - 50, geo.soilY + 50);
    ctx.quadraticCurveTo(geo.xylemStemX - 100, geo.soilY + 100, geo.xylemStemX - 110, geo.h - 40);
    ctx.stroke();

    // 根毛吸水區專屬大字標籤 (由字幕按鈕統一管理)
    if (state.showSubtitles) {
      drawVascularLabel('【根毛吸水區】', '水分由此進入木質部', 410, geo.soilY + 125, geo.xylemStemX - 100, geo.soilY + 80, '#38bdf8', '#7dd3fc', 160);
    }

    // 送往澱粉塊根之地下路徑 (使用與根系完全統一的自然顏色)
    ctx.strokeStyle = rootColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.phloemStemX, geo.soilY + 20);
    ctx.quadraticCurveTo(geo.phloemStemX + 40, geo.soilY + 45, geo.rootTuberX, geo.rootTuberY);
    ctx.stroke();

    // 繪製根尖分生組織與生長點 (Root Apical Meristem)
    const isRootGrowthTarget = state.fate === 'root_growth';
    const rootGlow = (state.rootGrowthPulse || 0) + (isRootGrowthTarget ? 0.35 : 0);

    ctx.save();
    if (rootGlow > 0) {
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 14 * rootGlow;
    }
    ctx.fillStyle = isRootGrowthTarget || state.rootGrowthCount > 0 ? '#4ade80' : '#b45309';
    ctx.beginPath();
    ctx.ellipse(geo.stemCenterX, mainApexY, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 根尖生長脈動光環
    if (state.rootGrowthPulse > 0) {
      ctx.save();
      const pR = 14 + state.rootGrowthPulse * 22;
      ctx.strokeStyle = `rgba(74, 222, 128, ${state.rootGrowthPulse * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(geo.stemCenterX, mainApexY, pR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 根系生長大字標籤 (18px bold)
    drawBigLabel(`根系生長 (伸長與增根 x${state.rootGrowthCount})`, geo.stemCenterX - 95, mainApexY + 20, isRootGrowthTarget ? '#86efac' : '#cbd5e1', 17);

    // 澱粉塊根 (隨澱粉累積膨大)
    const tuberSize = Math.min(30 + state.rootStarchCount * 8, 66);
    const tuberGrad = ctx.createRadialGradient(geo.rootTuberX, geo.rootTuberY, 6, geo.rootTuberX, geo.rootTuberY, tuberSize);
    tuberGrad.addColorStop(0, '#fef08a');
    tuberGrad.addColorStop(0.5, '#ca8a04');
    tuberGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = tuberGrad;

    ctx.beginPath();
    ctx.ellipse(geo.rootTuberX, geo.rootTuberY, tuberSize, tuberSize * 0.72, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 塊根大字標籤 (20px bold)
    drawBigLabel(`塊根 (澱粉儲藏組織 x${state.rootStarchCount})`, geo.rootTuberX - 90, geo.rootTuberY + tuberSize + 25, '#ffffff', 20);

    // 在根部內部畫出澱粉顆粒
    if (state.rootStarchCount > 0) {
      const rootStarchGrains = [
        { dx: -8, dy: -5, rx: 18, ry: 12, rot: 0.1 },
        { dx: 14, dy: 6, rx: 16.5, ry: 10.5, rot: -0.2 },
        { dx: -6, dy: 16, rx: 16.5, ry: 10.5, rot: 0.25 },
        { dx: -22, dy: 8, rx: 14, ry: 10, rot: -0.15 },
        { dx: 16, dy: -16, rx: 14, ry: 10, rot: 0.15 }
      ];
      const rootGrainCount = Math.min(state.rootStarchCount, rootStarchGrains.length);
      for (let i = 0; i < rootGrainCount; i++) {
        const g = rootStarchGrains[i];
        drawStarchGrain(geo.rootTuberX + g.dx, geo.rootTuberY + g.dy, g.rx, g.ry, g.rot);
      }
    }

    // 若根部無養分且被觸發時，繪製警示光環與文字
    if (state.rootEmptyAlertPulse > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${state.rootEmptyAlertPulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(geo.rootTuberX, geo.rootTuberY, tuberSize + 14, 0, Math.PI * 2);
      ctx.stroke();
      
      // 文字也跟著 alert pulse 的透明度淡出
      ctx.globalAlpha = state.rootEmptyAlertPulse;
      drawBigLabel('根部無儲備澱粉！無法向上轉運', geo.rootTuberX - 120, geo.rootTuberY - tuberSize - 16, '#f87171', 18);
      ctx.restore();

      // 每幀遞減透明度，約一秒多後消失
      state.rootEmptyAlertPulse = Math.max(0, state.rootEmptyAlertPulse - 0.015);
    }

    ctx.restore();
  }

  // =========================================================================
  // 共用繪圖元件函式
  // =========================================================================

  // 繪製單顆澱粉粒 (包含高光與「澱粉」文字)
  function drawStarchGrain(cx, cy, rx, ry, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    
    // 澱粉粒柔和高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.35, -ry * 0.35, rx * 0.35, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 寫出澱粉的文字 (抵銷旋轉以保持正立)
    ctx.rotate(-rot);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 12px "Noto Sans TC", sans-serif'; // 字體配合放大的澱粉粒變大
    ctx.fillText('澱粉', 0, 0);
    ctx.restore();
  }

  // 繪製單個金黃色六角環葡萄糖分子 (C6H12O6)
  function drawGlucoseHexagon(cx, cy, r, angle, alpha = 1.0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // 六邊形頂點路徑
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const hx = Math.cos(a) * r;
      const hy = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    // 金黃色放射漸層
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.7, '#fbbf24');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 分子文字 (水平繪製)
    ctx.rotate(-angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
    ctx.fillText('葡萄糖', 0, -3);

    ctx.restore();
  }

  // 繪製光合作用源：葉片、葉脈、葉綠體與氣孔 (含葡萄糖生成與澱粉聚合動態)
  function drawLeafAndStoma(now) {
    ctx.save();

    // 葉片輪廓
    ctx.beginPath();
    ctx.moveTo(geo.leafBaseX, geo.leafCenterY);
    ctx.bezierCurveTo(geo.leafBaseX - 60, geo.leafCenterY - 110, geo.leafTipX + 40, geo.leafCenterY - 90, geo.leafTipX, geo.leafCenterY);
    ctx.bezierCurveTo(geo.leafTipX + 40, geo.leafCenterY + 90, geo.leafBaseX - 60, geo.leafCenterY + 110, geo.leafBaseX, geo.leafCenterY);
    ctx.closePath();

    const leafGrad = ctx.createRadialGradient(geo.chloroplastX, geo.chloroplastY, 20, geo.chloroplastX, geo.chloroplastY, 220);
    leafGrad.addColorStop(0, '#22c55e');
    leafGrad.addColorStop(0.6, '#15803d');
    leafGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = leafGrad;
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 木質部葉脈 (藍色通道)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.xylemStemX, geo.leafCenterY);
    ctx.lineTo(geo.leafBaseX, geo.leafCenterY - 4);
    ctx.quadraticCurveTo(geo.chloroplastX + 50, geo.chloroplastY - 6, geo.chloroplastX, geo.chloroplastY);
    ctx.stroke();

    // 木質部通往氣孔的蒸散導管分支 (Cyan 藍色通道)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(geo.leafBaseX - 35, geo.leafCenterY - 4);
    ctx.quadraticCurveTo(geo.chloroplastX + 25, geo.leafCenterY + 16, geo.stomaX + 16, geo.stomaY - 14);
    ctx.lineTo(geo.stomaX, geo.stomaY);
    ctx.stroke();

    // 韌皮部葉脈 (紫色通道)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.chloroplastX, geo.chloroplastY);
    ctx.quadraticCurveTo(geo.chloroplastX + 70, geo.chloroplastY + 14, geo.leafBaseX, geo.leafCenterY + 6);
    ctx.lineTo(geo.phloemStemX, geo.leafCenterY);
    ctx.stroke();

    // 葉綠體核心反應區 (加寬至 90x54，清晰容納光反應類囊體、基質葡萄糖與澱粉粒)
    const chRx = 90;
    const chRy = 54;
    ctx.fillStyle = state.chloroplastPulse > 0.1 ? 'rgba(6, 95, 70, 0.95)' : 'rgba(4, 120, 87, 0.92)';
    ctx.beginPath();
    ctx.ellipse(geo.chloroplastX, geo.chloroplastY, chRx, chRy, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = (state.leafStarchCount > 0 || state.glucoseParticles.length > 0) ? '#fbbf24' : '#34d399';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 葉綠體內膜 (雙層膜構造)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(geo.chloroplastX, geo.chloroplastY, chRx - 6, chRy - 5, -0.05, 0, Math.PI * 2);
    ctx.stroke();

    // A. 葉綠體內部左側：類囊體 / 基粒堆 (光反應區)
    const granaX = geo.chloroplastX - 52;
    for (let gi = 0; gi < 4; gi++) {
      const gy = geo.chloroplastY - 18 + gi * 11;
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.ellipse(granaX, gy, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // B. 葉綠體內部「暫時性澱粉粒 (Transitory Starch Grains)」
    if (state.leafStarchCount > 0) {
      const starchGrains = [
        { dx: 32, dy: 10, rx: 18, ry: 12, rot: 0.12 },  // 第一個澱粉粒 (放大約1.5倍)
        { dx: 10, dy: 22, rx: 16.5, ry: 10.5, rot: -0.15 },
        { dx: 52, dy: 18, rx: 16.5, ry: 10.5, rot: 0.25 },
        { dx: 22, dy: 34, rx: 14, ry: 10, rot: -0.1 },
        { dx: 42, dy: 34, rx: 14, ry: 10, rot: 0.15 }
      ];
      const grainCount = Math.min(state.leafStarchCount, starchGrains.length);
      for (let i = 0; i < grainCount; i++) {
        const g = starchGrains[i];
        drawStarchGrain(geo.chloroplastX + g.dx, geo.chloroplastY + g.dy, g.rx, g.ry, g.rot);
      }
    }

    // C. 葉綠體內部葡萄糖分子即時動態與縮合聚合動態
    if (state.glucoseParticles.length > 0) {
      // 聚合縮合時繪製糖苷鍵連接線
      if (state.isPolymerizing) {
        state.polymerizationProgress = Math.min(1.0, state.polymerizationProgress + 0.016);
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -(now * 0.04) % 12;

        for (let i = 0; i < state.glucoseParticles.length; i++) {
          const p1 = state.glucoseParticles[i];
          const p2 = state.glucoseParticles[(i + 1) % state.glucoseParticles.length];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // 鍵結中點標示 -O- 糖苷鍵
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.fillText('-O-', midX, midY - 3);
        }
        ctx.restore();
      }

      // 繪製每個葡萄糖分子 (集中收斂點位於右側基質，與第一個澱粉粒生成點精準重合)
      const targetCenter = { x: geo.chloroplastX + 32, y: geo.chloroplastY + 12 };
      state.glucoseParticles.forEach(p => {
        if (state.isPolymerizing) {
          // 縮合時葡萄糖向右側特定收斂點靠攏聚合
          p.x += (targetCenter.x - p.x) * 0.04;
          p.y += (targetCenter.y - p.y) * 0.04;
        } else {
          p.x += (p.targetX - p.x) * 0.08;
          p.y += (p.targetY - p.y) * 0.08;
        }
        p.angle += 0.01;
        p.scale = Math.min(1.0, p.scale + 0.06);

        drawGlucoseHexagon(p.x, p.y, p.size * p.scale, p.angle, p.alpha);
      });
    }

    // D. 聚合瞬間的高光擴散特效 (發光中心與收斂點、第一澱粉粒生成點完全一致)
    if (state.synthesisFlash > 0) {
      ctx.save();
      const flashR = (1 - state.synthesisFlash) * 45 + 15;
      const fGrad = ctx.createRadialGradient(geo.chloroplastX + 32, geo.chloroplastY + 12, 2, geo.chloroplastX + 32, geo.chloroplastY + 12, flashR);
      fGrad.addColorStop(0, `rgba(254, 240, 138, ${state.synthesisFlash})`);
      fGrad.addColorStop(0.5, `rgba(251, 191, 36, ${state.synthesisFlash * 0.7})`);
      fGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(geo.chloroplastX + 32, geo.chloroplastY + 12, flashR, 0, Math.PI * 2);
      ctx.fill();
      state.synthesisFlash = Math.max(0, state.synthesisFlash - 0.025);
      ctx.restore();
    }

    // 葉綠體大字標籤 (18px bold)
    drawBigLabel('葉綠體', geo.chloroplastX - 60, geo.chloroplastY - 20, '#ffffff', 18);

    // 葉片氣孔：繪製單對真實保衛細胞 (縮放尺度 0.22，隨 state.stomaAperture 膨脹或萎縮)
    drawGuardCellPair(geo.stomaX, geo.stomaY, 0.22, state.stomaAperture, false, now);

    // 氣孔開閉狀態標籤
    if (state.stomaAperture > 0.3) {
      drawBigLabel('保衛細胞吸水膨脹', geo.stomaX - 110, geo.stomaY + 36, '#4ade80', 16);
    } else {
      drawBigLabel('保衛細胞失水萎縮', geo.stomaX - 110, geo.stomaY + 36, '#86efac', 16);
    }


    ctx.restore();
  }


  // 繪製單對保衛細胞 (根據 t = state.stomaAperture 平滑插值膨脹/萎縮)
  function drawGuardCellPair(cx, cy, scale, t, isDetailed, now) {
    ctx.save();
    ctx.translate(cx, cy);

    // 插值座標 (源自 stomata.html 精準雙弧向量路徑)
    const topX = -5 - 15 * t;
    const topY = -90 - 10 * t;
    const btmX = -5 - 15 * t;
    const btmY = 90 + 10 * t;

    const outC1X = -40 - 30 * t;
    const outC1Y = -90 - 10 * t;
    const outMidX = -60 - 30 * t;
    const outC2Y = 90 + 10 * t;

    const inC1X = 15 - 5 * t;
    const inC1Y = 90 + 10 * t;
    const inMidX = 5 - 20 * t;
    const inC2X = 15 - 5 * t;
    const inC2Y = -90 - 10 * t;

    function pathCell() {
      ctx.beginPath();
      ctx.moveTo(topX * scale, topY * scale);
      ctx.bezierCurveTo(outC1X * scale, outC1Y * scale, outMidX * scale, 0, outMidX * scale, 0);
      ctx.bezierCurveTo(outMidX * scale, 0, outC1X * scale, outC2Y * scale, btmX * scale, btmY * scale);
      ctx.bezierCurveTo(inC1X * scale, inC1Y * scale, inMidX * scale, 40 * scale, inMidX * scale, 0);
      ctx.bezierCurveTo(inMidX * scale, -40 * scale, inC2X * scale, inC2Y * scale, topX * scale, topY * scale);
      ctx.closePath();
    }

    function pathInnerWall() {
      ctx.beginPath();
      ctx.moveTo(topX * scale, topY * scale);
      ctx.bezierCurveTo(inC2X * scale, inC2Y * scale, inMidX * scale, -40 * scale, inMidX * scale, 0);
      ctx.bezierCurveTo(inMidX * scale, 40 * scale, inC1X * scale, inC1Y * scale, btmX * scale, btmY * scale);
    }

    // 繪製左保衛細胞 (閉合與張開皆維持綠色活細胞外觀，僅胞體型態隨膨壓改變)
    ctx.fillStyle = t > 0.2 ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.90)';
    pathCell();
    ctx.fill();
    ctx.strokeStyle = t > 0.2 ? '#22c55e' : '#16a34a';
    ctx.lineWidth = Math.max(2 * scale, 1.5);
    ctx.stroke();

    // 內側增厚細胞壁 (內壁厚，抗伸長，始終保持深綠色木質素/纖維素細胞壁)
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = Math.max(4.5 * scale, 3);
    pathInnerWall();
    ctx.stroke();

    // 繪製右保衛細胞 (水平鏡像對稱)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillStyle = t > 0.2 ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.90)';
    pathCell();
    ctx.fill();
    ctx.strokeStyle = t > 0.2 ? '#22c55e' : '#16a34a';
    ctx.lineWidth = Math.max(2 * scale, 1.5);
    ctx.stroke();

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = Math.max(4.5 * scale, 3);
    pathInnerWall();
    ctx.stroke();
    ctx.restore();

    // 若為微觀特寫，繪製保衛細胞內部的微小葉綠體 (始終維持鮮綠色葉綠體)
    if (isDetailed) {
      const cpDots = [
        { x: -44, y: -45 }, { x: -60, y: 0 }, { x: -44, y: 45 },
        { x: 44, y: -45 }, { x: 60, y: 0 }, { x: 44, y: 45 }
      ];
      ctx.fillStyle = '#16a34a';
      cpDots.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * scale * (0.8 + 0.2 * t), p.y * scale, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // 繪製顯微特寫視窗 (支援「氣孔保衛細胞」與「葉綠體與澱粉合成」雙模式切換)
  function drawMicroscopicInset(now) {
    ctx.save();

    const ix = 25;
    const iy = 55;
    const iw = 236;
    const ih = 355;

    // 半透明高對比視窗背景 (微翡翠綠邊框)
    ctx.fillStyle = 'rgba(7, 20, 14, 0.92)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ix, iy, iw, ih, 16);
    ctx.fill();
    ctx.stroke();

    // 視窗頂部標題框
    const headerH = 28;
    const headerY = iy + 10;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(ix + 12, headerY, iw - 24, headerH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12.5px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('顯微特寫：氣孔保衛細胞', ix + iw / 2, headerY + headerH / 2);

    // 副標題狀態說明
    ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
    ctx.fillStyle = state.isDay ? '#38bdf8' : '#94a3b8';
    if (state.isTranspirationMode) {
      ctx.fillText('蒸散作用進行中：氣孔敞開，水分逸散', ix + iw / 2, iy + 52);
    } else {
      ctx.fillText(state.isDay ? '日間光照：K⁺ & 水分進入膨脹' : '夜間黑暗：K⁺ & 水分流出萎縮', ix + iw / 2, iy + 52);
    }

    // 視窗中央主體繪製：氣孔保衛細胞 (連線指向葉片氣孔)
    const gcx = ix + iw / 2;
    const gcy = iy + 172;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ix + iw, iy + 250);
      ctx.quadraticCurveTo(ix + iw + 50, iy + 270, geo.stomaX - 25, geo.stomaY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(geo.stomaX - 25, geo.stomaY, 4, 0, Math.PI * 2);
      ctx.fill();

      // 中央保衛細胞
      const t = state.stomaAperture;
      drawGuardCellPair(gcx, gcy, 0.54, t, true, now);

      // 開閉文字
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillStyle = t > 0.4 ? '#4ade80' : '#86efac';
      if (t > 0.4) {
        ctx.fillText('氣孔張開', gcx, gcy);
      } else {
        ctx.fillText('氣孔閉合', gcx, gcy - 65);
      }

      // 離子與水分流動動態指示箭頭
      const dashOffset = (now * 0.02) % 16;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      const isEntering = state.isDay;
      
      ctx.strokeStyle = '#fbbf24';
      ctx.lineDashOffset = isEntering ? -dashOffset : dashOffset;

        
      ctx.beginPath();
      ctx.moveTo(gcx - 85, gcy - 30); ctx.lineTo(gcx - 50, gcy - 12);     
      ctx.moveTo(gcx + 85, gcy - 30); ctx.lineTo(gcx + 50, gcy - 12);

      
      ctx.stroke();
      

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(gcx - 90, gcy); ctx.lineTo(gcx - 52, gcy);
      ctx.moveTo(gcx + 90, gcy); ctx.lineTo(gcx + 52, gcy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('K⁺', gcx - 96, gcy - 30);
      ctx.fillText('K⁺', gcx + 96, gcy - 30);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('H₂O', gcx - 98, gcy + 4);
      ctx.fillText('H₂O', gcx + 98, gcy + 4);

      ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
      ctx.fillStyle = state.isDay ? '#34d399' : '#86efac';
      ctx.fillText(state.isDay ? '保衛細胞膨壓增加 (吸水膨脹)' : '保衛細胞膨壓下降 (失水萎縮)', gcx, iy + 282);

      ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('內壁厚不易伸長・外壁薄向外彎曲', gcx, iy + 304);

      ctx.font = '10px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(state.isDay ? '➔ 兩細胞向外拱起，中央孔隙張開' : '➔ 兩細胞挺直靠攏，中央孔隙關閉', gcx, iy + 322);

    ctx.restore();
  }

  // 輔助函式：繪製具備陰影與高對比的大字體
  function drawBigLabel(text, x, y, color, size) {
    ctx.save();
    ctx.font = `bold ${size}px "Noto Sans TC", sans-serif`;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 輔助函式：圓角矩形相容繪製
  function drawRoundedRect(c, x, y, w, h, r) {
    if (c.roundRect) {
      c.roundRect(x, y, w, h, r);
    } else {
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
  }

  // 繪製畫布即時步驟解說字幕 (出現在 geo 畫布位置，可 toggle 顯示或隱藏)
  function drawStepSubtitleBar(now) {
    if (!state.showSubtitles) return;

    let curStepNum = 1;
    let title = '';
    let targetName = '';
    let organX = 0;
    let organY = 0;

    if (state.isTranspirationMode) {
      curStepNum = 0;
      title = '氣孔張開蒸散約 99% 水分產生拉力，約 1% 進入葉肉供光合作用';
      targetName = '氣孔與木質部';
      organX = geo.stomaX;
      organY = geo.stomaY;
    } else if (state.isParallelMode) {
      if (state.isDay) {
        curStepNum = 'parallel_day';
        title = `日間同步進行：氣孔進碳、光解產氧、蒸散流、即時蔗糖外運與澱粉蓄洪 (${state.leafStarchCount}/${state.autoLoopTargetStarch})`;
        targetName = '葉綠體與全株庫器官';
        organX = geo.chloroplastX;
        organY = geo.chloroplastY;
      } else {
        curStepNum = 'parallel_night';
        title = `夜間黑暗：氣孔閉合，葉綠體水解 ${state.leafStarchCount} 顆暫存澱粉為蔗糖持續外運`;
        const destName = {
          root: '塊根 (儲藏)',
          root_growth: '根系 (生長)',
          flower: '花朵 (花蜜)',
          fruit: '果實 (膨大)',
          shoot: '頂芽 (生長)'
        }[state.fate] || '目標庫器官';
        targetName = destName;
        organX = state.fate === 'flower' ? geo.flowerX : (state.fate === 'fruit' ? geo.fruitBranchX : (state.fate === 'shoot' ? geo.shootX : (state.fate === 'root_growth' ? geo.stemCenterX : geo.rootTuberX)));
        organY = state.fate === 'flower' ? geo.flowerY : (state.fate === 'fruit' ? geo.fruitBranchY : (state.fate === 'shoot' ? geo.shootY : (state.fate === 'root_growth' ? geo.rootTipY : geo.rootTuberY)));
      }
    } else {
      curStepNum = (state.currentStep >= 1 && state.currentStep <= 8) ? state.currentStep : (state.isDay ? 1 : 7);
      const info = STEP_INFOS[curStepNum - 1];
      if (!info) return;
      title = info.title;
      targetName = info.targetName;
      organX = info.organX;
      organY = info.organY;

      // 若在第5步日間即時轉運 或 第8步夜間接續轉運，則根據目標器官動態調整聚焦光圈與文字
      if (curStepNum === 5 || curStepNum === 8) {
        if (state.fate === 'flower') {
          organX = geo.flowerX;
          organY = geo.flowerY;
          targetName = curStepNum === 5 ? '花朵 (日間即時供能)' : '花朵 (夜間接續供能)';
        } else if (state.fate === 'fruit') {
          organX = geo.fruitBranchX;
          organY = geo.fruitBranchY;
          targetName = curStepNum === 5 ? '果實 (日間即時轉化)' : '果實 (夜間接續積累)';
        } else if (state.fate === 'shoot') {
          organX = geo.shootX;
          organY = geo.shootY - Math.min(state.shootEnergyCount * 9, 45);
          targetName = curStepNum === 5 ? '頂芽 (日間即時生長)' : '頂芽 (夜間接續生長)';
        } else if (state.fate === 'root_growth') {
          organX = geo.stemCenterX;
          organY = geo.rootTipY;
          targetName = curStepNum === 5 ? '根系 (日間即時生長)' : '根系 (夜間接續伸長)';
        } else {
          organX = geo.rootTuberX;
          organY = geo.rootTuberY;
          targetName = curStepNum === 5 ? '塊根 (日間即時儲藏)' : '塊根 (夜間接續儲存)';
        }
      }
    }

    ctx.save();

    // 1. 在該步驟對應的 geo 生理器官座標處，繪製動態聚焦呼吸標記 (Spatial Beacon)
    if (organX && organY) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      const ringR1 = 28 + pulse * 16;
      const ringR2 = 44 + pulse * 24;
      const ringAlpha = 0.85 - pulse * 0.55;
      const themeColor = state.isDay ? '#38bdf8' : '#c084fc';
      const glowColor = state.isDay ? 'rgba(56, 189, 248, 0.8)' : 'rgba(192, 132, 252, 0.8)';

      ctx.save();
      
      // 內層半透明呼吸實心光暈
      ctx.beginPath();
      ctx.arc(organX, organY, 20 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = themeColor;
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.fill();

      // 外層雙虛線光環 (加上發光陰影效果)
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = Math.max(0, ringAlpha);
      
      // 第一道主光環 (較粗)
      ctx.beginPath();
      ctx.arc(organX, organY, ringR1, 0, Math.PI * 2);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      
      // 第二道外側雷達環 (較細且帶有旋轉動畫)
      ctx.beginPath();
      ctx.arc(organX, organY, ringR2, 0, Math.PI * 2);
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 10]);
      ctx.lineDashOffset = -(now * 0.03); // 動態旋轉效果
      ctx.stroke();

      ctx.restore();
    }

    // 2. 在 geo.subtitleX, geo.subtitleY 繪製主字幕條 (Cinematic Subtitle Bar)
    const barX = geo.subtitleX;
    const barY = geo.subtitleY;
    const barW = 880;
    const barH = 46;
    const halfW = barW / 2;

    // 外層微光
    ctx.shadowColor = state.isDay ? 'rgba(56, 189, 248, 0.35)' : 'rgba(168, 85, 247, 0.35)';
    ctx.shadowBlur = 18;

    // 半透明深色底板
    ctx.fillStyle = 'rgba(10, 15, 29, 0.90)';
    ctx.beginPath();
    drawRoundedRect(ctx, barX - halfW, barY - barH / 2, barW, barH, 23);
    ctx.fill();

    // 漸層外框線
    ctx.shadowBlur = 0;
    const borderGrad = ctx.createLinearGradient(barX - halfW, barY, barX + halfW, barY);
    if (state.isDay) {
      borderGrad.addColorStop(0, '#0284c7');
      borderGrad.addColorStop(0.5, '#38bdf8');
      borderGrad.addColorStop(1, '#0284c7');
    } else {
      borderGrad.addColorStop(0, '#6366f1');
      borderGrad.addColorStop(0.5, '#c084fc');
      borderGrad.addColorStop(1, '#6366f1');
    }
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 左側步驟膠囊標籤 (Step Pill Badge)
    const badgeW = 96;
    const badgeH = 30;
    const badgeX = barX - halfW + 12;
    const badgeY = barY - badgeH / 2;

    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    if (curStepNum === 0) {
      badgeGrad.addColorStop(0, '#0284c7');
      badgeGrad.addColorStop(1, '#38bdf8');
    } else if (curStepNum === 'parallel_day') {
      badgeGrad.addColorStop(0, '#0284c7');
      badgeGrad.addColorStop(1, '#06b6d4');
    } else if (curStepNum === 'parallel_night') {
      badgeGrad.addColorStop(0, '#7c3aed');
      badgeGrad.addColorStop(1, '#a855f7');
    } else if (state.isDay) {
      badgeGrad.addColorStop(0, '#059669');
      badgeGrad.addColorStop(1, '#10b981');
    } else {
      badgeGrad.addColorStop(0, '#7c3aed');
      badgeGrad.addColorStop(1, '#a855f7');
    }
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
    ctx.fill();

    let badgeLabel = `步驟 ${curStepNum}/8`;
    if (curStepNum === 0) {
      badgeLabel = '蒸散作用';
    } else if (curStepNum === 'parallel_day') {
      badgeLabel = '同步';
    } else if (curStepNum === 'parallel_night') {
      badgeLabel = '夜間轉運';
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + badgeH / 2);

    // 中間主要字幕文字 (Main Subtitle Text)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
    ctx.fillText(title, badgeX + badgeW + 16, barY + 1);

    // 右側目標器官標籤 (Target Organ Pill)
    const organW = 126;
    const organPillX = barX + halfW - organW - 12;
    const organPillY = barY - 13;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    drawRoundedRect(ctx, organPillX, organPillY, organW, 26, 13);
    ctx.fill();

    ctx.fillStyle = state.isDay ? '#7dd3fc' : '#e9d5ff';
    ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(targetName, organPillX + organW / 2, barY + 1);

    ctx.restore();
  }

  // 繪製所有粒子 (分子徽章與文字全面大幅加大、清晰可辨)
  function drawAllParticles() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // A. CO2 分子 (大尺寸 36px 徽章，大字體 bold 15px)
    state.co2Particles.forEach(p => {
      p.progress += p.speed;
      const cx = p.x + (p.targetX - p.x) * p.progress;
      const cy = p.y + (p.targetY - p.y) * p.progress;
      const r = 18;

      ctx.fillStyle = p.blocked ? '#fca5a5' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.blocked ? '#dc2626' : '#64748b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText('CO₂', cx, cy + 1);
    });
    state.co2Particles = state.co2Particles.filter(p => p.progress < 1);

    // B. 水分子 H2O (大尺寸 36px 徽章，大字體 bold 15px)
    state.h2oParticles.forEach(p => {
      p.segProgress += p.speed;
      if (p.segProgress >= 1) {
        p.segProgress = 0;
        p.segment++;

        // 抵達最終點時觸發蒸散或光合作用反應
        if (p.segment >= p.waypoints.length - 1 && !p.triggered) {
          p.triggered = true;
          if (p.targetKind === 'transpiration') {
            // 水分子抵達氣孔，轉化為蒸散水氣逸散至大氣 (夜間氣孔閉合時全面停止)
            if (state.isDay && state.stomaAperture > 0.05) {
              for (let v = 0; v < 3; v++) {
                state.vaporParticles.push({
                  x: geo.stomaX + (Math.random() - 0.5) * 12,
                  y: geo.stomaY + (Math.random() - 0.5) * 8,
                  vx: -(1.2 + Math.random() * 1.5),
                  vy: -(1.4 + Math.random() * 1.6),
                  alpha: 0.95,
                  size: 15 + Math.random() * 6
                });
              }
            }
          } else if (p.targetKind === 'mesophyll') {
            // 少部分水分子進入葉肉細胞供光合作用
            state.chloroplastPulse = 0.6;
          }
        }
      }

      if (p.segment < p.waypoints.length - 1) {
        const p1 = p.waypoints[p.segment];
        const p2 = p.waypoints[p.segment + 1];
        const cx = p1.x + (p2.x - p1.x) * p.segProgress;
        const cy = p1.y + (p2.y - p1.y) * p.segProgress;
        const r = 18;

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#032b43';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText('H₂O', cx, cy + 1);
      }
    });
    state.h2oParticles = state.h2oParticles.filter(p => p.segment < p.waypoints.length - 1);

    // C. 蒸散水氣逸散粒子 (自氣孔散失之 H2O 氣體，夜間氣孔閉合時立刻完全停止並清空)
    if (!state.isDay) {
      state.vaporParticles = [];
    } else {
      state.vaporParticles.forEach(vp => {
        vp.x += vp.vx;
        vp.y += vp.vy;
        vp.alpha -= 0.012;
        vp.size += 0.16;

        if (vp.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, vp.alpha);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
          ctx.beginPath();
          ctx.arc(vp.x, vp.y, vp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.fillStyle = '#f0f9ff';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.fillText('H₂O 氣體', vp.x, vp.y + 1);
          ctx.restore();
        }
      });
      state.vaporParticles = state.vaporParticles.filter(vp => vp.alpha > 0);
    }

    // D. 氧氣氣泡 O2 (大尺寸 40px 氣泡，大字體 bold 15px)
    state.o2Bubbles.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.alpha -= 0.009;
      const r = 20;

      ctx.fillStyle = `rgba(103, 232, 249, ${Math.max(b.alpha, 0)})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(8, 145, 178, ${Math.max(b.alpha, 0)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = `rgba(8, 51, 68, ${Math.max(b.alpha, 0)})`;
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText('O₂', b.x, b.y + 1);
    });
    state.o2Bubbles = state.o2Bubbles.filter(b => b.alpha > 0);

    // E. 脫水縮合水分子 (葡萄糖聚合為澱粉時脫水釋出的 H2O 水滴)
    state.dehydrationParticles.forEach(dp => {
      dp.x += dp.vx;
      dp.y += dp.vy;
      dp.alpha -= 0.016;

      ctx.save();
      ctx.globalAlpha = Math.max(0, dp.alpha);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#032b43';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText('H₂O', dp.x, dp.y + 1);
      ctx.restore();
    });
    state.dehydrationParticles = state.dehydrationParticles.filter(dp => dp.alpha > 0);

    // F. 蔗糖養分分配粒子 (所有運送中的養分一律為「蔗糖」，抵達目標器官才進行生化轉化)
    state.transports.forEach(t => {
      t.segProgress += t.speed;
      if (t.segProgress >= 1) {
        t.segProgress = 0;
        t.segment++;

        // 抵達最後目標器官的瞬間：進入庫器官並處理生化轉化與進庫結算
        if (t.segment >= t.waypoints.length - 1 && !t.reached) {
          t.reached = true;
          handleParticleArrivedAtSink(t);
        }
      }

      if (t.segment < t.waypoints.length - 1) {
        const p1 = t.waypoints[t.segment];
        const p2 = t.waypoints[t.segment + 1];
        const cx = p1.x + (p2.x - p1.x) * t.segProgress;
        const cy = p1.y + (p2.y - p1.y) * t.segProgress;
        const r = 20;

        // 韌皮部運輸專屬紫色「蔗糖」大徽章 (40px 直徑，高對比大字 bold 14px)
        const ballColor = '#c084fc';
        const strokeColor = '#9333ea';
        const label = '蔗糖';

        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
        ctx.fillText(label, cx, cy + 1);
      }
    });
    state.transports = state.transports.filter(t => t.segment < t.waypoints.length - 1);

    // G. 器官生化轉化浮動徽章 (抵達目標器官時展示：蔗糖 ➔ 澱粉 / 花蜜 / 果糖 / 頂芽纖維素)
    state.conversions.forEach(c => {
      c.y += c.vy;
      c.alpha -= 0.014;

      if (c.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(c.alpha, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';

        const metrics = ctx.measureText(c.text);
        const bgW = metrics.width + 26;
        const bgH = 32;

        // 半透明深色膠囊底框
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(c.x - bgW / 2, c.y - bgH / 2, bgW, bgH, 16);
        ctx.fill();
        ctx.stroke();

        // 轉化文字與發光陰影
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        ctx.fillText(c.text, c.x, c.y + 1);
        ctx.restore();
      }
    });
    state.conversions = state.conversions.filter(c => c.alpha > 0);

    ctx.restore();
  }

  // =========================================================================
  // 事件監聽與切換
  // =========================================================================
  function initEvents() {
    // 運行模式切換 (真實生理 vs 自動分步 vs 手動單步)
    if (modeParallelBtn) {
      modeParallelBtn.onclick = () => setRunMode('parallel');
    }
    if (modeAutoBtn) {
      modeAutoBtn.onclick = () => setRunMode('auto');
    }
    if (modeManualBtn) {
      modeManualBtn.onclick = () => setRunMode('manual');
    }

    // 晝夜光照環境切換 (日間照光 vs 夜間黑暗)
    if (lightDayBtn) {
      lightDayBtn.onclick = () => setDayNightMode(true);
    }
    if (lightNightBtn) {
      lightNightBtn.onclick = () => setDayNightMode(false);
    }

    // 步驟解說字幕切換 (顯示字幕 vs 隱藏字幕)
    if (subtitleOnBtn) {
      subtitleOnBtn.onclick = () => {
        state.showSubtitles = true;
        updateSubtitleButtons();
      };
    }
    if (subtitleOffBtn) {
      subtitleOffBtn.onclick = () => {
        state.showSubtitles = false;
        updateSubtitleButtons();
      };
    }

    if (insetOnBtn) {
      insetOnBtn.onclick = () => {
        state.showMicroscopicInset = true;
        updateInsetButtons();
      };
    }
    if (insetOffBtn) {
      insetOffBtn.onclick = () => {
        state.showMicroscopicInset = false;
        updateInsetButtons();
      };
    }

    // 點擊畫布字幕條區域亦可快速切換字幕顯示狀態
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      if (state.showSubtitles) {
        const barX = geo.subtitleX;
        const barY = geo.subtitleY;
        const halfW = 440;
        if (cx >= barX - halfW && cx <= barX + halfW && cy >= barY - 24 && cy <= barY + 24) {
          state.showSubtitles = false;
          updateSubtitleButtons();
        }
      }
    });

    if (stepBtn) {
      stepBtn.onclick = handleStepNext;
    }
    if (transpirationBtn) {
      transpirationBtn.onclick = toggleTranspirationMode;
    }
    resetBtn.onclick = resetDemo;

    // 葡萄糖去向切換 (塊根 / 根系 / 花 / 果 / 頂芽)
    fateRootBtn.onclick = () => {
      state.fate = 'root';
      updateFateButtons();
    };

    if (fateRootGrowthBtn) {
      fateRootGrowthBtn.onclick = () => {
        state.fate = 'root_growth';
        updateFateButtons();
      };
    }

    fateFlowerBtn.onclick = () => {
      state.fate = 'flower';
      updateFateButtons();
    };

    fateFruitBtn.onclick = () => {
      state.fate = 'fruit';
      updateFateButtons();
    };

    fateShootBtn.onclick = () => {
      state.fate = 'shoot';
      updateFateButtons();
    };

    // 根部養分再動員轉運至花朵、果實或頂芽
    if (rootToFlowerBtn) {
      rootToFlowerBtn.onclick = () => remobilizeRootNutrient('flower');
    }
    if (rootToFruitBtn) {
      rootToFruitBtn.onclick = () => remobilizeRootNutrient('fruit');
    }
    if (rootToShootBtn) {
      rootToShootBtn.onclick = () => remobilizeRootNutrient('shoot');
    }

    // 防止平板與觸控裝置連續點擊造成視窗放大 (Double-tap to zoom)
    let lastTouchEndTime = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEndTime <= 350) {
        // 阻止瀏覽器預設的雙擊放大視圖行為
        e.preventDefault();
        // 若使用者連點的是按鈕或控制項，手動觸發點擊確保不漏失點擊操作
        const btn = e.target.closest('button, [role="button"], a');
        if (btn && typeof btn.click === 'function') {
          btn.click();
        }
      }
      lastTouchEndTime = now;
    }, { passive: false });

    // 防止平板多指觸控縮放 (Pinch-to-zoom)
    document.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // 防止 Safari 專屬手勢事件縮放視窗
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());
  }

  function updateFateButtons() {
    fateRootBtn.classList.toggle('active', state.fate === 'root');
    if (fateRootGrowthBtn) fateRootGrowthBtn.classList.toggle('active', state.fate === 'root_growth');
    fateFlowerBtn.classList.toggle('active', state.fate === 'flower');
    fateFruitBtn.classList.toggle('active', state.fate === 'fruit');
    fateShootBtn.classList.toggle('active', state.fate === 'shoot');
  }

  function init() {
    initEvents();
    setInsetMode('guardCell');
    updateLightButtons();
    updateSubtitleButtons();
    updateRemobilizeButtonStates();
    updateFateButtons();

    // 預設啟動「真實生理」模式 (日間光照下所有步驟動畫同時進行)
    setRunMode('parallel');

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

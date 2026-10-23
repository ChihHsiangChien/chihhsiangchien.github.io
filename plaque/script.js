/**
 * 動脈粥狀硬化斑塊 (Plaque)、血栓形成與支架治療動態互動模擬
 * Pure Vanilla JS + HTML5 Canvas (無須 Node.js，支援觸控平板與桌面滑鼠)
 */

(() => {
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // UI 元素綁定
  const stepButtons = document.querySelectorAll('.step-item');
  const stageBadge = document.getElementById('canvas-stage-badge');
  const stageProgressFill = document.getElementById('stage-progress-fill');
  const canvasPrompt = document.getElementById('canvas-prompt');
  const microTooltip = document.getElementById('micro-tooltip');
  const tooltipTitle = document.getElementById('tooltip-title');
  const tooltipDesc = document.getElementById('tooltip-desc');
  const tooltipClose = document.getElementById('tooltip-close');

  const btnAuto = document.getElementById('btn-auto');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnStageAction = document.getElementById('btn-stage-action');
  const btnSpawnLDL = document.getElementById('btn-spawn-ldl');
  const btnSpawnImmune = document.getElementById('btn-spawn-immune');
  const btnSpawnHDL = document.getElementById('btn-spawn-hdl');
  const btnStentTherapy = document.getElementById('btn-stent-therapy');
  const btnStatinTherapy = document.getElementById('btn-statin-therapy');

  const ldlSlider = document.getElementById('ldl-slider');
  const ldlVal = document.getElementById('ldl-val');
  const bpSlider = document.getElementById('bp-slider');
  const bpVal = document.getElementById('bp-val');

  const infoStageTag = document.getElementById('info-stage-tag');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoBullets = document.getElementById('info-bullets');

  const metricLumenText = document.getElementById('metric-lumen-text');
  const metricLumenBar = document.getElementById('metric-lumen-bar');
  const metricPlaqueText = document.getElementById('metric-plaque-text');
  const metricPlaqueBar = document.getElementById('metric-plaque-bar');
  const metricInflamText = document.getElementById('metric-inflam-text');
  const metricInflamBar = document.getElementById('metric-inflam-bar');
  const metricClotText = document.getElementById('metric-clot-text');
  const metricClotBar = document.getElementById('metric-clot-bar');

  const legendItems = document.querySelectorAll('.legend-item');
  const btnClearFocus = document.getElementById('btn-clear-focus');

  // 跨瀏覽器相容圓角矩形繪製 (避免舊版 iPad Safari 不支援 ctx.roundRect 報錯)
  function drawRoundedRectPath(context, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    context.beginPath();
    context.moveTo(x + rad, y);
    context.lineTo(x + w - rad, y);
    context.quadraticCurveTo(x + w, y, x + w, y + rad);
    context.lineTo(x + w, y + h - rad);
    context.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    context.lineTo(x + rad, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - rad);
    context.lineTo(x, y + rad);
    context.quadraticCurveTo(x, y, x + rad, y);
    context.closePath();
  }

  // 7個病理與治療階段資料定義
  const STAGES = [
    {
      tag: 'STAGE 01',
      badge: '階段 1：健康動脈與正常血流',
      title: '健康動脈與正常血流',
      desc: '健康的動脈管壁由內而外分為內膜（含緊密排列的內皮細胞）、中膜（富含具彈性的平滑肌細胞）與外膜。血液中的紅血球、少量膽固醇與免疫細胞順暢通過，互不沾黏。',
      bullets: [
        '<strong>完整內皮屏障：</strong>內皮細胞緊密排列，釋放一氧化氮 (NO) 維持血管舒張並抑制血球黏附。',
        '<strong>正常脂質運輸：</strong>低密度脂蛋白 (LDL) 在血液中平穩流動，不會穿過健康內皮滯留。',
        '<strong>平滑肌彈性：</strong>中膜平滑肌隨心臟搏動規律舒張，維持穩定血壓。'
      ],
      actionText: '⚡ 造成內皮受損與高膽固醇 (進入階段 2)',
      prompt: '👆 點選畫布中的細胞可查看顯微說明；點擊下方按鈕或調高 LDL 滑桿開始病變！',
      targetPlaqueHeight: 0,
      duration: 13
    },
    {
      tag: 'STAGE 02',
      badge: '階段 2：內皮受損與膽固醇滲入氧化',
      title: '內皮受損與 LDL 膽固醇滲入氧化',
      desc: '高血壓、吸菸、高血糖或氧化壓力會損傷血管內皮細胞，使其間隙變大。血液中過多的低密度脂蛋白膽固醇 (LDL) 趁機鑽入內膜下層 (Intima)，並被自由基氧化成「氧化型膽固醇 (ox-LDL)」。',
      bullets: [
        '<strong>內皮功能障礙：</strong>受損內皮細胞間隙擴大，並在表面表現黏附分子 (VCAM-1)。',
        '<strong>LDL 滲入滯留：</strong>黃色 LDL 顆粒穿過內皮縫隙，卡在內膜下層的細胞外基質中。',
        '<strong>脂質氧化 (ox-LDL)：</strong>活性氧自由基將 LDL 氧化為深橘紅色的 ox-LDL，刺激內皮發出發炎求救訊號。'
      ],
      actionText: '🛡️ 招募免疫單核球吞噬 (進入階段 3)',
      prompt: '💡 黃色 LDL 正穿過受損內皮並氧化成深橘色 ox-LDL！點選「召喚免疫巨噬細胞」觀察白血球反應。',
      targetPlaqueHeight: 28,
      duration: 15
    },
    {
      tag: 'STAGE 03',
      badge: '階段 3：免疫細胞招募與巨噬細胞吞噬',
      title: '免疫細胞招募與巨噬細胞吞噬作用',
      desc: '受損內皮釋放趨化因子，吸引血液中的單核球（白血球的一種）黏附並鑽入內膜下層。單核球隨即分化為「巨噬細胞 (Macrophages)」，展開清道夫受體大口吞噬氧化膽固醇 (ox-LDL)。',
      bullets: [
        '<strong>滾動、黏附與穿出：</strong>紫色單核球被受損內皮表面的黏附分子捕獲，變形鑽入血管壁內膜。',
        '<strong>分化為巨噬細胞：</strong>進入內膜後伸出偽足，主動追逐並吞噬具有毒性的 ox-LDL。',
        '<strong>發炎正回饋：</strong>巨噬細胞吞噬脂質後釋放細胞激素 (Cytokines)，召集更多免疫細胞前來。'
      ],
      actionText: '🫧 形成泡沫細胞與纖維帽 (進入階段 4)',
      prompt: '💡 紫色巨噬細胞正在內膜中追逐並吞噬氧化膽固醇！可點選「派遣好膽固醇 (HDL)」幫忙清除。',
      targetPlaqueHeight: 62,
      duration: 16
    },
    {
      tag: 'STAGE 04',
      badge: '階段 4：泡沫細胞堆積與纖維斑塊形成',
      title: '泡沫細胞、脂質核心與纖維帽斑塊',
      desc: '巨噬細胞無節制地吞噬 ox-LDL 後，細胞質塞滿油滴變成肥大的「泡沫細胞 (Foam Cells)」。大量泡沫細胞堆積與凋亡形成黃色粥狀「脂質壞死核心」，同時平滑肌細胞向上遷移分泌膠原蛋白，築起「纖維帽」。',
      bullets: [
        '<strong>泡沫細胞與脂質核心：</strong>吞飽膽固醇的巨噬細胞無法代謝脂質，死亡後釋出膽固醇結晶形成粥狀核心。',
        '<strong>平滑肌遷移與纖維帽：</strong>中膜平滑肌細胞移至斑塊頂部形成白色纖維帽，試圖封住脂質核心。',
        '<strong>動脈管腔狹窄：</strong>隆起的斑塊壓迫血管通道，導致血流加速與湍流，下游器官供血受限（心絞痛）。'
      ],
      actionText: '💥 削弱纖維帽並觸發斑塊破裂 (進入階段 5)',
      prompt: '💡 泡沫細胞已堆積成大型粥狀斑塊並覆蓋纖維帽，管腔明顯狹窄！點選下方按鈕模擬斑塊破裂。',
      targetPlaqueHeight: 112,
      duration: 16
    },
    {
      tag: 'STAGE 05',
      badge: '階段 5：斑塊不穩定與纖維帽破裂',
      title: '易損斑塊 (Vulnerable Plaque) 與破裂',
      desc: '斑塊內持續發炎，巨噬細胞與泡沫細胞分泌基質金屬蛋白酶 (MMPs) 分解膠原蛋白，使纖維帽變薄、脆化。在高血壓強大血流剪應力衝擊下，纖維帽發生破裂，高度致凝血的脂質核心直接暴露於血液中！',
      bullets: [
        '<strong>纖維帽薄化：</strong>發炎酵素降解膠原蛋白，且平滑肌細胞凋亡，使斑塊頂部脆弱不堪。',
        '<strong>血流剪應力衝擊：</strong>狹窄處的高速高壓血流撕裂纖維帽肩部，造成斑塊破裂 (Plaque Rupture)。',
        '<strong>組織因子暴露：</strong>斑塊內部的組織因子 (Tissue Factor) 與膠原蛋白噴出，瞬間拉響血液凝固警報！'
      ],
      actionText: '🩸 啟動血小板與血栓阻塞 (進入階段 6)',
      prompt: '⚠️ 警報：纖維帽已破裂！脂質碎片與凝血因子暴露於血液中，血小板開始緊急向裂口聚集！',
      targetPlaqueHeight: 122,
      duration: 14
    },
    {
      tag: 'STAGE 06',
      badge: '階段 6：血小板聚集與血栓形成 (血管阻塞)',
      title: '血小板活化、纖維蛋白網與血栓阻塞',
      desc: '身體誤以為斑塊破裂是血管外傷，血小板瞬間黏附於裂口並伸出偽足活化，同時凝血級聯反應產生交織的「纖維蛋白網 (Fibrin Mesh)」，攔截大量紅血球形成「血栓 (Thrombus)」，嚴重阻塞動脈血流！',
      bullets: [
        '<strong>血小板活化聚集：</strong>血小板接觸破裂處膠原蛋白後變為星芒狀，釋放 ADP 與血栓素 A2 召集同伴。',
        '<strong>纖維蛋白血栓 (Thrombus)：</strong>凝血酶將纖維蛋白原轉為堅固網狀結構，困住紅血球形成紅色血栓。',
        '<strong>急性缺血危機：</strong>血管通道幾乎堵死（心肌梗塞或腦中風），請立即點擊下方「氣球擴張與支架」或「降脂藥 + 溶栓」進行搶救！'
      ],
      actionText: '🎈 進行心導管支架與溶栓搶救 (進入階段 7)',
      prompt: '🚨 血管急性阻塞！請點選下方發光的「🎈 氣球擴張與血管支架」或「💊 降脂藥穩定斑塊 + 溶栓」搶救血管！',
      targetPlaqueHeight: 126,
      duration: 18
    },
    {
      tag: 'STAGE 07',
      badge: '階段 7：醫療介入：溶栓、氣球擴張與血管支架 (Stent)',
      title: '末期斑塊之醫療搶救：支架擴張與斑塊穩定化',
      desc: '末期鈣化與纖維化的斑塊雖無法 100% 憑空消失，但可透過：(1) 溶栓劑 (tPA) 溶解血栓；(2) 心導管氣球擴張術將斑塊壓平，並置放「金屬網狀支架 (Stent)」永久撐開血管；(3) 強效降脂藥 (Statin) 搭配 HDL 縮小脂質核心並加厚纖維帽，使斑塊轉為安全穩定狀態！',
      bullets: [
        '<strong>心導管氣球擴張與支架 (PCI & Stent)：</strong>導管氣球充氣將隆起斑塊物理壓平，金屬支架永久支撐血管壁防止回彈。',
        '<strong>斑塊穩定與部分消退 (Statin + HDL)：</strong>極低 LDL 環境下，HDL 抽走部分膽固醇，泡沫細胞減少約 10~15%，纖維帽重新加厚不再破裂。',
        '<strong>可重複操作實驗：</strong>您可隨時點選下方「🎈 氣球擴張與血管支架」或「💊 降脂藥穩定斑塊 + 溶栓」觀察不同治療機制的動態過程！'
      ],
      actionText: '🎈 重新執行氣球擴張與支架置放手術',
      prompt: '✅ 醫療搶救階段：可隨時點選「🎈 氣球擴張與血管支架」或「💊 降脂藥穩定斑塊 + 溶栓」比較兩種治療效果！',
      targetPlaqueHeight: 42,
      duration: 24
    }
  ];

  // 模擬全域狀態
  let currentStage = 0;
  let stageTimer = 0;
  let isAutoPlay = true;
  let isPaused = false;
  let focusedRole = null;
  let simTime = 0;

  // 生理環境與醫療介入參數
  let ldlLevel = 2;
  let bpMultiplier = 1.0;
  let plaqueHeight = 0;
  let capThickness = 0;
  let ruptureState = 0;
  let thrombusSize = 0;
  let clotBusterActive = 0;
  let statinStabilized = false;
  let statinPulseTimer = 0;

  // 畫布頂部動態治療狀態橫幅
  let procedureBanner = {
    text: '',
    color: '#38bdf8',
    timer: 0
  };

  // 心導管氣球擴張與血管支架 (Catheter Balloon & Stent) 動畫狀態
  let stentDeployed = false;
  let stentExpandRatio = 0;
  let catheterState = 'none'; // 'none' | 'entering' | 'inflating' | 'deflating' | 'withdrawing'
  let catheterX = -200;
  let balloonInflate = 0;
  let catheterTimer = 0;

  // 幾何基準座標
  const WALL_TOP_Y = 105;
  const WALL_BOT_BASE_Y = 395;
  const INTIMA_FLOOR_Y = 445;
  const PLAQUE_CENTER_X = 480;
  const PLAQUE_HALF_W = 235;

  // 粒子陣列與特效
  let rbcs = [];
  let ldls = [];
  let hdls = [];
  let immuneCells = [];
  let foamCells = [];
  let smcCells = [];
  let platelets = [];
  let trappedRbcs = [];
  let ruptureDebris = [];
  let drugParticles = []; // 💊 溶栓劑 (tPA) 與降脂藥 (Statin) 藥物微粒動畫
  let floatingTextFX = [];
  let touchRipples = [];
  let selectedEntity = null;

  function showProcedureBanner(text, color = '#38bdf8', duration = 4.5) {
    procedureBanner.text = text;
    procedureBanner.color = color;
    procedureBanner.timer = duration;
  }

  function getLowerEndotheliumY(x, includePulse = true) {
    const inStentZone = stentDeployed && stentExpandRatio > 0.5 && Math.abs(x - PLAQUE_CENTER_X) < 135;
    const pulseAmp = inStentZone ? 1.0 : 3.2 * bpMultiplier;
    const pulse = includePulse ? Math.sin(simTime * 5.2 * bpMultiplier) * pulseAmp : 0;
    const dist = Math.abs(x - PLAQUE_CENTER_X);
    let bulge = 0;
    if (dist < PLAQUE_HALF_W) {
      const norm = dist / PLAQUE_HALF_W;
      bulge = plaqueHeight * Math.pow(Math.cos(norm * Math.PI * 0.5), 1.8);
    }
    return WALL_BOT_BASE_Y - bulge + pulse * 0.5;
  }

  function getUpperEndotheliumY(x, includePulse = true) {
    const inStentZone = stentDeployed && stentExpandRatio > 0.5 && Math.abs(x - PLAQUE_CENTER_X) < 135;
    const pulseAmp = inStentZone ? 1.2 : 3.8 * bpMultiplier;
    const pulse = includePulse ? Math.sin(simTime * 5.2 * bpMultiplier) * pulseAmp : 0;
    return WALL_TOP_Y - pulse;
  }

  function getPlaqueApex() {
    return {
      x: PLAQUE_CENTER_X,
      y: getLowerEndotheliumY(PLAQUE_CENTER_X, false)
    };
  }

  function addFloatingFX(x, y, text, color = '#fde047') {
    if (floatingTextFX.length > 18) floatingTextFX.shift();
    floatingTextFX.push({
      x,
      y,
      text,
      color,
      life: 1.0,
      vy: -0.65
    });
  }

  function addTouchRipple(x, y, color = 'rgba(250, 204, 21, 0.75)') {
    touchRipples.push({ x, y, r: 4, maxR: 34, alpha: 0.9, color });
  }

  // 初始化所有粒子與組織細胞
  function initSimulation() {
    rbcs = [];
    ldls = [];
    hdls = [];
    immuneCells = [];
    foamCells = [];
    smcCells = [];
    platelets = [];
    trappedRbcs = [];
    ruptureDebris = [];
    drugParticles = [];
    floatingTextFX = [];
    touchRipples = [];
    selectedEntity = null;
    stentDeployed = false;
    stentExpandRatio = 0;
    catheterState = 'none';
    balloonInflate = 0;
    statinStabilized = false;
    statinPulseTimer = 0;
    procedureBanner.timer = 0;

    for (let i = 0; i < 48; i++) rbcs.push(createRBC(Math.random() * W));

    const initLDLCount = 12 + ldlLevel * 6;
    for (let i = 0; i < initLDLCount; i++) ldls.push(createLDL(Math.random() * W));

    for (let i = 0; i < 6; i++) hdls.push(createHDL(Math.random() * W));
    for (let i = 0; i < 6; i++) immuneCells.push(createMonocyte(Math.random() * W));
    for (let i = 0; i < 20; i++) platelets.push(createPlatelet(Math.random() * W));

    for (let i = 0; i < 24; i++) {
      const x = 60 + (i / 23) * (W - 120);
      smcCells.push({
        baseX: x,
        baseY: INTIMA_FLOOR_Y + 26 + (i % 2) * 18,
        x: x,
        y: INTIMA_FLOOR_Y + 26 + (i % 2) * 18,
        inCap: false,
        capOffset: (Math.random() - 0.5) * 240
      });
    }
  }

  function createRBC(x) {
    const topY = WALL_TOP_Y + 22;
    const botY = WALL_BOT_BASE_Y - 22;
    return {
      type: 'rbc',
      x: x ?? -20,
      y: topY + Math.random() * (botY - topY),
      vx: 2.2 + Math.random() * 1.4,
      vy: 0,
      r: 10 + Math.random() * 2.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04
    };
  }

  function createLDL(x, forceNearWall = false) {
    const topY = WALL_TOP_Y + 16;
    const botY = getLowerEndotheliumY(x ?? 0, false) - 10;
    const y = forceNearWall
      ? botY - Math.random() * 45
      : topY + Math.random() * Math.max(30, botY - topY);
    return {
      type: 'ldl',
      state: 'blood',
      x: x ?? -15,
      y: y,
      vx: 1.8 + Math.random() * 1.1,
      vy: (Math.random() - 0.5) * 0.5,
      r: 5.2 + Math.random() * 1.3,
      oxTimer: 0,
      targetX: PLAQUE_CENTER_X + (Math.random() - 0.5) * 260,
      targetY: WALL_BOT_BASE_Y + 12 + Math.random() * 26
    };
  }

  function createHDL(x) {
    const topY = WALL_TOP_Y + 20;
    const botY = WALL_BOT_BASE_Y - 25;
    return {
      type: 'hdl',
      state: 'blood',
      x: x ?? -15,
      y: topY + Math.random() * (botY - topY),
      vx: 2.3 + Math.random() * 1.0,
      vy: (Math.random() - 0.5) * 0.5,
      r: 6.2,
      hasCargo: false
    };
  }

  function createMonocyte(x) {
    const topY = WALL_TOP_Y + 28;
    const botY = WALL_BOT_BASE_Y - 18;
    return {
      type: 'monocyte',
      state: 'blood',
      x: x ?? -25,
      y: botY - Math.random() * 75,
      vx: 1.5 + Math.random() * 0.8,
      vy: 0,
      r: 13.5,
      engulfCount: 0,
      maxEngulf: 3,
      phase: Math.random() * Math.PI * 2,
      targetX: PLAQUE_CENTER_X + (Math.random() - 0.5) * 230,
      targetY: WALL_BOT_BASE_Y + 14 + Math.random() * 24
    };
  }

  function createPlatelet(x) {
    const topY = WALL_TOP_Y + 18;
    const botY = WALL_BOT_BASE_Y - 18;
    return {
      type: 'platelet',
      state: 'blood',
      x: x ?? -15,
      y: topY + Math.random() * (botY - topY),
      vx: 2.5 + Math.random() * 1.2,
      vy: 0,
      r: 4.8,
      angle: Math.random() * Math.PI * 2,
      targetX: 0,
      targetY: 0
    };
  }

  // 更新UI按鈕與標籤（不強制重置正在進行的治療動畫）
  function syncStageUI() {
    const st = STAGES[currentStage];

    stepButtons.forEach((btn, idx) => {
      const isAct = idx === currentStage;
      btn.classList.toggle('active', isAct);
      btn.classList.toggle('completed', idx < currentStage);
      if (isAct && btn.scrollIntoView) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });

    stageBadge.textContent = st.badge;
    infoStageTag.textContent = st.tag;
    infoTitle.textContent = st.title;
    infoDesc.textContent = st.desc;
    infoBullets.innerHTML = st.bullets.map(b => `<li>${b}</li>`).join('');
    btnStageAction.textContent = st.actionText;
    btnStageAction.classList.toggle('rescue-mode', currentStage >= 5);
    canvasPrompt.textContent = st.prompt;

    // 在末期階段 (階段 5/6/7) 高亮提示兩個醫療搶救按鈕
    const isLateStage = currentStage >= 4;
    btnStentTherapy.classList.toggle('btn-recommend-rescue', isLateStage);
    btnStatinTherapy.classList.toggle('btn-recommend-rescue', isLateStage);

    btnPrev.disabled = currentStage === 0;
    btnNext.disabled = currentStage === STAGES.length - 1;
  }

  // 切換至指定階段
  function setStage(stageIdx) {
    currentStage = Math.max(0, Math.min(STAGES.length - 1, stageIdx));
    stageTimer = 0;
    syncStageUI();
    setupStageEntities(currentStage);
  }

  function setupStageEntities(stageIdx) {
    if (stageIdx < 6) {
      stentDeployed = false;
      stentExpandRatio = 0;
      catheterState = 'none';
      balloonInflate = 0;
      statinStabilized = false;
      drugParticles = [];
    }

    if (stageIdx === 0) {
      plaqueHeight = 0;
      capThickness = 0;
      ruptureState = 0;
      thrombusSize = 0;
      foamCells = [];
      trappedRbcs = [];
      ruptureDebris = [];
      ldls.forEach(l => { l.state = 'blood'; l.y = WALL_TOP_Y + 30 + Math.random() * 200; });
      immuneCells = immuneCells.slice(0, 6);
      immuneCells.forEach(m => {
        m.state = 'blood';
        m.engulfCount = 0;
        m.r = 13.5;
        m.y = WALL_TOP_Y + 40 + Math.random() * 220;
      });
      platelets.forEach(p => { p.state = 'blood'; });
      smcCells.forEach(s => { s.inCap = false; });
    } else if (stageIdx === 1) {
      if (ldlLevel < 3) {
        ldlSlider.value = 4;
        updateSlidersUI();
      }
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });

      let intimaCount = ldls.filter(l => l.state !== 'blood').length;
      for (let i = intimaCount; i < 14; i++) {
        const l = createLDL(PLAQUE_CENTER_X + (Math.random() - 0.5) * 240, true);
        l.state = i % 2 === 0 ? 'oxidized' : 'intima';
        l.x = PLAQUE_CENTER_X + (Math.random() - 0.5) * 240;
        l.y = WALL_BOT_BASE_Y + 6 + Math.random() * 26;
        l.oxTimer = i % 2 === 0 ? 1.0 : 0.4;
        ldls.push(l);
      }
    } else if (stageIdx === 2) {
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });

      let oxCount = ldls.filter(l => l.state !== 'blood').length;
      for (let i = oxCount; i < 18; i++) {
        const l = createLDL(PLAQUE_CENTER_X + (Math.random() - 0.5) * 250, true);
        l.state = 'oxidized';
        l.oxTimer = 1;
        l.x = PLAQUE_CENTER_X + (Math.random() - 0.5) * 250;
        l.y = WALL_BOT_BASE_Y - 15 + Math.random() * 45;
        ldls.push(l);
      }

      let macCount = immuneCells.filter(m => m.state === 'macrophage' || m.state === 'diapedesis').length;
      for (let i = macCount; i < 5; i++) {
        const m = createMonocyte(PLAQUE_CENTER_X + (Math.random() - 0.5) * 200);
        m.state = i < 3 ? 'macrophage' : 'diapedesis';
        m.x = PLAQUE_CENTER_X + (Math.random() - 0.5) * 190;
        m.y = i < 3 ? WALL_BOT_BASE_Y + 5 + Math.random() * 22 : getLowerEndotheliumY(m.x, false);
        immuneCells.push(m);
      }
    } else if (stageIdx === 3) {
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });
      ensureFoamAndCap(14);
    } else if (stageIdx === 4) {
      ensureFoamAndCap(18);
      ruptureState = Math.max(ruptureState, 0.45);
      thrombusSize = 0;
      trappedRbcs = [];
      spawnRuptureDebris();
    } else if (stageIdx === 5) {
      ensureFoamAndCap(18);
      plaqueHeight = Math.max(plaqueHeight, 122);
      ruptureState = 1.0;
      thrombusSize = Math.max(thrombusSize, 0.65);
      spawnRuptureDebris();
      populateThrombus(16);
    } else if (stageIdx === 6) {
      // 階段 7：醫療介入（氣球擴張支架 + 溶栓）
      startStentAndMedicalRescue();
    }
  }

  function populateThrombus(count = 15) {
    const apex = getPlaqueApex();
    let actCount = 0;
    platelets.forEach(p => {
      if (actCount < count) {
        p.state = 'activated';
        p.targetX = apex.x + (Math.random() - 0.45) * 85;
        p.targetY = apex.y - 8 - Math.random() * 55;
        p.x = p.targetX + (Math.random() - 0.5) * 16;
        p.y = p.targetY + (Math.random() - 0.5) * 16;
        actCount++;
      }
    });
    while (trappedRbcs.length < 12) {
      trappedRbcs.push({
        x: apex.x + (Math.random() - 0.5) * 78,
        y: apex.y - 12 - Math.random() * 65,
        r: 10.5,
        angle: Math.random() * Math.PI
      });
    }
  }

  // ==================== 🎈 醫療介入 1：心導管氣球擴張與血管支架 (PCI & Stent) ====================
  function startStentAndMedicalRescue() {
    // 若使用者正在自動播放中手動點選治療，延長本階段時間避免瞬間跳走
    stageTimer = 0;
    currentStage = 6;
    syncStageUI();

    // 確保有一個明顯隆起的末期斑塊讓氣球壓平（這樣每次點擊都能清楚看到壓平與支架撐開過程！）
    ensureFoamAndCap(16);
    plaqueHeight = 122;
    foamCells.forEach((fc, idx) => {
      const distRatio = Math.abs(fc.offsetX) / 145;
      fc.offsetY = 18 + (idx % 5) * 13 * Math.max(0.25, 1 - distRatio * distRatio);
    });

    // 重置支架展開比例，從頭播放導管進入 -> 氣球充氣 -> 支架撐開鎖定 -> 氣球退出
    stentDeployed = true;
    stentExpandRatio = 0.08;
    catheterState = 'entering';
    catheterX = -180;
    balloonInflate = 0;
    catheterTimer = 0;

    // 同步啟動溶栓與穩定化
    clotBusterActive = 5.5;
    statinStabilized = true;
    ldlSlider.value = 1;
    bpSlider.value = 1.0;
    updateSlidersUI();

    showProcedureBanner('🎈 [1/3] 心導管與氣球進入狹窄動脈，準備擴張斑塊並置放支架...', '#38bdf8', 5.5);
    const apex = getPlaqueApex();
    addFloatingFX(apex.x, apex.y - 42, '🎈 心導管氣球進入！', '#60a5fa');
  }

  // ==================== 💊 醫療介入 2：強效降脂藥 (Statin) + 溶栓劑 (tPA) ====================
  function triggerStatinAndThrombolysis() {
    stageTimer = 0;
    // 若在早期階段按下，自動佈置末期斑塊與血栓場景，讓使用者能清楚看到藥物溶栓與穩定斑塊的完整效果
    if (currentStage < 3) {
      currentStage = 5;
      syncStageUI();
    }

    ensureFoamAndCap(16);
    // 若當前已經沒有血栓且斑塊已被支架壓平，恢復部分血栓與斑塊高度以便清楚展示藥物作用
    if (thrombusSize < 0.25 && (!stentDeployed || currentStage === 5)) {
      plaqueHeight = Math.max(plaqueHeight, 115);
      ruptureState = 0.85;
      thrombusSize = 0.72;
      populateThrombus(14);
    }

    clotBusterActive = 6.0;
    statinStabilized = true;
    statinPulseTimer = 4.5;
    ldlSlider.value = 1;
    updateSlidersUI();

    // 產生 28 顆發光藥物微粒 (半數為青白色 tPA 溶栓酶，半數為翠綠色 Statin 降脂分子)
    drugParticles = [];
    const apex = getPlaqueApex();
    for (let i = 0; i < 28; i++) {
      const isTPA = i % 2 === 0;
      const targetX = isTPA
        ? apex.x + (Math.random() - 0.5) * 90
        : PLAQUE_CENTER_X + (Math.random() - 0.5) * 220;
      const targetY = isTPA
        ? apex.y - 12 - Math.random() * 55
        : getLowerEndotheliumY(targetX, false) + 10 + Math.random() * 25;

      drugParticles.push({
        kind: isTPA ? 'tpa' : 'statin',
        x: -10 - Math.random() * 220,
        y: WALL_TOP_Y + 30 + Math.random() * (WALL_BOT_BASE_Y - WALL_TOP_Y - 60),
        targetX,
        targetY,
        vx: 4.5 + Math.random() * 2.2,
        r: isTPA ? 5.5 : 6.0,
        arrived: false,
        life: 1.0
      });
    }

    // 同時派遣 6 顆 HDL 清道夫進入內膜抽走膽固醇
    for (let i = 0; i < 6; i++) {
      const h = createHDL(PLAQUE_CENTER_X - 240 - i * 32);
      h.state = 'scavenging';
      hdls.push(h);
    }

    showProcedureBanner('💊 正在施打 tPA 溶栓劑與 Statin 降脂藥：溶解血栓網、清除氧化脂質並加厚穩定纖維帽！', '#34d399', 5.5);
    addFloatingFX(apex.x, apex.y - 48, '💉 藥物微粒湧入！溶解血栓 & 加厚纖維帽', '#34d399');
  }

  function ensureFoamAndCap(targetFoamCount) {
    if (plaqueHeight < 65 && currentStage < 6) plaqueHeight = 75;
    while (foamCells.length < targetFoamCount) {
      const spreadX = (Math.random() - 0.5) * 250;
      const distRatio = Math.abs(spreadX) / 145;
      const maxH = Math.max(12, (1 - distRatio * distRatio) * 75);
      foamCells.push({
        type: 'foam',
        offsetX: spreadX,
        offsetY: 12 + Math.random() * maxH,
        r: 14 + Math.random() * 4.5,
        droplets: 5 + Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2
      });
    }
    smcCells.forEach((s, idx) => {
      if (idx % 3 === 0) s.inCap = true;
    });
  }

  function spawnRuptureDebris() {
    const apex = getPlaqueApex();
    for (let i = 0; i < 12; i++) {
      ruptureDebris.push({
        x: apex.x + (Math.random() - 0.5) * 34,
        y: apex.y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.2) * 1.8,
        vy: -0.8 - Math.random() * 1.6,
        r: 3 + Math.random() * 2.5,
        life: 1.0
      });
    }
    addFloatingFX(apex.x, apex.y - 24, '💥 纖維帽破裂！組織因子暴露', '#f87171');
  }

  function updateSlidersUI() {
    ldlLevel = parseInt(ldlSlider.value, 10);
    const ldlLabels = ['極低(藥物控制)', '正常', '偏高', '高血脂', '極危險'];
    ldlVal.textContent = ldlLabels[ldlLevel - 1] || '正常';

    bpMultiplier = parseFloat(bpSlider.value);
    const sys = Math.round(90 + bpMultiplier * 42);
    const dia = Math.round(60 + bpMultiplier * 24);
    bpVal.textContent = `${sys}/${dia}`;
  }

  // 主更新迴圈
  function updateSimulation(dt) {
    simTime += dt;

    if (procedureBanner.timer > 0) {
      procedureBanner.timer = Math.max(0, procedureBanner.timer - dt);
    }
    if (statinPulseTimer > 0) {
      statinPulseTimer = Math.max(0, statinPulseTimer - dt);
    }

    // 自動階段推進計時 (在階段 6 血栓阻塞若正在施打藥物則暫緩跳轉，讓使用者看清楚效果)
    if (isAutoPlay && catheterState === 'none' && drugParticles.length === 0) {
      const stageDur = STAGES[currentStage].duration;
      stageTimer += dt;
      const pct = Math.min(100, (stageTimer / stageDur) * 100);
      stageProgressFill.style.width = `${pct}%`;
      if (stageTimer >= stageDur) {
        if (currentStage < STAGES.length - 1) {
          setStage(currentStage + 1);
        } else {
          stageTimer = stageDur;
        }
      }
    } else if (!isAutoPlay) {
      stageProgressFill.style.width = '0%';
    }

    // 更新心導管氣球與血管支架動畫狀態機
    if (catheterState === 'entering') {
      catheterX += (PLAQUE_CENTER_X - catheterX) * 0.12;
      if (Math.abs(PLAQUE_CENTER_X - catheterX) < 3) {
        catheterX = PLAQUE_CENTER_X;
        catheterState = 'inflating';
        catheterTimer = 0;
        showProcedureBanner('🎈 [2/3] 氣球高壓充氣擴張！物理壓平末期斑塊並撐開金屬網狀支架...', '#38bdf8', 4.0);
        addFloatingFX(PLAQUE_CENTER_X, WALL_TOP_Y + 95, '🎈 氣球充氣擴張！壓平斑塊並撐開支架', '#38bdf8');
      }
    } else if (catheterState === 'inflating') {
      catheterTimer += dt;
      balloonInflate = Math.min(1.0, balloonInflate + dt * 0.72);
      stentExpandRatio = Math.max(stentExpandRatio, balloonInflate);
      // 氣球充氣物理壓平斑塊與泡沫細胞高度
      plaqueHeight += (40 - plaqueHeight) * dt * 2.8;
      foamCells.forEach(fc => {
        if (fc.offsetY > 26) fc.offsetY += (20 - fc.offsetY) * dt * 3.0;
      });
      if (catheterTimer > 2.6) {
        catheterState = 'deflating';
        catheterTimer = 0;
        showProcedureBanner('✅ [3/3] 血管支架 (Stent) 永久固定完成！氣球洩氣撤出，恢復 85% 以上順暢血流！', '#34d399', 5.0);
        addFloatingFX(PLAQUE_CENTER_X, WALL_TOP_Y + 95, '✨ 血管支架鎖定完成！氣球洩氣退出', '#34d399');
      }
    } else if (catheterState === 'deflating') {
      balloonInflate = Math.max(0, balloonInflate - dt * 1.4);
      if (balloonInflate <= 0.02) {
        catheterState = 'withdrawing';
      }
    } else if (catheterState === 'withdrawing') {
      catheterX -= 420 * dt;
      if (catheterX < -200) {
        catheterState = 'none';
      }
    }

    // 更新 💊 藥物微粒 (tPA 溶栓酶 & Statin 降脂分子)
    for (let i = drugParticles.length - 1; i >= 0; i--) {
      const dp = drugParticles[i];
      if (!dp.arrived) {
        const dx = dp.targetX - dp.x;
        const dy = dp.targetY - dp.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 14) {
          dp.arrived = true;
          addTouchRipple(dp.x, dp.y, dp.kind === 'tpa' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(52, 211, 153, 0.85)');
          if (dp.kind === 'tpa') {
            thrombusSize = Math.max(0, thrombusSize - 0.06);
            if (trappedRbcs.length > 0 && Math.random() < 0.45) {
              trappedRbcs.pop();
            }
          } else {
            // Statin 清除內膜游離氧化膽固醇並縮小部分泡沫細胞
            const oxIdx = ldls.findIndex(l => l.state !== 'blood');
            if (oxIdx !== -1) ldls.splice(oxIdx, 1);
            else if (foamCells.length > 7 && Math.random() < 0.35) foamCells.pop();
          }
        } else {
          dp.x += (dx / dist) * dp.vx;
          dp.y += (dy / dist) * dp.vx;
        }
      } else {
        dp.life -= dt * 1.4;
        if (dp.life <= 0) {
          drugParticles.splice(i, 1);
        }
      }
    }

    // 計算目標斑塊高度並平滑過渡
    let targetH = STAGES[currentStage].targetPlaqueHeight;
    if (stentDeployed && stentExpandRatio > 0.5) {
      targetH = 40;
    } else if (statinStabilized && currentStage >= 3) {
      targetH = Math.min(targetH, 76); // 藥物讓斑塊部分消退並穩定
    } else if (currentStage >= 1 && currentStage < 6) {
      targetH = Math.max(targetH, Math.min(130, foamCells.length * 4.5 + 18));
    }
    plaqueHeight += (targetH - plaqueHeight) * dt * 1.4;

    // 纖維帽厚度演變
    const targetCap = statinStabilized
      ? 1.2
      : currentStage === 3
      ? 1.0
      : currentStage >= 4 && currentStage <= 5
      ? 0.42
      : currentStage === 2
      ? 0.35
      : 0;
    capThickness += (targetCap - capThickness) * dt * 1.5;

    // 破裂狀態演變
    if (statinStabilized || currentStage === 6) {
      ruptureState = Math.max(0, ruptureState - dt * 2.2);
    } else if (currentStage === 4) {
      ruptureState = Math.min(1.0, ruptureState + dt * 0.25);
    } else if (currentStage === 5) {
      ruptureState = 1.0;
    } else {
      ruptureState = Math.max(0, ruptureState - dt * 2.0);
    }

    // 血栓大小演變
    if (clotBusterActive > 0 || currentStage === 6) {
      clotBusterActive = Math.max(0, clotBusterActive - dt);
      thrombusSize = Math.max(0, thrombusSize - dt * 0.55);
      if (thrombusSize < 0.15 && trappedRbcs.length > 0) {
        trappedRbcs = [];
      }
    } else if (currentStage === 5 && !statinStabilized) {
      const activatedCount = platelets.filter(p => p.state === 'activated').length;
      const targetThrombus = Math.min(0.95, 0.25 + activatedCount * 0.035);
      thrombusSize += (targetThrombus - thrombusSize) * dt * 0.85;
    } else if (currentStage < 5) {
      thrombusSize = Math.max(0, thrombusSize - dt * 1.8);
    }

    const apex = getPlaqueApex();
    const blockageFactor = thrombusSize > 0.55 ? Math.max(0.18, 1 - thrombusSize * 0.82) : 1.0;

    // 1. 更新紅血球 (RBCs)
    rbcs.forEach(rbc => {
      const upperY = getUpperEndotheliumY(rbc.x) + rbc.r + 6;
      let lowerY = getLowerEndotheliumY(rbc.x) - rbc.r - 6;

      if (thrombusSize > 0.05 && Math.abs(rbc.x - apex.x) < 75 * thrombusSize) {
        const clotTopY = apex.y - thrombusSize * 115;
        if (
          currentStage === 5 &&
          clotBusterActive <= 0 &&
          !statinStabilized &&
          trappedRbcs.length < 22 &&
          rbc.y > clotTopY - 12 &&
          Math.random() < 0.08
        ) {
          trappedRbcs.push({
            x: apex.x + (Math.random() - 0.5) * 90 * thrombusSize,
            y: apex.y - 10 - Math.random() * 85 * thrombusSize,
            r: rbc.r,
            angle: rbc.angle
          });
          rbc.x = -20;
          return;
        }
        lowerY = Math.min(lowerY, clotTopY);
      }

      const inNarrow = Math.abs(rbc.x - PLAQUE_CENTER_X) < 130;
      const venturiBoost = inNarrow && thrombusSize < 0.4 ? 1 + (plaqueHeight / 140) * 0.85 : 1.0;
      const upstreamSlow = rbc.x < PLAQUE_CENTER_X - 40 && thrombusSize > 0.5 ? 0.35 : 1.0;

      rbc.x += rbc.vx * bpMultiplier * venturiBoost * blockageFactor * upstreamSlow;
      rbc.angle += rbc.spin * bpMultiplier;

      if (rbc.y > lowerY) {
        rbc.y = lowerY;
        rbc.vy = -Math.abs(rbc.vy) * 0.5 - 0.6;
      } else if (rbc.y < upperY) {
        rbc.y = upperY;
        rbc.vy = Math.abs(rbc.vy) * 0.5 + 0.6;
      } else {
        if (rbc.x > PLAQUE_CENTER_X - PLAQUE_HALF_W && rbc.x < PLAQUE_CENTER_X && rbc.y > lowerY - 35) {
          rbc.vy -= 0.14 * (plaqueHeight / 90);
        } else if (rbc.x > PLAQUE_CENTER_X && rbc.x < PLAQUE_CENTER_X + PLAQUE_HALF_W && plaqueHeight > 30) {
          rbc.vy += Math.sin(simTime * 8 + rbc.x * 0.05) * 0.08;
        }
        rbc.y += rbc.vy;
        rbc.vy *= 0.94;
      }

      if (rbc.x > W + 25) {
        rbc.x = -25;
        rbc.y = WALL_TOP_Y + 25 + Math.random() * (WALL_BOT_BASE_Y - WALL_TOP_Y - 50);
      }
    });

    // 2. 更新 LDL 膽固醇
    const desiredBloodLDL = 6 + ldlLevel * 7;
    const currentBloodLDL = ldls.filter(l => l.state === 'blood').length;
    if (currentBloodLDL < desiredBloodLDL && Math.random() < 0.25) {
      ldls.push(createLDL(-15, currentStage >= 1 && currentStage <= 5 && Math.random() < 0.55));
    }

    for (let i = ldls.length - 1; i >= 0; i--) {
      const l = ldls[i];
      const wallY = getLowerEndotheliumY(l.x);

      if (l.state === 'blood') {
        l.x += l.vx * bpMultiplier * blockageFactor;
        l.y += l.vy + Math.sin(simTime * 3 + i) * 0.2;

        const upperY = getUpperEndotheliumY(l.x) + 10;
        if (l.y < upperY) l.y = upperY;

        const inDamagedZone = Math.abs(l.x - PLAQUE_CENTER_X) < 185;
        const intimaLDLCount = ldls.filter(item => item.state !== 'blood').length;
        if (
          currentStage >= 1 &&
          currentStage <= 5 &&
          !statinStabilized &&
          inDamagedZone &&
          l.y > wallY - 26 &&
          intimaLDLCount < 28 &&
          Math.random() < 0.045 * ldlLevel
        ) {
          l.state = 'infiltrating';
          l.targetX = l.x + (Math.random() - 0.5) * 40;
          l.targetY = Math.min(INTIMA_FLOOR_Y - 10, wallY + 14 + Math.random() * Math.max(18, plaqueHeight * 0.55));
        } else if (l.y > wallY - 6) {
          l.y = wallY - 6;
          l.vy = -0.4;
        }

        if (l.x > W + 20) {
          if (currentBloodLDL > desiredBloodLDL) {
            ldls.splice(i, 1);
          } else {
            l.x = -15;
            l.y = WALL_TOP_Y + 25 + Math.random() * (WALL_BOT_BASE_Y - WALL_TOP_Y - 45);
          }
        }
      } else if (l.state === 'infiltrating') {
        l.x += (l.targetX - l.x) * 0.08;
        l.y += (l.targetY - l.y) * 0.08;
        if (Math.hypot(l.targetX - l.x, l.targetY - l.y) < 4) {
          l.state = 'intima';
          l.oxTimer = 0;
        }
      } else if (l.state === 'intima') {
        l.oxTimer += dt * 0.55;
        l.x += Math.sin(simTime * 2 + i) * 0.12;
        const minIntimaY = getLowerEndotheliumY(l.x, false) + 10;
        if (l.y < minIntimaY) l.y = minIntimaY;
        if (l.y > INTIMA_FLOOR_Y - 8) l.y = INTIMA_FLOOR_Y - 8;

        if (l.oxTimer >= 1.0) {
          l.state = 'oxidized';
          if (Math.random() < 0.35) {
            addFloatingFX(l.x, l.y - 8, 'ox-LDL 氧化!', '#fb923c');
          }
        }
      } else if (l.state === 'oxidized') {
        l.x += Math.sin(simTime * 4 + i) * 0.15;
        const minIntimaY = getLowerEndotheliumY(l.x, false) + 10;
        if (l.y < minIntimaY) l.y = minIntimaY;
        if (l.y > INTIMA_FLOOR_Y - 8) l.y = INTIMA_FLOOR_Y - 8;
      }
    }

    // 3. 更新免疫細胞
    const macInIntima = immuneCells.filter(m => m.state === 'macrophage' || m.state === 'diapedesis').length;
    for (let i = immuneCells.length - 1; i >= 0; i--) {
      const m = immuneCells[i];
      m.phase += dt * 3.5;
      const wallY = getLowerEndotheliumY(m.x, false);

      if (m.state === 'blood') {
        m.x += m.vx * bpMultiplier * blockageFactor;
        m.y += Math.sin(m.phase) * 0.3;

        const inInflamedZone = Math.abs(m.x - PLAQUE_CENTER_X) < 170;
        if (currentStage >= 2 && currentStage <= 5 && !statinStabilized && inInflamedZone && macInIntima < 7) {
          m.y += (wallY - 12 - m.y) * 0.045;
          if (Math.abs(m.y - (wallY - 12)) < 10) {
            m.state = 'rolling';
          }
        } else if (m.y > wallY - 14) {
          m.y = wallY - 14;
        }

        if (m.x > W + 30) {
          m.x = -25;
          m.y = WALL_BOT_BASE_Y - 30 - Math.random() * 140;
        }
      } else if (m.state === 'rolling') {
        m.x += 0.45;
        m.y = getLowerEndotheliumY(m.x, false) - 10;
        if (Math.random() < 0.04 || Math.abs(m.x - PLAQUE_CENTER_X) < 60) {
          m.state = 'diapedesis';
          m.targetX = m.x + (Math.random() - 0.5) * 30;
          m.targetY = Math.min(INTIMA_FLOOR_Y - 16, m.y + 32 + Math.random() * 20);
          addFloatingFX(m.x, m.y - 14, '免疫細胞鑽入內膜', '#c084fc');
        }
      } else if (m.state === 'diapedesis') {
        m.x += (m.targetX - m.x) * 0.06;
        m.y += (m.targetY - m.y) * 0.06;
        if (Math.hypot(m.targetX - m.x, m.targetY - m.y) < 5) {
          m.state = 'macrophage';
          m.r = 15.5;
        }
      } else if (m.state === 'macrophage') {
        let nearestLDL = null;
        let minDist = 9999;
        let nearestIdx = -1;

        ldls.forEach((l, lIdx) => {
          if (l.state === 'oxidized' || l.state === 'intima') {
            const d = Math.hypot(l.x - m.x, l.y - m.y);
            if (d < minDist) {
              minDist = d;
              nearestLDL = l;
              nearestIdx = lIdx;
            }
          }
        });

        if (nearestLDL) {
          const dx = nearestLDL.x - m.x;
          const dy = nearestLDL.y - m.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          m.x += (dx / dist) * 1.15;
          m.y += (dy / dist) * 1.15;

          if (dist < m.r + nearestLDL.r) {
            ldls.splice(nearestIdx, 1);
            m.engulfCount++;
            m.r += 1.2;
            addFloatingFX(m.x, m.y - 12, '吞噬 ox-LDL!', '#e879f9');

            if (m.engulfCount >= m.maxEngulf) {
              if (foamCells.length < 28) {
                foamCells.push({
                  type: 'foam',
                  offsetX: m.x - PLAQUE_CENTER_X,
                  offsetY: Math.max(14, INTIMA_FLOOR_Y - m.y),
                  r: 16.5,
                  droplets: 7,
                  phase: Math.random() * Math.PI * 2
                });
              }
              addFloatingFX(m.x, m.y - 16, '🫧 轉化為泡沫細胞!', '#facc15');
              immuneCells.splice(i, 1);
              immuneCells.push(createMonocyte(-25));
              continue;
            }
          }
        } else {
          m.x += Math.cos(m.phase * 0.7) * 0.4;
          m.y += Math.sin(m.phase * 0.9) * 0.3;
        }

        const minM = getLowerEndotheliumY(m.x, false) + m.r + 3;
        if (m.y < minM) m.y = minM;
        if (m.y > INTIMA_FLOOR_Y - m.r) m.y = INTIMA_FLOOR_Y - m.r;
        if (m.x < PLAQUE_CENTER_X - PLAQUE_HALF_W + 30) m.x = PLAQUE_CENTER_X - PLAQUE_HALF_W + 30;
        if (m.x > PLAQUE_CENTER_X + PLAQUE_HALF_W - 30) m.x = PLAQUE_CENTER_X + PLAQUE_HALF_W - 30;
      }
    }

    // 4. 更新 HDL 清道夫
    for (let i = hdls.length - 1; i >= 0; i--) {
      const h = hdls[i];
      const wallY = getLowerEndotheliumY(h.x, false);

      if (h.state === 'blood') {
        h.x += h.vx * bpMultiplier;
        h.y += h.vy;
        if (h.y > wallY - 10) h.y = wallY - 10;
        if (h.y < WALL_TOP_Y + 14) h.y = WALL_TOP_Y + 14;

        if (h.x > W + 20) {
          if (hdls.length > 7) {
            hdls.splice(i, 1);
          } else {
            h.x = -15;
            h.y = WALL_TOP_Y + 30 + Math.random() * 200;
            h.hasCargo = false;
          }
        }
      } else if (h.state === 'scavenging') {
        const targetX = PLAQUE_CENTER_X + (Math.sin(i * 3.1) * 110);
        const targetY = wallY + 22;
        h.x += (targetX - h.x) * 0.055;
        h.y += (targetY - h.y) * 0.055;

        if (Math.hypot(targetX - h.x, targetY - h.y) < 18) {
          const oxIdx = ldls.findIndex(l => l.state !== 'blood');
          if (oxIdx !== -1) {
            ldls.splice(oxIdx, 1);
            h.hasCargo = true;
            addFloatingFX(h.x, h.y - 10, '✨ HDL 帶走膽固醇!', '#22d3ee');
          } else if (foamCells.length > 4 && Math.random() < 0.5) {
            foamCells.pop();
            h.hasCargo = true;
            addFloatingFX(h.x, h.y - 10, '✨ HDL 縮小脂質核心!', '#22d3ee');
          }
          h.state = 'leaving';
        }
      } else if (h.state === 'leaving') {
        h.x += 2.8;
        h.y += (WALL_TOP_Y + 95 - h.y) * 0.06;
        if (h.x > W + 25) {
          hdls.splice(i, 1);
        }
      }
    }

    // 5. 更新平滑肌細胞位置
    smcCells.forEach(s => {
      if (s.inCap && plaqueHeight > 25) {
        const targetX = PLAQUE_CENTER_X + s.capOffset * 0.65;
        const targetY = getLowerEndotheliumY(targetX, false) + 11;
        s.x += (targetX - s.x) * 0.06;
        s.y += (targetY - s.y) * 0.06;
      } else {
        s.x += (s.baseX - s.x) * 0.08;
        s.y += (s.baseY - s.y) * 0.08;
      }
    });

    // 6. 更新血小板
    platelets.forEach(p => {
      const wallY = getLowerEndotheliumY(p.x);
      if (p.state === 'blood') {
        p.x += p.vx * bpMultiplier * blockageFactor;
        p.y += Math.sin(simTime * 4 + p.angle) * 0.35;

        if (p.y > wallY - 10) p.y = wallY - 10;
        if (p.y < WALL_TOP_Y + 12) p.y = WALL_TOP_Y + 12;

        if (
          ruptureState > 0.35 &&
          clotBusterActive <= 0 &&
          !statinStabilized &&
          currentStage <= 5 &&
          Math.abs(p.x - apex.x) < 130 &&
          platelets.filter(item => item.state !== 'blood').length < 24 &&
          (currentStage === 5 || (currentStage === 4 && Math.random() < 0.03))
        ) {
          p.state = 'homing';
          p.targetX = apex.x + (Math.random() - 0.45) * 82;
          p.targetY = apex.y - 6 - Math.random() * 58;
        }

        if (p.x > W + 20) {
          p.x = -15;
          p.y = WALL_TOP_Y + 20 + Math.random() * (WALL_BOT_BASE_Y - WALL_TOP_Y - 40);
        }
      } else if (p.state === 'homing') {
        p.x += (p.targetX - p.x) * 0.12;
        p.y += (p.targetY - p.y) * 0.12;
        if (Math.hypot(p.targetX - p.x, p.targetY - p.y) < 6) {
          p.state = 'activated';
        }
        if (clotBusterActive > 0 || ruptureState < 0.2) {
          p.state = 'blood';
        }
      } else if (p.state === 'activated') {
        p.x += (p.targetX - p.x) * 0.1;
        p.y += (p.targetY - p.y) * 0.1;
        if ((clotBusterActive > 0 || currentStage === 6) && Math.random() < 0.14) {
          p.state = 'blood';
          p.vx = 3.2;
        }
      }
    });

    // 7. 更新破裂碎片、浮動文字與觸控漣漪
    for (let i = ruptureDebris.length - 1; i >= 0; i--) {
      const d = ruptureDebris[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.04;
      d.life -= dt * 0.45;
      if (d.life <= 0) ruptureDebris.splice(i, 1);
    }

    for (let i = floatingTextFX.length - 1; i >= 0; i--) {
      const fx = floatingTextFX[i];
      fx.y += fx.vy;
      fx.life -= dt * 0.75;
      if (fx.life <= 0) floatingTextFX.splice(i, 1);
    }

    for (let i = touchRipples.length - 1; i >= 0; i--) {
      const rp = touchRipples[i];
      rp.r += (rp.maxR - rp.r) * 0.18;
      rp.alpha -= dt * 1.8;
      if (rp.alpha <= 0) touchRipples.splice(i, 1);
    }

    if (ruptureState > 0.5 && Math.random() < 0.08 && ruptureDebris.length < 10) {
      ruptureDebris.push({
        x: apex.x + (Math.random() - 0.5) * 26,
        y: apex.y - 2,
        vx: (Math.random() - 0.2) * 1.2,
        vy: -0.7 - Math.random() * 1.1,
        r: 2.8 + Math.random() * 2,
        life: 1.0
      });
    }

    updateMetricsUI();
  }

  function updateMetricsUI() {
    const baseLumen = WALL_BOT_BASE_Y - WALL_TOP_Y;
    const plaqueRatio = Math.min(0.68, plaqueHeight / baseLumen);
    const clotRatio = thrombusSize * 0.32;
    const patency = Math.max(5, Math.round((1 - plaqueRatio - clotRatio) * 100));

    metricLumenBar.style.width = `${patency}%`;
    if (stentDeployed && patency >= 75) {
      metricLumenText.textContent = `${patency}% (支架撐開暢通)`;
    } else if (patency > 75) {
      metricLumenText.textContent = `${patency}% (暢通)`;
    } else if (patency > 40) {
      metricLumenText.textContent = `${patency}% (中度狹窄)`;
    } else {
      metricLumenText.textContent = `${patency}% (嚴重阻塞/缺血!)`;
    }

    const plaquePct = Math.min(100, Math.round((plaqueHeight / 130) * 100));
    metricPlaqueBar.style.width = `${plaquePct}%`;
    if (stentDeployed && stentExpandRatio > 0.6) {
      metricPlaqueText.textContent = `${plaquePct}% (已被支架壓平穩定)`;
    } else if (statinStabilized && plaquePct > 0) {
      metricPlaqueText.textContent = `${plaquePct}% (藥物穩定消退斑塊)`;
    } else {
      metricPlaqueText.textContent = plaquePct === 0 ? '0% (無斑塊)' : `${plaquePct}% (${foamCells.length} 泡沫細胞)`;
    }

    const oxCount = ldls.filter(l => l.state !== 'blood').length;
    const macCount = immuneCells.filter(m => m.state !== 'blood').length;
    const inflamScore = statinStabilized
      ? Math.max(8, Math.round(oxCount * 1.2 + macCount * 2.5))
      : Math.min(100, Math.round(currentStage * 12 + oxCount * 1.8 + macCount * 6));
    metricInflamBar.style.width = `${inflamScore}%`;
    metricInflamText.textContent =
      statinStabilized
        ? '已受藥物抑制 (穩定)'
        : inflamScore < 20
        ? '極低'
        : inflamScore < 50
        ? '輕中度發炎'
        : inflamScore < 80
        ? '高度發炎反應'
        : '劇烈發炎 (纖維帽脆弱)';

    const clotPct = Math.min(100, Math.round(thrombusSize * 100 + (ruptureState > 0.3 ? 15 : 0)));
    metricClotBar.style.width = `${clotPct}%`;
    metricClotText.textContent =
      clotPct === 0
        ? statinStabilized || stentDeployed
          ? '0% (已解除血栓危機)'
          : '0% (安全)'
        : clotPct < 35
        ? `${clotPct}% (斑塊破裂高危)`
        : `${clotPct}% (急性血栓形成!)`;
  }

  function getRoleAlpha(roleName) {
    if (!focusedRole) return 1.0;
    return focusedRole === roleName ? 1.0 : 0.16;
  }

  // ==================== 繪製主函式 ====================
  function renderSimulation() {
    ctx.clearRect(0, 0, W, H);

    drawArteryWallsAndPlaqueZone();
    drawBloodStreamlines();
    drawLipidCoreAndFoamCells();
    drawSmoothMuscleAndFibrousCap();
    drawEndothelialCells();
    drawRBCs();
    drawCholesterolParticles();
    drawImmuneCells();
    drawThrombusAndPlatelets();
    drawDrugParticles();
    drawCatheterAndStent();
    drawAnatomicalLabelsAndFX();
  }

  function drawArteryWallsAndPlaqueZone() {
    ctx.fillStyle = '#140c14';
    ctx.fillRect(0, 0, W, H);

    const topWallGrad = ctx.createLinearGradient(0, 0, 0, WALL_TOP_Y);
    topWallGrad.addColorStop(0, '#2b121c');
    topWallGrad.addColorStop(0.65, '#4c1828');
    topWallGrad.addColorStop(1, '#6b1d2f');
    ctx.fillStyle = topWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    for (let x = W; x >= 0; x -= 20) {
      ctx.lineTo(x, getUpperEndotheliumY(x));
    }
    ctx.closePath();
    ctx.fill();

    const lumenGrad = ctx.createLinearGradient(0, WALL_TOP_Y, 0, WALL_BOT_BASE_Y);
    lumenGrad.addColorStop(0, '#3a0a14');
    lumenGrad.addColorStop(0.5, '#590d1b');
    lumenGrad.addColorStop(1, '#380912');
    ctx.fillStyle = lumenGrad;
    ctx.fillRect(0, WALL_TOP_Y - 15, W, WALL_BOT_BASE_Y - WALL_TOP_Y + 35);

    const intimaGrad = ctx.createLinearGradient(0, WALL_BOT_BASE_Y - plaqueHeight, 0, INTIMA_FLOOR_Y);
    intimaGrad.addColorStop(0, currentStage >= 3 ? '#5c3c1e' : '#4a1c28');
    intimaGrad.addColorStop(1, '#3b1522');
    ctx.fillStyle = intimaGrad;
    ctx.beginPath();
    ctx.moveTo(0, INTIMA_FLOOR_Y);
    for (let x = 0; x <= W; x += 12) {
      ctx.lineTo(x, getLowerEndotheliumY(x));
    }
    ctx.lineTo(W, INTIMA_FLOOR_Y);
    ctx.closePath();
    ctx.fill();

    const mediaGrad = ctx.createLinearGradient(0, INTIMA_FLOOR_Y, 0, H);
    mediaGrad.addColorStop(0, '#591a2b');
    mediaGrad.addColorStop(0.55, '#3d111e');
    mediaGrad.addColorStop(1, '#1f0910');
    ctx.fillStyle = mediaGrad;
    ctx.fillRect(0, INTIMA_FLOOR_Y, W, H - INTIMA_FLOOR_Y);

    ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, INTIMA_FLOOR_Y);
    ctx.lineTo(W, INTIMA_FLOOR_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBloodStreamlines() {
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.08)';
    ctx.lineWidth = 1.5;

    for (let row = 1; row <= 5; row++) {
      const ratio = row / 6;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const topY = getUpperEndotheliumY(x);
        const botY = getLowerEndotheliumY(x);
        const y = topY + (botY - topY) * ratio + Math.sin(x * 0.02 - simTime * 6) * 2.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLipidCoreAndFoamCells() {
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('foam');

    if (plaqueHeight > 18) {
      const coreGrad = ctx.createRadialGradient(
        PLAQUE_CENTER_X,
        INTIMA_FLOOR_Y - plaqueHeight * 0.38,
        10,
        PLAQUE_CENTER_X,
        INTIMA_FLOOR_Y - plaqueHeight * 0.25,
        PLAQUE_HALF_W * 0.85
      );
      coreGrad.addColorStop(0, 'rgba(234, 179, 8, 0.52)');
      coreGrad.addColorStop(0.6, 'rgba(202, 138, 4, 0.28)');
      coreGrad.addColorStop(1, 'rgba(161, 98, 7, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.moveTo(PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85, INTIMA_FLOOR_Y - 4);
      for (let x = PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85; x <= PLAQUE_CENTER_X + PLAQUE_HALF_W * 0.85; x += 10) {
        const endoY = getLowerEndotheliumY(x, false);
        ctx.lineTo(x, endoY + 12);
      }
      ctx.lineTo(PLAQUE_CENTER_X + PLAQUE_HALF_W * 0.85, INTIMA_FLOOR_Y - 4);
      ctx.closePath();
      ctx.fill();

      if (currentStage >= 3) {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
        ctx.lineWidth = 1.6;
        for (let c = -3; c <= 3; c++) {
          const cx = PLAQUE_CENTER_X + c * 28;
          const cy = INTIMA_FLOOR_Y - 12 - (3 - Math.abs(c)) * 6;
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy - 3);
          ctx.lineTo(cx + 8, cy + 3);
          ctx.moveTo(cx - 5, cy + 5);
          ctx.lineTo(cx + 6, cy - 4);
          ctx.stroke();
        }
      }
    }

    foamCells.forEach(fc => {
      const fx = PLAQUE_CENTER_X + fc.offsetX;
      const minEndoY = getLowerEndotheliumY(fx, false) + fc.r + 6;
      const fy = Math.min(INTIMA_FLOOR_Y - fc.r - 2, Math.max(minEndoY, INTIMA_FLOOR_Y - fc.offsetY));
      fc.renderX = fx;
      fc.renderY = fy;

      const grad = ctx.createRadialGradient(fx - 3, fy - 3, 2, fx, fy, fc.r);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.65, '#d97706');
      grad.addColorStop(1, '#78350f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, fc.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#fef9c3';
      for (let d = 0; d < fc.droplets; d++) {
        const ang = (d / fc.droplets) * Math.PI * 2 + fc.phase;
        const dist = fc.r * 0.48;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * dist, fy + Math.sin(ang) * dist, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawSmoothMuscleAndFibrousCap() {
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('smc');

    if (capThickness > 0.05 && plaqueHeight > 22) {
      if (statinStabilized) {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = statinPulseTimer > 0 ? 14 : 6;
      }
      ctx.strokeStyle = statinStabilized
        ? 'rgba(110, 231, 183, 0.92)' // 經降脂藥穩定加厚後的堅固膠原纖維帽
        : currentStage >= 4 && currentStage <= 5
        ? `rgba(253, 164, 175, ${0.42 * capThickness})`
        : `rgba(254, 226, 226, ${0.78 * capThickness})`;
      ctx.lineWidth = statinStabilized ? 10.5 : currentStage >= 4 && currentStage <= 5 ? 3.5 : 7.5 * capThickness;

      ctx.beginPath();
      for (let x = PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85; x <= PLAQUE_CENTER_X - (ruptureState > 0.2 ? 22 : 0); x += 8) {
        const y = getLowerEndotheliumY(x) + 8;
        if (x === PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (ruptureState > 0.2) {
        ctx.beginPath();
        for (let x = PLAQUE_CENTER_X + 22; x <= PLAQUE_CENTER_X + PLAQUE_HALF_W * 0.85; x += 8) {
          const y = getLowerEndotheliumY(x) + 8;
          if (x === PLAQUE_CENTER_X + 22) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    smcCells.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.inCap) {
        const dy = getLowerEndotheliumY(s.x + 10, false) - getLowerEndotheliumY(s.x - 10, false);
        ctx.rotate(Math.atan2(dy, 20));
      }

      ctx.fillStyle = s.inCap ? '#fb7185' : '#e11d48';
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  function drawEndothelialCells() {
    const cellWidth = 34;
    const count = Math.ceil(W / cellWidth);

    for (let i = 0; i < count; i++) {
      const cx = i * cellWidth + cellWidth * 0.5;
      const cy = getUpperEndotheliumY(cx);
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 3, cellWidth * 0.46, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (let i = 0; i < count; i++) {
      const cx = i * cellWidth + cellWidth * 0.5;
      const cy = getLowerEndotheliumY(cx);
      const distFromPlaque = Math.abs(cx - PLAQUE_CENTER_X);

      if (ruptureState > 0.25 && distFromPlaque < 26 * ruptureState) {
        continue;
      }

      const isDamaged = currentStage >= 1 && currentStage <= 5 && !statinStabilized && distFromPlaque < 185;
      const dy = getLowerEndotheliumY(cx + 8) - getLowerEndotheliumY(cx - 8);
      const angle = Math.atan2(dy, 16);

      ctx.save();
      ctx.translate(cx, cy + 3);
      ctx.rotate(angle);

      const radiusX = isDamaged ? cellWidth * 0.35 : cellWidth * 0.47;
      ctx.fillStyle = isDamaged ? '#ea580c' : '#f43f5e';
      ctx.strokeStyle = isDamaged ? '#fdba74' : '#fda4af';
      ctx.lineWidth = 1.1;

      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isDamaged && currentStage >= 1) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(-5, -10);
        ctx.moveTo(5, -5);
        ctx.lineTo(5, -10);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  function drawRBCs() {
    ctx.save();
    ctx.globalAlpha = focusedRole ? 0.22 : 0.92;

    rbcs.forEach(rbc => {
      ctx.save();
      ctx.translate(rbc.x, rbc.y);
      ctx.rotate(rbc.angle);

      const grad = ctx.createRadialGradient(0, 0, rbc.r * 0.15, 0, 0, rbc.r);
      grad.addColorStop(0, '#991b1b');
      grad.addColorStop(0.55, '#ef4444');
      grad.addColorStop(1, '#7f1d1d');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rbc.r, rbc.r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(252, 165, 165, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  function drawCholesterolParticles() {
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('ldl');

    ldls.forEach(l => {
      const isOx = l.state === 'oxidized';
      ctx.save();
      ctx.translate(l.x, l.y);

      if (isOx) {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, l.r + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const grad = ctx.createRadialGradient(-1.5, -1.5, 1, 0, 0, l.r);
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(0.6, '#facc15');
        grad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, l.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = getRoleAlpha('hdl');

    hdls.forEach(h => {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;

      const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, h.r);
      grad.addColorStop(0, '#ecfeff');
      grad.addColorStop(0.6, '#06b6d4');
      grad.addColorStop(1, '#0e7490');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, h.r, 0, Math.PI * 2);
      ctx.fill();

      if (h.hasCargo) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawImmuneCells() {
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('monocyte');

    immuneCells.forEach(m => {
      ctx.save();
      ctx.translate(m.x, m.y);

      const isMac = m.state === 'macrophage' || m.state === 'diapedesis';
      ctx.fillStyle = isMac ? 'rgba(168, 85, 247, 0.88)' : 'rgba(147, 51, 234, 0.88)';
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const wobble = isMac
          ? Math.sin(ang * 5 + m.phase) * 2.8 + Math.cos(ang * 3 - m.phase) * 1.8
          : Math.sin(ang * 3 + m.phase) * 0.7;
        const rad = m.r + wobble;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(-1.5, 0, m.r * 0.42, 0.4, Math.PI * 1.75);
      ctx.fill();

      for (let c = 0; c < m.engulfCount; c++) {
        const cAng = c * 2.1 + 0.5;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(Math.cos(cAng) * 5.5, Math.sin(cAng) * 5.5, 3.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  function drawThrombusAndPlatelets() {
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('platelet');

    const apex = getPlaqueApex();

    ruptureDebris.forEach(d => {
      ctx.fillStyle = `rgba(251, 146, 60, ${d.life})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (ruptureState > 0.25) {
      const glow = ctx.createRadialGradient(apex.x, apex.y, 4, apex.x, apex.y, 38 * ruptureState);
      glow.addColorStop(0, 'rgba(248, 113, 113, 0.75)');
      glow.addColorStop(1, 'rgba(248, 113, 113, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, 38 * ruptureState, 0, Math.PI * 2);
      ctx.fill();
    }

    if (thrombusSize > 0.05) {
      trappedRbcs.forEach(tr => {
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.angle);
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, tr.r, tr.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      const activatedPlatelets = platelets.filter(p => p.state === 'activated');
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < activatedPlatelets.length; i++) {
        const p1 = activatedPlatelets[i];
        ctx.moveTo(apex.x, apex.y + 4);
        ctx.lineTo(p1.x, p1.y);
        for (let j = i + 1; j < activatedPlatelets.length; j++) {
          const p2 = activatedPlatelets[j];
          if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 48) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();
    }

    platelets.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.state === 'activated' || p.state === 'homing') {
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const spikes = 6;
        for (let s = 0; s < spikes * 2; s++) {
          const rad = s % 2 === 0 ? p.r * 1.75 : p.r * 0.65;
          const ang = (s / (spikes * 2)) * Math.PI * 2 + simTime * 2;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.65, p.angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  // 繪製 💊 藥物微粒 (tPA 溶栓酶 & Statin 降脂分子)
  function drawDrugParticles() {
    if (drugParticles.length === 0) return;
    ctx.save();
    drugParticles.forEach(dp => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, dp.life);
      ctx.translate(dp.x, dp.y);

      if (dp.kind === 'tpa') {
        // tPA 溶栓酶：亮藍白十字星芒微粒
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, dp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Statin 降脂穩定分子：翠綠膠囊微粒
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#6ee7b7';
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.4;
        drawRoundedRectPath(ctx, -dp.r * 1.3, -dp.r * 0.7, dp.r * 2.6, dp.r * 1.4, dp.r * 0.7);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  // 繪製心導管氣球與永久金屬網狀支架 (Balloon Angioplasty & Coronary Stent)
  function drawCatheterAndStent() {
    if (!stentDeployed && catheterState === 'none') return;

    ctx.save();
    ctx.globalAlpha = getRoleAlpha('stent');

    const stentLeft = PLAQUE_CENTER_X - 125;
    const stentRight = PLAQUE_CENTER_X + 125;
    const centerTopY = WALL_TOP_Y + 8;
    const centerBotY = getLowerEndotheliumY(PLAQUE_CENTER_X, false) - 4;
    const midY = (centerTopY + centerBotY) * 0.5;

    // 1. 若導管仍在血管內，繪製導引鋼絲 (Guidewire) 與充氣氣球 (Angioplasty Balloon)
    if (catheterState !== 'none') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(Math.min(W, catheterX + 165), midY);
      ctx.stroke();

      const bHalfH = Math.max(12, 14 + balloonInflate * ((centerBotY - centerTopY) * 0.46 - 12));
      const bGrad = ctx.createLinearGradient(catheterX, midY - bHalfH, catheterX, midY + bHalfH);
      bGrad.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
      bGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.78)');
      bGrad.addColorStop(1, 'rgba(56, 189, 248, 0.5)');

      ctx.fillStyle = bGrad;
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)';
      ctx.lineWidth = 2.0;
      drawRoundedRectPath(ctx, catheterX - 115, midY - bHalfH, 230, bHalfH * 2, 22);
      ctx.fill();
      ctx.stroke();
    }

    // 2. 繪製金屬網狀支架 (Metallic Diamond-Mesh Stent)
    if (stentDeployed) {
      const currentHalfH = Math.max(14, 16 + stentExpandRatio * ((centerBotY - centerTopY) * 0.48 - 14));
      const topY = midY - currentHalfH;
      const botY = midY + currentHalfH;

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 7;

      const cols = 10;
      const cellW = (stentRight - stentLeft) / cols;
      const rows = 3;
      const cellH = (botY - topY) / rows;

      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        const x1 = stentLeft + c * cellW;
        const x2 = x1 + cellW * 0.5;
        const x3 = x1 + cellW;

        for (let r = 0; r < rows; r++) {
          const y1 = topY + r * cellH;
          const y2 = y1 + cellH * 0.5;
          const y3 = y1 + cellH;

          ctx.moveTo(x1, y2);
          ctx.lineTo(x2, y1);
          ctx.lineTo(x3, y2);
          ctx.lineTo(x2, y3);
          ctx.closePath();
        }
      }
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      for (let c = 0; c <= cols; c++) {
        const x = stentLeft + c * cellW;
        ctx.beginPath();
        ctx.arc(x, topY, 2.6, 0, Math.PI * 2);
        ctx.arc(x, botY, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawAnatomicalLabelsAndFX() {
    ctx.save();
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';

    ctx.fillStyle = 'rgba(254, 202, 202, 0.72)';
    ctx.fillText('動脈管腔 (Arterial Lumen) ── 血流方向 ➔', 18, WALL_TOP_Y + 32);

    ctx.fillStyle = 'rgba(253, 164, 175, 0.8)';
    ctx.fillText('血管內皮層 (Endothelium)', 18, WALL_BOT_BASE_Y - 8);

    ctx.fillStyle = 'rgba(253, 224, 71, 0.82)';
    ctx.fillText('內膜下層 (Intima / 斑塊形成區)', 18, INTIMA_FLOOR_Y - 12);

    ctx.fillStyle = 'rgba(244, 114, 182, 0.8)';
    ctx.fillText('中膜平滑肌層 (Tunica Media - 平滑肌細胞)', 18, INTIMA_FLOOR_Y + 34);

    const apex = getPlaqueApex();
    if (plaqueHeight > 26) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(
        stentDeployed && stentExpandRatio > 0.5
          ? '▲ 已被金屬支架壓平並穩定的末期斑塊'
          : '▲ 粥狀脂質核心與泡沫細胞 (Atheromatous Plaque)',
        PLAQUE_CENTER_X,
        INTIMA_FLOOR_Y - 8
      );

      if (capThickness > 0.3 && ruptureState < 0.3) {
        ctx.fillStyle = statinStabilized ? '#6ee7b7' : '#fecdd3';
        ctx.fillText(
          statinStabilized ? '── 💊 藥物加厚穩定纖維帽 (Stable Fibrous Cap) ──' : '── 纖維帽 (Fibrous Cap) ──',
          apex.x,
          apex.y + 22
        );
      }
    }

    if (stentDeployed && stentExpandRatio > 0.7) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText('🛡️ 血管支架 (Coronary Stent) 永久支撐血管暢通', PLAQUE_CENTER_X, WALL_TOP_Y + 28);
    } else if (thrombusSize > 0.25) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText('🚨 血栓形成 (Thrombus) 阻塞血流', apex.x, apex.y - 58 * thrombusSize - 12);
    }

    // 繪製醫療介入即時進度橫幅 (Procedure Toast Banner)
    if (procedureBanner.timer > 0) {
      ctx.save();
      const alpha = Math.min(1, procedureBanner.timer * 1.2);
      ctx.globalAlpha = alpha;
      const bw = 620;
      const bh = 36;
      const bx = (W - bw) * 0.5;
      const by = 52;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = procedureBanner.color;
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, bx, by, bw, bh, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.font = '700 13.5px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText(procedureBanner.text, W * 0.5, by + 23);
      ctx.restore();
    }

    // 繪製觸控漣漪回饋
    touchRipples.forEach(rp => {
      ctx.save();
      ctx.strokeStyle = rp.color;
      ctx.globalAlpha = Math.max(0, rp.alpha);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 繪製浮動事件特效文字
    ctx.textAlign = 'center';
    ctx.font = '700 12.5px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
    floatingTextFX.forEach(fx => {
      ctx.globalAlpha = Math.max(0, fx.life);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, fx.x, fx.y);
    });

    ctx.restore();
  }

  // ==================== 觸控平板與滑鼠統一互動 (Pointer Events) ====================
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      mx: (e.clientX - rect.left) * scaleX,
      my: (e.clientY - rect.top) * scaleY,
      clientX: e.clientX - rect.left,
      clientY: e.clientY - rect.top,
      rectW: rect.width,
      rectH: rect.height
    };
  }

  function showTooltipAt(hit, clientX, clientY, rectW, rectH) {
    microTooltip.style.display = 'block';
    const tipX = Math.min(rectW - 275, Math.max(10, clientX - 40));
    const tipY = Math.min(rectH - 110, Math.max(52, clientY - 85));
    microTooltip.style.left = `${tipX}px`;
    microTooltip.style.top = `${tipY}px`;
    tooltipTitle.textContent = hit.title;
    tooltipDesc.textContent = hit.desc;
  }

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const { mx, my, clientX, clientY, rectW, rectH } = getCanvasCoords(e);
    const hit = findHoveredEntity(mx, my);
    if (hit) {
      showTooltipAt(hit, clientX, clientY, rectW, rectH);
    } else if (!selectedEntity) {
      microTooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'touch' && !selectedEntity) {
      microTooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('pointerdown', e => {
    const { mx, my, clientX, clientY, rectW, rectH } = getCanvasCoords(e);
    addTouchRipple(mx, my);

    const touchTolerance = e.pointerType === 'touch' ? 14 : 6;
    const hit = findHoveredEntity(mx, my, touchTolerance);
    if (hit) {
      selectedEntity = hit;
      showTooltipAt(hit, clientX, clientY, rectW, rectH);
      return;
    }

    selectedEntity = null;
    microTooltip.style.display = 'none';

    const wallY = getLowerEndotheliumY(mx, false);
    if (my >= wallY - 12 && my <= INTIMA_FLOOR_Y) {
      spawnImmuneAction(mx);
    } else if (my > WALL_TOP_Y && my < wallY) {
      for (let i = 0; i < 4; i++) {
        const l = createLDL(mx + (Math.random() - 0.5) * 30, true);
        l.y = my + (Math.random() - 0.5) * 24;
        ldls.push(l);
      }
      addFloatingFX(mx, my - 10, '+ 投放 LDL 膽固醇', '#fde047');
    }
  });

  tooltipClose.addEventListener('click', e => {
    e.stopPropagation();
    selectedEntity = null;
    microTooltip.style.display = 'none';
  });

  function findHoveredEntity(mx, my, extraRadius = 6) {
    if (stentDeployed && Math.abs(mx - PLAQUE_CENTER_X) < 125) {
      const topY = WALL_TOP_Y + 8;
      const botY = getLowerEndotheliumY(mx, false);
      if (Math.abs(my - topY) < 18 + extraRadius || Math.abs(my - botY) < 18 + extraRadius || catheterState !== 'none') {
        return {
          title: '🎈 血管支架 (Coronary Stent) 與氣球擴張術',
          desc: '透過心導管氣球充氣將末期硬化的斑塊向外壓平，並留下金屬網狀支架永久支撐血管壁，恢復 85% 以上血流暢通！'
        };
      }
    }

    for (const fc of foamCells) {
      if (fc.renderX && Math.hypot(mx - fc.renderX, my - fc.renderY) < fc.r + extraRadius) {
        return {
          title: '🫧 泡沫細胞 (Foam Cell)',
          desc: '吞噬了過量氧化膽固醇 (ox-LDL) 的巨噬細胞，內部塞滿脂質油滴，堆積形成粥狀斑塊的核心。'
        };
      }
    }

    for (const m of immuneCells) {
      if (Math.hypot(mx - m.x, my - m.y) < m.r + extraRadius) {
        if (m.state === 'macrophage' || m.state === 'diapedesis') {
          return {
            title: '🛡️ 巨噬細胞 (Macrophage)',
            desc: `由血液單核球穿過內皮分化而成，正主動追逐並吞噬氧化膽固醇 (已吞噬 ${m.engulfCount}/${m.maxEngulf} 顆)。`
          };
        }
        return {
          title: '🟣 單核球 (Monocyte - 免疫白血球)',
          desc: '在血液中巡邏的免疫細胞，收到受損內皮的發炎訊號後會黏附並鑽入血管壁內膜。'
        };
      }
    }

    for (const p of platelets) {
      if (Math.hypot(mx - p.x, my - p.y) < p.r + extraRadius + 2) {
        if (p.state === 'activated') {
          return {
            title: '🩸 活化血小板與纖維蛋白血栓 (Thrombus)',
            desc: '接觸斑塊破裂處後伸出偽足活化，與纖維蛋白網交織困住紅血球，造成急性血管阻塞。可用溶栓劑 (tPA) 溶解。'
          };
        }
        return {
          title: '🟡 血小板 (Platelet)',
          desc: '血液中負責止血的小細胞碎片；當動脈斑塊破裂時會被大量召集並引發血栓。'
        };
      }
    }

    for (const h of hdls) {
      if (Math.hypot(mx - h.x, my - h.y) < h.r + extraRadius) {
        return {
          title: '🥗 高密度脂蛋白 (HDL - 好膽固醇)',
          desc: '血管清道夫！能進入受損內膜將多餘膽固醇逆向運回肝臟代謝，搭配降脂藥可使斑塊部分消退並穩定。'
        };
      }
    }

    for (const l of ldls) {
      if (Math.hypot(mx - l.x, my - l.y) < l.r + extraRadius) {
        if (l.state === 'oxidized') {
          return {
            title: '🔥 氧化型低密度脂蛋白 (ox-LDL)',
            desc: '滲入內膜後被自由基氧化的壞膽固醇，具高度毒性並引發強烈血管發炎與巨噬細胞吞噬。'
          };
        }
        return {
          title: '🍔 低密度脂蛋白膽固醇 (LDL - 壞膽固醇)',
          desc: '血液中濃度過高時，容易穿過受損的內皮細胞縫隙並滯留於血管內膜下層。'
        };
      }
    }

    for (const s of smcCells) {
      if (Math.hypot(mx - s.x, my - s.y) < 14 + extraRadius) {
        return {
          title: '🧬 血管平滑肌細胞與纖維帽',
          desc: s.inCap
            ? '已遷移至斑塊頂部，分泌膠原蛋白構築「纖維帽」封住脂質核心，防止斑塊破裂。'
            : '位於動脈中膜層，負責維持血管壁彈性與收縮舒張。'
        };
      }
    }

    return null;
  }

  // ==================== 工具列按鈕與事件綁定 ====================
  function spawnLDLAction() {
    statinStabilized = false;
    for (let i = 0; i < 7; i++) {
      const x = PLAQUE_CENTER_X - 240 + Math.random() * 200;
      const l = createLDL(x, true);
      if (currentStage >= 1 && i < 4) {
        l.state = 'infiltrating';
        l.targetX = PLAQUE_CENTER_X + (Math.random() - 0.5) * 220;
        l.targetY = getLowerEndotheliumY(l.targetX, false) + 16 + Math.random() * 24;
      }
      ldls.push(l);
    }
    if (currentStage === 0) setStage(1);
    addFloatingFX(PLAQUE_CENTER_X - 60, WALL_BOT_BASE_Y - 50, '🍔 大量 LDL 膽固醇湧入!', '#facc15');
  }

  function spawnImmuneAction(customX) {
    if (currentStage < 2) setStage(2);
    const spawnX = customX ?? PLAQUE_CENTER_X - 90 + (Math.random() - 0.5) * 120;
    const m = createMonocyte(spawnX);
    m.y = getLowerEndotheliumY(spawnX, false) - 12;
    m.state = 'rolling';
    immuneCells.push(m);
    addFloatingFX(spawnX, m.y - 16, '🛡️ 派遣單核球支援!', '#d8b4fe');
  }

  function spawnHDLAction() {
    for (let i = 0; i < 4; i++) {
      const h = createHDL(PLAQUE_CENTER_X - 220 - i * 35);
      h.state = 'scavenging';
      hdls.push(h);
    }
    addFloatingFX(PLAQUE_CENTER_X, getPlaqueApex().y - 25, '🥗 派遣 HDL 清道夫逆向清除膽固醇!', '#22d3ee');
  }

  btnSpawnLDL.addEventListener('click', spawnLDLAction);
  btnSpawnImmune.addEventListener('click', () => spawnImmuneAction());
  btnSpawnHDL.addEventListener('click', spawnHDLAction);

  // 🎈 點擊「氣球擴張與血管支架」：不論目前在哪個階段（包含已在最後階段），都重新完整執行一次氣球擴張與支架置放動畫！
  btnStentTherapy.addEventListener('click', () => {
    startStentAndMedicalRescue();
  });

  // 💊 點擊「降脂藥穩定斑塊 + 溶栓」：立即發射可見的 tPA 與 Statin 藥物微粒並顯示治療進度橫幅！
  btnStatinTherapy.addEventListener('click', () => {
    triggerStatinAndThrombolysis();
  });

  btnStageAction.addEventListener('click', () => {
    if (currentStage < STAGES.length - 1) {
      setStage(currentStage + 1);
    } else {
      startStentAndMedicalRescue();
    }
  });

  btnPrev.addEventListener('click', () => setStage(currentStage - 1));
  btnNext.addEventListener('click', () => setStage(currentStage + 1));

  stepButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-stage'), 10);
      setStage(target);
    });
  });

  btnAuto.addEventListener('click', () => {
    isAutoPlay = !isAutoPlay;
    btnAuto.textContent = isAutoPlay ? '🔄 自動演示: 開' : '🔄 自動演示: 關';
    btnAuto.classList.toggle('active-toggle', isAutoPlay);
  });

  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶️ 繼續動畫' : '⏸️ 暫停動畫';
  });

  btnReset.addEventListener('click', () => {
    ldlSlider.value = 2;
    bpSlider.value = 1.0;
    updateSlidersUI();
    initSimulation();
    setStage(0);
  });

  ldlSlider.addEventListener('input', updateSlidersUI);
  bpSlider.addEventListener('input', updateSlidersUI);

  // 角色圖鑑點選聚焦篩選
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const role = item.getAttribute('data-role');
      if (focusedRole === role) {
        focusedRole = null;
      } else {
        focusedRole = role;
        if (role === 'stent' && !stentDeployed) {
          startStentAndMedicalRescue();
        }
      }
      legendItems.forEach(el => {
        el.classList.toggle('active-role', el.getAttribute('data-role') === focusedRole);
      });
      btnClearFocus.style.display = focusedRole ? 'inline-block' : 'none';
    });
  });

  btnClearFocus.addEventListener('click', () => {
    focusedRole = null;
    legendItems.forEach(el => el.classList.remove('active-role'));
    btnClearFocus.style.display = 'none';
  });

  // 啟動主動畫迴圈
  let lastTimestamp = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
    lastTimestamp = now;

    if (!isPaused) {
      updateSimulation(dt);
    }
    renderSimulation();
    requestAnimationFrame(loop);
  }

  updateSlidersUI();
  initSimulation();
  setStage(0);
  requestAnimationFrame(loop);
})();

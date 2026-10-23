/**
 * 動脈粥狀硬化斑塊 (Plaque) 與血栓形成動態互動模擬
 * Pure Vanilla JS + HTML5 Canvas (No Node.js required)
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

  const btnAuto = document.getElementById('btn-auto');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnStageAction = document.getElementById('btn-stage-action');
  const btnSpawnLDL = document.getElementById('btn-spawn-ldl');
  const btnSpawnImmune = document.getElementById('btn-spawn-immune');
  const btnSpawnHDL = document.getElementById('btn-spawn-hdl');

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

  // 6個病理階段資料定義
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
      prompt: '💡 觀察平穩流動的紅血球與少量黃色 LDL。點擊「造成內皮受損」或調高 LDL 滑桿開始病變！',
      targetPlaqueHeight: 0,
      duration: 13
    },
    {
      tag: 'STAGE 02',
      badge: '階段 2：內皮受損與膽固醇滲入氧化',
      title: '內皮受損與 LDL 膽固醇滲入氧化',
      desc: '高血壓、吸菸、高血糖或氧化壓力會損傷血管內皮細胞，使其間隙變大。血液中過多的低密度脂蛋白膽固醇 (LDL) 趁機鑽入內膜下層 (Intima)，並被自由基氧化成「氧化型膽固醇 (ox-LDL)」。',
      bullets: [
        '<strong>內皮功能障礙：</strong>受損內皮細胞間隙擴大，並開始在表面表現黏附分子 (VCAM-1)。',
        '<strong>LDL 滲入滯留：</strong>黃色 LDL 顆粒穿過內皮縫隙，卡在內膜下層的細胞外基質中。',
        '<strong>脂質氧化 (ox-LDL)：</strong>活性氧自由基將 LDL 氧化為深橘紅色的 ox-LDL，刺激內皮發出強烈發炎訊號。'
      ],
      actionText: '🛡️ 招募免疫單核球吞噬 (進入階段 3)',
      prompt: '💡 黃色 LDL 正穿過受損內皮並氧化成深橘色 ox-LDL！點擊「召喚免疫細胞」觀察白血球反應。',
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
      prompt: '💡 紫色巨噬細胞正在內膜中追逐並吞噬氧化膽固醇！可點擊「派遣好膽固醇 (HDL)」幫忙清除。',
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
        '<strong>動脈管腔狹窄：</strong>隆起的斑塊壓迫血管通道，導致血流加速、產生湍流，下游器官供血受限（心絞痛）。'
      ],
      actionText: '💥 削弱纖維帽並觸發斑塊破裂 (進入階段 5)',
      prompt: '💡 泡沫細胞已堆積成大型粥狀斑塊並覆蓋纖維帽，管腔明顯狹窄！點擊下方按鈕模擬斑塊破裂。',
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
        '<strong>急性缺血危機：</strong>血管通道幾乎完全堵死，若發生在冠狀動脈即導致「心肌梗塞」，在腦血管則導致「腦中風」。'
      ],
      actionText: '💉 施打溶栓藥物 (tPA) 清除血栓',
      prompt: '🚨 緊急狀態：血栓已阻塞動脈導致下游缺血！點擊「施打溶栓藥物」或「派遣 HDL」觀察醫療救援效果。',
      targetPlaqueHeight: 126,
      duration: 20
    }
  ];

  // 模擬全域狀態
  let currentStage = 0;
  let stageTimer = 0;
  let isAutoPlay = true;
  let isPaused = false;
  let focusedRole = null; // 'ldl' | 'monocyte' | 'foam' | 'smc' | 'platelet' | 'hdl' | null
  let simTime = 0;

  // 生理環境參數
  let ldlLevel = 2;      // 1~5
  let bpMultiplier = 1.0; // 0.6~2.0
  let plaqueHeight = 0;  // 當前內膜斑塊隆起高度 (0 ~ 135)
  let capThickness = 0;  // 纖維帽厚度 (0 ~ 1)
  let ruptureState = 0;  // 破裂程度 (0 ~ 1)
  let thrombusSize = 0;  // 血栓大小 (0 ~ 1)
  let clotBusterActive = 0; // 溶栓藥物倒數

  // 幾何基準座標
  const WALL_TOP_Y = 105;     // 上血管壁內皮基準線
  const WALL_BOT_BASE_Y = 395; // 下血管壁健康內皮基準線 (斑塊會使此線向上隆起)
  const INTIMA_FLOOR_Y = 445;  // 內膜與中膜交界底線 (Internal Elastic Lamina)
  const PLAQUE_CENTER_X = 480; // 斑塊中心 X 座標
  const PLAQUE_HALF_W = 235;   // 斑塊影響半寬

  // 粒子陣列
  let rbcs = [];         // 紅血球
  let ldls = [];         // LDL / ox-LDL 膽固醇顆粒
  let hdls = [];         // HDL 清道夫顆粒
  let immuneCells = [];  // 單核球 (血液中) / 巨噬細胞 (內膜中)
  let foamCells = [];    // 泡沫細胞 (沉積於斑塊核心)
  let smcCells = [];     // 平滑肌細胞 (中膜與遷移至纖維帽)
  let platelets = [];    // 血小板 (血液中與聚集於血栓)
  let trappedRbcs = [];  // 被血栓纖維蛋白網困住的紅血球
  let ruptureDebris = []; // 斑塊破裂噴出的脂質碎片與組織因子
  let floatingTextFX = []; // 畫布動態文字特效 (如 "氧化!", "吞噬!", "HDL清除!")

  // 計算特定 X 座標處的下血管壁內皮 Y 座標 (含斑塊隆起與心跳搏動)
  function getLowerEndotheliumY(x, includePulse = true) {
    const pulse = includePulse ? Math.sin(simTime * 5.2 * bpMultiplier) * (3.2 * bpMultiplier) : 0;
    const dist = Math.abs(x - PLAQUE_CENTER_X);
    let bulge = 0;
    if (dist < PLAQUE_HALF_W) {
      // 平滑餘弦鐘形曲線形成斑塊隆起
      const norm = dist / PLAQUE_HALF_W;
      bulge = plaqueHeight * Math.pow(Math.cos(norm * Math.PI * 0.5), 1.8);
    }
    return WALL_BOT_BASE_Y - bulge + pulse * 0.5;
  }

  // 計算特定 X 座標處的上血管壁內皮 Y 座標
  function getUpperEndotheliumY(x, includePulse = true) {
    const pulse = includePulse ? Math.sin(simTime * 5.2 * bpMultiplier) * (3.8 * bpMultiplier) : 0;
    return WALL_TOP_Y - pulse;
  }

  // 取得斑塊頂點座標
  function getPlaqueApex() {
    return {
      x: PLAQUE_CENTER_X,
      y: getLowerEndotheliumY(PLAQUE_CENTER_X, false)
    };
  }

  // 新增浮動特效文字
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
    floatingTextFX = [];

    // 1. 紅血球 (RBC)
    for (let i = 0; i < 48; i++) {
      rbcs.push(createRBC(Math.random() * W));
    }

    // 2. 初始 LDL 膽固醇
    const initLDLCount = 12 + ldlLevel * 6;
    for (let i = 0; i < initLDLCount; i++) {
      ldls.push(createLDL(Math.random() * W));
    }

    // 3. 初始 HDL 好膽固醇
    for (let i = 0; i < 6; i++) {
      hdls.push(createHDL(Math.random() * W));
    }

    // 4. 初始血液單核球 (Monocytes)
    for (let i = 0; i < 6; i++) {
      immuneCells.push(createMonocyte(Math.random() * W));
    }

    // 5. 初始血小板 (Platelets)
    for (let i = 0; i < 20; i++) {
      platelets.push(createPlatelet(Math.random() * W));
    }

    // 6. 中膜平滑肌細胞 (Smooth Muscle Cells)
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
      state: 'blood', // 'blood' | 'infiltrating' | 'intima' | 'oxidized'
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
      state: 'blood', // 'blood' | 'scavenging' | 'leaving'
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
      state: 'blood', // 'blood' | 'rolling' | 'diapedesis' | 'macrophage'
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
      state: 'blood', // 'blood' | 'homing' | 'activated'
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

  // 切換至指定階段並佈置對應病理場景
  function setStage(stageIdx) {
    currentStage = Math.max(0, Math.min(STAGES.length - 1, stageIdx));
    stageTimer = 0;
    clotBusterActive = 0;

    const st = STAGES[currentStage];

    // 更新導覽列按鈕狀態
    stepButtons.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === currentStage);
      btn.classList.toggle('completed', idx < currentStage);
    });

    // 更新右側說明與畫布標籤
    stageBadge.textContent = st.badge;
    infoStageTag.textContent = st.tag;
    infoTitle.textContent = st.title;
    infoDesc.textContent = st.desc;
    infoBullets.innerHTML = st.bullets.map(b => `<li>${b}</li>`).join('');
    btnStageAction.textContent = st.actionText;
    canvasPrompt.textContent = st.prompt;

    btnPrev.disabled = currentStage === 0;
    btnNext.disabled = currentStage === STAGES.length - 1;

    // 根據階段調整環境預設與場景物件，確保跳轉階段時能立即看到該階段代表性現象
    setupStageEntities(currentStage);
  }

  function setupStageEntities(stageIdx) {
    if (stageIdx === 0) {
      // 階段 1：健康動脈
      plaqueHeight = 0;
      capThickness = 0;
      ruptureState = 0;
      thrombusSize = 0;
      foamCells = [];
      trappedRbcs = [];
      ruptureDebris = [];
      // 清除內膜中的 LDL 與巨噬細胞
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
      // 階段 2：內皮受損與 LDL 滲入氧化
      if (ldlLevel < 3) {
        ldlSlider.value = 4;
        updateSlidersUI();
      }
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });

      // 確保內膜中有數顆正在滲入與已氧化的 LDL
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
      // 階段 3：免疫細胞招募與吞噬
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });

      // 補充內膜 ox-LDL 供吞噬
      let oxCount = ldls.filter(l => l.state !== 'blood').length;
      for (let i = oxCount; i < 18; i++) {
        const l = createLDL(PLAQUE_CENTER_X + (Math.random() - 0.5) * 250, true);
        l.state = 'oxidized';
        l.oxTimer = 1;
        l.x = PLAQUE_CENTER_X + (Math.random() - 0.5) * 250;
        l.y = WALL_BOT_BASE_Y - 15 + Math.random() * 45;
        ldls.push(l);
      }

      // 確保有巨噬細胞在內膜活動與單核球正在穿出
      let macCount = immuneCells.filter(m => m.state === 'macrophage' || m.state === 'diapedesis').length;
      for (let i = macCount; i < 5; i++) {
        const m = createMonocyte(PLAQUE_CENTER_X + (Math.random() - 0.5) * 200);
        m.state = i < 3 ? 'macrophage' : 'diapedesis';
        m.x = PLAQUE_CENTER_X + (Math.random() - 0.5) * 190;
        m.y = i < 3 ? WALL_BOT_BASE_Y + 5 + Math.random() * 22 : getLowerEndotheliumY(m.x, false);
        immuneCells.push(m);
      }
    } else if (stageIdx === 3) {
      // 階段 4：泡沫細胞堆積與纖維帽斑塊
      ruptureState = 0;
      thrombusSize = 0;
      trappedRbcs = [];
      ruptureDebris = [];
      platelets.forEach(p => { p.state = 'blood'; });
      ensureFoamAndCap(14);
    } else if (stageIdx === 4) {
      // 階段 5：斑塊不穩定與破裂
      ensureFoamAndCap(18);
      ruptureState = Math.max(ruptureState, 0.35);
      thrombusSize = 0;
      trappedRbcs = [];
      spawnRuptureDebris();
    } else if (stageIdx === 5) {
      // 階段 6：血小板聚集與血栓形成
      ensureFoamAndCap(18);
      ruptureState = 1.0;
      thrombusSize = Math.max(thrombusSize, 0.25);
      spawnRuptureDebris();
      // 讓部分血小板立即進入活化聚集狀態
      const apex = getPlaqueApex();
      let actCount = 0;
      platelets.forEach(p => {
        if (actCount < 14) {
          p.state = 'activated';
          p.targetX = apex.x + (Math.random() - 0.45) * 85;
          p.targetY = apex.y - 8 - Math.random() * 55;
          p.x = p.targetX + (Math.random() - 0.5) * 20;
          p.y = p.targetY + (Math.random() - 0.5) * 20;
          actCount++;
        }
      });
    }
  }

  function ensureFoamAndCap(targetFoamCount) {
    if (plaqueHeight < 65) plaqueHeight = 75;
    while (foamCells.length < targetFoamCount) {
      const spreadX = (Math.random() - 0.5) * 250;
      const distRatio = Math.abs(spreadX) / 145;
      const maxH = Math.max(12, (1 - distRatio * distRatio) * 78);
      foamCells.push({
        type: 'foam',
        offsetX: spreadX,
        offsetY: 12 + Math.random() * maxH,
        r: 14 + Math.random() * 4.5,
        droplets: 5 + Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2
      });
    }
    // 遷移部分平滑肌細胞至纖維帽
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

  // 更新環境滑桿與數值顯示
  function updateSlidersUI() {
    ldlLevel = parseInt(ldlSlider.value, 10);
    const ldlLabels = ['極低', '正常', '偏高', '高血脂', '極危險'];
    ldlVal.textContent = ldlLabels[ldlLevel - 1] || '正常';

    bpMultiplier = parseFloat(bpSlider.value);
    const sys = Math.round(90 + bpMultiplier * 42);
    const dia = Math.round(60 + bpMultiplier * 24);
    bpVal.textContent = `${sys}/${dia}`;
  }

  // 主更新迴圈 (物理與生物行為)
  function updateSimulation(dt) {
    simTime += dt;

    // 自動階段推進計時
    if (isAutoPlay) {
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
    } else {
      stageProgressFill.style.width = '0%';
    }

    // 計算目標斑塊高度並平滑過渡
    let targetH = STAGES[currentStage].targetPlaqueHeight;
    // 泡沫細胞數量也會微調斑塊高度
    if (currentStage >= 1) {
      targetH = Math.max(targetH, Math.min(130, foamCells.length * 4.5 + (currentStage >= 1 ? 18 : 0)));
    }
    plaqueHeight += (targetH - plaqueHeight) * dt * 1.4;

    // 纖維帽厚度演變
    const targetCap = currentStage === 3 ? 1.0 : currentStage >= 4 ? 0.45 : currentStage === 2 ? 0.35 : 0;
    capThickness += (targetCap - capThickness) * dt * 1.5;

    // 破裂狀態演變
    if (currentStage === 4) {
      ruptureState = Math.min(1.0, ruptureState + dt * 0.25);
    } else if (currentStage === 5) {
      ruptureState = 1.0;
    } else {
      ruptureState = Math.max(0, ruptureState - dt * 2.0);
    }

    // 血栓大小演變 (Stage 6 或施打溶栓劑)
    if (clotBusterActive > 0) {
      clotBusterActive = Math.max(0, clotBusterActive - dt);
      thrombusSize = Math.max(0, thrombusSize - dt * 0.45);
      if (thrombusSize < 0.15 && trappedRbcs.length > 0) {
        trappedRbcs = [];
      }
    } else if (currentStage === 5) {
      const activatedCount = platelets.filter(p => p.state === 'activated').length;
      const targetThrombus = Math.min(0.95, 0.25 + activatedCount * 0.035);
      thrombusSize += (targetThrombus - thrombusSize) * dt * 0.85;
    } else {
      thrombusSize = Math.max(0, thrombusSize - dt * 1.8);
    }

    const apex = getPlaqueApex();

    // 計算管腔狹窄流速加成 (Bernoulli / Venturi 效應與阻塞效應)
    const minGap = Math.max(24, (apex.y - WALL_TOP_Y) * (1 - thrombusSize * 0.78));
    const blockageFactor = thrombusSize > 0.55 ? Math.max(0.18, 1 - thrombusSize * 0.82) : 1.0;

    // 1. 更新紅血球 (RBCs)
    rbcs.forEach(rbc => {
      const upperY = getUpperEndotheliumY(rbc.x) + rbc.r + 4;
      let lowerY = getLowerEndotheliumY(rbc.x) - rbc.r - 4;

      // 若有血栓，血栓區域也會阻擋紅血球
      if (thrombusSize > 0.05 && Math.abs(rbc.x - apex.x) < 75 * thrombusSize) {
        const clotTopY = apex.y - thrombusSize * 115;
        // 機率性被纖維蛋白網困住成為血栓一部分
        if (
          currentStage === 5 &&
          clotBusterActive <= 0 &&
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

      // 局部狹窄處加速，但若嚴重血栓則上游減速壅塞
      const inNarrow = Math.abs(rbc.x - PLAQUE_CENTER_X) < 130;
      const venturiBoost = inNarrow && thrombusSize < 0.4 ? 1 + (plaqueHeight / 140) * 0.9 : 1.0;
      const upstreamSlow = rbc.x < PLAQUE_CENTER_X - 40 && thrombusSize > 0.5 ? 0.35 : 1.0;

      rbc.x += rbc.vx * bpMultiplier * venturiBoost * blockageFactor * upstreamSlow;
      rbc.angle += rbc.spin * bpMultiplier;

      // 順著血管壁與斑塊弧度平滑導流
      if (rbc.y > lowerY) {
        rbc.y = lowerY;
        rbc.vy = -Math.abs(rbc.vy) * 0.5 - 0.6;
      } else if (rbc.y < upperY) {
        rbc.y = upperY;
        rbc.vy = Math.abs(rbc.vy) * 0.5 + 0.6;
      } else {
        // 接近斑塊斜坡時自然向上偏折
        if (rbc.x > PLAQUE_CENTER_X - PLAQUE_HALF_W && rbc.x < PLAQUE_CENTER_X && rbc.y > lowerY - 35) {
          rbc.vy -= 0.14 * (plaqueHeight / 90);
        } else if (rbc.x > PLAQUE_CENTER_X && rbc.x < PLAQUE_CENTER_X + PLAQUE_HALF_W && plaqueHeight > 30) {
          // 斑塊下游微幅渦流 (Turbulence)
          rbc.vy += Math.sin(simTime * 8 + rbc.x * 0.05) * 0.09;
        }
        rbc.y += rbc.vy;
        rbc.vy *= 0.94;
      }

      if (rbc.x > W + 25) {
        rbc.x = -25;
        rbc.y = WALL_TOP_Y + 25 + Math.random() * (WALL_BOT_BASE_Y - WALL_TOP_Y - 50);
      }
    });

    // 2. 動態補充與更新 LDL 膽固醇
    const desiredBloodLDL = 8 + ldlLevel * 7;
    const currentBloodLDL = ldls.filter(l => l.state === 'blood').length;
    if (currentBloodLDL < desiredBloodLDL && Math.random() < 0.25) {
      ldls.push(createLDL(-15, currentStage >= 1 && Math.random() < 0.55));
    }

    for (let i = ldls.length - 1; i >= 0; i--) {
      const l = ldls[i];
      const wallY = getLowerEndotheliumY(l.x);

      if (l.state === 'blood') {
        l.x += l.vx * bpMultiplier * blockageFactor;
        l.y += l.vy + Math.sin(simTime * 3 + i) * 0.2;

        const upperY = getUpperEndotheliumY(l.x) + 10;
        if (l.y < upperY) l.y = upperY;

        // 在階段 2+，當 LDL 靠近受損內皮區域時，滲入內膜下層 (Intima)
        const inDamagedZone = Math.abs(l.x - PLAQUE_CENTER_X) < 185;
        const intimaLDLCount = ldls.filter(item => item.state !== 'blood').length;
        if (
          currentStage >= 1 &&
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
        // 穿過受損內皮縫隙進入內膜
        l.x += (l.targetX - l.x) * 0.08;
        l.y += (l.targetY - l.y) * 0.08;
        if (Math.hypot(l.targetX - l.x, l.targetY - l.y) < 4) {
          l.state = 'intima';
          l.oxTimer = 0;
        }
      } else if (l.state === 'intima') {
        // 在內膜下層逐漸被自由基氧化成 ox-LDL
        l.oxTimer += dt * 0.55;
        l.x += Math.sin(simTime * 2 + i) * 0.12;
        // 確保留在內膜範圍內
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
        // 氧化膽固醇在內膜中微微顫動並釋放發炎訊號
        l.x += Math.sin(simTime * 4 + i) * 0.15;
        const minIntimaY = getLowerEndotheliumY(l.x, false) + 10;
        if (l.y < minIntimaY) l.y = minIntimaY;
        if (l.y > INTIMA_FLOOR_Y - 8) l.y = INTIMA_FLOOR_Y - 8;
      }
    }

    // 3. 更新免疫細胞 (單核球 Monocyte -> 巨噬細胞 Macrophage -> 泡沫細胞 Foam Cell)
    const macInIntima = immuneCells.filter(m => m.state === 'macrophage' || m.state === 'diapedesis').length;
    for (let i = immuneCells.length - 1; i >= 0; i--) {
      const m = immuneCells[i];
      m.phase += dt * 3.5;
      const wallY = getLowerEndotheliumY(m.x, false);

      if (m.state === 'blood') {
        m.x += m.vx * bpMultiplier * blockageFactor;
        m.y += Math.sin(m.phase) * 0.3;

        // 階段 3+：受發炎訊號吸引，靠近受損內皮並開始黏附滾動 (Rolling & Adhesion)
        const inInflamedZone = Math.abs(m.x - PLAQUE_CENTER_X) < 170;
        if (currentStage >= 2 && inInflamedZone && macInIntima < 7) {
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
        // 沿著受損內皮緩慢滾動，準備穿出內皮 (Diapedesis)
        m.x += 0.45;
        m.y = getLowerEndotheliumY(m.x, false) - 10;
        if (Math.random() < 0.04 || Math.abs(m.x - PLAQUE_CENTER_X) < 60) {
          m.state = 'diapedesis';
          m.targetX = m.x + (Math.random() - 0.5) * 30;
          m.targetY = Math.min(INTIMA_FLOOR_Y - 16, m.y + 32 + Math.random() * 20);
          addFloatingFX(m.x, m.y - 14, '免疫細胞鑽入內膜', '#c084fc');
        }
      } else if (m.state === 'diapedesis') {
        // 變形鑽入內膜下層，轉化為巨噬細胞
        m.x += (m.targetX - m.x) * 0.06;
        m.y += (m.targetY - m.y) * 0.06;
        if (Math.hypot(m.targetX - m.x, m.targetY - m.y) < 5) {
          m.state = 'macrophage';
          m.r = 15.5;
        }
      } else if (m.state === 'macrophage') {
        // 在內膜中搜尋最近的 ox-LDL 或 intima LDL 並吞噬
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

          // 吞噬接觸到的氧化膽固醇
          if (dist < m.r + nearestLDL.r) {
            ldls.splice(nearestIdx, 1);
            m.engulfCount++;
            m.r += 1.2;
            addFloatingFX(m.x, m.y - 12, '吞噬 ox-LDL!', '#e879f9');

            // 吞飽膽固醇後轉化為泡沫細胞 (Foam Cell)
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
              // 補充一顆新的血液單核球維持循環
              immuneCells.splice(i, 1);
              immuneCells.push(createMonocyte(-25));
              continue;
            }
          }
        } else {
          // 隨機巡邏於內膜斑塊區
          m.x += Math.cos(m.phase * 0.7) * 0.4;
          m.y += Math.sin(m.phase * 0.9) * 0.3;
        }

        // 限制巨噬細胞在內膜下層邊界內
        const minM = getLowerEndotheliumY(m.x, false) + m.r + 3;
        if (m.y < minM) m.y = minM;
        if (m.y > INTIMA_FLOOR_Y - m.r) m.y = INTIMA_FLOOR_Y - m.r;
        if (m.x < PLAQUE_CENTER_X - PLAQUE_HALF_W + 30) m.x = PLAQUE_CENTER_X - PLAQUE_HALF_W + 30;
        if (m.x > PLAQUE_CENTER_X + PLAQUE_HALF_W - 30) m.x = PLAQUE_CENTER_X + PLAQUE_HALF_W - 30;
      }
    }

    // 4. 更新 HDL 好膽固醇 (清道夫逆向膽固醇運輸)
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
        // 主動深入內膜吸走 ox-LDL 或縮小泡沫細胞
        const targetX = PLAQUE_CENTER_X + (Math.sin(i * 3.1) * 110);
        const targetY = wallY + 22;
        h.x += (targetX - h.x) * 0.05;
        h.y += (targetY - h.y) * 0.05;

        if (Math.hypot(targetX - h.x, targetY - h.y) < 18) {
          // 優先移除一顆內膜中的 LDL / ox-LDL
          const oxIdx = ldls.findIndex(l => l.state !== 'blood');
          if (oxIdx !== -1) {
            ldls.splice(oxIdx, 1);
            h.hasCargo = true;
            addFloatingFX(h.x, h.y - 10, '✨ HDL 帶走膽固醇!', '#22d3ee');
          } else if (foamCells.length > 0 && Math.random() < 0.45) {
            foamCells.pop();
            h.hasCargo = true;
            addFloatingFX(h.x, h.y - 10, '✨ HDL 減少泡沫細胞!', '#22d3ee');
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

    // 5. 更新平滑肌細胞 (SMC) 位置
    smcCells.forEach(s => {
      if (s.inCap && plaqueHeight > 35) {
        const targetX = PLAQUE_CENTER_X + s.capOffset * 0.65;
        const targetY = getLowerEndotheliumY(targetX, false) + 11;
        s.x += (targetX - s.x) * 0.06;
        s.y += (targetY - s.y) * 0.06;
      } else {
        s.x += (s.baseX - s.x) * 0.08;
        s.y += (s.baseY - s.y) * 0.08;
      }
    });

    // 6. 更新血小板 (Platelets) 與血栓聚集
    platelets.forEach(p => {
      const wallY = getLowerEndotheliumY(p.x);
      if (p.state === 'blood') {
        p.x += p.vx * bpMultiplier * blockageFactor;
        p.y += Math.sin(simTime * 4 + p.angle) * 0.35;

        if (p.y > wallY - 10) p.y = wallY - 10;
        if (p.y < WALL_TOP_Y + 12) p.y = WALL_TOP_Y + 12;

        // 若斑塊已破裂 (Stage 5/6) 且未施打溶栓劑，靠近裂口的血小板會被召集活化
        if (
          ruptureState > 0.35 &&
          clotBusterActive <= 0 &&
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
        // 活化血小板固定於血栓處並隨搏動微幅位移
        p.x += (p.targetX - p.x) * 0.1;
        p.y += (p.targetY - p.y) * 0.1;
        if (clotBusterActive > 0 && Math.random() < 0.12) {
          p.state = 'blood';
          p.vx = 3.2;
        }
      }
    });

    // 7. 更新斑塊破裂噴出物與浮動文字
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

    // 定期在破裂狀態下產生少量脂質碎片提示
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

  // 更新右側即時生理指標進度條
  function updateMetricsUI() {
    const baseLumen = WALL_BOT_BASE_Y - WALL_TOP_Y;
    const plaqueRatio = Math.min(0.68, plaqueHeight / baseLumen);
    const clotRatio = thrombusSize * 0.32;
    const patency = Math.max(5, Math.round((1 - plaqueRatio - clotRatio) * 100));

    metricLumenBar.style.width = `${patency}%`;
    if (patency > 75) {
      metricLumenText.textContent = `${patency}% (暢通)`;
    } else if (patency > 40) {
      metricLumenText.textContent = `${patency}% (中度狹窄)`;
    } else {
      metricLumenText.textContent = `${patency}% (嚴重阻塞/缺血!)`;
    }

    const plaquePct = Math.min(100, Math.round((plaqueHeight / 130) * 100));
    metricPlaqueBar.style.width = `${plaquePct}%`;
    metricPlaqueText.textContent = plaquePct === 0 ? '0% (無斑塊)' : `${plaquePct}% (${foamCells.length} 泡沫細胞)`;

    const oxCount = ldls.filter(l => l.state !== 'blood').length;
    const macCount = immuneCells.filter(m => m.state !== 'blood').length;
    const inflamScore = Math.min(100, Math.round(currentStage * 12 + oxCount * 1.8 + macCount * 6));
    metricInflamBar.style.width = `${inflamScore}%`;
    metricInflamText.textContent =
      inflamScore < 20 ? '極低' : inflamScore < 50 ? '輕中度發炎' : inflamScore < 80 ? '高度發炎反應' : '劇烈發炎 (纖維帽脆弱)';

    const clotPct = Math.min(100, Math.round(thrombusSize * 100 + (ruptureState > 0.3 ? 15 : 0)));
    metricClotBar.style.width = `${clotPct}%`;
    metricClotText.textContent =
      clotPct === 0 ? '0% (安全)' : clotPct < 35 ? `${clotPct}% (斑塊破裂高危)` : `${clotPct}% (急性血栓形成!)`;
  }

  // 輔助判斷某角色是否被圖鑑聚焦
  function getRoleAlpha(roleName) {
    if (!focusedRole) return 1.0;
    return focusedRole === roleName ? 1.0 : 0.16;
  }

  // ==================== 繪製主函式 ====================
  function renderSimulation() {
    ctx.clearRect(0, 0, W, H);

    // 1. 繪製動脈外膜與深層背景
    drawArteryWallsAndPlaqueZone();

    // 2. 繪製管腔內血流流線 (Streamlines)
    drawBloodStreamlines();

    // 3. 繪製內膜下層：粥狀脂質壞死核心與泡沫細胞 (Foam Cells)
    drawLipidCoreAndFoamCells();

    // 4. 繪製中膜與纖維帽平滑肌細胞 (SMC & Fibrous Cap)
    drawSmoothMuscleAndFibrousCap();

    // 5. 繪製上下血管內皮細胞層 (Endothelial Cells) 與受損/破裂缺口
    drawEndothelialCells();

    // 6. 繪製紅血球 (RBCs)
    drawRBCs();

    // 7. 繪製膽固醇顆粒 (LDL & ox-LDL) 與好膽固醇 (HDL)
    drawCholesterolParticles();

    // 8. 繪製免疫細胞 (單核球與巨噬細胞)
    drawImmuneCells();

    // 9. 繪製斑塊破裂噴出物、纖維蛋白血栓網與血小板
    drawThrombusAndPlatelets();

    // 10. 繪製解剖層次標示與浮動特效文字
    drawAnatomicalLabelsAndFX();
  }

  function drawArteryWallsAndPlaqueZone() {
    // 外膜背景
    ctx.fillStyle = '#140c14';
    ctx.fillRect(0, 0, W, H);

    // 上血管壁中膜/外膜漸層
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

    // 動脈管腔 (Lumen) 血液深紅漸層背景
    const lumenGrad = ctx.createLinearGradient(0, WALL_TOP_Y, 0, WALL_BOT_BASE_Y);
    lumenGrad.addColorStop(0, '#3a0a14');
    lumenGrad.addColorStop(0.5, '#590d1b');
    lumenGrad.addColorStop(1, '#380912');
    ctx.fillStyle = lumenGrad;
    ctx.fillRect(0, WALL_TOP_Y - 15, W, WALL_BOT_BASE_Y - WALL_TOP_Y + 35);

    // 下血管壁：內膜下層 (Subendothelial Intima - 斑塊生長空間)
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

    // 下血管壁：中膜層 (Tunica Media) 與外膜 (Adventitia)
    const mediaGrad = ctx.createLinearGradient(0, INTIMA_FLOOR_Y, 0, H);
    mediaGrad.addColorStop(0, '#591a2b');
    mediaGrad.addColorStop(0.55, '#3d111e');
    mediaGrad.addColorStop(1, '#1f0910');
    ctx.fillStyle = mediaGrad;
    ctx.fillRect(0, INTIMA_FLOOR_Y, W, H - INTIMA_FLOOR_Y);

    // 內彈性膜 (Internal Elastic Lamina) 分隔內膜與中膜
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

    // 若斑塊高度明顯，先繪製底部黃色粥狀脂質壞死核心 (Lipid/Necrotic Core)
    if (plaqueHeight > 22) {
      const apex = getPlaqueApex();
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

      // 繪製膽固醇結晶針 (Cholesterol Crystals) 在階段 4+
      if (currentStage >= 3) {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
        ctx.lineWidth = 1.6;
        for (let c = -3; c <= 3; c++) {
          const cx = PLAQUE_CENTER_X + c * 28;
          const cy = INTIMA_FLOOR_Y - 18 - (3 - Math.abs(c)) * 11;
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy - 3);
          ctx.lineTo(cx + 8, cy + 3);
          ctx.moveTo(cx - 5, cy + 5);
          ctx.lineTo(cx + 6, cy - 4);
          ctx.stroke();
        }
      }
    }

    // 繪製泡沫細胞 (Foam Cells)
    foamCells.forEach(fc => {
      const fx = PLAQUE_CENTER_X + fc.offsetX;
      const minEndoY = getLowerEndotheliumY(fx, false) + fc.r + 6;
      const fy = Math.max(minEndoY, INTIMA_FLOOR_Y - fc.offsetY);
      fc.renderX = fx;
      fc.renderY = fy;

      // 泡沫細胞外膜
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

      // 內部滿滿的黃色脂質油滴 (泡沫狀外觀)
      ctx.fillStyle = '#fef9c3';
      for (let d = 0; d < fc.droplets; d++) {
        const ang = (d / fc.droplets) * Math.PI * 2 + fc.phase;
        const dist = fc.r * 0.48;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * dist, fy + Math.sin(ang) * dist, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 被擠到邊緣的暗紫色細胞核
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

    // 1. 若有纖維帽 (Stage 3+)，繪製覆蓋在斑塊頂部內皮下方的膠原蛋白纖維帽 (Fibrous Cap)
    if (capThickness > 0.05 && plaqueHeight > 25) {
      const apex = getPlaqueApex();
      ctx.strokeStyle = currentStage >= 4
        ? `rgba(253, 164, 175, ${0.42 * capThickness})` // 薄化脆弱
        : `rgba(254, 226, 226, ${0.75 * capThickness})`;
      ctx.lineWidth = currentStage >= 4 ? 3.5 : 7.5 * capThickness;

      // 左半側纖維帽
      ctx.beginPath();
      for (let x = PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85; x <= PLAQUE_CENTER_X - (ruptureState > 0.2 ? 22 : 0); x += 8) {
        const y = getLowerEndotheliumY(x) + 8;
        if (x === PLAQUE_CENTER_X - PLAQUE_HALF_W * 0.85) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 右半側纖維帽 (若破裂則中間留出裂口)
      if (ruptureState > 0.2) {
        ctx.beginPath();
        for (let x = PLAQUE_CENTER_X + 22; x <= PLAQUE_CENTER_X + PLAQUE_HALF_W * 0.85; x += 8) {
          const y = getLowerEndotheliumY(x) + 8;
          if (x === PLAQUE_CENTER_X + 22) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // 2. 繪製平滑肌細胞 (紡錘形 Spindle-shaped cells)
    smcCells.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      // 計算順應血管壁的切線角度
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

      // 紡錘形細胞核
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

    // 上排健康內皮細胞
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

    // 下排內皮細胞 (包含斑塊區受損、間隙變大與破裂缺口)
    for (let i = 0; i < count; i++) {
      const cx = i * cellWidth + cellWidth * 0.5;
      const cy = getLowerEndotheliumY(cx);
      const distFromPlaque = Math.abs(cx - PLAQUE_CENTER_X);

      // 若斑塊已破裂 (Stage 5/6)，頂點處內皮與纖維帽斷裂分開
      if (ruptureState > 0.25 && distFromPlaque < 26 * ruptureState) {
        continue;
      }

      const isDamaged = currentStage >= 1 && distFromPlaque < 185;
      const dy = getLowerEndotheliumY(cx + 8) - getLowerEndotheliumY(cx - 8);
      const angle = Math.atan2(dy, 16);

      ctx.save();
      ctx.translate(cx, cy + 3);
      ctx.rotate(angle);

      // 受損內皮細胞會縮小使細胞間隙 (Gap) 變寬，並呈現發炎暗橘紅色
      const radiusX = isDamaged ? cellWidth * 0.35 : cellWidth * 0.47;
      ctx.fillStyle = isDamaged ? '#ea580c' : '#f43f5e';
      ctx.strokeStyle = isDamaged ? '#fdba74' : '#fda4af';
      ctx.lineWidth = 1.1;

      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 受損內皮表面表現 VCAM-1 黏附分子受體 (供單核球識別黏附)
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

      // 雙凹圓盤狀紅血球
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
    // 1. 繪製 LDL 與 ox-LDL
    ctx.save();
    ctx.globalAlpha = getRoleAlpha('ldl');

    ldls.forEach(l => {
      const isOx = l.state === 'oxidized';
      ctx.save();
      ctx.translate(l.x, l.y);

      if (isOx) {
        // 氧化型低密度脂蛋白 (ox-LDL)：深橘紅發光並帶有自由基刺狀光暈
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
        // 一般 LDL 膽固醇：亮金黃色微粒
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

    // 2. 繪製 HDL 好膽固醇 (血管清道夫)
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

      // 若已裝載清除的膽固醇，中心顯示小黃點
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

      // 細胞本體 (巨噬細胞帶有變形蟲偽足波浪邊緣)
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

      // 腎形/馬蹄形細胞核 (單核球與巨噬細胞特徵)
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(-1.5, 0, m.r * 0.42, 0.4, Math.PI * 1.75);
      ctx.fill();

      // 已吞噬的黃色膽固醇油滴
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

    // 1. 繪製斑塊破裂噴出的致凝血脂質碎片
    ruptureDebris.forEach(d => {
      ctx.fillStyle = `rgba(251, 146, 60, ${d.life})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. 繪製破裂裂口閃光警示
    if (ruptureState > 0.25) {
      const glow = ctx.createRadialGradient(apex.x, apex.y, 4, apex.x, apex.y, 38 * ruptureState);
      glow.addColorStop(0, 'rgba(248, 113, 113, 0.75)');
      glow.addColorStop(1, 'rgba(248, 113, 113, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, 38 * ruptureState, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 繪製被血栓困住的紅血球與纖維蛋白網 (Fibrin Mesh)
    if (thrombusSize > 0.05) {
      // 被困住的紅血球團塊
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

      // 交織的金白纖維蛋白網 (Fibrin Strands)
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

    // 4. 繪製血小板 (未活化呈小橢圓盤，活化呈星芒偽足狀)
    platelets.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.state === 'activated' || p.state === 'homing') {
        // 活化星芒狀血小板
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
        // 未活化平滑血小板
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.65, p.angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  function drawAnatomicalLabelsAndFX() {
    ctx.save();
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';

    // 左側解剖構造標籤
    ctx.fillStyle = 'rgba(254, 202, 202, 0.72)';
    ctx.fillText('動脈管腔 (Arterial Lumen) ── 血流方向 ➔', 18, WALL_TOP_Y + 32);

    ctx.fillStyle = 'rgba(253, 164, 175, 0.8)';
    ctx.fillText('血管內皮層 (Endothelium)', 18, WALL_BOT_BASE_Y - 8);

    ctx.fillStyle = 'rgba(253, 224, 71, 0.82)';
    ctx.fillText('內膜下層 (Intima / 斑塊形成區)', 18, INTIMA_FLOOR_Y - 12);

    ctx.fillStyle = 'rgba(244, 114, 182, 0.8)';
    ctx.fillText('中膜平滑肌層 (Tunica Media - 平滑肌細胞)', 18, INTIMA_FLOOR_Y + 34);

    // 斑塊區動態標示
    const apex = getPlaqueApex();
    if (plaqueHeight > 32) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('▲ 粥狀脂質核心與泡沫細胞 (Atheromatous Plaque)', PLAQUE_CENTER_X, INTIMA_FLOOR_Y - 10);

      if (capThickness > 0.3 && ruptureState < 0.3) {
        ctx.fillStyle = '#fecdd3';
        ctx.fillText('── 纖維帽 (Fibrous Cap) ──', apex.x, apex.y + 22);
      }
    }

    if (thrombusSize > 0.25) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif';
      ctx.fillText('🚨 血栓形成 (Thrombus) 阻塞血流', apex.x, apex.y - 58 * thrombusSize - 12);
    }

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

  // ==================== 滑鼠互動：顯微探針與點擊投放 ====================
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const hit = findHoveredEntity(mx, my);
    if (hit) {
      microTooltip.style.display = 'block';
      const tipX = Math.min(rect.width - 260, Math.max(10, e.clientX - rect.left));
      const tipY = Math.max(45, e.clientY - rect.top - 18);
      microTooltip.style.left = `${tipX}px`;
      microTooltip.style.top = `${tipY}px`;
      tooltipTitle.textContent = hit.title;
      tooltipDesc.textContent = hit.desc;
    } else {
      microTooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    microTooltip.style.display = 'none';
  });

  function findHoveredEntity(mx, my) {
    // 1. 檢查泡沫細胞
    for (const fc of foamCells) {
      if (fc.renderX && Math.hypot(mx - fc.renderX, my - fc.renderY) < fc.r + 4) {
        return {
          title: '🫧 泡沫細胞 (Foam Cell)',
          desc: '吞噬了過量氧化膽固醇 (ox-LDL) 的巨噬細胞，內部塞滿脂質油滴，堆積形成粥狀斑塊的核心。'
        };
      }
    }

    // 2. 檢查免疫細胞 (單核球 / 巨噬細胞)
    for (const m of immuneCells) {
      if (Math.hypot(mx - m.x, my - m.y) < m.r + 5) {
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

    // 3. 檢查血小板
    for (const p of platelets) {
      if (Math.hypot(mx - p.x, my - p.y) < p.r + 7) {
        if (p.state === 'activated') {
          return {
            title: '🩸 活化血小板與纖維蛋白血栓 (Thrombus)',
            desc: '接觸斑塊破裂處後伸出偽足活化，與纖維蛋白網交織困住紅血球，造成急性血管阻塞。'
          };
        }
        return {
          title: '🟡 血小板 (Platelet)',
          desc: '血液中負責止血的小細胞碎片；當動脈斑塊破裂時會被大量召集並引發血栓。'
        };
      }
    }

    // 4. 檢查 HDL 好膽固醇
    for (const h of hdls) {
      if (Math.hypot(mx - h.x, my - h.y) < h.r + 6) {
        return {
          title: '🥗 高密度脂蛋白 (HDL - 好膽固醇)',
          desc: '血管清道夫！能進入受損內膜將多餘膽固醇逆向運回肝臟代謝，減緩斑塊惡化。'
        };
      }
    }

    // 5. 檢查 LDL 與 ox-LDL
    for (const l of ldls) {
      if (Math.hypot(mx - l.x, my - l.y) < l.r + 6) {
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

    // 6. 檢查平滑肌細胞
    for (const s of smcCells) {
      if (Math.hypot(mx - s.x, my - s.y) < 16) {
        return {
          title: '🧬 血管平滑肌細胞 (Smooth Muscle Cell)',
          desc: s.inCap
            ? '已遷移至斑塊頂部，分泌膠原蛋白構築「纖維帽」以覆蓋脂質核心。'
            : '位於動脈中膜層，負責維持血管壁彈性與收縮舒張。'
        };
      }
    }

    return null;
  }

  // 點擊畫布：依點擊位置投放膽固醇或召喚免疫細胞
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    const wallY = getLowerEndotheliumY(mx, false);
    if (my >= wallY - 12 && my <= INTIMA_FLOOR_Y) {
      // 點擊斑塊/內膜區：直接召喚一顆單核球鑽入內膜吞噬
      spawnImmuneAction(mx);
    } else if (my > WALL_TOP_Y && my < wallY) {
      // 點擊血管腔：在點擊處投放數顆 LDL 膽固醇
      for (let i = 0; i < 4; i++) {
        const l = createLDL(mx + (Math.random() - 0.5) * 30, true);
        l.y = my + (Math.random() - 0.5) * 24;
        ldls.push(l);
      }
      addFloatingFX(mx, my - 10, '+ 投放 LDL 膽固醇', '#fde047');
    }
  });

  // ==================== 工具列按鈕與事件綁定 ====================
  function spawnLDLAction() {
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

  btnStageAction.addEventListener('click', () => {
    if (currentStage < STAGES.length - 1) {
      setStage(currentStage + 1);
    } else {
      // 在階段 6 點擊「施打溶栓藥物 (tPA)」
      clotBusterActive = 4.5;
      const apex = getPlaqueApex();
      addFloatingFX(apex.x, apex.y - 45, '💉 施打溶栓劑 (tPA)！溶解纖維蛋白血栓中...', '#34d399');
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

  // 角色圖鑑點擊聚焦篩選
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const role = item.getAttribute('data-role');
      if (focusedRole === role) {
        focusedRole = null;
      } else {
        focusedRole = role;
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

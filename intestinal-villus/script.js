/**
 * 小腸絨毛構造與養分吸收動態模擬 (Pure HTML5 Canvas + Vanilla JS, No Node)
 * 呈現：
 * 1. 絨毛立體外觀（左右背景絨毛）與中央解剖剖面絨毛
 * 2. 絨毛上皮細胞（單層柱狀上皮 + 細胞核 + 刷狀緣微絨毛）
 * 3. 乳糜管（中央黃綠色淋巴管）、微血管網（右紅動脈端上升 ➔ 網狀微血管 ➔ 左藍靜脈端下降）、底部小動脈、小靜脈
 * 4. 養分大分子從左方流入 ➔ 在絨毛周圍被消化酵素（腸液酶與刷狀緣酶）分解成小分子 ➔ 穿過絨毛上皮細胞 ➔ 分流進入微血管或乳糜管並隨血液/淋巴流走
 */

(function () {
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvas-wrapper');

  // UI 元素
  const countBloodEl = document.getElementById('count-blood');
  const countLymphEl = document.getElementById('count-lymph');
  const toggleLabelsEl = document.getElementById('toggle-labels');
  const toggleEnzymesEl = document.getElementById('toggle-enzymes');
  const toggleRbcEl = document.getElementById('toggle-rbc');
  const autoSpawnEl = document.getElementById('auto-spawn');
  const simSpeedEl = document.getElementById('sim-speed');
  const speedValEl = document.getElementById('speed-val');
  const enzymeDensityEl = document.getElementById('enzyme-density');
  const enzymeValEl = document.getElementById('enzyme-val');
  const btnPause = document.getElementById('btn-pause');
  const btnClear = document.getElementById('btn-clear');
  const btnBurst = document.getElementById('btn-burst');
  const infoTitleEl = document.getElementById('info-title');
  const infoDescEl = document.getElementById('info-desc');
  const tooltipEl = document.getElementById('structure-tooltip');
  const stageEls = [
    document.getElementById('stage-1'),
    document.getElementById('stage-2'),
    document.getElementById('stage-3')
  ];

  // 邏輯基準座標系 (920 x 700)
  const VW = 920;
  const VH = 700;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // 狀態變數
  let isPaused = false;
  let simSpeed = 1.0;
  let absorbedBloodCount = 0;
  let absorbedLymphCount = 0;
  let selectedStructureId = null;
  let hoveredStructureId = null;
  let spawnTimer = 0;
  let timeTick = 0;

  // 粒子陣列
  const macromolecules = []; // 左側流入的大分子養分
  const monomers = [];       // 酵素分解後的小分子養分
  const enzymes = [];        // 腸腔與刷狀緣附近的消化酵素
  const rbcs = [];           // 微血管與小動靜脈內的紅血球
  const effects = [];        // 酵素催化閃光與文字特效

  // 預先計算的絨毛上皮細胞陣列与血管路徑
  const epithelialCells = [];
  const capillaryPaths = [];
  const lactealPath = [];

  // 構造資訊字典（對應教材圖片中的六大標示）
  const STRUCTURES = {
    villus: {
      id: 'villus',
      name: '絨毛 (Intestinal Villus)',
      labelX: 165,
      labelY: 98,
      targetX: 392,
      targetY: 98,
      hitRadius: 38,
      desc: '小腸內壁環狀皺褶上的指狀突起，長度約 0.5～1.5 毫米。大量絨毛能使小腸吸收養分的表面積擴大數百倍。'
    },
    lacteal: {
      id: 'lacteal',
      name: '乳糜管 (Lacteal)',
      labelX: 165,
      labelY: 235,
      targetX: 560,
      targetY: 235,
      hitRadius: 34,
      desc: '位於絨毛中央的微淋管（黃綠色）。專門吸收脂溶性養分（脂肪酸、甘油重組成的乳糜微粒及脂溶性維生素 A、D、E、K），因富含脂肪時呈乳白色而得名。'
    },
    epithelium: {
      id: 'epithelium',
      name: '絨毛上皮細胞 (Epithelial Cells)',
      labelX: 165,
      labelY: 385,
      targetX: 468,
      targetY: 385,
      hitRadius: 36,
      desc: '排列在絨毛最外層的單層柱狀上皮細胞，游離面具有密集的「微絨毛」（刷狀緣）。細胞膜外側牢牢嵌有雙醣酶與肽酶（刷狀緣酵素，負責最後一步分解）；微絨毛膜上【無脂酶】，脂質在腸腔先行分解後直接穿膜擴散。'
    },
    capillary: {
      id: 'capillary',
      name: '微血管 (Blood Capillaries)',
      labelX: 165,
      labelY: 515,
      targetX: 534,
      targetY: 515,
      hitRadius: 36,
      desc: '分布於絨毛內部的緻密微血管網。負責吸收水溶性養分（如葡萄糖、半乳糖、果糖、胺基酸、水溶性維生素 B 群與 C、礦物質），再匯入小靜脈經肝門靜脈送往肝臟。'
    },
    arteriole: {
      id: 'arteriole',
      name: '小動脈 (Arteriole)',
      labelX: 120,
      labelY: 608,
      targetX: 295,
      targetY: 608,
      hitRadius: 32,
      desc: '位於絨毛基部（紅色血管），攜帶富含氧氣的充氧血由左方流入，並從左側微動脈分支向上進入絨毛微血管網（左側紅色向上箭頭），提供絨毛上皮細胞進行主動運輸所需的氧氣與能量。'
    },
    venule: {
      id: 'venule',
      name: '小靜脈 (Venule)',
      labelX: 120,
      labelY: 658,
      targetX: 295,
      targetY: 632,
      hitRadius: 32,
      desc: '位於絨毛基部（藍紫色血管），收集絨毛微血管網吸收了大量葡萄糖與胺基酸的血液（右側藍色向下箭頭），匯入小靜脈往右方流向肝門靜脈。'
    }
  };

  // ==========================================
  // 1. 幾何路徑與絨毛解剖構造建立
  // ==========================================
  function getVillusMidCurvePoint(t) {
    // t 從 0 (左側底部) -> 0.5 (絨毛頂端) -> 1.0 (右側底部)
    // 中央剖面絨毛中心軸 X = 560, 頂部 Y = 115, 底部轉折 Y = 540
    const cx = 560;
    const topY = 105;
    const bottomY = 555;
    const halfW = 86;

    if (t < 0.16) {
      // 左側底部水平段過渡到垂直段 (x: 260 -> 474, y: 555)
      const u = t / 0.16;
      const x = 260 + u * (cx - halfW - 260);
      const y = bottomY - Math.pow(u, 3) * 18;
      return { x, y };
    } else if (t < 0.38) {
      // 左側垂直上升段
      const u = (t - 0.16) / 0.22;
      const x = (cx - halfW) + Math.sin(u * Math.PI * 0.5) * 6;
      const y = (bottomY - 18) - u * (bottomY - 18 - 195);
      return { x, y };
    } else if (t <= 0.62) {
      // 頂端圓弧拱頂 (u: 0 -> 1, 角度 PI -> 0)
      const u = (t - 0.38) / 0.24;
      const angle = Math.PI * (1 - u);
      const rx = halfW - 6;
      const ry = 90;
      const x = cx + Math.cos(angle) * rx;
      const y = 195 - Math.sin(angle) * ry;
      return { x, y };
    } else if (t < 0.84) {
      // 右側垂直下降段
      const u = (t - 0.62) / 0.22;
      const x = (cx + halfW) - Math.cos(u * Math.PI * 0.5) * 6;
      const y = 195 + u * (bottomY - 18 - 195);
      return { x, y };
    } else {
      // 右側底部轉折水平段
      const u = (t - 0.84) / 0.16;
      const x = (cx + halfW) + u * (880 - (cx + halfW));
      const y = (bottomY - 18) + Math.pow(1 - u, 3) * 0 + u * 18;
      return { x, y };
    }
  }

  function initEpithelialCells() {
    epithelialCells.length = 0;
    const steps = 68;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      pts.push(getVillusMidCurvePoint(i / steps));
    }

    for (let i = 0; i < steps; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const mx = (p1.x + p2.x) * 0.5;
      const my = (p1.y + p2.y) * 0.5;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      // 法向量（朝向腸腔外側：曲線由左至頂至右，外側法向量為 (dy, -dx)）
      const nx = dy / len;
      const ny = -dx / len;
      const angle = Math.atan2(ny, nx);

      epithelialCells.push({
        x: mx,
        y: my,
        nx,
        ny,
        angle,
        width: Math.max(11, len * 1.05),
        height: 30
      });
    }
  }

  function initVascularPaths() {
    capillaryPaths.length = 0;
    lactealPath.length = 0;

    // 建構 4 條不同高度的微血管迴路（微血管左進右出：從左側小動脈進入 -> 左側微動脈分支(x:534)向上 -> 由左往右橫跨微血管網 -> 右側微靜脈端(x:586)向下匯入小靜脈 -> 向右方流出）
    const loopHeights = [165, 255, 360, 450];
    loopHeights.forEach((topY, idx) => {
      const path = [
        { x: 255, y: 608 }, // 由左側進入底部小動脈 (左 -> 右)
        { x: 534, y: 608 }, // 抵達絨毛左側微動脈入口
        { x: 534, y: 500 }, // 沿左側微動脈向上 (配合左側紅色向上箭頭)
        { x: 534, y: topY + 25 },
        { x: 546, y: topY },
        { x: 574, y: topY + (idx % 2 === 0 ? -8 : 10) }, // 由左往右橫越微血管網
        { x: 586, y: topY + 25 },
        { x: 586, y: 510 }, // 沿右側微靜脈向下 (配合右側藍色向下箭頭)
        { x: 586, y: 632 }, // 匯入底部小靜脈
        { x: 880, y: 632 }  // 順著底部小靜脈向右方流走 (左 -> 右)
      ];
      capillaryPaths.push(path);
    });

    // 乳糜管路徑（從絨毛頂端中央乳糜管 -> 垂直向下 -> 匯入底部總淋巴管向右流走）
    lactealPath.push(
      { x: 560, y: 195 },
      { x: 560, y: 350 },
      { x: 560, y: 520 },
      { x: 560, y: 658 },
      { x: 880, y: 658 }
    );
  }

  function initRedBloodCells() {
    rbcs.length = 0;
    for (let i = 0; i < 28; i++) {
      const pathIdx = i % capillaryPaths.length;
      rbcs.push({
        pathIdx,
        progress: (i / 28) + Math.random() * 0.03,
        speed: 0.0014 + (i % 3) * 0.00025
      });
    }
  }

  function initEnzymes() {
    enzymes.length = 0;
    const densityLevel = parseInt(enzymeDensityEl.value, 10); // 1, 2, 3

    // 1. 微絨毛膜結合酵素 (雙醣酶與肽酶，牢固鑲嵌於微絨毛外膜/刷狀緣)
    // 分布在左側與頂端迎著食糜流入的絨毛上皮細胞 (cell index 12 ~ 36)
    const stepInterval = densityLevel === 1 ? 4 : densityLevel === 2 ? 3 : 2;
    let toggleType = 0;
    for (let cIdx = 12; cIdx <= 36; cIdx += stepInterval) {
      if (!epithelialCells[cIdx]) continue;
      const cell = epithelialCells[cIdx];
      const isMaltase = toggleType % 2 === 0;
      toggleType++;

      const membraneApexDist = cell.height * 0.5; // 15px (微絨毛外膜)
      const stalkLen = 9; // 酵素突出於細胞膜微絨毛外側的長度
      const enzX = cell.x + cell.nx * (membraneApexDist + stalkLen);
      const enzY = cell.y + cell.ny * (membraneApexDist + stalkLen);

      enzymes.push({
        id: (isMaltase ? 'maltase_' : 'peptidase_') + cIdx,
        type: isMaltase ? 'maltase' : 'peptidase',
        name: isMaltase ? '雙醣酶 (微絨毛膜)' : '肽酶 (微絨毛膜)',
        substrate: isMaltase ? 'carb' : 'protein',
        isMembrane: true,
        cellIndex: cIdx,
        baseX: enzX,
        baseY: enzY,
        x: enzX,
        y: enzY,
        nx: cell.nx,
        ny: cell.ny,
        angle: cell.angle,
        stalkBaseX: cell.x + cell.nx * membraneApexDist,
        stalkBaseY: cell.y + cell.ny * membraneApexDist,
        busyTimer: 0,
        vibrateOffset: Math.random() * Math.PI * 2
      });
    }

    // 2. 小腸腔游離酵素：胰脂酶 (游離於左側與中央小腸腔液體中；微絨毛膜上無脂酶)
    const lipaseCount = densityLevel === 1 ? 3 : densityLevel === 2 ? 5 : 8;
    for (let i = 0; i < lipaseCount; i++) {
      const baseX = 210 + Math.random() * 190;
      const baseY = 130 + Math.random() * 340;
      const angle = Math.random() * Math.PI * 2;
      enzymes.push({
        id: 'lipase_' + i,
        type: 'lipase',
        name: '胰脂酶 (小腸腔游離)',
        substrate: 'lipid',
        isMembrane: false,
        x: baseX,
        y: baseY,
        homeX: baseX,
        homeY: baseY,
        vx: Math.cos(angle) * 0.55,
        vy: Math.sin(angle) * 0.55,
        busyTimer: 0,
        mouthPhase: Math.random() * Math.PI * 2
      });
    }
  }

  // ==========================================
  // 2. 養分分子生成與分解邏輯 (酵素專一性機制)
  // ==========================================
  function spawnMacromolecule(type, customY) {
    const types = ['carb', 'protein', 'lipid'];
    const chosen = type || types[Math.floor(Math.random() * types.length)];
    // 從左方畫面邊緣流入 (x: 20 ~ 90, y: 95 ~ 480)
    const startX = 25 + Math.random() * 45;
    const startY = customY !== undefined ? customY : (105 + Math.random() * 365);

    // 設定目標靠近中央解剖絨毛的左側刷狀緣 (x: 420 ~ 438)
    const targetY = Math.max(125, Math.min(485, startY + (Math.random() - 0.5) * 90));
    const targetX = targetY < 190 ? 430 + (190 - targetY) * 0.45 : 425;

    macromolecules.push({
      type: chosen,
      x: startX,
      y: startY,
      targetX,
      targetY,
      vx: 1.05 + Math.random() * 0.45,
      vy: (targetY - startY) * 0.004,
      angle: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.025,
      digestionProgress: 0, // 0 ~ 100，達 100 時分解成小分子
      beingDigested: false
    });

    highlightStage(0);
  }

  function cleaveMacromolecule(macro, enzyme) {
    // 產生分解閃光與文字特效 (依專一性與空間位置明確標示)
    const labelMap = {
      carb: '雙醣酶 (微絨毛膜) ➔ 葡萄糖',
      protein: '肽酶 (微絨毛膜) ➔ 胺基酸',
      lipid: '胰脂酶 (小腸腔) ➔ 脂肪酸與微胞'
    };
    const colorMap = {
      carb: '#0284c7',
      protein: '#8b5cf6',
      lipid: '#f59e0b'
    };

    effects.push({
      x: macro.x,
      y: macro.y,
      radius: 6,
      maxRadius: 36,
      alpha: 1,
      color: colorMap[macro.type],
      text: labelMap[macro.type],
      vy: -0.65
    });

    if (enzyme) {
      enzyme.busyTimer = 28;
    }

    // 一個大分子分解為 3 個小分子單體
    const count = 3;
    for (let i = 0; i < count; i++) {
      const offsetAngle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const mx = macro.x + Math.cos(offsetAngle) * 12;
      const my = macro.y + Math.sin(offsetAngle) * 12;

      // 決定穿過絨毛上皮細胞的高度 Y (限制在絨毛直立區段 185 ~ 495)
      const absorbY = Math.max(185, Math.min(490, my + (i - 1) * 22));
      const isWaterSoluble = macro.type === 'carb' || macro.type === 'protein';

      // 建立該小分子的吸收與運輸路徑點 (Waypoints)
      let waypoints = [];
      if (isWaterSoluble) {
        // 水溶性養分（葡萄糖、胺基酸）— 微血管左進右出：
        // 1. 經上皮細胞膜轉運蛋白主動運輸穿膜 (x: 462 -> 498)
        // 2. 從左側進入微血管網 (x: 534, y: absorbY)
        // 3. 順著微血管網由左往右橫向流動至右側微靜脈端 (x: 586, y: absorbY)
        // 4. 順著右側微靜脈向下（配合右側藍色向下箭頭）匯入底部小靜脈 (x: 586, y: 632)
        // 5. 隨小靜脈血液向右方流出 (x: 880, y: 632)
        waypoints = [
          { x: 462, y: absorbY, stage: 'epithelium', desc: '膜轉運蛋白主動運輸' },
          { x: 498, y: absorbY, stage: 'crossing' },
          { x: 534, y: absorbY, stage: 'vessel' },
          { x: 586, y: absorbY + 6, stage: 'capillary_cross' },
          { x: 586, y: 632, stage: 'venule' },
          { x: 880, y: 632, stage: 'exit' }
        ];
      } else {
        // 脂溶性養分（脂肪酸+甘油微胞）：
        // 1. 在微絨毛膜直接【簡單擴散穿膜】(膜上無脂酶！)
        // 2. 在上皮細胞內質網重組成三酸甘油酯並包裝為乳糜微粒 (x: 510)
        // 3. 進入絨毛中央的黃綠色乳糜管 (x: 560, y: absorbY)
        // 4. 順著乳糜管向下流入底部淋巴管 (x: 560, y: 658)
        // 5. 隨淋巴液由左往右流出 (x: 880, y: 658)
        waypoints = [
          { x: 452, y: absorbY, stage: 'diffuse_in', desc: '脂溶性直接擴散穿膜' },
          { x: 480, y: absorbY, stage: 'epithelium' },
          { x: 512, y: absorbY, stage: 'crossing', desc: '合成乳糜微粒' },
          { x: 560, y: absorbY, stage: 'vessel' },
          { x: 560, y: 658, stage: 'lymph_trunk' },
          { x: 880, y: 658, stage: 'exit' }
        ];
      }

      monomers.push({
        type: macro.type, // 'carb' (葡萄糖), 'protein' (胺基酸), 'lipid' (脂肪酸/乳糜微粒)
        x: mx,
        y: my,
        waypoints,
        wpIndex: 0,
        speed: (macro.type === 'lipid' ? 1.55 : 1.68) + Math.random() * 0.3,
        counted: false,
        inVessel: false,
        pulse: Math.random() * Math.PI * 2
      });
    }

    highlightStage(1);
  }

  function highlightStage(idx) {
    stageEls.forEach((el, i) => {
      if (i === idx) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // ==========================================
  // 3. 物理與動畫更新迴圈 (Update)
  // ==========================================
  function updateSimulation() {
    if (isPaused) return;
    timeTick += 0.04 * simSpeed;

    // 1. 自動連續從左方生成養分大分子
    if (autoSpawnEl.checked) {
      spawnTimer += simSpeed;
      if (spawnTimer >= 72) {
        spawnTimer = 0;
        if (macromolecules.length < 18) {
          spawnMacromolecule();
        }
      }
    }

    // 2. 更新紅血球在微血管網內的流動
    rbcs.forEach(rbc => {
      rbc.progress += rbc.speed * simSpeed;
      if (rbc.progress >= 1) {
        rbc.progress -= 1;
      }
    });

    // 3. 更新消化酵素：
    // (A) 膜結合酵素 (雙醣酶/肽酶)：牢固嵌在微絨毛外膜，受微腸蠕動微幅擺動
    // (B) 腸腔游離胰脂酶：自由游動於小腸腔液中，具專一性，專門追蹤催化三酸甘油酯
    enzymes.forEach(enz => {
      if (enz.busyTimer > 0) enz.busyTimer -= simSpeed;

      if (enz.isMembrane) {
        // 微絨毛外膜結合酵素：輕微波動
        enz.vibrateOffset += 0.08 * simSpeed;
        const wobble = Math.sin(timeTick * 2.2 + enz.vibrateOffset) * 1.8;
        enz.x = enz.baseX + enz.ny * wobble;
        enz.y = enz.baseY - enz.nx * wobble;
      } else {
        // 腸腔游離胰脂酶：游離巡邏並專一追蹤脂質大分子
        enz.mouthPhase += 0.18 * simSpeed;

        let nearestLipid = null;
        let minDist = 135;
        for (let i = 0; i < macromolecules.length; i++) {
          const m = macromolecules[i];
          if (m.type === 'lipid' && m.x > 80 && m.x < 440) {
            const d = Math.hypot(m.x - enz.x, m.y - enz.y);
            if (d < minDist) {
              minDist = d;
              nearestLipid = m;
            }
          }
        }

        if (nearestLipid) {
          const dx = nearestLipid.x - enz.x;
          const dy = nearestLipid.y - enz.y;
          const d = Math.hypot(dx, dy) || 1;
          enz.vx += (dx / d) * 0.22 * simSpeed;
          enz.vy += (dy / d) * 0.22 * simSpeed;
        } else {
          // 緩和回到巡邏區域
          const dx = enz.homeX - enz.x;
          const dy = enz.homeY - enz.y;
          enz.vx += dx * 0.006 * simSpeed + (Math.random() - 0.5) * 0.08;
          enz.vy += dy * 0.006 * simSpeed + (Math.random() - 0.5) * 0.08;
        }

        const speed = Math.hypot(enz.vx, enz.vy);
        const maxSpd = 1.95;
        if (speed > maxSpd) {
          enz.vx = (enz.vx / speed) * maxSpd;
          enz.vy = (enz.vy / speed) * maxSpd;
        }

        enz.x += enz.vx * simSpeed;
        enz.y += enz.vy * simSpeed;

        // 邊界限制在小腸腔中
        if (enz.x < 170) enz.x = 170;
        if (enz.x > 425) enz.x = 425;
        if (enz.y < 85) enz.y = 85;
        if (enz.y > 515) enz.y = 515;
      }
    });

    // 4. 更新大分子養分（酵素專一性催化機制）：
    // - 醣類 (carb)：只由微絨毛膜上的「雙醣酶 (maltase)」水解
    // - 蛋白質 (protein)：只由微絨毛膜上的「肽酶 (peptidase)」水解
    // - 脂質 (lipid)：在小腸腔由游離的「胰脂酶 (lipase)」水解；微絨毛膜無脂酶！
    for (let i = macromolecules.length - 1; i >= 0; i--) {
      const m = macromolecules[i];
      m.angle += m.va * simSpeed;
      m.beingDigested = false;

      // 朝向絨毛左側刷狀緣移動
      const dx = m.targetX - m.x;
      const dy = m.targetY - m.y;
      if (dx > 12) {
        m.x += m.vx * simSpeed;
        m.y += (dy * 0.015 + Math.sin(timeTick + i) * 0.25) * simSpeed;
      } else {
        // 已抵達絨毛上皮細胞刷狀緣外圍，微微浮動
        m.x += Math.sin(timeTick * 2 + i) * 0.2 * simSpeed;
        m.y += Math.cos(timeTick * 2 + i) * 0.2 * simSpeed;
      }

      let catalystEnzyme = null;

      if (m.type === 'lipid') {
        // 脂質：由小腸腔液中的胰脂酶 (lipase) 催化水解
        for (let j = 0; j < enzymes.length; j++) {
          const enz = enzymes[j];
          if (enz.type === 'lipase') {
            const dist = Math.hypot(enz.x - m.x, enz.y - m.y);
            if (dist < 34) {
              m.digestionProgress += 3.2 * simSpeed;
              m.beingDigested = true;
              catalystEnzyme = enz;
              break;
            }
          }
        }
        // 微絨毛細胞膜上【無脂酶】：若脂質大分子未經胰脂酶分解即抵達刷狀緣，不能被膜水解
        // 必須等待腸腔胰脂酶前來催化
        if (dx <= 12 && !catalystEnzyme && m.digestionProgress < 20) {
          // 微微浮動等待胰脂酶
        }
      } else {
        // 醣類 (carb) 與 蛋白質 (protein)：抵達微絨毛膜時，由專一的膜結合酵素水解
        const reqType = m.type === 'carb' ? 'maltase' : 'peptidase';
        for (let j = 0; j < enzymes.length; j++) {
          const enz = enzymes[j];
          if (enz.type === reqType) {
            const dist = Math.hypot(enz.x - m.x, enz.y - m.y);
            if (dist < 36) {
              m.digestionProgress += 3.0 * simSpeed;
              m.beingDigested = true;
              catalystEnzyme = enz;
              break;
            }
          }
        }

        // 當抵達微絨毛刷狀緣 (dx <= 12)，微絨毛膜結合酵素持續依專一性催化
        if (dx <= 12 && !catalystEnzyme) {
          m.digestionProgress += 1.3 * simSpeed;
          m.beingDigested = true;
        }
      }

      if (m.digestionProgress >= 100) {
        cleaveMacromolecule(m, catalystEnzyme);
        macromolecules.splice(i, 1);
      }
    }

    // 5. 更新分解後的小分子養分（穿過絨毛上皮細胞 -> 進入微血管或乳糜管 -> 隨血液/淋巴流動）
    for (let i = monomers.length - 1; i >= 0; i--) {
      const mo = monomers[i];
      mo.pulse += 0.15 * simSpeed;
      const target = mo.waypoints[mo.wpIndex];
      if (!target) {
        monomers.splice(i, 1);
        continue;
      }

      const dx = target.x - mo.x;
      const dy = target.y - mo.y;
      const dist = Math.hypot(dx, dy);

      // 在血管或乳糜管內隨血流加速移動
      const currentSpeed = (mo.wpIndex >= 2 ? mo.speed * 1.45 : mo.speed) * simSpeed;

      if (dist <= currentSpeed) {
        mo.x = target.x;
        mo.y = target.y;

        // 當進入微血管或乳糜管節點 (wpIndex === 2) 時，累加吸收計數並高亮第 3 階段
        if (mo.wpIndex === 2 && !mo.counted) {
          mo.counted = true;
          mo.inVessel = true;
          if (mo.type === 'lipid') {
            absorbedLymphCount++;
            countLymphEl.textContent = absorbedLymphCount;
          } else {
            absorbedBloodCount++;
            countBloodEl.textContent = absorbedBloodCount;
          }
          highlightStage(2);
        }

        mo.wpIndex++;
        if (mo.wpIndex >= mo.waypoints.length) {
          monomers.splice(i, 1);
        }
      } else {
        mo.x += (dx / dist) * currentSpeed;
        mo.y += (dy / dist) * currentSpeed;
      }
    }

    // 6. 更新視覺特效
    for (let i = effects.length - 1; i >= 0; i--) {
      const ef = effects[i];
      ef.radius += 1.2 * simSpeed;
      ef.y += ef.vy * simSpeed;
      ef.alpha -= 0.024 * simSpeed;
      if (ef.alpha <= 0) {
        effects.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 4. 繪圖函式庫 (Render) — 忠實還原教材解剖圖並結合動態粒子
  // ==========================================
  function drawScene() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. 繪製小腸腔背景與左方流入食糜波紋
    drawLumenBackground();

    // 2. 繪製後方與左右兩側的立體未剖開絨毛 (還原原圖中的立體指狀絨毛群)
    drawSurroundingVilli();

    // 3. 繪製中央剖面絨毛的內部固有層底色与黏膜下層基部
    drawCentralVillusInterior();

    // 4. 繪製絨毛內部管道：中央乳糜管、微血管網、小動脈、小靜脈與血流方向箭頭
    drawVesselsAndLacteal();

    // 5. 繪製絨毛上皮細胞層 (單層柱狀上皮 + 細胞核 + 刷狀緣微絨毛)
    drawEpithelialLayer();

    // 6. 繪製消化酵素、大分子養分、小分子養分、分解特效
    if (toggleEnzymesEl.checked) {
      drawEnzymes();
    }
    drawMacromolecules();
    drawMonomers();
    drawEffects();

    // 7. 繪製左側教材風格中文標示與指示線 (絨毛、乳糜管、絨毛上皮細胞、微血管、小動脈、小靜脈)
    if (toggleLabelsEl.checked) {
      drawAnatomicalLabels();
    }

    ctx.restore();
  }

  function drawLumenBackground() {
    // 柔和暖米白色背景（使左側深色中文標示清晰易讀，同時呈現腸腔環境）
    const bgGrad = ctx.createLinearGradient(0, 0, VW, VH);
    bgGrad.addColorStop(0, '#fffdf9');
    bgGrad.addColorStop(0.5, '#fcf6ea');
    bgGrad.addColorStop(1, '#f7eedc');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, VW, VH);

    // 左側養分流入動態淡波紋線
    ctx.save();
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -timeTick * 12;
    for (let y = 120; y <= 460; y += 85) {
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.quadraticCurveTo(180, y + Math.sin(timeTick + y) * 14, 340, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIntactVillusShape(cx, topY, bottomY, halfW, brightness) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - halfW - 18, bottomY);
    ctx.quadraticCurveTo(cx - halfW, bottomY - 40, cx - halfW + 4, topY + 95);
    ctx.bezierCurveTo(cx - halfW + 6, topY - 12, cx + halfW - 6, topY - 12, cx + halfW - 4, topY + 95);
    ctx.quadraticCurveTo(cx + halfW, bottomY - 40, cx + halfW + 18, bottomY);
    ctx.closePath();

    // 3D 圓柱狀黃褐色漸層（完全對應上傳圖片中的立體絨毛質感）
    const grad = ctx.createLinearGradient(cx - halfW, topY, cx + halfW, topY);
    grad.addColorStop(0, '#b59a45');
    grad.addColorStop(0.28, '#e3cc78');
    grad.addColorStop(0.52, '#f2e094');
    grad.addColorStop(0.82, '#cbb058');
    grad.addColorStop(1, '#987e30');
    ctx.fillStyle = grad;
    ctx.fill();

    if (brightness < 1) {
      ctx.fillStyle = `rgba(60, 45, 10, ${1 - brightness})`;
      ctx.fill();
    }

    ctx.strokeStyle = '#856d28';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  function drawSurroundingVilli() {
    // 遠景後排半露出的絨毛頂端
    drawIntactVillusShape(495, 58, 320, 48, 0.82);
    drawIntactVillusShape(615, 22, 320, 66, 0.88);
    drawIntactVillusShape(645, 62, 360, 58, 0.92);

    // 左側完整立體絨毛（教材圖片中「絨毛」標示線指向的左方立體絨毛）
    const isVillusHighlighted = selectedStructureId === 'villus' || hoveredStructureId === 'villus';
    ctx.save();
    if (isVillusHighlighted) {
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 18;
    }
    drawIntactVillusShape(392, 30, 550, 78, 1.0);
    ctx.restore();

    // 右側完整立體絨毛
    drawIntactVillusShape(748, 30, 550, 82, 0.98);
  }

  function drawCentralVillusInterior() {
    // 繪製中央剖面絨毛的內部黃色基底與下方黏膜下層
    ctx.save();
    ctx.beginPath();
    const steps = 68;
    for (let i = 0; i <= steps; i++) {
      const p = getVillusMidCurvePoint(i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(880, 680);
    ctx.lineTo(260, 680);
    ctx.closePath();

    const innerGrad = ctx.createLinearGradient(560, 100, 560, 675);
    innerGrad.addColorStop(0, '#dfca57');
    innerGrad.addColorStop(0.65, '#f0de7a');
    innerGrad.addColorStop(0.85, '#f7ebc0');
    innerGrad.addColorStop(1, '#e8d79e');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();
  }

  function drawVesselsAndLacteal() {
    const hlLacteal = selectedStructureId === 'lacteal' || hoveredStructureId === 'lacteal';
    const hlCapillary = selectedStructureId === 'capillary' || hoveredStructureId === 'capillary';
    const hlArteriole = selectedStructureId === 'arteriole' || hoveredStructureId === 'arteriole';
    const hlVenule = selectedStructureId === 'venule' || hoveredStructureId === 'venule';

    // 1. 底部總淋巴管與中央乳糜管 (黃綠色，位於微血管網中央)
    ctx.save();
    if (hlLacteal) {
      ctx.shadowColor = '#65a30d';
      ctx.shadowBlur = 16;
    }

    // 底部水平淋巴管
    const lymphBaseGrad = ctx.createLinearGradient(255, 646, 255, 670);
    lymphBaseGrad.addColorStop(0, '#99b82c');
    lymphBaseGrad.addColorStop(0.5, '#d9f05b');
    lymphBaseGrad.addColorStop(1, '#7c961e');
    ctx.fillStyle = lymphBaseGrad;
    ctx.beginPath();
    ctx.roundRect(258, 647, 622, 22, 6);
    ctx.fill();
    ctx.strokeStyle = '#5f7514';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 中央垂直乳糜管 (x: 560, y: 185 -> 655)
    const lacGrad = ctx.createLinearGradient(548, 200, 572, 200);
    lacGrad.addColorStop(0, '#8eab24');
    lacGrad.addColorStop(0.45, '#e2f76d');
    lacGrad.addColorStop(1, '#6f8719');
    ctx.fillStyle = lacGrad;
    ctx.beginPath();
    ctx.moveTo(549, 652);
    ctx.lineTo(549, 205);
    ctx.quadraticCurveTo(560, 175, 571, 205);
    ctx.lineTo(571, 652);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. 底部小動脈 (Arteriole - 紅棕色，帶充氧血)
    ctx.save();
    if (hlArteriole) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
    }
    const artGrad = ctx.createLinearGradient(255, 598, 255, 618);
    artGrad.addColorStop(0, '#b93829');
    artGrad.addColorStop(0.5, '#f28b7d');
    artGrad.addColorStop(1, '#99271b');
    ctx.fillStyle = artGrad;
    ctx.beginPath();
    ctx.roundRect(258, 599, 622, 17, 5);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 3. 絨毛內部微血管網 (Capillary network：左邊進、右邊出 -> 左側紅微動脈上升幹 ➔ 橫向漸層網 ➔ 右側藍紫微靜脈下降幹)
    ctx.save();
    if (hlCapillary) {
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
    }

    // 左側微動脈上升幹 (x: 534，連接底部小動脈 y: 606 向上進入絨毛)
    ctx.strokeStyle = '#d14334';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(534, 606);
    ctx.lineTo(534, 175);
    ctx.quadraticCurveTo(536, 142, 560, 142);
    ctx.stroke();

    // 右側微靜脈下降幹 (x: 586，從絨毛頂端向下匯入底部小靜脈 y: 632)
    ctx.strokeStyle = '#6d6bc7';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(560, 142);
    ctx.quadraticCurveTo(584, 142, 586, 175);
    ctx.lineTo(586, 632);
    ctx.stroke();

    // 橫跨乳糜管前方的微血管網分支 (由左紅漸層至右藍紫，代表左邊進、右邊出)
    const rungYs = [165, 205, 248, 292, 338, 385, 432, 478, 522];
    const rungGrad = ctx.createLinearGradient(534, 0, 586, 0);
    rungGrad.addColorStop(0, '#d14334');
    rungGrad.addColorStop(0.5, '#a85584');
    rungGrad.addColorStop(1, '#6d6bc7');
    ctx.strokeStyle = rungGrad;
    ctx.lineWidth = 5.2;

    rungYs.forEach((ry, idx) => {
      ctx.beginPath();
      ctx.moveTo(534, ry);
      ctx.quadraticCurveTo(560, ry + (idx % 2 === 0 ? -12 : 12), 586, ry + (idx % 2 === 0 ? 6 : -6));
      ctx.stroke();
    });
    ctx.restore();

    // 4. 底部小靜脈 (Venule - 藍紫色，位於小動脈與淋巴管之間，匯集右側微靜脈流出的血液並向右流走)
    ctx.save();
    if (hlVenule) {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 16;
    }
    const venGrad = ctx.createLinearGradient(255, 622, 255, 642);
    venGrad.addColorStop(0, '#58569c');
    venGrad.addColorStop(0.5, '#a5a6e0');
    venGrad.addColorStop(1, '#464480');
    ctx.fillStyle = venGrad;
    ctx.beginPath();
    ctx.roundRect(258, 622, 622, 18, 5);
    ctx.fill();
    ctx.strokeStyle = '#3730a3';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 重新疊加繪製左側微動脈跨越小靜脈前方的入口段，讓「左進（小動脈➔左側微血管）、右出（右側微血管➔小靜脈）」的立體交疊關係清楚呈現
    ctx.strokeStyle = '#d14334';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(534, 608);
    ctx.lineTo(534, 575);
    ctx.stroke();
    ctx.restore();

    // 5. 繪製「左側紅色向上箭頭（左進）」與「右側藍色向下箭頭（右出）」
    drawBloodFlowDirectionArrows();

    // 6. 繪製在微血管中流動的紅血球
    if (toggleRbcEl.checked) {
      drawRedBloodCells();
    }
  }

  function drawBloodFlowDirectionArrows() {
    ctx.save();
    const bob = Math.sin(timeTick * 3) * 3;

    // 左側紅色向上箭頭 (代表小動脈充氧血從左邊進入絨毛微血管網向上流動)
    const rx = 510;
    const ry = 552 - bob;
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 20);
    ctx.lineTo(rx, ry - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx, ry - 20);
    ctx.lineTo(rx - 7, ry - 6);
    ctx.lineTo(rx + 7, ry - 6);
    ctx.closePath();
    ctx.fill();

    // 右側藍色向下箭頭 (代表吸收養分後的微血管血液從右邊向下流出，匯入底部小靜脈)
    const bx = 610;
    const by = 548 + bob;
    ctx.strokeStyle = '#0284c7';
    ctx.fillStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(bx, by - 22);
    ctx.lineTo(bx, by + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + 20);
    ctx.lineTo(bx - 7, by + 6);
    ctx.lineTo(bx + 7, by + 6);
    ctx.closePath();
    ctx.fill();

    // 底部水平血管與淋巴管的「由左往右 ➔」流動方向指示箭頭
    const flowShift = (timeTick * 18) % 24;
    const drawHorizontalArrow = (ax, ay, color) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ax - 12, ay);
      ctx.lineTo(ax + 6, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + 12, ay);
      ctx.lineTo(ax + 3, ay - 4.5);
      ctx.lineTo(ax + 3, ay + 4.5);
      ctx.closePath();
      ctx.fill();
    };

    // 左側流入段與右側流出段的向右箭頭 (左 ➔ 右)
    drawHorizontalArrow(390 + flowShift, 608, '#ffffff');
    drawHorizontalArrow(730 + flowShift, 608, '#ffffff');
    drawHorizontalArrow(390 + flowShift, 631, '#ffffff');
    drawHorizontalArrow(730 + flowShift, 631, '#ffffff');
    drawHorizontalArrow(730 + flowShift, 658, '#365314');
    ctx.restore();
  }

  function drawRedBloodCells() {
    ctx.save();
    rbcs.forEach(rbc => {
      const path = capillaryPaths[rbc.pathIdx];
      const pos = getPointAlongPolyline(path, rbc.progress);
      // 小動脈段(progress < 0.45)為鮮紅充氧血，進入靜脈端後轉為暗紅/紫紅減氧血
      ctx.fillStyle = rbc.progress < 0.48 ? '#ef4444' : '#be123c';
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function getPointAlongPolyline(pts, t) {
    const clamped = Math.max(0, Math.min(0.9999, t));
    const totalSegs = pts.length - 1;
    const segFloat = clamped * totalSegs;
    const idx = Math.floor(segFloat);
    const localT = segFloat - idx;
    const p1 = pts[idx];
    const p2 = pts[idx + 1];
    return {
      x: p1.x + (p2.x - p1.x) * localT,
      y: p1.y + (p2.y - p1.y) * localT
    };
  }

  function drawEpithelialLayer() {
    const hlEpi = selectedStructureId === 'epithelium' || hoveredStructureId === 'epithelium';
    ctx.save();
    if (hlEpi) {
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;
    }

    epithelialCells.forEach(cell => {
      ctx.save();
      ctx.translate(cell.x, cell.y);
      ctx.rotate(cell.angle);

      const h = cell.height; // 沿法向量方向 (x 軸為法向量朝外)
      const w = cell.width;  // 沿切向量方向 (y 軸)

      // 柱狀上皮細胞本體（粉橘色，與教材圖片完全一致）
      const cellGrad = ctx.createLinearGradient(-h * 0.5, 0, h * 0.5, 0);
      cellGrad.addColorStop(0, '#e89973');
      cellGrad.addColorStop(0.75, '#f5b895');
      cellGrad.addColorStop(1, '#d97f54');
      ctx.fillStyle = cellGrad;
      ctx.strokeStyle = '#b86339';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(-h * 0.5, -w * 0.5, h, w, 3);
      ctx.fill();
      ctx.stroke();

      // 刷狀緣（微絨毛）：朝向腸腔外側 (x = +h * 0.5) 的深粉橘色細密刷狀邊緣
      ctx.fillStyle = '#c96a3b';
      ctx.fillRect(h * 0.5 - 3.5, -w * 0.5 + 0.5, 3.5, w - 1);

      // 細胞核（偏基底側的紅褐色橢圓核）
      ctx.fillStyle = '#9e4727';
      ctx.beginPath();
      ctx.ellipse(-h * 0.14, 0, 4.2, 2.7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  // ==========================================
  // 5. 繪製酵素、大分子養分與小分子養分
  // ==========================================
  function drawEnzymes() {
    ctx.save();
    enzymes.forEach(enz => {
      ctx.save();

      if (enz.isMembrane) {
        // (A) 微絨毛外膜結合酵素：繪製微絨毛錨定柄桿 (Anchor Stalk)
        ctx.strokeStyle = enz.type === 'maltase' ? 'rgba(2, 132, 199, 0.5)' : 'rgba(124, 58, 237, 0.5)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(enz.stalkBaseX, enz.stalkBaseY);
        ctx.lineTo(enz.x, enz.y);
        ctx.stroke();

        ctx.translate(enz.x, enz.y);
        // 面向微絨毛法向量外側 (朝向腸腔)
        const heading = Math.atan2(enz.ny, enz.nx);
        ctx.rotate(heading);

        const isBusy = enz.busyTimer > 0;

        if (enz.type === 'maltase') {
          // 雙醣酶 (Maltase)：天藍色圓球 + 外側六角形鎖鑰受質結合凹槽
          if (isBusy) {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
          }
          ctx.fillStyle = isBusy ? '#38bdf8' : '#0284c7';
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.6;

          ctx.beginPath();
          ctx.arc(0, 0, 9.5, 0.45, Math.PI * 2 - 0.45);
          // 內嵌六角形受質結合位
          ctx.lineTo(-1, 4.5);
          ctx.lineTo(-4.5, 0);
          ctx.lineTo(-1, -4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.restore();

          // 膜結合雙醣酶標籤
          ctx.fillStyle = '#0369a1';
          ctx.font = 'bold 8.5px "Noto Sans TC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('雙醣酶(膜)', enz.x, enz.y - 12);
        } else {
          // 肽酶 (Peptidase)：紫色圓球 + 外側多齒狀肽鍵受質結合凹槽
          if (isBusy) {
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 10;
          }
          ctx.fillStyle = isBusy ? '#c084fc' : '#8b5cf6';
          ctx.strokeStyle = '#6d28d9';
          ctx.lineWidth = 1.6;

          ctx.beginPath();
          ctx.arc(0, 0, 9.5, 0.55, Math.PI * 2 - 0.55);
          // 內凹肽鍵結合齒
          ctx.lineTo(-1, 5);
          ctx.lineTo(-4, 2.5);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-4, -2.5);
          ctx.lineTo(-1, -5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.restore();

          // 膜結合肽酶標籤
          ctx.fillStyle = '#6d28d9';
          ctx.font = 'bold 8.5px "Noto Sans TC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('肽酶(膜)', enz.x, enz.y - 12);
        }
      } else {
        // (B) 小腸腔游離胰脂酶：自由游動於小腸腔液體中
        ctx.translate(enz.x, enz.y);
        const heading = Math.atan2(enz.vy, enz.vx);
        ctx.rotate(heading);

        const isBusy = enz.busyTimer > 0;
        if (isBusy) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
        }

        const mouthAngle = 0.28 + Math.abs(Math.sin(enz.mouthPhase)) * 0.38;
        ctx.fillStyle = isBusy ? '#fbbf24' : '#f59e0b';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.6;

        ctx.beginPath();
        ctx.arc(0, 0, 10.5, mouthAngle, Math.PI * 2 - mouthAngle);
        // 脂酶雙葉狀活性凹槽
        ctx.lineTo(-2, 3.5);
        ctx.lineTo(-5.5, 0);
        ctx.lineTo(-2, -3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // 腸腔胰脂酶標籤
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 8.5px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('胰脂酶(腔)', enz.x, enz.y - 13);
      }
    });
    ctx.restore();
  }

  function drawHexagon(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const hx = x + Math.cos(a) * r;
      const hy = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawMacromolecules() {
    ctx.save();
    macromolecules.forEach(m => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);

      if (m.beingDigested) {
        ctx.shadowColor = m.type === 'carb' ? '#0ea5e9' : m.type === 'protein' ? '#a855f7' : '#f59e0b';
        ctx.shadowBlur = 12;
      }

      if (m.type === 'carb') {
        // 醣類大分子：相連的藍色六角環（雙醣/多醣）
        ctx.fillStyle = '#0ea5e9';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.8;
        drawHexagon(-9, -3, 8.5);
        drawHexagon(5, 3, 8.5);
        drawHexagon(15, -5, 7.5);
      } else if (m.type === 'protein') {
        // 蛋白質大分子：折疊串珠狀多肽鏈
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        const pts = [
          { x: -11, y: -4, c: '#9333ea' },
          { x: -3, y: 5, c: '#a855f7' },
          { x: 6, y: -3, c: '#c084fc' },
          { x: 14, y: 4, c: '#9333ea' }
        ];
        pts.forEach(p => {
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (m.type === 'lipid') {
        // 脂質大分子：三酸甘油酯乳化油滴（甘油頭 + 三條脂肪酸尾）
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2.2;
        for (let t = -1; t <= 1; t++) {
          ctx.beginPath();
          ctx.moveTo(-4, t * 5);
          ctx.quadraticCurveTo(5, t * 5 + 3, 14, t * 5 - 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-6, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // 若正在被專一酵素分解，繪製相應顏色的分解進度環
      if (m.digestionProgress > 5) {
        ctx.save();
        ctx.strokeStyle = m.type === 'carb' ? '#0284c7' : m.type === 'protein' ? '#8b5cf6' : '#f59e0b';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(
          m.x,
          m.y,
          22,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * m.digestionProgress) / 100
        );
        ctx.stroke();
        ctx.restore();
      }
    });
    ctx.restore();
  }

  function drawMonomers() {
    ctx.save();
    monomers.forEach(mo => {
      ctx.save();
      ctx.translate(mo.x, mo.y);

      if (mo.type === 'carb') {
        // 葡萄糖單體 (小六角形，進入微血管)
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        drawHexagon(0, 0, 5.8);
      } else if (mo.type === 'protein') {
        // 胺基酸單體 (紫色圓珠，進入微血管)
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (mo.type === 'lipid') {
        // 脂肪酸/乳糜微粒 (金黃色發光小微粒，進入中央乳糜管)
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  function drawEffects() {
    ctx.save();
    effects.forEach(ef => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ef.alpha);
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (ef.text) {
        ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(ef.text, ef.x, ef.y - 16);
      }
      ctx.restore();
    });
    ctx.restore();
  }

  // ==========================================
  // 6. 繪製教材風格中文解剖標示線
  // ==========================================
  function drawAnatomicalLabels() {
    ctx.save();

    const labelList = [
      {
        id: 'villus',
        lines: ['絨毛'],
        textX: 215,
        textY: 100,
        lineStartX: 228,
        lineStartY: 98,
        targetX: 392,
        targetY: 98
      },
      {
        id: 'lacteal',
        lines: ['乳糜管'],
        textX: 215,
        textY: 238,
        lineStartX: 228,
        lineStartY: 235,
        targetX: 560,
        targetY: 235
      },
      {
        id: 'epithelium',
        lines: ['絨毛上皮', '細胞'],
        textX: 215,
        textY: 382,
        lineStartX: 228,
        lineStartY: 385,
        targetX: 468,
        targetY: 385
      },
      {
        id: 'capillary',
        lines: ['微血管'],
        textX: 215,
        textY: 518,
        lineStartX: 228,
        lineStartY: 515,
        targetX: 534,
        targetY: 515
      },
      {
        id: 'arteriole',
        lines: ['小動脈'],
        textX: 165,
        textY: 608,
        lineStartX: 176,
        lineStartY: 606,
        targetX: 280,
        targetY: 606
      },
      {
        id: 'venule',
        lines: ['小靜脈'],
        textX: 165,
        textY: 660,
        lineStartX: 176,
        lineStartY: 656,
        targetX: 280,
        targetY: 632
      }
    ];

    labelList.forEach(item => {
      const isActive = selectedStructureId === item.id || hoveredStructureId === item.id;

      // 白色外框襯底 + 黑色實線指示線（確保跨過深淺區域都清晰可見，與上傳圖片一致）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isActive ? 5.5 : 4.2;
      ctx.beginPath();
      ctx.moveTo(item.lineStartX, item.lineStartY);
      ctx.lineTo(item.targetX, item.targetY);
      ctx.stroke();

      ctx.strokeStyle = isActive ? '#0284c7' : '#111827';
      ctx.lineWidth = isActive ? 2.8 : 2.0;
      ctx.beginPath();
      ctx.moveTo(item.lineStartX, item.lineStartY);
      ctx.lineTo(item.targetX, item.targetY);
      ctx.stroke();

      // 終點圓點
      ctx.fillStyle = isActive ? '#0284c7' : '#111827';
      ctx.beginPath();
      ctx.arc(item.targetX, item.targetY, isActive ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();

      // 文字繪製（粗體黑字 + 選取高亮）
      ctx.font = `${isActive ? '800' : '700'} 28px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      item.lines.forEach((lineText, lineIdx) => {
        const ly = item.textY + lineIdx * 34;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 5;
        ctx.strokeText(lineText, item.textX, ly);

        ctx.fillStyle = isActive ? '#0284c7' : '#0f172a';
        ctx.fillText(lineText, item.textX, ly);
      });
    });

    ctx.restore();
  }

  // ==========================================
  // 7. 互動事件與畫布自適應縮放
  // ==========================================
  function resizeCanvas() {
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const scaleX = (rect.width * dpr) / VW;
    const scaleY = (rect.height * dpr) / VH;
    scale = Math.min(scaleX, scaleY);
    offsetX = (canvas.width - VW * scale) * 0.5;
    offsetY = (canvas.height - VH * scale) * 0.5;
  }

  function clientToVirtual(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cx = (clientX - rect.left) * dpr;
    const cy = (clientY - rect.top) * dpr;
    return {
      x: (cx - offsetX) / scale,
      y: (cy - offsetY) / scale
    };
  }

  function findStructureAt(vx, vy, isTouch) {
    const pad = isTouch ? 18 : 0;
    for (const key in STRUCTURES) {
      const st = STRUCTURES[key];
      // 檢查是否點在文字區或構造目標點附近（觸控螢幕加大感應半徑）
      const distLabel = Math.hypot(vx - st.labelX, vy - st.labelY);
      const distTarget = Math.hypot(vx - st.targetX, vy - st.targetY);
      if (distLabel < 55 + pad || distTarget < st.hitRadius + pad) {
        return st;
      }
    }

    // 額外檢查中央乳糜管長條區
    if (vx >= 546 - pad * 0.5 && vx <= 574 + pad * 0.5 && vy >= 180 && vy <= 520) {
      return STRUCTURES.lacteal;
    }
    // 額外檢查微血管網區
    if (vx >= 525 - pad * 0.5 && vx <= 595 + pad * 0.5 && vy >= 150 && vy <= 540) {
      return STRUCTURES.capillary;
    }

    // 檢查是否點擊或懸停於消化酵素
    if (toggleEnzymesEl.checked) {
      for (let i = 0; i < enzymes.length; i++) {
        const enz = enzymes[i];
        if (Math.hypot(vx - enz.x, vy - enz.y) < 18 + pad) {
          if (enz.type === 'maltase') {
            return {
              id: 'maltase',
              name: '雙醣酶 (微絨毛膜結合酵素)',
              desc: '【刷狀緣膜酵素】：牢固鑲嵌於微絨毛細胞膜外表面。具嚴格專一性，專門將麥芽糖等雙醣水解為單醣（葡萄糖），分解後隨即由旁邊的細胞膜轉運蛋白主動運輸吸收進入微血管。'
            };
          } else if (enz.type === 'peptidase') {
            return {
              id: 'peptidase',
              name: '肽酶 (微絨毛膜結合酵素)',
              desc: '【刷狀緣膜酵素】：牢固鑲嵌於微絨毛細胞膜外表面。具嚴格專一性，專門將寡肽或二肽水解為游離胺基酸，隨即進入微血管。'
            };
          } else if (enz.type === 'lipase') {
            return {
              id: 'lipase',
              name: '胰脂酶 (小腸腔游離酵素)',
              desc: '【腸腔游離酵素】：由胰臟製造分泌進入小腸管腔液中。在膽鹽乳化輔助下，於小腸腔中將三酸甘油酯分解為游離脂肪酸與單酸甘油酯。請注意：微絨毛細胞膜上【無脂質消化酵素】，脂質水解產物是以脂溶性特性直接擴散穿膜吸收！'
            };
          }
        }
      }
    }

    return null;
  }

  function showTooltipForStructure(hit, clientX, clientY) {
    const rect = wrapper.getBoundingClientRect();
    tooltipEl.classList.remove('hidden');
    tooltipEl.innerHTML = `<strong>${hit.name}</strong><br>${hit.desc}`;
    const left = Math.min(rect.width - 270, Math.max(12, clientX - rect.left + 16));
    const top = Math.min(rect.height - 110, Math.max(12, clientY - rect.top + 16));
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  function handlePointerInteraction(clientX, clientY, isTouch) {
    const pt = clientToVirtual(clientX, clientY);
    const hit = findStructureAt(pt.x, pt.y, isTouch);

    if (hit) {
      selectedStructureId = hit.id;
      hoveredStructureId = hit.id;
      infoTitleEl.textContent = `🔍 ${hit.name}`;
      infoDescEl.textContent = hit.desc;
      if (isTouch) {
        showTooltipForStructure(hit, clientX, clientY);
      }
    } else {
      if (isTouch) {
        hoveredStructureId = null;
        tooltipEl.classList.add('hidden');
      }
      if (pt.x < 460 && pt.y < 545) {
        // 點擊或觸控左側腸腔空白處時，直接在該高度從左方釋放一個養分分子
        spawnMacromolecule(null, pt.y);
      }
    }
  }

  canvas.addEventListener('mousemove', e => {
    const pt = clientToVirtual(e.clientX, e.clientY);
    const hit = findStructureAt(pt.x, pt.y, false);

    if (hit) {
      hoveredStructureId = hit.id;
      showTooltipForStructure(hit, e.clientX, e.clientY);
    } else {
      hoveredStructureId = null;
      tooltipEl.classList.add('hidden');
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredStructureId = null;
    tooltipEl.classList.add('hidden');
  });

  // 使用 pointerdown 統一支援滑鼠點擊與觸控螢幕快速連點，避免 300ms 延遲與雙擊放大
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    handlePointerInteraction(e.clientX, e.clientY, e.pointerType === 'touch');
  });

  // 全面阻擋觸控螢幕雙擊放大 (Double-tap / Double-click zoom) 與多指縮放手勢
  document.addEventListener('dblclick', e => {
    e.preventDefault();
  }, { passive: false });

  let lastTouchEndTime = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEndTime <= 320) {
      e.preventDefault();
    }
    lastTouchEndTime = now;
  }, { passive: false });

  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  }, { passive: false });

  // 綁定右側控制面板按鈕
  document.querySelectorAll('.btn-nutrient').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      for (let i = 0; i < 3; i++) {
        spawnMacromolecule(type, 140 + i * 115 + (Math.random() - 0.5) * 35);
      }
    });
  });

  btnBurst.addEventListener('click', () => {
    ['carb', 'protein', 'lipid', 'carb', 'protein', 'lipid'].forEach((t, idx) => {
      spawnMacromolecule(t, 120 + idx * 62);
    });
  });

  simSpeedEl.addEventListener('input', () => {
    simSpeed = parseFloat(simSpeedEl.value);
    speedValEl.textContent = `${simSpeed.toFixed(1)}x`;
  });

  enzymeDensityEl.addEventListener('input', () => {
    const val = parseInt(enzymeDensityEl.value, 10);
    enzymeValEl.textContent = val === 1 ? '偏低' : val === 2 ? '正常' : '旺盛';
    initEnzymes();
  });

  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶ 繼續' : '⏸ 暫停';
  });

  btnClear.addEventListener('click', () => {
    macromolecules.length = 0;
    monomers.length = 0;
    effects.length = 0;
    absorbedBloodCount = 0;
    absorbedLymphCount = 0;
    countBloodEl.textContent = '0';
    countLymphEl.textContent = '0';
    // 重新投放初始養分方便立即觀察
    ['carb', 'protein', 'lipid'].forEach((t, idx) => {
      spawnMacromolecule(t, 160 + idx * 110);
    });
  });

  window.addEventListener('resize', resizeCanvas);

  // ==========================================
  // 8. 啟動初始化與主迴圈
  // ==========================================
  function init() {
    resizeCanvas();
    initEpithelialCells();
    initVascularPaths();
    initRedBloodCells();
    initEnzymes();
    /*
    // 初始投放三種大分子養分由左方流入
    ['carb', 'protein', 'lipid', 'carb'].forEach((t, idx) => {
      spawnMacromolecule(t, 140 + idx * 90);
    });
    */

    function loop() {
      updateSimulation();
      drawScene();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  init();
})();

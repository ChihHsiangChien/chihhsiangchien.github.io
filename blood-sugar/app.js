/**
 * 血糖恆定與代謝動態模擬 - 生物生化互動引擎
 * 特點：
 * 1. 血管中游離葡萄糖流動
 * 2. 肝臟中樹狀分支肝糖結構 (Glycogen Tree)，明確標識非還原末端 (Terminal Tips)
 * 3. 葡萄糖合成時精確對接末端 (非還原端)，並可形成新分支
 * 4. 肝糖拆解時由末端依序水解釋回血液
 * 5. 細胞粒線體攝取葡萄糖，並透過呼吸作用生成 ATP 與二氧化碳水
 */

class GlucoseSimulation {
  constructor() {
    this.canvas = document.getElementById('simCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Simulation Parameters
    this.time = 0;
    this.speed = 1.0;
    this.autoSim = true;
    this.autoSimTimer = 0;

    // Biological State
    this.atpCount = 0;
    this.freeGlucose = []; // In blood stream
    this.movingMolecules = []; // Molecules in transition (animating)
    this.atpParticles = []; // ATP particles generated in cell
    this.floatingWaste = []; // CO2 / H2O generated

    // Defined Compartment Regions (based on expanded canvas dimensions 1120x700)
    // Defined Compartment Regions (Canvas dimensions 1120x700)
    // 血管位於 y: 220 ~ 360
    // 血管下方三大細胞：骨骼肌細胞 (左下)、脂肪細胞 (中下)、一般組織細胞 (右下)
    this.regions = {
      blood: {
        x: 30,
        y: 220,
        w: 1060,
        h: 130,
        name: '血管'        
      },
      liver: {
        x: 50,
        y: 15,
        w: 420,
        h: 185,
        name: '肝臟'
      },
      muscle: {
        x: 30,
        y: 380,
        w: 320,
        h: 295,
        name: '骨骼肌細胞'
      },
      adipose: {
        x: 375,
        y: 380,
        w: 310,
        h: 295,
        name: '脂肪細胞'
      },
      cell: {
        x: 710,
        y: 380,
        w: 380,
        h: 295,
        name: '組織細胞'
      },
      nucleus: {
        x: 765,
        y: 550,
        radius: 34,
        name: '細胞核'
      },
      mitochondria: {
        x: 825,
        y: 475,
        w: 245,
        h: 155,
        name: '粒線體'
      }
    };

    // Initialize Glycogen Tree Structure (肝臟)
    this.glycogenTree = null;
    this.initGlycogenTree();

    // 骨骼肌糖原 (Muscle Glycogen) 節點結構
    this.muscleGlycogenNodes = [];
    this.initMuscleGlycogen();

    // 脂肪細胞：三酸甘油酯油滴群 (Triglyceride Droplets)
    this.fatDroplets = [];
    this.initFatDroplets();

    // Initialize free blood glucose
    this.initBloodGlucose(12);

    // Setup Event Listeners
    this.initControls();

    // Start Simulation Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  /* ---------------------- 肝糖樹狀結構建構 ---------------------- */
  initGlycogenTree() {
    // 肝糖核心位於左側肝臟區域中心
    const rootX = 230;
    const rootY = 165;

    // 節點定義：id, x, y, parentId, children, isTip
    this.glycogenNodes = [];
    this.nodeCounter = 0;

    // 核心蛋白 Glycogenin 根節點
    const root = this.addNode(rootX, rootY, null, 'core');

    // 構建初始樹狀分支 (代表已有的肝糖分支，往三角形上方與左右展開)
    const b1 = this.addBranch(root, -85, -45, 3);
    const b2 = this.addBranch(root, -28, -55, 3);
    const b3 = this.addBranch(root, 28, -55, 3);
    const b4 = this.addBranch(root, 85, -45, 3);

    // 為部分分支添加次級分支 (α-1,6 分支示範)
    if (b1.length > 1) this.addBranch(b1[1], -50, -30, 2);
    if (b4.length > 1) this.addBranch(b4[1], 50, -30, 2);

    this.updateGlycogenTips();
    this.updateDashboard();
  }

  addNode(x, y, parentId, type = 'residue') {
    const id = ++this.nodeCounter;
    const node = {
      id,
      x,
      y,
      targetX: x,
      targetY: y,
      parentId,
      children: [],
      type, // 'core', 'residue'
      isTip: false,
      pulse: 0
    };
    if (parentId !== null) {
      const parent = this.glycogenNodes.find(n => n.id === parentId);
      if (parent) {
        parent.children.push(id);
      }
    }
    this.glycogenNodes.push(node);
    return node;
  }

  addBranch(startNode, dx, dy, count) {
    let curr = startNode;
    const branchNodes = [];
    const stepX = dx / count;
    const stepY = dy / count;

    for (let i = 1; i <= count; i++) {
      const nx = curr.x + stepX + (Math.random() - 0.5) * 8;
      const ny = curr.y + stepY + (Math.random() - 0.5) * 6;
      // 確保在肝臟範圍內 (y: 45 ~ 170)
      const clampedY = Math.max(45, Math.min(170, ny));
      curr = this.addNode(nx, clampedY, curr.id);
      branchNodes.push(curr);
    }
    return branchNodes;
  }

  updateGlycogenTips() {
    // 凡是沒有 children 的 node 即為非還原末端 (Terminal Tip)
    this.glycogenNodes.forEach(node => {
      node.isTip = (node.children.length === 0 && node.type !== 'core');
    });
  }

  getTips() {
    return this.glycogenNodes.filter(n => n.isTip);
  }

  /* ---------------------- 骨骼肌糖原 (Muscle Glycogen) 結構建構 ---------------------- */
  initMuscleGlycogen() {
    // 骨骼肌核心位於骨骼肌細胞中偏下 (x: 180, y: 550)
    const rootX = this.regions.muscle.x + this.regions.muscle.w / 2;
    const rootY = this.regions.muscle.y + this.regions.muscle.h - 80;

    this.muscleGlycogenNodes = [];
    this.muscleNodeCounter = 0;

    const root = this.addMuscleNode(rootX, rootY, null, 'core');
    const b1 = this.addMuscleBranch(root, -50, -45, 3);
    const b2 = this.addMuscleBranch(root, 0, -55, 3);
    const b3 = this.addMuscleBranch(root, 50, -45, 3);

    if (b1.length > 1) this.addMuscleBranch(b1[1], -30, -25, 2);
    if (b3.length > 1) this.addMuscleBranch(b3[1], 30, -25, 2);

    this.updateMuscleGlycogenTips();
  }

  addMuscleNode(x, y, parentId, type = 'residue') {
    const id = ++this.muscleNodeCounter;
    const node = {
      id,
      x,
      y,
      parentId,
      children: [],
      type,
      isTip: false
    };
    if (parentId !== null) {
      const parent = this.muscleGlycogenNodes.find(n => n.id === parentId);
      if (parent) parent.children.push(id);
    }
    this.muscleGlycogenNodes.push(node);
    return node;
  }

  addMuscleBranch(startNode, dx, dy, count) {
    let curr = startNode;
    const branchNodes = [];
    const stepX = dx / count;
    const stepY = dy / count;
    const m = this.regions.muscle;

    for (let i = 1; i <= count; i++) {
      const nx = curr.x + stepX + (Math.random() - 0.5) * 6;
      const ny = curr.y + stepY + (Math.random() - 0.5) * 6;
      const clampedX = Math.max(m.x + 30, Math.min(m.x + m.w - 30, nx));
      const clampedY = Math.max(m.y + 40, Math.min(m.y + m.h - 30, ny));
      curr = this.addMuscleNode(clampedX, clampedY, curr.id);
      branchNodes.push(curr);
    }
    return branchNodes;
  }

  updateMuscleGlycogenTips() {
    this.muscleGlycogenNodes.forEach(node => {
      node.isTip = (node.children.length === 0 && node.type !== 'core');
    });
  }

  getMuscleTips() {
    return this.muscleGlycogenNodes.filter(n => n.isTip);
  }

  /* ---------------------- 脂肪細胞：三酸甘油酯油滴初始化 ---------------------- */
  initFatDroplets() {
    const ad = this.regions.adipose;
    this.fatDroplets = [];
    const cx = ad.x + ad.w / 2;
    const cy = ad.y + ad.h / 2 + 10;

    // 初始較大的中央主油滴與周邊數顆小油滴
    this.fatDroplets.push({ x: cx, y: cy, r: 42, pulse: 0 });
    this.fatDroplets.push({ x: cx - 52, y: cy + 18, r: 24, pulse: 0.5 });
    this.fatDroplets.push({ x: cx + 55, y: cy + 12, r: 26, pulse: 1.0 });
    this.fatDroplets.push({ x: cx - 35, y: cy - 42, r: 22, pulse: 1.5 });
    this.fatDroplets.push({ x: cx + 38, y: cy - 40, r: 25, pulse: 2.0 });
  }

  /* ---------------------- 血液葡萄糖管理 ---------------------- */
  initBloodGlucose(count) {
    this.freeGlucose = [];
    for (let i = 0; i < count; i++) {
      // 速度分層：提供寬廣的速度梯度 (1.0 ~ 3.2)，使群體迅速在血管各處均勻拉開
      const speedTier = 0.9 + Math.random() * 2.2;
      this.freeGlucose.push({
        x: this.regions.blood.x + 20 + Math.random() * (this.regions.blood.w - 40),
        y: this.regions.blood.y + 25 + Math.random() * (this.regions.blood.h - 50),
        vx: speedTier, // 具備多階層流速
        vy: (Math.random() - 0.5) * 0.15,
        pulseOffset: Math.random() * Math.PI * 2,
        id: Math.random()
      });
    }
  }

  /* ---------------------- 操作：進食 (增加血糖) ---------------------- */
  eatFood(amount = 6) {
    for (let i = 0; i < amount; i++) {
      // 進食時給予階梯式不同流速 (部分先鋒分子高達 2.6 ~ 3.4，快速衝刺到右側循環回左側)
      // 較慢分子則維持約 1.1 ~ 1.6，如此能在數秒內迅速覆蓋整條血管，避免整批聚在一起留下大段空白
      const leadFactor = (i % 3 === 0) ? (2.4 + Math.random() * 1.0) : (1.1 + Math.random() * 1.0);
      this.freeGlucose.push({
        x: this.regions.blood.x - 20 - i * 22, // 從血管左側邊界外平滑湧入
        y: this.regions.blood.y + 25 + Math.random() * (this.regions.blood.h - 50),
        vx: leadFactor,
        vy: (Math.random() - 0.5) * 0.15,
        pulseOffset: Math.random() * Math.PI * 2,
        id: Math.random()
      });
    }
    this.triggerFlash(this.regions.blood, 'rgba(244, 63, 94, 0.25)');
    this.updateDashboard();
  }

  /* ---------------------- 操作：合成肝糖 (加在末端) ---------------------- */
  storeGlycogen(count = 2) {
    if (this.freeGlucose.length === 0) return;

    const tips = this.getTips();
    if (tips.length === 0) return;

    const liver = this.regions.liver;

    for (let k = 0; k < count; k++) {
      if (this.freeGlucose.length === 0) break;

      // 嚴格篩選：只有「真正位於肝臟水平跨度範圍附近（且可視於畫布中）」的血液葡萄糖才能進入肝臟
      // 避免血糖都流到右側時，左側無糖處卻憑空出現分子進入肝臟
      const candidates = [];
      for (let i = 0; i < this.freeGlucose.length; i++) {
        const g = this.freeGlucose[i];
        // 葡萄糖必須在肝臟正下方的有效感應區 (x: liver.x - 20 ~ liver.x + liver.w + 40 且 x >= 30)
        if (g.x >= Math.max(30, liver.x - 20) && g.x <= liver.x + liver.w + 40) {
          candidates.push(i);
        }
      }

      // 若目前肝臟下方血管區段沒有葡萄糖，則直接略過（不執行虛假動畫）
      if (candidates.length === 0) break;

      // 隨機選一個末端 (非還原端) 進行加成
      const targetTip = tips[Math.floor(Math.random() * tips.length)];

      // 在候選者中，挑選與 targetTip 水平距離最近、且符合 dx 順向或微幅自然流動的分子
      let chosenIdxInCandidates = 0;
      let minDiff = Infinity;
      for (let ci = 0; ci < candidates.length; ci++) {
        const idx = candidates[ci];
        const g = this.freeGlucose[idx];
        const diff = Math.abs(targetTip.x - g.x);
        if (diff < minDiff) {
          minDiff = diff;
          chosenIdxInCandidates = ci;
        }
      }

      const bestOriginalIndex = candidates[chosenIdxInCandidates];
      const g = this.freeGlucose.splice(bestOriginalIndex, 1)[0];

      // 決定新節點位置：沿著原延伸方向略微擴展或分叉
      const parent = this.glycogenNodes.find(n => n.id === targetTip.parentId);
      let angle = -Math.PI / 2; // 默認向上
      if (parent) {
        angle = Math.atan2(targetTip.y - parent.y, targetTip.x - parent.x);
        if (Math.random() < 0.35) {
          angle += (Math.random() > 0.5 ? 0.7 : -0.7);
        } else {
          angle += (Math.random() - 0.5) * 0.4;
        }
      }

      const dist = 18 + Math.random() * 8;
      let newX = targetTip.x + Math.cos(angle) * dist;
      let newY = targetTip.y + Math.sin(angle) * dist;

      // 邊界保護 (維持在左側肝臟視窗內)
      newX = Math.max(liver.x + 40, Math.min(liver.x + liver.w - 40, newX));
      newY = Math.max(liver.y + 35, Math.min(liver.y + liver.h - 20, newY));

      // 加入過渡飛行動畫 (從該葡萄糖當前真實位置出發，垂直上升進入肝糖末端)
      this.movingMolecules.push({
        fromX: g.x,
        fromY: g.y,
        toX: newX,
        toY: newY,
        x: g.x,
        y: g.y,
        progress: 0,
        speed: 0.024,
        type: 'to-glycogen',
        onComplete: () => {
          // 在末端接上新葡萄糖殘基
          this.addNode(newX, newY, targetTip.id);
          this.updateGlycogenTips();
          this.triggerParticleBurst(newX, newY, '#10b981');
          this.updateDashboard();
        }
      });
    }

    this.updateDashboard();
  }

  /* ---------------------- 操作：拆解肝糖 (從末端水解) ---------------------- */
  breakGlycogen(count = 2) {
    const tips = this.getTips();
    if (tips.length <= 1 && this.glycogenNodes.length <= 3) return;

    for (let k = 0; k < count; k++) {
      const currentTips = this.getTips();
      if (currentTips.length === 0) break;

      // 隨機挑選一個末端節點拆解
      const tipToRemove = currentTips[Math.floor(Math.random() * currentTips.length)];

      // 從樹中移除此末端節點
      const nodeIndex = this.glycogenNodes.findIndex(n => n.id === tipToRemove.id);
      if (nodeIndex !== -1) {
        this.glycogenNodes.splice(nodeIndex, 1);
        // 清理其父節點的 children 關聯
        const parent = this.glycogenNodes.find(n => n.id === tipToRemove.parentId);
        if (parent) {
          parent.children = parent.children.filter(id => id !== tipToRemove.id);
        }
        this.updateGlycogenTips();

        // 飛入血液中：X 位移盡量微小，且嚴格只能朝 X 增加方向 (dx 僅約 3~8px)
        const bloodTargetX = Math.min(
          this.regions.blood.x + this.regions.blood.w - 30,
          tipToRemove.x + (3 + Math.random() * 5)
        );
        const bloodTargetY = this.regions.blood.y + 25 + Math.random() * (this.regions.blood.h - 50);

        this.movingMolecules.push({
          fromX: tipToRemove.x,
          fromY: tipToRemove.y,
          toX: bloodTargetX,
          toY: bloodTargetY,
          x: tipToRemove.x,
          y: tipToRemove.y,
          progress: 0,
          speed: 0.024,
          type: 'to-blood',
          onComplete: () => {
            this.freeGlucose.push({
              x: bloodTargetX,
              y: bloodTargetY,
              vx: 0.9 + Math.random() * 0.9, // 拆解進入血液後單向朝右流動
              vy: (Math.random() - 0.5) * 0.15,
              pulseOffset: Math.random() * Math.PI * 2,
              id: Math.random()
            });
            this.updateDashboard();
          }
        });
      }
    }
    this.updateDashboard();
  }

  /* ---------------------- 操作：骨骼肌攝取血糖合成肌糖原 ---------------------- */
  storeMuscleGlycogen(count = 2) {
    if (this.freeGlucose.length === 0) return;
    const tips = this.getMuscleTips();
    if (tips.length === 0) return;

    const muscle = this.regions.muscle;

    for (let k = 0; k < count; k++) {
      if (this.freeGlucose.length === 0) break;

      // 篩選位於骨骼肌細胞上方血管區段的血糖
      const candidates = [];
      for (let i = 0; i < this.freeGlucose.length; i++) {
        const g = this.freeGlucose[i];
        if (g.x >= muscle.x - 20 && g.x <= muscle.x + muscle.w + 30) {
          candidates.push(i);
        }
      }
      if (candidates.length === 0) break;

      const targetTip = tips[Math.floor(Math.random() * tips.length)];
      let chosenIdx = 0;
      let minDiff = Infinity;
      for (let ci = 0; ci < candidates.length; ci++) {
        const diff = Math.abs(targetTip.x - this.freeGlucose[candidates[ci]].x);
        if (diff < minDiff) {
          minDiff = diff;
          chosenIdx = ci;
        }
      }

      const g = this.freeGlucose.splice(candidates[chosenIdx], 1)[0];

      // 計算在肌糖原末端延伸的位置
      const parent = this.muscleGlycogenNodes.find(n => n.id === targetTip.parentId);
      let angle = -Math.PI / 2;
      if (parent) {
        angle = Math.atan2(targetTip.y - parent.y, targetTip.x - parent.x);
        angle += (Math.random() - 0.5) * 0.5;
      }
      const dist = 16 + Math.random() * 7;
      let newX = targetTip.x + Math.cos(angle) * dist;
      let newY = targetTip.y + Math.sin(angle) * dist;

      newX = Math.max(muscle.x + 25, Math.min(muscle.x + muscle.w - 25, newX));
      newY = Math.max(muscle.y + 35, Math.min(muscle.y + muscle.h - 30, newY));

      this.movingMolecules.push({
        fromX: g.x,
        fromY: g.y,
        toX: newX,
        toY: newY,
        x: g.x,
        y: g.y,
        progress: 0,
        speed: 0.024,
        type: 'to-muscle',
        onComplete: () => {
          this.addMuscleNode(newX, newY, targetTip.id);
          this.updateMuscleGlycogenTips();
          this.triggerParticleBurst(newX, newY, '#f43f5e', 14);
          this.updateDashboard();
        }
      });
    }
    this.updateDashboard();
  }

  /* ---------------------- 操作：骨骼肌收縮/運動消耗肌糖原並直接攝取血糖產能 ---------------------- */
  useMuscleGlycogen(count = 2) {
    const muscle = this.regions.muscle;

    // 1. 骨骼肌內部：末端拆解肌肉肝糖直接供能
    const tips = this.getMuscleTips();
    const canBreakMuscle = tips.length > 1 && this.muscleGlycogenNodes.length > 3;

    if (canBreakMuscle) {
      for (let k = 0; k < Math.min(count, tips.length); k++) {
        const currentTips = this.getMuscleTips();
        if (currentTips.length === 0) break;

        const tipToRemove = currentTips[Math.floor(Math.random() * currentTips.length)];
        const nodeIndex = this.muscleGlycogenNodes.findIndex(n => n.id === tipToRemove.id);
        if (nodeIndex !== -1) {
          this.muscleGlycogenNodes.splice(nodeIndex, 1);
          const parent = this.muscleGlycogenNodes.find(n => n.id === tipToRemove.parentId);
          if (parent) {
            parent.children = parent.children.filter(id => id !== tipToRemove.id);
          }
          this.updateMuscleGlycogenTips();

          // 在肌肉肌纖維內部直接裂解產能
          const targetX = tipToRemove.x + (Math.random() - 0.5) * 40;
          const targetY = Math.max(muscle.y + 45, tipToRemove.y - 25 - Math.random() * 25);

          this.movingMolecules.push({
            fromX: tipToRemove.x,
            fromY: tipToRemove.y,
            toX: targetX,
            toY: targetY,
            x: tipToRemove.x,
            y: tipToRemove.y,
            progress: 0,
            speed: 0.025,
            type: 'muscle-use',
            onComplete: () => {
              this.triggerParticleBurst(targetX, targetY, '#fb7185', 16);
              this.generateAtp(targetX, targetY, 4);
              this.generateWaste(targetX, targetY, 2);
            }
          });
        }
      }
    }

    // 2. 運動誘導：GLUT4 易位使骨骼肌大量自血液直接攝取葡萄糖並立即氧化消耗產能
    if (this.freeGlucose.length > 0) {
      const candidates = [];
      for (let i = 0; i < this.freeGlucose.length; i++) {
        const g = this.freeGlucose[i];
        if (g.x >= muscle.x - 20 && g.x <= muscle.x + muscle.w + 40) {
          candidates.push(i);
        }
      }

      const uptakeCount = Math.min(2, candidates.length);
      for (let u = 0; u < uptakeCount; u++) {
        if (candidates.length === 0) break;
        const chosenOriginalIdx = candidates.splice(0, 1)[0];
        const g = this.freeGlucose.splice(chosenOriginalIdx, 1)[0];

        // 葡萄糖直接進入骨骼肌肌原纖維中燃燒產能
        const targetX = muscle.x + 40 + Math.random() * (muscle.w - 80);
        const targetY = muscle.y + 50 + Math.random() * (muscle.h - 100);

        this.movingMolecules.push({
          fromX: g.x,
          fromY: g.y,
          toX: targetX,
          toY: targetY,
          x: g.x,
          y: g.y,
          progress: 0,
          speed: 0.024,
          type: 'to-muscle',
          onComplete: () => {
            // 血糖進入肌肉後立即氧化供肌纖維運動
            this.triggerParticleBurst(targetX, targetY, '#f43f5e', 18);
            this.generateAtp(targetX, targetY, 5);
            this.generateWaste(targetX, targetY, 2);
          }
        });
      }
    }

    this.updateDashboard();
  }

  /* ---------------------- 操作：脂肪細胞攝取血糖轉化為三酸甘油酯儲存 ---------------------- */
  storeAdiposeFat(count = 2) {
    if (this.freeGlucose.length === 0) return;
    const ad = this.regions.adipose;

    for (let k = 0; k < count; k++) {
      if (this.freeGlucose.length === 0) break;

      // 篩選位於脂肪細胞上方血管區段的血糖
      const candidates = [];
      for (let i = 0; i < this.freeGlucose.length; i++) {
        const g = this.freeGlucose[i];
        if (g.x >= ad.x - 20 && g.x <= ad.x + ad.w + 30) {
          candidates.push(i);
        }
      }
      if (candidates.length === 0) break;

      // 隨機挑選一顆脂肪球吸收
      const targetDrop = this.fatDroplets[Math.floor(Math.random() * this.fatDroplets.length)];
      let chosenIdx = 0;
      let minDiff = Infinity;
      for (let ci = 0; ci < candidates.length; ci++) {
        const diff = Math.abs(targetDrop.x - this.freeGlucose[candidates[ci]].x);
        if (diff < minDiff) {
          minDiff = diff;
          chosenIdx = ci;
        }
      }

      const g = this.freeGlucose.splice(candidates[chosenIdx], 1)[0];

      this.movingMolecules.push({
        fromX: g.x,
        fromY: g.y,
        toX: targetDrop.x,
        toY: targetDrop.y,
        x: g.x,
        y: g.y,
        progress: 0,
        speed: 0.022,
        type: 'to-fat',
        onComplete: () => {
          // 油滴吸收三酸甘油酯並膨脹發光
          targetDrop.r = Math.min(65, targetDrop.r + 3.5);
          targetDrop.pulse = 1.0;
          this.triggerParticleBurst(targetDrop.x, targetDrop.y, '#eab308', 16);
          this.updateDashboard();
        }
      });
    }
    this.updateDashboard();
  }

  /* ---------------------- 操作：呼吸作用 (細胞質裂解與粒線體能量生成) ---------------------- */
  cellularRespiration() {
    if (this.freeGlucose.length === 0) return;

    const mito = this.regions.mitochondria;
    const cell = this.regions.cell;
    const candidates = [];

    for (let i = 0; i < this.freeGlucose.length; i++) {
      const g = this.freeGlucose[i];
      // 葡萄糖必須在組織細胞水平區段內 (x: cell.x ~ cell.x + cell.w 且 x <= 1080)
      if (g.x >= cell.x - 30 && g.x <= cell.x + cell.w + 20) {
        candidates.push(i);
      }
    }

    // 若目前組織細胞上方血管區段沒有葡萄糖，直接返回（絕不在空白處憑空生成幽靈分子）
    if (candidates.length === 0) return;

    // 挑選在組織細胞上方最合適攝取的葡萄糖分子（偏向靠右的開闊細胞質區域，避開左側細胞核）
    let chosenIdx = 0;
    let minDiff = Infinity;
    const cellTargetX = cell.x + 220 + Math.random() * 100; // 約 x: 740 ~ 840 (粒線體上方開闊細胞質)

    for (let ci = 0; ci < candidates.length; ci++) {
      const idx = candidates[ci];
      const g = this.freeGlucose[idx];
      const diff = Math.abs(cellTargetX - g.x);
      if (diff < minDiff) {
        minDiff = diff;
        chosenIdx = ci;
      }
    }

    const bestOriginalIndex = candidates[chosenIdx];
    const g = this.freeGlucose.splice(bestOriginalIndex, 1)[0];

    // 階段 1：血糖離開血管，進入「細胞質」（靠右側，落在粒線體上方的開闊細胞質，完全避開左側細胞核）
    const cytosolX = cell.x + 210 + Math.random() * 90; // x: 730 ~ 820
    const cytosolY = cell.y + 22 + Math.random() * 26;   // y: 402 ~ 428 (粒線體 y:440 上方安全空隙)

    this.updateDashboard();

    this.movingMolecules.push({
      fromX: g.x,
      fromY: g.y,
      toX: cytosolX,
      toY: cytosolY,
      x: g.x,
      y: g.y,
      progress: 0,
      speed: 0.024,
      type: 'to-cytosol',
      onComplete: () => {
        // 在細胞質中裂解：微小閃光並釋出少量 ATP (2 顆)
        this.triggerParticleBurst(cytosolX, cytosolY, '#38bdf8', 10);
        this.generateAtp(cytosolX, cytosolY, 2);

        // 裂解為兩個較小的三碳分子產物，隨後進入粒線體
        const offsetPositions = [
          { dx: -18, dy: -12 },
          { dx: 18, dy: 14 }
        ];

        offsetPositions.forEach((pos, idx) => {
          const splitStartX = cytosolX + pos.dx;
          const splitStartY = cytosolY + pos.dy;

          // 鎖定粒線體內部目標位置
          const innerPadX = 35;
          const innerPadY = 30;
          const targetMitoX = mito.x + innerPadX + (idx * 60) + Math.random() * (mito.w - innerPadX * 2 - 60);
          const targetMitoY = mito.y + innerPadY + Math.random() * (mito.h - innerPadY * 2);

          // 階段 2：小分子進入粒線體
          this.movingMolecules.push({
            fromX: splitStartX,
            fromY: splitStartY,
            toX: targetMitoX,
            toY: targetMitoY,
            x: splitStartX,
            y: splitStartY,
            progress: 0,
            speed: 0.022,
            type: 'to-mitochondria-split',
            onComplete: () => {
              // 粒線體內部釋放大量 ATP 與代謝廢物
              this.triggerParticleBurst(targetMitoX, targetMitoY, '#f59e0b', 16);
              this.generateAtp(targetMitoX, targetMitoY, 4); // 每個小分子產生大量能量 (合計 8+2=10)
              this.generateWaste(targetMitoX, targetMitoY, 3);
            }
          });
        });
      }
    });
  }

  generateAtp(startX, startY, count = 6) {
    this.atpCount += count;
    this.updateDashboard();

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 1.0 + Math.random() * 1.4;
      this.atpParticles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.007 + Math.random() * 0.004,
        size: 6 + Math.random() * 3
      });
    }
  }

  generateWaste(startX, startY, count = 3) {
    for (let j = 0; j < count; j++) {
      this.floatingWaste.push({
        x: startX + (Math.random() - 0.5) * 40,
        y: startY + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.8 - Math.random() * 0.6,
        text: j % 2 === 0 ? 'CO₂' : 'H₂O',
        alpha: 1.0
      });
    }
  }

  /* ---------------------- 視覺特效 & 粒子 ---------------------- */
  triggerParticleBurst(x, y, color = '#38bdf8', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 2 + 1;
      this.atpParticles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.9,
        decay: 0.02,
        color,
        size: 4 + Math.random() * 2
      });
    }
  }

  triggerFlash(region, color) {
    this.regionFlash = {
      region,
      color,
      alpha: 0.6
    };
  }

  /* ---------------------- 即時儀表板與狀態 ---------------------- */
  updateDashboard() {
    // 儀表板 DOM 已由使用者要求移除，保留方法作為狀態監控與擴充進入點
  }

  /* ---------------------- 控制面板初始化 ---------------------- */
  initControls() {
    document.getElementById('btn-eat').addEventListener('click', () => this.eatFood(6));
    document.getElementById('btn-store-glycogen').addEventListener('click', () => this.storeGlycogen(3));
    document.getElementById('btn-break-glycogen').addEventListener('click', () => this.breakGlycogen(3));
    
    // 骨骼肌合成肌糖原按鈕
    const btnMuscle = document.getElementById('btn-store-muscle');
    if (btnMuscle) {
      btnMuscle.addEventListener('click', () => this.storeMuscleGlycogen(3));
    }

    // 骨骼肌運動消耗肌糖原按鈕
    const btnUseMuscle = document.getElementById('btn-use-muscle');
    if (btnUseMuscle) {
      btnUseMuscle.addEventListener('click', () => this.useMuscleGlycogen(2));
    }

    // 脂肪細胞轉化為三酸甘油酯按鈕
    const btnFat = document.getElementById('btn-store-fat');
    if (btnFat) {
      btnFat.addEventListener('click', () => this.storeAdiposeFat(3));
    }

    document.getElementById('btn-respire').addEventListener('click', () => this.cellularRespiration());

    const btnAuto = document.getElementById('btn-auto-sim');
    const autoStatus = document.getElementById('auto-sim-status');
    btnAuto.addEventListener('click', () => {
      this.autoSim = !this.autoSim;
      btnAuto.classList.toggle('active', this.autoSim);
      autoStatus.textContent = this.autoSim ? '開啟' : '暫停';
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this.initBloodGlucose(12);
      this.initGlycogenTree();
      this.initMuscleGlycogen();
      this.initFatDroplets();
      this.atpCount = 0;
      this.movingMolecules = [];
      this.atpParticles = [];
      this.updateDashboard();
    });

    const speedSlider = document.getElementById('slider-speed');
    const speedVal = document.getElementById('speed-val');
    speedSlider.addEventListener('input', (e) => {
      this.speed = parseFloat(e.target.value);
      speedVal.textContent = `${this.speed.toFixed(1)}x`;
    });
  }

  /* ---------------------- 物理更新與動畫演進 ---------------------- */
  update(dt) {
    const effectiveDt = dt * this.speed;
    this.time += effectiveDt;

    // 1. 自動生理循環控制 (若開啟)
    if (this.autoSim) {
      this.autoSimTimer += effectiveDt;
      if (this.autoSimTimer > 2.0) {
        this.autoSimTimer = 0;
        // 根據目前血糖自動恆定調節
        if (this.freeGlucose.length > 14) {
          // 血糖充足/過高 -> 分流儲存至肝臟肝糖、骨骼肌糖原與脂肪組織
          const choice = Math.random();
          if (choice < 0.4) {
            this.storeGlycogen(2);
          } else if (choice < 0.7) {
            this.storeMuscleGlycogen(2);
          } else {
            this.storeAdiposeFat(2);
          }
        } else if (this.freeGlucose.length < 8 && this.glycogenNodes.length > 6) {
          // 血糖過低 -> 由肝臟拆解肝糖釋放回血液 (注意：肌糖原缺乏G6Pase不可釋出)
          this.breakGlycogen(2);
        } else {
          // 正常狀態下細胞自然呼吸消耗能量
          this.cellularRespiration();
        }
      }
    }

    // 2. 血管中葡萄糖的單向循環流動 (完全延伸至左右邊界外部進出，不在血管方塊內部突兀消失或出現)
    const bv = this.regions.blood;
    this.freeGlucose.forEach(g => {
      g.x += g.vx * (1 + this.speed * 0.4);
      g.y += g.vy * (1 + this.speed * 0.4);

      // 單向流動：流出視窗/血管右側完全看不見時 (x > 1150)，從左側完全看不見處 (x = -40) 重新進入
      if (g.x > 1150) {
        g.x = -40;
        // 隨機重設上下高度，呈現天然血流分佈
        g.y = bv.y + 25 + Math.random() * (bv.h - 50);
        // 重新洗牌流速 (包含快、中、慢速)，使整個血流網絡持續均勻交錯，防止分子聚集或形成真空段
        g.vx = 0.9 + Math.random() * 2.3;
      }

      // 上下微弱邊界彈性約束，避免碰撞管壁
      if (g.y < bv.y + 20) { g.y = bv.y + 20; g.vy = Math.abs(g.vy); }
      if (g.y > bv.y + bv.h - 20) { g.y = bv.y + bv.h - 20; g.vy = -Math.abs(g.vy); }
    });

    // 3. 正在運送中的分子 (曲線內插)
    for (let i = this.movingMolecules.length - 1; i >= 0; i--) {
      const m = this.movingMolecules[i];
      m.progress += m.speed * this.speed;

      // 貝茲曲線軌跡模擬柔和流向
      const p = Math.min(1.0, m.progress);
      // easeInOut
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

      // 加入拱形位移
      const midY = (m.fromY + m.toY) / 2 + (m.type === 'to-glycogen' ? -25 : 20);
      const t = ease;
      m.x = (1 - t) * (1 - t) * m.fromX + 2 * (1 - t) * t * ((m.fromX + m.toX) / 2) + t * t * m.toX;
      m.y = (1 - t) * (1 - t) * m.fromY + 2 * (1 - t) * t * midY + t * t * m.toY;

      if (m.progress >= 1.0) {
        if (m.onComplete) m.onComplete();
        this.movingMolecules.splice(i, 1);
      }
    }

    // 4. ATP 粒子運動
    for (let i = this.atpParticles.length - 1; i >= 0; i--) {
      const p = this.atpParticles[i];
      p.x += p.vx * this.speed;
      p.y += p.vy * this.speed;
      p.life -= p.decay * this.speed;
      if (p.life <= 0) {
        this.atpParticles.splice(i, 1);
      }
    }

    // 5. 代謝廢物氣體上升漂移
    for (let i = this.floatingWaste.length - 1; i >= 0; i--) {
      const w = this.floatingWaste[i];
      w.x += w.vx * this.speed;
      w.y += w.vy * this.speed;
      w.alpha -= 0.015 * this.speed;
      if (w.alpha <= 0) {
        this.floatingWaste.splice(i, 1);
      }
    }
  }

  /* ---------------------- 渲染核心 ---------------------- */
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 清屏
    ctx.clearRect(0, 0, w, h);

    // 繪製四大生理區域背景 (肝臟 + 血管 + 下方三大細胞)
    this.drawLiverCompartment(ctx);
    this.drawBloodCompartment(ctx);
    this.drawMuscleCompartment(ctx);
    this.drawAdiposeCompartment(ctx);
    this.drawCellCompartment(ctx);

    // 繪製肝糖分支網絡 (肝臟)
    this.drawGlycogenTree(ctx);

    // 繪製肌糖原分支網絡 (骨骼肌細胞)
    this.drawMuscleGlycogenTree(ctx);

    // 繪製三酸甘油酯油滴 (脂肪細胞)
    this.drawFatDroplets(ctx);

    // 繪製血管中的葡萄糖
    this.drawBloodGlucose(ctx);

    // 繪製遷移中的葡萄糖分子
    this.drawMovingMolecules(ctx);

    // 繪製 ATP 高能粒子與廢物氣泡
    this.drawAtpAndWaste(ctx);
  }

  /* 繪製骨骼肌細胞區域 (橫紋肌肌纖維風格) */
  drawMuscleCompartment(ctx) {
    const r = this.regions.muscle;
    ctx.save();

    // 圓角矩形容器
    this.roundRect(ctx, r.x, r.y, r.w, r.h, 18);
    const grad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    grad.addColorStop(0, 'rgba(159, 18, 57, 0.22)');
    grad.addColorStop(1, 'rgba(88, 28, 135, 0.25)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 骨骼肌橫紋 (Striations) 肌小節細微紋理
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.12)';
    ctx.lineWidth = 1.8;
    for (let sy = r.y + 35; sy <= r.y + r.h - 15; sy += 18) {
      ctx.beginPath();
      ctx.moveTo(r.x + 12, sy);
      ctx.lineTo(r.x + r.w - 12, sy);
      ctx.stroke();
    }

    // 區域抬頭標籤
    ctx.fillStyle = '#fda4af';
    ctx.font = 'bold 18px Noto Sans TC, sans-serif';
    ctx.fillText(r.name, r.x + 16, r.y + 28);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('肌原纖維與細胞質', r.x + 16, r.y + 46);

    ctx.restore();
  }

  /* 繪製脂肪細胞區域 (金黃色飽滿脂肪細胞與邊緣側核) */
  drawAdiposeCompartment(ctx) {
    const r = this.regions.adipose;
    ctx.save();

    // 圓角矩形容器
    this.roundRect(ctx, r.x, r.y, r.w, r.h, 18);
    const grad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    grad.addColorStop(0, 'rgba(161, 98, 7, 0.2)');
    grad.addColorStop(1, 'rgba(113, 63, 18, 0.28)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 脂肪細胞受擠壓偏側的扁平細胞核 (Peripheral Nucleus)
    ctx.beginPath();
    ctx.ellipse(r.x + 38, r.y + r.h - 35, 22, 10, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(147, 51, 234, 0.55)';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 12px Noto Sans TC, sans-serif';
    ctx.fillText('細胞核', r.x + 16, r.y + r.h - 15);

    // 區域抬頭標籤
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px Noto Sans TC, sans-serif';
    ctx.fillText(r.name, r.x + 16, r.y + 28);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('三酸甘油酯儲存脂滴', r.x + 16, r.y + 46);

    ctx.restore();
  }

  /* 繪製骨骼肌糖原分支樹 */
  drawMuscleGlycogenTree(ctx) {
    ctx.save();

    // 骨架糖苷鍵
    this.muscleGlycogenNodes.forEach(node => {
      if (node.parentId !== null) {
        const parent = this.muscleGlycogenNodes.find(n => n.id === node.parentId);
        if (parent) {
          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y);
          ctx.lineTo(node.x, node.y);
          ctx.strokeStyle = node.isTip ? '#fb7185' : '#e11d48';
          ctx.lineWidth = node.isTip ? 2.5 : 2.0;
          ctx.stroke();
        }
      }
    });

    // 葡萄糖單體節點
    this.muscleGlycogenNodes.forEach(node => {
      if (node.type === 'core') {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const isTip = node.isTip;
        const size = isTip ? 12 : 10.5;
        const fill = isTip ? '#fb7185' : '#e11d48';
        const stroke = isTip ? '#ffffff' : '#be123c';

        if (isTip) {
          ctx.shadowColor = '#fb7185';
          ctx.shadowBlur = 6;
        }
        this.drawHexagonGlucose(ctx, node.x, node.y, size, fill, stroke, false, '');
        ctx.shadowBlur = 0;
      }
    });

    // 標註「肌糖原」文字
    const core = this.muscleGlycogenNodes.find(n => n.type === 'core');
    if (core) {
      ctx.fillStyle = '#ffe4e6';
      ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('肌肉肝糖 (無法釋出回血液)', core.x, core.y + 18);
    }

    ctx.restore();
  }

  /* 繪製脂肪細胞三酸甘油酯脂滴群 */
  drawFatDroplets(ctx) {
    ctx.save();
    this.fatDroplets.forEach((d, idx) => {
      if (d.pulse > 0) d.pulse = Math.max(0, d.pulse - 0.02);

      const grad = ctx.createRadialGradient(
        d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.1,
        d.x, d.y, d.r
      );
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#eab308');
      grad.addColorStop(1, 'rgba(161, 98, 7, 0.85)');

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (1 + d.pulse * 0.1), 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = d.pulse > 0 ? '#ffffff' : 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = d.pulse > 0 ? 2.5 : 1.5;
      ctx.stroke();

      // 油滴高光
      ctx.beginPath();
      ctx.ellipse(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.28, d.r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();

      // 中央主油滴標示「三酸甘油酯」
      if (idx === 0) {
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('三酸甘油酯', d.x, d.y);
      }
    });
    ctx.restore();
  }

  /* 繪製肝臟區域與標示 (旋轉180度：左側寬大圓厚、右側漸尖向右下方延伸) */
  drawLiverCompartment(ctx) {
    const r = this.regions.liver;
    ctx.save();

    const x0 = r.x;
    const y0 = r.y;
    const w = r.w;
    const h = r.h;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;

    // 將原先圖示以中心旋轉 180 度 (Math.PI)
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI);
    ctx.translate(-cx, -cy);

    ctx.beginPath();
    // 繪製原輪廓（在旋轉 180 度座標系下渲染）
    ctx.moveTo(x0 + 20, y0 + h - 25);
    ctx.bezierCurveTo(x0 + 40, y0 + 15, x0 + w * 0.45, y0 + 5, x0 + w - 45, y0 + 18);
    ctx.bezierCurveTo(x0 + w - 5, y0 + 25, x0 + w + 10, y0 + 80, x0 + w - 10, y0 + h - 15);
    ctx.bezierCurveTo(x0 + w * 0.65, y0 + h - 10, x0 + w * 0.35, y0 + h + 2, x0 + 20, y0 + h - 25);
    ctx.closePath();

    // 漸層填色
    const grad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    grad.addColorStop(1, 'rgba(5, 150, 105, 0.06)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 回復旋轉變換以正向繪製文字
    ctx.restore();

    // 區域抬頭標籤 (在未旋轉座標下繪製於右上或左上適宜位置)
    ctx.save();
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px Noto Sans TC, sans-serif';
    ctx.fillText(r.name, x0 + 40, y0 + 36);
    ctx.restore();
  }

  /* 繪製血管區域 */
  drawBloodCompartment(ctx) {
    const r = this.regions.blood;
    ctx.save();

    // 血管紅潤動態管腔
    const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.22)');
    grad.addColorStop(0.5, 'rgba(190, 18, 60, 0.15)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0.22)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();

    // 血管壁內皮細胞線條
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 標籤
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px Noto Sans TC, sans-serif';
    ctx.fillText(r.name, r.x + 16, r.y + 24);

    // 血流方向提示箭頭 (多重動態水流引導箭頭，明確標示由左向右單向流動)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
    for (let offset = 0; offset < 3; offset++) {
      const arrowX = ((this.time * 50 + offset * 320) % (r.w - 80)) + r.x + 40;
      ctx.beginPath();
      ctx.moveTo(arrowX, r.y + r.h / 2 - 9);
      ctx.lineTo(arrowX + 22, r.y + r.h / 2);
      ctx.lineTo(arrowX, r.y + r.h / 2 + 9);
      ctx.fill();
    }

    ctx.restore();
  }

  /* 繪製細胞與粒線體區域 (長橢圓靠右，包含細胞核與縮小的粒線體) */
  drawCellCompartment(ctx) {
    const r = this.regions.cell;
    const m = this.regions.mitochondria;
    const n = this.regions.nucleus;
    ctx.save();

    // 組織細胞長橢圓 (橫向橢圓形)
    const centerX = r.x + r.w / 2;
    const centerY = r.y + r.h / 2;
    const radiusX = r.w / 2;
    const radiusY = r.h / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

    // 細胞質漸層填色
    const cellGrad = ctx.createRadialGradient(
      centerX, centerY, 50,
      centerX, centerY, radiusX
    );
    cellGrad.addColorStop(0, 'rgba(30, 41, 59, 0.6)');
    cellGrad.addColorStop(1, 'rgba(15, 23, 42, 0.7)');
    ctx.fillStyle = cellGrad;
    ctx.fill();

    // 組織細胞膜
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 細胞標題 (擺在橢圓左上方)
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 18px Noto Sans TC, sans-serif';
    ctx.fillText(r.name, r.x + 45, r.y + 35);

    // 細胞質中標註
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('細胞質', r.x + 45, r.y + 54);

    // ----------------- 繪製細胞核 (Nucleus) -----------------
    if (n) {
      // 1. 核膜外圈漸層
      const nGrad = ctx.createRadialGradient(n.x, n.y, 8, n.x, n.y, n.radius);
      nGrad.addColorStop(0, 'rgba(147, 51, 234, 0.45)');
      nGrad.addColorStop(0.7, 'rgba(107, 33, 168, 0.35)');
      nGrad.addColorStop(1, 'rgba(88, 28, 135, 0.55)');

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = nGrad;
      ctx.fill();

      // 雙層核膜線
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. 染色質絲 (Chromatin fibers) 示意紋理
      ctx.strokeStyle = 'rgba(233, 213, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(n.x - 8, n.y - 6, 16, 0.3, Math.PI * 1.2);
      ctx.arc(n.x + 10, n.y + 8, 14, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();

      // 3. 核仁 (Nucleolus)
      ctx.beginPath();
      ctx.arc(n.x + 6, n.y - 8, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 細胞核文字標籤
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 11px Noto Sans TC, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, n.x, n.y + n.radius + 16);
      ctx.textAlign = 'left';
    }

    // ----------------- 繪製縮小後的粒線體本體 (Mitochondria) -----------------
    const mGrad = ctx.createRadialGradient(
      m.x + m.w / 2, m.y + m.h / 2, 15,
      m.x + m.w / 2, m.y + m.h / 2, m.w / 2
    );
    mGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    mGrad.addColorStop(0.8, 'rgba(180, 83, 9, 0.42)');
    mGrad.addColorStop(1, 'rgba(120, 53, 15, 0.55)');

    ctx.fillStyle = mGrad;
    this.roundRect(ctx, m.x, m.y, m.w, m.h, 28);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 粒線體內膜皺褶 (Cristae 嵴：內膜向內褶皺突入基質的盲管狀/片狀構造，由上下兩側壁向內交錯延伸)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const topBaseY = m.y + 14;
    const botBaseY = m.y + m.h - 14;
    const midY = m.y + m.h / 2;
    const cristaeSpacing = 28;
    const startX = m.x + 38;
    const endX = m.x + m.w - 38;

    let toggle = true;
    for (let cx = startX; cx <= endX; cx += cristaeSpacing) {
      if (toggle) {
        // 從頂部內膜向中央基質凸入的盲端片狀褶皺 (不貫穿，深約 55%~65% 高度)
        const reachY = midY + 12 + ((cx % 3) * 3);
        ctx.moveTo(cx - 5, topBaseY);
        ctx.bezierCurveTo(cx - 3, topBaseY + 14, cx - 4, reachY - 8, cx, reachY);
        ctx.bezierCurveTo(cx + 4, reachY - 8, cx + 3, topBaseY + 14, cx + 5, topBaseY);
      } else {
        // 從底部內膜向中央基質凸入的盲端片狀褶皺 (兩側交錯，深約 55%~65% 高度)
        const reachY = midY - 12 - ((cx % 3) * 3);
        ctx.moveTo(cx - 5, botBaseY);
        ctx.bezierCurveTo(cx - 3, botBaseY - 14, cx - 4, reachY + 8, cx, reachY);
        ctx.bezierCurveTo(cx + 4, reachY + 8, cx + 3, botBaseY - 14, cx + 5, botBaseY);
      }
      toggle = !toggle;
    }
    ctx.stroke();

    // 粒線體標籤
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px Noto Sans TC, sans-serif';
    ctx.fillText('粒線體 (呼吸作用)', m.x + 18, m.y + 24);

    ctx.restore();
  }

  /* 繪製肝糖分支樹 (α-1,4 主鍵與 α-1,6 分支) */
  drawGlycogenTree(ctx) {
    ctx.save();

    // 1. 繪製骨架連接線 (糖苷鍵 Glycosidic Bonds)
    this.glycogenNodes.forEach(node => {
      if (node.parentId !== null) {
        const parent = this.glycogenNodes.find(n => n.id === node.parentId);
        if (parent) {
          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y);
          ctx.lineTo(node.x, node.y);

          // 判斷是否為末端鏈
          if (node.isTip) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.8;
          } else {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.2;
          }
          ctx.stroke();

          // 鍵結中間標示微小六碳環裝飾
          const mx = (parent.x + node.x) / 2;
          const my = (parent.y + node.y) / 2;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
        }
      }
    });

    // 2. 繪製葡萄糖單體節點 (肝醣內的小分子亦以六邊形呈現)
    this.glycogenNodes.forEach(node => {
      if (node.type === 'core') {
        // 核心原蛋白 Glycogenin
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 2;
        ctx.stroke();


      } else {
        // 肝糖內的葡萄糖分子 (六邊形結構)
        const isTip = node.isTip;
        const size = isTip ? 13.5 : 11.5;
        const fill = isTip ? '#facc15' : '#10b981';
        const stroke = isTip ? '#ffffff' : '#059669';

        // 末端發光效果
        if (isTip) {
          const glow = Math.sin(this.time * 5 + node.id) * 3 + 6;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = glow;
        } else {
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 3;
        }

        this.drawHexagonGlucose(ctx, node.x, node.y, size, fill, stroke, false, '');
        ctx.shadowBlur = 0;

        // 末端標籤 (TIP: 非還原端)
        if (isTip) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TIP', node.x, node.y - 15);
        }
      }
    });

    // 3. 於肝糖樹下方標註文字「肝糖」
    const coreNode = this.glycogenNodes.find(n => n.type === 'core');
    if (coreNode) {
      ctx.save();
      ctx.fillStyle = '#f8fffcff';
      ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('肝糖', coreNode.x, coreNode.y + 18);
      ctx.restore();
    }

    ctx.restore();
  }

  /* 繪製血液中游動的葡萄糖分子 (放大六邊形結構，中間標註清晰「葡」字) */
  drawBloodGlucose(ctx) {
    const bv = this.regions.blood;
    ctx.save();

    // 建立血管裁切區 (Clip)，確保葡萄糖分子完全在血管方塊內流動，在出入血管邊緣時平滑漸顯/漸隱，絕不突出到方塊之外
    this.roundRect(ctx, bv.x, bv.y, bv.w, bv.h, 14);
    ctx.clip();

    this.freeGlucose.forEach(g => {
      this.drawHexagonGlucose(ctx, g.x, g.y, 15.5, '#38bdf8', '#0284c7', false, '葡');
    });

    ctx.restore();
  }

  /* 繪製運送動畫中的分子 (同樣放大) */
  drawMovingMolecules(ctx) {
    ctx.save();
    this.movingMolecules.forEach(m => {
      // 尾跡特效
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.fromX, m.fromY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // 分子本體高亮
      if (m.type === 'to-glycogen') {
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#34d399', '#059669', true, '葡');
      } else if (m.type === 'to-muscle') {
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#fb7185', '#e11d48', true, '葡');
      } else if (m.type === 'muscle-use') {
        // 肌肉內部消耗肌糖原產能
        this.drawHexagonGlucose(ctx, m.x, m.y, 14, '#f43f5e', '#ffffff', true, '');
      } else if (m.type === 'to-fat') {
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#fde047', '#ca8a04', true, '葡');
      } else if (m.type === 'to-blood') {
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#facc15', '#ca8a04', true, '葡');
      } else if (m.type === 'to-cytosol') {
        // 葡萄糖進入細胞質
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#38bdf8', '#0284c7', true, '葡');
      } else if (m.type === 'to-mitochondria-split') {
        // 在細胞質裂解後的較小分子進入粒線體
        this.drawSmallSplitMolecule(ctx, m.x, m.y);
      } else {
        this.drawHexagonGlucose(ctx, m.x, m.y, 15.5, '#f59e0b', '#d97706', true, '葡');
      }
    });
    ctx.restore();
  }

  /* 繪製細胞質裂解產生的小分子 (較葡萄糖小，由3個緊湊原子團聚而成) */
  drawSmallSplitMolecule(ctx, x, y) {
    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;

    // 繪製三個緊密相連的小球表示三碳分子結構 (不寫化學名詞)
    const subRadius = 5.2;
    const offsets = [
      { dx: -4.5, dy: 3.5, color: '#fbbf24' },
      { dx: 4.5, dy: 3.5, color: '#f59e0b' },
      { dx: 0, dy: -4.5, color: '#d97706' }
    ];

    // 連接底暈
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.fill();

    offsets.forEach(pt => {
      ctx.beginPath();
      ctx.arc(x + pt.dx, y + pt.dy, subRadius, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /* 繪製六邊形葡萄糖圖案 (可帶內部標籤如「葡」) */
  drawHexagonGlucose(ctx, x, y, size, fill, stroke, glowing = false, label = '') {
    if (glowing) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = 12;
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 若有文字標籤 (如血糖的「葡」字) 則居中繪製
    if (label) {
      ctx.fillStyle = '#09101f';
      ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    } else {
      // 無文字時保留微小原子光點裝飾
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + size * 0.32, y - size * 0.32, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  /* 繪製 ATP 粒子與漂浮氣體 */
  drawAtpAndWaste(ctx) {
    ctx.save();

    // ATP 粒子
    this.atpParticles.forEach(p => {
      ctx.fillStyle = p.color || `rgba(245, 158, 11, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();

      // 星芒微光
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.8})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 代謝廢物氣泡 (CO2, H2O)
    this.floatingWaste.forEach(w => {
      ctx.fillStyle = `rgba(148, 163, 184, ${w.alpha})`;
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w.text, w.x, w.y);
    });

    ctx.restore();
  }

  /* 輔助：圓角矩形 */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* ---------------------- 主遊戲動畫迴圈 ---------------------- */
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }
}

// 當 DOM 加載完成後啟動模擬
window.addEventListener('DOMContentLoaded', () => {
  window.simInstance = new GlucoseSimulation();
});

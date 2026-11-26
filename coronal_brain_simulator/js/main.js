/* =========================================================================
 * main.js — 多尺度互動控制器、UI 狀態切換、點擊檢測與主迴圈
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, M = BS.macro, S = BS.scene, Sim = BS.sim, R = BS.render;

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimap');
  const mctx = miniCanvas ? miniCanvas.getContext('2d') : null;

  let width = 0, height = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------------- 核心應用狀態 ---------------- */
  const MIN_ZOOM = 0.85;
  const MAX_ZOOM = 320;
  const MICRO_BASE_ZOOM = 26; // cam.zoom === 26 時，microZoom === 1.0

  const state = {
    plane: 'anterior',       // 'anterior' | 'hippocampus'
    stain: 'natural',        // 'natural' | 'nissl'
    showLabels: true,        // 文字標籤 Toggle
    showSignals: true,       // 訊號傳導動畫 Toggle
    highlights: new Set(),   // 細胞種類高光篩選

    // 攝影機：cam.zoom < 13 以巨觀為主，cam.zoom >= 13 平滑過渡至顯微組織圖版
    cam: {
      zoom: 1.0, targetZoom: 1.0,
      mx: 0, my: 8, targetMX: 0, targetMY: 8,     // 巨觀世界座標
      ux: 0, uy: 0, targetUX: 0, targetUY: 0      // 顯微圖版局部座標 (-850..850, -560..560)
    },

    sample: { x: -195, y: -155, reg: 2, plane: 'anterior' },
    hoverMacro: null,
    hoverReg: 0,
    sceneCache: new Map(),
    currentScene: null,
    selected: null           // { kind, title, sub, region, desc, color, x, y, r, neuron }
  };

  const sim = Sim.createSim();

  /* ---------------- 場景載入與快取 ---------------- */
  function sceneKey(sample) {
    const qx = Math.round(sample.x / 18);
    const qy = Math.round(sample.y / 18);
    return `${sample.plane}:${sample.reg}:${qx}:${qy}`;
  }

  function loadSceneForSample(sample, forceNewSeed) {
    let reg = sample.reg;
    if (!reg || reg === 0) {
      reg = M.getRegionAt(sample.x, sample.y, sample.plane) || 2;
      sample.reg = reg;
    }
    const key = forceNewSeed ? `${sceneKey(sample)}:${Date.now()}` : sceneKey(sample);
    let sc = state.sceneCache.get(key);
    if (!sc) {
      const info = S.typeForRegion(reg, sample.x, sample.y, sample.plane) || { type: 'cortex', regionName: '大腦皮質' };
      const seed = Math.abs((Math.round(sample.x * 131) ^ Math.round(sample.y * 977) ^ (reg * 7919) ^ (forceNewSeed || 0)) | 0) + 17;
      sc = S.generate(info, seed);
      state.sceneCache.set(key, sc);
    }
    if (state.currentScene !== sc) {
      state.currentScene = sc;
      state.selected = null;
      hideInspector();
      Sim.bindScene(sim, sc);
    }
    return sc;
  }

  /* ---------------- 座標轉換 ---------------- */
  function safeHorizontalSpan() {
    const leftEl = document.getElementById('left-drawer');
    const rightEl = document.getElementById('right-drawer');
    const leftOpen = leftEl && !leftEl.classList.contains('collapsed') && width > 900;
    const rightOpen = rightEl && !rightEl.classList.contains('collapsed') && width > 900;
    return {
      left: leftOpen ? 286 : 18,
      right: rightOpen ? width - 298 : width - 18
    };
  }

  function macroScale() {
    const span = safeHorizontalSpan();
    const availW = Math.max(340, span.right - span.left);
    const availH = Math.max(300, height - 150);
    return Math.min(availW / 1010, availH / 565) * state.cam.zoom;
  }
  function microZoom() {
    return state.cam.zoom / MICRO_BASE_ZOOM;
  }
  function microFitScale() {
    return Math.min(width / 1820, height / 1220) * microZoom();
  }

  function screenToMacro(sx, sy) {
    const s = macroScale();
    return {
      x: state.cam.mx + (sx - width * 0.5) / s,
      y: state.cam.my + (sy - height * 0.5) / s
    };
  }
  function macroToScreen(wx, wy) {
    const s = macroScale();
    return {
      x: width * 0.5 + (wx - state.cam.mx) * s,
      y: height * 0.5 + (wy - state.cam.my) * s
    };
  }

  function screenToMicro(sx, sy) {
    const s = microFitScale();
    return {
      x: state.cam.ux + (sx - width * 0.5) / s,
      y: state.cam.uy + (sy - height * 0.5) / s
    };
  }
  function microToScreen(wx, wy) {
    const s = microFitScale();
    return {
      x: width * 0.5 + (wx - state.cam.ux) * s,
      y: height * 0.5 + (wy - state.cam.uy) * s
    };
  }

  function isMicroActive() {
    return state.cam.zoom >= 12.5;
  }

  /* ---------------- 顯微物件精準點選檢測 ---------------- */
  const CELL_DESCRIPTIONS = {
    neuron: (n) => n.excit
      ? `${n.kindInfo.title}：胞體與樹突、軸突丘連續相接。樹突接收興奮性（EPSP）與抑制性（IPSP）輸入，於軸突丘整合跨過閾值後，沿有髓鞘軸突進行蘭氏結跳躍傳導並經側枝擴散至下游神經元。`
      : `${n.kindInfo.title}：釋放 GABA 抑制性神經傳導物質，終扣主要包覆目標神經元胞體，產生過極化 IPSP 以精準調控局部網路興奮度、防止過度同步放電。`,
    astrocyte: '星形膠質細胞：具放射狀連續突起與緊貼微血管壁的寬扁「血管周終足（Perivascular endfeet）」，維持血腦障壁、輸送乳酸供能，並在深度睡眠時收縮讓出類淋巴排毒通道。',
    oligodendrocyte: '寡突膠質細胞：單一細胞伸出多條突起，連續延伸包繞多段神經軸突形成立體脂質髓鞘（Myelin sheath），使動作電位在蘭氏結間高速跳躍傳導。',
    microglia: '微膠細胞：中樞神經系統常駐免疫吞噬細胞，以分枝突起持續巡邏微環境，主動趨化吞噬類澱粉蛋白斑塊與細胞碎片。',
    ependyma: '室管膜細胞：排列於腦室壁的單層纖毛上皮細胞，頂端纖毛節律擺動推動腦脊髓液（CSF）循環，基底突起錨定於腦實質。',
    capillary: '腦微血管與雙凹紅血球：由緊密連接的內皮細胞構成，外部由星形膠細胞終足包覆形成血腦障壁（BBB），紅血球單列變形通過以供應氧氣與葡萄糖。',
    synapse: '化學突觸（Synaptic Cleft）：軸突終扣內含突觸囊泡，動作電位抵達時釋放神經傳導物質跨越約 20 nm 間隙結合突觸後受體，並由前膜轉運體（如 DAT）回收。'
  };

  function pickMicroObject(wx, wy, hitPad) {
    const sc = state.currentScene;
    if (!sc) return null;

    // 1. 若在突觸超微倍率，優先允許點選突觸
    if (microZoom() > 1.8) {
      for (const syn of sc.synapses) {
        if (U.dist(wx, wy, syn.contact.x, syn.contact.y) <= 8 + hitPad) {
          return {
            kind: 'synapse',
            title: syn.excit ? '興奮性化學突觸（麩胺酸／多巴胺）' : '抑制性化學突觸（GABA）',
            sub: 'Chemical Synapse',
            color: syn.excit ? '#ffb74d' : '#90caf9',
            desc: CELL_DESCRIPTIONS.synapse,
            x: syn.contact.x, y: syn.contact.y, r: 9
          };
        }
      }
    }

    // 2. 真實神經元胞體（最重要互動目標：點擊激發級聯擴散！）
    let bestNeuron = null, bestND = Infinity;
    for (const n of sc.real) {
      const d = U.dist(wx, wy, n.x, n.y);
      if (d <= n.r + 10 + hitPad && d < bestND) {
        bestND = d; bestNeuron = n;
      }
    }
    if (bestNeuron) {
      return {
        kind: 'neuron',
        neuron: bestNeuron,
        title: bestNeuron.kindInfo.title,
        sub: bestNeuron.kindInfo.en,
        color: bestNeuron.excit ? '#f4d06a' : '#c7aee8',
        desc: CELL_DESCRIPTIONS.neuron(bestNeuron),
        x: bestNeuron.x, y: bestNeuron.y, r: bestNeuron.r
      };
    }

    // 3. 寡突膠質細胞本體
    for (const o of sc.oligos) {
      if (U.dist(wx, wy, o.x, o.y) <= o.r + 6 + hitPad) {
        return {
          kind: 'oligodendrocyte', title: '寡突膠質細胞', sub: 'Oligodendrocyte',
          color: '#93d3f3', desc: CELL_DESCRIPTIONS.oligodendrocyte,
          x: o.x, y: o.y, r: o.r
        };
      }
    }

    // 4. 星形膠質細胞本體
    for (const a of sc.astros) {
      if (U.dist(wx, wy, a.x, a.y) <= a.r + 6 + hitPad) {
        return {
          kind: 'astrocyte', title: '星形膠質細胞', sub: 'Astrocyte',
          color: '#9fcf63', desc: CELL_DESCRIPTIONS.astrocyte,
          x: a.x, y: a.y, r: a.r
        };
      }
    }

    // 5. 微膠細胞
    for (const m of sc.micro) {
      if (U.dist(wx, wy, m.x, m.y) <= 18 + hitPad) {
        return {
          kind: 'microglia', title: '微膠細胞', sub: 'Microglia',
          color: '#a9343f', desc: CELL_DESCRIPTIONS.microglia,
          x: m.x, y: m.y, r: 15
        };
      }
    }

    // 6. 室管膜細胞
    for (const e of sc.epend) {
      if (U.dist(wx, wy, e.x, e.y) <= 19 + hitPad) {
        return {
          kind: 'ependyma', title: '室管膜細胞', sub: 'Ependymal Cell',
          color: '#f3a5b3', desc: CELL_DESCRIPTIONS.ependyma,
          x: e.x, y: e.y, r: 16
        };
      }
    }

    // 7. 微血管
    for (const v of sc.vessels) {
      const nr = U.nearestOnPolyline(v.pts, v.cum, wx, wy);
      if (nr.d <= v.R + 6 + hitPad) {
        const P = U.pointAtS(v.pts, v.cum, nr.s);
        return {
          kind: 'capillary', vessel: v, vesselS: nr.s,
          title: '腦微血管與紅血球', sub: 'Cerebral Capillary & RBCs',
          color: '#de5b4b', desc: CELL_DESCRIPTIONS.capillary,
          x: P.x, y: P.y, r: v.R + 4
        };
      }
    }

    // 8. 點在神經元樹突／有髓鞘軸突剪影上（Path2D hit test）
    for (const o of sc.oligos) {
      if (ctx.isPointInPath(o.body, wx, wy)) {
        return {
          kind: 'oligodendrocyte', title: '有髓鞘節段（寡突膠細胞包覆）', sub: 'Myelin Internode',
          color: '#93d3f3', desc: CELL_DESCRIPTIONS.oligodendrocyte,
          x: wx, y: wy, r: 10
        };
      }
    }
    for (const n of sc.real) {
      if (ctx.isPointInPath(n.body, wx, wy)) {
        return {
          kind: 'neuron', neuron: n,
          title: n.kindInfo.title, sub: n.kindInfo.en,
          color: n.excit ? '#f4d06a' : '#c7aee8',
          desc: CELL_DESCRIPTIONS.neuron(n),
          x: n.x, y: n.y, r: n.r
        };
      }
    }

    return null;
  }

  /* ---------------- UI 元素與資訊面板 ---------------- */
  const elZoomVal = document.getElementById('zoom-val');
  const elScaleBadge = document.getElementById('scale-level');
  const elRegionName = document.getElementById('region-name');
  const elStatusMsg = document.getElementById('status-msg');
  const elZoomSlider = document.getElementById('zoom-slider');
  const elInspector = document.getElementById('cell-inspector');
  const elCiSwatch = document.getElementById('ci-swatch');
  const elCiTitle = document.getElementById('ci-title');
  const elCiRegion = document.getElementById('ci-region');
  const elCiDesc = document.getElementById('ci-desc');
  const elCiFireBtn = document.getElementById('ci-fire-btn');

  function setStatus(html) {
    if (elStatusMsg) elStatusMsg.innerHTML = html;
  }

  function showInspector(sel) {
    state.selected = sel;
    if (!sel || !elInspector) return;
    const sc = state.currentScene;
    elCiSwatch.style.background = sel.color;
    elCiTitle.textContent = `${sel.title}`;
    elCiRegion.textContent = `${sc ? sc.info.regionName : ''} · ${sel.sub}`;
    elCiDesc.textContent = sel.desc;
    if (elCiFireBtn) {
      elCiFireBtn.style.display = sel.neuron ? 'inline-flex' : 'none';
    }
    elInspector.classList.add('visible');
  }

  function hideInspector() {
    state.selected = null;
    if (elInspector) elInspector.classList.remove('visible');
  }

  document.getElementById('ci-close').addEventListener('click', hideInspector);
  if (elCiFireBtn) {
    elCiFireBtn.addEventListener('click', () => {
      if (state.selected && state.selected.neuron && state.currentScene) {
        triggerUserNeuronCascade(state.selected.neuron);
      }
    });
  }

  function triggerUserNeuronCascade(n) {
    if (!state.showSignals) {
      state.showSignals = true;
      sim.enabled = true;
      syncToggleButtons();
    }
    Sim.fireNeuron(sim, state.currentScene, n, { forced: true, isUserClick: true });
    setStatus(`⚡ 已刺激「<b>${n.kindInfo.title}</b>」產生動作電位！觀察訊號沿軸突與側枝跳躍傳導並擴散至下游細胞（<b>快速連點同一細胞</b>可體驗時間總和，跨過更多下游閾值）。`);
  }

  /* ---------------- 飛行跳轉預設區域 ---------------- */
  const PRESETS = {
    macro:     { macro: true, x: 0,    y: 8,    zoom: 1.0,  msg: '📖 已返回 <b>1x 全腦冠狀切面</b>：點擊任意腦區或滾輪放大即可進入教科書級細胞插畫世界。' },
    cortex:    { x: -198, y: -154, reg: 2, zoom: 28,  ux: 0, uy: 0, msg: '🔬 <b>大腦皮質灰質</b>：可見無縫連續的錐體神經元、頂端樹突棘、籃狀抑制性中間神經元與血管周星形膠細胞終足。點擊任意神經元觀察級聯傳導！' },
    hippo:     { x: 108,  y: 108,  reg: 8, zoom: 28,  ux: 0, uy: 0, plane: 'hippocampus', msg: '🔬 <b>海馬迴 CA 錐體細胞層</b>：錐體細胞整齊成帶排列，點選一顆錐體神經元可清楚觀察訊號沿側枝向鄰近錐體細胞橫向擴散！' },
    striatum:  { x: -120, y: 15,   reg: 6, zoom: 28,  ux: 0, uy: 0, msg: '🔬 <b>基底核（紋狀體）</b>：中型多棘抑制性神經元（淡紫）、大型膽鹼性中間神經元與穿越的鉛筆狀有髓鞘纖維束。' },
    thalamus:  { x: -34,  y: 22,   reg: 6, zoom: 28,  ux: 0, uy: 0, plane: 'hippocampus', msg: '🔬 <b>視丘中繼核團</b>：叢狀樹突視丘中繼神經元接收上行傳入纖維並向皮質投射。' },
    callosum:  { x: 0,    y: -68,  reg: 4, zoom: 28,  ux: 0, uy: 0, msg: '🔬 <b>胼胝體橫向白質束</b>：密集平行排列的有髓鞘神經纖維、蘭氏結跳躍放電與束間寡突膠質細胞。' },
    capsule:   { x: 82,   y: 12,   reg: 7, zoom: 28,  ux: 0, uy: 0, msg: '🔬 <b>內囊垂直白質通道</b>：上下行皮質脊髓與視丘皮質有髓鞘軸突束。' },
    radiata:   { x: 192,  y: -120, reg: 3, zoom: 28,  ux: 0, uy: 0, msg: '🔬 <b>中央白質（輻射冠）</b>：扇形放射走行的有髓鞘投射纖維與纖維型星形膠質細胞。' },
    ventricle: { x: -30,  y: -30,  reg: 5, zoom: 28,  ux: 0, uy: 20, msg: '🔬 <b>側腦室壁與室管膜</b>：粉紅色室管膜細胞頂端紅纖毛節律擺動推動腦脊髓液（開啟「深度睡眠」可觀察排毒沖刷！）。' },
    synapse:   { synapseZoom: true, msg: '🔍 <b>超微突觸間隙特寫</b>：觀察突觸前終扣內的突觸囊泡、多巴胺回收轉運體（DAT）、擴散中的傳導物質微粒與突觸後受體結合！' }
  };

  function goToPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    if (p.synapseZoom) {
      if (!isMicroActive()) {
        loadSceneForSample(state.sample);
        state.cam.targetMX = state.sample.x;
        state.cam.targetMY = state.sample.y;
      }
      const sc = state.currentScene;
      if (sc && sc.synapses.length) {
        const syn = sc.synapses.find((s) => s.excit && !s.pre.virtual) || sc.synapses[0];
        state.cam.targetUX = syn.contact.x;
        state.cam.targetUY = syn.contact.y;
        state.cam.targetZoom = 156;
        if (!syn.pre.virtual) triggerUserNeuronCascade(syn.pre);
      }
      setStatus(p.msg);
      return;
    }

    if (p.plane && state.plane !== p.plane) {
      state.plane = p.plane;
      syncPlaneButtons();
    }
    if (p.macro) {
      hideInspector();
      state.cam.targetMX = p.x;
      state.cam.targetMY = p.y;
      state.cam.targetZoom = p.zoom;
      setStatus(p.msg);
      return;
    }

    state.sample = { x: p.x, y: p.y, reg: p.reg, plane: state.plane };
    loadSceneForSample(state.sample);
    state.cam.targetMX = p.x;
    state.cam.targetMY = p.y;
    state.cam.targetUX = p.ux || 0;
    state.cam.targetUY = p.uy || 0;
    state.cam.targetZoom = p.zoom;
    setStatus(p.msg);
  }

  function enterMicroAtMacroPoint(wx, wy, targetZoom) {
    const reg = M.getRegionAt(wx, wy, state.plane);
    if (reg === 0) return false;
    state.sample = { x: wx, y: wy, reg, plane: state.plane };
    const sc = loadSceneForSample(state.sample);
    state.cam.targetMX = wx;
    state.cam.targetMY = wy;
    state.cam.targetUX = 0;
    state.cam.targetUY = 0;
    state.cam.targetZoom = targetZoom || 28;
    setStatus(`🔬 已進入「<b>${sc.info.regionName}</b>」顯微插圖視野 —— 點擊任意<b>神經元</b>可觀察動作電位擴散至其他細胞！`);
    return true;
  }

  /* ---------------- 滑鼠與觸控手勢 ---------------- */
  const pointers = new Map();
  let isDragging = false;
  let movedDist = 0;
  let lastPinchDist = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      isDragging = true;
      movedDist = 0;
    } else if (pointers.size === 2) {
      isDragging = false;
      const pts = Array.from(pointers.values());
      lastPinchDist = U.dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) {
      // 巨觀下未按住滑鼠時更新解剖分區預覽
      if (!isMicroActive()) {
        const mw = screenToMacro(e.clientX, e.clientY);
        state.hoverMacro = mw;
        state.hoverReg = M.getRegionAt(mw.x, mw.y, state.plane);
      } else {
        state.hoverMacro = null;
        state.hoverReg = 0;
      }
      return;
    }

    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && isDragging) {
      movedDist += Math.hypot(dx, dy);
      if (isMicroActive()) {
        const s = microFitScale();
        state.cam.targetUX = U.clamp(state.cam.targetUX - dx / s, -820, 820);
        state.cam.targetUY = U.clamp(state.cam.targetUY - dy / s, -530, 530);
      } else {
        const s = macroScale();
        state.cam.targetMX = U.clamp(state.cam.targetMX - dx / s, -380, 380);
        state.cam.targetMY = U.clamp(state.cam.targetMY - dy / s, -290, 290);
      }
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = U.dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      if (lastPinchDist > 0) {
        const factor = dist / lastPinchDist;
        zoomAtScreenPoint((pts[0].x + pts[1].x) * 0.5, (pts[0].y + pts[1].y) * 0.5, factor);
      }
      lastPinchDist = dist;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinchDist = 0;
    if (pointers.size === 0) {
      if (isDragging && movedDist < 6) {
        handleStageClick(e.clientX, e.clientY);
      }
      isDragging = false;
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.17 : 1 / 1.17;
    zoomAtScreenPoint(e.clientX, e.clientY, factor);
  }, { passive: false });

  function zoomAtScreenPoint(sx, sy, factor) {
    const oldZoom = state.cam.targetZoom;
    const newZoom = U.clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(newZoom - oldZoom) < 1e-4) return;

    if (oldZoom < 12.5 && newZoom >= 12.5) {
      // 從巨觀放大跨入顯微：鎖定滑鼠所在的腦區載入對應顯微場景！
      const mw = screenToMacro(sx, sy);
      const reg = M.getRegionAt(mw.x, mw.y, state.plane);
      if (reg > 0) {
        state.sample = { x: mw.x, y: mw.y, reg, plane: state.plane };
        loadSceneForSample(state.sample);
        state.cam.targetMX = mw.x;
        state.cam.targetMY = mw.y;
        state.cam.targetUX = 0;
        state.cam.targetUY = 0;
      }
      state.cam.targetZoom = newZoom;
      return;
    }

    if (newZoom >= 12.5) {
      const before = screenToMicro(sx, sy);
      state.cam.targetZoom = newZoom;
      const newS = Math.min(width / 1820, height / 1220) * (newZoom / MICRO_BASE_ZOOM);
      state.cam.targetUX = U.clamp(before.x - (sx - width * 0.5) / newS, -820, 820);
      state.cam.targetUY = U.clamp(before.y - (sy - height * 0.5) / newS, -530, 530);
    } else {
      const before = screenToMacro(sx, sy);
      const baseMacro = macroScale() / state.cam.zoom;
      state.cam.targetZoom = newZoom;
      const newS = baseMacro * newZoom;
      state.cam.targetMX = U.clamp(before.x - (sx - width * 0.5) / newS, -360, 360);
      state.cam.targetMY = U.clamp(before.y - (sy - height * 0.5) / newS, -270, 270);
      if (newZoom < 2.0) {
        state.cam.targetMX *= 0.65;
        state.cam.targetMY = U.lerp(state.cam.targetMY, 8, 0.35);
      }
    }
  }

  function handleStageClick(sx, sy) {
    // 1. 巨觀視角：點擊標籤或腦區直接進入該腦區的顯微插畫圖版
    if (!isMicroActive()) {
      const mw = screenToMacro(sx, sy);
      if (state.showLabels) {
        const callouts = M.getCallouts(state.plane);
        for (const c of callouts) {
          if (Math.abs(mw.x - c.lx) < 85 && Math.abs(mw.y - c.ly) < 16) {
            goToPreset(c.preset);
            return;
          }
        }
      }
      if (enterMicroAtMacroPoint(mw.x, mw.y, 28)) return;
      return;
    }

    // 2. 顯微視角：先檢查是否處於臨床中風血管點擊模式
    const uw = screenToMicro(sx, sy);
    const sc = state.currentScene;
    if (!sc) return;

    if (sim.interactionMode === 'ischemic' || sim.interactionMode === 'hemorrhage') {
      for (const v of sc.vessels) {
        const nr = U.nearestOnPolyline(v.pts, v.cum, uw.x, uw.y);
        if (nr.d < v.R + 45) {
          const P = U.pointAtS(v.pts, v.cum, nr.s);
          if (sim.interactionMode === 'ischemic') {
            v.clot = v.clot ? null : { s: nr.s, x: P.x, y: P.y };
            setStatus('🩸 <b>缺血性血管栓塞</b>：紅血球受阻停滯，鄰近神經元 ATP 開始下降並出現缺氧異常放電！');
          } else {
            v.hem = v.hem ? null : { s: nr.s, x: P.x, y: P.y };
            setStatus('💥 <b>出血性血管破裂</b>：血液外滲並釋放大量興奮毒性麩胺酸（橘紅微粒），微膠細胞正趕往清除！');
          }
          setPathologyMode('stimulate');
          return;
        }
      }
      setStatus('🩸 請點擊畫面中的<b>紅色微血管</b>以觸發血管栓塞或破裂！');
      return;
    }

    // 3. 一般顯微互動：點選神經元觸發跨細胞級聯擴散，或點選膠細胞／血管／突觸查看說明
    const hitPad = Math.max(4, 10 / Math.max(0.6, microZoom()));
    const picked = pickMicroObject(uw.x, uw.y, hitPad);
    if (picked) {
      showInspector(picked);
      if (picked.neuron) {
        triggerUserNeuronCascade(picked.neuron);
      } else {
        setStatus(`🔎 已選取「<b>${picked.title}</b>」— ${picked.desc}`);
      }
    } else {
      hideInspector();
    }
  }

  /* ---------------- 小地圖點擊導覽 ---------------- */
  if (miniCanvas) {
    miniCanvas.addEventListener('click', (e) => {
      const rect = miniCanvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 740;
      const my = ((e.clientY - rect.top) / rect.height - 0.5) * 560;
      const reg = M.getRegionAt(mx, my, state.plane);
      if (reg > 0) {
        enterMicroAtMacroPoint(mx, my, Math.max(28, state.cam.targetZoom));
      }
    });
  }

  function drawMinimap() {
    if (!mctx || !miniCanvas) return;
    const wrap = document.getElementById('minimap-wrap');
    if (!isMicroActive()) {
      if (wrap) wrap.classList.remove('visible');
      return;
    }
    if (wrap) wrap.classList.add('visible');

    const mw = miniCanvas.width, mh = miniCanvas.height;
    mctx.clearRect(0, 0, mw, mh);
    mctx.fillStyle = '#f8eed5';
    mctx.fillRect(0, 0, mw, mh);

    mctx.save();
    mctx.translate(mw / 2, mh / 2);
    mctx.scale(mw / 740, mh / 560);
    M.draw(mctx, {
      plane: state.plane,
      stain: state.stain,
      showLabels: false,
      activeSample: state.sample,
      zoom: 1.5
    });
    mctx.restore();
  }

  /* ---------------- UI 按鈕與快捷鍵綁定 ---------------- */
  function syncToggleButtons() {
    const btnLbl = document.getElementById('btn-toggle-labels');
    const btnSig = document.getElementById('btn-toggle-signals');
    const btnAuto = document.getElementById('btn-toggle-spont');
    const btnSlow = document.getElementById('btn-toggle-slow');

    if (btnLbl) {
      btnLbl.classList.toggle('active', state.showLabels);
      btnLbl.innerHTML = state.showLabels ? '🏷️ 標籤：開' : '🏷️ 標籤：關';
    }
    if (btnSig) {
      btnSig.classList.toggle('active', state.showSignals);
      btnSig.innerHTML = state.showSignals ? '⚡ 訊號：開' : '⚡ 訊號：關';
    }
    if (btnAuto) {
      btnAuto.classList.toggle('active', sim.spontaneous);
      btnAuto.innerHTML = sim.spontaneous ? '🔄 自發：開' : '🔄 自發：靜止';
    }
    if (btnSlow) {
      const isSlow = sim.speed < 0.6;
      btnSlow.classList.toggle('active', isSlow);
      btnSlow.innerHTML = isSlow ? '🐢 0.35x' : '⏱️ 1.0x';
    }
  }

  function syncPlaneButtons() {
    document.querySelectorAll('[data-plane]').forEach((b) => {
      b.classList.toggle('active', b.dataset.plane === state.plane);
    });
  }

  document.getElementById('btn-toggle-labels').addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    syncToggleButtons();
    setStatus(state.showLabels ? '🏷️ 已開啟解剖與細胞結構引線標籤（快捷鍵 L）。' : '🏷️ 已隱藏文字標籤，可純粹欣賞教科書解剖手繪插圖（快捷鍵 L）。');
  });

  document.getElementById('btn-toggle-signals').addEventListener('click', () => {
    state.showSignals = !state.showSignals;
    sim.enabled = state.showSignals;
    syncToggleButtons();
    setStatus(state.showSignals ? '⚡ 已開啟神經訊號傳導與突觸級聯動畫（快捷鍵 S）。' : '⚡ 已暫停訊號傳導顯示，呈現靜態解剖組織插圖（快捷鍵 S）。');
  });

  document.getElementById('btn-toggle-spont').addEventListener('click', () => {
    sim.spontaneous = !sim.spontaneous;
    syncToggleButtons();
    setStatus(sim.spontaneous
      ? '🔄 已恢復背景生理自發放電。'
      : '🎯 已關閉背景自發放電：網路進入安靜待命狀態，現在<b>點擊任一神經元</b>即可觀察純粹由該細胞引發的跨細胞擴散波！');
  });

  document.getElementById('btn-toggle-slow').addEventListener('click', () => {
    sim.speed = sim.speed < 0.6 ? 1.0 : 0.35;
    syncToggleButtons();
    setStatus(sim.speed < 0.6
      ? '🐢 已切換為 <b>0.35x 慢動作模式</b>：可仔細觀察蘭氏結跳躍傳導、突觸囊泡釋放與樹突 EPSP 向胞體匯聚！'
      : '⏱️ 已恢復 1.0x 標準傳導觀察速度。');
  });

  document.getElementById('btn-resample').addEventListener('click', () => {
    if (!isMicroActive()) {
      enterMicroAtMacroPoint(state.sample.x, state.sample.y, 28);
      return;
    }
    loadSceneForSample(state.sample, Math.floor(Math.random() * 100000) + 1);
    setStatus('🎲 已重新抽樣此腦區的局部神經元與血管微環境構圖！');
  });

  document.querySelectorAll('[data-plane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.plane = btn.dataset.plane;
      syncPlaneButtons();
      if (isMicroActive()) {
        state.sample.plane = state.plane;
        state.sample.reg = M.getRegionAt(state.sample.x, state.sample.y, state.plane) || 2;
        loadSceneForSample(state.sample);
      }
      setStatus(state.plane === 'anterior'
        ? '🧠 已切換冠狀切面至「<b>前連合層面</b>」（含尾狀核、殼核、蒼白球、前連合）。'
        : '🧠 已切換冠狀切面至「<b>視丘與海馬迴層面</b>」（含深部視丘核團與顳葉海馬迴 CA 錐體層）。');
    });
  });

  document.querySelectorAll('[data-stain]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-stain]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.stain = btn.dataset.stain;
      setStatus(state.stain === 'natural'
        ? '🎨 已切換為「<b>經典教科書插畫配色</b>」（暖羊皮紙底與手繪墨線立體著色）。'
        : '🎨 已切換為「<b>Nissl + LFB 組織學染色對比</b>」。');
    });
  });

  // 細胞種類高光複選
  const hlBoxes = document.querySelectorAll('[data-highlight]');
  const btnClearHl = document.getElementById('clear-highlight-btn');
  function syncHighlights() {
    hlBoxes.forEach((cb) => {
      cb.checked = state.highlights.has(cb.dataset.highlight);
      cb.closest('.legend-item').classList.toggle('selected', cb.checked);
    });
    if (btnClearHl) btnClearHl.disabled = state.highlights.size === 0;
  }
  hlBoxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.highlights.add(cb.dataset.highlight);
      else state.highlights.delete(cb.dataset.highlight);
      syncHighlights();
    });
  });
  if (btnClearHl) {
    btnClearHl.addEventListener('click', () => {
      state.highlights.clear();
      syncHighlights();
    });
  }

  // 生理與臨床病理控制（整合自 brain_cells）
  document.getElementById('btn-sleep').addEventListener('click', (e) => {
    sim.isSleeping = !sim.isSleeping;
    e.currentTarget.classList.toggle('active', sim.isSleeping);
    e.currentTarget.innerHTML = sim.isSleeping ? '☀️ 喚醒大腦（結束排毒）' : '🌙 深度睡眠（類淋巴排毒）';
    setStatus(sim.isSleeping
      ? '🌙 <b>深度睡眠啟動</b>：綠色星形膠細胞收縮打開細胞間隙，腦脊髓液（藍流線）與室管膜纖毛加速沖刷紫色腺苷與類澱粉蛋白斑塊！'
      : '☀️ <b>清醒模式</b>：星形膠細胞終足恢復緊密包覆微血管，支援高頻突觸傳導。');
  });

  document.getElementById('btn-exercise').addEventListener('click', (e) => {
    sim.isExercising = !sim.isExercising;
    e.currentTarget.classList.toggle('active', sim.isExercising);
    setStatus(sim.isExercising
      ? '🏃 <b>有氧運動模式</b>：微血管紅血球流速加快並提升 <b>BDNF 神經滋養因子</b>，強化突觸傳遞效率使級聯擴散更容易跨過閾值！'
      : '🏃 已結束有氧運動加成，BDNF 逐漸回歸基準值。');
  });

  document.getElementById('btn-caffeine').addEventListener('click', () => {
    sim.caffeineTimer = 25;
    setStatus('☕ <b>咖啡因競爭性拮抗</b>：藍色虛線環標示腺苷受體被暫時阻斷，消除疲勞抑制、提升放電靈敏度（但底層紫色腺苷睡眠債仍持續累積）。');
  });

  document.getElementById('btn-learn').addEventListener('click', () => {
    if (!isMicroActive()) goToPreset('cortex');
    sim.learningTimer = 4.5;
    setStatus('⚡ <b>同步激發學習（Hebbian LTP）</b>：高頻率共同放電正強化突觸權重（長時程增益），使後續點擊單一神經元更容易引發跨多階細胞的連鎖擴散！');
  });

  const sliderDat = document.getElementById('slider-dat');
  const lblDat = document.getElementById('lbl-dat');
  if (sliderDat) {
    sliderDat.addEventListener('input', () => {
      sim.datRate = parseFloat(sliderDat.value);
      if (sim.datRate > 1.65) {
        lblDat.textContent = `過快回收 (${sim.datRate.toFixed(1)}x)`;
        lblDat.style.color = '#c62828';
        setStatus('⚠️ <b>ADHD 高回收模擬</b>：前膜轉運體過快抽離突觸間隙傳導物質，導致下游 EPSP 減弱、訊號擴散容易中斷（可點「🔍 突觸特寫」觀察）。');
      } else if (sim.datRate < 0.7) {
        lblDat.textContent = `延長滯留 (${sim.datRate.toFixed(1)}x)`;
        lblDat.style.color = '#2e7d32';
      } else {
        lblDat.textContent = `正常 (1.0x)`;
        lblDat.style.color = '#3e2723';
      }
    });
  }

  function setPathologyMode(mode) {
    sim.interactionMode = sim.interactionMode === mode ? 'stimulate' : mode;
    document.getElementById('btn-ischemic').classList.toggle('active', sim.interactionMode === 'ischemic');
    document.getElementById('btn-hemorrhage').classList.toggle('active', sim.interactionMode === 'hemorrhage');
    if (sim.interactionMode !== 'stimulate') {
      if (!isMicroActive()) goToPreset('cortex');
      setStatus('🩸 請直接點擊畫面中的<b>紅色微血管</b>以模擬血栓栓塞或血管破裂出血！');
    }
  }
  document.getElementById('btn-ischemic').addEventListener('click', () => setPathologyMode('ischemic'));
  document.getElementById('btn-hemorrhage').addEventListener('click', () => setPathologyMode('hemorrhage'));

  document.getElementById('btn-plaque').addEventListener('click', () => {
    if (!isMicroActive()) goToPreset('cortex');
    const sc = state.currentScene;
    for (let i = 0; i < 28; i++) {
      const wx = (Math.random() - 0.5) * 1100;
      const wy = (Math.random() - 0.5) * 700;
      if (sc && sc.archY && wy < sc.archY(wx) + 50) continue;
      sim.wastes.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, type: 'amyloid' });
    }
    setStatus('🧪 <b>類澱粉蛋白斑塊堆積</b>：深酒紅色<b>微膠細胞</b>已啟動趨化吞噬，亦可開啟「🌙 深度睡眠」透過腦脊髓液沖刷清除！');
  });

  document.getElementById('btn-repair').addEventListener('click', () => {
    const sc = state.currentScene;
    if (sc) {
      for (const v of sc.vessels) { v.clot = null; v.hem = null; }
      for (const n of sc.neurons) { n.atp = 100; n.health = 100; }
    }
    sim.wastes.length = 0;
    setPathologyMode('stimulate');
    setStatus('✨ <b>組織修復完成</b>：已清除所有血管栓塞、出血與代謝斑塊，神經元能量恢復 100%。');
  });

  // 預設區域按鈕與對數縮放滑桿
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => goToPreset(btn.dataset.preset));
  });

  if (elZoomSlider) {
    elZoomSlider.addEventListener('input', () => {
      const ratio = parseFloat(elZoomSlider.value) / 100;
      const z = MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, ratio);
      if (state.cam.targetZoom < 12.5 && z >= 12.5) {
        loadSceneForSample(state.sample);
        state.cam.targetMX = state.sample.x;
        state.cam.targetMY = state.sample.y;
      }
      state.cam.targetZoom = z;
    });
  }

  // 左右面板收合控制
  document.getElementById('btn-collapse-left').addEventListener('click', () => {
    document.getElementById('left-drawer').classList.toggle('collapsed');
  });
  document.getElementById('btn-collapse-right').addEventListener('click', () => {
    document.getElementById('right-drawer').classList.toggle('collapsed');
  });

  // 鍵盤快捷鍵
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'l' || e.key === 'L') document.getElementById('btn-toggle-labels').click();
    else if (e.key === 's' || e.key === 'S') document.getElementById('btn-toggle-signals').click();
    else if (e.key === 'a' || e.key === 'A') document.getElementById('btn-toggle-spont').click();
    else if (e.key === 'Escape') {
      if (state.selected) hideInspector();
      else if (isMicroActive()) goToPreset('macro');
    }
  });

  loadSceneForSample(state.sample);
  syncToggleButtons();
  syncPlaneButtons();

  // 支援從網址參數（例如由 brain_cells 跳轉 ?preset=cortex）直接開啟指定腦區
  const initPreset = new URLSearchParams(window.location.search).get('preset');
  if (initPreset && PRESETS[initPreset]) {
    goToPreset(initPreset);
  }

  /* ---------------- 比例尺繪製 ---------------- */
  function drawScaleBar(ctx) {
    ctx.save();
    let worldPerUm, unitLabel;
    let pxPerUnit;
    if (!isMicroActive()) {
      // 全腦寬度約 140 mm ≈ 670 macro units => 1 mm ≈ 4.78 macro units
      pxPerUnit = macroScale() * 4.78; // px per mm
      const targetMm = U.niceNumber(95 / pxPerUnit);
      const barPx = targetMm * pxPerUnit;
      unitLabel = `${targetMm} mm`;
      drawBarGraphic(ctx, barPx, unitLabel);
    } else {
      // 顯微圖版：錐體細胞胞體直徑 ~22 μm ≈ 34 micro units => 1 μm ≈ 1.55 micro units
      worldPerUm = 1.55;
      pxPerUnit = microFitScale() * worldPerUm; // px per μm
      const targetUm = U.niceNumber(95 / pxPerUnit);
      const barPx = targetUm * pxPerUnit;
      unitLabel = targetUm >= 1000 ? `${(targetUm / 1000).toFixed(1)} mm` : `${targetUm} μm`;
      drawBarGraphic(ctx, barPx, unitLabel);
    }
    ctx.restore();
  }

  function drawBarGraphic(ctx, barPx, label) {
    const x1 = width - 22;
    const x0 = x1 - barPx;
    const y = height - 48;

    ctx.fillStyle = 'rgba(255, 251, 240, 0.88)';
    ctx.strokeStyle = '#24180f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0 - 10, y - 20, barPx + 20, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#24180f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y - 4); ctx.lineTo(x0, y + 2);
    ctx.moveTo(x0, y + 2); ctx.lineTo(x1, y + 2);
    ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 2);
    ctx.stroke();

    ctx.fillStyle = '#24180f';
    ctx.font = '700 11px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x0 + x1) * 0.5, y - 6);
  }

  /* ---------------- 更新 HUD 生理指標 ---------------- */
  const elAtp = document.getElementById('val-atp');
  const elAdeno = document.getElementById('val-adeno');
  const elWaste = document.getElementById('val-waste');
  const elWave = document.getElementById('val-wave');

  function updateHUD() {
    const z = state.cam.zoom;
    elZoomVal.textContent = `${z < 10 ? z.toFixed(1) : Math.round(z)}x`;

    const sc = state.currentScene;
    if (!isMicroActive()) {
      elScaleBadge.textContent = '巨觀冠狀解剖視野';
      const r = state.hoverReg || M.getRegionAt(state.cam.mx, state.cam.my, state.plane);
      elRegionName.textContent = M.REGION_LABELS[r] || '全腦冠狀切面（點擊腦區放大）';
    } else {
      const mz = microZoom();
      elScaleBadge.textContent = mz > 2.2 ? '超微突觸與樹突棘視野' : '教科書細胞組織插畫視野';
      elRegionName.textContent = sc ? `${sc.info.regionName} · ${sc.info.title}` : '';
    }

    if (elZoomSlider) {
      const ratio = Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
      elZoomSlider.value = Math.round(ratio * 100);
    }

    if (sc && sc.real.length) {
      const avgAtp = sc.real.reduce((s, n) => s + n.atp, 0) / sc.real.length;
      if (elAtp) elAtp.textContent = `${Math.round(avgAtp)}%`;
      const adeno = sim.wastes.filter((w) => w.type === 'adenosine').length;
      const adPct = Math.min(100, Math.round((adeno / 80) * 100));
      if (elAdeno) elAdeno.textContent = sim.caffeineTimer > 0 ? `${adPct}% (阻斷)` : `${adPct}%`;
      const plaque = sim.wastes.filter((w) => w.type !== 'adenosine').length;
      if (elWaste) elWaste.textContent = `${Math.min(100, Math.round((plaque / 50) * 100))}%`;
      if (elWave) {
        if (sim.activeWave) {
          const cnt = sim.activeWave.recruited.size;
          elWave.textContent = `${cnt}/${sc.real.length} 細胞 (G${sim.activeWave.maxGen})`;
        } else {
          elWave.textContent = `點擊神經元測試`;
        }
      }
    }

    // 浮動資訊卡片跟隨選取目標
    if (state.selected && isMicroActive() && elInspector) {
      const sp = microToScreen(state.selected.x, state.selected.y);
      const cw = 280;
      const ch = elInspector.offsetHeight || 130;
      const left = U.clamp(sp.x + 22, 14, width - cw - 14);
      const top = U.clamp(sp.y - ch * 0.5, 76, height - ch - 52);
      elInspector.style.left = `${left}px`;
      elInspector.style.top = `${top}px`;
    }
  }

  /* ---------------- 主動畫與雙尺度無縫渲染迴圈 ---------------- */
  let lastNow = performance.now();
  function frame(now) {
    const rawDt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;

    // 攝影機平滑阻尼插值
    const k = 0.16;
    state.cam.zoom += (state.cam.targetZoom - state.cam.zoom) * k;
    state.cam.mx += (state.cam.targetMX - state.cam.mx) * k;
    state.cam.my += (state.cam.targetMY - state.cam.my) * k;
    state.cam.ux += (state.cam.targetUX - state.cam.ux) * k;
    state.cam.uy += (state.cam.targetUY - state.cam.uy) * k;

    if (state.currentScene) {
      Sim.step(sim, state.currentScene, rawDt);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 經典解剖圖鑑暖米白羊皮紙背景
    const pageGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 60, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    if (state.stain === 'nissl') {
      pageGrad.addColorStop(0, '#f4f6fb');
      pageGrad.addColorStop(1, '#dce3f0');
    } else {
      pageGrad.addColorStop(0, '#fdf7e7');
      pageGrad.addColorStop(1, '#eadab8');
    }
    ctx.fillStyle = pageGrad;
    ctx.fillRect(0, 0, width, height);

    const z = state.cam.zoom;
    const macroAlpha = 1 - U.smoothstep(9.0, 16.5, z);
    const microAlpha = U.smoothstep(8.5, 15.5, z);

    // 1. 巨觀全腦冠狀切面層
    if (macroAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = macroAlpha;
      const ms = macroScale();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(ms, ms);
      ctx.translate(-state.cam.mx, -state.cam.my);
      M.draw(ctx, {
        plane: state.plane,
        stain: state.stain,
        showLabels: state.showLabels,
        hoverWorld: state.hoverMacro,
        hoverReg: state.hoverReg,
        activeSample: state.sample,
        zoom: z
      });
      ctx.restore();
    }

    // 2. 顯微教科書細胞插畫圖版層
    if (microAlpha > 0.01 && state.currentScene) {
      ctx.save();
      ctx.globalAlpha = microAlpha;
      const us = microFitScale();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(us, us);
      ctx.translate(-state.cam.ux, -state.cam.uy);
      R.drawMicroScene(ctx, state.currentScene, sim, {
        microZoom: microZoom(),
        stain: state.stain,
        showSignals: state.showSignals,
        highlights: state.highlights,
        selected: state.selected
      });
      ctx.restore();

      // 螢幕空間清晰引線標籤與擴散代數標記
      if (microAlpha > 0.65) {
        R.drawMicroLabelsScreen(ctx, state.currentScene, sim, microToScreen, width, height, microZoom(), state.showLabels, safeHorizontalSpan());
      }
    }

    drawScaleBar(ctx);
    ctx.restore();

    drawMinimap();
    updateHUD();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

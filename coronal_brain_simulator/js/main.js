/* =========================================================================
 * main.js — 多尺度互動控制器、UI 狀態切換、iPad 觸控支援與主迴圈
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, M = BS.macro, S = BS.scene, Sim = BS.sim, R = BS.render;

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimap');
  const mctx = miniCanvas ? miniCanvas.getContext('2d') : null;
  const diagCanvas = document.getElementById('plane-diagram');
  const dctx = diagCanvas ? diagCanvas.getContext('2d') : null;

  let width = 0, height = 0, dpr = 1;
  let inspectorH = 150, inspectorW = 256, inspectorManualPos = null;
  let lastInspX = -1, lastInspY = -1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    lastInspX = -1;
    lastInspY = -1;
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  // 防止 iPadOS / iOS Safari 原生頁面雙指縮放與雙擊放大
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('dblclick', (e) => e.preventDefault());

  /* ---------------- 核心應用狀態 ---------------- */
  const MIN_ZOOM = 0.85;
  const MAX_ZOOM = 320;
  const MICRO_BASE_ZOOM = 26;
  const ALL_HIGHLIGHT_KEYS = ['neuron', 'oligodendrocyte', 'astrocyte', 'microglia', 'ependyma', 'capillary'];

  const state = {
    plane: 'anterior',
    stain: 'natural',
    showLabels: true,
    showSignals: true,
    highlights: new Set(ALL_HIGHLIGHT_KEYS),
    focusedCell: null,
    activePreset: 'macro',

    cam: {
      zoom: 1.0, targetZoom: 1.0,
      mx: 0, my: 8, targetMX: 0, targetMY: 8,
      ux: 0, uy: 0, targetUX: 0, targetUY: 0
    },

    sample: { x: -195, y: -155, reg: 2, plane: 'anterior' },
    hoverMacro: null,
    hoverReg: 0,
    sceneCache: new Map(),
    currentScene: null,
    selected: null
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
      const info = S.typeForRegion(reg, sample.x, sample.y, sample.plane) || { type: 'cortex_anterior', regionName: '大腦皮質' };
      const seed = Math.abs((Math.round(sample.x * 131) ^ Math.round(sample.y * 977) ^ (reg * 7919) ^ (forceNewSeed || 0)) | 0) + 17;
      sc = S.generate(info, seed);
      state.sceneCache.set(key, sc);
    }
    if (state.currentScene !== sc) {
      state.currentScene = sc;
      state.selected = null;
      state.focusedCell = null;
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
    const availW = Math.max(320, span.right - span.left);
    const availH = Math.max(260, height - 165);
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

  function getVesselBBox(v) {
    if (v._bbox) return v._bbox;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of v.pts) {
      if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y;
    }
    const pad = v.R + 18;
    v._bbox = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
    return v._bbox;
  }

  function pickMicroObject(wx, wy, hitPad) {
    const sc = state.currentScene;
    if (!sc) return null;

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
        id: bestNeuron.id,
        neuron: bestNeuron,
        entity: bestNeuron,
        bbox: bestNeuron.bbox,
        title: bestNeuron.kindInfo.title,
        sub: bestNeuron.kindInfo.en,
        color: bestNeuron.excit ? '#f4d06a' : '#c7aee8',
        desc: CELL_DESCRIPTIONS.neuron(bestNeuron),
        x: bestNeuron.x, y: bestNeuron.y, r: bestNeuron.r
      };
    }

    for (const o of sc.oligos) {
      if (U.dist(wx, wy, o.x, o.y) <= o.r + 6 + hitPad) {
        return {
          kind: 'oligodendrocyte', id: o.id, entity: o,
          title: '寡突膠質細胞', sub: 'Oligodendrocyte',
          bbox: o.bbox,
          color: '#93d3f3', desc: CELL_DESCRIPTIONS.oligodendrocyte,
          x: o.x, y: o.y, r: o.r
        };
      }
    }

    for (const a of sc.astros) {
      if (U.dist(wx, wy, a.x, a.y) <= a.r + 6 + hitPad) {
        return {
          kind: 'astrocyte', id: a.id, entity: a,
          title: '星形膠質細胞', sub: 'Astrocyte',
          bbox: a.bbox,
          color: '#9fcf63', desc: CELL_DESCRIPTIONS.astrocyte,
          x: a.x, y: a.y, r: a.r
        };
      }
    }

    for (const m of sc.micro) {
      if (U.dist(wx, wy, m.x, m.y) <= 18 + hitPad) {
        return {
          kind: 'microglia', id: m.id, entity: m,
          title: '微膠細胞', sub: 'Microglia',
          bbox: { x0: m.x - m.rad, y0: m.y - m.rad, x1: m.x + m.rad, y1: m.y + m.rad },
          color: '#a9343f', desc: CELL_DESCRIPTIONS.microglia,
          x: m.x, y: m.y, r: 15
        };
      }
    }

    for (const e of sc.epend) {
      if (U.dist(wx, wy, e.x, e.y) <= 19 + hitPad) {
        return {
          kind: 'ependyma', id: e.id, entity: e,
          title: '室管膜細胞', sub: 'Ependymal Cell',
          bbox: e.bbox,
          color: '#f3a5b3', desc: CELL_DESCRIPTIONS.ependyma,
          x: e.x, y: e.y, r: 16
        };
      }
    }

    for (const v of sc.vessels) {
      const nr = U.nearestOnPolyline(v.pts, v.cum, wx, wy);
      if (nr.d <= v.R + 6 + hitPad) {
        const P = U.pointAtS(v.pts, v.cum, nr.s);
        return {
          kind: 'capillary', id: v.id, vessel: v, entity: v, vesselS: nr.s,
          bbox: getVesselBBox(v),
          title: '腦微血管與紅血球', sub: 'Cerebral Capillary & RBCs',
          color: '#de5b4b', desc: CELL_DESCRIPTIONS.capillary,
          x: P.x, y: P.y, r: v.R + 4
        };
      }
    }

    for (const o of sc.oligos) {
      if (ctx.isPointInPath(o.body, wx, wy)) {
        return {
          kind: 'oligodendrocyte', id: o.id, entity: o,
          title: '有髓鞘節段（寡突膠細胞包覆）', sub: 'Myelin Internode',
          bbox: o.bbox,
          color: '#93d3f3', desc: CELL_DESCRIPTIONS.oligodendrocyte,
          x: o.x, y: o.y, r: o.r
        };
      }
    }

    for (const a of sc.astros) {
      if (ctx.isPointInPath(a.body, wx, wy)) {
        return {
          kind: 'astrocyte', id: a.id, entity: a,
          title: '星形膠質細胞', sub: 'Astrocyte',
          bbox: a.bbox,
          color: '#9fcf63', desc: CELL_DESCRIPTIONS.astrocyte,
          x: a.x, y: a.y, r: a.r
        };
      }
    }

    for (const m of sc.micro) {
      const dx = wx - m.x, dy = wy - m.y;
      if (dx * dx + dy * dy <= m.rad * m.rad) {
        const cs = Math.cos(-m.rot), sn = Math.sin(-m.rot);
        if (ctx.isPointInPath(m.body, dx * cs - dy * sn, dx * sn + dy * cs)) {
          return {
            kind: 'microglia', id: m.id, entity: m,
            title: '微膠細胞', sub: 'Microglia',
            bbox: { x0: m.x - m.rad, y0: m.y - m.rad, x1: m.x + m.rad, y1: m.y + m.rad },
            color: '#a9343f', desc: CELL_DESCRIPTIONS.microglia,
            x: m.x, y: m.y, r: 15
          };
        }
      }
    }

    for (const e of sc.epend) {
      const dx = wx - e.x, dy = wy - e.y;
      const cs = Math.cos(-e.rot), sn = Math.sin(-e.rot);
      if (ctx.isPointInPath(e.body, dx * cs - dy * sn, dx * sn + dy * cs)) {
        return {
          kind: 'ependyma', id: e.id, entity: e,
          title: '室管膜細胞', sub: 'Ependymal Cell',
          bbox: e.bbox,
          color: '#f3a5b3', desc: CELL_DESCRIPTIONS.ependyma,
          x: e.x, y: e.y, r: 16
        };
      }
    }

    for (const n of sc.real) {
      if (ctx.isPointInPath(n.body, wx, wy)) {
        return {
          kind: 'neuron', id: n.id, neuron: n, entity: n,
          bbox: n.bbox,
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
  const elCiHighlightBtn = document.getElementById('ci-highlight-btn');
  const elCiFireBtn = document.getElementById('ci-fire-btn');

  function setStatus(html) {
    if (elStatusMsg) elStatusMsg.innerHTML = html;
  }

  const HIGHLIGHT_BTN_LABEL = {
    neuron: '此神經元',
    oligodendrocyte: '此寡突膠質細胞',
    astrocyte: '此星形膠質細胞',
    microglia: '此微膠細胞',
    ependyma: '此室管膜細胞',
    capillary: '此微血管'
  };

  function isSameFocused(sel) {
    return !!(sel && state.focusedCell && state.focusedCell.kind === sel.kind && state.focusedCell.id === sel.id);
  }

  function syncInspectorHighlightBtn() {
    if (!elCiHighlightBtn) return;
    const sel = state.selected;
    const suffix = sel && sel.id != null ? HIGHLIGHT_BTN_LABEL[sel.kind] : null;
    if (!suffix) {
      elCiHighlightBtn.style.display = 'none';
    } else {
      elCiHighlightBtn.style.display = 'inline-flex';
      const isFocused = isSameFocused(sel);
      elCiHighlightBtn.classList.toggle('active', isFocused);
      elCiHighlightBtn.textContent = isFocused ? '取消單獨 highlight' : `單獨 highlight ${suffix}`;
    }
    if (elInspector && elInspector.classList.contains('visible')) {
      inspectorW = elInspector.offsetWidth || inspectorW;
      inspectorH = elInspector.offsetHeight || inspectorH;
      lastInspX = -1;
      lastInspY = -1;
    }
  }

  function showInspector(sel) {
    state.selected = sel;
    if (!sel || !elInspector) return;
    const sc = state.currentScene;
    inspectorManualPos = null;
    elCiSwatch.style.background = sel.color;
    elCiTitle.textContent = `${sel.title}`;
    elCiRegion.textContent = `${sc ? sc.info.regionName : ''} · ${sel.sub}`;
    elCiDesc.textContent = sel.desc;
    if (elCiFireBtn) {
      elCiFireBtn.style.display = sel.neuron ? 'inline-flex' : 'none';
    }
    elInspector.classList.add('visible');
    syncInspectorHighlightBtn();
    inspectorW = elInspector.offsetWidth || 256;
    inspectorH = elInspector.offsetHeight || 150;
    lastInspX = -1;
    lastInspY = -1;
  }

  function hideInspector() {
    state.selected = null;
    inspectorManualPos = null;
    if (elInspector) elInspector.classList.remove('visible');
  }

  // 支援使用者直接拖曳浮動圖鑑卡標題列微調位置
  const elCiHead = elInspector ? elInspector.querySelector('.ci-head') : null;
  if (elCiHead) {
    let dragCard = null;
    elCiHead.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest('#ci-close')) return;
      e.preventDefault();
      e.stopPropagation();
      const baseX = lastInspX >= 0 ? lastInspX : Math.round(elInspector.getBoundingClientRect().left);
      const baseY = lastInspY >= 0 ? lastInspY : Math.round(elInspector.getBoundingClientRect().top);
      dragCard = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: baseX, by: baseY };
      try { elCiHead.setPointerCapture(e.pointerId); } catch (_) {}
    });
    elCiHead.addEventListener('pointermove', (e) => {
      if (!dragCard || e.pointerId !== dragCard.id) return;
      const cw = inspectorW || 256;
      const ch = inspectorH || 150;
      const nx = Math.round(U.clamp(dragCard.bx + (e.clientX - dragCard.sx), 10, width - cw - 10));
      const ny = Math.round(U.clamp(dragCard.by + (e.clientY - dragCard.sy), 72, height - ch - 46));
      inspectorManualPos = { x: nx, y: ny };
      lastInspX = nx;
      lastInspY = ny;
      elInspector.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
    });
    const endCardDrag = (e) => {
      if (dragCard && e.pointerId === dragCard.id) dragCard = null;
    };
    elCiHead.addEventListener('pointerup', endCardDrag);
    elCiHead.addEventListener('pointercancel', endCardDrag);
  }

  document.getElementById('ci-close').addEventListener('click', hideInspector);
  if (elCiHighlightBtn) {
    elCiHighlightBtn.addEventListener('click', () => {
      const sel = state.selected;
      if (!sel || sel.id == null || !HIGHLIGHT_BTN_LABEL[sel.kind]) return;
      inspectorManualPos = null;
      lastInspX = -1;
      lastInspY = -1;
      if (isSameFocused(sel)) {
        state.focusedCell = null;
        setStatus('已取消單獨 highlight，恢復完整顯微細胞網路顯示。');
      } else {
        state.focusedCell = { kind: sel.kind, id: sel.id };
        if (!state.highlights.has(sel.kind)) {
          state.highlights.add(sel.kind);
          syncHighlights();
        }
        setStatus(sel.kind === 'neuron'
          ? `已單獨 highlight「<b>${sel.title}</b>」：可完整追蹤此細胞的胞體、樹突、軸突與側枝分佈（按 Esc 或再次點擊可恢復）。`
          : `已單獨 highlight「<b>${sel.title}</b>」：其餘細胞已淡化，可清楚追蹤完整構造與分佈（按 Esc 或再次點擊可恢復）。`);
      }
      syncInspectorHighlightBtn();
    });
  }
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
    lastStatsAt = -1000;
    setStatus(`已刺激「<b>${n.kindInfo.title}</b>」產生動作電位：訊號沿軸突與側枝跳躍傳導並擴散至下游細胞（<b>快速連點同一細胞</b>可體驗時間總和）。`);
  }

  sim.onSproutComplete = (pre, post) => {
    lastStatsAt = -1000;
    setStatus(`新突觸成形：「<b>${pre.kindInfo.title}</b>」已長出新側枝連接至「<b>${post.kindInfo.title}</b>」，並隨即傳出第一波動作電位！`);
  };

  /* ---------------- 飛行跳轉預設區域 ---------------- */
  const PRESETS = {
    macro:     { macro: true, x: 0,    y: 8,    zoom: 1.0,  msg: '已返回 <b>1x 全腦冠狀切面</b>：點擊任意腦區或滾輪縮放即可進入顯微細胞插畫視野。' },
    cortex:    { x: -198, y: -154, reg: 2, zoom: 28,  ux: 0, uy: 0, msg: '<b>大腦皮質深層迴路</b>：切換左側「前連合」與「視丘／海馬迴」層面，可對比前額大型錐體束與頂葉高密度顆粒星狀神經元。' },
    hippo:     { x: 108,  y: 108,  reg: 8, zoom: 28,  ux: 0, uy: 0, plane: 'hippocampus', msg: '<b>海馬迴 CA 錐體細胞層</b>：已切換至視丘／海馬迴層面，錐體細胞成帶排列，點選細胞可觀察訊號沿側枝橫向擴散。' },
    striatum:  { x: -120, y: 15,   reg: 6, zoom: 28,  ux: 0, uy: 0, plane: 'anterior', msg: '<b>基底核（紋狀體）</b>：已切換至前連合層面，可見 GABA 中型多棘神經元、大型膽鹼性中間神經元與穿越的鉛筆狀纖維束。' },
    thalamus:  { x: -34,  y: 22,   reg: 6, zoom: 28,  ux: 0, uy: 0, plane: 'hippocampus', msg: '<b>視丘中繼核團</b>：已切換至視丘／海馬迴層面，叢狀樹突視丘中繼神經元接收上行傳入纖維並向皮質投射。' },
    callosum:  { x: 0,    y: -68,  reg: 4, zoom: 28,  ux: 0, uy: 0, msg: '<b>胼胝體橫向白質束</b>：密集平行排列的有髓鞘神經纖維、蘭氏結跳躍放電與束間寡突膠質細胞。' },
    capsule:   { x: 82,   y: 12,   reg: 7, zoom: 28,  ux: 0, uy: 0, msg: '<b>內囊垂直白質通道</b>：上下行皮質脊髓與視丘皮質有髓鞘軸突束。' },
    radiata:   { x: 192,  y: -120, reg: 3, zoom: 28,  ux: 0, uy: 0, msg: '<b>中央白質（輻射冠）</b>：扇形放射走行的有髓鞘投射纖維與纖維型星形膠質細胞。' },
    ventricle: { x: -30,  y: -30,  reg: 5, zoom: 28,  ux: 0, uy: 20, msg: '<b>側腦室壁與室管膜</b>：粉紅色室管膜細胞頂端纖毛節律擺動推動腦脊髓液（開啟「深度睡眠」可觀察排毒沖刷）。' },
    synapse:   { synapseZoom: true, msg: '<b>超微突觸間隙特寫</b>：可觀察突觸前終扣內的突觸囊泡、轉運體（DAT）、擴散中的傳導物質微粒與突觸後受體結合。' }
  };

  function syncPresetButtons() {
    document.querySelectorAll('[data-preset]').forEach((b) => {
      b.classList.toggle('active', b.dataset.preset === state.activePreset);
    });
  }

  function goToPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    state.activePreset = key;
    syncPresetButtons();

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
      drawPlaneDiagram();
    }
    if (p.macro) {
      state.focusedCell = null;
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
    state.activePreset = '';
    syncPresetButtons();
    state.cam.targetMX = wx;
    state.cam.targetMY = wy;
    state.cam.targetUX = 0;
    state.cam.targetUY = 0;
    state.cam.targetZoom = targetZoom || 28;
    setStatus(`已進入「<b>${sc.info.regionName}</b>」顯微插圖視野 —— 點擊任意<b>神經元</b>可觀察動作電位擴散至其他細胞。`);
    return true;
  }

  /* ---------------- 滑鼠與 iPad 觸控手勢 ---------------- */
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
      if (!isMicroActive() && e.pointerType !== 'touch') {
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

  function clearPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinchDist = 0;
    if (pointers.size === 0) isDragging = false;
  }

  canvas.addEventListener('pointerup', (e) => {
    const tapTol = e.pointerType === 'touch' ? 14 : 6;
    const wasTap = pointers.size === 1 && isDragging && movedDist < tapTol;
    clearPointer(e);
    if (wasTap) {
      handleStageClick(e.clientX, e.clientY, e.pointerType);
    }
  });

  canvas.addEventListener('pointercancel', clearPointer);

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

  function handleStageClick(sx, sy, pointerType) {
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
      enterMicroAtMacroPoint(mw.x, mw.y, 28);
      return;
    }

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
            setStatus('<b>缺血性血管栓塞</b>：紅血球受阻停滯，鄰近神經元 ATP 開始下降並出現缺氧異常放電。');
          } else {
            v.hem = v.hem ? null : { s: nr.s, x: P.x, y: P.y };
            setStatus('<b>出血性血管破裂</b>：血液外滲並釋放大量興奮毒性麩胺酸（橘紅微粒），微膠細胞正趕往清除。');
          }
          setPathologyMode('stimulate');
          return;
        }
      }
      setStatus('請點擊畫面中的<b>紅色微血管</b>以觸發血管栓塞或破裂。');
      return;
    }

    const touchExtra = pointerType === 'touch' ? 8 : 0;
    const hitPad = Math.max(4, (10 + touchExtra) / Math.max(0.6, microZoom()));
    const picked = pickMicroObject(uw.x, uw.y, hitPad);
    if (picked) {
      showInspector(picked);
      if (picked.neuron) {
        triggerUserNeuronCascade(picked.neuron);
      } else {
        setStatus(`已選取「<b>${picked.title}</b>」— ${picked.desc}`);
      }
    } else {
      hideInspector();
    }
  }

  /* ---------------- 側面切線示意圖 & 導覽小地圖 ---------------- */
  function drawPlaneDiagram() {
    if (!dctx || !diagCanvas) return;
    M.drawSagittalCutDiagram(dctx, diagCanvas.width, diagCanvas.height, state.plane, state.stain);
  }

  if (diagCanvas) {
    diagCanvas.addEventListener('click', (e) => {
      const rect = diagCanvas.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      switchPlane(rx < 0.47 ? 'anterior' : 'hippocampus');
    });
  }

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

  let lastMinimapKey = '';
  let lastMinimapVis = false;

  function drawMinimap() {
    if (!mctx || !miniCanvas) return;
    const wrap = document.getElementById('minimap-wrap');
    const vis = isMicroActive();
    if (vis !== lastMinimapVis) {
      lastMinimapVis = vis;
      if (wrap) wrap.classList.toggle('visible', vis);
    }
    if (!vis) return;

    const mmKey = `${state.plane}:${state.stain}:${Math.round(state.sample.x)}:${Math.round(state.sample.y)}`;
    if (mmKey === lastMinimapKey) return;
    lastMinimapKey = mmKey;

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

  /* ---------------- UI 按鈕、切面切換與快捷鍵綁定 ---------------- */
  function syncToggleButtons() {
    const btnLbl = document.getElementById('btn-toggle-labels');
    const btnSig = document.getElementById('btn-toggle-signals');
    const btnAuto = document.getElementById('btn-toggle-spont');
    const btnSlow = document.getElementById('btn-toggle-slow');

    if (btnLbl) {
      btnLbl.classList.toggle('active', state.showLabels);
      btnLbl.textContent = state.showLabels ? '標籤：開' : '標籤：關';
    }
    if (btnSig) {
      btnSig.classList.toggle('active', state.showSignals);
      btnSig.textContent = state.showSignals ? '訊號：開' : '訊號：關';
    }
    if (btnAuto) {
      btnAuto.classList.toggle('active', sim.spontaneous);
      btnAuto.textContent = sim.spontaneous ? '自發：開' : '自發：靜止';
    }
    if (btnSlow) {
      const isSlow = sim.speed < 0.6;
      btnSlow.classList.toggle('active', isSlow);
      btnSlow.textContent = isSlow ? '慢動作 0.35x' : '速度 1.0x';
    }
  }

  function syncPlaneButtons() {
    document.querySelectorAll('[data-plane]').forEach((b) => {
      b.classList.toggle('active', b.dataset.plane === state.plane);
    });
  }

  function switchPlane(nextPlane) {
    if (!nextPlane) return;
    state.plane = nextPlane;
    syncPlaneButtons();
    drawPlaneDiagram();

    if (isMicroActive()) {
      state.sample.plane = state.plane;
      const newReg = M.getRegionAt(state.sample.x, state.sample.y, state.plane) || 2;
      const prevReg = state.sample.reg;
      state.sample.reg = newReg;
      const sc = loadSceneForSample(state.sample);
      if (newReg !== prevReg) {
        setStatus(`切面已切換至「<b>${state.plane === 'anterior' ? '前連合層面' : '視丘／海馬迴層面'}</b>」，此座標對應解剖區變更為「<b>${sc.info.regionName}</b>」。`);
        return;
      }
      setStatus(`切面已切換至「<b>${state.plane === 'anterior' ? '前連合層面' : '視丘／海馬迴層面'}</b>」，目前顯示「<b>${sc.info.title}</b>」。`);
      return;
    }

    setStatus(state.plane === 'anterior'
      ? '已切換冠狀切面至「<b>前連合層面</b>」（含前額皮質、尾狀核、豆狀核與前連合）。'
      : '已切換冠狀切面至「<b>視丘與海馬迴層面</b>」（含頂葉皮質、深部視丘核團與海馬迴 CA 錐體層）。');
  }

  document.getElementById('btn-toggle-labels').addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    syncToggleButtons();
    setStatus(state.showLabels ? '已開啟解剖與細胞結構引線標籤（快捷鍵 L）。' : '已隱藏文字標籤，可純粹檢視解剖手繪插圖（快捷鍵 L）。');
  });

  document.getElementById('btn-toggle-signals').addEventListener('click', () => {
    state.showSignals = !state.showSignals;
    sim.enabled = state.showSignals;
    syncToggleButtons();
    setStatus(state.showSignals ? '已開啟神經訊號傳導與突觸級聯動畫（快捷鍵 S）。' : '已暫停訊號傳導顯示，呈現靜態解剖組織插圖（快捷鍵 S）。');
  });

  document.getElementById('btn-toggle-spont').addEventListener('click', () => {
    sim.spontaneous = !sim.spontaneous;
    syncToggleButtons();
    setStatus(sim.spontaneous
      ? '已恢復背景生理自發放電。'
      : '已關閉背景自發放電：網路進入靜息待命狀態，現在<b>點擊任一神經元</b>即可觀察純粹由該細胞引發的跨細胞擴散波。');
  });

  document.getElementById('btn-toggle-slow').addEventListener('click', () => {
    sim.speed = sim.speed < 0.6 ? 1.0 : 0.35;
    syncToggleButtons();
    setStatus(sim.speed < 0.6
      ? '已切換為 <b>0.35x 慢動作模式</b>：可仔細觀察蘭氏結跳躍傳導、突觸囊泡釋放與樹突 EPSP 向胞體匯聚。'
      : '已恢復 1.0x 標準傳導觀察速度。');
  });

  document.getElementById('btn-resample').addEventListener('click', () => {
    if (!isMicroActive()) {
      enterMicroAtMacroPoint(state.sample.x, state.sample.y, 28);
      return;
    }
    loadSceneForSample(state.sample, Math.floor(Math.random() * 100000) + 1);
    setStatus('已重新抽樣此腦區的局部神經元與血管微環境構圖。');
  });

  document.querySelectorAll('[data-plane]').forEach((btn) => {
    btn.addEventListener('click', () => switchPlane(btn.dataset.plane));
  });

  document.querySelectorAll('[data-stain]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-stain]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.stain = btn.dataset.stain;
      drawPlaneDiagram();
      setStatus(state.stain === 'natural'
        ? '已切換為「<b>自然手繪插畫配色</b>」（暖羊皮紙底與墨線立體著色）。'
        : '已切換為「<b>Nissl + LFB 組織學染色對比</b>」。');
    });
  });

  // 細胞顯示與 highlight 篩選（單一按鈕在「全數隱藏」與「全數選取」間 Toggle）
  const hlBoxes = document.querySelectorAll('[data-highlight]');
  const btnToggleAllHl = document.getElementById('toggle-highlight-all-btn');

  function syncHighlights() {
    hlBoxes.forEach((cb) => {
      cb.checked = state.highlights.has(cb.dataset.highlight);
      cb.closest('.legend-item').classList.toggle('selected', cb.checked);
    });
    if (btnToggleAllHl) {
      const allOn = state.highlights.size === ALL_HIGHLIGHT_KEYS.length;
      btnToggleAllHl.textContent = allOn ? '全數隱藏' : '全數選取';
      btnToggleAllHl.classList.toggle('active', !allOn && state.highlights.size === 0);
    }
  }

  hlBoxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.highlights.add(cb.dataset.highlight);
      else state.highlights.delete(cb.dataset.highlight);
      syncHighlights();
    });
  });

  if (btnToggleAllHl) {
    btnToggleAllHl.addEventListener('click', () => {
      state.focusedCell = null;
      if (state.highlights.size === ALL_HIGHLIGHT_KEYS.length) {
        state.highlights.clear();
        setStatus('已全數隱藏顯微細胞與血管圖層；可單獨勾選想觀察的細胞，或再次點擊「全數選取」。');
      } else {
        ALL_HIGHLIGHT_KEYS.forEach((k) => state.highlights.add(k));
        setStatus('已全數選取並顯示所有細胞、髓鞘與微血管圖層。');
      }
      syncHighlights();
      syncInspectorHighlightBtn();
    });
  }

  // 生理與臨床病理控制
  document.getElementById('btn-sleep').addEventListener('click', (e) => {
    sim.isSleeping = !sim.isSleeping;
    e.currentTarget.classList.toggle('active', sim.isSleeping);
    e.currentTarget.textContent = sim.isSleeping ? '喚醒大腦（結束排毒）' : '深度睡眠（類淋巴排毒）';
    setStatus(sim.isSleeping
      ? '<b>深度睡眠啟動</b>：星形膠細胞收縮打開細胞間隙，腦脊髓液與室管膜纖毛加速沖刷紫色腺苷與類澱粉蛋白斑塊。'
      : '<b>清醒模式</b>：星形膠細胞終足恢復緊密包覆微血管，支援高頻突觸傳導。');
  });

  document.getElementById('btn-exercise').addEventListener('click', (e) => {
    sim.isExercising = !sim.isExercising;
    e.currentTarget.classList.toggle('active', sim.isExercising);
    setStatus(sim.isExercising
      ? '<b>有氧運動模式</b>：微血管紅血球流速加快並提升 <b>BDNF 神經滋養因子</b>，促進突觸強化與新纖維萌芽。'
      : '已結束有氧運動加成，BDNF 逐漸回歸基準值。');
  });

  document.getElementById('btn-caffeine').addEventListener('click', () => {
    sim.caffeineTimer = 25;
    setStatus('<b>咖啡因競爭性拮抗</b>：藍色虛線環標示腺苷受體被暫時阻斷，消除疲勞抑制、提升放電靈敏度（底層紫色腺苷仍持續累積）。');
  });

  document.getElementById('btn-learn').addEventListener('click', () => {
    if (!isMicroActive()) goToPreset('cortex');
    sim.learningTimer = 4.5;
    setStatus('<b>同步激發學習（Hebbian LTP）</b>：高頻率共同放電正強化突觸受體厚度並誘導新突觸連結，後續點擊單一神經元更容易擴散至下游細胞。');
  });

  document.getElementById('btn-sprout').addEventListener('click', () => {
    if (!isMicroActive()) goToPreset('cortex');
    const pair = Sim.triggerSprout(sim, state.currentScene);
    if (pair) {
      setStatus(`<b>結構可塑性啟動</b>：觀察「<b>${pair.pre.kindInfo.title}</b>」軸突長出帶絲狀偽足的<b>生長錐（Growth Cone）</b>，正朝向「<b>${pair.post.kindInfo.title}</b>」樹突延伸並形成新突觸。`);
    } else {
      setStatus('目前局部神經元之間皆已建立突觸連結，可點擊「重抽構圖」生成新的神經迴路。');
    }
  });

  const sliderDat = document.getElementById('slider-dat');
  const lblDat = document.getElementById('lbl-dat');
  if (sliderDat) {
    sliderDat.addEventListener('input', () => {
      sim.datRate = parseFloat(sliderDat.value);
      if (sim.datRate > 1.65) {
        lblDat.textContent = `過快回收 (${sim.datRate.toFixed(1)}x)`;
        lblDat.style.color = '#c62828';
        setStatus('<b>ADHD 高回收模擬</b>：前膜轉運體過快抽離突觸間隙傳導物質，導致下游 EPSP 減弱、訊號擴散容易中斷（可點「突觸間隙特寫」觀察）。');
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
      setStatus('請直接點擊畫面中的<b>紅色微血管</b>以模擬血栓栓塞或血管破裂出血。');
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
    setStatus('<b>類澱粉蛋白斑塊堆積</b>：深酒紅色<b>微膠細胞</b>已啟動趨化吞噬，亦可開啟「深度睡眠」透過腦脊髓液沖刷清除。');
  });

  document.getElementById('btn-repair').addEventListener('click', () => {
    const sc = state.currentScene;
    if (sc) {
      for (const v of sc.vessels) { v.clot = null; v.hem = null; }
      for (const n of sc.neurons) { n.atp = 100; n.health = 100; }
    }
    sim.wastes.length = 0;
    setPathologyMode('stimulate');
    setStatus('<b>組織修復完成</b>：已清除所有血管栓塞、出血與代謝斑塊，神經元能量恢復 100%。');
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

  // 左右面板收合控制（iPad / 平板窄螢幕預設收合以保留最大化操作空間與底部導覽列）
  const leftDrawer = document.getElementById('left-drawer');
  const rightDrawer = document.getElementById('right-drawer');
  if (width <= 1080) {
    if (leftDrawer) leftDrawer.classList.add('collapsed');
    if (rightDrawer) rightDrawer.classList.add('collapsed');
  }
  document.getElementById('btn-collapse-left').addEventListener('click', () => {
    if (leftDrawer) leftDrawer.classList.toggle('collapsed');
    lastInspX = -1;
    lastInspY = -1;
  });
  document.getElementById('btn-collapse-right').addEventListener('click', () => {
    if (rightDrawer) rightDrawer.classList.toggle('collapsed');
    lastInspX = -1;
    lastInspY = -1;
  });

  // 鍵盤快捷鍵
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'l' || e.key === 'L') document.getElementById('btn-toggle-labels').click();
    else if (e.key === 's' || e.key === 'S') document.getElementById('btn-toggle-signals').click();
    else if (e.key === 'a' || e.key === 'A') document.getElementById('btn-toggle-spont').click();
    else if (e.key === 'Escape') {
      if (state.selected) hideInspector();
      else if (state.focusedCell != null) {
        state.focusedCell = null;
        syncInspectorHighlightBtn();
        setStatus('已取消單獨 highlight，恢復完整顯微細胞網路顯示。');
      }
      else if (isMicroActive()) goToPreset('macro');
    }
  });

  loadSceneForSample(state.sample);
  syncToggleButtons();
  syncPlaneButtons();
  syncHighlights();
  syncPresetButtons();
  drawPlaneDiagram();

  const initPreset = new URLSearchParams(window.location.search).get('preset');
  if (initPreset && PRESETS[initPreset]) {
    goToPreset(initPreset);
  }

  /* ---------------- 比例尺繪製 ---------------- */
  function drawScaleBar(ctx) {
    ctx.save();
    let pxPerUnit, unitLabel;
    if (!isMicroActive()) {
      pxPerUnit = macroScale() * 4.78;
      const targetMm = U.niceNumber(95 / pxPerUnit);
      unitLabel = `${targetMm} mm`;
      drawBarGraphic(ctx, targetMm * pxPerUnit, unitLabel);
    } else {
      pxPerUnit = microFitScale() * 1.55;
      const targetUm = U.niceNumber(95 / pxPerUnit);
      unitLabel = targetUm >= 1000 ? `${(targetUm / 1000).toFixed(1)} mm` : `${targetUm} μm`;
      drawBarGraphic(ctx, targetUm * pxPerUnit, unitLabel);
    }
    ctx.restore();
  }

  function drawBarGraphic(ctx, barPx, label) {
    const x1 = width - 22;
    const x0 = x1 - barPx;
    const y = width <= 1180 ? height - 92 : height - 48;

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

  /* ---------------- 更新 HUD 生理指標（固定寬度 + 節流防跳動） ---------------- */
  const elAtp = document.getElementById('val-atp');
  const elAdeno = document.getElementById('val-adeno');
  const elWaste = document.getElementById('val-waste');
  const elWave = document.getElementById('val-wave');
  const lastHud = {};
  let lastStatsAt = -1000;

  function setTextIfChanged(el, key, text) {
    if (el && lastHud[key] !== text) {
      lastHud[key] = text;
      el.textContent = text;
    }
  }

  function rectOverlapArea(a, b) {
    const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return ix * iy;
  }

  function computeInspectorPosition(sel, cw, ch) {
    if (inspectorManualPos) {
      return {
        left: Math.round(U.clamp(inspectorManualPos.x, 10, width - cw - 10)),
        top: Math.round(U.clamp(inspectorManualPos.y, 72, height - ch - 46))
      };
    }

    const span = safeHorizontalSpan();
    const safeL = Math.max(12, span.left);
    const safeR = Math.min(width - 12, span.right);
    const safeT = width <= 900 ? 124 : (width <= 1180 ? 92 : 80);
    const safeB = height - (width <= 1180 ? 118 : 98);
    const minX = safeL;
    const maxX = Math.max(safeL, safeR - cw);
    const minY = safeT;
    const maxY = Math.max(safeT, safeB - ch);

    const sp = microToScreen(sel.x, sel.y);
    const somaPad = Math.max(28, (sel.r || 14) * microFitScale() + 22);
    const somaRect = { x0: sp.x - somaPad, y0: sp.y - somaPad, x1: sp.x + somaPad, y1: sp.y + somaPad };

    let arborRect = somaRect;
    if (sel.bbox) {
      const p0 = microToScreen(sel.bbox.x0, sel.bbox.y0);
      const p1 = microToScreen(sel.bbox.x1, sel.bbox.y1);
      arborRect = { x0: p0.x - 16, y0: p0.y - 16, x1: p1.x + 16, y1: p1.y + 16 };
    }

    const minimapRect = (safeL < 160 && isMicroActive() && width > 900)
      ? { x0: 8, y0: height - 215, x1: 164, y1: height - 78 }
      : null;

    // 避開收合後的左右抽屜切換按鈕，避免卡片蓋住「切面與細胞圖例」或「生理與病理實驗」
    const btnL = document.getElementById('btn-collapse-left');
    const btnR = document.getElementById('btn-collapse-right');
    const toggleRects = [];
    if (btnL && leftDrawer && leftDrawer.classList.contains('collapsed')) {
      const r = btnL.getBoundingClientRect();
      toggleRects.push({ x0: r.left - 8, y0: r.top - 8, x1: r.right + 8, y1: r.bottom + 10 });
    }
    if (btnR && rightDrawer && rightDrawer.classList.contains('collapsed')) {
      const r = btnR.getBoundingClientRect();
      toggleRects.push({ x0: r.left - 8, y0: r.top - 8, x1: r.right + 8, y1: r.bottom + 10 });
    }
    const rightToggleDropY = toggleRects.length ? Math.max(...toggleRects.map((t) => t.y1)) : safeT;

    const cands = [
      // 安全畫布角落（含避開收合鈕下緣的角落）
      { x: minX, y: minY, isCorner: true },
      { x: minX, y: Math.max(minY, rightToggleDropY), isCorner: true },
      { x: maxX, y: minY, isCorner: true },
      { x: maxX, y: Math.max(minY, rightToggleDropY), isCorner: true },
      { x: maxX, y: maxY, isCorner: true },
      { x: minimapRect ? Math.min(maxX, Math.max(minX, 172)) : minX, y: maxY, isCorner: true },
      // arborRect 四外側
      { x: arborRect.x1 + 16, y: sp.y - ch * 0.5, isCorner: false },
      { x: arborRect.x0 - cw - 16, y: sp.y - ch * 0.5, isCorner: false },
      { x: sp.x - cw * 0.5, y: arborRect.y0 - ch - 16, isCorner: false },
      { x: sp.x - cw * 0.5, y: arborRect.y1 + 16, isCorner: false },
      // somaRect 四外側（較近的備選）
      { x: somaRect.x1 + 20, y: sp.y - ch * 0.5, isCorner: false },
      { x: somaRect.x0 - cw - 20, y: sp.y - ch * 0.5, isCorner: false },
      { x: sp.x - cw * 0.5, y: somaRect.y0 - ch - 20, isCorner: false },
      { x: sp.x - cw * 0.5, y: somaRect.y1 + 20, isCorner: false }
    ];

    const isFocused = isSameFocused(sel);
    let best = { x: maxX, y: maxY };
    let bestScore = Infinity;

    for (const c of cands) {
      const cx = U.clamp(c.x, minX, maxX);
      const cy = U.clamp(c.y, minY, maxY);
      const rect = { x0: cx, y0: cy, x1: cx + cw, y1: cy + ch };
      const somaOv = rectOverlapArea(rect, somaRect);
      const arborOv = rectOverlapArea(rect, arborRect);
      const miniOv = minimapRect ? rectOverlapArea(rect, minimapRect) : 0;
      let toggleOv = 0;
      for (const tr of toggleRects) toggleOv += rectOverlapArea(rect, tr);
      const dist = Math.hypot((cx + cw * 0.5) - sp.x, (cy + ch * 0.5) - sp.y);

      const score = isFocused
        ? (somaOv * 500 + toggleOv * 400 + miniOv * 150 + arborOv * 30 - (c.isCorner ? 1200 : 0) - dist * 0.25)
        : (somaOv * 500 + toggleOv * 400 + miniOv * 150 + arborOv * 15 + dist * 0.12);

      if (score < bestScore) {
        bestScore = score;
        best = { x: cx, y: cy };
      }
    }

    return { left: Math.round(best.x), top: Math.round(best.y) };
  }

  function updateHUD(now) {
    const z = state.cam.zoom;
    const zStr = `${z < 10 ? z.toFixed(1) : Math.round(z)}x`;
    setTextIfChanged(elZoomVal, 'zoom', zStr);

    const sc = state.currentScene;
    if (!isMicroActive()) {
      setTextIfChanged(elScaleBadge, 'badge', '巨觀冠狀解剖視野');
      const r = state.hoverReg || M.getRegionAt(state.cam.mx, state.cam.my, state.plane);
      setTextIfChanged(elRegionName, 'region', M.REGION_LABELS[r] || '全腦冠狀切面（點擊腦區放大）');
    } else {
      const mz = microZoom();
      setTextIfChanged(elScaleBadge, 'badge', mz > 2.2 ? '超微突觸與樹突棘視野' : '顯微細胞組織插畫視野');
      setTextIfChanged(elRegionName, 'region', sc ? `${sc.info.regionName} · ${sc.info.title}` : '');
    }

    if (elZoomSlider) {
      const sVal = Math.round((Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM)) * 100);
      if (lastHud.slider !== sVal) {
        lastHud.slider = sVal;
        elZoomSlider.value = sVal;
      }
    }

    if (sc && sc.real.length && now - lastStatsAt >= 150) {
      lastStatsAt = now;
      let atpSum = 0;
      for (let i = 0; i < sc.real.length; i++) atpSum += sc.real[i].atp;
      setTextIfChanged(elAtp, 'atp', `${Math.round(atpSum / sc.real.length)}%`);

      let adeno = 0, plaque = 0;
      for (let i = 0; i < sim.wastes.length; i++) {
        if (sim.wastes[i].type === 'adenosine') adeno++;
        else plaque++;
      }
      const adPct = Math.min(100, Math.round((adeno / 80) * 100));
      setTextIfChanged(elAdeno, 'adeno', sim.caffeineTimer > 0 ? `${adPct}% 阻斷` : `${adPct}%`);
      setTextIfChanged(elWaste, 'waste', `${Math.min(100, Math.round((plaque / 50) * 100))}%`);
      const waveText = sim.activeWave
        ? `${sim.activeWave.recruited.size}/${sc.real.length} (G${sim.activeWave.maxGen})`
        : '待激發';
      setTextIfChanged(elWave, 'wave', waveText);
    }

    if (state.selected && isMicroActive() && elInspector) {
      if (state.selected.kind === 'microglia' && state.selected.entity) {
        const m = state.selected.entity;
        state.selected.x = m.x;
        state.selected.y = m.y;
        state.selected.bbox = { x0: m.x - m.rad, y0: m.y - m.rad, x1: m.x + m.rad, y1: m.y + m.rad };
      }
      const pos = computeInspectorPosition(state.selected, inspectorW || 256, inspectorH || 150);
      if (pos.left !== lastInspX || pos.top !== lastInspY) {
        lastInspX = pos.left;
        lastInspY = pos.top;
        elInspector.style.transform = `translate3d(${pos.left}px, ${pos.top}px, 0)`;
      }
    }
  }

  /* ---------------- 主動畫與雙尺度無縫渲染迴圈 ---------------- */
  let cachedPageGrad = null;
  let cachedPageGradKey = '';

  function getPageGrad() {
    const key = `${width}:${height}:${state.stain}`;
    if (cachedPageGrad && cachedPageGradKey === key) return cachedPageGrad;
    const g = ctx.createRadialGradient(width * 0.5, height * 0.45, 60, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    if (state.stain === 'nissl') {
      g.addColorStop(0, '#f4f6fb');
      g.addColorStop(1, '#dce3f0');
    } else {
      g.addColorStop(0, '#fdf7e7');
      g.addColorStop(1, '#eadab8');
    }
    cachedPageGrad = g;
    cachedPageGradKey = key;
    return g;
  }

  const PERF_WIN = 60;
  const perfRenderBuf = new Float64Array(PERF_WIN);
  const perfDtBuf = new Float64Array(PERF_WIN);
  let perfIdx = 0;
  let perfCount = 0;
  const showPerfHud = new URLSearchParams(window.location.search).get('perf') === '1';
  let perfEl = null;
  if (showPerfHud) {
    perfEl = document.createElement('span');
    perfEl.id = 'perf-telemetry';
    perfEl.style.cssText = 'font-family:Consolas,monospace;color:#80cbc4;font-weight:700;margin-left:8px;';
    const sb = document.getElementById('status-bar');
    if (sb) sb.appendChild(perfEl);
  }
  let lastPerfDomAt = -1000;
  window.__BS_PERF = { avgRenderMs: 0, maxRenderMs: 0, fps: 0, cacheMode: 'macro' };

  let lastNow = performance.now();
  function frame(now) {
    const frameStart = performance.now();
    const dtMs = Math.max(0.1, now - lastNow);
    const rawDt = Math.min(0.05, dtMs / 1000);
    lastNow = now;

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

    ctx.fillStyle = getPageGrad();
    ctx.fillRect(0, 0, width, height);

    const z = state.cam.zoom;
    const macroAlpha = 1 - U.smoothstep(9.0, 16.5, z);
    const microAlpha = U.smoothstep(8.5, 15.5, z);

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

    if (microAlpha > 0.01 && state.currentScene) {
      const us = microFitScale();
      const halfVW = (width * 0.5) / us;
      const halfVH = (height * 0.5) / us;
      const viewRect = {
        x0: state.cam.ux - halfVW,
        y0: state.cam.uy - halfVH,
        x1: state.cam.ux + halfVW,
        y1: state.cam.uy + halfVH
      };
      const cameraSettled = !isDragging &&
        Math.abs(state.cam.zoom - state.cam.targetZoom) / Math.max(0.1, state.cam.zoom) < 0.008 &&
        Math.abs(state.cam.ux - state.cam.targetUX) < 0.8 &&
        Math.abs(state.cam.uy - state.cam.targetUY) < 0.8;

      ctx.save();
      ctx.globalAlpha = microAlpha;
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(us, us);
      ctx.translate(-state.cam.ux, -state.cam.uy);
      R.drawMicroScene(ctx, state.currentScene, sim, {
        microZoom: microZoom(),
        stain: state.stain,
        showSignals: state.showSignals,
        highlights: state.highlights,
        focusedCell: state.focusedCell,
        selected: state.selected,
        viewRect,
        worldPxScale: us,
        dpr,
        cameraSettled
      });
      ctx.restore();

      if (microAlpha > 0.65) {
        R.drawMicroLabelsScreen(ctx, state.currentScene, sim, microToScreen, width, height, microZoom(), state.showLabels, safeHorizontalSpan(), state.cam.ux, state.cam.uy);
      }
    }

    drawScaleBar(ctx);
    ctx.restore();

    drawMinimap();
    updateHUD(now);

    const renderMs = performance.now() - frameStart;
    perfRenderBuf[perfIdx] = renderMs;
    perfDtBuf[perfIdx] = dtMs;
    perfIdx = (perfIdx + 1) % PERF_WIN;
    if (perfCount < PERF_WIN) perfCount++;
    if (perfCount > 0) {
      let sumR = 0, maxR = 0, sumDt = 0;
      for (let i = 0; i < perfCount; i++) {
        const r = perfRenderBuf[i];
        sumR += r;
        if (r > maxR) maxR = r;
        sumDt += perfDtBuf[i];
      }
      window.__BS_PERF.avgRenderMs = +(sumR / perfCount).toFixed(2);
      window.__BS_PERF.maxRenderMs = +maxR.toFixed(2);
      window.__BS_PERF.fps = +(1000 / (sumDt / perfCount)).toFixed(1);
      window.__BS_PERF.cacheMode = microAlpha > 0.5 ? R.getCacheMode() : 'macro';
      if (perfEl && now - lastPerfDomAt >= 250) {
        lastPerfDomAt = now;
        perfEl.textContent = `PERF ${window.__BS_PERF.cacheMode} | avg ${window.__BS_PERF.avgRenderMs}ms | max ${window.__BS_PERF.maxRenderMs}ms | ${window.__BS_PERF.fps}fps`;
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

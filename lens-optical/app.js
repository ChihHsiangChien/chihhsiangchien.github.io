(function (global) {
  'use strict';

  const { Engine, BenchRenderer, ViewfinderRenderer } = global.LensOptics;

  const PRESETS = {
    standard: {
      objMag: 4,
      eyeMag: 10,
      stageOffset: 0,
      aperture: 1.0,
      cameraMode: 'full',
      specimen: 'letterB',
      highlightStage: 'all',
      layers: { rays: true, cone: true, focal: true, body: true, virtual: true },
      title: '複式顯微鏡兩階段成像',
      formula: 'f₁ < u₁ < 2f₁ | u₂ < f₂',
      text: '所有齊焦物鏡皆將標本成像於鏡筒內固定的中間像平面（IIP = 200 mm），再由目鏡進行二次放大，最終在明視距離形成倒立放大的虛像。'
    },
    objective: {
      objMag: 4,
      eyeMag: 10,
      stageOffset: 0,
      aperture: 1.0,
      cameraMode: 'objective',
      specimen: 'letterB',
      highlightStage: 'objective',
      layers: { rays: true, cone: false, focal: true, body: true, virtual: true },
      title: '① 物鏡成像：倒立放大實像',
      formula: 'f₁ < u₁ < 2f₁ ➔ v₁ > 2f₁',
      text: '標本置於物鏡的 1～2 倍焦距之間。三條主光線經物鏡折射後，在鏡筒內部的中間像平面匯聚成「倒立、放大的實像」。試著拖曳標本桿觀察實像位置與大小的變化！'
    },
    eyepiece: {
      objMag: 4,
      eyeMag: 10,
      stageOffset: 0,
      aperture: 1.0,
      cameraMode: 'eyepiece',
      specimen: 'letterB',
      highlightStage: 'eyepiece',
      layers: { rays: true, cone: false, focal: true, body: true, virtual: true },
      title: '② 目鏡放大：二次放大虛像',
      formula: '0 < u₂ < f₂ ➔ 虛像於明視距離',
      text: '物鏡形成的中間實像恰好落在目鏡一倍焦距（F₂）以內。目鏡如同放大鏡使光線發散進入人眼，視覺向後延伸交會於「最終虛像」，相對於原標本呈現倒立且二次放大。'
    },
    aperture: {
      objMag: 10,
      eyeMag: 10,
      stageOffset: 0.16,
      aperture: 0.30,
      cameraMode: 'aperture',
      specimen: 'threads',
      highlightStage: 'aperture',
      layers: { rays: false, cone: true, focal: true, body: true, virtual: false },
      title: '③ 光圈實驗：景深加深、視野變暗',
      formula: 'NA_eff = NA × 光圈 | 景深 ∝ 1/光圈',
      text: '載物台刻意微調離焦 (+0.16 mm) 並搭配三色立體纖維標本。請左右拖曳「光圈孔徑」滑桿：光圈縮小時進光量減少（視野變暗），但光錐變細使 IIP 彌散圓縮小，中、底層纖維隨之變清晰！'
    }
  };

  const appState = {
    objMag: 4,
    eyeMag: 10,
    stageOffset: 0,
    aperture: 1.0,
    specimen: 'letterB',
    cameraMode: 'full',
    highlightStage: 'all',
    preset: 'standard',
    layers: {
      rays: true,
      cone: true,
      focal: true,
      body: true,
      virtual: true
    }
  };

  let benchRenderer = null;
  let vfRenderer = null;
  let dom = {};

  function formatFocusOffset(offsetMm, obj) {
    if (obj.focusUnit === 'um') {
      const um = offsetMm * 1000;
      const sign = um > 0.05 ? '+' : '';
      return `${sign}${um.toFixed(0)} μm`;
    }
    const decimals = obj.mag >= 10 ? 3 : 2;
    const sign = offsetMm > 1e-6 ? '+' : '';
    return `${sign}${offsetMm.toFixed(decimals)} mm`;
  }

  function syncFocusSliderConfig() {
    const obj = Engine.OBJECTIVES[appState.objMag];
    dom.inputFocus.min = obj.focusMin;
    dom.inputFocus.max = obj.focusMax;
    dom.inputFocus.step = obj.focusStep;
    appState.stageOffset = Math.max(obj.focusMin, Math.min(obj.focusMax, appState.stageOffset));
    dom.inputFocus.value = appState.stageOffset;
  }

  function clearActivePreset() {
    if (appState.preset !== null) {
      appState.preset = null;
      appState.highlightStage = 'all';
      updatePresetButtons();
    }
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    appState.preset = name;
    appState.objMag = p.objMag;
    appState.eyeMag = p.eyeMag;
    appState.stageOffset = p.stageOffset;
    appState.aperture = p.aperture;
    appState.cameraMode = p.cameraMode;
    appState.specimen = p.specimen;
    appState.highlightStage = p.highlightStage;
    appState.layers = { ...p.layers };

    syncFocusSliderConfig();
    syncAllControlsFromState();
    benchRenderer.setCameraMode(appState.cameraMode, false);
    updateAll();

    dom.guideTitle.textContent = p.title;
    dom.guideFormula.textContent = p.formula;
    dom.guideText.textContent = p.text;
  }

  function syncAllControlsFromState() {
    dom.objBtns.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.obj) === appState.objMag);
    });
    dom.eyeBtns.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.eye) === appState.eyeMag);
    });
    dom.cameraBtns.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cam === appState.cameraMode);
    });
    dom.specimenBtns.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.spec === appState.specimen);
    });

    dom.chkRays.checked = appState.layers.rays;
    dom.chkCone.checked = appState.layers.cone;
    dom.chkFocal.checked = appState.layers.focal;
    dom.chkBody.checked = appState.layers.body;

    dom.inputFocus.value = appState.stageOffset;
    dom.inputAperture.value = appState.aperture;
    updatePresetButtons();
  }

  function updatePresetButtons() {
    dom.presetBtns.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === appState.preset);
    });
  }

  function updateAll() {
    const st = Engine.computeOpticalState({
      objMag: appState.objMag,
      eyeMag: appState.eyeMag,
      stageOffset: appState.stageOffset,
      aperture: appState.aperture
    });

    // Update numeric readouts
    dom.focusVal.textContent = formatFocusOffset(st.stageOffset, st.obj);
    dom.apertureVal.textContent = `${Math.round(st.aperture * 100)}%`;

    // Orientation hint
    if (appState.specimen === 'letterB') {
      dom.orientHint.textContent = '載玻片正向「b」➔ 目鏡上下顛倒左右相反「q」';
      dom.orientHint.style.display = 'inline-block';
    } else if (appState.specimen === 'threads') {
      dom.orientHint.textContent = '紅(上) • 綠(中) • 藍(下) 三層立體交叉纖維';
      dom.orientHint.style.display = 'inline-block';
    } else {
      dom.orientHint.textContent = '洋蔥表皮細胞（細胞壁與紫色染色細胞核）';
      dom.orientHint.style.display = 'inline-block';
    }

    // Header focus status pill
    if (st.stage1State === 'at-focus') {
      dom.focusStatusPill.textContent = '● 標本位於焦點 F₁（平行光射出）';
      dom.focusStatusPill.className = 'status-pill danger';
    } else if (st.stage1State === 'virtual') {
      dom.focusStatusPill.textContent = '● 物距小於 f₁（無法成中間實像）';
      dom.focusStatusPill.className = 'status-pill danger';
    } else if (st.isFocused) {
      dom.focusStatusPill.textContent = '● 已精確對焦於 IIP';
      dom.focusStatusPill.className = 'status-pill';
    } else {
      dom.focusStatusPill.textContent = `● 離焦中（IIP 偏差 ${st.iipErrorMm >= 0 ? '+' : ''}${st.iipErrorMm.toFixed(1)} mm）`;
      dom.focusStatusPill.className = 'status-pill warn';
    }

    // Stage 1 telemetry
    dom.valU1.textContent = `${st.u1.toFixed(2)} mm`;
    dom.valF1.textContent = `${st.f1.toFixed(2)} mm`;
    if (st.stage1State === 'real') {
      dom.valV1.textContent = `${st.v1.toFixed(1)} mm`;
      dom.valM1.textContent = `${st.actualM1.toFixed(2)}×`;
      dom.stage1Badge.textContent = st.actualM1 >= 1 ? '倒立放大實像' : '倒立縮小實像';
      dom.stage1Badge.className = 'tele-badge emerald';
    } else if (st.stage1State === 'at-focus') {
      dom.valV1.textContent = '∞';
      dom.valM1.textContent = '—';
      dom.stage1Badge.textContent = '於焦點不成像';
      dom.stage1Badge.className = 'tele-badge amber';
    } else {
      dom.valV1.textContent = `${st.v1.toFixed(1)} mm`;
      dom.valM1.textContent = `${st.actualM1.toFixed(2)}×`;
      dom.stage1Badge.textContent = '正立放大虛像';
      dom.stage1Badge.className = 'tele-badge amber';
    }

    // Stage 2 telemetry
    dom.valF2.textContent = `${st.f2.toFixed(2)} mm`;
    if (st.stage1State !== 'real') {
      dom.valU2.textContent = '—';
      dom.valV2.textContent = '—';
      dom.valM2.textContent = '—';
      dom.stage2Badge.textContent = '無中間實像';
      dom.stage2Badge.className = 'tele-badge';
    } else {
      dom.valU2.textContent = `${st.u2.toFixed(2)} mm`;
      if (st.stage2State === 'virtual') {
        dom.valV2.textContent = `${st.v2.toFixed(1)} mm`;
        dom.valM2.textContent = `${st.actualM2.toFixed(2)}×`;
        dom.stage2Badge.textContent = '二次放大虛像';
        dom.stage2Badge.className = 'tele-badge purple';
      } else if (st.stage2State === 'infinity') {
        dom.valV2.textContent = '∞';
        dom.valM2.textContent = `${(250 / st.f2).toFixed(2)}×`;
        dom.stage2Badge.textContent = '無窮遠成像';
        dom.stage2Badge.className = 'tele-badge purple';
      } else if (st.stage2State === 'real-behind-eye') {
        dom.valV2.textContent = `+${st.v2.toFixed(1)} mm`;
        dom.valM2.textContent = `${st.actualM2.toFixed(2)}×`;
        dom.stage2Badge.textContent = '實像落於眼後';
        dom.stage2Badge.className = 'tele-badge amber';
      } else {
        dom.valV2.textContent = '—';
        dom.valM2.textContent = '—';
        dom.stage2Badge.textContent = '中間像越過目鏡';
        dom.stage2Badge.className = 'tele-badge amber';
      }
    }

    // Total & aperture telemetry
    const brightPct = Math.round(st.brightness * 100);
    dom.nominalMagBadge.textContent = `標稱 ${st.nominalMag}×`;
    dom.valNaEff.textContent = st.naEff.toFixed(2);
    dom.valDofRel.textContent = `${st.dofFactor.toFixed(1)}×`;
    dom.valBright.textContent = `${brightPct}%`;
    dom.valIipErr.textContent = st.iipErrorMm !== null ? `${st.iipErrorMm >= 0 ? '+' : ''}${st.iipErrorMm.toFixed(2)} mm` : '—';

    dom.meterBrightVal.textContent = `${brightPct}%`;
    dom.meterBrightBar.style.width = `${brightPct}%`;
    dom.meterDofVal.textContent = `${st.dofFactor.toFixed(1)}×`;
    dom.meterDofBar.style.width = `${Math.min(100, (st.dofFactor / 5) * 100)}%`;

    // Render canvases
    benchRenderer.setState(st, {
      cameraMode: appState.cameraMode,
      highlightStage: appState.highlightStage,
      layers: appState.layers
    });
    vfRenderer.render(st, appState.specimen);
  }

  function bindEvents() {
    dom.objBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      appState.objMag = Number(btn.dataset.obj);
      appState.stageOffset = 0; // Parfocal lenses stay focused when switching
      syncFocusSliderConfig();
      syncAllControlsFromState();
      clearActivePreset();
      updateAll();
    });

    dom.eyeBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      appState.eyeMag = Number(btn.dataset.eye);
      syncAllControlsFromState();
      clearActivePreset();
      updateAll();
    });

    dom.cameraBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      appState.cameraMode = btn.dataset.cam;
      syncAllControlsFromState();
      benchRenderer.setCameraMode(appState.cameraMode, false);
    });

    dom.specimenBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      appState.specimen = btn.dataset.spec;
      syncAllControlsFromState();
      updateAll();
    });

    dom.presetBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      applyPreset(btn.dataset.preset);
    });

    dom.inputFocus.addEventListener('input', (e) => {
      appState.stageOffset = parseFloat(e.target.value);
      clearActivePreset();
      updateAll();
    });

    const stepFocus = (dir) => {
      const obj = Engine.OBJECTIVES[appState.objMag];
      const next = appState.stageOffset + dir * obj.focusStep * 2;
      appState.stageOffset = Math.max(obj.focusMin, Math.min(obj.focusMax, next));
      dom.inputFocus.value = appState.stageOffset;
      clearActivePreset();
      updateAll();
    };

    dom.btnFocusMinus.addEventListener('click', () => stepFocus(-1));
    dom.btnFocusPlus.addEventListener('click', () => stepFocus(1));

    dom.inputAperture.addEventListener('input', (e) => {
      appState.aperture = parseFloat(e.target.value);
      updateAll();
    });

    dom.btnAutoFocus.addEventListener('click', () => {
      appState.stageOffset = 0;
      dom.inputFocus.value = 0;
      updateAll();
    });

    dom.btnResetView.addEventListener('click', () => {
      benchRenderer.resetCamera();
    });

    const bindLayerCheck = (el, key) => {
      el.addEventListener('change', () => {
        appState.layers[key] = el.checked;
        updateAll();
      });
    };
    bindLayerCheck(dom.chkRays, 'rays');
    bindLayerCheck(dom.chkCone, 'cone');
    bindLayerCheck(dom.chkFocal, 'focal');
    bindLayerCheck(dom.chkBody, 'body');

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        appState.stageOffset = 0;
        dom.inputFocus.value = 0;
        updateAll();
      }
    });
  }

  function init() {
    dom = {
      canvasStage: document.getElementById('canvasStage'),
      benchCanvas: document.getElementById('benchCanvas'),
      viewfinderCanvas: document.getElementById('viewfinderCanvas'),
      focusStatusPill: document.getElementById('focusStatusPill'),
      cameraBtns: document.getElementById('cameraBtns'),
      chkRays: document.getElementById('chkRays'),
      chkCone: document.getElementById('chkCone'),
      chkFocal: document.getElementById('chkFocal'),
      chkBody: document.getElementById('chkBody'),
      btnAutoFocus: document.getElementById('btnAutoFocus'),
      btnResetView: document.getElementById('btnResetView'),
      stage1Badge: document.getElementById('stage1Badge'),
      valU1: document.getElementById('valU1'),
      valV1: document.getElementById('valV1'),
      valF1: document.getElementById('valF1'),
      valM1: document.getElementById('valM1'),
      stage2Badge: document.getElementById('stage2Badge'),
      valU2: document.getElementById('valU2'),
      valV2: document.getElementById('valV2'),
      valF2: document.getElementById('valF2'),
      valM2: document.getElementById('valM2'),
      nominalMagBadge: document.getElementById('nominalMagBadge'),
      valNaEff: document.getElementById('valNaEff'),
      valDofRel: document.getElementById('valDofRel'),
      valBright: document.getElementById('valBright'),
      valIipErr: document.getElementById('valIipErr'),
      specimenBtns: document.getElementById('specimenBtns'),
      orientHint: document.getElementById('orientHint'),
      meterBrightVal: document.getElementById('meterBrightVal'),
      meterBrightBar: document.getElementById('meterBrightBar'),
      meterDofVal: document.getElementById('meterDofVal'),
      meterDofBar: document.getElementById('meterDofBar'),
      presetBtns: document.getElementById('presetBtns'),
      guideTitle: document.getElementById('guideTitle'),
      guideFormula: document.getElementById('guideFormula'),
      guideText: document.getElementById('guideText'),
      objBtns: document.getElementById('objBtns'),
      eyeBtns: document.getElementById('eyeBtns'),
      inputFocus: document.getElementById('inputFocus'),
      focusVal: document.getElementById('focusVal'),
      btnFocusMinus: document.getElementById('btnFocusMinus'),
      btnFocusPlus: document.getElementById('btnFocusPlus'),
      inputAperture: document.getElementById('inputAperture'),
      apertureVal: document.getElementById('apertureVal')
    };

    benchRenderer = new BenchRenderer(dom.benchCanvas, {
      onStageDrag: (newOffset) => {
        const obj = Engine.OBJECTIVES[appState.objMag];
        appState.stageOffset = Math.max(obj.focusMin, Math.min(obj.focusMax, newOffset));
        dom.inputFocus.value = appState.stageOffset;
        clearActivePreset();
        updateAll();
      }
    });
    vfRenderer = new ViewfinderRenderer(dom.viewfinderCanvas);

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          benchRenderer.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      ro.observe(dom.canvasStage);
    } else {
      window.addEventListener('resize', () => {
        benchRenderer.resize(dom.canvasStage.clientWidth, dom.canvasStage.clientHeight);
      });
    }

    bindEvents();
    applyPreset('standard');
    benchRenderer.resize(dom.canvasStage.clientWidth, dom.canvasStage.clientHeight);
    benchRenderer.setCameraMode(appState.cameraMode, true);
  }

  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);

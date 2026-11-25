import {
  APERTURE_HOLES,
  OBJECTIVES,
  OpticsView,
  SLIDE_OFFSET_X_RANGE,
  SLIDE_OFFSET_Y_RANGE,
  STAGE_Z_RANGE,
  clamp,
  computeOptics,
} from './optics.js';
import { Microscope3DViewer } from './microscope3d.js';

const DEFAULT_STATE = {
  objectiveIdx: 0,
  eyepieceMag: 10,
  apertureLevel: 3,
  lightOn: true,
  stageZ: -26,
  slideOffsetX: -6,
  slideOffsetY: -4,
  mode: 'threads',
  compound: true,
  showLabels: true,
  bugsEliminated: 0,
};

let state = { ...DEFAULT_STATE };
let fineAnchorZ = state.stageZ;

const el = {
  viewer3d: document.getElementById('viewer3d'),
  labelLayer: document.getElementById('labelLayer'),
  eyepieceCanvas: document.getElementById('eyepieceCanvas'),
  slideCanvas: document.getElementById('slideCanvas'),
  dofCanvas: document.getElementById('dofCanvas'),
  hoverPartTitle: document.getElementById('hoverPartTitle'),
  hoverPartHint: document.getElementById('hoverPartHint'),
  coarseSlider: document.getElementById('coarseSlider'),
  fineSlider: document.getElementById('fineSlider'),
  stageZVal: document.getElementById('stageZVal'),
  focalZVal: document.getElementById('focalZVal'),
  apertureHoleText: document.getElementById('apertureHoleText'),
  metricMag: document.getElementById('metricMag'),
  metricDof: document.getElementById('metricDof'),
  metricBright: document.getElementById('metricBright'),
  dofRangeText: document.getElementById('dofRangeText'),
  statusBanner: document.getElementById('statusBanner'),
  statusText: document.getElementById('statusText'),
  bugTools: document.getElementById('bugTools'),
  bugKillCount: document.getElementById('bugKillCount'),
  compoundToggle: document.getElementById('compoundToggle'),
  toggleLabelsBtn: document.getElementById('toggleLabelsBtn'),
  lightToggleBtn: document.getElementById('lightToggleBtn'),
  lightToggleText: document.getElementById('lightToggleText'),
};

const opticsView = new OpticsView({
  eyepieceCanvas: el.eyepieceCanvas,
  slideCanvas: el.slideCanvas,
  dofCanvas: el.dofCanvas,
  onSlideOffsetChange: (nx, ny) => {
    updateState({ slideOffsetX: nx, slideOffsetY: ny });
  },
});

const viewer3d = new Microscope3DViewer(el.viewer3d, el.labelLayer, {
  onHoverPart: (title, hint) => {
    el.hoverPartTitle.textContent = title || '3D 互動操作';
    el.hoverPartHint.textContent = hint;
  },
  onStageZChange: (nextZ) => {
    fineAnchorZ = nextZ;
    el.fineSlider.value = '0';
    updateState({ stageZ: nextZ });
  },
  onSlideOffsetChange: (nx, ny) => {
    updateState({ slideOffsetX: nx, slideOffsetY: ny });
  },
  onCycleObjective: () => {
    const nextIdx = (state.objectiveIdx + 1) % OBJECTIVES.length;
    updateState({ objectiveIdx: nextIdx });
  },
  onCycleAperture: () => {
    const nextAp = (state.apertureLevel % 6) + 1;
    updateState({ apertureLevel: nextAp });
  },
  onCycleEyepiece: () => {
    const nextEye = state.eyepieceMag === 10 ? 15 : 10;
    updateState({ eyepieceMag: nextEye });
  },
  onToggleLight: () => {
    updateState({ lightOn: !state.lightOn });
  },
});

function updateStatusBanner(optics) {
  el.statusBanner.classList.toggle('warning', optics.nearCollision);
  el.bugTools.classList.toggle('hidden', state.mode !== 'bugs');
  el.bugKillCount.textContent = String(state.bugsEliminated);

  if (!optics.lightOn) {
    el.statusText.textContent = '底座光源已關閉，請點擊 3D 底座上的「光源開關」或下方按鈕開啟照明。';
    return;
  }

  if (optics.nearCollision) {
    el.statusText.textContent = '注意：40X 高倍物鏡已非常接近蓋玻片，請改用細調節輪微調以免壓碎玻片！';
    return;
  }

  if (state.mode === 'threads') {
    el.statusText.textContent =
      optics.totalMag >= 400
        ? '400X 淺景深觀察：轉動細調節輪，紅 (+16 μm)、黃 (0 μm)、藍 (−16 μm) 纖維會依序對焦！'
        : '提示：切換至 40X 物鏡後微調細調節輪，並比較光圈 #1 與 #6 的景深差異。';
  } else if (state.mode === 'specimen') {
    el.statusText.textContent = '細胞標本模式：細胞核層 (0 μm)、表層細胞壁 (+12 μm) 與底層顆粒 (−12 μm) 具不同焦距。';
  } else if (state.mode === 'bugs') {
    el.statusText.textContent =
      optics.totalMag >= 400
        ? '400X 蟲蟲模式：移動載玻片並對準該蟲蟲的 Z 軸焦平面，紅色準星可消滅水樣微生物！'
        : '水樣蟲蟲模式：蟲蟲在不同深度游泳，切換到 40X 物鏡並對焦即可啟動準星消滅功能。';
  } else {
    el.statusText.textContent = '文字 (DF) 模式：觀察「複式倒立成像」如何使文字上下顛倒、左右相反，並影響載玻片移動方向。';
  }
}

function updateUI(optics) {
  // Active buttons
  document.querySelectorAll('#objectiveBtns .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.obj) === state.objectiveIdx);
  });
  document.querySelectorAll('#eyepieceBtns .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.eye) === state.eyepieceMag);
  });
  document.querySelectorAll('#apertureBtns .ap-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.ap) === state.apertureLevel);
  });
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });

  el.compoundToggle.checked = state.compound;
  el.toggleLabelsBtn.classList.toggle('active', state.showLabels);

  el.coarseSlider.value = String(state.stageZ);
  el.stageZVal.textContent = `${state.stageZ.toFixed(1)} μm`;
  el.focalZVal.textContent = `焦平面 ${optics.focalZ.toFixed(1)} μm`;

  const holeDiam = APERTURE_HOLES[state.apertureLevel - 1];
  const holeTags = ['極小', '小', '中小', '中大', '大', '最大'];
  el.apertureHoleText.textContent = `#${state.apertureLevel} (${holeTags[state.apertureLevel - 1]} r=${holeDiam})`;

  el.metricMag.textContent = `${optics.totalMag}X`;
  el.metricDof.textContent = `±${optics.dofHalf.toFixed(1)} μm`;
  el.metricBright.textContent = optics.lightOn ? `${optics.brightnessPct}%` : '0% (關閉)';
  el.dofRangeText.textContent = `NA ${optics.obj.na.toFixed(2)}`;

  el.lightToggleBtn.classList.toggle('on', optics.lightOn);
  el.lightToggleText.textContent = optics.lightOn ? '開啟' : '關閉';

  updateStatusBanner(optics);
}

function updateState(patch) {
  state = { ...state, ...patch };
  const optics = computeOptics(state);
  updateUI(optics);
  opticsView.renderAll(state);
  viewer3d.syncFromState(state, opticsView);
}

// --- Bind UI events ---
document.getElementById('objectiveBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  updateState({ objectiveIdx: Number(btn.dataset.obj) });
});

document.getElementById('eyepieceBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  updateState({ eyepieceMag: Number(btn.dataset.eye) });
});

el.lightToggleBtn.addEventListener('click', () => {
  updateState({ lightOn: !state.lightOn });
});

document.getElementById('apertureBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('.ap-btn');
  if (!btn) return;
  updateState({ apertureLevel: Number(btn.dataset.ap) });
});

document.querySelector('.mode-group').addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  updateState({ mode: btn.dataset.mode });
});

el.compoundToggle.addEventListener('change', () => {
  updateState({ compound: el.compoundToggle.checked });
});

el.coarseSlider.addEventListener('input', () => {
  const z = Number(el.coarseSlider.value);
  fineAnchorZ = z;
  el.fineSlider.value = '0';
  updateState({ stageZ: z });
});

el.fineSlider.addEventListener('input', () => {
  const delta = Number(el.fineSlider.value);
  const nextZ = clamp(fineAnchorZ + delta, STAGE_Z_RANGE.min, STAGE_Z_RANGE.max);
  updateState({ stageZ: nextZ });
});

function nudgeStageZ(delta) {
  const nextZ = clamp(state.stageZ + delta, STAGE_Z_RANGE.min, STAGE_Z_RANGE.max);
  fineAnchorZ = nextZ;
  el.fineSlider.value = '0';
  updateState({ stageZ: nextZ });
}

document.getElementById('coarseDownBtn').addEventListener('click', () => nudgeStageZ(-4));
document.getElementById('coarseUpBtn').addEventListener('click', () => nudgeStageZ(4));
document.getElementById('fineDownBtn').addEventListener('click', () => nudgeStageZ(-0.4));
document.getElementById('fineUpBtn').addEventListener('click', () => nudgeStageZ(0.4));

function moveSlideBy(dxUnit, dyUnit) {
  const optics = computeOptics(state);
  const step = Math.max(0.6, 80 / optics.totalMag);
  const nx = clamp(state.slideOffsetX + dxUnit * step, SLIDE_OFFSET_X_RANGE.min, SLIDE_OFFSET_X_RANGE.max);
  const ny = clamp(state.slideOffsetY + dyUnit * step, SLIDE_OFFSET_Y_RANGE.min, SLIDE_OFFSET_Y_RANGE.max);
  updateState({ slideOffsetX: nx, slideOffsetY: ny });
}

document.querySelectorAll('.dpad-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    moveSlideBy(Number(btn.dataset.dx), Number(btn.dataset.dy));
  });
});

document.getElementById('centerSlideBtn').addEventListener('click', () => {
  updateState({ slideOffsetX: 0, slideOffsetY: 0 });
});

document.getElementById('respawnBugsBtn').addEventListener('click', () => {
  opticsView.addBugs(3);
  updateState({});
});

document.querySelectorAll('.cam-presets .hud-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-presets .hud-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    viewer3d.setCameraPreset(btn.dataset.cam);
  });
});

el.toggleLabelsBtn.addEventListener('click', () => {
  const next = !state.showLabels;
  viewer3d.setShowLabels(next);
  updateState({ showLabels: next });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  opticsView.resetBugs(4);
  fineAnchorZ = DEFAULT_STATE.stageZ;
  el.fineSlider.value = '0';
  viewer3d.setCameraPreset('default');
  viewer3d.setShowLabels(true);
  document.querySelectorAll('.cam-presets .hud-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.cam === 'default');
  });
  updateState({ ...DEFAULT_STATE });
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    moveSlideBy(-1, 0);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    moveSlideBy(1, 0);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveSlideBy(0, -1);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveSlideBy(0, 1);
  }
});

// Animation loop for live bugs mode
let lastTexRefresh = 0;
function bugTick(nowMs) {
  requestAnimationFrame(bugTick);
  if (state.mode !== 'bugs') return;

  const { changed, killedDelta } = opticsView.stepBugs(nowMs / 1000, state);
  if (killedDelta > 0) {
    state = { ...state, bugsEliminated: state.bugsEliminated + killedDelta };
    el.bugKillCount.textContent = String(state.bugsEliminated);
  }
  if (changed) {
    opticsView.renderAll(state);
    if (nowMs - lastTexRefresh > 90) {
      viewer3d.refreshSlideTexture(opticsView, state);
      lastTexRefresh = nowMs;
    }
  }
}

// Initial render
updateState(DEFAULT_STATE);
requestAnimationFrame(bugTick);

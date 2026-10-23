import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODEL_DATA } from './js/data.js';
import { createAnimalCellModel } from './js/models/animalCell.js';
import { createMitochondriaModel } from './js/models/mitochondria.js';
import { createChloroplastModel } from './js/models/chloroplast.js';
import { createRBCModel } from './js/models/rbc.js';
import { createMembraneModel } from './js/models/membrane.js';

// --- 全域變數與模型工廠對照 ---
const MODEL_FACTORIES = {
  animalCell: createAnimalCellModel,
  mitochondria: createMitochondriaModel,
  chloroplast: createChloroplastModel,
  rbc: createRBCModel,
  membrane: createMembraneModel
};

let scene, camera, renderer, controls;
let currentModelId = 'animalCell';
let activeModelInstance = null;
let currentModelGroup = null;

let autoRotate = true;
let cutawayEnabled = true;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-9999, -9999);
let hoveredMesh = null;
let originalEmissive = null;
let originalEmissiveIntensity = 0;
let toastTimeout = null;

// 相機過渡動畫插值狀態
let cameraTween = {
  active: false,
  startPos: new THREE.Vector3(),
  targetPos: new THREE.Vector3(),
  startLook: new THREE.Vector3(),
  targetLook: new THREE.Vector3(),
  progress: 0,
  duration: 1.0
};

// DOM 元素快取
const container = document.getElementById('canvas-container');
const tabButtons = document.querySelectorAll('.tab-btn');
const infoCard = document.getElementById('info-card');
const cardToggleBtn = document.getElementById('cardToggleBtn');
const cardBadge = document.getElementById('card-badge');
const cardTitle = document.getElementById('card-title');
const cardSubEn = document.getElementById('card-sub-en');
const cardSummary = document.getElementById('card-summary');
const cardMembraneType = document.getElementById('card-membrane-type');
const cardDimensions = document.getElementById('card-dimensions');
const structureTagsContainer = document.getElementById('structure-tags');
const cardCurriculum = document.getElementById('card-curriculum');

const resetCameraBtn = document.getElementById('resetCameraBtn');
const autoRotateBtn = document.getElementById('autoRotateBtn');
const cutawayBtn = document.getElementById('cutawayBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const toastNotification = document.getElementById('toast-notification');
const hoverTooltip = document.getElementById('hover-tooltip');

// 初始化入口
init();

function init() {
  const sceneReady = initScene();
  if (!sceneReady) return;

  initLighting();
  initControls();
  initEventListeners();

  // 載入初始模型
  switchModel('animalCell', false);

  // 開始渲染主循環
  animate();
}

/**
 * 建立 Three.js 場景、相機與 WebGL 渲染器
 */
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d16);

  // 空間環境星雲霧化感
  scene.fog = new THREE.FogExp2(0x090d16, 0.02);

  camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 啟用本地裁切平面 (WebGL Local Clipping)
    renderer.localClippingEnabled = true;

    // 色調映射營造電影級質感
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    return true;
  } catch (err) {
    console.warn('WebGL initialization failed:', err);
    if (container) {
      container.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #f87171; font-family: sans-serif; padding: 24px; background: rgba(15,23,42,0.85); border: 1px solid rgba(248,113,113,0.3); border-radius: 12px;">
          <h3 style="margin-bottom: 8px;">⚠️ 您的環境尚未啟用 WebGL 支援</h3>
          <p style="font-size: 13px; color: #cbd5e1;">請在瀏覽器設定中開啟硬體加速或使用現代瀏覽器以檢視 3D 胞器模型。</p>
        </div>
      `;
    }
    return false;
  }
}

/**
 * 建立多光源系統（環境光、主方向光、柔和補光與輪廓邊緣光）
 */
function initLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  // 主日光
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
  dirLight1.position.set(12, 18, 15);
  scene.add(dirLight1);

  // 藍紫色冷色側邊補光
  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.0);
  dirLight2.position.set(-15, -6, -10);
  scene.add(dirLight2);

  // 暖色背向輪廓光
  const dirLight3 = new THREE.DirectionalLight(0xf59e0b, 0.7);
  dirLight3.position.set(0, -12, 10);
  scene.add(dirLight3);
}

/**
 * 初始化 OrbitControls 並設定慣性阻尼與行動觸控
 */
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2.0;
  controls.maxDistance = 28.0;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.8;

  // 行動裝置手勢配置：單指旋轉、雙指縮放平移
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
}

/**
 * 切換展示模型
 */
function switchModel(modelId, animateTransition = true) {
  if (!MODEL_FACTORIES[modelId]) return;

  // 1. 清理現有模型
  if (activeModelInstance) {
    if (activeModelInstance.dispose) activeModelInstance.dispose();
    if (currentModelGroup) scene.remove(currentModelGroup);
    activeModelInstance = null;
    currentModelGroup = null;
  }

  clearHighlight();
  if (hoverTooltip) hoverTooltip.style.display = 'none';

  // 2. 實例化新模型
  currentModelId = modelId;
  const factory = MODEL_FACTORIES[modelId];
  activeModelInstance = factory();
  currentModelGroup = activeModelInstance.group;
  scene.add(currentModelGroup);

  // 同步當前剖面開關
  if (activeModelInstance.setCutaway) {
    activeModelInstance.setCutaway(cutawayEnabled);
  }

  // 3. 更新 UI 資訊卡與分頁標籤
  updateUI(modelId);

  // 4. 平滑移動相機視角
  const targetCamPos = activeModelInstance.defaultCameraPosition || new THREE.Vector3(0, 3, 8);
  const targetLook = activeModelInstance.defaultTarget || new THREE.Vector3(0, 0, 0);

  if (animateTransition) {
    startCameraTransition(targetCamPos, targetLook);
  } else {
    camera.position.copy(targetCamPos);
    controls.target.copy(targetLook);
    controls.update();
  }

  showToast(`已載入：${MODEL_DATA[modelId].name}`);
}

/**
 * 啟動相機平滑過渡插值
 */
function startCameraTransition(targetPos, targetLook) {
  cameraTween.active = true;
  cameraTween.startPos.copy(camera.position);
  cameraTween.targetPos.copy(targetPos);
  cameraTween.startLook.copy(controls.target);
  cameraTween.targetLook.copy(targetLook);
  cameraTween.progress = 0;
}

/**
 * 更新懸浮科學資訊卡 (Traditional Chinese HUD)
 */
function updateUI(modelId) {
  const data = MODEL_DATA[modelId];
  if (!data) return;

  // 更新 Tab 按鈕狀態
  tabButtons.forEach(btn => {
    const isCurrent = btn.dataset.model === modelId;
    btn.classList.toggle('active', isCurrent);
    btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
  });

  // 更新卡片內容
  if (cardBadge) cardBadge.textContent = data.badge;
  if (cardTitle) cardTitle.textContent = data.name;
  if (cardSubEn) cardSubEn.textContent = data.enName;
  if (cardSummary) cardSummary.textContent = data.summary;
  if (cardMembraneType) cardMembraneType.textContent = data.membraneType;
  if (cardDimensions) cardDimensions.textContent = data.dimensions;

  // 構造標籤清單
  if (structureTagsContainer) {
    structureTagsContainer.innerHTML = '';
    data.structures.forEach(struct => {
      const tag = document.createElement('button');
      tag.className = 'structure-tag';
      tag.dataset.structureId = struct.id;
      tag.innerHTML = `<span class="dot" style="background-color: ${struct.color}"></span><span>${struct.name}</span>`;

      tag.addEventListener('click', () => {
        handleStructureTagClick(struct, tag);
      });

      structureTagsContainer.appendChild(tag);
    });
  }

  // 課綱重點條列
  if (cardCurriculum) {
    cardCurriculum.innerHTML = '';
    data.curriculumFacts.forEach(fact => {
      const li = document.createElement('li');
      li.textContent = fact;
      cardCurriculum.appendChild(li);
    });
  }
}

/**
 * 點選構造標籤時的高亮與解說聚焦
 */
function handleStructureTagClick(struct, tagElement) {
  // 切換標籤 active 樣式
  const allTags = structureTagsContainer.querySelectorAll('.structure-tag');
  allTags.forEach(t => t.classList.remove('active'));
  tagElement.classList.add('active');

  // 動態替換解說簡介為該構造的詳細解說
  if (cardSummary) {
    cardSummary.innerHTML = `<strong style="color: ${struct.color}">${struct.name}</strong>：${struct.desc}`;
  }

  // 在 3D 場景中找到並高亮對應構造
  if (activeModelInstance && activeModelInstance.interactiveObjects) {
    const matched = activeModelInstance.interactiveObjects.filter(
      obj => obj.userData && (obj.userData.organelleId === struct.id || obj.parent?.userData?.organelleId === struct.id)
    );

    if (matched.length > 0) {
      highlightMesh(matched[0]);
      showToast(`聚焦觀察：${struct.name}`);
    }
  }
}

/**
 * 高亮特定 3D 網格物件
 */
function highlightMesh(mesh) {
  clearHighlight();

  if (!mesh || !mesh.material) return;

  hoveredMesh = mesh;
  const mat = mesh.material;

  if (mat.emissive) {
    originalEmissive = mat.emissive.clone();
    originalEmissiveIntensity = mat.emissiveIntensity || 1;
    mat.emissive.set(0x38bdf8);
    mat.emissiveIntensity = 0.8;
  }
}

/**
 * 清除發光高亮
 */
function clearHighlight() {
  if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive && originalEmissive) {
    hoveredMesh.material.emissive.copy(originalEmissive);
    hoveredMesh.material.emissiveIntensity = originalEmissiveIntensity;
  }
  hoveredMesh = null;
  originalEmissive = null;
}

/**
 * 註冊使用者互動與按鈕事件
 */
function initEventListeners() {
  window.addEventListener('resize', onWindowResize);

  // 分頁切換
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetModel = btn.dataset.model;
      if (targetModel && targetModel !== currentModelId) {
        switchModel(targetModel, true);
      }
    });
  });

  // 工具列按鈕
  if (resetCameraBtn) {
    resetCameraBtn.addEventListener('click', () => {
      if (activeModelInstance) {
        const defPos = activeModelInstance.defaultCameraPosition || new THREE.Vector3(0, 3, 8);
        const defLook = activeModelInstance.defaultTarget || new THREE.Vector3(0, 0, 0);
        startCameraTransition(defPos, defLook);
        showToast('已復位至預設觀察視角');
      }
    });
  }

  if (autoRotateBtn) {
    autoRotateBtn.addEventListener('click', () => {
      autoRotate = !autoRotate;
      controls.autoRotate = autoRotate;
      autoRotateBtn.classList.toggle('active', autoRotate);
      showToast(autoRotate ? '已開啟自動旋轉' : '已暫停自動旋轉');
    });
  }

  if (cutawayBtn) {
    cutawayBtn.addEventListener('click', () => {
      cutawayEnabled = !cutawayEnabled;
      cutawayBtn.classList.toggle('active', cutawayEnabled);
      if (activeModelInstance && activeModelInstance.setCutaway) {
        activeModelInstance.setCutaway(cutawayEnabled);
        showToast(cutawayEnabled ? '已切換為：立體剖面模式' : '已切換為：完整外觀模式');
      }
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      camera.position.multiplyScalar(0.85);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      camera.position.multiplyScalar(1.15);
    });
  }

  // 卡片收合按鈕
  if (cardToggleBtn && infoCard) {
    cardToggleBtn.addEventListener('click', () => {
      infoCard.classList.toggle('collapsed');
      const isCollapsed = infoCard.classList.contains('collapsed');
      cardToggleBtn.innerHTML = isCollapsed ? '<span>▲</span>' : '<span>✕</span>';
      cardToggleBtn.title = isCollapsed ? '展開解說卡片' : '收合解說卡片';
    });
  }

  // 3D 畫布滑鼠懸停與點選偵測
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onCanvasClick);
}

/**
 * 滑鼠/觸控移動 Raycasting
 */
function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (!activeModelInstance || !activeModelInstance.interactiveObjects) return;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(activeModelInstance.interactiveObjects, true);

  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    const organelleName = hitObj.userData?.name || hitObj.parent?.userData?.name;

    if (organelleName) {
      highlightMesh(hitObj);
      if (hoverTooltip) {
        hoverTooltip.textContent = organelleName;
        hoverTooltip.style.left = `${event.clientX}px`;
        hoverTooltip.style.top = `${event.clientY}px`;
        hoverTooltip.style.display = 'block';
      }
      return;
    }
  }

  clearHighlight();
  if (hoverTooltip) hoverTooltip.style.display = 'none';
}

/**
 * 畫布點擊選取胞器
 */
function onCanvasClick(event) {
  if (!activeModelInstance || !activeModelInstance.interactiveObjects) return;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(activeModelInstance.interactiveObjects, true);

  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    const organelleId = hitObj.userData?.organelleId || hitObj.parent?.userData?.organelleId;

    if (organelleId) {
      const targetTag = structureTagsContainer?.querySelector(`[data-structure-id="${organelleId}"]`);
      if (targetTag) {
        targetTag.click();
      }
    }
  }
}

/**
 * 顯示快顯狀態吐司
 */
function showToast(msg) {
  if (!toastNotification) return;
  toastNotification.textContent = msg;
  toastNotification.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 2200);
}

/**
 * 視窗大小自適應縮放
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * 主動畫循環
 */
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // 更新 OrbitControls 阻尼與自轉
  controls.update();

  // 執行相機過渡平滑插值
  if (cameraTween.active) {
    cameraTween.progress += delta * 2.2;
    const t = Math.min(cameraTween.progress, 1.0);
    // Smooth step ease-out
    const ease = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(cameraTween.startPos, cameraTween.targetPos, ease);
    controls.target.lerpVectors(cameraTween.startLook, cameraTween.targetLook, ease);

    if (t >= 1.0) {
      cameraTween.active = false;
    }
  }

  // 驅動當前模型的動態動畫（如膜的波浪、分子擴散等）
  if (activeModelInstance && activeModelInstance.update) {
    activeModelInstance.update(elapsedTime, delta);
  }

  renderer.render(scene, camera);
}

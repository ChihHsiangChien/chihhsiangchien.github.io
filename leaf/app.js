/**
 * 葉片橫切面微觀解剖 - 主應用程式控制邏輯 (app.js)
 * 負責 Three.js 場景建置、光影、相機視角轉場、射線拾取互動、UI控制項連動
 */

class LeafApp {
  constructor() {
    this.container = document.getElementById('canvas-wrapper');
    this.canvas = document.getElementById('webgl-canvas');

    // 狀態
    this.selectedEntityKey = 'mesophyll_palisade'; // 預設聚焦構造
    this.hoveredMesh = null;
    this.autoRotate = false;
    this.activePreset = 'overview';
    this.perfMode = false; // 極速效能模式狀態

    // 3D 核心
    this.initThree();
    this.initLights();
    
    // 初始化葉片 3D 解剖模型
    this.leaf = new LeafModel(this.scene);

    // 射線檢測
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // UI 事件與動態生成
    this.initUI();
    this.initStructureTree();
    this.selectEntity('mesophyll_palisade'); // 預設展示柵狀組織

    // 視窗監聽
    window.addEventListener('resize', this.onResize.bind(this));
    
    // 啟動主渲染迴圈
    this.clock = new THREE.Clock();
    this.animate();
  }

  /* ==========================================================================
     Three.js 場景、相機與渲染器設定
     ========================================================================== */
  initThree() {
    // 1. 場景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);

    // 2. 相機
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 200);
    this.camera.position.set(32, 20, 26);

    // 3. 渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    // 渲染效能優化：限制 pixelRatio 為 1.5，避免 4K / 2K 筆電高解析度下 GPU 填充率 (Fillrate) 過載
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. 軌道控制器
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 80;
    this.controls.minDistance = 6;
    this.controls.target.set(0, 0, 0);

  }

  /* ==========================================================================
     光源系統：模擬自然日光與顯微鏡冷光立體雕琢
     ========================================================================== */
  initLights() {
    // 1. 環境光 (天光與地光)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x064e3b, 0.7);
    this.scene.add(hemiLight);

    // 2. 主直射日光 (模擬光合作用照射方向，由上方斜射)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    sunLight.position.set(20, 40, 25);
    sunLight.castShadow = true;
    // 陰影貼圖優化：調整為 1024x1024，在維持柔和陰影品質的同時，節省 75% 陰影記憶體與顯存頻寬
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 3. 補光與邊緣光 (加強透明細胞壁晶瑩輪廓)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-25, 10, -25);
    this.scene.add(rimLight);

    const bottomGlow = new THREE.PointLight(0x10b981, 0.8, 35);
    bottomGlow.position.set(-6, -8, 2);
    this.scene.add(bottomGlow);
  }

  /* ==========================================================================
     相機預設視角切換 (TWEEN 平滑轉場)
     ========================================================================== */
  /* ==========================================================================
     相機視角跳轉 (整合全景與各構造特寫導覽)
     ========================================================================== */
  jumpToEntityView(entityKey) {
    this.activeEntityKey = entityKey;

    const views = {
      overview:           { pos: { x: 30, y: 18, z: 24 },   target: { x: 0, y: 0, z: 0 } },
      cuticle_upper:      { pos: { x: 8, y: 16, z: 18 },    target: { x: 0, y: 7.0, z: 0 } },
      epidermis_upper:    { pos: { x: 10, y: 15, z: 16 },   target: { x: 0, y: 6.0, z: 0 } },
      mesophyll_palisade: { pos: { x: 0, y: 15, z: 18 },    target: { x: 0, y: 3.2, z: 0 } },
      mesophyll_spongy:   { pos: { x: 12, y: -2, z: 18 },   target: { x: 0, y: -2.0, z: 0 } },
      guard_cells:        { pos: { x: -8, y: -10, z: 8 },   target: { x: -6, y: -5.4, z: 0 } },
      stoma_pore:         { pos: { x: -7, y: -9, z: 7 },    target: { x: -6, y: -5.4, z: 0 } },
      chloroplasts:       { pos: { x: -3, y: 11, z: 14 },   target: { x: -1, y: 3.2, z: 0 } },
      xylem:              { pos: { x: 0, y: 4, z: 16 },     target: { x: 0, y: 1.2, z: 0 } },
      phloem:             { pos: { x: 0, y: -3, z: 16 },    target: { x: 0, y: -1.0, z: 0 } },
      bundle_sheath:      { pos: { x: -3, y: 3, z: 19 },    target: { x: 0, y: 0.2, z: 0 } },
      epidermis_lower:    { pos: { x: 10, y: -12, z: 15 },  target: { x: 0, y: -5.5, z: 0 } },
      cuticle_lower:      { pos: { x: 6, y: -13, z: 13 },   target: { x: 0, y: -6.5, z: 0 } }
    };

    const targetView = views[entityKey] || views.overview;
    this.animateCameraTo(targetView.pos, targetView.target, 1200);

    // 若跳轉特定構造且該構造隱藏中，自動恢復其顯示
    if (entityKey !== 'overview' && this.visibilityState && !this.visibilityState[entityKey]) {
      this.visibilityState[entityKey] = true;
      this.leaf.setEntityVisible(entityKey, true);
    }

    this.updateTreeNodesUI();
  }

  animateCameraTo(targetPos, targetLookAt, duration = 1000) {
    if (typeof TWEEN === 'undefined') {
      this.camera.position.set(targetPos.x, targetPos.y, targetPos.z);
      this.controls.target.set(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      return;
    }

    new TWEEN.Tween(this.camera.position)
      .to(targetPos, duration)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(targetLookAt, duration)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  /* ==========================================================================
     組織選取與樹狀清單狀態
     ========================================================================== */
  selectEntity(entityKey) {
    this.jumpToEntityView(entityKey);
  }

  /* ==========================================================================
     UI 互動事件綁定
     ========================================================================== */
  initUI() {
    // 1. 氣孔開合滑桿 (Stoma Slider: 0 ~ 100)
    const stomaSlider = document.getElementById('stoma-slider');
    const stomaPctLabel = document.getElementById('stoma-pct-label');

    const updateStomaUI = (val) => {
      const aperture = val / 100;
      this.leaf.updateStomaAperture(aperture);
      stomaPctLabel.textContent = `${val}%`;

      // 快速按鈕狀態
      document.getElementById('btn-stoma-close').classList.toggle('active', val === 0);
      document.getElementById('btn-stoma-half').classList.toggle('active', val === 50);
      document.getElementById('btn-stoma-open').classList.toggle('active', val === 100);
    };

    stomaSlider.addEventListener('input', (e) => {
      updateStomaUI(parseInt(e.target.value, 10));
    });

    document.getElementById('btn-stoma-close').addEventListener('click', () => {
      stomaSlider.value = 0;
      updateStomaUI(0);
    });
    document.getElementById('btn-stoma-half').addEventListener('click', () => {
      stomaSlider.value = 50;
      updateStomaUI(50);
    });
    document.getElementById('btn-stoma-open').addEventListener('click', () => {
      stomaSlider.value = 100;
      updateStomaUI(100);
    });

    // 2. 爆炸分解視圖滑桿 (Exploded View)
    const explodeSlider = document.getElementById('explode-slider');
    const explodePctLabel = document.getElementById('explode-pct-label');
    explodeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      explodePctLabel.textContent = `${val}%`;
      this.leaf.updateExplodedView(val / 100);
    });

    // 3. 特效開關
    document.getElementById('toggle-xray').addEventListener('change', (e) => {
      this.leaf.setXRayMode(e.target.checked);
    });

    document.getElementById('toggle-chloroplast-glow').addEventListener('change', (e) => {
      this.leaf.setChloroplastGlow(e.target.checked);
    });

    document.getElementById('toggle-particles').addEventListener('change', (e) => {
      this.leaf.gasParticles.visible = e.target.checked;
    });

    document.getElementById('toggle-vein-flow').addEventListener('change', (e) => {
      this.leaf.veinParticles.visible = e.target.checked;
    });

    // 4. 旋轉與重置視角
    const autoRotateBtn = document.getElementById('btn-toggle-autorotate');
    autoRotateBtn.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 1.2;
      autoRotateBtn.classList.toggle('active', this.autoRotate);
    });

    document.getElementById('btn-reset-view').addEventListener('click', () => {
      this.jumpToEntityView('overview');
    });

    // 5. 重置所有過濾、聚焦與顯示
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
      this.focusedEntityKey = null;
      this.leaf.resetHighlight();
      for (const key of Object.keys(window.LEAF_ANATOMY_DATA)) {
        this.leaf.setEntityVisible(key, true);
        if (this.visibilityState) {
          this.visibilityState[key] = true;
        }
      }
      this.jumpToEntityView('overview');
    });

    // 6. 控制面板顯示 / 隱藏切換 (收合與展開)
    const sidebar = document.getElementById('sidebar-controls');
    const floatingBtn = document.getElementById('btn-floating-sidebar');
    const headerToggleBtn = document.getElementById('btn-toggle-sidebar');
    const closeSidebarBtn = document.getElementById('btn-close-sidebar');

    const toggleSidebar = (forceOpen) => {
      const willBeOpen = (forceOpen !== undefined) ? forceOpen : sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', !willBeOpen);
      document.body.classList.toggle('sidebar-collapsed', !willBeOpen);
      if (floatingBtn) floatingBtn.classList.toggle('hidden', willBeOpen);
      if (headerToggleBtn) headerToggleBtn.classList.toggle('active', willBeOpen);
    };

    if (headerToggleBtn) {
      headerToggleBtn.addEventListener('click', () => toggleSidebar());
    }
    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    }
    if (floatingBtn) {
      floatingBtn.addEventListener('click', () => toggleSidebar(true));
    }

    // 7. 極速效能模式 (Performance Mode Toggle)
    const perfBtn = document.getElementById('btn-toggle-perf');
    const perfToggle = document.getElementById('toggle-perf-mode');
    const togglePerf = (val) => {
      this.setPerformanceMode(val !== undefined ? val : !this.perfMode);
    };

    if (perfBtn) {
      perfBtn.addEventListener('click', () => togglePerf());
    }
    if (perfToggle) {
      perfToggle.addEventListener('change', (e) => togglePerf(e.target.checked));
    }

    // 畫布滑鼠移動懸停提示 (Raycasting Tooltip) - 採用 requestAnimationFrame 節流，防範高回報率電競滑鼠 CPU 負載
    this.mouseMovePending = false;
    this.canvas.addEventListener('mousemove', (e) => {
      this.lastMouseEvt = e;
      if (!this.mouseMovePending) {
        this.mouseMovePending = true;
        requestAnimationFrame(() => {
          if (this.lastMouseEvt) this.onMouseMove(this.lastMouseEvt);
          this.mouseMovePending = false;
        });
      }
    });
  }

  /* ==========================================================================
     極速效能模式 (Performance Mode): 關閉陰影貼圖與粒子計算，在老舊電腦上實現 60 FPS
     ========================================================================== */
  setPerformanceMode(enable) {
    this.perfMode = enable;

    // 1. 關閉/開啟即時陰影投射 (最耗費 GPU 幾何 Pass 的運算)
    this.renderer.shadowMap.enabled = !enable;
    if (this.sunLight) {
      this.sunLight.castShadow = !enable;
    }

    // 2. 調節解析度比率 (效能模式下使用 1:1 原生無縮放，節省頻寬)
    this.renderer.setPixelRatio(enable ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

    // 3. 關閉粒子動畫
    if (this.leaf.gasParticles) this.leaf.gasParticles.visible = !enable;
    if (this.leaf.veinParticles) this.leaf.veinParticles.visible = !enable;

    // 4. 更新各材質狀態
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = !enable;
        if (obj.material) obj.material.needsUpdate = true;
      }
    });

    // 5. 同步 UI 按鈕狀態
    const perfBtn = document.getElementById('btn-toggle-perf');
    if (perfBtn) perfBtn.classList.toggle('active', enable);
    const perfToggle = document.getElementById('toggle-perf-mode');
    if (perfToggle) perfToggle.checked = enable;
  }

  /* ==========================================================================
     組織構造集中控制樹 (整合名稱跳轉視角、顏色圖例、顯示/隱藏與聚焦隔離)
     ========================================================================== */
  initStructureTree() {
    const listContainer = document.getElementById('structures-tree-list');
    listContainer.innerHTML = '';

    this.visibilityState = {};
    this.focusedEntityKey = null;
    this.activeEntityKey = 'overview';

    // 1. 首項：全景橫切導覽 (快速回全景)
    const overviewNode = document.createElement('div');
    overviewNode.className = 'tree-node overview-node';
    overviewNode.dataset.key = 'overview';
    overviewNode.innerHTML = `
      <div class="node-info-left" title="點選跳轉至標準橫切全景視角">
        <span class="node-color-tag" style="background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.6);"></span>
        <div class="node-title-group">
          <span class="node-name"><i class="fa-solid fa-cube"></i> 全景橫切視角</span>
          <span class="node-sub">Overview Model</span>
        </div>
      </div>
      <div class="node-actions">
        <button class="node-action-btn btn-focus" title="還原全景與重置聚焦">
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
    `;

    overviewNode.querySelector('.node-info-left').addEventListener('click', () => {
      this.focusedEntityKey = null;
      this.leaf.resetHighlight();
      this.jumpToEntityView('overview');
    });

    overviewNode.querySelector('.btn-focus').addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusedEntityKey = null;
      this.leaf.resetHighlight();
      this.jumpToEntityView('overview');
    });

    listContainer.appendChild(overviewNode);

    // 2. 各個解剖構造項目 (帶顏色圖例、名稱跳轉、聚焦隔離、顯示隱藏)
    const entities = Object.values(window.LEAF_ANATOMY_DATA);

    entities.forEach(item => {
      this.visibilityState[item.id] = true;

      const node = document.createElement('div');
      node.className = 'tree-node';
      node.dataset.key = item.id;

      node.innerHTML = `
        <div class="node-info-left" title="點選名稱直接跳轉鏡頭至 ${item.nameZh}">
          <span class="node-color-tag" style="background: ${item.color};"></span>
          <div class="node-title-group">
            <span class="node-name">${item.nameZh}</span>
            <span class="node-sub">${item.category}</span>
          </div>
        </div>
        <div class="node-actions">
          <button class="node-action-btn btn-focus" title="聚焦隔離此構造 (其他弱化)">
            <i class="fa-solid fa-crosshairs"></i>
          </button>
          <button class="node-action-btn btn-visibility" title="切換顯示/隱藏">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      `;

      // 點選左側構造名稱直接跳轉鏡頭
      node.querySelector('.node-info-left').addEventListener('click', () => {
        this.jumpToEntityView(item.id);
      });

      // 點選聚焦按鈕 (單獨高亮/隔離)
      node.querySelector('.btn-focus').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.focusedEntityKey === item.id) {
          this.focusedEntityKey = null;
          this.leaf.resetHighlight();
        } else {
          this.focusedEntityKey = item.id;
          this.leaf.highlightEntity(item.id);
          if (!this.visibilityState[item.id]) {
            this.visibilityState[item.id] = true;
            this.leaf.setEntityVisible(item.id, true);
          }
        }
        this.updateTreeNodesUI();
      });

      // 點選顯示/隱藏切換
      node.querySelector('.btn-visibility').addEventListener('click', (e) => {
        e.stopPropagation();
        const isVis = !this.visibilityState[item.id];
        this.visibilityState[item.id] = isVis;
        this.leaf.setEntityVisible(item.id, isVis);

        if (!isVis && this.focusedEntityKey === item.id) {
          this.focusedEntityKey = null;
          this.leaf.resetHighlight();
        }
        this.updateTreeNodesUI();
      });

      listContainer.appendChild(node);
    });

    this.updateTreeNodesUI();
  }

  /* ==========================================================================
     更新構造清單 UI 狀態 (視角選中、隱藏、聚焦高亮)
     ========================================================================== */
  updateTreeNodesUI() {
    document.querySelectorAll('.tree-node').forEach(node => {
      const key = node.dataset.key;
      if (key === 'overview') {
        node.classList.toggle('active-view', this.activeEntityKey === 'overview');
        return;
      }

      const isVisible = this.visibilityState ? this.visibilityState[key] !== false : true;
      const isFocused = this.focusedEntityKey === key;
      const isActiveView = this.activeEntityKey === key;

      node.classList.toggle('hidden-node', !isVisible);
      node.classList.toggle('active-view', isActiveView);
      node.classList.toggle('highlighted', isFocused);

      const focusBtn = node.querySelector('.btn-focus');
      if (focusBtn) {
        focusBtn.classList.toggle('active-focus', isFocused);
        focusBtn.title = isFocused ? '取消聚焦隔離' : '聚焦隔離此構造 (其他弱化)';
      }

      const eyeBtn = node.querySelector('.btn-visibility');
      if (eyeBtn) {
        eyeBtn.classList.toggle('is-hidden', !isVisible);
        eyeBtn.title = isVisible ? '點擊隱藏' : '點擊顯示';
        const eyeIcon = eyeBtn.querySelector('i');
        if (eyeIcon) {
          eyeIcon.className = isVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash is-hidden';
        }
      }
    });
  }

  /* ==========================================================================
     滑鼠射線檢測與懸停提示 (Raycasting & Tooltips)
     ========================================================================== */
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.leaf.pickableMeshes, true);

    const tooltip = document.getElementById('hover-tooltip');

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const key = hitMesh.userData.entityKey;
      const data = window.LEAF_ANATOMY_DATA[key];

      if (data) {
        tooltip.querySelector('.tooltip-title').textContent = data.nameZh;
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY}px`;
        tooltip.classList.remove('hidden');
        return;
      }
    }

    tooltip.classList.add('hidden');
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /* ==========================================================================
     主渲染迴圈 Animate Loop
     ========================================================================== */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // 更新 TWEEN 動畫
    if (typeof TWEEN !== 'undefined') {
      TWEEN.update();
    }

    // 更新控制器
    this.controls.update();

    // 粒子系統更新
    this.leaf.animateParticles(delta);

    // 渲染場景
    this.renderer.render(this.scene, this.camera);
  }
}

// 頁面載入後自動啟動
window.addEventListener('DOMContentLoaded', () => {
  window.leafApp = new LeafApp();
});

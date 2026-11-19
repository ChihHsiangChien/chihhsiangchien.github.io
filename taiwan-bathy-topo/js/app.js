/**
 * Taiwan 3D Topography & Bathymetry Visualizer
 * Main Application Controller (Zero-Build Static Web Architecture)
 */

class App {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Core Managers
    this.terrain = null;
    this.water = null;
    this.profile = null;
    this.landmarks = null;

    // Compass & HUD state
    this.compassNeedle = document.getElementById('compass-needle');

    this.initWebGL();
    this.initManagers();
  }

  initWebGL() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.0035);

    // 2. Camera (Perspective)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1000);
    // Initial perspective viewpoint looking across Taiwan from Southwest to Northeast
    this.camera.position.set(-30, 90, 110);

    // 3. Renderer with high performance & touch configuration
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = false; // Custom shader handles directional hillshading

    // 4. OrbitControls with Touch-Screen Optimizations
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent flipping beneath the earth
    this.controls.minDistance = 8.0;
    this.controls.maxDistance = 280.0;
    this.controls.target.set(0, 0, 0);

    // Touch controls mapping: 1 finger rotate, 2 fingers pinch-zoom & pan
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Responsive Resize Listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  async initManagers() {
    try {
      // 1. Terrain Manager
      this.terrain = new TerrainManager(this.scene);

      // Loading Screen Progress callback
      const loadingBar = document.getElementById('loading-bar-inner');
      const loadingText = document.getElementById('loading-status-text');
      const updateProgress = (pct, text) => {
        if (loadingBar) loadingBar.style.width = `${pct * 100}%`;
        if (loadingText) loadingText.textContent = text;
      };

      const meta = await this.terrain.load(updateProgress);

      // 2. Water Simulation
      this.water = new WaterSimulation(this.scene, this.terrain);
      this.water.setPresets(meta.waterPresets);

      // 3. Profile Analyzer
      this.profile = new ProfileAnalyzer(this.scene, this.camera, this.renderer, this.terrain, this.water);

      // 4. Landmarks Manager
      this.landmarks = new LandmarkManager(this.scene, this.camera, this.renderer, this.terrain, this.controls);
      this.landmarks.setLandmarks(meta.landmarks);

      // Setup UI Controls & Preset Buttons
      this.setupUI(meta);

      // Hide loading screen
      setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('fade-out');
      }, 300);

      // Start Render Loop
      this.animate();

    } catch (err) {
      console.error("Initialization error:", err);
      const loadingText = document.getElementById('loading-status-text');
      if (loadingText) {
        loadingText.textContent = "載入失敗：" + err.message;
        loadingText.style.color = "#e63946";
      }
    }
  }

  setupUI(meta) {
    this.setupTabs();
    this.setupWaterControls(meta.waterPresets);
    this.setupTerrainControls();
    this.setupCameraBar();
    this.setupPanelToggle();
    this.setupCompassWidget();
    this.setupFullscreen();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.panel-tabs .tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  setupWaterControls(presets) {
    const slider = document.getElementById('slider-water-level');
    const inputNumber = document.getElementById('input-water-level');
    const btnInc = document.getElementById('btn-water-inc');
    const btnDec = document.getElementById('btn-water-dec');
    const presetGrid = document.getElementById('water-preset-buttons');
    const animPlayBtn = document.getElementById('btn-anim-play');
    const animModeQuickBtn = document.getElementById('btn-toggle-animation');
    const animSpeedSelect = document.getElementById('select-anim-speed');
    const animScenarioSelect = document.getElementById('select-anim-scenario');
    const animBadge = document.getElementById('anim-status-badge');
    const scenarioDesc = document.getElementById('water-scenario-desc');

    // Piecewise mapping control points: (slider_pos 0..1000, meters)
    // 0 -> -7000m (trench)
    // 250 -> -2000m (trough)
    // 500 -> -120m (ice age land bridge)
    // 750 -> 0m (modern datum - 75% track width, perfectly aligning with 0m tick!)
    // 1000 -> 100m (extreme sea level rise)
    const points = [
      { s: 0, m: -7000 },
      { s: 250, m: -2000 },
      { s: 500, m: -120 },
      { s: 750, m: 0 },
      { s: 1000, m: 100 }
    ];

    const sliderToMeters = (s) => {
      s = Math.max(0, Math.min(1000, s));
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        if (s <= p1.s) {
          const t = (s - p0.s) / (p1.s - p0.s);
          return Math.round(p0.m + t * (p1.m - p0.m));
        }
      }
      return points[points.length - 1].m;
    };

    const metersToSlider = (m) => {
      m = Math.max(-7000, Math.min(100, m));
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        if (m <= p1.m) {
          const t = (m - p0.m) / (p1.m - p0.m);
          return Math.round(p0.s + t * (p1.s - p0.s));
        }
      }
      return points[points.length - 1].s;
    };

    const setLevelFromInput = (val, animate = false) => {
      let num = parseInt(val, 10);
      if (isNaN(num)) num = 0;
      num = Math.max(-7000, Math.min(100, num));
      if (inputNumber) inputNumber.value = num;
      if (slider) slider.value = metersToSlider(num);
      this.water.setWaterLevel(num, animate);
      if (this.water.isAnimating) {
        this.water.toggleAnimation(false);
        this.syncAnimUI();
      }
    };

    // Direct number typing
    if (inputNumber) {
      inputNumber.addEventListener('change', (e) => {
        setLevelFromInput(e.target.value, true);
      });
      inputNumber.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          setLevelFromInput(e.target.value, false);
          inputNumber.blur();
        }
      });
    }

    // Step buttons
    if (btnInc) {
      btnInc.addEventListener('click', (e) => {
        const step = e.shiftKey ? 10 : 1;
        const cur = parseInt(inputNumber.value, 10) || 0;
        setLevelFromInput(cur + step, false);
      });
    }
    if (btnDec) {
      btnDec.addEventListener('click', (e) => {
        const step = e.shiftKey ? 10 : 1;
        const cur = parseInt(inputNumber.value, 10) || 0;
        setLevelFromInput(cur - step, false);
      });
    }

    // Slider input with piecewise non-linear scaling
    if (slider) {
      slider.addEventListener('input', (e) => {
        const sliderVal = parseFloat(e.target.value);
        const meters = sliderToMeters(sliderVal);
        if (inputNumber) inputNumber.value = meters;
        this.water.setWaterLevel(meters, false);
        // Stop auto animation when manually adjusting slider
        if (this.water.isAnimating) {
          this.water.toggleAnimation(false);
          this.syncAnimUI();
        }
      });
    }

    // Populate Water Presets Grid
    if (presets && presetGrid) {
      presets.forEach(p => {
        const card = document.createElement('div');
        card.className = `water-preset-card ${p.level === 0 ? 'active' : ''}`;
        card.dataset.level = p.level;

        card.innerHTML = `
          <div class="preset-card-head">
            <span class="preset-card-title">${p.title}</span>
            <span class="preset-badge">${p.subtitle}</span>
          </div>
          <p class="preset-card-desc">${p.desc}</p>
        `;

        card.addEventListener('click', () => {
          document.querySelectorAll('.water-preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          setLevelFromInput(p.level, true); // Smooth lerp transition
          if (scenarioDesc) scenarioDesc.textContent = p.desc;
        });

        presetGrid.appendChild(card);
      });
    }

    // Slider tick clicks
    document.querySelectorAll('.slider-ticks span').forEach(tick => {
      tick.addEventListener('click', () => {
        const val = parseFloat(tick.dataset.val);
        setLevelFromInput(val, true);
      });
    });

    // Animation Controls
    const toggleAnimation = () => {
      const isRunning = this.water.toggleAnimation();
      this.syncAnimUI();
    };

    animPlayBtn.addEventListener('click', toggleAnimation);
    animModeQuickBtn.addEventListener('click', toggleAnimation);

    animSpeedSelect.addEventListener('change', (e) => {
      this.water.setAnimationSpeed(e.target.value);
    });

    animScenarioSelect.addEventListener('change', (e) => {
      this.water.setAnimationScenario(e.target.value);
    });

    // Listen to water change event to sync UI slider & stats
    window.addEventListener('waterchange', (e) => {
      const { level, stats } = e.detail;
      const rounded = Math.round(level);
      if (inputNumber) inputNumber.value = rounded;
      if (slider) slider.value = metersToSlider(rounded);

      // Update Environmental stats
      document.getElementById('stat-land-percent').textContent = `${stats.landPercent}%`;
      document.getElementById('stat-strait-state').textContent = stats.straitState;
      document.getElementById('stat-taipei-state').textContent = stats.taipeiState;
    });
  }

  syncAnimUI() {
    const isPlaying = this.water.isAnimating;
    const playBtn = document.getElementById('btn-anim-play');
    const badge = document.getElementById('anim-status-badge');
    const iconPlay = document.getElementById('icon-anim-play');
    const iconPause = document.getElementById('icon-anim-pause');
    const btnText = document.getElementById('anim-btn-text');

    if (isPlaying) {
      if (playBtn) playBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>暫停演示</span>
      `;
      if (badge) {
        badge.textContent = "演示播放中";
        badge.className = "badge playing";
      }
      if (iconPlay) iconPlay.classList.add('hidden');
      if (iconPause) iconPause.classList.remove('hidden');
      if (btnText) btnText.textContent = "暫停演示";
    } else {
      if (playBtn) playBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>播放演示</span>
      `;
      if (badge) {
        badge.textContent = "已暫停";
        badge.className = "badge";
      }
      if (iconPlay) iconPlay.classList.remove('hidden');
      if (iconPause) iconPause.classList.add('hidden');
      if (btnText) btnText.textContent = "動態演變動畫";
    }
  }

  setupTerrainControls() {
    // 1. Vertical Exaggeration Slider & Chips
    const sliderExag = document.getElementById('slider-exaggeration');
    const displayExag = document.getElementById('exaggeration-display');
    const exagChips = document.querySelectorAll('.preset-chips .chip');

    const updateExaggeration = (val) => {
      const num = parseFloat(val);
      displayExag.textContent = `${num.toFixed(1)}x`;
      sliderExag.value = num;
      this.terrain.setExaggeration(num);
      this.water.updateMeshPosition();
      this.profile.setExaggeration(num);

      // Real-time update to on-screen badges across the canvas & header
      const strVal = `${num.toFixed(1)}x`;
      const headerVal = document.getElementById('header-exag-val');
      const hudVal = document.getElementById('onscreen-exag-val');
      const coordVal = document.getElementById('hud-coord-exag');
      if (headerVal) headerVal.textContent = strVal;
      if (hudVal) hudVal.textContent = strVal;
      if (coordVal) coordVal.textContent = strVal;

      exagChips.forEach(chip => {
        chip.classList.toggle('active', parseFloat(chip.dataset.exag) === num);
      });
    };

    sliderExag.addEventListener('input', (e) => {
      updateExaggeration(e.target.value);
    });

    exagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        updateExaggeration(chip.dataset.exag);
      });
    });

    // 2. Color Themes
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.terrain.setTheme(card.dataset.theme);
      });
    });

    // 3. Contours & Isobaths
    const toggleContours = document.getElementById('toggle-contours');
    const selectInterval = document.getElementById('select-contour-interval');
    const sliderOpacity = document.getElementById('slider-contour-opacity');
    const contourOptions = document.getElementById('contour-options');

    const updateContours = () => {
      const enabled = toggleContours.checked;
      const interval = selectInterval.value;
      const opacity = sliderOpacity.value;
      this.terrain.setContours(enabled, interval, opacity);
      contourOptions.style.display = enabled ? 'flex' : 'none';
    };

    toggleContours.addEventListener('change', updateContours);
    selectInterval.addEventListener('change', updateContours);
    sliderOpacity.addEventListener('input', updateContours);

    // 4. Sun Angle Slider
    const sliderSun = document.getElementById('slider-sun-angle');
    const sunDisplay = document.getElementById('sun-angle-display');
    sliderSun.addEventListener('input', (e) => {
      const angle = parseFloat(e.target.value);
      sunDisplay.textContent = `${angle}°`;
      this.terrain.setSunAngle(angle);
    });

    // 5. Water Mesh Visibility Toggle
    const toggleWaterMesh = document.getElementById('toggle-water-mesh');
    toggleWaterMesh.addEventListener('change', (e) => {
      this.water.setVisible(e.target.checked);
    });
  }

  setupCameraBar() {
    const camButtons = {
      'cam-perspective': { pos: [-30, 90, 110], target: [0, 0, 0] },
      'cam-topdown': { pos: [0, 160, 0.001], target: [0, 0, 0] },
      'cam-eastwest': { pos: [-130, 20, 0], target: [0, 0, 0] }, // Looking across Taiwan Strait towards Ryukyu Trench
      'cam-northsouth': { pos: [0, 30, 130], target: [0, 0, 0] }, // Looking along island arc
      'cam-reset': { pos: [-30, 90, 110], target: [0, 0, 0] }
    };

    Object.keys(camButtons).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#camera-bar .btn-icon').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cfg = camButtons[btnId];
        this.smoothMoveCamera(new THREE.Vector3(...cfg.pos), new THREE.Vector3(...cfg.target));
      });
    });
  }

  smoothMoveCamera(targetPos, lookAtTarget, duration = 1000) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animateCam = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, lookAtTarget, ease);

      if (progress < 1.0) {
        requestAnimationFrame(animateCam);
      }
    };
    requestAnimationFrame(animateCam);
  }

  setupPanelToggle() {
    const panel = document.getElementById('control-panel');
    const toggleBtn = document.getElementById('btn-panel-toggle');
    const closeBtn = document.getElementById('btn-panel-close');

    const updateToggleUI = () => {
      if (!toggleBtn) return;
      const isOpen = panel.classList.contains('open');
      const iconOpen = toggleBtn.querySelector('.icon-toggle-open');
      const iconClosed = toggleBtn.querySelector('.icon-toggle-closed');
      const label = toggleBtn.querySelector('.dock-label');

      if (isOpen) {
        if (iconOpen) iconOpen.classList.remove('hidden');
        if (iconClosed) iconClosed.classList.add('hidden');
        if (label) label.textContent = '收合';
        toggleBtn.title = '收合控制台';
      } else {
        if (iconOpen) iconOpen.classList.add('hidden');
        if (iconClosed) iconClosed.classList.remove('hidden');
        if (label) label.textContent = '控制台';
        toggleBtn.title = '展開控制台';
      }
    };

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        updateToggleUI();
      });
    }

    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        updateToggleUI();
      });
    }
  }

  setupCompassWidget() {
    const compass = document.getElementById('compass-widget');
    if (compass) {
      compass.addEventListener('click', () => {
        // Reset camera rotation to face True North (positive Z to negative Z)
        const curDist = this.camera.position.distanceTo(this.controls.target);
        const curPolar = this.controls.getPolarAngle();
        const targetPos = new THREE.Vector3(
          0,
          curDist * Math.cos(curPolar),
          curDist * Math.sin(curPolar)
        ).add(this.controls.target);

        this.smoothMoveCamera(targetPos, this.controls.target);
      });
    }
  }

  setupFullscreen() {
    const btn = document.getElementById('btn-fullscreen');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const now = performance.now();

    // Update Controls
    this.controls.update();

    // Update Water Simulation
    if (this.water) this.water.update(delta);

    // Update Landmarks (Camera Flight & Screen Projections)
    if (this.landmarks) this.landmarks.update(now);

    // Update Compass Needle Rotation
    if (this.compassNeedle) {
      const azimuth = this.controls.getAzimuthalAngle();
      const deg = THREE.MathUtils.radToDeg(azimuth);
      this.compassNeedle.style.transform = `rotate(${-deg}deg)`;
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

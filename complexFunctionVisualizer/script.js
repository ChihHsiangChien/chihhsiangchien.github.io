(() => {
  'use strict';

  class ComplexFunctionVisualizer {
    constructor() {
      this.gamma = 0.5;
      this.t0 = 1.5;
      this.omega = 2 * Math.PI;
      this.isRunning = false;
      this.time = 0;
      this.tMax = 4.0;
      this.timeDirection = 1;
      this.projectionSize = 1.6;
      this.gridSize = 3.6;
      this.gridDivisions = 18;

      // Camera spherical orbit state
      this.camRadius = 5.2;
      this.camAzimuth = (35 * Math.PI) / 180;
      this.camElevation = 0.42;

      this.trailPoints = [];
      this.maxTrailPoints = 120;

      this.initDOM();
      this.initScenes();
      this.createVisualizationElements();
      this.setupEventListeners();
      this.createCurve();
      this.updateCurve();
      this.onWindowResize();
      this.animate();
    }

    initDOM() {
      this.startBtn = document.getElementById('startBtn');
      this.resetBtn = document.getElementById('resetBtn');
      this.timeSlider = document.getElementById('timeSlider');
      this.rotationSlider = document.getElementById('rotationSlider');
      this.omegaSlider = document.getElementById('omegaSlider');
      this.gammaSlider = document.getElementById('gammaSlider');
      this.t0Slider = document.getElementById('t0Slider');

      this.lblTime = document.getElementById('lbl-time');
      this.lblRot = document.getElementById('lbl-rot');
      this.lblOmega = document.getElementById('lbl-omega');
      this.lblGamma = document.getElementById('lbl-gamma');
      this.lblT0 = document.getElementById('lbl-t0');

      this.valT = document.getElementById('val-t');
      this.valRe = document.getElementById('val-re');
      this.valIm = document.getElementById('val-im');
      this.valMag = document.getElementById('val-mag');
    }

    initScenes() {
      const bg = new THREE.Color(0x0d1322);

      // Main 3D scene
      this.scene = new THREE.Scene();
      this.scene.background = bg;
      this.camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 100);
      this.renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('mainCanvas'),
        antialias: true
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.updateCameraPosition();

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      const pointLight = new THREE.PointLight(0xffffff, 0.9);
      pointLight.position.set(5, 6, 5);
      this.scene.add(ambientLight, pointLight);

      // Orthographic projection scenes
      this.xyScene = new THREE.Scene();
      this.xyScene.background = bg;
      this.xyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
      this.xyRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('projectionXY'), antialias: true });
      this.xyRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.xyCamera.position.set(0, 0, 8);
      this.xyCamera.lookAt(0, 0, 0);

      this.yzScene = new THREE.Scene();
      this.yzScene.background = bg;
      this.yzCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
      this.yzRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('projectionYZ'), antialias: true });
      this.yzRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.yzCamera.position.set(8, 0, 2);
      this.yzCamera.lookAt(0, 0, 2);
      this.yzCamera.up.set(0, 1, 0);

      this.xzScene = new THREE.Scene();
      this.xzScene.background = bg;
      this.xzCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
      this.xzRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('projectionXZ'), antialias: true });
      this.xzRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.xzCamera.position.set(0, 8, 2);
      this.xzCamera.lookAt(0, 0, 2);
      this.xzCamera.up.set(1, 0, 0);

      this.setupGridsAndAxes();
    }

    updateCameraPosition() {
      const targetZ = 1.6;
      const cosEl = Math.cos(this.camElevation);
      this.camera.position.set(
        this.camRadius * cosEl * Math.cos(this.camAzimuth),
        this.camRadius * Math.sin(this.camElevation),
        targetZ + this.camRadius * cosEl * Math.sin(this.camAzimuth)
      );
      this.camera.lookAt(0, 0, targetZ);
    }

    setupGridsAndAxes() {
      const mainGrid = new THREE.GridHelper(this.gridSize, this.gridDivisions, 0x334155, 0x1e293b);
      mainGrid.position.z = 1.8;
      this.scene.add(mainGrid);

      this.addCustomGrid(this.xyScene, this.gridSize, this.gridDivisions, 'xy');
      this.addCustomGrid(this.yzScene, this.gridSize, this.gridDivisions, 'yz');
      this.addCustomGrid(this.xzScene, this.gridSize, this.gridDivisions, 'xz');

      this.addAxesWithLabels(this.scene, 'Re', 'Im', 't');
      this.addAxesWithLabels(this.xyScene, 'Re', 'Im', '');
      this.addAxesWithLabels(this.yzScene, '', 'Im', 't');
      this.addAxesWithLabels(this.xzScene, 'Re', '', 't');
    }

    addCustomGrid(scene, size, divisions, plane) {
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.LineBasicMaterial({ color: 0x334155, opacity: 0.45, transparent: true });
      const verts = [];
      const step = size / divisions;

      for (let i = -size / 2; i <= size / 2; i += step) {
        verts.push(i, -size / 2, 0, i, size / 2, 0);
        verts.push(-size / 2, i, 0, size / 2, i, 0);
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const grid = new THREE.LineSegments(geom, mat);

      if (plane === 'yz') {
        grid.rotation.y = Math.PI / 2;
        grid.position.z = 2;
      } else if (plane === 'xz') {
        grid.rotation.x = Math.PI / 2;
        grid.position.z = 2;
      }

      scene.add(grid);
    }

    addAxesWithLabels(scene, xLabel, yLabel, zLabel) {
      const axesHelper = new THREE.AxesHelper(1.8);
      scene.add(axesHelper);

      const createLabel = (text, pos) => {
        if (!text) return null;
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 48;
        const g = c.getContext('2d');
        g.fillStyle = '#e2e8f0';
        g.font = 'bold 28px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, 48, 24);
        const tex = new THREE.CanvasTexture(c);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sprite.position.copy(pos);
        sprite.scale.set(0.55, 0.28, 1);
        return sprite;
      };

      const sx = createLabel(xLabel, new THREE.Vector3(2.0, 0, 0));
      const sy = createLabel(yLabel, new THREE.Vector3(0, 2.0, 0));
      const sz = createLabel(zLabel, new THREE.Vector3(0, 0, 2.0));
      if (sx) scene.add(sx);
      if (sy) scene.add(sy);
      if (sz) scene.add(sz);
    }

    createVisualizationElements() {
      const sphereGeom = new THREE.SphereGeometry(0.08, 24, 24);
      const particleMat = new THREE.MeshPhongMaterial({ color: 0xf43f5e, emissive: 0x881337 });

      this.particle = new THREE.Mesh(sphereGeom, particleMat);
      this.scene.add(this.particle);

      this.xyParticle = new THREE.Mesh(sphereGeom, particleMat.clone());
      this.yzParticle = new THREE.Mesh(sphereGeom, particleMat.clone());
      this.xzParticle = new THREE.Mesh(sphereGeom, particleMat.clone());
      this.xyScene.add(this.xyParticle);
      this.yzScene.add(this.yzParticle);
      this.xzScene.add(this.xzParticle);

      this.createTrail();
    }

    createTrail() {
      const mat3d = new THREE.LineBasicMaterial({ color: 0xf43f5e, opacity: 0.75, transparent: true });
      this.trail = new THREE.Line(new THREE.BufferGeometry(), mat3d);
      this.scene.add(this.trail);

      this.xyTrail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x60a5fa }));
      this.yzTrail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf87171 }));
      this.xzTrail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x34d399 }));

      this.xyScene.add(this.xyTrail);
      this.yzScene.add(this.yzTrail);
      this.xzScene.add(this.xzTrail);
    }

    calculatePoint(t) {
      const envelope = Math.exp(-this.gamma * Math.pow(t - this.t0, 2));
      const real = envelope * Math.cos(this.omega * t);
      const imag = envelope * Math.sin(this.omega * t);
      return { x: real, y: imag, z: t, magnitude: envelope };
    }

    createCurve() {
      if (this.curve) {
        this.scene.remove(this.curve);
        this.curve.geometry.dispose();
      }

      const points = [];
      const numPoints = 400;
      for (let i = 0; i <= numPoints; i++) {
        const t = (i / numPoints) * this.tMax;
        const p = this.calculatePoint(t);
        if (isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
          points.push(new THREE.Vector3(p.x, p.y, p.z));
        }
      }

      if (points.length > 1) {
        const curve3 = new THREE.CatmullRomCurve3(points);
        const geom = new THREE.TubeGeometry(curve3, 180, 0.032, 8, false);
        const mat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x075985, shininess: 90 });
        this.curve = new THREE.Mesh(geom, mat);
        this.scene.add(this.curve);
        this.createProjectionCurves(points);
      }
    }

    createProjectionCurves(points) {
      const xyPts = points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      const yzPts = points.map((p) => new THREE.Vector3(0, p.y, p.z));
      const xzPts = points.map((p) => new THREE.Vector3(p.x, 0, p.z));

      [
        ['xyProjection', this.xyScene],
        ['yzProjection', this.yzScene],
        ['xzProjection', this.xzScene]
      ].forEach(([prop, sc]) => {
        if (this[prop]) {
          sc.remove(this[prop]);
          this[prop].geometry.dispose();
        }
      });

      this.xyProjection = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(xyPts),
        new THREE.LineBasicMaterial({ color: 0x60a5fa, opacity: 0.45, transparent: true })
      );
      this.yzProjection = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(yzPts),
        new THREE.LineBasicMaterial({ color: 0xf87171, opacity: 0.45, transparent: true })
      );
      this.xzProjection = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(xzPts),
        new THREE.LineBasicMaterial({ color: 0x34d399, opacity: 0.45, transparent: true })
      );

      this.xyScene.add(this.xyProjection);
      this.yzScene.add(this.yzProjection);
      this.xzScene.add(this.xzProjection);
    }

    updateCurve() {
      const p = this.calculatePoint(this.time);
      this.particle.position.set(p.x, p.y, p.z);
      this.xyParticle.position.set(p.x, p.y, 0);
      this.yzParticle.position.set(0, p.y, p.z);
      this.xzParticle.position.set(p.x, 0, p.z);

      this.trailPoints.push(new THREE.Vector3(p.x, p.y, p.z));
      if (this.trailPoints.length > this.maxTrailPoints) this.trailPoints.shift();

      this.trail.geometry.setFromPoints(this.trailPoints);
      this.xyTrail.geometry.setFromPoints(this.trailPoints.map((pt) => new THREE.Vector3(pt.x, pt.y, 0)));
      this.yzTrail.geometry.setFromPoints(this.trailPoints.map((pt) => new THREE.Vector3(0, pt.y, pt.z)));
      this.xzTrail.geometry.setFromPoints(this.trailPoints.map((pt) => new THREE.Vector3(pt.x, 0, pt.z)));

      // Live readout sync
      this.lblTime.textContent = this.time.toFixed(2);
      this.valT.textContent = this.time.toFixed(2);
      this.valRe.textContent = p.x.toFixed(2);
      this.valIm.textContent = p.y.toFixed(2);
      this.valMag.textContent = p.magnitude.toFixed(2);
    }

    setupEventListeners() {
      // Prevent double-tap zoom without blocking pinch zoom
      document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

      this.startBtn.addEventListener('click', () => this.toggleAnimation());
      this.resetBtn.addEventListener('click', () => this.reset());

      this.timeSlider.addEventListener('input', (e) => {
        this.time = parseFloat(e.target.value) / 100;
        this.trailPoints = [];
        this.updateCurve();
      });

      this.rotationSlider.addEventListener('input', (e) => {
        const deg = parseFloat(e.target.value);
        this.camAzimuth = (deg * Math.PI) / 180;
        this.lblRot.textContent = `${Math.round(deg)}°`;
        this.updateCameraPosition();
      });

      this.omegaSlider.addEventListener('input', (e) => {
        const mult = parseFloat(e.target.value);
        this.omega = mult * Math.PI;
        this.lblOmega.textContent = `${mult.toFixed(2)}π`;
        this.createCurve();
        this.trailPoints = [];
        this.updateCurve();
      });

      this.gammaSlider.addEventListener('input', (e) => {
        this.gamma = parseFloat(e.target.value);
        this.lblGamma.textContent = this.gamma.toFixed(2);
        this.createCurve();
        this.trailPoints = [];
        this.updateCurve();
      });

      this.t0Slider.addEventListener('input', (e) => {
        this.t0 = parseFloat(e.target.value);
        this.lblT0.textContent = this.t0.toFixed(2);
        this.createCurve();
        this.trailPoints = [];
        this.updateCurve();
      });

      // Direct pointer drag-to-orbit on main 3D canvas (works with mouse, pen, and touch)
      const mainCanvas = document.getElementById('mainCanvas');
      let draggingPointerId = null;
      let lastX = 0;
      let lastY = 0;

      mainCanvas.addEventListener('pointerdown', (e) => {
        draggingPointerId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        mainCanvas.setPointerCapture(e.pointerId);
      });

      mainCanvas.addEventListener('pointermove', (e) => {
        if (e.pointerId !== draggingPointerId) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        this.camAzimuth -= dx * 0.008;
        this.camElevation = Math.max(-1.2, Math.min(1.2, this.camElevation + dy * 0.008));

        const deg = (((this.camAzimuth * 180) / Math.PI) % 360 + 360) % 360;
        this.rotationSlider.value = String(Math.round(deg));
        this.lblRot.textContent = `${Math.round(deg)}°`;
        this.updateCameraPosition();
      });

      const endDrag = (e) => {
        if (e.pointerId === draggingPointerId) {
          draggingPointerId = null;
        }
      };
      mainCanvas.addEventListener('pointerup', endDrag);
      mainCanvas.addEventListener('pointercancel', endDrag);
    }

    toggleAnimation() {
      this.isRunning = !this.isRunning;
      this.startBtn.textContent = this.isRunning ? '⏸ 暫停' : '▶ 開始';
    }

    reset() {
      this.isRunning = false;
      this.startBtn.textContent = '▶ 開始';
      this.time = 0;
      this.timeDirection = 1;
      this.timeSlider.value = '0';
      this.trailPoints = [];
      this.updateCurve();
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      if (this.isRunning) {
        this.time += 0.015 * this.timeDirection;
        if (this.time >= this.tMax) {
          this.time = this.tMax;
          this.timeDirection = -1;
        } else if (this.time <= 0) {
          this.time = 0;
          this.timeDirection = 1;
        }
        this.timeSlider.value = String(Math.round(this.time * 100));
        this.updateCurve();
      }

      this.renderer.render(this.scene, this.camera);
      this.xyRenderer.render(this.xyScene, this.xyCamera);
      this.yzRenderer.render(this.yzScene, this.yzCamera);
      this.xzRenderer.render(this.xzScene, this.xzCamera);
    }

    onWindowResize() {
      const mainCanvas = document.getElementById('mainCanvas');
      const w = Math.max(200, mainCanvas.clientWidth);
      const h = Math.max(200, mainCanvas.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);

      const projPairs = [
        [document.getElementById('projectionXY'), this.xyRenderer, this.xyCamera],
        [document.getElementById('projectionYZ'), this.yzRenderer, this.yzCamera],
        [document.getElementById('projectionXZ'), this.xzRenderer, this.xzCamera]
      ];

      projPairs.forEach(([canvasEl, renderer, cam]) => {
        const pw = Math.max(120, canvasEl.clientWidth);
        const ph = Math.max(95, canvasEl.clientHeight);
        const aspect = pw / ph;
        renderer.setSize(pw, ph, false);
        cam.left = -this.projectionSize * aspect;
        cam.right = this.projectionSize * aspect;
        cam.top = this.projectionSize;
        cam.bottom = -this.projectionSize;
        cam.updateProjectionMatrix();
      });
    }
  }

  window.addEventListener('load', () => {
    if (typeof THREE === 'undefined') return;
    const visualizer = new ComplexFunctionVisualizer();
    window.addEventListener('resize', () => visualizer.onWindowResize());
  });
})();

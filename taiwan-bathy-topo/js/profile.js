/**
 * Taiwan 3D Topography & Bathymetry Visualizer
 * Profile Module - Interactive 2D Cross-Section Elevation Graph
 * Featuring Independent 2D Pan & Zoom, 3D Raycasting & Synchronized 3D Probe
 */

class ProfileAnalyzer {
  constructor(scene, camera, renderer, terrainManager, waterSimulation) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrainManager;
    this.water = waterSimulation;

    // Selection State
    this.isActive = false; // Whether raycasting selection tool is active
    this.pointA = null; // { u, v, lat, lon, worldPos, elev }
    this.pointB = null;
    this.tempPreviewPos = null;

    // Sampled Profile Data
    this.sampleCount = 350;
    this.profileSamples = []; // Array of { distKm, elev, u, v, lat, lon, worldPos }
    this.totalDistanceKm = 0;
    this.minElev = 0;
    this.maxElev = 0;

    // 2D Viewport Transformation State (Independent Pan & Zoom)
    this.view = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      basePadding: { top: 35, bottom: 40, left: 65, right: 35 }
    };

    // 2D Canvas Drag / Touch Interaction State
    this.isDragging2D = false;
    this.dragStart = { x: 0, y: 0 };
    this.lastTouchDist = 0;
    this.hoverIndex = -1;

    // 3D Visual Objects in Three.js Scene
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);
    this.lineMesh = null;
    this.probeMesh = null;
    this.markerAMesh = null;
    this.markerBMesh = null;

    // DOM Elements
    this.panelEl = document.getElementById('profile-panel');
    this.canvas = document.getElementById('profile-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tooltipEl = document.getElementById('profile-hud-tooltip');
    this.subtitleEl = document.getElementById('profile-subtitle');
    this.modeBtn = document.getElementById('btn-profile-tool');

    this.init3DProbe();
    this.initCanvasEvents();
    this.initToolbarEvents();
    this.init3DRaycastEvents();
  }

  init3DProbe() {
    // 3D Probe sphere tracking cursor position on 2D profile
    const geo = new THREE.SphereGeometry(1.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    this.probeMesh = new THREE.Mesh(geo, mat);
    this.probeMesh.visible = false;
    this.markerGroup.add(this.probeMesh);

    // Glowing halo around probe
    const haloGeo = new THREE.RingGeometry(1.4, 2.2, 24);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    this.probeMesh.add(halo);
  }

  initToolbarEvents() {
    document.getElementById('btn-profile-zoom-in')?.addEventListener('click', () => {
      this.zoom2D(1.3, this.canvas.width / 2, this.canvas.height / 2);
    });

    document.getElementById('btn-profile-zoom-out')?.addEventListener('click', () => {
      this.zoom2D(1.0 / 1.3, this.canvas.width / 2, this.canvas.height / 2);
    });

    document.getElementById('btn-profile-reset-view')?.addEventListener('click', () => {
      this.reset2DView();
    });

    document.getElementById('btn-profile-redraw')?.addEventListener('click', () => {
      this.startSelection();
    });

    document.getElementById('btn-profile-close')?.addEventListener('click', () => {
      this.closePanel();
    });

    this.modeBtn?.addEventListener('click', () => {
      if (this.isActive) {
        this.cancelSelection();
      } else {
        this.startSelection();
      }
    });

    window.addEventListener('resize', () => {
      if (!this.panelEl.classList.contains('collapsed')) {
        this.resizeCanvas();
        this.render2DProfile();
      }
    });

    window.addEventListener('waterchange', () => {
      if (this.profileSamples.length > 0) {
        this.updateProfileStats();
        this.render2DProfile();
      }
    });
  }

  initCanvasEvents() {
    const container = document.getElementById('profile-canvas-container');

    // Mouse Wheel Zoom (independent 2D zoom centered on mouse)
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.18 : 1.0 / 1.18;
      this.zoom2D(factor, mouseX, mouseY);
    }, { passive: false });

    // Mouse Drag to Pan
    container.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.isDragging2D = true;
        this.dragStart = { x: e.clientX - this.view.panX, y: e.clientY - this.view.panY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging2D) {
        this.view.panX = e.clientX - this.dragStart.x;
        this.view.panY = e.clientY - this.dragStart.y;
        this.render2DProfile();
      } else {
        // Hover inspection
        this.handleCanvasPointerMove(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging2D = false;
    });

    container.addEventListener('mouseleave', () => {
      this.hideTooltip();
      if (this.probeMesh) this.probeMesh.visible = false;
    });

    // Touch Support for 2D Canvas (1-finger Pan & Probe, 2-finger Pinch Zoom)
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging2D = true;
        this.dragStart = { x: e.touches[0].clientX - this.view.panX, y: e.touches[0].clientY - this.view.panY };
        this.handleCanvasPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        this.isDragging2D = false;
        this.lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging2D) {
        this.view.panX = e.touches[0].clientX - this.dragStart.x;
        this.view.panY = e.touches[0].clientY - this.dragStart.y;
        this.handleCanvasPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        this.render2DProfile();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.lastTouchDist > 0) {
          const factor = dist / this.lastTouchDist;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = this.canvas.getBoundingClientRect();
          this.zoom2D(factor, midX - rect.left, midY - rect.top);
        }
        this.lastTouchDist = dist;
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      this.isDragging2D = false;
      this.lastTouchDist = 0;
    });
  }

  zoom2D(factor, focalX, focalY) {
    const newZoom = THREE.MathUtils.clamp(this.view.zoom * factor, 0.5, 12.0);
    const actualFactor = newZoom / this.view.zoom;
    this.view.zoom = newZoom;

    // Pan adjustment so zoom is centered around pointer (focalX, focalY)
    this.view.panX = focalX - (focalX - this.view.panX) * actualFactor;
    this.view.panY = focalY - (focalY - this.view.panY) * actualFactor;

    this.render2DProfile();
  }

  reset2DView() {
    this.view.zoom = 1.0;
    this.view.panX = 0;
    this.view.panY = 0;
    this.render2DProfile();
    this.showToast("已重設 2D 剖面圖至預設全覽視角");
  }

  init3DRaycastEvents() {
    const dom = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastPoint = (clientX, clientY) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      if (!this.terrain.mesh) return null;
      const intersects = raycaster.intersectObject(this.terrain.mesh);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const uv = this.terrain.worldToUV(hit.point.x, hit.point.z);
        const elev = this.terrain.sampleElevation(uv.u, uv.v);
        const { lat, lon } = this.terrain.uvToLatLon(uv.u, uv.v);
        return {
          worldPos: hit.point.clone(),
          u: uv.u,
          v: uv.v,
          elev,
          lat,
          lon
        };
      }
      return null;
    };

    // Click / Tap in 3D scene
    dom.addEventListener('pointerdown', (e) => {
      if (!this.isActive) return;
      // If clicking with primary button
      if (e.button !== 0) return;

      const hit = getRaycastPoint(e.clientX, e.clientY);
      if (!hit) return;

      if (!this.pointA) {
        // Set Point A
        this.pointA = hit;
        this.createMarkerA(hit);
        this.showToast("起點 A 已選定！請點擊 3D 地形選取終點 B");
        if (this.subtitleEl) {
          this.subtitleEl.textContent = `起點 A (${hit.lat.toFixed(2)}°N, ${hit.lon.toFixed(2)}°E) — 請選取終點 B`;
        }
      } else {
        // Set Point B and complete selection
        this.pointB = hit;
        this.createMarkerB(hit);
        this.finishSelection();
      }
    });

    // Cursor tracking during selection
    dom.addEventListener('pointermove', (e) => {
      const hit = getRaycastPoint(e.clientX, e.clientY);
      if (hit) {
        // Update Bottom Left HUD
        this.updateHUD(hit);

        // If Point A is selected, draw dynamic preview line to current cursor
        if (this.isActive && this.pointA) {
          this.drawDynamicPreviewLine(this.pointA, hit);
        }
      }
    });
  }

  updateHUD(hit) {
    const coordEl = document.getElementById('hud-coord');
    const elevEl = document.getElementById('hud-elev');
    const statusEl = document.getElementById('hud-status');

    if (coordEl) coordEl.textContent = `${hit.lon.toFixed(2)}°E, ${hit.lat.toFixed(2)}°N`;
    if (elevEl) elevEl.textContent = `${Math.round(hit.elev)} m`;
    if (statusEl) {
      if (hit.elev >= this.water.waterLevel) {
        statusEl.textContent = "陸地";
        statusEl.className = "hud-tag text-green";
      } else {
        const depth = Math.round(this.water.waterLevel - hit.elev);
        statusEl.textContent = `水下 ${depth}m`;
        statusEl.className = "hud-tag text-blue";
      }
    }
  }

  startSelection() {
    this.isActive = true;
    this.pointA = null;
    this.pointB = null;
    this.clearMarkers();

    if (this.modeBtn) this.modeBtn.classList.add('active');
    document.body.style.cursor = 'crosshair';
    this.showToast("剖面選取模式：請在 3D 地球表面點擊「起點 A」");
    if (this.subtitleEl) {
      this.subtitleEl.textContent = "請在 3D 地圖上點擊起點 A";
    }
  }

  cancelSelection() {
    this.isActive = false;
    if (this.modeBtn) this.modeBtn.classList.remove('active');
    document.body.style.cursor = 'default';
  }

  finishSelection() {
    this.isActive = false;
    if (this.modeBtn) this.modeBtn.classList.remove('active');
    document.body.style.cursor = 'default';

    this.sampleCrossSection(this.pointA, this.pointB);
    this.build3DPathLine();
    this.openPanel();
    this.reset2DView();
    this.showToast(`剖面分析完成！測線長度 ${this.totalDistanceKm.toFixed(1)} km`);
  }

  createMarkerA(point) {
    if (this.markerAMesh) this.markerGroup.remove(this.markerAMesh);
    this.markerAMesh = this.createPinMesh(point.worldPos, 0xe63946, "A");
    this.markerGroup.add(this.markerAMesh);
  }

  createMarkerB(point) {
    if (this.markerBMesh) this.markerGroup.remove(this.markerBMesh);
    this.markerBMesh = this.createPinMesh(point.worldPos, 0x00b4d8, "B");
    this.markerGroup.add(this.markerBMesh);
  }

  createPinMesh(pos, colorHex, label) {
    const group = new THREE.Group();
    // Sphere Pin Head
    const headGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 4.0;
    group.add(head);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 8);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 2.0;
    group.add(stem);

    // Pulsing base ring
    const ringGeo = new THREE.RingGeometry(1.0, 1.8, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.2;
    group.add(ring);

    group.position.copy(pos);
    return group;
  }

  clearMarkers() {
    if (this.markerAMesh) {
      this.markerGroup.remove(this.markerAMesh);
      this.markerAMesh = null;
    }
    if (this.markerBMesh) {
      this.markerGroup.remove(this.markerBMesh);
      this.markerBMesh = null;
    }
    if (this.lineMesh) {
      this.markerGroup.remove(this.lineMesh);
      this.lineMesh = null;
    }
    if (this.probeMesh) this.probeMesh.visible = false;
  }

  drawDynamicPreviewLine(pA, pB) {
    if (this.lineMesh) this.markerGroup.remove(this.lineMesh);

    const points = [];
    const count = 40;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const u = THREE.MathUtils.lerp(pA.u, pB.u, t);
      const v = THREE.MathUtils.lerp(pA.v, pB.v, t);
      const pos = this.terrain.uvToWorld(u, v);
      pos.y += 0.5; // elevate slightly above terrain surface
      points.push(pos);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xffd166, linewidth: 3 });
    this.lineMesh = new THREE.Line(geo, mat);
    this.markerGroup.add(this.lineMesh);
  }

  build3DPathLine() {
    if (this.lineMesh) this.markerGroup.remove(this.lineMesh);

    const points = this.profileSamples.map(s => {
      const p = s.worldPos.clone();
      p.y += 0.6; // Slightly above terrain surface
      return p;
    });

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 4 });
    this.lineMesh = new THREE.Line(geo, mat);
    this.markerGroup.add(this.lineMesh);
  }

  sampleCrossSection(pA, pB) {
    this.profileSamples = [];
    let cumDist = 0;
    let prevLat = pA.lat;
    let prevLon = pA.lon;

    this.minElev = Infinity;
    this.maxElev = -Infinity;

    for (let i = 0; i <= this.sampleCount; i++) {
      const t = i / this.sampleCount;
      const u = THREE.MathUtils.lerp(pA.u, pB.u, t);
      const v = THREE.MathUtils.lerp(pA.v, pB.v, t);

      const elev = this.terrain.sampleElevation(u, v);
      const { lat, lon } = this.terrain.uvToLatLon(u, v);
      const worldPos = this.terrain.uvToWorld(u, v, elev);

      if (i > 0) {
        cumDist += this.haversineKm(prevLat, prevLon, lat, lon);
      }
      prevLat = lat;
      prevLon = lon;

      if (elev < this.minElev) this.minElev = elev;
      if (elev > this.maxElev) this.maxElev = elev;

      this.profileSamples.push({
        distKm: cumDist,
        elev,
        u,
        v,
        lat,
        lon,
        worldPos
      });
    }

    this.totalDistanceKm = cumDist;
    this.updateProfileStats();
  }

  haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = THREE.MathUtils.degToRad(lat2 - lat1);
    const dLon = THREE.MathUtils.degToRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(THREE.MathUtils.degToRad(lat1)) * Math.cos(THREE.MathUtils.degToRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  updateProfileStats() {
    if (this.profileSamples.length === 0) return;

    const pA = this.profileSamples[0];
    const pB = this.profileSamples[this.profileSamples.length - 1];

    document.getElementById('pstat-start').textContent = `${Math.round(pA.elev)} m (${pA.lat.toFixed(1)}°N, ${pA.lon.toFixed(1)}°E)`;
    document.getElementById('pstat-end').textContent = `${Math.round(pB.elev)} m (${pB.lat.toFixed(1)}°N, ${pB.lon.toFixed(1)}°E)`;
    document.getElementById('pstat-dist').textContent = `${this.totalDistanceKm.toFixed(1)} km`;
    document.getElementById('pstat-max').textContent = `+${Math.round(this.maxElev)} m`;
    document.getElementById('pstat-min').textContent = `${Math.round(this.minElev)} m`;

    // Submerged percentage at current water level
    let subCount = 0;
    this.profileSamples.forEach(s => {
      if (s.elev < this.water.waterLevel) subCount++;
    });
    const subRatio = ((subCount / this.profileSamples.length) * 100).toFixed(1);
    document.getElementById('pstat-flood-ratio').textContent = `${subRatio}%`;

    if (this.subtitleEl) {
      this.subtitleEl.textContent = `A (${pA.lat.toFixed(2)}°N, ${pA.lon.toFixed(2)}°E) 至 B (${pB.lat.toFixed(2)}°N, ${pB.lon.toFixed(2)}°E) | 總距 ${this.totalDistanceKm.toFixed(1)} km`;
    }
  }

  openPanel() {
    this.panelEl.classList.remove('collapsed');
    this.resizeCanvas();
    this.render2DProfile();
  }

  closePanel() {
    this.panelEl.classList.add('collapsed');
    this.clearMarkers();
  }

  resizeCanvas() {
    const container = document.getElementById('profile-canvas-container');
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Render the 2D Elevation Cross-Section with independent pan & zoom
   */
  render2DProfile() {
    if (this.profileSamples.length === 0) return;

    const ctx = this.ctx;
    const container = document.getElementById('profile-canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    const pad = this.view.basePadding;
    const graphW = w - pad.left - pad.right;
    const graphH = h - pad.top - pad.bottom;

    // Global elevation range with safety padding
    const yMin = Math.min(-7000, this.minElev - 200);
    const yMax = Math.max(4000, this.maxElev + 400);
    const elevSpan = yMax - yMin;

    // Coordinate mapping with independent pan & zoom
    const mapX = (distKm) => {
      const norm = distKm / this.totalDistanceKm; // 0 to 1
      const baseX = pad.left + norm * graphW;
      return (baseX - w / 2) * this.view.zoom + (w / 2) + this.view.panX;
    };

    const mapY = (elevMeters) => {
      const norm = (elevMeters - yMin) / elevSpan; // 0 at bottom, 1 at top
      const baseY = (pad.top + graphH) - norm * graphH;
      return (baseY - h / 2) * this.view.zoom + (h / 2) + this.view.panY;
    };

    // Draw Grid & Axes Lines
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";

    // Horizontal Elevation Guide Lines
    const elevInterval = (elevSpan > 5000) ? 1000 : 500;
    const startElev = Math.ceil(yMin / elevInterval) * elevInterval;
    for (let el = startElev; el <= yMax; el += elevInterval) {
      const y = mapY(el);
      if (y >= 10 && y <= h - 15) {
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();

        ctx.textAlign = "right";
        ctx.fillText(`${el}m`, pad.left - 8, y + 3);
      }
    }

    // Modern Sea Level Datum Line (0m)
    const zeroY = mapY(0);
    if (zeroY >= 0 && zeroY <= h) {
      ctx.strokeStyle = "rgba(0, 180, 216, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(w - pad.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0, 180, 216, 0.7)";
      ctx.fillText("0m (基準海平)", pad.left - 8, zeroY + 3);
    }

    // Distance X-Axis Ticks
    const distStep = (this.totalDistanceKm > 400) ? 100 : (this.totalDistanceKm > 100) ? 50 : 20;
    for (let d = 0; d <= this.totalDistanceKm; d += distStep) {
      const x = mapX(d);
      if (x >= pad.left && x <= w - pad.right) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + graphH);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillText(`${d}km`, x, pad.top + graphH + 18);
      }
    }

    // Dynamic Active Sea Level Line
    const curWaterY = mapY(this.water.waterLevel);
    if (curWaterY >= 0 && curWaterY <= h) {
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, curWaterY);
      ctx.lineTo(w - pad.right, curWaterY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#00f0ff";
      ctx.textAlign = "left";
      ctx.fillText(`當前水位: ${Math.round(this.water.waterLevel)}m`, w - pad.right - 100, curWaterY - 6);
    }

    // Clip Region for Terrain Graph Fill
    ctx.beginPath();
    ctx.rect(pad.left, pad.top - 10, graphW, graphH + 20);
    ctx.clip();

    // 1. Fill Shaded Terrain Curve
    ctx.beginPath();
    const firstPt = this.profileSamples[0];
    ctx.moveTo(mapX(firstPt.distKm), mapY(yMin));
    this.profileSamples.forEach(s => {
      ctx.lineTo(mapX(s.distKm), mapY(s.elev));
    });
    const lastPt = this.profileSamples[this.profileSamples.length - 1];
    ctx.lineTo(mapX(lastPt.distKm), mapY(yMin));
    ctx.closePath();

    // Hypsometric Fill Gradient with Sandy Seafloor
    const grad = ctx.createLinearGradient(0, mapY(yMax), 0, mapY(yMin));
    grad.addColorStop(0.0, "rgba(240, 248, 255, 0.85)"); // Peaks
    grad.addColorStop(0.2, "rgba(188, 108, 37, 0.85)");  // Mountains
    grad.addColorStop(0.35, "rgba(82, 183, 136, 0.85)"); // Plains
    grad.addColorStop(0.42, "rgba(215, 185, 135, 0.9)"); // Sandy Shelf (Taiwan Strait)
    grad.addColorStop(0.65, "rgba(145, 115, 78, 0.95)"); // Deep sea benthic sediment
    grad.addColorStop(1.0, "rgba(55, 42, 32, 0.98)");     // Trench basalt bedrock
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Draw Subsea Water Layer Fill (translucent ocean blue above sandy seabed)
    if (curWaterY < mapY(yMin)) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mapX(firstPt.distKm), curWaterY);
      this.profileSamples.forEach(s => {
        const ey = mapY(s.elev);
        // Only draw in regions where terrain is below water level
        const yClamped = Math.max(curWaterY, ey);
        ctx.lineTo(mapX(s.distKm), yClamped);
      });
      ctx.lineTo(mapX(lastPt.distKm), curWaterY);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 150, 220, 0.52)";
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Crisp Terrain Surface Polyline
    ctx.beginPath();
    this.profileSamples.forEach((s, idx) => {
      const x = mapX(s.distKm);
      const y = mapY(s.elev);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 4. Draw Min & Max Peak Annotations
    const maxSample = this.profileSamples.reduce((prev, curr) => (curr.elev > prev.elev ? curr : prev), firstPt);
    const minSample = this.profileSamples.reduce((prev, curr) => (curr.elev < prev.elev ? curr : prev), firstPt);

    const drawAnnotation = (sample, label, colorHex) => {
      const x = mapX(sample.distKm);
      const y = mapY(sample.elev);
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${label} ${Math.round(sample.elev)}m`, x, (sample.elev >= 0) ? y - 10 : y + 16);
    };

    drawAnnotation(maxSample, "最高點", "#70e000");
    drawAnnotation(minSample, "最深處", "#00b4d8");

    // 5. Draw Point A and Point B Endpoints
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.arc(mapX(firstPt.distKm), mapY(firstPt.elev), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00b4d8";
    ctx.beginPath();
    ctx.arc(mapX(lastPt.distKm), mapY(lastPt.elev), 5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Draw Interactive Cursor Indicator Crosshair
    if (this.hoverIndex >= 0 && this.hoverIndex < this.profileSamples.length) {
      const hPt = this.profileSamples[this.hoverIndex];
      const hx = mapX(hPt.distKm);
      const hy = mapY(hPt.elev);

      // Vertical line
      ctx.strokeStyle = "rgba(255, 209, 102, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hx, pad.top);
      ctx.lineTo(hx, pad.top + graphH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight dot
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  handleCanvasPointerMove(clientX, clientY) {
    if (this.profileSamples.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const pad = this.view.basePadding;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const graphW = w - pad.left - pad.right;

    // Inverse map from screen X to distance in km
    const unscaledX = (mouseX - (w / 2) - this.view.panX) / this.view.zoom + (w / 2);
    const norm = (unscaledX - pad.left) / graphW;

    if (norm >= 0 && norm <= 1) {
      const targetDist = norm * this.totalDistanceKm;
      // Binary search closest sample
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < this.profileSamples.length; i++) {
        const diff = Math.abs(this.profileSamples[i].distKm - targetDist);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      this.hoverIndex = closestIdx;
      const s = this.profileSamples[closestIdx];

      // Update 3D Probe Position in 3D scene!
      if (this.probeMesh) {
        this.probeMesh.position.copy(s.worldPos);
        this.probeMesh.position.y += 0.8;
        this.probeMesh.visible = true;
      }

      // Show HUD Tooltip
      this.showTooltip(mouseX, mouseY, s);
      this.render2DProfile();
    } else {
      this.hoverIndex = -1;
      this.hideTooltip();
      if (this.probeMesh) this.probeMesh.visible = false;
      this.render2DProfile();
    }
  }

  showTooltip(x, y, sample) {
    if (!this.tooltipEl) return;
    const depth = (this.water.waterLevel - sample.elev);
    const statusText = (sample.elev >= this.water.waterLevel)
      ? `<span style="color:#70e000">陸地</span>`
      : `<span style="color:#00b4d8">淹沒水深 ${Math.round(depth)}m</span>`;

    this.tooltipEl.innerHTML = `
      <div><strong>距起點：</strong>${sample.distKm.toFixed(1)} km</div>
      <div><strong>高程：</strong>${Math.round(sample.elev)} m (${statusText})</div>
      <div><strong>座標：</strong>${sample.lon.toFixed(3)}°E, ${sample.lat.toFixed(3)}°N</div>
    `;
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
  }

  showToast(msg) {
    const banner = document.getElementById('toast-banner');
    const msgEl = document.getElementById('toast-message');
    if (banner && msgEl) {
      msgEl.textContent = msg;
      banner.classList.remove('hidden');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        banner.classList.add('hidden');
      }, 3500);
    }
  }

  setExaggeration(factor) {
    // Re-update 3D marker positions and line to match new terrain exaggeration
    if (this.pointA) {
      this.pointA.worldPos = this.terrain.uvToWorld(this.pointA.u, this.pointA.v, this.pointA.elev);
      if (this.markerAMesh) this.markerAMesh.position.copy(this.pointA.worldPos);
    }
    if (this.pointB) {
      this.pointB.worldPos = this.terrain.uvToWorld(this.pointB.u, this.pointB.v, this.pointB.elev);
      if (this.markerBMesh) this.markerBMesh.position.copy(this.pointB.worldPos);
    }
    if (this.profileSamples.length > 0) {
      this.profileSamples.forEach(s => {
        s.worldPos = this.terrain.uvToWorld(s.u, s.v, s.elev);
      });
      this.build3DPathLine();
    }
  }
}

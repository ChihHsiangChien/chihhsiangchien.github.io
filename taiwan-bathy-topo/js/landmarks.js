/**
 * Taiwan 3D Topography & Bathymetry Visualizer
 * Landmarks Module - 3D Projected Screen Labels & Camera Navigation
 */

class LandmarkManager {
  constructor(scene, camera, renderer, terrainManager, controls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrainManager;
    this.controls = controls;

    this.landmarks = [];
    this.pinElements = [];
    this.container = document.getElementById('landmark-labels-container');
    this.listContainer = document.getElementById('landmark-list-container');
    this.isVisible = true;
    this.activeFilter = 'all';

    // Camera fly-to animation state
    this.isFlying = false;
    this.flyStartTime = 0;
    this.flyDuration = 1200; // ms
    this.camStartPos = new THREE.Vector3();
    this.camEndPos = new THREE.Vector3();
    this.targetStartPos = new THREE.Vector3();
    this.targetEndPos = new THREE.Vector3();

    this.initFilterEvents();
  }

  setLandmarks(landmarksList) {
    this.landmarks = landmarksList || [];
    this.buildLandmarkPins();
    this.buildLandmarkList();
  }

  buildLandmarkPins() {
    this.container.innerHTML = '';
    this.pinElements = [];

    this.landmarks.forEach(lm => {
      const pin = document.createElement('div');
      pin.className = `landmark-3d-pin category-${lm.type}`;
      pin.dataset.id = lm.id;

      const altDisplay = (lm.elevation >= 0) ? `+${lm.elevation}m` : `${lm.elevation}m`;

      pin.innerHTML = `
        <div class="pin-bubble">
          <strong>${lm.name}</strong>
          <span>${altDisplay}</span>
        </div>
        <div class="pin-dot"></div>
        <div class="pin-ripple"></div>
      `;

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.flyToLandmark(lm);
      });

      this.container.appendChild(pin);
      this.pinElements.push({ element: pin, data: lm });
    });
  }

  buildLandmarkList() {
    if (!this.listContainer) return;
    this.listContainer.innerHTML = '';

    const filtered = (this.activeFilter === 'all')
      ? this.landmarks
      : this.landmarks.filter(lm => {
          if (this.activeFilter === 'city') return lm.type === 'city' || lm.type === 'basin';
          return lm.type === this.activeFilter;
        });

    filtered.forEach(lm => {
      const card = document.createElement('div');
      card.className = 'landmark-card';
      card.dataset.id = lm.id;

      const altDisplay = (lm.elevation >= 0) ? `+${lm.elevation}m` : `${lm.elevation}m`;
      const altColorClass = (lm.elevation >= 0) ? 'text-green' : 'text-blue';

      card.innerHTML = `
        <div class="lm-main">
          <span class="lm-name">${lm.name}</span>
          <span class="lm-en">${lm.name_en}</span>
        </div>
        <span class="lm-alt ${altColorClass}">${altDisplay}</span>
      `;

      card.addEventListener('click', () => {
        this.flyToLandmark(lm);
        // Highlight active card
        document.querySelectorAll('.landmark-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });

      this.listContainer.appendChild(card);
    });
  }

  initFilterEvents() {
    const filterBtns = document.querySelectorAll('.landmark-categories .chip');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this.buildLandmarkList();
        this.updateFilterVisibility();
      });
    });

    document.getElementById('toggle-landmarks')?.addEventListener('change', (e) => {
      this.setVisible(e.target.checked);
    });
  }

  updateFilterVisibility() {
    this.pinElements.forEach(({ element, data }) => {
      let match = (this.activeFilter === 'all' || data.type === this.activeFilter);
      if (this.activeFilter === 'city' && (data.type === 'city' || data.type === 'basin')) match = true;
      element.style.display = (match && this.isVisible) ? 'flex' : 'none';
    });
  }

  setVisible(visible) {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  flyToLandmark(lm) {
    const uv = this.terrain.latLonToUV(lm.lat, lm.lon);
    const target = this.terrain.uvToWorld(uv.u, uv.v, lm.elevation);

    // Camera offset positioning relative to landmark
    let camOffset;
    if (lm.type === 'mountain') {
      camOffset = new THREE.Vector3(-25, 18, 30);
    } else if (lm.type === 'trench') {
      camOffset = new THREE.Vector3(20, 35, 40);
    } else {
      camOffset = new THREE.Vector3(0, 30, 35);
    }

    const camPos = target.clone().add(camOffset);

    // Initiate smooth tween
    this.camStartPos.copy(this.camera.position);
    this.camEndPos.copy(camPos);
    this.targetStartPos.copy(this.controls.target);
    this.targetEndPos.copy(target);

    this.flyStartTime = performance.now();
    this.isFlying = true;

    // Show educational toast
    const banner = document.getElementById('toast-banner');
    const msgEl = document.getElementById('toast-message');
    if (banner && msgEl) {
      msgEl.innerHTML = `<strong>${lm.name}</strong> (${lm.elevation}m)：${lm.desc}`;
      banner.classList.remove('hidden');
    }
  }

  update(now) {
    // 1. Handle Camera Flight Animation
    if (this.isFlying) {
      const elapsed = now - this.flyStartTime;
      const progress = Math.min(1.0, elapsed / this.flyDuration);
      // EaseInOutCubic
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(this.camStartPos, this.camEndPos, ease);
      this.controls.target.lerpVectors(this.targetStartPos, this.targetEndPos, ease);

      if (progress >= 1.0) {
        this.isFlying = false;
      }
    }

    // 2. Project 3D World Positions to Screen Pixels for DOM Pins
    if (!this.isVisible) return;

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    const tempVec = new THREE.Vector3();

    this.pinElements.forEach(({ element, data }) => {
      if (this.activeFilter !== 'all' && data.type !== this.activeFilter) return;

      const uv = this.terrain.latLonToUV(data.lat, data.lon);
      const worldPos = this.terrain.uvToWorld(uv.u, uv.v, data.elevation);
      tempVec.copy(worldPos);
      tempVec.y += 1.2; // slightly above terrain surface

      // Check if facing camera
      tempVec.project(this.camera);

      // Behind the camera frustum or out of screen
      if (tempVec.z > 1.0) {
        element.style.display = 'none';
        return;
      }

      const x = (tempVec.x * widthHalf) + widthHalf;
      const y = -(tempVec.y * heightHalf) + heightHalf;

      // Check viewport bounds
      if (x < -60 || x > window.innerWidth + 60 || y < -60 || y > window.innerHeight + 60) {
        element.style.display = 'none';
        return;
      }

      element.style.display = 'flex';
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    });
  }
}

import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { STLLoader } from './lib/STLLoader.js';
import {
  APERTURE_HOLES,
  OBJECTIVES,
  SLIDE_DIM,
  SLIDE_OFFSET_X_RANGE,
  SLIDE_OFFSET_Y_RANGE,
  STAGE_Z_RANGE,
  clamp,
} from './optics.js';

const STL_BASE_PATH = './models/';

const SCAD_PART_CONFIGS = {
  'disk.stl': {
    id: 'aperture',
    label: '圓盤光圈',
    hint: '點擊切換光圈孔徑 (#1~#6)',
    scadCenter: new THREE.Vector3(0, -40, 187.5),
    scadAxis: new THREE.Vector3(0, 0, 1),
  },
  'objective.stl': {
    id: 'objective',
    label: '物鏡轉盤',
    hint: '點擊切換物鏡倍率 (4X / 10X / 40X)',
    scadCenter: new THREE.Vector3(-25, 0, 350),
    scadAxis: new THREE.Vector3(1, 0, 1),
  },
  'big_knob.stl': {
    id: 'big_knob',
    label: '粗調節輪',
    hint: '上下拖曳大幅升降載物台（或點擊微步）',
    scadCenter: new THREE.Vector3(140, 0, 150),
    scadAxis: new THREE.Vector3(0, 1, 0),
  },
  'small_knob.stl': {
    id: 'small_knob',
    label: '細調節輪',
    hint: '上下拖曳精細對焦（觀察景深變化）',
    scadCenter: new THREE.Vector3(140, 0, 150),
    scadAxis: new THREE.Vector3(0, 1, 0),
  },
};

function createEyepieceLabelTexture(magLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let k = 0; k < 3; k++) {
    const cx = (canvas.width / 3) * (k + 0.5);
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(cx - 58, cy - 40, 116, 80, 14);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 44px "JetBrains Mono", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(magLabel, cx, cy);
  }

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

const OBJECTIVE_DECOR_SPECS = [
  { label: '4X', na: '0.10', length: 55, ringColor: 0xef4444, badgeBg: '#dc2626', apertureR: 8.6 },
  { label: '10X', na: '0.25', length: 70, ringColor: 0xeab308, badgeBg: '#ca8a04', apertureR: 6.4 },
  { label: '40X', na: '0.65', length: 85, ringColor: 0x3b82f6, badgeBg: '#2563eb', apertureR: 4.0 },
];

function createObjectiveLabelTexture(spec) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Repeat 3 times around cylinder circumference so magnification is readable from any orbit angle
  for (let k = 0; k < 3; k++) {
    const cx = (canvas.width / 3) * (k + 0.5);
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(cx - 64, cy - 46, 128, 92, 14);
    ctx.fill();

    ctx.strokeStyle = spec.badgeBg;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 42px "JetBrains Mono", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.label, cx, cy - 10);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 20px "JetBrains Mono", "Inter", sans-serif';
    ctx.fillText(`NA ${spec.na}`, cx, cy + 28);
  }

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function scadToThree(vec) {
  const v = vec.clone();
  const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  v.applyMatrix4(m);
  return v;
}

function reorientGeometry(geometry) {
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
}

export class Microscope3DViewer {
  constructor(container, labelLayer, callbacks) {
    this.container = container;
    this.labelLayer = labelLayer;
    this.callbacks = callbacks || {};

    this.scene = new THREE.Scene();
    const width = Math.max(100, container.clientWidth);
    const height = Math.max(100, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 1, 4000);
    this.camera.position.set(-480, 420, 480);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(20, 230, 0);
    this.controls.update();

    this._setupLights();

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.stageGroup = new THREE.Group();
    this.root.add(this.stageGroup);

    this.parts = {};
    this.interactiveMeshes = [];
    this.lightStageMesh = null;
    this.lightSourceMesh = null;
    this.lowerBeamMesh = null;
    this.upperBeamMesh = null;
    this.lastBeamApertureLevel = null;
    this.eyepieceMount = null;
    this.eyepieceBarrel = null;
    this.eyepieceLabelSleeve = null;
    this.eyepieceTopGroup = null;
    this.eyepieceTextures = null;
    this.eyepieceCurrentLen = 60;
    this.eyepieceTargetLen = 60;
    this.switchRockerPivot = null;
    this.switchRockerMesh = null;
    this.switchLedMesh = null;
    this.switchTargetAngle = 0.26;
    this.slideGroup = null;
    this.slideMesh = null;
    this.slideTextureCanvas = document.createElement('canvas');
    this.slideTextureCanvas.width = 256;
    this.slideTextureCanvas.height = 256;
    this.slideTexture = new THREE.CanvasTexture(this.slideTextureCanvas);
    if ('colorSpace' in this.slideTexture) {
      this.slideTexture.colorSpace = THREE.SRGBColorSpace;
    }

    this.stageTopY = 207.5;
    this.stageTargetY = 0;
    this.labelElements = {};
    this.showLabels = true;
    this.state = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoveredId = null;
    this.dragState = null;

    this._loadModels();
    this._bindPointerEvents();
    this._bindResizeObserver();
    this._animate();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x1e293b, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(280, 620, 380);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 50;
    keyLight.shadow.camera.far = 1500;
    const d = 320;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-360, 300, -280);
    this.scene.add(rimLight);

    // Soft studio floor grid/plane beneath base
    const floorGeo = new THREE.CircleGeometry(360, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _createMaterial(filename) {
    if (filename === 'base.stl') {
      return new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.16, roughness: 0.56 });
    }
    if (filename === 'stage.stl') {
      return new THREE.MeshStandardMaterial({ color: 0x2b3440, metalness: 0.35, roughness: 0.62 });
    }
    if (filename === 'disk.stl') {
      return new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.45, roughness: 0.45 });
    }
    if (filename === 'objective.stl') {
      return new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.28 });
    }
    if (filename === 'big_knob.stl') {
      return new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.48 });
    }
    if (filename === 'small_knob.stl') {
      return new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.55, roughness: 0.32 });
    }
    if (filename === 'eyepiece.stl') {
      return new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.35 });
    }
    if (filename === 'light_source.stl' || filename === 'light_stage.stl') {
      return new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfde68a,
        emissiveIntensity: 0.65,
        roughness: 0.3,
      });
    }
    return new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.3, roughness: 0.5 });
  }

  _loadModels() {
    const loader = new STLLoader();
    const files = [
      'base.stl',
      'stage.stl',
      'light_stage.stl',
      'light_source.stl',
      'disk.stl',
      'objective.stl',
      'big_knob.stl',
      'small_knob.stl',
      'eyepiece.stl',
    ];

    let loaded = 0;
    const onDone = () => {
      loaded += 1;
      if (loaded >= files.length) {
        this._buildSlideAndStageAccessories();
        this._buildEyepieceAssembly();
        this._buildPowerSwitch();
        this._buildLabelOverlay();
        this.setCameraPreset('default');
        if (this.state) this.syncFromState(this.state);
      }
    };

    files.forEach((filename) => {
      loader.load(
        `${STL_BASE_PATH}${filename}`,
        (geometry) => {
          reorientGeometry(geometry);
          const material = this._createMaterial(filename);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = filename;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (filename === 'stage.stl') {
            this.stageTopY = geometry.boundingBox ? geometry.boundingBox.max.y : 207.5;
            this.stageGroup.add(mesh);
            onDone();
            return;
          }

          if (filename === 'light_stage.stl') {
            this.lightStageMesh = mesh;
            this.stageGroup.add(mesh);
            onDone();
            return;
          }

          if (filename === 'light_source.stl') {
            this.lightSourceMesh = mesh;
            this.root.add(mesh);
            onDone();
            return;
          }

          const cfg = SCAD_PART_CONFIGS[filename];
          if (cfg) {
            const center = cfg.scadCenter
              ? scadToThree(cfg.scadCenter)
              : geometry.boundingBox.getCenter(new THREE.Vector3());
            const axis = scadToThree(cfg.scadAxis).normalize();

            const pivot = new THREE.Group();
            pivot.position.copy(center);
            mesh.position.sub(center);
            pivot.add(mesh);

            if (cfg.id === 'aperture') {
              this.stageGroup.add(pivot);
            } else {
              this.root.add(pivot);
            }

            mesh.userData.partId = cfg.id;
            mesh.userData.label = cfg.label;
            mesh.userData.hint = cfg.hint;
            mesh.userData.baseEmissive = material.emissive ? material.emissive.getHex() : 0x000000;

            this.parts[cfg.id] = {
              id: cfg.id,
              pivot,
              mesh,
              axis,
              current: 0,
              target: 0,
              label: cfg.label,
              hint: cfg.hint,
            };
            this.interactiveMeshes.push(mesh);
            if (cfg.id === 'objective') {
              this._decorateObjectivePivot(pivot, axis);
            }
            onDone();
            return;
          }

          this.root.add(mesh);
          onDone();
        },
        undefined,
        (err) => {
          console.warn(`Failed to load ${filename}:`, err);
          onDone();
        }
      );
    });
  }

  _decorateObjectivePivot(objectivePivot, turretAxis) {
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.32 });
    const boreMat = new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide });
    const glintMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });

    OBJECTIVE_DECOR_SPECS.forEach((spec, idx) => {
      const lensGroup = new THREE.Group();
      const q = new THREE.Quaternion().setFromAxisAngle(turretAxis, -idx * ((Math.PI * 2) / 3));
      lensGroup.quaternion.copy(q);
      objectivePivot.add(lensGroup);

      const tipY = -(30 + spec.length);

      // 1. Tapered metallic nose cone & recessed lens aperture opening
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(14.8, 12.2, 2.6, 32), bezelMat);
      bezel.position.set(25, tipY - 1.3, 0);
      lensGroup.add(bezel);

      const bore = new THREE.Mesh(new THREE.CircleGeometry(spec.apertureR, 32), boreMat);
      bore.rotation.x = Math.PI / 2;
      bore.position.set(25, tipY - 2.62, 0);
      lensGroup.add(bore);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.45,
        metalness: 0.25,
        roughness: 0.08,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      const glassLens = new THREE.Mesh(new THREE.CircleGeometry(spec.apertureR * 0.78, 32), glassMat);
      glassLens.rotation.x = Math.PI / 2;
      glassLens.position.set(25, tipY - 2.68, 0);
      lensGroup.add(glassLens);

      const glint = new THREE.Mesh(new THREE.CircleGeometry(spec.apertureR * 0.16, 12), glintMat);
      glint.rotation.x = Math.PI / 2;
      glint.position.set(25 + spec.apertureR * 0.26, tipY - 2.72, spec.apertureR * 0.22);
      lensGroup.add(glint);

      // 2. ISO color-coded ring band near barrel tip
      const ringMat = new THREE.MeshStandardMaterial({
        color: spec.ringColor,
        metalness: 0.35,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(15.35, 15.35, 4.5, 36, 1, true), ringMat);
      ring.position.set(25, tipY + 11, 0);
      lensGroup.add(ring);

      // 3. Magnification label sleeve around barrel (4X / 10X / 40X)
      const labelTex = createObjectiveLabelTexture(spec);
      const sleeveMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(15.32, 15.32, 22, 48, 1, true), sleeveMat);
      sleeve.position.set(25, -(30 + spec.length * 0.48), 0);
      lensGroup.add(sleeve);

      [bezel, bore, glassLens, ring, sleeve].forEach((m) => {
        m.userData.partId = 'objective';
        m.userData.label = '物鏡轉盤';
        m.userData.hint = '點擊切換物鏡倍率 (4X / 10X / 40X)';
        this.interactiveMeshes.push(m);
      });
    });
  }

  _buildSlideAndStageAccessories() {
    // Stage clips anchored at back (+X) extending closer to the user (-X) along left & right of slide
    const clipMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.25 });
    const postGeo = new THREE.CylinderGeometry(4, 4, 3.6, 16);
    const armGeo = new THREE.BoxGeometry(72, 1.4, 7.5);
    const tipGeo = new THREE.BoxGeometry(8, 1.4, 7.5);

    [-48, 48].forEach((zPos) => {
      const post = new THREE.Mesh(postGeo, clipMat);
      post.position.set(56, this.stageTopY + 1.8, zPos);
      post.castShadow = true;
      this.stageGroup.add(post);

      const arm = new THREE.Mesh(armGeo, clipMat);
      arm.position.set(20, this.stageTopY + 4.3, zPos);
      arm.castShadow = true;
      this.stageGroup.add(arm);

      const tip = new THREE.Mesh(tipGeo, clipMat);
      tip.position.set(-19, this.stageTopY + 5.0, zPos);
      tip.rotation.z = -0.25;
      tip.castShadow = true;
      this.stageGroup.add(tip);
    });

    // Translucent 3D glass slide group: rotated -90 deg so long axis (150) runs left-right along world Z
    this.slideGroup = new THREE.Group();
    this.slideGroup.position.set(0, this.stageTopY + 1.6, 0);
    this.slideGroup.rotation.y = -Math.PI / 2;
    this.stageGroup.add(this.slideGroup);

    const glassGeo = new THREE.BoxGeometry(SLIDE_DIM.width, 2.4, SLIDE_DIM.height);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.42,
      roughness: 0.12,
      metalness: 0.05,
    });
    this.slideMesh = new THREE.Mesh(glassGeo, glassMat);
    this.slideMesh.userData.partId = 'slide';
    this.slideMesh.userData.label = '載玻片';
    this.slideMesh.userData.hint = '直接在載玻片上拖曳移動標本位置';
    this.slideMesh.userData.baseEmissive = 0x000000;
    this.slideGroup.add(this.slideMesh);
    this.interactiveMeshes.push(this.slideMesh);

    const edges = new THREE.EdgesGeometry(glassGeo);
    const edgeLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.7 })
    );
    this.slideGroup.add(edgeLine);

    // Frosted label area on slide left edge
    const frosted = new THREE.Mesh(
      new THREE.PlaneGeometry(24, SLIDE_DIM.height - 4),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    frosted.rotation.x = -Math.PI / 2;
    frosted.position.set(-SLIDE_DIM.width / 2 + 14, 1.3, 0);
    this.slideGroup.add(frosted);

    // Coverslip & live specimen CanvasTexture plane
    const specPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(SLIDE_DIM.specimenSize, SLIDE_DIM.specimenSize),
      new THREE.MeshBasicMaterial({
        map: this.slideTexture,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    specPlane.rotation.x = -Math.PI / 2;
    specPlane.position.y = 1.35;
    this.slideGroup.add(specPlane);

    const coverGeo = new THREE.BoxGeometry(SLIDE_DIM.specimenSize + 4, 0.7, SLIDE_DIM.specimenSize + 4);
    const coverMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.25,
    });
    const coverslip = new THREE.Mesh(coverGeo, coverMat);
    coverslip.position.y = 1.65;
    this.slideGroup.add(coverslip);

    // Bounded two-segment condenser beam: lower (lamp y=75 to disk bottom) + upper (disk to slide underside)
    const beamMatLower = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.lowerBeamMesh = new THREE.Mesh(new THREE.CylinderGeometry(8, 22, 1, 24, 1, true), beamMatLower);
    this.lowerBeamMesh.position.set(0, 128, 0);
    this.root.add(this.lowerBeamMesh);

    const upperH = Math.max(4, this.stageTopY - 182.5);
    const beamMatUpper = beamMatLower.clone();
    this.upperBeamMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, upperH, 24, 1, true), beamMatUpper);
    this.upperBeamMesh.position.set(0, 182.5 + upperH / 2, 0);
    this.stageGroup.add(this.upperBeamMesh);
  }

  _buildEyepieceAssembly() {
    // Fixed metallic retaining collar at the mouth of eyepiece.stl (-172.13, 620.71, 0)
    this.eyepieceMount = new THREE.Group();
    this.eyepieceMount.position.set(-172.13, 620.71, 0);
    this.eyepieceMount.rotation.z = Math.PI / 4;
    this.root.add(this.eyepieceMount);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(31.5, 31.5, 6, 36),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.65, roughness: 0.3 })
    );
    collar.position.y = -2;
    this.eyepieceMount.add(collar);

    // Variable-length swappable eyepiece barrel (10X longer = 60, 15X shorter = 26)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.32 });
    this.eyepieceBarrel = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 23.5, 1, 36), barrelMat);
    this.eyepieceBarrel.scale.set(1, this.eyepieceCurrentLen, 1);
    this.eyepieceBarrel.position.y = this.eyepieceCurrentLen / 2;
    this.eyepieceBarrel.castShadow = true;
    this.eyepieceMount.add(this.eyepieceBarrel);

    this.eyepieceTextures = {
      10: createEyepieceLabelTexture('10X'),
      15: createEyepieceLabelTexture('15X'),
    };
    const sleeveMat = new THREE.MeshBasicMaterial({
      map: this.eyepieceTextures[10],
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.eyepieceLabelSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(23.9, 23.9, 18, 48, 1, true),
      sleeveMat
    );
    this.eyepieceLabelSleeve.position.y = this.eyepieceCurrentLen * 0.5;
    this.eyepieceMount.add(this.eyepieceLabelSleeve);

    // Top eyecup & optical lens opening (slides smoothly along tube axis)
    this.eyepieceTopGroup = new THREE.Group();
    this.eyepieceTopGroup.position.y = this.eyepieceCurrentLen;
    this.eyepieceMount.add(this.eyepieceTopGroup);

    const eyecup = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 24, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.42 })
    );
    eyecup.position.y = 4;
    this.eyepieceTopGroup.add(eyecup);

    const topBezel = new THREE.Mesh(
      new THREE.RingGeometry(15.5, 28, 36),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.72, roughness: 0.3, side: THREE.DoubleSide })
    );
    topBezel.rotation.x = -Math.PI / 2;
    topBezel.position.y = 9.05;
    this.eyepieceTopGroup.add(topBezel);

    const bore = new THREE.Mesh(
      new THREE.CircleGeometry(15.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide })
    );
    bore.rotation.x = -Math.PI / 2;
    bore.position.y = 9.08;
    this.eyepieceTopGroup.add(bore);

    const glassLens = new THREE.Mesh(
      new THREE.CircleGeometry(12.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.45,
        metalness: 0.25,
        roughness: 0.08,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
    );
    glassLens.rotation.x = -Math.PI / 2;
    glassLens.position.y = 9.15;
    this.eyepieceTopGroup.add(glassLens);

    const glint = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(3.8, 9.2, 3.2);
    this.eyepieceTopGroup.add(glint);

    [this.eyepieceBarrel, this.eyepieceLabelSleeve, eyecup, topBezel, bore, glassLens].forEach((m) => {
      m.userData.partId = 'eyepiece';
      m.userData.label = '目鏡';
      m.userData.hint = '點擊更換目鏡倍率 (10X 較長 / 15X 較短)';
      m.userData.baseEmissive = m.material.emissive ? m.material.emissive.getHex() : 0x000000;
      this.interactiveMeshes.push(m);
    });
  }

  _buildPowerSwitch() {
    const switchGroup = new THREE.Group();
    switchGroup.position.set(-145, 50, 75);
    this.root.add(switchGroup);

    const housingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.35, roughness: 0.5 });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(28, 6, 20), housingMat);
    housing.position.y = 3;
    housing.castShadow = true;
    switchGroup.add(housing);

    this.switchRockerPivot = new THREE.Group();
    this.switchRockerPivot.position.set(0, 6.2, 0);
    switchGroup.add(this.switchRockerPivot);

    const rockerMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    });
    this.switchRockerMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 12), rockerMat);
    this.switchRockerMesh.position.y = 1.5;
    this.switchRockerMesh.castShadow = true;
    this.switchRockerPivot.add(this.switchRockerMesh);

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    this.switchLedMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 16), ledMat);
    this.switchLedMesh.position.set(19, 1.5, 0);
    switchGroup.add(this.switchLedMesh);

    [housing, this.switchRockerMesh, this.switchLedMesh].forEach((m) => {
      m.userData.partId = 'light_switch';
      m.userData.label = '光源開關';
      m.userData.hint = '點擊開啟或關閉顯微鏡光源';
      m.userData.baseEmissive = m.material.emissive ? m.material.emissive.getHex() : 0x000000;
      this.interactiveMeshes.push(m);
    });
  }

  _buildLabelOverlay() {
    if (!this.labelLayer) return;
    this.labelLayer.innerHTML = '';
    this.labelElements = {};

    const specs = [
      {
        id: 'eyepiece',
        text: '目鏡',
        getAnchor: () =>
          this.eyepieceTopGroup
            ? this.eyepieceTopGroup.getWorldPosition(new THREE.Vector3())
            : new THREE.Vector3(-200, 650, 0),
      },
      { id: 'objective', text: '物鏡轉盤', getAnchor: () => new THREE.Vector3(-25, 295, 0) },
      { id: 'stage', text: '載物臺', getAnchor: () => new THREE.Vector3(-88, this.stageTopY + this.stageGroup.position.y, 82) },
      { id: 'slide', text: '載玻片', getAnchor: () => this._getPartWorldCenter('slide', new THREE.Vector3(0, this.stageTopY + 5, 0)) },
      { id: 'aperture', text: '光圈', getAnchor: () => this._getPartWorldCenter('aperture', new THREE.Vector3(0, 188, 55)) },
      { id: 'big_knob', text: '粗調節輪', getAnchor: () => new THREE.Vector3(140, 150, 70) },
      { id: 'small_knob', text: '細調節輪', getAnchor: () => new THREE.Vector3(140, 150, 108) },
      { id: 'light_switch', text: '光源開關', getAnchor: () => new THREE.Vector3(-145, 66, 75) },
    ];

    specs.forEach((sp) => {
      const el = document.createElement('div');
      el.className = 'part-pin';
      el.textContent = sp.text;
      this.labelLayer.appendChild(el);
      this.labelElements[sp.id] = { el, getAnchor: sp.getAnchor };
    });
  }

  _getPartWorldCenter(id, fallback) {
    const targetObj = id === 'slide' ? this.slideMesh : this.parts[id]?.mesh;
    if (!targetObj) return fallback;
    const box = new THREE.Box3().setFromObject(targetObj);
    return box.getCenter(new THREE.Vector3());
  }

  _updateLabels() {
    if (!this.labelLayer) return;
    this.labelLayer.style.display = this.showLabels ? 'block' : 'none';
    if (!this.showLabels) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    for (const entry of Object.values(this.labelElements)) {
      const world = entry.getAnchor();
      const ndc = world.clone().project(this.camera);
      if (ndc.z < -1 || ndc.z > 1) {
        entry.el.style.opacity = '0';
        continue;
      }
      const x = (ndc.x * 0.5 + 0.5) * w;
      const y = (-ndc.y * 0.5 + 0.5) * h;
      entry.el.style.opacity = '1';
      entry.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  setShowLabels(visible) {
    this.showLabels = visible;
    this._updateLabels();
  }

  setCameraPreset(preset) {
    const targets = {
      default: { pos: new THREE.Vector3(-550, 450, 550), target: new THREE.Vector3(-10, 270, 0) },
      stage: { pos: new THREE.Vector3(-230, 310, 240), target: new THREE.Vector3(0, 210, 0) },
      aperture: { pos: new THREE.Vector3(-190, 155, 220), target: new THREE.Vector3(0, 185, 25) },
      front: { pos: new THREE.Vector3(-460, 270, 35), target: new THREE.Vector3(10, 230, 0) },
    };
    const cfg = targets[preset] || targets.default;
    this.camera.position.copy(cfg.pos);
    this.controls.target.copy(cfg.target);
    this.controls.update();
  }

  /**
   * Synchronize 3D targets from application state.
   */
  syncFromState(state, opticsView = null) {
    this.state = state;

    // Map stageZ (-45..+45 um) -> stage vertical travel (-28..+20 world units)
    const zNorm = (state.stageZ - STAGE_Z_RANGE.min) / (STAGE_Z_RANGE.max - STAGE_Z_RANGE.min);
    this.stageTargetY = -28 + zNorm * 48;

    if (this.parts.big_knob) {
      this.parts.big_knob.target = state.stageZ * 0.085;
    }
    if (this.parts.small_knob) {
      this.parts.small_knob.target = state.stageZ * 0.42;
    }
    if (this.parts.objective) {
      this.parts.objective.target = state.objectiveIdx * ((Math.PI * 2) / 3);
    }
    if (this.parts.aperture) {
      this.parts.aperture.target = (1 - (state.apertureLevel - 1)) * (Math.PI / 3);
    }

    // Swappable eyepiece length (10X = longer 60, 15X = shorter 26) while body tube stays stationary
    this.eyepieceTargetLen = state.eyepieceMag === 15 ? 26 : 60;
    if (this.eyepieceLabelSleeve && this.eyepieceTextures) {
      const targetTex = this.eyepieceTextures[state.eyepieceMag] || this.eyepieceTextures[10];
      if (this.eyepieceLabelSleeve.material.map !== targetTex) {
        this.eyepieceLabelSleeve.material.map = targetTex;
        this.eyepieceLabelSleeve.material.needsUpdate = true;
      }
    }

    if (this.slideGroup) {
      this.slideGroup.position.x = -state.slideOffsetY;
      this.slideGroup.position.z = state.slideOffsetX;
    }

    // Condenser, aperture-bounded stage illumination, & power switch feedback
    const lightOn = state.lightOn !== false;
    const apNorm = (state.apertureLevel - 1) / 5;
    const holeR = APERTURE_HOLES[state.apertureLevel - 1];
    const effectiveR = Math.min(holeR * 0.9, 11.4);

    if (this.lightStageMesh) {
      const stageScale = effectiveR / 12;
      this.lightStageMesh.scale.set(stageScale, 1, stageScale);
      this.lightStageMesh.material.color.setHex(lightOn ? 0xfef3c7 : 0x334155);
      this.lightStageMesh.material.emissiveIntensity = lightOn ? 0.25 + apNorm * 0.95 : 0;
    }
    if (this.lightSourceMesh) {
      this.lightSourceMesh.material.color.setHex(lightOn ? 0xfef3c7 : 0x334155);
      this.lightSourceMesh.material.emissiveIntensity = lightOn ? 0.45 + apNorm * 0.85 : 0;
    }
    if (this.lowerBeamMesh) {
      this.lowerBeamMesh.visible = lightOn;
      this.lowerBeamMesh.material.opacity = 0.08 + apNorm * 0.16;
      if (this.lastBeamApertureLevel !== state.apertureLevel) {
        this.lowerBeamMesh.geometry.dispose();
        this.lowerBeamMesh.geometry = new THREE.CylinderGeometry(
          effectiveR,
          Math.max(effectiveR, 20),
          1,
          24,
          1,
          true
        );
        this.lastBeamApertureLevel = state.apertureLevel;
      }
    }
    if (this.upperBeamMesh) {
      this.upperBeamMesh.visible = lightOn;
      this.upperBeamMesh.material.opacity = 0.08 + apNorm * 0.18;
      this.upperBeamMesh.scale.set(effectiveR, 1, effectiveR);
    }

    this.switchTargetAngle = lightOn ? 0.26 : -0.26;
    if (this.switchRockerMesh) {
      this.switchRockerMesh.material.color.setHex(lightOn ? 0x10b981 : 0x475569);
      this.switchRockerMesh.material.emissive.setHex(lightOn ? 0x059669 : 0x000000);
      this.switchRockerMesh.material.emissiveIntensity = lightOn ? 0.5 : 0;
      this.switchRockerMesh.userData.baseEmissive = lightOn ? 0x059669 : 0x000000;
    }
    if (this.switchLedMesh) {
      this.switchLedMesh.material.color.setHex(lightOn ? 0x22c55e : 0x7f1d1d);
      this.switchLedMesh.material.emissive.setHex(lightOn ? 0x22c55e : 0x450a0a);
      this.switchLedMesh.material.emissiveIntensity = lightOn ? 0.95 : 0.2;
    }

    if (opticsView) {
      this.refreshSlideTexture(opticsView, state);
    }
  }

  refreshSlideTexture(opticsView, state) {
    if (!opticsView || !state) return;
    opticsView.renderSlideTextureCanvas(this.slideTextureCanvas, state);
    this.slideTexture.needsUpdate = true;
  }

  _updatePointerNDC(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _getInteractiveMesh(partId) {
    if (partId === 'slide') return this.slideMesh;
    if (partId === 'eyepiece') return this.eyepieceBarrel;
    if (partId === 'light_switch') return this.switchRockerMesh;
    return this.parts[partId]?.mesh || null;
  }

  _setHoveredPart(partId) {
    if (this.hoveredId === partId) return;
    if (this.hoveredId) {
      const prevMesh = this._getInteractiveMesh(this.hoveredId);
      if (prevMesh && prevMesh.material && prevMesh.material.emissive) {
        prevMesh.material.emissive.setHex(prevMesh.userData.baseEmissive || 0x000000);
      }
    }
    this.hoveredId = partId;
    if (partId) {
      const nextMesh = this._getInteractiveMesh(partId);
      if (nextMesh && nextMesh.material && nextMesh.material.emissive) {
        nextMesh.material.emissive.setHex(0x1d4ed8);
      }
      this.renderer.domElement.style.cursor = partId.includes('knob') ? 'ns-resize' : 'pointer';
      if (partId === 'slide') this.renderer.domElement.style.cursor = 'grab';
      if (this.callbacks.onHoverPart) {
        this.callbacks.onHoverPart(nextMesh?.userData.label || '', nextMesh?.userData.hint || '');
      }
    } else {
      this.renderer.domElement.style.cursor = '';
      if (this.callbacks.onHoverPart) {
        this.callbacks.onHoverPart('', '拖曳空白處可旋轉 3D 視角，點擊或拖曳各顯微鏡部件直接操作');
      }
    }
  }

  _raycastStagePlane(event) {
    this._updatePointerNDC(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const planeY = this.stageTopY + this.stageGroup.position.y + 1.6;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }

  _bindPointerEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', (event) => {
      if (this.dragState) {
        const dx = event.clientX - this.dragState.startX;
        const dy = event.clientY - this.dragState.startY;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) this.dragState.moved = true;

        if (this.dragState.partId === 'big_knob' || this.dragState.partId === 'small_knob') {
          const sensitivity = this.dragState.partId === 'big_knob' ? 0.35 : 0.06;
          const nextZ = clamp(
            this.dragState.initialStageZ - dy * sensitivity,
            STAGE_Z_RANGE.min,
            STAGE_Z_RANGE.max
          );
          if (this.callbacks.onStageZChange) this.callbacks.onStageZChange(nextZ);
        } else if (this.dragState.partId === 'slide') {
          const hit = this._raycastStagePlane(event);
          if (hit && this.dragState.planeStart) {
            const nx = clamp(
              this.dragState.initialSlideX + (hit.z - this.dragState.planeStart.z),
              SLIDE_OFFSET_X_RANGE.min,
              SLIDE_OFFSET_X_RANGE.max
            );
            const ny = clamp(
              this.dragState.initialSlideY - (hit.x - this.dragState.planeStart.x),
              SLIDE_OFFSET_Y_RANGE.min,
              SLIDE_OFFSET_Y_RANGE.max
            );
            if (this.callbacks.onSlideOffsetChange) this.callbacks.onSlideOffsetChange(nx, ny);
          }
        }
        return;
      }

      this._updatePointerNDC(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactiveMeshes, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        this._setHoveredPart(hitObj.userData.partId || null);
      } else {
        this._setHoveredPart(null);
      }
    });

    dom.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.state) return;
      this._updatePointerNDC(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactiveMeshes, true);
      if (hits.length === 0) return;

      const partId = hits[0].object.userData.partId;
      if (!partId) return;

      this.controls.enabled = false;
      const planeStart = partId === 'slide' ? this._raycastStagePlane(event) : null;
      this.dragState = {
        partId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        initialStageZ: this.state.stageZ,
        initialSlideX: this.state.slideOffsetX,
        initialSlideY: this.state.slideOffsetY,
        planeStart,
        hitPoint: hits[0].point.clone(),
      };
      if (partId === 'slide') dom.style.cursor = 'grabbing';
    });

    window.addEventListener('pointerup', () => {
      if (!this.dragState) return;
      const { partId, moved, hitPoint } = this.dragState;
      this.dragState = null;
      this.controls.enabled = true;

      if (!moved && this.state) {
        if (partId === 'objective' && this.callbacks.onCycleObjective) {
          this.callbacks.onCycleObjective();
        } else if (partId === 'aperture' && this.callbacks.onCycleAperture) {
          this.callbacks.onCycleAperture();
        } else if (partId === 'eyepiece' && this.callbacks.onCycleEyepiece) {
          this.callbacks.onCycleEyepiece();
        } else if (partId === 'light_switch' && this.callbacks.onToggleLight) {
          this.callbacks.onToggleLight();
        } else if ((partId === 'big_knob' || partId === 'small_knob') && this.callbacks.onStageZChange) {
          const step = partId === 'big_knob' ? 3 : 0.6;
          const dir = hitPoint && hitPoint.y >= 150 ? 1 : -1;
          this.callbacks.onStageZChange(
            clamp(this.state.stageZ + dir * step, STAGE_Z_RANGE.min, STAGE_Z_RANGE.max)
          );
        }
      }
    });
  }

  _bindResizeObserver() {
    const resize = () => {
      const w = Math.max(100, this.container.clientWidth);
      const h = Math.max(100, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(this.container);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    Object.values(this.parts).forEach((part) => {
      part.current = THREE.MathUtils.lerp(part.current, part.target, 0.2);
      const q = new THREE.Quaternion().setFromAxisAngle(part.axis, part.current);
      part.pivot.quaternion.copy(q);
    });

    this.stageGroup.position.y = THREE.MathUtils.lerp(
      this.stageGroup.position.y,
      this.stageTargetY,
      0.22
    );

    if (this.lowerBeamMesh && this.lowerBeamMesh.visible) {
      const diskBottomY = 182.5 + this.stageGroup.position.y;
      const h1 = Math.max(4, diskBottomY - 75);
      this.lowerBeamMesh.scale.set(1, h1, 1);
      this.lowerBeamMesh.position.set(0, 75 + h1 / 2, 0);
    }

    if (this.eyepieceBarrel && this.eyepieceTopGroup) {
      this.eyepieceCurrentLen = THREE.MathUtils.lerp(
        this.eyepieceCurrentLen,
        this.eyepieceTargetLen,
        0.22
      );
      this.eyepieceBarrel.scale.set(1, this.eyepieceCurrentLen, 1);
      this.eyepieceBarrel.position.y = this.eyepieceCurrentLen / 2;
      if (this.eyepieceLabelSleeve) {
        this.eyepieceLabelSleeve.position.y = this.eyepieceCurrentLen * 0.5;
      }
      this.eyepieceTopGroup.position.y = this.eyepieceCurrentLen;
    }

    if (this.switchRockerPivot) {
      this.switchRockerPivot.rotation.z = THREE.MathUtils.lerp(
        this.switchRockerPivot.rotation.z,
        this.switchTargetAngle,
        0.25
      );
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._updateLabels();
  }
}

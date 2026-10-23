import * as THREE from 'three';

/**
 * 模型三：葉綠體構造與葉綠餅剖面 (Chloroplast 3D Model)
 * 包含雙層被膜、基粒葉綠餅 (Grana Thylakoids)、基質片層 (Stroma Lamellae)、基質與澱粉粒
 */
export function createChloroplastModel() {
  const group = new THREE.Group();
  group.name = 'chloroplast';

  const outerRadius = 4.2;
  const outerHeight = 2.2;
  const innerRadius = 3.8;
  const innerHeight = 1.9;

  // 剖面裁切平面：切除 Z > 0 區域
  const slicePlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.1);
  const cutawayPlanes = [slicePlane];

  let cutawayEnabled = true;
  const clippableMaterials = [];

  function registerClippableMaterial(mat) {
    clippableMaterials.push(mat);
    mat.clippingPlanes = cutawayEnabled ? cutawayPlanes : null;
    mat.clipIntersection = false;
    return mat;
  }

  // --- 1. 外被膜 (Outer Envelope) ---
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.5,
    roughness: 0.3,
    metalness: 0.1,
    transmission: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  registerClippableMaterial(outerMat);

  const outerGeo = new THREE.SphereGeometry(outerRadius, 36, 24);
  outerGeo.scale(1.0, outerHeight / outerRadius, 0.75); // 壓扁成雙凸透鏡盤狀
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.userData = { organelleId: 'envelope', name: '葉綠體外膜 (Outer Envelope)' };
  group.add(outerMesh);

  // --- 2. 內膜 (Inner Envelope) ---
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 0.45,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(innerMat);

  const innerGeo = new THREE.SphereGeometry(innerRadius, 32, 20);
  innerGeo.scale(1.0, innerHeight / innerRadius, 0.75);
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.userData = { organelleId: 'envelope', name: '葉綠體內膜 (Inner Envelope)' };
  group.add(innerMesh);

  // --- 3. 葉綠體基質 (Stroma Volume) ---
  const stromaMat = new THREE.MeshStandardMaterial({
    color: 0xdcfce7,
    transparent: true,
    opacity: 0.2,
    roughness: 0.8,
    side: THREE.BackSide,
    depthWrite: false
  });
  registerClippableMaterial(stromaMat);

  const stromaGeo = new THREE.SphereGeometry(innerRadius * 0.98, 28, 18);
  stromaGeo.scale(1.0, (innerHeight * 0.98) / (innerRadius * 0.98), 0.75);
  const stromaMesh = new THREE.Mesh(stromaGeo, stromaMat);
  stromaMesh.userData = { organelleId: 'stroma', name: '葉綠體基質 (Stroma)' };
  group.add(stromaMesh);

  // --- 4. 葉綠餅 / 類囊體堆疊 (Grana Thylakoid Stacks) ---
  const granaMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // 深綠色葉綠素富集
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(granaMat);

  const granaGroup = new THREE.Group();
  granaGroup.userData = { organelleId: 'grana', name: '葉綠餅 / 類囊體 (Grana Thylakoids)' };

  // 擺放 7 座不同位置與高度的硬幣狀葉綠餅
  const granaConfigs = [
    { x: -1.6, z: -0.6, discs: 9, r: 0.52 },
    { x: -0.5, z: -1.2, discs: 8, r: 0.48 },
    { x: 0.8, z: -0.8, discs: 10, r: 0.55 },
    { x: 1.8, z: -0.5, discs: 7, r: 0.45 },
    { x: -1.2, z: -1.5, discs: 7, r: 0.46 },
    { x: 0.2, z: -1.8, discs: 8, r: 0.5 },
    { x: 1.4, z: -1.4, discs: 8, r: 0.48 }
  ];

  const discThickness = 0.08;
  const discGap = 0.035;

  granaConfigs.forEach((cfg, sIdx) => {
    const stackGroup = new THREE.Group();
    const totalHeight = cfg.discs * (discThickness + discGap);
    const yStart = -totalHeight * 0.5;

    for (let d = 0; d < cfg.discs; d++) {
      const discGeo = new THREE.CylinderGeometry(cfg.r, cfg.r, discThickness, 20);
      const discMesh = new THREE.Mesh(discGeo, granaMat);
      discMesh.position.set(0, yStart + d * (discThickness + discGap), 0);
      discMesh.userData = { organelleId: 'grana', name: '類囊體扁囊 (Thylakoid Disc)' };
      stackGroup.add(discMesh);
    }

    stackGroup.position.set(cfg.x, 0, cfg.z);
    granaGroup.add(stackGroup);
  });

  group.add(granaGroup);

  // --- 5. 基質片層 (Stroma Lamellae Bridges) ---
  const lamellaeMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(lamellaeMat);

  const lamellaeGroup = new THREE.Group();
  lamellaeGroup.userData = { organelleId: 'lamellae', name: '基質片層 (Stroma Lamellae)' };

  // 在不同葉綠餅間拉出扁平橫向片層與管路
  const bridges = [
    { from: [-1.6, -0.1, -0.6], to: [-0.5, 0.0, -1.2], w: 0.22 },
    { from: [-0.5, 0.1, -1.2], to: [0.8, 0.0, -0.8], w: 0.25 },
    { from: [0.8, -0.15, -0.8], to: [1.8, -0.1, -0.5], w: 0.2 },
    { from: [-1.2, 0.05, -1.5], to: [0.2, 0.1, -1.8], w: 0.18 },
    { from: [0.2, -0.05, -1.8], to: [1.4, 0.0, -1.4], w: 0.2 }
  ];

  bridges.forEach(br => {
    const p1 = new THREE.Vector3(...br.from);
    const p2 = new THREE.Vector3(...br.to);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);

    // 扁平管路連結
    const bridgeGeo = new THREE.BoxGeometry(dist, 0.05, br.w);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, lamellaeMat);
    bridgeMesh.position.copy(mid);

    // 朝向目標
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    bridgeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    bridgeMesh.userData = { organelleId: 'lamellae', name: '基質片層橋 (Lamella Tube)' };
    lamellaeGroup.add(bridgeMesh);
  });

  group.add(lamellaeGroup);

  // --- 6. 暫存澱粉粒 (Starch Granules) ---
  const starchMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
    metalness: 0.05
  });
  registerClippableMaterial(starchMat);

  const starchGeo = new THREE.SphereGeometry(0.3, 16, 12);
  starchGeo.scale(1.4, 0.7, 0.9); // 扁橢圓澱粉粒

  const starch1 = new THREE.Mesh(starchGeo, starchMat);
  starch1.position.set(-2.0, -0.2, -1.0);
  starch1.rotation.set(0.2, 0.5, -0.1);
  starch1.userData = { organelleId: 'starch', name: '暫存澱粉粒 (Starch Granule)' };
  group.add(starch1);

  const starch2 = new THREE.Mesh(starchGeo, starchMat);
  starch2.position.set(2.2, 0.1, -0.8);
  starch2.rotation.set(-0.3, -0.4, 0.2);
  starch2.scale.set(0.8, 0.8, 0.8);
  starch2.userData = { organelleId: 'starch', name: '暫存澱粉粒 (Starch Granule)' };
  group.add(starch2);

  // --- 7. 環狀葉綠體 DNA (cpDNA) ---
  const cpdnaMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.3,
    metalness: 0.3,
    emissive: 0x059669,
    emissiveIntensity: 0.25
  });
  registerClippableMaterial(cpdnaMat);

  const cpdnaGeo = new THREE.TorusKnotGeometry(0.42, 0.045, 48, 10, 2, 3);
  const cpdnaMesh = new THREE.Mesh(cpdnaGeo, cpdnaMat);
  cpdnaMesh.position.set(0.3, 0.3, -1.0);
  cpdnaMesh.rotation.set(0.4, 0.2, 0.6);
  cpdnaMesh.userData = { organelleId: 'stroma', name: '環狀葉綠體 DNA (cpDNA)' };
  group.add(cpdnaMesh);

  // 搜集互動網格
  const interactiveObjects = [];
  group.traverse(obj => {
    if (obj.isMesh && obj.userData && obj.userData.organelleId) {
      interactiveObjects.push(obj);
    }
  });

  return {
    group,
    interactiveObjects,
    defaultCameraPosition: new THREE.Vector3(0, 4.0, 8.5),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    setCutaway(enabled) {
      cutawayEnabled = enabled;
      clippableMaterials.forEach(mat => {
        mat.clippingPlanes = enabled ? cutawayPlanes : null;
        mat.needsUpdate = true;
      });
    },
    update(time, delta) {
      cpdnaMesh.rotation.y += 0.007;
    },
    dispose() {
      group.traverse(obj => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        }
      });
    }
  };
}

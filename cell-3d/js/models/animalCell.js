import * as THREE from 'three';

/**
 * 模型一：動物細胞全景 (Animal Cell Panorama)
 * 具備 1/4 立體楔形剖面 (Wedge Cutaway)、完整胞器群與發光高亮互動
 */
export function createAnimalCellModel() {
  const group = new THREE.Group();
  group.name = 'animalCell';

  const CELL_RADIUS = 4.0;

  // 裁切平面：切除 X > 0 且 Z > 0 的第一卦限 1/4 區域
  const planeX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const cutawayPlanes = [planeX, planeZ];

  let cutawayEnabled = true;

  // 需跟隨裁切開關的材質清單
  const clippableMaterials = [];

  function registerClippableMaterial(mat) {
    clippableMaterials.push(mat);
    mat.clippingPlanes = cutawayEnabled ? cutawayPlanes : null;
    mat.clipIntersection = false;
    return mat;
  }

  // --- 1. 細胞膜 (Cell Membrane) ---
  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.38,
    roughness: 0.25,
    metalness: 0.1,
    transmission: 0.45,
    ior: 1.33,
    clearcoat: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  registerClippableMaterial(membraneMat);

  const membraneGeo = new THREE.SphereGeometry(CELL_RADIUS, 48, 32);
  const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
  membraneMesh.userData = { organelleId: 'membrane', name: '細胞膜 (Cell Membrane)' };
  group.add(membraneMesh);

  // 剖面切線邊框 (Cut Line highlight)
  const cutLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: false });
  const cutLineGroup = new THREE.Group();

  // XY 剖面弧 (Z=0, X<0, Y from -R to R) -> 半圓
  const arcCurveXY = new THREE.EllipseCurve(0, 0, CELL_RADIUS, CELL_RADIUS, Math.PI * 0.5, Math.PI * 1.5, false, 0);
  const arcPtsXY = arcCurveXY.getPoints(36).map(p => new THREE.Vector3(p.x, p.y, 0));
  const arcGeoXY = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPtsXY), 36, 0.05, 8, false);
  const cutLineXY = new THREE.Mesh(arcGeoXY, cutLineMat);
  cutLineGroup.add(cutLineXY);

  // YZ 剖面弧 (X=0, Z<0, Y from -R to R)
  const arcCurveYZ = new THREE.EllipseCurve(0, 0, CELL_RADIUS, CELL_RADIUS, Math.PI * 0.5, Math.PI * 1.5, false, 0);
  const arcPtsYZ = arcCurveYZ.getPoints(36).map(p => new THREE.Vector3(0, p.y, p.x));
  const arcGeoYZ = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPtsYZ), 36, 0.05, 8, false);
  const cutLineYZ = new THREE.Mesh(arcGeoYZ, cutLineMat);
  cutLineGroup.add(cutLineYZ);

  group.add(cutLineGroup);

  // --- 2. 細胞質襯底球 (Cytoplasm Volume) ---
  const cytoMat = new THREE.MeshStandardMaterial({
    color: 0xeff6ff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.9,
    side: THREE.BackSide,
    depthWrite: false
  });
  registerClippableMaterial(cytoMat);
  const cytoMesh = new THREE.Mesh(new THREE.SphereGeometry(CELL_RADIUS * 0.99, 32, 24), cytoMat);
  group.add(cytoMesh);

  // --- 3. 細胞核 (Nucleus) ---
  const nucleusGroup = new THREE.Group();
  nucleusGroup.position.set(0, 0.35, 0);
  nucleusGroup.userData = { organelleId: 'nucleus', name: '細胞核 (Nucleus)' };

  // 外層核膜 (Nuclear Envelope)
  const nucEnvMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(nucEnvMat);
  const nucEnvMesh = new THREE.Mesh(new THREE.SphereGeometry(CELL_RADIUS * 0.36, 32, 24), nucEnvMat);
  nucEnvMesh.userData = { organelleId: 'nucleus', name: '核膜 (Nuclear Envelope)' };
  nucleusGroup.add(nucEnvMesh);

  // 內部核仁 (Nucleolus)
  const nucleolusMat = new THREE.MeshStandardMaterial({
    color: 0x581c87,
    roughness: 0.7,
    metalness: 0.1
  });
  const nucleolusMesh = new THREE.Mesh(new THREE.SphereGeometry(CELL_RADIUS * 0.14, 24, 16), nucleolusMat);
  nucleolusMesh.position.set(-0.15, -0.1, -0.15);
  nucleolusMesh.userData = { organelleId: 'nucleus', name: '核仁 (Nucleolus)' };
  nucleusGroup.add(nucleolusMesh);

  // 染色質絲 (Chromatin fibers)
  const chromatinMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    roughness: 0.6,
    wireframe: true
  });
  const chromatinMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(CELL_RADIUS * 0.22, 0.05, 48, 8, 2, 3), chromatinMat);
  chromatinMesh.position.set(-0.1, 0, -0.1);
  nucleusGroup.add(chromatinMesh);

  group.add(nucleusGroup);

  // --- 4. 粒線體 (Mitochondria) ---
  const mitoMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
    metalness: 0.2
  });
  registerClippableMaterial(mitoMat);

  const mitoGeo = new THREE.CapsuleGeometry(CELL_RADIUS * 0.075, CELL_RADIUS * 0.22, 12, 24);
  const mitoPositions = [
    { p: [-1.2, 0.8, -1.2], r: [0.3, 0.8, 0.2] },
    { p: [-1.8, -0.6, -0.8], r: [-0.4, 0.3, 0.6] },
    { p: [-0.6, -1.8, -1.0], r: [0.5, -0.2, 0.9] },
    { p: [-1.6, 1.2, 0.6], r: [0.1, -0.6, 0.4] },
    { p: [-0.5, 1.6, -1.6], r: [0.7, 0.4, -0.3] },
    { p: [0.4, -1.4, -1.8], r: [-0.2, 0.9, 0.5] }
  ];

  mitoPositions.forEach(cfg => {
    const mito = new THREE.Mesh(mitoGeo, mitoMat);
    mito.position.set(cfg.p[0], cfg.p[1], cfg.p[2]);
    mito.rotation.set(cfg.r[0], cfg.r[1], cfg.r[2]);
    mito.userData = { organelleId: 'mitochondria', name: '粒線體 (Mitochondrion)' };
    group.add(mito);
  });

  // --- 5. 內質網 (Endoplasmic Reticulum) ---
  const erMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(erMat);

  const erGroup = new THREE.Group();
  erGroup.userData = { organelleId: 'er', name: '內質網 (Endoplasmic Reticulum)' };

  const erTorusGeo1 = new THREE.TorusGeometry(CELL_RADIUS * 0.48, CELL_RADIUS * 0.06, 16, 32, Math.PI * 1.4);
  const er1 = new THREE.Mesh(erTorusGeo1, erMat);
  er1.position.set(-0.2, 0.4, -0.2);
  er1.rotation.set(0.4, -0.3, 0.2);
  erGroup.add(er1);

  const erTorusGeo2 = new THREE.TorusGeometry(CELL_RADIUS * 0.6, CELL_RADIUS * 0.05, 16, 32, Math.PI * 1.2);
  const er2 = new THREE.Mesh(erTorusGeo2, erMat);
  er2.position.set(-0.3, 0.25, -0.35);
  er2.rotation.set(-0.2, 0.5, -0.4);
  erGroup.add(er2);

  const erTorusGeo3 = new THREE.TorusGeometry(CELL_RADIUS * 0.72, CELL_RADIUS * 0.045, 16, 32, Math.PI * 1.0);
  const er3 = new THREE.Mesh(erTorusGeo3, erMat);
  er3.position.set(-0.35, 0.1, -0.5);
  er3.rotation.set(0.3, 0.8, -0.1);
  erGroup.add(er3);

  // 核糖體顆粒點綴於粗糙內質網
  const riboMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });
  const riboGeo = new THREE.SphereGeometry(0.04, 6, 6);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 1.3;
    const r = CELL_RADIUS * 0.48;
    const ribo = new THREE.Mesh(riboGeo, riboMat);
    ribo.position.set(-0.2 + r * Math.cos(angle), 0.4 + (Math.sin(i) * 0.08), -0.2 + r * Math.sin(angle));
    erGroup.add(ribo);
  }

  group.add(erGroup);

  // --- 6. 高基氏體 (Golgi Apparatus) ---
  const golgiGroup = new THREE.Group();
  golgiGroup.userData = { organelleId: 'golgi', name: '高基氏體 (Golgi Apparatus)' };
  const golgiMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(golgiMat);

  const numCisternae = 5;
  for (let i = 0; i < numCisternae; i++) {
    const radius = CELL_RADIUS * (0.28 - i * 0.02);
    const cisternaGeo = new THREE.CylinderGeometry(radius, radius, 0.07, 24);
    const cisterna = new THREE.Mesh(cisternaGeo, golgiMat);
    cisterna.position.set(-1.4 + i * 0.08, -1.2 + i * 0.12, 0.8 - i * 0.08);
    cisterna.rotation.set(0.3, 0.4, 0.1 + i * 0.04);
    cisterna.scale.set(1.2, 1, 0.7); // 扁橢圓
    cisterna.userData = { organelleId: 'golgi', name: '高基氏體 (Golgi Apparatus)' };
    golgiGroup.add(cisterna);
  }

  // 分泌囊泡 (Secretory Vesicles)
  const vesicleMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });
  registerClippableMaterial(vesicleMat);
  const vesicleGeo = new THREE.SphereGeometry(0.09, 12, 8);
  const vesiclePos = [
    [-1.0, -1.0, 0.8], [-1.2, -0.9, 1.0], [-1.6, -1.3, 0.5],
    [-1.5, -1.4, 0.9], [-0.8, -1.1, 0.6]
  ];
  vesiclePos.forEach(p => {
    const ves = new THREE.Mesh(vesicleGeo, vesicleMat);
    ves.position.set(p[0], p[1], p[2]);
    ves.userData = { organelleId: 'golgi', name: '分泌囊泡 (Secretory Vesicle)' };
    golgiGroup.add(ves);
  });

  group.add(golgiGroup);

  // --- 7. 溶體與過氧化體 (Lysosomes & Peroxisomes) ---
  const lysosomeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.3,
    metalness: 0.1
  });
  registerClippableMaterial(lysosomeMat);
  const lysoGeo = new THREE.SphereGeometry(CELL_RADIUS * 0.065, 16, 12);
  const lysoPositions = [
    [-0.8, -1.2, -1.8],
    [-2.2, 0.3, -0.4],
    [-1.4, 1.8, -0.9],
    [-0.3, 1.9, 0.8],
    [-1.9, -1.5, -0.3],
    [0.2, -1.8, -1.2]
  ];
  lysoPositions.forEach(p => {
    const lyso = new THREE.Mesh(lysoGeo, lysosomeMat);
    lyso.position.set(p[0], p[1], p[2]);
    lyso.userData = { organelleId: 'lysosome', name: '溶體 (Lysosome)' };
    group.add(lyso);
  });

  // --- 8. 中心體 / 中心粒 (Centrosome / Centrioles) ---
  const centrioleGroup = new THREE.Group();
  centrioleGroup.position.set(0.6, 1.3, -0.8);
  centrioleGroup.userData = { organelleId: 'centriole', name: '中心體 / 中心粒 (Centrioles)' };

  const centrioleMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.4,
    metalness: 0.3
  });
  registerClippableMaterial(centrioleMat);

  // 構造 9 組微管組成的小圓柱桶
  function buildCentrioleBarrel() {
    const barrel = new THREE.Group();
    const mtGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8);
    const radius = 0.09;
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const mt = new THREE.Mesh(mtGeo, centrioleMat);
      mt.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      barrel.add(mt);
    }
    return barrel;
  }

  const barrel1 = buildCentrioleBarrel();
  const barrel2 = buildCentrioleBarrel();
  barrel2.rotation.z = Math.PI / 2; // 兩中心粒互成 90 度垂直
  barrel2.position.set(0.2, 0.1, 0);

  centrioleGroup.add(barrel1);
  centrioleGroup.add(barrel2);
  group.add(centrioleGroup);

  // 搜集所有可供點選/Hover 的互動網格
  const interactiveObjects = [];
  group.traverse(obj => {
    if (obj.isMesh && obj.userData && obj.userData.organelleId) {
      interactiveObjects.push(obj);
    }
  });

  return {
    group,
    interactiveObjects,
    defaultCameraPosition: new THREE.Vector3(CELL_RADIUS * 1.8, CELL_RADIUS * 1.5, CELL_RADIUS * 1.8),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    setCutaway(enabled) {
      cutawayEnabled = enabled;
      clippableMaterials.forEach(mat => {
        mat.clippingPlanes = enabled ? cutawayPlanes : null;
        mat.needsUpdate = true;
      });
      cutLineGroup.visible = enabled;
    },
    update(time, delta) {
      // 緩慢自轉細微漂浮
      nucleusGroup.rotation.y = Math.sin(time * 0.5) * 0.03;
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

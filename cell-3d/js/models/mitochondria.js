import * as THREE from 'three';

/**
 * 模型二：粒線體雙層膜剖面 (Mitochondria 3D Model)
 * 包含平滑外膜、膜間腔、摺疊內膜嵴 (CatmullRomCurve3 Cristae)、基質、環狀 mtDNA 與 70S 核糖體
 */
export function createMitochondriaModel() {
  const group = new THREE.Group();
  group.name = 'mitochondria';

  const outerRadius = 2.4;
  const outerLength = 6.0;
  const innerRadius = 1.95;
  const innerLength = 5.4;

  // 剖面裁切平面：切除 Z > 0 的前向剖半
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

  // --- 1. 平滑外膜 (Outer Membrane) ---
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.55,
    roughness: 0.35,
    metalness: 0.1,
    transmission: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  registerClippableMaterial(outerMat);

  const outerGeo = new THREE.CapsuleGeometry(outerRadius, outerLength, 16, 32);
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.userData = { organelleId: 'outerMembrane', name: '平滑外膜 (Outer Membrane)' };
  group.add(outerMesh);

  // --- 2. 膜間腔 / 內膜 (Inner Membrane Capsule) ---
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(innerMat);

  const innerGeo = new THREE.CapsuleGeometry(innerRadius, innerLength, 16, 32);
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.userData = { organelleId: 'innerMembrane', name: '粒線體內膜 (Inner Membrane)' };
  group.add(innerMesh);

  // --- 3. 內膜嵴 (Cristae Folds - Procedural CatmullRomCurve3) ---
  const cristaeMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.4,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  registerClippableMaterial(cristaeMat);

  const cristaeGroup = new THREE.Group();
  cristaeGroup.userData = { organelleId: 'innerMembrane', name: '粒線體嵴 (Cristae)' };

  // 沿 Y 軸長度分佈多道深度向內蜿蜒的曲面嵴
  const cristaeLevels = [
    -2.2, -1.8, -1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4, 1.8, 2.2
  ];

  cristaeLevels.forEach((yLevel, idx) => {
    // 兩側向中央凹伸的立體折曲
    const sideSign = (idx % 2 === 0) ? 1 : -1;
    const curvePoints = [
      new THREE.Vector3(sideSign * (innerRadius - 0.05), yLevel, -0.2),
      new THREE.Vector3(sideSign * (innerRadius * 0.55), yLevel + 0.12, -0.5),
      new THREE.Vector3(sideSign * (innerRadius * 0.1), yLevel - 0.08, -0.2),
      new THREE.Vector3(-sideSign * (innerRadius * 0.35), yLevel + 0.1, -0.6),
      new THREE.Vector3(-sideSign * (innerRadius * 0.7), yLevel - 0.05, -0.3)
    ];

    const spline = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(spline, 24, 0.18, 8, false);
    const cristaTube = new THREE.Mesh(tubeGeo, cristaeMat);
    cristaTube.userData = { organelleId: 'innerMembrane', name: '嵴褶管 (Crista Tube)' };
    cristaeGroup.add(cristaTube);

    // 搭配翼狀片層 (Lamellar Sheet) 擴充表面積
    const sheetGeo = new THREE.PlaneGeometry(innerRadius * 1.1, 0.32, 8, 4);
    const sheetMesh = new THREE.Mesh(sheetGeo, cristaeMat);
    sheetMesh.position.set(sideSign * 0.2, yLevel, -0.4);
    sheetMesh.rotation.y = (idx * 0.3);
    sheetMesh.userData = { organelleId: 'innerMembrane', name: '嵴片層 (Crista Sheet)' };
    cristaeGroup.add(sheetMesh);
  });

  group.add(cristaeGroup);

  // --- 4. 粒線體基質 (Matrix Volume) ---
  const matrixMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.18,
    roughness: 0.8,
    side: THREE.BackSide,
    depthWrite: false
  });
  registerClippableMaterial(matrixMat);

  const matrixMesh = new THREE.Mesh(new THREE.CapsuleGeometry(innerRadius * 0.95, innerLength * 0.95, 12, 16), matrixMat);
  matrixMesh.userData = { organelleId: 'matrix', name: '粒線體基質 (Matrix)' };
  group.add(matrixMesh);

  // --- 5. 環狀粒線體 DNA (mtDNA) ---
  const dnaMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0x059669,
    emissiveIntensity: 0.2
  });
  registerClippableMaterial(dnaMat);

  const dnaGeo = new THREE.TorusKnotGeometry(0.55, 0.055, 64, 12, 2, 3);
  const dnaMesh1 = new THREE.Mesh(dnaGeo, dnaMat);
  dnaMesh1.position.set(0.2, 0.8, -0.5);
  dnaMesh1.rotation.set(0.5, 0.8, 0);
  dnaMesh1.userData = { organelleId: 'mtdna', name: '環狀粒線體 DNA (mtDNA)' };
  group.add(dnaMesh1);

  const dnaMesh2 = new THREE.Mesh(dnaGeo, dnaMat);
  dnaMesh2.position.set(-0.25, -1.2, -0.5);
  dnaMesh2.rotation.set(-0.6, 0.4, 0.8);
  dnaMesh2.scale.set(0.85, 0.85, 0.85);
  dnaMesh2.userData = { organelleId: 'mtdna', name: '環狀粒線體 DNA (mtDNA)' };
  group.add(dnaMesh2);

  // --- 6. 70S 核糖體顆粒 (Mitoribosomes) ---
  const riboMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.5,
    metalness: 0.2
  });
  registerClippableMaterial(riboMat);

  const riboGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const riboGroup = new THREE.Group();
  riboGroup.userData = { organelleId: 'ribosomes', name: '70S 核糖體 (Mitoribosomes)' };

  const riboPositions = [
    [-0.5, 0.3, -0.6], [0.6, -0.4, -0.5], [-0.3, 1.6, -0.4],
    [0.4, 1.8, -0.7], [-0.4, -1.8, -0.6], [0.5, -2.1, -0.4],
    [0.1, 0.1, -0.8], [-0.6, -0.9, -0.5], [0.3, -0.7, -0.9]
  ];

  riboPositions.forEach(p => {
    const ribo = new THREE.Mesh(riboGeo, riboMat);
    ribo.position.set(p[0], p[1], p[2]);
    riboGroup.add(ribo);
  });
  group.add(riboGroup);

  // --- 7. ATP 合成酶複合物 (ATP Synthase Particles on cristae) ---
  const atpMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
  registerClippableMaterial(atpMat);
  const atpHeadGeo = new THREE.SphereGeometry(0.045, 6, 6);
  for (let i = 0; i < 18; i++) {
    const atp = new THREE.Mesh(atpHeadGeo, atpMat);
    const y = -2.0 + (i / 18) * 4.0;
    atp.position.set((i % 2 === 0 ? 0.35 : -0.35), y, -0.3 + Math.sin(i) * 0.15);
    atp.userData = { organelleId: 'innerMembrane', name: 'ATP 合成酶 (ATP Synthase)' };
    group.add(atp);
  }

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
    defaultCameraPosition: new THREE.Vector3(0, 2.5, 9.5),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    setCutaway(enabled) {
      cutawayEnabled = enabled;
      clippableMaterials.forEach(mat => {
        mat.clippingPlanes = enabled ? cutawayPlanes : null;
        mat.needsUpdate = true;
      });
    },
    update(time, delta) {
      // mtDNA 緩慢自轉
      dnaMesh1.rotation.y += 0.008;
      dnaMesh2.rotation.z += 0.006;
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

import * as THREE from 'three';

/**
 * 模型四：雙凹紅血球 (Red Blood Cell 3D Model)
 * 基於 Evans-Fung 生物物理數學公式生成之封閉光滑雙凹圓盤 (Biconcave Disc)
 * 搭配真實高光澤蛋白液態血感 MeshPhysicalMaterial
 */
export function createRBCModel() {
  const group = new THREE.Group();
  group.name = 'rbc';

  const R = 3.6; // 等比放大便於 3D 觀察 (代表真實 7.8 μm 直徑)
  const D0 = R;

  // Evans-Fung 經驗係數
  const c0 = 0.207;
  const c1 = 2.00;
  const c2 = -1.122;

  function evansFungHeight(r) {
    const x = Math.min(r / R, 0.9999);
    const x2 = x * x;
    const x4 = x2 * x2;
    const term = c0 + c1 * x2 + c2 * x4;
    return 0.5 * D0 * Math.sqrt(1 - x2) * term;
  }

  // 生成封閉半截面路徑點，供 LatheGeometry 繞 Y 軸旋轉 360 度
  const profilePoints = [];
  const N = 40;

  // 1. 上表面（由中心 r=0 到邊緣 r=R）
  for (let i = 0; i <= N; i++) {
    const r = (i / N) * R;
    const y = evansFungHeight(r);
    profilePoints.push(new THREE.Vector2(r, y));
  }

  // 2. 下表面（由邊緣 r=R 回到中心 r=0，對稱 -y）
  for (let i = N - 1; i >= 0; i--) {
    const r = (i / N) * R;
    const y = -evansFungHeight(r);
    profilePoints.push(new THREE.Vector2(r, y));
  }

  const rbcGeo = new THREE.LatheGeometry(profilePoints, 64);
  rbcGeo.computeVertexNormals();

  // 生物高仿真物理材質：鮮紅血色、Clearcoat 反光面與絲綢 Sheen 次表面光澤
  const rbcMat = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.12,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xf87171),
    reflectivity: 0.75,
    side: THREE.DoubleSide
  });

  const rbcMesh = new THREE.Mesh(rbcGeo, rbcMat);
  rbcMesh.userData = { organelleId: 'biconcaveDisc', name: '雙凹圓盤幾何 (Biconcave Disc)' };
  group.add(rbcMesh);

  // --- 附屬構造：網狀 Spectrin 細胞骨架與血紅素示意 ---
  // Spectrin 網格（內襯六角網格線圈）
  const spectrinMat = new THREE.MeshBasicMaterial({
    color: 0xfca5a5,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const spectrinGeo = new THREE.LatheGeometry(profilePoints, 32);
  spectrinGeo.scale(0.98, 0.98, 0.98);
  const spectrinMesh = new THREE.Mesh(spectrinGeo, spectrinMat);
  spectrinMesh.userData = { organelleId: 'spectrinSkeleton', name: 'Spectrin 彈性細胞骨架' };
  group.add(spectrinMesh);

  // 氧分子 (O2) 與二氧化碳 (CO2) 氣體交換分子示意微粒
  const gasGroup = new THREE.Group();
  const o2Mat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3
  });
  const co2Mat = new THREE.MeshStandardMaterial({
    color: 0xa1a1aa,
    roughness: 0.3
  });

  const gasMolecules = [];
  const gasCount = 14;

  for (let i = 0; i < gasCount; i++) {
    const isO2 = i % 2 === 0;
    const pair = new THREE.Group();
    const atomGeo = new THREE.SphereGeometry(0.08, 10, 8);

    if (isO2) {
      // O=O 雙原子分子
      const a1 = new THREE.Mesh(atomGeo, o2Mat);
      const a2 = new THREE.Mesh(atomGeo, o2Mat);
      a1.position.set(-0.06, 0, 0);
      a2.position.set(0.06, 0, 0);
      pair.add(a1, a2);
      pair.userData = { organelleId: 'hemoglobin', name: '氧分子 (O₂)' };
    } else {
      // O=C=O 三原子分子
      const cAtom = new THREE.Mesh(atomGeo, co2Mat);
      const o1 = new THREE.Mesh(atomGeo, o2Mat);
      const o2 = new THREE.Mesh(atomGeo, o2Mat);
      o1.position.set(-0.11, 0, 0);
      o2.position.set(0.11, 0, 0);
      pair.add(cAtom, o1, o2);
      pair.userData = { organelleId: 'hemoglobin', name: '二氧化碳 (CO₂)' };
    }

    const angle = (i / gasCount) * Math.PI * 2;
    const dist = R * (1.15 + (i % 3) * 0.15);
    const yOffset = ((i % 4) - 1.5) * 0.5;
    pair.position.set(Math.cos(angle) * dist, yOffset, Math.sin(angle) * dist);

    gasMolecules.push({
      group: pair,
      baseAngle: angle,
      dist,
      yOffset,
      speed: 0.4 + (i % 3) * 0.2
    });
    gasGroup.add(pair);
  }
  group.add(gasGroup);

  // 搜集互動網格
  const interactiveObjects = [rbcMesh, spectrinMesh];
  gasGroup.traverse(obj => {
    if (obj.isMesh && obj.parent && obj.parent.userData.organelleId) {
      interactiveObjects.push(obj);
    }
  });

  return {
    group,
    interactiveObjects,
    defaultCameraPosition: new THREE.Vector3(0, 4.5, 7.5),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    setCutaway(enabled) {
      // RBC 骨架透視切換
      spectrinMesh.visible = enabled;
      rbcMat.wireframe = !enabled && false;
    },
    update(time, delta) {
      // 緩慢律動自轉
      rbcMesh.rotation.y = time * 0.25;
      spectrinMesh.rotation.y = time * 0.25;

      // 氣體分子環繞擴散動畫
      gasMolecules.forEach(gm => {
        const currentAngle = gm.baseAngle + time * gm.speed * 0.5;
        gm.group.position.x = Math.cos(currentAngle) * gm.dist;
        gm.group.position.z = Math.sin(currentAngle) * gm.dist;
        gm.group.position.y = gm.yOffset + Math.sin(time * 2 + gm.baseAngle) * 0.2;
        gm.group.rotation.x += delta * 1.5;
        gm.group.rotation.y += delta * 2.0;
      });
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

import * as THREE from 'three';

/**
 * 模型五：細胞膜流體鑲嵌模型 (Fluid Mosaic Model 3D)
 * 具備雙脂肪酸尾（直鏈飽和 + 折曲不飽和）磷脂雙分子層、穿膜離子通道蛋白、
 * 周邊蛋白、醣鏈天線、膽固醇分子與流體動態波浪
 */
export function createMembraneModel() {
  const group = new THREE.Group();
  group.name = 'membrane';

  // --- 材質庫 ---
  // 親水磷酸頭部（帶電極性亮藍）
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2
  });

  // 疏水脂肪酸尾部（非極性黃金碳氫鏈）
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
    metalness: 0.1
  });

  // 穿膜通道蛋白（多次跨膜 α-螺旋桶）
  const channelProteinMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.4,
    metalness: 0.15
  });

  // 周邊蛋白（球狀吸附蛋白）
  const peripheralMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.35,
    metalness: 0.1
  });

  // 醣鏈天線（寡醣分支球）
  const sugarMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x65a30d,
    emissiveIntensity: 0.2
  });

  // 膽固醇（剛性多環固醇分子）
  const cholesterolMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.35,
    metalness: 0.4
  });

  // 幾何形狀共用快取
  const headGeo = new THREE.SphereGeometry(0.32, 14, 10);
  const tailGeoStraight = new THREE.CylinderGeometry(0.045, 0.045, 1.2, 8);
  const tailGeoKink1 = new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8);
  const tailGeoKink2 = new THREE.CylinderGeometry(0.045, 0.045, 0.65, 8);

  // 建立單一磷脂分子（含 1 個親水頭與 2 條疏水尾）
  function createPhospholipidUnit(isUpper) {
    const unit = new THREE.Group();
    unit.userData = { organelleId: 'phospholipid', name: '磷脂分子 (Phospholipid)' };

    // 親水頭部
    const head = new THREE.Mesh(headGeo, headMat);
    unit.add(head);

    // 尾部方向：上層朝 -y，下層朝 +y
    const dir = isUpper ? -1 : 1;

    // 尾巴 1：飽和脂肪酸直鏈
    const t1 = new THREE.Mesh(tailGeoStraight, tailMat);
    t1.position.set(-0.1, dir * 0.85, 0);
    unit.add(t1);

    // 尾巴 2：不飽和脂肪酸折曲鏈（含順式雙鍵 cis-double bond）
    const t2Upper = new THREE.Mesh(tailGeoKink1, tailMat);
    t2Upper.position.set(0.1, dir * 0.55, 0);
    unit.add(t2Upper);

    const t2Lower = new THREE.Mesh(tailGeoKink2, tailMat);
    t2Lower.position.set(0.24, dir * 1.1, 0.08);
    t2Lower.rotation.z = dir * 0.45; // 順式折曲
    unit.add(t2Lower);

    return unit;
  }

  // --- 磷脂雙分子層陣列網格 (12 x 12 上下兩層) ---
  const bilayerGroup = new THREE.Group();
  const gridSize = 12;
  const spacing = 0.72;
  const upperY = 1.2;
  const lowerY = -1.2;

  const dynamicLipids = []; // 用於在 update() 中波動

  // 穿膜蛋白所佔據的中央空隙區域 (避免磷脂碰撞)
  function isInProteinCavity(gx, gz) {
    const distToCenter = Math.hypot(gx, gz);
    return distToCenter < 1.6;
  }

  for (let ix = -gridSize / 2; ix < gridSize / 2; ix++) {
    for (let iz = -gridSize / 2; iz < gridSize / 2; iz++) {
      const x = ix * spacing;
      const z = iz * spacing;

      if (isInProteinCavity(x, z)) continue;

      // 上層單分子層 (Upper Monolayer)
      const lipidUp = createPhospholipidUnit(true);
      lipidUp.position.set(x, upperY, z);
      bilayerGroup.add(lipidUp);

      // 下層單分子層 (Lower Monolayer)
      const lipidDown = createPhospholipidUnit(false);
      lipidDown.position.set(x, lowerY, z);
      bilayerGroup.add(lipidDown);

      dynamicLipids.push({
        up: lipidUp,
        down: lipidDown,
        baseX: x,
        baseZ: z,
        phase: x * 0.8 + z * 0.6
      });
    }
  }
  group.add(bilayerGroup);

  // --- 1. 穿膜蛋白 / 離子通道 (Transmembrane Protein Channel) ---
  const channelGroup = new THREE.Group();
  channelGroup.userData = { organelleId: 'transmembraneProtein', name: '穿膜離子通道蛋白 (Channel Protein)' };

  // 以 8 條 α-螺旋圓柱圍成中空通道
  const helixCount = 8;
  const helixRadius = 0.95;
  const helixGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 12);

  for (let i = 0; i < helixCount; i++) {
    const angle = (i / helixCount) * Math.PI * 2;
    const helix = new THREE.Mesh(helixGeo, channelProteinMat);
    helix.position.set(Math.cos(angle) * helixRadius, 0, Math.sin(angle) * helixRadius);
    helix.rotation.y = angle;
    helix.rotation.x = Math.sin(angle * 2) * 0.12; // 稍微向內傾斜聚攏成漏斗
    helix.userData = { organelleId: 'transmembraneProtein', name: 'α-螺旋次單元 (Alpha-Helix)' };
    channelGroup.add(helix);
  }

  // 通道內徑離子流向粒子示意
  const ionMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.6
  });
  const ionGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const ionParticles = [];
  for (let i = 0; i < 4; i++) {
    const ion = new THREE.Mesh(ionGeo, ionMat);
    ion.position.set(0, -1.2 + i * 0.8, 0);
    ion.userData = { organelleId: 'transmembraneProtein', name: '通過中之水合離子 (Hydrated Ion)' };
    channelGroup.add(ion);
    ionParticles.push(ion);
  }

  group.add(channelGroup);

  // --- 2. 醣蛋白之寡醣鏈天線 (Glycocalyx Sugar Tree) ---
  const glycocGroup = new THREE.Group();
  glycocGroup.position.set(0, 1.6, 0);
  glycocGroup.userData = { organelleId: 'glycoprotein', name: '醣蛋白與寡醣天線 (Glycocalyx)' };

  const sugarGeo = new THREE.SphereGeometry(0.12, 10, 8);
  const sugarBranches = [
    { p: [0.3, 0.3, 0.2] },
    { p: [0.5, 0.6, 0.3] },
    { p: [0.7, 0.9, 0.2] },
    { p: [0.4, 0.9, 0.5] },
    { p: [-0.3, 0.3, -0.2] },
    { p: [-0.5, 0.65, -0.35] },
    { p: [-0.4, 1.0, -0.2] },
    { p: [-0.7, 0.9, -0.5] }
  ];

  sugarBranches.forEach(b => {
    const sugarNode = new THREE.Mesh(sugarGeo, sugarMat);
    sugarNode.position.set(b.p[0], b.p[1], b.p[2]);
    sugarNode.userData = { organelleId: 'glycoprotein', name: '寡醣鏈單元 (Oligosaccharide)' };
    glycocGroup.add(sugarNode);
  });

  // 連接骨架線
  const lineMat = new THREE.LineBasicMaterial({ color: 0x84cc16, linewidth: 2 });
  const linePoints1 = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.3, 0.3, 0.2),
    new THREE.Vector3(0.5, 0.6, 0.3),
    new THREE.Vector3(0.7, 0.9, 0.2)
  ];
  glycocGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints1), lineMat));

  const linePoints2 = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.3, 0.3, -0.2),
    new THREE.Vector3(-0.5, 0.65, -0.35),
    new THREE.Vector3(-0.7, 0.9, -0.5)
  ];
  glycocGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints2), lineMat));

  group.add(glycocGroup);

  // --- 3. 周邊膜蛋白 (Peripheral Proteins) ---
  const peripheralGroup = new THREE.Group();
  peripheralGroup.userData = { organelleId: 'peripheralProtein', name: '周邊膜蛋白 (Peripheral Protein)' };

  // 外側周邊蛋白
  const periOuterGeo = new THREE.DodecahedronGeometry(0.75, 1);
  const periOuter = new THREE.Mesh(periOuterGeo, peripheralMat);
  periOuter.position.set(2.4, 1.6, -1.8);
  periOuter.userData = { organelleId: 'peripheralProtein', name: '細胞外側周邊蛋白 (Extracellular Peripheral)' };
  peripheralGroup.add(periOuter);

  // 內側周邊蛋白（連結細胞骨架）
  const periInnerGeo = new THREE.DodecahedronGeometry(0.85, 1);
  const periInner = new THREE.Mesh(periInnerGeo, peripheralMat);
  periInner.position.set(-2.5, -1.8, 1.8);
  periInner.userData = { organelleId: 'peripheralProtein', name: '細胞質側周邊蛋白 (Intracellular Peripheral)' };
  peripheralGroup.add(periInner);

  group.add(peripheralGroup);

  // --- 4. 膽固醇分子 (Cholesterol Molecules) ---
  const cholesterolGroup = new THREE.Group();
  cholesterolGroup.userData = { organelleId: 'cholesterol', name: '膽固醇分子 (Cholesterol)' };

  // 剛性多環固醇結構：4 個緊密接合的扁平多面體
  const cholesPositions = [
    { x: -1.8, y: 0.4, z: -0.8 },
    { x: 1.6, y: 0.5, z: 1.2 },
    { x: -1.2, y: -0.4, z: 1.8 },
    { x: 2.2, y: -0.5, z: -0.6 },
    { x: 0.8, y: 0.3, z: -2.2 }
  ];

  cholesPositions.forEach(cp => {
    const mol = new THREE.Group();
    for (let r = 0; r < 4; r++) {
      const ringGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6);
      const ring = new THREE.Mesh(ringGeo, cholesterolMat);
      ring.position.set(r * 0.15, 0, 0);
      ring.rotation.x = Math.PI / 2;
      mol.add(ring);
    }
    mol.position.set(cp.x, cp.y, cp.z);
    mol.rotation.set(0.2, 0.4, 0.8);
    mol.userData = { organelleId: 'cholesterol', name: '膽固醇分子 (Cholesterol)' };
    cholesterolGroup.add(mol);
  });
  group.add(cholesterolGroup);

  // 搜集互動網格
  const interactiveObjects = [];
  group.traverse(obj => {
    if (obj.isMesh && (obj.userData?.organelleId || obj.parent?.userData?.organelleId)) {
      interactiveObjects.push(obj);
    }
  });

  return {
    group,
    interactiveObjects,
    defaultCameraPosition: new THREE.Vector3(0, 5.5, 9.0),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    setCutaway(enabled) {
      // 細胞膜下層或周邊蛋白顯示開關
      peripheralGroup.visible = enabled;
      cholesterolGroup.visible = enabled;
    },
    update(time, delta) {
      // 流體鑲嵌波動：正弦波傳遞展現膜的動態流動特性
      const waveFreq = 2.0;
      const waveAmp = 0.08;

      for (let i = 0; i < dynamicLipids.length; i++) {
        const item = dynamicLipids[i];
        const offset = Math.sin(time * waveFreq + item.phase) * waveAmp;
        item.up.position.y = upperY + offset;
        item.down.position.y = lowerY + offset;
      }

      // 穿膜通道離子動態漂移穿梭
      ionParticles.forEach((ion, idx) => {
        ion.position.y -= delta * 1.2;
        if (ion.position.y < -1.6) {
          ion.position.y = 1.6;
        }
      });

      // 醣鏈微風飄動感
      glycocGroup.rotation.z = Math.sin(time * 1.5) * 0.05;
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

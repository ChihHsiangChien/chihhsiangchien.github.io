/**
 * 葉片橫切面 3D 模型生成器 (leaf_model.js)
 * 精準建構：上角質層、上表皮、柵狀組織、海綿組織、維管束（木質部/韌皮部/束鞘）、
 * 下表皮、保衛細胞成對氣孔、葉綠體群、以及氣體與水流粒子系統。
 */

class LeafModel {
  constructor(scene) {
    this.scene = scene;
    
    // 主容器
    this.root = new THREE.Group();
    this.root.name = 'LeafRoot';
    this.scene.add(this.root);

    // 組織層次分組 (用於爆炸圖與獨立控制)
    this.groups = {
      cuticle_upper: new THREE.Group(),
      epidermis_upper: new THREE.Group(),
      mesophyll_palisade: new THREE.Group(),
      mesophyll_spongy: new THREE.Group(),
      bundle_sheath: new THREE.Group(),
      xylem: new THREE.Group(),
      phloem: new THREE.Group(),
      epidermis_lower: new THREE.Group(),
      guard_cells: new THREE.Group(),
      cuticle_lower: new THREE.Group(),
      particles: new THREE.Group()
    };

    // 將各分組加入 root
    for (const [key, grp] of Object.entries(this.groups)) {
      grp.name = key;
      this.root.add(grp);
    }

    // 互動點選拾取網格清單
    this.pickableMeshes = [];
    
    // 葉綠體清單 (用於集中高亮與螢光切換)
    this.chloroplastMeshes = [];

    // 保衛細胞動態關聯資料 (用於氣孔開合動畫)
    this.stomaComplexes = [];
    this.stomaAperture = 0.7; // 預設 70% 開啟

    // 粒子系統狀態
    this.gasParticles = null;
    this.veinParticles = null;

    // 材質快取與管理
    this.materials = {};
    this.initMaterials();

    // 建立 3D 解剖模型
    this.buildModel();
    this.initGasParticles();
    this.initVeinFlowParticles();
  }

  /* ==========================================================================
     材質定義 (Materials)
     ========================================================================== */
  initMaterials() {
    // 1. 角質層：薄透高光蠟質保護層 (使用 Standard Material 消除 Physical Transmission 負載)
    this.materials.cuticleUpper = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      metalness: 0.08,
      roughness: 0.12,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.materials.cuticleLower = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      metalness: 0.08,
      roughness: 0.15,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // 2. 表皮細胞壁/細胞實體：清晰扎實的淺天青藍色
    this.materials.epidermis = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.09
    });

    // 3. 柵狀組織細胞壁 (半透 Standard Material，徹底避免 Physical transmission 渲染過程)
    this.materials.palisadeWall = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.60,
      side: THREE.DoubleSide
    });

    // 4. 海綿組織細胞壁 (通氣疏鬆質地)
    this.materials.spongyWall = new THREE.MeshStandardMaterial({
      color: 0xa3e635,
      roughness: 0.40,
      metalness: 0.05,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });

    // 5. 葉綠體：翠綠色雙凸透鏡狀、內部帶細緻螢光自體光
    this.materials.chloroplast = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      emissive: 0x22c55e,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.1
    });

    // 6. 保衛細胞：飽滿鮮明翡翠綠
    this.materials.guardCell = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x065f46,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });

    // 7. 木質部導管：厚壁木質化、偏藍青/琥珀光澤管道
    this.materials.xylem = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.32,
      metalness: 0.15,
      emissive: 0x0369a1,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide
    });

    this.materials.xylemRings = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22
    });

    // 8. 韌皮部篩管與伴細胞：柔和粉紫/洋紅有機營養管道
    this.materials.phloem = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0xbe123c,
      emissiveIntensity: 0.12
    });

    // 9. 維管束鞘：淡紫色單層排列細胞
    this.materials.bundleSheath = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.65
    });
  }

  /* ==========================================================================
     模型建置主流程 Build Model
     ========================================================================== */
  buildModel() {
    const W = 28; // X 總寬
    const D = 18; // Z 總深
    
    // 1. 上角質層 (Upper Cuticle)
    this.buildCuticleUpper(W, D);

    // 2. 上表皮細胞層 (Upper Epidermis)
    this.buildUpperEpidermis(W, D);

    // 3. 柵狀組織 (Palisade Mesophyll) + 密集葉綠體
    this.buildPalisadeMesophyll(W, D);

    // 4. 海綿組織 (Spongy Mesophyll) + 氣室 + 葉綠體
    this.buildSpongyMesophyll(W, D);

    // 5. 維管束 (Vascular Bundle): 木質部 + 韌皮部 + 束鞘
    this.buildVascularBundle(D);

    // 6. 下表皮細胞層 (Lower Epidermis)
    this.buildLowerEpidermis(W, D);

    // 7. 保衛細胞與氣孔器 (Guard Cells & Stomata)
    this.buildGuardCellsAndStomata();

    // 8. 下角質層 (Lower Cuticle)
    this.buildCuticleLower(W, D);
  }

  /* --------------------------------------------------------------------------
     1. 上角質層 (Upper Cuticle) - 緊貼於上表皮頂部之超薄透光高光蠟質膜
     -------------------------------------------------------------------------- */
  buildCuticleUpper(w, d) {
    // 減面優化：分段數由 24x16 調整為 12x8，兼顧流暢度與起伏曲面
    const geom = new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1, 12, 1, 8);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(x * 0.4) * 0.04 + Math.cos(z * 0.5) * 0.03;
      pos.setY(i, pos.getY(i) + wave);
    }
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, this.materials.cuticleUpper);
    mesh.position.set(0, 7.15, 0); // 位於上表皮頂部上方，絕不與細胞穿插
    mesh.renderOrder = 2; // 正確的半透明混合層級
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    this.registerEntity(mesh, 'cuticle_upper');
    this.groups.cuticle_upper.add(mesh);
  }

  /* --------------------------------------------------------------------------
     輔助函式：建立具備自然微波浪側壁與枕狀凸起外壁的真實植物表皮細胞幾何
     -------------------------------------------------------------------------- */
  createOrganicEpidermalCellGeometry(baseW, baseH, baseD, seed = 0, isUpper = true) {
    // 減面優化：細分網格由 8x4x8 減為 4x2x4，面數大幅降低 75% 以上，仍保持圓弧枕面與波浪邊緣
    const geom = new THREE.BoxGeometry(baseW, baseH, baseD, 4, 2, 4);
    const pos = geom.attributes.position;
    const halfW = baseW * 0.5;
    const halfH = baseH * 0.5;
    const halfD = baseD * 0.5;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const nx = x / halfW; // -1 to 1
      const ny = y / halfH; // -1 to 1
      const nz = z / halfD; // -1 to 1

      // 1. 枕狀凸面外壁 (Pillowed / Domed outer cuticle-facing surface)
      const domeFactor = Math.max(0, 1.0 - (nx * nx * 0.7 + nz * nz * 0.7));
      if (isUpper && ny > 0.3) {
        y += domeFactor * baseH * 0.28;
      } else if (!isUpper && ny < -0.3) {
        y -= domeFactor * baseH * 0.25;
      }

      // 2. 拼圖狀互鎖波浪側壁 (Pavement cell anticlinal wavy walls)
      const edgeWeight = Math.pow(Math.max(Math.abs(nx), Math.abs(nz)), 2.0);
      const waveX = (Math.sin(z * 1.8 + seed * 3.1) * 0.16 + Math.cos(y * 2.2 + seed * 1.7) * 0.08) * edgeWeight;
      const waveZ = (Math.cos(x * 1.8 + seed * 2.3) * 0.16 + Math.sin(y * 2.2 + seed * 4.1) * 0.08) * edgeWeight;

      x += waveX;
      z += waveZ;

      // 3. 圓角柔化
      const cornerDist = Math.sqrt(nx * nx + nz * nz);
      if (cornerDist > 1.05) {
        x *= 0.94;
        z *= 0.94;
      }

      pos.setXYZ(i, x, y, z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  /* --------------------------------------------------------------------------
     2. 上表皮細胞層 (Upper Epidermis) - 有機拼圖狀晶瑩細胞
     -------------------------------------------------------------------------- */
  buildUpperEpidermis(w, d) {
    // 數量優化：由 12x8=96 顆細胞調整為 8x5=40 顆細胞，節省近 60% 細胞網格與繪製呼叫 (Draw Calls)
    const cols = 8;
    const rows = 5;
    const cellW = (w - 0.5) / cols;
    const cellD = (d - 0.5) / rows;
    const cellH = 1.4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 自然交錯排列 (Staggered offset) + 有機位置微擾
        const staggerX = (r % 2 === 1) ? cellW * 0.32 : -cellW * 0.15;
        const x = -w / 2 + cellW * 0.5 + c * cellW + staggerX + (Math.random() - 0.5) * 0.18;
        const z = -d / 2 + cellD * 0.5 + r * cellD + (Math.random() - 0.5) * 0.18;
        const y = 5.85 + (Math.random() - 0.5) * 0.08;

        const scaleW = cellW * (0.92 + Math.random() * 0.16);
        const scaleD = cellD * (0.90 + Math.random() * 0.16);
        const actualH = cellH * (0.92 + Math.random() * 0.15);
        const seed = (r * 13 + c * 7 + Math.random() * 5);

        const cellMat = this.materials.epidermis.clone();
        const lightness = ((r + c) % 2 === 0 ? 0.04 : -0.04) + (Math.random() - 0.5) * 0.02;
        cellMat.color.offsetHSL(0, 0, lightness);

        const organicGeom = this.createOrganicEpidermalCellGeometry(scaleW, actualH, scaleD, seed, true);
        const cellMesh = new THREE.Mesh(organicGeom, cellMat);
        cellMesh.position.set(x, y, z);
        cellMesh.rotation.y = (Math.random() - 0.5) * 0.14;
        cellMesh.castShadow = true;
        cellMesh.receiveShadow = true;

        this.registerEntity(cellMesh, 'epidermis_upper');
        this.groups.epidermis_upper.add(cellMesh);
      }
    }
  }

  /* --------------------------------------------------------------------------
     3. 柵狀組織 (Palisade Mesophyll) + 自然散佈葉綠體
     -------------------------------------------------------------------------- */
  buildPalisadeMesophyll(w, d) {
    // 數量優化：細胞由 15x9=135 顆調整為 10x6=60 顆，直徑適度加大以完美填滿葉肉體積
    const cols = 10;
    const rows = 6;
    const stepX = (w - 1.2) / cols;
    const stepZ = (d - 1.2) / rows;
    const basePalH = 4.2;

    // 葉綠體基礎幾何：雙凸透鏡狀 (面數由 10x8 簡化為 7x5)
    const baseChloroGeom = new THREE.SphereGeometry(0.24, 7, 5);
    baseChloroGeom.scale(1.25, 0.52, 1.25);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const staggerZ = (c % 2 === 1) ? stepZ * 0.25 : 0;
        const x = -w / 2 + stepX * 0.5 + c * stepX + (Math.random() - 0.5) * 0.22;
        const z = -d / 2 + stepZ * 0.5 + r * stepZ + staggerZ + (Math.random() - 0.5) * 0.22;

        let cellActualH = basePalH * (0.92 + Math.random() * 0.16);
        let yPos = 3.1;
        if (Math.abs(x) < 3.2) {
          cellActualH = basePalH * 0.8;
          yPos = 3.5;
        }

        // 柱狀細胞：直徑調整為 0.95 (填滿空間)，減面圓柱由 16x6 減為 10x3
        const cellRadius = 0.95 + (Math.random() - 0.5) * 0.12;
        const cellGeom = new THREE.CylinderGeometry(cellRadius * 0.95, cellRadius * 0.95, cellActualH, 10, 3);
        const pos = cellGeom.attributes.position;
        const seed = r * 11 + c * 17;

        for (let i = 0; i < pos.count; i++) {
          const cy = pos.getY(i);
          const normY = cy / (cellActualH * 0.5);
          const waistFactor = 1.0 + (1.0 - normY * normY) * 0.12 - (Math.abs(normY) > 0.7 ? (Math.abs(normY) - 0.7) * 0.35 : 0);
          const organicWobble = 1.0 + Math.sin(cy * 2.0 + seed) * 0.04;
          pos.setX(i, pos.getX(i) * waistFactor * organicWobble);
          pos.setZ(i, pos.getZ(i) * waistFactor * organicWobble);
        }
        cellGeom.computeVertexNormals();

        const cellMesh = new THREE.Mesh(cellGeom, this.materials.palisadeWall);
        cellMesh.position.set(x, yPos, z);
        cellMesh.rotation.z = (Math.random() - 0.5) * 0.07;
        cellMesh.rotation.x = (Math.random() - 0.5) * 0.07;
        cellMesh.castShadow = true;
        cellMesh.receiveShadow = true;

        this.registerEntity(cellMesh, 'mesophyll_palisade');
        this.groups.mesophyll_palisade.add(cellMesh);

        // ★★★ 葉綠體數量優化：由每細胞 16~21 顆精簡為 7~9 顆 (總數由 2500+ 驟降至約 480 顆，降幅達 80%！)
        // 同時共用材質 (不 clone)，且關閉內部小球體的 castShadow，大幅釋放 GPU 陰影 Pass
        const chloroCount = 7 + Math.floor(Math.random() * 3);
        
        for (let k = 0; k < chloroCount; k++) {
          const chloroMesh = new THREE.Mesh(baseChloroGeom, this.materials.chloroplast);

          let chX, chY, chZ;
          let tiltX, tiltY, tiltZ;
          const sizeScale = 0.95 + Math.random() * 0.30;

          if (k < 2) {
            // 頂部迎光區
            const domeAngle = Math.random() * Math.PI * 2;
            const domeR = Math.random() * (cellRadius * 0.65);
            chX = Math.cos(domeAngle) * domeR;
            chZ = Math.sin(domeAngle) * domeR;
            chY = (cellActualH * 0.5) * (0.75 + Math.random() * 0.18);
            tiltX = (Math.random() - 0.5) * 0.35;
            tiltY = Math.random() * Math.PI * 2;
            tiltZ = (Math.random() - 0.5) * 0.35;
          } else if (k === chloroCount - 1) {
            // 底部區
            const btmAngle = Math.random() * Math.PI * 2;
            const btmR = (cellRadius * 0.5) + Math.random() * (cellRadius * 0.28);
            chX = Math.cos(btmAngle) * btmR;
            chZ = Math.sin(btmAngle) * btmR;
            chY = (-cellActualH * 0.5) * (0.75 + Math.random() * 0.18);
            tiltX = (Math.random() - 0.5) * 0.5;
            tiltY = btmAngle;
            tiltZ = (Math.random() - 0.5) * 0.5;
          } else {
            // 側壁貼壁胞質區
            const segmentT = ((k - 2) / Math.max(1, chloroCount - 3)) + (Math.random() - 0.5) * 0.2;
            const clampedT = Math.max(0.12, Math.min(0.88, segmentT));
            chY = (-cellActualH * 0.45) + clampedT * (cellActualH * 0.9);

            const azimuth = Math.random() * Math.PI * 2;
            const rDepth = cellRadius * (0.72 + Math.random() * 0.18);
            chX = Math.cos(azimuth) * rDepth;
            chZ = Math.sin(azimuth) * rDepth;

            tiltY = azimuth + Math.PI / 2 + (Math.random() - 0.5) * 0.4;
            tiltX = (Math.random() - 0.5) * 0.6;
            tiltZ = Math.PI * 0.45 + (Math.random() - 0.5) * 0.5;
          }

          chloroMesh.position.set(chX, chY, chZ);
          chloroMesh.rotation.set(tiltX, tiltY, tiltZ);
          chloroMesh.scale.set(sizeScale, sizeScale, sizeScale);
          chloroMesh.castShadow = false; // 內部微小葉綠體不投射陰影，消除陰影 Pass 負擔

          cellMesh.add(chloroMesh);
          this.chloroplastMeshes.push(chloroMesh);
          // 射線運算優化：僅抽樣代表性葉綠體加入拾取檢測清單，節省大量 CPU 射線求交運算
          if (k === 0 && (r + c) % 2 === 0) {
            this.registerEntity(chloroMesh, 'chloroplasts');
          }
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     4. 海綿組織 (Spongy Mesophyll) + 氣室 + 葉綠體
     -------------------------------------------------------------------------- */
  buildSpongyMesophyll(w, d) {
    // 葉綠體幾何減面：7x5
    const chloroGeom = new THREE.SphereGeometry(0.24, 7, 5);
    chloroGeom.scale(1.2, 0.6, 1.2);

    // 減面幾何體：detail 改為 0，Sphere 簡化為 7x5
    const cellGeomTypes = [
      new THREE.DodecahedronGeometry(1.15, 0),
      new THREE.IcosahedronGeometry(1.20, 0),
      new THREE.SphereGeometry(1.10, 7, 5)
    ];

    // 細胞數量優化：由 95 顆調整為 42 顆 (降幅 56%)，尺寸略為放闊，保留自然疏鬆氣室與氣孔下腔
    const count = 42;
    for (let i = 0; i < count; i++) {
      const y = -3.8 + Math.random() * 4.2;
      const x = (Math.random() - 0.5) * (w - 2.5);
      const z = (Math.random() - 0.5) * (d - 2.5);

      if (Math.abs(x) < 3.8 && y > -2.2 && y < 2.0) continue;
      if (Math.abs(x - (-6.0)) < 1.8 && Math.abs(z - 0) < 1.8 && y < -2.6) continue;
      if (Math.abs(x - (6.0)) < 1.8 && Math.abs(z - 2.5) < 1.8 && y < -2.6) continue;

      const geom = cellGeomTypes[i % cellGeomTypes.length];
      const cellMesh = new THREE.Mesh(geom, this.materials.spongyWall);
      cellMesh.position.set(x, y, z);
      
      const sx = 0.95 + Math.random() * 0.45;
      const sy = 0.85 + Math.random() * 0.35;
      const sz = 0.95 + Math.random() * 0.45;
      cellMesh.scale.set(sx, sy, sz);
      cellMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      cellMesh.castShadow = true;
      cellMesh.receiveShadow = true;

      this.registerEntity(cellMesh, 'mesophyll_spongy');
      this.groups.mesophyll_spongy.add(cellMesh);

      // 海綿組織葉綠體優化：每顆細胞由 7~9 顆精簡為 3~4 顆，共用材質
      const chCount = 3 + Math.floor(Math.random() * 2);
      for (let k = 0; k < chCount; k++) {
        const chloroMesh = new THREE.Mesh(chloroGeom, this.materials.chloroplast);
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 0.72;
        const chX = r * Math.sin(phi) * Math.cos(theta);
        const chY = r * Math.sin(phi) * Math.sin(theta);
        const chZ = r * Math.cos(phi);

        chloroMesh.position.set(chX, chY, chZ);
        chloroMesh.rotation.set(Math.random(), Math.random(), Math.random());
        chloroMesh.castShadow = false;
        cellMesh.add(chloroMesh);

        this.chloroplastMeshes.push(chloroMesh);
        if (k === 0 && i % 3 === 0) {
          this.registerEntity(chloroMesh, 'chloroplasts');
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     5. 維管束 (Vascular Bundle): 木質部 + 韌皮部 + 束鞘
     -------------------------------------------------------------------------- */
  buildVascularBundle(depth) {
    const tubeLength = depth;

    // 5A. 束鞘細胞：由 18x9=162 顆優化為 12x5=60 顆，球體幾何由 10x8 簡化為 7x5
    const sheathCellCount = 12;
    const sheathRadiusX = 3.6;
    const sheathRadiusY = 3.0;
    const sheathZSegments = 5;
    const sheathCellGeom = new THREE.SphereGeometry(0.85, 7, 5);
    sheathCellGeom.scale(1.15, 0.95, 1.3);

    for (let sz = 0; sz < sheathZSegments; sz++) {
      const z = -depth / 2 + 1.4 + (sz / Math.max(1, sheathZSegments - 1)) * (depth - 2.8);
      for (let i = 0; i < sheathCellCount; i++) {
        const angle = (i / sheathCellCount) * Math.PI * 2;
        const x = Math.cos(angle) * sheathRadiusX;
        const y = Math.sin(angle) * sheathRadiusY + 0.4;

        const sheathMesh = new THREE.Mesh(sheathCellGeom, this.materials.bundleSheath);
        sheathMesh.position.set(x, y, z);
        sheathMesh.rotation.z = angle + Math.PI / 2;
        sheathMesh.castShadow = true;

        this.registerEntity(sheathMesh, 'bundle_sheath');
        this.groups.bundle_sheath.add(sheathMesh);
      }
    }

    // 5B. 木質部 (Xylem)
    const xylemConfigs = [
      { x: -1.25, y: 1.15, outerR: 0.72, innerR: 0.58 },
      { x: 1.25,  y: 1.15, outerR: 0.72, innerR: 0.58 },
      { x: 0.0,   y: 0.95, outerR: 0.54, innerR: 0.42 },
      { x: 0.0,   y: 2.05, outerR: 0.50, innerR: 0.38 },
      { x: -1.45, y: -0.25, outerR: 0.45, innerR: 0.34 },
      { x: 1.45,  y: -0.25, outerR: 0.45, innerR: 0.34 },
      { x: 0.0,   y: -0.15, outerR: 0.42, innerR: 0.32 }
    ];

    for (const conf of xylemConfigs) {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, conf.outerR, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, conf.innerR, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      // 減面優化：curveSegments 由 36 減為 16
      const tubeGeom = new THREE.ExtrudeGeometry(shape, {
        depth: tubeLength,
        bevelEnabled: false,
        curveSegments: 16
      });
      tubeGeom.translate(0, 0, -tubeLength / 2);

      const xylemMesh = new THREE.Mesh(tubeGeom, this.materials.xylem);
      xylemMesh.position.set(conf.x, conf.y, 0);
      xylemMesh.castShadow = true;
      xylemMesh.receiveShadow = true;

      // 減面環紋幾何：Torus 8x24 減為 5x12，間距放寬
      const ringGeom = new THREE.TorusGeometry(conf.outerR * 1.008, 0.035, 5, 12);
      for (let rz = -depth / 2 + 1.8; rz < depth / 2; rz += 3.2) {
        const ring = new THREE.Mesh(ringGeom, this.materials.xylemRings);
        ring.position.set(0, 0, rz);
        xylemMesh.add(ring);
      }

      this.registerEntity(xylemMesh, 'xylem');
      this.groups.xylem.add(xylemMesh);
    }

    // 5C. 韌皮部 (Phloem)：由 4x6=24 根篩管優化為 3x4=12 根，Cylinder 分段由 12 減為 8
    const phloemConfigs = [];
    const phloemRows = 3;
    const phloemCols = 4;
    for (let pr = 0; pr < phloemRows; pr++) {
      for (let pc = 0; pc < phloemCols; pc++) {
        const px = -1.8 + (pc / Math.max(1, phloemCols - 1)) * 3.6 + (pr % 2 ? 0.2 : -0.2);
        const py = -1.6 + (pr / Math.max(1, phloemRows - 1)) * 1.3;
        if (px * px / 5.5 + py * py / 2.8 > 1.2) continue;
        phloemConfigs.push({ x: px, y: py, r: 0.35 + Math.random() * 0.1 });
      }
    }

    for (const conf of phloemConfigs) {
      const cylGeom = new THREE.CylinderGeometry(conf.r, conf.r, tubeLength, 8, 1);
      cylGeom.rotateX(Math.PI / 2);

      const phloemMesh = new THREE.Mesh(cylGeom, this.materials.phloem);
      phloemMesh.position.set(conf.x, conf.y, 0);
      phloemMesh.castShadow = true;

      this.registerEntity(phloemMesh, 'phloem');
      this.groups.phloem.add(phloemMesh);
    }
  }

  /* --------------------------------------------------------------------------
     6. 下表皮細胞層 (Lower Epidermis)
     -------------------------------------------------------------------------- */
  buildLowerEpidermis(w, d) {
    // 數量優化：由 12x8=96 顆調整為 8x5=40 顆細胞
    const cols = 8;
    const rows = 5;
    const cellW = (w - 0.5) / cols;
    const cellD = (d - 0.5) / rows;
    const cellH = 1.25;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const staggerX = (r % 2 === 1) ? cellW * 0.28 : -cellW * 0.12;
        const x = -w / 2 + cellW * 0.5 + c * cellW + staggerX + (Math.random() - 0.5) * 0.16;
        const z = -d / 2 + cellD * 0.5 + r * cellD + (Math.random() - 0.5) * 0.16;
        const y = -5.4 + (Math.random() - 0.5) * 0.06;

        // 保留氣孔開口位置
        if (Math.abs(x - (-6.0)) < 1.75 && Math.abs(z - 0) < 1.75) continue;
        if (Math.abs(x - (6.0)) < 1.75 && Math.abs(z - 2.5) < 1.75) continue;

        const scaleW = cellW * (0.92 + Math.random() * 0.15);
        const scaleD = cellD * (0.90 + Math.random() * 0.15);
        const actualH = cellH * (0.92 + Math.random() * 0.14);
        const seed = (r * 19 + c * 11 + Math.random() * 7);

        const cellMat = this.materials.epidermis.clone();
        const lightness = ((r + c) % 2 === 0 ? 0.04 : -0.04) + (Math.random() - 0.5) * 0.02;
        cellMat.color.offsetHSL(0, 0, lightness);

        const organicGeom = this.createOrganicEpidermalCellGeometry(scaleW, actualH, scaleD, seed, false);
        const cellMesh = new THREE.Mesh(organicGeom, cellMat);
        cellMesh.position.set(x, y, z);
        cellMesh.rotation.y = (Math.random() - 0.5) * 0.12;
        cellMesh.castShadow = true;
        cellMesh.receiveShadow = true;

        this.registerEntity(cellMesh, 'epidermis_lower');
        this.groups.epidermis_lower.add(cellMesh);
      }
    }
  }

  /* --------------------------------------------------------------------------
     7. 保衛細胞與氣孔器 (Guard Cells & Stomata)
     -------------------------------------------------------------------------- */
  buildGuardCellsAndStomata() {
    const stomaPositions = [
      { x: -6.0, y: -5.4, z: 0.0, rotationY: 0 },
      { x: 6.0, y: -5.4, z: 2.5, rotationY: Math.PI * 0.15 }
    ];

    // 葉綠體幾何減面：7x5
    const chloroGeom = new THREE.SphereGeometry(0.18, 7, 5);
    chloroGeom.scale(1.2, 0.5, 1.2);

    for (const pos of stomaPositions) {
      const complexGroup = new THREE.Group();
      complexGroup.position.set(pos.x, pos.y, pos.z);
      complexGroup.rotation.y = pos.rotationY;

      const guardCellLeft = this.createGuardCellMesh(-1);
      const guardCellRight = this.createGuardCellMesh(1);

      complexGroup.add(guardCellLeft);
      complexGroup.add(guardCellRight);

      // 保衛細胞內葉綠體：由 5 顆調整為 3 顆，共用材質且關閉 castShadow
      const attachChloroplastsToGuardCell = (cellMesh, sideSign) => {
        const count = 3;
        for (let i = 0; i < count; i++) {
          const ch = new THREE.Mesh(chloroGeom, this.materials.chloroplast);
          const t = (i / Math.max(1, count - 1)) * 2.0 - 1.0;
          ch.position.set(
            sideSign * (0.8 + Math.cos(t * Math.PI * 0.5) * 0.25),
            0,
            t * 1.1
          );
          ch.castShadow = false;
          cellMesh.add(ch);
          this.chloroplastMeshes.push(ch);
          if (i === 1) {
            this.registerEntity(ch, 'chloroplasts');
          }
        }
      };

      attachChloroplastsToGuardCell(guardCellLeft, -1);
      attachChloroplastsToGuardCell(guardCellRight, 1);

      this.registerEntity(guardCellLeft, 'guard_cells');
      this.registerEntity(guardCellRight, 'guard_cells');

      this.groups.guard_cells.add(complexGroup);

      this.stomaComplexes.push({
        group: complexGroup,
        leftCell: guardCellLeft,
        rightCell: guardCellRight,
        initialPos: pos
      });
    }

    this.updateStomaAperture(this.stomaAperture);
  }

  /* 輔助建立單個腎形彎曲保衛細胞 */
  createGuardCellMesh(sideSign) {
    const curvePoints = [];
    const segments = 12; // 由 16 減為 12
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1;
      const bend = Math.cos(t * Math.PI * 0.5);
      const x = sideSign * (0.65 + bend * 0.55);
      const z = t * 1.5;
      const y = 0;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    // 減面優化：管狀分段由 24x16 減為 14x10
    const tubeGeom = new THREE.TubeGeometry(curve, 14, 0.54, 10, false);
    
    const pos = tubeGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      if (Math.sign(px) === sideSign) {
        pos.setX(i, px * 1.08);
      }
    }
    tubeGeom.computeVertexNormals();

    const mesh = new THREE.Mesh(tubeGeom, this.materials.guardCell);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* --------------------------------------------------------------------------
     8. 下角質層 (Lower Cuticle)
     -------------------------------------------------------------------------- */
  buildCuticleLower(w, d) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();

    const hole1 = new THREE.Path();
    hole1.absellipse(-6.0, 0.0, 1.9, 1.9, 0, Math.PI * 2, true);
    shape.holes.push(hole1);

    const hole2 = new THREE.Path();
    hole2.absellipse(6.0, 2.5, 1.9, 1.9, 0, Math.PI * 2, true);
    shape.holes.push(hole2);

    const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.10,
      bevelEnabled: false,
      curveSegments: 12 // 曲線由預設 12 優化
    });
    extrudeGeom.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(extrudeGeom, this.materials.cuticleLower);
    mesh.position.set(0, -6.52, 0);
    mesh.renderOrder = 2;
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    this.registerEntity(mesh, 'cuticle_lower');
    this.groups.cuticle_lower.add(mesh);
  }

  /* ==========================================================================
     動態機制：氣孔開合控制 (Stoma Aperture Control: 0.0 ~ 1.0)
     ========================================================================== */
  updateStomaAperture(aperture) {
    this.stomaAperture = Math.max(0, Math.min(1, aperture));

    for (const complex of this.stomaComplexes) {
      // 當氣孔開啟 (aperture -> 1):
      // 保衛細胞膨脹、外壁外彎、左右細胞向外推移展開孔隙
      // 當氣孔關閉 (aperture -> 0):
      // 保衛細胞失去膨壓、兩側內壁完全緊閉貼合在一起
      const openOffset = (this.stomaAperture - 0.2) * 0.42; // 位移量
      const curveScale = 0.85 + this.stomaAperture * 0.35; // 彎曲張開比例

      // 左保衛細胞
      complex.leftCell.position.x = -Math.max(0, openOffset);
      complex.leftCell.scale.set(curveScale, 1.0, 1.0);
      complex.leftCell.rotation.y = -this.stomaAperture * 0.12;

      // 右保衛細胞
      complex.rightCell.position.x = Math.max(0, openOffset);
      complex.rightCell.scale.set(curveScale, 1.0, 1.0);
      complex.rightCell.rotation.y = this.stomaAperture * 0.12;
    }

    // 氣體粒子系統強度連動
    if (this.gasParticles) {
      this.gasParticles.material.opacity = 0.15 + this.stomaAperture * 0.75;
    }
  }

  /* ==========================================================================
     動態機制：爆炸分解圖 (Exploded View: 0.0 ~ 1.0)
     ========================================================================== */
  updateExplodedView(factor) {
    const f = Math.max(0, Math.min(1, factor));
    const maxDisplacement = 6.0;

    // 各層在 Y 軸平滑展開，讓內部構造一目了然
    this.groups.cuticle_upper.position.y = f * maxDisplacement * 1.5;
    this.groups.epidermis_upper.position.y = f * maxDisplacement * 1.1;
    this.groups.mesophyll_palisade.position.y = f * maxDisplacement * 0.55;
    
    // 維管束與海綿組織居中
    this.groups.xylem.position.y = f * maxDisplacement * 0.2;
    this.groups.bundle_sheath.position.y = 0;
    this.groups.phloem.position.y = -f * maxDisplacement * 0.2;
    this.groups.mesophyll_spongy.position.y = -f * maxDisplacement * 0.45;

    // 下表皮與氣孔向下展開
    this.groups.epidermis_lower.position.y = -f * maxDisplacement * 0.95;
    this.groups.guard_cells.position.y = -f * maxDisplacement * 0.95;
    this.groups.cuticle_lower.position.y = -f * maxDisplacement * 1.35;
  }

  /* ==========================================================================
     特效：氣體交換粒子流 (Gas Exchange & Transpiration Simulation)
     ========================================================================== */
  initGasParticles() {
    // 數量優化：由 280 調整為 120，大幅降低每幀 CPU Float32Array 遍歷開銷
    const particleCount = 120;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    const colCO2 = new THREE.Color(0xf59e0b); // CO2: 金橙色擴散吸入
    const colH2O = new THREE.Color(0x38bdf8); // H2O/蒸散: 水藍色逸出
    const colO2  = new THREE.Color(0x10b981); // O2: 綠色光合產物釋出

    for (let i = 0; i < particleCount; i++) {
      // 起始於氣孔附近 (X=-6 或 +6)
      const stomaX = (i % 2 === 0) ? -6.0 : 6.0;
      const stomaZ = (i % 2 === 0) ? 0.0 : 2.5;

      const x = stomaX + (Math.random() - 0.5) * 1.8;
      const y = -6.5 + Math.random() * 4.5;
      const z = stomaZ + (Math.random() - 0.5) * 1.8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 分子類型賦色
      const type = i % 3;
      let c = colH2O;
      let vy = 0.03 + Math.random() * 0.03; // 向下蒸散逸出或向上擴散
      if (type === 0) {
        c = colCO2;
        vy = -(0.02 + Math.random() * 0.02); // CO2 由氣孔向上擴散至海綿氣室
      } else if (type === 1) {
        c = colO2;
        vy = (0.025 + Math.random() * 0.025);
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      velocities.push({
        vx: (Math.random() - 0.5) * 0.015,
        vy: vy,
        vz: (Math.random() - 0.5) * 0.015,
        baseX: stomaX,
        baseZ: stomaZ
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.gasParticles = new THREE.Points(geom, mat);
    this.gasVelocities = velocities;
    this.groups.particles.add(this.gasParticles);
  }

  /* 5D. 維管束水分/養分流動粒子 (Vein Transport Flow) */
  initVeinFlowParticles() {
    // 數量優化：由 160 調整為 70，維持動態流動視覺並降低負載
    const count = 70;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    const colWater = new THREE.Color(0x38bdf8); // 木質部水流
    const colSugar = new THREE.Color(0xf43f5e); // 韌皮部有機養分

    for (let i = 0; i < count; i++) {
      const isXylem = i % 2 === 0;
      let x, y;
      if (isXylem) {
        x = (Math.random() - 0.5) * 2.5;
        y = 1.0 + (Math.random() - 0.5) * 1.2;
      } else {
        x = (Math.random() - 0.5) * 2.8;
        y = -1.0 + (Math.random() - 0.5) * 1.0;
      }
      const z = (Math.random() - 0.5) * 16.0;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = isXylem ? colWater : colSugar;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // 沿 Z 軸流動
      velocities.push({
        vz: isXylem ? 0.05 + Math.random() * 0.03 : -(0.04 + Math.random() * 0.03)
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.veinParticles = new THREE.Points(geom, mat);
    this.veinVelocities = velocities;
    this.groups.particles.add(this.veinParticles);
  }

  /* 每幀更新粒子動畫 */
  animateParticles(delta) {
    // 1. 氣體流粒子
    if (this.gasParticles && this.groups.particles.visible) {
      const pos = this.gasParticles.geometry.attributes.position;
      const count = pos.count;
      const flowRate = this.stomaAperture; // 當氣孔開啟時流動快，關閉時停止

      for (let i = 0; i < count; i++) {
        const vel = this.gasVelocities[i];
        let py = pos.getY(i) + vel.vy * flowRate * 1.5;
        let px = pos.getX(i) + vel.vx * flowRate;
        let pz = pos.getZ(i) + vel.vz * flowRate;

        // 循環邊界
        if (py > 0.5 || py < -8.0) {
          py = -5.4 + (Math.random() - 0.5) * 0.5;
          px = vel.baseX + (Math.random() - 0.5) * 1.0;
          pz = vel.baseZ + (Math.random() - 0.5) * 1.0;
        }

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    }

    // 2. 維管束流粒子
    if (this.veinParticles && this.groups.particles.visible) {
      const pos = this.veinParticles.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        let pz = pos.getZ(i) + this.veinVelocities[i].vz;
        if (pz > 8.0) pz = -8.0;
        if (pz < -8.0) pz = 8.0;
        pos.setZ(i, pz);
      }
      pos.needsUpdate = true;
    }
  }

  /* ==========================================================================
     組織註冊與拾取管理
     ========================================================================== */
  registerEntity(mesh, entityKey) {
    mesh.userData = {
      entityKey: entityKey,
      isPickable: true,
      originalMaterial: mesh.material,
      originalOpacity: mesh.material ? mesh.material.opacity : 1.0
    };
    this.pickableMeshes.push(mesh);
  }

  /* 設定特定組織可見度 (Show / Hide) */
  setEntityVisible(entityKey, isVisible) {
    if (entityKey === 'chloroplasts') {
      for (const ch of this.chloroplastMeshes) {
        ch.visible = isVisible;
      }
      return;
    }

    if (this.groups[entityKey]) {
      this.groups[entityKey].visible = isVisible;
    }
  }

  /* 高亮聚焦特定組織 (Highlight / Isolate) */
  highlightEntity(entityKey) {
    if (!entityKey || entityKey === 'all') {
      this.resetHighlight();
      return;
    }

    const isChloroFocus = (entityKey === 'chloroplasts');

    for (const mesh of this.pickableMeshes) {
      const match = (mesh.userData.entityKey === entityKey);
      if (match) {
        mesh.visible = true;
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = Math.min(1.0, (mesh.userData.originalOpacity || mesh.material.opacity) + 0.3);
        }
      } else {
        if (mesh.material && mesh.material.opacity !== undefined) {
          if (!mesh.userData.originalOpacity) {
            mesh.userData.originalOpacity = mesh.material.opacity;
          }
          mesh.material.opacity = isChloroFocus ? 0.08 : 0.12;
          mesh.material.transparent = true;
        }
      }
    }

    // 葉綠體統一高效連動
    if (isChloroFocus) {
      this.materials.chloroplast.emissiveIntensity = 0.8;
      for (const ch of this.chloroplastMeshes) ch.visible = true;
    } else {
      this.materials.chloroplast.emissiveIntensity = 0.15;
    }
  }

  /* 重置所有高亮 */
  resetHighlight() {
    this.materials.chloroplast.emissiveIntensity = 0.35;
    for (const ch of this.chloroplastMeshes) ch.visible = true;
    for (const mesh of this.pickableMeshes) {
      mesh.visible = true;
      if (mesh.userData.originalOpacity !== undefined && mesh.material) {
        mesh.material.opacity = mesh.userData.originalOpacity;
      }
    }
  }

  /* 半透視模式 (X-Ray Mode) */
  setXRayMode(enable) {
    const opacityFactor = enable ? 0.35 : 1.0;
    for (const key of ['epidermis_upper', 'mesophyll_palisade', 'mesophyll_spongy', 'bundle_sheath', 'epidermis_lower']) {
      if (this.groups[key]) {
        this.groups[key].traverse((child) => {
          if (child.isMesh && child.userData.entityKey !== 'chloroplasts') {
            child.material.transparent = true;
            child.material.opacity = (child.userData.originalOpacity || 0.65) * opacityFactor;
          }
        });
      }
    }
  }

  /* 葉綠體自體螢光開關 (Chloroplast Glow) */
  setChloroplastGlow(enable) {
    const intensity = enable ? 0.65 : 0.05;
    this.materials.chloroplast.emissiveIntensity = intensity;
    for (const ch of this.chloroplastMeshes) {
      if (ch.material && ch.material.emissiveIntensity !== undefined) {
        ch.material.emissiveIntensity = intensity;
      }
    }
  }
}

window.LeafModel = LeafModel;

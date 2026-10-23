// Classic UMD script compatible with direct file:// protocol (no CORS or Node.js required)
const OrbitControls = THREE.OrbitControls;

// ============================================================================
// 1. SCIENTIFIC ORGANELLE DATABASE (ANIMAL & PLANT CELLS + SUBSTRUCTURES)
// ============================================================================
const ORGANELLE_DB = {
  cellWall: {
    id: 'cellWall',
    zh: '細胞壁',
    en: 'Cell Wall',
    color: '#22c55e',
    presence: 'plant',
    badge: '植物細胞特有 · 外層支撐',
    distribution: '植物細胞、真菌、多數原核生物（動物細胞無）',
    membrane: '非膜構造（全透性纖維素網架）',
    func: '維持植物細胞固定多邊形形狀、提供機械支撐並防止過度吸水脹破',
    desc: '位於植物細胞膜外圍的堅韌外殼，主要由纖維素（Cellulose）、半纖維素與果膠交織組成。具全透性，可讓水與溶質自由通過，牆上具有原生質絲孔道與相鄰細胞連通。',
    cuttable: true,
    substructures: [
      { id: 'primaryWall', zh: '初生與次生細胞壁', desc: '由多層纖維素微纖絲交錯排列而成，賦予植物抗壓與抗拉強度。' },
      { id: 'plasmodesmata', zh: '原生質絲 (Plasmodesmata)', desc: '貫穿細胞壁的微小孔道，讓相鄰植物細胞的細胞質、水分與養分得以直接溝通。' }
    ]
  },
  cellMembrane: {
    id: 'cellMembrane',
    zh: '細胞膜',
    en: 'Cell Membrane (Plasma Membrane)',
    color: '#f472b6',
    presence: 'both',
    badge: '選擇性通透障壁',
    distribution: '動物細胞最外層、植物細胞緊貼細胞壁內側',
    membrane: '單層膜（磷脂雙分子層 Fluid Mosaic Model）',
    func: '控制物質進出細胞、維持胞內恆定、接收外界化學訊號',
    desc: '由雙層磷脂分子、膽固醇、膜蛋白與醣類組成的流體鑲嵌結構（Fluid Mosaic Model）。具有「選擇性通透」特性，能主動或被動調節離子、養分與廢物進出。',
    cuttable: true,
    substructures: [
      { id: 'bilayer', zh: '磷脂雙分子層', desc: '親水頭朝向內外水環境、疏水尾端朝向中央，阻擋大分子與帶電離子隨意穿透。' },
      { id: 'membraneChannel', zh: '膜蛋白與通道', desc: '鑲嵌於脂雙層中的運輸蛋白與受體蛋白，負責特殊物質運輸與訊息傳遞。' }
    ]
  },
  cytoplasm: {
    id: 'cytoplasm',
    zh: '細胞質 (膠狀基質)',
    en: 'Cytoplasm / Cytosol',
    color: '#38bdf8',
    presence: 'both',
    badge: '代謝反應場所',
    distribution: '充滿於細胞膜與細胞核之間的半流體空間',
    membrane: '無膜基質（含水、無機鹽、酵素與細胞骨架）',
    func: '承載所有胞器，並進行糖解作用（Glycolysis）與多數基礎生化代謝反應',
    desc: '介於細胞膜與細胞核之間的透明膠狀液體（細胞質液 Cytosol）與懸浮其中的胞器總稱。內含微管、微絲等細胞骨架，協助胞器定位與胞質流動。',
    cuttable: true,
    substructures: [
      { id: 'cytosol', zh: '細胞質液 (Cytosol)', desc: '富含水、游離胺基酸、ATP 與代謝酵素的膠狀基質，是糖解作用的場所。' }
    ]
  },
  nucleus: {
    id: 'nucleus',
    zh: '細胞核 (含核仁)',
    en: 'Nucleus & Nucleolus',
    color: '#a855f7',
    presence: 'both',
    badge: '遺傳與控制中心 · 可切開看內部',
    distribution: '動物細胞中央、植物細胞常因大液泡推擠而偏於一側',
    membrane: '雙層核膜（具核孔 Nuclear Pores）',
    func: '儲存 DNA 遺傳物質、進行轉錄作用（合成 RNA）並調控細胞生長與分裂',
    desc: '真核細胞最重要的生命中樞。外覆雙層核膜，表面布滿「核孔」供 mRNA 與蛋白質進出；切開核膜可見內部的染色質絲（DNA＋組織蛋白）以及中央顏色較深的球狀「核仁」。',
    cuttable: true,
    substructures: [
      { id: 'nuclearEnvelope', zh: '雙層核膜與核孔', desc: '由內外兩層膜構成，外膜與粗糙內質網相連；表面的核孔複合體管制大分子進出。' },
      { id: 'chromatin', zh: '染色質 (Chromatin)', desc: '由 DNA 與組織蛋白纏繞而成的細絲，細胞分裂時會濃縮成棒狀染色體。' },
      { id: 'nucleolus', zh: '核仁 (Nucleolus)', desc: '位於細胞核中央的高密度球體，負責轉錄 rRNA 並組裝核糖體次單元。' }
    ]
  },
  mitochondria: {
    id: 'mitochondria',
    zh: '粒線體',
    en: 'Mitochondrion',
    color: '#fb923c',
    presence: 'both',
    badge: '⚡ 細胞發電廠 · 雙層膜立體解剖',
    distribution: '動物與植物細胞皆有（高耗能細胞如肌肉細胞含量極多）',
    membrane: '雙層膜（外膜平滑、內膜向內高度皺摺成「嵴 Cristae」）',
    func: '進行有氧呼吸作用（檸檬酸循環與電子傳遞鏈），合成大量 ATP 能量貨幣',
    desc: '半自主性胞器，被譽為「細胞的能量發電廠」。切開外膜後可清楚看見立體內部：黃橙色內膜向內深層彎曲形成迷宮般的「皺摺（嵴 Cristae）」，大幅增加電子傳遞鏈與 ATP 合成酶的表面積；內部腔室為「基質（Matrix）」，含有環狀粒線體 DNA 與 70S 核糖體。',
    cuttable: true,
    substructures: [
      { id: 'mitoOuter', zh: '外膜 (Outer Membrane)', desc: '平滑的雙層磷脂外殼，含有孔蛋白（Porins），允許丙酮酸與小型分子通過。' },
      { id: 'mitoCristae', zh: '內膜與皺摺 (Inner Membrane & Cristae)', desc: '向內反覆摺疊的片狀/管狀立體構造，大幅增加表面積，鑲嵌電子傳遞鏈蛋白。' },
      { id: 'mitoMatrix', zh: '粒線體基質 (Matrix)', desc: '內膜包圍的腔室，含有檸檬酸循環（Krebs cycle）酵素群、環狀 mtDNA 與核糖體。' },
      { id: 'mitoAtp', zh: 'ATP 合成酶與環狀 DNA', desc: '利用跨膜質子梯度轉動合成 ATP；環狀 DNA 證實了內共生演化假說。' }
    ]
  },
  chloroplast: {
    id: 'chloroplast',
    zh: '葉綠體',
    en: 'Chloroplast',
    color: '#10b981',
    presence: 'plant',
    badge: '🌿 光合作用工廠 · 雙層膜立體解剖',
    distribution: '綠色植物葉肉細胞、保衛細胞與藻類（動物細胞無）',
    membrane: '雙層膜 ＋ 內部第三套「類囊體膜系統」',
    func: '吸收光能進行光合作用（光反應於類囊體、固碳反應於基質），將 CO₂ 與水合成葡萄糖',
    desc: '植物細胞特有的半自主性雙層膜胞器。切開雙層外膜後可見精緻立體內部：許多綠色扁平圓盤狀的「類囊體（Thylakoid）」像硬幣般層層堆疊成「葉綠餅（Granum）」，並以「基質片層（Stroma Lamellae）」互相橋接連通；周圍充滿膠狀「基質（Stroma）」、環狀 cpDNA 與白色澱粉粒。',
    cuttable: true,
    substructures: [
      { id: 'chloroEnvelope', zh: '雙層外膜 (Outer & Inner Envelope)', desc: '無葉綠素的透明平滑內外雙層膜，控制離子與代謝物進出葉綠體。' },
      { id: 'thylakoidGrana', zh: '類囊體與葉綠餅 (Thylakoids & Grana)', desc: '含大量葉綠素與感光色素的扁囊構造，疊成硬幣塔狀的葉綠餅，是「光反應」場所。' },
      { id: 'stromaLamellae', zh: '基質片層 (Stroma Lamellae)', desc: '連接不同葉綠餅柱之間的扁平膜管橋樑，維持類囊體腔連通。' },
      { id: 'chloroStroma', zh: '基質與澱粉粒 (Stroma & Starch)', desc: '充滿 RuBisCO 等固碳酵素的腔室，進行卡爾文循環（碳反應）並暫存光合澱粉粒。' }
    ]
  },
  roughER: {
    id: 'roughER',
    zh: '粗糙內質網',
    en: 'Rough Endoplasmic Reticulum (RER)',
    color: '#60a5fa',
    presence: 'both',
    badge: '蛋白質修飾與摺疊',
    distribution: '緊鄰細胞核外膜並向外延伸的扁平囊狀網系',
    membrane: '單層膜（表面附著大量核糖體顆粒）',
    func: '協助核糖體合成之分泌型蛋白質或膜蛋白進行摺疊、醣基化修飾與轉運',
    desc: '與外層核膜直接相連的立體扁平膜囊（Cisternae）迷宮系統。因膜表面布滿微小的「附著型核糖體」而呈現粗糙顆粒狀，合成後的蛋白質會包入運輸囊泡送往高基氏體。',
    cuttable: false,
    substructures: [
      { id: 'rerCisternae', zh: '扁平膜囊腔 (Cisternae)', desc: '互相連通的扁囊結構，提供新合成多肽鏈摺疊成正確 3D 構形的微環境。' },
      { id: 'boundRibosomes', zh: '附著型核糖體', desc: '附著在內質網膜外側的核糖體，專門合成準備分泌出細胞或嵌入膜的蛋白質。' }
    ]
  },
  smoothER: {
    id: 'smoothER',
    zh: '平滑內質網',
    en: 'Smooth Endoplasmic Reticulum (SER)',
    color: '#818cf8',
    presence: 'both',
    badge: '脂質合成與解毒',
    distribution: '與粗糙內質網相連、向外延伸的分枝管狀網路',
    membrane: '單層膜（表面平滑無核糖體）',
    func: '合成磷脂與固醇類脂質、肝細胞藥物解毒、調節並儲存鈣離子 (Ca²⁺)',
    desc: '由互相連通的彎曲細管構成，表面沒有核糖體附著。負責合成細胞膜所需的磷脂與性荷爾蒙（固醇類），在肌肉細胞中特化為肌質網以調控鈣離子。',
    cuttable: false,
    substructures: [
      { id: 'serTubules', zh: '管狀膜網 (Tubular Network)', desc: '富含脂質合成酶與細胞色素 P450 解毒酵素的管狀單層膜系統。' }
    ]
  },
  golgi: {
    id: 'golgi',
    zh: '高基氏體',
    en: 'Golgi Apparatus',
    color: '#f43f5e',
    presence: 'both',
    badge: '細胞物流分裝中心',
    distribution: '位於內質網與細胞膜之間的細胞質中',
    membrane: '單層膜（由 4～8 層彎曲扁囊堆疊而成）',
    func: '接收內質網送來的蛋白質與脂質，進行進一步化學修飾、分類、包裝並分泌（植物中亦參與合成細胞壁多醣）',
    desc: '由數層略微彎曲的半月形扁平膜囊堆疊而成，具有方向性：靠近內質網的「順面（cis face）」負責接收囊泡，朝向細胞膜的「反面（trans face）」則不斷芽生釋出分泌囊泡與溶體。',
    cuttable: false,
    substructures: [
      { id: 'golgiStacks', zh: '順面與反面扁囊堆疊 (Cis-Trans Cisternae)', desc: '不同層扁囊含有不同修飾酵素，像流水線一樣依序為蛋白質加上醣鏈標記。' },
      { id: 'golgiVesicles', zh: '分泌與運輸囊泡', desc: '從扁囊邊緣膨大脫落的球形小泡，負責將貨物精準運送至細胞膜或胞器。' }
    ]
  },
  vacuole: {
    id: 'vacuole',
    zh: '液泡 (中央大液泡 / 小液泡)',
    en: 'Vacuole (Central Vacuole)',
    color: '#2dd4bf',
    presence: 'both',
    badge: '水分膨壓與儲藏室',
    distribution: '植物成熟細胞具巨大「中央大液泡」（佔體積 50%~90%）；動物細胞僅有小型暫時性液泡',
    membrane: '單層膜（液泡膜 Tonoplast）',
    func: '植物：儲存水分、維持「膨壓 (Turgor Pressure)」支撐植物體、儲藏花青素與有機酸；動物：小型食泡或運輸泡',
    desc: '由單層液泡膜包圍的囊狀構造。在成熟植物細胞中融合成一個極巨大的透明藍青色「中央大液泡」，吸水後產生膨壓使莖葉挺立，並將細胞核與葉綠體推擠至細胞周緣。',
    cuttable: true,
    substructures: [
      { id: 'tonoplast', zh: '液泡膜 (Tonoplast)', desc: '具高度選擇通透性的單層膜，利用質子幫浦維持液泡內的酸性與滲透壓。' },
      { id: 'cellSap', zh: '細胞液 (Cell Sap)', desc: '液泡內的水溶液，含無機鹽、醣類、有機酸、色素（如花青素）與代謝副產物。' }
    ]
  },
  lysosome: {
    id: 'lysosome',
    zh: '溶體 (溶酶體)',
    en: 'Lysosome',
    color: '#facc15',
    presence: 'animal',
    badge: '動物細胞回收分解站',
    distribution: '動物細胞特有（植物細胞由中央大液泡兼任分解功能）',
    membrane: '單層膜（耐酸糖蛋白保護內壁）',
    func: '內含數十種酸性水解酵素，分解吞噬進來的病菌、大分子或衰老受損的胞器（自噬作用 Autophagy）',
    desc: '由高基氏體芽生形成的球狀單層膜胞器，內部維持 pH ≈ 4.5~5.0 的酸性環境。當粒線體等胞器老化時，溶體會與之融合並將其拆解為可再利用的胺基酸與單醣。',
    cuttable: false,
    substructures: [
      { id: 'hydrolyticEnzymes', zh: '酸性水解酵素群', desc: '包含蛋白酶、核酸酶、脂酶與醣苷酶，僅在酸性環境下具高活性，避免誤傷細胞質。' }
    ]
  },
  centrosome: {
    id: 'centrosome',
    zh: '中心體 (中心粒)',
    en: 'Centrosome & Centrioles',
    color: '#38bdf8',
    presence: 'animal',
    badge: '動物細胞分裂紡錘絲組織中心',
    distribution: '動物細胞及低等植物（高等開花植物無中心粒）',
    membrane: '無膜構造（由 9 組三聯微管垂直排列組成）',
    func: '細胞分裂時複製並移向兩極，發出星狀體與紡錘絲以牽引染色體分離',
    desc: '位於動物細胞核附近的無膜構造，內含一對互相垂直成 90° 排列的圓筒狀「中心粒（Centrioles）」。每個中心粒由 9 組三聯微管（9×3 微管束）構成精緻的風車狀橫切面。',
    cuttable: false,
    substructures: [
      { id: 'centriolePair', zh: '垂直成對中心粒 (9×3 微管束)', desc: '兩個互相垂直的短桶狀微管束，周圍環繞中心體基質（Pericentriolar material）。' }
    ]
  },
  ribosome: {
    id: 'ribosome',
    zh: '核糖體',
    en: 'Ribosomes',
    color: '#f9a8d4',
    presence: 'both',
    badge: '無膜蛋白質合成工廠',
    distribution: '游離於細胞質液中，或附著於粗糙內質網表面（粒線體與葉綠體內亦有）',
    membrane: '無膜構造（由 rRNA 與蛋白質組成大小兩個次單元）',
    func: '讀取 mRNA 遺傳密碼，將胺基酸連接合成多肽鏈（轉譯作用 Translation）',
    desc: '細胞內體積最小、數量最多的顆粒狀無膜構造。游離核糖體合成細胞自身內部使用的蛋白質（如細胞骨架與糖解酵素）；附著核糖體則合成外泌蛋白或膜蛋白。',
    cuttable: false,
    substructures: [
      { id: 'riboSubunits', zh: '大小次單元 (80S 真核核糖體)', desc: '由 60S 大次單元與 40S 小次單元結合而成，於轉譯時夾住 mRNA 合成蛋白質。' }
    ]
  }
};

const ORGANELLE_ORDER = [
  'mitochondria',
  'chloroplast',
  'nucleus',
  'cellWall',
  'cellMembrane',
  'vacuole',
  'roughER',
  'smoothER',
  'golgi',
  'centrosome',
  'lysosome',
  'ribosome',
  'cytoplasm'
];

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================
const state = {
  cellMode: 'animal',         // 'animal' | 'plant' | 'compare'
  cellCutMode: 'wedge',       // 'full' | 'wedge' | 'half'
  orgCutMode: 'cut',          // 'full' | 'cut'
  cutRatio: 1.0,              // 0.0 (closed) to 1.0 (fully open cut)
  focusedOrganelle: null,     // null (overview) or organelle id string
  focusedSubstructure: null,  // null or substructure id string
  showLabels: true,
  autoRotate: false,
  showSecondary: false        // default hidden for ER, Golgi, Ribosomes to eliminate lag & focus on key organelles
};

// ============================================================================
// 3. THREE.JS SCENE, CAMERA, RENDERER & CLIPPING PLANES
// ============================================================================
const container = document.getElementById('canvas-container');
const labelsLayer = document.getElementById('labels-layer');
const hoverTooltip = document.getElementById('hover-tooltip');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  44,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(14.5, 11.2, 16.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Limit pixel ratio to 1.5 to prevent 4K/retina GPU fill-rate throttling
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.2;
controls.maxDistance = 48;
controls.target.set(0, 0, 0);

// Lighting Setup (Studio + Rim Lighting for 3D biological depth)
const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.65);
hemiLight.position.set(0, 25, 0);
scene.add(hemiLight);

const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.45);
mainDirLight.position.set(15, 24, 18);
scene.add(mainDirLight);

const fillDirLight = new THREE.DirectionalLight(0x7dd3fc, 0.7);
fillDirLight.position.set(-18, -10, -14);
scene.add(fillDirLight);

const rimLight = new THREE.DirectionalLight(0xfde047, 0.45);
rimLight.position.set(0, 12, -20);
scene.add(rimLight);

// Ambient Floating Micro-Particles
const particleCount = 120;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 44;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 28;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 34;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0x38bdf8,
  size: 0.14,
  transparent: true,
  opacity: 0.35
});
const bgParticles = new THREE.Points(particleGeo, particleMat);
scene.add(bgParticles);

// ============================================================================
// 4. REGISTRY FOR INTERACTIVE MESHES, LABELS & CUTCAWAY MATERIALS
// ============================================================================
const animalGroup = new THREE.Group();
const plantGroup = new THREE.Group();
scene.add(animalGroup);
scene.add(plantGroup);

// Registries
const interactiveMeshes = [];
const organelleMeshesMap = new Map(); // orgId -> Array of Mesh
const substructureMeshesMap = new Map(); // subId -> Array of Mesh
const cutCrossSectionMeshes = []; // Cross section caps that only show when cut is active
const organelleCutCapMeshes = []; // Caps inside mitochondria/chloroplast/nucleus
const pinAnchors = []; // { orgId, cellType, localPos, group, element }

function registerMesh(mesh, orgId, subId = null) {
  mesh.userData.orgId = orgId;
  if (subId) mesh.userData.subId = subId;

  // Store original material properties for focus/dim/highlight transitions
  if (mesh.material) {
    // Clone material so each mesh can be highlighted/dimmed independently
    mesh.material = mesh.material.clone();
    mesh.userData.baseOpacity = mesh.material.opacity !== undefined ? mesh.material.opacity : 1.0;
    mesh.userData.baseTransparent = mesh.material.transparent || false;
    mesh.userData.baseColor = mesh.material.color ? mesh.material.color.clone() : new THREE.Color(0xffffff);
    mesh.userData.baseEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000);
    mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity || 0;
    mesh.userData.baseDepthWrite = mesh.material.depthWrite !== undefined ? mesh.material.depthWrite : true;
  }

  interactiveMeshes.push(mesh);

  if (!organelleMeshesMap.has(orgId)) organelleMeshesMap.set(orgId, []);
  organelleMeshesMap.get(orgId).push(mesh);

  if (subId) {
    if (!substructureMeshesMap.has(subId)) substructureMeshesMap.set(subId, []);
    substructureMeshesMap.get(subId).push(mesh);
  }
}

function registerPin(orgId, cellType, positionVec3, parentGroup, isHero = false) {
  const el = document.createElement('div');
  el.className = 'pin-label';
  const info = ORGANELLE_DB[orgId];
  el.innerHTML = `<span class="pin-dot" style="background:${info.color}; color:${info.color}"></span><span>${info.zh.split(' ')[0]}</span>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    focusOrganelle(orgId, parentGroup, positionVec3);
  });
  labelsLayer.appendChild(el);

  pinAnchors.push({
    orgId,
    cellType,
    localPos: positionVec3.clone(),
    group: parentGroup,
    element: el,
    isHero
  });
}

// ============================================================================
// 5. PROCEDURAL 3D ORGANELLE BUILDERS (WITH CUTAWAY ANATOMY)
// ============================================================================

/**
 * Helper: Create a capsule-shaped or partial-shell ellipsoid geometry compatible with Three.js r128
 */
function createCapsuleShellGeometry(radius, length, radialSegments = 28, heightSegments = 24, phiStart = 0, phiLength = Math.PI * 2) {
  const halfLen = length * 0.5;
  const totalHalfX = radius + halfLen;
  // Build a sphere and stretch X to form a smooth biological bean/capsule shell
  const geo = new THREE.SphereGeometry(radius, radialSegments, heightSegments, phiStart, phiLength, 0, Math.PI);
  // Rotate so phi wraps around the X axis (length axis)
  geo.rotateZ(Math.PI / 2);
  const scaleX = totalHalfX / radius;
  geo.scale(scaleX, 1, 1);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper: Build a detailed 3D Mitochondrion with cuttable Outer Membrane,
 * deeply folded Cristae (Inner Membrane), Matrix cavity, ATP Synthase & circular mtDNA!
 */
function createDetailedMitochondrion(scale = 1.0, isHero = false) {
  const group = new THREE.Group();
  const R = 0.62 * scale;
  const L = 1.35 * scale;

  // 1. Outer Membrane (深橙/紅褐色外膜半球殼)
  const outerBackGeo = createCapsuleShellGeometry(R, L, 32, 24, 0, Math.PI * 1.05);
  outerBackGeo.rotateX(Math.PI * 0.5);

  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412, // Deep burnt orange/rust
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const outerBackMesh = new THREE.Mesh(outerBackGeo, outerMat);
  outerBackMesh.userData.isOrganelleShell = true;
  registerMesh(outerBackMesh, 'mitochondria', 'mitoOuter');
  group.add(outerBackMesh);

  // Removable Front/Top Shell (shown when orgCutMode === 'full')
  const outerFrontGeo = createCapsuleShellGeometry(R * 1.002, L, 24, 18, Math.PI * 1.05, Math.PI * 0.95);
  outerFrontGeo.rotateX(Math.PI * 0.5);
  const outerFrontMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.55,
    metalness: 0.0,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide
  });
  const outerFrontMesh = new THREE.Mesh(outerFrontGeo, outerFrontMat);
  outerFrontMesh.userData.isRemovableOrgCover = true;
  registerMesh(outerFrontMesh, 'mitochondria', 'mitoOuter');
  group.add(outerFrontMesh);

  // Ellipsoid semi-axes helper: X = (r + l/2), Y = Z = r  (see createCapsuleShellGeometry)
  const IN_S = 0.925;                   // Inner membrane scale relative to outer membrane
  const innerA = (R + L * 0.5) * IN_S; // Inner membrane semi-axis along length (X)
  const innerB = R * IN_S;             // Inner membrane semi-axis across (Y/Z)

  // 2a. Inner Membrane bowl (內膜：緊貼外膜內側的第二層膜)
  const cristaeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Amber/gold biological inner membrane
    roughness: 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const innerBowlGeo = createCapsuleShellGeometry(R * IN_S, L * IN_S, 32, 24, 0, Math.PI * 1.0);
  innerBowlGeo.rotateX(Math.PI * 0.5);
  const innerBowlMesh = new THREE.Mesh(innerBowlGeo, cristaeMat);
  registerMesh(innerBowlMesh, 'mitochondria', 'mitoCristae');
  group.add(innerBowlMesh);

  // 2b. Mitochondrial Matrix (粒線體基質：內膜包圍的深色腔室)
  const matrixGeo = createCapsuleShellGeometry(R * 0.86, L * 0.86, 32, 24, 0, Math.PI * 1.0);
  matrixGeo.rotateX(Math.PI * 0.5);
  const matrixMat = new THREE.MeshStandardMaterial({
    color: 0x5b1414, // Dark burgundy/wine - high-contrast cavity behind the amber cristae
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const matrixMesh = new THREE.Mesh(matrixGeo, matrixMat);
  registerMesh(matrixMesh, 'mitochondria', 'mitoMatrix');
  group.add(matrixMesh);

  // 2c. Cut-face rings at the section plane (y = 0) so the double membrane reads clearly:
  //     outer membrane (rust) | intermembrane space (pale) | inner membrane (amber)
  const makeEllipseRing = (outerS, innerS, color, subId) => {
    const ax = R + L * 0.5;
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, ax * outerS, R * outerS, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, ax * innerS, R * innerS, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape, 48);
    geo.rotateX(-Math.PI / 2); // XY shape -> XZ section plane
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.003 * scale;
    registerMesh(mesh, 'mitochondria', subId);
    group.add(mesh);
  };
  makeEllipseRing(1.0, 0.965, 0x9a3412, 'mitoOuter');   // Outer membrane edge
  makeEllipseRing(0.965, 0.925, 0xfdba74, 'mitoOuter');  // Intermembrane space (膜間腔)
  makeEllipseRing(0.925, 0.86, 0xf59e0b, 'mitoCristae'); // Inner membrane edge

  // 3. Cristae (嵴)：內膜向內摺入的片狀皺摺，垂直於長軸，左右交錯排列
  //    Each crista is a rounded, bevelled plate attached to the inner membrane wall
  //    and protruding ~60-75% across the matrix, alternating sides like a textbook cutaway.
  const numCristae = isHero ? 9 : 6;
  const plateHalfThick = 0.018 * scale;
  const bevel = 0.016 * scale;
  const cristaTips = [];
  for (let i = 0; i < numCristae; i++) {
    const t = (i + 0.5) / numCristae;
    const x = (t - 0.5) * 2 * innerA * 0.78;
    const rc = innerB * Math.sqrt(Math.max(0, 1 - Math.pow(x / innerA, 2))) * 0.97 - bevel;
    if (rc < 0.08 * scale) continue;

    const side = i % 2 === 0 ? 1 : -1;
    const reach = (i % 3 === 1 ? 0.75 : 0.62) + 0.04 * Math.sin(i * 1.7);
    const zt = rc * (1 - 2 * reach);          // Tip position (in local u coordinate)
    const tipR = Math.min(0.07 * scale, rc * 0.25);
    const yBottom = -Math.sqrt(Math.max(0, rc * rc - zt * zt));

    // Shape in (u, v) = (across, height) plane; v <= 0 is inside the bowl
    const shape = new THREE.Shape();
    shape.moveTo(rc, 0);
    shape.lineTo(zt + tipR, 0);
    shape.quadraticCurveTo(zt - tipR * 0.35, 0, zt - tipR * 0.25, -tipR);   // Rounded upper tip
    shape.quadraticCurveTo(zt - tipR * 0.6, (yBottom - tipR) * 0.5, zt, yBottom); // Slightly bulging tip edge
    // Follow the inner membrane wall back up to the section plane
    const a0 = Math.atan2(yBottom, zt);
    const a1 = 0;
    const steps = 20;
    for (let k = 1; k <= steps; k++) {
      const a = a0 + (a1 - a0) * (k / steps);
      shape.lineTo(rc * Math.cos(a), rc * Math.sin(a));
    }

    const plateGeo = new THREE.ExtrudeGeometry(shape, {
      depth: plateHalfThick * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 3,
      curveSegments: 10
    });
    plateGeo.translate(0, 0, -plateHalfThick);
    plateGeo.rotateY(Math.PI / 2); // extrusion -> X (length axis), u -> -Z
    if (side < 0) plateGeo.scale(1, 1, -1);
    plateGeo.computeVertexNormals();

    const plate = new THREE.Mesh(plateGeo, cristaeMat);
    plate.position.x = x;
    plate.position.y = -0.004 * scale; // keep the bevel just under the section plane
    registerMesh(plate, 'mitochondria', 'mitoCristae');
    group.add(plate);

    cristaTips.push({ x, z: -side * zt, y: yBottom * 0.5, rc });
  }

  // 4. Circular mtDNA & ATP Synthase Granules
  const dnaMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3
  });
  const atpMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.35
  });

  // mtDNA rings float in the matrix between neighbouring cristae
  const ringCount = isHero ? 2 : 1;
  for (let r = 0; r < ringCount; r++) {
    const idx = Math.min(cristaTips.length - 2, Math.floor(((r + 1) / (ringCount + 1)) * cristaTips.length));
    const c0 = cristaTips[Math.max(0, idx)];
    const c1 = cristaTips[Math.max(0, idx) + 1] || c0;
    const torusGeo = new THREE.TorusGeometry(0.07 * scale, 0.016 * scale, 8, 24);
    const dnaRing = new THREE.Mesh(torusGeo, dnaMat);
    dnaRing.position.set((c0.x + c1.x) / 2, -R * 0.35, 0);
    dnaRing.rotation.set(0.2, Math.PI / 2, 0); // Ring plane parallel to the cristae
    registerMesh(dnaRing, 'mitochondria', 'mitoAtp');
    group.add(dnaRing);
  }

  // ATP synthase knobs studding the crista tips (where the membrane faces the matrix)
  const granuleGeo = new THREE.SphereGeometry(0.022 * scale, 8, 8);
  const perTip = isHero ? 2 : 1;
  cristaTips.forEach((c) => {
    for (let k = 0; k < perTip; k++) {
      for (const dx of [-1, 1]) {
        const gran = new THREE.Mesh(granuleGeo, atpMat);
        gran.position.set(
          c.x + dx * (plateHalfThick + bevel + 0.02 * scale),
          -0.03 * scale - k * 0.12 * scale,
          c.z * (1 - k * 0.1)
        );
        registerMesh(gran, 'mitochondria', 'mitoAtp');
        group.add(gran);
      }
    }
  });

  return group;
}

/**
 * Helper: Build a detailed 3D Chloroplast with cuttable Double Envelope,
 * stacked Thylakoid Grana (葉綠餅), Stroma Lamellae bridges, Stroma & Starch Grains!
 */
function createDetailedChloroplast(scale = 1.0, isHero = false) {
  const group = new THREE.Group();
  const RX = 1.38 * scale;
  const RY = 0.62 * scale;
  const RZ = 0.96 * scale;

  // 1. Outer & Inner Envelope (Bottom/Back bowl always visible, Top/Front dome toggleable)
  const backShellGeo = new THREE.SphereGeometry(1.0, 24, 18, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62);
  backShellGeo.scale(RX, RY, RZ);
  const outerEnvMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.35,
    metalness: 0.06,
    side: THREE.DoubleSide
  });
  const backShellMesh = new THREE.Mesh(backShellGeo, outerEnvMat);
  registerMesh(backShellMesh, 'chloroplast', 'chloroEnvelope');
  group.add(backShellMesh);

  // Inner membrane bright green rim inside the bowl
  const innerRimGeo = new THREE.SphereGeometry(0.95, 24, 16, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6);
  innerRimGeo.scale(RX, RY, RZ);
  const innerEnvMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  const innerRimMesh = new THREE.Mesh(innerRimGeo, innerEnvMat);
  registerMesh(innerRimMesh, 'chloroplast', 'chloroEnvelope');
  group.add(innerRimMesh);

  // Removable Top Cap (shown when orgCutMode === 'full')
  const topCapGeo = new THREE.SphereGeometry(1.002, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
  topCapGeo.scale(RX, RY, RZ);
  const topCapMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.32,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });
  const topCapMesh = new THREE.Mesh(topCapGeo, topCapMat);
  topCapMesh.userData.isRemovableOrgCover = true;
  registerMesh(topCapMesh, 'chloroplast', 'chloroEnvelope');
  group.add(topCapMesh);

  // 2. Stroma Base Cushion (葉綠體基質床)
  const stromaGeo = new THREE.CylinderGeometry(0.86, 0.75, 0.36 * scale, 28);
  stromaGeo.scale(RX * 0.95, 1, RZ * 0.95);
  const stromaMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.75,
    metalness: 0.05
  });
  const stromaMesh = new THREE.Mesh(stromaGeo, stromaMat);
  stromaMesh.position.y = -0.14 * scale;
  registerMesh(stromaMesh, 'chloroplast', 'chloroStroma');
  group.add(stromaMesh);

  // 3. Thylakoid Stacks / Grana (類囊體硬幣塔「葉綠餅」)
  const thylakoidMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x14532d,
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.12
  });

  const granaPositions = [
    { x: -0.62, z: -0.22, discs: 6 },
    { x: -0.18, z: 0.32, discs: 7 },
    { x: 0.25, z: -0.26, discs: 7 },
    { x: 0.66, z: 0.18, discs: 5 },
    { x: -0.02, z: -0.02, discs: 8 }
  ];

  const discRadius = 0.21 * scale;
  const discHeight = 0.048 * scale;
  const discGap = 0.062 * scale;
  const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, discHeight, 20);

  granaPositions.forEach((stack) => {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(stack.x * scale, -0.12 * scale, stack.z * scale);
    for (let d = 0; d < stack.discs; d++) {
      const disc = new THREE.Mesh(discGeo, thylakoidMat);
      disc.position.y = d * discGap;
      registerMesh(disc, 'chloroplast', 'thylakoidGrana');
      stackGroup.add(disc);
    }
    group.add(stackGroup);
  });

  // 4. Stroma Lamellae (連接各葉綠餅的基質片層橋樑)
  const lamellaMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 0.38,
    metalness: 0.08
  });

  const bridges = [
    { p1: [-0.62, 0.08, -0.22], p2: [-0.02, 0.12, -0.02] },
    { p1: [-0.02, 0.16, -0.02], p2: [0.25, 0.14, -0.26] },
    { p1: [-0.18, 0.1, 0.32], p2: [-0.02, 0.1, -0.02] },
    { p1: [0.25, 0.08, -0.26], p2: [0.66, 0.08, 0.18] },
    { p1: [-0.18, 0.18, 0.32], p2: [0.66, 0.14, 0.18] }
  ];

  bridges.forEach((b) => {
    const v1 = new THREE.Vector3(...b.p1).multiplyScalar(scale);
    const v2 = new THREE.Vector3(...b.p2).multiplyScalar(scale);
    const dist = v1.distanceTo(v2);
    const mid = v1.clone().add(v2).multiplyScalar(0.5);

    const bridgeGeo = new THREE.BoxGeometry(dist, 0.028 * scale, 0.11 * scale);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, lamellaMat);
    bridgeMesh.position.copy(mid);
    bridgeMesh.lookAt(v2);
    bridgeMesh.rotateY(Math.PI / 2);
    registerMesh(bridgeMesh, 'chloroplast', 'stromaLamellae');
    group.add(bridgeMesh);
  });

  // 5. Starch Grains (光合澱粉粒) & Circular cpDNA in Stroma
  const starchMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.2,
    roughness: 0.3
  });
  const starchCoords = [
    [-0.45, 0.05, 0.25],
    [0.42, 0.06, 0.32]
  ];
  starchCoords.forEach((c) => {
    const sGeo = new THREE.SphereGeometry(0.11 * scale, 14, 12);
    sGeo.scale(1.35, 0.7, 1.0);
    const sMesh = new THREE.Mesh(sGeo, starchMat);
    sMesh.position.set(c[0] * scale, c[1] * scale, c[2] * scale);
    sMesh.rotation.y = 0.4;
    registerMesh(sMesh, 'chloroplast', 'chloroStroma');
    group.add(sMesh);
  });

  return group;
}

/**
 * Helper: Build a 3D Nucleus with cuttable Double Nuclear Envelope, Nuclear Pores,
 * Chromatin fibers, and a dense glowing Nucleolus core!
 */
function createDetailedNucleus(radius = 1.65) {
  const group = new THREE.Group();

  // Clipping planes for the octant cutaway of the nuclear envelope (X > 0 and Z > 0 and Y > 0)
  // Instead of global clipping planes, we build the 3/4 pac-man sphere + removable 1/4 wedge!
  const mainEnvGeo = new THREE.SphereGeometry(radius, 28, 20, Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI);
  const envMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    roughness: 0.38,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const mainEnvMesh = new THREE.Mesh(mainEnvGeo, envMat);
  registerMesh(mainEnvMesh, 'nucleus', 'nuclearEnvelope');
  group.add(mainEnvMesh);

  // Removable 1/4 Nuclear Envelope wedge (shown when orgCutMode === 'full')
  const wedgeEnvGeo = new THREE.SphereGeometry(radius * 1.002, 20, 16, 0, Math.PI * 0.5, 0, Math.PI);
  const wedgeEnvMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.38,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });
  const wedgeEnvMesh = new THREE.Mesh(wedgeEnvGeo, wedgeEnvMat);
  wedgeEnvMesh.userData.isRemovableOrgCover = true;
  registerMesh(wedgeEnvMesh, 'nucleus', 'nuclearEnvelope');
  group.add(wedgeEnvMesh);

  // Nuclear Pores (核孔複合體) studded across the nuclear envelope
  const poreMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ff,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.3,
    roughness: 0.4
  });
  const poreGeo = new THREE.TorusGeometry(radius * 0.055, radius * 0.018, 8, 16);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const numPores = 34;
  for (let i = 0; i < numPores; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / numPores);
    const px = radius * Math.sin(phi) * Math.cos(theta);
    const py = radius * Math.cos(phi);
    const pz = radius * Math.sin(phi) * Math.sin(theta);

    // Skip the cut quadrant (px > 0 && pz > 0) so pores sit cleanly on the 3/4 shell
    if (px > 0.05 && pz > 0.05) continue;

    const pore = new THREE.Mesh(poreGeo, poreMat);
    pore.position.set(px, py, pz);
    pore.lookAt(px * 2, py * 2, pz * 2);
    registerMesh(pore, 'nucleus', 'nuclearEnvelope');
    group.add(pore);
  }

  // Chromatin Threads (染色質絲) coiled inside the nucleus
  const chromatinMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0x9d174d,
    emissiveIntensity: 0.25,
    roughness: 0.4
  });
  for (let c = 0; c < 4; c++) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const ang = (k / 24) * Math.PI * 4 + c * 1.5;
      const r = radius * (0.42 + 0.28 * Math.sin(k * 0.7 + c));
      pts.push(new THREE.Vector3(
        r * Math.cos(ang),
        r * Math.sin(ang * 0.8) * 0.85,
        r * Math.sin(ang)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 48, radius * 0.032, 8, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, chromatinMat);
    registerMesh(tubeMesh, 'nucleus', 'chromatin');
    group.add(tubeMesh);
  }

  // Nucleolus (核仁 - Dense glowing core)
  const nucleolusGeo = new THREE.SphereGeometry(radius * 0.36, 20, 16);
  const nucleolusMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.3
  });
  const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
  registerMesh(nucleolusMesh, 'nucleus', 'nucleolus');
  group.add(nucleolusMesh);

  return group;
}

// Performance optimization: shared reusable geometries & materials
const SHARED_RES = {
  riboGeo: new THREE.SphereGeometry(0.065, 6, 6),
  riboMat: new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0xdb2777,
    emissiveIntensity: 0.35,
    roughness: 0.4
  }),
  erMat: new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.45,
    side: THREE.DoubleSide
  }),
  serMat: new THREE.MeshStandardMaterial({
    color: 0x818cf8,
    roughness: 0.4
  }),
  golgiMat: new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.4
  }),
  vesMat: new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    roughness: 0.35
  })
};

/**
 * Helper: Build Rough Endoplasmic Reticulum (粗糙內質網 + 附著核糖體 - 優化版)
 */
function createRoughER(radiusOffset = 1.95) {
  const group = new THREE.Group();

  // 2 concentric curved cisternae sheets wrapping around the back of the nucleus
  const layers = [
    { r: radiusOffset, ySpan: 1.1, phiStart: Math.PI * 0.65, phiLen: Math.PI * 1.0 },
    { r: radiusOffset + 0.32, ySpan: 0.9, phiStart: Math.PI * 0.72, phiLen: Math.PI * 0.88 }
  ];

  layers.forEach((layer, idx) => {
    const tubePts = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = layer.phiStart + t * layer.phiLen;
      const waveR = layer.r + Math.sin(t * Math.PI * 3 + idx) * 0.08;
      const y = Math.cos(t * Math.PI * 2 + idx) * 0.22;
      tubePts.push(new THREE.Vector3(
        Math.cos(angle) * waveR,
        y,
        Math.sin(angle) * waveR
      ));
    }
    const curve = new THREE.CatmullRomCurve3(tubePts);
    const sheetGeo = new THREE.TubeGeometry(curve, 18, 0.12, 6, false);
    sheetGeo.scale(1, 2.4, 1);
    const sheetMesh = new THREE.Mesh(sheetGeo, SHARED_RES.erMat);
    registerMesh(sheetMesh, 'roughER', 'rerCisternae');
    group.add(sheetMesh);

    // Stud with fewer bound ribosomes for high fps
    for (let j = 2; j < steps; j += 3) {
      const pt = tubePts[j];
      const ribo = new THREE.Mesh(SHARED_RES.riboGeo, SHARED_RES.riboMat);
      const normal = pt.clone().normalize();
      ribo.position.copy(pt).addScaledVector(normal, 0.13);
      registerMesh(ribo, 'roughER', 'boundRibosomes');
      group.add(ribo);
    }
  });

  return group;
}

/**
 * Helper: Build Smooth Endoplasmic Reticulum (平滑內質網 - 優化管狀網路)
 */
function createSmoothER() {
  const group = new THREE.Group();

  const branches = [
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0.2, 0.3), new THREE.Vector3(1.0, 0.3, 0.35)],
    [new THREE.Vector3(0.3, 0.1, 0.15), new THREE.Vector3(0.6, -0.25, 0.5), new THREE.Vector3(0.95, -0.35, 0.7)],
    [new THREE.Vector3(0.2, -0.05, -0.05), new THREE.Vector3(0.6, 0.35, -0.3), new THREE.Vector3(1.0, 0.2, -0.45)]
  ];

  branches.forEach((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 12, 0.1, 6, false);
    const mesh = new THREE.Mesh(geo, SHARED_RES.serMat);
    registerMesh(mesh, 'smoothER', 'serTubules');
    group.add(mesh);
  });

  return group;
}

/**
 * Helper: Build Golgi Apparatus (高基氏體扁囊堆疊與分泌囊泡 - 優化版)
 */
function createGolgiApparatus(scale = 1.0) {
  const group = new THREE.Group();

  // 3 stacked curved cisternae
  const stackCount = 3;
  for (let i = 0; i < stackCount; i++) {
    const t = i / (stackCount - 1);
    const arcRadius = (0.78 + t * 0.36) * scale;
    const pts = [];
    for (let a = -0.85; a <= 0.85; a += 0.28) {
      pts.push(new THREE.Vector3(
        Math.sin(a) * arcRadius,
        (i - 1) * 0.2 * scale,
        Math.cos(a) * arcRadius * 0.5 - arcRadius * 0.4
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const cisternaGeo = new THREE.TubeGeometry(curve, 14, 0.08 * scale, 6, false);
    cisternaGeo.scale(1, 0.65, 1.8);
    const cisternaMesh = new THREE.Mesh(cisternaGeo, SHARED_RES.golgiMat);
    registerMesh(cisternaMesh, 'golgi', 'golgiStacks');
    group.add(cisternaMesh);
  }

  // 3 Budding Secretory Vesicles
  const vesOffsets = [
    [0.9, 0.2, 0.15, 0.12],
    [-0.88, -0.1, 0.18, 0.11],
    [0.65, 0.4, 0.32, 0.1]
  ];
  const vGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
  vesOffsets.forEach(([x, y, z, r]) => {
    const vMesh = new THREE.Mesh(vGeo, SHARED_RES.vesMat);
    vMesh.position.set(x * scale, y * scale, z * scale);
    registerMesh(vMesh, 'golgi', 'golgiVesicles');
    group.add(vMesh);
  });

  return group;
}

/**
 * Helper: Build Centrosome (一對垂直排列的 9×3 微管束中心粒)
 */
function createCentrosome(scale = 1.0) {
  const group = new THREE.Group();
  const tubMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.2
  });

  function buildSingleCentriole() {
    const barrel = new THREE.Group();
    const numTriplets = 9;
    const ringR = 0.22 * scale;
    const tubeGeo = new THREE.CylinderGeometry(0.032 * scale, 0.032 * scale, 0.62 * scale, 8);

    for (let i = 0; i < numTriplets; i++) {
      const ang = (i / numTriplets) * Math.PI * 2;
      for (let sub = 0; sub < 2; sub++) {
        const r = ringR + sub * 0.038 * scale;
        const micro = new THREE.Mesh(tubeGeo, tubMat);
        micro.position.set(Math.cos(ang + sub * 0.1) * r, 0, Math.sin(ang + sub * 0.1) * r);
        registerMesh(micro, 'centrosome', 'centriolePair');
        barrel.add(micro);
      }
    }
    return barrel;
  }

  const c1 = buildSingleCentriole();
  c1.position.set(-0.22 * scale, 0, 0);
  c1.rotation.z = 0.25;
  group.add(c1);

  const c2 = buildSingleCentriole();
  c2.position.set(0.28 * scale, -0.08 * scale, 0.18 * scale);
  c2.rotation.x = Math.PI / 2;
  c2.rotation.z = -0.3;
  group.add(c2);

  return group;
}

/**
 * Helper: Build Lysosome (溶體 - 切開見內部酸性水解酶顆粒)
 */
function createLysosome(radius = 0.44) {
  const group = new THREE.Group();
  const shellGeo = new THREE.SphereGeometry(radius, 16, 14, Math.PI * 0.35, Math.PI * 1.65);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.35,
    side: THREE.DoubleSide
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  registerMesh(shellMesh, 'lysosome', 'hydrolyticEnzymes');
  group.add(shellMesh);

  const enzMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xca8a04,
    emissiveIntensity: 0.45
  });
  const enzGeo = new THREE.SphereGeometry(radius * 0.2, 8, 8);
  const offsets = [
    [0.1, 0.1, 0.08],
    [-0.1, -0.08, 0.12],
    [0.08, -0.12, -0.06],
    [-0.08, 0.12, -0.08]
  ];
  offsets.forEach(([x, y, z]) => {
    const eMesh = new THREE.Mesh(enzGeo, enzMat);
    eMesh.position.set(x * radius * 2.2, y * radius * 2.2, z * radius * 2.2);
    registerMesh(eMesh, 'lysosome', 'hydrolyticEnzymes');
    group.add(eMesh);
  });

  return group;
}

// ============================================================================
// 6. SHELL CLIPPING PLANES FOR ANIMAL & PLANT CELL CUTAWAY
// ============================================================================
// Animal cell and Plant cell outer shells use dynamic clipping planes controlled by state.cellCutMode & state.cutRatio
const animalShellPlanes = [
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
];
const plantShellPlanes = [
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
];

const animalShellMaterials = [];
const plantShellMaterials = [];

// ============================================================================
// 7. BUILD ANIMAL CELL 3D SCENE
// ============================================================================
function buildAnimalCell() {
  const R = 5.4;

  // 1. Plasma Membrane (細胞膜) - Outer translucent sphere with lipid sheen
  const membraneGeo = new THREE.SphereGeometry(R, 36, 28);
  const membraneMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    clippingPlanes: animalShellPlanes,
    clipIntersection: true
  });
  animalShellMaterials.push(membraneMat);
  const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
  registerMesh(membraneMesh, 'cellMembrane', 'bilayer');
  animalGroup.add(membraneMesh);

  // Membrane protein channels studded on outer surface
  const channelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12);
  const channelMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3
  });
  const channelDirs = [
    [-0.8, 0.4, -0.45],
    [-0.5, -0.6, 0.62],
    [0.65, 0.5, -0.58],
    [-0.35, 0.85, 0.38],
    [-0.75, -0.2, -0.62]
  ];
  channelDirs.forEach((d) => {
    const v = new THREE.Vector3(...d).normalize().multiplyScalar(R);
    const ch = new THREE.Mesh(channelGeo, channelMat);
    ch.position.copy(v);
    ch.lookAt(v.clone().multiplyScalar(2));
    ch.rotateX(Math.PI / 2);
    registerMesh(ch, 'cellMembrane', 'membraneChannel');
    animalGroup.add(ch);
  });
  registerPin('cellMembrane', 'animal', new THREE.Vector3(-R * 0.85, R * 0.48, -R * 0.2), animalGroup);

  // 2. Cytoplasm Inner Bowl & Cross-Section Cut Faces (細胞質)
  const cytoBowlGeo = new THREE.SphereGeometry(R * 0.965, 36, 28);
  const cytoBowlMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0f172a,
    emissiveIntensity: 0.4,
    roughness: 0.85,
    side: THREE.BackSide,
    clippingPlanes: animalShellPlanes,
    clipIntersection: true
  });
  animalShellMaterials.push(cytoBowlMat);
  const cytoBowlMesh = new THREE.Mesh(cytoBowlGeo, cytoBowlMat);
  registerMesh(cytoBowlMesh, 'cytoplasm', 'cytosol');
  animalGroup.add(cytoBowlMesh);

  // Equator / Quadrant Cross-Section Rim Highlight (gives crisp cutaway look)
  const cutFaceMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.16,
    roughness: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  // Horizontal XZ quarter-circle shelf & Vertical YZ / XY faces for wedge cut
  const wedgeCap1Geo = new THREE.CircleGeometry(R * 0.965, 48, -Math.PI / 2, Math.PI);
  const wedgeCap1 = new THREE.Mesh(wedgeCap1Geo, cutFaceMat);
  wedgeCap1.rotation.y = Math.PI / 2; // YZ plane at X=0, Z>0
  registerMesh(wedgeCap1, 'cytoplasm', 'cytosol');
  cutCrossSectionMeshes.push(wedgeCap1);
  animalGroup.add(wedgeCap1);

  const wedgeCap2Geo = new THREE.CircleGeometry(R * 0.965, 48, -Math.PI / 2, Math.PI);
  const wedgeCap2 = new THREE.Mesh(wedgeCap2Geo, cutFaceMat);
  // XY plane at Z=0, X>0
  registerMesh(wedgeCap2, 'cytoplasm', 'cytosol');
  cutCrossSectionMeshes.push(wedgeCap2);
  animalGroup.add(wedgeCap2);

  registerPin('cytoplasm', 'animal', new THREE.Vector3(-2.1, -3.2, 1.8), animalGroup);

  // 3. Nucleus & Nucleolus (細胞核 - Positioned near center)
  const nucleus = createDetailedNucleus(1.75);
  nucleus.position.set(-0.35, 0.35, -0.35);
  animalGroup.add(nucleus);
  registerPin('nucleus', 'animal', new THREE.Vector3(-0.35, 2.25, -0.35), animalGroup, true);

  // 4. Hero Mitochondrion (粒線體 - Prominent in foreground cutaway + additional ones)
  const heroMito = createDetailedMitochondrion(1.18, true);
  heroMito.position.set(1.95, -0.65, 2.15);
  heroMito.rotation.set(0.32, -0.55, 0.12);
  animalGroup.add(heroMito);
  registerPin('mitochondria', 'animal', new THREE.Vector3(1.95, 0.35, 2.15), animalGroup, true);

  const mito2 = createDetailedMitochondrion(0.9, false);
  mito2.position.set(-2.6, -1.5, 1.9);
  mito2.rotation.set(0.4, 0.6, -0.3);
  animalGroup.add(mito2);

  const mito3 = createDetailedMitochondrion(0.88, false);
  mito3.position.set(2.1, 1.85, -1.9);
  mito3.rotation.set(-0.2, -0.9, 0.4);
  animalGroup.add(mito3);

  // 5. Rough Endoplasmic Reticulum (粗糙內質網)
  const roughER = createRoughER(2.05);
  roughER.position.set(-0.35, 0.35, -0.35);
  animalGroup.add(roughER);
  registerPin('roughER', 'animal', new THREE.Vector3(-2.65, 1.25, -1.1), animalGroup);

  // 6. Smooth Endoplasmic Reticulum (平滑內質網)
  const smoothER = createSmoothER();
  smoothER.position.set(-3.2, -0.25, 0.6);
  smoothER.rotation.y = 0.8;
  animalGroup.add(smoothER);
  registerPin('smoothER', 'animal', new THREE.Vector3(-3.3, 0.35, 1.2), animalGroup);

  // 7. Golgi Apparatus (高基氏體)
  const golgi = createGolgiApparatus(1.15);
  golgi.position.set(2.55, -1.55, -1.25);
  golgi.rotation.set(0.25, -0.65, 0.1);
  animalGroup.add(golgi);
  registerPin('golgi', 'animal', new THREE.Vector3(2.65, -0.7, -1.25), animalGroup);

  // 8. Centrosome & Centrioles (中心體)
  const centrosome = createCentrosome(1.15);
  centrosome.position.set(1.65, 1.95, 1.15);
  animalGroup.add(centrosome);
  registerPin('centrosome', 'animal', new THREE.Vector3(1.65, 2.55, 1.15), animalGroup);

  // 9. Lysosomes (溶體)
  const lyso1 = createLysosome(0.48);
  lyso1.position.set(-1.15, -2.35, 2.45);
  lyso1.rotation.y = -0.5;
  animalGroup.add(lyso1);
  registerPin('lysosome', 'animal', new THREE.Vector3(-1.15, -1.75, 2.45), animalGroup);

  const lyso2 = createLysosome(0.38);
  lyso2.position.set(0.95, -2.8, 0.4);
  animalGroup.add(lyso2);

  // 10. Small Animal Vacuoles (動物細胞小液泡)
  const vacMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    transparent: true,
    opacity: 0.78,
    roughness: 0.25
  });
  const animVac1 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), vacMat);
  animVac1.position.set(0.35, -2.1, 2.85);
  registerMesh(animVac1, 'vacuole', 'tonoplast');
  animalGroup.add(animVac1);
  registerPin('vacuole', 'animal', new THREE.Vector3(0.35, -1.5, 2.85), animalGroup);

  // 11. Free Ribosomes (游離核糖體群)
  const riboMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0xdb2777,
    emissiveIntensity: 0.45
  });
  const freeRiboCoords = [
    [0.8, 0.9, 2.6], [1.1, 0.7, 2.4], [0.6, 1.1, 2.3],
    [-1.6, 2.4, 1.5], [-1.3, 2.2, 1.7], [2.4, 0.3, 0.6],
    [-0.4, -1.2, 3.1], [1.6, -2.4, 1.4]
  ];
  freeRiboCoords.forEach(([x, y, z]) => {
    const rMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), riboMat);
    rMesh.position.set(x, y, z);
    registerMesh(rMesh, 'ribosome', 'riboSubunits');
    animalGroup.add(rMesh);
  });
  registerPin('ribosome', 'animal', new THREE.Vector3(0.85, 1.15, 2.55), animalGroup);
}

// ============================================================================
// 8. BUILD PLANT CELL 3D SCENE
// ============================================================================
function buildPlantCell() {
  const hexRadius = 5.8;
  const cellHeight = 7.4;

  // 1. Thick Hexagonal Prism Cell Wall (植物細胞壁)
  const wallOuterGeo = new THREE.CylinderGeometry(hexRadius, hexRadius, cellHeight, 6, 1, false);
  wallOuterGeo.rotateY(Math.PI / 6);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.45,
    metalness: 0.05,
    transparent: true,
    opacity: 0.76,
    side: THREE.DoubleSide,
    clippingPlanes: plantShellPlanes,
    clipIntersection: true
  });
  plantShellMaterials.push(wallMat);
  const wallMesh = new THREE.Mesh(wallOuterGeo, wallMat);
  registerMesh(wallMesh, 'cellWall', 'primaryWall');
  plantGroup.add(wallMesh);

  // Structural Cellulose Edge Beams on Hexagonal Corners
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.5,
    clippingPlanes: plantShellPlanes,
    clipIntersection: true
  });
  plantShellMaterials.push(edgeMat);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.22, cellHeight * 1.01, 8);
    const pillar = new THREE.Mesh(pillarGeo, edgeMat);
    pillar.position.set(Math.cos(angle) * hexRadius, 0, Math.sin(angle) * hexRadius);
    registerMesh(pillar, 'cellWall', 'primaryWall');
    plantGroup.add(pillar);
  }

  // Plasmodesmata Pores (原生質絲孔道) on side walls
  const plasmoMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xca8a04,
    emissiveIntensity: 0.4
  });
  const plasmoGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 10);
  plasmoGeo.rotateZ(Math.PI / 2);
  for (let p = -1; p <= 1; p++) {
    const pore = new THREE.Mesh(plasmoGeo, plasmoMat);
    pore.position.set(-hexRadius * 0.86, p * 1.5, 0);
    registerMesh(pore, 'cellWall', 'plasmodesmata');
    plantGroup.add(pore);
  }
  registerPin('cellWall', 'plant', new THREE.Vector3(-hexRadius * 0.86, cellHeight * 0.45, -1.2), plantGroup);

  // 2. Plant Cell Membrane (緊貼細胞壁內側的細胞膜)
  const innerMembraneGeo = new THREE.CylinderGeometry(hexRadius * 0.92, hexRadius * 0.92, cellHeight * 0.92, 6, 1, false);
  innerMembraneGeo.rotateY(Math.PI / 6);
  const innerMembraneMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.35,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    clippingPlanes: plantShellPlanes,
    clipIntersection: true
  });
  plantShellMaterials.push(innerMembraneMat);
  const innerMembraneMesh = new THREE.Mesh(innerMembraneGeo, innerMembraneMat);
  registerMesh(innerMembraneMesh, 'cellMembrane', 'bilayer');
  plantGroup.add(innerMembraneMesh);
  registerPin('cellMembrane', 'plant', new THREE.Vector3(-hexRadius * 0.78, -cellHeight * 0.35, 1.8), plantGroup);

  // 3. Plant Cytoplasm Interior Floor (植物細胞質)
  const plantCytoGeo = new THREE.CylinderGeometry(hexRadius * 0.9, hexRadius * 0.9, cellHeight * 0.9, 6, 1, false);
  plantCytoGeo.rotateY(Math.PI / 6);
  const plantCytoMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.85,
    side: THREE.BackSide,
    clippingPlanes: plantShellPlanes,
    clipIntersection: true
  });
  plantShellMaterials.push(plantCytoMat);
  const plantCytoMesh = new THREE.Mesh(plantCytoGeo, plantCytoMat);
  registerMesh(plantCytoMesh, 'cytoplasm', 'cytosol');
  plantGroup.add(plantCytoMesh);
  registerPin('cytoplasm', 'plant', new THREE.Vector3(-2.6, -2.9, 1.9), plantGroup);

  // 4. Large Central Vacuole (大型中央液泡 - Cuttable to see internal water sap)
  const vacGroup = new THREE.Group();
  vacGroup.position.set(-0.65, -0.15, -0.65);

  const vacGeo = new THREE.SphereGeometry(2.35, 28, 22, Math.PI * 0.45, Math.PI * 1.55);
  vacGeo.scale(1.05, 1.28, 1.05);
  const tonoplastMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f766e,
    emissiveIntensity: 0.2,
    roughness: 0.25,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide
  });
  const vacMesh = new THREE.Mesh(vacGeo, tonoplastMat);
  registerMesh(vacMesh, 'vacuole', 'tonoplast');
  vacGroup.add(vacMesh);

  // Removable front cap of central vacuole
  const vacCapGeo = new THREE.SphereGeometry(2.352, 20, 18, 0, Math.PI * 0.45);
  vacCapGeo.scale(1.05, 1.28, 1.05);
  const vacCapMat = tonoplastMat.clone();
  const vacCapMesh = new THREE.Mesh(vacCapGeo, vacCapMat);
  vacCapMesh.userData.isRemovableOrgCover = true;
  registerMesh(vacCapMesh, 'vacuole', 'tonoplast');
  vacGroup.add(vacCapMesh);

  // Inner shimmering cell sap core
  const sapGeo = new THREE.SphereGeometry(2.05, 22, 16);
  sapGeo.scale(1.02, 1.22, 1.02);
  const sapMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.38,
    roughness: 0.3
  });
  const sapMesh = new THREE.Mesh(sapGeo, sapMat);
  registerMesh(sapMesh, 'vacuole', 'cellSap');
  vacGroup.add(sapMesh);

  plantGroup.add(vacGroup);
  registerPin('vacuole', 'plant', new THREE.Vector3(-0.65, 2.25, -0.65), plantGroup, true);

  // 5. Hero Chloroplast + Additional Chloroplasts (葉綠體 - Cut open showing Grana stacks!)
  const heroChloro = createDetailedChloroplast(1.22, true);
  heroChloro.position.set(2.15, -0.35, 2.05);
  heroChloro.rotation.set(0.38, -0.52, 0.15);
  plantGroup.add(heroChloro);
  registerPin('chloroplast', 'plant', new THREE.Vector3(2.15, 0.65, 2.05), plantGroup, true);

  const chloro2 = createDetailedChloroplast(0.95, false);
  chloro2.position.set(-2.7, -1.65, 2.25);
  chloro2.rotation.set(0.45, 0.55, -0.25);
  plantGroup.add(chloro2);

  const chloro3 = createDetailedChloroplast(0.92, false);
  chloro3.position.set(2.45, 1.85, -1.45);
  chloro3.rotation.set(0.3, -1.1, 0.2);
  plantGroup.add(chloro3);

  // 6. Plant Mitochondria (植物細胞同樣擁有粒線體！)
  const plantMito1 = createDetailedMitochondrion(1.05, true);
  plantMito1.position.set(0.45, -1.95, 2.65);
  plantMito1.rotation.set(0.35, -0.25, 0.15);
  plantGroup.add(plantMito1);
  registerPin('mitochondria', 'plant', new THREE.Vector3(0.45, -1.15, 2.65), plantGroup, true);

  const plantMito2 = createDetailedMitochondrion(0.85, false);
  plantMito2.position.set(-3.1, 1.55, 1.45);
  plantMito2.rotation.set(0.25, 0.7, -0.2);
  plantGroup.add(plantMito2);

  // 7. Plant Nucleus & Nucleolus (因中央大液泡推擠而偏於一側)
  const plantNucleus = createDetailedNucleus(1.48);
  plantNucleus.position.set(2.05, 1.15, 0.35);
  plantGroup.add(plantNucleus);
  registerPin('nucleus', 'plant', new THREE.Vector3(2.05, 2.75, 0.35), plantGroup, true);

  // 8. Plant Rough ER & Smooth ER
  const plantRER = createRoughER(1.72);
  plantRER.position.set(2.05, 1.15, 0.35);
  plantRER.rotation.y = Math.PI * 0.75;
  plantGroup.add(plantRER);
  registerPin('roughER', 'plant', new THREE.Vector3(3.35, 1.75, -0.8), plantGroup);

  const plantSER = createSmoothER();
  plantSER.position.set(1.2, 2.2, -1.8);
  plantSER.scale.setScalar(0.85);
  plantGroup.add(plantSER);
  registerPin('smoothER', 'plant', new THREE.Vector3(1.8, 2.6, -2.0), plantGroup);

  // 9. Plant Golgi Apparatus (參與合成細胞壁多醣)
  const plantGolgi = createGolgiApparatus(1.02);
  plantGolgi.position.set(-1.35, -2.25, 2.35);
  plantGolgi.rotation.set(0.2, 0.5, -0.1);
  plantGroup.add(plantGolgi);
  registerPin('golgi', 'plant', new THREE.Vector3(-1.35, -1.45, 2.35), plantGroup);

  // 10. Plant Free Ribosomes
  const riboMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0xdb2777,
    emissiveIntensity: 0.45
  });
  const plantRibos = [
    [1.2, 0.2, 2.7], [1.4, 0.4, 2.5], [0.9, 0.5, 2.6],
    [-1.8, 0.4, 2.8], [2.7, -1.6, 0.8]
  ];
  plantRibos.forEach(([x, y, z]) => {
    const rMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), riboMat);
    rMesh.position.set(x, y, z);
    registerMesh(rMesh, 'ribosome', 'riboSubunits');
    plantGroup.add(rMesh);
  });
  registerPin('ribosome', 'plant', new THREE.Vector3(1.2, 0.55, 2.65), plantGroup);
}

buildAnimalCell();
buildPlantCell();

// ============================================================================
// 9. CUTAWAY & CLIPPING PLANE CONTROLLER
// ============================================================================
function updateCutawayPlanes() {
  const ratio = state.cutRatio; // 0 (closed) to 1 (fully cut)

  // 1. Update Outer Cell Shell Clipping Planes
  // Animal group world offset and Plant group world offset
  const animOffset = animalGroup.position.x;
  const plantOffset = plantGroup.position.x;

  const isCellCutActive = state.cellCutMode !== 'full' && ratio > 0.02;

  if (!isCellCutActive) {
    // Move planes far away so the entire outer shell is intact
    animalShellPlanes[0].Set ? null : null;
    animalShellPlanes[0].normal.set(-1, 0, 0);
    animalShellPlanes[0].constant = 999;
    animalShellPlanes[1].normal.set(0, 0, -1);
    animalShellPlanes[1].constant = 999;

    plantShellPlanes[0].normal.set(-1, 0, 0);
    plantShellPlanes[0].constant = 999;
    plantShellPlanes[1].normal.set(0, 0, -1);
    plantShellPlanes[1].constant = 999;

    cutCrossSectionMeshes.forEach((m) => { m.visible = false; });
  } else if (state.cellCutMode === 'wedge') {
    // 1/4 Front-Right Wedge Cutaway (clips where local X > shift AND local Z > shift)
    // clipIntersection = true clips the intersection of both half-spaces!
    const shift = (1.0 - ratio) * 5.8; // At ratio=1, shift=0 (cuts X>0 and Z>0)
    animalShellPlanes[0].normal.set(-1, 0, 0);
    animalShellPlanes[0].constant = animOffset + shift;
    animalShellPlanes[1].normal.set(0, 0, -1);
    animalShellPlanes[1].constant = shift;

    plantShellPlanes[0].normal.set(-1, 0, 0);
    plantShellPlanes[0].constant = plantOffset + shift;
    plantShellPlanes[1].normal.set(0, 0, -1);
    plantShellPlanes[1].constant = shift;

    animalShellMaterials.forEach((mat) => { mat.clipIntersection = true; });
    plantShellMaterials.forEach((mat) => { mat.clipIntersection = true; });
    cutCrossSectionMeshes.forEach((m) => { m.visible = ratio > 0.75; });
  } else if (state.cellCutMode === 'half') {
    // Half Cutaway (clips everything with Z > shift)
    const shift = (1.0 - ratio) * 5.8;
    animalShellPlanes[0].normal.set(0, 0, -1);
    animalShellPlanes[0].constant = shift;
    animalShellPlanes[1].normal.set(0, 0, -1);
    animalShellPlanes[1].constant = shift;

    plantShellPlanes[0].normal.set(0, 0, -1);
    plantShellPlanes[0].constant = shift;
    plantShellPlanes[1].normal.set(0, 0, -1);
    plantShellPlanes[1].constant = shift;

    animalShellMaterials.forEach((mat) => { mat.clipIntersection = false; });
    plantShellMaterials.forEach((mat) => { mat.clipIntersection = false; });
    cutCrossSectionMeshes.forEach((m) => { m.visible = false; });
  }

  // 2. Update Organelle Internal Cutaway (Mitochondria, Chloroplast, Nucleus, Central Vacuole)
  const isOrgCut = state.orgCutMode === 'cut' && ratio > 0.05;
  interactiveMeshes.forEach((mesh) => {
    if (mesh.userData.isRemovableOrgCover) {
      if (!isOrgCut) {
        mesh.visible = true;
        mesh.scale.setScalar(1.0);
      } else {
        // Smoothly peel back / hide removable organelle cap based on cutRatio
        if (ratio >= 0.35) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
          const t = 1.0 - (ratio / 0.35);
          mesh.scale.setScalar(Math.max(0.01, t));
        }
      }
    }
  });

  // Update status pill in right panel
  const statusPill = document.getElementById('infoCutStatus');
  if (isCellCutActive && isOrgCut) {
    statusPill.textContent = '🔪 細胞＋胞器雙重剖面';
  } else if (isCellCutActive) {
    statusPill.textContent = '🔪 細胞外殼剖面';
  } else if (isOrgCut) {
    statusPill.textContent = '🔬 胞器內部剖面';
  } else {
    statusPill.textContent = '🌕 完整立體外觀';
  }
}

// Secondary organelles that can be toggled on/off to boost performance and reduce visual clutter
const SECONDARY_ORGANELLES = new Set(['roughER', 'smoothER', 'golgi', 'ribosome']);

function isOrganelleVisibleInScene(orgId) {
  if (SECONDARY_ORGANELLES.has(orgId)) {
    // Visible if user toggled them on OR if one of them is specifically focused
    return state.showSecondary || state.focusedOrganelle === orgId;
  }
  return true;
}

function updateOrganelleVisibility() {
  interactiveMeshes.forEach((mesh) => {
    const orgId = mesh.userData.orgId;
    if (SECONDARY_ORGANELLES.has(orgId)) {
      mesh.visible = isOrganelleVisibleInScene(orgId);
    }
  });

  pinAnchors.forEach((pin) => {
    if (SECONDARY_ORGANELLES.has(pin.orgId)) {
      if (!isOrganelleVisibleInScene(pin.orgId)) {
        pin.element.style.display = 'none';
      }
    }
  });

  const toggleBtn = document.getElementById('btnToggleSecondary');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', state.showSecondary);
    toggleBtn.innerHTML = state.showSecondary
      ? '👁️ 隱藏次要 (ER/高基/核糖)'
      : '👁️ 顯示 ER / 高基氏體 / 核糖體';
  }
}
const cameraAnim = {
  active: false,
  startPos: new THREE.Vector3(),
  endPos: new THREE.Vector3(),
  startTarget: new THREE.Vector3(),
  endTarget: new THREE.Vector3(),
  startTime: 0,
  duration: 750
};

function animateCameraTo(targetPos, lookAtTarget, duration = 750) {
  cameraAnim.active = true;
  cameraAnim.startPos.copy(camera.position);
  cameraAnim.endPos.copy(targetPos);
  cameraAnim.startTarget.copy(controls.target);
  cameraAnim.endTarget.copy(lookAtTarget);
  cameraAnim.startTime = performance.now();
  cameraAnim.duration = duration;
}

function updateMaterialHighlightStates() {
  const focusedOrg = state.focusedOrganelle;
  const focusedSub = state.focusedSubstructure;

  interactiveMeshes.forEach((mesh) => {
    const orgId = mesh.userData.orgId;
    const subId = mesh.userData.subId;

    // First check secondary visibility rule
    if (SECONDARY_ORGANELLES.has(orgId)) {
      mesh.visible = isOrganelleVisibleInScene(orgId);
      if (!mesh.visible) return;
    }

    const mat = mesh.material;
    if (!mat) return;

    if (!focusedOrg) {
      // Overview mode: restore all materials to vibrant base appearance
      mat.opacity = mesh.userData.baseOpacity;
      mat.transparent = mesh.userData.baseTransparent;
      mat.depthWrite = mesh.userData.baseDepthWrite;
      if (mat.emissive) {
        mat.emissive.copy(mesh.userData.baseEmissive);
        mat.emissiveIntensity = mesh.userData.baseEmissiveIntensity;
      }
    } else if (orgId === focusedOrg) {
      // Selected organelle!
      if (focusedSub && subId && subId !== focusedSub) {
        // Dim other substructures within the same organelle slightly so the chosen substructure pops
        mat.transparent = true;
        mat.opacity = Math.min(mesh.userData.baseOpacity, 0.35);
        if (mat.emissive) {
          mat.emissive.copy(mesh.userData.baseEmissive);
          mat.emissiveIntensity = mesh.userData.baseEmissiveIntensity;
        }
      } else {
        // Active organelle (or active substructure) -> clear, crisp highlight without washing out edges
        mat.opacity = mesh.userData.baseOpacity;
        mat.transparent = mesh.userData.baseTransparent;
        mat.depthWrite = mesh.userData.baseDepthWrite;
        if (mat.emissive) {
          if (orgId === 'mitochondria') {
            // Use subtle amber rim emissive for mitochondria so internal cristae geometry stays sharp and clear
            mat.emissive.setHex(focusedSub === subId ? 0x78350f : 0x221100);
            mat.emissiveIntensity = focusedSub === subId ? 0.35 : 0.12;
          } else {
            mat.emissive.copy(mesh.userData.baseColor);
            mat.emissiveIntensity = focusedSub === subId ? 0.45 : 0.22;
          }
        }
      }
    } else {
      // Unselected organelles: ghost them to semi-transparent so the focused structure stands out clearly!
      mat.transparent = true;
      mat.opacity = Math.min(mesh.userData.baseOpacity * 0.16, 0.14);
      mat.depthWrite = false;
      if (mat.emissive) {
        mat.emissiveIntensity = 0;
      }
    }
  });

  // Update active states in sidebar & 3D pins
  document.querySelectorAll('.org-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.org === focusedOrg);
  });
  pinAnchors.forEach((pin) => {
    pin.element.classList.toggle('active', pin.orgId === focusedOrg);
  });
}

function focusOrganelle(orgId, preferredGroup = null, localFocusPos = null) {
  const info = ORGANELLE_DB[orgId];
  if (!info) return;

  // If user selects a plant-only organelle while in animal mode, switch to plant mode automatically
  if (info.presence === 'plant' && state.cellMode === 'animal') {
    setCellMode('plant', false);
  } else if (info.presence === 'animal' && state.cellMode === 'plant') {
    setCellMode('animal', false);
  }

  state.focusedOrganelle = orgId;
  state.focusedSubstructure = null;

  // If focusing on an internal organelle while cell shell is completely closed, open 1/4 cutaway so it's visible
  if (orgId !== 'cellWall' && orgId !== 'cellMembrane' && state.cellCutMode === 'full') {
    setCellCutMode('wedge');
  }
  // If focusing on cuttable organelle (mitochondria, chloroplast, nucleus), ensure internal cut is active
  if ((orgId === 'mitochondria' || orgId === 'chloroplast' || orgId === 'nucleus') && state.orgCutMode === 'full') {
    setOrgCutMode('cut');
  }

  updateMaterialHighlightStates();
  updateInfoPanel(orgId);

  // Determine 3D world target to zoom camera into
  let targetPin = null;
  if (preferredGroup && localFocusPos) {
    targetPin = { group: preferredGroup, localPos: localFocusPos };
  } else {
    const activeCellType = state.cellMode === 'plant' ? 'plant' : 'animal';
    targetPin = pinAnchors.find((p) => p.orgId === orgId && p.cellType === activeCellType)
      || pinAnchors.find((p) => p.orgId === orgId);
  }

  if (targetPin) {
    const worldCenter = targetPin.localPos.clone().add(targetPin.group.position);
    // Calculate an ideal viewing angle looking into the cutaway quadrant (+X, +Y, +Z)
    let camDistance = 5.4;
    if (orgId === 'mitochondria' || orgId === 'chloroplast' || orgId === 'centrosome' || orgId === 'lysosome') {
      camDistance = 3.8;
    } else if (orgId === 'cellWall' || orgId === 'cellMembrane' || orgId === 'cytoplasm') {
      camDistance = 12.5;
    } else if (orgId === 'vacuole' || orgId === 'nucleus') {
      camDistance = 5.6;
    }

    const offsetDir = new THREE.Vector3(0.68, 0.52, 0.78).normalize();
    const camEnd = worldCenter.clone().addScaledVector(offsetDir, camDistance);
    animateCameraTo(camEnd, worldCenter, 800);
  }
}

function resetToOverview() {
  state.focusedOrganelle = null;
  state.focusedSubstructure = null;
  updateMaterialHighlightStates();
  updateInfoPanel(null);

  if (state.cellMode === 'compare') {
    animateCameraTo(new THREE.Vector3(0, 14.5, 24.5), new THREE.Vector3(0, -0.3, 0), 750);
  } else {
    animateCameraTo(new THREE.Vector3(11.5, 9.2, 13.5), new THREE.Vector3(0, -0.2, 0), 750);
  }
}

// ============================================================================
// 11. UI PANEL & SIDEBAR RENDERERS
// ============================================================================
function renderOrganelleSidebar() {
  const listEl = document.getElementById('organelleList');
  listEl.innerHTML = '';

  ORGANELLE_ORDER.forEach((orgId) => {
    const item = ORGANELLE_DB[orgId];
    // Filter out inapplicable organelles unless in compare mode
    if (state.cellMode === 'animal' && item.presence === 'plant') return;
    if (state.cellMode === 'plant' && item.presence === 'animal') return;

    const btn = document.createElement('button');
    btn.className = 'org-item' + (state.focusedOrganelle === orgId ? ' active' : '');
    btn.dataset.org = orgId;

    let tagHtml = '';
    if (orgId === 'mitochondria' || orgId === 'chloroplast' || orgId === 'nucleus') {
      tagHtml = `<span class="org-tag tag-cuttable">🔪 可切開</span>`;
    } else if (item.presence === 'plant') {
      tagHtml = `<span class="org-tag tag-plant">植物特有</span>`;
    } else if (item.presence === 'animal') {
      tagHtml = `<span class="org-tag tag-animal">動物特有</span>`;
    }

    btn.innerHTML = `
      <div class="org-item-left">
        <span class="org-swatch" style="background:${item.color}; box-shadow:0 0 8px ${item.color}"></span>
        <div class="org-names">
          <span class="org-zh">${item.zh}</span>
          <span class="org-en">${item.en}</span>
        </div>
      </div>
      ${tagHtml}
    `;

    btn.addEventListener('click', () => {
      if (state.focusedOrganelle === orgId) {
        resetToOverview();
      } else {
        focusOrganelle(orgId);
      }
    });

    listEl.appendChild(btn);
  });
}

function updateInfoPanel(orgId) {
  const badgeEl = document.getElementById('infoBadge');
  const titleEl = document.getElementById('infoTitle');
  const subEl = document.getElementById('infoSubtitle');
  const descEl = document.getElementById('infoDesc');
  const distEl = document.getElementById('infoDistribution');
  const memEl = document.getElementById('infoMembrane');
  const funcEl = document.getElementById('infoFunction');
  const subBox = document.getElementById('substructureBox');
  const chipsContainer = document.getElementById('substructureChips');
  const subDetailEl = document.getElementById('substructureDetail');

  if (!orgId) {
    // Overview info based on cellMode
    if (state.cellMode === 'animal') {
      badgeEl.textContent = '真核生物 · 動物細胞總覽';
      titleEl.textContent = '動物細胞 (Animal Cell)';
      subEl.textContent = 'Eukaryotic Animal Cell';
      descEl.textContent = '動物細胞外覆柔軟的雙層磷脂細胞膜，無細胞壁與葉綠體。內部具有雙層膜的細胞核與粒線體（能量發電廠），以及粗糙/平滑內質網、高基氏體、溶體與中心體（9×3 微管束，協助細胞分裂）。';
      distEl.textContent = '多細胞動物體組織';
      memEl.textContent = '無細胞壁，最外層為細胞膜';
      funcEl.textContent = '異營生活、高靈活度與分工特化';
    } else if (state.cellMode === 'plant') {
      badgeEl.textContent = '真核生物 · 植物細胞總覽';
      titleEl.textContent = '植物細胞 (Plant Cell)';
      subEl.textContent = 'Eukaryotic Plant Cell';
      descEl.textContent = '植物細胞最外層有堅韌的纖維素「細胞壁」維持多邊形柱狀結構。內部除了細胞核與粒線體外，更擁有進行光合作用的「葉綠體」（內含類囊體堆疊成的葉綠餅）與佔據大部分體積的「中央大液泡」維持膨壓。';
      distEl.textContent = '綠色植物葉肉與組織';
      memEl.textContent = '具纖維素細胞壁 ＋ 細胞膜';
      funcEl.textContent = '自營光合作用、膨壓支撐植物體';
    } else {
      badgeEl.textContent = '動植物細胞並排比較';
      titleEl.textContent = '動物 vs. 植物細胞比較';
      subEl.textContent = 'Animal Cell vs. Plant Cell';
      descEl.textContent = '左側為圓潤的「動物細胞」（具中心體、溶體，無細胞壁與葉綠體）；右側為多角柱狀的「植物細胞」（具細胞壁、葉綠體與巨大中央液泡）。兩者皆擁有細胞核、粒線體、內質網、高基氏體與核糖體！';
      distEl.textContent = '共同胞器：核、粒線體、內質網、高基氏體';
      memEl.textContent = '差異：植物有細胞壁/葉綠體/大液泡；動物有中心粒/溶體';
      funcEl.textContent = '點擊任一胞器可同步高亮兩細胞中的對應構造';
    }

    // Show quick substructure shortcuts for Mitochondria & Chloroplast even in overview
    subBox.style.display = 'flex';
    chipsContainer.innerHTML = '';
    const quickTargets = [
      { label: '⚡ 粒線體：內膜皺摺 (Cristae)', org: 'mitochondria', sub: 'mitoCristae' },
      { label: '⚡ 粒線體：基質與環狀 DNA', org: 'mitochondria', sub: 'mitoMatrix' },
      { label: '🌿 葉綠體：類囊體與葉綠餅', org: 'chloroplast', sub: 'thylakoidGrana' },
      { label: '🧬 細胞核：核仁與染色質', org: 'nucleus', sub: 'nucleolus' }
    ];
    quickTargets.forEach((qt) => {
      const chip = document.createElement('button');
      chip.className = 'sub-chip';
      chip.textContent = qt.label;
      chip.addEventListener('click', () => {
        focusOrganelle(qt.org);
        selectSubstructure(qt.sub);
      });
      chipsContainer.appendChild(chip);
    });
    subDetailEl.textContent = '💡 點擊上方快捷標籤或左側胞器列表，即可拉近鏡頭、切開外膜並單獨發光標示內部立體微構造。';
    return;
  }

  const info = ORGANELLE_DB[orgId];
  badgeEl.textContent = info.badge;
  titleEl.textContent = info.zh;
  subEl.textContent = info.en;
  descEl.textContent = info.desc;
  distEl.textContent = info.distribution;
  memEl.textContent = info.membrane;
  funcEl.textContent = info.func;

  if (info.substructures && info.substructures.length > 0) {
    subBox.style.display = 'flex';
    chipsContainer.innerHTML = '';
    info.substructures.forEach((sub) => {
      const chip = document.createElement('button');
      chip.className = 'sub-chip' + (state.focusedSubstructure === sub.id ? ' active' : '');
      chip.textContent = sub.zh;
      chip.addEventListener('click', () => {
        selectSubstructure(sub.id);
      });
      chipsContainer.appendChild(chip);
    });

    const activeSubObj = info.substructures.find((s) => s.id === state.focusedSubstructure) || info.substructures[0];
    subDetailEl.textContent = activeSubObj.desc;
  } else {
    subBox.style.display = 'none';
  }
}

function selectSubstructure(subId) {
  if (state.focusedSubstructure === subId) {
    state.focusedSubstructure = null;
  } else {
    state.focusedSubstructure = subId;
  }
  updateMaterialHighlightStates();
  updateInfoPanel(state.focusedOrganelle);
}

// ============================================================================
// 12. MODE SWITCHING & UI EVENT HANDLERS
// ============================================================================
function setCellMode(mode, moveCam = true) {
  state.cellMode = mode;

  document.querySelectorAll('.mode-tab').forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (mode === 'animal') {
    animalGroup.visible = true;
    plantGroup.visible = false;
    animalGroup.position.set(0, 0, 0);
  } else if (mode === 'plant') {
    animalGroup.visible = false;
    plantGroup.visible = true;
    plantGroup.position.set(0, 0, 0);
  } else {
    // Compare side-by-side
    animalGroup.visible = true;
    plantGroup.visible = true;
    animalGroup.position.set(-6.8, 0, 0);
    plantGroup.position.set(6.8, 0, 0);
  }

  updateCutawayPlanes();
  renderOrganelleSidebar();

  if (moveCam) {
    resetToOverview();
  }
}

function setCellCutMode(cutMode) {
  state.cellCutMode = cutMode;
  document.querySelectorAll('#cellCutGroup .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cellCut === cutMode);
  });
  if (cutMode !== 'full' && state.cutRatio < 0.2) {
    state.cutRatio = 1.0;
    document.getElementById('cutSlider').value = 100;
    document.getElementById('cutRatioLabel').textContent = '100%';
  }
  updateCutawayPlanes();
}

function setOrgCutMode(orgCutMode) {
  state.orgCutMode = orgCutMode;
  document.querySelectorAll('#orgCutGroup .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.orgCut === orgCutMode);
  });
  if (orgCutMode === 'cut' && state.cutRatio < 0.2) {
    state.cutRatio = 1.0;
    document.getElementById('cutSlider').value = 100;
    document.getElementById('cutRatioLabel').textContent = '100%';
  }
  updateCutawayPlanes();
}

// Bind Top Mode Tabs
document.querySelectorAll('.mode-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    setCellMode(tab.dataset.mode, true);
  });
});

// Bind Overview Reset Button
document.getElementById('btnOverview').addEventListener('click', () => {
  resetToOverview();
});

// Bind Cell Cutaway Segmented Buttons
document.querySelectorAll('#cellCutGroup .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setCellCutMode(btn.dataset.cellCut);
  });
});

// Bind Organelle Internal Cutaway Segmented Buttons
document.querySelectorAll('#orgCutGroup .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setOrgCutMode(btn.dataset.orgCut);
  });
});

// Bind Continuous Cut Slider
const cutSlider = document.getElementById('cutSlider');
const cutRatioLabel = document.getElementById('cutRatioLabel');
cutSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.cutRatio = val / 100;
  cutRatioLabel.textContent = `${val}%`;
  updateCutawayPlanes();
});

// Bind Quick Toggles
const btnToggleLabels = document.getElementById('btnToggleLabels');
btnToggleLabels.addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  btnToggleLabels.classList.toggle('active', state.showLabels);
  labelsLayer.style.display = state.showLabels ? 'block' : 'none';
});

const btnToggleRotate = document.getElementById('btnToggleRotate');
btnToggleRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  btnToggleRotate.classList.toggle('active', state.autoRotate);
});

const btnToggleSecondary = document.getElementById('btnToggleSecondary');
if (btnToggleSecondary) {
  btnToggleSecondary.addEventListener('click', () => {
    state.showSecondary = !state.showSecondary;
    updateOrganelleVisibility();
    updateMaterialHighlightStates();
    renderOrganelleSidebar();
  });
}

document.getElementById('btnQuickMito').addEventListener('click', () => {
  setOrgCutMode('cut');
  focusOrganelle('mitochondria');
});

document.getElementById('btnQuickChloro').addEventListener('click', () => {
  setOrgCutMode('cut');
  focusOrganelle('chloroplast');
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    resetToOverview();
  } else if (e.key === 'l' || e.key === 'L') {
    btnToggleLabels.click();
  } else if (e.key === 'r' || e.key === 'R') {
    btnToggleRotate.click();
  }
});

// ============================================================================
// 13. RAYCASTING (CLICK TO FOCUS & HOVER TOOLTIP)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

function getVisibleMeshesForPicking() {
  return interactiveMeshes.filter((mesh) => {
    if (!mesh.visible) return false;
    // Check parent visibility (animalGroup vs plantGroup)
    let p = mesh.parent;
    while (p) {
      if (p.visible === false) return false;
      p = p.parent;
    }
    return true;
  });
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
});

let lastPointerMoveTime = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  const now = performance.now();
  // Throttle raycast picking to at most once every 32ms (~30fps check) while maintaining 60fps rendering
  if (now - lastPointerMoveTime < 32) return;
  lastPointerMoveTime = now;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const candidates = getVisibleMeshesForPicking();
  const hits = raycaster.intersectObjects(candidates, false);

  // Filter out hits that are clipped by Three.js clippingPlanes
  let validHit = null;
  for (const hit of hits) {
    const mat = hit.object.material;
    if (mat && mat.clippingPlanes && mat.clippingPlanes.length > 0) {
      const planes = mat.clippingPlanes;
      if (mat.clipIntersection) {
        // Clipped only if inside all planes' negative half-space
        const clipped = planes.every((pl) => pl.distanceToPoint(hit.point) < 0);
        if (clipped) continue;
      } else {
        const clipped = planes.some((pl) => pl.distanceToPoint(hit.point) < 0);
        if (clipped) continue;
      }
    }
    validHit = hit;
    break;
  }

  if (validHit && validHit.object.userData.orgId) {
    const orgId = validHit.object.userData.orgId;
    const subId = validHit.object.userData.subId;
    const info = ORGANELLE_DB[orgId];
    let subText = '';
    if (subId && info.substructures) {
      const subObj = info.substructures.find((s) => s.id === subId);
      if (subObj) subText = ` · ${subObj.zh.split(' ')[0]}`;
    }
    hoverTooltip.textContent = `${info.zh}${subText}`;
    hoverTooltip.style.left = `${e.clientX}px`;
    hoverTooltip.style.top = `${e.clientY}px`;
    hoverTooltip.classList.remove('hidden');
    container.style.cursor = 'pointer';
  } else {
    hoverTooltip.classList.add('hidden');
    container.style.cursor = 'grab';
  }
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  if (Math.hypot(dx, dy) > 6) return; // Ignore drag gestures

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const candidates = getVisibleMeshesForPicking();
  const hits = raycaster.intersectObjects(candidates, false);

  let validHit = null;
  for (const hit of hits) {
    const mat = hit.object.material;
    if (mat && mat.clippingPlanes && mat.clippingPlanes.length > 0) {
      const planes = mat.clippingPlanes;
      if (mat.clipIntersection) {
        if (planes.every((pl) => pl.distanceToPoint(hit.point) < 0)) continue;
      } else {
        if (planes.some((pl) => pl.distanceToPoint(hit.point) < 0)) continue;
      }
    }
    // Prefer internal organelles over cytoplasm bowl when clicking inside the cell
    if (hit.object.userData.orgId === 'cytoplasm' && hits.length > 1) {
      continue;
    }
    validHit = hit;
    break;
  }

  if (validHit && validHit.object.userData.orgId) {
    const orgId = validHit.object.userData.orgId;
    const subId = validHit.object.userData.subId;

    // Find which top-level cell group was clicked
    let rootGroup = animalGroup;
    let p = validHit.object.parent;
    while (p) {
      if (p === plantGroup) {
        rootGroup = plantGroup;
        break;
      }
      p = p.parent;
    }

    focusOrganelle(orgId, rootGroup);
    if (subId && (orgId === 'mitochondria' || orgId === 'chloroplast' || orgId === 'nucleus')) {
      state.focusedSubstructure = subId;
      updateMaterialHighlightStates();
      updateInfoPanel(orgId);
    }
  }
});

// ============================================================================
// 14. 3D FLOATING PIN PROJECTION & ANIMATION LOOP
// ============================================================================
const tempProjVec = new THREE.Vector3();

function updatePinLabels() {
  if (!state.showLabels) return;

  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;

  pinAnchors.forEach((pin) => {
    // Check if the pin's cell group is currently visible
    const isVisibleGroup = (state.cellMode === 'compare') ||
      (state.cellMode === 'animal' && pin.cellType === 'animal') ||
      (state.cellMode === 'plant' && pin.cellType === 'plant');

    if (!isVisibleGroup || !isOrganelleVisibleInScene(pin.orgId)) {
      pin.element.style.display = 'none';
      return;
    }

    // In side-by-side compare mode, show hero labels + key differences to avoid clutter
    if (state.cellMode === 'compare' && !pin.isHero &&
        pin.orgId !== 'cellWall' && pin.orgId !== 'centrosome' && pin.orgId !== 'lysosome') {
      if (state.focusedOrganelle !== pin.orgId) {
        pin.element.style.display = 'none';
        return;
      }
    }

    tempProjVec.copy(pin.localPos).applyMatrix4(pin.group.matrixWorld);
    tempProjVec.project(camera);

    if (tempProjVec.z > 1.0) {
      pin.element.style.display = 'none';
      return;
    }

    const sx = tempProjVec.x * halfW + halfW;
    const sy = -tempProjVec.y * halfH + halfH;

    // Hide pins that overlap with left/right sidebars
    if (sx < 270 || sx > window.innerWidth - 325 || sy < 95 || sy > window.innerHeight - 95) {
      if (state.focusedOrganelle !== pin.orgId) {
        pin.element.style.display = 'none';
        return;
      }
    }

    pin.element.style.display = 'inline-flex';
    pin.element.style.left = `${sx}px`;
    pin.element.style.top = `${sy}px`;
  });
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

let lastPinUpdateTime = 0;
function animate(now) {
  requestAnimationFrame(animate);

  // Smooth Camera Focus Interpolation
  if (cameraAnim.active) {
    const elapsed = now - cameraAnim.startTime;
    const t = Math.min(1, elapsed / cameraAnim.duration);
    const k = easeOutCubic(t);

    camera.position.lerpVectors(cameraAnim.startPos, cameraAnim.endPos, k);
    controls.target.lerpVectors(cameraAnim.startTarget, cameraAnim.endTarget, k);

    if (t >= 1) {
      cameraAnim.active = false;
    }
  }

  // Optional Auto-Rotate
  if (state.autoRotate && !cameraAnim.active) {
    const rotSpeed = 0.0035;
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotSpeed);
    camera.position.copy(controls.target).add(offset);
  }

  // Subtle biological breathing / pulsing on highlighted organelle (calibrated so cristae edges remain distinct)
  if (state.focusedOrganelle) {
    const isMito = state.focusedOrganelle === 'mitochondria';
    const pulseBase = isMito ? 0.12 : 0.22;
    const pulseAmp = isMito ? 0.08 : 0.15;
    const pulse = pulseBase + pulseAmp * Math.sin(now * 0.005);

    const meshes = organelleMeshesMap.get(state.focusedOrganelle) || [];
    meshes.forEach((m) => {
      if (m.material && m.material.emissive) {
        if (!state.focusedSubstructure || m.userData.subId === state.focusedSubstructure) {
          m.material.emissiveIntensity = pulse + (state.focusedSubstructure ? (isMito ? 0.18 : 0.22) : 0);
        }
      }
    });
  }

  // Ambient particle drift
  bgParticles.rotation.y = now * 0.00005;

  controls.update();
  renderer.render(scene, camera);

  // Throttle DOM labels matrix projection to 30fps to avoid DOM layout reflow bottleneck
  if (now - lastPinUpdateTime > 33) {
    lastPinUpdateTime = now;
    updatePinLabels();
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Collapsible panels UI logic
const sidebarLeft = document.getElementById('organelleSidebar');
const panelRight = document.getElementById('infoPanel');
const barBottom = document.getElementById('bottomBar');

const btnCollapseLeft = document.getElementById('btnCollapseLeft');
const btnTriggerLeft = document.getElementById('btnTriggerLeft');
const btnCollapseRight = document.getElementById('btnCollapseRight');
const btnTriggerRight = document.getElementById('btnTriggerRight');
const btnCollapseBottom = document.getElementById('btnCollapseBottom');
const btnTriggerBottom = document.getElementById('btnTriggerBottom');

if (btnCollapseLeft && btnTriggerLeft) {
  btnCollapseLeft.addEventListener('click', () => {
    sidebarLeft.classList.add('collapsed');
    btnTriggerLeft.classList.remove('hidden');
  });
  btnTriggerLeft.addEventListener('click', () => {
    sidebarLeft.classList.remove('collapsed');
    btnTriggerLeft.classList.add('hidden');
  });
}

if (btnCollapseRight && btnTriggerRight) {
  btnCollapseRight.addEventListener('click', () => {
    panelRight.classList.add('collapsed');
    btnTriggerRight.classList.remove('hidden');
  });
  btnTriggerRight.addEventListener('click', () => {
    panelRight.classList.remove('collapsed');
    btnTriggerRight.classList.add('hidden');
  });
}

if (btnCollapseBottom && btnTriggerBottom) {
  btnCollapseBottom.addEventListener('click', () => {
    barBottom.classList.add('collapsed');
    btnTriggerBottom.classList.remove('hidden');
  });
  btnTriggerBottom.addEventListener('click', () => {
    barBottom.classList.remove('collapsed');
    btnTriggerBottom.classList.add('hidden');
  });
}

// Keyboard shortcut: Press 'H' or 'F' to toggle clean full-screen view
window.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') {
    const isAnyOpen = !sidebarLeft.classList.contains('collapsed') ||
                      !panelRight.classList.contains('collapsed') ||
                      !barBottom.classList.contains('collapsed');
    if (isAnyOpen) {
      btnCollapseLeft?.click();
      btnCollapseRight?.click();
      btnCollapseBottom?.click();
    } else {
      btnTriggerLeft?.click();
      btnTriggerRight?.click();
      btnTriggerBottom?.click();
    }
  }
});

// Initialize default view
setCellMode('animal', true);
updateCutawayPlanes();
updateOrganelleVisibility();
requestAnimationFrame(animate);

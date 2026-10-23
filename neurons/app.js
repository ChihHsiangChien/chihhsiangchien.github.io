import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// 1. SCIENTIFIC DATA & ANATOMICAL DIRECTORY
// ============================================================================
const NODE_DATA = {
  overview: {
    zh: '多神經元突觸連結與動器系統',
    en: 'Multi-Neuron Synaptic Network & Effectors',
    badge: '神經傳導網路 · 動器控制',
    color: '#38bdf8',
    tag: '全覽',
    camPos: [0.3, 3.2, 21],
    camTarget: [0.5, 0, 0],
    desc: '神經系統由多個神經元透過「突觸 (Synapse)」彼此串聯與分流。當受器接受刺激後，感覺神經元將動作電位傳入中樞的聯絡神經元群，經整合後分別透過「體運動神經元」引發骨骼肌收縮，或透過「自主運動神經元」促使腺體分泌。',
    signalType: '神經元內：電訊號（動作電位）／ 突觸間：化學訊號（神經傳遞物質）',
    transmitter: '乙醯膽鹼 (ACh)、麩胺酸 (Glutamate)、GABA、正腎上腺素 (NE)',
    effectorRole: '骨骼肌：肌絲滑動產生收縮力量 ／ 腺體：胞吐作用釋放酵素、汗液或激素',
    substructures: [
      { id: 'sensory', label: '🖐️ 感覺受器與感覺神經元', detail: '偵測外界物理或化學刺激，轉換為動作電位並沿偽單極軸突傳入中樞。' },
      { id: 'interneuron', label: '🧠 中樞聯絡神經元群', detail: '位於脊髓與腦部，負責整合、分流或抑制訊號，決定是否啟動肌肉或腺體。' },
      { id: 'somatic', label: '⚡ 體運動神經元', detail: '將中樞指令長距離跳躍傳導至骨骼肌的運動終板（神經肌肉接頭）。' },
      { id: 'autonomic', label: '🌿 自主運動神經元', detail: '支配平滑肌、心肌與各類腺體，調控不受意識直接支配的腺體分泌反應。' },
      { id: 'muscle', label: '💪 骨骼肌動器', detail: '接收運動神經元釋放之乙醯膽鹼 (ACh)，引發肌漿網釋放 Ca²⁺ 使肌纖維收縮。' },
      { id: 'gland', label: '💧 分泌腺體動器', detail: '腺泡細胞接收自主神經訊號後，將分泌囊泡透過胞吐作用排入分泌導管。' }
    ]
  },
  receptor: {
    zh: '感覺受器 (皮膚機械/溫痛覺受器)',
    en: 'Sensory Receptor & Nerve Endings',
    badge: '訊息接收端 · 換能作用',
    color: '#fbbf24',
    tag: '受器',
    labelPos: [-12.8, 2.2, 0],
    camPos: [-11.5, 2.5, 9.5],
    camTarget: [-11.8, 0.4, 0],
    desc: '受器（Receptor）是特化的感覺神經末梢或感覺細胞，能將外界刺激（如觸壓、溫度、疼痛或化學物質）轉換為細胞膜上的「受器電位」。當去極化超過閾值（-55 mV）時，即觸發全有全無的動作電位。',
    signalType: '物理/化學刺激 ➔ 機械敏感離子通道開啟 (Na⁺ 內流) ➔ 動作電位',
    transmitter: '尚未進入突觸（由受器電位直接引發軸突動作電位）',
    effectorRole: '作為反射弧與感覺傳導的第一站，啟動下游肌肉反射或腺體反應',
    substructures: [
      { id: 'receptor_pad', label: '皮膚感覺小體', detail: '由層狀結締組織包覆神經末梢，受壓或受熱時變形並打開 Na⁺ 通道。' },
      { id: 'dendrite_end', label: '感覺樹突末梢', detail: '負責產生去極化受器電位，匯聚至第一個郎氏結引發動作電位。' }
    ]
  },
  sensory: {
    zh: '感覺神經元 (偽單極神經元)',
    en: 'Sensory Neuron (Pseudounipolar)',
    badge: '輸入神經 · 跳躍傳導',
    color: '#38bdf8',
    tag: '感覺神經',
    labelPos: [-8.2, 3.0, 0],
    camPos: [-7.5, 3.0, 10.5],
    camTarget: [-7.8, 0.8, 0],
    desc: '感覺神經元（又稱輸入神經元）負責將受器的神經衝動傳入脊髓與腦部。其典型構造為「偽單極神經元」：細胞體位於側旁的背根神經節中，一條長軸突包覆著許旺細胞形成的髓鞘，於郎氏結間進行高速「跳躍傳導」。',
    signalType: '有髓鞘跳躍傳導 (Saltatory Conduction)，速度可達 70~120 m/s',
    transmitter: '中樞端軸突末梢釋放：麩胺酸 (Glutamate) 或 P物質',
    effectorRole: '將外界刺激精確編碼為「動作電位頻率」，通知中樞聯絡神經元',
    substructures: [
      { id: 'drg_soma', label: '背根神經節細胞體', detail: '位於軸突側旁，內含大型細胞核與尼氏體，負責合成蛋白質與維持軸突代謝。' },
      { id: 'myelin', label: '許旺細胞髓鞘', detail: '由富含脂質的多層細胞膜包繞軸突，具電絕緣作用，防止電流外漏。' },
      { id: 'ranvier', label: '郎氏結 (Node of Ranvier)', detail: '髓鞘之間的裸露間隙，聚集高密度電壓閘門型 Na⁺/K⁺ 通道，使動作電位跳躍前進。' }
    ]
  },
  interneuron: {
    zh: '聯絡神經元群 (中樞整合與分流網路)',
    en: 'CNS Interneuron Network (Excitatory & Inhibitory)',
    badge: '中樞整合 · 多神經元連結',
    color: '#c084fc',
    tag: '聯絡神經',
    labelPos: [-2.0, 3.8, 0],
    camPos: [-1.8, 2.2, 11.0],
    camTarget: [-1.8, 0.3, 0],
    desc: '聯絡神經元（Interneurons）完全位於中樞神經系統（腦與脊髓）內，數量佔人體神經元 99% 以上。多個聯絡神經元彼此形成複雜突觸網路，能將單一感覺輸入「分流 (Divergence)」至體運動神經與自主神經，也能透過抑制性神經元 (GABA) 進行煞車調節。',
    signalType: '興奮性突觸後電位 (EPSP) 與 抑制性突觸後電位 (IPSP) 的空間/時間加成',
    transmitter: '興奮性：麩胺酸 (Glutamate) ／ 抑制性：γ-胺基丁酸 (GABA)、甘胺酸',
    effectorRole: '決定訊號要送往骨骼肌（縮手/運動）、腺體（流汗/分泌唾液）或予以抑制',
    substructures: [
      { id: 'inter_excite', label: '脊髓興奮性聯絡神經元', detail: '接收感覺神經元訊號，快速轉接給體運動神經元以完成脊髓反射弧。' },
      { id: 'inter_auto', label: '自主中樞聯絡神經元', detail: '將訊號分流傳遞至自主運動神經元，協調外分泌或內分泌腺體運作。' },
      { id: 'inter_inhibit', label: '抑制性聯絡神經元 (GABA)', detail: '釋放抑制性神經傳遞物質使下游神經元過極化（Cl⁻ 內流），避免動器過度反應。' }
    ]
  },
  synapse: {
    zh: '突觸與神經肌肉/腺體接頭',
    en: 'Chemical Synapse & Neuromuscular Junction',
    badge: '電訊號 ➔ 化學訊號 ➔ 電訊號',
    color: '#f472b6',
    tag: '突觸傳遞',
    labelPos: [1.2, 1.3, 0],
    camPos: [1.2, 1.4, 6.2],
    camTarget: [1.2, 0.6, 0],
    desc: '突觸（Synapse）是兩個神經元之間、或神經元與動器（肌肉/腺體）之間的微小間隙（約 20~40 nm）。當動作電位抵達軸突末梢時，會開啟電壓敏感型 Ca²⁺ 通道，促使「突觸小泡」與膜融合，將神經傳遞物質釋放至突觸間隙。',
    signalType: '單向傳遞：軸突末梢 (突觸前) ➔ 突觸間隙 ➔ 樹突/動器受體 (突觸後)',
    transmitter: '中樞突觸：Glutamate / GABA；運動終板與腺體：乙醯膽鹼 (ACh)',
    effectorRole: '若突觸受藥物或毒素（如肉毒桿菌素、箭毒、阿托品）阻斷，動器將無法反應',
    substructures: [
      { id: 'presynaptic', label: '軸突末梢 (突觸前部)', detail: '內含大量突觸小泡與粒線體，Ca²⁺ 內流時觸發囊泡胞吐作用。' },
      { id: 'cleft', label: '突觸間隙與傳遞物質', detail: '神經傳遞物質以擴散方式跨越間隙，與突觸後膜上的特異性受體結合。' },
      { id: 'postsynaptic', label: '突觸後受體', detail: '結合傳遞物質後開啟化學閘門離子通道，在下一顆神經元或動器上產生新電位。' }
    ]
  },
  somatic: {
    zh: '體運動神經元 (支配骨骼肌)',
    en: 'Somatic Motor Neuron',
    badge: '輸出神經 · 隨意與反射運動',
    color: '#fb7185',
    tag: '體運動神經',
    labelPos: [4.6, 4.3, 0],
    camPos: [5.0, 3.2, 10.5],
    camTarget: [5.0, 2.0, 0],
    desc: '體運動神經元（Somatic Motor Neuron）的細胞體位於脊髓腹角或腦幹，具有發達的樹突接收來自聯絡神經元與大腦皮質的指令。其長軸突包覆厚實髓鞘，末端分支形成「運動終板」，直接控制骨骼肌纖維的收縮。',
    signalType: '高頻動作電位脈衝列 ➔ 決定骨骼肌單次抽動 (Twitch) 或強直收縮 (Tetanus)',
    transmitter: '乙醯膽鹼 (Acetylcholine, ACh) ── 作用於骨骼肌菸鹼型受體 (nAChR)',
    effectorRole: '精準控制骨骼肌動器收縮與舒張，帶動骨骼槓桿產生肢體運動',
    substructures: [
      { id: 'motor_soma', label: '多極細胞體與樹突', detail: '星狀多極構造，整合上游數百個突觸的興奮與抑制訊號。' },
      { id: 'motor_axon', label: '有髓鞘運動軸突', detail: '高速傳導運動指令，確保反射與隨意運動零延遲。' },
      { id: 'nmj', label: '運動終板 (神經肌肉接頭)', detail: '軸突末梢貼附於肌纖維膜（肌膜）上的特化突觸構造。' }
    ]
  },
  autonomic: {
    zh: '自主運動神經元 (支配分泌腺體)',
    en: 'Autonomic Motor Pathway',
    badge: '輸出神經 · 內臟與腺體調控',
    color: '#2dd4bf',
    tag: '自主神經',
    labelPos: [4.6, -1.6, 0],
    camPos: [5.0, -2.2, 10.5],
    camTarget: [5.0, -2.5, 0],
    desc: '自主運動神經路徑（交感與副交感神經）負責調節不受意識直接控制的動器，包括外分泌腺（唾腺、汗腺、消化腺）、內分泌腺、平滑肌與心肌。軸突末端呈念珠狀膨大（Varicosities），廣泛釋放傳遞物質刺激腺泡細胞。',
    signalType: '自主神經節傳導 ➔ 神經腺體接頭 (Neuroglandular Junction) 化學釋放',
    transmitter: '乙醯膽鹼 (ACh，作用於蕈毒鹼型受體 mAChR) 或 正腎上腺素 (NE)',
    effectorRole: '啟動腺體細胞內第二傳訊者 (IP₃ / Ca²⁺ / cAMP)，促進腺體分泌液滴',
    substructures: [
      { id: 'auto_soma', label: '自主神經節細胞體', detail: '接收中樞節前神經訊號，換元後發出節後軸突通往腺體動器。' },
      { id: 'varicosities', label: '神經腺體終末膨大', detail: '包繞於腺泡外圍，釋放神經傳遞物質覆蓋整個腺體細胞群。' }
    ]
  },
  muscle: {
    zh: '動器一：骨骼肌束與關節槓桿',
    en: 'Effector 1: Skeletal Muscle & Biomechanical Lever',
    badge: '運動動器 · 興奮-收縮耦聯',
    color: '#f43f5e',
    tag: '肌肉動器',
    labelPos: [10.8, 4.5, 0],
    camPos: [10.8, 3.0, 9.5],
    camTarget: [10.8, 2.2, 0],
    desc: '骨骼肌是最具代表性的運動動器（Effector）。當運動終板釋放乙醯膽鹼 (ACh) 引發肌膜動作電位後，訊號經橫小管 (T-tubule) 傳入肌漿網並釋放大量 Ca²⁺，使肌動蛋白 (Actin) 與肌凝蛋白 (Myosin) 橫橋滑動，導致肌節縮短、肌腹隆起並拉動骨骼彎曲！',
    signalType: '肌膜動作電位 ➔ 肌漿網釋放 Ca²⁺ ➔ 粗細肌絲滑動收縮 (Sliding Filament)',
    transmitter: '接收乙醯膽鹼 (ACh)；若被肉毒桿菌素或箭毒阻斷則肌肉麻痺無法收縮',
    effectorRole: '產生機械張力（單次抽動 Twitch ➔ 強直收縮 Tetanus），執行縮手或舉臂動作',
    substructures: [
      { id: 'muscle_fibers', label: '橫紋肌纖維束 (肌節)', detail: '由明帶 (I band) 與暗帶 (A band) 交錯排列，收縮時 Z 線彼此靠近使肌纖維縮短變粗。' },
      { id: 'tendon_bone', label: '肌腱與骨骼關節槓桿', detail: '肌纖維兩端透過緻密肌腱附著於骨骼，肌肉收縮時牽動前臂骨骼向上彎曲。' }
    ]
  },
  gland: {
    zh: '動器二：分泌腺體 (外分泌/內分泌腺泡)',
    en: 'Effector 2: Secretory Acinar Gland',
    badge: '分泌動器 · 囊泡胞吐作用',
    color: '#14b8a6',
    tag: '腺體動器',
    labelPos: [10.8, -1.2, 0],
    camPos: [10.8, -2.4, 9.2],
    camTarget: [10.8, -2.8, 0],
    desc: '腺體（Gland）是另一大類重要動器，包含外分泌腺（如唾腺、汗腺、胃腺、淚腺）與內分泌腺（如腎上腺髓質）。當自主運動神經元釋放神經傳遞物質結合至腺泡細胞受體後，細胞內 Ca²⁺ 濃度上升，驅動高基氏體合成的「分泌囊泡」移向頂端膜並進行胞吐作用（Exocytosis），釋出消化酵素、汗液或激素！',
    signalType: '受體活化 ➔ 胞內 Ca²⁺ / cAMP 訊號級聯 ➔ 分泌囊泡胞吐釋放',
    transmitter: '接收乙醯膽鹼 (ACh) 或正腎上腺素；阿托品 (Atropine) 可阻斷此突觸導致口乾少汗',
    effectorRole: '將酵素、黏液、汗水或荷爾蒙排入分泌導管或微血管，調節生理恆定',
    substructures: [
      { id: 'acinar_cells', label: '葡萄狀腺泡細胞群', detail: '富含粗糙內質網與高基氏體，內部儲存大量待命的分泌顆粒與囊泡。' },
      { id: 'secretory_duct', label: '分泌導管與分泌液滴', detail: '收集腺泡細胞胞吐釋放的液滴（唾液、汗液或酵素）並輸送至目標腔室。' }
    ]
  }
};

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================
const state = {
  pathway: 'dual',           // 'dual' | 'reflex' | 'autonomic' | 'synapse'
  selectedNode: 'overview',
  myelinated: true,          // true = fast saltatory, false = slow continuous
  synapseGate: 'normal',     // 'normal' | 'block-muscle' | 'block-gland' | 'inhibit-cns'
  stimFrequency: 0,          // 0 to 10 Hz continuous stimulation
  showLabels: true,
  autoRotate: false,
  holdMuscle: false,
  holdGland: false,

  // Real-time physiological dynamics
  muscleTension: 0,          // 0.0 to 1.0
  muscleTarget: 0,
  glandSecretion: 0,         // 0.0 to 1.0
  glandTarget: 0,
  membraneVoltage: -70,      // -80 to +35 mV
  apPhase: 0,                // 0 = resting, >0 = active action potential wave

  // Active signal pulses traveling along curves
  pulses: [],
  // Active neurotransmitter burst particles at synapses
  synapseBursts: [],
  // Active secretory droplets leaving the gland duct
  glandDroplets: [],
  // Active Ca2+ sparks on muscle
  muscleSparks: [],

  // Highlighted group for substructure flash
  flashTimer: 0,
  flashKey: null
};

// ============================================================================
// 3. THREE.JS SCENE, CAMERA & RENDERER SETUP
// ============================================================================
const container = document.getElementById('canvas-container');
const labelsLayer = document.getElementById('labels-layer');
const tooltipEl = document.getElementById('hover-tooltip');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060913, 0.015);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0.3, 3.2, 21);

const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 1.5, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 42;
controls.minDistance = 4;
controls.target.set(0.5, 0, 0);

// Smooth camera transition targets
const camAnim = {
  active: false,
  pos: new THREE.Vector3(0.3, 3.2, 21),
  target: new THREE.Vector3(0.5, 0, 0)
};

// Lighting
const ambientLight = new THREE.AmbientLight(0x8bb8ff, 0.65);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
keyLight.position.set(10, 18, 16);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
rimLight.position.set(-14, -10, -10);
scene.add(rimLight);

const warmLight = new THREE.PointLight(0xf43f5e, 1.2, 22);
warmLight.position.set(11, 3.5, 4);
scene.add(warmLight);

const glandLight = new THREE.PointLight(0x2dd4bf, 1.2, 22);
glandLight.position.set(11, -3.5, 4);
scene.add(glandLight);

// Subtle background neural matrix grid & ambient floating ions
const bgGroup = new THREE.Group();
scene.add(bgGroup);
{
  const gridHelper = new THREE.GridHelper(44, 44, 0x1e3a8a, 0x0f172a);
  gridHelper.position.y = -6.2;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  bgGroup.add(gridHelper);

  // Floating background bio-ions
  const ionGeo = new THREE.BufferGeometry();
  const ionCount = 240;
  const positions = new Float32Array(ionCount * 3);
  for (let i = 0; i < ionCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 3;
  }
  ionGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ionMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.11,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const ions = new THREE.Points(ionGeo, ionMat);
  bgGroup.add(ions);
}

// ============================================================================
// 4. PROCEDURAL 3D NEURAL NETWORK & EFFECTORS BUILDER
// ============================================================================
const pickableMeshes = [];
const nodeGroups = {};
const subGroups = {};
const myelinMeshes = [];
const paths = {}; // CatmullRomCurve3 signal pathways

function registerPickable(mesh, nodeKey, subKey = null) {
  mesh.userData.nodeKey = nodeKey;
  if (subKey) {
    mesh.userData.subKey = subKey;
    if (!subGroups[subKey]) subGroups[subKey] = [];
    subGroups[subKey].push(mesh);
  }
  pickableMeshes.push(mesh);
}

// Helper to create organic tube along points
function createTube(points, radius, material, nodeKey, subKey = null, tubularSegments = 48) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  const mesh = new THREE.Mesh(geo, material);
  registerPickable(mesh, nodeKey, subKey);
  return { mesh, curve };
}

// Helper to add myelin sheath segments along a curve
function addMyelinAlongCurve(parentGroup, curve, count, radius, nodeKey, tStart = 0.12, tEnd = 0.88) {
  const myelinMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    roughness: 0.28,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92
  });

  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.3
  });

  const span = (tEnd - tStart) / count;
  for (let i = 0; i < count; i++) {
    const segStart = tStart + i * span + span * 0.08;
    const segEnd = tStart + (i + 1) * span - span * 0.08;
    const subPts = [];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      subPts.push(curve.getPoint(segStart + (segEnd - segStart) * (s / steps)));
    }
    const segCurve = new THREE.CatmullRomCurve3(subPts);
    const segGeo = new THREE.TubeGeometry(segCurve, 14, radius, 14, false);
    const segMesh = new THREE.Mesh(segGeo, myelinMat);
    registerPickable(segMesh, nodeKey, 'myelin');
    parentGroup.add(segMesh);
    myelinMeshes.push(segMesh);

    // End caps for each Schwann cell segment
    [segStart, segEnd].forEach((tPos) => {
      const pt = curve.getPoint(tPos);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.98, 12, 12), myelinMat);
      cap.position.copy(pt);
      parentGroup.add(cap);
      myelinMeshes.push(cap);
    });

    // Node of Ranvier ring between segments
    if (i < count - 1) {
      const nodeT = tStart + (i + 1) * span;
      const nodePt = curve.getPoint(nodeT);
      const tangent = curve.getTangent(nodeT);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.045, 10, 20), nodeMat);
      ring.position.copy(nodePt);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      registerPickable(ring, nodeKey, 'ranvier');
      parentGroup.add(ring);
    }
  }
}

// Helper to build a multipolar neuron soma with nucleus & radiating dendrites
function createNeuronSoma(position, radius, colorHex, emissiveHex, nodeKey, subKey) {
  const group = new THREE.Group();
  group.position.copy(position);

  // Outer translucent soma membrane
  const somaMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: emissiveHex,
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9
  });
  const somaMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 28), somaMat);
  somaMesh.scale.set(1.12, 0.96, 0.92);
  registerPickable(somaMesh, nodeKey, subKey);
  group.add(somaMesh);

  // Glowing internal nucleus
  const nucMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: colorHex,
    emissiveIntensity: 0.85,
    roughness: 0.3
  });
  const nucMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.46, 20, 20), nucMat);
  registerPickable(nucMesh, nodeKey, subKey);
  group.add(nucMesh);

  return { group, somaMesh, nucMesh };
}

// Helper: tube whose radius tapers from r0 (start) to r1 (end) — gives dendrites
// a thick, smoothly flared base where they emerge from the soma.
function createTaperedTube(points, r0, r1, material, nodeKey, subKey = null, tubularSegments = 20, radialSegments = 8) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, center);
    // Ease-out taper: stays thick near the soma, thins toward the tip
    const r = r1 + (r0 - r1) * Math.pow(1 - t, 1.6);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  registerPickable(mesh, nodeKey, subKey);
  return { mesh, curve };
}

function jitter(amount) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * amount,
    (Math.random() - 0.5) * amount,
    (Math.random() - 0.5) * amount
  );
}

// Helper to add branching dendrites around a soma position.
// Each dendrite starts INSIDE the soma (at its center) with a thick flared base,
// so it is visibly continuous with the cell body; `length` is measured from the soma surface.
function addDendrites(parentGroup, center, directions, length, radius, material, nodeKey, subKey, somaRadius = 0.6) {
  directions.forEach((dir) => {
    const dNorm = dir.clone().normalize();
    const baseR = Math.min(radius * 2.8, somaRadius * 0.38);
    const surface = center.clone().addScaledVector(dNorm, somaRadius * 0.9);

    const p0 = center.clone();
    const p1 = surface.clone().addScaledVector(dNorm, length * 0.45).add(jitter(0.25));
    const p2 = surface.clone().addScaledVector(dNorm, length).add(jitter(0.2));
    const main = createTaperedTube([p0, surface, p1, p2], baseR, radius * 0.45, material, nodeKey, subKey, 22);
    parentGroup.add(main.mesh);

    // Secondary branch sprouting from a point ON the main dendrite (always attached)
    const tBranch = 0.55;
    const branchStart = main.curve.getPointAt(tBranch);
    const branchR = radius * 0.45 + (baseR - radius * 0.45) * Math.pow(1 - tBranch, 1.6);
    const twigDir = dNorm.clone().add(jitter(1.3)).normalize();
    const b1 = branchStart.clone().addScaledVector(twigDir, length * 0.3).add(jitter(0.12));
    const b2 = branchStart.clone().addScaledVector(twigDir, length * 0.6);
    const twig = createTaperedTube([branchStart, b1, b2], branchR * 0.9, radius * 0.3, material, nodeKey, subKey, 12, 6);
    parentGroup.add(twig.mesh);

    // Small terminal fork at the dendrite tip
    const tip = main.curve.getPointAt(1);
    const forkDir = dNorm.clone().add(jitter(1.0)).normalize();
    const fork = createTaperedTube(
      [tip, tip.clone().addScaledVector(forkDir, length * 0.3)],
      radius * 0.45, radius * 0.22, material, nodeKey, subKey, 6, 6
    );
    parentGroup.add(fork.mesh);
  });
}

// Helper: cone-shaped axon hillock joining the soma smoothly to its axon
function addAxonHillock(parentGroup, axonCurve, somaRadius, axonRadius, material, nodeKey, subKey = null) {
  const len = axonCurve.getLength();
  const tEnd = Math.min(0.5, (somaRadius * 1.6) / len);
  const pts = [];
  for (let k = 0; k <= 4; k++) pts.push(axonCurve.getPointAt((k / 4) * tEnd));
  const hill = createTaperedTube(pts, somaRadius * 0.45, axonRadius, material, nodeKey, subKey, 10, 10);
  parentGroup.add(hill.mesh);
}

// Helper to create a glowing synaptic bouton at a terminal point
function createSynapticBouton(position, colorHex, nodeKey, subKey = 'presynaptic') {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.65,
    roughness: 0.25
  });
  const bouton = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), mat);
  bouton.position.copy(position);
  registerPickable(bouton, nodeKey, subKey);
  return bouton;
}

// ----------------------------------------------------------------------------
// 4A. BUILD SENSORY RECEPTOR (皮膚受器)
// ----------------------------------------------------------------------------
const receptorGroup = new THREE.Group();
scene.add(receptorGroup);
nodeGroups.receptor = receptorGroup;

const receptorPadMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  emissive: 0xb45309,
  emissiveIntensity: 0.3,
  roughness: 0.3,
  transparent: true,
  opacity: 0.88
});

// Layered tactile skin disc / corpuscle
const skinPad = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 0.65, 32), receptorPadMat);
skinPad.position.set(-12.8, 0.3, 0);
skinPad.rotation.z = Math.PI * 0.42;
registerPickable(skinPad, 'receptor', 'receptor_pad');
receptorGroup.add(skinPad);

// Concentric Pacinian/tactile lamellae rings
for (let r = 0.55; r <= 1.25; r += 0.35) {
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.3
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.055, 12, 32), ringMat);
  ring.position.set(-12.55, 0.3, 0);
  ring.rotation.y = Math.PI * 0.45;
  registerPickable(ring, 'receptor', 'receptor_pad');
  receptorGroup.add(ring);
}

// Expanding stimulus shockwave ring (animated on stimulus)
const stimWaveGeo = new THREE.RingGeometry(0.3, 0.52, 32);
const stimWaveMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.0
});
const stimWaveMesh = new THREE.Mesh(stimWaveGeo, stimWaveMat);
stimWaveMesh.position.set(-12.4, 0.3, 0);
stimWaveMesh.rotation.y = Math.PI * 0.45;
receptorGroup.add(stimWaveMesh);

// ----------------------------------------------------------------------------
// 4B. BUILD SENSORY NEURON (偽單極感覺神經元 + 背根神經節 + 髓鞘)
// ----------------------------------------------------------------------------
const sensoryGroup = new THREE.Group();
scene.add(sensoryGroup);
nodeGroups.sensory = sensoryGroup;

const sensoryAxonMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 0.35,
  roughness: 0.3
});

// Sensory dendrite endings inside receptor
const sensoryEndings = [
  [new THREE.Vector3(-12.7, 1.0, 0.4), new THREE.Vector3(-12.1, 0.65, 0.2), new THREE.Vector3(-11.5, 0.4, 0)],
  [new THREE.Vector3(-12.8, 0.3, -0.4), new THREE.Vector3(-12.1, 0.32, -0.2), new THREE.Vector3(-11.5, 0.4, 0)],
  [new THREE.Vector3(-12.6, -0.4, 0.2), new THREE.Vector3(-12.0, 0.0, 0.1), new THREE.Vector3(-11.5, 0.4, 0)]
];
sensoryEndings.forEach((pts) => {
  const { mesh } = createTube(pts, 0.075, sensoryAxonMat, 'receptor', 'dendrite_end', 16);
  sensoryGroup.add(mesh);
});

// Main sensory axon curve from receptor (-11.5) to CNS interneuron zone (-3.5)
const sensoryPts = [
  new THREE.Vector3(-11.5, 0.4, 0),
  new THREE.Vector3(-9.8, 0.7, 0.2),
  new THREE.Vector3(-7.8, 0.9, 0.0),
  new THREE.Vector3(-5.8, 0.85, -0.2),
  new THREE.Vector3(-3.8, 0.75, 0)
];
const sensoryAxon = createTube(sensoryPts, 0.14, sensoryAxonMat, 'sensory', null, 64);
sensoryGroup.add(sensoryAxon.mesh);
paths.sensory = sensoryAxon.curve;

// Pseudounipolar T-stalk & Dorsal Root Ganglion Soma at (-7.8, 2.15, 0)
const stalkPts = [
  new THREE.Vector3(-7.8, 0.9, 0),
  new THREE.Vector3(-7.8, 1.55, 0),
  new THREE.Vector3(-7.8, 2.15, 0)
];
const stalkTube = createTube(stalkPts, 0.13, sensoryAxonMat, 'sensory', 'drg_soma', 16);
sensoryGroup.add(stalkTube.mesh);

const drgSoma = createNeuronSoma(new THREE.Vector3(-7.8, 2.35, 0), 0.72, 0x38bdf8, 0x0369a1, 'sensory', 'drg_soma');
sensoryGroup.add(drgSoma.group);

// Add 5 Myelin Sheath segments along the sensory axon
addMyelinAlongCurve(sensoryGroup, sensoryAxon.curve, 5, 0.27, 'sensory', 0.08, 0.88);

// Sensory axon terminal branches synapsing onto Interneuron A (Excitatory) & Interneuron B (Autonomic) & Interneuron C (Inhibitory)
const sensTermA = createTube([
  new THREE.Vector3(-3.8, 0.75, 0),
  new THREE.Vector3(-3.3, 1.15, 0.15),
  new THREE.Vector3(-2.85, 1.35, 0)
], 0.09, sensoryAxonMat, 'sensory', 'presynaptic', 18);
sensoryGroup.add(sensTermA.mesh);
sensoryGroup.add(createSynapticBouton(new THREE.Vector3(-2.85, 1.35, 0), 0x38bdf8, 'synapse', 'presynaptic'));
paths.sensBranchA = sensTermA.curve;

const sensTermB = createTube([
  new THREE.Vector3(-3.8, 0.75, 0),
  new THREE.Vector3(-3.3, -0.2, -0.15),
  new THREE.Vector3(-2.85, -0.85, 0)
], 0.09, sensoryAxonMat, 'sensory', 'presynaptic', 18);
sensoryGroup.add(sensTermB.mesh);
sensoryGroup.add(createSynapticBouton(new THREE.Vector3(-2.85, -0.85, 0), 0x38bdf8, 'synapse', 'presynaptic'));
paths.sensBranchB = sensTermB.curve;

// ----------------------------------------------------------------------------
// 4C. BUILD CNS INTERNEURON NETWORK (中樞聯絡神經元群：興奮性、自主調控、抑制性)
// ----------------------------------------------------------------------------
const interneuronGroup = new THREE.Group();
scene.add(interneuronGroup);
nodeGroups.interneuron = interneuronGroup;
nodeGroups.synapse = interneuronGroup;

// Translucent Spinal Cord / CNS halo column in the background of the center zone
const cnsHaloMat = new THREE.MeshStandardMaterial({
  color: 0x3b0764,
  emissive: 0x1e1b4b,
  emissiveIntensity: 0.25,
  roughness: 0.4,
  transparent: true,
  opacity: 0.16,
  side: THREE.DoubleSide
});
const cnsCylinder = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 8.2, 36, 1, true), cnsHaloMat);
cnsCylinder.position.set(-1.2, 0.3, -0.6);
interneuronGroup.add(cnsCylinder);

// 1) Interneuron A (Excitatory Spinal Interneuron -> Somatic Motor Neuron)
const interAMat = new THREE.MeshStandardMaterial({
  color: 0xc084fc,
  emissive: 0x7e22ce,
  emissiveIntensity: 0.4,
  roughness: 0.28
});
const interAPos = new THREE.Vector3(-2.1, 1.45, 0);
const interASoma = createNeuronSoma(interAPos, 0.62, 0xc084fc, 0x6b21a8, 'interneuron', 'inter_excite');
interneuronGroup.add(interASoma.group);
addDendrites(interneuronGroup, interAPos, [
  new THREE.Vector3(-1, 0.2, 0.3),
  new THREE.Vector3(-0.9, -0.3, -0.2),
  new THREE.Vector3(-0.5, 0.8, 0.2)
], 0.9, 0.065, interAMat, 'interneuron', 'inter_excite', 0.62);

// Axon of Interneuron A -> Somatic Motor Neuron dendrites (at +1.3, 2.35, 0)
const interAAxonPts = [
  interAPos,
  new THREE.Vector3(-0.8, 1.85, 0.25),
  new THREE.Vector3(0.3, 2.15, 0.1),
  new THREE.Vector3(1.25, 2.35, 0)
];
const interAAxon = createTube(interAAxonPts, 0.11, interAMat, 'interneuron', 'inter_excite', 36);
interneuronGroup.add(interAAxon.mesh);
addAxonHillock(interneuronGroup, interAAxon.curve, 0.62, 0.11, interAMat, 'interneuron', 'inter_excite');
interneuronGroup.add(createSynapticBouton(new THREE.Vector3(1.25, 2.35, 0), 0xc084fc, 'synapse', 'presynaptic'));
paths.interToSomatic = interAAxon.curve;

// Collateral from Interneuron A -> Interneuron B (coordinating muscle & gland)
const interCollateralPts = [
  new THREE.Vector3(-1.3, 1.65, 0.15),
  new THREE.Vector3(-1.5, 0.2, 0.3),
  new THREE.Vector3(-1.95, -0.85, 0)
];
const interCollateral = createTube(interCollateralPts, 0.075, interAMat, 'interneuron', 'inter_excite', 24);
interneuronGroup.add(interCollateral.mesh);

// 2) Interneuron B (Autonomic Integrating Interneuron -> Autonomic Motor Neuron)
const interBMat = new THREE.MeshStandardMaterial({
  color: 0xa855f7,
  emissive: 0x581c87,
  emissiveIntensity: 0.4,
  roughness: 0.28
});
const interBPos = new THREE.Vector3(-2.1, -1.05, 0);
const interBSoma = createNeuronSoma(interBPos, 0.58, 0xa855f7, 0x581c87, 'interneuron', 'inter_auto');
interneuronGroup.add(interBSoma.group);
addDendrites(interneuronGroup, interBPos, [
  new THREE.Vector3(-1, 0.3, -0.2),
  new THREE.Vector3(-0.9, -0.4, 0.3),
  new THREE.Vector3(-0.4, -0.8, -0.2)
], 0.85, 0.06, interBMat, 'interneuron', 'inter_auto', 0.58);

// Axon of Interneuron B -> Autonomic Motor Neuron dendrites (at +1.25, -2.35, 0)
const interBAxonPts = [
  interBPos,
  new THREE.Vector3(-0.8, -1.55, -0.2),
  new THREE.Vector3(0.3, -2.05, -0.1),
  new THREE.Vector3(1.25, -2.35, 0)
];
const interBAxon = createTube(interBAxonPts, 0.11, interBMat, 'interneuron', 'inter_auto', 36);
interneuronGroup.add(interBAxon.mesh);
addAxonHillock(interneuronGroup, interBAxon.curve, 0.58, 0.11, interBMat, 'interneuron', 'inter_auto');
interneuronGroup.add(createSynapticBouton(new THREE.Vector3(1.25, -2.35, 0), 0xa855f7, 'synapse', 'presynaptic'));
paths.interToAutonomic = interBAxon.curve;

// 3) Interneuron C (Inhibitory GABAergic Interneuron at top of CNS)
const interCMat = new THREE.MeshStandardMaterial({
  color: 0x818cf8,
  emissive: 0x3730a3,
  emissiveIntensity: 0.45,
  roughness: 0.28
});
const interCPos = new THREE.Vector3(-0.4, 3.25, -0.3);
const interCSoma = createNeuronSoma(interCPos, 0.5, 0x818cf8, 0x312e81, 'interneuron', 'inter_inhibit');
interneuronGroup.add(interCSoma.group);
addDendrites(interneuronGroup, interCPos, [
  new THREE.Vector3(-0.7, 0.6, 0.2),
  new THREE.Vector3(0.7, 0.6, -0.2)
], 0.7, 0.055, interCMat, 'interneuron', 'inter_inhibit', 0.5);

const interCAxonPts = [
  interCPos,
  new THREE.Vector3(0.4, 2.8, -0.1),
  new THREE.Vector3(1.35, 2.55, 0)
];
const interCAxon = createTube(interCAxonPts, 0.08, interCMat, 'interneuron', 'inter_inhibit', 20);
interneuronGroup.add(interCAxon.mesh);
addAxonHillock(interneuronGroup, interCAxon.curve, 0.5, 0.08, interCMat, 'interneuron', 'inter_inhibit');
interneuronGroup.add(createSynapticBouton(new THREE.Vector3(1.35, 2.55, 0), 0x818cf8, 'interneuron', 'inter_inhibit'));
paths.inhibitory = interCAxon.curve;

// ----------------------------------------------------------------------------
// 4D. BUILD SOMATIC MOTOR NEURON (體運動神經元 -> 支配骨骼肌)
// ----------------------------------------------------------------------------
const somaticGroup = new THREE.Group();
scene.add(somaticGroup);
nodeGroups.somatic = somaticGroup;

const somaticMat = new THREE.MeshStandardMaterial({
  color: 0xfb7185,
  emissive: 0xbe123c,
  emissiveIntensity: 0.38,
  roughness: 0.28
});

const somaticPos = new THREE.Vector3(2.1, 2.4, 0);
const somaticSoma = createNeuronSoma(somaticPos, 0.78, 0xfb7185, 0x9f1239, 'somatic', 'motor_soma');
somaticGroup.add(somaticSoma.group);

// Rich multipolar dendrites receiving input from Interneuron A
addDendrites(somaticGroup, somaticPos, [
  new THREE.Vector3(-1.0, 0.1, 0.2),
  new THREE.Vector3(-0.9, 0.6, -0.2),
  new THREE.Vector3(-0.85, -0.5, 0.3),
  new THREE.Vector3(-0.3, 0.9, -0.3),
  new THREE.Vector3(-0.4, -0.8, -0.2)
], 1.05, 0.075, somaticMat, 'somatic', 'postsynaptic', 0.78);

// Long myelinated motor axon from (2.1, 2.4, 0) to Neuromuscular Junction (9.2, 2.5, 0)
const somaticAxonPts = [
  somaticPos,
  new THREE.Vector3(3.8, 2.55, 0.2),
  new THREE.Vector3(5.6, 2.7, -0.15),
  new THREE.Vector3(7.4, 2.6, 0.1),
  new THREE.Vector3(9.1, 2.45, 0)
];
const somaticAxon = createTube(somaticAxonPts, 0.145, somaticMat, 'somatic', 'motor_axon', 56);
somaticGroup.add(somaticAxon.mesh);
addAxonHillock(somaticGroup, somaticAxon.curve, 0.78, 0.145, somaticMat, 'somatic', 'motor_axon');
paths.somatic = somaticAxon.curve;

// Add 4 Schwann cell myelin segments along somatic motor axon
addMyelinAlongCurve(somaticGroup, somaticAxon.curve, 4, 0.28, 'somatic', 0.14, 0.86);

// Neuromuscular Junction (運動終板) branches onto skeletal muscle fibers
const nmjTargets = [
  new THREE.Vector3(10.05, 3.15, 0.35),
  new THREE.Vector3(10.15, 2.45, 0.45),
  new THREE.Vector3(10.05, 1.75, 0.35)
];
nmjTargets.forEach((tPt) => {
  const branch = createTube([
    new THREE.Vector3(9.1, 2.45, 0),
    new THREE.Vector3(9.6, (2.45 + tPt.y) * 0.5, tPt.z * 0.6),
    tPt
  ], 0.075, somaticMat, 'somatic', 'nmj', 14);
  somaticGroup.add(branch.mesh);

  // Motor endplate pad
  const pad = createSynapticBouton(tPt, 0xfda4af, 'synapse', 'nmj');
  pad.scale.set(1.3, 0.8, 1.3);
  somaticGroup.add(pad);
});

// ----------------------------------------------------------------------------
// 4E. BUILD AUTONOMIC MOTOR NEURON (自主運動神經元 -> 支配腺體)
// ----------------------------------------------------------------------------
const autonomicGroup = new THREE.Group();
scene.add(autonomicGroup);
nodeGroups.autonomic = autonomicGroup;

const autoMat = new THREE.MeshStandardMaterial({
  color: 0x2dd4bf,
  emissive: 0x0f766e,
  emissiveIntensity: 0.38,
  roughness: 0.28
});

const autoPos = new THREE.Vector3(2.1, -2.4, 0);
const autoSoma = createNeuronSoma(autoPos, 0.68, 0x2dd4bf, 0x115e59, 'autonomic', 'auto_soma');
autonomicGroup.add(autoSoma.group);

addDendrites(autonomicGroup, autoPos, [
  new THREE.Vector3(-1.0, 0.2, -0.2),
  new THREE.Vector3(-0.9, -0.5, 0.25),
  new THREE.Vector3(-0.5, 0.75, 0.2),
  new THREE.Vector3(-0.4, -0.8, -0.2)
], 0.95, 0.068, autoMat, 'autonomic', 'postsynaptic', 0.68);

// Autonomic motor axon to Secretory Gland (at 9.2, -2.5, 0)
const autoAxonPts = [
  autoPos,
  new THREE.Vector3(3.9, -2.55, -0.2),
  new THREE.Vector3(5.8, -2.7, 0.15),
  new THREE.Vector3(7.5, -2.6, -0.1),
  new THREE.Vector3(9.1, -2.5, 0)
];
const autoAxon = createTube(autoAxonPts, 0.125, autoMat, 'autonomic', null, 56);
autonomicGroup.add(autoAxon.mesh);
addAxonHillock(autonomicGroup, autoAxon.curve, 0.68, 0.125, autoMat, 'autonomic', null);
paths.autonomic = autoAxon.curve;

// Light myelination on preganglionic/autonomic pathway
addMyelinAlongCurve(autonomicGroup, autoAxon.curve, 3, 0.24, 'autonomic', 0.15, 0.78);

// Neuroglandular terminal varicosities innervating the gland acini
const glandTargets = [
  new THREE.Vector3(9.95, -1.95, 0.45),
  new THREE.Vector3(10.05, -2.55, 0.55),
  new THREE.Vector3(9.95, -3.15, 0.45)
];
glandTargets.forEach((gPt) => {
  const branch = createTube([
    new THREE.Vector3(9.1, -2.5, 0),
    new THREE.Vector3(9.55, (-2.5 + gPt.y) * 0.5, gPt.z * 0.6),
    gPt
  ], 0.07, autoMat, 'autonomic', 'varicosities', 14);
  autonomicGroup.add(branch.mesh);

  const varicosity = createSynapticBouton(gPt, 0x5eead4, 'autonomic', 'varicosities');
  autonomicGroup.add(varicosity);
});

// ----------------------------------------------------------------------------
// 4F. BUILD EFFECTOR 1: SKELETAL MUSCLE BUNDLE & BIOMECHANICAL ARM LEVER (骨骼肌動器)
// ----------------------------------------------------------------------------
const muscleGroup = new THREE.Group();
muscleGroup.position.set(11.3, 2.45, 0);
scene.add(muscleGroup);
nodeGroups.muscle = muscleGroup;

// Muscle Belly Group (scales shorter in X and thicker in Y/Z during contraction!)
const muscleBellyGroup = new THREE.Group();
muscleGroup.add(muscleBellyGroup);

const muscleFiberMat = new THREE.MeshStandardMaterial({
  color: 0xe11d48,
  emissive: 0x881337,
  emissiveIntensity: 0.32,
  roughness: 0.35,
  metalness: 0.08,
});

const striationMat = new THREE.MeshStandardMaterial({
  color: 0xfda4af,
  emissive: 0xf43f5e,
  emissiveIntensity: 0.25,
  roughness: 0.4
});

const fiberOffsets = [
  [0, 0.65, 0],
  [0, 0, 0.42],
  [0, 0, -0.42],
  [0, -0.65, 0],
  [0, 0, 0]
];

fiberOffsets.forEach(([ox, oy, oz]) => {
  // Fusiform muscle fiber (Lathe or Capsule)
  const fiberGeo = new THREE.CapsuleGeometry(0.32, 2.35, 16, 24);
  fiberGeo.rotateZ(Math.PI / 2);
  const fiberMesh = new THREE.Mesh(fiberGeo, muscleFiberMat);
  fiberMesh.position.set(ox, oy, oz);
  registerPickable(fiberMesh, 'muscle', 'muscle_fibers');
  muscleBellyGroup.add(fiberMesh);

  // Sarcomere Z-disc / A-band striations along each fiber
  for (let sx = -1.05; sx <= 1.05; sx += 0.35) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.028, 8, 20), striationMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(sx, oy, oz);
    registerPickable(band, 'muscle', 'muscle_fibers');
    muscleBellyGroup.add(band);
  }
});

// White Tendons at left (origin) & right (insertion)
const tendonMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  emissive: 0x475569,
  emissiveIntensity: 0.2,
  roughness: 0.4
});

const leftTendon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 0.85, 20), tendonMat);
leftTendon.rotation.z = Math.PI / 2;
leftTendon.position.set(-1.65, 0, 0);
registerPickable(leftTendon, 'muscle', 'tendon_bone');
muscleBellyGroup.add(leftTendon);

const rightTendon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.22, 0.85, 20), tendonMat);
rightTendon.rotation.z = Math.PI / 2;
rightTendon.position.set(1.65, 0, 0);
registerPickable(rightTendon, 'muscle', 'tendon_bone');
muscleBellyGroup.add(rightTendon);

// Anchor bone on the left & articulated Forearm Bone Lever on the right that flexes when muscle contracts!
const boneMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  emissive: 0x334155,
  emissiveIntensity: 0.18,
  roughness: 0.45
});

const originBone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 16), boneMat);
originBone.position.set(-2.05, 0, -0.15);
registerPickable(originBone, 'muscle', 'tendon_bone');
muscleGroup.add(originBone);

// Pivot joint at the right end of the muscle
const forearmPivot = new THREE.Group();
forearmPivot.position.set(2.05, -0.35, 0);
muscleGroup.add(forearmPivot);

const jointSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 18), boneMat);
registerPickable(jointSphere, 'muscle', 'tendon_bone');
forearmPivot.add(jointSphere);

const leverBone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.1, 16), boneMat);
leverBone.position.set(0.55, 0.9, 0);
leverBone.rotation.z = -0.52;
registerPickable(leverBone, 'muscle', 'tendon_bone');
forearmPivot.add(leverBone);

// ----------------------------------------------------------------------------
// 4G. BUILD EFFECTOR 2: SECRETORY ACINAR GLAND & DUCT (分泌腺體動器)
// ----------------------------------------------------------------------------
const glandGroup = new THREE.Group();
glandGroup.position.set(11.1, -2.55, 0);
scene.add(glandGroup);
nodeGroups.gland = glandGroup;

const acinarMat = new THREE.MeshStandardMaterial({
  color: 0x14b8a6,
  emissive: 0x0f766e,
  emissiveIntensity: 0.35,
  roughness: 0.22,
  transparent: true,
  opacity: 0.88
});

const granuleMat = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  emissive: 0xf59e0b,
  emissiveIntensity: 0.85,
  roughness: 0.2
});

const acinarCells = [];
// Grape-like cluster of secretory acinar cells around a central lumen
const acinarPositions = [
  [-0.75, 0.75, 0.25],
  [-0.2, 0.95, 0.15],
  [0.45, 0.8, 0.2],
  [-0.95, 0.1, 0.35],
  [-0.85, -0.65, 0.25],
  [-0.2, -0.9, 0.15],
  [0.45, -0.75, 0.2],
  [-0.35, 0.35, 0.65],
  [-0.35, -0.35, 0.65],
  [-0.4, 0.25, -0.55],
  [-0.4, -0.25, -0.55]
];

acinarPositions.forEach(([ax, ay, az]) => {
  const cellGroup = new THREE.Group();
  cellGroup.position.set(ax, ay, az);
  cellGroup.userData.basePos = new THREE.Vector3(ax, ay, az);

  const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.54, 22, 22), acinarMat);
  registerPickable(lobe, 'gland', 'acinar_cells');
  cellGroup.add(lobe);

  // Internal secretory granules visible through the translucent acinar membrane
  for (let g = 0; g < 3; g++) {
    const gran = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), granuleMat);
    gran.position.set(
      (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.35
    );
    cellGroup.add(gran);
  }

  glandGroup.add(cellGroup);
  acinarCells.push(cellGroup);
});

// Secretory Duct (分泌導管) extending to the right where droplets stream out
const ductMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0369a1,
  emissiveIntensity: 0.3,
  roughness: 0.25,
  transparent: true,
  opacity: 0.78,
  side: THREE.DoubleSide
});

const ductGeo = new THREE.CylinderGeometry(0.38, 0.52, 1.95, 24, 1, true);
ductGeo.rotateZ(-Math.PI / 2);
const ductMesh = new THREE.Mesh(ductGeo, ductMat);
ductMesh.position.set(1.15, 0, 0);
registerPickable(ductMesh, 'gland', 'secretory_duct');
glandGroup.add(ductMesh);

// Lip ring at the exit of the secretory duct
const ductRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.39, 0.05, 12, 24),
  new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x0d9488, emissiveIntensity: 0.6 })
);
ductRing.rotation.y = Math.PI / 2;
ductRing.position.set(2.12, 0, 0);
registerPickable(ductRing, 'gland', 'secretory_duct');
glandGroup.add(ductRing);

// ============================================================================
// 5. ACTION POTENTIAL PULSES, SYNAPTIC VESICLES & EFFECTOR PARTICLES
// ============================================================================
const pulseContainer = new THREE.Group();
scene.add(pulseContainer);

const pulseGeo = new THREE.SphereGeometry(0.24, 12, 10);
const haloGeo = new THREE.SphereGeometry(0.46, 10, 8);
const vesicleGeo = new THREE.SphereGeometry(0.085, 6, 5);
const dropletGeo = new THREE.SphereGeometry(0.15, 8, 6);

// Performance caps (prevent particle / pulse explosion at high frequency)
const MAX_PULSES = 40;
const MAX_PARTICLES = 260;

// Shared materials for pulses (cached by color, never re-created)
const pulseMatCache = new Map();
function getPulseMats(color) {
  if (!pulseMatCache.has(color)) {
    pulseMatCache.set(color, {
      core: new THREE.MeshBasicMaterial({ color }),
      halo: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, depthWrite: false })
    });
  }
  return pulseMatCache.get(color);
}

// Particle object pool: reuse meshes instead of allocating new ones
const particlePool = [];
function acquireParticle(geo, color) {
  let m = particlePool.pop();
  if (!m) {
    m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  } else {
    m.geometry = geo;
  }
  m.material.color.setHex(color);
  m.material.opacity = 0.95;
  m.scale.setScalar(1);
  m.visible = true;
  pulseContainer.add(m);
  return m;
}
function releaseParticle(m) {
  pulseContainer.remove(m);
  particlePool.push(m);
}
function particleCount() {
  return state.synapseBursts.length + state.muscleSparks.length + state.glandDroplets.length;
}

function spawnActionPotential(curve, options) {
  if (state.pulses.length >= MAX_PULSES) return;
  const mats = getPulseMats(options.color || 0x38bdf8);
  const mesh = new THREE.Mesh(pulseGeo, mats.core);
  mesh.add(new THREE.Mesh(haloGeo, mats.halo));

  mesh.position.copy(curve.getPoint(0));
  pulseContainer.add(mesh);

  state.pulses.push({
    mesh,
    curve,
    t: 0,
    speed: options.speed || 0.9,
    saltatory: options.saltatory ?? state.myelinated,
    onArrive: options.onArrive || null
  });
}

// Spawn neurotransmitter burst across a synapse
function spawnSynapseBurst(origin, direction, colorHex, count = 16) {
  const n = Math.min(count, MAX_PARTICLES - particleCount());
  for (let i = 0; i < n; i++) {
    const p = acquireParticle(vesicleGeo, colorHex);
    p.position.copy(origin);
    p.position.x += (Math.random() - 0.5) * 0.25;
    p.position.y += (Math.random() - 0.5) * 0.25;
    p.position.z += (Math.random() - 0.5) * 0.25;

    const vel = direction.clone().normalize().multiplyScalar(1.4 + Math.random() * 1.2);
    vel.x += (Math.random() - 0.5) * 0.7;
    vel.y += (Math.random() - 0.5) * 0.7;
    vel.z += (Math.random() - 0.5) * 0.7;

    state.synapseBursts.push({ mesh: p, vel, life: 0, maxLife: 0.55 + Math.random() * 0.25 });
  }
}

// Spawn Ca2+ sparks over the skeletal muscle fibers
function triggerMuscleContractionEffect(strength = 0.85) {
  state.muscleTarget = Math.min(1.0, Math.max(state.muscleTarget, strength));

  // Spawn glowing Ca2+ ions flooding the muscle belly
  const n = Math.min(14, MAX_PARTICLES - particleCount());
  for (let i = 0; i < n; i++) {
    const spark = acquireParticle(vesicleGeo, 0xfde047);
    spark.position.set(
      11.3 + (Math.random() - 0.5) * 2.4,
      2.45 + (Math.random() - 0.5) * 1.3,
      (Math.random() - 0.5) * 0.9
    );
    state.muscleSparks.push({
      mesh: spark,
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2),
      life: 0,
      maxLife: 0.6 + Math.random() * 0.3
    });
  }
}

// Spawn secretory droplets streaming out of the gland duct
function triggerGlandSecretionEffect(strength = 0.85) {
  state.glandTarget = Math.min(1.0, Math.max(state.glandTarget, strength));

  const n = Math.min(10, MAX_PARTICLES - particleCount());
  for (let i = 0; i < n; i++) {
    const isGold = i % 3 === 0;
    const drop = acquireParticle(dropletGeo, isGold ? 0xfbbf24 : 0x2dd4bf);
    drop.position.set(
      12.3 + Math.random() * 0.7,
      -2.55 + (Math.random() - 0.5) * 0.42,
      (Math.random() - 0.5) * 0.42
    );
    state.glandDroplets.push({
      mesh: drop,
      vel: new THREE.Vector3(2.2 + Math.random() * 1.6, (Math.random() - 0.5) * 0.8 - 0.25, (Math.random() - 0.5) * 0.8),
      life: 0,
      maxLife: 1.1 + Math.random() * 0.45
    });
  }
}

// ============================================================================
// 6. NEURAL PATHWAY ORCHESTRATION FUNCTIONS
// ============================================================================
function getConductionSpeed() {
  return state.myelinated ? 1.15 : 0.48;
}

// 1) Stimulate Sensory Receptor -> Full cascade
function stimulateReceptor() {
  // Visual receptor shockwave
  stimWaveMesh.scale.set(1, 1, 1);
  stimWaveMat.opacity = 0.95;
  state.apPhase = 1.0;

  const baseSpeed = getConductionSpeed();

  spawnActionPotential(paths.sensory, {
    color: 0x38bdf8,
    speed: baseSpeed,
    saltatory: state.myelinated,
    onArrive: () => {
      // Branch into CNS terminals
      const doMusclePath = state.pathway !== 'autonomic';
      const doGlandPath = state.pathway !== 'reflex';

      if (doMusclePath) {
        spawnActionPotential(paths.sensBranchA, {
          color: 0x38bdf8,
          speed: 2.2,
          saltatory: false,
          onArrive: () => {
            spawnSynapseBurst(new THREE.Vector3(-2.85, 1.35, 0), new THREE.Vector3(1, 0.1, 0), 0x38bdf8, 14);
            fireInterneuronToMuscle();
          }
        });
      }

      if (doGlandPath) {
        spawnActionPotential(paths.sensBranchB, {
          color: 0x38bdf8,
          speed: 2.2,
          saltatory: false,
          onArrive: () => {
            spawnSynapseBurst(new THREE.Vector3(-2.85, -0.85, 0), new THREE.Vector3(1, -0.1, 0), 0x38bdf8, 14);
            fireInterneuronToGland();
          }
        });
      }
    }
  });
}

// 2) Fire CNS Interneurons (Brain/Spinal Cord command)
function stimulateBrainInterneurons() {
  state.apPhase = 1.0;
  const doMusclePath = state.pathway !== 'autonomic';
  const doGlandPath = state.pathway !== 'reflex';

  if (doMusclePath) fireInterneuronToMuscle();
  if (doGlandPath) fireInterneuronToGland();
}

function fireInterneuronToMuscle() {
  // If GABAergic central inhibition is active, fire the inhibitory interneuron simultaneously!
  if (state.synapseGate === 'inhibit-cns') {
    spawnActionPotential(paths.inhibitory, {
      color: 0x818cf8,
      speed: 1.5,
      saltatory: false,
      onArrive: () => {
        spawnSynapseBurst(new THREE.Vector3(1.35, 2.55, 0), new THREE.Vector3(0.8, -0.2, 0), 0x818cf8, 20);
      }
    });
  }

  spawnActionPotential(paths.interToSomatic, {
    color: 0xc084fc,
    speed: 1.25,
    saltatory: false,
    onArrive: () => {
      spawnSynapseBurst(new THREE.Vector3(1.25, 2.35, 0), new THREE.Vector3(1, 0, 0), 0xc084fc, 16);
      if (state.synapseGate === 'inhibit-cns') {
        // Inhibited by GABA! Hyperpolarize oscilloscope slightly
        state.membraneVoltage = -78;
        return;
      }
      stimulateMuscleMotorNeuron();
    }
  });
}

function fireInterneuronToGland() {
  if (state.synapseGate === 'inhibit-cns') {
    spawnActionPotential(paths.inhibitory, {
      color: 0x818cf8,
      speed: 1.5,
      saltatory: false
    });
  }

  spawnActionPotential(paths.interToAutonomic, {
    color: 0xa855f7,
    speed: 1.25,
    saltatory: false,
    onArrive: () => {
      spawnSynapseBurst(new THREE.Vector3(1.25, -2.35, 0), new THREE.Vector3(1, 0, 0), 0xa855f7, 16);
      if (state.synapseGate === 'inhibit-cns') {
        state.membraneVoltage = -78;
        return;
      }
      stimulateGlandMotorNeuron();
    }
  });
}

// 3) Direct Somatic Motor Neuron -> Muscle Effector
function stimulateMuscleMotorNeuron() {
  state.apPhase = 1.0;
  const baseSpeed = getConductionSpeed();

  spawnActionPotential(paths.somatic, {
    color: 0xfb7185,
    speed: baseSpeed,
    saltatory: state.myelinated,
    onArrive: () => {
      // Neuromuscular Junction
      if (state.synapseGate === 'block-muscle') {
        // Blocked by Botulinum / Curare! Tiny failed burst, no contraction
        spawnSynapseBurst(new THREE.Vector3(9.8, 2.45, 0.3), new THREE.Vector3(0.4, 0, 0), 0x64748b, 6);
        return;
      }
      spawnSynapseBurst(new THREE.Vector3(9.9, 2.45, 0.35), new THREE.Vector3(1, 0, 0), 0xfda4af, 22);
      triggerMuscleContractionEffect(0.92);
    }
  });
}

// 4) Direct Autonomic Motor Neuron -> Gland Effector
function stimulateGlandMotorNeuron() {
  state.apPhase = 1.0;
  const baseSpeed = getConductionSpeed() * 0.92;

  spawnActionPotential(paths.autonomic, {
    color: 0x2dd4bf,
    speed: baseSpeed,
    saltatory: state.myelinated,
    onArrive: () => {
      if (state.synapseGate === 'block-gland') {
        // Blocked by Atropine!
        spawnSynapseBurst(new THREE.Vector3(9.8, -2.55, 0.3), new THREE.Vector3(0.4, 0, 0), 0x64748b, 6);
        return;
      }
      spawnSynapseBurst(new THREE.Vector3(9.9, -2.55, 0.35), new THREE.Vector3(1, 0, 0), 0x5eead4, 20);
      triggerGlandSecretionEffect(0.92);
    }
  });
}

// ============================================================================
// 7. FLOATING 3D PIN LABELS & UI BINDINGS
// ============================================================================
const pinElements = {};

function initPinLabels() {
  labelsLayer.innerHTML = '';
  Object.entries(NODE_DATA).forEach(([key, item]) => {
    if (!item.labelPos) return;
    const pin = document.createElement('div');
    pin.className = 'pin-label';
    pin.dataset.key = key;
    pin.innerHTML = `
      <span class="pin-dot" style="color:${item.color};background:${item.color}"></span>
      <span>${item.zh.split(' ')[0]}</span>
    `;
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(key);
      // Also trigger a contextual demonstration when clicking effectors or receptor!
      if (key === 'receptor' || key === 'sensory') stimulateReceptor();
      else if (key === 'muscle' || key === 'somatic') stimulateMuscleMotorNeuron();
      else if (key === 'gland' || key === 'autonomic') stimulateGlandMotorNeuron();
      else if (key === 'interneuron') stimulateBrainInterneurons();
    });
    labelsLayer.appendChild(pin);
    pinElements[key] = {
      el: pin,
      pos: new THREE.Vector3(...item.labelPos)
    };
  });
}

function updatePinLabels() {
  if (!state.showLabels) {
    labelsLayer.style.display = 'none';
    return;
  }
  labelsLayer.style.display = 'block';

  const halfW = window.innerWidth * 0.5;
  const halfH = window.innerHeight * 0.5;

  Object.entries(pinElements).forEach(([key, { el, pos }]) => {
    const projected = pos.clone().project(camera);
    if (projected.z > 1) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }
    const x = projected.x * halfW + halfW;
    const y = -projected.y * halfH + halfH;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    el.classList.toggle('active', state.selectedNode === key);
  });
}

function populateNodeDirectory() {
  const listEl = document.getElementById('nodeList');
  listEl.innerHTML = '';

  const order = ['receptor', 'sensory', 'interneuron', 'synapse', 'somatic', 'autonomic', 'muscle', 'gland'];
  order.forEach((key) => {
    const item = NODE_DATA[key];
    const row = document.createElement('div');
    row.className = 'node-item';
    row.dataset.key = key;
    row.innerHTML = `
      <div class="node-left">
        <span class="node-swatch" style="color:${item.color};background:${item.color}"></span>
        <div class="node-titles">
          <span class="node-zh">${item.zh}</span>
          <span class="node-en">${item.en}</span>
        </div>
      </div>
      <span class="node-tag">${item.tag}</span>
    `;
    row.addEventListener('click', () => selectNode(key));
    listEl.appendChild(row);
  });
}

function startFlash(id, duration) {
  // Restore glow of the previously flashing group before switching
  if (state.flashKey && state.flashKey !== id) {
    (subGroups[state.flashKey] || []).forEach((m) => {
      const mat = m.material;
      if (mat && mat.userData.baseGlow !== undefined) mat.emissiveIntensity = mat.userData.baseGlow;
    });
  }
  state.flashKey = id;
  state.flashTimer = duration;
}

function selectNode(key) {
  const data = NODE_DATA[key] || NODE_DATA.overview;
  state.selectedNode = key;

  // Update sidebar directory active state
  document.querySelectorAll('.node-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === key);
  });

  // Update Right Info Panel
  document.getElementById('infoBadge').textContent = data.badge;
  document.getElementById('infoTitle').textContent = data.zh;
  document.getElementById('infoSubtitle').textContent = data.en;
  document.getElementById('infoDesc').textContent = data.desc;
  document.getElementById('infoSignalType').textContent = data.signalType;
  document.getElementById('infoTransmitter').textContent = data.transmitter;
  document.getElementById('infoEffectorRole').textContent = data.effectorRole;

  // Populate Sub-structure Chips
  const chipsContainer = document.getElementById('substructureChips');
  const detailEl = document.getElementById('substructureDetail');
  chipsContainer.innerHTML = '';

  (data.substructures || []).forEach((sub, idx) => {
    const chip = document.createElement('button');
    chip.className = 'sub-chip' + (idx === 0 ? ' active' : '');
    chip.textContent = sub.label;
    chip.addEventListener('click', () => {
      chipsContainer.querySelectorAll('.sub-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      setText(detailEl, sub.detail);

      // Flash the substructure in 3D
      startFlash(sub.id, 1.6);
      if (NODE_DATA[sub.id]) {
        // If it corresponds to a main node in overview, gently pan toward it
        const targetNode = NODE_DATA[sub.id];
        if (targetNode.camTarget) {
          camAnim.target.set(...targetNode.camTarget);
          camAnim.active = true;
        }
      }
    });
    chipsContainer.appendChild(chip);
  });

  if (data.substructures && data.substructures.length > 0) {
    setText(detailEl, data.substructures[0].detail);
    startFlash(data.substructures[0].id, 1.2);
  }

  // Smooth Camera Transition
  if (data.camPos && data.camTarget) {
    camAnim.pos.set(...data.camPos);
    camAnim.target.set(...data.camTarget);
    camAnim.active = true;
  }
}

// Cached DOM writers: only touch the DOM when the value actually changes
function setText(el, txt) {
  if (el && el.__txt !== txt) {
    el.__txt = txt;
    el.textContent = txt;
  }
}
const _widthCache = {};
function setWidth(id, pct) {
  if (_widthCache[id] !== pct) {
    _widthCache[id] = pct;
    document.getElementById(id).style.width = `${pct}%`;
  }
}

// ============================================================================
// 8. LIVE OSCILLOSCOPE CHART (膜電位 mV + 肌肉張力 + 腺體分泌)
// ============================================================================
const oscCanvas = document.getElementById('oscCanvas');
const oscCtx = oscCanvas.getContext('2d');
const historyLength = 140;
const voltageHistory = new Array(historyLength).fill(-70);
const muscleHistory = new Array(historyLength).fill(0);
const glandHistory = new Array(historyLength).fill(0);

function updateOscilloscope(dt) {
  // Advance Action Potential waveform if apPhase > 0
  if (state.apPhase > 0) {
    state.apPhase -= dt * 2.8;
    const p = 1.0 - Math.max(0, state.apPhase);
    if (p < 0.25) {
      // Depolarization to +30 mV
      state.membraneVoltage = -70 + (p / 0.25) * 100;
    } else if (p < 0.55) {
      // Repolarization to -78 mV (Hyperpolarization)
      state.membraneVoltage = 30 - ((p - 0.25) / 0.3) * 108;
    } else {
      // Return to -70 mV resting potential
      state.membraneVoltage = -78 + ((p - 0.55) / 0.45) * 8;
    }
  } else {
    state.membraneVoltage += (-70 - state.membraneVoltage) * Math.min(1, dt * 10);
  }

  voltageHistory.push(state.membraneVoltage);
  if (voltageHistory.length > historyLength) voltageHistory.shift();

  muscleHistory.push(state.muscleTension);
  if (muscleHistory.length > historyLength) muscleHistory.shift();

  glandHistory.push(state.glandSecretion);
  if (glandHistory.length > historyLength) glandHistory.shift();

  // Readout update
  const vRound = Math.round(state.membraneVoltage);
  const vEl = document.getElementById('oscVoltage');
  if (vRound > -55) {
    setText(vEl, `+${Math.max(0, vRound)} mV (去極化動作電位)`);
  } else if (vRound < -73) {
    setText(vEl, `${vRound} mV (過極化抑制)`);
  } else {
    setText(vEl, `${vRound} mV (靜止膜電位)`);
  }

  // Draw Canvas
  const w = oscCanvas.width;
  const h = oscCanvas.height;
  oscCtx.clearRect(0, 0, w, h);

  // Grid lines
  oscCtx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  oscCtx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach((ry) => {
    oscCtx.beginPath();
    oscCtx.moveTo(0, h * ry);
    oscCtx.lineTo(w, h * ry);
    oscCtx.stroke();
  });

  // Threshold dashed line (-55mV)
  oscCtx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
  oscCtx.setLineDash([4, 4]);
  oscCtx.beginPath();
  oscCtx.moveTo(0, h * 0.65);
  oscCtx.lineTo(w, h * 0.65);
  oscCtx.stroke();
  oscCtx.setLineDash([]);

  // Helper to draw trace
  function drawTrace(arr, mapY, color, width = 2) {
    oscCtx.strokeStyle = color;
    oscCtx.lineWidth = width;
    oscCtx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = (i / (historyLength - 1)) * w;
      const y = mapY(arr[i]);
      if (i === 0) oscCtx.moveTo(x, y);
      else oscCtx.lineTo(x, y);
    }
    oscCtx.stroke();
  }

  // Draw Gland Secretion (0..1)
  drawTrace(glandHistory, (v) => h - 10 - v * (h - 24), '#2dd4bf', 1.8);
  // Draw Muscle Tension (0..1)
  drawTrace(muscleHistory, (v) => h - 10 - v * (h - 24), '#fb7185', 2.0);
  // Draw Membrane Voltage (-85..+35 mV)
  drawTrace(voltageHistory, (mv) => {
    const norm = (mv - (-85)) / (40 - (-85));
    return h - 8 - norm * (h - 18);
  }, '#38bdf8', 2.2);
}

// ============================================================================
// 9. RAYCASTING & INTERACTIVE EVENT LISTENERS
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

// Hover raycast is throttled & executed inside the render loop (not on every mousemove)
let hoverEvent = null;
let hoverAccum = 0;
window.addEventListener('pointermove', (e) => {
  if (e.target !== renderer.domElement) {
    hoverEvent = null;
    tooltipEl.classList.add('hidden');
    return;
  }
  hoverEvent = { x: e.clientX, y: e.clientY, buttons: e.buttons };
});

function processHover(dt) {
  hoverAccum += dt;
  if (!hoverEvent || hoverAccum < 0.1) return;
  hoverAccum = 0;
  const e = hoverEvent;
  hoverEvent = null;
  if (e.buttons) { tooltipEl.classList.add('hidden'); return; } // dragging camera

  pointer.x = (e.x / window.innerWidth) * 2 - 1;
  pointer.y = -(e.y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickableMeshes, false);

  if (hits.length > 0) {
    const item = NODE_DATA[hits[0].object.userData.nodeKey];
    if (item) {
      renderer.domElement.style.cursor = 'pointer';
      setText(tooltipEl, `${item.zh}（點擊觀察並觸發生理反應）`);
      tooltipEl.style.left = `${e.x}px`;
      tooltipEl.style.top = `${e.y}px`;
      tooltipEl.classList.remove('hidden');
      return;
    }
  }
  renderer.domElement.style.cursor = 'grab';
  tooltipEl.classList.add('hidden');
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (dist > 6) return; // Dragged camera

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickableMeshes, false);

  if (hits.length > 0) {
    const hitKey = hits[0].object.userData.nodeKey;
    if (hitKey) {
      selectNode(hitKey);
      // Trigger corresponding biological action on click!
      if (hitKey === 'receptor' || hitKey === 'sensory') stimulateReceptor();
      else if (hitKey === 'interneuron' || hitKey === 'synapse') stimulateBrainInterneurons();
      else if (hitKey === 'somatic' || hitKey === 'muscle') stimulateMuscleMotorNeuron();
      else if (hitKey === 'autonomic' || hitKey === 'gland') stimulateGlandMotorNeuron();
    }
  }
});

// Stop camera auto-lerp when user manually orbits
controls.addEventListener('start', () => {
  camAnim.active = false;
});

// UI Controls Wiring
document.getElementById('btnOverview').addEventListener('click', () => selectNode('overview'));
document.getElementById('btnStimReceptor').addEventListener('click', () => stimulateReceptor());
document.getElementById('btnStimBrain').addEventListener('click', () => stimulateBrainInterneurons());
document.getElementById('btnStimMuscle').addEventListener('click', () => stimulateMuscleMotorNeuron());
document.getElementById('btnStimGland').addEventListener('click', () => stimulateGlandMotorNeuron());

// Hold / Tetanus / Continuous Effector Buttons
const btnHoldMuscle = document.getElementById('btnHoldMuscle');
btnHoldMuscle.addEventListener('click', () => {
  state.holdMuscle = !state.holdMuscle;
  btnHoldMuscle.classList.toggle('active', state.holdMuscle);
  btnHoldMuscle.textContent = state.holdMuscle ? '⚡ 強直收縮中' : '持續收縮';
  if (state.holdMuscle) stimulateMuscleMotorNeuron();
});

const btnHoldGland = document.getElementById('btnHoldGland');
btnHoldGland.addEventListener('click', () => {
  state.holdGland = !state.holdGland;
  btnHoldGland.classList.toggle('active', state.holdGland);
  btnHoldGland.textContent = state.holdGland ? '💧 持續分泌中' : '持續分泌';
  if (state.holdGland) stimulateGlandMotorNeuron();
});

// Top Pathway Switcher Tabs
document.querySelectorAll('.pathway-switcher .mode-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pathway-switcher .mode-tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const pw = tab.dataset.pathway;
    state.pathway = pw;

    // Emphasize relevant groups & move camera if synapse close-up
    autonomicGroup.visible = pw !== 'reflex';
    glandGroup.visible = pw !== 'reflex';
    somaticGroup.visible = pw !== 'autonomic';
    muscleGroup.visible = pw !== 'autonomic';

    if (pw === 'synapse') {
      selectNode('synapse');
      stimulateReceptor();
    } else if (pw === 'reflex') {
      selectNode('overview');
      stimulateReceptor();
    } else if (pw === 'autonomic') {
      selectNode('overview');
      stimulateReceptor();
    } else {
      selectNode('overview');
      stimulateReceptor();
    }
  });
});

// Bottom Bar: Continuous Stimulus Frequency Slider
const freqSlider = document.getElementById('freqSlider');
const freqLabel = document.getElementById('freqLabel');
freqSlider.addEventListener('input', () => {
  const val = parseInt(freqSlider.value, 10);
  state.stimFrequency = val;
  if (val === 0) {
    freqLabel.textContent = '單次手動 (0 Hz)';
  } else if (val <= 4) {
    freqLabel.textContent = `${val} Hz (單次抽動列)`;
  } else {
    freqLabel.textContent = `${val} Hz (高頻強直收縮 / 大量分泌)`;
  }
});

// Bottom Bar: Myelin Sheath Toggle
document.querySelectorAll('#myelinGroup .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#myelinGroup .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.myelinated = btn.dataset.myelin === 'myelinated';

    myelinMeshes.forEach((m) => {
      m.visible = state.myelinated;
    });

    const pill = document.getElementById('infoConductionPill');
    pill.textContent = state.myelinated ? '⚡ 跳躍傳導已啟用 (高速)' : '🐢 無髓鞘連續傳導 (慢速)';
    stimulateReceptor();
  });
});

// Bottom Bar: Synaptic Gate / Pharmacology Simulator
document.querySelectorAll('#synapseGateGroup .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#synapseGateGroup .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.synapseGate = btn.dataset.gate;
    stimulateReceptor();
  });
});

// View Toggles
const btnToggleLabels = document.getElementById('btnToggleLabels');
btnToggleLabels.addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  btnToggleLabels.classList.toggle('active', state.showLabels);
});

const btnToggleRotate = document.getElementById('btnToggleRotate');
btnToggleRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  controls.autoRotateSpeed = 1.1;
  btnToggleRotate.classList.toggle('active', state.autoRotate);
});

// ----------------------------------------------------------------------------
// Collapsible side panels + viewport re-centering
// The 3D scene is shifted (camera view offset) so it stays centered in the
// free area between the visible panels instead of hiding behind them.
// ----------------------------------------------------------------------------
const leftPanelEl = document.getElementById('controlSidebar');
const rightPanelEl = document.getElementById('infoPanel');
const btnToggleLeft = document.getElementById('toggleLeftPanel');
const btnToggleRight = document.getElementById('toggleRightPanel');
const viewOffset = { current: 0, target: 0 };

function computeViewOffsetTarget() {
  const narrow = window.innerWidth <= 900;
  const L = !narrow && !leftPanelEl.classList.contains('collapsed') ? leftPanelEl.offsetWidth + 16 : 0;
  const R = !narrow && !rightPanelEl.classList.contains('collapsed') ? rightPanelEl.offsetWidth + 16 : 0;
  // Shift image right by (L - R) / 2 so it is centered in the free area
  viewOffset.target = -(L - R) / 2;
}

function applyViewOffset() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.setViewOffset(w, h, viewOffset.current, 0, w, h);
}

function setPanelCollapsed(side, collapsed) {
  if (side === 'left') {
    leftPanelEl.classList.toggle('collapsed', collapsed);
    btnToggleLeft.classList.toggle('is-collapsed', collapsed);
    btnToggleLeft.textContent = collapsed ? '控制台 ▶' : '◀ 控制台';
  } else {
    rightPanelEl.classList.toggle('collapsed', collapsed);
    btnToggleRight.classList.toggle('is-collapsed', collapsed);
    btnToggleRight.textContent = collapsed ? '◀ 資訊' : '資訊 ▶';
  }
  computeViewOffsetTarget();
}

btnToggleLeft.addEventListener('click', () => {
  setPanelCollapsed('left', !leftPanelEl.classList.contains('collapsed'));
});
btnToggleRight.addEventListener('click', () => {
  setPanelCollapsed('right', !rightPanelEl.classList.contains('collapsed'));
});

// Default: keep the control console, collapse the info panel to give the 3D view more room
setPanelCollapsed('right', true);
if (window.innerWidth < 1100) setPanelCollapsed('left', true);
viewOffset.current = viewOffset.target;
applyViewOffset();

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') selectNode('overview');
  else if (e.key === 'l' || e.key === 'L') btnToggleLabels.click();
  else if (e.key === 'r' || e.key === 'R') btnToggleRotate.click();
  else if (e.key === '[') btnToggleLeft.click();
  else if (e.key === ']') btnToggleRight.click();
  else if (e.key === ' ') {
    e.preventDefault();
    stimulateReceptor();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  computeViewOffsetTarget();
  viewOffset.current = viewOffset.target;
  applyViewOffset(); // also updates projection matrix
});

// ============================================================================
// 10. MAIN ANIMATION & BIOPHYSICS LOOP
// ============================================================================
const clock = new THREE.Clock();
let autoStimAccumulator = 0;
let holdAccumulator = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  // 1) Continuous Stimulus Frequency Generator
  if (state.stimFrequency > 0) {
    autoStimAccumulator += dt;
    const interval = 1.0 / (state.stimFrequency * 0.45);
    if (autoStimAccumulator >= interval) {
      autoStimAccumulator = 0;
      stimulateReceptor();
    }
  }

  // Hold Muscle / Hold Gland sustained firing
  if (state.holdMuscle || state.holdGland) {
    holdAccumulator += dt;
    if (holdAccumulator >= 0.32) {
      holdAccumulator = 0;
      if (state.holdMuscle) stimulateMuscleMotorNeuron();
      if (state.holdGland) stimulateGlandMotorNeuron();
    }
  }

  // 2) Update Receptor Shockwave Ring
  if (stimWaveMat.opacity > 0.01) {
    stimWaveMesh.scale.addScalar(dt * 4.5);
    stimWaveMat.opacity = Math.max(0, stimWaveMat.opacity - dt * 1.8);
  }

  // 3) Update Traveling Action Potential Pulses along axons
  for (let i = state.pulses.length - 1; i >= 0; i--) {
    const p = state.pulses[i];
    // Saltatory conduction hops faster across myelinated segments and briefly pauses at Nodes of Ranvier
    let speedFactor = p.speed;
    if (p.saltatory) {
      const hopWave = Math.sin(p.t * Math.PI * 10);
      speedFactor *= (1.15 + 0.55 * Math.abs(hopWave));
    }
    p.t += dt * speedFactor;

    if (p.t >= 1.0) {
      pulseContainer.remove(p.mesh);
      state.pulses.splice(i, 1);
      if (p.onArrive) p.onArrive();
    } else {
      const pt = p.curve.getPoint(p.t);
      p.mesh.position.copy(pt);
      // Slight scale pulse at Nodes of Ranvier during saltatory conduction
      const s = p.saltatory ? 1.0 + 0.28 * Math.sin(p.t * Math.PI * 10) : 1.0;
      p.mesh.scale.setScalar(s);
    }
  }

  // 4) Update Synaptic Neurotransmitter Bursts
  for (let i = state.synapseBursts.length - 1; i >= 0; i--) {
    const b = state.synapseBursts[i];
    b.life += dt;
    if (b.life >= b.maxLife) {
      releaseParticle(b.mesh);
      state.synapseBursts.splice(i, 1);
    } else {
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.material.opacity = 1.0 - b.life / b.maxLife;
    }
  }

  // 5) Update Skeletal Muscle Contraction Biomechanics & Ca2+ Sparks
  if (state.holdMuscle && state.synapseGate !== 'block-muscle') {
    state.muscleTarget = 0.95;
  } else {
    state.muscleTarget = Math.max(0, state.muscleTarget - dt * 0.72);
  }
  state.muscleTension += (state.muscleTarget - state.muscleTension) * Math.min(1, dt * 8.5);

  // Physically shorten muscle length (X) and bulge belly diameter (Y, Z)
  const c = state.muscleTension;
  muscleBellyGroup.scale.set(1.0 - c * 0.24, 1.0 + c * 0.32, 1.0 + c * 0.32);
  // Flex the attached forearm bone lever upward!
  forearmPivot.rotation.z = c * 0.78;
  muscleFiberMat.emissiveIntensity = 0.32 + c * 0.65;

  // Update Muscle Sparks
  for (let i = state.muscleSparks.length - 1; i >= 0; i--) {
    const sp = state.muscleSparks[i];
    sp.life += dt;
    if (sp.life >= sp.maxLife) {
      releaseParticle(sp.mesh);
      state.muscleSparks.splice(i, 1);
    } else {
      sp.mesh.position.addScaledVector(sp.vel, dt);
      sp.mesh.material.opacity = 1.0 - sp.life / sp.maxLife;
    }
  }

  // Update Muscle UI Meter
  const musPct = Math.round(c * 100);
  setWidth('muscleBarFill', musPct);
  const musValEl = document.getElementById('muscleTensionVal');
  const musTextEl = document.getElementById('muscleStateText');
  if (state.synapseGate === 'block-muscle') {
    setText(musValEl, '突觸阻斷 (0%)');
    setText(musTextEl, '⚠️ 運動終板 ACh 受體被阻斷，肌纖維無法去極化收縮');
  } else if (musPct > 65) {
    setText(musValEl, `強直收縮 (${musPct}%)`);
    setText(musTextEl, '🔥 Ca²⁺ 大量結合肌鈣蛋白，粗細肌絲滑動拉動骨骼彎曲！');
  } else if (musPct > 10) {
    setText(musValEl, `收縮中 (${musPct}%)`);
    setText(musTextEl, '⚡ 運動終板釋放乙醯膽鹼 (ACh)，肌節縮短產生張力');
  } else {
    setText(musValEl, '舒張 (0%)');
    setText(musTextEl, '肌節長度正常 · 等待乙醯膽鹼 (ACh) 與 Ca²⁺ 釋放');
  }

  // 6) Update Secretory Gland Pulsation & Exocytosis Droplets
  if (state.holdGland && state.synapseGate !== 'block-gland') {
    state.glandTarget = 0.95;
  } else {
    state.glandTarget = Math.max(0, state.glandTarget - dt * 0.62);
  }
  state.glandSecretion += (state.glandTarget - state.glandSecretion) * Math.min(1, dt * 7.5);

  const g = state.glandSecretion;
  acinarMat.emissiveIntensity = 0.35 + g * 0.75;
  acinarCells.forEach((cell, idx) => {
    const squeeze = 1.0 + g * 0.16 * Math.sin(elapsed * 11 + idx);
    cell.scale.setScalar(squeeze);
  });

  // Update Gland Secretory Droplets streaming out of duct
  for (let i = state.glandDroplets.length - 1; i >= 0; i--) {
    const dr = state.glandDroplets[i];
    dr.life += dt;
    if (dr.life >= dr.maxLife) {
      releaseParticle(dr.mesh);
      state.glandDroplets.splice(i, 1);
    } else {
      dr.mesh.position.addScaledVector(dr.vel, dt);
      dr.mesh.material.opacity = 1.0 - (dr.life / dr.maxLife) * 0.85;
    }
  }

  // Update Gland UI Meter
  const gldPct = Math.round(g * 100);
  setWidth('glandBarFill', gldPct);
  const gldValEl = document.getElementById('glandSecretionVal');
  const gldTextEl = document.getElementById('glandStateText');
  if (state.synapseGate === 'block-gland') {
    setText(gldValEl, '受體阻斷 (0%)');
    setText(gldTextEl, '⚠️ 模擬阿托品阻斷自主神經受體，腺泡停止胞吐分泌');
  } else if (gldPct > 60) {
    setText(gldValEl, `旺盛分泌 (${gldPct}%)`);
    setText(gldTextEl, '💧 腺泡細胞內 Ca²⁺ 激增，分泌囊泡大量胞吐排出液滴！');
  } else if (gldPct > 10) {
    setText(gldValEl, `分泌中 (${gldPct}%)`);
    setText(gldTextEl, '🌿 自主運動神經釋放傳遞物質，促進分泌液滴進入導管');
  } else {
    setText(gldValEl, '基礎 (0%)');
    setText(gldTextEl, '腺泡囊泡待命 · 等待自主神經元訊號觸發胞吐作用');
  }

  // 7) Substructure Flash Highlight (restores original glow when done)
  if (state.flashKey) {
    const meshes = subGroups[state.flashKey] || [];
    state.flashTimer -= dt;
    const done = state.flashTimer <= 0;
    const pulseGlow = 0.55 + 0.45 * Math.sin(elapsed * 14);
    meshes.forEach((m) => {
      const mat = m.material;
      if (!mat || !mat.emissive) return;
      if (mat.userData.baseGlow === undefined) mat.userData.baseGlow = mat.emissiveIntensity;
      mat.emissiveIntensity = done ? mat.userData.baseGlow : 0.4 + pulseGlow * 0.9;
    });
    if (done) state.flashKey = null;
  }

  // 8) Camera Smooth Animation
  if (camAnim.active) {
    camera.position.lerp(camAnim.pos, Math.min(1, dt * 4.5));
    controls.target.lerp(camAnim.target, Math.min(1, dt * 4.5));
    if (camera.position.distanceTo(camAnim.pos) < 0.08 && controls.target.distanceTo(camAnim.target) < 0.08) {
      camAnim.active = false;
    }
  }

  if (Math.abs(viewOffset.target - viewOffset.current) > 0.5) {
    viewOffset.current += (viewOffset.target - viewOffset.current) * Math.min(1, dt * 7);
    applyViewOffset();
  }

  controls.update();
  processHover(dt);
  updatePinLabels();
  updateOscilloscope(dt);
  renderer.render(scene, camera);
}

// Initialize UI & fire an initial welcome nerve impulse!
initPinLabels();
populateNodeDirectory();
selectNode('overview');
setTimeout(() => {
  stimulateReceptor();
}, 450);
animate();

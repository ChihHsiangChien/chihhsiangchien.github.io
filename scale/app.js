/**
 * 宇宙尺度探索 (Scale of the Universe: High-Precision Scientific Illustration Edition)
 * Pure HTML5 Canvas + Vanilla JS (No Node.js required)
 */

(function () {
  const canvas = document.getElementById('zoomCanvas');
  const ctx = canvas.getContext('2d');

  // Scale range: 10^11.2 m (Solar System) down to 10^-15.2 m (Atomic Nucleus & Quarks)
  const MAX_LOG_SCALE = 11.2;
  const MIN_LOG_SCALE = -15.2;

  let currentLogScale = 7.1; // Start at Planet Earth
  let targetLogScale = 7.1;
  let isAutoTour = false;
  let autoTourDirection = -1;
  let animTime = 0;

  // Pre-generated background starfield & nebula dust
  const stars = Array.from({ length: 280 }, () => ({
    angle: Math.random() * Math.PI * 2,
    dist: 0.03 + Math.random() * 0.97,
    size: 0.5 + Math.random() * 1.9,
    alpha: 0.25 + Math.random() * 0.75,
    hue: Math.random() > 0.65 ? 205 : Math.random() > 0.35 ? 42 : 275
  }));

  // Pre-generated surrounding epithelial cells for tissue layer (deterministic radial layout)
  const tissueCells = [];
  const rings = [
    { count: 1, r: 0 },
    { count: 6, r: 0.23 },
    { count: 12, r: 0.45 },
    { count: 18, r: 0.68 },
    { count: 24, r: 0.91 }
  ];
  rings.forEach((ring, rIdx) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.27;
      const dist = ring.r + (rIdx > 0 ? Math.sin(i * 3.7 + rIdx) * 0.018 : 0);
      const vertices = [];
      const sides = 7;
      for (let v = 0; v < sides; v++) {
        const va = (v / sides) * Math.PI * 2;
        const vr = 0.115 * (0.88 + 0.18 * Math.cos(v * 2.3 + i + rIdx));
        vertices.push({ a: va, r: vr });
      }
      tissueCells.push({
        cx: Math.cos(a) * dist,
        cy: Math.sin(a) * dist,
        isCenter: rIdx === 0,
        vertices,
        hueOffset: Math.sin(i * 1.9 + rIdx) * 10
      });
    }
  });

  // Milestones Metadata
  const milestones = [
    {
      id: 'solar',
      name: '行星與太陽系',
      en: 'Solar System & Planetary Orbits',
      icon: '🪐',
      logScale: 10.8,
      category: '天文尺度 · Astronomical',
      sizeText: '≈ 1.5 × 10¹¹ m (1 AU 日地距離)',
      desc: '地球繞行太陽的公轉軌道尺度。熾熱的太陽日冕向外輻射太陽光，水星、金星、地球與火星沿著橢圓軌道運行，視野正中央即為地月系統。',
      tags: ['太陽日冕', '內行星軌道', '天文單位 (1 AU)', '萬有引力']
    },
    {
      id: 'earth-moon',
      name: '地月軌道系統',
      en: 'Earth–Moon System',
      icon: '🌙',
      logScale: 8.8,
      category: '行星尺度 · Planetary',
      sizeText: '3.84 × 10⁸ m (384,400 km)',
      desc: '月球以約 38.4 萬公里的平均距離繞行地球。月球表面的玄武岩月海與撞擊坑清晰可見，引力與潮汐力在此尺度下牽動著地球海洋。',
      tags: ['月球軌道', '月海與隕石坑', '潮汐鎖定', '地月引力']
    },
    {
      id: 'earth',
      name: '地球',
      en: 'Planet Earth',
      icon: '🌍',
      logScale: 7.1,
      category: '行星尺度 · Planetary',
      sizeText: '1.27 × 10⁷ m (直徑 12,742 km)',
      desc: '孕育生命的藍色行星。深淺海洋、歐亞大陸與臺灣島嶼地形、氣旋雲系以及瑞利散射的湛藍大氣層交織。繼續放大將穿過雲層進入臺灣地景。',
      tags: ['瑞利散射大氣', '歐亞與臺灣陸塊', '氣旋雲系', '海洋水圈']
    },
    {
      id: 'landscape',
      name: '島嶼與城市地景',
      en: 'Island & Natural Landscape',
      icon: '🏞️',
      logScale: 3.5,
      category: '地理尺度 · Geographical',
      sizeText: '≈ 3 × 10³ m (3 公里視野)',
      desc: '穿過大氣雲層俯瞰翠綠山脈等高線、蜿蜒河谷、跨河橋樑與城市公園綠地。在中央圓形廣場的步道上，一個人類正佇立於畫面中心。',
      tags: ['地形等高線', '山脈與河谷', '城市綠地', '生態棲地']
    },
    {
      id: 'human',
      name: '人體',
      en: 'Human Body & Circulatory System',
      icon: '🧍',
      logScale: 0.2,
      category: '日常尺度 · Human Scale',
      sizeText: '1.7 × 10⁰ m (約 1.7 公尺)',
      desc: '生物醫學透視下的人體尺度。可見胸腔肋骨、脊椎、跳動的四腔室心臟，以及分支延伸至全身與中央手掌的動靜脈血管與神經脈衝網絡。',
      tags: ['解剖透視', '心臟與動靜脈', '神經脈衝', '37 兆細胞']
    },
    {
      id: 'tissue',
      name: '皮膚組織與微血管',
      en: 'Epithelial Tissue & Capillaries',
      icon: '🔬',
      logScale: -3.0,
      category: '組織尺度 · Histological',
      sizeText: '1.0 × 10⁻³ m (1 毫米 mm)',
      desc: '組織學顯微鏡視野。多角形鱗狀表皮細胞緊密排列，周圍分支的微血管網中可見雙凹圓盤狀紅血球與白血球正排隊流經血管腔。',
      tags: ['鱗狀表皮組織', '微血管網', '雙凹紅血球', '細胞外基質']
    },
    {
      id: 'neuron',
      name: '神經細胞',
      en: 'Multipolar Neuron & Myelin Sheath',
      icon: '⚡',
      logScale: -3.8,
      category: '特化細胞 · Neural Cell',
      sizeText: '1.5 × 10⁻⁴ m (細胞體 ≈ 100~150 μm)',
      desc: '負責傳遞生物電訊號的運動神經元。星狀細胞本體（含尼氏體與細胞核）向外延伸出繁密的樹突接收訊息，長軸突則由許旺細胞髓鞘包覆，透過蘭氏結進行跳躍式傳導。',
      tags: ['樹突與軸突', '髓鞘與蘭氏結', '動作電位脈衝', '突觸傳遞']
    },
    {
      id: 'muscle',
      name: '肌肉細胞',
      en: 'Skeletal Muscle Fiber (Myocyte)',
      icon: '💪',
      logScale: -4.2,
      category: '特化細胞 · Muscle Cell',
      sizeText: '6.0 × 10⁻⁵ m (直徑 ≈ 50~80 μm)',
      desc: '細長圓柱狀的骨骼肌纖維細胞。由多個肌動蛋白（細肌絲）與肌凝蛋白（粗肌絲）規律排列成肌小節，在顯微鏡下呈現鮮明的明帶（I 帶）、暗帶（A 帶）與 Z 線橫紋，並具有多個位於邊緣的細胞核。',
      tags: ['明暗橫紋肌小節', '粗細肌絲滑動', '多細胞核構造', '肌原纖維']
    },
    {
      id: 'cheek-cell',
      name: '口腔皮膜細胞',
      en: 'Human Cheek Squamous Epithelial Cell',
      icon: '🧫',
      logScale: -4.5,
      category: '微觀生命 · Epithelial Cell',
      sizeText: '4.5 × 10⁻⁵ m (直徑 ≈ 40~50 μm)',
      desc: '生物實驗最經典的人類口腔皮膜細胞。呈扁平不規則多邊形，外圍為具彈性的細胞膜（無細胞壁），亞甲藍液染色後可見微細顆粒狀細胞質與正中央染成深色的明顯細胞核。',
      tags: ['扁平不規則多邊形', '細胞膜與細胞質', '染色細胞核', '保護表皮構造']
    },
    {
      id: 'cell',
      name: '動物細胞胞器',
      en: 'Eukaryotic Cell Organelles',
      icon: '🦠',
      logScale: -4.8,
      category: '微觀生命 · Cellular Ultrastructure',
      sizeText: '1.6 × 10⁻⁵ m (16 微米 μm)',
      desc: '真核動物細胞的精密超微結構：雙層磷脂細胞膜、內膜皺摺的粒線體、附著核糖體的粗糙內質網、高基氏體、微管骨架與中央細胞核。',
      tags: ['雙層磷脂膜', '粒線體內膜皺摺', '粗糙內質網', '高基氏體']
    },
    {
      id: 'rbc',
      name: '紅血球',
      en: 'Red Blood Cell (Erythrocyte)',
      icon: '🩸',
      logScale: -5.1,
      category: '血液細胞 · Blood Cell',
      sizeText: '7.5 × 10⁻⁶ m (直徑 ≈ 7~8 μm)',
      desc: '高度特化的雙凹圓盤狀血液細胞。成熟的人類紅血球沒有細胞核與粒線體，以便騰出最大空間容納約 2.7 億個血紅素（Hemoglobin）分子，並增加表面積以利氧氣與二氧化碳快速擴散交換。',
      tags: ['雙凹圓盤狀', '成熟無細胞核', '血紅素攜氧', '微血管變形通過']
    },
    {
      id: 'nucleus',
      name: '細胞核與染色體',
      en: 'Cell Nucleus & Chromosomes',
      icon: '🧬',
      logScale: -5.3,
      category: '細胞器尺度 · Organelle',
      sizeText: '5.0 × 10⁻⁶ m (5 微米 μm)',
      desc: '細胞的基因控制中樞。雙層核膜上鑲嵌著八角形核孔複合體 (NPC)，內部可見濃密的核仁、帶狀條紋的 X 型染色體與纏繞組蛋白的染色質纖維。',
      tags: ['核孔複合體', '核仁 (Nucleolus)', 'X 型染色體', '組蛋白核小體']
    },
    {
      id: 'ecoli',
      name: '大腸桿菌',
      en: 'Escherichia coli Bacterium',
      icon: '🥖',
      logScale: -5.7,
      category: '原核生物 · Prokaryote',
      sizeText: '2.0 × 10⁻⁶ m (長約 2 μm × 寬 0.8 μm)',
      desc: '典型的原核生物桿菌，體積僅約真核細胞的千分之一。外層具莢膜、多胜聚醣細胞壁、大量短線毛（Pili）與擺動推進的長鞭毛（Flagella）；內部無核膜，遺傳物質為濃縮於擬核區的環狀 DNA 與小型質體。',
      tags: ['原核無核膜', '多胜聚醣細胞壁', '鞭毛與線毛', '擬核環狀 DNA 與質體']
    },
    {
      id: 'virus',
      name: '病毒與噬菌體',
      en: 'Viruses: Enveloped Virus & Bacteriophage',
      icon: '👾',
      logScale: -7.0,
      category: '介於生物與非生物 · Viral Scale',
      sizeText: '1.0 × 10⁻⁷ m (100 奈米 nm)',
      desc: '比細菌還要小約 20 倍的生命邊界粒子！必須仰賴電子顯微鏡才能觀測。本身無細胞結構與代謝系統，僅由蛋白質衣殼（二十面體結構或鑲嵌棘蛋白的脂雙層套膜）包裹內部的 DNA 或 RNA 核酸分子組成。',
      tags: ['蛋白質衣殼', '表面棘蛋白', 'T4 噬菌體構造', '100 奈米 (nm)']
    },
    {
      id: 'dna',
      name: 'DNA 雙股螺旋分子',
      en: '3D DNA Double Helix',
      icon: '🧪',
      logScale: -8.5,
      category: '分子尺度 · Molecular',
      sizeText: '2.0 × 10⁻⁹ m (螺旋直徑 2 奈米 nm)',
      desc: '立體去氧核糖核酸分子。兩條去氧核糖-磷酸骨架呈反向平行右旋纏繞，內部鹼基對 (A=T 雙氫鍵、G≡C 三氫鍵) 精密配對，中心聚焦於骨架上的碳原子。',
      tags: ['3D 雙股螺旋', '磷酸去氧核糖骨架', 'A-T / G-C 氫鍵', '共價鍵結構']
    },
    {
      id: 'atom',
      name: '碳原子與電子雲',
      en: 'Carbon-12 Atom & Quantum Orbitals',
      icon: '⚛️',
      logScale: -10.0,
      category: '原子尺度 · Quantum Atomic',
      sizeText: '1.4 × 10⁻¹⁰ m (1.4 埃 Å / 140 pm)',
      desc: '碳-12 原子的量子力學模型。展示球對稱的 1s、2s 軌域與啞鈴形 2pₓ、2pᵧ、2p₂ 電子機率雲，6 顆電子伴隨德布羅意物質波高速運行。',
      tags: ['1s/2s/2p 量子軌域', '電子機率雲', '物質波軌跡', '皮米 (pm)']
    },
    {
      id: 'atomic-nucleus',
      name: '原子核與夸克',
      en: 'Atomic Nucleus, Gluons & Quarks',
      icon: '✨',
      logScale: -14.5,
      category: '亞原子尺度 · Subatomic QCD',
      sizeText: '3.0 × 10⁻¹⁵ m (3 飛米 fm)',
      desc: '由 6 顆質子與 6 顆中子緊密簇擁的碳原子核。核子內部由紅、綠、藍三種色荷的上下夸克 (uud / udd) 組成，並透過螺旋狀膠子場 (Gluons) 傳遞強核力。',
      tags: ['質子 (uud) 與中子 (udd)', '夸克色荷禁閉', '膠子強核力場', '飛米 (fm)']
    }
  ];

  // DOM References
  const scalePowerText = document.getElementById('scalePowerText');
  const scaleHumanText = document.getElementById('scaleHumanText');
  const milestonesNav = document.getElementById('milestonesNav');
  const infoCategory = document.getElementById('infoCategory');
  const infoTitle = document.getElementById('infoTitle');
  const infoSubtitle = document.getElementById('infoSubtitle');
  const infoSizeVal = document.getElementById('infoSizeVal');
  const infoDesc = document.getElementById('infoDesc');
  const infoTags = document.getElementById('infoTags');
  const scaleSlider = document.getElementById('scaleSlider');
  const btnAutoTour = document.getElementById('btnAutoTour');
  const autoTourIcon = document.getElementById('autoTourIcon');
  const autoTourLabel = document.getElementById('autoTourLabel');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const scaleBarGraphic = document.getElementById('scaleBarGraphic');
  const scaleBarLabel = document.getElementById('scaleBarLabel');

  // Populate Milestones Navigation
  const milestoneButtons = [];
  milestones.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'milestone-btn';
    btn.innerHTML = `
      <span class="milestone-icon">${m.icon}</span>
      <span class="milestone-meta">
        <span class="milestone-name">${m.name}</span>
        <span class="milestone-exp">10<sup>${m.logScale}</sup> m</span>
      </span>
    `;
    btn.addEventListener('click', () => {
      stopAutoTour();
      targetLogScale = m.logScale;
    });
    milestonesNav.appendChild(btn);
    milestoneButtons.push({ btn, milestone: m });
  });

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function logScaleToSlider(logVal) {
    const ratio = (MAX_LOG_SCALE - logVal) / (MAX_LOG_SCALE - MIN_LOG_SCALE);
    return Math.round(Math.max(0, Math.min(1, ratio)) * 1000);
  }

  function sliderToLogScale(sliderVal) {
    const ratio = sliderVal / 1000;
    return MAX_LOG_SCALE - ratio * (MAX_LOG_SCALE - MIN_LOG_SCALE);
  }

  // Controls & Interaction
  scaleSlider.addEventListener('input', (e) => {
    stopAutoTour();
    targetLogScale = sliderToLogScale(parseFloat(e.target.value));
  });

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.target.closest('.milestones-nav')) return;
      e.preventDefault();
      stopAutoTour();
      const delta = e.deltaY * 0.0042;
      targetLogScale = Math.max(MIN_LOG_SCALE, Math.min(MAX_LOG_SCALE, targetLogScale - delta));
    },
    { passive: false }
  );

  let isDragging = false;
  let lastY = 0;
  let lastPinchDist = null;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    stopAutoTour();
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    targetLogScale = Math.max(MIN_LOG_SCALE, Math.min(MAX_LOG_SCALE, targetLogScale + dy * 0.025));
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    },
    { passive: true }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      stopAutoTour();
      if (e.touches.length === 1 && isDragging) {
        const dy = e.touches[0].clientY - lastY;
        lastY = e.touches[0].clientY;
        targetLogScale = Math.max(MIN_LOG_SCALE, Math.min(MAX_LOG_SCALE, targetLogScale + dy * 0.03));
      } else if (e.touches.length === 2 && lastPinchDist !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / lastPinchDist;
        lastPinchDist = dist;
        targetLogScale = Math.max(
          MIN_LOG_SCALE,
          Math.min(MAX_LOG_SCALE, targetLogScale - Math.log10(ratio) * 3.5)
        );
      }
    },
    { passive: false }
  );

  canvas.addEventListener('touchend', () => {
    isDragging = false;
    lastPinchDist = null;
  });

  function toggleAutoTour() {
    isAutoTour = !isAutoTour;
    if (isAutoTour) {
      if (targetLogScale <= MIN_LOG_SCALE + 0.5) autoTourDirection = 1;
      else if (targetLogScale >= MAX_LOG_SCALE - 0.5) autoTourDirection = -1;
      btnAutoTour.classList.add('active');
      autoTourIcon.textContent = '⏸';
      autoTourLabel.textContent = '暫停導覽';
    } else {
      stopAutoTour();
    }
  }

  function stopAutoTour() {
    if (!isAutoTour) return;
    isAutoTour = false;
    btnAutoTour.classList.remove('active');
    autoTourIcon.textContent = '▶';
    autoTourLabel.textContent = '自動深入導覽';
  }

  btnAutoTour.addEventListener('click', toggleAutoTour);
  btnZoomIn.addEventListener('click', () => {
    stopAutoTour();
    targetLogScale = Math.max(MIN_LOG_SCALE, targetLogScale - 1.2);
  });
  btnZoomOut.addEventListener('click', () => {
    stopAutoTour();
    targetLogScale = Math.min(MAX_LOG_SCALE, targetLogScale + 1.2);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggleAutoTour();
    } else if (e.code === 'ArrowDown' || e.key === '+' || e.key === '=') {
      stopAutoTour();
      targetLogScale = Math.max(MIN_LOG_SCALE, targetLogScale - 0.8);
    } else if (e.code === 'ArrowUp' || e.key === '-') {
      stopAutoTour();
      targetLogScale = Math.min(MAX_LOG_SCALE, targetLogScale + 0.8);
    }
  });

  function formatScaleReadout(logM) {
    const meters = Math.pow(10, logM);
    if (logM >= 9) {
      const mKm = meters / 1e9;
      return `≈ ${mKm.toFixed(mKm < 10 ? 2 : 0)} 百萬公里 (10⁶ km)`;
    } else if (logM >= 3) {
      const km = meters / 1e3;
      return `≈ ${km >= 100 ? Math.round(km).toLocaleString() : km.toFixed(1)} 公里 (km)`;
    } else if (logM >= -0.5) {
      return `≈ ${meters >= 10 ? Math.round(meters) : meters.toFixed(2)} 公尺 (m)`;
    } else if (logM >= -2.5) {
      return `≈ ${(meters * 100).toFixed(1)} 公分 (cm)`;
    } else if (logM >= -3.5) {
      return `≈ ${(meters * 1e3).toFixed(2)} 毫米 (mm)`;
    } else if (logM >= -6.5) {
      const um = meters * 1e6;
      return `≈ ${um >= 10 ? Math.round(um) : um.toFixed(2)} 微米 (μm)`;
    } else if (logM >= -9.5) {
      const nm = meters * 1e9;
      return `≈ ${nm >= 10 ? Math.round(nm) : nm.toFixed(2)} 奈米 (nm)`;
    } else if (logM >= -12.5) {
      const pm = meters * 1e12;
      return `≈ ${pm >= 10 ? Math.round(pm) : pm.toFixed(1)} 皮米 (pm)`;
    } else {
      return `≈ ${(meters * 1e15).toFixed(2)} 飛米 (fm)`;
    }
  }

  function formatUnitShort(exp) {
    const val = Math.pow(10, exp);
    if (exp >= 6) return `${(val / 1e3).toLocaleString()} km`;
    if (exp >= 3) return `${val / 1e3} km`;
    if (exp >= 0) return `${val} m`;
    if (exp === -1) return `10 cm`;
    if (exp === -2) return `1 cm`;
    if (exp >= -3) return `${val * 1e3} mm`;
    if (exp >= -6) return `${Math.round(val * 1e6)} μm`;
    if (exp >= -9) return `${Math.round(val * 1e9)} nm`;
    if (exp >= -12) return `${Math.round(val * 1e12)} pm`;
    return `${Math.round(val * 1e15)} fm`;
  }

  let activeMilestoneId = null;

  function updateHUD() {
    scalePowerText.innerHTML = `10<sup>${currentLogScale.toFixed(1)}</sup> m`;
    scaleHumanText.textContent = formatScaleReadout(currentLogScale);
    scaleSlider.value = logScaleToSlider(currentLogScale);

    const barExp = Math.floor(currentLogScale - 0.3);
    const frac = currentLogScale - 0.3 - barExp;
    const basePx = 140 / Math.pow(10, frac * 0.65);
    scaleBarGraphic.style.width = `${Math.round(basePx)}px`;
    scaleBarLabel.textContent = formatUnitShort(barExp);

    let closest = milestones[0];
    let minDiff = Math.abs(currentLogScale - closest.logScale);
    for (const m of milestones) {
      const d = Math.abs(currentLogScale - m.logScale);
      if (d < minDiff) {
        minDiff = d;
        closest = m;
      }
    }

    if (closest.id !== activeMilestoneId) {
      activeMilestoneId = closest.id;
      infoCategory.textContent = closest.category;
      infoTitle.textContent = closest.name;
      infoSubtitle.textContent = closest.en;
      infoSizeVal.textContent = closest.sizeText;
      infoDesc.textContent = closest.desc;
      infoTags.innerHTML = closest.tags.map((t) => `<span class="info-tag">${t}</span>`).join('');

      milestoneButtons.forEach(({ btn, milestone }) => {
        const isActive = milestone.id === closest.id;
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    }
  }

  const milestoneMap = new Map();
  milestones.forEach((m, idx) => milestoneMap.set(m.id, { ...m, index: idx }));

  function getLayerMetricsById(id, baseRadius) {
    const meta = milestoneMap.get(id);
    if (!meta) return { visible: false, alpha: 0, radius: 0, scale: 0, diff: 0 };

    const idx = meta.index;
    const refLog = meta.logScale;
    const diff = refLog - currentLogScale;

    // Distance to macro neighbor (zoomed out: currentLogScale > refLog => diff < 0)
    const macroLog = idx > 0 ? milestones[idx - 1].logScale : MAX_LOG_SCALE;
    const gapMacro = macroLog - refLog;

    // Distance to micro neighbor (zoomed in: currentLogScale < refLog => diff > 0)
    const microLog = idx < milestones.length - 1 ? milestones[idx + 1].logScale : MIN_LOG_SCALE;
    const gapMicro = refLog - microLog;

    let alpha = 0;

    if (diff <= 0) {
      // Zoomed out towards macro
      const dist = -diff;
      const fadeLimit = Math.min(gapMacro * 0.58, 2.0);
      const plateau = Math.min(gapMacro * 0.22, 0.6);
      if (dist >= fadeLimit) {
        return { visible: false, alpha: 0, radius: 0, scale: 0, diff };
      } else if (dist <= plateau) {
        alpha = 1;
      } else {
        const t = (dist - plateau) / (fadeLimit - plateau);
        alpha = 1 - t * t * (3 - 2 * t);
      }
    } else {
      // Zoomed in towards micro
      const dist = diff;
      const fadeLimit = Math.min(gapMicro * 0.58, 2.0);
      const plateau = Math.min(gapMicro * 0.22, 0.6);
      if (dist >= fadeLimit) {
        return { visible: false, alpha: 0, radius: 0, scale: 0, diff };
      } else if (dist <= plateau) {
        alpha = 1;
      } else {
        const t = (dist - plateau) / (fadeLimit - plateau);
        alpha = 1 - t * t * (3 - 2 * t);
      }
    }

    const scale = Math.pow(10, diff);
    const radius = baseRadius * scale;
    return { visible: alpha > 0.005, alpha, radius, scale, diff };
  }

  function getLayerMetrics(refLogScale, baseRadius, fadeOutBelow = 1.0, fadeOutAbove = 1.0) {
    const diff = refLogScale - currentLogScale;
    if (diff < -fadeOutBelow || diff > fadeOutAbove) {
      return { visible: false, alpha: 0, radius: 0, scale: 0, diff };
    }
    const scale = Math.pow(10, diff);
    const radius = baseRadius * scale;
    const plateauBelow = fadeOutBelow * 0.35;
    const plateauAbove = fadeOutAbove * 0.35;
    let alpha = 1;
    if (diff < -plateauBelow) {
      alpha = Math.max(0, 1 - (-plateauBelow - diff) / (fadeOutBelow - plateauBelow));
    } else if (diff > plateauAbove) {
      alpha = Math.max(0, 1 - (diff - plateauAbove) / (fadeOutAbove - plateauAbove));
    }
    return { visible: alpha > 0.01, alpha, radius, scale, diff };
  }

  // Scientific Callout Label Renderer
  function drawCallout(anchorX, anchorY, labelX, labelY, title, subtitle, alpha, color = '#38bdf8') {
    if (alpha <= 0.04) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Glowing anchor dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Angled technical leader line
    const elbowX = anchorX + (labelX - anchorX) * 0.45;
    const elbowY = labelY;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(labelX, labelY);
    ctx.stroke();

    // Label Box
    ctx.font = '600 12.5px Inter, sans-serif';
    const w1 = ctx.measureText(title).width;
    ctx.font = '11px JetBrains Mono, monospace';
    const w2 = subtitle ? ctx.measureText(subtitle).width : 0;
    const boxW = Math.max(w1, w2) + 22;
    const boxH = subtitle ? 38 : 24;

    ctx.fillStyle = 'rgba(8, 13, 26, 0.86)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(labelX - boxW / 2, labelY - boxH / 2, boxW, boxH, 7);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12.5px Inter, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(title, labelX, subtitle ? labelY - 7 : labelY);

    if (subtitle) {
      ctx.font = '10.5px JetBrains Mono, monospace';
      ctx.fillStyle = color;
      ctx.fillText(subtitle, labelX, labelY + 9);
    }
    ctx.restore();
  }

  // ============================================================================
  // HIGH-PRECISION SCIENTIFIC RENDERERS
  // ============================================================================

  // 0. Background & Logarithmic Polar Coordinate Grid
  function drawBackgroundAndGrid(w, h, cx, cy, minDim) {
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.hypot(cx, cy));
    if (currentLogScale > 4.5) {
      bgGrad.addColorStop(0, '#091326');
      bgGrad.addColorStop(0.55, '#040814');
      bgGrad.addColorStop(1, '#010308');
    } else if (currentLogScale > -1.5) {
      bgGrad.addColorStop(0, '#0a2236');
      bgGrad.addColorStop(0.6, '#05121e');
      bgGrad.addColorStop(1, '#02070d');
    } else if (currentLogScale > -7.5) {
      bgGrad.addColorStop(0, '#072429');
      bgGrad.addColorStop(0.6, '#041318');
      bgGrad.addColorStop(1, '#02080b');
    } else {
      bgGrad.addColorStop(0, '#160b2c');
      bgGrad.addColorStop(0.6, '#090415');
      bgGrad.addColorStop(1, '#030108');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Deep space stars / subatomic quantum field fluctuations
    const starVis =
      currentLogScale > 4
        ? Math.min(1, (currentLogScale - 4) / 2.5)
        : currentLogScale < -8
        ? Math.min(0.65, (-8 - currentLogScale) / 3)
        : 0.12;

    if (starVis > 0) {
      ctx.save();
      const zoomDrift = ((currentLogScale * 0.3) % 1 + 1) % 1;
      stars.forEach((s) => {
        const rRatio = (s.dist + zoomDrift) % 1;
        const r = rRatio * Math.hypot(cx, cy);
        const x = cx + Math.cos(s.angle) * r;
        const y = cy + Math.sin(s.angle) * r;
        ctx.fillStyle = `hsla(${s.hue}, 85%, 82%, ${s.alpha * starVis * Math.sin(rRatio * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Precision Logarithmic Scale Rings & Crosshair ticks
    const baseOrder = Math.floor(currentLogScale);
    const frac = currentLogScale - baseOrder;
    ctx.save();
    for (let i = -2; i <= 2; i++) {
      const ringOrder = baseOrder + i;
      const ringRadius = minDim * 0.28 * Math.pow(10, i - frac);
      if (ringRadius < 14 || ringRadius > minDim * 1.45) continue;

      const ringAlpha = Math.max(0, 0.16 * (1 - Math.abs(i - frac) / 2.2));
      ctx.strokeStyle = `rgba(125, 211, 252, ${ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(148, 163, 184, ${ringAlpha * 2.3})`;
      ctx.font = '10.5px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`10^${ringOrder} m`, cx + 7, cy - ringRadius + 13);
    }
    ctx.restore();
  }

  // 1. SOLAR SYSTEM (10^10.8 m)
  function drawSolarSystem(cx, cy, minDim) {
    const m = getLayerMetricsById('solar', minDim * 0.34);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;

    const sunAngle = -0.68;
    const auDist = m.radius;
    const sunX = cx + Math.cos(sunAngle) * auDist;
    const sunY = cy + Math.sin(sunAngle) * auDist;

    // Planetary orbits around the Sun
    const planets = [
      { name: '水星 Mercury', r: 0.39, speed: 0.9, phase: 0.8, size: 0.015, color: '#cbd5e1' },
      { name: '金星 Venus', r: 0.72, speed: 0.5, phase: 2.2, size: 0.024, color: '#fde68a' },
      { name: '地球軌道 (1 AU)', r: 1.0, speed: 0, phase: 0, size: 0, color: '#38bdf8', isEarth: true },
      { name: '火星 Mars', r: 1.52, speed: 0.28, phase: -1.3, size: 0.019, color: '#fb7185' },
      { name: '木星 Jupiter', r: 2.45, speed: 0.12, phase: 0.35, size: 0.048, color: '#fdba74' }
    ];

    planets.forEach((p) => {
      const orbR = auDist * p.r;
      ctx.beginPath();
      ctx.arc(sunX, sunY, orbR, 0, Math.PI * 2);
      ctx.strokeStyle = p.isEarth ? 'rgba(56, 189, 248, 0.55)' : 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = p.isEarth ? 1.8 : 1;
      ctx.stroke();

      if (!p.isEarth) {
        const ang = animTime * p.speed + p.phase;
        const px = sunX + Math.cos(ang) * orbR;
        const py = sunY + Math.sin(ang) * orbR;
        const pRad = Math.max(2.5, auDist * p.size);

        // Orbital motion gradient tail
        ctx.beginPath();
        ctx.arc(sunX, sunY, orbR, ang - 0.38, ang);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, pRad * 0.55);
        ctx.stroke();

        // 3D lit planet sphere facing the Sun
        const pGrad = ctx.createRadialGradient(
          px - Math.cos(ang) * pRad * 0.4,
          py - Math.sin(ang) * pRad * 0.4,
          pRad * 0.1,
          px,
          py,
          pRad
        );
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.35, p.color);
        pGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pRad, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Earth orbital motion arc approaching (cx, cy)
    const earthAngFromSun = Math.atan2(cy - sunY, cx - sunX);
    ctx.beginPath();
    ctx.arc(sunX, sunY, auDist, earthAngFromSun - 0.35, earthAngFromSun);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Detailed Blazing Sun with Corona Rays & Prominences
    const sunR = Math.max(10, auDist * 0.105);

    // Outer Solar Corona
    const coronaGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 3.4);
    coronaGrad.addColorStop(0, '#ffffff');
    coronaGrad.addColorStop(0.2, '#fef08a');
    coronaGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.65)');
    coronaGrad.addColorStop(0.75, 'rgba(234, 88, 12, 0.18)');
    coronaGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Solar prominence loops
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)';
    ctx.lineWidth = Math.max(1.2, sunR * 0.06);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + animTime * 0.25;
      const loopH = sunR * (1.18 + 0.15 * Math.sin(animTime * 2 + i * 1.7));
      ctx.beginPath();
      ctx.arc(
        sunX + Math.cos(a) * sunR * 0.85,
        sunY + Math.sin(a) * sunR * 0.85,
        loopH - sunR * 0.8,
        a - 0.8,
        a + 0.8
      );
      ctx.stroke();
    }

    // Photosphere core
    const coreGrad = ctx.createRadialGradient(
      sunX - sunR * 0.2,
      sunY - sunR * 0.2,
      sunR * 0.1,
      sunX,
      sunY,
      sunR
    );
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.6, '#fde047');
    coreGrad.addColorStop(0.9, '#f97316');
    coreGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    drawCallout(
      sunX,
      sunY - sunR,
      sunX,
      sunY - sunR * 2.2 - 18,
      '太陽 (Sun)',
      '距離地球 1.496×10¹¹ m (1 AU)',
      m.alpha,
      '#facc15'
    );
    if (m.alpha > 0.35) {
      drawCallout(
        cx,
        cy,
        cx + 105,
        cy - 68,
        '地球與月球系統',
        '縮放中心目標',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 2. EARTH-MOON ORBITAL SYSTEM (10^8.8 m)
  function drawEarthMoonSystem(cx, cy, minDim) {
    const m = getLayerMetricsById('earth-moon', minDim * 0.31);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // Gravitational hill sphere & telemetry ticks
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Main Lunar Orbit Path
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Orbiting Moon with Maria & Craters
    const moonAngle = animTime * 0.28 - 0.65;
    const mx = cx + Math.cos(moonAngle) * r;
    const my = cy + Math.sin(moonAngle) * r;
    const moonR = Math.max(5.5, r * 0.068);

    // Moon motion trail
    ctx.beginPath();
    ctx.arc(cx, cy, r, moonAngle - 0.28, moonAngle);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.clip();

    // Lunar sphere base
    const moonGrad = ctx.createRadialGradient(
      mx - moonR * 0.35,
      my - moonR * 0.35,
      moonR * 0.1,
      mx,
      my,
      moonR * 1.15
    );
    moonGrad.addColorStop(0, '#f8fafc');
    moonGrad.addColorStop(0.55, '#cbd5e1');
    moonGrad.addColorStop(0.85, '#475569');
    moonGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(mx - moonR, my - moonR, moonR * 2, moonR * 2);

    // Lunar Maria (dark basalt plains)
    ctx.fillStyle = 'rgba(51, 65, 85, 0.48)';
    const maria = [
      { dx: -0.25, dy: -0.2, rx: 0.32, ry: 0.24, rot: 0.3 },
      { dx: 0.18, dy: -0.1, rx: 0.25, ry: 0.2, rot: -0.4 },
      { dx: -0.1, dy: 0.22, rx: 0.22, ry: 0.16, rot: 0.1 }
    ];
    maria.forEach((mr) => {
      ctx.beginPath();
      ctx.ellipse(
        mx + mr.dx * moonR,
        my + mr.dy * moonR,
        mr.rx * moonR,
        mr.ry * moonR,
        mr.rot,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Impact craters
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.45)';
    ctx.lineWidth = Math.max(0.8, moonR * 0.04);
    ctx.beginPath();
    ctx.arc(mx + moonR * 0.15, my + moonR * 0.35, moonR * 0.14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    drawCallout(
      mx,
      my - moonR,
      mx,
      my - moonR - 34,
      '月球 (Moon)',
      '地月距離 384,400 km',
      m.alpha,
      '#e2e8f0'
    );

    ctx.restore();
  }

  // 3. PLANET EARTH (10^7.1 m) - Realistic Landmasses, Bathymetry, Clouds & Atmosphere
  function drawEarth(cx, cy, minDim) {
    const m = getLayerMetricsById('earth', minDim * 0.29);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Rayleigh Scattering Outer Atmosphere Glow
    const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.24);
    atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
    atmoGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.32)');
    atmoGrad.addColorStop(0.7, 'rgba(2, 132, 199, 0.08)');
    atmoGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = atmoGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.24, 0, Math.PI * 2);
    ctx.fill();

    // Clip to Earth Globe
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // 2. Deep Ocean & Sun Glint
    const oceanGrad = ctx.createRadialGradient(
      cx - r * 0.28,
      cy - r * 0.28,
      r * 0.05,
      cx,
      cy,
      r * 1.05
    );
    oceanGrad.addColorStop(0, '#0ea5e9');
    oceanGrad.addColorStop(0.25, '#0284c7');
    oceanGrad.addColorStop(0.65, '#075985');
    oceanGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Lat/Lon Graticule Lines (subtle scientific globe grid)
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.12)';
    ctx.lineWidth = Math.max(0.6, r * 0.004);
    for (let lat = -0.6; lat <= 0.6; lat += 0.3) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + lat * r, r * Math.cos(lat * 1.2), r * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let lon = -0.6; lon <= 0.6; lon += 0.3) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * Math.abs(lon), r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Helper to draw multi-point continent polygon with coastal shelf
    function drawContinentPoly(pts, fillStyle, shelfColor, ridgePts) {
      // Continental shelf shallow turquoise water
      if (shelfColor) {
        ctx.save();
        ctx.strokeStyle = shelfColor;
        ctx.lineWidth = r * 0.045;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(cx + px * r, cy + py * r);
          else ctx.lineTo(cx + px * r, cy + py * r);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      pts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(cx + px * r, cy + py * r);
        else ctx.lineTo(cx + px * r, cy + py * r);
      });
      ctx.closePath();
      ctx.fill();

      if (ridgePts) {
        ctx.fillStyle = 'rgba(161, 98, 7, 0.42)';
        ctx.beginPath();
        ridgePts.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(cx + px * r, cy + py * r);
          else ctx.lineTo(cx + px * r, cy + py * r);
        });
        ctx.closePath();
        ctx.fill();
      }
    }

    // Eurasian Continent (West & North-West of Taiwan)
    const eurasiaPts = [
      [-0.95, -0.45],
      [-0.55, -0.78],
      [-0.05, -0.82],
      [0.28, -0.65],
      [0.32, -0.42],
      [0.14, -0.25],
      [-0.08, -0.06], // South China coast near Taiwan
      [-0.18, 0.08],
      [-0.26, 0.25], // Indochina peninsula
      [-0.38, 0.18],
      [-0.58, 0.28], // India
      [-0.72, 0.08],
      [-0.92, 0.12]
    ];
    const tibetPts = [
      [-0.62, -0.18],
      [-0.32, -0.32],
      [-0.18, -0.16],
      [-0.42, -0.04]
    ];
    drawContinentPoly(eurasiaPts, '#15803d', 'rgba(45, 212, 191, 0.28)', tibetPts);

    // Taiwan Island right at (cx, cy) so zooming in lands directly on the island!
    const taiwanPts = [
      [0.015, -0.075],
      [0.042, -0.032],
      [0.032, 0.028],
      [0.008, 0.078],
      [-0.018, 0.045],
      [-0.028, -0.012],
      [-0.008, -0.058]
    ];
    const centralRangePts = [
      [0.01, -0.05],
      [0.024, 0.0],
      [0.006, 0.055],
      [-0.008, 0.01]
    ];
    drawContinentPoly(taiwanPts, '#22c55e', 'rgba(56, 189, 248, 0.45)', centralRangePts);

    // Japan Archipelago (North-East)
    const japanPts = [
      [0.16, -0.22],
      [0.26, -0.32],
      [0.34, -0.46],
      [0.39, -0.42],
      [0.3, -0.26],
      [0.19, -0.18]
    ];
    drawContinentPoly(japanPts, '#16a34a', 'rgba(45, 212, 191, 0.22)');

    // Philippines & Borneo (South)
    const philPts = [
      [0.02, 0.18],
      [0.08, 0.24],
      [0.11, 0.38],
      [0.04, 0.42],
      [-0.02, 0.3]
    ];
    drawContinentPoly(philPts, '#16a34a', 'rgba(45, 212, 191, 0.22)');

    // Australia (South-East)
    const ausPts = [
      [0.22, 0.58],
      [0.56, 0.52],
      [0.72, 0.72],
      [0.48, 0.92],
      [0.18, 0.78]
    ];
    drawContinentPoly(ausPts, '#ca8a04', 'rgba(45, 212, 191, 0.25)');

    // North Polar Ice Cap
    const polarGrad = ctx.createRadialGradient(cx, cy - r * 0.92, r * 0.05, cx, cy - r * 0.92, r * 0.35);
    polarGrad.addColorStop(0, 'rgba(248, 250, 252, 0.85)');
    polarGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
    ctx.fillStyle = polarGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.92, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 3. Swirling Atmospheric Cloud Systems & Typhoon Spiral
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineCap = 'round';
    for (let c = 0; c < 7; c++) {
      const a = c * 0.95 + animTime * 0.06;
      const cr = r * (0.28 + (c % 3) * 0.23);
      ctx.lineWidth = r * (0.022 + (c % 2) * 0.015);
      ctx.beginPath();
      ctx.arc(cx, cy, cr, a, a + 0.55);
      ctx.stroke();
    }

    // Pacific Cyclone spiral East of Taiwan
    const tyX = cx + r * 0.36;
    const tyY = cy + r * 0.08;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = r * 0.018;
    for (let arm = 0; arm < 3; arm++) {
      const baseA = (arm * Math.PI * 2) / 3 - animTime * 0.4;
      ctx.beginPath();
      for (let t = 0.02; t <= 0.16; t += 0.02) {
        const sa = baseA + t * 18;
        const sx = tyX + Math.cos(sa) * r * t;
        const sy = tyY + Math.sin(sa) * r * t;
        if (t === 0.02) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 4. 3D Spherical Terminator Shadow & Rim Lighting
    const shadowGrad = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.5,
      cx + r * 0.25,
      cy + r * 0.25,
      r * 1.15
    );
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0.18)');
    shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0.72)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Inner atmospheric fresnel rim
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    rimGrad.addColorStop(1, 'rgba(125, 211, 252, 0.55)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.7,
        cy - r * 0.7,
        cx + r * 0.98,
        cy - r * 0.92,
        '地球 (Planet Earth)',
        '直徑 12,742 km (1.27×10⁷ m)',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 4. ISLAND & NATURAL LANDSCAPE (10^3.5 m) - Topographical Contours, River, Bridges & Park Plaza
  function drawLandscape(cx, cy, minDim) {
    const m = getLayerMetricsById('landscape', minDim * 0.34);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Coastal Coral Reef & Forest Base
    const landGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
    landGrad.addColorStop(0, '#14532d');
    landGrad.addColorStop(0.45, '#166534');
    landGrad.addColorStop(0.75, '#15803d');
    landGrad.addColorStop(0.9, '#fef08a');
    landGrad.addColorStop(0.96, '#2dd4bf');
    landGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = landGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Topographical Elevation Contour Rings (Mountain ranges around valley)
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.25)';
    ctx.lineWidth = Math.max(1, r * 0.005);
    for (let k = 1; k <= 5; k++) {
      const cr = r * (0.22 + k * 0.13);
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.1) {
        const rad = cr * (1 + 0.08 * Math.sin(a * 4 + k) + 0.05 * Math.cos(a * 7 - k));
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 3. Meandering River & Tributary with Bridges
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    ctx.clip();

    // River bank sand
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
    ctx.lineWidth = Math.max(4, r * 0.075);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.95, cy - r * 0.38);
    ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.55, cx - r * 0.25, cy + r * 0.45, cx + r * 0.95, cy + r * 0.22);
    ctx.stroke();

    // River water
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = Math.max(2.5, r * 0.052);
    ctx.stroke();

    // Water shimmer highlight
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(1, r * 0.015);
    ctx.stroke();

    // Urban Road Grid & Park Boulevards radiating from Central Plaza
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
    ctx.lineWidth = Math.max(1, r * 0.01);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.06, cy + Math.sin(a) * r * 0.06);
      ctx.lineTo(cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65);
      ctx.stroke();
    }

    // Central Botanical Park Plaza (where the human stands at cx, cy)
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = Math.max(1.2, r * 0.008);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Trees around the central plaza
    for (let t = 0; t < 12; t++) {
      const ta = (t / 12) * Math.PI * 2;
      const tx = cx + Math.cos(ta) * r * 0.11;
      const ty = cy + Math.sin(ta) * r * 0.11;
      ctx.fillStyle = t % 2 === 0 ? '#15803d' : '#4ade80';
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.45,
        cy - r * 0.45,
        cx + r * 0.72,
        cy - r * 0.68,
        '島嶼地景與中央綠地',
        '視野 ≈ 3 km (10³.⁵ m)',
        m.alpha,
        '#4ade80'
      );
    }

    ctx.restore();
  }

  // 5. HUMAN BODY (10^0.2 m) - Anatomical Silhouette, Ribcage, Heart & Circulatory Tree
  function drawHumanBody(cx, cy, minDim) {
    const m = getLayerMetricsById('human', minDim * 0.36);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const s = m.radius;

    // Note: We position the human body so the right hand palm/skin target rests directly at (cx, cy)!
    // Let body center (chest) be offset slightly left/up so the outstretched/resting hand is at (cx, cy)
    // Wait: keeping the hand at (cx, cy) or chest/hand at (cx, cy)?
    // Let's place the right hand palm right at (cx, cy) and torso centered at (cx - s*0.32, cy + s*0.05), OR torso centered at (cx, cy) with forearm/hand placed over the center of the body at (cx, cy)!
    // Placing the right hand over the center `(cx, cy)` keeps the entire human body symmetrically centered on screen AND makes zooming into `(cx, cy)` zoom directly into the hand's skin & capillaries!

    // Vitruvian Medical Scan Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    // Degree tick marks on Vitruvian ring
    for (let i = 0; i < 36; i++) {
      const a = (i * Math.PI) / 18;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * s * 0.92, cy + Math.sin(a) * s * 0.92);
      ctx.lineTo(cx + Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.95);
      ctx.stroke();
    }

    // 1. Anatomical Body Contour
    const bodyGrad = ctx.createLinearGradient(cx, cy - s * 0.85, cx, cy + s * 0.85);
    bodyGrad.addColorStop(0, 'rgba(14, 165, 233, 0.32)');
    bodyGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
    bodyGrad.addColorStop(1, 'rgba(2, 132, 199, 0.3)');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.6, s * 0.012);
    ctx.lineJoin = 'round';

    // Cranium & Jaw (Head)
    ctx.beginPath();
    ctx.ellipse(cx, cy - s * 0.64, s * 0.105, s * 0.135, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Torso & Limbs Path
    ctx.beginPath();
    // Neck left
    ctx.moveTo(cx - s * 0.045, cy - s * 0.51);
    // Left Shoulder & Left Arm extended slightly outward
    ctx.lineTo(cx - s * 0.24, cy - s * 0.44);
    ctx.lineTo(cx - s * 0.38, cy - s * 0.12);
    ctx.lineTo(cx - s * 0.44, cy + s * 0.14);
    ctx.lineTo(cx - s * 0.37, cy + s * 0.16);
    ctx.lineTo(cx - s * 0.29, cy - s * 0.08);
    ctx.lineTo(cx - s * 0.18, cy - s * 0.31);
    // Left Waist, Hip & Left Leg
    ctx.lineTo(cx - s * 0.15, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.19, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.17, cy + s * 0.86);
    ctx.lineTo(cx - s * 0.08, cy + s * 0.86);
    ctx.lineTo(cx - s * 0.04, cy + s * 0.22);
    // Pelvis center
    ctx.lineTo(cx + s * 0.04, cy + s * 0.22);
    // Right Leg
    ctx.lineTo(cx + s * 0.08, cy + s * 0.86);
    ctx.lineTo(cx + s * 0.17, cy + s * 0.86);
    ctx.lineTo(cx + s * 0.19, cy + s * 0.15);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.05);
    // Right Torso & Right Shoulder
    ctx.lineTo(cx + s * 0.18, cy - s * 0.31);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.12);
    // Right Forearm bends inward so the Right Hand rests directly at (cx, cy)!
    ctx.lineTo(cx + s * 0.04, cy + s * 0.02);
    ctx.lineTo(cx + s * 0.04, cy - s * 0.04);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.14);
    ctx.lineTo(cx + s * 0.24, cy - s * 0.44);
    // Neck right
    ctx.lineTo(cx + s * 0.045, cy - s * 0.51);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Detailed Right Hand with 5 Fingers right at (cx, cy)
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(1.2, s * 0.008);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.038, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 5 fingers radiating from palm at (cx, cy)
    const fingerAngles = [-2.5, -2.9, -3.14, 2.85, 2.45];
    fingerAngles.forEach((fa, fIdx) => {
      const fLen = s * (fIdx === 0 ? 0.042 : fIdx === 2 ? 0.062 : 0.054);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(fa) * s * 0.03, cy + Math.sin(fa) * s * 0.03);
      ctx.lineTo(cx + Math.cos(fa) * (s * 0.03 + fLen), cy + Math.sin(fa) * (s * 0.03 + fLen));
      ctx.lineWidth = Math.max(1.5, s * 0.011);
      ctx.lineCap = 'round';
      ctx.stroke();
    });
    ctx.restore();

    // 2. Skeletal Ribcage & Spine (Translucent X-ray overlay)
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = Math.max(1, s * 0.009);
    // Spine
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx, cy + s * 0.14);
    ctx.stroke();
    // Ribs
    for (let rib = 0; rib < 6; rib++) {
      const ry = cy - s * (0.41 - rib * 0.042);
      const rw = s * (0.12 - Math.abs(rib - 2) * 0.012);
      ctx.beginPath();
      ctx.ellipse(cx, ry, rw, s * 0.018, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // 3. Circulatory System (Arteries in Red, Veins in Blue) & Beating Heart
    const heartX = cx - s * 0.035;
    const heartY = cy - s * 0.28;
    const pulse = 1 + 0.14 * Math.sin(animTime * 5.5);

    // Venous pathways (Blue)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = Math.max(1.2, s * 0.008);
    ctx.beginPath();
    ctx.moveTo(heartX, heartY);
    ctx.lineTo(cx, cy - s * 0.62); // Jugular to brain
    ctx.moveTo(heartX, heartY);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.05); // Left arm
    ctx.moveTo(heartX, heartY);
    ctx.lineTo(cx - s * 0.12, cy + s * 0.72); // Left leg
    ctx.moveTo(heartX, heartY);
    ctx.lineTo(cx + s * 0.12, cy + s * 0.72); // Right leg
    ctx.stroke();

    // Arterial pathway leading from Heart -> Right Shoulder -> Forearm -> Center Hand (cx, cy)!
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = Math.max(1.6, s * 0.011);
    ctx.beginPath();
    ctx.moveTo(heartX, heartY);
    ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.38, cx + s * 0.31, cy - s * 0.13);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Beating Heart Glow
    const hGrad = ctx.createRadialGradient(heartX, heartY, s * 0.005, heartX, heartY, s * 0.065 * pulse);
    hGrad.addColorStop(0, '#ffe4e6');
    hGrad.addColorStop(0.4, '#f43f5e');
    hGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(heartX, heartY, s * 0.065 * pulse, 0, Math.PI * 2);
    ctx.fill();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + s * 0.18,
        cy - s * 0.38,
        cx + s * 0.58,
        cy - s * 0.52,
        '人體與循環系統 (Human Body)',
        '身高 ≈ 1.7 m · 聚焦手部微血管',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 6. EPITHELIAL TISSUE & CAPILLARIES (10^-3.0 m) - Polygonal Squamous Cells & Flowing RBCs
  function drawTissue(cx, cy, minDim) {
    const m = getLayerMetricsById('tissue', minDim * 0.34);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Dermis Extracellular Matrix Backdrop
    const tisGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
    tisGrad.addColorStop(0, 'rgba(244, 114, 182, 0.28)');
    tisGrad.addColorStop(0.65, 'rgba(2fb, 113, 133, 0.15)'.replace('2fb', '251'));
    tisGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = tisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Branching Capillary Vessel Bed with Flowing Biconcave Red Blood Cells
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    // Capillary walls
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.36, -1.2, 2.5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 113, 133, 0.6)';
    ctx.lineWidth = r * 0.09;
    ctx.stroke();

    // Flowing Biconcave Red Blood Cells (RBCs) along capillary arc
    const numRBC = 14;
    for (let b = 0; b < numRBC; b++) {
      const ang = -1.1 + ((b / numRBC + animTime * 0.08) % 1) * 3.5;
      const bx = cx + Math.cos(ang) * r * 0.36;
      const by = cy + Math.sin(ang) * r * 0.36;
      const rbcR = r * 0.034;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang + Math.PI / 2);

      // Outer RBC torus rim
      const rbcGrad = ctx.createRadialGradient(0, 0, rbcR * 0.15, 0, 0, rbcR);
      rbcGrad.addColorStop(0, '#881337'); // Biconcave dimple center
      rbcGrad.addColorStop(0.55, '#e11d48');
      rbcGrad.addColorStop(0.85, '#fda4af');
      rbcGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = rbcGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rbcR, rbcR * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Organic Squamous Epithelial Cell Matrix (Voronoi-style polygons)
    tissueCells.forEach((cell) => {
      const cellX = cx + cell.cx * r;
      const cellY = cy + cell.cy * r;

      ctx.beginPath();
      cell.vertices.forEach((v, idx) => {
        const vx = cellX + Math.cos(v.a) * v.r * r;
        const vy = cellY + Math.sin(v.a) * v.r * r;
        if (idx === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      });
      ctx.closePath();

      ctx.fillStyle = cell.isCenter
        ? 'rgba(45, 212, 191, 0.22)'
        : `hsla(${335 + cell.hueOffset}, 75%, 65%, 0.14)`;
      ctx.fill();

      ctx.strokeStyle = cell.isCenter
        ? 'rgba(52, 211, 153, 0.8)'
        : 'rgba(244, 114, 182, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.006);
      ctx.stroke();

      // Stained Nucleus inside each surrounding neighbor cell
      if (!cell.isCenter) {
        ctx.fillStyle = 'rgba(192, 132, 252, 0.55)';
        ctx.beginPath();
        ctx.ellipse(cellX, cellY, r * 0.026, r * 0.02, cell.hueOffset, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.36,
        cy,
        cx + r * 0.68,
        cy - r * 0.55,
        '表皮細胞群與微血管紅血球',
        '組織尺度 ≈ 1 mm (10⁻³ m)',
        m.alpha,
        '#f472b6'
      );
    }

    ctx.restore();
  }

  // 6A. NEURON / NERVE CELL (10^-3.8 m) - Multipolar Soma, Dendrites, Myelinated Axon & Action Potential
  function drawNeuron(cx, cy, minDim) {
    const m = getLayerMetricsById('neuron', minDim * 0.33);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Long Myelinated Axon extending toward lower-right with Schwann Cell Myelin Sheaths
    const axonAngle = 0.52;
    const ux = Math.cos(axonAngle);
    const uy = Math.sin(axonAngle);
    const px = -uy;
    const py = ux;

    // Axon core fiber
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ux * r * 1.65, cy + uy * r * 1.65);
    ctx.stroke();

    // Segmented Myelin Sheath (許旺細胞髓鞘) & Nodes of Ranvier (蘭氏結)
    for (let seg = 0; seg < 4; seg++) {
      const startD = r * (0.42 + seg * 0.31);
      const segLen = r * 0.23;
      const midD = startD + segLen * 0.5;
      const mx = cx + ux * midD;
      const my = cy + uy * midD;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(axonAngle);

      const myelinGrad = ctx.createLinearGradient(0, -r * 0.08, 0, r * 0.08);
      myelinGrad.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      myelinGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.45)');
      myelinGrad.addColorStop(1, 'rgba(202, 138, 4, 0.85)');
      ctx.fillStyle = myelinGrad;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = Math.max(1, r * 0.01);
      ctx.beginPath();
      ctx.roundRect(-segLen * 0.5, -r * 0.075, segLen, r * 0.15, r * 0.04);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Saltatory Conduction Action Potential Pulse jumping between Nodes of Ranvier
      const pulsePhase = (animTime * 1.8) % 4;
      if (Math.abs(pulsePhase - seg) < 0.65) {
        const nodeX = cx + ux * (startD - r * 0.04);
        const nodeY = cy + uy * (startD - r * 0.04);
        const pGrad = ctx.createRadialGradient(nodeX, nodeY, r * 0.01, nodeX, nodeY, r * 0.16);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.4, '#38bdf8');
        pGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Branching Dendritic Tree (樹突) radiating from the Star-Shaped Soma
    const dendriteAngles = [-2.6, -1.9, -1.15, -0.35, 1.45, 2.25, 2.95];
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineCap = 'round';

    dendriteAngles.forEach((da, idx) => {
      const b1X = cx + Math.cos(da) * r * 0.52;
      const b1Y = cy + Math.sin(da) * r * 0.52;

      ctx.lineWidth = Math.max(2.2, r * 0.048);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(da) * r * 0.2, cy + Math.sin(da) * r * 0.2);
      ctx.quadraticCurveTo(
        cx + Math.cos(da + 0.12) * r * 0.36,
        cy + Math.sin(da + 0.12) * r * 0.36,
        b1X,
        b1Y
      );
      ctx.stroke();

      // Secondary & tertiary dendritic branches
      [-0.38, 0.35].forEach((subA) => {
        const b2A = da + subA;
        const b2X = b1X + Math.cos(b2A) * r * 0.34;
        const b2Y = b1Y + Math.sin(b2A) * r * 0.34;
        ctx.lineWidth = Math.max(1.3, r * 0.024);
        ctx.beginPath();
        ctx.moveTo(b1X, b1Y);
        ctx.lineTo(b2X, b2Y);
        ctx.stroke();

        // Synaptic bouton terminal glow
        const synGlow = 0.5 + 0.5 * Math.sin(animTime * 4 + idx + subA * 3);
        ctx.fillStyle = `rgba(125, 211, 252, ${0.4 + 0.5 * synGlow})`;
        ctx.beginPath();
        ctx.arc(b2X, b2Y, Math.max(2, r * 0.022), 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // 3. Star-shaped Multipolar Soma (神經細胞本體) at (cx, cy)
    ctx.beginPath();
    const pts = 16;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const starR = r * (i % 2 === 0 ? 0.34 : 0.22);
      const sx = cx + Math.cos(a) * starR;
      const sy = cy + Math.sin(a) * starR;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.quadraticCurveTo(cx + Math.cos(a - 0.1) * r * 0.24, cy + Math.sin(a - 0.1) * r * 0.24, sx, sy);
    }
    ctx.closePath();

    const somaGrad = ctx.createRadialGradient(cx, cy, r * 0.04, cx, cy, r * 0.35);
    somaGrad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
    somaGrad.addColorStop(0.55, 'rgba(14, 165, 233, 0.65)');
    somaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.9)');
    ctx.fillStyle = somaGrad;
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = Math.max(1.5, r * 0.015);
    ctx.stroke();

    // Nissl Bodies (尼氏體顆粒) & Soma Nucleus
    ctx.fillStyle = 'rgba(216, 180, 254, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + ux * r * 0.72,
        cy + uy * r * 0.72,
        cx + r * 0.78,
        cy - r * 0.62,
        '神經細胞 (Neuron)',
        '細胞體 ≈ 150 μm · 樹突與髓鞘跳躍傳導',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 6B. SKELETAL MUSCLE CELL / FIBER (10^-4.2 m) - Striated Sarcomeres (A-band, I-band, Z-disc) & Multi-nuclei
  function drawMuscleCell(cx, cy, minDim) {
    const m = getLayerMetricsById('muscle', minDim * 0.34);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // Rhythmic subtle sarcomere contraction
    const contract = 1 - 0.045 * Math.sin(animTime * 3.2);
    const fiberLength = r * 2.2 * contract;
    const fiberHalfH = r * 0.44;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.22);

    // Clip to cylindrical muscle fiber
    ctx.beginPath();
    ctx.roundRect(-fiberLength * 0.5, -fiberHalfH, fiberLength, fiberHalfH * 2, fiberHalfH * 0.25);
    ctx.clip();

    // 1. Cylindrical Sarcolemma 3D Base Shading
    const cylGrad = ctx.createLinearGradient(0, -fiberHalfH, 0, fiberHalfH);
    cylGrad.addColorStop(0, '#881337');
    cylGrad.addColorStop(0.25, '#e11d48');
    cylGrad.addColorStop(0.5, '#fb7185');
    cylGrad.addColorStop(0.78, '#be123c');
    cylGrad.addColorStop(1, '#4c0519');
    ctx.fillStyle = cylGrad;
    ctx.fillRect(-fiberLength * 0.5, -fiberHalfH, fiberLength, fiberHalfH * 2);

    // 2. Longitudinal Myofibril Lines (肌原纖維)
    ctx.strokeStyle = 'rgba(255, 228, 230, 0.22)';
    ctx.lineWidth = Math.max(1, r * 0.008);
    for (let yRatio = -0.8; yRatio <= 0.8; yRatio += 0.2) {
      ctx.beginPath();
      ctx.moveTo(-fiberLength * 0.5, yRatio * fiberHalfH);
      ctx.lineTo(fiberLength * 0.5, yRatio * fiberHalfH);
      ctx.stroke();
    }

    // 3. Characteristic Striations: Dark A-Bands, Light I-Bands & Zigzag Z-Lines (肌小節明暗橫紋)
    const sarcomereW = r * 0.26 * contract;
    const numSarcomeres = 5;
    for (let s = -numSarcomeres; s <= numSarcomeres; s++) {
      const sx = s * sarcomereW;

      // Dark A-Band (暗帶 - 粗肌絲 Myosin)
      ctx.fillStyle = 'rgba(76, 5, 25, 0.48)';
      ctx.fillRect(sx - sarcomereW * 0.32, -fiberHalfH, sarcomereW * 0.64, fiberHalfH * 2);

      // Light I-Band (明帶 - 細肌絲 Actin) on either side of Z-disc
      ctx.fillStyle = 'rgba(255, 228, 230, 0.28)';
      ctx.fillRect(sx + sarcomereW * 0.32, -fiberHalfH, sarcomereW * 0.36, fiberHalfH * 2);

      // Z-Line (Z 線) at the boundary of each sarcomere
      const zx = sx + sarcomereW * 0.5;
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.85)';
      ctx.lineWidth = Math.max(1.4, r * 0.012);
      ctx.beginPath();
      ctx.moveTo(zx, -fiberHalfH);
      ctx.lineTo(zx, fiberHalfH);
      ctx.stroke();
    }

    // 4. Multiple Flattened Peripheral Nuclei (骨骼肌邊緣多細胞核) + Central Target Nucleus
    const nucleiPos = [
      { x: -r * 0.55, y: -fiberHalfH * 0.78 },
      { x: r * 0.42, y: -fiberHalfH * 0.78 },
      { x: -r * 0.28, y: fiberHalfH * 0.78 },
      { x: r * 0.62, y: fiberHalfH * 0.78 },
      { x: 0, y: 0, isCenter: true }
    ];
    nucleiPos.forEach((np) => {
      ctx.fillStyle = np.isCenter ? 'rgba(192, 132, 252, 0.72)' : 'rgba(168, 85, 247, 0.82)';
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = Math.max(1, r * 0.008);
      ctx.beginPath();
      ctx.ellipse(np.x, np.y, r * 0.11, r * (np.isCenter ? 0.075 : 0.055), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();

    // Outer Sarcolemma Outline
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.22);
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = Math.max(2, r * 0.018);
    ctx.beginPath();
    ctx.roundRect(-fiberLength * 0.5, -fiberHalfH, fiberLength, fiberHalfH * 2, fiberHalfH * 0.25);
    ctx.stroke();
    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.45,
        cy - r * 0.25,
        cx + r * 0.76,
        cy - r * 0.65,
        '骨骼肌細胞 (Muscle Fiber)',
        '直徑 ≈ 60 μm · 明暗橫紋肌小節與多核構造',
        m.alpha,
        '#fb7185'
      );
    }

    ctx.restore();
  }

  // 6C. HUMAN CHEEK SQUAMOUS EPITHELIAL CELL (10^-4.5 m) - Flat Polygonal Stained Cheek Cell
  function drawCheekCell(cx, cy, minDim) {
    const m = getLayerMetricsById('cheek-cell', minDim * 0.35);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Irregular Flattened Polygonal Squamous Cell Membrane (口腔皮膜細胞扁平不規則多邊形)
    const polyVerts = [
      { a: 0.1, d: 0.96 },
      { a: 0.75, d: 0.88 },
      { a: 1.38, d: 1.04 },
      { a: 2.05, d: 0.92 },
      { a: 2.68, d: 0.84 },
      { a: 3.25, d: 0.98 },
      { a: 3.92, d: 0.89 },
      { a: 4.55, d: 1.02 },
      { a: 5.18, d: 0.86 },
      { a: 5.75, d: 0.94 }
    ];

    ctx.beginPath();
    polyVerts.forEach((pt, idx) => {
      const next = polyVerts[(idx + 1) % polyVerts.length];
      const x1 = cx + Math.cos(pt.a) * r * pt.d;
      const y1 = cy + Math.sin(pt.a) * r * pt.d;
      const x2 = cx + Math.cos(next.a) * r * next.d;
      const y2 = cy + Math.sin(next.a) * r * next.d;
      const midA = (pt.a + (next.a < pt.a ? next.a + Math.PI * 2 : next.a)) * 0.5;
      const midD = (pt.d + next.d) * 0.51;
      if (idx === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx + Math.cos(midA) * r * midD, cy + Math.sin(midA) * r * midD, x2, y2);
    });
    ctx.closePath();

    // Methylene-blue stained cytoplasm gradient (亞甲藍染色質感)
    const cheekGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    cheekGrad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
    cheekGrad.addColorStop(0.55, 'rgba(14, 165, 233, 0.28)');
    cheekGrad.addColorStop(0.88, 'rgba(2, 132, 199, 0.38)');
    cheekGrad.addColorStop(1, 'rgba(125, 211, 252, 0.72)');
    ctx.fillStyle = cheekGrad;
    ctx.fill();

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(2, r * 0.022);
    ctx.stroke();

    // Subtle membrane folds (表皮細胞邊緣皺摺線)
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = Math.max(1, r * 0.008);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.75, cy - r * 0.32);
    ctx.quadraticCurveTo(cx - r * 0.45, cy - r * 0.15, cx - r * 0.58, cy + r * 0.22);
    ctx.moveTo(cx + r * 0.68, cy - r * 0.25);
    ctx.quadraticCurveTo(cx + r * 0.42, cy + r * 0.1, cx + r * 0.62, cy + r * 0.42);
    ctx.stroke();

    // Fine Cytoplasmic Granules (細胞質微細顆粒)
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    for (let g = 0; g < 28; g++) {
      const ga = g * 2.39996; // Golden angle distribution
      const gd = r * (0.22 + (g / 28) * 0.62);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ga) * gd, cy + Math.sin(ga) * gd, Math.max(1.2, r * 0.01), 0, Math.PI * 2);
      ctx.fill();
    }

    // Prominent Stained Central Nucleus (深染細胞核)
    const nucGrad = ctx.createRadialGradient(cx - r * 0.03, cy - r * 0.03, r * 0.02, cx, cy, r * 0.16);
    nucGrad.addColorStop(0, '#e0f2fe');
    nucGrad.addColorStop(0.4, '#0284c7');
    nucGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = nucGrad;
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = Math.max(1.5, r * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.65,
        cy - r * 0.45,
        cx + r * 0.88,
        cy - r * 0.72,
        '人類口腔皮膜細胞 (Cheek Cell)',
        '直徑 ≈ 45 μm · 扁平多邊形與深染細胞核',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 7. BIOLOGICAL CELL ORGANELLES (10^-4.8 m) - Phospholipid Bilayer, Mitochondria Cristae, ER, Golgi
  function drawBiologicalCell(cx, cy, minDim) {
    const m = getLayerMetricsById('cell', minDim * 0.33);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Cytosol & Phospholipid Bilayer Membrane
    ctx.beginPath();
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const wobble = 1 + 0.018 * Math.sin(ang * 6 + animTime * 1.4) + 0.01 * Math.cos(ang * 4 - animTime);
      const px = cx + Math.cos(ang) * r * wobble;
      const py = cy + Math.sin(ang) * r * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const cellGrad = ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    cellGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    cellGrad.addColorStop(0.45, 'rgba(20, 184, 166, 0.22)');
    cellGrad.addColorStop(0.88, 'rgba(16, 185, 129, 0.32)');
    cellGrad.addColorStop(1, 'rgba(52, 211, 153, 0.75)');
    ctx.fillStyle = cellGrad;
    ctx.fill();

    // Double membrane border
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = Math.max(2.5, r * 0.032);
    ctx.stroke();
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = Math.max(1, r * 0.012);
    ctx.stroke();

    // 2. Cytoskeleton Microtubule Filaments
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.16)';
    ctx.lineWidth = Math.max(0.8, r * 0.005);
    for (let f = 0; f < 12; f++) {
      const fa = (f / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(fa) * r * 0.22, cy + Math.sin(fa) * r * 0.22);
      ctx.quadraticCurveTo(
        cx + Math.cos(fa + 0.25) * r * 0.55,
        cy + Math.sin(fa + 0.25) * r * 0.55,
        cx + Math.cos(fa) * r * 0.92,
        cy + Math.sin(fa) * r * 0.92
      );
      ctx.stroke();
    }

    // 3. Rough Endoplasmic Reticulum (粗糙內質網) hugging the central nucleus
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
    ctx.lineWidth = Math.max(2, r * 0.022);
    ctx.lineCap = 'round';
    for (let er = 0; er < 4; er++) {
      const erR = r * (0.24 + er * 0.048);
      ctx.beginPath();
      ctx.arc(cx, cy, erR, -0.9 + er * 0.2, 1.8 - er * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, erR, 2.3 + er * 0.15, 4.7 - er * 0.2);
      ctx.stroke();
    }

    // 4. Golgi Apparatus (高基氏體) & Secretory Vesicles
    ctx.save();
    ctx.translate(cx - r * 0.42, cy - r * 0.35);
    ctx.rotate(-0.6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2, r * 0.02);
    for (let g = 0; g < 4; g++) {
      const gy = (g - 1.5) * r * 0.038;
      const gw = r * (0.14 - Math.abs(g - 1.5) * 0.02);
      ctx.beginPath();
      ctx.arc(0, gy + r * 0.12, gw, -2.1, -1.04);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Detailed Mitochondria with Folded Inner Cristae (粒線體與內膜皺摺)
    const mitos = [
      { a: 0.55, d: 0.62, rot: 0.45 },
      { a: 2.15, d: 0.65, rot: -0.5 },
      { a: 3.65, d: 0.58, rot: 1.15 },
      { a: 5.15, d: 0.64, rot: -0.25 }
    ];
    mitos.forEach((mp) => {
      const mx = cx + Math.cos(mp.a + animTime * 0.05) * r * mp.d;
      const my = cy + Math.sin(mp.a + animTime * 0.05) * r * mp.d;
      const mw = r * 0.13;
      const mh = r * 0.068;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(mp.rot);

      const mGrad = ctx.createRadialGradient(0, 0, mw * 0.1, 0, 0, mw);
      mGrad.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
      mGrad.addColorStop(1, 'rgba(194, 65, 12, 0.85)');
      ctx.fillStyle = mGrad;
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = Math.max(1.2, r * 0.008);
      ctx.beginPath();
      ctx.ellipse(0, 0, mw, mh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = Math.max(1, r * 0.007);
      ctx.beginPath();
      for (let k = -4; k <= 4; k++) {
        const kx = (k / 5) * mw * 0.82;
        const ky = (k % 2 === 0 ? 1 : -1) * mh * 0.58;
        if (k === -4) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.stroke();
      ctx.restore();
    });

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.62,
        cy - r * 0.62,
        cx + r * 0.88,
        cy - r * 0.82,
        '真核動物細胞胞器 (Organelles)',
        '直徑 ≈ 16 μm · 粒線體內膜皺摺與內質網',
        m.alpha,
        '#34d399'
      );
    }

    ctx.restore();
  }

  // 7B. RED BLOOD CELL / ERYTHROCYTE (10^-5.1 m) - 3D Biconcave Discoid, Enucleated, Hemoglobin-Rich
  function drawRedBloodCell(cx, cy, minDim) {
    const m = getLayerMetricsById('rbc', minDim * 0.31);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // Companion RBCs in background plasma for 3D depth
    const bgCells = [
      { dx: -1.05, dy: -0.68, scale: 0.55, rot: 0.45 },
      { dx: 1.12, dy: 0.62, scale: 0.62, rot: -0.35 }
    ];
    bgCells.forEach((bc) => {
      const bx = cx + bc.dx * r;
      const by = cy + bc.dy * r;
      const br = r * bc.scale;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bc.rot);
      const bgGrad = ctx.createRadialGradient(0, 0, br * 0.1, 0, 0, br);
      bgGrad.addColorStop(0, 'rgba(136, 19, 55, 0.45)');
      bgGrad.addColorStop(0.65, 'rgba(225, 29, 72, 0.55)');
      bgGrad.addColorStop(1, 'rgba(159, 18, 57, 0.25)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, br, br * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Main 3D Biconcave Red Blood Cell (雙凹圓盤狀紅血球)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(animTime * 0.5) * 0.08);

    // Outer thick torus rim shading
    const rbcOuter = ctx.createRadialGradient(-r * 0.18, -r * 0.18, r * 0.12, 0, 0, r);
    rbcOuter.addColorStop(0, '#fda4af');
    rbcOuter.addColorStop(0.32, '#f43f5e');
    rbcOuter.addColorStop(0.72, '#e11d48');
    rbcOuter.addColorStop(0.92, '#be123c');
    rbcOuter.addColorStop(1, '#4c0519');
    ctx.fillStyle = rbcOuter;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();

    // Central Biconcave Dimple (中央雙凹陷薄區 — 成熟無細胞核)
    const dimpleGrad = ctx.createRadialGradient(r * 0.06, r * 0.06, r * 0.02, 0, 0, r * 0.52);
    dimpleGrad.addColorStop(0, 'rgba(76, 5, 25, 0.88)');
    dimpleGrad.addColorStop(0.55, 'rgba(136, 19, 55, 0.72)');
    dimpleGrad.addColorStop(0.85, 'rgba(225, 29, 72, 0.2)');
    dimpleGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = dimpleGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.52, r * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular Torus Rim Highlight
    ctx.strokeStyle = 'rgba(255, 228, 230, 0.45)';
    ctx.lineWidth = Math.max(2, r * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.74, r * 0.62, 0, -2.5, -0.7);
    ctx.stroke();

    // Oxygen-carrying Hemoglobin (血紅素與氧分子微光粒子)
    for (let h = 0; h < 16; h++) {
      const ha = (h / 16) * Math.PI * 2 + animTime * 0.25;
      const hd = r * (0.64 + 0.08 * Math.sin(h * 3));
      ctx.fillStyle = 'rgba(255, 241, 242, 0.65)';
      ctx.beginPath();
      ctx.arc(Math.cos(ha) * hd, Math.sin(ha) * hd * 0.85, Math.max(1.5, r * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.72,
        cy - r * 0.42,
        cx + r * 0.96,
        cy - r * 0.76,
        '紅血球 (Red Blood Cell)',
        '直徑 ≈ 7.5 μm · 雙凹圓盤狀且無細胞核',
        m.alpha,
        '#fb7185'
      );
    }

    ctx.restore();
  }

  // 8. CELL NUCLEUS & CHROMOSOMES (10^-5.3 m) - Nuclear Pores, Nucleolus, X-Chromosomes
  function drawCellNucleus(cx, cy, minDim) {
    const m = getLayerMetricsById('nucleus', minDim * 0.29);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. 3D Shaded Nuclear Envelope
    const nucGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.08, cx, cy, r);
    nucGrad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
    nucGrad.addColorStop(0.6, 'rgba(126, 34, 206, 0.42)');
    nucGrad.addColorStop(0.92, 'rgba(88, 28, 135, 0.75)');
    nucGrad.addColorStop(1, 'rgba(216, 180, 254, 0.85)');
    ctx.fillStyle = nucGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Central Glowing Nucleolus (核仁)
    const nucleolusGrad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 0.36);
    nucleolusGrad.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
    nucleolusGrad.addColorStop(0.5, 'rgba(217, 70, 239, 0.4)');
    nucleolusGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = nucleolusGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // 3. Nuclear Pore Complexes (核孔複合體) along the rim
    const poreCount = 24;
    for (let p = 0; p < poreCount; p++) {
      const pa = (p / poreCount) * Math.PI * 2 + animTime * 0.03;
      const px = cx + Math.cos(pa) * r;
      const py = cy + Math.sin(pa) * r;
      ctx.fillStyle = '#f3e8ff';
      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = Math.max(1, r * 0.01);
      ctx.beginPath();
      ctx.arc(px, py, r * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 4. Condensed Mitotic X-Chromosomes & Chromatin Fiber Loops uncoiling to center
    const chromPositions = [
      { x: -0.45, y: -0.35, rot: 0.4 },
      { x: 0.48, y: -0.32, rot: -0.5 },
      { x: -0.42, y: 0.42, rot: -0.3 },
      { x: 0.45, y: 0.38, rot: 0.6 }
    ];
    chromPositions.forEach((ch) => {
      const chX = cx + ch.x * r;
      const chY = cy + ch.y * r;
      const cw = r * 0.16;

      ctx.save();
      ctx.translate(chX, chY);
      ctx.rotate(ch.rot);
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = Math.max(2.5, r * 0.042);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-cw * 0.55, -cw);
      ctx.quadraticCurveTo(0, 0, cw * 0.55, cw);
      ctx.moveTo(cw * 0.55, -cw);
      ctx.quadraticCurveTo(0, 0, -cw * 0.55, cw);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)';
      ctx.lineWidth = Math.max(1.2, r * 0.012);
      ctx.beginPath();
      ctx.moveTo(chX, chY);
      ctx.quadraticCurveTo(cx + ch.x * r * 0.3, cy - ch.y * r * 0.2, cx, cy);
      ctx.stroke();
    });

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.7,
        cy - r * 0.7,
        cx + r * 0.95,
        cy - r * 0.88,
        '細胞核與染色體 (Nucleus)',
        '直徑 ≈ 5 μm · 核孔與染色質',
        m.alpha,
        '#c084fc'
      );
    }

    ctx.restore();
  }

  // 8B. ESCHERICHIA COLI BACTERIUM (10^-5.7 m) - Prokaryotic Bacillus, Flagella, Pili & Nucleoid DNA
  function drawEColi(cx, cy, minDim) {
    const m = getLayerMetricsById('ecoli', minDim * 0.32);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.28);

    const rodW = r * 1.65;
    const rodH = r * 0.72;

    // 1. Wavy Peritrichous Flagella (擺動推進鞭毛)
    const flagellaRoots = [
      { x: -rodW * 0.48, y: -rodH * 0.2, dir: -1, phase: 0 },
      { x: -rodW * 0.5, y: 0, dir: -1, phase: 1.5 },
      { x: -rodW * 0.48, y: rodH * 0.22, dir: -1, phase: 3.1 },
      { x: -rodW * 0.2, y: -rodH * 0.48, dir: -0.7, phase: 2.2 },
      { x: -rodW * 0.15, y: rodH * 0.48, dir: -0.7, phase: 4.2 }
    ];
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.78)';
    ctx.lineWidth = Math.max(1.4, r * 0.016);
    ctx.lineCap = 'round';
    flagellaRoots.forEach((fl) => {
      ctx.beginPath();
      for (let t = 0; t <= 24; t++) {
        const s = t / 24;
        const fx = fl.x + fl.dir * s * r * 1.15;
        const fy = fl.y + Math.sin(s * Math.PI * 3.5 - animTime * 6 + fl.phase) * r * 0.14 * s;
        if (t === 0) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    });

    // 2. Short Hair-like Pili / Fimbriae (細菌表面線毛) around the capsule
    const numPili = 34;
    ctx.strokeStyle = 'rgba(217, 249, 157, 0.65)';
    ctx.lineWidth = Math.max(1, r * 0.01);
    for (let p = 0; p < numPili; p++) {
      const a = (p / numPili) * Math.PI * 2;
      const bx = Math.cos(a) * rodW * 0.5;
      const by = Math.sin(a) * rodH * 0.5;
      const px = Math.cos(a) * (rodW * 0.5 + r * 0.09);
      const py = Math.sin(a) * (rodH * 0.5 + r * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    // 3. Outer Capsule & Peptidoglycan Cell Wall (莢膜與多胜聚醣細胞壁)
    const bacGrad = ctx.createRadialGradient(-rodW * 0.15, -rodH * 0.15, r * 0.05, 0, 0, rodW * 0.65);
    bacGrad.addColorStop(0, 'rgba(190, 242, 100, 0.85)');
    bacGrad.addColorStop(0.55, 'rgba(101, 163, 13, 0.82)');
    bacGrad.addColorStop(0.9, 'rgba(54, 83, 20, 0.92)');
    bacGrad.addColorStop(1, '#d9f99d');

    ctx.fillStyle = bacGrad;
    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = Math.max(2.2, r * 0.028);
    ctx.beginPath();
    ctx.roundRect(-rodW * 0.5, -rodH * 0.5, rodW, rodH, rodH * 0.5);
    ctx.fill();
    ctx.stroke();

    // Inner Plasma Membrane
    ctx.strokeStyle = '#ecfccb';
    ctx.lineWidth = Math.max(1, r * 0.01);
    ctx.beginPath();
    ctx.roundRect(-rodW * 0.45, -rodH * 0.42, rodW * 0.9, rodH * 0.84, rodH * 0.42);
    ctx.stroke();

    // 4. Tangled Central Nucleoid Circular DNA (無核膜之擬核區環狀染色體)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(1.5, r * 0.018);
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const ka = (k / 60) * Math.PI * 2;
      const nx = Math.cos(ka) * rodW * 0.26 + Math.sin(ka * 5 + animTime) * r * 0.045;
      const ny = Math.sin(ka * 2) * rodH * 0.22 + Math.cos(ka * 4 - animTime) * r * 0.035;
      if (k === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    }
    ctx.closePath();
    ctx.stroke();

    // 5. Circular Plasmids (小型環狀質體 DNA)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.2, r * 0.014);
    ctx.beginPath();
    ctx.arc(rodW * 0.31, -rodH * 0.14, r * 0.055, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-rodW * 0.32, rodH * 0.16, r * 0.045, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.55,
        cy - r * 0.32,
        cx + r * 0.88,
        cy - r * 0.72,
        '大腸桿菌 (E. coli 原核細菌)',
        '長約 2 μm · 具細胞壁、鞭毛與擬核環狀 DNA',
        m.alpha,
        '#a3e635'
      );
    }

    ctx.restore();
  }

  // 8C. VIRUS & BACTERIOPHAGE (10^-7.0 m) - Icosahedral/Spike Enveloped Virus & T4 Bacteriophage
  function drawVirus(cx, cy, minDim) {
    const m = getLayerMetricsById('virus', minDim * 0.28);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Companion T4 Bacteriophage (T4 噬菌體複合構造) at upper-left for viral diversity comparison
    const phageX = cx - r * 1.15;
    const phageY = cy - r * 0.35;
    const pr = r * 0.48;

    ctx.save();
    ctx.translate(phageX, phageY);
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.lineWidth = Math.max(1.2, pr * 0.04);

    // Icosahedral Capsid Head (二十面體頭部)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const hx = Math.cos(a) * pr * 0.55;
      const hy = -pr * 0.65 + Math.sin(a) * pr * 0.62;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Contractile Tail Sheath (收縮尾鞘)
    ctx.fillStyle = 'rgba(125, 211, 252, 0.5)';
    ctx.fillRect(-pr * 0.14, -pr * 0.05, pr * 0.28, pr * 0.72);
    ctx.strokeRect(-pr * 0.14, -pr * 0.05, pr * 0.28, pr * 0.72);

    // 6 Jointed Tail Fibers (尾絲)
    [-1, 1].forEach((side) => {
      [0.35, 0.55, 0.75].forEach((spread) => {
        ctx.beginPath();
        ctx.moveTo(side * pr * 0.14, pr * 0.67);
        ctx.lineTo(side * pr * (0.45 + spread * 0.4), pr * (0.35 + spread * 0.2));
        ctx.lineTo(side * pr * (0.65 + spread * 0.5), pr * 1.05);
        ctx.stroke();
      });
    });
    ctx.restore();

    // 2. Central Enveloped Icosahedral Virus (100 nm 棘蛋白套膜與二十面體蛋白質衣殼病毒) at (cx, cy)
    // Surface Spike Glycoproteins (表面棘蛋白突起)
    const numSpikes = 20;
    for (let s = 0; s < numSpikes; s++) {
      const sa = (s / numSpikes) * Math.PI * 2 + animTime * 0.15;
      const sx1 = cx + Math.cos(sa) * r * 0.78;
      const sy1 = cy + Math.sin(sa) * r * 0.78;
      const sx2 = cx + Math.cos(sa) * r * 1.04;
      const sy2 = cy + Math.sin(sa) * r * 1.04;

      // Spike stalk
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = Math.max(2, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // Trimeric Spike Receptor-Binding Crown
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(sx2, sy2, Math.max(2.5, r * 0.065), 0, Math.PI * 2);
      ctx.fill();
    }

    // Lipid Envelope & Icosahedral Protein Capsid Shell
    const virGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r * 0.82);
    virGrad.addColorStop(0, 'rgba(251, 113, 133, 0.75)');
    virGrad.addColorStop(0.65, 'rgba(190, 18, 60, 0.82)');
    virGrad.addColorStop(1, 'rgba(136, 19, 55, 0.95)');
    ctx.fillStyle = virGrad;
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = Math.max(2, r * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Geometric Icosahedral Capsid Facet Triangles inside
    ctx.strokeStyle = 'rgba(255, 228, 230, 0.42)';
    ctx.lineWidth = Math.max(1, r * 0.012);
    ctx.beginPath();
    for (let v = 0; v < 6; v++) {
      const va = (v * Math.PI) / 3 + animTime * 0.1;
      const vx = cx + Math.cos(va) * r * 0.56;
      const vy = cy + Math.sin(va) * r * 0.56;
      ctx.moveTo(cx, cy);
      ctx.lineTo(vx, vy);
      const nextA = ((v + 1) * Math.PI) / 3 + animTime * 0.1;
      ctx.lineTo(cx + Math.cos(nextA) * r * 0.56, cy + Math.sin(nextA) * r * 0.56);
    }
    ctx.stroke();

    // Central Helical Viral Nucleic Acid (病毒內部核酸基因體) converging to center DNA
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = Math.max(1.8, r * 0.025);
    ctx.beginPath();
    for (let t = 0; t <= 45; t++) {
      const ratio = t / 45;
      const ang = ratio * Math.PI * 6 + animTime * 1.5;
      const rad = ratio * r * 0.38;
      const gx = cx + Math.cos(ang) * rad;
      const gy = cy + Math.sin(ang) * rad;
      if (t === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.72,
        cy - r * 0.52,
        cx + r * 0.98,
        cy - r * 0.82,
        '病毒與噬菌體 (Virus & Phage)',
        '直徑 ≈ 100 nm (10⁻⁷ m) · 蛋白質衣殼與棘蛋白',
        m.alpha,
        '#fb7185'
      );
    }

    ctx.restore();
  }

  // 9. 3D DNA DOUBLE HELIX MOLECULE (10^-8.5 m) - Depth-Sorted Ribbons, Base Pairs & H-Bonds
  function drawDNAMolecule(cx, cy, minDim) {
    const m = getLayerMetricsById('dna', minDim * 0.26);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    const numRungs = 16;
    const span = r * 2.5;
    const phase = animTime * 1.4;

    // Collect 3D molecular elements for back-to-front Z-sorting
    const elements = [];

    for (let i = -numRungs; i <= numRungs; i++) {
      const y = (i / numRungs) * span;
      // B-DNA has major and minor grooves (asymmetric phase offset ~ 2.4 rad instead of PI)
      const a1 = i * 0.52 + phase;
      const a2 = a1 + 2.45;

      // Ensure at i === 0, strand 1 passes right through (cx, cy) so zooming in hits our target Carbon atom!
      const centerShiftX = -Math.sin(phase) * r * 0.58 * Math.exp(-(i * i) / 8);

      const x1 = cx + Math.sin(a1) * r * 0.58 + centerShiftX;
      const z1 = Math.cos(a1);
      const x2 = cx + Math.sin(a2) * r * 0.58 + centerShiftX;
      const z2 = Math.cos(a2);
      const py = cy + y;

      const isAT = Math.abs(i) % 2 === 0;
      const c1 = isAT ? '#38bdf8' : '#4ade80'; // Adenine / Guanine
      const c2 = isAT ? '#f43f5e' : '#facc15'; // Thymine / Cytosine

      elements.push({
        type: 'rung',
        z: (z1 + z2) * 0.5,
        x1,
        x2,
        py,
        c1,
        c2,
        isAT
      });

      elements.push({
        type: 'backbone',
        z: z1,
        x: i === 0 ? cx : x1,
        y: py,
        strand: 1,
        isTargetAtom: i === 0
      });

      elements.push({
        type: 'backbone',
        z: z2,
        x: x2,
        y: py,
        strand: 2,
        isTargetAtom: false
      });
    }

    // Sort back-to-front by Z coordinate
    elements.sort((a, b) => a.z - b.z);

    elements.forEach((el) => {
      if (el.type === 'rung') {
        const midX = (el.x1 + el.x2) / 2;
        const depthScale = 0.75 + 0.25 * el.z;
        ctx.lineWidth = Math.max(2, r * 0.055 * depthScale);
        ctx.lineCap = 'round';

        // Base 1
        ctx.strokeStyle = el.c1;
        ctx.beginPath();
        ctx.moveTo(el.x1, el.py);
        ctx.lineTo(midX - r * 0.05, el.py);
        ctx.stroke();

        // Base 2
        ctx.strokeStyle = el.c2;
        ctx.beginPath();
        ctx.moveTo(midX + r * 0.05, el.py);
        ctx.lineTo(el.x2, el.py);
        ctx.stroke();

        // Hydrogen Bonds in the middle (A=T has 2, G≡C has 3)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(midX, el.py, Math.max(1.2, r * 0.018 * depthScale), 0, Math.PI * 2);
        ctx.fill();
      } else if (el.type === 'backbone') {
        const depthScale = 0.7 + 0.35 * (el.z + 1) * 0.5;
        const atomR = Math.max(2.5, r * (el.isTargetAtom ? 0.11 : 0.085) * depthScale);

        const g = ctx.createRadialGradient(
          el.x - atomR * 0.3,
          el.y - atomR * 0.3,
          atomR * 0.1,
          el.x,
          el.y,
          atomR
        );
        if (el.isTargetAtom) {
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.4, '#38bdf8');
          g.addColorStop(1, '#0284c7');
        } else if (el.strand === 1) {
          g.addColorStop(0, '#f0f9ff');
          g.addColorStop(0.5, '#7dd3fc');
          g.addColorStop(1, '#0369a1');
        } else {
          g.addColorStop(0, '#fdf4ff');
          g.addColorStop(0.5, '#e879f9');
          g.addColorStop(1, '#701a75');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(el.x, el.y, atomR, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.55,
        cy - r * 0.35,
        cx + r * 0.95,
        cy - r * 0.65,
        'DNA 雙股螺旋分子',
        '寬度 2 nm · 鹼基對氫鍵與碳骨架',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 10. CARBON-12 ATOM & QUANTUM ORBITALS (10^-10.0 m) - 1s/2s/2p Lobe Clouds & Wave Electrons
  function drawAtom(cx, cy, minDim) {
    const m = getLayerMetricsById('atom', minDim * 0.34);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // 1. Volumetric 2p Dumbbell Orbital Probability Clouds (2px, 2py, 2pz)
    const pAngles = [0, Math.PI / 3, (2 * Math.PI) / 3];
    pAngles.forEach((ang, idx) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang + Math.sin(animTime * 0.3) * 0.05);

      [-1, 1].forEach((dir) => {
        const lobeX = dir * r * 0.46;
        const lobeGrad = ctx.createRadialGradient(lobeX, 0, r * 0.04, lobeX, 0, r * 0.44);
        const hue = idx === 0 ? 198 : idx === 1 ? 265 : 175;
        lobeGrad.addColorStop(0, `hsla(${hue}, 95%, 68%, 0.32)`);
        lobeGrad.addColorStop(0.55, `hsla(${hue}, 90%, 55%, 0.12)`);
        lobeGrad.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
        ctx.fillStyle = lobeGrad;
        ctx.beginPath();
        ctx.ellipse(lobeX, 0, r * 0.44, r * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });

    // 2. Inner 1s & 2s Spherical Probability Core
    const sGrad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 0.42);
    sGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    sGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.35)');
    sGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
    sGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // 3. Six Carbon Electrons (2 in inner 1s shell, 4 in outer 2s/2p valence shell)
    const orbitals = [
      { tilt: 0.2, rx: 0.34, ry: 0.28, speed: 3.6, phase: 0, shell: '1s' },
      { tilt: -0.9, rx: 0.34, ry: 0.28, speed: 3.6, phase: Math.PI, shell: '1s' },
      { tilt: 0, rx: 0.96, ry: 0.34, speed: 2.1, phase: 0.3, shell: '2p' },
      { tilt: Math.PI / 3, rx: 0.96, ry: 0.34, speed: 2.3, phase: 2.1, shell: '2p' },
      { tilt: (2 * Math.PI) / 3, rx: 0.96, ry: 0.34, speed: 1.9, phase: 4.0, shell: '2p' },
      { tilt: Math.PI / 2, rx: 0.82, ry: 0.82, speed: 1.6, phase: 1.1, shell: '2s' }
    ];

    orbitals.forEach((orb) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(orb.tilt);

      // Standing de Broglie wave ring along orbital
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.28)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * orb.rx, r * orb.ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      const ang = animTime * orb.speed + orb.phase;

      // Glowing wave-packet tail behind electron
      for (let t = 1; t <= 10; t++) {
        const ta = ang - t * 0.07;
        const tx = Math.cos(ta) * r * orb.rx;
        const ty = Math.sin(ta) * r * orb.ry;
        ctx.fillStyle = `rgba(56, 189, 248, ${(1 - t / 11) * 0.45})`;
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(1.2, r * 0.022 * (1 - t / 12)), 0, Math.PI * 2);
        ctx.fill();
      }

      // Electron core
      const ex = Math.cos(ang) * r * orb.rx;
      const ey = Math.sin(ang) * r * orb.ry;
      const eSize = Math.max(3, r * 0.032);
      const eGrad = ctx.createRadialGradient(ex, ey, eSize * 0.1, ex, ey, eSize * 2.2);
      eGrad.addColorStop(0, '#ffffff');
      eGrad.addColorStop(0.4, '#38bdf8');
      eGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = eGrad;
      ctx.beginPath();
      ctx.arc(ex, ey, eSize * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Central Nucleus Beacon
    const nucBeacon = Math.max(3, r * 0.016);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy, nucBeacon, 0, Math.PI * 2);
    ctx.fill();

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.68,
        cy - r * 0.68,
        cx + r * 0.94,
        cy - r * 0.88,
        '碳-12 原子與量子軌域',
        '直徑 ≈ 0.14 nm · 1s/2s/2p 電子雲',
        m.alpha,
        '#38bdf8'
      );
    }

    ctx.restore();
  }

  // 11. ATOMIC NUCLEUS, GLUONS & QUARKS (10^-14.5 m) - 3D Nucleons & QCD Color Quarks
  function drawAtomicNucleus(cx, cy, minDim) {
    const m = getLayerMetricsById('atomic-nucleus', minDim * 0.28);
    if (!m.visible) return;

    ctx.save();
    ctx.globalAlpha = m.alpha;
    const r = m.radius;

    // Strong Nuclear Force Field Halo
    const forceGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.5);
    forceGrad.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
    forceGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.28)');
    forceGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = forceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 12 Nucleons (6 Protons + 6 Neutrons) arranged in 3D cluster with Central Proton at (0,0)
    const nucleons = [
      { dx: -0.42, dy: -0.36, z: -1, type: 'p' },
      { dx: 0.42, dy: -0.36, z: -1, type: 'n' },
      { dx: -0.54, dy: 0.14, z: -0.8, type: 'n' },
      { dx: 0.54, dy: 0.14, z: -0.8, type: 'p' },
      { dx: -0.26, dy: 0.52, z: -0.6, type: 'p' },
      { dx: 0.26, dy: 0.52, z: -0.6, type: 'n' },
      { dx: 0, dy: -0.52, z: -0.4, type: 'p' },
      { dx: -0.25, dy: -0.14, z: 0.2, type: 'n' },
      { dx: 0.25, dy: -0.14, z: 0.2, type: 'p' },
      { dx: -0.18, dy: 0.24, z: 0.5, type: 'n' },
      { dx: 0.18, dy: 0.24, z: 0.5, type: 'n' },
      { dx: 0, dy: 0, z: 1.0, type: 'p', isCenter: true }
    ];

    const nucR = r * 0.31;

    nucleons.forEach((n, idx) => {
      const jx = Math.sin(animTime * 6.5 + idx * 1.9) * r * 0.018;
      const jy = Math.cos(animTime * 6.0 + idx * 2.3) * r * 0.018;
      const nx = cx + (n.isCenter ? jx * 0.3 : n.dx * r + jx);
      const ny = cy + (n.isCenter ? jy * 0.3 : n.dy * r + jy);

      // 3D Lit Nucleon Sphere (Semi-transparent when zoomed in so internal Quarks shine through!)
      const internalReveal = Math.min(0.65, Math.max(0, (nucR - 18) / 55));
      const g = ctx.createRadialGradient(
        nx - nucR * 0.28,
        ny - nucR * 0.28,
        nucR * 0.08,
        nx,
        ny,
        nucR
      );

      if (n.type === 'p') {
        g.addColorStop(0, `rgba(255, 228, 230, ${0.95 - internalReveal * 0.4})`);
        g.addColorStop(0.5, `rgba(225, 29, 72, ${0.9 - internalReveal * 0.5})`);
        g.addColorStop(1, 'rgba(136, 19, 55, 0.92)');
      } else {
        g.addColorStop(0, `rgba(224, 242, 254, ${0.95 - internalReveal * 0.4})`);
        g.addColorStop(0.5, `rgba(2, 132, 199, ${0.9 - internalReveal * 0.5})`);
        g.addColorStop(1, 'rgba(12, 74, 110, 0.92)');
      }

      ctx.fillStyle = g;
      ctx.strokeStyle = n.type === 'p' ? 'rgba(253, 164, 175, 0.6)' : 'rgba(125, 211, 252, 0.6)';
      ctx.lineWidth = Math.max(1, nucR * 0.04);
      ctx.beginPath();
      ctx.arc(nx, ny, nucR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Internal Quarks (uud for Proton, udd for Neutron) + Coiled Gluon Springs!
      if (nucR > 14) {
        const qAlpha = Math.min(1, (nucR - 14) / 28);
        ctx.save();
        ctx.globalAlpha = m.alpha * qAlpha;

        const qColors = ['#ef4444', '#22c55e', '#3b82f6']; // QCD Red, Green, Blue color charge
        const qLabels = n.type === 'p' ? ['u', 'u', 'd'] : ['u', 'd', 'd'];
        const qPts = [];

        for (let q = 0; q < 3; q++) {
          const qa = (q * Math.PI * 2) / 3 + animTime * 3.2 + idx;
          const qDist = nucR * 0.45;
          qPts.push({
            x: nx + Math.cos(qa) * qDist,
            y: ny + Math.sin(qa) * qDist,
            color: qColors[q],
            label: qLabels[q]
          });
        }

        // Draw wavy Gluon flux tubes connecting the 3 quarks to nucleon center
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
        ctx.lineWidth = Math.max(1.2, nucR * 0.045);
        qPts.forEach((qp) => {
          ctx.beginPath();
          const segs = 10;
          const dx = qp.x - nx;
          const dy = qp.y - ny;
          const perpX = -dy * 0.18;
          const perpY = dx * 0.18;
          for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const wave = Math.sin(t * Math.PI * 4 + animTime * 12) * 0.6;
            const gx = nx + dx * t + perpX * wave;
            const gy = ny + dy * t + perpY * wave;
            if (s === 0) ctx.moveTo(gx, gy);
            else ctx.lineTo(gx, gy);
          }
          ctx.stroke();
        });

        // Draw the 3 Quark spheres & labels
        qPts.forEach((qp) => {
          const qr = nucR * 0.2;
          const qGrad = ctx.createRadialGradient(qp.x - qr * 0.25, qp.y - qr * 0.25, qr * 0.1, qp.x, qp.y, qr);
          qGrad.addColorStop(0, '#ffffff');
          qGrad.addColorStop(0.45, qp.color);
          qGrad.addColorStop(1, '#090d16');
          ctx.fillStyle = qGrad;
          ctx.beginPath();
          ctx.arc(qp.x, qp.y, qr, 0, Math.PI * 2);
          ctx.fill();

          if (qr > 7) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `700 ${Math.min(14, Math.round(qr * 1.1))}px JetBrains Mono, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(qp.label, qp.x, qp.y);
          }
        });

        ctx.restore();
      }
    });

    if (m.alpha > 0.35) {
      drawCallout(
        cx + r * 0.55,
        cy - r * 0.55,
        cx + r * 0.92,
        cy - r * 0.85,
        '碳原子核與夸克 (Quarks & Gluons)',
        '直徑 ≈ 3 fm · 質子(uud) 與中子(udd)',
        m.alpha,
        '#fb7185'
      );
    }

    ctx.restore();
  }

  // ============================================================================
  // MAIN RENDER LOOP
  // ============================================================================
  function renderLoop() {
    animTime += 0.016;

    if (isAutoTour) {
      targetLogScale += autoTourDirection * 0.026;
      if (targetLogScale <= MIN_LOG_SCALE) {
        targetLogScale = MIN_LOG_SCALE;
        autoTourDirection = 1;
      } else if (targetLogScale >= MAX_LOG_SCALE) {
        targetLogScale = MAX_LOG_SCALE;
        autoTourDirection = -1;
      }
    }

    currentLogScale += (targetLogScale - currentLogScale) * 0.12;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);

    drawBackgroundAndGrid(w, h, cx, cy, minDim);

    // Render all nested scale levels from macro to micro
    drawSolarSystem(cx, cy, minDim);
    drawEarthMoonSystem(cx, cy, minDim);
    drawEarth(cx, cy, minDim);
    drawLandscape(cx, cy, minDim);
    drawHumanBody(cx, cy, minDim);
    drawTissue(cx, cy, minDim);
    drawNeuron(cx, cy, minDim);
    drawMuscleCell(cx, cy, minDim);
    drawCheekCell(cx, cy, minDim);
    drawBiologicalCell(cx, cy, minDim);
    drawRedBloodCell(cx, cy, minDim);
    drawCellNucleus(cx, cy, minDim);
    drawEColi(cx, cy, minDim);
    drawVirus(cx, cy, minDim);
    drawDNAMolecule(cx, cy, minDim);
    drawAtom(cx, cy, minDim);
    drawAtomicNucleus(cx, cy, minDim);

    // Subtle Center Optical Reticle
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 13, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 13, cy);
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 13);
    ctx.stroke();
    ctx.restore();

    updateHUD();
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
})();

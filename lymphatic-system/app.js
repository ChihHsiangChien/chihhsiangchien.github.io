(() => {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');

  const W = 900;
  const H = 620;

  // 全域模式與分頁狀態 (預設分頁 1：特寫頁面)
  let activeTab = 1; // 1: 組織間隙特寫 (微循環與細胞物質交換), 2: 淋巴系統全覽 (微淋巴管➔淋巴管➔淋巴結)
  let focusTarget1 = 'all'; // Tab 1 聚焦
  let focusTarget2 = 'all'; // Tab 2 聚焦

  // 構造可複選狀態管理 (Tab 1 預設勾選小動脈、微血管網、小靜脈，背景自動淡化)
  const STRUCT_NAMES_1 = {
    arteriole: '小動脈',
    capillaryBed: '微血管網',
    venule: '小靜脈',
    tissue: '組織細胞',
    lymphCapillary: '微淋巴管',
    lymphVessel: '淋巴管'
  };
  const ALL_STRUCTS_1 = Object.keys(STRUCT_NAMES_1);
  const DEFAULT_STRUCTS_1 = ['arteriole', 'capillaryBed', 'venule'];
  let selectedStructs1 = new Set(DEFAULT_STRUCTS_1); // 預設聚焦血液循環三大血管

  const STRUCT_NAMES_2 = {
    capillary: '微血管',
    tissueCells: '組織細胞',
    lymphCapillary: '微淋巴管',
    afferent: '輸入管與瓣膜',
    lymphNode: '淋巴結',
    efferent: '輸出淋巴管',
    nodeVessels: '淋巴結動靜脈'
  };
  const ALL_STRUCTS_2 = Object.keys(STRUCT_NAMES_2);
  const DEFAULT_STRUCTS_2 = ALL_STRUCTS_2;
  let selectedStructs2 = new Set(ALL_STRUCTS_2); // 預設全部呈現

  let dimOthersEnabled = true;
  let showLabels = false; // 預設不顯示標籤，提供純淨動態視野
  let showArrows = true;  // 預設顯示流向箭頭
  let isPaused = false;
  let filtrationRate = 1.0;
  let isEdemaBlocked = false;
  let edemaLevel = 0.0;
  let squeezePulse = 0;
  let germsFilteredCount = 0;
  let nodeImmuneGlow = 0;
  let time = 0;

  // 單選聚焦分子觀察模式 (Tab 1 特寫：預設聚焦紅血球單行血流)
  // 'water': 僅水分 (微血管滲出 ➔ 盲端吸收)
  // 'nutrient': 僅氧氣與養分 (進入細胞)
  // 'waste': 僅 CO2 與代謝廢物 (排出細胞)
  // 'rbc': 僅紅血球 (單行血流，鮮紅➔暗紅)
  // 'all': 全部綜合顯示
  let activeMolMode1 = 'rbc';
  const molAlpha = {
    water: 0.0,
    nutrient: 0.0,
    waste: 0.0,
    rbc: 1.0
  };

  // 全景元素觀察模式 (Tab 2 全覽：支援多選/複選，預設全部開啟)
  const ALL_ELEMENTS_2 = ['plasma', 'germ', 'macrophage', 'rbc'];
  let selectedElements2 = new Set(ALL_ELEMENTS_2);
  let activeMolMode2 = 'all';
  const molAlpha2 = {
    plasma: 1.0,
    germ: 1.0,
    macrophage: 1.0,
    rbc: 1.0
  };

  // 預先建立共用漸層 (Tab 1 & Tab 2)
  const bloodGrad1 = ctx.createLinearGradient(350, 590, 440, 360);
  bloodGrad1.addColorStop(0, '#e11d48');
  bloodGrad1.addColorStop(0.55, '#db2777');
  bloodGrad1.addColorStop(1, '#9d174d');

  const shellGrad = ctx.createRadialGradient(540, 190, 30, 515, 195, 155);
  shellGrad.addColorStop(0, '#bef264');
  shellGrad.addColorStop(0.55, '#84cc16');
  shellGrad.addColorStop(1, '#3f6212');

  const lumenGrad = ctx.createLinearGradient(560, 410, 720, 530);
  lumenGrad.addColorStop(0, '#b45309');
  lumenGrad.addColorStop(0.45, '#fde68a');
  lumenGrad.addColorStop(1, '#92400e');

  // Tab 1 (特寫) 專用微血管漸層 (左側動脈端紅 ➔ 中間紫褐 ➔ 右側靜脈端青藍)
  const capMeshGrad = ctx.createLinearGradient(180, 200, 700, 200);
  capMeshGrad.addColorStop(0, '#ef4444');
  capMeshGrad.addColorStop(0.35, '#c026d3');
  capMeshGrad.addColorStop(0.7, '#2563eb');
  capMeshGrad.addColorStop(1, '#0284c7');

  // Tab 1 (特寫) 各構造群組平滑透明度 (預設三大血管為 1.0，其餘淡化為 0.15)
  const groupAlpha1 = {
    arteriole: 1.0,
    capillaryBed: 1.0,
    venule: 1.0,
    exchange: 0.15,
    tissue: 0.15,
    lymphCapillary: 0.15,
    lymphVessel: 0.15
  };

  // Tab 2 (全覽) 各構造群組平滑透明度
  const groupAlpha2 = {
    capillary: 1.0,
    tissueCells: 1.0,
    lymphCapillary: 1.0,
    afferent: 1.0,
    lymphNode: 1.0,
    efferent: 1.0,
    nodeVessels: 1.0
  };

  // ==========================================
  // 構造解說文字資料庫 (純繁體中文)
  // ==========================================
  const INFO_TAB1 = {
    all: {
      title: '分頁 1 特寫：微血管網、物質交換與微淋巴管盲端',
      en: 'Microcirculation & Cellular Exchange (Close-up)',
      color: '#84cc16',
      desc: '本特寫視窗完整呈現微循環的動態生理機制：左側<strong>小動脈</strong>帶來高壓含氧血液，於<strong>微血管網</strong>進行物質交換——<strong>血漿自微血管壁濾出成為組織液</strong>，<strong>氧氣與葡萄糖進入組織細胞</strong>，<strong>細胞代謝廢物與CO₂排出進入組織液</strong>；右側<strong>小靜脈</strong>回收減氧血液與重吸收液體，多餘的組織液則經由<strong>盲端微淋巴管</strong>吸收轉化為<strong>淋巴液</strong>！'
    },
    arteriole: {
      title: '🎯 聚焦：小動脈 (Arteriole)',
      en: 'Arteriole (Blood Inflow)',
      color: '#ef4444',
      desc: '左側紅色粗血管。高壓含氧血液由下方流入，分支進入微血管網，管內白色箭頭表示血流方向。其管壁富含平滑肌，能調控進入下游微血管的血流量。'
    },
    capillaryBed: {
      title: '🎯 聚焦：微血管網 (Capillary Bed)',
      en: 'Capillary Network (Exchange Zone)',
      color: '#e11d48',
      desc: '呈拱橋狀密佈於組織細胞間的細微血管網。左側動脈端（鮮紅色）管壁薄孔隙多，血漿因高血壓濾出成為組織液；右側靜脈端（藍色）血壓降低，大部分組織液經由滲透壓重吸收入血管。'
    },
    exchange: {
      title: '🎯 聚焦：血漿滲出與細胞物質交換 (Filtration & Cellular Exchange)',
      en: 'Plasma Filtration & Cell Substance Exchange',
      color: '#38bdf8',
      desc: '<strong>【生理交換核心過程】：</strong><br>' +
        '1. 💧 <strong>血漿滲出</strong>：動脈端血壓高於膠體滲透壓，血漿（水、葡萄糖、胺基酸、氧氣）從微血管內皮縫隙<strong>滲出成為組織液</strong>。<br>' +
        '2. 🍏 <strong>養分與氧氣進入細胞</strong>：細胞膜藉由擴散與主動運輸攝取組織液中的 O₂ 與營養分子供代謝利用。<br>' +
        '3. 💨 <strong>代謝廢物排出細胞</strong>：細胞產生的二氧化碳（CO₂）與含氮廢物擴散回組織液。<br>' +
        '4. 🌿 <strong>淋巴吸收回流</strong>：約 90% 液體於靜脈端重吸收入血管，剩餘約 10% 攜帶蛋白質與多餘水分<strong>自微淋巴管盲端進入形成淋巴</strong>！'
    },
    tissue: {
      title: '🎯 聚焦：組織細胞與組織間隙 (Tissue Cells & Interstitial Fluid)',
      en: 'Tissue Cells & Interstitial Fluid',
      color: '#facc15',
      desc: '背景黃色有核細胞為<strong>組織細胞</strong>，細胞之間的空間為<strong>組織間隙</strong>。浸潤於其中的<strong>組織液</strong>為細胞提供水分、葡萄糖與氧氣，並回收代謝產生的二氧化碳與尿素。'
    },
    lymphCapillary: {
      title: '🎯 聚焦：微淋巴管盲端 (Lymphatic Capillaries)',
      en: 'Lymphatic Capillaries (Blind Ends)',
      color: '#84cc16',
      desc: '綠色手指狀、末端封閉的<strong>盲端微管</strong>。管壁內皮細胞重疊排列形成單向活門，如深藍色箭頭所示，當組織液壓力升高時便流入微淋巴管內成為<strong>「淋巴」</strong>。'
    },
    lymphVessel: {
      title: '🎯 聚焦：淋巴管網 (Lymphatic Vessels)',
      en: 'Lymphatic Vessel Plexus',
      color: '#65a30d',
      desc: '下方交織成網的綠色粗管路。匯集來自各微淋巴管的淋巴液，並單向輸送往輸入淋巴管與淋巴結，防止液體在組織中蓄積造成水腫。'
    },
    venule: {
      title: '🎯 聚焦：小靜脈 (Venule)',
      en: 'Venule (Blood Return)',
      color: '#38bdf8',
      desc: '右側藍色粗血管。收集來自微血管網的減氧血液與重吸收的組織液，沿管腔向下流入大靜脈，最後送回心臟。'
    }
  };

  const INFO_TAB2 = {
    all: {
      title: '分頁 2 全覽：微血管、組織液與淋巴系統全覽',
      en: 'Full System Overview (Capillary to Lymph Node)',
      color: '#84cc16',
      desc: '目前顯示完整淋巴系統全景：血漿自微血管滲出 ➔ 浸潤組織細胞 ➔ 組織液推開微淋巴管單向活門成為淋巴 ➔ 經輸入淋巴管半月瓣防倒流 ➔ 進入淋巴結由巨噬細胞過濾吞噬細菌 ➔ 乾淨淋巴匯回靜脈循環。'
    },
    capillary: {
      title: '🎯 聚焦：微血管與血漿滲出 (Blood Capillary)',
      en: 'Blood Capillary & Plasma Filtration',
      color: '#f43f5e',
      desc: '微血管管壁僅由單層內皮細胞組成。血液流經微血管時，受流體靜壓（血壓）驅動，部分<strong>血漿（水分與小分子養分）</strong>從內皮細胞間隙滲出（<strong>藍色箭頭</strong>）流入組織間隙成為<strong>組織液</strong>；<strong>紅血球與大分子血漿蛋白</strong>則留存管內流動。'
    },
    tissueCells: {
      title: '🎯 聚焦：組織細胞與組織水腫 (Tissue Cells & Edema)',
      en: 'Interstitial Fluid & Edema Mechanism',
      color: '#facc15',
      desc: '組織細胞浸潤在<strong>組織液</strong>中進行物質交換。若點擊「<strong>⚠️ 模擬淋巴阻塞水腫</strong>」或提高滲出率，當組織液生成速度大於淋巴與微血管靜脈端回收時，組織間隙會滯留過多液體，使<strong>組織明顯膨脹隆起、細胞間隙被撐開</strong>，此即臨床上的<strong>「組織水腫 (Edema)」</strong>。'
    },
    lymphCapillary: {
      title: '🎯 聚焦：微淋巴管與盲端放大剖面 (Lymphatic Capillary)',
      en: 'Lymphatic Capillary & Cutaway View',
      color: '#84cc16',
      desc: '微淋巴管末端為封閉的<strong>盲端</strong>。右下方<strong>放大剖面</strong>顯示其扁平內皮細胞邊緣呈<strong>瓦片狀重疊排列</strong>：當組織液壓力升高時，會推開內皮細胞縫隙（單向微瓣膜）流入管內，一旦進入管腔即正式改稱為<strong>「淋巴（淋巴液）」</strong>，且無法逆流！'
    },
    afferent: {
      title: '🎯 聚焦：輸入淋巴管與單向瓣膜 (Afferent Vessels & Valves)',
      en: 'Afferent Lymphatic Vessels & One-Way Valves',
      color: '#65a30d',
      desc: '由微淋巴管匯集而成的粗管路，通往淋巴結凸側。剖面窗中可見<strong>一對對半月形單向瓣膜</strong>隨組織擠壓開合，推動淋巴液單向流向淋巴結，防止液體倒流。'
    },
    lymphNode: {
      title: '🎯 聚焦：淋巴結吞噬與免疫過濾 (Lymph Node Filtration)',
      en: 'Phagocytosis & Immune Filtration',
      color: '#c084fc',
      desc: '豆狀淋巴器官，內部淋巴竇聚集大量<strong>巨噬細胞</strong>與<strong>淋巴球（B/T細胞）</strong>。當帶有<strong>紫色細菌</strong>的淋巴液流經時，會被網狀纖維攔截並由巨噬細胞伸出偽足<strong>吞噬消化清除</strong>（見左上特寫窗），確保流出淋巴結的淋巴液恢復潔淨！'
    },
    efferent: {
      title: '🎯 聚焦：輸出淋巴管 (Efferent Lymphatic Vessel)',
      en: 'Efferent Lymphatic Vessel',
      color: '#a3e635',
      desc: '由淋巴結凹陷的「門部（右側）」穿出，將過濾後的乾淨淋巴液帶離淋巴結，最終匯入胸管或右淋巴總管，注入<strong>鎖骨下靜脈</strong>重回血液循環。'
    },
    nodeVessels: {
      title: '🎯 聚焦：淋巴結的動脈與靜脈 (Artery & Vein)',
      en: 'Artery & Vein of Lymph Node',
      color: '#38bdf8',
      desc: '由門部進出的紅色動脈與藍色靜脈，深入淋巴小結微血管網，供應免疫細胞所需養分與氧氣，也是血液淋巴球進入淋巴結巡邏的通道。'
    }
  };

  // ==========================================
  // 更新右側構造呈現開關 (可複選) 與按鈕狀態
  // ==========================================
  function updateStructUI() {
    const isT1 = (activeTab === 1);

    // 更新 Tab 1 按鈕狀態
    document.querySelectorAll('#structFilterTab1 .struct-chip-btn').forEach(btn => {
      const s = btn.dataset.s1;
      const isSel = selectedStructs1.has(s);
      btn.classList.toggle('active', isSel);
    });

    // 更新 Tab 2 按鈕狀態
    document.querySelectorAll('#structFilterTab2 .struct-chip-btn').forEach(btn => {
      const s = btn.dataset.s2;
      const isSel = selectedStructs2.has(s);
      btn.classList.toggle('active', isSel);
    });

    // 更新構造呈現開關右上角按鈕狀態 (全部 / 重置)
    const btnAllS = document.getElementById('btnSelectAllStruct');
    const btnResetS = document.getElementById('btnResetStruct');
    if (isT1) {
      const isAll = (selectedStructs1.size === ALL_STRUCTS_1.length);
      const isDef = (selectedStructs1.size === DEFAULT_STRUCTS_1.length && DEFAULT_STRUCTS_1.every(k => selectedStructs1.has(k)));
      if (btnAllS) btnAllS.classList.toggle('active', isAll);
      if (btnResetS) btnResetS.classList.toggle('active', isDef);
    } else {
      const isAll = (selectedStructs2.size === ALL_STRUCTS_2.length);
      if (btnAllS) btnAllS.classList.toggle('active', isAll);
      if (btnResetS) btnResetS.classList.toggle('active', isAll);
    }

    // 更新觀察分子右上角按鈕狀態 (全部 / 重置)
    const btnAllM = document.getElementById('btnSelectAllMol');
    const btnResetM = document.getElementById('btnResetMol');
    if (isT1) {
      if (btnAllM) btnAllM.classList.toggle('active', activeMolMode1 === 'all');
      if (btnResetM) btnResetM.classList.toggle('active', activeMolMode1 === 'rbc');
    } else {
      const isAll2 = (selectedElements2.size === ALL_ELEMENTS_2.length);
      if (btnAllM) btnAllM.classList.toggle('active', isAll2);
      if (btnResetM) btnResetM.classList.toggle('active', isAll2);
      document.querySelectorAll('#molFilterGroup2 .mol-tab-btn').forEach(btn => {
        btn.classList.toggle('active', selectedElements2.has(btn.dataset.molmode2));
      });
    }

    // 更新底部提示列
    const hintEl = document.getElementById('focusHintPill');
    if (hintEl) {
      if (isT1) {
        const isAll = (selectedStructs1.size === ALL_STRUCTS_1.length);
        const isDef = (selectedStructs1.size === DEFAULT_STRUCTS_1.length && DEFAULT_STRUCTS_1.every(k => selectedStructs1.has(k)));
        if (isDef) {
          hintEl.textContent = '🩸 預設聚焦：血液循環三大血管【小動脈 + 微血管網 + 小靜脈】（點右上角【全部】可展開全構造）';
          hintEl.style.color = '#38bdf8';
        } else if (isAll) {
          hintEl.textContent = '🌟 目前全部構造同時呈現（點右上角【重置】可恢復三大血管預設）';
          hintEl.style.color = '#fde047';
        } else {
          const names = Array.from(selectedStructs1).map(k => STRUCT_NAMES_1[k] || k).join(' + ');
          hintEl.textContent = '👁️ 同時呈現構造：【' + names + '】（未選取之構造自動淡化，點右上角【重置】可回預設）';
          hintEl.style.color = '#86efac';
        }
      } else {
        const isAll = (selectedStructs2.size === ALL_STRUCTS_2.length);
        if (isAll) {
          hintEl.textContent = '🌿 淋巴系統全景呈現：微血管 ➔ 組織液 ➔ 微淋巴管 ➔ 淋巴管 ➔ 淋巴結';
          hintEl.style.color = '#86efac';
        } else {
          const names = Array.from(selectedStructs2).map(k => STRUCT_NAMES_2[k] || k).join(' + ');
          hintEl.textContent = '👁️ 同時呈現構造：【' + names + '】（未選取之構造自動淡化，點右上角【重置】可回預設）';
          hintEl.style.color = '#86efac';
        }
      }
    }
  }

  // 構造複選切換邏輯 (Tab 1)
  function toggleStruct1(key) {
    const isAll = (selectedStructs1.size === ALL_STRUCTS_1.length);
    if (isAll) {
      // 若原為全選，點選某一項則切換為「只看該項」
      selectedStructs1 = new Set([key]);
    } else {
      if (selectedStructs1.has(key)) {
        selectedStructs1.delete(key);
        // 若全部都被取消，自動恢復三大血管預設
        if (selectedStructs1.size === 0) selectedStructs1 = new Set(DEFAULT_STRUCTS_1);
      } else {
        selectedStructs1.add(key);
      }
    }
    focusTarget1 = (selectedStructs1.size === 1) ? Array.from(selectedStructs1)[0] : 'all';
    updateStructUI();
  }

  // 全選 Tab 1 所有構造
  function selectAllStructs1() {
    selectedStructs1 = new Set(ALL_STRUCTS_1);
    focusTarget1 = 'all';
    updateStructUI();
  }

  // 重置 Tab 1 為預設三大血管（小動脈、微血管網、小靜脈）
  function resetStructs1() {
    selectedStructs1 = new Set(DEFAULT_STRUCTS_1);
    focusTarget1 = 'all';
    updateStructUI();
  }

  // 構造複選切換邏輯 (Tab 2)
  function toggleStruct2(key) {
    const isAll = (selectedStructs2.size === ALL_STRUCTS_2.length);
    if (isAll) {
      selectedStructs2 = new Set([key]);
    } else {
      if (selectedStructs2.has(key)) {
        selectedStructs2.delete(key);
        if (selectedStructs2.size === 0) selectedStructs2 = new Set(ALL_STRUCTS_2);
      } else {
        selectedStructs2.add(key);
      }
    }
    focusTarget2 = (selectedStructs2.size === 1) ? Array.from(selectedStructs2)[0] : 'all';
    updateStructUI();
  }

  // 全選 Tab 2 所有構造
  function selectAllStructs2() {
    selectedStructs2 = new Set(ALL_STRUCTS_2);
    focusTarget2 = 'all';
    updateStructUI();
  }

  // 重置 Tab 2 預設全景構造
  function resetStructs2() {
    selectedStructs2 = new Set(DEFAULT_STRUCTS_2);
    focusTarget2 = 'all';
    updateStructUI();
  }

  // 切換分頁 Tab
  function switchTab(tabNum) {
    activeTab = tabNum;
    document.getElementById('tabBtn1').classList.toggle('active', tabNum === 1);
    document.getElementById('tabBtn2').classList.toggle('active', tabNum === 2);

    const g1 = document.getElementById('molFilterGroup1');
    const g2 = document.getElementById('molFilterGroup2');
    if (g1) g1.classList.toggle('hidden', tabNum !== 1);
    if (g2) g2.classList.toggle('hidden', tabNum !== 2);

    const sf1 = document.getElementById('structFilterTab1');
    const sf2 = document.getElementById('structFilterTab2');
    if (sf1) sf1.classList.toggle('hidden', tabNum !== 1);
    if (sf2) sf2.classList.toggle('hidden', tabNum !== 2);

    const lbl = document.getElementById('lblMolGroup');
    if (lbl) {
      lbl.textContent = (tabNum === 1) ? '💧 觀察分子切換 (單選聚焦)' : '🌿 全景觀察元素 (單選聚焦)';
    }

    updateStructUI();
  }

  document.getElementById('tabBtn1').addEventListener('click', () => switchTab(1));
  document.getElementById('tabBtn2').addEventListener('click', () => switchTab(2));

  // 綁定右側「全部構造」按鈕
  const btnSelectAllStruct = document.getElementById('btnSelectAllStruct');
  if (btnSelectAllStruct) {
    btnSelectAllStruct.addEventListener('click', () => {
      if (activeTab === 1) {
        if (selectedStructs1.size === ALL_STRUCTS_1.length) {
          resetStructs1();
        } else {
          selectAllStructs1();
        }
      } else {
        selectAllStructs2();
      }
    });
  }

  // 綁定右側「重置構造」按鈕 (100% 重置回三大血管預設狀態)
  const btnResetStruct = document.getElementById('btnResetStruct');
  if (btnResetStruct) {
    btnResetStruct.addEventListener('click', () => {
      if (activeTab === 1) resetStructs1();
      else resetStructs2();
    });
  }

  // 綁定 Tab 1 構造複選晶片按鈕
  document.querySelectorAll('#structFilterTab1 .struct-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleStruct1(btn.dataset.s1);
    });
  });

  // 綁定 Tab 2 構造複選晶片按鈕
  document.querySelectorAll('#structFilterTab2 .struct-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleStruct2(btn.dataset.s2);
    });
  });

  function setFocus1(target) {
    if (target === 'all') selectAllStructs1();
    else toggleStruct1(target);
  }

  function setFocus2(target) {
    if (target === 'all') selectAllStructs2();
    else toggleStruct2(target);
  }

  // 分子觀察模式切換 (Tab 1 特寫)
  function setMolMode1(mode) {
    activeMolMode1 = mode;
    const isAll = (mode === 'all');
    document.querySelectorAll('#molFilterGroup1 .mol-tab-btn').forEach(btn => {
      btn.classList.toggle('active', isAll || btn.dataset.molmode === mode);
    });
    updateStructUI();
  }

  // 元素觀察模式切換 (Tab 2 全覽：支援多選/獨立開關，避免彼此覆蓋)
  function toggleMol2Element(key) {
    const isAll = (selectedElements2.size === ALL_ELEMENTS_2.length);
    if (isAll) {
      selectedElements2 = new Set([key]);
    } else {
      if (selectedElements2.has(key)) {
        selectedElements2.delete(key);
        if (selectedElements2.size === 0) selectedElements2 = new Set(ALL_ELEMENTS_2);
      } else {
        selectedElements2.add(key);
      }
    }
    updateStructUI();
  }

  function setMolMode2(mode) {
    if (mode === 'all') {
      selectedElements2 = new Set(ALL_ELEMENTS_2);
    } else {
      toggleMol2Element(mode);
    }
    updateStructUI();
  }

  // 綁定右上角「全部分子」按鈕
  const btnSelectAllMol = document.getElementById('btnSelectAllMol');
  if (btnSelectAllMol) {
    btnSelectAllMol.addEventListener('click', () => {
      if (activeTab === 1) {
        setMolMode1(activeMolMode1 === 'all' ? 'rbc' : 'all');
      } else {
        setMolMode2('all');
      }
    });
  }

  // 綁定右上角「重置分子」按鈕 (重置為預設：紅血球單行血流)
  const btnResetMol = document.getElementById('btnResetMol');
  if (btnResetMol) {
    btnResetMol.addEventListener('click', () => {
      if (activeTab === 1) {
        setMolMode1('rbc');
      } else {
        setMolMode2('all');
      }
    });
  }

  // 綁定 Tab 1 分子切換列
  document.querySelectorAll('#molFilterGroup1 .mol-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setMolMode1(btn.dataset.molmode);
    });
  });

  // 綁定 Tab 2 元素切換列
  document.querySelectorAll('#molFilterGroup2 .mol-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setMolMode2(btn.dataset.molmode2);
    });
  });

  document.getElementById('chkDimOthers').addEventListener('change', e => { dimOthersEnabled = e.target.checked; });
  document.getElementById('chkLabels').addEventListener('change', e => { showLabels = e.target.checked; });
  document.getElementById('chkArrows').addEventListener('change', e => { showArrows = e.target.checked; });
  document.getElementById('chkPause').addEventListener('change', e => { isPaused = e.target.checked; });

  const rngFiltration = document.getElementById('rngFiltration');
  const lblFiltration = document.getElementById('lblFiltration');
  rngFiltration.addEventListener('input', e => {
    filtrationRate = parseFloat(e.target.value);
    let s = '正常 (動態平衡)';
    if (filtrationRate >= 1.8) s = '極高 (超量滲出，自動引發水腫 ⚠️)';
    else if (filtrationRate >= 1.4) s = '偏高 (接近引流上限)';
    else if (filtrationRate <= 0.6) s = '偏低 (生成減緩)';
    lblFiltration.textContent = s + ' (' + filtrationRate.toFixed(1) + 'x)';
  });

  document.getElementById('btnPlasmaBurst').addEventListener('click', () => {
    if (activeTab === 1) {
      setFocus1('exchange');
      for (let i = 0; i < 24; i++) spawnT1PlasmaLeak(true);
      for (let i = 0; i < 18; i++) spawnT1CellExchange();
    } else {
      setFocus2('capillary');
      for (let i = 0; i < 16; i++) spawnPlasmaLeakParticle(true);
    }
  });

  document.getElementById('btnSqueezeLymph').addEventListener('click', () => {
    squeezePulse = 1.0;
    if (activeTab === 1) {
      setFocus1('lymphVessel');
    } else {
      setFocus2('afferent');
      for (let i = 0; i < 6; i++) spawnCutawayEntryParticle();
    }
  });

  function triggerGermWave() {
    if (activeTab !== 2) switchTab(2);
    // 關鍵修復：絕不關閉原本已設定好的元素（如巨噬細胞、血漿等保持開啟）！
    // 確保細菌開啟，且巨噬細胞也開啟（以完整展示吞噬免疫動態）
    selectedElements2.add('germ');
    selectedElements2.add('macrophage');
    updateStructUI();
    nodeImmuneGlow = 1.0;

    const targetSites = [
      { x: 430, y: 155, macIdx: 0 },
      { x: 472, y: 185, macIdx: 1 },
      { x: 425, y: 225, macIdx: 2 },
      { x: 485, y: 242, macIdx: 3 }
    ];

    targetSites.forEach((site, idx) => {
      // 1. 細菌先投放在組織細胞間的「組織液」中 (黃色細胞區 x: 490~580, y: 480~530)
      const startX = 490 + (idx % 2) * 50 + Math.random() * 30;
      const startY = 480 + Math.floor(idx / 2) * 25 + Math.random() * 20;
      // 微淋巴管盲端單向瓦片瓣膜活門入口座標 (剖面窗處)
      const gateX = 635 + (idx % 2) * 20;
      const gateY = 432 + (idx % 2) * 16;

      germParticles.push({
        phase: 'tissue',       // 階段 1: 先在組織液中游移
        x: startX,
        y: startY,
        gateX: gateX,
        gateY: gateY,
        tissueTimer: 0,
        maxTissueTime: 110 + idx * 28, // 在組織液中游走約 2 秒
        pathIdx: idx % lymphPaths1.length,
        t: 0.08,               // 進入微淋巴管後的起始進度
        targetSite: site,
        macIdx: site.macIdx,
        engulfProgress: 0,
        digestProgress: 0
      });
    });
  }
  document.getElementById('btnInjectGerm').addEventListener('click', triggerGermWave);

  const btnToggleEdema = document.getElementById('btnToggleEdema');
  btnToggleEdema.addEventListener('click', () => {
    isEdemaBlocked = !isEdemaBlocked;
    btnToggleEdema.classList.toggle('active', isEdemaBlocked);
    btnToggleEdema.innerHTML = isEdemaBlocked
      ? '<span>🔓</span> 解除阻塞 (消退水腫)'
      : '<span>⚠️</span> 模擬淋巴阻塞水腫';
    if (isEdemaBlocked) {
      if (activeTab === 1) {
        setFocus1('tissue');
        for (let i = 0; i < 20; i++) spawnT1PlasmaLeak(true);
      } else {
        setFocus2('tissueCells');
        for (let i = 0; i < 18; i++) spawnPlasmaLeakParticle(true);
      }
    } else {
      if (activeTab === 1) setFocus1('all');
      else setFocus2('all');
    }
  });

  // ==========================================
  // 通用輔助函式
  // ==========================================
  function getPointOnPath(path, t) {
    if (!path || path.length < 2) return { x: 0, y: 0, angle: 0 };
    const totalSegs = path.length - 1;
    const scaled = Math.max(0, Math.min(0.9999, t)) * totalSegs;
    const idx = Math.floor(scaled);
    const frac = scaled - idx;
    const p0 = path[idx];
    const p1 = path[idx + 1];
    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
      angle: Math.atan2(p1.y - p0.y, p1.x - p0.x)
    };
  }

  // 繪製具真實生物外觀的雙凹圓盤狀紅血球 (動脈鮮紅 ➔ 靜脈深暗紅，生物學上絕不是藍色！)
  function drawRbcBiconcave(ctx, x, y, angle, t, size = 5.2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 依據含氧飽和度漸變：
    // 動脈端(高氧合)：鮮緋紅(#ef4444)
    // 微血管中段(釋放O2)：深寶石紅(#be123c)
    // 靜脈端(減氧)：深酒紅/暗棗紅(#881337)，絕非藍色！
    let outerColor, innerColor, strokeColor;
    if (t < 0.35) {
      outerColor = '#ef4444';
      innerColor = '#fca5a5';
      strokeColor = '#991b1b';
    } else if (t < 0.7) {
      outerColor = '#be123c';
      innerColor = '#fb7185';
      strokeColor = '#70072b';
    } else {
      outerColor = '#881337'; // 深暗紅 (靜脈減氧紅血球)
      innerColor = '#9f1239';
      strokeColor = '#4c0519';
    }

    // 雙凹橢圓盤輪廓
    ctx.fillStyle = outerColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 中央凹陷處透光淺層
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.48, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSmoothPath(ctx, pts) {
    if (!pts || pts.length < 2) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
      return;
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  function drawCurvedArrow(x1, y1, cx, cy, x2, y2, color, lineWidth = 2.4, headSize = 7, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - cy, x2 - cx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawValvePair(x, y, angle, openFactor, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    const gap = 2 + openFactor * 6.5;
    ctx.strokeStyle = '#fefce8';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -11);
    ctx.quadraticCurveTo(0, -gap - 2, 9, -gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 11);
    ctx.quadraticCurveTo(0, gap + 2, 9, gap);
    ctx.stroke();
    ctx.restore();
  }

  function drawMacrophage(x, y, radius, engulfRatio = 0, targetAngle = 0, isHunting = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(targetAngle);
    ctx.fillStyle = isHunting ? 'rgba(238, 248, 255, 0.96)' : 'rgba(240, 249, 255, 0.92)';
    ctx.strokeStyle = isHunting ? '#0284c7' : '#0369a1';
    ctx.lineWidth = isHunting ? 2.6 : 2;
    ctx.beginPath();
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      let pseudopod = Math.sin(theta * 6 + time * 5) * 2.0;
      if (engulfRatio > 0.05) {
        // 吞噬杯 (Phagocytic Cup) 偽足大幅向前延伸包圍夾住細菌
        const diff1 = Math.abs(theta - 0.42);
        const diff2 = Math.abs(theta - (Math.PI * 2 - 0.42));
        if (diff1 < 0.52 || diff2 < 0.52) {
          pseudopod += engulfRatio * 15.0;
        }
      } else if (isHunting) {
        // 主動追擊中：前端偽足朝向目標方向激動伸展
        if (Math.cos(theta) > 0.25) {
          pseudopod += Math.cos(theta) * 5.0 + Math.sin(time * 8 + theta * 3) * 2.0;
        }
      }
      const r = radius + pseudopod;
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 巨噬細胞核 (腎形染色質)
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.22, 0, radius * 0.38, radius * 0.28, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 溶酶體酵素顆粒 (Lysosomes)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(-radius * 0.1, -radius * 0.35, 1.8, 0, Math.PI * 2);
    ctx.arc(-radius * 0.1, radius * 0.35, 1.8, 0, Math.PI * 2);
    ctx.arc(radius * 0.2, -radius * 0.2, 2.0, 0, Math.PI * 2);
    ctx.arc(radius * 0.2, radius * 0.2, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBacterium(x, y, scale = 1, digestProgress = 0) {
    ctx.save();
    ctx.translate(x, y);
    if (digestProgress > 0.2) {
      const fragCount = 6;
      for (let i = 0; i < fragCount; i++) {
        const ang = (i / fragCount) * Math.PI * 2 + digestProgress * 2;
        const dist = digestProgress * 11;
        ctx.fillStyle = 'rgba(168, 85, 247, ' + (1 - digestProgress) + ')';
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, Math.max(0.5, 3.2 * (1 - digestProgress)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = '#9333ea';
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 3;
      ctx.lineTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5);
      ctx.lineTo(Math.cos(a + 0.39) * 4.2, Math.sin(a + 0.39) * 4.2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================
  // Tab 1 (特寫) 專用構造幾何定義
  // ==========================================
  // 組織細胞背景網格座標 (50 顆黃色有核細胞形成組織床)
  const t2Cells = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 9; col++) {
      const cx = 215 + col * 52 + (row % 2) * 26 + Math.sin(col * 3.1 + row) * 8;
      const cy = 110 + row * 66 + Math.cos(col * 1.5 + row * 2) * 8;
      if (cx > 208 && cx < 672 && cy > 90 && cy < 470) {
        t2Cells.push({
          x: cx, y: cy,
          rx: 20 + (col % 3) * 2,
          ry: 15 + (row % 2) * 2,
          rot: (col - row) * 0.18,
          phase: (col * 1.3 + row * 2.1)
        });
      }
    }
  }

  // Tab 1 完整實體相連的微血管網向量路徑 (全數與小動脈 x=180、小靜脈 x=700 實體相連)
  const t2CapillaryLoops = [
    // 迴路 0：下部直捷通路 (從小動脈 180,440 貫穿，直入小靜脈 700,440)
    [
      { x: 180, y: 440 }, { x: 260, y: 435 }, { x: 370, y: 430 },
      { x: 480, y: 430 }, { x: 590, y: 435 }, { x: 700, y: 440 }
    ],
    // 迴路 1：頂部外層大拱橋迴路 (小動脈 180,240 ➔ 頂部弧形 ➔ 小靜脈 700,240)
    [
      { x: 180, y: 240 }, { x: 220, y: 200 }, { x: 275, y: 155 },
      { x: 360, y: 120 }, { x: 445, y: 110 }, { x: 535, y: 120 },
      { x: 615, y: 155 }, { x: 665, y: 200 }, { x: 700, y: 240 }
    ],
    // 迴路 2：中上層網格迴路 (小動脈 180,240 ➔ 中上層拱網 ➔ 小靜脈 700,240)
    [
      { x: 180, y: 240 }, { x: 235, y: 250 }, { x: 300, y: 215 },
      { x: 385, y: 180 }, { x: 470, y: 180 }, { x: 555, y: 215 },
      { x: 645, y: 250 }, { x: 700, y: 240 }
    ],
    // 迴路 3：中層網格迴路 (小動脈 180,340 ➔ 中部網絡 ➔ 小靜脈 700,340)
    [
      { x: 180, y: 340 }, { x: 240, y: 325 }, { x: 320, y: 295 },
      { x: 410, y: 275 }, { x: 490, y: 275 }, { x: 580, y: 295 },
      { x: 650, y: 325 }, { x: 700, y: 340 }
    ],
    // 迴路 4：中下層吻合支 (小動脈 180,340 ➔ 中下網絡 ➔ 小靜脈 700,340)
    [
      { x: 180, y: 340 }, { x: 250, y: 370 }, { x: 340, y: 375 },
      { x: 445, y: 380 }, { x: 545, y: 375 }, { x: 640, y: 370 }, { x: 700, y: 340 }
    ],
    // 縱向垂直吻合細分支 (交織成立體毛細血管網格)
    [{ x: 360, y: 120 }, { x: 385, y: 180 }, { x: 410, y: 275 }],
    [{ x: 535, y: 120 }, { x: 470, y: 180 }, { x: 490, y: 275 }],
    [{ x: 300, y: 215 }, { x: 320, y: 295 }, { x: 260, y: 435 }],
    [{ x: 555, y: 215 }, { x: 580, y: 295 }, { x: 590, y: 435 }],
    [{ x: 445, y: 275 }, { x: 445, y: 380 }, { x: 480, y: 430 }]
  ];

  // Tab 1 綠色微淋巴管盲端 (4 根盲端手指，頂部圓帽封閉吸收組織液，基部 100% 融合於下方淋巴管網)
  const t2LymphCapillaries = [
    {
      tip: { x: 270, y: 270 },
      pts: [{ x: 270, y: 270 }, { x: 272, y: 340 }, { x: 275, y: 410 }, { x: 275, y: 480 }],
      arrow: { fromX: 240, fromY: 245, toX: 268, toY: 268 }
    },
    {
      tip: { x: 370, y: 150 },
      pts: [{ x: 370, y: 150 }, { x: 372, y: 240 }, { x: 375, y: 340 }, { x: 375, y: 480 }],
      arrow: { fromX: 345, fromY: 125, toX: 368, toY: 148 }
    },
    {
      tip: { x: 485, y: 140 },
      pts: [{ x: 485, y: 140 }, { x: 480, y: 230 }, { x: 475, y: 340 }, { x: 475, y: 480 }],
      arrow: { fromX: 510, fromY: 115, toX: 488, toY: 138 }
    },
    {
      tip: { x: 590, y: 260 },
      pts: [{ x: 590, y: 260 }, { x: 585, y: 340 }, { x: 580, y: 410 }, { x: 580, y: 480 }],
      arrow: { fromX: 615, fromY: 235, toX: 592, toY: 258 }
    },
    {
      tip: null,
      pts: [{ x: 372, y: 260 }, { x: 425, y: 255 }, { x: 480, y: 255 }],
      arrow: null
    }
  ];

  // Tab 1 下方交織匯流的淋巴管網 (Plexus)
  const t2LymphNetSegments = [
    [{ x: 200, y: 490 }, { x: 275, y: 480 }, { x: 375, y: 480 }, { x: 475, y: 480 }, { x: 580, y: 480 }, { x: 660, y: 490 }],
    [{ x: 275, y: 480 }, { x: 320, y: 535 }, { x: 375, y: 480 }],
    [{ x: 375, y: 480 }, { x: 425, y: 540 }, { x: 475, y: 480 }],
    [{ x: 475, y: 480 }, { x: 530, y: 535 }, { x: 580, y: 480 }],
    [{ x: 320, y: 535 }, { x: 360, y: 585 }, { x: 440, y: 590 }, { x: 510, y: 585 }, { x: 530, y: 535 }],
    [{ x: 200, y: 555 }, { x: 275, y: 480 }],
    [{ x: 580, y: 480 }, { x: 660, y: 555 }]
  ];

  // ==========================================
  // Tab 1 (特寫) 專用動態粒子系統
  // ==========================================
  // 1. RBC 紅血球 (在微血管網內巡航，從小動脈端亮紅 ➔ 微血管中段紫 ➔ 小靜脈端天藍)
  const t1RbcList = [];
  for (let i = 0; i < 30; i++) {
    t1RbcList.push({
      loopIdx: i % 5,
      t: Math.random(),
      speed: 0.0026 + Math.random() * 0.0012
    });
  }

  // 2. 血漿自微血管壁濾出粒子 (Plasma Leakage from Capillaries into Interstitial Space)
  const t1PlasmaLeakList = [];
  function spawnT1PlasmaLeak(burst = false) {
    const loopIdx = Math.floor(Math.random() * 5);
    const loop = t2CapillaryLoops[loopIdx];
    // 動脈端與中前段血壓高，容易濾出
    const t = 0.08 + Math.random() * 0.52;
    const pt = getPointOnPath(loop, t);
    const normAngle = pt.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const speed = (0.55 + Math.random() * 0.8) * filtrationRate * (burst ? 2.2 : 1.0);
    t1PlasmaLeakList.push({
      x: pt.x,
      y: pt.y,
      vx: Math.cos(normAngle) * speed + (Math.random() - 0.5) * 0.25,
      vy: Math.sin(normAngle) * speed + (Math.random() - 0.5) * 0.25,
      age: 0,
      maxAge: 75 + Math.random() * 55,
      size: 3.2 + Math.random() * 1.5
    });
  }
  for (let i = 0; i < 22; i++) spawnT1PlasmaLeak();

  // 3. 組織細胞物質交換粒子 (Substance Exchange with Cells: 氧氣/養分進入細胞、CO2/代謝廢物排出細胞)
  const t1CellExchangeList = [];
  function spawnT1CellExchange() {
    if (t2Cells.length === 0) return;
    const cellIdx = Math.floor(Math.random() * t2Cells.length);
    const cell = t2Cells[cellIdx];
    const isNutrient = (Math.random() < 0.52);
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 22;

    if (isNutrient) {
      // 養分與氧氣 (Nutrients & O2)：自組織液游向細胞內部
      t1CellExchangeList.push({
        type: 'nutrient',
        cellIdx,
        x: cell.x + Math.cos(angle) * dist,
        y: cell.y + Math.sin(angle) * dist,
        tx: cell.x + (Math.random() - 0.5) * 8,
        ty: cell.y + (Math.random() - 0.5) * 6,
        progress: 0,
        speed: 0.016 + Math.random() * 0.012,
        size: 2.8 + Math.random() * 1.2
      });
    } else {
      // 代謝廢物與CO2 (Metabolic wastes & CO2)：自細胞內部排出至周圍組織液
      t1CellExchangeList.push({
        type: 'waste',
        cellIdx,
        x: cell.x + (Math.random() - 0.5) * 8,
        y: cell.y + (Math.random() - 0.5) * 6,
        tx: cell.x + Math.cos(angle) * dist,
        ty: cell.y + Math.sin(angle) * dist,
        progress: 0,
        speed: 0.014 + Math.random() * 0.010,
        size: 2.6 + Math.random() * 1.2
      });
    }
  }
  for (let i = 0; i < 26; i++) spawnT1CellExchange();

  // 4. 多餘組織液進入微淋巴管盲端粒子 (Lymph absorption at blind ends)
  const t1LymphFluidList = [];
  for (let i = 0; i < 22; i++) {
    t1LymphFluidList.push({
      capIdx: i % 4,
      t: Math.random(),
      speed: 0.0035 + Math.random() * 0.0018
    });
  }

  // 5. 匯集淋巴管網內部淋巴液回流粒子 (Lymph flow in vessels/plexus)
  const t1VesselFluidList = [];
  for (let i = 0; i < 18; i++) {
    t1VesselFluidList.push({
      segIdx: i % t2LymphNetSegments.length,
      t: Math.random(),
      speed: 0.0038 + Math.random() * 0.002
    });
  }

  // ==========================================
  // Tab 2 (全覽) 幾何構造與動態路徑
  // ==========================================
  const bloodPaths1 = [
    [{ x: 355, y: 600 }, { x: 345, y: 535 }, { x: 295, y: 485 }, { x: 230, y: 465 }],
    [{ x: 355, y: 600 }, { x: 345, y: 535 }, { x: 390, y: 455 }, { x: 440, y: 395 }, { x: 475, y: 355 }],
    [{ x: 355, y: 600 }, { x: 345, y: 535 }, { x: 390, y: 455 }, { x: 485, y: 440 }, { x: 565, y: 455 }],
    [{ x: 440, y: 395 }, { x: 412, y: 348 }]
  ];

  const lymphPaths1 = [
    [
      { x: 750, y: 475 }, { x: 660, y: 440 }, { x: 575, y: 400 }, { x: 475, y: 395 },
      { x: 355, y: 395 }, { x: 265, y: 355 }, { x: 145, y: 360 }, { x: 215, y: 265 },
      { x: 315, y: 195 }, { x: 375, y: 165 }, { x: 465, y: 175 }, { x: 545, y: 188 },
      { x: 665, y: 185 }, { x: 780, y: 192 }
    ],
    [
      { x: 280, y: 535 }, { x: 292, y: 445 }, { x: 300, y: 375 }, { x: 245, y: 350 },
      { x: 145, y: 360 }, { x: 215, y: 265 }, { x: 335, y: 240 }, { x: 385, y: 212 },
      { x: 460, y: 215 }, { x: 545, y: 188 }, { x: 665, y: 185 }, { x: 780, y: 192 }
    ],
    [
      { x: 422, y: 528 }, { x: 382, y: 455 }, { x: 355, y: 395 }, { x: 265, y: 355 },
      { x: 145, y: 360 }, { x: 215, y: 265 }, { x: 315, y: 195 }, { x: 375, y: 165 },
      { x: 475, y: 150 }, { x: 545, y: 188 }, { x: 665, y: 185 }, { x: 780, y: 192 }
    ]
  ];

  const TISSUE_CENTER1 = { x: 520, y: 490 };
  const tissueCells1 = [
    { x: 460, y: 480, rx: 22, ry: 16, rot: 0.2 },
    { x: 498, y: 470, rx: 21, ry: 15, rot: -0.15 },
    { x: 536, y: 478, rx: 22, ry: 16, rot: 0.1 },
    { x: 482, y: 502, rx: 23, ry: 16, rot: -0.1 },
    { x: 525, y: 506, rx: 22, ry: 16, rot: 0.25 },
    { x: 568, y: 502, rx: 21, ry: 15, rot: -0.2 },
    { x: 505, y: 535, rx: 24, ry: 17, rot: 0.05 },
    { x: 555, y: 532, rx: 22, ry: 16, rot: -0.12 },
    { x: 598, y: 524, rx: 21, ry: 15, rot: 0.18 },
    { x: 632, y: 540, rx: 22, ry: 15, rot: -0.08 },
    { x: 625, y: 360, rx: 21, ry: 15, rot: 0.3 },
    { x: 690, y: 385, rx: 22, ry: 16, rot: 0.2 },
    { x: 765, y: 422, rx: 22, ry: 16, rot: 0.15 },
    { x: 325, y: 422, rx: 16, ry: 12, rot: -0.2 },
    { x: 358, y: 360, rx: 15, ry: 11, rot: 0.1 },
    { x: 405, y: 425, rx: 16, ry: 12, rot: 0.25 },
    { x: 272, y: 395, rx: 15, ry: 11, rot: -0.15 }
  ];

  const lymphFollicles1 = [
    { x: 515, y: 105, r: 21, angle: -1.35 },
    { x: 572, y: 125, r: 19, angle: -0.85 },
    { x: 595, y: 160, r: 16, angle: -0.35 },
    { x: 408, y: 225, r: 19, angle: 2.65 },
    { x: 438, y: 260, r: 20, angle: 2.15 },
    { x: 488, y: 272, r: 18, angle: 1.65 }
  ];

  const nodeMacrophages1 = [
    { homeX: 432, homeY: 152, x: 432, y: 152, r: 13, isHunting: false, targetAngle: 0, engulfRatio: 0 },
    { homeX: 475, homeY: 182, x: 475, y: 182, r: 13, isHunting: false, targetAngle: 0, engulfRatio: 0 },
    { homeX: 422, homeY: 208, x: 422, y: 208, r: 13, isHunting: false, targetAngle: 0, engulfRatio: 0 },
    { homeX: 482, homeY: 228, x: 482, y: 228, r: 13, isHunting: false, targetAngle: 0, engulfRatio: 0 }
  ];

  const rbcParticles = [];
  const fluidParticles = [];
  const cutawayParticles = [];
  const germParticles = [];

  for (let i = 0; i < 22; i++) {
    rbcParticles.push({
      pathIdx: i % bloodPaths1.length,
      t: Math.random(),
      speed: 0.0022 + Math.random() * 0.0008,
      offset: (Math.random() - 0.5) * 6
    });
  }

  // 分頁 2 微血管滲出點 (全面分散於各級微血管網，出發點自然分佈於各區域)
  // 同時各點配對最鄰近之微淋巴管盲端活門 (消失點廣泛分佈於盲端各處與剖面窗入口，大幅分散)
  const leakPoints2 = [
    // 1. 左側微血管分支 (x: 240~330, y: 470~530) ➔ 引流至左側盲端 (x: 280, y: 535) 與支管 (x: 292, y: 445)
    { x: 245, y: 470, vx: -0.85, vy: -0.4, targetX: 280, targetY: 535, pathIdx: 1, targetT: 0.0 },
    { x: 275, y: 485, vx: -0.65, vy: 0.7, targetX: 280, targetY: 535, pathIdx: 1, targetT: 0.0 },
    { x: 300, y: 505, vx: -0.8, vy: 0.5, targetX: 292, targetY: 445, pathIdx: 1, targetT: 0.10 },
    { x: 320, y: 525, vx: -0.9, vy: -0.3, targetX: 292, targetY: 445, pathIdx: 1, targetT: 0.10 },

    // 2. 下方主幹分支處 (x: 340~365, y: 530~590) ➔ 引流至中央偏下盲端 (x: 422, y: 528)
    { x: 348, y: 575, vx: 0.75, vy: -0.65, targetX: 422, targetY: 528, pathIdx: 2, targetT: 0.0 },
    { x: 345, y: 540, vx: -0.7, vy: -0.5, targetX: 280, targetY: 535, pathIdx: 1, targetT: 0.0 },
    { x: 358, y: 520, vx: 0.95, vy: -0.4, targetX: 422, targetY: 528, pathIdx: 2, targetT: 0.0 },

    // 3. 中段微血管分支 (深入細胞核心區 x: 400~565, y: 430~470) ➔ 引流至中間盲端與剖面窗盲端入口
    { x: 405, y: 450, vx: 0.85, vy: 0.75, targetX: 382, targetY: 455, pathIdx: 2, targetT: 0.12 },
    { x: 440, y: 442, vx: 1.05, vy: 0.65, targetX: 422, targetY: 528, pathIdx: 2, targetT: 0.0 },
    { x: 475, y: 440, vx: 1.15, vy: 0.45, targetX: 575, targetY: 400, pathIdx: 0, targetT: 0.20 },
    { x: 505, y: 446, vx: 0.95, vy: 0.65, targetX: 575, targetY: 400, pathIdx: 0, targetT: 0.20 },
    { x: 535, y: 452, vx: 1.1, vy: 0.4, targetX: 650, targetY: 435, pathIdx: 0, targetT: 0.14 },
    { x: 562, y: 455, vx: 1.25, vy: 0.25, targetX: 650, targetY: 435, pathIdx: 0, targetT: 0.14 },

    // 4. 中上微血管分支 (x: 370~475, y: 355~430) ➔ 引流至上方支管與盲端
    { x: 375, y: 470, vx: 1.05, vy: -0.65, targetX: 355, targetY: 395, pathIdx: 2, targetT: 0.24 },
    { x: 395, y: 435, vx: 0.95, vy: -0.55, targetX: 355, targetY: 395, pathIdx: 2, targetT: 0.24 },
    { x: 422, y: 412, vx: 1.15, vy: -0.4, targetX: 475, targetY: 395, pathIdx: 0, targetT: 0.28 },
    { x: 445, y: 390, vx: 0.85, vy: 0.75, targetX: 575, targetY: 400, pathIdx: 0, targetT: 0.20 },
    { x: 470, y: 365, vx: 0.75, vy: 0.85, targetX: 575, targetY: 400, pathIdx: 0, targetT: 0.20 },

    // 5. 右上方瓦片單向活門剖面區附近 (x: 520~550, y: 480~495) ➔ 引流至右側瓦片瓣膜與末梢
    { x: 415, y: 355, vx: 0.7, vy: -0.6, targetX: 355, targetY: 395, pathIdx: 2, targetT: 0.24 },
    { x: 520, y: 480, vx: 1.1, vy: 0.5, targetX: 715, targetY: 460, pathIdx: 0, targetT: 0.08 },
    { x: 550, y: 495, vx: 1.2, vy: 0.3, targetX: 750, targetY: 475, pathIdx: 0, targetT: 0.02 }
  ];

  function spawnPlasmaLeakParticle(isBurst = false) {
    const lp = leakPoints2[Math.floor(Math.random() * leakPoints2.length)];
    fluidParticles.push({
      state: 'plasma_leak',
      x: lp.x + (Math.random() - 0.5) * 12,
      y: lp.y + (Math.random() - 0.5) * 12,
      vx: lp.vx * (0.75 + Math.random() * 0.5),
      vy: lp.vy * (0.75 + Math.random() * 0.5),
      targetX: lp.targetX + (Math.random() - 0.5) * 14,
      targetY: lp.targetY + (Math.random() - 0.5) * 14,
      targetT: lp.targetT,
      timer: 0,
      maxInterstitialTime: isBurst ? 70 : (90 + Math.random() * 60),
      pathIdx: lp.pathIdx,
      t: lp.targetT,
      speed: 0.0022 + Math.random() * 0.0008,
      isWbc: Math.random() < 0.1
    });
  }

  const flapEntries = [
    { startX: 605, startY: 370, gateX: 590, gateY: 400, endX: 625, endY: 425, targetT: 0.20 },
    { startX: 678, startY: 395, gateX: 652, gateY: 416, endX: 670, endY: 448, targetT: 0.14 },
    { startX: 752, startY: 430, gateX: 722, gateY: 458, endX: 710, endY: 475, targetT: 0.06 },
    { startX: 562, startY: 486, gateX: 582, gateY: 448, endX: 615, endY: 435, targetT: 0.18 }
  ];

  function spawnCutawayEntryParticle() {
    const fe = flapEntries[Math.floor(Math.random() * flapEntries.length)];
    cutawayParticles.push({ fe, progress: 0, speed: 0.011 + Math.random() * 0.005 });
  }

  for (let i = 0; i < 20; i++) {
    const lp = leakPoints2[i % leakPoints2.length];
    fluidParticles.push({
      state: 'lymph',
      x: 0, y: 0,
      vx: lp.vx, vy: lp.vy,
      targetX: lp.targetX, targetY: lp.targetY, targetT: lp.targetT,
      timer: 0,
      maxInterstitialTime: 90 + Math.random() * 60,
      pathIdx: lp.pathIdx,
      t: Math.random(),
      speed: 0.0022 + Math.random() * 0.0007,
      isWbc: i % 5 === 0
    });
  }
  for (let i = 0; i < 14; i++) spawnPlasmaLeakParticle();
  for (let i = 0; i < 4; i++) spawnCutawayEntryParticle();

  // ==========================================
  // Tab 1 繪圖核心 (特寫頁面：微循環、血漿滲出、細胞物質交換、微淋巴管盲端)
  // ==========================================
  function drawTab1Scene() {
    // 0. 柔和組織間隙水膜背景
    ctx.save();
    ctx.fillStyle = '#fffdf0';
    ctx.fillRect(0, 0, W, H);
    const tissuePouch = ctx.createRadialGradient(450, 320, 50, 450, 320, 340);
    tissuePouch.addColorStop(0, 'rgba(254, 249, 195, 0.85)');
    tissuePouch.addColorStop(0.7, 'rgba(254, 240, 138, 0.45)');
    tissuePouch.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = tissuePouch;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 1. 繪製組織細胞 (黃色有核細胞，具備代謝脈動感)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.tissue;
    const isAll1 = (selectedStructs1.size === ALL_STRUCTS_1.length);
    const isHlTissue = !isAll1 && selectedStructs1.has('tissue');
    t2Cells.forEach(cell => {
      ctx.save();
      ctx.translate(cell.x, cell.y);
      ctx.rotate(cell.rot);

      // 細胞代謝活力脈動光暈
      const vitalPulse = Math.sin(time * 3 + cell.phase) * 0.5 + 0.5;
      if (isHlTissue) {
        ctx.strokeStyle = 'rgba(250, 204, 21, ' + (0.4 + vitalPulse * 0.35) + ')';
        ctx.lineWidth = 5 + vitalPulse * 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, cell.rx + 3, cell.ry + 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 細胞質
      ctx.fillStyle = isHlTissue ? '#fef9c3' : '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, cell.rx, cell.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 細胞核
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(2, 1, cell.rx * 0.35, cell.ry * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    // 2. 繪製微淋巴管與淋巴管網 (嚴格區分：盲端微淋巴管 vs 下方匯集淋巴管)
    const isHlCap = !isAll1 && selectedStructs1.has('lymphCapillary');
    const isHlVessel = !isAll1 && selectedStructs1.has('lymphVessel');

    // 2a. 匯集淋巴管網 (下方 y >= 480 粗大匯集管網，受 lymphVessel 獨立控制)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.lymphVessel;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHlVessel) {
      ctx.strokeStyle = 'rgba(21, 128, 61, 0.55)';
      ctx.lineWidth = 30;
      ctx.beginPath();
      t2LymphNetSegments.forEach(seg => drawSmoothPath(ctx, seg));
      ctx.stroke();
    }

    // 淋巴管外壁 (粗壯深綠 20px)
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 20;
    ctx.beginPath();
    t2LymphNetSegments.forEach(seg => drawSmoothPath(ctx, seg));
    ctx.stroke();

    // 淋巴管管腔 (翠綠 13px)
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 13;
    ctx.beginPath();
    t2LymphNetSegments.forEach(seg => drawSmoothPath(ctx, seg));
    ctx.stroke();

    // 淋巴管中心流光
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    t2LymphNetSegments.forEach(seg => drawSmoothPath(ctx, seg));
    ctx.stroke();
    ctx.restore();

    // 2b. 微淋巴管 (深入組織細胞間隙的盲端細管，受 lymphCapillary 獨立控制)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.lymphCapillary;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHlCap) {
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.65)';
      ctx.lineWidth = 22;
      ctx.beginPath();
      t2LymphCapillaries.forEach(c => drawSmoothPath(ctx, c.pts));
      ctx.stroke();
    }

    // 微淋巴管外壁 (纖細 13px)
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 13;
    ctx.beginPath();
    t2LymphCapillaries.forEach(c => drawSmoothPath(ctx, c.pts));
    ctx.stroke();

    // 微淋巴管管腔 (亮黃綠 8.5px)
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    t2LymphCapillaries.forEach(c => drawSmoothPath(ctx, c.pts));
    ctx.stroke();

    // 微淋巴管中心流光
    ctx.strokeStyle = '#d9f99d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    t2LymphCapillaries.forEach(c => drawSmoothPath(ctx, c.pts));
    ctx.stroke();

    // 微淋巴管盲端圓帽 (組織液吸收門戶)
    t2LymphCapillaries.forEach(cap => {
      if (!cap.tip) return;
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cap.tip.x, cap.tip.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ecfccb';
      ctx.beginPath();
      ctx.arc(cap.tip.x, cap.tip.y - 1.5, 2.8, 0, Math.PI * 2);
      ctx.fill();

      if (cap.arrow && showArrows) {
        drawCurvedArrow(cap.arrow.fromX, cap.arrow.fromY, (cap.arrow.fromX + cap.arrow.toX) / 2, (cap.arrow.fromY + cap.arrow.toY) / 2, cap.arrow.toX, cap.arrow.toY, '#1e3a8a', 2.8, 8, groupAlpha1.lymphCapillary);
      }
    });
    ctx.restore();

    // 3. 繪製微循環血管系統 (小動脈 ➔ 微血管網 ➔ 小靜脈，全數實體管腔連通)
    // 3a. 微血管外壁
    ctx.save();
    ctx.globalAlpha = groupAlpha1.capillaryBed;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (!isAll1 && selectedStructs1.has('capillaryBed')) {
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.lineWidth = 20;
      ctx.beginPath();
      t2CapillaryLoops.forEach(loop => drawSmoothPath(ctx, loop));
      ctx.stroke();
    }
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 16;
    ctx.beginPath();
    t2CapillaryLoops.forEach(loop => drawSmoothPath(ctx, loop));
    ctx.stroke();
    ctx.restore();

    // 3b. 小動脈主幹外壁 (x=180)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.arteriole;
    ctx.lineCap = 'round';
    if (!isAll1 && selectedStructs1.has('arteriole')) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(180, 600);
      ctx.lineTo(180, 160);
      ctx.stroke();
    }
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 32;
    ctx.beginPath();
    ctx.moveTo(180, 600);
    ctx.lineTo(180, 160);
    ctx.stroke();
    ctx.restore();

    // 3c. 小靜脈主幹外壁 (x=700)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.venule;
    ctx.lineCap = 'round';
    if (!isAll1 && selectedStructs1.has('venule')) {
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.5)';
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(700, 150);
      ctx.lineTo(700, 600);
      ctx.stroke();
    }
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 32;
    ctx.beginPath();
    ctx.moveTo(700, 150);
    ctx.lineTo(700, 600);
    ctx.stroke();
    ctx.restore();

    // 3d. 微血管內層漸層管腔 (動脈端亮紅 ➔ 中段紫 ➔ 靜脈端天藍)
    ctx.save();
    ctx.globalAlpha = groupAlpha1.capillaryBed;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = capMeshGrad;
    ctx.lineWidth = 10;
    ctx.beginPath();
    t2CapillaryLoops.forEach(loop => drawSmoothPath(ctx, loop));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    t2CapillaryLoops.forEach(loop => drawSmoothPath(ctx, loop));
    ctx.stroke();
    ctx.restore();

    // 3e. 小動脈亮紅管腔與分支過渡口
    ctx.save();
    ctx.globalAlpha = groupAlpha1.arteriole;
    ctx.lineCap = 'round';
    const artLumenGrad = ctx.createLinearGradient(165, 0, 195, 0);
    artLumenGrad.addColorStop(0, '#f87171');
    artLumenGrad.addColorStop(0.5, '#ef4444');
    artLumenGrad.addColorStop(1, '#b91c1c');
    ctx.strokeStyle = artLumenGrad;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(180, 600);
    ctx.lineTo(180, 160);
    ctx.stroke();

    [240, 340, 440].forEach(by => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(185, by, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(180, 160, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (showArrows) {
      drawCurvedArrow(180, 560, 180, 490, 180, 470, '#ffffff', 3.2, 8, groupAlpha1.arteriole);
      drawCurvedArrow(180, 430, 180, 380, 180, 360, '#ffffff', 3.2, 8, groupAlpha1.arteriole);
      drawCurvedArrow(180, 330, 180, 280, 180, 260, '#ffffff', 3.2, 8, groupAlpha1.arteriole);
      drawCurvedArrow(180, 240, 205, 220, 225, 205, '#ffffff', 2.8, 7, groupAlpha1.arteriole);
      drawCurvedArrow(180, 340, 205, 330, 225, 325, '#ffffff', 2.8, 7, groupAlpha1.arteriole);
      drawCurvedArrow(180, 440, 210, 438, 235, 436, '#ffffff', 2.8, 7, groupAlpha1.arteriole);
    }
    ctx.restore();

    // 3f. 小靜脈亮藍管腔與分支匯流口
    ctx.save();
    ctx.globalAlpha = groupAlpha1.venule;
    ctx.lineCap = 'round';
    const venLumenGrad = ctx.createLinearGradient(685, 0, 715, 0);
    venLumenGrad.addColorStop(0, '#38bdf8');
    venLumenGrad.addColorStop(0.5, '#0284c7');
    venLumenGrad.addColorStop(1, '#0369a1');
    ctx.strokeStyle = venLumenGrad;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(700, 150);
    ctx.lineTo(700, 600);
    ctx.stroke();

    [240, 340, 440].forEach(by => {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(695, by, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#082f49';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(700, 150, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (showArrows) {
      drawCurvedArrow(700, 190, 700, 230, 700, 250, '#ffffff', 3.2, 8, groupAlpha1.venule);
      drawCurvedArrow(700, 290, 700, 330, 700, 350, '#ffffff', 3.2, 8, groupAlpha1.venule);
      drawCurvedArrow(700, 390, 700, 430, 700, 460, '#ffffff', 3.2, 8, groupAlpha1.venule);
      drawCurvedArrow(700, 490, 700, 540, 700, 570, '#ffffff', 3.2, 8, groupAlpha1.venule);
      drawCurvedArrow(670, 215, 685, 230, 700, 240, '#ffffff', 2.8, 7, groupAlpha1.venule);
      drawCurvedArrow(670, 325, 685, 335, 700, 340, '#ffffff', 2.8, 7, groupAlpha1.venule);
      drawCurvedArrow(665, 436, 685, 438, 700, 440, '#ffffff', 2.8, 7, groupAlpha1.venule);
    }
    ctx.restore();

    // 4. 動態微循環與生理交換粒子系統
    // 4a. 微血管內紅血球 (RBCs - 雙凹圓盤狀，動脈鮮紅 ➔ 靜脈深暗紅，生物學上絕非藍色！)
    if (molAlpha.rbc > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.max(groupAlpha1.capillaryBed, groupAlpha1.arteriole) * molAlpha.rbc;
      t1RbcList.forEach(rbc => {
        if (!isPaused) {
          rbc.t += rbc.speed;
          if (rbc.t >= 1) rbc.t -= 1;
        }
        const loop = t2CapillaryLoops[rbc.loopIdx];
        const pt = getPointOnPath(loop, rbc.t);
        drawRbcBiconcave(ctx, pt.x, pt.y, pt.angle, rbc.t, 5.2);
      });
      ctx.restore();
    }

    // 4b. 微血管滲出水分子粒子 (Water / Plasma Filtration ➔ 組織液)
    if (molAlpha.water > 0.02) {
      ctx.save();
      const leakAlpha = Math.max(groupAlpha1.capillaryBed, groupAlpha1.exchange, groupAlpha1.tissue) * molAlpha.water;
      ctx.globalAlpha = leakAlpha;
      t1PlasmaLeakList.forEach(p => {
        if (!isPaused) {
          p.x += p.vx;
          p.y += p.vy;
          p.age++;
          if (p.age >= p.maxAge) {
            // 重生回微血管壁
            const loop = t2CapillaryLoops[Math.floor(Math.random() * 5)];
            const pt = getPointOnPath(loop, 0.08 + Math.random() * 0.52);
            const normAngle = pt.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            const spd = (0.55 + Math.random() * 0.8) * filtrationRate;
            p.x = pt.x;
            p.y = pt.y;
            p.vx = Math.cos(normAngle) * spd;
            p.vy = Math.sin(normAngle) * spd;
            p.age = 0;
          }
        }

        const ratio = p.age / p.maxAge;
        // 晶亮水分粒子 (水滴狀光澤感 H2O)
        ctx.save();
        ctx.fillStyle = ratio < 0.5 ? 'rgba(56, 189, 248, 0.88)' : 'rgba(14, 165, 233, 0.78)';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 內部高光反光 (晶瑩水漾感)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.32, p.y - p.size * 0.32, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 4c. 物質進出組織細胞 (氧氣與養分進入細胞、代謝廢物與CO2排出細胞)
    const exAlpha = Math.max(groupAlpha1.exchange, groupAlpha1.tissue);
    t1CellExchangeList.forEach(p => {
      if (!isPaused) {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          const cell = t2Cells[p.cellIdx];
          const ang = Math.random() * Math.PI * 2;
          const dist = 28 + Math.random() * 22;
          if (p.type === 'nutrient') {
            p.x = cell.x + Math.cos(ang) * dist;
            p.y = cell.y + Math.sin(ang) * dist;
            p.tx = cell.x + (Math.random() - 0.5) * 8;
            p.ty = cell.y + (Math.random() - 0.5) * 6;
          } else {
            p.x = cell.x + (Math.random() - 0.5) * 8;
            p.y = cell.y + (Math.random() - 0.5) * 6;
            p.tx = cell.x + Math.cos(ang) * dist;
            p.ty = cell.y + Math.sin(ang) * dist;
          }
        }
      }

      const curX = p.x + (p.tx - p.x) * p.progress;
      const curY = p.y + (p.ty - p.y) * p.progress;

      if (p.type === 'nutrient') {
        if (molAlpha.nutrient <= 0.02) return;
        ctx.save();
        ctx.globalAlpha = exAlpha * molAlpha.nutrient;
        const isOxygen = (p.cellIdx % 2 === 0);
        if (isOxygen) {
          // O2 雙原子分子 (亮電青色雙球)
          ctx.fillStyle = '#06b6d4';
          ctx.strokeStyle = '#cffafe';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(curX - 2.4, curY, 3.2, 0, Math.PI * 2);
          ctx.arc(curX + 2.4, curY, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(curX - 2.4, curY - 0.8, 1.2, 0, Math.PI * 2);
          ctx.arc(curX + 2.4, curY - 0.8, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 葡萄糖養分 (金綠色能量分子)
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#bbf7d0';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(curX, curY, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      } else {
        if (molAlpha.waste <= 0.02) return;
        ctx.save();
        ctx.globalAlpha = exAlpha * molAlpha.waste;
        const isCO2 = (p.cellIdx % 2 === 1);
        if (isCO2) {
          // CO2 線性三原子分子 (紫色 C 在中央，兩側為 O)
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#f3e8ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(curX - 3.6, curY, 2.6, 0, Math.PI * 2);
          ctx.arc(curX, curY, 3.4, 0, Math.PI * 2);
          ctx.arc(curX + 3.6, curY, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // 代謝廢物 (尿素/酸性廢物，琥珀金橙色)
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#fef3c7';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(curX, curY, 4.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // 4d. 多餘組織液進入微淋巴管盲端粒子 (受 lymphCapillary 控制)
    if (molAlpha.water > 0.02) {
      ctx.save();
      ctx.globalAlpha = groupAlpha1.lymphCapillary * molAlpha.water;
      t1LymphFluidList.forEach(fp => {
        if (!isPaused) {
          fp.t += fp.speed;
          if (fp.t >= 1) fp.t -= 1;
        }
        const cap = t2LymphCapillaries[fp.capIdx];
        let px, py, color;
        if (fp.t < 0.3) {
          const k = fp.t / 0.3;
          px = cap.arrow.fromX + (cap.arrow.toX - cap.arrow.fromX) * k;
          py = cap.arrow.fromY + (cap.arrow.toY - cap.arrow.fromY) * k;
          color = '#38bdf8'; // 水分/組織液
        } else {
          const k = (fp.t - 0.3) / 0.7;
          const pt = getPointOnPath(cap.pts, k);
          px = pt.x;
          py = pt.y;
          color = '#bef264'; // 淋巴液
        }
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // 4e. 匯集淋巴管網內部淋巴液回流動態 (受 lymphVessel 控制)
    if (molAlpha.water > 0.02) {
      ctx.save();
      ctx.globalAlpha = groupAlpha1.lymphVessel * molAlpha.water;
      t1VesselFluidList.forEach(fp => {
        if (!isPaused) {
          fp.t += fp.speed;
          if (fp.t >= 1) fp.t -= 1;
        }
        const seg = t2LymphNetSegments[fp.segIdx];
        const pt = getPointOnPath(seg, fp.t);
        ctx.fillStyle = '#bef264';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x - 1.2, pt.y - 1.2, 1.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 5. 分子生理交換圖解看板與指示氣泡 (綁定構造標示 toggle)
    if (showLabels) {
      const isExActive = (focusTarget1 === 'exchange' || focusTarget1 === 'tissue');
      const badgeAlpha = isExActive ? 1.0 : (activeMolMode1 !== 'all' ? 0.95 : 0.8);
      if (badgeAlpha > 0.06) {
        ctx.save();
        const demCell1 = t2Cells[14] || { x: 385, y: 245 };
        const demCell2 = t2Cells[22] || { x: 505, y: 310 };

        const drawExchangeBadge = (cx, cy, text, color, bg) => {
          ctx.font = 'bold 12px sans-serif';
          const tw = ctx.measureText(text).width;
          ctx.fillStyle = bg;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(cx - tw / 2 - 8, cy - 13, tw + 16, 26, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, cx, cy);
        };

        // 水分相關標示看板
        if (molAlpha.water > 0.35) {
          ctx.save();
          ctx.globalAlpha = badgeAlpha * molAlpha.water;
          drawExchangeBadge(285, 395, '💧 水分 (H₂O) 與血漿自微血管濾出 ➔ 形成組織液', '#0284c7', 'rgba(240, 249, 255, 0.96)');
          drawExchangeBadge(demCell2.x + 30, demCell2.y - 50, '🌿 多餘水分順壓力推開盲端瓣膜 ➔ 進入微淋巴管(成為淋巴)', '#15803d', 'rgba(240, 253, 244, 0.96)');
          drawExchangeBadge(700, 310, '🔵 約 90% 水分由小靜脈端滲透重吸收回血管', '#0369a1', 'rgba(240, 249, 255, 0.96)');
          ctx.restore();
        }

        // 氧氣與養分相關標示看板
        if (molAlpha.nutrient > 0.35) {
          ctx.save();
          ctx.globalAlpha = badgeAlpha * molAlpha.nutrient;
          drawCurvedArrow(demCell1.x - 38, demCell1.y - 20, demCell1.x - 22, demCell1.y - 14, demCell1.x - 6, demCell1.y - 4, '#0891b2', 2.8, 7, badgeAlpha * molAlpha.nutrient);
          drawExchangeBadge(demCell1.x - 45, demCell1.y - 36, '🍏 氧氣 (O₂) 穿過細胞膜擴散 ➔ 進入細胞質供呼吸作用', '#0e7490', 'rgba(236, 254, 255, 0.96)');
          drawExchangeBadge(demCell1.x + 50, demCell1.y + 42, '🥪 葡萄糖與養分 ➔ 細胞膜協助/主動吸收攝取', '#15803d', 'rgba(240, 253, 244, 0.96)');
          ctx.restore();
        }

        // 二氧化碳與代謝廢物相關標示看板
        if (molAlpha.waste > 0.35) {
          ctx.save();
          ctx.globalAlpha = badgeAlpha * molAlpha.waste;
          drawCurvedArrow(demCell1.x + 6, demCell1.y + 4, demCell1.x + 22, demCell1.y + 16, demCell1.x + 38, demCell1.y + 24, '#9333ea', 2.8, 7, badgeAlpha * molAlpha.waste);
          drawExchangeBadge(demCell1.x + 55, demCell1.y + 42, '💨 二氧化碳 (CO₂) 擴散排出細胞質 ➔ 進入組織液', '#7e22ce', 'rgba(250, 245, 255, 0.96)');
          drawExchangeBadge(demCell1.x - 45, demCell1.y - 36, '⚠️ 含氮代謝廢物與酸性產物 ➔ 穿出細胞膜，由血液與淋巴回收', '#b45309', 'rgba(254, 243, 199, 0.96)');
          ctx.restore();
        }

        // 紅血球相關標示看板
        if (molAlpha.rbc > 0.35) {
          ctx.save();
          ctx.globalAlpha = badgeAlpha * molAlpha.rbc;
          drawExchangeBadge(180, 230, '🔴 充氧紅血球 (動脈端：高氧合血紅素，鮮紅色)', '#b91c1c', 'rgba(254, 242, 242, 0.96)');
          drawExchangeBadge(700, 230, '🔻 減氧紅血球 (靜脈端：釋出 O₂ 轉深暗紅，血球非藍色！)', '#881337', 'rgba(255, 241, 242, 0.96)');
          drawExchangeBadge(440, 385, '🩸 紅血球在微血管內單行通過，釋放氧氣 O₂ 給周圍組織', '#9f1239', 'rgba(255, 241, 242, 0.96)');
          ctx.restore();
        }

        ctx.restore();
      }

      // 6. 頂部觀察模式狀態看板 (HUD，綁定構造標示)
      ctx.save();
      const hudY = 72;
      let hudText = '', hudColor = '#38bdf8';
      if (activeMolMode1 === 'water') {
        hudText = '💧 目前聚焦：水分 (微血管濾出 ➔ 形成組織液 ➔ 微淋巴管盲端吸收)';
        hudColor = '#38bdf8';
      } else if (activeMolMode1 === 'nutrient') {
        hudText = '🍏 目前聚焦：氧氣 (O₂) 與養分 ➔ 穿過細胞膜進入細胞質供呼吸作用';
        hudColor = '#22d3ee';
      } else if (activeMolMode1 === 'waste') {
        hudText = '💨 目前聚焦：二氧化碳 (CO₂) 與代謝廢物 ➔ 自細胞質向外擴散進入組織液';
        hudColor = '#c084fc';
      } else if (activeMolMode1 === 'rbc') {
        hudText = '🔴 目前聚焦：紅血球單行巡航 (動脈端充氧鮮紅 ➔ 靜脈端減氧深暗紅，絕非藍色)';
        hudColor = '#f87171';
      } else {
        hudText = '🌟 目前聚焦：微循環綜合動態 (水分、O₂、養分、CO₂、廢物與紅血球全景運作)';
        hudColor = '#facc15';
      }

      ctx.font = 'bold 12.5px sans-serif';
      const hudW = ctx.measureText(hudText).width + 24;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.93)';
      ctx.strokeStyle = hudColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(450 - hudW / 2, hudY - 13, hudW, 26, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hudColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudText, 450, hudY);
      ctx.restore();

      // 7. 頂部自繪大標題 (純繁體中文)
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('組織間隙中的微淋巴管與微血管網 (特寫)', 35, 42);
      ctx.restore();
    }

    // 8. 繁體中文互動標籤
    if (showLabels) {
      drawTab1Labels();
    }
  }

  // Tab 1 繁體中文標籤座標配置
  const canvasLabels1 = [
    { id: 'tissue', text: '組織細胞', x: 790, y: 75, line: [{ x: 735, y: 75 }, { x: 620, y: 120 }] },
    { id: 'tissue', text: '組織間隙', x: 790, y: 200, line: [{ x: 735, y: 200 }, { x: 635, y: 215 }] },
    { id: 'venule', text: '小靜脈', x: 790, y: 350, line: [{ x: 740, y: 350 }, { x: 700, y: 350 }] },
    { id: 'lymphVessel', text: '淋巴管', x: 790, y: 505, line: [{ x: 740, y: 505 }, { x: 620, y: 505 }] },
    { id: 'lymphCapillary', text: '微淋巴管', x: 95, y: 150, line: [{ x: 150, y: 150 }, { x: 270, y: 165 }, { x: 370, y: 150 }] },
    { id: 'capillaryBed', text: '微血管網', x: 95, y: 260, line: [{ x: 150, y: 260 }, { x: 260, y: 220 }] },
    { id: 'arteriole', text: '小動脈', x: 95, y: 380, line: [{ x: 145, y: 380 }, { x: 180, y: 380 }] },
    { id: 'exchange', text: '物質交換', x: 95, y: 480, line: [{ x: 140, y: 480 }, { x: 235, y: 450 }] }
  ];

  function drawTab1Labels() {
    const isAll = (selectedStructs1.size === ALL_STRUCTS_1.length);
    canvasLabels1.forEach(lbl => {
      const matchKey = (lbl.id === 'exchange' ? 'capillaryBed' : lbl.id);
      const isSel = selectedStructs1.has(matchKey);
      const alpha = (isAll || !dimOthersEnabled || isSel) ? 1.0 : 0.35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = isSel && !isAll ? '#15803d' : '#0f172a';
      ctx.lineWidth = isSel && !isAll ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(lbl.line[0].x, lbl.line[0].y);
      for (let i = 1; i < lbl.line.length; i++) ctx.lineTo(lbl.line[i].x, lbl.line[i].y);
      ctx.stroke();

      ctx.font = 'bold 19px sans-serif';
      const tw = ctx.measureText(lbl.text).width;
      const bw = tw + 20, bh = 34;

      ctx.fillStyle = isSel && !isAll ? '#15803d' : 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = isSel && !isAll ? '#86efac' : '#475569';
      ctx.beginPath();
      ctx.roundRect(lbl.x - bw / 2, lbl.y - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSel && !isAll ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl.text, lbl.x, lbl.y + 1);

      lbl._hit = { x: lbl.x - bw / 2, y: lbl.y - bh / 2, w: bw, h: bh };
      ctx.restore();
    });
  }

  // ==========================================
  // Tab 2 繪圖核心 (全覽頁面：微循環 ➔ 瓣膜 ➔ 淋巴結吞噬 ➔ 水腫)
  // ==========================================
  function drawTab2Scene() {
    if (edemaLevel > 0.02) {
      ctx.save();
      ctx.globalAlpha = groupAlpha2.tissueCells;
      const cx = TISSUE_CENTER1.x, cy = TISSUE_CENTER1.y;
      const rx = 145 + edemaLevel * 85, ry = 88 + edemaLevel * 55;
      ctx.fillStyle = 'rgba(250, 204, 21, ' + (0.18 + edemaLevel * 0.25) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      if (edemaLevel > 0.25) {
        ctx.strokeStyle = 'rgba(220, 38, 38, ' + (edemaLevel * 0.75) + ')';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
      }
      ctx.restore();
    }

    const hlCells = (focusTarget2 === 'tissueCells');
    for (let i = 0; i < tissueCells1.length; i++) {
      const cell = tissueCells1[i];
      const dx = cell.x - TISSUE_CENTER1.x;
      const dy = cell.y - TISSUE_CENTER1.y;
      const px = cell.x + dx * (edemaLevel * 0.36);
      const py = cell.y + dy * (edemaLevel * 0.36);
      ctx.save();
      ctx.globalAlpha = groupAlpha2.tissueCells;
      ctx.translate(px, py);
      ctx.rotate(cell.rot);
      if (hlCells) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, cell.rx + 2, cell.ry + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, cell.rx, cell.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.ellipse(2, 1, cell.rx * 0.36, cell.ry * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = groupAlpha2.capillary;
    const hlCap = (focusTarget2 === 'capillary');
    bloodPaths1.forEach(path => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      if (hlCap) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
        ctx.lineWidth = 32;
        ctx.stroke();
      }
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 22;
      ctx.stroke();
      ctx.strokeStyle = bloodGrad1;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    if (molAlpha2.rbc > 0.02) {
      ctx.save();
      ctx.globalAlpha = groupAlpha2.capillary * molAlpha2.rbc;
      rbcParticles.forEach(rbc => {
        const pt = getPointOnPath(bloodPaths1[rbc.pathIdx], rbc.t);
        drawRbcBiconcave(ctx, pt.x, pt.y, pt.angle, rbc.t, 5.0);
      });
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = groupAlpha2.lymphNode;

    ctx.beginPath();
    ctx.moveTo(355, 140);
    ctx.bezierCurveTo(385, 52, 555, 45, 625, 115);
    ctx.bezierCurveTo(652, 145, 635, 180, 610, 192);
    ctx.bezierCurveTo(575, 210, 560, 245, 525, 280);
    ctx.bezierCurveTo(450, 310, 395, 290, 365, 250);
    ctx.bezierCurveTo(345, 220, 342, 175, 355, 140);
    ctx.closePath();

    if (focusTarget2 === 'lymphNode') {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
      ctx.lineWidth = 16;
      ctx.stroke();
    }
    ctx.strokeStyle = nodeImmuneGlow > 0.05 ? '#e879f9' : '#3f6212';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = shellGrad;
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(375, 150);
    ctx.bezierCurveTo(420, 95, 530, 85, 595, 135);
    ctx.bezierCurveTo(605, 175, 570, 215, 520, 255);
    ctx.bezierCurveTo(445, 275, 385, 245, 375, 150);
    ctx.closePath();
    ctx.fill();

    lymphFollicles1.forEach(fol => {
      ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(fol.x, fol.y, fol.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(fol.x, fol.y, fol.r * 0.56, 0, Math.PI * 2);
      ctx.fill();
    });

    if (molAlpha2.macrophage > 0.02) {
      nodeMacrophages1.forEach(mac => {
        drawMacrophage(mac.x, mac.y, mac.r, mac.engulfRatio || 0, mac.targetAngle || 0, mac.isHunting);
      });
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = groupAlpha2.efferent;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(540, 195);
    ctx.quadraticCurveTo(665, 180, 785, 195);
    if (focusTarget2 === 'efferent') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 32;
      ctx.stroke();
    }
    ctx.strokeStyle = '#a1885c';
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 8;
    ctx.stroke();
    drawValvePair(635, 188, 0.02, 0.45 + 0.45 * Math.sin(time * 3.2), 0.78);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = groupAlpha2.nodeVessels;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(735, 125);
    ctx.quadraticCurveTo(645, 168, 525, 190);
    ctx.stroke();
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(765, 135);
    ctx.quadraticCurveTo(655, 175, 535, 196);
    ctx.stroke();
    ctx.restore();

    const drawGreenTube1 = (pts, width, alpha, isHl) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (isHl) {
        ctx.strokeStyle = 'rgba(132, 204, 22, 0.55)';
        ctx.lineWidth = width + 14;
        ctx.stroke();
      }
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = width + 6;
      ctx.stroke();
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    };

    drawGreenTube1([
      { x: 520, y: 395 }, { x: 350, y: 395 }, { x: 250, y: 355 },
      { x: 138, y: 360 }, { x: 205, y: 265 }, { x: 355, y: 175 }
    ], 20, groupAlpha2.afferent, focusTarget2 === 'afferent');

    drawGreenTube1([
      { x: 280, y: 375 }, { x: 292, y: 460 }, { x: 278, y: 545 }
    ], 22, groupAlpha2.lymphCapillary, focusTarget2 === 'lymphCapillary');

    ctx.save();
    ctx.globalAlpha = groupAlpha2.lymphCapillary;
    ctx.beginPath();
    ctx.moveTo(435, 385);
    ctx.bezierCurveTo(525, 360, 625, 385, 775, 465);
    ctx.bezierCurveTo(812, 488, 795, 545, 745, 535);
    ctx.bezierCurveTo(645, 515, 565, 455, 435, 415);
    ctx.closePath();
    ctx.fillStyle = '#84cc16';
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = lumenGrad;
    ctx.beginPath();
    ctx.moveTo(562, 432);
    ctx.bezierCurveTo(625, 400, 715, 432, 768, 478);
    ctx.bezierCurveTo(792, 492, 778, 528, 742, 522);
    ctx.bezierCurveTo(672, 510, 610, 470, 562, 432);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (molAlpha2.plasma > 0.02) {
      fluidParticles.forEach(p => {
        ctx.save();
        if (p.state === 'plasma_leak') {
          ctx.globalAlpha = Math.max(groupAlpha2.capillary, groupAlpha2.tissueCells) * molAlpha2.plasma;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.state === 'interstitial') {
          ctx.globalAlpha = groupAlpha2.tissueCells * molAlpha2.plasma;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.8 + edemaLevel * 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.state === 'lymph') {
          let pAlpha = groupAlpha2.afferent;
          if (p.t < 0.25) pAlpha = groupAlpha2.lymphCapillary;
          else if (p.t >= 0.68 && p.t < 0.85) pAlpha = groupAlpha2.lymphNode;
          else if (p.t >= 0.85) pAlpha = groupAlpha2.efferent;
          ctx.globalAlpha = pAlpha * molAlpha2.plasma;
          const pt = getPointOnPath(lymphPaths1[p.pathIdx], p.t);
          ctx.fillStyle = '#bef264';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    if (molAlpha2.germ > 0.02) {
      germParticles.forEach(g => {
        let alpha = groupAlpha2.lymphNode;
        if (g.phase === 'tissue') alpha = Math.max(0.6, groupAlpha2.tissueCells);
        else if (g.phase === 'entry') alpha = Math.max(0.6, groupAlpha2.lymphCapillary);
        else if (g.phase === 'vessel') alpha = Math.max(0.6, groupAlpha2.afferent);

        ctx.save();
        ctx.globalAlpha = alpha * molAlpha2.germ;
        drawBacterium(g.x, g.y, g.phase === 'engulfing' ? Math.max(0.3, 1 - g.digestProgress * 0.6) : 1, g.digestProgress);
        ctx.restore();
      });

      // 若有細菌正在組織液或進入盲端階段，顯示生理路徑說明 (受 showLabels 控制)
      if (showLabels && germParticles.some(g => g.phase === 'tissue' || g.phase === 'entry')) {
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        const txt = '🦠 細菌入侵組織液 ➔ 順壓力推開盲端活門 ➔ 進入微淋巴管';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(560 - tw / 2, 455, tw + 18, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f3e8ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 560, 467);
        ctx.restore();
      }

      // 若細菌抵達淋巴結，顯示巨噬細胞主動追擊與吞噬標籤
      if (showLabels && germParticles.some(g => g.phase === 'node' || g.phase === 'engulfing')) {
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        const txt = '🛡️ 巨噬細胞主動出擊追捕細菌 ➔ 伸出偽足包圍吞噬！';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(470 - tw / 2, 75, tw + 18, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 470, 87);
        ctx.restore();
      }
    }

    if (showLabels) {
      drawTab2Labels();
    }

    if (isEdemaBlocked || edemaLevel > 0.25) {
      drawEdemaOverlay();
    }
  }

  // Tab 2 繁體中文標籤座標配置
  const canvasLabels2 = [
    { id: 'capillary', text: '微血管', x: 150, y: 430, line: [{ x: 150, y: 445 }, { x: 175, y: 495 }] },
    { id: 'tissueCells', text: '組織細胞', x: 670, y: 575, line: [{ x: 670, y: 560 }, { x: 645, y: 535 }] },
    { id: 'lymphCapillary', text: '微淋巴管', x: 170, y: 585, line: [{ x: 170, y: 570 }, { x: 275, y: 545 }] },
    { id: 'lymphCapillary', text: '盲端剖面窗 (瓦片單向活門)', isBadge: true, x: 660, y: 385, line: [{ x: 660, y: 405 }, { x: 660, y: 455 }] },
    { id: 'afferent', text: '輸入淋巴管與瓣膜', x: 155, y: 215, line: [{ x: 155, y: 235 }, { x: 185, y: 310 }] },
    { id: 'lymphNode', text: '淋巴結 (巨噬細胞吞噬)', x: 485, y: 48, line: [{ x: 485, y: 65 }, { x: 485, y: 130 }] },
    { id: 'efferent', text: '輸出淋巴管', x: 785, y: 145, line: [{ x: 785, y: 165 }, { x: 730, y: 195 }] },
    { id: 'nodeVessels', text: '淋巴結動脈與靜脈', x: 785, y: 88, line: [{ x: 785, y: 105 }, { x: 745, y: 130 }] }
  ];

  function drawTab2Labels() {
    const isAll = (selectedStructs2.size === ALL_STRUCTS_2.length);
    canvasLabels2.forEach(lbl => {
      const isSel = selectedStructs2.has(lbl.id);
      const alpha = (isAll || !dimOthersEnabled || isSel) ? 1.0 : 0.35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = isSel && !isAll ? '#15803d' : '#0f172a';
      ctx.lineWidth = isSel && !isAll ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(lbl.line[0].x, lbl.line[0].y);
      ctx.lineTo(lbl.line[1].x, lbl.line[1].y);
      ctx.stroke();

      ctx.font = lbl.isBadge ? 'bold 13px sans-serif' : 'bold 20px sans-serif';
      const tw = ctx.measureText(lbl.text).width;
      const bw = tw + (lbl.isBadge ? 20 : 18);
      const bh = lbl.isBadge ? 28 : 32;

      ctx.fillStyle = isSel && !isAll ? '#15803d' : 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = isSel && !isAll ? '#86efac' : '#475569';
      ctx.beginPath();
      ctx.roundRect(lbl.x - bw / 2, lbl.y - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSel && !isAll ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl.text, lbl.x, lbl.y + 1);

      lbl._hit = { x: lbl.x - bw / 2, y: lbl.y - bh / 2, w: bw, h: bh };
      ctx.restore();
    });
  }

  function drawEdemaOverlay() {
    ctx.save();
    if (isEdemaBlocked) {
      ctx.fillStyle = 'rgba(127, 29, 29, 0.96)';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 245, 180, 44, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⛔ 淋巴管阻塞處', 130, 263);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('淋巴液受阻無法回流', 130, 279);
    }

    if (edemaLevel > 0.25) {
      const bx = 535, by = 355;
      ctx.fillStyle = 'rgba(127, 29, 29, 0.96)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx - 180, by - 24, 360, 48, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ 組織水腫 (Edema)：組織液滯留積水！', bx, by - 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      const causeText = isEdemaBlocked
        ? '淋巴管受阻無法回流 ➔ 組織液滯留撐開細胞'
        : '微血管滲出率過高 ＞ 淋巴引流上限 ➔ 組織液累積撐開細胞';
      ctx.fillText(causeText, bx, by + 14);
    }
    ctx.restore();
  }

  // ==========================================
  // 更新狀態與主迴圈
  // ==========================================
  function updateSimulation() {
    // Tab 1 (特寫) 平滑透明度計算 (支援複選)
    const isAll1 = (selectedStructs1.size === ALL_STRUCTS_1.length);
    ALL_STRUCTS_1.forEach(k => {
      let ta = 1.0;
      if (!isAll1 && dimOthersEnabled) {
        ta = selectedStructs1.has(k) ? 1.0 : 0.15;
      }
      groupAlpha1[k] += (ta - groupAlpha1[k]) * 0.18;
    });

    // exchange 物質交換粒子：微血管網或組織細胞選中時正常呈現
    let exTa = 1.0;
    if (!isAll1 && dimOthersEnabled) {
      exTa = (selectedStructs1.has('capillaryBed') || selectedStructs1.has('tissue')) ? 1.0 : 0.15;
    }
    groupAlpha1.exchange += (exTa - groupAlpha1.exchange) * 0.18;

    // Tab 2 (全覽) 平滑透明度計算 (支援複選)
    const isAll2 = (selectedStructs2.size === ALL_STRUCTS_2.length);
    ALL_STRUCTS_2.forEach(k => {
      let ta = 1.0;
      if (!isAll2 && dimOthersEnabled) {
        ta = selectedStructs2.has(k) ? 1.0 : 0.15;
      }
      groupAlpha2[k] += (ta - groupAlpha2[k]) * 0.18;
    });

    // 分子過濾透明度平滑過渡 (Tab 1 特寫：點哪種就看哪種)
    const targetAlpha1 = {
      water: (activeMolMode1 === 'water' || activeMolMode1 === 'all') ? 1.0 : 0.0,
      nutrient: (activeMolMode1 === 'nutrient' || activeMolMode1 === 'all') ? 1.0 : 0.0,
      waste: (activeMolMode1 === 'waste' || activeMolMode1 === 'all') ? 1.0 : 0.0,
      rbc: (activeMolMode1 === 'rbc' || activeMolMode1 === 'all') ? 1.0 : 0.0
    };
    Object.keys(molAlpha).forEach(k => {
      molAlpha[k] += (targetAlpha1[k] - molAlpha[k]) * 0.22;
    });

    // 元素過濾透明度平滑過渡 (Tab 2 全覽：支援複選與獨立保持)
    const targetAlpha2 = {
      plasma: selectedElements2.has('plasma') ? 1.0 : 0.0,
      germ: selectedElements2.has('germ') ? 1.0 : 0.0,
      macrophage: selectedElements2.has('macrophage') ? 1.0 : 0.0,
      rbc: selectedElements2.has('rbc') ? 1.0 : 0.0
    };
    Object.keys(molAlpha2).forEach(k => {
      molAlpha2[k] += (targetAlpha2[k] - molAlpha2[k]) * 0.22;
    });

    if (isPaused) return;
    time += 0.016;

    if (squeezePulse > 0) {
      squeezePulse = Math.max(0, squeezePulse - 0.035);
    }

    // 生理機制：微血管滲出速率 > 淋巴引流上限 (約 1.35x) 時，組織液滯留自動引發水腫！
    const normalDrainCapacity = 1.35;
    if (isEdemaBlocked) {
      edemaLevel = Math.min(1.0, edemaLevel + 0.008 * Math.max(1.0, filtrationRate));
    } else if (filtrationRate > normalDrainCapacity) {
      // 滲出速率過高：超出淋巴吸收極限，水分累積自動引發水腫！
      const excess = filtrationRate - normalDrainCapacity;
      edemaLevel = Math.min(1.0, edemaLevel + excess * 0.0075);
    } else {
      // 滲出率正常或偏低：淋巴系統足以完全引流，水腫自然消退
      edemaLevel = Math.max(0.0, edemaLevel - 0.016);
    }

    const tissueStat = document.getElementById('statTissue');
    if (tissueStat) {
      if (edemaLevel > 0.6) {
        tissueStat.textContent = isEdemaBlocked ? '重度水腫 (淋巴完全阻塞)' : '重度水腫 (超量滲出積水)';
        tissueStat.style.color = '#ef4444';
      } else if (edemaLevel > 0.25) {
        tissueStat.textContent = '輕微水腫 (間隙膨脹)';
        tissueStat.style.color = '#f59e0b';
      } else {
        tissueStat.textContent = '正常 (無水腫)';
        tissueStat.style.color = '#4ade80';
      }
    }

    const lymphFlowStat = document.getElementById('statLymphFlow');
    if (isEdemaBlocked) {
      lymphFlowStat.textContent = '⛔ 回流完全受阻';
      lymphFlowStat.style.color = '#ef4444';
    } else if (squeezePulse > 0.1) {
      lymphFlowStat.textContent = '⚡ 瓣膜加速推進';
      lymphFlowStat.style.color = '#38bdf8';
    } else {
      lymphFlowStat.textContent = '單向順暢';
      lymphFlowStat.style.color = '#84cc16';
    }

    if (nodeImmuneGlow > 0) {
      nodeImmuneGlow = Math.max(0, nodeImmuneGlow - 0.02);
    }

    // Tab 2 細菌：先在組織液中游移 ➔ 隨組織液推開微淋巴管盲端活瓣 ➔ 沿淋巴管流動 ➔ 淋巴結巨噬細胞吞噬
    for (let i = germParticles.length - 1; i >= 0; i--) {
      const g = germParticles[i];
      if (g.phase === 'tissue') {
        g.tissueTimer++;
        // 細菌在組織液中生活游走，隨組織液回流盲端的微壓差，朝向微淋巴管單向瓦片活門游動
        const dx = g.gateX - g.x;
        const dy = g.gateY - g.y;
        const dist = Math.hypot(dx, dy);
        const pull = Math.min(1.4, 0.5 + (g.tissueTimer / g.maxTissueTime) * 1.0);
        g.x += (dx / Math.max(1, dist)) * pull + Math.sin(time * 6 + i) * 0.6;
        g.y += (dy / Math.max(1, dist)) * pull + Math.cos(time * 6 + i) * 0.6;

        // 當接近盲端瓣膜入口或時間到達，推開單向瓦片瓣膜進入微淋巴管
        if (dist < 18 || g.tissueTimer >= g.maxTissueTime) {
          g.phase = 'entry';
          g.entryProgress = 0;
        }
      } else if (g.phase === 'entry') {
        g.entryProgress += 0.04;
        g.x += (g.gateX + 22 - g.x) * 0.12;
        g.y += (g.gateY - 8 - g.y) * 0.12;
        if (g.entryProgress >= 1) {
          g.phase = 'vessel';
          g.t = 0.08; // 順利進入微淋巴管管腔內部
        }
      } else if (g.phase === 'vessel') {
        // 在淋巴管內部順著淋巴液回流推進 (流經單向瓣膜)
        g.t += 0.0042 * (1 + squeezePulse * 1.6);
        const pt = getPointOnPath(lymphPaths1[g.pathIdx], g.t);
        g.x = pt.x;
        g.y = pt.y;
        if (g.t >= 0.72) {
          g.phase = 'node';
          g.tInNode = 0;
        }
      } else if (g.phase === 'node') {
        g.tInNode += 0.016;
        // 1. 細菌在淋巴竇中被淋巴液推動，並受纖維網阻擋，試圖向門部出口 (x: 520, y: 185) 逃竄
        const sinusTargetX = 520;
        const sinusTargetY = 175 + (g.macIdx - 1.5) * 30;
        const driftAngle = Math.atan2(sinusTargetY - g.y, sinusTargetX - g.x);
        g.x += Math.cos(driftAngle) * 0.7 + Math.sin(time * 6 + i) * 0.55;
        g.y += Math.sin(driftAngle) * 0.7 + Math.cos(time * 6 + i) * 0.55;

        // 2. 巨噬細胞感應到抗原 (趨化作用 Chemotaxis)，主動離崗衝刺追擊！
        const mac = nodeMacrophages1[g.macIdx];
        if (mac) {
          mac.isHunting = true;
          const chaseDx = g.x - mac.x;
          const chaseDy = g.y - mac.y;
          const dist = Math.hypot(chaseDx, chaseDy);
          mac.targetAngle = Math.atan2(chaseDy, chaseDx);

          // 巨噬細胞主動向細菌疾速追捕截擊！
          const chaseSpeed = 1.75 + g.tInNode * 0.45;
          mac.x += (chaseDx / Math.max(1, dist)) * chaseSpeed;
          mac.y += (chaseDy / Math.max(1, dist)) * chaseSpeed;

          // 追上並截捕細菌 (距離 < 19px 或追捕截斷逃逸路線)
          if (dist < 19 || g.tInNode > 1.8) {
            g.phase = 'engulfing';
            g.engulfProgress = 0;
            mac.x = g.x - Math.cos(mac.targetAngle) * 10;
            mac.y = g.y - Math.sin(mac.targetAngle) * 10;
          }
        }
      } else if (g.phase === 'engulfing') {
        g.engulfProgress += 0.035;
        const mac = nodeMacrophages1[g.macIdx];
        if (mac) {
          mac.targetAngle = Math.atan2(g.y - mac.y, g.x - mac.x);
          // 偽足夾緊並將細菌拖入胞內
          mac.engulfRatio = Math.sin(g.engulfProgress * Math.PI);
          g.x += (mac.x - g.x) * 0.22;
          g.y += (mac.y - g.y) * 0.22;
        }
        if (g.engulfProgress >= 1) {
          g.phase = 'digesting';
          g.digestProgress = 0;
        }
      } else if (g.phase === 'digesting') {
        g.digestProgress += 0.025;
        const mac = nodeMacrophages1[g.macIdx];
        if (mac) {
          mac.engulfRatio = Math.max(0, 1 - g.digestProgress);
          // 細菌被鎖在巨噬細胞體內隨溶酶體消化
          g.x = mac.x;
          g.y = mac.y;
          // 巨噬細胞帶著消化中的抗原慢慢返回巡邏陣位
          mac.x += (mac.homeX - mac.x) * 0.035;
          mac.y += (mac.homeY - mac.y) * 0.035;
        }
        if (g.digestProgress >= 1) {
          germParticles.splice(i, 1);
          germsFilteredCount++;
          document.getElementById('statFiltered').textContent = germsFilteredCount + ' 隻';
          if (mac) mac.isHunting = false;
          continue;
        }
      }
    }

    // 巨噬細胞平時巡邏與回位動態
    nodeMacrophages1.forEach((mac, idx) => {
      const isTargeted = germParticles.some(g => (g.phase === 'node' || g.phase === 'engulfing' || g.phase === 'digesting') && g.macIdx === idx);
      if (!isTargeted) {
        mac.isHunting = false;
        mac.engulfRatio = Math.max(0, (mac.engulfRatio || 0) - 0.05);
        // 原地阿米巴變形巡航微步
        const patrolX = mac.homeX + Math.sin(time * 2.0 + idx * 1.6) * 5;
        const patrolY = mac.homeY + Math.cos(time * 2.0 + idx * 1.6) * 5;
        mac.x += (patrolX - mac.x) * 0.06;
        mac.y += (patrolY - mac.y) * 0.06;
      }
    });

    // Tab 2 流體粒子更新 (出發點與消失點均大幅分散，涵蓋全網)
    fluidParticles.forEach(p => {
      if (p.state === 'plasma_leak') {
        const rateFactor = filtrationRate >= 1.4 ? 1.25 : 1.0;
        p.x += p.vx * rateFactor;
        p.y += p.vy * rateFactor;
        p.timer++;
        if (p.timer > 28) {
          p.state = 'interstitial';
          p.timer = 0;
        }
      } else if (p.state === 'interstitial') {
        p.timer++;
        // 組織液朝向其所屬分散之微淋巴管盲端活門流動
        const dx = (p.targetX || 500) - p.x;
        const dy = (p.targetY || 470) - p.y;
        const dist = Math.hypot(dx, dy);
        const pull = 0.35 + squeezePulse * 0.85;
        p.x += (dx / Math.max(1, dist)) * pull + (Math.random() - 0.5) * 0.6;
        p.y += (dy / Math.max(1, dist)) * pull + (Math.random() - 0.5) * 0.6;

        // 當接近盲端入口活門，或者在間隙時間到達且未受阻時，進入微淋巴管
        if ((dist < 22 || p.timer > p.maxInterstitialTime) && !isEdemaBlocked) {
          p.state = 'lymph';
          p.t = (p.targetT !== undefined) ? p.targetT : 0.05;
        }
      } else if (p.state === 'lymph') {
        const speedMult = 1.0 + squeezePulse * 2.2;
        p.t += p.speed * speedMult;
        if (p.t >= 1) {
          p.state = 'plasma_leak';
          const lp = leakPoints2[Math.floor(Math.random() * leakPoints2.length)];
          p.x = lp.x + (Math.random() - 0.5) * 10;
          p.y = lp.y + (Math.random() - 0.5) * 10;
          p.vx = lp.vx * (0.75 + Math.random() * 0.5);
          p.vy = lp.vy * (0.75 + Math.random() * 0.5);
          p.targetX = lp.targetX + (Math.random() - 0.5) * 12;
          p.targetY = lp.targetY + (Math.random() - 0.5) * 12;
          p.targetT = lp.targetT;
          p.pathIdx = lp.pathIdx;
          p.timer = 0;
        }
      }
    });

    // 當血漿滲出率極高時，動態補充組織液粒子數量；恢復正常時自然引流減回正常數量
    if (activeTab === 2 && molAlpha2.plasma > 0.1) {
      if (filtrationRate > 1.35 && fluidParticles.length < 46 && Math.random() < 0.15) {
        spawnPlasmaLeakParticle();
      } else if (filtrationRate <= 1.35 && fluidParticles.length > 30) {
        const excessIdx = fluidParticles.findIndex(p => p.state === 'lymph' && p.t >= 0.96);
        if (excessIdx !== -1) fluidParticles.splice(excessIdx, 1);
      }
    }

    cutawayParticles.forEach(cp => {
      cp.progress += cp.speed * (1 + squeezePulse * 1.5);
      if (cp.progress >= 1) cp.progress = 0;
    });

    rbcParticles.forEach(rbc => {
      rbc.t += rbc.speed;
      if (rbc.t >= 1) rbc.t -= 1;
    });
  }

  // ==========================================
  // 觸控與點擊互動
  // ==========================================
  function handleCanvasTap(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cx = (clientX - rect.left) * (W / rect.width);
    const cy = (clientY - rect.top) * (H / rect.height);

    if (activeTab === 1) {
      // 點選 Tab 1 (特寫) 標籤
      for (const lbl of canvasLabels1) {
        if (lbl._hit && cx >= lbl._hit.x && cx <= lbl._hit.x + lbl._hit.w && cy >= lbl._hit.y && cy <= lbl._hit.y + lbl._hit.h) {
          toggleStruct1(lbl.id === 'exchange' ? 'capillaryBed' : lbl.id);
          return;
        }
      }
      // 點選 Tab 1 構造區域
      if (cx >= 150 && cx <= 210 && cy >= 150 && cy <= 600) { toggleStruct1('arteriole'); return; }
      if (cx >= 670 && cx <= 730 && cy >= 140 && cy <= 600) { toggleStruct1('venule'); return; }
      if (cy >= 460 && cx >= 200 && cx <= 680) { toggleStruct1('lymphVessel'); return; }
      if (cx >= 210 && cx <= 670 && cy >= 100 && cy <= 460) {
        if (Math.abs(cx - 270) < 25 || Math.abs(cx - 370) < 25 || Math.abs(cx - 485) < 25 || Math.abs(cx - 590) < 25) {
          toggleStruct1('lymphCapillary');
        } else {
          toggleStruct1('capillaryBed');
        }
        return;
      }
      if (cx >= 170 && cx <= 710 && cy >= 80 && cy <= 520) { toggleStruct1('tissue'); return; }
      resetStructs1();
    } else {
      // 點選 Tab 2 (全覽) 標籤
      for (const lbl of canvasLabels2) {
        if (lbl._hit && cx >= lbl._hit.x && cx <= lbl._hit.x + lbl._hit.w && cy >= lbl._hit.y && cy <= lbl._hit.y + lbl._hit.h) {
          toggleStruct2(lbl.id);
          return;
        }
      }
      // 點選 Tab 2 構造區域
      if (cx >= 540 && cx <= 810 && cy >= 370 && cy <= 560) { toggleStruct2('lymphCapillary'); return; }
      if (Math.hypot(cx - 485, cy - 185) <= 140) { toggleStruct2('lymphNode'); return; }
      if (cx >= 120 && cx <= 375 && cy >= 150 && cy <= 410) { toggleStruct2('afferent'); return; }
      if (cx >= 440 && cx <= 650 && cy >= 440 && cy <= 580) { toggleStruct2('tissueCells'); return; }
      if (cx >= 180 && cx <= 450 && cy >= 380 && cy <= 600) { toggleStruct2('capillary'); return; }
      resetStructs2();
    }
  }

  canvas.addEventListener('pointerdown', e => handleCanvasTap(e.clientX, e.clientY));

  function animate() {
    updateSimulation();
    ctx.clearRect(0, 0, W, H);
    if (activeTab === 1) drawTab1Scene();
    else drawTab2Scene();
    requestAnimationFrame(animate);
  }

  // 支援 URL 參數預設切換 (若有 ?tab=2 則開啟分頁 2，預設開啟分頁 1：特寫)
  if (window.location.hash === '#tab2' || new URLSearchParams(window.location.search).get('tab') === '2') {
    switchTab(2);
  } else {
    switchTab(1);
  }

  // 提供測試與狀態監控介面
  window._sim = {
    leakPoints2,
    fluidParticles,
    germParticles,
    nodeMacrophages1,
    getEdemaLevel: () => edemaLevel,
    getSelectedElements2: () => Array.from(selectedElements2)
  };

  animate();
})();
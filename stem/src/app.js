/**
 * Plant Stem Anatomy 3D (植物莖部解剖 3D 互動教學系統)
 * Pure JavaScript with Three.js (No Node / Bundler required)
 * 
 * Perfected Geometric Architecture:
 * - 4 Dedicated Anatomical Views:
 *    1. 3D 楔形剖面 (3D Wedge Cutaway): 270° 實心圓柱 + 徑向剖切面 + 內部 3D 導管管路
 *    2. 橫切面 (Transverse Cross Section): 360° 完整圓盤橫剖切面，如顯微鏡玻片般清晰無瑕疵
 *    3. 縱切面 (Radial Longitudinal Section): 180° 正面縱剖切面，平整縱切面正對鏡頭，對稱呈現髓心、木質部垂直管道、形成層、韌皮部、樹皮
 *    4. 完整外觀 (Whole Stem): 360° 完整圓柱
 * - 徹底根除 Extrude 破圖、面反轉、共面 Z-Fighting 與陰影雜訊 (Shadow Acne)
 * - 散生維管束猴臉 (Monkey-Face) 高精度顯微特寫
 * - 水分向上蒸散流 (木質部藍光 ↑) 與養分雙向運輸流 (韌皮部金光 ↕)
 */

(function () {
  'use strict';

  // --- Constants & Color Palette ---
  const COLORS = {
    pith: 0xfef08a,         // 髓 (柔和乳黃色)
    pithRay: 0xfde047,      // 髓線 / 維管射線
    xylem: 0x38bdf8,        // 木質部 (鮮明水藍色)
    xylemDark: 0x0284c7,    // 木質部導管壁
    vesselLumen: 0x0369a1,  // 導管管孔
    cambium: 0x10b981,      // 形成層 (翠綠活躍生長層)
    phloem: 0xf59e0b,       // 韌皮部 (金色養分流動層)
    cortex: 0x86efac,       // 皮層 (淺綠柔組織)
    bark: 0x78350f,         // 樹皮/周皮 (深褐木栓層)
    groundTissue: 0xecfccb, // 單子葉基本組織 (嫩綠薄壁細胞)
    bundleSheath: 0x818cf8, // 維管束鞘 (厚壁組織藍紫色)
    epidermis: 0x15803d     // 表皮 (深綠緻密保護層)
  };

  // --- Anatomical Knowledge Base ---
  const ANATOMY_DATA = {
    dicot: {
      default: {
        tag: '雙子葉植物草本/木本莖',
        name: '雙子葉植物莖構造',
        latin: 'Dicotyledonous Stem Anatomy',
        tagColor: '#10b981',
        desc: '雙子葉植物莖的維管束呈規律的「環狀排列」(Eustele)。在木質部與韌皮部之間具有活躍分裂的「形成層」，能進行次生生長使莖逐年加粗。點擊畫面上的組織即可探索各層解剖特徵。',
        features: [
          { label: '排列型態', val: '環狀排列 (Eustele 真正中柱)，圍繞中央髓部' },
          { label: '次生生長', val: '具維管束形成層與木栓形成層，能形成木材與樹皮' },
          { label: '主要構造', val: '髓 (中心)、木質部 (內側)、形成層 (中間)、韌皮部 (外側)、皮層與樹皮' }
        ],
        tip: '提示：點擊「橫切面 (俯視)」觀察同心環層次，或切換「縱切面 (側視)」觀察垂直管道分布。'
      },
      pith: {
        tag: '中央核心組織',
        name: '髓 (Pith / Medulla)',
        latin: 'Medulla / Pith Parenchyma',
        tagColor: '#fef08a',
        desc: '位於雙子葉植物莖的最中央，主要由大型薄壁細胞 (Parenchyma) 組成。在幼莖中負責儲藏水分與養分（如澱粉）。隨植物生長老化，部分草本植物的髓中心可能破裂形成「髓腔」(如空心菜、竹子)。',
        features: [
          { label: '細胞特性', val: '細胞體積大、細胞壁薄、細胞間隙明顯的柔組織' },
          { label: '生理功能', val: '儲藏水分、澱粉等養分；老莖中提供彈性支持' },
          { label: '切面特徵', val: '橫切呈中央圓形區域；縱切呈中央垂直圓柱柱體' }
        ],
        tip: '髓向外延伸的薄壁細胞通道稱為「髓線」(Pith rays)，負責莖部徑向物質運輸。'
      },
      xylem: {
        tag: '水分運輸與支持',
        name: '木質部 (Xylem)',
        latin: 'Secondary & Primary Xylem',
        tagColor: '#38bdf8',
        desc: '位於維管束的「內側」，由形成層向內分裂產生。包含導管 (Vessels)、管胞 (Tracheids)、木纖維與木薄壁細胞。管壁沉積木質素 (Lignin) 高度木質化，成熟後原生質體解體成為中空死細胞。',
        features: [
          { label: '運輸方向', val: '單向向上 (由根部經莖部送往葉部)' },
          { label: '運輸物質', val: '水分與溶解於其中的無機鹽 (蒸散流驅動)' },
          { label: '切面特徵', val: '橫切可見圓形導管孔；縱切呈長管狀直立管道' }
        ],
        tip: '畫面中流動的「藍色光點」模擬水分子沿導管向上蒸散流動的動態！'
      },
      cambium: {
        tag: '分生加粗組織',
        name: '維管束形成層 (Vascular Cambium)',
        latin: 'Cambium Vasculare',
        tagColor: '#10b981',
        desc: '夾在木質部與韌皮部之間的活躍次生分生組織，通常只有數層扁平的紡錘形原始細胞。每年生長季不斷進行切向分裂：向內分裂分化為「次生木質部」(木材)，向外分裂分化為「次生韌皮部」。',
        features: [
          { label: '細胞特性', val: '細胞壁極薄、細胞質濃厚、分裂能力極強的分生細胞' },
          { label: '生理功能', val: '次生生長加粗；在木本植物中形成年輪 (Growth rings)' },
          { label: '切面特徵', val: '橫切呈連續碧綠細環；縱切呈長條垂直薄線' }
        ],
        tip: '單子葉植物因「缺乏維管束形成層」，因此草莖無法像雙子葉樹木般逐年增粗。'
      },
      phloem: {
        tag: '有機養分雙向運輸',
        name: '韌皮部 (Phloem)',
        latin: 'Secondary & Primary Phloem',
        tagColor: '#f59e0b',
        desc: '位於形成層的「外側」，由篩管 (Sieve tubes)、伴細胞 (Companion cells)、韌皮纖維與韌皮薄壁細胞組成。篩管細胞成熟時細胞核退化但仍為活細胞，端壁具「篩板」(Sieve plate) 讓細胞質互通。',
        features: [
          { label: '運輸方向', val: '雙向運輸 (依照「源-庫」壓力流，由葉產生的糖送往根或生長點)' },
          { label: '運輸物質', val: '蔗糖等光合作用產物、胺基酸、植物荷爾蒙' },
          { label: '切面特徵', val: '橫切呈金色圓環帶；縱切呈平行垂直篩管帶' }
        ],
        tip: '樹木被「環狀剝皮」時，韌皮部被破壞導致有機養分無法運至根部，植物最終會枯死。'
      },
      cortex: {
        tag: '填充與保護柔組織',
        name: '皮層 (Cortex)',
        latin: 'Cortex Parenchyma & Collenchyma',
        tagColor: '#86efac',
        desc: '位於韌皮部外側、樹皮內側的區域，主要由薄壁細胞及厚角組織 (Collenchyma) 組成。幼嫩莖的皮層細胞常含有葉綠體，能進行微弱的光合作用。',
        features: [
          { label: '主要功能', val: '填充支持、儲藏養分；在幼莖中具初步機械柔韌性' },
          { label: '切面特徵', val: '橫切為淡綠色外環；縱切為緊鄰樹皮的綠色縱帶' }
        ],
        tip: '木本植物加粗過程中，皮層會逐漸被擠壓剝落，並由木栓形成層取代。'
      },
      bark: {
        tag: '最外層保護屏障',
        name: '樹皮 / 周皮 (Bark / Periderm)',
        latin: 'Periderm / Rhytidome',
        tagColor: '#78350f',
        desc: '廣義的樹皮包含形成層以外的所有組織；狹義的樹皮即「周皮」，由木栓形成層、木栓層 (Cork) 及栓內層組成。木栓細胞壁含有不透水氣的「木栓質」(Suberin)，細胞死亡後形成緊密防水絕緣的外殼。',
        features: [
          { label: '生理功能', val: '防止水分過度蒸散、抵抗病原菌入侵、隔絕外界物理傷害與禦寒' },
          { label: '呼吸構造', val: '表面具有「皮孔」(Lenticels)，供莖部內部活細胞氣體交換' },
          { label: '切面特徵', val: '橫切為最外圈深褐木栓環；外表具縱向粗糙溝紋' }
        ],
        tip: '紅酒軟木塞就是利用栓皮櫟 (Cork oak) 肥厚發達的木栓層製成的！'
      }
    },
    monocot: {
      default: {
        tag: '單子葉植物草本莖',
        name: '單子葉植物莖構造',
        latin: 'Monocotyledonous Stem Anatomy',
        tagColor: '#38bdf8',
        desc: '單子葉植物莖的維管束呈「散生排列」(Atactostele)。維管束外圍密集、中央稀疏，每個維管束皆被「維管束鞘」緊密包圍（封閉型維管束），「不具形成層」。維管束橫切呈現生動的「猴臉/小丑面具」形狀！',
        features: [
          { label: '排列型態', val: '散生排列 (Atactostele)，無明顯皮層與髓的界限' },
          { label: '形成層', val: '無形成層，不能無限加粗（封閉型維管束 Closed bundle）' },
          { label: '維管束特徵', val: '橫切呈經典「猴臉」形：兩大後生導管為眼、原生導管腔為鼻/嘴、額頭為韌皮部' }
        ],
        tip: '點擊右上角「顯微放大特寫」圖標，可深入觀察單一散生維管束的猴臉微觀解剖！'
      },
      groundTissue: {
        tag: '主要基質',
        name: '基本組織 (Ground Tissue)',
        latin: 'Fundamental Parenchyma',
        tagColor: '#ecfccb',
        desc: '填充於單子葉植物整個莖內，散生維管束嵌於其中。由於沒有成環的維管束分隔，單子葉植物無法明確區分「皮層」與「髓」，統一稱為基本組織。細胞為大型薄壁細胞，間隙多，能儲藏水分與養分。',
        features: [
          { label: '細胞特性', val: '大量大型圓形薄壁細胞，具備支持與儲存功能' },
          { label: '解剖特點', val: '中央基本組織較疏鬆，周緣靠近表皮處細胞較小且壁厚' }
        ],
        tip: '甘蔗莖中甜美的汁液，就是儲藏在基本組織大型薄壁細胞的液胞中！'
      },
      bundles: {
        tag: '散生維管束柱',
        name: '散生維管束 (Scattered Vascular Bundle)',
        latin: 'Fasciculus Collateralis Clausus',
        tagColor: '#38bdf8',
        desc: '許多獨立的維管束柱縱向貫穿整條莖。外圍維管束多而小，排列緻密以抵抗強風彎曲；內部維管束少而大，導管孔徑粗以加速水分傳導。維管束外圍包覆一層由厚壁細胞構成的「維管束鞘」，將木質部與韌皮部封閉。',
        features: [
          { label: '分佈規律', val: '周邊高密度小管柱，中央低密度大管柱 (如玉米莖)' },
          { label: '封閉型', val: '木質部與韌皮部之間無形成層，不能再進行次生生長' }
        ],
        tip: '玉米、水稻、竹子均為典型散生維管束。竹子空心是因為中央基本組織在生長發育中退化。'
      },
      epidermis: {
        tag: '外層保護與下皮',
        name: '表皮與厚壁下皮 (Epidermis & Hypodermis)',
        latin: 'Epidermis & Sclerenchyma Ring',
        tagColor: '#15803d',
        desc: '單子葉植物莖的最外層為表皮，覆蓋著角質層 (Cuticle)，常含有矽質。表皮內側常有 1~3 層木質化的厚壁下皮 (Hypodermis)，配合外圍密集的維管束鞘，共同形成堅固的抗彎抗壓圓筒。',
        features: [
          { label: '力學特性', val: '類似現代工程的中空薄壁複合管，柔韌不易倒伏' },
          { label: '保護功能', val: '抗病蟲咬食、防水蒸散、防物理磨損' }
        ],
        tip: '竹子能長到十幾公尺高而不折斷，就是靠表皮厚壁環與外圍密集維管束的協同力學支撐！'
      }
    },
    cell: {
      default: {
        tag: '單一細胞微觀構造',
        name: '維管束單一細胞微觀架構',
        latin: 'Single Cell Micro-Anatomy of Vascular Bundle',
        tagColor: '#10b981',
        desc: '依據植物解剖教科書經典圖示，維管束由外側「韌皮部單一細胞（篩管細胞與伴細胞）」與內側「木質部單一細胞（導管與管胞）」以多邊形緊密柱狀排列而成。兩者以形成層分隔，分別特化為負責運送有機養分與水分無機鹽的微觀傳輸管道。',
        features: [
          { label: '位置原則', val: '「外韌內木」— 外側為橘金色韌皮部，內側為水藍色木質部' },
          { label: '形態特徵', val: '多邊形六角柱狀管道，相鄰細胞緊密擠壓嵌合，具極高水力傳導效率' },
          { label: '分化生命力', val: '木質部為厚壁木質化「死細胞」；韌皮部篩管為特化「活細胞」並由伴細胞支持代謝' }
        ],
        tip: '點選左側「外·內組合」、「韌皮部細胞」或「木質部細胞」，深入探索細胞壁、端壁穿孔板與篩板的微觀幾何！'
      },
      cell_pair: {
        tag: '教科書經典單元',
        name: '外·韌皮部 vs 內·木質部 (細胞單元)',
        latin: 'Vascular Bundle Functional Unit (Phloem Outer & Xylem Inner)',
        tagColor: '#10b981',
        desc: '完美重現生物課本插圖：左/外側標示「外」的橘金色細胞為韌皮部篩管細胞與緊貼其側的伴細胞；右/內側標示「內」的水藍色細胞為木質部導管細胞。兩者交界處為具有旺盛分裂能力的「形成層」界線。',
        features: [
          { label: '外側 (外)', val: '韌皮部篩管細胞 (橘色) + 伴細胞，具多孔篩板，雙向傳導光合作用產物' },
          { label: '內側 (內)', val: '木質部導管細胞 (藍色)，中空厚壁死細胞，具穿孔板與紋孔，單向向上運水' },
          { label: '排列規律', val: '無數個此種單元在莖部圍繞中央髓部呈同心環排列，形成雙子葉植物的環狀維管束' }
        ],
        tip: '頂部的「外」與「內」綠色圓標與課本圖示完全一致，象徵植物解剖學中的空間方位核心口訣！'
      },
      cell_phloem: {
        tag: '外側 · 活細胞',
        name: '韌皮部單一細胞 (篩管細胞與伴細胞)',
        latin: 'Sieve-Tube Element & Companion Cell',
        tagColor: '#f59e0b',
        desc: '位於維管束外側 (外)。篩管細胞成熟時原生質體特化，細胞核退化，液胞膜解體，使細胞質通道貫通以降低黏稠蔗糖溶液的流動阻力；其代謝生命活動完全仰賴旁邊具大細胞核的「伴細胞」全力供給 ATP 與調控。',
        features: [
          { label: '細胞壁類型', val: '初生纖維素細胞壁 (Primary cell wall)，柔軟具韌性，不木質化' },
          { label: '端壁構造', val: '「端壁篩板 (Sieve plate)」具有許多細小「篩孔 (Sieve pores)」，細胞質聯絲穿流' },
          { label: '伴細胞共生', val: '緊密貼附於篩管側邊，細胞質濃稠、含發達細胞核與豐富粒線體，負責養分主動裝載 (Loading)' },
          { label: '運輸動力', val: '壓力流假說 (Pressure-Flow Hypothesis)：高濃度蔗糖產生滲透壓驅動質量流動' }
        ],
        tip: '篩管內的黃金光點動態模擬有機養分（蔗糖、胺基酸）在源（葉）與庫（根、果實）之間的雙向傳輸！'
      },
      cell_xylem: {
        tag: '內側 · 死細胞',
        name: '木質部單一細胞 (導管分子與管胞)',
        latin: 'Vessel Element & Tracheid',
        tagColor: '#38bdf8',
        desc: '位於維管束內側 (內)。成熟時原生質體完全自溶消失，僅留下堅固木質化的次生細胞壁，形成一根「中空的直通微細管道」。能承受葉片蒸散作用所產生的極大負壓（高達數十個大氣壓的張力），維持水分連續不斷向上牽引。',
        features: [
          { label: '細胞壁加厚', val: '次生壁大量沉積「木質素 (Lignin)」，質地極為堅硬耐壓，抗物理拉扯' },
          { label: '端壁打通', val: '端壁特化為「穿孔板 (Perforation plate)」，縱向完全打通，阻力接近於零' },
          { label: '側壁紋孔', val: '側壁具有成對的「具緣紋孔 (Bordered pits)」，具紋孔膜閥門，供橫向側向安全分流水流' },
          { label: '運輸動力', val: '蒸散拉力 + 水分子內聚力與附著力 (Cohesion-Tension Theory)' }
        ],
        tip: '導管中向上衝湧的藍色光芒模擬根部吸收的水分與礦物質正急速向頂端枝葉蒸散流動！'
      },
      sieve_plate: {
        tag: '篩管端壁構造',
        name: '端壁篩板與篩孔 (Sieve Plate & Pores)',
        latin: 'Area Cribrosa / Sieve Plate',
        tagColor: '#fbbf24',
        desc: '位於兩個相鄰上下篩管細胞的橫向端壁。壁上密集分布著無數細微的篩孔，內襯胼胝質 (Callose)。在植物受到昆蟲咬傷或物理機械損傷時，胼胝質能迅速大量沉積封閉篩孔，防止珍貴的有機養分外溢流失。',
        features: [
          { label: '結構形式', val: '多孔濾網狀隔板，細胞質絲貫穿相鄰細胞' },
          { label: '自癒防禦', val: '外傷時迅速合成胼胝質栓塞 (Callose plug) 止血封孔' }
        ],
        tip: '透過剖面透視可清晰看見篩板如同微型蓮蓬頭濾板般，引導營養液均勻擴散。'
      },
      companion_cell: {
        tag: '代謝調控輔助細胞',
        name: '伴細胞與細胞核 (Companion Cell & Nucleus)',
        latin: 'Cellula Comitans',
        tagColor: '#f43f5e',
        desc: '特化的大型有核薄壁細胞，與篩管細胞源自同一個形成層母細胞的分裂。由於篩管細胞核退化，伴細胞的細胞核承擔了調控篩管細胞合成蛋白質、進行胞飲作用與能量 ATP 供給的全部重責大任。',
        features: [
          { label: '細胞核特徵', val: '細胞核特別碩大明顯，轉錄活性旺盛' },
          { label: '蔗糖質子同向轉運', val: '利用細胞膜質子泵 (H+-ATPase) 將葉片產生的蔗糖主動泵入篩管腔' }
        ],
        tip: '模型中發出粉紅光澤的球狀體即為伴細胞的「細胞核 (Nucleus)」，象徵代謝調控的中樞！'
      },
      xylem_lumen: {
        tag: '中空輸水通道',
        name: '導管中空管腔 (Vessel Lumen)',
        latin: 'Lumen Vasculare',
        tagColor: '#0ea5e9',
        desc: '導管細胞內部完全清空的中空圓筒空間。管徑介於 20~200 微米，內壁光滑親水，使得水分子能形成強韌的水柱（藉由氫鍵內聚力），從根部一路連續延伸數十公尺直達樹冠葉肉細胞。',
        features: [
          { label: '水力特性', val: '直徑越大傳導量呈四次方爆發性增長 (泊肅葉定律 Poiseuille\'s Law)' },
          { label: '抗氣穴栓塞', val: '內壁具特殊親水性塗層，減少微小氣泡附著產生氣穴 (Cavitation)' }
        ],
        tip: '切換「縱向剖切透視」，即可直接探入導管腔核心觀察水流！'
      },
      perforation_plate: {
        tag: '導管端壁通道',
        name: '導管端壁穿孔板 (Perforation Plate)',
        latin: 'Lamina Perforata',
        tagColor: '#38bdf8',
        desc: '相鄰導管分子上下相接的端部隔壁。在發育過程中，原生質體主動分泌纖維素酶與果膠酶將此處的細胞壁完全溶解消化，形成開放型單穿孔板，使相鄰導管分子串接成一條長達數公尺的連續導管管路。',
        features: [
          { label: '演化進程', val: '被子植物演化出完全開口的單穿孔板，比裸子植物管胞的傳導效率提升百倍' }
        ],
        tip: '頂部開孔即為穿孔板的開口，水流在此毫無阻礙地向上湧出！'
      },
      bordered_pits: {
        tag: '側壁安全閥構造',
        name: '具緣紋孔 (Bordered Pits)',
        latin: 'Porus Areolatus',
        tagColor: '#0284c7',
        desc: '木質部細胞側壁未加厚的圓形薄膜區域。當某根導管因乾旱或凍結產生氣泡栓塞時，紋孔中的紋孔膜 (Pit membrane) 與紋孔塞 (Torus) 會像單向瓣膜閥門般緊閉，阻止氣泡擴散到相鄰健康的導管，是植物極為精妙的水力安全防禦系統！',
        features: [
          { label: '結構組成', val: '外側木質隆起緣 (Border) + 中央薄膜 (Pit membrane) + 紋孔孔口 (Aperture)' },
          { label: '生理功能', val: '側向橫向水分分流；阻隔氣穴栓塞蔓延' }
        ],
        tip: '觀察木質部六角柱側面的圓環構造，即為數百萬年演化出的具緣紋孔對！'
      },
      cambium: {
        tag: '中軸分生界線',
        name: '形成層界線 (Cambium Interface)',
        latin: 'Zona Cambialis',
        tagColor: '#10b981',
        desc: '位於維管束外側韌皮部與內側木質部之間的次生分生組織界線。在此處不斷進行切向平周分裂，向外衍生為韌皮部細胞，向內衍生為木質部細胞。',
        features: [
          { label: '空間方位', val: '內外分界線：內為木質部，外為韌皮部' },
          { label: '分化功能', val: '向外分化篩管與伴細胞，向內分化導管與管胞' }
        ],
        tip: '正是這層活躍的形成層，造就了雙子葉植物樹幹不斷加粗的年輪奇蹟！'
      }
    }
  };

  // --- Dimension Parameters ---
  const STEM_HEIGHT = 12.0;
  const STEM_RADIUS = 5.0;

  // Dicot concentric layer radii (Herbaceous / Primary Growth ring architecture)
  const DICOT_RADII = {
    pith: 2.25,
    bundleCenter: 3.55,
    xylemInner: 2.40,
    xylemOuter: 3.45,
    cambiumInner: 3.48,
    cambiumOuter: 3.62,
    phloemInner: 3.65,
    phloemOuter: 4.45,
    cortexInner: 4.45,
    cortexOuter: 4.78,
    barkInner: 4.78,
    barkOuter: 5.05
  };

  // --- App State ---
  const state = {
    mode: 'cell',           // 'dicot' | 'monocot' | 'cell' (預設顯示「單一細胞構造」分頁)
    cellSubmode: 'pair',    // 'pair' | 'phloem' | 'xylem'
    cellCutaway: true,
    cellPins: true,
    cellFlow: true,
    cellPhloemDir: 'down',  // 'up' (全部往上) | 'down' (全部往下) | 'alternate' (雙向交替)
    viewPreset: 'wedge',    // 'wedge' | 'cross' | 'long' | 'full'
    sliceYPct: 100,         // 15 ~ 100
    wedgeAngleDeg: 90,      // 0 ~ 180
    explodeAmount: 0.0,     // 0.0 ~ 1.0
    waterFlow: true,
    phloemFlow: true,
    autoRotate: false,
    hoveredMesh: null,
    selectedStructure: null,
    microscopeMode: false
  };

  // --- Three.js Globals ---
  let scene, camera, renderer, controls;
  let activeModelGroup = null;
  let microscopeGroup = null;
  let waterParticles = null, phloemParticles = null;
  let raycaster, mouse;
  let clippingPlaneY;
  let barkTexture = null;
  let clock = new THREE.Clock(); // 用來計算每一幀經過的時間 (Delta Time)

  // --- Initialize Application ---
  function init() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.FogExp2(0x0a0e14, 0.012);

    // 2. Camera (optimized near/far ratio for high depth buffer precision)
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 300);
    if (state.mode === 'cell') {
      camera.position.set(0, 0, 18.0);
    } else {
      camera.position.set(-14, 11, 16);
    }

    // 3. Renderer with Logarithmic Depth Buffer to completely eliminate z-fighting flickering
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    // 4. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 55;
    controls.minDistance = 3;
    if (state.mode === 'cell') {
      controls.target.set(0, -1.25, 0);
    } else {
      controls.target.set(0, 0, 0);
    }

    // 5. Studio 3-Point Lighting
    setupLighting();

    // 6. Raycasting
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 7. Clipping plane for Y slice (safely positioned far above top cap at start to prevent grazing/flickering)
    clippingPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), STEM_HEIGHT * 0.5 + 5.0);

    // 8. Shared Bark Texture
    barkTexture = createProceduralBarkTexture();

    // 9. Environment Grid
    createEnvironment();

    // 10. Build Initial Model (Cell or Stem)
    rebuildSceneModel();

    // 11. Microscope bundle model (initially hidden)
    microscopeGroup = buildMicroscopeBundle();
    microscopeGroup.visible = false;
    scene.add(microscopeGroup);

    // 12. Flow Particles
    setupParticleSystems();

    // 13. UI Event Bindings
    bindEvents();
    updateLegendUI();

    // 14. Initial structure selection & UI state sync
    if (state.mode === 'cell') {
      if (state.cellSubmode === 'pair') selectStructure('cell_pair');
      else if (state.cellSubmode === 'phloem') selectStructure('cell_phloem');
      else if (state.cellSubmode === 'xylem') selectStructure('cell_xylem');
      setCellPhloemDirection(state.cellPhloemDir);
    } else {
      selectStructure('default');
    }

    // 15. Render Loop
    animate();
  }

  // --- Lighting Setup ---
  function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.90);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(-15, 20, 18);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(16, 14, -14);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.45);
    topLight.position.set(0, 25, 0);
    scene.add(topLight);
  }

  // --- Environment Grid ---
  function createEnvironment() {
    const grid = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -STEM_HEIGHT * 0.5 - 0.05;
    scene.add(grid);

    const shadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(STEM_RADIUS * 1.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -STEM_HEIGHT * 0.5;
    scene.add(shadowMesh);
  }

  // --- Procedural Green Stem / Bark Texture (Matching textbook diagram) ---
  function createProceduralBarkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fresh botanical green background
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(0, 0, 512, 512);

    // Fine vertical plant fibers & striations
    for (let x = 0; x < 512; x += 2) {
      const g = Math.floor(Math.sin(x * 0.05) * 22 + Math.random() * 25 + 115);
      const r = Math.floor(g * 0.42);
      const b = Math.floor(g * 0.16);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, 0, 1 + Math.random() * 2, 512);
    }

    // Subtle natural vertical highlights
    ctx.fillStyle = 'rgba(190, 242, 100, 0.15)';
    for (let i = 0; i < 40; i++) {
      const lx = Math.random() * 512;
      ctx.fillRect(lx, 0, 2 + Math.random() * 4, 512);
    }

    // Lenticels / subtle cuticle pores
    ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
    for (let i = 0; i < 180; i++) {
      const lx = Math.random() * 512;
      const ly = Math.random() * 512;
      const lw = 4 + Math.random() * 8;
      ctx.fillRect(lx, ly, lw, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  }

  const matCache = new Map();
  function createMat(color, roughness = 0.5, metalness = 0.05, isBark = false) {
    const key = `${color}_${roughness}_${metalness}_${isBark}`;
    if (matCache.has(key)) {
      return matCache.get(key);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness,
      metalness: metalness,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlaneY]
    });
    if (isBark && barkTexture) {
      mat.map = barkTexture;
      mat.roughness = 0.85;
    }
    matCache.set(key, mat);
    return mat;
  }

  function disposeGroup(obj) {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.dispose();
      }
    });
  }

  // =========================================================================
  // SINGLE CELL (韌皮部與木質部單一細胞) 3D BUILDERS & GENERATORS
  // =========================================================================

  /**
   * Generates textbook badge ("外" or "內") sprite
   */
  function createCircleBadgeSprite(text, isOuter = true) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Outer circle
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#d9f99d'; // Light lime-green from textbook
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#84cc16';
    ctx.stroke();

    // Subtle inner bevel
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.stroke();

    // Chinese character
    ctx.fillStyle = '#14532d';
    ctx.font = 'bold 62px "Noto Sans TC", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 66);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 1.2, 1.2);

    const group = new THREE.Group();
    group.add(sprite);

    // Stem line connecting badge to top of cell
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(0, -1.05, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x84cc16, linewidth: 2 });
    const stemLine = new THREE.Line(lineGeo, lineMat);
    group.add(stemLine);

    return group;
  }

  /**
   * Generates interactive 3D anatomy pin
   */
  function createAnatomyPin(label, colorHex, position, uData) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Glowing dot
    const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), dotMat);
    dot.userData = uData;
    group.add(dot);

    // Label Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(4, 8, 248, 48, 12);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 33);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.set(0, 0.4, 0);
    sprite.userData = uData;
    group.add(sprite);

    group.userData = uData;
    return group;
  }

  /**
   * 木質部單一細胞 (導管與管胞細胞)
   * 柱狀六角稜柱中空管 + 穿孔板 + 具緣紋孔 + 水流粒子
   */
  function buildSingleCellXylem(options = {}) {
    const root = new THREE.Group();
    root.name = 'cell_xylem_root';
    const h = 8.5;
    const rOuter = 1.35;
    const rInner = 0.98;
    const sides = 6;
    const isCutaway = options.cutaway !== false;

    const uWall = { type: 'cell_xylem', name: '木質化次生細胞壁 (Lignified Wall)', plant: 'dicot' };
    const uLumen = { type: 'xylem_lumen', name: '導管中空腔 (Vessel Lumen)', plant: 'dicot' };
    const uPerf = { type: 'perforation_plate', name: '導管端壁穿孔板 (Perforation Plate)', plant: 'dicot' };
    const uPits = { type: 'bordered_pits', name: '具緣紋孔 (Bordered Pits)', plant: 'dicot' };

    // 1. Hollow Hexagonal Prism Wall
    const shape = new THREE.Shape();
    const cutAngle = isCutaway ? (Math.PI * 2 / 3) : 0; // 120° cutaway
    const angleStart = cutAngle * 0.5;
    const angleEnd = Math.PI * 2 - cutAngle * 0.5;
    const numPts = isCutaway ? 5 : 6;

    if (!isCutaway) {
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = rOuter * Math.cos(a);
        const y = rOuter * Math.sin(a);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();

      const hole = new THREE.Path();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = rInner * Math.cos(a);
        const y = rInner * Math.sin(a);
        if (i === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      }
      hole.closePath();
      shape.holes.push(hole);
    } else {
      const outerPts = [];
      const innerPts = [];
      for (let i = 0; i <= numPts; i++) {
        const a = angleStart + (i / numPts) * (angleEnd - angleStart);
        outerPts.push(new THREE.Vector2(rOuter * Math.cos(a), rOuter * Math.sin(a)));
        innerPts.push(new THREE.Vector2(rInner * Math.cos(a), rInner * Math.sin(a)));
      }
      shape.moveTo(outerPts[0].x, outerPts[0].y);
      for (let i = 1; i < outerPts.length; i++) {
        shape.lineTo(outerPts[i].x, outerPts[i].y);
      }
      shape.lineTo(innerPts[innerPts.length - 1].x, innerPts[innerPts.length - 1].y);
      for (let i = innerPts.length - 2; i >= 0; i--) {
        shape.lineTo(innerPts[i].x, innerPts[i].y);
      }
      shape.closePath();
    }

    const extrudeSettings = { depth: h, bevelEnabled: false };
    const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    wallGeo.translate(0, 0, -h * 0.5);
    wallGeo.rotateX(Math.PI / 2);

    const wallMat = createMat(0x0284c7, 0.35, 0.15); // rich textbook blue
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.userData = uWall;
    root.add(wallMesh);

    // 2. Perforation Plate Rim (端壁穿孔板) at top and bottom
    const perfMat = createMat(0x38bdf8, 0.25, 0.2);
    perfMat.transparent = true;
    perfMat.opacity = 0.9;

    const topPerf = new THREE.Mesh(new THREE.RingGeometry(rInner * 0.72, rOuter * 0.98, sides), perfMat);
    topPerf.rotation.x = -Math.PI / 2;
    topPerf.position.y = h * 0.5 + 0.01;
    topPerf.userData = uPerf;
    root.add(topPerf);

    const botPerf = new THREE.Mesh(new THREE.RingGeometry(rInner * 0.72, rOuter * 0.98, sides), perfMat);
    botPerf.rotation.x = Math.PI / 2;
    botPerf.position.y = -h * 0.5 - 0.01;
    botPerf.userData = uPerf;
    root.add(botPerf);

    // 3. Bordered Pits (具緣紋孔) along lateral facets
    const pitGroup = new THREE.Group();
    const pitBorderMat = createMat(0x0369a1, 0.4);
    const pitCenterMat = createMat(0x075985, 0.5);

    const pitFacetAngles = isCutaway ? [1.2, 2.3, 3.4, 4.5] : [0, 1.05, 2.09, 3.14, 4.19, 5.24];
    pitFacetAngles.forEach(ang => {
      const facetDist = (rOuter + rInner) * 0.5;
      for (let y = -h * 0.38; y <= h * 0.38; y += 1.6) {
        const pG = new THREE.Group();
        pG.position.set(facetDist * Math.cos(ang), y, facetDist * Math.sin(ang));
        pG.rotation.y = -ang + Math.PI / 2;

        const borderRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.22, 16), pitBorderMat);
        pG.add(borderRing);

        const pitLumen = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), pitCenterMat);
        pitLumen.position.z = -0.01;
        pG.add(pitLumen);

        pG.userData = uPits;
        borderRing.userData = uPits;
        pitLumen.userData = uPits;
        pitGroup.add(pG);
      }
    });
    root.add(pitGroup);

    // 4. Upward Transpiration Water Particles inside lumen
    if (options.flow !== false) {
      const pCount = 120;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      const pSpeeds = new Float32Array(pCount);

      for (let i = 0; i < pCount; i++) {
        const rad = Math.random() * (rInner * 0.75);
        const theta = Math.random() * Math.PI * 2;
        pPos[i * 3] = rad * Math.cos(theta);
        pPos[i * 3 + 1] = (Math.random() - 0.5) * h;
        pPos[i * 3 + 2] = rad * Math.sin(theta);
        pSpeeds[i] = 0.04 + Math.random() * 0.05;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

      const pMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.18,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(pGeo, pMat);
      points.userData = { isCellWaterFlow: true, speeds: pSpeeds, h: h, rMax: rInner * 0.75 };
      root.add(points);
    }

    // 5. 3D Anatomy Pins
    if (options.pins !== false) {
      const pinG = new THREE.Group();
      pinG.name = 'cell_pins';
      pinG.add(createAnatomyPin('木質化厚壁', 0x38bdf8, new THREE.Vector3(-rOuter - 0.35, 2.2, 0), uWall));
      pinG.add(createAnatomyPin('導管中空腔 (Lumen)', 0x0ea5e9, new THREE.Vector3(0, 0, 0.45), uLumen));
      pinG.add(createAnatomyPin('穿孔板 (Perforation)', 0x38bdf8, new THREE.Vector3(0, h * 0.5 + 0.6, 0), uPerf));
      pinG.add(createAnatomyPin('具緣紋孔 (Pits)', 0x0369a1, new THREE.Vector3(rOuter + 0.35, -1.8, 0), uPits));
      root.add(pinG);
    }

    // 6. Floating Badge "內"
    if (options.showBadge !== false) {
      const badgeInner = createCircleBadgeSprite('內', false);
      badgeInner.position.set(0, h * 0.5 + 1.15, 0);
      root.add(badgeInner);
    }

    return root;
  }

  /**
   * 韌皮部單一細胞 (篩管細胞 + 伴細胞)
   * 柱狀六角稜柱 + 端壁篩板(篩孔) + 伴細胞與活性細胞核 + 養分流粒子
   */
  function buildSingleCellPhloem(options = {}) {
    const root = new THREE.Group();
    root.name = 'cell_phloem_root';
    const h = 8.5;
    const rOuter = 1.2;
    const rInner = 0.88;
    const sides = 6;
    const isCutaway = options.cutaway !== false;

    const uWall = { type: 'cell_phloem', name: '篩管細胞初生壁 (Primary Wall)', plant: 'dicot' };
    const uSieve = { type: 'sieve_plate', name: '端壁篩板與篩孔 (Sieve Plate & Pores)', plant: 'dicot' };
    const uComp = { type: 'companion_cell', name: '伴細胞與細胞核 (Companion Cell & Nucleus)', plant: 'dicot' };

    // 1. Sieve Tube Polygonal Wall
    const shape = new THREE.Shape();
    const cutAngle = isCutaway ? (Math.PI * 2 / 3) : 0;
    const angleStart = cutAngle * 0.5;
    const angleEnd = Math.PI * 2 - cutAngle * 0.5;
    const numPts = isCutaway ? 5 : 6;

    if (!isCutaway) {
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = rOuter * Math.cos(a);
        const y = rOuter * Math.sin(a);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();

      const hole = new THREE.Path();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = rInner * Math.cos(a);
        const y = rInner * Math.sin(a);
        if (i === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      }
      hole.closePath();
      shape.holes.push(hole);
    } else {
      const outerPts = [];
      const innerPts = [];
      for (let i = 0; i <= numPts; i++) {
        const a = angleStart + (i / numPts) * (angleEnd - angleStart);
        outerPts.push(new THREE.Vector2(rOuter * Math.cos(a), rOuter * Math.sin(a)));
        innerPts.push(new THREE.Vector2(rInner * Math.cos(a), rInner * Math.sin(a)));
      }
      shape.moveTo(outerPts[0].x, outerPts[0].y);
      for (let i = 1; i < outerPts.length; i++) {
        shape.lineTo(outerPts[i].x, outerPts[i].y);
      }
      shape.lineTo(innerPts[innerPts.length - 1].x, innerPts[innerPts.length - 1].y);
      for (let i = innerPts.length - 2; i >= 0; i--) {
        shape.lineTo(innerPts[i].x, innerPts[i].y);
      }
      shape.closePath();
    }

    const extrudeSettings = { depth: h, bevelEnabled: false };
    const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    wallGeo.translate(0, 0, -h * 0.5);
    wallGeo.rotateX(Math.PI / 2);

    const wallMat = createMat(0xf59e0b, 0.4, 0.1); // Warm textbook orange/gold
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.userData = uWall;
    root.add(wallMesh);

    // 2. Sieve Plates (端壁篩板) with Sieve Pores (篩孔)
    function createSievePlateMesh(posY) {
      const pG = new THREE.Group();
      pG.position.y = posY;

      const plateMat = createMat(0xfbbf24, 0.35);
      plateMat.transparent = true;
      plateMat.opacity = 0.95;
      const plate = new THREE.Mesh(new THREE.CircleGeometry(rInner * 0.96, sides), plateMat);
      plate.rotation.x = -Math.PI / 2;
      pG.add(plate);

      // Sieve Pores pattern
      const poreMat = createMat(0x78350f, 0.6);
      const poreOffsets = [
        [0, 0], [0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28],
        [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2],
        [0.45, 0.2], [-0.45, 0.2], [0.45, -0.2], [-0.45, -0.2]
      ];
      poreOffsets.forEach(([px, pz]) => {
        const pore = new THREE.Mesh(new THREE.CircleGeometry(0.065, 8), poreMat);
        pore.rotation.x = -Math.PI / 2;
        pore.position.set(px, 0.005, pz);
        pG.add(pore);
      });

      pG.userData = uSieve;
      plate.userData = uSieve;
      return pG;
    }

    root.add(createSievePlateMesh(h * 0.5));
    root.add(createSievePlateMesh(0));
    root.add(createSievePlateMesh(-h * 0.5));

    // Cytoplasmic strands (細胞質聯絲)
    const strandMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h - 0.2, 6), strandMat);
      strand.position.set(0.3 * Math.cos(a), 0, 0.3 * Math.sin(a));
      strand.userData = uWall;
      root.add(strand);
    }

    // 3. Companion Cell (伴細胞) attached to flank
    const compGroup = new THREE.Group();
    const compRadius = 0.52;
    const compX = rOuter * 0.85 + compRadius * 0.85;
    compGroup.position.set(compX, 0, 0);

    const compGeo = new THREE.CylinderGeometry(compRadius, compRadius, h, 6);
    const compMat = createMat(0xd97706, 0.45, 0.05);
    const compMesh = new THREE.Mesh(compGeo, compMat);
    compMesh.userData = uComp;
    compGroup.add(compMesh);

    // Visible active Nucleus inside companion cell
    const nucMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x9f1239,
      roughness: 0.3
    });
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), nucMat);
    nucleus.scale.set(0.85, 1.4, 0.85);
    nucleus.position.set(0, 0.5, 0.22);
    nucleus.userData = uComp;
    compGroup.add(nucleus);

    const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), new THREE.MeshBasicMaterial({ color: 0x881337 }));
    nucleolus.position.set(0, 0.5, 0.35);
    nucleolus.userData = uComp;
    compGroup.add(nucleolus);

    root.add(compGroup);

    // 4. Nutrient Flow Particles
    if (options.flow !== false) {
      const pCount = 90;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      const pSpeeds = new Float32Array(pCount);

      for (let i = 0; i < pCount; i++) {
        const rad = Math.random() * (rInner * 0.72);
        const theta = Math.random() * Math.PI * 2;
        pPos[i * 3] = rad * Math.cos(theta);
        pPos[i * 3 + 1] = (Math.random() - 0.5) * h;
        pPos[i * 3 + 2] = rad * Math.sin(theta);

        //pSpeeds[i] = (i % 2 === 0 ? 1 : -1) * (0.02 + Math.random() * 0.03);
        pSpeeds[i] = (0.02 + Math.random() * 0.03);
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

      const pMat = new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.16,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(pGeo, pMat);
      points.userData = { 
        isCellPhloemFlow: true, 
        speeds: pSpeeds, 
        h: h, 
        rMax: rInner * 0.72,
        timer: 0,
        alternateDir: 1
      };
      root.add(points);
    }

    // 5. 3D Anatomy Pins
    if (options.pins !== false) {
      const pinG = new THREE.Group();
      pinG.name = 'cell_pins';
      pinG.add(createAnatomyPin('篩管細胞壁', 0xf59e0b, new THREE.Vector3(-rOuter - 0.35, 1.8, 0), uWall));
      pinG.add(createAnatomyPin('端壁篩板 (Sieve Plate)', 0xfbbf24, new THREE.Vector3(0, h * 0.5 + 0.6, 0), uSieve));
      pinG.add(createAnatomyPin('伴細胞與細胞核', 0xf43f5e, new THREE.Vector3(compX + 0.7, 0.5, 0), uComp));
      root.add(pinG);
    }

    // 6. Floating Badge "外"
    if (options.showBadge !== false) {
      const badgeOuter = createCircleBadgeSprite('外', true);
      badgeOuter.position.set(0, h * 0.5 + 1.15, 0);
      root.add(badgeOuter);
    }

    return root;
  }

  /**
   * 外·韌皮部 vs 內·木質部 組合對照視角 (完全重現教科書插圖)
   */
  function buildSingleCellPair(options = {}) {
    const root = new THREE.Group();
    root.name = 'cell_pair_root';

    // 1. Phloem cell on outer side (-X)
    const phloemGroup = buildSingleCellPhloem({ ...options, showBadge: false });
    phloemGroup.position.set(-1.8, 0, 0);
    root.add(phloemGroup);

    // 2. Xylem cell on inner side (+X)
    const xylemGroup = buildSingleCellXylem({ ...options, showBadge: false });
    xylemGroup.position.set(1.8, 0, 0);
    root.add(xylemGroup);

    // 3. Cambium interface between them
    const h = 8.5;
    const cambMat = createMat(COLORS.cambium, 0.3);
    const cambPlane = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 2.8), cambMat);
    cambPlane.position.set(0, 0, 0);
    cambPlane.userData = { type: 'cambium', name: '形成層界線 (Cambium Interface)', plant: 'dicot' };
    root.add(cambPlane);

    // 4. Floating Textbook Circular Badges: "外" and "內"
    const badgeOuter = createCircleBadgeSprite('外', true);
    badgeOuter.position.set(-1.8, h * 0.5 + 1.15, 0);
    root.add(badgeOuter);

    const badgeInner = createCircleBadgeSprite('內', false);
    badgeInner.position.set(1.8, h * 0.5 + 1.15, 0);
    root.add(badgeInner);

    return root;
  }

  // =========================================================================
  // VIEW MODE BUILDERS & GEOMETRY GENERATORS
  // =========================================================================

  /**
   * Mathematically exact top/bottom cap geometry matching CylinderGeometry angle & vertices
   */
  function createWedgeCapGeometry(rInner, rOuter, segments, thetaStart, thetaLength, isTop) {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const ny = isTop ? 1 : -1;

    if (rInner < 0.001) {
      // Solid sector / disc with center vertex at index 0
      positions.push(0, 0, 0);
      normals.push(0, ny, 0);
      uvs.push(0.5, 0.5);

      for (let i = 0; i <= segments; i++) {
        const a = thetaStart + (i / segments) * thetaLength;
        const sinA = Math.sin(a);
        const cosA = Math.cos(a);
        positions.push(rOuter * sinA, 0, rOuter * cosA);
        normals.push(0, ny, 0);
        uvs.push(0.5 + 0.5 * sinA, 0.5 + 0.5 * cosA);
      }

      for (let i = 0; i < segments; i++) {
        const v0 = 0;
        const v1 = i + 1;
        const v2 = i + 2;
        if (isTop) {
          indices.push(v0, v2, v1);
        } else {
          indices.push(v0, v1, v2);
        }
      }
    } else {
      // Annular sector with matching inner and outer rings
      for (let i = 0; i <= segments; i++) {
        const a = thetaStart + (i / segments) * thetaLength;
        const sinA = Math.sin(a);
        const cosA = Math.cos(a);

        positions.push(rInner * sinA, 0, rInner * cosA);
        normals.push(0, ny, 0);
        uvs.push(0.5 + 0.5 * (rOuter > 0 ? (rInner / rOuter) : 0) * sinA, 0.5 + 0.5 * (rOuter > 0 ? (rInner / rOuter) : 0) * cosA);

        positions.push(rOuter * sinA, 0, rOuter * cosA);
        normals.push(0, ny, 0);
        uvs.push(0.5 + 0.5 * sinA, 0.5 + 0.5 * cosA);
      }

      for (let i = 0; i < segments; i++) {
        const i0 = i * 2;
        const o0 = i * 2 + 1;
        const i1 = (i + 1) * 2;
        const o1 = (i + 1) * 2 + 1;

        if (isTop) {
          indices.push(i0, o1, o0);
          indices.push(i0, i1, o1);
        } else {
          indices.push(i0, o0, o1);
          indices.push(i0, i1, o1);
        }
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  /**
   * Mathematically exact vertical radial cut face connecting rInner and rOuter along cut angle
   */
  function createRadialCutFaceGeometry(rInner, rOuter, h, angle, isEnd) {
    const geo = new THREE.BufferGeometry();
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const halfH = (h - 0.005) * 0.5;

    const p0 = [rInner * sinA, -halfH, rInner * cosA];
    const p1 = [rOuter * sinA, -halfH, rOuter * cosA];
    const p2 = [rOuter * sinA,  halfH, rOuter * cosA];
    const p3 = [rInner * sinA,  halfH, rInner * cosA];

    let positions;
    if (isEnd) {
      positions = [
        ...p0, ...p2, ...p1,
        ...p0, ...p3, ...p2
      ];
    } else {
      positions = [
        ...p0, ...p1, ...p2,
        ...p0, ...p2, ...p3
      ];
    }

    const nx = isEnd ? -cosA : cosA;
    const nz = isEnd ? sinA : -sinA;
    const normals = [
      nx, 0, nz,  nx, 0, nz,  nx, 0, nz,
      nx, 0, nz,  nx, 0, nz,  nx, 0, nz
    ];

    const uvs = [
      0, 0,  1, 1,  1, 0,
      0, 0,  0, 1,  1, 1
    ];

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  /**
   * Physically sliced 3D extruded U-channel tube with tangible wall thickness,
   * flat wall cut edges on cut plane Z=0, hollow interior lumen recessing into Z<0,
   * and flush U-shaped cross-section rims at the top and bottom caps.
   */
  function createThickHalfPipeGeometry(rOuter, rInner, height, radialSegments = 12) {
    const shape = new THREE.Shape();
    shape.moveTo(-rOuter, 0);
    for (let i = 0; i <= radialSegments; i++) {
      const phi = -Math.PI * 0.5 + (i / radialSegments) * Math.PI;
      shape.lineTo(rOuter * Math.sin(phi), -rOuter * Math.cos(phi));
    }
    shape.lineTo(rInner, 0);
    for (let i = radialSegments; i >= 0; i--) {
      const phi = -Math.PI * 0.5 + (i / radialSegments) * Math.PI;
      shape.lineTo(rInner * Math.sin(phi), -rInner * Math.cos(phi));
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: radialSegments
    });
    geo.translate(0, 0, -height * 0.5);
    geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Semicircular dark opening hole ("頂端截面開洞") flush on top cap (normal +Y)
   */
  function createLumenHoleGeometry(rInner, segments = 12) {
    const shape = new THREE.Shape();
    shape.moveTo(-rInner * 0.98, 0);
    for (let i = 0; i <= segments; i++) {
      const phi = -Math.PI * 0.5 + (i / segments) * Math.PI;
      shape.lineTo(rInner * 0.98 * Math.sin(phi), rInner * 0.98 * Math.cos(phi));
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI * 0.5); // Normal is +Y, sits in Z <= 0
    return geo;
  }

  /**
   * 建立具備實體厚壁、深色內腔凹陷開洞、頂端開洞口、加厚環與篩板的縱切管狀細胞
   */
  function createSlicedConduitMesh(cfg) {
    const {
      rOuter, rInner, h,
      wallMat, darkLumenMat,
      isXylem = true,
      hasPits = false,
      hasCompanion = false,
      uData
    } = cfg;

    const rootMesh = new THREE.Mesh(createThickHalfPipeGeometry(rOuter, rInner, h - 0.01, 12), wallMat);
    rootMesh.userData = uData;

    // 1. 深色中空內腔襯壁 (讓管腔縱剖有深邃中空「開洞」感)
    const lumenGeo = new THREE.CylinderGeometry(rInner * 0.98, rInner * 0.98, h - 0.015, 12, 1, true, Math.PI * 0.5, Math.PI);
    const lumenMesh = new THREE.Mesh(lumenGeo, darkLumenMat);
    lumenMesh.position.set(0, 0, 0);
    lumenMesh.userData = uData;
    rootMesh.add(lumenMesh);

    // 2. 頂部截面實體開洞口 (Top Lumen Hole - 橫切面上清晰可見半圓中空洞口)
    const topHoleGeo = createLumenHoleGeometry(rInner, 12);
    const topHole = new THREE.Mesh(topHoleGeo, darkLumenMat);
    topHole.position.set(0, (h - 0.01) * 0.5 + 0.004, 0);
    topHole.userData = uData;
    rootMesh.add(topHole);

    // 底部開洞口
    const botHoleGeo = createLumenHoleGeometry(rInner, 12);
    botHoleGeo.rotateX(Math.PI);
    const botHole = new THREE.Mesh(botHoleGeo, darkLumenMat);
    botHole.position.set(0, -(h - 0.01) * 0.5 - 0.004, 0);
    botHole.userData = uData;
    rootMesh.add(botHole);

    // 3. 管腔內部特徵構造
    if (isXylem) {
      // 導管環紋/螺紋加厚環 (Annular / Spiral Rings inside cavity)
      const numRings = 6;
      for (let rIdx = 0; rIdx < numRings; rIdx++) {
        const yRing = (rIdx / (numRings - 1) - 0.5) * (h - 1.4);
        const ringGeo = new THREE.TorusGeometry(rInner * 0.88, 0.016, 6, 12, Math.PI);
        const ringMesh = new THREE.Mesh(ringGeo, createMat(0x38bdf8, 0.98));
        ringMesh.rotation.x = Math.PI * 0.5;
        ringMesh.position.set(0, yRing, -0.005);
        ringMesh.userData = uData;
        rootMesh.add(ringMesh);
      }
      if (hasPits) {
        [-1.8, 1.8].forEach(yPit => {
          const pit = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), createMat(0x02294f, 0.95));
          pit.position.set(0, yPit, -rInner * 0.88);
          pit.userData = uData;
          rootMesh.add(pit);
        });
      }
    } else {
      // 篩管橫向篩板 (Sieve Plates inside cavity)
      const plateYs = [-3.5, -1.2, 1.2, 3.5];
      plateYs.forEach(yP => {
        const sp = new THREE.Mesh(createLumenHoleGeometry(rInner * 0.96, 10), createMat(0xb45309, 0.98));
        sp.position.set(0, yP, 0);
        sp.userData = uData;
        rootMesh.add(sp);
      });
      if (hasCompanion) {
        const comp = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.8), createMat(0xfde68a, 0.95));
        comp.position.set(-rOuter * 0.95, 0.9, -0.005);
        comp.userData = { type: 'companion_cell', name: '伴細胞 (Companion Cell)', plant: 'dicot' };
        rootMesh.add(comp);
      }
    }

    return rootMesh;
  }

  /**
   * 1. 3D 楔切視角 (Wedge Cutaway):
   * 草本/第一年生雙子葉植物莖：環狀排列的8個離散橢圓形維管束 (外側韌皮部細胞束 + 內側木質部導管細胞束)
   * 包含髓心、束間薄壁組織、形成層環、皮層與表皮，並保留高突且標示「外」「內」的特寫細胞束！
   */
  /**
   * 建立雙子葉植物徑向剖切面上的縱切維管束構造 (實體 3D 縱剖管狀細胞群)
   * 真實立體厚壁 U 型縱切導管與篩管，中空腔深色凹陷（縱剖開洞），頂端清晰可見實體半圓開洞口！
   */
  function addDicotRadialCutBundle(targetRoot, angle, isEnd, h, xGroup, pGroup, cGroup) {
    // 剖切半管朝向：開口正對徑向剖切面，面向被剖開的空角
    const rotY = angle + (isEnd ? Math.PI * 0.5 : -Math.PI * 0.5);

    // 剖面法向量向外微偏（朝向切除空角，使 U 型管腔與開洞口立體凹陷完全暴露給鏡頭，不被背景遮蔽）
    const outX = isEnd ? Math.cos(angle) : -Math.cos(angle);
    const outZ = isEnd ? -Math.sin(angle) : Math.sin(angle);
    const offPop = 0.025;

    const xWallMat = createMat(0x0284c7, 0.9);
    const xDarkMat = createMat(0x023e5e, 0.96); // 深藍色導管內腔洞口
    const pWallMat = createMat(0xd97706, 0.85);
    const pDarkMat = createMat(0x6b2806, 0.96); // 深琥珀色篩管內腔洞口

    // 1. 木質部實體厚壁 U 型縱剖導管群 (原生細導管至後生大導管，管管皆具開洞)
    const vesselConfigs = [
      { rPos: 2.50, rOuter: 0.11, rInner: 0.07, name: '原生木質部細導管縱剖 (Protoxylem Vessel)', hasPits: false },
      { rPos: 2.74, rOuter: 0.14, rInner: 0.09, name: '原生木質部螺紋導管縱剖 (Protoxylem Spiral Vessel)', hasPits: false },
      { rPos: 3.02, rOuter: 0.17, rInner: 0.12, name: '後生木質部大型導管縱剖 (Metaxylem Vessel)', hasPits: true },
      { rPos: 3.32, rOuter: 0.19, rInner: 0.14, name: '木質部主導管縱剖 (Large Vessel Conduit)', hasPits: true }
    ];

    vesselConfigs.forEach(vc => {
      const posX = vc.rPos * Math.sin(angle) + outX * offPop;
      const posZ = vc.rPos * Math.cos(angle) + outZ * offPop;

      const pipeMesh = createSlicedConduitMesh({
        rOuter: vc.rOuter,
        rInner: vc.rInner,
        h,
        wallMat: xWallMat,
        darkLumenMat: xDarkMat,
        isXylem: true,
        hasPits: vc.hasPits,
        uData: { type: 'xylem', name: vc.name, plant: 'dicot' }
      });
      pipeMesh.position.set(posX, 0, posZ);
      pipeMesh.rotation.y = rotY;
      xGroup.add(pipeMesh);
    });

    // 2. 形成層縱剖線 (立體綠色界線): 半徑 r 在 3.55
    const cStripGeo = createRadialCutFaceGeometry(3.48, 3.62, h, angle, isEnd);
    const cStripMesh = new THREE.Mesh(cStripGeo, createMat(COLORS.cambium, 0.75));
    cStripMesh.position.set(outX * offPop, 0, outZ * offPop);
    cStripMesh.userData = { type: 'cambium', name: '形成層縱剖線 (Vascular Cambium Line)', plant: 'dicot' };
    cGroup.add(cStripMesh);

    // 3. 韌皮部實體厚壁 U 型縱剖篩管群 (長管狀篩管細胞，包含橫向篩板、伴細胞與開洞)
    const sieveConfigs = [
      { rPos: 3.76, rOuter: 0.15, rInner: 0.10, name: '主篩管長管狀細胞 (Major Sieve Tube)', hasComp: false },
      { rPos: 4.02, rOuter: 0.14, rInner: 0.09, name: '外側篩管與伴細胞 (Sieve Tube & Companion Cells)', hasComp: true },
      { rPos: 4.25, rOuter: 0.13, rInner: 0.08, name: '篩管細胞束縱剖 (Sieve Tube Column)', hasComp: false },
      { rPos: 4.42, rOuter: 0.11, rInner: 0.06, name: '厚壁維管束纖維鞘帽縱剖 (Bundle Sheath Fibers)', hasComp: false }
    ];

    sieveConfigs.forEach(sc => {
      const posX = sc.rPos * Math.sin(angle) + outX * offPop;
      const posZ = sc.rPos * Math.cos(angle) + outZ * offPop;

      const tubeMesh = createSlicedConduitMesh({
        rOuter: sc.rOuter,
        rInner: sc.rInner,
        h,
        wallMat: pWallMat,
        darkLumenMat: pDarkMat,
        isXylem: false,
        hasCompanion: sc.hasComp,
        uData: { type: 'phloem', name: sc.name, plant: 'dicot' }
      });
      tubeMesh.position.set(posX, 0, posZ);
      tubeMesh.rotation.y = rotY;
      pGroup.add(tubeMesh);
    });
  }

  /**
   * 建立單子葉植物徑向剖切面上的縱切散生維管束構造 (實體 3D 猴臉縱切管狀構造)
   * 包含立體厚壁維管束鞘、後生導管 (兩大眼)、原生導管腔 (口) 與韌皮部篩管 (額頭)
   */
  function addMonocotRadialCutBundles(targetRoot, angle, isEnd, h, bundlesGroup) {
    const rotY = angle + (isEnd ? Math.PI * 0.5 : -Math.PI * 0.5);
    const rOuter = STEM_RADIUS; // 5.0
    const bundleRadii = [1.15, 2.15, 3.15, 4.15];

    // 向外微偏使管腔立體洞口完全露出
    const outX = isEnd ? Math.cos(angle) : -Math.cos(angle);
    const outZ = isEnd ? -Math.sin(angle) : Math.sin(angle);
    const offPop = 0.025;

    const xWallMat = createMat(0x0284c7, 0.9);
    const xDarkMat = createMat(0x023e5e, 0.96);
    const pWallMat = createMat(0xd97706, 0.85);
    const pDarkMat = createMat(0x6b2806, 0.96);

    bundleRadii.forEach(r => {
      const distRatio = r / rOuter;
      const bw = 0.50 - distRatio * 0.16; // 0.50 near center, 0.36 near edge

      // A. 厚壁維管束鞘實體立體槽
      const sheathPosX = r * Math.sin(angle) + outX * offPop;
      const sheathPosZ = r * Math.cos(angle) + outZ * offPop;
      const sheathGeo = createThickHalfPipeGeometry(bw * 0.52, bw * 0.44, h - 0.01, 12);
      const sheathMesh = new THREE.Mesh(sheathGeo, createMat(COLORS.bundleSheath, 0.7));
      sheathMesh.position.set(sheathPosX, 0, sheathPosZ);
      sheathMesh.rotation.y = rotY;
      sheathMesh.userData = { type: 'bundles', name: '散生維管束鞘縱切 (Bundle Sheath)', plant: 'monocot' };
      bundlesGroup.add(sheathMesh);

      const vRad = bw * 0.20;

      // B. 後生木質部大型導管 (2個實體厚壁 U 型長管狀細胞 - 兩眼，具備頂端開洞)
      const vOffsets = [-bw * 0.16, bw * 0.16];
      vOffsets.forEach((vOff, vIdx) => {
        const vrPos = r + vOff;
        const posX = vrPos * Math.sin(angle) + outX * offPop;
        const posZ = vrPos * Math.cos(angle) + outZ * offPop;

        const vPipe = createSlicedConduitMesh({
          rOuter: vRad,
          rInner: vRad * 0.68,
          h,
          wallMat: xWallMat,
          darkLumenMat: xDarkMat,
          isXylem: true,
          hasPits: false,
          uData: { type: 'bundles', name: `後生木質部導管長管狀細胞 (${vIdx === 0 ? '內' : '外'}側)`, plant: 'monocot' }
        });
        vPipe.position.set(posX, 0, posZ);
        vPipe.rotation.y = rotY;
        bundlesGroup.add(vPipe);
      });

      // C. 原生木質部導管腔 (Protoxylem Lacuna 實體厚壁管狀空腔 - 口，具備頂端開洞)
      const pxPos = r - bw * 0.32;
      const pxPosX = pxPos * Math.sin(angle) + outX * offPop;
      const pxPosZ = pxPos * Math.cos(angle) + outZ * offPop;
      const pxRad = vRad * 0.78;
      const pxPipe = createSlicedConduitMesh({
        rOuter: pxRad,
        rInner: pxRad * 0.65,
        h,
        wallMat: xWallMat,
        darkLumenMat: xDarkMat,
        isXylem: true,
        hasPits: false,
        uData: { type: 'bundles', name: '原生導管腔長管狀細胞 (Protoxylem Lacuna)', plant: 'monocot' }
      });
      pxPipe.position.set(pxPosX, 0, pxPosZ);
      pxPipe.rotation.y = rotY;
      bundlesGroup.add(pxPipe);

      // D. 韌皮部篩管實體厚壁 U 型長管狀細胞 (額頭，具備橫向篩板與頂端開洞)
      const phPos = r + bw * 0.32;
      const phPosX = phPos * Math.sin(angle) + outX * offPop;
      const phPosZ = phPos * Math.cos(angle) + outZ * offPop;
      const phRad = vRad * 0.92;
      const phTube = createSlicedConduitMesh({
        rOuter: phRad,
        rInner: phRad * 0.68,
        h,
        wallMat: pWallMat,
        darkLumenMat: pDarkMat,
        isXylem: false,
        hasCompanion: false,
        uData: { type: 'bundles', name: '韌皮部篩管長管狀細胞 (Sieve Tube Column)', plant: 'monocot' }
      });
      phTube.position.set(phPosX, 0, phPosZ);
      phTube.rotation.y = rotY;
      bundlesGroup.add(phTube);
    });
  }

  /**
   * 1. 3D 楔切視角 (Wedge Cutaway):
   * 草本/第一年生雙子葉植物莖：環狀排列的8個離散橢圓形維管束 (長管狀細胞束)
   * 當開角剖開時，兩側徑向剖面完整展示縱切維管束構造 (長管狀導管與篩管細胞)！
   */
  function buildWedgeDicot(cutAngleDeg = 90) {
    const root = new THREE.Group();
    root.name = 'dicot_root';
    const h = STEM_HEIGHT;
    const thetaStart = 0;
    const thetaLength = Math.PI * 2 - (cutAngleDeg * Math.PI) / 180;

    function addLayer(rInner, rOuter, mat, uData, name, addCutFaces = true) {
      const g = new THREE.Group();
      g.name = name;
      g.userData = uData;

      // Curved outer wall
      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(rOuter, rOuter, h, 36, 1, true, thetaStart, thetaLength),
        mat
      );
      wall.userData = uData;
      g.add(wall);

      // Top Cap: perfectly matching CylinderGeometry start/end angles
      const topGeo = createWedgeCapGeometry(rInner, rOuter, 36, thetaStart, thetaLength, true);
      const topCap = new THREE.Mesh(topGeo, mat);
      topCap.position.y = h * 0.5 + 0.003;
      topCap.userData = uData;
      g.add(topCap);

      // Bottom Cap: perfectly matching CylinderGeometry start/end angles
      const botGeo = createWedgeCapGeometry(rInner, rOuter, 36, thetaStart, thetaLength, false);
      const botCap = new THREE.Mesh(botGeo, mat);
      botCap.position.y = -h * 0.5 - 0.003;
      botCap.userData = uData;
      g.add(botCap);

      // Radial cut faces: perfectly bridging rInner to rOuter at cut boundaries
      if (addCutFaces && thetaLength < Math.PI * 2 - 0.01) {
        const f1 = new THREE.Mesh(createRadialCutFaceGeometry(rInner, rOuter, h, thetaStart, false), mat);
        f1.userData = uData;
        g.add(f1);

        const f2 = new THREE.Mesh(createRadialCutFaceGeometry(rInner, rOuter, h, thetaStart + thetaLength, true), mat);
        f2.userData = uData;
        g.add(f2);
      }

      root.add(g);
      return g;
    }

    // 1. Central Pith (中央髓心薄壁組織)
    addLayer(0, DICOT_RADII.pith, createMat(COLORS.pith, 0.75), { type: 'pith', name: '髓 (Pith)', plant: 'dicot' }, 'layer_pith', true);

    // 2. Interfascicular Ground Tissue / Medullary Rays (髓射線與束間薄壁組織)
    addLayer(DICOT_RADII.pith, DICOT_RADII.cortexInner, createMat(0xfefce8, 0.5), { type: 'pith', name: '髓射線與薄壁組織 (Medullary Rays)', plant: 'dicot' }, 'layer_groundTissue', false);

    // 3. Vascular Cambium Ring (形成層環)
    addLayer(DICOT_RADII.cambiumInner, DICOT_RADII.cambiumOuter, createMat(COLORS.cambium, 0.45), { type: 'cambium', name: '形成層 (Vascular Cambium)', plant: 'dicot' }, 'layer_cambium', false);

    // 4. Cortex (皮層)
    addLayer(DICOT_RADII.cortexInner, DICOT_RADII.cortexOuter, createMat(COLORS.cortex, 0.6), { type: 'cortex', name: '皮層 (Cortex)', plant: 'dicot' }, 'layer_cortex', true);

    // 5. Bark / Epidermis (表皮與周皮)
    addLayer(DICOT_RADII.barkInner, DICOT_RADII.barkOuter, createMat(COLORS.bark, 0.85, 0, true), { type: 'bark', name: '表皮與周皮 (Epidermis & Periderm)', plant: 'dicot' }, 'layer_bark', true);

    // 6. 8 Discrete Oval Vascular Bundles (8個離散橢圓形維管束，由長管狀細胞構成)
    const xG = new THREE.Group();
    xG.name = 'layer_xylem';
    const pG = new THREE.Group();
    pG.name = 'layer_phloem';
    const cG = new THREE.Group();
    cG.name = 'layer_cambium';

    const baseR = DICOT_RADII.bundleCenter; // 3.55
    const pCellMat = createMat(COLORS.phloem, 0.45);
    const xCellMat = createMat(COLORS.xylem, 0.4);
    const fiberMat = createMat(COLORS.bundleSheath, 0.5);

    // Phloem cell offsets (7 hexagonal tubular cells forming outer oval)
    const phloemOffsets = [
      { dr: 0.26, dt: 0, r: 0.16 },
      { dr: 0.25, dt: 0.22, r: 0.15 },
      { dr: 0.25, dt: -0.22, r: 0.15 },
      { dr: 0.48, dt: 0.16, r: 0.14 },
      { dr: 0.48, dt: -0.16, r: 0.14 },
      { dr: 0.54, dt: 0, r: 0.15 },
      { dr: 0.72, dt: 0, r: 0.13 }
    ];

    // Xylem conduit cell offsets (10 hexagonal vessels forming inner wedge/oval pointing to pith)
    const xylemOffsets = [
      { dr: -0.30, dt: 0.22, r: 0.19 },
      { dr: -0.30, dt: -0.22, r: 0.19 },
      { dr: -0.32, dt: 0, r: 0.16 },
      { dr: -0.58, dt: 0.18, r: 0.16 },
      { dr: -0.58, dt: -0.18, r: 0.16 },
      { dr: -0.60, dt: 0, r: 0.15 },
      { dr: -0.84, dt: 0.12, r: 0.14 },
      { dr: -0.84, dt: -0.12, r: 0.14 },
      { dr: -0.86, dt: 0, r: 0.13 },
      { dr: -1.10, dt: 0, r: 0.11 }
    ];

    const numBundles = 8;
    for (let k = 0; k < numBundles; k++) {
      const theta_k = k * (Math.PI / 4);

      // Check visibility within wedge cut angle (bundles right on the cut planes are sliced by addDicotRadialCutBundle)
      if (thetaLength < Math.PI * 2 - 0.01) {
        if (theta_k < 0.05 || theta_k > thetaLength - 0.05) continue;
      }

      // Bundle k=3 (at 135° in the center of the remaining wedge) is elevated with "外" / "內" badges!
      const isElevated = (k === 3 && thetaLength > 4.0);
      const elevateH = isElevated ? 1.3 : 0;
      const cellH = h + elevateH;
      const yPos = isElevated ? elevateH * 0.5 : 0.005;

      // Outer Phloem Tubular Cells (長管狀細胞)
      phloemOffsets.forEach(off => {
        const posX = (baseR + off.dr) * Math.sin(theta_k) + off.dt * Math.cos(theta_k);
        const posZ = (baseR + off.dr) * Math.cos(theta_k) - off.dt * Math.sin(theta_k);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(off.r, off.r, cellH, 6), pCellMat);
        col.position.set(posX, yPos, posZ);
        col.rotation.y = -theta_k;
        col.userData = { type: 'phloem', name: '韌皮部篩管細胞 (長管狀細胞)', plant: 'dicot' };

        // 中空管腔頂端蓋 (Lumen Cap) 展現長管狀細胞特徵
        const lumenCap = new THREE.Mesh(new THREE.CircleGeometry(off.r * 0.70, 6), createMat(0x92400e, 0.85));
        lumenCap.rotation.x = -Math.PI / 2;
        lumenCap.position.y = cellH * 0.5 + 0.005;
        col.add(lumenCap);

        pG.add(col);
      });

      // Inner Xylem Vessel Tubular Cells (長管狀導管細胞)
      xylemOffsets.forEach(off => {
        const posX = (baseR + off.dr) * Math.sin(theta_k) + off.dt * Math.cos(theta_k);
        const posZ = (baseR + off.dr) * Math.cos(theta_k) - off.dt * Math.sin(theta_k);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(off.r, off.r, cellH, 6), xCellMat);
        col.position.set(posX, yPos, posZ);
        col.rotation.y = -theta_k;
        col.userData = { type: 'xylem', name: '木質部導管細胞 (長管狀導管)', plant: 'dicot' };

        // 中空管腔頂端蓋 (Lumen Cap) 展現長管狀導管特徵
        const lumenCap = new THREE.Mesh(new THREE.CircleGeometry(off.r * 0.72, 6), createMat(0x075985, 0.85));
        lumenCap.rotation.x = -Math.PI / 2;
        lumenCap.position.y = cellH * 0.5 + 0.005;
        col.add(lumenCap);

        xG.add(col);
      });

      // Protective Fiber Cap at outer tip
      const capPosX = (baseR + 0.86) * Math.sin(theta_k);
      const capPosZ = (baseR + 0.86) * Math.cos(theta_k);
      const fiberCol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, cellH, 6), fiberMat);
      fiberCol.position.set(capPosX, yPos, capPosZ);
      fiberCol.rotation.y = -theta_k;
      fiberCol.userData = { type: 'bundles', name: '厚壁維管束纖維鞘帽', plant: 'dicot' };

      const fLumenCap = new THREE.Mesh(new THREE.CircleGeometry(0.12 * 0.65, 6), createMat(0x312e81, 0.85));
      fLumenCap.rotation.x = -Math.PI / 2;
      fLumenCap.position.y = cellH * 0.5 + 0.005;
      fiberCol.add(fLumenCap);

      pG.add(fiberCol);

      // Elevated Bundle: Add "外" and "內" circular badges!
      if (isElevated) {
        const outR = baseR + 0.55;
        const inR = baseR - 0.65;
        const badgeOut = createCircleBadgeSprite('外', true);
        badgeOut.position.set(outR * Math.sin(theta_k), h * 0.5 + elevateH + 0.75, outR * Math.cos(theta_k));
        root.add(badgeOut);

        const badgeIn = createCircleBadgeSprite('內', false);
        badgeIn.position.set(inR * Math.sin(theta_k), h * 0.5 + elevateH + 0.75, inR * Math.cos(theta_k));
        root.add(badgeIn);
      }
    }

    // 7. 當開角剖開時 (cutAngleDeg > 0)，在兩側徑向剖面加上縱切維管束構造 (實體 3D 厚壁 U 型管狀細胞群)
    if (thetaLength < Math.PI * 2 - 0.01) {
      const rayMat = createMat(COLORS.pith, 0.85);
      // 髓射線薄壁組織縱切基底面 [2.25, 2.38] (僅在髓心邊緣與木質部之間填補狹縫，絕不阻擋縱剖導管腔)
      const rayF1 = new THREE.Mesh(createRadialCutFaceGeometry(2.25, 2.38, h, thetaStart, false), rayMat);
      rayF1.userData = { type: 'pith', name: '髓射線與束間組織 (Medullary Ray)', plant: 'dicot' };
      root.add(rayF1);

      const rayF2 = new THREE.Mesh(createRadialCutFaceGeometry(2.25, 2.38, h, thetaStart + thetaLength, true), rayMat);
      rayF2.userData = { type: 'pith', name: '髓射線與束間組織 (Medullary Ray)', plant: 'dicot' };
      root.add(rayF2);

      // 在兩側徑向剖面上加上實體厚壁 U 型縱切維管束長管狀細胞
      addDicotRadialCutBundle(root, thetaStart, false, h, xG, pG, cG);
      addDicotRadialCutBundle(root, thetaStart + thetaLength, true, h, xG, pG, cG);
    }

    root.add(xG);
    root.add(cG);
    root.add(pG);

    return root;
  }

  function buildWedgeMonocot(cutAngleDeg = 90) {
    const root = new THREE.Group();
    root.name = 'monocot_root';
    const h = STEM_HEIGHT;
    const rOuter = STEM_RADIUS;
    const thetaStart = 0;
    const thetaLength = Math.PI * 2 - (cutAngleDeg * Math.PI) / 180;

    function addLayer(rInner, rOut, mat, uData, name, addCutFaces = true) {
      const g = new THREE.Group();
      g.name = name;
      g.userData = uData;

      const wall = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, h, 36, 1, true, thetaStart, thetaLength), mat);
      wall.userData = uData;
      g.add(wall);

      // Top Cap: perfectly matching CylinderGeometry start/end angles
      const topGeo = createWedgeCapGeometry(rInner, rOut, 36, thetaStart, thetaLength, true);
      const topCap = new THREE.Mesh(topGeo, mat);
      topCap.position.y = h * 0.5 + 0.003;
      topCap.userData = uData;
      g.add(topCap);

      // Bottom Cap: perfectly matching CylinderGeometry start/end angles
      const botGeo = createWedgeCapGeometry(rInner, rOut, 36, thetaStart, thetaLength, false);
      const botCap = new THREE.Mesh(botGeo, mat);
      botCap.position.y = -h * 0.5 - 0.003;
      botCap.userData = uData;
      g.add(botCap);

      if (addCutFaces && thetaLength < Math.PI * 2 - 0.01) {
        const f1 = new THREE.Mesh(createRadialCutFaceGeometry(rInner, rOut, h, thetaStart, false), mat);
        f1.userData = uData;
        g.add(f1);

        const f2 = new THREE.Mesh(createRadialCutFaceGeometry(rInner, rOut, h, thetaStart + thetaLength, true), mat);
        f2.userData = uData;
        g.add(f2);
      }

      root.add(g);
      return g;
    }

    // 1. 基本組織 (壁與頂底蓋，徑向剖面另外精密生成帶有縱切維管束的區段)
    addLayer(0, rOuter - 0.25, createMat(COLORS.groundTissue, 0.65), { type: 'groundTissue', name: '基本組織 (Ground Tissue)', plant: 'monocot' }, 'layer_groundTissue', false);
    // 2. 表皮與下皮
    addLayer(rOuter - 0.25, rOuter, createMat(COLORS.epidermis, 0.5), { type: 'epidermis', name: '表皮與下皮 (Epidermis & Hypodermis)', plant: 'monocot' }, 'layer_epidermis', true);

    // Scattered Bundles (散生維管束 - 長管狀細胞)
    const bundlesG = new THREE.Group();
    bundlesG.name = 'layer_scatteredBundles';
    const count = 68;
    const sMat = createMat(COLORS.bundleSheath, 0.4);
    const xMat = createMat(COLORS.xylem, 0.35);
    const pMat = createMat(COLORS.phloem, 0.4);

    for (let i = 0; i < count; i++) {
      const phi = i * 2.399963;
      const normR = Math.sqrt((i + 1) / count);
      const r = 0.4 + normR * (rOuter - 0.65);
      const angle = phi % (Math.PI * 2);
      // Safety margin away from radial cut faces to completely prevent coplanar collision
      if (angle < 0.08 || angle > thetaLength - 0.08) continue;

      const col = new THREE.Group();
      col.position.set(r * Math.sin(angle), 0, r * Math.cos(angle));
      col.rotation.y = angle;

      const bScale = 0.16 + (1 - normR) * 0.15;
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(bScale * 1.1, bScale * 1.1, h, 12), sMat);
      sh.userData = { type: 'bundles', name: '散生維管束 (Monkey Face)', plant: 'monocot' };
      col.add(sh);

      // Monkey face organs with tubular hollow lumen end-caps (長管狀導管與篩管細胞)
      const eyeGeo = new THREE.CylinderGeometry(bScale * 0.32, bScale * 0.32, h + 0.01, 10);
      const eyeL = new THREE.Mesh(eyeGeo, xMat);
      eyeL.position.set(-bScale * 0.45, 0, -bScale * 0.05);
      const eyeLCap = new THREE.Mesh(new THREE.CircleGeometry(bScale * 0.24, 10), createMat(0x075985, 0.85));
      eyeLCap.rotation.x = -Math.PI / 2;
      eyeLCap.position.y = (h + 0.01) * 0.5 + 0.005;
      eyeL.add(eyeLCap);
      eyeL.userData = { type: 'bundles', name: '後生導管長管狀細胞 (左眼)', plant: 'monocot' };
      col.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, xMat);
      eyeR.position.set(bScale * 0.45, 0, -bScale * 0.05);
      const eyeRCap = new THREE.Mesh(new THREE.CircleGeometry(bScale * 0.24, 10), createMat(0x075985, 0.85));
      eyeRCap.rotation.x = -Math.PI / 2;
      eyeRCap.position.y = (h + 0.01) * 0.5 + 0.005;
      eyeR.add(eyeRCap);
      eyeR.userData = { type: 'bundles', name: '後生導管長管狀細胞 (右眼)', plant: 'monocot' };
      col.add(eyeR);

      const mouth = new THREE.Mesh(new THREE.CylinderGeometry(bScale * 0.28, bScale * 0.28, h + 0.01, 10), xMat);
      mouth.position.set(0, 0, -bScale * 0.55);
      const mouthCap = new THREE.Mesh(new THREE.CircleGeometry(bScale * 0.20, 10), createMat(0x075985, 0.85));
      mouthCap.rotation.x = -Math.PI / 2;
      mouthCap.position.y = (h + 0.01) * 0.5 + 0.005;
      mouth.add(mouthCap);
      mouth.userData = { type: 'bundles', name: '原生木質部導管腔長管狀細胞', plant: 'monocot' };
      col.add(mouth);

      const ph = new THREE.Mesh(new THREE.CylinderGeometry(bScale * 0.48, bScale * 0.48, h + 0.01, 10), pMat);
      ph.position.set(0, 0, bScale * 0.45);
      const phCap = new THREE.Mesh(new THREE.CircleGeometry(bScale * 0.36, 10), createMat(0x92400e, 0.85));
      phCap.rotation.x = -Math.PI / 2;
      phCap.position.y = (h + 0.01) * 0.5 + 0.005;
      ph.add(phCap);
      ph.userData = { type: 'bundles', name: '韌皮部篩管長管狀細胞 (額頭)', plant: 'monocot' };
      col.add(ph);

      bundlesG.add(col);
    }

    // 當開角剖開時 (cutAngleDeg > 0)，在兩側徑向剖面上生成基本組織縱切面與實體 3D 縱切散生維管束
    if (thetaLength < Math.PI * 2 - 0.01) {
      const gtMat = createMat(COLORS.groundTissue, 0.65);
      const g1 = new THREE.Mesh(createRadialCutFaceGeometry(0, rOuter - 0.25, h, thetaStart, false), gtMat);
      g1.userData = { type: 'groundTissue', name: '基本組織縱切面 (Ground Tissue)', plant: 'monocot' };
      root.add(g1);

      const g2 = new THREE.Mesh(createRadialCutFaceGeometry(0, rOuter - 0.25, h, thetaStart + thetaLength, true), gtMat);
      g2.userData = { type: 'groundTissue', name: '基本組織縱切面 (Ground Tissue)', plant: 'monocot' };
      root.add(g2);

      // 在兩側徑向剖面上加上實體厚壁 U 型縱切散生維管束 (長管狀導管與篩管)
      addMonocotRadialCutBundles(root, thetaStart, false, h, bundlesG);
      addMonocotRadialCutBundles(root, thetaStart + thetaLength, true, h, bundlesG);
    }

    root.add(bundlesG);

    return root;
  }

  /**
   * 2. 橫切面視角 (Cross Section View):
   * 完美的 360° 完整圓盤切片，同心環紋理如教科書插圖
   */
  function buildCrossDicot() {
    return buildWedgeDicot(0); // 0度剖開 = 360度完整圓柱
  }

  function buildCrossMonocot() {
    return buildWedgeMonocot(0);
  }

  /**
   * 3. 縱切面視角 (Longitudinal Section View):
   * 實體平整縱切面正對鏡頭（Z=0 平面），向後延伸半圓柱（Z <= 0）。
   * 鏡頭正對前方 (0, 0, 22)，無任何外部樹皮阻擋，對稱完整展示內部所有層次！
   */
  function buildLongitudinalDicot() {
    const root = new THREE.Group();
    root.name = 'dicot_root';
    const h = STEM_HEIGHT;

    // Helper: Add Longitudinal Tissue Layer in Z <= 0
    function addLongitudinalLayer(rInner, rOut, mat, uData, name) {
      const g = new THREE.Group();
      g.name = name;
      g.userData = uData;

      // Half Cylinder Wall in Z <= 0 (theta from PI/2 to 3*PI/2)
      const halfWall = new THREE.Mesh(
        new THREE.CylinderGeometry(rOut, rOut, h, 64, 1, true, Math.PI * 0.5, Math.PI),
        mat
      );
      halfWall.userData = uData;
      g.add(halfWall);

      // Top and Bottom Semi-Circle Caps matching exact thetaStart (PI/2) and thetaLength (PI)
      const topGeo = createWedgeCapGeometry(rInner, rOut, 64, Math.PI * 0.5, Math.PI, true);
      const topCap = new THREE.Mesh(topGeo, mat);
      topCap.position.y = h * 0.5 + 0.003;
      topCap.userData = uData;
      g.add(topCap);

      const botGeo = createWedgeCapGeometry(rInner, rOut, 64, Math.PI * 0.5, Math.PI, false);
      const botCap = new THREE.Mesh(botGeo, mat);
      botCap.position.y = -h * 0.5 - 0.003;
      botCap.userData = uData;
      g.add(botCap);

      root.add(g);
      return g;
    }

    // 1. Semi-cylinder background tissues in Z <= 0
    addLongitudinalLayer(0, DICOT_RADII.pith, createMat(COLORS.pith, 0.75), { type: 'pith', name: '髓 (Pith)', plant: 'dicot' }, 'layer_pith');
    addLongitudinalLayer(DICOT_RADII.pith, DICOT_RADII.cortexInner, createMat(0xfefce8, 0.45), { type: 'pith', name: '髓射線與薄壁組織', plant: 'dicot' }, 'layer_groundTissue');
    addLongitudinalLayer(DICOT_RADII.cambiumInner, DICOT_RADII.cambiumOuter, createMat(COLORS.cambium, 0.45), { type: 'cambium', name: '形成層 (Cambium)', plant: 'dicot' }, 'layer_cambium');
    addLongitudinalLayer(DICOT_RADII.cortexInner, DICOT_RADII.cortexOuter, createMat(COLORS.cortex, 0.6), { type: 'cortex', name: '皮層 (Cortex)', plant: 'dicot' }, 'layer_cortex');
    addLongitudinalLayer(DICOT_RADII.barkInner, DICOT_RADII.barkOuter, createMat(COLORS.bark, 0.85, 0, true), { type: 'bark', name: '樹皮 / 周皮 (Bark)', plant: 'dicot' }, 'layer_bark');

    // 2. 3 Background Intact 3D Vascular Bundles in Z < 0 (at 135°, 180°, 225°)
    const bgBundleGroup = new THREE.Group();
    bgBundleGroup.name = 'bg_vascular_bundles';
    const bgAngles = [3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4];
    const baseR = DICOT_RADII.bundleCenter; // 3.55
    const pMat = createMat(COLORS.phloem, 0.45);
    const xMat = createMat(COLORS.xylem, 0.4);

    bgAngles.forEach(ang => {
      // 7 Phloem cells (長管狀篩管細胞)
      for (let c = 0; c < 7; c++) {
        const rad = baseR + 0.35 + (c % 2) * 0.22;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, h - 0.02, 6), pMat);
        col.position.set(rad * Math.sin(ang) + (c - 3) * 0.04 * Math.cos(ang), 0, rad * Math.cos(ang) - (c - 3) * 0.04 * Math.sin(ang));
        col.rotation.y = -ang;
        col.userData = { type: 'phloem', name: '韌皮部細胞束 (長管狀細胞)', plant: 'dicot' };

        const pCap = new THREE.Mesh(new THREE.CircleGeometry(0.14 * 0.70, 6), createMat(0x92400e, 0.85));
        pCap.rotation.x = -Math.PI / 2;
        pCap.position.y = (h - 0.02) * 0.5 + 0.005;
        col.add(pCap);

        bgBundleGroup.add(col);
      }
      // 9 Xylem conduit cells (長管狀導管細胞)
      for (let c = 0; c < 9; c++) {
        const rad = baseR - 0.45 - (c % 2) * 0.24;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h - 0.02, 6), xMat);
        col.position.set(rad * Math.sin(ang) + (c - 4) * 0.04 * Math.cos(ang), 0, rad * Math.cos(ang) - (c - 4) * 0.04 * Math.sin(ang));
        col.rotation.y = -ang;
        col.userData = { type: 'xylem', name: '木質部導管細胞束 (長管狀導管)', plant: 'dicot' };

        const xCap = new THREE.Mesh(new THREE.CircleGeometry(0.16 * 0.72, 6), createMat(0x075985, 0.85));
        xCap.rotation.x = -Math.PI / 2;
        xCap.position.y = (h - 0.02) * 0.5 + 0.005;
        col.add(xCap);

        bgBundleGroup.add(col);
      }
    });
    root.add(bgBundleGroup);

    // 3. FRONT FLAT CUT FACE (Z = 0) WITH HIGH-DETAIL SLICED VASCULAR CONDUITS!
    // Pith central slab: [-2.25, 2.25]
    const pithSlab = new THREE.Mesh(new THREE.PlaneGeometry(DICOT_RADII.pith * 2, h), createMat(COLORS.pith, 0.75));
    pithSlab.position.set(0, 0, 0);
    pithSlab.userData = { type: 'pith', name: '髓心縱剖面 (Central Pith Parenchyma)', plant: 'dicot' };
    root.add(pithSlab);

    // Medullary rays (ground tissue) between pith and cortex: [2.25, 4.45] and [-4.45, -2.25]
    const rayW = DICOT_RADII.cortexInner - DICOT_RADII.pith; // 4.45 - 2.25 = 2.20
    const rayMidX = (DICOT_RADII.pith + DICOT_RADII.cortexInner) * 0.5; // 3.35
    [-1, 1].forEach(side => {
      const raySlab = new THREE.Mesh(new THREE.PlaneGeometry(rayW, h), createMat(COLORS.pith, 0.85));
      raySlab.position.set(side * rayMidX, 0, 0);
      raySlab.userData = { type: 'pith', name: '髓射線與束間薄壁組織 (Medullary Ray)', plant: 'dicot' };
      root.add(raySlab);
    });

    // Cortex slabs: [4.45, 4.78] and [-4.78, -4.45]
    const cortexW = DICOT_RADII.cortexOuter - DICOT_RADII.cortexInner; // 0.33
    const cortexMidX = (DICOT_RADII.cortexInner + DICOT_RADII.cortexOuter) * 0.5; // 4.615
    [-1, 1].forEach(side => {
      const cSlab = new THREE.Mesh(new THREE.PlaneGeometry(cortexW, h), createMat(COLORS.cortex, 0.6));
      cSlab.position.set(side * cortexMidX, 0, 0);
      cSlab.userData = { type: 'cortex', name: '皮層縱切面 (Cortex)', plant: 'dicot' };
      root.add(cSlab);
    });

    // Bark slabs: [4.78, 5.05] and [-5.05, -4.78]
    const barkW = DICOT_RADII.barkOuter - DICOT_RADII.barkInner; // 0.27
    const barkMidX = (DICOT_RADII.barkInner + DICOT_RADII.barkOuter) * 0.5; // 4.915
    [-1, 1].forEach(side => {
      const bSlab = new THREE.Mesh(new THREE.PlaneGeometry(barkW, h), createMat(COLORS.bark, 0.85, 0, true));
      bSlab.position.set(side * barkMidX, 0, 0);
      bSlab.userData = { type: 'bark', name: '樹皮/表皮縱切面 (Bark & Epidermis)', plant: 'dicot' };
      root.add(bSlab);
    });

    // Symmetrical Sliced Vascular Bundles on cut face at |X| in [2.45, 4.45]:
    const xG = new THREE.Group();
    xG.name = 'layer_xylem';
    const pG = new THREE.Group();
    pG.name = 'layer_phloem';
    const cG = new THREE.Group();
    cG.name = 'layer_cambium';

    const xWallMat = createMat(0x0284c7, 0.9);
    const xDarkMat = createMat(0x023e5e, 0.96);
    const pWallMat = createMat(0xd97706, 0.85);
    const pDarkMat = createMat(0x6b2806, 0.96);

    [-1, 1].forEach(side => {
      // 1. 木質部實體厚壁 U 型縱剖導管群 (原生細導管至後生主導管，管管皆具開洞口與深凹腔)
      const vesselConfigs = [
        { xOff: 2.50, rOuter: 0.11, rInner: 0.07, name: '原生木質部細導管縱剖 (Protoxylem Vessel)', hasPits: false },
        { xOff: 2.74, rOuter: 0.14, rInner: 0.09, name: '原生木質部螺紋導管縱剖 (Protoxylem Spiral Vessel)', hasPits: false },
        { xOff: 3.02, rOuter: 0.17, rInner: 0.12, name: '後生木質部大型導管縱剖 (Metaxylem Vessel)', hasPits: true },
        { xOff: 3.32, rOuter: 0.19, rInner: 0.14, name: '木質部主導管縱剖 (Large Vessel Conduit)', hasPits: true }
      ];

      vesselConfigs.forEach(vc => {
        const posX = side * vc.xOff;
        const pipeMesh = createSlicedConduitMesh({
          rOuter: vc.rOuter,
          rInner: vc.rInner,
          h,
          wallMat: xWallMat,
          darkLumenMat: xDarkMat,
          isXylem: true,
          hasPits: vc.hasPits,
          uData: { type: 'xylem', name: vc.name, plant: 'dicot' }
        });
        pipeMesh.position.set(posX, 0, 0);
        xG.add(pipeMesh);
      });

      // 2. Vascular Cambium Line: |X| in 3.55
      const cambiumW = 0.14;
      const cambiumMidX = side * 3.55;
      const cStrip = new THREE.Mesh(new THREE.PlaneGeometry(cambiumW, h), createMat(COLORS.cambium, 0.75));
      cStrip.position.set(cambiumMidX, 0, 0.001);
      cStrip.userData = { type: 'cambium', name: '形成層縱剖線 (Vascular Cambium Line)', plant: 'dicot' };
      cG.add(cStrip);

      // 3. 韌皮部實體厚壁 U 型縱剖篩管群 (長管狀篩管細胞，具備橫向篩板、伴細胞與開洞口)
      const sieveConfigs = [
        { xOff: 3.76, rOuter: 0.15, rInner: 0.10, name: '主篩管長管狀細胞 (Major Sieve Tube)', hasComp: false },
        { xOff: 4.02, rOuter: 0.14, rInner: 0.09, name: '外側篩管與伴細胞 (Sieve Tube & Companion Cells)', hasComp: true },
        { xOff: 4.25, rOuter: 0.13, rInner: 0.08, name: '篩管細胞束縱剖 (Sieve Tube Column)', hasComp: false },
        { xOff: 4.42, rOuter: 0.11, rInner: 0.06, name: '厚壁維管束纖維鞘帽縱剖 (Bundle Sheath Fibers)', hasComp: false }
      ];

      sieveConfigs.forEach(sc => {
        const posX = side * sc.xOff;
        const tubeMesh = createSlicedConduitMesh({
          rOuter: sc.rOuter,
          rInner: sc.rInner,
          h,
          wallMat: pWallMat,
          darkLumenMat: pDarkMat,
          isXylem: false,
          hasCompanion: sc.hasComp,
          uData: { type: 'phloem', name: sc.name, plant: 'dicot' }
        });
        tubeMesh.position.set(posX, 0, 0);
        pG.add(tubeMesh);
      });
    });

    root.add(xG);
    root.add(cG);
    root.add(pG);

    return root;
  }

  function buildLongitudinalMonocot() {
    const root = new THREE.Group();
    root.name = 'monocot_root';
    const h = STEM_HEIGHT;
    const rOuter = STEM_RADIUS;

    function addLongitudinalLayer(rInner, rOut, mat, uData, name) {
      const g = new THREE.Group();
      g.name = name;
      g.userData = uData;

      const halfWall = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, h, 64, 1, true, Math.PI * 0.5, Math.PI), mat);
      halfWall.userData = uData;
      g.add(halfWall);

      const topGeo = createWedgeCapGeometry(rInner, rOut, 64, Math.PI * 0.5, Math.PI, true);
      const topCap = new THREE.Mesh(topGeo, mat);
      topCap.position.y = h * 0.5 + 0.003;
      topCap.userData = uData;
      g.add(topCap);

      const botGeo = createWedgeCapGeometry(rInner, rOut, 64, Math.PI * 0.5, Math.PI, false);
      const botCap = new THREE.Mesh(botGeo, mat);
      botCap.position.y = -h * 0.5 - 0.003;
      botCap.userData = uData;
      g.add(botCap);

      root.add(g);
      return g;
    }

    // 1. Semi-cylinder Background Tissues in Z <= 0
    addLongitudinalLayer(0, rOuter - 0.25, createMat(COLORS.groundTissue, 0.65), { type: 'groundTissue', name: '基本組織 (Ground Tissue)', plant: 'monocot' }, 'layer_groundTissue');
    addLongitudinalLayer(rOuter - 0.25, rOuter, createMat(COLORS.epidermis, 0.5), { type: 'epidermis', name: '表皮與下皮 (Epidermis & Hypodermis)', plant: 'monocot' }, 'layer_epidermis');

    // 2. Background scattered bundle pipes running through ground tissue in Z < 0
    const bundlesG = new THREE.Group();
    bundlesG.name = 'layer_scatteredBundles';
    const count = 18;
    const sMat = createMat(COLORS.bundleSheath, 0.4);
    const xMat = createMat(COLORS.xylem, 0.35);

    for (let i = 0; i < count; i++) {
      const isRight = i % 2 === 0;
      const frac = (Math.floor(i / 2) + 0.4) / (count / 2);
      const posX = (isRight ? 1 : -1) * (0.6 + frac * (rOuter - 1.4));
      const posZ = -0.35 - Math.random() * (Math.sqrt(Math.max(0, rOuter * rOuter - posX * posX)) * 0.8);

      const bScale = 0.18 + (1 - frac) * 0.12;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(bScale, bScale, h, 14), sMat);
      pipe.position.set(posX, 0, posZ);
      pipe.userData = { type: 'bundles', name: '散生維管束 (縱向柱體)', plant: 'monocot' };
      bundlesG.add(pipe);

      const innerV = new THREE.Mesh(new THREE.CylinderGeometry(bScale * 0.45, bScale * 0.45, h + 0.02, 10), xMat);
      innerV.position.set(posX, 0, posZ);
      innerV.userData = { type: 'bundles', name: '散生維管束長管狀導管', plant: 'monocot' };

      const vCap = new THREE.Mesh(new THREE.CircleGeometry(bScale * 0.35, 10), createMat(0x075985, 0.85));
      vCap.rotation.x = -Math.PI / 2;
      vCap.position.y = (h + 0.02) * 0.5 + 0.005;
      innerV.add(vCap);

      bundlesG.add(innerV);
    }
    root.add(bundlesG);

    // 3. FRONT FLAT CUT FACE (Z = 0) WITH EXPOSED MONKEY-FACE BUNDLE LONGITUDINAL SECTIONS!
    // Ground tissue base slab
    const groundSlab = new THREE.Mesh(new THREE.PlaneGeometry((rOuter - 0.25) * 2, h), createMat(COLORS.groundTissue, 0.65));
    groundSlab.position.set(0, 0, 0);
    groundSlab.userData = { type: 'groundTissue', name: '基本組織縱切面 (Ground Tissue)', plant: 'monocot' };
    root.add(groundSlab);

    // Epidermis left/right strips
    [-1, 1].forEach(side => {
      const epiStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.25, h), createMat(COLORS.epidermis, 0.65));
      epiStrip.position.set(side * (rOuter - 0.125), 0, 0.001);
      epiStrip.userData = { type: 'epidermis', name: '表皮縱切面 (Epidermis)', plant: 'monocot' };
      root.add(epiStrip);
    });

    // Sliced Vascular Bundles distributed along the cut face:
    // Bundles near center are larger with wider vessel pipes; bundles near edge are denser and narrower
    const cutBundleX = [0.85, 1.95, 3.05, 4.10, -0.85, -1.95, -3.05, -4.10];
    const cutBundlesGroup = new THREE.Group();
    cutBundlesGroup.name = 'layer_cutBundles';

    const xWallMat = createMat(0x0284c7, 0.9);
    const xDarkMat = createMat(0x023e5e, 0.96);
    const pWallMat = createMat(0xd97706, 0.85);
    const pDarkMat = createMat(0x6b2806, 0.96);

    cutBundleX.forEach(bx => {
      const distRatio = Math.abs(bx) / rOuter;
      const bw = 0.52 - distRatio * 0.18; // 0.52 near center, 0.34 near edge
      const vRadius = bw * 0.20; // Metaxylem vessel radius

      // A. Protective Bundle Sheath 3D U-trough
      const sheathGeo = createThickHalfPipeGeometry(bw * 0.52, bw * 0.44, h - 0.01, 16);
      const sheathMesh = new THREE.Mesh(sheathGeo, createMat(COLORS.bundleSheath, 0.65));
      sheathMesh.position.set(bx, 0, 0.01);
      sheathMesh.userData = { type: 'bundles', name: '單子葉散生維管束鞘縱切 (Bundle Sheath)', plant: 'monocot' };
      cutBundlesGroup.add(sheathMesh);

      // B. Two Metaxylem Vessel conduits (猴臉兩大眼睛實體厚壁 U 型縱切導管，深邃凹腔與頂部開洞口)
      [-1, 1].forEach(eyeSide => {
        const vPosX = bx + eyeSide * (bw * 0.24);
        const vPipe = createSlicedConduitMesh({
          rOuter: vRadius,
          rInner: vRadius * 0.68,
          h,
          wallMat: xWallMat,
          darkLumenMat: xDarkMat,
          isXylem: true,
          hasPits: false,
          uData: { type: 'bundles', name: '後生導管縱切管道 (Metaxylem Vessel Conduit)', plant: 'monocot' }
        });
        vPipe.position.set(vPosX, 0, 0.02);
        cutBundlesGroup.add(vPipe);
      });

      // C. Protoxylem Lacuna (原生木質部腔隙/氣室實體厚壁 U 型縱剖 - 口，深邃凹腔與頂部開洞口)
      const lacunaR = bw * 0.16;
      const lacunaPipe = createSlicedConduitMesh({
        rOuter: lacunaR,
        rInner: lacunaR * 0.65,
        h,
        wallMat: xWallMat,
        darkLumenMat: xDarkMat,
        isXylem: true,
        hasPits: false,
        uData: { type: 'bundles', name: '原生木質部腔隙 (Protoxylem Lacuna)', plant: 'monocot' }
      });
      lacunaPipe.position.set(bx, 0, 0.02);
      cutBundlesGroup.add(lacunaPipe);

      // D. Phloem Sieve Strand (韌皮部篩管束實體厚壁 U 型縱切，具備橫向篩板與頂部開洞口 - 額頭)
      const phloemR = bw * 0.18;
      const phloemPosX = bx + (bx > 0 ? bw * 0.18 : -bw * 0.18);
      const phPipe = createSlicedConduitMesh({
        rOuter: phloemR,
        rInner: phloemR * 0.68,
        h,
        wallMat: pWallMat,
        darkLumenMat: pDarkMat,
        isXylem: false,
        hasCompanion: true,
        uData: { type: 'bundles', name: '韌皮部篩管縱剖 (Phloem Sieve Strand)', plant: 'monocot' }
      });
      phPipe.position.set(phloemPosX, 0, 0.02);
      cutBundlesGroup.add(phPipe);
    });

    root.add(cutBundlesGroup);

    return root;
  }

  // =========================================================================
  // MICROSCOPE ZOOM: HIGH-DETAIL MONKEY-FACE BUNDLE (單一維管束顯微特寫)
  // =========================================================================

  function buildMicroscopeBundle() {
    const root = new THREE.Group();
    root.name = 'microscope_bundle_root';

    const h = 8.0;
    const scale = 3.6;

    // 1. Thick-walled Bundle Sheath (厚壁維管束鞘)
    const sheathGeo = new THREE.CylinderGeometry(scale * 0.95, scale * 0.95, h, 36);
    sheathGeo.scale(1.1, 1, 1.3);
    const sheathMat = createMat(COLORS.bundleSheath, 0.4, 0.1);
    const sheathMesh = new THREE.Mesh(sheathGeo, sheathMat);
    sheathMesh.userData = { type: 'bundles', name: '厚壁維管束鞘 (Bundle Sheath)', plant: 'monocot' };
    root.add(sheathMesh);

    // 2. Metaxylem Vessels (後生導管 - 兩大眼睛)
    const vesselR = scale * 0.32;
    const vesselWallMat = createMat(0x0284c7, 0.3, 0.2);
    const vesselLumenMat = createMat(0x075985, 0.8);

    // Left Eye
    const leftEye = new THREE.Group();
    leftEye.position.set(-scale * 0.48, 0, -scale * 0.05);
    leftEye.add(new THREE.Mesh(new THREE.CylinderGeometry(vesselR, vesselR, h + 0.05, 24), vesselWallMat));
    const leftCap = new THREE.Mesh(new THREE.CircleGeometry(vesselR * 0.82, 24), vesselLumenMat);
    leftCap.rotation.x = -Math.PI / 2;
    leftCap.position.y = (h + 0.05) * 0.5 + 0.01;
    leftEye.add(leftCap);
    leftEye.userData = { type: 'bundles', name: '後生導管 (Metaxylem Vessel - 左眼)', plant: 'monocot' };
    root.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Group();
    rightEye.position.set(scale * 0.48, 0, -scale * 0.05);
    rightEye.add(new THREE.Mesh(new THREE.CylinderGeometry(vesselR, vesselR, h + 0.05, 24), vesselWallMat));
    const rightCap = new THREE.Mesh(new THREE.CircleGeometry(vesselR * 0.82, 24), vesselLumenMat);
    rightCap.rotation.x = -Math.PI / 2;
    rightCap.position.y = (h + 0.05) * 0.5 + 0.01;
    rightEye.add(rightCap);
    rightEye.userData = { type: 'bundles', name: '後生導管 (Metaxylem Vessel - 右眼)', plant: 'monocot' };
    root.add(rightEye);

    // 3. Protoxylem Lacuna (原生導管腔 - 嘴巴與鼻子)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, 0, -scale * 0.58);
    mouthGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(vesselR * 0.8, vesselR * 0.8, h + 0.05, 20), vesselWallMat));
    const mouthCap = new THREE.Mesh(new THREE.CircleGeometry(vesselR * 0.65, 20), vesselLumenMat);
    mouthCap.rotation.x = -Math.PI / 2;
    mouthCap.position.y = (h + 0.05) * 0.5 + 0.01;
    mouthGroup.add(mouthCap);
    mouthGroup.userData = { type: 'bundles', name: '原生導管腔 (Protoxylem Lacuna - 嘴鼻腔)', plant: 'monocot' };
    root.add(mouthGroup);

    // 4. Phloem Region (韌皮部篩管與伴細胞 - 額頭)
    const phloemGroup = new THREE.Group();
    phloemGroup.position.set(0, 0, scale * 0.5);
    const phGeo = new THREE.CylinderGeometry(scale * 0.52, scale * 0.52, h + 0.05, 24);
    phGeo.scale(1.2, 1, 0.7);
    phloemGroup.add(new THREE.Mesh(phGeo, createMat(COLORS.phloem, 0.4)));

    // Sieve Tube pores (篩管點陣)
    const dotMat = createMat(0xd97706, 0.5);
    for (let i = -3; i <= 3; i++) {
      for (let j = -2; j <= 2; j++) {
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, h + 0.08, 8), dotMat);
        dot.position.set(i * 0.38 + (j % 2) * 0.15, 0, j * 0.3);
        phloemGroup.add(dot);
      }
    }
    phloemGroup.userData = { type: 'bundles', name: '韌皮部篩管群 (Phloem - 額頭)', plant: 'monocot' };
    root.add(phloemGroup);

    return root;
  }

  // =========================================================================
  // VIEW MODE CONTROLLER & REBUILDING
  // =========================================================================

  function rebuildSceneModel() {
    if (activeModelGroup) {
      scene.remove(activeModelGroup);
      disposeGroup(activeModelGroup);
    }

    if (state.mode === 'cell') {
      if (state.cellSubmode === 'pair') {
        activeModelGroup = buildSingleCellPair({
          cutaway: state.cellCutaway,
          pins: state.cellPins,
          flow: state.cellFlow
        });
      } else if (state.cellSubmode === 'phloem') {
        activeModelGroup = buildSingleCellPhloem({
          cutaway: state.cellCutaway,
          pins: state.cellPins,
          flow: state.cellFlow
        });
      } else {
        activeModelGroup = buildSingleCellXylem({
          cutaway: state.cellCutaway,
          pins: state.cellPins,
          flow: state.cellFlow
        });
      }
      activeModelGroup.position.y = -1.25;
      scene.add(activeModelGroup);
      return;
    }

    if (state.mode === 'dicot') {
      if (state.viewPreset === 'wedge') {
        activeModelGroup = buildWedgeDicot(state.wedgeAngleDeg);
      } else if (state.viewPreset === 'cross') {
        activeModelGroup = buildCrossDicot();
      } else if (state.viewPreset === 'long') {
        activeModelGroup = buildLongitudinalDicot();
      } else {
        activeModelGroup = buildWedgeDicot(0);
      }
    } else {
      if (state.viewPreset === 'wedge') {
        activeModelGroup = buildWedgeMonocot(state.wedgeAngleDeg);
      } else if (state.viewPreset === 'cross') {
        activeModelGroup = buildCrossMonocot();
      } else if (state.viewPreset === 'long') {
        activeModelGroup = buildLongitudinalMonocot();
      } else {
        activeModelGroup = buildWedgeMonocot(0);
      }
    }

    scene.add(activeModelGroup);
    applyExplodeView(state.explodeAmount);
    updateClippingPlaneY();
    rebuildParticles();
  }

  function updateClippingPlaneY() {
    if (state.sliceYPct >= 99.5) {
      // Safely offset above top cap to prevent coplanar grazing jitter
      clippingPlaneY.constant = STEM_HEIGHT * 0.5 + 5.0;
    } else {
      const yVal = (state.sliceYPct / 100 - 0.5) * STEM_HEIGHT;
      clippingPlaneY.constant = yVal;
    }
  }

  function applyExplodeView(amount) {
    if (!activeModelGroup) return;

    if (state.mode === 'dicot') {
      const layers = [
        { name: 'layer_pith', factor: 0.0 },
        { name: 'layer_xylem', factor: 0.55 },
        { name: 'layer_cambium', factor: 1.05 },
        { name: 'layer_phloem', factor: 1.55 },
        { name: 'layer_cortex', factor: 2.05 },
        { name: 'layer_bark', factor: 2.65 }
      ];

      layers.forEach(l => {
        const obj = activeModelGroup.getObjectByName(l.name);
        if (obj) {
          const s = 1 + l.factor * amount * 0.32;
          obj.scale.set(s, 1, s);
        }
      });
    } else {
      const groundObj = activeModelGroup.getObjectByName('layer_groundTissue');
      const bundlesObj = activeModelGroup.getObjectByName('layer_scatteredBundles');
      const epiObj = activeModelGroup.getObjectByName('layer_epidermis');

      if (groundObj) groundObj.scale.set(1, 1, 1);
      if (bundlesObj) {
        const s = 1 + amount * 0.18;
        bundlesObj.scale.set(s, 1, s);
      }
      if (epiObj) {
        const s = 1 + amount * 0.42;
        epiObj.scale.set(s, 1, s);
      }
    }
  }

  function tweenCamera(targetPos, targetLookAt, duration = 750) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(startPos, targetPos, t);
      controls.target.lerpVectors(startTarget, targetLookAt, t);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function setViewPreset(preset) {
    state.viewPreset = preset;

    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`view-${preset}`);
    if (btn) btn.classList.add('active');

    if (preset === 'wedge') {
      state.wedgeAngleDeg = 90;
      document.getElementById('slider-wedge-angle').value = 90;
      document.getElementById('label-wedge-angle').textContent = '90°';
      rebuildSceneModel();
      tweenCamera(new THREE.Vector3(-14, 11, 16), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'cross') {
      rebuildSceneModel();
      tweenCamera(new THREE.Vector3(0, 22, 0.01), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'long') {
      rebuildSceneModel();
      // Camera faces directly front at (0, 0, 22) looking at (0, 0, 0)
      tweenCamera(new THREE.Vector3(0, 0, 22), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'full') {
      rebuildSceneModel();
      tweenCamera(new THREE.Vector3(15, 8, 18), new THREE.Vector3(0, 0, 0));
    }
  }

  // =========================================================================
  // TRANSPORT PARTICLE FLOW SIMULATION
  // =========================================================================

  function setupParticleSystems() {
    if (!waterParticles) {
      const waterGeo = new THREE.BufferGeometry();
      const waterMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.22,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        clippingPlanes: [clippingPlaneY]
      });
      waterParticles = new THREE.Points(waterGeo, waterMat);
      scene.add(waterParticles);
    }

    if (!phloemParticles) {
      const phloemGeo = new THREE.BufferGeometry();
      const phloemMat = new THREE.PointsMaterial({
        color: 0xf59e0b,
        size: 0.22,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        clippingPlanes: [clippingPlaneY]
      });
      phloemParticles = new THREE.Points(phloemGeo, phloemMat);
      scene.add(phloemParticles);
    }

    rebuildParticles();
  }

  /**
   * 精準將水分粒子與養分粒子重新定位並鎖定在目前可見的維管束導管與篩管管腔內部
   * 杜絕粒子漂移到髓心、基本組織或皮層等非維管束區域
   */
  function rebuildParticles() {
    if (!waterParticles || !phloemParticles) return;
    if (state.mode === 'cell') {
      waterParticles.visible = false;
      phloemParticles.visible = false;
      return;
    }

    const h = STEM_HEIGHT;
    const isWedge = (state.viewPreset === 'wedge');
    const isLong = (state.viewPreset === 'long');
    const maxTheta = isWedge ? (Math.PI * 2 - (state.wedgeAngleDeg * Math.PI) / 180) : Math.PI * 2;

    const waterPositions = [];
    const waterSpeeds = [];
    const phloemPositions = [];
    const phloemSpeeds = [];

    if (state.mode === 'dicot') {
      // 雙子葉植物：粒子精準鎖定在8個維管束之內側木質部導管群與外側韌皮部篩管群
      const baseR = DICOT_RADII.bundleCenter; // 3.55
      const xylemOffsets = [
        { dr: -0.30, dt: 0.22, r: 0.17 },
        { dr: -0.30, dt: -0.22, r: 0.17 },
        { dr: -0.32, dt: 0, r: 0.15 },
        { dr: -0.58, dt: 0.18, r: 0.15 },
        { dr: -0.58, dt: -0.18, r: 0.15 },
        { dr: -0.60, dt: 0, r: 0.14 },
        { dr: -0.84, dt: 0.12, r: 0.13 },
        { dr: -0.84, dt: -0.12, r: 0.13 },
        { dr: -0.86, dt: 0, r: 0.12 },
        { dr: -1.10, dt: 0, r: 0.10 }
      ];
      const phloemOffsets = [
        { dr: 0.26, dt: 0, r: 0.15 },
        { dr: 0.25, dt: 0.22, r: 0.14 },
        { dr: 0.25, dt: -0.22, r: 0.14 },
        { dr: 0.48, dt: 0.16, r: 0.13 },
        { dr: 0.48, dt: -0.16, r: 0.13 },
        { dr: 0.54, dt: 0, r: 0.14 },
        { dr: 0.72, dt: 0, r: 0.12 }
      ];

      for (let k = 0; k < 8; k++) {
        const theta_k = k * (Math.PI / 4);

        if (isWedge && maxTheta < Math.PI * 2 - 0.01) {
          if (theta_k < 0.05 || theta_k > maxTheta - 0.05) continue;
        } else if (isLong) {
          if (Math.cos(theta_k) > -0.05) continue;
        }

        // 1. 木質部水分粒子（藍光向上）- 嚴格限制在木質部導管腔內
        xylemOffsets.forEach(xo => {
          const cX = (baseR + xo.dr) * Math.sin(theta_k) + xo.dt * Math.cos(theta_k);
          const cZ = (baseR + xo.dr) * Math.cos(theta_k) - xo.dt * Math.sin(theta_k);
          for (let p = 0; p < 4; p++) {
            const jitRad = Math.random() * (xo.r * 0.65);
            const jitAng = Math.random() * Math.PI * 2;
            waterPositions.push(
              cX + jitRad * Math.cos(jitAng),
              (Math.random() - 0.5) * h,
              cZ + jitRad * Math.sin(jitAng)
            );
            waterSpeeds.push(0.045 + Math.random() * 0.035);
          }
        });

        // 2. 韌皮部養分粒子（金黃光雙向）- 嚴格限制在韌皮部篩管腔內
        phloemOffsets.forEach(po => {
          const cX = (baseR + po.dr) * Math.sin(theta_k) + po.dt * Math.cos(theta_k);
          const cZ = (baseR + po.dr) * Math.cos(theta_k) - po.dt * Math.sin(theta_k);
          for (let p = 0; p < 4; p++) {
            const jitRad = Math.random() * (po.r * 0.65);
            const jitAng = Math.random() * Math.PI * 2;
            phloemPositions.push(
              cX + jitRad * Math.cos(jitAng),
              (Math.random() - 0.5) * h,
              cZ + jitRad * Math.sin(jitAng)
            );
            phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
          }
        });
      }

      // 3. 楔切剖面與縱切剖面露出處的實體 3D 厚壁 U 型管腔內粒子
      if (isWedge && maxTheta < Math.PI * 2 - 0.01) {
        // 剖面 1: theta = 0, 管腔向 +X 凹陷
        [2.50, 2.74, 3.02, 3.32].forEach(rPos => {
          for (let p = 0; p < 8; p++) {
            const depth = 0.01 + Math.random() * 0.06;
            const spread = (Math.random() - 0.5) * 0.04;
            waterPositions.push(depth, (Math.random() - 0.5) * h, rPos + spread);
            waterSpeeds.push(0.045 + Math.random() * 0.035);
          }
        });
        [3.76, 4.02, 4.25, 4.42].forEach(rPos => {
          for (let p = 0; p < 8; p++) {
            const depth = 0.01 + Math.random() * 0.05;
            const spread = (Math.random() - 0.5) * 0.04;
            phloemPositions.push(depth, (Math.random() - 0.5) * h, rPos + spread);
            phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
          }
        });

        // 剖面 2: theta = maxTheta, 管腔向 -Z 凹陷
        const sinE = Math.sin(maxTheta);
        const cosE = Math.cos(maxTheta);
        [2.50, 2.74, 3.02, 3.32].forEach(rPos => {
          for (let p = 0; p < 8; p++) {
            const depth = -(0.01 + Math.random() * 0.06);
            const spread = (Math.random() - 0.5) * 0.04;
            waterPositions.push(rPos * sinE + spread * cosE, (Math.random() - 0.5) * h, rPos * cosE + depth);
            waterSpeeds.push(0.045 + Math.random() * 0.035);
          }
        });
        [3.76, 4.02, 4.25, 4.42].forEach(rPos => {
          for (let p = 0; p < 8; p++) {
            const depth = -(0.01 + Math.random() * 0.05);
            const spread = (Math.random() - 0.5) * 0.04;
            phloemPositions.push(rPos * sinE + spread * cosE, (Math.random() - 0.5) * h, rPos * cosE + depth);
            phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
          }
        });
      } else if (isLong) {
        // 正面縱剖面 (Z=0)：管腔向 -Z 凹陷
        [-1, 1].forEach(side => {
          [2.50, 2.74, 3.02, 3.32].forEach(xOff => {
            for (let p = 0; p < 8; p++) {
              const depth = -(0.01 + Math.random() * 0.06);
              const spread = (Math.random() - 0.5) * 0.04;
              waterPositions.push(side * xOff + spread, (Math.random() - 0.5) * h, depth);
              waterSpeeds.push(0.045 + Math.random() * 0.035);
            }
          });
          [3.76, 4.02, 4.25, 4.42].forEach(xOff => {
            for (let p = 0; p < 8; p++) {
              const depth = -(0.01 + Math.random() * 0.05);
              const spread = (Math.random() - 0.5) * 0.04;
              phloemPositions.push(side * xOff + spread, (Math.random() - 0.5) * h, depth);
              phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
            }
          });
        });
      }
    } else {
      // 單子葉植物：粒子精準鎖定在68個散生維管束之後生導管、原生導管腔與韌皮部篩管之內
      const rOuter = STEM_RADIUS;
      const count = 68;

      for (let i = 0; i < count; i++) {
        const phi = i * 2.399963;
        const normR = Math.sqrt((i + 1) / count);
        const r = 0.4 + normR * (rOuter - 0.65);
        const angle = phi % (Math.PI * 2);

        if (isWedge && maxTheta < Math.PI * 2 - 0.01) {
          if (angle < 0.08 || angle > maxTheta - 0.08) continue;
        } else if (isLong) {
          if (Math.cos(angle) > -0.05) continue;
        }

        const bScale = 0.16 + (1 - normR) * 0.15;
        const bX = r * Math.sin(angle);
        const bZ = r * Math.cos(angle);

        const toWorld = (lx, lz) => ({
          x: bX + lx * Math.cos(angle) + lz * Math.sin(angle),
          z: bZ - lx * Math.sin(angle) + lz * Math.cos(angle)
        });

        // 1. 木質部水分：左眼與右眼後生導管 + 嘴鼻部原生導管腔
        const eyeL = toWorld(-bScale * 0.45, -bScale * 0.05);
        const eyeR = toWorld(bScale * 0.45, -bScale * 0.05);
        const mouth = toWorld(0, -bScale * 0.55);

        [eyeL, eyeR].forEach(eye => {
          for (let p = 0; p < 3; p++) {
            const jR = Math.random() * (bScale * 0.16);
            const jA = Math.random() * Math.PI * 2;
            waterPositions.push(eye.x + jR * Math.cos(jA), (Math.random() - 0.5) * h, eye.z + jR * Math.sin(jA));
            waterSpeeds.push(0.045 + Math.random() * 0.035);
          }
        });

        const mR = Math.random() * (bScale * 0.12);
        const mA = Math.random() * Math.PI * 2;
        waterPositions.push(mouth.x + mR * Math.cos(mA), (Math.random() - 0.5) * h, mouth.z + mR * Math.sin(mA));
        waterSpeeds.push(0.045 + Math.random() * 0.035);

        // 2. 韌皮部養分：額頭部篩管群
        const forehead = toWorld(0, bScale * 0.45);
        for (let p = 0; p < 4; p++) {
          const phR = Math.random() * (bScale * 0.24);
          const phA = Math.random() * Math.PI * 2;
          phloemPositions.push(forehead.x + phR * Math.cos(phA), (Math.random() - 0.5) * h, forehead.z + phR * Math.sin(phA));
          phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
        }
      }

      // 單子葉剖面露出處的實體 3D 猴臉管腔內粒子
      if (isWedge && maxTheta < Math.PI * 2 - 0.01) {
        [0, maxTheta].forEach(ang => {
          const isStart = (ang === 0);
          [1.15, 2.15, 3.15, 4.15].forEach(rPos => {
            const cX = rPos * Math.sin(ang);
            const cZ = rPos * Math.cos(ang);
            for (let p = 0; p < 6; p++) {
              const depth = isStart ? (0.01 + Math.random() * 0.05) : -(0.01 + Math.random() * 0.05);
              const spread = (Math.random() - 0.5) * 0.04;
              if (isStart) {
                waterPositions.push(depth, (Math.random() - 0.5) * h, cZ + spread);
              } else {
                waterPositions.push(cX + spread, (Math.random() - 0.5) * h, depth);
              }
              waterSpeeds.push(0.045 + Math.random() * 0.035);
            }
            for (let p = 0; p < 5; p++) {
              const depth = isStart ? (0.01 + Math.random() * 0.05) : -(0.01 + Math.random() * 0.05);
              const spread = (Math.random() - 0.5) * 0.04;
              if (isStart) {
                phloemPositions.push(depth, (Math.random() - 0.5) * h, cZ + spread);
              } else {
                phloemPositions.push(cX + spread, (Math.random() - 0.5) * h, depth);
              }
              phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
            }
          });
        });
      } else if (isLong) {
        [0.85, 1.95, 3.05, 4.10, -0.85, -1.95, -3.05, -4.10].forEach(bx => {
          for (let p = 0; p < 6; p++) {
            const depth = -(0.01 + Math.random() * 0.05);
            const spread = (Math.random() - 0.5) * 0.04;
            waterPositions.push(bx + spread, (Math.random() - 0.5) * h, depth);
            waterSpeeds.push(0.045 + Math.random() * 0.035);
          }
          for (let p = 0; p < 5; p++) {
            const depth = -(0.01 + Math.random() * 0.05);
            const spread = (Math.random() - 0.5) * 0.04;
            phloemPositions.push(bx + spread, (Math.random() - 0.5) * h, depth);
            phloemSpeeds.push((Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.025));
          }
        });
      }
    }

    waterParticles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    waterParticles.userData = { speeds: new Float32Array(waterSpeeds) };

    phloemParticles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(phloemPositions, 3));
    phloemParticles.userData = { speeds: new Float32Array(phloemSpeeds) };
  }

  function updateParticles(delta = 0.016) {
    const halfH = STEM_HEIGHT * 0.5;

    // Single Cell Particles
    if (state.mode === 'cell' && activeModelGroup) {
      if (waterParticles) waterParticles.visible = false;
      if (phloemParticles) phloemParticles.visible = false;

      if (state.cellFlow) {
        activeModelGroup.traverse(child => {
          if (child.isPoints && child.userData.isCellWaterFlow) {
            // 木質部導管水分：始終由下往上蒸散流動 (Upward)
            const pos = child.geometry.attributes.position.array;
            const speeds = child.userData.speeds;
            const h = child.userData.h;
            for (let i = 0; i < speeds.length; i++) {
              pos[i * 3 + 1] += speeds[i];
              if (pos[i * 3 + 1] > h * 0.5) pos[i * 3 + 1] = -h * 0.5;
            }
            child.geometry.attributes.position.needsUpdate = true;
          } else if (child.isPoints && child.userData.isCellPhloemFlow) {
            // 韌皮部篩管養分：由使用者控制全部往上 (1)、全部往下 (-1) 或雙向交替
            const pos = child.geometry.attributes.position.array;
            const speeds = child.userData.speeds;
            const h = child.userData.h;

            let dir = -1; // 預設往下
            if (state.cellPhloemDir === 'up') {
              dir = 1;
            } else if (state.cellPhloemDir === 'down') {
              dir = -1;
            } else if (state.cellPhloemDir === 'alternate') {
              child.userData.timer = (child.userData.timer || 0) + delta;
              if (child.userData.timer >= 3.0) {
                child.userData.timer = 0;
                child.userData.alternateDir = (child.userData.alternateDir || 1) * -1;
              }
              dir = child.userData.alternateDir || 1;
            }

            for (let i = 0; i < speeds.length; i++) {
              pos[i * 3 + 1] += speeds[i] * dir;
              if (dir > 0) {
                // 全部往上流動時的邊界循環
                if (pos[i * 3 + 1] > h * 0.5) pos[i * 3 + 1] = -h * 0.5;
                if (pos[i * 3 + 1] < -h * 0.5) pos[i * 3 + 1] = -h * 0.5;
              } else {
                // 全部往下流動時的邊界循環
                if (pos[i * 3 + 1] < -h * 0.5) pos[i * 3 + 1] = h * 0.5;
                if (pos[i * 3 + 1] > h * 0.5) pos[i * 3 + 1] = h * 0.5;
              }
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      }
      return;
    }

    // In cross section view, hide vertical particles
    if (state.viewPreset === 'cross') {
      if (waterParticles) waterParticles.visible = false;
      if (phloemParticles) phloemParticles.visible = false;
      return;
    }

    if (waterParticles && state.waterFlow && !state.microscopeMode) {
      waterParticles.visible = true;
      const pos = waterParticles.geometry.attributes.position?.array;
      const speeds = waterParticles.userData.speeds;
      if (pos && speeds) {
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] += speeds[i];
          if (pos[i * 3 + 1] > halfH) pos[i * 3 + 1] = -halfH;
        }
        waterParticles.geometry.attributes.position.needsUpdate = true;
      }
    } else if (waterParticles) {
      waterParticles.visible = false;
    }

    if (phloemParticles && state.phloemFlow && !state.microscopeMode) {
      phloemParticles.visible = true;
      const pos = phloemParticles.geometry.attributes.position?.array;
      const speeds = phloemParticles.userData.speeds;
      if (pos && speeds) {
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] += speeds[i];
          if (pos[i * 3 + 1] > halfH) pos[i * 3 + 1] = -halfH;
          if (pos[i * 3 + 1] < -halfH) pos[i * 3 + 1] = halfH;
        }
        phloemParticles.geometry.attributes.position.needsUpdate = true;
      }
    } else if (phloemParticles) {
      phloemParticles.visible = false;
    }
  }

  // =========================================================================
  // RAYCASTING & INTERACTIVE INSPECTION
  // =========================================================================

  function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const targetGroup = state.microscopeMode ? microscopeGroup : activeModelGroup;
    if (!targetGroup) return;

    const intersects = raycaster.intersectObjects(targetGroup.children, true);

    const tooltip = document.getElementById('tooltip-3d');
    const tooltipText = document.getElementById('tooltip-text');
    const tooltipDot = document.getElementById('tooltip-dot');

    if (intersects.length > 0) {
      let hit = null;
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && !obj.userData?.type && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.type) {
          hit = obj;
          break;
        }
      }

      if (hit) {
        document.body.style.cursor = 'pointer';
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltipText.textContent = hit.userData.name;
        tooltipDot.style.backgroundColor = getStructureColor(hit.userData.type);
        tooltip.classList.add('visible');

        if (state.hoveredMesh !== hit) {
          resetHoverHighlight();
          state.hoveredMesh = hit;
          applyHoverHighlight(hit);
        }
        return;
      }
    }

    document.body.style.cursor = 'default';
    tooltip.classList.remove('visible');
    resetHoverHighlight();
  }

  function applyHoverHighlight(obj) {
    obj.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        if (!child.userData.origEmissive) {
          child.userData.origEmissive = child.material.emissive.clone();
        }
        child.material.emissive.set(0x38bdf8);
      }
    });
  }

  function resetHoverHighlight() {
    if (state.hoveredMesh) {
      state.hoveredMesh.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive && child.userData.origEmissive) {
          child.material.emissive.copy(child.userData.origEmissive);
        }
      });
      state.hoveredMesh = null;
    }
  }

  function onPointerClick() {
    if (state.hoveredMesh && state.hoveredMesh.userData?.type) {
      selectStructure(state.hoveredMesh.userData.type);
    }
  }

  function selectStructure(type) {
    state.selectedStructure = type;
    const data = ANATOMY_DATA[state.mode][type] || ANATOMY_DATA[state.mode].default;

    const tagDot = document.getElementById('detail-tag-dot');
    const tagText = document.getElementById('detail-tag-text');
    const title = document.getElementById('detail-name');
    const latin = document.getElementById('detail-latin');
    const desc = document.getElementById('detail-description');
    const featuresList = document.getElementById('detail-features');
    const tipBox = document.getElementById('detail-tip');

    tagDot.style.backgroundColor = data.tagColor || '#10b981';
    tagText.textContent = data.tag;
    title.textContent = data.name;
    latin.textContent = data.latin;
    desc.textContent = data.desc;

    featuresList.innerHTML = '';
    if (data.features) {
      data.features.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${f.label}：</strong> ${f.val}`;
        featuresList.appendChild(li);
      });
    }

    if (data.tip) {
      tipBox.innerHTML = data.tip;
      tipBox.style.display = 'block';
    } else {
      tipBox.style.display = 'none';
    }

    const monkeyCard = document.getElementById('monkey-face-card');
    if (state.mode === 'monocot' && (type === 'bundles' || type === 'default')) {
      monkeyCard.classList.add('visible');
    } else {
      monkeyCard.classList.remove('visible');
    }
  }

  function getStructureColor(type) {
    switch (type) {
      case 'pith': return '#fef08a';
      case 'xylem': return '#38bdf8';
      case 'cambium': return '#10b981';
      case 'phloem': return '#f59e0b';
      case 'cortex': return '#86efac';
      case 'bark': return '#4d7c0f';
      case 'groundTissue': return '#ecfccb';
      case 'bundles': return '#818cf8';
      case 'epidermis': return '#15803d';
      case 'cell_phloem': return '#f59e0b';
      case 'cell_xylem': return '#38bdf8';
      case 'cell_pair': return '#10b981';
      case 'sieve_plate': return '#fbbf24';
      case 'companion_cell': return '#f43f5e';
      case 'xylem_lumen': return '#0ea5e9';
      case 'perforation_plate': return '#38bdf8';
      case 'bordered_pits': return '#0284c7';
      default: return '#38bdf8';
    }
  }

  function updateLegendUI() {
    const legendPanel = document.getElementById('legend-panel');
    if (!legendPanel) return;
    legendPanel.innerHTML = '';

    const items = state.mode === 'dicot' ? [
      { type: 'pith', name: '髓 (Pith)', color: '#fef08a' },
      { type: 'xylem', name: '木質部 (Xylem)', color: '#38bdf8' },
      { type: 'cambium', name: '形成層 (Cambium)', color: '#10b981' },
      { type: 'phloem', name: '韌皮部 (Phloem)', color: '#f59e0b' },
      { type: 'cortex', name: '皮層 (Cortex)', color: '#86efac' },
      { type: 'bark', name: '表皮/樹皮 (Epidermis)', color: '#4d7c0f' }
    ] : state.mode === 'monocot' ? [
      { type: 'bundles', name: '散生維管束 (Monkey Face)', color: '#818cf8' },
      { type: 'groundTissue', name: '基本組織 (Ground Tissue)', color: '#ecfccb' },
      { type: 'epidermis', name: '表皮與下皮 (Epidermis)', color: '#15803d' }
    ] : state.cellSubmode === 'pair' ? [
      { type: 'cell_phloem', name: '外側·韌皮部細胞 (Phloem)', color: '#f59e0b' },
      { type: 'cambium', name: '中間·形成層界線 (Cambium)', color: '#10b981' },
      { type: 'cell_xylem', name: '內側·木質部細胞 (Xylem)', color: '#38bdf8' },
      { type: 'companion_cell', name: '伴細胞活性核 (Nucleus)', color: '#f43f5e' }
    ] : state.cellSubmode === 'phloem' ? [
      { type: 'cell_phloem', name: '篩管細胞初生壁', color: '#f59e0b' },
      { type: 'sieve_plate', name: '端壁篩板與篩孔', color: '#fbbf24' },
      { type: 'companion_cell', name: '伴細胞與細胞核', color: '#f43f5e' }
    ] : [
      { type: 'cell_xylem', name: '木質化次生厚壁', color: '#0284c7' },
      { type: 'xylem_lumen', name: '導管中空腔 (Lumen)', color: '#0ea5e9' },
      { type: 'perforation_plate', name: '端壁穿孔板 (Perforation)', color: '#38bdf8' },
      { type: 'bordered_pits', name: '側壁具緣紋孔 (Pits)', color: '#0369a1' }
    ];

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'legend-item';
      el.innerHTML = `
        <span class="legend-color" style="background-color: ${item.color};"></span>
        <span>${item.name}</span>
      `;
      el.addEventListener('click', () => selectStructure(item.type));
      legendPanel.appendChild(el);
    });
  }

  function setPlantMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;

    document.getElementById('btn-mode-dicot').classList.toggle('active', mode === 'dicot');
    document.getElementById('btn-mode-monocot').classList.toggle('active', mode === 'monocot');
    const btnCell = document.getElementById('btn-mode-cell');
    if (btnCell) btnCell.classList.toggle('active', mode === 'cell');

    const isCell = mode === 'cell';
    const cellCard = document.getElementById('cell-controls-card');
    const stemSec = document.getElementById('stem-section-card');
    const stemSlicers = document.getElementById('stem-slicers-card');

    if (cellCard) cellCard.style.display = isCell ? 'block' : 'none';
    if (stemSec) stemSec.style.display = isCell ? 'none' : 'block';
    if (stemSlicers) stemSlicers.style.display = isCell ? 'none' : 'block';
    document.getElementById('btn-microscope').classList.toggle('active', isCell);

    if (isCell) {
      tweenCamera(new THREE.Vector3(0, 0, 18.0), new THREE.Vector3(0, -1.25, 0));
    } else {
      setViewPreset(state.viewPreset);
    }

    rebuildSceneModel();
    updateLegendUI();

    if (isCell) {
      if (state.cellSubmode === 'pair') selectStructure('cell_pair');
      else if (state.cellSubmode === 'phloem') selectStructure('cell_phloem');
      else if (state.cellSubmode === 'xylem') selectStructure('cell_xylem');
      setCellPhloemDirection(state.cellPhloemDir);
    } else {
      selectStructure('default');
    }
  }

  function setCellSubmode(submode) {
    state.cellSubmode = submode;
    const btnPair = document.getElementById('cell-view-pair');
    const btnPhloem = document.getElementById('cell-view-phloem');
    const btnXylem = document.getElementById('cell-view-xylem');

    if (btnPair) btnPair.classList.toggle('active', submode === 'pair');
    if (btnPhloem) btnPhloem.classList.toggle('active', submode === 'phloem');
    if (btnXylem) btnXylem.classList.toggle('active', submode === 'xylem');

    rebuildSceneModel();
    updateLegendUI();

    if (submode === 'pair') selectStructure('cell_pair');
    else if (submode === 'phloem') selectStructure('cell_phloem');
    else if (submode === 'xylem') selectStructure('cell_xylem');
    setCellPhloemDirection(state.cellPhloemDir);
  }

  function setCellPhloemDirection(dir) {
    state.cellPhloemDir = dir;
    const btnUp = document.getElementById('btn-phloem-up');
    const btnDown = document.getElementById('btn-phloem-down');
    const btnAlt = document.getElementById('btn-phloem-alt');

    if (btnUp) btnUp.classList.toggle('active', dir === 'up');
    if (btnDown) btnDown.classList.toggle('active', dir === 'down');
    if (btnAlt) btnAlt.classList.toggle('active', dir === 'alternate');
  }

  function toggleMicroscopeMode() {
    if (state.mode === 'cell') {
      setPlantMode('dicot');
    } else {
      setPlantMode('cell');
    }
  }

  // =========================================================================
  // DOM EVENT LISTENERS
  // =========================================================================

  function bindEvents() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onPointerClick);

    document.getElementById('btn-mode-dicot').addEventListener('click', () => setPlantMode('dicot'));
    document.getElementById('btn-mode-monocot').addEventListener('click', () => setPlantMode('monocot'));
    const btnCell = document.getElementById('btn-mode-cell');
    if (btnCell) btnCell.addEventListener('click', () => setPlantMode('cell'));

    const btnPair = document.getElementById('cell-view-pair');
    if (btnPair) btnPair.addEventListener('click', () => setCellSubmode('pair'));

    const btnPhloem = document.getElementById('cell-view-phloem');
    if (btnPhloem) btnPhloem.addEventListener('click', () => setCellSubmode('phloem'));

    const btnXylem = document.getElementById('cell-view-xylem');
    if (btnXylem) btnXylem.addEventListener('click', () => setCellSubmode('xylem'));

    const btnPhloemUp = document.getElementById('btn-phloem-up');
    if (btnPhloemUp) btnPhloemUp.addEventListener('click', () => setCellPhloemDirection('up'));

    const btnPhloemDown = document.getElementById('btn-phloem-down');
    if (btnPhloemDown) btnPhloemDown.addEventListener('click', () => setCellPhloemDirection('down'));

    const btnPhloemAlt = document.getElementById('btn-phloem-alt');
    if (btnPhloemAlt) btnPhloemAlt.addEventListener('click', () => setCellPhloemDirection('alternate'));

    const tCut = document.getElementById('toggle-cell-cutaway');
    if (tCut) tCut.addEventListener('change', (e) => {
      state.cellCutaway = e.target.checked;
      rebuildSceneModel();
    });

    const tPins = document.getElementById('toggle-cell-pins');
    if (tPins) tPins.addEventListener('change', (e) => {
      state.cellPins = e.target.checked;
      rebuildSceneModel();
    });

    const tFlow = document.getElementById('toggle-cell-flow');
    if (tFlow) tFlow.addEventListener('change', (e) => {
      state.cellFlow = e.target.checked;
      rebuildSceneModel();
    });

    document.getElementById('view-wedge').addEventListener('click', () => setViewPreset('wedge'));
    document.getElementById('view-cross').addEventListener('click', () => setViewPreset('cross'));
    document.getElementById('view-long').addEventListener('click', () => setViewPreset('long'));
    document.getElementById('view-full').addEventListener('click', () => setViewPreset('full'));

    const sliderSliceY = document.getElementById('slider-slice-y');
    const labelSliceY = document.getElementById('label-slice-y');
    sliderSliceY.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value);
      labelSliceY.textContent = `${pct}%`;
      state.sliceYPct = pct;
      updateClippingPlaneY();
    });

    const sliderWedge = document.getElementById('slider-wedge-angle');
    const labelWedge = document.getElementById('label-wedge-angle');
    let wedgeRafId = null;
    sliderWedge.addEventListener('input', (e) => {
      const deg = parseInt(e.target.value);
      labelWedge.textContent = `${deg}°`;
      state.wedgeAngleDeg = deg;

      // 若目前在其他視角（例如縱切面或橫切面），拉動開角滑桿時自動切換至 3D 楔切模式並即時展開
      if (state.viewPreset !== 'wedge') {
        state.viewPreset = 'wedge';
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.getElementById('view-wedge');
        if (btn) btn.classList.add('active');
      }

      // 使用 requestAnimationFrame 節流，確保一幀 (16.6ms) 內最多只執行一次 3D 重建，徹底消除滑動 lag
      if (!wedgeRafId) {
        wedgeRafId = requestAnimationFrame(() => {
          rebuildSceneModel();
          wedgeRafId = null;
        });
      }
    });

    sliderWedge.addEventListener('change', () => {
      if (wedgeRafId) {
        cancelAnimationFrame(wedgeRafId);
        wedgeRafId = null;
      }
      rebuildSceneModel();
    });

    const sliderExplode = document.getElementById('slider-explode');
    const labelExplode = document.getElementById('label-explode');
    sliderExplode.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      labelExplode.textContent = `${val.toFixed(1)}x`;
      state.explodeAmount = val;
      applyExplodeView(val);
    });

    document.getElementById('toggle-water').addEventListener('change', (e) => {
      state.waterFlow = e.target.checked;
    });
    document.getElementById('toggle-phloem').addEventListener('change', (e) => {
      state.phloemFlow = e.target.checked;
    });
    document.getElementById('toggle-rotate').addEventListener('change', (e) => {
      state.autoRotate = e.target.checked;
    });

    document.getElementById('btn-microscope').addEventListener('click', toggleMicroscopeMode);
    document.getElementById('btn-reset-view').addEventListener('click', () => {
      if (state.microscopeMode) toggleMicroscopeMode();
      setViewPreset('wedge');
    });

    const compModal = document.getElementById('modal-comparison');
    document.getElementById('btn-comparison').addEventListener('click', () => {
      compModal.classList.add('active');
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      compModal.classList.remove('active');
    });
    compModal.addEventListener('click', (e) => {
      if (e.target === compModal) compModal.classList.remove('active');
    });
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    controls.update();

    if (state.autoRotate && !state.microscopeMode && activeModelGroup) {
      activeModelGroup.rotation.y += 0.003;
      if (waterParticles) waterParticles.rotation.y += 0.003;
      if (phloemParticles) phloemParticles.rotation.y += 0.003;
    } else if (state.autoRotate && state.microscopeMode && microscopeGroup) {
      microscopeGroup.rotation.y += 0.005;
    }

    updateParticles(delta);

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

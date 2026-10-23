// ==========================================
// 光合紀元：植物生存策略 (Plant Strategy Game MVP)
// 純前端 Vanilla JavaScript (無 Node.js 依賴)
// ==========================================

// --- 一、 遊戲常態資料庫與卡池定義 ---

// 1. 常態基礎發育牌庫（卡名精簡，核心數值一目了然）
const CORE_CARDS = [
  {
    id: 'core_taproot',
    name: '長主根',
    category: '根系',
    costSugar: 2,
    costWater: 0,
    brief: '根深 +1 (深層汲水, 抗旱)',
    desc: '主根深扎地下 +1 級（上限 6 級）。深層常態汲水 +1，抗旱減免失水，抗風穩定度大幅提高。',
    flavor: '根尖中柱平衡石細胞感應重力向量，引發正向地性生長。直根系（Taproot system）穿透表土層直達深層水基質，在乾旱逆境下維持木質部負水勢，避免導管空穴化。',
    canPlay: (state) => state.plant.rootDepth < 6,
    action: (state) => {
      state.plant.rootDepth += 1;
      state.scores.resilience += 10;
      state.logMsg = `🌱 直根系向下伸長（根深 Level ${state.plant.rootDepth}），深層土壤常態汲水與抗旱穩定度提升。`;
    }
  },
  {
    id: 'core_lateral_roots',
    name: '長側根',
    category: '根系',
    costSugar: 1,
    costWater: 1,
    brief: '側根 +1 (雨季吸水+2, 水限+2)',
    desc: '側根水平擴展 +1 級（上限 6 級）。擴大根際吸收網，水分儲備上限 +2，且雨季降雨額外汲水 +2。',
    flavor: '中柱鞘（Pericycle）細胞受生長素訊號誘導進行平周分裂，向外突起形成側根原基。側根網絡顯著擴大根際（Rhizosphere）截獲體積，提升降雨初期表層游離水與無機離子的吸收速率。',
    canPlay: (state) => state.plant.rootWidth < 6,
    action: (state) => {
      state.plant.rootWidth += 1;
      state.updateWaterMax();
      state.scores.resilience += 8;
      state.logMsg = `🌱 側根自中柱鞘分化延展（側根 Level ${state.plant.rootWidth}），雨季吸水暴增，水分儲備上限擴充至 ${state.waterMax}！`;
    }
  },
  {
    id: 'core_apical_stem',
    name: '抽主幹',
    category: '莖幹',
    costSugar: 2,
    costWater: 1,
    brief: '高度 +1 (採光加成)',
    desc: '植物高度 +1 級（上限 8 級）。擺脫地表陰影，整體光合受光係數提升。',
    flavor: '頂端分生組織（SAM）受生長素極性運輸調節，活化節間伸長生長。藉由垂直生長克服地表草本層的冠層遮陰（Shade avoidance response），提高葉冠的光合有效輻射（PAR）截獲量。',
    canPlay: (state) => state.plant.height < 8,
    action: (state) => {
      state.plant.height += 1;
      state.scores.majesty += 10;
      state.logMsg = `🌿 頂端分生組織伸長，垂直株高提升至 Level ${state.plant.height}。`;
    }
  },
  {
    id: 'core_secondary_growth',
    name: '加粗莖幹',
    category: '莖幹',
    costSugar: 2,
    costWater: 0,
    brief: '莖粗 +1 (儲糖+3, 水限+1, 抗風)',
    desc: '形成層木質加粗 +1。風抗顯著提升，主幹儲糖上限 +3，水力傳導儲水上限 +1。',
    flavor: '維管形成層（Vascular cambium）進行平周分裂，向內衍生次生木質部並沉積厚壁木質素（Lignin），向外分化次生韌皮部。次生生長顯著提高莖幹截面慣性矩以抵抗風切剪力，並擴增軸向薄壁組織的碳水化合物儲藏容積。',
    unlockDesc: '高度≥2 級 且 葉片≥4 片',
    isUnlocked: (state) => state.plant.height >= 2 && state.plant.leaves >= 4,
    canPlay: (state) => state.plant.trunkCaliber < 8,
    action: (state) => {
      state.plant.trunkCaliber += 1;
      state.sugarMax += 3;
      state.updateWaterMax();
      state.scores.majesty += 15;
      state.logMsg = `🪵 維管形成層沉積次生木質部（莖粗 Level ${state.plant.trunkCaliber}），儲糖上限升至 ${state.sugarMax}，水限升至 ${state.waterMax}！`;
    }
  },
  {
    id: 'core_branching',
    name: '長新枝',
    category: '莖幹',
    costSugar: 2,
    costWater: 0,
    brief: '分枝 +1 (解鎖葉冠槽+3)',
    desc: '長出 1 根側枝（最多 6 枝）。立體展開冠層，解鎖額外 3 片葉片附著空間並降低自遮陰。',
    flavor: '根系合成之細胞分裂素打破莖頂優勢（Apical dominance），誘導休眠側芽發育為一級側枝。立體分枝拓撲結構使葉群立體空間展開，降低同株葉片自遮陰率（Self-shading），優化整株碳獲取效率。',
    unlockDesc: '高度≥2 級',
    isUnlocked: (state) => state.plant.height >= 2,
    canPlay: (state) => state.plant.branches.length < 6,
    action: (state) => {
      const side = state.plant.branches.length % 2 === 0 ? 1 : -1;
      state.plant.branches.push({
        side: side,
        heightRatio: 0.3 + (state.plant.branches.length * 0.12),
        length: 30 + Math.random() * 15,
        twigs: 0,
        leaves: 0,
        flowers: 0,
        fruits: 0
      });
      state.scores.majesty += 10;
      state.logMsg = `🌿 側芽解除休眠萌發為第 ${state.plant.branches.length} 根側枝，解鎖更多葉片展開空間！`;
    }
  },
  {
    id: 'core_unfurl_leaves',
    name: '長新葉',
    category: '葉冠',
    costSugar: 1,
    costWater: 1,
    brief: '葉片+2 (每月光合產能+1)',
    desc: '長出 2 片新葉。每片葉片都在下月光合作用時製造葡萄糖（若葉片已達主幹承載上限，需長新枝擴充空間）。',
    flavor: '側生葉原基分化出具備柵欄組織與海綿組織之同化器官，合成葉綠素 a/b 驅動卡爾文循環（Calvin cycle）。作為主要碳源（Source），葉片提供光合碳水化合物，同時伴隨氣孔開展產生的蒸散水分損耗權衡。',
    unlockDesc: '葉數達承載上限時需長出側枝',
    isUnlocked: (state) => state.plant.leaves < (6 + state.plant.branches.length * 3),
    canPlay: (state) => state.plant.leaves < Math.min(24, 6 + state.plant.branches.length * 3),
    action: (state) => {
      state.plant.leaves += 2;
      if (state.plant.branches.length > 0) {
        const b = state.plant.branches[Math.floor(Math.random() * state.plant.branches.length)];
        b.leaves = (b.leaves || 0) + 2;
      }
      state.logMsg = `🍃 展開 2 片功能性同化葉（總葉數：${state.plant.leaves} 片），光合碳同化潛力提升。`;
    }
  }
];

// 2. 季節應變牌池（卡名精簡，生態學機制嚴謹專業）
const SEASON_CARDS = {
  // 春季 (3, 4, 5 月)
  spring: [
    {
      id: 'sp_bloom',
      name: '開花',
      category: '繁殖',
      season: '春',
      costSugar: 2,
      costWater: 0,
      brief: '鮮花 +2 (夏日授粉)',
      desc: '枝頭盛放 2 朵鮮花。若未受霜凍，初夏有高機率受粉結果。',
      flavor: '光週期與春化訊號活化成花素（FT 蛋白）經韌皮部轉運至莖頂分生組織，啟動 ABCDE 同源異型基因級聯反應，分化出花萼、花冠及雌雄蕊，此階段消耗大量可溶性非結構性碳水化合物（NSC）。',
      unlockDesc: '年齡滿 1 歲(第2年起) 或 莖粗≥2',
      isUnlocked: (state) => state.year >= 2 || state.plant.trunkCaliber >= 2,
      action: (state) => {
        state.plant.flowers += 2;
        if (state.plant.branches.length > 0) {
          state.plant.branches[0].flowers = (state.plant.branches[0].flowers || 0) + 2;
        }
        state.logMsg = '🌸 莖頂分化出 2 枚生殖花器官，進入傳粉受精期。';
      }
    },
    {
      id: 'sp_nectar',
      name: '泌蜜',
      category: '共生',
      season: '春',
      costSugar: 1,
      costWater: 0,
      brief: '授粉率 95% (誘蜂)',
      desc: '蜜腺分泌甜蜜。本季授粉成功率提升至 95%，生態共生評分大幅增加。',
      flavor: '花部蜜腺細胞透過質外體路徑主動分泌富含蔗糖、果糖與氨基酸之高滲透溶液，作為蟲媒傳粉動物的化學能量報酬，以生態互惠機制提升異花授粉效率與遺傳多樣性。',
      unlockDesc: '需已長出花朵(花≥1)',
      isUnlocked: (state) => state.plant.flowers >= 1,
      action: (state) => {
        state.buffs.nectar = true;
        state.scores.mutualism += 25;
        state.logMsg = '🐝 蜜腺分泌碳水化合物糖液，授粉機率提升至 95%。';
      }
    },
    {
      id: 'sp_mycorrhizae',
      name: '菌根共生',
      category: '共生',
      season: '春',
      costSugar: 2,
      costWater: 0,
      brief: '永久吸水 +1 (供糖0.5)',
      desc: '與地下真菌菌絲共生。每月吸水永久 +1，但每月微量進貢 0.5 糖（長期投資）。',
      flavor: '皮層細胞與叢枝菌根真菌（AMF）建立細胞內共生體。真菌外生菌絲（Extraradical mycelium）突破根際磷酸鹽耗竭帶，擴增吸水與礦質吸收截面；宿主植物以 5~15% 淨光合產物（糖類與脂肪酸）進行營養交換。',
      unlockDesc: '根深≥2 級',
      isUnlocked: (state) => state.plant.rootDepth >= 2,
      action: (state) => {
        state.perks.mycorrhizae = true;
        state.scores.mutualism += 30;
        state.logMsg = '🍄 根系皮層與叢枝菌根真菌建立共生介面，每月增加無機水鹽吸收。';
      }
    },
    {
      id: 'sp_rapid_foliage',
      name: '爆展新葉',
      category: '葉冠',
      season: '春',
      costSugar: 2,
      costWater: 2,
      brief: '新葉 +4 (急速產能)',
      desc: '一口氣長出 4 片新葉，迅速拉滿春季光合引擎。',
      flavor: '積溫回升觸發芽鱗脫落與葉原基膨脹伸長，細胞內大量合成 Rubisco 酵素與光反應蛋白，快速拉升群體葉面積指數（LAI），搶佔春季早期的物候光合窗口。',
      isUnlocked: () => true,
      action: (state) => {
        state.plant.leaves += 4;
        state.logMsg = '🍃 快速擴展 4 片新葉，群體葉面積指數（LAI）顯著上升。';
      }
    }
  ],

  // 夏季 (6, 7, 8 月)
  summer: [
    {
      id: 'su_wax',
      name: '蠟質防曬',
      category: '防禦',
      season: '夏',
      costSugar: 1,
      costWater: 0,
      brief: '蒸散降低 50% (抗旱)',
      desc: '葉片覆蓋加厚角質蠟層，本年夏季高溫蒸散失水降低 50%。可化解【伏旱熱浪】。',
      flavor: '表皮細胞外壁分泌沉積角質素（Cutin）與超長鏈脂肪酸蠟質。非極性疏水性蠟質層大幅降低角質層非氣孔蒸散漏失速率（Cuticular transpiration），並反射多餘輻射以減輕強光抑制。',
      isUnlocked: () => true,
      action: (state) => {
        state.buffs.waxyLeaves = true;
        state.scores.resilience += 20;
        state.checkCrisisResolution('waxyLeaves');
        state.logMsg = '✨ 表皮角質蠟質層增厚，角質層蒸散阻抗提高，散水率降低 50%。';
      }
    },
    {
      id: 'su_tannin',
      name: '苦味單寧',
      category: '防禦',
      season: '夏',
      costSugar: 2,
      costWater: 0,
      brief: '免疫蟲害 (驅蟲)',
      desc: '葉片苦澀多刺，本年免疫害蟲啃咬。可完美化解【蚜蟲侵襲】危機！',
      flavor: '苯丙烷代謝途徑合成高分子多酚化合物——縮合單寧（Condensed tannins）。單寧與草食動物腸道唾液澱粉酶及蛋白質產生不可逆沉澱複合物，降低消化率並促發拒食行為（Antixenosis）。',
      isUnlocked: () => true,
      action: (state) => {
        state.buffs.tannin = true;
        state.scores.defense += 30;
        state.checkCrisisResolution('tannin');
        state.logMsg = '🛡️ 液泡積累縮合單寧多酚，建立化學抗食防禦機制。';
      }
    },
    {
      id: 'su_fleshy_fruit',
      name: '凝結果實',
      category: '繁殖',
      season: '夏',
      costSugar: 3,
      costWater: 0,
      brief: '漿果 +2 (鳥類散播)',
      desc: '花朵轉化為鮮美漿果！吸引鳥類食用遠播種子（種子 +35）。',
      flavor: '子房發育為肉質假果皮，作為強碳庫（Sink）大量吸收並積累可溶性單糖與花青素。透過多汁果肉吸引食果性鳥類取食，利用動物體內消化道傳播（Endozoochory）將耐酸種子散播至遠端生境。',
      unlockDesc: '需枝端已有花朵(花≥1)',
      isUnlocked: (state) => state.plant.flowers >= 1,
      canPlay: (state) => state.plant.flowers >= 1,
      action: (state) => {
        const converted = Math.min(2, state.plant.flowers);
        state.plant.flowers -= converted;
        state.plant.fruits += converted;
        state.seedsDispersed += converted * 20;
        state.scores.fitness += converted * 35;
        state.scores.mutualism += 20;
        state.logMsg = `🍒 ${converted} 枚花朵子房膨大為肉質果，誘發食果動物體內散播（種子 +${converted * 20}）。`;
      }
    },
    {
      id: 'su_stomata_close',
      name: '氣孔緊閉',
      category: '應變',
      season: '夏',
      costSugar: 0,
      costWater: 0,
      brief: '蒸散歸零 (保水避旱)',
      desc: '本月產糖減半，但蒸散失水降為 0（伏旱酷暑保命神技）。可化解【伏旱熱浪】。',
      flavor: '水脅迫促使根部合成脫落酸（ABA）並隨木質部上運。保衛細胞活化外向鉀通道引發離子流失與膨壓驟降，氣孔阻抗逼近無限大，中斷蒸散流以防止木質部導管負壓誘發空穴栓塞。',
      isUnlocked: () => true,
      action: (state) => {
        state.buffs.closedStomata = true;
        state.checkCrisisResolution('closedStomata');
        state.logMsg = '💧 ABA 訊號驅使保衛細胞失水關閉氣孔，蒸散散失強制中斷。';
      }
    }
  ],

  // 秋季 (9, 10, 11 月)
  autumn: [
    {
      id: 'au_winged_seed',
      name: '秋風翅果',
      category: '繁殖',
      season: '秋',
      costSugar: 1,
      costWater: 0,
      brief: '高空風播 (高度加成)',
      desc: '若有果實，依目前【高度】藉秋風乘風遠翔（每級高度種子 +15）。巨木流必備！',
      flavor: '心皮組織延伸特化為木栓化扁平膜翅（翅果 Samara）。利用非對稱質量分布產生空氣動力學自旋效應，降低終端沉降速度（Terminal velocity），在較高林冠層利用湍流實現大半徑風力散播（Anemochory）。',
      unlockDesc: '高度≥3 級 且 已有果實/花朵',
      isUnlocked: (state) => state.plant.height >= 3 && (state.plant.fruits >= 1 || state.plant.flowers >= 1),
      canPlay: (state) => state.plant.fruits >= 1 || state.plant.flowers >= 1,
      action: (state) => {
        const bonus = state.plant.height * 15;
        state.seedsDispersed += bonus;
        state.scores.fitness += bonus;
        state.checkCrisisResolution('wingedSeed');
        state.logMsg = `🍁 翅果自冠層高空實施空氣動力自旋散播，擴散種子 +${bonus} 枚。`;
      }
    },
    {
      id: 'au_chlorophyll_reabsorb',
      name: '落葉回收',
      category: '應變',
      season: '秋',
      costSugar: 0,
      costWater: 0,
      brief: '回收葡萄糖 (落葉過冬)',
      desc: '落葉休眠，每 2 片葉回收 1 點葡萄糖充實地下儲備，免受冬季凍害。',
      flavor: '日長縮短誘導程序性葉片衰老（Senescence）。葉綠素與光合蛋白質水解酶解，氮素與可溶性非結構性碳水化合物透過韌皮部再分配回流至莖幹與根部；葉柄基部離層細胞自溶脫落，避免冬季凍融與無效蒸散。',
      isUnlocked: () => true,
      canPlay: (state) => state.plant.leaves >= 2,
      action: (state) => {
        const gainedSugar = Math.floor(state.plant.leaves / 2);
        state.sugar = Math.min(state.sugarMax, state.sugar + gainedSugar);
        state.plant.leaves = 0;
        state.buffs.leafOff = true;
        state.logMsg = `🍂 葉柄離層自溶脫落，韌皮部回收轉運 ${gainedSugar} 單位非結構性碳水化合物入幹。`;
      }
    },
    {
      id: 'au_hard_coat',
      name: '堅硬種殼',
      category: '繁殖',
      season: '秋',
      costSugar: 2,
      costWater: 0,
      brief: '發芽率 +40% (抗凍)',
      desc: '賦予種子堅硬木質外殼，子代越冬存活發芽率 +40%。',
      flavor: '珠被組織發育為高度木質化之石細胞與厚壁組織，沉積酚酸與不透水聚合物。構築機械阻絕層以建立物理性種子休眠（Physical seed dormancy），防止微生物降解與低溫凍損，延遲發芽至低溫層積完成。',
      unlockDesc: '已有種子繁衍經驗(種子≥15)',
      isUnlocked: (state) => state.seedsDispersed >= 15,
      action: (state) => {
        state.scores.fitness += 30;
        state.scores.resilience += 20;
        state.checkCrisisResolution('hardCoat');
        state.logMsg = '🌰 外種皮沉積木質厚壁組織，建立低溫抗性與生理休眠保護。';
      }
    },
    {
      id: 'au_tuber_enlarge',
      name: '肥大塊根',
      category: '根系',
      season: '秋',
      costSugar: 3,
      costWater: 0,
      brief: '儲糖+4, 水限+4',
      desc: '地下塊根大幅膨脹，葡萄糖與水分儲備上限永久 +4！為第四至五年大爆發做資本累積。',
      flavor: '地下根部薄壁組織異常增生，造粉體（Amyloplasts）將韌皮部輸入之蔗糖合成不溶性澱粉粒沉積。形成高容量地下儲藏碳庫（Storage organ），提升非結構性碳水化合物（NSC）庫存上限以供應次年萌芽。',
      unlockDesc: '主根深≥2 級 且 葉片≥6 片',
      isUnlocked: (state) => state.plant.rootDepth >= 2 && state.plant.leaves >= 6,
      action: (state) => {
        state.sugarMax += 4;
        state.plant.hasTuber = true;
        state.updateWaterMax();
        state.logMsg = `🥔 根部薄壁細胞大量蓄積澱粉粒與水分，儲糖上限升至 ${state.sugarMax}，水限升至 ${state.waterMax}！`;
      }
    }
  ],

  // 冬季 (12, 1, 2 月)
  winter: [
    {
      id: 'wi_dormancy',
      name: '深層休眠',
      category: '應變',
      season: '冬',
      costSugar: 0,
      costWater: 0,
      brief: '本月維護能耗 0',
      desc: '暫停一切代謝活動，本月冬季基礎維護能耗降為 0，避免飢餓扣血。',
      flavor: '短日照與低溫觸發內生脫落酸（ABA）蓄積，頂端與形成層細胞週期停滯於 G1 期，進入內生休眠（Endodormancy）。粒線體維持呼吸速率壓制至最低限度，篩管篩板沉積胼胝質阻斷傳導，規避負碳消耗。',
      isUnlocked: () => true,
      action: (state) => {
        state.buffs.dormant = true;
        state.scores.resilience += 15;
        state.checkCrisisResolution('dormant');
        state.logMsg = '❄️ 植株建立內生休眠（Endodormancy），呼吸代謝能耗壓低至零。';
      }
    },
    {
      id: 'wi_antifreeze',
      name: '抗凍樹脂',
      category: '防禦',
      season: '冬',
      costSugar: 2,
      costWater: 0,
      brief: '免疫極端霜凍 (抗寒)',
      desc: '導管充盈防凍晶體，本季若遇極端寒流免受斷枝凍裂傷害。可化解【徹骨寒流】危機！',
      flavor: '低溫馴化（Cold acclimation）促發 CBF 轉錄級聯反應，細胞質積累脯胺酸、相容性寡糖與抗凍蛋白（AFP）。抗凍蛋白吸附冰晶邊界抑制冰晶重結晶擴大，降低原生質凍結點，避免木質部管胞發生致死性凍裂。',
      unlockDesc: '莖粗≥2 級',
      isUnlocked: (state) => state.plant.trunkCaliber >= 2,
      action: (state) => {
        state.buffs.antifreeze = true;
        state.scores.defense += 25;
        state.checkCrisisResolution('antifreeze');
        state.logMsg = '🛡️ 原生質積累抗凍蛋白與相容性溶質，阻斷組織內冰晶異常擴散。';
      }
    },
    {
      id: 'wi_self_prune',
      name: '自體修剪',
      category: '應變',
      season: '冬',
      costSugar: 0,
      costWater: 0,
      brief: '捨棄分枝換急救糖',
      desc: '主動枯死 1 根老舊分枝，換取 1 點急救葡萄糖度過寒冬。',
      flavor: '持續負碳平衡刺激植物活化自體修剪（Cladoptosis）與細胞自噬途徑。受脅迫側枝基部形成木栓隔離帶截斷物質交換，並回收殘留可溶性碳水化合物至主軸，保護核心頂端分生組織存活。',
      unlockDesc: '需長有分枝(側枝≥1)',
      isUnlocked: (state) => state.plant.branches.length >= 1,
      canPlay: (state) => state.plant.branches.length > 0,
      action: (state) => {
        state.plant.branches.pop();
        state.sugar = Math.min(state.sugarMax, state.sugar + 1);
        state.plant.scars.push('winter_prune');
        state.scores.resilience += 20;
        state.logMsg = '✂️ 啟動自體修剪（Cladoptosis），封閉弱小側枝並回撤 1 單位碳化合物。';
      }
    },
    {
      id: 'wi_snow_insulation',
      name: '積雪保溫',
      category: '防禦',
      season: '冬',
      costSugar: 1,
      costWater: 0,
      brief: '春季解凍水分 +3',
      desc: '利用蓬鬆積雪為地下根部覆被保暖，春季（3月）土壤解凍融雪時額外提供 +3 水分！',
      flavor: '蓬鬆雪層的多孔性結構具極低導熱率（0.05~0.15 W/m·K），構成地表被覆隔熱層（Subnivean layer）。抑制低溫凍土層向下侵蝕傷害幼嫩吸收根，春季融雪時轉化為穩定入滲之土壤孔隙重力水。',
      isUnlocked: () => true,
      action: (state) => {
        state.buffs.snowInsulation = true;
        state.scores.resilience += 15;
        state.logMsg = '☃️ 地表積雪隔熱層形成，防止凍土深層凍結，預備春季土壤融雪灌溉 +3 水分。';
      }
    }
  ]
};

// 3. 環境危機生態數據庫（多重逆境並存）
const CRISIS_DATABASE = [
  {
    id: 'crisis_weed',
    icon: '🌾',
    title: '草本群落冠層遮陰競爭',
    seasons: ['spring', 'summer'],
    desc: '月末檢驗：株高若 < 2 級，冠層遮陰將扣減 1 點葡萄糖。',
    solutionText: '打出【抽主幹】垂直伸長突破遮陰',
    checkResolved: (state) => state.plant.height >= 2,
    penalty: (state) => {
      if (state.plant.height < 2) {
        state.sugar = Math.max(0, state.sugar - 1);
        return '💥 遮陰競爭：未突破地表草本層，受光受阻損耗 1 葡萄糖。';
      }
      return null;
    }
  },
  {
    id: 'crisis_spring_frost',
    icon: '❄️',
    title: '早春晚霜花芽凍害',
    seasons: ['spring'],
    desc: '月末檢驗：低溫冰晶將凍死生殖花芽組織（損耗 1 朵花）。',
    solutionText: '打出【深層休眠】或【抗凍樹脂】保護組織',
    requiredKeys: ['dormant', 'antifreeze'],
    penalty: (state) => {
      if (state.plant.flowers > 0) {
        state.plant.flowers--;
        state.plant.scars.push('spring_frost_flower');
        return '💥 晚霜受害：未受抗凍保護的花芽組織受凍壞死（花 -1）。';
      }
      return null;
    }
  },
  {
    id: 'crisis_phosphorus',
    icon: '🧪',
    title: '土壤有效磷耗竭脅迫',
    seasons: ['spring', 'autumn'],
    desc: '月末檢驗：根際磷酸鹽耗竭致細胞分裂受阻，吸收阻力上升扣減 1 水分。',
    solutionText: '打出【菌根共生】或【長側根】拓展吸收網',
    checkResolved: (state) => state.perks.mycorrhizae || state.plant.rootWidth >= 2,
    penalty: (state) => {
      state.water = Math.max(0, state.water - 1);
      return '💥 磷素空竭：根毛無機磷酸鹽吸收阻力上升，無機水鹽傳輸受阻（水 -1）。';
    }
  },
  {
    id: 'crisis_drought',
    icon: '🔥',
    title: '夏季伏旱水分脅迫',
    seasons: ['summer'],
    desc: '月末檢驗：土壤可用水分為 0 時引發嚴重導管水壓萎蔫，損耗 2 片葉。',
    solutionText: '打出【氣孔緊閉】或【蠟質防曬】阻絕蒸散',
    requiredKeys: ['closedStomata', 'waxyLeaves'],
    penalty: (state) => {
      if (state.water <= 0 && state.plant.leaves > 1) {
        state.plant.leaves = Math.max(1, state.plant.leaves - 2);
        state.plant.scars.push('drought_scorch');
        return '💥 水脅迫超限：嚴重萎蔫導致 2 片同化葉壞死脫落！';
      }
      return null;
    }
  },
  {
    id: 'crisis_aphid',
    icon: '🦟',
    title: '植食性蚜蟲族群爆發',
    seasons: ['summer'],
    desc: '月末檢驗：刺吸式害蟲群集吸取韌皮部同化汁液（損耗 2 片嫩葉）。',
    solutionText: '打出【苦味單寧】啟動次生多酚化學抗食防禦',
    requiredKeys: ['tannin'],
    penalty: (state) => {
      if (state.plant.leaves >= 2) {
        state.plant.leaves = Math.max(1, state.plant.leaves - 2);
        state.plant.scars.push('aphid_loss');
        return '💥 植食危害：刺吸式蚜蟲持續取食，2 片嫩葉受損脫落！';
      }
      return null;
    }
  },
  {
    id: 'crisis_fungus',
    icon: '🍄',
    title: '高溫高濕真菌葉斑侵染',
    seasons: ['summer', 'autumn'],
    desc: '月末檢驗：病原真菌菌絲穿透氣孔壁，損耗 1 片同化葉。',
    solutionText: '打出【蠟質防曬】角質防禦 或【苦味單寧】抑制菌絲',
    requiredKeys: ['waxyLeaves', 'tannin'],
    penalty: (state) => {
      if (state.plant.leaves > 1) {
        state.plant.leaves -= 1;
        state.plant.scars.push('fungal_spot');
        return '💥 真菌侵染：葉表病原菌穿透角質層，1 片葉片枯斑壞死！';
      }
      return null;
    }
  },
  {
    id: 'crisis_gale',
    icon: '🌪️',
    title: '秋季陣風風載荷切力',
    seasons: ['autumn'],
    desc: '月末檢驗：若次生木質部與直根錨定不足，強剪力折斷頂芽（株高 -1）。',
    solutionText: '打出【加粗莖幹】沉積木質素 或【長主根】加固錨定',
    checkResolved: (state) => (state.plant.trunkCaliber * 1.6 + state.plant.rootDepth * 1.2) >= (state.plant.height * 1.8),
    penalty: (state) => {
      if (state.plant.height > 2) {
        state.plant.height -= 1;
        state.plant.scars.push('gale_break');
        return '💥 機械剪切超載：橫向風切剪力超過抗彎極限，主幹頂端機械折損（高度 -1）！';
      }
      return null;
    }
  },
  {
    id: 'crisis_seed_predation',
    icon: '🐿️',
    title: '林下囓齒動物種子捕食',
    seasons: ['autumn'],
    desc: '月末檢驗：未硬化種子掉落將遭林下小型哺乳類啃食（損耗 10 顆種子）。',
    solutionText: '打出【堅硬種殼】物理休眠 或【秋風翅果】高空散播',
    requiredKeys: ['hardCoat', 'wingedSeed'],
    penalty: (state) => {
      if (state.seedsDispersed >= 10) {
        state.seedsDispersed -= 10;
        return '💥 種子遭捕食：缺乏物理防禦種皮，10 顆落土種子遭囓齒類啃食損耗。';
      }
      return null;
    }
  },
  {
    id: 'crisis_frost',
    icon: '❄️',
    title: '低溫霜凍胞外結冰脅迫',
    seasons: ['winter'],
    desc: '月末檢驗：胞外冰晶穿刺與原生質脫水導致木栓壞死（損耗 1 根分枝）。',
    solutionText: '打出【抗凍樹脂】積累抗凍蛋白與相容性溶質',
    requiredKeys: ['antifreeze'],
    penalty: (state) => {
      if (state.plant.branches.length > 0) {
        state.plant.branches.pop();
        state.plant.scars.push('frost_loss');
        return '💥 凍融機械損傷：導管未達抗凍馴化閾值，冰晶穿刺導致 1 根分枝凍裂脫落！';
      }
      return null;
    }
  },
  {
    id: 'crisis_carbon_starvation',
    icon: '🥶',
    title: '極寒深冬持續負碳平衡',
    seasons: ['winter'],
    desc: '月末檢驗：維持呼吸持續消耗儲備，若無休眠或塊根將損耗 1 葡萄糖。',
    solutionText: '打出【深層休眠】壓抑呼吸能耗 或【肥大塊根】儲容充沛',
    checkResolved: (state) => state.buffs.dormant || state.plant.hasTuber,
    penalty: (state) => {
      state.sugar = Math.max(0, state.sugar - 1);
      return '💥 負碳消耗：深冬低溫維持代謝扣減 1 葡萄糖。';
    }
  }
];

// --- 二、 遊戲核心狀態機 (Game State) ---

class PlantGameEngine {
  constructor() {
    this.resetState();
    this.initCanvas();
    this.bindEvents();
    this.startTurn();
  }

  resetState() {
    this.turn = 1; // 1 ~ 60
    this.year = 1;
    this.month = 3; // 從第 1 年 3 月 (春) 開始

    // 植物形態結構數據 (Procedural Plant Tree)
    this.plant = {
      height: 1,        // 1 ~ 8 級
      trunkCaliber: 1,  // 莖粗 1 ~ 8
      rootDepth: 1,     // 根深 1 ~ 6
      rootWidth: 1,     // 根幅 1 ~ 6
      leaves: 2,        // 總葉片數
      flowers: 0,
      fruits: 0,
      hasTuber: false,
      branches: [],     // 側枝清單
      scars: []         // 傷痕歷史 (如 'wind_break', 'frost_wound')
    };

    // 資源體系 (小數值)
    this.sugar = 4;
    this.sugarMax = 8; // 提升初始上限，給予葉片產糖足夠成長空間
    this.updateWaterMax();
    this.water = 6;
    this.sunlight = 1.0;
    this.seedsDispersed = 0;

    // 生態評分維度
    this.scores = {
      fitness: 0,    // 繁殖子代
      majesty: 0,    // 巨木體量
      resilience: 0, // 逆境韌性
      mutualism: 0,  // 動物/真菌共生
      defense: 0     // 抗蟲抗風防禦
    };

    // 狀態 Buff
    this.buffs = {
      nectar: false,
      waxyLeaves: false,
      tannin: false,
      closedStomata: false,
      leafOff: false,
      dormant: false,
      antifreeze: false,
      snowInsulation: false
    };

    this.perks = {
      mycorrhizae: false
    };

    this.weather = { name: '和煦春風', icon: '🌤️', sun: 1.0, rain: 2, wind: 1 };
    this.hand = [];
    this.showUnavailableCards = false; // 預設隱藏不可用手牌
    this.logMsg = '種子萌發建立初生根系與子葉同化器官，啟動 60 回合植物生活史模擬。';

    // 環境危機卡清單（支援多張並存）
    this.activeCrises = [];
  }

  // 水分容積電容計算（側根拓展根際、次生木質部加粗、地下塊根均顯著擴大水力緩衝容積）
  calculateWaterMax() {
    return 7 + (this.plant.rootWidth * 2) + this.plant.trunkCaliber + (this.plant.hasTuber ? 4 : 0);
  }

  updateWaterMax() {
    this.waterMax = this.calculateWaterMax();
    if (this.water > this.waterMax) {
      this.water = this.waterMax;
    }
  }

  // --- 三、 季節與環境計算 ---

  getSeason() {
    if (this.month >= 3 && this.month <= 5) return 'spring';
    if (this.month >= 6 && this.month <= 8) return 'summer';
    if (this.month >= 9 && this.month <= 11) return 'autumn';
    return 'winter';
  }

  getSeasonNameZh() {
    const s = this.getSeason();
    if (s === 'spring') return '春';
    if (s === 'summer') return '夏';
    if (s === 'autumn') return '秋';
    return '冬';
  }

  generateWeather() {
    const s = this.getSeason();
    const roll = Math.random();

    if (s === 'spring') {
      if (roll < 0.4) this.weather = { name: '春風和煦', icon: '🌤️', sun: 1.0, rain: 2, wind: 1 };
      else if (roll < 0.7) this.weather = { name: '春雨綿綿', icon: '🌧️', sun: 0.8, rain: 4, wind: 1 };
      else this.weather = { name: '早春晚霜', icon: '❄️', sun: 0.7, rain: 1, wind: 2, isFrost: true };
    } else if (s === 'summer') {
      if (roll < 0.45) this.weather = { name: '艷陽普照', icon: '☀️', sun: 1.4, rain: 1, wind: 1 };
      else if (roll < 0.75) this.weather = { name: '伏旱酷暑', icon: '🔥', sun: 1.6, rain: 0, wind: 1, isDrought: true };
      else this.weather = { name: '夏季暴風雨', icon: '⛈️', sun: 0.7, rain: 5, wind: 4, isStorm: true };
    } else if (s === 'autumn') {
      if (roll < 0.5) this.weather = { name: '天高氣爽', icon: '🍂', sun: 1.1, rain: 1, wind: 2 };
      else if (roll < 0.8) this.weather = { name: '蕭瑟秋風', icon: '💨', sun: 0.9, rain: 1, wind: 4, isWindy: true };
      else this.weather = { name: '連綿秋雨', icon: '🌧️', sun: 0.6, rain: 3, wind: 2 };
    } else {
      if (roll < 0.5) this.weather = { name: '乾冷晴空', icon: '🌤️', sun: 0.8, rain: 0, wind: 2 };
      else if (roll < 0.8) this.weather = { name: '瑞雪覆地', icon: '🌨️', sun: 0.5, rain: 1, wind: 2 };
      else this.weather = { name: '極端極寒寒流', icon: '🥶', sun: 0.4, rain: 0, wind: 5, isDeepFreeze: true };
    }
  }

  // --- 四、 回合循環 (Turn Cycle：實質生存挑戰與抉擇壓力) ---

  startTurn() {
    this.generateWeather();
    this.updateWaterMax();

    // 0. 春季解凍檢查 (積雪保溫生效)
    let snowMeltBonus = 0;
    if (this.month === 3 && this.buffs.snowInsulation) {
      snowMeltBonus = 3;
      this.buffs.snowInsulation = false;
    }

    // 1. 水分結算 (深層主根汲水 + 廣布側根吸水 + 雨季截流加成 + 菌根共生)
    // - 主根 (Taproot)：深層土壤常態汲水，提供穩定基底供水
    const taprootAbsorb = Math.floor(this.plant.rootDepth * 1.0);
    // - 側根 (Lateral roots)：大幅擴展根際截水面，每級側根在降雨時額外截流汲水 +2
    const lateralAbsorb = Math.floor(this.plant.rootWidth * 1.0);
    const rainCatch = this.weather.rain > 0 
      ? (this.weather.rain + (this.plant.rootWidth * 2)) 
      : 0;
    const mycorrhizaeBonus = this.perks.mycorrhizae ? 1 : 0;
    const totalRootAbsorb = taprootAbsorb + lateralAbsorb + rainCatch + mycorrhizaeBonus + snowMeltBonus;

    const oldWater = this.water;
    this.water = Math.min(this.waterMax, this.water + totalRootAbsorb);
    const actualWaterGained = this.water - oldWater;

    // 2. 蒸散失水機制 (葉片越多失水越劇烈，主根深扎建立水基質緩解伏旱)
    let actualTranspiration = 0;
    if (!this.buffs.closedStomata && !this.buffs.leafOff) {
      let transpiration = Math.ceil(this.plant.leaves * 0.35); // 葉片蒸散代價
      if (this.buffs.waxyLeaves) transpiration = Math.ceil(transpiration * 0.5);
      if (this.weather.isDrought) {
        // 主根深扎建立深層水基質連結，每 2 級深根減少 1 點乾旱失水 (抗旱加成)
        const droughtMitigation = Math.min(2, Math.floor(this.plant.rootDepth * 0.5));
        transpiration += Math.max(1, 3 - droughtMitigation);
      }
      const beforeLoss = this.water;
      this.water = Math.max(0, this.water - transpiration);
      actualTranspiration = beforeLoss - this.water;
    }

    // 3. 光合作用產糖 (每片葉片製造葡萄糖，受日照、高度、水分影響)
    let heightBonus = 0.8 + (this.plant.height * 0.08); // 爭奪光照
    let waterFactor = 1.0;
    if (this.water <= 1) waterFactor = 0.2; // 極度萎蔫
    else if (this.water <= 3) waterFactor = 0.6; // 輕度缺水

    let effectiveLeaves = this.buffs.leafOff ? 0 : this.plant.leaves;
    let sugarProduced = Math.round(effectiveLeaves * 0.7 * this.weather.sun * heightBonus * waterFactor);

    if (this.buffs.closedStomata) sugarProduced = Math.floor(sugarProduced * 0.5);
    if (this.plant.leaves === 0 && this.plant.height >= 1) sugarProduced = 1; // 綠莖微弱產能

    const oldSugar = this.sugar;
    this.sugar = Math.min(this.sugarMax, this.sugar + sugarProduced);
    const actualGained = this.sugar - oldSugar;

    // 4. 基礎維持代謝耗損 (植物體量越大，維護成本越高)
    let maintenance = 0;
    if (this.plant.height >= 3 && this.plant.height <= 5) maintenance = 1;
    if (this.plant.height >= 6) maintenance = 2;
    if (this.plant.leaves >= 12) maintenance += 1;
    if (this.buffs.dormant) maintenance = 0;
    if (this.perks.mycorrhizae) maintenance += 0.5;

    let starved = false;
    if (this.sugar < Math.floor(maintenance)) {
      this.sugar = 0;
      if (this.plant.leaves > 2) {
        this.plant.leaves -= 2;
        this.plant.scars.push('starvation_leaf_loss');
        starved = true;
      }
    } else {
      this.sugar = Math.max(0, this.sugar - Math.floor(maintenance));
    }

    // 月初生態綜述日誌：根系吸水與光合產糖清晰列出
    let waterLogDetail = `汲水 +${actualWaterGained}`;
    if (this.weather.rain > 0) {
      waterLogDetail += ` (側根雨季汲水 +${this.plant.rootWidth * 2})`;
    }
    if (snowMeltBonus > 0) {
      waterLogDetail += ` (積雪融水 +${snowMeltBonus})`;
    }

    if (starved) {
      this.logMsg = '⚠️ 碳飢餓：同化產物儲備不足以支應維持呼吸消耗，下層老葉自溶壞死。';
    } else {
      this.logMsg = `🌱 【${this.month}月生態】根系${waterLogDetail}，${effectiveLeaves}片葉產糖 +${actualGained} (蒸散 -${actualTranspiration})`;
    }

    // 5. 抽取季節手牌 (抽 3 張)
    this.drawSeasonHand();

    // 6. 生成或更新當前環境危機卡（支援多張並存）
    this.generateCrises();

    // 7. 重置單月 Buff
    this.buffs.closedStomata = false;
    this.buffs.dormant = false;

    this.updateUI();
    this.renderPlant();
  }

  // 生成大自然敵人/危機卡（多張並存，第1年2張，第2-5年2~3張）
  generateCrises() {
    const season = this.getSeason();
    // 依年份與隨機性決定當月併發危機卡數量：第 1 年 2 張；第 2~5 年 2~3 張！
    const count = this.year === 1 ? 2 : (Math.random() < 0.6 ? 2 : 3);

    // 篩選適合當前季節的候選危機池
    let candidates = CRISIS_DATABASE.filter(c => c.seasons.includes(season));

    // 洗牌抽樣，確保不重複
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const selected = candidates.slice(0, count);

    // 實例化為當月活躍危機卡清單，並檢查初始是否已由現有器官/Buff化解
    this.activeCrises = selected.map(c => {
      const isResolved = (c.checkResolved && c.checkResolved(this)) ||
                         (c.requiredKeys && c.requiredKeys.some(k => this.buffs[k]));
      return {
        ...c,
        resolved: !!isResolved
      };
    });
  }

  // 當打出特定對策卡牌時，化解所有匹配的危機
  checkCrisisResolution(key) {
    if (!this.activeCrises || this.activeCrises.length === 0) return;
    let newlyResolvedCount = 0;
    this.activeCrises.forEach(crisis => {
      if (!crisis.resolved) {
        if (crisis.requiredKeys && crisis.requiredKeys.includes(key)) {
          crisis.resolved = true;
          this.scores.resilience += 15;
          this.scores.defense += 15;
          newlyResolvedCount++;
        }
      }
    });
    if (newlyResolvedCount > 0) {
      this.logMsg = `🎉 生理適應生效！成功化解了 ${newlyResolvedCount} 項環境威脅！`;
    }
  }

  // 自動檢驗條件型危機（例如：高度突破遮陰、木質度抗風剪、菌根吸收等）
  checkAllCrisesResolution() {
    if (!this.activeCrises || this.activeCrises.length === 0) return;
    this.activeCrises.forEach(crisis => {
      if (!crisis.resolved) {
        if (crisis.checkResolved && crisis.checkResolved(this)) {
          crisis.resolved = true;
          this.scores.resilience += 15;
          this.scores.defense += 15;
        }
      }
    });
  }

  // 抽取季節手牌：只從「已滿足生理里程碑解鎖」的卡牌中進行「不重複隨機抽樣」！
  drawSeasonHand() {
    const season = this.getSeason();
    // 篩選當前季節中已解鎖的卡牌
    let pool = SEASON_CARDS[season].filter(card => !card.isUnlocked || card.isUnlocked(this));

    // 若解鎖池不足 3 張，保底備份基礎卡牌
    if (pool.length < 3) {
      pool = [...SEASON_CARDS[season]];
    }
    
    // 費雪耶茲洗牌 (Fisher-Yates Shuffle)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 取前 3 張互不重複的已解鎖卡牌
    const uniqueCards = pool.slice(0, 3);
    this.hand = uniqueCards.map((card, idx) => ({
      ...card,
      uniqueId: `${card.id}_${Date.now()}_${idx}`
    }));
  }

  endTurn() {
    // 月末環境敵人/危機結算
    this.resolveCrisisAndEvents();

    if (this.turn >= 60) {
      this.triggerEndgame();
      return;
    }

    // 進入下個月
    this.turn++;
    this.month++;
    if (this.month > 12) {
      this.month = 1;
      this.year++;
      this.buffs.waxyLeaves = false;
      this.buffs.tannin = false;
      this.buffs.nectar = false;
      this.buffs.leafOff = false;
      this.buffs.antifreeze = false;
    }

    this.startTurn();
  }

  resolveCrisisAndEvents() {
    const season = this.getSeason();

    // 結算當月全數環境危機
    if (this.activeCrises && this.activeCrises.length > 0) {
      let resolvedCount = 0;
      let penaltyMsgs = [];

      this.activeCrises.forEach(crisis => {
        if (crisis.resolved) {
          resolvedCount++;
        } else {
          if (crisis.penalty) {
            const msg = crisis.penalty(this);
            if (msg) penaltyMsgs.push(msg);
          }
        }
      });

      if (resolvedCount === this.activeCrises.length) {
        this.logMsg = `🛡️ 月末檢驗全部通過：成功抵禦了全數 ${resolvedCount} 項環境危機！`;
      } else if (penaltyMsgs.length > 0) {
        this.logMsg = penaltyMsgs[0];
      }
    }

    // 自然授粉成果 (春花入夏結果)
    if (season === 'summer' && this.plant.flowers > 0) {
      const successRate = this.buffs.nectar ? 0.95 : 0.45;
      if (Math.random() < successRate) {
        this.plant.flowers--;
        this.plant.fruits++;
        this.seedsDispersed += 18;
        this.scores.fitness += 20;
        this.logMsg = '🌸 蟲媒傳粉受精成功：子房發育為肉質果器官，累積散播種子 +18 枚。';
      }
    }
  }

  // --- 五、 卡牌操作 (Play Card) ---

  playCard(card) {
    if (this.sugar < card.costSugar || this.water < card.costWater) {
      this.logMsg = '❌ 資源不足，無法進行此生理生長！';
      this.updateUI();
      return;
    }
    if (card.canPlay && !card.canPlay(this)) {
      this.logMsg = '⚠️ 目前已達發育上限或未滿足生長條件！';
      this.updateUI();
      return;
    }

    this.sugar -= card.costSugar;
    this.water -= card.costWater;

    card.action(this);

    // 每打出一張卡牌，自動更新各項條件型危機之化解狀態（如高度、木質、菌根等）
    this.checkAllCrisesResolution();

    // 如果打出的是季節手牌（具有 uniqueId），則從手牌移除
    if (card.uniqueId) {
      this.hand = this.hand.filter(c => c.uniqueId !== card.uniqueId);
    }

    this.updateUI();
    this.renderPlant();
  }

  // --- 六、 結局結算 (Endgame Calculation: 嚴格標準化 0 ~ 100) ---

  triggerEndgame(isPreview = false) {
    const isMidGame = this.turn < 60;
    const tagElem = document.querySelector('#modal-endgame .botanical-tag');
    const subtitleElem = document.getElementById('end-subtitle');
    const closeBtn = document.getElementById('btn-close-endgame');
    const restartBtn = document.getElementById('btn-restart');

    if (tagElem) {
      tagElem.textContent = isMidGame 
        ? 'HERBARIUM SPECIMEN PREVIEW · 標本圖鑑即時預覽' 
        : 'HERBARIUM SPECIMEN ARCHIVE · 標本圖鑑典藏';
    }
    if (subtitleElem) {
      subtitleElem.textContent = isMidGame 
        ? `Plantae Aeterna · 當前發育評定 (第 ${this.year} 年 ${this.month} 月 / 共 60 月)` 
        : 'Plantae Aeterna · 演化歷程五年記 (第 60 月完結)';
    }
    if (closeBtn) {
      closeBtn.innerHTML = isMidGame 
        ? '🌿 返回遊戲畫面 (繼續本局)' 
        : '🔍 返回遊戲畫面 (檢視全局)';
      closeBtn.className = isMidGame ? 'btn-primary-action' : 'btn-secondary-outline';
    }
    if (restartBtn) {
      restartBtn.className = isMidGame ? 'btn-secondary-outline' : 'btn-primary-action';
    }

    // 1. 各維度原始累積計算
    const rawBiomass = (this.plant.height * 12) + (this.plant.trunkCaliber * 10) + (this.plant.leaves * 1.5) + (this.plant.branches.length * 5);
    const rawFitness = (this.scores.fitness * 0.8) + (this.seedsDispersed * 0.6);
    const rawResilience = (this.scores.resilience * 0.7) + (this.plant.rootDepth * 8) + (this.plant.scars.length * 10);
    const rawMutualism = this.scores.mutualism * 1.2;
    const rawDefense = this.scores.defense * 1.2;

    // 2. 嚴格映射與標準化至 0 ~ 100 分 (封頂 100，保底 0)
    const biomassScore = Math.min(100, Math.max(10, Math.round((rawBiomass / 120) * 100)));
    const fitnessScore = Math.min(100, Math.max(0, Math.round((rawFitness / 100) * 100)));
    const resilienceScore = Math.min(100, Math.max(10, Math.round((rawResilience / 90) * 100)));
    const mutualismScore = Math.min(100, Math.max(0, Math.round((rawMutualism / 80) * 100)));
    const defenseScore = Math.min(100, Math.max(0, Math.round((rawDefense / 80) * 100)));

    // 綜合總適應度 (0 ~ 100 加權平均)
    const totalScore = Math.round((biomassScore * 0.25) + (fitnessScore * 0.3) + (resilienceScore * 0.2) + (mutualismScore * 0.15) + (defenseScore * 0.1));

    // 評定演化稱號（基於生活史理論與 Grime CSR 植物生活型模型）
    let title = '廣義環境耐受型（Generalist Strategist）';
    let verdict = '在 60 回合跨季環境梯度下，植株維持了碳同化、結構生物量與生殖投入的基礎動態平衡。';

    if (fitnessScore >= 75) {
      title = 'r-對策伺機開拓型（r-Strategist Opportunist）';
      verdict = `【r-選擇生活史極致 · 適應度 ${fitnessScore}/100】高生殖分配係數（Reproductive effort）。將非結構性碳同化產物優先配置於花果器官與散播構造，累積散播 ${this.seedsDispersed} 枚種子，建立大尺度拓殖土壤種子庫。`;
    } else if (biomassScore >= 80) {
      title = 'K-對策頂極優勢種（K-Selection Climax Dominant）';
      verdict = `【K-選擇演替頂極木本 · 生物量 ${biomassScore}/100】高木質生物量分配。優先進行軸向主幹加粗、立體多層次側枝分化與深層直根錨定，在森林冠層取得光合有效輻射（PAR）截獲優勢與空間占據。`;
    } else if (resilienceScore >= 70 && this.plant.scars.length >= 2) {
      title = 'S-對策逆境耐受型（S-Strategist Stress-Tolerator）';
      verdict = `【Grime CSR 逆境耐受模型 · 韌性 ${resilienceScore}/100】多次遭受乾旱水分脅迫、低溫凍害及風剪機械破壞，藉由次生防禦沉積、水力構型維護與自體修剪（Cladoptosis）維持核心分生組織存活，展現長壽型木本耐受特徵。`;
    }

    // 填充彈窗 UI
    document.getElementById('end-title').textContent = title;
    document.getElementById('score-fitness').textContent = `${fitnessScore} / 100`;
    document.getElementById('score-majesty').textContent = `${biomassScore} / 100`;
    document.getElementById('score-resilience').textContent = `${resilienceScore} / 100`;
    document.getElementById('score-total').textContent = `${totalScore} / 100`;
    document.getElementById('end-verdict').textContent = verdict;

    // 先移除 hidden 類別讓彈窗在 DOM 中佈局完成，再獲取寬高繪製 Canvas
    const modal = document.getElementById('modal-endgame');
    modal.classList.remove('hidden');

    // 使用 requestAnimationFrame 確保彈窗尺寸已由瀏覽器完成排版計算
    requestAnimationFrame(() => {
      // 繪製五維標準化雷達圖 (全部為 0 ~ 100)
      this.renderRadarChart({
        biomass: biomassScore,
        fitness: fitnessScore,
        resilience: resilienceScore,
        mutualism: mutualismScore,
        defense: defenseScore
      });

      // 繪製植物標本高清寫真照片
      this.renderSpecimenCanvas();
    });
  }

  // --- 七、 Canvas 向量程序化生長植物渲染 (Procedural Plant Rendering) ---

  initCanvas() {
    this.canvas = document.getElementById('plant-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    const handleResize = () => {
      this.resizeCanvas();
      this.renderPlant();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
    });
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  renderPlant() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const groundY = h * 0.65; // 地平線位置 (上方 65% 天空，下方 35% 土壤)

    // 1. 繪製地表與分界
    ctx.save();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // 繪製地底土壤顆粒/石塊裝飾
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.restore();

    const rootStartX = w / 2;
    const rootStartY = groundY;

    // 2. 繪製地下根系 (向下扎深)
    ctx.save();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineCap = 'round';
    
    // 主根 (Taproot)
    const rootDepthPx = Math.max(35, this.plant.rootDepth * 32);
    ctx.lineWidth = 3 + this.plant.trunkCaliber * 0.9;
    ctx.beginPath();
    ctx.moveTo(rootStartX, rootStartY);
    // 主根二次貝茲曲線
    const ctrlX = rootStartX - 6;
    const ctrlY = rootStartY + rootDepthPx * 0.5;
    const endX = rootStartX;
    const endY = rootStartY + rootDepthPx;
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();

    // 側根 (Lateral roots)：必須嚴格發育自主根主幹表面，不得在沒有主根的虛空中懸空生長！
    const lateralExtent = 18 + (this.plant.rootWidth * 16);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#a1887f';

    const rootCount = this.plant.rootWidth;
    for (let i = 1; i <= rootCount; i++) {
      // t 介於 0.15 到 0.85 之間，確保側根完全分佈在主根實體長度之內
      const t = 0.15 + (i / (rootCount + 1)) * 0.7;
      
      // 計算主根二次貝茲曲線在參數 t 處的精確座標 (x, y)
      // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const attachX = ((1 - t) * (1 - t) * rootStartX) + (2 * (1 - t) * t * ctrlX) + (t * t * endX);
      const attachY = ((1 - t) * (1 - t) * rootStartY) + (2 * (1 - t) * t * ctrlY) + (t * t * endY);

      // 側根交錯向左、向右斜下方自然延展
      // 左側根
      ctx.beginPath();
      ctx.moveTo(attachX, attachY);
      ctx.quadraticCurveTo(attachX - lateralExtent * 0.45, attachY + 12, attachX - lateralExtent, attachY + 22);
      ctx.stroke();

      // 右側根
      ctx.beginPath();
      ctx.moveTo(attachX, attachY);
      ctx.quadraticCurveTo(attachX + lateralExtent * 0.45, attachY + 14, attachX + lateralExtent, attachY + 24);
      ctx.stroke();
    }

    // 塊根 (Tuber)
    if (this.plant.hasTuber) {
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.ellipse(rootStartX, rootStartY + 25, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. 繪製地上主幹 (Trunk)
    ctx.save();
    const stemHeightPx = this.plant.height * 36;
    const trunkCaliberPx = 4 + this.plant.trunkCaliber * 2.5;

    // 主幹顏色：隨木質化轉深
    ctx.strokeStyle = this.plant.trunkCaliber >= 3 ? '#4e342e' : '#558b2f';
    ctx.lineWidth = trunkCaliberPx;
    ctx.lineCap = 'round';

    const stemTopX = rootStartX;
    const stemTopY = groundY - stemHeightPx;

    ctx.beginPath();
    ctx.moveTo(rootStartX, groundY);
    // 微弧度自然感
    ctx.quadraticCurveTo(rootStartX + 6, groundY - stemHeightPx * 0.5, stemTopX, stemTopY);
    ctx.stroke();

    // 4. 繪製側枝 (Branches)
    this.plant.branches.forEach((branch, idx) => {
      const branchBaseY = groundY - (stemHeightPx * branch.heightRatio);
      const branchLength = branch.length;
      const targetX = rootStartX + (branch.side * branchLength);
      const targetY = branchBaseY - 20;

      ctx.save();
      ctx.strokeStyle = this.plant.trunkCaliber >= 3 ? '#5d4037' : '#689f38';
      ctx.lineWidth = Math.max(2, trunkCaliberPx * 0.55);
      ctx.beginPath();
      ctx.moveTo(rootStartX, branchBaseY);
      ctx.quadraticCurveTo(rootStartX + (branch.side * branchLength * 0.4), branchBaseY - 15, targetX, targetY);
      ctx.stroke();

      // 枝頭附著的花朵
      if (branch.flowers > 0) {
        this.drawFlower(ctx, targetX, targetY - 6);
      }
      // 枝頭附著的果實
      if (branch.fruits > 0) {
        this.drawFruit(ctx, targetX, targetY + 6);
      }
      ctx.restore();
    });

    // 5. 繪製葉片 (Leaves - 沿著主幹與側枝分佈的自然互生/對生葉片)
    if (this.plant.leaves > 0 && !this.buffs.leafOff) {
      let leafColor = '#4caf50'; // 春夏健康綠
      if (this.getSeason() === 'autumn') leafColor = '#e65100'; // 深秋橙紅
      if (this.weather.isDrought) leafColor = '#9e9d24'; // 乾旱枯黃
      if (this.buffs.waxyLeaves) leafColor = '#2e7d32'; // 加厚蠟質深綠

      this.renderBotanicalLeaves(ctx, rootStartX, groundY, stemHeightPx, leafColor);
    }

    // 6. 繪製主幹頂端花朵/果實 (若無側枝時掛在頂端)
    if (this.plant.branches.length === 0) {
      if (this.plant.flowers > 0) {
        this.drawFlower(ctx, stemTopX - 10, stemTopY - 10);
      }
      if (this.plant.fruits > 0) {
        this.drawFruit(ctx, stemTopX + 10, stemTopY - 5);
      }
    }

    // 7. 繪製疤痕 (Scars)
    if (this.plant.scars.length > 0) {
      ctx.fillStyle = '#2d1810';
      this.plant.scars.forEach((scar, i) => {
        const scarY = groundY - (15 + i * 25);
        ctx.beginPath();
        ctx.ellipse(rootStartX + 2, scarY, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // 自然植物學葉片分佈：沿著主幹與側枝節間互生，帶葉柄與葉脈朝向
  renderBotanicalLeaves(ctx, startX, groundY, stemHeight, color) {
    let leavesLeft = this.plant.leaves;
    const trunkCaliberPx = 4 + this.plant.trunkCaliber * 2.5;

    // 1. 沿主幹兩側互生分佈葉片
    const mainStemLeaves = Math.min(leavesLeft, 8);
    for (let i = 1; i <= mainStemLeaves; i++) {
      const ratio = 0.2 + (i / (mainStemLeaves + 1)) * 0.75;
      const attachY = groundY - (stemHeight * ratio);
      const side = (i % 2 === 0) ? 1 : -1;
      const attachX = startX + (side * (trunkCaliberPx * 0.5));
      const angle = side === 1 ? -0.35 : -Math.PI + 0.35; // 微微向上斜長

      this.drawSingleBotanicalLeaf(ctx, attachX, attachY, angle, 16, color);
      leavesLeft--;
    }

    // 2. 剩餘葉片分佈在各個側枝兩側
    if (leavesLeft > 0 && this.plant.branches.length > 0) {
      const leavesPerBranch = Math.ceil(leavesLeft / this.plant.branches.length);
      this.plant.branches.forEach(branch => {
        const branchBaseY = groundY - (stemHeight * branch.heightRatio);
        const branchLen = branch.length;
        const count = Math.min(leavesLeft, leavesPerBranch);

        for (let j = 1; j <= count; j++) {
          const t = j / (count + 1);
          const attachX = startX + (branch.side * branchLen * t);
          const attachY = branchBaseY - (20 * t);
          const leafSide = (j % 2 === 0) ? 1 : -1;
          const baseAngle = branch.side === 1 ? -0.4 : -Math.PI + 0.4;
          const leafAngle = baseAngle + (leafSide * 0.45);

          this.drawSingleBotanicalLeaf(ctx, attachX, attachY, leafAngle, 14, color);
          leavesLeft--;
          if (leavesLeft <= 0) break;
        }
      });
    }

    // 3. 頂芽頂端一對向上舒展的小嫩葉
    if (leavesLeft > 0 || this.plant.leaves >= 2) {
      const topY = groundY - stemHeight;
      this.drawSingleBotanicalLeaf(ctx, startX, topY, -1.2, 13, color);
      this.drawSingleBotanicalLeaf(ctx, startX, topY, -1.9, 13, color);
    }
  }

  // 繪製單片帶有葉柄與自然披針葉形/葉脈的葉片
  drawSingleBotanicalLeaf(ctx, x, y, angle, length, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 葉柄
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();

    // 葉面 (披針葉形)
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0, 40, 0, 0.35)';
    ctx.lineWidth = 0.8;

    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(length * 0.5, -length * 0.38, length, 0); // 上緣弧線
    ctx.quadraticCurveTo(length * 0.5, length * 0.38, 4, 0);  // 下緣弧線
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 葉片主葉脈
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(length * 0.85, 0);
    ctx.stroke();

    ctx.restore();
  }

  drawFlower(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#f48fb1'; // 嬌嫩淡粉花瓣
    for (let i = 0; i < 5; i++) {
      const angle = i * (Math.PI * 2 / 5);
      const px = x + Math.cos(angle) * 7;
      const py = y + Math.sin(angle) * 7;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 花心
    ctx.fillStyle = '#ffee58';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFruit(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#e53935'; // 鮮紅多汁果實
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 1.5, 0, Math.PI * 2); // 高光
    ctx.fill();
    ctx.restore();
  }

  // --- 八、 結局視覺與雷達圖繪製 ---

  renderRadarChart(data) {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 90;

    ctx.clearRect(0, 0, w, h);

    const labels = ['生物量', '繁殖力', '逆境適應', '共生度', '防禦力'];
    const values = [data.biomass, data.fitness, data.resilience, data.mutualism, data.defense];
    const totalAxes = 5;

    // 繪製背景五邊形環網
    ctx.strokeStyle = '#bcaaa4';
    ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level++) {
      const r = (radius / 4) * level;
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (i * 2 * Math.PI / totalAxes) - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 繪製軸線與標籤
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < totalAxes; i++) {
      const angle = (i * 2 * Math.PI / totalAxes) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      const labelX = cx + (radius + 18) * Math.cos(angle);
      const labelY = cy + (radius + 18) * Math.sin(angle);
      ctx.fillText(labels[i], labelX, labelY);
    }

    // 繪製數據多邊形
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < totalAxes; i++) {
      const normVal = Math.min(100, Math.max(15, values[i])) / 100;
      const angle = (i * 2 * Math.PI / totalAxes) - Math.PI / 2;
      const x = cx + (radius * normVal) * Math.cos(angle);
      const y = cy + (radius * normVal) * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 繪製植物標本高清寫真照片 (Botanical Herbarium Specimen Plate)
  renderSpecimenCanvas() {
    const canvas = document.getElementById('endgame-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // 確保有足夠的默認尺寸
    const w = container.clientWidth || 450;
    const h = container.clientHeight || 480;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    // 1. 繪製仿古羊皮紙底色與精細內襯框
    ctx.fillStyle = '#f8f3e6';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // 2. 計算植物整體垂直高度與縮放比 (Scale-to-fit)
    const stemHeightPx = this.plant.height * 36;
    const rootDepthPx = Math.max(35, this.plant.rootDepth * 32);
    const totalPlantHeight = stemHeightPx + rootDepthPx;
    
    // 理想顯示高度留 40px 上下留白
    const availableHeight = h - 80;
    const scale = Math.min(1.2, Math.max(0.65, availableHeight / Math.max(120, totalPlantHeight)));

    ctx.save();
    // 將原點置中於標本畫布
    ctx.translate(w / 2, 0);

    // 計算地平線 Y 座標，使整株植物剛好垂直居中
    const groundY = 40 + (stemHeightPx * scale);

    // 地表虛線 (植物地上與地下分界標註)
    ctx.strokeStyle = 'rgba(141, 110, 99, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 20, groundY);
    ctx.lineTo(w / 2 - 20, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 縮放並繪製植物
    ctx.scale(scale, scale);

    // 臨時替換渲染參數調用核心植物繪製
    const oldCtx = this.ctx;
    const oldCanvas = this.canvas;
    this.ctx = ctx;
    this.canvas = { width: w / scale, height: h / scale };

    // 繪製地下根系
    const rootStartX = 0;
    const rootStartY = groundY / scale;

    ctx.save();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineCap = 'round';
    
    // 主根
    ctx.lineWidth = 3 + this.plant.trunkCaliber * 0.9;
    const ctrlX = -6;
    const ctrlY = rootStartY + rootDepthPx * 0.5;
    const endX = 0;
    const endY = rootStartY + rootDepthPx;
    ctx.beginPath();
    ctx.moveTo(rootStartX, rootStartY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();

    // 側根
    const lateralExtent = 18 + (this.plant.rootWidth * 16);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#a1887f';
    const rootCount = this.plant.rootWidth;
    for (let i = 1; i <= rootCount; i++) {
      const t = 0.15 + (i / (rootCount + 1)) * 0.7;
      const attachX = ((1 - t) * (1 - t) * rootStartX) + (2 * (1 - t) * t * ctrlX) + (t * t * endX);
      const attachY = ((1 - t) * (1 - t) * rootStartY) + (2 * (1 - t) * t * ctrlY) + (t * t * endY);

      ctx.beginPath();
      ctx.moveTo(attachX, attachY);
      ctx.quadraticCurveTo(attachX - lateralExtent * 0.45, attachY + 12, attachX - lateralExtent, attachY + 22);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(attachX, attachY);
      ctx.quadraticCurveTo(attachX + lateralExtent * 0.45, attachY + 14, attachX + lateralExtent, attachY + 24);
      ctx.stroke();
    }

    if (this.plant.hasTuber) {
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.ellipse(rootStartX, rootStartY + 25, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 繪製地上主幹
    ctx.save();
    const trunkCaliberPx = 4 + this.plant.trunkCaliber * 2.5;
    ctx.strokeStyle = this.plant.trunkCaliber >= 3 ? '#4e342e' : '#558b2f';
    ctx.lineWidth = trunkCaliberPx;
    ctx.lineCap = 'round';
    const stemTopX = 0;
    const stemTopY = rootStartY - stemHeightPx;

    ctx.beginPath();
    ctx.moveTo(0, rootStartY);
    ctx.quadraticCurveTo(6, rootStartY - stemHeightPx * 0.5, stemTopX, stemTopY);
    ctx.stroke();

    // 繪製側枝
    this.plant.branches.forEach(branch => {
      const branchBaseY = rootStartY - (stemHeightPx * branch.heightRatio);
      const targetX = branch.side * branch.length;
      const targetY = branchBaseY - 20;

      ctx.save();
      ctx.strokeStyle = this.plant.trunkCaliber >= 3 ? '#5d4037' : '#689f38';
      ctx.lineWidth = Math.max(2, trunkCaliberPx * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, branchBaseY);
      ctx.quadraticCurveTo(branch.side * branch.length * 0.4, branchBaseY - 15, targetX, targetY);
      ctx.stroke();

      if (branch.flowers > 0) this.drawFlower(ctx, targetX, targetY - 6);
      if (branch.fruits > 0) this.drawFruit(ctx, targetX, targetY + 6);
      ctx.restore();
    });

    // 繪製植物學葉片
    if (this.plant.leaves > 0) {
      this.renderBotanicalLeaves(ctx, 0, rootStartY, stemHeightPx, '#4caf50');
    }

    if (this.plant.branches.length === 0) {
      if (this.plant.flowers > 0) this.drawFlower(ctx, stemTopX - 10, stemTopY - 10);
      if (this.plant.fruits > 0) this.drawFruit(ctx, stemTopX + 10, stemTopY - 5);
    }

    ctx.restore();

    this.ctx = oldCtx;
    this.canvas = oldCanvas;
    ctx.restore();

    // 3. 標本左下角與右下角植物學註記標籤
    ctx.font = '10px "Noto Serif TC", serif';
    ctx.fillStyle = '#8d6e63';
    ctx.textAlign = 'left';
    ctx.fillText(`• 株高：${(this.plant.height * 1.8).toFixed(1)}m (Level ${this.plant.height})`, 18, h - 36);
    ctx.fillText(`• 主根深：${(this.plant.rootDepth * 0.7).toFixed(1)}m | 側根幅：Level ${this.plant.rootWidth} | 莖徑：${this.plant.trunkCaliber * 12}mm`, 18, h - 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#5d4037';
    ctx.fillText(`標本採集：第 5 年 12 月`, w - 18, h - 36);
    ctx.fillText(`子代繁衍記錄：${this.seedsDispersed} 枚種子`, w - 18, h - 22);
  }

  // --- 九、 UI 更新與互動綁定 ---

  updateUI() {
    this.updateWaterMax();
    document.getElementById('ui-year').textContent = `第 ${this.year} 年`;
    document.getElementById('ui-month').textContent = `${this.month}月 · ${this.getSeasonNameZh()}`;
    document.getElementById('ui-turn-step').textContent = `回合 ${this.turn} / 60`;

    document.getElementById('ui-sugar').textContent = `${this.sugar} / ${this.sugarMax}`;
    document.getElementById('ui-water').textContent = `${this.water} / ${this.waterMax}`;
    document.getElementById('ui-sun').textContent = `${this.weather.sun.toFixed(1)}x`;
    document.getElementById('ui-seeds').textContent = this.seedsDispersed;

    document.getElementById('ui-weather-icon').textContent = this.weather.icon;
    document.getElementById('ui-weather-text').textContent = this.weather.name;

    document.getElementById('stat-height').textContent = `${this.plant.height} 級`;
    document.getElementById('stat-trunk').textContent = `${this.plant.trunkCaliber}`;
    document.getElementById('stat-leaves').textContent = `${this.plant.leaves} 片`;
    document.getElementById('stat-root-depth').textContent = `${this.plant.rootDepth} 級`;
    const statRootWidth = document.getElementById('stat-root-width');
    if (statRootWidth) statRootWidth.textContent = `${this.plant.rootWidth} 級`;
    document.getElementById('stat-flowers').textContent = this.plant.flowers;
    document.getElementById('stat-fruits').textContent = this.plant.fruits;

    const handCountEl = document.getElementById('hand-count');
    if (handCountEl) handCountEl.textContent = this.hand.length;
    document.getElementById('latest-event-msg').textContent = this.logMsg;

    // 更新環境危機卡（大自然敵人）
    this.updateCrisisUI();

    this.renderCards();
  }

  updateCrisisUI() {
    const container = document.getElementById('crisis-container');
    const list = document.getElementById('crisis-list');
    const countEl = document.getElementById('crisis-active-count');

    if (!this.activeCrises || this.activeCrises.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }
    if (container) container.style.display = 'flex';

    const unresolvedCount = this.activeCrises.filter(c => !c.resolved).length;
    if (countEl) {
      countEl.textContent = `${this.activeCrises.length} 項 · ${unresolvedCount > 0 ? unresolvedCount + ' 未防禦' : '全部已化解 ✓'}`;
      countEl.style.color = unresolvedCount > 0 ? '#ff8a80' : '#a5d6a7';
    }

    if (list) {
      list.innerHTML = '';
      this.activeCrises.forEach(crisis => {
        const cardEl = document.createElement('div');
        cardEl.className = `crisis-card ${crisis.resolved ? 'resolved' : ''}`;
        cardEl.innerHTML = `
          <div class="crisis-header">
            <span class="crisis-tag">${crisis.resolved ? '✓ 危機已抵禦' : '⚠️ 環境威脅'}</span>
            <span class="crisis-timer">結算：月末</span>
          </div>
          <div class="crisis-body">
            <div class="crisis-icon">${crisis.icon}</div>
            <div class="crisis-info">
              <div class="crisis-title">${crisis.title}</div>
              <div class="crisis-desc">${crisis.desc}</div>
              <div class="crisis-counter"><strong>對策：</strong>${crisis.solutionText}</div>
            </div>
          </div>
          <div class="crisis-status-badge">${crisis.resolved ? '已化解 ✓' : '未防禦 ✕'}</div>
        `;
        list.appendChild(cardEl);
      });
    }
  }

  renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    // 集中手牌：將本季手牌 (SEASON_CARDS) 與 常態發育卡 (CORE_CARDS) 合併展示
    // 本季隨機手牌排在前面，常態發育卡隨後
    const allCards = [...this.hand, ...CORE_CARDS];

    allCards.forEach(card => {
      const isUnlocked = !card.isUnlocked || card.isUnlocked(this);
      const canAfford = this.sugar >= card.costSugar && this.water >= card.costWater;
      const canPlay = !card.canPlay || card.canPlay(this);
      const isAvailable = isUnlocked && canAfford && canPlay;

      // 如果「預設隱藏不可用」且該牌當前不可用（或未解鎖），則直接跳過不渲染
      if (!this.showUnavailableCards && !isAvailable) {
        return;
      }

      const cardEl = document.createElement('div');
      cardEl.className = `card-item ${isAvailable ? '' : 'disabled'} ${isUnlocked ? '' : 'locked'}`;
      
      let costBadges = '';
      if (!isUnlocked) {
        costBadges = `🔒 鎖定`;
      } else {
        if (card.costSugar > 0) costBadges += `⬢${card.costSugar} `;
        if (card.costWater > 0) costBadges += `💧${card.costWater}`;
        if (!costBadges) costBadges = '免費';
      }

      // 精簡卡面：未解鎖時顯示解鎖條件，已解鎖時顯示簡短摘要
      const displayBrief = !isUnlocked 
        ? `<span style="color:#ffab91;">🔒 解鎖：${card.unlockDesc}</span>`
        : (card.brief || card.desc);

      cardEl.innerHTML = `
        <div class="card-cost-badge" style="${!isUnlocked ? 'color:#ff8a80;border-color:rgba(255,138,128,0.4);' : ''}">${costBadges}</div>
        <button class="btn-card-info" title="查看詳細生理說明">ⓘ</button>
        <div class="card-type-tag">【${card.category}】</div>
        <div class="card-title">${card.name}</div>
        <div class="card-brief">${displayBrief}</div>
      `;

      // 點擊 ⓘ 打開詳細資訊彈窗
      const infoBtn = cardEl.querySelector('.btn-card-info');
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCardInfo(card, costBadges);
      });

      // 點擊卡牌本體執行出牌
      cardEl.addEventListener('click', () => {
        if (!isUnlocked) {
          this.logMsg = `🔒 尚未解鎖【${card.name}】！需達成條件：${card.unlockDesc}`;
          this.updateUI();
          return;
        }
        if (isAvailable) {
          this.playCard(card);
        }
      });

      container.appendChild(cardEl);
    });

    // 若篩選後沒有任何卡牌，顯示提示
    if (container.children.length === 0) {
      const emptyTip = document.createElement('div');
      emptyTip.style.color = '#90a4ae';
      emptyTip.style.fontSize = '14px';
      emptyTip.style.display = 'flex';
      emptyTip.style.alignItems = 'center';
      emptyTip.style.padding = '0 20px';
      emptyTip.textContent = '🌿 當前葡萄糖或水分不足以進行新發育，可勾選上方「顯示暫不可用手牌」或結束本月積累資源。';
      container.appendChild(emptyTip);
    }
  }

  showCardInfo(card, costBadges) {
    document.getElementById('info-card-name').textContent = card.name;
    document.getElementById('info-card-cat').textContent = `【${card.category}】`;
    document.getElementById('info-card-cost').textContent = costBadges;
    document.getElementById('info-card-desc').textContent = card.desc;
    document.getElementById('info-card-flavor').textContent = card.flavor || '源於植物大自然的生理調控。';

    document.getElementById('modal-card-info').classList.remove('hidden');
  }

  bindEvents() {
    document.getElementById('btn-end-turn').addEventListener('click', () => {
      this.endTurn();
    });

    // 勾選開關：切換是否顯示暫時無法啟用的手牌
    const toggleUnavailable = document.getElementById('toggle-unavailable');
    if (toggleUnavailable) {
      toggleUnavailable.checked = this.showUnavailableCards;
      toggleUnavailable.addEventListener('change', (e) => {
        this.showUnavailableCards = e.target.checked;
        this.renderCards();
      });
    }

    // 關閉卡牌 info 彈窗
    document.getElementById('btn-close-info').addEventListener('click', () => {
      document.getElementById('modal-card-info').classList.add('hidden');
    });

    document.getElementById('modal-card-info').addEventListener('click', (e) => {
      if (e.target.id === 'modal-card-info') {
        document.getElementById('modal-card-info').classList.add('hidden');
      }
    });

    // 關閉標本彈窗（返回遊戲畫面）
    const closeEndgameModal = () => {
      document.getElementById('modal-endgame').classList.add('hidden');
      this.renderPlant();
    };

    const closeEndgameBtn = document.getElementById('btn-close-endgame');
    if (closeEndgameBtn) {
      closeEndgameBtn.addEventListener('click', closeEndgameModal);
    }

    const closeEndgameX = document.getElementById('btn-close-endgame-x');
    if (closeEndgameX) {
      closeEndgameX.addEventListener('click', closeEndgameModal);
    }

    document.getElementById('modal-endgame').addEventListener('click', (e) => {
      if (e.target.id === 'modal-endgame') {
        closeEndgameModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalEnd = document.getElementById('modal-endgame');
        if (modalEnd && !modalEnd.classList.contains('hidden')) {
          closeEndgameModal();
        }
        const modalInfo = document.getElementById('modal-card-info');
        if (modalInfo && !modalInfo.classList.contains('hidden')) {
          modalInfo.classList.add('hidden');
        }
      }
    });

    // 隨時點擊預覽 5 年植物標本寫真相片按鈕
    const previewBtn = document.getElementById('btn-preview-endgame');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        this.triggerEndgame(true);
      });
    }

    document.getElementById('btn-restart').addEventListener('click', () => {
      if (this.turn < 60) {
        if (!confirm(`目前遊戲尚未結束（第 ${this.year} 年 ${this.month} 月），確定要放棄當前植株進度並開啟新的輪迴嗎？`)) {
          return;
        }
      }
      document.getElementById('modal-endgame').classList.add('hidden');
      this.resetState();
      this.startTurn();
    });

    // --- 觸控平板與連點防誤觸優化 (Tablet & Multi-tap zoom prevention) ---
    // 阻止手勢縮放 (Pinch-to-zoom prevention for Safari / iOS touch devices)
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

    // 阻止快速雙擊引發頁面放大 (Double-tap zoom prevention)
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
}

// 頁面載入完成後啟動遊戲
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new PlantGameEngine();
});

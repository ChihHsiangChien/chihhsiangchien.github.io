/**
 * 葉片橫切面生物學解剖知識資料庫 (leaf_data.js)
 * 包含形態構造、生理功能、葉綠體分佈、解剖層位與重要科學考點
 */

const LEAF_ANATOMY_DATA = {
  cuticle_upper: {
    id: 'cuticle_upper',
    nameZh: '上角質層',
    nameEn: 'Upper Cuticle (Adaxial Cuticle)',
    category: '表面保護層',
    layer: '葉片最上層 (近軸面)',
    hasChloroplast: '無 (非細胞結構)',
    color: '#5eead4',
    hex: 0x5eead4,
    morphology: '由表皮細胞向外分泌的角質 (Cutin) 與蠟質組成的連續非細胞均質薄膜，表面光滑具光澤，厚度通常大於下角質層。',
    function: '防止體內水分過度非受控蒸發散失；抵禦病原菌、真菌孢子侵入；反射過強紫外線並具疏水自潔效應。',
    trivia: '【生物亮點】旱生植物的上角質層特別肥厚（如榕樹、山茶），甚至可形成厚蠟層以應對強光和乾旱；水生植物則相對極薄或退化。'
  },
  epidermis_upper: {
    id: 'epidermis_upper',
    nameZh: '上表皮細胞',
    nameEn: 'Upper Epidermis (Adaxial Epidermis)',
    category: '表皮組織系統',
    layer: '緊鄰上角質層下方',
    hasChloroplast: '無 (透光透明)',
    color: '#93c5fd',
    hex: 0x93c5fd,
    morphology: '單層緊密排列的扁平或磚狀細胞，無細胞間隙。具大型中央液泡，細胞壁外壁較厚，原生質體透明。',
    function: '機械保護內部幼嫩的葉肉組織；透明無色特性可讓太陽光高透光率穿透至深層的柵狀組織進行光合作用。',
    trivia: '【核心考點】普通表皮細胞「不含葉綠體」，這是植物演化出的優異光學適應，確保陽光直達光合作用主力區。'
  },
  mesophyll_palisade: {
    id: 'mesophyll_palisade',
    nameZh: '柵狀組織 (柵狀葉肉)',
    nameEn: 'Palisade Mesophyll Tissue',
    category: '葉肉同化組織',
    layer: '上表皮正下方',
    hasChloroplast: '極多 (光合作用核心)',
    color: '#22c55e',
    hex: 0x22c55e,
    morphology: '長圓柱形細胞，垂直於葉表呈柵欄狀緊密直立排列（1~2層）。細胞質周邊富含極高密度的雙凸透鏡狀葉綠體。',
    function: '植物體進行「光合作用」的最主要場所。直立排列結構有助於光線沿著細胞垂直深層傳導（光導效應），並最大化捕捉光量子。',
    trivia: '【顯微動態】當光照過強時，柵狀細胞內的葉綠體可沿著細胞骨架移動至細胞側壁以防光灼傷（背光運動）；在弱光下則移向迎光面以最大化吸光。'
  },
  mesophyll_spongy: {
    id: 'mesophyll_spongy',
    nameZh: '海綿組織 (海綿葉肉)',
    nameEn: 'Spongy Mesophyll Tissue',
    category: '葉肉通氣同化組織',
    layer: '柵狀組織下方至下表皮之間',
    hasChloroplast: '中等量 (少於柵狀細胞)',
    color: '#84cc16',
    hex: 0x84cc16,
    morphology: '形狀不規則或星芒分枝狀，排列疏鬆，細胞間留有非常發達且互相連通的細胞間隙 (氣室) 與氣孔下腔。',
    function: '一方面輔助進行光合作用；另一方面廣大的氣室提供了二氧化碳 (CO2) 快速擴散至葉肉細胞、以及光合產生的 O2 與水蒸氣向氣孔逸散的氣體通道。',
    trivia: '【結構關聯】海綿組織氣室在氣孔上方形成「氣孔下腔 (Substomatal Chamber)」，與下表皮氣孔直接對接，構成了植物蒸散拉力與氣體交換的天然網絡。'
  },
  guard_cells: {
    id: 'guard_cells',
    nameZh: '保衛細胞 (成對)',
    nameEn: 'Guard Cells (Pair)',
    category: '氣孔器複合體',
    layer: '分佈於下表皮 (背軸面)',
    hasChloroplast: '有 (特化含葉綠體)',
    color: '#10b981',
    hex: 0x10b981,
    morphology: '成對出現呈腎形或半月形。特別特徵是：靠近氣孔孔隙的「內壁顯著增厚且缺乏彈性」，背對孔隙的「外壁較薄且具高延展性」。',
    function: '感應光線、CO2 濃度及水分狀況，透過鉀離子 (K+) 幫浦改變自身膨壓，主動調節氣孔開合大小，精準控制氣體交換與水分蒸散。',
    trivia: '【開合機制重點】照光時鉀離子泵主動將 K+ 運入保衛細胞，細胞水勢降低吸水膨脹；因內壁厚、外壁薄且微纖維徑向排列，吸水時外壁向外彎曲凸起，將氣孔拉開！'
  },
  stoma_pore: {
    id: 'stoma_pore',
    nameZh: '氣孔孔隙',
    nameEn: 'Stomatal Pore',
    category: '氣體與蒸散門戶',
    layer: '由成對保衛細胞所圍成之微孔',
    hasChloroplast: '無 (微觀物理孔洞)',
    color: '#06b6d4',
    hex: 0x06b6d4,
    morphology: '顯微透鏡狀微孔，其幾何大小隨兩側保衛細胞之膨壓動態連續變化（可從完全閉合到寬度數微米至十數微米）。',
    function: '植物體與外界大氣進行氣體交換（吸入 CO2、釋放 O2）以及水分蒸散作用 (Transpiration) 的最關鍵門戶。',
    trivia: '【生態常識】雙子葉植物葉片下表皮的氣孔數量通常遠多於上表皮（有的上表皮完全無氣孔），此結構特徵可避免陽光直射導致過劇水分蒸散。'
  },
  chloroplasts: {
    id: 'chloroplasts',
    nameZh: '葉綠體 (細胞器群)',
    nameEn: 'Chloroplasts (Organelles)',
    category: '雙層膜光合胞器',
    layer: '位於柵狀細胞、海綿細胞及保衛細胞中',
    hasChloroplast: '本體即為葉綠體',
    color: '#00ff88',
    hex: 0x00ff88,
    morphology: '直徑約 4~6 μm 的雙凸透鏡狀或微橢圓球體。內部含有由類囊體 (Thylakoids) 堆疊形成的基粒 (Grana) 以及基質 (Stroma)。',
    function: '綠色植物進行光反應 (類囊體膜，合成 ATP/NADPH、釋出 O2) 及卡爾文循環暗反應 (基質，固定 CO2 合成葡萄糖碳水化合物) 的能量轉換中心。',
    trivia: '【重大細節】在葉片中：柵狀細胞葉綠體含量最高（佔約 70~80%），海綿細胞次之，保衛細胞亦具備葉綠體；而一般的上、下表皮細胞則完全不具葉綠體！'
  },
  xylem: {
    id: 'xylem',
    nameZh: '木質部 (導管與管胞)',
    nameEn: 'Xylem Vessels & Tracheids',
    category: '維管束輸導組織',
    layer: '維管束內側：靠近上表皮側 (近軸面)',
    hasChloroplast: '無 (死細胞厚壁管狀)',
    color: '#38bdf8',
    hex: 0x38bdf8,
    morphology: '由長管狀導管分子組成，成熟後原生質體解體消失成為中空死細胞管道。細胞壁經次生加厚並木質化，具螺紋、梯紋或孔紋增厚。',
    function: '透過蒸散拉力、根壓與毛細吸力，由根部向葉片輸送水分及溶解於其中的無機礦物質鹽類。',
    trivia: '【解剖方位關鍵】葉片橫切面中，木質部「永遠位於近上表皮側（上方）」，韌皮部「位於近下表皮側（下方）」，這是由莖部維管束向葉柄發育伸展時的方向決定。'
  },
  phloem: {
    id: 'phloem',
    nameZh: '韌皮部 (篩管與伴細胞)',
    nameEn: 'Phloem Sieve Tube & Companion Cells',
    category: '維管束輸導組織',
    layer: '維管束內側：靠近下表皮側 (遠軸面)',
    hasChloroplast: '無 (專化活細胞)',
    color: '#f43f5e',
    hex: 0xf43f5e,
    morphology: '由縱向排列的管狀篩管分子與緊鄰的伴細胞組成。端壁特化為多孔之篩板 (Sieve Plate)；伴細胞具細胞核負責代謝維持。',
    function: '透過壓力流機制 (Pressure-flow hypothesis)，將葉肉光合作用產生的蔗糖及有機同化物輸送到植物其他器官（如根、果實、生長點）。',
    trivia: '【輸導對比】木質部主要向上單向運送水分與礦物質；韌皮部則可在「源 (Source)」與「庫 (Sink)」之間雙向調節有機養分輸送。'
  },
  bundle_sheath: {
    id: 'bundle_sheath',
    nameZh: '維管束鞘 (鞘細胞)',
    nameEn: 'Bundle Sheath Cells',
    category: '維管束保護與代謝圍層',
    layer: '緊密環繞木質部與韌皮部外圍',
    hasChloroplast: '微量至富含 (C4植物發達)',
    color: '#a78bfa',
    hex: 0xa78bfa,
    morphology: '單層或數層排列緊密的薄壁細胞，如同套管般緊密包裹整個葉脈維管束。',
    function: '隔離保護維管束，調控葉肉與維管束間的水分和溶質交換；在 C4 植物中特化為「花環結構 (Kranz anatomy)」，負責濃縮固定 CO2。',
    trivia: '【結構防漏】束鞘細胞排列密實無間隙，能防止氣室中的氣體進入木質部引起導管氣穴栓塞 (Embolism)，維持水分輸送的連續水柱。'
  },
  epidermis_lower: {
    id: 'epidermis_lower',
    nameZh: '下表皮細胞',
    nameEn: 'Lower Epidermis (Abaxial Epidermis)',
    category: '表皮組織系統',
    layer: '葉片底部，包含氣孔複合體',
    hasChloroplast: '無 (透光保護)',
    color: '#93c5fd',
    hex: 0x93c5fd,
    morphology: '形狀與上表皮相似之拼圖狀單層細胞，壁薄，外被較薄之角質層。嵌有大量成對的保衛細胞與氣孔器。',
    function: '構成葉片底部天然屏障，保護內部海綿組織；與保衛細胞共同構成協同通氣蒸散面。',
    trivia: '【數量對比】雙子葉植物每平方毫米下表皮通常有 100~300 個氣孔，而上表皮可能只有幾十個甚至為零，有助於大幅減緩受陽光照射時的蒸散失水。'
  },
  cuticle_lower: {
    id: 'cuticle_lower',
    nameZh: '下角質層',
    nameEn: 'Lower Cuticle (Abaxial Cuticle)',
    category: '表面保護層',
    layer: '葉片最底層 (背軸面)',
    hasChloroplast: '無 (非細胞結構)',
    color: '#5eead4',
    hex: 0x5eead4,
    morphology: '下表皮外分泌的非細胞角質膜，因避開陽光直射，通常比上角質層顯著較薄，並在每個氣孔位置留有開孔通氣。',
    function: '保護下表皮免受脫水與病害感染，同時允許氣孔作為受控通道調節氣體交換。',
    trivia: '【厚薄生物學義涵】背光面因蒸散驅動力較低，角質層適度變薄可節省植物合成蠟質與角質的高能耗代謝成本。'
  }
};

window.LEAF_ANATOMY_DATA = LEAF_ANATOMY_DATA;

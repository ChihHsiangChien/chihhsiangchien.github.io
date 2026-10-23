/**
 * 3D 細胞與胞器教學知識庫 (Traditional Chinese Educational Data)
 * 嚴謹對齊高中與國中生物課綱：細胞生理學、能量轉換與胞器構造
 */

export const MODEL_DATA = {
  animalCell: {
    id: "animalCell",
    name: "動物細胞全景",
    enName: "Animal Cell Overview",
    badge: "真核真菌與動物細胞",
    membraneType: "單層外膜包裹多種胞器",
    summary: "動物細胞是真核生物的基本結構與功能單位。由細胞膜包覆細胞質，內部具有以膜區隔的多種胞器，各自執行特化的生化代謝功能，展現精密的細胞分工體系。",
    dimensions: "直徑約 10 ~ 30 μm",
    curriculumFacts: [
      "真核細胞的核心特徵為具有由核膜包被的細胞核及具膜胞器。",
      "不具細胞壁與葉綠體，通常無大型中央液胞（植物細胞具備）。",
      "能量由粒線體透過有氧呼吸合成 ATP；蛋白質由核糖體合成並經由內質網與高基氏體加工運輸。"
    ],
    structures: [
      {
        id: "nucleus",
        name: "細胞核 (Nucleus)",
        color: "#8b5cf6",
        desc: "雙層核膜包被，膜上有核孔供物質進出；內含染色質（DNA 與蛋白質）及核仁（合成核糖體 RNA 與次單元）。為細胞遺傳與代謝中樞。"
      },
      {
        id: "mitochondria",
        name: "粒線體 (Mitochondria)",
        color: "#f97316",
        desc: "細胞的「能量發電廠」，具雙層膜構造。內膜向內折疊形成嵴（Cristae），基質中進行檸檬酸循環，內膜進行電子傳遞鏈以產生大量 ATP。"
      },
      {
        id: "er",
        name: "內質網 (Endoplasmic Reticulum)",
        color: "#06b6d4",
        desc: "相連的網狀囊泡系統。粗糙內質網 (RER) 表面附著核糖體，負責蛋白質合成與修飾；平滑內質網 (SER) 無核糖體，負責脂質合成、毒素代謝與鈣離子儲存。"
      },
      {
        id: "golgi",
        name: "高基氏體 (Golgi Apparatus)",
        color: "#ec4899",
        desc: "細胞的「物流包裝中心」，由數層扁平囊泡堆疊而成。負責接收內質網送來的蛋白質進行糖基化修飾、分類包裝，並透過囊泡運往細胞內外。"
      },
      {
        id: "lysosome",
        name: "溶體 (Lysosome)",
        color: "#10b981",
        desc: "單層膜囊泡，內含多種水解酵素。負責分解吞入的異物、衰老破損的胞器（自噬作用），並參與細胞凋亡。"
      },
      {
        id: "centriole",
        name: "中心體 / 中心粒 (Centrioles)",
        color: "#fbbf24",
        desc: "由兩組互相垂直的中心粒組成，每個中心粒由 9 組三聯微管環狀排列而成。在動物細胞分裂時負責組織微管形成紡錘絲。"
      },
      {
        id: "membrane",
        name: "細胞膜 (Cell Membrane)",
        color: "#38bdf8",
        desc: "磷脂質雙分子層鑲嵌蛋白質之流體鑲嵌構造，具選擇通透性，調控物質進出並維持細胞內外滲透壓恆定。"
      }
    ]
  },

  mitochondria: {
    id: "mitochondria",
    name: "粒線體雙層膜剖面",
    enName: "Mitochondrion Structure & Cristae",
    badge: "雙層膜半自主胞器",
    membraneType: "雙層膜（平滑外膜 + 摺疊內膜）",
    summary: "粒線體是真核細胞有氧呼吸與能量代謝的核心場所。根據內共生學說，粒線體起源於古代吞入的好氧原核變形菌，保有自立的環狀雙股 DNA 與 70S 核糖體。",
    dimensions: "長約 1 ~ 4 μm，寬約 0.5 ~ 1.0 μm",
    curriculumFacts: [
      "內膜向內深度摺疊成「嵴」(Cristae)，將表面積擴大數倍，極大化電子傳遞鏈與 ATP 合成酶之密度。",
      "膜間腔蓄積電子傳遞鏈泵出的質子 ($H^+$)，形成跨膜質子濃度梯度（化學滲透假說）。",
      "基質含有環狀 mtDNA、70S 核糖體及檸檬酸循環關鍵酵素，能自主合成部分結構蛋白。"
    ],
    structures: [
      {
        id: "outerMembrane",
        name: "平滑外膜 (Outer Membrane)",
        color: "#f97316",
        desc: "含有豐富的「孔蛋白 (Porin)」，具較高通透性，允許分子量小於 5000 Da 的小分子與離子自由擴散。"
      },
      {
        id: "innerMembrane",
        name: "內膜與嵴 (Inner Membrane & Cristae)",
        color: "#fbbf24",
        desc: "高度選擇通透性，富含心磷脂。深入基質形成密集的嵴褶，鑲嵌有電子傳遞鏈四大複合物與 ATP 合成酶旋轉馬達。"
      },
      {
        id: "intermembraneSpace",
        name: "膜間腔 (Intermembrane Space)",
        color: "#fdba74",
        desc: "內外膜之間的狹窄水相空間，電子傳遞鏈將質子由基質主動泵入此處，營造出高濃度質子動力位能。"
      },
      {
        id: "matrix",
        name: "粒線體基質 (Matrix)",
        color: "#fed7aa",
        desc: "內膜所包圍的凝膠狀液體環境，內含丙酮酸去羧反應與檸檬酸循環（克氏循環）所必需的數十種可溶性酵素。"
      },
      {
        id: "mtdna",
        name: "環狀粒線體 DNA (mtDNA)",
        color: "#34d399",
        desc: "裸露雙股環狀 DNA（無組蛋白包裹），由母系遺傳，編碼 13 種呼吸鏈核心次單元、22 種 tRNA 與 2 種 rRNA。"
      },
      {
        id: "ribosomes",
        name: "70S 核糖體 (Mitoribosomes)",
        color: "#60a5fa",
        desc: "大小沉降係數為 70S（類似細菌核糖體，而非細胞質的 80S），直接於基質內轉譯 mtDNA 轉錄之 mRNA。"
      }
    ]
  },

  chloroplast: {
    id: "chloroplast",
    name: "葉綠體構造與葉綠餅",
    enName: "Chloroplast & Thylakoid Grana",
    badge: "雙層膜光合作用胞器",
    membraneType: "雙層膜外被 + 第三層類囊體膜系統",
    summary: "植物與藻類特有的綠色能量轉換胞器。藉由葉綠素與光合色素捕捉光能，將水裂解產生氧氣與高能分子（ATP、NADPH），進而在基質中固定二氧化碳合成碳水化合物。",
    dimensions: "長約 4 ~ 10 μm，厚約 2 ~ 4 μm（雙凸扁圓盤狀）",
    curriculumFacts: [
      "內共生起源：源自古代被真核細胞內共生之光合藍綠菌（Cyanobacteria）。",
      "光反應於「類囊體膜」上進行：吸收光能、光解水放氧、產生 ATP 與 NADPH。",
      "碳反應（暗反應 / 卡爾文循環）於「基質」中進行：利用 Rubisco 酵素固定 $CO_2$。"
    ],
    structures: [
      {
        id: "envelope",
        name: "雙層被膜 (Outer & Inner Envelopes)",
        color: "#86efac",
        desc: "由平滑外膜與內膜組成。外膜具孔蛋白，內膜具有專一性轉運載體，調控三碳醣與代謝物之進出。"
      },
      {
        id: "grana",
        name: "葉綠餅 / 類囊體堆 (Grana Thylakoids)",
        color: "#15803d",
        desc: "由數個至數十個圓盤狀類囊體如硬幣般重疊而成。類囊體膜鑲嵌光系統 I (PSI)、光系統 II (PSII) 與葉綠素，為光反應主要基地。"
      },
      {
        id: "lamellae",
        name: "基質片層 (Stroma Lamellae)",
        color: "#22c55e",
        desc: "貫穿基質之平坦膜管通道，將不同的葉綠餅彼此串聯，形成一體連通的囊腔內部網路，主要富含光系統 I 與 ATP 合成酶。"
      },
      {
        id: "stroma",
        name: "葉綠體基質 (Stroma)",
        color: "#bbf7d0",
        desc: "圍繞類囊體周圍的膠狀溶液，內含大量 Rubisco 酵素、卡爾文循環相關酵素、cpDNA、70S 核糖體及澱粉儲存顆粒。"
      },
      {
        id: "starch",
        name: "暫存澱粉粒 (Starch Granules)",
        color: "#f8fafc",
        desc: "光合作用旺盛時合成的不溶性多醣儲存型態，夜晚則水解為蔗糖運往植物體各部利用。"
      }
    ]
  },

  rbc: {
    id: "rbc",
    name: "雙凹圓盤紅血球",
    enName: "Erythrocyte (Red Blood Cell)",
    badge: "特化無核無胞器血球細胞",
    membraneType: "高彈性流體磷脂雙分子層",
    summary: "人體數量最龐大的血液細胞。成熟紅血球呈現典型的雙凹圓盤（Biconcave Disc）幾何外觀，其結構為高度特化以最大化氣體交換效率之生物學奇蹟。",
    dimensions: "直徑約 7.8 μm，外緣厚約 2.5 μm，中央凹陷厚約 0.8 μm",
    curriculumFacts: [
      "成熟紅血球無細胞核、無粒線體與內質網，釋放出全部體積空間填滿血紅素（每顆約 2.7 億個血紅素分子）。",
      "缺乏粒線體，完全仰賴無氧糖解（厭氧呼吸）產生 ATP，自身絕不消耗所運送的氧氣分子。",
      "雙凹圓盤造型使「表面積 / 體積比 (SA/V)」大幅提高，縮短氧氣與二氧化碳擴散至分子中心的平均物理距離。"
    ],
    structures: [
      {
        id: "biconcaveDisc",
        name: "雙凹圓盤幾何 (Biconcave Profile)",
        color: "#dc2626",
        desc: "中央凹陷、外緣豐厚的流體力學造型，受 Evans-Fung 生物物理曲線精確定義。在微血管中具極佳剪切耐受力與層流順應性。"
      },
      {
        id: "spectrinSkeleton",
        name: "收縮蛋白細胞骨架 (Spectrin Network)",
        color: "#ef4444",
        desc: "細胞膜內側密布由 Spectrin、Actin 及 Ankyrin 構成的六角形彈簧狀二維網格，賦予紅血球穿越直徑僅 3~5 μm 狹窄微血管時的可逆變形彈性。"
      },
      {
        id: "hemoglobin",
        name: "血紅素 (Hemoglobin)",
        color: "#991b1b",
        desc: "四聚體含鐵蛋白質，可可逆性結合 4 個氧分子形成氧合血紅素 ($Hb(O_2)_4$)，在肺泡高氧分壓處結合氧，於組織低氧分壓處釋出。"
      },
      {
        id: "antigen",
        name: "ABO 血型抗原 (Surface Glycoproteins)",
        color: "#f87171",
        desc: "紅血球外表面附著專一寡醣鏈結構（A 抗原、B 抗原或 H 抗原），決定人類 ABO 與 Rh 血型系統及輸血相容性。"
      }
    ]
  },

  membrane: {
    id: "membrane",
    name: "細胞膜流體鑲嵌模型",
    enName: "Fluid Mosaic Model (Singer & Nicolson)",
    badge: "生物膜分子架構",
    membraneType: "磷脂質雙分子層鑲嵌多元蛋白質",
    summary: "1972 年由 Singer 與 Nicolson 提出。細胞膜以流動的磷脂質雙分子層為基本骨架，各類蛋白質或鑲嵌其中、或貫穿全膜、或附著於表面，呈現動態如馬賽克般的鑲嵌景觀。",
    dimensions: "厚度約 7 ~ 10 nm（奈米尺度）",
    curriculumFacts: [
      "親水極性磷酸頭部朝向細胞內外水溶液環境；疏水非極性脂肪酸尾部相對朝向內部，形成疏水屏障。",
      "膜具有「流動性 (Fluidity)」：磷脂分子能快速側向擴散；不飽和雙鍵之折曲碳鏈與膽固醇共同維持適當流動度。",
      "具選擇通透性：疏水性小分子（$O_2, CO_2$）自由擴散；親水性離子（$Na^+, K^+, Ca^{2+}$）與葡萄糖需通道或載體蛋白協助。"
    ],
    structures: [
      {
        id: "phospholipid",
        name: "磷脂質雙分子層 (Phospholipid Bilayer)",
        color: "#0284c7",
        desc: "每個分子由 1 個親水甘油磷酸頭部（藍色）與 2 條疏水脂肪酸尾部（黃色）組成。一條為飽和直鏈，另一條具順式雙鍵折曲鏈。"
      },
      {
        id: "transmembraneProtein",
        name: "穿膜蛋白 / 離子通道 (Channel & Carrier)",
        color: "#8b5cf6",
        desc: "多重 $\\alpha$-螺旋桶狀貫穿雙層膜，中央具親水性孔道。促進性擴散與主動運輸（如鈉鉀幫浦）不可或缺的通道分子。"
      },
      {
        id: "peripheralProtein",
        name: "周邊膜蛋白 (Peripheral Protein)",
        color: "#ec4899",
        desc: "非共價結合於磷脂內側或外側表面，常擔任酵素活性中心、細胞骨架連結點或細胞內訊號傳遞分子。"
      },
      {
        id: "glycoprotein",
        name: "醣蛋白與醣鏈天線 (Glycocalyx)",
        color: "#a3e635",
        desc: "僅分佈於細胞外側表面，分枝狀的寡醣天線負責細胞間辨識、受體結合、組織相容性免疫辨別。"
      },
      {
        id: "cholesterol",
        name: "膽固醇分子 (Cholesterol)",
        color: "#eab308",
        desc: "剛性多環固醇結構夾在磷脂尾部間，為「流動性緩衝劑」：高溫時限制脂肪酸移動防膜過軟；低溫時阻礙尾部緊密排列防膜凝固。"
      }
    ]
  }
};

/**
 * foodChain & foodWeb Consolidated Dataset
 * Contains configurations, trophic relations, and ecological constants for:
 * 1. 簡易食物鏈 (狼-羊-草空間模擬)
 * 2. 多物種食物網 (臺灣本土 10 物種生態平衡系統)
 */

const FoodChainData = {
  // ==========================================
  // 單元一：簡易食物鏈消長模擬 (空間網格參數)
  // ==========================================
  simpleChain: {
    initialCounts: {
      wolf: 4,
      sheep: 16,
      grass: 60
    },
    maxGrassCapacity: 120,
    grassRegrowInterval: 25, // 每 25 幀自動在空網格生成新草
    entities: {
      grass: {
        name: "草",
        nameEn: "Grass",
        type: "grass",
        trophicLevel: 1,
        role: "生產者",
        color: "#22c55e",
        lifespan: 300,
        energy: 40,
        maxLifespan: 300,
        reproduceInterval: 60,
        sprite: "grass.png"
      },
      sheep: {
        name: "羊",
        nameEn: "Sheep",
        type: "sheep",
        trophicLevel: 2,
        role: "初級消費者 (草食)",
        color: "#38bdf8",
        lifespan: 120,
        energy: 100,
        maxLifespan: 160,
        maxEnergy: 140,
        speed: 2.2,
        detectionRadius: 130,
        eatGainEnergy: 35,
        eatGainLifespan: 25,
        reproduceInterval: 80,
        reproduceEnergyCost: 40,
        reproduceThreshold: 90,
        sprite: "sheep.png"
      },
      wolf: {
        name: "狼",
        nameEn: "Wolf",
        type: "wolf",
        trophicLevel: 3,
        role: "次級/頂級消費者 (肉食)",
        color: "#ef4444",
        lifespan: 150,
        energy: 120,
        maxLifespan: 200,
        maxEnergy: 160,
        speed: 2.8,
        detectionRadius: 180,
        eatGainEnergy: 55,
        eatGainLifespan: 40,
        reproduceInterval: 120,
        reproduceEnergyCost: 60,
        reproduceThreshold: 110,
        sprite: "wolf.png"
      }
    }
  },

  // ==========================================
  // 單元二：多物種食物網生態平衡 (臺灣本土物種)
  // ==========================================
  foodWeb: {
    // 預設一：臺灣高山與森林生態系 (10種臺灣本土物種)
    presetTaiwanForest: {
      name: "臺灣高山與森林食物網 (10種臺灣本土物種)",
      description: "以臺灣中央山脈中高海拔森林與草生地為背景，包含大型草食獸、特有肉食性哺乳類與原生植被。",
      species: [
        {
          id: "silvergrass",
          name: "芒草",
          scientific: "Miscanthus floridulus",
          isProducer: true,
          trophicLevel: 1,
          tierName: "生產者",
          pop: 1200,
          K: 2000,
          r: 0.25,
          color: "#4ade80",
          desc: "臺灣低至高海拔向陽地最優勢的多年生禾草，能快速行光合作用累積大量生物量，為多種草食獸之主要食草。",
          preys: []
        },
        {
          id: "fir",
          name: "臺灣冷杉",
          scientific: "Abies kawakamii",
          isProducer: true,
          trophicLevel: 1,
          tierName: "生產者",
          pop: 900,
          K: 1500,
          r: 0.18,
          color: "#16a34a",
          desc: "臺灣高海拔針葉林之代表性建群樹種，毬果與嫩芽可供赤腹松鼠及大型草食動物啃食。",
          preys: []
        },
        {
          id: "fagaceae",
          name: "殼斗科植物",
          scientific: "Fagaceae spp.",
          isProducer: true,
          trophicLevel: 1,
          tierName: "生產者",
          pop: 1000,
          K: 1800,
          r: 0.22,
          color: "#15803d",
          desc: "臺灣闊葉林關鍵基礎樹種（如櫟屬、柯屬），每年秋季結出大量富含油脂與澱粉的堅果（橡實），為黑熊、松鼠及鳥類的重要越冬熱量來源。",
          preys: []
        },
        {
          id: "sikaDeer",
          name: "梅花鹿",
          scientific: "Cervus nippon taiouanus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 80,
          K: 180,
          c: 0.45,
          e: 0.25,
          d: 0.06,
          color: "#f59e0b",
          desc: "臺灣特有亞種大型草食性哺乳類，喜食嫩草、灌木嫩葉與樹皮。受頂級掠食者族群控制，避免森林植被過度啃食。",
          preys: ["芒草", "臺灣冷杉", "殼斗科植物"]
        },
        {
          id: "hare",
          name: "臺灣野兔",
          scientific: "Lepus sinensis formosus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 120,
          K: 220,
          c: 0.50,
          e: 0.25,
          d: 0.07,
          color: "#fbbf24",
          desc: "臺灣特有亞種夜行性草食動物，繁殖力強，以芒草嫩葉與植物幼芽為食，是中小型肉食獸的重要獵物底層。",
          preys: ["芒草", "殼斗科植物"]
        },
        {
          id: "squirrel",
          name: "赤腹松鼠",
          scientific: "Callosciurus erythraeus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 90,
          K: 190,
          c: 0.48,
          e: 0.25,
          d: 0.06,
          color: "#ea580c",
          desc: "臺灣森林中最常見的樹棲性齧齒類，喜食殼斗科橡實與冷杉種子，具有埋藏堅果助種子傳播的互利功能。",
          preys: ["殼斗科植物", "臺灣冷杉"]
        },
        {
          id: "mouse",
          name: "巢鼠",
          scientific: "Micromys minutus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 130,
          K: 240,
          c: 0.52,
          e: 0.25,
          d: 0.08,
          color: "#a855f7",
          desc: "臺灣體型最小的哺乳動物之一，在草叢中築球狀巢，以禾本科芒草種子與嫩葉為主食，族群變動對環境極為敏感。",
          preys: ["芒草", "殼斗科植物"]
        },
        {
          id: "pheasant",
          name: "環頸雉",
          scientific: "Phasianus colchicus formosanus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級/雜食消費者",
          pop: 75,
          K: 170,
          c: 0.46,
          e: 0.25,
          d: 0.06,
          color: "#06b6d4",
          desc: "臺灣特有亞種地棲性大型野鳥，俗稱啼雞，啄食草籽、嫩芽及落果，常穿梭於林緣灌叢與芒草叢中。",
          preys: ["芒草", "殼斗科植物"]
        },
        {
          id: "leopardCat",
          name: "石虎",
          scientific: "Prionailurus bengalensis chinensis",
          isProducer: false,
          trophicLevel: 3,
          tierName: "次級/頂級肉食消費者",
          pop: 25,
          K: 50,
          c: 0.40,
          e: 0.25,
          d: 0.05,
          color: "#ef4444",
          desc: "臺灣唯一現存原生貓科動物，為第一級瀕臨絕種保育類。敏捷機警，專門捕食野兔、鼠類、赤腹松鼠與小型鳥類，為生態系之關鍵傘護種 (Umbrella species)。",
          preys: ["臺灣野兔", "巢鼠", "赤腹松鼠", "環頸雉", "梅花鹿"]
        },
        {
          id: "blackBear",
          name: "臺灣黑熊",
          scientific: "Ursus thibetanus formosanus",
          isProducer: false,
          trophicLevel: 4,
          tierName: "頂級雜食消費者 (Apex Omnivore)",
          pop: 12,
          K: 25,
          c: 0.35,
          e: 0.22,
          d: 0.04,
          color: "#b91c1c",
          desc: "臺灣陸域體型最大之原生食肉目哺乳類，胸前具白色V字斑紋。屬雜食偏素性，盛秋喜食殼斗科堅果，亦會捕食梅花鹿或野兔，為頂級關鍵種 (Keystone species)。",
          preys: ["梅花鹿", "臺灣野兔", "殼斗科植物"]
        }
      ]
    },

    // 預設二：臺灣淺山丘陵食物網 (物種關係.txt 原版拓撲)
    presetFoothills: {
      name: "臺灣淺山丘陵食物網 (原始10物種拓撲)",
      description: "依據原始物種關係.txt，包含老鷹、蛇、黃鼠狼等複營養階層完整食物網。",
      species: [
        {
          id: "grass",
          name: "草",
          scientific: "Gramineae spp.",
          isProducer: true,
          trophicLevel: 1,
          tierName: "生產者",
          pop: 3000,
          K: 5000,
          r: 0.30,
          color: "#22c55e",
          desc: "淺山草本植被，為所有草食動物的基礎能源來源。",
          preys: []
        },
        {
          id: "sikaDeer",
          name: "梅花鹿",
          scientific: "Cervus nippon taiouanus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 70,
          K: 160,
          c: 0.45,
          e: 0.22,
          d: 0.06,
          color: "#f59e0b",
          desc: "以草為主要食糧的大型草食性哺乳動物。",
          preys: ["草"]
        },
        {
          id: "rabbit",
          name: "野兔",
          scientific: "Lepus sinensis",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 100,
          K: 200,
          c: 0.48,
          e: 0.22,
          d: 0.07,
          color: "#fbbf24",
          desc: "快速繁殖的草食動物，為多種肉食者的主食。",
          preys: ["草"]
        },
        {
          id: "squirrel",
          name: "松鼠",
          scientific: "Sciuridae spp.",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 80,
          K: 180,
          c: 0.46,
          e: 0.22,
          d: 0.06,
          color: "#ea580c",
          desc: "林間跳躍的樹棲齧齒動物。",
          preys: ["草"]
        },
        {
          id: "rat",
          name: "巢鼠",
          scientific: "Micromys minutus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 110,
          K: 220,
          c: 0.50,
          e: 0.22,
          d: 0.08,
          color: "#a855f7",
          desc: "以草籽與草本植物為食的小型齧齒類。",
          preys: ["草"]
        },
        {
          id: "pheasant",
          name: "環頸雉",
          scientific: "Phasianus colchicus",
          isProducer: false,
          trophicLevel: 2,
          tierName: "初級消費者",
          pop: 75,
          K: 170,
          c: 0.45,
          e: 0.22,
          d: 0.06,
          color: "#06b6d4",
          desc: "在草叢間啄食植物草籽的地棲雉鳥。",
          preys: ["草"]
        },
        {
          id: "weasel",
          name: "黃鼠狼",
          scientific: "Mustela sibirica",
          isProducer: false,
          trophicLevel: 3,
          tierName: "次級消費者",
          pop: 35,
          K: 70,
          c: 0.40,
          e: 0.20,
          d: 0.06,
          color: "#eab308",
          desc: "靈活細長的小型食肉動物，擅長鑽入洞穴捕獵鼠類與雉鳥。",
          preys: ["環頸雉", "巢鼠", "松鼠", "野兔"]
        },
        {
          id: "snake",
          name: "蛇",
          scientific: "Serpentes spp.",
          isProducer: false,
          trophicLevel: 3,
          tierName: "次級消費者",
          pop: 30,
          K: 60,
          c: 0.38,
          e: 0.20,
          d: 0.06,
          color: "#10b981",
          desc: "伏擊型肉食爬行動物，吞食野兔、松鼠與巢鼠。",
          preys: ["巢鼠", "松鼠", "野兔"]
        },
        {
          id: "eagle",
          name: "老鷹",
          scientific: "Accipitridae spp.",
          isProducer: false,
          trophicLevel: 4,
          tierName: "頂級猛禽",
          pop: 20,
          K: 40,
          c: 0.35,
          e: 0.20,
          d: 0.05,
          color: "#6366f1",
          desc: "俯衝捕獵的日行性猛禽，俯瞰捕食地面小型哺乳類與鳥類。",
          preys: ["巢鼠", "環頸雉", "野兔", "松鼠"]
        },
        {
          id: "leopardCat",
          name: "石虎",
          scientific: "Prionailurus bengalensis",
          isProducer: false,
          trophicLevel: 4,
          tierName: "頂級掠食者",
          pop: 25,
          K: 50,
          c: 0.38,
          e: 0.20,
          d: 0.05,
          color: "#ef4444",
          desc: "淺山生態系頂級肉食動物，能捕食野兔、梅花鹿幼體與黃鼠狼。",
          preys: ["梅花鹿", "黃鼠狼", "野兔"]
        }
      ]
    }
  }
};

// If running in Node.js (test environment), export the module
if (typeof module !== "undefined" && module.exports) {
  module.exports = FoodChainData;
}

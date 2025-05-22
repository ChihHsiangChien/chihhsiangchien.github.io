EcoQuest：動物探索者
一、技術規格
引擎：Phaser 3

工具鏈：Codex CLI

畫面解析度：1280x720（16:9）

Tile 大小：48x48 px

地圖：使用 Tiled 編輯器製作，匯出 JSON 格式

Tileset：所有地圖共用一張 tileset.png

美術風格：像素風（Pixel Art）

二、遊戲核心架構
1. 世界地圖 + 各生態區地圖（Biome）
使用同一張 tileset.png，搭配不同的 tilemap JSON 製作多張地圖。

世界地圖（WorldScene）供玩家點選進入不同的 biome。

每個 biome 使用獨立的場景與地圖（BiomeScene）。

地圖切換可透過場景切換或 tile 邊界觸發。

2. 動物互動與任務目標
每張 biome 地圖中隨機產生背景動物與迷路動物。

玩家需在各 biome 找到迷路動物，觸發問答後帶回原始 biome。

答對題目後動物會跟隨玩家（貪吃蛇效果）。

成功帶回正確 biome 即完成任務，記錄進度。

3. 問答系統
問答資料以 JSON 儲存，並附有 questionId。

玩家與動物互動時抽選尚未回答過的題目。

題目正確才能帶走動物，錯誤則無法跟隨。

三、生態地形與動物配置
地形	Tilemap 名稱	描述	範例動物
山地	mountain	岩石、高地、灰地	雪豹、山羊
森林	forest	樹木、灌木、落葉	穿山甲、五色鳥、水鹿
草原	grassland	淺黃草、丘陵	羚羊、斑馬、疣豬、獅子
沙漠	desert	沙丘、仙人掌	駱駝、跳鼠、霧甲蟲、響尾蛇
湖泊	lake	淡水水域、岸邊草叢	吳郭魚、翠鳥、螃蟹
溪流	stream	流水、石塊	貝類、魚、昆蟲、蝦蟹
河口	estuary	紅樹林、泥灘	彈塗魚、招潮蟹、小白鷺
潮間帶	tidal_zone	沙灘、水痕	方蟹、海藻
淺海區	coastal	藻類、礁岩	海龜、海豚
大洋區	ocean	深海、浮游藻類	珊瑚、魚、蝦

四、遊戲流程與互動邏輯
玩家角色
尺寸：48x48 px

移動：四向（WASD）

完整支援觸控螢幕

功能：靠近動物並按 E 鍵互動

跟隨動物（迷路動物）
初始分布於錯誤 biome

互動觸發問答（從題庫中抽取尚未出現的題目）

答對後成為跟隨角色（陣列方式、貪吃蛇邏輯）

跟隨途中不可再次互動

抵達原始 biome 後移除跟隨，顯示教育資訊

五、資料結構與檔案組織
檔案結構

project/
├── assets/
│   ├── tileset.png               # 共用地圖素材
│   ├── biomes/
│   │   ├── forest.json           # 每個 biome 的 tilemap
│   ├── sprites/
│   │   ├── animals.png
│   │   └── player.png
├── data/
│   ├── stray_animals.json        # 迷路動物資訊
│   ├── biomes.js                 # 各 biome 動物對照表
│   └── questions.json            # 問答題庫
├── scenes/
│   ├── WorldScene.js             # 世界地圖
│   ├── BiomeScene.js             # 各地圖共用邏輯
│   ├── QuizScene.js              # 問答場景
├── objects/
│   ├── Player.js
│   └── Animal.js
├── main.js
└── index.html
迷路動物資料格式（stray_animals.json）
```json

[
  {
    "id": "camel_01",
    "type": "camel",
    "originBiome": "desert",
    "currentBiome": "grassland",
    "x": 120,
    "y": 200,
    "questionId": "q_13"
  }
]
```
問答資料（questions.json）
```json
[
  {
    "id": "q_13",
    "question": "駱駝適合生活在哪種環境？",
    "options": ["沙漠", "森林", "湖泊", "草原"],
    "answer": "沙漠"
  }
]
```
動物圖像資料（可選分離）
```json
{
  "camel": {
    "spritesheet": "camel.png",
    "frameWidth": 48,
    "frameHeight": 48,
    "animations": {
      "idle": [0],
      "walk": [1, 2, 3]
    }
  }
}
```
六、程式建議架構
BiomeManager 範例
js
複製
編輯
class BiomeManager {
  constructor(scene) {
    this.scene = scene;
    this.currentAnimals = [];
  }

  async loadBiomeCharacters(biomeName) {
    const data = await fetch(`data/biomes/${biomeName}.json`).then(r => r.json());
    this.clearAll();

    for (const animal of data.strayAnimals) {
      const sprite = this.scene.add.sprite(animal.x, animal.y, animal.type);
      this.currentAnimals.push(sprite);
    }
  }

  clearAll() {
    this.currentAnimals.forEach(a => a.destroy());
    this.currentAnimals = [];
  }
}
七、效能與擴充建議
共用 tileset：所有 tilemap 使用同一張 tileset.png 降低記憶體。

懶加載資源：僅載入當前 biome 所需動物素材。

背景角色：使用 Group 隨機生成，不儲存狀態。

可擴充設計：支援動物變裝、季節變化等進階特性。


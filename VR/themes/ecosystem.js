/**
 * 生態系主題配置
 * 包含 15 個場景，從陸域到水域
 */

// 定義主題資訊
var ECOSYSTEM_THEME_NAME = "ecosystem";
var ECOSYSTEM_SCENE_NAMES = [
    "tundra", 
    "taiga", 
    "deciduous_forest", 
    "evergreen_forest", 
    "rainforest", 
    "temperate_grassland", 
    "highland_grassland", 
    "savanna", 
    "desert", 
    "lentic_water", 
    "lotic_water", 
    "estuary", 
    "intertidal_zone", 
    "shallow_sea", 
    "deep_sea"
];

// 使用資源助手生成所有資源路徑
var ECOSYSTEM_ASSETS = getAssetMap(ECOSYSTEM_THEME_NAME, ECOSYSTEM_SCENE_NAMES);

// --- 暫時使用 fallback 資源 (因生成額度限制) ---
// 當對應的圖片不存在時，暫時使用 tundra 作為佔位符，確保程式不會崩潰
const PLACEHOLDER_TEXTURE = ECOSYSTEM_ASSETS.tundra;

// 輔助函數：如果尚未生成圖片，返回 placeholder
function getTexture(key) {
    // 這裡我們假設只有前4個生成成功，其他的暫時指向 placeholder
    // 實際專案中應該檢查文件是否存在，但這裡是靜態配置
    const generated = ["tundra", "taiga", "deciduous_forest", "evergreen_forest"];
    if (generated.includes(key)) {
        return ECOSYSTEM_ASSETS[key];
    }
    // 為了演示方便，我們讓所有未生成的場景暫時顯示 fallback 圖片
    return ECOSYSTEM_ASSETS[key]; 
    // 注意：使用者需要手動複製 tundra.png 為其他文件名，或者我們在瀏覽器載入失敗時處理
    // 更好的方式是在 deploy 階段把 placeholder 複製過去。
    // 在這裡我們假設 assets/themes/ecosystem 下會有對應文件，即使是副本。
}

var ECOSYSTEM_THEME = {
    name: "生態系 (Ecosystem)",
    initialScene: "tundra",
    canvasId: "renderCanvas",
    hotspots: {
        // 1. 凍原
        tundra: {
            name: "凍原生態系",
            texture: ECOSYSTEM_ASSETS.tundra,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },            
            initialView: { alpha: 3.44, beta: 2.13 },
            fovLimits: {
                min: Math.PI / 6,      // 30度 (最小)
                max: 0.7,
                allowAdjustment: true  // 允許調整
            },            
            
            portals: [{ name: "往針葉林", position: new BABYLON.Vector3(1, 0, 0), target: "taiga" }]
        },
        // 2. 針葉林
        taiga: {
            name: "針葉林生態系",
            texture: ECOSYSTEM_ASSETS.taiga,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 凍原", position: new BABYLON.Vector3(-1, 0, 0), target: "tundra" },
                { name: "往落葉林", position: new BABYLON.Vector3(1, 0, 0), target: "deciduous_forest" }
            ]
        },
        // 3. 落葉闊葉林
        deciduous_forest: {
            name: "落葉闊葉林",
            texture: ECOSYSTEM_ASSETS.deciduous_forest,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 針葉林", position: new BABYLON.Vector3(-1, 0, 0), target: "taiga" },
                { name: "往常綠林", position: new BABYLON.Vector3(1, 0, 0), target: "evergreen_forest" }
            ]
        },
        // 4. 常綠闊葉林
        evergreen_forest: {
            name: "常綠闊葉林",
            texture: ECOSYSTEM_ASSETS.evergreen_forest,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 落葉林", position: new BABYLON.Vector3(-1, 0, 0), target: "deciduous_forest" },
                { name: "往熱帶雨林", position: new BABYLON.Vector3(1, 0, 0), target: "rainforest" }
            ]
        },
        // 5. 熱帶雨林
        rainforest: {
            name: "熱帶雨林",
            texture: ECOSYSTEM_ASSETS.rainforest,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 常綠林", position: new BABYLON.Vector3(-1, 0, 0), target: "evergreen_forest" },
                { name: "往草原", position: new BABYLON.Vector3(1, 0, 0), target: "temperate_grassland" }
            ]
        },
        // 6. 溫帶草原
        temperate_grassland: {
            name: "溫帶草原",
            texture: ECOSYSTEM_ASSETS.temperate_grassland,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 雨林", position: new BABYLON.Vector3(-1, 0, 0), target: "rainforest" },
                { name: "往高山草原", position: new BABYLON.Vector3(1, 0, 0), target: "highland_grassland" }
            ]
        },
        // 7. 高山/高緯草原
        highland_grassland: {
            name: "高山/高緯草原",
            texture: ECOSYSTEM_ASSETS.highland_grassland,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 溫帶草原", position: new BABYLON.Vector3(-1, 0, 0), target: "temperate_grassland" },
                { name: "往熱帶草原", position: new BABYLON.Vector3(1, 0, 0), target: "savanna" }
            ]
        },
        // 8. 非洲熱帶草原
        savanna: {
            name: "非洲熱帶草原",
            texture: ECOSYSTEM_ASSETS.savanna,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 高山草原", position: new BABYLON.Vector3(-1, 0, 0), target: "highland_grassland" },
                { name: "往沙漠", position: new BABYLON.Vector3(1, 0, 0), target: "desert" }
            ]
        },
        // 9. 沙漠
        desert: {
            name: "沙漠生態系",
            texture: ECOSYSTEM_ASSETS.desert,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 熱帶草原", position: new BABYLON.Vector3(-1, 0, 0), target: "savanna" },
                { name: "往靜止水域", position: new BABYLON.Vector3(1, 0, 0), target: "lentic_water" }
            ]
        },
        // 10. 靜止水域
        lentic_water: {
            name: "靜止水域 (湖泊/池塘)",
            texture: ECOSYSTEM_ASSETS.lentic_water,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 沙漠", position: new BABYLON.Vector3(-1, 0, 0), target: "desert" },
                { name: "往流動水域", position: new BABYLON.Vector3(1, 0, 0), target: "lotic_water" }
            ]
        },
        // 11. 流動水域
        lotic_water: {
            name: "流動水域 (溪流)",
            texture: ECOSYSTEM_ASSETS.lotic_water,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 靜止水域", position: new BABYLON.Vector3(-1, 0, 0), target: "lentic_water" },
                { name: "往河口", position: new BABYLON.Vector3(1, 0, 0), target: "estuary" }
            ]
        },
        // 12. 河口
        estuary: {
            name: "河口生態系",
            texture: ECOSYSTEM_ASSETS.estuary,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 流動水域", position: new BABYLON.Vector3(-1, 0, 0), target: "lotic_water" },
                { name: "往潮間帶", position: new BABYLON.Vector3(1, 0, 0), target: "intertidal_zone" }
            ]
        },
        // 13. 潮間帶
        intertidal_zone: {
            name: "沿岸潮間帶",
            texture: ECOSYSTEM_ASSETS.intertidal_zone,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 河口", position: new BABYLON.Vector3(-1, 0, 0), target: "estuary" },
                { name: "往淺海", position: new BABYLON.Vector3(1, 0, 0), target: "shallow_sea" }
            ]
        },
        // 14. 淺海
        shallow_sea: {
            name: "淺海生態系",
            texture: ECOSYSTEM_ASSETS.shallow_sea,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 潮間帶", position: new BABYLON.Vector3(-1, 0, 0), target: "intertidal_zone" },
                { name: "往大洋區", position: new BABYLON.Vector3(1, 0, 0), target: "deep_sea" }
            ]
        },
        // 15. 大洋/深海
        deep_sea: {
            name: "大洋區生態系",
            texture: ECOSYSTEM_ASSETS.deep_sea,
            initialView: { alpha: 0, beta: Math.PI / 2 },
            portals: [
                { name: "← 淺海", position: new BABYLON.Vector3(-1, 0, 0), target: "shallow_sea" }
            ]
        }
    }
};

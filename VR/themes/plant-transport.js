/**
 * 植物水分運輸主題配置
 * 使用資源助手管理圖片路徑
 */

// 定義主題資訊
var PLANT_TRANSPORT_THEME_NAME = "plant-transport";
var PLANT_TRANSPORT_SCENE_NAMES = [
    "soil_root", 
    "xylem", 
    "mesophyll", 
    "outside_plant"
];

// 使用資源助手生成所有資源路徑
var PLANT_TRANSPORT_ASSETS = getAssetMap(PLANT_TRANSPORT_THEME_NAME, PLANT_TRANSPORT_SCENE_NAMES);

var PLANT_TRANSPORT_THEME = {
    name: "植物運輸 (水滴之旅)",
    initialScene: "soil_root",
    canvasId: "renderCanvas",
    hotspots: {
        soil_root: {
            name: "土壤與根毛",
            texture: PLANT_TRANSPORT_ASSETS.soil_root,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 0,
                beta: Math.PI / 2
            },
            initialFov: 1.0,
            portals: [
                {
                    name: "進入根毛",
                    position: new BABYLON.Vector3(0.8404, 0.3209, -0.4367),
                    target: "xylem"
                }
            ]
        },
        xylem: {
            name: "木質部導管",
            texture: PLANT_TRANSPORT_ASSETS.xylem,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 0,
                beta: Math.PI / 2
            },
            initialFov: 1.0,
            portals: [
                {
                    name: "回到土壤",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "soil_root"
                },
                {
                    name: "往葉肉組織",
                    position: new BABYLON.Vector3(0.6653, 0.7464, -0.0139), // 向上運輸
                    target: "mesophyll"
                }
            ]
        },
        mesophyll: {
            name: "葉肉組織",
            texture: PLANT_TRANSPORT_ASSETS.mesophyll,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 0,
                beta: Math.PI / 2
            },
            initialFov: 1.0,
            portals: [
                {
                    name: "回到導管",
                    position: new BABYLON.Vector3(0.3367, -0.2881, -0.8965),
                    target: "xylem"
                },
                {
                    name: "往氣孔蒸散",
                    position: new BABYLON.Vector3(0.7720, -0.6354, -0.0170), // 向下並向前
                    target: "outside_plant"
                }
            ]
        },
        outside_plant: {
            name: "植物外觀 (蒸散完成)",
            texture: PLANT_TRANSPORT_ASSETS.outside_plant,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 0,
                beta: Math.PI / 2
            },
            initialFov: 1.0,
            portals: [
                {
                    name: "回到葉片內部",
                    position: new BABYLON.Vector3(0, 0, -1),
                    target: "mesophyll"
                },
                {
                    name: "回到土壤",
                    position: new BABYLON.Vector3(-0.8308, -0.5281, -0.1757),
                    target: "soil_root"
                }

            ]
        }
    }
};

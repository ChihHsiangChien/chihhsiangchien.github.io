/**
 * 消化系统主题配置
 * 使用资源助手管理图片路径
 */

// 定义主题信息（使用 var 以支持多次加载）
var DIGESTIVE_THEME_NAME = "digestive-system";
var DIGESTIVE_SCENE_NAMES = [
    "mouth", 
    "pharynx", 
    "esophagus", 
    "stomach", 
    "stomach2", 
    "stomach3", 
    "small_intestine"
];

// 使用资源助手生成所有资源路径
var DIGESTIVE_ASSETS = getAssetMap(DIGESTIVE_THEME_NAME, DIGESTIVE_SCENE_NAMES);

var DIGESTIVE_SYSTEM_THEME = {
    name: "Digestive System",
    initialScene: "mouth",
    canvasId: "renderCanvas",
    hotspots: {
        mouth: {
            name: "嘴巴",
            texture: DIGESTIVE_ASSETS.mouth,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.4383
            },
            initialFov: 1.6581,
            portals: [
                {
                    name: "咽部",
                    position: new BABYLON.Vector3(0.9412, -0.3379, -0.0054),
                    target: "pharynx"
                }
            ]
        },
        pharynx: {
            name: "咽部",
            texture: DIGESTIVE_ASSETS.pharynx,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往嘴巴",
                    position: new BABYLON.Vector3(-0.8, -0.2, -0.15),
                    target: "mouth"
                },
                {
                    name: "往食道",
                    position: new BABYLON.Vector3(0.3093, -0.9432, 0.1215),
                    target: "esophagus"
                }
            ]
        },
        esophagus: {
            name: "食道",
            texture: DIGESTIVE_ASSETS.esophagus,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往咽部",
                    position: new BABYLON.Vector3(0.75, 0.28, 0.25),
                    target: "pharynx"
                },
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(0.8, -0.15, -0.3),
                    target: "stomach"
                }
            ]
        },
        stomach: {
            name: "胃",
            texture: DIGESTIVE_ASSETS.stomach,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往食道",
                    position: new BABYLON.Vector3(-0.75, -0.3, -0.2),
                    target: "esophagus"
                },
                {
                    name: "往小腸",
                    position: new BABYLON.Vector3(0.7, 0.25, 0.25),
                    target: "stomach2"
                }
            ]
        },
        stomach2: {
            name: "胃 II",
            texture: DIGESTIVE_ASSETS.stomach2,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(-0.7, -0.25, -0.25),
                    target: "stomach"
                },
                {
                    name: "往小腸",
                    position: new BABYLON.Vector3(0.65, 0.35, 0.2),
                    target: "stomach3"
                }
            ]
        },
        stomach3: {
            name: "胃 III",
            texture: DIGESTIVE_ASSETS.stomach3,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(-0.65, -0.35, -0.2),
                    target: "stomach2"
                },
                {
                    name: "往小腸",
                    position: new BABYLON.Vector3(0.9624, -0.1107, 0.2482),
                    target: "small_intestine"
                }
            ]
        },
        small_intestine: {
            name: "小腸",
            texture: DIGESTIVE_ASSETS.small_intestine,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,
                beta: 1.5708
            },
            initialFov: 1.5708,
            portals: [
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(-0.9631, -0.0267, 0.2677),
                    target: "stomach3"
                }
            ]
        }
    }
};

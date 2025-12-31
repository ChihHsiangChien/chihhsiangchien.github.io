/**
 * 植物水分运输主题配置
 * 使用资源助手管理图片路径
 */

// 定义主题信息（使用 var 以支持多次加载）
var PLANT_TRANSPORT_THEME_NAME = "plant-transport";
var PLANT_TRANSPORT_SCENE_NAMES = [
    "root", 
    "stem", 
    "leaf", 
    "flower"
];

// 使用资源助手生成所有资源路径
var PLANT_TRANSPORT_ASSETS = getAssetMap(PLANT_TRANSPORT_THEME_NAME, PLANT_TRANSPORT_SCENE_NAMES);

var PLANT_TRANSPORT_THEME = {
    name: "Plant Water Transport",
    initialScene: "root",
    canvasId: "renderCanvas",
    hotspots: {
        root: {
            name: "根部",
            texture: PLANT_TRANSPORT_ASSETS.root,
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
                    name: "往茎部",
                    position: new BABYLON.Vector3(0.8, 0.2, 0.3),
                    target: "stem"
                }
            ]
        },
        stem: {
            name: "茎部",
            texture: PLANT_TRANSPORT_ASSETS.stem,
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
                    name: "← 根部",
                    position: new BABYLON.Vector3(-0.8, -0.2, -0.3),
                    target: "root"
                },
                {
                    name: "往叶片",
                    position: new BABYLON.Vector3(0.7, 0.3, 0.2),
                    target: "leaf"
                }
            ]
        },
        leaf: {
            name: "叶片",
            texture: PLANT_TRANSPORT_ASSETS.leaf,
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
                    name: "← 茎部",
                    position: new BABYLON.Vector3(-0.7, -0.3, -0.2),
                    target: "stem"
                },
                {
                    name: "往花朵",
                    position: new BABYLON.Vector3(0.6, 0.4, 0.15),
                    target: "flower"
                }
            ]
        },
        flower: {
            name: "花朵",
            texture: PLANT_TRANSPORT_ASSETS.flower,
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
                    name: "← 叶片",
                    position: new BABYLON.Vector3(-0.6, -0.4, -0.15),
                    target: "leaf"
                }
            ]
        }
    }
};

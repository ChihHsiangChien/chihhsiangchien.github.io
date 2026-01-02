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
    "small_intestine",
    "big_intestine"
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
                alpha: 3.3160,
                beta: 1.5731
            },
            initialFov: 0.8727,
            // FOV 限制：禁止調整
            fovLimits: {
                allowAdjustment: false  // 禁止調整 POV
            },            
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
                alpha: 2.8882,
                beta: 1.3485
            },
            initialFov: 1.5708,
            // FOV 限制：禁止調整
            fovLimits: {
                allowAdjustment: false  // 禁止調整 POV
            },            
            portals: [
                {
                    name: "往口腔",
                    position: new BABYLON.Vector3(-0.8450, -0.0740, 0.5297),
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
                alpha: -1.1032,
                beta: 1.5480
            },
            initialFov: 1.0472,
            // 繞軸旋轉
            rotation: {
                axis: new BABYLON.Vector3(-0.4679, -0.1453, 0.8718),
                angle: Math.PI/2,
            },
            // FOV 限制：範圍較小
            fovLimits: {
                min: Math.PI / 6,      // 30度 (最小)
                max: Math.PI / 3,      // 60度 (最大)
                allowAdjustment: true  // 允許調整
            },
            portals: [
                {
                    name: "往咽部",
                    position: new BABYLON.Vector3(-0.0836, 0.9903, 0.1109),
                    target: "pharynx"
                },
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(-0.4019, -0.0132, 0.9156),
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
                alpha: 1.7703,
                beta: 1.0296
            },
            initialFov: 1.5708,
            // 繞軸旋轉
            rotation: {
                axis: new BABYLON.Vector3(0.5746, -0.0621, -0.8161),
                angle: -Math.PI/2,
            },            
            portals: [
                {
                    name: "往食道",
                    position: new BABYLON.Vector3(-0.2199, 0.8513, 0.4763),
                    target: "esophagus"
                },
                {
                    name: "往小腸",
                    position: new BABYLON.Vector3(0.5162, -0.0986, -0.8508),
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
                alpha: 0.2131,
                beta: 2.2110
            },
            initialFov: 1.5708,
            // 繞軸旋轉
            rotation: {
                axis: new BABYLON.Vector3(-0.9902, 0.0039, 0.1394),
                angle: -Math.PI/2,
            },
            // FOV 限制：禁止調整
            fovLimits: {
                allowAdjustment: false  // 禁止調整 POV
            },
            portals: [
                {
                    name: "往胃",
                    position: new BABYLON.Vector3(0.9216, 0.3592, -0.1468),
                    target: "stomach"
                },
                {
                    name: "往大腸",
                    position: new BABYLON.Vector3(-0.9936, -0.0795, 0.0804),
                    target: "big_intestine"
                }
            ]
        },
        big_intestine: {
            name: "大腸",
            texture: DIGESTIVE_ASSETS.big_intestine,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 0.6946,
                beta: 1.6518
            },
            initialFov: 1.8708,
            // FOV 限制：禁止調整
            // 繞軸旋轉
            rotation: {
                axis: new BABYLON.Vector3(-0.2679, -0.0396, -0.9626),
                angle: -Math.PI/2,
            },            
            fovLimits: {
                allowAdjustment: false  // 禁止調整 POV
            },
            portals: [
                {
                    name: "往小腸",
                    position: new BABYLON.Vector3(0.2482, -0.6869, 0.6831),
                    target: "small_intestine"
                }
            ]
        }
    }
};

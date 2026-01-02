/**
 * 呼吸系統主題配置
 * 使用資源助手管理圖片路徑
 */

// 定義主題資訊
var RESPIRATORY_THEME_NAME = "respiratory-system";
var RESPIRATORY_SCENE_NAMES = [
    "nasal_cavity", 
    "pharynx", 
    "larynx", 
    "trachea", 
    "bronchi", 
    "alveoli"
];

// 使用資源助手生成所有資源路徑
var RESPIRATORY_ASSETS = getAssetMap(RESPIRATORY_THEME_NAME, RESPIRATORY_SCENE_NAMES);

var RESPIRATORY_SYSTEM_THEME = {
    name: "呼吸系統",
    initialScene: "nasal_cavity",
    canvasId: "renderCanvas",
    hotspots: {
        nasal_cavity: {
            name: "鼻腔",
            texture: RESPIRATORY_ASSETS.nasal_cavity,
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
                    name: "往咽部",
                    position: new BABYLON.Vector3(0, 0, 1), // 暫定前方
                    target: "pharynx"
                }
            ]
        },
        pharynx: {
            name: "咽部",
            texture: RESPIRATORY_ASSETS.pharynx,
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
                    name: "往鼻腔",
                    position: new BABYLON.Vector3(0, 0, -1), // 暫定後方
                    target: "nasal_cavity"
                },
                {
                    name: "往喉部",
                    position: new BABYLON.Vector3(0, 0, 1), // 暫定前方
                    target: "larynx"
                }
            ]
        },
        larynx: {
            name: "喉部",
            texture: RESPIRATORY_ASSETS.larynx,
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
                    name: "往咽部",
                    position: new BABYLON.Vector3(0, 0, -1),
                    target: "pharynx"
                },
                {
                    name: "往氣管",
                    position: new BABYLON.Vector3(0, -1, 0), // 往下
                    target: "trachea"
                }
            ]
        },
        trachea: {
            name: "氣管",
            texture: RESPIRATORY_ASSETS.trachea,
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
                    name: "往喉部",
                    position: new BABYLON.Vector3(0, 1, 0), // 往上
                    target: "larynx"
                },
                {
                    name: "往支氣管",
                    position: new BABYLON.Vector3(0, 0, 1), // 前方
                    target: "bronchi"
                }
            ]
        },
        bronchi: {
            name: "支氣管",
            texture: RESPIRATORY_ASSETS.bronchi,
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
                    name: "往氣管",
                    position: new BABYLON.Vector3(0, 0, -1),
                    target: "trachea"
                },
                {
                    name: "往肺泡",
                    position: new BABYLON.Vector3(0, 0, 1),
                    target: "alveoli"
                }
            ]
        },
        alveoli: {
            name: "肺泡",
            texture: RESPIRATORY_ASSETS.alveoli,
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
                    name: "往支氣管",
                    position: new BABYLON.Vector3(0, 0, -1),
                    target: "bronchi"
                }
            ]
        }
    }
};

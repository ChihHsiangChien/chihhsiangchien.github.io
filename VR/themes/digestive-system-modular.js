/**
 * 消化系统主题配置 - 简化版（使用资源助手）
 * 展示如何使用 asset-helper.js 简化配置
 */

// 定义主题信息
const DIGESTIVE_THEME_NAME = "digestive-system";
const DIGESTIVE_SCENE_NAMES = [
    "mouth", 
    "pharynx", 
    "esophagus", 
    "stomach", 
    "stomach2", 
    "stomach3", 
    "small_intestine"
];

// 使用资源助手生成所有资源路径
const DIGESTIVE_ASSETS = getAssetMap(DIGESTIVE_THEME_NAME, DIGESTIVE_SCENE_NAMES);

/**
 * 消化系统主题
 */
const DIGESTIVE_SYSTEM_THEME = {
    name: "Digestive System",
    initialScene: "mouth",
    canvasId: "renderCanvas",
    
    hotspots: {
        // ===== 嘴巴 =====
        mouth: {
            name: "嘴巴",
            texture: DIGESTIVE_ASSETS.mouth,  // 简洁引用
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
                    name: "→ 咽部",
                    position: new BABYLON.Vector3(0.9899, -0.1405, 0.0180),
                    target: "pharynx"
                }
            ]
        },
        
        // ===== 咽部 =====
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
                    name: "← 嘴巴",
                    position: new BABYLON.Vector3(1, 0, 0),
                    target: "mouth"
                },
                {
                    name: "→ 食道",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "esophagus"
                }
            ]
        },
        
        // ===== 食道 =====
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
                    name: "← 咽部",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "pharynx"
                },
                {
                    name: "→ 胃",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "stomach"
                }
            ]
        },
        
        // ===== 胃 I =====
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
                    name: "← 食道",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "esophagus"
                },
                {
                    name: "→ 小肠",
                    position: new BABYLON.Vector3(0, -0.5, -0.8),
                    target: "stomach2"
                }
            ]
        },
        
        // ===== 胃 II =====
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
                    name: "← 胃",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "stomach"
                },
                {
                    name: "→ 小肠",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "stomach3"
                }
            ]
        },
        
        // ===== 胃 III =====
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
                    name: "← 胃",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "stomach2"
                },
                {
                    name: "→ 小肠",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "small_intestine"
                }
            ]
        },
        
        // ===== 小肠 =====
        small_intestine: {
            name: "小肠",
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
                    name: "← 胃",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "stomach3"
                }
            ]
        }
    }
};

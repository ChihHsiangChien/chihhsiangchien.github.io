/**
 * VR 主题配置模板
 * 
 * 使用说明：
 * 1. 复制此文件为你的主题名称，如 plant-transport.js
 * 2. 更新 name 和 initialScene
 * 3. 为每个场景设置：
 *    - name: 场景显示名称
 *    - texture: 图片文件路径
 *    - direction: 方向缩放设置
 *    - initialView: 初始相机角度 (alpha, beta)
 *    - initialFov: 初始视场角
 *    - portals: 导航热点数组
 */

const YOUR_THEME_NAME = {
    name: "主题名称",
    initialScene: "scene1",  // 初始加载的场景
    canvasId: "renderCanvas",
    
    hotspots: {
        // ===== 场景1 =====
        scene1: {
            name: "场景1名称",
            texture: "path/to/image1.png",
            direction: {
                sphereScaleX: -1,   // 水平镜像 (-1为镜像，1为正常)
                sphereScaleY: 1,    // 垂直镜像 (-1为镜像，1为正常)
                uScale: -1,         // 纹理U轴缩放
                vScale: -1          // 纹理V轴缩放
            },
            initialView: {
                alpha: 2.3746,      // 水平角度 (弧度)
                beta: 1.5708        // 垂直角度 (弧度)
            },
            initialFov: 1.5708,     // 初始视场角 (弧度)
            portals: [
                {
                    name: "→ 前往场景2",
                    position: new BABYLON.Vector3(x, y, z),  // 3D坐标 (-1 到 1)
                    target: "scene2"
                }
            ]
        },
        
        // ===== 场景2 =====
        scene2: {
            name: "场景2名称",
            texture: "path/to/image2.png",
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
                    name: "← 返回场景1",
                    position: new BABYLON.Vector3(x, y, z),
                    target: "scene1"
                }
            ]
        }
        
        // 继续添加更多场景...
    }
};

/**
 * 有用的常数
 * ===============
 * 
 * 视场角 (FOV) 参考值：
 * Math.PI / 8  = 0.3927 (最大缩放)
 * Math.PI / 4  = 0.7854 (75度)
 * Math.PI / 2  = 1.5708 (90度，标准)
 * Math.PI      = 3.1416 (180度)
 * 
 * 相机角度 (Degrees to Radians)：
 * 0°   = 0
 * 45°  = Math.PI / 4  = 0.7854
 * 90°  = Math.PI / 2  = 1.5708
 * 135° = 3 * Math.PI / 4 = 2.3562
 * 180° = Math.PI = 3.1416
 * 270° = 3 * Math.PI / 2 = 4.7124
 * 
 * 常用坐标：
 * 前方: (0, 0, 1)      后方: (0, 0, -1)
 * 上方: (0, 1, 0)      下方: (0, -1, 0)
 * 右方: (1, 0, 0)      左方: (-1, 0, 0)
 */

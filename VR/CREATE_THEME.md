# 如何创建新主题 - 完整指南

## 步骤概览

```
1. 准备资源 → 2. 创建文件夹 → 3. 编写配置 → 4. 更新HTML → 5. 测试
```

---

## 详细步骤

### 步骤 1: 准备图片资源

#### 1.1 组织文件夹

```bash
# 在你的本地项目中创建
/sources/plant-transport/
├── root.png        # 原始高质量图片 4096×2048
├── stem.png
├── leaf.png
├── flower.png
└── ...
```

#### 1.2 优化图片（可选但推荐）

使用脚本自动转换和压缩：

```bash
# 使用 Python 脚本
python scripts/optimize-images.py --theme plant-transport

# 或手动使用工具
cwebp root.png -o root.webp -q 85
optipng root.png
```

#### 1.3 上传到项目

```bash
# 创建目标目录
mkdir -p VR/assets/themes/plant-transport

# 复制优化后的图片
cp sources/plant-transport/*.png VR/assets/themes/plant-transport/
cp sources/plant-transport/*.webp VR/assets/themes/plant-transport/
```

---

### 步骤 2: 创建主题配置文件

#### 2.1 复制模板

```bash
cp VR/themes/theme-template.js VR/themes/plant-transport.js
```

#### 2.2 编写配置

打开 `VR/themes/plant-transport.js`，以下是完整示例：

```javascript
/**
 * 植物中的水分运输主题
 */

// 定义主题信息
const PLANT_THEME_NAME = "plant-transport";
const PLANT_SCENE_NAMES = [
    "root",      // 根部
    "stem",      // 茎
    "leaf",      // 叶片
    "flower"     // 花朵
];

// 使用资源助手获取所有资源路径
const PLANT_ASSETS = getAssetMap(PLANT_THEME_NAME, PLANT_SCENE_NAMES);

const PLANT_TRANSPORT_THEME = {
    name: "Plant Water Transport",
    initialScene: "root",
    canvasId: "renderCanvas",
    
    hotspots: {
        // ===== 根部 Root =====
        root: {
            name: "根部 Root",
            texture: PLANT_ASSETS.root,
            direction: {
                sphereScaleX: -1,
                sphereScaleY: 1,
                uScale: -1,
                vScale: -1
            },
            initialView: {
                alpha: 2.3746,      // 水平角度
                beta: 1.5708        // 垂直角度
            },
            initialFov: 1.5708,     // 视场角
            portals: [
                {
                    name: "→ 茎 Stem",
                    position: new BABYLON.Vector3(0, -0.8, 0.6),
                    target: "stem"
                }
            ]
        },
        
        // ===== 茎 Stem =====
        stem: {
            name: "茎 Stem",
            texture: PLANT_ASSETS.stem,
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
                    name: "← 根部 Root",
                    position: new BABYLON.Vector3(0, 0.8, -0.6),
                    target: "root"
                },
                {
                    name: "→ 叶片 Leaf",
                    position: new BABYLON.Vector3(1, 0, 0),
                    target: "leaf"
                }
            ]
        },
        
        // ===== 叶片 Leaf =====
        leaf: {
            name: "叶片 Leaf",
            texture: PLANT_ASSETS.leaf,
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
                    name: "← 茎 Stem",
                    position: new BABYLON.Vector3(-1, 0, 0),
                    target: "stem"
                },
                {
                    name: "→ 花朵 Flower",
                    position: new BABYLON.Vector3(0, 1, 0),
                    target: "flower"
                }
            ]
        },
        
        // ===== 花朵 Flower =====
        flower: {
            name: "花朵 Flower",
            texture: PLANT_ASSETS.flower,
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
                    name: "← 叶片 Leaf",
                    position: new BABYLON.Vector3(0, -1, 0),
                    target: "leaf"
                }
            ]
        }
    }
};
```

#### 2.3 关键配置说明

| 属性 | 说明 | 示例 |
|------|------|------|
| `name` | 主题显示名称 | "Plant Water Transport" |
| `initialScene` | 启动时显示的场景 | "root" |
| `canvasId` | Canvas 元素 ID | "renderCanvas" |
| `direction` | 图片方向缩放 | `{ sphereScaleX: -1, ... }` |
| `initialView` | 初始相机角度 | `{ alpha: 2.3746, beta: 1.5708 }` |
| `initialFov` | 初始缩放级别 | 1.5708 |
| `portals` | 导航热点数组 | 见下方 |

---

### 步骤 3: 获取正确的坐标

#### 3.1 使用调试工具

1. 在浏览器中打开 `index-modular.html?debug`
2. 导航到目标场景
3. **点击球体上想放置热点的位置**
4. 坐标会自动复制到剪贴板 ✨
5. 粘贴到 `portals[].position` 中

#### 3.2 调整初始视角

1. 在目标场景中，用鼠标拖动找到满意的视角
2. 调试面板显示当前 `alpha` 和 `beta` 值
3. 复制这些值到 `initialView` 中

#### 3.3 调整缩放

1. 使用 +/- 按钮或滚轮调整缩放
2. 调试面板显示当前 `FOV` 值
3. 复制值到 `initialFov` 中

---

### 步骤 4: 更新主HTML文件

编辑 `index-modular.html`：

```html
<!-- 旧配置 -->
<script src="themes/digestive-system.js"></script>
<script>
    const viewer = new VRViewer(DIGESTIVE_SYSTEM_THEME);
    viewer.init();
</script>

<!-- 改为新配置 -->
<script src="themes/plant-transport.js"></script>
<script>
    const viewer = new VRViewer(PLANT_TRANSPORT_THEME);
    viewer.init();
</script>
```

或者使用主题选择器（高级方式）：

```html
<script>
    // 从 URL 参数读取主题
    const urlParams = new URLSearchParams(window.location.search);
    const themeName = urlParams.get('theme') || 'plant-transport';
    
    // 动态加载主题脚本
    const script = document.createElement('script');
    script.src = `themes/${themeName}.js`;
    script.onload = () => {
        const themeVar = themeName.toUpperCase().replace(/-/g, '_') + '_THEME';
        const themeConfig = window[themeVar];
        if (themeConfig) {
            const viewer = new VRViewer(themeConfig);
            viewer.init();
        } else {
            console.error(`Theme ${themeName} not found`);
        }
    };
    document.head.appendChild(script);
</script>
```

---

### 步骤 5: 测试

#### 5.1 本地测试

```bash
# 方式1: 使用 Python 简单服务器
python -m http.server 8000

# 方式2: 使用 Node.js
npx http-server

# 然后访问
http://localhost:8000/VR/index-modular.html
```

#### 5.2 检查清单

- [ ] 所有图片都加载成功（检查浏览器控制台）
- [ ] 初始场景正确显示
- [ ] 导航热点能正确跳转
- [ ] 相机旋转和缩放正常
- [ ] 响应式设计在手机上也能用
- [ ] 调试信息面板显示正确的坐标

#### 5.3 常见问题

**问：图片不显示**
- 检查文件路径是否正确
- 确保使用了 `getAssetPath()` 或 `getAssetMap()`
- 检查文件是否存在

**问：热点位置不对**
- 使用调试工具重新获取坐标
- 确保点击的是正确的位置

**问：初始视角错误**
- 使用调试面板找到正确的 alpha 和 beta
- 更新 `initialView` 配置

---

## 完整文件清单

创建完整主题需要的文件：

```
VR/
├── assets/themes/plant-transport/
│   ├── root.png
│   ├── stem.png
│   ├── leaf.png
│   └── flower.png
│
├── themes/
│   ├── plant-transport.js        ← 新创建
│   ├── digestive-system.js       ← 现有
│   ├── digestive-system-modular.js
│   ├── theme-template.js
│   └── asset-helper.js           ← 资源助手
│
├── vr-viewer.js
├── index-modular.html            ← 更新引用
├── style-modular.css
├── ASSET_MANAGEMENT.md           ← 本文档
└── CREATE_THEME.md               ← 本指南
```

---

## 示例对比

### 不使用资源助手（旧方式）

```javascript
const THEME = {
    hotspots: {
        root: {
            name: "Root",
            texture: "assets/themes/plant-transport/root.png",  // 重复写路径
            // ...
        },
        stem: {
            name: "Stem",
            texture: "assets/themes/plant-transport/stem.png",  // 重复写路径
            // ...
        },
        leaf: {
            name: "Leaf",
            texture: "assets/themes/plant-transport/leaf.png",  // 重复写路径
            // ...
        }
    }
};
```

### 使用资源助手（新方式）✨

```javascript
const ASSETS = getAssetMap("plant-transport", ["root", "stem", "leaf"]);

const THEME = {
    hotspots: {
        root: {
            name: "Root",
            texture: ASSETS.root,  // 简洁！
            // ...
        },
        stem: {
            name: "Stem",
            texture: ASSETS.stem,  // 简洁！
            // ...
        },
        leaf: {
            name: "Leaf",
            texture: ASSETS.leaf,  // 简洁！
            // ...
        }
    }
};
```

---

## 下一步

1. ✅ 完成初始主题
2. 🔄 根据反馈调整
3. 📦 部署到 GitHub Pages
4. 🎯 创建更多主题（复用相同工作流）

---

## 快速参考

### 资源助手函数

```javascript
// 获取单个路径
getAssetPath("plant-transport", "root")
// → assets/themes/plant-transport/root.png

// 获取多个路径的映射
getAssetMap("plant-transport", ["root", "stem", "leaf"])
// → { root: "...", stem: "...", leaf: "..." }

// 预加载资源
preloadAssets([ASSETS.root, ASSETS.stem])

// 验证配置
validateThemeAssets(PLANT_TRANSPORT_THEME)

// 获取统计信息
getAssetStats(PLANT_TRANSPORT_THEME)
```

### 调试技巧

```javascript
// 在浏览器控制台
printAssetConfig()          // 打印资源配置
validateThemeAssets(config) // 验证所有资源
getAssetStats(config)       // 获取统计信息
viewer.loadScene('root')    // 加载特定场景
```

---

## 支持

有问题？检查：
1. [ASSET_MANAGEMENT.md](ASSET_MANAGEMENT.md) - 资源管理指南
2. [MODULARITY_GUIDE.md](MODULARITY_GUIDE.md) - 模块化指南
3. 浏览器控制台错误信息
4. 打开 `?debug` 参数查看调试面板

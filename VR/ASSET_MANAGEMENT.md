# VR 查看器 - 图片资源管理指南

## 推荐的文件夹结构

```
VR/
├── assets/
│   ├── themes/
│   │   ├── digestive-system/
│   │   │   ├── mouth.png
│   │   │   ├── pharynx.png
│   │   │   ├── esophagus.png
│   │   │   ├── stomach.png
│   │   │   ├── stomach2.png
│   │   │   ├── stomach3.png
│   │   │   └── small_intestine.png
│   │   │
│   │   ├── plant-transport/
│   │   │   ├── root.png
│   │   │   ├── stem.png
│   │   │   ├── leaf.png
│   │   │   └── flower.png
│   │   │
│   │   └── [其他主题]/
│   │
│   └── shared/           # 共用资源（如果有）
│       └── [icons, etc]
│
├── themes/
│   ├── digestive-system.js
│   ├── plant-transport.js
│   └── theme-template.js
│
├── vr-viewer.js
├── index-modular.html
├── style-modular.css
└── ASSET_MANAGEMENT.md    # 此文件
```

## 三种图片路径管理方案

### 方案 A：相对路径（推荐用于开发）

**优点**：简洁、易于本地测试
**缺点**：部署时需要注意服务器配置

```javascript
// themes/digestive-system.js
const DIGESTIVE_SYSTEM_THEME = {
    hotspots: {
        mouth: {
            texture: "assets/themes/digestive-system/mouth.png",
            // ...
        }
    }
};
```

### 方案 B：绝对路径（推荐用于部署）

**优点**：清晰明确、避免路径混淆
**缺点**：需要正确配置服务器根路径

```javascript
// themes/digestive-system.js
const BASE_URL = "/chihhsiangchien.github.io";  // GitHub Pages 路径

const DIGESTIVE_SYSTEM_THEME = {
    hotspots: {
        mouth: {
            texture: BASE_URL + "/VR/assets/themes/digestive-system/mouth.png",
            // ...
        }
    }
};
```

### 方案 C：CDN 路径（推荐用于优化）

**优点**：利用 CDN 加快加载、版本管理清晰
**缺点**：需要上传到 CDN

```javascript
const CDN_URL = "https://cdn.example.com/vr-assets";

const DIGESTIVE_SYSTEM_THEME = {
    hotspots: {
        mouth: {
            texture: CDN_URL + "/digestive-system/mouth.png",
            // ...
        }
    }
};
```

## 最佳实践

### 1. 使用主题专用的资源助手

创建 `themes/asset-helper.js`：

```javascript
/**
 * 资源路径助手
 * 避免在每个配置文件中重复编写路径
 */

// 配置资源基础路径
const ASSET_CONFIG = {
    basePath: "/VR/assets/themes",
    // 或使用 CDN: "https://cdn.example.com/vr-assets"
};

/**
 * 获取主题资源路径
 * @param {string} themeName - 主题名称
 * @param {string} fileName - 文件名
 * @returns {string} 完整路径
 */
function getAssetPath(themeName, fileName) {
    return `${ASSET_CONFIG.basePath}/${themeName}/${fileName}`;
}

/**
 * 批量获取场景资源
 * @param {string} themeName - 主题名称
 * @param {array} sceneNames - 场景名称数组
 * @returns {object} 资源映射
 */
function getAssetMap(themeName, sceneNames) {
    const map = {};
    sceneNames.forEach(scene => {
        map[scene] = getAssetPath(themeName, `${scene}.png`);
    });
    return map;
}
```

### 2. 简化的主题配置

```javascript
// themes/digestive-system.js
// 使用资源助手避免重复

const THEME_NAME = "digestive-system";
const SCENE_NAMES = ["mouth", "pharynx", "esophagus", "stomach", "stomach2", "stomach3", "small_intestine"];
const ASSETS = getAssetMap(THEME_NAME, SCENE_NAMES);

const DIGESTIVE_SYSTEM_THEME = {
    name: "Digestive System",
    initialScene: "mouth",
    hotspots: {
        mouth: {
            name: "嘴巴",
            texture: ASSETS.mouth,  // 简洁明了
            direction: { /* ... */ },
            initialView: { /* ... */ },
            initialFov: 1.6581,
            portals: [ /* ... */ ]
        },
        // ...其他场景
    }
};
```

### 3. 图片命名规范

```
[themeName]_[sceneName]_[version].[format]

示例：
- digestive-system_mouth_v1.png
- plant-transport_root_v2.png
- cell-biology_nucleus_v1.png

或简化版本（推荐）：
- mouth.png
- pharynx.png
- root.png
- stem.png
```

### 4. 版本管理

```
assets/
├── digestive-system/
│   ├── v1/
│   │   ├── mouth.png
│   │   └── ...
│   ├── v2/
│   │   ├── mouth.png (改进版)
│   │   └── ...
│   └── latest/ -> v2 (符号链接)
```

### 5. 图片优化建议

#### 分辨率和大小

| 用途 | 分辨率 | 文件大小 | 备注 |
|------|--------|---------|------|
| 标准 VR | 4096×2048 | 2-4MB | 最佳质量 |
| 中等 VR | 2048×1024 | 800KB-1.5MB | 平衡质量 |
| 移动 VR | 1024×512 | 200-400KB | 快速加载 |

#### 文件格式

```
WebP > JPEG > PNG (按压缩率)

推荐：
- WebP: 最小文件，最好压缩（现代浏览器支持）
- JPEG: 平衡方案，广泛兼容
- PNG: 需要透明时使用
```

#### 优化工具

```bash
# 转换为 WebP
cwebp input.png -o output.webp -q 80

# 压缩 PNG
optipng -o2 input.png

# 压缩 JPEG
jpegoptim --max=85 input.jpg

# 批量转换脚本（见下方）
```

## 批量图片处理脚本

### Python 脚本（图片转换和压缩）

```python
#!/usr/bin/env python3
"""
批量转换和压缩 VR 场景图片
"""

import os
from PIL import Image
import subprocess

def process_theme(theme_name, scene_names, input_dir, output_dir):
    """
    处理主题的所有图片
    """
    os.makedirs(output_dir, exist_ok=True)
    
    for scene in scene_names:
        input_path = os.path.join(input_dir, f"{scene}.png")
        
        if not os.path.exists(input_path):
            print(f"⚠️  Skip: {input_path} not found")
            continue
        
        # 转换为 WebP（推荐）
        webp_path = os.path.join(output_dir, f"{scene}.webp")
        img = Image.open(input_path)
        img.save(webp_path, 'WEBP', quality=85, method=6)
        print(f"✓ {scene}.png → {scene}.webp")
        
        # 同时保留 PNG（备用）
        output_png = os.path.join(output_dir, f"{scene}.png")
        img_compressed = img.copy()
        img_compressed.save(output_png, 'PNG', optimize=True)
        print(f"✓ Compressed PNG: {scene}.png")

# 使用示例
if __name__ == "__main__":
    # 消化系统
    process_theme(
        theme_name="digestive-system",
        scene_names=[
            "mouth", "pharynx", "esophagus", 
            "stomach", "stomach2", "stomach3", 
            "small_intestine"
        ],
        input_dir="./input/digestive-system",
        output_dir="./VR/assets/themes/digestive-system"
    )
    
    # 植物运输
    process_theme(
        theme_name="plant-transport",
        scene_names=["root", "stem", "leaf", "flower"],
        input_dir="./input/plant-transport",
        output_dir="./VR/assets/themes/plant-transport"
    )
```

### GitHub Actions 自动化（持续集成）

```yaml
# .github/workflows/optimize-assets.yml
name: Optimize VR Assets

on:
  push:
    paths:
      - 'assets/themes/**/*.png'
  workflow_dispatch:

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install tools
        run: |
          sudo apt-get install -y optipng jpegoptim libwebp-tools
      
      - name: Optimize images
        run: |
          python scripts/optimize-images.py
      
      - name: Commit changes
        run: |
          git config user.name "Asset Optimizer"
          git add assets/
          git commit -m "Optimize VR assets" || true
          git push
```

## 部署建议

### GitHub Pages 部署

```javascript
// 开发环境
const ASSET_PATH = "assets/themes";

// 生产环境（GitHub Pages）
const ASSET_PATH = "/chihhsiangchien.github.io/VR/assets/themes";
```

### 自动路径检测

```javascript
/**
 * 自动检测当前环境并设置资源路径
 */
function detectAssetPath() {
    const isLocalhost = window.location.hostname === 'localhost' 
                     || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
        return 'assets/themes';  // 本地开发
    } else {
        const pathArray = window.location.pathname.split('/');
        const repoIndex = pathArray.indexOf('chihhsiangchien.github.io');
        if (repoIndex !== -1) {
            return '/chihhsiangchien.github.io/VR/assets/themes';
        }
        return 'assets/themes';  // 自托管
    }
}

const ASSET_PATH = detectAssetPath();
```

## 多主题场景示例

### 场景1：添加植物运输主题

```javascript
// themes/plant-transport.js
const PLANT_TRANSPORT_THEME = {
    name: "Plant Water Transport",
    initialScene: "root",
    hotspots: {
        root: {
            name: "Root",
            texture: getAssetPath("plant-transport", "root.png"),
            // ...
        },
        stem: {
            name: "Stem",
            texture: getAssetPath("plant-transport", "stem.png"),
            // ...
        },
        leaf: {
            name: "Leaf",
            texture: getAssetPath("plant-transport", "leaf.png"),
            // ...
        }
    }
};
```

### 场景2：在主页中选择主题

```html
<!-- themes-selector.html -->
<div id="theme-selector">
    <h2>选择主题</h2>
    <button onclick="loadTheme('digestive-system')">
        🫀 消化系统
    </button>
    <button onclick="loadTheme('plant-transport')">
        🌿 植物运输
    </button>
    <button onclick="loadTheme('cell-biology')">
        🧬 细胞生物学
    </button>
</div>

<script>
function loadTheme(themeName) {
    // 动态加载主题脚本
    const script = document.createElement('script');
    script.src = `themes/${themeName}.js`;
    script.onload = () => {
        const themeConfig = window[`${themeName.toUpperCase().replace(/-/g, '_')}_THEME`];
        const viewer = new VRViewer(themeConfig);
        viewer.init();
    };
    document.head.appendChild(script);
}
</script>
```

## 清单

- [ ] 创建 `assets/themes/` 目录结构
- [ ] 创建 `asset-helper.js` 助手文件
- [ ] 优化所有图片（转换为 WebP）
- [ ] 更新主题配置使用助手函数
- [ ] 配置正确的资源路径（相对/绝对/CDN）
- [ ] 设置 GitHub Pages 部署路径
- [ ] （可选）创建主题选择页面
- [ ] （可选）设置 CI/CD 自动优化图片

## 总结

**核心原则**：
1. ✅ **按主题分组** - `assets/themes/[theme-name]/`
2. ✅ **使用助手函数** - 避免重复路径编写
3. ✅ **优化文件大小** - WebP 格式 + 压缩
4. ✅ **版本管理** - 便于更新和回滚
5. ✅ **自动化处理** - CI/CD 优化和部署

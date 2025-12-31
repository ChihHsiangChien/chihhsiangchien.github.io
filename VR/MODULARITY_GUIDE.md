# 360° VR 查看器 - 模块化指南

## 项目结构

```
VR/
├── vr-viewer.js              # 核心VR查看器模块
├── style.css                 # 样式文件
├── index-modular.html        # 模块化主HTML文件
├── themes/
│   ├── digestive-system.js   # 消化系统主题
│   ├── theme-template.js     # 主题创建模板
│   └── plant-transport.js    # (待创建) 植物运输主题
└── [图片文件]
```

## 快速开始

### 1. 使用现有主题

```html
<script src="themes/digestive-system.js"></script>
<script>
    const viewer = new VRViewer(DIGESTIVE_SYSTEM_THEME);
    viewer.init();
</script>
```

### 2. 创建新主题

#### 步骤A：创建配置文件

复制 `themes/theme-template.js` 为 `themes/plant-transport.js`

```javascript
const PLANT_TRANSPORT_THEME = {
    name: "植物中的水分运输",
    initialScene: "root",
    canvasId: "renderCanvas",
    hotspots: {
        root: {
            name: "根部",
            texture: "path/to/root.png",
            direction: { /* ... */ },
            initialView: { /* ... */ },
            initialFov: 1.5708,
            portals: [ /* ... */ ]
        },
        // 更多场景...
    }
};
```

#### 步骤B：更新HTML

```html
<!-- 改为你的主题 -->
<script src="themes/plant-transport.js"></script>
<script>
    const viewer = new VRViewer(PLANT_TRANSPORT_THEME);
    viewer.init();
</script>
```

## 核心类：VRViewer

### 初始化选项

```javascript
new VRViewer({
    name: "主题名称",
    initialScene: "startScene",    // 初始加载场景的key
    canvasId: "renderCanvas",      // canvas元素ID
    hotspots: { /* 场景配置 */ }
});
```

### 场景配置格式

```javascript
sceneName: {
    name: "显示名称",
    texture: "image.png",
    direction: {
        sphereScaleX: -1,    // 水平镜像
        sphereScaleY: 1,     // 垂直镜像
        uScale: -1,          // 纹理U缩放
        vScale: -1           // 纹理V缩放
    },
    initialView: {
        alpha: 2.3746,       // 水平旋转角 (弧度)
        beta: 1.5708         // 垂直旋转角 (弧度)
    },
    initialFov: 1.5708,      // 视场角 (弧度)
    portals: [
        {
            name: "→ 前往下一场景",
            position: new BABYLON.Vector3(x, y, z),
            target: "nextScene"
        }
    ]
}
```

## 常见任务

### 任务1：获取场景初始视角

在HTML中打开调试面板，转到想要的视角，点击上下左右拖动。
调试面板会显示：
- **α (Alpha)**: 水平旋转角
- **β (Beta)**: 垂直旋转角
- **FOV**: 视场角

### 任务2：获取热点坐标

1. 调试面板打开
2. 点击球体上想要放置热点的位置
3. 坐标会自动复制到剪贴板
4. 粘贴到 `portals[].position` 中

### 任务3：调整图片方向

如果图片上下颠倒或左右反转，调整 `direction` 中的缩放值：

```javascript
direction: {
    sphereScaleX: -1,  // 左右镜像时改为 1
    sphereScaleY: 1,   // 上下镜像时改为 -1
    uScale: -1,        // 纹理左右翻转时改为 1
    vScale: -1         // 纹理上下翻转时改为 1
}
```

## 相机控制

### 鼠标操作
- **拖动**: 旋转视角
- **滚轮**: 缩放（放大/缩小）
- **点击**: 复制热点坐标（开启调试模式时）

### 按钮操作
- **+ 按钮**: 放大
- **− 按钮**: 缩小

## 调试工具

调试面板显示的信息：
- **α**: 水平旋转角度 (0 ~ 2π)
- **β**: 垂直旋转角度 (0 ~ π)
- **FOV**: 视场角 (π/8 ~ π/2)
- **X, Y, Z**: 鼠标悬停位置的3D坐标

## 性能优化建议

1. **图片尺寸**: 建议 4096×2048 或 2048×1024
2. **图片格式**: 使用PNG或WebP
3. **场景数量**: 保持在10个以内
4. **热点数量**: 每场景不超过5个

## 常用角度参考

### 视场角 (FOV)
```
Math.PI / 8  ≈ 0.39   (最大缩放)
Math.PI / 4  ≈ 0.79   (75°)
Math.PI / 2  ≈ 1.57   (90°标准)
Math.PI      ≈ 3.14   (180°)
```

### 水平角度 (Alpha)
```
0              (向右)
Math.PI / 2    (向上)
Math.PI        (向左)
3*Math.PI/2    (向下)
```

### 垂直角度 (Beta)
```
0              (向上)
Math.PI / 2    (水平)
Math.PI        (向下)
```

## 常见问题

### Q: 图片方向不对？
A: 调整 `direction` 中的四个缩放值，尝试不同组合。

### Q: 热点位置错误？
A: 使用调试面板，点击正确位置，复制自动生成的坐标。

### Q: 如何添加更多场景？
A: 在 `hotspots` 对象中添加新的场景配置，确保 `target` 指向存在的场景key。

### Q: 相机能否旋转超过限制？
A: 不能。代码已锁定相机距离，FOV也有上下限制，无法看到球体外部。

## 模块化的优势

✅ **易于维护**: 核心逻辑与主题配置分离
✅ **可重用**: 直接创建新主题文件，无需修改核心代码
✅ **可扩展**: 支持无限数量的场景和主题
✅ **配置驱动**: 通过JSON风格的配置控制所有行为
✅ **易于测试**: 单独测试主题或核心功能

# 多通道影像分析

## 簡介
多通道（Multi-channel）影像分析是現代生物醫學研究中的重要工具，能夠同時觀察多個目標分子或結構的分布與相互關係。本章將介紹多通道影像的處理技術，特別是共定位分析與ROI分析方法。

## 基本概念

### 影像強度
- 灰度值定義
- 像素強度範圍
- 背景與訊號
- 飽和與線性範圍

### 多通道影像
- 通道類型
- 通道分離
- 通道對應
- 光譜重疊

## 單通道分析

### 基本測量
- 平均強度
- 積分密度
- 最大/最小值
- 標準差

### 背景校正
- 背景定義
- 減去背景
- Rolling ball法
- 局部背景

## 多通道分析

### 通道準備
1. 通道分離
   - `Image > Color > Split Channels`
   - 通道命名
   - 通道對齊

2. 通道校正
   - 漂白校正
   - 串擾校正
   - 背景校正

### 共定位分析
- Pearson相關係數
- Manders重疊係數
- 共定位面積
- 強度相關性

## 定量分析方法

### ROI分析
- 選擇感興趣區域
- 多通道測量
- 數據比較
- 統計分析

### 線掃描分析
- 強度剖面
- 多通道比較
- 峰值分析
- 訊號分布

## 多通道影像基礎

### 通道類型
1. 螢光通道
    - DAPI：細胞核標記
    - GFP：綠色螢光蛋白
    - RFP：紅色螢光蛋白
    - 其他螢光染料

2. 透射光通道
    - 明場（Brightfield）
    - 相差（Phase Contrast）
    - DIC（Differential Interference Contrast）

### 基本操作
1. 通道分離
```
    run("Split Channels");
```

2. 通道合併
```
    run("Merge Channels...", "c1=[Channel1] c2=[Channel2] c3=[Channel3] create");
```

3. 通道轉換
    - RGB轉HSB
    - 複合通道轉單通道
    - 偽彩色設定

## 共定位分析

### 基本概念
- 共定位（Colocalization）定義
- 空間重疊（Spatial Overlap）
- 強度相關（Intensity Correlation）
- 分析意義與限制

### 分析方法
1. 定性分析
    - 通道疊加
    - 散點圖（Scatter Plot）
    - RGB合成

2. 定量分析
    - Pearson相關係數
    - Manders重疊係數
    - Costes方法
    - Li強度相關商

### 實作步驟
1. 影像預處理
```
    // 背景校正
    run("Subtract Background...", "rolling=50");
    
    // 通道對齊
    run("Align Channels");
    
    // 雜訊過濾
    run("Gaussian Blur...", "sigma=1");
```

2. 共定位分析
```
    // 使用JACoP插件
    run("JACoP", "img1=[Channel1] img2=[Channel2] pearson manders li");
```

3. 結果可視化
```
    // 生成共定位圖
    run("Colocalization Highlighter");
```

## ROI分析

### ROI操作基礎
1. ROI選擇工具
    - 矩形選擇
    - 橢圓選擇
    - 多邊形選擇
    - 自由手繪

2. ROI管理器
```
    run("ROI Manager...");
    roiManager("Add");
    roiManager("Select", 0);
```

### 多通道ROI分析
1. 交集分析
```
    // ROI交集
    roiManager("AND");
```

2. 聯集分析
```
    // ROI聯集
    roiManager("OR");
```

3. 排除分析
```
    // ROI排除
    roiManager("XOR");
```

### 定量分析
1. 基本測量
```
    // 設置測量參數
    run("Set Measurements...", 
       "area mean standard integrated display redirect=None decimal=3");
    
    // 執行測量
    roiManager("Multi Measure");
```

2. 通道間比較
    - 強度比率
    - 面積重疊
    - 形態相關性

## 應用實例

### 案例 1：蛋白質共定位分析
1. 實驗設置
    - 雙重免疫螢光染色
    - 共聚焦顯微鏡成像
    - 多視野採集

2. 分析流程
```
    // 通道分離
    run("Split Channels");
    
    // 背景校正
    selectWindow("C1-Image");
    run("Subtract Background...", "rolling=50");
    selectWindow("C2-Image");
    run("Subtract Background...", "rolling=50");
    
    // 共定位分析
    run("Coloc 2", "channel_1=[C1-Image] channel_2=[C2-Image]");
```

### 案例 2：細胞器分布分析
1. 數據採集
    - 多重標記
    - Z-stack掃描
    - 時序觀察

2. ROI分析步驟
```
    // ROI選擇
    roiManager("Add");
    
    // 多通道測量
    roiManager("Multi Measure");
    
    // 結果輸出
    saveAs("Results", "measurements.csv");
```

## 進階技術

### 3D共定位
1. Z-stack處理
    - 體積重建
    - 3D ROI
    - 立體可視化

2. 分析方法
    - 體積重疊
    - 3D強度相關
    - 距離分析

### 時序分析
1. 動態共定位
    - 時間序列追蹤
    - 相關性變化
    - 事件檢測

2. ROI追蹤
    - 運動分析
    - 形態變化
    - 強度動態


## 實作練習

### 練習 1：基本強度分析
1. 通道分離與處理
2. ROI強度測量
3. 背景校正
4. 數據分析

### 練習 2：多通道分析
1. 共定位分析
2. 時間序列分析
3. 數據標準化
4. 結果可視化
# 3D重建與影像配準

## 簡介
3D重建（3D Reconstruction）和影像配準（Image Registration）是現代生物醫學影像分析中的關鍵技術，能夠提供樣本的立體結構信息並實現不同影像間的精確對齊。

## 3D重建基礎

### 基本概念
1. 數據類型
   - Z-stack序列
   - 連續切片
   - 共聚焦掃描
   - 光片顯微鏡

2. 成像參數
   - Z間距（Z-step）
   - 光學切片厚度
   - 體素大小
   - 點擴散函數（PSF）

### 重建流程
1. 資料預處理
   ```
   // 去噪
   run("Gaussian Blur 3D...");
   
   // 背景校正
   run("Subtract Background...", "rolling=50 stack");
   ```

2. 重建方法
   - 表面重建
   - 體積重建
   - 最大強度投影
   - 等值面提取

## 3D視覺化

### 基本顯示
1. 正交視圖
   ```
   // 開啟正交視圖
   run("Orthogonal Views");
   ```

2. 投影方法
   ```
   // 最大強度投影
   run("Z Project...", "projection=[Max Intensity]");
   
   // 平均強度投影
   run("Z Project...", "projection=[Average Intensity]");
   ```

### 3D渲染
1. Volume Viewer
   ```
   run("Volume Viewer");
   ```

2. 3D Viewer
   ```
   run("3D Viewer");
   // 設置渲染參數
   call("ij3d.ImageJ3DViewer.setTransparency", "50");
   ```

## 影像配準

### 配準原理
1. 變換類型
   - 剛體變換
   - 仿射變換
   - 非線性變換
   - 彈性變換

2. 相似性度量
   - 互相關
   - 互信息
   - 均方差
   - 特徵匹配

### 配準方法
1. 手動配準
   ```
   // 使用TrakEM2
   run("TrakEM2");
   ```

2. 自動配準
   ```
   // 使用StackReg
   run("StackReg", "transformation=Rigid");
   
   // 使用MultiStackReg
   run("MultiStackReg", "stack_1=[] action_1=Align file_1=[] stack_2=None action_2=Ignore file_2=[]");
   ```

## 實作範例




### 案例 1：神經元3D重建
1. 資料採集
   - 共聚焦Z-stack
   - 多通道掃描
   - 高解析度成像

2. 處理流程
   ```
   // 去噪與增強
   run("Gaussian Blur 3D...", "x=2 y=2 z=1");
   run("Enhance Contrast...", "saturated=0.35 process_all");
   
   // 分割
   setAutoThreshold("Otsu dark stack");
   run("Convert to Mask", "method=Otsu background=Dark");
   
   // 3D重建
   run("3D Viewer");
   call("ij3d.ImageJ3DViewer.add", "mask", "Green", "mask", "50", "true", "true", "true", "1");
   ```

### 案例 2：組織切片配準
1. 準備工作
   - 連續切片
   - 染色標記
   - 掃描成像

2. 配準步驟
   ```
   // 影像對齊
   run("MultiStackReg", "stack_1=[] action_1=[Use as Reference] file_1=[] stack_2=[] action_2=[Align to First Stack] file_2=[]");
   
   // 變形校正
   run("UnwarpJ", "source_image=source target_image=target");
   ```

## 進階技術

### 多通道3D分析
1. 通道配準
   - 色差校正
   - 通道對齊
   - 空間校準

2. 共定位分析
   ```
   // 3D共定位
   run("Coloc 3D", "channel_1=[] channel_2=[] roi=[]");
   ```

### 時序3D分析
1. 4D重建
   - 時間序列
   - 動態重建
   - 運動分析

2. 追蹤分析
   ```
   // 4D追蹤
   run("MTrack4D");
   ```

## 定量分析

### 3D測量
1. 體積測量
   ```
   // 設置3D測量
   run("3D Manager");
   Ext.Manager3D_AddImage();
   Ext.Manager3D_Count(nb);
   Ext.Manager3D_Measure3D(0, "Vol", vol);
   ```

2. 形態分析
   - 表面積
   - 球形度
   - 方向性
   - 分支分析

### 空間分析
1. 距離測量
   - 最短距離
   - 表面距離
   - 中心距離

2. 分布分析
   - 密度分布
   - 空間關係
   - 群聚分析

## 結果輸出

### 數據導出
1. 測量結果
   ```
   // 保存測量結果
   saveAs("Results", "3D_measurements.csv");
   ```

2. 3D模型
   - OBJ格式
   - STL格式
   - 動畫序列

### 可視化輸出
1. 靜態展示
   - 截面圖
   - 投影圖
   - 立體圖

2. 動態展示
   ```
   // 製作動畫
   run("Animation Options...");
   run("Create AVI...");
   ```

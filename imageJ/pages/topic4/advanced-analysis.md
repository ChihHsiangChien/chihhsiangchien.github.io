# 進階影像分析

## 共定位分析

### 基本概念
- 什麼是共定位
- 應用場景
- 分析準備

### 分析方法
- Pearson相關係數
- Manders重疊係數
- Costes方法
- JACoP插件

### 結果解釋
- 係數含義
- 統計顯著性
- 視覺化展示

### 實際應用案例
1. 蛋白質互動研究
   - 膜蛋白與受體共定位
   - 轉錄因子與染色質結合
   - 細胞器標記驗證

2. 藥物運送追蹤
   - 藥物與細胞器共定位
   - 內吞途徑分析
   - 藥物累積位置確認

### 操作流程
1. 影像準備
   ```
   Image > Color > Split Channels
   ```
   - 分離螢光通道
   - 背景校正
   - 設定閾值

2. 共定位分析
   ```
   Plugins > Colocalization > Coloc 2
   ```
   - 選擇待分析通道
   - 設定ROI區域
   - 選擇分析方法
   - 運行分析

3. 結果解釋
   - Pearson係數 > 0.5表示顯著共定位
   - Manders係數：M1、M2分別表示各通道重疊比例
   - 隨機化檢驗：p < 0.05為顯著

## 粒子分析

### 分析設定
- 使用 `Analyze > Analyze Particles`
- 大小範圍
- 圓度範圍
- 排除邊緣物件

### 測量參數
- 數量統計
- 大小分布
- 形狀特徵
- 強度測量

### 結果處理
- 標記物件
- 輪廓描繪
- 數據匯出

### 應用實例
1. 細胞計數
   - 細胞核計數
   - 細菌菌落計數
   - 細胞凋亡分析

2. 顆粒分析
   - 囊泡大小分布
   - 粒線體形態分析
   - 突觸小泡計數

### 操作流程
1. 影像預處理
   ```
   Process > Subtract Background...
   Process > Binary > Make Binary
   ```
   - 背景去除
   - 二值化處理
   - 雜訊消除

2. 粒子分析設定
   ```
   Analyze > Set Measurements...
   Analyze > Analyze Particles...
   ```
   參數設置：
   - Size: 50-Infinity
   - Circularity: 0.50-1.00
   - Show: Outlines
   - Display results
   - Summarize

## 形態測量

### 基本形態參數
- 面積
- 周長
- 圓度
- 長寬比

### 進階形態分析
- Feret直徑
- 凸包分析
- 骨架化分析
- 分形維度

### 形態分類
- 形狀描述子
- 分類標準
- 自動分類

### 實例應用
1. 神經元分析
   - 樹突分支複雜度
   - 軸突長度測量
   - 生長錐形態分析

2. 組織病理
   - 細胞形態分類
   - 組織結構評估
   - 腫瘤邊界分析

### 操作流程
1. 基本形態測量
   ```
   Analyze > Set Measurements...
   ```
   選擇測量項目：
   - Area
   - Perimeter
   - Shape descriptors
   - Feret's diameter

2. 骨架化分析
   ```
   Process > Binary > Skeletonize
   Analyze > Skeleton > Analyze Skeleton
   ```
   - 獲取分支點數量
   - 測量分支長度
   - 計算分支角度

## 時間序列分析

### 動態測量
- 運動追蹤
- 速度計算
- 方向分析

### 螢光動力學
- 漂白校正
- FRAP分析
- 螢光衰減

### 數據處理
- 軌跡重建
- 運動特徵
- 統計分析

### 實例應用
1. 細胞遷移
   - 傷口癒合實驗
   - 趨化性分析
   - 單細胞追蹤

2. 鈣離子動力學
   - 鈣離子波動
   - 訊號傳播
   - 反應動力學

### 操作流程
1. 運動追蹤
   ```
   Plugins > Tracking > Manual Tracking
   ```
   或
   ```
   Plugins > TrackMate
   ```
   - 設定追蹤參數
   - 選擇追蹤物件
   - 生成運動軌跡

2. FRAP分析
   ```
   Image > Stacks > Plot Z-axis Profile
   ```
   - 選擇ROI區域
   - 測量螢光恢復
   - 擬合恢復曲線

## 3D分析

### 體積重建
- Z-stack處理
- 表面重建
- 體積計算

### 3D測量
- 空間距離
- 體積測量
- 表面積計算

### 3D視覺化
- 體積渲染
- 表面渲染
- 剖面分析

## 實作練習

### 練習 1：共定位分析
1. 準備工作
   - 開啟雙通道影像
   - 檢查影像品質
   - 設定分析區域

2. 分析步驟
   ```
   1. Image > Color > Split Channels
   2. Plugins > Colocalization > Coloc 2
   3. 設定分析參數
   4. 運行分析
   5. 導出結果
   ```

3. 結果解釋
   - 檢查係數值
   - 製作散點圖
   - 生成報告

### 練習 2：粒子追蹤
1. 影像預處理
   ```
   1. Process > Subtract Background...
   2. Image > Adjust > Threshold
   3. Process > Binary > Watershed
   ```

2. 追蹤設定
   ```
   1. Plugins > TrackMate
   2. 選擇檢測器（如DoG detector）
   3. 設定追蹤參數
   4. 運行追蹤
   ```

3. 結果分析
   - 檢查追蹤軌跡
   - 計算運動參數
   - 製作軌跡圖

# 堆疊影像與基本操作

## 簡介
堆疊影像（Image Stack）是ImageJ處理多維度影像資料的重要功能，本章節將介紹如何操作和分析堆疊影像。

## 堆疊影像基礎

### 什麼是堆疊影像（Image Stack）？
- Z軸堆疊（Z-stack）：不同深度的切面影像
- 時間序列（Time Series）：連續時間點的影像
- 多通道螢光（Multi-channel Fluorescence）：不同波長的螢光影像
- 超堆疊（Hyperstack）：結合多個維度的影像集合

### 常見應用場景
- 共軛焦Z軸掃描（Confocal Z-scanning）
- 活細胞影像（Live Cell Imaging）
- 多重免疫螢光（Multi-immunofluorescence）
- 連續切片掃描（Serial Section Scanning）

## 基本操作方法

### 堆疊導航
- 使用滑鼠滾輪瀏覽切片
- 使用方向鍵切換影像
- 使用滑桿選擇特定切片
- 設定播放速度和方向

### 影像投影
1. 最大強度投影（Maximum Intensity Projection）
   - 螢光顯微鏡3D成像
     * 觀察細胞內特定蛋白質的分布
     * 顯示神經元的完整形態
   - 血管造影
     * 呈現完整的血管網路結構
     * 觀察血管分支模式
   - 組織切片重建
     * 展示組織內特定標記的分布
     * 突顯高信號區域

2. 平均強度投影（Average Intensity Projection）
   - 降低影像雜訊
     * 減少隨機雜訊影響
     * 提高信號品質
   - 時間序列分析
     * 觀察細胞活動的平均狀態
     * 分析蛋白質的一般分布模式
   - 背景分析
     * 評估樣品的整體螢光強度
     * 計算基準信號水平

3. 最小強度投影（Minimum Intensity Projection）
   - 暗區分析
     * 檢測細胞核或空泡
     * 識別組織中的孔洞結構
   - 背景校正
     * 估計背景信號水平
     * 建立基線強度參考
   - 缺陷檢測
     * 尋找組織中的裂縫或缺陷
     * 分析細胞膜完整性

4. 標準差投影（Standard Deviation Projection）
   - 動態分析
     * 觀察細胞運動軌跡
     * 分析鈣離子訊號波動
   - 結構變異
     * 檢測組織形態的變化程度
     * 評估細胞膜的動態變化
   - 信號波動
     * 分析螢光強度的變化範圍
     * 識別高活性區域 

### 通道操作

1. 通道分離（Channel Splitting）
   ```
   Image > Color > Split Channels
   ```
   操作步驟：
   - 開啟多通道影像檔案
   - 執行Split Channels命令
   - 自動產生獨立的通道視窗
   - 各通道以灰階方式顯示
  


2. 通道合併（Channel Merging）
   ```
   Image > Color > Merge Channels...
   ```
   操作步驟：
   - 開啟Merge Channels對話框
   - 為每個通道選擇對應的影像
   - 指定各通道的顯示顏色
   - 勾選"Create composite"選項
   - 點擊OK完成合併
   
   合併選項：
   - 可選擇RGB或自定義顏色
   - 支援2-7個通道合併
   - 可調整各通道權重

3. 偽彩色（Pseudo-color）設定
   ```
   Image > Lookup Tables
   ```
   操作步驟：
   - 選擇目標通道
   - 開啟LUT選單
   - 選擇需要的顏色映射表
   - 套用到當前通道
   
   常用LUT：
   - Fire (熱圖)
   - Rainbow RGB
   - Red/Green/Blue
   - 16 colors
   - Spectrum

4. 合成影像（Composite Image）製作
   ```
   Image > Color > Channels Tool...
   ```
   操作步驟：
   - 開啟Channels Tool
   - 選擇顯示模式（Composite）
   - 調整各通道參數：
     * 開關通道顯示
     * 調整亮度/對比度
     * 設定通道顏色
   - 設定混合模式
   
   進階設定：
   - More > Properties：設定通道名稱
   - More > Split Channels：需要分離時使用
   - Settings：調整顯示參數
   
   快速操作：
   - 使用快捷鍵c切換顯示模式
   - 數字鍵1-7切換通道
   - Shift+數字鍵疊加顯示通道

5. 批次處理多通道
   ```
   Process > Batch > Convert...
   ```
   操作步驟：
   - 選擇輸入資料夾
   - 設定輸出格式
   - 指定處理參數
   - 執行批次轉換

## 進階功能

### 堆疊對齊（Stack Registration）
- 選擇對齊方法（Registration Method）
- 設定參考幀（Reference Frame）
- 調整對齊參數

### 記憶體管理
- 虛擬堆疊（Virtual Stack）使用
- 記憶體分配（Memory Allocation）
- 批次處理（Batch Processing）

### 影像優化
- 影像降採樣（Image Downsampling）
- 背景校正
- 訊雜比改善


## 實作練習

### 練習 1：基本堆疊操作
1. 開啟多通道Z軸堆疊影像
2. 調整各通道顯示參數
3. 製作最大強度投影

### 練習 2：影像對齊與分析
1. 對齊時間序列影像
2. 測量特定結構的變化
3. 輸出分析結果
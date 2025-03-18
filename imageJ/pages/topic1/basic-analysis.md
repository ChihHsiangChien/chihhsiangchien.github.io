# 基本分析工具

## 測量與分析工具

### 影像資訊（Image Info）
應用時機：
- 檢查顯微鏡拍攝參數是否正確
- 確認影像解析度是否足夠進行分析
- 驗證不同批次影像的一致性
- 準備發表文章時確認影像規格

操作流程：
- 使用 `Image > Show Info` 查看：
  - 影像尺寸（Dimensions）
  - 解析度（Resolution）
  - 色彩深度（Bit Depth）
  - 檔案資訊（File Info）

1. File > Open... 開啟影像
2. Image > Show Info 顯示資訊
3. Image > Properties... 查看詳細屬性

重要參數檢查：
- 像素大小：確認空間解析度（例如：0.2μm/pixel）
- 影像大小：確保記憶體足夠處理（如：2048x2048）
- 位元深度：確認動態範圍（常見：8-bit或16-bit）

### 直方圖分析（Histogram）
應用時機：
- 評估影像曝光是否適當
- 檢查影像對比度
- 判斷閾值分割的合適範圍
- 分析螢光強度分布

操作流程：
- 使用 `Analyze > Histogram` 進行：
  - 灰階分布分析
  - 像素值統計
  - 對比度評估
  - 曝光度檢查

1. Analyze > Histogram
2. 設定bins數量（預設256）
3. 勾選相關選項：
   - Show Statistics
   - Copy to Results
   - List Values

分析要點：
- 正常曝光：峰值應在中間範圍
- 過度曝光：出現在最右側截斷
- 曝光不足：分布集中在左側

### ROI管理器（ROI Manager）
應用時機：
- 多個細胞的批次測量
- 時間序列中追蹤固定區域
- 不同切片間對應區域比較
- 重複實驗的標準化分析

操作流程：
- 使用 `Analyze > Tools > ROI Manager`：
  - 儲存選擇區域
  - 批次測量
  - ROI集合管理
  - 標記位置記錄

1. 選擇ROI工具（矩形、橢圓等）
2. Analyze > Tools > ROI Manager
3. Add 添加選區
4. Measure 進行測量

## 基本測量功能

### 空間測量
應用案例：
1. 長度測量
   - 神經突觸長度測量
   - 血管分支長度計算
   - 細胞遷移距離追蹤
   
操作流程：
1. 設定比例尺：Analyze > Set Scale
2. 選擇直線工具
3. 繪製測量線
4. 按M鍵測量或Analyze > Measure

2. 面積測量
   應用：
   - 細胞面積統計
   - 組織切片面積計算
   - 腫瘤生長面積追蹤
   
   操作流程：
1. 選擇選擇工具（矩形/橢圓/多邊形）
2. 圈選目標區域
3. Analyze > Measure
4. Results視窗查看結果

### 密度測量
應用案例：
1. 光密度測量
   - 蛋白質表達量分析
   - 組織染色強度評估
   - 螢光標記定量分析
   
操作流程：
1. Analyze > Set Measurements...
   - 勾選 Mean gray value
   - 勾選 Integrated density
2. 選擇測量區域
3. Analyze > Measure

## 數據分析

### 基本統計
- 平均值（Mean）
- 標準差（Standard Deviation）
- 最大/最小值
- 中位數（Median）

### 數據輸出
- Excel格式
- CSV格式
- 文字檔案


### 批次處理實例
應用場景：
1. 大量切片分析
   - 100張組織切片的面積測量
   - 多個視野的細胞計數
   - 時間序列的螢光強度追蹤

操作流程：
1. 錄製巨集：
   Plugins > Macros > Record...
2. 執行標準操作流程：
   - 開啟影像
   - 設定閾值
   - 執行測量
   - 保存結果
3. 停止錄製並保存巨集
4. 批次執行：
   Process > Batch > Macro...

## 實作練習

### 練習 1：基本測量
1. 選擇測量區域
2. 設定測量參數
3. 執行測量
4. 分析測量結果

### 練習1：細胞面積測量
目標：測量50個細胞的面積並進行統計分析

步驟：
1. 開啟影像：File > Open...
2. 設定比例尺：Analyze > Set Scale...
3. 設定測量項目：
   Analyze > Set Measurements...
   - Area
   - Mean gray value
   - Perimeter
4. 使用ROI Manager批次測量：
   - 圈選細胞
   - Add to ROI Manager
   - Measure All
5. 數據分析：
   - 計算平均值和標準差
   - 繪製分布圖
   - 導出Excel進行進階分析

### 練習2：螢光強度定量
目標：分析細胞核和細胞質的螢光強度比值

步驟：
1. 分離通道：Image > Color > Split Channels
2. 設定測量參數：
   - Integrated density
   - Area
   - Mean gray value
3. 測量細胞核：
   - 使用DAPI通道作為遮罩
   - 測量目標蛋白通道的強度
4. 測量細胞質：
   - 擴展選擇區域
   - 減去核區域的值
5. 計算比值並統計

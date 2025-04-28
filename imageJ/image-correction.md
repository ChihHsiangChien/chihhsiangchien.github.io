# 影像校正

## 簡介
影像校正是提高影像品質和分析準確度的重要步驟，本章節將介紹各種影像校正方法及其應用。

## 影像校正基礎

### 校正目的
- 消除背景雜訊（Background Noise）
- 修正不均勻照明（Uneven Illumination）
- 校正色彩偏差（Color Bias）
- 提高影像對比度（Contrast Enhancement）

### 常見問題
- 背景雜訊（Background Noise）
- 照明不均（Illumination Variation）
- 色彩失真（Color Distortion）
- 對比度不足（Poor Contrast）

## 校正方法

### 背景校正
1. 使用 `Process > Subtract Background`
2. 設定滾動球半徑（Rolling Ball Radius）
3. 選擇是否進行光照校正
4. 調整預覽效果

### 亮度/對比度調整
1. 使用 `Image > Adjust > Brightness/Contrast`
2. 手動調整或自動調整
3. 設定最佳顯示範圍
4. 應用到整個堆疊

### 色彩平衡
1. 使用 `Image > Adjust > Color Balance`
2. 調整RGB通道
3. 設定白平衡
4. 校正色偏

## 進階技術

### 平場校正（Flat-field Correction）
- 獲取暗場影像（Dark Field）
- 獲取亮場影像（Bright Field）
- 計算校正係數
- 應用校正公式

### 去卷積（Deconvolution）
- 點擴散函數（PSF）估計
- 選擇演算法
- 設定迭代參數
- 評估結果品質

### 訊噪比改善
- 中值濾波（Median Filter）
- 高斯濾波（Gaussian Filter）
- 小波變換（Wavelet Transform）
- 非局部均值（Non-local Means）

## 批次處理

### 巨集錄製
1. 開啟巨集錄製器
2. 執行校正步驟
3. 儲存巨集指令
4. 測試並優化

### 批次執行
1. 選擇目標資料夾
2. 設定輸出選項
3. 執行批次處理
4. 檢查處理結果

## 品質控制

### 校正效果評估
- 視覺檢查
- 數值分析
- 統計比較
- ROI分析

### 常見問題處理
- 過度校正
- 資訊損失
- 假影產生
- 邊緣效應


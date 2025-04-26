# 檔案格式支援與匯入匯出

## 簡介
ImageJ支援多種醫學影像格式，本章節將介紹常見的檔案格式以及如何正確地匯入匯出影像。

## 支援的檔案格式

### 一般影像格式
- TIFF（Tagged Image File Format）
- JPEG（Joint Photographic Experts Group）
- PNG（Portable Network Graphics）
- BMP（Bitmap）
- GIF（Graphics Interchange Format）

### 專業醫學影像格式
- DICOM（Digital Imaging and Communications in Medicine）
- NIfTI（Neuroimaging Informatics Technology Initiative）
- ANALYZE
- MetaMorph Stack（STK）
- Bio-Formats支援格式

### 特殊格式
- Raw Data
- Text Image
- URL
- AVI（Audio Video Interleave）
- FITS（Flexible Image Transport System）

## 匯入與匯出操作

### 檔案匯入（File Import）
1. 使用 `File > Open` 開啟一般影像檔案
2. 使用 `File > Import` 開啟特殊格式：
   - Bio-Formats
   - Raw Data
   - Image Sequence
3. 拖放檔案到 ImageJ 視窗

### 檔案匯出（File Export）
1. 使用 `File > Save As` 儲存為不同格式
2. 使用 `File > Save As > Tiff...` 儲存多頁TIFF
3. 使用 `File > Save As > Image Sequence...` 儲存影像序列

## 格式選擇建議

### 保存原始數據
- 使用無損格式（Lossless Format）：TIFF
- 保留原始位元深度（Bit Depth）
- 保存中繼資料（Metadata）

### 分享與發布
- 考慮檔案大小與相容性
- 選擇通用格式：PNG、JPEG
- 注意壓縮品質設定

### 特殊應用
- 多維度資料：Bio-Formats
- 連續影像：Image Sequence
- 大型檔案：Virtual Stack

## 實作練習

### 練習 1：檔案格式轉換
1. 匯入 DICOM 檔案
2. 轉換為 TIFF 格式
3. 比較檔案大小與品質

### 練習 2：批次處理
1. 匯入影像序列
2. 設定適當的輸出格式
3. 執行批次轉換 
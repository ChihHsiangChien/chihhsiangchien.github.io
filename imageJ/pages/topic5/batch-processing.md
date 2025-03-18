# 批次處理

## Batch
   ```
   Process > Batch > Convert...
   ```
### 操作步驟：
   - 選擇輸入資料夾
   - 設定輸出格式
   - 指定處理參數
   - 執行批次轉換

## Macro錄製

### 基本錄製
1. 開始錄製
   ```
   // 打開錄製器
   run("Record...");
   ```

2. 錄製技巧
   - 選擇合適的命令
   - 避免不必要的操作
   - 保持操作順序
   - 記錄關鍵參數

### 錄製修改
1. 參數化
   ```
   // 原始錄製代碼
   run("Gaussian Blur...", "sigma=2.0");
   
   // 修改為參數化版本
   sigma = Dialog.getNumber("Sigma value:", 2.0);
   run("Gaussian Blur...", "sigma=" + sigma);
   ```

2. 代碼優化
   ```
   // 添加錯誤檢查
   if (nImages == 0) exit("No image open");
   
   // 添加進度顯示
   showProgress(i, total);
   ```

## 批量處理

### 文件處理
1. 文件遍歷
   ```
   // 獲取目錄
   input = getDirectory("Input Directory");
   output = getDirectory("Output Directory");
   
   // 獲取文件列表
   files = getFileList(input);
   
   // 遍歷處理
   for (i = 0; i < files.length; i++) {
       if (endsWith(files[i], ".tif")) {
           processFile(input + files[i], output);
       }
   }
   ```

2. 文件組織
   ```
   // 創建輸出目錄
   File.makeDirectory(output);
   
   // 保存結果
   saveAs("Tiff", output + filename);
   ```

### 批處理模式
1. 設置批處理
   ```
   // 開啟批處理模式
   setBatchMode(true);
   
   // 處理代碼
   
   // 關閉批處理模式
   setBatchMode(false);
   ```

2. 性能優化
   ```
   // 記憶體管理
   run("Collect Garbage");
   
   // 關閉結果窗口
   if (isOpen("Results")) {
       selectWindow("Results");
       run("Close");
   }
   ```

## 自動化工作流程

### 工作流程設計
1. 預處理階段
   ```
   function preprocess(image) {
       // 背景校正
       run("Subtract Background...", "rolling=50");
       
       // 降噪
       run("Gaussian Blur...", "sigma=1");
       
       // 對比度增強
       run("Enhance Contrast...", "saturated=0.35");
   }
   ```

2. 分析階段
   ```
   function analyze(image) {
       // 設置測量參數
       run("Set Measurements...", 
           "area mean standard integrated display redirect=None decimal=3");
       
       // 分割
       setAutoThreshold("Otsu");
       run("Convert to Mask");
       
       // 粒子分析
       run("Analyze Particles...", 
           "size=50-Infinity circularity=0.5-1.00 show=Outlines display");
   }
   ```

### 結果管理
1. 數據導出
   ```
   // 保存測量結果
   saveAs("Results", output + "results.csv");
   
   // 保存ROI
   roiManager("Save", output + "ROIs.zip");
   ```

2. 日誌記錄
   ```
   // 記錄處理信息
   print("Processing: " + filename);
   print("Time: " + timestamp);
   
   // 保存日誌
   selectWindow("Log");
   saveAs("Text", output + "log.txt");
   ```

## 實例應用

### 案例 1：批量影像增強
1. 主程序
   ```
   macro "Batch Enhancement" {
       // 獲取參數
       Dialog.create("Enhancement Parameters");
       Dialog.addNumber("Gaussian Blur:", 1.0);
       Dialog.addNumber("Contrast Saturation:", 0.35);
       Dialog.show();
       
       // 處理所有影像
       input = getDirectory("Input Directory");
       output = getDirectory("Output Directory");
       processFiles(input, output);
   }
   ```

2. 處理函數
   ```
   function processFiles(input, output) {
       files = getFileList(input);
       setBatchMode(true);
       for (i = 0; i < files.length; i++) {
           showProgress(i+1, files.length);
           processFile(input + files[i], output);
       }
       setBatchMode(false);
   }
   ```

### 案例 2：多通道分析
1. 通道處理
   ```
   // 分離通道
   run("Split Channels");
   
   // 處理每個通道
   for (c = 1; c <= channels; c++) {
       selectWindow("C" + c + "-" + title);
       processChannel();
   }
   ```

2. 結果整合
   ```
   // 合併結果
   run("Merge Channels...", 
       "c1=[C1-Result] c2=[C2-Result] c3=[C3-Result] create");
   ```

## 進階技術

### 並行處理
1. 任務分配
   ```
   // 設置線程數
   threads = 4;
   batchSize = floor(files.length / threads);
   
   // 分配任務
   for (t = 0; t < threads; t++) {
       startIndex = t * batchSize;
       endIndex = (t == threads-1) ? files.length : (t+1) * batchSize;
       processFileBatch(startIndex, endIndex);
   }
   ```

2. 結果合併
   ```
   // 合併處理結果
   for (t = 0; t < threads; t++) {
       mergeResults(t);
   }
   ```

### 錯誤處理
1. 異常處理
   ```
   // 錯誤捕獲
   try {
       processFile(file);
   } catch (err) {
       print("Error processing " + file + ": " + err);
       logError(file, err);
   }
   ```

2. 恢復機制
   ```
   // 檢查點保存
   function saveCheckpoint(index) {
       File.saveString(index, output + "checkpoint.txt");
   }
   
   // 從檢查點恢復
   function resumeFromCheckpoint() {
       if (File.exists(output + "checkpoint.txt"))
           return File.openAsString(output + "checkpoint.txt");
       return 0;
   }
   ```

## 最佳實踐

### 代碼維護
1. 模塊化設計
   ```
   // 主模塊
   macro "Main" {
       initialize();
       processFiles();
       cleanup();
   }
   
   // 功能模塊
   function initialize() {
       // 初始化代碼
   }
   ```

2. 文檔化
   ```
   /* 函數：processImage
    * 功能：處理單個影像
    * 參數：
    *   - path: 影像路徑
    *   - options: 處理選項
    * 返回：處理結果
    */
   function processImage(path, options) {
       // 處理代碼
   }
   ```

### 效能優化
1. 記憶體管理
   ```
   // 定期清理
   if (i % 10 == 0) {
       run("Collect Garbage");
   }
   ```

2. 進度監控
   ```
   // 進度顯示
   showProgress(i+1, total);
   showStatus("Processing " + (i+1) + "/" + total);
   ``` 
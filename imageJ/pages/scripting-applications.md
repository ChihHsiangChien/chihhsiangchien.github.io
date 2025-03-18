# ImageJ腳本化應用指南

## 簡介
ImageJ的腳本化功能允許用戶自動化複雜的影像分析工作流程。本章將介紹如何使用腳本實現各種分析任務，包括分割、計數和定量分析。

## 基礎腳本編寫

### 腳本語言選擇
1. ImageJ Macro
   ```
   // 基本語法
   run("Command");
   selectWindow("Image");
   setThreshold(0, 255);
   ```

2. Python (Jython)
   ```python
   from ij import IJ, ImagePlus
   from ij.process import ImageProcessor
   
   # 基本操作
   imp = IJ.openImage("sample.tif")
   ip = imp.getProcessor()
   ```

3. JavaScript
   ```javascript
   importClass(Packages.ij.IJ);
   importClass(Packages.ij.ImagePlus);
   
   // 基本操作
   var imp = IJ.openImage("sample.tif");
   ```

### 基本結構
1. 初始化
   ```
   // 設置批處理模式
   setBatchMode(true);
   
   // 設置測量參數
   run("Set Measurements...", 
       "area mean standard min centroid perimeter shape feret's integrated display redirect=None decimal=3");
   ```

2. 錯誤處理
   ```
   // 錯誤檢查
   if (nImages == 0) {
       exit("No image is open");
   }
   
   // 異常捕獲
   try {
       // 處理代碼
   } catch(err) {
       print("Error: " + err);
   }
   ```

## 影像分割應用

### 自動分割流程
1. 預處理
   ```
   macro "Auto Segmentation" {
       // 背景校正
       run("Subtract Background...", "rolling=50");
       
       // 降噪
       run("Gaussian Blur...", "sigma=2");
       
       // 自動閾值
       setAutoThreshold("Otsu dark");
       run("Convert to Mask");
   }
   ```

2. 後處理
   ```
   // 形態學操作
   run("Fill Holes");
   run("Watershed");
   
   // 物件過濾
   run("Analyze Particles...", 
       "size=100-Infinity circularity=0.5-1.00 show=Outlines display exclude clear");
   ```

### 互動式分割
```
macro "Interactive Segmentation" {
    // 用戶選擇ROI
    setTool("freehand");
    waitForUser("Draw ROI around object");
    
    // 局部分割
    run("Clear Outside");
    setAutoThreshold("Default");
    run("Analyze Particles...");
}
```

## 自動計數應用

### 細胞計數
1. 基本計數
   ```
   macro "Cell Counter" {
       // 預處理
       run("8-bit");
       run("Enhance Contrast...", "saturated=0.3");
       
       // 分割和計數
       setAutoThreshold("Otsu");
       run("Convert to Mask");
       run("Watershed");
       run("Analyze Particles...", 
           "size=50-500 circularity=0.5-1.00 show=Outlines display clear");
   }
   ```

2. 多通道計數
   ```
   macro "Multi-Channel Counter" {
       // 分離通道
       run("Split Channels");
       
       // 處理每個通道
       for (i = 1; i <= 3; i++) {
           selectWindow("C" + i + "-Original");
           // 計數處理
           countObjects();
       }
   }
   ```

### 群體分析
```
function analyzeColonies() {
    // 設置比例尺
    run("Set Scale...", "distance=100 known=1 unit=mm");
    
    // 分析群體
    run("Analyze Particles...", 
        "size=0.1-Infinity circularity=0-1.00 show=Outlines display clear");
    
    // 保存結果
    saveAs("Results", "colony_analysis.csv");
}
```

## 定量分析

### 強度測量
1. ROI分析
   ```
   macro "Intensity Analysis" {
       // 選擇ROI
       roiManager("Reset");
       setTool("rectangle");
       waitForUser("Select regions of interest");
       
       // 測量強度
       for (i = 0; i < roiManager("count"); i++) {
           roiManager("Select", i);
           run("Measure");
       }
   }
   ```

2. 時間序列分析
   ```
   macro "Time Series Analysis" {
       // 設置測量
       run("Set Measurements...", "mean standard integrated stack display redirect=None decimal=3");
       
       // 分析每一幀
       for (i = 1; i <= nSlices; i++) {
           setSlice(i);
           run("Measure");
       }
   }
   ```

### 形態測量
```
macro "Morphological Analysis" {
    // 設置測量參數
    run("Set Measurements...", 
        "area perimeter shape feret's integrated display redirect=None decimal=3");
    
    // 執行分析
    run("Analyze Particles...", 
        "size=0-Infinity show=Outlines display clear");
    
    // 導出結果
    saveAs("Results", "morphology_results.csv");
}
```

## 批量處理

### 文件處理
```
macro "Batch Process" {
    input = getDirectory("Input Directory");
    output = getDirectory("Output Directory");
    files = getFileList(input);
    
    // 處理每個文件
    for (i = 0; i < files.length; i++) {
        if (endsWith(files[i], ".tif")) {
            processFile(input + files[i], output);
        }
    }
}

function processFile(input, output) {
    // 打開文件
    open(input);
    
    // 處理步驟
    run("Subtract Background...", "rolling=50");
    run("Gaussian Blur...", "sigma=2");
    setAutoThreshold("Otsu");
    run("Convert to Mask");
    
    // 保存結果
    saveAs("Tiff", output + "processed_" + getTitle());
    close();
}
```

### 並行處理
```
macro "Parallel Processing" {
    // 設置線程數
    threads = 4;
    files = getFileList(getDirectory("Input"));
    batchSize = floor(files.length / threads);
    
    // 分配任務
    for (t = 0; t < threads; t++) {
        startIndex = t * batchSize;
        endIndex = (t == threads-1) ? files.length : (t+1) * batchSize;
        processFileBatch(startIndex, endIndex);
    }
}
```

## 結果管理

### 數據導出
1. 表格導出
   ```
   // 保存測量結果
   saveAs("Results", "analysis_results.csv");
   
   // 導出ROI
   roiManager("Save", "ROI_set.zip");
   ```

2. 圖像導出
   ```
   // 保存處理後的影像
   saveAs("Tiff", "processed_image.tif");
   
   // 保存疊加結果
   saveAs("Overlay", "overlay_result.tif");
   ```

### 結果可視化
```
macro "Visualize Results" {
    // 生成直方圖
    run("Histogram");
    
    // 創建圖表
    Plot.create("Analysis Results", "Measurement", "Value");
    Plot.add("Circle", xPoints, yPoints);
    Plot.show();
}
```

## 最佳實踐

### 代碼組織
1. 模塊化設計
   ```
   // 主函數
   macro "Main" {
       initialize();
       processImages();
       exportResults();
       cleanup();
   }
   
   // 功能模塊
   function initialize() {
       setBatchMode(true);
       run("Set Measurements...");
   }
   ```

2. 參數管理
   ```
   // 全局參數
   var THRESHOLD = 128;
   var MIN_SIZE = 50;
   var MAX_SIZE = 500;
   
   // 參數配置
   function loadConfig() {
       // 從文件讀取配置
   }
   ```

### 效能優化
1. 記憶體管理
   ```
   // 定期清理
   run("Collect Garbage");
   
   // 關閉未使用的窗口
   if (isOpen("Results")) {
       selectWindow("Results");
       run("Close");
   }
   ```

2. 運行時優化
   ```
   // 批處理模式
   setBatchMode(true);
   
   // 禁用更新
   setOption("DisablePopupMenu", true);
   ``` 
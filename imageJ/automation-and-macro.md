# ImageJ 自動化與巨集程式設計

## 簡介
本章節將介紹ImageJ軟體的自動化功能和巨集（Macro）程式設計。學習如何使用巨集可以極大地提高影像處理、分析和批次作業的效率，減少重複手動操作。

## ImageJ 巨集基礎

### 巨集語言介紹
ImageJ使用一種簡單的內建腳本語言，稱為 **ImageJ Macro Language**。

- 它具有基本的程式結構，包括變數、運算子、條件判斷和迴圈。
- 主要用於呼叫ImageJ的選單指令、操作影像窗口、讀取和寫入數據。

#### 基本語法

```ijm
   run("Command");
   selectWindow("Image");
   setThreshold(0, 255);

   // 設置批處理模式
   setBatchMode(true);

   // 設置測量參數
   run("Set Measurements...", 
       "area mean standard min centroid perimeter shape feret's integrated display redirect=None decimal=3");   
```


### 巨集錄製
ImageJ提供了一個方便的巨集錄製器，可以將手動操作轉換為巨集程式碼。

- 錄製器會記錄您在選單中執行的大多數操作以及一些對話框互動。
- 這是學習巨集語法和了解特定操作對應的指令的絕佳方式。


在ImageJ中錄製巨集：

-   開啟 `Plugins > Macros > Record...`。
-   錄製窗口會彈出，顯示正在記錄的指令。
-   執行您想要自動化的手動步驟（例如：開啟影像、調整亮度/對比度、套用濾波器、執行分析）。
-   執行完畢後，點擊錄製窗口中的 `Create` 按鈕，將記錄的程式碼輸出到一個新的巨集編輯器窗口。
-   點擊 `Close` 停止錄製。
-   錄製的程式碼可以在巨集編輯器中進行修改和調整。可以編輯參數、加入流程控制或使用者互動。


## ImageJ 巨集程式設計

### 基本語法
ImageJ Macro Language 的語法類似於C語言或其他腳本語言，但更簡化。
- 變數無需顯式宣告類型，直接賦值即可。
- 常見的運算子（+、-、*、/、=、>、<、==、!= 等）皆可使用。
- 條件判斷使用 `if` 和 `if...else` 結構。
- 迴圈結構包括 `for` 和 `while`。



#### 基本變數

```ijm
   // 數值類型
   var number = 123;
   var decimal = 3.14;
   
   // 字符串
   var text = "Hello ImageJ";
   
   // 數組
   var array = newArray(1, 2, 3, 4, 5);
```
#### 運算符與表達式
- 算術運算

```ijm
   // 基本運算
   sum = a + b;
   difference = a - b;
   product = a * b;
   quotient = a / b;
   
   // 複合運算
   x += 1;
   y *= 2;
```

- 邏輯運算

```ijm
   // 比較運算
   if (value > threshold) {
       print("Above threshold");
   }
   
   // 邏輯組合
   if (x > 0 && y < 100) {
       print("Within range");
   }
```


#### 控制結構

##### 條件語句
- if-else結構
```
   if (condition) {
       // 執行代碼
   } else {
       // 替代代碼
   }
```

- switch-case結構
```
   switch (value) {
       case 1:
           // 代碼1
           break;
       case 2:
           // 代碼2
           break;
       default:
           // 默認代碼
   }
```

##### 循環結構
- for循環
```
   // 基本for循環
   for (i = 0; i < 10; i++) {
       print(i);
   }
   
   // 數組遍歷
   for (i = 0; i < array.length; i++) {
       print(array[i]);
   }
```

- while循環
```
   // while循環
   while (condition) {
       // 循環代碼
   }
   
   // do-while循環
   do {
       // 循環代碼
   } while (condition);
```

### 函數與程序
- ImageJ巨集語言提供了大量的內建函數和程序（指令）。
- 內建函數： 用於執行特定的操作，例如數學計算、字串處理、檔案操作、獲取影像資訊等。它們通常有返回值。
- 程序（指令）： 大多數對應ImageJ的選單命令或對話框操作。它們執行一個動作，通常沒有返回值。可以使用**run()** 命令或直接使用指令名稱調用。
- 自定義函數： 您可以編寫自己的函數來組織程式碼和重用邏輯。


## 函數與過程

### 函數定義
- 基本函數
```
   function myFunction(parameter) {
       // 函數代碼
       return result;
   }
```

- 過程定義
```
   function processImage() {
       // 影像處理代碼
   }
```

### 內建函數
- 影像操作
```
   // 獲取影像信息
   width = getWidth();
   height = getHeight();
   
   // 像素操作
   value = getPixel(x, y);
   setPixel(x, y, value);
```

- 用戶交互
```
   // 對話框
   Dialog.create("Input");
   Dialog.addNumber("Value:", 0);
   Dialog.show();
   
   // 文件選擇
   file = File.openDialog("Select a file");
```

#### 尋找內建函數和指令：
- 在巨集編輯器中，使用 `Help > Macro Functions`可以查看ImageJ Macro Language的所有內建函數和語法說明。
- 巨集錄製器是查找特定選單操作對應指令的最佳工具。
- 許多複雜的操作可能對應一個帶有多個參數的**run()** 指令。


## 影像處理命令

### 基本命令

- 影像操作
```
   // 打開影像
   open(path);
   
   // 保存影像
   saveAs("Tiff", path);
   
   // 關閉影像
   close();
```
- 處理命令
```
   // 影像增強
   run("Enhance Contrast...", "saturated=0.35");
   
   // 濾波處理
   run("Gaussian Blur...", "sigma=2");
```

### 選區操作
- ROI操作

```ijm
   // 創建選區
   makeRectangle(x, y, width, height);
   
   // 添加到ROI管理器
   roiManager("Add");
   
   // 選擇ROI
   roiManager("Select", index);
```

- 測量操作

```ijm
   // 設置測量參數
   run("Set Measurements...", "area mean standard");
   
   // 執行測量
   run("Measure");
```
## 巨集程式範例

- 簡單範例

    ```ijm
    // 這是一個簡單的巨集範例
    // 取得當前開啟的影像的名稱
    title = getTitle();
    print("當前影像名稱: " + title);

    // 如果影像名稱包含 "細胞"
    if (indexOf(title, "細胞") > -1) {
        // 執行閾值分割 (使用Otsu算法)
        setAutoThreshold("Otsu");
        run("Analyze Particles...", "size=50-Infinity");
        print("對細胞影像進行了粒子分析。");
    } else {
        print("非細胞影像，跳過分析。");
    }

    // 迴圈處理多個範圍的閾值
    for (i = 0; i <= 255; i += 50) {
        setThreshold(i, 255);
        print("設置閾值範圍: " + i + "-255");
    }
```

#### 影像自動分割
- 預處理
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

- 後處理
```
   // 形態學操作
   run("Fill Holes");
   run("Watershed");
   
   // 物件過濾
   run("Analyze Particles...", 
       "size=100-Infinity circularity=0.5-1.00 show=Outlines display exclude clear");
```
#### 影像互動分割

```ijm
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


#### 自動細胞計數
- 基本計數
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

- 多通道計數
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

#### 群體分析
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

#### 強度測量
- ROI分析
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


#### 時間序列分析
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


#### 形態測量
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


### 使用者互動
巨集可以與使用者進行互動，例如顯示訊息、請求使用者輸入參數。
這使得巨集更加靈活，可以適應不同的影像和需求。

#### 在ImageJ巨集中建立使用者互動：
- 訊息提示： 使用 **print()** 函數將訊息輸出到Log窗口；使用 **showMessage()** 或 **showMessageWithCancel()** 彈出訊息對話框。   
- 參數輸入： 使用 **Dialog.create()** 創建自定義對話框，並使用 **Dialog.addNumber()**, **Dialog.addString()**, **Dialog.addCheckbox()**, **Dialog.addCheckbox()** 等方法添加輸入控件。最後使用 **Dialog.show()** 顯示對話框並獲取使用者輸入的值。

```ijm
// 範例：彈出對話框讓使用者輸入粒子分析的最小尺寸
Dialog.create("粒子分析參數");
Dialog.addNumber("最小粒子尺寸 (pixels):", 100);
Dialog.show();
minSize = Dialog.getNumber();

if (minSize > 0) {
    run("Analyze Particles...", "size=" + minSize + "-Infinity");
} else {
    print("最小尺寸無效，跳過分析。");
}
```


### 批次處理 (Batch Processing)
批次處理允許自動地對整個文件夾或一系列影像執行相同的巨集或操作。
這對於處理大量影像數據非常高效。

#### 在ImageJ中執行批次處理：
- ImageJ有一個內建的批次處理器，特別用於執行巨集或腳本。
- 開啟 `Process > Batch > Macro... `。
- 選擇輸入文件夾（包含要處理的影像）和輸出文件夾（用於保存結果）。
- 您可以選擇是否處理子文件夾。
- 在文本區域貼上或編寫您要執行的巨集程式碼。此巨集應該設計為處理當前開啟的影像，並包含保存結果的指令。
- 巨集程式碼中通常會使用
    - `open(inputFilePath);` 打開每個檔案，
    - 處理後使用 `saveAs(format, outputFilePath);` 保存結果
    - 使用 `close();` 關閉影像。
    - 點擊 `Process` 開始批次處理。

```ijm
    // 範例：批次處理巨集 (用於Process > Batch > Macro...)
    // 假設輸入文件夾中的影像是 .tif 格式
    // 假設輸出文件夾用於保存處理後的 .tif 影像

    input = getArgument(); 
    // 在批次模式下，getArgument() 返回當前要處理的檔案完整路徑
    open(input);

    // 執行一些處理步驟 (例如：閾值和分析粒子)
    setAutoThreshold("Default");
    run("Analyze Particles...", "display clear stack"); // 'display' 可以選擇是否顯示分析結果窗口
    // 注意：批量處理時，通常不顯示結果窗口，而是將結果保存到文件

    // 獲取輸出文件夾路徑
    outputFolder = getDirectory("output");
    // 獲取原始檔案名 (不含擴展名)
    fileName = File.getName(input);
    dotIndex = fileName(fileName, ".");
    if (dotIndex > 0) fileName = substring(fileName, 0, dotIndex);

    // 保存處理後的影像
    saveAs("Tiff", outputFolder + fileName + "_processed.tif");

    // 保存分析結果到CSV文件 (如果Analyze Particles設置為不顯示結果窗口)
    // 需要在Analyze > Set Measurements... 中設置並可能需要 Results.save() 指令，根據實際需求調整
    // results = getResultsTable();
    // results.save(outputFolder + fileName + "_results.csv");
    // 關閉當前影像
    close();
```


#### 文件處理
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

#### 並行處理
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



### 結果管理

#### 導出數據
- 表格導出
```
   // 保存測量結果
   saveAs("Results", "analysis_results.csv");
   
   // 導出ROI
   roiManager("Save", "ROI_set.zip");
```

- 圖像導出
```
   // 保存處理後的影像
   saveAs("Tiff", "processed_image.tif");
   
   // 保存疊加結果
   saveAs("Overlay", "overlay_result.tif");
```

#### 結果視覺化
```
    macro "Visualize Results" {
        // 生成直方圖
        run("Histogram");
        
        // 產生圖表
        Plot.create("Analysis Results", "Measurement", "Value");
        Plot.add("Circle", xPoints, yPoints);
        Plot.show();
    }
```


### 模組化設計

- 巨集模組
```ijm
   // 主函數
   macro "Main" {
       initialize();
       processImages();
       exportResults();
       cleanup();
   }
   
   // 功能模組
   function initialize() {
       setBatchMode(true);
       run("Set Measurements...");
   }
```
- 註解規範
```
   // 單行註釋
   
   /* 多行註釋
      說明代碼功能
      參數含義等 */
```

- 參數管理
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

### 自動化工作流程
- 通過組合多個巨集或步驟，可以創建更複雜的自動化工作流程。
- 將大型任務分解為更小的、可管理的巨集模組。
- 使用條件判斷和迴圈來控制處理流程。
- 設計巨集以處理特定的輸入並產生明確的輸出，方便後續步驟使用。
- 規劃整個影像處理和分析的流程圖。
    - 為每個主要步驟編寫或錄製一個巨集片段。
    - 在主巨集中依序調用這些片段，或者將所有步驟寫在同一個複雜巨集中。
    - 使用 call() 函數或其他方式在不同巨集之間傳遞信息或執行操作。
    - 考慮錯誤處理：使用 try...catch 結構來捕獲並處理可能發生的錯誤，避免中斷整個工作流程。
    - 加入進度顯示（例如在Log窗口或狀態欄）來追蹤處理狀態。


### 除錯
編寫巨集時，難免會遇到錯誤。有效的除錯技巧可以快速定位問題。
- 除錯技巧：
    - 使用 print() 函數在Log窗口輸出變數的值或程式執行的進度，幫助追蹤問題。
    - 檢查巨集編輯器報告的語法錯誤。
    - 逐步執行程式碼，觀察每一步的結果和變數狀態。
- 效能最佳化：
    - 減少不必要的操作。
    - 盡可能使用ImageJ的內建函數和指令，它們通常比手寫邏輯更高效。
    - 避免在迴圈中執行耗時的操作，除非必要。
    - 對於大型影像，考慮使用堆疊處理或批次處理以利用更多記憶體。
#### 錯誤處理
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
#### 錯誤檢查

```
   // 檢查影像是否打開
   if (nImages == 0) {
       exit("No image open");
   }
   
   // 檢查選區
   if (selectionType == -1) {
       exit("No selection");
   }
```
#### debug
1. 印出變數
```
   print("Debug: " + variable);  
   Array.print(array);
```

2. 日誌記錄
```
   // 寫入日誌
   File.append(message, "log.txt");
   
   // 顯示進度
   showProgress(current, total);
```

#### ImageJ巨集編輯器的除錯功能：
- 開啟巨集文件 (`Plugins > Macros > Open...` 或在錄製後創建)。
- 巨集編輯器提供以下功能：
    - Syntax Check (Ctrl+K 或 Cmd+K): 檢查語法錯誤。
    - Run (Ctrl+R 或 Cmd+R): 執行整個巨集。
    - Run to Cursor (F4): 執行到光標所在行。
    - Step (F6): 單步執行程式碼。
    - Trace (F7): 單步執行並在Log窗口顯示執行的每一行程式碼。
    - Set Breakpoint (F8): 在特定行設置斷點，程式執行到此處會暫停。
    - Run until Return (Shift+F8): 在函數內部時，執行到函數返回。
    - 在Log窗口 (Window > Log) 查看 print() 輸出和錯誤訊息。



### 性能最佳化
1. 批次
```
   // 設置批處理模式
   setBatchMode(true);
   // 處理代碼
   
   // 關閉批處理
   setBatchMode(false);
```

2. 記憶體管理
```
   // 清理記憶體
   run("Collect Garbage");
   
   // 關閉未使用的窗口
   if (isOpen("Results")) {
       selectWindow("Results");
       run("Close");
   }
``` 

## 實作練習 (Practice)
### 練習 1：基本巨集操作
1. 使用錄製器錄製一段簡單的影像處理流程，例如：開啟影像 -> 調整亮度/對比度 -> 應用高斯濾波器 -> 保存影像。
2. 使用 Plugins > Macros > Record... 進行錄製。
3. 打開錄製生成的巨集程式碼，嘗試修改其中的參數（如高斯濾波器的半徑）。
4. 運行修改後的巨集，並檢查結果是否符合預期。
5. 在巨集編輯器中使用 Run 或單步執行進行測試。

### 練習 2：批次處理應用

1. 創建一個包含幾張範例影像的小文件夾。
2. 編寫一個巨集，使其能打開一張影像，對其進行閾值分割和粒子分析，並將分析結果保存到一個CSV文件，然後關閉影像。
3. 參考前述批次處理巨集的範例程式碼。使用 open(), setAutoThreshold(), run("Analyze Particles...", "..."), saveAs("Results", ...) 或 Results.saveAs(...), close() 等指令。
4. 使用ImageJ的批次處理器對創建的範例文件夾執行這個巨集。
5. 開啟 Process > Batch > Macro...，設定輸入和輸出文件夾，貼上巨集程式碼，然後點擊 Process。
6. 檢查輸出文件夾中是否生成了分析結果文件，並驗證內容。

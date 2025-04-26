# ImageJ Macro語言基礎

## 簡介
ImageJ Macro語言是一種專門為影像處理設計的腳本語言，能夠自動化執行各種影像分析任務。本章將介紹Macro語言的基本語法和使用方法。

## 基礎語法

### 變量與數據類型
1. 基本類型
   ```
   // 數值類型
   var number = 123;
   var decimal = 3.14;
   
   // 字符串
   var text = "Hello ImageJ";
   
   // 數組
   var array = newArray(1, 2, 3, 4, 5);
   ```

2. 特殊變量
   - 影像ID
   - 選區座標
   - 測量結果
   - 系統參數

### 運算符與表達式
1. 算術運算
   ```
   // 基本運算
   sum = a + b;
   difference = a - b;
   product = a * b;
   quotient = a / b;
   
   // 複合運算
   x += 1;
   y *= 2;
   ```

2. 邏輯運算
   ```
   // 比較運算
   if (value > threshold) {
       print("Above threshold");
   }
   
   // 邏輯組合
   if (x > 0 && y < 100) {
       print("Within range");
   }
   ```

## 控制結構

### 條件語句
1. if-else結構
   ```
   if (condition) {
       // 執行代碼
   } else {
       // 替代代碼
   }
   ```

2. switch-case結構
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

### 循環結構
1. for循環
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

2. while循環
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

## 函數與過程

### 函數定義
1. 基本函數
   ```
   function myFunction(parameter) {
       // 函數代碼
       return result;
   }
   ```

2. 過程定義
   ```
   function processImage() {
       // 影像處理代碼
   }
   ```

### 內建函數
1. 影像操作
   ```
   // 獲取影像信息
   width = getWidth();
   height = getHeight();
   
   // 像素操作
   value = getPixel(x, y);
   setPixel(x, y, value);
   ```

2. 用戶交互
   ```
   // 對話框
   Dialog.create("Input");
   Dialog.addNumber("Value:", 0);
   Dialog.show();
   
   // 文件選擇
   file = File.openDialog("Select a file");
   ```

## 影像處理命令

### 基本命令
1. 影像操作
   ```
   // 打開影像
   open(path);
   
   // 保存影像
   saveAs("Tiff", path);
   
   // 關閉影像
   close();
   ```

2. 處理命令
   ```
   // 影像增強
   run("Enhance Contrast...", "saturated=0.35");
   
   // 濾波處理
   run("Gaussian Blur...", "sigma=2");
   ```

### 選區操作
1. ROI操作
   ```
   // 創建選區
   makeRectangle(x, y, width, height);
   
   // 添加到ROI管理器
   roiManager("Add");
   
   // 選擇ROI
   roiManager("Select", index);
   ```

2. 測量操作
   ```
   // 設置測量參數
   run("Set Measurements...", "area mean standard");
   
   // 執行測量
   run("Measure");
   ```

## 實用技巧

### 錯誤處理
1. 異常捕獲
   ```
   try {
       // 可能出錯的代碼
   } catch (err) {
       print("Error: " + err);
   }
   ```

2. 錯誤檢查
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

### 調試技巧
1. 打印調試
   ```
   // 打印變量
   print("Debug: " + variable);
   
   // 打印數組
   Array.print(array);
   ```

2. 日誌記錄
   ```
   // 寫入日誌
   File.append(message, "log.txt");
   
   // 顯示進度
   showProgress(current, total);
   ```

## 最佳實踐

### 代碼組織
1. 模塊化
   ```
   // 主函數
   macro "Main" {
       initialize();
       processImages();
       cleanup();
   }
   
   // 輔助函數
   function initialize() {
       // 初始化代碼
   }
   ```

2. 註釋規範
   ```
   // 單行註釋
   
   /* 多行註釋
      說明代碼功能
      參數含義等 */
   ```

### 性能優化
1. 批處理模式
   ```
   // 開啟批處理
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
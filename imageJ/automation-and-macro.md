# ImageJ 自動化與巨集程式設計

## 巨集語言介紹
ImageJ使用一種簡單的內建腳本語言，稱為 **ImageJ Macro Language**。

- 它具有基本的程式結構，包括變數、運算子、條件判斷和迴圈。
- 主要用於呼叫ImageJ的選單指令、操作影像窗口、讀取和寫入數據。


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


### 基本語法
ImageJ Macro Language 的語法類似於C語言或其他腳本語言，但更簡化。
- 變數無需顯式宣告類型，直接賦值即可。
- 常見的運算子（+、-、*、/、=、>、<、==、!= 等）皆可使用。
- 條件判斷使用 `if` 和 `if...else` 結構。
- 迴圈結構包括 `for` 和 `while`。


### 範例：基本操作

```ijm
// ==== 1. 數值類型與變數 ====
var number = 123;
var decimal = 3.14;
var text = "Hello ImageJ";
var array = newArray(1, 2, 3, 4, 5);

print("Number: " + number);
print("Decimal: " + decimal);
print("Text: " + text);

// 列印陣列
print("Array elements:");
for (i = 0; i < array.length; i++) {
    print(array[i]);
}


// ==== 2. 算術運算 ====
var a = 10;
var b = 3;

sum = a + b;
difference = a - b;
product = a * b;
quotient = a / b;

x = 5;
y = 7;
x += 1; // x = 6
y *= 2; // y = 14

print("Sum: " + sum);
print("Difference: " + difference);
print("Product: " + product);
print("Quotient: " + quotient);
print("x after +=1: " + x);
print("y after *=2: " + y);

// ==== 3. 邏輯運算 ====
var value = 75;
var threshold = 50;

if (value > threshold) {
    print("Above threshold");
}

var x_val = 10;
var y_val = 20;

if (x_val > 0 && y_val < 100) {
    print("Within range");
}

if (x_val < 0 || y_val > 100) {
    print("Out of range");
} else {
    print("Safe range");
}

```


### 函數與程序
- ImageJ巨集語言提供了大量的內建函數和程序（指令）。
- 內建函數： 用於執行特定的操作，例如數學計算、字串處理、檔案操作、獲取影像資訊等。它們通常有返回值。
- 程序（指令）： 大多數對應ImageJ的選單命令或對話框操作。它們執行一個動作，通常沒有返回值。可以使用**run()** 命令或直接使用指令名稱調用。
- 自定義函數： 您可以編寫自己的函數來組織程式碼和重用邏輯。


### 範例

```ijm

// 建立測試影像
newImage("Test", "8-bit black", 256, 256, 1);
print("Image created: " + getTitle());

// 獲取影像尺寸
width = getWidth();
height = getHeight();
print("Width: " + width + ", Height: " + height);

// 設定與讀取像素值
x = 100;
y = 100;
setPixel(x, y, 255); // 設定像素為白色
value = getPixel(x, y); // 讀取像素值
print("Pixel value at (" + x + "," + y + "): " + value);

// ==== 2. 用戶交互 ====

// 對話框輸入數字
Dialog.create("Input Example");
Dialog.addNumber("Value:", 0);
Dialog.show();
userValue = Dialog.getNumber();
print("User entered value: " + userValue);

// 文件選擇
filePath = File.openDialog("選擇檔案");
print("你選擇的檔案: " + filePath);
```


### 範例：使用者動作批次處理每一個slice

```ijm

// ================================
// ImageJ Macro 範例：生成 Stack 並分析每個 slice
// ================================

macro "Generate Stack and Analyze" {

    // ==== 1. 生成 Stack ====
    width = 256;
    height = 256;
    n = 5; // Stack 幀數

    newImage("StackExample", "8-bit black", width, height, n);

    // 填充每一幀測試數據 (隨機亮點)
    for (i = 1; i <= n; i++) {
        setSlice(i);
        for (j = 0; j < 100; j++) { // 100 個隨機亮點
            x = floor(random() * width);
            y = floor(random() * height);
            setPixel(x, y, 255);
        }
    }

    print("Stack created with " + nSlices + " slices.");

    // ==== 2. 設置測量參數 ====
	run("Set Measurements...", "integrated display redirect=None decimal=3");

    // ==== 3. 對每一 slice 分析 ====
    waitForUser("圈選區域");        
    setTool(0);

    for (i = 1; i <= n; i++) {
        setSlice(i);		        

        run("Measure");
    }

    print("Stack analysis completed.");
}

```


### 使用者互動
巨集可以與使用者進行互動，例如顯示訊息、請求使用者輸入參數。
這使得巨集更加靈活，可以適應不同的影像和需求。

- 訊息提示： 使用 **print()** 函數將訊息輸出到Log窗口；使用 **showMessage()** 或 **showMessageWithCancel()** 彈出訊息對話框。   
- 參數輸入： 使用 **Dialog.create()** 創建自定義對話框，並使用 **Dialog.addNumber()**, **Dialog.addString()**, **Dialog.addCheckbox()**, **Dialog.addCheckbox()** 等方法添加輸入控件。最後使用 **Dialog.show()** 顯示對話框並獲取使用者輸入的值。

### 範例：使用者互動

```ijm
// 範例：彈出對話框讓使用者輸入粒子分析的最小尺寸
Dialog.create("粒子分析參數");
Dialog.addNumber("最小粒子尺寸 (pixels):", 100);
Dialog.show();
minSize = Dialog.getNumber();

if (minSize > 0) {
    run("Analyze Particles...", "size=" + minSize + "-Infinity display");
} else {
    print("最小尺寸無效，跳過分析。");
}
```


### 範例：文件批次處理

```ijm
// ===== 主流程 Macro =====
macro "產生粒子範例並測量" {

    // ==== 1. 生成範例影像 ====
    
    imageN = 5; // 生成 5 張範例影像
    width = 512;
    height = 512;
    
	imgDir = getDirectory("選擇存檔資料夾");        
    generateSampleImages(imgDir, imageN, width, height);
    
    // ==== 2. 批次處理生成的範例影像 ====
    
    files = getFileList(imgDir);
    
    for (i = 0; i < files.length; i++) {
        if (endsWith(files[i], ".tif")) {
            processFile(imgDir + files[i]);
        }
    }
    // 將 summary 表格輸出到 CSV
    outputDir = getDirectory("選擇選擇要輸出的資料夾");        
    resultsFile = outputDir + "測量結果.csv";    
    saveAs("Results", resultsFile);
}

// ===== 生成範例影像 =====
function generateSampleImages(imgDir, imageN, width, height) {
    for (i = 1; i <= imageN; i++) {
        newImage("Sample_" + i, "8-bit black", width, height, 1);
        
        // 生成隨機亮點
        for (j = 0; j < 50; j++) { // 50 個亮點
            x = floor(random() * width);
            y = floor(random() * height);
            setPixel(x, y, 255);
        }
        
        saveAs("Tiff", imgDir + "Sample_" + i + ".tif");
        close();
    }
}

// ===== 測量 =====
function processFile(inputPath) {
    open(inputPath);
    
    
    // 測量粒子
    run("Set Measurements...", "area mean min max centroid redirect=None decimal=2");
    run("Analyze Particles...", "size=1-Infinity show=Nothing summarize");
    close();

}
```
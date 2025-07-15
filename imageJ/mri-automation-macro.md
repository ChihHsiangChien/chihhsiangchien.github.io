# 自動化流程：撰寫 Macro 腳本完成端到端分析

在科學研究中，**可重複性**和**效率**是至關重要的。手動點擊介面完成分析不僅耗時，而且容易因操作差異引入誤差。ImageJ 的**巨集 (Macro)** 功能允許我們將一系列操作錄製或編寫成腳本，實現一鍵式自動化分析。

本章節將綜合前述教學的知識，提供一個完整的 ImageJ Macro 腳本。這個腳本將自動完成從開啟 `t1-header.tif` 影像，到分割腦組織與頭骨，再到計算體積的整個端到端 (End-to-End) 流程。

## 1. 分析目標

我們的目標是撰寫一個 ImageJ Macro 腳本 (`.ijm` 檔案)，使其能自動執行以下任務：

1.  開啟指定的 `t1-header.tif` 影像。
2.  執行去頭骨 (Skull Stripping) 操作，產生 `Brain Mask`。
3.  執行頭骨分割操作，產生 `Skull Mask`。
4.  設定正確的空間校正 (1 x 1 x 1.33 mm)。
5.  分別計算腦組織和頭骨的體積。
6.  將計算結果清晰地顯示在 Log 視窗中。

## 2. 完整 Macro 腳本

您可以將以下程式碼直接複製到 Fiji 的腳本編輯器 (`File > New > Script...`) 中，並將語言設定為 `ImageJ Macro`。執行前，請確保 `t1-header.tif` 檔案位於 ImageJ/Fiji 可以存取的位置（例如，放在 Fiji 的 `samples` 資料夾內，或在程式碼中指定完整路徑）。

```ijm
/*
 * Macro: End-to-End MRI Brain Segmentation and Volume Analysis
 * Author: Gemini Code Assist
 * Date: 2023-10-27
 * Description: This macro automates the segmentation of brain and skull 
 *              from the t1-header.tif sample image and calculates their volumes.
 */

// --- 1. Setup and Open Image ---
requires("1.53t"); // Require a recent version of ImageJ
print("\\Clear"); // Clear the log window
print("--- Starting MRI Analysis Workflow ---");

// Open the sample image. Replace with open("/path/to/your/t1-header.tif"); for other locations.
run("T1 Head (2.4M, 16-bits)"); 
original_title = getTitle();

// --- 2. Brain Segmentation (Skull Stripping) ---
print("Step 1: Segmenting Brain...");
run("Duplicate...", "title=temp_brain");
setAutoThreshold("Default");
run("Convert to Mask", "method=Default background=Dark");
run("Fill Holes");
run("Analyze Particles...", "size=5000-Infinity display clear record add");
// The largest particle is now in the ROI Manager
roiManager("Select", 0);
run("Create Mask");
brain_mask_title = getTitle();
rename("Brain_Mask");
print("Brain Mask created.");
roiManager("Deselect");
roiManager("Delete");

// --- 3. Skull Segmentation ---
print("Step 2: Segmenting Skull...");
selectWindow(original_title);
run("Duplicate...", "title=Head_Mask");
setAutoThreshold("Default");
setThreshold(1, 65535); // Threshold for all non-black pixels
run("Convert to Mask", "method=Default background=Dark");
imageCalculator("Subtract create stack", "Head_Mask", "Brain_Mask");
selectWindow("Result of Head_Mask");
rename("Skull_Mask");
print("Skull Mask created.");
close("Head_Mask");

// --- 4. Volume Calculation ---
print("Step 3: Calculating Volumes...");
// Set Scale
run("Set Scale...", "distance=1 known=1 pixel=1 unit=mm");
run("Properties...", "channels=1 slices=129 frames=1 unit=mm pixel_width=1.0 pixel_height=1.0 voxel_depth=1.33");

// Calculate Brain Volume
selectWindow("Brain_Mask");
run("3D Object Counter", "threshold=128 min=1000 summary");
brain_volume = getResult("Volume", 0);

// Calculate Skull Volume
selectWindow("Skull_Mask");
run("3D Object Counter", "threshold=128 min=1000 summary");
skull_volume = getResult("Volume", 0);

// --- 5. Display Results ---
print("\\n--- Analysis Complete ---");
print("Brain Volume: " + brain_volume + " mm^3 (" + brain_volume/1000 + " cm^3)");
print("Skull Volume: " + skull_volume + " mm^3 (" + skull_volume/1000 + " cm^3)");
print("-------------------------");
run("Close All"); // Clean up all windows

```

## 3. 程式碼解讀

-   **`print("\\Clear");`**: 清空日誌視窗，方便查看本次執行的輸出。
-   **`run("T1 Head (2.4M, 16-bits)");`**: 開啟內建範例影像。如果您的檔案在其他地方，請用 `open("C:/path/to/your/file.tif");`。
-   **`setAutoThreshold("Default");`**: 自動設定閾值。
-   **`run("Convert to Mask", ...);`**: 將閾值選擇應用於影像，產生二值化遮罩。
-   **`run("Fill Holes");`**: 執行形態學的填補孔洞操作。
-   **`run("Analyze Particles...", "...add");`**: 這是去頭骨的關鍵。我們不直接產生遮罩，而是利用粒子分析找到最大的物件（大腦），並將其輪廓加入到 ROI 管理器中。
-   **`roiManager("Select", 0); run("Create Mask");`**: 選取 ROI 管理器中的第一個（也是唯一一個）ROI，並根據它產生一個精確的腦部遮罩。
-   **`imageCalculator("Subtract create stack", ...);`**: 執行影像計算，從「整個頭部」減去「腦部」，得到頭骨。
-   **`run("Properties...", ...);`**: 設定影像的空間校正參數。
-   **`run("3D Object Counter", ...);`**: 執行 3D 分析並計算體積。`summary` 參數會自動將結果顯示在預設的 Results 表格中。
-   **`getResult("Volume", 0);`**: 從 Results 表格的第一行 (`0`) 讀取 `Volume` 欄位的值，並存入變數。
-   **`run("Close All");`**: 腳本執行完畢後，關閉所有開啟的視窗，保持工作區乾淨。

## 4. 如何執行與擴充

-   **執行腳本：** 在腳本編輯器視窗中，點擊 `Run` 按鈕。觀察 Log 視窗 (`Window > Log`) 的即時輸出。
-   **擴充應用：** 這個腳本是自動化分析的基礎。您可以輕易地擴充它，例如：
    -   將其放入 `Process > Batch > Macro...` 中，對整個資料夾的 MRI 影像進行批次處理。
    -   加入 `saveAs("Tiff", ...)` 指令，將產生的 `Brain_Mask` 和 `Skull_Mask` 自動儲存到指定資料夾。
    -   將計算出的體積寫入一個 CSV 檔案，方便後續的統計分析。
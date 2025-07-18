# 多目標測量：ROI manager與形態學分析

在許多生物影像中，我們需要一次測量多個物件（例如細胞、胚胎）。手動一個個圈選不僅耗時，也容易出錯。本章節將以 `embryos.jpg` 範例影像為例，引導您學習一個標準的自動化分析流程：從影像分割、形態學處理，到使用 **ROI manager (ROI Manager)** 進行高效的批次測量。

## 1. 準備工作：開啟影像、校正與設定

在進行任何測量之前，首要步驟是確保影像設定正確，讓後續的數據具有科學意義。

1.  **開啟範例影像：** `File > Open Samples > Embryos.jpg`。
2.  **設定比例尺：** 為了讓測量結果具有物理意義（如 µm²），而不是像素（pixels），必須進行空間校正。如果影像中有已知長度的參考物，請使用**直線工具**量測後，執行 `Analyze > Set Scale...` 來設定。。
3.  **設定測量項目：**
    *   執行 `Analyze > Set Measurements...`。
    *   在對話框中，勾選您感興趣的測量項目，例如：`Area`、`Mean gray value`、`Perimeter`、`Fit Ellipse` 和 `Shape descriptors`。
    *   點擊 `OK`。此設定將會應用於後續所有的測量指令。

## 2. 自動化分析流程

此流程適用於快速、大量地處理特徵較為一致的物件。

### 步驟 2.1: 影像分割

我們的目標是產生一張黑白分明的**二值化遮罩 (Binary Mask)**，其中白色代表胚胎，黑色代表背景。

1.  **轉換為灰階：** 這是一張彩色影像，但分割通常在單一灰階通道上進行。執行 `Image > Type > 8-bit`。
2.  **閾值分割 (Thresholding)：** 執行 `Image > Adjust > Threshold...` (快捷鍵 `Ctrl+Shift+T`)。ImageJ 會自動選擇一個閾值，觀察影像，大部分胚胎應該被標示為紅色。點擊 `Apply`，將影像轉換為黑白的二值化影像。

此時我們的分割結果並不完美，這正是下一步形態學處理要解決的問題。

### 步驟 2.2: 形態學處理 (清理與分離物件)

形態學處理 (Morphological Processing) 是一系列在二值化影像上操作的技術，用來改善分割結果，可以用來移除雜訊、填補空洞、分離相連的物體。

#### 基礎形態學操作

在處理複雜的 `embryos.jpg` 影像之前，我們先了解幾個最基本的形態學指令 (`Process > Binary > ...`)：

-   **Erode (侵蝕):** 此操作會「侵蝕」掉白色物體的邊緣像素 (前景)。
    -   **效果:** 使物體變小，可以有效移除微小的雜訊點，或讓相連物體的"脖子"變細。
-   **Dilate (膨脹):** 此操作會「膨脹」白色物體的邊緣像素。
    -   **效果:** 使物體變大，可以填補物體內部的小空洞，或將鄰近的斷裂部分連接起來。

`Erode` 和 `Dilate` 通常成對使用，以達到更精細的效果：

-   **Open (開啟):** **先侵蝕，後膨脹** (`Process > Binary > Open`)。
    -   **效果:** 想像一下「打開」一個小通道。此操作可以有效**移除影像中獨立的微小雜訊點**（因為它們在侵蝕步驟就被消除了），並且能夠**平滑物體的輪廓**，斷開細微的連接，但對物體整體的面積影響較小。
-   **Close (關閉):** **先膨脹，後侵蝕** (`Process > Binary > Close`)。
    -   **效果:** 想像一下「關閉」一個小缺口。此操作可以有效**填補物體內部的小洞或缺口**，並且能夠**連接非常靠近的獨立物件**，平滑輪廓，同樣對物體整體的面積影響較小。

#### 應用於 Embryos.jpg 的處理流程

觀察上一步的結果，您會發現一些較大的胚胎內部有黑色的空洞，且許多胚胎緊緊相鄰，旁邊還有一些小雜訊點。

1.  **填補空洞 (Fill Holes)：** 執行 `Process > Binary > Fill Holes`。胚胎內部的黑色空洞會被填滿。
2.  **分離相連物件 (Watershed)：** 執行 `Process > Binary > Watershed`。在原本相連的胚胎之間，ImageJ 會畫出細細的黑線將它們分開。

> **分水嶺演算法的原理：**
> 它將灰階影像想像成一個地形圖，亮度高的區域是山峰。演算法會從區域的最低點（種子點）開始「注水」，水會慢慢淹沒整個盆地，直到不同盆地的水在「山脊」相遇。這些相遇的山脊線，就成了物件之間的分割線。在二值化影像上，它會先計算距離圖 (Distance Map)，再進行分割。

經過這兩步處理，我們得到了一張乾淨、且每個胚胎都獨立分開的二值化遮罩。

### 步驟 2.3: 自動選取並傳送至 ROI manager

現在，我們使用 `Analyze Particles` 功能來自動偵測所有胚胎，並將它們的輪廓統一交給 **ROI manager (ROI Manager)**。

1.  **執行粒子分析：**
    *   執行 `Analyze > Analyze Particles...`。
    *   在對話框中進行以下關鍵設定：
        *   `Size (pixel^2)`: 設定一個合理的範圍，例如 `500-Infinity`，以過濾掉分割後可能殘留的微小雜訊點。
        *   `Show`: 選擇 `Outlines`。這會產生一張新的影像，顯示所有被偵測到的物體輪廓。
        *   **勾選 `Display results`**：顯示測量結果表格。
        *   **勾選 `Add to Manager`**：**這是最重要的步驟！** 此選項會將每一個被偵測到的物體輪廓作為一個獨立的 ROI，自動加入到 ROI manager中。
    *   點擊 `OK`。

此時，您會看到 **ROI Manager** 視窗出現，並且清單中已經包含了所有被偵測到的胚胎ROI。

## 3. 手動選取流程 

雖然自動化流程很強大，但有時您需要測量的目標不規則、自動分割效果不佳，或只想分析其中幾個特定物件。在這種情況下，手動選取結合ROI manager是更精確、更靈活的方法。

1.  **開啟 ROI manager：** 如果尚未開啟，請執行 `Analyze > Tools > ROI Manager...`。
2.  **手動圈選：** 在主工具列選擇一個選取工具，例如 **手繪選取工具 (Freehand Selection)**。
3.  仔細地沿著第一個胚胎的邊緣畫出輪廓。
4.  **加入manager：** 在 ROI manager視窗中，點擊 `Add [t]` 按鈕。第一個胚胎的選區 (ROI) 就被儲存起來了。
5.  重複步驟 3 和 4，直到所有您想測量的胚胎都已圈選並加入到 ROI manager中。

## 4. 使用 ROI manager進行批次測量與分析

無論是透過自動還是手動流程，最終我們都得到了一個包含多個選區的 ROI manager。它是進行批次測量的核心工具。

### 步驟 4.1: 批次測量

在 ROI manager視窗中，點擊 `Measure` 按鈕。ImageJ 會對清單中的**每一個 ROI** 進行測量，並將結果逐行顯示在 "Results" 表格中。

### 步驟 4.2: 數據分析與匯出

1.  **計算基本統計：**
    *   在 "Results" 表格的選單中，選擇 `Results > Summarize`。
    *   一個新的 "Summary" 視窗會彈出，自動計算出每一欄數據的平均值 (Mean)、標準差 (Standard Deviation) 等統計資訊。
2.  **繪製分佈圖：**
    *   在 "Results" 表格中，點擊您想分析的欄位標題（例如 `Area`），使其反白。
    *   執行 `Results > Distribution...`，ImageJ 會產生該欄數據的直方圖，讓您直觀地看到分佈情況。
3.  **導出數據進行進階分析：**
    *   在 "Results" 表格中，選擇 `File > Save As...`。
    *   將檔案儲存為 `.csv` 格式。這個檔案可以輕易地被 Excel、Google Sheets 或其他統計軟體開啟，以進行更深入的分析與圖表繪製。

### 步驟 4.3: ROI 管理與視覺化

ROI manager還提供了許多實用的管理功能：

-   **視覺化與標示：**
    *   **勾選 `Show All`**，所有胚胎的輪廓會被顯示在原始影像上。
    *   接著**點擊 `Labels`**，每個 ROI 的編號會被標示在影像上，讓您可以輕易地將影像上的胚胎與 "Results" 表格中的數據行對應起來。
-   **個體操作與儲存：**
    *   在清單中點選任一 ROI，它會在影像上高亮顯示。
    *   您也可以使用 `Delete` 刪除特定的 ROI，或用 `Rename` 重新命名。
    *   點擊 `Save...` 可以將這一整組 ROI 儲存成一個 `.zip` 檔案，方便未來重新載入 (`Open...`) 進行分析，無需重複前面的分割步驟。

## 5. 總結

多目標分析工作流程如下：

1.  **準備工作**：設定好比例尺與測量參數。
2.  **獲取選區**：可選擇**自動化流程**（分割+形態學處理+粒子分析）或**手動流程**（手動圈選）。
3.  **批次分析**：將所有選區匯集到 **ROI manager**，進行統一的測量、分析、標示與儲存。

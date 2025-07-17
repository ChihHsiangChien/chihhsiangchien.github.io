# 影像前處理決策方法

## 流程總覽
根據 [前處理流程圖](workflowChart.md)，主要步驟如下：
1. 彩色影像轉灰階
2. 背景分離（靜態/動態背景相減）
3. 對比度增強
4. 去雜訊（依雜訊類型選擇方法）
5. 邊緣偵測
6. 形態學操作
7. 輪廓分析/分割

---

## 1. 彩色影像轉灰階

*   **ImageJ 操作：**
    *   `Image > Type > 8-bit` 或 `Image > Type > 16-bit`（將彩色影像轉為灰階）
    *   若原始影像為 RGB，可用 `Image > Type > RGB Stack` 分離通道

---

## 2. 背景分離（前景/背景分割）

*   **靜態背景相減法：**
    *   `Process > Image Calculator...`，選擇原始影像與背景影像，運算方式選 `Subtract`
*   **動態背景建模：**
    *   若有影像序列，可用 `Process > Subtract Background...`（設定 rolling ball 半徑）
    *   進階：需外掛如 `Background Subtraction` 或用 Macro 處理多張影像

---

## 3. 對比度增強/亮度均勻化

*   **ImageJ 操作：**
    *   `Image > Adjust > Brightness/Contrast...`
    *   `Process > Enhance Contrast...`（可勾選 Normalize/Equalize Histogram）
    *   `Process > Subtract Background...`（校正不均勻背景）

---

## 4. 去雜訊（依 workflow 選擇）

*   **椒鹽雜訊/需保邊：**
    *   `Process > Filters > Median...`
*   **高斯雜訊/平滑為主：**
    *   `Process > Filters > Gaussian Blur...`
*   **強烈保邊（進階）：**
    *   需安裝 Bilateral Filter 插件（`Plugins > Bilateral Filter`）

---

## 5. 邊緣偵測

ImageJ 可利用 `Process > Filters > Convolve...` 自訂卷積核進行各種邊緣偵測。以下提供常用 kernel 範例：

*   **Sobel（高對比）：**
    *   在 Convolve 視窗輸入：

        ```
        1 0 -1
        2 0 -2
        1 0 -1
        ```

    *   或

        ```
        1 2 1
        0 0 0
        -1 -2 -1
        ```

    *   分別為 X/Y 方向，需各自執行一次。

*   **Scharr（高對比）：**
    *   在 Convolve 視窗輸入：

        ```
        3 0 -3
        10 0 -10
        3 0 -3
        ```

    *   或

        ```
        3 10 3
        0 0 0
        -3 -10 -3
        ```

    *   分別為 X/Y 方向，需各自執行一次。

*   **Laplacian（找細節/斑點）：**
    *   在 Convolve 視窗輸入：

        ```
        0 1 0
        1 -4 1
        0 1 0
        ```

    *   或
    
        ```
        1 1 1
        1 -8 1
        1 1 1
        ```

*   **Canny（效果均衡）：**
    *   Canny 邊緣偵測需多步驟（高斯模糊 + Sobel + 非極大值抑制 +雙閾值），ImageJ 無直接 kernel，但可用 Convolve 先做高斯模糊與 Sobel，再手動後處理。

> 操作步驟：`Process > Filters > Convolve...`，將上述 kernel 貼入視窗即可。

---

## 6. 邊緣細化/形態學操作

*   **ImageJ 操作：**
    *   `Process > Binary > Erode`（侵蝕）
    *   `Process > Binary > Dilate`（膨脹）
    *   `Process > Binary > Open`（開啟）
    *   `Process > Binary > Close`（關閉）
    *   `Process > Binary > Skeletonize`（骨架化）
    *   `Process > Binary > Watershed`（分水嶺分割）

---

## 7. 輪廓分析/分割

*   **ImageJ 操作：**
    *   `Analyze > Analyze Particles...`（偵測、量測分割後的物件）
    *   可設定 Size/Circularity 範圍，並選擇輸出結果

---

## 8. 批次處理與自動化

*   **錄製 Macro：**
    *   `Plugins > Macros > Record...` 開始錄製操作
    *   完成後 `Create` 儲存 Macro
*   **批次處理：**
    *   `Process > Batch > Macro...`，選擇 Macro 與資料夾批次處理

---

## 常見細胞分析基本流程（Workflow）

1. **輸入影像**：`File > Open...`
2. **去雜訊**：`Process > Filters > Gaussian Blur...` 或 `Median...`
3. **增強對比/亮度均勻化**：`Process > Enhance Contrast...`、`Subtract Background...`
4. **門檻處理/分割**：`Image > Adjust > Threshold...` 或安裝 `Auto Local Threshold` 插件
5. **形態學運算**：`Process > Binary > ...`
6. **粒子分析**：`Analyze > Analyze Particles...`
7. **輸出數據**：`File > Save As...` 匯出結果
## 6. 是否圖像角度或大小不一致？

### 6-1. 幾何轉換 (Geometric Transformations)

*   **ImageJ 操作：**
    *   **旋轉：** `Image > Transform > Rotate...`
    *   **縮放：** `Image > Transform > Scale...`
    *   **翻轉：** `Image > Transform > Flip Horizontally / Flip Vertically`
    *   **精確對齊：** 使用 ROI 工具選取參考區域，再用 `Edit > Selection > Specify...` 設定精確座標或大小，輔助對齊。

---

## 7. 是否要進行大量影像處理？

### 7-1. 使用批次處理 (Batch Processing)

*   **ImageJ Macro 操作：**
    1.  **錄製Macro：** `Plugins > Macros > Record...` 開始錄製你的操作步驟。
    2.  完成操作後，在 Recorder 視窗點擊 `Create`。
    3.  **測試Macro：** `Plugins > Macros > Run...` 選擇剛才儲存的Macro文件 (`.ijm`) 運行。
    4.  **批次處理：** `Process > Batch > Macro...`
        *   設定 `Input` 資料夾 (來源影像)。
        *   設定 `Output` 資料夾 (儲存結果)。
        *   選擇 `Macro` 文件。
        *   設定輸出格式 (`Format`)。
        *   點擊 `Process` 開始批次處理。

### 7-2. 使用 Python 自動化 (推薦 `pyimagej`)

## 常見的細胞分析基本流程 (Workflow)

1.  **輸入影像 (Image Input)**
    *   通常是顯微鏡影像。
    *   格式可能是 `TIFF`, `JPG`, `PNG` 等，有時是多通道 (multi-channel) 或 Z-stack 影像。

2.  **去雜訊 (Noise Reduction)**
    *   `Gaussian blur` (高斯模糊): 去除高頻雜訊，使背景平滑。適用於高斯分佈的雜訊。
    *   `Median filter` (中值濾波): 更適合消除 `salt-and-pepper noise` (椒鹽雜訊/雜點)。

3.  **增強對比/亮度均勻化 (Enhancement / Illumination Correction)**
    *   `Histogram equalization` (直方圖均化): 全局性地增強對比度。
    *   `CLAHE` (Contrast Limited Adaptive Histogram Equalization): 自適應直方圖均衡，分區塊處理，對局部對比度改善更佳，尤其適用於亮度不均的影像。
    *   背景減除 (`Process > Subtract Background...`): 適用於背景緩慢變化的情況。

4.  **門檻處理/分割 (Thresholding / Segmentation)**
    *   **全局閾值 (Global Threshold):** 整張影像使用同一個閾值。
        *   `Image > Adjust > Threshold...` (可選 `Otsu`, `MaxEntropy` 等自動方法)。
    *   **局部閾值 (Local Threshold):** 影像被分成小區域，每個區域計算自己的閾值。
        *   適用於背景亮度不均勻。
        *   需插件如 `Auto Local Threshold` (提供 `Phansalkar`, `Bernsen`, `Mean`, `Median` 等方法)。

5.  **形態學運算 (Morphological Operations)**
    *   主要在二值影像上操作 (`Process > Binary > ...`)。
    *   `Erosion` (侵蝕): 縮小物件，去除毛刺。
    *   `Dilation` (膨脹): 擴大物件，填補內部小孔。
    *   `Opening` (開啟): 先侵蝕後膨脹，可斷開細微連接、去除小噪點。
    *   `Closing` (關閉): 先膨脹後侵蝕，可連接鄰近物件、填補內部孔洞。
    *   `Watershed` 分水嶺分割: `Process > Binary > Watershed`，常用於分離相連或重疊的細胞。通常需要先進行距離變換 (`Process > Binary > Distance Map`)。

6.  **粒子分析 (Analyze Particles)**
    *   `Analyze > Analyze Particles...`
    *   在二值影像上偵測獨立的物件 (粒子/細胞)。
    *   可設定大小 (Size) 和圓形度 (Circularity) 範圍來篩選目標。
    *   測量參數包括：面積 (Area)、中心點 (Centroid)、周長 (Perimeter)、圓形度、長短軸等。
    *   勾選 `Display results`, `Clear results`, `Summarize`, `Add to Manager` 等選項控制輸出。

7.  **輸出數據 (Data Output)**
    *   分析結果顯示在 ImageJ 的 `Results Table` 中。
    *   可將表格 `File > Save As...` 匯出成 `.csv` 或 `.txt` 文件，以便後續使用 Excel, Python (Pandas), R 等工具進行統計分析和繪圖。

# 影像前處理決策方法


## 1. 是否影像太模糊或太銳利？

### 1-1. 銳化影像 (Sharpening)

*   **目的：** 改善模糊影像，使邊緣更清楚
*   **ImageJ 操作：**
    *   `Process > Enhance Contrast`
    *   `Process > Filters > Sharpen`
    *   `Plugins > Filters > Unsharp Mask`

---

### 1-2. 模糊平滑影像 (Blurring)

*   **目的：** 去除過強邊緣或雜訊
*   **ImageJ 操作：**
    *   `Process > Filters > Gaussian Blur...`
    *   `Process > Filters > Median...`
    *   `Process > Smooth`

---

## 2. 是否有明顯的雜訊？

### 2-1. 去除椒鹽雜訊 (Salt-and-Pepper Noise)

*   **ImageJ 操作：**
    *   `Process > Filters > Median...`

### 2-2. 去除高斯雜訊 (Gaussian Noise)

*   **ImageJ 操作：**
    *   `Process > Filters > Gaussian Blur...`

### 2-3. 去除週期性雜訊 (Periodic Noise)

*   **ImageJ 操作：**
    1.  `Process > FFT > FFT`
    2.  在頻域影像中，遮罩處理高亮區域（代表週期性雜訊）
    3.  `Process > FFT > Inverse FFT`

---

## 3. 是否影像對比度太低或亮度不均？

### 3-1. 增強對比 (Contrast Enhancement)

*   **ImageJ 操作：**
    *   `Image > Adjust > Brightness/Contrast...`
    *   `Process > Enhance Contrast...` (可勾選 `Normalize` / `Equalize Histogram`)

### 3-2. 自訂 Gamma 或 LUT 調整

*   **ImageJ 操作：**
    *   `Image > Lookup Tables` (選擇並套用合適的 LUT，部分 LUT 可調整 Gamma)
    *   `Image > Adjust > Gamma...` (可能需要額外插件)

---

## 4. 是否需要區分前景與背景？

### 4-1. 閾值二值化 (Thresholding)

*   **ImageJ 操作：**
    *   `Image > Adjust > Threshold...`
    *   在彈出視窗中，可從下拉選單選擇自動閾值方法 (如 `Otsu`, `Yen`, `MaxEntropy` 等)
    *   調整閾值範圍後，按 `Apply` 將影像轉換為二值影像。

### 4-2. 自適應閾值 (Adaptive Thresholding)

*   **需求：** 通常需要安裝插件，例如 `Auto Local Threshold`。
*   **ImageJ 操作 (以 Auto Local Threshold 為例)：**
    1.  安裝 `Auto Local Threshold` 插件。
    2.  使用 `Plugins > Auto Local Threshold`。
    3.  選擇合適的局部閾值方法 (如 `Mean`, `Median`, `MidGrey`, `Phansalkar`, `Bernsen` 等)。

---

## 5. 是否要強調或抽出特定形狀特徵？

### 5-1. 邊緣偵測 (Edge Detection)

*   **ImageJ 操作：**
    *   `Process > Find Edges` (使用 Sobel 算子)
    *   **進階：** 可使用插件如 `Plugins > FeatureJ > FeatureJ Edges` (提供 Canny 等更多方法)

### 5-2. 數學形態學 (Mathematical Morphology)

*   **ImageJ 操作：**
    *   **設定結構元素：** `Process > Binary > Options...` (選擇結構元素形狀和前景/背景色)
    *   **基本操作：**
        *   `Process > Binary > Erode` (侵蝕)
        *   `Process > Binary > Dilate` (膨脹)
        *   `Process > Binary > Open` (開啟：先侵蝕再膨脹，去除小噪點)
        *   `Process > Binary > Close` (關閉：先膨脹再侵蝕，填補小空洞)
    *   **其他操作：**
        *   `Process > Binary > Skeletonize` (骨架化)

---

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

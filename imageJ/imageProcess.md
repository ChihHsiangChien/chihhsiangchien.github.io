# 影像前處理決策方法


## 彩色影像轉灰階

如果影像是 RGB 或多通道影像，需要先轉換為單一的灰階影像才能進行後續處理。

*   **策略：**
    *   選擇一個對比度最高、目標最清晰的通道進行轉換（例如，DAPI 染核選藍色通道）。
    *   轉換成不同的色彩空間，例如`HSB Stack`、`Lab Stack`，觀察不同通道的差異。
*   **ImageJ 操作：**
    *   `Image > Type > 8-bit` 或 `Image > Type > 16-bit`：將彩色影像轉換為灰階。
    *   `Image > Color > Split Channels`：將多通道影像分離，以便選擇最佳通道。
---

## 去雜訊
*   如果影像出現明顯隨機雜訊（如 salt-and-pepper、感光雜訊），應使用去噪處理。
*   如果雜訊輕微或會影響細節邊緣，則略過此步驟或使用更小的模糊範圍（sigma 較小的 Gaussian）。

### 平均濾波器
*   imagej有兩處可以做
    *   `Process › Smooth`：固定範圍3X3
    *   `Process > Filters > Mean...`：這個可以指定範圍
*   針對每個像素，它會計算其周圍特定範圍內所有像素的平均值來取代。
*   能有效減少隨機雜訊，例如高斯雜訊 (Gaussian Noise) 或其他均勻分佈的隨機雜訊。
*   也因為會對所有像素進行平均，無論這些像素是雜訊還是影像的重要邊緣，所以會導致**邊緣變得模糊不清**。對於細節豐富的影像，過度使用平均濾波可能會損失很多重要的資訊。

### 中值濾波器
*   imagej有兩處可以做
    *   `Process › Noise › Despeckle`：這是固定3X3範圍
    *   `Process > Filters > Median...`：這個可以指定範圍
*   去除**椒鹽雜訊**(影像中隨機分佈的亮點像鹽粒，或暗點像胡椒)
*   影像中包含突兀的、孤立的亮點或暗點時使用
*   在需要在不顯著模糊重要特徵或邊緣的情況下清理影像時使用。
### 高斯模糊
*   imagej操作：
    *   `Process > Filters > Gaussian Blur...`
*   利用高斯函數（一種鐘形曲線）來平滑影像並減少高斯雜訊 (Gaussian Noise)。
*   高斯雜訊是一種常見的隨機雜訊，其分佈符合常態分佈（高斯分佈），通常表現為像素強度上的細微**隨機**波動，使影像看起來有點模糊或顆粒感。
*   **高斯濾波器**透過計算像素及其鄰近像素的加權平均值來實現平滑。權重的大小由高斯函數決定，這意味著離中心像素越近的像素對新像素值的貢獻越大，而越遠的像素貢獻越小。這種加權平均的方式產生了非常自然且平滑的模糊效果。
*   半徑 (Sigma，σ)：半徑值越大，模糊程度越高，影像的平滑效果也越明顯。反之，半徑值越小，模糊程度越低。


### 實作產生噪點的影像，再進行去雜訊處理
#### 產生高斯雜訊的圖片
*   執行`File > New > Image...`，使用預設值產生白色的8-bit影像。
*   執行`Process › Noise › Add Noise`，這會在畫面產生**高斯雜訊** (平均值0，標準差25)，[參見](https://imagej.net/ij/docs/menus/process.html#noise)。
*   你也可以試試直接用以下的 Macro產生圖片

```ijm
newImage("高斯雜訊", "8-bit white", 512, 512, 1);
run("Add Noise");
```

*   如果要指定高斯的標準差可以用`Add Specified Noise...`

```ijm
newImage("高雜訊圖片", "8-bit white", 512, 512, 1);
run("Add Specified Noise...", "standard=80");
```

#### 產生椒鹽雜訊的圖片
*   執行`File › Open Samples › Clown`，再將此影像轉為 8-bit，執行`Image › Type › 8-bit`
*   執行`Process › Noise › Salt and Pepper`，這會產生**椒鹽雜訊**(隨機使 2.5%的像素變為黑色，2.5變為白色)
*   你也可以試試直接用以下的 Macro產生圖片

```ijm
run("Clown");
run("8-bit");
run("Salt and Pepper");
rename("椒鹽雜訊");
```
---
## 背景分離（前景/背景分割）

*   **靜態背景相減法：**
    *   `Process > Image Calculator...`，選擇原始影像與背景影像，運算方式選 `Subtract`
*   **動態背景建模：**
    *   若有影像序列，可用 `Process > Subtract Background...`（設定 rolling ball 半徑）
    *   進階：需外掛如 `Background Subtraction` 或用 Macro 處理多張影像

---

## 對比度增強/亮度均勻化

*   **ImageJ 操作：**
    *   `Image > Adjust > Brightness/Contrast...`
    *   `Process > Enhance Contrast...`（可勾選 Normalize/Equalize Histogram）
    *   `Process > Subtract Background...`（校正不均勻背景）

---


## 邊緣偵測

ImageJ 內建了一些邊緣檢測的方式，也可以用 `Process > Filters > Convolve...` 自訂卷積核進行各種邊緣偵測。

### 內建方法
*   **Sobel**
    *   內建的`Process > Find Edges` 就是用Sobel kernel做的**梯度**邊緣檢測。
    *   適用情境：找出物體輪廓或分界線，對灰階變化敏感。
    *   是**一階導數邊緣偵測器**，專門用來找出影像中灰階強度「變化最大的區域」——也就是**邊緣**。
    *   計算影像中水平方向（Gx）與垂直方向（Gy）的梯度，然後根據這些梯度來估計邊緣的位置與方向。因此對偵測斜邊或曲邊
    *   在含有雜訊或模糊的影像中，容易誤判邊緣。
*   **Unsharp Mask**
    *   適用加強邊緣對比，常用於細節強化。
    *   內建：`Process > Filters > Unsharp Mask...`
    *   用模糊來突顯細節。邏輯如下： 原圖 - 模糊圖 = 高頻細節（即邊緣）。
    *   先對影像做「模糊處理」，取得低頻背景，再將原圖減去模糊圖像得到高頻圖像（細節），再乘上Mask Weight（遮罩權重），控制加回多少細節，再加回原圖，產生更清晰、更銳利的影像。


*   **Variance**
    *   將每個像素替換為鄰域變異數，可突顯邊緣與紋理，因為邊緣處變異數通常較高。
    *   內建：`Process > Filters > Variance...`


*   **Laplacian（找細節/斑點）：**
    *   `Process > Filters > Laplacian` 應用拉普拉斯濾波器，常用於邊緣增強。在 `Process > Filters > Convolve...` 視窗輸入以下任何一種kernel。  
        第一種

        ```
        0 1 0
        1 -4 1
        0 1 0
        ```

        第二種  

        ```
        1 1 1
        1 -8 1  
        1 1 1
        ```

*   **Scharr**
    *   是一階導數濾波器，用來偵測影像中灰階變化的方向與強度（即邊緣）。它與 Sobel 非常類似，但權重經過特殊優化，使得旋轉不變性更好、方向性更穩定，對 45°、斜邊緣效果較好，相對於Sobel對雜訊略微不那麼敏感。

    *   **邊緣強度**（Gradient Magnitude）是透過兩個方向的導數（梯度）來估算的：  
        水平方向的梯度：\(𝐺_𝑥\)  
        ​垂直方向的梯度：\(𝐺_𝑦\)  
        \(G = \sqrt{G_x^2 + G_y^2} \)  

        x 方向的 kernel
        
        ```
        3 0 -3
        10 0 -10
        3 0 -3
        ```

        y 方向的 kernel  

        ```
        3 10 3
        0 0 0
        -3 -10 -3
        ```

### 自訂卷積核加上Macro

#### 邊緣強度的計算方式
**邊緣強度**（Gradient Magnitude）是透過兩個方向的導數（梯度）來估算的：  

*   水平方向的梯度：\(𝐺_𝑥\)
*   垂直方向的梯度：\(𝐺_𝑦\)  
*   \(G = \sqrt{G_x^2 + G_y^2} \)  


####　以**Scharr**計算為例
我們可以直接用Macro來直接產生邊緣偵測後的圖。
```ijm

// Scharr Filter - Full Edge Magnitude Macro
// 適用於灰階圖像

// Step 0: 檢查影像並轉為 32-bit
run("Duplicate...", "title=Original");
run("32-bit");

// Step 1: Apply Scharr X
run("Duplicate...", "title=Gx");
selectWindow("Gx");
run("Convolve...", "text1='3 0 -3\n10 0 -10\n3 0 -3'");

// Step 2: Apply Scharr Y
selectWindow("Original");
run("Duplicate...", "title=Gy");
selectWindow("Gy");
run("Convolve...", "text1='3 10 3\n0 0 0\n-3 -10 -3'");

// Step 3: Gx^2
selectWindow("Gx");
run("Square");
rename("Gx2");

// Step 4: Gy^2
selectWindow("Gy");
run("Square");
rename("Gy2");

// Step 5: Add Gx^2 + Gy^2
imageCalculator("Add create", "Gx2", "Gy2");
rename("G2");

// Step 6: Square root → Gradient Magnitude
run("Square Root");
rename("Scharr Gradient Magnitude");

// Step 7: Optional - enhance visibility
run("Enhance Contrast", "saturated=0.35");
```

####　把上述Macro，改成`Sobel`的Kernel
X 方向的 kernel

```
1 0 -1
2 0 -2
1 0 -1
```

Y 方向

```
1 2 1
0 0 0
-1 -2 -1
```

---

## 邊緣細化/形態學操作

*   **ImageJ 操作：**
    *   `Process > Binary > Erode`（侵蝕）
    *   `Process > Binary > Dilate`（膨脹）
    *   `Process > Binary > Open`（開啟）
    *   `Process > Binary > Close`（關閉）
    *   `Process > Binary > Skeletonize`（骨架化）
    *   `Process > Binary > Watershed`（分水嶺分割）

---

## 輪廓分析/分割

*   **ImageJ 操作：**
    *   `Analyze > Analyze Particles...`（偵測、量測分割後的物件）
    *   可設定 Size/Circularity 範圍，並選擇輸出結果

---

## 批次處理與自動化

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

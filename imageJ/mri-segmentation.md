# 使用 t1-header.tif 進行 MRI 影像分割：分離頭骨與腦組織

本章節將以 `t1-header.tif` 這組 T1 加權的腦部 MRI 影像為範例，學習如何使用 ImageJ/Fiji 進行基礎的影像分割，將感興趣的解剖結構，如腦組織（Brain）和頭骨（Skull），分離出來，並進行 3D 視覺化呈現。

## 案例介紹與準備工作

### 認識範例影像 `t1-header.tif`

這是一套包含 129 張連續切片的 T1 加權 MRI 影像堆疊（Image Stack）。

-   **資料來源:** Jeff Orchard, University of Waterloo.
-   **影像特性:**
    -   在 T1 加權影像中，不同組織的對比度良好。一般來說，脂肪（如骨髓）呈現高訊號（亮色），腦白質比腦灰質亮，而腦脊髓液（CSF）則呈現低訊號（暗色）。
    -   影像背景（頭部以外的區域）已被設為零，方便我們進行分析。


### 操作前的建議

1.  **開啟影像：** 直接將 `t1-header.tif` 檔案拖曳至 Fiji/ImageJ 視窗，或使用 `File > Open...`。
2.  **探索影像堆疊：**
    -   使用視窗下方的滑桿，可以瀏覽不同的 Z 軸切片。
    -   執行 `Image > Stacks > Orthogonal Views` 可以同時從三個正交平面（橫斷面、冠狀面、矢狀面）觀察影像，這對於理解 3D 結構非常有幫助。
3.  使用工具觀察這種有z stack的影像，例如`Plugins > 3D viewer`或是 `Plugints > Volumln Viewer`


## 步驟一：分離腦組織
我們的目標是建立一個只包含腦組織的**二值化遮罩 (Binary Mask)**，你可以先用之前學過的`Image > Adjust > Threshold...`進行處理，目標是讓腦組織（腦灰質與白質）被完整選取，同時盡可能排除周圍的腦脊髓液和頭骨。如果需要可以再後續用形態學處理來清理空洞與雜訊。

除了上述手動方法外，我們將利用機器學習來進行分割。

### 使用機器學習進行分割

當腦組織和頭骨的灰階強度非常相似時，單純的閾值分割會失敗。此時，可以用 Fiji 內建的 **Trainable Weka Segmentation** ，它不僅只靠灰階值，還能學習紋理、邊緣等特徵，分割效果更佳。

1.  **開啟插件與設定：**
    *   開啟的 `t1-header.tif` 影像。
    *   執行 `Plugins > Segmentation > Trainable Weka Segmentation`。
    *   在 Weka 視窗中，點擊 `Settings`，確認 `Training features` 中的選項（預設即可）。
    *   點擊 `Create new class` 建立三個類別，並分別命名為 `Brain`, `Other`, `Background`。

2.  **提供訓練樣本 (Training)：**
    *   **標記 Brain:** 在 Weka 視窗中選中 `Brain` 類別。使用 **選取工具**，在影像的腦組織區域畫幾個小圈，每畫一個就點擊 `Add to class 'Brain'` 按鈕。**技巧：** 請在不同的腦區（灰質、白質）和不同的 Z-slice 上都提供樣本。
    *   **標記 Other:** 選中 `Skull` 類別，在頭骨的亮色區域畫圈並加入。
    *   **標記 Background:** 選中 `Background` 類別，在腦外的黑色區域畫圈並加入。

3.  **訓練與產生結果：**
    *   點擊 `Train classifier` 按鈕進行訓練。右側的預覽視窗會即時顯示分類結果。如果結果不理想，可以增加更多樣本並重新訓練。
    *   對預覽滿意後，點擊 `Create result`。這會產生一張新的**分類結果影像 (classified image)**。

4.  **從分類結果中提取腦部遮罩：**
    *   在產生的分類結果影像上，執行 `Image > Adjust > Threshold...`。
    *   在 Weka 中，第一個類別 (`Brain`) 的像素值通常是 1。將閾值滑桿的上下限都設為 **1**，這樣就只選取了腦部。
    *   點擊 `Apply`，即可得到一張乾淨的 `Brain Mask`。
---


## 步驟二：分離頭骨 (Skull Segmentation)

分離頭骨的邏輯很簡單：**頭骨 = 整個頭部 - 腦組織**。

1.  **建立「整個頭部」的遮罩：**
    *   回到原始的 `t1-header.tif` 影像。
    *   再次執行 `Image > Adjust > Threshold...`。
    *   這次，將閾值下限設為 1（或一個非常低的值），上限設為最大值。目標是選取所有非黑色的像素。
    *   點擊 `Apply` 產生一個包含整個頭部（腦+頭骨）的遮罩。將其命名為 `Head Mask`。

2.  **影像計算 (Image Calculator)：**
    *   執行 `Process > Image Calculator...`。
    *   在對話框中設定：
        *   `Image1`: 選擇 `Head Mask`。
        *   `Operation`: 選擇 `Subtract` (減去)。
        *   `Image2`: 選擇我們在步驟一得到的 `Brain Mask`。
    *   點擊 `OK`。

3.  **得到頭骨遮罩：**
    *   計算結果就是一張新的影像，其中只剩下頭骨的遮罩。您可以將其命名為 `Skull Mask`。

## 步驟三：3D 視覺化呈現

現在我們有了各自獨立的 `Brain Mask` 和 `Skull Mask`，可以使用 3D Viewer 將它們視覺化。

1.  **啟動 3D Viewer：**
    *   執行 `Plugins > 3D > 3D Viewer`。

2.  **加入腦組織表面：**
    *   在 3D Viewer 視窗中，點擊 `Add > Surface...`。
    *   在 `Image` 下拉選單中選擇 `Brain Mask`。
    *   `Name`: 可命名為 `Brain`。
    *   `Color`: 選擇一個您喜歡的顏色，例如灰色。
    *   `Threshold`: 設為 1。
    *   `Transparency`: 設定一個透明度，例如 `50%`，這樣才能看到內部。
    *   點擊 `OK`。

3.  **加入頭骨表面：**
    *   再次點擊 `Add > Surface...`。
    *   `Image`: 選擇 `Skull Mask`。
    *   `Name`: 可命名為 `Skull`。
    *   `Color`: 選擇白色或淡黃色。
    *   `Threshold`: 設為 1。
    *   `Transparency`: 設為一個較低的值，例如 `20%`。
    *   點擊 `OK`。

現在，您應該可以在 3D Viewer 中看到半透明的頭骨包覆著腦組織的立體模型。您可以用滑鼠自由地旋轉和縮放，從不同角度觀察這些結構。

這些產生的遮罩（Masks）不僅可用於視覺化，也可以進行定量分析。例如對 `Brain Mask` 影像堆疊執行 `Analyze > Histogram`，並將 `Count`（像素數）乘以每個體素（Voxel）的體積，就可以估算出總腦容量。

## 定量分析：計算體積 (Volume Quantification)


### 計算原理

體積計算的邏輯是：

**總體積 = 體素(Voxel)的總數量 × 單一體素的體積**

-   **體素 (Voxel):** 可以理解為 3D 空間中的一個像素點，它具有長、寬、高。
-   **體素總數量:** 在我們的二值化遮罩（如 `Brain Mask`）中，這就是所有白色像素的總和。
-   **單一體素的體積:** 這需要我們對影像進行空間校正，定義每個體素的真實物理尺寸。

根據此 MRI 數據集的`Image > Properties...`，其體素尺寸為 **1.5 mm × 1.5 mm × 1.5 mm**。

### 操作步驟

我們將以計算 **腦組織體積** 為例。。

#### 設定空間校正 (Set Scale)

在進行任何測量之前，必須先讓 ImageJ 知道影像的真實尺度。

1.  選取 `Brain Mask` 或任何一張原始影像堆疊。
2.  執行 `Image > Properties...` (快捷鍵 `Ctrl+Shift+P`)。
3.  在彈出的對話框中，填入已知的體素尺寸：
    *   `Unit of length`: **mm**
    *   `Pixel width`: **1.5**
    *   `Pixel height`: **1.5**
    *   `Voxel depth`: **1.5** (這是 Z 軸的尺寸，即切片厚度)
4.  勾選 `Global`，這樣此設定會應用到所有開啟的影像。
5.  點擊 `OK`。

完成後，影像視窗的標題會顯示校正後的尺寸。

#### 計算體素總數並獲得體積

有兩種推薦的方法可以得到體積。

**方法 A：使用直方圖 (Histogram)**

此方法讓您了解背後的計算過程。

1.  選取 `Brain Mask` 影像堆疊。
2.  執行 `Analyze > Histogram` (快捷鍵 `Ctrl+H`)。
3.  在彈出的 Histogram 視窗中，您會看到一個表格。由於這是二值化影像，只有兩個值：0 (黑色背景) 和 255 (白色前景)。
4.  找到 `Value` 為 **255** 的那一列，其對應的 `Count` 值就是白色體素的總數量，將這個數字與單一體素體積相乘，就可以得到腦的體積。


**方法 B：使用 3D 物件計數器 (3D Object Counter) (更直接)**

Fiji 內建的強大 3D 分析工具可以直接給出校正後的體積。

1.  選取 `Brain Mask` 影像堆疊。
2.  執行 `Analyze > 3D OC Options` 來設定參數，確保 `Volume` 已被勾選。
3.  執行 `Analyze > 3D Object Counter`。
4.  在設定視窗中，將 `Threshold` 設為一個介於 1-255 之間的值 (例如 128)，以確保只計算白色物件。
5.  點擊 `OK`。
6.  在彈出的 "3D Results" 表格中，`Volume` 欄位直接顯示了計算好的體積（單位為 mm³），並且 `Voxels` 欄位顯示了體素總數，與直方圖方法得到的結果一致。

# 3D 形態學分析：量化大腦的表面積與複雜度

我們已經學會了如何從 MRI 影像中分割出大腦並計算其**體積**。然而，體積只是描述一個三維物體最基礎的參數。大腦最顯著的特徵之一是其表面佈滿了複雜的溝（Sulci）與迴（Gyri），這極大地增加了其表面積。

使用 ImageJ/Fiji 來測量更進階的 **3D 形態學 (Morphometry)** 參數，如**表面積 (Surface Area)** 和**球形度 (Sphericity)**，從而量化大腦的結構複雜度。

## 分析目標與理論背景


### 球形度 (Sphericity)

**球形度**是一個用來描述物體形狀有多麼接近完美球體的無因次參數。其值範圍在 0 到 1 之間：
-   **值為 1：** 表示物體是一個完美的球體。
-   **值越接近 0：** 表示物體形狀越不規則、越扁平或越細長。

其計算公式為：

`Sphericity = (π^(1/3) * (6 * Volume)^(2/3)) / Surface Area`

從公式可以看出，在**體積 (Volume) 相同**的情況下，**表面積 (Surface Area) 越大**的物體，其**球形度就越低**。對於大腦而言，複雜的溝迴結構使其在有限的顱腔體積內容納了巨大的皮層表面積，因此其球形度會遠低於一個同樣體積的光滑球體。

## 操作步驟

### 準備 3D 遮罩

使用在`Brain Mask` 作為分析對象。

1.  開啟 `t1-header.tif` 影像並依照先前教學產生 `Brain Mask` 影像堆疊。
2.  觀察**空間校正：** ：影像已經過空間校正 (`Image > Properties...`，體素尺寸為 1.5 x 1.5 x 1.5 mm)。這一步對於計算真實的物理表面積和體積至關重要。

### 使用 3D Object Counter 進行分析

1.  選取 `Brain Mask` 影像堆疊。
2.  執行 `Analyze > 3D Object Counter`。
3.  **參數設定：**
    *   `Threshold`: 設為一個介於 1-255 的值（例如 128），以確保只計算白色物件。
    *   `Min. Voxel`: 設為一個較大的值（如 1000），以過濾掉可能的微小雜訊。
    *   確保 `Volumes` 和 `Surface areas` 這兩個選項都被勾選。
4.  點擊 `OK`。

### 結果
分析完成後，會彈出一個 "3D Results" 表格。

-   **`Volume [mm^3]`:** 這就是我們之前計算過的大腦體積。
-   **`Surface [mm^2]`:** 這就是大腦的總表面積。

使用這兩個值，代入公式計算大腦的球形度。
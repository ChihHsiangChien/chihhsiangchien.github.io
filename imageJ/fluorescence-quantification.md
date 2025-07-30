# 螢光強度定量：分析細胞核/質的訊號分佈
[教學影片](https://youtu.be/-PP4eWnxjt8)

我們將以 ImageJ 內建的 `Fluorescent Cells.tif` 範例影像為基礎，學習影像強度的定量。

## 1. 案例介紹與準備工作

### 認識範例影像 

1.  **開啟影像：** `File > Open Samples > Fluorescent Cells.tif`。
2.  **影像資訊：** 這是一張牛肺動脈內皮細胞的螢光影像，為一個包含三個8位元通道的合成影像（Composite Image）。
    *   **藍色 (Blue):** DAPI 染劑，標定**細胞核 (Nucleus)**。
    *   **綠色 (Green):** Bodipy FL 染劑，標定**微管蛋白 (Tubulin)**，主要分佈於細胞質。
    *   **紅色 (Red):** Texas Red 染劑，標定**絲狀肌動蛋白 (F-Actin)**，主要分佈於細胞質的細胞骨架。

### 分析目標

我們的目標是定量分析**微管蛋白（綠色通道）**在**細胞核**與**細胞質**中的螢光強度。

### 觀察影像品質

這個影像目前是以「Composite Mode」（合成模式）來顯示，它將多個獨立的**灰階通道**（每個通道通常指定不同的偽彩色，例如通道 1 為紅色，通道 2 為綠色，通道 3 為藍色）疊加在一起顯示，形成一個合成的彩色影像，方便同時觀察所有通道的訊號，並視覺化它們之間的空間關係（共定位）。雖然它看起來像一個 RGB 影像，但底層的數據仍然是分離的灰階通道。

` Image › Color › Channels Tool...`可以切換顯示的模式，可以切換成**Color**或**Grayscale**模式。

為了分別觀察不同通道的影像品質，請利用` Image › Color › Split Channels`將影像分成不同通道來分析。

在進行量化影像前，我們必須注意影像的幾項品質:

1. 是否產生**有損壓縮(lossy compression)**嗎？
2. **最高亮度**資訊是否已經丟失？
3. 是否**均勻背景**？是否**偵測器偏移**(uniform background / detector offset)？

#### 有損壓縮(lossy compression)
使用**放大鏡工具**放大影像，是否會看到 8x8的**方形偽影(square shaped artifacts)**。若有，可能被進行過**JPEG 壓縮**，因為JPEG是基於 8x8 像素區塊進行壓縮的演算法，每個區塊都會損失各自的高頻訊號，因此彼此區塊會產生不連續的界面，產生明顯區塊邊界。

#### 最高亮度資訊是否已經丟失？

影像採樣時，進入偵測器的光線量過多，超出了偵測器所能線性響應的範圍，因此產生**飽和(saturated)**，這會使得感測器的讀數限制在最大值（例如255），超過這個數字的都會被**剪切(clipped)**，因此會觀察到**過度曝光(overexposed)**。

我們可以針對個別通道進行`Analyze > Histogram`觀察個別通道的最高像素值的數量(例如pixel value = 255 )，你可以勾選**Log**，讓數量少的數值也能清楚顯示在直方圖上（Y軸非線性顯示，而是變成對數）。

請注意藍色通道中的直方圖，強度值255的像素數量有108個。（也許真實強度有高於255的，但卻被剪切了）

#### **均勻背景**/**偵測器偏移**
當沒有任何光子進入偵測器，理論上偵測器應該會採樣到0值，但如果產生偵測器偏移（detector offset），則應該是黑色的區域就會產生非零的數值。你可以用兩種方式檢查：

* 使用工具列的`Pixel inspector`，觀察應該黑色的部位是否非零。
* 觀察**直方圖**，螢光影像中，因為大多數區域沒有螢光，所以強度值為0的像素應該居多。所以在**眾數(Mode)**應該為零。

請觀察綠色通道的直方圖和另外兩個通道的直方圖差異。

如果影像產生這種offset，則在後續做**共定位分析**時，需要進行**背景減除(Background Subtraction)**或**零偏移校正(Zero Offset Correction / Bias Correction)**的，否則會影響一些需要用像素**絕對強度**來運算的係數，例如**Manders係數**。

### 如何進行偏移校正
校正的目的是為了去除所有來自非目標分子或環境的光學噪音，突出真實的訊號。（想像一下大家都站在箱子上量身高，最後得到的身高應該如何校正回真實身高？）

操作方式：

* 手動選擇背景區域：在影像的空白區域（例如細胞周圍沒有螢光的區域）測量平均強度，然後從整個影像中減去這個值。（但結果可能產生負值）
    1. 使用矩形選區工具，選取一個足夠大的背景區域。`Analyze > Measure`或 `Ctrl+M` 來獲取該區域的平均像素值。
    2. 使用`Process > Math > Subtract...`扣除該數值

* 使用內建的[背景分離](image-preprocess.html#3)`Process > Subtract Background...`
* 拍攝背景影像：拍攝一個不含目標染料但具有所有其他樣品成分和培養條件的空白樣品影像，然後從實驗影像中減去它。

    1. 拍攝多張空白影像，然後將這這些影像堆疊起來，計算它們的平均值（`Image > Stacks > Z Project...`，選擇 **Average**）。這張平均影像就是你的「偏置主幀 (Master Bias Frame)」。
    2. 使用`Process > Image Calculator... `，操作選擇 **Subtract**個通道分別拍攝和減除。


### 設定測量參數

在開始分析前，先設定需要測量哪些數據。

1.  執行 `Analyze > Set Measurements...`。
2.  勾選以下重要參數：
    *   `Area`: 物件的面積。
    *   `Mean gray value`: 訊號的平均強度。
    *   `Integrated Density`: 訊號的總量（= Area × Mean gray value）。
    *   `Display label`: 在結果中顯示影像標籤，方便識別數據來自哪個影像。
3.  點擊 `OK`。

### 1.定義**細胞核**區域

DAPI的藍色通道有清晰的細胞核輪廓，可以用來定義細胞核的選區 (ROI)。

1.  **分離通道：**：執行 `Image > Color > Split Channels`。執行`Image > Rename..`重新命名成 `red`, `green`, `blue` 三張獨立的灰階影像。
2.  **分割細胞核：**
    *   選取 `(blue)` 這張影像。
    *   執行 `Image > Adjust > Threshold...` 來選取細胞核。
    *   點擊 `Apply` 將其轉換為二值化影像。
3.  **將細胞核 ROI 加入manager：**
    *   執行 `Analyze > Analyze Particles...`。
    *   設定 `Size` 來過濾掉小雜訊，例如 `50-Infinity`。
    *   勾選 `Add to Manager`，然後點擊 `OK`，所有細胞核的輪廓都被加入到 ROI manager中了。
    *   在 ROI manager 刪掉不屬於細胞核的部份，例如部份文字可能被選入 ROI。

### 2. 定義**細胞**區域
選取 `(red)` 通道影像，因為能大致顯示整個細胞的輪廓。

1.  **定義細胞粗略範圍**
    *   選擇紅色通道影像，執行`Image > Duplicate..`，複製一張，接下來的操作都用這張圖來運算。
    *   使用工具列的圓形圈選工具，右鍵選擇**Selection Brush Tool**，這可以讓你用筆刷的方式圈出細胞界線。針對左上角的單一細胞，用此工具粗略畫出細胞範圍。
    *   執行`Edit › Selection › Make Inverse`，這會變成選取細胞之外的部份。再執行`Edit > Clear `，這可以讓細胞之外的區域都清除。再執行一次`Edit › Selection › Make Inverse`，又可以選回原來的細胞範圍。
2.  **定義細胞精確範圍**
    *   執行`Image > Adjust > Threshold..`選擇出細胞的精細範圍，中間有洞沒關係。按下`apply`，此影像會轉成遮罩影像。
    *   針對此遮罩影像，執行`Process › Binary › Fill Holes`，可以將細胞之間的界線填滿，這樣就產生一個細胞精細輪廓的二值化遮罩影像。
    *   針對此遮罩影像，執行`Edit › Selection › Create Selection`，可以將其轉為選區，在 ROI Manager按下**Add**，就可以有單獨一個細胞的ROI。可以點擊 `Rename...` 將其命名為 `Cell-1`。

### 3. 定義**細胞質**區域

1. 在ROI Manager找尋屬於前述細胞的細胞核區域，將之rename為`Nu-1`。
2. 按**ctrl**，**同時**選中**Cell-1**和**Nu-1**，選擇點擊 `More >>` 按鈕，選擇 `XOR`。(XOR是互斥，請理解成「有你就沒有我，有我就沒有你」)
3. 這會產生一個新的 ROI，其形狀就像一個甜甜圈，這就是我們需要的**細胞質區域**。
4. 將這個新的 "甜甜圈" ROI 也加入manager，並命名為 `Cyto-1`。
5. 你可以選中`Cyto-1`之後，執行`Edit › Selection › Create Mask`，就可以看見這個甜甜圈形狀的細胞質。

現在，我們的 ROI manager中應該至少有三個 ROI：`Nu-1`、`Cell-1` 和 `Cyto-1`。

## 進行定量分析
你可以針對單一影像的多個ROI進行測量，也可以針對一個stack的每個slice，作多個ROI的測量。

1. 單一影像，多個ROI的測量
    *  同時選取你要測量的ROI，並選擇要測量的影像，按下ROI manager的`Measure`

2. 單一stack，多個ROI的測量
    *  你可以再開啟原始的`Fluorescent Cells.tif`，或是將已經經過背景扣除的三張影像再透過`Image > Color > Merge Channels`或是`Imagew > Stacks > Images to Stack `組合成stack。
    *  在 ROI manager視窗中，選中多個ROI，點擊 `More >>` 按鈕，然後選擇 `Multi Measure`。



# 共定位分析

在完成細胞核、細胞質、細胞區域的 ROI 定義後，我們可以直接進行螢光通道的共定位分析。以下以 ImageJ 內建的 Coloc2 工具為例，說明操作流程與指標解讀。

## 操作步驟

1. **準備影像與 ROI**
    - 前述步驟已將紅色（F-Actin）與綠色（Tubulin）通道分離，並建立細胞、細胞核、細胞質的 ROI。
    - 確認 ROI Manager 中已包含欲分析的區域（如 Cyto-1、Nu-1、Cell-1）。

2. **啟動 Coloc2 分析**
    - 執行 `Analyze > Colocalization Analysis > Coloc 2`。
    - 在 Coloc2 視窗中，分別選擇紅色與綠色通道影像作為 Channel 1 和 Channel 2。
    - 在 Mask/ROI 欄位選擇欲分析的 ROI（例如 Cyto-1）。
    - 設定分析參數（如 Pearson、Manders、Costes、Li 等），可依需求勾選。

3. **執行與結果解讀**
    - 點擊「OK」開始分析。
    - 結果視窗會顯示各項共定位指標數值與相關圖像（散點圖、遮罩、回歸線等）。
    - 數值結果會顯示於 ImageJ Log 視窗，可複製匯入統計軟體或試算表。

## 主要指標簡介

- **Pearson 相關係數**：衡量兩通道像素強度的線性相關性，範圍 -1 ~ +1。+1 表示完全正相關，0 無相關，-1 完全反相關。
- **Manders 分割係數**：分別計算兩通道中共定位像素的螢光量佔總螢光量的比例，範圍 0 ~ 1。越接近 1 表示共定位程度越高。
- **Costes 統計檢定**：評估觀察到的相關性是否顯著高於隨機重疊，P 值 < 0.05 表示共定位具統計意義。
- **Li's ICQ**：衡量像素強度對的共現性，+0.5 完美共定位，0 隨機分佈，-0.5 空間排斥。

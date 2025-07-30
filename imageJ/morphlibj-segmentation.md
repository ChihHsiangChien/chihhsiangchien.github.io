# MorphoLibJ
## 安裝

1. 執行`Help › Update…`，按`Manage update sites`。
3. 搜尋`IJPB-plugins`，按下`Apply`，安裝後重新啟動Fiji。

## 基本原理

**分水嶺(Watershed)演算法**將影像視為一個地形圖，模擬水往低處流的概念，從最低點向外淹水擴展，直到遇到其他區域的擴展，然後形成邊界。為了避免過度分割，通常需要手動或自動生成一些「標記」(種子點)，這些標記代表了每個要分割的物體內部，從這些標記開始淹水。這個過程中，區域（region）會從種子點或最低點開始「長出來」，所以是典型的region growing策略。



在 MorphoLibJ 中，分水嶺方法主要基於**梯度圖**或**距離圖**。



## Classic Watershed
原理請見[官方網頁的圖](https://imagej.net/plugins/classic-watershed)


### 使用方法
Classic Watershed 插件可在任何 2D 和 3D 的灰階影像（8、16 和 32-bit）上運行。
至少需要開啟一張影像才能運行此插件。

#### 參數

*   **Input image**: 要進行淹水的灰階影像，通常是影像的梯度圖。
*   **Mask image (optional)**: 可選的二值影像，與輸入影像維度相同，可用於限制演算法的應用區域。設定為 “None” 則在整個輸入影像上運行。
*   **Use diagonal connectivity**: 選擇此項以允許在對角線方向上進行淹水（2D 為 8-connectivity，3D 為 26-connectivity）。
*   **Min h**: 開始淹水的最小灰階值（預設為影像類型的最小值）。
*   **Max h**: 淹水達到的最大灰階值（預設為影像類型的最大值）。

#### 輸出

*   標記影像 (Labeled image)，包含最終的集水盆地（整數值 1, 2, 3…）和分水嶺線（值為 0）。

### 實作

執行此Macro觀看範例，適當前處理可避免**過度分割**

```ijm
run("Blobs (25K)");
run("Invert LUT");
run("Invert");
rename("origin");


run("Classic Watershed", "input=origin mask=None use min=0 max=150");
run("3-3-2 RGB");
rename("直接watershed");



selectWindow("origin");
run("Duplicate...", "title=高斯模糊");
run("Gaussian Blur...", "sigma=3");
run("Classic Watershed", "input=高斯模糊 mask=None use min=0 max=150");
run("3-3-2 RGB");
rename("高斯後watershed");

run("Tile");
```

## Marker-controlled Watershed
[官方網頁說明](https://imagej.net/plugins/marker-controlled-watershed)
從特定的種子點或標記開始淹水的過程，標記點通常選擇影像梯度圖的局部最小值。

### 使用方法

至少需要兩張影像才能運行：

*   **輸入影像 (Input image)**: 一張 2D 或 3D 的灰階影像，用於進行淹水模擬，通常是影像的**梯度圖**。
*   **標記影像 (Marker image)**: 一張與輸入影像維度相同的影像，其中包含作為種子點的標記。這些標記是像素的連通區域，每個區域都有不同的標籤值。它們通常對應輸入影像的局部最小值，但也可以任意設定。

此外，還可以選擇性地加入第三張影像：

*   **遮罩影像 (Mask image)**: 一張二值影像，維度與輸入和標記影像相同，可用於限制演算法的應用區域。若設定為 “None”，則演算法將在整個輸入影像上運行。

#### 參數
*   **緊湊度 (Compactness)**: 此參數用來控制分割結果中各區域（集水盆地）的形狀規則性，數值範圍從 0 開始。
*   **二值標記 (Binary markers)**: 如果您的標記影像是二值的（即物件像素值相同，未經標記），請勾選此項，插件會自動為其進行標記。
*   **計算分水嶺線 (Calculate dams)**: 勾選此項以計算並產生分水嶺線。
*   **使用對角線連通 (Use diagonal connectivity)**: 勾選此項以允許在對角線方向上進行淹水。


#### 參數詳解

##### 1. 緊湊度 (Compactness)

 `Compactness = 0` (傳統分水嶺)

- **行為：** 執行傳統的、完全基於梯度（影像邊緣）的分水嶺演算法。
- **結果：** 分割線會嚴格沿著影像中梯度最強的路徑，因此產生的區域形狀可能非常不規則，完全由影像內容決定。

 `Compactness > 0` (緊湊分水嶺)

- **行為：** 啟用「緊湊分水嶺」演算法，在分割過程中加入形狀約束，鼓勵產生的區域更圓滑、更緊湊。
- **結果：**
    - **值越大，形狀越規則：** 較大的緊湊度值會使分割區域更接近圓形或凸形，邊界更平滑。
    - **抑制雜訊：** 對於有雜訊或邊緣不清晰的影像，適當的緊湊度有助於獲得更連貫、視覺上更平滑的分割結果。
    - **潛在風險：** 過高的值可能導致過度平滑，使分割結果失去物件的真實細節，甚至將相鄰物件錯誤地合併。

選擇最佳值通常需要反覆試驗，原則如下：

1.  **從 `0` 開始：** 先以傳統分水嶺的結果作為基準，觀察區域是否過於破碎或邊緣鋸齒嚴重。
2.  **逐步增加：** 如果物件預期是規則形狀，或結果受雜訊影響嚴重，可逐步增加緊湊度（如 0.1, 0.5, 1.0...），並觀察變化。
3.  **考慮影像特性：**
    - **高雜訊影像：** 適當的緊湊度（如 0.5 ~ 2.0）有助於消除假邊緣。
    - **複雜形狀物件：** 若物件本身形狀不規則，應使用較小的緊湊度，以避免過度簡化其真實輪廓。

---

##### 2. 計算分水嶺線 (Calculate Dams)

此功能決定是否在分割出的不同區域之間產生明確的「分水嶺線」（Dams）。

- **集水盆地 (Catchment Basins):** 影像中的同質區域（如物件內部）。
- **分水嶺線/壩 (Watershed Lines/Dams):** 分隔不同盆地的山脊，對應影像中梯度最高的邊界。

**啟用 "Calculate Dams"**

- **結果：** 在不同區域之間會產生一條單像素寬的邊界線（即「壩」）。
- **優點：**
    - **視覺化邊界：** 清晰地顯示每個物件的精確輪廓。
    - **區分相鄰物件：** 明確劃分緊密相鄰的物件。
    - **利於後續分析：** 方便進行周長測量或拓撲分析。

**禁用 "Calculate Dams"**

- **結果：** 只會產生一個個填滿顏色的區域，區域之間直接相鄰，沒有邊界線。
- **優點：**
    - **簡化數據：** 當你只關心每個區域的標籤和屬性（如面積、平均強度），而不需要邊界線時，結果更簡潔。
    - **避免額外像素：** 分割結果只包含物件本身，沒有額外的邊界線像素。


#### 輸出

*   一個標籤影像 (Labeled image)，其中包含分割出的集水盆地，以及（可選的）分水嶺線（dams）。
### 實作

執行以下Macro

```ijm
run("Blobs (25K)");
run("Invert LUT");
run("Duplicate...", "title=origin");


selectImage("origin");
run("Duplicate...", "title=edge");
run("Gaussian Blur...", "sigma=3");
run("Find Edges");


selectImage("origin");
run("Duplicate...", "title=binary");
run("Gaussian Blur...", "sigma=3");
setAutoThreshold("Triangle dark");
run("Convert to Mask");


selectImage("binary");
run("Duplicate...", "title=point");
run("Ultimate Points");


run("Marker-controlled Watershed", "input=edge marker=point mask=None compactness=0 use");
run("glasbey on dark");
run("Label Map to ROIs", "connectivity=C4 vertex_location=Corners name_pattern=r%03d");

run("Tile");



```

## Interactive Marker-controlled Watershed
互動式標記控制的分水嶺分割

### 使用方法
1.  在影像上使用 **Point Tool**、**Multi-point Tool** 或任何選取工具，標示出您感興趣的物件（作為「種子點」）。
2.  將這些標記加入 **ROI Manager** (`Analyze > Tools > ROI Manager...`)。
3.  在 ROI Manager 視窗中，**選取**所有要作為種子點的 ROI。
4.  執行`Plugins › MorphoLibJ › Segmentation › Interactive Marker-controlled Watershed`

---

### 實作

範例：使用[維管束圖片](img/維管束.tif)進行細胞分割。[圖片來源](https://www.researchgate.net/figure/Transverse-sections-of-mature-root-and-hypocotyl-regions-from-seedlings-7-days-after_fig4_27695560)

開啟維管束圖片後，執行Macro

```ijm
run("Duplicate...", "title=1");
run("8-bit");
run("Gaussian Blur...", "sigma=1");
run("Gaussian Blur...", "sigma=1");
run("Subtract Background...", "rolling=10 light sliding");
run("Invert");
run("Duplicate...", "title=2");
setAutoThreshold("Triangle");
//setThreshold(0, 9);
run("Convert to Mask");
run("Duplicate...", "title=3");
run("Distance Map");
run("Find Maxima...", "prominence=1 output=[Point Selection]");
run("ROI Manager...");
roiManager("Add");
selectImage("1");
roiManager("Select", 0);
run("Interactive Marker-controlled Watershed");

```

## Morphological Segmentation 形態學分割

Morphological Segmentation結合了形態學操作（如擴展最小值、形態學梯度）與分水嶺演算法，能夠對各種類型（8、16、32 位元）的 2D 和 3D 灰階影像進行高效分割。

### 使用方法
1.  **開啟影像**：在 Fiji 中開啟任何8-bit影像（單一 2D 影像或 3D 堆疊）。
2.  **啟動插件**：執行 `Plugins > MorphoLibJ > Segmentation > Morphological Segmentation`。
3.  **設定參數**：在插件視窗中，依序設定「輸入影像」、「分水嶺分割」的參數。
4.  **執行分割**：點擊 `Run` 按鈕。
5.  **檢視與匯出**：在「結果面板」中選擇不同的顯示方式，並可將結果匯出為新影像。
6.  **後處理**：如有需要，可使用「後處理面板」的功能對分割結果進行微調。

在主畫布中可以隨時平移、縮放或滾動切片，就像操作一般 ImageJ 視窗一樣。

---

### 參數

#### 1. 輸入影像

-   **邊界影像 (Border Image):** 如果您的輸入影像**已經是**經過邊緣檢測或梯度計算的結果（例如，物件邊界是亮線），請選擇此項。

-   **物件影像 (Object Image):** 如果您的輸入影像是原始影像，其中物件本身比背景亮或暗，請選擇此項。選擇後會啟用以下選項：
    -   **梯度類型 (Gradient Type):** 選擇計算梯度的演算法。
    -   **半徑 (Radius):** 設定計算梯度時的半徑（以像素為單位）。
    -   **顯示梯度影像 (Display gradient image):** 勾選後，主畫布將顯示計算出的梯度影像，方便觀察。


#### 2. 分水嶺分割

設定分割演算法的核心參數。

-   **容差 (Tolerance):**
    -   **作用：** 控制搜尋區域最小值（Regional Minima）的強度動態範圍。這是影響分割結果最重要的參數。
    -   **效果：**
        -   **增加容差值**：會合併更多相似區域，減少最終分割出的物件數量（防止過度分割）。
        -   **減少容差值**：對強度變化更敏感，會產生更多的分割物件。
    -   **注意：** 此值與影像的位元深度密切相關。
        -   **8-bit 影像 (0-255):** 建議從 `10` 開始嘗試。
        -   **16-bit 影像 (0-65535):** 應大幅增加，例如 `2000`。
-   **計算壩線 (Calculate dams):**
    -   **勾選 (預設):** 在分割出的不同物件之間產生單像素寬的邊界線（即「壩」）。
    -   **不勾選:** 產生填滿顏色的區域，物件之間直接相鄰，沒有邊界線。

-   **連通性 (Connectivity):**
    -   **作用：** 定義像素的鄰域關係。
    -   **選項：** 2D 可選 4 或 8；3D 可選 6 或 26。
    -   **建議：** 選擇非對角線的連通性（2D用`4`，3D用`6`）通常能產生更圓滑、自然的物件輪廓。

---

#### 3. 結果

此面板在執行分割後啟用，用於視覺化與匯出結果。

-   **顯示 (Display):** 提供四種視覺化模式：
    -   **疊加盆地 (Overlaid basins):** 在原始影像上以不同顏色疊加分割出的物件。
    -   **疊加壩線 (Overlaid dams):** 在原始影像上以紅色疊加分水嶺邊界線。
    -   **集水盆地 (Catchment basins):** 產生一張新的彩色標籤影像，每個物件有獨立的顏色。
    -   **分水嶺線 (Watershed lines):** 產生一張新的二值影像，顯示黑色的邊界線與白色的物件。

-   **顯示結果疊加層 (Show result overlay):** 用於快速開關疊加層的顯示。
-   **建立影像按鈕 (Create image button):** 將當前畫布中顯示的結果（包含疊加層）儲存為一張新的影像。

---

#### 4. 後處理 Post-processing 

-   **合併標籤 (Merge labels):**
    -   **用途：** 手動合併被過度分割的區域。
    -   **操作：** 使用 **手繪選取工具** 或 **點工具** 選取多個想合併的物件，然後點擊此按鈕。第一個被選中的物件顏色將應用於所有被選物件。

> **多切片操作提示：** 在 3D 堆疊中，可使用「點工具」並按住 `SHIFT` 鍵，在不同切片上點選要合併的物件。

-   **隨機顏色 (Shuffle colors):**
    -   **用途：** 當相鄰的兩個物件被分配到相似顏色，難以區分時，點擊此按鈕可隨機重新分配所有顏色，以利觀察。

### 實作
使用範例影像`Blobs`進行分割，Tolerance設定35。

## Distance Transform Watershed

一種分離二值影像中相接觸物件的經典方法是利用**距離變換(distance transform)**和**分水嶺法(watershed method)**。其想法是在重疊物件的中心盡可能遠的地方建立邊界。這種策略對圓形物件效果很好，被稱為**距離變換分水嶺 (Distance Transform Watershed)**。它包括計算二值影像的距離變換，將其反轉（因此影像最暗的部分是物件的中心），然後使用原始影像作為遮罩對其應用分水嶺。在我們的實作中，我們包含了一個使用擴展最小值的分水嶺選項，以便使用者可以控制物件分裂和合併的數量。

能分離相互接觸的二值物體 (如細胞、顆粒)，有效處理黏連物體，分割線位於物體間距最遠處。



MorphoLibJ 在 `Plugins › MorphoLibJ › Binary Images…` 選單下提供演算法：

### Distance Transform Watershed
`Distance Transform Watershed` 需要一個 2D 8-bit 的二值影像來運行。若是如此，將會彈出如下的對話框：


插件參數分為距離變換和分水嶺選項：

#### 距離圖選項 (Distance map options):
- **Distances**: 允許選擇一組預定義的權重，用於計算距離變換（使用歐幾里得度量的Chamfer近似）。這些權重會影響最終結果中邊界的位置，特別是形狀。選項包括：
    - Chessboard (1,1): 所有鄰居的權重均為1。
    - City-Block (1,2): 正交鄰居權重為1，對角鄰居權重為2。
    - Quasi-Euclidean (1,1.41): 正交鄰居權重為1，對角鄰居權重為√2。
    - Borgefors (3,4): 正交鄰居權重為3，對角鄰居權重為4（3x3遮罩下歐幾里得距離的最佳近似）。
    - Weights (2,3): 正交鄰居權重為2，對角鄰居權重為3。
    - Weights (5,7): 正交鄰居權重為5，對角鄰居權重為7。
    - Chessknight (5,7,11): 正交鄰居權重為5，對角鄰居權重為7，馬步（chess-knight moves）權重為11（5x5遮罩下最佳近似）。
- **Output type**: 16 或 32-bit，用於以短整數或浮點數精度計算距離。
- **Normalize weights**: 指示是否應將結果距離圖標準化（將距離除以第一個Chamfer權重）。

#### 分水嶺選項 (Watershed options):
- **Dynamic**: 與 Morphological Segmentation 插件中的動態值相同，這是用於在反向距離變換影像中搜索區域最小值的強度動態範圍。基本上，增加此值會導致更多物件合併，減少此值則會導致更多物件分裂。
- **Connectivity**: 像素連通性（4 或 8）。選擇非對角線連通性（4）通常能產生更圓滑的物件。

最後，可以點擊 **Preview** 選項來視覺化目前插件配置的結果。

**結果**：2D 32位元標籤影像（每個物件一個索引值）。

### Distance Transform Watershed (3D)
`Distance Transform Watershed 3D` 需要一個 3D 8-bit 的二值影像來運行。若是如此，將會彈出如下的對話框：

參數與 2D 版本相同，但部分參數已修改為對 3D 影像：

#### 距離圖選項 (Distance map options):
- **Distances**: 現在可用的選項包括：
    - Chessboard (1,1,1): 所有鄰居的權重均為1。
    - City-Block (1,2,3): 正交鄰居權重為1，對角鄰居權重為2，立方體對角鄰居權重為3。
    - Quasi-Euclidean (1,1.41,1.73): 正交鄰居權重為1，對角鄰居權重為√2，立方體對角鄰居權重為√3。
    - Borgefors (3,4,5): 正交鄰居權重為3，對角鄰居權重為4，立方體對角鄰居權重為5（3x3x3遮罩下歐幾里得距離的最佳近似）。
- **Output type**: 16 或 32-bit，用於以短整數或浮點數精度計算距離。
- **Normalize weights**: 指示是否應將結果距離圖標準化（將距離除以第一個Chamfer權重）。

#### 分水嶺選項 (Watershed options):
- **Dynamic**: 與 2D 版本相同，這是用於在反向距離變換影像中搜索區域最小值的強度動態範圍。基本上，增加此值會導致更多物件合併，減少此值則會導致更多物件分裂。
- **Connectivity**: 體素連通性（6 或 26）。選擇非對角線連通性（6）通常能產生更圓滑的物件。

**結果**：3D 32位元標籤影像（每個物件一個索引值）。


### 實作
使用[維管束圖片](img/維管束.tif)進行細胞分割。[圖片來源](https://www.researchgate.net/figure/Transverse-sections-of-mature-root-and-hypocotyl-regions-from-seedlings-7-days-after_fig4_27695560)

開啟維管束檔案後，執行以下Macro
```ijm
run("Duplicate...", "title=binary")

run("8-bit");
run("Gaussian Blur...", "sigma=2");
setAutoThreshold("Triangle dark");
run("Convert to Mask");
run("Distance Transform Watershed", "distances=[Quasi-Euclidean (1,1.41)] output=[32 bits] normalize dynamic=1 connectivity=4");
run("glasbey on dark");
run("Label Map to ROIs", "connectivity=C4 vertex_location=Corners name_pattern=r%03d");
run("ROI Manager...");

run("Tile");

```

# 影像處理決策
[教學影片](https://youtu.be/CWK6-s0Eq8Q)
## 流程

```{.mermaid}
flowchart TD
    A[選擇合適通道]-->B[空間與強度校正]
    B-->C[降噪]
    C-->D[背景分離]
    D-->E[對比增強]    
    E-->F[邊緣偵測]
    F-->G[分割]
    G-->H[形態學處理]
    H-->I[特徵擷取]
    I-->J1[追蹤]    
    I-->J2[分類]    
    
```

前處理的目的是提升影像品質、減少干擾，使後續任務更準確、更穩定、更容易自動化。

| 類型 | 目的 | 常見方法 |
|:---|:---|:---|
| 標準化 | 統一輸入格式、大小或色階 | Resize、Normalize、Color Conversion|
| 影像校準 | 幾何對齊、尺度統一、畸變矯正 | Registration、Rescale|
| 降噪 |  去除感測器雜訊或背景干擾 | Gaussian、Median|
| 背景分離 | 補償光照不均或不良背景 | Rolling Ball、Subtract Background|
| 對比增強 | 拉大前景與背景的強度差異 | CLAHE、Histogram Equalization、Gamma|
| 邊緣偵測 | 讓特徵變得更明顯 | Edge enhancement、Top-hat、Morphology|


# 流程說明

## 幾何轉換

*   **旋轉：** `Image > Transform > Rotate...`
*   **縮放：** `Image > Transform > Scale...`
*   **翻轉：** `Image > Transform > Flip Horizontally / Flip Vertically`
*   **[影像對位](image-registration.md)**
*   **[空間校正](spatial-correction.md)**
*   **[強度校正](intensity-calibration.md)**

## 1.彩色影像轉灰階

RGB 或多通道影像，需要先轉換為單一的灰階影像才能進行後續處理。

*   **策略：**
    *   選擇一個對比度最高、目標最清晰的通道進行轉換（例如，DAPI 染核選藍色通道）。
    *   轉換成不同的色彩空間，例如`HSB Stack`、`Lab Stack`，觀察不同通道的差異。
*   **ImageJ 操作：**
    *   `Image > Type > 8-bit` 或 `Image > Type > 16-bit`：將彩色影像轉換為灰階。
    *   `Image > Color > Split Channels`：將多通道影像分離，以便選擇最佳通道。
---

## 2.降噪
*   如果影像出現明顯隨機雜訊（如 椒鹽雜訊salt-and-pepper、感光雜訊），應使用降噪處理。
*   如果雜訊輕微或會影響細節邊緣，則可略過此步驟或使用更小的模糊範圍（sigma 較小的 Gaussian）。

### 平均濾波器
*   imagej有兩處可以做平均濾波器
    *   `Process › Smooth`：固定3X3範圍
    *   `Process > Filters > Mean...`：可以指定範圍
*   針對每個像素，它會計算其周圍特定範圍內所有像素的平均值來取代。
*   能減少**隨機雜訊**，例如高斯雜訊 (Gaussian Noise) 或其他均勻分佈的隨機雜訊。
*   也因為會對所有像素進行平均，無論這些像素是雜訊還是影像的重要邊緣，所以會導致**邊緣變得模糊不清**。對於細節豐富的影像，過度使用平均濾波可能會損失重要的資訊。

### 中值濾波器
*   imagej有兩處可以做中值濾波器
    *   `Process › Noise › Despeckle`：固定3X3範圍
    *   `Process > Filters > Median...`：可以指定範圍
*   去除**椒鹽雜訊**(影像中隨機分佈的亮點像鹽粒，暗點像胡椒)
*   影像中包含突兀的、孤立的亮點或暗點時使用
*   在需要在不顯著模糊重要特徵或邊緣的情況下清理影像時使用。

### 高斯模糊
*   imagej操作：
    *   `Process > Filters > Gaussian Blur...`
*   利用高斯函數（一種鐘形曲線）來平滑影像並減少高斯雜訊 (Gaussian Noise)。
*   高斯雜訊是一種常見的**隨機雜訊**，其分佈符合常態分佈（高斯分佈），通常表現為像素強度上的細微**隨機**波動，使影像看起來有點模糊或顆粒感。
*   **高斯濾波器**透過計算像素及其鄰近像素的加權平均值來實現平滑。權重的大小由高斯函數決定，這意味著離中心像素越近的像素對新像素值的貢獻越大，而越遠的像素貢獻越小。這種加權平均的方式產生了非常自然且平滑的模糊效果。
*   半徑 (Sigma，σ)：半徑值越大，模糊程度越高，影像的平滑效果也越明顯。反之，半徑值越小，模糊程度越低。


### 實作
執行以下產生噪點影像的Macro(或手動產生影像)，產生三種不同雜訊的圖片，再圈選區域進行**降噪處理**，然後使用直方圖觀察處理前後的差異。

* 產生**高斯雜訊**的圖片
    *   執行`File > New > Image...`，產生白色的8-bit影像。
    *   執行`Process › Noise › Add Noise`，這會在畫面產生**高斯雜訊** (平均值0，標準差25)，[參見](https://imagej.net/ij/docs/menus/process.html#noise)。
    *   如果要指定高斯的標準差可以用**Add Specified Noise...**
* 產生**椒鹽雜訊**的圖片
    *   執行`File › Open Samples › Clown`，再將此影像轉為 8-bit，執行`Image › Type › 8-bit`
    *   執行`Process › Noise › Salt and Pepper`，這會產生**椒鹽雜訊**(隨機使 2.5%的像素變為黑色，2.5變為白色)

**Macro**

```ijm
newImage("高斯雜訊", "8-bit white", 512, 512, 1);
run("Add Noise");
newImage("更多高斯雜訊", "8-bit white", 512, 512, 1);
run("Add Specified Noise...", "standard=80");
run("Clown");
run("8-bit");
run("Salt and Pepper");
rename("椒鹽雜訊");
```

---
## 3.背景分離（前景/背景分割）
1.  背景是拍攝的雜訊或你不需要的物件。
2.  將背景分離得到前景的基本原理是**整張圖片減去背景圖**。
3.  減去背景的方法是`Process > Image Calculator...`，選擇原始影像與背景影像，運算方式選 `Subtract`
4.  如何得到背景圖？有以下的幾種方式
    1.  拍攝一張沒有細胞或沒有染劑的影像
    2.  用一個stack的系列影像進行平均產生背景圖。假設物體分布隨機，將這些影像進行**平均**後，就會呈現背景光照分布。
    3.  用演算法直接算出背景影像，直接用 `Process > Subtract Background...`。原理我們在下方的產生實作影像後來說明。

### 實作-靜態建模背景
#### 產生實作影像
請執行以下Macro，這會產生三張圖片，模擬的是本來有**原細胞**的影像，在一個不平均的光場(**原光場**)照明，並且伴隨著**取樣雜訊**，得到了**待處理影像**。你的目標就是從**待處理影像**還原得到**原細胞**這張圖的樣子。

```ijm
width = 512;
height = 512;

centerX = width/2;
centerY = height/2;


newImage("原光場", "32-bit black", width, height, 1);
sigma = 200;
for (y = 0; y < height; y++) {
for (x = 0; x < width; x++) {
    dx = x - centerX;
    dy = y - centerY;
    value = exp(-(dx*dx + dy*dy)/(2*sigma*sigma));
    setPixel(x, y, value);
}
}
run("8-bit");


newImage("原細胞", "8-bit black", width, height, 1);
for (i = 0; i < 40; i++) {
    x = 20 + random()*480;
    y = 20 + random()*480;
    size = 8 + random()*10;
    setColor(255);
    makeOval(x, y, size, size);
    fill();
}

imageCalculator("Add create", "原光場", "原細胞");
run("Enhance Contrast...", "saturated=0.35 normalize");
run("Add Noise");
run("Gaussian Blur...", "sigma=0.5");
rename("待處理的影像");
run("Tile");
```
#### 觀察影像
1.   我們利用一些工具來觀察這些影像。請點選**原光場**，這是利用高斯函數產生的影像，模擬顯微鏡下產生的不均勻光場。先用直線工具拉一條由最左到最右的直線，然後選擇` Analyze › Plot Profile`。你看到的圖形就是高斯函數。
2.   用` Analyze › 3D Surface Plot`分別觀察三張影像。


#### 分離前景與背景
1.   觀察直方圖會發現這個影像有隨機雜訊，所以先用 `Process > Filters > Gaussian Blur...`去雜訊
2.   以下展示兩種分離背景的方式，所以我們將去雜訊處理後的影像再複製一份，選擇` Image > Duplicate...`。
3.   由於已經有原始的**光場影像**，所以可以直接減去這張影像。使用`Process > Image Calculator...`，選擇原始影像與背景影像，運算方式選 `Subtract`。
4.   選擇剛剛複製後的另外一個去雜訊後影像，執行`Process > Subtract Background...`，設定 rolling ball 半徑。**Subtract Background...**的演算法原理是有一顆特定半徑的球在平面下方滾動，它所接觸的區域就是背景。滾完影像之後，就可以得到一張背景圖。因為要用一顆球在背景下方滾動，所以不可以讓球滾進前進的高峰底部，所以通常會設定球的半徑至少是前景目標半徑的三倍左右。你可以點選**Create Background**，觀察這種演算法算出的背景圖是不是接近**原光場**。
5.   選項中的**Sliding parabolic filter (滑動拋物線濾波器)**會將「滾動球」的概念替換為一個具有相同曲率的滑動拋物面。這個拋物面在影像數據的下方滑動，其頂部的軌跡被用來估計背景，可以處理更大的像素值範圍
    *  拋物面比球體在處理大範圍的影像像素值（例如，16 位元或 32 位元影像，像素值遠大於典型物體大小）
    *  複雜的背景模式
    *  前景物體的形狀或強度不完全符合滾動球的假設時

### 實作-動態建模背景
#### 產生實作影像
執行以下Macro，這會產生一個stack，有一群細胞流動，背景有一些方塊。你的目的是將前景的細胞分離出來
```ijm
// 參數
stackSize = 20;
width = 512;
height = 512;
numCells = 30;
numBoxes = 5;
boxSize = 30;

setBatchMode(true);

// 儲存背景固定位置
fixedX = newArray(numBoxes);
fixedY = newArray(numBoxes);
for (i = 0; i < numBoxes; i++) {
    fixedX[i] = random() * (width - boxSize);
    fixedY[i] = random() * (height - boxSize);
}

// 每個細胞的屬性：位置、半徑、速度
cellX = newArray(numCells);
cellY = newArray(numCells);
cellR = newArray(numCells);
cellDX = newArray(numCells);
cellDY = newArray(numCells);

// 初始位置與屬性
for (i = 0; i < numCells; i++) {
    cellX[i] = random() * (width - 40) + 20;
    cellY[i] = random() * (height - 40) + 20;
    cellR[i] = 8 + random() * 4; // 半徑 8~12
    cellDX[i] = random()*12 - 6;  // 速度 -6 ~ 6
    cellDY[i] = random()*12 - 6;
}

// 建立空 stack
run("New...", "name=細胞流 type=8-bit width="+width+" height="+height+" slices=1 fill=Black");
selectWindow("細胞流");


// 每張 slice
for (s = 0; s < stackSize; s++) {
    newImage("Temp", "8-bit black", width, height, 1);

    // 畫背景固定方塊
    setColor(80);
    for (i = 0; i < numBoxes; i++) {
        makeRectangle(fixedX[i], fixedY[i], boxSize, boxSize);
        run("Fill");
    }

    // 畫細胞
    setColor(200);
    for (i = 0; i < numCells; i++) {
        // 畫圓形細胞
        r = cellR[i];
        makeOval(cellX[i] - r, cellY[i] - r, 2*r, 2*r);
        run("Fill");

        // 更新位置（下一張用）
        cellX[i] += cellDX[i];
        cellY[i] += cellDY[i];

        // 邊界反彈（避免跑出去）
        if (cellX[i] < r || cellX[i] > width - r) cellDX[i] *= -1;
        if (cellY[i] < r || cellY[i] > height - r) cellDY[i] *= -1;
    }

    run("Select None");

    // 貼到主 stack
    run("Copy");
    selectWindow("細胞流");
    run("Add Slice");
    run("Paste");

    // 關閉暫時影像
    selectWindow("Temp");
    close();
}

selectWindow("細胞流");
setSlice(1);
run("Delete Slice");
resetMinAndMax();
setBatchMode(false);

```
1. 從stack產生背景圖片
    1.   選擇**細胞流**的stack，執行` Image › Stacks › Z Project...`
    2.   **Projection type**，有幾種選擇，你可以試試看**Average Instensity**或是**Max Instensity**，然後產生背景圖。

2. 將stack的細胞前景與背景分離
    1.   使用`Process > Image Calculator...`，選擇stack與背景影像，運算方式選 `Subtract`。

---

## 4.對比度增強/亮度均勻化
當影像中細胞與背景的對比過低（灰階值接近），整體偏灰或邊界模糊，將導致無法清楚分辨細胞輪廓。這時可以使用對比度增強的方法，使影像中目標物的邊界更清晰，提升後續分割或量測的效果。

#### 適用情境：
- 細胞邊界灰階與背景差異小
- 整體影像偏灰、不清楚
- 邊緣不明顯，二值化後無法完整區分細胞


#### ImageJ 操作：

| 功能 | 操作路徑 | 說明 |
|------|-----------|------|
| **亮度/對比調整** | `Image > Adjust > Brightness/Contrast...` | 手動調整亮度與對比，適合預覽最佳視覺效果。 |
| **對比度自動增強** | `Process > Enhance Contrast...` | 自動調整直方圖分布，提升對比。可勾選 Normalize 或 Equalize Histogram。 |
| **Gamma 調整** | `Process > Math > Gamma...` | 調整影像的 Gamma 值，讓暗部或亮部更明顯。適用於全灰階影像。 |
| **區域對比增強（CLAHE）** | `Process > Enhance Local Contrast (CLAHE)` | 局部自適應對比增強，適合處理光照不均、背景不平坦的影像。 |

### 調整亮度對比
#### 產生實作影像

請執行以下macro，這會產生一張影像，細胞的像素強度和背景十分接近。

```ijm
newImage("Test", "8-bit black", 512, 512, 1);
setColor(50);   // 背景值
run("Select All");
run("Fill");

setColor(52);   // 細胞值
makeOval(200, 200, 100, 100);
run("Fill");
run("Select None");

```

執行`Image > Adjust > Brightness/Contrast...`，調整各種參數按下apply之後，會改變像素的**強度值**

### 對比度增強
執行 `Process > Enhance Contrast...` 是調整影像對比度的常用方法。

#### Saturated Pixels
這個參數設定了在自動拉伸對比度時，允許多少百分比的像素被「飽和」（即變成純黑0或純白255）。預設值（如0.35%）會忽略最亮和最暗的一小部分像素，避免極端值過度影響整體對比度，讓結果更貼近視覺感受。

#### 選項分析與適用情境

在 `Enhance Contrast` 對話框中，主要有 `Normalize` 和 `Equalize Histogram` 兩個勾選框。不同的組合適用於不同的分析需求。

| 選項組合 | 行為 | 改變數據？ | 主要用途 |
|:---|:---|:---|:---|
| **不勾選** | 僅改變顯示 (LUT)，線性視覺增強 | 否 (除非按 Apply) | 安全的初步觀察，保留原始數據 |
| **勾選 Normalize** | 線性拉伸灰階值至全範圍 | 是 | 增強整體對比，為分割做準備 |
| **勾選 Equalize Histogram** | 非線性重排灰階值，使直方圖平坦化 | 是 | 強化局部細節與紋理，不適用於強度定量 |


**情境一：不勾選任何選項 (預設)**

*   **行為：**
    *   **僅視覺增強**：只改變影像的查找表 (Look-Up Table, LUT)，讓影像在螢幕上看起來對比度更高。
    *   **不改變原始數據**：除非你按下 `Apply` 按鈕，否則影像的實際像素值（灰階值）完全不變。
    *   基於 `Saturated pixels` 百分比進行線性拉伸，但範圍不一定會擴展到完整的 0-255。
*   **適用情境：**
    *   **初步觀察與檢視**：當你只想「看得更清楚一點」來判斷影像品質或尋找特徵，但不想冒險修改原始數據時。
    *   **保留數據完整性**：在進行任何定量分析之前，這是最安全的視覺化方法，因為它保證了後續測量的數據是原始、未經修改的。

**情境二：勾選 `Normalize`**

*   **行為：**
    *   **線性拉伸至全範圍**：將影像中現有的最低灰階值映射為0，最高灰階值映射為255（以8-bit為例），中間的灰階值進行等比例的線性拉伸。
    *   **改變原始數據**：此操作會直接修改影像的像素值。
    *   **保持相對亮度**：雖然像素值改變了，但像素之間的相對亮度關係保持不變。
*   **適用情境：**
    *   **準備進行分割**：當影像整體偏暗或灰濛濛時，`Normalize` 可以有效拉開前景與背景的對比，讓後續的閾值分割（Thresholding）更容易設定和執行。
    *   **標準化多張影像**：在批次處理中，對每張影像進行 Normalize 可以使其具有相似的對比度範圍，增加分析的一致性。

**情境三：勾選 `Equalize Histogram`**

*   **行為：**
    *   **非線性轉換**：重新分佈影像的像素灰階值，使得直方圖（Histogram）盡可能變得平坦。這意味著每個灰階級別的像素數量會趨於一致。
    *   **改變原始數據**：此操作會大幅度、非線性地修改像素值。
    *   **強化局部細節**：能顯著增強原本對比度極低的區域的細節，讓暗部或亮部的紋理變得清晰可見。
*   **適用情境：**
    *   **紋理分析與特徵觀察**：當你關心的不是絕對的灰階值，而是物體的紋理、邊緣等局部特徵時，此方法非常有效。
    *   **應謹慎用於定量分析**：由於它會徹底改變像素的原始分佈和相對關係，不建議使用在需要測量強度絕對值的定量分析。



### Gamma

執行 `Gamma...` 時，會對影像中每個像素 `p` 套用以下公式：

\[
f(p) = \left( \frac{p}{255} \right)^\gamma \times 255
\]

- γ（Gamma）值範圍：0.1 ~ 5.0
- 當 γ < 1：亮部拉升、暗部壓縮 → 強調暗區細節  
- 當 γ > 1：亮部壓縮、暗部拉升 → 強調亮區細節  
- 適用於 8-bit、16-bit 及 RGB 圖像  
  - RGB 圖像會對三個色頻分別套用此轉換  
  - 對 16-bit 影像則以影像的 min/max 值做標準化處理（非255）
### CLAHE
對傳統 Histogram Equalization（HE，直方圖均衡） 的改進

|方法 |	原理簡述|
| :-----| :---- |
|HE | 將整張影像的直方圖拉平，提升整體對比，但容易產生過度對比或強化雜訊。|
|AHE |	把影像切成小區塊（局部），各自做 HE，改善區域對比，但更容易過強或放大雜訊。|
|CLAHE | 在 AHE 基礎上加入 對比限制，抑制雜訊放大，效果更穩定自然。|

#### 運作流程：
1.   將影像切成小區塊（tiles），例如每個 tile 是 8×8、16×16 pixels。
2.   每個 tile 各自進行直方圖均衡，將灰階分布平均化，提高區域內對比。
3.   加入對比限制（Clip Limit），限制直方圖中的最大頻率，防止某些灰階值過度增強，抑制雜訊。
4.   將不同區塊間進行雙線性插值，避免不同區塊之間出現突兀的邊界，讓整體視覺自然平滑。

#### 適用情況
顯微鏡下光照不均、對比不足、目標邊界不明。

#### 產生實作影像

請執行以下macro，這會產生一個亮度不均勻的影像，然後針對不同的blocksize執行`Process › Enhance Local Contrast (CLAHE)`。

```ijm
setBatchMode(true);

// 建立影像「原光場」
newImage("原光場", "8-bit black", 256, 256, 1);
for (y = 0; y < 256; y++) {
  for (x = 0; x < 256; x++) {
    v = 0.6*(x + y)/2 + 40*sin(x/30.0)*cos(y/45.0);
    if (v < 0) v = 0;
    if (v > 200) v = 200;
    setPixel(x, y, v);
  }
}
run("Gaussian Blur...", "sigma=30");


// 建立影像「原細胞」
newImage("原細胞", "8-bit black", 256, 256, 1);
setColor(255);
gridSize = 5;
spacingX = 256 / gridSize;
spacingY = 256 / gridSize;
radius = 5;
for (i = 0; i < gridSize; i++) {
  for (j = 0; j < gridSize; j++) {
    x = i * spacingX + spacingX / 2;
    y = j * spacingY + spacingY / 2;
    makeOval(x - radius, y - radius, 2 * radius, 2 * radius);
    fill();
  }
}


// 使用影像計算器合成影像
imageCalculator("Add create", "原光場", "原細胞");


// 接著對合成影像做後續處理
selectWindow("Result of 原光場");
run("Enhance Contrast...", "saturated=0.35 normalize");
run("Add Noise");
run("Gaussian Blur...", "sigma=0.5");
rename("待處理的影像");

run("Select None");
resetMinAndMax();

// 解除批次模式，強制刷新並顯示所有視窗
setBatchMode(false);

selectImage("待處理的影像");
run("Duplicate...", "title=127");
selectImage("127");
run("Enhance Local Contrast (CLAHE)", "blocksize=127 histogram=256 maximum=3 mask=*None*");


selectImage("待處理的影像");
run("Duplicate...", "title=63");
selectImage("63");
run("Enhance Local Contrast (CLAHE)", "blocksize=63 histogram=256 maximum=3 mask=*None*");
run("Tile");

selectImage("待處理的影像");
run("Duplicate...", "title=31");
selectImage("31");
run("Enhance Local Contrast (CLAHE)", "blocksize=31 histogram=256 maximum=3 mask=*None*");
run("Tile");

selectImage("待處理的影像");
run("Duplicate...", "title=15");
selectImage("15");
run("Enhance Local Contrast (CLAHE)", "blocksize=15 histogram=256 maximum=3 mask=*None*");
run("Tile");

```
---

## 5.邊緣偵測

ImageJ 內建了一些邊緣檢測的方式，也可以用 `Process > Filters > Convolve...` 自訂卷積核進行各種邊緣偵測。

### 內建方法
*   **Sobel**
    *   內建的`Process > Find Edges` 就是用Sobel kernel做的**梯度**邊緣檢測。
    *   適用情境：找出物體輪廓或分界線，對灰階變化敏感。
    *   是**一階導數邊緣偵測器**，專門用來找出影像中灰階強度「變化最大的區域」——也就是**邊緣**。
    *   計算影像中水平方向（Gx）與垂直方向（Gy）的梯度，然後根據這些梯度來估計邊緣的位置與方向。因此對偵測斜邊或曲邊
    *   在含有雜訊或模糊的影像中，容易誤判邊緣。
*   **Unsharp Mask**
    *   內建：`Process > Filters > Unsharp Mask...`
    *   適用加強邊緣對比，常用於細節強化。    
    *   用模糊來突顯細節。邏輯如下： 原圖 - 模糊圖 = 高頻細節（即邊緣）。
    *   先對影像做「模糊處理」，取得低頻背景，再將原圖減去模糊圖像得到高頻圖像（細節），再乘上Mask Weight（遮罩權重），控制加回多少細節，再加回原圖，產生更清晰、更銳利的影像。


*   **Variance**
    *   內建：`Process > Filters > Variance...`
    *   將每個像素替換為鄰域變異數，可突顯邊緣與紋理，因為邊緣處變異數通常較高。

*   **Laplacian**
    *   ` Plugins › Process › Laplace (3D)` 應用拉普拉斯濾波器，常用於邊緣增強，找細節或斑點。
    *   也可以用 `Process > Filters > Convolve...` 視窗輸入以下任何一種kernel。  
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

## Macro實作

觀察 `Find Edges`、`Unsharp Mask`、`Variance`、`Laplace`、`Bilateral Filter`、`Top Hat`等濾波器進行前處理的效果。

```ijm
run("Blobs (25K)");
run("Invert LUT");

run("Duplicate...", "title=sobel");
run("Find Edges");

selectImage("blobs.gif");
run("Duplicate...", "title=UnsharpMask-10-0.6");
run("Unsharp Mask...", "radius=10 mask=0.6");

selectImage("blobs.gif");
run("Duplicate...", "title=Variance0");
run("Variance...", "radius=0");

selectImage("blobs.gif");
run("Laplace (3D)");
rename("Laplace");

selectImage("blobs.gif");
run("Bilateral Filter", "spatial=10 range=50");
rename("Bilateral");

selectImage("blobs.gif");
run("Duplicate...", "title=topHat50");
run("Top Hat...", "radius=50");

run("Tile");

```

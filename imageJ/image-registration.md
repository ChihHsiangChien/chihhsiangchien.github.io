# 影像對位 (Image Registration): 使用 SIFT 對齊影像堆疊

## 1. 什麼是影像對位 (Image Registration)？

影像對位（或稱影像對齊、配準）是將兩張或多張影像進行空間上的對齊，使得影像中相同的物體或特徵能夠重疊在一起的過程。這在許多科學分析中是至關重要的一步。

**常見應用場景：**

*   **時間序列分析：** 校正活細胞影像中因細胞移動或顯微鏡平台漂移造成的抖動。
*   **連續切片重組：** 將連續的組織切片影像（如病理切片、電顯切片）對齊，以重建 3D 結構。
*   **多模態影像融合：** 將來自不同成像設備的影像（如 MRI 和 PET）對齊，以整合不同來源的資訊。
*   **影像拼接：** 將多個視野的影像無縫拼接成一張大的全景圖。

本章節將介紹如何使用 Fiji 內建的 **Linear Stack Alignment with SIFT** 插件，對一個有位移和旋轉的影像堆疊進行自動對位。

## 2. 準備工作：產生一個測試用的影像stack

為了演示對位的功能，我們首先用一個簡單的 Macro 腳本來產生一個「故意沒對齊」的影像stack。這個腳本會使用`Blobs`這個範例影像檔，利用迴圈不斷地對其進行微小的位移和旋轉，產生一系列連續但抖動的影像。

**Macro 腳本**

將以下程式碼複製到 Fiji 的腳本編輯器 (`File > New > Script...`)，語言選擇 `ImageJ Macro`，然後點擊 `Run`。


```ijm
// 參數設定
n = 10; // 產生幾張圖片
width = 256;
height = 254;

newImage("Stack", "8-bit black", width, height, 1); // 初始化 Stack
selectWindow("Stack");


// 主迴圈
for (i = 0; i < n; i++) {
    run("Blobs (25K)");
    wait(100);
    originalTitle = getTitle();
	/*
	scaleX = 1 + random()*0.4;
	scaleY = 1 + random()*0.4;
	*/
	scaleX = 1 + random()*0.5;
	scaleY = scaleX;
	angle = random()*20 - 10;
	dx = random()*30-15;
	dy = random()*30-15;
    // 計算縮放比例

    run("Scale...", "x=" + scaleX + " y=" + scaleY + " interpolation=Bilinear average process create");
    wait(100);
    scaledTitle = getTitle();
    close(originalTitle);

    // 旋轉
    
    run("Rotate... ", "angle=" + angle + " grid=1 interpolation=Bilinear enlarge");
    
    
    // 平移
    makeRectangle(0, 0, getWidth(), getHeight());
    run("Translate...", "x=" + dx + " y=" + dy);

    // 裁切
    makeRectangle(0, 0, width, height);
    run("Crop");

    // 複製貼入 Stack
    run("Copy");
    selectWindow("Stack");
    run("Add Slice");
    run("Paste");

    // 關閉處理圖
    close(scaledTitle);
}
selectWindow("Stack");
setSlice(1);
run("Delete Slice");
```
執行完畢後，你會得到一個名為 `Misaligned_Stack` 的影像堆疊。用滑鼠滾輪或下方的滑桿來回瀏覽，你會清楚地看到影像有明顯變換。這就是我們要校正的目標。


# 3. 使用 Linear Stack Alignment with SIFT 進行對位

**SIFT (Scale-Invariant Feature Transform)** 是一種強大的電腦視覺演算法，它能在影像中找到獨特的「特徵點」，即使影像經過縮放、旋轉或亮度變化，這些特徵點也能被穩定地識別和匹配。Fiji 的對位插件就是利用這個原理來計算出每張影像之間的轉換關係。

## SIFT 設定視窗參數說明

當您執行 `Plugins > Registration > Linear Stack Alignment with SIFT` 時，會彈出一個設定對話框。以下是其中各項主要參數的詳細說明：

### 1. Scale Invariant Interest Point Detector（尺度不變特徵點偵測器）
SIFT 的第一步是檢測影像中的關鍵特徵點。這些點在不同尺度下都能被穩定地檢測到，因此稱為「尺度不變」。

* **Initial Gaussian blur (px):** `1.60`
    * **意義：** 在尋找特徵點之前，對影像進行初步的高斯模糊，以減少雜訊干擾，使後續的特徵點檢測更加穩定。
    * **數值：** 高斯模糊的標準差。值越大，模糊效果越強。一般值 1.60 是一個經驗值，既能有效降噪，又不會過度模糊影像細節。
* **Steps per scale octave:** `3`
    * **意義：** 為了實現尺度不變性，SIFT 會在影像的不同尺度（大小）上進行特徵點檢測。一個 "octave" 代表影像尺寸減半的一個層級。這個參數決定了在一個 octave 內，進行幾次特徵點檢測。
    * **數值：** 值越大，在一個 octave 內檢查的尺度越多，理論上能找到更多、更精確的特徵點，但計算量也越大。預設值 3 在效率和效果之間取得平衡。
* **Minimum image size (px):** `64`
    * **意義：** SIFT 在建立尺度空間時，會將影像逐步縮小。此參數限制了影像縮放的最小尺寸。
    * **數值：** 如果影像的寬或高小於最小值，則會先放大到最小值再處理。預設值 64 通常適用於大多數影像。
* **Maximum image size (px):** `1024`
    * **意義：** SIFT 在建立尺度空間時，會將影像逐步縮小。此參數限制了影像縮放的最大尺寸。
    * **數值：** 如果影像的寬或高大於最大值，則會先縮小到最大值。預設值 1024 通常適用於大多數影像。

### 2. Feature Descriptor（特徵描述符）
找到特徵點後，SIFT 會為每個點計算一個「描述符」，這個描述符包含了該點周圍區域的梯度資訊，並對旋轉具有不變性。

* **Feature descriptor size:** `4`
    * **意義：** 特徵描述符的大小。SIFT 將特徵點周圍的區域劃分為一個 `size x size` 的網格，預設是 4 x 4。
    * **數值：** 這個值決定了描述符的精細程度。值越大，描述符包含的資訊越多，區分力越強，但也越容易受到局部變形的影響。
* **Feature descriptor orientation bins:** `8`
    * **意義：** 為了實現旋轉不變性，SIFT 會計算特徵點周圍區域的主方向，並將梯度方向量化為若干個 bins。這個參數指定了方向 bins 的數量。
    * **數值：** 預設值 8 將 360 度劃分為 8 個方向區間，每個區間 45 度。
* **Closest/next closest ratio:** `0.92`
    * **意義：** 在特徵點匹配時，SIFT 會尋找在另一張影像中最相似的特徵點。這個參數用於判斷匹配的可靠性。
    * **數值：** 只有當最相似的特徵點與第二相似的特徵點的相似度比例小於這個值時，才認為匹配成功。值越小，匹配越嚴格，誤匹配率越低，但可能也會漏掉一些正確匹配。預設值 0.92 是一個經驗值。

### 3. Geometric Consensus Filter（幾何一致性篩選器）
在找到一組初始的特徵點匹配後，通常還需要一個「幾何一致性篩選器」來排除錯誤的匹配，找到一組符合某種幾何變換關係的匹配點對。

* **Maximal alignment error (px):** `25.00`
    * **意義：** 允許的最大對齊誤差。在擬合幾何變換模型（如仿射變換）時，如果一對匹配點在變換後的距離大於這個值，則認為是誤匹配，會被排除。
    * **數值：** 值越大，允許的誤差越大，可能保留更多匹配點，但也可能引入更多誤匹配。
* **Inlier ratio:** `0.05`
    * **意義：** 內點比例。在擬合幾何變換模型時，SIFT 會計算有多少匹配點符合這個模型（稱為內點，inliers）。如果內點比例小於這個值，則認為匹配失敗。
    * **數值：** 值越小，對匹配點的數量要求越高，對齊結果越可靠。
* **Expected transformation:** `Similarity`
    * **意義：** 預期的變換模型。這個參數指定了要用哪種數學模型來描述影像之間的變換關係。
    * **選項：**
        * `Translation`: 只能校正水平和垂直的位移。
        * `Rigid`: 可以校正位移和**旋轉**。
        * `Similarity`: 可以校正位移、旋轉和**等向縮放**。
        * `Affine`: 可以校正位移、旋轉、縮放和**傾斜/錯切**。這是功能最強大、最靈活的模型。
        * **對於我們的測試案例，因為包含了位移和旋轉，選擇 `Affine` 或 `Rigid` 都可以，`Affine` 更為通用。**

### 4. Output（輸出選項）

* **Interpolate:** ☑️ (勾選)
    * **意義：** 是否在套用幾何變換後進行插值。
    * **效果：** 勾選後，會使變換後的影像更加平滑，減少鋸齒狀的偽影。**建議勾選**。
* **Show info:** ◻️ (未勾選)
    * **意義：** 是否在結果中顯示詳細的對齊資訊。
    * **效果：** 如果勾選，會在 Log 視窗中輸出每張影像的變換矩陣等資訊。
* **Show transformation matrix:** ☑️ (勾選)
    * **意義：** 是否在結果視窗中顯示計算出的變換矩陣。
    * **效果：** 勾選後，會在新的對齊後影像堆疊的視窗標題中顯示變換矩陣，方便查看。

## 操作步驟

1.  確保 `Stack` 是當前作用中的影像視窗。
2.  執行 `Plugins > Registration > Linear Stack Alignment with SIFT`。
3.  會彈出設定對話框，您可以根據上述說明調整參數。
4.  點擊 `OK` 開始執行。插件會計算每張影像與前一張影像的對應關係，並產生一個新的、已對齊的影像堆疊。

# 4. 評估對位結果

對位完成後，你會得到一個新的視窗，標題通常是 `Aligned Stack`。

1.  **直接觀察：** 在新的對齊後影像堆疊上，使用滑鼠滾輪或下方的滑桿來回瀏覽。你會發現，原本的抖動和旋轉幾乎完全消失了。
2.  **動畫比較：**
    * 將原始的stack對齊後的stack視窗並排。
    * 分別在兩個視窗上執行 `Image > Stacks > Start Animation` (或按 `\` 鍵)。
    * 你會非常直觀地看到對位前後的差異。

# 如何觀察影像是否需要對位？
在進行影像對位前，首要的問題是：「如何判斷我的影像堆疊有位移，以及對位後效果好不好？」除了手動瀏覽影像外，我們可以用 Z-投影 (Z-projection) 的方法來客觀、快速地視覺化影像的抖動程度。

### 1. 產生一個僅有平移位移的測試影像堆疊

為了演示這個方法，我們先修改先前的 Macro 腳本，讓它只產生平移位移，移除旋轉和縮放，以模擬常見的顯微鏡平台漂移。

**修改後的 Macro 腳本**

```ijm
// Macro to create a stack with only translational jitter

// Parameters
n = 20; // Number of slices to generate
width = 256;
height = 254;
max_shift = 5; // Maximum pixel shift in x and y

// Initialize the stack
newImage("Shifted Stack", "8-bit black", width, height, 1);
selectWindow("Shifted Stack");

// Main loop to create shifted slices
for (i = 0; i < n; i++) {
    // Open the base image
    run("Blobs (25K)");
    originalTitle = getTitle();

    // Generate random translation values
    dx = random() * max_shift * 2 - max_shift; // Shift between -5 and +5
    dy = random() * max_shift * 2 - max_shift; // Shift between -5 and +5

    // Apply translation
    run("Translate...", "x=" + dx + " y=" + dy + " interpolation=None");

    // Copy the shifted image to the stack
    run("Copy");
    selectWindow("Shifted Stack");
    run("Add Slice");
    run("Paste");

    // Clean up
    close(originalTitle);
}

// Clean up the initial slice
selectWindow("Shifted Stack");
setSlice(1);
run("Delete Slice");
print("Shifted Stack created with " + nSlices() + " slices.");
```
這段腳本會產生一個名為 `Shifted Stack` 的影像堆疊，其中每一張影像都相對於前一張有微小的隨機平移。

### 2. 使用標準差 Z-投影 (Standard Deviation Z-Project) 視覺化位移

這個方法是評估對位的核心技巧。

*   **原理：**
    *   對於一個**完美對齊**的靜態影像堆疊，每個像素點 (x, y) 在所有切片 (Z) 中的灰階值應該是完全相同的。因此，這個像素位置的**標準差 (Standard Deviation)** 會趨近於 0。
    *   對於一個**有位移**的影像堆疊，物體的邊緣會在不同的切片中掃過不同的像素位置。這些被邊緣掃過的像素，其灰階值會劇烈變化（一下是背景的黑色，一下是物體的前景色），因此它們的標準差會非常高。
    *   所以，一張標準差投影圖就能清晰地將「抖動區域」用高亮度標示出來。

*   **操作步驟：**
    1.  選取剛剛產生的 `Shifted Stack` 影像視窗。
    2.  執行 `Image > Stacks > Z Project...`。
    3.  在彈出的對話框中，將 `Projection type` 設定為 `Standard Deviation`。
    4.  點擊 `OK`。

*   **結果觀察：**
    你會得到一張新的灰階影像。在物體的邊緣會出現明亮的「鬼影」或「光暈」，看起來就像甜甜圈的輪廓。這些亮區就代表了在整個堆疊中位移最大的地方。位移越大，這個光暈就越寬、越亮。

### 3. 使用 LUT 增強視覺化效果

為了讓標準差的差異更明顯，我們可以為這張投影圖套上**偽彩色查找表** (LUT)。

1.  選取標準差投影圖。
2.  執行 `Image > Lookup Tables`，並選擇一個對比強烈的 LUT，例如 `Fire`、`Rainbow RGB` 或 `16 Colors`。

套用後，位移最大的區域會被標示為最醒目的顏色（例如紅色或白色），讓你對位移的嚴重程度一目了然。

### 4. 評估對位後的效果

這個方法同樣可以用來驗證對位是否成功。

1.  對原始的 `Shifted Stack` 執行 SIFT 對位，得到 `Aligned Stack`。
2.  對這個 `Aligned Stack` **重複進行一次標準差 Z-投影**。

比較前後兩張標準差投影圖，你會發現：
*   **對位前：** 投影圖有明顯的光暈。
*   **對位後：** 投影圖應該會變得非常暗，幾乎沒有亮區，證明各切片間的位移已被成功校正。

##
1. 請這個顯微鏡下拍攝的紫錦草雄蕊毛的細胞，進行影像對位。
2. 對位後，使用標準差的z投影，並進行套色。

[video](video/cell.mp4)
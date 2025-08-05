# 形態學重建

形態學重建是基於形態學操作（膨脹、腐蝕），但能更精確地保留物件的原始形狀。其核心思想是使用一張「標記影像 (Marker Image)」在另一張「遮罩影像 (Mask Image)」的約束下，進行迭代式的膨脹或腐蝕，直到影像不再變化為止。

## 基本原理

可以將灰階影像想像成一個三維的地形圖，像素的灰階值代表該點的高度。

-   **遮罩影像 (Mask Image):** 通常是我們的**原始影像**。它定義了重建過程的「地形邊界」，也就是像素值所能達到的上限（或下限）。
-   **標記影像 (Marker Image):** 通常是原始影像經過簡單形態學處理（如腐蝕或膨脹）後的結果。它作為重建過程的「起始點」或「種子」。

形態學重建有兩種基本操作：

1.  **膨脹式重建 (Reconstruction by Dilation):**
    -   **過程：** 從「標記影像」開始，反覆進行膨脹操作。
    -   **約束：** 每一次膨脹的結果，其像素值都不能超過「遮罩影像」對應位置的像素值。
    -   **比喻：** 想像從標記影像的「山峰」開始注水，水會向周圍流動（膨脹），但水面高度永遠不能超過遮罩影像（原始地形）的高度。最終，所有能從標記點到達的區域都會被「淹沒」到與原始地形相同的高度。

2.  **腐蝕式重建 (Reconstruction by Erosion):**
    -   **過程：** 從「標記影像」開始，反覆進行腐蝕操作。
    -   **約束：** 每一次腐蝕的結果，其像素值都不能低於「遮罩影像」對應位置的像素值。
    -   **比喻：** 想像將遮罩影像（原始地形）倒過來，然後從標記影像的位置開始向上「填充」，但填充物不能超出原始地形的邊界。

## 應用：優於傳統開/閉運算的濾波

形態學重建最常見的應用是「重建式開運算」和「重建式閉運算」，它們比傳統的開/閉運算更能保留物件的形狀，非常適合用於影像去噪。

### 1. 重建式開運算 (Opening by Reconstruction) - 去除亮點

此操作能移除影像中的小型亮點（地形圖中的「小山峰」），同時完美保留較大物件的形狀和尺寸，不會像傳統開運算那樣造成物件收縮。

-   **步驟：**
    1.  **腐蝕 (Erosion):** 對原始影像（遮罩）進行腐蝕，得到標記影像。這個步驟會壓平或移除所有小於結構元素的亮點（山峰）。
    2.  **膨脹式重建 (Reconstruction by Dilation):** 使用腐蝕後的標記影像，在原始影像的約束下進行膨脹式重建。
-   **結果：** 原始影像中的主要結構會被完整「重建」回來，但那些在第一步被移除的小山峰則無法恢復，從而達到了去除亮點的效果。

### 2. 重建式閉運算 (Closing by Reconstruction) - 填補暗點

此操作能填補影像中的小型暗點或孔洞（地形圖中的「小坑洞」），同時完美保留物件的形狀，不會像傳統閉運算那樣造成物件過度膨脹。

-   **步驟：**
    1.  **膨脹 (Dilation):** 對原始影像（遮罩）進行膨脹，得到標記影像。這個步驟會填滿所有小於結構元素的暗點（坑洞）。
    2.  **腐蝕式重建 (Reconstruction by Erosion):** 使用膨脹後的標記影像，在原始影像的約束下進行腐蝕式重建。
-   **結果：** 原始影像中的主要結構會被「重建」回來，但那些在第一步被填平的小坑洞則無法恢復，從而達到了填補暗點的效果。

---
## 與中值濾波器 (Median Filter) 的比較

雖然形態學重建和中值濾波器（Median Filter）都可以用於影像去噪，但它們的原理和適用情境有顯著差異。下表比較了兩者的主要特點：

| 特性 (Feature) | 形態學重建 (Morphological Reconstruction) | 中值濾波器 (Median Filter) |
|:---|:---|:---|
| **基本原理** | 使用標記影像在遮罩影像的約束下進行迭代式膨脹/腐蝕。 | 將每個像素替換為其鄰域內像素灰階值的中位數。 |
| **形狀保留** | **極佳**。能完美保留大於結構元素的物件輪廓與尺寸，不會造成收縮或變形。 | **良好**，但較大半徑的濾波可能導致物件的尖角被鈍化、邊緣輕微變形。 |
| **去噪機制** | 移除尺寸小於結構元素的亮點（重建式開）或暗點（重建式閉）。 | 有效移除椒鹽式雜訊（Salt-and-pepper noise）等孤立的極端值像素。 |
| **適用情境** | 需要在不影響主要物件形狀的前提下，精確移除特定尺寸的雜訊或小物件。 | 快速去除隨機的亮暗點雜訊，且對邊緣的模糊效應比均值濾波小。 |
| **缺點** | 計算量較大，過程較複雜。 | 對於大片叢集的雜訊效果有限，且可能模糊細微的紋理。 |

---
## 實作
以下 Macro 腳本將演示如何使用形態學重建來移除 `Dot Blot` 範例影像中的亮點與暗點，並與中值濾波器 (Median Filter) 的結果進行比較。



```ijm
run("Dot Blot");
run("Invert");
run("Duplicate...", "title=origin");

/* 
 * 去除亮點
 * 對原始灰階影像進行一次腐蝕（Erosion）。腐蝕會將所有小的山峰消除或變淺，形成一個平滑的底圖。這個平滑後的影像就是你的標記影像。
 */
selectImage("origin");
run("Morphological Filters", "operation=Erosion element=Square radius=2");
rename("erosion-marker");


/*
 * 執行膨脹式重建 (reconstructByDilation)，將腐蝕後的標記影像在原始影像的約束下進行膨脹。這個過程會把標記影像「膨脹」回原始影像的形狀，但那些在腐蝕階段被移除的亮點將無法恢復。
 */
run("Morphological Reconstruction", "marker=erosion-marker mask=origin type=[By Dilation] connectivity=8");
rename("deLightResult");


/*
 * 移除暗點（Pepper Noise）
 * 暗點在灰階影像的地形圖中代表微小的「山谷」。膨脹式重建的「注水」原理正好可以用來填平這些小山谷。
 * 對原始灰階影像進行一次膨脹（Dilation）。膨脹會有效地小的「山峰」（包括亮點）擴大或與其他山峰合併，暗點填平，形成一個平滑的頂圖。這個平滑後的影像就是你的標記影像。
 */
selectImage("origin");
run("Morphological Filters", "operation=Dilation element=Square radius=2");
rename("dilation-marker");

/*
 * 執行腐蝕式重建 (reconstructByErosion)，將膨脹後的標記影像在原始影像的約束下進行腐蝕。這個過程會把標記影像「腐蝕」回原始影像的形狀，但那些在膨脹階段被移除的亮點將無法恢復。
 */

run("Morphological Reconstruction", "marker=dilation-marker mask=origin type=[By Erosion] connectivity=8");
rename("deDarkResult");



/*
 * 結合以上兩者操作連續操作
 * 
*/
 

selectImage("origin");
run("Morphological Filters", "operation=Erosion element=Square radius=2");
rename("erosion-marker");


run("Morphological Reconstruction", "marker=erosion-marker mask=origin type=[By Dilation] connectivity=8");
rename("deLightResult");


selectImage("deLightResult");
run("Morphological Filters", "operation=Dilation element=Square radius=2");
rename("dilation-marker");

run("Morphological Reconstruction", "marker=dilation-marker mask=deLightResult type=[By Erosion] connectivity=8");
rename("result");

// 新增中值濾波器做比較
selectImage("origin");
run("Duplicate...", "title=median-result");
run("Median...", "radius=2");


// 觀察原始影像和兩種處理後影像的差異
imageCalculator("Subtract create 32-bit", "origin","result");
selectImage("Result of origin");
rename("Diff-Reconstruction");
setMinAndMax(-100, 100);
run("3-3-2 RGB");

imageCalculator("Subtract create 32-bit", "origin","median-result");
selectImage("Result of origin");
rename("Diff-Median");
setMinAndMax(-100, 100);
run("3-3-2 RGB");

run("Tile");

```
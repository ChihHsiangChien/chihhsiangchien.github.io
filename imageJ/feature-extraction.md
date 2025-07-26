# 特徵擷取

*   `Analyze > Analyze Particles...`
*   在二值影像上偵測獨立的物件 (粒子/細胞)。
*   可設定大小 (Size) 和圓形度 (Circularity) 範圍來篩選目標。
*   測量參數包括：面積 (Area)、中心點 (Centroid)、周長 (Perimeter)、圓形度、長短軸等。
*   勾選 `Display results`, `Clear results`, `Summarize`, `Add to Manager` 等選項控制輸出。


## 認識測量參數 (Set Measurements)

在執行 `Analyze > Measure` 或 `Analyze Particles...` 之前，我們可以透過 `Analyze > Set Measurements...` 指令來決定結果表格中要顯示哪些測量項目。了解這些參數的意義，能幫助你選擇最適合研究目的的量化指標。

以下是常用參數的說明：

### 基本與強度測量

| 參數 (選項) | 結果欄位 | 說明 |
|:---|:---|:---|
| **Area** | `Area` | 選區的面積。如果影像經過空間校正，單位會是物理單位（如 cm²），否則為像素平方 (pixels²)。 |
| **Mean Gray Value** | `Mean` | 選區內所有像素的平均灰階值。若經過強度校正，則單位為校正後的物理單位。對於RGB影像，會先轉換為灰階再計算。 |
| **Standard Deviation** | `StdDev` | 選區內像素灰階值的標準差，反映了亮度的離散程度。 |
| **Min & Max Gray Level** | `Min`, `Max` | 選區內的最小與最大灰階值。 |
| **Modal Gray Value** | `Mode` | 選區內出現頻率最高的灰階值（眾數），對應直方圖的最高峰。 |
| **Median** | `Median` | 選區內像素灰階值的中位數。相較於平均值，較不受極端值（雜訊點）影響。 |
| **Integrated Density** | `IntDen`, `RawIntDen` | **積分密度**。`IntDen` = `Area` × `Mean`；`RawIntDen` = 選區內所有像素的灰階值總和。在螢光定量等分析中非常重要，能反映選區內訊號的總量。 |
| **Skewness** | `Skew` | **偏度**。衡量灰階分佈的不對稱性。正偏態表示分佈偏向左側（低亮度），負偏態表示偏向右側（高亮度）。 |
| **Kurtosis** | `Kurt` | **峰度**。衡量灰階分佈的峰態陡峭程度。高聳的峰態有較高的峰度值。 |

### 形狀與位置測量

| 參數 (選項) | 結果欄位 | 說明 |
|:---|:---|:---|
| **Perimeter** | `Perimeter` | 選區的邊界長度（周長）。 |
| **Centroid** | `X`, `Y` | **形心（幾何中心）**。選區所有像素點X、Y座標的算術平均值，代表物體的幾何中心位置。 |
| **Center of Mass** | `XM`, `YM` | **質心**。以像素亮度為權重的座標平均值。質心會偏向選區中較亮的區域。 |
| **Bounding Rectangle**| `BX`, `BY`, `Width`, `Height` | **邊界矩形**。能完全包圍選區的最小矩形。回傳其左上角座標(BX, BY)及寬高。 |
| **Feret's Diameter** | `Feret`, `FeretAngle`, `MinFeret` | **費雷特直徑（最大口徑）**。選區邊界上任意兩點間的最長距離。`MinFeret` 則是最小口徑。常用來描述不規則物體的尺寸。 |
| **Fit Ellipse** | `Major`, `Minor`, `Angle` | **擬合橢圓**。計算出最能貼合選區的橢圓，並回傳其長軸(`Major`)、短軸(`Minor`)及長軸與X軸的夾角(`Angle`)。 |
| **Shape Descriptors** | `Circ.`, `AR`, `Round`, `Solidity` | **形狀描述子**，一組用來量化形狀的指標：<br> - **`Circ.` (圓形度):** `4π*面積/周長²`。值為1.0表示完美的圓形，越接近0.0表示越狹長。<br> - **`AR` (長寬比):** `長軸/短軸`，需同時啟用 "Fit Ellipse"。<br> - **`Round` (圓度):** `4*面積/(π*長軸²)`，是長寬比的倒數。<br> - **`Solidity` (實心度):** `面積/凸包面積`。值接近1表示物體較實心、無凹陷。 |

### 其他設定

| 參數 (選項) | 說明 |
|:---|:---|
| **Area Fraction** | 顯示被閾值（Threshold）標紅的像素所佔的面積百分比。 |
| **Limit to Threshold** | 勾選後，所有測量（如Mean, Min, Max）都只會計算被閾值標紅的像素，忽略選區內未被標紅的像素。這對於在不完美的分割區域中精確測量訊號非常有用。 |
| **Stack Position** | 在處理影像堆疊（Stack）時，記錄測量發生在哪個通道(`Ch`)、切片(`Slice`)或幀(`Frame`)。 |
| **Display Label** | 在結果表格的第一欄顯示影像名稱和切片編號，方便辨識數據來源。 |
| **Redirect To** | **重定向**。允許你在影像A上圈選ROI，但實際測量影像B上對應位置的像素值。對於多通道分析（如在DAPI通道上圈核，測量GFP通道的強度）極為重要。 |
| **Decimal Places** | 設定結果表格中小數點後顯示的位數。 |

# 輸出數據
*   分析結果顯示在 ImageJ 的 `Results Table` 中。
*   可將表格 `File > Save As...` 匯出成 `.csv` 或 `.txt` 文件，以便後續使用 Excel, Python (Pandas), R 等工具進行統計分析和繪圖。



### Show選項說明

請執行這個macro，觀察不同show產生的效果。

```ijm
// 建立原始影像


newImage("original", "8-bit black", 512, 512, 1);
setColor(255);

// 畫圓形
makeOval(50, 50, 100, 100);
run("Fill");
run("Select None");

// 畫方形
makeRectangle(200, 50, 100, 100);
run("Fill");
run("Select None");

// 畫三角形（使用多邊形）
makePolygon(150,300, 250,300, 200,200);
run("Fill");
run("Select None");

// Binarize（轉為二值圖）
setThreshold(1, 255);
run("Convert to Mask");


// 各種 show 模式與對應標籤
shows = newArray(
    "Overlay",
    "[Overlay Masks]",
    "Outlines",
    "[Bare Outlines]",
    "Ellipses",
    "Masks",
    "[Count Masks]"
);

// 執行每種 show 模式
for (i = 0; i < shows.length ; i++) {
    selectImage("original");
    showOption = shows[i];
    
    if (i == 0 || i == 1) run("Duplicate...", "title="+ showOption);

    run("Analyze Particles...", " show=" + showOption );
    wait(200); // 等待新視窗建立
    idList = getList("image.titles");
    newest = idList[lengthOf(idList) - 1]; // 最新產生的圖    
    selectImage(newest);
	rename(showOption);

}


```
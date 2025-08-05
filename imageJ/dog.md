# Difference of Gaussian（DoG）
一種用來偵測亮點（spot）的常見方法，特別是在影像中物體呈現為圓形、亮、背景暗的情況下非常有效。

## DoG 如何偵測 SPOT（亮點）？
DoG 是「Difference of Gaussian」的縮寫，即高斯差分，是用來近似 [Laplacian of Gaussian](log.md)的一種方法，但比 LoG 更快、計算上更省資源。

## 流程
- 設定一個預期粒子直徑 d，根據圖像中粒子的外觀（例如細胞、點狀物）的大小手動設定。

- 計算兩個不同模糊程度的高斯標準差，使用下面的公式計算兩個高斯模糊的 σ（標準差）：這兩個 sigma 對應到不同的模糊程度：σ₁ 比較小，保留細節；σ₂ 比較大，模糊程度高。

\[
σ₁ =  \frac{1}{1 + \sqrt{2}}⋅𝑑  
\]

\[
σ₂ =  \sqrt{2}⋅σ₁
\]


- 進行高斯模糊與相減（DoG）
對原圖像各自套用 σ₁ 和 σ₂ 的高斯模糊。用 σ₁ 模糊結果減去 σ₂ 模糊結果，得到 DoG 圖像。這張圖會有清晰的局部極大值（local maxima），出現在亮點的中心位置。

## 亮點（Spot）的偵測
1. 尋找局部極大值（Local Maxima）對 DoG 圖像進行極大值搜尋，這些就是候選亮點。每個亮點會被指派一個「品質指標（quality）」，即 DoG 值的強度。

2. 距離過近者去除，如果兩個亮點的距離小於 𝑑/2，則刪除品質較差的那一個。

3. 進行次像素定位（Sub-pixel localization）使用拋物線內插法（parabolic interpolation），讓亮點的位置更精確。

## 去除錯誤亮點（Spurious spots）
1. 以 quality threshold 篩選。設定一個品質閾值，低於此閾值的亮點會被排除，只保留真正可信的亮點。

## 優點
- 快速近似 LoG，但運算效能更好。
- 適合固定大小的亮點（即單一尺度）。
- 可處理 2D 和 3D 影像。

## 使用時機
1. 細胞核、粒線體、斑點蛋白等亮點分析
2. 固定大小，且相對圓的結構
3. 影像背景為暗，物件明亮者（高SNR）

```ijm
// ==== 使用者設定參數 ====
// 預期的粒子直徑 (像素)，這個值會用來推算兩個 Gaussian 模糊的程度
particle_diameter = 40;

// 設定 Find Maxima 的強度閾值，過濾掉太弱的亮點
quality_threshold = 10;


// ==== 推導參數 ====
// sigma1 與 sigma2 是 DoG (Difference of Gaussians) 所需的兩個不同 sigma
sigma1 = particle_diameter / (1 + sqrt(2));
sigma2 = sqrt(2) * sigma1;


// ==== 建立測試影像與反相處理 ====
// 產生 ImageJ 內建的 dot test image
run("Dot Blot");

// 將影像反相，讓亮點變成白點（方便找 maxima）
run("Invert");


// ==== 複製原始影像供後續處理 ====
// 備份目前影像為 "Original"
run("Duplicate...", "title=Original");
rename("Original");


// ==== 對影像做第一次 Gaussian 模糊（sigma1）====
run("Duplicate...", "title=Blur1");
run("Gaussian Blur...", "sigma=" + sigma1);


// ==== 對影像做第二次 Gaussian 模糊（sigma2）====
// 從原始影像再複製一次為 "Blur2"
selectWindow("Original");
run("Duplicate...", "title=Blur2");
run("Gaussian Blur...", "sigma=" + sigma2);


// ==== 兩張模糊影像相減，產生 DoG ====
// 計算 Blur1 - Blur2，將結果命名為 DoG
imageCalculator("Subtract create", "Blur1", "Blur2");
rename("DoG");


// ==== 找出 DoG 圖中的亮點中心 ====
// 使用 Find Maxima 找出顯著的亮點位置
run("Find Maxima...", "prominence="+ quality_threshold +" output=[Point Selection]");


// ==== ROI manager ====
// 清空 ROI manager
roiManager("Reset");

// 把目前偵測到的亮點選區加到 ROI manager
roiManager("Add");


// ==== 在原始影像中顯示這些點選區 ====
// 切換回 "Original" 視窗
selectWindow("Original");

// 選擇剛剛儲存到 ROI manager
roiManager("Select", 0);


// ==== 清理中間影像====
// 關閉中介處理影像視窗
selectWindow("Blur1"); close();
selectWindow("Blur2"); close();
selectWindow("DoG"); close();

```
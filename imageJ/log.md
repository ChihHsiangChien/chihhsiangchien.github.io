# 

# Log
LoG 偵測亮點的常見做法：
先做 Gaussian blur（平滑），再做 Laplacian operator（找出邊緣或極值點），這樣的組合就構成了 LoG。

# 演算法
LoG(x, y) = ∇²(G(x, y) * I(x, y))
= 對影像模糊後，再施加 Laplacian（2階導數）

sigma = particle_diameter / (2 * sqrt(2))

```ijm

// ==== 使用者設定參數 ====
// 預期的粒子直徑，單位為像素，用來估算適當的平滑程度
particle_diameter = 55.0;

// 強度閾值，用來過濾背景雜訊或低強度的偽點
quality_threshold = 0.5;

// ==== 計算推導參數 ====
// 依據粒子大小計算 Gaussian Blur 所需的 sigma 值
// 這裡的公式源自 LoG 最適 sigma 理論，sigma ≈ d / (2√2)
sigma = particle_diameter * 0.35;


// ==== 複製原始影像備份使用 ====
// 將目前顯示的影像複製一份，命名為 "Original"
run("Duplicate...", "title=Original");
rename("Original");


// ==== 高斯模糊影像處理 ====
// 再次複製影像準備進行模糊處理，命名為 "Blurred"
run("Duplicate...", "title=Blurred");

// 轉為 32-bit 浮點影像，以支援之後的卷積運算
run("32-bit");

// 套用 Gaussian Blur，sigma 由前面推算而來
run("Gaussian Blur...", "sigma=" + sigma);


// ==== 套用 Laplacian 濾波器 ====
// 使用自訂的 Laplacian 卷積核（5x5），模擬 Laplacian 運算
// 中間為正，周圍為負，有助於偵測亮點中心
run("Convolve...", "text1=[-1 -1 -1 -1 -1\n-1 -1 -1 -1 -1\n-1 -1 24 -1 -1\n-1 -1 -1 -1 -1\n-1 -1 -1 -1 -1\n] normalize");


// ==== （可選）增強 LoG 結果對比 ====
// 增強對比，讓 LoG 結果更明顯，避免灰階變化太小導致 threshold 失敗
run("Enhance Contrast", "saturated=0.35");


// ==== 找出極大值點（亮點中心） ====
// 使用 Find Maxima 偵測出 LoG 響應圖中明顯的極大值（亮點中心）
// 這些點的亮度需要高於給定的 prominence threshold 才會被接受
run("Find Maxima...", "prominence="+ quality_threshold +" light output=[Point Selection]");


// ==== 將極大值結果儲存到 ROI Manager 中 ====
// 重置 ROI 管理器（清空原有 ROI）
roiManager("Reset");

// 將目前的點選區加入 ROI 管理器
roiManager("Add");


// ==== 回到原始影像，疊加偵測結果 ====
// 切換回 "Original" 影像視窗
selectWindow("Original");

// 在原始影像中選取剛剛加入的 ROI 點
roiManager("Select", 0);


// ==== 關閉處理過的中介影像，保持工作空間整潔 ====
// 關閉 "Blurred" 處理影像視窗
selectWindow("Blurred");
close();

```
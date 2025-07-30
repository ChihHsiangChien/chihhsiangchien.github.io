# 管長計算

## 偵測管狀結構

`Frangi Vesselness filter` 是一種專門用來偵測影像中血管狀、管狀（tubular structures）結構的影像處理演算法，主要根據局部灰階變化的「二階導數資訊」來判斷結構是否像「管子」。

### Hessian 矩陣
想像你用手在圖片表面摸，這個方法會幫你感受到圖片上哪裡是「凹進去」、「凸出來」或「平平的」。 Hessian 矩陣分析影像每個像素點的彎曲程度和方向，特別是找出線條、溝槽、彎曲的地方。

Frangi Vesselness filter 會觀察這些彎曲程度的數字（稱為「特徵值」（eigenvalue）），並依據這些數字來判斷某個區域像不像血管。

以2D圖片來說，管狀物的特徵是一個方向平、另一方向凹得很深，這種特徵就會在Frangi中被強調出來，分數越高越可能是血管

### 設定

* spacing：代表影像每個 pixel 在各個維度上的實際物理間距，一般xy等距的影像設成1,1就可以。
* scale：指的是 Frangi filter 中的σ 值，控制血管偵測的「粗細尺度」。

    * 每個 scale 會做一次偵測，最後將所有結果合併成為一個stack。
    * 通常填 1~4 個整數，代表從細到粗的血管寬度

## 後處理
執行` Process › Filters › Frangi Vesselness`之後，將stack做`Image › Stacks › Z Project...`，在此前後應該進行各種前處理，例如：

  * 區域化的對比調整
  * 遮罩設定

得到的成果再做骨架化處理，執行` Plugins › Skeleton › Skeletonize (2D/3D)`與分析骨架顯示結果，執行 ` Analyze › Skeleton › Analyze Skeleton (2D/3D)`，勾選`Show detailed info`。



# 3D骨架化示範
1. 開啟`File › Open Samples › Bat Cochlea Volume`蝙蝠耳蝸當成範例，這是一個已經二值化的影像。
2. 執行`Image › Stacks › 3D Project...`或是 `Plugins › 3D Viewer` 觀察其立體結構。
3. 對二值化影像輪廓進行骨架化處理，執行` Plugins › Skeleton › Skeletonize (2D/3D)`
3. 分析骨架並顯示結果 ` Analyze › Skeleton › Analyze Skeleton (2D/3D)`，勾選`Show detailed info`

# 2D骨架化示範
1. 執行以下macro，此範例會生成一個碎形樹，並產生程式預估的長度(繪製時就量測，可當作標準答案)。
2. 針對範例圖片，先轉成8-bit影像。
3. 對血管輪廓進行骨架化處理，執行` Plugins › Skeleton › Skeletonize (2D/3D)`
4. 分析骨架並顯示結果 ` Analyze › Skeleton › Analyze Skeleton (2D/3D)`，勾選`Show detailed info`
5. 將結果加總對照程式估計的長度。


```ijm
// ==== 使用者可調參數 ====
totalTargetLength = 300;       // 目標總長度（像素）
maxDepth = 8;                  // 分支深度（越大分支越多）
angleVariation = 80;           // 分支角度變化範圍（度）
branchRatio = 0.7;             // 分支長度縮短比例

// ==== 隨機控制開關 ====
enableRandomness = false;       // 全域隨機控制開關
enableRandomAngle = false;      // 啟用隨機角度？
enableRandomLength = true;     // 啟用隨機長度？



// ==== 畫樹狀分支函數 ====
function drawBranch(x, y, angleDeg, length, depth) {
  if (depth == 0) return 0;

  if (totalDrawnLength + length > totalTargetLength)
    length = totalTargetLength - totalDrawnLength;
  if (length <= 0) return 0;

  angleRad = angleDeg * PI / 180;

  // 計算終點
  x2 = x + cos(angleRad) * length;
  y2 = y + sin(angleRad) * length;

  // 分支寬度隨深度調整
  maxRadius = 8;
  baseRadius = maxRadius * (depth / maxDepth);
  radius = baseRadius;
  if (enableRandomness && enableRandomLength)
    radius *= 0.8 + 0.4 * random();  // 半徑加入隨機變異
  if (radius < 1) radius = 1;

  // 繪製分支：使用小圓點堆疊形成粗線
  steps = floor(length);
  for (i = 0; i <= steps; i++) {
    px = x + cos(angleRad) * i ;
    py = y + sin(angleRad) * i ;
    makeOval(px - radius / 2, py - radius / 2, radius, radius);
    run("Fill");
  }

  totalDrawnLength += length;

  // 新分支長度與角度變化
  newLength = length * branchRatio;
  if (enableRandomness && enableRandomLength)
    newLength *= 0.8 + 0.4 * random();

  delta = angleVariation;
  if (enableRandomness && enableRandomAngle)
    delta *= (random() * 2 - 1);  // 在 ±angleVariation 範圍內隨機

  // 遞迴分支（左右）
  currentBranchLength = 0;
  if (!enableRandomness || random() < 0.8)
    currentBranchLength = currentBranchLength + drawBranch(x2, y2, angleDeg - delta, newLength, depth - 1);
  if (!enableRandomness || random() < 0.8)
    currentBranchLength = currentBranchLength + drawBranch(x2, y2, angleDeg + delta, newLength, depth - 1);

  return length + currentBranchLength;
}



// ==== 建立畫布 ====
width = 512;
height = 512;
newImage("Vessel Tree", "RGB black", width, height, 1);
setColor(255, 255, 255);
run("Line Width...", "line=3");

// ==== 全域變數 ====
totalDrawnLength = 0;

// ==== 主程式 ====
setBatchMode("hide");
setBatchMode(true); 

startX = width / 2;
startY = height - 10;
initialLength = totalTargetLength / 3.0;

print("開始繪製樹狀血管樹...");
totalDrawnLength = drawBranch(startX, startY, -90, initialLength, maxDepth);
setBatchMode(false); 
print("估計總長度（程式計算）: " + totalDrawnLength);

//run("8-bit"); // 確保影像為8位元格式
//run("Skeletonize (2D/3D)"); // 對血管輪廓進行骨架化處理
//run("Analyze Skeleton (2D/3D)", "prune=none show display"); // 分析骨架並顯示結果，包括總長度



```

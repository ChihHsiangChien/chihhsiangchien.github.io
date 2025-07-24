# 血管計算

## 生成範例圖片 

1. 針對範例圖片，先轉成8-bit影像。
2. 對血管輪廓進行骨架化處理，執行` Plugins › Skeleton › Skeletonize (2D/3D)`
3. 分析骨架並顯示結果 ` Analyze › Skeleton › Analyze Skeleton (2D/3D)`，勾選`Show detailed info`
4. 將結果加總對照程式估計的長度。


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

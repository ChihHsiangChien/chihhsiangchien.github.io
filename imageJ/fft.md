# ImageJ：週期性雜訊與傅立葉轉換（FFT）

本範例展示如何在影像中加入週期性雜訊（條紋或點狀 pattern），並利用 ImageJ 觀察其傅立葉轉換（FFT）結果。

---

## FFT 結果觀察

- **條紋雜訊（stripe）**：  
  頻譜圖會出現一對明顯的亮點，位置與條紋方向、頻率有關。
- **點狀 pattern**：  
  頻譜圖會出現多個亮點，形成規則的格點分布。
- 調整 `angle` 參數，可觀察頻譜亮點的旋轉變化。
- 調整 `freqX` 參數，可觀察頻譜亮點的位置變化。

---

## 實作範例

```ijm
// 在影像上增加週期性雜訊：可切換「條紋」或「點狀 pattern」
// 觀察轉出的FFT


// ==== 參數 ====
mode = "stripe"; // "stripe" = 條紋, "pattern" = 點狀
// 條紋時只用 freqX
freqX = 10;       // X方向週期
freqY = 20;       // Y方向週期
amp   = 60;       // 雜訊強度 (0~255)
angle = 30;       // 旋轉角度 (度數)

// ==== 測試影像 ====
run("Clown");
run("8-bit");
rename("Noisy");

width = getWidth();
height = getHeight();
theta = angle * PI / 180;

setBatchMode(true);

for (y=0; y<height; y++) {
    for (x=0; x<width; x++) {

        // 旋轉座標
        xp =  x * cos(theta) + y * sin(theta);
        yp = -x * sin(theta) + y * cos(theta);

        if (mode == "stripe") {
            // 條紋
            value = amp * sin(2 * PI * xp / freqX);
        } else {
            // 點狀 pattern
            value = amp * sin(2 * PI * xp / freqX) * sin(2 * PI * yp / freqY);
        }

        // 只增亮
        //if (value < 0) value = 0;

        v = getPixel(x, y) + value;

        if (v > 255) v = 255;
        if (v < 0) v = 0;
        setPixel(x, y, v);
    }
}

setBatchMode(false);
resetMinAndMax();
run("FFT");
```

---

## 在 FFT 頻譜上處理並反轉回空間域

你可以在 FFT 頻譜圖上進行處理（如遮罩、消除亮點），再做 Inverse FFT（`Process › FFT › Inverse FFT`）觀察效果。

### 流程

1. **產生含週期性雜訊的影像並做 FFT**（同前述腳本）。
2. **手動或自動在 FFT 頻譜圖上遮罩亮點**（消除雜訊頻率）。
3. **執行 Inverse FFT**，觀察雜訊是否被移除。

#### 補充說明

- 你可以手動用橢圓工具在 FFT 頻譜圖上選取亮點，然後執行 `Edit > Clear` 或 `Clear Outside`。
- 遮罩掉亮點後再做 `Process > FFT > Inverse FFT`，即可看到雜訊被抑制的效果。

---

## 原理解釋

在頻域中，週期性雜訊會對應到特定的頻率成分。透過傅立葉轉換，我們可以將影像從**空間域**轉換到**頻域**，並觀察到這些雜訊成分的頻譜特徵。當我們在頻譜圖上進行遮罩處理，實際上是去除了這些特定頻率的影響，進而達到去雜訊的效果。

---

## 自訂濾波器

從 FFT 頻譜圖上，你也可以使用自訂濾波器來處理影像。這可以讓你更精確地控制哪些頻率成分被保留或去除。  
執行 `Process › FFT › Custom Filter...`。

---

## FFT 自相關

透過自相關分析，我們可以進一步了解影像中的週期性雜訊特徵。自相關函數可以幫助我們識別影像中重複出現的模式，並為去雜訊提供依據。

1. 使用一個有週期性條紋的圖，或是洋蔥細胞顯微圖做 FFT，再使用 `Process › FFT › FD Math...`，使用同一張圖做自相關運算 `correlate`，勾選 `Do inverse transform`。
2. 觀察自相關結果，會顯示出影像中週期性條紋的特徵。

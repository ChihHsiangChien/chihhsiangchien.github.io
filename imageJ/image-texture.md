# 影像紋理分析 (Image Texture Analysis)

除了強度和形狀，**紋理 (Texture)** 描述了像素鄰域內的空間強度變化模式，如粗糙、平滑、規律等。

本單元介紹紋理分析的基本概念，並以**灰階共生矩陣 (Gray-Level Co-occurrence Matrix, GLCM)** 為例，用 ImageJ/Fiji 實作 MRI 腦組織分析案例，分析灰白質的紋理特徵。

---

## 什麼是影像紋理？

影像紋理是指影像中像素灰階分佈的局部變化模式。它不是描述單一像素，而是描述像素與其周圍鄰居的空間關係。這些模式可以被量化為特徵，例如：

- **粗糙 vs. 平滑 (Rough vs. Smooth)**
- **規律 vs. 隨機 (Regular vs. Random)**

紋理特徵能夠補充形狀與強度資訊，是生醫影像分析中量化影像細微變化的重要工具。


---

## 紋理分析的理論基礎

紋理分析的核心是量化影像中像素間的「灰階關係」，通常從以下角度描述：

- **灰階差異大小**（對比度）
- **紋理的規律程度**（均勻性）
- **資訊豐富程度**（熵）
- **能量分佈**（能量或二階矩）

---
## 紋理分析的應用

紋理分析在醫學影像中應用廣泛，能輔助電腦進行診斷與分類：

- **腫瘤診斷：** 利用紋理特徵判斷腫瘤的良惡性（例如 MRI、超音波影像）。惡性腫瘤的紋理通常更不均勻、更複雜。
- **組織分類：** 區分不同類型的生物組織（如肌肉、脂肪、纖維組織）。
- **疾病預測與分期：** 透過紋理變化預測疾病進程（如肝臟纖維化程度）。
- **醫學影像輔助診斷 (CAD)：** 作為機器學習、深度學習模型的重要特徵來源。

---

## GLCM（灰階共生矩陣）

### GLCM 是什麼？

[GLCM互動範例](glcm-interactive.html)  
**灰階共生矩陣 (Gray-Level Co-occurrence Matrix, GLCM)** 是最經典的紋理分析統計方法。它透過一個矩陣來描述影像中像素的空間關係。這個矩陣記錄了在特定**方向 (Angle)** 和**距離 (Distance)** 下，**成對像素的灰階值**共同出現的頻率。

舉例來說，當設定 `方向=0°`、`距離=1` 時，GLCM 統計的就是影像中每個像素與其**正右方相鄰像素**的灰階值組合出現了幾次。

## GLCM 計算範例

假設有一張 \(3 	\times 3\) 的灰階影像如下：

|   |   |   |
|:-:|:-:|:-:|
| 100 | 100 | 101 |
| 100 | 101 | 102 |
| 101 | 102 | 102 |

這裡的灰階值只有：100、101、102。

### 1. 設定計算條件

- **方向**：0°（向右）
- **距離**：1 像素

只考慮每個像素與右邊像素的組合關係。

### 2. 找出像素對

從影像中列出右側鄰居的像素對：

- (100, 100)
- (100, 101)
- (100, 101)
- (101, 102)
- (101, 102)

### 3. 建立 GLCM

列出灰階對應次數：

| i\j | 100 | 101 | 102 |
|:--:|:--:|:--:|:--:|
| 100 | 1 | 2 | 0 |
| 101 | 0 | 0 | 2 |
| 102 | 0 | 0 | 0 |

### 4. 正規化 GLCM

將所有出現次數除以總像素對數（5 對）：

| i\j | 100 | 101 | 102 |
|:--:|:--:|:--:|:--:|
| 100 | 0.2 | 0.4 | 0 |
| 101 | 0 | 0 | 0.4 |
| 102 | 0 | 0 | 0 |

### 5. 計算特徵量

**(1) Contrast（對比度）**

\[
Contrast = \sum_{i,j} (i-j)^2 \times P(i,j)
\]

計算各元素：

- (100,100): \((100-100)^2 \times 0.2 = 0\)
- (100,101): \((100-101)^2 \times 0.4 = 1 \times 0.4 = 0.4\)
- (101,102): \((101-102)^2 \times 0.4 = 1 \times 0.4 = 0.4\)

加總：

\[
Contrast = 0 + 0.4 + 0.4 = 0.8
\]
---

**(2) Homogeneity（均勻性）**

\[
Homogeneity = \sum_{i,j} \frac{P(i,j)}{1 + |i-j|}
\]

計算各元素：

- (100,100): \(\frac{0.2}{1+0} = 0.2\)
- (100,101): \(\frac{0.4}{1+1} = 0.2\)
- (101,102): \(\frac{0.4}{1+1} = 0.2\)

加總：

\[
Homogeneity = 0.2 + 0.2 + 0.2 = 0.6
\]

---

**(3) Entropy（熵）**

\[
Entropy = -\sum_{i,j} P(i,j) \log_2(P(i,j))
\]

計算各元素（取對數基底 2）：

- (100,100): \(-0.2 \times \log_2(0.2) \approx 0.464\) 
- (100,101): \(-0.4 \times \log_2(0.4) \approx 0.528\) 
- (101,102): \(-0.4 \times \log_2(0.4) \approx 0.528\) 

加總：

\[
Entropy \approx 0.464 + 0.528 + 0.528 = 1.52
\]

---

### 小結

這張小影像的 GLCM 特徵是：

| 特徵 | 數值 |
|:---|:---|
| Contrast | 0.8 |
| Homogeneity | 0.6 |
| Entropy | 1.52 |

# 使用imagej


### 分析案例：量化灰質與白質的結構特徵

- **背景知識：**
  - **灰質 (Gray Matter):** 主要由神經元胞體、樹突等組成。其結構相對**異質、複雜**。
  - **白質 (White Matter):** 主要由密集、平行排列的髓鞘化神經纖維束構成。其結構相對**均質、有序**。
- **分析假設：**
  - 灰質的紋理應該更**粗糙** (低均質性, 高對比度)。
  - 白質的紋理應該更**平滑** (高均質性, 低對比度)。

### 操作步驟

#### 準備工作
1.  **開啟影像：** 開啟範例影像 `File > Open Samples > T1 Head (2.4M, 16-bits)`。
2.  **開啟 ROI 管理器：** 執行 `Analyze > Tools > ROI Manager...`。
3.  **安裝插件 (若無)：** 常用的plugin是 `GLCM Texture Analyzer`。若沒有，可透過 `Help > Update... > Manage update sites`，勾選 `Texture` 或 `Bio-Formats` 來安裝。

#### 選取ROI Selection
我們需要在典型的灰質和白質區域手動定義幾個 ROI 以進行比較。

1.    瀏覽影像堆疊，找到一個腦部結構清晰的切片，然後做`Image › Duplicate...`，複製其中一張影像。
2.    GLCM 的計算需要灰階影像，將影像轉換為 8 位灰階影像：`Image > Type > 8-bit`。
3.    從 ImageJ 主工具列選擇 **自由選取工具 (freehand Selection)**。
3.    **定義灰質 ROI:**
      *   在一個大片的、均勻的灰質區域內，畫一個大小適中的橢圓。
      *   在 ROI manager中點擊 `Add [t]`，然後點擊 `Rename...` 將其命名為 `grey`。
4.    **定義白質 ROI:**
      *   先在ROI manager選擇 grey的ROI，然後按鍵盤的方向鍵，將這個區域移動到白質區域。
      *   加入 ROI 管理器並命名為 `white`。

#### 執行 GLCM 分析 (Running the GLCM Analysis)
1.    在 ROI manager中，選擇剛剛建立的 `grey` ROI，執行 `Analyze > GLCM Texture` 。
2.    在彈出的對話框中，保持預設參數（例如，`Step size (d)`=1），然後點擊 `OK`。
3.    執行後，會彈出一個 "Results" 表格，在此表格選擇 `File >　Rename`改名成 `Grey`。
4.    改執行`white`ROI，重複以上動作。

### 結果解讀與結論
觀察兩個表格的差異，這些數據是否符合我們對灰白質的主觀感受？白質的紋理確實比灰質更平滑、更均質，而灰質的紋理則更粗糙、更複雜。

| 特徵名 | 英文 | 意義 | 解讀 |
|:---|:---|:---|:---|
| 角秒矩 | Angular Second Moment (ASM) | 衡量紋理的均勻性或一致性 | 值越高表示紋理越規則、均勻。|
| 對比度 | Contrast | 鄰近像素間灰階差異的加權總和，反映影像紋理的「粗糙程度」 | 高對比＝紋理粗糙 |
| 相關性 | Correlation | 衡量像素間灰階的線性相關性 | 值高表示像素間關係有序、噪音少。|
| 反差異矩 | Inverse Difference Moment (IDM) / Homogeneity | 鄰近像素灰階越接近得分越高 | 值高表示像素強度相似，紋理平滑。|
| 熵 | Entropy | 量化灰階分佈的隨機性，GLCM元素的平方和 | 數值高表示紋理複雜、無序。|

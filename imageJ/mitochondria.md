# 粒線體數量與體積分析
[教學影片](https://youtu.be/fxiGpamOC0I)

## 使用者需求

### 樣本資訊
- **樣本名稱**: NAc_aligned.tif
- **來源**: 小鼠腦區 Nucleus Accumbens
- **染色方式**: 細胞膜脂質染上重金屬 Osmium tetroxide
- **影像設備**: 掃描電子顯微鏡 (SEM)
- **影像資訊**: 
    - Voxel size: 6.5(x) × 6.5(y) × 60(z) nm
    - 切片數量: 111 slices
    - 已用 SIFT 對齊

### 分析需求
1. **分割粒線體**
     - **目標**: 分割出粒線體，並計算各個粒線體的體積。
     - **附圖**: (segmentation example) 為粒線體標定範例。
         - 已分割的粒線體: 粉紅色
         - 非粒線體: 紫色
         - 紅箭頭: 尚未分割的粒線體範例
     - **辨認原則**:
         - a. 具有黑色框線的圓形或橢圓形，內部似有 cristae 的線條。
         - b. 全黑 (solid black) 的圓形或橢圓形為非粒線體。
         - c. 被更大結構黑框包圍的亦屬粒線體。

2. **3D 呈現**
     - 3D rendering 分割出的粒線體。

3. **特徵計算**
     - 計算粒線體的數量與各別體積。

## 流程

### 影像預處理
1. ` Image › Stacks › 3D Project...`取 `min intensity`取得具有完整影像的範圍，再套用到原始stack進行`crop`。

2. 複製出單一slice，進行FFT，測試產生頻譜圖。在頻譜圖上進行處理，將週期性結構去除，並將頻譜圖轉回空間域。

3. 將處理後的頻譜圖，利用`Image > Adjust > Threshold...`進行二值化處理，目標是阻擋的頻率範圍為黑色，允許通過的頻率為白色。

4. 利用` Process › FFT › Custom Filter...`套用上述頻譜圖，將原始影像stack中的週期性結構去除。

### 影像分割
1. 使用 ` Plugins › Segmentation › Trainable Weka Segmentation 3D`進行處理，class1作為背景或非粒線體，class2作為粒線體。

2. 使用`freehand line tool`標註粒線體與背景。

3. 使用適中寬度的freehand line：設置stroke width為3-5像素，沿著粒線體中心線繪製：這樣可以捕獲粒線體的主要特徵，在多個切片上標註：確保3D結構的完整性。

4. training後，得到的結果影像為二值化影像。

### 二值化影像的切割
1. 使用`Analyze › 3D Objects Counter`將二值化影像切割成各個粒線體。每個粒線體都會有一個獨立的ID。且可以得到分析表格，其中包含每個粒線體的體積資訊。

2. 利用`Image > Adjust > Threshold...`用單一粒線體的ID，並將其轉換為二值化影像。

3. 此二值化影像與原始影像進行`Image › Calculator Plus...`，選擇`AND`運算，將原始影像中非粒線體的部分去除。即可得到分割後的粒線體影像。

### 3D rendering
1. 將上述結果影像crop後，利用`Plugins › 3D Viewer`進行3D重建。可看到分割後的粒線體的立體影像。

# 影像分割(segementation)

## 目的
影像分割旨在將影像中的像素根據某種準則（如灰度值、顏色、紋理、空間位置等）進行分組，形成具有相似特徵的區域。主要目標是將前景物件與背景分離。

## 分割方法分類
影像分割方法大致可分為以下類型：

1.  **手動分割 (Manual Segmentation)**
    -   人工描繪感興趣區域（ROI）。
    -   適用場景：複雜、不規則或稀有結構；需要極高精確度的特殊案例。
    -   優點：準確度高，適用於任何影像。
    -   缺點：耗時、主觀性強、不適合大量影像處理。
    -   應用：特殊病理切片分析、複雜組織結構辨識。

2.  **半自動分割 (Semi-automatic Segmentation)**
    -   提供少量互動（如指定種子點、初始輪廓），程式自動完成大部分分割過程。
    -   優點：結合了人工的指導和程式的效率。
    -   缺點：仍需要一定程度的人工介入。
    -   應用：血管網路追蹤、神經纖維分析、互動式區域生長。

3.  **自動分割 (Automatic Segmentation)**
    -   程式根據預設算法或學習的模型完全自動進行分割。
    -   優點：效率高，適合批量處理，客觀性強。
    -   缺點：算法選擇和參數設定對結果影響大；可能無法處理所有複雜情況。
    -   主要自動方法包含：
        -   傳統方法：基於閾值、邊緣、區域等特徵。
        -   機器學習與深度學習方法：從標記數據中學習分割規則。


## 傳統影像分割方法

### 閾值分割 (Thresholding)
閾值分割是最基本且廣泛使用的自動分割方法。它根據像素的灰度值將影像分成前景和背景兩部分（二值化影像）。

-   **原理：** 選擇特定灰階值作為閾值，將影像中的像素分為兩類：灰度值高於閾值的歸為一類（通常是前景），低於閾值的歸為另一類（通常是背景）。
-   **類型：**
    -   **全局閾值 (Global Threshold)：** 使用單一閾值應用於整張影像。適用於照明均勻且前景背景對比明顯的影像。
        *   整張影像使用同一個閾值。
        *   `Image > Adjust > Threshold...`。
        *   `Image › Adjust › Auto Threshold`。
    -   **局部閾值 / 自適應閾值 (Local / Adaptive Threshold)：** 對影像不同區域使用不同的閾值。適用於照明不均勻或背景複雜的影像。
        *   影像被分成小區域，每個區域計算自己的閾值。
        *   適用於背景亮度不均勻。
        *   `Image › Adjust › Auto Local Threshold`    

### 區域基礎分割 (Region-Based Segmentation)
這類方法根據像素之間的相似性將它們合併到同一個區域。

-   **區域生長 (Region Growing)：**
    -   **原理：** 從一個或多個「種子點」開始，逐步將周圍滿足特定相似性準則（如灰度值在一定範圍內、範圍如何界定）的像素加入到當前區域中，直到沒有符合條件的相鄰像素為止。
    **方法**
    -   工具列的**wand tool**，雙擊會有進階選項。取得的selection，再加入ROI manager。
    -   ` Plugins › MorphoLibJ › Segmentation › Interactive Marker-controlled Watershed`，可手動加入種子點進行分割。請參考[region-growing](region-growing.md)


[形態學分割](morphological-segmentation.md)

## 機器學習方法

這類方法從大量標記好的影像數據中學習特徵和模式，自動執行分割任務。

-   **[Trainable Weka Segmentation](trainable-weka-segmentation.md)**
-   **[Cellpose-SAM ](cellpose-sam.md)**
-   **[stardist細胞分割](stardist.md)**
    

# 後處理
分割結果可能包含雜訊（小孔洞、孤立的小區域）、邊界不平滑或物體連接不緊密等問題，則利用形態學處理來優化結果，然後再利用`Analyze > Analyze Particles...`來過濾取出selections。
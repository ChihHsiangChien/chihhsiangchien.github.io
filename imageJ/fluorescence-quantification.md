# 螢光強度定量：分析細胞核/質的訊號分佈

我們將以 ImageJ 內建的 `Fluorescent Cells.tif` 範例影像為基礎，學習如何測量一個目標蛋白在細胞核（Nucleus）和細胞質（Cytoplasm）中的分佈，並計算其比值。

這是一個非常核心的實驗技能，常用於研究蛋白質的核質轉位（Nucleocytoplasmic Shuttling）等現象。

## 1. 案例介紹與準備工作

### 認識範例影像 `FluorescentCells.tif`

1.  **開啟影像：** `File > Open Samples > Fluorescent Cells.tif`。
2.  **影像資訊：** 這是一張牛肺動脈內皮細胞的螢光影像，為一個包含三個8位元通道的合成影像（Composite Image）。
    *   **藍色 (Blue):** DAPI 染劑，標定**細胞核 (Nucleus)**。
    *   **綠色 (Green):** Bodipy FL 染劑，標定**微管蛋白 (Tubulin)**，主要分佈於細胞質。
    *   **紅色 (Red):** Texas Red 染劑，標定**絲狀肌動蛋白 (F-Actin)**，主要分佈於細胞質的細胞骨架。

### 分析目標

我們的目標是定量分析**微管蛋白（綠色通道）**在**細胞核**與**細胞質**中的螢光強度，並計算其比值，以判斷其主要分佈位置。

### 設定測量參數

在開始分析前，我們先告訴 ImageJ 我們需要測量哪些數據。

1.  執行 `Analyze > Set Measurements...`。
2.  勾選以下重要參數：
    *   `Area`: 物件的面積。
    *   `Mean gray value`: 訊號的平均強度。
    *   `Integrated Density (IntDen)`: 訊號的總量（= Area × Mean gray value），這是螢光定量中最重要的指標之一。
    *   `Display label`: 在結果中顯示影像標籤，方便識別數據來源。
3.  點擊 `OK`。

## 2. 步驟一：定義並測量細胞核 (Nucleus)

我們將利用 DAPI 通道清晰的細胞核輪廓來定義所有細胞核的選區 (ROI)。

1.  **分離通道：** 為了獨立分析，執行 `Image > Color > Split Channels`。您會得到 `(red)`, `(green)`, `(blue)` 三張獨立的灰階影像。
2.  **分割細胞核：**
    *   選取 `(blue)` 這張影像。
    *   執行 `Image > Adjust > Threshold...` 來選取細胞核。
    *   點擊 `Apply` 將其轉換為二值化影像。
    *   執行 `Process > Binary > Watershed` 來分離可能相連的細胞核。
3.  **將細胞核 ROI 加入管理器：**
    *   執行 `Analyze > Analyze Particles...`。
    *   設定 `Size` 來過濾掉小雜訊，例如 `100-Infinity`。
    *   **關鍵：** 務必勾選 `Add to Manager`。
    *   點擊 `OK`。現在，所有細胞核的輪廓都被加入到 ROI 管理器中了。

## 3. 步驟二：定義細胞質 (Cytoplasm)

細胞質的區域可以定義為「整個細胞的區域」減去「細胞核的區域」。我們將使用一個巧妙的方法來建立細胞質的 ROI。

1.  **定義全細胞 ROI：**
    *   選取 `(green)` 或 `(red)` 影像，因為它們能大致顯示整個細胞的輪廓。
    *   在 ROI 管理器中，逐一點選每個細胞核 ROI。
    *   對於每個選中的細胞核 ROI，執行 `Edit > Selection > Enlarge...`，輸入一個適當的像素值（例如 `15` pixels），使其擴展到能大致包圍整個細胞。
    *   將這個擴展後的 ROI 也加入到 ROI 管理器中（點擊 `Add [t]`）。為了方便管理，可以點擊 `Rename...` 將其命名為例如 `Cell-1`。

> **注意:** 為了教學簡化，我們先對單一細胞進行操作。在實際應用中，此擴展步驟可透過撰寫 Macro 腳本來自動化。

2.  **建立細胞質 ROI (甜甜圈法)：**
    *   在 ROI 管理器中，**同時選中**剛剛建立的全細胞 ROI (`Cell-1`) 和其對應的原始細胞核 ROI。
    *   點擊 `More >>` 按鈕，選擇 `XOR`。
    *   **觀察：** ImageJ 會產生一個新的 ROI，其形狀就像一個甜甜圈，這就是我們需要的**細胞質區域**！
    *   將這個新的 "甜甜圈" ROI 也加入管理器，並命名為 `Cyto-1`。

現在，我們的 ROI 管理器中應該至少有三個 ROI：`Nucleus-1`、`Cell-1` 和 `Cyto-1`。

## 4. 步驟三：使用 Multi Measure 進行定量分析

`Multi Measure` 是多通道螢光分析的利器。它能一次性地將 ROI 管理器中的所有選區，應用到所有已開啟的影像上，並分別記錄測量結果。

1.  **執行 Multi Measure：**
    *   **關鍵步驟：** 確保 `(blue)`, `(green)`, `(red)` 三張影像都處於開啟狀態。
    *   在 ROI 管理器視窗中，點擊 `More >>` 按鈕，然後選擇 `Multi Measure`。
    *   在彈出的對話框中，保持預設 `All open images` 即可。點擊 `OK`。

2.  **解讀結果：**
    *   "Results" 表格會出現，並且多了一欄 `Slice`，用來標示數據來自哪個通道的影像 (`(red)`, `(green)` 還是 `(blue)`)。
    *   對於 ROI 管理器中的**每一個 ROI**（如 `Nucleus-1`, `Cyto-1`），您都會得到**三行**數據，分別對應它在這三張影像上的測量值。

## 5. 步驟四：計算比值並解讀

現在我們有了所有需要的數據，可以進行最終的計算。

1.  **整理數據：**
    *   從 "Results" 表格中，找出 `Nucleus-1` 在 `(green)` 影像上的**平均灰階值 (Mean)**，我們稱之為 `Mean_Nuc`。
    *   找出 `Cyto-1` 在 `(green)` 影像上的**平均灰階值 (Mean)**，我們稱之為 `Mean_Cyto`。

2.  **計算比值：**
    *   計算 **細胞質/細胞核** 的螢光強度比值：`Ratio = Mean_Cyto / Mean_Nuc`。

3.  **結果判讀：**
    *   如果 `Ratio` 遠大於 1，代表微管蛋白主要分佈在**細胞質**。
    *   如果 `Ratio` 接近 1，代表分佈較為均勻。
    *   如果 `Ratio` 遠小於 1，代表主要分佈在**細胞核**。

> **為何要扣除背景值？**
>
> 在更嚴謹的分析中，我們還需要測量一個沒有細胞的背景區域的平均螢光強度 (`Mean_Bkg`)。然後在計算比值前，先從測量值中減去背景值，這樣可以消除相機的暗電流雜訊和非特異性螢光造成的影響。
>
> -   **校正後的值：** `Corrected_Mean_Nuc = Mean_Nuc - Mean_Bkg`
> -   **校正後的值：** `Corrected_Mean_Cyto = Mean_Cyto - Mean_Bkg`
> -   **校正後的比值：** `Ratio = Corrected_Mean_Cyto / Corrected_Mean_Nuc`

恭喜！您已經完成了一次完整的螢光定量分析，這個方法論可以廣泛應用於各種多通道影像的共定位與強度分析中。
# StarDist for Fiji 使用教學

## 什麼是 StarDist？

StarDist 是一種基於深度學習的實例分割（Instance Segmentation）工具，特別適用於生物顯微影像。它利用「星形凸多邊形（Star-convex Polygon）」模型，能有效偵測形狀接近圓形、橢圓形或不規則但中心放射狀的物體，如細胞或細胞核。

其 Fiji 插件版本支援 2D 影像與 2D 時間序列（time-lapse） 的分割任務。

---

## 安裝 StarDist plugin
fiji上有兩種stardist可以使用，一個是單純的stardist plugin，安裝方式：
1.  開啟 Fiji
2.  選擇上方選單：`Help > Update...`。
3.  在 Updater 視窗中，點擊左下角的 `Manage update sites` 按鈕。
4.  在更新站點列表中，找到並**勾選**以下兩個站點：
    *   `CSBDeep`
    *   `StarDist`    
5.  點擊 `Close` 按鈕返回，然後點選 `Apply changes` 開始安裝。
6.  安裝完成後，**重新啟動 Fiji**。

另一種是在 DeepImagej裡，只要安裝DeepImagej就可以使用
1. 到`Help > Update...`安裝`DeepImageJ`
2. 執行` Plugins › DeepImageJ › DeepImageJ Cellpose`
3. 第一次使用時，會先要求你安裝python。但安裝後第一次執行可能出現error，這問題可能來自共享記憶體的實作有問題。需要手動換掉 Fiji 中的 JNA 函式庫：
    1. 到官方 JNA GitHub：[https://github.com/java-native-access/jna](https://github.com/java-native-access/jna)下載 JNA 最新 release（建議用 5.12.1 或以上）找到最新版本的`jna.jar`和`jna-platform.jar`
    2. 把它們放進： `Fiji.app/jars/`，若該資料夾已有舊版 jna.jar，請先備份並移除。


但目前我使用的是第二種方法，因為第一種方法我一直無法處理錯誤訊息
---

## 使用 StarDist 插件分割影像

### 1. 載入影像

-   開啟一張 2D 或 2D 時間序列影像。
-   支援單通道灰階影像（如 DAPI 螢光）或 RGB 彩色影像（如 H&E 病理切片）。
-   測試影像也可從 Broad Bioimage Benchmark Collection 取得。
-   **影像預處理**：在執行 StarDist 前，進行適當的預處理（如背景扣除、對比度增強）有時能提升分割效果。
-   **3D 影像**：目前不支援 3D 影像分割。若有 3D 分割需求，請改用 Python 版本的 StarDist。

### 2. 啟動與設定

啟動路徑：`Plugins > StarDist > StarDist 2D`或也可以使用` Plugins › DeepImageJ › DeepImageJ StarDist`，但後者要安裝DeepImagej。

#### 主要設定項目

-   **模型選擇 (Neural Network Model):**
    -   `Versatile (fluorescent nuclei)`：適用於單通道螢光影像中的細胞核。
    -   `Versatile (H&E nuclei)`：適用於 RGB 病理切片影像中的細胞核。
    -   `Custom...`：可選擇自訂模型（.zip 檔），從本機或網路 URL 載入。

-   **影像正規化 (Image Normalization):**
    -   預設使用**百分位數 (Percentile)** 進行正規化，將影像亮度拉伸到最佳範圍。
    -   可依影像亮度特性調整百分位數，或選擇不進行正規化。

-   **NMS 後處理 (Non-Maximum Suppression):**
    -   **Probability/Score Threshold**：預測為物件的機率門檻。數值越高，篩選越嚴格，偵測到的物件數越少但越可靠。
    -   **Overlap Threshold**：允許分割物件之間重疊的程度。數值越高，越能容忍相鄰或重疊的物件。

-   **輸出格式 (Output Type):**
    -   `Label Image`：輸出一張已標記的分割圖，每個物件有不同的 ID（灰階值）。
    -   `ROI Manager`：將每個分割出的物件輪廓加入 ROI 管理器，方便進行後續的測量與分析。
    -   `Both`：同時輸出 Label Image 並加入 ROI Manager。

#### 進階選項 (Advanced Options)

-   **`n-tiles`**：設定影像平鋪處理的數量。當處理高解析度大圖時，可增加此數值（如 2x2 或 4x4）以避免記憶體不足。
-   **`Restore Default Parameters`**：一鍵還原所有預設參數。

### 3. 執行與檢視結果

成功執行後，Fiji 會：
-   顯示分割結果（Label image）。
-   若選擇了 `ROI Manager`，會在 ROI 管理器中列出所有偵測到的物件。
-   在 ROI Manager 中點選 `Show All` 可在影像上顯示所有 ROI 的疊加效果。
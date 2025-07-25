# 檔案格式支援與匯入匯出

## 簡介
ImageJ/Fiji 支援多種影像格式，從通用的圖片檔到專業的醫學與顯微鏡影像。了解不同格式的特性以及如何正確匯入與匯出，是確保影像分析準確性的第一步。

## 支援的檔案格式

### 一般影像格式
- **TIFF (Tagged Image File Format):** **科學影像首選格式**。支援無損壓縮，能完整保留原始像素數據。它可以儲存多頁影像（影像堆疊, Stacks）和重要的元數據（Metadata）。
- **JPEG (Joint Photographic Experts Group):** **有損壓縮格式**。檔案小，適合分享與網頁展示，但**不適合用於定量分析**，因為壓縮過程會改變原始像素值。
- **PNG (Portable Network Graphics):** 無損壓縮格式，支援透明背景，適合用於製作圖表和報告。
- **BMP (Bitmap):** 無壓縮的點陣圖格式，檔案較大，現已較少使用。
- **GIF (Graphics Interchange Format):** 支援動畫，但色彩深度較低（最多256色），不適合科學影像。

### 專業醫學影像格式
- **DICOM (Digital Imaging and Communications in Medicine):** 醫學影像（如CT、MRI）的標準格式，內含豐富的病患資訊和掃描參數等元數據。
- **Bio-Formats (透過外掛支援):** 這不是單一格式，而是一個強大的函式庫，讓 Fiji 能夠讀取超過150種來自不同顯微鏡廠商的專有格式（如 `.czi`, `.lif`, `.nd2`）。**這是處理顯微鏡影像最推薦的方式。**
- **NIfTI (Neuroimaging Informatics Technology Initiative):** 常用於神經影像學（如fMRI）的格式。
- ANALYZE
- **MetaMorph Stack (STK):** MetaMorph 軟體使用的堆疊影像格式。

### 特殊格式
- Raw Data
- **Image Sequence:** 將一個資料夾內依序編號的圖片（如 `img_001.tif`, `img_002.tif`...）當作一個影像堆疊來開啟。
- FITS（Flexible Image Transport System）

## 匯入影片檔 (MP4, MOV, AVI)

雖然 ImageJ/Fiji 可以直接開啟某些基本的影片格式，但要支援現代常見的格式（如 MP4, MOV），最穩定的方法是透過 FFmpeg 外掛。

### 步驟一：安裝 FFmpeg 支援 (一次性設定)

FFmpeg 是一個強大的多媒體函式庫，安裝它能讓 Fiji 具備處理幾乎所有影片格式的能力。

1.  開啟 Fiji。
2.  執行 `Help > Update...`。
3.  在 Updater 視窗中，點擊左下角的 `Manage update sites` 按鈕。
4.  在更新站點列表中，找到並**勾選** `FFMPEG`。
5.  點擊 `Close` 按鈕返回 Updater 主視窗。
6.  點擊 `Apply changes` 按鈕，Fiji 會自動下載並安裝 FFmpeg 相關檔案。
7.  安裝完成後，**重新啟動 Fiji** 以完成安裝。

### 步驟二：匯入影片

安裝完 FFmpeg 支援後，就可以輕鬆匯入影片了。

1.  執行 `File > Import > Movie (FFmpeg)...`。這個選項在安裝外掛後才會出現。
2.  在彈出的檔案選擇對話框中，找到並開啟你的影片檔 (如 `.mp4`, `.mov`, `.avi` 等)。
3.  ImageJ 會顯示一個選項對話框，你可以設定：
    *   `Use Virtual Stack`：處理長影片或高解析度影片時勾選此項。它不會一次將整個影片載入記憶體，而是需要時才讀取對應的影格，可以避免記憶體不足的問題。但有些影片格式無法被支援用Virtual stack載入。
    *   `Frame range`：可以指定要匯入的影格範圍，例如只匯入第 100 到 200 格。
4.  點擊 `OK`。影片會被匯入成一個影像堆疊 (Image Stack)，其中影片的每一「格」(frame) 都會成為堆疊中的一個「切片」(slice)，可供後續進行分析。

## 匯入與匯出操作

### 檔案匯入（File Import）
1.  **`File > Open` 或 拖放檔案:** 最簡單的方式，適用於標準格式如 TIFF, JPEG, PNG。對於複雜的科學影像，可能會遺失部分元數據。
2.  **`File > Import > Bio-Formats`:** **強烈推薦**用於所有科學影像（特別是顯微鏡或醫學影像）。它能最完整地讀取影像的維度（Z-stack, Time-series）、通道和元數據。
3.  **`File > Import > Image Sequence...`:** 當你有一系列單張圖片（例如來自縮時攝影或連續切片）且檔名有數字順序時使用。

### 檔案匯出（File Export）
1.  **`File > Save As > Tiff...`:** 將當前影像或堆疊儲存為單一的TIFF檔案。這是保存分析結果最推薦的方式。
2.  **`File > Save As > Image Sequence...`:** 將影像堆疊中的每一張切片（slice）儲存為獨立的、帶有編號的圖片檔案。
3.  **`File > Save As > [其他格式]`:** 可儲存為 JPEG, PNG 等，但請注意有損壓縮可能影響數據準確性。

## 格式選擇建議

### 保存原始數據
- **永遠使用無損格式**，首選 **TIFF**。
- 確保保留原始的**位元深度（Bit Depth）**，例如 16-bit 影像不要存成 8-bit，以免損失動態範圍。
- 盡可能保留**元數據（Metadata）**，它包含了重要的實驗參數。

### 分享與發布
- 考慮檔案大小與相容性
- 選擇通用格式：**PNG**（無損）或高品質的 **JPEG**（有損）。
- 注意壓縮品質設定
- **警告：** 除非只是為了視覺展示，否則不要用 JPEG 格式的影像進行任何後續的定量分析。

### 特殊應用
- **多維度資料：** 使用支援多維度的格式，如 OME-TIFF（可透過 Bio-Formats 匯出）。
- **連續影像：** 可存成 Image Sequence 或 AVI 影片。
- **大型檔案：** 考慮使用 Fiji 的 `Virtual Stack` 功能，它只在需要時載入部分影像到記憶體，避免記憶體不足。

## 實作練習

### 練習 1：檔案格式轉換與比較

**目標：** 學習如何將專業的醫學影像格式（DICOM）匯入ImageJ，並轉換為通用的無損格式（TIFF），同時了解兩者在檔案大小和元數據（Metadata）上的差異。

**步驟：**

1.  **下載範例檔案**
    *   請點擊此連結下載公開的DICOM範例檔案集：[DICOM files](https://www.rubomedical.com/dicom_files/index.html)
    *   請下載第一個 **DEMO 0002 (1702 Kb)**。
    *   下載後，請將其解壓縮。你會看到一個包含 `.dcm` 檔案的資料夾。

2.  **匯入 DICOM 序列**
    *   開啟 ImageJ/Fiji。
    *   點選 `File > Import > Bio-Formats` 匯入檔案。

3.  **查看元數據 (Metadata)**
    *   在影像視窗被選中的狀態下，執行 `Image > Show Info...`。
    *   你會看到非常詳細的醫學資訊，如病患ID、掃描參數等。

4.  **轉換為 TIFF 格式**
    *   在影像視窗被選中的狀態下，執行 `File > Save As > Tiff...`。
    *   選擇一個儲存位置，將檔案命名為 `test.tif`，然後儲存。

### 練習 2：影像序列的匯入與匯出

**目標：** 學習如何將影像堆疊拆分為影像序列，再將其重新組合。

**步驟：**

1.  **匯出為影像序列**
    *   使用上一個練習開啟的影像堆疊（如果已關閉，請重新開啟 `MR-head.tif`）。
    *   執行 `File > Save As > Image Sequence...`。
    *   在對話框中，選擇 PNG 格式，並為檔案命名（例如 `slice_`）。
    *   建立一個新的資料夾來存放這些序列圖檔，然後按「OK」。

2.  **檢查輸出**
    *   打開你剛才建立的資料夾，你會看到一系列命名為 `slice_0001.png`, `slice_0002.png`... 的獨立圖片檔案。

3.  **重新匯入影像序列**
    *   關閉 ImageJ 中所有開啟的影像。
    *   執行 `File > Import > Image Sequence...`。
    *   導航到你存放序列圖檔的資料夾，選擇第一張圖片（`slice_0001.png`），然後按「開啟」。
    *   ImageJ 會自動偵測到這是一個序列，並將所有圖片重新組合成一個影像堆疊。

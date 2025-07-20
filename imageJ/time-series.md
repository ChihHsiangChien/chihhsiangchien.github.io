# 時間序列影像的定量與動態分析

## 簡介
時間序列（Time-series / Time Lapse）影像分析是研究動態生物過程（如細胞行為、分子運動等）的重要工具，能夠揭示時間相關的生物學現象。本文件將介紹時間序列影像的採集、處理、定量分析及動態變化的研究方法，特別著重於 ImageJ 等工具的應用。

## 基本概念

### 時間序列影像資料結構
時間序列影像是多維度資料，通常包含以下維度：

#### 時間維度 (Time Dimension)
    - 定義：按固定時間間隔採集的影像序列。
    - 採集參數：時間解析度（例如：每秒、每分鐘、每小時）。
    * 例子：
     - 細胞分裂過程：每30秒拍攝一張，持續24小時。
     - 神經元活動：每100ms記錄一次鈣離子訊號，持續10分鐘。
     - 胚胎發育：每小時拍攝一次，持續72小時。

#### 空間維度 (Spatial Dimension)
    - 定義：影像的平面解析度。
    - 採集參數：空間解析度（例如：像素大小、視野範圍）。
    * 例子：
     - 組織切片：2048x2048像素，覆蓋500x500微米區域。
     - 單細胞追蹤：1024x1024像素，視野包含50-100個細胞。
     - 亞細胞結構：512x512像素，解析線粒體動態。

#### 通道維度 (Channel Dimension)
    - 定義：同時採集的不同螢光或其他訊號通道。
    * 例子：
     - 細胞成像：DAPI（核染）+ GFP（目標蛋白）+ RFP（細胞骨架）。
     - 神經科學：GCaMP（鈣離子）+ mCherry（細胞標記）。
     - 組織分析：FITC（血管）+ TRITC（纖維）+ Cy5（免疫細胞）。

#### 影像堆疊 (Image Stack / Z Dimension)
    - 定義：在不同深度（Z軸）採集的影像序列，用於3D分析。
    * 例子：
     - 3D細胞培養：50張Z層面，每層間隔0.5微米。
     - 組織掃描：100張切片，每片厚度5微米。
     - 活細胞成像：30個時間點，5個Z層面，3個螢光通道 (形成5D影像)。

### 應用領域
- 細胞遷移與趨化性
- 細胞生長、分裂與凋亡動力學
- 螢光動力學（如 FRAP、光轉換）
- 細胞或亞細胞結構的形態變化
- 組織發育與形態發生
- 神經元活動（如鈣離子成像）

### 資料管理
1.  **檔案格式**:
    - 支援多維度資料格式（如 TIFF, OME-TIFF）。
    - 使用 Bio-Formats 等工具讀取多種顯微鏡廠商格式。
    - 保留重要的中繼資料 (Metadata)，如像素大小、時間間隔、通道訊息。
2.  **資料組織**:
    - 維持清晰的檔案命名與儲存結構。
    - 在 ImageJ 中正確設置影像屬性：
      ```
      // 使用 Bio-Formats 匯入影像並讀取 Metadata
      run("Bio-Formats Importer");

      // 或手動設置時間資訊 (如果 Metadata 不完整)
      run("Properties...", "channels=3 slices=50 frames=30 interval=10 unit=sec");
      ```

## 影像預處理

### 基本校正
1.  **影像對齊 (漂移校正)**:
    - 目的：校正因樣本移動或顯微鏡不穩定造成的影像間位移。
    - 方法：StackReg, Linear Stack Alignment, TurboReg 等。  
    - ImageJ 指令範例：  
    ```
      // 使用 StackReg 進行平移校正
      run("StackReg", "transformation=Translation");
    ```
2.  **背景校正**:
    - 目的：去除或校正不均勻的光照、自發螢光或隨時間變化的背景訊號。
    - 方法：背景減除 (Rolling Ball, Sliding Paraboloid), 時間漂移校正。
    - ImageJ 指令範例：
    ```
      // 滾動球背景減除
      run("Subtract Background...", "rolling=50 stack");
    ```

### 訊號優化
-   **對比度增強**: 調整影像的明暗對比，使目標物更清晰。
-   **雜訊抑制**:
    - 方法：時域濾波 (Temporal filtering), 空域濾波 (Spatial filtering), 中值濾波 (Median filter), 高斯濾波 (Gaussian filter)。
    - 選擇：中值濾波對椒鹽雜訊效果好且保邊，高斯濾波對高斯雜訊效果好但會模糊邊緣。
-   **光漂白校正 (Photobleaching Correction)**: 校正因長時間曝光導致螢光強度衰減的現象。
-   **訊號標準化**: 將訊號強度調整到可比較的範圍，例如進行比例成像 (Ratiometric imaging) 或正規化處理。

## 動態分析方法

### 運動分析 (Motion Analysis)
-   **物件追蹤 (Object Tracking)**:
    - 方法：手動追蹤 (Manual Tracking), 自動/半自動追蹤 (e.g., MTrack2, TrackMate), 多物件追蹤。
    - ImageJ 指令：
    ```
    run("MTrack2");
    ```        
    或是
    ```    
    run("Manual Tracking");
    ```        
    

2.  **軌跡分析 (Trajectory Analysis)**:
    - 分析追蹤得到的軌跡數據。
    - ImageJ plugins - Chemotaxis and Migration Tool 分析遷移特性：
    ```      
      run("Chemotaxis Tool");
    ```
3.  **運動參數計算**:
    - 速度 (Velocity)
    - 加速度 (Acceleration)
    - 方向性 (Directionality) / 角度變化
    - 持續性 (Persistence)
    - 均方位移 (Mean Squared Displacement, MSD) 分析 (用於研究運動模式，如隨機擴散、定向運動)

### 強度分析 (Intensity Analysis) / 螢光動力學 (Fluorescence Dynamics)
1.  **基本強度測量**:
    - 測量特定區域 (ROI) 內訊號強度隨時間的變化。
    - ImageJ 指令範例：
```
      // 設置要測量的參數
      run("Set Measurements...", "mean standard integrated stack display redirect=None decimal=3");

      // 對 ROI 進行 Z 軸 (時間軸) 強度剖面分析
      roiManager("Add"); // 先將 ROI 加入 ROI Manager
      run("Plot Z-axis Profile");

      // 繪製多個 ROI 的時間強度曲線
      run("Multi Plot");
```
2.  **螢光漂白恢復 (FRAP) 分析**:
    - 應用：研究分子的流動性、結合/解離動力學。
    - 分析：漂白後螢光恢復曲線、恢復半衰期、移動分數 (Mobile Fraction)、擴散係數。
    - 需進行光漂白校正。
3.  **光轉換 (Photoconversion) / 光活化 (Photoactivation) 分析**:
    - 應用：追蹤特定分子或細胞群的動態、蛋白質半衰期。
    - 分析：光轉換/活化前後的訊號變化、分子時空分布。
4.  **訊號變化分析**:
    - 強度變化模式 (例如：振盪、瞬時反應)。
    - 週期性分析 (Periodicity Analysis)。
    - 相位分析 (Phase Analysis)。
    - 相關性分析 (Correlation Analysis) (例如：不同通道訊號間的相關性)。

### 形態分析 (Morphology Analysis)
1.  **形態參數測量**:
    - 面積 (Area) 變化
    - 周長 (Perimeter) 變化
    - 形狀因子 (Shape Factors, e.g., Circularity, Aspect Ratio) 變化
    - 方向性 / 角度 (Orientation) 變化
2.  **生長與動態分析**:
    - 細胞/群落生長曲線。
    - 細胞分裂事件檢測。
    - 細胞凋亡檢測。
    - 群落擴張分析。

## 資料處理與分析

### 資料提取
-   從影像序列中提取定量數據。
-   數據類型：時間序列強度數據、物件座標數據、形態參數數據。
-   ImageJ 指令範例：
    ```
    // 將測量結果儲存為 CSV 檔案
    saveAs("Results", "time_measurements.csv");
    ```

### 資料分析
-   **趨勢分析**: 分析數據隨時間的變化趨勢。
-   **統計檢驗**: 比較不同條件或時間點的數據差異 (e.g., t-test, ANOVA)。
-   **相關性分析**: 分析不同參數之間的關聯性。
-   **週期性檢測**: 尋找數據中的週期性模式。
-   **變異性分析**: 評估數據的波動或穩定性。

## 結果展示與輸出

### 資料可視化
1.  **圖表生成**:
    - 時間曲線 / 時序圖 (Time course plots)
    - 軌跡圖 (Trajectory plots)
    - 玫瑰圖 (Rose plots, 用於方向性分析)
    - 熱圖 (Heatmaps, 用於展示強度或參數的時空分布)
    - 3D/4D 視圖 (用於多維度資料展示)
2.  **動態展示 / 影片製作**:
    - 創建 AVI 或其他格式的影片。
    - 添加時間標記、比例尺、ROI 疊加、註解等。
    - ImageJ 指令範例：
    ```
      // 設置動畫選項
      run("Animation Options...");

      // 創建 AVI 影片
      run("Create AVI..."); // 或其他儲存影片的指令
    ```

### 結果輸出
1.  **數據導出**:
    - CSV 格式
    - Excel 格式
    - 包含統計結果的報告
    - 處理後的圖像序列
2.  **文檔記錄**:
    - 記錄使用的分析參數。
    - 記錄完整的處理流程 (Workflow)。
    - 保存分析結果與圖表。
    - 進行品質控制 (Quality Control) 記錄。

## 進階技術與批次處理

### 批次處理與自動化分析
-   **自動化工作流程**:
    - 使用 ImageJ 巨集 (Macro) 或腳本 (Scripting) 編寫自動化分析流程。
    - 設定標準化參數。
    - 自動輸出結果。
-   **高通量分析**:
    - 處理多個時間序列數據集。
    - 考慮使用平行運算加速處理。
    - 整合來自多個實驗的結果。
    - 自動生成分析報告。

### 多維度分析
-   **4D/5D 分析**: 整合時間、Z軸、多通道資訊進行分析。
-   **立體重建與動態可視化**。
-   **關聯分析**: 分析多個參數之間、不同事件之間、或不同物件之間的時空關聯與模式。
-   **網絡分析**: 研究細胞間或分子間的相互作用網絡。

### 機器學習應用
-   **自動追蹤與分割**: 利用深度學習模型 (e.g., U-Net, StarDist) 進行更精確的細胞分割與追蹤。
-   **物件檢測與軌跡預測**。
-   **行為分類**: 自動識別和分類不同的細胞運動或行為模式。
-   **模式識別**: 識別複雜的時序模式、檢測異常事件、進行分類預測。

## 應用實例

### 案例 1：細胞遷移分析
1.  **實驗設置**: 設定合適的時間間隔、多視野採集、控制環境（溫度、CO2）。
2.  **分析流程**: 細胞分割 -> 物件追蹤 -> 軌跡分析。
    ```
    // 示例：手動追蹤後進行趨化性分析
    run("Manual Tracking");
    run("Chemotaxis Tool");
    ```
3.  **結果分析**: 計算遷移速度、方向性指數、持續性，分析群體行為。

### 案例 2：鈣離子動力學
1.  **數據採集**: 使用鈣離子指示劑（如 GCaMP），進行快速採集，觀察刺激反應。
2.  **分析步驟**: ROI 定義 -> 時間序列強度測量 -> 訊號正規化 (e.g., ΔF/F0) -> 峰值檢測與分析。
    ```
    // 示例：測量 ROI 強度並找峰值
    roiManager("Add");
    run("Plot Z-axis Profile"); // 獲取強度數據
    // 可能需要外部工具或腳本進行峰值分析 (e.g., run("Find Peaks"))
    ```
3.  **結果分析**: 分析鈣離子訊號的頻率、幅度、持續時間等。

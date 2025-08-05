# Cellpose-SAM 
* Cellpose-SAM 是一個專為**細胞分割**而設計的深度學習模型，其目標是實現超人類的泛化能力(superhuman Generalization)，使其在各種生物學資料上都能表現出色，即使面對新的實驗、組織或顯微鏡類型所產生的分佈外 (out-of-distribution) 資料也能有效運作。
* 結合了預訓練的 **Segment Anything Model (SAM)**的強大學習能力與 **Cellpose架構**中將知識轉換為分割的優勢。

## 使用方式
Cellpose-SAM的使用方式包含以下幾種

1. 線上使用
    *   到[Cellpose](https://www.cellpose.org/)的官方網站，上傳檔案進行分割
    *   用 [hugging face](https://huggingface.co/spaces/mouseland/cellpose)來進行分割
    *   也可以在colab環境運行，但需要購買運算單元才有GPU可以用。Cellpose-SAM的[github](https://github.com/MouseLand/cellpose)有提供colab範例。
    *   執行後下載**mask**或**outlines**回到本機電腦，在fiji/imagej載入進行分析。
2. 本機使用     
    *   如果本機電腦有GPU，也可以到[github](https://github.com/MouseLand/cellpose)下載安裝本機，利用python環境執行。   


## 核心設計與優勢

Cellpose-SAM 的設計結合了兩個強大框架的優點：

- 基礎模型 SAM 的通用影像理解能力：
    - Cellpose-SAM 利用了預訓練的 Segment Anything Model (SAM) 的變壓器骨幹。SAM 在一個龐大的通用影像資料集 SA-1B 上進行了預訓練，該資料集包含 300,000 張影像和 10.2 百萬個手動標註的感興趣區域 (ROIs)。
    - 這種預訓練讓 SAM 學習到自然影像的通用結構和強大的歸納偏置 (inductive biases)。這些歸納偏置對於分佈外泛化特別有益，尤其是在僅用有限資料進行微調時，使得模型能夠「理解」其被要求執行的任務。
    - 為了適應生物影像，Cellpose-SAM 對 SAM 的編碼器進行了修改，例如將輸入影像尺寸從 1024x1024 縮減到 256x256，並將 patch 大小從 16x16 縮小到 8x8，同時將局部注意力層改回全局注意力。
- Cellpose 框架在生物分割上的專長：
    - Cellpose-SAM 結合了 SAM 強大的影像編碼器與 Cellpose 框架的獨特優勢。儘管 SAM 提供了卓越的影像編碼能力，但它在密集影像分割方面存在設計上的弱點。
    - Cellpose 框架擅長將知識轉化為精確的分割結果。它使用一個 U-Net 類神經網路來預測向量流（flow vectors），作為分割的中間表示。這種機制被證明比其他如基於提示 (prompt-based) 的分割框架更適合生物分割任務，並且在從知識到實際分割結果的轉換方面表現出色。Cellpose-SAM 直接從 SAM 編碼器的輸出預測 Cellpose 的向量流場，捨棄了 SAM 的解碼器模組，從而簡化了密集分割的流程。
## 訓練資料與穩健性(robust)
Cellpose-SAM 的訓練策略旨在最大化其泛化能力和對現實世界影像變異的穩健性：

- 綜合性生物影像資料集：
    - 在以 SAM 預訓練權重初始化的基礎上，Cellpose-SAM 在一個更新且整合的細胞與細胞核資料集上進行了進一步訓練。
    - 這個龐大的訓練資料集包含了 22,826 張訓練影像和總計 3,341,254 個手動標註的感興趣區域 (ROIs)。它整合了目前主要的公開生物影像資料集，包括：
        - Cellpose (更新版)
        - Cellpose Nuclei
        - TissueNet
        - LiveCell
        - Omnipose (螢光和相位差顯微鏡影像)
        - YeaZ (明場和相位差酵母細胞影像)
        - DeepBacs (多種細菌的明場和螢光影像)
        - Neurips 2022 挑戰資料集 (手動選取子集)
        - 多個細胞核分割資料集：MoNuSeg, MoNuSAC, CryoNuSeg, NuInsSeg, BCCD, CPM 15+17, TNBC, LynSec, IHC TMA, CoNIC, PanNuke。
- 增強robust的資料增強技術：
    - 為了應對顯微鏡影像中常見的各種挑戰，Cellpose-SAM 在訓練時融入了多種資料增強 (data augmentations) 技術，使其對影像操作和降級表現出強大的穩健性，從而簡化了使用者操作：
        - 通道順序不變性：訓練時隨機置換影像通道的順序，使模型對通道順序完全不變。使用者無需指定哪個通道代表何種染劑。
        - 細胞大小不變性：模型在訓練時使用了從 7.5 到 120 像素的廣泛細胞直徑範圍的影像，使其能夠原生運行於各種解析度的影像上，無需使用者預先指定細胞直徑或依賴額外的細胞大小估計模型。
        - 對影像降級的穩健性：Cellpose-SAM 在訓練時加入了顯微鏡影像中常見的降級現象，例如泊松雜訊 (Poisson noise)、像素大小改變/影像降採樣 (downsampling) 以及等向性與非等向性模糊 (isotropic and anisotropic blur)。這使得 Cellpose-SAM 無需額外的影像恢復步驟即可獲得最佳性能。
        - 其他標準增強：包括隨機旋轉、翻轉、縮放、裁剪、轉換為灰度圖、反轉對比度、隨機丟棄通道，以及亮度/對比度擾
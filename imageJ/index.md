# ImageJ入門

- [ImageJ安裝與配置](installation.md)
- [數位影像基礎知識](digital-image-basics.md)
- [從像素到微米：基礎測量與校正](from-pixels-to-microns.md)
- [從葉片學分析：空間校正、色彩空間與分割技巧](leaf-analysis-and-color-spaces.md)
- [多目標測量：ROI管理器與形態學分析](embryo-analysis.md)
- [螢光強度定量：分析細胞核/質的訊號分佈](fluorescence-quantification.md)
- [進行 MRI 影像分割：分離頭骨與腦組織](mri-segmentation.md)
- [粒子分析](particle-analysis.md)
- [影像堆疊與序列](image-stacks.md)
- [ROI選擇與管理](roi-management.md)
- [Z投影](z-projection.md)
- [色彩通道分離與合併](color-channels.md)
- [檔案格式與支援](file-formats.md)


# 影像前處理（Image Preprocessing）

- [影像前處理流程圖](workflowChart.md)  
- [前處理的詳細步驟](imageProcess.md)  
- [雜訊消除](noise-reduction.md)
- [影像校正-濾波與影像增強](image-correction.md)
- [強度校正](intensity-calibration.md)
- [影像增強技術](image-enhancement.md)
- [影像分割](segmentation.md)：把目標區域（例如細胞、器官）分出來。


# 影像分析（Image Analysis）
- 測量（Quantification）：根據特徵進行數值計算，例如細胞面積、細胞數目、血管長度、腫瘤體積等等。
- 特徵擷取：找出分割區域的形狀、大小、強度、紋理等特徵。
    - 把影像裡的圖像資訊轉成數字，這些數字可以被後續統計、機器學習或直接用來做測量。
    - 形狀特徵：面積、周長、圓形度（circularity）、長寬比（aspect ratio）
    - 強度特徵：平均灰階值、最大最小值、標準差（影像亮度或密度變化）
    - 紋理特徵：粗糙程度、規則性（可以用 GLCM 方法計算）
    - 邊界特徵：邊緣鋸齒狀程度、邊界平滑度
    - 拓撲特徵：連通數量（如細胞核數）、空洞數量等等- 影像分類（Image Classification）－將影像或區塊歸類到不同類別（如良性/惡性）。
- [影像紋理分析：大腦灰白質的紋理](image-texture.md)
- [進階分割：腦組織的細部分割 (灰質、白質、腦脊髓液)](mri-tissue-segmentation.md)
- [3D 形態學分析：量化大腦的表面積與複雜度](mri-3d-morphometry.md)
- [自動化流程：撰寫 Macro 腳本完成端到端分析](mri-automation-macro.md)


# 進階影像分析

- [多通道分析](multichannel-analysis.md)
- [時序動態分析](time-series.md)
- [3D重建與影像對位](3d-registration.md)

# 大型影像處理

- [大型影像處理技術](large-image-processing.md)
- [批次處理基礎](batch-processing.md)
- [巨量資料處理策略](big-data-strategy.md)
# plugins應用

- [TrackMate使用指南](trackmate.md)
- [MorphoLibJ應用](morpholibj.md)
- [3D列印模型製作](3d-printing.md)
- [深度學習應用](deep-learning.md)

#  腳本設計與自動化

- [自動化與巨集程式設計](automation-and-macro.md)
- [Python整合指南](python-integration.md)


# 網路文件
- [阿簡 imagej入門課程影片](https://youtu.be/BcTdMkF_cB0?si=s8aBQYIetW7LCAjU)
- [阿簡 imagej教學影片](https://www.youtube.com/playlist?list=PLm6x13NbsKl5So8XGnb4RgvLhrQCVzvnX)
- [阿簡生物筆記](https://a-chien.blogspot.com/search/label/ImageJ)
- [ImageJ實用教程](https://www.zhihu.com/column/c_1069243926476673024)
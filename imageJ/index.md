# ImageJ入門

- [ImageJ安裝與配置](installation.md)
- [檔案格式與支援](file-formats.md)
- [界面介紹與基本操作](interface.md)
- [比例尺設定](scale-bar.md)
- [基本分析工具](basic-analysis.md)
- [粒子分析](particle-analysis.md)
- [影像堆疊與序列](image-stacks.md)
- [ROI選擇與管理](roi-management.md)
- [Z投影](z-projection.md)
- [色彩通道分離與合併](color-channels.md)


# 影像前處理（Image Preprocessing）

- [影像前處理流程圖](workflowChart.md)  
- [前處理的詳細步驟](imageProcess.md)  
- [雜訊消除](noise-reduction.md)
- [影像校正-濾波與影像增強](image-correction.md)
- [影像增強技術](image-enhancement.md)
- [影像分割](segmentation.md)：把目標區域（例如細胞、器官）分出來。


# 影像分析（Image Analysis）
- 特徵擷取：找出分割區域的形狀、大小、強度、紋理等特徵。
    - 把影像裡的圖像資訊轉成數字，這些數字可以被後續統計、機器學習或直接用來做測量。
    - 形狀特徵：面積、周長、圓形度（circularity）、長寬比（aspect ratio）
    - 強度特徵：平均灰階值、最大最小值、標準差（影像亮度或密度變化）
    - 紋理特徵：粗糙程度、規則性（可以用 GLCM 方法計算）
    - 邊界特徵：邊緣鋸齒狀程度、邊界平滑度
    - 拓撲特徵：連通數量（如細胞核數）、空洞數量等等- 影像分類（Image Classification）－將影像或區塊歸類到不同類別（如良性/惡性）。
- 測量（Quantification）：根據特徵進行數值計算，例如細胞面積、細胞數目、血管長度、腫瘤體積等等。
- [影像紋理分析](image-texture.md)


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
# 影像分析方法學流程


## 1. 明確分析目標
1. 定義分析需求：要從影像中提取哪些資訊？（例如細胞數量、粒線體分布、結構形態等）
2. 設定量化指標：確定衡量標準，方便後續驗證結果。
3. 詢問生成式 AI，獲取相關資訊與建議。


## 2. 學習工具使用
- 參考官方文件
    - [imagej docs](https://imagej.net/ij/docs/index.html)
- 觀看教學影片或範例
- 有些plugin沒有提供文件，如何找到操作方法：
  - 查看 plugin source code，使用quick search功能，搜尋功能後點選`source`，會連到github。  
    - 複製程式碼並貼到 AI 工具中，請求解釋其功能與運算邏輯
    - 改網址的`github`為`deepwiki`，則可以直接在 DeepWiki 上查看程式碼，並使用 AI 工具進行分析與提問。如果此程式庫尚未被deepwiki收錄，可以輸入email addresss後，deepwiki會自動indexing並通知你。
        - [imagej的deepwiki](https://deepwiki.com/imagej/ImageJ)
        - [weka trainable segmentation的deepwiki](https://deepwiki.com/fiji/Trainable_Segmentation)
        - [morphoLibj的deepwiki](https://deepwiki.com/ijpb/MorphoLibJ)
        - [trackmate](https://deepwiki.com/trackmate-sc/TrackMate)
        - [3d objects counter的deepwiki](https://deepwiki.com/fiji/3D_Objects_Counter)

## 生成 Macro
- 使用 ImageJ 的 Macro 語言撰寫自動化腳本，利用使用生成式 AI 工具（如 ChatGPT）生成 ImageJ Macro
- 根據需要調整 Macro 以符合特定分析需求
- 將 macro 參數化，例如：將影像路徑、分析參數等設為變數，方便重複使用



# Trainable Weka Segmentation
- [教學影片](https://youtu.be/-4DBJi7QtR8)  
- 執行路徑`Plugins > Segmentation > Trainable Weka Segmentation`  


基於機器學習庫Weka，允許使用者選擇一系列像素特徵（如灰度、邊緣、紋理）並手動標記不同類別的區域（如細胞核、細胞質、背景）作為訓練數據。
然後，它會訓練一個**快速隨機森林分類器**，並用訓練好的模型對整個影像進行像素分類，從而實現分割。
## 步驟

1.  打開影像並啟動Trainable Weka Segmentation插件。
2.  選擇用於訓練的影像特徵。
3.  創建不同的類別（Class）。
4.  使用畫筆工具在影像上標記屬於各個類別的區域作為訓練樣本。
5.  選擇一個分類器。
6.  點擊「Train classifier」進行模型訓練。
7.  點擊「Create result (Plugin)」應用模型到當前影像或批量應用到多個影像。


## 實作範例

- 分類氣孔  
    - [葉片01](img/leaf01.jpg)
    - [葉片02](img/leaf02.jpg)
- [機器學習分割與體積、表面積分析](mri-segmentation.md)
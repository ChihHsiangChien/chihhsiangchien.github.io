# binary 8-bit image 
1. **binary image -> ROI manager**  
    1. 執行` Edit › Selection › Create Selection`可將binary mask image 轉成selection
    2. 在ROI manager按`add`加入

2. **binary image -> labeled image**
    1. ` Analyze › Analyse Particles` show勾選`Count Mask`就會產生Labeled 16-bit image，每個區塊為一個獨特的數字。(此部份可以參考 [特徵擷取](feature-extraction.md)最後的show說明)
    2. 調整顯示顏色
        1. `Image > Lookup Table > glasbey_on_dark`可以改變成隨機顏色
        2. `Plugins › MorphoLibJ › Label Images › Set Label Map`也可以shuffle顏色。

# labeled 16-bit image
1. **labeled image -> binary image**
    1. 轉8-bit
    2. 使用`Image > Adjust > Threshold`擷取需要的區塊。
2. **labeled image ->  roi manager**
    1. 將具有Labels的labeled image 轉入 ROI manager。執行`Plugins › MorphoLibJ › Label Images › Label Map to ROIs`

# ROI manager
1. **ROI manager -> binary image**
    1. 在ROI manger選擇ROI後，執行` Edit › Selection › Create Mask`，即可轉成binary mask image。

2. **ROI manager -> labeled image**  
使用Macro將ROI轉成隨機顯示顏色的labed image
```ijm

// 取得影像大小
width = getWidth();
height = getHeight();

// 建立空白的 16-bit Labeled Image
newImage("Labeled Image", "16-bit black", width, height, 1);
setBatchMode("hide");

// 紀錄 ROI 數量
roiCount = roiManager("count");

// 把每個 ROI 畫上不同的灰階值
for (i = 0; i < roiCount; i++) {
    selectImage("Labeled Image");
    roiManager("select", i);
    setColor(i + 1); // 灰階值從 1 開始
    run("Fill", "slice");
}
setMinAndMax(0, 255);

run("glasbey_on_dark");

// 顯示完成訊息
setBatchMode("show");
```


# 分析血管

[教學影片](https://youtu.be/eA2KTmPswm8)

[血管圖片](img/vessel.tiff)

## 分析需求

圖為血管內皮細胞在Matrigel內形成了微血管網絡，需要分析
1. 血管環數量(中間有一個洞，周圍一圈，就可以稱做一個環)
2. 微血管總長度 (微血管形成的網路所有length的總和)
3. 微血管平均管徑

## 示範Macro

請參考教學影片，逐步執行Macro觀察

```ijm
// 先開啟檔案
run("8-bit");
rename("origin");

// 裁切
makeRectangle(0, 0, 864, 668);
run("Crop");


// 降噪
selectImage("origin");
run("Duplicate...", "title=deNoise ");
run("Gaussian Blur...", "sigma=2");
run("Median...","radius=3");


// 局部對比度增強 CLAHE
selectImage("deNoise");
run("Duplicate...", "title=CLAHE ");
run("Enhance Local Contrast (CLAHE)", "blocksize=63 histogram=256 maximum=3 mask=*None*");

// MorphologicalSegmentaion
selectImage("deNoise");
run("Duplicate...", "title=deNoiseInverse");
run("Invert");
run("Morphological Segmentation");



// 局部threshold
selectImage("CLAHE");
run("Duplicate...", "title=localThreshold");
run("Auto Local Threshold", "method=Niblack radius=15 parameter_1=0 parameter_2=0 white");

// 形態學處理
selectImage("localThreshold");
run("Duplicate...", "title=fillHoles");
run("Fill Holes");


// 產生distance map
selectImage("fillHoles");
run("Duplicate...", "title=Distance");
run("Distance Map");

// 產生Maxima當種子
selectImage("Distance");
run("Find Maxima...", "prominence=10 exclude output=[Point Selection]");
roiManager("Add");


// 血管寬度與長度估算
selectImage("deNoise");
run("Duplicate...", "title=ridge ");
run("Ridge Detection", "line_width=10 high_contrast=150 low_contrast=20 darkline estimate_width extend_line displayresults add_to_manager method_for_overlap_resolution=SLOPE sigma=3.39 lower_threshold=0.51 upper_threshold=1.36 minimum_line_length=0 maximum=0");


/*
// 產生梯度圖
selectImage("deNoise");
run("Duplicate...", "title=edge");
run("Find Edges");
*/



/*
// 降噪更多產生distance map
selectImage("origin");
run("Duplicate...", "title=deNoiseMoreInvert ");
run("Gaussian Blur...", "sigma=2");
run("Median...","radius=2");
run("Auto Local Threshold", "method=Niblack radius=15 parameter_1=0 parameter_2=0 white");
run("Fill Holes");
run("Distance Map");
run("Invert");
run("Enhance Contrast", "saturated=0.35");
*/


```

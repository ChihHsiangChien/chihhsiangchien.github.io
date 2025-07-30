# 實作DEMO

[示範影片](https://youtu.be/yyJqX0Dn2G4)

1.  使用範例圖中的`Dot Blot`，目的要取出圖中的28個圓點放入ROI manager。
2.  你需要使用之前課程學到的知識，並整理後變成一組Macro。
3.  參考的Macro。
```ijm
run("Dot Blot");
run("Auto Local Threshold", "method=Otsu radius=12 parameter_1=0 parameter_2=0 white");
run("Invert");
run("Fill Holes");
run("Open");
run("Close-");
run("Analyze Particles...", "size=250-Infinity circularity=0.65-1.00 show=Outlines add");
```
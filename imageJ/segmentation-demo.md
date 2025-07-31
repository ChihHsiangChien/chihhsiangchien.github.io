# 實作DEMO

[示範影片](https://youtu.be/yyJqX0Dn2G4)

1.  使用範例圖中的`Dot Blot`，目的要取出圖中的28個圓點放入ROI manager。
2.  你需要使用之前課程學到的知識，並整理後變成一組Macro。
3.  紀錄自己分析的過程macro，目標是能夠重現你的分析過程，一鍵按下就能重新跑一次分析過程。

**參考的Macro**如下，不會只有一種作法喔!

```ijm
run("Dot Blot");
run("Auto Local Threshold", "method=Otsu radius=12 parameter_1=0 parameter_2=0 white");
run("Invert");
run("Fill Holes");
run("Open");
run("Close-");
run("Analyze Particles...", "size=250-Infinity circularity=0.65-1.00 show=Outlines add");
```

**如何用迴圈執行，將參數寫進命令裡？**
重點在run()的命令中，注意看怎麼用+串接命令？

```ijm
run("Blobs (25K)");
rename("origin");

for (i = 0; i < 10; i++) {
	selectImage("origin");
	rad = 10 + i;
	
	run("Duplicate...", "title=" + rad);

	run("Auto Local Threshold", "method=Otsu radius="+ rad +" parameter_1=0 parameter_2=0 white");

}
run("Tile");


```
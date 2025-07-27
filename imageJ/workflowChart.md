# 影像前處理流程
```{.mermaid}
flowchart TD
    A[彩色影像取得原始影像/幀]-->B1{彩色影像?}
    B1--No --> A3[灰階影像]
    B1--Yes -->B2[轉灰階]
    B2-->A3

    A3 --> BG_Check{需要分離前景與背景?}
    BG_Check -- Yes --> BG_Proc{選擇背景處理方法}
    BG_Check -- No --> 處理全圖

    %% Background Subtraction Path
    BG_Proc -- 提供靜態背景圖 --> BG_Static[靜態背景相減法]
    BG_Proc -- 提供影像序列/影片 --> BG_Model[背景建模 e.g., Median + 相減]
    BG_Static --> FG_Image[取得前景遮罩/影像]
    BG_Model --> FG_Image
    FG_Image --> 處理前景

    TargetImage --> B_opt{需要增強對比度?}
    B_opt -- Yes --> B_enhance[應用對比度增強/標準化]
    B_opt -- No --> B
    B_enhance --> B

    B{大量雜訊？}
    B -- Yes --> C_select{選擇去雜訊方法}
    B -- No --> D{選擇邊緣偵測方法}

    C_select -- 椒鹽雜訊/需保邊 --> C1[Median]
    C_select -- 高斯雜訊/平滑為主 --> C2[Gaussian]    

    C1 --> D
    C2 --> D    

    D --高對比--> F1[Sobel/Scharr]
    D --效果均衡--> F2[Canny]
    D --找細節/斑點--> F3[Laplacian]

    F1 --> G_pre{需要邊緣細化?}
    F3 --> G_pre
    F2 ----> G

    G_pre -- Yes --> G_thin[應用邊緣細化]
    G_pre -- No --> G
    G_thin --> G

    G{邊緣結果清晰、連續？}
    G -- Yes --> H[進行輪廓分析或分割]
    G -- No --> I{主要問題？}

    I -- 雜訊仍過多 --> L[調整濾波參數/換濾波器]
    I -- 邊緣斷裂/不連續 --> J[形態學操作 Closing, Dilation...]
    I -- 邊緣太粗/太細/不準 --> L2[調整邊緣偵測參數/方法]

    J --> G
    L --> C_select
    L2 --> D

    H --> Z[前處理結束]

    
    
```
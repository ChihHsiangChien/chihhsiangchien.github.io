# TrackMate plugin 應用指南
[教學影片](https://youtu.be/0zI7-LUbDEE)

## TrackMate 影像追蹤教學

本教學文章的資料來源：[TrackMate version 7 novelties.pdf](https://www.biorxiv.org/content/biorxiv/early/2021/09/20/2021.09.03.458852/DC2/embed/media-2.pdf)
TrackMate 是 Fiji 影像處理軟體中一個強大且模組化的外掛程式，專門用於自動化追蹤影像中的粒子或物體，並支援手動校正和半自動追蹤。它將追蹤過程分為幾個主要步驟：

1. 偵測 (Detection)
2. 過濾 (Filtering)
3. 追蹤 (Tracking)
4. 分析/顯示 (Analysis/Display)


### 1. 環境設定與啟動 TrackMate
**啟動 TrackMate** ：執行 `Plugins > Tracking > TrackMate`。

---

### 2. 初始面板：檢查影像校準與維度

- **空間與時間校準**：確認影像的像素大小（例如微米 µm）和幀間時間（例如分鐘 min）是否正確。 如果校準不正確，建議在 TrackMate 之外，透過 `Image > Properties`  在 Fiji 中修改影像的metadata，然後回到 TrackMate 面板點擊 `Refresh source` 按鈕來更新資訊。
- **影像維度**：確認影像維度是否正確（例如 2D 序列影像或 3D Z-stack）。
- **定義處理區域**：你可以選擇影像中的一個 ROI (Region of Interest) 來定義 TrackMate 進行偵測的子區域。這有助於加速參數測試，特別是在處理大型影像時。


---

### 3. 選擇偵測演算法 (Select a Detector)

TrackMate 提供多種偵測演算法來識別影像中的物體。偵測器負責找出影像中的**點(Spots)** 或**輪廓**，並為其提供基本的數值特徵，例如座標、半徑和品質。

- **DoG detector**
    - 檢測圖像中亮點(bright blobs)的檢測器，基於高斯差分的檢測器，計算兩個不同sigma值的高斯濾波器差值來近似LoG濾波器。
    - 特別適合**小尺寸點的檢測（< ~5像**素）**，計算在直接空間進行，速度較快。 

- **Hessian detector**
    - 檢測亮點(bright blobs)的檢測器，基於計算圖像的Hessian矩陣行列式來工作。
    - Hessian detector相比LoG detector具有更好的邊緣響應消除能力，特別適合檢測具有強邊緣的圖像中的點。

- **Label-Image detector (標籤影像偵測器)**：從標籤影像中建立物體。標籤影像中每個物體由不同的整數值表示，這有助於分離接觸的物體。

- **LoG detector**
    - 使用拉普拉斯高斯濾波器來檢測blob狀結構，適合檢測各種尺寸的blob狀結構，對於**大點檢測或需要高精度**表現更好，計算在傅立葉空間進行。

- **Manual annotation**

- **Mask detector (遮罩偵測器)**：從二值化遮罩影像中建立物體。物體由像素值大於 0 的連通區域組成。通常會將遮罩作為原始影像的一個額外通道。

- **Thresholding detector (閾值偵測器)**：從灰階影像中，根據指定閾值來分割物體。

以下有安裝其他外掛才會出現

- **TrackMate-MorphoLibJ**：利用 MorphoLibJ 庫中的 Morphological Segmentation
- **TrackMate-Ilastik**
- **TrackMate-StarDist**：利用 StarDist 深度學習模型進行細胞核等物體分割
- **TrackMate-Weka**：利用 Trainable Weka Segmentation 外掛程式來分割物體

---

### 4. 偵測器配置面板

#### LoG Detector (Laplacian of Gaussian)
- Target Channel: 選擇要偵測的通道，預設值為1
- Radius: 預期斑點半徑，預設值為5.0
- Threshold :品質閾值，低於此值的斑點將被濾掉，預設值為0
- Median Filtering：是否進行**中值濾波**預處理，預設為false
- Sub-pixel Localization : 是否進行亞像素定位，預設為true

#### DoG Detector (Difference of Gaussian)
- DoG偵測器與LoG偵測器 使用相同的設定參數

#### Hessian Detector
- Target Channel: 目標通道選擇 
- Radius XY : XY方向半徑
- Radius Z : Z方向半徑，預設值為8.0
- Threshold: 品質閾值 
- Normalize: 是否標準化品質值到0-1範圍，預設為false
- Sub-pixel Localization: 亞像素定位

#### Threshold Detector
- Target Channel: 目標通道
- Intensity Threshold: 強度閾值
- Simplify Contours: 是否簡化輪廓

#### Label Image Detector
- 與Threshold Detector設定大部分相同，但不設定強度閾值

#### Mask Detector

- Mask Channel：指定遮罩影像所在的通道。例如，如果你的原始影像有兩個通道，第二個通道是遮罩，則選擇 Channel 2。
- Simplify contours (簡化輪廓)：
    - 當偵測器獲得物體輪廓時，勾選這個選項會產生一個更平滑、包含更少線段的簡化形狀。
    - 優點：生成更小的 TrackMate 文件，更重要的是，可以產生更準確的形態特徵，因為像素級的輪廓會高估周長，進而影響相關的形態特徵。
    - 建議在物體足夠大（通常大於 10 個像素）時使用此選項，否則簡化可能導致輪廓不準確。

---

### 5. 偵測處理與初始點過濾(Initial thresholding)

- **初始點過濾 (Initial Spot Filtering)**：
    - 偵測完成後，會進入「初始點過濾」步驟。
    - 此步驟的目的是在計算所有點的詳細特徵之前，根據「品質 (Quality)」值篩選掉大量不相關的點，以節省記憶體和計算時間。
    - 偵測器會為每個點分配一個「品質」值，反映偵測結果的可靠性。
    - quality是一個數值特徵，反映了detector對該spot檢測結果的信心程度。較高的quality值通常表示該spot更可能是真實的目標物體而非噪聲。不同的detector會用不同的方法計算quality，但都遵循"越高越好"的原則。你可以根據品質的直方圖手動設定一個閾值。低於此閾值的點將被完全丟棄。
    - 對於大多數簡單的案例，可以將閾值條保持在接近 0 的位置


---

### 6. 選擇顯示方式

此面板讓你選擇追蹤結果的顯示方式：

- **HyperStack Displayer **：將追蹤結果非破壞性地疊加在 Fiji 的影像堆棧視窗上。建議選擇此模式，因為它更輕量、更簡單，並且允許直接在影像上進行手動編輯。


---

### 7. 點過濾 (set filter on spot)

這個面板允許你根據偵測到的點的數值特徵（例如大小、形狀、位置或訊號強度）來進一步篩選點。

- **添加過濾器**：點擊綠色 `+` 按鈕來添加一個新的過濾器。
- **選擇特徵**：從下拉選單中選擇你想要過濾的特徵，例如 Area (面積)、Mean intensity (平均強度) 或 Circularity (圓度)。
    - 範例：如果你的影像中有許多小雜訊點，你可以添加一個 Area (面積) 過濾器，並設定為 Above (大於) 一個特定值，以移除過小的物體。
- **調整閾值**：你可以直接在直方圖中拖曳閾值條，或者在文字欄位中輸入精確值。影像中的顯示會即時更新。
- 你可以堆疊多個過濾器，TrackMate 會取交集保留滿足所有條件的點。

---

### 8. 選擇追蹤演算法 (select a tracker)

此面板讓你選擇粒子追蹤的演算法，即「追蹤器」(Tracker)。追蹤器會將偵測到的點連結起來，形成完整的軌跡 (Tracks)。

- **[LAP trackers](https://imagej.net/plugins/trackmate/trackers/lap-trackers)**：LAP 追蹤器，基於線性分配問題 (LAP，Linear Assignment Problem)。適用於**布朗運動的粒子**，在粒子密度不高時也適用於非布朗運動。
    - **Simple LAP tracker** (簡單 LAP 追蹤器)：處理**間隙閉合 (gap-closing)** 事件（粒子在某個frame消失，到幾個frame之後又出現），不處理粒子分裂 (splitting)或合併 (merging) 事件。連結成本僅基於點之間的距離。
    - **LAP tracker** (LAP 追蹤器)：允許偵測所有類型的事件，包括**間隙閉合、分裂和合併事件**。可根據物體特徵值差異來調整連結成本。

- **[Kalman tracker](https://imagej.net/plugins/trackmate/trackers/kalman-tracker)**：基於**Kalman filter**去預測**等速**粒子移動的軌跡。
    - 能夠處理 occlusion（遮擋事件），例如被其他細胞遮擋。
    - Kalman filter 建立的是「動態模型」，預測物件在無觀測時的合理位置。即使某些影格沒有偵測到實體，Kalman 仍能依據上一狀態與速度估計，持續推進軌跡。能容忍短暫消失的物件或是掃描過程中的 detection failure。
- Advanced Kalman tracker
- **[The Overlap tracker](https://imagej.net/plugins/trackmate/trackers/kalman-tracker)**: 適用於複雜的形狀且有限的移動速度，基於圖像中物件的**空間重疊程度（pixel/region overlap）**來建立軌跡，
    - 適用情景如移動距離小於其直徑的大型物體。（[教學範例的爪蟾細胞移動](https://imagej.net/plugins/trackmate/detectors/trackmate-morpholibj)）。
    - 或是([教學範例的乳癌細胞移動](https://imagej.net/plugins/trackmate/detectors/trackmate-cellpose))，細胞往下移動，而有些新細胞會從影像上方出現。
- **The Nearest-Neighbor tracker**：最近鄰居搜索追蹤器，此幀中的每個物體連結到下一幀中最近的物體。


---

### 9. 追蹤器配置面板

#### LAP 追蹤器參數

- **Frame to Frame linking (幀到幀連結)**
    - Max distance (最大距離)：設定在兩幀之間連結兩個物體的最大允許距離。如果兩個點之間的距離超過此值，它們將不會被考慮連結。
    - Feature penalties (特徵懲罰)
- **Gap closing (允許間隙閉合)**
    - Allow gap closing (允許間隙閉合)勾選此選項，允許軌跡在物體短暫消失後重新連結。
    - Max distance (最大距離)：間隙閉合的最大距離。
    - Max frame gap (最大幀間隙)：物體消失的最大幀數，超過此幀數將不會被連結。
- **Track splitting (允許軌跡段分裂)**
    - Allow track segment splitting勾選此選項以偵測分裂事件，例如細胞分裂。
    - Max distance (最大距離)：分裂事件的最大距離。
    - Feature penalties for splitting
- **Track merging (允許軌跡段合併)**
    - Allow track segment merging勾選此選項以偵測合併事件。
    - Max distance (最大距離)：合併事件的最大距離。
    - Feature penalties for merging
- **Feature penalties (特徵懲罰)**：可以根據物體的特徵值差異來調整連結成本，例如懲罰平均強度差異大的連結。tracker在連接spots時不僅考慮空間距離，還能根據物體的特徵差異來調整連接成本。 TrackerKeys.java:83-96 這些特徵可以包括亮度、大小、形狀等物理屬性。當兩個spots的特徵差異較大時，連接成本會相應增加，使tracker傾向於選擇特徵相似的spots進行連接。在實際使用中，如果沒有設定feature penalties，系統會回退到使用純距離的成本函數。


#### Simple LAP參數
- Linking max distance (連接最大距離)
- Gap-closing max distance (間隙閉合最大距離)
- Gap-closing max frame gap (間隙閉合最大幀間隔)


#### Kalman Tracker / Advanced Kalman Tracker參數
Kalman濾波器的設定

- Initial search radius (初始搜索半徑)
- Search radius (搜索半徑)
- Max frame gap (最大幀間隔)
- Feature penalties
- Splitting和merging設定

#### Nearest Neighbor Tracker參數
- Maximal linking distance (最大連接距離)

---

### 10. 軌跡過濾 (set filter on tracks)

追蹤完成後，你會進入「軌跡過濾」面板，可以根據軌跡的屬性（例如長度、速度或位置）移除不相關的軌跡。你可以添加多個過濾器，例如 Track duration (軌跡持續時間)，設定一個閾值來移除過短的軌跡（例如，移除那些進出視野的細胞）。

---

### 11. 顯示選項 (Display Options)

此面板讓你自訂點和軌跡的顯示方式。

- **Display spots (顯示點)** 和 **as ROIs (作為 ROI)**：勾選這些選項以顯示偵測到的物體及其輪廓。
- **Color spots by (點的顏色依據)**：你可以根據點的任何數值特徵，例如 Mean intensity (平均強度) 或 Area (面積) 來設定其顏色，以便視覺化不同特徵值的點。
- **Display tracks (顯示軌跡)**：勾選此選項以顯示軌跡。
- **Show tracks (軌跡顯示模式)**：你可以選擇軌跡的顯示模式，例如 Show tracks forward in time (向前顯示軌跡)，這會顯示物體未來的移動軌跡。
- **Color tracks by (軌跡的顏色依據)**：你可以根據軌跡的任何數值特徵，例如 Total distance travelled (總移動距離) 或 Track mean speed (軌跡平均速度) 來設定其顏色。
- 點擊 `Edit settings (編輯設定)` 可以進一步調整顯示選項，例如繪製填滿的點 (draw spots filled) 或線條粗細 (line thickness)。

---

### 12. 匯出結果 (Export Results)

在「顯示選項」面板的底部，你通常會找到匯出結果的按鈕。

- **匯出 CSV 文件**：點擊 `Tracks (軌跡)` 按鈕，你可以選擇匯出 Spots (點)、Edges (連結) 和 Tracks (軌跡) 的數值特徵資料為 `.csv` 文件。這些文件可以用於其他軟體（如 MATLAB）進行進一步分析。

---

### 13. 繪製特徵圖 (Plot Features)

此面板允許你將點、連結或軌跡的任何數值特徵繪製成圖表。

- **選擇 X 軸和 Y 軸特徵**：例如，你可以將 T (時間) 作為 X 軸，Area (面積) 或 Circularity (圓度) 作為 Y 軸，以觀察細胞大小或形狀隨時間的變化。
- 你可以同時繪製多個 Y 軸特徵。
- 點擊 `Plot features (繪製特徵)` 按鈕生成圖表。右鍵點擊圖表可以匯出為 PDF、PNG、SVG 影像或 CSV 數據。

---

### 14. 執行動作 (Actions)

這是 TrackMate 工作流程的最後一個面板，你可以在此執行各種最終操作。

- **Capture overlay (捕捉疊加影像)**：從下拉選單中選擇此動作，可以將追蹤結果疊加到原始影像上，並匯出為視訊或靜態影像。
    - 選擇此動作後，點擊 `Execute (執行)`，彈出視窗中你可以定義要保存的時間間隔。TrackMate 將生成一個帶有追蹤疊加的視訊。
    - 記得將生成的影像/視訊保存到你的電腦上 (`File (檔案) > Save as...`)。

---

### 15. 手動編輯 (Manual Editing)

即使自動追蹤的結果很好，在複雜情況下仍可能需要手動校正。

- TrackMate 允許你手動建立、編輯、移動或刪除點和連結，以及調整點的半徑。
- 在 HyperStack Displayer 中編輯點：
    - `A` 鍵：在滑鼠位置新增一個點。
    - `D` 鍵：刪除滑鼠下的點。
    - `Space` (按住) + 滑鼠移動：移動滑鼠下的點。
    - `Q` / `E` 鍵：減小 / 增大點的半徑。
- 在 HyperStack Displayer 中建立/刪除連結：
    - 選擇兩個點 (`Shift + Click`)，然後按下 `L` 鍵可以建立或刪除它們之間的連結。
- **TrackScheme 工具**：TrackScheme 是一個專門用於軌跡可視化和編輯的工具，它以分層圖的形式顯示軌跡，特別適合編輯細胞譜系。你可以從「顯示選項」面板啟動它。

---



---


## 教學範例
- [mask-detector](https://imagej.net/plugins/trackmate/detectors/trackmate-mask-detector)
- [thresholding-detector](https://imagej.net/plugins/trackmate/detectors/trackmate-thresholding-detector)
- [label-image-detector](https://imagej.net/plugins/trackmate/detectors/trackmate-label-image-detector)
- [trackmate-ilastik](https://imagej.net/plugins/trackmate/detectors/trackmate-ilastik)
- [trackmate-morpholibj](https://imagej.net/plugins/trackmate/detectors/trackmate-morpholibj)
- [trackmate-stardist](https://imagej.net/plugins/trackmate/detectors/trackmate-stardist)
- [trackmate-cellpose](https://imagej.net/plugins/trackmate/detectors/trackmate-cellpose)
- [trackmate-cellpose-advanced](https://imagej.net/plugins/trackmate/detectors/trackmate-cellpose-advanced)
- [trackmate-weka](https://imagej.net/plugins/trackmate/detectors/trackmate-weka)


## 範例影像
### [C.elegans胚胎發育](https://zenodo.org/records/5132918)

- 此影像是C. elegans 胚胎影像，是從一個更長的影片中擷取的最大強度投影 (MIP)。 
- 此影像有兩個通道：
    - **第一個通道**：包含原始影像資料，顯示經過 eGFP-H2B 染色並在雷射掃描共焦顯微鏡下成像的 C.elegans 胚胎螢光。可以看到細胞核的移動和分裂，以及兩個較小的極體。
    - **第二個通道**：包含透過以下步驟處理後的訊號分割結果：
        1. 中值濾波 (Median filter)
        2. 高斯濾波 (Gaussian filter)
        3. 簡單的閾值處理 (Plain thresholding)    
- 使用`Mask Detector`
- 使用`LAP tracker`
    - 因為能夠處理**分裂事件 (split events)** 的偵測。極體可能會出現錯誤的分裂，其被錯誤地連接到頂部細胞的影片。可以手動糾正，或根據面積篩選極體。
    - Frame to Frame linking (幀間連結)：設定兩個物體之間連結的最大距離，對於本範例影像，使用 20  (microns)。
    - Allow gap closing (允許間隙閉合)：勾選此方框。設定 Max distance (最大距離) 為 20 微米，Max frame gap (最大幀間隙) 為 5。
    - Allow track segment splitting (允許軌跡片段分裂)：勾選此方框（例如，因細胞分裂引起）。設定 Max distance (最大距離) 為 20 (microns) 。


### [cell migration](https://zenodo.org/records/5220796)

- 使用thresholding detector
- LAP tracker
    - Frame to Frame linking ：maximum distance to link two objects between frames：20 microns.
    - Allow gap closing box ： Max distance: 20 microns and Max frame gap: 4. 
    - Allow track segment splitting and insert value Max distance: 20 microns. 
    - untickedB  Track segment merging    
### [Tracking label images](https://zenodo.org/records/5221424)
- 使用 label image detector
    -  in frame 65 you will see small floating cells that were segmented. add a spot filter to remove anything with an Area lower than 230.    
- LAP tracker        
    - Max distance: 20 microns and Max frame gap: 5.
    - Allow track segment splitting and insert value Max distance: 30 microns.


### [腦膜炎雙球菌的細胞生長Neisseria meningitidis bacterial growths](https://zenodo.org/records/5419619)

- 使用 trackmate-ilastik
- LAP Tracker

### [爪蟾Xenopus的細胞](https://zenodo.org/records/5211585)
- 使用trackmate-morpholibj
- Overlap tracker(直徑大於移動距離，很大顆慢慢走)

### [癌細胞](https://zenodo.org/records/5206107)

- 使用trackmate-stardist
- LAP tracker
### [乳癌細胞](https://zenodo.org/records/5864646)

- 使用 trackmate-cellpose
- 使用 Overlap tracker 優於 LAP tracker，因為細胞往下移動，而有些細胞會從影像上方出現。LAP 可能會誤認為這些新細胞是某個在其下方的細胞「剛剛分裂」所產生的子細胞，結果會導致錯誤的細胞分裂事件。因為LAP 預設以距離最短、分配代價最低為對應依據，不一定能辨認「畫面外進入 vs 真正的細胞分裂」。

### [膠質母細胞瘤](https://zenodo.org/records/5863317)
- 使用trackmate-cellpose
- 檔案包括預訓練模型
- Simple LAP tracker

### [human dermal microvascular blood endothelial cells expressing Paxillin](https://zenodo.org/records/5226842)
- 使用trackmate-weka
- 檔案內有 trained Weka classifier

## 其他
#### 繪製細胞核形狀隨時間的變化

有了細胞形狀及其譜系後，可以追蹤細胞分裂時形狀如何變化。例如繪製底部細胞的細胞核大小和圓度隨時間的變化。

1. 透過點擊其中一個斑點來選擇底部細胞。
2. 然後移至 TrackMate 精靈的 **Plot feature (繪製特徵)** 面板。確保你位於 **Spots (斑點)** 標籤頁。
3. 在此面板中，在 **Feature for Y axis (Y 軸特徵)** 的第一個列表中選擇 **Area (面積)**。
4. 點擊綠色的 `+` 按鈕以添加第二個特徵列表，然後選擇 **Circularity (圓度)** 特徵。
5. 你希望僅繪製所選斑點的軌跡 (track) 的這些特徵值。為此，請選擇底部的 **Tracks of selection (所選軌跡)** 單選按鈕。當然，感興趣軌跡中的至少一個斑點必須被選中。
6. 點擊 **Plot features (繪製特徵)** 按鈕。會出現兩個圖表。
   - 頂部圖表顯示面積隨時間的變化。可以看到它穩定增加直到細胞在 t=15 分鐘時分裂。面積急劇下降，並且圖表中現在繪製了兩個細胞。它們的面積恢復增加，且速率幾乎相同。
   - 圓度繪製在第二個圖表中。它幾乎一直保持很高（接近 1），因為細胞核的形狀大致為球形。當細胞分裂時，細胞核呈現拉長的形狀，導致圓度較低。
   - 如果你右鍵點擊任何一個圖表，會彈出一個選單，可以將圖表匯出為 PDF、PNG 或 SVG 影像，或將其資料顯示在可保存為 CSV 檔案的表格中。

#### 處理觸碰的細胞 (Mask 編輯)

1. 有一些觸碰的細胞被錯誤地識別為一個物體，直接編輯Mask進行修復。
2. 回到 TrackMate 精靈的第一個面板。
3. 在影像顯示區，選擇有問題的時間點（例如，在 C.elegans 教學中是第 9 幀），處理第二個通道。
4. 放大有缺陷 Mask 的細胞核。
5. 在 ImageJ 工具欄中，選擇線段工具。
6. 雙擊顏色選擇工具，並選擇黑色作為前景色。
7. 在細胞核和極體之間繪製一條黑線，作為切割
8. 重複之前的工作進行追蹤。


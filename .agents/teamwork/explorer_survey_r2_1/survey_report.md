# 3D 細胞與胞器模型調查與整併架構規劃報告 (Survey & Architecture Report for `cell-3d/`)

**調查執行者**：Survey Explorer 1 (Round 2)  
**調查時間**：2026-10-23  
**權威任務來源**：`ORIGINAL_REQUEST.md` Follow-up 2026-10-23T09:35:29Z Requirement R1 (`cell-3d/`)

---

## 1. 既有專案與檔案全面盤點 (Directory & File Inventory)

本調查深入檢視了工作區中涉及 3D 細胞與胞器模型的三大既有專案目錄（`threeJsModel/`、`3Dcell/`、`insideTheCell/`）以及相關參考專案（`cell-structure/`），所有檔案皆無外掛 `.obj`/`.gltf`/`.bin` 二進位檔或外部圖片貼圖，全數採用 Three.js 程序化幾何（Procedural Geometry）生成：

### 1.1 `threeJsModel/` 目錄分析
| 檔案名稱 | 行數 | 核心技術與內容 | 運行狀態與主要問題 |
|---|---|---|---|
| `animalCell.html` | 522 | Three.js r158 (ES module)。使用 `SphereGeometry`（細胞膜、核、溶體）、`CapsuleGeometry`（粒線體）、`TorusGeometry`（內質網）、`CylinderGeometry`（高基氏體疊盤）。具備滑鼠 Hover Raycasting 發光高亮與螢幕座標投影標籤（Tooltip）。 | 正常運行。但未做切開剖面，僅依賴外膜透明度（0.4）觀察內部；UI 面板樣式較陽春。 |
| `animalCell_cutaway.html` | 558 | Three.js r158 (ES module)。引入 WebGL 本地裁切平面（Local Clipping Planes: $X>0$ 與 $Z>0$ 雙平面），成功實現 90 度 1/4 圓立體切開（Wedge Cutaway）；在裁切邊緣以 `TubeGeometry` 圓弧管線繪製藍色剖面輪廓線，內部襯以 `BackSide` 雙層細胞質底球。 | 正常運行。剖面視覺效果極佳，但僅有英文界面，且胞器為簡化外觀，無法深入探索單一胞器微結構。 |
| `mitochondria.html` | 258 | 嘗試以數學公式產生粒線體：以 `randomPointInEllipsoid` 與 `CatmullRomCurve3` 建立粗細變化內膜管；以 `cristaeSurface` 配合三線性插值偽雜訊（Pseudo-noise）產生皺摺內膜；利用 `zPlane` 進行 Z 軸切片。 | **語法嚴重損毀**。HTML 頭部直接混入 JavaScript 代碼（第 6 行起），缺少 `<script>` 標籤、Three.js 引入與 UI DOM 節點，瀏覽器載入直接報錯。 |
| `membrane copy.html` | 118 | Three.js r128 (UMD)。利用雙層 10×10 陣列擺放磷脂分子模型，親水頭為 `SphereGeometry`，疏水尾為單一 `CylinderGeometry`。 | 正常運行但過度簡化：使用無光影之 `MeshBasicMaterial`；每個磷脂分子僅有單一尾部（而非生物學真實之雙脂肪酸鏈）；完全無鑲嵌蛋白質、膽固醇與醣鏈，未達到「流體鑲嵌模型」之要求；存在重複之 `animate()` 函式宣告。 |
| `rbc.html` + `rbc.js` | 21+91 | Three.js r160 (ES module)。以自定義 `BufferGeometry` 計算頂點與面索引，公式為 $z = \sin(r\pi/R) \cdot \text{thickness} \cdot \exp(-r^2/R^2)$，產生對稱雙凹圓盤；使用 `MeshPhongMaterial` (紅色)。 | 幾何形狀良好，但缺乏 OrbitControls 拖曳旋轉（僅有自動慢速自轉）；邊緣接合處法向量稍硬；無任何生物學尺寸與生理意義中文標註。 |

### 1.2 `3Dcell/` 目錄分析
| 檔案名稱 | 行數 | 核心技術與內容 | 運行狀態與主要問題 |
|---|---|---|---|
| `index.html` + `main.js` | 24+290 | Three.js r158 (ES module) + `MarchingCubes.js` 擴充套件。嘗試利用 Metaball 等值面演算法（Marching Cubes）建立有機形狀的粒線體內摺，並提供切面、頻率、震盪幅度等 7 個滑桿。 | 運算負擔過大。其 Voxel 解析度設為 80×80×80（51.2 萬個體素），每次拖曳滑桿即需在 CPU 迴圈中計算數千萬次距離方程式，引發嚴重卡頓；手機端易記憶體溢出（OOM）。 |
| `rbc.js` | 215 | 實質為解析度 40 的早期 Marching Cubes 粒線體實驗代碼（檔名與內容不符）。 | 不建議直接沿用。 |
| `webgl_marchingcubes.html` | 339 | 官方 Three.js Marching Cubes 範例修改版，使用 `addBall` 產生動態正弦波分佈之有機熔岩球。 | 屬於技術原型測試，非教學產品。 |

### 1.3 `insideTheCell/` 目錄分析
| 檔案名稱 | 行數 | 核心技術與內容 | 運行狀態與主要問題 |
|---|---|---|---|
| `index.html` + `script.js` + `style.css` | 33+588+38 | Three.js r160 (ES module)。包含粒線體與葉綠體雙模型切換、Z 軸剖面開關（`toggleCrossSection`）。<br>• 粒線體：外膜膠囊體 + 內膜膠囊體 + 18 條由 `CatmullRomCurve3` 構成之立體內膜嵴（Cristae）+ 垂直微板 + 內部基質球與 12 顆藍色 mtDNA/核糖體顆粒。<br>• 葉綠體：扁平橢圓球外被膜 + 4 柱堆疊之葉綠餅（Grana，每柱 7~9 個扁圓柱類囊體 Thylakoids）。 | **架構清晰、生物構造再現度高**。程式碼結構規範良好，以組件群組管理胞器。主要缺點為視覺光影較平淡、無中文構造標籤與說明、缺乏紅血球與細胞膜。 |
| `tempcode.js` | 10 | 使用 `TorusKnotGeometry` 製作粒線體環狀 DNA 之實驗代碼片段。 | 可直接納入粒線體基質內部作為教育細節亮點。 |

---

## 2. 技術特性深度比對 (Deep Technical Analysis)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             技術演進與版本差異                               │
├───────────────────┬─────────────────────────┬───────────────────────────────┤
│ 模組維度          │ 舊版實作 (threeJsModel)  │ 現代化統一標準 (cell-3d 建議) │
├───────────────────┼─────────────────────────┼───────────────────────────────┤
│ Three.js 版本     │ r128 (UMD) / r158       │ r160+ (標準 ES Module + importmap)│
│ 控制器 Controls   │ 混用/全域 script        │ OrbitControls (支援慣性阻尼與雙指縮放)│
│ 裁切技術 Clipping │ 無 / 部分單平面裁切     │ Local Clipping (90°立體楔切/剖面平滑過渡)│
│ 幾何造型 Geometry │ 簡單初級圖形 / 過重MC   │ 複合程序化幾何 (Spline+Buffer+複合實體)│
│ 材質與光影 Shading│ Basic / Lambert / Phong │ MeshStandard/Physical (金屬度/粗糙度/次表面)│
│ 行動裝置支援 RWD  │ 缺乏（PC固定佈局）      │ 全視窗響應式 + touch-action + 側拉抽屜│
│ 資訊呈現 UI/UX    │ 無 / 英文微型浮動文字   │ 繁體中文全彩解說卡 + 3D空間標籤 + 視角重設│
└───────────────────┴─────────────────────────┴───────────────────────────────┘
```

1. **模組引入方式**：
   現代瀏覽器（Chrome 89+、Safari 16.4+、Firefox 108+）已原生支援 `<script type="importmap">`。使用 CDN 引入 `three@0.160.0/build/three.module.js` 與 `three/addons/`，能徹底免除打包工具（Webpack/Vite/Node），同時完全避免全域變數污染。
2. **控制器與觸控適配**：
   `OrbitControls` 需配置：
   - `enableDamping = true`、`dampingFactor = 0.05`：大幅提升旋轉操作之絲滑度。
   - `touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }`：保證行動裝置上單指流暢 360 度旋轉、雙指平順捏合縮放。
   - 畫布 CSS 必須宣告 `touch-action: none;`，防止手機滑動時觸發網頁下拉重整或頁面捲動。
3. **裁切剖面實作方案 (Clipping Planes)**：
   `renderer.localClippingEnabled = true`，結合各材質上的 `clippingPlanes` 設定。
   - 全景動物細胞：使用 $X>0$ 與 $Z>0$ 雙正交平面實現 1/4 圓立體楔形切口（Wedge Cut），內部構造一覽無遺。
   - 粒線體與葉綠體：使用單一前向或斜向切面（如 $Z>0$），並支援按鈕切換「完整立體外觀」與「剖面解剖狀態」。
4. **效能權衡（Marching Cubes vs 程序化曲線曲面）**：
   `3Dcell/main.js` 採用的 Marching Cubes 在 CPU 上計算 80×80×80 網格，嚴重拖慢幀率。經評估，`insideTheCell/` 採用的 `CatmullRomCurve3` 搭配 `TubeGeometry` 與扁平圓盤陣列，在維持 60 FPS 順暢度的同時，生物形貌更為清晰規律，是行動裝置與無獨顯電腦的最佳方案。

---

## 3. 統一專案 `cell-3d/` 之 5 大展示模型建構標準

針對 `ORIGINAL_REQUEST.md` Follow-up 之規格，`cell-3d/` 需整合並具備以下 5 大核心展示模型：

### 3.1 模型一：動物細胞全景與主要胞器 (Animal Cell Panorama)
- **視覺呈現**：
  - 半透明粉嫩外層細胞膜，支援「完整外觀」與「1/4 立體楔形剖面」即時切換。
  - 內部中央為紫色大型雙層膜**細胞核**（含表面核孔紋理與內部深色核仁球）。
  - 周圍分佈 6~8 顆橙色立體**粒線體**。
  - 緊鄰細胞核的淡藍色扁囊狀**粗糙內質網 (RER)** 與**平滑內質網 (SER)**。
  - 珊瑚粉色層疊之**高基氏體 (Golgi)** 與周邊出芽之分泌囊泡。
  - 淺綠色顆粒狀之**溶體 (Lysosome)** 與成對成 90 度交角之**中心體/中心粒 (Centrioles)**。
- **互動機制**：滑鼠懸停或觸控點選胞器時，胞器發出微光強調（Emissive Glow），右側資訊卡動態顯示對應中文名稱、膜層構造與生理功能。

### 3.2 模型二：粒線體 3D 構造與內摺剖面 (Mitochondrion)
- **視覺呈現**：
  - 長橢圓/膠囊狀雙層膜構造。
  - **平滑外膜**：半透明紅橙色，具孔蛋白通透特性。
  - **膜間腔 (Intermembrane Space)**：雙層膜間的狹窄水相空間。
  - **高度摺疊之內膜 (Inner Membrane & Cristae)**：金黃色，多達 16~20 道深入基質的片狀與管狀嵴（以三維曲線與曲面立體交錯排列），大幅擴充表面積。
  - **粒線體基質 (Matrix)**：半透明暖黃色內部基質，內置綠色環狀 mtDNA（`TorusKnotGeometry`）與藍色 70S 核糖體顆粒。
- **切換與解說**：一鍵切換剖開/閉合視角；詳細標註電子傳遞鏈、ATP 合成酶與內共生學說（Endosymbiotic Theory）教育意義。

### 3.3 模型三：葉綠體 3D 構造與基粒/葉綠餅剖面 (Chloroplast)
- **視覺呈現**：
  - 扁平透鏡狀（雙凸圓盤形狀）雙層外被膜，翠綠色半透明。
  - **類囊體與葉綠餅 (Thylakoids & Grana)**：內部包含 5~7 柱如硬幣塔般緊密堆疊的圓盤狀葉綠餅（深綠色），每個葉綠餅由 6~10 層類囊體構成。
  - **基質片層 (Stroma Lamellae)**：扁平膜管網橋，橫向貫穿並連結各葉綠餅柱。
  - **基質 (Stroma)**：內含卡爾文循環酵素群、環狀 cpDNA 與白色微小的暫存澱粉粒（Starch Granules）。
- **切換與解說**：剖開外膜呈現內部光反應（類囊體膜）與碳反應（基質）之空間劃分。

### 3.4 模型四：紅血球雙凹圓盤 3D 模型 (Red Blood Cell)
- **視覺呈現**：
  - 嚴格依照人類紅血球（Erythrocyte）真實比例建構雙凹圓盤體（直徑 7.5 μm，周緣厚度 2.0 μm，中央凹陷厚度 1.0 μm）。
  - 使用封閉光滑之 `BufferGeometry` 程序化頂點計算，法向量平滑無瑕疵。
  - 材質採用具備光澤感與微散射效果之物理材質（`MeshPhysicalMaterial`，鮮紅飽和血色，Clearcoat = 0.35）。
- **教學註記與剖析**：
  - 雙凹圓盤幾何大幅提升表面積與體積比（SA/V Ratio），極大化氣體交換擴散速率。
  - 成熟哺乳類紅血球無細胞核與粒線體，提供最大空間攜帶血紅素（Hemoglobin），且自身行無氧呼吸不消耗所運送之氧氣。
  - 具備高彈性變形能力，能擠過僅 5~8 μm 寬之微血管。

### 3.5 模型五：細胞膜雙層磷脂質與蛋白質流體鑲嵌模型 (Fluid Mosaic Model)
- **視覺呈現**：
  - **磷脂質雙分子層 (Phospholipid Bilayer)**：
    - 上下兩層密集陣列，親水性磷酸頭部（球形，極性親水，呈帶電光澤藍綠色或珍珠白）。
    - 每個親水頭下方延伸出 2 條疏水性脂肪酸尾部（一條飽和直鏈、一條具雙鍵之折曲不飽和鏈，黃橘色），上下層尾部相對向內。
  - **貫穿膜蛋白 / 通道蛋白 (Transmembrane / Channel Protein)**：圓柱桶狀多次跨膜蛋白，中央具親水性離子/水分子孔道。
  - **周邊膜蛋白 (Peripheral Protein)**：吸附於內側膜表面。
  - **醣蛋白與醣脂 (Glycoproteins & Glycolipids)**：外表面樹枝狀分枝的寡醣鏈天線，標註細胞辨識與免疫功能。
  - **膽固醇 (Cholesterol)**：夾雜在磷脂尾部之間的微小多環剛性分子，標註調節膜流動性（低溫防凝固、高溫防過度流動）。
- **動態效果**：微幅波動動畫（Subtle undulating wave），展現細胞膜生動之「流體」本質。

---

## 4. UI / UX 互動系統與響應式架構

1. **頂部導覽切換列 (Modern Tab Switcher)**：
   - 5 個切換按鈕，附帶圖示與中英文標籤：
     `[🔬 動物細胞全景]` `[⚡ 粒線體剖面]` `[🌿 葉綠體剖面]` `[🩸 雙凹紅血球]` `[🧱 細胞膜流體鑲嵌]`
   - 切換時視角平滑過渡（Camera Position & OrbitControls Target Tween 內插過渡），避免畫面突兀瞬移。
2. **懸浮解說卡片 (HUD Scientific Info Card)**：
   - 位於右側（手機端為底部抽屜），半透明毛玻璃質感（Glassmorphism: `backdrop-filter: blur(12px)`）。
   - 顯示：構造分類 Badge、中文名稱、英文學名、膜層分類、核心生理功能、構造細部拆解清單。
   - 點擊卡片內的微細構造標籤，3D 場景中對應零件即刻閃爍發光。
3. **輔助工具列 (Toolbar)**：
   - `[⟲ 視角重設]`：一鍵將攝影機復位至最佳觀察距離與角度。
   - `[🔄 自動旋轉]`：切換緩慢巡航旋轉。
   - `[🔪 剖面切換 / 完整外觀]`：適用於細胞全景、粒線體與葉綠體，即時展示內外部構造差異。
4. **行動端全支援 (Mobile Friendly)**：
   - 側邊與底欄具備縮摺按鈕（`◀` / `▼`），在小螢幕手機上自動收合，留出最大 3D 操作視野。
   - 觸控事件專屬優化，支援單指旋轉、雙指捏合縮放。

---

## 5. 檔案結構與模組化架構規劃 (Target Architecture for `cell-3d/`)

建議採用清晰、高內聚、無建置依賴之純原生 ES Module 架構：

```
cell-3d/
├── index.html              # 統一主頁面，包含 HUD、頂部切換列、右側解說卡、Three.js 容器
├── style.css               # 毛玻璃科技風格 CSS，全響應式 RWD 適配
├── main.js                 # 應用程式入口：場景初始化、相機轉場動畫、事件調度
├── js/
│   ├── data.js             # 完整的生物構造中文資料庫（分類、功能、膜層、細部構造）
│   ├── sceneManager.js     # Three.js 核心（Scene, Camera, Renderer, OrbitControls, Lights）
│   ├── models/
│   │   ├── animalCell.js   # 模型一：動物細胞全景與 1/4 剖面
│   │   ├── mitochondria.js # 模型二：粒線體雙層膜與嵴剖面
│   │   ├── chloroplast.js  # 模型三：葉綠體雙層膜與葉綠餅剖面
│   │   ├── rbc.js          # 模型四：紅血球雙凹圓盤幾何與物理材質
│   │   └── membrane.js     # 模型五：細胞膜雙層磷脂與蛋白質流體鑲嵌
│   └── ui.js               # UI 互動邏輯（選單切換、資訊卡更新、標籤高亮連動）
```

### 舊目錄相容性與重定向處置：
- `threeJsModel/`、`3Dcell/`、`insideTheCell/`：保留原始檔案不刪除，但在各目錄的 `index.html`（或主要 HTML）頂部加入顯目的橫幅提示：
  `💡 本模型已升級整合至全新的【3D 細胞與胞器立體模型】，點此立即體驗完整版 →`，並自動導向 `../cell-3d/index.html`。
- `index.html`：於「細胞」章節掛載 `<a href="cell-3d/index.html">3D細胞與胞器模型</a>`。

---

## 6. 結論與後續執行指引

1. **實作可行性評估**：既有程式碼已包含極佳的程序化模型範例（`animalCell_cutaway.html` 的局部裁切平面、`insideTheCell/script.js` 的管狀嵴與基粒堆疊、`rbc.js` 的雙凹圓盤數學式）。將其萃取、強化材質與光影後重構至 `cell-3d/`，技術風險低且能展現極高之視覺與教學水準。
2. **行動端效能保證**：捨棄過度消耗 CPU 的 80³ Marching Cubes，全面採用頂點數受控的程序化複合幾何，全場景三角形總數控制在 2 萬至 6 萬面之間，確保在低階手機與平板上穩定以 60 FPS 運行。
3. **無縫整合驗證**：產出之 `cell-3d/index.html` 將能通過全靜態無死連結測試（`python3 check_unlinked_projects.py`），且首頁可直接存取。

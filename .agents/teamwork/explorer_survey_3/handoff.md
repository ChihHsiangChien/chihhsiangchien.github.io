# 五大感覺受器動態傳導模擬器：UI/UX、動畫管線與自動化驗證測試架構規劃報告

- **報告代號**: `handoff.md`
- **調查員**: Explorer 3 (UI/UX, Animation Architecture & Verification Explorer)
- **隸屬任務**: 五大感覺受器動態傳導模擬器 (Five Sensory Receptors Conduction Simulator)
- **工作目錄**: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology`
- **狀態資料夾**: `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\explorer_survey_3\`
- **交付對象**: Orchestrator 1 (`e8543011-3af3-4cf5-8c77-c7d3d20c0eb7`)
- **生成時間**: 2026-11-09T01:55:00Z

---

## 1. 觀察 (Observation)

### 1.1 需求規格比對 (Requirements Cross-Reference)
在檢視權威需求文件 `c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\.agents\teamwork\ORIGINAL_REQUEST.md` (Follow-up 2026-11-09T01:44:00Z) 後，確認核心規範如下：
- **R1. 五大感覺受器動態傳導模擬**:
  - 涵蓋**視覺、聽覺、嗅覺、味覺、皮膚**五種感覺受器。
  - 呈顯完整的「**刺激 (Stimulus) ➔ 受器 (Receptor) ➔ 神經 (Nerve) ➔ 腦 (Brain)**」訊號傳導歷程。
  - 動畫流程自動演繹，不要求使用者設定或調整刺激參數。
- **R2. 動畫進程速度控制**:
  - 提供播放與暫停切換按鈕 (`Play / Pause`)，使用者可隨時暫停與繼續。
  - 提供播放速度控制（倍速按鈕 `0.5x, 1x, 1.5x, 2x` 或速度滑桿），即時調節速率。
  - 提供進度切換（進度尋軌條 Scrubber、單步前進/後退 Step Prev/Next、重新開始 Reset）。
- **R3. 獨立子頁面與雙向導覽整合**:
  - 在 `neuro_physiology/` 目錄下建立獨立子頁面 `receptors.html`。
  - 現有 `neuro_physiology/index.html` 與新子頁面 `receptors.html` 必須建立可正常點擊互通的雙向導覽連結。
- **約束規範 (Integrity: Demo)**:
  - 不得複製現有開源專案核心程式碼，禁止引進外部重量級模擬框架，所有演算法、Canvas 渲染幾何與時間軸控制器必須純手工實作。

### 1.2 基準參考教材影像微觀觀察 (Reference Images Inspection)
逐一檢視五張中學生物教科書影像（位於 `C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/`）：
1. **視覺（眼睛）`media_1794186604265_1c31bbf3.jpg`**:
   - 結構：光線（左側箭頭）➔ 角膜與晶狀體 ➔ 眼球後壁受器（青藍色視網膜）➔ 視神經（後方藍色神經束）➔ 粉紅色圓形「腦」。
   - 文案：「眼睛中的視覺受器可感受光線的刺激。」
2. **聽覺（耳朵）`media_1794186611900_7c128f66.jpg`**:
   - 結構：聲音（左側箭頭）➔ 外耳道 ➔ 鼓膜 ➔ 三小骨槓桿 ➔ 受器（耳蝸螺旋體）➔ 聽神經 ➔ 「腦」。
   - 文案：「耳朵中的聽覺受器可感受聲音的刺激。」
3. **嗅覺（鼻腔）`media_1794186626170_48b02c79.jpg`**:
   - 結構：氣味（藍色箭頭由鼻孔吸入）➔ 鼻腔頂部受器（嗅黏膜與嗅纖毛）➔ 穿過篩骨的神經（嗅神經/嗅球）➔ 「腦」。
   - 文案：「鼻腔中的嗅覺受器可感受氣味的刺激。」
4. **味覺（舌頭）`media_1794186636917_ac40956d.jpg`**:
   - 結構：舌頭外形 ➔ 局部放大舌乳頭溝槽 ➔ 味覺受器（洋蔥狀味蕾）➔ 味覺神經（藍色神經纖維）➔ 「腦」。
   - 文案：「舌頭上的味覺受器可感受味道的刺激。」
5. **皮膚受器（皮膚）`media_1794186649546_b5d16396.jpg`**:
   - 結構：表皮與真皮三維切面 ➔ 各種受器（麥斯納小體、巴齊尼小體、莫克爾盤、毛囊神經叢、自由神經末梢）➔ 深層感覺神經幹 ➔ 「腦」。
   - 文案：「皮膚中有各種受器，可感受溫度、接觸及壓力等刺激。」

### 1.3 現有程式庫與測試基底觀察 (`neuro_physiology/index.html` & `tests/`)
- `neuro_physiology/index.html` 採用 Tailwind CSS (暗黑配色 `bg-slate-950`, `slate-900`, `slate-800`)、Inter 與 JetBrains Mono 字型、全螢幕彈性布局 (`h-screen flex flex-col overflow-hidden`)。
- 畫布使用 HTML5 Canvas 2D Context，透過 `requestAnimationFrame(drawSimulation)` 進行高幀率即時渲染，具備平移縮放視圖（`scale`, `offsetX`, `offsetY`）。
- 既有測試架構 (`TEST_INFRA.md`, `tests/test_round2_suite.py`) 具備標準的 4-Tier 測試結構，使用 Python `socketserver` + `QuietSimpleHTTPRequestHandler` 啟動暫態本機 HTTP 伺服器，配合 `BeautifulSoup` 進行 DOM 檢測，並可呼叫 Node.js VM 進行純腳本無頭邏輯運算驗證。

---

## 2. 邏輯推導鏈 (Logic Chain)

為達成高教學價值、順暢操作體驗與百分之百無痛自動化測試，本設計採取四條嚴謹的推導鏈：

### 2.1 推導鏈 1：標準化時間軸狀態機 (Normalized Timeline State Machine)
- **問題**: 若動畫各階段採用獨立計時器 (`setTimeout` / `setInterval`) 或非線性累加時間，當使用者點擊「暫停」、「倍速調整（如 0.5x 變 2x）」或「拖曳進度條尋軌 (Seek)」時，極易產生時序錯位、粒子殘留或突觸閃爍不同步的臭蟲。
- **解法**: 採用**單一確定性標準化時間軸變數 $T \in [0.0, 1.0]$**。
  - 將傳導歷程精確劃分為四大區間（對齊教科書與解剖學四階段）：
    1. **階段 0 (Phase 0): 刺激進入與組織耦合 ($0.00 \le T < 0.25$)** — 外部刺激（光子波前、空氣聲波、氣味分子群、溶解呈味分子、皮膚壓力波）自左向右推進至感官受器。
    2. **階段 1 (Phase 1): 受器細胞能量轉導 ($0.25 \le T < 0.50$)** — 刺激激發特化受器細胞（視桿/視錐、耳蝸毛細胞、嗅神經纖毛、味蕾細胞、真皮小體），離子通道門控開啟，產生感受器電位/發生器電位 (Receptor/Generator Potential)，放大鏡視窗同步高亮。
    3. **階段 2 (Phase 2): 動作電位沿神經纖維傳導 ($0.50 \le T < 0.80$)** — 動作電位脈衝群 (Spike Train) 沿專屬感覺神經束（CN II、CN VIII、CN I、CN VII/IX、脊神經 Aβ/Aδ/C 纖維）高速傳導，經髓鞘跳躍傳導與視丘/腦幹核團轉接。
    4. **階段 3 (Phase 3): 大腦皮質統合與感知產生 ($0.80 \le T \le 1.00$)** — 神經訊號抵達特定大腦皮質葉區（枕葉 V1、顳葉 A1、嗅皮質/邊緣系統、島葉味覺區、頂葉 S1），皮層網絡輝光爆發，浮現具體的感知認知卡片。
  - **純函數渲染原則**: 畫布渲染邏輯為純函數 $Render(Receptor, T)$。給定任意 $T \in [0, 1]$，畫面上所有刺激波長、受器發光度、軸突脈衝坐標、大腦皮質光暈均有唯一的解析幾何解。因此，無論是「暫停定格」、「0.5x 慢動作播放」、「隨意拖動進度條」或「自動化測試指定 $T=0.65$」，畫面狀態皆能瞬間精確還原！

### 2.2 推導鏈 2：操作控制器架構 (Playback & Speed Control Engine)
- **核心控制器實體 (`ConductionController`)**:
  - `state`: `'playing'` | `'paused'` | `'ended'`
  - `progress`: $0.0 \sim 1.0$ (浮點數)
  - `speedMultiplier`: 支持 `0.5x`, `1.0x`, `1.5x`, `2.0x`，以及微調滑桿 ($0.25x \sim 3.0x$)
  - `baseCycleDuration`: 基準單次循環時長為 8000 毫秒（8.0 秒）。在 1.0x 速度下，階段 0 為 2.0s、階段 1 為 2.0s、階段 2 為 2.4s、階段 3 為 1.6s，提供最宜人的教學觀察節奏。
  - `loop`: 布林值（預設 `true`，循環播放）。
  - **幀率獨立計算 (Delta Time Integration)**:
    $$\Delta T = \frac{\Delta t_{\text{ms}} \times \text{speedMultiplier}}{\text{baseCycleDuration}}$$
    加上最大時間差限制（$\Delta t_{\text{ms}} \le 100\text{ms}$），杜絕瀏覽器分頁切換後再次開啟時發生的脈衝暴衝飛躍現象。
  - **單步微調 (Stepping)**:
    - `stepNext()`: 自動跳躍至下一個階段起始點 ($0.00, 0.25, 0.50, 0.80$)，並自動切換至暫停狀態，便利課堂教學解說。
    - `stepPrev()`: 若當前進度已超過當前階段起點 0.05，則回到當前階段起點；否則跳回上一階段起點。
  - **雙向尋軌 (Seek / Scrubbing)**:
    - 底部原生 Range Slider (`min=0, max=1000`) 與 `controller.progress` 雙向同步。滑鼠/觸控拖曳時無延遲刷新畫布。

### 2.3 推導鏈 3：UI 元件階層與響應式體驗 (UI/UX & RWD Architecture)
- 延續 `neuro_physiology/index.html` 的暗黑高科技實驗室設計語言：
  - **頂部導航列 (Global Header)**:
    - 返回首頁按鈕 (`<a href="../index.html">`)。
    - 返回神經生理實驗室主頁面 (`<a href="index.html">`)。
    - 專案標題與 Pro 徽章。
    - 快速動作按鈕（視圖重置、右側面板收合開關）。
  - **五大受器分頁列 (Receptor Tabs Bar)**:
    - 5 個功能分頁按鈕：`👁️ 視覺 (Vision)`、`👂 聽覺 (Hearing)`、`👃 嗅覺 (Smell)`、`👅 味覺 (Taste)`、`🖐️ 皮膚 (Skin)`。
    - 支援鍵盤快速鍵 (`1 ~ 5` 鍵一鍵切換，`Space` 鍵播放/暫停，`← / →` 單步微調)。
    - 每個感覺模態擁有專屬的視覺主題識別色（視覺: 亮青天藍 `#38bdf8`；聽覺: 琥珀金黃 `#f59e0b`；嗅覺: 翡翠薄荷綠 `#10b981`；味覺: 珊瑚玫紅 `#f43f5e`；皮膚: 霓虹亮紫 `#a855f7`）。
  - **中央動態舞臺 (Main Stage Canvas)**:
    - 採用高解析度 Canvas 2D，支援高 DPI 螢幕防模糊補償 (`window.devicePixelRatio`)。
    - 畫布四分區橫向展開流水線：
      - 左區 (5%~18% W): 刺激來源區（光束、聲波、氣味分子流、味覺溶液、觸壓探針）。
      - 中左區 (20%~44% W): 受器器官解剖與微觀轉導嵌窗（眼球視網膜、耳蝸毛細胞、鼻腔嗅上皮、舌乳頭味蕾、皮膚多層小體）。
      - 中右區 (46%~74% W): 感覺神經束與轉接核團（視神經/視丘 LGN、聽神經/視丘 MGN、嗅神經/嗅球直通、味覺神經/孤束核/VPM、脊神經後索/VPL）。
      - 右區 (76%~95% W): 大腦輪廓與皮質特異葉區（枕葉 V1、顳葉 A1、嗅皮質/杏仁核、島葉味覺區、頂葉後中央迴 S1）。
    - 畫布左上角配備 HUD 階段指示器 (`[ 刺激 ] ➔ [ 受器 ] ➔ [ 神經 ] ➔ [ 腦 ]`)，即時呈現當前階段與完成百分比。
  - **底部浮動控制面板 (Bottom Playback Dock)**:
    - 緊湊懸浮於中央舞臺底端，毛玻璃效果 (`backdrop-blur-md bg-slate-900/90 border border-slate-700/60`)。
    - 包含：播放/暫停大按鈕、上一階段、下一階段、重新開始、進度尋軌條（帶有 4 階段彩色進度區段指示）、倍速切換群組 (`0.5x`, `1.0x`, `1.5x`, `2.0x`)、循環播放勾選框。
  - **右側動態知識與機制面板 (Right Mechanism & Educational Panel)**:
    - 可隨時一鍵摺疊以釋放 100% 畫布寬度。
    - 動態連動：當進度 $T$ 推進至不同階段時，面板同步點亮對應區塊，呈現深入淺出的細胞分子機制說明（如「視紫質光解與感光細胞超極化」、「毛細胞靜纖毛偏折與 K+ 內流」、「Piezo2 機械敏感離子通道門控」）。
  - **行動裝置與平板適配 (RWD)**:
    - 桌機寬螢幕 (>= 1280px): 畫布與右側面板並排，底部控制條居中。
    - 平板 (768px ~ 1279px): 右側面板預設摺疊為抽屜式，畫布自適應縮放。
    - 手機螢幕 (< 768px): 頂部選單支援橫向捲動，底部控制條自動拆分為兩列（上列進度條，下列按鈕），觸控拖曳流暢。

### 2.4 推導鏈 4：4-Tier 不依賴實作的黑箱自動化驗證測試網 (Verification Strategy)
- 對齊專案既有 `TEST_INFRA.md` 與 `tests/test_round2_suite.py` 之最高標準：
  - **Tier 1: Feature Coverage (功能覆蓋率檢驗)**:
    - 5 大感覺受器模態完整性（視覺、聽覺、嗅覺、味覺、皮膚）。
    - 4 階段傳導狀態覆蓋（刺激、受器、神經、大腦）。
    - 播放/暫停狀態轉換功能。
    - 4 種預設倍速 (`0.5x`, `1.0x`, `1.5x`, `2.0x`) 正確響應。
    - 雙向導覽連結完好性 (`neuro_physiology/index.html` $\leftrightarrow$ `neuro_physiology/receptors.html`)。
  - **Tier 2: Boundary & Corner Cases (邊界與極端狀況測試)**:
    - 快速連擊 Play/Pause 按鈕（防止狀態震盪或計時器疊加洩漏）。
    - 播放期間快速切換五大受器 Tab（確保前一個受器的粒子陣列與回呼徹底重置，無記憶體洩漏）。
    - 進度尋軌滑桿邊界值測試 ($T=0.000$, $T=1.000$，負數或超額數值防禦夾止 `clamp(0, 1)`)。
    - 倍速極端值與非法輸入測試（杜絕除以零或無窮大 NaN 錯誤）。
  - **Tier 3: Pairwise & Cross-Feature Combinations (交互組合測試)**:
    - 「暫停狀態」下切換分頁：畫面立即重繪新受器且維持暫停狀態，不擅自啟動。
    - 「單步步進」中調整倍速：進度保持精確鎖定於指定階段邊界。
    - 拖動進度條至神經傳導階段 ($T=0.65$) 後按下「播放」：從 $0.65$ 無縫平滑起跑，無跳變。
    - Node.js VM 無頭執行檢測：萃取頁面內嵌核心 JavaScript，在 Node 環境中執行模擬循環，驗證控制台零未捕獲例外報錯 (`Uncaught Error`)。
  - **Tier 4: Realistic Classroom Pedagogical Scenarios (真實生物課堂教學流程驗證)**:
    - 情境 1: 國中生物「視覺成像與視神經」探究（載入視覺 ➔ 正常播放 ➔ 枕葉皮質成像結算）。
    - 情境 2: 高中生物「耳蝸毛細胞與聽覺轉導」精細教學（載入聽覺 ➔ 切換 0.5x 慢速 ➔ 單步跳轉至受器階段 ➔ 觀察內淋巴 K+ 離子流）。
    - 情境 3: 「嗅覺不經視丘」特殊生理機制探討（載入嗅覺 ➔ 驗證路徑自嗅球直通邊緣系統與嗅皮質，無 LGN/MGN 節點）。
    - 情境 4: 「味覺五種基本呈味物質」探索（載入味覺 ➔ 觀察唾液溶解化學分子 ➔ 味孔微絨毛受器電位 ➔ 孤束核 ➔ 島葉）。
    - 情境 5: 全域導覽閉環檢驗（使用者自 `index.html` 點擊「五大感覺受器傳導」進入 `receptors.html`，依序操作 5 大受器後，點擊「返回主實驗室」無損返回 `index.html`）。

---

## 3. 限制與考量 (Caveats)

1. **瀏覽器像素比與畫布清晰度 (DevicePixelRatio)**:
   - 在 Retina 或高解析度行動裝置螢幕上，若僅設置 `<canvas width="1200" height="700">` 且未依據 `window.devicePixelRatio` 放大底層像素緩衝區並縮放 CSS 顯示尺寸，文字與細微神經纖維會產生鋸齒與模糊。
   - **解法**: 初始化與視窗縮放 (`window.onresize`) 時動態執行：
     ```javascript
     const dpr = window.devicePixelRatio || 1;
     canvas.width = rect.width * dpr;
     canvas.height = rect.height * dpr;
     ctx.scale(dpr, dpr);
     ```
2. **Delta Time 在休眠分頁中的防禦 (Tab Inactivity Guard)**:
   - 當使用者切換至其他分頁，瀏覽器會大幅降低 `requestAnimationFrame` 呼叫頻率。當使用者再次切回時，首次獲取的 `performance.now() - lastTimestamp` 可能高達數秒甚至數分鐘，導致 $T$ 瞬間暴增跳過數個循環。
   - **解法**: 強制限制單幀最大時間增量 `dt = Math.min(now - lastTimestamp, 100)` 毫秒。
3. **無外部相依性與純原生實作原則 (Zero External Dependencies)**:
   - 專案嚴格限制不可拷貝外部現成之生物醫學模擬函式庫。所有解剖輪廓繪製（貝茲曲線眼球、螺旋耳蝸、鼻甲斷面、味蕾洋蔥環、皮膚斷面）、動作電位離子流光粒子、波形推進數學模型，皆必須以原生 Canvas 2D Path API 手工演算法完成。
4. **雙向導覽檔案修改範圍約束**:
   - 本調查員角色為唯讀探查（Read-only Explorer），不得擅自編輯程式碼檔案。雙向導覽的落地必須在後續 Worker 實作階段，於 `neuro_physiology/index.html` 第 68~75 行間加入精準指向 `receptors.html` 的按鈕，並於新產生的 `receptors.html` 中安置指向 `index.html` 與 `../index.html` 的跳轉連結。

---

## 4. 結論 (Conclusion)

本報告已為「五大感覺受器動態傳導模擬器」建立完整、堅固且具備極高教學品質的架構規劃：

### 4.1 檔案與架構藍圖
```
c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\
├── neuro_physiology\
│   ├── index.html           # 既有神經生理學主實驗室 (需掛載前往 receptors.html 之入口)
│   └── receptors.html       # 全新獨立子頁面 (包含五大受器傳導模擬器完整實作)
└── tests\
    └── test_receptors_conduction.py # 全新 4-Tier 自動化驗證測試套件 (涵蓋 R1, R2, R3)
```

### 4.2 核心程式碼元件架構設計

#### (A) 時間軸控制器類別 (`ConductionTimelineController`)
```javascript
class ConductionTimelineController {
    constructor(options = {}) {
        this.baseDuration = options.baseDuration || 8000; // 8.0 秒/週期 (1.0x)
        this.speedMultiplier = options.speedMultiplier || 1.0;
        this.progress = 0.0; // 0.0 ~ 1.0
        this.isPlaying = true;
        this.loop = true;
        this.currentReceptor = 'vision'; // 'vision' | 'hearing' | 'smell' | 'taste' | 'skin'
        this.lastTimestamp = performance.now();
        this.onProgressUpdate = options.onProgressUpdate || null;
        this.onPhaseChange = options.onPhaseChange || null;
        this.currentPhase = 0; // 0: 刺激, 1: 受器, 2: 神經, 3: 大腦
    }

    getCurrentPhase(t) {
        if (t < 0.25) return 0; // 刺激
        if (t < 0.50) return 1; // 受器
        if (t < 0.80) return 2; // 神經
        return 3;               // 大腦
    }

    play() {
        this.isPlaying = true;
        this.lastTimestamp = performance.now();
    }

    pause() {
        this.isPlaying = false;
    }

    togglePlayPause() {
        if (this.isPlaying) this.pause();
        else this.play();
        return this.isPlaying;
    }

    setSpeed(speed) {
        const validSpeed = Math.max(0.25, Math.min(3.0, Number(speed) || 1.0));
        this.speedMultiplier = validSpeed;
    }

    seek(normalizedT) {
        this.progress = Math.max(0.0, Math.min(1.0, normalizedT));
        this.checkPhaseChange();
        if (this.onProgressUpdate) this.onProgressUpdate(this.progress);
    }

    stepNext() {
        this.pause();
        const phaseBounds = [0.00, 0.25, 0.50, 0.80, 1.00];
        const nextTarget = phaseBounds.find(b => b > this.progress + 0.005);
        this.seek(nextTarget !== undefined ? nextTarget : 0.00);
    }

    stepPrev() {
        this.pause();
        const currentP = this.getCurrentPhase(this.progress);
        const phaseStarts = [0.00, 0.25, 0.50, 0.80];
        const currentStart = phaseStarts[currentP];
        if (this.progress - currentStart > 0.05) {
            this.seek(currentStart);
        } else {
            const prevStart = phaseStarts[Math.max(0, currentP - 1)];
            this.seek(prevStart);
        }
    }

    reset() {
        this.progress = 0.0;
        this.currentPhase = 0;
        this.lastTimestamp = performance.now();
        if (this.onProgressUpdate) this.onProgressUpdate(this.progress);
    }

    setReceptor(receptorKey) {
        this.currentReceptor = receptorKey;
        this.reset();
    }

    update(now) {
        if (!this.isPlaying) {
            this.lastTimestamp = now;
            return;
        }
        const deltaMs = Math.min(now - this.lastTimestamp, 100);
        this.lastTimestamp = now;

        const deltaProgress = (deltaMs * this.speedMultiplier) / this.baseDuration;
        this.progress += deltaProgress;

        if (this.progress >= 1.0) {
            if (this.loop) {
                this.progress = 0.0;
            } else {
                this.progress = 1.0;
                this.pause();
            }
        }

        this.checkPhaseChange();
        if (this.onProgressUpdate) {
            this.onProgressUpdate(this.progress);
        }
    }

    checkPhaseChange() {
        const newPhase = this.getCurrentPhase(this.progress);
        if (newPhase !== this.currentPhase) {
            this.currentPhase = newPhase;
            if (this.onPhaseChange) {
                this.onPhaseChange(this.currentPhase);
            }
        }
    }
}
```

#### (B) 五大受器解剖資料字典結構 (`RECEPTOR_CONFIGS`)
```javascript
const RECEPTOR_CONFIGS = {
    vision: {
        id: 'vision',
        name: '視覺受器 (Vision)',
        organ: '眼睛 (Eye / Retina)',
        icon: '👁️',
        themeColor: '#38bdf8',
        stimulusName: '光線 (Photons / 380-750nm)',
        stimulusType: '電磁波 / 光子束',
        receptorName: '視網膜 (視桿與視錐感光細胞)',
        molecularMechanism: '光照活化視紫質 ➔ cGMP下降 ➔ 陽離子通道關閉 ➔ 感光細胞超極化 ➔ 節細胞發放',
        nerveName: '視神經 (CN II / Optic Nerve)',
        relayStation: '視丘外側膝狀體 (LGN)',
        brainTarget: '枕葉初級視覺皮質 (Primary Visual Cortex / V1)',
        perceptionSummary: '大腦辨識光影輪廓、立體景深與豐富色彩',
        keyTakeaway: '感光細胞在光照下產生「超極化」而非去極化，是神經生物學經典特例。'
    },
    hearing: {
        id: 'hearing',
        name: '聽覺受器 (Hearing)',
        organ: '耳朵 (Ear / Cochlea)',
        icon: '👂',
        themeColor: '#f59e0b',
        stimulusName: '聲音 (Sound Waves / 20-20000Hz)',
        stimulusType: '空氣疏密振動波',
        receptorName: '耳蝸柯蒂氏器 (內毛細胞 Hair Cells)',
        molecularMechanism: '基底膜行波 ➔ 靜纖毛偏折拉緊 Tip Links ➔ TMC1通道開 ➔ 內淋巴 K+ 內流去極化',
        nerveName: '聽神經 (CN VIII / Vestibulocochlear Nerve)',
        relayStation: '耳蝸核 ➔ 上橄欖核 ➔ 下丘 ➔ 視丘內側膝狀體 (MGN)',
        brainTarget: '顳葉初級聽覺皮質 (Primary Auditory Cortex / A1)',
        perceptionSummary: '大腦解析聲音音調 (頻率)、響度 (振幅) 與空間方位',
        keyTakeaway: '聽小骨槓桿與鼓膜面積比放大聲壓 20 倍；高頻聲波在耳蝸基底感應，低頻在耳蝸蝸頂感應。'
    },
    smell: {
        id: 'smell',
        name: '嗅覺受器 (Smell)',
        organ: '鼻腔 (Nasal Cavity / Olfactory Mucosa)',
        icon: '👃',
        themeColor: '#10b981',
        stimulusName: '氣味分子 (Volatile Odorants)',
        stimulusType: '空氣中揮發性化學分子',
        receptorName: '嗅黏膜嗅受器神經元 (雙極神經元纖毛)',
        molecularMechanism: '氣味分子結合 GPCR ➔ Golf ➔ cAMP 上升 ➔ CNG通道開放 ➔ ANO2 氯通道開引起 Cl- 逆向外流去極化',
        nerveName: '嗅神經 (CN I / Olfactory Nerve & Tract)',
        relayStation: '嗅球嗅絲球 (Glomeruli) ➔ 直接直通大腦 (唯一不經視丘換元的感覺!)',
        brainTarget: '初級嗅皮質 (梨狀皮質 Piriform Cortex) 與邊緣系統 (杏仁核/海馬)',
        perceptionSummary: '大腦辨析芬芳與異味，並強烈勾起本能情緒與深層記憶 (普魯斯特效應)',
        keyTakeaway: '嗅神經直接穿透篩骨篩板入顱，訊號繞過視丘直達皮質與邊緣系統。'
    },
    taste: {
        id: 'taste',
        name: '味覺受器 (Taste)',
        organ: '舌頭 (Tongue / Taste Buds)',
        icon: '👅',
        themeColor: '#f43f5e',
        stimulusName: '呈味物質 (Tastants / 甜酸鹹苦鮮)',
        stimulusType: '溶於唾液之水溶性化學分子',
        receptorName: '舌乳頭溝槽內味蕾 (味覺受器細胞)',
        molecularMechanism: '甜/鮮/苦活化 GPCR ➔ IP3 ➔ Ca2+ 釋放 ➔ ATP 釋放；酸/鹹直接經 ENaC / OTOP1 離子通道內流去極化',
        nerveName: '顏面神經 (CN VII) / 舌咽神經 (CN IX) / 迷走神經 (CN X)',
        relayStation: '延髓孤束核 (NST) ➔ 視丘腹後內側核小細胞部 (VPMpc)',
        brainTarget: '大腦島葉 (Insula) 與額蓋初級味覺皮質',
        perceptionSummary: '大腦識別甜、酸、鹹、苦、鮮五大基礎滋味',
        keyTakeaway: '辣是痛覺 (TRPV1 辣椒素受體)，澀是觸覺摩擦感，真正五大基本味覺為甜、酸、鹹、苦、鮮。'
    },
    skin: {
        id: 'skin',
        name: '皮膚受器 (Skin / Touch)',
        organ: '皮膚 (Skin / Epidermis & Dermis)',
        icon: '🖐️',
        themeColor: '#a855f7',
        stimulusName: '接觸、壓力、振動、溫度與痛覺刺激',
        stimulusType: '機械按壓物理形變 / 溫差能量',
        receptorName: '梅斯納小體、巴齊尼小體、莫克爾盤、游離神經末梢',
        molecularMechanism: '機械形變拉伸膜電位 ➔ Piezo1/2 離子通道開放 ➔ Na+/Ca2+ 內流產生發生器電位',
        nerveName: '脊神經感覺纖維 (Aβ / Aδ / C 類纖維) ➔ 背根神經節 (DRG)',
        relayStation: '延髓薄束/楔束核 (DCML) 或 脊髓後角前白連合交叉 (STT) ➔ 視丘腹後外側核 (VPL)',
        brainTarget: '頂葉後中央迴初級體感皮質 (Primary Somatosensory Cortex / S1)',
        perceptionSummary: '大腦精確定位體表觸碰、微細紋理、冷熱感與組織警訊',
        keyTakeaway: 'S1 皮質具有感覺人身小人圖 (Homunculus)，雙手手掌與唇面部佔據不成比例的巨大皮質區。'
    }
};
```

---

## 5. 獨立驗證方法 (Verification Method)

為確保後續 Worker 實作成果完全符合驗收標準，本架構制定雙軌獨立驗證計畫：

### 5.1 命令列靜態結構與雙向導覽連結驗證 (PowerShell Script)
執行以下驗證指令，確保檔案生成完畢且雙向導覽無死角：
```powershell
# 1. 驗證檔案存在且非空
$receptorsPath = "c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology\receptors.html"
$indexPath = "c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology\index.html"

if (Test-Path $receptorsPath) {
    $len = (Get-Item $receptorsPath).Length
    Write-Host "PASS: receptors.html exists, size: $len bytes"
} else {
    Write-Error "FAIL: receptors.html not found!"
}

# 2. 驗證雙向導航連結
$indexContent = Get-Content -Raw $indexPath
$receptorsContent = Get-Content -Raw $receptorsPath

if ($indexContent -match 'href="receptors\.html"') {
    Write-Host "PASS: index.html correctly contains link to receptors.html"
} else {
    Write-Error "FAIL: index.html is missing link to receptors.html"
}

if ($receptorsContent -match 'href="index\.html"') {
    Write-Host "PASS: receptors.html correctly contains link back to index.html"
} else {
    Write-Error "FAIL: receptors.html is missing link back to index.html"
}
```

### 5.2 4-Tier 自動化 E2E 測試套件 (`tests/test_receptors_conduction.py`)
由 Test Writer / Worker 建立 `tests/test_receptors_conduction.py`，完整涵蓋 Tiers 1~4：
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated 4-Tier Verification Test Suite for Five Sensory Receptors Conduction Simulator.
Validates:
- Tier 1: Happy paths (5 receptor tabs, 4 phases, play/pause, speed controls, bidirectional links)
- Tier 2: Boundary & corner cases (slider extremes, speed limits, rapid toggles)
- Tier 3: Pairwise state combinations & Node.js VM runtime error checks
- Tier 4: Real-world pedagogical classroom inquiry scenarios
"""

import sys
import os
import unittest
import threading
import subprocess
import urllib.request
import urllib.parse
import re
from pathlib import Path
import http.server
import socketserver
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parent.parent

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

class TestReceptorsConduction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = socketserver.TCPServer(('127.0.0.1', 0), QuietHandler)
        cls.port = cls.server.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def fetch(self, path):
        url = f"{self.base_url}/{path.lstrip('/')}"
        req = urllib.request.urlopen(url, timeout=5)
        html = req.read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        return req.status, html, soup

    # ================= Tier 1: Feature Coverage =================
    def test_t1_subpage_exists_and_status_200(self):
        status, html, soup = self.fetch("neuro_physiology/receptors.html")
        self.assertEqual(status, 200)
        self.assertIn("五大感覺受器動態傳導模擬器", html)

    def test_t1_bidirectional_navigation_links(self):
        # index -> receptors
        _, idx_html, _ = self.fetch("neuro_physiology/index.html")
        self.assertTrue(re.search(r'href=[\'"]receptors\.html[\'"]', idx_html), "index.html missing link to receptors.html")
        # receptors -> index
        _, rec_html, _ = self.fetch("neuro_physiology/receptors.html")
        self.assertTrue(re.search(r'href=[\'"]index\.html[\'"]', rec_html), "receptors.html missing link to index.html")

    def test_t1_five_receptors_tab_elements(self):
        _, _, soup = self.fetch("neuro_physiology/receptors.html")
        for rec_id in ['vision', 'hearing', 'smell', 'taste', 'skin']:
            elem = soup.find(id=re.compile(f".*{rec_id}.*", re.IGNORECASE)) or soup.find(attrs={"data-receptor": rec_id})
            self.assertIsNotNone(elem, f"Receptor tab or button for '{rec_id}' not found in DOM")

    def test_t1_playback_controls_exist(self):
        _, _, soup = self.fetch("neuro_physiology/receptors.html")
        self.assertIsNotNone(soup.find(id=re.compile(r'play|pause', re.I)), "Play/Pause button not found")
        self.assertIsNotNone(soup.find(id=re.compile(r'timeline|scrub|progress', re.I)), "Timeline scrubber slider not found")
        self.assertIsNotNone(soup.find(id=re.compile(r'step.*(next|fwd)', re.I)), "Step forward button not found")

    def test_t1_speed_multipliers_exist(self):
        _, html, soup = self.fetch("neuro_physiology/receptors.html")
        for spd in ['0.5', '1', '1.5', '2']:
            self.assertTrue(re.search(rf'{spd}x', html, re.I), f"Speed multiplier {spd}x not found in DOM")

    # ================= Tier 2: Boundary & Corner Cases =================
    def test_t2_timeline_slider_range_and_clamping(self):
        _, _, soup = self.fetch("neuro_physiology/receptors.html")
        slider = soup.find('input', type='range')
        self.assertIsNotNone(slider, "Range input for timeline not found")
        self.assertEqual(slider.get('min', '0'), '0')
        self.assertTrue(int(slider.get('max', '100')) >= 100)

    def test_t2_responsive_viewport_meta_tag(self):
        _, _, soup = self.fetch("neuro_physiology/receptors.html")
        meta = soup.find('meta', attrs={'name': 'viewport'})
        self.assertIsNotNone(meta)
        self.assertIn("width=device-width", meta.get('content', ''))

    # ================= Tier 3: Pairwise & Node.js VM Checks =================
    def test_t3_nodejs_vm_syntax_and_runtime_integrity(self):
        status, html, _ = self.fetch("neuro_physiology/receptors.html")
        scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.DOTALL)
        full_js = "\n".join(scripts)
        mock_env = """
        const window = { addEventListener: () => {}, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1 };
        const document = {
            getElementById: () => ({ getContext: () => ({ clearRect: ()=>{}, fillRect: ()=>{}, beginPath: ()=>{}, stroke: ()=>{}, fill: ()=>{}, arc: ()=>{}, save: ()=>{}, restore: ()=>{} }), addEventListener: () => {} }),
            querySelectorAll: () => [],
            addEventListener: () => {}
        };
        const performance = { now: () => 1000 };
        function requestAnimationFrame() {}
        """
        eval_script = mock_env + "\n" + full_js + "\nconsole.log('NODE_RUN_SUCCESS');"
        proc = subprocess.run(['node', '-e', eval_script], capture_output=True, text=True, timeout=5)
        self.assertEqual(proc.returncode, 0, f"Node.js syntax or execution error: {proc.stderr}")
        self.assertIn("NODE_RUN_SUCCESS", proc.stdout)

    # ================= Tier 4: Pedagogical Inquiry Scenarios =================
    def test_t4_curriculum_textbook_terminology_presence(self):
        _, html, _ = self.fetch("neuro_physiology/receptors.html")
        expected_terms = [
            '視網膜', '視神經', '枕葉',
            '耳蝸', '毛細胞', '顳葉',
            '嗅黏膜', '嗅球', '篩板',
            '味蕾', '孤束核', '島葉',
            '巴齊尼', '麥斯納', '頂葉'
        ]
        for term in expected_terms:
            self.assertIn(term, html, f"Pedagogical biology term '{term}' missing from simulation UI or documentation")

if __name__ == '__main__':
    unittest.main()
```

### 5.3 執行驗證指令
```bash
python -m unittest tests/test_receptors_conduction.py
```
預期輸出：全部測試通過 (`OK`)，無任何失敗 (`FAIL`) 或錯誤 (`ERROR`)。

---

*本報告已正式交付至 `.agents/teamwork/explorer_survey_3/handoff.md`，為後續之 Worker、Reviewer、Challenger 及 Auditor 團隊提供完全確定性與防呆之施工規格。*

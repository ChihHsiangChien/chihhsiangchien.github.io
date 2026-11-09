針對解剖構造呼叫較高級的模型。為視覺、聽覺、嗅覺、味覺、皮膚五大感覺受器製作動態傳導模擬器（如動畫般呈現傳導歷程，進程速度由使用者控制），並以獨立子頁面形式與 neuro_physiology 專案建立雙向連結。

Working directory: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\neuro_physiology
Integrity mode: demo
The team must NOT: copy code from existing open-source projects for core logic, run external scripts or delegate execution to other tools

## Reference Material
- 視覺受器（眼睛）：光線 -> 受器 -> 神經 -> 腦 (C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/media_1794186604265_1c31bbf3.jpg)
- 聽覺受器（耳朵）：聲音 -> 受器（耳蝸毛細胞等） -> 神經 -> 腦 (C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/media_1794186611900_7c128f66.jpg)
- 嗅覺受器（鼻腔）：氣味 -> 受器 -> 神經 -> 腦 (C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/media_1794186626170_48b02c79.jpg)
- 味覺受器（舌頭）：味道 -> 受器 -> 神經 -> 腦 (C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/media_1794186636917_ac40956d.jpg)
- 皮膚受器（皮膚）：溫度、接觸及壓力等刺激 -> 受器 -> 神經 -> 腦 (C:/Users/User/.gemini/antigravity/brain/a4696a0b-249e-4c39-9c6f-a2571143e63a/.user_uploaded/media_1794186649546_b5d16396.jpg)

## Requirements

### R1. 五大感覺受器動態傳導模擬
實現視覺、聽覺、嗅覺、味覺、皮膚五種感覺受器的動態傳導模擬動畫，呈現「刺激 -> 受器 -> 神經 -> 腦」的訊號傳導歷程。動畫流程自動展示傳導動態，不要求使用者調整各項刺激內容。

### R2. 動畫進程速度控制
提供進程速度控制介面，使使用者能控制動畫播放狀態與速度（包含播放/暫停、速度調整或進度切換），便於觀察各階段的傳導動態。

### R3. neuro_physiology 專案獨立子頁面整合
在 `neuro_physiology` 目錄下建立獨立子頁面，並在現有首頁（`index.html`）與新子頁面之間建立雙向導覽連結，確保可互相連結存取。

## Acceptance Criteria

### 五大受器傳導模擬 (Receptor Simulations)
- [ ] 介面具備視覺、聽覺、嗅覺、味覺、皮膚五種受器的展示區域或切換模組。
- [ ] 每個受器皆呈現完整的「刺激 -> 受器 -> 神經 -> 腦」傳導動態歷程。
- [ ] 動畫流程自動演繹，不需使用者設定或調整刺激參數。

### 進程控制功能 (Progress & Speed Control)
- [ ] 提供播放與暫停切換按鈕，使用者可隨時暫停及繼續動畫。
- [ ] 提供播放速度控制（如倍速按鈕或速度滑桿），可即時調節動畫播放速度。

### 專案整合與導覽 (Project Integration)
- [ ] 在 `neuro_physiology` 目錄下以獨立子頁面形式實現（如 `receptors.html`）。
- [ ] 現有 `neuro_physiology/index.html` 與新子頁面具備可正常點擊互通的導覽連結。

### 驗證機制 (Verification)
- [ ] 透過自動化 DOM/腳本檢查或獨立測試，確認頁面載入無 JavaScript 錯誤，且五大受器模擬區塊與播放/速度控制功能皆可正常操作與響應。
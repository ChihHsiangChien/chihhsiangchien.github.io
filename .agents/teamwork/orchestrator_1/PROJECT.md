# Project: Five Sensory Receptors Dynamic Conduction Simulator (五大感覺受器動態傳導模擬器)

## Architecture
- Static SPA subpage embedded inside `neuro_physiology/`: `neuro_physiology/receptors.html`
- Bidirectional navigation:
  - `neuro_physiology/index.html` <--> `neuro_physiology/receptors.html`
  - Homepage `index.html` (under `神經與感覺`) --> `neuro_physiology/receptors.html`
- 100% self-contained Vanilla JS (ES6+) + HTML5 Canvas 2D engine with procedural vector graphics, Bezier curves, and particle dynamics.
- Normalized timeline state machine ($T \in [0.0, 1.0]$) driving deterministic 4-stage conduction:
  - Phase 0 ($0.00 \le T < 0.25$): 刺激傳遞 (Stimulus approach)
  - Phase 1 ($0.25 \le T < 0.50$): 受器轉導 (Receptor transduction & micro callout)
  - Phase 2 ($0.50 \le T < 0.80$): 神經傳導 (Action potential propagation & relay)
  - Phase 3 ($0.80 \le T \le 1.00$): 大腦皮質感知 (Cortical activation & cognitive perception)
- Comprehensive user playback controls:
  - Play/Pause toggle (with Spacebar shortcut)
  - Speed multiplier buttons (`0.5x`, `1.0x`, `1.5x`, `2.0x`) and continuous speed slider (0.2x-3.0x)
  - Interactive progress scrubber (0% - 100%) and step forward/backward buttons
  - Loop toggle and restart button
- Five dedicated sensory receptor modules:
  1. 視覺 (Vision): 光線 ➔ 視網膜 (視桿/視錐超極化) ➔ 視神經 (CN II) / 視交叉 / LGN ➔ 枕葉初級視覺皮質 (V1)
  2. 聽覺 (Hearing): 聲波 ➔ 鼓膜/聽小骨 ➔ 耳蝸基底膜行波 / 柯蒂氏器毛細胞 K+ 內流 ➔ 聽神經 (CN VIII) / 上橄欖核 / 下丘 / MGN ➔ 顳葉初級聽覺皮質 (A1)
  3. 嗅覺 (Smell): 氣味分子 ➔ 嗅上皮 (Golf / cAMP / Cl- 外流) ➔ 嗅神經 (CN I) 穿篩板 ➔ 嗅球 ➔ 梨狀嗅皮質與邊緣系統 (強調不經視丘直接抵達皮質)
  4. 味覺 (Taste): 呈味物 ➔ 舌乳頭味蕾微絨毛 (GPCR / 離子通道) ➔ 腦神經 (CN VII/IX/X) ➔ 孤立束核 ➔ 視丘 VPMpc ➔ 前島葉初級味覺皮質
  5. 皮膚 (Skin): 機械壓力/溫度刺激 ➔ 梅斯納/巴齊尼/莫克爾/魯菲尼/自由末梢 ➔ 脊神經節 DRG ➔ 雙軌傳導 (後索 DCML vs 脊髓丘腦束 STT) ➔ 視丘 VPL ➔ 頂葉初級體感皮質 (S1)

## Code Layout
- `neuro_physiology/receptors.html`: The independent sensory receptors simulator subpage
- `neuro_physiology/index.html`: Main neurophysiology lab SPA (entry point for bidirectional link)
- `index.html`: Repository root homepage (links to `neuro_physiology/receptors.html` under `神經與感覺`)
- `tests/test_receptors_conduction.py`: 4-Tier automated E2E test suite
- `tests/test_challenger_receptors_stress.py`: Empirical adversarial stress test harness 1
- `tests/test_challenger2_stress.py`: Empirical adversarial stress test harness 2

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1. 視覺受器動態傳導模擬 | 光線 ➔ 視網膜 ➔ 視神經 ➔ 枕葉皮質，含微觀視紫質褪色與超極化轉導 | M2 | ORIGINAL_REQUEST R1 |
| 2 | F2. 聽覺受器動態傳導模擬 | 聲波 ➔ 鼓膜聽小骨 ➔ 耳蝸毛細胞 K+ 內流 ➔ 聽神經 ➔ 顳葉皮質 | M2 | ORIGINAL_REQUEST R1 |
| 3 | F3. 嗅覺受器動態傳導模擬 | 氣味分子 ➔ 嗅黏膜 ➔ 嗅神經/篩板 ➔ 嗅球 ➔ 嗅皮質 (不經視丘) | M2 | ORIGINAL_REQUEST R1 |
| 4 | F4. 味覺受器動態傳導模擬 | 呈味物 ➔ 舌乳頭味蕾微絨毛 ➔ CN VII/IX/X ➔ 孤立束核 ➔ 島葉皮質 | M2 | ORIGINAL_REQUEST R1 |
| 5 | F5. 皮膚受器動態傳導模擬 | 觸壓/溫痛 ➔ 多型真皮小體 ➔ DRG ➔ DCML/STT 雙軌 ➔ 頂葉 S1 皮質 | M2 | ORIGINAL_REQUEST R1 |
| 6 | F6. 四階段狀態機時序 | 0.0-1.0 標準化時間軸驅動刺激、受器、神經、腦四階段 | M2 | ORIGINAL_REQUEST R1 |
| 7 | F7. 播放與暫停控制 | 播放/暫停即時切換按鈕，定格觀察 | M2 | ORIGINAL_REQUEST R2 |
| 8 | F8. 播放進程倍速控制 | 提供 0.5x, 1x, 1.5x, 2x 快速按鈕及連續速度滑桿 (0.2x-3.0x) | M2 | ORIGINAL_REQUEST R2 |
| 9 | F9. 進度尋軌與單步切換 | 0-100% 尋軌滑桿與單步上一階段/下一階段跳轉功能 | M2 | ORIGINAL_REQUEST R2 |
| 10 | F10. 獨立子頁面架構與 RWD | 在 `neuro_physiology/` 目錄建立 `receptors.html`，具備暗黑高科技風格與行動自適應 | M2 | ORIGINAL_REQUEST R3 |
| 11 | F11. 專案雙向導航整合 | `neuro_physiology/index.html` 與 `receptors.html` 雙向互通，且在根目錄 `index.html` 掛載 | M3 | ORIGINAL_REQUEST R3 |
| 12 | F12. 自動化驗證與程式碼健壯 | 4-Tier 測試套件全面通過，Console 零未捕獲例外，100% 離線純原生實作 | M1, M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Testing Suite & Infra | Design & implement `tests/test_receptors_conduction.py` (Tiers 1-4) & publish `TEST_READY.md` | none | DONE |
| M2 | Five Receptors Simulator SPA | Implement `neuro_physiology/receptors.html` with Canvas 2D engine, timeline controller, 5 receptor simulations, UI & controls | none | DONE |
| M3 | Bidirectional Navigation Integration | Mount links in `neuro_physiology/index.html` and root `index.html`, verify cross-navigation | M2 | DONE |
| M4 | Final E2E Verification & Hardening | Pass 100% E2E test suite (Tiers 1-4) + Tier 5 adversarial stress testing & forensic audit | M1, M2, M3 | DONE |

## Interface Contracts
### `neuro_physiology/receptors.html` DOM & API Contract
- Five receptor selection tabs:
  - Elements with IDs: `#tabBtn_vision`, `#tabBtn_hearing`, `#tabBtn_smell`, `#tabBtn_taste`, `#tabBtn_skin`
  - Attribute: `data-receptor="vision|hearing|smell|taste|skin"`
- Playback & Speed Controls:
  - Play/Pause button: `#playPauseBtn`
  - Timeline slider: `#progressSlider` (range 0 to 100 or 1000)
  - Speed selector / buttons: `.speed-btn` (`0.5x`, `1x`, `1.5x`, `2x`) and `#speedSlider`
  - Step navigation: `#stepPrevBtn`, `#stepNextBtn`, `#resetBtn`
- Navigation elements:
  - Link to main lab: `<a href="index.html">`
  - Link to root homepage: `<a href="../index.html">`

### `neuro_physiology/index.html` Navigation Contract
- Header navigation pill: `<a href="receptors.html">` titled "五大感覺受器"

### Root `index.html` Navigation Contract
- Under section `<h1>神經與感覺</h1>` (line 163):
  `<a href="neuro_physiology/receptors.html">五大感覺受器動態傳導模擬 (視覺、聽覺、嗅覺、味覺、皮膚之刺激、受器、神經至大腦)</a>`

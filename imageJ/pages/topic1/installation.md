# ImageJ與Fiji的差異及安裝指南

## 簡介
Fiji（Fiji Is Just ImageJ）是imagej + 預裝plugins。推薦使用Fiji進行醫學影像分析。

## 版本比較

### ImageJ
- 核心功能精簡
- 運行速度較快
- 佔用資源少
- 適合基礎影像處理（Image Processing）
- 需要手動安裝插件（Plugins）

### FIJI
- 預裝大量插件（Plugins）
- 更新頻率較高
- 內建教學資源
- 適合進階分析（Advanced Analysis）
- 佔用空間較大

## 功能特色比較

| 功能 | ImageJ | Fiji |
|------|---------|------|
| 基礎影像處理（Image Processing）| ✓ | ✓ |
| Bio-Formats 支援 | 需額外安裝 | 內建 |
| 3D 影像分析（3D Image Analysis）| 需額外安裝 | 內建 |
| 機器學習支援（Machine Learning）| 需額外安裝 | 內建基礎功能 |

## Fiji安裝步驟

### 1. 下載 Fiji
 [FIJI官方網站](https://fiji.sc/) 下載適合您作業系統的版本：
- Windows 64-bit
- Windows 32-bit
- macOS（Intel/Apple Silicon）
- Linux（64-bit）

### 2. 安裝與設定
1. 解壓縮下載的檔案到您想安裝的位置
2. 執行 fiji-windows-x64.exe
3. 執行`Help > Update ImageJ...`
4. 執行`Help > Update...`



> **注意事項**
> - 建議安裝在非系統槽（如D槽）的純英文路徑
> - 確保安裝位置有足夠的硬碟空間（約2GB）
> - 需要網路連接進行自動更新
> - 可能需要管理員權限進行安裝

## 記憶體設定

### 調整記憶體分配
1. `Edit > Options > Memory & Threads`
2. 建議設定：
   - 最大記憶體（Maximum Memory）：系統RAM的70%
   - 執行緒數量（Parallel Threads）：CPU核心數-1

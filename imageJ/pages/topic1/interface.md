# 基本操作介面介紹

## 主要介面組成

### 工具列（Toolbar）
- 選擇工具（Selection Tools）
- 繪圖工具（Drawing Tools）
- 放大縮小（Zoom Tools）
- 捲動工具（Scrolling Tool）

### 選單列（Menu Bar）
- 檔案操作（File Operations）
- 影像編輯（Edit Functions）
- 影像處理（Image Processing）
- 分析工具（Analysis Tools）
- 插件管理（Plugins）

### 狀態列（Status Bar）
- 座標資訊（Coordinates）
- 像素值（Pixel Values）
- 影像資訊（Image Info）
- 記憶體使用（Memory Usage）

## 選擇工具詳解

### 矩形選擇（Rectangular Selection）
用於選擇矩形區域，按住Shift鍵可選擇正方形。
- 左鍵拖曳：建立新選擇
- Ctrl+左鍵：添加到現有選擇
- Alt+左鍵：從現有選擇中減去

### 橢圓選擇（Oval Selection）
用於選擇圓形或橢圓形區域，按住Shift鍵可選擇正圓形。
- 基本操作同矩形選擇
- 適合選擇圓形細胞或組織

### 多邊形選擇（Polygon Selection）
用於選擇不規則形狀，點擊建立頂點，雙擊完成選擇。
- 適合選擇不規則組織區域
- 可使用Backspace刪除上一個點

## 測量工具使用

### 直線工具（Line Tool）
- 測量長度（Length Measurement）
- 角度測量（Angle Measurement）
- 路徑分析（Path Analysis）

### 點選工具（Point Tool）
- 標記特定位置
- 計數功能（Counting）
- 座標記錄（Coordinate Recording）

## 常用快速鍵

### 檔案操作
- `Ctrl + O`：開啟檔案
- `Ctrl + S`：儲存檔案
- `Ctrl + W`：關閉目前影像

### 編輯操作
- `Ctrl + C`：複製
- `Ctrl + V`：貼上
- `Ctrl + Z`：復原

### 影像處理
- `Ctrl + Shift + A`：取消選擇
- `Ctrl + M`：測量
- `Ctrl + H`：顯示直方圖

## 實作練習

### 練習 1：基本工具操作
1. 使用不同的選擇工具圈選區域
2. 練習快速鍵操作
3. 測試各種測量工具

### 練習 2：介面自訂
1. 自訂工具列排列
2. 設定常用快速鍵
3. 調整顯示選項

## 常見問題解決

### Q: 工具列消失了怎麼辦？
A: 使用 `Window > Show All` 或重新啟動 ImageJ。

### Q: 選擇工具無法使用？
A: 確認目前是否有開啟的影像，以及影像是否處於可編輯狀態。

### Q: 快速鍵無效？
A: 檢查是否有其他程式佔用相同的快速鍵，或嘗試重新設定快速鍵。 
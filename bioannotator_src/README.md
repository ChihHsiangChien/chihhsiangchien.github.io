# bioannotator

一個模組化的線上生物圖譜互動教材與評量系統。

## 專案特色

- **編輯模式 (Edit Mode)** (`/edit/:dataset`)
  - 專為教師設計的所見即所得編輯介面。
  - 只需上傳圖片，即可透過點擊與拖曳輕鬆新增、調整標籤與指引線。
  - 可自訂標籤樣式（顏色、字體大小）與遊戲設定（時間、分數）。
  - 完成後可產生 QR Code，方便在課堂上快速分享給學生。

- **翻牌模式 (Toggle Mode)** (`/toggle/:dataset`)
  - 適合學生自學與複習。
  - 點擊圖上的標示點即可顯示或隱藏對應的構造名稱，像數位抽認卡一樣加深記憶。

- **拖曳遊戲模式 (Drag Mode)** (`/drag/:dataset` & `/student-drag/:dataset`)
  - 將靜態圖譜轉化為有趣的配對遊戲。
  - 學生需將被打亂的標籤拖曳至正確的位置。
  - 系統會即時給予回饋（答對或答錯），並計算時間與分數。
  - 提供專為學生設計的獨立入口 (`/student-drag`)，展示所有可玩的遊戲列表。

## 專案結構

```
public/                   # Static assets and datasets
  datasets/               # Stores all module data
    [dataset-name]/
      image.png           # Image file for the module
      data.json           # Label definitions and settings
src/                      # Source code
  App.vue                 # 主應用程式組件
  main.js                 # Vue App 初始化
  router/                 # Vue Router 路由設定
  pages/                  # 各模式的頁面組件
    EditPage.vue          # Teacher interface for label creation
    TogglePage.vue        # Student interactive reveal mode
    DragPage.vue          # Student drag assessment mode
  components/             # Reusable Vue components (e.g., QrCodeModal.vue)
  layouts/                # Layout components for different route groups
  config/                 # Configuration files (e.g., datasets.js)
```
## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173/bioannotator/ in your browser

4. Navigate to different modes:
   - Edit: http://localhost:5173/bioannotator/#/edit/heart
   - Toggle: http://localhost:5173/bioannotator/#/toggle/heart  
   - Drag: http://localhost:5173/bioannotator/#/drag/heart

## Usage

### For Teachers (Edit Mode)
1. Upload or select an image
2. Click on the image to add label positions
3. Drag labels to reposition them
4. Edit label text in the control panel
5. Save your work (currently logs to console)

### For Students (Toggle Mode)
1. Click on gray label areas to reveal anatomical terms
2. Progress bar shows completion percentage
3. Reset button to start over

### For Students (Drag Mode)
1. Drag the shuffled labels from the bottom to correct positions on the image
2. Scoring system tracks correct/incorrect attempts
3. Timer tracks completion time
4. Bonus points awarded for speed

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to GitHub Pages.

## Adding New Datasets

1. Create a new folder in `public/datasets/[name]/`
2. Add your image file (PNG, JPG, SVG)
3. Create a `data.json` file with this structure:

```json
{
  "title": "Dataset Title",
  "image": "filename.jpg",
  "labels": [
    {
      "text": "Label Name",
      "position": { "x": 100, "y": 150 },
      "connector": { "x": 200, "y": 200 }
    }
  ]
}
```

4. Access your dataset at `/edit/[name]`, `/toggle/[name]`, or `/drag/[name]`

## Tech Stack

- Vue 3 + Vite
- Tailwind CSS
- Vue Router
- VueUse Motion
- SVG for connectors and labels
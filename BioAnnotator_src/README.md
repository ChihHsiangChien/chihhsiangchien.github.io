# BioAnnotator

A modular, web-based interactive labeling and assessment system for biology education.

## Features

- **Edit Mode** (`/edit/:dataset`) - Teacher interface for creating and editing anatomical labels
- **Toggle Mode** (`/toggle/:dataset`) - Student learning mode with clickable reveal functionality  
- **Drag Mode** (`/drag/:dataset`) - Student assessment mode with drag-and-drop scoring

## Project Structure

```
public/                   # Static assets and datasets
  datasets/               # Stores all module data
    [dataset-name]/
      image.png           # Image file for the module
      data.json           # Label definitions and settings
src/                      # Source code
  App.vue                 # Main application component
  main.js                 # Vue app initialization
  router/                 # Vue Router configuration
  pages/                  # Route components for different modes
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

3. Open http://localhost:5173/BioAnnotator/ in your browser

4. Navigate to different modes:
   - Edit: http://localhost:5173/BioAnnotator/#/edit/heart
   - Toggle: http://localhost:5173/BioAnnotator/#/toggle/heart  
   - Drag: http://localhost:5173/BioAnnotator/#/drag/heart

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
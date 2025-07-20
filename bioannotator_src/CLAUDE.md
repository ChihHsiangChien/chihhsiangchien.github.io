# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

bioannotator is a modular, web-based interactive labeling and assessment system for biology education. It enables educators to annotate anatomical/ecological images and create interactive learning modules for students.

## Tech Stack

- **Framework:** Vue 3 + Vite
- **Styling:** Tailwind CSS  
- **Routing:** Vue Router
- **Rendering:** SVG for connectors and labels
- **Drag interaction:** Interact.js or VueUse Motion
- **Data storage:** JSON files per module
- **Deployment:** GitHub Pages (static build)

## Development Commands

Since this project uses Vue 3 + Vite, typical commands would be:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linting (if configured)

## Architecture

### Core Modes
1. **Edit Mode** (`/edit/:dataset`) - Teacher interface for creating/editing labels
2. **Toggle Mode** (`/toggle/:dataset`) - Student learning mode with reveal functionality  
3. **Drag Mode** (`/drag/:dataset`) - Student assessment mode with drag-and-drop

### Directory Structure
```
public/datasets/          # Dataset storage
  [dataset-name]/
    image.png            # Image file
    data.json           # Label definitions
src/
  pages/                # Route components
    EditPage.vue        # Label creation interface
    TogglePage.vue      # Interactive reveal mode
    DragPage.vue        # Drag assessment mode
  components/           # Reusable components
    LabelEditor.vue     # Label editing functionality
    LabelToggle.vue     # Toggle reveal component
    DragLabelGame.vue   # Drag interaction component
    ExportImportPanel.vue # Data management
```

### Data Format
Each dataset uses this JSON structure:
```json
{
  "title": "心臟", 
  "image": "heart.png",
  "labels": [
    {
      "text": "左心室",
      "position": { "x": 150, "y": 220 },
      "connector": { "x": 180, "y": 300 }
    }
  ]
}
```

## Key Implementation Details

- Labels are positioned using absolute coordinates on images
- SVG connectors link labels to anatomical features
- Drag mode randomizes label order and tracks accuracy/timing
- Toggle mode reveals labels on click for guided learning
- All data persists as static JSON files for GitHub Pages deployment

## Route Structure
- `/edit/:dataset` - Teacher mode for label creation
- `/toggle/:dataset` - Student learning mode  
- `/drag/:dataset` - Student assessment mode
- Dataset parameter determines which module to load from `public/datasets/`
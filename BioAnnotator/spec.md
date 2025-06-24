# BioAnnotator

A modular, web-based interactive labeling and assessment system for biology education.

## 🎯 Project Purpose

Enable biology educators to:
- Annotate anatomical or ecological images (e.g., heart, brain, leaves)
- Save and reuse labeled images as teaching modules
- Provide interactive learning modes for students: toggle and drag
- Support individual deep linking into specific modules (e.g., /drag/heart)

---

## 🧱 Tech Stack

- **Framework:** Vue 3 + Vite
- **Styling:** Tailwind CSS
- **Routing:** Vue Router
- **Rendering:** SVG for connectors and labels
- **Drag and interaction:** Interact.js or VueUse Motion
- **Data storage:** JSON (saved per module)
- **Deployment:** GitHub Pages (static build)

---

## 📁 Directory Structure
public/
datasets/
heart/
image.png
data.json
brain/
image.jpg
data.json
leaf/
image.png
data.json

src/
App.vue
main.js
router.js
pages/
EditPage.vue
TogglePage.vue
DragPage.vue
components/
LabelEditor.vue
LabelToggle.vue
DragLabelGame.vue
ExportImportPanel.vue


---

## 🌐 Routes

| Path              | Description                          |
|-------------------|--------------------------------------|
| `/edit/:dataset`  | Teacher mode: create and edit labels |
| `/toggle/:dataset`| Student mode: toggle to reveal terms |
| `/drag/:dataset`  | Student mode: drag terms to targets  |

---

## 📝 Data Format (`data.json`)

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

🧩 Functional Modules
Edit Mode (/edit/:dataset)
Upload or select image

Add labels as draggable text boxes

Draw connector lines from label to image

Modify or delete labels

Save as JSON in /datasets/<name>/data.json

Toggle Mode (/toggle/:dataset)
Load image and JSON

Show covered labels (color blocks)

Click to reveal each term

All connectors visible for learning support

Drag Mode (/drag/:dataset)
Load image with empty label targets

Show randomized terms at bottom

Drag terms to correct positions

Timer and scoring system (accuracy + time)

Immediate feedback (correct/incorrect)

✨ Future Extensions
🧠 Interactive concept maps (multi-line support)

🗂 Multi-language label support (e.g., text.en, text.zh-TW)

🧪 Student response tracking (localStorage or backend)

🧲 Smart snapping when dragging

🧍 Accessibility support (TTS, keyboard nav)

📤 Export to PDF/image for printable handouts

🔒 Role-based access control (teacher vs student)

📱 Touch and mobile gesture support

🖼 Zoom & pan for large images

🧠 Teaching Use Cases
Use Case	URL Example
Human heart anatomy quiz	/drag/heart
Leaf structure drag test	/drag/leaf
Brain region toggle activity	/toggle/brain
Teacher edits liver labels	/edit/liver

🔐 Access Control (Optional Enhancements)
Only expose direct /drag/:dataset links to students

Do not display module selection interface

Optionally protect datasets with token or password
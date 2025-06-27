<template>
  <div class="edit-page">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Control Panel -->
      <div class="lg:col-span-1 order-last lg:order-first">
        <div class="bg-white rounded-lg shadow-lg p-4 space-y-2 sticky top-4">
          <h3 class="text-lg font-semibold border-b pb-2 mb-4">Controls</h3>

          <!-- Collapsible Section: Dataset Selector -->
          <div class="border rounded-lg overflow-hidden">
            <div class="flex justify-between items-center bg-gray-100 px-3 py-2 cursor-pointer" @click="toggleCollapse('datasetManagement')">
              <h4 class="text-md font-semibold">Dataset Management</h4>
              <span class="transform transition-transform duration-200" :class="{ 'rotate-180': !collapsedStates.datasetManagement }">▼</span>
            </div>
            <div class="p-3 space-y-4" v-show="!collapsedStates.datasetManagement">
              <!-- Dataset -->
              <div>
                <label class="block text-sm font-medium mb-2">Dataset</label>
                <div class="flex space-x-2">
                  <select v-model="dataset" @change="loadData" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option disabled value="">Select a dataset</option>
                    <option v-for="d in datasets" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
                <input v-model="newDatasetName" placeholder="New dataset name..." class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"/>
                <button @click="createDataset" class="mt-2 w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600">Create New</button>
              </div>

              <!-- Image Upload -->
              <div>
                <label class="block text-sm font-medium mb-2">Upload Image</label>
                <input type="file" @change="handleImageUpload" accept="image/*" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              </div>
              
              <!-- Title -->
              <div>
                <label class="block text-sm font-medium mb-2">Title</label>
                <input v-model="title" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter title"/>
              </div>

              <!-- Game Settings -->
              <div class="mt-4 pt-4 border-t">
                <h5 class="text-sm font-semibold mb-2">Drag & Drop Game Settings</h5>
                <div class="space-y-2">
                  <div><label class="block text-xs font-medium">Expected Duration (s)</label><input type="number" v-model.number="gameSettings.expectedDurationSeconds" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="e.g., 60"/></div>
                  <div><label class="block text-xs font-medium">Initial Score</label><input type="number" v-model.number="gameSettings.initialScore" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="e.g., 1000"/></div>
                  <div><label class="block text-xs font-medium">Penalty Per Wrong Attempt</label><input type="number" v-model.number="gameSettings.penaltyPerWrongAttempt" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="e.g., 50"/></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Canvas & Image Controls -->
          <div class="border rounded-lg overflow-hidden">
            <div class="flex justify-between items-center bg-gray-100 px-3 py-2 cursor-pointer" @click="toggleCollapse('canvasImageControls')">
              <h4 class="text-md font-semibold">Canvas & Image Controls</h4>
              <span class="transform transition-transform duration-200" :class="{ 'rotate-180': !collapsedStates.canvasImageControls }">▼</span>
            </div>
            <div class="p-3 bg-gray-50 space-y-3" v-show="!collapsedStates.canvasImageControls">
              <div>
                <label class="block text-xs font-medium">Canvas Width: {{ canvasWidth }}px</label>
                <input type="range" v-model.number="canvasWidth" min="400" max="2000" step="10" class="w-full"/>
              </div>
              <div>
                <label class="block text-xs font-medium">Canvas Height: {{ canvasHeight }}px</label>
                <input type="range" v-model.number="canvasHeight" min="300" max="1500" step="10" class="w-full"/>
              </div>
              <div>
                <label class="block text-xs font-medium">Image Scale: {{ imageSettings.scale.toFixed(2) }}</label>
                <input type="range" v-model.number="imageSettings.scale" min="0.1" max="3" step="0.05" class="w-full"/>
              </div>
            </div>
          </div>
          
          <!-- Selected Label Editor -->
          <div class="border rounded-lg overflow-hidden">
            <div class="flex justify-between items-center bg-gray-100 px-3 py-2 cursor-pointer" @click="toggleCollapse('selectedLabelEditor')">
              <h4 class="text-md font-semibold">Selected Label Editor</h4>
              <span class="transform transition-transform duration-200" :class="{ 'rotate-180': !collapsedStates.selectedLabelEditor }">▼</span>
            </div>
            <div v-show="!collapsedStates.selectedLabelEditor">
              <div v-if="selectedLabel" class="p-3 bg-gray-50 space-y-3">
                  <h4 class="text-md font-semibold mb-3">Edit Label</h4>
                  <div class="space-y-3">
                    <input v-model="selectedLabel.text" class="w-full px-2 py-1 border border-gray-300 rounded"/>
                    <div>
                      <label class="block text-xs font-medium">Font Size: {{ selectedLabel.style.fontSize }}px</label>
                      <input type="range" v-model.number="selectedLabel.style.fontSize" min="8" max="48" class="w-full"/>
                    </div>
                    <div>
                      <label class="block text-xs font-medium">Line Width: {{ selectedLabel.style.lineWidth }}px</label>
                      <input type="range" v-model.number="selectedLabel.style.lineWidth" min="1" max="10" class="w-full"/>
                    </div>
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium">Text Color</label>
                      <input type="color" v-model="selectedLabel.style.textColor" class="h-8 w-16 border-none rounded p-1 bg-white cursor-pointer"/>
                    </div>
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium">Line Color</label>
                      <input type="color" v-model="selectedLabel.style.lineColor" class="h-8 w-16 border-none rounded p-1 bg-white cursor-pointer"/>
                    </div>
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium">Label Background</label>
                      <input type="color" v-model="selectedLabel.style.bgColor" class="h-8 w-16 border-none rounded p-1 bg-white cursor-pointer"/>
                    </div>
                    <button @click="removeLabel(selectedLabelIndex)" class="w-full bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 text-sm">Delete Label</button>
                  </div>
              </div>
              <div v-else class="p-3 bg-gray-50 text-center text-sm text-gray-500">
                Click a label to edit it, or click on the image to add a new one.
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="space-y-2 pt-4 border-t">
            <button @click="addLabelAtCenter" class="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">Add New Label</button>
            <button @click="saveData" class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">Save & Download JSON</button>
          </div>
        </div>
      </div>

      <!-- Image Canvas -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h2 class="text-2xl font-bold mb-4">{{ title }}</h2>
          <div 
            class="relative inline-block bg-white border-2 border-gray-300 overflow-hidden" 
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
            @click.self="addLabel" 
            ref="canvasRef"
          >
            <img 
              v-if="imageUrl" 
              :src="imageUrl" 
              @load="onImageLoad" 
              ref="imageRef" 
              class="absolute cursor-grab"
              :style="{ left: imageSettings.x + 'px', top: imageSettings.y + 'px', width: imageDisplayWidth + 'px', height: imageDisplayHeight + 'px' }"
              @mousedown.prevent.stop="startDragImage"
            />
            <div v-else class="w-full h-[600px] bg-gray-200 flex items-center justify-center rounded-md">
              <p class="text-gray-500">Upload an image and start annotating</p>
            </div>

            <!-- Labels -->
            <div v-for="(label, index) in labels" :key="label.id"
              ref="labelRefs"
              class="absolute cursor-pointer"
              :style="{ left: label.position.x + 'px', top: label.position.y + 'px', transform: 'translate(-50%, -50%)' }"
              @mousedown.stop="startDrag(index, $event)">
              <!-- The combined box and text -->
              <div class="px-3 py-1 rounded text-center whitespace-nowrap"
                :style="{ 
                  backgroundColor: label.style.bgColor, 
                  border: selectedLabelIndex === index ? '2px solid #3b82f6' : `1px solid ${label.style.lineColor}`,
                  color: label.style.textColor, 
                  fontSize: label.style.fontSize + 'px'
                }">
                {{ label.text }}
              </div>
            </div>

            <!-- Connectors -->
            <svg v-if="imageUrl" class="absolute top-0 left-0 pointer-events-none" :width="canvasWidth" :height="canvasHeight">
              <g v-for="(label, index) in labelsWithConnectorPoints" :key="'g-' + index">
                <line
                  :x1="label.connectorStart.x" :y1="label.connectorStart.y"
                  :x2="label.connector.x" :y2="label.connector.y"
                  :stroke="label.style.lineColor"
                  :stroke-width="label.style.lineWidth"
                  :stroke-dasharray="label.style.lineStyle === 'dashed' ? '5,5' : 'none'"
                />
                <circle
                  :cx="label.connector.x" :cy="label.connector.y" r="6"
                  :fill="label.style.lineColor"
                  class="cursor-pointer pointer-events-auto"
                  @mousedown.stop="startDragConnector(index, $event)"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { availableDatasets } from '../config/datasets';

export default {
  name: 'EditPage',
  data() {
    return {
      datasets: [...availableDatasets], // Initialize from the centralized config
      dataset: this.$route.params.dataset || availableDatasets[0] || '', // Set default to the first available dataset, or empty
      newDatasetName: '',
      title: 'BioAnnotator',
      imageUrl: '',
      canvasWidth: 800,
      canvasHeight: 600,
      imageSettings: {
        x: 0,
        y: 0,
        scale: 1,
        naturalWidth: 0,
        naturalHeight: 0,
      },
      defaultLabelStyle: {
        fontSize: 14,
        textColor: '#000000',
        lineColor: '#000000',
        lineWidth: 3,
        lineStyle: 'solid',
        bgColor: '#ffffff',
      },
      labelDimensions: [],
      labels: [],
      selectedLabelIndex: -1,
      dragIndex: -1,
      dragConnectorIndex: -1,
      isDraggingImage: false,
      dragOffset: { x: 0, y: 0 },
      collapsedStates: {
        datasetManagement: true,
        canvasImageControls: true,
        selectedLabelEditor: false,
      },
      // Game settings for DragPage
      gameSettings: {
        expectedDurationSeconds: 60,
        initialScore: 1000,
        penaltyPerWrongAttempt: 50,
      },
    }
  },
  computed: {
    selectedLabel() {
      return this.selectedLabelIndex !== -1 ? this.labels[this.selectedLabelIndex] : null;
    },
    imageDisplayWidth() {
      return this.imageSettings.naturalWidth * this.imageSettings.scale;
    },
    imageDisplayHeight() {
      return this.imageSettings.naturalHeight * this.imageSettings.scale;
    },
    labelsWithConnectorPoints() {
      if (this.labelDimensions.length !== this.labels.length) {
        return this.labels.map(l => ({ ...l, connectorStart: l.position }));
      }

      return this.labels.map((label, index) => {
        const dims = this.labelDimensions[index];
        if (!dims || !dims.width) {
          return { ...label, connectorStart: label.position };
        }

        const labelWidth = dims.width;
        const labelHeight = dims.height;
        const labelCenter = label.position;
        const connectorEnd = label.connector;

        const deltaX = connectorEnd.x - labelCenter.x;
        const deltaY = connectorEnd.y - labelCenter.y;

        const halfWidth = labelWidth / 2;
        const halfHeight = labelHeight / 2;

        // If the connector end is inside the label, the line should have zero length.
        if (Math.abs(deltaX) <= halfWidth && Math.abs(deltaY) <= halfHeight) {
          return { ...label, connectorStart: { ...connectorEnd } };
        }

        const slope = deltaY / deltaX;
        const diagSlope = halfHeight / halfWidth;

        let finalX, finalY;

        if (deltaX === 0) { // Vertical line
            finalX = labelCenter.x;
            finalY = labelCenter.y + halfHeight * Math.sign(deltaY);
        } else if (Math.abs(slope) < diagSlope) {
            // Intersects left/right
            finalX = labelCenter.x + halfWidth * Math.sign(deltaX);
            finalY = labelCenter.y + halfWidth * slope * Math.sign(deltaX);
        } else {
            // Intersects top/bottom
            finalX = labelCenter.x + halfHeight / slope * Math.sign(deltaY);
            finalY = labelCenter.y + halfHeight * Math.sign(deltaY);
        }

        return { ...label, connectorStart: { x: finalX, y: finalY } };
      });
    }
  },
  watch: {
    'selectedLabel.style': {
      handler(newStyle) {
        if (newStyle) {
          // Update the default style object with the new values
          this.defaultLabelStyle = { ...this.defaultLabelStyle, ...newStyle };
        }
      },
      deep: true // Watch for changes inside the style object
    },
    // Watch for changes in the route parameter to load new datasets
    '$route.params.dataset': {
      handler(newDataset) {
        this.dataset = newDataset;
        this.loadData();
      },
    }
  },
  mounted() {
    this.loadData();
    // In a real app, you'd fetch the dataset list from a server.
    // For this example, we'll just use the hardcoded one.
    // this.fetchDatasets(); 
    
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  },
  updated() {
    this.$nextTick(() => {
      if (this.$refs.labelRefs) {
        const newDimensions = this.$refs.labelRefs.map(el => el ? { width: el.offsetWidth, height: el.offsetHeight } : { width: 0, height: 0 });
        // Prevent an infinite update loop by only updating if the dimensions have actually changed.
        // A simple stringify is sufficient here to compare the array of objects.
        if (JSON.stringify(newDimensions) !== JSON.stringify(this.labelDimensions)) {
          this.labelDimensions = newDimensions;
        }
      }
    });
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  },
  methods: {
    async findDefaultImage(datasetName) {
      const extensions = ['png', 'jpg', 'jpeg', 'svg', 'gif'];
      for (const ext of extensions) {
        const imageUrl = `${import.meta.env.BASE_URL}datasets/${encodeURIComponent(datasetName)}/image.${ext}`;
        try {
          // Use fetch with HEAD method to check for existence without downloading the body
          const response = await fetch(imageUrl, { method: 'HEAD' });
          if (response.ok) {
            return imageUrl; // Found it!
          }
        } catch (e) {
          // This will happen for 404s or network errors, which is expected.
          // We can silently continue to the next extension.
        }
      }
      return ''; // No default image found
    },
    async loadData() {
      if (!this.dataset) return;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/data.json?t=${new Date().getTime()}`);
        if (!response.ok) {
          throw new Error(`Failed to load data.json, status: ${response.status}`);
        }
        
        const data = await response.json();
        this.canvasWidth = data.canvas?.width || 800;
        this.canvasHeight = data.canvas?.height || 600;
        if (data.imageSettings) {
          this.imageSettings = { ...this.imageSettings, ...data.imageSettings };
        }
        this.gameSettings = {
          expectedDurationSeconds: 60, initialScore: 1000, penaltyPerWrongAttempt: 50,
          ...(data.gameSettings || {})
        };
        this.title = data.title || 'New Annotation';
        this.labels = (data.labels || []).map(label => ({
          id: self.crypto.randomUUID(),
          ...label,
          style: { ...this.defaultLabelStyle, ...label.style }
        }));
        if (data.image) {
          this.imageUrl = `${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/${data.image}`;
        } else {
          this.imageUrl = '';
        }
      } catch (error) {
        console.error('Error loading data.json:', error);
        this.resetCanvas();
        this.title = this.dataset;
        const defaultImage = await this.findDefaultImage(this.dataset);
        if (defaultImage) {
          this.imageUrl = defaultImage;
        }
      }
    },
    resetCanvas() {
        this.title = 'New Annotation';
        this.imageUrl = '';
        this.labels = [];
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.imageSettings = {
            x: 0, y: 0, scale: 1, naturalWidth: 0, naturalHeight: 0
        };
        this.gameSettings = {
            expectedDurationSeconds: 60,
            initialScore: 1000,
            penaltyPerWrongAttempt: 50,
        };
        this.selectedLabelIndex = -1;
    },
    createDataset() {
        const newName = this.newDatasetName.trim();
        if (newName && !this.datasets.includes(newName)) {
            this.datasets.push(newName);
            this.dataset = newName;
            this.loadData(); // Call loadData to attempt loading the new dataset (and its default image)
            this.newDatasetName = '';
            alert(`Dataset '${newName}' selected. If a corresponding image exists on the server, it has been loaded. Save to create the JSON file.`);
        } else {
            alert('Please enter a unique, non-empty name for the new dataset.');
        }
    },
    toggleCollapse(sectionName) {
      this.collapsedStates[sectionName] = !this.collapsedStates[sectionName];
    },
    addLabelAtCenter() {
      if (!this.imageUrl) {
        alert('Please upload an image first.');
        return;
      }
      const x = this.canvasWidth / 2;
      const y = this.canvasHeight / 2;
      
      const newLabel = {
        id: self.crypto.randomUUID(),
        text: 'New Label',
        position: { x, y },
        connector: { x: x + 50, y: y - 50 },
        style: { ...this.defaultLabelStyle }
      };
      this.labels.push(newLabel);
      this.selectedLabelIndex = this.labels.length - 1;
    },
    saveData() {
      const data = {
        title: this.title,
        image: this.imageUrl ? this.imageUrl.split('/').pop() : '',
        canvas: {
            width: this.canvasWidth,
            height: this.canvasHeight,
        },
        imageSettings: this.imageSettings,
        gameSettings: this.gameSettings,
        labels: this.labels.map(label => ({
            text: label.text,
            position: label.position,
            connector: label.connector,
            style: label.style
        }))
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `data.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      //alert('To complete saving, place the downloaded JSON file and the image in a new folder under `public/datasets/`');
    },
    handleImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.imageUrl = URL.createObjectURL(file);
        // To save, we need the file name.
        // This is a simplified approach.
        const data = {
            title: this.title,
            image: file.name,
            labels: this.labels
        };
        console.log("New image selected. The JSON should reference:", file.name);
      }
    },
    onImageLoad() {
      const img = this.$refs.imageRef;
      this.imageSettings.naturalWidth = img.naturalWidth;
      this.imageSettings.naturalHeight = img.naturalHeight;
      // Center the image on the canvas
      this.imageSettings.x = (this.canvasWidth - this.imageDisplayWidth) / 2;
      this.imageSettings.y = (this.canvasHeight - this.imageDisplayHeight) / 2;
    },
    addLabel(event) {
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const newLabel = {
        id: self.crypto.randomUUID(),
        text: 'New Label',
        position: { x, y },
        connector: { x: x + 40, y: y + 40 },
        style: { ...this.defaultLabelStyle }
      };
      
      this.labels.push(newLabel);
      this.selectedLabelIndex = this.labels.length - 1;
    },
    startDrag(index, event) {
      this.selectedLabelIndex = index;
      this.dragIndex = index;
      const labelPos = this.labels[index].position;
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      
      // This needs to be more complex if the canvas is scrolled.
      // For simplicity, assuming it's not.
      const canvasRect = this.$refs.canvasRef.getBoundingClientRect();
      const canvasMouseX = mouseX - canvasRect.left;
      const canvasMouseY = mouseY - canvasRect.top;

      this.dragOffset = {
        x: canvasMouseX - labelPos.x, // Offset from the label's center
        y: canvasMouseY - labelPos.y  // Offset from the label's center
      };
      event.preventDefault();
    },
    startDragConnector(index, event) {
      this.selectedLabelIndex = index;
      this.dragConnectorIndex = index;
      event.preventDefault();
    },
    startDragImage(event) {
        this.isDraggingImage = true;
        const canvasRect = this.$refs.canvasRef.getBoundingClientRect();
        const canvasMouseX = event.clientX - canvasRect.left;
        const canvasMouseY = event.clientY - canvasRect.top;
        this.dragOffset = {
            x: canvasMouseX - this.imageSettings.x,
            y: canvasMouseY - this.imageSettings.y
        };
    },
    handleMouseMove(event) {
      if (this.dragIndex === -1 && this.dragConnectorIndex === -1 && !this.isDraggingImage) return;
      
      const canvasRect = this.$refs.canvasRef.getBoundingClientRect();
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;

      const clampX = (val) => Math.max(0, Math.min(val, this.canvasWidth));
      const clampY = (val) => Math.max(0, Math.min(val, this.canvasHeight));

      if (this.dragIndex !== -1) {
        this.labels[this.dragIndex].position.x = clampX(x - this.dragOffset.x);
        this.labels[this.dragIndex].position.y = clampY(y - this.dragOffset.y);
      } else if (this.dragConnectorIndex !== -1) {
        this.labels[this.dragConnectorIndex].connector.x = clampX(x);
        this.labels[this.dragConnectorIndex].connector.y = clampY(y);
      } else if (this.isDraggingImage) {
        this.imageSettings.x = x - this.dragOffset.x;
        this.imageSettings.y = y - this.dragOffset.y;
      }
    },
    handleMouseUp() {
      this.dragIndex = -1;
      this.dragConnectorIndex = -1;
      this.isDraggingImage = false;
    },
    removeLabel(index) {
      if (confirm('Are you sure you want to delete this label?')) {
        this.labels.splice(index, 1);
        this.selectedLabelIndex = -1;
      }
    }
  }
}
</script>

<template>
  <div class="toggle-page">
    <!-- Toggle Button -->
    <button 
      @click="toggleCollapse('mainControlPanel')" 
      class="fixed top-20 left-4 z-30 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300"
      :class="{ 'rotate-180': collapsedStates.mainControlPanel }"
      title="Toggle Control Panel"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Control Panel (Left Side) -->
      <transition name="slide-left">
        <div v-if="!collapsedStates.mainControlPanel" class="lg:col-span-1 order-last lg:order-first">
          <div class="bg-white rounded-lg shadow-lg p-4 space-y-4 sticky top-4">
              <!-- Dataset Selector -->
              <div>
                <label class="block text-sm font-medium mb-2">Dataset</label>
                <div class="flex space-x-2">
                  <select v-model="dataset" @change="onDatasetChange" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option disabled value="">Select a dataset</option>
                    <option v-for="d in datasets" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
              </div>


              <!-- Title Display -->
              <div>
                <p class="text-xl font-bold text-gray-800">{{ title }}</p>
              </div>

              <!-- Action Buttons -->
              <div class="space-y-2 pt-4 border-t">
                <button @click="toggleAllLabels" class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                  {{ allLabelsRevealed ? 'Hide All Labels' : 'Show All Labels' }}
                </button>
                <button 
                  @click="resetAll"
                  class="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Reset All
                </button>
              </div>
          </div>
        </div>
      </transition>

      <!-- Image Canvas (Right Side) -->
      <div class="transition-all duration-300" :class="collapsedStates.mainControlPanel ? 'lg:col-span-4' : 'lg:col-span-3'">
        <div class="bg-white rounded-lg shadow-lg p-4"> 
          <h2 class="text-2xl font-bold mb-4"> {{ title }}</h2>
          <!-- The image and labels container -->
          <div 
            class="relative inline-block bg-white border-2 border-gray-300 overflow-hidden" 
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
            ref="canvasRef"
          >
            <img 
              v-if="imageUrl" 
              :src="imageUrl" 
              @load="onImageLoad" 
              ref="imageRef" 
              class="absolute pointer-events-none"
              :style="{ left: imageSettings.x + 'px', top: imageSettings.y + 'px', width: imageDisplayWidth + 'px', height: imageDisplayHeight + 'px' }"
            />
            <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
              <p class="text-gray-500">Loading dataset...</p>
            </div>

            <!-- Labels (clickable areas) -->
            <div v-for="(label, index) in labels" :key="label.id"
              ref="labelRefs"
              class="absolute cursor-pointer"
              :style="{ left: label.position.x + 'px', top: label.position.y + 'px', transform: 'translate(-50%, -50%)' }"
              @click="toggleLabel(index)">
              
              <div v-if="!label.revealed"
                class="px-3 py-1 rounded text-center whitespace-nowrap bg-gray-400 text-transparent select-none"
                :style="{ fontSize: label.style.fontSize + 'px' }"
              >
                {{ label.text }}
              </div>
              <div v-else
                class="px-3 py-1 rounded text-center whitespace-nowrap"
                :style="{ 
                  backgroundColor: label.style.bgColor, 
                  border: `1px solid ${label.style.lineColor}`,
                  color: label.style.textColor, 
                  fontSize: label.style.fontSize + 'px'
                }">
                {{ label.text }}
              </div>
            </div>
            
            <!-- Connectors (always visible) -->
            <svg 
              v-if="imageUrl"
              class="absolute top-0 left-0 pointer-events-none"
              :width="canvasWidth"
              :height="canvasHeight"
            >
              <g v-for="(label, index) in labelsWithConnectorPoints" :key="'g-' + index">
                <line
                  :x1="label.connectorStart.x" :y1="label.connectorStart.y"
                  :x2="label.connector.x"
                  :y2="label.connector.y"
                  :stroke="label.style.lineColor"
                  :stroke-width="label.style.lineWidth"
                  :stroke-dasharray="label.style.lineStyle === 'dashed' ? '5,5' : 'none'"
                />
                <circle
                  :cx="label.connector.x"
                  :cy="label.connector.y"
                  r="6"
                  :fill="label.style.lineColor"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.4s ease-in-out;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>


<script>
import { availableDatasets } from '../config/datasets';

export default {
  name: 'TogglePage',
  data() {
    return {
      datasets: [...availableDatasets],
      dataset: this.$route.params.dataset || availableDatasets[0] || '',
      title: '',
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
        lineColor: '#ef4444',
        lineWidth: 2,
        lineStyle: 'solid',
        bgColor: '#ffff00',
      },
      labels: [],
      labelDimensions: [],
      collapsedStates: { 
        mainControlPanel: false, // Default to visible
      },
      allLabelsRevealed: false, // New property to track global reveal state
    }
  },
  computed: {
    // Removed revealedCount, progressPercentage, allRevealed as they are no longer needed for the UI
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
          // If not measured, connector starts from the center
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

        if (Math.abs(deltaX) <= halfWidth && Math.abs(deltaY) <= halfHeight) {
          return { ...label, connectorStart: { ...connectorEnd } };
        }

        const slope = deltaY / deltaX;
        const diagSlope = halfHeight / halfWidth;

        let finalX, finalY;

        if (deltaX === 0) {
            finalX = labelCenter.x;
            finalY = labelCenter.y + halfHeight * Math.sign(deltaY);
        } else if (Math.abs(slope) < diagSlope) {
            finalX = labelCenter.x + halfWidth * Math.sign(deltaX);
            finalY = labelCenter.y + halfWidth * slope * Math.sign(deltaX);
        } else {
            finalX = labelCenter.x + (halfHeight / slope) * Math.sign(deltaY);
            finalY = labelCenter.y + halfHeight * Math.sign(deltaY);
        }

        return { ...label, connectorStart: { x: finalX, y: finalY } };
      });
    }
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
  mounted() {
    // Load data when the component is first mounted. This is the key fix.
    // The previous watcher with `immediate: true` was not firing `loadData` on initial load.
    this.loadData();
  },
  methods: {
    onDatasetChange() {
      // When the user selects a new dataset from the dropdown,
      // update the URL. The watcher will then handle loading the data.
      this.$router.push({ name: 'Toggle', params: { dataset: this.dataset } });
    },
    async loadData() {
      // Clear current state to show loading message
      this.title = '';
      this.imageUrl = ''; // Explicitly clear image to show "Loading dataset..."
      this.labels = []; // Clear labels
      this.labelDimensions = []; // Clear dimensions
      this.allLabelsRevealed = false; // Reset toggle state
      console.log("TogglePage: loadData started for dataset:", this.dataset);

      if (!this.dataset) {
        console.warn("No dataset selected or provided. Loading sample data.");
        this.createSampleData();
        console.log("TogglePage: Using sample data. imageUrl:", this.imageUrl);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/data.json?t=${new Date().getTime()}`);
        if (response.ok) {
          console.log("TogglePage: data.json fetch successful.");
          const data = await response.json();
          this.canvasWidth = data.canvas?.width || 800;
          this.canvasHeight = data.canvas?.height || 600;
          if (data.imageSettings) {
            this.imageSettings = { ...this.imageSettings, ...data.imageSettings };
          }
          this.title = data.title || '';
          this.labels = (data.labels || []).map(label => ({
            id: self.crypto.randomUUID(),
            ...label,
            style: { ...this.defaultLabelStyle, ...label.style },
            revealed: false // Ensure all labels start as hidden
          }));
          if (data.image) {
            const newImageUrl = `${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/${data.image}`;
            this.imageUrl = newImageUrl; // Set imageUrl from loaded data
            console.log("TogglePage: Data loaded. imageUrl set to:", this.imageUrl);
          }
          else {
            this.imageUrl = ''; // Explicitly set to empty string if no image
            console.log("TogglePage: No image specified in data.json. imageUrl set to empty.");
            console.warn(`Dataset '${this.dataset}' has no image specified in data.json.`);
          }
          console.log("TogglePage: Labels loaded (count):", this.labels.length);
          console.log("TogglePage: Final imageUrl after loadData completion:", this.imageUrl);
        } else {
          throw new Error('Failed to load data');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Create sample data for demonstration
        console.log("TogglePage: Error loading data, falling back to sample data.");
        this.createSampleData();
        this.resetAll(); // Reset revealed state for sample data
      }
    },
    toggleCollapse(sectionName) {
      this.collapsedStates[sectionName] = !this.collapsedStates[sectionName];
    },
    
    createSampleData() {
      this.title = 'Sample Heart'
      this.imageUrl = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#f0f0f0"/>
          <ellipse cx="200" cy="150" rx="80" ry="100" fill="#ff6b6b"/>
          <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="16">Sample Heart</text>
        </svg>
      `)
      this.labels = [
        {
          id: self.crypto.randomUUID(),
          text: 'Left Ventricle',
          position: { x: 50, y: 100 },
          connector: { x: 150, y: 180 },
          style: { ...this.defaultLabelStyle },
          revealed: false
        },
        {
          id: self.crypto.randomUUID(),
          text: 'Right Ventricle', 
          position: { x: 300, y: 100 },
          connector: { x: 250, y: 180 },
          style: { ...this.defaultLabelStyle },
          revealed: false
        },
        {
          id: self.crypto.randomUUID(),
          text: 'Aorta',
          position: { x: 150, y: 50 },
          connector: { x: 200, y: 100 },
          style: { ...this.defaultLabelStyle },
          revealed: false
        }
      ];
      console.log("TogglePage: createSampleData finished. imageUrl:", this.imageUrl);
    },
    
    onImageLoad() {
      const img = this.$refs.imageRef;
      if (img) {
        this.imageSettings.naturalWidth = img.naturalWidth;
        this.imageSettings.naturalHeight = img.naturalHeight;
        // Center the image on the canvas, similar to EditPage.vue
        this.imageSettings.x = (this.canvasWidth - this.imageDisplayWidth) / 2;
        this.imageSettings.y = (this.canvasHeight - this.imageDisplayHeight) / 2;
        console.log("TogglePage: Image loaded. Natural dimensions:", this.imageSettings.naturalWidth, this.imageSettings.naturalHeight);
      }
    },
    
    toggleLabel(index) {
      this.labels[index].revealed = !this.labels[index].revealed;
      // If a label is individually toggled, the "allLabelsRevealed" state might no longer be accurate.
      // We could re-evaluate it here, but for a teaching tool, simply letting the individual toggle override is fine.
    },
    
    toggleAllLabels() {
      this.allLabelsRevealed = !this.allLabelsRevealed;
      this.labels.forEach(label => {
        label.revealed = this.allLabelsRevealed;
      });
    },

    resetAll() {
      this.labels.forEach(label => {
        label.revealed = false;
      });
      this.allLabelsRevealed = false; // Reset the global toggle state
    }
  },
  watch: {
    // Watch for changes in the route parameter to load new datasets
    '$route.params.dataset': {
      handler(newDataset) {
        // This now only handles subsequent navigations (e.g., back/forward button
        // or changing the dataset via the dropdown).
        this.dataset = newDataset;
        this.loadData();
      }
    }
  }
}
</script>
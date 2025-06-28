<template>
  <div class="drag-page">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Candidate Labels Panel (Left Side) -->
      <div class="lg:col-span-1 order-last lg:order-first">
          <div class="bg-white rounded-lg shadow-lg p-4 space-y-4 sticky top-4">
            <div class="text-center -mt-2">
              <router-link :to="studentTestUrl" target="_blank" class="text-sm text-blue-600 hover:underline align-middle">(Student Test View)</router-link>
              <button @click="isQrModalVisible = true" class="ml-1 inline-block align-middle" title="Show QR Code">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h-1m-2-11h1m-1 12v1m-7-7h1m5 4h1M5 12H4m11 6v-1M8 6H7m1 6h1m7-1h1M5 8v1m11-5h-1m-1 11v-1m-6-1H8" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 5h2v2H5V5zm8 0h2v2h-2V5zM5 13h2v2H5v-2zm8 0h2v2h-2v-2z" />
                </svg>
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="font-medium">Time:</span>
                <span class="text-lg font-bold">{{ formatTime(timerSeconds) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium">Score:</span>
                <span class="text-lg font-bold">{{ score }}</span>
              </div>
              <div v-if="gameMessage" :class="['p-2 rounded text-center', gameMessageClass]">
                {{ gameMessage }}
              </div>
            </div>
                <div class="pt-4 border-t">
                <div class="grid grid-cols-2 gap-2">
                  <button @click="checkAnswers" class="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full">Check</button>
                  <button @click="resetGame" class="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 w-full">Reset</button>
                </div>
                </div>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="label in availableLabels" 
                :key="label.id"
                class="px-3 py-1 rounded text-center whitespace-nowrap cursor-move hover:bg-blue-200 transition-colors"
                :style="{ 
                  backgroundColor: label.style.bgColor, 
                  border: `1px solid ${label.style.lineColor}`,
                  color: label.style.textColor, 
                  fontSize: label.style.fontSize + 'px'
                }"
                @pointerdown="handlePointerDown(label, $event)"
                style="touch-action: none;"
              >
                {{ label.text }}
              </div>
            </div>
          </div>
        </div>

      <!-- Image and Drop Zones -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h2 class="text-2xl font-bold mb-4"> {{ title }}</h2> 
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
            
            <!-- Drop Zones -->
            <div 
              v-for="(label, index) in labels" 
              :key="label.id"
              ref="dropZoneRefs"
              class="absolute cursor-pointer flex items-center justify-center transition-all duration-100 rounded"
              :style="{ left: label.position.x + 'px', top: label.position.y + 'px', transform: 'translate(-50%, -50%)' }"
              :class="{ 
                'border-blue-500': dragOverIndex === index,
                'border-green-500': label.isCorrect, // After check
                'border-red-500': label.isWrong, // After check
                'border-dashed border-black': !label.isFilled, // Default empty, black border
                'border-solid': label.isFilled || label.isCorrect || label.isWrong, // Solid border when filled or checked
              }"
            >
              <div v-if="label.isFilled"
                class="px-3 py-1 rounded text-center whitespace-nowrap w-full h-full flex items-center justify-center"
                :style="{ 
                  backgroundColor: label.placedLabelStyle.bgColor, 
                  color: label.placedLabelStyle.textColor, 
                  border: `2px dashed ${label.placedLabelStyle.lineColor}`,
                  fontSize: label.placedLabelStyle.fontSize + 'px'
                }">
                {{ label.placedText }}
              </div> 
              <div v-else
                class="px-3 py-1 rounded text-center whitespace-nowrap text-transparent select-none w-full h-full flex items-center justify-center"
                :style="{
                  backgroundColor: '#f0f0f0', /* A neutral grey background */
                  border: `2px dashed ${label.style.lineColor}`,

                  fontSize: label.style.fontSize + 'px'
                }">{{ label.text }}</div>
            </div>
            
            <!-- Connectors -->
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
    <qr-code-modal 
      :show="isQrModalVisible" 
      :url="fullStudentTestUrl" 
      title="Student Test Link"
      @close="isQrModalVisible = false" 
    />
    <!-- Ghost element for dragging -->
    <div
      v-if="isDragging && draggedLabelData"
      :style="ghostStyle"
      class="px-3 py-1 rounded text-center whitespace-nowrap"
    >
      {{ draggedLabelData.text }}
    </div>
  </div>
</template>

<script>
import QrCodeModal from '../components/QrCodeModal.vue'

export default {
  name: 'DragPage',
  components: { QrCodeModal },
  data() {
    return {
      dataset: this.$route.params.dataset || '',
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
      labelDimensions: [], // For connector calculation
      labels: [], // Represents drop zones
      shuffledLabels: [], // Represents draggable labels
      draggedLabelData: null, // Stores the full label object being dragged
      dragOverIndex: -1,
      isDragging: false,
      pointerPosition: { x: 0, y: 0 },
    
      timerInterval: null,
      timerSeconds: 0,
      gameStarted: false,
      score: 0,
      wrongAttempts: 0,
      expectedDurationSeconds: 60, // Default value
      initialScore: 1000, // Base score
      penaltyPerWrongAttempt: 50, // Penalty for each wrong trial
      gameMessage: '',
      gameMessageClass: '', // For styling success/failure
      isQrModalVisible: false,
    }
  },
  computed: {
    availableLabels() {
      return this.shuffledLabels.filter(label => !label.isUsed);
    },
    studentTestUrl() {
      return this.dataset ? `/test/${this.dataset}` : '/';
    },
    fullStudentTestUrl() {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const datasetName = this.dataset || 'placeholder';
      const resolvedRoute = this.$router.resolve({ name: 'Test', params: { dataset: datasetName } });
      return `${origin}${resolvedRoute.href}`;
    },
    ghostStyle() {
      if (!this.isDragging || !this.draggedLabelData) {
        return { display: 'none' };
      }
      return {
        position: 'fixed',
        left: `${this.pointerPosition.x}px`,
        top: `${this.pointerPosition.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1000,
        // Copy style from the source label
        backgroundColor: this.draggedLabelData.style.bgColor,
        border: `1px solid ${this.draggedLabelData.style.lineColor}`,
        color: this.draggedLabelData.style.textColor,
        fontSize: `${this.draggedLabelData.style.fontSize}px`,
      };
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
            finalX = labelCenter.x + (halfHeight / slope) * Math.sign(deltaY);
            finalY = labelCenter.y + halfHeight * Math.sign(deltaY);
        }

        return { ...label, connectorStart: { x: finalX, y: finalY } };
      });
    }
  },
  updated() {
    this.$nextTick(() => {
      if (this.$refs.dropZoneRefs) {
        const newDimensions = this.$refs.dropZoneRefs.map(el => el ? { width: el.offsetWidth, height: el.offsetHeight } : { width: 0, height: 0 });
        // Prevent an infinite update loop by only updating if the dimensions have actually changed.
        if (JSON.stringify(newDimensions) !== JSON.stringify(this.labelDimensions)) {
          this.labelDimensions = newDimensions;
        }
      }
    });
  },

  watch: {
    // Watch for changes in the route parameter to load new datasets
    '$route.params.dataset': {
      handler(newDataset) {
        // This now only handles subsequent navigations (e.g., back/forward button
        // or changing the dataset via the dropdown).
        this.dataset = newDataset;
        this.loadData();
      },
    }
  },
  beforeUnmount() {
    this.stopTimer();
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
  },
  mounted() {
    // Load data when the component is first mounted.
    this.loadData();
  },
  methods: {
    async loadData() {
      // Clear current state to show loading message
      this.title = '';
      this.imageUrl = ''; // Explicitly clear image to show "Loading dataset..."
      this.labels = []; // Clear drop zones
      this.shuffledLabels = []; // Clear candidate labels
      this.gameStarted = false; // Reset game state
      this.score = 0;
      this.timerSeconds = 0;
      this.gameMessage = '';
      this.gameMessageClass = '';

      if (!this.dataset) {
        console.warn("No dataset selected or provided. Loading sample data.");
        this.createSampleData();
        return;
      }      
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/data.json?t=${new Date().getTime()}`);
        if (!response.ok) {
          // If response is not OK (e.g., 404), throw an error to go to catch block
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json()
        this.canvasWidth = data.canvas?.width || 800;
        this.canvasHeight = data.canvas?.height || 600;
        this.imageSettings = { ...this.imageSettings, ...data.imageSettings };
        this.expectedDurationSeconds = data.gameSettings?.expectedDurationSeconds || 60;
        this.initialScore = data.gameSettings?.initialScore || 1000;
        this.penaltyPerWrongAttempt = data.gameSettings?.penaltyPerWrongAttempt || 50;
        this.title = data.title || ''
        this.labels = data.labels.map(label => ({
          id: self.crypto.randomUUID(), // Add unique ID
          ...label,
          style: { ...this.defaultLabelStyle, ...label.style }, // Apply default and loaded styles
          isFilled: false, // Is this drop zone filled?
          placedText: '', // Text of the label placed here
          placedLabelId: null, // ID of the label placed here
          placedLabelStyle: null, // NEW: Store style of the placed label
          isCorrect: false, // Is the placed label correct? (after check)
          isWrong: false, // Is the placed label wrong? (after check)
        }))
        if (data.image) {
          this.imageUrl = `${import.meta.env.BASE_URL}datasets/${encodeURIComponent(this.dataset)}/${data.image}`
        } else {
          this.imageUrl = ''; // Explicitly set to empty string if no image
          console.warn(`Dataset '${this.dataset}' has no image specified in data.json.`);
        }
        this.resetGame(); // Ensure game state is reset on load
        this.shuffleLabels()
      } catch (error) {
        console.error('Error loading data:', error)
        this.createSampleData()
        this.resetGame(); // Reset game state for sample data
      }
    },
    
    createSampleData() {
      this.title = 'Sample Heart'
      this.expectedDurationSeconds = 60;
      this.initialScore = 1000;
      this.penaltyPerWrongAttempt = 50;
      this.imageUrl = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#f0f0f0"/>
          <ellipse cx="200" cy="150" rx="80" ry="100" fill="#ff6b6b"/>
          <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="16">Sample Heart</text>
        </svg>
      `)
      this.canvasWidth = 800;
      this.canvasHeight = 600;
      this.imageSettings = {
        x: 0, y: 0, scale: 1, naturalWidth: 0, naturalHeight: 0
      }; // Correctly close the object literal
      this.labels = [
        {
          id: self.crypto.randomUUID(),
          text: 'Left Ventricle',
          position: { x: 50, y: 100 },
          connector: { x: 150, y: 180 },
          style: { ...this.defaultLabelStyle },
          isFilled: false, placedText: '', placedLabelId: null, placedLabelStyle: null, isCorrect: false, isWrong: false
        },
        {
          id: self.crypto.randomUUID(),
          text: 'Right Ventricle', 
          position: { x: 300, y: 100 },
          connector: { x: 250, y: 180 },
          style: { ...this.defaultLabelStyle },
          isFilled: false, placedText: '', placedLabelId: null, placedLabelStyle: null, isCorrect: false, isWrong: false
        },
        {
          id: self.crypto.randomUUID(),
          text: 'Aorta',
          position: { x: 150, y: 50 },
          connector: { x: 200, y: 100 },
          style: { ...this.defaultLabelStyle },
          isFilled: false, placedText: '', placedLabelId: null, placedLabelStyle: null, isCorrect: false, isWrong: false
        }
      ]
      this.shuffleLabels()
      // this.resetGame(); // Removed: resetGame clears imageUrl, causing "Loading dataset..."
    },
    
    shuffleLabels() {
      // Create draggable labels from the original labels, ensuring unique IDs and `isUsed` status
      this.shuffledLabels = [...this.labels].map(label => ({ 
        id: label.id, // Use the same ID as the target label for easy lookup
        text: label.text,
        style: { ...label.style }, // Copy style
        isUsed: false // Not yet placed
      }))
        .sort(() => Math.random() - 0.5)
    },
    
    onImageLoad() {
      const img = this.$refs.imageRef
      this.imageSettings.naturalWidth = img.naturalWidth;
      this.imageSettings.naturalHeight = img.naturalHeight;
      // Center the image on the canvas
      this.imageSettings.x = (this.canvasWidth - this.imageDisplayWidth) / 2;
      this.imageSettings.y = (this.canvasHeight - this.imageDisplayHeight) / 2;
    },

    startTimer() {
      if (!this.gameStarted) {
        this.gameStarted = true;
        this.timerSeconds = 0; // Reset timer on start
        this.timerInterval = setInterval(() => {
          this.timerSeconds++;
        }, 1000);
      }
    },
    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.gameStarted = false;
      }
    },
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    handlePointerDown(label, event) {
      // Prevent default behavior, like text selection or page scrolling on touch
      event.preventDefault();

      this.isDragging = true;
      this.draggedLabelData = label;
      this.pointerPosition.x = event.clientX;
      this.pointerPosition.y = event.clientY;

      document.addEventListener('pointermove', this.handlePointerMove);
      document.addEventListener('pointerup', this.handlePointerUp);

      this.startTimer(); // Start timer when first drag begins
    },

    handlePointerMove(event) {
      if (!this.isDragging) return;
      event.preventDefault();

      this.pointerPosition.x = event.clientX;
      this.pointerPosition.y = event.clientY;

      // Check for drop zone intersection
      this.dragOverIndex = -1;
      const dropZones = this.$refs.dropZoneRefs;
      if (!dropZones) return;

      for (let i = 0; i < dropZones.length; i++) {
        const zone = dropZones[i];
        if (zone) {
          const rect = zone.getBoundingClientRect();
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            this.dragOverIndex = i;
            break;
          }
        }
      }
    },

    handlePointerUp(event) {
      if (!this.isDragging) return;
      event.preventDefault();

      if (this.dragOverIndex !== -1) {
        this.handleDrop(this.dragOverIndex);
      }

      this.isDragging = false;
      this.draggedLabelData = null;
      this.dragOverIndex = -1 // Reset drag over state

      document.removeEventListener('pointermove', this.handlePointerMove);
      document.removeEventListener('pointerup', this.handlePointerUp);
    },
    
    handleDrop(dropIndex) {
      if (!this.draggedLabelData) return; // No label being dragged

      const targetDropZone = this.labels[dropIndex]
      
      // If the target drop zone is already filled, return the dragged label to the candidate panel
      if (targetDropZone.isFilled) {
        // Optionally, allow swapping or just prevent drop.
        // Current logic: prevent drop and return to candidate.
        // No action needed, the label was not marked as 'used' yet.
        this.draggedLabelData = null;
        return
      }
      
      // Place the label
      targetDropZone.isFilled = true
      targetDropZone.placedText = this.draggedLabelData.text
      targetDropZone.placedLabelId = this.draggedLabelData.id
      targetDropZone.placedLabelStyle = { ...this.draggedLabelData.style } // Store the style of the dragged label

      // Mark the dragged label as used in the shuffledLabels array
      const draggedLabelInShuffled = this.shuffledLabels.find(sl => sl.id === this.draggedLabelData.id);
      if (draggedLabelInShuffled) {
          draggedLabelInShuffled.isUsed = true;
      }
      
      // Reset correctness state for this drop zone
      targetDropZone.isCorrect = false
      targetDropZone.isWrong = false

      this.draggedLabelData = null // Clear dragged data
    },

    checkAnswers() {
      let allCorrect = true;
      this.wrongAttempts = 0; // Reset wrong attempts for this check

      this.labels.forEach((dropZone) => {
        if (dropZone.isFilled) {
          if (dropZone.placedText === dropZone.text) { // Check against original correct text
            dropZone.isCorrect = true
            dropZone.isWrong = false
          } else {
            dropZone.isCorrect = false
            dropZone.isWrong = true
            allCorrect = false;
            this.wrongAttempts++; // Increment wrong attempts

            const placedShuffledLabel = this.shuffledLabels.find(sl => sl.id === dropZone.placedLabelId)
            if (placedShuffledLabel) {
              placedShuffledLabel.isUsed = false
            }
            // Clear drop zone
            dropZone.isFilled = false
            dropZone.placedText = ''
            dropZone.placedLabelStyle = null // Clear placed style
            dropZone.placedLabelId = null
          }
        } else {
          // If drop zone is empty, it's implicitly wrong for the check
          dropZone.isCorrect = false
          dropZone.isWrong = true
          allCorrect = false;
          this.wrongAttempts++; // Increment wrong attempts
        }
      })

      if (allCorrect) {
        this.stopTimer();
        this.calculateFinalScore();
        this.gameMessage = `恭喜! 全部正確! 你的分數: ${this.score}`;
        this.gameMessageClass = 'text-green-600';
      } else {
        this.gameMessage = `有些答案不正確。錯誤嘗試次數: ${this.wrongAttempts} 再試一次!`;
        this.gameMessageClass = 'text-red-600';
      }
    },
    
    calculateFinalScore() {
      let finalScore = this.initialScore;

      // Penalty for wrong attempts
      finalScore -= (this.wrongAttempts * this.penaltyPerWrongAttempt);

      // Time penalty/bonus
      const timeDifference = this.timerSeconds - this.expectedDurationSeconds;

      if (timeDifference > 0) {
        finalScore -= (timeDifference * 5); // Example: 5 points per second over
      } else {
        finalScore += (Math.abs(timeDifference) * 10); // Example: 10 points per second under
      }

      this.score = Math.max(0, finalScore); // Ensure score doesn't go below zero
    },

    resetGame() {
      this.stopTimer(); // Stop any running timer
      this.timerSeconds = 0;
      this.gameStarted = false;
      this.score = 0;
      this.wrongAttempts = 0;
      this.gameMessage = '';
      this.gameMessageClass = '';

      this.labels.forEach(label => { // Reset drop zones
        label.isFilled = false
        label.placedText = ''
        label.placedLabelStyle = null // Clear placed style
        label.placedLabelId = null
        label.isCorrect = false
        label.isWrong = false
      })
      
      this.shuffledLabels.forEach(label => { // Make all candidate labels available again
        label.isUsed = false
      })
      this.shuffleLabels() // Re-shuffle for a new game
    }
  }
}
</script>

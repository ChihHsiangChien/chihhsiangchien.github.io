<template>
  <div class="drag-page">
    <h2 class="text-2xl font-bold mb-4">Drag Mode - {{ dataset }}</h2>
    
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Image and Drop Zones -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <div class="relative inline-block">
            <img 
              v-if="imageUrl"
              :src="imageUrl" 
              @load="onImageLoad"
              ref="imageRef"
              class="max-w-full h-auto border"
            />
            <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center">
              <p>Loading image...</p>
            </div>
            
            <!-- Drop Zones -->
            <div 
              v-for="(label, index) in labels" 
              :key="'drop-' + index"
              class="absolute border-2 border-dashed border-gray-400 rounded-lg bg-gray-100 bg-opacity-75 flex items-center justify-center min-w-[100px] min-h-[40px]"
              :style="{ left: label.position.x + 'px', top: label.position.y + 'px' }"
              @dragover="handleDragOver"
              @drop="handleDrop(index, $event)"
              :class="{ 
                'border-green-500 bg-green-100': label.matched,
                'border-red-500 bg-red-100': label.incorrect,
                'border-blue-500 bg-blue-100': dragOverIndex === index
              }"
            >
              <span v-if="label.matched" class="text-green-700 font-medium">{{ label.text }}</span>
              <span v-else-if="label.incorrect" class="text-red-700 font-medium">{{ label.incorrectText }}</span>
              <span v-else class="text-gray-500 text-sm">Drop here</span>
            </div>
            
            <!-- Connectors -->
            <svg 
              v-if="imageUrl"
              class="absolute top-0 left-0 pointer-events-none"
              :width="imageWidth"
              :height="imageHeight"
            >
              <line 
                v-for="(label, index) in labels"
                :key="'line-' + index"
                :x1="label.position.x + 50"
                :y1="label.position.y + 20"
                :x2="label.connector.x"
                :y2="label.connector.y"
                stroke="#6b7280"
                stroke-width="2"
                stroke-dasharray="3,3"
              />
              <circle
                v-for="(label, index) in labels"
                :key="'circle-' + index"
                :cx="label.connector.x"
                :cy="label.connector.y"
                r="3"
                fill="#6b7280"
              />
            </svg>
          </div>
        </div>
        
        <!-- Draggable Labels -->
        <div class="mt-4 bg-white rounded-lg shadow-lg p-4">
          <h3 class="text-lg font-semibold mb-3">Drag the labels to their correct positions:</h3>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="(label, index) in shuffledLabels" 
              :key="'drag-' + index"
              v-if="!label.used"
              class="bg-blue-100 border border-blue-300 px-3 py-2 rounded cursor-move hover:bg-blue-200 transition-colors"
              draggable="true"
              @dragstart="handleDragStart(label, $event)"
            >
              {{ label.text }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Score Panel -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h3 class="text-lg font-semibold mb-4">Score</h3>
          
          <div class="space-y-4">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">{{ score }}</div>
              <div class="text-sm text-gray-600">Points</div>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm">Correct:</span>
                <span class="text-green-600 font-medium">{{ correctCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm">Incorrect:</span>
                <span class="text-red-600 font-medium">{{ incorrectCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm">Remaining:</span>
                <span class="text-gray-600 font-medium">{{ remainingCount }}</span>
              </div>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                class="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                :style="{ width: progressPercentage + '%' }"
              ></div>
            </div>
            
            <div v-if="startTime" class="text-center">
              <div class="text-lg font-bold">{{ formattedTime }}</div>
              <div class="text-sm text-gray-600">Time</div>
            </div>
            
            <button 
              @click="resetGame"
              class="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              Reset
            </button>
            
            <div v-if="gameComplete" class="mt-4 p-3 bg-green-100 border border-green-400 rounded text-green-700 text-center">
              <div class="font-bold">🎉 Complete!</div>
              <div class="text-sm">Final Score: {{ score }}</div>
              <div class="text-sm">Time: {{ formattedTime }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DragPage',
  data() {
    return {
      dataset: '',
      title: '',
      imageUrl: '',
      imageWidth: 0,
      imageHeight: 0,
      labels: [],
      shuffledLabels: [],
      score: 0,
      correctCount: 0,
      incorrectCount: 0,
      startTime: null,
      elapsedTime: 0,
      timer: null,
      dragOverIndex: -1,
      gameComplete: false
    }
  },
  computed: {
    remainingCount() {
      return this.labels.filter(label => !label.matched).length
    },
    progressPercentage() {
      if (this.labels.length === 0) return 0
      return Math.round((this.correctCount / this.labels.length) * 100)
    },
    formattedTime() {
      const minutes = Math.floor(this.elapsedTime / 60)
      const seconds = this.elapsedTime % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  },
  mounted() {
    this.dataset = this.$route.params.dataset
    this.loadData()
  },
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },
  methods: {
    async loadData() {
      try {
        const response = await fetch(`/datasets/${this.dataset}/data.json`)
        if (response.ok) {
          const data = await response.json()
          this.title = data.title || ''
          this.labels = data.labels.map(label => ({
            ...label,
            matched: false,
            incorrect: false,
            incorrectText: ''
          }))
          if (data.image) {
            this.imageUrl = `/datasets/${this.dataset}/${data.image}`
          }
          this.shuffleLabels()
        } else {
          throw new Error('Failed to load data')
        }
      } catch (error) {
        console.error('Error loading data:', error)
        this.createSampleData()
      }
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
          text: 'Left Ventricle',
          position: { x: 50, y: 100 },
          connector: { x: 150, y: 180 },
          matched: false,
          incorrect: false,
          incorrectText: ''
        },
        {
          text: 'Right Ventricle', 
          position: { x: 300, y: 100 },
          connector: { x: 250, y: 180 },
          matched: false,
          incorrect: false,
          incorrectText: ''
        },
        {
          text: 'Aorta',
          position: { x: 150, y: 50 },
          connector: { x: 200, y: 100 },
          matched: false,
          incorrect: false,
          incorrectText: ''
        }
      ]
      this.shuffleLabels()
    },
    
    shuffleLabels() {
      this.shuffledLabels = [...this.labels]
        .map(label => ({ ...label, used: false }))
        .sort(() => Math.random() - 0.5)
    },
    
    onImageLoad() {
      const img = this.$refs.imageRef
      this.imageWidth = img.offsetWidth
      this.imageHeight = img.offsetHeight
    },
    
    handleDragStart(label, event) {
      if (!this.startTime) {
        this.startTimer()
      }
      event.dataTransfer.setData('text/plain', label.text)
    },
    
    handleDragOver(event) {
      event.preventDefault()
    },
    
    handleDrop(dropIndex, event) {
      event.preventDefault()
      const draggedText = event.dataTransfer.getData('text/plain')
      const targetLabel = this.labels[dropIndex]
      
      this.dragOverIndex = -1
      
      if (targetLabel.matched) return
      
      // Reset previous incorrect state
      targetLabel.incorrect = false
      targetLabel.incorrectText = ''
      
      if (draggedText === targetLabel.text) {
        // Correct match
        targetLabel.matched = true
        this.correctCount++
        this.score += 10
        
        // Mark the dragged label as used
        const shuffledLabel = this.shuffledLabels.find(label => label.text === draggedText)
        if (shuffledLabel) shuffledLabel.used = true
        
        // Check if game is complete
        if (this.correctCount === this.labels.length) {
          this.gameComplete = true
          this.stopTimer()
          // Bonus points for speed
          const timeBonus = Math.max(0, 300 - this.elapsedTime)
          this.score += timeBonus
        }
      } else {
        // Incorrect match
        targetLabel.incorrect = true
        targetLabel.incorrectText = draggedText
        this.incorrectCount++
        this.score = Math.max(0, this.score - 2)
        
        // Reset after a delay
        setTimeout(() => {
          targetLabel.incorrect = false
          targetLabel.incorrectText = ''
        }, 2000)
      }
    },
    
    startTimer() {
      this.startTime = Date.now()
      this.timer = setInterval(() => {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000)
      }, 1000)
    },
    
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    
    resetGame() {
      this.score = 0
      this.correctCount = 0
      this.incorrectCount = 0
      this.elapsedTime = 0
      this.startTime = null
      this.gameComplete = false
      this.stopTimer()
      
      this.labels.forEach(label => {
        label.matched = false
        label.incorrect = false
        label.incorrectText = ''
      })
      
      this.shuffleLabels()
    }
  }
}
</script>
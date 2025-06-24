<template>
  <div class="toggle-page">
    <h2 class="text-2xl font-bold mb-4">Toggle Mode - {{ dataset }}</h2>
    
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
        
        <!-- Hidden Labels (clickable areas) -->
        <div 
          v-for="(label, index) in labels" 
          :key="index"
          class="absolute cursor-pointer"
          :style="{ left: label.position.x + 'px', top: label.position.y + 'px' }"
          @click="toggleLabel(index)"
        >
          <div 
            v-if="!label.revealed"
            class="bg-gray-400 opacity-75 px-4 py-2 rounded text-sm text-transparent select-none min-w-[80px] min-h-[24px]"
          >
            {{ label.text }}
          </div>
          <div 
            v-else
            class="bg-yellow-200 border border-yellow-600 px-2 py-1 rounded text-sm animate-pulse"
          >
            {{ label.text }}
          </div>
        </div>
        
        <!-- Connectors (always visible) -->
        <svg 
          v-if="imageUrl"
          class="absolute top-0 left-0 pointer-events-none"
          :width="imageWidth"
          :height="imageHeight"
        >
          <line 
            v-for="(label, index) in labels"
            :key="'line-' + index"
            :x1="label.position.x + 40"
            :y1="label.position.y + 12"
            :x2="label.connector.x"
            :y2="label.connector.y"
            stroke="#6b7280"
            stroke-width="2"
            stroke-dasharray="5,5"
          />
          <circle
            v-for="(label, index) in labels"
            :key="'circle-' + index"
            :cx="label.connector.x"
            :cy="label.connector.y"
            r="4"
            fill="#6b7280"
          />
        </svg>
      </div>
      
      <!-- Progress Panel -->
      <div class="mt-6 bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Progress</h3>
          <button 
            @click="resetAll"
            class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
          >
            Reset All
          </button>
        </div>
        
        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        
        <p class="text-sm text-gray-600">
          {{ revealedCount }} of {{ labels.length }} labels revealed ({{ progressPercentage }}%)
        </p>
        
        <div v-if="allRevealed" class="mt-4 p-3 bg-green-100 border border-green-400 rounded text-green-700">
          🎉 Congratulations! You've revealed all the labels!
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TogglePage',
  data() {
    return {
      dataset: '',
      title: '',
      imageUrl: '',
      imageWidth: 0,
      imageHeight: 0,
      labels: []
    }
  },
  computed: {
    revealedCount() {
      return this.labels.filter(label => label.revealed).length
    },
    progressPercentage() {
      if (this.labels.length === 0) return 0
      return Math.round((this.revealedCount / this.labels.length) * 100)
    },
    allRevealed() {
      return this.labels.length > 0 && this.revealedCount === this.labels.length
    }
  },
  mounted() {
    this.dataset = this.$route.params.dataset
    this.loadData()
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
            revealed: false
          }))
          if (data.image) {
            this.imageUrl = `/datasets/${this.dataset}/${data.image}`
          }
        } else {
          throw new Error('Failed to load data')
        }
      } catch (error) {
        console.error('Error loading data:', error)
        // Create sample data for demonstration
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
          revealed: false
        },
        {
          text: 'Right Ventricle', 
          position: { x: 300, y: 100 },
          connector: { x: 250, y: 180 },
          revealed: false
        },
        {
          text: 'Aorta',
          position: { x: 150, y: 50 },
          connector: { x: 200, y: 100 },
          revealed: false
        }
      ]
    },
    
    onImageLoad() {
      const img = this.$refs.imageRef
      this.imageWidth = img.offsetWidth
      this.imageHeight = img.offsetHeight
    },
    
    toggleLabel(index) {
      this.labels[index].revealed = !this.labels[index].revealed
    },
    
    resetAll() {
      this.labels.forEach(label => {
        label.revealed = false
      })
    }
  }
}
</script>
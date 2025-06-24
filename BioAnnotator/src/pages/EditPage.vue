<template>
  <div class="edit-page">
    <h2 class="text-2xl font-bold mb-4">Edit Mode - {{ dataset }}</h2>
    
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Image Canvas -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <div class="relative inline-block">
            <img 
              v-if="imageUrl"
              :src="imageUrl" 
              @load="onImageLoad"
              ref="imageRef"
              class="max-w-full h-auto border"
              @click="addLabel"
            />
            <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center">
              <p>No image loaded</p>
            </div>
            
            <!-- Labels -->
            <div 
              v-for="(label, index) in labels" 
              :key="index"
              class="absolute cursor-pointer"
              :style="{ left: label.position.x + 'px', top: label.position.y + 'px' }"
              @mousedown.stop="startDrag(index, $event)"
            >
              <div class="bg-yellow-200 border border-yellow-600 px-2 py-1 rounded text-sm relative">
                {{ label.text }}
                <button
                  @click.stop="removeLabel(index)"
                  class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                  title="Delete Label"
                >
                  ×
                </button>
              </div>
            </div>
            
            <!-- Connectors -->
            <svg 
              v-if="imageUrl"
              class="absolute top-0 left-0"
              :width="imageWidth"
              :height="imageHeight"
            >
              <line 
                v-for="(label, index) in labels"
                :key="'line-' + index"
                :x1="label.position.x + 20"
                :y1="label.position.y + 10"
                :x2="label.connector.x"
                :y2="label.connector.y"
                stroke="#ef4444"
                stroke-width="2"
              />
              <circle
                v-for="(label, index) in labels"
                :key="'circle-' + index"
                :cx="label.connector.x"
                :cy="label.connector.y"
                r="6"
                fill="#ef4444"
                class="cursor-pointer"
                @mousedown.stop="startDragConnector(index, $event)"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- Control Panel -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h3 class="text-lg font-semibold mb-4">Controls</h3>
          
          <!-- Image Upload -->
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Upload Image</label>
            <input 
              type="file" 
              @change="handleImageUpload" 
              accept="image/*"
              class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <!-- Title -->
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Title</label>
            <input 
              v-model="title" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter title"
            />
          </div>
          
          <!-- Labels List -->
          <div class="mb-4">
            <h4 class="text-sm font-medium mb-2">Labels</h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="(label, index) in labels" 
                :key="index"
                class="flex items-center space-x-2 p-2 bg-gray-50 rounded"
              >
                <input 
                  v-model="label.text" 
                  class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <button 
                  @click="removeLabel(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="space-y-2">
            <button 
              @click="saveData"
              class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button 
              @click="loadData"
              class="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EditPage',
  data() {
    return {
      dataset: '',
      title: '',
      imageUrl: '',
      imageWidth: 0,
      imageHeight: 0,
      labels: [],
      dragIndex: -1,
      dragConnectorIndex: -1,
      dragOffset: { x: 0, y: 0 },
    }
  },
  mounted() {
    this.dataset = this.$route.params.dataset
    this.loadData()
    
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  },
  methods: {
    async loadData() {
      try {
        const response = await fetch(`/datasets/${this.dataset}/data.json`)
        if (response.ok) {
          const data = await response.json()
          this.title = data.title || ''
          this.labels = data.labels || []
          if (data.image) {
            this.imageUrl = `/datasets/${this.dataset}/${data.image}`
          }
        }
      } catch (error) {
        console.log('No existing data found, starting fresh')
      }
    },
    
    saveData() {
      const data = {
        title: this.title,
        image: this.imageUrl ? this.imageUrl.split('/').pop() : '',
        labels: this.labels
      }
      
      // In a real app, this would be sent to a server
      // For now, just show the JSON that would be saved
      console.log('Data to save:', JSON.stringify(data, null, 2))
      alert('Data saved to console (check browser console)')
    },
    
    handleImageUpload(event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.imageUrl = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },
    
    onImageLoad() {
      const img = this.$refs.imageRef
      this.imageWidth = img.naturalWidth
      this.imageHeight = img.naturalHeight
    },
    
    addLabel(event) {
      if (this.dragIndex !== -1) return
      
      const rect = event.target.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const newLabel = {
        text: 'New Label',
        position: { x, y },
        connector: { x: x + 50, y: y + 50 }
      }
      
      this.labels.push(newLabel)
    },
    
    startDrag(index, event) {
      this.dragIndex = index
      const rect = event.target.getBoundingClientRect()
      this.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      event.preventDefault()
    },
    
    startDragConnector(index, event) {
      this.dragConnectorIndex = index;
      event.preventDefault();
    },

    handleMouseMove(event) {
      if (this.dragIndex === -1 && this.dragConnectorIndex === -1) return;
      
      const imageRect = this.$refs.imageRef.getBoundingClientRect();
      const x = event.clientX - imageRect.left;
      const y = event.clientY - imageRect.top;

      if (this.dragIndex !== -1) {
        this.labels[this.dragIndex].position.x = x - this.dragOffset.x;
        this.labels[this.dragIndex].position.y = y - this.dragOffset.y;
      } else if (this.dragConnectorIndex !== -1) {
        this.labels[this.dragConnectorIndex].connector.x = Math.max(0, Math.min(x, this.imageWidth));
        this.labels[this.dragConnectorIndex].connector.y = Math.max(0, Math.min(y, this.imageHeight));
      }
    },
    
    handleMouseUp() {
      this.dragIndex = -1;
      this.dragConnectorIndex = -1;
    },
    
    removeLabel(index) {
      this.labels.splice(index, 1)
    }
  }
}
</script>
<template>
  <div class="flex h-screen bg-gray-100 relative">
    <!-- Toggle Button for Left Panel -->
    <button
      @click="toggleCollapse('leftPanel')"
      class="fixed top-4 left-4 z-30 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300"
      :class="{ 'rotate-180': collapsedStates.leftPanel }"
      title="Toggle Dataset List"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>

    <!-- Main content area for both panels, shifted to the right to make space for the fixed button -->
    <div class="flex flex-1 h-full pl-16"> 
      <!-- Left Panel: Dataset List with Scrollbar -->
      <transition name="slide-left">
        <div v-if="!collapsedStates.leftPanel" class="w-64 bg-white shadow-lg p-4 flex flex-col overflow-hidden">
          <div class="mb-4 border-b pb-2">
            <h2 class="text-xl font-bold">Drag Games</h2>
          </div>
          <div class="flex-grow overflow-y-auto pr-2 -mr-2"> <!-- pr-2 and -mr-2 for custom scrollbar appearance -->
            <ul class="space-y-2">
              <li v-for="datasetName in availableDatasets" :key="datasetName">
                <router-link
                  :to="`/student-drag/${datasetName}`"
                  class="block px-3 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                  :class="{ 'bg-blue-500 text-white hover:bg-blue-600': $route.params.dataset === datasetName }"
                >
                  {{ datasetName }}
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </transition>

    <!-- Right Panel: Router View for DragPage -->
    <div class="flex-1 p-4 overflow-y-auto">
      <router-view />
    </div>
  </div> <!-- This closes the <div class="flex flex-1 h-full pl-16"> -->
</div> <!-- This closes the <div class="flex h-screen bg-gray-100 relative"> -->
</template>

<script>
import { availableDatasets } from '../config/datasets';

export default {
  name: 'StudentDragLayout',
  data() {
    return {
      availableDatasets: availableDatasets,
      collapsedStates: {
        leftPanel: false, // Default to visible
      },
    };
  },
  methods: {
    toggleCollapse(sectionName) {
      this.collapsedStates[sectionName] = !this.collapsedStates[sectionName];
    },
  },
};
</script>

<style scoped>
/* Custom scrollbar styles (optional, but good for aesthetics) */
.overflow-y-auto::-webkit-scrollbar { width: 8px; }
.overflow-y-auto::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
.overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #555; }

/* Slide transition styles */
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
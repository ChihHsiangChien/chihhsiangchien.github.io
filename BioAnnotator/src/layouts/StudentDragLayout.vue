<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Left Panel: Dataset List with Scrollbar -->
    <div class="w-64 bg-white shadow-lg p-4 flex flex-col overflow-hidden">
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

    <!-- Right Panel: Router View for DragPage -->
    <div class="flex-1 p-4 overflow-y-auto">
      <router-view />
    </div>
  </div>
</template>

<script>
import { availableDatasets } from '../config/datasets';

export default {
  name: 'StudentDragLayout',
  data() {
    return {
      availableDatasets: availableDatasets,
    };
  },
};
</script>

<style scoped>
/* Custom scrollbar styles (optional, but good for aesthetics) */
.overflow-y-auto::-webkit-scrollbar { width: 8px; }
.overflow-y-auto::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
.overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #555; }
</style>
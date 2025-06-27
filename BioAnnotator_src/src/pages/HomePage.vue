<template>
  <div class="home-container">
    <h1 class="text-3xl font-bold mb-4">BioAnnotator</h1>

    <p class="text-lg mb-6">
      <router-link to="/student-drag" class="text-blue-600 hover:underline">Go to Student Drag Games</router-link>
    </p>

    <div class="bg-white shadow-lg rounded-lg p-6">
      <div class="grid grid-cols-4 gap-4 text-center font-bold text-gray-700 border-b pb-2 mb-2">
        <div>Dataset</div>
        <div>Edit</div>
        <div>Toggle</div>
        <div>Drag</div>
      </div>

      <div v-if="availableDatasets.length === 0" class="text-center text-gray-500 py-4">
        No datasets found. Please add datasets in `src/config/datasets.js`.
      </div>

      <div v-for="datasetName in availableDatasets" :key="datasetName" class="grid grid-cols-4 gap-4 py-2 border-b last:border-b-0 items-center">
        <div class="font-medium text-left pl-2">{{ datasetName }}</div>
        <div>
          <router-link :to="`/edit/${datasetName}`" class="text-blue-600 hover:text-blue-800 hover:underline">Edit</router-link>
        </div>
        <div>
          <router-link :to="`/toggle/${datasetName}`" class="text-green-600 hover:text-green-800 hover:underline">Toggle</router-link>
        </div>
        <div>
          <router-link :to="`/drag/${datasetName}`" class="text-purple-600 hover:text-purple-800 hover:underline">Drag</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { availableDatasets } from '../config/datasets';

</script>

<style scoped>
.home-container {
  padding: 2rem;
  text-align: center;
}
</style>
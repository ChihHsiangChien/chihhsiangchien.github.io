<template>
  <div>
    <nav class="bg-gray-800 text-white p-4 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <router-link to="/" class="font-bold text-lg hover:text-blue-300">BioAnnotator</router-link>
        <div>
          <router-link :to="`/edit/${defaultDataset}`" class="px-3 py-2 rounded hover:bg-gray-700">Edit</router-link>
          <router-link :to="`/toggle/${defaultDataset}`" class="px-3 py-2 rounded hover:bg-gray-700">Toggle</router-link>
          <router-link :to="`/drag/${defaultDataset}`" class="px-3 py-2 rounded hover:bg-gray-700">Drag</router-link>
        </div>
      </div>
    </nav>
    <main class="p-4 bg-gray-100 min-h-screen">
      <router-view />
    </main>
  </div>
</template>

<script>
import { availableDatasets } from '../config/datasets';

export default {
  name: 'DefaultLayout',
  computed: {
    defaultDataset() {
      // Get the dataset from the current route parameters,
      // or fallback to the first available dataset, or 'heart' if none are found.
      return this.$route.params.dataset || availableDatasets[0] || 'heart';
    },
  }
}
</script>
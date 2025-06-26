<template>
  <div class="home-container">
    <h1>Welcome to the BioAnnotator</h1>
    <p>This application provides several tools for biological annotation.</p>
    <p>Please select an activity to begin:</p>
    <nav>
      <router-link :to="`/edit/${defaultDataset}`" class="nav-link">Annotate {{ defaultDataset }} Data (Edit)</router-link>
      <router-link :to="`/toggle/${defaultDataset}`" class="nav-link">Toggle {{ defaultDataset }} Data</router-link>
      <router-link :to="`/drag/${defaultDataset}`" class="nav-link">Organize {{ defaultDataset }} Data (Drag)</router-link>
    </nav>
  </div>
</template>

<script setup>
import { availableDatasets } from '../config/datasets';

// Use the first available dataset for the default nav links
const defaultDataset = availableDatasets[0] || 'heart';
</script>

<style scoped>
.home-container {
  padding: 2rem;
  text-align: center;
}
.nav-link {
  display: block;
  margin: 1rem auto;
  font-size: 1.2rem;
}
</style>
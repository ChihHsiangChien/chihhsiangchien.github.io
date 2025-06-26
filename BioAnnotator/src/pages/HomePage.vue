<template>
  <div class="home-container">
    <h1>Welcome to the BioAnnotator</h1>
    <p>This application provides several tools for biological annotation.</p>
    <p>Please select an activity to begin:</p>
    <nav>
      <router-link to="/edit/heart" class="nav-link">Annotate Heart Data (Edit)</router-link>
      <router-link to="/toggle/cell" class="nav-link">Toggle Cell Parts</router-link>
      <router-link to="/drag/dna" class="nav-link">Organize DNA Sequence (Drag)</router-link>
    </nav>
  </div>
</template>

<script setup>
// This component doesn't require any specific script logic for now.
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
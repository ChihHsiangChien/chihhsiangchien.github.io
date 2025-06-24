<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <nav class="bg-blue-600 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-xl font-bold">BioAnnotator</h1>
        <div class="space-x-4">
          <router-link to="/edit/heart" class="hover:underline">Edit</router-link>
          <router-link to="/toggle/heart" class="hover:underline">Toggle</router-link>
          <router-link to="/drag/heart" class="hover:underline">Drag</router-link>
        </div>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>
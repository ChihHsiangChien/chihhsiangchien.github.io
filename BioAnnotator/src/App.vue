<template>
  <component :is="layout">
    <!-- The router will render the correct page component here -->
  </component>
</template>

<script>
import DefaultLayout from './layouts/DefaultLayout.vue';
import StudentLayout from './layouts/StudentLayout.vue';
import StudentDragLayout from './layouts/StudentDragLayout.vue'; // Import the new layout

export default {
  name: 'App',
  components: {
    DefaultLayout,
    StudentLayout,
    StudentDragLayout // Add it to components
  },
  computed: {
    layout() {
      return this.$route.meta.layout || 'DefaultLayout'; // Default to DefaultLayout if no meta.layout is specified
    }
  }
}
</script>
<template>
  <component :is="layout">
    <!-- The router will render the correct page component here -->
  </component>
</template>

<script>
import DefaultLayout from './layouts/DefaultLayout.vue';
import StudentLayout from './layouts/StudentLayout.vue';

export default {
  name: 'App',
  components: {
    DefaultLayout,
    StudentLayout
  },
  computed: {
    layout() {
      return this.$route.meta.layout || 'DefaultLayout'; // Default to DefaultLayout if no meta.layout is specified
    }
  }
}
</script>
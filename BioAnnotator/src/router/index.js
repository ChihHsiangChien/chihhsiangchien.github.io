import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import EditPage from '../pages/EditPage.vue'
import TogglePage from '../pages/TogglePage.vue'
import DragPage from '../pages/DragPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { layout: 'DefaultLayout' }
  },
  {
    path: '/edit/:dataset',
    name: 'Edit',
    component: EditPage,
    meta: { layout: 'DefaultLayout' } // Teacher view with navbar
  },
  {
    path: '/toggle/:dataset',
    name: 'Toggle',
    component: TogglePage,
    meta: { layout: 'DefaultLayout' } // Teacher view with navbar
  },
  {
    path: '/drag/:dataset',
    name: 'Drag',
    component: DragPage,
    meta: { layout: 'DefaultLayout' } // Teacher view with navbar
  },
  // NEW ROUTE FOR STUDENTS
  {
    path: '/test/:dataset',
    name: 'Test',
    component: DragPage, // Re-using the same component
    meta: { layout: 'StudentLayout' } // Student view (no navbar)
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
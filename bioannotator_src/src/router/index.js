import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import AdminPage from '../pages/AdminPage.vue'
import StudentDragLayout from '../layouts/StudentDragLayout.vue'; // New student drag layout
import { RouterView } from 'vue-router'; // Import RouterView
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
    path: '/Admin',
    name: 'Admin',
    component: AdminPage,
    meta: { layout: 'AdminLayout' }
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
  },  
  {
    // New route for the student-facing drag game list
    path: '/student-drag',
    component: RouterView, // This route itself renders a RouterView
    meta: { layout: 'StudentDragLayout' }, // And uses StudentDragLayout as its wrapper
    children: [
      {
        path: ':dataset', // Nested route for specific dataset
        name: 'StudentDragGame', // A new name for this specific drag game route
        component: DragPage,
        props: true,
      },
    ],
  },
]

const router = createRouter({  
  history: createWebHashHistory(),
  routes
})

export default router
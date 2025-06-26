import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import './style.css'

// Import pages
import EditPage from './pages/EditPage.vue'
import TogglePage from './pages/TogglePage.vue'
import DragPage from './pages/DragPage.vue'
import HomePage from './pages/HomePage.vue'

const routes = [
  { path: '/', component: HomePage },
  { path: '/edit/:dataset', component: EditPage },
  { path: '/toggle/:dataset', component: TogglePage },
  { path: '/drag/:dataset', component: DragPage }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.use(MotionPlugin)
app.mount('#app')
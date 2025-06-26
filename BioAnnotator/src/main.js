import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import './style.css'
import router from './router/index.js' // Import the router instance explicitly

const app = createApp(App)
app.use(router)
app.use(MotionPlugin)
app.mount('#app')
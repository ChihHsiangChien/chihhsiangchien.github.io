import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/BioAnnotator/',
  build: {
    outDir: 'dist'
  },
  preview: {
    host: true,   // 讓 preview server 對外網路可見
    port: 4173,   // 你想用的端口
  },  
})
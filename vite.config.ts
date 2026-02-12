import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['chart.js', 'jspdf']
        }
      }
    }
  },
  server: { port: 3000 },
  plugins: [
    {
      name: 'copy-js-files',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist')
        mkdirSync(resolve(outDir, 'js'), { recursive: true })
        mkdirSync(resolve(outDir, 'css'), { recursive: true })
        copyFileSync(resolve(__dirname, 'js/core.js'), resolve(outDir, 'js/core.js'))
        copyFileSync(resolve(__dirname, 'js/ui.js'), resolve(outDir, 'js/ui.js'))
        copyFileSync(resolve(__dirname, 'css/style.css'), resolve(outDir, 'css/style.css'))
      }
    }
  ]
})

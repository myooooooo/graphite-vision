import { defineConfig } from 'vite'

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
  server: { port: 3000 }
})

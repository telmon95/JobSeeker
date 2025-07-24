// job-app-automator/client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Run frontend on port 3000
    proxy: {
      // Proxy requests from /api to your backend server
      '/api': {
        target: 'http://localhost:5001', // Your backend server port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
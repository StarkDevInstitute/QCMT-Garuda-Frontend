import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      // Proxy SeisComP FDSN requests to avoid CORS in dev
      '/fdsnws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Proxy AutoMT API requests to avoid CORS in dev
      '/automt': {
        target: 'http://10.20.229.39:8111',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

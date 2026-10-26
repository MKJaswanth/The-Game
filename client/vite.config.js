import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_PROXY_TARGET || 'http://localhost:4000'
  const proxy = {
    '/api': { target: backend, changeOrigin: true },
    '/health': { target: backend, changeOrigin: true },
    '/socket.io': { target: backend, changeOrigin: true, ws: true },
  }

  return {
    plugins: [react()],
    server: {
      proxy,
      allowedHosts: true,
    },
    preview: {
      proxy,
      allowedHosts: true,
    },
  }
})

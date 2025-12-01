import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Dockerコンテナ内で外部からアクセス可能にする
    port: 5173,
    strictPort: true, // ポートが使用中の場合はエラーにする
    watch: {
      usePolling: true,
      interval: 100,
      binaryInterval: 300,
    },
    hmr: {
      host: 'localhost',
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})

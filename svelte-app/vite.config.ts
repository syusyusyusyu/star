import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages (https://<user>.github.io/star/) 用に、
// 本番ビルド時は base を "/star/" にし、出力先をリポジトリ直下の docs にします。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/star/' : '/',
  plugins: [svelte()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true
  }
}));

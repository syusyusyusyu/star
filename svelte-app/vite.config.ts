import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// GitHub Pages (https://<user>.github.io/star/) 用に、
// 本番ビルド時は base を "/star/" にし、出力先をリポジトリ直下の docs にします。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/star/' : '/',
  plugins: [
    svelte(),
    // MediaPipe の実行時アセット（.wasm / .data / .jsなど）をビルド出力に同梱
  viteStaticCopy({
      targets: [
        { src: 'node_modules/@mediapipe/pose/*', dest: 'mediapipe/pose' },
    { src: 'node_modules/@mediapipe/selfie_segmentation/*', dest: 'mediapipe/selfie_segmentation' },
    { src: 'node_modules/@mediapipe/hands/*', dest: 'mediapipe/hands' }
      ]
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true
  }
}));

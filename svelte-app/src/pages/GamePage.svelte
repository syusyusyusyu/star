<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  // 既存の game.html の主要DOMをSvelte内に用意し、レガシーJSを読み込む
  function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
  }

  onMount(async () => {
    // Tailwind は index.html でCDN読み込み済み
    // 外部CDNも動的に読み込む順序を保持
    const params = new URLSearchParams(location.search);
    // mode は既に index から保持されている
    try {
      // public/styles.css を動的に読み込み（Svelteの<style>@import解決エラー回避）
      const base = (import.meta as any).env?.BASE_URL ?? '/';
      if (!document.getElementById('game-styles-link')) {
        const link = document.createElement('link');
        link.id = 'game-styles-link';
        link.rel = 'stylesheet';
        link.href = `${base}styles.css`;
        document.head.appendChild(link);
      }

      await loadScript('https://unpkg.com/axios/dist/axios.min.js');
      await loadScript('https://unpkg.com/textalive-app-api/dist/index.js');
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');
      // 先にゲーム本体（GameManager）を読み込み、次にローダーを読む
      await loadScript(`${base}script.js`);
      await loadScript(`${base}game-loader.js`);
    } catch (e) {
      console.error(e);
    }
  });
</script>

<button class="fixed top-3 left-3 z-[2000] bg-gray-800/80 text-white px-4 py-2 rounded" on:click={() => dispatch('back')}>← タイトルへ</button>

<video id="camera-video" class="hidden"></video>
<canvas id="segmentation-canvas" class="fixed top-0 left-0 w-full h-full z-[1]"></canvas>
<div id="countdown-overlay" class="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-70 z-[1000] hidden">
  <span id="countdown-text" class="text-white text-9xl font-bold"></span>
  </div>
<div id="live-background" class="fixed top-0 left-0 w-full h-full z-[-1]">
  <div id="stage-area" class="absolute top-0 left-0 w-full h-3/5 bg-gray-900 overflow-hidden flex justify-center items-end">
    <div class="w-full h-1/4 bg-black/30" style="perspective: 50px;"><div class="w-full h-full bg-gray-700" style="transform: rotateX(30deg);"></div></div>
    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[200px] bg-gradient-to-t from-purple-600/30 to-transparent rounded-[100%] animate-pulse"></div>
    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150px] bg-gradient-to-t from-blue-500/40 to-transparent rounded-[100%]" style="animation-delay: 500ms;"></div>
  </div>
  <div id="audience-area" class="absolute bottom-0 left-0 w-full h-2/5"></div>
</div>

<div id="game-container">
  <div id="miku"></div>
  <div id="song-info">
    <div id="song-title">Lyricほにゃらら</div>
    <div id="loading">ゲームをロード中...</div>
  </div>
  <div id="score-container">
    <div id="score">0</div>
    <div id="combo">コンボ: 0</div>
  </div>
  <div id="instructions">歌詞の文字にマウスを当ててポイントを獲得しよう！</div>
  <div id="controls">
    <button id="play-pause" aria-label="再生/一時停止">再生</button>
    <button id="restart" aria-label="最初から">最初から</button>
  </div>
</div>

<div id="results-screen" class="hidden">
  <div class="results-container">
    <h2>リザルト</h2>
    <div class="results-content">
      <div class="results-score-section">
        <div id="final-score-display">0</div>
        <div id="final-combo-display">最大コンボ: 0</div>
        <div id="rank-display">ランク: S</div>
      </div>
    </div>
    <div class="results-buttons">
      <button id="back-to-title">タイトルへ戻る</button>
      <button id="replay-song">もう一度プレイ</button>
    </div>
  </div>
</div>

<style>
  /* ページ固有の微調整があればここに記述（グローバルCSSはlinkで読み込み） */
</style>

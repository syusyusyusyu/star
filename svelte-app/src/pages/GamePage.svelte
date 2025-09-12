<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { score, combo, isPaused, loadingText, instructions, resultsVisible, results, mode, songInfo } from '../lib/stores/game';
  import LyricsLayer from '../lib/components/LyricsLayer.svelte';
  import GameHud from '../lib/components/GameHud.svelte';
  import ResultsModal from '../lib/components/ResultsModal.svelte';
  import { GameController } from '../lib/game/controller';
  const dispatch = createEventDispatcher();
  let controller: GameController;

  onMount(async () => {
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    (window as any).__BASE_URL = base;
    // スタイル読み込み
    if (!document.getElementById('game-styles-link')) {
      const link = document.createElement('link');
      link.id = 'game-styles-link';
      link.rel = 'stylesheet';
      link.href = `${base}styles.css`;
      document.head.appendChild(link);
    }
    // 外部依存をNPMから読み込み（TextAlive等）
    const [textalive] = await Promise.all([ import('textalive-app-api') ]);
    (window as any).TextAliveApp = { Player: (textalive as any).Player };
    // 曲データ
    const selected = JSON.parse(localStorage.getItem('selectedSong') || 'null');
    const defaultSong = { id: 1, title: 'SUPERHERO', artist: 'めろくる', apiToken: 'wifkp8ak1TEhQ8pI', songUrl: 'https://piapro.jp/t/hZ35/20240130103028' };
    const s = selected || defaultSong;
    const params = new URLSearchParams(location.search);
    const initialMode = (params.get('mode') as any) || 'cursor';
    controller = new GameController();
    controller.init(s, initialMode);
  });
</script>

<button class="fixed top-3 left-3 z-[2000] bg-gray-800/80 text-white px-4 py-2 rounded" on:click={() => dispatch('back')}>← タイトルへ</button>

<!-- svelte-ignore a11y-media-has-caption -->
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

<div id="game-container" class="relative">
  <div id="miku"></div>
  <div id="song-info">
    <div id="song-title">Lyricほにゃらら</div>
  <div id="loading">{$loadingText}</div>
  </div>
  <div id="score-container">
  <div id="score">{$score}</div>
  <div id="combo">コンボ: {$combo}</div>
  </div>
  <div id="instructions">{$instructions || '歌詞の文字にマウスを当ててポイントを獲得しよう！'}</div>
  <div id="controls">
  <GameHud on:toggle={() => ($isPaused ? controller.play() : controller.pause())}
       on:restart={() => controller.restart()} />
  </div>
</div>

<LyricsLayer on:click={(e) => controller.clickBubble(e.detail.id)} />
<ResultsModal on:back={() => (window.location.href = 'index.html')} on:replay={() => controller.restart()} />
 

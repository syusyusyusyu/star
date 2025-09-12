<script lang="ts">
  import { onMount } from 'svelte';
  import { score, combo, isPaused, loadingText, instructions, songInfo, resultsVisible, results } from '../lib/stores/game';
  import LyricsLayer from '../lib/components/LyricsLayer.svelte';
  import { GameController } from '../lib/game/controller';
  import ThreeStage from '../lib/components/ThreeStage.svelte';
  let controller: GameController;
  let stageApi: any = null;
  function handleStageReady(e: CustomEvent<any>) { stageApi = e.detail; (window as any).__Stage = stageApi; }
  onMount(async () => {
    const base = (import.meta as any).env?.BASE_URL ?? '/'; (window as any).__BASE_URL = base;
    if (!document.getElementById('game-styles-link')) { const link = document.createElement('link'); link.id = 'game-styles-link'; link.rel = 'stylesheet'; link.href = `${base}styles.css`; document.head.appendChild(link); }
    const [textalive] = await Promise.all([ import('textalive-app-api') ]);
    (window as any).TextAliveApp = { Player: (textalive as any).Player };
    const selected = JSON.parse(localStorage.getItem('selectedSong') || 'null');
    const defaultSong = { id: 1, title: 'ストリートライト', artist: '加賀(ネギシャワーP)', apiToken: 'HmfsoBVch26BmLCm', songUrl: 'https://piapro.jp/t/ULcJ/20250205120202' };
    const s = selected || defaultSong;
    const params = new URLSearchParams(location.search);
    const initialMode = (params.get('mode') as any) || 'cursor';
    controller = new GameController(); controller.init(s, initialMode);
    const seg = document.getElementById('segmentation-canvas') as HTMLCanvasElement | null;
    if (seg) { const trySet = () => { if (stageApi?.setSegCanvas) stageApi.setSegCanvas(seg); }; trySet(); setTimeout(trySet, 300); }
  });
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video id="camera-video" class="hidden"></video>
<canvas id="segmentation-canvas" class="fixed top-0 left-0 w-full h-full z-[1]"></canvas>
<div id="countdown-overlay" class="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-70 z-[1000] hidden">
  <span id="countdown-text" class="text-white text-9xl font-bold"></span>
</div>

<div id="live-background" class="fixed top-0 left-0 w-full h-full z-[-1]">
  <div id="stage-area" class="absolute top-0 left-0 w-full h-3/5 overflow-hidden flex justify-center items-end">
    <ThreeStage on:ready={handleStageReady} />
  </div>
  <div id="audience-area" class="absolute bottom-0 left-0 w-full h-2/5"></div>
</div>

<div id="game-container" class="relative">
  <div id="miku"></div>
  <div id="song-info">
    <div id="song-title">{($songInfo?.title) || 'Lyricほにゃらら'}</div>
  </div>
  <div id="score-container">
    <div id="score">{$score}</div>
    <div id="combo">コンボ: {$combo}</div>
  </div>
  <div id="instructions">{$instructions || '歌詞の文字にマウスを当ててポイントを獲得しよう！'}</div>
  <div id="controls">
    <button id="play-pause" on:click={() => ($isPaused ? controller.play() : controller.pause())}>{$isPaused ? '再生' : '一時停止'}</button>
    <button id="restart" on:click={() => controller.restart()}>最初から</button>
  </div>
</div>

<LyricsLayer on:click={(e) => controller.clickBubble(e.detail.id)} />

<!-- レガシーと同じIDで結果画面の土台（表示制御はSvelte側のstoresで扱うが DOM/IDは一致） -->
<div id="results-screen" class={$resultsVisible ? 'show' : 'hidden'}>
  <div class="results-container">
    <h2>リザルト</h2>
    <div class="results-content">
      <div class="results-score-section">
        <div id="final-score-display">{$results?.score ?? 0}</div>
        <div id="final-combo-display">最大コンボ: {$results?.maxCombo ?? 0}</div>
        <div id="rank-display">ランク: {$results?.rank ?? 'C'}</div>
      </div>
    </div>
    <div class="results-buttons">
      <button id="back-to-title" on:click={() => (window.location.href = 'index.html')}>タイトルへ戻る</button>
      <button id="replay-song" on:click={() => controller.restart()}>もう一度プレイ</button>
    </div>
  </div>
</div>


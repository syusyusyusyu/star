<script lang="ts">
  import { score, combo, isPaused, instructions } from '../stores/game';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ toggle: void; restart: void }>();
</script>

<div id="score-container">
  <div id="score">{$score}</div>
  <div id="combo">コンボ: {$combo}</div>
</div>
<div id="instructions">{$instructions || '歌詞の文字にマウスを当ててポイントを獲得しよう！'}</div>
<div id="controls">
  <button id="play-pause" on:click={() => dispatch('toggle')}>{$isPaused ? '再生' : '一時停止'}</button>
  <button id="restart" on:click={() => dispatch('restart')}>最初から</button>
</div>

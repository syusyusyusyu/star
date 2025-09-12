<script lang="ts">
  import { resultsVisible, results } from '../stores/game';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ back: void; replay: void }>();
</script>

<div id="results-screen" class:hidden={!$resultsVisible} class:show={$resultsVisible}>
  <div class="results-container">
    <h2>リザルト</h2>
    <div class="results-content">
      <div class="results-score-section">
        <div id="final-score-display">{$results.score}</div>
        <div id="final-combo-display">最大コンボ: {$results.maxCombo}</div>
        <div id="rank-display">ランク: {$results.rank}</div>
      </div>
    </div>
    <div class="results-buttons">
      <button on:click={() => dispatch('back')}>タイトルへ戻る</button>
      <button on:click={() => dispatch('replay')}>もう一度プレイ</button>
    </div>
  </div>
</div>

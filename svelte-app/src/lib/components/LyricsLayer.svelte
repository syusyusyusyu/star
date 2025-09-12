<script lang="ts">
  import { activeBubbles, isPaused } from '../stores/game';
  import { get } from 'svelte/store';
  import type { Bubble } from '../stores/game';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ click: { id: string } }>();
  let bubblesLocal: Bubble[] = [];
  $: activeBubbles.subscribe(v => bubblesLocal = v);
  function handleClick(id: string) {
    if (get(isPaused)) return;
    dispatch('click', { id });
  }
</script>

<div class="absolute inset-0 pointer-events-none">
  {#each bubblesLocal as b (b.id)}
    <div
      class="lyric-bubble pointer-events-auto"
      style={`left:${b.x}px; top:${b.y}px; color:${b.color}; font-size:${b.fontSize};`}
      role="button"
      tabindex="0"
      aria-label={`歌詞 ${b.text}`}
      on:mouseenter={() => handleClick(b.id)}
      on:touchstart|preventDefault={() => handleClick(b.id)}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(b.id); }}
    >
      {b.text}
    </div>
  {/each}
  </div>

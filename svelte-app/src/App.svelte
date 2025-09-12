<script lang="ts">
  import { onMount } from 'svelte';
  import IndexPage from './pages/IndexPage.svelte';
  import GamePage from './pages/GamePage.svelte';

  // 簡易ルーティング: ?page=game でゲーム画面
  let page: 'index' | 'game' = 'index';
  const params = new URLSearchParams(location.search);
  page = (params.get('page') === 'game') ? 'game' : 'index';

  const base: string = (import.meta as any).env?.BASE_URL ?? '/';
  function fallbackToRoot() {
    // docs のルート index.html へフォールバック
    location.replace(`${base}index.html`);
  }

  function navigate(to: 'index' | 'game') {
    try {
      const url = new URL(location.href);
      if (to === 'game') url.searchParams.set('page', 'game');
      else url.searchParams.delete('page');
      history.pushState({}, '', url);
      page = to;
    } catch (e) {
      console.error('navigate failed, fallback to root', e);
      fallbackToRoot();
    }
  }

  // 履歴操作にも対応
  const onPopState = () => {
    try {
      const p = new URLSearchParams(location.search).get('page');
      page = (p === 'game') ? 'game' : 'index';
    } catch (e) {
      console.error('popstate parse failed, fallback to root', e);
      fallbackToRoot();
    }
  };
  window.addEventListener('popstate', onPopState);
  // クリーンアップは不要（SPA存続中）

  onMount(() => {
    // 不正ページ指定時はフォールバック
    if (page !== 'index' && page !== 'game') {
      fallbackToRoot();
    }
  });
</script>

{#if page === 'index'}
  <IndexPage on:startGame={() => navigate('game')} />
{:else}
  <GamePage on:back={() => navigate('index')} />
{/if}

<style>
  :global(html, body, #app) {
    height: 100%;
  }
</style>

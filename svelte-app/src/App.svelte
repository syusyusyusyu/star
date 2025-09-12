<script lang="ts">
  import IndexPage from './pages/IndexPage.svelte';
  import GamePage from './pages/GamePage.svelte';

  // 簡易ルーティング: ?page=game でゲーム画面
  let page: 'index' | 'game' = 'index';
  const params = new URLSearchParams(location.search);
  page = (params.get('page') === 'game') ? 'game' : 'index';

  function navigate(to: 'index' | 'game') {
    const url = new URL(location.href);
    if (to === 'game') url.searchParams.set('page', 'game');
    else url.searchParams.delete('page');
    history.pushState({}, '', url);
    page = to;
  }

  // 履歴操作にも対応
  const onPopState = () => {
    const p = new URLSearchParams(location.search).get('page');
    page = (p === 'game') ? 'game' : 'index';
  };
  window.addEventListener('popstate', onPopState);
  // クリーンアップは不要（SPA存続中）
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

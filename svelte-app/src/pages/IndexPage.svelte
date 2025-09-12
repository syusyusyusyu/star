<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  type Song = {
    id: number; title: string; artist: string; apiToken: string; songUrl: string;
  };

  const songsData: Song[] = [
    { id: 1, title: 'ストリートライト', artist: '加賀(ネギシャワーP)', apiToken: 'HmfsoBVch26BmLCm', songUrl: 'https://piapro.jp/t/ULcJ/20250205120202' },
    { id: 2, title: 'アリフレーション', artist: '雨良 Amala', apiToken: 'rdja5JxMEtcYmyKP', songUrl: 'https://piapro.jp/t/SuQO/20250127235813' },
    { id: 3, title: 'インフォーマルダイブ', artist: '99piano', apiToken: 'CqbpJNJHwoGvXhlD', songUrl: 'https://piapro.jp/t/Ppc9/20241224135843' },
    { id: 4, title: 'ハロー、フェルミ。', artist: 'ど～ぱみん', apiToken: 'o1B1ZygOqyhK5B3D', songUrl: 'https://piapro.jp/t/oTaJ/20250204234235' },
    { id: 5, title: 'パレードレコード', artist: 'きさら', apiToken: 'G8MU8Wf87RotH8OR', songUrl: 'https://piapro.jp/t/GCgy/20250202202635' },
    { id: 6, title: 'ロンリーラン', artist: '海風太陽', apiToken: 'fI0SyBEEBzlB2f5C', songUrl: 'https://piapro.jp/t/CyPO/20250128183915' },
  ];

  let mode: 'cursor' | 'hand' | 'body' = 'cursor';
  let isMobile = false;

  function detectMobileDevice() {
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 768;
    const limitedCamera = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return mobileUA || (hasTouch && smallScreen) || limitedCamera;
  }

  const base: string = (import.meta as any).env?.BASE_URL ?? '/';
  function saveSongSelection(song: Song) {
    localStorage.setItem('selectedSong', JSON.stringify(song));
    // 旧版と同じ遷移にする（game.html?mode=... へ遷移）
    window.location.href = `${base}game.html?mode=${mode}`;
  }

  function createStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;
    const starCount = Math.min(100, Math.floor(window.innerWidth * window.innerHeight / 6000));
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      if (Math.random() > 0.7) {
        star.style.width = '6px';
        star.style.height = '6px';
        star.style.boxShadow = '0 0 10px #fff';
      }
      frag.appendChild(star);
    }
    container.appendChild(frag);
  }

  onMount(() => {
    // Tailwind (CDN) + カスタムconfig を旧 index.html と同等に適用
    const ensureTailwind = () => new Promise<void>((resolve) => {
      if ((window as any).tailwind) return resolve();
      // config を先に差し込む
      if (!document.getElementById('tw-config-inline')) {
        const cfg = document.createElement('script');
        cfg.id = 'tw-config-inline';
        cfg.textContent = `tailwind = { config: { theme: { extend: { colors: { miku: '#39C5BB', mikuDark: '#2AA198', mikuLight: '#7FDBCA', darkBg: '#090A0F', gradientStart: '#1B2735' }, animation: { float: 'float 3s ease-in-out infinite', 'pulse-miku': 'pulse-miku 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }, keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }, 'pulse-miku': { '0%, 100%': { opacity: 1, boxShadow: '0 0 20px 5px rgba(57, 197, 187, 0.7)' }, '50%': { opacity: 0.7, boxShadow: '0 0 10px 2px rgba(57, 197, 187, 0.3)' } } }, screens: { xs: '480px', '3xl': '1920px' } } } } };`;
        document.head.appendChild(cfg);
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.tailwindcss.com';
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });

    // レガシーCSS（index-styles.css）を注入
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    if (!document.getElementById('index-styles-link')) {
      const link = document.createElement('link');
      link.id = 'index-styles-link';
      link.rel = 'stylesheet';
      link.href = `${base}index-styles.css`;
      document.head.appendChild(link);
    }
    // body クラスをレガシー相当に付与
    const body = document.body;
    const legacyBodyClasses = [
      'bg-gradient-to-b', 'from-gradientStart', 'to-darkBg', 'min-h-screen', 'w-full', 'text-white', 'browser-bar-adjust', 'flex', 'justify-center', 'items-center'
    ];
    body.classList.add(...legacyBodyClasses);
    // Tailwind 準備が整ってからDOM演出を構築
    ensureTailwind().then(() => {
      // no-op; ユーティリティクラスのスタイル適用タイミングを合わせるだけ
    });

    isMobile = detectMobileDevice();
    if (isMobile) mode = 'cursor';
    createStars();
    let t: any;
    const onResize = () => { clearTimeout(t); t = setTimeout(createStars, 250); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); body.classList.remove(...legacyBodyClasses); };
  });

  function ripple(e: MouseEvent) {
    const el = (e.currentTarget as HTMLElement) ?? (e.target as HTMLElement);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('div');
    const relX = (e.clientX ?? rect.left + rect.width / 2) - rect.left;
    const relY = (e.clientY ?? rect.top + rect.height / 2) - rect.top;
    ripple.className = 'absolute bg-white/40 rounded-full pointer-events-none';
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    ripple.style.left = `${relX}px`;
    ripple.style.top = `${relY}px`;
    ripple.style.transform = 'translate(-50%, -50%) scale(0)';
    ripple.style.animation = 'ripple 0.6s ease-out forwards';
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }
</script>

<div class="bg-gradient-to-b from-gradientStart to-darkBg min-h-screen w-full text-white browser-bar-adjust flex justify-center items-center">
  <div id="stars-container" class="fixed top-0 left-0 w-full h-full z-0"></div>
  <div class="spotlight left-1/4 hidden sm:block"></div>
  <div class="spotlight left-2/4 hidden sm:block" style="animation-delay: -3s;"></div>
  <div class="spotlight left-3/4 hidden sm:block" style="animation-delay: -6s;"></div>

  <div class="relative z-10 w-full max-w-xl flex flex-col items-center justify-center py-6 px-4 min-h-screen">
  <div class="text-center mb-4 sm:mb-6">
    <h1 class="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-miku mb-2 tracking-wider">Lyric Stage</h1>
  </div>

  <div class="max-w-md mx-auto text-center mb-4 sm:mb-6 bg-black/30 p-2 sm:p-2 rounded-lg backdrop-blur-sm">
    <p class="text-white/90 text-sm sm:text-base">歌詞の文字に触れてポイントを獲得しよう！</p>
  </div>

  <div id="mode-selection" class="mt-4 mb-6 text-center">
    <label for="game-mode" class="text-white mr-2 text-lg">Playモード選択:</label>
    <select id="game-mode" class="p-2 rounded bg-gray-700 text-white text-lg" bind:value={mode} disabled={isMobile}>
      <option value="cursor">Cursorモード</option>
      <option value="hand">Handモード（カメラ）</option>
      <option value="body">Bodyモード（カメラ）</option>
    </select>
    {#if isMobile}
      <div class="text-gray-300 text-sm mt-2">モバイルではCursorモード固定です</div>
    {/if}
  </div>

  <div class="max-w-lg w-full mx-auto">
    <ul class="space-y-2 sm:space-y-3">
      {#each songsData as song}
        <li class="song-item bg-black/40 rounded-lg backdrop-blur-sm border border-[#39C5BB]/30">
          <button class="w-full p-4 text-left flex justify-between items-center focus:outline-none" on:click={(e) => { ripple(e); saveSongSelection(song); }}>
            <div>
              <h3 class="text-xl text-[#39C5BB] font-medium">{song.title}</h3>
              <p class="text-white/70 text-sm">{song.artist}</p>
            </div>
            <div class="bg-[#39C5BB] text-white px-4 py-2 rounded-lg">プレイ</div>
          </button>
        </li>
      {/each}
    </ul>
  </div>
  </div>
</div>

<!-- スタイルは src/app.css に移動 -->

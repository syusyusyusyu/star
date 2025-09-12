// Copied and adapted for SPA (Svelte) environment
// デフォルトの曲データ
const defaultSong = {
	id: 1,
	title: "SUPERHERO",
	artist: "めろくる",
	apiToken: "wifkp8ak1TEhQ8pI",
	songUrl: "https://piapro.jp/t/hZ35/20240130103028"
};

// 色のバリエーション
const colorVariations = {
	easy: 'rgba(57, 197, 187, 0.1)',
	normal: 'rgba(255, 165, 0, 0.1)',
	hard: 'rgba(255, 105, 180, 0.1)'
};

function setupSongConfig() {
	const selectedSongData = JSON.parse(localStorage.getItem('selectedSong') || 'null');
	const songData = selectedSongData || defaultSong;
	const titleEl = document.getElementById('song-title');
	const loadingEl = document.getElementById('loading');
	if (titleEl) titleEl.textContent = songData.title;
	if (loadingEl) loadingEl.textContent = `${songData.title} をロード中...`;
	document.documentElement.style.setProperty('--bg-accent-color', colorVariations[songData.difficulty] || 'rgba(57, 197, 187, 0.1)');
	window.songConfig = { apiToken: songData.apiToken, songUrl: songData.songUrl };
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupSongConfig);
} else {
	// SPA で既に DOMContentLoaded 済みなら即実行
	setupSongConfig();
}

function tryInitGameManager() {
	let attempts = 0;
	const maxAttempts = 15; // SPA 環境を考慮してリトライ回数を増やす
	const initGameManager = () => {
		attempts++;
		if (window.songConfig && typeof window.GameManager === 'function' && !window.gameManager) {
			try {
				window.gameManager = new window.GameManager();
				window.addEventListener('beforeunload', () => {
					if (window.gameManager) window.gameManager.cleanup();
				});
			} catch (error) {
				console.error('Game manager initialization error:', error);
				if (attempts < maxAttempts) setTimeout(initGameManager, 300);
			}
		} else if (attempts < maxAttempts && !window.gameManager) {
			setTimeout(initGameManager, 300);
		}
	};

	// 1秒遅延してから初回トライ（CDN群のロードと /script.js の整合を取る）
	setTimeout(initGameManager, 1000);
}

if (document.readyState === 'complete') {
	// SPA で load 済みなら即トライ
	tryInitGameManager();
} else {
	window.addEventListener('load', tryInitGameManager);
}

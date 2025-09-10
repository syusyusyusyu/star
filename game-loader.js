// YouTube IFrame API用のグローバル関数とゲーム初期化

// YouTube IFrame APIの準備完了コールバック
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube IFrame API ready');
    window.youtubeAPIReady = true;
    // GameManagerが既に初期化されている場合は、YouTube playerを初期化
    if (window.gameManager) {
        window.gameManager.initYouTubePlayer();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータから動画情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const mode = urlParams.get('mode') || 'cursor';
    
    // ローカルストレージからも動画情報を取得（フォールバック）
    let videoData = null;
    try {
        videoData = JSON.parse(localStorage.getItem('selectedVideo') || 'null');
    } catch (e) {
        console.error('Failed to parse video data from localStorage:', e);
    }
    
    // 動画IDの決定（URLパラメータを優先）
    const finalVideoId = videoId || videoData?.videoId;
    const finalMode = mode || videoData?.mode || 'cursor';
    
    if (!finalVideoId) {
        console.error('No video ID found. Redirecting to home page.');
        alert('動画が指定されていません。ホームページに戻ります。');
        window.location.href = 'index.html';
        return;
    }
    
    // グローバル設定を初期化
    window.gameConfig = {
        videoId: finalVideoId,
        mode: finalMode,
        subtitlesUrl: `http://localhost:8080/api/subtitles?videoId=${finalVideoId}&lang=ja`
    };
    
    console.log('Game config initialized:', window.gameConfig);
    
    // UI要素の初期化
    updateUI();
    
    // プロキシサーバーの疎通確認
    checkProxyServer();
});

/**
 * UI要素を更新
 */
function updateUI() {
    const songTitle = document.getElementById('song-title');
    const loading = document.getElementById('loading');
    
    if (songTitle) {
        songTitle.textContent = `YouTube動画: ${window.gameConfig.videoId}`;
    }
    
    if (loading) {
        loading.textContent = 'Loading subtitles...';
    }
}

/**
 * プロキシサーバーの疎通確認
 */
async function checkProxyServer() {
    try {
        const response = await fetch('http://localhost:8080/api/health');
        if (response.ok) {
            console.log('Proxy server is running');
            initializeGame();
        } else {
            throw new Error('Proxy server returned error');
        }
    } catch (error) {
        console.error('Proxy server check failed:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.textContent = 'プロキシサーバーが起動していません。npm startを実行してください。';
            loading.style.color = '#ff6b6b';
        }
    }
}

/**
 * ゲームの初期化
 */
function initializeGame() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const initGameManager = () => {
        attempts++;
        
        if (typeof GameManager === 'function' && !window.gameManager) {
            try {
                window.gameManager = new GameManager();
                console.log('GameManager initialized successfully');
                
                // ページ離脱時のクリーンアップ
                window.addEventListener('beforeunload', () => {
                    if (window.gameManager) {
                        window.gameManager.cleanup();
                    }
                });
                
                // YouTube APIが既に準備完了している場合
                if (window.youtubeAPIReady) {
                    window.gameManager.initYouTubePlayer();
                }
                
            } catch (error) {
                console.error("GameManager initialization error:", error);
                if (attempts < maxAttempts) {
                    setTimeout(initGameManager, 300);
                } else {
                    const loading = document.getElementById('loading');
                    if (loading) {
                        loading.textContent = 'ゲームの初期化に失敗しました。ページを再読み込みしてください。';
                        loading.style.color = '#ff6b6b';
                    }
                }
            }
        } else if (attempts < maxAttempts && !window.gameManager) {
            setTimeout(initGameManager, 300);
        }
    };
    
    // script.jsが確実に読み込まれるよう少し待機
    setTimeout(initGameManager, 500);
}
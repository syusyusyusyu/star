// game-loader.js - 更新版

// デフォルト曲情報
const defaultSong = {
    title: "マジカルミライ2025",
    artist: "Mitchie M",
    apiToken: "wifkp8ak1TEhQ8pI",
    songUrl: "https://piapro.jp/t/hZ35/20240130103028"
};

document.addEventListener('DOMContentLoaded', () => {
    // 曲情報の取得と設定
    const selectedSongData = JSON.parse(localStorage.getItem('selectedSong') || 'null');
    
    // 選択された曲または既定値を使用
    const songData = selectedSongData || defaultSong;
    
    // GameManagerが初期化される前にグローバル変数として設定
    window.songConfig = {
        apiToken: songData.apiToken,
        songUrl: songData.songUrl,
        title: songData.title
    };
});

// GameManager初期化
window.addEventListener('load', () => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const initGameManager = () => {
        attempts++;
        
        if (window.songConfig && typeof GameManager === 'function') {
            try {
                window.gameManager = new GameManager();
                
                // ページ離脱時のクリーンアップ
                window.addEventListener('beforeunload', () => {
                    if (window.gameManager) window.gameManager.cleanup();
                });
            } catch (error) {
                console.error("GameManager initialization error:", error);
                if (attempts < maxAttempts) {
                    setTimeout(initGameManager, 300);
                }
            }
        } else if (attempts < maxAttempts) {
            setTimeout(initGameManager, 300);
        }
    };
    
    // script.jsが確実に読み込まれるよう少し待機
    setTimeout(initGameManager, 1000);
});
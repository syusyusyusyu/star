/**
 * Lyric Stage Game Loader
 * YouTube IFrame Player API + Express.js サーバーによる字幕取得システム用
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Game loader initialized');
    
    // ゲームデータの取得
    const gameDataStr = localStorage.getItem('gameData');
    if (!gameDataStr) {
        console.error('No game data found, redirecting to title');
        window.location.href = 'index.html';
        return;
    }
    
    const gameData = JSON.parse(gameDataStr);
    console.log('Game data loaded:', gameData);
    
    // UI更新
    const songTitle = document.getElementById('song-title');
    const loading = document.getElementById('loading');
    
    if (songTitle) {
        songTitle.textContent = `YouTube Video: ${gameData.videoId}`;
    }
    
    if (loading) {
        loading.textContent = 'ゲームシステムを初期化中...';
    }
    
    // モード別の指示テキスト更新
    const instructions = document.getElementById('instructions');
    if (instructions) {
        const modeInstructions = {
            cursor: '歌詞の文字をクリック/タップしてポイントを獲得しよう！',
            hand: 'カメラに手を映し、人差し指で歌詞に触れよう！',
            body: 'カメラに全身を映し、手で歌詞に触れよう！'
        };
        
        const instructionText = instructions.querySelector('div');
        if (instructionText) {
            instructionText.textContent = modeInstructions[gameData.mode] || modeInstructions.cursor;
        }
    }
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.game && typeof window.game.cleanup === 'function') {
        window.game.cleanup();
    }
});
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

document.addEventListener('DOMContentLoaded', () => {
    // 曲情報の取得と設定
    const selectedSongData = JSON.parse(localStorage.getItem('selectedSong') || 'null');
    
    // 選択された曲または既定値を使用
    const songData = selectedSongData || defaultSong;
    
    // UI更新
    document.getElementById('song-title').textContent = songData.title;
    document.getElementById('loading').textContent = `${songData.title} をロード中...`;
    
    document.documentElement.style.setProperty(
        '--bg-accent-color', 
        colorVariations[songData.difficulty] || 'rgba(57, 197, 187, 0.1)'
    );
    
    // GameManagerが初期化される前にグローバル変数として設定
    window.songConfig = {
        apiToken: songData.apiToken,
        songUrl: songData.songUrl
    };
    
    // ライブ会場のパーティクル効果を初期化
    initLiveParticles();
});

// ライブ会場のパーティクル効果
function initLiveParticles() {
    const container = document.getElementById('game-particles');
    if (!container) return;
    
    const particleCount = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 8000));
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.borderRadius = '50%';
        particle.style.backgroundColor = i % 3 === 0 ? '#39C5BB' : (i % 3 === 1 ? '#FF69B4' : '#fff');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.opacity = `${0.3 + Math.random() * 0.4}`;
        particle.style.boxShadow = `0 0 ${2 + Math.random() * 3}px currentColor`;
        particle.style.animation = `particleFloat ${3 + Math.random() * 4}s ease-in-out infinite`;
        particle.style.animationDelay = `${Math.random() * 3}s`;
        container.appendChild(particle);
    }
    
    // パーティクルアニメーション
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleFloat {
            0%, 100% {
                transform: translateY(0) scale(1);
                opacity: 0.3;
            }
            50% {
                transform: translateY(-20px) scale(1.2);
                opacity: 0.7;
            }
        }
    `;
    document.head.appendChild(style);
}

// script.jsの初期化関数を削除し、ここだけで処理する
window.addEventListener('load', () => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const initGameManager = () => {
        attempts++;
        
        if (window.songConfig && typeof GameManager === 'function' && !window.gameManager) {
            try {
                window.gameManager = new GameManager();
                
                // ページ離脱時のクリーンアップ
                window.addEventListener('beforeunload', () => {
                    if (window.gameManager) window.gameManager.cleanup();
                });
            } catch (error) {
                console.error("Game manager initialization error:", error);
                if (attempts < maxAttempts) {
                    setTimeout(initGameManager, 300);
                }
            }
        } else if (attempts < maxAttempts && !window.gameManager) {
            setTimeout(initGameManager, 300);
        }
    };
    
    // script.jsが確実に読み込まれるよう少し待機
    setTimeout(initGameManager, 1000);
});
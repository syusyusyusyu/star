// 曲のデータ
const songsData = [
    {
        id: 1,
        title: "SUPERHERO",
        artist: "めろくる",
        apiToken: "wifkp8ak1TEhQ8pI",
        songUrl: "https://piapro.jp/t/hZ35/20240130103028"
    },
    {
        id: 2,
        title: "いつか君と話したミライは",
        artist: "タケノコ少年",
        apiToken: "x0ogHDnqRB8hjnrf",
        songUrl: "https://piapro.jp/t/--OD/20240202150903"
    },
    {
        id: 3,
        title: "フューチャーノーツ",
        artist: "shikisai",
        apiToken: "ZneYLNtDFF7FMsai",
        songUrl: "https://piapro.jp/t/XiaI/20240201203346"
    },
    {
        id: 4,
        title: "未来交響曲",
        artist: "ヤマギシコージ",
        apiToken: "Dwi8uWkUIHQQGCtF",
        songUrl: "https://piapro.jp/t/Rejk/20240202164429"
    },
    {
        id: 5,
        title: "リアリティ",
        artist: "歩く人 & sober bear",
        apiToken: "QTPx3Xr44KcwmYbL",
        songUrl: "https://piapro.jp/t/ELIC/20240130010349"
    }
];

/**
 * 曲選択アイテムを生成して追加する関数
 */
function createSongItems() {
    const songList = document.getElementById('song-list');
    const fragment = document.createDocumentFragment();
    
    songsData.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item bg-black/40 rounded-lg backdrop-blur-sm border border-miku/30';
        li.dataset.songId = song.id;
        
        li.innerHTML = `
            <button class="w-full p-4 text-left flex justify-between items-center focus:outline-none">
                <div>
                    <h3 class="text-xl text-miku font-medium">${song.title}</h3>
                    <p class="text-white/70 text-sm">${song.artist}</p>
                </div>
                <div class="bg-miku text-white px-4 py-2 rounded-lg">
                    プレイ
                </div>
            </button>
        `;
        
        fragment.appendChild(li);
    });
    
    songList.appendChild(fragment);
}

/**
 * ゲーム情報をローカルストレージに保存して画面遷移
 * @param {number} songId - 選択された曲のID
 */
function saveSongSelection(songId) {
    const selectedSong = songsData.find(song => song.id === songId);
    if (selectedSong) {
        localStorage.setItem('selectedSong', JSON.stringify(selectedSong));
        window.location.href = 'game.html';
    }
}

/**
 * 星エフェクトを作成する関数
 */
function createStars() {
    const starsContainer = document.getElementById('stars-container');
    const starCount = Math.min(100, Math.floor(window.innerWidth * window.innerHeight / 6000));
    
    starsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
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
        
        fragment.appendChild(star);
    }
    
    starsContainer.appendChild(fragment);
}

/**
 * クリックエフェクトの作成
 */
function createClickEffect(element, x, y) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    
    const relX = x ? x - rect.left : rect.width / 2;
    const relY = y ? y - rect.top : rect.height / 2;
    
    ripple.className = 'absolute bg-white/40 rounded-full pointer-events-none';
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    ripple.style.left = `${relX}px`;
    ripple.style.top = `${relY}px`;
    ripple.style.transform = 'translate(-50%, -50%) scale(0)';
    ripple.style.animation = 'ripple 0.6s ease-out forwards';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// ページロード時の処理
document.addEventListener('DOMContentLoaded', () => {
    createSongItems();
    createStars();
    
    // リサイズ時に星の数を調整
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(createStars, 250);
    });
    
    // 曲選択処理
    document.getElementById('song-list').addEventListener('click', (e) => {
        const songItem = e.target.closest('.song-item');
        if (!songItem) return;
        
        const button = songItem.querySelector('button');
        if (!button || !e.target.closest('button')) return;
        
        const songId = parseInt(songItem.dataset.songId);
        
        // クリックエフェクト
        createClickEffect(button, e.clientX, e.clientY);
        
        // ホバーエフェクトを追加
        songItem.classList.add('animate-pulse-miku');
        
        // 0.5秒後に画面遷移
        setTimeout(() => saveSongSelection(songId), 500);
    });
    
    // ホバーエフェクト
    document.getElementById('song-list').addEventListener('mouseover', (e) => {
        const songItem = e.target.closest('.song-item');
        if (songItem && e.target.closest('button')) {
            songItem.classList.add('animate-pulse-miku');
        }
    });
    
    document.getElementById('song-list').addEventListener('mouseout', (e) => {
        const songItem = e.target.closest('.song-item');
        if (songItem) {
            songItem.classList.remove('animate-pulse-miku');
        }
    });
});
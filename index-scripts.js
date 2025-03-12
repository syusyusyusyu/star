// 曲のデータ
const songsData = [
    {
        id: 1,
        title: "メルト",
        artist: "ryo (supercell)",
        difficulty: "EASY",
        apiToken: "x0ogHDnqRB8hjnrf",
        songUrl: "https://piapro.jp/t/--OD/20240202150903"
    },
    {
        id: 2,
        title: "千本桜",
        artist: "黒うさP",
        difficulty: "NORMAL",
        apiToken: "dJcf3DnRT5hjnsu2",
        songUrl: "https://piapro.jp/t/--SE/20240202150903"
    },
    {
        id: 3,
        title: "ワールドイズマイン",
        artist: "ryo (supercell)",
        difficulty: "HARD",
        apiToken: "hJ4gKcnSF6rmd6t9",
        songUrl: "https://piapro.jp/t/--MI/20240202150903"
    },
    {
        id: 4,
        title: "ローリンガール",
        artist: "wowaka",
        difficulty: "HARD",
        apiToken: "pL7hVbnRG3dke9a1",
        songUrl: "https://piapro.jp/t/--WW/20240202150903"
    },
    {
        id: 5,
        title: "マジカルミライ 2025",
        artist: "Mitchie M",
        difficulty: "SPECIAL",
        apiToken: "rT8jKvmSL2pqe3z4",
        songUrl: "https://piapro.jp/t/--MM/20240202150903"
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
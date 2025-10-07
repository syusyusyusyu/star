// 曲のデータ
const songsData = [
    {
        id: 1,
        title: "ストリートライト",
        artist: "加賀(ネギシャワーP)",
        apiToken: "HmfsoBVch26BmLCm",
        songUrl: "https://piapro.jp/t/ULcJ/20250205120202"
    },
    {
        id: 2,
        title: "アリフレーション",
        artist: "雨良 Amala",
        apiToken: "rdja5JxMEtcYmyKP",
        songUrl: "https://piapro.jp/t/SuQO/20250127235813"
    },
    {
        id: 3,
        title: "インフォーマルダイブ",
        artist: "99piano",
        apiToken: "CqbpJNJHwoGvXhlD",
        songUrl: "https://piapro.jp/t/Ppc9/20241224135843"
    },
    {
        id: 4,
        title: "ハロー、フェルミ。",
        artist: "ど～ぱみん",
        apiToken: "o1B1ZygOqyhK5B3D",
        songUrl: "https://piapro.jp/t/oTaJ/20250204234235"
    },
    {
        id: 5,
        title: "パレードレコード",
        artist: "きさら",
        apiToken: "G8MU8Wf87RotH8OR",
        songUrl: "https://piapro.jp/t/GCgy/20250202202635"
    },
    {
        id: 6,
        title: "ロンリーラン",
        artist: "海風太陽",
        apiToken: "fI0SyBEEBzlB2f5C",
        songUrl: "https://piapro.jp/t/CyPO/20250128183915"
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
    li.className = 'song-item bg-black/40 rounded-lg backdrop-blur-sm border border-miku/30 w-full';
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
    const gameModeSelect = document.getElementById('game-mode');
    const selectedMode = gameModeSelect ? gameModeSelect.value : 'cursor'; // デフォルトはカーソルモード

    if (selectedSong) {
        localStorage.setItem('selectedSong', JSON.stringify(selectedSong));
        window.location.href = `game.html?mode=${selectedMode}`;
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
 * モバイルデバイスかどうかを検出
 * @return {boolean} モバイルデバイスの場合true
 */
function detectMobileDevice() {
    // ユーザーエージェントによる検出
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // タッチ対応の検出
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 画面サイズによる検出（768px以下をモバイルとみなす）
    const smallScreen = window.innerWidth <= 768;
    
    // カメラアクセスの制限チェック（一部のモバイルブラウザでは制限あり）
    const limitedCamera = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    return mobileUA || (hasTouch && smallScreen) || limitedCamera;
}

/**
 * モバイルデバイス向けにモード選択を制限
 */
function restrictModeSelectionForMobile() {
    const gameModeSelect = document.getElementById('game-mode');
    const modeSelection = document.getElementById('mode-selection');
    
    if (gameModeSelect && modeSelection) {
        // セレクトボックスを無効化してCursorモード固定
        gameModeSelect.value = 'cursor';
        gameModeSelect.disabled = true;
        
        // 視覚的にモバイル向け表示に変更
        const label = modeSelection.querySelector('label');
        if (label) {
            label.textContent = 'Playモード: Cursorモード（モバイル専用）';
        }
        
        // セレクトボックスのスタイルを変更
        gameModeSelect.style.backgroundColor = '#4a5568';
        gameModeSelect.style.color = '#a0aec0';
        gameModeSelect.style.cursor = 'not-allowed';
        
        // 説明テキストも更新
        const description = document.querySelector('.max-w-md p');
        if (description) {
            description.textContent = '歌詞の文字をタップしてポイントを獲得しよう！（モバイル最適化）';
        }
        
        console.log('モバイルデバイスが検出されました。Cursorモード限定に設定されました。');
    }
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
    // モバイルデバイス検出
    const isMobile = detectMobileDevice();
    
    // モバイルの場合はモード選択を制限
    if (isMobile) {
        restrictModeSelectionForMobile();
    }
    
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

    // === ヘルプモーダル ===
    const helpModal = document.getElementById('help-modal');
    const openHelpBtn = document.getElementById('open-help-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const closeHelpBtnTop = document.getElementById('close-help-btn-top');
    const helpBackdrop = document.getElementById('help-backdrop');
    let lastFocusedElement = null;

    function openHelp() {
        if (!helpModal) return;
        lastFocusedElement = document.activeElement;
        helpModal.classList.remove('hidden');
        // フォーカス移動
        const firstFocusable = helpModal.querySelector('button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) firstFocusable.focus();
        document.addEventListener('keydown', handleKeydown);
    }

    function closeHelp() {
        if (!helpModal) return;
        helpModal.classList.add('hidden');
        document.removeEventListener('keydown', handleKeydown);
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            closeHelp();
        } else if (e.key === 'Tab') {
            // フォーカストラップ
            const focusables = Array.from(helpModal.querySelectorAll('button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])'))
                .filter(el => !el.disabled && !el.classList.contains('hidden'));
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    openHelpBtn?.addEventListener('click', openHelp);
    closeHelpBtn?.addEventListener('click', closeHelp);
    closeHelpBtnTop?.addEventListener('click', closeHelp);
    helpBackdrop?.addEventListener('click', closeHelp);
});
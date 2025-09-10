/**
 * YouTube動画IDをURLから抽出する関数
 * @param {string} url - YouTube URL
 * @return {string|null} - 動画IDまたはnull
 */
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/**
 * YouTube URLの妥当性をチェック
 * @param {string} url - チェックするURL
 * @return {boolean} - 有効なYouTube URLかどうか
 */
function isValidYouTubeUrl(url) {
    return extractVideoId(url) !== null;
}

/**
 * 再生ボタンの状態を更新
 */
function updatePlayButton() {
    const urlInput = document.getElementById('youtube-url');
    const playButton = document.getElementById('play-button');
    const url = urlInput.value.trim();
    
    if (isValidYouTubeUrl(url)) {
        playButton.disabled = false;
        playButton.textContent = '再生';
        urlInput.classList.remove('border-red-500');
        urlInput.classList.add('border-gray-600');
    } else if (url.length > 0) {
        playButton.disabled = true;
        playButton.textContent = '無効なURL';
        urlInput.classList.add('border-red-500');
        urlInput.classList.remove('border-gray-600');
    } else {
        playButton.disabled = true;
        playButton.textContent = '再生';
        urlInput.classList.remove('border-red-500');
        urlInput.classList.add('border-gray-600');
    }
}

/**
 * ゲーム画面への遷移
 */
function startGame() {
    const urlInput = document.getElementById('youtube-url');
    const gameModeSelect = document.getElementById('game-mode');
    const url = urlInput.value.trim();
    const selectedMode = gameModeSelect ? gameModeSelect.value : 'cursor';
    
    if (!isValidYouTubeUrl(url)) {
        alert('有効なYouTube URLを入力してください');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('YouTube動画IDを取得できませんでした');
        return;
    }
    
    // 動画情報をローカルストレージに保存
    const videoData = {
        videoId: videoId,
        url: url,
        mode: selectedMode
    };
    
    localStorage.setItem('selectedVideo', JSON.stringify(videoData));
    
    // ゲーム画面に遷移
    window.location.href = `game.html?mode=${selectedMode}&v=${videoId}`;
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
    
    createStars();
    
    // YouTube URL入力フィールドのイベントリスナー
    const urlInput = document.getElementById('youtube-url');
    const playButton = document.getElementById('play-button');
    
    if (urlInput) {
        urlInput.addEventListener('input', updatePlayButton);
        urlInput.addEventListener('paste', () => {
            setTimeout(updatePlayButton, 100); // ペースト後の値を確実に取得
        });
    }
    
    if (playButton) {
        playButton.addEventListener('click', startGame);
    }
    
    // リサイズ時に星の数を調整
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(createStars, 250);
    });
});
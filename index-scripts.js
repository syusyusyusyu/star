/**
 * YouTube URLからビデオIDを抽出
 * @param {string} url - YouTube URL
 * @return {string|null} ビデオID
 */
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * YouTube URLの妥当性をチェック
 * @param {string} url - チェックするURL
 * @return {boolean} 妥当なURLの場合true
 */
function isValidYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const videoId = extractVideoId(url);
    return videoId && videoId.length === 11;
}

/**
 * ゲーム情報をローカルストレージに保存して画面遷移
 * @param {string} youtubeUrl - YouTube URL
 */
function startGame(youtubeUrl) {
    const videoId = extractVideoId(youtubeUrl);
    const gameModeSelect = document.getElementById('game-mode');
    const selectedMode = gameModeSelect ? gameModeSelect.value : 'cursor';

    if (videoId) {
        const gameData = {
            videoId: videoId,
            youtubeUrl: youtubeUrl,
            mode: selectedMode
        };
        
        localStorage.setItem('gameData', JSON.stringify(gameData));
        window.location.href = `game.html?mode=${selectedMode}&v=${videoId}`;
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
        // セレクトボックスを無効化してカーソルモード固定
        gameModeSelect.value = 'cursor';
        gameModeSelect.disabled = true;
        
        // 視覚的にモバイル向け表示に変更
        const label = modeSelection.querySelector('label');
        if (label) {
            label.textContent = 'プレイモード: カーソルモード（モバイル専用）';
        }
        
        // セレクトボックスのスタイルを変更
        gameModeSelect.style.backgroundColor = '#4a5568';
        gameModeSelect.style.color = '#a0aec0';
        gameModeSelect.style.cursor = 'not-allowed';
        
        console.log('モバイルデバイスが検出されました。カーソルモード限定に設定されました。');
    }
}

/**
 * 入力フィールドのバリデーション表示を更新
 * @param {HTMLInputElement} input - 入力フィールド
 * @param {boolean} isValid - 妥当性
 */
function updateValidationState(input, isValid) {
    if (isValid) {
        input.classList.remove('border-red-500', 'bg-red-900/30');
        input.classList.add('border-green-500', 'bg-green-900/30');
    } else {
        input.classList.remove('border-green-500', 'bg-green-900/30');
        input.classList.add('border-red-500', 'bg-red-900/30');
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
    
    // リサイズ時に星の数を調整
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(createStars, 250);
    });
    
    // YouTube URL入力フィールドの処理
    const youtubeUrlInput = document.getElementById('youtube-url');
    const startGameButton = document.getElementById('start-game');
    
    if (youtubeUrlInput) {
        // 入力時のリアルタイムバリデーション
        youtubeUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const isValid = url === '' || isValidYouTubeUrl(url);
            
            if (url !== '') {
                updateValidationState(youtubeUrlInput, isValid);
            } else {
                // 空の場合は通常状態に戻す
                youtubeUrlInput.classList.remove('border-red-500', 'bg-red-900/30', 'border-green-500', 'bg-green-900/30');
            }
            
            // ボタンの状態を更新
            if (startGameButton) {
                startGameButton.disabled = !isValid || url === '';
                startGameButton.classList.toggle('opacity-50', !isValid || url === '');
                startGameButton.classList.toggle('cursor-not-allowed', !isValid || url === '');
            }
        });
        
        // Enter キーでゲーム開始
        youtubeUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value.trim();
                if (isValidYouTubeUrl(url)) {
                    // クリックエフェクト
                    if (startGameButton) {
                        createClickEffect(startGameButton);
                    }
                    setTimeout(() => startGame(url), 300);
                }
            }
        });
    }
    
    // 再生ボタンクリック処理
    if (startGameButton) {
        startGameButton.addEventListener('click', (e) => {
            const url = youtubeUrlInput ? youtubeUrlInput.value.trim() : '';
            
            if (isValidYouTubeUrl(url)) {
                // クリックエフェクト
                createClickEffect(startGameButton, e.clientX, e.clientY);
                
                // 0.3秒後に画面遷移
                setTimeout(() => startGame(url), 300);
            }
        });
        
        // 初期状態ではボタンを無効化
        startGameButton.disabled = true;
        startGameButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const urlInput = document.getElementById('youtube-url');
    const modeSelect = document.getElementById('game-mode');
    const errorMessage = document.getElementById('error-message');

    // 背景の星エフェクトを生成
    createStars();
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(createStars, 250);
    });

    // モバイルデバイスの場合はモード選択を制限
    if (detectMobileDevice()) {
        restrictModeSelectionForMobile();
    }

    playButton.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            showError('YouTubeのURLを入力してください。');
            return;
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            showError('無効なYouTube URLです。正しいURLを入力してください。');
            return;
        }

        const mode = modeSelect.value;
        
        // エフェクトを追加して画面遷移
        playButton.classList.add('animate-pulse-miku');
        setTimeout(() => {
            window.location.href = `game.html?v=${videoId}&mode=${mode}`;
        }, 500);
    });

    function extractVideoId(url) {
        // YouTubeの動画IDを抽出する正規表現
        const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/; // Corrected escaping for backslashes in regex
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    function showError(message) {
        errorMessage.textContent = message;
        urlInput.classList.add('border-red-500');
        setTimeout(() => {
            errorMessage.textContent = '';
            urlInput.classList.remove('border-red-500');
        }, 3000);
    }

    /**
     * 星エフェクトを作成する関数
     */
    function createStars() {
        const starsContainer = document.getElementById('stars-container');
        if (!starsContainer) return;
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
     */
    function detectMobileDevice() {
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const smallScreen = window.innerWidth <= 768;
        return mobileUA || (hasTouch && smallScreen);
    }

    /**
     * モバイルデバイス向けにモード選択を制限
     */
    function restrictModeSelectionForMobile() {
        const gameModeSelect = document.getElementById('game-mode');
        const modeSelectionDiv = document.getElementById('mode-selection');
        
        if (gameModeSelect && modeSelectionDiv) {
            gameModeSelect.value = 'cursor';
            gameModeSelect.disabled = true;
            
            const label = modeSelectionDiv.querySelector('label');
            if (label) {
                label.textContent = 'Playモード: Cursor (モバイル)';
            }
            
            // Hide hand/body options
            const options = gameModeSelect.querySelectorAll('option');
            options.forEach(option => {
                if (option.value !== 'cursor') {
                    option.style.display = 'none';
                }
            });
        }
    }
});

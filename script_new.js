/**
 * Lyric Stage - YouTube IFrame API + 自動字幕ベースのリズムゲーム
 * 
 * YouTube動画と自動字幕を同期して表示し、
 * ユーザーが表示された歌詞にインタラクションすることでスコアを獲得するゲーム
 */

class GameManager {
  /**
   * ゲームマネージャーの初期化
   */
  constructor() {
    // 基本設定の初期化
    this.videoId = window.gameConfig?.videoId;
    this.subtitlesUrl = window.gameConfig?.subtitlesUrl;
    this.score = this.combo = this.maxCombo = 0;
    this.startTime = Date.now();
    this.isPlaying = this.isPlayerInit = false;
    this.isFirstInteraction = true;
    this.player = null;
    this.youtubePlayer = null;
    this.isMobile = /Android|iPhone/.test(navigator.userAgent);
    this.activeChars = new Set();
    this.displayedLyrics = new Set();
    this.mouseTrail = [];
    this.maxTrailLength = 15;
    this.lastMousePos = { x: 0, y: 0 };
    this.apiLoaded = false;
    this._operationInProgress = false;
    this.resultsDisplayed = false;
    this.subtitlesData = [];
    this.currentSubtitleIndex = 0;
    
    // モバイルデバイス検出
    this.isMobile = this.detectMobileDevice();
    if (this.isMobile) {
      console.log('モバイルデバイスが検出されました。Cursorモード限定で動作します。');
    }
    
    // URLからモードを読み込む（モバイルの場合はcursor限定）
    const urlParams = new URLSearchParams(window.location.search);
    const requestedMode = urlParams.get('mode') || 'cursor';
    this.currentMode = this.isMobile ? 'cursor' : requestedMode;
    
    if (this.isMobile && requestedMode !== 'cursor') {
      console.log(`モバイルデバイスのため、要求されたモード'${requestedMode}'からCursorモードに変更されました。`);
    }
    
    this.hands = null;
    this.pose = null;
    this.bodyDetectionReady = false;
    this.countdownTimer = null;
    this.fullBodyLostTimer = null;
    
    // モバイルブラウザのビューポート処理
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    
    // 必要なDOM要素の取得
    [this.gamecontainer, this.scoreEl, this.comboEl, this.playpause, this.restart, this.loading, this.countdownOverlay, this.countdownText] = 
      ['game-container', 'score', 'combo', 'play-pause', 'restart', 'loading', 'countdown-overlay', 'countdown-text'].map(id => document.getElementById(id));
    
    // 初期状態
    this.isPaused = true;
    
    // ゲームの基本セットアップ
    this.setupEvents();
    this.initGame();
    
    // カーソルスタイル
    this.gamecontainer.style.userSelect = 'none';
    
    // タイマー関連
    this.resultCheckTimer = null;
    this.songProgressTimer = null;
    this.finishWatchInterval = null;
    this.finishFallbackTimeout = null;

    // 鑑賞用歌詞表示の設定
    this.displayedViewerLyrics = new Map();
    this.viewerLyricsContainer = document.createElement('div');
    this.viewerLyricsContainer.className = 'viewer-lyrics-container';
    this.gamecontainer.appendChild(this.viewerLyricsContainer);

    // 手振り検出用の変数
    this.handHistory = [];
    this.lastWaveTime = 0;
    this.waveThreshold = 0.1;
    this.waveTimeWindow = 400;

    // 初期モードに基づいてカメラを初期化
    this.initCamera();
    this.updateInstructions();
    
    // 字幕の読み込み
    this.loadSubtitles();
  }

  /**
   * モバイルデバイスかどうかを検出
   */
  detectMobileDevice() {
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 768;
    const limitedCamera = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    return mobileUA || (hasTouch && smallScreen) || limitedCamera;
  }

  /**
   * ビューポート高さの更新
   */
  updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * 字幕データの読み込み
   */
  async loadSubtitles() {
    if (!this.subtitlesUrl) {
      console.error('字幕URLが設定されていません');
      this.fallbackMode();
      return;
    }

    if (this.loading) {
      this.loading.textContent = 'Loading subtitles...';
    }

    try {
      console.log('字幕を読み込み中:', this.subtitlesUrl);
      const response = await fetch(this.subtitlesUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.subtitles && data.subtitles.length > 0) {
        this.subtitlesData = this.processSubtitles(data.subtitles);
        console.log(`${this.subtitlesData.length}個の字幕データを読み込みました`);
        
        if (this.loading) {
          this.loading.textContent = '準備完了 - 「再生」ボタンを押してください';
        }
        
        this.apiLoaded = true;
        this.enableControls();
      } else {
        throw new Error('字幕データが見つかりません');
      }
    } catch (error) {
      console.error('字幕の読み込みに失敗:', error);
      if (this.loading) {
        this.loading.textContent = `字幕読み込みエラー: ${error.message}`;
        this.loading.style.color = '#ff6b6b';
      }
      this.fallbackMode();
    }
  }

  /**
   * 字幕データの処理
   */
  processSubtitles(subtitles) {
    const processed = [];
    
    subtitles.forEach(subtitle => {
      const text = subtitle.text.trim();
      if (!text) return;
      
      // 1文字ずつに分割
      Array.from(text).forEach((char, index) => {
        if (char.trim()) { // 空白文字以外のみ
          processed.push({
            time: subtitle.startTime + (index * 200), // 200msずつずらす
            endTime: subtitle.endTime,
            text: char,
            originalText: text,
            charIndex: index
          });
        }
      });
    });
    
    return processed.sort((a, b) => a.time - b.time);
  }

  /**
   * フォールバックモード（デモ用の字幕データ）
   */
  fallbackMode() {
    console.log('フォールバックモードを開始');
    
    // デモ用の字幕データ
    const demoLyrics = [
      { text: "Welcome", startTime: 2000 },
      { text: "to", startTime: 4000 },
      { text: "Lyric", startTime: 6000 },
      { text: "Stage", startTime: 8000 },
      { text: "YouTube", startTime: 10000 },
      { text: "Demo", startTime: 12000 }
    ];
    
    this.subtitlesData = [];
    demoLyrics.forEach(lyric => {
      Array.from(lyric.text).forEach((char, index) => {
        this.subtitlesData.push({
          time: lyric.startTime + index * 200,
          endTime: lyric.startTime + 2000,
          text: char,
          originalText: lyric.text,
          charIndex: index
        });
      });
    });
    
    this.apiLoaded = true;
    this.enableControls();
    
    if (this.loading) {
      this.loading.textContent = 'デモモードで準備完了';
    }
  }

  /**
   * コントロールボタンを有効化
   */
  enableControls() {
    if (this.playpause) {
      this.playpause.textContent = '再生';
      this.playpause.disabled = false;
    }
    if (this.restart) {
      this.restart.textContent = '最初から';
      this.restart.disabled = false;
    }
  }

  /**
   * YouTube Playerの初期化
   */
  initYouTubePlayer() {
    if (!window.YT || !this.videoId) {
      console.error('YouTube API or videoId not available');
      return;
    }

    try {
      this.youtubePlayer = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: this.videoId,
        playerVars: {
          'autoplay': 0,
          'controls': 0,
          'disablekb': 1,
          'modestbranding': 1,
          'playsinline': 1
        },
        events: {
          'onReady': (event) => {
            console.log('YouTube player ready');
            this.isPlayerInit = true;
          },
          'onStateChange': (event) => {
            this.onYouTubeStateChange(event);
          },
          'onError': (event) => {
            console.error('YouTube player error:', event.data);
          }
        }
      });
    } catch (error) {
      console.error('YouTube player initialization failed:', error);
    }
  }

  /**
   * YouTube Player状態変更の処理
   */
  onYouTubeStateChange(event) {
    const state = event.data;
    
    if (state === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.isPaused = false;
      if (this.playpause) this.playpause.textContent = '一時停止';
      this.startSubtitleSync();
    } else if (state === YT.PlayerState.PAUSED) {
      this.isPlaying = false;
      this.isPaused = true;
      if (this.playpause) this.playpause.textContent = '再生';
    } else if (state === YT.PlayerState.ENDED) {
      this.onSongEnd();
    }
  }

  /**
   * 字幕の同期開始
   */
  startSubtitleSync() {
    if (this.subtitleSyncInterval) {
      clearInterval(this.subtitleSyncInterval);
    }
    
    this.currentSubtitleIndex = 0;
    this.displayedLyrics.clear();
    
    this.subtitleSyncInterval = setInterval(() => {
      if (!this.youtubePlayer || !this.isPlaying) return;
      
      try {
        const currentTime = this.youtubePlayer.getCurrentTime() * 1000; // ミリ秒に変換
        this.updateSubtitles(currentTime);
      } catch (error) {
        console.error('字幕同期エラー:', error);
      }
    }, 100); // 100msごとに同期チェック
  }

  /**
   * 字幕表示の更新
   */
  updateSubtitles(currentTime) {
    if (this.isPaused || this.isFirstInteraction) return;
    
    for (let i = this.currentSubtitleIndex; i < this.subtitlesData.length; i++) {
      const subtitle = this.subtitlesData[i];
      
      if (subtitle.time <= currentTime && 
          subtitle.time > currentTime - 200 && 
          !this.displayedLyrics.has(subtitle.time)) {
        
        this.displayLyric(subtitle.text);
        this.displayedLyrics.add(subtitle.time);
        
        // 一定時間後に削除フラグをクリア
        setTimeout(() => {
          this.displayedLyrics.delete(subtitle.time);
        }, Math.max(3000, subtitle.endTime - subtitle.time));
        
        this.currentSubtitleIndex = i + 1;
      } else if (subtitle.time > currentTime + 1000) {
        // 未来の字幕まで到達したら処理を停止
        break;
      }
    }
  }

  /**
   * ゲームの指示テキストを更新
   */
  updateInstructions() {
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) return;

    let text = '';
    if (this.isMobile) {
      text = '歌詞の文字をタップしてポイントを獲得しよう！';
    } else {
      switch (this.currentMode) {
        case 'cursor':
          text = '歌詞の文字にマウスを当ててポイントを獲得しよう！';
          break;
        case 'hand':
          text = 'カメラに手を映して歌詞に触れてポイントを獲得しよう！';
          break;
        case 'body':
          text = 'カメラに全身を映して歌詞に触れてポイントを獲得しよう！';
          break;
      }
    }
    instructionsEl.textContent = text;
  }

  /**
   * カメラの初期化
   */
  initCamera() {
    if (this.isMobile) {
      console.log('モバイルデバイスが検出されました。カメラ機能は無効化されます。');
      return;
    }
    
    // カメラとMediaPipeの初期化ロジック（簡略化）
    console.log('カメラ機能の初期化（簡略版）');
  }

  /**
   * ゲームイベントの設定
   */
  setupEvents() {
    let lastTime = 0, lastX = 0, lastY = 0;
    let touched = false;
    
    // マウス/タッチの移動処理
    const handleMove = (x, y, isTouch) => {
      const now = Date.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      const dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx*dx + dy*dy) >= 3) {
        lastX = x; lastY = y;
        this.lastMousePos = { x, y };
        this.checkLyrics(x, y, isTouch ? 45 : 35);
      }
    };
    
    // マウス移動イベント
    this.gamecontainer.addEventListener('mousemove', e => {
      if (!touched && this.currentMode === 'cursor') handleMove(e.clientX, e.clientY, false);
    });
    
    // タッチイベント
    this.gamecontainer.addEventListener('touchstart', e => {
      touched = true;
      if (e.touches && e.touches[0] && this.currentMode === 'cursor') {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, {passive: true});
    
    this.gamecontainer.addEventListener('touchmove', e => {
      if (!this.isFirstInteraction && e.touches && e.touches[0] && this.currentMode === 'cursor') {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, {passive: false});
    
    this.gamecontainer.addEventListener('touchend', () => {
      setTimeout(() => { touched = false; }, 300);
    }, {passive: true});
    
    // クリック/タップイベント
    this.gamecontainer.addEventListener('click', e => {
      if (this.currentMode !== 'cursor') return;
      this.checkLyrics(e.clientX, e.clientY, 35);
    });
    
    // 再生/一時停止ボタン
    const handleButtonClick = (event) => {
      if (event) event.preventDefault();
      if (!this.apiLoaded) return;
      
      if (this.isFirstInteraction) {
        if (this.currentMode === 'body') {
          this.isFirstInteraction = false;
          this.countdownOverlay.classList.remove('hidden');
          this.countdownText.textContent = "全身が映るように調整してください";
          return;
        }
        this.playMusic();
        return;
      }
      
      this.togglePlay();
    };
    
    this.playpause.addEventListener('click', handleButtonClick);
    this.playpause.addEventListener('touchend', handleButtonClick, {passive: false});
    
    // リスタートボタン
    const handleRestartClick = (event) => {
      if (event) event.preventDefault();
      if (!this.apiLoaded) return;
      this.restartGame();
    };
    
    this.restart.addEventListener('click', handleRestartClick);
    this.restart.addEventListener('touchend', handleRestartClick, {passive: false});
  }

  /**
   * 音楽再生開始
   */
  async playMusic() {
    if (this._operationInProgress) return;
    this._operationInProgress = true;

    if (this.currentMode === 'body' && !this.bodyDetectionReady) {
      this.countdownOverlay.classList.remove('hidden');
      this.countdownText.textContent = "全身が映るように調整してください";
      this._operationInProgress = false;
      return;
    }
    
    try {
      this.isPaused = false;
      this.playpause.textContent = '一時停止';
      this.isFirstInteraction = false;
      
      if (this.youtubePlayer && this.isPlayerInit) {
        try {
          this.youtubePlayer.playVideo();
        } catch (e) {
          console.error("YouTube player error:", e);
          this.fallbackPlayback();
        }
      } else {
        this.fallbackPlayback();
      }
      
      // ランダムテキスト表示開始
      if (!this.randomTextInterval) {
        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
      }
      
      // ロード表示を非表示
      if (this.loading) {
        this.loading.style.opacity = '0';
        setTimeout(() => {
          if (this.loading && this.loading.parentNode) {
            this.loading.parentNode.removeChild(this.loading);
          }
        }, 1000);
      }
      
    } finally {
      setTimeout(() => this._operationInProgress = false, 1000);
    }
  }

  /**
   * フォールバック再生モード
   */
  fallbackPlayback() {
    this.startTime = Date.now();
    this.startFallbackSubtitleSync();
    
    // フォールバック用のタイマー設定
    setTimeout(() => {
      if (!this.resultsDisplayed) {
        this.showResults();
      }
    }, 60000); // 60秒後に結果表示
  }

  /**
   * フォールバック字幕同期
   */
  startFallbackSubtitleSync() {
    if (this.subtitleSyncInterval) {
      clearInterval(this.subtitleSyncInterval);
    }
    
    this.currentSubtitleIndex = 0;
    this.displayedLyrics.clear();
    
    this.subtitleSyncInterval = setInterval(() => {
      if (this.isPaused || this.isFirstInteraction) return;
      
      const currentTime = Date.now() - this.startTime;
      this.updateSubtitles(currentTime);
    }, 100);
  }

  /**
   * 再生/一時停止の切り替え
   */
  async togglePlay() {
    if (this._operationInProgress) return;
    this._operationInProgress = true;
    
    try {
      this.isPaused = !this.isPaused;
      this.playpause.textContent = this.isPaused ? '再生' : '一時停止';
      
      if (this.youtubePlayer) {
        if (this.isPaused) {
          this.youtubePlayer.pauseVideo();
        } else {
          this.youtubePlayer.playVideo();
        }
      }
      
      if (this.isPaused) {
        clearInterval(this.randomTextInterval);
        this.randomTextInterval = null;
      } else {
        if (!this.randomTextInterval) {
          this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        }
      }
    } finally {
      setTimeout(() => this._operationInProgress = false, 1000);
    }
  }

  /**
   * ゲームのリスタート
   */
  async restartGame() {
    if (this._operationInProgress) return;
    this._operationInProgress = true;
    
    try {
      // 各種タイマーをクリア
      if (this.subtitleSyncInterval) {
        clearInterval(this.subtitleSyncInterval);
        this.subtitleSyncInterval = null;
      }
      
      // スコアと状態のリセット
      this.score = this.combo = this.currentSubtitleIndex = 0;
      this.startTime = Date.now();
      this.isPaused = false;
      this.scoreEl.textContent = '0';
      this.comboEl.textContent = `コンボ: 0`;
      this.resultsDisplayed = false;
      
      // 結果画面を非表示
      const resultsScreen = document.getElementById('results-screen');
      if (resultsScreen) {
        resultsScreen.classList.remove('show');
        resultsScreen.classList.add('hidden');
      }
      
      // 表示中の歌詞を削除
      document.querySelectorAll('.lyric-bubble').forEach(l => l.remove());
      this.displayedLyrics.clear();
      
      // YouTube Playerをリスタート
      if (this.youtubePlayer) {
        this.youtubePlayer.seekTo(0);
        this.youtubePlayer.playVideo();
      } else {
        this.fallbackPlayback();
      }
      
      this.playpause.textContent = '一時停止';
    } finally {
      setTimeout(() => this._operationInProgress = false, 1500);
    }
  }

  /**
   * ゲームの初期化
   */
  initGame() {
    this.visuals = new LiveStageVisuals(this.gamecontainer);
    this.createAudiencePenlights();
    
    // 観客のランダムテキスト
    this.randomTexts = ["ミク！", "かわいい！", "最高！", "39！", "イェーイ！"];
    this.randomTextInterval = null;
    
    // コンボリセットタイマー
    this.comboResetTimer = setInterval(() => {
      if (Date.now() - (this.lastScoreTime || 0) > 30000 && this.combo > 0) {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
    }, 1000);
  }

  /**
   * 観客のペンライト作成
   */
  createAudiencePenlights() {
    const audienceArea = document.getElementById('audience-area');
    if (!audienceArea) return;

    const penlightColors = ['#ff4b81', '#4bffff', '#4bff4b', '#ffff4b', '#ff4bff'];
    const numPenlights = 50;

    for (let i = 0; i < numPenlights; i++) {
        const penlight = document.createElement('div');
        penlight.className = 'absolute w-1 h-8 rounded-full';
        penlight.style.backgroundColor = penlightColors[Math.floor(Math.random() * penlightColors.length)];
        penlight.style.left = `${Math.random() * 100}%`;
        penlight.style.bottom = `${Math.random() * 60}%`;
        penlight.style.transformOrigin = 'bottom center';
        penlight.style.animation = `sway ${2 + Math.random() * 2}s ease-in-out infinite alternate`;
        audienceArea.appendChild(penlight);
    }

    // アニメーション追加
    if (document.styleSheets.length > 0) {
      try {
        const styleSheet = document.styleSheets[0];
        const keyframes = `@keyframes sway {
            0% { transform: rotate(-15deg); }
            100% { transform: rotate(15deg); }
        }`;
        styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
      } catch (e) {
        // アニメーション追加に失敗しても続行
      }
    }
  }

  /**
   * ランダムテキスト（観客の応援）を作成
   */
  createRandomText() {
    const randomText = document.createElement('div');
    randomText.className = 'random-text';
    randomText.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
    
    randomText.style.position = 'absolute';
    randomText.style.left = `${Math.random() * 80 + 10}%`;
    randomText.style.bottom = `${Math.random() * 20 + 5}%`;
    randomText.style.color = '#39C5BB';
    randomText.style.fontSize = '18px';
    randomText.style.fontWeight = 'bold';
    randomText.style.textShadow = '0 0 10px rgba(57, 197, 187, 0.8)';
    randomText.style.zIndex = '25';
    randomText.style.pointerEvents = 'none';
    randomText.style.transition = 'opacity 1s ease';
    
    this.gamecontainer.appendChild(randomText);
    
    setTimeout(() => {
      randomText.style.opacity = '0';
      setTimeout(() => randomText.remove(), 1000);
    }, 3000);
  }

  /**
   * 歌詞バブルの表示
   */
  displayLyric(text) {
    if (!text) return;

    // 重複チェック
    const existingBubbles = document.querySelectorAll('.lyric-bubble');
    for (let bubble of existingBubbles) {
      if (bubble.textContent === text) return;
    }

    const bubble = document.createElement('div');
    bubble.className = 'lyric-bubble';
    bubble.textContent = text;
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    
    // 画面サイズに応じた位置調整
    const screenWidth = window.innerWidth;
    const isSmallScreen = screenWidth <= 768;
    
    let x, y, fontSize;
    
    if (isSmallScreen) {
      x = screenWidth * 0.15 + Math.random() * (screenWidth * 0.7);
      y = window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55);
      fontSize = screenWidth <= 480 ? '18px' : '22px';
    } else {
      x = 100 + Math.random() * (screenWidth - 300);
      y = window.innerHeight - 300 - Math.random() * 100;
      fontSize = '48px';
    }
    
    bubble.style.position = 'absolute';
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.color = '#39C5BB';
    bubble.style.fontSize = fontSize;
    bubble.style.fontWeight = 'bold';
    bubble.style.textShadow = '0 0 10px rgba(57, 197, 187, 0.8)';
    bubble.style.userSelect = 'none';
    bubble.style.zIndex = '20';
    bubble.style.transition = 'transform 0.2s, color 0.2s';
    bubble.style.padding = '8px 15px';
    bubble.style.minWidth = '40px';
    bubble.style.minHeight = '40px';
    bubble.style.display = 'flex';
    bubble.style.alignItems = 'center';
    bubble.style.justifyContent = 'center';
    
    // イベントリスナー
    bubble.addEventListener('mouseenter', () => this.clickLyric(bubble));
    bubble.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.clickLyric(bubble);
    }, {passive: false});
    
    this.gamecontainer.appendChild(bubble);
    
    // 8秒後に削除
    setTimeout(() => {
      if (bubble.style.pointerEvents !== 'none') {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
      bubble.remove();
    }, 8000);

    // 鑑賞用歌詞も表示
    this.displayViewerLyric(text, bubble);
  }

  /**
   * 鑑賞用歌詞の表示
   */
  displayViewerLyric(text, gameBubble) {
    if (this.displayedViewerLyrics.has(text)) return;

    const viewerChar = document.createElement('span');
    viewerChar.className = 'viewer-lyric-char';
    viewerChar.textContent = text;
    viewerChar.style.opacity = '0';
    this.viewerLyricsContainer.appendChild(viewerChar);

    setTimeout(() => {
      viewerChar.style.opacity = '1';
      viewerChar.style.transform = 'translateY(0)';
    }, 50);

    this.displayedViewerLyrics.set(text, {
      element: viewerChar,
      gameBubble: gameBubble
    });

    setTimeout(() => {
      viewerChar.style.opacity = '0';
      setTimeout(() => {
        if (viewerChar.parentNode) {
          viewerChar.parentNode.removeChild(viewerChar);
        }
        this.displayedViewerLyrics.delete(text);
      }, 1000);
    }, 8000);
  }

  /**
   * 歌詞との当たり判定
   */
  checkLyrics(x, y, radius) {
    if (this.isFirstInteraction) return false;
    
    const lyrics = document.querySelectorAll('.lyric-bubble');
    
    for (const el of lyrics) {
      if (el.style.pointerEvents === 'none') continue;
      
      const rect = el.getBoundingClientRect();
      const elX = rect.left + rect.width / 2;
      const elY = rect.top + rect.height / 2;
      
      const dx = x - elX, dy = y - elY;
      const hitRadius = radius + Math.max(rect.width, rect.height) / 2;
      
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
        this.clickLyric(el);
        this.createHitEffect(elX, elY);
      }
    }
  }

  /**
   * 歌詞クリック処理
   */
  clickLyric(element) {
    if (element.style.pointerEvents === 'none') return;
    
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = 100 * (Math.floor(this.combo / 5) + 1);
    this.score += points;
    
    this.scoreEl.textContent = this.score;
    this.comboEl.textContent = `コンボ: ${this.combo}`;
    
    element.style.color = '#FF69B4';
    this.createClickEffect(element);
    element.style.pointerEvents = 'none';
    
    setTimeout(() => element.style.opacity = '0', 100);
    this.lastScoreTime = Date.now();

    // 鑑賞用歌詞もハイライト
    const text = element.textContent;
    const viewerInfo = this.displayedViewerLyrics.get(text);
    if (viewerInfo && viewerInfo.element) {
      viewerInfo.element.classList.add('highlighted');
    }
  }

  /**
   * クリックエフェクトの作成
   */
  createClickEffect(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // パーティクル生成
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = 10 + Math.random() * 15;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.position = 'absolute';
      particle.style.left = `${x - size/2 + (Math.random() - 0.5) * 30}px`;
      particle.style.top = `${y - size/2 + (Math.random() - 0.5) * 30}px`;
      particle.style.backgroundColor = '#39C5BB';
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '30';
      particle.style.animation = 'explode 0.8s forwards';
      this.gamecontainer.appendChild(particle);
      
      setTimeout(() => particle.remove(), 800);
    }
    
    // スコア表示
    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'lyric-bubble';
    pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;
    pointDisplay.style.position = 'absolute';
    pointDisplay.style.left = `${x}px`;
    pointDisplay.style.top = `${y}px`;
    pointDisplay.style.color = '#FFFF00';
    pointDisplay.style.pointerEvents = 'none';
    pointDisplay.style.fontSize = '24px';
    pointDisplay.style.fontWeight = 'bold';
    pointDisplay.style.zIndex = '25';
    
    this.gamecontainer.appendChild(pointDisplay);
    
    // アニメーション
    const animate = () => {
      const top = parseFloat(pointDisplay.style.top);
      pointDisplay.style.top = `${top - 1}px`;
      pointDisplay.style.opacity = parseFloat(pointDisplay.style.opacity || 1) - 0.02;
      
      if (parseFloat(pointDisplay.style.opacity) > 0) {
        requestAnimationFrame(animate);
      } else {
        pointDisplay.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * ヒットエフェクトの作成
   */
  createHitEffect(x, y) {
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    ripple.style.width = '40px';
    ripple.style.height = '40px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '2px solid #39C5BB';
    ripple.style.animation = 'ripple 0.5s ease-out forwards';
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '30';
    
    this.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  /**
   * 曲終了時の処理
   */
  onSongEnd() {
    console.log('曲が終了しました');
    if (!this.resultsDisplayed) {
      this.showResults();
    }
  }

  /**
   * リザルト画面の表示
   */
  showResults() {
    if (this.resultsDisplayed) {
      console.log("すでに結果画面が表示されています");
      return;
    }
    
    console.log("結果画面を表示します");
    this.resultsDisplayed = true;
    
    // プレーヤー停止
    if (this.youtubePlayer) {
      try {
        this.youtubePlayer.pauseVideo();
      } catch (e) {
        console.error("YouTube player pause error:", e);
      }
    }
    
    // 各種タイマークリア
    if (this.subtitleSyncInterval) {
      clearInterval(this.subtitleSyncInterval);
      this.subtitleSyncInterval = null;
    }
    
    this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
    
    // ランク判定
    let rank = 'C';
    if (this.score >= 10000) rank = 'S';
    else if (this.score >= 8000) rank = 'A';
    else if (this.score >= 6000) rank = 'B';
    
    // 結果画面表示
    const resultsScreen = document.getElementById('results-screen');
    if (!resultsScreen) {
      console.error("結果画面のDOM要素が見つかりません");
      return;
    }
    
    const finalScoreDisplay = document.getElementById('final-score-display');
    const finalComboDisplay = document.getElementById('final-combo-display');
    const rankDisplay = document.getElementById('rank-display');
    
    if (finalScoreDisplay) finalScoreDisplay.textContent = this.score;
    if (finalComboDisplay) finalComboDisplay.textContent = `最大コンボ: ${this.maxCombo}`;
    if (rankDisplay) rankDisplay.textContent = `ランク: ${rank}`;
    
    resultsScreen.classList.remove('hidden');
    resultsScreen.style.display = 'flex';
    
    setTimeout(() => {
      resultsScreen.classList.add('show');
      console.log("リザルト画面のshowクラスを追加しました");
    }, 100);
    
    this.setupResultsButtons();
  }

  /**
   * リザルト画面のボタン設定
   */
  setupResultsButtons() {
    const backToTitle = document.getElementById('back-to-title');
    const replaySong = document.getElementById('replay-song');
    
    const addEvents = (element, handler) => {
      if (!element) return;
      element.addEventListener('click', handler);
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        handler();
      }, {passive: false});
    };
    
    addEvents(backToTitle, () => {
      window.location.href = 'index.html';
    });
    
    addEvents(replaySong, () => {
      const resultsScreen = document.getElementById('results-screen');
      if (resultsScreen) {
        resultsScreen.classList.remove('show');
        setTimeout(() => {
          resultsScreen.classList.add('hidden');
          this.restartGame();
        }, 1000);
      } else {
        this.restartGame();
      }
    });
  }

  /**
   * クリーンアップ
   */
  cleanup() {
    if (this.randomTextInterval) clearInterval(this.randomTextInterval);
    if (this.comboResetTimer) clearInterval(this.comboResetTimer);
    if (this.subtitleSyncInterval) clearInterval(this.subtitleSyncInterval);
    
    this.mouseTrail.forEach(item => {
      if (item.element?.parentNode) item.element.remove();
    });
    this.mouseTrail = [];
    
    if (this.youtubePlayer) {
      try { 
        this.youtubePlayer.destroy(); 
      } catch (e) {
        console.error('YouTube player cleanup error:', e);
      }
    }

    this.viewerLyricsContainer.innerHTML = '';
    this.displayedViewerLyrics.clear();
  }
}

// LiveStageVisualsクラス（簡略版）
class LiveStageVisuals {
  constructor(container) {
    this.container = container;
    console.log('LiveStageVisuals initialized');
  }

  updatePlayerAvatar(landmarks) {
    // 簡略化された実装
  }

  updateHandLandmarks(handsResults) {
    // 簡略化された実装
  }
}

// MediaPipe接続の定数（簡略版）
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28]
];

// ページ読み込み完了後にGameManagerを初期化
window.addEventListener('load', () => {
  // game-loader.jsで初期化されるのを待つ
  console.log('script.js loaded, waiting for game-loader.js initialization');
});

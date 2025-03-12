/**
 * ボイスアイドル・ミュージックゲーム
 * 
 * このゲームは歌詞が画面上に表示され、プレイヤーがそれらをクリックまたはスワイプして
 * ポイントを獲得する音楽リズムゲームです。TextAlivePlayerを使用して歌詞と音楽を同期させています。
 * 
 * 最適化ポイント:
 * - デバイス性能に応じた処理の調整
 * - オブジェクトプールとメモリ管理の強化
 * - イベント処理の統合とスロットリング
 * - 視覚エフェクトの条件付き減量
 * - 数学計算の簡略化
 */
class GameManager {
    /**
     * ゲームマネージャーの初期化
     * 各コンポーネントの初期化と設定を行う
     */
    constructor() {
        // API情報の初期化 - window.songConfig から取得するか、デフォルト値を使用
        this.apiToken = window.songConfig?.apiToken || "wifkp8ak1TEhQ8pI";
        this.songUrl = window.songConfig?.songUrl || "https://piapro.jp/t/hZ35/20240130103028";
        
        // 各種初期化処理を実行
        this.initGameState();         // ゲーム状態変数の初期化
        this.setupViewportHandling(); // ブラウザUI対応のビューポート処理追加
        this.initDOMElements();       // DOM要素の参照取得
        this.initLyricsData();        // 歌詞データの初期化
        this.initRandomTexts();       // ランダムテキストの準備
        this.setupEvents();           // イベントリスナーの設定
        this.createLightEffects();    // 光エフェクトの作成
        this.initGame();              // ゲーム初期化
        this.startComboResetTimer();  // コンボリセットタイマー開始
        this.adjustUIForDevice();     // デバイス適応UI設定
        this.initTextAlivePlayer();   // TextAliveプレーヤーの初期化
    }

    /**
     * ゲーム状態の初期化
     * スコア、コンボ、表示状態などのゲームの状態変数を設定
     * パフォーマンス向上: デバイス性能に応じて変数を最適化
     */
    initGameState() {
        // 基本状態変数（短縮初期化構文で最適化）
        this.score = this.combo = this.currentLyricIndex = this.maxCombo = 0;
        this.startTime = Date.now();
        this.isPaused = this.isPlayerInitialized = this.clickHandled = this.resultsDisplayed = false;
        this.player = null;
        
        // 表示データ管理用コレクション
        this.activeCharacters = new Set();           // アクティブな文字のセット
        this.displayedLyricsTimestamps = new Set();  // 表示済み歌詞のタイムスタンプ
        
        // パフォーマンス最適化用の変数
        this.frameCount = this.lastFrameTime = 0;
        this.fps = 60;
        this.throttleFrames = this.detectPerformance();  // デバイス性能に基づいたフレーム間隔を設定
        this.isProcessingPlayback = false;               // 再生処理中フラグ
        this.animationFrameId = null;                    // アニメーションフレームID
        
        // マウス軌跡エフェクト用変数
        this.mouseTrail = [];                            // マウス軌跡のパーティクル配列
        this.maxTrailLength = this.isMobileDevice() ? 5 : 10;  // モバイルでは軌跡を短く
        this.lastMousePosition = { x: 0, y: 0 };         // 前回のマウス位置
        
        // オブジェクトプール（メモリ効率化）
        const poolSize = this.isMobileDevice() ? 15 : 30;  // モバイルではプールサイズを小さく
        this.maxPoolSize = poolSize;
        this.particlePool = [];       // クリックエフェクト用パーティクルプール
        this.lyricBubblePool = [];    // 歌詞バブル用オブジェクトプール
        this.randomTextPool = [];     // ランダムテキスト用オブジェクトプール
        this.trailParticlePool = [];  // 軌跡パーティクル用プール
    }

    /**
 * ブラウザUIに対応するためのビューポート処理
 * モバイルブラウザにおけるアドレスバーなどの影響を調整
 */
setupViewportHandling() {
    // ビューポート高さを計算して設定
    const setViewportProperty = () => {
        // 実際のビューポート高さを取得
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // iOS Safariのツールバー調整
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            // 縦向きの場合
            if (window.innerHeight < window.innerWidth) {
                document.documentElement.style.setProperty('--browser-footer-height', '80px');
            } else {
                document.documentElement.style.setProperty('--browser-footer-height', '120px');
            }
        }
    };
    
    // 初期設定
    setViewportProperty();
    
    // リサイズとスクロール時に再計算
    window.addEventListener('resize', () => {
        setTimeout(setViewportProperty, 100);
    });
    
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportProperty, 100);
    });
    
    // スクロール状態検出（アドレスバーの表示/非表示）
    let lastScrollPosition = window.scrollY;
    window.addEventListener('scroll', () => {
        // スクロール方向検出
        const currentScrollPosition = window.scrollY;
        const isScrollingDown = currentScrollPosition > lastScrollPosition;
        
        // スクロールダウンでアドレスバーが隠れる場合
        if (isScrollingDown && currentScrollPosition > 50) {
            document.documentElement.style.setProperty('--browser-header-height', '0px');
        } else if (!isScrollingDown && currentScrollPosition < 20) {
            // スクロールアップでアドレスバーが表示される場合
            document.documentElement.style.setProperty('--browser-header-height', '20px');
        }
        
        lastScrollPosition = currentScrollPosition;
    });
    
    // iOS Safariのフルスクリーンモード対応
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
}

    /**
     * デバイス性能を検出してフレームスキップ数を決定
     * 低性能デバイスでは処理頻度を下げてパフォーマンスを確保
     * @returns {number} フレームスキップ数
     */
    detectPerformance() {
        return navigator.hardwareConcurrency <= 4 || this.isMobileDevice() ? 4 : 3;
    }

    /**
     * DOM要素の初期化
     * ゲームで使用するDOM要素への参照を取得
     */
    initDOMElements() {
        this.gameContainer = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.comboElement = document.getElementById('combo');
        this.playPauseBtn = document.getElementById('play-pause');
        this.restartBtn = document.getElementById('restart');
        this.loading = document.getElementById('loading');
        this.stageElement = document.getElementById('stage');
    }

    /**
     * イベントリスナーの設定
     * ユーザー入力とシステムイベントの処理を設定
     * 最適化: 重複するイベント処理を統合
     */
    setupEvents() {
        // イベントリスナーを集約して管理
        this.setupUserInteractions();  // ユーザー入力処理
        this.setupControls();          // ゲームコントロール処理
        
        // リサイズ処理（デバウンス最適化）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);  // 連続リサイズ中は処理をスキップ
            resizeTimeout = setTimeout(() => {
                // リサイズ完了後に観客のみ再配置（軽量化）
                document.querySelectorAll('.audience').forEach(a => a.remove());
                this.createAudience();
            }, 250);
        });
    }

    /**
     * ユーザー入力イベントの設定
     * マウス・タッチ操作の処理を効率的に設定
     * 最適化: マウスとタッチのロジックを統合、重複処理を削減
     */
    setupUserInteractions() {
        const throttleDelay = 16;  // 約60FPSに対応（16ms）
        let lastEventTime = 0;
        let lastX = 0, lastY = 0;
        
        // マウス/タッチ移動処理を統合（コード重複を防止）
        const handleMove = (x, y, isTouch) => {
            const now = Date.now();
            if (now - lastEventTime < throttleDelay) return;  // スロットリング
            
            lastEventTime = now;
            const dx = x - lastX, dy = y - lastY;
            const moved = Math.sqrt(dx*dx + dy*dy) >= 5;  // 5px以上の移動があった場合のみ処理
            
            if (moved) {
                lastX = x; lastY = y;
                this.lastMousePosition = { x, y };
                
                // パフォーマンス最適化: フレームを間引いてエフェクト生成
                if (this.frameCount % 2 === 0) {
                    this.createTrailParticle(x, y);  // 軌跡パーティクル作成
                    if (Math.random() < (isTouch ? 0.03 : 0.01)) {  // タッチでは頻度高め
                        this.createShooting(x, y, dx, dy);  // ランダムに流れ星効果
                    }
                }
                
                // タッチ操作では検出範囲を広げる
                this.checkLyricsInArea(x, y, isTouch ? 45 : 35);
            }
        };
        
        // マウスイベント
        this.gameContainer.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY, false);
        });
        
        // タッチイベント（パフォーマンス最適化）
        this.gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();  // スクロール防止
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY, true);
        }, { passive: false });
        
        // タッチ開始処理
        this.gameContainer.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            lastX = touch.clientX; lastY = touch.clientY;
            this.checkLyricsInArea(touch.clientX, touch.clientY, 35);
        });
        
        // クリック処理
        this.gameContainer.addEventListener('click', (e) => {
            const x = e.clientX, y = e.clientY;
            this.createTapEffect?.(x, y);  // オプショナルチェーン（メソッドが存在する場合のみ実行）
            this.checkLyricsInArea(x, y, 35);
            
            // 確率ベースでエフェクト追加（軽量化）
            if (Math.random() < 0.2) {
                const angle = Math.random() * Math.PI * 2;
                this.createShooting(x, y, Math.cos(angle) * 5, Math.sin(angle) * 5);
            }
        });
    }

    /**
     * ゲームコントロールの設定
     * 再生・停止・リスタートなどのボタン操作を設定
     */
    setupControls() {
        this.playPauseBtn.addEventListener('click', this.handlePlayPause.bind(this));
        this.restartBtn.addEventListener('click', this.handleRestart.bind(this));
        document.body.addEventListener('click', this.handleBodyClick.bind(this));
        
        if (this.loading) {
            this.loading.addEventListener('click', this.handleLoadingClick.bind(this));
        }
    }

    /**
     * 再生/一時停止ボタンのクリック処理
     * 最適化: エラー処理の改善、処理の非同期化
     */
    async handlePlayPause() {
        if (this.isProcessingPlayback) return;  // 処理中の連打防止
        this.isProcessingPlayback = true;
        
        try {
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                // 停止処理
                this.playPauseBtn.textContent = '再生';
                
                if (this.player && this.isPlayerInitialized && this.player.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 100));  // APIの準備待ち
                    await this.player.requestPause().catch(e => {
                        if (e.name !== 'AbortError') console.error("Player pause error:", e);
                    });
                }
                
                // ランダムテキスト表示を停止
                if (this.randomTextInterval) {
                    clearInterval(this.randomTextInterval);
                    this.randomTextInterval = null;
                }
            } else {
                // 再生処理
                this.playPauseBtn.textContent = '一時停止';
                
                if (this.player && this.isPlayerInitialized && !this.player.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 100));  // APIの準備待ち
                    await this.player.requestPlay().catch(e => {
                        if (e.name !== 'AbortError') {
                            this.fallbackToBasicMode();  // 代替モードに切り替え
                        }
                    });
                } else if (!this.player || !this.isPlayerInitialized) {
                    // 代替モードでの再生位置設定
                    this.startTime = Date.now() - (this.lyricsData[this.currentLyricIndex]?.time || 0);
                }
                
                // ランダムテキスト表示を開始
                if (!this.randomTextInterval) {
                    this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
                }
            }
        } finally {
            // 連打防止タイマー
            setTimeout(() => this.isProcessingPlayback = false, 800);
        }
    }
    
    /**
     * リスタートボタンのクリック処理
     * ゲームを初期状態に戻して再開
     * 最適化: エラー処理の改善、非同期処理のチェーン化
     */
    async handleRestart() {
        if (this.isProcessingPlayback) return;  // 処理中の連打防止
        this.isProcessingPlayback = true;
        
        try {
            this.restartGame();  // ゲーム状態をリセット
            
            if (this.player && this.isPlayerInitialized) {
                try {
                    if (this.player.isPlaying) await this.player.requestPause();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.player.requestStop();
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // 再生リクエストとエラーリカバリの改善
                    await this.player.requestPlay().catch(e => {
                        if (e.name === 'AbortError') {
                            // AbortErrorの場合は少し待ってリトライ
                            return new Promise(resolve => setTimeout(resolve, 500))
                                .then(() => this.player.requestPlay());
                        }
                        this.fallbackToBasicMode();
                    });
                } catch (e) {
                    this.fallbackToBasicMode();
                }
            } else {
                // 代替モードでのリスタート
                this.isPaused = false;
                this.currentLyricIndex = 0;
                this.startTime = Date.now();
                this.playPauseBtn.textContent = '一時停止';
            }
        } finally {
            // 連打防止タイマー（リスタートは長めに設定）
            setTimeout(() => this.isProcessingPlayback = false, 1500);
        }
    }
    
    /**
     * ゲーム画面のクリック処理（初回再生用）
     * 画面クリックで音楽再生を開始する
     */
    async handleBodyClick() {
        if (!this.player || !this.isPlayerInitialized) return;
        
        // クリック連打防止
        const now = Date.now();
        if (now - (this.lastClickTime || 0) < 1000) return;
        this.lastClickTime = now;
        
        // 停止中なら再生開始
        if (this.player.isPlaying === false && !this.clickHandled) {
            this.clickHandled = true;
            try {
                await this.player.requestPlay();
                this.isPaused = false;
                this.playPauseBtn.textContent = '一時停止';
            } catch (e) {
                this.fallbackToBasicMode();
            }
            setTimeout(() => { this.clickHandled = false; }, 1500);  // 連打防止
        }
    }
    
    /**
     * ローディング画面のクリック処理
     * ローディング画面をクリックして再生開始
     */
    async handleLoadingClick() {
        if (this.isProcessingPlayback) return;
        this.isProcessingPlayback = true;
        
        try {
            if (this.player && this.isPlayerInitialized && !this.player.isPlaying) {
                await this.player.requestPlay().catch(() => this.fallbackToBasicMode());
                this.isPaused = false;
                this.playPauseBtn.textContent = '一時停止';
            } else {
                // 代替モードでの開始
                this.isPaused = false;
                this.startTime = Date.now();
                this.playPauseBtn.textContent = '一時停止';
            }
        } finally {
            setTimeout(() => this.isProcessingPlayback = false, 1000);  // 連打防止
        }
    }

    /**
     * ゲームの初期化処理
     * 観客生成、タイマー開始などの初期設定
     */
    initGame() {
        this.createAudience();  // 観客を生成
        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        this.startLyricsTimer();  // 歌詞表示タイマーを開始
    }

    /**
     * ランダムテキストのデータを初期化
     * 観客が表示するコールやリアクションのテキスト
     */
    initRandomTexts() {
        this.randomTexts = ["ミク！", "かわいい！", "最高！", "いくよー！", "がんばれ！", 
                           "39！", "イェーイ！", "キャー！", "すごい！", "大好き！",
                           "バンザイ！", "ワーオ！", "さいこー！", "クール！", "すてき！"];
        this.randomTextInterval = null;
    }
    
    /**
     * 歌詞データの初期化
     * APIからのデータが取得できない場合のフォールバックデータも準備
     */
    initLyricsData() {
        this.lyricsData = [];  // API経由で取得する予定の実際の歌詞データ
        this.fallbackLyricsData = [  // APIが失敗した場合のフォールバックデータ
            { time: 1000, text: "マ" }, { time: 1500, text: "ジ" },
            { time: 2000, text: "カ" }, { time: 2500, text: "ル" },
            { time: 3000, text: "ミ" }, { time: 3500, text: "ラ" },
            { time: 4000, text: "イ" }, { time: 5000, text: "初" },
            { time: 5500, text: "音" }, { time: 6000, text: "ミ" },
            { time: 6500, text: "ク" }
        ];
    }

    /**
     * デバイスタイプに応じてUIを調整
     * モバイルデバイスの場合は操作方法を変更
     */
    adjustUIForDevice() {
        const isMobile = this.isMobileDevice();
        
        if (isMobile) {
            // モバイル向けUIの調整
            const controls = document.getElementById('controls');
            if (controls) controls.classList.add('mobile-controls');
            
            const instructions = document.getElementById('instructions');
            if (instructions) instructions.textContent = '歌詞の文字をタップまたはスワイプしてポイントを獲得しよう！';
            
            // 縦向きの場合は警告を表示（オプショナルチェーン使用）
            if (window.innerHeight > window.innerWidth) this.showOrientationWarning?.();
            this.showMobileHint();  // モバイル操作のヒントを表示
        }
    }

    /**
     * ユーザーのデバイスがモバイルかどうかを判定
     * @returns {boolean} モバイルデバイスならtrue
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * モバイルデバイス向けの操作ヒントを表示
     */
    showMobileHint() {
        const mobileHint = document.createElement('div');
        mobileHint.className = 'mobile-hint';
        mobileHint.textContent = '👆 指でスワイプして歌詞をなぞろう！';
        this.gameContainer.appendChild(mobileHint);
        
        // 5秒後にヒントをフェードアウト
        setTimeout(() => {
            if (mobileHint.parentNode) {
                mobileHint.style.opacity = '0';
                setTimeout(() => mobileHint.remove(), 1000);
            }
        }, 5000);
    }

    /**
     * TextAlivePlayerを初期化
     * 歌詞と音楽の同期を行うAPIを使用
     * 最適化: エラー処理の強化、早期リターンによる処理削減
     */
    initTextAlivePlayer() {
        // TextAlive APIが利用できない場合は早期リターン
        if (typeof TextAliveApp === 'undefined') {
            if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
            this.fallbackToBasicMode();
            return;
        }
        
        // すでに初期化済みなら処理しない
        if (this.isPlayerInitialized) return;
        
        try {
            // プレーヤーインスタンスを作成
            this.player = new TextAliveApp.Player({
                app: { token: this.apiToken },
                mediaElement: document.createElement('audio')
            });
            document.body.appendChild(this.player.mediaElement);
            this.isPlayerInitialized = true;
            
            // イベントリスナーを設定
            this.player.addListener({
                // アプリ準備完了時
                onAppReady: (app) => {
                    if (app && !app.managed) {
                        try {
                            this.player.createFromSongUrl(this.songUrl);
                        } catch {
                            this.fallbackToBasicMode();
                        }
                    }
                },
                // 動画データ準備完了時
                onVideoReady: (video) => {
                    if (video && video.firstPhrase) this.updateLyricsFromVideo(video);
                    if (this.loading) this.loading.textContent = "準備完了！クリックして開始";
                },
                // 再生位置更新時
                onTimeUpdate: (position) => this.updateLyricsDisplay(position),
                // 再生開始時
                onPlay: () => {
                    this.isPaused = false;
                    this.playPauseBtn.textContent = '一時停止';
                    if (!this.randomTextInterval) {
                        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
                    }
                },
                // 一時停止時
                onPause: () => {
                    this.isPaused = true;
                    this.playPauseBtn.textContent = '再生';
                    clearInterval(this.randomTextInterval);
                    this.randomTextInterval = null;
                },
                // 停止時
                onStop: () => {
                    this.isPaused = true;
                    this.playPauseBtn.textContent = '再生';
                    this.restartGame();
                },
                // エラー発生時
                onError: () => this.fallbackToBasicMode()
            });
        } catch {
            this.fallbackToBasicMode();
        }
    }
    
    /**
     * API接続に失敗した場合の代替モードに切り替え
     * 内部でハードコードされた歌詞データを使用
     */
    fallbackToBasicMode() {
        this.isPlayerInitialized = false;
        this.player = null;
        
        if (this.loading) this.loading.textContent = "APIエラー。代替モードで起動中...";
        this.lyricsData = this.fallbackLyricsData;  // フォールバックデータを使用
        this.startLyricsTimer();  // 独自タイマーで歌詞表示を開始
    }
    
    /**
     * TextAliveから取得したビデオデータから歌詞情報を更新
     * @param {Object} video - TextAliveから取得したビデオデータ
     */
    updateLyricsFromVideo(video) {
        try {
            this.lyricsData = [];
            let currentPhrase = video.firstPhrase;
            
            // フレーズ、単語、文字の階層構造からすべての文字データを取得
            while (currentPhrase) {
                let currentWord = currentPhrase.firstWord;
                while (currentWord) {
                    let currentChar = currentWord.firstChar;
                    while (currentChar) {
                        this.lyricsData.push({
                            time: currentChar.startTime,  // 表示開始時間
                            text: currentChar.text        // 文字テキスト
                        });
                        currentChar = currentChar.next;
                    }
                    currentWord = currentWord.next;
                }
                currentPhrase = currentPhrase.next;
            }
            
            // 時間順にソート
            this.lyricsData.sort((a, b) => a.time - b.time);
        } catch {}  // エラー時は処理をスキップ（空のtry-catchで最適化）
    }
    
    /**
     * 現在の再生位置に応じて歌詞を表示
     * @param {number} position - 現在の再生位置（ミリ秒）
     * 最適化: フレームスキップによる処理頻度の調整
     */
    updateLyricsDisplay(position) {
        if (this.isPaused) return;
        if (!this.displayedLyrics) this.displayedLyrics = new Set();
        
        // パフォーマンス最適化：フレームをスキップ
        this.frameCount++;
        if (this.frameCount % this.throttleFrames !== 0) return;
        
        for (let i = 0; i < this.lyricsData.length; i++) {
            const lyric = this.lyricsData[i];
            // 現在の位置より少し前（500ms以内）の歌詞を表示
            if (lyric.time <= position && lyric.time > position - 500 && !this.displayedLyrics.has(lyric.time)) {
                this.displayLyricBubble(lyric.text);  // 歌詞バブルを表示
                this.displayedLyrics.add(lyric.time);
                // 10秒後に再表示できるようにする
                setTimeout(() => this.displayedLyrics.delete(lyric.time), 10000);
            }
        }
        
        // 曲終了チェック
        this.checkSongEnd(position);
    }
    
    /**
     * 歌詞表示用タイマーを開始
     * APIが使用できない場合のフォールバックモード用
     * 最適化: パフォーマンスのためにフレームスキップを実装
     */
    startLyricsTimer() {
        this.currentLyricIndex = 0;
        this.startTime = Date.now();
        this.displayedLyricsTimestamps = new Set();
        
        // 既存のアニメーションがあればキャンセル
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        const checkLyrics = () => {
            // プレーヤーが初期化済み、または一時停止中の場合はスキップ
            if ((this.isPlayerInitialized && this.player) || this.isPaused) {
                this.animationFrameId = requestAnimationFrame(checkLyrics);
                return;
            }
            
            // パフォーマンス最適化：フレームをスキップ
            this.frameCount++;
            if (this.frameCount % this.throttleFrames !== 0) {
                this.animationFrameId = requestAnimationFrame(checkLyrics);
                return;
            }
            
            const currentTime = Date.now() - this.startTime;
            let processedLyrics = 0;
            const maxProcessPerFrame = 3;  // 1フレームあたりの最大処理数
            
            // 現在の時間に表示すべき歌詞を処理
            while (this.currentLyricIndex < this.lyricsData.length && 
                   this.lyricsData[this.currentLyricIndex].time <= currentTime &&
                   processedLyrics < maxProcessPerFrame) {
                
                const lyric = this.lyricsData[this.currentLyricIndex];
                if (!this.displayedLyricsTimestamps.has(lyric.time)) {
                    this.displayLyricBubble(lyric.text);
                    this.displayedLyricsTimestamps.add(lyric.time);
                    
                    // 一定時間後に再表示可能に
                    setTimeout(() => {
                        this.displayedLyricsTimestamps.delete(lyric.time);
                    }, 8000);
                    
                    processedLyrics++;
                }
                
                this.currentLyricIndex++;
            }
            
            // すべての歌詞を表示したらループ
            if (this.currentLyricIndex >= this.lyricsData.length) {
                this.currentLyricIndex = 0;
                this.displayedLyricsTimestamps.clear();
                this.startTime = Date.now();
            }
            
            this.animationFrameId = requestAnimationFrame(checkLyrics);
        };
        
        this.animationFrameId = requestAnimationFrame(checkLyrics);
    }

    /**
     * 歌詞バブルを表示
     * @param {string} text - 表示する歌詞テキスト
     * 最適化: オブジェクトプールを利用してDOM生成コストを削減
     */
    displayLyricBubble(text) {
        if (!text) return;

        // 同じテキストが既に表示されている場合はスキップ
        const existingBubbles = document.querySelectorAll('.lyric-bubble');
        for (let bubble of existingBubbles) {
            if (bubble.textContent === text) return;
        }

        const isMobile = this.isMobileDevice();
        
        // 表示位置計算（デバイスに応じて調整）
        let baseX, baseY;
        if (isMobile) {
            // モバイル：画面幅の15%～85%の範囲（はみ出し防止）
            baseX = window.innerWidth * 0.15 + Math.random() * (window.innerWidth * 0.7);
            // モバイル：縦方向も広い範囲を使用
            baseY = window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55);
        } else {
            // PC：画面中央～下部のエリア
            baseX = 100 + Math.random() * (window.innerWidth - 300);
            baseY = window.innerHeight - 300 - Math.random() * 100;
        }

        // オブジェクトプールから再利用または新規作成
        let charBubble;
        if (this.lyricBubblePool.length > 0) {
            charBubble = this.lyricBubblePool.pop();
        } else {
            charBubble = document.createElement('div');
            charBubble.className = 'lyric-bubble';
            charBubble.addEventListener('mouseenter', () => this.clickLyric(charBubble));
        }
        
        // バブルの設定
        charBubble.textContent = text;
        charBubble.style.pointerEvents = 'auto';
        charBubble.style.opacity = '1';
        charBubble.style.left = `${baseX + (Math.random() - 0.5) * 50}px`;
        charBubble.style.top = `${baseY + (Math.random() - 0.5) * 50}px`;
        charBubble.style.color = '#39C5BB';  // ミクカラー
        charBubble.style.transition = 'color 0.3s ease-in-out, opacity 0.5s ease-in-out';
        charBubble.style.fontSize = isMobile ? '24px' : '30px';  // デバイスに合わせたサイズ
        
        this.gameContainer.appendChild(charBubble);
        
        // 一定時間後に削除またはプールに戻す
        setTimeout(() => {
            if (charBubble.parentNode) {
                charBubble.remove();
                if (this.lyricBubblePool.length < this.maxPoolSize) {
                    this.lyricBubblePool.push(charBubble);
                }
            }
        }, 8000);
    }

    /**
     * ランダムテキスト（観客のコール）を作成して表示
     * 最適化: オブジェクトプールを使用し、DOM操作を最小化
     */
    createRandomText() {
        if (this.isPaused) return;
        
        // オブジェクトプールから再利用または新規作成
        let text;
        if (this.randomTextPool.length > 0) {
            text = this.randomTextPool.pop();
        } else {
            text = document.createElement('div');
            text.className = 'random-text';
        }
        
        // テキストの内容と表示位置を設定
        text.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
        
        const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
        const y = window.innerHeight - Math.random() * 200;
        
        text.style.left = `${x}px`;
        text.style.top = `${y}px`;
        text.style.opacity = 0.5 + Math.random() * 0.5;
        text.style.fontSize = `${14 + Math.random() * 12}px`;
        text.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
        
        this.gameContainer.appendChild(text);
        
        // 一定時間後に削除またはプールに戻す
        setTimeout(() => {
            if (text.parentNode) {
                text.remove();
                if (this.randomTextPool.length < this.maxPoolSize) {
                    this.randomTextPool.push(text);
                }
            }
        }, 6000);
    }

    /**
     * 歌詞要素がクリックされた時の処理
     * @param {HTMLElement} element - クリックされた歌詞要素
     */
    clickLyric(element) {
        if (element.style.pointerEvents === 'none') return;  // 既に処理済みの場合はスキップ
        
        this.combo++;  // コンボを増加
        this.maxCombo = Math.max(this.maxCombo, this.combo);  // 最大コンボ数を更新
        const comboBonus = Math.floor(this.combo / 5) + 1;  // 5コンボごとにボーナス増加
        const points = 100 * comboBonus;  // ポイント計算
        this.score += points;
        
        this.scoreElement.textContent = this.score;
        this.comboElement.textContent = `コンボ: ${this.combo}`;
        
        // クリック時に色を変更（ピンク色）
        element.style.color = '#FF69B4';
        this.createClickEffect(element);  // クリックエフェクトを表示
        element.style.pointerEvents = 'none';  // 再クリック防止
        
        // 少し遅延させてからフェードアウト（色の変化を見せるため）
        setTimeout(() => {
            element.style.opacity = '0';
        }, 100);
        
        this.lastScoreTime = Date.now();  // コンボリセットタイマー用
    }

    /**
     * 指定された座標を中心とする円形の領域内にある歌詞要素をチェック
     * @param {number} x - 中心X座標
     * @param {number} y - 中心Y座標
     * @param {number} radius - 検出する円の半径
     * @returns {boolean} 歌詞要素が検出されたかどうか
     * 最適化: Math.sqrt計算を避け、距離の二乗を使用
     */
    checkLyricsInArea(x, y, radius) {
        const lyricElements = document.querySelectorAll('.lyric-bubble');
        let detected = false;
        
        // 半径の二乗を事前計算（Math.sqrt呼び出しを削減）
        const radiusSquared = radius * radius;
        
        for (let i = 0; i < lyricElements.length; i++) {
            const element = lyricElements[i];
            if (element.style.pointerEvents === 'none') continue;
            
            const rect = element.getBoundingClientRect();
            const elementCenterX = rect.left + rect.width / 2;
            const elementCenterY = rect.top + rect.height / 2;
            
            const dx = x - elementCenterX, dy = y - elementCenterY;
            // 高速化: Math.sqrtを避けて距離の二乗を計算
            const distanceSquared = dx * dx + dy * dy;
            const combinedRadius = radius + Math.max(rect.width, rect.height) / 2;
            
            // 距離の二乗を比較（Math.sqrt呼び出しを回避）
            if (distanceSquared <= combinedRadius * combinedRadius) {
                this.clickLyric(element);  // 歌詞をクリックした処理を実行
                detected = true;
                this.createHitEffect(elementCenterX, elementCenterY);  // ヒットエフェクトを表示
            }
        }
        
        return detected;
    }

    /**
     * 指定された位置にある歌詞要素をチェック（小さい範囲で）
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @returns {boolean} 歌詞要素が検出されたかどうか
     */
    checkLyricsAtPosition(x, y) {
        return this.checkLyricsInArea(x, y, 40);  // 半径40pxの範囲で歌詞をチェック
    }

    /**
     * コンボをリセットするタイマーを開始
     * 一定時間クリックがないとコンボがリセットされる
     */
    startComboResetTimer() {
        this.lastScoreTime = Date.now();
        
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        
        this.comboResetTimer = setInterval(() => {
            // 30秒間クリックがなければコンボリセット
            if (Date.now() - this.lastScoreTime > 30000 && this.combo > 0) {
                this.combo = 0;
                this.comboElement.textContent = `コンボ: ${this.combo}`;
            }
        }, 1000);
    }

    /**
     * 舞台照明などの光エフェクトを作成
     * 最適化: DocumentFragmentの使用、デバイス性能に応じたエフェクト数の調整
     */
    createLightEffects() {
        const isLowEndDevice = navigator.hardwareConcurrency <= 4 || this.isMobileDevice();
        const fragment = document.createDocumentFragment();  // DOM操作の最適化
        
        // スポットライト
        for (let i = 0; i < 3; i++) {
            const spotlight = document.createElement('div');
            spotlight.className = 'spotlight';
            spotlight.style.left = `${(i * 30) + 20}%`;
            spotlight.style.animationDelay = `${i * -2.5}s`;  // ずらしてアニメーション
            fragment.appendChild(spotlight);
        }
        
        // キラキラエフェクト (デバイスによって数を調整)
        const lightCount = isLowEndDevice ? 15 : 30;  // 低性能デバイスでは半分に
        for (let i = 0; i < lightCount; i++) {
            const light = document.createElement('div');
            light.className = 'light-effect';
            light.style.left = `${Math.random() * 100}%`;
            light.style.top = `${Math.random() * 100}%`;
            light.style.animationDelay = `${Math.random() * 3}s`;  // ランダムなタイミング
            fragment.appendChild(light);
        }
        
        // 一度のDOM操作でまとめて追加（パフォーマンス向上）
        this.gameContainer.appendChild(fragment);
    }

    /**
     * 歌詞にヒットした時の視覚効果を作成
     * @param {number} x - ヒット位置のX座標
     * @param {number} y - ヒット位置のY座標
     */
    createHitEffect(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'tap-ripple';
        ripple.style.backgroundColor = 'rgba(57, 197, 187, 0.5)';  // ミクカラー（半透明）
        ripple.style.width = '40px';
        ripple.style.height = '40px';
        ripple.style.left = `${x - 20}px`;  // 中心に配置するための調整
        ripple.style.top = `${y - 20}px`;
        
        this.gameContainer.appendChild(ripple);
        setTimeout(() => ripple.parentNode && ripple.remove(), 500);
    }

    /**
     * 流れ星エフェクトを作成
     * @param {number} x - 開始位置X座標
     * @param {number} y - 開始位置Y座標
     * @param {number} dx - X方向の速度
     * @param {number} dy - Y方向の速度
     */
    createShooting(x, y, dx, dy) {
        // 方向が指定されていない場合はランダムな方向を設定
        if (dx === 0 && dy === 0) {
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle) * 5;
            dy = Math.sin(angle) * 5;
        }

        // 流れ星のサイズと要素を作成
        const meteorSize = 15 + Math.random() * 15;
        const meteor = document.createElement('div');
        meteor.className = 'shooting-star';
        meteor.style.width = `${meteorSize}px`;
        meteor.style.height = `${meteorSize}px`;
        meteor.style.left = `${x}px`;
        meteor.style.top = `${y}px`;
        
        // 移動方向に合わせて回転
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        meteor.style.transform = `rotate(${angle + 45}deg)`;
        
        // 速度に基づいて光の強さを調整
        const speed = Math.min(150, Math.sqrt(dx * dx + dy * dy) * 5);
        meteor.style.boxShadow = `0 0 ${meteorSize}px ${meteorSize/2}px rgba(255, 255, 200, 0.8)`;
        meteor.style.filter = `blur(1px) drop-shadow(0 0 ${speed/10}px #fff)`;
        
        this.gameContainer.appendChild(meteor);
        const duration = 800;
        
        // Web Animations APIを使用（setIntervalよりも効率的）
        meteor.animate([
            { transform: `rotate(${angle + 45}deg) scale(1)`, opacity: 1 },
            { transform: `translate(${dx * 10}px, ${dy * 10}px) rotate(${angle + 45}deg) scale(0.1)`, opacity: 0 }
        ], { duration, easing: 'ease-out', fill: 'forwards' });
        
        // アニメーション終了後に要素を削除
        setTimeout(() => meteor.parentNode && meteor.remove(), duration);
    }

    /**
     * マウス/指の軌跡を表現するパーティクルを作成
     * @param {number} x - パーティクル生成位置X座標
     * @param {number} y - パーティクル生成位置Y座標
     * 最適化: 低性能デバイスでは頻度を下げる、プール再利用
     */
    createTrailParticle(x, y) {
        // パフォーマンス最適化: 低性能デバイスでは頻度を下げる
        if (this.isMobileDevice() && Math.random() > 0.5) return;
        
        // オブジェクトプールから再利用または新規作成
        let particle;
        if (this.trailParticlePool.length > 0) {
            particle = this.trailParticlePool.pop();
        } else {
            particle = document.createElement('div');
            particle.className = 'star-particle';
        }
        
        // パーティクルの設定
        const size = 20 + Math.random() * 40;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x - size/2}px`;
        particle.style.top = `${y - size/2}px`;
        
        // ランダムな色相でカラフルに
        const hue = Math.floor(Math.random() * 360);
        particle.style.backgroundColor = `hsla(${hue}, 100%, 70%, 0.8)`;
        particle.style.boxShadow = `0 0 ${size/2}px hsla(${hue}, 100%, 70%, 0.8)`;
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.opacity = '1';
        
        this.gameContainer.appendChild(particle);
        this.mouseTrail.push({ element: particle, createdAt: Date.now() });
        
        // 古いパーティクルをクリーンアップ
        const now = Date.now();
        const trailLifetime = 600;  // パーティクルの寿命（ミリ秒）
        
        // 寿命が切れたパーティクルをフィルタリング
        this.mouseTrail = this.mouseTrail.filter(particle => {
            const age = now - particle.createdAt;
            if (age > trailLifetime) {
                particle.element.style.opacity = '0';  // フェードアウト
                if (this.trailParticlePool.length < this.maxPoolSize) {
                    // プールに戻して再利用
                    this.trailParticlePool.push(particle.element);
                } else if (particle.element.parentNode) {
                    // プールがいっぱいなら削除
                    particle.element.remove();
                }
                return false;
            }
            return true;
        });
        
        // 軌跡の最大長を超える場合、古いものから削除
        while (this.mouseTrail.length > this.maxTrailLength) {
            const oldest = this.mouseTrail.shift();
            if (oldest.element.parentNode) {
                oldest.element.remove();
                if (this.trailParticlePool.length < this.maxPoolSize) {
                    this.trailParticlePool.push(oldest.element);
                }
            }
        }
    }

    /**
     * 歌詞クリック時のエフェクトを作成
     * @param {HTMLElement} element - クリックされた歌詞要素
     * 最適化: デバイス性能に応じたパーティクル数の調整、プール再利用
     */
    createClickEffect(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // パフォーマンス最適化: 低スペックデバイスではパーティクル数を減らす
        const particleCount = this.isMobileDevice() ? 4 : 6;
        
        // パーティクルエフェクト
        for (let i = 0; i < particleCount; i++) {
            let particle;
            if (this.particlePool.length > 0) {
                particle = this.particlePool.pop();
            } else {
                particle = document.createElement('div');
                particle.className = 'particle';
            }
            
            // パーティクルの設定
            const size = 10 + Math.random() * 15;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.opacity = '1';
            particle.style.left = `${centerX - size / 2 + (Math.random() - 0.5) * 30}px`;
            particle.style.top = `${centerY - size / 2 + (Math.random() - 0.5) * 30}px`;
            
            this.gameContainer.appendChild(particle);
            
            // ランダムな方向と速度
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            const startTime = Date.now();
            const duration = 800;
            
            // パーティクルのアニメーション
            const animateParticle = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    // アニメーション終了時にプールに戻すか削除
                    if (particle.parentNode) {
                        particle.remove();
                        if (this.particlePool.length < this.maxPoolSize) {
                            this.particlePool.push(particle);
                        }
                    }
                    return;
                }
                
                // パーティクルを移動させる
                const progress = elapsed / duration;
                const currentX = parseFloat(particle.style.left) + dx;
                const currentY = parseFloat(particle.style.top) + dy;
                
                particle.style.left = `${currentX}px`;
                particle.style.top = `${currentY}px`;
                particle.style.opacity = (1 - progress).toString();  // フェードアウト
                
                requestAnimationFrame(animateParticle);
            };
            
            requestAnimationFrame(animateParticle);
        }
        
        // 得点表示テキスト
        let pointDisplay;
        if (this.lyricBubblePool.length > 0) {
            pointDisplay = this.lyricBubblePool.pop();
        } else {
            pointDisplay = document.createElement('div');
            pointDisplay.className = 'lyric-bubble';
        }
        
        // 得点表示の設定
        pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;  // コンボボーナス表示
        pointDisplay.style.left = `${centerX}px`;
        pointDisplay.style.top = `${centerY}px`;
        pointDisplay.style.color = '#FFFF00';  // 黄色で目立たせる
        pointDisplay.style.pointerEvents = 'none';  // クリック不可
        pointDisplay.style.opacity = '1';
        
        this.gameContainer.appendChild(pointDisplay);
        
        // 上に浮かせながらフェードアウトするアニメーション
        const startY = parseFloat(pointDisplay.style.top);
        const startTime = Date.now();
        const duration = 1200;
        
        const animatePointDisplay = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= duration) {
                // アニメーション終了時にプールに戻すか削除
                if (pointDisplay.parentNode) {
                    pointDisplay.remove();
                    if (this.lyricBubblePool.length < this.maxPoolSize) {
                        this.lyricBubblePool.push(pointDisplay);
                    }
                }
                return;
            }
            
            // 上に浮かび上がりながらフェードアウト
            const progress = elapsed / duration;
            pointDisplay.style.top = `${startY - 50 * progress}px`;
            pointDisplay.style.opacity = (1 - progress).toString();
            
            requestAnimationFrame(animatePointDisplay);
        };
        
        requestAnimationFrame(animatePointDisplay);
    }

    /**
     * 観客を作成
     * コンサート会場の雰囲気を演出する
     * 最適化: デバイス性能に応じた観客数と表示の調整、DocumentFragment使用
     */
    createAudience() {
        const stageCenterX = window.innerWidth / 2;
        const screenHeight = window.innerHeight;
        const isMobile = this.isMobileDevice();
        const isLowEndDevice = navigator.hardwareConcurrency <= 4 || isMobile;
        const maxAudience = isLowEndDevice ? 100 : 180;  // 低性能デバイスでは観客数を減らす
        
        // 観客の配置行（距離、数、縮尺）を定義
        const audienceRows = [
            { distance: 70, count: 14, scale: 0.9 },
            { distance: 130, count: 20, scale: 0.85 },
            { distance: 190, count: 26, scale: 0.8 },
            { distance: 250, count: 32, scale: 0.75 },
            { distance: 310, count: 38, scale: 0.7 },
            { distance: 370, count: 44, scale: 0.65 }
        ];
        
        // 高性能デバイスのみ後方の行を追加
        if (!isLowEndDevice) {
            audienceRows.push({ distance: 430, count: 50, scale: 0.6 });
            audienceRows.push({ distance: 490, count: 56, scale: 0.55 });
        }
        
        let totalAudience = 0;
        const fragment = document.createDocumentFragment();  // DOM操作の最適化
        const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];  // ペンライトの色
        
        // 各行の観客を作成
        for (const row of audienceRows) {
            if (totalAudience >= maxAudience) break;
            
            // 画面サイズに応じて観客数を調整
            const adjustedCount = Math.min(row.count, Math.floor(row.count * window.innerWidth / 900));
            const angleStep = 360 / adjustedCount;
            
            for (let i = 0; i < adjustedCount; i++) {
                if (totalAudience >= maxAudience) break;
                
                // 円周上に配置するための角度計算
                const angle = angleStep * i;
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * row.distance;
                const y = Math.sin(radians) * (row.distance * 0.5);  // 楕円形に配置
                
                const posX = stageCenterX + x;
                const posY = 100 - y;
                
                // 画面内に表示される位置かチェック
                if (posX >= -20 && posX <= window.innerWidth + 20 && 
                    posY >= -20 && posY <= screenHeight + 20) {
                    
                    const audience = document.createElement('div');
                    audience.className = 'audience';
                    audience.style.left = `${posX}px`;
                    audience.style.bottom = `${posY}px`;
                    audience.style.transform = `scale(${row.scale})`;
                    audience.style.opacity = Math.max(0.5, row.scale);  // 遠くの観客は少し透明に
                    
                    // 後方の観客は単純な形状に（パフォーマンス向上）
                    if (row.distance > 250 && totalAudience % 2 === 0) {
                        audience.style.backgroundColor = '#333';
                        audience.style.height = '12px';
                        audience.style.width = '8px';
                    } else {
                        // ペンライトを持たせる
                        const penlight = document.createElement('div');
                        penlight.className = 'penlight';
                        
                        if (totalAudience % 3 !== 0 || row.distance <= 190) {
                            penlight.style.animationDelay = `${Math.random() * 0.8}s`;
                        } else {
                            // 一部の観客はアニメーションなし（静止）
                            penlight.style.animation = 'none';
                            penlight.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
                        }
                        
                        // ランダムな色のペンライト
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];
                        penlight.style.backgroundColor = randomColor;
                        
                        // 前方の観客はより明るいペンライト
                        if (row.distance <= 190) {
                            penlight.style.boxShadow = `0 0 8px ${randomColor}`;
                        }
                        
                        audience.appendChild(penlight);
                    }
                    
                    fragment.appendChild(audience);
                    totalAudience++;
                }
            }
        }
        
        // 一度のDOM操作でまとめて追加（パフォーマンス向上）
        this.gameContainer.appendChild(fragment);
        
        // パフォーマンス最適化：観客が多い場合は一部のアニメーションを停止
        if (totalAudience > 100) {
            const audiences = document.querySelectorAll('.audience .penlight');
            for (let i = 0; i < audiences.length; i++) {
                if (i % 3 === 0) {  // 3分の1のアニメーションを停止
                    audiences[i].style.animation = 'none';
                    audiences[i].style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
                }
            }
        }
    }

    /**
     * ゲームをリスタート（初期状態に戻す）
     * 最適化: 効率的なクリーンアップ処理、メモリリーク防止
     */
    restartGame() {
        this.currentLyricIndex = 0;
        this.startTime = Date.now();
        
        // 停止中なら再開
        if (this.isPaused) {
            this.isPaused = false;
            this.playPauseBtn.textContent = '一時停止';
            
            if (!this.randomTextInterval) {
                this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
            }
        }
        
        // ゲーム状態をリセット
        this.score = 0;
        this.combo = 0;
        this.scoreElement.textContent = '0';
        this.comboElement.textContent = 'コンボ: 0';
        
        // 画面上の歌詞要素をすべて削除（オブジェクトプールに戻す）
        document.querySelectorAll('.lyric-bubble').forEach(lyric => {
            if (lyric.parentNode) {
                lyric.remove();
                if (this.lyricBubblePool.length < this.maxPoolSize) {
                    this.lyricBubblePool.push(lyric);
                }
            }
        });
        
        // 歌詞表示状態をリセット
        if (this.displayedLyrics) this.displayedLyrics.clear();
        this.displayedLyricsTimestamps.clear();
        
        // メモリ最適化: 過剰なオブジェクトプールを整理
        if (this.trailParticlePool.length > this.maxPoolSize) {
            this.trailParticlePool.length = this.maxPoolSize;
        }
        if (this.particlePool.length > this.maxPoolSize) {
            this.particlePool.length = this.maxPoolSize;
        }
        if (this.lyricBubblePool.length > this.maxPoolSize) {
            this.lyricBubblePool.length = this.maxPoolSize;
        }
        if (this.randomTextPool.length > this.maxPoolSize) {
            this.randomTextPool.length = this.maxPoolSize;
        }
    }

    /**
     * 曲終了時にリザルト画面を表示
     * Player API または独自の判定で終了を検出
     * @param {number} position - 現在の再生位置（ミリ秒）
     */
    checkSongEnd(position) {
        // 曲が終了したかどうかを判定する
        if (this.player && this.isPlayerInitialized) {
            // TextAlive API使用時の判定
            if (position >= this.player.video.duration - 1000) {
                this.showResultsScreen();
            }
        } else if (this.lyricsData.length > 0) {
            // 代替モードでの判定（すべての歌詞が表示された後、追加で5秒待機）
            const lastLyricTime = this.lyricsData[this.lyricsData.length - 1].time;
            if (Date.now() - this.startTime > lastLyricTime + 5000 && 
                this.currentLyricIndex >= this.lyricsData.length - 1) {
                this.showResultsScreen();
            }
        }
    }

    /**
     * リザルト画面を表示
     */
    showResultsScreen() {
        // 既にリザルト画面が表示されている場合は処理をスキップ
        if (this.resultsDisplayed) return;
        this.resultsDisplayed = true;
        
        // 音楽を停止
        if (this.player && this.isPlayerInitialized && this.player.isPlaying) {
            this.player.requestPause();
        }
        
        // マックスコンボの計算
        this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
        
        // ランク判定（スコアに基づく）
        let rank = 'C';
        if (this.score >= 10000) rank = 'S';
        else if (this.score >= 8000) rank = 'A';
        else if (this.score >= 6000) rank = 'B';
        
        // リザルト画面の要素を取得
        const resultsScreen = document.getElementById('results-screen');
        const finalScore = document.getElementById('final-score-display');
        const finalCombo = document.getElementById('final-combo-display');
        const rankDisplay = document.getElementById('rank-display');
        
        // 値を設定
        finalScore.textContent = this.score;
        finalCombo.textContent = `最大コンボ: ${this.maxCombo}`;
        rankDisplay.textContent = `ランク: ${rank}`;
        
        // 数秒待ってからリザルト画面を表示（演出のため）
        setTimeout(() => {
            resultsScreen.classList.remove('hidden');
            setTimeout(() => {
                resultsScreen.classList.add('show');
                
                // 特殊効果を追加（星や光のエフェクト）
                for (let i = 0; i < 15; i++) {
                    setTimeout(() => {
                        const x = Math.random() * window.innerWidth;
                        const y = Math.random() * window.innerHeight;
                        this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
                    }, i * 200);
                }
            }, 100);
        }, 1500);
        
        // ボタンイベントのセットアップ
        const backToTitleBtn = document.getElementById('back-to-title');
        const replayBtn = document.getElementById('replay-song');
        
        // タイトルへ戻るボタン
        backToTitleBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // もう一度プレイボタン
        replayBtn.addEventListener('click', () => {
            resultsScreen.classList.remove('show');
            setTimeout(() => {
                resultsScreen.classList.add('hidden');
                this.restartGame();
                this.resultsDisplayed = false;
            }, 1000);
        });
    }

    /**
     * ゲーム終了時のクリーンアップ処理
     * リソース解放とメモリリーク防止
     */
    cleanup() {
        // タイマーやアニメーションをすべて停止
        if (this.randomTextInterval) clearInterval(this.randomTextInterval);
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        // TextAliveプレーヤーの破棄
        if (this.player && this.isPlayerInitialized) {
            try {
                this.player.dispose();
            } catch {}  // エラーを無視（空のcatch文で最適化）
        }
        
        // オブジェクトプールをクリア
        this.trailParticlePool = [];
        this.particlePool = [];
        this.lyricBubblePool = [];
        this.randomTextPool = [];
        
        // マウス軌跡要素をクリア
        this.mouseTrail.forEach(item => {
            if (item.element?.parentNode) item.element.remove();
        });
        this.mouseTrail = [];
        
        // 歌詞表示状態をクリア
        this.displayedLyrics = null;
        this.displayedLyricsTimestamps = null;
    }
}

/**
 * ページ読み込み時にゲームを起動
 */
window.addEventListener('load', () => {
    setTimeout(() => {
        const gameManager = new GameManager();
        window.gameManager = gameManager;  // グローバルアクセス用
        
        // ページ離脱時のクリーンアップ
        window.addEventListener('beforeunload', () => {
            if (gameManager) gameManager.cleanup();
        });
    }, 100);  // 少し待ってからゲームを初期化
});
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
        this.apiToken = window.songConfig?.apiToken || "wifkp8ak1TEhQ8pI";
        this.songUrl = window.songConfig?.songUrl || "https://piapro.jp/t/hZ35/20240130103028";
        
        this.initGameState();
        this.setupViewportHandling();
        this.initDOMElements();
        this.initLyricsData();
        this.initRandomTexts();
        this.setupEvents();
        this.createLightEffects();
        this.initGame();
        this.startComboResetTimer();
        this.adjustUIForDevice();
        this.initTextAlivePlayer();
    }

    /**
     * ゲーム状態の初期化
     * スコア、コンボ、表示状態などのゲームの状態変数を設定
     * パフォーマンス向上: デバイス性能に応じて変数を最適化
     */
    initGameState() {
        this.score = this.combo = this.currentLyricIndex = this.maxCombo = 0;
        this.startTime = Date.now();
        this.isPaused = this.isPlayerInitialized = this.clickHandled = this.resultsDisplayed = false;
        this.player = null;
        
        this.activeCharacters = new Set();
        this.displayedLyricsTimestamps = new Set();
        
        this.frameCount = this.lastFrameTime = 0;
        this.fps = 60;
        this.throttleFrames = this.detectPerformance();
        this.isProcessingPlayback = false;
        this.animationFrameId = null;
        
        this.mouseTrail = [];
        this.maxTrailLength = this.isMobileDevice() ? 5 : 10;
        this.lastMousePosition = { x: 0, y: 0 };
        
        const poolSize = this.isMobileDevice() ? 15 : 30;
        this.maxPoolSize = poolSize;
        this.particlePool = [];
        this.lyricBubblePool = [];
        this.randomTextPool = [];
        this.trailParticlePool = [];
    }

    /**
     * ブラウザUIに対応するためのビューポート処理
     * モバイルブラウザにおけるアドレスバーなどの影響を調整
     */
    setupViewportHandling() {
        const setViewportProperty = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                document.documentElement.style.setProperty(
                    '--browser-footer-height', 
                    window.innerHeight < window.innerWidth ? '80px' : '120px'
                );
            }
        };
        
        setViewportProperty();
        
        window.addEventListener('resize', () => setTimeout(setViewportProperty, 100));
        window.addEventListener('orientationchange', () => setTimeout(setViewportProperty, 100));
        
        let lastScrollPosition = window.scrollY;
        window.addEventListener('scroll', () => {
            const currentScrollPosition = window.scrollY;
            const isScrollingDown = currentScrollPosition > lastScrollPosition;
            
            document.documentElement.style.setProperty(
                '--browser-header-height',
                isScrollingDown && currentScrollPosition > 50 ? '0px' : '20px'
            );
            
            lastScrollPosition = currentScrollPosition;
        });
        
        document.addEventListener('touchmove', e => {
            if (e.touches.length > 1) e.preventDefault();
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
        this.setupUserInteractions();
        this.setupControls();
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
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
        const throttleDelay = 16;
        let lastEventTime = 0, lastX = 0, lastY = 0;
        
        const handleMove = (x, y, isTouch) => {
            const now = Date.now();
            if (now - lastEventTime < throttleDelay) return;
            
            lastEventTime = now;
            const dx = x - lastX, dy = y - lastY;
            if (Math.sqrt(dx*dx + dy*dy) >= 5) {
                lastX = x; lastY = y;
                this.lastMousePosition = { x, y };
                
                if (this.frameCount % 2 === 0) {
                    this.createTrailParticle(x, y);
                    Math.random() < (isTouch ? 0.03 : 0.01) && this.createShooting(x, y, dx, dy);
                }
                
                this.checkLyricsInArea(x, y, isTouch ? 45 : 35);
            }
        };
        
        this.gameContainer.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY, false));
        
        this.gameContainer.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY, true);
        }, { passive: false });
        
        this.gameContainer.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            lastX = touch.clientX; lastY = touch.clientY;
            this.checkLyricsInArea(touch.clientX, touch.clientY, 35);
        });
        
        this.gameContainer.addEventListener('click', e => {
            const x = e.clientX, y = e.clientY;
            this.createTapEffect?.(x, y);
            this.checkLyricsInArea(x, y, 35);
            
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
        this.loading?.addEventListener('click', this.handleLoadingClick.bind(this));
    }

    /**
     * 再生/一時停止ボタンのクリック処理
     * 最適化: エラー処理の改善、処理の非同期化
     */
    async handlePlayPause() {
        if (this.isProcessingPlayback) return;
        this.isProcessingPlayback = true;
        
        try {
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                this.playPauseBtn.textContent = '再生';
                
                if (this.player && this.isPlayerInitialized && this.player.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await this.player.requestPause().catch(e => {
                        e.name !== 'AbortError' && console.error("Player pause error:", e);
                    });
                }
                
                if (this.randomTextInterval) {
                    clearInterval(this.randomTextInterval);
                    this.randomTextInterval = null;
                }
            } else {
                this.playPauseBtn.textContent = '一時停止';
                
                if (this.player && this.isPlayerInitialized && !this.player.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await this.player.requestPlay().catch(e => {
                        e.name !== 'AbortError' && this.fallbackToBasicMode();
                    });
                } else if (!this.player || !this.isPlayerInitialized) {
                    this.startTime = Date.now() - (this.lyricsData[this.currentLyricIndex]?.time || 0);
                }
                
                if (!this.randomTextInterval) {
                    this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
                }
            }
        } finally {
            setTimeout(() => this.isProcessingPlayback = false, 800);
        }
    }
    
    /**
     * リスタートボタンのクリック処理
     * ゲームを初期状態に戻して再開
     * 最適化: エラー処理の改善、非同期処理のチェーン化
     */
    async handleRestart() {
        if (this.isProcessingPlayback) return;
        this.isProcessingPlayback = true;
        
        try {
            this.restartGame();
            
            if (this.player && this.isPlayerInitialized) {
                try {
                    if (this.player.isPlaying) await this.player.requestPause();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.player.requestStop();
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    await this.player.requestPlay().catch(e => {
                        if (e.name === 'AbortError') {
                            return new Promise(resolve => setTimeout(resolve, 500))
                                .then(() => this.player.requestPlay());
                        }
                        this.fallbackToBasicMode();
                    });
                } catch (e) {
                    this.fallbackToBasicMode();
                }
            } else {
                this.isPaused = false;
                this.currentLyricIndex = 0;
                this.startTime = Date.now();
                this.playPauseBtn.textContent = '一時停止';
            }
        } finally {
            setTimeout(() => this.isProcessingPlayback = false, 1500);
        }
    }
    
    /**
     * ゲーム画面のクリック処理（初回再生用）
     * 画面クリックで音楽再生を開始する
     */
    async handleBodyClick() {
        if (!this.player || !this.isPlayerInitialized) return;
        
        const now = Date.now();
        if (now - (this.lastClickTime || 0) < 1000) return;
        this.lastClickTime = now;
        
        if (this.player.isPlaying === false && !this.clickHandled) {
            this.clickHandled = true;
            try {
                await this.player.requestPlay();
                this.isPaused = false;
                this.playPauseBtn.textContent = '一時停止';
            } catch (e) {
                this.fallbackToBasicMode();
            }
            setTimeout(() => { this.clickHandled = false; }, 1500);
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
                this.isPaused = false;
                this.startTime = Date.now();
                this.playPauseBtn.textContent = '一時停止';
            }
        } finally {
            setTimeout(() => this.isProcessingPlayback = false, 1000);
        }
    }

    /**
     * ゲームの初期化処理
     * 観客生成、タイマー開始などの初期設定
     */
    initGame() {
        this.createAudience();
        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        this.startLyricsTimer();
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
        this.lyricsData = [];
        this.fallbackLyricsData = [
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
            const controls = document.getElementById('controls');
            if (controls) controls.classList.add('mobile-controls');
            
            const instructions = document.getElementById('instructions');
            if (instructions) instructions.textContent = '歌詞の文字をタップまたはスワイプしてポイントを獲得しよう！';
            
            window.innerHeight > window.innerWidth && this.showOrientationWarning?.();
            this.showMobileHint();
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
        this.gameContainer.appendChild(mobileHint);
        
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
        if (typeof TextAliveApp === 'undefined') {
            if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
            this.fallbackToBasicMode();
            return;
        }
        
        if (this.isPlayerInitialized) return;
        
        try {
            this.player = new TextAliveApp.Player({
                app: { token: this.apiToken },
                mediaElement: document.createElement('audio')
            });
            document.body.appendChild(this.player.mediaElement);
            this.isPlayerInitialized = true;
            
            this.player.addListener({
                onAppReady: (app) => {
                    if (app && !app.managed) {
                        try {
                            this.player.createFromSongUrl(this.songUrl);
                        } catch {
                            this.fallbackToBasicMode();
                        }
                    }
                },
                onVideoReady: (video) => {
                    if (video && video.firstPhrase) this.updateLyricsFromVideo(video);
                    if (this.loading) this.loading.textContent = "準備完了！クリックして開始";
                },
                onTimeUpdate: (position) => this.updateLyricsDisplay(position),
                onPlay: () => {
                    this.isPaused = false;
                    this.playPauseBtn.textContent = '一時停止';
                    if (!this.randomTextInterval) {
                        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
                    }
                },
                onPause: () => {
                    this.isPaused = true;
                    this.playPauseBtn.textContent = '再生';
                    clearInterval(this.randomTextInterval);
                    this.randomTextInterval = null;
                },
                onStop: () => {
                    this.isPaused = true;
                    this.playPauseBtn.textContent = '再生';
                    this.restartGame();
                },
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
        this.lyricsData = this.fallbackLyricsData;
        this.startLyricsTimer();
    }
    
    /**
     * TextAliveから取得したビデオデータから歌詞情報を更新
     * @param {Object} video - TextAliveから取得したビデオデータ
     */
    updateLyricsFromVideo(video) {
        try {
            this.lyricsData = [];
            let currentPhrase = video.firstPhrase;
            
            while (currentPhrase) {
                let currentWord = currentPhrase.firstWord;
                while (currentWord) {
                    let currentChar = currentWord.firstChar;
                    while (currentChar) {
                        this.lyricsData.push({
                            time: currentChar.startTime,
                            text: currentChar.text
                        });
                        currentChar = currentChar.next;
                    }
                    currentWord = currentWord.next;
                }
                currentPhrase = currentPhrase.next;
            }
            
            this.lyricsData.sort((a, b) => a.time - b.time);
        } catch {}
    }
    
    /**
     * 現在の再生位置に応じて歌詞を表示
     * @param {number} position - 現在の再生位置（ミリ秒）
     * 最適化: フレームスキップによる処理頻度の調整
     */
    updateLyricsDisplay(position) {
        if (this.isPaused) return;
        if (!this.displayedLyrics) this.displayedLyrics = new Set();
        
        this.frameCount++;
        if (this.frameCount % this.throttleFrames !== 0) return;
        
        for (let i = 0; i < this.lyricsData.length; i++) {
            const lyric = this.lyricsData[i];
            if (lyric.time <= position && lyric.time > position - 500 && !this.displayedLyrics.has(lyric.time)) {
                this.displayLyricBubble(lyric.text);
                this.displayedLyrics.add(lyric.time);
                setTimeout(() => this.displayedLyrics.delete(lyric.time), 10000);
            }
        }
        
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
        
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        const checkLyrics = () => {
            if ((this.isPlayerInitialized && this.player) || this.isPaused) {
                this.animationFrameId = requestAnimationFrame(checkLyrics);
                return;
            }
            
            this.frameCount++;
            if (this.frameCount % this.throttleFrames !== 0) {
                this.animationFrameId = requestAnimationFrame(checkLyrics);
                return;
            }
            
            const currentTime = Date.now() - this.startTime;
            let processedLyrics = 0;
            const maxProcessPerFrame = 3;
            
            while (this.currentLyricIndex < this.lyricsData.length && 
                   this.lyricsData[this.currentLyricIndex].time <= currentTime &&
                   processedLyrics < maxProcessPerFrame) {
                
                const lyric = this.lyricsData[this.currentLyricIndex];
                if (!this.displayedLyricsTimestamps.has(lyric.time)) {
                    this.displayLyricBubble(lyric.text);
                    this.displayedLyricsTimestamps.add(lyric.time);
                    
                    setTimeout(() => {
                        this.displayedLyricsTimestamps.delete(lyric.time);
                    }, 8000);
                    
                    processedLyrics++;
                }
                
                this.currentLyricIndex++;
            }
            
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

        const existingBubbles = document.querySelectorAll('.lyric-bubble');
        for (let bubble of existingBubbles) {
            if (bubble.textContent === text) return;
        }

        const isMobile = this.isMobileDevice();
        
        let baseX, baseY;
        if (isMobile) {
            baseX = window.innerWidth * 0.15 + Math.random() * (window.innerWidth * 0.7);
            baseY = window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55);
        } else {
            baseX = 100 + Math.random() * (window.innerWidth - 300);
            baseY = window.innerHeight - 300 - Math.random() * 100;
        }

        let charBubble = this.lyricBubblePool.pop() || (() => {
            const el = document.createElement('div');
            el.className = 'lyric-bubble';
            el.addEventListener('mouseenter', () => this.clickLyric(el));
            return el;
        })();
        
        charBubble.textContent = text;
        charBubble.style.pointerEvents = 'auto';
        charBubble.style.opacity = '1';
        charBubble.style.left = `${baseX + (Math.random() - 0.5) * 50}px`;
        charBubble.style.top = `${baseY + (Math.random() - 0.5) * 50}px`;
        charBubble.style.color = '#39C5BB';
        charBubble.style.transition = 'color 0.3s ease-in-out, opacity 0.5s ease-in-out';
        charBubble.style.fontSize = isMobile ? '24px' : '30px';
        
        this.gameContainer.appendChild(charBubble);
        
        setTimeout(() => {
            if (charBubble.parentNode) {
                charBubble.remove();
                this.lyricBubblePool.length < this.maxPoolSize && this.lyricBubblePool.push(charBubble);
            }
        }, 8000);
    }

    /**
     * ランダムテキスト（観客のコール）を作成して表示
     * 最適化: オブジェクトプールを使用し、DOM操作を最小化
     */
    createRandomText() {
        if (this.isPaused) return;
        
        let text = this.randomTextPool.pop() || (() => {
            const el = document.createElement('div');
            el.className = 'random-text';
            return el;
        })();
        
        text.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
        
        const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
        const y = window.innerHeight - Math.random() * 200;
        
        text.style.left = `${x}px`;
        text.style.top = `${y}px`;
        text.style.opacity = 0.5 + Math.random() * 0.5;
        text.style.fontSize = `${14 + Math.random() * 12}px`;
        text.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
        
        this.gameContainer.appendChild(text);
        
        setTimeout(() => {
            if (text.parentNode) {
                text.remove();
                this.randomTextPool.length < this.maxPoolSize && this.randomTextPool.push(text);
            }
        }, 6000);
    }

    /**
     * 歌詞要素がクリックされた時の処理
     * @param {HTMLElement} element - クリックされた歌詞要素
     */
    clickLyric(element) {
        if (element.style.pointerEvents === 'none') return;
        
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const comboBonus = Math.floor(this.combo / 5) + 1;
        const points = 100 * comboBonus;
        this.score += points;
        
        this.scoreElement.textContent = this.score;
        this.comboElement.textContent = `コンボ: ${this.combo}`;
        
        element.style.color = '#FF69B4';
        this.createClickEffect(element);
        element.style.pointerEvents = 'none';
        
        setTimeout(() => {
            element.style.opacity = '0';
        }, 100);
        
        this.lastScoreTime = Date.now();
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
        
        const radiusSquared = radius * radius;
        
        for (let i = 0; i < lyricElements.length; i++) {
            const element = lyricElements[i];
            if (element.style.pointerEvents === 'none') continue;
            
            const rect = element.getBoundingClientRect();
            const elementCenterX = rect.left + rect.width / 2;
            const elementCenterY = rect.top + rect.height / 2;
            
            const dx = x - elementCenterX, dy = y - elementCenterY;
            const distanceSquared = dx * dx + dy * dy;
            const combinedRadius = radius + Math.max(rect.width, rect.height) / 2;
            
            if (distanceSquared <= combinedRadius * combinedRadius) {
                this.clickLyric(element);
                detected = true;
                this.createHitEffect(elementCenterX, elementCenterY);
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
        return this.checkLyricsInArea(x, y, 40);
    }

    /**
     * コンボをリセットするタイマーを開始
     * 一定時間クリックがないとコンボがリセットされる
     */
    startComboResetTimer() {
        this.lastScoreTime = Date.now();
        
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        
        this.comboResetTimer = setInterval(() => {
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
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < 3; i++) {
            const spotlight = document.createElement('div');
            spotlight.className = 'spotlight';
            spotlight.style.left = `${(i * 30) + 20}%`;
            spotlight.style.animationDelay = `${i * -2.5}s`;
            fragment.appendChild(spotlight);
        }
        
        const lightCount = isLowEndDevice ? 15 : 30;
        for (let i = 0; i < lightCount; i++) {
            const light = document.createElement('div');
            light.className = 'light-effect';
            light.style.left = `${Math.random() * 100}%`;
            light.style.top = `${Math.random() * 100}%`;
            light.style.animationDelay = `${Math.random() * 3}s`;
            fragment.appendChild(light);
        }
        
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
        ripple.style.backgroundColor = 'rgba(57, 197, 187, 0.5)';
        ripple.style.width = '40px';
        ripple.style.height = '40px';
        ripple.style.left = `${x - 20}px`;
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
        if (dx === 0 && dy === 0) {
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle) * 5;
            dy = Math.sin(angle) * 5;
        }

        const meteorSize = 15 + Math.random() * 15;
        const meteor = document.createElement('div');
        meteor.className = 'shooting-star';
        meteor.style.width = `${meteorSize}px`;
        meteor.style.height = `${meteorSize}px`;
        meteor.style.left = `${x}px`;
        meteor.style.top = `${y}px`;
        
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        meteor.style.transform = `rotate(${angle + 45}deg)`;
        
        const speed = Math.min(150, Math.sqrt(dx * dx + dy * dy) * 5);
        meteor.style.boxShadow = `0 0 ${meteorSize}px ${meteorSize/2}px rgba(255, 255, 200, 0.8)`;
        meteor.style.filter = `blur(1px) drop-shadow(0 0 ${speed/10}px #fff)`;
        
        this.gameContainer.appendChild(meteor);
        const duration = 800;
        
        meteor.animate([
            { transform: `rotate(${angle + 45}deg) scale(1)`, opacity: 1 },
            { transform: `translate(${dx * 10}px, ${dy * 10}px) rotate(${angle + 45}deg) scale(0.1)`, opacity: 0 }
        ], { duration, easing: 'ease-out', fill: 'forwards' });
        
        setTimeout(() => meteor.parentNode && meteor.remove(), duration);
    }

    /**
     * マウス/指の軌跡を表現するパーティクルを作成
     * @param {number} x - パーティクル生成位置X座標
     * @param {number} y - パーティクル生成位置Y座標
     * 最適化: 低性能デバイスでは頻度を下げる、プール再利用
     */
    createTrailParticle(x, y) {
        if (this.isMobileDevice() && Math.random() > 0.5) return;
        
        let particle = this.trailParticlePool.pop() || (() => {
            const el = document.createElement('div');
            el.className = 'star-particle';
            return el;
        })();
        
        const size = 20 + Math.random() * 40;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x - size/2}px`;
        particle.style.top = `${y - size/2}px`;
        
        const hue = Math.floor(Math.random() * 360);
        particle.style.backgroundColor = `hsla(${hue}, 100%, 70%, 0.8)`;
        particle.style.boxShadow = `0 0 ${size/2}px hsla(${hue}, 100%, 70%, 0.8)`;
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.opacity = '1';
        
        this.gameContainer.appendChild(particle);
        this.mouseTrail.push({ element: particle, createdAt: Date.now() });
        
        const now = Date.now();
        const trailLifetime = 600;
        
        this.mouseTrail = this.mouseTrail.filter(particle => {
            const age = now - particle.createdAt;
            if (age > trailLifetime) {
                particle.element.style.opacity = '0';
                if (this.trailParticlePool.length < this.maxPoolSize) {
                    this.trailParticlePool.push(particle.element);
                } else if (particle.element.parentNode) {
                    particle.element.remove();
                }
                return false;
            }
            return true;
        });
        
        while (this.mouseTrail.length > this.maxTrailLength) {
            const oldest = this.mouseTrail.shift();
            if (oldest.element.parentNode) {
                oldest.element.remove();
                this.trailParticlePool.length < this.maxPoolSize && this.trailParticlePool.push(oldest.element);
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
        
        const particleCount = this.isMobileDevice() ? 4 : 6;
        
        for (let i = 0; i < particleCount; i++) {
            let particle = this.particlePool.pop() || (() => {
                const el = document.createElement('div');
                el.className = 'particle';
                return el;
            })();
            
            const size = 10 + Math.random() * 15;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.opacity = '1';
            particle.style.left = `${centerX - size / 2 + (Math.random() - 0.5) * 30}px`;
            particle.style.top = `${centerY - size / 2 + (Math.random() - 0.5) * 30}px`;
            
            this.gameContainer.appendChild(particle);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            const startTime = Date.now();
            const duration = 800;
            
            const animateParticle = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    if (particle.parentNode) {
                        particle.remove();
                        this.particlePool.length < this.maxPoolSize && this.particlePool.push(particle);
                    }
                    return;
                }
                
                const progress = elapsed / duration;
                const currentX = parseFloat(particle.style.left) + dx;
                const currentY = parseFloat(particle.style.top) + dy;
                
                particle.style.left = `${currentX}px`;
                particle.style.top = `${currentY}px`;
                particle.style.opacity = (1 - progress).toString();
                
                requestAnimationFrame(animateParticle);
            };
            
            requestAnimationFrame(animateParticle);
        }
        
        let pointDisplay = this.lyricBubblePool.pop() || (() => {
            const el = document.createElement('div');
            el.className = 'lyric-bubble';
            return el;
        })();
        
        pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;
        pointDisplay.style.left = `${centerX}px`;
        pointDisplay.style.top = `${centerY}px`;
        pointDisplay.style.color = '#FFFF00';
        pointDisplay.style.pointerEvents = 'none';
        pointDisplay.style.opacity = '1';
        
        this.gameContainer.appendChild(pointDisplay);
        
        const startY = parseFloat(pointDisplay.style.top);
        const startTime = Date.now();
        const duration = 1200;
        
        const animatePointDisplay = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= duration) {
                if (pointDisplay.parentNode) {
                    pointDisplay.remove();
                    this.lyricBubblePool.length < this.maxPoolSize && this.lyricBubblePool.push(pointDisplay);
                }
                return;
            }
            
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
        const maxAudience = isLowEndDevice ? 100 : 180;
        
        const audienceRows = [
            { distance: 70, count: 14, scale: 0.9 },
            { distance: 130, count: 20, scale: 0.85 },
            { distance: 190, count: 26, scale: 0.8 },
            { distance: 250, count: 32, scale: 0.75 },
            { distance: 310, count: 38, scale: 0.7 },
            { distance: 370, count: 44, scale: 0.65 }
        ];
        
        !isLowEndDevice && audienceRows.push(
            { distance: 430, count: 50, scale: 0.6 },
            { distance: 490, count: 56, scale: 0.55 }
        );
        
        let totalAudience = 0;
        const fragment = document.createDocumentFragment();
        const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];
        
        for (const row of audienceRows) {
            if (totalAudience >= maxAudience) break;
            
            const adjustedCount = Math.min(row.count, Math.floor(row.count * window.innerWidth / 900));
            const angleStep = 360 / adjustedCount;
            
            for (let i = 0; i < adjustedCount; i++) {
                if (totalAudience >= maxAudience) break;
                
                const angle = angleStep * i;
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * row.distance;
                const y = Math.sin(radians) * (row.distance * 0.5);
                
                const posX = stageCenterX + x;
                const posY = 100 - y;
                
                if (posX >= -20 && posX <= window.innerWidth + 20 && 
                    posY >= -20 && posY <= screenHeight + 20) {
                    
                    const audience = document.createElement('div');
                    audience.className = 'audience';
                    audience.style.left = `${posX}px`;
                    audience.style.bottom = `${posY}px`;
                    audience.style.transform = `scale(${row.scale})`;
                    audience.style.opacity = Math.max(0.5, row.scale);
                    
                    if (row.distance > 250 && totalAudience % 2 === 0) {
                        audience.style.backgroundColor = '#333';
                        audience.style.height = '12px';
                        audience.style.width = '8px';
                    } else {
                        const penlight = document.createElement('div');
                        penlight.className = 'penlight';
                        
                        if (totalAudience % 3 !== 0 || row.distance <= 190) {
                            penlight.style.animationDelay = `${Math.random() * 0.8}s`;
                        } else {
                            penlight.style.animation = 'none';
                            penlight.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
                        }
                        
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];
                        penlight.style.backgroundColor = randomColor;
                        
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
        
        this.gameContainer.appendChild(fragment);
        
        if (totalAudience > 100) {
            document.querySelectorAll('.audience .penlight').forEach((penlight, i) => {
                if (i % 3 === 0) {
                    penlight.style.animation = 'none';
                    penlight.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
                }
            });
        }
    }

    /**
     * ゲームをリスタート（初期状態に戻す）
     * 最適化: 効率的なクリーンアップ処理、メモリリーク防止
     */
    restartGame() {
        this.currentLyricIndex = 0;
        this.startTime = Date.now();
        
        if (this.isPaused) {
            this.isPaused = false;
            this.playPauseBtn.textContent = '一時停止';
            
            if (!this.randomTextInterval) {
                this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
            }
        }
        
        this.score = 0;
        this.combo = 0;
        this.scoreElement.textContent = '0';
        this.comboElement.textContent = 'コンボ: 0';
        
        document.querySelectorAll('.lyric-bubble').forEach(lyric => {
            if (lyric.parentNode) {
                lyric.remove();
                this.lyricBubblePool.length < this.maxPoolSize && this.lyricBubblePool.push(lyric);
            }
        });
        
        if (this.displayedLyrics) this.displayedLyrics.clear();
        this.displayedLyricsTimestamps.clear();
        
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
        if (this.player && this.isPlayerInitialized) {
            if (position >= this.player.video.duration - 1000) {
                this.showResultsScreen();
            }
        } else if (this.lyricsData.length > 0) {
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
        if (this.resultsDisplayed) return;
        this.resultsDisplayed = true;
        
        if (this.player && this.isPlayerInitialized && this.player.isPlaying) {
            this.player.requestPause();
        }
        
        this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
        
        let rank = 'C';
        if (this.score >= 10000) rank = 'S';
        else if (this.score >= 8000) rank = 'A';
        else if (this.score >= 6000) rank = 'B';
        
        const resultsScreen = document.getElementById('results-screen');
        const finalScore = document.getElementById('final-score-display');
        const finalCombo = document.getElementById('final-combo-display');
        const rankDisplay = document.getElementById('rank-display');
        
        finalScore.textContent = this.score;
        finalCombo.textContent = `最大コンボ: ${this.maxCombo}`;
        rankDisplay.textContent = `ランク: ${rank}`;
        
        setTimeout(() => {
            resultsScreen.classList.remove('hidden');
            setTimeout(() => {
                resultsScreen.classList.add('show');
                
                for (let i = 0; i < 15; i++) {
                    setTimeout(() => {
                        const x = Math.random() * window.innerWidth;
                        const y = Math.random() * window.innerHeight;
                        this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
                    }, i * 200);
                }
            }, 100);
        }, 1500);
        
        const backToTitleBtn = document.getElementById('back-to-title');
        const replayBtn = document.getElementById('replay-song');
        
        backToTitleBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
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
        if (this.randomTextInterval) clearInterval(this.randomTextInterval);
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        if (this.player && this.isPlayerInitialized) {
            try {
                this.player.dispose();
            } catch {}
        }
        
        this.trailParticlePool = [];
        this.particlePool = [];
        this.lyricBubblePool = [];
        this.randomTextPool = [];
        
        this.mouseTrail.forEach(item => {
            item.element?.parentNode && item.element.remove();
        });
        this.mouseTrail = [];
        
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
        window.gameManager = gameManager;
        
        window.addEventListener('beforeunload', () => {
            gameManager && gameManager.cleanup();
        });
    }, 100);
});
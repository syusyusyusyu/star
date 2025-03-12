/**
 * マジカルミライ - 初音ミクのアリーナライブ (Canvas版)
 * DOMベースのゲームをCanvas APIを使って再実装
 */
 
class GameManager {
    constructor() {
        // Canvas初期化
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // UI要素
        this.playPauseBtn = document.getElementById('play-pause');
        this.restartBtn = document.getElementById('restart');
        
        // ゲーム状態初期化
        this.initGameState();
        this.setupEvents();
        
        // ローディング状態管理
        this.loadingComplete = false;
        this.resourcesLoaded = 0;
        this.totalResources = 3; // 読み込むリソースの総数（API接続、観客生成、エフェクト生成）
        this.showLoadingScreen();
        
        // アニメーションループ開始
        this.startAnimationLoop();
        
        // リソース読み込み処理の開始
        this.loadResources();
    }
    
    // Canvasサイズをウィンドウに合わせる
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    // ローディング画面表示
    showLoadingScreen() {
        this.updateLoadingProgress(0);
    }
    
    // ローディング進捗表示
    updateLoadingProgress(progress) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#39C5BB';
        this.ctx.fillText('Loading...', this.width / 2, this.height / 2 - 30);
        
        // プログレスバー背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(this.width / 2 - 100, this.height / 2 + 10, 200, 20);
        
        // プログレスバー
        this.ctx.fillStyle = '#39C5BB';
        this.ctx.fillRect(this.width / 2 - 100, this.height / 2 + 10, 200 * progress, 20);
    }
    
    // ローディング画面非表示
    hideLoadingScreen() {
        // 何もしない - 次のフレームで自然に消える
    }
    
    // リソース読み込み
    loadResources() {
        // TextAlivePlayerの初期化（非同期）
        this.initTextAlivePlayer().then(() => {
            this.resourceLoaded();
        }).catch(() => {
            this.fallbackToBasicMode();
            this.resourceLoaded();
        });
        
        // 観客生成（重い処理なので非同期で）
        setTimeout(() => {
            this.createAudience();
            this.resourceLoaded();
        }, 0);
        
        // 光エフェクト生成（同じく非同期で）
        setTimeout(() => {
            this.createLightEffects();
            this.resourceLoaded();
        }, 0);
    }
    
    // リソース読み込み完了時の処理
    resourceLoaded() {
        this.resourcesLoaded++;
        
        // ローディング進捗表示の更新
        const progress = this.resourcesLoaded / this.totalResources;
        this.updateLoadingProgress(progress);
        
        // すべてのリソースが読み込まれたらローディング完了
        if (this.resourcesLoaded >= this.totalResources) {
            this.loadingComplete = true;
            this.hideLoadingScreen();
        }
    }
    
    // ゲーム状態の初期化
    initGameState() {
        // 基本状態
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.currentLyricIndex = 0;
        this.startTime = Date.now();
        this.isPaused = false;
        this.player = null;
        this.isPlayerInitialized = false;
        this.resultsDisplayed = false;
        
        // 表示コンテンツ
        this.lyricBubbles = [];
        this.randomTexts = [];
        this.particles = [];
        this.audiences = [];
        this.lightEffects = [];
        this.mouseTrail = [];
        this.displayedLyricsTimestamps = new Set();
        
        // マウス位置
        this.mousePos = { x: 0, y: 0 };
        
        // フレームカウンター
        this.frameCount = 0;
        
        // 色設定
        this.primaryColor = '#39C5BB';
        this.accentColor = '#FF69B4';
        this.textColor = '#FFFFFF';
        
        // 曲データ
        this.apiToken = window.songConfig?.apiToken || defaultSong.apiToken;
        this.songUrl = window.songConfig?.songUrl || defaultSong.songUrl;
        this.songTitle = window.songConfig?.title || defaultSong.title;
        
        // 歌詞データ初期化
        this.initLyricsData();
        
        // ランダムテキスト初期化
        this.randomTextsList = ["ミク！", "かわいい！", "最高！", "いくよー！", "がんばれ！", 
                              "39！", "イェーイ！", "キャー！", "すごい！", "大好き！",
                              "バンザイ！", "ワーオ！", "さいこー！", "クール！", "すてき！"];
        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        
        // コンボリセットタイマー
        this.startComboResetTimer();
    }
    
    // イベントリスナーの設定
    setupEvents() {
        // ユーザー操作
        this.canvas.addEventListener('mousemove', e => {
            this.mousePos = { x: e.clientX, y: e.clientY };
            this.checkLyricsInArea(e.clientX, e.clientY, 35);
            if (this.frameCount % 2 === 0) this.createTrailParticle(e.clientX, e.clientY);
        });
        
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            this.mousePos = { x: touch.clientX, y: touch.clientY };
            this.checkLyricsInArea(touch.clientX, touch.clientY, 45);
            if (this.frameCount % 2 === 0) this.createTrailParticle(touch.clientX, touch.clientY);
        }, { passive: false });
        
        this.canvas.addEventListener('click', e => {
            this.checkLyricsInArea(e.clientX, e.clientY, 40);
            this.createTapEffect(e.clientX, e.clientY);
            if (Math.random() < 0.2) {
                const angle = Math.random() * Math.PI * 2;
                this.createShooting(e.clientX, e.clientY, Math.cos(angle) * 5, Math.sin(angle) * 5);
            }
            this.handleBodyClick();
        });
        
        // コントロールボタン
        this.playPauseBtn.addEventListener('click', () => this.handlePlayPause());
        this.restartBtn.addEventListener('click', () => this.handleRestart());
        
        // リザルト画面ボタン
        document.getElementById('back-to-title').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        document.getElementById('replay-song').addEventListener('click', () => {
            const resultsScreen = document.getElementById('results-screen');
            resultsScreen.classList.remove('show');
            resultsScreen.classList.add('hidden');
            this.restartGame();
        });
        
        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.loadingComplete) {
                this.createAudience();
            }
        });
    }
    
    // 歌詞データの初期化
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
    
    // TextAlivePlayerの初期化
    initTextAlivePlayer() {
        return new Promise((resolve, reject) => {
            if (typeof TextAliveApp === 'undefined') {
                reject('TextAliveApp not found');
                return;
            }
            
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
                                resolve();
                            } catch {
                                reject('Failed to load song');
                            }
                        }
                    },
                    onVideoReady: (video) => {
                        if (video && video.firstPhrase) this.updateLyricsFromVideo(video);
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
                    onError: () => reject('Player error')
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // API接続に失敗した場合の代替モード
    fallbackToBasicMode() {
        this.isPlayerInitialized = false;
        this.player = null;
        this.lyricsData = this.fallbackLyricsData;
        this.startLyricsTimer();
    }
    
    // TextAliveから歌詞情報を更新
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
    
    // 現在の再生位置に応じて歌詞を表示
    updateLyricsDisplay(position) {
        if (this.isPaused) return;
        
        for (let i = 0; i < this.lyricsData.length; i++) {
            const lyric = this.lyricsData[i];
            if (lyric.time <= position && lyric.time > position - 500 && 
                !this.displayedLyricsTimestamps.has(lyric.time)) {
                this.displayLyricBubble(lyric.text);
                this.displayedLyricsTimestamps.add(lyric.time);
                setTimeout(() => this.displayedLyricsTimestamps.delete(lyric.time), 8000);
            }
        }
        
        this.checkSongEnd(position);
    }
    
    // 歌詞表示用タイマー
    startLyricsTimer() {
        this.currentLyricIndex = 0;
        this.startTime = Date.now();
        
        if (this.lyricsTimerInterval) clearInterval(this.lyricsTimerInterval);
        
        this.lyricsTimerInterval = setInterval(() => {
            if (this.isPaused) return;
            
            const currentTime = Date.now() - this.startTime;
            
            while (this.currentLyricIndex < this.lyricsData.length && 
                   this.lyricsData[this.currentLyricIndex].time <= currentTime) {
                
                const lyric = this.lyricsData[this.currentLyricIndex];
                if (!this.displayedLyricsTimestamps.has(lyric.time)) {
                    this.displayLyricBubble(lyric.text);
                    this.displayedLyricsTimestamps.add(lyric.time);
                    setTimeout(() => this.displayedLyricsTimestamps.delete(lyric.time), 8000);
                }
                
                this.currentLyricIndex++;
            }
            
            if (this.currentLyricIndex >= this.lyricsData.length) {
                this.currentLyricIndex = 0;
                this.displayedLyricsTimestamps.clear();
                this.startTime = Date.now();
            }
        }, 100);
    }
    
    
    // 再生/一時停止ボタンの処理
    async handlePlayPause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.playPauseBtn.textContent = '再生';
            
            if (this.player && this.isPlayerInitialized && this.player.isPlaying) {
                try {
                    await this.player.requestPause();
                } catch {
                    // エラーを無視
                }
            }
            
            if (this.randomTextInterval) {
                clearInterval(this.randomTextInterval);
                this.randomTextInterval = null;
            }
        } else {
            this.playPauseBtn.textContent = '一時停止';
            
            if (this.player && this.isPlayerInitialized && !this.player.isPlaying) {
                try {
                    await this.player.requestPlay();
                } catch {
                    this.fallbackToBasicMode();
                }
            } else if (!this.player || !this.isPlayerInitialized) {
                this.startTime = Date.now();
            }
            
            if (!this.randomTextInterval) {
                this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
            }
        }
    }

    // リスタートボタンの処理
    async handleRestart() {
        this.restartGame();
        
        if (this.player && this.isPlayerInitialized) {
            try {
                if (this.player.isPlaying) await this.player.requestPause();
                await this.player.requestStop();
                await this.player.requestPlay();
            } catch {
                this.fallbackToBasicMode();
            }
        } else {
            this.isPaused = false;
            this.currentLyricIndex = 0;
            this.startTime = Date.now();
            this.playPauseBtn.textContent = '一時停止';
        }
    }

    // 画面クリック処理（初回再生用）
    async handleBodyClick() {
        if (!this.player || !this.isPlayerInitialized) return;
        
        if (this.player.isPlaying === false) {
            try {
                await this.player.requestPlay();
                this.isPaused = false;
                this.playPauseBtn.textContent = '一時停止';
            } catch {
                this.fallbackToBasicMode();
            }
        }
    }
    
    // 歌詞バブルを表示
    displayLyricBubble(text) {
        if (!text) return;
        
        // 既に表示済みの同じ歌詞はスキップ
        for (const bubble of this.lyricBubbles) {
            if (bubble.text === text) return;
        }
        
        // 新しい歌詞バブルのプロパティを設定
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let x, y;
        if (isMobile) {
            x = this.width * 0.15 + Math.random() * (this.width * 0.7);
            y = this.height * 0.3 + Math.random() * (this.height * 0.55);
        } else {
            x = 100 + Math.random() * (this.width - 300);
            y = this.height - 300 - Math.random() * 100;
        }
        
        // 歌詞バブルオブジェクトを作成して配列に追加
        const bubble = {
            text: text,
            x: x + (Math.random() - 0.5) * 50,
            y: y + (Math.random() - 0.5) * 50,
            opacity: 1,
            color: this.primaryColor,
            fontSize: isMobile ? 24 : 30,
            active: true,
            createdAt: Date.now()
        };
        
        this.lyricBubbles.push(bubble);
        
        // 一定時間後に削除
        setTimeout(() => {
            const index = this.lyricBubbles.indexOf(bubble);
            if (index !== -1) {
                this.lyricBubbles.splice(index, 1);
            }
        }, 8000);
    }

    // ランダムテキスト（観客のコール）を作成
    createRandomText() {
        if (this.isPaused) return;
        
        // Limit random text creation on low-end devices or when too many exist
        const isLowEndDevice = navigator.hardwareConcurrency <= 4 || 
                              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if ((isLowEndDevice && this.randomTexts.length > 10) || this.randomTexts.length > 25) return;
        
        const text = this.randomTextsList[Math.floor(Math.random() * this.randomTextsList.length)];
        const x = Math.random() * this.width * 0.8 + this.width * 0.1;
        const y = this.height - Math.random() * 200;
        
        const randomText = {
            text: text,
            x: x,
            y: y,
            opacity: 0.5 + Math.random() * 0.5,
            fontSize: 14 + Math.random() * 12,
            rotation: -20 + Math.random() * 40,
            createdAt: Date.now()
        };
        
        this.randomTexts.push(randomText);
        
        setTimeout(() => {
            const index = this.randomTexts.indexOf(randomText);
            if (index !== -1) {
                this.randomTexts.splice(index, 1);
            }
        }, 6000);
    }

    // 指定された座標を中心とする円形の領域内にある歌詞要素をチェック
    checkLyricsInArea(x, y, radius) {
        let detected = false;
        const radiusSquared = radius * radius;
        
        for (let i = 0; i < this.lyricBubbles.length; i++) {
            const bubble = this.lyricBubbles[i];
            if (!bubble.active) continue;
            
            const dx = x - bubble.x;
            const dy = y - bubble.y;
            const distanceSquared = dx * dx + dy * dy;
            const textWidth = this.ctx.measureText(bubble.text).width;
            const combinedRadius = radius + Math.max(textWidth, bubble.fontSize) / 2;
            
            if (distanceSquared <= combinedRadius * combinedRadius) {
                this.clickLyric(bubble);
                detected = true;
                // ヒットエフェクトを削除
            }
        }
        
        return detected;
    }

    // 歌詞要素がクリックされた時の処理
    clickLyric(bubble) {
        if (!bubble.active) return;
        
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const comboBonus = Math.floor(this.combo / 5) + 1;
        const points = 100 * comboBonus;
        this.score += points;
        
        bubble.color = '#FFFF00'; // 黄色に変更
        bubble.active = false;
        
        // スコア表示エフェクト
        const pointDisplay = {
            text: `+${points}`,
            x: bubble.x,
            y: bubble.y,
            color: '#FFFF00',
            opacity: 1,
            fontSize: 24,
            createdAt: Date.now()
        };
        
        this.particles.push(pointDisplay);
        
        // パーティクルエフェクトは削除（シンプル化のため）
        
        this.lastScoreTime = Date.now();
    }

    // コンボをリセットするタイマー
    startComboResetTimer() {
        this.lastScoreTime = Date.now();
        
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        
        this.comboResetTimer = setInterval(() => {
            if (Date.now() - this.lastScoreTime > 30000 && this.combo > 0) {
                this.combo = 0;
            }
        }, 1000);
    }

    // 観客を作成
    createAudience() {
        this.audiences = [];
        
        const stageCenterX = this.width / 2;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
        
        const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];
        let totalAudience = 0;
        
        for (const row of audienceRows) {
            if (totalAudience >= maxAudience) break;
            
            const adjustedCount = Math.min(row.count, Math.floor(row.count * this.width / 900));
            const angleStep = 360 / adjustedCount;
            
            for (let i = 0; i < adjustedCount; i++) {
                if (totalAudience >= maxAudience) break;
                
                const angle = angleStep * i;
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * row.distance;
                const y = Math.sin(radians) * (row.distance * 0.5);
                
                const posX = stageCenterX + x;
                const posY = 100 - y;
                
                if (posX >= -20 && posX <= this.width + 20 && 
                    posY >= -20 && posY <= this.height + 20) {
                    
                    const hasPenlight = row.distance <= 250 || totalAudience % 2 !== 0;
                    const penlightColor = colors[Math.floor(Math.random() * colors.length)];
                    const penlightAngle = Math.random() * 20 - 10;
                    const isWaving = totalAudience % 3 !== 0 || row.distance <= 190;
                    
                    this.audiences.push({
                        x: posX,
                        y: this.height - posY,
                        scale: row.scale,
                        hasPenlight: hasPenlight,
                        penlightColor: penlightColor,
                        penlightAngle: penlightAngle,
                        isWaving: isWaving,
                        wavePhase: Math.random() * Math.PI * 2
                    });
                    
                    totalAudience++;
                }
            }
        }
    }

    // 照明などの光エフェクトを作成
    createLightEffects() {
        this.lightEffects = [];
        
        // スポットライト
        for (let i = 0; i < 3; i++) {
            this.lightEffects.push({
                type: 'spotlight',
                x: (i * 0.3 + 0.2) * this.width,
                y: this.height,
                angleOffset: i * -2.5,
                size: Math.min(this.width * 0.3, 300)
            });
        }
        
        // 星のような光エフェクト
        const isLowEndDevice = navigator.hardwareConcurrency <= 4 || 
                              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const lightCount = isLowEndDevice ? 15 : 30;
        
        for (let i = 0; i < lightCount; i++) {
            this.lightEffects.push({
                type: 'light',
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() > 0.7 ? 6 : 4,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.5 + Math.random() * 2
            });
        }
    }

    // タップエフェクトを作成
    createTapEffect(x, y) {
        const ripple = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: 50,
            opacity: 0.5,
            color: 'rgba(255, 255, 255, 0.4)',
            createdAt: Date.now()
        };
        
        this.particles.push(ripple);
    }

    // 流れ星エフェクトを作成
    createShooting(x, y, dx, dy) {
        if (dx === 0 && dy === 0) {
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle) * 5;
            dy = Math.sin(angle) * 5;
        }
        
        const meteorSize = 15 + Math.random() * 15;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const meteor = {
            x: x,
            y: y,
            dx: dx,
            dy: dy,
            size: meteorSize,
            angle: angle,
            opacity: 1,
            createdAt: Date.now()
        };
        
        this.particles.push(meteor);
    }

    // マウス/指の軌跡を表現するパーティクル
    createTrailParticle(x, y) {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && Math.random() > 0.5) return;
        
        const size = 20 + Math.random() * 40;
        const hue = Math.floor(Math.random() * 360);
        
        const particle = {
            x: x,
            y: y,
            size: size,
            color: `hsla(${hue}, 100%, 70%, 0.8)`,
            rotation: Math.random() * 360,
            opacity: 1,
            createdAt: Date.now()
        };
        
        this.mouseTrail.push(particle);
        
        // 古いパーティクルを削除
        const now = Date.now();
        const trailLifetime = 600;
        
        this.mouseTrail = this.mouseTrail.filter(p => now - p.createdAt <= trailLifetime);
        
        while (this.mouseTrail.length > 10) {
            this.mouseTrail.shift();
        }
    }

    // 曲終了時にリザルト画面を表示
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

    // リザルト画面を表示
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
            resultsScreen.classList.add('show');
            
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    const x = Math.random() * this.width;
                    const y = Math.random() * this.height;
                    this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
                }, i * 200);
            }
        }, 1500);
    }

    // ゲームをリスタート
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
        this.maxCombo = 0;
        
        this.lyricBubbles = [];
        this.particles = [];
        this.mouseTrail = [];
        this.displayedLyricsTimestamps.clear();
        
        this.resultsDisplayed = false;
    }

    // アニメーションループを開始
    startAnimationLoop() {
        // パフォーマンス最適化のためデバイス性能をチェック
        const isLowEndDevice = navigator.hardwareConcurrency <= 4 || 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let lastTimestamp = 0;
        const targetFPS = isLowEndDevice ? 30 : 60;
        const frameInterval = 1000 / targetFPS;
        
        const animate = (timestamp) => {
            const elapsed = timestamp - lastTimestamp;
            
            if (elapsed > frameInterval) {
                lastTimestamp = timestamp - (elapsed % frameInterval);
                
                this.frameCount++;
                
                // フレームスキップ処理
                if (isLowEndDevice && 
                    (this.particles.length > 50 || this.lyricBubbles.length > 30) && 
                    this.frameCount % 2 !== 0) {
                    requestAnimationFrame(animate);
                    return;
                }
                
                this.ctx.clearRect(0, 0, this.width, this.height);
                
                if (!this.loadingComplete) {
                    this.updateLoadingProgress(this.resourcesLoaded / this.totalResources);
                } else {
                    this.drawBackground();
                    this.drawLightEffects();
                    this.drawAudience();
                    this.drawStage();
                    this.drawMiku();
                    this.drawLyricBubbles();
                    this.drawRandomTexts();
                    this.drawParticles();
                    this.drawMouseTrail();
                    this.drawUI();
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    // 背景を描画
    drawBackground() {
        // グラデーション背景
        const bgGradient = this.ctx.createRadialGradient(
            this.width / 2, this.height,
            0,
            this.width / 2, this.height,
            this.height * 1.5
        );
        bgGradient.addColorStop(0, '#1B2735');
        bgGradient.addColorStop(1, '#090A0F');
        
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // アクセントグラデーション - 難易度に関係なく固定色を使用
        const bgAccent = this.ctx.createRadialGradient(
            this.width * 0.8, this.height * 0.2,
            0,
            this.width * 0.8, this.height * 0.2,
            this.width * 0.7
        );
        bgAccent.addColorStop(0, 'rgba(57, 197, 187, 0.15)'); // 固定色に変更
        bgAccent.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = bgAccent;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 照明エフェクトを描画
    drawLightEffects() {
        // 現在の時間に基づいた回転角度
        const now = Date.now() / 1000;
        
        for (const light of this.lightEffects) {
            if (light.type === 'spotlight') {
                // スポットライト
                const angle = (now * 45 + light.angleOffset) % 360;
                const radians = angle * Math.PI / 180;
                
                this.ctx.save();
                this.ctx.translate(light.x, light.y);
                this.ctx.rotate(radians);
                
                // スポットライトの光の三角形
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-light.size/2, -light.size);
                this.ctx.lineTo(light.size/2, -light.size);
                this.ctx.closePath();
                
                const gradient = this.ctx.createLinearGradient(0, 0, 0, -light.size);
                gradient.addColorStop(0, 'rgba(57, 197, 187, 0.3)');
                gradient.addColorStop(1, 'rgba(57, 197, 187, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.restore();
            } else {
                // 星のような光エフェクト
                const twinkle = 0.2 + 0.6 * (Math.sin(now * light.twinkleSpeed + light.twinklePhase) + 1) / 2;
                const size = light.size * (1 + 0.5 * twinkle);
                
                this.ctx.beginPath();
                this.ctx.arc(light.x, light.y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                this.ctx.shadowBlur = size * 1.5;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    // 観客を描画
    drawAudience() {
        for (const audience of this.audiences) {
            // 観客の体
            this.ctx.fillStyle = '#333';
            this.ctx.beginPath();
            this.ctx.ellipse(
                audience.x, 
                audience.y - 15 * audience.scale, 
                7.5 * audience.scale, 
                12.5 * audience.scale, 
                0, 0, Math.PI, true
            );
            this.ctx.fill();
            
            // 観客の影
            this.ctx.fillStyle = '#222';
            this.ctx.beginPath();
            this.ctx.ellipse(
                audience.x, 
                audience.y, 
                10 * audience.scale, 
                4 * audience.scale, 
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
            
            // ペンライト
            if (audience.hasPenlight) {
                const now = Date.now() / 1000;
                let penlightAngle = audience.penlightAngle;
                
                if (audience.isWaving) {
                    penlightAngle += Math.sin(now * 5 + audience.wavePhase) * 30;
                }
                
                const radians = penlightAngle * Math.PI / 180;
                const penlightLength = 15 * audience.scale;
                const startX = audience.x;
                const startY = audience.y - 25 * audience.scale;
                const endX = startX + Math.sin(radians) * penlightLength;
                const endY = startY - Math.cos(radians) * penlightLength;
                
                this.ctx.lineWidth = 4 * audience.scale;
                this.ctx.strokeStyle = audience.penlightColor;
                this.ctx.shadowColor = audience.penlightColor;
                this.ctx.shadowBlur = audience.y < this.height - 200 ? 0 : 10 * audience.scale;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                
                this.ctx.shadowBlur = 0;
            }
        }
    }

    // ステージを描画
    drawStage() {
        // ステージの光
        const stageGlow = this.ctx.createRadialGradient(
            this.width / 2, this.height, 0,
            this.width / 2, this.height, 200
        );
        stageGlow.addColorStop(0, 'rgba(57, 197, 187, 0.3)');
        stageGlow.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = stageGlow;
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.width / 2,
            this.height, 
            300,
            200,
            0, Math.PI, 0, true
        );
        this.ctx.fill();
        
        // ステージ本体
        const stageGradient = this.ctx.createRadialGradient(
            this.width / 2, this.height - 40, 0,
            this.width / 2, this.height - 40, 150
        );
        stageGradient.addColorStop(0, this.primaryColor);
        stageGradient.addColorStop(1, '#1a1a2e');
        
        this.ctx.fillStyle = stageGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.width / 2,
            this.height, 
            150,
            80,
            0, Math.PI, 0, true
        );
        this.ctx.fill();
        
        // ステージの輝き
        this.ctx.shadowColor = 'rgba(57, 197, 187, 0.8)';
        this.ctx.shadowBlur = 30;
        this.ctx.strokeStyle = 'rgba(57, 197, 187, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.width / 2,
            this.height, 
            150,
            80,
            0, Math.PI, 0, true
        );
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    // ミクを描画
    drawMiku() {
        const now = Date.now();
        const bounce = Math.sin(now / 500) * 10; // ダンスアニメーション
        
        const mikuWidth = 120;
        const mikuHeight = 160;
        const mikuX = this.width / 2 - mikuWidth / 2;
        const mikuY = this.height - 80 - mikuHeight + bounce;
        
        // 体 (青緑色の長方形)
        this.ctx.fillStyle = this.primaryColor;
        this.ctx.fillRect(mikuX + 30, mikuY + 30, 40, 60);
        
        // 頭 (白い円)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(mikuX + 50, mikuY + 20, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 左腕 (青緑色の長方形)
        this.ctx.fillStyle = this.primaryColor;
        this.ctx.fillRect(mikuX + 20, mikuY + 15, 15, 60);
        
        // 右腕 (青緑色の長方形)
        this.ctx.fillStyle = this.primaryColor;
        this.ctx.fillRect(mikuX + 65, mikuY + 15, 15, 60);
        
        // 左足 (黒い長方形)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(mikuX + 35, mikuY + 90, 10, 40);
        
        // 右足 (黒い長方形)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(mikuX + 55, mikuY + 90, 10, 40);
    }

    // 歌詞バブルを描画
    drawLyricBubbles() {
        for (const bubble of this.lyricBubbles) {
            if (bubble.opacity <= 0) continue;
            
            this.ctx.font = `bold ${bubble.fontSize}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // テキストに輝きを追加
            this.ctx.shadowColor = 'rgba(57, 197, 187, 0.8)';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = bubble.color;
            
            // 歌詞テキストを描画
            this.ctx.fillText(bubble.text, bubble.x, bubble.y);
            this.ctx.shadowBlur = 0;
            
            // マウスが近くにある場合、拡大表示
            if (this.mousePos) {
                const dx = this.mousePos.x - bubble.x;
                const dy = this.mousePos.y - bubble.y;
                const distSquared = dx * dx + dy * dy;
                
                if (distSquared < 2500 && bubble.active) {
                    // マウスホバー効果
                    this.ctx.font = `bold ${bubble.fontSize * 1.3}px sans-serif`;
                    this.ctx.shadowColor = 'rgba(57, 197, 187, 1)';
                    this.ctx.shadowBlur = 15;
                    this.ctx.fillStyle = this.primaryColor;
                    this.ctx.fillText(bubble.text, bubble.x, bubble.y);
                    this.ctx.shadowBlur = 0;
                }
            }
            
            // アニメーション（上に浮かび上がる）
            const age = (Date.now() - bubble.createdAt) / 8000;
            bubble.y -= 0.5;
            
            if (age > 0.9) {
                bubble.opacity = 1 - ((age - 0.9) * 10);
            }
        }
    }

    // ランダムテキストを描画
    drawRandomTexts() {
        for (const text of this.randomTexts) {
            const age = (Date.now() - text.createdAt) / 6000;
            
            this.ctx.save();
            this.ctx.translate(text.x, text.y);
            this.ctx.rotate(text.rotation * Math.PI / 180);
            
            this.ctx.font = `${text.fontSize}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${text.opacity * (1 - age)})`;
            
            this.ctx.fillText(text.text, 0, 0);
            
            this.ctx.restore();
            
            // 上に浮かび上がる
            text.y -= 0.8;
        }
    }

    // パーティクルを描画
    drawParticles() {
        const now = Date.now();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const age = (now - p.createdAt) / 800;
            
            if (age >= 1) {
                this.particles.splice(i, 1);
                continue;
            }
            
            if (p.text) {
                // スコア表示パーティクル
                this.ctx.font = `bold ${p.fontSize}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = p.color.replace('1)', `${1 - age})`);
                this.ctx.fillText(p.text, p.x, p.y - 50 * age);
            } else if (p.radius !== undefined) {
                // 円形のリップルエフェクト
                const radius = p.radius + (p.maxRadius - p.radius) * age;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace('0.5)', `${0.5 * (1 - age)})`);
                this.ctx.fill();
            } else if (p.angle !== undefined) {
                // 流れ星
                this.ctx.save();
                this.ctx.translate(p.x + p.dx * age * 10, p.y + p.dy * age * 10);
                this.ctx.rotate(p.angle * Math.PI / 180);
                
                const gradient = this.ctx.createRadialGradient(
                    p.size * 0.3, p.size * 0.3, 0,
                    p.size * 0.3, p.size * 0.3, p.size
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 220, 0.8)');
                gradient.addColorStop(0.8, 'transparent');
                
                this.ctx.fillStyle = gradient;
                this.ctx.globalAlpha = 1 - age;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * (1 - age * 0.5), 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowColor = 'rgba(255, 255, 220, 0.8)';
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * 0.5 * (1 - age * 0.5), 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                this.ctx.restore();
            } else {
                // 通常のパーティクル
                this.ctx.beginPath();
                this.ctx.arc(p.x + p.vx * age * 20, p.y + p.vy * age * 20, p.size * (1 - age * 0.5), 0, Math.PI * 2);
                this.ctx.fillStyle = p.color.replace('1)', `${1 - age})`);
                this.ctx.fill();
            }
        }
    }

    // マウス軌跡を描画
    drawMouseTrail() {
        const now = Date.now();
        
        for (const particle of this.mouseTrail) {
            const age = (now - particle.createdAt) / 600;
            if (age >= 1) continue;
            
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            
            // 星型のクリッピングパス
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                const length = particle.size / 2;
                const x = Math.cos(angle) * length;
                const y = Math.sin(angle) * length;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
                
                const innerAngle = angle + Math.PI / 5;
                const innerLength = length * 0.4;
                const innerX = Math.cos(innerAngle) * innerLength;
                const innerY = Math.sin(innerAngle) * innerLength;
                
                this.ctx.lineTo(innerX, innerY);
            }
            this.ctx.closePath();
            
            this.ctx.fillStyle = particle.color.replace('0.8)', `${0.8 * (1 - age)})`);
            this.ctx.shadowColor = particle.color.replace('0.8)', '0.6)');
            this.ctx.shadowBlur = 12;
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    // UI要素を描画
    drawUI() {
        // スコア表示
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        this.ctx.shadowColor = this.primaryColor;
        this.ctx.shadowBlur = 10;
        
        // スコア
        this.ctx.font = 'bold 32px sans-serif';
        this.ctx.fillStyle = this.textColor;
        this.ctx.fillText(this.score.toString(), this.width - 20, 20);
        
        // コンボ
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.shadowColor = this.accentColor;
        this.ctx.fillText(`コンボ: ${this.combo}`, this.width - 20, 60);
        
        // 曲情報
        this.ctx.textAlign = 'left';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.shadowColor = this.primaryColor;
        this.ctx.fillText(this.songTitle, 20, 20);
        
    }

    // リソース解放とクリーンアップ
    cleanup() {
        if (this.randomTextInterval) clearInterval(this.randomTextInterval);
        if (this.comboResetTimer) clearInterval(this.comboResetTimer);
        if (this.lyricsTimerInterval) clearInterval(this.lyricsTimerInterval);
        
        if (this.player && this.isPlayerInitialized) {
            try {
                this.player.dispose();
            } catch {}
        }
        
        this.lyricBubbles = [];
        this.randomTexts = [];
        this.particles = [];
        this.mouseTrail = [];
        this.audiences = [];
        this.lightEffects = [];
    }
}

// GameManager初期化（ローダースクリプトで行われる）
window.addEventListener('load', () => {
    if (!window.gameManager && typeof GameManager === 'function') {
        window.gameManager = new GameManager();
    }
});
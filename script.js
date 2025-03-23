/**
 * ボイスアイドル・ミュージックゲーム - 内部処理のみ最適化版
 */
class GameManager {
  constructor() {
    this.apiToken = window.songConfig?.apiToken;
    this.songUrl = window.songConfig?.songUrl;
    this.score = this.combo = this.maxCombo = 0;
    this.startTime = Date.now();
    this.isPlaying = this.isPlayerInit = false;
    this.isFirstInteraction = true;
    this.player = null;
    this.isMobile = /Android|iPhone/.test(navigator.userAgent);
    this.activeChars = new Set();
    this.displayedLyrics = new Set();
    this.mouseTrail = [];
    this.maxTrailLength = 15;
    this.lastMousePos = { x: 0, y: 0 };
    this.apiLoaded = false; // APIがロード完了したかを追跡
    this.initialDelayCompleted = false; // 初期遅延が完了したかどうか
    
    // シンプルな全画面オーバーレイを作成
    this.createSimpleOverlay();
    
    // 内部処理用のグループサイズを設定
    this.groupSize = 5;
    
    // モバイルブラウザのビューポート処理
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    
    [this.gamecontainer, this.scoreEl, this.comboEl, this.playpause, this.restart, this.loading] = 
      ['game-container', 'score', 'combo', 'play-pause', 'restart', 'loading'].map(id => document.getElementById(id));
    
    // 初期状態ではすべてのボタンを読み込み中と表示し、無効化
    this.isPaused = true;
    if (this.playpause) {
      this.playpause.textContent = '読み込み中...';
      this.playpause.disabled = true;
      this.playpause.style.opacity = '0.5';
      this.playpause.style.cursor = 'not-allowed';
    }
    if (this.restart) {
      this.restart.textContent = '読み込み中...';
      this.restart.disabled = true;
      this.restart.style.opacity = '0.5';
      this.restart.style.cursor = 'not-allowed';
    }
    
    // Songle APIのコンソールメッセージを表示するための短い遅延
    // 読み込み状態に関わらず、一定時間後にコントロールを有効化する
    this.setupDelayedInitialization();
    
    this.setupEvents();
    this.createLightEffects();
    this.initGame();
    this.initPlayer();
    
    // 自動再生の問題を解決するため、一度全ての要素にクリックイベントを設定
    this.gamecontainer.style.cursor = 'pointer';
    this.gamecontainer.style.userSelect = 'none';
    document.body.style.cursor = 'pointer';
    
    // 最初のクリック/タップを待つ構造
    const startGame = (e) => {
      if (!this.isFirstInteraction || !this.initialDelayCompleted) return;
      
      // 重複実行防止
      this.isFirstInteraction = false;
      this.gamecontainer.style.cursor = '';
      document.body.style.cursor = '';
      
      // ゲーム初期化
      this.playMusic();
      
      // イベントリスナーを削除
      document.body.removeEventListener('click', startGame);
      document.body.removeEventListener('touchend', startGame);
    };
    
    // document全体にイベント設定（より確実にキャプチャ）
    document.body.addEventListener('click', startGame);
    document.body.addEventListener('touchend', startGame);
  }

  // 一定時間後にコントロールを有効化する
  setupDelayedInitialization() {
    // 短い遅延でSongle APIのメッセージが表示されるチャンスを与える
    setTimeout(() => {
      console.log("初期遅延が完了しました");
      this.initialDelayCompleted = true;
      
      // APIのロード状態に関わらず、ユーザーインタラクションを可能にする
      this.enableControls();
      
      // まだAPIがロードされていない場合は、fallbackモードを検討
      if (!this.apiLoaded) {
        console.log("APIのロードに時間がかかっています。代替モードの準備をしています...");
        // バックアップとして、さらに10秒後にfallbackモードに切り替える
        setTimeout(() => {
          if (!this.apiLoaded) {
            console.log("APIのロードがタイムアウトしました。代替モードに切り替えます。");
            this.fallback();
          }
        }, 10000); // 10秒後
      }
    }, 3000); // 3秒間の初期遅延
  }

  // コントロールを有効化
  enableControls() {
    // すべてのボタンを有効化して通常表示に戻す
    if (this.playpause) {
      this.playpause.disabled = false;
      this.playpause.style.opacity = '1';
      this.playpause.style.cursor = 'pointer';
      this.playpause.textContent = '再生';
    }
    if (this.restart) {
      this.restart.disabled = false;
      this.restart.style.opacity = '1';
      this.restart.style.cursor = 'pointer';
      this.restart.textContent = '最初から';
    }
    
    if (this.loading) this.loading.textContent = "準備完了 - クリックして開始";
    
    // オーバーレイを削除
    this.removeOverlay();
  }

  // シンプルな全画面オーバーレイを作成
  createSimpleOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'loading-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.overlay.style.zIndex = '10000';
    this.overlay.style.display = 'flex';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.justifyContent = 'center';
    this.overlay.style.color = '#39C5BB';
    this.overlay.style.fontSize = '24px';
    this.overlay.style.fontWeight = 'bold';
    
    const loadingText = document.createElement('div');
    loadingText.textContent = '読み込み中...';
    this.overlay.appendChild(loadingText);
    
    document.body.appendChild(this.overlay);
  }
  
  // オーバーレイを削除
  removeOverlay() {
    if (this.overlay && document.body.contains(this.overlay)) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // プレーヤー操作を安全に行うヘルパーメソッド
  async safePlayerOperation(operation, errorMessage = "Player operation error", fallbackAction = null) {
    if (!this.player || !this.isPlayerInit) {
      if (fallbackAction) fallbackAction();
      return false;
    }
    
    try {
      const result = await operation();
      return true;
    } catch (e) {
      console.error(`${errorMessage}: ${e.message}`, e);
      if (fallbackAction) fallbackAction();
      return false;
    }
  }

  async playMusic() {
    if (this._processing) return;
    this._processing = true;
    
    try {
      this.isPaused = false;
      this.playpause.textContent = '一時停止';
      
      // テキストアライブプレーヤーを使用
      if (this.player && this.isPlayerInit) {
        console.log("プレーヤーを使って音楽を再生します");
        // 再生をPromiseとして処理する
        const success = await this.safePlayerOperation(
          () => this.player.requestPlay(),
          "Player play error",
          () => {
            console.log("プレーヤーでエラーが発生しました。代替モードに切り替えます");
            this.fallback();
            this.startLyricsTimer();
          }
        );
        
        if (!success) {
          console.error("Failed to play music");
        }
      } else {
        console.log("代替モードで再生します");
        // フォールバックモードですでに初期化済みの場合
        this.startTime = Date.now();
        this.startLyricsTimer();
      }
      
      // ランダムテキスト表示開始
      if (!this.randomTextInterval) {
        this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
      }
      
      // 最初のロード表示を非表示にする
      if (this.loading) {
        this.loading.style.opacity = '0';
        setTimeout(() => {
          if (this.loading && this.loading.parentNode) {
            this.loading.parentNode.removeChild(this.loading);
          }
        }, 1000);
      }
    } finally {
      setTimeout(() => this._processing = false, 800);
    }
  }

  setupEvents() {
    let lastTime = 0, lastX = 0, lastY = 0;
    let touched = false;
    
    const handleMove = (x, y, isTouch) => {
      const now = Date.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      const dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx*dx + dy*dy) >= 3) {
        lastX = x; lastY = y;
        this.lastMousePos = { x, y };
        this.checkLyrics(x, y, isTouch ? 45 : 35);
        
        // 星を常に生成する（初回インタラクション後のみ）
        if (!this.isFirstInteraction) {
          this.createTrailParticle(x, y);
          if (Math.random() < (isTouch ? 0.03 : 0.01)) {
            this.createShooting(x, y, dx, dy);
          }
        }
      }
    };
    
    this.gamecontainer.addEventListener('mousemove', e => {
      if (!touched) handleMove(e.clientX, e.clientY, false);
    });
    
    // タッチイベントの最適化
    this.gamecontainer.addEventListener('touchstart', e => {
      touched = true;
      if (e.touches && e.touches[0]) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, {passive: true});
    
    this.gamecontainer.addEventListener('touchmove', e => {
      if (!this.isFirstInteraction && e.touches && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, {passive: false});
    
    this.gamecontainer.addEventListener('touchend', () => {
      setTimeout(() => { touched = false; }, 300);
    }, {passive: true});
    
    // クリック/タップイベント
    this.gamecontainer.addEventListener('click', e => {
      if (this.isFirstInteraction) return;
      
      this.checkLyrics(e.clientX, e.clientY, 35);
      if (Math.random() < 0.2) {
        const angle = Math.random() * Math.PI * 2;
        this.createShooting(e.clientX, e.clientY, Math.cos(angle) * 5, Math.sin(angle) * 5);
      }
    });
    
    // ボタンのクリックイベント
    const handleButtonClick = (event) => {
      if (event) {
        event.preventDefault();
      }
      
      // 初期遅延が完了していない場合は何もしない
      if (!this.initialDelayCompleted) return;
      
      if (this.isFirstInteraction) {
        this.playMusic();
        this.isFirstInteraction = false;
        return;
      }
      this.togglePlay();
    };
    
    this.playpause.addEventListener('click', handleButtonClick);
    this.playpause.addEventListener('touchend', handleButtonClick, {passive: false});
    
    const handleRestartClick = (event) => {
      if (event) {
        event.preventDefault();
      }
      
      // 初期遅延が完了していない場合は何もしない
      if (!this.initialDelayCompleted) return;
      
      this.restartGame();
    };
    
    this.restart.addEventListener('click', handleRestartClick);
    this.restart.addEventListener('touchend', handleRestartClick, {passive: false});
  }

  initGame() {
    this.createStars();
    this.createAudience();
    this.lyricsData = [];
    
    // フォールバック用のデータ
    const fallbackText = "マジカルミライ初音ミク";
    // 内部管理用にグループ化（表示時に分解）
    this.fallbackLyricsData = [];
    for (let i = 0; i < fallbackText.length; i += this.groupSize) {
      const group = fallbackText.substring(i, Math.min(i + this.groupSize, fallbackText.length));
      this.fallbackLyricsData.push({
        time: 1000 + Math.floor(i / this.groupSize) * 1500, // 時間間隔を広げる
        text: group,
        originalChars: Array.from(group).map((c, idx) => ({
          text: c,
          timeOffset: idx * 100 // 各文字に少しずつオフセットを付ける
        }))
      });
    }
    
    this.randomTexts = ["ミク！", "かわいい！", "最高！", "39！", "イェーイ！"];
    this.randomTextInterval = null;
    
    this.comboResetTimer = setInterval(() => {
      if (Date.now() - (this.lastScoreTime || 0) > 30000 && this.combo > 0) {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
    }, 1000);
  }

  createStars() {
    const starCount = Math.min(30, Math.floor(window.innerWidth * window.innerHeight / 10000));
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'light-effect';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      if (Math.random() > 0.7) {
        star.style.width = '6px';
        star.style.height = '6px';
        star.style.boxShadow = '0 0 10px #fff';
      }
      this.gamecontainer.appendChild(star);
    }
  }

  createLightEffects() {
    for (let i = 0; i < 3; i++) {
      const spotlight = document.createElement('div');
      spotlight.className = 'spotlight';
      spotlight.style.left = `${(i * 30) + 20}%`;
      spotlight.style.animationDelay = `${i * -2.5}s`;
      this.gamecontainer.appendChild(spotlight);
    }
  }

  async togglePlay() {
    if (this._processing) return;
    this._processing = true;
    try {
      this.isPaused = !this.isPaused;
      this.playpause.textContent = this.isPaused ? '再生' : '一時停止';
      
      if (this.isPaused) {
        if (this.player?.isPlaying) {
          await this.safePlayerOperation(
            () => this.player.requestPause(),
            "Pause error"
          );
        }
        clearInterval(this.randomTextInterval);
        this.randomTextInterval = null;
      } else {
        if (this.player?.isPlaying === false) {
          await this.safePlayerOperation(
            () => this.player.requestPlay(),
            "Play error",
            () => this.fallback()
          );
        }
        else if (!this.player) this.startTime = Date.now() - (this.lyricsData[this.currentLyricIndex]?.time || 0);
        if (!this.randomTextInterval) this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
      }
    } finally {
      setTimeout(() => this._processing = false, 800);
    }
  }

  async restartGame() {
    if (this._processing) return;
    this._processing = true;
    this.score = this.combo = this.currentLyricIndex = 0;
    this.startTime = Date.now();
    this.isPaused = false;
    this.scoreEl.textContent = '0';
    this.comboEl.textContent = 'コンボ: 0';
    
    document.querySelectorAll('.lyric-bubble').forEach(l => l.remove());
    this.displayedLyrics.clear();
    
    try {
      if (this.player) {
        // まずは一時停止
        if (this.player.isPlaying) {
          await this.safePlayerOperation(
            () => this.player.requestPause(),
            "Pause error"
          );
          // 操作間の遅延を追加
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 次に停止
        await this.safePlayerOperation(
          () => this.player.requestStop(),
          "Stop error"
        );
        // 操作間の遅延を追加
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 最後に再生
        await this.safePlayerOperation(
          () => this.player.requestPlay(),
          "Play error",
          () => this.fallback()
        );
      }
      this.playpause.textContent = '一時停止';
    } finally {
      setTimeout(() => this._processing = false, 1500);
    }
  }

  initPlayer() {
    if (typeof TextAliveApp === 'undefined') {
      console.log("TextAliveが見つかりません。代替モードで起動します");
      if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
      this.fallback();
      return;
    }
    
    try {
      console.log("プレーヤーを初期化します");
      
      this.player = new TextAliveApp.Player({
        app: { token: this.apiToken },
        mediaElement: document.createElement('audio')
      });
      document.body.appendChild(this.player.mediaElement);
      this.isPlayerInit = true;
      
      this.player.addListener({
        onAppReady: (app) => {
          console.log("アプリの準備ができました");
          if (app && !app.managed) {
            console.log("曲URLからプレーヤーを作成します:", this.songUrl);
            this.player.createFromSongUrl(this.songUrl)
              .catch(error => {
                console.error("Song URL creation error:", error);
                this.fallback();
              });
          }
        },
        onVideoReady: (video) => {
          console.log("ビデオの準備ができました");
          if (video?.firstPhrase) this.processLyrics(video);
          
          // APIロード完了を記録
          if (this.loading) this.loading.textContent = "準備中...";
          
          // 完全なセットアップのために追加の待機時間を設ける
          setTimeout(() => {
            console.log("API読み込み完了");
            this.apiLoaded = true; // ここでAPIロード完了フラグを設定
            
            // 初期遅延が既に完了している場合は、ボタンを有効化
            if (this.initialDelayCompleted) {
              this.enableControls();
            }
          }, 1000); // 1秒の追加待機時間
        },
        onTimeUpdate: (pos) => {
          if (!this.isPaused) this.updateLyrics(pos);
        },
        onPlay: () => {
          console.log("プレーヤーが再生を開始しました");
          this.isPaused = false;
          this.playpause.textContent = '一時停止';
          if (!this.randomTextInterval) {
            this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
          }
        },
        onPause: () => {
          console.log("プレーヤーが一時停止しました");
          this.isPaused = true;
          this.playpause.textContent = '再生';
          clearInterval(this.randomTextInterval);
          this.randomTextInterval = null;
        },
        onStop: () => {
          console.log("プレーヤーが停止しました");
          this.isPaused = true;
          this.playpause.textContent = '再生';
          this.restartGame();
        },
        onError: (e) => {
          console.error("Player error:", e);
          this.fallback();
        }
      });
    } catch (error) {
      console.error("Player initialization error:", error);
      this.fallback();
    }
  }

  fallback() {
    console.log("代替モードに切り替えます");
    this.isPlayerInit = false;
    this.player = null;
    
    if (this.loading) this.loading.textContent = "代替モードで準備中...";
    this.lyricsData = this.fallbackLyricsData;
    
    // 同様に待機時間を設ける
    setTimeout(() => {
      console.log("代替モードの準備が完了しました");
      this.apiLoaded = true; // ここでAPIロード完了フラグを設定
      
      // 初期遅延が既に完了している場合は、ボタンを有効化
      if (this.initialDelayCompleted) {
        this.enableControls();
      }
    }, 1000); // 1秒の待機時間
  }
  
  // 内部処理では5文字ずつグループ化、表示時には1文字ずつ
  processLyrics(video) {
    try {
      console.log("歌詞を処理しています");
      // まず全ての文字データを収集
      const allCharData = [];
      let phrase = video.firstPhrase;
      
      while (phrase) {
        let word = phrase.firstWord;
        while (word) {
          let char = word.firstChar;
          while (char) {
            allCharData.push({
              time: char.startTime,
              text: char.text
            });
            char = char.next;
          }
          word = word.next;
        }
        phrase = phrase.next;
      }
      
      // 時間順にソート
      allCharData.sort((a, b) => a.time - b.time);
      
      // 内部処理用に5文字ずつグループ化
      this.lyricsData = [];
      for (let i = 0; i < allCharData.length; i += this.groupSize) {
        const group = allCharData.slice(i, Math.min(i + this.groupSize, allCharData.length));
        if (group.length > 0) {
          // グループの最初の文字の時間を基準に
          const baseTime = group[0].time;
          
          // 各文字の元のデータを保持する
          const originalChars = group.map((item, idx) => ({
            text: item.text,
            timeOffset: item.time - baseTime // 表示タイミングのオフセットを保持
          }));
          
          // グループテキストは連結
          const groupText = group.map(item => item.text).join('');
          
          this.lyricsData.push({
            time: baseTime,
            text: groupText,
            originalChars: originalChars
          });
        }
      }
      console.log(`${this.lyricsData.length}個の歌詞グループを処理しました`);
    } catch (e) {
      console.error("歌詞処理エラー:", e);
    }
  }

  startLyricsTimer() {
    console.log("歌詞タイマーを開始します");
    this.currentLyricIndex = 0;
    this.startTime = Date.now();
    
    const checkLyrics = () => {
      if ((this.isPlayerInit && this.player) || this.isPaused || this.isFirstInteraction) {
        requestAnimationFrame(checkLyrics);
        return;
      }
      
      const now = Date.now() - this.startTime;
      let processed = 0;
      
      while (this.currentLyricIndex < this.lyricsData.length && 
             this.lyricsData[this.currentLyricIndex].time <= now && 
             processed < 2) { // グループ処理なので1回の処理量を減らす
        
        const lyricGroup = this.lyricsData[this.currentLyricIndex];
        
        if (!this.displayedLyrics.has(lyricGroup.time)) {
          // グループ内の各文字を個別に表示（時間差で）
          lyricGroup.originalChars.forEach((charData, idx) => {
            // 各文字の表示時間にオフセットを適用
            setTimeout(() => {
              // 既に表示済み判定がついていない場合のみ表示
              if (!this.displayedLyrics.has(lyricGroup.time + "-" + idx)) {
                this.displayLyric(charData.text);
                this.displayedLyrics.add(lyricGroup.time + "-" + idx);
                
                // しばらくしたら削除フラグを消す
                setTimeout(() => {
                  this.displayedLyrics.delete(lyricGroup.time + "-" + idx);
                }, 8000);
              }
            }, charData.timeOffset || (idx * 50)); // オフセットがなければ50msずつずらす
          });
          
          this.displayedLyrics.add(lyricGroup.time);
          processed++;
          
          // グループ全体のフラグを一定時間後に削除
          setTimeout(() => {
            this.displayedLyrics.delete(lyricGroup.time);
          }, 8000 + (lyricGroup.originalChars.length * 100)); // 最後の文字の表示終了から8秒後
        }
        
        this.currentLyricIndex++;
      }
      
      if (this.currentLyricIndex >= this.lyricsData.length) {
        this.currentLyricIndex = 0;
        this.displayedLyrics.clear();
        this.startTime = Date.now();
      }
      
      requestAnimationFrame(checkLyrics);
    };
    
    requestAnimationFrame(checkLyrics);
  }

  updateLyrics(position) {
    if (this.isPaused || this.isFirstInteraction) return;
    if (!this.displayedLyrics) this.displayedLyrics = new Set();
    
    // グループ単位で表示判定
    for (let i = 0; i < this.lyricsData.length; i++) {
      const lyricGroup = this.lyricsData[i];
      // グループの基準時間が表示範囲内にある場合
      if (lyricGroup.time <= position && lyricGroup.time > position - 500 && 
          !this.displayedLyrics.has(lyricGroup.time)) {
        
        // グループ内の各文字を個別に表示（時間差で）
        lyricGroup.originalChars.forEach((charData, idx) => {
          // 各文字の表示時間にオフセットを適用
          setTimeout(() => {
            // 既に表示済み判定がついていない場合のみ表示
            if (!this.displayedLyrics.has(lyricGroup.time + "-" + idx)) {
              this.displayLyric(charData.text);
              this.displayedLyrics.add(lyricGroup.time + "-" + idx);
              
              // しばらくしたら削除フラグを消す
              setTimeout(() => {
                this.displayedLyrics.delete(lyricGroup.time + "-" + idx);
              }, 10000);
            }
          }, charData.timeOffset || (idx * 50)); // オフセットがなければ50msずつずらす
        });
        
        this.displayedLyrics.add(lyricGroup.time);
        
        // グループ全体のフラグを一定時間後に削除
        setTimeout(() => {
          this.displayedLyrics.delete(lyricGroup.time);
        }, 10000);
      }
    }
    
    // 修正: duration値が有効な場合のみ結果画面を表示
    if (this.player?.video?.duration > 0 && position >= this.player.video.duration - 1000) {
      this.showResults();
    }
  }

  // 1文字ずつの表示は元のままに
  displayLyric(text) {
    if (!text) return;

    // 既に同じテキストが表示されていないか確認
    const existingBubbles = document.querySelectorAll('.lyric-bubble');
    for (let bubble of existingBubbles) {
      if (bubble.textContent === text) return;
    }

    const bubble = document.createElement('div');
    bubble.className = 'lyric-bubble';
    bubble.textContent = text;
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    
    // 画面サイズに応じて位置とフォントサイズを調整
    const screenWidth = window.innerWidth;
    const isSmallScreen = screenWidth <= 768;
    
    let x, y, fontSize;
    
    if (isSmallScreen) {
      // モバイル・小さな画面：横幅15%～85%の範囲に収める
      x = screenWidth * 0.15 + Math.random() * (screenWidth * 0.7);
      y = window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55);
      
      // 画面サイズに応じたフォントサイズ調整
      if (screenWidth <= 480) {
        fontSize = '18px'; // スマホサイズ
      } else {
        fontSize = '22px'; // タブレットサイズ
      }
    } else {
      // PC・大きな画面
      x = 100 + Math.random() * (screenWidth - 300);
      y = window.innerHeight - 300 - Math.random() * 100;
      fontSize = '30px';
    }
    
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.color = '#39C5BB';
    bubble.style.fontSize = fontSize;
    
    bubble.addEventListener('mouseenter', () => this.clickLyric(bubble));
    bubble.addEventListener('touchstart', (e) => {
      e.preventDefault(); // iOSでのホバー対策
      this.clickLyric(bubble);
    }, {passive: false});
    
    this.gamecontainer.appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 8000);
  }

  // 以下のメソッドは基本的に変更なし
  checkLyrics(x, y, radius) {
    if (this.isFirstInteraction) return false;
    
    const lyrics = document.querySelectorAll('.lyric-bubble');
    const radiusSquared = radius * radius;
    
    for (const el of lyrics) {
      if (el.style.pointerEvents === 'none') continue;
      
      const rect = el.getBoundingClientRect();
      const elX = rect.left + rect.width / 2;
      const elY = rect.top + rect.height / 2;
      
      const dx = x - elX, dy = y - elY;
      const distanceSquared = dx * dx + dy * dy;
      const hitRadius = radius + Math.max(rect.width, rect.height) / 2;
      
      if (distanceSquared <= hitRadius * hitRadius) {
        this.clickLyric(el);
        this.createHitEffect(elX, elY);
      }
    }
  }

  clickLyric(element) {
    if (element.style.pointerEvents === 'none' || this.isFirstInteraction) return;
    
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
  }

  createClickEffect(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = 10 + Math.random() * 15;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${x - size/2 + (Math.random() - 0.5) * 30}px`;
      particle.style.top = `${y - size/2 + (Math.random() - 0.5) * 30}px`;
      this.gamecontainer.appendChild(particle);
      
      setTimeout(() => particle.remove(), 800);
    }
    
    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'lyric-bubble';
    pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;
    pointDisplay.style.left = `${x}px`;
    pointDisplay.style.top = `${y}px`;
    pointDisplay.style.color = '#FFFF00';
    pointDisplay.style.pointerEvents = 'none';
    
    this.gamecontainer.appendChild(pointDisplay);
    
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

  createHitEffect(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    
    this.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  createTrailParticle(x, y) {
    if (this.isFirstInteraction) return;
    
    const size = 25 + Math.random() * 40;
    const particle = document.createElement('div');
    particle.className = 'star-particle';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${x - size/2}px`;
    particle.style.top = `${y - size/2}px`;
    
    const hue = Math.floor(Math.random() * 360);
    particle.style.backgroundColor = `hsla(${hue}, 100%, 70%, 0.8)`;
    particle.style.boxShadow = `0 0 ${size/2}px hsla(${hue}, 100%, 70%, 0.8)`;
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    this.gamecontainer.appendChild(particle);
    this.mouseTrail.push({ element: particle, createdAt: Date.now() });
    
    const now = Date.now();
    this.mouseTrail = this.mouseTrail.filter(p => {
      if (now - p.createdAt > 800) {
        p.element.remove();
        return false;
      }
      return true;
    });
    
    while (this.mouseTrail.length > this.maxTrailLength) {
      const oldest = this.mouseTrail.shift();
      oldest.element.remove();
    }
  }

  createShooting(x, y, dx, dy) {
    if (this.isFirstInteraction) return;
    
    if (!dx && !dy) {
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle) * 5;
      dy = Math.sin(angle) * 5;
    }

    const size = 15 + Math.random() * 15;
    const meteor = document.createElement('div');
    meteor.className = 'shooting-star';
    meteor.style.width = `${size}px`;
    meteor.style.height = `${size}px`;
    meteor.style.left = `${x}px`;
    meteor.style.top = `${y}px`;
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    meteor.style.transform = `rotate(${angle + 45}deg)`;
    
    const speed = Math.min(150, Math.sqrt(dx * dx + dy * dy) * 5);
    meteor.style.boxShadow = `0 0 ${size}px ${size/2}px rgba(255, 255, 200, 0.8)`;
    meteor.style.filter = `blur(1px) drop-shadow(0 0 ${speed/10}px #fff)`;
    
    this.gamecontainer.appendChild(meteor);
    
    meteor.animate([
      { transform: `rotate(${angle + 45}deg) scale(1)`, opacity: 1 },
      { transform: `translate(${dx * 10}px, ${dy * 10}px) rotate(${angle + 45}deg) scale(0.1)`, opacity: 0 }
    ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
    
    setTimeout(() => meteor.remove(), 800);
  }

  createRandomText() {
    if (this.isPaused || this.isFirstInteraction) return;
    
    const text = document.createElement('div');
    text.className = 'random-text';
    text.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
    
    const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
    const y = window.innerHeight - Math.random() * 200;
    
    text.style.left = `${x}px`;
    text.style.top = `${y}px`;
    text.style.opacity = 0.5 + Math.random() * 0.5;
    text.style.fontSize = `${14 + Math.random() * 12}px`;
    text.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
    
    this.gamecontainer.appendChild(text);
    setTimeout(() => text.remove(), 6000);
  }

  createAudience() {
    const centerX = window.innerWidth / 2;
    const maxAudience = 180;
    
    const rows = [
      { distance: 70, count: 14, scale: 0.9 },
      { distance: 130, count: 20, scale: 0.85 },
      { distance: 190, count: 26, scale: 0.8 },
      { distance: 250, count: 32, scale: 0.75 },
      { distance: 310, count: 38, scale: 0.7 },
      { distance: 370, count: 44, scale: 0.65 },
      { distance: 430, count: 50, scale: 0.6 },
      { distance: 490, count: 56, scale: 0.55 }
    ];
    
    const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];
    let total = 0;
    
    for (const row of rows) {
      if (total >= maxAudience) break;
      
      const count = Math.min(row.count, Math.floor(row.count * window.innerWidth / 900));
      const step = 360 / count;
      
      for (let i = 0; i < count; i++) {
        if (total >= maxAudience) break;
        
        const angle = step * i * (Math.PI / 180);
        const x = Math.cos(angle) * row.distance;
        const y = Math.sin(angle) * (row.distance * 0.5);
        
        const posX = centerX + x;
        const posY = 100 - y;
        
        if (posX >= -20 && posX <= window.innerWidth + 20 && posY >= -20 && posY <= window.innerHeight + 20) {
          const audience = document.createElement('div');
          audience.className = 'audience';
          audience.style.left = `${posX}px`;
          audience.style.bottom = `${posY}px`;
          audience.style.transform = `scale(${row.scale})`;
          audience.style.opacity = Math.max(0.5, row.scale);
          
          if (row.distance > 250 && total % 2 === 0) {
            audience.style.backgroundColor = '#333';
            audience.style.height = '12px';
            audience.style.width = '8px';
          } else {
            const penlight = document.createElement('div');
            penlight.className = 'penlight';
            
            if (total % 3 !== 0 || row.distance <= 190) {
              penlight.style.animationDelay = `${Math.random() * 0.8}s`;
            } else {
              penlight.style.animation = 'none';
              penlight.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
            }
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            penlight.style.backgroundColor = color;
            
            if (row.distance <= 190) {
              penlight.style.boxShadow = `0 0 8px ${color}`;
            }
            
            audience.appendChild(penlight);
          }
          
          this.gamecontainer.appendChild(audience);
          total++;
        }
      }
    }
    
    if (total > 100) {
      const penlights = document.querySelectorAll('.audience .penlight');
      for (let i = 0; i < penlights.length; i++) {
        if (i % 3 === 0) {
          penlights[i].style.animation = 'none';
          penlights[i].style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
        }
      }
    }
  }

  showResults() {
    if (this.resultsDisplayed) return;
    this.resultsDisplayed = true;
    
    if (this.player?.isPlaying) {
      // 同期的に呼び出す場合は適切にPromiseを処理する
      this.safePlayerOperation(
        () => this.player.requestPause(),
        "Results pause error"
      );
    }
    
    this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
    
    let rank = 'C';
    if (this.score >= 10000) rank = 'S';
    else if (this.score >= 8000) rank = 'A';
    else if (this.score >= 6000) rank = 'B';
    
    const resultsScreen = document.getElementById('results-screen');
    document.getElementById('final-score-display').textContent = this.score;
    document.getElementById('final-combo-display').textContent = `最大コンボ: ${this.maxCombo}`;
    document.getElementById('rank-display').textContent = `ランク: ${rank}`;
    
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
    
    const setupResultsButtons = () => {
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
        resultsScreen.classList.remove('show');
        setTimeout(() => {
          resultsScreen.classList.add('hidden');
          this.restartGame();
          this.resultsDisplayed = false;
        }, 1000);
      });
    };
    
    setupResultsButtons();
  }

  cleanup() {
    if (this.randomTextInterval) clearInterval(this.randomTextInterval);
    if (this.comboResetTimer) clearInterval(this.comboResetTimer);
    
    this.mouseTrail.forEach(item => {
      if (item.element?.parentNode) item.element.remove();
    });
    this.mouseTrail = [];
    
    if (this.player) {
      try { this.player.dispose(); } catch {}
    }
    
    // オーバーレイを削除
    if (this.overlay && document.body.contains(this.overlay)) {
      document.body.removeChild(this.overlay);
    }
  }
}
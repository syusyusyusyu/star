/**
 * ボイスアイドル・ミュージックゲーム - 内部処理のみ最適化版
 * 
 * 歌詞を表示してクリックするリズムゲームの実装
 * TextAliveプレーヤーを使用して歌詞タイミングを同期し、
 * APIが利用できない場合はフォールバックモードで動作
 */
class GameManager {
  /**
   * ゲームマネージャーの初期化
   * ゲームの基本設定、DOM要素の取得、イベントリスナーの設定を行う
   */
  constructor() {
    // 基本設定の初期化
    this.apiToken = window.songConfig?.apiToken;
    this.songUrl = window.songConfig?.songUrl;
    this.score = this.combo = this.maxCombo = 0;
    this.startTime = Date.now();
    this.isPlaying = this.isPlayerInit = false;
    this.isFirstInteraction = true; // 初回インタラクションフラグ
    this.player = null;
    this.isMobile = /Android|iPhone/.test(navigator.userAgent);
    this.activeChars = new Set();
    this.displayedLyrics = new Set(); // 表示済み歌詞を追跡
    this.mouseTrail = [];
    this.maxTrailLength = 15;
    this.lastMousePos = { x: 0, y: 0 };
    this.apiLoaded = false; // TextAlive APIがロード完了したかを追跡
    this._operationInProgress = false; // 操作のロック状態を追跡（連打防止）
    this.resultsDisplayed = false; // リザルト画面表示フラグを初期化（重要：リザルト画面重複表示防止）
    
    // 内部処理用のグループサイズを設定（パフォーマンス最適化）
    this.groupSize = 5;
    
    // モバイルブラウザのビューポート処理（画面サイズ対応）
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    
    // 必要なDOM要素の取得
    [this.gamecontainer, this.scoreEl, this.comboEl, this.playpause, this.restart, this.loading] = 
      ['game-container', 'score', 'combo', 'play-pause', 'restart', 'loading'].map(id => document.getElementById(id));
    
    // 初期状態ではすべてのボタンを読み込み中と表示
    this.isPaused = true;
    if (this.playpause) {
      this.playpause.textContent = '読み込み中...';
    }
    if (this.restart) {
      this.restart.textContent = '読み込み中...';
    }
    
    // ゲームの基本セットアップ
    this.setupEvents();
    this.createLightEffects();
    this.initGame();
    this.initPlayer();
    
    // 通常のカーソルを使用する（特別なスタイルは適用しない）
    this.gamecontainer.style.userSelect = 'none';
    
    // 結果表示用のタイマーを追加（曲終了時に確実にリザルト画面へ移行するため）
    this.resultCheckTimer = null;
  }

  /**
   * モバイルブラウザのビューポート高さを更新
   * CSSの--vh変数を設定してモバイルブラウザでの100vh問題を解決
   */
  updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * 音楽再生を開始する
   * プレーヤーの初期化状態に応じて、TextAlivePlayerまたはフォールバックモードで再生
   */
  async playMusic() {
    // 操作が進行中なら何もしない（連打防止）
    if (this._operationInProgress) return;
    this._operationInProgress = true;
    
    try {
      this.isPaused = false;
      this.playpause.textContent = '一時停止';
      this.isFirstInteraction = false; // 初回インタラクションフラグをオフに
      
      // TextAliveプレーヤーの使用
      if (this.player && this.isPlayerInit) {
        try {
          // プレーヤーが既に再生中でないことを確認
          if (!this.player.isPlaying) {
            try {
              await this.player.requestPlay();
            } catch (e) {
              console.error("Player play error:", e);
              // エラー発生時はフォールバックモードへ
              this.fallback();
              this.startLyricsTimer();
            }
          }
        } catch (e) {
          console.error("Player play error:", e);
          // エラー発生時はフォールバックモードへ
          this.fallback();
          this.startLyricsTimer();
        }
      } else {
        // フォールバックモードですでに初期化済みの場合
        this.startTime = Date.now();
        this.startLyricsTimer();
      }
      
      // ランダムテキスト表示開始（観客の応援メッセージ）
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
      
      // 結果表示用のタイマーを設定（フォールバックモード用）
      if (!this.player || !this.isPlayerInit) {
        // 曲の長さを60秒と仮定
        this.setupResultCheckTimer(60000);
      }
    } finally {
      // 操作が完全に完了するのを確実にするために長めの遅延を使用（安全対策）
      setTimeout(() => this._operationInProgress = false, 1000);
    }
  }

  /**
   * 結果表示のための確認タイマーをセットアップ
   * 指定された時間が経過したらリザルト画面を表示する
   * 
   * @param {number} duration - リザルト表示までの時間（ミリ秒）
   */
  setupResultCheckTimer(duration) {
    // 既存のタイマーをクリア（重複防止）
    if (this.resultCheckTimer) {
      clearTimeout(this.resultCheckTimer);
    }
    
    // 曲の終了時に結果を表示するタイマーを設定
    this.resultCheckTimer = setTimeout(() => {
      if (!this.isPaused && !this.resultsDisplayed) {
        console.log("結果表示タイマーが発火しました");
        this.showResults();
      }
    }, duration);
    
    // バックアップとして、さらに長い時間が経過した場合も強制的に結果を表示
    // （何らかの理由で上のタイマーが機能しなかった場合の保険）
    setTimeout(() => {
      if (!this.resultsDisplayed) {
        console.log("バックアップタイマーが発火しました");
        this.showResults();
      }
    }, duration + 10000); // メインタイマーから10秒後
  }

  /**
   * ゲームのイベントハンドラを設定
   * マウス、タッチ、ボタンのイベントを処理
   */
  setupEvents() {
    let lastTime = 0, lastX = 0, lastY = 0;
    let touched = false;
    
    // マウス/タッチの移動を処理する関数
    const handleMove = (x, y, isTouch) => {
      const now = Date.now();
      if (now - lastTime < 16) return; // 60FPS制限
      lastTime = now;
      const dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx*dx + dy*dy) >= 3) { // 小さすぎる動きは無視
        lastX = x; lastY = y;
        this.lastMousePos = { x, y };
        this.checkLyrics(x, y, isTouch ? 45 : 35); // タッチの場合は判定範囲を広げる
        
        // 星を常に生成する（初回インタラクション後のみ）
        if (!this.isFirstInteraction) {
          this.createTrailParticle(x, y);
          if (Math.random() < (isTouch ? 0.03 : 0.01)) {
            this.createShooting(x, y, dx, dy);
          }
        }
      }
    };
    
    // マウス移動イベント
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
        e.preventDefault(); // スクロール防止
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
    
    // 再生/一時停止ボタンのクリックイベント - ここが再生開始の唯一のトリガー
    const handleButtonClick = (event) => {
      if (event) {
        event.preventDefault();
      }
      
      // APIが準備できていなければ何もしない
      if (!this.apiLoaded) return;
      
      if (this.isFirstInteraction) {
        // 初めての実行時は再生を開始
        this.playMusic();
        return;
      }
      
      // それ以降は通常の再生/一時停止の切り替え
      this.togglePlay();
    };
    
    this.playpause.addEventListener('click', handleButtonClick);
    this.playpause.addEventListener('touchend', handleButtonClick, {passive: false});
    
    // リスタートボタンのイベント処理
    const handleRestartClick = (event) => {
      if (event) {
        event.preventDefault();
      }
      // APIが準備できていなければ何もしない
      if (!this.apiLoaded) return;
      
      this.restartGame();
    };
    
    this.restart.addEventListener('click', handleRestartClick);
    this.restart.addEventListener('touchend', handleRestartClick, {passive: false});
    
    // 強制的に結果表示へ移行するデバッグ機能
    // ダブルクリックで結果画面を表示（テスト用）
    document.addEventListener('dblclick', () => {
      if (!this.isFirstInteraction && !this.resultsDisplayed) {
        console.log("ダブルクリックによる結果表示");
        this.showResults();
      }
    });
  }

  /**
   * ゲームの初期化
   * 背景要素の生成と歌詞データの準備
   */
  initGame() {
    this.createStars();
    this.createAudience();
    this.lyricsData = [];
    
    // フォールバック用の歌詞データ
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
    
    // 観客のランダムテキスト
    this.randomTexts = ["ミク！", "かわいい！", "最高！", "39！", "イェーイ！"];
    this.randomTextInterval = null;
    
    // コンボをリセットするタイマー（30秒間何も取らなかったらコンボリセット）
    this.comboResetTimer = setInterval(() => {
      if (Date.now() - (this.lastScoreTime || 0) > 30000 && this.combo > 0) {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
    }, 1000);
  }

  /**
   * 背景の星を生成
   * 画面サイズに応じた適切な数の星を表示
   */
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

  /**
   * ステージのスポットライト効果を生成
   */
  createLightEffects() {
    for (let i = 0; i < 3; i++) {
      const spotlight = document.createElement('div');
      spotlight.className = 'spotlight';
      spotlight.style.left = `${(i * 30) + 20}%`;
      spotlight.style.animationDelay = `${i * -2.5}s`;
      this.gamecontainer.appendChild(spotlight);
    }
  }

  /**
   * 再生/一時停止を切り替える
   * プレーヤーの状態に応じて適切な処理を行う
   */
  async togglePlay() {
    if (this._operationInProgress) return; // 連打防止
    this._operationInProgress = true;
    
    try {
      this.isPaused = !this.isPaused;
      this.playpause.textContent = this.isPaused ? '再生' : '一時停止';
      
      if (this.isPaused) {
        // 一時停止処理
        if (this.player?.isPlaying) {
          try {
            // Promise形式ではなくtry-catch形式に変更
            this.player.requestPause();
          } catch (e) {
            console.error("Pause error:", e);
          }
        }
        clearInterval(this.randomTextInterval);
        this.randomTextInterval = null;
        
        // 一時停止時にタイマーを停止
        if (this.resultCheckTimer) {
          clearTimeout(this.resultCheckTimer);
          this.resultCheckTimer = null;
        }
      } else {
        // 再生処理
        if (this.player) {
          if (!this.player.isPlaying) {
            try {
              // Promise形式ではなくtry-catch形式に変更
              this.player.requestPlay();
            } catch (e) {
              console.error("Play error:", e);
              this.fallback();
            }
          }
        } else {
          // フォールバックモードでの再生再開
          this.startTime = Date.now() - (this.lyricsData[this.currentLyricIndex]?.time || 0);
          
          // 再生再開時にタイマーを再設定（残り時間を推定）
          const elapsedTime = Date.now() - this.songStartTime;
          const remainingTime = Math.max(1000, 60000 - elapsedTime);
          this.setupResultCheckTimer(remainingTime);
        }
        
        // ランダムテキスト表示を再開
        if (!this.randomTextInterval) {
          this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        }
      }
    } finally {
      // 操作が完全に完了するのを確実にするために長めの遅延を使用
      setTimeout(() => this._operationInProgress = false, 1000);
    }
  }

  /**
   * ゲームをリスタートする
   * スコアとコンボをリセットし、曲を最初から再生
   */
  async restartGame() {
    if (this._operationInProgress) return; // 連打防止
    this._operationInProgress = true;
    
    // スコアと状態のリセット
    this.score = this.combo = this.currentLyricIndex = 0;
    this.startTime = Date.now();
    this.songStartTime = Date.now(); // 曲の開始時間をリセット
    this.isPaused = false;
    this.scoreEl.textContent = '0';
    this.comboEl.textContent = 'コンボ: 0';
    this.resultsDisplayed = false; // リザルト表示フラグをリセット（重要）
    
    // 結果画面を非表示にする
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
      resultsScreen.classList.remove('show');
      resultsScreen.classList.add('hidden');
    }
    
    // 表示中の歌詞を全て削除
    document.querySelectorAll('.lyric-bubble').forEach(l => l.remove());
    this.displayedLyrics.clear();
    
    // リザルト表示タイマーを再設定
    if (this.resultCheckTimer) {
      clearTimeout(this.resultCheckTimer);
    }
    if (!this.player || !this.isPlayerInit) {
      this.setupResultCheckTimer(60000);
    }
    
    try {
      if (this.player) {
        // 操作を正しい順序で行う（プレーヤーの状態制御）
        if (this.player.isPlaying) {
          try {
            this.player.requestPause();
            // 次の操作の前に小さな遅延を追加（安定性向上）
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.error("Pause error:", e);
          }
        }
        
        try {
          this.player.requestStop();
          // 次の操作の前に小さな遅延を追加
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.error("Stop error:", e);
        }
        
        try {
          this.player.requestPlay();
        } catch (e) {
          console.error("Play error:", e);
          this.fallback();
        }
      }
      this.playpause.textContent = '一時停止';
    } finally {
      // 操作が完全に完了するのを確実にするために長めの遅延を使用
      setTimeout(() => this._operationInProgress = false, 1500);
    }
  }

  /**
   * TextAlive Playerを初期化する
   * 歌詞同期のためのプレーヤーをセットアップ
   */
  initPlayer() {
    // TextAliveが利用可能かチェック
    if (typeof TextAliveApp === 'undefined') {
      if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
      this.fallback();
      return;
    }
    
    try {
      // プレーヤーの作成
      this.player = new TextAliveApp.Player({
        app: { token: this.apiToken },
        mediaElement: document.createElement('audio')
      });
      document.body.appendChild(this.player.mediaElement);
      this.isPlayerInit = true;
      
      // 各種イベントリスナーを設定
      this.player.addListener({
        // アプリ準備完了時
        onAppReady: (app) => {
          if (app && !app.managed) {
            try {
              this.player.createFromSongUrl(this.songUrl);
            } catch (e) {
              console.error("Song creation error:", e);
              this.fallback();
            }
          }
        },
        // 動画準備完了時（歌詞データ取得）
        onVideoReady: (video) => {
          if (video?.firstPhrase) this.processLyrics(video);
          
          // APIロード完了を記録するが、すぐにはボタンを有効化しない
          if (this.loading) this.loading.textContent = "準備中...";
          
          // 完全なセットアップのために追加の待機時間を設ける
          setTimeout(() => {
            this.apiLoaded = true; // ここでAPIロード完了フラグを設定
            
            // すべてのボタンのテキストを更新
            if (this.playpause) {
              this.playpause.textContent = '再生';
            }
            if (this.restart) {
              this.restart.textContent = '最初から';
            }
            
            if (this.loading) this.loading.textContent = "準備完了-「再生」ボタンを押してね";
          }, 2000); // 2秒の追加待機時間
        },
        // 時間更新時（歌詞表示タイミング制御）
        onTimeUpdate: (pos) => {
          if (!this.isPaused) this.updateLyrics(pos);
        },
        // 再生開始時
        onPlay: () => {
          this.isPaused = false;
          this.playpause.textContent = '一時停止';
          if (!this.randomTextInterval) {
            this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
          }
        },
        // 一時停止時
        onPause: () => {
          this.isPaused = true;
          this.playpause.textContent = '再生';
          clearInterval(this.randomTextInterval);
          this.randomTextInterval = null;
        },
        // 停止時
        onStop: () => {
          this.isPaused = true;
          this.playpause.textContent = '再生';
          this.restartGame();
        },
        // 曲終了時（最重要：ここでリザルト画面を表示）
        onFinish: () => {
          console.log("onFinish イベントが発火しました");
          if (!this.resultsDisplayed) {
            this.showResults();
          }
        },
        // エラー発生時
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

  /**
   * フォールバックモードに切り替え
   * TextAliveが利用できない場合の代替処理
   */
  fallback() {
    this.isPlayerInit = false;
    this.player = null;
    
    if (this.loading) this.loading.textContent = "代替モードで準備中...";
    this.lyricsData = this.fallbackLyricsData;
    
    // 同様に待機時間を設ける
    setTimeout(() => {
      this.apiLoaded = true; // ここでAPIロード完了フラグを設定
      
      // すべてのボタンのテキストを更新
      if (this.playpause) {
        this.playpause.textContent = '再生';
      }
      if (this.restart) {
        this.restart.textContent = '最初から';
      }
      
      if (this.loading) this.loading.textContent = "準備完了 - 下の「再生」ボタンを押してください";
    }, 2000); // 2秒の待機時間
  }
  
  /**
   * 歌詞データを処理する
   * TextAliveから取得した歌詞データを内部形式に変換
   * 
   * @param {Object} video - TextAliveから取得した動画データ
   */
  processLyrics(video) {
    try {
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
      
      // 内部処理用に5文字ずつグループ化（パフォーマンス最適化）
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
      
      // プレイヤーの場合、曲の長さに応じてタイマーを設定
      if (this.player?.video?.duration) {
        // 曲の長さ + 少し余裕を持たせる
        const duration = this.player.video.duration + 2000;
        this.setupResultCheckTimer(duration);
      }
    } catch (e) {
      console.error("歌詞処理エラー:", e);
    }
  }

  /**
   * 歌詞表示タイマーを開始
   * フォールバックモード用の歌詞タイミング処理
   */
  startLyricsTimer() {
    this.currentLyricIndex = 0;
    this.startTime = Date.now();
    this.songStartTime = Date.now(); // 曲の開始時間を記録
    
    const checkLyrics = () => {
      // プレーヤーモード、一時停止中、または初回インタラクション前なら処理しない
      if ((this.isPlayerInit && this.player) || this.isPaused || this.isFirstInteraction) {
        requestAnimationFrame(checkLyrics);
        return;
      }
      
      const now = Date.now() - this.startTime;
      let processed = 0;
      
      // 現在の時間に対応する歌詞を表示
      while (this.currentLyricIndex < this.lyricsData.length && 
             this.lyricsData[this.currentLyricIndex].time <= now && 
             processed < 2) { // グループ処理なので1回の処理量を減らす（パフォーマンス対策）
        
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
      
      // 全ての歌詞を表示し終わったら、少し待ってから結果表示
      if (this.currentLyricIndex >= this.lyricsData.length) {
        // 歌詞を1周したら、5秒後に結果画面を表示（強制的に）
        if (!this.resultsDisplayed && !this.player) {
          setTimeout(() => {
            if (!this.resultsDisplayed) {
              console.log("歌詞1周完了後の強制結果表示");
              this.showResults();
            }
          }, 5000);
        }
        
        // 歌詞を最初からループ（フォールバックモード）
        this.currentLyricIndex = 0;
        this.displayedLyrics.clear();
        this.startTime = Date.now();
      }
      
      requestAnimationFrame(checkLyrics);
    };
    
    requestAnimationFrame(checkLyrics);
  }

  /**
   * 歌詞の表示を更新する
   * 現在の再生位置に応じて表示すべき歌詞を判定
   * 
   * @param {number} position - 現在の再生位置（ミリ秒）
   */
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
    
    // 曲の終了判定を改善
    if (this.player?.video?.duration) {
      // 曲の終了1秒前になったらリザルト表示
      if (position >= this.player.video.duration - 1000 && !this.resultsDisplayed) {
        console.log("曲終了検出による結果表示");
        this.showResults();
      }
    }
  }

  /**
   * 1文字の歌詞を表示
   * 画面上にランダムな位置で歌詞を表示
   * 
   * @param {string} text - 表示する文字
   */
  displayLyric(text) {
    if (!text) return;

    // 既に同じテキストが表示されていないか確認（重複防止）
    const existingBubbles = document.querySelectorAll('.lyric-bubble');
    for (let bubble of existingBubbles) {
      if (bubble.textContent === text) return;
    }

    // 歌詞バブルを作成
    const bubble = document.createElement('div');
    bubble.className = 'lyric-bubble';
    bubble.textContent = text;
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    
    // 画面サイズに応じて位置とフォントサイズを調整（レスポンシブ対応）
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
    
    // スタイルを適用
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.color = '#39C5BB'; // ミクカラー
    bubble.style.fontSize = fontSize;
    
    // イベントリスナーを追加
    bubble.addEventListener('mouseenter', () => this.clickLyric(bubble));
    bubble.addEventListener('touchstart', (e) => {
      e.preventDefault(); // iOSでのホバー対策
      this.clickLyric(bubble);
    }, {passive: false});
    
    // 画面に追加
    this.gamecontainer.appendChild(bubble);
    
    // 一定時間後に削除
    setTimeout(() => bubble.remove(), 8000);
  }

  /**
   * マウス/指の位置と歌詞の当たり判定
   * 
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} radius - 判定半径
   * @return {boolean} - 当たった場合はtrue
   */
  checkLyrics(x, y, radius) {
    if (this.isFirstInteraction) return false;
    
    const lyrics = document.querySelectorAll('.lyric-bubble');
    const radiusSquared = radius * radius;
    
    for (const el of lyrics) {
      if (el.style.pointerEvents === 'none') continue; // 既にクリック済みの場合はスキップ
      
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

  /**
   * 歌詞をクリック/タッチした時の処理
   * スコア加算と視覚効果を処理
   * 
   * @param {HTMLElement} element - クリックされた歌詞要素
   */
  clickLyric(element) {
    if (element.style.pointerEvents === 'none' || this.isFirstInteraction) return;
    
    // スコアとコンボを更新
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = 100 * (Math.floor(this.combo / 5) + 1); // コンボボーナス
    this.score += points;
    
    // 表示を更新
    this.scoreEl.textContent = this.score;
    this.comboEl.textContent = `コンボ: ${this.combo}`;
    
    // 視覚効果
    element.style.color = '#FF69B4'; // ピンク色に変更
    this.createClickEffect(element);
    element.style.pointerEvents = 'none'; // 再クリック防止
    
    // フェードアウト
    setTimeout(() => element.style.opacity = '0', 100);
    this.lastScoreTime = Date.now();
  }

  /**
   * クリック時のパーティクル効果を生成
   * 
   * @param {HTMLElement} element - クリックされた要素
   */
  createClickEffect(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // パーティクルを生成
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
    
    // スコア表示を作成
    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'lyric-bubble';
    pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;
    pointDisplay.style.left = `${x}px`;
    pointDisplay.style.top = `${y}px`;
    pointDisplay.style.color = '#FFFF00'; // 黄色
    pointDisplay.style.pointerEvents = 'none';
    
    this.gamecontainer.appendChild(pointDisplay);
    
    // 上に浮かせながらフェードアウト
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
   * タップ/クリック時の波紋効果を生成
   * 
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  createHitEffect(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    
    this.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  /**
   * マウスの軌跡に星のパーティクルを生成
   * 
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  createTrailParticle(x, y) {
    if (this.isFirstInteraction) return;
    
    // 星型パーティクルを生成
    const size = 25 + Math.random() * 40;
    const particle = document.createElement('div');
    particle.className = 'star-particle';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${x - size/2}px`;
    particle.style.top = `${y - size/2}px`;
    
    // ランダムな色
    const hue = Math.floor(Math.random() * 360);
    particle.style.backgroundColor = `hsla(${hue}, 100%, 70%, 0.8)`;
    particle.style.boxShadow = `0 0 ${size/2}px hsla(${hue}, 100%, 70%, 0.8)`;
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    this.gamecontainer.appendChild(particle);
    this.mouseTrail.push({ element: particle, createdAt: Date.now() });
    
    // 古いパーティクルを削除
    const now = Date.now();
    this.mouseTrail = this.mouseTrail.filter(p => {
      if (now - p.createdAt > 800) {
        p.element.remove();
        return false;
      }
      return true;
    });
    
    // 最大数を超えたら古いものから削除
    while (this.mouseTrail.length > this.maxTrailLength) {
      const oldest = this.mouseTrail.shift();
      oldest.element.remove();
    }
  }

  /**
   * 流れ星エフェクトを生成
   * 
   * @param {number} x - 開始X座標
   * @param {number} y - 開始Y座標
   * @param {number} dx - X方向速度
   * @param {number} dy - Y方向速度
   */
  createShooting(x, y, dx, dy) {
    if (this.isFirstInteraction) return;
    
    // 方向がない場合はランダムに設定
    if (!dx && !dy) {
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle) * 5;
      dy = Math.sin(angle) * 5;
    }

    // 流れ星を生成
    const size = 15 + Math.random() * 15;
    const meteor = document.createElement('div');
    meteor.className = 'shooting-star';
    meteor.style.width = `${size}px`;
    meteor.style.height = `${size}px`;
    meteor.style.left = `${x}px`;
    meteor.style.top = `${y}px`;
    
    // 移動方向に合わせて回転
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    meteor.style.transform = `rotate(${angle + 45}deg)`;
    
    // 速度に応じた輝き
    const speed = Math.min(150, Math.sqrt(dx * dx + dy * dy) * 5);
    meteor.style.boxShadow = `0 0 ${size}px ${size/2}px rgba(255, 255, 200, 0.8)`;
    meteor.style.filter = `blur(1px) drop-shadow(0 0 ${speed/10}px #fff)`;
    
    this.gamecontainer.appendChild(meteor);
    
    // アニメーション
    meteor.animate([
      { transform: `rotate(${angle + 45}deg) scale(1)`, opacity: 1 },
      { transform: `translate(${dx * 10}px, ${dy * 10}px) rotate(${angle + 45}deg) scale(0.1)`, opacity: 0 }
    ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
    
    // 一定時間後に削除
    setTimeout(() => meteor.remove(), 800);
  }

  /**
   * ランダムなテキスト（観客コメント）を生成
   */
  createRandomText() {
    if (this.isPaused || this.isFirstInteraction) return;
    
    // テキスト要素を作成
    const text = document.createElement('div');
    text.className = 'random-text';
    text.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
    
    // ランダムな位置
    const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
    const y = window.innerHeight - Math.random() * 200;
    
    // スタイル設定
    text.style.left = `${x}px`;
    text.style.top = `${y}px`;
    text.style.opacity = 0.5 + Math.random() * 0.5;
    text.style.fontSize = `${14 + Math.random() * 12}px`;
    text.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
    
    this.gamecontainer.appendChild(text);
    setTimeout(() => text.remove(), 6000);
  }

  /**
   * 観客（ペンライトを持つドット）を生成
   */
  createAudience() {
    const centerX = window.innerWidth / 2;
    const maxAudience = 180;
    
    // 観客配置の行ごとの設定
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
    
    // ペンライトの色
    const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];
    let total = 0;
    
    // 各行ごとに観客を配置
    for (const row of rows) {
      if (total >= maxAudience) break;
      
      const count = Math.min(row.count, Math.floor(row.count * window.innerWidth / 900));
      const step = 360 / count;
      
      for (let i = 0; i < count; i++) {
        if (total >= maxAudience) break;
        
        // 円形に配置（楕円を形成）
        const angle = step * i * (Math.PI / 180);
        const x = Math.cos(angle) * row.distance;
        const y = Math.sin(angle) * (row.distance * 0.5);
        
        const posX = centerX + x;
        const posY = 100 - y;
        
        // 画面内に表示される観客のみ生成
        if (posX >= -20 && posX <= window.innerWidth + 20 && posY >= -20 && posY <= window.innerHeight + 20) {
          const audience = document.createElement('div');
          audience.className = 'audience';
          audience.style.left = `${posX}px`;
          audience.style.bottom = `${posY}px`;
          audience.style.transform = `scale(${row.scale})`;
          audience.style.opacity = Math.max(0.5, row.scale);
          
          // 後ろの観客は単純な形状
          if (row.distance > 250 && total % 2 === 0) {
            audience.style.backgroundColor = '#333';
            audience.style.height = '12px';
            audience.style.width = '8px';
          } else {
            // 前の観客はペンライトを持つ
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
            
            // 前の列はより明るく
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
    
    // 観客が多い場合、一部のペンライトは動かさない（パフォーマンス対策）
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

  /**
   * リザルト画面を表示する
   * スコアとランクを表示し、演出を実行
   */
  showResults() {
    // 重複実行防止（この部分が非常に重要）
    if (this.resultsDisplayed) {
      console.log("すでに結果画面が表示されています");
      return;
    }
    console.log("結果画面を表示します");
    this.resultsDisplayed = true;
    
    // 結果表示前にプレーヤーが再生中なら一時停止する
    // エラー修正: .catch()メソッドの使用から、try-catch形式に変更
    if (this.player?.isPlaying) {
      try {
        this.player.requestPause();
      } catch (e) {
        console.error("Results pause error:", e);
      }
    }
    
    // タイマーをクリア
    if (this.resultCheckTimer) {
      clearTimeout(this.resultCheckTimer);
      this.resultCheckTimer = null;
    }
    
    // 最大コンボを確定
    this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
    
    // スコアに応じたランク判定
    let rank = 'C';
    if (this.score >= 10000) rank = 'S';
    else if (this.score >= 8000) rank = 'A';
    else if (this.score >= 6000) rank = 'B';
    
    // 結果画面要素を取得
    const resultsScreen = document.getElementById('results-screen');
    if (!resultsScreen) {
      console.error("結果画面のDOM要素が見つかりません");
      return;
    }
    
    // 結果画面の要素を確認して表示
    const finalScoreDisplay = document.getElementById('final-score-display');
    const finalComboDisplay = document.getElementById('final-combo-display');
    const rankDisplay = document.getElementById('rank-display');
    
    if (finalScoreDisplay) finalScoreDisplay.textContent = this.score;
    if (finalComboDisplay) finalComboDisplay.textContent = `最大コンボ: ${this.maxCombo}`;
    if (rankDisplay) rankDisplay.textContent = `ランク: ${rank}`;
    
    // 結果画面を表示
    resultsScreen.classList.remove('hidden');
    setTimeout(() => {
      resultsScreen.classList.add('show');
      
      // 演出エフェクト（流れ星）
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
        }, i * 200);
      }
    }, 100);
    
    // リザルト画面のボタン設定
    this.setupResultsButtons();
  }
  
  /**
   * リザルト画面のボタンイベントを設定
   */
  setupResultsButtons() {
    const backToTitle = document.getElementById('back-to-title');
    const replaySong = document.getElementById('replay-song');
    
    // イベントハンドラ追加のヘルパー関数
    const addEvents = (element, handler) => {
      if (!element) return;
      element.addEventListener('click', handler);
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        handler();
      }, {passive: false});
    };
    
    // タイトルに戻るボタン
    addEvents(backToTitle, () => {
      window.location.href = 'index.html';
    });
    
    // 曲をリプレイするボタン
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
   * リソースの解放とクリーンアップ
   * ゲーム終了時に呼び出す
   */
  cleanup() {
    if (this.randomTextInterval) clearInterval(this.randomTextInterval);
    if (this.comboResetTimer) clearInterval(this.comboResetTimer);
    if (this.resultCheckTimer) clearTimeout(this.resultCheckTimer);
    
    // マウストレイルの要素を削除
    this.mouseTrail.forEach(item => {
      if (item.element?.parentNode) item.element.remove();
    });
    this.mouseTrail = [];
    
    // プレーヤーのクリーンアップ
    if (this.player) {
      try { this.player.dispose(); } catch {}
    }
  }
}
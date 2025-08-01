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
    
    // モバイルデバイス検出
    this.isMobile = this.detectMobileDevice();
    if (this.isMobile) {
      console.log('モバイルデバイスが検出されました。Cursorモード限定で動作します。');
    }
    
    // URLからモードを読み込む（モバイルの場合はcursor限定）
    const urlParams = new URLSearchParams(window.location.search);
    const requestedMode = urlParams.get('mode') || 'cursor';
    this.currentMode = this.isMobile ? 'cursor' : requestedMode; // モバイルではcursor固定
    
    if (this.isMobile && requestedMode !== 'cursor') {
      console.log(`モバイルデバイスのため、要求されたモード'${requestedMode}'からCursorモードに変更されました。`);
    }
    this.hands = null; // MediaPipe Handsインスタンス
    this.pose = null; // MediaPipe Poseインスタンス
    this.bodyDetectionReady = false; // ボディ検出準備完了フラグ
    this.countdownTimer = null; // カウントダウンタイマー
    this.fullBodyLostTimer = null; // 全身ロスト時のタイマー
    
    // 内部処理用のグループサイズを設定（パフォーマンス最適化）
    this.groupSize = 1;
    
    // モバイルブラウザのビューポート処理（画面サイズ対応）
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    
    // 必要なDOM要素の取得
    [this.gamecontainer, this.scoreEl, this.comboEl, this.playpause, this.restart, this.loading, this.countdownOverlay, this.countdownText] = 
      ['game-container', 'score', 'combo', 'play-pause', 'restart', 'loading', 'countdown-overlay', 'countdown-text'].map(id => document.getElementById(id));
    
    // 初期状態ではすべてのボタンを読み込み中と表示
    this.isPaused = true;
    // ゲームの基本セットアップ
    this.setupEvents();
    this.initGame();
    this.initPlayer();
    
    // 通常のカーソルを使用する（特別なスタイルは適用しない）
    this.gamecontainer.style.userSelect = 'none';
    
    // 結果表示用のタイマーを追加（曲終了時に確実にリザルト画面へ移行するため）
    this.resultCheckTimer = null;
    this.songProgressTimer = null; // 曲の進行状況監視タイマー

    // 鑑賞用歌詞表示のための追加設定
    this.displayedViewerLyrics = new Map(); // 表示済み鑑賞用歌詞を追跡
    this.viewerLyricsContainer = document.createElement('div');
    this.viewerLyricsContainer.className = 'viewer-lyrics-container';
    this.gamecontainer.appendChild(this.viewerLyricsContainer);

    // 手振り検出用の変数
    this.handHistory = []; // 手の位置履歴
    this.lastWaveTime = 0; // 最後に手振りを検出した時間
    this.waveThreshold = 0.1; // 手振り検出の閾値を緩く（画面幅の10%）
    this.waveTimeWindow = 400; // 手振り検出の時間窓を短く（400ms）

    // 初期モードに基づいてカメラを初期化
    this.initCamera();
    this.updateInstructions(); // 初期指示を更新
  }

  /**
   * モバイルデバイスかどうかを検出
   * @return {boolean} モバイルデバイスの場合true
   */
  detectMobileDevice() {
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

  initCamera() {
    // モバイルデバイスの場合はカメラ機能を無効化
    if (this.isMobile) {
      console.log('モバイルデバイスが検出されました。カメラ機能は無効化されます。');
      return;
    }
    
    let videoElement = document.getElementById('camera-video');
    if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.id = 'camera-video';
        videoElement.classList.add('hidden'); // デフォルトで非表示
        document.body.appendChild(videoElement);
    }
    const segmentationCanvas = document.getElementById('segmentation-canvas');
    const segmentationCtx = segmentationCanvas.getContext('2d');

    // カメラとキャンバスの表示/非表示をモードに応じて切り替える
    if (this.currentMode === 'hand' || this.currentMode === 'body') {
        // videoElementは常にhiddenのまま
        segmentationCanvas.classList.remove('hidden');
    } else {
        // videoElementは常にhiddenのまま
        segmentationCanvas.classList.add('hidden');
        // モードが切り替わった際に、以前のMediaPipeインスタンスを破棄
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
        if (this.pose) {
            this.pose.close();
            this.pose = null;
        }
        return; // カメラが不要なモードではここで処理を終了
    }

    // Selfie Segmentationの初期化 (常に実行、背景除去のため)
    const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    }});
    selfieSegmentation.setOptions({
      modelSelection: 0,
      delegate: 'CPU'
    });
    selfieSegmentation.onResults((results) => {
      segmentationCtx.save();
      segmentationCtx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
      // 左右反転
      segmentationCtx.translate(segmentationCanvas.width, 0);
      segmentationCtx.scale(-1, 1);
      segmentationCtx.drawImage(results.segmentationMask, 0, 0,
                          segmentationCanvas.width, segmentationCanvas.height);

      segmentationCtx.globalCompositeOperation = 'source-in';
      segmentationCtx.drawImage(results.image, 0, 0, segmentationCanvas.width, segmentationCanvas.height);
      segmentationCtx.restore();
    });

    // Handsの初期化 (handモードの場合のみ)
    if (this.currentMode === 'hand') {
        if (!this.hands) {
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0, // 軽量モデルを使用（検出速度向上）
                minDetectionConfidence: 0.3, // 検出閾値を下げる（検出しやすく）
                minTrackingConfidence: 0.1, // 追跡閾値を下げる（追跡しやすく）
                selfieMode: true, // セルフィーモード（左右反転）
                staticImageMode: false // 動画モード
            });
            this.hands.onResults((results) => {
                // 手の検出状況を表示
                this.updateHandDetectionIndicator(results.multiHandLandmarks);
                
                // 手のランドマークを3D描画
                if (this.liveStageVisuals) {
                    this.liveStageVisuals.updateHandLandmarks(results);
                }
                
                if (results.multiHandLandmarks) {
                    for (const landmarks of results.multiHandLandmarks) {
                        // 手のひらの中心での歌詞判定と手振り検出
                        const palmCenter = landmarks[0]; // 手のひらの中心
                        const x = palmCenter.x * window.innerWidth;
                        const y = palmCenter.y * window.innerHeight;
                        
                        // 手振りの検出
                        this.detectHandWaving(palmCenter, x, y);
                        
                        // 従来の人差し指での歌詞判定も残す
                        const indexFingerTip = landmarks[8];
                        const fingerX = indexFingerTip.x * window.innerWidth;
                        const fingerY = indexFingerTip.y * window.innerHeight;
                        this.checkLyrics(fingerX, fingerY, 70); // 判定範囲を広く
                    }
                }
            });
        }
    } else if (this.hands) { // handモードではないがhandsが初期化されている場合
        this.hands.close();
        this.hands = null;
    }

    // Poseの初期化 (bodyモードの場合のみ)
    if (this.currentMode === 'body') {
        if (!this.pose) {
            this.pose = new Pose({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }});
            this.pose.setOptions({
                modelComplexity: 0,
                smoothLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
                delegate: 'CPU'
            });
            this.pose.onResults((results) => {
                if (results.poseLandmarks) {
                    // Poseのランドマークも左右反転
                    const flippedLandmarks = results.poseLandmarks.map(landmark => {
                        return { ...landmark, x: 1 - landmark.x };
                    });
                    this.visuals.updatePlayerAvatar(flippedLandmarks);

                    // 全身検出の確認（常に実行）
                    if (this.currentMode === 'body') {
                        this.checkFullBodyDetection(flippedLandmarks);
                    }

                    const rightHand = flippedLandmarks[20]; // 右手首
                    if (rightHand) {
                        const x = rightHand.x * window.innerWidth;
                        const y = rightHand.y * window.innerHeight;
                        this.checkLyrics(x, y, 80);
                    }

                    const leftHand = flippedLandmarks[19]; // 左手首
                    if (leftHand) {
                        const x = leftHand.x * window.innerWidth;
                        const y = leftHand.y * window.innerHeight;
                        this.checkLyrics(x, y, 80);
                    }
                }
            });
        }
    } else if (this.pose) { // bodyモードではないがposeが初期化されている場合
        this.pose.close();
        this.pose = null;
    }

    let lastProcessTime = 0;
    const processInterval = 33; // 33msごとに処理 (約30FPS) - さらに検出頻度を上げる

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        // キャンバスの解像度をビデオの解像度に合わせる
        segmentationCanvas.width = videoElement.videoWidth;
        segmentationCanvas.height = videoElement.videoHeight;

        const now = performance.now();
        if (now - lastProcessTime > processInterval) {
          lastProcessTime = now;
          if (this.hands) {
              await this.hands.send({image: videoElement});
          }
          if (this.pose) {
              await this.pose.send({image: videoElement});
          }
        }
        await selfieSegmentation.send({image: videoElement});
      },
      width: 480, // 解像度を下げて検出速度向上
      height: 360 // 解像度を下げて検出速度向上
    });
    camera.start();
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
   * 全身検出の確認とカウントダウンの開始
   * @param {Array} landmarks - MediaPipe Poseのランドマークデータ
   */
  checkFullBodyDetection(landmarks) {
    console.log("checkFullBodyDetection called.");
    // 主要なランドマーク（頭、両肩、両腰、両足首）が存在するか確認
    const requiredLandmarks = [
      0, // 鼻
      11, // 左肩
      12, // 右肩
      23, // 左腰
      24, // 右腰
      27, // 左足首
      28  // 右足首
    ];

    const allDetected = requiredLandmarks.every(index => landmarks[index] && landmarks[index].visibility > 0.8);
    console.log("allDetected:", allDetected);
    console.log("player isPlaying:", this.player?.isPlaying);

    if (allDetected) {
      if (this.fullBodyLostTimer) {
        console.log("Full body re-detected, clearing fullBodyLostTimer.");
        clearTimeout(this.fullBodyLostTimer);
        this.fullBodyLostTimer = null;
        // 警告表示中だった場合は即座にメッセージをクリア
        if (!this.countdownOverlay.classList.contains('hidden')) {
            this.countdownText.textContent = '';
            this.countdownOverlay.classList.add('hidden');
        }
      }
      if (!this.countdownTimer && !this.bodyDetectionReady) {
        let count = 5;
        this.countdownOverlay.classList.remove('hidden');
        this.countdownText.textContent = count;
        this.countdownTimer = setInterval(() => {
          count--;
          if (count > 0) {
            this.countdownText.textContent = count;
          } else {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            this.bodyDetectionReady = true;
            this.countdownOverlay.classList.add('hidden');
            // カウントダウン終了後、音楽再生を開始
            this.playMusic();
          }
        }, 1000);
      }
    } else {
      if (this.countdownTimer) {
        console.log("Body lost during countdown, clearing countdownTimer.");
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.countdownOverlay.classList.remove('hidden');
        this.countdownText.textContent = "全身が映るように調整してください";
      }
      // bodyDetectionReadyは一度trueになったらリセットしない
      // this.bodyDetectionReady = false;

      console.log("Body not detected. Player is playing:", this.player?.isPlaying, "Full body lost timer active:", !!this.fullBodyLostTimer);

      // 再生中または準備完了後で全身がロストした場合
      if ((this.bodyDetectionReady || this.player?.isPlaying) && !this.fullBodyLostTimer) {
        console.log("Setting full body lost timer.");
        this.fullBodyLostTimer = setTimeout(() => {
          console.log("Full body lost timer expired, showing warning.");
          this.countdownOverlay.classList.remove('hidden');
          this.countdownText.textContent = "全身が画面から外れています！";
          // 必要であればゲームを一時停止するなどの処理を追加
        }, 3000); // 3秒間全身が検出されなかったら警告
      }
    }
  }

  /**
   * ゲームの指示テキストを更新する
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
   * 手の検出状況を表示するインジケーターを更新
   */
  updateHandDetectionIndicator(multiHandLandmarks) {
    // インジケーター要素が存在しない場合は作成
    let indicator = document.getElementById('hand-detection-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'hand-detection-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
        z-index: 100;
        transition: all 0.3s ease;
        pointer-events: none;
      `;
      this.gamecontainer.appendChild(indicator);
    }

    // 検出状況に応じてインジケーターを更新
    if (multiHandLandmarks && multiHandLandmarks.length > 0) {
      const handCount = multiHandLandmarks.length;
      indicator.textContent = `✋ ${handCount}つの手を検出中 - 準備OK！`;
      indicator.style.backgroundColor = 'rgba(57, 197, 187, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '1';
    } else {
      // 検出されていない場合のアドバイス
      const tips = [
        '💡 手のひらをカメラに向けてください',
        '💡 明るい場所で手をかざしてください', 
        '💡 カメラから30-60cm離れてください',
        '💡 背景とのコントラストを意識してください'
      ];
      const randomTip = tips[Math.floor(Date.now() / 3000) % tips.length]; // 3秒ごとに変更
      
      indicator.textContent = randomTip;
      indicator.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '0.95';
    }

    // Handモード以外、またはモバイルデバイスでは非表示
    if (this.currentMode !== 'hand' || this.isMobile) {
      indicator.style.display = 'none';
    } else {
      indicator.style.display = 'block';
    }
  }

  /**
   * 音楽再生を開始する
   * プレーヤーの初期化状態に応じて、TextAlivePlayerまたはフォールバックモードで再生
   */
  async playMusic() {
    console.log("playMusic called.");
    // 操作が進行中なら何もしない（連打防止）
    if (this._operationInProgress) return;
    this._operationInProgress = true;

    if (this.currentMode === 'body' && !this.bodyDetectionReady) {
        console.log("playMusic: body mode and bodyDetectionReady is false. Showing adjustment message.");
        this.countdownOverlay.classList.remove('hidden');
        this.countdownText.textContent = "全身が映るように調整してください";
        this._operationInProgress = false; // ロック解除
        return;
    }
    
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
      
      // 曲の終了を確実に検出するための監視タイマーを設定
      // この監視タイマーは無効化（onFinishイベントとタイマーベースに依存）
      // this.startSongProgressMonitor();
    } finally {
      // 操作が完全に完了するのを確実にするために長めの遅延を使用（安全対策）
      setTimeout(() => this._operationInProgress = false, 1000);
    }
  }

  /**
   * 曲の進行状況を監視して終了を検出する
   */
  startSongProgressMonitor() {
    // 既存の監視タイマーをクリア
    if (this.songProgressTimer) {
      clearInterval(this.songProgressTimer);
    }
    
    this.songProgressTimer = setInterval(() => {
      if (this.player && this.player.video) {
        const currentTime = this.player.timer.position;
        const duration = this.player.video.duration;
        
        // 曲の進行監視を無効化（onFinishイベントに任せる）
        // 曲が本当に完全に終了した場合のみリザルト表示（ほぼ使われない緊急時のみ）
        if (duration && currentTime >= duration) { // 曲の長さと同じかそれ以上の場合のみ
          console.log("🎯 曲の完全終了を検出しました (progress monitor)", {
            currentTime,
            duration,
            remaining: duration - currentTime
          });
          clearInterval(this.songProgressTimer);
          if (!this.resultsDisplayed) {
            this.showResults();
          }
        }
        
        // プレーヤー停止検出も無効化（onFinishイベントに任せる）
        // 緊急時のみ：プレーヤーが完全に停止し、曲の95%以上進んでいる場合
        if (!this.player.isPlaying && !this.isPaused && 
            duration && currentTime >= duration * 0.95 && currentTime > 90000) {
          console.log("⏹️ プレーヤー緊急停止を検出しました (progress monitor)", {
            currentTime,
            duration,
            progress: (currentTime / duration * 100).toFixed(1) + '%'
          });
          clearInterval(this.songProgressTimer);
          if (!this.resultsDisplayed) {
            this.showResults();
          }
        }
      }
    }, 5000); // 5秒ごとにチェック（頻度を下げる）
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
        console.log("⏰ 結果表示タイマーが発火しました - リザルト画面を表示します");
        this.showResults();
      } else {
        console.log("⏰ 結果表示タイマーが発火しましたが、条件を満たしません", {
          isPaused: this.isPaused,
          resultsDisplayed: this.resultsDisplayed
        });
      }
    }, duration);
    
    // バックアップとして、さらに長い時間が経過した場合も強制的に結果を表示
    // （何らかの理由で上のタイマーが機能しなかった場合の保険）
    setTimeout(() => {
      if (!this.resultsDisplayed) {
        console.log("バックアップタイマーが発火しました");
        this.showResults();
      }
    }, duration + 20000); // メインタイマーから20秒後に変更
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
          // パーティクルエフェクトは削除
        }
      }
    };
    
    // マウス移動イベント
    this.gamecontainer.addEventListener('mousemove', e => {
      if (!touched && this.currentMode === 'cursor') handleMove(e.clientX, e.clientY, false);
    });
    
    // タッチイベントの最適化
    this.gamecontainer.addEventListener('touchstart', e => {
      touched = true;
      if (e.touches && e.touches[0] && this.currentMode === 'cursor') {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, {passive: true});
    
    this.gamecontainer.addEventListener('touchmove', e => {
      if (!this.isFirstInteraction && e.touches && e.touches[0] && this.currentMode === 'cursor') {
        e.preventDefault(); // スクロール防止
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
      // createShootingエフェクトは削除
    });
    
    // 再生/一時停止ボタンのクリックイベント - ここが再生開始の唯一のトリガー
    const handleButtonClick = (event) => {
      if (event) {
        event.preventDefault();
      }
      
      // APIが準備できていなければ何もしない
      if (!this.apiLoaded) return;
      
      if (this.isFirstInteraction) {
        // ボディモードの場合は全身検出プロセスを開始
        if (this.currentMode === 'body') {
          this.isFirstInteraction = false;
          this.countdownOverlay.classList.remove('hidden');
          this.countdownText.textContent = "全身が映るように調整してください";
          // カメラが既に初期化されているので、全身検出の監視を開始するだけ
          // playMusic()は checkFullBodyDetection のカウントダウン完了後に呼び出される
          return;
        }
        
        // その他のモードでは通常通り再生を開始
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
    this.visuals = new LiveStageVisuals(this.gamecontainer); // ← これを createAudience の直後に追加
    this.createAudiencePenlights();
    this.lyricsData = [];
    
    // フォールバック用の歌詞データ - フレーズごとに区切る
    const fallbackPhrases = [
      { text: "マジカル", startTime: 1000 },
      { text: "ミライ", startTime: 4000 },
      { text: "初音ミク", startTime: 6500 }
    ];
    this.fallbackLyricsData = [];

    // フレーズごとに歌詞データを生成
    fallbackPhrases.forEach(phrase => {
      Array.from(phrase.text).forEach((char, index) => {
        this.fallbackLyricsData.push({
          time: phrase.startTime + index * 400, // 同じフレーズ内の文字は400msずつずらす
          text: char,
          originalChars: [{
            text: char,
            timeOffset: index * 400
          }]
        });
      });
    });
    
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
        penlight.style.bottom = `${Math.random() * 60}%`; // Lower 60% of the audience area
        penlight.style.transformOrigin = 'bottom center';
        penlight.style.animation = `sway ${2 + Math.random() * 2}s ease-in-out infinite alternate`;
        audienceArea.appendChild(penlight);
    }

    // Add a keyframe animation for the swaying motion
    const styleSheet = document.styleSheets[0];
    const keyframes = `@keyframes sway {
        0% { transform: rotate(-15deg); }
        100% { transform: rotate(15deg); }
    }`;
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  }

  /**
   * ランダムなテキスト（観客の応援メッセージ）を生成して表示
   */
  createRandomText() {
    const randomText = document.createElement('div');
    randomText.className = 'random-text';
    randomText.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
    
    // 画面下部からランダムな位置に配置
    randomText.style.left = `${Math.random() * 80 + 10}%`; // 10%から90%の範囲
    randomText.style.bottom = `${Math.random() * 20 + 5}%`; // 5%から25%の範囲
    
    this.gamecontainer.appendChild(randomText);
    
    // 3秒後にフェードアウトして削除
    setTimeout(() => {
      randomText.style.opacity = '0';
      setTimeout(() => randomText.remove(), 1000);
    }, 3000);
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
    
    // 各種タイマーをクリア
    if (this.resultCheckTimer) {
      clearTimeout(this.resultCheckTimer);
      this.resultCheckTimer = null;
    }
    if (this.songProgressTimer) {
      clearInterval(this.songProgressTimer);
      this.songProgressTimer = null;
    }
    
    // スコアと状態のリセット
    this.score = this.combo = this.currentLyricIndex = 0;
    this.startTime = Date.now();
    this.songStartTime = Date.now(); // 曲の開始時間をリセット
    this.isPaused = false;
    this.scoreEl.textContent = '0';
    this.comboEl.textContent = `コンボ: 0`;
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
              this.playpause.disabled = false;
            }
            if (this.restart) {
              this.restart.textContent = '最初から';
              this.restart.disabled = false;
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
          console.log("🎵 onFinish イベントが発火しました");
          console.log("resultsDisplayed状態:", this.resultsDisplayed);
          console.log("現在のモード:", this.currentMode);
          
          if (!this.resultsDisplayed) {
            this.showResults();
          } else {
            console.log("すでにリザルト画面が表示済みです");
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
        this.playpause.disabled = false;
      }
      if (this.restart) {
        this.restart.textContent = '最初から';
        this.restart.disabled = false;
      }
      
      if (this.loading) this.loading.textContent = "準備完了 - 下の「再生」ボタンを押してください";
    }, 2000); // 2秒の待機時間
  }
  
  /**
   * 歌詞データを処理する
   * TextAliveから取得した歌詞データをシンプルに内部形式に変換
   * 
   * @param {Object} video - TextAliveから取得した動画データ
   */
  processLyrics(video) {
    try {
      this.lyricsData = [];
      let phrase = video.firstPhrase;
      
      while (phrase) {
        let word = phrase.firstWord;
        while (word) {
          let char = word.firstChar;
          while (char) {
            const text = (char.text || '').trim();
            if (text) {
              this.lyricsData.push({
                time: char.startTime,
                endTime: char.endTime,
                text: text,
                displayDuration: char.endTime - char.startTime
              });
            }
            char = char.next;
          }
          word = word.next;
        }
        phrase = phrase.next;
      }

      // タイマーを設定（曲の長さ分）
      if (this.player?.video?.duration) {
        console.log("曲の長さ:", this.player.video.duration, "ms");
        // ボディモードの場合、カウントダウン分の時間を追加で考慮
        const extraTime = this.currentMode === 'body' ? 5000 : 0;
        // Bodyモードのみ長い余裕時間、その他のモードは短い余裕時間
        const bufferTime = this.currentMode === 'body' ? 0 : 0;
        this.setupResultCheckTimer(this.player.video.duration + extraTime + bufferTime);
      } else {
        console.log("曲の長さが取得できません。デフォルトタイマーを設定");
        // Bodyモードのみ長いデフォルト時間、その他のモードは短いデフォルト時間
        const defaultTime = this.currentMode === 'body' ? 120000 : 90000;
        this.setupResultCheckTimer(defaultTime);
      }
    } catch (e) {
      console.error("歌詞処理エラー:", e);
      this.fallback();
    }
  }

  /**
   * 歌詞の表示を更新する
   * 現在の再生位置に応じて表示すべき歌詞を判定
   * 
   * @param {number} position - 現在の再生位置（ミリ秒）
   */
  updateLyrics(position) {
    if (this.isPaused || this.isFirstInteraction) return;
    
    for (const lyric of this.lyricsData) {
      // 表示するタイミングになった歌詞を処理
      if (lyric.time <= position && 
          lyric.time > position - 200 && 
          !this.displayedLyrics.has(lyric.time)) {
        
        this.displayLyric(lyric.text);
        this.displayedLyrics.add(lyric.time);
        
        // 歌詞の表示時間は最低3秒、最大8秒
        setTimeout(() => {
          this.displayedLyrics.delete(lyric.time);
        }, Math.min(8000, Math.max(3000, lyric.displayDuration)));
      }
    }
  }

  /**
   * 1文字の歌詞を表示
   * @param {string} text - 表示する文字
   */
  displayLyric(text) {
    const bubble = document.createElement('div');
    bubble.className = 'lyric-bubble';
    bubble.textContent = text;
    bubble.style.opacity = '1';
    
    // 表示位置を画面の中央付近にランダムに設定
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const x = screenWidth * 0.2 + Math.random() * (screenWidth * 0.6);
    const y = screenHeight * 0.3 + Math.random() * (screenHeight * 0.4);
    
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.fontSize = `${screenWidth <= 768 ? '24' : '36'}px`;
    
    this.gamecontainer.appendChild(bubble);
    
    // 鑑賞用歌詞も同時に表示
    this.displayViewerLyric(text, bubble);
    
    // 8秒後にフェードアウトして削除
    setTimeout(() => {
      // 歌詞がクリックされずに消えた場合、コンボをリセット
      if (bubble.style.pointerEvents !== 'none') {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
      bubble.style.opacity = '0';
      setTimeout(() => bubble.remove(), 1000);
    }, 8000);
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
      fontSize = '48px';
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
    setTimeout(() => {
      // 歌詞がクリックされずに消えた場合、コンボをリセット
      if (bubble.style.pointerEvents !== 'none') {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
      bubble.remove();
    }, 8000);

    // 鑑賞用歌詞も同時に表示
    this.displayViewerLyric(text, bubble);
  }

  /**
   * 鑑賞用歌詞を表示
   * @param {string} text - 表示する文字
   * @param {HTMLElement} gameBubble - ゲーム用歌詞要素
   */
  displayViewerLyric(text, gameBubble) {
    // 既に表示されている場合は何もしない
    if (this.displayedViewerLyrics.has(text)) return;

    const viewerChar = document.createElement('span');
    viewerChar.className = 'viewer-lyric-char';
    viewerChar.textContent = text;
    viewerChar.style.opacity = '0';
    this.viewerLyricsContainer.appendChild(viewerChar);

    // タイプライター効果で表示
    setTimeout(() => {
      viewerChar.style.opacity = '1';
      viewerChar.style.transform = 'translateY(0)';
    }, 50);

    // ゲーム用の歌詞要素と鑑賞用歌詞要素を紐付け
    this.displayedViewerLyrics.set(text, {
      element: viewerChar,
      gameBubble: gameBubble
    });

    // ゲーム歌詞がクリックされたときの処理
    const originalClick = gameBubble.onclick;
    gameBubble.onclick = (e) => {
      if (originalClick) originalClick(e);
      const viewerInfo = this.displayedViewerLyrics.get(text);
      if (viewerInfo && viewerInfo.element) {
        viewerInfo.element.classList.add('highlighted');
      }
    };

    // 一定時間後に鑑賞用歌詞を削除
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
   * 手振り動作の検出とポイント獲得
   * 
   * @param {Object} palmLandmark - 手のひらの中心ランドマーク
   * @param {number} screenX - 画面上のX座標
   * @param {number} screenY - 画面上のY座標
   */
  detectHandWaving(palmLandmark, screenX, screenY) {
    const currentTime = performance.now();
    
    // 手の位置履歴を追加（正規化座標で記録）
    this.handHistory.push({
      x: palmLandmark.x,
      y: palmLandmark.y,
      time: currentTime
    });
    
    // 古い履歴を削除（時間窓より古いもの）
    this.handHistory = this.handHistory.filter(h => currentTime - h.time <= this.waveTimeWindow);
    
    // 手振りの検出（最低3個の履歴点があれば検出）
    if (this.handHistory.length >= 3) {
      const movement = this.calculateHandMovement();
      
      // 横方向の動きが閾値を超えた場合を手振りと判定
      if (movement.horizontalRange > this.waveThreshold && 
          currentTime - this.lastWaveTime > 200) { // 200ms間隔で手振り検出（より頻繁に）
        
        this.lastWaveTime = currentTime;
        
        // 歌詞付近での手振りをチェック
        this.checkLyricsWithWaving(screenX, screenY);
      }
    }
  }

  /**
   * 手の動きの範囲を計算
   * 
   * @return {Object} 横方向と縦方向の動きの範囲
   */
  calculateHandMovement() {
    const xPositions = this.handHistory.map(h => h.x);
    const yPositions = this.handHistory.map(h => h.y);
    
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    
    return {
      horizontalRange: maxX - minX,
      verticalRange: maxY - minY
    };
  }

  /**
   * 手振りによる歌詞判定（より広い範囲で判定）
   * 
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  checkLyricsWithWaving(x, y) {
    if (this.isFirstInteraction) return false;
    
    const lyrics = document.querySelectorAll('.lyric-bubble');
    const waveRadius = 150; // 手振りの場合はさらに広い判定範囲
    
    for (const el of lyrics) {
      if (el.style.pointerEvents === 'none') continue;
      
      const rect = el.getBoundingClientRect();
      const elX = rect.left + rect.width / 2;
      const elY = rect.top + rect.height / 2;
      
      const dx = x - elX, dy = y - elY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = waveRadius + Math.max(rect.width, rect.height) / 2;
      
      if (distance <= hitRadius) {
        this.clickLyric(el);
        this.createHitEffect(elX, elY); // 通常のヒットエフェクトを使用
        break; // 1つの歌詞のみヒット
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
    if (element.style.pointerEvents === 'none') return;
    
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

    // 対応する鑑賞用歌詞もハイライト
    const text = element.textContent;
    const viewerInfo = this.displayedViewerLyrics.get(text);
    if (viewerInfo && viewerInfo.element) {
      viewerInfo.element.classList.add('highlighted');
    }
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
    const ripple = document.createElement('div');    ripple.className = 'tap-ripple';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    
    this.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
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
    
    // 結果画面を表示（hiddenクラスを削除してから、showクラスを追加）
    resultsScreen.classList.remove('hidden');
    resultsScreen.style.display = 'flex'; // 確実に表示されるようにする
    
    setTimeout(() => {
      resultsScreen.classList.add('show');
      console.log("リザルト画面のshowクラスを追加しました");
      
      // 演出エフェクト（流れ星）は削除
      // for (let i = 0; i < 15; i++) {
      //   setTimeout(() => {
      //     const x = Math.random() * window.innerWidth;
      //     const y = Math.random() * window.innerHeight;
      //     this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
      //   }, i * 200);
      // }
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
      if (element) element.addEventListener('click', handler);
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

    // 鑑賞用歌詞のクリーンアップ
    this.viewerLyricsContainer.innerHTML = '';
    this.displayedViewerLyrics.clear();
  }
}

class LiveStageVisuals {
  constructor(container) {
    this.container = container;
    this.initThreeJS();
    this.animate();
  }

  initThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(0, 100, 150);

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = 0;
    this.renderer.domElement.style.left = 0;
    this.renderer.domElement.style.zIndex = 2; // UIの下、背景の上
    this.container.appendChild(this.renderer.domElement);

    // リサイズイベントの設定
    window.addEventListener('resize', () => this.onResize());

    this.playerAvatar = {};
    
    // 手の描画用配列を初期化
    this.handJoints = [];

    const penlightGeometry = new THREE.CylinderGeometry(2, 2, 40, 32);
    const penlightMaterial = new THREE.MeshBasicMaterial({ color: 0x39C5BB, transparent: true, opacity: 0.8 });
    this.leftPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
    this.rightPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
  }

  setVideoTexture(videoElement) {
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.repeat.x = -1;
    this.scene.background = videoTexture;
  }

  updatePlayerAvatar(landmarks) {
    if (!this.playerAvatar.joints) {
      this.playerAvatar.joints = {};
      this.playerAvatar.bones = {};

      const boneMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 5 });

      const connections = POSE_CONNECTIONS;
      for (let i = 0; i < connections.length; i++) {
        const pair = connections[i];
        const start = pair[0];
        const end = pair[1];

        if (!this.playerAvatar.joints[start]) {
          const geometry = new THREE.SphereGeometry(5, 32, 32);
          const material = new THREE.MeshBasicMaterial({ color: 0x39C5BB });
          this.playerAvatar.joints[start] = new THREE.Mesh(geometry, material);
          this.scene.add(this.playerAvatar.joints[start]);
        }
        if (!this.playerAvatar.joints[end]) {
          const geometry = new THREE.SphereGeometry(5, 32, 32);
          const material = new THREE.MeshBasicMaterial({ color: 0x39C5BB });
          this.playerAvatar.joints[end] = new THREE.Mesh(geometry, material);
          this.scene.add(this.playerAvatar.joints[end]);
        }

        const boneGeometry = new THREE.BufferGeometry();
        boneGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        this.playerAvatar.bones[i] = new THREE.Line(boneGeometry, boneMaterial);
        this.scene.add(this.playerAvatar.bones[i]);
      }
    }

    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const joint = this.playerAvatar.joints[i];
      if (joint) {
        joint.position.x = (landmark.x - 0.5) * -window.innerWidth;
        joint.position.y = (1 - landmark.y) * window.innerHeight - (window.innerHeight / 2);
        joint.position.z = (landmark.z || 0) * -1000;
      }
    }

    const connections = POSE_CONNECTIONS;
    for (let i = 0; i < connections.length; i++) {
      const pair = connections[i];
      const start = pair[0];
      const end = pair[1];
      const bone = this.playerAvatar.bones[i];
      if (bone) {
        const positions = bone.geometry.attributes.position.array;
        positions[0] = this.playerAvatar.joints[start].position.x;
        positions[1] = this.playerAvatar.joints[start].position.y;
        positions[2] = this.playerAvatar.joints[start].position.z;
        positions[3] = this.playerAvatar.joints[end].position.x;
        positions[4] = this.playerAvatar.joints[end].position.y;
        positions[5] = this.playerAvatar.joints[end].position.z;
        bone.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.playerAvatar.joints[15]) {
        this.leftPenlight.position.copy(this.playerAvatar.joints[15].position);
    }
    if (this.playerAvatar.joints[16]) {
        this.rightPenlight.position.copy(this.playerAvatar.joints[16].position);
    }
  }

  updateHandLandmarks(handsResults) {
    // 既存の手の描画をクリア
    if (this.handJoints) {
      this.handJoints.forEach(joint => this.scene.remove(joint));
    }
    
    this.handJoints = [];

    if (!handsResults.multiHandLandmarks) return;

    handsResults.multiHandLandmarks.forEach((landmarks, handIndex) => {
      // 手のひらの中心（ランドマーク0）を大きな球体で表示
      const palmLandmark = landmarks[0];
      const palmGeometry = new THREE.SphereGeometry(15, 32, 32);
      const palmMaterial = new THREE.MeshBasicMaterial({ 
        color: handIndex === 0 ? 0x39C5BB : 0xFF6B6B, // 左手：青、右手：ピンク
        transparent: true,
        opacity: 0.8
      });
      const palmJoint = new THREE.Mesh(palmGeometry, palmMaterial);
      
      // 手のひら位置を3D空間に変換
      palmJoint.position.x = (palmLandmark.x - 0.5) * -window.innerWidth;
      palmJoint.position.y = (1 - palmLandmark.y) * window.innerHeight - (window.innerHeight / 2);
      palmJoint.position.z = (palmLandmark.z || 0) * -800;
      
      this.scene.add(palmJoint);
      this.handJoints.push(palmJoint);

      // 人差し指の先端（ランドマーク8）を小さな球体で表示
      const fingerTip = landmarks[8];
      const tipGeometry = new THREE.SphereGeometry(8, 16, 16);
      const tipMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF, // 白色で目立たせる
        transparent: true,
        opacity: 0.9
      });
      const tipJoint = new THREE.Mesh(tipGeometry, tipMaterial);
      
      // 指先位置を3D空間に変換
      tipJoint.position.x = (fingerTip.x - 0.5) * -window.innerWidth;
      tipJoint.position.y = (1 - fingerTip.y) * window.innerHeight - (window.innerHeight / 2);
      tipJoint.position.z = (fingerTip.z || 0) * -800;
      
      this.scene.add(tipJoint);
      this.handJoints.push(tipJoint);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
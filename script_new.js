/**
 * Lyric Stage - YouTube IFrame Player API + Three.js リズムゲーム
 * 
 * YouTube動画と字幕を同期してインタラクションするリズムゲーム
 * Express.jsサーバーから字幕を取得し、Three.jsで3Dステージを表現
 */
class LyricStageGame {
  constructor() {
    // 基本設定
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isPlaying = false;
    this.gameData = null;
    this.captions = [];
    this.currentCaptionIndex = 0;
    this.currentCharIndex = 0;
    this.activeChars = new Set();
    this.displayedChars = new Set();
    
    // YouTube Player
    this.ytPlayer = null;
    this.ytPlayerReady = false;
    
    // Three.js Scene
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stage = null;
    
    // MediaPipe
    this.hands = null;
    this.pose = null;
    this.selfieSegmentation = null;
    this.cameraVideo = null;
    
    // モード設定
    const urlParams = new URLSearchParams(window.location.search);
    this.currentMode = urlParams.get('mode') || 'cursor';
    this.isMobile = this.detectMobileDevice();
    
    // モバイルではカーソルモード限定
    if (this.isMobile && this.currentMode !== 'cursor') {
      this.currentMode = 'cursor';
      console.log('モバイルデバイスのためカーソルモードに変更されました。');
    }
    
    console.log('Lyric Stage Game initialized with mode:', this.currentMode);
    
    // 初期化開始
    this.init();
  }

  /**
   * モバイルデバイス検出
   */
  detectMobileDevice() {
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 768;
    
    return mobileUA || (hasTouch && smallScreen);
  }

  /**
   * ゲーム初期化
   */
  async init() {
    try {
      // ゲームデータを読み込み
      this.loadGameData();
      
      // Three.jsシーンを初期化
      this.initThreeJS();
      
      // YouTube Player APIを初期化
      if (typeof YT !== 'undefined' && YT.Player) {
        this.initYouTubePlayer();
      } else {
        window.onYouTubeIframeAPIReady = () => this.initYouTubePlayer();
      }
      
      // MediaPipeを初期化（カーソルモード以外）
      if (this.currentMode !== 'cursor') {
        await this.initMediaPipe();
      }
      
      // イベントハンドラーを設定
      this.setupEventHandlers();
      
      // 字幕を読み込み
      await this.loadCaptions();
      
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.showError('ゲームの初期化に失敗しました。');
    }
  }

  /**
   * ローカルストレージからゲームデータを読み込み
   */
  loadGameData() {
    const gameDataStr = localStorage.getItem('gameData');
    if (gameDataStr) {
      this.gameData = JSON.parse(gameDataStr);
      console.log('Game data loaded:', this.gameData);
      
      // 曲情報を表示
      const titleElement = document.getElementById('song-title');
      if (titleElement) {
        titleElement.textContent = `YouTube Video: ${this.gameData.videoId}`;
      }
    } else {
      throw new Error('No game data found');
    }
  }

  /**
   * Three.jsシーンの初期化
   */
  initThreeJS() {
    const canvas = document.getElementById('stage-canvas');
    if (!canvas) return;
    
    // シーン作成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000511);
    
    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    
    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 3Dステージを作成
    this.createStage();
    
    // アニメーションループを開始
    this.animate();
    
    // リサイズ対応
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * 3Dステージの作成
   */
  createStage() {
    // ステージフロア
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // ライト設定
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    const spotlight1 = new THREE.SpotLight(0xff0000, 1);
    spotlight1.position.set(-10, 15, 0);
    spotlight1.castShadow = true;
    this.scene.add(spotlight1);
    
    const spotlight2 = new THREE.SpotLight(0x0000ff, 1);
    spotlight2.position.set(10, 15, 0);
    spotlight2.castShadow = true;
    this.scene.add(spotlight2);
    
    const spotlight3 = new THREE.SpotLight(0x00ff00, 1);
    spotlight3.position.set(0, 15, -10);
    spotlight3.castShadow = true;
    this.scene.add(spotlight3);
  }

  /**
   * アニメーションループ
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // シーンのレンダリング
    this.renderer.render(this.scene, this.camera);
    
    // 字幕の更新
    if (this.isPlaying && this.ytPlayer && this.captions.length > 0) {
      this.updateLyrics();
    }
  }

  /**
   * ウィンドウリサイズ対応
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * YouTube Playerの初期化
   */
  initYouTubePlayer() {
    if (!this.gameData || !this.gameData.videoId) return;
    
    this.ytPlayer = new YT.Player('youtube-player', {
      height: '180',
      width: '320',
      videoId: this.gameData.videoId,
      playerVars: {
        'playsinline': 1,
        'autoplay': 0,
        'controls': 1
      },
      events: {
        'onReady': () => this.onPlayerReady(),
        'onStateChange': (event) => this.onPlayerStateChange(event)
      }
    });
  }

  /**
   * YouTube Player準備完了
   */
  onPlayerReady() {
    this.ytPlayerReady = true;
    console.log('YouTube Player is ready');
    
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.textContent = 'ゲーム準備完了！再生ボタンを押してください。';
    }
  }

  /**
   * YouTube Player状態変更
   */
  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
      this.isPlaying = false;
      
      if (event.data === YT.PlayerState.ENDED) {
        this.showResults();
      }
    }
  }

  /**
   * MediaPipeの初期化
   */
  async initMediaPipe() {
    try {
      // カメラビデオの取得
      this.cameraVideo = document.getElementById('camera-video');
      
      if (this.currentMode === 'hand' || this.currentMode === 'body') {
        // カメラストリームを開始
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        this.cameraVideo.srcObject = stream;
        await this.cameraVideo.play();
        
        if (this.currentMode === 'hand') {
          this.initMediaPipeHands();
        } else if (this.currentMode === 'body') {
          this.initMediaPipePose();
        }
      }
    } catch (error) {
      console.error('MediaPipe initialization failed:', error);
      this.currentMode = 'cursor';
      console.log('Fallback to cursor mode');
    }
  }

  /**
   * MediaPipe Handsの初期化
   */
  initMediaPipeHands() {
    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands not loaded');
      return;
    }
    
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    this.hands.onResults((results) => this.onHandResults(results));
    
    // カメラからの映像を処理
    const processFrame = async () => {
      if (this.cameraVideo.readyState >= 2) {
        await this.hands.send({ image: this.cameraVideo });
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  /**
   * Hand detection結果処理
   */
  onHandResults(results) {
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // 手の位置から画面座標を計算
        const indexTip = landmarks[8]; // 人差し指の先端
        const x = (1 - indexTip.x) * window.innerWidth; // 反転
        const y = indexTip.y * window.innerHeight;
        
        // 字幕との当たり判定
        this.checkLyricInteraction(x, y);
      }
    }
  }

  /**
   * MediaPipe Poseの初期化
   */
  initMediaPipePose() {
    if (typeof Pose === 'undefined') {
      console.error('MediaPipe Pose not loaded');
      return;
    }
    
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    this.pose.onResults((results) => this.onPoseResults(results));
    
    // カメラからの映像を処理
    const processFrame = async () => {
      if (this.cameraVideo.readyState >= 2) {
        await this.pose.send({ image: this.cameraVideo });
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  /**
   * Pose detection結果処理
   */
  onPoseResults(results) {
    if (results.poseLandmarks) {
      // 手首の位置を使用
      const leftWrist = results.poseLandmarks[15];
      const rightWrist = results.poseLandmarks[16];
      
      if (leftWrist.visibility > 0.5) {
        const x = (1 - leftWrist.x) * window.innerWidth;
        const y = leftWrist.y * window.innerHeight;
        this.checkLyricInteraction(x, y);
      }
      
      if (rightWrist.visibility > 0.5) {
        const x = (1 - rightWrist.x) * window.innerWidth;
        const y = rightWrist.y * window.innerHeight;
        this.checkLyricInteraction(x, y);
      }
    }
  }

  /**
   * イベントハンドラーの設定
   */
  setupEventHandlers() {
    // カーソルモードのイベント
    if (this.currentMode === 'cursor') {
      document.addEventListener('click', (e) => this.onCursorInteraction(e));
      document.addEventListener('touchstart', (e) => this.onCursorInteraction(e));
    }
    
    // コントロールボタンのイベント
    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.togglePlay());
    }
    
    const restartBtn = document.getElementById('restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }
    
    // リザルト画面のボタン
    const backToTitleBtn = document.getElementById('back-to-title');
    if (backToTitleBtn) {
      backToTitleBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
    
    const replayBtn = document.getElementById('replay-song');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.restart());
    }
  }

  /**
   * カーソル操作での相互作用
   */
  onCursorInteraction(event) {
    let x, y;
    
    if (event.touches && event.touches.length > 0) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }
    
    this.checkLyricInteraction(x, y);
  }

  /**
   * 字幕との相互作用チェック
   */
  checkLyricInteraction(x, y) {
    const lyricsDisplay = document.getElementById('lyrics-display');
    if (!lyricsDisplay) return;
    
    const rect = lyricsDisplay.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      // 字幕エリア内でのクリック/タッチ
      this.handleLyricHit();
    }
  }

  /**
   * 字幕ヒット処理
   */
  handleLyricHit() {
    // スコア加算
    this.score += 100;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    
    // UI更新
    this.updateScoreDisplay();
    
    // ヒットエフェクト
    this.showHitEffect();
    
    console.log(`Hit! Score: ${this.score}, Combo: ${this.combo}`);
  }

  /**
   * スコア表示更新
   */
  updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const comboElement = document.getElementById('combo');
    
    if (scoreElement) {
      scoreElement.textContent = this.score.toString();
    }
    
    if (comboElement) {
      comboElement.textContent = `コンボ: ${this.combo}`;
    }
  }

  /**
   * ヒットエフェクト表示
   */
  showHitEffect() {
    // 簡単なエフェクト表示
    const lyricsDisplay = document.getElementById('lyrics-display');
    if (lyricsDisplay) {
      lyricsDisplay.style.textShadow = '0 0 20px #00ff00';
      setTimeout(() => {
        lyricsDisplay.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
      }, 200);
    }
  }

  /**
   * 字幕の読み込み
   */
  async loadCaptions() {
    if (!this.gameData || !this.gameData.videoId) {
      throw new Error('No video ID available');
    }
    
    try {
      const response = await fetch(`/captions?v=${this.gameData.videoId}&lang=ja`);
      const data = await response.json();
      
      if (data.captions && data.captions.length > 0) {
        this.captions = data.captions;
        console.log(`Loaded ${this.captions.length} captions`);
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.textContent = '字幕読み込み完了！';
        }
      } else {
        throw new Error('No captions available');
      }
    } catch (error) {
      console.error('Failed to load captions:', error);
      this.showError('字幕の読み込みに失敗しました。');
    }
  }

  /**
   * 字幕表示の更新
   */
  updateLyrics() {
    if (!this.ytPlayer || !this.ytPlayerReady) return;
    
    const currentTime = this.ytPlayer.getCurrentTime();
    const lyricsDisplay = document.getElementById('lyrics-display');
    
    if (!lyricsDisplay) return;
    
    // 現在の時間に対応する字幕を見つける
    const currentCaption = this.captions.find(caption => 
      currentTime >= caption.start && currentTime <= caption.end
    );
    
    if (currentCaption) {
      // 字幕を文字単位で表示
      const progress = (currentTime - currentCaption.start) / currentCaption.duration;
      const totalChars = currentCaption.text.length;
      const displayedChars = Math.floor(progress * totalChars);
      
      const visibleText = currentCaption.text.substring(0, displayedChars + 1);
      
      lyricsDisplay.innerHTML = this.formatLyrics(currentCaption.text, displayedChars);
    } else {
      lyricsDisplay.innerHTML = '';
    }
  }

  /**
   * 字幕のフォーマット（文字単位でスタイリング）
   */
  formatLyrics(text, visibleCount) {
    return text.split('').map((char, index) => {
      if (index <= visibleCount) {
        return `<span class="visible-char">${char}</span>`;
      } else {
        return `<span class="hidden-char">${char}</span>`;
      }
    }).join('');
  }

  /**
   * 再生/一時停止の切り替え
   */
  togglePlay() {
    if (!this.ytPlayer || !this.ytPlayerReady) return;
    
    const playerState = this.ytPlayer.getPlayerState();
    
    if (playerState === YT.PlayerState.PLAYING) {
      this.ytPlayer.pauseVideo();
    } else {
      this.ytPlayer.playVideo();
    }
  }

  /**
   * リスタート
   */
  restart() {
    if (this.ytPlayer && this.ytPlayerReady) {
      this.ytPlayer.seekTo(0);
      this.ytPlayer.playVideo();
    }
    
    // スコアリセット
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.updateScoreDisplay();
    
    // リザルト画面を非表示
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
      resultsScreen.classList.add('hidden');
    }
  }

  /**
   * リザルト画面表示
   */
  showResults() {
    const resultsScreen = document.getElementById('results-screen');
    const finalScoreDisplay = document.getElementById('final-score-display');
    const finalComboDisplay = document.getElementById('final-combo-display');
    const rankDisplay = document.getElementById('rank-display');
    
    if (resultsScreen) {
      resultsScreen.classList.remove('hidden');
    }
    
    if (finalScoreDisplay) {
      finalScoreDisplay.textContent = this.score.toString();
    }
    
    if (finalComboDisplay) {
      finalComboDisplay.textContent = `最大コンボ: ${this.maxCombo}`;
    }
    
    if (rankDisplay) {
      const rank = this.calculateRank(this.score);
      rankDisplay.textContent = `ランク: ${rank}`;
    }
  }

  /**
   * ランク計算
   */
  calculateRank(score) {
    if (score >= 10000) return 'S';
    if (score >= 7500) return 'A';
    if (score >= 5000) return 'B';
    if (score >= 2500) return 'C';
    return 'D';
  }

  /**
   * エラー表示
   */
  showError(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.textContent = `エラー: ${message}`;
      loadingElement.style.color = 'red';
    }
  }
}

// ゲーム開始
let game;
document.addEventListener('DOMContentLoaded', () => {
  game = new LyricStageGame();
});

// YouTube IFrame API Ready Callback
window.onYouTubeIframeAPIReady = function() {
  if (game) {
    game.initYouTubePlayer();
  }
};
